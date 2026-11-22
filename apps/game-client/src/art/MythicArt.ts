import { OUTLINE } from "./color.ts";

/**
 * Hình vẽ riêng cho các THẦN NGƯ cực hiếm (khung 320×200, đầu quay sang phải).
 * Vẽ thủ tục bằng Canvas2D – nhiều lớp: hào quang, đuôi, thân, hoa văn, vây, đầu, hiệu ứng.
 */
/** (ctx, stage): stage 1..4 = giai đoạn trưởng thành – hình gốc được THÊM DẦN chi tiết (vảy, bờm, sừng, mắt…). */
export const CUSTOM_FISH_ART: Record<string, (ctx: CanvasRenderingContext2D, stage?: number) => void> = {
  f_huyen_minh_long_ngu: drawHuyenMinhLongNgu,
  f_diem_ma_tham_hai: drawDiemMaThamHai,
  f_tien_ngu_hong_ngoc: drawTienNguHongNgoc,
};

type P = { x: number; y: number };

function bez(p0: P, p1: P, p2: P, p3: P, t: number): P {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, col: string) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

// =====================================================================================
// 🐉 HUYỀN MINH LONG NGƯ – rồng nước tinh tú (ngọc lam, sừng vàng, dải ngân hà, đuôi lụa)
// =====================================================================================
function drawHuyenMinhLongNgu(ctx: CanvasRenderingContext2D, stage = 1) {
  // gk = 0..3 theo giai: thân to hơn, vảy rõ, bờm dài, sừng lớn, mắt dữ, đuôi lụa dài, gai lưng cao
  const gk = Math.max(0, Math.min(3, stage - 1));
  const fit = [1, 0.92, 0.85, 0.8][gk]!;
  ctx.save();
  ctx.translate(176, 112);
  ctx.scale(fit, fit);
  ctx.translate(-176, -112);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  // hào quang
  const aura = ctx.createRadialGradient(170, 100, 10, 170, 100, 170);
  aura.addColorStop(0, "rgba(128,222,234,0.35)");
  aura.addColorStop(1, "rgba(128,222,234,0)");
  ctx.fillStyle = aura;
  ctx.fillRect(0, 0, 320, 200);

  // đường xương sống chữ S: đuôi (trái) → cổ (phải)
  const A = { x: 84, y: 112 };
  const B = { x: 118, y: 6 };
  const C = { x: 196, y: 206 };
  const D = { x: 250, y: 92 };
  const N = 40;
  const pts: { p: P; n: P; w: number }[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const p = bez(A, B, C, D, t);
    const q = bez(A, B, C, D, Math.min(1, t + 0.01));
    const r = bez(A, B, C, D, Math.max(0, t - 0.01));
    const dx = q.x - r.x;
    const dy = q.y - r.y;
    const len = Math.hypot(dx, dy) || 1;
    // thân thon ở đuôi, dày dần về cổ
    const w = (3 + 20 * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.5) - (t > 0.92 ? (t - 0.92) * 40 : 0)) * (1 + 0.07 * gk);
    // pháp tuyến hướng LÊN (phía lưng)
    pts.push({ p, n: { x: dy / len, y: -dx / len }, w });
  }
  const top = pts.map(({ p, n, w }) => ({ x: p.x + n.x * w, y: p.y + n.y * w }));
  const bot = pts.map(({ p, n, w }) => ({ x: p.x - n.x * w, y: p.y - n.y * w }));

  // --- vây lưng vàng dọc sống lưng (gai nhọn ngả về sau)
  for (let i = 4; i < N - 2; i += 3) {
    const { p, n, w } = pts[i]!;
    const back = pts[Math.max(0, i - 2)]!.p;
    const sp = 14 * (1 + 0.18 * gk);
    const tip = { x: p.x + n.x * (w + sp) + (back.x - p.x) * 1.2, y: p.y + n.y * (w + sp) + (back.y - p.y) * 1.2 };
    const g = ctx.createLinearGradient(p.x, p.y, tip.x, tip.y);
    g.addColorStop(0, "#ffb300");
    g.addColorStop(1, "#fff59d");
    ctx.fillStyle = g;
    ctx.strokeStyle = "#8d5a00";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(p.x + n.x * w * 0.8, p.y + n.y * w * 0.8);
    ctx.lineTo(tip.x, tip.y);
    ctx.lineTo(back.x + n.x * w * 0.8, back.y + n.y * w * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // --- thân
  const body = new Path2D();
  body.moveTo(top[0]!.x, top[0]!.y);
  for (const q of top) body.lineTo(q.x, q.y);
  for (let i = bot.length - 1; i >= 0; i--) body.lineTo(bot[i]!.x, bot[i]!.y);
  body.closePath();
  const bg = ctx.createLinearGradient(80, 40, 260, 170);
  bg.addColorStop(0, "#4dd0e1");
  bg.addColorStop(0.5, "#00acc1");
  bg.addColorStop(1, "#26c6da");
  ctx.fillStyle = bg;
  ctx.fill(body);
  ctx.save();
  ctx.clip(body);
  // dải ngân hà trên thân
  for (const [cx, cy, r] of [[118, 92, 26], [196, 136, 30], [150, 70, 16]] as const) {
    const gg = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
    gg.addColorStop(0, "rgba(255,255,255,0.9)");
    gg.addColorStop(0.25, "rgba(124,77,255,0.75)");
    gg.addColorStop(0.7, "rgba(26,35,126,0.85)");
    gg.addColorStop(1, "rgba(26,35,126,0)");
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 4; a += 0.2) {
      const rr = (a / (Math.PI * 4)) * r * 0.9;
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr * 0.6;
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    for (let s = 0; s < 8; s++) star(ctx, cx + Math.cos(s * 2.4) * r * 0.7, cy + Math.sin(s * 2.4) * r * 0.5, 1.6 + (s % 3), "#ffffff");
  }
  // vảy
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1.2;
  for (let i = 3; i < N - 3; i += 2) {
    const { p, n, w } = pts[i]!;
    for (const k of [-0.45, 0, 0.45]) {
      ctx.beginPath();
      ctx.arc(p.x + n.x * w * k, p.y + n.y * w * k, w * 0.32, 0, Math.PI);
      ctx.stroke();
    }
  }
  // bụng vàng nhạt có vạch
  ctx.fillStyle = "rgba(255,243,196,0.85)";
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const { p, n, w } = pts[i]!;
    const x = p.x - n.x * w * 0.55;
    const y = p.y - n.y * w * 0.55;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  for (let i = N; i >= 0; i--) ctx.lineTo(bot[i]!.x, bot[i]!.y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "#0d2b45";
  ctx.lineWidth = 3;
  ctx.stroke(body);
  // Trung Giai+: vảy rồng viền vàng phủ thân, Cao Giai+ dày & sáng hơn, Thánh Giai lấp lánh
  if (gk >= 1) {
    ctx.save();
    ctx.clip(body);
    // vảy ánh nhẹ (chỉ nửa lưng) – để lộ dải ngân hà trên thân
    ctx.strokeStyle = gk >= 2 ? "rgba(255,248,200,0.45)" : "rgba(224,247,250,0.35)";
    ctx.lineWidth = 1.1;
    for (let i = 4; i < N - 4; i += 2) {
      const { p, n, w } = pts[i]!;
      const ang = Math.atan2(-n.x, n.y);
      for (let j = 0; j <= 2; j++) {
        const off = (j + (i % 4 ? 0.5 : 0)) * w * 0.3;
        ctx.beginPath();
        ctx.arc(p.x + n.x * off, p.y + n.y * off, w * 0.26, ang - Math.PI / 2 + Math.PI, ang + Math.PI / 2 + Math.PI);
        ctx.stroke();
      }
    }
    if (gk >= 3) for (let i = 4; i < N - 4; i += 3) star(ctx, pts[i]!.p.x + pts[i]!.n.x * 4, pts[i]!.p.y + pts[i]!.n.y * 4, 3, "#fffde7");
    ctx.restore();
  }

  // --- đuôi lụa (nhiều dải mỏng bay ra sau) – vẽ sau thân
  // neo sâu vào thân (vài đốt về phía trước) và vẽ ĐÈ lên đầu đuôi để che chỗ thân bị cắt
  const t0 = pts[0]!.p;
  const t3 = pts[4]!.p;
  const tail = { x: (t0.x + t3.x) / 2 + 4, y: (t0.y + t3.y) / 2 };
  const strands = 7 + gk;
  const tl = 1 + 0.22 * gk;
  for (let k = 0; k < strands; k++) {
    const g = ctx.createLinearGradient(tail.x, tail.y, tail.x - 90 * tl, tail.y);
    g.addColorStop(0, "rgba(224,247,250,0.95)");
    g.addColorStop(1, gk >= 3 ? "rgba(179,136,255,0)" : "rgba(128,222,234,0)");
    ctx.fillStyle = g;
    const spread = (k - (strands - 1) / 2) * 15;
    ctx.beginPath();
    ctx.moveTo(tail.x + 4, tail.y - 6);
    ctx.bezierCurveTo(tail.x - 30 * tl, tail.y - 40 + spread, tail.x - 60 * tl, tail.y + 10 + spread * 1.4, tail.x - (82 - k * 4) * tl, tail.y - 30 + spread * 2.2);
    ctx.bezierCurveTo(tail.x - 50, tail.y + 18 + spread * 1.3, tail.x - 24, tail.y - 10 + spread * 0.6, tail.x + 4, tail.y + 6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = 1.5;
  for (let k = 0; k < 5; k++) {
    ctx.beginPath();
    ctx.moveTo(tail.x, tail.y);
    ctx.bezierCurveTo(tail.x - 30, tail.y - 30 + k * 12, tail.x - 55, tail.y + k * 10, 14 + k * 6, tail.y - 20 + k * 16);
    ctx.stroke();
  }

  // --- vây ngực trong suốt
  for (const [i, s] of [[30, 1], [14, 0.8]] as const) {
    const { p, n, w } = pts[i]!;
    const base = { x: p.x - n.x * w, y: p.y - n.y * w };
    const g = ctx.createLinearGradient(base.x, base.y, base.x - 30, base.y + 30);
    g.addColorStop(0, "rgba(178,235,242,0.95)");
    g.addColorStop(1, "rgba(178,235,242,0.1)");
    ctx.fillStyle = g;
    ctx.strokeStyle = "rgba(13,43,69,0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.bezierCurveTo(base.x - 10 * s, base.y + 22 * s, base.x - 36 * s, base.y + 30 * s, base.x - 44 * s, base.y + 22 * s);
    ctx.bezierCurveTo(base.x - 30 * s, base.y + 14 * s, base.x - 20 * s, base.y + 6 * s, base.x - 12 * s, base.y - 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // --- đầu rồng
  const H = { x: 262, y: 88 };
  // bờm vàng (lửa) sau đầu – dài & dày dần theo giai
  const mk = 1 + 0.15 * gk;
  if (gk >= 1) {
    // Cao Giai+: bờm tóc lụa trắng-xanh bay dài sau gáy
    // bờm lụa mềm bay về sau (dài dần theo giai)
    const ml = 40 + 18 * gk;
    for (let k = 0; k < 3 + gk; k++) {
      const g = ctx.createLinearGradient(H.x, H.y, H.x - ml, H.y);
      g.addColorStop(0, "rgba(255,255,255,0.8)");
      g.addColorStop(1, "rgba(178,235,242,0)");
      ctx.strokeStyle = g;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(H.x - 8, H.y - 8 + k * 4);
      ctx.bezierCurveTo(H.x - ml * 0.4, H.y - 24 + k * 6, H.x - ml * 0.7, H.y + 4 + k * 5, H.x - ml, H.y - 10 + k * 9);
      ctx.stroke();
    }
  }
  for (let k = 0; k < 6; k++) {
    const g = ctx.createLinearGradient(H.x, H.y, H.x - 40 * mk, H.y - 30 * mk);
    g.addColorStop(0, "#ffca28");
    g.addColorStop(1, "rgba(255,241,118,0.2)");
    ctx.fillStyle = g;
    ctx.beginPath();
    const a = -2.2 + k * 0.32;
    ctx.moveTo(H.x - 6, H.y - 4);
    ctx.quadraticCurveTo(H.x - 24 * mk + Math.cos(a) * 8, H.y - 6 + Math.sin(a) * 26 * mk, H.x - 30 * mk + Math.cos(a) * 28 * mk, H.y + Math.sin(a) * 34 * mk);
    ctx.quadraticCurveTo(H.x - 16, H.y + 4, H.x - 4, H.y + 8);
    ctx.closePath();
    ctx.fill();
  }
  // sừng vàng phân nhánh
  const hornK = [1, 1.15, 1.3, 1.45][gk]!;
  for (const [dx, sc0] of [[-4, 1], [8, 0.8]] as const) {
    const sc = sc0 * hornK;
    const g = ctx.createLinearGradient(H.x, H.y - 10, H.x - 30, H.y - 60);
    g.addColorStop(0, "#ff8f00");
    g.addColorStop(1, "#fff59d");
    ctx.strokeStyle = g;
    ctx.lineWidth = 6 * sc0;
    ctx.beginPath();
    ctx.moveTo(H.x + dx, H.y - 12);
    ctx.quadraticCurveTo(H.x + dx - 10, H.y - 38 * sc, H.x + dx - 34 * sc, H.y - 56 * sc);
    ctx.stroke();
    ctx.lineWidth = 3.5 * sc0;
    ctx.beginPath();
    ctx.moveTo(H.x + dx - 12 * sc, H.y - 34 * sc);
    ctx.lineTo(H.x + dx - 2, H.y - 52 * sc);
    ctx.moveTo(H.x + dx - 24 * sc, H.y - 47 * sc);
    ctx.lineTo(H.x + dx - 20 * sc, H.y - 64 * sc);
    if (gk >= 2) {
      // thêm 1 nhánh sừng thanh mảnh
      ctx.moveTo(H.x + dx - 30 * sc, H.y - 53 * sc);
      ctx.lineTo(H.x + dx - 40 * sc, H.y - 50 * sc);
    }
    ctx.stroke();
  }
  // vây má nhọn sau hàm (Trung Giai+) – đầu trông sắc hơn
  if (gk >= 1) {
    // vây má trong suốt mềm mại
    const cl = 1 + 0.15 * gk;
    const g = ctx.createLinearGradient(H.x - 6, H.y + 8, H.x - 36 * cl, H.y + 22);
    g.addColorStop(0, "rgba(224,247,250,0.9)");
    g.addColorStop(1, "rgba(128,222,234,0.15)");
    ctx.fillStyle = g;
    ctx.strokeStyle = "rgba(13,43,69,0.5)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(H.x - 4, H.y + 6);
    ctx.bezierCurveTo(H.x - 16 * cl, H.y + 4, H.x - 30 * cl, H.y + 12, H.x - 36 * cl, H.y + 24);
    ctx.bezierCurveTo(H.x - 22 * cl, H.y + 22, H.x - 12, H.y + 18, H.x - 2, H.y + 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // đầu + mõm: mõm dài & nhọn dần theo giai, trán góc cạnh
  const sn = 1 + 0.04 * gk;
  const head = new Path2D();
  head.moveTo(H.x - 18, H.y - 14);
  head.quadraticCurveTo(H.x + 4, H.y - 26, H.x + 26, H.y - 14);
  head.quadraticCurveTo(H.x + 44 * sn, H.y - 10, H.x + 52 * sn, H.y - 2);
  head.quadraticCurveTo(H.x + 54 * sn, H.y + 4, H.x + 46 * sn, H.y + 6);
  head.lineTo(H.x + 22, H.y + 6);
  head.quadraticCurveTo(H.x + 40 * sn, H.y + 12, H.x + 46 * sn, H.y + 18);
  head.quadraticCurveTo(H.x + 20, H.y + 24, H.x - 2, H.y + 18);
  head.quadraticCurveTo(H.x - 22, H.y + 10, H.x - 18, H.y - 14);
  head.closePath();
  const hg = ctx.createLinearGradient(H.x - 20, H.y - 24, H.x + 50, H.y + 20);
  hg.addColorStop(0, "#26c6da");
  hg.addColorStop(1, "#80deea");
  ctx.fillStyle = hg;
  ctx.fill(head);
  ctx.strokeStyle = "#0d2b45";
  ctx.lineWidth = 3;
  ctx.stroke(head);
  // hàm dưới vàng nhạt + răng nanh
  ctx.fillStyle = "#fff3c4";
  ctx.beginPath();
  ctx.moveTo(H.x + 4, H.y + 12);
  ctx.quadraticCurveTo(H.x + 24, H.y + 20, H.x + 42, H.y + 17);
  ctx.quadraticCurveTo(H.x + 22, H.y + 22, H.x + 2, H.y + 17);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  // nanh dài dần, thêm nanh theo giai
  const fangs = [H.x + 30, H.x + 38];
  for (const x of fangs) {
    ctx.beginPath();
    ctx.moveTo(x, H.y + 6);
    ctx.lineTo(x + 3, H.y + 13);
    ctx.lineTo(x + 6, H.y + 6);
    ctx.fill();
  }
  // vảy trán vàng
  ctx.fillStyle = "#ffd54f";
  ctx.beginPath();
  ctx.moveTo(H.x - 6, H.y - 16);
  ctx.quadraticCurveTo(H.x + 14, H.y - 24, H.x + 30, H.y - 12);
  ctx.quadraticCurveTo(H.x + 12, H.y - 14, H.x - 6, H.y - 10);
  ctx.closePath();
  ctx.fill();
  // mắt phát sáng – Trung Giai mống vàng, Cao Giai đồng tử dọc + mày xếch, Thánh Giai rực sáng
  ctx.shadowColor = gk >= 3 ? "#ea80fc" : "#e0f7fa";
  ctx.shadowBlur = 12 + gk * 3;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(H.x + 14, H.y - 6, 7, 5, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // mống mắt: ngọc lam → lam ánh tím (Cao Giai) → tím ngân hà (Thánh Giai)
  ctx.fillStyle = ["#00838f", "#00838f", "#3949ab", "#7c4dff"][gk]!;
  ctx.beginPath();
  ctx.ellipse(H.x + 16, H.y - 6, 3, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(H.x + 17, H.y - 8, 1.2, 0, Math.PI * 2);
  ctx.fill();
  if (gk >= 2) {
    // nét mày vàng mảnh, thanh tú
    ctx.strokeStyle = "#ffd54f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(H.x + 4, H.y - 14);
    ctx.quadraticCurveTo(H.x + 14, H.y - 16, H.x + 24, H.y - 11);
    ctx.stroke();
  }
  ctx.strokeStyle = "#ffb300";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(H.x + 14, H.y - 6, 7, 5, -0.2, 0, Math.PI * 2);
  ctx.stroke();
  // lỗ mũi
  ctx.fillStyle = "#0d2b45";
  ctx.beginPath();
  ctx.arc(H.x + 46, H.y - 4, 1.8, 0, Math.PI * 2);
  ctx.fill();
  // râu rồng dài uốn lượn
  ctx.strokeStyle = "#fff59d";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(H.x + 44, H.y + 2);
  ctx.bezierCurveTo(H.x + 70, H.y + 10, H.x + 40, H.y + 40, H.x + 60, H.y + 60);
  ctx.moveTo(H.x + 40, H.y - 6);
  ctx.bezierCurveTo(H.x + 66, H.y - 30, H.x + 30, H.y - 44, H.x + 52, H.y - 66);
  ctx.stroke();

  // lấp lánh tinh tú quanh rồng
  for (const [x, y, r] of [[60, 40, 4], [300, 150, 5], [210, 30, 3], [40, 170, 3], [290, 30, 3], [150, 180, 4], [110, 20, 2.5]] as const) star(ctx, x, y, r, "#e0f7fa");
  if (gk >= 3) {
    // Thánh Giai: ngọc thần trên trán
    const jg = ctx.createRadialGradient(H.x + 8, H.y - 18, 1, H.x + 8, H.y - 18, 6);
    jg.addColorStop(0, "#ffffff");
    jg.addColorStop(0.5, "#ea80fc");
    jg.addColorStop(1, "#7c4dff");
    ctx.fillStyle = jg;
    ctx.shadowColor = "#ea80fc";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(H.x + 8, H.y - 27);
    ctx.lineTo(H.x + 14, H.y - 18);
    ctx.lineTo(H.x + 8, H.y - 11);
    ctx.lineTo(H.x + 2, H.y - 18);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}

// =====================================================================================
// 🔥 DIỄM MA THÂM HẢI – ác ma dung nham (thân đen tím, vết nứt lửa, hàm há, sừng, sét tím)
// =====================================================================================
function drawDiemMaThamHai(ctx: CanvasRenderingContext2D) {
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  // hào quang lửa
  const aura = ctx.createRadialGradient(180, 100, 10, 180, 100, 170);
  aura.addColorStop(0, "rgba(255,61,0,0.35)");
  aura.addColorStop(1, "rgba(255,61,0,0)");
  ctx.fillStyle = aura;
  ctx.fillRect(0, 0, 320, 200);

  // --- tia sét tím
  const bolt = (pts: [number, number][]) => {
    ctx.strokeStyle = "rgba(213,0,249,0.55)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.strokeStyle = "#f3e5f5";
    ctx.lineWidth = 2;
    ctx.stroke();
  };
  bolt([[230, 4], [244, 22], [236, 30], [256, 48]]);
  bolt([[300, 70], [312, 86], [304, 92], [318, 110]]);
  bolt([[30, 30], [44, 44], [38, 50], [54, 62]]);

  // --- đuôi lửa xẻ đôi
  const tail = new Path2D();
  tail.moveTo(78, 100);
  tail.bezierCurveTo(56, 80, 34, 52, 10, 34);
  tail.quadraticCurveTo(26, 62, 22, 76);
  tail.quadraticCurveTo(10, 72, 2, 66);
  tail.quadraticCurveTo(22, 96, 20, 108);
  tail.quadraticCurveTo(6, 118, 2, 140);
  tail.quadraticCurveTo(22, 132, 26, 138);
  tail.quadraticCurveTo(28, 154, 12, 172);
  tail.bezierCurveTo(40, 156, 60, 132, 80, 118);
  tail.closePath();
  const tg = ctx.createLinearGradient(80, 100, 0, 100);
  tg.addColorStop(0, "#2a1236");
  tg.addColorStop(0.6, "#b71c1c");
  tg.addColorStop(1, "#ff6d00");
  ctx.fillStyle = tg;
  ctx.fill(tail);
  ctx.strokeStyle = "#ff3d00";
  ctx.lineWidth = 2.5;
  ctx.stroke(tail);

  // --- gai lưng (màng đỏ, đầu gai rực lửa)
  const spines: [number, number, number][] = [
    [110, 70, 46],
    [134, 56, 58],
    [160, 46, 64],
    [186, 42, 60],
    [210, 42, 50],
    [232, 46, 36],
  ];
  for (const [x, y, h] of spines) {
    const g = ctx.createLinearGradient(x, y, x - 24, y - h);
    g.addColorStop(0, "#4a148c");
    g.addColorStop(0.6, "#d50000");
    g.addColorStop(1, "#ffab40");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 6);
    ctx.quadraticCurveTo(x - 6, y - h * 0.5, x - 22, y - h);
    ctx.quadraticCurveTo(x - 8, y - h * 0.4, x - 16, y + 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#1a0510";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // --- thân + đầu (hàm há rộng)
  const body = new Path2D();
  body.moveTo(78, 98);
  body.bezierCurveTo(104, 66, 150, 40, 200, 40);
  body.bezierCurveTo(236, 40, 262, 48, 284, 64); // trán
  body.quadraticCurveTo(300, 72, 312, 82); // mõm trên
  body.lineTo(300, 92);
  body.lineTo(256, 100); // mép trong hàm trên
  body.lineTo(250, 108);
  body.lineTo(300, 146); // hàm dưới chìa ra
  body.quadraticCurveTo(292, 160, 270, 160);
  body.bezierCurveTo(220, 166, 160, 160, 120, 140);
  body.quadraticCurveTo(96, 128, 78, 118);
  body.closePath();
  const bg = ctx.createLinearGradient(80, 40, 260, 160);
  bg.addColorStop(0, "#3b1748");
  bg.addColorStop(0.5, "#2a1236");
  bg.addColorStop(1, "#14060f");
  ctx.fillStyle = bg;
  ctx.fill(body);
  ctx.save();
  ctx.clip(body);
  // vết nứt dung nham phát sáng
  ctx.shadowColor = "#ff6d00";
  ctx.shadowBlur = 10;
  const cracks: [number, number][][] = [
    [[96, 104], [120, 92], [134, 100], [160, 84], [178, 92], [204, 74], [226, 82]],
    [[110, 130], [140, 118], [160, 128], [190, 112], [214, 124], [240, 108]],
    [[150, 60], [166, 72], [182, 62], [200, 70]],
    [[180, 150], [200, 138], [226, 148], [250, 134]],
    [[230, 56], [246, 70], [262, 62], [272, 78]],
  ];
  for (const c of cracks) {
    ctx.strokeStyle = "#ff3d00";
    ctx.lineWidth = 4;
    ctx.beginPath();
    c.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.strokeStyle = "#ffd180";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // nhánh nứt nhỏ
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ff6d00";
    for (let i = 1; i < c.length - 1; i += 2) {
      const [x, y] = c[i]!;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 6, y + (i % 4 === 1 ? 12 : -12));
      ctx.stroke();
    }
  }
  ctx.shadowBlur = 0;
  // vảy giáp tối
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  for (let x = 100; x < 280; x += 18)
    for (let y = 60; y < 160; y += 16) {
      ctx.beginPath();
      ctx.arc(x + ((y / 16) % 2) * 9, y, 8, 0, Math.PI);
      ctx.stroke();
    }
  ctx.restore();
  ctx.strokeStyle = "#ff1744";
  ctx.lineWidth = 2.5;
  ctx.stroke(body);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1;
  ctx.stroke(body);

  // --- miệng: lòng miệng đỏ rực + răng lởm chởm
  const mouth = new Path2D();
  mouth.moveTo(300, 92);
  mouth.lineTo(256, 100);
  mouth.lineTo(250, 108);
  mouth.lineTo(296, 140);
  mouth.quadraticCurveTo(312, 116, 300, 92);
  mouth.closePath();
  const mg = ctx.createRadialGradient(268, 110, 2, 272, 112, 40);
  mg.addColorStop(0, "#ffab40");
  mg.addColorStop(0.4, "#d50000");
  mg.addColorStop(1, "#3e0000");
  ctx.fillStyle = mg;
  ctx.fill(mouth);
  ctx.fillStyle = "#fff8e1";
  ctx.strokeStyle = "#5d4037";
  ctx.lineWidth = 1;
  for (let i = 0; i < 7; i++) {
    // răng hàm trên
    const x = 258 + i * 6.5;
    const y = 99 - i * 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 2.5, y + 9 + (i % 2) * 5);
    ctx.lineTo(x + 5.5, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  for (let i = 0; i < 7; i++) {
    // răng hàm dưới
    const x = 256 + i * 6;
    const y = 112 + i * 4.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 3, y - 9 - (i % 2) * 4);
    ctx.lineTo(x + 6, y + 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // --- sừng cong vuốt ra sau
  for (const [x, y, s] of [[246, 48, 1], [264, 54, 0.75]] as const) {
    const g = ctx.createLinearGradient(x, y, x - 40 * s, y - 40 * s);
    g.addColorStop(0, "#1a0510");
    g.addColorStop(1, "#6a1b9a");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x - 10 * s, y - 34 * s, x - 44 * s, y - 40 * s);
    ctx.quadraticCurveTo(x - 18 * s, y - 22 * s, x - 14 * s, y + 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#ff1744";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // --- mắt đỏ rực + gờ mày gai
  ctx.fillStyle = "#1a0510";
  ctx.beginPath();
  ctx.moveTo(254, 64);
  ctx.lineTo(284, 66);
  ctx.lineTo(276, 74);
  ctx.closePath();
  ctx.fill();
  ctx.shadowColor = "#ff1744";
  ctx.shadowBlur = 16;
  ctx.fillStyle = "#ff1744";
  ctx.beginPath();
  ctx.ellipse(270, 76, 9, 5, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffeb3b";
  ctx.beginPath();
  ctx.ellipse(272, 76, 2, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // --- vây ngực gai
  const fin = new Path2D();
  fin.moveTo(200, 136);
  fin.lineTo(172, 176);
  fin.lineTo(184, 168);
  fin.lineTo(176, 190);
  fin.lineTo(196, 170);
  fin.lineTo(196, 186);
  fin.lineTo(216, 146);
  fin.closePath();
  const fg = ctx.createLinearGradient(200, 136, 180, 190);
  fg.addColorStop(0, "#4a148c");
  fg.addColorStop(1, "#ff3d00");
  ctx.fillStyle = fg;
  ctx.fill(fin);
  ctx.strokeStyle = "#1a0510";
  ctx.lineWidth = 2;
  ctx.stroke(fin);

  // --- tàn lửa bay
  ctx.shadowColor = "#ff9100";
  ctx.shadowBlur = 8;
  for (const [x, y, r] of [[60, 20, 3], [100, 30, 2], [140, 16, 2.5], [300, 30, 2], [40, 150, 2.5], [150, 190, 2], [230, 186, 3]] as const) {
    ctx.fillStyle = "#ffab40";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

// =====================================================================================
// 🌸 TIÊN NGƯ HỒNG NGỌC – cá hồng dễ thương: vương miện cầu vồng, sừng, sọc phát sáng, vây bồng bềnh
// =====================================================================================
function drawTienNguHongNgoc(ctx: CanvasRenderingContext2D) {
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const aura = ctx.createRadialGradient(170, 105, 10, 170, 105, 165);
  aura.addColorStop(0, "rgba(255,128,171,0.4)");
  aura.addColorStop(1, "rgba(255,128,171,0)");
  ctx.fillStyle = aura;
  ctx.fillRect(0, 0, 320, 200);
  const OUT = "#880e4f";
  const finGrad = (x0: number, y0: number, x1: number, y1: number) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, "#ff80ab");
    g.addColorStop(1, "#ffcc80");
    return g;
  };
  // dải lụa tím bay quanh
  ctx.strokeStyle = "rgba(186,104,200,0.45)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(10, 170);
  ctx.bezierCurveTo(70, 150, 120, 196, 190, 176);
  ctx.moveTo(250, 170);
  ctx.bezierCurveTo(280, 150, 300, 160, 316, 140);
  ctx.moveTo(30, 40);
  ctx.bezierCurveTo(60, 30, 80, 50, 110, 44);
  ctx.stroke();

  // --- đuôi bồng bềnh (2 thùy, có gân)
  const tail = new Path2D();
  tail.moveTo(86, 104);
  tail.bezierCurveTo(60, 70, 30, 40, 6, 50);
  tail.bezierCurveTo(24, 70, 30, 88, 40, 100);
  tail.bezierCurveTo(26, 116, 16, 146, 10, 170);
  tail.bezierCurveTo(40, 160, 66, 136, 86, 116);
  tail.closePath();
  ctx.fillStyle = finGrad(86, 104, 6, 100);
  ctx.fill(tail);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2.5;
  ctx.stroke(tail);
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 1.5;
  for (const [x, y] of [[20, 58], [32, 76], [24, 150], [34, 132], [50, 66], [48, 140]] as const) {
    ctx.beginPath();
    ctx.moveTo(84, 110);
    ctx.quadraticCurveTo((84 + x) / 2, (110 + y) / 2 + 6, x, y);
    ctx.stroke();
  }

  // --- vây lưng lớn
  const dorsal = new Path2D();
  dorsal.moveTo(110, 66);
  dorsal.bezierCurveTo(120, 30, 170, 12, 222, 26);
  dorsal.bezierCurveTo(206, 36, 210, 50, 220, 58);
  dorsal.closePath();
  ctx.fillStyle = finGrad(110, 66, 222, 20);
  ctx.fill(dorsal);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2.5;
  ctx.stroke(dorsal);
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(126 + i * 20, 62);
    ctx.lineTo(140 + i * 18, 30 - i * 1);
    ctx.stroke();
  }

  // --- thân tròn
  const body = new Path2D();
  body.moveTo(84, 110);
  body.bezierCurveTo(96, 60, 170, 48, 230, 56);
  body.bezierCurveTo(286, 62, 308, 92, 306, 116);
  body.bezierCurveTo(302, 150, 250, 166, 190, 164);
  body.bezierCurveTo(130, 162, 92, 146, 84, 110);
  body.closePath();
  const bg = ctx.createLinearGradient(100, 50, 200, 170);
  bg.addColorStop(0, "#f8bbd0");
  bg.addColorStop(0.55, "#f48fb1");
  bg.addColorStop(1, "#ec407a");
  ctx.fillStyle = bg;
  ctx.fill(body);
  ctx.save();
  ctx.clip(body);
  // sọc gợn sóng phát sáng (xanh ngọc / tím / trắng)
  ctx.shadowColor = "#e0f7fa";
  ctx.shadowBlur = 8;
  const cols = ["#b2ebf2", "#e1bee7", "#ffffff", "#b2ebf2", "#ce93d8", "#e0f7fa"];
  for (let i = 0; i < 6; i++) {
    const x = 112 + i * 16;
    ctx.strokeStyle = cols[i]!;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    for (let y = 58; y <= 160; y += 4) {
      const xx = x + Math.sin(y / 7 + i) * 4;
      if (y === 58) ctx.moveTo(xx, y);
      else ctx.lineTo(xx, y);
    }
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  // bụng sáng + ánh bóng
  ctx.fillStyle = "rgba(252,228,236,0.7)";
  ctx.beginPath();
  ctx.ellipse(220, 142, 70, 20, -0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.ellipse(170, 72, 60, 10, -0.08, 0, Math.PI * 2);
  ctx.fill();
  // lấp lánh trên thân
  for (const [x, y] of [[140, 100], [176, 128], [200, 90], [150, 140]] as const) star(ctx, x, y, 3, "#ffffff");
  ctx.restore();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 3;
  ctx.stroke(body);

  // --- mặt: đường viền má
  ctx.strokeStyle = "rgba(136,14,79,0.6)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(250, 110, 46, Math.PI * 0.62, Math.PI * 1.32);
  ctx.stroke();

  // --- vây ngực + vây bụng
  for (const [x, y, s] of [[214, 132, 1], [150, 150, 0.8]] as const) {
    const fin = new Path2D();
    fin.moveTo(x, y);
    fin.bezierCurveTo(x - 6 * s, y + 30 * s, x - 34 * s, y + 44 * s, x - 46 * s, y + 38 * s);
    fin.bezierCurveTo(x - 36 * s, y + 24 * s, x - 22 * s, y + 8 * s, x - 14 * s, y - 2);
    fin.closePath();
    ctx.fillStyle = finGrad(x, y, x - 46 * s, y + 40 * s);
    ctx.fill(fin);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    ctx.stroke(fin);
  }

  // --- sừng hồng + vương miện cầu vồng
  for (const [x, dir] of [[222, -1], [276, 1]] as const) {
    const g = ctx.createLinearGradient(x, 60, x + dir * 10, 24);
    g.addColorStop(0, "#f06292");
    g.addColorStop(1, "#fce4ec");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 7, 62);
    ctx.quadraticCurveTo(x + dir * 2, 34, x + dir * 14, 26);
    ctx.quadraticCurveTo(x + dir * 6, 42, x + 7, 62);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  const crown = new Path2D();
  crown.moveTo(236, 58);
  crown.lineTo(232, 30);
  crown.lineTo(242, 42);
  crown.lineTo(248, 22);
  crown.lineTo(254, 42);
  crown.lineTo(264, 30);
  crown.lineTo(260, 58);
  crown.closePath();
  const cg = ctx.createLinearGradient(232, 22, 264, 58);
  cg.addColorStop(0, "#fff59d");
  cg.addColorStop(0.35, "#b2ebf2");
  cg.addColorStop(0.7, "#e1bee7");
  cg.addColorStop(1, "#ffcc80");
  ctx.shadowColor = "#ffffff";
  ctx.shadowBlur = 10;
  ctx.fillStyle = cg;
  ctx.fill(crown);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#ad1457";
  ctx.lineWidth = 1.8;
  ctx.stroke(crown);
  ctx.fillStyle = "#ff4081";
  ctx.beginPath();
  ctx.arc(248, 48, 3, 0, Math.PI * 2);
  ctx.fill();

  // --- mắt to long lanh + mi
  const E = { x: 262, y: 94 };
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(E.x, E.y, 14, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  ctx.stroke();
  const ig = ctx.createRadialGradient(E.x + 2, E.y + 2, 2, E.x + 2, E.y + 2, 11);
  ig.addColorStop(0, "#7e57c2");
  ig.addColorStop(1, "#1a0033");
  ctx.fillStyle = ig;
  ctx.beginPath();
  ctx.ellipse(E.x + 2, E.y + 2, 10, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(E.x - 2, E.y - 3, 4, 0, Math.PI * 2);
  ctx.arc(E.x + 6, E.y + 6, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a0033";
  ctx.lineWidth = 2;
  for (const [dx, dy] of [[12, -10], [15, -4], [8, -14]] as const) {
    ctx.beginPath();
    ctx.moveTo(E.x + dx - 4, E.y + dy + 2);
    ctx.lineTo(E.x + dx + 2, E.y + dy - 3);
    ctx.stroke();
  }
  // mắt bên kia (nhìn nghiêng)
  ctx.fillStyle = "#1a0033";
  ctx.beginPath();
  ctx.ellipse(298, 92, 3, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // má hồng
  ctx.fillStyle = "rgba(255,82,135,0.5)";
  ctx.beginPath();
  ctx.ellipse(254, 118, 9, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // miệng cười + răng khểnh
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(276, 122);
  ctx.quadraticCurveTo(288, 130, 302, 120);
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(282, 125);
  ctx.lineTo(285, 132);
  ctx.lineTo(288, 126);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.stroke();
  // mũi nhỏ
  ctx.fillStyle = "rgba(136,14,79,0.6)";
  ctx.beginPath();
  ctx.arc(303, 108, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // --- lửa hồng nhỏ + đốm sáng
  for (const [x, y] of [[300, 40], [70, 172]] as const) {
    ctx.shadowColor = "#ff4081";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#ff80ab";
    ctx.beginPath();
    ctx.moveTo(x, y + 8);
    ctx.quadraticCurveTo(x - 8, y, x, y - 12);
    ctx.quadraticCurveTo(x + 8, y, x, y + 8);
    ctx.fill();
    ctx.fillStyle = "#fce4ec";
    ctx.beginPath();
    ctx.arc(x, y + 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  for (const [x, y, r] of [[40, 24, 3], [120, 14, 2.5], [290, 180, 2.5], [180, 190, 2], [312, 70, 2], [16, 110, 2]] as const) {
    ctx.fillStyle = "#fff59d";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  star(ctx, 96, 26, 5, "#f8bbd0");
}
