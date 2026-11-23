/**
 * MÀN CHÚC MỪNG NHẬN QUÀ (Hòm Thư, Boss Thế Giới…): tia sáng xoay, chữ "CHÚC MỪNG!" bật ra,
 * từng món quà hiện lần lượt kèm hình vẽ (vàng, kim cương, đá, linh hồn, Đá Tiến Hoá, cá), pháo giấy.
 */
import Phaser from "phaser";
import { EVO_ITEM_BY_ID, FISH_BY_ID } from "@dccc/game-data";
import type { MailReward } from "@dccc/shared";
import { evoItemTexture, fishTextureFor, menuIconTexture } from "../art/textures.ts";
import { Sfx } from "../audio/Sfx.ts";
import { Button, txt } from "./widgets.ts";
import { COLORS } from "./theme.ts";
import { screenRect } from "./wide.ts";

type Item = { tex: string; w: number; h: number; label: string; color: string };

function itemsOf(scene: Phaser.Scene, r: Omit<MailReward, "txId">): Item[] {
  const out: Item[] = [];
  if (r.gold) out.push({ tex: menuIconTexture(scene, r.gold >= 3000 ? "coins" : "coin"), w: 84, h: 84, label: `+${r.gold.toLocaleString("vi-VN")} vàng`, color: "#ffd54f" });
  if (r.diamonds) out.push({ tex: menuIconTexture(scene, "diamond"), w: 84, h: 84, label: `+${r.diamonds.toLocaleString("vi-VN")} kim cương`, color: "#80d8ff" });
  if (r.stones) out.push({ tex: menuIconTexture(scene, "stone"), w: 84, h: 84, label: `+${r.stones.toLocaleString("vi-VN")} Đá Nâng Cấp`, color: "#b388ff" });
  if (r.soul) out.push({ tex: menuIconTexture(scene, "soul"), w: 84, h: 84, label: `+${r.soul.toLocaleString("vi-VN")} Linh Hồn`, color: "#ea80fc" });
  for (const [id, n] of Object.entries(r.evoItems ?? {})) {
    const it = EVO_ITEM_BY_ID.get(id);
    if (it) out.push({ tex: evoItemTexture(scene, id), w: 90, h: 90, label: `+${n} ${it.name}`, color: it.glow });
  }
  for (const f of r.fishes ?? []) {
    const d = FISH_BY_ID.get(f.fishId);
    if (d) out.push({ tex: fishTextureFor(scene, d, f.form ?? null), w: 130, h: 82, label: d.name, color: "#b9f6ca" });
  }
  return out;
}

export function celebrateReward(scene: Phaser.Scene, r: Omit<MailReward, "txId">, title = "🎉 CHÚC MỪNG! 🎉", subtitle = "Bạn đã nhận được") {
  const items = itemsOf(scene, r);
  const root = scene.add.container(0, 0).setDepth(2000);
  const dim = screenRect(scene, 0x050814, 0).setInteractive();
  root.add(dim);
  scene.tweens.add({ targets: dim, fillAlpha: 0.78, duration: 250 });
  // tia sáng xoay
  const rays = scene.add.container(640, 330);
  for (let i = 0; i < 14; i++) rays.add(scene.add.image(0, 0, "p_ray").setOrigin(0.5, 0).setAngle(i * (360 / 14)).setTint(0xffd54f).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD).setScale(0.9));
  root.add(rays);
  scene.tweens.add({ targets: rays, angle: 360, duration: 12000, repeat: -1 });
  const t = txt(scene, 640, 120, title, 54, { color: "#ffd740", align: "center" }).setOrigin(0.5).setScale(0.2);
  root.add(t);
  scene.tweens.add({ targets: t, scale: 1, duration: 520, ease: "Back.easeOut" });
  root.add(txt(scene, 640, 176, subtitle, 22, { weight: "700", align: "center" }).setOrigin(0.5));
  // các món quà hiện lần lượt
  const n = Math.max(1, items.length);
  const gap = Math.min(210, 1100 / n);
  items.forEach((it, i) => {
    const x = 640 + (i - (n - 1) / 2) * gap;
    const y = 320;
    const card = scene.add.container(x, y).setScale(0);
    const g = scene.add.graphics();
    g.fillStyle(0x10294a, 0.95).fillRoundedRect(-gap / 2 + 8, -86, gap - 16, 190, 18);
    g.lineStyle(4, Phaser.Display.Color.HexStringToColor(it.color).color, 1).strokeRoundedRect(-gap / 2 + 8, -86, gap - 16, 190, 18);
    card.add(g);
    const glow = scene.add.image(0, -16, "p_spark").setTint(Phaser.Display.Color.HexStringToColor(it.color).color).setScale(5).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD);
    card.add(glow);
    card.add(scene.add.image(0, -16, it.tex).setDisplaySize(it.w, it.h));
    card.add(txt(scene, 0, 70, it.label, 17, { color: it.color, align: "center", wrap: gap - 26 }).setOrigin(0.5));
    root.add(card);
    scene.tweens.add({ targets: card, scale: 1, duration: 380, delay: 300 + i * 180, ease: "Back.easeOut", onStart: () => Sfx.coin() });
    scene.tweens.add({ targets: glow, alpha: 0.2, duration: 700, yoyo: true, repeat: -1 });
  });
  // pháo giấy
  root.add(
    scene.add.particles(640, -10, "p_spark", {
      x: { min: -560, max: 560 },
      speedY: { min: 120, max: 320 },
      speedX: { min: -60, max: 60 },
      lifespan: 2600,
      scale: { start: 0.9, end: 0.3 },
      tint: [0xff5252, 0xffd740, 0x69f0ae, 0x40c4ff, 0xea80fc],
      quantity: 3,
      frequency: 60,
      duration: 1800,
    }),
  );
  Sfx.catchFanfare(true);
  const ok = new Button(scene, 640, 560, 260, 66, "Tuyệt vời! 🎉", { color: COLORS.orange, fontSize: 26, onClick: () => close() });
  root.add(ok);
  const close = () => scene.tweens.add({ targets: root, alpha: 0, duration: 220, onComplete: () => root.destroy(true) });
  return root;
}
