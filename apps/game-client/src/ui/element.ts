import Phaser from "phaser";
import { ELEMENT_INFO } from "@dccc/game-config";
import { FISH_BY_ID, ZONE_BY_ID } from "@dccc/game-data";
import { ownedElement, ownedElements, type Element, type FishDef, type OwnedFish } from "@dccc/shared";
import { elementTexture } from "../art/textures.ts";
import { txt } from "./widgets.ts";

/** Huy hiệu nguyên tố (hình thống nhất mọi màn). */
export function elementBadge(scene: Phaser.Scene, x: number, y: number, el: Element, size = 32): Phaser.GameObjects.Image {
  return scene.add.image(x, y, elementTexture(scene, el)).setDisplaySize(size, size);
}

/** Huy hiệu + tên hệ ("Kim", "Mộc"…), canh trái từ x. */
export function elementTag(scene: Phaser.Scene, x: number, y: number, el: Element, size = 30, fontSize = 18): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  c.add(elementBadge(scene, size / 2, 0, el, size));
  c.add(txt(scene, size + 6, 0, `Hệ ${ELEMENT_INFO[el].name}`, fontSize, { color: ELEMENT_INFO[el].color }).setOrigin(0, 0.5));
  return c;
}

/** Hệ của một con cá đang sở hữu (theo khu câu). */
export function fishElementOf(o: Pick<OwnedFish, "element" | "zoneId" | "fishId">, f?: FishDef): Element {
  const def = f ?? FISH_BY_ID.get(o.fishId)!;
  return ownedElement(o, def, ZONE_BY_ID);
}

/** Bộ hệ của 1 con cá: hệ hiện (1–2) + hệ ẩn (cá Gen Lặn). */
export interface ElementSet {
  els: Element[];
  hidden?: Element;
}

export function fishElementSet(o: Pick<OwnedFish, "element" | "elements" | "hiddenElement" | "zoneId" | "fishId">, f?: FishDef): ElementSet {
  const def = f ?? FISH_BY_ID.get(o.fishId)!;
  return { els: ownedElements(o, def, ZONE_BY_ID), hidden: o.hiddenElement };
}

/**
 * Nhiều huy hiệu hệ xếp từ PHẢI sang TRÁI bắt đầu ở (x, y).
 * Hệ ẩn: chủ cá thấy mờ kèm chữ "ẩn" (`reveal`), người khác thấy dấu "?".
 */
export function elementBadges(scene: Phaser.Scene, x: number, y: number, set: ElementSet | Element, size = 28, reveal = true): Phaser.GameObjects.Container {
  const s: ElementSet = typeof set === "string" ? { els: [set] } : set;
  const c = scene.add.container(x, y);
  const step = size * 0.92;
  let i = 0;
  if (s.hidden) {
    if (reveal) {
      c.add(elementBadge(scene, -i * step, 0, s.hidden, size).setAlpha(0.55));
      c.add(txt(scene, -i * step, size * 0.42, "ẩn", Math.max(10, size * 0.38), { align: "center", color: "#e1bee7" }).setOrigin(0.5));
    } else {
      const g = scene.add.graphics();
      g.fillStyle(0x4a148c, 1).fillCircle(-i * step, 0, size / 2).lineStyle(3, 0x1b1530).strokeCircle(-i * step, 0, size / 2);
      c.add(g);
      c.add(txt(scene, -i * step, 1, "?", size * 0.62, { align: "center", color: "#ffffff" }).setOrigin(0.5));
    }
    i++;
  }
  for (const el of [...s.els].reverse()) c.add(elementBadge(scene, -(i++) * step, 0, el, size));
  return c;
}

/** Huy hiệu + tên các hệ ("Hệ Kim · Thổ (+ẩn Hỏa)"), canh trái từ x. */
export function elementTags(scene: Phaser.Scene, x: number, y: number, set: ElementSet, size = 30, fontSize = 18, reveal = true): Phaser.GameObjects.Container {
  if (set.els.length === 1 && !set.hidden) return elementTag(scene, x, y, set.els[0]!, size, fontSize);
  const c = scene.add.container(x, y);
  const n = set.els.length + (set.hidden ? 1 : 0);
  c.add(elementBadges(scene, size / 2 + (n - 1) * size * 0.92, 0, set, size, reveal));
  const names = set.els.map((e) => ELEMENT_INFO[e].name).join(" · ");
  const hid = set.hidden ? (reveal ? ` (+ẩn ${ELEMENT_INFO[set.hidden].name})` : " (+?)") : "";
  c.add(txt(scene, size * 0.92 * n + 8, 0, `Hệ ${names}${hid}`, fontSize, { color: ELEMENT_INFO[set.els[0]!].color }).setOrigin(0, 0.5));
  return c;
}

export const elementName = (el: Element) => ELEMENT_INFO[el].name;
export const elementColor = (el: Element) => ELEMENT_INFO[el].color;
