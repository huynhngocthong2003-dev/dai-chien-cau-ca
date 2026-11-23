/**
 * Dựng đội cho trận 3vs3 từ bản lưu (máy chủ & game dùng chung):
 * kiểm tra quyền sở hữu, đủ 3 cá, không trùng; đội máy luyện tập có lực chiến tương đương.
 */
import { DM_RANK } from "@dccc/game-config";
import type { FishDef, FishFormDef, ZoneDef } from "./types.ts";
import { addLedger, clone, grantXp, markTx, type PlayerSave } from "./save.ts";
import { ownedFishPower } from "./progression.ts";
import { Rng } from "./rng.ts";
import { ownedElement, ownedElements } from "./elements.ts";
import { DIFFICULTY, aiTeam, type Difficulty, type RoastedFish } from "./deathmatch.ts";
import { makeFighter } from "./battle.ts";
import { makeCombatFish, type AiLevel, type CombatFish } from "./combat.ts";

export function buildPlayerTeam(
  save: PlayerSave,
  uids: unknown,
  fishById: Map<string, FishDef>,
  formById: Map<string, FishFormDef>,
  zoneById: Map<string, Pick<ZoneDef, "element">>,
): { team: CombatFish[] } | { error: string } {
  if (!Array.isArray(uids) || uids.length !== 3 || !uids.every((u) => typeof u === "string")) return { error: "Hãy chọn đúng 3 con cá" };
  if (new Set(uids).size !== 3) return { error: "Mỗi con cá chỉ được xuất hiện 1 lần trong đội hình" };
  const team: CombatFish[] = [];
  for (const uid of uids as string[]) {
    const o = save.fishes.find((f) => f.uid === uid);
    if (!o) return { error: "Có cá không thuộc quyền sở hữu của bạn" };
    if (o.locked) return { error: "Cá đã khoá 🔒 được bảo vệ, không thể ra trận (thua sẽ mất cá)" };
    const def = fishById.get(o.fishId);
    if (!def) return { error: "Dữ liệu cá không hợp lệ" };
    const form = o.form ? formById.get(o.form) ?? null : null;
    team.push(
      makeCombatFish({
        def,
        uid: o.uid,
        level: o.level,
        stars: o.stars,
        element: ownedElement(o, def, zoneById),
        elements: ownedElements(o, def, zoneById),
        hidden: o.hiddenElement,
        parents: o.parents,
        form,
        formRoll: o.formRoll ?? null,
      }),
    );
  }
  return { team };
}

const LEVEL_TO_DIFF: Record<AiLevel, Difficulty> = { easy: "easy", normal: "normal", hard: "hard", boss: "hard" };

/** Đội máy luyện tập: loài trong các khu đã mở, lực chiến quanh mức đội người chơi (theo độ khó). */
export function practiceOpponent(
  seed: number,
  playerTeam: CombatFish[],
  pool: FishDef[],
  level: AiLevel,
  fishById: Map<string, FishDef>,
  /** Hệ số lực chiến đội máy (rank càng cao càng mạnh). */
  powerScale = 1,
): CombatFish[] {
  const rng = new Rng(seed ^ 0x5bd1e995);
  const avgPower = playerTeam.reduce((a, f) => {
    const def = fishById.get(f.fishId)!;
    return a + makeFighter(def, { uid: f.uid, level: f.level, stars: f.stars }).power;
  }, 0) / playerTeam.length;
  return aiTeam(rng, pool, avgPower * powerScale, LEVEL_TO_DIFF[level]).map((fi, i) => {
    const def = fishById.get(fi.fishId)!;
    return makeCombatFish({ def, uid: `ai_${i}`, level: fi.level, stars: fi.stars, element: def.element });
  });
}

export interface CombatOutcomeInput {
  txId: string;
  teamUids: string[];
  won: boolean;
  /** Độ khó máy; null = đấu với NGƯỜI (không sinh vàng/KN – chống "nuôi" tài khoản phụ). */
  level: AiLevel | null;
  /** "friendly" = giao hữu: không mất cá, không thưởng. Mặc định "death". */
  stake?: "friendly" | "death";
  /** Khi thắng: cá nướng từ con mạnh nhất trong danh sách này (đấu người: chính con cá đối thủ bị mất). */
  foe: Pick<CombatFish, "fishId" | "level" | "stars">[];
  /** Đấu người: con cá phải mất do máy chủ chốt lúc vào trận (nếu còn trong túi). */
  loseUid?: string | null;
  now: number;
}

type PowerFish = PlayerSave["fishes"][number];

/** Con cá lực chiến THẤP NHẤT (không khoá) trong đội – con sẽ mất nếu thua. */
export function weakestFish(save: PlayerSave, uids: string[], fishById: Map<string, FishDef>, formById: Map<string, FishFormDef>): PowerFish | null {
  const pw = (o: PowerFish) => {
    const def = fishById.get(o.fishId);
    return def ? ownedFishPower(def, o, o.form ? formById.get(o.form) ?? null : null) : 0;
  };
  const team = uids.map((u) => save.fishes.find((f) => f.uid === u)).filter((o): o is PowerFish => !!o && !o.locked);
  return team.sort((a, b) => pw(a) - pw(b) || a.uid.localeCompare(b.uid))[0] ?? null;
}

export type CombatOutcome =
  | { ok: true; save: PlayerSave; won: boolean; gold?: number; xp?: number; roasted?: RoastedFish; lostUid?: string; lostFishId?: string }
  | { ok: false; error: string };

/**
 * Áp kết quả trận 3vs3 với máy vào bản lưu (thuần, chống áp 2 lần bằng txId).
 *  - THẮNG: vàng + KN theo độ khó (ghi sổ) + cá nướng từ con mạnh nhất của máy.
 *  - THUA: MẤT con cá có LỰC CHIẾN THẤP NHẤT trong đội (cá khoá không bao giờ bị mất).
 */
export function applyCombatOutcome(
  save: PlayerSave,
  input: CombatOutcomeInput,
  fishById: Map<string, FishDef>,
  formById: Map<string, FishFormDef>,
): CombatOutcome {
  if (save.appliedTx.includes(input.txId)) return { ok: false, error: "Trận đấu đã được ghi nhận" };
  const s = clone(save);
  const team = input.teamUids.map((u) => s.fishes.find((f) => f.uid === u)).filter((o): o is PowerFish => !!o);
  for (const o of team) {
    if (input.won) o.wins = (o.wins ?? 0) + 1;
    else o.losses = (o.losses ?? 0) + 1;
  }
  const out: CombatOutcome = { ok: true, save: s, won: input.won };
  if (input.stake === "friendly") {
    markTx(s, input.txId);
    s.updatedAt = input.now;
    return out;
  }
  const reason = `combat3_${input.won ? "win" : "loss"}:${input.level ?? "pvp"}`;
  if (input.won) {
    if (input.level) {
      const d = DIFFICULTY[LEVEL_TO_DIFF[input.level]];
      s.gold += d.gold;
      addLedger(s, input.txId, "gold", d.gold, reason, input.now);
      addLedger(s, input.txId, "xp", d.xp, reason, input.now);
      grantXp(s, d.xp);
      out.gold = d.gold;
      out.xp = d.xp;
    }
    s.stats.dmWins = (s.stats.dmWins ?? 0) + 1;
    // rank Đấu Sinh Tử: mỗi trận thắng (có rủi ro mất cá) +10 điểm
    s.stats.rankPoints = (s.stats.rankPoints ?? 0) + DM_RANK.pointsPerWin;
    const best = [...input.foe].sort((a, b) => b.level * b.stars - a.level * a.stars)[0];
    if (best && fishById.has(best.fishId)) {
      const roasted: RoastedFish = { id: input.txId, fishId: best.fishId, level: best.level, stars: best.stars };
      s.roasted.push(roasted);
      out.roasted = roasted;
    }
  } else {
    s.stats.dmLosses = (s.stats.dmLosses ?? 0) + 1;
    const fixed = input.loseUid ? s.fishes.find((f) => f.uid === input.loseUid && !f.locked) : undefined;
    const weakest = fixed ?? weakestFish(s, input.teamUids, fishById, formById);
    if (weakest) {
      s.fishes = s.fishes.filter((f) => f.uid !== weakest.uid);
      s.showcase = s.showcase.filter((u) => u !== weakest.uid);
      if (s.defense) s.defense = s.defense.filter((u) => u !== weakest.uid);
      out.lostUid = weakest.uid;
      out.lostFishId = weakest.fishId;
    }
  }
  markTx(s, input.txId);
  s.updatedAt = input.now;
  return out;
}
