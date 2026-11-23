/**
 * CHIÊU THỨC BOSS THẾ GIỚI (hiệu ứng): mỗi boss 2 chiêu riêng theo hệ. Boss gồng sức (báo tên chiêu) rồi phóng
 * vào phía người chơi: lá bão, roi dây leo, cầu lửa, phun lửa, pháo nước, sóng thần, mảnh vàng, gai kim loại,
 * đá lăn, động đất, tia laser sao, mưa thánh quang, mực đen, xúc tu bóng tối.
 * Chỉ là hiệu ứng (không đổi sát thương / luật chơi) – mọi thời điểm dùng đồng hồ thật.
 */
import Phaser from "phaser";
import { txt } from "./widgets.ts";

export type BossSkillFx =
  | "leafStorm"
  | "vineWhip"
  | "fireball"
  | "flameBreath"
  | "waterCannon"
  | "tidalWave"
  | "goldShards"
  | "spikeRise"
  | "boulders"
  | "quake"
  | "starLaser"
  | "holyRain"
  | "inkBlast"
  | "shadowTentacles";

export interface BossSkill {
  name: string;
  fx: BossSkillFx;
  color: number;
}

export const BOSS_SKILLS: Record<string, BossSkill[]> = {
  wb_thanh_long: [
    { name: "🌪 Bão Lá Thanh Long", fx: "leafStorm", color: 0x76ff03 },
    { name: "🌿 Roi Dây Leo Thần", fx: "vineWhip", color: 0x64dd17 },
  ],
  wb_ot_hoa: [
    { name: "☄ Mưa Cầu Lửa Ớt", fx: "fireball", color: 0xff6d00 },
    { name: "🔥 Long Hoả Phun Thiêu", fx: "flameBreath", color: 0xff3d00 },
  ],
  wb_dua_hau: [
    { name: "💦 Pháo Nước Dưa Hấu", fx: "waterCannon", color: 0x40c4ff },
    { name: "🌊 Sóng Thần Hải Quái", fx: "tidalWave", color: 0x0091ea },
  ],
  wb_dua_giap: [
    { name: "✨ Mưa Mảnh Vàng", fx: "goldShards", color: 0xffd740 },
    { name: "⚔ Trận Gai Kim Cương", fx: "spikeRise", color: 0xeceff1 },
  ],
  wb_sau_rieng: [
    { name: "🪨 Đá Gai Lăn Lóc", fx: "boulders", color: 0x8d6e63 },
    { name: "💥 Địa Chấn Sầu Riêng", fx: "quake", color: 0xc6a700 },
  ],
  wb_khe_tinh: [
    { name: "⭐ Tinh Quang Xạ Tuyến", fx: "starLaser", color: 0xfff59d },
    { name: "☀ Thánh Quang Giáng Thế", fx: "holyRain", color: 0xffffff },
  ],
  wb_mang_cut: [
    { name: "🖤 Mực Đen Vực Thẳm", fx: "inkBlast", color: 0x311b92 },
    { name: "🦑 Xúc Tu Bóng Tối", fx: "shadowTentacles", color: 0xaa00ff },
  ],
};

type Pt = { x: number; y: number };
const DEPTH = 12;
const wait = (ms: number, fn: () => void, scene: Phaser.Scene) => window.setTimeout(() => scene.sys.isActive() && fn(), ms);

function burst(scene: Phaser.Scene, x: number, y: number, tint: number[], n: number, speed = 260, tex = "p_spark") {
  const e = scene.add
    .particles(x, y, tex, { speed: { min: speed * 0.3, max: speed }, lifespan: 600, scale: { start: 1.1, end: 0 }, tint, blendMode: Phaser.BlendModes.ADD, emitting: false })
    .setDepth(DEPTH + 1);
  e.explode(n);
  window.setTimeout(() => e.destroy(), 900);
}

/** Bay theo cung từ a → b, gọi onLand khi chạm. */
function fly(scene: Phaser.Scene, obj: Phaser.GameObjects.GameObject & { x: number; y: number }, a: Pt, b: Pt, dur: number, arc: number, onLand: () => void, spin = 0) {
  const t = { p: 0 };
  const o = obj as unknown as Phaser.GameObjects.Components.Transform;
  scene.tweens.add({
    targets: t,
    p: 1,
    duration: dur,
    ease: "Quad.easeIn",
    onUpdate: () => {
      const x = a.x + (b.x - a.x) * t.p;
      const y = a.y + (b.y - a.y) * t.p - Math.sin(t.p * Math.PI) * arc;
      o.setPosition(x, y);
      if (spin) o.setAngle(o.angle + spin);
    },
    onComplete: () => {
      onLand();
      obj.destroy();
    },
  });
}

function leafShape(scene: Phaser.Scene, col: number, s = 1) {
  const g = scene.add.graphics().setDepth(DEPTH);
  g.fillStyle(col, 1).fillEllipse(0, 0, 26 * s, 10 * s);
  g.lineStyle(2, 0x1b1530, 1).strokeEllipse(0, 0, 26 * s, 10 * s);
  g.lineStyle(1.5, 0xccff90, 0.9).lineBetween(-10 * s, 0, 10 * s, 0);
  return g;
}

/**
 * Tung chiêu: mouth = miệng boss, targets = vị trí người chơi (chân nhân vật), onHit(i) khi chiêu trúng người thứ i.
 * Trả về thời gian (ms) tới khi chiêu kết thúc.
 */
export function castBossSkill(scene: Phaser.Scene, skill: BossSkill, mouth: Pt, targets: Pt[], onHit: (i: number) => void): number {
  const col = skill.color;
  const hitAt = (i: number, p: Pt, tint: number[] = [col, 0xffffff]) => {
    burst(scene, p.x, p.y - 40, tint, 18);
    onHit(i);
  };
  const T = targets.length ? targets : [{ x: 140, y: 560 }];
  const cam = scene.cameras.main;
  switch (skill.fx) {
    case "leafStorm": {
      for (let k = 0; k < 40; k++) {
        const i = k % T.length;
        const p = T[i]!;
        const leaf = leafShape(scene, k % 2 ? 0x7cb342 : 0x64dd17, 1.8 + (k % 3) * 0.4).setPosition(mouth.x, mouth.y);
        wait(k * 30, () => fly(scene, leaf, mouth, { x: p.x + Phaser.Math.Between(-80, 80), y: p.y - Phaser.Math.Between(0, 160) }, 520, Phaser.Math.Between(-60, 120), () => k < T.length && hitAt(i, p), 25), scene);
      }
      return 1600;
    }
    case "vineWhip": {
      T.forEach((p, i) => {
        const g = scene.add.graphics().setDepth(DEPTH);
        const t = { p: 0 };
        const draw = () => {
          g.clear();
          const ex = mouth.x + (p.x - mouth.x) * t.p;
          const ey = mouth.y + (p.y - 50 - mouth.y) * t.p;
          const c = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(mouth.x, mouth.y), new Phaser.Math.Vector2((mouth.x + ex) / 2, Math.min(mouth.y, ey) - 120), new Phaser.Math.Vector2(ex, ey));
          g.lineStyle(28, 0x1b1530, 1);
          c.draw(g, 24);
          g.lineStyle(21, 0x558b2f, 1);
          c.draw(g, 24);
          g.lineStyle(5, 0xaeea00, 0.9);
          c.draw(g, 24);
          for (let k = 1; k < 6; k++) {
            const q = c.getPoint(k / 6);
            g.fillStyle(0x7cb342, 1).fillTriangle(q.x, q.y - 12, q.x - 18, q.y - 32, q.x + 10, q.y - 6);
          }
        };
        scene.tweens.add({ targets: t, p: 1, duration: 280, delay: i * 120, ease: "Back.easeOut", onUpdate: draw, onComplete: () => {
          hitAt(i, p);
          scene.tweens.add({ targets: t, p: 0, duration: 380, delay: 160, onUpdate: draw, onComplete: () => g.destroy() });
        } });
      });
      return 1300;
    }
    case "fireball": {
      for (let k = 0; k < Math.max(3, T.length); k++) {
        const i = k % T.length;
        const p = T[i]!;
        const ball = scene.add.container(mouth.x, mouth.y).setDepth(DEPTH);
        ball.add(scene.add.circle(0, 0, 64, 0xff6d00, 0.45).setBlendMode(Phaser.BlendModes.ADD));
        ball.add(scene.add.circle(0, 0, 38, 0xffab00, 1).setStrokeStyle(4, 0x1b1530));
        ball.add(scene.add.circle(-8, -8, 16, 0xfff59d, 1));
        const trail = scene.add.particles(0, 0, "p_ember", { follow: ball, speed: 50, lifespan: 520, scale: { start: 3.2, end: 0 }, tint: [0xff3d00, 0xffab00], frequency: 20, blendMode: Phaser.BlendModes.ADD }).setDepth(DEPTH - 1);
        wait(k * 230, () => fly(scene, ball, mouth, { x: p.x + Phaser.Math.Between(-20, 20), y: p.y - 30 }, 620, 170, () => {
          trail.stop();
          window.setTimeout(() => trail.destroy(), 500);
          burst(scene, p.x, p.y - 30, [0xff3d00, 0xffab00, 0xffffff], 60, 480, "p_ember");
          cam.shake(120, 0.006);
          if (k < T.length) onHit(i);
        }), scene);
      }
      return 1600;
    }
    case "flameBreath": {
      const ang = Phaser.Math.RadToDeg(Math.atan2((T[0]!.y - 60) - mouth.y, T[0]!.x - mouth.x));
      const e = scene.add
        .particles(mouth.x, mouth.y, "p_ember", { angle: { min: ang - 24, max: ang + 24 }, speed: { min: 520, max: 820 }, lifespan: 800, scale: { start: 2.4, end: 6.5 }, alpha: { start: 1, end: 0 }, tint: [0xffeb3b, 0xff9100, 0xff3d00], frequency: 6, quantity: 6, blendMode: Phaser.BlendModes.ADD })
        .setDepth(DEPTH);
      T.forEach((p, i) => wait(380 + i * 80, () => hitAt(i, p, [0xff3d00, 0xffab00]), scene));
      wait(1300, () => e.stop(), scene);
      window.setTimeout(() => e.destroy(), 2200);
      cam.shake(1100, 0.003);
      return 2000;
    }
    case "waterCannon": {
      T.forEach((p, i) => {
        const g = scene.add.graphics().setDepth(DEPTH).setBlendMode(Phaser.BlendModes.ADD);
        const t = { w: 0 };
        scene.tweens.add({ targets: t, w: 1, duration: 160, delay: i * 140, yoyo: true, hold: 420, onUpdate: () => {
          g.clear();
          g.lineStyle(80 * t.w, 0x0091ea, 0.55).lineBetween(mouth.x, mouth.y, p.x, p.y - 50);
          g.lineStyle(30 * t.w, 0xe1f5fe, 0.95).lineBetween(mouth.x, mouth.y, p.x, p.y - 50);
        }, onStart: () => wait(150, () => hitAt(i, p, [0x40c4ff, 0xffffff]), scene), onComplete: () => g.destroy() });
      });
      return 1200;
    }
    case "tidalWave": {
      const g = scene.add.graphics().setDepth(DEPTH);
      const t = { x: mouth.x + 200 };
      const hit = new Set<number>();
      scene.tweens.add({ targets: t, x: -260, duration: 1300, ease: "Sine.easeIn", onUpdate: () => {
        g.clear();
        g.fillStyle(0x0277bd, 0.8).fillRoundedRect(t.x, 230, 360, 500, 80);
        g.fillStyle(0x4fc3f7, 0.9).fillEllipse(t.x + 50, 240, 320, 110);
        g.fillStyle(0xffffff, 0.95).fillEllipse(t.x + 20, 214, 180, 40);
        T.forEach((p, i) => {
          if (!hit.has(i) && t.x < p.x) {
            hit.add(i);
            hitAt(i, p, [0x40c4ff, 0xffffff]);
          }
        });
      }, onComplete: () => g.destroy() });
      cam.shake(1200, 0.004);
      return 1600;
    }
    case "goldShards": {
      for (let k = 0; k < 30; k++) {
        const i = k % T.length;
        const p = T[i]!;
        const s = scene.add.triangle(mouth.x, mouth.y, 0, 0, 70, 14, 0, 28, k % 2 ? 0xffd740 : 0xfff59d).setStrokeStyle(2, 0x1b1530).setDepth(DEPTH);
        const to = { x: p.x + Phaser.Math.Between(-40, 40), y: p.y - Phaser.Math.Between(20, 90) };
        s.setRotation(Math.atan2(to.y - mouth.y, to.x - mouth.x));
        wait(k * 35, () => fly(scene, s, mouth, to, 300, Phaser.Math.Between(-30, 30), () => (burst(scene, to.x, to.y, [0xffd740, 0xffffff], 6), k < T.length && onHit(i))), scene);
      }
      return 1100;
    }
    case "spikeRise": {
      T.forEach((p, i) => {
        for (let k = -2; k <= 2; k++) {
          const sp = scene.add.triangle(p.x + k * 34, p.y + 10, 0, 110, 18, 0, 36, 110, 0xeceff1).setStrokeStyle(2.5, 0x1b1530).setOrigin(0.5, 1).setScale(1, 0).setDepth(DEPTH);
          scene.tweens.add({ targets: sp, scaleY: 1.2 + Math.abs(k) * -0.15, duration: 140, delay: 300 + i * 120 + Math.abs(k) * 40, ease: "Back.easeOut", yoyo: true, hold: 500, onComplete: () => sp.destroy() });
        }
        const warn = scene.add.ellipse(p.x, p.y + 4, 190, 40, 0xff1744, 0.45).setDepth(DEPTH - 1);
        scene.tweens.add({ targets: warn, alpha: 0.1, duration: 150, yoyo: true, repeat: 1, onComplete: () => warn.destroy() });
        wait(330 + i * 120, () => hitAt(i, p, [0xeceff1, 0xffd740]), scene);
      });
      return 1500;
    }
    case "boulders": {
      T.forEach((p, i) => {
        const r = scene.add.container(p.x + 80, -60).setDepth(DEPTH);
        r.add(scene.add.circle(0, 0, 58, 0x6d4c41, 1).setStrokeStyle(5, 0x1b1530));
        for (let k = 0; k < 12; k++) {
          const a = (k / 12) * Math.PI * 2;
          r.add(scene.add.triangle(Math.cos(a) * 58, Math.sin(a) * 58, 0, 0, 22, 0, 11, -26, 0x9e9d24).setRotation(a + Math.PI / 2).setStrokeStyle(1.5, 0x1b1530));
        }
        const shadow = scene.add.ellipse(p.x, p.y + 4, 20, 8, 0x000000, 0.4).setDepth(DEPTH - 1);
        scene.tweens.add({ targets: shadow, scaleX: 4, scaleY: 3, duration: 520 + i * 160 });
        scene.tweens.add({ targets: r, x: p.x, y: p.y - 30, angle: -540, duration: 520 + i * 160, ease: "Quad.easeIn", onComplete: () => {
          burst(scene, p.x, p.y - 20, [0xa1887f, 0xd7ccc8], 50, 420);
          cam.shake(160, 0.009);
          onHit(i);
          shadow.destroy();
          scene.tweens.add({ targets: r, alpha: 0, y: p.y - 10, duration: 260, onComplete: () => r.destroy() });
        } });
      });
      return 1500;
    }
    case "quake": {
      const g = scene.add.graphics().setDepth(DEPTH);
      g.lineStyle(12, 0x1b1530, 1);
      T.forEach((p) => {
        let x = mouth.x;
        let y = p.y + 8;
        g.beginPath();
        g.moveTo(x, y);
        while (x > p.x) {
          x -= Phaser.Math.Between(30, 60);
          y = p.y + 8 + Phaser.Math.Between(-12, 12);
          g.lineTo(x, y);
        }
        g.strokePath();
      });
      g.setAlpha(0);
      scene.tweens.add({ targets: g, alpha: 1, duration: 200, hold: 700, yoyo: true, onComplete: () => g.destroy() });
      cam.shake(900, 0.012);
      T.forEach((p, i) => wait(200 + i * 90, () => hitAt(i, p, [0xc6a700, 0xd7ccc8]), scene));
      return 1500;
    }
    case "starLaser": {
      const star = scene.add.star(mouth.x, mouth.y - 20, 5, 26, 64, 0xfff59d).setStrokeStyle(3, 0x1b1530).setDepth(DEPTH).setScale(0.2);
      scene.tweens.add({ targets: star, scale: 1.3, angle: 180, duration: 420, ease: "Back.easeOut" });
      wait(420, () => {
        T.forEach((p, i) => {
          const g = scene.add.graphics().setDepth(DEPTH).setBlendMode(Phaser.BlendModes.ADD);
          g.lineStyle(46, 0xffeb3b, 0.5).lineBetween(star.x, star.y, p.x, p.y - 50);
          g.lineStyle(14, 0xffffff, 1).lineBetween(star.x, star.y, p.x, p.y - 50);
          scene.tweens.add({ targets: g, alpha: 0, duration: 500, delay: 150, onComplete: () => g.destroy() });
          hitAt(i, p, [0xfff59d, 0xffffff]);
        });
        cam.flash(140, 255, 250, 200);
        scene.tweens.add({ targets: star, scale: 0, duration: 300, delay: 300, onComplete: () => star.destroy() });
      }, scene);
      return 1400;
    }
    case "holyRain": {
      T.forEach((p, i) => {
        const pil = scene.add.rectangle(p.x, 0, 130, p.y + 10, 0xfffde7, 0.0).setOrigin(0.5, 0).setDepth(DEPTH).setBlendMode(Phaser.BlendModes.ADD);
        scene.tweens.add({ targets: pil, fillAlpha: 0.75, scaleX: 1.4, duration: 200, delay: 200 + i * 160, yoyo: true, hold: 260, onStart: () => wait(200, () => hitAt(i, p, [0xffffff, 0xfff59d]), scene), onComplete: () => pil.destroy() });
      });
      return 1500;
    }
    case "inkBlast": {
      T.forEach((p, i) => {
        const blob = scene.add.circle(mouth.x, mouth.y, 44, 0x1a0633, 1).setStrokeStyle(3, 0x7c4dff).setDepth(DEPTH);
        wait(i * 120, () => fly(scene, blob, mouth, { x: p.x, y: p.y - 50 }, 480, 120, () => {
          const sp = scene.add.graphics().setDepth(DEPTH);
          sp.fillStyle(0x12002b, 0.9);
          for (let k = 0; k < 14; k++) sp.fillCircle(p.x + Phaser.Math.Between(-80, 80), p.y - 50 + Phaser.Math.Between(-70, 60), Phaser.Math.Between(14, 40));
          scene.tweens.add({ targets: sp, alpha: 0, duration: 900, delay: 400, onComplete: () => sp.destroy() });
          hitAt(i, p, [0x7c4dff, 0x311b92]);
        }), scene);
      });
      const dark = scene.add.rectangle(640, 360, 1600, 900, 0x0d0221, 0).setDepth(DEPTH - 2);
      scene.tweens.add({ targets: dark, fillAlpha: 0.45, duration: 300, yoyo: true, hold: 600, onComplete: () => dark.destroy() });
      return 1500;
    }
    case "shadowTentacles": {
      T.forEach((p, i) => {
        const g = scene.add.graphics().setDepth(DEPTH);
        const t = { h: 0 };
        scene.tweens.add({ targets: t, h: 1, duration: 260, delay: 200 + i * 130, ease: "Back.easeOut", yoyo: true, hold: 420, onUpdate: () => {
          g.clear();
          for (const dx of [-56, 0, 56]) {
            const top = p.y - 240 * t.h - (dx === 0 ? 30 : 0) * t.h;
            g.fillStyle(0x4a148c, 1);
            g.lineStyle(3, 0x1b1530, 1);
            g.beginPath();
            g.moveTo(p.x + dx - 24, p.y + 10);
            g.lineTo(p.x + dx + 26 * Math.sin(t.h * 3), top);
            g.lineTo(p.x + dx + 24, p.y + 10);
            g.closePath();
            g.fillPath();
            g.strokePath();
          }
        }, onStart: () => wait(220, () => hitAt(i, p, [0xaa00ff, 0xe040fb]), scene), onComplete: () => g.destroy() });
      });
      return 1500;
    }
  }
}

/** Báo hiệu sắp tung chiêu: dải sáng màu chiêu + tên chiêu to, viền đậm. */
export function skillBanner(scene: Phaser.Scene, skill: BossSkill, x: number, y: number) {
  const band = scene.add.rectangle(x, y, 760, 74, skill.color, 0.85).setDepth(DEPTH + 2).setScale(0, 1).setBlendMode(Phaser.BlendModes.NORMAL);
  const edge = scene.add.rectangle(x, y, 760, 74).setStrokeStyle(4, 0x1b1530).setDepth(DEPTH + 2).setScale(0, 1);
  const t = txt(scene, x, y, `⚠ ${skill.name}!`, 38, { color: "#fff59d", align: "center" }).setOrigin(0.5).setDepth(DEPTH + 3).setScale(0.3).setStroke("#1b1530", 10);
  scene.tweens.add({ targets: [band, edge], scaleX: 1, duration: 200, ease: "Quad.easeOut" });
  scene.tweens.add({ targets: t, scale: 1, duration: 260, ease: "Back.easeOut" });
  scene.tweens.add({ targets: [t, band, edge], alpha: 0, duration: 350, delay: 1250, onComplete: () => (t.destroy(), band.destroy(), edge.destroy()) });
}

/** Gồng sức: năng lượng màu chiêu hút từ khắp nơi về miệng boss. */
export function chargeUp(scene: Phaser.Scene, skill: BossSkill, mouth: Pt, ms: number) {
  const e = scene.add
    .particles(0, 0, "p_spark", {
      x: { min: mouth.x - 420, max: mouth.x + 420 },
      y: { min: mouth.y - 300, max: mouth.y + 260 },
      moveToX: mouth.x,
      moveToY: mouth.y,
      lifespan: 520,
      scale: { start: 1.4, end: 0.3 },
      tint: [skill.color, 0xffffff],
      frequency: 14,
      quantity: 2,
      blendMode: Phaser.BlendModes.ADD,
    })
    .setDepth(DEPTH);
  const orb = scene.add.circle(mouth.x, mouth.y, 10, skill.color, 0.85).setDepth(DEPTH).setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({ targets: orb, scale: 7, alpha: 0.35, duration: ms, ease: "Quad.easeIn", onComplete: () => orb.destroy() });
  window.setTimeout(() => {
    e.stop();
    window.setTimeout(() => e.destroy(), 600);
  }, ms);
}
