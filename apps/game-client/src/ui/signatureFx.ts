import Phaser from "phaser";
import { CHARACTER_BY_ID } from "@dccc/game-data";
import { txt } from "./widgets.ts";
import { HORIZON } from "../art/Backgrounds.ts";
import { burst, comicWord, lightning, shockwaves, stunStars } from "./skillFx.ts";

export interface SigOpts {
  heroX: number;
  heroY: number;
  fishX: number;
  fishY: number;
  color: number;
  charId: string;
  skillName: string;
  heroKey?: string;
}

const D = 89; // lớp vẽ hiệu ứng đặc trưng

interface Domain {
  sky: [string, string];
  water: number;
  particles?: { tex: string; tint: number[]; from: "top" | "bottom" };
  extra?: (s: Phaser.Scene, ms: number) => void;
}

/** "Lãnh địa" của tướng cấp cao: đổi bầu trời + mặt nước trong lúc tung chiêu. */
const DOMAINS: Record<string, Domain> = {
  c_long_vuong_tu: { sky: ["#002b26", "#26a69a"], water: 0x00695c, particles: { tex: "p_bubble", tint: [0x80cbc4, 0xffffff], from: "bottom" } },
  c_phu_thuy_bang: { sky: ["#0b1640", "#80deea"], water: 0x4fc3f7, particles: { tex: "p_snow", tint: [0xffffff, 0xb3e5fc], from: "top" } },
  c_hoa_than: { sky: ["#2a0000", "#ff3d00"], water: 0xbf360c, particles: { tex: "p_ember", tint: [0xff3d00, 0xffab00], from: "bottom" } },
  c_hai_vuong: {
    sky: ["#000c2a", "#0277bd"],
    water: 0x002f6c,
    particles: { tex: "p_bubble", tint: [0x4fc3f7, 0xffffff], from: "bottom" },
    extra: (s, ms) => {
      const moon = s.add.circle(1060, 120, 54, 0xe1f5fe, 0.9).setDepth(0.6);
      s.tweens.add({ targets: moon, alpha: 0, delay: ms - 400, duration: 400, onComplete: () => moon.destroy() });
    },
  },
  c_than_sam: {
    sky: ["#05051a", "#3949ab"],
    water: 0x1a237e,
    particles: { tex: "p_drop", tint: [0x9fa8da, 0xffffff], from: "top" },
    extra: (s, ms) => {
      for (let t = 300; t < ms - 300; t += 700)
        s.time.delayedCall(t, () => {
          lightning(s, Phaser.Math.Between(300, 1200), HORIZON, 0xb39ddb);
          s.cameras.main.flash(80, 200, 200, 255);
        });
    },
  },
  c_kim_ke: {
    sky: ["#bf360c", "#ffd54f"],
    water: 0xff8f00,
    particles: { tex: "p_ember", tint: [0xffd54f, 0xff6d00, 0xffffff], from: "bottom" },
    extra: (s, ms) => goldFrame(s, ms, 0xffb300),
  },
  c_lam_ngoc_hau: {
    sky: ["#311b92", "#ffd740"],
    water: 0x6a1b9a,
    particles: { tex: "p_spark", tint: [0xffd740, 0xffffff, 0xea80fc], from: "top" },
    extra: (s, ms) => {
      goldFrame(s, ms, 0xffd740);
      for (let i = 0; i < 6; i++) {
        const c = s.add.text(-200 - i * 160, 80 + (i % 3) * 70, "☁️", { fontSize: "90px", padding: { top: 16 } }).setDepth(0.7).setAlpha(0.9);
        s.tweens.add({ targets: c, x: 1600, duration: ms, onComplete: () => c.destroy() });
      }
    },
  },
};

/** Khung vàng phát sáng quanh màn hình (tướng LR). */
function goldFrame(s: Phaser.Scene, ms: number, color: number) {
  const ex = Math.max(0, (s.scale.gameSize.width - 1280) / 2);
  const g = s.add.graphics().setDepth(D + 8).setBlendMode(Phaser.BlendModes.ADD);
  for (let i = 0; i < 4; i++) g.lineStyle(14 - i * 3, i ? color : 0xffffff, 0.35 + i * 0.15).strokeRect(-ex + 6 + i * 4, 6 + i * 4, 1268 + 2 * ex - i * 8, 708 - i * 8);
  g.setAlpha(0);
  s.tweens.add({ targets: g, alpha: 1, duration: 200, yoyo: true, repeat: Math.floor(ms / 500), hold: 100 });
  s.time.delayedCall(ms, () => g.destroy());
}

const TIER_MS: Record<string, number> = { SSR: 2600, UR: 3600, LR: 4800 };

function domain(scene: Phaser.Scene, charId: string, rarity: string) {
  const d = DOMAINS[charId];
  const ms = TIER_MS[rarity];
  if (!d || !ms) return;
  const key = `domain_${charId}`;
  if (!scene.textures.exists(key)) {
    const t = scene.textures.createCanvas(key, 8, 256)!;
    const ctx = t.getContext();
    const gr = ctx.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, d.sky[0]);
    gr.addColorStop(1, d.sky[1]);
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, 8, 256);
    t.refresh();
  }
  const sky = scene.add.image(-320, 0, key).setOrigin(0).setDisplaySize(1920, HORIZON + 4).setDepth(0.5).setAlpha(0);
  const water = scene.add.rectangle(-320, HORIZON, 1920, 720 - HORIZON, d.water, 0).setOrigin(0).setDepth(0.5);
  scene.tweens.add({ targets: sky, alpha: 0.92, duration: 350 });
  scene.tweens.add({ targets: water, fillAlpha: 0.5, duration: 350 });
  let em: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  if (d.particles) {
    const top = d.particles.from === "top";
    em = scene.add
      .particles(0, top ? -10 : 720, d.particles.tex, {
        x: { min: -200, max: 1500 },
        speedY: top ? { min: 120, max: 260 } : { min: -200, max: -80 },
        speedX: { min: -30, max: 30 },
        lifespan: 4000,
        scale: { start: 1.3, end: 0.2 },
        tint: d.particles.tint,
        frequency: rarity === "LR" ? 18 : rarity === "UR" ? 28 : 45,
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(D - 4);
  }
  d.extra?.(scene, ms);
  if (rarity === "LR") shockwaves(scene, 640, 360, 0xffffff, 3);
  scene.time.delayedCall(ms, () => {
    em?.stop();
    scene.tweens.add({ targets: [sky, water], alpha: 0, duration: 500, onComplete: () => (sky.destroy(), water.destroy(), em?.destroy()) });
  });
}

/** Cắt cảnh kiểu anime: tối màn hình, dải chéo màu hào quang, chân dung nhân vật lớn + tên chiêu. */
function smallBanner(scene: Phaser.Scene, name: string, color: number) {
  const g = scene.add.graphics().setDepth(D + 5);
  g.fillStyle(0x000000, 0.5).fillRect(-400, 128, 2100, 56);
  g.fillStyle(color, 0.95).fillRect(-400, 128, 2100, 4).fillRect(-400, 180, 2100, 4);
  const t = txt(scene, 640, 156, `「 ${name} 」`, 36, { color: "#ffffff", stroke: 8 }).setOrigin(0.5).setDepth(D + 6);
  g.x = -1400;
  t.x = -800;
  scene.tweens.add({ targets: g, x: 0, duration: 220, ease: "Cubic.easeOut" });
  scene.tweens.add({ targets: t, x: 640, duration: 260, ease: "Back.easeOut" });
  scene.tweens.add({ targets: [g, t], alpha: 0, delay: 1100, duration: 300, onComplete: () => (g.destroy(), t.destroy()) });
}

function skillBanner(scene: Phaser.Scene, name: string, color: number, heroKey?: string) {
  const objs: Phaser.GameObjects.GameObject[] = [];
  const dim = scene.add.rectangle(-300, 0, 1900, 720, 0x000000, 0).setOrigin(0).setDepth(D + 3);
  scene.tweens.add({ targets: dim, fillAlpha: 0.45, duration: 120, yoyo: true, hold: 520 });
  objs.push(dim);
  const band = scene.add.graphics().setDepth(D + 4);
  // dải chéo nhiều lớp
  band.fillStyle(0xffffff, 0.95).fillPoints([new Phaser.Math.Vector2(-300, 250), new Phaser.Math.Vector2(1900, 170), new Phaser.Math.Vector2(1900, 186), new Phaser.Math.Vector2(-300, 266)], true);
  band.fillStyle(color, 0.92).fillPoints([new Phaser.Math.Vector2(-300, 266), new Phaser.Math.Vector2(1900, 186), new Phaser.Math.Vector2(1900, 400), new Phaser.Math.Vector2(-300, 480)], true);
  band.fillStyle(0x000000, 0.25).fillPoints([new Phaser.Math.Vector2(-300, 420), new Phaser.Math.Vector2(1900, 340), new Phaser.Math.Vector2(1900, 400), new Phaser.Math.Vector2(-300, 480)], true);
  band.fillStyle(0xffffff, 0.95).fillPoints([new Phaser.Math.Vector2(-300, 480), new Phaser.Math.Vector2(1900, 400), new Phaser.Math.Vector2(1900, 416), new Phaser.Math.Vector2(-300, 496)], true);
  // vệt tốc độ trong dải
  for (let i = 0; i < 26; i++) {
    const y = 200 + Math.random() * 260;
    const x = Math.random() * 1400 - 100;
    band.lineStyle(2 + Math.random() * 3, 0xffffff, 0.35 + Math.random() * 0.4).lineBetween(x, y, x + 160 + Math.random() * 260, y - 20);
  }
  band.x = -1700;
  scene.tweens.add({ targets: band, x: 0, duration: 160, ease: "Cubic.easeOut" });
  objs.push(band);
  if (heroKey) {
    const hero = scene.add.image(-200, 470, heroKey).setOrigin(0.5, 1).setScale(1.55).setDepth(D + 5);
    scene.tweens.add({ targets: hero, x: 300, duration: 220, ease: "Back.easeOut" });
    scene.tweens.add({ targets: hero, x: 330, duration: 520, delay: 220 });
    objs.push(hero);
  }
  const t = txt(scene, 1500, 318, name, 64, { color: "#ffffff", stroke: 12 }).setOrigin(0.5).setDepth(D + 6).setAngle(-4);
  scene.tweens.add({ targets: t, x: 820, duration: 240, delay: 60, ease: "Back.easeOut" });
  scene.tweens.add({ targets: t, scale: 1.08, duration: 160, yoyo: true, delay: 300 });
  objs.push(t);
  const sub = txt(scene, 1500, 384, "KỸ NĂNG ĐẶC BIỆT", 22, { color: "#fff59d", stroke: 6 }).setOrigin(0.5).setDepth(D + 6).setAngle(-4);
  scene.tweens.add({ targets: sub, x: 860, duration: 260, delay: 120, ease: "Cubic.easeOut" });
  objs.push(sub);
  // lóe sáng khi vào + rời cảnh
  scene.cameras.main.flash(120, 255, 255, 255);
  scene.tweens.add({ targets: objs.filter((o) => o !== dim), alpha: 0, x: "+=240", delay: 760, duration: 220, ease: "Cubic.easeIn", onComplete: () => objs.forEach((o) => o.destroy()) });
}

function emojiRain(scene: Phaser.Scene, emoji: string, x: number, y: number, n: number, spread = 200) {
  for (let i = 0; i < n; i++) {
    const e = scene.add.text(x + Phaser.Math.Between(-spread, spread), y - Phaser.Math.Between(150, 320), emoji, { fontSize: `${Phaser.Math.Between(26, 46)}px`, padding: { top: 8 } }).setOrigin(0.5).setDepth(D);
    scene.tweens.add({ targets: e, y: y + Phaser.Math.Between(-20, 30), angle: Phaser.Math.Between(-180, 180), duration: 500 + i * 40, ease: "Quad.easeIn" });
    scene.tweens.add({ targets: e, alpha: 0, delay: 700 + i * 40, duration: 300, onComplete: () => e.destroy() });
  }
}

const FX: Record<string, (s: Phaser.Scene, o: SigOpts) => void> = {
  // Giật Cần: vệt quất cần từ tay tới cá + cú giật làm cá nảy lên
  c_be_tom(s, o) {
    const g = s.add.graphics().setDepth(D).setBlendMode(Phaser.BlendModes.ADD);
    for (const [w, c] of [[16, o.color], [6, 0xffffff]] as const) {
      g.lineStyle(w, c, 1).beginPath();
      g.moveTo(o.heroX + 40, o.heroY - 120);
      for (let k = 1; k <= 12; k++) {
        const t = k / 12;
        g.lineTo(o.heroX + 40 + (o.fishX - o.heroX - 40) * t, o.heroY - 120 + (o.fishY - o.heroY + 120) * t - Math.sin(t * Math.PI) * 140);
      }
      g.strokePath();
    }
    s.tweens.add({ targets: g, alpha: 0, duration: 500, onComplete: () => g.destroy() });
    shockwaves(s, o.fishX, o.fishY, 0xffeb3b, 2);
    comicWord(s, o.fishX, o.fishY - 140, "GIẬT!!", "#ffeb3b");
  },
  // Thả Dây: dây cuộn xoắn lỏng ra + gợn nước êm, chữ "−45 căng"
  c_ong_lao(s, o) {
    const g = s.add.graphics().setDepth(D);
    g.lineStyle(4, 0xe0f7fa, 1).beginPath();
    for (let a = 0; a < Math.PI * 8; a += 0.2) g.lineTo(o.heroX + 60 + Math.cos(a) * (8 + a * 3), o.heroY - 150 + Math.sin(a) * (8 + a * 3));
    g.strokePath();
    s.tweens.add({ targets: g, angle: 180, alpha: 0, scale: 1.4, duration: 1100, onComplete: () => g.destroy() });
    for (let i = 0; i < 4; i++) {
      const r = s.add.ellipse(o.fishX, HORIZON + 6, 60, 14).setStrokeStyle(3, 0xb2ebf2, 0.9).setDepth(D);
      s.tweens.add({ targets: r, scaleX: 6, scaleY: 3, alpha: 0, delay: i * 200, duration: 1200, onComplete: () => r.destroy() });
    }
    comicWord(s, o.heroX + 120, o.heroY - 200, "−45 CĂNG", "#80deea");
  },
  // Gió Thuận: luồng gió cong thổi từ biển về thuyền + buồm + lá bay
  c_co_lai_do(s, o) {
    for (let i = 0; i < 10; i++) {
      const y = 140 + i * 38;
      const g = s.add.graphics().setDepth(D).setBlendMode(Phaser.BlendModes.ADD);
      g.lineStyle(3 + (i % 3), 0xffffff, 0.75).beginPath();
      for (let x = 0; x <= 360; x += 20) g.lineTo(x, Math.sin(x / 50 + i) * 12);
      g.strokePath();
      g.setPosition(1300, y);
      s.tweens.add({ targets: g, x: o.heroX - 200, duration: 700 + i * 50, delay: i * 40, ease: "Sine.easeIn", onComplete: () => g.destroy() });
    }
    s.add.particles(1280, 300, "p_leaf", { speedX: { min: -700, max: -400 }, speedY: { min: -60, max: 60 }, lifespan: 1600, rotate: { min: 0, max: 360 }, quantity: 3, frequency: 40, stopAfter: 40 }).setDepth(D);
    emojiRain(s, "⛵", o.heroX + 60, o.heroY - 60, 1, 0);
    comicWord(s, o.heroX + 160, o.heroY - 220, "GIÓ THUẬN!", "#e0f7fa");
  },
  // Móc Sắt: móc sắt khổng lồ lao xuống cắm vào cá, xích kéo căng
  c_hai_tac(s, o) {
    const hook = s.add.text(o.fishX, -80, "⚓", { fontSize: "120px", padding: { top: 20 } }).setOrigin(0.5).setDepth(D + 1).setAngle(-20);
    const chain = s.add.graphics().setDepth(D);
    s.tweens.add({
      targets: hook,
      y: o.fishY - 30,
      angle: 0,
      duration: 380,
      ease: "Quad.easeIn",
      onUpdate: () => {
        chain.clear().lineStyle(8, 0x9e9e9e, 1).lineBetween(o.heroX + 40, o.heroY - 120, hook.x, hook.y - 50);
        chain.lineStyle(3, 0xffffff, 0.8).lineBetween(o.heroX + 40, o.heroY - 120, hook.x, hook.y - 50);
      },
      onComplete: () => {
        s.cameras.main.shake(260, 0.02);
        burst(s, o.fishX, o.fishY, "p_spark", [0xffffff, 0xffd54f, 0x9e9e9e], 50, 480);
        comicWord(s, o.fishX + 40, o.fishY - 160, "KENG!", "#eeeeee");
      },
    });
    s.tweens.add({ targets: [hook, chain], alpha: 0, delay: 1600, duration: 300, onComplete: () => (hook.destroy(), chain.destroy()) });
  },
  // Ảnh Phân Thân: khói ninja + 2 phân thân cùng kéo + phi tiêu xoay
  c_ninja(s, o) {
    for (const dx of [-110, 110]) {
      const sm = s.add.particles(o.heroX + dx, o.heroY - 80, "p_bubble", { speed: { min: 40, max: 140 }, lifespan: 600, scale: { start: 2.4, end: 0 }, tint: 0x9e9e9e, quantity: 20, stopAfter: 20 }).setDepth(D);
      void sm;
      if (o.heroKey) {
        const clone = s.add.image(o.heroX + dx, o.heroY - 10, o.heroKey).setOrigin(0.5, 1).setScale(0.82).setTintFill(0x311b92).setAlpha(0).setDepth(D - 1);
        s.tweens.add({ targets: clone, alpha: 0.65, duration: 200 });
        s.tweens.add({ targets: clone, alpha: 0, delay: 3200, duration: 300, onComplete: () => clone.destroy() });
      }
    }
    for (let i = 0; i < 5; i++) {
      const st = s.add.text(o.heroX + 40, o.heroY - 140, "✦", { fontSize: "44px", color: "#b0bec5", padding: { top: 6 } }).setOrigin(0.5).setDepth(D + 1);
      s.tweens.add({ targets: st, x: o.fishX + Phaser.Math.Between(-40, 40), y: o.fishY + Phaser.Math.Between(-30, 30), angle: 1080, delay: i * 90, duration: 420, onComplete: () => (burst(s, st.x, st.y, "p_spark", [0xffffff], 8, 200), st.destroy()) });
    }
    comicWord(s, o.fishX, o.fishY - 150, "X2 PHÂN THÂN!", "#b388ff");
  },
  // Ca Khúc Biển: sóng âm hồng lan ra + nốt nhạc bay quanh cá + bong bóng
  c_tien_ca(s, o) {
    for (let i = 0; i < 5; i++) {
      const r = s.add.circle(o.heroX + 40, o.heroY - 130, 30).setStrokeStyle(5, 0xf48fb1, 0.9).setDepth(D);
      s.tweens.add({ targets: r, x: o.fishX, y: o.fishY, scale: 4, alpha: 0, delay: i * 180, duration: 1100, onComplete: () => r.destroy() });
    }
    s.add.particles(o.fishX, o.fishY, "p_bubble", { speed: { min: 20, max: 90 }, lifespan: 1800, scale: { start: 1.6, end: 0 }, tint: [0xf8bbd0, 0xffffff], quantity: 2, frequency: 60, stopAfter: 40 }).setDepth(D);
    emojiRain(s, "🎵", o.fishX, o.fishY, 6, 120);
    comicWord(s, o.fishX, o.fishY - 150, "♪ NGỦ NGOAN ♪", "#f8bbd0");
  },
  // Lưới Thép: lưới thép phủ dọc dây câu + tia hàn
  c_tho_lan(s, o) {
    const g = s.add.graphics().setDepth(D);
    const x0 = o.heroX + 40;
    const y0 = o.heroY - 140;
    g.lineStyle(3, 0xb0bec5, 1);
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const x = x0 + (o.fishX - x0) * t;
      const y = y0 + (o.fishY - y0) * t;
      g.lineBetween(x - 22, y - 22, x + 22, y + 22).lineBetween(x - 22, y + 22, x + 22, y - 22);
    }
    g.setAlpha(0);
    s.tweens.add({ targets: g, alpha: 1, duration: 200 });
    for (let i = 0; i < 6; i++) s.time.delayedCall(i * 120, () => burst(s, x0 + (o.fishX - x0) * (i / 6), y0 + (o.fishY - y0) * (i / 6), "p_spark", [0xffd54f, 0xffffff, 0x80d8ff], 10, 260));
    s.tweens.add({ targets: g, alpha: 0, delay: 1300, duration: 300, onComplete: () => g.destroy() });
    comicWord(s, (x0 + o.fishX) / 2, y0 - 60, "+35% DÂY", "#cfd8dc");
  },
  // Long Trảo: bàn vuốt rồng khổng lồ (4 móng cong sắc) vồ xuống con cá, để lại 3 vết cào phát sáng
  c_long_vuong_tu(s, o) {
    const claw = s.add.graphics().setDepth(D + 2);
    const talon = (ang: number, len: number, w: number) => {
      // một móng: hình lưỡi liềm cong, gốc dày – mũi nhọn
      const pts: Phaser.Math.Vector2[] = [];
      const steps = 14;
      for (let k = 0; k <= steps; k++) {
        const t = k / steps;
        const r = len * t;
        const bend = Math.sin(t * Math.PI * 0.5) * 0.55;
        pts.push(new Phaser.Math.Vector2(Math.cos(ang + bend) * r - Math.sin(ang + bend) * w * (1 - t), Math.sin(ang + bend) * r + Math.cos(ang + bend) * w * (1 - t)));
      }
      for (let k = steps; k >= 0; k--) {
        const t = k / steps;
        const r = len * t * 0.92;
        const bend = Math.sin(t * Math.PI * 0.5) * 0.62;
        pts.push(new Phaser.Math.Vector2(Math.cos(ang + bend) * r + Math.sin(ang + bend) * w * (1 - t) * 0.3, Math.sin(ang + bend) * r - Math.cos(ang + bend) * w * (1 - t) * 0.3));
      }
      return pts;
    };
    // bàn tay vảy rồng
    claw.fillStyle(0x00695c, 1).fillEllipse(0, -20, 150, 120).lineStyle(5, 0x1b1530).strokeEllipse(0, -20, 150, 120);
    claw.fillStyle(0x26a69a, 1);
    for (let i = 0; i < 5; i++) claw.fillCircle(-46 + i * 23, -40 + (i % 2) * 14, 13);
    claw.lineStyle(2, 0x004d40, 1);
    for (let i = 0; i < 5; i++) claw.strokeCircle(-46 + i * 23, -40 + (i % 2) * 14, 13);
    // 4 móng vuốt (vàng ngà, viền tối, ánh sáng)
    [[1.25, 150], [1.62, 175], [1.98, 160], [0.75, 120]].forEach(([ang, len], i) => {
      const base = i === 3 ? new Phaser.Math.Vector2(62, -10) : new Phaser.Math.Vector2(-50 + i * 50, 20);
      const pts = talon(ang!, len!, 26).map((v) => new Phaser.Math.Vector2(v.x + base.x, v.y + base.y));
      claw.fillStyle(0xfff8e1, 1).fillPoints(pts, true);
      claw.lineStyle(4, 0x1b1530, 1).strokePoints(pts, true);
      claw.fillStyle(0xffd54f, 0.8).fillPoints(pts.slice(0, 10), false);
    });
    claw.setPosition(o.fishX + 260, o.fishY - 360).setAngle(-25).setScale(0.6).setAlpha(0);
    // ánh hào quang sau bàn vuốt
    const glow = s.add.image(o.fishX, o.fishY - 80, "p_spark").setTint(o.color).setScale(10).setAlpha(0).setDepth(D + 1).setBlendMode(Phaser.BlendModes.ADD);
    s.tweens.add({ targets: glow, alpha: 0.7, duration: 200, yoyo: true, hold: 300 });
    s.tweens.add({ targets: claw, alpha: 1, scale: 1.25, duration: 220, ease: "Cubic.easeOut" });
    s.tweens.add({
      targets: claw,
      x: o.fishX - 60,
      y: o.fishY + 40,
      angle: 10,
      delay: 260,
      duration: 220,
      ease: "Quad.easeIn",
      onComplete: () => {
        s.cameras.main.shake(320, 0.025);
        s.cameras.main.flash(120, 0, 230, 200);
        // 3 vết cào phát sáng
        for (let i = 0; i < 3; i++) {
          const g = s.add.graphics().setDepth(D + 1).setBlendMode(Phaser.BlendModes.ADD);
          const ox = (i - 1) * 46;
          for (const [w, c] of [[20, o.color], [8, 0xffffff]] as const) {
            g.lineStyle(w, c, 1).beginPath();
            g.moveTo(80 + ox, -130);
            g.lineTo(-90 + ox, 110);
            g.strokePath();
          }
          g.setPosition(o.fishX, o.fishY).setScale(0.05);
          s.tweens.add({ targets: g, scale: 1, delay: i * 50, duration: 120, ease: "Cubic.easeOut" });
          s.tweens.add({ targets: g, alpha: 0, delay: 650 + i * 60, duration: 300, onComplete: () => g.destroy() });
        }
        burst(s, o.fishX, HORIZON, "p_drop", [0x80d8ff, 0xffffff], 80, 560);
        comicWord(s, o.fishX, o.fishY - 190, "LONG TRẢO!", "#4fc3f7");
      },
    });
    s.tweens.add({ targets: [claw, glow], alpha: 0, delay: 900, duration: 300, onComplete: () => (claw.destroy(), glow.destroy()) });
  },
  // Đóng Băng: mặt nước phủ băng + tinh thể băng mọc quanh cá
  c_phu_thuy_bang(s, o) {
    const ice = s.add.rectangle(-300, HORIZON, 1900, 720 - HORIZON, 0xb3e5fc, 0).setOrigin(0).setDepth(D - 2);
    s.tweens.add({ targets: ice, fillAlpha: 0.35, duration: 300, yoyo: true, hold: 2400, onComplete: () => ice.destroy() });
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const shard = s.add.triangle(o.fishX + Math.cos(a) * 70, o.fishY + Math.sin(a) * 50, 0, 40, 12, 0, 24, 40, 0xe1f5fe, 0.95).setStrokeStyle(2, 0x4fc3f7).setDepth(D).setRotation(a + Math.PI / 2).setScale(0);
      s.tweens.add({ targets: shard, scale: 1.4, delay: i * 40, duration: 260, ease: "Back.easeOut" });
      s.tweens.add({ targets: shard, alpha: 0, delay: 2700, duration: 300, onComplete: () => shard.destroy() });
    }
    burst(s, o.fishX, o.fishY, "p_snow", [0xffffff, 0xb3e5fc], 60, 380);
    comicWord(s, o.fishX, o.fishY - 160, "❄ ĐÓNG BĂNG ❄", "#e1f5fe");
  },
  // Lửa Hỏa Ngục: cột lửa trùm lên cá + vòng lửa + màn hình ửng đỏ
  c_hoa_than(s, o) {
    s.add.particles(o.fishX, o.fishY + 40, "p_ember", { speedY: { min: -520, max: -260 }, speedX: { min: -60, max: 60 }, lifespan: 900, scale: { start: 2.4, end: 0 }, tint: [0xff3d00, 0xff9100, 0xffea00], quantity: 6, frequency: 20, stopAfter: 160, blendMode: Phaser.BlendModes.ADD }).setDepth(D);
    const ring = s.add.circle(o.fishX, o.fishY, 30).setStrokeStyle(10, 0xff6d00, 1).setDepth(D);
    s.tweens.add({ targets: ring, scale: 5, alpha: 0, duration: 800, onComplete: () => ring.destroy() });
    const tint = s.add.rectangle(-300, 0, 1900, 720, 0xff3d00, 0.18).setOrigin(0).setDepth(D - 3);
    s.tweens.add({ targets: tint, alpha: 0, duration: 1600, onComplete: () => tint.destroy() });
    emojiRain(s, "🔥", o.fishX, o.fishY, 5, 90);
    comicWord(s, o.fishX, o.fishY - 170, "HỎA NGỤC!", "#ff9100");
  },
  // Triều Cường: con sóng thần khổng lồ cuộn từ phải sang trái kéo cá vào gần
  c_hai_vuong(s, o) {
    // con sóng cuộn: thân sóng xanh + bọt trắng trên đỉnh + tia nước
    const g = s.add.graphics().setDepth(D);
    const crest = (x: number) => -Math.pow(Math.sin((x / 320) * Math.PI), 1.6) * 170;
    g.fillStyle(0x0288d1, 0.8).beginPath().moveTo(0, 30);
    for (let x = 0; x <= 320; x += 8) g.lineTo(x, crest(x));
    g.lineTo(320, 30).closePath().fillPath();
    g.fillStyle(0x4fc3f7, 0.7).beginPath().moveTo(40, 30);
    for (let x = 40; x <= 280; x += 8) g.lineTo(x, crest(x) * 0.6 + 10);
    g.lineTo(280, 30).closePath().fillPath();
    g.lineStyle(9, 0xffffff, 0.95).beginPath();
    for (let x = 0; x <= 200; x += 8) g.lineTo(x, crest(x));
    g.strokePath();
    g.fillStyle(0xffffff, 0.95);
    for (let i = 0; i < 7; i++) g.fillCircle(150 - i * 14, crest(150 - i * 14) - 4 + (i % 2) * 6, 10 - i);
    g.setPosition(1450, HORIZON + 10);
    s.tweens.add({ targets: g, x: o.fishX - 160, duration: 800, ease: "Sine.easeIn" });
    s.tweens.add({ targets: g, alpha: 0, delay: 900, duration: 300, onComplete: () => g.destroy() });
    s.time.delayedCall(700, () => burst(s, o.fishX, HORIZON, "p_drop", [0x4fc3f7, 0xffffff], 90, 620));
    comicWord(s, o.fishX, o.fishY - 170, "TRIỀU CƯỜNG!", "#4fc3f7");
  },
  // Lôi Phạt: mây đen kéo tới + 3 tia sét giáng liên tiếp
  c_than_sam(s, o) {
    const dark = s.add.rectangle(-300, 0, 1900, 720, 0x1a1a40, 0.4).setOrigin(0).setDepth(D - 3);
    s.tweens.add({ targets: dark, alpha: 0, delay: 900, duration: 600, onComplete: () => dark.destroy() });
    emojiRain(s, "⛈️", o.fishX, 80, 3, 160);
    for (let i = 0; i < 3; i++)
      s.time.delayedCall(150 + i * 170, () => {
        lightning(s, o.fishX + (i - 1) * 30, o.fishY, 0xfff176);
        s.cameras.main.flash(90, 255, 255, 200);
      });
    s.time.delayedCall(600, () => stunStars(s, o.fishX, o.fishY));
    comicWord(s, o.fishX, o.fishY - 170, "LÔI PHẠT!", "#fff176");
  },
  // Bình Minh Rực Lửa: mặt trời mọc sau con cá, tia nắng xoay + lông phượng + lửa
  c_kim_ke(s, o) {
    const sun = s.add.circle(o.fishX, HORIZON + 60, 90, 0xffb300, 1).setDepth(D - 2);
    const rays = s.add.graphics().setDepth(D - 3).setBlendMode(Phaser.BlendModes.ADD);
    rays.fillStyle(0xffe082, 0.5);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      rays.fillTriangle(0, 0, Math.cos(a - 0.08) * 420, Math.sin(a - 0.08) * 420, Math.cos(a + 0.08) * 420, Math.sin(a + 0.08) * 420);
    }
    rays.setPosition(o.fishX, HORIZON + 60);
    s.tweens.add({ targets: [sun, rays], y: HORIZON - 40, duration: 600, ease: "Sine.easeOut" });
    s.tweens.add({ targets: rays, angle: 90, duration: 2000 });
    s.tweens.add({ targets: [sun, rays], alpha: 0, delay: 1600, duration: 500, onComplete: () => (sun.destroy(), rays.destroy()) });
    s.cameras.main.flash(400, 255, 200, 80);
    emojiRain(s, "🪶", o.fishX, o.fishY, 6, 200);
    burst(s, o.fishX, o.fishY, "p_ember", [0xff6d00, 0xffd54f, 0xffffff], 90, 560);
    comicWord(s, o.fishX, o.fishY - 190, "Ò Ó O!!!", "#ffd54f");
  },
  // Thiên Biến Vạn Hóa: mây vàng + hàng chục khỉ con nhảy tới kéo cá + gậy như ý xoay
  c_lam_ngoc_hau(s, o) {
    const staff = s.add.rectangle(o.heroX + 60, o.heroY - 160, 14, 220, 0xffc107).setStrokeStyle(3, 0xbf360c).setDepth(D + 1);
    s.tweens.add({ targets: staff, angle: 720, x: o.fishX, y: o.fishY - 60, duration: 700, ease: "Sine.easeInOut" });
    s.tweens.add({ targets: staff, alpha: 0, delay: 900, duration: 300, onComplete: () => staff.destroy() });
    for (let i = 0; i < 18; i++) {
      const m = s.add.text(o.heroX + Phaser.Math.Between(-60, 80), o.heroY - Phaser.Math.Between(0, 120), "🐒", { fontSize: `${Phaser.Math.Between(30, 48)}px`, padding: { top: 8 } }).setOrigin(0.5).setDepth(D).setAlpha(0);
      s.tweens.add({ targets: m, alpha: 1, duration: 100, delay: i * 50 });
      s.tweens.add({ targets: m, x: o.fishX + Phaser.Math.Between(-90, 90), y: o.fishY + Phaser.Math.Between(-50, 50), duration: 650, delay: i * 50, ease: "Quad.easeOut" });
      s.tweens.add({ targets: m, y: "-=30", duration: 160, yoyo: true, repeat: 2, delay: 700 + i * 50 });
      s.tweens.add({ targets: m, alpha: 0, delay: 1700 + i * 30, duration: 300, onComplete: () => m.destroy() });
    }
    s.add.particles(o.heroX, o.heroY - 40, "p_bubble", { speed: { min: 60, max: 200 }, lifespan: 900, scale: { start: 2.2, end: 0 }, tint: 0xffe082, quantity: 30, stopAfter: 30 }).setDepth(D - 1);
    s.time.delayedCall(700, () => stunStars(s, o.fishX, o.fishY));
    comicWord(s, o.fishX, o.fishY - 190, "THIÊN BIẾN VẠN HÓA!", "#ffd740");
  },
};

/** Hiệu ứng riêng theo kỹ năng của từng nhân vật (đúng như mô tả kỹ năng). */
export function signatureFx(scene: Phaser.Scene, o: SigOpts): boolean {
  // tướng càng hiếm hiệu ứng càng hoành tráng: N/R băng tên chiêu · SR cắt cảnh · SSR+ đổi cả nền (lãnh địa)
  const rarity = CHARACTER_BY_ID.get(o.charId)?.rarity ?? "N";
  const cinematic = rarity !== "N" && rarity !== "R";
  if (cinematic) skillBanner(scene, o.skillName, o.color, o.heroKey);
  else smallBanner(scene, o.skillName, o.color);
  domain(scene, o.charId, rarity);
  const f = FX[o.charId];
  if (!f) return false;
  // hiệu ứng chiêu thức nổ ra ngay khi cắt cảnh kết thúc
  scene.time.delayedCall(cinematic ? 700 : 0, () => f(scene, o));
  return true;
}
