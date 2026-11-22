import Phaser from "phaser";
import { ELEMENT_INFO } from "@dccc/game-config";
import { FISH_BY_ID, ZONE_BY_ID } from "@dccc/game-data";
import { ownedElement, type Element, type FishDef, type OwnedFish } from "@dccc/shared";
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

export const elementName = (el: Element) => ELEMENT_INFO[el].name;
export const elementColor = (el: Element) => ELEMENT_INFO[el].color;
