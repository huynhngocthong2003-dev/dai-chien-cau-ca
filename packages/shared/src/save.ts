import { ECONOMY, PROGRESSION } from "@dccc/game-config";
import { elementOfCatch } from "./elements.ts";
import type { CharacterDef, CosmeticSlot, Element, FishDef, PassiveEffect, RodDef, UnlockCondition, ZoneDef } from "./types.ts";
import { sumPassive } from "./loadout.ts";
import type { BreedingState } from "./breeding.ts";

export const SAVE_VERSION = 8;

/** Kim cương thưởng: mỗi lần lên cấp, lần đầu bắt một loài, mỗi lần bắt Boss. */
export const DIAMOND_REWARDS = { levelUp: 10, newSpecies: 3, boss: 5 };

/** Vé Boss tối đa có thể tích trữ. */
export const MAX_BOSS_TICKETS_STORED = 10;
/** Số vé Boss được hồi mỗi ngày (hồi lên tối thiểu bằng số này). */
export const DAILY_BOSS_TICKETS = 3;

export interface OwnedFish {
  uid: string;
  fishId: string;
  /** Nguyên tố của con cá này (theo khu câu được; loài hệ cố định thì theo loài). */
  element?: Element;
  /** Cá lai: 2 hệ (hệ chính của cá bố + cá mẹ). Có thì dùng thay cho `element`. */
  elements?: Element[];
  /** Cá Gen Lặn: thêm 1 hệ ẩn (đối thủ chỉ thấy "?"). */
  hiddenElement?: Element;
  /** Giới tính: ♂ "m" / ♀ "f". Thiếu → suy cố định theo uid (fishGender). */
  gender?: "m" | "f";
  /** Cá lai: loài của [cá bố, cá mẹ] – để vẽ dáng con theo bố mẹ. */
  parents?: [string, string];
  weightKg: number;
  zoneId: string;
  caughtAt: number;
  level: number;
  /** Số sao tiến hóa (1..5). */
  stars: number;
  /** Cá bị khóa không thể bán, phân giải hay dùng làm nguyên liệu. */
  locked: boolean;
  /** Thắng / thua trong Đấu Sinh Tử (để tính tỉ lệ thắng). */
  wins?: number;
  losses?: number;
  /** Thể tiến hóa đột biến (id thể). */
  form?: string;
  /** Hệ số tăng ngẫu nhiên của lần đột biến (mỗi chỉ số một hệ số; có thể "vượt bậc"). */
  formRoll?: FormRoll;
}

export interface FormRoll {
  hp: number;
  atk: number;
  def: number;
}

export interface CharProgress {
  level: number;
  /** Số lần đột phá (0..5). Mỗi lần mở thêm 10 cấp. */
  breakthrough: number;
  awakened: boolean;
  /** Kinh nghiệm hiện có của nhân vật (từ ăn cá nướng). */
  xp?: number;
  /** Đồ đang mặc: id vật phẩm theo ô. */
  equip: Partial<Record<CosmeticSlot, string>>;
}

export interface RodProgress {
  level: number;
  /** Sao tiến hóa (1..5). Giới hạn cấp = 10 × sao. */
  stars: number;
  /** Số lượt câu đã dùng kể từ lần sửa gần nhất (hết lượt phải sửa cần). */
  wear?: number;
}

export interface Materials {
  /** Đá Nâng Cấp. */
  stones: number;
  /** Mảnh Linh Hồn. */
  soul: number;
  /** Vé Boss. */
  bossTickets: number;
}

export type Currency = "gold" | "diamonds" | "xp" | "stones" | "soul" | "bossTickets" | "eco";

/** Bảo vệ môi trường: rác đang giữ, điểm tái chế, tổng đã tái chế. */
export interface EcoState {
  points: number;
  junk: Record<string, number>;
  recycled: number;
}

export interface LedgerEntry {
  txId: string;
  currency: Currency;
  amount: number;
  reason: string;
  at: number;
}

export interface PlayerSave {
  version: number;
  playerId: string;
  name: string;
  level: number;
  xp: number;
  gold: number;
  diamonds: number;
  selectedCharacterId: string;
  selectedRodId: string;
  selectedZoneId: string;
  characters: Record<string, CharProgress>;
  rods: Record<string, RodProgress>;
  materials: Materials;
  /** Tủ đồ: id quần áo / trang sức → số lượng sở hữu. */
  wardrobe: Record<string, number>;
  /** Mã băm của các mã quà đã đổi. */
  redeemedCodes: string[];
  eco: EcoState;
  /** Sự kiện đã nhận quà. */
  claimedEvents: string[];
  /** Cá nướng thắng được từ Đấu Sinh Tử, chờ cho cá ăn. */
  roasted: { id: string; fishId: string; level: number; stars: number }[];
  /** Cá trưng bày ở hồ sơ (tối đa 3 uid). */
  showcase: string[];
  /** Vật phẩm tiến hóa cực hiếm. */
  evoItems: Record<string, number>;
  /** Đội phòng thủ khi bị người khác thách Đấu Sinh Tử (3 uid, theo thứ tự). */
  defense: string[];
  /** Mã trận PvP đã áp dụng (chống áp dụng 2 lần). */
  pvpApplied: string[];
  /** Ngày (YYYY-MM-DD) đã hồi vé Boss gần nhất. */
  bossTicketDay: string;
  fishes: OwnedFish[];
  stats: {
    totalCaught: number;
    bossesCaught: number;
    escaped: number;
    snapped: number;
    heaviestKg: number;
    species: Record<string, number>;
    dmWins?: number;
    dmLosses?: number;
    /** Số rác đã vớt được. */
    junkCaught?: number;
    /** Số cá nướng nhân vật đã ăn. */
    roastedEaten?: number;
    /** Số lần quay Vòng Quay May Mắn. */
    spins?: number;
    /** Đua Cá: số cuộc đua đã nhận thưởng / số lần về nhất. */
    races?: number;
    raceWins?: number;
  };
  /** Nhiệm vụ ngày: mốc chỉ số đầu ngày + nhiệm vụ đã nhận thưởng + lượt quay miễn phí. */
  daily: { day: string; base: Partial<Record<string, number>>; claimed: string[]; freeSpinUsed: boolean };
  /** Điểm danh: ngày gần nhất, chuỗi ngày liên tiếp, tổng số ngày. */
  checkin: { lastDay: string; streak: number; total: number };
  /** Danh hiệu đã đạt + danh hiệu đang đeo. */
  titles: { owned: string[]; equipped: string | null };
  /** Câu tự động có hiệu lực đến thời điểm này (ms), 0 = chưa có. */
  autoFishUntil: number;
  ledger: LedgerEntry[];
  /** Mã giao dịch đã áp dụng – chống nhận thưởng trùng. */
  appliedTx: string[];
  createdAt: number;
  updatedAt: number;
  /** Thời điểm người chơi tự xoá tiến trình (chơi lại từ đầu) – máy chủ chỉ cho tụt cấp khi giá trị này đổi. */
  resetAt?: number;
  /** Đảo Lai Tạo: ổ ấp trứng + mốc thu hoạch của cá trong bể nuôi. */
  breeding?: BreedingState;
}

export interface GameCatalog {
  characters: CharacterDef[];
  rods: RodDef[];
  fishes: FishDef[];
  zones: ZoneDef[];
}

export function createNewSave(playerId: string, name: string, catalog: GameCatalog, now: number): PlayerSave {
  const starterChars = catalog.characters.filter((c) => c.unlock.kind === "starter");
  const starterRods = catalog.rods.filter((r) => r.unlock.kind === "starter");
  if (!starterChars[0] || !starterRods[0] || !catalog.zones[0]) throw new Error("Thiếu dữ liệu khởi đầu");
  return {
    version: SAVE_VERSION,
    playerId,
    name,
    level: 1,
    xp: 0,
    gold: ECONOMY.startingGold,
    diamonds: ECONOMY.startingDiamonds,
    selectedCharacterId: starterChars[0].id,
    selectedRodId: starterRods[0].id,
    selectedZoneId: catalog.zones[0].id,
    characters: Object.fromEntries(starterChars.map((c) => [c.id, newCharProgress()])),
    rods: Object.fromEntries(starterRods.map((r) => [r.id, newRodProgress()])),
    materials: { stones: 0, soul: 0, bossTickets: 3 },
    wardrobe: {},
    redeemedCodes: [],
    eco: { points: 0, junk: {}, recycled: 0 },
    claimedEvents: [],
    daily: { day: "", base: {}, claimed: [], freeSpinUsed: false },
    checkin: { lastDay: "", streak: 0, total: 0 },
    titles: { owned: [], equipped: null },
    autoFishUntil: 0,
    roasted: [],
    showcase: [],
    evoItems: {},
    defense: [],
    pvpApplied: [],
    bossTicketDay: "",
    fishes: [],
    stats: { totalCaught: 0, bossesCaught: 0, escaped: 0, snapped: 0, heaviestKg: 0, species: {} },
    ledger: [],
    appliedTx: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function newCharProgress(): CharProgress {
  return { level: 1, breakthrough: 0, awakened: false, equip: {} };
}
export function newRodProgress(): RodProgress {
  return { level: 1, stars: 1 };
}

export type ActionResult = { ok: true; save: PlayerSave } | { ok: false; error: string };

export function clone(save: PlayerSave): PlayerSave {
  return structuredClone(save);
}

export function addLedger(s: PlayerSave, txId: string, currency: LedgerEntry["currency"], amount: number, reason: string, at: number) {
  s.ledger.push({ txId, currency, amount, reason, at });
  if (s.ledger.length > 200) s.ledger.splice(0, s.ledger.length - 200);
}

export function markTx(s: PlayerSave, txId: string) {
  s.appliedTx.push(txId);
  if (s.appliedTx.length > 500) s.appliedTx.splice(0, s.appliedTx.length - 500);
}

/** Cộng XP, xử lý lên cấp. Trả về số cấp đã tăng. */
export function grantXp(s: PlayerSave, amount: number): number {
  let ups = 0;
  s.xp += Math.max(0, Math.round(amount));
  while (s.level < PROGRESSION.maxPlayerLevel && s.xp >= PROGRESSION.xpToNext(s.level)) {
    s.xp -= PROGRESSION.xpToNext(s.level);
    s.level += 1;
    ups += 1;
  }
  return ups;
}

export function fishSellPrice(fish: FishDef, weightKg: number, passives: PassiveEffect[] = []): number {
  const [min, max] = fish.weightKg;
  const ratio = max > min ? (weightKg - min) / (max - min) : 1;
  const gb = sumPassive(passives, "gold_bonus", (e) => e.value);
  return Math.round(fish.value * (1 - ECONOMY.sellWeightFactor + ECONOMY.sellWeightFactor * 2 * ratio) * (1 + gb));
}

/** Nguyên liệu rơi ra khi bắt cá, theo độ hiếm. */
export const MATERIAL_DROP: Record<FishDef["rarity"], { stones: number; soul: number; tickets: number }> = {
  common: { stones: 1, soul: 0, tickets: 0 },
  rare: { stones: 2, soul: 0, tickets: 0 },
  precious: { stones: 4, soul: 0, tickets: 0 },
  epic: { stones: 6, soul: 1, tickets: 0 },
  legendary: { stones: 12, soul: 3, tickets: 1 },
  mythic: { stones: 20, soul: 6, tickets: 1 },
  boss: { stones: 30, soul: 10, tickets: 0 },
};

/** Hệ số thưởng khi bắt Boss trong chế độ Săn Boss. */
export const BOSS_HUNT_MULTIPLIER = 1.5;

export function catchRewards(fish: FishDef, passives: PassiveEffect[], bossHunt = false) {
  const xb = sumPassive(passives, "xp_bonus", (e) => e.value);
  const gb = sumPassive(passives, "gold_bonus", (e) => e.value);
  const m = bossHunt ? BOSS_HUNT_MULTIPLIER : 1;
  const d = MATERIAL_DROP[fish.rarity];
  return {
    xp: Math.round(fish.xp * (1 + xb) * m),
    gold: Math.round(fish.value * 0.1 * (1 + gb) * m),
    stones: Math.round(d.stones * m),
    soul: Math.round(d.soul * m),
    tickets: d.tickets,
  };
}

export interface CatchInput {
  txId: string;
  fish: FishDef;
  weightKg: number;
  zoneId: string;
  /** Nguyên tố của khu câu (để gán hệ cho con cá). */
  zoneElement?: Element;
  passives: PassiveEffect[];
  now: number;
  bossHunt?: boolean;
}

export function applyCatch(save: PlayerSave, input: CatchInput): ActionResult & { levelUps?: number; diamonds?: number } {
  if (save.appliedTx.includes(input.txId)) return { ok: false, error: "Phần thưởng đã được nhận" };
  if (save.fishes.length >= ECONOMY.inventoryLimit) return { ok: false, error: "Kho cá đã đầy, hãy bán bớt cá" };
  const s = clone(save);
  const r = catchRewards(input.fish, input.passives, input.bossHunt);
  s.fishes.push({
    uid: input.txId,
    fishId: input.fish.id,
    element: elementOfCatch(input.fish, input.zoneElement),
    weightKg: input.weightKg,
    zoneId: input.zoneId,
    caughtAt: input.now,
    level: 1,
    stars: 1,
    locked: false,
  });
  const why = `catch:${input.fish.id}`;
  s.gold += r.gold;
  s.materials.stones += r.stones;
  s.materials.soul += r.soul;
  s.materials.bossTickets = Math.min(MAX_BOSS_TICKETS_STORED, s.materials.bossTickets + r.tickets);
  addLedger(s, input.txId, "gold", r.gold, why, input.now);
  addLedger(s, input.txId, "xp", r.xp, why, input.now);
  if (r.stones) addLedger(s, input.txId, "stones", r.stones, why, input.now);
  if (r.soul) addLedger(s, input.txId, "soul", r.soul, why, input.now);
  if (r.tickets) addLedger(s, input.txId, "bossTickets", r.tickets, why, input.now);
  const levelUps = grantXp(s, r.xp);
  const firstOfSpecies = !s.stats.species[input.fish.id];
  const gems =
    levelUps * DIAMOND_REWARDS.levelUp +
    (firstOfSpecies ? DIAMOND_REWARDS.newSpecies : 0) +
    (input.fish.rarity === "boss" ? DIAMOND_REWARDS.boss : 0);
  if (gems > 0) {
    s.diamonds += gems;
    addLedger(s, input.txId, "diamonds", gems, levelUps ? `level_up:${s.level}` : why, input.now);
  }
  s.stats.totalCaught += 1;
  if (input.fish.rarity === "boss") s.stats.bossesCaught += 1;
  s.stats.heaviestKg = Math.max(s.stats.heaviestKg, input.weightKg);
  s.stats.species[input.fish.id] = (s.stats.species[input.fish.id] ?? 0) + 1;
  markTx(s, input.txId);
  s.updatedAt = input.now;
  return { ok: true, save: s, levelUps, diamonds: gems };
}

export function recordFail(save: PlayerSave, kind: "escaped" | "snapped", now: number): PlayerSave {
  const s = clone(save);
  s.stats[kind] += 1;
  s.updatedAt = now;
  return s;
}

export function sellFishes(
  save: PlayerSave,
  uids: string[],
  fishById: Map<string, FishDef>,
  txId: string,
  now: number,
): ActionResult & { gold?: number } {
  if (save.appliedTx.includes(txId)) return { ok: false, error: "Giao dịch trùng lặp" };
  const set = new Set(uids);
  if (set.size === 0) return { ok: false, error: "Chưa chọn cá" };
  const s = clone(save);
  let total = 0;
  const remain: OwnedFish[] = [];
  for (const f of s.fishes) {
    if (set.has(f.uid)) {
      if (f.locked) return { ok: false, error: "Không thể bán cá đang khóa" };
      const def = fishById.get(f.fishId);
      if (!def) return { ok: false, error: `Dữ liệu cá không hợp lệ: ${f.fishId}` };
      total += fishSellPrice(def, f.weightKg);
      set.delete(f.uid);
    } else remain.push(f);
  }
  if (set.size > 0) return { ok: false, error: "Có cá không thuộc sở hữu" };
  s.fishes = remain;
  s.gold += total;
  addLedger(s, txId, "gold", total, `sell:${uids.length}`, now);
  markTx(s, txId);
  s.updatedAt = now;
  return { ok: true, save: s, gold: total };
}

export function canUnlock(save: PlayerSave, cond: UnlockCondition): { ok: boolean; reason: string } {
  switch (cond.kind) {
    case "starter":
      return { ok: true, reason: "Khởi đầu" };
    case "level":
      return save.level >= cond.level
        ? { ok: true, reason: `Đạt cấp ${cond.level}` }
        : { ok: false, reason: `Cần đạt cấp ${cond.level}` };
    case "gold": {
      if (cond.level && save.level < cond.level) return { ok: false, reason: `Cần cấp ${cond.level}` };
      return save.gold >= cond.amount
        ? { ok: true, reason: `${cond.amount} vàng` }
        : { ok: false, reason: `Cần ${cond.amount} vàng` };
    }
    case "gacha":
      return { ok: false, reason: "Nhận từ Vòng Quay" };
    case "event":
      return { ok: false, reason: "Phần thưởng sự kiện" };
    case "code":
      return { ok: false, reason: "Nhập mã quà tặng để nhận" };
  }
}

export function unlockItem(
  save: PlayerSave,
  kind: "characters" | "rods",
  id: string,
  cond: UnlockCondition,
  txId: string,
  now: number,
): ActionResult {
  if (save[kind][id]) return { ok: false, error: "Đã sở hữu" };
  if (save.appliedTx.includes(txId)) return { ok: false, error: "Giao dịch trùng lặp" };
  const chk = canUnlock(save, cond);
  if (!chk.ok) return { ok: false, error: chk.reason };
  const s = clone(save);
  if (cond.kind === "gold") {
    s.gold -= cond.amount;
    addLedger(s, txId, "gold", -cond.amount, `unlock:${kind}:${id}`, now);
  }
  if (kind === "characters") s.characters[id] = newCharProgress();
  else s.rods[id] = newRodProgress();
  markTx(s, txId);
  s.updatedAt = now;
  return { ok: true, save: s };
}

export function isZoneUnlocked(save: PlayerSave, zone: ZoneDef): boolean {
  return save.level >= zone.requiredLevel;
}

/** Lực chiến của một loài cá – dùng thống nhất ở mọi nơi (UI, bảng xếp hạng, PvP). */
export function fishPower(f: Pick<FishDef, "hp" | "atk" | "def" | "spd">): number {
  return Math.round(f.hp / 10 + f.atk * 2 + f.def * 1.5 + f.spd);
}
