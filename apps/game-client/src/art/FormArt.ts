import type { FishDef, FishFormDef, FormAura } from "@dccc/shared";
import { FISH_H, FISH_W, drawFish } from "./FishArt.ts";
import { lastFishAnchors, resetFishAnchors } from "./VectorFish.ts";
const setLastAnchorsNull = resetFishAnchors;
import { OUTLINE, rgba, shade } from "./color.ts";

/**
 * Cá sau đột biến: đổi màu thân/vây/mắt theo dạng + hiệu ứng riêng (lửa, băng, sét, rồng, cánh…).
 * Cá quay đầu sang phải; thân cá được thu nhỏ 84% vào giữa để chừa chỗ cho hiệu ứng.
 */
const K = 0.84;
const CX = FISH_W / 2;
const CY = FISH_H / 2 + 6;
/** Toạ độ trên thân cá (sau khi thu nhỏ). */
const P = (x: number, y: number) => ({ x: CX + (x - FISH_W / 2) * K, y: CY + (y - FISH_H / 2) * K });

function flameTongue(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, w: number, lean: number, c1: string, c2: string, c3: string) {
  const g = ctx.createLinearGradient(x, y, x + lean, y - h);
  g.addColorStop(0, c1);
  g.addColorStop(0.55, c2);
  g.addColorStop(1, c3);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.quadraticCurveTo(x - w * 0.9, y - h * 0.55, x + lean, y - h);
  ctx.quadraticCurveTo(x + w * 0.9, y - h * 0.5, x + w, y);
  ctx.closePath();
  ctx.fill();
}

/** Hệ số kích cỡ hiệu ứng theo giai trưởng thành (Sơ 0,85 → Thánh 1,3). */
let SK = 1;
/** Điểm dọc sống lưng THẬT của con cá (đo trước khi vẽ) – gai / lửa mọc theo đúng dáng. */
let backPts: { x: number; y: number; ang: number }[] | null = null;
let tailAt: { x: number; y: number } | null = null;
/** Đầu / mũi dò từ đường viền (khi loài không có điểm mốc vector). */
let maskHead: { head: { x: number; y: number }; nose: { x: number; y: number } } | null = null;

/** Vẽ hình mọc từ điểm (x,y) theo hướng pháp tuyến `ang` (hình gốc vẽ hướng lên trên). */
function along(ctx: CanvasRenderingContext2D, x: number, y: number, ang: number, draw: () => void) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang + Math.PI / 2);
  draw();
  ctx.restore();
}

function flames(ctx: CanvasRenderingContext2D, pal: [string, string, string], back: boolean) {
  const [a, b, c] = pal;
  if (back && backPts) {
    backPts.forEach((q, i) => along(ctx, q.x, q.y, q.ang, () => flameTongue(ctx, 0, 4, (30 + (i % 3) * 12) * SK, 11 * SK, -8, a, b, c)));
    const t = tailAt ?? P(34, 100);
    for (const [dy, h] of [[-22, 46], [0, 60], [22, 46]] as const) flameTongue(ctx, t.x + 6, t.y + dy * SK, h * SK, 13 * SK, -48 * SK, a, b, c);
  } else if (back) {
    // ngọn lửa dọc sống lưng + đuôi
    for (let i = 0; i < 7; i++) {
      const p = P(95 + i * 24, 66 + Math.abs(i - 3) * 4);
      flameTongue(ctx, p.x, p.y, 34 + (i % 3) * 14, 12, -10 - i, a, b, c);
    }
    const t = P(34, 100);
    for (const [dy, h] of [[-22, 46], [0, 60], [22, 46]] as const) flameTongue(ctx, t.x + 12, t.y + dy, h, 13, -48, a, b, c);
  } else {
    // đốm lửa nhỏ bay quanh
    ctx.fillStyle = rgba(c, 0.9);
    for (const [x, y, r] of [[40, 40, 4], [280, 50, 5], [250, 170, 3], [70, 165, 4], [300, 120, 3]] as const) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function crystals(ctx: CanvasRenderingContext2D, col: string, edge: string, dark: boolean) {
  const shard = (x: number, y: number, h: number, w: number, ang: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    const g = ctx.createLinearGradient(0, 0, 0, -h);
    g.addColorStop(0, dark ? "#0d1b4a" : col);
    g.addColorStop(1, dark ? col : "#ffffff");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-w, 0);
    ctx.lineTo(-w * 0.4, -h * 0.75);
    ctx.lineTo(0, -h);
    ctx.lineTo(w * 0.5, -h * 0.7);
    ctx.lineTo(w, 0);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = edge;
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -h);
    ctx.lineTo(-w * 0.2, -h * 0.2);
    ctx.stroke();
    ctx.restore();
  };
  if (backPts) {
    // gai pha lê mọc dọc sống lưng thật, to dần theo giai
    backPts.forEach((q, i) => shard(q.x, q.y, (26 + ((i * 7) % 3) * 11) * SK, 8.5 * SK, q.ang + Math.PI / 2 + (i - 3) * 0.04));
    const t = tailAt ?? P(40, 100);
    shard(t.x, t.y - 6, 30 * SK, 8 * SK, -1.9);
    shard(t.x, t.y + 6, 30 * SK, 8 * SK, -1.25);
    return;
  }
  for (let i = 0; i < 6; i++) {
    const p = P(100 + i * 22, 70 + Math.abs(i - 2.5) * 4);
    shard(p.x, p.y, 30 + ((i * 7) % 3) * 12, 9, -0.35 + i * 0.12);
  }
  const t = P(40, 100);
  shard(t.x, t.y - 8, 34, 9, -1.9);
  shard(t.x, t.y + 8, 34, 9, -1.25);
}

function bolts(ctx: CanvasRenderingContext2D, col: string, n: number, seed: number) {
  let s = seed;
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  ctx.lineCap = "round";
  // tâm thân cá thật (trung bình sống lưng & đuôi) – tia sét toả quanh thân
  const pts0 = backPts?.length ? [...backPts, ...(tailAt ? [tailAt] : [])] : null;
  const cx0 = pts0 ? pts0.reduce((a2, q) => a2 + q.x, 0) / pts0.length : CX;
  const cy0 = pts0 ? pts0.reduce((a2, q) => a2 + q.y, 0) / pts0.length + 14 : CY;
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    let x = cx0 + Math.cos(a) * 70;
    let y = cy0 + Math.sin(a) * 40;
    const pts = [[x, y]];
    for (let k = 0; k < 4; k++) {
      x += Math.cos(a) * 16 + (r() - 0.5) * 22;
      y += Math.sin(a) * 12 + (r() - 0.5) * 22;
      pts.push([x, y]);
    }
    for (const [w, c] of [[8, rgba(col, 0.35)], [4, col], [1.6, "#ffffff"]] as const) {
      ctx.lineWidth = w;
      ctx.strokeStyle = c;
      ctx.beginPath();
      pts.forEach(([px, py], j) => (j ? ctx.lineTo(px!, py!) : ctx.moveTo(px!, py!)));
      ctx.stroke();
    }
  }
}

/** Đầu / mõm của con cá vừa vẽ (theo dáng riêng của loài), trong hệ toạ độ của khung thể đột biến. */
let headAt: { x: number; y: number } | null = null;
let noseAt: { x: number; y: number } | null = null;

function whiskers(ctx: CanvasRenderingContext2D, col: string, glow: string) {
  const n = noseAt ? { x: noseAt.x - 2, y: noseAt.y } : P(298, 104);
  // hướng đầu cá (đầu → mũi); râu mọc từ mũi, vắt ngược về phía thân, uốn lượn – đúng với mọi dáng (nằm, đứng, uốn)
  const h = headAt ?? P(268, 80);
  let dx = n.x - h.x;
  let dy = n.y - h.y;
  const L = Math.hypot(dx, dy) || 1;
  dx /= L;
  dy /= L;
  const nx = -dy;
  const ny = dx;
  ctx.lineCap = "round";
  for (const [k, len] of [[1, 1], [-1, 0.8]] as const) {
    const ln = 52 * len * SK;
    const ex = n.x - dx * ln * 0.75 + nx * k * ln * 0.55;
    const ey = n.y - dy * ln * 0.75 + ny * k * ln * 0.55;
    for (const [w, c] of [[7, rgba(glow, 0.35)], [3.5, col]] as const) {
      ctx.lineWidth = w;
      ctx.strokeStyle = c;
      ctx.beginPath();
      ctx.moveTo(n.x, n.y);
      ctx.bezierCurveTo(n.x + dx * 14 + nx * k * 10, n.y + dy * 14 + ny * k * 10, n.x - dx * ln * 0.3 + nx * k * ln * 0.6, n.y - dy * ln * 0.3 + ny * k * ln * 0.6, ex, ey);
      ctx.stroke();
    }
  }
}

function mane(ctx: CanvasRenderingContext2D, col: string) {
  // bờm rồng dọc sống lưng THẬT của con cá (dáng nào cũng bám đúng); thiếu điểm mốc thì dùng vị trí mặc định
  ctx.fillStyle = col;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  const blade = () => {
    ctx.beginPath();
    ctx.moveTo(-10 * SK, 2);
    ctx.quadraticCurveTo(-14 * SK, -22 * SK, -20 * SK, -32 * SK);
    ctx.quadraticCurveTo(2 * SK, -18 * SK, 10 * SK, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };
  if (backPts?.length) {
    backPts.forEach((q) => along(ctx, q.x, q.y, q.ang, blade));
    return;
  }
  for (let i = 0; i < 8; i++) {
    const p = P(80 + i * 24, 72 + Math.abs(i - 3.5) * 3);
    ctx.save();
    ctx.translate(p.x, p.y);
    blade();
    ctx.restore();
  }
}

function wings(ctx: CanvasRenderingContext2D, c1: string, c2: string, feather: boolean) {
  // cánh mọc từ giữa sống lưng thật
  const mid = backPts?.length ? backPts[Math.floor(backPts.length / 2)]! : null;
  const base = mid ? { x: mid.x, y: mid.y + 4 } : P(150, 82);
  for (const [dx, sc, al] of [[-26, 0.86, 0.8], [0, 1, 1]] as const) {
    ctx.save();
    ctx.globalAlpha = al;
    ctx.translate(base.x + dx, base.y);
    ctx.scale(sc, sc);
    for (let i = 7; i >= 0; i--) {
      const ang = -2.95 + i * 0.2;
      const len = 100 - i * 5;
      const tx = Math.cos(ang) * len;
      const ty = Math.sin(ang) * len;
      const g = ctx.createLinearGradient(0, 0, tx, ty);
      g.addColorStop(0, c1);
      g.addColorStop(1, c2);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(tx * 0.5 - 16, ty * 0.5 - 14, tx, ty);
      ctx.quadraticCurveTo(tx * 0.5 + 16, ty * 0.5 + 14, 0, 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = feather ? rgba(OUTLINE, 0.6) : OUTLINE;
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
    ctx.restore();
  }
}

function halo(ctx: CanvasRenderingContext2D, col = "#fff176") {
  const h = headAt ? { x: headAt.x, y: headAt.y - 30 } : P(268, 52);
  for (const [w, c] of [[9, rgba(col, 0.35)], [5, col], [1.5, "#ffffff"]] as const) {
    ctx.lineWidth = w;
    ctx.strokeStyle = c;
    ctx.beginPath();
    ctx.ellipse(h.x, h.y, 26, 8, -0.15, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function mist(ctx: CanvasRenderingContext2D, col: string) {
  for (let i = 0; i < 9; i++) {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 34);
    g.addColorStop(0, rgba(col, 0.45));
    g.addColorStop(1, rgba(col, 0));
    ctx.save();
    ctx.translate(36 + i * 31, 140 + Math.sin(i) * 14);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = "#ffffff";
  for (const [x, y] of [[40, 30], [120, 20], [210, 34], [290, 70], [20, 120], [300, 160]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function cloud(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(55,71,79,0.85)";
  for (const [x, y, r] of [[60, 40, 26], [92, 30, 32], [130, 38, 24], [230, 160, 22], [262, 152, 28], [296, 162, 20]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function backGlow(ctx: CanvasRenderingContext2D, col: string, strength = 0.55) {
  const g = ctx.createRadialGradient(CX, CY, 10, CX, CY, 150);
  g.addColorStop(0, rgba(col, strength));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, FISH_W, FISH_H);
}

type F = FishFormDef;
const pal = (f: F, d: [string, string, string]): [string, string, string] => f.look.palette ?? d;

const AURA: Record<FormAura, { back?: (c: CanvasRenderingContext2D, f: F) => void; front?: (c: CanvasRenderingContext2D, f: F) => void }> = {
  flame: { back: (c, f) => flames(c, pal(f, ["#ff1744", "#ff9100", "#ffea00"]), true), front: (c, f) => flames(c, pal(f, ["#ff1744", "#ff9100", "#ffea00"]), false) },
  darkflame: { back: (c, f) => flames(c, pal(f, ["#311b92", "#6200ea", "#000000"]), true), front: (c, f) => flames(c, pal(f, ["#311b92", "#6200ea", "#ea80fc"]), false) },
  blueflame: { back: (c, f) => flames(c, pal(f, ["#0d47a1", "#00b0ff", "#e1f5fe"]), true), front: (c, f) => flames(c, pal(f, ["#0d47a1", "#00b0ff", "#e1f5fe"]), false) },
  ice: { back: (c, f) => crystals(c, pal(f, ["#b3e5fc", "#0277bd", "#ffffff"])[0], pal(f, ["#b3e5fc", "#0277bd", "#ffffff"])[1], false) },
  frost: { back: (c, f) => mist(c, pal(f, ["#e3f2fd", "#90a4ae", "#ffffff"])[0]), front: (c, f) => crystals(c, pal(f, ["#ffffff", "#90a4ae", "#ffffff"])[0], pal(f, ["#ffffff", "#90a4ae", "#ffffff"])[1], false) },
  abyss: { back: (c, f) => crystals(c, pal(f, ["#2962ff", "#000000", "#00e5ff"])[0], pal(f, ["#2962ff", "#000000", "#00e5ff"])[1], true), front: (c, f) => bolts(c, pal(f, ["#2962ff", "#000000", "#00e5ff"])[2], 2, 5) },
  lightning: { front: (c, f) => bolts(c, pal(f, ["#ffee58", "#ffee58", "#ffee58"])[0], 5, 11) },
  purplebolt: { front: (c, f) => bolts(c, pal(f, ["#e040fb", "#e040fb", "#e040fb"])[0], 5, 23) },
  storm: { back: (c) => cloud(c), front: (c, f) => bolts(c, pal(f, ["#ffeb3b", "#ffeb3b", "#ffeb3b"])[0], 4, 37) },
  dragon: { back: (c, f) => mane(c, pal(f, ["#26c6da", "#e0f7fa", "#1de9b6"])[0]), front: (c, f) => whiskers(c, pal(f, ["#26c6da", "#e0f7fa", "#1de9b6"])[1], pal(f, ["#26c6da", "#e0f7fa", "#1de9b6"])[2]) },
  golddragon: { back: (c, f) => mane(c, pal(f, ["#ffd54f", "#fff8e1", "#ffd600"])[0]), front: (c, f) => whiskers(c, pal(f, ["#ffd54f", "#fff8e1", "#ffd600"])[1], pal(f, ["#ffd54f", "#fff8e1", "#ffd600"])[2]) },
  blackdragon: {
    back: (c, f) => {
      const p = pal(f, ["#4a148c", "#b388ff", "#aa00ff"]);
      mane(c, p[0]);
      flames(c, ["#1a1a1a", p[0], "#000000"], true);
    },
    front: (c, f) => whiskers(c, pal(f, ["#4a148c", "#b388ff", "#aa00ff"])[1], pal(f, ["#4a148c", "#b388ff", "#aa00ff"])[2]),
  },
  phoenix: {
    back: (c, f) => {
      const p = pal(f, ["#ff3d00", "#ff9100", "#ffea00"]);
      flames(c, p, true);
      wings(c, p[2], p[0], false);
    },
    front: (c, f) => flames(c, pal(f, ["#ff3d00", "#ff9100", "#fff59d"]), false),
  },
  angel: { back: (c, f) => wings(c, pal(f, ["#ffffff", "#ffe082", "#fff176"])[0], pal(f, ["#ffffff", "#ffe082", "#fff176"])[1], true), front: (c, f) => halo(c, pal(f, ["#ffffff", "#ffe082", "#fff176"])[2]) },
};

// ------------------------------------------------------------------ trang trí theo cấp cá
function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, col: string) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x, y - r * 2);
  ctx.lineTo(x + r * 0.5, y - r * 0.5);
  ctx.lineTo(x + r * 2, y);
  ctx.lineTo(x + r * 0.5, y + r * 0.5);
  ctx.lineTo(x, y + r * 2);
  ctx.lineTo(x - r * 0.5, y + r * 0.5);
  ctx.lineTo(x - r * 2, y);
  ctx.lineTo(x - r * 0.5, y - r * 0.5);
  ctx.closePath();
  ctx.fill();
}

/** Vương miện trên đầu cá (Huyền Thoại vàng, Thần Thoại cầu vồng ngọc). */
function crown(ctx: CanvasRenderingContext2D, mythic: boolean, gem: string) {
  const h = headAt ? { x: headAt.x, y: headAt.y - 8 } : P(262, 58);
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.rotate(-0.12);
  const w = mythic ? 46 : 38;
  const g = ctx.createLinearGradient(0, -24, 0, 6);
  g.addColorStop(0, "#fff59d");
  g.addColorStop(1, "#ff8f00");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-w / 2, 6);
  ctx.lineTo(-w / 2, -10);
  const peaks = mythic ? 5 : 3;
  for (let i = 0; i <= peaks * 2; i++) {
    const x = -w / 2 + (i * w) / (peaks * 2);
    ctx.lineTo(x, i % 2 ? -8 : -24 - (i === peaks ? 8 : 0));
  }
  ctx.lineTo(w / 2, 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // ngọc
  const gems = mythic ? ["#ff1744", "#2979ff", "#00e676", "#d500f9", "#ffea00"] : [gem];
  gems.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(gems.length === 1 ? 0 : -w / 2 + 6 + (i * (w - 12)) / (gems.length - 1), -2, mythic ? 3.6 : 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  });
  ctx.restore();
}

/** Vòng ấn chú cổ xưa xoay sau lưng cá Thần Thoại. */
function runeRing(ctx: CanvasRenderingContext2D, col: string) {
  ctx.save();
  ctx.translate(CX, CY);
  ctx.scale(1, 0.62);
  for (const [r, w, a] of [[118, 8, 0.35], [118, 3, 1], [100, 2, 0.75]] as const) {
    ctx.strokeStyle = rgba(col, a);
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  const runes = ["ᚠ", "ᚱ", "ᛟ", "ᛉ", "ᚦ", "ᛞ", "ᛗ", "ᚨ", "ᛒ", "ᛃ", "ᛚ", "ᛜ"];
  ctx.fillStyle = rgba("#ffffff", 0.9);
  ctx.font = "bold 13px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  runes.forEach((ch, i) => {
    const a = (i / runes.length) * Math.PI * 2;
    ctx.fillText(ch, Math.cos(a) * 109, Math.sin(a) * 109);
  });
  ctx.restore();
}

/** Quầng cầu vồng (Thần Thoại). */
function rainbowGlow(ctx: CanvasRenderingContext2D) {
  const cols = ["#ff1744", "#ff9100", "#ffea00", "#00e676", "#2979ff", "#d500f9"];
  cols.forEach((c, i) => {
    const g = ctx.createRadialGradient(CX, CY, 20, CX, CY, 150 - i * 6);
    g.addColorStop(0, rgba(c, 0));
    g.addColorStop(0.75, rgba(c, 0.1));
    g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FISH_W, FISH_H);
  });
}

function tierBack(ctx: CanvasRenderingContext2D, rarity: FishDef["rarity"], form: FishFormDef) {
  if (rarity === "mythic") {
    rainbowGlow(ctx);
    runeRing(ctx, form.glow);
  } else if (rarity === "legendary") {
    backGlow(ctx, "#ffd54f", 0.35);
  }
}

function tierFront(ctx: CanvasRenderingContext2D, rarity: FishDef["rarity"], form: FishFormDef) {
  if (rarity !== "legendary" && rarity !== "mythic") return;
  const mythic = rarity === "mythic";
  crown(ctx, mythic, form.glow);
  const pts: [number, number, number][] = [[30, 30, 4], [300, 28, 5], [14, 110, 3], [306, 150, 4], [80, 186, 3], [240, 184, 4], [160, 14, 3]];
  pts.slice(0, mythic ? 7 : 5).forEach(([x, y, r], i) => sparkle(ctx, x, y, r, i % 2 ? "#ffffff" : mythic ? ["#ff80ab", "#80d8ff", "#b9f6ca", "#ffe57f"][i % 4]! : "#ffe57f"));
  if (mythic) {
    // quả cầu năng lượng bay quanh
    for (const [x, y, c] of [[40, 70, "#80d8ff"], [286, 92, "#ff80ab"], [150, 176, "#b9f6ca"]] as const) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, 10);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.4, c);
      g.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}


/**
 * Dò ĐƯỜNG VIỀN THẬT của hình cá (vẽ nháp lên canvas riêng rồi đọc độ đục từng cột) → sống lưng, đuôi, mũi, đầu.
 * Dùng cho loài có hình vẽ riêng (Thần Thoại, Boss đặc biệt, cá lai) – không có sẵn điểm mốc như cá vẽ vector.
 * Toạ độ trả về là toạ độ khung 320×200 (cùng hệ với các hiệu ứng đột biến). Cá quay đầu sang phải.
 */
type MaskAnchors = { back: { x: number; y: number; ang: number }[]; tail: { x: number; y: number }; nose: { x: number; y: number }; head: { x: number; y: number } };
function maskAnchors(drawShape: (c: CanvasRenderingContext2D) => void): MaskAnchors | null {
  const W = FISH_W;
  const H = FISH_H;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const c = cv.getContext("2d", { willReadFrequently: true });
  if (!c) return null;
  drawShape(c);
  const d = c.getImageData(0, 0, W, H).data;
  const top = new Array<number>(W).fill(-1);
  const bot = new Array<number>(W).fill(-1);
  let xmin = W;
  let xmax = -1;
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++)
      if (d[(y * W + x) * 4 + 3]! > 200) {
        top[x] = y;
        break;
      }
    if (top[x]! < 0) continue;
    for (let y = H - 1; y >= 0; y--)
      if (d[(y * W + x) * 4 + 3]! > 200) {
        bot[x] = y;
        break;
      }
    xmin = Math.min(xmin, x);
    xmax = Math.max(xmax, x);
  }
  const w = xmax - xmin;
  if (w < 30) return null;
  const topAt = (x: number) => {
    for (let k = 0; k < 8; k++) for (const xx of [x + k, x - k]) if (xx >= 0 && xx < W && top[xx]! >= 0) return top[xx]!;
    return CY;
  };
  const botAt = (x: number) => {
    for (let k = 0; k < 8; k++) for (const xx of [x + k, x - k]) if (xx >= 0 && xx < W && bot[xx]! >= 0) return bot[xx]!;
    return CY;
  };
  const back: MaskAnchors["back"] = [];
  for (let t = 0.2; t <= 0.76; t += 0.07) {
    const x = Math.round(xmin + t * w);
    const dy = topAt(x + 5) - topAt(x - 5);
    // pháp tuyến hướng ra ngoài sống lưng (hình gốc của hiệu ứng vẽ hướng lên)
    back.push({ x, y: topAt(x) + 3, ang: Math.atan2(dy, 10) - Math.PI / 2 });
  }
  const xt = Math.round(xmin + 0.04 * w);
  const xn = Math.round(xmax - 0.03 * w);
  const xh = Math.round(xmax - 0.2 * w);
  return {
    back,
    tail: { x: xt, y: (topAt(xt) + botAt(xt)) / 2 },
    nose: { x: xn, y: (topAt(xn) + botAt(xn)) / 2 },
    head: { x: xh, y: topAt(xh) + (botAt(xh) - topAt(xh)) * 0.3 },
  };
}

export function drawFormFish(ctx: CanvasRenderingContext2D, fish: FishDef, form: FishFormDef, stage = 0) {
  const look = form.look;
  SK = stage <= 1 ? 0.85 : stage === 2 ? 1 : stage === 3 ? 1.15 : 1.3;
  // đo trước dáng cá thật (vẽ nháp) để gai / lửa phía sau mọc đúng sống lưng
  {
    const probe = document.createElement("canvas").getContext("2d")!;
    probe.setTransform(ctx.getTransform());
    probe.translate(CX - (FISH_W / 2) * K, CY - (FISH_H / 2) * K);
    probe.scale(K, K);
    setLastAnchorsNull();
    drawFish(probe, { id: fish.id, appearance: fish.appearance }, stage);
    const a0 = lastFishAnchors;
    if (a0 && a0.back?.length) {
      const inv0 = ctx.getTransform().inverse();
      backPts = a0.back.map((q) => {
        const p = inv0.transformPoint(q.p);
        return { x: p.x, y: p.y, ang: q.ang };
      });
      const tp = inv0.transformPoint(a0.tail);
      tailAt = { x: tp.x, y: tp.y };
    } else {
      // hình vẽ riêng (không có điểm mốc) → dò đường viền thật để hiệu ứng bám đúng dáng cá
      const m = maskAnchors((c) => {
        c.translate(CX - (FISH_W / 2) * K, CY - (FISH_H / 2) * K);
        c.scale(K, K);
        drawFish(c, { id: fish.id, appearance: fish.appearance }, stage);
      });
      maskHead = m;
      backPts = m?.back ?? null;
      tailAt = m?.tail ?? null;
    }
  }
  tierBack(ctx, fish.rarity, form);
  backGlow(ctx, form.glow);
  AURA[look.aura].back?.(ctx, form);
  const base = ctx.getTransform();
  setLastAnchorsNull();
  ctx.save();
  ctx.translate(CX - (FISH_W / 2) * K, CY - (FISH_H / 2) * K);
  ctx.scale(K, K);
  // vẽ cá với bảng màu đột biến (giữ dáng gốc của loài)
  drawFish(ctx, {
    id: fish.id,
    appearance: {
      ...fish.appearance,
      body: look.body,
      belly: look.belly,
      fin: look.fin,
      pattern: look.pattern,
      patternColor: shade(look.patternColor, -0.15),
      eye: "glow",
      eyeColor: look.eyeColor,
      horns: fish.appearance.horns || look.horns,
      spikes: fish.appearance.spikes || look.spikes,
      teeth: fish.appearance.teeth || look.teeth,
      glow: form.glow,
    },
  }, stage);
  ctx.restore();
  // bám trang trí theo đầu cá thật (dáng vector mỗi loài một khác); hình vẽ riêng thì dùng vị trí mặc định
  const a = lastFishAnchors;
  if (a) {
    const inv = base.inverse();
    const hp = inv.transformPoint(a.head);
    const np = inv.transformPoint(a.nose);
    headAt = { x: hp.x, y: hp.y };
    noseAt = { x: np.x, y: np.y };
  } else if (maskHead) {
    headAt = maskHead.head;
    noseAt = maskHead.nose;
  } else headAt = noseAt = null;
  maskHead = null;
  AURA[look.aura].front?.(ctx, form);
  tierFront(ctx, fish.rarity, form);
}

/**
 * Lớp hiệu ứng đột biến dùng cho hình KHÔNG vẽ bằng VectorFish (cá lai Đảo Lai Tạo):
 * "back" = quầng sáng + hiệu ứng sau thân, "front" = hiệu ứng trước thân; to dần theo giai.
 */
export function drawFormLayer(ctx: CanvasRenderingContext2D, form: FishFormDef, stage: number, layer: "back" | "front", shape?: (c: CanvasRenderingContext2D) => void) {
  SK = stage <= 1 ? 0.85 : stage === 2 ? 1 : stage === 3 ? 1.15 : 1.3;
  // dò dáng thật của hình (cá lai) để gai / lửa / râu bám đúng chỗ
  const m = shape ? maskAnchors(shape) : null;
  backPts = m?.back ?? null;
  tailAt = m?.tail ?? null;
  headAt = m?.head ?? null;
  noseAt = m?.nose ?? null;
  if (layer === "back") {
    backGlow(ctx, form.glow, 0.45 + 0.08 * Math.max(0, stage - 1));
    AURA[form.look.aura].back?.(ctx, form);
  } else AURA[form.look.aura].front?.(ctx, form);
}
