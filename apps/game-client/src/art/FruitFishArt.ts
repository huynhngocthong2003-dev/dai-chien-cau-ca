/**
 * CÁ TRÁI CÂY – 7 loài cá × trái cây (mỗi hệ 1 loài), vẽ thủ tục cùng bộ vector với mọi loài cá:
 * thân vẽ bằng drawVectorFish (dáng riêng), rồi phủ chi tiết trái cây bám theo điểm mốc thật của thân
 * (sống lưng, đầu, mũi, đuôi): vảy lá thanh long, cuống ớt, sọc & hạt dưa hấu, mắt dứa + vương miện lá,
 * gai sầu riêng, cánh sao khế, đài lá măng cụt…
 */
import type { FishAppearance, FishDef } from "@dccc/shared";
import { FISH_H, FISH_W } from "./FishArt.ts";
import { drawVectorFish, lastFishAnchors, resetFishAnchors } from "./VectorFish.ts";
import type { FishMorph } from "./fishMorph.ts";
import { OUTLINE, rgba, shade } from "./color.ts";

type Pt = { x: number; y: number };
type Anchors = {
  head: Pt;
  nose: Pt;
  tail: Pt;
  back: { x: number; y: number; ang: number }[];
  bodyH: number;
  /** Viền trên / dưới THẬT của thân tại cột x (dò từ bản vẽ nháp); -1 = cột trống. */
  top: (x: number) => number;
  bottom: (x: number) => number;
  /** Mép trái / phải của thân. */
  minX: number;
  maxX: number;
};

interface BossLook {
  appearance: FishAppearance;
  morph: FishMorph;
  /** Hào quang phía sau. */
  aura: string;
  /** Thu nhỏ cả con (cá Ớt nhỏ tí). */
  scale?: number;
  /** Tự vẽ toàn bộ con cá (không dùng thân vector) – cá Ớt vẽ đúng dáng trái ớt. */
  custom?: (c: CanvasRenderingContext2D) => void;
  /** Chi tiết trái cây vẽ SAU thân (gai, lá lưng…). */
  back?: (c: CanvasRenderingContext2D, a: Anchors) => void;
  /** Chi tiết trái cây vẽ TRƯỚC thân (vương miện, hạt, râu…). */
  front?: (c: CanvasRenderingContext2D, a: Anchors) => void;
}

const app = (o: Partial<FishAppearance> & Pick<FishAppearance, "shape" | "body">): FishAppearance => ({
  belly: "#ffffff",
  fin: o.body,
  pattern: "none",
  patternColor: "#000000",
  teeth: false,
  horns: false,
  spikes: false,
  eye: "glow",
  eyeColor: "#ffd740",
  glow: null,
  scale: 1.8,
  ...o,
});

const mo = (o: Partial<FishMorph>): FishMorph => ({
  aspect: 3,
  peak: 0.62,
  head: 1,
  hump: 1,
  bend: 0.15,
  wave: 0,
  tilt: 6,
  snout: "blunt",
  mouth: "smile",
  tail: "fork",
  tailSize: 1.1,
  dorsal: "low",
  dorsalSize: 1,
  pectoral: 1,
  whiskers: false,
  lure: false,
  scales: true,
  eyeSize: 1.25,
  ...o,
});

function ink(c: CanvasRenderingContext2D, p: Path2D, fill: string | CanvasGradient, w = 2.5) {
  c.fillStyle = fill;
  c.fill(p);
  c.lineWidth = w;
  c.strokeStyle = OUTLINE;
  c.lineJoin = "round";
  c.stroke(p);
}

/** Lá nhọn (lá thanh long / lá dứa / lá ớt) mọc từ (x,y) theo hướng ang. */
function leaf(c: CanvasRenderingContext2D, x: number, y: number, ang: number, len: number, w: number, col: string, tip?: string) {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  const p = new Path2D();
  p.moveTo(0, -w / 2);
  p.quadraticCurveTo(len * 0.55, -w * 0.9, len, 0);
  p.quadraticCurveTo(len * 0.55, w * 0.9, 0, w / 2);
  p.closePath();
  const g = c.createLinearGradient(0, 0, len, 0);
  g.addColorStop(0, col);
  g.addColorStop(1, tip ?? shade(col, 0.25));
  ink(c, p, g, 2);
  c.strokeStyle = rgba("#ffffff", 0.45);
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(len * 0.12, 0);
  c.lineTo(len * 0.8, 0);
  c.stroke();
  c.restore();
}

/** Lá nhọn CONG ra (đài măng cụt, đài ớt): gốc ở (x,y), đầu lá uốn lệch một góc bend. */
function curvedLeaf(c: CanvasRenderingContext2D, x: number, y: number, ang: number, len: number, w: number, bend: number, col: string, tip: string) {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  const tx = len * Math.cos(bend);
  const ty = len * Math.sin(bend);
  const p = new Path2D();
  p.moveTo(0, -w / 2);
  p.bezierCurveTo(len * 0.45, -w * 0.95, len * 0.8, ty - w * 0.35, tx, ty);
  p.bezierCurveTo(len * 0.7, ty * 0.35 + w * 0.15, len * 0.4, w * 0.9, 0, w / 2);
  p.closePath();
  const g = c.createLinearGradient(0, 0, tx, ty);
  g.addColorStop(0, col);
  g.addColorStop(1, tip);
  ink(c, p, g, 2);
  c.strokeStyle = rgba("#ffffff", 0.35);
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(len * 0.1, 0);
  c.quadraticCurveTo(len * 0.6, ty * 0.25, tx * 0.88, ty * 0.88);
  c.stroke();
  c.restore();
}

function seeds(c: CanvasRenderingContext2D, pts: Pt[], col = "#1b1530", r = 1.8) {
  c.fillStyle = col;
  for (const p of pts) {
    c.beginPath();
    c.ellipse(p.x, p.y, r, r * 1.4, 0.4, 0, Math.PI * 2);
    c.fill();
  }
}

/** Điểm nằm trên đoạn đầu → đuôi (t 0 = đuôi, 1 = đầu), lệch theo chiều cao thân. */
function along(a: Anchors, t: number, off: number): Pt {
  const x = a.tail.x + (a.head.x - a.tail.x) * t;
  const y = a.tail.y + (a.head.y - a.tail.y) * t;
  return { x, y: y + off * a.bodyH };
}

function star5(c: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, fill: string | CanvasGradient) {
  const p = new Path2D();
  for (let i = 0; i < 10; i++) {
    const ang = rot - Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.48 : r;
    if (i) p.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
    else p.moveTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
  }
  p.closePath();
  ink(c, p, fill, 2.5);
}

/**
 * CÁ ỚT – vẽ đúng dáng TRÁI ỚT: thân đỏ bóng, to tròn ở đầu (phía cuống) rồi thon nhọn và cong vút về đuôi,
 * đài lá xanh 5 cánh nhọn úp lên đầu + cuống xanh dày cong ngược; mặt cá ở phần to, vảy mờ, vây nhỏ.
 */
function drawChiliFish(c: CanvasRenderingContext2D) {
  // thân trái ớt (đầu phải, mũi nhọn cong xuống trái)
  const body = new Path2D();
  body.moveTo(262, 70);
  body.bezierCurveTo(278, 80, 284, 104, 272, 122);
  body.bezierCurveTo(254, 140, 214, 140, 176, 140);
  body.bezierCurveTo(130, 141, 92, 150, 62, 166);
  body.bezierCurveTo(48, 172, 36, 170, 34, 162);
  body.bezierCurveTo(52, 158, 74, 140, 98, 118);
  body.bezierCurveTo(130, 90, 170, 70, 214, 64);
  body.bezierCurveTo(236, 61, 252, 63, 262, 70);
  body.closePath();
  // vây nhỏ (sau thân): vây đuôi xíu ở chóp, vây bụng
  const fin = (pts: number[], col: string) => {
    const p = new Path2D();
    p.moveTo(pts[0]!, pts[1]!);
    for (let i = 2; i < pts.length; i += 4) p.quadraticCurveTo(pts[i]!, pts[i + 1]!, pts[i + 2]!, pts[i + 3]!);
    p.closePath();
    ink(c, p, col, 2);
  };
  fin([44, 164, 22, 150, 14, 158, 22, 166, 18, 182, 44, 170], "#ff7043");
  fin([170, 138, 160, 160, 146, 162, 156, 150, 150, 140], "#e53935");
  // thân: đỏ bóng chuyển sẫm ở bụng
  const g = c.createLinearGradient(0, 62, 0, 150);
  g.addColorStop(0, "#ff6e5a");
  g.addColorStop(0.45, "#e53935");
  g.addColorStop(1, "#9e0b0b");
  ink(c, body, g, 3);
  c.save();
  c.clip(body);
  // vảy mờ (hàng cung mở về đuôi)
  c.strokeStyle = "rgba(255,205,195,.38)";
  c.lineWidth = 1.8;
  for (let col = 0; col < 12; col++) {
    const x = 92 + col * 13;
    for (let row = 0; row < 7; row++) {
      const y = 60 + row * 12 + (col % 2 ? 6 : 0);
      c.beginPath();
      c.arc(x, y, 8, -Math.PI / 2, Math.PI / 2);
      c.stroke();
    }
  }
  // gân lõm dọc trái ớt
  c.strokeStyle = "rgba(120,0,0,.35)";
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(250, 112);
  c.bezierCurveTo(200, 120, 130, 120, 60, 160);
  c.stroke();
  c.restore();
  // vệt bóng loáng dài như vỏ ớt
  c.lineCap = "round";
  c.strokeStyle = "rgba(255,255,255,.85)";
  c.lineWidth = 6;
  c.beginPath();
  c.moveTo(232, 76);
  c.bezierCurveTo(190, 76, 150, 88, 112, 116);
  c.stroke();
  c.strokeStyle = "rgba(255,255,255,.55)";
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(98, 128);
  c.lineTo(84, 140);
  c.stroke();
  // vây ngực (đè lên thân)
  fin([226, 112, 214, 132, 196, 134, 208, 122, 204, 112], "#ff8a65");
  // mặt: mắt to, má hồng, miệng cười ở đầu ớt
  const eye = new Path2D();
  eye.arc(246, 101, 11, 0, Math.PI * 2);
  ink(c, eye, "#ffffff", 2.5);
  c.fillStyle = "#1a1030";
  c.beginPath();
  c.arc(249, 102, 6.5, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#ffffff";
  c.beginPath();
  c.arc(251, 99, 2.4, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "rgba(255,138,128,.7)";
  c.beginPath();
  c.ellipse(260, 118, 7, 4, 0, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 2.5;
  c.beginPath();
  c.moveTo(267, 118);
  c.quadraticCurveTo(272, 124, 277, 116);
  c.stroke();
  // đài lá xanh: 5 cánh nhọn cong ôm đầu ớt
  const cx = 262;
  const cy = 72;
  for (const [ang, len, bend] of [[3.2, 44, -0.45], [3.5, 38, -0.4], [4.1, 28, -0.3], [0.55, 26, 0.35], [5.6, 24, 0.3]] as const)
    curvedLeaf(c, cx, cy, ang, len, 16, bend, "#2e7d32", "#9ccc65");
  const cap = new Path2D();
  cap.ellipse(cx, cy, 19, 11, -0.5, 0, Math.PI * 2);
  ink(c, cap, "#388e3c", 2.2);
  // cuống ớt dày, cong ngược về sau
  const st = new Path2D();
  st.moveTo(cx - 5, cy - 4);
  st.bezierCurveTo(cx - 2, cy - 26, cx - 26, cy - 40, cx - 40, cy - 34);
  st.bezierCurveTo(cx - 42, cy - 30, cx - 40, cy - 26, cx - 36, cy - 27);
  st.bezierCurveTo(cx - 22, cy - 31, cx + 4, cy - 22, cx + 5, cy - 2);
  st.closePath();
  ink(c, st, "#43a047", 2.2);
  const tip = new Path2D();
  tip.ellipse(cx - 39, cy - 31, 4, 4.5, 0, 0, Math.PI * 2);
  ink(c, tip, "#795548", 1.6);
}

export const FRUIT_FISH_LOOKS: Record<string, BossLook> = {
  // ——— Mộc: Cá Thanh Long – thân hồng vảy lá đài, gai lá xanh dọc lưng, bụng trắng hạt đen
  ff_thanh_long: {
    appearance: app({ shape: "serpent", body: "#e91e63", belly: "#fff5f8", fin: "#ff4f8b", pattern: "scales", patternColor: "#ad1457", horns: true, teeth: true, eyeColor: "#ffd740", glow: "#76ff03" }),
    morph: mo({ aspect: 5.0, peak: 0.78, head: 1.3, wave: 0.28, tilt: 2, snout: "duck", mouth: "grin", tail: "flame", tailSize: 1.35, tailColor: "#ff5252", dorsal: "crest", dorsalSize: 1.2, whiskers: true, eyeSize: 1.3, sig: { head: "horns", mane: true } }),
    aura: "#76ff03",
    back: (c, a) => a.back.forEach((q, i) => leaf(c, q.x, q.y, q.ang + (i % 2 ? 0.15 : -0.15), 24 + (i % 3) * 5, 10, "#7cb342", "#c6ff00")),
    front: (c, a) => {
      for (let i = 0; i < 9; i++) {
        const p = along(a, 0.12 + i * 0.085, i % 2 ? -0.12 : 0.05);
        leaf(c, p.x, p.y, -2.6 + (i % 3) * 0.2, 15, 8, "#f06292", "#9ccc65");
      }
      const sd: Pt[] = [];
      for (let i = 0; i < 9; i++) {
        const x = a.minX + (a.maxX - a.minX) * (0.18 + i * 0.07);
        const b = a.bottom(x);
        if (b > 0) sd.push({ x, y: b - 6 });
      }
      seeds(c, sd);
    },
  },
  // ——— Hỏa: Cá Ớt – NHỎ, thân là trái ớt cong (to ở đầu, nhọn dần về đuôi), cuống xanh trùm đầu
  ff_ot: {
    appearance: app({ shape: "long", body: "#e53935", belly: "#ff8a80", fin: "#c62828", pattern: "none", eye: "normal", eyeColor: "#ffab00", glow: null, scale: 1 }),
    morph: mo({ aspect: 3.6, peak: 0.86, head: 1.25, hump: 1.15, bend: 0.38, tilt: 14, snout: "round", mouth: "smile", tail: "whip", tailSize: 0.5, tailColor: "#c62828", dorsal: "none", dorsalSize: 0.5, pectoral: 0.6, eyeSize: 1.2 }),
    aura: "#ff6d00",
    scale: 0.8,
    custom: drawChiliFish,
  },
  // ——— Thủy: Cá Dưa Hấu – vỏ sọc xanh, bụng ruột đỏ hạt đen, mầm lá + vòi nước
  ff_dua_hau: {
    appearance: app({ shape: "round", body: "#2e7d32", belly: "#ff5252", fin: "#66bb6a", pattern: "stripes", patternColor: "#1b5e20", eyeColor: "#40c4ff", glow: "#40c4ff" }),
    morph: mo({ aspect: 1.75, peak: 0.6, head: 1.4, hump: 1.4, bend: 0.1, tilt: 4, snout: "round", mouth: "open", tail: "fan", tailSize: 1.3, dorsal: "none", eyeSize: 1.4 }),
    aura: "#40c4ff",
    front: (c, a) => {
      const sd: Pt[] = [];
      for (let i = 0; i < 12; i++) {
        const x = a.minX + (a.maxX - a.minX) * (0.3 + (i % 6) * 0.08);
        const b = a.bottom(x);
        if (b > 0) sd.push({ x, y: b - 10 - Math.floor(i / 6) * 10 });
      }
      seeds(c, sd, "#1b1530", 2.4);
      const hx = a.maxX - (a.maxX - a.minX) * 0.3;
      const ty = a.top(hx);
      leaf(c, hx, ty + 2, -2.2, 22, 12, "#43a047", "#b2ff59");
      leaf(c, hx, ty + 2, -1.0, 18, 10, "#66bb6a", "#ccff90");
      c.fillStyle = "rgba(179,229,252,.9)";
      for (const [dx, dy, r] of [[0, -22, 5], [-8, -34, 4], [8, -36, 4], [0, -46, 3]] as const) {
        c.beginPath();
        c.arc(hx + dx, ty + dy, r, 0, Math.PI * 2);
        c.fill();
      }
    },
  },
  // ——— Kim: Cá Dứa – mai vàng mắt dứa, ĐUÔI là chùm lá dứa xanh
  ff_dua: {
    appearance: app({ shape: "flat", body: "#fbc02d", belly: "#fff3c4", fin: "#f9a825", pattern: "scales", patternColor: "#e65100", eyeColor: "#fff176", glow: "#ffd600" }),
    morph: mo({ aspect: 2.1, peak: 0.55, head: 1.2, hump: 1.5, bend: 0.08, tilt: 4, snout: "blunt", mouth: "grin", tail: "round", tailSize: 0.35, tailColor: "#2e7d32", dorsal: "low", dorsalSize: 0.7, pectoral: 1.2, eyeSize: 1.2 }),
    aura: "#ffd600",
    scale: 0.74,
    back: (c, a) => {
      // chùm lá dứa làm đuôi (xoè ra sau từ điểm đuôi thật)
      for (let k = -3; k <= 3; k++) leaf(c, a.tail.x + 18, a.tail.y, Math.PI + k * 0.3, 56 + (3 - Math.abs(k)) * 12, 17, "#2e7d32", "#9ccc65");
    },
    front: (c, a) => {
      for (let r = 0; r < 2; r++)
        for (let i = 0; i < 5; i++) {
          const x = a.minX + (a.maxX - a.minX) * (0.22 + i * 0.11 + r * 0.055);
          const t = a.top(x);
          const b = a.bottom(x);
          if (t < 0 || b < 0) continue;
          const y = t + (b - t) * (0.3 + r * 0.25);
          const d = new Path2D();
          d.moveTo(x, y - 7);
          d.lineTo(x + 7, y);
          d.lineTo(x, y + 7);
          d.lineTo(x - 7, y);
          d.closePath();
          ink(c, d, "#ff8f00", 1.6);
          c.fillStyle = "#6d4c41";
          c.beginPath();
          c.arc(x, y, 2, 0, Math.PI * 2);
          c.fill();
        }
    },
  },
  // ——— Thổ: Cá Sầu Riêng – gai mọc ĐÚNG theo viền thân (trên & dưới), vỏ nứt lộ múi vàng
  ff_sau_rieng: {
    appearance: app({ shape: "puffer", body: "#9e9d24", belly: "#fff59d", fin: "#827717", pattern: "none", spikes: false, eye: "angry", eyeColor: "#ffca28", glow: "#c6a700" }),
    morph: mo({ aspect: 1.45, peak: 0.55, head: 1.3, hump: 1.2, bend: 0.05, tilt: 2, snout: "round", mouth: "pout", tail: "fan", tailSize: 0.9, dorsal: "none", eyeSize: 1.35 }),
    aura: "#c6a700",
    back: (c, a) => {
      const spike = (x: number, y: number, nx: number, ny: number, len: number) => {
        const p = new Path2D();
        p.moveTo(x - ny * 6, y + nx * 6);
        p.lineTo(x + nx * len, y + ny * len);
        p.lineTo(x + ny * 6, y - nx * 6);
        p.closePath();
        ink(c, p, "#9e9d24", 2);
      };
      const x0 = a.minX + (a.maxX - a.minX) * 0.3;
      const x1 = a.maxX - (a.maxX - a.minX) * 0.1;
      for (let i = 0; i <= 9; i++) {
        const x = x0 + ((x1 - x0) * i) / 9;
        const t = a.top(x);
        const b = a.bottom(x);
        const dt = a.top(x + 4) - a.top(x - 4);
        const db = a.bottom(x + 4) - a.bottom(x - 4);
        if (t > 0) {
          const L = Math.hypot(dt, 8) || 1;
          spike(x, t + 4, dt / L, -8 / L, 15);
        }
        if (b > 0) {
          const L = Math.hypot(db, 8) || 1;
          spike(x, b - 4, -db / L, 8 / L, 13);
        }
      }
    },
    front: (c, a) => {
      // gai nhỏ rải trên thân + 3 múi vàng lộ ở bụng
      c.fillStyle = "#827717";
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.4;
      for (let i = 0; i < 12; i++) {
        const x = a.minX + (a.maxX - a.minX) * (0.34 + (i % 6) * 0.09);
        const t = a.top(x);
        const b = a.bottom(x);
        if (t < 0) continue;
        const y = t + (b - t) * (0.22 + Math.floor(i / 6) * 0.2);
        const p = new Path2D();
        p.moveTo(x - 4, y + 3);
        p.lineTo(x, y - 5);
        p.lineTo(x + 4, y + 3);
        p.closePath();
        c.fill(p);
        c.stroke(p);
      }
      for (let i = 0; i < 3; i++) {
        const x = a.minX + (a.maxX - a.minX) * (0.42 + i * 0.12);
        const b = a.bottom(x);
        if (b < 0) continue;
        const m = new Path2D();
        m.ellipse(x, b - 12, 9, 6, -0.3 + i * 0.3, 0, Math.PI * 2);
        ink(c, m, "#fdd835", 1.8);
      }
    },
  },
  // ——— Ánh Sáng: Cá Khế – thân vàng trong, cánh sao khế, hào quang
  ff_khe: {
    appearance: app({ shape: "flat", body: "#ffeb3b", belly: "#fffde7", fin: "#fff176", pattern: "none", eyeColor: "#ffffff", glow: "#fff59d" }),
    morph: mo({ aspect: 2.4, peak: 0.58, head: 0.9, hump: 1, bend: 0.12, tilt: 8, snout: "pointed", mouth: "smile", tail: "whip", tailSize: 1.5, tailColor: "#fff59d", dorsal: "wave", dorsalSize: 1.2, pectoral: 2.2, eyeSize: 1.3, sig: { finwings: true } }),
    aura: "#fff59d",
    back: (c, a) => a.back.filter((_, i) => i % 3 === 1).forEach((q, i) => star5(c, q.x, q.y - 12, 18 - i, q.ang + Math.PI / 2, "#fbc02d")),
    front: (c, a) => {
      const hx = a.maxX - (a.maxX - a.minX) * 0.25;
      const ty = a.top(hx);
      c.strokeStyle = "#fff176";
      c.lineWidth = 4;
      c.beginPath();
      c.ellipse(hx, ty - 14, 20, 6, -0.12, 0, Math.PI * 2);
      c.stroke();
    },
  },
  // ——— Bóng Tối: Cá Măng Cụt – thân TRÒN tím sẫm như trái măng cụt, ĐUÔI là đài lá xanh sẫm
  ff_mang_cut: {
    appearance: app({ shape: "round", body: "#4a148c", belly: "#7b1fa2", fin: "#33691e", pattern: "none", eyeColor: "#e040fb", glow: "#aa00ff" }),
    morph: mo({ aspect: 1.35, peak: 0.55, head: 1.2, hump: 1.1, bend: 0.04, tilt: 3, snout: "round", mouth: "smile", tail: "round", tailSize: 0.3, tailColor: "#2e4a1a", dorsal: "none", pectoral: 0.8, eyeSize: 1.4 }),
    aura: "#aa00ff",
    scale: 0.74,
    front: (c, a) => {
      // đài lá xanh sẫm: các lá NHỌN cong xoè ra sau (như đài trái măng cụt) – vẽ đè lên đuôi
      const tx = a.tail.x + 8;
      const ty = a.tail.y;
      for (const [ang, len, bend] of [[Math.PI - 1.25, 62, -0.7], [Math.PI - 0.55, 74, -0.45], [Math.PI + 0.55, 74, 0.45], [Math.PI + 1.25, 62, 0.7], [Math.PI, 66, 0.1]] as const)
        curvedLeaf(c, tx + 14, ty, ang, len, 30, bend, "#2e4a1a", "#558b2f");
      const stem = new Path2D();
      stem.ellipse(tx + 6, ty, 8, 7, 0, 0, Math.PI * 2);
      ink(c, stem, "#1b3a0c", 2);
    },
    back: (c, a) => {
      // bóng loáng vỏ măng cụt (dưới lớp đài lá)
      const x = a.minX + (a.maxX - a.minX) * 0.45;
      const t = a.top(x);
      c.fillStyle = "rgba(255,255,255,.35)";
      c.beginPath();
      c.ellipse(x, t + 14, 20, 7, -0.3, 0, Math.PI * 2);
      c.fill();
    },
  },
};

export const FRUIT_FISH_IDS = Object.keys(FRUIT_FISH_LOOKS);

/** Boss Thế Giới dùng đúng tạo hình Cá Trái Cây cùng hệ. */
export const WORLD_BOSS_FRUIT: Record<string, string> = {
  wb_thanh_long: "ff_thanh_long",
  wb_ot_hoa: "ff_ot",
  wb_dua_hau: "ff_dua_hau",
  wb_dua_giap: "ff_dua",
  wb_sau_rieng: "ff_sau_rieng",
  wb_khe_tinh: "ff_khe",
  wb_mang_cut: "ff_mang_cut",
};

/** Vẽ Boss Thế Giới: cá trái cây tương ứng, vẽ ĐẦY khung (bỏ thu nhỏ). */
export function drawFruitBoss(ctx: CanvasRenderingContext2D, bossId: string) {
  drawFruitFish(ctx, WORLD_BOSS_FRUIT[bossId] ?? "ff_thanh_long", 1, true);
}

/** Vẽ Cá Trái Cây trong khung 320×200 (cùng khung cá). fullSize = bỏ hệ số thu nhỏ riêng của loài (boss). */
export function drawFruitFish(ctx: CanvasRenderingContext2D, id: string, stage = 1, fullSize = false) {
  const look = FRUIT_FISH_LOOKS[id];
  if (!look) return;
  const fish: Pick<FishDef, "id" | "appearance"> = { id, appearance: look.appearance };
  ctx.save();
  if (look.scale && !fullSize) {
    ctx.translate(FISH_W / 2, FISH_H / 2);
    ctx.scale(look.scale, look.scale);
    ctx.translate(-FISH_W / 2, -FISH_H / 2);
  }
  if (look.custom) {
    const ga = ctx.createRadialGradient(FISH_W / 2, FISH_H / 2, 8, FISH_W / 2, FISH_H / 2, 120);
    ga.addColorStop(0, rgba(look.aura, 0.35));
    ga.addColorStop(1, rgba(look.aura, 0));
    ctx.fillStyle = ga;
    ctx.beginPath();
    ctx.ellipse(FISH_W / 2, FISH_H / 2, 155, 95, 0, 0, Math.PI * 2);
    ctx.fill();
    look.custom(ctx);
    ctx.restore();
    return;
  }
  // đo điểm mốc + viền thật của thân (vẽ nháp)
  const probe = document.createElement("canvas");
  probe.width = FISH_W;
  probe.height = FISH_H;
  const pc = probe.getContext("2d", { willReadFrequently: true })!;
  resetFishAnchors();
  drawVectorFish(pc, fish, stage, look.morph);
  const an = lastFishAnchors;
  const px = pc.getImageData(0, 0, FISH_W, FISH_H).data;
  const col = (x: number) => Math.max(0, Math.min(FISH_W - 1, Math.round(x)));
  const top = (x: number) => {
    const xi = col(x);
    for (let y = 0; y < FISH_H; y++) if (px[(y * FISH_W + xi) * 4 + 3]! > 200) return y;
    return -1;
  };
  const bottom = (x: number) => {
    const xi = col(x);
    for (let y = FISH_H - 1; y >= 0; y--) if (px[(y * FISH_W + xi) * 4 + 3]! > 200) return y;
    return -1;
  };
  let minX = FISH_W;
  let maxX = 0;
  for (let x = 0; x < FISH_W; x++) {
    const t = top(x);
    // bỏ vây mỏng: chỉ tính cột đủ dày
    if (t >= 0 && bottom(x) - t > 24) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    }
  }
  const a: Anchors = {
    head: an ? { x: an.head.x, y: an.head.y } : { x: 250, y: 90 },
    nose: an ? { x: an.nose.x, y: an.nose.y } : { x: 290, y: 100 },
    tail: an ? { x: an.tail.x, y: an.tail.y } : { x: 40, y: 100 },
    back: an ? an.back.map((q) => ({ x: q.p.x, y: q.p.y, ang: q.ang })) : [],
    bodyH: an?.bodyH ?? 70,
    top,
    bottom,
    minX: minX < maxX ? minX : 40,
    maxX: minX < maxX ? maxX : 280,
  };
  const g = ctx.createRadialGradient(FISH_W / 2, FISH_H / 2, 8, FISH_W / 2, FISH_H / 2, 120);
  g.addColorStop(0, rgba(look.aura, 0.35));
  g.addColorStop(1, rgba(look.aura, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(FISH_W / 2, FISH_H / 2, 155, 95, 0, 0, Math.PI * 2);
  ctx.fill();
  look.back?.(ctx, a);
  drawVectorFish(ctx, fish, stage, look.morph);
  look.front?.(ctx, a);
  ctx.restore();
}
