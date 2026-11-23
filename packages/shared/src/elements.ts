/**
 * HỆ THỐNG 7 NGUYÊN TỐ – nguồn sự thật duy nhất cho khắc chế (game & máy chủ dùng chung).
 *  Kim khắc Mộc · Mộc khắc Thổ · Thổ khắc Thủy · Thủy khắc Hỏa · Hỏa khắc Kim · Bóng tối ⇄ Ánh sáng.
 *  BÓNG TỐI & ÁNH SÁNG ÁP CHẾ 5 HỆ TỰ NHIÊN (Kim, Mộc, Thủy, Hỏa, Thổ): đánh hệ tự nhiên ×1.5, bị hệ tự nhiên đánh ×0.75.
 *  Khắc chế ×1.5 · Bình thường ×1.0 · Bị khắc ×0.75.
 */
import type { Element, FishDef, ZoneDef } from "./types.ts";
import type { OwnedFish, PlayerSave } from "./save.ts";

export const ELEMENT_IDS: readonly Element[] = ["metal", "wood", "water", "fire", "earth", "dark", "light"];

/** att khắc được các hệ trong danh sách. */
export const ELEMENT_BEATS: Record<Element, Element[]> = {
  metal: ["wood"],
  wood: ["earth"],
  earth: ["water"],
  water: ["fire"],
  fire: ["metal"],
  // Bóng tối & Ánh sáng: khắc lẫn nhau + áp chế mọi hệ tự nhiên
  dark: ["light", "metal", "wood", "water", "fire", "earth"],
  light: ["dark", "metal", "wood", "water", "fire", "earth"],
};

export const ELEMENT_STRONG = 1.5;
export const ELEMENT_NORMAL = 1.0;
export const ELEMENT_WEAK = 0.75;

export type MatchupKind = "strong" | "normal" | "weak";
export const MATCHUP_LABEL: Record<MatchupKind, string> = { strong: "KHẮC CHẾ!", normal: "BÌNH THƯỜNG.", weak: "BẤT LỢI!" };

/**
 * Hệ số khi cá hệ `att` đánh cá hệ `def`.
 * (Bóng tối và Ánh sáng khắc lẫn nhau: hai bên đều được ×1.5 khi đánh nhau.)
 */
export function elementMatchup(att: Element, def: Element): { mult: number; kind: MatchupKind; label: string } {
  const kind: MatchupKind = ELEMENT_BEATS[att].includes(def) ? "strong" : ELEMENT_BEATS[def].includes(att) ? "weak" : "normal";
  return { mult: kind === "strong" ? ELEMENT_STRONG : kind === "weak" ? ELEMENT_WEAK : ELEMENT_NORMAL, kind, label: MATCHUP_LABEL[kind] };
}

/**
 * Khắc hệ khi cá có NHIỀU hệ (cá lai 2 hệ, Gen Lặn thêm 1 hệ ẩn):
 * mỗi hệ bên đánh nhân hệ số với TẤT CẢ hệ bên bị đánh, chọn hệ có lợi nhất; kết quả giữ trong [×0.75, ×1.5].
 */
export function multiMatchup(att: readonly Element[], def: readonly Element[]): { mult: number; kind: MatchupKind; label: string } {
  let best = -Infinity;
  for (const a of att) {
    let m = 1;
    for (const d of def) m *= elementMatchup(a, d).mult;
    best = Math.max(best, m);
  }
  const mult = Math.min(ELEMENT_STRONG, Math.max(ELEMENT_WEAK, best === -Infinity ? 1 : best));
  const kind: MatchupKind = mult > 1.0001 ? "strong" : mult < 0.9999 ? "weak" : "normal";
  return { mult: Math.round(mult * 1000) / 1000, kind, label: MATCHUP_LABEL[kind] };
}

/** Các hệ HIỆN của cá đang sở hữu (cá lai: 2 hệ bố mẹ; cá thường: 1 hệ). */
export function ownedElements(
  o: Pick<OwnedFish, "element" | "elements" | "zoneId">,
  fish: Pick<FishDef, "element" | "elementFixed">,
  zoneById: Map<string, Pick<ZoneDef, "element">>,
): Element[] {
  if (o.elements?.length) return [...o.elements];
  return [ownedElement(o, fish, zoneById)];
}

export function isElement(x: unknown): x is Element {
  return typeof x === "string" && (ELEMENT_IDS as readonly string[]).includes(x);
}

/** Hệ của con cá vừa câu: loài hệ cố định → theo loài; còn lại → theo khu câu. */
export function elementOfCatch(fish: Pick<FishDef, "element" | "elementFixed">, zoneElement?: Element): Element {
  return fish.elementFixed || !zoneElement ? fish.element : zoneElement;
}

/** Hệ của một con cá đang sở hữu (đã lưu → dùng; chưa lưu → suy theo khu câu). */
export function ownedElement(o: Pick<OwnedFish, "element" | "zoneId">, fish: Pick<FishDef, "element" | "elementFixed">, zoneById?: Map<string, Pick<ZoneDef, "element">>): Element {
  // loài hệ cố định: luôn đúng 1 hệ của loài (kể cả khi bản lưu ghi khác)
  if (fish.elementFixed) return fish.element;
  if (o.element && isElement(o.element)) return o.element;
  return elementOfCatch(fish, zoneById?.get(o.zoneId)?.element);
}

/**
 * Chuyển đổi bản lưu cũ: gán hệ cho mọi con cá chưa có hệ hợp lệ theo QUY TẮC KHU CÂU (minh bạch, tất định);
 * loài hệ cố định luôn được đặt đúng hệ của loài. Trả về số con được gán / sửa.
 */
export function assignMissingElements(save: PlayerSave, fishById: Map<string, Pick<FishDef, "element" | "elementFixed">>, zoneById: Map<string, Pick<ZoneDef, "element">>): number {
  let n = 0;
  for (const o of save.fishes) {
    const f = fishById.get(o.fishId);
    if (!f) continue;
    // đã có hệ hợp lệ (và loài không cố định / đã đúng hệ loài) → giữ nguyên
    if (o.element && isElement(o.element) && (!f.elementFixed || o.element === f.element)) continue;
    o.element = ownedElement({ zoneId: o.zoneId }, f, zoneById);
    n++;
  }
  return n;
}
