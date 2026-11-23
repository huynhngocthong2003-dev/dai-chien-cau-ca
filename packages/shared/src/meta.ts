/**
 * Giai đoạn 3 & 5 – meta game: điểm danh, nhiệm vụ ngày, Vòng Quay May Mắn, danh hiệu, danh hiệu xếp hạng.
 * Hàm thuần túy, có txId + ghi sổ; ở Giai đoạn 4+ có thể chạy trên server.
 */
import type { MetricKey, QuestDef, RankCategory, RewardDef, TitleDef, WheelPrizeDef } from "./types.ts";
import type { Rng } from "./rng.ts";
import { dayKey } from "./progression.ts";
import { addLedger, clone, markTx, newCharProgress, newRodProgress, type ActionResult, type PlayerSave } from "./save.ts";

// ------------------------------------------------------------------ phần thưởng
/** Cộng phần thưởng vào save (đã clone) và ghi sổ. */
export function grantReward(s: PlayerSave, r: RewardDef, txId: string, why: string, now: number) {
  if (r.gold) {
    s.gold += r.gold;
    addLedger(s, txId, "gold", r.gold, why, now);
  }
  if (r.diamonds) {
    s.diamonds += r.diamonds;
    addLedger(s, txId, "diamonds", r.diamonds, why, now);
  }
  if (r.stones) {
    s.materials.stones += r.stones;
    addLedger(s, txId, "stones", r.stones, why, now);
  }
  if (r.soul) {
    s.materials.soul += r.soul;
    addLedger(s, txId, "soul", r.soul, why, now);
  }
  if (r.bossTickets) {
    s.materials.bossTickets = Math.min(99, s.materials.bossTickets + r.bossTickets);
    addLedger(s, txId, "bossTickets", r.bossTickets, why, now);
  }
  if (r.evoItem) s.evoItems[r.evoItem] = (s.evoItems[r.evoItem] ?? 0) + 1;
  if (r.characterId) {
    if (!s.characters[r.characterId]) s.characters[r.characterId] = newCharProgress();
    else {
      // trùng nhân vật → 30 Mảnh Linh Hồn
      s.materials.soul += DUPLICATE_CHAR_SOUL;
      addLedger(s, txId, "soul", DUPLICATE_CHAR_SOUL, `${why}:dup`, now);
    }
  }
  if (r.rodId) {
    if (!s.rods[r.rodId]) s.rods[r.rodId] = newRodProgress();
    else {
      // trùng cần câu → 60 Đá Nâng Cấp
      s.materials.stones += DUPLICATE_ROD_STONES;
      addLedger(s, txId, "stones", DUPLICATE_ROD_STONES, `${why}:dup`, now);
    }
  }
}

/** Quà nhân vật/cần câu đã sở hữu từ trước (sẽ đổi thành nguyên liệu). */
export function isDuplicate(save: PlayerSave, r: RewardDef): boolean {
  return (!!r.characterId && !!save.characters[r.characterId]) || (!!r.rodId && !!save.rods[r.rodId]);
}

export const DUPLICATE_CHAR_SOUL = 30;
export const DUPLICATE_ROD_STONES = 60;

/** Đổi phần quà "bốc ngẫu nhiên trong nhóm" thành quà cụ thể. */
export function resolveReward(r: RewardDef, rng: Rng): RewardDef {
  const out: RewardDef = { ...r };
  if (r.characterPool?.length) out.characterId = r.characterPool[rng.int(0, r.characterPool.length - 1)];
  if (r.rodPool?.length) out.rodId = r.rodPool[rng.int(0, r.rodPool.length - 1)];
  if (r.evoPool?.length) out.evoItem = r.evoPool[rng.int(0, r.evoPool.length - 1)];
  delete out.characterPool;
  delete out.rodPool;
  delete out.evoPool;
  return out;
}

export function rewardText(r: RewardDef, evoName?: (id: string) => string): string {
  const parts: string[] = [];
  if (r.gold) parts.push(`${r.gold.toLocaleString("vi-VN")} 🪙`);
  if (r.diamonds) parts.push(`${r.diamonds} 💎`);
  if (r.stones) parts.push(`${r.stones} 🔷`);
  if (r.soul) parts.push(`${r.soul} 🔮`);
  if (r.bossTickets) parts.push(`${r.bossTickets} 🎫`);
  if (r.evoItem) parts.push(evoName ? evoName(r.evoItem) : "Vật phẩm đột biến");
  if (r.characterId) parts.push(`Nhân vật ${evoName ? evoName(r.characterId) : r.characterId}`);
  if (r.rodId) parts.push(`Cần ${evoName ? evoName(r.rodId) : r.rodId}`);
  if (r.characterPool) parts.push("1 Nhân vật hiếm");
  if (r.rodPool) parts.push("1 Cần câu hiếm");
  if (r.evoPool) parts.push("1 Đá Tiến Hoá vạn năng");
  return parts.join(" + ");
}

// ------------------------------------------------------------------ chỉ số
export function metric(save: PlayerSave, k: MetricKey): number {
  const st = save.stats;
  switch (k) {
    case "caught":
      return st.totalCaught;
    case "bosses":
      return st.bossesCaught;
    case "junk":
      return st.junkCaught ?? 0;
    case "recycled":
      return save.eco.recycled;
    case "dmWins":
      return st.dmWins ?? 0;
    case "species":
      return Object.keys(st.species).length;
    case "level":
      return save.level;
    case "gold":
      return save.gold;
    case "roastedEaten":
      return st.roastedEaten ?? 0;
    case "forms":
      return save.fishes.filter((f) => !!f.form).length;
    case "spins":
      return st.spins ?? 0;
    case "checkins":
      return save.checkin.total;
    case "heaviest":
      return Math.floor(st.heaviestKg);
  }
}

const DAILY_METRICS: MetricKey[] = ["caught", "bosses", "junk", "recycled", "dmWins", "spins", "roastedEaten"];

/** Sang ngày mới: chụp mốc chỉ số, xóa nhiệm vụ đã nhận, trả lượt quay miễn phí. */
export function refreshDaily(save: PlayerSave, now: number): PlayerSave {
  const day = dayKey(now);
  if (save.daily.day === day) return save;
  const s = clone(save);
  s.daily = { day, base: Object.fromEntries(DAILY_METRICS.map((k) => [k, metric(save, k)])), claimed: [], freeSpinUsed: false };
  return s;
}

export function questProgress(save: PlayerSave, q: QuestDef): number {
  const base = save.daily.base[q.metric] ?? metric(save, q.metric);
  return Math.max(0, Math.min(q.target, metric(save, q.metric) - base));
}

export function claimQuest(save: PlayerSave, q: QuestDef, txId: string, now: number): ActionResult {
  if (save.daily.day !== dayKey(now)) return { ok: false, error: "Nhiệm vụ đã sang ngày mới – mở lại bảng nhiệm vụ" };
  if (save.daily.claimed.includes(q.id)) return { ok: false, error: "Đã nhận thưởng nhiệm vụ này" };
  if (questProgress(save, q) < q.target) return { ok: false, error: "Chưa hoàn thành nhiệm vụ" };
  if (save.appliedTx.includes(txId)) return { ok: false, error: "Giao dịch trùng lặp" };
  const s = clone(save);
  grantReward(s, q.reward, txId, `quest:${q.id}`, now);
  s.daily.claimed.push(q.id);
  markTx(s, txId);
  s.updatedAt = now;
  return { ok: true, save: s };
}

// ------------------------------------------------------------------ điểm danh
function prevDay(day: string): string {
  return new Date(Date.parse(day + "T00:00:00Z") - 86400_000).toISOString().slice(0, 10);
}

/** Ô điểm danh hôm nay (0..len-1) và đã điểm danh hôm nay chưa. */
export function checkinState(save: PlayerSave, now: number, len: number): { index: number; done: boolean; streak: number } {
  const today = dayKey(now);
  const c = save.checkin;
  if (c.lastDay === today) return { index: (c.streak - 1) % len, done: true, streak: c.streak };
  const cont = c.lastDay === prevDay(today);
  const streak = cont ? c.streak : 0;
  return { index: streak % len, done: false, streak };
}

export function claimCheckin(save: PlayerSave, rewards: RewardDef[], txId: string, now: number): ActionResult & { index?: number } {
  const st = checkinState(save, now, rewards.length);
  if (st.done) return { ok: false, error: "Hôm nay bạn đã điểm danh rồi, mai quay lại nhé!" };
  if (save.appliedTx.includes(txId)) return { ok: false, error: "Giao dịch trùng lặp" };
  const s = clone(save);
  grantReward(s, rewards[st.index]!, txId, `checkin:${st.index + 1}`, now);
  s.checkin = { lastDay: dayKey(now), streak: st.streak + 1, total: save.checkin.total + 1 };
  markTx(s, txId);
  s.updatedAt = now;
  return { ok: true, save: s, index: st.index };
}

// ------------------------------------------------------------------ vòng quay
export const WHEEL_COST_DIAMONDS = 30;

/** Quay Vòng Quay May Mắn: 1 lượt miễn phí mỗi ngày, sau đó tốn kim cương. */
export function spinWheel(
  save: PlayerSave,
  prizes: WheelPrizeDef[],
  rng: Rng,
  txId: string,
  now: number,
): ActionResult & { prize?: WheelPrizeDef; index?: number; free?: boolean; reward?: RewardDef; dup?: boolean } {
  if (save.appliedTx.includes(txId)) return { ok: false, error: "Giao dịch trùng lặp" };
  const fresh = refreshDaily(save, now);
  const free = !fresh.daily.freeSpinUsed;
  if (!free && fresh.diamonds < WHEEL_COST_DIAMONDS) return { ok: false, error: `Cần ${WHEEL_COST_DIAMONDS} 💎 để quay thêm` };
  const s = clone(fresh);
  if (free) s.daily.freeSpinUsed = true;
  else {
    s.diamonds -= WHEEL_COST_DIAMONDS;
    addLedger(s, txId, "diamonds", -WHEEL_COST_DIAMONDS, "wheel:spin", now);
  }
  const prize = rng.pickWeighted(prizes, (p) => p.weight);
  const reward = resolveReward(prize.reward, rng);
  const dup = isDuplicate(save, reward);
  grantReward(s, reward, txId, `wheel:${prize.id}`, now);
  s.stats.spins = (s.stats.spins ?? 0) + 1;
  markTx(s, txId);
  s.updatedAt = now;
  return { ok: true, save: s, prize, index: prizes.indexOf(prize), free, reward, dup };
}

/** Quay x10: 270 💎 (rẻ hơn 10%), món ngon có tỉ lệ ra ×1,6 so với quay lẻ (không đảm bảo). */
export const WHEEL_COST_10 = 270;
export const WHEEL_X10_GOOD_BOOST = 1.6;

export function spinWheel10(
  save: PlayerSave,
  prizes: WheelPrizeDef[],
  goodWeight: number,
  rng: Rng,
  txId: string,
  now: number,
): ActionResult & { prizes?: WheelPrizeDef[]; indexes?: number[]; rewards?: RewardDef[]; dups?: boolean[] } {
  if (save.appliedTx.includes(txId)) return { ok: false, error: "Giao dịch trùng lặp" };
  if (save.diamonds < WHEEL_COST_10) return { ok: false, error: `Cần ${WHEEL_COST_10} 💎 để quay 10 lần` };
  const s = clone(refreshDaily(save, now));
  s.diamonds -= WHEEL_COST_10;
  addLedger(s, txId, "diamonds", -WHEEL_COST_10, "wheel:spin10", now);
  const good = (p: WheelPrizeDef) => p.weight <= goodWeight;
  const boosted = (p: WheelPrizeDef) => (good(p) ? p.weight * WHEEL_X10_GOOD_BOOST : p.weight);
  const got: WheelPrizeDef[] = [];
  for (let i = 0; i < 10; i++) got.push(rng.pickWeighted(prizes, boosted));
  const rewards: RewardDef[] = [];
  const dups: boolean[] = [];
  for (const p of got) {
    const r = resolveReward(p.reward, rng);
    dups.push(isDuplicate(s, r));
    grantReward(s, r, txId, `wheel:${p.id}`, now);
    rewards.push(r);
  }
  s.stats.spins = (s.stats.spins ?? 0) + 10;
  markTx(s, txId);
  s.updatedAt = now;
  return { ok: true, save: s, prizes: got, indexes: got.map((p) => prizes.indexOf(p)), rewards, dups };
}

// ------------------------------------------------------------------ danh hiệu
export function titleProgress(save: PlayerSave, t: TitleDef): number {
  return Math.min(t.target, metric(save, t.metric));
}

/** Nhận danh hiệu khi đạt yêu cầu (một lần), kèm quà. */
export function claimTitle(save: PlayerSave, t: TitleDef, txId: string, now: number): ActionResult {
  if (save.titles.owned.includes(t.id)) return { ok: false, error: "Bạn đã có danh hiệu này" };
  if (titleProgress(save, t) < t.target) return { ok: false, error: "Chưa đạt yêu cầu danh hiệu" };
  if (save.appliedTx.includes(txId)) return { ok: false, error: "Giao dịch trùng lặp" };
  const s = clone(save);
  s.titles.owned.push(t.id);
  if (!s.titles.equipped) s.titles.equipped = t.id;
  grantReward(s, t.reward, txId, `title:${t.id}`, now);
  markTx(s, txId);
  s.updatedAt = now;
  return { ok: true, save: s };
}

export function equipTitle(save: PlayerSave, titleId: string | null, now: number): ActionResult {
  if (titleId && !save.titles.owned.includes(titleId)) return { ok: false, error: "Bạn chưa có danh hiệu này" };
  const s = clone(save);
  s.titles.equipped = titleId;
  s.updatedAt = now;
  return { ok: true, save: s };
}

// ------------------------------------------------------------------ danh hiệu xếp hạng
const RANK_TITLES: Record<RankCategory, [string, string, string, string]> = {
  level: ["Huyền Thoại Cần Câu", "Đại Sư Câu Cá", "Cao Thủ Mặt Nước", "Top 10 Cần Thủ"],
  caught: ["Vua Câu Cá", "Á Vương Câu Cá", "Tam Hoàng Câu Cá", "Top 10 Thợ Câu"],
  bosses: ["Diệt Boss Chí Tôn", "Khắc Tinh Thủy Quái", "Thợ Săn Boss Lừng Danh", "Top 10 Săn Boss"],
  dmWins: ["Chiến Thần Sinh Tử", "Đấu Sĩ Bất Bại", "Sát Thủ Đấu Trường", "Top 10 Đấu Sĩ"],
  junk: ["Vua Nhặt Rác", "Nữ Hoàng Tái Chế", "Hiệp Sĩ Môi Trường", "Top 10 Kẻ Săn Lùng Rác"],
  teamPower: ["Bá Chủ Đại Dương", "Hải Vương Chiến Lực", "Thủy Quân Vô Địch", "Top 10 Đội Hình Mạnh"],
};

/** Danh hiệu theo thứ hạng (1-based) trong một bảng xếp hạng; null nếu ngoài top 10. */
export function rankTitle(cat: RankCategory, rank: number): { name: string; icon: string; color: string } | null {
  if (rank < 1 || rank > 10) return null;
  const n = RANK_TITLES[cat];
  if (rank === 1) return { name: n[0], icon: "👑", color: "#ffd54f" };
  if (rank === 2) return { name: n[1], icon: "🥈", color: "#e0e0e0" };
  if (rank === 3) return { name: n[2], icon: "🥉", color: "#ffab91" };
  return { name: n[3], icon: "🏅", color: "#80d8ff" };
}

// ------------------------------------------------------------------ hội
/** Kiểm tra tên & ký hiệu hội (máy chủ kiểm tra lại bằng ràng buộc). */
export function validateGuild(name: string, tag: string): string | null {
  const n = name.trim();
  const t = tag.trim();
  if (n.length < 3 || n.length > 24) return "Tên hội dài 3–24 ký tự";
  if (!/^[\p{L}\p{N} _.-]+$/u.test(n)) return "Tên hội chỉ gồm chữ, số, khoảng trắng, _ . -";
  if (t.length < 2 || t.length > 5 || !/^[\p{L}\p{N}]+$/u.test(t)) return "Ký hiệu hội 2–5 chữ hoặc số";
  return null;
}
