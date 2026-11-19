import { ECONOMY, PROGRESSION } from "@dccc/game-config";
import type { CharacterDef, FishDef, PassiveEffect, RodDef, UnlockCondition, ZoneDef } from "./types.ts";
import { sumPassive } from "./loadout.ts";

export const SAVE_VERSION = 1;

export interface OwnedFish {
  uid: string;
  fishId: string;
  weightKg: number;
  zoneId: string;
  caughtAt: number;
  level: number;
}

export interface LedgerEntry {
  txId: string;
  currency: "gold" | "diamonds" | "xp";
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
  characters: Record<string, { level: number }>;
  rods: Record<string, { level: number }>;
  fishes: OwnedFish[];
  stats: {
    totalCaught: number;
    bossesCaught: number;
    escaped: number;
    snapped: number;
    heaviestKg: number;
    species: Record<string, number>;
  };
  ledger: LedgerEntry[];
  /** Mã giao dịch đã áp dụng – chống nhận thưởng trùng. */
  appliedTx: string[];
  createdAt: number;
  updatedAt: number;
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
    characters: Object.fromEntries(starterChars.map((c) => [c.id, { level: 1 }])),
    rods: Object.fromEntries(starterRods.map((r) => [r.id, { level: 1 }])),
    fishes: [],
    stats: { totalCaught: 0, bossesCaught: 0, escaped: 0, snapped: 0, heaviestKg: 0, species: {} },
    ledger: [],
    appliedTx: [],
    createdAt: now,
    updatedAt: now,
  };
}

export type ActionResult = { ok: true; save: PlayerSave } | { ok: false; error: string };

function clone(save: PlayerSave): PlayerSave {
  return structuredClone(save);
}

function addLedger(s: PlayerSave, txId: string, currency: LedgerEntry["currency"], amount: number, reason: string, at: number) {
  s.ledger.push({ txId, currency, amount, reason, at });
  if (s.ledger.length > 200) s.ledger.splice(0, s.ledger.length - 200);
}

function markTx(s: PlayerSave, txId: string) {
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

export function catchRewards(fish: FishDef, passives: PassiveEffect[]) {
  const xb = sumPassive(passives, "xp_bonus", (e) => e.value);
  const gb = sumPassive(passives, "gold_bonus", (e) => e.value);
  return {
    xp: Math.round(fish.xp * (1 + xb)),
    gold: Math.round(fish.value * 0.1 * (1 + gb)),
  };
}

export interface CatchInput {
  txId: string;
  fish: FishDef;
  weightKg: number;
  zoneId: string;
  passives: PassiveEffect[];
  now: number;
}

export function applyCatch(save: PlayerSave, input: CatchInput): ActionResult & { levelUps?: number } {
  if (save.appliedTx.includes(input.txId)) return { ok: false, error: "Phần thưởng đã được nhận" };
  if (save.fishes.length >= ECONOMY.inventoryLimit) return { ok: false, error: "Kho cá đã đầy, hãy bán bớt cá" };
  const s = clone(save);
  const r = catchRewards(input.fish, input.passives);
  s.fishes.push({
    uid: input.txId,
    fishId: input.fish.id,
    weightKg: input.weightKg,
    zoneId: input.zoneId,
    caughtAt: input.now,
    level: 1,
  });
  s.gold += r.gold;
  addLedger(s, input.txId, "gold", r.gold, `catch:${input.fish.id}`, input.now);
  addLedger(s, input.txId, "xp", r.xp, `catch:${input.fish.id}`, input.now);
  const levelUps = grantXp(s, r.xp);
  s.stats.totalCaught += 1;
  if (input.fish.rarity === "boss") s.stats.bossesCaught += 1;
  s.stats.heaviestKg = Math.max(s.stats.heaviestKg, input.weightKg);
  s.stats.species[input.fish.id] = (s.stats.species[input.fish.id] ?? 0) + 1;
  markTx(s, input.txId);
  s.updatedAt = input.now;
  return { ok: true, save: s, levelUps };
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
  s[kind][id] = { level: 1 };
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
