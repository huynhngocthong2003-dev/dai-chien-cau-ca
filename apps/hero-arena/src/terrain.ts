import Phaser from "phaser";
import { ALTAR_RADIUS, BIOME_SECTORS, biomeMidAngle, ISLAND_RADIUS, Rng, WORLD_CENTER, WORLD_SIZE, type BiomeType } from "@hero-arena/core";

// Mặt đất đảo vẽ từng điểm ảnh (vân nhiễu + gạch lát + vách đá + biển), độ phân giải 1/3, nét pixel.

export const TERRAIN_SCALE = 3;

const PAL: Record<BiomeType, number[]> = {
  forest: [0x24462a, 0x2e5a32, 0x3a6e3a, 0x4a8044],
  ruined_temple: [0x3e4a40, 0x4e5a4e, 0x5a6658, 0x66705e],
  desert: [0xb07e40, 0xc08c4a, 0xcc9a56, 0xd8a862],
  ruined_village: [0x6e5434, 0x7c603a, 0x8a6c42, 0x96784a],
  mountain: [0xb8c2ce, 0xcad2dc, 0xd8e0ea, 0xe6ecf4],
  glacier: [0x7eacd4, 0x8ebcde, 0x9ecae8, 0xb2d8f0],
};

const rgb = (c: number): [number, number, number] => [(c >> 16) & 255, (c >> 8) & 255, c & 255];

export function terrainTexture(scene: Phaser.Scene, seed: number): string {
  const key = `terrain_${seed}`;
  if (scene.textures.exists(key)) return key;
  const S = Math.ceil(WORLD_SIZE / TERRAIN_SCALE);
  const tex = scene.textures.createCanvas(key, S, S);
  if (!tex) return key;
  const ctx = tex.getContext();
  const img = ctx.createImageData(S, S);
  const d = img.data;

  // lưới nhiễu ngẫu nhiên 256×256 (lặp)
  const rng = new Rng(seed ^ 0x7e11a);
  const G = 256;
  const grid = new Float32Array(G * G);
  for (let i = 0; i < grid.length; i++) grid[i] = rng.next();
  const noise = (x: number, y: number): number => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = x - xi;
    const fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const i00 = grid[((yi & 255) << 8) | (xi & 255)] ?? 0;
    const i10 = grid[((yi & 255) << 8) | ((xi + 1) & 255)] ?? 0;
    const i01 = grid[(((yi + 1) & 255) << 8) | (xi & 255)] ?? 0;
    const i11 = grid[(((yi + 1) & 255) << 8) | ((xi + 1) & 255)] ?? 0;
    return (i00 + (i10 - i00) * sx) * (1 - sy) + (i01 + (i11 - i01) * sx) * sy;
  };
  const fbm = (x: number, y: number) => noise(x / 40, y / 40) * 0.55 + noise(x / 12, y / 12) * 0.3 + noise(x / 4, y / 4) * 0.15;
  const hash = (x: number, y: number) => grid[((y & 255) << 8) | (x & 255)] ?? 0;

  const roads = BIOME_SECTORS.map((s) => biomeMidAngle(s.biome)).map((a) => [Math.cos(a), Math.sin(a)] as const);
  const R = ISLAND_RADIUS;
  const C = WORLD_CENTER;
  const sectors = BIOME_SECTORS.map((s) => ({ biome: s.biome, from: s.from, to: s.to }));

  for (let py = 0; py < S; py++) {
    for (let px = 0; px < S; px++) {
      const wx = px * TERRAIN_SCALE;
      const wy = py * TERRAIN_SCALE;
      const dx = wx - C;
      const dy = wy - C;
      const dist = Math.hypot(dx, dy);
      const n = fbm(px, py);
      let col: [number, number, number];
      if (dist > R + 80) {
        // biển tối có sóng
        const wave = noise(px / 30, py / 9 + noise(px / 50, py / 50) * 3);
        col = wave > 0.62 ? [26, 52, 80] : wave < 0.3 ? [10, 22, 38] : [16, 34, 56];
        if (dist < R + 110 && noise(px / 3, py / 3) > 0.45) col = [200, 220, 235]; // bọt sóng
      } else if (dist > R) {
        // vách đá
        const k = 1 - (dist - R) / 80;
        const v = 34 + n * 40 + k * 26;
        col = [v, v + 3, v + 9];
        if (hash(px, py) > 0.93) col = [v - 14, v - 12, v - 8];
      } else {
        // vùng địa hình (biên lượn sóng nhờ nhiễu)
        let a = (Math.atan2(dy, dx) * 180) / Math.PI;
        if (a < -90) a += 360;
        a += (noise(px / 60, py / 60) - 0.5) * 14;
        if (a < -90) a += 360;
        if (a >= 270) a -= 360;
        const sec = sectors.find((s) => a >= s.from && a < s.to) ?? sectors[0];
        const biome = sec?.biome ?? "forest";
        const pal = PAL[biome];
        const idx = Math.min(pal.length - 1, Math.floor(n * pal.length * 1.15));
        col = rgb(pal[idx] ?? 0);
        // chi tiết theo vùng
        if (biome === "ruined_temple" || (biome === "ruined_village" && noise(px / 25, py / 25) > 0.6)) {
          // đá lát có rêu
          const bx = px >> 3;
          const by = py >> 3;
          const off = by & 1 ? 4 : 0;
          const mortar = (px + off) % 8 === 0 || py % 8 === 0;
          if (noise(px / 30, py / 30) > 0.35) {
            const t = 70 + hash(bx, by) * 30;
            col = mortar ? [40, 44, 42] : [t, t + 4, t + 2];
            if (noise(px / 7, py / 7) > 0.62) col = [62, 96, 58]; // rêu
          }
        } else if (biome === "desert") {
          const dune = Math.sin(py / 7 + noise(px / 40, py / 40) * 6);
          if (dune > 0.85) col = [col[0] + 18, col[1] + 14, col[2] + 8];
          if (Math.abs(noise(px / 14, py / 14) - 0.5) < 0.012) col = [110, 74, 40]; // nứt
        } else if (biome === "forest") {
          if (hash(px, py) > 0.985) col = hash(px + 1, py) > 0.5 ? [160, 110, 220] : [230, 220, 120]; // hoa
          if (noise(px / 18, py / 18) < 0.22) col = [40, 34, 26]; // đất ẩm
        } else if (biome === "mountain") {
          if (noise(px / 16, py / 16) < 0.18) {
            const v = 120 + n * 40;
            col = [v, v + 4, v + 12];
          }
          if (hash(px, py) > 0.992) col = [255, 255, 255];
        } else if (biome === "glacier") {
          if (Math.abs(noise(px / 10, py / 10) - 0.5) < 0.015) col = [230, 245, 255]; // vết nứt băng
        } else if (biome === "ruined_village") {
          if (Math.abs(noise(px / 14, py / 14) - 0.5) < 0.01) col = [70, 50, 30];
        }
        // đường đá lát từ tế đàn
        if (dist > ALTAR_RADIUS * 0.8 && dist < R * 0.82) {
          for (const [ux, uy] of roads) {
            const along = dx * ux + dy * uy;
            if (along < 0) continue;
            const perp = Math.abs(-dx * uy + dy * ux);
            if (perp < 40) {
              const ax = Math.floor(along / 9);
              const pr = Math.floor((perp + 40) / 7);
              const mortar = Math.floor(along) % 9 < 2 || Math.floor(perp + 40) % 7 < 1;
              const t = 82 + hash(ax, pr) * 34 - (perp > 34 ? 26 : 0);
              col = mortar ? [44, 44, 50] : [t, t, t + 6];
              if (noise(px / 6, py / 6) > 0.68) col = [70, 100, 60];
            }
          }
        }
        // tế đàn bát giác
        const oct = Math.max(Math.abs(dx), Math.abs(dy), (Math.abs(dx) + Math.abs(dy)) * 0.7071);
        if (oct < ALTAR_RADIUS) {
          const tile = ((Math.floor(dx / 24) + Math.floor(dy / 24)) & 1) === 0;
          col = tile ? [48, 42, 56] : [58, 50, 66];
          if (Math.floor(dx) % 24 === 0 || Math.floor(dy) % 24 === 0) col = [28, 24, 34];
          if (oct > ALTAR_RADIUS - 10) col = [90, 74, 110];
          const ring = Math.abs(oct - ALTAR_RADIUS * 0.62);
          if (ring < 5) col = [190, 110, 255];
          const glow = Math.max(0, 1 - dist / (ALTAR_RADIUS * 0.45));
          col = [col[0] + glow * 180, col[1] + glow * 110, col[2] + glow * 200];
        }
        // chiếu sáng giả (nổi khối)
        const sh = 1 + (fbm(px + 1, py - 1) - n) * 2.2;
        col = [col[0] * sh, col[1] * sh, col[2] * sh];
        // mép đảo tối dần
        if (dist > R - 30) {
          const k = (dist - (R - 30)) / 30;
          col = [col[0] * (1 - k * 0.5), col[1] * (1 - k * 0.5), col[2] * (1 - k * 0.5)];
        }
      }
      const o = (py * S + px) * 4;
      d[o] = col[0];
      d[o + 1] = col[1];
      d[o + 2] = col[2];
      d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return key;
}
