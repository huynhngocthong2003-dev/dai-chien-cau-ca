import Phaser from "phaser";
import { FISH_RARITY_COLOR } from "@dccc/game-config";
import { FISH_BY_ID, FORM_BY_ID } from "@dccc/game-data";
import { ownedFishPower, winRate, type OwnedFish } from "@dccc/shared";
import { fishDisplayMult, fishTextureFor } from "../art/textures.ts";
import { hexToInt } from "../art/color.ts";
import { formatNum, txt } from "./widgets.ts";
import { elementBadges, fishElementSet } from "./element.ts";
import { Sfx } from "../audio/Sfx.ts";

/** Lực chiến của cá trong túi. */
export const fishPower = (o: OwnedFish) => ownedFishPower(FISH_BY_ID.get(o.fishId)!, o, o.form ? FORM_BY_ID.get(o.form) : null);

/** Thẻ cá để chọn đội hình (dùng ở Đấu Cá và phòng đấu với người). `badge` = số thứ tự đã chọn. */
export function fishPickCard(
  scene: Phaser.Scene,
  c: Phaser.GameObjects.Container,
  x: number,
  y: number,
  w: number,
  h: number,
  o: OwnedFish,
  onClick: () => void,
  badge?: string,
) {
  const f = FISH_BY_ID.get(o.fishId)!;
  const col = hexToInt(FISH_RARITY_COLOR[f.rarity]);
  const g = scene.add.graphics();
  g.fillGradientStyle(0x1a3d66, 0x1a3d66, 0x0d2340, 0x0d2340, 0.95).fillRoundedRect(x, y, w, h, 12);
  g.lineStyle(badge ? 4 : 2.5, badge ? 0xffeb3b : col).strokeRoundedRect(x, y, w, h, 12);
  c.add(g);
  if (o.form) {
    const fm = FORM_BY_ID.get(o.form);
    if (fm) c.add(scene.add.image(x + w / 2, y + h * 0.4, "p_spark").setTint(hexToInt(fm.glow)).setScale(4).setAlpha(0.35));
  }
  const m = Math.min(1.1, fishDisplayMult(f, o.stars));
  c.add(scene.add.image(x + w / 2, y + h * 0.4, fishTextureFor(scene, f, o.form, o.stars)).setDisplaySize(w * 0.86 * m, w * 0.54 * m));
  // huy hiệu nguyên tố (góc phải trên)
  c.add(elementBadges(scene, x + w - 17, y + 17, fishElementSet(o, f), 26));
  const wr = winRate(o);
  c.add(
    txt(scene, x + w / 2, y + h - 22, `${f.name}\nLv.${o.level} · ⚔${formatNum(fishPower(o))}${wr !== null ? ` · ${Math.round(wr * 100)}%` : ""}`, 11, {
      align: "center",
      weight: "700",
      color: FISH_RARITY_COLOR[f.rarity],
    }).setOrigin(0.5),
  );
  if (badge) {
    const b = scene.add.graphics();
    b.fillStyle(0xffc107, 1).fillCircle(x + 16, y + 16, 14);
    b.lineStyle(2.5, 0x1b1530).strokeCircle(x + 16, y + 16, 14);
    c.add(b);
    c.add(txt(scene, x + 16, y + 17, badge, 18, { color: "#1b1530", stroke: 0, shadow: false }).setOrigin(0.5));
  }
  const z = scene.add.zone(x + w / 2, y + h / 2, w, h).setInteractive({ useHandCursor: true });
  z.on("pointerup", () => {
    Sfx.click();
    onClick();
  });
  c.add(z);
}
