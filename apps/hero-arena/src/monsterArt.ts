import Phaser from "phaser";
import { MONSTERS, type MonsterDef } from "@hero-arena/core";
import { css, pixelTex, shade } from "./art.ts";

// Quái pixel-art vẽ thủ tục: mỗi loài một dáng riêng theo vùng đất (nhìn nghiêng 3/4, quay phải),
// 2 khung hình (bước chân / vỗ cánh / lắc đuôi). Vẽ ở độ phân giải cao rồi pixel hoá qua pixelTex
// để cùng phong cách viền tối + bảng màu với nhân vật và vật thể bản đồ.

type Ctx = CanvasRenderingContext2D;
type Pt = [number, number];

/** Khối bo tròn có đổ sáng góc trên-trái. */
function blob(c: Ctx, x: number, y: number, rx: number, ry: number, color: number, rot = 0): void {
  const g = c.createRadialGradient(x - rx * 0.35, y - ry * 0.45, Math.min(rx, ry) * 0.1, x, y, Math.max(rx, ry) * 1.05);
  g.addColorStop(0, css(shade(color, 1.35)));
  g.addColorStop(0.55, css(color));
  g.addColorStop(1, css(shade(color, 0.62)));
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  c.fill();
}

/** Đa giác tô chuyển sáng (trên) → tối (dưới). */
function poly(c: Ctx, pts: Pt[], color: number, light = 1.25, dark = 0.7): void {
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const [, y] of pts) {
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  const g = c.createLinearGradient(0, y0, 0, y1 + 0.01);
  g.addColorStop(0, css(shade(color, light)));
  g.addColorStop(1, css(shade(color, dark)));
  c.fillStyle = g;
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fill();
}

function stroke(c: Ctx, pts: Pt[], w: number, color: number, a = 1): void {
  c.strokeStyle = css(color, a);
  c.lineWidth = w;
  c.lineCap = "round";
  c.lineJoin = "round";
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.stroke();
}

/** Mắt phát sáng: quầng mờ + lõi + đốm trắng. */
function eye(c: Ctx, x: number, y: number, r: number, color: number): void {
  c.fillStyle = css(color, 0.35);
  c.beginPath();
  c.arc(x, y, r * 2, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = css(color);
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#ffffff";
  c.beginPath();
  c.arc(x + r * 0.3, y - r * 0.35, r * 0.4, 0, Math.PI * 2);
  c.fill();
}

function glow(c: Ctx, x: number, y: number, r: number, color: number, a = 0.45): void {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, css(color, a));
  g.addColorStop(1, css(color, 0));
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
}

function shadow(c: Ctx, x: number, y: number, rx: number): void {
  c.fillStyle = "rgba(0,0,0,0.32)";
  c.beginPath();
  c.ellipse(x, y, rx, rx * 0.3, 0, 0, Math.PI * 2);
  c.fill();
}

/** Bối cảnh vẽ: tâm x, mặt đất y, đơn vị s (= def.size), khung f (0/1). */
interface P {
  x: number;
  g: number;
  s: number;
  f: number;
  col: number;
}

// ---------------------------------------------------------------- RỪNG
function wisp(c: Ctx, { x, g, s, f, col }: P): void {
  const y = g - s * 1.05 - f * s * 0.12;
  shadow(c, x, g, s * 0.55);
  glow(c, x, y, s * 1.3, col, 0.22);
  // đuôi lửa uốn lượn
  const sw = f ? 0.25 : -0.2;
  poly(c, [[x - s * 0.55, y + s * 0.1], [x + s * 0.55, y + s * 0.1], [x + s * (0.25 + sw), y + s * 0.65], [x + s * (-0.1 + sw * 1.6), y + s * 1.0], [x - s * 0.2, y + s * 0.6]], shade(col, 0.85));
  // thân giọt lửa + chóp lửa
  blob(c, x, y, s * 0.6, s * 0.55, col);
  poly(c, [[x - s * 0.45, y - s * 0.25], [x - s * (0.2 - sw * 0.3), y - s * 1.0], [x, y - s * 0.45], [x + s * (0.15 + sw * 0.3), y - s * 1.2], [x + s * 0.5, y - s * 0.25]], shade(col, 1.05));
  blob(c, x - s * 0.1, y - s * 0.05, s * 0.32, s * 0.28, 0xe8fff4);
  // mắt to dễ thương
  c.fillStyle = "#0c2a22";
  for (const ex of [-0.2, 0.18]) {
    c.beginPath();
    c.ellipse(x + s * ex, y - s * 0.02, s * 0.1, s * 0.16, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = "#ffffff";
  for (const ex of [-0.17, 0.21]) c.fillRect(x + s * ex, y - s * 0.12, s * 0.07, s * 0.07);
  // tay nhỏ
  blob(c, x - s * 0.68, y + s * 0.12 - f * s * 0.1, s * 0.13, s * 0.11, col);
  blob(c, x + s * 0.68, y + s * 0.05 + f * s * 0.1, s * 0.13, s * 0.11, col);
}

function treant(c: Ctx, { x, g, s, f }: P): void {
  const bark = 0x5a3c22;
  const leaf = 0x2e6a32;
  shadow(c, x, g, s * 1.0);
  // rễ chân
  const st = f ? 0.12 : -0.12;
  poly(c, [[x - s * 0.55, g - s * 0.5], [x - s * (0.75 + st), g], [x - s * (0.3 + st), g], [x - s * 0.2, g - s * 0.45]], bark, 1.1, 0.6);
  poly(c, [[x + s * 0.2, g - s * 0.45], [x + s * (0.3 - st), g], [x + s * (0.78 - st), g], [x + s * 0.55, g - s * 0.5]], bark, 1.1, 0.6);
  // thân
  poly(c, [[x - s * 0.62, g - s * 0.35], [x - s * 0.5, g - s * 1.5], [x + s * 0.5, g - s * 1.5], [x + s * 0.65, g - s * 0.35]], bark);
  for (const k of [-0.3, 0, 0.28]) stroke(c, [[x + s * k, g - s * 1.4], [x + s * (k + 0.06), g - s * 0.9], [x + s * (k - 0.04), g - s * 0.45]], s * 0.05, shade(bark, 0.55));
  // tay cành + móng
  const ay = f ? -0.08 : 0.06;
  stroke(c, [[x - s * 0.5, g - s * 1.2], [x - s * 0.95, g - s * (0.95 + ay)], [x - s * 1.15, g - s * (0.6 + ay)]], s * 0.2, bark);
  stroke(c, [[x - s * 1.15, g - s * (0.6 + ay)], [x - s * 1.3, g - s * (0.45 + ay)]], s * 0.07, shade(bark, 0.7));
  stroke(c, [[x + s * 0.5, g - s * 1.2], [x + s * 0.95, g - s * (1.0 - ay)], [x + s * 1.2, g - s * (0.7 - ay)]], s * 0.2, bark);
  stroke(c, [[x + s * 1.2, g - s * (0.7 - ay)], [x + s * 1.38, g - s * (0.58 - ay)]], s * 0.07, shade(bark, 0.7));
  // tán lá tối
  for (const [lx, ly, r] of [[-0.55, 1.75, 0.5], [0.55, 1.75, 0.5], [0, 2.0, 0.6], [-0.25, 1.55, 0.45], [0.3, 1.55, 0.45]] as const)
    blob(c, x + s * lx, g - s * ly, s * r, s * r * 0.85, leaf);
  for (const [lx, ly] of [[-0.35, 2.05], [0.2, 2.25], [0.6, 1.95]] as const) blob(c, x + s * lx, g - s * ly, s * 0.18, s * 0.15, 0x5aa04a);
  // mặt: hốc mắt vàng + miệng
  c.fillStyle = "#1a0f08";
  c.beginPath();
  c.ellipse(x - s * 0.2, g - s * 1.1, s * 0.14, s * 0.1, 0.2, 0, Math.PI * 2);
  c.ellipse(x + s * 0.22, g - s * 1.1, s * 0.14, s * 0.1, -0.2, 0, Math.PI * 2);
  c.fill();
  eye(c, x - s * 0.2, g - s * 1.1, s * 0.06, 0xffd030);
  eye(c, x + s * 0.22, g - s * 1.1, s * 0.06, 0xffd030);
  poly(c, [[x - s * 0.25, g - s * 0.8], [x + s * 0.25, g - s * 0.8], [x + s * 0.15, g - s * 0.62], [x - s * 0.15, g - s * 0.62]], 0x1a0f08, 1, 1);
  c.fillStyle = "#e8d8a8";
  for (const k of [-0.15, 0, 0.13]) c.fillRect(x + s * k, g - s * 0.8, s * 0.06, s * 0.07);
}

// ---------------------------------------------------------------- ĐỀN CỔ
function gargoyle(c: Ctx, { x, g, s, f, col }: P): void {
  const st = col;
  shadow(c, x, g, s * 0.7);
  // cánh dơi đá
  const wy = f ? -0.25 : 0;
  for (const d of [-1, 1]) {
    poly(c, [[x + d * s * 0.25, g - s * 1.1], [x + d * s * 1.15, g - s * (1.65 + wy)], [x + d * s * 1.05, g - s * (1.1 + wy * 0.5)], [x + d * s * 0.9, g - s * (1.2 + wy * 0.5)], [x + d * s * 0.75, g - s * (0.85 + wy * 0.3)], [x + d * s * 0.3, g - s * 0.75]], shade(st, 0.75));
  }
  // chân ngồi xổm
  blob(c, x - s * 0.35, g - s * 0.22, s * 0.28, s * 0.22, shade(st, 0.85));
  blob(c, x + s * 0.4, g - s * 0.22, s * 0.28, s * 0.22, shade(st, 0.85));
  // thân + đầu
  blob(c, x, g - s * 0.65, s * 0.55, s * 0.5, st);
  blob(c, x + s * 0.1, g - s * 1.25, s * 0.42, s * 0.36, st);
  // sừng
  for (const d of [-1, 1]) poly(c, [[x + s * (0.1 + d * 0.22), g - s * 1.5], [x + s * (0.1 + d * 0.45), g - s * 1.95], [x + s * (0.1 + d * 0.08), g - s * 1.55]], 0xcfc4a8);
  // vết nứt
  stroke(c, [[x - s * 0.2, g - s * 0.9], [x - s * 0.05, g - s * 0.7], [x - s * 0.18, g - s * 0.5]], s * 0.04, shade(st, 0.5));
  eye(c, x - s * 0.06, g - s * 1.27, s * 0.07, 0xff3a3a);
  eye(c, x + s * 0.28, g - s * 1.27, s * 0.07, 0xff3a3a);
  // tay móng
  blob(c, x + s * 0.55, g - s * 0.55, s * 0.17, s * 0.14, shade(st, 0.9));
  c.fillStyle = "#e8e0d0";
  for (const k of [0, 0.1]) c.fillRect(x + s * (0.62 + k), g - s * 0.48, s * 0.05, s * 0.1);
}

function lich(c: Ctx, { x, g, s, f, col }: P): void {
  const robe = 0x3a2050;
  const bob = f ? -s * 0.08 : 0;
  shadow(c, x, g, s * 0.8);
  glow(c, x, g - s * 1.2 + bob, s * 1.5, col, 0.16);
  // áo choàng rách bay lơ lửng
  poly(c, [[x - s * 0.45, g - s * 1.6 + bob], [x + s * 0.45, g - s * 1.6 + bob], [x + s * 0.85, g - s * 0.2 + bob], [x + s * 0.55, g - s * 0.35 + bob], [x + s * 0.3, g - s * 0.05 + bob], [x, g - s * 0.3 + bob], [x - s * 0.3, g - s * 0.02 + bob], [x - s * 0.55, g - s * 0.32 + bob], [x - s * 0.85, g - s * 0.15 + bob]], robe, 1.4, 0.6);
  poly(c, [[x - s * 0.12, g - s * 1.5 + bob], [x + s * 0.12, g - s * 1.5 + bob], [x + s * 0.08, g - s * 0.4 + bob], [x - s * 0.08, g - s * 0.4 + bob]], 0xd0a040, 1.2, 0.7);
  // mũ trùm + sọ
  poly(c, [[x - s * 0.5, g - s * 1.45 + bob], [x, g - s * 2.3 + bob], [x + s * 0.5, g - s * 1.45 + bob]], shade(robe, 1.2));
  blob(c, x + s * 0.05, g - s * 1.7 + bob, s * 0.3, s * 0.3, 0xe8e0c8);
  c.fillStyle = "#120818";
  c.fillRect(x - s * 0.15, g - s * 1.78 + bob, s * 0.14, s * 0.12);
  c.fillRect(x + s * 0.1, g - s * 1.78 + bob, s * 0.14, s * 0.12);
  eye(c, x - s * 0.08, g - s * 1.72 + bob, s * 0.04, col);
  eye(c, x + s * 0.17, g - s * 1.72 + bob, s * 0.04, col);
  c.fillStyle = "#e8e0c8";
  for (const k of [-0.1, 0, 0.1]) c.fillRect(x + s * (0.02 + k), g - s * 1.52 + bob, s * 0.06, s * 0.09);
  // vương miện vàng
  poly(c, [[x - s * 0.28, g - s * 1.95 + bob], [x - s * 0.22, g - s * 2.2 + bob], [x - s * 0.1, g - s * 2.02 + bob], [x + s * 0.05, g - s * 2.28 + bob], [x + s * 0.18, g - s * 2.02 + bob], [x + s * 0.32, g - s * 2.2 + bob], [x + s * 0.36, g - s * 1.95 + bob]], 0xf0c040);
  // gậy + quả cầu
  stroke(c, [[x + s * 0.75, g - s * 0.1 + bob], [x + s * 0.85, g - s * 2.0 + bob]], s * 0.08, 0x4a3020);
  glow(c, x + s * 0.86, g - s * 2.15 + bob, s * 0.5, col, 0.6);
  blob(c, x + s * 0.86, g - s * 2.15 + bob, s * 0.18, s * 0.18, col);
  // tay xương
  blob(c, x + s * 0.72, g - s * 1.05 + bob, s * 0.1, s * 0.1, 0xe8e0c8);
  blob(c, x - s * 0.62, g - s * 0.95 + bob - (f ? s * 0.1 : 0), s * 0.1, s * 0.1, 0xe8e0c8);
}

// ---------------------------------------------------------------- SA MẠC
function scorpion(c: Ctx, { x, g, s, f, col }: P): void {
  shadow(c, x, g, s * 0.95);
  // 6 chân
  for (let i = 0; i < 3; i++) {
    const lx = x - s * 0.45 + i * s * 0.32;
    const k = (i + f) % 2 ? 0.1 : -0.1;
    stroke(c, [[lx, g - s * 0.45], [lx - s * (0.2 + k), g - s * 0.3], [lx - s * (0.28 + k), g]], s * 0.09, shade(col, 0.6));
    stroke(c, [[lx + s * 0.1, g - s * 0.4], [lx + s * (0.25 - k), g - s * 0.22], [lx + s * (0.3 - k), g]], s * 0.09, shade(col, 0.75));
  }
  // đuôi cong qua lưng (các đốt)
  const tl = f ? 0.08 : 0;
  const seg: Pt[] = [[-0.6, 0.55], [-0.85, 0.85], [-0.9, 1.2], [-0.75, 1.5], [-0.45, 1.68 + tl], [-0.15, 1.6 + tl]];
  seg.forEach(([sx, sy], i) => blob(c, x + s * sx, g - s * sy, s * (0.2 - i * 0.015), s * (0.17 - i * 0.012), col));
  poly(c, [[x - s * 0.05, g - s * (1.66 + tl)], [x + s * 0.22, g - s * (1.45 + tl)], [x - s * 0.05, g - s * (1.48 + tl)]], 0x3a1a10);
  // thân đốt
  blob(c, x - s * 0.25, g - s * 0.5, s * 0.42, s * 0.25, col);
  blob(c, x + s * 0.2, g - s * 0.52, s * 0.35, s * 0.26, col);
  for (const k of [-0.4, -0.15, 0.1]) stroke(c, [[x + s * k, g - s * 0.72], [x + s * k, g - s * 0.32]], s * 0.03, shade(col, 0.6));
  // càng
  const cl = f ? 0.06 : -0.04;
  stroke(c, [[x + s * 0.4, g - s * 0.5], [x + s * 0.7, g - s * 0.62]], s * 0.1, col);
  blob(c, x + s * 0.88, g - s * (0.68 + cl), s * 0.22, s * 0.15, col, -0.3);
  poly(c, [[x + s * 0.95, g - s * (0.78 + cl)], [x + s * 1.22, g - s * (0.9 + cl)], [x + s * 1.05, g - s * (0.68 + cl)]], shade(col, 0.9));
  poly(c, [[x + s * 0.98, g - s * (0.6 + cl)], [x + s * 1.2, g - s * (0.55 + cl)], [x + s * 1.02, g - s * (0.7 + cl)]], shade(col, 0.8));
  eye(c, x + s * 0.38, g - s * 0.68, s * 0.05, 0x1a0a0a);
  eye(c, x + s * 0.48, g - s * 0.66, s * 0.05, 0x1a0a0a);
}

function sandworm(c: Ctx, { x, g, s, f, col }: P): void {
  shadow(c, x, g, s * 1.1);
  // ụ cát
  blob(c, x, g - s * 0.12, s * 1.15, s * 0.3, 0xd8b070);
  // thân đốt cong vươn lên
  const sway = f ? 0.1 : -0.05;
  const seg: Pt[] = [[-0.55, 0.25], [-0.6, 0.6], [-0.48, 0.95], [-0.25, 1.25], [0.05 + sway, 1.48], [0.35 + sway, 1.6]];
  seg.forEach(([sx, sy], i) => {
    const r = s * (0.42 - i * 0.01);
    blob(c, x + s * sx, g - s * sy, r, r * 0.9, i % 2 ? col : shade(col, 0.88));
    stroke(c, [[x + s * sx - r * 0.8, g - s * sy + r * 0.3], [x + s * sx + r * 0.8, g - s * sy - r * 0.2]], s * 0.04, shade(col, 0.55), 0.8);
  });
  // gai lưng
  for (const [sx, sy] of seg.slice(1, 5)) poly(c, [[x + s * (sx - 0.25), g - s * (sy + 0.3)], [x + s * (sx - 0.38), g - s * (sy + 0.6)], [x + s * (sx - 0.08), g - s * (sy + 0.38)]], 0x6a4020);
  // miệng tròn đầy răng
  const mx = x + s * (0.62 + sway);
  const my = g - s * 1.62;
  blob(c, mx, my, s * 0.32, s * 0.42, shade(col, 0.95));
  c.fillStyle = "#3a0a0a";
  c.beginPath();
  c.ellipse(mx + s * 0.06, my, s * 0.2, s * 0.3, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#f0e8d0";
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const tx = mx + s * 0.06 + Math.cos(a) * s * 0.2;
    const ty = my + Math.sin(a) * s * 0.3;
    c.beginPath();
    c.moveTo(tx, ty);
    c.lineTo(tx - Math.cos(a) * s * 0.12 + Math.sin(a) * s * 0.04, ty - Math.sin(a) * s * 0.12 - Math.cos(a) * s * 0.04);
    c.lineTo(tx - Math.cos(a) * s * 0.12 - Math.sin(a) * s * 0.04, ty - Math.sin(a) * s * 0.12 + Math.cos(a) * s * 0.04);
    c.fill();
  }
  glow(c, mx + s * 0.06, my, s * 0.14, 0xff5020, 0.7);
  // cát bắn
  c.fillStyle = css(0xe8c890);
  for (const [px, py] of [[-1.0, 0.35], [0.9, 0.3], [1.05, 0.5], [-0.85, 0.55]] as const) c.fillRect(x + s * px, g - s * (py + f * 0.08), s * 0.08, s * 0.08);
}

// ---------------------------------------------------------------- LÀNG HOANG
function bandit(c: Ctx, { x, g, s, f }: P): void {
  const cloth = 0x6a4a30;
  shadow(c, x, g, s * 0.5);
  const st = f ? 0.12 : -0.12;
  // chân
  poly(c, [[x - s * 0.25, g - s * 0.5], [x - s * (0.32 + st), g], [x - s * (0.08 + st), g], [x - s * 0.02, g - s * 0.5]], 0x3a2a20);
  poly(c, [[x + s * 0.02, g - s * 0.5], [x + s * (0.1 - st), g], [x + s * (0.34 - st), g], [x + s * 0.27, g - s * 0.5]], 0x2e2218);
  // thân áo + thắt lưng
  poly(c, [[x - s * 0.38, g - s * 1.15], [x + s * 0.38, g - s * 1.15], [x + s * 0.42, g - s * 0.45], [x - s * 0.42, g - s * 0.45]], cloth);
  c.fillStyle = "#2a1a10";
  c.fillRect(x - s * 0.42, g - s * 0.66, s * 0.84, s * 0.1);
  c.fillStyle = "#d0a040";
  c.fillRect(x - s * 0.06, g - s * 0.67, s * 0.12, s * 0.12);
  // đầu chibi trùm mũ + khăn đỏ che mặt
  poly(c, [[x - s * 0.5, g - s * 1.2], [x - s * 0.1, g - s * 2.05], [x + s * 0.52, g - s * 1.25]], 0x4a3424);
  blob(c, x + s * 0.03, g - s * 1.48, s * 0.4, s * 0.36, 0xe8b890);
  poly(c, [[x - s * 0.38, g - s * 1.45], [x + s * 0.43, g - s * 1.45], [x + s * 0.4, g - s * 1.18], [x - s * 0.35, g - s * 1.18]], 0xb02a2a);
  poly(c, [[x - s * 0.36, g - s * 1.72], [x + s * 0.42, g - s * 1.72], [x + s * 0.42, g - s * 1.6], [x - s * 0.36, g - s * 1.6]], 0x3a2618);
  c.fillStyle = "#1a1010";
  c.fillRect(x - s * 0.08, g - s * 1.58, s * 0.1, s * 0.1);
  c.fillRect(x + s * 0.18, g - s * 1.58, s * 0.1, s * 0.1);
  // tay + dao găm
  const ay = f ? -0.06 : 0.04;
  blob(c, x + s * 0.48, g - s * (0.85 + ay), s * 0.12, s * 0.12, 0xe8b890);
  poly(c, [[x + s * 0.52, g - s * (0.9 + ay)], [x + s * 1.0, g - s * (1.15 + ay)], [x + s * 0.56, g - s * (0.8 + ay)]], 0xd8e0e8, 1.3, 0.8);
  blob(c, x - s * 0.45, g - s * 0.82, s * 0.12, s * 0.12, 0xe8b890);
}

function warlord(c: Ctx, { x, g, s, f, col }: P): void {
  const steel = 0x6a7280;
  shadow(c, x, g, s * 0.95);
  // áo choàng đỏ phía sau
  poly(c, [[x - s * 0.55, g - s * 1.45], [x + s * 0.35, g - s * 1.45], [x + s * 0.2, g - s * 0.2], [x - s * 0.9, g - s * 0.1]], 0x9a2020, 1.2, 0.6);
  const st = f ? 0.1 : -0.1;
  // chân giáp
  poly(c, [[x - s * 0.4, g - s * 0.6], [x - s * (0.48 + st), g], [x - s * (0.12 + st), g], [x - s * 0.08, g - s * 0.6]], shade(steel, 0.8));
  poly(c, [[x + s * 0.08, g - s * 0.6], [x + s * (0.14 - st), g], [x + s * (0.5 - st), g], [x + s * 0.42, g - s * 0.6]], shade(steel, 0.7));
  // thân to
  blob(c, x, g - s * 1.0, s * 0.62, s * 0.55, col);
  poly(c, [[x - s * 0.45, g - s * 1.3], [x + s * 0.5, g - s * 1.3], [x + s * 0.4, g - s * 0.62], [x - s * 0.4, g - s * 0.62]], steel);
  c.fillStyle = "#3a2010";
  c.fillRect(x - s * 0.45, g - s * 0.75, s * 0.92, s * 0.12);
  // giáp vai gai
  for (const d of [-1, 1]) {
    blob(c, x + d * s * 0.55, g - s * 1.38, s * 0.28, s * 0.2, steel);
    for (const k of [-0.12, 0.08]) poly(c, [[x + d * s * (0.5 + k), g - s * 1.5], [x + d * s * (0.55 + k), g - s * 1.78], [x + d * s * (0.62 + k), g - s * 1.5]], 0xd8d0c0);
  }
  // đầu + mũ sừng
  blob(c, x + s * 0.05, g - s * 1.72, s * 0.3, s * 0.28, 0xb08060);
  poly(c, [[x - s * 0.3, g - s * 1.75], [x - s * 0.25, g - s * 2.02], [x + s * 0.35, g - s * 2.02], [x + s * 0.4, g - s * 1.75]], steel);
  for (const d of [-1, 1]) poly(c, [[x + s * (0.05 + d * 0.3), g - s * 1.9], [x + s * (0.05 + d * 0.62), g - s * 2.35], [x + s * (0.05 + d * 0.38), g - s * 1.8]], 0xe8dcc0);
  eye(c, x - s * 0.04, g - s * 1.72, s * 0.045, 0xff3a1a);
  eye(c, x + s * 0.16, g - s * 1.72, s * 0.045, 0xff3a1a);
  // rìu lớn
  const ay = f ? -0.1 : 0;
  stroke(c, [[x + s * 0.55, g - s * (0.5 + ay)], [x + s * 0.95, g - s * (2.0 + ay)]], s * 0.1, 0x4a3020);
  poly(c, [[x + s * 0.85, g - s * (1.65 + ay)], [x + s * 1.35, g - s * (2.05 + ay)], [x + s * 1.4, g - s * (1.55 + ay)], [x + s * 0.95, g - s * (1.45 + ay)]], 0xc8d0d8, 1.3, 0.75);
  blob(c, x + s * 0.6, g - s * (0.95 + ay), s * 0.15, s * 0.14, 0xb08060);
}

// ---------------------------------------------------------------- NÚI TUYẾT
function yeti(c: Ctx, { x, g, s, f, col }: P, king: boolean): void {
  const fur = col;
  const face = 0x6a9ad8;
  shadow(c, x, g, s * (king ? 0.95 : 0.6));
  const st = f ? 0.1 : -0.1;
  // chân
  blob(c, x - s * (0.32 + st), g - s * 0.15, s * 0.24, s * 0.16, shade(fur, 0.85));
  blob(c, x + s * (0.32 - st), g - s * 0.15, s * 0.24, s * 0.16, shade(fur, 0.8));
  // thân lông xù
  blob(c, x, g - s * 0.85, s * (king ? 0.75 : 0.62), s * (king ? 0.75 : 0.68), fur);
  for (const [lx, ly] of [[-0.55, 0.6], [0.55, 0.65], [-0.4, 1.3], [0.42, 1.3], [0, 0.25]] as const) blob(c, x + s * lx, g - s * ly, s * 0.18, s * 0.15, shade(fur, 1.05));
  if (king) for (const k of [-0.35, -0.05, 0.25]) poly(c, [[x + s * (k - 0.1), g - s * 1.45], [x + s * (k - 0.25), g - s * 1.95], [x + s * (k + 0.1), g - s * 1.5]], 0x9ad8ff, 1.4, 0.8);
  // mặt xanh
  blob(c, x + s * 0.12, g - s * 1.05, s * 0.36, s * 0.3, face);
  eye(c, x - s * 0.02, g - s * 1.1, s * 0.06, king ? 0xffe040 : 0x101828);
  eye(c, x + s * 0.26, g - s * 1.1, s * 0.06, king ? 0xffe040 : 0x101828);
  c.fillStyle = "#1a2030";
  c.fillRect(x + s * 0.02, g - s * 0.92, s * 0.22, s * 0.07);
  c.fillStyle = "#ffffff";
  c.fillRect(x + s * 0.04, g - s * 0.92, s * 0.06, s * 0.06);
  c.fillRect(x + s * 0.16, g - s * 0.92, s * 0.06, s * 0.06);
  // sừng nhỏ
  for (const d of [-1, 1]) poly(c, [[x + s * (0.12 + d * 0.3), g - s * 1.35], [x + s * (0.12 + d * 0.45), g - s * 1.62], [x + s * (0.12 + d * 0.18), g - s * 1.38]], 0xe8e0d0);
  // tay to
  const ay = f ? -0.08 : 0.04;
  blob(c, x - s * 0.72, g - s * (0.72 + ay), s * 0.24, s * 0.3, shade(fur, 0.92));
  blob(c, x + s * 0.75, g - s * (0.7 - ay), s * 0.26, s * 0.3, shade(fur, 0.95));
  if (king) {
    // vương miện băng
    poly(c, [[x - s * 0.2, g - s * 1.55], [x - s * 0.12, g - s * 1.9], [x + s * 0.02, g - s * 1.65], [x + s * 0.15, g - s * 2.0], [x + s * 0.28, g - s * 1.65], [x + s * 0.4, g - s * 1.9], [x + s * 0.46, g - s * 1.55]], 0x7ad0ff, 1.5, 0.8);
  }
}

// ---------------------------------------------------------------- BĂNG NGUYÊN
function iceWolf(c: Ctx, { x, g, s, f, col }: P): void {
  shadow(c, x, g, s * 0.85);
  const st = f ? 0.14 : -0.14;
  // 4 chân
  for (const [lx, d, k] of [[-0.5, 1, 0.75], [-0.3, -1, 0.9], [0.35, -1, 0.75], [0.55, 1, 0.9]] as const)
    stroke(c, [[x + s * lx, g - s * 0.55], [x + s * (lx + d * st * 0.6), g - s * 0.25], [x + s * (lx + d * st), g - s * 0.02]], s * 0.17, shade(col, k));
  // đuôi
  const tl = f ? 0.1 : -0.05;
  poly(c, [[x - s * 0.65, g - s * 0.85], [x - s * 1.1, g - s * (1.05 + tl)], [x - s * 1.25, g - s * (0.85 + tl)], [x - s * 0.7, g - s * 0.65]], col);
  // thân
  blob(c, x - s * 0.05, g - s * 0.75, s * 0.72, s * 0.32, col);
  blob(c, x - s * 0.05, g - s * 0.62, s * 0.55, s * 0.16, shade(col, 1.25));
  // gai băng trên lưng
  for (const k of [-0.45, -0.2, 0.05, 0.28]) poly(c, [[x + s * (k - 0.08), g - s * 0.98], [x + s * (k - 0.02), g - s * 1.32], [x + s * (k + 0.1), g - s * 0.98]], 0xc8f0ff, 1.4, 0.85);
  // đầu sói
  blob(c, x + s * 0.68, g - s * 1.0, s * 0.3, s * 0.26, col);
  poly(c, [[x + s * 0.78, g - s * 1.05], [x + s * 1.18, g - s * 0.95], [x + s * 1.15, g - s * 0.82], [x + s * 0.8, g - s * 0.82]], shade(col, 1.1));
  c.fillStyle = "#1a2030";
  c.fillRect(x + s * 1.1, g - s * 0.98, s * 0.08, s * 0.07);
  for (const d of [0, 0.18]) poly(c, [[x + s * (0.5 + d), g - s * 1.15], [x + s * (0.55 + d), g - s * 1.45], [x + s * (0.66 + d), g - s * 1.18]], shade(col, 0.85));
  eye(c, x + s * 0.8, g - s * 1.06, s * 0.05, 0x40d0ff);
}

function frostWyrm(c: Ctx, { x, g, s, f, col }: P): void {
  shadow(c, x, g, s * 1.15);
  const wy = f ? -0.3 : 0;
  // cánh sau
  poly(c, [[x - s * 0.2, g - s * 1.1], [x - s * 1.2, g - s * (2.1 + wy)], [x - s * 1.3, g - s * (1.4 + wy * 0.5)], [x - s * 1.05, g - s * (1.5 + wy * 0.5)], [x - s * 0.95, g - s * (1.05 + wy * 0.3)], [x - s * 0.5, g - s * 0.85]], shade(col, 0.7));
  // đuôi
  stroke(c, [[x - s * 0.5, g - s * 0.5], [x - s * 1.0, g - s * 0.35], [x - s * 1.3, g - s * (0.55 + (f ? 0.1 : 0))]], s * 0.2, col);
  poly(c, [[x - s * 1.25, g - s * 0.6], [x - s * 1.5, g - s * 0.8], [x - s * 1.38, g - s * 0.45]], 0xc8f0ff);
  // chân
  const st = f ? 0.08 : -0.08;
  blob(c, x - s * (0.35 + st), g - s * 0.2, s * 0.2, s * 0.2, shade(col, 0.8));
  blob(c, x + s * (0.35 - st), g - s * 0.2, s * 0.2, s * 0.2, shade(col, 0.75));
  // thân + bụng vảy
  blob(c, x, g - s * 0.7, s * 0.72, s * 0.5, col);
  blob(c, x + s * 0.12, g - s * 0.58, s * 0.45, s * 0.3, 0xd8f4ff);
  for (const k of [-0.1, 0.1, 0.3]) stroke(c, [[x + s * k, g - s * 0.78], [x + s * (k + 0.12), g - s * 0.4]], s * 0.03, 0x8ab8d8);
  // cổ + đầu rồng
  stroke(c, [[x + s * 0.4, g - s * 0.95], [x + s * 0.65, g - s * 1.45], [x + s * 0.75, g - s * 1.75]], s * 0.32, col);
  blob(c, x + s * 0.9, g - s * 1.88, s * 0.34, s * 0.25, col);
  poly(c, [[x + s * 0.95, g - s * 1.95], [x + s * 1.45, g - s * 1.82], [x + s * 1.4, g - s * 1.7], [x + s * 0.95, g - s * 1.72]], shade(col, 1.1));
  c.fillStyle = "#f0f8ff";
  for (const k of [1.05, 1.18, 1.31]) c.fillRect(x + s * k, g - s * 1.72, s * 0.05, s * 0.08);
  // sừng băng
  for (const k of [0, 0.2]) poly(c, [[x + s * (0.68 + k), g - s * 2.05], [x + s * (0.5 + k), g - s * 2.5], [x + s * (0.82 + k), g - s * 2.1]], 0xc8f0ff, 1.4, 0.8);
  eye(c, x + s * 1.0, g - s * 1.93, s * 0.06, 0x5affff);
  // hơi băng
  glow(c, x + s * 1.55, g - s * 1.76, s * 0.35, 0xc8f8ff, 0.55);
  // cánh trước
  poly(c, [[x + s * 0.1, g - s * 1.1], [x - s * 0.5, g - s * (2.25 + wy)], [x - s * 0.55, g - s * (1.55 + wy * 0.5)], [x - s * 0.3, g - s * (1.6 + wy * 0.5)], [x - s * 0.25, g - s * (1.15 + wy * 0.3)]], col, 1.3, 0.8);
  c.fillStyle = css(0xe8fcff);
  for (const [px, py] of [[1.7, 1.95], [1.85, 1.65], [1.65, 1.5]] as const) c.fillRect(x + s * px, g - s * py, s * 0.06, s * 0.06);
}

const DRAW: Record<string, (c: Ctx, p: P) => void> = {
  m_wisp: wisp,
  b_treant: treant,
  m_gargoyle: gargoyle,
  b_lich: lich,
  m_scorpion: (c, p) => scorpion(c, { ...p, s: p.s * 1.2 }),
  b_sandworm: sandworm,
  m_bandit: bandit,
  b_warlord: warlord,
  m_yeti: (c, p) => yeti(c, p, false),
  b_yeti_king: (c, p) => yeti(c, p, true),
  m_ice_wolf: (c, p) => iceWolf(c, { ...p, s: p.s * 1.15 }),
  b_frost_wyrm: frostWyrm,
};

/** Đơn vị vẽ (px trên texture): quái nhỏ vẽ to hơn kích thước va chạm để đủ chi tiết pixel. */
function drawUnit(def: MonsterDef): number {
  return def.isBoss ? def.size : 32;
}

/** Hệ số phóng khi hiển thị trong trận (quái nhỏ to hơn trước để dễ nhìn bên cạnh anh hùng). */
export function monsterDisplayScale(def: MonsterDef): number {
  return ((def.isBoss ? 1.55 : 2.15) * def.size) / drawUnit(def);
}

/** Kích thước khung (vuông) của texture quái; gốc ảnh (0.5, 0.5) ≈ chính giữa thân. */
export function monsterFrameSize(def: MonsterDef): number {
  return Math.ceil(drawUnit(def) * 3.6);
}

/** Texture quái ở khung `frame` (0/1). Mặt đất nằm dưới tâm 1 đơn vị kích thước – khớp vị trí cũ. */
export function monsterTexture(scene: Phaser.Scene, def: MonsterDef, frame = 0): string {
  const key = `mon2_${def.id}_${frame}`;
  const s = drawUnit(def);
  const size = monsterFrameSize(def);
  const draw = DRAW[def.id];
  return pixelTex(scene, key, size, size, (c) => {
    const p: P = { x: size / 2, g: size / 2 + s * 0.95, s, f: frame, col: def.color };
    if (draw) draw(c, p);
    else {
      shadow(c, p.x, p.g, s * 0.8);
      blob(c, p.x, p.g - s * 0.8, s * 0.9, s * 0.8, def.color);
      eye(c, p.x - s * 0.3, p.g - s * 0.9, s * 0.1, 0xffe060);
      eye(c, p.x + s * 0.3, p.g - s * 0.9, s * 0.1, 0xffe060);
    }
  });
}

export function makeMonsterTextures(scene: Phaser.Scene): void {
  for (const m of MONSTERS) for (const f of [0, 1]) monsterTexture(scene, m, f);
}
