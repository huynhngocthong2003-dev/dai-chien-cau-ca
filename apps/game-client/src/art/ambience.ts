import Phaser from "phaser";
import type { ZoneDef } from "@dccc/shared";
import { HORIZON } from "./Backgrounds.ts";

function ensureTextures(scene: Phaser.Scene) {
  if (!scene.textures.exists("amb_cloud")) {
    const t = scene.textures.createCanvas("amb_cloud", 260, 110)!;
    const ctx = t.getContext();
    const g = ctx.createLinearGradient(0, 0, 0, 110);
    g.addColorStop(0, "rgba(255,255,255,0.95)");
    g.addColorStop(1, "rgba(220,235,250,0.85)");
    ctx.fillStyle = g;
    ctx.beginPath();
    for (const [x, y, r] of [[60, 70, 36], [110, 48, 46], [165, 58, 40], [205, 74, 28], [130, 80, 34]] as const) {
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fill();
    t.refresh();
  }
  if (!scene.textures.exists("amb_vignette")) {
    const t = scene.textures.createCanvas("amb_vignette", 640, 360)!;
    const ctx = t.getContext();
    const g = ctx.createRadialGradient(320, 170, 120, 320, 180, 420);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(5,10,30,0.55)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 640, 360);
    t.refresh();
  }
}

/**
 * Lớp không khí động cho cảnh có khu vực: mây trôi, tia nắng, ánh lấp lánh
 * trên mặt nước và viền tối. Chi phí thấp (vài sprite + tween).
 */
export function addAmbience(scene: Phaser.Scene, zone: ZoneDef, opts: { vignetteDepth?: number; baseDepth?: number } = {}) {
  ensureTextures(scene);
  const base = opts.baseDepth ?? 1;
  const dark = zone.id === "z_vuc_sau";
  const sunX = zone.id === "z_ben_tan_thu" ? 1040 : 980;
  const sunY = dark ? 110 : 120;

  // tia nắng xoay chậm
  const rays = scene.add.container(sunX, sunY).setDepth(base);
  for (let i = 0; i < 9; i++) {
    rays.add(
      scene.add
        .image(0, 0, "p_ray")
        .setOrigin(0.5, 0)
        .setAngle(i * 40)
        .setScale(1.2, 0.9)
        .setAlpha(dark ? 0.06 : 0.12)
        .setBlendMode(Phaser.BlendModes.ADD),
    );
  }
  scene.tweens.add({ targets: rays, angle: 360, duration: 90000, repeat: -1 });
  scene.tweens.add({ targets: rays, alpha: 0.6, duration: 3000, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

  // mây trôi
  if (!dark) {
    const tint = zone.id === "z_bien_lua" ? 0x6d4c41 : zone.id === "z_dai_duong_than_thoai" ? 0xf3e5f5 : 0xffffff;
    for (let i = 0; i < 4; i++) {
      const c = scene.add
        .image(Phaser.Math.Between(0, 1280), 50 + i * 55, "amb_cloud")
        .setScale(0.5 + Math.random() * 0.6)
        .setAlpha(0.55)
        .setTint(tint)
        .setDepth(base);
      const speed = 18 + i * 9;
      scene.tweens.add({
        targets: c,
        x: 1450,
        duration: ((1450 - c.x) / speed) * 1000,
        onComplete: () => {
          c.x = -200;
          scene.tweens.add({ targets: c, x: 1450, duration: (1650 / speed) * 1000, repeat: -1 });
        },
      });
    }
  }

  // ánh mặt trời lấp lánh trên mặt nước
  for (let i = 0; i < 14; i++) {
    const s = scene.add
      .image(sunX + Phaser.Math.Between(-160, 160), HORIZON + Phaser.Math.Between(6, 70), "p_spark")
      .setScale(0.3 + Math.random() * 0.4)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(base + 1);
    scene.tweens.add({
      targets: s,
      alpha: 0.9,
      duration: 500 + Math.random() * 600,
      yoyo: true,
      repeat: -1,
      delay: Math.random() * 2000,
      repeatDelay: Math.random() * 1500,
    });
  }

  // viền tối
  scene.add
    .image(0, 0, "amb_vignette")
    .setOrigin(0)
    .setDisplaySize(1280, 720)
    .setDepth(opts.vignetteDepth ?? 35);
}
