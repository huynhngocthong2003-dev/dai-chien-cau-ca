/**
 * Thể tiến hóa đột biến: vật phẩm cực hiếm rơi khi bắt cá, dùng để biến cá sang thể mới.
 */
import { FISHING } from "@dccc/game-config";
import type { EvoItemDef, FishDef, FishFormDef } from "./types.ts";
import type { Rng } from "./rng.ts";
import { clone, markTx, type ActionResult, type FormRoll, type PlayerSave } from "./save.ts";

/** Có rơi vật phẩm đột biến không (rất hiếm). Boss có tỉ lệ ×3. */
export function rollEvoDrop(rng: Rng, items: EvoItemDef[], isBoss: boolean): EvoItemDef | null {
  const k = isBoss ? 3 : 1;
  if (rng.chance(FISHING.divineDropChance * k)) return items.find((f) => f.divine) ?? null;
  if (!rng.chance(FISHING.evoDropChance * k)) return null;
  const normal = items.filter((f) => !f.divine && f.dropWeight > 0);
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

/** Độ hiếm được phép đột biến. */
export const EVOLVABLE_RARITIES = ["legendary", "mythic", "boss"] as const;
export function canEvolveForm(f: FishDef | undefined | null): boolean {
  return !!f && (EVOLVABLE_RARITIES as readonly string[]).includes(f.rarity);
}

export const FORM_ROLL_MIN = 0.8;
export const FORM_ROLL_MAX = 1.5;
export const FORM_SURGE_CHANCE = 0.12;

/**
 * Hệ số tăng ngẫu nhiên cho từng chỉ số (0,8–1,5 lần phần tăng của thể).
 * 12% "ĐỘT BIẾN VƯỢT BẬC": một chỉ số nhận hệ số 1,8–2,4.
 */
export function rollFormBoost(rng: Rng): { roll: FormRoll; surge: keyof FormRoll | null } {
  const r = () => Math.round((FORM_ROLL_MIN + rng.next() * (FORM_ROLL_MAX - FORM_ROLL_MIN)) * 100) / 100;
  const roll: FormRoll = { hp: r(), atk: r(), def: r() };
  let surge: keyof FormRoll | null = null;
  if (rng.chance(FORM_SURGE_CHANCE)) {
    surge = (["hp", "atk", "def"] as const)[rng.int(0, 2)]!;
    roll[surge] = Math.round((1.8 + rng.next() * 0.6) * 100) / 100;
  }
  return { roll, surge };
}

/**
 * Đột biến cá Boss bằng 1 vật phẩm – LUÔN THÀNH CÔNG. Cá biến thành 1 trong các dạng của vật phẩm đó
 * (chọn bằng `roll` ∈ [0,1) từ RNG có seed). Nếu cá đang ở một dạng của chính vật phẩm này thì ra dạng khác.
 */
export function applyForm(
  save: PlayerSave,
  uid: string,
  item: EvoItemDef,
  variants: FishFormDef[],
  txId: string,
  now: number,
  fishById: Map<string, FishDef>,
  rng: Rng,
): ActionResult & { form?: FishFormDef; roll?: FormRoll; surge?: keyof FormRoll | null } {
  if (save.appliedTx.includes(txId)) return { ok: false, error: "Giao dịch trùng lặp" };
  const o = save.fishes.find((f) => f.uid === uid);
  if (!o) return { ok: false, error: "Không tìm thấy cá" };
  if (!canEvolveForm(fishById.get(o.fishId))) return { ok: false, error: "Chỉ cá Huyền Thoại, Thần Thoại và Boss mới đột biến được" };
  if (o.form) return { ok: false, error: "Cá đã tiến hoá hệ – không đổi sang dạng khác được nữa. Hãy cho cá trưởng thành theo giai" };
  if ((save.evoItems[item.id] ?? 0) < 1) return { ok: false, error: `Cần 1 ${item.name} – vật phẩm cực hiếm khi câu cá` };
  const own = variants.filter((v) => v.itemId === item.id);
  if (!own.length) return { ok: false, error: "Vật phẩm này chưa có dạng đột biến" };
  // dạng hiếm hơn có trọng số thấp hơn (Thường 45% … Thần Thoại 3%)
  const form = own.some((v) => v.weight) ? rng.pickWeighted(own, (v) => v.weight ?? 1) : own[rng.int(0, own.length - 1)]!;
  const { roll, surge } = rollFormBoost(rng);
  const s = clone(save);
  s.evoItems[item.id]! -= 1;
  if (s.evoItems[item.id] === 0) delete s.evoItems[item.id];
  const t = s.fishes.find((f) => f.uid === uid)!;
  t.form = form.id;
  t.formRoll = roll;
  // Bộ Sưu Tập: mở khoá dạng đột biến này của loài
  const key = formSeenKey(t.fishId, form.id);
  s.stats.formsSeen = [...new Set([...(s.stats.formsSeen ?? []), key])];
  markTx(s, txId);
  s.updatedAt = now;
  return { ok: true, save: s, form, roll, surge };
}

/** Khoá "loài|dạng" trong danh sách dạng đột biến đã mở (Bộ Sưu Tập). */
export function formSeenKey(fishId: string, formId: string): string {
  return `${fishId}|${formId}`;
}

/** Dạng đột biến đã mở của loài: đã ghi nhận khi đột biến, hoặc đang có cá mang dạng đó (bản lưu cũ). */
export function formSeen(save: Pick<PlayerSave, "stats" | "fishes">, fishId: string, formId: string): boolean {
  return (save.stats.formsSeen ?? []).includes(formSeenKey(fishId, formId)) || save.fishes.some((o) => o.fishId === fishId && o.form === formId);
}
