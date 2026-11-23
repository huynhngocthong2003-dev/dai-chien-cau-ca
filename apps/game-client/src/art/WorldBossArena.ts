/**
 * SẢNH ĐÁNH BOSS THẾ GIỚI – mỗi boss một đấu trường riêng theo hệ & trái cây:
 * rừng thanh long, núi lửa ruộng ớt, biển dưa hấu, pháo đài dứa vàng, hang sầu riêng, thiên cung khế, vực măng cụt.
 * Vẽ thủ tục bằng Canvas2D (cùng nét viền đậm như phần còn lại của game), kích thước ARENA_W × ARENA_H.
 */
import { OUTLINE, rgba } from "./color.ts";

export const ARENA_W = 1232;
export const ARENA_H = 606;

/** Hạt hiệu ứng động phủ lên sảnh (Phaser vẽ): màu & hướng bay. */
export const ARENA_FX: Record<string, { tint: number[]; rise: boolean; label: string }> = {
  wb_thanh_long: { tint: [0xb2ff59, 0xff80ab], rise: true, label: "🌿 Rừng Thanh Long" },
  wb_ot_hoa: { tint: [0xff6d00, 0xffd740, 0xff1744], rise: true, label: "🌋 Núi Lửa Ruộng Ớt" },
  wb_dua_hau: { tint: [0xb3e5fc, 0xffffff], rise: true, label: "🌊 Biển Dưa Hấu" },
  wb_dua_giap: { tint: [0xffd740, 0xfff59d], rise: false, label: "🏯 Pháo Đài Dứa Vàng" },
  wb_sau_rieng: { tint: [0xd7ccc8, 0xc6a700], rise: false, label: "⛰ Hang Sầu Riêng" },
  wb_khe_tinh: { tint: [0xffffff, 0xfff59d], rise: false, label: "✨ Thiên Cung Khế" },
  wb_mang_cut: { tint: [0xe040fb, 0x7c4dff], rise: true, label: "🌑 Vực Măng Cụt" },
};

type C = CanvasRenderingContext2D;
const W = ARENA_W;
const H = ARENA_H;
/** Hệ số giãn ngang so với bản vẽ gốc 812 px (đặt các vật trải đều theo bề rộng mới). */
const K = W / 812;

/** RNG tất định theo hạt giống (sảnh vẽ giống nhau mỗi lần). */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function sky(c: C, stops: [number, string][]) {
  const g = c.createLinearGradient(0, 0, 0, H);
  for (const [o, col] of stops) g.addColorStop(o, col);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
}

function ink(c: C, p: Path2D, fill: string | CanvasGradient, w = 3) {
  c.fillStyle = fill;
  c.fill(p);
  if (w <= 0) return;
  c.lineWidth = w;
  c.strokeStyle = OUTLINE;
  c.lineJoin = "round";
  c.stroke(p);
}

/** Dãy đồi/đá nhấp nhô làm nền đất (y gốc, biên độ, màu). */
function ridge(c: C, y: number, amp: number, col: string, seed: number, bumps = 7) {
  const r = rng(seed);
  const p = new Path2D();
  p.moveTo(-10, H + 10);
  p.lineTo(-10, y);
  const step = (W + 20) / bumps;
  for (let i = 0; i < bumps; i++) {
    const x0 = -10 + i * step;
    p.quadraticCurveTo(x0 + step / 2, y - amp * (0.5 + r()), x0 + step, y + (r() - 0.5) * amp * 0.4);
  }
  p.lineTo(W + 10, H + 10);
  p.closePath();
  ink(c, p, col, 3);
}

function glowDisc(c: C, x: number, y: number, r: number, col: string, a = 0.6) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(col, a));
  g.addColorStop(1, rgba(col, 0));
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
}

function leaf(c: C, x: number, y: number, ang: number, len: number, w: number, col: string) {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  const p = new Path2D();
  p.moveTo(0, 0);
  p.quadraticCurveTo(len * 0.5, -w, len, 0);
  p.quadraticCurveTo(len * 0.5, w, 0, 0);
  ink(c, p, col, 2);
  c.restore();
}

// ——— Mộc: rừng xương rồng thanh long, quả hồng treo, ánh nắng xanh
function wood(c: C) {
  sky(c, [[0, "#0b3d2e"], [0.55, "#1b5e20"], [1, "#2e7d32"]]);
  glowDisc(c, 600, 120, 260, "#c6ff00", 0.35);
  const r = rng(11);
  // dây xương rồng thanh long (thân 3 cạnh xanh) rủ từ trên xuống
  for (let i = 0; i < 9; i++) {
    const x = 40 + i * 150 + r() * 40;
    const p = new Path2D();
    p.moveTo(x - 14, -10);
    p.bezierCurveTo(x - 30, 120, x + 30, 160, x + 4, 240 + r() * 60);
    p.lineTo(x + 18, 230 + r() * 60);
    p.bezierCurveTo(x + 44, 150, x + 4, 110, x + 14, -10);
    p.closePath();
    ink(c, p, i % 2 ? "#558b2f" : "#689f38", 3);
    // trái thanh long hồng treo
    const fx = x + 8;
    const fy = 250 + r() * 50;
    const f = new Path2D();
    f.ellipse(fx, fy, 22, 28, 0.2, 0, Math.PI * 2);
    ink(c, f, "#ec407a", 3);
    for (let k = 0; k < 5; k++) leaf(c, fx - 10 + k * 5, fy - 16 + k * 8, -0.6 + (k % 2) * 1.6, 18, 6, "#9ccc65");
  }
  ridge(c, 470, 70, "#33691e", 12);
  ridge(c, 530, 40, "#1b5e20", 13, 9);
  // bụi lá dưới đất
  for (let i = 0; i < 16; i++) leaf(c, r() * W, 560 + r() * 40, -Math.PI / 2 + (r() - 0.5) * 1.6, 40 + r() * 30, 10, i % 2 ? "#7cb342" : "#8bc34a");
}

// ——— Hỏa: núi lửa phun, dung nham, ruộng ớt đỏ
function fire(c: C) {
  sky(c, [[0, "#1a0500"], [0.45, "#5d1000"], [1, "#bf360c"]]);
  // núi lửa
  const v = new Path2D();
  v.moveTo(160 * K, 470);
  v.lineTo(360 * K, 150);
  v.lineTo(460 * K, 150);
  v.lineTo(680 * K, 470);
  v.closePath();
  ink(c, v, "#3e1a12", 3);
  glowDisc(c, 410 * K, 140, 240, "#ff6d00", 0.7);
  // dòng dung nham chảy
  c.strokeStyle = "#ff9100";
  c.lineWidth = 10;
  c.lineCap = "round";
  for (const [x0, x1] of [[380, 300], [430, 470], [410, 390]] as const) {
    c.beginPath();
    c.moveTo(x0 * K, 158);
    c.bezierCurveTo(x0 * K - 10, 260, x1 * K + 20, 330, x1 * K, 460);
    c.stroke();
  }
  ridge(c, 480, 50, "#4e1c0c", 21);
  // hồ dung nham
  const lava = c.createLinearGradient(0, 520, 0, H);
  lava.addColorStop(0, "#ffab00");
  lava.addColorStop(1, "#d84315");
  const l = new Path2D();
  l.ellipse(W / 2, 590, 470 * K, 70, 0, 0, Math.PI * 2);
  ink(c, l, lava, 3);
  // ớt đỏ cắm trên ruộng
  const r = rng(22);
  for (let i = 0; i < 13; i++) {
    const x = 30 + i * 92 + r() * 20;
    const y = 470 + r() * 30;
    const p = new Path2D();
    p.moveTo(x, y);
    p.bezierCurveTo(x + 18, y + 10, x + 18, y + 50, x + 4, y + 70);
    p.bezierCurveTo(x - 4, y + 50, x - 10, y + 20, x, y);
    ink(c, p, "#e53935", 2.5);
    leaf(c, x, y + 2, -2.4, 14, 5, "#43a047");
  }
}

// ——— Thủy: biển xanh, đảo lát dưa hấu, tia nắng xuyên nước
function water(c: C) {
  sky(c, [[0, "#4fc3f7"], [0.35, "#0288d1"], [1, "#01395e"]]);
  c.globalAlpha = 0.18;
  c.fillStyle = "#ffffff";
  for (let i = 0; i < 9; i++) {
    c.beginPath();
    c.moveTo(80 + i * 140, 0);
    c.lineTo(140 + i * 140, 0);
    c.lineTo(40 + i * 140, H);
    c.lineTo(-20 + i * 140, H);
    c.closePath();
    c.fill();
  }
  c.globalAlpha = 1;
  // gợn sóng mặt nước
  c.strokeStyle = "rgba(255,255,255,.55)";
  c.lineWidth = 3;
  for (let i = 0; i < 13; i++) {
    c.beginPath();
    c.arc(40 + i * 95, 40, 30, 0.2 * Math.PI, 0.8 * Math.PI);
    c.stroke();
  }
  // đảo lát dưa hấu dưới đáy
  const slice = (x: number, y: number, r: number) => {
    const rind = new Path2D();
    rind.arc(x, y, r, Math.PI, 0);
    rind.closePath();
    ink(c, rind, "#2e7d32", 3);
    const flesh = new Path2D();
    flesh.arc(x, y, r * 0.84, Math.PI, 0);
    flesh.closePath();
    ink(c, flesh, "#ff5252", 2);
    c.fillStyle = "#1b1530";
    for (let k = 0; k < 7; k++) {
      const a = Math.PI + ((k + 0.5) / 7) * Math.PI;
      c.beginPath();
      c.ellipse(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, 3, 5, a, 0, Math.PI * 2);
      c.fill();
    }
  };
  ridge(c, 540, 30, "#e6c27a", 31, 9);
  slice(130, 560, 110);
  slice(690 * K, 570, 130);
  slice(420 * K, 600, 70);
  slice(1080, 590, 90);
  // rong biển
  const r = rng(33);
  c.strokeStyle = "#1de9b6";
  c.lineWidth = 7;
  c.lineCap = "round";
  for (let i = 0; i < 7; i++) {
    const x = 260 * K + i * 40 + r() * 20;
    c.beginPath();
    c.moveTo(x, H);
    c.bezierCurveTo(x - 20, 520, x + 20, 480, x - 6, 430 + r() * 40);
    c.stroke();
  }
}

// ——— Kim: pháo đài vàng kim, cột thép, vương miện lá dứa
function metal(c: C) {
  sky(c, [[0, "#3e2723"], [0.5, "#795548"], [1, "#a1887f"]]);
  glowDisc(c, W / 2, 200, 320 * K, "#ffd740", 0.4);
  // tường thành vàng mắt dứa
  const wall = c.createLinearGradient(0, 300, 0, H);
  wall.addColorStop(0, "#ffca28");
  wall.addColorStop(1, "#e65100");
  const w = new Path2D();
  w.moveTo(-10, 330);
  for (let x = -10; x < W + 10; x += 58) {
    w.lineTo(x, 300);
    w.lineTo(x + 30, 300);
    w.lineTo(x + 30, 330);
    w.lineTo(x + 58, 330);
  }
  w.lineTo(W + 10, H + 10);
  w.lineTo(-10, H + 10);
  w.closePath();
  ink(c, w, wall, 3);
  // ô mắt dứa trên tường
  c.strokeStyle = rgba("#6d4c41", 0.6);
  c.lineWidth = 2;
  for (let y = 350; y < H; y += 36)
    for (let x = (y / 36) % 2 ? 0 : 24; x < W; x += 48) {
      c.beginPath();
      c.moveTo(x, y - 14);
      c.lineTo(x + 18, y);
      c.lineTo(x, y + 14);
      c.lineTo(x - 18, y);
      c.closePath();
      c.stroke();
    }
  // cột thép + vương miện lá dứa
  for (const x of [70, W / 2, W - 70]) {
    const p = new Path2D();
    p.rect(x - 34, 150, 68, H);
    const g = c.createLinearGradient(x - 34, 0, x + 34, 0);
    g.addColorStop(0, "#90a4ae");
    g.addColorStop(0.5, "#eceff1");
    g.addColorStop(1, "#607d8b");
    ink(c, p, g, 3);
    for (let k = -3; k <= 3; k++) leaf(c, x, 152, -Math.PI / 2 + k * 0.28, 70 - Math.abs(k) * 8, 12, k % 2 ? "#2e7d32" : "#43a047");
  }
  ridge(c, 560, 18, "#5d4037", 41, 10);
}

// ——— Thổ: hang đá, thạch nhũ, đá gai sầu riêng
function earth(c: C) {
  sky(c, [[0, "#1b120c"], [0.5, "#3e2a1c"], [1, "#5d4037"]]);
  glowDisc(c, W / 2, 330, 300 * K, "#ffca28", 0.25);
  const r = rng(51);
  // thạch nhũ trên trần
  for (let i = 0; i < 21; i++) {
    const x = i * 60 + r() * 30;
    const len = 60 + r() * 110;
    const p = new Path2D();
    p.moveTo(x - 22, -5);
    p.lineTo(x, len);
    p.lineTo(x + 22, -5);
    p.closePath();
    ink(c, p, i % 2 ? "#6d4c41" : "#795548", 2.5);
  }
  ridge(c, 470, 60, "#4e342e", 52);
  // tảng đá sầu riêng gai tua tủa
  const durian = (x: number, y: number, rr: number) => {
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const p = new Path2D();
      p.moveTo(x + Math.cos(a - 0.18) * rr, y + Math.sin(a - 0.18) * rr);
      p.lineTo(x + Math.cos(a) * rr * 1.3, y + Math.sin(a) * rr * 1.3);
      p.lineTo(x + Math.cos(a + 0.18) * rr, y + Math.sin(a + 0.18) * rr);
      ink(c, p, "#827717", 2);
    }
    const b = new Path2D();
    b.ellipse(x, y, rr, rr * 0.9, 0, 0, Math.PI * 2);
    ink(c, b, "#9e9d24", 3);
    const m = new Path2D();
    m.ellipse(x, y + rr * 0.2, rr * 0.4, rr * 0.25, 0, 0, Math.PI * 2);
    ink(c, m, "#fdd835", 2);
  };
  durian(110, 540, 55);
  durian(700 * K, 520, 70);
  durian(420 * K, 590, 40);
  ridge(c, 585, 20, "#3e2723", 53, 11);
}

// ——— Ánh Sáng: thiên cung mây vàng, tia sáng, sao khế
function light(c: C) {
  sky(c, [[0, "#fffde7"], [0.5, "#fff59d"], [1, "#ffe082"]]);
  // tia sáng toả từ đỉnh
  c.save();
  c.translate(W / 2, -40);
  c.fillStyle = "rgba(255,255,255,.45)";
  for (let i = 0; i < 12; i++) {
    c.rotate(Math.PI / 12);
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(-30, 900);
    c.lineTo(30, 900);
    c.closePath();
    c.fill();
  }
  c.restore();
  // cột đền trắng
  for (const x of [90, W / 2 + 40, W - 90]) {
    const p = new Path2D();
    p.rect(x - 28, 140, 56, H);
    ink(c, p, "#fffde7", 3);
    c.strokeStyle = rgba("#bcaaa4", 0.6);
    c.lineWidth = 2;
    for (let k = -14; k <= 14; k += 14) {
      c.beginPath();
      c.moveTo(x + k, 150);
      c.lineTo(x + k, H);
      c.stroke();
    }
    const cap = new Path2D();
    cap.rect(x - 42, 124, 84, 20);
    ink(c, cap, "#ffecb3", 3);
  }
  // mây
  const cloud = (x: number, y: number, s: number) => {
    const p = new Path2D();
    for (const [dx, dy, rr] of [[0, 0, 40], [42, -14, 46], [90, 2, 38], [44, 14, 40]] as const) {
      p.moveTo(x + (dx + rr) * s, y + dy * s);
      p.arc(x + dx * s, y + dy * s, rr * s, 0, Math.PI * 2);
    }
    ink(c, p, "#ffffff", 0);
  };
  cloud(30, 560, 1.4);
  cloud(560 * K, 570, 1.5);
  cloud(300 * K, 600, 1.2);
  cloud(W - 160, 590, 1.3);
  // sao khế lơ lửng
  const star = (x: number, y: number, rr: number) => {
    const p = new Path2D();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const q = i % 2 ? rr * 0.48 : rr;
      if (i) p.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
      else p.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
    }
    p.closePath();
    ink(c, p, "#fbc02d", 2.5);
  };
  star(220 * K, 120, 22);
  star(600 * K, 90, 26);
  star(400 * K, 60, 16);
}

// ——— Bóng Tối: vực tím, trăng khuyết, măng cụt, xúc tu bóng tối
function dark(c: C) {
  sky(c, [[0, "#0d0221"], [0.55, "#2a0845"], [1, "#4a148c"]]);
  const r = rng(71);
  c.fillStyle = "#ffffff";
  for (let i = 0; i < 60; i++) {
    c.globalAlpha = 0.3 + r() * 0.6;
    c.beginPath();
    c.arc(r() * W, r() * 300, 1 + r() * 1.6, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
  // trăng khuyết tím
  glowDisc(c, 640 * K, 110, 130, "#e040fb", 0.45);
  c.fillStyle = "#f3e5f5";
  c.beginPath();
  c.arc(640 * K, 110, 50, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#1a0633";
  c.beginPath();
  c.arc(640 * K + 22, 96, 46, 0, Math.PI * 2);
  c.fill();
  // xúc tu bóng tối trồi lên
  for (let i = 0; i < 5; i++) {
    const x = (60 + i * 175) * K + r() * 40;
    const p = new Path2D();
    p.moveTo(x - 24, H + 5);
    p.bezierCurveTo(x - 40, 420, x + 50, 380, x + 10, 300 + r() * 80);
    p.bezierCurveTo(x + 70, 390, x + 10, 440, x + 24, H + 5);
    p.closePath();
    ink(c, p, i % 2 ? "#4a148c" : "#6a1b9a", 3);
  }
  ridge(c, 520, 40, "#1a0633", 72);
  // trái măng cụt dưới đáy
  for (const [x, y, rr] of [[150, 560, 34], [660 * K, 550, 42], [420 * K, 585, 26]] as [number, number, number][]) {
    const b = new Path2D();
    b.arc(x, y, rr, 0, Math.PI * 2);
    ink(c, b, "#4a148c", 3);
    for (let k = 0; k < 5; k++) leaf(c, x, y - rr * 0.8, -Math.PI / 2 + (k - 2) * 0.55, rr * 0.7, rr * 0.22, "#33691e");
    c.fillStyle = "rgba(255,255,255,.3)";
    c.beginPath();
    c.ellipse(x - rr * 0.35, y - rr * 0.2, rr * 0.25, rr * 0.12, -0.6, 0, Math.PI * 2);
    c.fill();
  }
}

const ARENAS: Record<string, (c: C) => void> = {
  wb_thanh_long: wood,
  wb_ot_hoa: fire,
  wb_dua_hau: water,
  wb_dua_giap: metal,
  wb_sau_rieng: earth,
  wb_khe_tinh: light,
  wb_mang_cut: dark,
};

export function drawWorldBossArena(ctx: CanvasRenderingContext2D, id: string) {
  (ARENAS[id] ?? water)(ctx);
  // tối nhẹ phía viền để boss & chữ nổi lên
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.7);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,.45)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}
