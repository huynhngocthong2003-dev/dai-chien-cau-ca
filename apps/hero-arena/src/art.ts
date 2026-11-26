import Phaser from "phaser";
import { branchById, heroById, MONSTERS, type Gender, type MonsterDef } from "@hero-arena/core";

// Vẽ thủ tục bằng Canvas2D: anh hùng (theo lớp, nhánh, giới tính), quái, trang trí bản đồ.

const css = (c: number, a = 1) => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;

function shade(c: number, k: number): number {
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return (f((c >> 16) & 255) << 16) | (f((c >> 8) & 255) << 8) | f(c & 255);
}

function canvasTex(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): string {
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return key;
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = true;
  draw(ctx);
  tex.refresh();
  return key;
}

const OUTLINE: [number, number, number] = [16, 12, 22];

/**
 * Vẽ ở độ phân giải cao rồi "pixel hoá": thu nhỏ px lần, lượng tử màu/độ trong,
 * thêm viền tối 1 điểm ảnh + sáng mép trên / tối mép dưới, phóng to giữ nét (nearest).
 */
function pixelTex(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, px = 2): string {
  if (scene.textures.exists(key)) return key;
  const hi = document.createElement("canvas");
  hi.width = w;
  hi.height = h;
  const hctx = hi.getContext("2d");
  if (!hctx) return canvasTex(scene, key, w, h, draw);
  draw(hctx);
  const sw = Math.floor(w / px);
  const sh = Math.floor(h / px);
  const lo = document.createElement("canvas");
  lo.width = sw;
  lo.height = sh;
  const lctx = lo.getContext("2d");
  if (!lctx) return canvasTex(scene, key, w, h, draw);
  lctx.imageSmoothingEnabled = true;
  lctx.imageSmoothingQuality = "high";
  lctx.drawImage(hi, 0, 0, sw, sh);
  const img = lctx.getImageData(0, 0, sw, sh);
  const d = img.data;
  const solid = new Uint8Array(sw * sh);
  for (let i = 0; i < sw * sh; i++) {
    const a = d[i * 4 + 3] ?? 0;
    if (a < 28) d[i * 4 + 3] = 0;
    else if (a < 175) d[i * 4 + 3] = 110; // bán trong (bóng, hào quang) – không viền
    else {
      d[i * 4 + 3] = 255;
      solid[i] = 1;
    }
    // lượng tử màu 16 mức → cảm giác bảng màu pixel
    for (let k = 0; k < 3; k++) d[i * 4 + k] = Math.min(255, Math.round((d[i * 4 + k] ?? 0) / 16) * 16);
  }
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= sw || y >= sh ? 0 : (solid[y * sw + x] ?? 0));
  const out = new Uint8ClampedArray(d);
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const i = y * sw + x;
      if (solid[i]) {
        const k = !at(x, y - 1) ? 1.22 : !at(x, y + 1) ? 0.72 : !at(x - 1, y) ? 1.08 : 1;
        if (k !== 1) for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.min(255, (d[i * 4 + c] ?? 0) * k);
      } else if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) {
        out[i * 4] = OUTLINE[0];
        out[i * 4 + 1] = OUTLINE[1];
        out[i * 4 + 2] = OUTLINE[2];
        out[i * 4 + 3] = 255;
      }
    }
  }
  lctx.putImageData(new ImageData(out, sw, sh), 0, 0);
  return canvasTex(scene, key, sw * px, sh * px, (c) => {
    c.imageSmoothingEnabled = false;
    c.drawImage(lo, 0, 0, sw * px, sh * px);
  });
}

const HAIR: Record<string, [number, number]> = {
  mage: [0x6a3a1a, 0x8a4a2a],
  warrior: [0x2a2a2a, 0x7a3a1a],
  assassin: [0xe0e0f0, 0x3a2a4a],
  ranger: [0x8a5a2a, 0xc08a4a],
  guardian: [0x4a3a2a, 0x2a2a2a],
  monk: [0x1a1a1a, 0x2a1a1a],
  necromancer: [0xd0d0e0, 0x1a1a2a],
  duelist: [0x3a2a5a, 0xa06aff],
};

/** Khóa texture anh hùng; vẽ khi chưa có. Kích thước 64×84, gốc ở chân (0.5, 0.92). */
export function heroTexture(scene: Phaser.Scene, heroId: string, branchId: string | null, gender: Gender): string {
  const key = `hero_${heroId}_${branchId ?? "base"}_${gender}`;
  const hero = heroById(heroId);
  if (!hero) return key;
  const br = branchById(hero, branchId);
  const [main, trim] = br?.outfit ?? hero.outfit;
  const glow = br?.color ?? 0xd0c0ff;
  const hairPair = HAIR[heroId] ?? [0x3a2a1a, 0x3a2a1a];
  const hair = gender === "female" ? hairPair[1] : hairPair[0];
  return pixelTex(scene, key, 64, 84, (c) => {
    const cx = 32;
    // bóng đổ
    c.fillStyle = "rgba(0,0,0,0.35)";
    c.beginPath();
    c.ellipse(cx, 77, 17, 5, 0, 0, Math.PI * 2);
    c.fill();
    // hào quang nhánh
    if (br) {
      const gr = c.createRadialGradient(cx, 50, 4, cx, 50, 30);
      gr.addColorStop(0, css(glow, 0.35));
      gr.addColorStop(1, css(glow, 0));
      c.fillStyle = gr;
      c.fillRect(0, 10, 64, 74);
    }
    // tóc dài phía sau (nữ)
    if (gender === "female" && heroId !== "monk") {
      c.fillStyle = css(hair);
      c.beginPath();
      c.moveTo(cx - 14, 26);
      c.quadraticCurveTo(cx - 19, 50, cx - 12, 58);
      c.lineTo(cx + 12, 58);
      c.quadraticCurveTo(cx + 19, 50, cx + 14, 26);
      c.fill();
    }
    // áo choàng sau lưng
    c.fillStyle = css(shade(main, 0.7));
    c.beginPath();
    c.moveTo(cx - 12, 40);
    c.lineTo(cx - 19, 72);
    c.lineTo(cx + 19, 72);
    c.lineTo(cx + 12, 40);
    c.fill();
    // chân
    c.fillStyle = css(0x2a1e18);
    c.fillRect(cx - 9, 64, 7, 11);
    c.fillRect(cx + 2, 64, 7, 11);
    // thân
    const heavy = heroId === "warrior" || heroId === "guardian";
    const bw = heavy ? 15 : 12;
    c.fillStyle = css(main);
    c.beginPath();
    c.moveTo(cx - bw + 2, 38);
    c.lineTo(cx - bw - 3, 68);
    c.lineTo(cx + bw + 3, 68);
    c.lineTo(cx + bw - 2, 38);
    c.closePath();
    c.fill();
    // viền áo + đai
    c.fillStyle = css(trim);
    c.fillRect(cx - bw - 2, 64, (bw + 2) * 2 + 2, 4);
    c.fillRect(cx - bw + 2, 52, (bw - 2) * 2, 3);
    c.fillRect(cx - 1.5, 38, 3, 14);
    if (heavy) {
      // giáp vai
      c.fillStyle = css(shade(trim, 1.1));
      c.beginPath();
      c.arc(cx - bw, 40, 6, 0, Math.PI * 2);
      c.arc(cx + bw, 40, 6, 0, Math.PI * 2);
      c.fill();
    }
    // tay
    c.fillStyle = css(shade(main, 0.85));
    c.fillRect(cx - bw - 5, 42, 5, 16);
    c.fillRect(cx + bw, 42, 5, 16);
    c.fillStyle = css(0xf0c8a0);
    c.beginPath();
    c.arc(cx - bw - 2.5, 59, 3, 0, Math.PI * 2);
    c.arc(cx + bw + 2.5, 59, 3, 0, Math.PI * 2);
    c.fill();
    // đầu
    c.fillStyle = css(0xf6d2ae);
    c.beginPath();
    c.arc(cx, 26, 13, 0, Math.PI * 2);
    c.fill();
    // tóc
    c.fillStyle = css(hair);
    c.beginPath();
    c.arc(cx, 23, 13.5, Math.PI * 1.02, Math.PI * 1.98);
    c.fill();
    c.beginPath();
    c.moveTo(cx - 13, 22);
    c.lineTo(cx + 2, 22);
    c.lineTo(cx - 6, 32);
    c.closePath();
    c.fill();
    if (gender === "female" && (heroId === "monk" || heroId === "duelist" || heroId === "ranger")) {
      // tóc đuôi ngựa
      c.beginPath();
      c.ellipse(cx + 14, 22, 5, 10, 0.5, 0, Math.PI * 2);
      c.fill();
    }
    // mắt
    c.fillStyle = css(0x1a1020);
    c.fillRect(cx + 1, 27, 2.5, 4);
    c.fillRect(cx + 7, 27, 2.5, 4);
    if (gender === "female") {
      c.fillStyle = css(0xff8a9a, 0.6);
      c.fillRect(cx - 1, 32, 3, 2);
      c.fillRect(cx + 9, 32, 3, 2);
    }
    // mũ / mũ trùm / giáp đầu
    const hatColor = shade(main, 0.9);
    if (heroId === "mage") {
      c.fillStyle = css(hatColor);
      c.beginPath();
      c.ellipse(cx, 17, 19, 5, 0, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.moveTo(cx - 10, 17);
      c.quadraticCurveTo(cx - 2, -4, cx + 12, 2);
      c.lineTo(cx + 10, 17);
      c.fill();
      c.fillStyle = css(trim);
      c.fillRect(cx - 10, 13, 20, 3);
    } else if (heroId === "necromancer" || heroId === "assassin" || heroId === "ranger") {
      c.fillStyle = css(hatColor);
      c.beginPath();
      c.arc(cx, 24, 16, Math.PI * 0.95, Math.PI * 2.05);
      c.lineTo(cx + 15, 34);
      c.lineTo(cx + 11, 26);
      c.lineTo(cx - 11, 26);
      c.lineTo(cx - 15, 34);
      c.fill();
      if (heroId === "assassin") {
        c.fillStyle = css(shade(main, 0.6));
        c.fillRect(cx - 6, 31, 18, 6);
      }
    } else if (heroId === "warrior" || heroId === "guardian") {
      c.fillStyle = css(0x9aa0aa);
      c.beginPath();
      c.arc(cx, 23, 14.5, Math.PI, Math.PI * 2);
      c.fill();
      c.fillRect(cx - 14.5, 22, 4, 10);
      c.fillStyle = css(trim);
      if (heroId === "guardian") c.fillRect(cx - 2, 4, 4, 10);
      else c.fillRect(cx - 14, 20, 29, 3);
    } else if (heroId === "monk") {
      c.fillStyle = css(trim === 0x2a1a12 ? 0xd04a2a : trim);
      c.fillRect(cx - 13, 18, 26, 4);
    }
    // vũ khí
    const w = glow;
    const hx = cx + bw + 3;
    c.lineCap = "round";
    switch (heroId) {
      case "mage":
      case "necromancer": {
        c.strokeStyle = css(0x5a3a1a);
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(hx, 70);
        c.lineTo(hx + 2, 30);
        c.stroke();
        const g = c.createRadialGradient(hx + 2, 28, 1, hx + 2, 28, 9);
        g.addColorStop(0, "#ffffff");
        g.addColorStop(0.4, css(w));
        g.addColorStop(1, css(w, 0));
        c.fillStyle = g;
        c.beginPath();
        c.arc(hx + 2, 28, 9, 0, Math.PI * 2);
        c.fill();
        break;
      }
      case "ranger": {
        c.strokeStyle = css(0x7a4a1a);
        c.lineWidth = 3;
        c.beginPath();
        c.arc(hx - 4, 50, 16, -Math.PI / 2.4, Math.PI / 2.4);
        c.stroke();
        c.strokeStyle = css(0xe0e0e0);
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(hx + 0.5, 35);
        c.lineTo(hx + 0.5, 65);
        c.stroke();
        break;
      }
      case "warrior":
      case "duelist": {
        c.strokeStyle = css(0xd8dde6);
        c.lineWidth = heroId === "warrior" ? 4 : 2.5;
        c.beginPath();
        c.moveTo(hx, 58);
        c.lineTo(hx + 8, 24);
        c.stroke();
        c.strokeStyle = css(trim);
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(hx - 4, 56);
        c.lineTo(hx + 4, 58);
        c.stroke();
        if (br) {
          c.strokeStyle = css(w, 0.6);
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(hx + 1, 54);
          c.lineTo(hx + 9, 22);
          c.stroke();
        }
        break;
      }
      case "assassin": {
        c.strokeStyle = css(0xc8cdd6);
        c.lineWidth = 2.5;
        c.beginPath();
        c.moveTo(hx, 60);
        c.lineTo(hx + 7, 48);
        c.moveTo(cx - bw - 3, 60);
        c.lineTo(cx - bw - 10, 48);
        c.stroke();
        break;
      }
      case "guardian": {
        c.fillStyle = css(shade(trim, 0.9));
        c.beginPath();
        c.ellipse(cx - bw - 4, 52, 8, 12, 0, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = css(w, 0.9);
        c.lineWidth = 2;
        c.stroke();
        c.fillStyle = css(0x6a6a72);
        c.fillRect(hx - 1, 34, 4, 28);
        c.fillRect(hx - 6, 30, 14, 9);
        break;
      }
      case "monk": {
        c.fillStyle = css(0xf0e0c0);
        c.fillRect(cx - bw - 6, 55, 7, 6);
        c.fillRect(cx + bw - 1, 55, 7, 6);
        if (br) {
          c.fillStyle = css(w, 0.6);
          c.beginPath();
          c.arc(hx + 2, 58, 6, 0, Math.PI * 2);
          c.fill();
        }
        break;
      }
    }
    c.lineWidth = 2;
    c.strokeStyle = "rgba(10,10,20,0.55)";
    c.beginPath();
    c.arc(cx, 26, 13, 0.1, Math.PI - 0.1);
    c.stroke();
  });
}

export function monsterTexture(scene: Phaser.Scene, def: MonsterDef): string {
  const key = `mon_${def.id}`;
  const s = def.size;
  const size = Math.ceil(s * 2.6);
  return pixelTex(scene, key, size, size, (c) => {
    const cx = size / 2;
    const cy = size / 2 + s * 0.1;
    c.fillStyle = "rgba(0,0,0,0.35)";
    c.beginPath();
    c.ellipse(cx, cy + s * 0.9, s * 0.9, s * 0.28, 0, 0, Math.PI * 2);
    c.fill();
    const g = c.createRadialGradient(cx - s * 0.3, cy - s * 0.4, s * 0.1, cx, cy, s);
    g.addColorStop(0, css(shade(def.color, 1.3)));
    g.addColorStop(1, css(shade(def.color, 0.65)));
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(cx, cy, s, s * 0.85, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "rgba(10,10,20,0.8)";
    c.lineWidth = 2;
    c.stroke();
    if (def.isBoss) {
      c.fillStyle = css(0xf0e0c0);
      for (const sx of [-1, 1]) {
        c.beginPath();
        c.moveTo(cx + sx * s * 0.4, cy - s * 0.6);
        c.lineTo(cx + sx * s * 0.75, cy - s * 1.25);
        c.lineTo(cx + sx * s * 0.15, cy - s * 0.75);
        c.fill();
      }
    }
    // mắt đỏ
    c.fillStyle = def.isBoss ? "#ff3030" : "#ffe060";
    c.beginPath();
    c.arc(cx - s * 0.32, cy - s * 0.15, s * 0.13, 0, Math.PI * 2);
    c.arc(cx + s * 0.32, cy - s * 0.15, s * 0.13, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#1a0a0a";
    c.beginPath();
    c.arc(cx - s * 0.3, cy - s * 0.12, s * 0.06, 0, Math.PI * 2);
    c.arc(cx + s * 0.34, cy - s * 0.12, s * 0.06, 0, Math.PI * 2);
    c.fill();
  });
}

export function makeMonsterTextures(scene: Phaser.Scene): void {
  for (const m of MONSTERS) monsterTexture(scene, m);
}

export type DecoKind = "tree" | "darktree" | "pine" | "cactus" | "pillar" | "ruin" | "house" | "rock" | "peak" | "crystal" | "fire" | "grave" | "obelisk";

/** Trang trí bản đồ (gốc đặt ở chân, origin 0.5,0.9). */
export function decoTexture(scene: Phaser.Scene, kind: DecoKind): string {
  const key = `deco_${kind}`;
  const S: Record<DecoKind, [number, number]> = {
    tree: [90, 110], darktree: [90, 110], pine: [70, 110], cactus: [40, 64], pillar: [30, 80], ruin: [100, 70], house: [90, 80],
    rock: [56, 40], peak: [140, 120], crystal: [40, 70], fire: [32, 36], grave: [26, 32], obelisk: [30, 100],
  };
  const [w, h] = S[kind];
  return pixelTex(scene, key, w, h, (c) => {
    const cx = w / 2;
    c.fillStyle = "rgba(0,0,0,0.3)";
    c.beginPath();
    c.ellipse(cx, h * 0.9, w * 0.4, h * 0.07, 0, 0, Math.PI * 2);
    c.fill();
    switch (kind) {
      case "tree":
      case "darktree": {
        c.fillStyle = "#3a2618";
        c.fillRect(cx - 6, h * 0.55, 12, h * 0.36);
        const cols = kind === "tree" ? ["#1f4a3a", "#2a5f48", "#3a7a5a"] : ["#3a1f4a", "#52306a", "#6a428a"];
        const blobs: Array<[number, number, number]> = [[0, 0.42, 0.42], [-0.22, 0.5, 0.3], [0.22, 0.5, 0.3], [0, 0.28, 0.32]];
        cols.forEach((col, i) => {
          c.fillStyle = col;
          for (const [dx, dy, r] of blobs) {
            c.beginPath();
            c.arc(cx + dx * w - i * 2, dy * h - i * 3, r * w * (1 - i * 0.18), 0, Math.PI * 2);
            c.fill();
          }
        });
        break;
      }
      case "pine": {
        c.fillStyle = "#3a2618";
        c.fillRect(cx - 4, h * 0.75, 8, h * 0.16);
        for (let i = 0; i < 3; i++) {
          const y0 = h * (0.15 + i * 0.2);
          c.fillStyle = "#28423e";
          c.beginPath();
          c.moveTo(cx, y0);
          c.lineTo(cx - w * (0.25 + i * 0.1), y0 + h * 0.32);
          c.lineTo(cx + w * (0.25 + i * 0.1), y0 + h * 0.32);
          c.fill();
          c.fillStyle = "#e8f2ff";
          c.beginPath();
          c.moveTo(cx, y0);
          c.lineTo(cx - w * 0.14, y0 + h * 0.12);
          c.lineTo(cx + w * 0.14, y0 + h * 0.12);
          c.fill();
        }
        break;
      }
      case "cactus": {
        c.fillStyle = "#3f7a3a";
        c.fillRect(cx - 6, h * 0.15, 12, h * 0.75);
        c.fillRect(cx - 16, h * 0.4, 6, h * 0.25);
        c.fillRect(cx - 16, h * 0.6, 12, 6);
        c.fillRect(cx + 10, h * 0.3, 6, h * 0.25);
        c.fillRect(cx + 4, h * 0.5, 12, 6);
        break;
      }
      case "pillar":
      case "obelisk": {
        c.fillStyle = kind === "pillar" ? "#7a7f88" : "#4a4048";
        if (kind === "obelisk") {
          c.beginPath();
          c.moveTo(cx - 9, h * 0.88);
          c.lineTo(cx - 6, h * 0.12);
          c.lineTo(cx, 0);
          c.lineTo(cx + 6, h * 0.12);
          c.lineTo(cx + 9, h * 0.88);
          c.fill();
          c.fillStyle = "#ff7a3a";
          for (let i = 0; i < 4; i++) c.fillRect(cx - 2, h * (0.25 + i * 0.13), 4, 4);
        } else {
          c.fillRect(cx - 9, h * 0.12, 18, h * 0.76);
          c.fillStyle = "#9aa0aa";
          c.fillRect(cx - 13, h * 0.06, 26, 8);
          c.fillRect(cx - 13, h * 0.82, 26, 8);
          c.fillStyle = "#4a6a3a";
          c.fillRect(cx - 9, h * 0.5, 7, 14);
        }
        break;
      }
      case "ruin": {
        c.fillStyle = "#5a5f66";
        for (let i = 0; i < 5; i++) {
          const bh = h * (0.3 + ((i * 37) % 5) * 0.1);
          c.fillRect(8 + i * 17, h * 0.88 - bh, 16, bh);
        }
        c.fillStyle = "#3a5a2a";
        c.fillRect(8, h * 0.8, w - 16, 6);
        break;
      }
      case "house": {
        c.fillStyle = "#8a5a3a";
        c.fillRect(12, h * 0.4, w - 24, h * 0.48);
        c.fillStyle = "#5a3020";
        c.beginPath();
        c.moveTo(4, h * 0.44);
        c.lineTo(cx, h * 0.06);
        c.lineTo(w - 4, h * 0.44);
        c.fill();
        c.fillStyle = "#2a1810";
        c.fillRect(cx - 9, h * 0.6, 18, h * 0.28);
        break;
      }
      case "rock": {
        c.fillStyle = "#5a5560";
        c.beginPath();
        c.ellipse(cx, h * 0.6, w * 0.45, h * 0.35, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#7a7580";
        c.beginPath();
        c.ellipse(cx - 6, h * 0.5, w * 0.25, h * 0.18, 0, 0, Math.PI * 2);
        c.fill();
        break;
      }
      case "peak": {
        c.fillStyle = "#4a5060";
        c.beginPath();
        c.moveTo(0, h * 0.9);
        c.lineTo(w * 0.45, h * 0.05);
        c.lineTo(w, h * 0.9);
        c.fill();
        c.fillStyle = "#eef4ff";
        c.beginPath();
        c.moveTo(w * 0.27, h * 0.38);
        c.lineTo(w * 0.45, h * 0.05);
        c.lineTo(w * 0.62, h * 0.35);
        c.lineTo(w * 0.5, h * 0.3);
        c.lineTo(w * 0.4, h * 0.42);
        c.fill();
        break;
      }
      case "crystal": {
        c.fillStyle = "rgba(140,210,255,0.9)";
        c.beginPath();
        c.moveTo(cx, 0);
        c.lineTo(cx + 12, h * 0.4);
        c.lineTo(cx + 6, h * 0.9);
        c.lineTo(cx - 8, h * 0.9);
        c.lineTo(cx - 12, h * 0.35);
        c.fill();
        c.fillStyle = "rgba(255,255,255,0.6)";
        c.fillRect(cx - 3, h * 0.2, 4, h * 0.5);
        break;
      }
      case "fire": {
        c.fillStyle = "#4a3020";
        c.fillRect(cx - 12, h * 0.75, 24, 6);
        const g = c.createRadialGradient(cx, h * 0.55, 1, cx, h * 0.55, 14);
        g.addColorStop(0, "#fff0a0");
        g.addColorStop(0.5, "#ff8a2a");
        g.addColorStop(1, "rgba(255,80,0,0)");
        c.fillStyle = g;
        c.beginPath();
        c.arc(cx, h * 0.55, 14, 0, Math.PI * 2);
        c.fill();
        break;
      }
      case "grave": {
        c.fillStyle = "#6a6f78";
        c.beginPath();
        c.arc(cx, h * 0.35, w * 0.38, Math.PI, 0);
        c.fill();
        c.fillRect(cx - w * 0.38, h * 0.35, w * 0.76, h * 0.52);
        break;
      }
    }
  });
}

/** Chấm sáng tròn dùng cho đạn/hạt. */
export function dotTexture(scene: Phaser.Scene): string {
  return canvasTex(scene, "dot", 32, 32, (c) => {
    const g = c.createRadialGradient(16, 16, 1, 16, 16, 16);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.4, "rgba(255,255,255,0.8)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, 32, 32);
  });
}

/** Lớp phủ tối viền (sương độc làm giảm tầm nhìn). */
export function vignetteTexture(scene: Phaser.Scene, w: number, h: number): string {
  return canvasTex(scene, "vignette", w, h, (c) => {
    const g = c.createRadialGradient(w / 2, h / 2, h * 0.18, w / 2, h / 2, w * 0.6);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,1)");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  });
}
