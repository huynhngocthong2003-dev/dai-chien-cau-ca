/**
 * Quà đính kèm thư Hòm Thư (đền bù, sự kiện, Boss Thế Giới…). Người chơi bấm "Nhận" mới cộng vào tiến trình.
 * Mỗi gói quà có txId riêng → cộng đúng 1 lần dù bấm nhiều lần / trên nhiều máy (appliedTx đồng bộ theo tài khoản).
 */
import type { FishDef } from "./types.ts";
import { addLedger, clone, markTx, type ActionResult, type FormRoll, type OwnedFish, type PlayerSave } from "./save.ts";

export interface MailFish {
  fishId: string;
  weightKg: number;
  zoneId: string;
  stars?: number;
  level?: number;
  form?: string;
  formRoll?: FormRoll;
}

export interface MailReward {
  /** Mã giao dịch của gói quà (chống nhận trùng). */
  txId: string;
  gold?: number;
  diamonds?: number;
  stones?: number;
  soul?: number;
  /** Đá Tiến Hoá / vật phẩm: id → số lượng. */
  evoItems?: Record<string, number>;
  fishes?: MailFish[];
}

/** Giới hạn mỗi gói (chặn dữ liệu bất thường). */
const LIMIT = { gold: 10_000_000, diamonds: 100_000, stones: 100_000, soul: 100_000, item: 100, fishes: 10 };

export function mailRewardEmpty(r: MailReward | null | undefined): boolean {
  if (!r) return true;
  return !r.gold && !r.diamonds && !r.stones && !r.soul && !Object.keys(r.evoItems ?? {}).length && !(r.fishes ?? []).length;
}

/** Đã nhận gói quà này chưa (theo tiến trình hiện tại). */
export function mailRewardClaimed(save: PlayerSave, r: MailReward): boolean {
  return save.appliedTx.includes(r.txId);
}

export function applyMailReward(
  save: PlayerSave,
  r: MailReward,
  fishById: Map<string, FishDef>,
  evoItemIds: Set<string>,
  newUid: () => string,
  now: number,
  maxFishes = 200,
): ActionResult {
  if (!r.txId || !/^[a-z0-9_]{3,64}$/i.test(r.txId)) return { ok: false, error: "Mã quà không hợp lệ" };
  if (save.appliedTx.includes(r.txId)) return { ok: false, error: "Bạn đã nhận quà này rồi" };
  const n = (v: number | undefined, max: number) => (v === undefined ? 0 : Number.isInteger(v) && v >= 0 && v <= max ? v : NaN);
  const gold = n(r.gold, LIMIT.gold);
  const diamonds = n(r.diamonds, LIMIT.diamonds);
  const stones = n(r.stones, LIMIT.stones);
  const soul = n(r.soul, LIMIT.soul);
  if ([gold, diamonds, stones, soul].some(Number.isNaN)) return { ok: false, error: "Quà không hợp lệ" };
  const items = Object.entries(r.evoItems ?? {});
  if (items.some(([id, k]) => !evoItemIds.has(id) || !Number.isInteger(k) || k < 1 || k > LIMIT.item)) return { ok: false, error: "Vật phẩm trong quà không hợp lệ" };
  const fishes = r.fishes ?? [];
  if (fishes.length > LIMIT.fishes || fishes.some((f) => !fishById.has(f.fishId) || !(f.weightKg > 0))) return { ok: false, error: "Cá trong quà không hợp lệ" };
  if (save.fishes.length + fishes.length > maxFishes) return { ok: false, error: `Kho cá đầy – hãy bán bớt ${save.fishes.length + fishes.length - maxFishes} con rồi nhận quà` };
  const s = clone(save);
  const why = `mail:${r.txId}`;
  if (gold) {
    s.gold += gold;
    addLedger(s, r.txId, "gold", gold, why, now);
  }
  if (diamonds) {
    s.diamonds += diamonds;
    addLedger(s, r.txId, "diamonds", diamonds, why, now);
  }
  if (stones) {
    s.materials.stones += stones;
    addLedger(s, r.txId, "stones", stones, why, now);
  }
  if (soul) {
    s.materials.soul += soul;
    addLedger(s, r.txId, "soul", soul, why, now);
  }
  for (const [id, k] of items) s.evoItems[id] = (s.evoItems[id] ?? 0) + k;
  for (const f of fishes) {
    const o: OwnedFish = {
      uid: newUid(),
      fishId: f.fishId,
      weightKg: Math.round(f.weightKg * 100) / 100,
      zoneId: f.zoneId,
      caughtAt: now,
      level: Math.max(1, Math.min(50, f.level ?? 1)),
      stars: Math.max(1, Math.min(5, f.stars ?? 1)),
      locked: true,
      ...(f.form ? { form: f.form } : {}),
      ...(f.formRoll ? { formRoll: f.formRoll } : {}),
    };
    s.fishes.push(o);
    s.stats.species[f.fishId] = (s.stats.species[f.fishId] ?? 0) + 1;
  }
  markTx(s, r.txId);
  s.updatedAt = now;
  return { ok: true, save: s };
}
