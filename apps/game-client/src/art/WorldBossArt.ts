/**
 * BOSS THẾ GIỚI – 7 sinh vật mới (rồng / thuỷ quái × trái cây), VẼ TAY bằng Canvas 2D,
 * KHÔNG dùng dáng cá có sẵn. Cùng phong cách game: nét viền đậm, khối có điểm sáng, mắt to long lanh, màu tươi.
 * Khung 320×200 (như cá), quay mặt sang phải.
 */
import { OUTLINE, rgba, shade } from "./color.ts";

type Pt = { x: number; y: number };
const W = 320;
const H = 200;

// ------------------------------------------------------------------ nét vẽ chung
function ink(c: CanvasRenderingContext2D, p: Path2D, fill: string | CanvasGradient, w = 3) {
  c.fillStyle = fill;
  c.fill(p);
  c.lineWidth = w;
  c.strokeStyle = OUTLINE;
  c.lineJoin = "round";
  c.lineCap = "round";
  c.stroke(p);
}
function lg(c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, stops: string[]) {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  stops.forEach((s, i) => g.addColorStop(i / Math.max(1, stops.length - 1), s));
  return g;
}
function rg(c: CanvasRenderingContext2D, x: number, y: number, r: number, stops: string[]) {
  const g = c.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
  stops.forEach((s, i) => g.addColorStop(i / Math.max(1, stops.length - 1), s));
  return g;
}
function shine(c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = -0.5, a = 0.55) {
  c.save();
  c.fillStyle = `rgba(255,255,255,${a})`;
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  c.fill();
  c.restore();
}
/** Mắt to long lanh kiểu chibi. */
function eye(c: CanvasRenderingContext2D, x: number, y: number, r: number, iris: string, angry = false) {
  const p = new Path2D();
  p.ellipse(x, y, r * 0.9, r, 0, 0, Math.PI * 2);
  ink(c, p, "#ffffff", 2.5);
  const g = c.createRadialGradient(x, y + r * 0.2, r * 0.1, x, y + r * 0.1, r * 0.75);
  g.addColorStop(0, shade(iris, 0.45));
  g.addColorStop(0.7, iris);
  g.addColorStop(1, shade(iris, -0.4));
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(x + r * 0.08, y + r * 0.1, r * 0.66, r * 0.76, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = OUTLINE;
  c.beginPath();
  c.ellipse(x + r * 0.1, y + r * 0.12, r * 0.3, r * 0.42, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#ffffff";
  c.beginPath();
  c.arc(x - r * 0.18, y - r * 0.25, r * 0.24, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(x + r * 0.3, y + r * 0.35, r * 0.1, 0, Math.PI * 2);
  c.fill();
  if (angry) {
    c.strokeStyle = OUTLINE;
    c.lineWidth = 3.5;
    c.beginPath();
    c.moveTo(x - r * 1.0, y - r * 1.25);
    c.lineTo(x + r * 0.9, y - r * 0.75);
    c.stroke();
  }
}
/** Lá nhọn mọc từ (x,y) theo hướng ang. */
function leaf(c: CanvasRenderingContext2D, x: number, y: number, ang: number, len: number, w: number, base: string, tip: string) {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  const p = new Path2D();
  p.moveTo(0, -w / 2);
  p.quadraticCurveTo(len * 0.55, -w, len, 0);
  p.quadraticCurveTo(len * 0.55, w, 0, w / 2);
  p.closePath();
  ink(c, p, lg(c, 0, 0, len, 0, [base, tip]), 2);
  c.strokeStyle = "rgba(255,255,255,.45)";
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(len * 0.12, 0);
  c.lineTo(len * 0.78, 0);
  c.stroke();
  c.restore();
}
function sparkle(c: CanvasRenderingContext2D, x: number, y: number, r: number, col = "#fffde7") {
  c.fillStyle = col;
  c.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const rr = i % 2 ? r * 0.3 : r;
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
  c.fill();
}
function seedDots(c: CanvasRenderingContext2D, pts: Pt[], col = "#1b1530", r = 1.8) {
  c.fillStyle = col;
  for (const p of pts) {
    c.beginPath();
    c.ellipse(p.x, p.y, r, r * 1.5, 0.5, 0, Math.PI * 2);
    c.fill();
  }
}
function aura(c: CanvasRenderingContext2D, col: string, x = W / 2, y = H / 2, r = 170) {
  // quầng sáng ELIP nằm gọn trong khung (không lộ mép chữ nhật khi phóng to)
  void r;
  c.save();
  c.translate(x, y);
  c.scale(1, 0.62);
  const g = c.createRadialGradient(0, 0, 8, 0, 0, 150);
  g.addColorStop(0, rgba(col, 0.45));
  g.addColorStop(1, rgba(col, 0));
  c.fillStyle = g;
  c.beginPath();
  c.arc(0, 0, 150, 0, Math.PI * 2);
  c.fill();
  c.restore();
}
/** Thân ống dọc theo đường (rồng / ớt): trả về đường viền + các điểm giữa & pháp tuyến. */
function tube(spine: Pt[], width: (t: number) => number) {
  const n = spine.length;
  const left: Pt[] = [];
  const right: Pt[] = [];
  const norms: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = spine[Math.max(0, i - 1)]!;
    const b = spine[Math.min(n - 1, i + 1)]!;
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    const L = Math.hypot(dx, dy) || 1;
    dx /= L;
    dy /= L;
    const nx = dy;
    const ny = -dx; // pháp tuyến hướng "lên" (lưng)
    const w = width(i / (n - 1)) / 2;
    left.push({ x: spine[i]!.x + nx * w, y: spine[i]!.y + ny * w });
    right.push({ x: spine[i]!.x - nx * w, y: spine[i]!.y - ny * w });
    norms.push({ x: nx, y: ny });
  }
  const p = new Path2D();
  p.moveTo(left[0]!.x, left[0]!.y);
  for (let i = 1; i < n; i++) {
    const m = { x: (left[i - 1]!.x + left[i]!.x) / 2, y: (left[i - 1]!.y + left[i]!.y) / 2 };
    p.quadraticCurveTo(left[i - 1]!.x, left[i - 1]!.y, m.x, m.y);
  }
  p.lineTo(left[n - 1]!.x, left[n - 1]!.y);
  p.lineTo(right[n - 1]!.x, right[n - 1]!.y);
  for (let i = n - 2; i >= 0; i--) {
    const m = { x: (right[i + 1]!.x + right[i]!.x) / 2, y: (right[i + 1]!.y + right[i]!.y) / 2 };
    p.quadraticCurveTo(right[i + 1]!.x, right[i + 1]!.y, m.x, m.y);
  }
  p.lineTo(right[0]!.x, right[0]!.y);
  p.closePath();
  return { path: p, left, right, norms };
}
function flameTail(c: CanvasRenderingContext2D, x: number, y: number, ang: number, s: number, cols: [string, string, string]) {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  c.scale(s, s);
  cols.forEach((col, k) => {
    const sc = 1 - k * 0.28;
    const p = new Path2D();
    p.moveTo(0, -14 * sc);
    p.bezierCurveTo(-18 * sc, -30 * sc, -34 * sc, -10 * sc, -46 * sc, -26 * sc);
    p.bezierCurveTo(-38 * sc, -6 * sc, -52 * sc, 4 * sc, -44 * sc, 20 * sc);
    p.bezierCurveTo(-30 * sc, 8 * sc, -16 * sc, 26 * sc, 0, 14 * sc);
    p.closePath();
    if (k === 0) ink(c, p, col, 2.5);
    else {
      c.fillStyle = col;
      c.fill(p);
    }
  });
  c.restore();
}

// ------------------------------------------------------------------ 1. Thanh Long Long Vương (Mộc) – rồng phương Đông × thanh long
function drawThanhLong(c: CanvasRenderingContext2D) {
  aura(c, "#76ff03");
  const spine: Pt[] = [];
  for (let i = 0; i <= 26; i++) {
    const t = i / 26;
    spine.push({ x: 34 + t * 214, y: 112 + Math.sin(t * Math.PI * 2.1 + 0.4) * 30 - t * 14 });
  }
  const wid = (t: number) => 10 + 26 * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.62);
  const body = tube(spine, wid);
  // đuôi lửa xanh-đỏ
  flameTail(c, spine[0]!.x + 4, spine[0]!.y, Math.atan2(spine[0]!.y - spine[2]!.y, spine[0]!.x - spine[2]!.x) + Math.PI, 1.05, ["#ff1744", "#ff9100", "#40c4ff"]);
  // gai lá xanh dọc sống lưng
  for (let i = 3; i < 24; i += 2) {
    const p = body.left[i]!;
    const nrm = body.norms[i]!;
    leaf(c, p.x, p.y, Math.atan2(nrm.y, nrm.x) - 0.25, 18 + (i % 4) * 3, 9, "#558b2f", "#c6ff00");
  }
  // chân móng vuốt
  for (const i of [9, 18]) {
    const p = body.right[i]!;
    const leg = new Path2D();
    leg.moveTo(p.x - 6, p.y - 4);
    leg.quadraticCurveTo(p.x - 4, p.y + 18, p.x + 6, p.y + 22);
    leg.lineTo(p.x + 14, p.y + 20);
    leg.quadraticCurveTo(p.x + 8, p.y + 10, p.x + 8, p.y - 4);
    leg.closePath();
    ink(c, leg, "#e91e63", 2.5);
    for (let k = 0; k < 3; k++) {
      c.fillStyle = "#fff8e1";
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.5;
      const cl = new Path2D();
      cl.moveTo(p.x + 4 + k * 4, p.y + 21);
      cl.lineTo(p.x + 8 + k * 4, p.y + 28);
      cl.lineTo(p.x + 9 + k * 4, p.y + 20);
      c.fill(cl);
      c.stroke(cl);
    }
  }
  // thân hồng + bụng trắng hạt đen
  ink(c, body.path, lg(c, 0, 70, 0, 150, ["#ff80ab", "#e91e63", "#ad1457"]), 3);
  const belly: Pt[] = [];
  for (let i = 2; i <= 24; i++) belly.push({ x: (spine[i]!.x + body.right[i]!.x * 1.4) / 2.4, y: (spine[i]!.y + body.right[i]!.y * 1.4) / 2.4 });
  const bel = tube(belly, (t) => 4 + 12 * Math.sin(t * Math.PI));
  c.fillStyle = "#fff5f8";
  c.fill(bel.path);
  seedDots(c, belly.filter((_, i) => i % 2 === 0));
  // vảy thanh long: lá đài hồng đầu xanh
  for (let i = 3; i < 24; i += 3) {
    const p = spine[i]!;
    const nrm = body.norms[i]!;
    leaf(c, p.x - nrm.x * 2, p.y - nrm.y * 2, Math.atan2(nrm.y, nrm.x) + Math.PI * 0.85, 15, 9, "#f06292", "#9ccc65");
  }
  shine(c, spine[14]!.x, spine[14]!.y - 10, 22, 5, -0.2, 0.35);
  // đầu rồng
  const hx = spine[26]!.x + 10;
  const hy = spine[26]!.y - 6;
  // bờm lá
  for (let k = 0; k < 6; k++) leaf(c, hx - 6, hy - 4, Math.PI * (0.75 + k * 0.1), 22 + k * 2, 10, "#7cb342", "#ccff90");
  const head = new Path2D();
  head.moveTo(hx - 22, hy - 14);
  head.quadraticCurveTo(hx - 4, hy - 34, hx + 26, hy - 18);
  head.quadraticCurveTo(hx + 54, hy - 12, hx + 58, hy + 2);
  head.quadraticCurveTo(hx + 56, hy + 14, hx + 36, hy + 16);
  head.quadraticCurveTo(hx + 10, hy + 26, hx - 18, hy + 16);
  head.quadraticCurveTo(hx - 30, hy, hx - 22, hy - 14);
  head.closePath();
  ink(c, head, lg(c, hx, hy - 30, hx, hy + 24, ["#ffc1d9", "#f06292", "#c2185b"]), 3);
  // hàm dưới trắng + răng
  const jaw = new Path2D();
  jaw.moveTo(hx + 10, hy + 10);
  jaw.quadraticCurveTo(hx + 34, hy + 22, hx + 52, hy + 10);
  jaw.quadraticCurveTo(hx + 34, hy + 14, hx + 10, hy + 10);
  ink(c, jaw, "#fff5f8", 2);
  // sừng uốn cong
  for (const [dx, k] of [[-6, 1], [8, 0.85]] as const) {
    const hn = new Path2D();
    hn.moveTo(hx + dx, hy - 26);
    hn.bezierCurveTo(hx + dx - 14, hy - 48 * k, hx + dx - 34, hy - 50 * k, hx + dx - 42, hy - 66 * k);
    hn.bezierCurveTo(hx + dx - 24, hy - 56 * k, hx + dx - 6, hy - 46 * k, hx + dx + 8, hy - 24);
    hn.closePath();
    ink(c, hn, lg(c, hx, hy - 70, hx, hy - 20, ["#fff8e1", "#ffd54f"]), 2.5);
  }
  // râu rồng dài
  c.lineCap = "round";
  for (const [w, col] of [[5, "rgba(255,255,255,.35)"], [2.6, "#ffcdd2"]] as const) {
    c.lineWidth = w;
    c.strokeStyle = col;
    c.beginPath();
    c.moveTo(hx + 50, hy + 4);
    c.bezierCurveTo(hx + 76, hy - 10, hx + 60, hy + 40, hx + 64, hy + 58);
    c.moveTo(hx + 46, hy + 8);
    c.bezierCurveTo(hx + 70, hy + 30, hx + 40, hy + 52, hx + 30, hy + 70);
    c.stroke();
  }
  eye(c, hx + 22, hy - 6, 10, "#ffc400");
  c.fillStyle = OUTLINE;
  c.beginPath();
  c.arc(hx + 52, hy - 6, 2.2, 0, Math.PI * 2);
  c.fill();
  // ngọc bích trên trán
  const gem = new Path2D();
  gem.ellipse(hx + 4, hy - 22, 5, 6.5, 0, 0, Math.PI * 2);
  ink(c, gem, rg(c, hx + 4, hy - 22, 7, ["#b9f6ca", "#00c853"]), 2);
  shine(c, hx + 30, hy - 18, 10, 3.5, -0.3);
}

// ------------------------------------------------------------------ 2. Ớt Hỏa Long (Hỏa) – rồng con thân quả ớt
function drawOtHoa(c: CanvasRenderingContext2D) {
  aura(c, "#ff6d00");
  // cánh dơi lửa phía sau
  for (const [dx, sc, al] of [[-10, 0.9, 0.85], [6, 1, 1]] as const) {
    c.save();
    c.globalAlpha = al;
    c.translate(150 + dx, 82);
    c.scale(sc, sc);
    const wg = new Path2D();
    wg.moveTo(0, 0);
    wg.quadraticCurveTo(-30, -60, -80, -64);
    wg.quadraticCurveTo(-70, -44, -82, -30);
    wg.quadraticCurveTo(-62, -26, -66, -10);
    wg.quadraticCurveTo(-44, -14, -40, 4);
    wg.quadraticCurveTo(-20, -4, 0, 10);
    wg.closePath();
    ink(c, wg, lg(c, -80, -60, 0, 10, ["#ffea00", "#ff6d00", "#d50000"]), 2.5);
    c.restore();
  }
  // thân = quả ớt cong (to ở đầu, nhọn ở đuôi)
  const spine: Pt[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    spine.push({ x: 50 + t * 190, y: 150 - Math.sin(t * Math.PI * 0.9) * 62 + t * 10 });
  }
  const body = tube(spine, (t) => 6 + 62 * Math.pow(t, 0.75));
  flameTail(c, spine[0]!.x + 6, spine[0]!.y, 2.4, 0.75, ["#ff3d00", "#ffab00", "#fff59d"]);
  // chân nhỏ
  for (const i of [9, 14]) {
    const p = body.right[i]!;
    const leg = new Path2D();
    leg.ellipse(p.x + 2, p.y + 8, 7, 11, 0.3, 0, Math.PI * 2);
    ink(c, leg, "#c62828", 2.5);
  }
  ink(c, body.path, lg(c, 0, 50, 0, 180, ["#ff8a80", "#e53935", "#8e0000"]), 3);
  // vệt bóng loáng vỏ ớt
  c.strokeStyle = "rgba(255,255,255,.7)";
  c.lineWidth = 5;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(spine[6]!.x, spine[6]!.y - 8);
  c.quadraticCurveTo(spine[11]!.x, spine[11]!.y - 26, spine[16]!.x, spine[16]!.y - 22);
  c.stroke();
  // bụng kem hạt ớt
  const sd: Pt[] = [];
  for (let i = 6; i < 18; i += 2) sd.push({ x: (spine[i]!.x + body.right[i]!.x) / 2, y: (spine[i]!.y + body.right[i]!.y) / 2 + 4 });
  seedDots(c, sd, "#fff8e1", 2.4);
  // mặt
  const hx = spine[20]!.x - 8;
  const hy = spine[20]!.y - 4;
  eye(c, hx - 6, hy - 8, 11, "#ffab00", true);
  eye(c, hx + 18, hy - 4, 9, "#ffab00", true);
  const m = new Path2D();
  m.moveTo(hx - 4, hy + 16);
  m.quadraticCurveTo(hx + 12, hy + 28, hx + 26, hy + 14);
  m.quadraticCurveTo(hx + 12, hy + 20, hx - 4, hy + 16);
  ink(c, m, "#4e0000", 2);
  for (const dx of [2, 18]) {
    const f = new Path2D();
    f.moveTo(hx + dx, hy + 17);
    f.lineTo(hx + dx + 3, hy + 24);
    f.lineTo(hx + dx + 6, hy + 17);
    ink(c, f, "#ffffff", 1.5);
  }
  // cuống ớt làm sừng + đài lá
  for (const k of [-1, 1]) leaf(c, hx + 4, hy - 30, -Math.PI / 2 + k * 1.15, 26, 13, "#2e7d32", "#76ff03");
  const st = new Path2D();
  st.moveTo(hx, hy - 28);
  st.bezierCurveTo(hx - 6, hy - 60, hx + 30, hy - 74, hx + 30, hy - 50);
  st.bezierCurveTo(hx + 22, hy - 62, hx + 10, hy - 56, hx + 10, hy - 28);
  st.closePath();
  ink(c, st, lg(c, hx, hy - 70, hx, hy - 28, ["#9ccc65", "#2e7d32"]), 2.5);
  for (const [x, y, r] of [[34, 40, 4], [280, 36, 3.5], [24, 120, 3], [300, 120, 3.5]] as const) sparkle(c, x, y, r * 2, "#ffab40");
}

// ------------------------------------------------------------------ 3. Dưa Hấu Hải Quái (Thủy) – bạch tuộc dưa hấu
function drawDuaHau(c: CanvasRenderingContext2D) {
  aura(c, "#40c4ff");
  const cx = 160;
  const cy = 78;
  // xúc tu: vỏ xanh trên, giác hút hồng dưới
  for (let i = 0; i < 6; i++) {
    const x0 = cx - 58 + i * 23;
    const dir = i < 3 ? -1 : 1;
    const tt = new Path2D();
    tt.moveTo(x0 - 9, cy + 34);
    tt.bezierCurveTo(x0 - 10 + dir * 6, cy + 74, x0 + dir * 34, cy + 66, x0 + dir * 30, cy + 104);
    tt.bezierCurveTo(x0 + dir * 22, cy + 112, x0 + dir * 14, cy + 90, x0 + dir * 12, cy + 80);
    tt.bezierCurveTo(x0 + dir * 4, cy + 70, x0 + 10, cy + 60, x0 + 9, cy + 34);
    tt.closePath();
    ink(c, tt, lg(c, x0, cy + 30, x0, cy + 110, ["#43a047", "#1b5e20"]), 2.5);
    c.fillStyle = "#ff8a80";
    for (let k = 0; k < 3; k++) {
      c.beginPath();
      c.arc(x0 + dir * (4 + k * 8), cy + 56 + k * 14, 2.6, 0, Math.PI * 2);
      c.fill();
    }
  }
  // thân tròn vỏ dưa hấu
  const b = new Path2D();
  b.ellipse(cx, cy, 82, 64, 0, 0, Math.PI * 2);
  ink(c, b, rg(c, cx, cy, 86, ["#81c784", "#2e7d32", "#1b5e20"]), 3.5);
  c.save();
  c.clip(b);
  c.strokeStyle = "#1b5e20";
  c.lineWidth = 9;
  for (let i = -3; i <= 3; i++) {
    c.beginPath();
    c.moveTo(cx + i * 26 - 10, cy - 70);
    c.bezierCurveTo(cx + i * 30 + 12, cy - 30, cx + i * 22 - 12, cy + 20, cx + i * 28, cy + 70);
    c.stroke();
  }
  c.restore();
  // mặt = lát dưa hấu đỏ (viền trắng)
  const f = new Path2D();
  f.ellipse(cx + 8, cy + 14, 58, 40, 0, 0, Math.PI * 2);
  ink(c, f, "#f1f8e9", 3);
  const fl = new Path2D();
  fl.ellipse(cx + 8, cy + 16, 50, 33, 0, 0, Math.PI * 2);
  c.fillStyle = rg(c, cx + 8, cy + 16, 55, ["#ff8a80", "#ef5350", "#c62828"]);
  c.fill(fl);
  seedDots(c, [{ x: cx - 30, y: cy + 30 }, { x: cx + 46, y: cy + 30 }, { x: cx - 20, y: cy + 42 }, { x: cx + 36, y: cy + 42 }, { x: cx + 8, y: cy + 46 }], "#1b1530", 2.4);
  eye(c, cx - 12, cy + 8, 13, "#40c4ff");
  eye(c, cx + 28, cy + 8, 13, "#40c4ff");
  const mo = new Path2D();
  mo.moveTo(cx - 2, cy + 30);
  mo.quadraticCurveTo(cx + 9, cy + 42, cx + 20, cy + 30);
  mo.quadraticCurveTo(cx + 9, cy + 34, cx - 2, cy + 30);
  ink(c, mo, "#6d1b1b", 2);
  c.fillStyle = "rgba(255,138,128,.7)";
  c.beginPath();
  c.ellipse(cx - 26, cy + 26, 8, 4, 0, 0, Math.PI * 2);
  c.ellipse(cx + 44, cy + 26, 8, 4, 0, 0, Math.PI * 2);
  c.fill();
  shine(c, cx - 40, cy - 40, 18, 8, -0.6);
  // mầm lá + vòi phun nước
  leaf(c, cx - 4, cy - 60, -2.3, 26, 14, "#43a047", "#b2ff59");
  leaf(c, cx - 4, cy - 60, -0.9, 22, 12, "#66bb6a", "#ccff90");
  c.fillStyle = "rgba(179,229,252,.9)";
  c.strokeStyle = "rgba(1,87,155,.5)";
  c.lineWidth = 1.5;
  for (const [dx, dy, r] of [[0, -78, 6], [-12, -90, 4.5], [12, -92, 4.5], [0, -100, 3.5], [-22, -98, 3], [22, -100, 3]] as const) {
    c.beginPath();
    c.arc(cx - 4 + dx, cy + dy, r, 0, Math.PI * 2);
    c.fill();
    c.stroke();
  }
}

// ------------------------------------------------------------------ 4. Dứa Giáp Long Quy (Kim) – rùa rồng mai dứa
function drawDuaGiap(c: CanvasRenderingContext2D) {
  aura(c, "#ffd600");
  // chân chèo
  for (const [x, y, a] of [[92, 138, 0.5], [214, 140, -0.4], [70, 118, 0.9], [236, 122, -0.8]] as const) {
    c.save();
    c.translate(x, y);
    c.rotate(a);
    const fl = new Path2D();
    fl.ellipse(0, 10, 13, 24, 0, 0, Math.PI * 2);
    ink(c, fl, lg(c, 0, -10, 0, 34, ["#c5e1a5", "#7cb342"]), 2.5);
    c.restore();
  }
  // đuôi nhỏ
  const tl = new Path2D();
  tl.moveTo(64, 124);
  tl.quadraticCurveTo(36, 130, 30, 118);
  tl.quadraticCurveTo(44, 120, 66, 112);
  tl.closePath();
  ink(c, tl, "#8bc34a", 2.5);
  // mai vòm dứa
  const sh = new Path2D();
  sh.moveTo(60, 130);
  sh.bezierCurveTo(60, 40, 250, 40, 250, 130);
  sh.quadraticCurveTo(155, 146, 60, 130);
  sh.closePath();
  ink(c, sh, lg(c, 0, 50, 0, 140, ["#fff59d", "#fbc02d", "#e65100"]), 3.5);
  c.save();
  c.clip(sh);
  // mắt dứa: lưới thoi + gai nhỏ
  c.strokeStyle = "rgba(191,54,12,.75)";
  c.lineWidth = 2.5;
  for (let i = -8; i <= 8; i++) {
    c.beginPath();
    c.moveTo(60 + i * 18, 40);
    c.lineTo(60 + i * 18 + 100, 150);
    c.moveTo(250 - i * 18, 40);
    c.lineTo(250 - i * 18 - 100, 150);
    c.stroke();
  }
  c.fillStyle = "#6d4c41";
  for (let r = 0; r < 5; r++)
    for (let k = 0; k < 9; k++) {
      const x = 74 + k * 20 + (r % 2) * 10;
      const y = 62 + r * 17;
      c.beginPath();
      c.arc(x, y, 2.2, 0, Math.PI * 2);
      c.fill();
    }
  c.restore();
  shine(c, 110, 70, 24, 7, -0.4, 0.5);
  // viền mai vàng kim
  c.strokeStyle = "#ffd600";
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(62, 128);
  c.quadraticCurveTo(155, 144, 248, 128);
  c.stroke();
  // vương miện lá dứa trên đỉnh mai
  for (let k = -3; k <= 3; k++) leaf(c, 150 + k * 4, 56, -Math.PI / 2 + k * 0.3, 30 + (3 - Math.abs(k)) * 7, 10, "#2e7d32", "#9ccc65");
  // đầu rồng
  const hx = 262;
  const hy = 104;
  const nk = new Path2D();
  nk.moveTo(232, 120);
  nk.quadraticCurveTo(248, 100, 262, 96);
  nk.lineTo(266, 122);
  nk.quadraticCurveTo(250, 128, 232, 128);
  nk.closePath();
  ink(c, nk, "#8bc34a", 2.5);
  const hd = new Path2D();
  hd.ellipse(hx + 12, hy, 30, 22, -0.1, 0, Math.PI * 2);
  ink(c, hd, lg(c, hx, hy - 22, hx, hy + 22, ["#dcedc8", "#8bc34a", "#558b2f"]), 3);
  for (const dx of [0, 14]) {
    const hn = new Path2D();
    hn.moveTo(hx + dx, hy - 18);
    hn.quadraticCurveTo(hx + dx - 10, hy - 40, hx + dx - 2, hy - 46);
    hn.quadraticCurveTo(hx + dx + 2, hy - 32, hx + dx + 8, hy - 18);
    hn.closePath();
    ink(c, hn, lg(c, hx, hy - 46, hx, hy - 18, ["#fff8e1", "#ffd54f"]), 2);
  }
  eye(c, hx + 18, hy - 4, 9, "#ffd600");
  const mo = new Path2D();
  mo.moveTo(hx + 26, hy + 10);
  mo.quadraticCurveTo(hx + 34, hy + 16, hx + 40, hy + 8);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 2.5;
  c.stroke(mo);
  sparkle(c, 120, 92, 4, "#ffffff");
  sparkle(c, 196, 84, 3.5, "#ffffff");
}

// ------------------------------------------------------------------ 5. Sầu Riêng Bạo Ngư (Thổ) – quái cầu gai sầu riêng
function drawSauRieng(c: CanvasRenderingContext2D) {
  aura(c, "#c6a700");
  const cx = 160;
  const cy = 96;
  // 4 chân ngắn
  for (const [x, y] of [[112, 150], [140, 158], [182, 158], [210, 150]] as const) {
    const lgp = new Path2D();
    lgp.ellipse(x, y, 12, 9, 0, 0, Math.PI * 2);
    ink(c, lgp, "#6d4c41", 2.5);
  }
  // gai sầu riêng tua tủa (hình chóp)
  for (let i = 0; i < 26; i++) {
    const t = (i / 26) * Math.PI * 2;
    const ax = Math.cos(t);
    const ay = Math.sin(t);
    const x = cx + ax * 74;
    const y = cy + ay * 60;
    const p = new Path2D();
    p.moveTo(x - ay * 9, y + ax * 9);
    p.lineTo(x + ax * 20, y + ay * 20);
    p.lineTo(x + ay * 9, y - ax * 9);
    p.closePath();
    ink(c, p, lg(c, x, y, x + ax * 20, y + ay * 20, ["#9e9d24", "#cddc39"]), 2);
  }
  const b = new Path2D();
  b.ellipse(cx, cy, 78, 64, 0, 0, Math.PI * 2);
  ink(c, b, rg(c, cx, cy, 82, ["#d4e157", "#9e9d24", "#5d4037"]), 3.5);
  // gai nhỏ trên thân
  c.fillStyle = "#827717";
  c.strokeStyle = OUTLINE;
  c.lineWidth = 1.5;
  for (let r = 0; r < 3; r++)
    for (let k = 0; k < 6; k++) {
      const x = cx - 56 + k * 22 + (r % 2) * 11;
      const y = cy - 40 + r * 18;
      const p = new Path2D();
      p.moveTo(x - 5, y + 4);
      p.lineTo(x, y - 6);
      p.lineTo(x + 5, y + 4);
      p.closePath();
      c.fill(p);
      c.stroke(p);
    }
  // vỏ nứt lộ múi vàng kem (miệng)
  const mo = new Path2D();
  mo.moveTo(cx - 34, cy + 22);
  mo.lineTo(cx - 20, cy + 14);
  mo.lineTo(cx - 6, cy + 24);
  mo.lineTo(cx + 8, cy + 14);
  mo.lineTo(cx + 22, cy + 24);
  mo.lineTo(cx + 36, cy + 14);
  mo.quadraticCurveTo(cx + 30, cy + 46, cx, cy + 46);
  mo.quadraticCurveTo(cx - 30, cy + 46, cx - 34, cy + 22);
  mo.closePath();
  ink(c, mo, rg(c, cx, cy + 32, 34, ["#fffde7", "#fdd835", "#f9a825"]), 2.5);
  for (const dx of [-14, 0, 14]) {
    c.strokeStyle = "rgba(245,127,23,.6)";
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(cx + dx, cy + 26);
    c.lineTo(cx + dx, cy + 42);
    c.stroke();
  }
  eye(c, cx - 24, cy - 8, 13, "#ff6f00", true);
  eye(c, cx + 24, cy - 8, 13, "#ff6f00", true);
  shine(c, cx - 46, cy - 36, 14, 6, -0.6, 0.4);
  // đá cuội bay quanh
  c.fillStyle = "#8d6e63";
  for (const [x, y, r] of [[30, 60, 5], [288, 70, 4], [40, 150, 4], [290, 160, 5]] as const) {
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }
}

// ------------------------------------------------------------------ 6. Khế Tinh Thần Ngư (Ánh Sáng) – cá đuối thần cánh sao khế
function drawKheTinh(c: CanvasRenderingContext2D) {
  aura(c, "#fff59d", 160, 100, 190);
  // tia sáng
  c.save();
  c.translate(160, 96);
  c.fillStyle = "rgba(255,245,157,.25)";
  for (let i = 0; i < 12; i++) {
    c.rotate(Math.PI / 6);
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(-8, -120);
    c.lineTo(8, -120);
    c.closePath();
    c.fill();
  }
  c.restore();
  // đuôi dài kết sao
  c.strokeStyle = OUTLINE;
  c.lineWidth = 6;
  c.beginPath();
  c.moveTo(150, 112);
  c.bezierCurveTo(110, 150, 60, 130, 30, 160);
  c.stroke();
  c.strokeStyle = "#fff176";
  c.lineWidth = 3;
  c.stroke();
  // thân = ngôi sao 5 cánh khế (cánh đuối)
  const cx = 168;
  const cy = 96;
  const st = new Path2D();
  const pts: Pt[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5 + 0.1;
    const r = i % 2 ? 40 : 92;
    pts.push({ x: cx + Math.cos(a) * r * 1.25, y: cy + Math.sin(a) * r * 0.82 });
  }
  st.moveTo(pts[0]!.x, pts[0]!.y);
  for (let i = 1; i <= 10; i++) {
    const p = pts[i % 10]!;
    const q = pts[i - 1]!;
    st.quadraticCurveTo((p.x + q.x) / 2 + (cx - (p.x + q.x) / 2) * 0.12, (p.y + q.y) / 2 + (cy - (p.y + q.y) / 2) * 0.12, p.x, p.y);
  }
  st.closePath();
  ink(c, st, rg(c, cx, cy, 100, ["#fffde7", "#ffee58", "#f9a825"]), 3.5);
  // gân khế từ tâm ra các cánh
  c.strokeStyle = "rgba(245,127,23,.6)";
  c.lineWidth = 2.5;
  for (let i = 0; i < 10; i += 2) {
    c.beginPath();
    c.moveTo(cx, cy);
    c.lineTo(pts[i]!.x * 0.85 + cx * 0.15, pts[i]!.y * 0.85 + cy * 0.15);
    c.stroke();
  }
  // lõi hạt khế ở giữa
  const core = new Path2D();
  core.ellipse(cx, cy + 4, 34, 24, 0, 0, Math.PI * 2);
  ink(c, core, rg(c, cx, cy, 34, ["#ffffff", "#fff59d"]), 2.5);
  eye(c, cx - 12, cy, 10, "#ffb300");
  eye(c, cx + 14, cy, 10, "#ffb300");
  const mo = new Path2D();
  mo.moveTo(cx - 6, cy + 16);
  mo.quadraticCurveTo(cx + 1, cy + 22, cx + 8, cy + 16);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 2.5;
  c.stroke(mo);
  c.fillStyle = "rgba(255,171,145,.7)";
  c.beginPath();
  c.ellipse(cx - 24, cy + 12, 6, 3, 0, 0, Math.PI * 2);
  c.ellipse(cx + 26, cy + 12, 6, 3, 0, 0, Math.PI * 2);
  c.fill();
  // hào quang trên đầu
  c.strokeStyle = "#fff176";
  c.lineWidth = 4;
  c.beginPath();
  c.ellipse(cx, cy - 70, 24, 6, 0, 0, Math.PI * 2);
  c.stroke();
  for (let i = 0; i < 6; i++) sparkle(c, 40 + i * 48, 26 + (i % 2) * 140, 4);
  // sao kết đuôi
  const ts = new Path2D();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 5 : 11;
    if (i) ts.lineTo(30 + Math.cos(a) * r, 160 + Math.sin(a) * r);
    else ts.moveTo(30 + Math.cos(a) * r, 160 + Math.sin(a) * r);
  }
  ts.closePath();
  ink(c, ts, "#ffee58", 2);
}

// ------------------------------------------------------------------ 7. Măng Cụt Hắc Mặc Ngư (Bóng Tối) – mực khổng lồ măng cụt
function drawMangCut(c: CanvasRenderingContext2D) {
  aura(c, "#aa00ff");
  // mực tím mờ
  c.fillStyle = "rgba(124,77,255,.28)";
  for (const [x, y, r] of [[40, 50, 20], [52, 150, 16], [290, 40, 14], [300, 160, 12]] as const) {
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }
  const cx = 160;
  const cy = 74;
  // xúc tu: ngoài tím, trong múi trắng
  for (let i = 0; i < 7; i++) {
    const x0 = cx - 54 + i * 18;
    const sway = (i - 3) * 9;
    const tt = new Path2D();
    tt.moveTo(x0 - 8, cy + 40);
    tt.bezierCurveTo(x0 - 10 + sway, cy + 80, x0 + sway * 1.6 - 10, cy + 100, x0 + sway * 2, cy + 120);
    tt.bezierCurveTo(x0 + sway * 1.8 + 8, cy + 112, x0 + sway + 10, cy + 84, x0 + 8, cy + 40);
    tt.closePath();
    ink(c, tt, lg(c, x0, cy + 40, x0, cy + 120, ["#6a1b9a", "#311b92"]), 2.5);
    c.fillStyle = "#f3e5f5";
    for (let k = 0; k < 3; k++) {
      c.beginPath();
      c.ellipse(x0 + sway * (0.4 + k * 0.45), cy + 60 + k * 18, 3.5, 5, 0, 0, Math.PI * 2);
      c.fill();
    }
  }
  // thân măng cụt tròn tím sẫm
  const b = new Path2D();
  b.ellipse(cx, cy, 70, 58, 0, 0, Math.PI * 2);
  ink(c, b, rg(c, cx, cy, 76, ["#ba68c8", "#6a1b9a", "#2a0845"]), 3.5);
  shine(c, cx - 30, cy - 30, 18, 8, -0.6, 0.45);
  // múi trắng bên trong lộ ra (mặt)
  const f = new Path2D();
  f.ellipse(cx + 4, cy + 14, 44, 30, 0, 0, Math.PI * 2);
  ink(c, f, "#4a148c", 2.5);
  for (let k = -2; k <= 2; k++) {
    const seg = new Path2D();
    seg.ellipse(cx + 4 + k * 16, cy + 30, 8, 10, k * 0.18, 0, Math.PI * 2);
    ink(c, seg, rg(c, cx + 4 + k * 16, cy + 30, 10, ["#ffffff", "#e1bee7"]), 1.5);
  }
  eye(c, cx - 14, cy + 6, 12, "#e040fb");
  eye(c, cx + 24, cy + 6, 12, "#e040fb");
  const mo = new Path2D();
  mo.moveTo(cx - 2, cy + 18);
  mo.quadraticCurveTo(cx + 6, cy + 22, cx + 12, cy + 18);
  c.strokeStyle = "#f3e5f5";
  c.lineWidth = 2.5;
  c.stroke(mo);
  // đài lá măng cụt 4 cánh + cuống
  for (const ang of [-2.55, -1.95, -1.2, -0.6]) leaf(c, cx, cy - 54, ang, 24, 18, "#558b2f", "#9ccc65");
  const sk = new Path2D();
  sk.roundRect(cx - 5, cy - 76, 10, 20, 4);
  ink(c, sk, "#33691e", 2);
  for (const [x, y] of [[60, 30], [262, 24], [276, 104]] as const) sparkle(c, x, y, 5, "#ea80fc");
}

const DRAW: Record<string, (c: CanvasRenderingContext2D) => void> = {
  wb_thanh_long: drawThanhLong,
  wb_ot_hoa: drawOtHoa,
  wb_dua_hau: drawDuaHau,
  wb_dua_giap: drawDuaGiap,
  wb_sau_rieng: drawSauRieng,
  wb_khe_tinh: drawKheTinh,
  wb_mang_cut: drawMangCut,
};

export const WORLD_BOSS_IDS = Object.keys(DRAW);

/** Vẽ Boss Thế Giới trong khung 320×200. */
export function drawWorldBoss(ctx: CanvasRenderingContext2D, id: string) {
  ctx.save();
  // thu vào giữa khung để râu / đuôi / xúc tu không bị cắt
  ctx.translate(W / 2, H / 2);
  ctx.scale(0.84, 0.84);
  ctx.translate(-W / 2, -H / 2 + 4);
  DRAW[id]?.(ctx);
  ctx.restore();
}
