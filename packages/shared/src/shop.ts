/**
 * Cửa hàng & tủ đồ (quần áo, trang sức). Hàm thuần túy, có txId + sổ ghi.
 * Giai đoạn 4: chạy trên server; giao dịch giữa người chơi cũng dùng các hàm
 * chuyển quyền sở hữu tương tự nhưng do server thực hiện nguyên tử.
 */
import type { CosmeticDef, CosmeticSlot, PassiveEffect, ShopItemDef } from "./types.ts";
import { addLedger, clone, markTx, type ActionResult, type PlayerSave } from "./save.ts";

/** Tỷ lệ hoàn tiền khi bán lại đồ cho cửa hàng. */
export const SELL_BACK_RATE = 0.5;
/** Tối đa mỗi món trong tủ đồ. */
export const MAX_COSMETIC_COPIES = 12;

function canPay(s: PlayerSave, p: { currency: "gold" | "diamonds"; amount: number }): string | null {
  const have = p.currency === "gold" ? s.gold : s.diamonds;
  if (have < p.amount) return p.currency === "gold" ? `Cần ${p.amount.toLocaleString("vi-VN")} vàng` : `Cần ${p.amount} kim cương`;
  return null;
}

function charge(s: PlayerSave, p: { currency: "gold" | "diamonds"; amount: number }, txId: string, reason: string, now: number) {
  if (p.currency === "gold") s.gold -= p.amount;
  else s.diamonds -= p.amount;
  addLedger(s, txId, p.currency, -p.amount, reason, now);
}

export function buyCosmetic(save: PlayerSave, item: CosmeticDef, txId: string, now: number): ActionResult {
  if (save.appliedTx.includes(txId)) return { ok: false, error: "Giao dịch trùng lặp" };
  if ((save.wardrobe[item.id] ?? 0) >= MAX_COSMETIC_COPIES) return { ok: false, error: "Tủ đồ đã đủ món này" };
  const err = canPay(save, item.price);
  if (err) return { ok: false, error: err };
  const s = clone(save);
  charge(s, item.price, txId, `buy_cosmetic:${item.id}`, now);
  s.wardrobe[item.id] = (s.wardrobe[item.id] ?? 0) + 1;
  markTx(s, txId);
  s.updatedAt = now;
  return { ok: true, save: s };
}

export function buyShopItem(save: PlayerSave, item: ShopItemDef, txId: string, now: number): ActionResult {
  if (save.appliedTx.includes(txId)) return { ok: false, error: "Giao dịch trùng lặp" };
  const err = canPay(save, item.price);
  if (err) return { ok: false, error: err };
  const s = clone(save);
  charge(s, item.price, txId, `buy_item:${item.id}`, now);
  const g = item.grant;
  const why = `buy_item:${item.id}`;
  if (g.stones) {
    s.materials.stones += g.stones;
    addLedger(s, txId, "stones", g.stones, why, now);
  }
  if (g.soul) {
    s.materials.soul += g.soul;
    addLedger(s, txId, "soul", g.soul, why, now);
  }
  if (g.bossTickets) {
    s.materials.bossTickets = Math.min(99, s.materials.bossTickets + g.bossTickets);
    addLedger(s, txId, "bossTickets", g.bossTickets, why, now);
  }
  if (g.gold) {
    s.gold += g.gold;
    addLedger(s, txId, "gold", g.gold, why, now);
  }
  markTx(s, txId);
  s.updatedAt = now;
  return { ok: true, save: s };
}

/** Số món đang được nhân vật mặc. */
export function equippedCount(save: PlayerSave, itemId: string): number {
  let n = 0;
  for (const c of Object.values(save.characters)) for (const v of Object.values(c.equip)) if (v === itemId) n++;
  return n;
}

export function freeCopies(save: PlayerSave, itemId: string): number {
  return (save.wardrobe[itemId] ?? 0) - equippedCount(save, itemId);
}

export function sellCosmetic(save: PlayerSave, item: CosmeticDef, txId: string, now: number): ActionResult & { refund?: number } {
  if (save.appliedTx.includes(txId)) return { ok: false, error: "Giao dịch trùng lặp" };
  if (freeCopies(save, item.id) < 1) return { ok: false, error: "Không có món rảnh để bán (hãy tháo ra trước)" };
  const s = clone(save);
  const refund = Math.floor(item.price.amount * SELL_BACK_RATE);
  s.wardrobe[item.id] = (s.wardrobe[item.id] ?? 0) - 1;
  if (s.wardrobe[item.id] === 0) delete s.wardrobe[item.id];
  if (item.price.currency === "gold") s.gold += refund;
  else s.diamonds += refund;
  addLedger(s, txId, item.price.currency, refund, `sell_cosmetic:${item.id}`, now);
  markTx(s, txId);
  s.updatedAt = now;
  return { ok: true, save: s, refund };
}

/** Mặc (itemId) hoặc tháo (null) đồ ở một ô cho nhân vật. */
export function equipCosmetic(
  save: PlayerSave,
  charId: string,
  slot: CosmeticSlot,
  item: CosmeticDef | null,
  now: number,
): ActionResult {
  const cp = save.characters[charId];
  if (!cp) return { ok: false, error: "Chưa sở hữu nhân vật này" };
  if (item) {
    if (item.slot !== slot) return { ok: false, error: "Sai ô trang bị" };
    if (cp.equip[slot] !== item.id && freeCopies(save, item.id) < 1) return { ok: false, error: "Không còn món rảnh – nhân vật khác đang mặc" };
  }
  const s = clone(save);
  if (item) s.characters[charId]!.equip[slot] = item.id;
  else delete s.characters[charId]!.equip[slot];
  s.updatedAt = now;
  return { ok: true, save: s };
}

/** Chỉ số phụ từ đồ đang mặc. */
export function equipmentPassives(equip: Partial<Record<CosmeticSlot, string>>, byId: Map<string, CosmeticDef>): PassiveEffect[] {
  return Object.values(equip).flatMap((id) => (id ? (byId.get(id)?.bonus ?? []) : []));
}
