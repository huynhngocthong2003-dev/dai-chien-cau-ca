/**
 * Giai đoạn 2 – phát triển nhân vật, cần câu và cá. Hàm thuần túy: nhận save,
 * trả save mới hoặc lỗi. Mọi khoản chi đều ghi sổ với txId duy nhất.
 */
import { RARITY_ORDER } from "@dccc/game-config";
import type { CharRarity, CharacterDef, Element, FishDef, FishFormDef, RodDef } from "./types.ts";
import {
  DAILY_BOSS_TICKETS,
  MATERIAL_DROP,
  addLedger,
  clone,
  markTx,
  type ActionResult,
  type FormRoll,
  type OwnedFish,
  type PlayerSave,
} from "./save.ts";

export interface Cost {
  gold: number;
  stones: number;
  soul: number;
  /** Đá Tiến Hoá của HỆ cá đã tiến hoá (id vật phẩm) – trưởng thành theo giai. */
  evo?: { item: string; n: number };
}

export const MAX_BREAKTHROUGH = 5;
export const MAX_STARS = 5;

// ------------------------------------------------------------------ giai đoạn trưởng thành của cá
/**
 * Cá Huyền Thoại (siêu hiếm), Boss & Thần Thoại:
 *  BƯỚC 1 – TIẾN HOÁ HỆ: dùng vật phẩm của 1 trong 5 hệ (Long, Hỏa, Băng, Lôi, Thần) → thành 1 dạng của hệ đó (chỉ 1 lần, không đổi được).
 *  BƯỚC 2 – 4 GIAI ĐOẠN TRƯỞNG THÀNH (lưu ở `stars`, 1..4): lên giai bằng vàng + Mảnh Linh Hồn + Đá Nâng Cấp + Đá Tiến Hoá của hệ đó.
 * Càng trưởng thành càng to, đẹp, mạnh.
 * Cá thường vẫn tiến hoá sao (★, hợp cá cùng loài) như cũ.
 */
export const STAGE_NAMES = ["Sơ Giai", "Trung Giai", "Cao Giai", "Thánh Giai"] as const;
export const MAX_STAGE = 4;
export function isGrowthFish(f: Pick<FishDef, "rarity"> | undefined | null): boolean {
  return !!f && (f.rarity === "legendary" || f.rarity === "boss" || f.rarity === "mythic");
}
/** Giai đoạn (1..4) của cá Boss/Thần Thoại – bản cũ có 5 sao tính là Thánh Giai. */
export function fishStage(stars: number): number {
  return Math.max(1, Math.min(MAX_STAGE, stars));
}
export function stageName(stars: number): string {
  return STAGE_NAMES[fishStage(stars) - 1]!;
}
/** Đá Tiến Hoá theo hệ: id vật phẩm (khớp game-data EVO_ITEMS). Lông Phượng Thần dùng thay cho mọi hệ. */
export const ELEMENT_EVO_ITEM: Record<Element, string> = {
  water: "e_ngoc_long_hon",
  fire: "e_loi_dung_nham",
  wood: "e_tinh_the_bang_ha",
  metal: "e_sam_thach",
  dark: "e_u_minh_thach",
  light: "e_thanh_quang_thach",
  earth: "e_dia_mach_thach",
};
export const DIVINE_EVO_ITEM = "e_long_phuong_than";
/** Đá dùng thay cho Đá Tiến Hoá của MỌI hệ (Lông Phượng Thần + 3 đá cũ U Minh / Thánh Quang / Địa Mạch). */
export const WILDCARD_EVO_ITEMS = [DIVINE_EVO_ITEM, "e_u_minh_thach", "e_thanh_quang_thach", "e_dia_mach_thach"];
/** Số Đá Tiến Hoá đúng hệ để lên giai tiếp theo (theo giai hiện tại): Trung 1, Cao 2, Thánh 3. */
export const STAGE_EVO_STONES = [0, 1, 2, 3];
/** Kích thước hiển thị theo giai (Thánh Giai = 1, Sơ Giai nhỏ nhất). */
export function stageScale(stars: number): number {
  return [0.62, 0.75, 0.88, 1][fishStage(stars) - 1]!;
}
/** Số Đá Tiến Hoá dùng được cho một hệ (đá của hệ đó + đá vạn năng). */
export function evoStonesFor(s: PlayerSave, item: string): number {
  return [item, ...WILDCARD_EVO_ITEMS.filter((w) => w !== item)].reduce((n, id) => n + (s.evoItems[id] ?? 0), 0);
}

const RARITY_COST: Record<CharRarity, number> = { N: 1, R: 1.3, SR: 1.7, SSR: 2.2, UR: 3, LR: 4 };

function fishRarityIdx(f: FishDef) {
  return RARITY_ORDER.indexOf(f.rarity);
}

// ------------------------------------------------------------------ chi phí
export function charMaxLevel(breakthrough: number): number {
  return Math.min(60, 10 + 10 * breakthrough);
}

export function charUpgradeCost(c: CharacterDef, level: number): Cost {
  return { gold: Math.round(120 * Math.pow(level, 1.6) * RARITY_COST[c.rarity]), stones: Math.ceil(level * 0.8) + 1, soul: 0 };
}

export function breakthroughCost(c: CharacterDef, b: number): Cost {
  const k = (b + 1) * (b + 1);
  return { gold: Math.round(2000 * k * RARITY_COST[c.rarity]), stones: 15 * k, soul: 4 * k };
}

export function awakenCost(c: CharacterDef): Cost {
  return { gold: Math.round(150000 * RARITY_COST[c.rarity]), stones: 600, soul: 200 };
}

export function rodMaxLevel(stars: number): number {
  return 10 * Math.min(MAX_STARS, Math.max(1, stars));
}

export function rodUpgradeCost(r: RodDef, level: number): Cost {
  return { gold: Math.round(80 * Math.pow(level, 1.5) * RARITY_COST[r.rarity]), stones: level, soul: 0 };
}

export function rodEvolveCost(r: RodDef, stars: number): Cost {
  const k = stars * stars;
  return { gold: Math.round(3000 * k * RARITY_COST[r.rarity]), stones: 25 * k, soul: 3 * k };
}

export function fishMaxLevel(stars: number, growth = false): number {
  if (growth) return [15, 25, 35, 50][fishStage(stars) - 1]!;
  return 10 * Math.min(MAX_STARS, Math.max(1, stars));
}

/**
 * Vàng nâng cấp cá theo độ hiếm (không nhân giá trị cá nữa – trước đây Boss/Thần Thoại tốn hàng chục vạn vàng / cấp).
 * Mỗi cấp: hệ số × cấp + 20. VD Boss: cấp 10 ≈ 1.8K, cấp 40 ≈ 7.2K, trọn cấp 1→50 ≈ 220K.
 */
export const FISH_GOLD_RATE: Record<FishDef["rarity"], number> = { common: 15, rare: 25, precious: 40, epic: 70, legendary: 120, boss: 180, mythic: 220 };

export function fishUpgradeCost(f: FishDef, level: number): Cost {
  return { gold: Math.round(FISH_GOLD_RATE[f.rarity] * level + 20), stones: Math.ceil(level * (1 + fishRarityIdx(f) * 0.5)), soul: 0 };
}

/** `formItem`: vật phẩm của hệ mà cá đã tiến hoá (bắt buộc với cá trưởng thành). */
export function fishEvolveCost(f: FishDef, stars: number, formItem?: string): Cost {
  const rate = FISH_GOLD_RATE[f.rarity];
  if (!isGrowthFish(f)) return { gold: Math.round(Math.min(f.value * 2, rate * 40) * stars + 100), stones: 10 * stars, soul: Math.max(0, fishRarityIdx(f) - 1) * stars };
  // trưởng thành (Huyền Thoại/Boss/Thần Thoại): vàng + linh hồn + đá nâng cấp + Đá Tiến Hoá của hệ theo giai
  const st = fishStage(stars);
  return {
    gold: Math.round(rate * 60 * st * st + 2000 * st),
    stones: 40 * st,
    soul: 25 * st,
    evo: { item: formItem ?? ELEMENT_EVO_ITEM[f.element], n: STAGE_EVO_STONES[st] ?? 1 },
  };
}

/** Nguyên liệu nhận được khi phân giải một con cá. */
export function decomposeValue(f: FishDef, o: Pick<OwnedFish, "level" | "stars">): { stones: number; soul: number } {
  const d = MATERIAL_DROP[f.rarity];
  return {
    stones: Math.round((d.stones * 2 + Math.floor(o.level / 2)) * o.stars),
    soul: d.soul * o.stars,
  };
}

/** Chỉ số cá theo cấp (+8%/cấp), sao (+15%/sao) và thể tiến hóa (nếu có). */
export function fishStats(f: FishDef, level = 1, stars = 1, form?: FishFormDef | null, roll?: FormRoll | null) {
  const m = (1 + 0.08 * (level - 1)) * (1 + 0.15 * (stars - 1));
  // phần tăng của thể đột biến nhân với hệ số ngẫu nhiên của lần đột biến
  const fm = (k: "hp" | "atk" | "def") => (form ? 1 + (form.mult[k] - 1) * (roll?.[k] ?? 1) : 1);
  return {
    hp: Math.round(f.hp * m * fm("hp")),
    atk: Math.round(f.atk * m * fm("atk")),
    def: Math.round(f.def * m * fm("def")),
    spd: f.spd + (stars - 1) * 2 + (form?.spdBonus ?? 0),
    element: f.element, // hệ theo loài / khu câu – thể đột biến không đổi hệ
  };
}

export function ownedFishPower(f: FishDef, o: Pick<OwnedFish, "level" | "stars" | "formRoll">, form?: FishFormDef | null): number {
  const s = fishStats(f, o.level, o.stars, form, o.formRoll);
  return Math.round(s.hp / 10 + s.atk * 2 + s.def * 1.5 + s.spd);
}

// ------------------------------------------------------------------ thanh toán
export function canAfford(s: PlayerSave, c: Cost): string | null {
  if (s.gold < c.gold) return `Cần ${c.gold.toLocaleString("vi-VN")} vàng`;
  if (s.materials.stones < c.stones) return `Cần ${c.stones} Đá Nâng Cấp`;
  if (s.materials.soul < c.soul) return `Cần ${c.soul} Mảnh Linh Hồn`;
  if (c.evo && evoStonesFor(s, c.evo.item) < c.evo.n) return `Cần ${c.evo.n} Đá Tiến Hoá của hệ (rơi khi câu cá / Boss Thế Giới)`;
  return null;
}

function pay(s: PlayerSave, c: Cost, txId: string, reason: string, now: number) {
  s.gold -= c.gold;
  s.materials.stones -= c.stones;
  s.materials.soul -= c.soul;
  if (c.gold) addLedger(s, txId, "gold", -c.gold, reason, now);
  if (c.stones) addLedger(s, txId, "stones", -c.stones, reason, now);
  if (c.soul) addLedger(s, txId, "soul", -c.soul, reason, now);
  if (c.evo) {
    // dùng đá đúng hệ trước, thiếu thì dùng Lông Phượng Thần
    let n = c.evo.n;
    for (const id of [c.evo.item, ...WILDCARD_EVO_ITEMS.filter((w) => w !== c.evo!.item)]) {
      const take = Math.min(n, s.evoItems[id] ?? 0);
      if (!take) continue;
      s.evoItems[id]! -= take;
      if (s.evoItems[id] === 0) delete s.evoItems[id];
      n -= take;
    }
  }
}


/** Khung chung: kiểm tra trùng giao dịch, đủ tiền, rồi áp dụng thay đổi. */
function transact(
  save: PlayerSave,
  txId: string,
  now: number,
  cost: Cost,
  reason: string,
  apply: (s: PlayerSave) => void,
): ActionResult {
  if (save.appliedTx.includes(txId)) return { ok: false, error: "Giao dịch trùng lặp" };
  const err = canAfford(save, cost);
  if (err) return { ok: false, error: err };
  const s = clone(save);
  pay(s, cost, txId, reason, now);
  apply(s);
  markTx(s, txId);
  s.updatedAt = now;
  return { ok: true, save: s };
}

// ------------------------------------------------------------------ nhân vật
export type CharAction = "upgrade" | "breakthrough" | "awaken" | "max";

/** Hành động phát triển tiếp theo khả dụng cho nhân vật. */
export function nextCharAction(save: PlayerSave, c: CharacterDef): { action: CharAction; cost: Cost | null } {
  const p = save.characters[c.id];
  if (!p) return { action: "max", cost: null };
  const cap = charMaxLevel(p.breakthrough);
  if (p.level < cap) return { action: "upgrade", cost: charUpgradeCost(c, p.level) };
  if (p.breakthrough < MAX_BREAKTHROUGH) return { action: "breakthrough", cost: breakthroughCost(c, p.breakthrough) };
  if (!p.awakened) return { action: "awaken", cost: awakenCost(c) };
  return { action: "max", cost: null };
}

export function developCharacter(save: PlayerSave, c: CharacterDef, txId: string, now: number): ActionResult {
  if (!save.characters[c.id]) return { ok: false, error: "Chưa sở hữu nhân vật này" };
  const { action, cost } = nextCharAction(save, c);
  if (action === "max" || !cost) return { ok: false, error: "Nhân vật đã đạt tối đa" };
  return transact(save, txId, now, cost, `char_${action}:${c.id}`, (s) => {
    const p = s.characters[c.id]!;
    if (action === "upgrade") p.level += 1;
    else if (action === "breakthrough") p.breakthrough += 1;
    else p.awakened = true;
  });
}

// ------------------------------------------------------------------ cần câu
export type RodAction = "upgrade" | "evolve" | "max";

export function nextRodAction(save: PlayerSave, r: RodDef): { action: RodAction; cost: Cost | null } {
  const p = save.rods[r.id];
  if (!p) return { action: "max", cost: null };
  if (p.level < rodMaxLevel(p.stars)) return { action: "upgrade", cost: rodUpgradeCost(r, p.level) };
  if (p.stars < MAX_STARS) return { action: "evolve", cost: rodEvolveCost(r, p.stars) };
  return { action: "max", cost: null };
}

export function developRod(save: PlayerSave, r: RodDef, txId: string, now: number): ActionResult {
  if (!save.rods[r.id]) return { ok: false, error: "Chưa sở hữu cần câu này" };
  const { action, cost } = nextRodAction(save, r);
  if (action === "max" || !cost) return { ok: false, error: "Cần câu đã đạt tối đa" };
  return transact(save, txId, now, cost, `rod_${action}:${r.id}`, (s) => {
    const p = s.rods[r.id]!;
    if (action === "upgrade") p.level += 1;
    else p.stars += 1;
  });
}

// ------------------------------------------------------------------ cá
/** "form": cá trưởng thành chưa tiến hoá hệ – phải tiến hoá hệ trước khi lên giai. */
export type FishAction = "upgrade" | "evolve" | "form" | "max";

/** Cá cùng loài có thể dùng làm nguyên liệu tiến hóa (không khóa, không phải chính nó). */
export function evolveFodder(save: PlayerSave, uid: string): OwnedFish | null {
  const target = save.fishes.find((f) => f.uid === uid);
  if (!target) return null;
  const cands = save.fishes.filter((f) => f.uid !== uid && f.fishId === target.fishId && !f.locked);
  cands.sort((a, b) => a.stars - b.stars || a.level - b.level || a.weightKg - b.weightKg);
  return cands[0] ?? null;
}

export function nextFishAction(save: PlayerSave, o: OwnedFish, f: FishDef, formById?: Map<string, FishFormDef>): { action: FishAction; cost: Cost | null } {
  const growth = isGrowthFish(f);
  if (o.level < fishMaxLevel(o.stars, growth)) return { action: "upgrade", cost: fishUpgradeCost(f, o.level) };
  if (o.stars < (growth ? MAX_STAGE : MAX_STARS)) {
    if (!growth) return { action: "evolve", cost: fishEvolveCost(f, o.stars) };
    const form = o.form ? formById?.get(o.form) : undefined;
    if (!form) return { action: "form", cost: null };
    return { action: "evolve", cost: fishEvolveCost(f, o.stars, form.itemId) };
  }
  return { action: "max", cost: null };
}

export function developFish(save: PlayerSave, uid: string, fishById: Map<string, FishDef>, txId: string, now: number, formById?: Map<string, FishFormDef>): ActionResult {
  const o = save.fishes.find((f) => f.uid === uid);
  if (!o) return { ok: false, error: "Không tìm thấy cá" };
  const f = fishById.get(o.fishId);
  if (!f) return { ok: false, error: "Dữ liệu cá không hợp lệ" };
  const { action, cost } = nextFishAction(save, o, f, formById);
  if (action === "form") return { ok: false, error: "Hãy TIẾN HOÁ HỆ trước (chọn 1 trong 5 hệ), sau đó mới lên giai trưởng thành" };
  if (action === "max" || !cost) return { ok: false, error: "Cá đã đạt tối đa" };
  // cá thường tiến hoá sao cần hợp 1 con cùng loài; Huyền Thoại/Boss/Thần Thoại trưởng thành chỉ tốn vàng + linh hồn + đá
  let fodderUid: string | null = null;
  if (action === "evolve" && !isGrowthFish(f)) {
    const fodder = evolveFodder(save, uid);
    if (!fodder) return { ok: false, error: `Cần thêm 1 con ${f.name} (không khóa) để tiến hóa` };
    fodderUid = fodder.uid;
  }
  return transact(save, txId, now, cost, `fish_${action}:${f.id}`, (s) => {
    const t = s.fishes.find((x) => x.uid === uid)!;
    if (action === "upgrade") t.level += 1;
    else {
      t.stars += 1;
      if (fodderUid) s.fishes = s.fishes.filter((x) => x.uid !== fodderUid);
    }
  });
}

export function decomposeFishes(
  save: PlayerSave,
  uids: string[],
  fishById: Map<string, FishDef>,
  txId: string,
  now: number,
): ActionResult & { stones?: number; soul?: number } {
  if (save.appliedTx.includes(txId)) return { ok: false, error: "Giao dịch trùng lặp" };
  const set = new Set(uids);
  if (set.size === 0) return { ok: false, error: "Chưa chọn cá" };
  let stones = 0;
  let soul = 0;
  for (const uid of set) {
    const o = save.fishes.find((f) => f.uid === uid);
    if (!o) return { ok: false, error: "Có cá không thuộc sở hữu" };
    if (o.locked) return { ok: false, error: "Không thể phân giải cá đang khóa" };
    const f = fishById.get(o.fishId);
    if (!f) return { ok: false, error: "Dữ liệu cá không hợp lệ" };
    const v = decomposeValue(f, o);
    stones += v.stones;
    soul += v.soul;
  }
  const s = clone(save);
  s.fishes = s.fishes.filter((f) => !set.has(f.uid));
  s.materials.stones += stones;
  s.materials.soul += soul;
  addLedger(s, txId, "stones", stones, `decompose:${set.size}`, now);
  if (soul) addLedger(s, txId, "soul", soul, `decompose:${set.size}`, now);
  markTx(s, txId);
  s.updatedAt = now;
  return { ok: true, save: s, stones, soul };
}

export function toggleFishLock(save: PlayerSave, uid: string, now: number): ActionResult {
  if (!save.fishes.some((f) => f.uid === uid)) return { ok: false, error: "Không tìm thấy cá" };
  const s = clone(save);
  const f = s.fishes.find((x) => x.uid === uid)!;
  f.locked = !f.locked;
  s.updatedAt = now;
  return { ok: true, save: s };
}

// ------------------------------------------------------------------ vé Boss
export function dayKey(now: number): string {
  // Theo giờ Việt Nam (UTC+7) để "ngày mới" khớp với người chơi.
  return new Date(now + 7 * 3600_000).toISOString().slice(0, 10);
}

/** Hồi vé Boss lên tối thiểu DAILY_BOSS_TICKETS mỗi ngày. Trả về save mới (hoặc chính nó). */
export function refillBossTickets(save: PlayerSave, now: number): PlayerSave {
  const day = dayKey(now);
  if (save.bossTicketDay === day) return save;
  const s = clone(save);
  const before = s.materials.bossTickets;
  s.materials.bossTickets = Math.max(before, DAILY_BOSS_TICKETS);
  s.bossTicketDay = day;
  if (s.materials.bossTickets > before) addLedger(s, `daily_${day}`, "bossTickets", s.materials.bossTickets - before, "daily_refill", now);
  s.updatedAt = now;
  return s;
}

export function consumeBossTicket(save: PlayerSave, txId: string, now: number): ActionResult {
  if (save.appliedTx.includes(txId)) return { ok: false, error: "Giao dịch trùng lặp" };
  if (save.materials.bossTickets < 1) return { ok: false, error: "Hết Vé Boss. Vé hồi lại mỗi ngày hoặc nhận khi bắt cá Huyền Thoại." };
  const s = clone(save);
  s.materials.bossTickets -= 1;
  addLedger(s, txId, "bossTickets", -1, "boss_hunt", now);
  markTx(s, txId);
  s.updatedAt = now;
  return { ok: true, save: s };
}

/** Biến thể Boss trong chế độ Săn Boss: mạnh hơn 40%. */
export function huntBoss(boss: FishDef): FishDef {
  return { ...boss, hp: Math.round(boss.hp * 1.4), atk: Math.round(boss.atk * 1.2), spd: Math.min(100, boss.spd + 10) };
}
