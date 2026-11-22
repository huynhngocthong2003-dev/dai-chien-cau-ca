/**
 * Cá phong cách vector hoạt hình (bóng bẩy, viền cùng tông màu, vảy sáng, mắt to long lanh).
 * Thân dựng quanh một "xương sống" cong → mỗi loài một dáng (xem fishMorph.ts), tự canh vừa khung.
 */
import type { FishAppearance, FishDef } from "@dccc/shared";
import { fishMorph, type FishMorph } from "./fishMorph.ts";
import { rgba, shade } from "./color.ts";

type Pt = { x: number; y: number };
const W = 320;
const H = 200;

interface Geo {
  m: FishMorph;
  a: FishAppearance;
  /** Mẫu dọc xương sống: điểm, pháp tuyến (hướng lưng), độ dày lưng / bụng. */
  spine: { p: Pt; n: Pt; t: Pt; up: number; lo: number }[];
  bodyH: number;
  nose: Pt;
  noseTop: Pt;
  noseBot: Pt;
  outline: Pt[];
}

const N = 64;

function buildGeo(m: FishMorph, a: FishAppearance): Geo {
  const bodyH = 100;
  const L = bodyH * m.aspect;
  // độ dày: t^p (1-t)^c chuẩn hoá – c nhỏ → mõm tù
  const c = Math.max(0.22, Math.min(0.95, 0.62 - 0.32 * (m.head - 1)));
  const p = (c * m.peak) / (1 - m.peak);
  const peakVal = Math.pow(m.peak, p) * Math.pow(1 - m.peak, c);
  const hu = Math.sqrt(m.hump);
  const stalk = m.tail === "whip" || m.tail === "flame" ? 0.1 : 0.17;
  const spine: Geo["spine"] = [];
  const pos = (t: number): Pt => ({
    x: (t - 0.5) * L,
    y: -Math.sin(Math.PI * t) * m.bend * L * 0.22 - Math.sin(Math.PI * 2 * t * 1.15 + 0.6) * m.wave * bodyH * 1.1,
  });
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const pt = pos(t);
    const a1 = pos(Math.max(0, t - 0.01));
    const a2 = pos(Math.min(1, t + 0.01));
    const dx = a2.x - a1.x;
    const dy = a2.y - a1.y;
    const len = Math.hypot(dx, dy) || 1;
    const tan = { x: dx / len, y: dy / len };
    const n = { x: tan.y, y: -tan.x }; // hướng lưng (lên trên khi cá nằm ngang)
    const s = (Math.pow(t, p) * Math.pow(1 - t, c)) / peakVal;
    const thick = (bodyH / 2) * (stalk * (1 - t) + (1 - stalk * (1 - t)) * s);
    spine.push({ p: pt, n, t: tan, up: thick * hu, lo: thick / hu });
  }
  const end = spine[N]!;
  const capLen = bodyH * (m.snout === "pointed" ? 0.2 : m.snout === "duck" ? 0.28 : m.snout === "sword" ? 0.16 : 0.08 + 0.05 * m.head);
  const lift = m.snout === "upturned" ? bodyH * 0.12 : 0;
  const nose = { x: end.p.x + end.t.x * capLen + end.n.x * lift, y: end.p.y + end.t.y * capLen + end.n.y * lift };
  // điểm ngay sau mõm để bo tròn đầu
  const near = spine[N - 3]!;
  const noseTop = { x: near.p.x + near.n.x * near.up, y: near.p.y + near.n.y * near.up };
  const noseBot = { x: near.p.x - near.n.x * near.lo, y: near.p.y - near.n.y * near.lo };
  const outline: Pt[] = [];
  for (let i = 0; i <= N - 3; i++) {
    const s = spine[i]!;
    outline.push({ x: s.p.x + s.n.x * s.up, y: s.p.y + s.n.y * s.up });
  }
  outline.push(nose);
  for (let i = N - 3; i >= 0; i--) {
    const s = spine[i]!;
    outline.push({ x: s.p.x - s.n.x * s.lo, y: s.p.y - s.n.y * s.lo });
  }
  return { m, a, spine, bodyH, nose, noseTop, noseBot, outline };
}

/** Đường cong mượt qua các điểm (trung điểm bậc 2). */
function smooth(pts: Pt[], close = true): Path2D {
  const path = new Path2D();
  if (pts.length < 3) return path;
  const mid = (a: Pt, b: Pt) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const first = close ? mid(pts[pts.length - 1]!, pts[0]!) : pts[0]!;
  path.moveTo(first.x, first.y);
  const n = close ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    const mm = mid(a, b);
    path.quadraticCurveTo(a.x, a.y, mm.x, mm.y);
  }
  if (!close) {
    const last = pts[pts.length - 1]!;
    path.lineTo(last.x, last.y);
  }
  if (close) path.closePath();
  return path;
}

const at = (g: Geo, t: number) => g.spine[Math.max(0, Math.min(N, Math.round(t * N)))]!;
const topAt = (g: Geo, t: number, k = 1): Pt => {
  const s = at(g, t);
  return { x: s.p.x + s.n.x * s.up * k, y: s.p.y + s.n.y * s.up * k };
};
const botAt = (g: Geo, t: number, k = 1): Pt => {
  const s = at(g, t);
  return { x: s.p.x - s.n.x * s.lo * k, y: s.p.y - s.n.y * s.lo * k };
};

/** Chuyển điểm theo hệ (gốc, trục dọc u, trục ngang v). */
function frame(o: Pt, u: Pt, v: Pt) {
  return (x: number, y: number): Pt => ({ x: o.x + u.x * x + v.x * y, y: o.y + u.y * x + v.y * y });
}

// ---------------------------------------------------------------- vây
function tailShape(g: Geo): Pt[] {
  const s = g.spine[0]!;
  const back = { x: -s.t.x, y: -s.t.y };
  const T = g.bodyH * 0.62 * g.m.tailSize;
  const st = Math.max(s.up, s.lo, g.bodyH * 0.08);
  const f = frame({ x: s.p.x + s.t.x * 6, y: s.p.y + s.t.y * 6 }, back, s.n);
  switch (g.m.tail) {
    case "fork":
      return [f(0, st), f(T * 0.55, T * 0.55), f(T * 1.05, T * 0.95), f(T * 0.8, T * 0.5), f(T * 0.42, 0), f(T * 0.8, -T * 0.5), f(T * 1.05, -T * 0.95), f(T * 0.55, -T * 0.55), f(0, -st)];
    case "round":
      return [f(0, st), f(T * 0.4, T * 0.6), f(T * 0.85, T * 0.55), f(T * 1.05, T * 0.2), f(T * 1.05, -T * 0.2), f(T * 0.85, -T * 0.55), f(T * 0.4, -T * 0.6), f(0, -st)];
    case "fan":
      return [f(0, st), f(T * 0.5, T * 0.7), f(T * 1.0, T * 1.0), f(T * 1.15, T * 0.55), f(T * 0.95, T * 0.25), f(T * 1.2, 0), f(T * 0.95, -T * 0.25), f(T * 1.15, -T * 0.55), f(T * 1.0, -T * 1.0), f(T * 0.5, -T * 0.7), f(0, -st)];
    case "lunate":
      return [f(0, st * 0.7), f(T * 0.45, T * 0.5), f(T * 0.95, T * 1.1), f(T * 0.62, T * 0.4), f(T * 0.52, 0), f(T * 0.62, -T * 0.4), f(T * 0.95, -T * 1.1), f(T * 0.45, -T * 0.5), f(0, -st * 0.7)];
    case "split":
      return [f(0, st), f(T * 0.6, T * 0.9), f(T * 1.0, T * 0.75), f(T * 0.7, T * 0.2), f(T * 0.35, 0), f(T * 0.7, -T * 0.2), f(T * 1.0, -T * 0.75), f(T * 0.6, -T * 0.9), f(0, -st)];
    case "whip":
      return [f(0, st), f(T * 0.6, T * 0.3), f(T * 1.2, 0), f(T * 0.6, -T * 0.3), f(0, -st)];
    case "flame":
      return [f(0, st), f(T * 0.5, T * 0.5), f(T * 0.75, T * 0.3), f(T * 1.15, T * 0.55), f(T * 0.95, T * 0.1), f(T * 1.3, -T * 0.05), f(T * 0.9, -T * 0.25), f(T * 1.1, -T * 0.6), f(T * 0.55, -T * 0.45), f(0, -st)];
  }
}

function dorsalShape(g: Geo): Pt[] | null {
  const k = g.m.dorsal;
  if (k === "none") return null;
  const D = g.bodyH * 0.42 * g.m.dorsalSize;
  const tube = g.m.aspect > 6;
  const [t0, t1] = tube ? [0.12, 0.85] : k === "low" ? [0.3, 0.6] : k === "sail" ? [0.3, 0.72] : [0.28, 0.7];
  const pts: Pt[] = [];
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const t = t0 + ((t1 - t0) * i) / steps;
    const u = i / steps;
    let h: number;
    switch (k) {
      case "spiky":
        h = D * (0.35 + 0.75 * Math.sin(Math.PI * u)) * (i % 2 === 0 ? 1 : 0.35);
        break;
      case "sail":
        h = D * 1.25 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.15)), 0.8) * (0.5 + u * 0.6);
        break;
      case "wave":
        h = D * 0.42 * (0.6 + 0.4 * Math.sin(u * Math.PI * 6)) * Math.sin(Math.PI * u);
        break;
      case "low":
        h = D * 0.55 * Math.sin(Math.PI * u);
        break;
      case "double":
        h = D * 0.8 * Math.abs(Math.sin(Math.PI * 2 * u)) * (0.6 + 0.4 * u);
        break;
      case "crest":
        h = D * (0.35 + 0.35 * Math.abs(Math.sin(u * Math.PI * 5))) * Math.sin(Math.PI * Math.min(1, u * 1.1));
        break;
    }
    // ngả về phía đuôi cho có hướng bơi
    const s = at(g, t);
    const base = topAt(g, t, 0.92);
    pts.push({ x: base.x + s.n.x * h - s.t.x * h * 0.35, y: base.y + s.n.y * h - s.t.y * h * 0.35 });
  }
  pts.push(topAt(g, t1 - 0.04, 0.6), topAt(g, t0 + 0.04, 0.6));
  return pts;
}

function smallFin(o: Pt, dir: Pt, side: Pt, len: number, wid: number): Pt[] {
  const f = frame(o, dir, side);
  return [f(0, -wid * 0.5), f(len * 0.55, -wid * 0.75), f(len, -wid * 0.15), f(len * 0.9, wid * 0.45), f(len * 0.35, wid * 0.55), f(0, wid * 0.4)];
}

function finRays(ctx: CanvasRenderingContext2D, base: Pt, pts: Pt[], color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.globalAlpha = 0.55;
  for (let i = 1; i < pts.length - 1; i += 1) {
    const e = pts[i]!;
    ctx.beginPath();
    ctx.moveTo(base.x + (e.x - base.x) * 0.12, base.y + (e.y - base.y) * 0.12);
    ctx.lineTo(base.x + (e.x - base.x) * 0.85, base.y + (e.y - base.y) * 0.85);
    ctx.stroke();
  }
  ctx.restore();
}

function paintFin(ctx: CanvasRenderingContext2D, pts: Pt[], base: Pt, a: FishAppearance, outline: string) {
  const path = smooth(pts);
  let minX = Infinity;
  let maxX = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
  }
  const gr = ctx.createLinearGradient(minX, 0, maxX, 0);
  gr.addColorStop(0, shade(a.fin, 0.28));
  gr.addColorStop(1, shade(a.fin, -0.08));
  ctx.fillStyle = gr;
  ctx.fill(path);
  finRays(ctx, base, pts, shade(a.fin, 0.45));
  ctx.lineWidth = 3.2;
  ctx.strokeStyle = outline;
  ctx.stroke(path);
}

// ---------------------------------------------------------------- vẽ
function bounds(g: Geo, extra: Pt[][]): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  const rot = (g.m.tilt * Math.PI) / 180;
  const cs = Math.cos(-rot);
  const sn = Math.sin(-rot);
  for (const arr of [g.outline, ...extra])
    for (const p of arr) {
      const x = p.x * cs - p.y * sn;
      const y = p.x * sn + p.y * cs;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  return { x0, y0, x1, y1 };
}

export function drawVectorFish(ctx: CanvasRenderingContext2D, fish: Pick<FishDef, "id" | "appearance">) {
  const a = fish.appearance;
  const m = fishMorph(fish.id, a);
  const g = buildGeo(m, a);
  const outline = shade(a.body, -0.52);
  const tail = tailShape(g);
  const dorsal = dorsalShape(g);
  // vây bụng (sau) & vây hậu môn
  const ventT = at(g, 0.3);
  const vent = smallFin(botAt(g, 0.3, 0.9), { x: -ventT.t.x * 0.6 - ventT.n.x * 0.8, y: -ventT.t.y * 0.6 - ventT.n.y * 0.8 }, ventT.t, g.bodyH * 0.38, g.bodyH * 0.28);
  const pelT = at(g, 0.55);
  const pelvic = smallFin(botAt(g, 0.55, 0.92), { x: -pelT.t.x * 0.4 - pelT.n.x * 0.9, y: -pelT.t.y * 0.4 - pelT.n.y * 0.9 }, pelT.t, g.bodyH * 0.34, g.bodyH * 0.22);
  // vây ngực (trước, đè lên thân)
  const pecS = at(g, 0.7);
  const pecO = { x: pecS.p.x - pecS.n.x * pecS.lo * 0.25, y: pecS.p.y - pecS.n.y * pecS.lo * 0.25 };
  const pectoral = smallFin(pecO, { x: -pecS.t.x * 0.75 - pecS.n.x * 0.65, y: -pecS.t.y * 0.75 - pecS.n.y * 0.65 }, pecS.t, g.bodyH * 0.42 * m.pectoral, g.bodyH * 0.3 * m.pectoral);
  const tube = m.aspect > 6;
  // mõm kiếm / đầu búa / râu / mồi câu – để canh khung
  const end = g.spine[N]!;
  const extras: Pt[][] = [tail, dorsal ?? [], vent, pelvic];
  const sword = m.snout === "sword" ? [g.nose, { x: g.nose.x + end.t.x * g.bodyH * 1.1, y: g.nose.y + end.t.y * g.bodyH * 1.1 }] : null;
  if (sword) extras.push(sword);
  const headS = at(g, 0.86);
  const hammer =
    m.snout === "hammer"
      ? (() => {
          const c0 = at(g, 0.94);
          const half = g.bodyH * 0.58;
          return { c: c0.p, n: c0.n, t: c0.t, half, w: g.bodyH * 0.24 };
        })()
      : null;
  if (hammer) extras.push([{ x: hammer.c.x + hammer.n.x * hammer.half, y: hammer.c.y + hammer.n.y * hammer.half }, { x: hammer.c.x - hammer.n.x * hammer.half, y: hammer.c.y - hammer.n.y * hammer.half }]);
  if (m.whiskers) extras.push([{ x: g.nose.x, y: g.nose.y + g.bodyH * 0.9 }]);
  if (m.lure || a.horns) extras.push([{ x: headS.p.x + headS.n.x * g.bodyH * 1.05, y: headS.p.y + headS.n.y * g.bodyH * 1.05 }]);

  const b = bounds(g, extras);
  const pad = 14;
  const sc = Math.min((W - pad * 2) / (b.x1 - b.x0), (H - pad * 2) / (b.y1 - b.y0));
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(sc, sc);
  ctx.rotate((-m.tilt * Math.PI) / 180);
  // canh giữa (trong hệ đã xoay)
  const rot = (m.tilt * Math.PI) / 180;
  const mx = (b.x0 + b.x1) / 2;
  const my = (b.y0 + b.y1) / 2;
  ctx.translate(-(mx * Math.cos(rot) - my * Math.sin(rot)), -(mx * Math.sin(rot) + my * Math.cos(rot)));
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const body = smooth(g.outline);
  if (a.glow) {
    ctx.save();
    ctx.shadowColor = a.glow;
    ctx.shadowBlur = 28;
    ctx.fillStyle = rgba(a.glow, 0.5);
    ctx.fill(body);
    ctx.restore();
  }
  // lớp sau: đuôi, vây lưng, vây bụng
  paintFin(ctx, tail, g.spine[0]!.p, a, outline);
  if (dorsal) paintFin(ctx, dorsal, at(g, 0.5).p, a, outline);
  if (!tube) {
    paintFin(ctx, vent, botAt(g, 0.3), a, outline);
    paintFin(ctx, pelvic, botAt(g, 0.55), a, outline);
  }
  if (sword) {
    const s0 = sword[0]!;
    const s1 = sword[1]!;
    const nrm = end.n;
    const w = g.bodyH * 0.07;
    const sp = new Path2D();
    sp.moveTo(s0.x + nrm.x * w, s0.y + nrm.y * w);
    sp.lineTo(s1.x, s1.y);
    sp.lineTo(s0.x - nrm.x * w, s0.y - nrm.y * w);
    sp.closePath();
    ctx.fillStyle = shade(a.fin, 0.3);
    ctx.fill(sp);
    ctx.lineWidth = 3;
    ctx.strokeStyle = outline;
    ctx.stroke(sp);
  }

  // thân: gradient từ lưng sáng → bụng
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of g.outline) {
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const gr = ctx.createLinearGradient(0, minY, 0, maxY);
  gr.addColorStop(0, shade(a.body, 0.22));
  gr.addColorStop(0.55, a.body);
  gr.addColorStop(1, shade(a.body, -0.18));
  ctx.fillStyle = gr;
  ctx.fill(body);
  ctx.save();
  ctx.clip(body);
  // bụng
  const belly: Pt[] = [];
  for (let i = 4; i <= N - 2; i++) belly.push(botAt(g, i / N, -0.05));
  for (let i = N - 2; i >= 4; i--) belly.push(botAt(g, i / N, 1.3));
  ctx.fillStyle = rgba(a.belly, 0.75);
  ctx.fill(smooth(belly));
  // hoa văn
  if (a.pattern === "stripes") {
    ctx.fillStyle = rgba(a.patternColor, 0.8);
    for (let k = 0; k < 4; k++) {
      const t = 0.28 + k * 0.12;
      const s = at(g, t);
      const st = smooth([topAt(g, t - 0.025, 1.2), topAt(g, t + 0.025, 1.2), botAt(g, t + 0.02, 0.5), botAt(g, t - 0.02, 0.5)]);
      ctx.fill(st);
      void s;
    }
  } else if (a.pattern === "spots") {
    ctx.fillStyle = rgba(a.patternColor, 0.85);
    for (let k = 0; k < 9; k++) {
      const t = 0.2 + ((k * 0.61) % 1) * 0.6;
      const q = topAt(g, t, 0.2 + ((k * 0.37) % 1) * 0.6);
      ctx.beginPath();
      ctx.arc(q.x, q.y, g.bodyH * (0.05 + ((k * 0.23) % 1) * 0.05), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // vảy: hàng cung sáng mở về phía đuôi
  if (m.scales) {
    ctx.strokeStyle = "rgba(255,255,255,0.42)";
    ctx.lineWidth = 2;
    const r = g.bodyH * 0.11;
    const step = (r * 1.25) / (g.bodyH * m.aspect);
    let col = 0;
    for (let t = 0.14; t < 0.7; t += step, col++) {
      const s = at(g, t);
      const ang = Math.atan2(s.t.y, s.t.x);
      const rows = Math.ceil((s.up + s.lo) / (r * 1.5));
      for (let j = 0; j < rows; j++) {
        const off = -s.lo + (j + (col % 2 ? 0.5 : 0)) * r * 1.5;
        const q = { x: s.p.x + s.n.x * off, y: s.p.y + s.n.y * off };
        ctx.beginPath();
        ctx.arc(q.x, q.y, r, ang - Math.PI / 2, ang + Math.PI / 2);
        ctx.stroke();
      }
    }
  }
  // má / nắp mang sáng
  const head = at(g, 0.84);
  const hr = (head.up + head.lo) * 0.62;
  const hg = ctx.createRadialGradient(head.p.x + head.t.x * hr * 0.3, head.p.y + head.t.y * hr * 0.3 + head.n.y * hr * 0.2, 2, head.p.x, head.p.y, hr * 1.3);
  hg.addColorStop(0, rgba("#ffffff", 0.35));
  hg.addColorStop(1, rgba("#ffffff", 0));
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.arc(head.p.x + head.t.x * hr * 0.4, head.p.y + head.t.y * hr * 0.4, hr * 1.3, 0, Math.PI * 2);
  ctx.fill();
  if (!tube) {
    // đường nắp mang
    const gl = at(g, 0.74);
    ctx.strokeStyle = rgba(shade(a.body, -0.45), 0.75);
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    const ang = Math.atan2(gl.t.y, gl.t.x);
    ctx.arc(gl.p.x - gl.t.x * (gl.up + gl.lo) * 0.25, gl.p.y - gl.t.y * (gl.up + gl.lo) * 0.25, (gl.up + gl.lo) * 0.42, ang - 1.15, ang + 1.15);
    ctx.stroke();
  }
  // bóng loáng
  const gs = at(g, 0.55);
  ctx.save();
  ctx.translate(gs.p.x + gs.n.x * gs.up * 0.55, gs.p.y + gs.n.y * gs.up * 0.55);
  ctx.rotate(Math.atan2(gs.t.y, gs.t.x));
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.beginPath();
  ctx.ellipse(0, 0, g.bodyH * m.aspect * 0.22, gs.up * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.restore(); // hết clip
  ctx.lineWidth = 4;
  ctx.strokeStyle = outline;
  ctx.stroke(body);

  // gai quanh thân (cá nóc…)
  if (a.spikes && a.shape === "puffer") {
    ctx.fillStyle = shade(a.fin, 0.15);
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.2;
    for (let i = 3; i < g.outline.length - 3; i += 5) {
      const p0 = g.outline[i]!;
      const p1 = g.outline[i + 1]!;
      const c0 = at(g, 0.5).p;
      const dx = p0.x - c0.x;
      const dy = p0.y - c0.y;
      const d = Math.hypot(dx, dy) || 1;
      const sp = new Path2D();
      sp.moveTo(p0.x, p0.y);
      sp.lineTo(p0.x + (dx / d) * g.bodyH * 0.14, p0.y + (dy / d) * g.bodyH * 0.14);
      sp.lineTo(p1.x, p1.y);
      ctx.fill(sp);
      ctx.stroke(sp);
    }
  }
  // vây ngực đè lên thân
  paintFin(ctx, pectoral, pecO, a, outline);
  // đầu búa (đè lên mõm)
  if (hammer) {
    const f = frame(hammer.c, hammer.t, hammer.n);
    const bar = smooth([f(-hammer.w, -hammer.half), f(hammer.w * 0.6, -hammer.half * 1.02), f(hammer.w * 1.1, -hammer.half * 0.5), f(hammer.w * 1.3, 0), f(hammer.w * 1.1, hammer.half * 0.5), f(hammer.w * 0.6, hammer.half * 1.02), f(-hammer.w, hammer.half)]);
    const hgr = ctx.createLinearGradient(hammer.c.x + hammer.n.x * hammer.half, hammer.c.y + hammer.n.y * hammer.half, hammer.c.x - hammer.n.x * hammer.half, hammer.c.y - hammer.n.y * hammer.half);
    hgr.addColorStop(0, shade(a.body, 0.25));
    hgr.addColorStop(1, shade(a.body, -0.1));
    ctx.fillStyle = hgr;
    ctx.fill(bar);
    ctx.lineWidth = 4;
    ctx.strokeStyle = outline;
    ctx.stroke(bar);
  }


  // sừng
  if (a.horns && !m.whiskers) {
    for (const k of [0, 1]) {
      const hb = topAt(g, 0.8 + k * 0.06, 0.95);
      const hs = at(g, 0.8 + k * 0.06);
      const tip = { x: hb.x + hs.n.x * g.bodyH * 0.45 - hs.t.x * g.bodyH * 0.35, y: hb.y + hs.n.y * g.bodyH * 0.45 - hs.t.y * g.bodyH * 0.35 };
      const hp = new Path2D();
      hp.moveTo(hb.x - hs.t.x * 8, hb.y - hs.t.y * 8);
      hp.quadraticCurveTo(hb.x + hs.n.x * g.bodyH * 0.3, hb.y + hs.n.y * g.bodyH * 0.3, tip.x, tip.y);
      hp.quadraticCurveTo(hb.x + hs.n.x * g.bodyH * 0.15 + hs.t.x * 10, hb.y + hs.n.y * g.bodyH * 0.15 + hs.t.y * 10, hb.x + hs.t.x * 9, hb.y + hs.t.y * 9);
      hp.closePath();
      ctx.fillStyle = shade("#ffe0b2", -0.05 * k);
      ctx.fill(hp);
      ctx.lineWidth = 3;
      ctx.strokeStyle = outline;
      ctx.stroke(hp);
    }
  }
  // mồi câu (cá lồng đèn)
  if (m.lure) {
    const base = topAt(g, 0.86, 0.95);
    const hs = at(g, 0.86);
    const tip = { x: base.x + hs.n.x * g.bodyH * 0.85 + hs.t.x * g.bodyH * 0.6, y: base.y + hs.n.y * g.bodyH * 0.85 + hs.t.y * g.bodyH * 0.6 };
    ctx.strokeStyle = outline;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.quadraticCurveTo(base.x + hs.n.x * g.bodyH * 1.1, base.y + hs.n.y * g.bodyH * 1.1, tip.x, tip.y);
    ctx.stroke();
    const lg = ctx.createRadialGradient(tip.x, tip.y, 1, tip.x, tip.y, g.bodyH * 0.22);
    lg.addColorStop(0, "#ffffff");
    lg.addColorStop(0.4, a.glow ?? "#fff176");
    lg.addColorStop(1, rgba(a.glow ?? "#fff176", 0));
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, g.bodyH * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }
  drawFace(ctx, g, outline, hammer);
  ctx.restore();
}

function drawFace(ctx: CanvasRenderingContext2D, g: Geo, outline: string, hammer: { c: Pt; n: Pt; t: Pt; half: number; w: number } | null) {
  const { a, m } = g;
  const end = g.spine[N]!;
  // miệng ở mõm
  const mo = { x: g.nose.x - end.t.x * 6 - end.n.x * 4, y: g.nose.y - end.t.y * 6 - end.n.y * 4 };
  const ang = Math.atan2(end.t.y, end.t.x);
  ctx.save();
  ctx.translate(mo.x, mo.y);
  ctx.rotate(ang);
  const s = g.bodyH * 0.1;
  ctx.lineWidth = 3;
  ctx.strokeStyle = outline;
  switch (m.mouth) {
    case "smile":
      ctx.beginPath();
      ctx.arc(-s * 1.2, -s * 0.6, s * 1.1, 0.15 * Math.PI, 0.55 * Math.PI);
      ctx.stroke();
      break;
    case "pout": {
      ctx.fillStyle = shade(a.body, 0.15);
      for (const k of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(s * 0.2, k * s * 0.38, s * 0.55, s * 0.36, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
    case "open":
      ctx.fillStyle = "#5d1a2a";
      ctx.beginPath();
      ctx.ellipse(-s * 0.2, 0, s * 0.55, s * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case "grin":
    case "fangs": {
      const big = m.mouth === "fangs";
      const w = s * (big ? 2.6 : 2);
      const mp = new Path2D();
      mp.moveTo(s * 0.4, -s * 0.15);
      mp.quadraticCurveTo(-w * 0.5, s * (big ? 1.3 : 0.9), -w, -s * 0.3);
      mp.quadraticCurveTo(-w * 0.5, s * 0.1, s * 0.4, -s * 0.15);
      ctx.fillStyle = "#6d1b2b";
      ctx.fill(mp);
      ctx.save();
      ctx.clip(mp);
      ctx.fillStyle = "#ffffff";
      const n = big ? 6 : 5;
      for (let i = 0; i < n; i++) {
        const x = s * 0.3 - (i + 0.5) * (w / n);
        ctx.beginPath();
        ctx.moveTo(x - w / n / 2, -s * 0.4);
        ctx.lineTo(x + w / n / 2, -s * 0.4);
        ctx.lineTo(x, s * (big ? 0.55 : 0.3));
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      ctx.stroke(mp);
      break;
    }
  }
  ctx.restore();
  // râu
  if (m.whiskers) {
    ctx.strokeStyle = shade(a.fin, 0.1);
    ctx.lineWidth = 3;
    for (const k of [1, 0.55]) {
      ctx.beginPath();
      ctx.moveTo(mo.x, mo.y);
      ctx.bezierCurveTo(mo.x + g.bodyH * 0.3 * k, mo.y + g.bodyH * 0.25, mo.x - g.bodyH * 0.15, mo.y + g.bodyH * 0.55 * k, mo.x + g.bodyH * 0.2 * k, mo.y + g.bodyH * 0.85 * k);
      ctx.stroke();
    }
  }
  // mắt
  const eyes: Pt[] = [];
  const r = g.bodyH * 0.11 * m.eyeSize;
  if (hammer) {
    eyes.push({ x: hammer.c.x + hammer.n.x * hammer.half * 0.78 + hammer.t.x * hammer.w * 0.2, y: hammer.c.y + hammer.n.y * hammer.half * 0.78 + hammer.t.y * hammer.w * 0.2 });
  } else {
    const e = at(g, m.aspect > 6 ? 0.93 : 0.86);
    eyes.push({ x: e.p.x + e.n.x * e.up * 0.32 + e.t.x * 2, y: e.p.y + e.n.y * e.up * 0.32 + e.t.y * 2 });
  }
  for (const e of eyes) {
    const rr = hammer ? r * 0.7 : r;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(e.x, e.y, rr, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2.8;
    ctx.strokeStyle = outline;
    ctx.stroke();
    const glowEye = a.eye === "glow";
    const pr = rr * 0.62;
    const px = e.x + end.t.x * rr * 0.25;
    const py = e.y + end.t.y * rr * 0.25;
    if (glowEye) {
      ctx.fillStyle = a.eyeColor;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#14102a";
    ctx.beginPath();
    ctx.arc(px, py, glowEye ? pr * 0.5 : pr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(px + pr * 0.35, py - pr * 0.4, pr * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px - pr * 0.35, py + pr * 0.35, pr * 0.16, 0, Math.PI * 2);
    ctx.fill();
    if (a.eye === "angry") {
      ctx.strokeStyle = outline;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(e.x - rr * 1.1, e.y - rr * 1.25);
      ctx.lineTo(e.x + rr * 0.9, e.y - rr * 0.75);
      ctx.stroke();
    }
  }
}
