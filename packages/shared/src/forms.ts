/**
 * Thể tiến hóa đột biến: vật phẩm cực hiếm rơi khi bắt cá, dùng để biến cá sang thể mới.
 */
import { FISHING } from "@dccc/game-config";
import type { FishDef, FishFormDef } from "./types.ts";
import type { Rng } from "./rng.ts";
import { clone, markTx, type ActionResult, type PlayerSave } from "./save.ts";

/** Có rơi vật phẩm tiến hóa không. Boss có tỉ lệ ×3. */
export function rollEvoDrop(rng: Rng, forms: FishFormDef[], isBoss: boolean): FishFormDef | null {
  const k = isBoss ? 3 : 1;
  if (rng.chance(FISHING.divineDropChance * k)) return forms.find((f) => f.divine) ?? null;
  if (!rng.chance(FISHING.evoDropChance * k)) return null;
  const normal = forms.filter((f) => !f.divine && f.dropWeight > 0);
  return normal.length ? rng.pickWeighted(normal, (f) => f.dropWeight) : null;
}

export function grantEvoItem(save: PlayerSave, itemId: string, txId: string, now: number): ActionResult {
  if (save.appliedTx.includes(txId)) return { ok: false, error: "Giao dịch trùng lặp" };
  const s = clone(save);
  s.evoItems[itemId] = (s.evoItems[itemId] ?? 0) + 1;
  markTx(s, txId);
  s.updatedAt = now;
  return { ok: true, save: s };
}

/**
 * Tiến hóa cá Boss sang thể mới (tốn 1 vật phẩm dù thành công hay thất bại).
 * `roll` ∈ [0,1) lấy từ RNG có seed; thành công khi roll < form.successRate (tỉ lệ ẩn).
 */
export function applyForm(
  save: PlayerSave,
  uid: string,
  form: FishFormDef,
  txId: string,
  now: number,
  fishById: Map<string, FishDef>,
  roll: number,
): ActionResult & { success?: boolean } {
  if (save.appliedTx.includes(txId)) return { ok: false, error: "Giao dịch trùng lặp" };
  const o = save.fishes.find((f) => f.uid === uid);
  if (!o) return { ok: false, error: "Không tìm thấy cá" };
  if (fishById.get(o.fishId)?.rarity !== "boss") return { ok: false, error: "Chỉ cá Boss mới có thể tiến hóa thể đột biến" };
  if (o.form === form.id) return { ok: false, error: `Cá đã ở thể ${form.name}` };
  if ((save.evoItems[form.itemId] ?? 0) < 1) return { ok: false, error: `Cần 1 ${form.itemName} – vật phẩm cực hiếm khi câu cá` };
  const s = clone(save);
  s.evoItems[form.itemId]! -= 1;
  if (s.evoItems[form.itemId] === 0) delete s.evoItems[form.itemId];
  const success = roll < form.successRate;
  if (success) s.fishes.find((f) => f.uid === uid)!.form = form.id;
  markTx(s, txId);
  s.updatedAt = now;
  return { ok: true, save: s, success };
}
