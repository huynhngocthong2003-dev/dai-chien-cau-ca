/**
 * HÌNH CÁ LAI & TRỨNG của Đảo Lai Tạo (Canvas 2D, viền đậm, khối nổi, lấp lánh).
 * Chuyển từ bản đồ nguyên mẫu docs/prototypes/dao-lai-tao.html.
 */
import type { BreedLook, EggLook, FishAppearance, FishDef } from "@dccc/shared";
import { fishMorph, type FishMorph } from "./fishMorph.ts";
import { drawVectorFish } from "./VectorFish.ts";

export const INK = "#16223f";
function shadeHex(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(k >= 0 ? c + (255 - c) * k : c * (1 + k))));
  return "#" + ((1 << 24) | (f(r) << 16) | (f(g) << 8) | f(b)).toString(16).slice(1);
}
function stroke(ctx: CanvasRenderingContext2D, w = 4) { ctx.lineWidth = w; ctx.strokeStyle = INK; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke(); }

/** Vẽ một con cá hướng sang phải, tâm (0,0), dài ~140 * s. t = thời gian (giây) cho chuyển động. */
export function drawBreedFish(ctx: CanvasRenderingContext2D, look: BreedLook, s: number, t: number, fierce = false) {
  ctx.save();
  ctx.scale(s, s);
  const L = 70, H = look.shape === "kraken" ? 44 : 36;
  const wag = Math.sin(t * 6) * 0.18;

  // hào quang + vòng cổ ngữ
  if (look.aura) {
    const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 120);
    g.addColorStop(0, look.aura); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 120 + Math.sin(t * 2) * 6, 0, Math.PI * 2); ctx.fill();
  }
  if (look.ring) {
    ctx.save(); ctx.rotate(t * 0.6);
    ctx.setLineDash([10, 8]); ctx.lineWidth = 4; ctx.strokeStyle = look.crack || "#fde047";
    ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.ellipse(0, 0, 108, 92, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ctx.fillStyle = i % 2 ? (look.crack2 || "#fff") : (look.crack || "#fff"); ctx.beginPath(); ctx.arc(Math.cos(a) * 108, Math.sin(a) * 92, 4, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore(); ctx.globalAlpha = 1;
  }

  // cánh (sau thân)
  if (look.wings) {
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(-6, side * 4);
      ctx.rotate(side * (0.25 + Math.sin(t * 3) * 0.12));
      const p = new Path2D();
      p.moveTo(0, 0);
      p.bezierCurveTo(-20, side * -70, -80, side * -86, -96, side * -60);
      p.lineTo(-70, side * -48); p.lineTo(-84, side * -30); p.lineTo(-56, side * -22); p.lineTo(-60, side * -6);
      p.closePath();
      const g = ctx.createLinearGradient(0, 0, -90, side * -80);
      g.addColorStop(0, look.wings.b); g.addColorStop(1, look.wings.a);
      ctx.fillStyle = g; ctx.fill(p); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.lineJoin = "round"; ctx.stroke(p);
      if (look.wings.crystal) {
        ctx.fillStyle = "rgba(255,255,255,.55)";
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-30 - i * 18, side * (-30 - i * 8)); ctx.lineTo(-38 - i * 18, side * (-48 - i * 8)); ctx.lineTo(-24 - i * 18, side * (-40 - i * 8)); ctx.closePath(); ctx.fill(); }
      }
      ctx.restore();
    }
  }

  // xúc tu (kraken)
  if (look.shape === "kraken" && look.tent) {
    for (let i = 0; i < look.tent; i++) {
      const y0 = -22 + (44 * i) / (look.tent - 1);
      const ph = t * 4 + i;
      ctx.beginPath();
      ctx.moveTo(-30, y0);
      ctx.bezierCurveTo(-60, y0 + Math.sin(ph) * 14, -86, y0 * 1.5 + Math.cos(ph) * 18, -112, y0 * 1.9 + Math.sin(ph + 1) * 16);
      ctx.lineWidth = 15; ctx.strokeStyle = INK; ctx.lineCap = "round"; ctx.stroke();
      ctx.lineWidth = 9; ctx.strokeStyle = i % 2 ? look.dark : look.body; ctx.stroke();
      if (look.tentFire) {
        const ex = -112, ey = y0 * 1.9 + Math.sin(ph + 1) * 16;
        ctx.fillStyle = look.tentFire; ctx.beginPath();
        ctx.moveTo(ex, ey); ctx.quadraticCurveTo(ex - 14, ey - 16 - Math.sin(ph * 2) * 6, ex - 22, ey - 4); ctx.quadraticCurveTo(ex - 12, ey + 2, ex, ey + 6); ctx.closePath();
        ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
      }
    }
  }

  // đuôi
  if (look.shape === "fish") {
    ctx.save(); ctx.translate(-L + 8, 0); ctx.rotate(wag);
    const tail = new Path2D();
    if (look.back === "blades" || look.back === "flame") {
      tail.moveTo(0, 0); tail.lineTo(-34, -42); tail.lineTo(-24, -14); tail.lineTo(-50, -10); tail.lineTo(-30, 0); tail.lineTo(-50, 12); tail.lineTo(-24, 14); tail.lineTo(-34, 42); tail.closePath();
    } else {
      tail.moveTo(0, 0); tail.bezierCurveTo(-20, -10, -36, -40, -46, -38); tail.bezierCurveTo(-36, -12, -36, 12, -46, 38); tail.bezierCurveTo(-36, 40, -20, 10, 0, 0);
    }
    ctx.fillStyle = look.fin; ctx.fill(tail); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.lineJoin = "round"; ctx.stroke(tail);
    if (look.plume) {
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.moveTo(-30, i * 8);
        ctx.bezierCurveTo(-60, i * 20 + Math.sin(t * 4 + i) * 6, -80, i * 30, -104, i * 26 + Math.sin(t * 3 + i) * 10);
        ctx.lineWidth = 9; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 5; ctx.strokeStyle = i ? "#ffd54f" : "#ff7043"; ctx.stroke();
      }
    }
    ctx.restore();
  }

  // gai / san hô / lửa trên lưng (sau thân)
  const backY = -H + 6;
  if (look.back === "coral") {
    for (const [x, h] of [[-26, 22], [-6, 30], [16, 22]] as const) {
      ctx.save(); ctx.translate(x, backY);
      const c = new Path2D();
      c.moveTo(-6, 6); c.lineTo(-4, -h * 0.5); c.lineTo(-12, -h * 0.8); c.lineTo(-6, -h * 0.85); c.lineTo(-1, -h * 0.55); c.lineTo(0, -h); c.lineTo(5, -h * 0.6); c.lineTo(11, -h * 0.75); c.lineTo(7, -h * 0.35); c.lineTo(6, 6); c.closePath();
      ctx.fillStyle = look.backColor ?? "#ff3b4f"; ctx.fill(c); ctx.lineWidth = 3.5; ctx.strokeStyle = INK; ctx.stroke(c);
      ctx.restore();
    }
  } else if (look.back === "blades" || look.back === "flame" || look.back === "crystal" || look.back === "spines") {
    const n = look.back === "crystal" ? 5 : 4;
    for (let i = 0; i < n; i++) {
      const x = -34 + i * (64 / (n - 1));
      const h = (look.back === "crystal" ? 34 : 28) * (1 - Math.abs(i - (n - 1) / 2) / n) + 10;
      ctx.save(); ctx.translate(x, backY + 2); ctx.rotate(-0.25);
      const p = new Path2D(); p.moveTo(-8, 6); p.lineTo(0, -h); p.lineTo(8, 6); p.closePath();
      let fill: string | CanvasGradient = look.backColor ? look.backColor : look.back === "blades" ? "#ff5252" : look.back === "flame" ? "#ff9100" : "#7df9ff";
      if (look.back === "crystal") { const g = ctx.createLinearGradient(0, -h, 0, 6); g.addColorStop(0, "#e0fbff"); g.addColorStop(0.5, "#5ee7ff"); g.addColorStop(1, "#a855f7"); fill = g; }
      if (look.back === "flame") { const g = ctx.createLinearGradient(0, -h, 0, 6); g.addColorStop(0, "#ffee58"); g.addColorStop(1, "#ff3d00"); fill = g; }
      ctx.fillStyle = fill; ctx.fill(p); ctx.lineWidth = 3.5; ctx.strokeStyle = INK; ctx.stroke(p);
      if (look.back !== "blades") { ctx.globalAlpha = 0.5 + Math.sin(t * 5 + i) * 0.3; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, -h * 0.55, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
      ctx.restore();
    }
  }

  // thân
  const body = new Path2D();
  if (look.shape === "kraken") {
    body.ellipse(4, 0, L * 0.78, H, 0, 0, Math.PI * 2);
  } else {
    body.moveTo(L, 2);
    body.bezierCurveTo(L - 6, -H, -L * 0.6, -H - 4, -L + 6, -4);
    body.bezierCurveTo(-L * 0.6, H + 2, L - 10, H, L, 2);
  }
  const bg = ctx.createLinearGradient(0, -H, 0, H);
  bg.addColorStop(0, shadeHex(look.body, 0.25)); bg.addColorStop(0.55, look.body); bg.addColorStop(1, look.dark);
  ctx.fillStyle = bg; ctx.fill(body);
  ctx.save(); ctx.clip(body);
  // bụng
  ctx.fillStyle = look.belly; ctx.globalAlpha = 0.85;
  ctx.beginPath(); ctx.ellipse(6, H * 0.62, L * 0.75, H * 0.45, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  // da / vảy / giáp
  if (look.skin === "scales" || !look.skin) {
    ctx.strokeStyle = "rgba(22,34,63,.28)"; ctx.lineWidth = 2;
    for (let x = -40; x < 44; x += 14) for (let y = -22; y < 20; y += 13) { ctx.beginPath(); ctx.arc(x + ((y / 13) % 2 ? 7 : 0), y, 7, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); }
  } else if (look.skin === "plates" || look.skin === "gold") {
    ctx.lineWidth = look.skin === "gold" ? 3 : 2.5;
    ctx.strokeStyle = look.skin === "gold" ? "#ffc107" : "rgba(22,34,63,.45)";
    for (let x = -36; x < 44; x += 18) { ctx.beginPath(); ctx.moveTo(x, -H); ctx.quadraticCurveTo(x + 8, 0, x, H); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-L, -6); ctx.quadraticCurveTo(0, -16, L, -4); ctx.stroke();
    if (look.skin === "gold") { ctx.fillStyle = "#ffd54f"; for (let x = -30; x < 40; x += 18) { ctx.beginPath(); ctx.arc(x + 4, -10, 2.5, 0, Math.PI * 2); ctx.fill(); } }
  } else if (look.skin === "cracked") {
    const glow = 0.6 + Math.sin(t * 3) * 0.35;
    ctx.globalAlpha = glow; ctx.lineWidth = 3;
    const cracks = [[-40, -18, -24, -4, -30, 10], [-10, -26, 0, -8, -8, 14], [18, -20, 28, -2, 20, 18], [40, -10, 50, 4]];
    cracks.forEach((c, i) => {
      const col = (i % 2 ? look.crack2 || look.crack : look.crack) ?? "#ffffff";
      ctx.strokeStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.moveTo(c[0]!, c[1]!); for (let k = 2; k < c.length; k += 2) ctx.lineTo(c[k]!, c[k + 1]!); ctx.stroke();
    });
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }
  // bóng sáng nổi khối
  ctx.fillStyle = "rgba(255,255,255,.35)";
  ctx.beginPath(); ctx.ellipse(10, -H * 0.5, L * 0.5, H * 0.18, -0.08, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.lineWidth = 4.5; ctx.strokeStyle = INK; ctx.lineJoin = "round"; ctx.stroke(body);

  // vây ngực
  ctx.save(); ctx.translate(-2, 10); ctx.rotate(0.5 + Math.sin(t * 5) * 0.25);
  const pf = new Path2D(); pf.moveTo(0, 0); pf.quadraticCurveTo(-22, 8, -26, 24); pf.quadraticCurveTo(-8, 18, 6, 6); pf.closePath();
  ctx.fillStyle = look.fin; ctx.fill(pf); ctx.lineWidth = 3.5; ctx.strokeStyle = INK; ctx.stroke(pf);
  ctx.restore();

  // sừng / vương miện
  const hx = look.shape === "kraken" ? 36 : 40, hy = -H + (look.shape === "kraken" ? 6 : 12);
  if (look.horn === "short") {
    const p = new Path2D(); p.moveTo(hx - 6, hy + 4); p.lineTo(hx + 14, hy - 16); p.lineTo(hx + 6, hy + 8); p.closePath();
    ctx.fillStyle = "#cfd8dc"; ctx.fill(p); stroke(ctx, 3.5); ctx.lineWidth = 3.5; ctx.strokeStyle = INK; ctx.stroke(p);
  } else if (look.horn === "curved") {
    for (const off of [-10, 6]) {
      const p = new Path2D(); p.moveTo(hx + off - 6, hy + 6);
      p.bezierCurveTo(hx + off - 4, hy - 26, hx + off + 26, hy - 34, hx + off + 34, hy - 12);
      p.bezierCurveTo(hx + off + 20, hy - 20, hx + off + 8, hy - 10, hx + off + 6, hy + 8); p.closePath();
      const g = ctx.createLinearGradient(hx, hy - 30, hx, hy + 6); g.addColorStop(0, "#eceff1"); g.addColorStop(1, "#78909c");
      ctx.fillStyle = look.crack ? "#9be9ff" : g; ctx.fill(p); ctx.lineWidth = 3.5; ctx.strokeStyle = INK; ctx.stroke(p);
    }
  } else if (look.horn === "crown") {
    const p = new Path2D(); const cx = hx - 18, cy = hy - 2;
    p.moveTo(cx - 18, cy + 8); p.lineTo(cx - 16, cy - 14); p.lineTo(cx - 8, cy - 2); p.lineTo(cx, cy - 22); p.lineTo(cx + 8, cy - 2); p.lineTo(cx + 16, cy - 14); p.lineTo(cx + 18, cy + 8); p.closePath();
    const g = ctx.createLinearGradient(0, cy - 22, 0, cy + 8); g.addColorStop(0, "#fff59d"); g.addColorStop(1, look.fin === "#fde047" ? "#a855f7" : "#ff6d00");
    ctx.fillStyle = g; ctx.fill(p); ctx.lineWidth = 3.5; ctx.strokeStyle = INK; ctx.stroke(p);
    ctx.fillStyle = "#ff1744"; ctx.beginPath(); ctx.arc(cx, cy - 2, 3.5, 0, Math.PI * 2); ctx.fill();
  }

  // râu
  if (look.whisk) {
    ctx.lineWidth = 3; ctx.strokeStyle = INK;
    for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(L - 6, 8); ctx.bezierCurveTo(L + 10, 14 + k * 4, L + 6, 34 + k * 6, L + 18 + Math.sin(t * 3) * 3, 40 + k * 6); ctx.stroke(); }
  }

  // mắt
  const ex = look.shape === "kraken" ? 34 : 42, ey = look.shape === "kraken" ? -8 : -8;
  if (look.eyeGlow) { ctx.fillStyle = look.eye; ctx.shadowColor = look.eye; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(ex, ey, 11, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ex, ey, 10, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 3.5; ctx.strokeStyle = INK; ctx.stroke();
  ctx.fillStyle = look.eyeGlow ? look.eye : INK; ctx.beginPath(); ctx.arc(ex + 3, ey, 5.5, 0, Math.PI * 2); ctx.fill();
  if (look.eyeGlow) { ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(ex + 3, ey, 1.8, 5, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ex + 1, ey - 3, 2.2, 0, Math.PI * 2); ctx.fill();
  // lông mày ngầu cho bậc cao
  if (fierce) { ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(ex - 12, ey - 14); ctx.lineTo(ex + 10, ey - 8); ctx.stroke(); }
  // miệng / răng
  if (look.shape === "fish") {
    ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(L - 2, 6); ctx.quadraticCurveTo(L - 12, 12, L - 20, 8); ctx.stroke();
    if (look.back === "coral" || look.back === "blades" || look.horn === "crown") { ctx.fillStyle = "#fff"; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(L - 6 - i * 5, 8); ctx.lineTo(L - 8 - i * 5, 13); ctx.lineTo(L - 10 - i * 5, 9); ctx.fill(); } }
  }

  // lấp lánh
  const sp = (t * 1.3) % 1;
  ctx.globalAlpha = Math.sin(sp * Math.PI);
  ctx.fillStyle = "#fff";
  const sx = -20 + sp * 60, sy = -H * 0.6;
  ctx.beginPath(); ctx.moveTo(sx, sy - 7); ctx.lineTo(sx + 2, sy - 2); ctx.lineTo(sx + 7, sy); ctx.lineTo(sx + 2, sy + 2); ctx.lineTo(sx, sy + 7); ctx.lineTo(sx - 2, sy + 2); ctx.lineTo(sx - 7, sy); ctx.lineTo(sx - 2, sy - 2); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}
/** Vẽ trứng tâm (0,0), cao ~110 * s. crack 0..1 = mức nứt. */
export function drawBreedEgg(ctx: CanvasRenderingContext2D, egg: EggLook, s: number, t: number, crack = 0, glow = 0) {
  ctx.save(); ctx.scale(s, s);
  if (glow > 0) { const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 68); g.addColorStop(0, `rgba(255,255,200,${0.7 * glow})`); g.addColorStop(1, "rgba(255,255,200,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 68, 0, Math.PI * 2); ctx.fill(); }
  const p = new Path2D();
  p.moveTo(0, -55); p.bezierCurveTo(34, -55, 44, 10, 40, 26); p.bezierCurveTo(34, 52, -34, 52, -40, 26); p.bezierCurveTo(-44, 10, -34, -55, 0, -55);
  const g = ctx.createLinearGradient(-40, -55, 40, 52); g.addColorStop(0, shadeHex(egg.a, 0.35)); g.addColorStop(0.5, egg.a); g.addColorStop(1, egg.b);
  ctx.fillStyle = g; ctx.fill(p);
  ctx.save(); ctx.clip(p);
  ctx.fillStyle = egg.b; ctx.beginPath();
  ctx.moveTo(-50, 4); for (let x = -50; x <= 50; x += 12) ctx.lineTo(x, 4 + ((x / 12) % 2 ? -8 : 6)); ctx.lineTo(50, 60); ctx.lineTo(-50, 60); ctx.closePath(); ctx.fill();
  ctx.fillStyle = egg.spot; for (const [x, y, r] of [[-14, -26, 7], [16, -12, 5], [-6, 22, 6], [22, 26, 4], [-24, 6, 4]] as const) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = "rgba(255,255,255,.45)"; ctx.beginPath(); ctx.ellipse(-14, -28, 9, 16, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.lineWidth = 4.5; ctx.strokeStyle = INK; ctx.stroke(p);
  if (crack > 0) {
    ctx.lineWidth = 3.5; ctx.strokeStyle = INK; ctx.beginPath();
    const pts: [number, number][] = [[-30, -10], [-18, -2], [-10, -14], [0, -2], [10, -16], [20, -4], [32, -12]];
    const n = Math.min(pts.length, Math.max(2, Math.ceil(pts.length * Math.min(1, crack))));
    ctx.moveTo(pts[0]![0], pts[0]![1]); for (let i = 1; i < n; i++) ctx.lineTo(pts[i]![0], pts[i]![1]); ctx.stroke();
    if (crack > 0.6) { ctx.strokeStyle = "#fffde7"; ctx.lineWidth = 2; ctx.shadowColor = "#fff59d"; ctx.shadowBlur = 12; ctx.stroke(); ctx.shadowBlur = 0; }
  }
  const sp = (t * 0.9) % 1; ctx.globalAlpha = Math.sin(sp * Math.PI); ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(18, -34, 3, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  ctx.restore();
}


/** Toạ độ bản đồ bể nuôi (khung vẽ W×H, gốc ở góc trái trên của vùng bản đồ). */
export const HABITAT = { w: 1240, h: 556, pool: { cx: 470, cy: 286, rx: 440, ry: 246 }, cave: { x: 1080, y: 250 } };

/** Nền tĩnh của bản đồ: biển, đảo cát, bể nuôi (viền đá, cỏ biển), núi đá có cửa hang ấp trứng. */
export function drawHabitatMap(ctx: CanvasRenderingContext2D) {
  const { w, h, pool: P, cave: C } = HABITAT;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#39a8f5");
  g.addColorStop(1, "#1565c0");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, 22);
  ctx.fill();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#fff";
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.ellipse((i * 173) % w, 30 + i * 68, 90, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const sand = (p: Path2D) => {
    ctx.fillStyle = "rgba(0,0,0,.22)";
    ctx.save();
    ctx.translate(0, 10);
    ctx.fill(p);
    ctx.restore();
    const sg = ctx.createLinearGradient(0, 0, 0, h);
    sg.addColorStop(0, "#ffe7a3");
    sg.addColorStop(1, "#f2c25e");
    ctx.fillStyle = sg;
    ctx.fill(p);
    ctx.lineWidth = 5;
    ctx.strokeStyle = INK;
    ctx.stroke(p);
  };
  const island = new Path2D();
  island.ellipse(P.cx, P.cy + 6, P.rx + 34, P.ry + 26, 0, 0, Math.PI * 2);
  sand(island);
  const right = new Path2D();
  right.ellipse(C.x, C.y + 80, 140, 180, 0, 0, Math.PI * 2);
  sand(right);
  // nước bể
  const pool = new Path2D();
  pool.ellipse(P.cx, P.cy, P.rx, P.ry, 0, 0, Math.PI * 2);
  const pg = ctx.createRadialGradient(P.cx - 80, P.cy - 90, 30, P.cx, P.cy, P.rx);
  pg.addColorStop(0, "#7fe3ff");
  pg.addColorStop(0.6, "#22a6e8");
  pg.addColorStop(1, "#0e6fb8");
  ctx.fillStyle = pg;
  ctx.fill(pool);
  ctx.save();
  ctx.clip(pool);
  ctx.strokeStyle = "rgba(255,255,255,.25)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.ellipse(P.cx + (i % 2 ? 40 : -40), P.cy - 170 + i * 62, 200 - i * 10, 10, 0, 0, Math.PI);
    ctx.stroke();
  }
  for (let i = 0; i < 11; i++) {
    const x = P.cx - 330 + i * 66;
    const y = P.cy + P.ry - 24 - (i % 3) * 14;
    ctx.beginPath();
    ctx.moveTo(x, y + 30);
    ctx.quadraticCurveTo(x + (i % 2 ? 12 : -12), y - 20, x + 4, y - 50 - (i % 2) * 14);
    ctx.lineWidth = 10;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = 6;
    ctx.strokeStyle = i % 3 ? "#3cc36b" : "#ff7aa2";
    ctx.stroke();
  }
  ctx.restore();
  ctx.lineWidth = 6;
  ctx.strokeStyle = INK;
  ctx.stroke(pool);
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const x = P.cx + Math.cos(a) * (P.rx + 6);
    const y = P.cy + Math.sin(a) * (P.ry + 6);
    const r = 12 + (i % 3) * 4;
    ctx.fillStyle = i % 2 ? "#9fb3c8" : "#c3d1df";
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.3, r, a, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
  // núi đá + cửa hang
  const { x, y } = C;
  ctx.fillStyle = "rgba(0,0,0,.25)";
  ctx.beginPath();
  ctx.ellipse(x, y + 150, 150, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  const rock = new Path2D();
  rock.moveTo(x - 140, y + 150);
  rock.lineTo(x - 128, y - 10);
  rock.lineTo(x - 90, y - 90);
  rock.lineTo(x - 40, y - 120);
  rock.lineTo(x - 6, y - 170);
  rock.lineTo(x + 40, y - 130);
  rock.lineTo(x + 92, y - 100);
  rock.lineTo(x + 130, y - 20);
  rock.lineTo(x + 142, y + 150);
  rock.closePath();
  const rg = ctx.createLinearGradient(0, y - 170, 0, y + 150);
  rg.addColorStop(0, "#b9a48c");
  rg.addColorStop(1, "#7a6450");
  ctx.fillStyle = rg;
  ctx.fill(rock);
  ctx.lineWidth = 5;
  ctx.strokeStyle = INK;
  ctx.lineJoin = "round";
  ctx.stroke(rock);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(22,34,63,.35)";
  for (const [a1, b1, a2, b2] of [[-100, -40, -70, -20], [60, -80, 90, -50], [-30, -120, -10, -95], [100, 20, 120, 50]] as const) {
    ctx.beginPath();
    ctx.moveTo(x + a1, y + b1);
    ctx.lineTo(x + a2, y + b2);
    ctx.stroke();
  }
  ctx.fillStyle = "#3cc36b";
  for (const [dx, dy] of [[-120, 120], [118, 110], [-6, -164]] as const) {
    ctx.beginPath();
    ctx.ellipse(x + dx, y + dy, 22, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
  const mouth = new Path2D();
  mouth.moveTo(x - 92, y + 150);
  mouth.bezierCurveTo(x - 96, y - 40, x + 96, y - 40, x + 92, y + 150);
  mouth.closePath();
  const mg = ctx.createRadialGradient(x, y + 90, 10, x, y + 70, 150);
  mg.addColorStop(0, "#4b3a7a");
  mg.addColorStop(1, "#140c2a");
  ctx.fillStyle = mg;
  ctx.fill(mouth);
  const glow = ctx.createRadialGradient(x, y + 120, 5, x, y + 110, 110);
  glow.addColorStop(0, "rgba(255,214,110,.4)");
  glow.addColorStop(1, "rgba(255,214,110,0)");
  ctx.fillStyle = glow;
  ctx.fill(mouth);
  ctx.lineWidth = 5;
  ctx.strokeStyle = INK;
  ctx.stroke(mouth);
  ctx.fillStyle = "#c58b4e";
  ctx.beginPath();
  ctx.ellipse(x, y + 140, 86, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

/**
 * TIẾN HOÁ CÁ LAI theo giai trưởng thành (1 Sơ · 2 Trung · 3 Cao · 4 Thánh):
 * mỗi giai thêm đặc điểm rõ rệt (mắt sáng & hào quang → sừng lớn & gai lưng → cánh & giáp vàng/vương miện
 * → vòng cổ ngữ, cánh pha lê, giáp nứt phát quang). Kích thước lớn dần do fishDisplayMult.
 */
export function evolveBreedLook(base: BreedLook, stage: number): BreedLook {
  if (stage <= 1) return base;
  const l: BreedLook = { ...base, wings: base.wings ? { ...base.wings } : undefined };
  // Trung Giai: mắt phát sáng, hào quang, sừng mọc / lớn hơn, gai lưng
  l.eyeGlow = true;
  l.aura = l.aura ?? hexToRgba(l.fin, 0.3);
  l.horn = !l.horn ? "short" : l.horn === "short" ? "curved" : l.horn;
  if (!l.back) {
    l.back = "blades";
    l.backColor = l.fin;
  }
  if (l.shape === "kraken" && l.tent) l.tent = Math.min(8, l.tent + 1);
  if (stage >= 3) {
    // Cao Giai: đôi cánh, giáp cứng (vảy → giáp; giáp → viền vàng), xúc tu lửa
    l.wings = l.wings ?? { a: l.fin, b: l.eye };
    l.skin = l.skin === "scales" || !l.skin ? "plates" : l.skin === "plates" ? "gold" : l.skin;
    if (l.shape === "kraken" && !l.tentFire) l.tentFire = l.eye;
    l.aura = hexToRgba(l.eye.startsWith("#") ? l.eye : "#ffd54f", 0.42);
  }
  if (stage >= 4) {
    // Thánh Giai: vương miện, vòng cổ ngữ, cánh pha lê, giáp nứt phát quang, gai pha lê
    l.horn = "crown";
    l.ring = true;
    l.wings = { ...(l.wings ?? { a: l.fin, b: l.eye }), crystal: true };
    if (l.skin !== "gold") {
      l.skin = "cracked";
      l.crack = l.crack ?? l.eye;
      l.crack2 = l.crack2 ?? l.fin;
    }
    if (l.back !== "coral") {
      l.back = "crystal";
      l.backColor = undefined;
    }
    l.aura = "rgba(255,215,64,.55)";
  }
  return l;
}

function hexToRgba(hex: string, a: number) {
  if (!hex.startsWith("#") || hex.length < 7) return `rgba(255,215,64,${a})`;
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// =====================================================================================
// CÁ LAI THEO BỐ MẸ: đầu & thân trước theo CÁ BỐ, thân sau & đuôi theo CÁ MẸ, màu chuyển
// từ bố sang mẹ, đặc điểm cả hai + trang sức theo bậc lai → dáng mới mang nét của cả hai.
// =====================================================================================

/** Ngoại hình tối thiểu của cá bố / mẹ (FishAppearance của loài, hoặc "kraken"). */
export interface ParentLook {
  shape: string;
  body: string;
  belly: string;
  fin: string;
  pattern?: string;
  patternColor?: string;
  teeth?: boolean;
  horns?: boolean;
  spikes?: boolean;
  eye?: string;
  eyeColor?: string;
  glow?: string | null;
}

interface Profile {
  L: number;
  H: number;
  /** 0 = mõm nhọn (cá mập), 1 = đầu tròn tù. */
  nose: number;
  tail: "fan" | "fork" | "crescent" | "ribbon" | "small" | "tentacles";
  dorsal?: boolean;
  lure?: boolean;
}

const PROFILES: Record<string, Profile> = {
  round: { L: 56, H: 42, nose: 0.9, tail: "fan" },
  long: { L: 78, H: 30, nose: 0.5, tail: "fork" },
  shark: { L: 82, H: 32, nose: 0.1, tail: "crescent", dorsal: true },
  serpent: { L: 94, H: 24, nose: 0.6, tail: "ribbon" },
  eel: { L: 92, H: 22, nose: 0.7, tail: "ribbon" },
  angler: { L: 62, H: 42, nose: 1, tail: "small", lure: true },
  puffer: { L: 52, H: 46, nose: 1, tail: "small" },
  flat: { L: 54, H: 52, nose: 0.8, tail: "fan" },
  kraken: { L: 50, H: 44, nose: 1, tail: "tentacles" },
};

function shadeTo(hex: string, k: number) {
  return hex.startsWith("#") && hex.length >= 7 ? shadeHex(hex.slice(0, 7), k) : hex;
}

export function drawHybridFish(ctx: CanvasRenderingContext2D, father: ParentLook, mother: ParentLook, look: BreedLook, s: number, t: number, fierce = false) {
  const F = PROFILES[father.shape] ?? PROFILES.round!;
  const M = PROFILES[mother.shape] ?? PROFILES.round!;
  ctx.save();
  ctx.scale(s, s);
  // thân lai: dài = trung bình (+10%), đầu cao theo bố, đuôi cao theo mẹ
  const L = ((F.L + M.L) / 2) * 1.1;
  const Hf = F.H;
  const Hm = M.H * 0.9;
  const nose = F.nose;
  const wag = Math.sin(t * 6) * 0.18;

  // hào quang & vòng cổ ngữ (theo bậc)
  if (look.aura) {
    const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 120);
    g.addColorStop(0, look.aura);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 120, 0, Math.PI * 2);
    ctx.fill();
  }
  if (look.ring) {
    ctx.save();
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 4;
    ctx.strokeStyle = look.crack ?? father.fin;
    ctx.beginPath();
    ctx.ellipse(0, 0, L + 30, Math.max(Hf, Hm) + 44, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  // cánh (sau thân)
  if (look.wings) {
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(-6, side * 4);
      ctx.rotate(side * 0.3);
      const p = new Path2D();
      p.moveTo(0, 0);
      p.bezierCurveTo(-20, side * -70, -80, side * -86, -96, side * -60);
      p.lineTo(-70, side * -48);
      p.lineTo(-84, side * -30);
      p.lineTo(-56, side * -22);
      p.lineTo(-60, side * -6);
      p.closePath();
      const g = ctx.createLinearGradient(0, 0, -90, side * -80);
      g.addColorStop(0, look.wings.b);
      g.addColorStop(1, look.wings.a);
      ctx.fillStyle = g;
      ctx.fill(p);
      ctx.lineWidth = 4;
      ctx.strokeStyle = INK;
      ctx.stroke(p);
      ctx.restore();
    }
  }

  // ĐUÔI theo cá mẹ
  const tx = -L + 8;
  ctx.save();
  ctx.translate(tx, 0);
  ctx.rotate(M.tail === "tentacles" ? 0 : wag);
  const tailFill = mother.fin;
  if (M.tail === "tentacles") {
    const n = look.tent ?? 6;
    for (let i = 0; i < n; i++) {
      const y0 = -Hm * 0.6 + (Hm * 1.2 * i) / (n - 1);
      const ph = t * 4 + i;
      ctx.beginPath();
      ctx.moveTo(10, y0);
      ctx.bezierCurveTo(-20, y0 + Math.sin(ph) * 12, -46, y0 * 1.5 + Math.cos(ph) * 14, -72, y0 * 1.8 + Math.sin(ph + 1) * 14);
      ctx.lineWidth = 14;
      ctx.strokeStyle = INK;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.lineWidth = 8;
      ctx.strokeStyle = i % 2 ? shadeTo(mother.body, -0.25) : mother.body;
      ctx.stroke();
      if (look.tentFire) {
        ctx.fillStyle = look.tentFire;
        ctx.beginPath();
        ctx.arc(-72, y0 * 1.8 + Math.sin(ph + 1) * 14, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else {
    const p = new Path2D();
    const k = Hm / 34;
    if (M.tail === "fan") {
      p.moveTo(0, 0);
      p.bezierCurveTo(-18, -16 * k, -34, -40 * k, -44, -34 * k);
      p.quadraticCurveTo(-34, 0, -44, 34 * k);
      p.bezierCurveTo(-34, 40 * k, -18, 16 * k, 0, 0);
    } else if (M.tail === "fork") {
      p.moveTo(0, 0);
      p.lineTo(-30, -34 * k);
      p.lineTo(-48, -40 * k);
      p.lineTo(-26, 0);
      p.lineTo(-48, 40 * k);
      p.lineTo(-30, 34 * k);
      p.closePath();
    } else if (M.tail === "crescent") {
      p.moveTo(0, 0);
      p.quadraticCurveTo(-22, -24 * k, -40, -48 * k);
      p.quadraticCurveTo(-28, 0, -40, 48 * k);
      p.quadraticCurveTo(-22, 24 * k, 0, 0);
    } else if (M.tail === "ribbon") {
      p.moveTo(0, -6);
      p.bezierCurveTo(-30, -14 + Math.sin(t * 4) * 6, -60, 10, -90, -4 + Math.sin(t * 3) * 10);
      p.bezierCurveTo(-60, 22, -30, 4, 0, 6);
      p.closePath();
    } else {
      p.moveTo(0, 0);
      p.lineTo(-22, -18 * k);
      p.lineTo(-18, 0);
      p.lineTo(-22, 18 * k);
      p.closePath();
    }
    ctx.fillStyle = tailFill;
    ctx.fill(p);
    ctx.lineWidth = 4;
    ctx.strokeStyle = INK;
    ctx.lineJoin = "round";
    ctx.stroke(p);
  }
  ctx.restore();

  // vây lưng (cá mập bên nào cũng mọc) & gai của mẹ
  const topAt = (x: number) => {
    const u = (x + L) / (2 * L); // 0 đuôi → 1 mõm
    return -(Hm + (Hf - Hm) * u) * Math.sin(Math.PI * Math.min(1, Math.max(0, u * 0.92 + 0.04)));
  };
  if (F.dorsal || M.dorsal) {
    const x = -L * 0.05;
    const y = topAt(x);
    const d = new Path2D();
    d.moveTo(x - 18, y + 6);
    d.quadraticCurveTo(x - 6, y - 30, x + 10, y - 34);
    d.quadraticCurveTo(x + 4, y - 14, x + 16, y + 6);
    d.closePath();
    ctx.fillStyle = mother.fin;
    ctx.fill(d);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = INK;
    ctx.stroke(d);
  }
  const backKind = look.back ?? (mother.spikes || father.spikes ? "spines" : undefined);
  if (backKind) {
    const n = backKind === "crystal" ? 5 : 4;
    for (let i = 0; i < n; i++) {
      const x = -L * 0.5 + (i * L) / (n - 1);
      const y = topAt(x) + 4;
      const h = (backKind === "crystal" ? 30 : 24) * (1 - Math.abs(i - (n - 1) / 2) / n) + 8;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.25);
      const p = new Path2D();
      if (backKind === "coral") {
        p.moveTo(-6, 6);
        p.lineTo(-4, -h * 0.5);
        p.lineTo(-11, -h * 0.8);
        p.lineTo(-1, -h * 0.55);
        p.lineTo(0, -h);
        p.lineTo(5, -h * 0.6);
        p.lineTo(10, -h * 0.75);
        p.lineTo(6, 6);
      } else {
        p.moveTo(-7, 6);
        p.lineTo(0, -h);
        p.lineTo(7, 6);
      }
      p.closePath();
      let fill: string | CanvasGradient = look.backColor ?? (backKind === "spines" ? mother.fin : backKind === "flame" ? "#ff9100" : backKind === "blades" ? "#ff5252" : "#7df9ff");
      if (backKind === "crystal") {
        const g = ctx.createLinearGradient(0, -h, 0, 6);
        g.addColorStop(0, "#e0fbff");
        g.addColorStop(0.5, "#5ee7ff");
        g.addColorStop(1, "#a855f7");
        fill = g;
      }
      ctx.fillStyle = fill;
      ctx.fill(p);
      ctx.lineWidth = 3.2;
      ctx.strokeStyle = INK;
      ctx.stroke(p);
      ctx.restore();
    }
  }

  // THÂN chimera: mõm theo bố (nhọn/tù), lưng cao dần từ đuôi (mẹ) tới đầu (bố)
  const body = new Path2D();
  const nx = L;
  body.moveTo(nx, 4);
  body.bezierCurveTo(nx - 8 - 30 * nose, -Hf * (0.55 + 0.5 * nose), L * 0.15, -Hf - 2, -L * 0.25, -(Hf + Hm) / 2);
  body.bezierCurveTo(-L * 0.6, -Hm, -L + 4, -Hm * 0.5, -L + 6, -4);
  body.lineTo(-L + 6, 4);
  body.bezierCurveTo(-L + 4, Hm * 0.5, -L * 0.6, Hm, -L * 0.25, (Hf + Hm) / 2);
  body.bezierCurveTo(L * 0.15, Hf + 2, nx - 8 - 30 * nose, Hf * (0.5 + 0.5 * nose), nx, 4);
  body.closePath();
  const bg = ctx.createLinearGradient(L, 0, -L, 0);
  const skinDark = look.skin === "cracked" ? look.dark : null;
  bg.addColorStop(0, skinDark ? shadeTo(father.body, -0.45) : shadeTo(father.body, 0.12));
  bg.addColorStop(0.45, skinDark ? shadeTo(father.body, -0.55) : father.body);
  bg.addColorStop(0.62, skinDark ? shadeTo(mother.body, -0.55) : mother.body);
  bg.addColorStop(1, skinDark ? shadeTo(mother.body, -0.4) : shadeTo(mother.body, -0.15));
  ctx.fillStyle = bg;
  ctx.fill(body);
  ctx.save();
  ctx.clip(body);
  // bụng (theo bố), sọc/đốm hoa văn của bố tô màu vây mẹ → hoa văn mới
  ctx.fillStyle = father.belly;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.ellipse(L * 0.1, Math.max(Hf, Hm) * 0.62, L * 0.8, Math.max(Hf, Hm) * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  const pat = father.pattern && father.pattern !== "none" ? father.pattern : mother.pattern && mother.pattern !== "none" ? mother.pattern : "stripes";
  ctx.strokeStyle = shadeTo(mother.fin, -0.2);
  ctx.fillStyle = shadeTo(mother.fin, -0.1);
  ctx.globalAlpha = 0.55;
  if (pat === "spots") {
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.arc(-L * 0.6 + i * L * 0.2, -Hf * 0.3 + (i % 2) * 10, 4 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (pat === "scales") {
    ctx.lineWidth = 2;
    for (let x = -L + 10; x < L - 10; x += 13) for (let y = -26; y < 22; y += 12) {
      ctx.beginPath();
      ctx.arc(x + ((y / 12) % 2 ? 6 : 0), y, 6, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
  } else {
    ctx.lineWidth = 5;
    for (let x = -L * 0.6; x < L * 0.6; x += 22) {
      ctx.beginPath();
      ctx.moveTo(x, -Hf);
      ctx.quadraticCurveTo(x + 8, 0, x - 2, Hf);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  // giáp / giáp vàng / giáp nứt phát quang (theo bậc)
  if (look.skin === "plates" || look.skin === "gold") {
    ctx.lineWidth = 3;
    ctx.strokeStyle = look.skin === "gold" ? "#ffc107" : "rgba(22,34,63,.45)";
    ctx.beginPath();
    ctx.moveTo(-L, -6);
    ctx.quadraticCurveTo(0, -18, L, -4);
    ctx.stroke();
  } else if (look.skin === "cracked") {
    ctx.lineWidth = 3;
    ctx.strokeStyle = look.crack ?? "#7df9ff";
    ctx.shadowColor = ctx.strokeStyle as string;
    ctx.shadowBlur = 10;
    ctx.globalAlpha = 0.6 + Math.sin(t * 3) * 0.3;
    for (const [a, b, c, d] of [[-L * 0.6, -14, -L * 0.3, 10], [-L * 0.1, -20, 0, 14], [L * 0.3, -16, L * 0.45, 10]] as const) {
      ctx.beginPath();
      ctx.moveTo(a, b);
      ctx.lineTo((a + c) / 2 + 6, (b + d) / 2);
      ctx.lineTo(c, d);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = "rgba(255,255,255,.32)";
  ctx.beginPath();
  ctx.ellipse(L * 0.15, -Hf * 0.5, L * 0.45, Hf * 0.16, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = 4.5;
  ctx.strokeStyle = INK;
  ctx.lineJoin = "round";
  ctx.stroke(body);

  // vây ngực (màu vây mẹ)
  ctx.save();
  ctx.translate(L * 0.15, Hf * 0.3);
  ctx.rotate(0.5 + Math.sin(t * 5) * 0.25);
  const pf = new Path2D();
  pf.moveTo(0, 0);
  pf.quadraticCurveTo(-22, 8, -26, 24);
  pf.quadraticCurveTo(-8, 18, 6, 6);
  pf.closePath();
  ctx.fillStyle = mother.fin;
  ctx.fill(pf);
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = INK;
  ctx.stroke(pf);
  ctx.restore();

  // đèn lồng (cá lồng đèn) của bố hoặc mẹ
  if (F.lure || M.lure) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.beginPath();
    ctx.moveTo(L * 0.55, -Hf * 0.8);
    ctx.quadraticCurveTo(L * 0.9, -Hf * 1.6, L * 1.15, -Hf * 1.05);
    ctx.stroke();
    ctx.fillStyle = (F.lure ? father.glow : mother.glow) ?? "#fff59d";
    ctx.shadowColor = ctx.fillStyle as string;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(L * 1.15, -Hf * 1.05, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  // sừng (bố có sừng hoặc theo bậc)
  const hornKind = look.horn ?? (father.horns || mother.horns ? "short" : undefined);
  const hx = L * 0.55;
  const hy = -Hf * 0.78;
  if (hornKind === "short") {
    const p = new Path2D();
    p.moveTo(hx - 6, hy + 6);
    p.lineTo(hx + 12, hy - 16);
    p.lineTo(hx + 6, hy + 8);
    p.closePath();
    ctx.fillStyle = "#cfd8dc";
    ctx.fill(p);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = INK;
    ctx.stroke(p);
  } else if (hornKind === "curved") {
    for (const off of [-10, 6]) {
      const p = new Path2D();
      p.moveTo(hx + off - 6, hy + 6);
      p.bezierCurveTo(hx + off - 4, hy - 26, hx + off + 26, hy - 34, hx + off + 34, hy - 12);
      p.bezierCurveTo(hx + off + 20, hy - 20, hx + off + 8, hy - 10, hx + off + 6, hy + 8);
      p.closePath();
      ctx.fillStyle = "#e0e0e0";
      ctx.fill(p);
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = INK;
      ctx.stroke(p);
    }
  } else if (hornKind === "crown") {
    const p = new Path2D();
    const cx = hx - 14;
    const cy = hy;
    p.moveTo(cx - 18, cy + 8);
    p.lineTo(cx - 16, cy - 14);
    p.lineTo(cx - 8, cy - 2);
    p.lineTo(cx, cy - 22);
    p.lineTo(cx + 8, cy - 2);
    p.lineTo(cx + 16, cy - 14);
    p.lineTo(cx + 18, cy + 8);
    p.closePath();
    ctx.fillStyle = "#ffd54f";
    ctx.fill(p);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = INK;
    ctx.stroke(p);
  }
  // mắt (kiểu mắt bố, màu theo bậc)
  const ex = L - 14 - 10 * nose;
  const ey = -Hf * 0.25;
  const glow = look.eyeGlow || father.eye === "glow";
  const eyeCol = look.eyeGlow ? look.eye : father.eyeColor ?? INK;
  if (glow) {
    ctx.fillStyle = eyeCol;
    ctx.shadowColor = eyeCol;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(ex, ey, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(ex, ey, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = glow ? eyeCol : INK;
  ctx.beginPath();
  ctx.arc(ex + 3, ey, 5.5, 0, Math.PI * 2);
  ctx.fill();
  if (glow) {
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(ex + 3, ey, 1.8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(ex + 1, ey - 3, 2.2, 0, Math.PI * 2);
  ctx.fill();
  if (fierce || father.eye === "angry") {
    ctx.lineWidth = 4;
    ctx.strokeStyle = INK;
    ctx.beginPath();
    ctx.moveTo(ex - 12, ey - 14);
    ctx.lineTo(ex + 10, ey - 8);
    ctx.stroke();
  }
  // miệng + răng (bố hoặc mẹ có răng)
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.moveTo(L - 2, 8);
  ctx.quadraticCurveTo(L - 12, 14, L - 22, 10);
  ctx.stroke();
  if (father.teeth || mother.teeth) {
    ctx.fillStyle = "#fff";
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(L - 6 - i * 5, 10);
      ctx.lineTo(L - 8 - i * 5, 15);
      ctx.lineTo(L - 10 - i * 5, 11);
      ctx.fill();
    }
  }
  ctx.restore();
}

// =====================================================================================
// CÁ LAI THEO GEN HÌNH CỦA BỐ MẸ (dùng bộ vẽ cá vector của game – cùng phong cách mọi loài):
//  - đầu, mõm, miệng, mắt, râu, đèn lồng: CÁ BỐ
//  - đuôi, vây lưng, vây ngực: CÁ MẸ
//  - tỉ lệ thân / độ gù / cong: trung bình 2 bên rồi lệch theo "gen" riêng của con → dáng mới
//  - màu: thân pha 2 màu bố mẹ, vây & hoa văn màu mẹ; bậc lai thêm hào quang, cánh, vòng cổ ngữ.
// =====================================================================================

const hashStr = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
const jit = (seed: number, k: number, lo: number, hi: number) => lo + (((seed >>> (k * 3)) ^ (seed * (k + 7))) % 1000) / 1000 * (hi - lo);

function mixHex(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1, 7), 16);
  const pb = parseInt(b.slice(1, 7), 16);
  const c = (sh: number) => Math.round(((pa >> sh) & 255) * (1 - t) + ((pb >> sh) & 255) * t);
  return "#" + ((1 << 24) | (c(16) << 16) | (c(8) << 8) | c(0)).toString(16).slice(1);
}

export function hybridMorph(father: Pick<FishDef, "id" | "appearance">, mother: Pick<FishDef, "id" | "appearance">, key: string): FishMorph {
  const f = fishMorph(father.id, father.appearance);
  const m = fishMorph(mother.id, mother.appearance);
  const sd = hashStr(key);
  const avg = (x: number, y: number) => (x + y) / 2;
  return {
    aspect: avg(f.aspect, m.aspect) * jit(sd, 1, 0.9, 1.12),
    peak: avg(f.peak, m.peak) + jit(sd, 2, -0.05, 0.05),
    head: f.head * jit(sd, 3, 0.95, 1.1),
    hump: avg(f.hump, m.hump) * jit(sd, 4, 0.9, 1.15),
    bend: avg(f.bend, m.bend),
    wave: Math.max(f.wave, m.wave) * 0.8,
    tilt: avg(f.tilt, m.tilt),
    snout: f.snout,
    mouth: f.mouth,
    tail: m.tail,
    tailSize: m.tailSize * 1.1,
    dorsal: m.dorsal === "none" ? f.dorsal : m.dorsal,
    dorsalSize: Math.max(f.dorsalSize, m.dorsalSize) * 1.05,
    pectoral: m.pectoral,
    whiskers: f.whiskers || m.whiskers,
    lure: f.lure || m.lure,
    scales: f.scales || m.scales,
    eyeSize: f.eyeSize,
    coil: Math.max(f.coil ?? 0, m.coil ?? 0) * 0.7 || undefined,
    // nét nhận diện: đồ trên đầu theo BỐ; bờm / mây / vây cánh theo MẸ (thiếu thì lấy bên kia)
    sig: {
      head: f.sig?.head ?? m.sig?.head,
      mane: m.sig?.mane ?? f.sig?.mane,
      clouds: m.sig?.clouds ?? false,
      finwings: m.sig?.finwings ?? f.sig?.finwings,
    },
  };
}

/** Ngoại hình (màu, sừng, gai…) của con: thân pha màu bố mẹ, vây & hoa văn theo mẹ, đặc điểm cả hai + theo bậc. */
export function hybridAppearance(father: FishAppearance, mother: FishAppearance, look: BreedLook, tierIdx: number): FishAppearance {
  return {
    shape: tierIdx >= 2 && (father.shape === "serpent" || mother.shape === "serpent") ? "serpent" : father.shape,
    body: mixHex(father.body, mother.body, 0.38),
    belly: father.belly,
    fin: mother.fin,
    pattern: father.pattern !== "none" ? father.pattern : mother.pattern !== "none" ? mother.pattern : "stripes",
    patternColor: mother.fin.slice(0, 7) + "aa",
    teeth: father.teeth || mother.teeth || tierIdx >= 1,
    horns: father.horns || mother.horns || tierIdx >= 1,
    spikes: father.spikes || mother.spikes || tierIdx >= 2,
    eye: tierIdx >= 1 ? "glow" : father.eye,
    eyeColor: tierIdx >= 1 ? look.eye : father.eyeColor,
    glow: tierIdx >= 1 ? (look.backColor ?? look.fin) : father.glow ?? mother.glow,
    scale: 1.6,
  };
}

/** Loài thuộc dòng bạch tuộc (vẽ có xúc tu). */
export const isKraken = (id: string) => /kraken/.test(id);

/** Vẽ cá lai theo bố mẹ vào khung FISH (320×200). tierIdx 0..3 = Boss Lai / Siêu Boss / Mythic / Gen Lặn. */
export function drawParentHybrid(
  ctx: CanvasRenderingContext2D,
  father: Pick<FishDef, "id" | "appearance">,
  mother: Pick<FishDef, "id" | "appearance">,
  look: BreedLook,
  tierIdx: number,
  stage: number,
  key: string,
  W = 320,
  H = 200,
) {
  const cx = W / 2;
  const cy = H / 2;
  // sau thân: hào quang + cánh (bậc cao)
  if (look.aura || tierIdx >= 1) {
    const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, 110);
    g.addColorStop(0, look.aura ?? "rgba(255,255,255,.25)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  if (look.wings && tierIdx >= 1) {
    ctx.save();
    ctx.translate(cx - 10, cy);
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.rotate(side * 0.32);
      const p = new Path2D();
      p.moveTo(0, 0);
      p.bezierCurveTo(-16, side * -58, -66, side * -72, -80, side * -50);
      p.lineTo(-58, side * -40);
      p.lineTo(-70, side * -24);
      p.lineTo(-46, side * -18);
      p.closePath();
      const g = ctx.createLinearGradient(0, 0, -80, side * -70);
      g.addColorStop(0, look.wings.b);
      g.addColorStop(1, look.wings.a);
      ctx.fillStyle = g;
      ctx.globalAlpha = 0.95;
      ctx.fill(p);
      ctx.globalAlpha = 1;
      ctx.lineWidth = 4;
      ctx.strokeStyle = INK;
      ctx.stroke(p);
      ctx.restore();
    }
    ctx.restore();
  }
  const app = hybridAppearance(father.appearance, mother.appearance, look, tierIdx);
  if (tierIdx === 3) {
    // Gen Lặn: thân sẫm cổ đại, hoa văn phát quang
    app.body = mixHex(app.body, "#140a2e", 0.45);
    app.pattern = "stripes";
    app.patternColor = (look.crack ?? "#7df9ff").slice(0, 7) + "dd";
  }
  // xúc tu khi bố / mẹ là dòng bạch tuộc (Kraken)
  const tentacles = isKraken(father.id) || isKraken(mother.id);
  if (tentacles) {
    const col = isKraken(mother.id) ? mother.appearance.body : father.appearance.body;
    const n = 4 + tierIdx;
    for (let i = 0; i < n; i++) {
      const x0 = cx - 30 + i * (50 / Math.max(1, n - 1));
      ctx.beginPath();
      ctx.moveTo(x0, cy + 8);
      ctx.bezierCurveTo(x0 - 10, cy + 40, x0 - 40 + i * 4, cy + 48, x0 - 56 + i * 6, cy + 78 - (i % 2) * 10);
      ctx.lineWidth = 13;
      ctx.strokeStyle = INK;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.lineWidth = 7;
      ctx.strokeStyle = i % 2 ? shadeHex(col.slice(0, 7), -0.25) : col.slice(0, 7);
      ctx.stroke();
      if (look.tentFire && tierIdx >= 1) {
        ctx.fillStyle = look.tentFire;
        ctx.beginPath();
        ctx.arc(x0 - 56 + i * 6, cy + 78 - (i % 2) * 10, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // bậc lai cao dùng bộ tiến hoá của game: Siêu Boss ~ Trung Giai, Mythic ~ Cao Giai, Gen Lặn ~ Thánh Giai
  drawVectorFish(ctx, { id: key, appearance: app }, Math.max(stage, tierIdx + 1), hybridMorph(father, mother, key));
  // vòng cổ ngữ (Gen Lặn) + vết nứt phát quang
  if (look.ring || tierIdx === 3) {
    ctx.save();
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 4;
    ctx.strokeStyle = look.crack ?? "#b388ff";
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 148, 92, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
