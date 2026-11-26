import Phaser from "phaser";
import { css, pixelTex } from "./art.ts";

// Đồ trang trí bản đồ pixel-art (cùng độ thô 3 px như mặt đất & nhân vật).

export type DecoKind =
  | "tree" | "darktree" | "deadtree" | "pine" | "snowpine" | "cactus" | "pillar" | "brokenpillar" | "ruin" | "arch" | "statue"
  | "house" | "ruinhouse" | "well" | "barrel" | "rock" | "boulder" | "peak" | "crystal" | "icechunk" | "fire" | "grave" | "obelisk"
  | "tuft" | "flowers" | "mushroom" | "pebbles" | "bones" | "snowdrift" | "bush";

/** Kích thước vẽ (rộng, cao). Gốc đặt ở chân (0.5, 0.92). */
const SIZE: Record<DecoKind, [number, number]> = {
  tree: [132, 168], darktree: [132, 168], deadtree: [96, 132], pine: [90, 150], snowpine: [90, 150], cactus: [60, 90], pillar: [42, 126],
  brokenpillar: [48, 84], ruin: [150, 102], arch: [132, 150], statue: [66, 132], house: [150, 132], ruinhouse: [150, 120], well: [72, 84],
  barrel: [36, 45], rock: [72, 54], boulder: [108, 84], peak: [186, 162], crystal: [54, 96], icechunk: [84, 66], fire: [48, 54],
  grave: [36, 45], obelisk: [42, 150], tuft: [30, 24], flowers: [36, 24], mushroom: [30, 30], pebbles: [36, 18], bones: [42, 21], snowdrift: [72, 30], bush: [66, 48],
};

type C = CanvasRenderingContext2D;
const f = (c: C, col: number, a = 1) => (c.fillStyle = css(col, a));
function rect(c: C, col: number, x: number, y: number, w: number, h: number): void {
  f(c, col);
  c.fillRect(x, y, w, h);
}
function blob(c: C, col: number, x: number, y: number, rx: number, ry: number): void {
  f(c, col);
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
}
function poly(c: C, col: number, pts: number[]): void {
  f(c, col);
  c.beginPath();
  c.moveTo(pts[0] ?? 0, pts[1] ?? 0);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i] ?? 0, pts[i + 1] ?? 0);
  c.closePath();
  c.fill();
}
function shadow(c: C, w: number, h: number, k = 0.4): void {
  blob(c, 0x000000, w / 2, h * 0.92, w * k, h * 0.05);
  c.globalAlpha = 1;
}
/** Tán cây nhiều lớp: tối – vừa – sáng. */
function canopy(c: C, cols: [number, number, number], cx: number, cy: number, r: number): void {
  const blobs: Array<[number, number, number]> = [[0, 0, 1], [-0.55, 0.25, 0.7], [0.55, 0.25, 0.7], [-0.3, -0.45, 0.65], [0.35, -0.4, 0.6], [0, 0.45, 0.7]];
  for (const [dx, dy, k] of blobs) blob(c, cols[0], cx + dx * r, cy + dy * r + 4, r * k * 0.75, r * k * 0.7);
  for (const [dx, dy, k] of blobs) blob(c, cols[1], cx + dx * r - 3, cy + dy * r, r * k * 0.66, r * k * 0.6);
  for (const [dx, dy, k] of blobs.slice(0, 5)) blob(c, cols[2], cx + dx * r - 8, cy + dy * r - 7, r * k * 0.32, r * k * 0.28);
}

export function decoTexture(scene: Phaser.Scene, kind: DecoKind): string {
  const [w, h] = SIZE[kind];
  const cx = w / 2;
  const gy = h * 0.9; // mặt đất
  return pixelTex(
    scene,
    `deco2_${kind}`,
    w,
    h,
    (c) => {
      c.globalAlpha = 0.35;
      if (!["tuft", "flowers", "pebbles", "bones", "snowdrift"].includes(kind)) shadow(c, w, h);
      c.globalAlpha = 1;
      switch (kind) {
        case "tree":
        case "darktree": {
          rect(c, 0x3a2414, cx - 9, gy - 60, 18, 60);
          rect(c, 0x5a3a20, cx - 5, gy - 60, 6, 60);
          poly(c, 0x3a2414, [cx - 9, gy, cx - 22, gy, cx - 9, gy - 14]);
          poly(c, 0x3a2414, [cx + 9, gy, cx + 22, gy, cx + 9, gy - 14]);
          canopy(c, kind === "tree" ? [0x1c3a24, 0x2c5a34, 0x4a8a48] : [0x2a1a3e, 0x47306a, 0x7a52a8], cx, h * 0.38, w * 0.36);
          if (kind === "darktree") for (let i = 0; i < 5; i++) rect(c, 0x9affd8, cx - 30 + i * 15, h * 0.3 + (i % 2) * 20, 3, 3);
          break;
        }
        case "deadtree": {
          rect(c, 0x3a2e28, cx - 6, gy - 80, 12, 80);
          c.strokeStyle = css(0x3a2e28);
          c.lineWidth = 6;
          for (const [x1, y1, x2, y2] of [[cx, gy - 60, cx - 34, gy - 100], [cx, gy - 70, cx + 30, gy - 110], [cx - 20, gy - 88, cx - 30, gy - 118], [cx + 16, gy - 95, cx + 38, gy - 96]] as const) {
            c.beginPath();
            c.moveTo(x1, y1);
            c.lineTo(x2, y2);
            c.stroke();
          }
          break;
        }
        case "pine":
        case "snowpine": {
          rect(c, 0x3a2414, cx - 6, gy - 24, 12, 24);
          for (let i = 0; i < 4; i++) {
            const y0 = h * (0.06 + i * 0.17);
            const hw = w * (0.2 + i * 0.09);
            poly(c, 0x1e3a34, [cx, y0, cx - hw, y0 + h * 0.24, cx + hw, y0 + h * 0.24]);
            poly(c, 0x2e5a4a, [cx - 2, y0 + 6, cx - hw * 0.7, y0 + h * 0.22, cx, y0 + h * 0.22]);
            if (kind === "snowpine") poly(c, 0xeef4ff, [cx, y0, cx - hw * 0.55, y0 + h * 0.12, cx + hw * 0.55, y0 + h * 0.12]);
          }
          break;
        }
        case "cactus": {
          rect(c, 0x2f6a34, cx - 9, gy - 72, 18, 72);
          rect(c, 0x4a9a48, cx - 5, gy - 72, 5, 72);
          rect(c, 0x2f6a34, cx - 27, gy - 50, 10, 26);
          rect(c, 0x2f6a34, cx - 27, gy - 30, 20, 9);
          rect(c, 0x2f6a34, cx + 17, gy - 60, 10, 24);
          rect(c, 0x2f6a34, cx + 8, gy - 40, 19, 9);
          rect(c, 0xff8ac0, cx - 3, gy - 78, 6, 6);
          break;
        }
        case "pillar":
        case "brokenpillar": {
          const top = kind === "pillar" ? 12 : 30;
          rect(c, 0x6a6f78, cx - 12, top, 24, gy - top);
          rect(c, 0x8a909a, cx - 8, top, 6, gy - top);
          rect(c, 0x4a4f58, cx + 6, top, 6, gy - top);
          rect(c, 0x9aa0aa, cx - 18, gy - 12, 36, 12);
          if (kind === "pillar") rect(c, 0x9aa0aa, cx - 18, top - 6, 36, 10);
          else poly(c, 0x6a6f78, [cx - 12, top, cx - 4, top - 10, cx + 4, top - 2, cx + 12, top - 12, cx + 12, top]);
          rect(c, 0x3f6a34, cx - 12, h * 0.5, 9, 16);
          rect(c, 0x3f6a34, cx + 4, h * 0.7, 8, 10);
          break;
        }
        case "ruin": {
          for (let i = 0; i < 6; i++) {
            const bh = h * (0.28 + ((i * 37) % 5) * 0.11);
            const x = 6 + i * 23;
            rect(c, i % 2 ? 0x5a5f66 : 0x666b72, x, gy - bh, 22, bh);
            rect(c, 0x7a8088, x, gy - bh, 22, 4);
            for (let r = 0; r < bh; r += 12) rect(c, 0x3a3e44, x, gy - bh + r, 22, 2);
          }
          rect(c, 0x3f6a34, 6, gy - 10, w - 12, 8);
          rect(c, 0x5a9a48, 20, gy - 40, 12, 18);
          break;
        }
        case "arch": {
          rect(c, 0x5a5f66, 6, 30, 30, gy - 30);
          rect(c, 0x5a5f66, w - 36, 30, 30, gy - 30);
          rect(c, 0x666b72, 6, 18, w - 12, 26);
          f(c, 0x14161c);
          c.beginPath();
          c.arc(cx, 52, (w - 72) / 2, Math.PI, 0);
          c.fill();
          rect(c, 0x14161c, 36, 52, w - 72, gy - 52);
          for (let y = 30; y < gy; y += 15) {
            rect(c, 0x3a3e44, 6, y, 30, 2);
            rect(c, 0x3a3e44, w - 36, y, 30, 2);
          }
          rect(c, 0x3f6a34, 6, 18, 24, 10);
          rect(c, 0x3f6a34, w - 40, 40, 10, 34);
          break;
        }
        case "statue": {
          rect(c, 0x7a7f88, cx - 24, gy - 24, 48, 24);
          poly(c, 0x6a6f78, [cx - 16, gy - 24, cx + 16, gy - 24, cx + 12, gy - 84, cx - 12, gy - 84]);
          blob(c, 0x7a7f88, cx, gy - 96, 13, 14);
          poly(c, 0x5a5f66, [cx - 16, gy - 90, cx + 16, gy - 90, cx + 10, gy - 112, cx - 10, gy - 112]);
          rect(c, 0x3f6a34, cx - 16, gy - 50, 10, 20);
          break;
        }
        case "house":
        case "ruinhouse": {
          rect(c, 0x8a5a36, 18, h * 0.42, w - 36, gy - h * 0.42);
          for (let y = h * 0.42; y < gy; y += 12) rect(c, 0x6a4226, 18, y, w - 36, 2);
          rect(c, 0x2a1810, cx - 14, gy - 44, 28, 44);
          rect(c, 0xffd070, w - 50, h * 0.55, 16, 14);
          const roof = kind === "house" ? 0x8a2e20 : 0x5a3a2a;
          poly(c, roof, [6, h * 0.46, cx, h * 0.06, w - 6, h * 0.46]);
          for (let i = 1; i < 6; i++) rect(c, 0x5a1e14, 6 + i * ((w - 12) / 6), h * 0.12 + i * 2, 3, h * 0.32);
          if (kind === "ruinhouse") {
            poly(c, 0x000000, [cx + 10, h * 0.16, cx + 40, h * 0.3, cx + 20, h * 0.4]);
            rect(c, 0x5a3a2a, w - 30, gy - 16, 20, 16);
          }
          break;
        }
        case "well": {
          blob(c, 0x5a5f66, cx, gy - 18, 30, 18);
          blob(c, 0x14161c, cx, gy - 24, 20, 9);
          rect(c, 0x5a3a20, cx - 28, gy - 70, 6, 50);
          rect(c, 0x5a3a20, cx + 22, gy - 70, 6, 50);
          poly(c, 0x8a2e20, [cx - 34, gy - 66, cx, gy - 84, cx + 34, gy - 66]);
          break;
        }
        case "barrel": {
          rect(c, 0x7a4a26, 6, 6, w - 12, h - 10);
          rect(c, 0x4a4f58, 6, 12, w - 12, 4);
          rect(c, 0x4a4f58, 6, h - 16, w - 12, 4);
          break;
        }
        case "rock":
        case "boulder": {
          poly(c, 0x4a4650, [w * 0.08, gy, w * 0.18, h * 0.35, w * 0.45, h * 0.15, w * 0.8, h * 0.3, w * 0.94, gy]);
          poly(c, 0x6a6672, [w * 0.2, h * 0.4, w * 0.45, h * 0.2, w * 0.7, h * 0.34, w * 0.5, h * 0.5]);
          poly(c, 0x34303a, [w * 0.6, gy, w * 0.8, h * 0.35, w * 0.94, gy]);
          if (kind === "boulder") rect(c, 0x3f6a34, w * 0.3, h * 0.24, 18, 8);
          break;
        }
        case "peak": {
          poly(c, 0x3e4452, [0, gy, w * 0.45, h * 0.04, w, gy]);
          poly(c, 0x56606e, [w * 0.12, gy, w * 0.45, h * 0.04, w * 0.5, gy]);
          poly(c, 0xeef4ff, [w * 0.27, h * 0.36, w * 0.45, h * 0.04, w * 0.63, h * 0.34, w * 0.53, h * 0.28, w * 0.45, h * 0.4, w * 0.36, h * 0.3]);
          poly(c, 0xc8d8ea, [w * 0.45, h * 0.04, w * 0.63, h * 0.34, w * 0.53, h * 0.28]);
          break;
        }
        case "crystal":
        case "icechunk": {
          const cols = [0x5a9ad8, 0x8ac8f4, 0xd8f0ff];
          if (kind === "crystal") {
            poly(c, cols[0] ?? 0, [cx, 4, cx + 16, h * 0.4, cx + 8, gy, cx - 10, gy, cx - 16, h * 0.36]);
            poly(c, cols[1] ?? 0, [cx, 4, cx + 16, h * 0.4, cx + 2, gy, cx - 2, h * 0.3]);
            rect(c, cols[2] ?? 0, cx - 4, h * 0.2, 5, h * 0.45);
            poly(c, cols[0] ?? 0, [cx - 16, gy, cx - 26, h * 0.6, cx - 14, h * 0.5]);
          } else {
            poly(c, cols[0] ?? 0, [6, gy, 14, h * 0.3, w * 0.5, h * 0.1, w - 10, h * 0.35, w - 4, gy]);
            poly(c, cols[1] ?? 0, [14, h * 0.32, w * 0.5, h * 0.12, w * 0.6, h * 0.5, 22, h * 0.6]);
            rect(c, cols[2] ?? 0, w * 0.3, h * 0.3, 14, 4);
          }
          break;
        }
        case "fire": {
          rect(c, 0x4a3020, cx - 18, gy - 8, 36, 8);
          rect(c, 0x6a4430, cx - 12, gy - 12, 24, 6);
          poly(c, 0xff5a1a, [cx - 14, gy - 10, cx, gy - 50, cx + 14, gy - 10]);
          poly(c, 0xffb03a, [cx - 8, gy - 10, cx + 2, gy - 38, cx + 9, gy - 10]);
          poly(c, 0xfff0a0, [cx - 3, gy - 10, cx + 1, gy - 24, cx + 4, gy - 10]);
          break;
        }
        case "grave": {
          rect(c, 0x6a6f78, cx - 12, 10, 24, gy - 10);
          blob(c, 0x6a6f78, cx, 12, 12, 8);
          rect(c, 0x3a3e44, cx - 2, 16, 4, 14);
          rect(c, 0x3a3e44, cx - 7, 21, 14, 4);
          break;
        }
        case "obelisk": {
          poly(c, 0x3a343e, [cx - 14, gy, cx - 9, h * 0.12, cx, 2, cx + 9, h * 0.12, cx + 14, gy]);
          poly(c, 0x544c5a, [cx - 9, h * 0.12, cx, 2, cx - 2, gy, cx - 12, gy]);
          for (let i = 0; i < 5; i++) rect(c, 0xff7a3a, cx - 3, h * (0.22 + i * 0.13), 6, 6);
          break;
        }
        case "tuft":
          for (let i = 0; i < 5; i++) poly(c, i % 2 ? 0x4a8a48 : 0x2c5a34, [6 + i * 5, gy, 9 + i * 5, gy - 14 - (i % 3) * 4, 12 + i * 5, gy]);
          break;
        case "flowers":
          for (let i = 0; i < 4; i++) {
            rect(c, 0x2c5a34, 6 + i * 7, gy - 10, 3, 10);
            rect(c, [0xff8ac0, 0xfff07a, 0xc08aff, 0xffffff][i] ?? 0xffffff, 4 + i * 7, gy - 15, 7, 6);
          }
          break;
        case "mushroom":
          rect(c, 0xe8e0d0, cx - 3, gy - 12, 6, 12);
          blob(c, 0xd03a3a, cx, gy - 14, 11, 7);
          rect(c, 0xffffff, cx - 5, gy - 17, 3, 3);
          rect(c, 0xffffff, cx + 3, gy - 15, 3, 3);
          break;
        case "pebbles":
          blob(c, 0x6a6672, 8, gy - 3, 6, 4);
          blob(c, 0x7a7682, 20, gy - 4, 8, 5);
          blob(c, 0x5a5662, 30, gy - 2, 4, 3);
          break;
        case "bones":
          rect(c, 0xe8e0c8, 6, gy - 6, 30, 4);
          blob(c, 0xe8e0c8, 6, gy - 4, 4, 4);
          blob(c, 0xe8e0c8, 36, gy - 4, 4, 4);
          blob(c, 0xf0e8d8, 22, gy - 10, 7, 6);
          break;
        case "snowdrift":
          blob(c, 0xd8e4f0, cx, gy - 4, 32, 9);
          blob(c, 0xf4f8ff, cx - 8, gy - 8, 18, 6);
          break;
        case "bush":
          canopy(c, [0x1c3a24, 0x2c5a34, 0x4a8a48], cx, gy - 18, 26);
          break;
      }
    },
    3,
  );
}
