/**
 * Đấu Sinh Tử: chọn 3 cá, xếp thứ tự, thắng 2/3. Đội thua mất con cá mạnh nhất;
 * con cá đó thành "cá nướng" cho bên thắng ăn để lên cấp.
 * Hàm áp dụng kết quả TỰ TÍNH LẠI trận đấu từ seed – không tin kết quả gửi lên.
 */
import type { FishDef, FishFormDef } from "./types.ts";
import { Rng } from "./rng.ts";
import { makeFighter, playMatch, type Fighter, type MatchResult } from "./battle.ts";
import { charMaxLevel, fishMaxLevel, ownedFishPower } from "./progression.ts";
import { addLedger, clone, grantXp, markTx, type ActionResult, type OwnedFish, type PlayerSave } from "./save.ts";

export type Difficulty = "easy" | "normal" | "hard";
export const DIFFICULTY: Record<Difficulty, { label: string; power: number; gold: number; xp: number }> = {
  easy: { label: "Dễ", power: 0.8, gold: 150, xp: 40 },
  normal: { label: "Thường", power: 1.0, gold: 350, xp: 90 },
  hard: { label: "Khó", power: 1.25, gold: 800, xp: 200 },
};

export interface RoastedFish {
  id: string;
  fishId: string;
  level: number;
  stars: number;
}

export function validateTeam(save: PlayerSave, uids: string[]): string | null {
  if (uids.length !== 3) return "Hãy chọn đúng 3 con cá";
  if (new Set(uids).size !== 3) return "Mỗi con cá chỉ được chọn một lần";
  for (const u of uids) {
    const o = save.fishes.find((f) => f.uid === u);
    if (!o) return "Có cá không thuộc sở hữu";
    if (o.locked) return "Cá đang khóa không thể vào Đấu Sinh Tử (mở khóa nếu muốn mạo hiểm)";
  }
  return null;
}

export function teamFighters(save: PlayerSave, uids: string[], fishById: Map<string, FishDef>, formById?: Map<string, FishFormDef>): Fighter[] {
  return uids.map((u) => {
    const o = save.fishes.find((f) => f.uid === u)!;
    return makeFighter(fishById.get(o.fishId)!, o, o.form ? formById?.get(o.form) : null);
  });
}

/** Đội máy: chọn cá có lực chiến quanh mức mục tiêu từ các loài trong khu đã mở. */
export function aiTeam(rng: Rng, pool: FishDef[], targetPower: number, diff: Difficulty): Fighter[] {
  const target = targetPower * DIFFICULTY[diff].power;
  const team: Fighter[] = [];
  for (let i = 0; i < 3; i++) {
    let best: Fighter | null = null;
    for (let k = 0; k < 12; k++) {
      const f = pool[rng.int(0, pool.length - 1)]!;
      const stars = 1;
      let level = 1;
      let fi = makeFighter(f, { uid: `ai_${i}`, level, stars });
      while (fi.power < target && level < fishMaxLevel(stars) * 2) {
        level++;
        fi = makeFighter(f, { uid: `ai_${i}`, level, stars: level > 10 ? Math.min(5, Math.ceil(level / 10)) : 1 });
      }
      if (!best || Math.abs(fi.power - target) < Math.abs(best.power - target)) best = fi;
    }
    team.push(best!);
  }
  return team;
}

export type DeathMatchOutcome = ActionResult & {
  result?: MatchResult;
  lost?: OwnedFish;
  roasted?: RoastedFish;
  gold?: number;
  xp?: number;
};

export function applyDeathMatch(
  save: PlayerSave,
  input: { txId: string; teamUids: string[]; opponent: Fighter[]; seed: number; difficulty: Difficulty; now: number },
  fishById: Map<string, FishDef>,
  formById?: Map<string, FishFormDef>,
): DeathMatchOutcome {
  if (save.appliedTx.includes(input.txId)) return { ok: false, error: "Trận đấu đã được ghi nhận" };
  const err = validateTeam(save, input.teamUids);
  if (err) return { ok: false, error: err };
  const team = teamFighters(save, input.teamUids, fishById, formById);
  const result = playMatch(team, input.opponent, input.seed);
  const s = clone(save);
  // thống kê thắng/thua từng con cá
  result.duels.forEach((d, i) => {
    const o = s.fishes.find((f) => f.uid === input.teamUids[i]);
    if (!o) return;
    if (d.winner === 0) o.wins = (o.wins ?? 0) + 1;
    else o.losses = (o.losses ?? 0) + 1;
  });
  const out: DeathMatchOutcome = { ok: true, save: s, result };
  if (result.winner === 0) {
    const strongest = [...input.opponent].sort((x, y) => y.power - x.power)[0]!;
    const roasted: RoastedFish = { id: input.txId, fishId: strongest.fishId, level: strongest.level, stars: strongest.stars };
    s.roasted.push(roasted);
    const d = DIFFICULTY[input.difficulty];
    s.gold += d.gold;
    addLedger(s, input.txId, "gold", d.gold, `deathmatch_win:${input.difficulty}`, input.now);
    addLedger(s, input.txId, "xp", d.xp, `deathmatch_win:${input.difficulty}`, input.now);
    grantXp(s, d.xp);
    s.stats.dmWins = (s.stats.dmWins ?? 0) + 1;
    Object.assign(out, { roasted, gold: d.gold, xp: d.xp });
  } else {
    const teamOwned = input.teamUids.map((u) => s.fishes.find((f) => f.uid === u)!);
    const pw = (o: OwnedFish) => ownedFishPower(fishById.get(o.fishId)!, o, o.form ? formById?.get(o.form) : null);
    const lost = [...teamOwned].sort((x, y) => pw(y) - pw(x))[0]!;
    s.fishes = s.fishes.filter((f) => f.uid !== lost.uid);
    s.showcase = s.showcase.filter((u) => u !== lost.uid);
    s.stats.dmLosses = (s.stats.dmLosses ?? 0) + 1;
    out.lost = lost;
  }
  markTx(s, input.txId);
  s.updatedAt = input.now;
  return out;
}

/** Hệ số KN của cá nướng theo độ hiếm loài cá. */
export const ROAST_RARITY_MULT: Record<FishDef["rarity"], number> = {
  common: 1,
  rare: 1.5,
  precious: 2,
  epic: 3,
  legendary: 5,
  mythic: 7,
  boss: 8,
};

/** KN mà nhân vật nhận khi ăn một con cá nướng. */
export function roastedXp(r: RoastedFish, fishById: Map<string, FishDef>): number {
  const f = fishById.get(r.fishId);
  return Math.round(40 * Math.max(1, r.level) * Math.max(1, r.stars) * (f ? ROAST_RARITY_MULT[f.rarity] : 1));
}

/** KN cần để nhân vật lên cấp tiếp theo. */
export function charXpToNext(level: number): number {
  return 60 + 40 * level;
}

/** Cho NHÂN VẬT ăn cá nướng: nhận KN, tự lên cấp (không vượt giới hạn đột phá). */
export function eatRoasted(
  save: PlayerSave,
  roastedId: string,
  charId: string,
  fishById: Map<string, FishDef>,
  now: number,
): ActionResult & { xp?: number; levels?: number } {
  const r = save.roasted.find((x) => x.id === roastedId);
  if (!r) return { ok: false, error: "Không tìm thấy cá nướng" };
  const c = save.characters[charId];
  if (!c) return { ok: false, error: "Bạn chưa sở hữu nhân vật này" };
  const cap = charMaxLevel(c.breakthrough);
  if (c.level >= cap) return { ok: false, error: `Nhân vật đã đạt cấp tối đa ${cap} – hãy đột phá trước` };
  const xp = roastedXp(r, fishById);
  const s = clone(save);
  const p = s.characters[charId]!;
  let have = (p.xp ?? 0) + xp;
  let levels = 0;
  while (p.level < cap && have >= charXpToNext(p.level)) {
    have -= charXpToNext(p.level);
    p.level += 1;
    levels += 1;
  }
  // đã chạm trần thì giữ phần dư không quá 1 cấp
  p.xp = p.level >= cap ? Math.min(have, charXpToNext(p.level) - 1) : have;
  s.roasted = s.roasted.filter((x) => x.id !== roastedId);
  s.updatedAt = now;
  return { ok: true, save: s, xp, levels };
}

/** Chọn tối đa 3 con cá trưng bày ở hồ sơ. */
export function setShowcase(save: PlayerSave, uids: string[], now: number): ActionResult {
  if (uids.length > 3) return { ok: false, error: "Chỉ trưng bày tối đa 3 con cá" };
  if (!uids.every((u) => save.fishes.some((f) => f.uid === u))) return { ok: false, error: "Có cá không thuộc sở hữu" };
  const s = clone(save);
  s.showcase = [...new Set(uids)];
  s.updatedAt = now;
  return { ok: true, save: s };
}

export function winRate(o: Pick<OwnedFish, "wins" | "losses">): number | null {
  const n = (o.wins ?? 0) + (o.losses ?? 0);
  return n ? (o.wins ?? 0) / n : null;
}

/** Chọn đội phòng thủ (3 cá không khóa, theo thứ tự). */
export function setDefense(save: PlayerSave, uids: string[], now: number): ActionResult {
  const err = validateTeam(save, uids);
  if (err) return { ok: false, error: err };
  const s = clone(save);
  s.defense = [...uids];
  s.updatedAt = now;
  return { ok: true, save: s };
}

/** Đội phòng thủ hợp lệ hiện tại: đội đã chọn nếu còn hợp lệ, nếu không thì 3 cá mạnh nhất không khóa. */
export function effectiveDefense(save: PlayerSave, fishById: Map<string, FishDef>, formById?: Map<string, FishFormDef>): string[] | null {
  if (!validateTeam(save, save.defense)) return save.defense;
  const pw = (o: OwnedFish) => ownedFishPower(fishById.get(o.fishId)!, o, o.form ? formById?.get(o.form) : null);
  const pick = save.fishes.filter((f) => !f.locked && fishById.has(f.fishId)).sort((a, b) => pw(b) - pw(a)).slice(0, 3).map((f) => f.uid);
  return pick.length === 3 ? pick : null;
}

/** Kết quả một trận Đấu Sinh Tử người–người do máy chủ ghi lại. */
export interface PvpMatchRecord {
  id: string;
  side: 0 | 1; // 0 = mình là người thách đấu, 1 = mình là người phòng thủ
  won: boolean;
  /** uid các cá của mình đã ra sân theo thứ tự và từng trận thắng/thua. */
  myTeam: string[];
  duelWins: boolean[];
  /** uid con cá mình bị mất (nếu thua). */
  lostUid?: string;
  /** Cá nướng mình nhận (nếu thắng). */
  roasted?: { fishId: string; level: number; stars: number };
  opponentName: string;
}

/** Áp kết quả PvP vào bản lưu của chính mình – đúng một lần cho mỗi trận. */
export function applyPvpOutcome(save: PlayerSave, m: PvpMatchRecord, now: number): ActionResult {
  if (save.pvpApplied.includes(m.id)) return { ok: false, error: "Trận đã được áp dụng" };
  const s = clone(save);
  m.myTeam.forEach((uid, i) => {
    const o = s.fishes.find((f) => f.uid === uid);
    if (!o || m.duelWins[i] === undefined) return;
    if (m.duelWins[i]) o.wins = (o.wins ?? 0) + 1;
    else o.losses = (o.losses ?? 0) + 1;
  });
  if (m.won) {
    if (m.roasted) s.roasted.push({ id: `pvp_${m.id}`.slice(0, 64), ...m.roasted });
    s.stats.dmWins = (s.stats.dmWins ?? 0) + 1;
  } else {
    if (m.lostUid) {
      s.fishes = s.fishes.filter((f) => f.uid !== m.lostUid);
      s.showcase = s.showcase.filter((u) => u !== m.lostUid);
      s.defense = s.defense.filter((u) => u !== m.lostUid);
    }
    s.stats.dmLosses = (s.stats.dmLosses ?? 0) + 1;
  }
  s.pvpApplied.push(m.id);
  if (s.pvpApplied.length > 500) s.pvpApplied.splice(0, s.pvpApplied.length - 500);
  s.updatedAt = now;
  return { ok: true, save: s };
}

/**
 * Máy chủ dùng hàm này: tính trận giữa hai bản lưu (đọc từ máy chủ), trả về
 * bản ghi cho từng bên. Không đụng tới bản lưu – mỗi bên tự áp dụng.
 */
export function resolvePvp(
  challenger: PlayerSave,
  challengerTeam: string[],
  defender: PlayerSave,
  seed: number,
  fishById: Map<string, FishDef>,
  formById?: Map<string, FishFormDef>,
): { error: string } | { result: MatchResult; forChallenger: Omit<PvpMatchRecord, "id" | "opponentName">; forDefender: Omit<PvpMatchRecord, "id" | "opponentName"> } {
  const err = validateTeam(challenger, challengerTeam);
  if (err) return { error: err };
  const defTeam = effectiveDefense(defender, fishById, formById);
  if (!defTeam) return { error: "Đối thủ chưa có đủ 3 con cá để phòng thủ" };
  const a = teamFighters(challenger, challengerTeam, fishById, formById);
  const b = teamFighters(defender, defTeam, fishById, formById);
  const result = playMatch(a, b, seed);
  const strongest = (team: Fighter[]) => [...team].sort((x, y) => y.power - x.power)[0]!;
  const chWon = result.winner === 0;
  const loserTeam = chWon ? b : a;
  const lost = strongest(loserTeam);
  const roasted = { fishId: lost.fishId, level: lost.level, stars: lost.stars };
  return {
    result,
    forChallenger: {
      side: 0,
      won: chWon,
      myTeam: challengerTeam,
      duelWins: result.duels.map((d) => d.winner === 0),
      ...(chWon ? { roasted } : { lostUid: lost.uid }),
    },
    forDefender: {
      side: 1,
      won: !chWon,
      myTeam: defTeam,
      duelWins: result.duels.map((d) => d.winner === 1),
      ...(!chWon ? { roasted } : { lostUid: lost.uid }),
    },
  };
}
