import Phaser from "phaser";
import { AWAKENING_LEVEL, branchById, heroById, HEROES, ULTIMATE_LEVEL, type SkillKind } from "@hero-arena/core";
import { SPRITE_MAP } from "./spriteMap.ts";
import { css, pixelTex } from "./art.ts";

// Nhân vật pixel-art từ ảnh của chủ dự án (assets/heroes-atlas.png, sinh bởi scripts/hero-arena-atlas.py).
// Mỗi nút cây tiến hoá có hình riêng; nút chưa có ảnh → tạm nhuộm màu hình gần nhất cùng lớp.

export const HERO_SHEET = "heroes_atlas";
export const HERO_CELL_W = 182;
export const HERO_CELL_H = 168;

export function classIndex(heroId: string): number {
  return Math.max(0, HEROES.findIndex((h) => h.id === heroId));
}

interface ArtPick {
  frame: number;
  /** Màu đích khi phải nhuộm (null = hình thật). */
  tint: number | null;
  /** Màu gốc của hình mượn (để tính độ xoay sắc độ). */
  from: number;
}

function art(id: string, back: boolean): number | undefined {
  const m = SPRITE_MAP[id];
  if (!m) return undefined;
  return back ? (m.b ?? m.f) : m.f;
}

/** Chọn hình cho nút hiện tại của nhân vật. */
function pickArt(heroId: string, branchId: string | null, evolutionId: string | null, back: boolean): ArtPick {
  const hero = heroById(heroId);
  const baseFrame = art(`${heroId}:base`, back) ?? 0;
  if (!hero) return { frame: baseFrame, tint: null, from: 0 };
  const br = branchById(hero, branchId);
  const evo = br?.evolutions.find((e) => e.id === evolutionId);
  if (evo) {
    const own = art(evo.id, back);
    if (own !== undefined) return { frame: own, tint: null, from: evo.color };
    // mượn hình Dạng 3 khác (ưu tiên cùng nhánh), nhuộm theo màu hướng này
    const pool = [...br!.evolutions, ...hero.branches.flatMap((b) => b.evolutions)];
    const donor = pool.find((e) => art(e.id, back) !== undefined);
    if (donor) return { frame: art(donor.id, back) ?? baseFrame, tint: evo.color, from: donor.color };
  }
  if (br) {
    const own = art(br.id, back);
    if (own !== undefined) return { frame: own, tint: evo ? evo.color : null, from: br.color };
    const donor = hero.branches.find((b) => art(b.id, back) !== undefined);
    if (donor) return { frame: art(donor.id, back) ?? baseFrame, tint: evo?.color ?? br.color, from: donor.color };
    return { frame: baseFrame, tint: evo?.color ?? br.color, from: 0x3a8a3a };
  }
  return { frame: baseFrame, tint: null, from: 0 };
}

function hueOf(c: number): number {
  const r = ((c >> 16) & 255) / 255;
  const g = ((c >> 8) & 255) / 255;
  const b = (c & 255) / 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  if (mx === mn) return 0;
  const d = mx - mn;
  const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return h * 60;
}

/** Tạo bản nhuộm màu của một khung (xoay sắc độ các điểm ảnh rực màu, giữ da & đường viền). */
function recolored(scene: Phaser.Scene, frame: number, from: number, to: number): string {
  const key = `recol_${frame}_${to.toString(16)}`;
  if (scene.textures.exists(key)) return key;
  const src = scene.textures.getFrame(HERO_SHEET, frame);
  const tex = scene.textures.createCanvas(key, HERO_CELL_W, HERO_CELL_H);
  if (!src || !tex) return HERO_SHEET;
  const ctx = tex.getContext();
  ctx.drawImage(src.source.image as CanvasImageSource, src.cutX, src.cutY, src.cutWidth, src.cutHeight, 0, 0, HERO_CELL_W, HERO_CELL_H);
  const img = ctx.getImageData(0, 0, HERO_CELL_W, HERO_CELL_H);
  const d = img.data;
  const shift = (hueOf(to) - hueOf(from) + 360) % 360;
  const col = Phaser.Display.Color;
  for (let i = 0; i < d.length; i += 4) {
    if ((d[i + 3] ?? 0) < 10) continue;
    const hsv = col.RGBToHSV(d[i] ?? 0, d[i + 1] ?? 0, d[i + 2] ?? 0);
    // chỉ nhuộm phần rực màu (áo, hiệu ứng); da (sắc cam nhạt, độ bão hoà thấp) giữ nguyên
    const isSkin = hsv.h * 360 > 10 && hsv.h * 360 < 45 && hsv.s < 0.5 && hsv.v > 0.55;
    if (hsv.s < 0.3 || hsv.v < 0.18 || isSkin) continue;
    const c = col.HSVToRGB(((hsv.h * 360 + shift) % 360) / 360, Math.min(1, hsv.s * 1.05), hsv.v) as Phaser.Types.Display.ColorObject;
    d[i] = c.r;
    d[i + 1] = c.g;
    d[i + 2] = c.b;
  }
  ctx.putImageData(img, 0, 0);
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return key;
}

/** Khoá nhận dạng hình hiện tại (để biết khi nào cần đổi). */
export function heroArtKey(heroId: string, branchId: string | null, evolutionId: string | null, back = false): string {
  const a = pickArt(heroId, branchId, evolutionId, back);
  return `${a.frame}:${a.tint ?? ""}`;
}

/** Hình nhân vật có ảnh thật hay đang tạm nhuộm màu. */
export function hasRealArt(heroId: string, branchId: string | null, evolutionId: string | null): boolean {
  return pickArt(heroId, branchId, evolutionId, false).tint === null;
}

/** Texture (khoá + khung) của hình nhân vật hiện tại. */
export function heroTex(scene: Phaser.Scene, heroId: string, branchId: string | null, evolutionId: string | null, back = false): { key: string; frame: number | undefined } {
  const a = pickArt(heroId, branchId, evolutionId, back);
  if (a.tint === null) return { key: HERO_SHEET, frame: a.frame };
  return { key: recolored(scene, a.frame, a.from, a.tint), frame: undefined };
}

/** Đặt hình nhân vật lên Image (gốc ở chân). */
export function setHeroImage(img: Phaser.GameObjects.Image, heroId: string, branchId: string | null, evolutionId: string | null, back = false, scale = 1): Phaser.GameObjects.Image {
  const t = heroTex(img.scene, heroId, branchId, evolutionId, back);
  img.setTexture(t.key, t.frame);
  return img.setOrigin(0.5, 0.97).setScale(scale);
}

export const WALK_FRAMES = 4;

/**
 * Khung bước chân sinh từ hình tĩnh: tách dải chân thành chân trái / chân phải,
 * nhấc luân phiên từng chân, thân nhún theo nhịp (0 và 2: hai chân chạm đất).
 */
export function walkFrameKey(scene: Phaser.Scene, key: string, frame: number | undefined, i: number): string {
  const out = `walk_${key}_${frame ?? "x"}_${i}`;
  if (scene.textures.exists(out)) return out;
  const src = scene.textures.getFrame(key, frame);
  if (!src) return key;
  const w = src.cutWidth;
  const h = src.cutHeight;
  const tmp = document.createElement("canvas");
  tmp.width = w;
  tmp.height = h;
  const tctx = tmp.getContext("2d");
  const tex = scene.textures.createCanvas(out, w, h);
  if (!tctx || !tex) return key;
  tctx.drawImage(src.source.image as CanvasImageSource, src.cutX, src.cutY, w, h, 0, 0, w, h);
  // khung bao hình (bỏ qua hiệu ứng mờ)
  const data = tctx.getImageData(0, 0, w, h).data;
  let top = h;
  let left = w;
  let right = 0;
  let bottom = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if ((data[(y * w + x) * 4 + 3] ?? 0) > 200) {
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
        left = Math.min(left, x);
        right = Math.max(right, x);
      }
  const figH = Math.max(1, bottom - top);
  const legTop = Math.round(bottom - figH * 0.2);
  const mid = Math.round((left + right) / 2);
  const P = 3; // một "điểm ảnh" của hình gốc
  const lift = [0, -4 * P, -P, 0][i] ?? 0; // chân trái nhấc cao
  const liftR = [-P, 0, 0, -4 * P][i] ?? 0; // chân phải nhấc cao
  const bodyDy = [P, -P, P, -P][i] ?? 0; // thân nhún: thấp khi chạm đất, cao khi bước
  const stride = [-P, 2 * P, P, -2 * P][i] ?? 0; // sải chân lệch ngang
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(tmp, 0, 0, w, legTop, 0, bodyDy, w, legTop);
  ctx.drawImage(tmp, 0, legTop, mid, h - legTop, stride, legTop + lift, mid, h - legTop);
  ctx.drawImage(tmp, mid, legTop, w - mid, h - legTop, mid - stride, legTop + liftR, w - mid, h - legTop);
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return out;
}

export function addHeroImage(scene: Phaser.Scene, x: number, y: number, heroId: string, branchId: string | null, evolutionId: string | null = null, scale = 1): Phaser.GameObjects.Image {
  return setHeroImage(scene.add.image(x, y, HERO_SHEET, 0), heroId, branchId, evolutionId, false, scale);
}

/** Bậc tiến hoá theo cấp: 0 = thường, 1 = tiến hoá (cấp 10), 2 = thức tỉnh (cấp 15). */
export function evolutionTier(level: number): number {
  return level >= AWAKENING_LEVEL ? 2 : level >= ULTIMATE_LEVEL ? 1 : 0;
}

/** Tỉ lệ hiển thị: nhân vật lớn dần khi tiến hoá. */
export function evolutionScale(level: number): number {
  return [0.82, 0.92, 1.02][evolutionTier(level)] ?? 0.82;
}

/** Chiều cao hình nhân vật trong ô (px, trước khi nhân tỉ lệ). */
export const HERO_FIGURE_H = 150;

/** Hiệu ứng "thở" nhẹ cho hình đứng yên (màn chọn, bảng chọn dạng, kết quả). */
export function breathe(scene: Phaser.Scene, img: Phaser.GameObjects.Image): void {
  const sy = img.scaleY;
  const sx = img.scaleX;
  scene.tweens.add({ targets: img, scaleY: sy * 1.035, scaleX: sx * 0.988, duration: 850 + Math.floor(Math.random() * 300), yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
}

/** Biểu tượng kỹ năng pixel-art (theo loại kỹ năng + màu nhánh). */
export function skillIcon(scene: Phaser.Scene, kind: SkillKind | "attack", color: number): string {
  const key = `sicon_${kind}_${color.toString(16)}`;
  return pixelTex(
    scene,
    key,
    64,
    64,
    (c) => {
      const g = c.createRadialGradient(32, 28, 4, 32, 32, 34);
      g.addColorStop(0, css(color, 0.95));
      g.addColorStop(1, css(color, 0.25));
      c.fillStyle = "#151a26";
      c.fillRect(4, 4, 56, 56);
      c.fillStyle = g;
      c.fillRect(6, 6, 52, 52);
      c.fillStyle = "#ffffff";
      c.strokeStyle = "#ffffff";
      c.lineWidth = 6;
      c.lineCap = "round";
      c.lineJoin = "round";
      const path = (pts: number[]) => {
        c.beginPath();
        c.moveTo(pts[0] ?? 0, pts[1] ?? 0);
        for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i] ?? 0, pts[i + 1] ?? 0);
      };
      switch (kind) {
        case "attack":
          path([16, 48, 46, 18]);
          c.stroke();
          path([38, 14, 50, 26]);
          c.stroke();
          path([14, 40, 24, 50]);
          c.stroke();
          break;
        case "bolt":
          path([14, 50, 44, 20]);
          c.stroke();
          path([30, 16, 50, 14, 48, 34]);
          c.stroke();
          break;
        case "cleave":
          c.beginPath();
          c.arc(30, 36, 20, -Math.PI * 0.9, -Math.PI * 0.05);
          c.stroke();
          path([46, 30, 52, 40]);
          c.stroke();
          break;
        case "dash":
          path([12, 22, 30, 32, 12, 42]);
          c.stroke();
          path([30, 22, 48, 32, 30, 42]);
          c.stroke();
          break;
        case "nova":
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            path([32 + Math.cos(a) * 8, 32 + Math.sin(a) * 8, 32 + Math.cos(a) * 22, 32 + Math.sin(a) * 22]);
            c.stroke();
          }
          break;
        case "shield":
          path([32, 12, 50, 18, 48, 36, 32, 52, 16, 36, 14, 18]);
          c.closePath();
          c.stroke();
          break;
        case "heal":
          c.fillRect(27, 14, 10, 36);
          c.fillRect(14, 27, 36, 10);
          break;
        case "trap":
          c.beginPath();
          c.arc(32, 32, 18, 0, Math.PI * 2);
          c.stroke();
          c.beginPath();
          c.arc(32, 32, 6, 0, Math.PI * 2);
          c.fill();
          break;
        case "storm":
          path([36, 10, 22, 34, 34, 34, 26, 56]);
          c.stroke();
          c.lineWidth = 3;
          c.beginPath();
          c.arc(32, 32, 24, 0, Math.PI * 2);
          c.stroke();
          break;
      }
    },
    4,
  );
}

const facingCache = new Map<string, 1 | -1>();

/** Sửa tay hướng gốc cho hình mà cách dò tự động đoán sai (hiệu ứng toả đều hai bên). */
const FACING_FIX: Record<string, { f?: 1 | -1; b?: 1 | -1 }> = {
  wind_archer_mst: { b: -1 },
  fire_mage_atk: { f: -1 },
};

function fixedFacing(atlasFrame: number): 1 | -1 | undefined {
  for (const [id, fx] of Object.entries(FACING_FIX)) {
    const m = SPRITE_MAP[id];
    if (!m) continue;
    if (fx.f !== undefined && m.f === atlasFrame) return fx.f;
    if (fx.b !== undefined && m.b === atlasFrame) return fx.b;
  }
  return undefined;
}

/**
 * Hướng gốc của hình (1 = nhìn/đánh sang phải, -1 = sang trái): so khối điểm ảnh
 * chìa ra ở mép trái và mép phải của hình (vũ khí, tay, hiệu ứng).
 */
export function nativeFacing(scene: Phaser.Scene, key: string, frame: number | undefined): 1 | -1 {
  const ck = `${key}:${frame ?? ""}`;
  const hit = facingCache.get(ck);
  if (hit) return hit;
  // khung atlas (hoặc bản nhuộm màu của nó: recol_<khung>_<màu>)
  const atlasFrame = key === HERO_SHEET ? frame : /^recol_(\d+)_/.test(key) ? Number(/^recol_(\d+)_/.exec(key)?.[1]) : undefined;
  if (atlasFrame !== undefined) {
    const fixed = fixedFacing(atlasFrame);
    if (fixed) {
      facingCache.set(ck, fixed);
      return fixed;
    }
  }
  const src = scene.textures.getFrame(key, frame);
  let res: 1 | -1 = 1;
  if (src) {
    const w = src.cutWidth;
    const h = src.cutHeight;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (ctx) {
      ctx.drawImage(src.source.image as CanvasImageSource, src.cutX, src.cutY, w, h, 0, 0, w, h);
      const d = ctx.getImageData(0, 0, w, h).data;
      let minX = w;
      let maxX = 0;
      let sumX = 0;
      let n = 0;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++)
          if ((d[(y * w + x) * 4 + 3] ?? 0) > 200) {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            sumX += x;
            n++;
          }
      if (n > 0) {
        // tâm thân = trọng tâm khối đặc; bên nào chìa ra xa hơn & nhiều hơn là hướng đánh
        const cx = sumX / n;
        let left = 0;
        let right = 0;
        const edge = (maxX - minX) * 0.22;
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++)
            if ((d[(y * w + x) * 4 + 3] ?? 0) > 200) {
              if (x < cx - edge) left += cx - x;
              else if (x > cx + edge) right += x - cx;
            }
        res = left > right * 1.1 ? -1 : 1;
      }
    }
  }
  facingCache.set(ck, res);
  return res;
}

export interface ArmRig {
  /** Thân (đã bỏ phần tay + vũ khí). */
  bodyKey: string;
  /** Tay + vũ khí (cùng kích thước khung, phần còn lại trong suốt). */
  armKey: string;
  /** Vai (điểm xoay) trong toạ độ khung. */
  px: number;
  py: number;
  w: number;
  h: number;
  /** Bên cầm vũ khí trong hình gốc (1 phải, -1 trái) – chiều "vung tới". */
  side: 1 | -1;
}

const rigCache = new Map<string, ArmRig | null>();

/**
 * Tách lớp "tay + vũ khí": phần hình chìa ra ở bên cầm vũ khí (hướng gốc của hình),
 * ngoài thân giữa và phía trên chân. Lớp này xoay quanh vai khi chém / bắn / tung chiêu.
 */
export function armRig(scene: Phaser.Scene, key: string, frame: number | undefined): ArmRig | null {
  const ck = `${key}:${frame ?? ""}`;
  if (rigCache.has(ck)) return rigCache.get(ck) ?? null;
  const src = scene.textures.getFrame(key, frame);
  let rig: ArmRig | null = null;
  if (src) {
    const w = src.cutWidth;
    const h = src.cutHeight;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (ctx) {
      ctx.drawImage(src.source.image as CanvasImageSource, src.cutX, src.cutY, w, h, 0, 0, w, h);
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      let top = h;
      let bottom = 0;
      let sumX = 0;
      let n = 0;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++)
          if ((d[(y * w + x) * 4 + 3] ?? 0) > 200) {
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
            sumX += x;
            n++;
          }
      if (n > 50) {
        const figH = bottom - top;
        const cx = sumX / n;
        const core = figH * 0.19; // nửa bề ngang thân
        const legTop = bottom - figH * 0.22;
        // bên cầm vũ khí = bên có phần chìa xa khỏi thân nhiều nhất (gậy/kiếm dài hơn tay áo)
        let farL = 0;
        let farR = 0;
        for (let y = 0; y < legTop; y++)
          for (let x = 0; x < w; x++)
            if ((d[(y * w + x) * 4 + 3] ?? 0) > 200) {
              const dx = x - cx;
              if (dx < -core * 1.25) farL += -dx - core * 1.25;
              else if (dx > core * 1.25) farR += dx - core * 1.25;
            }
        const side: 1 | -1 = farL > farR ? -1 : 1;
        const cut = cx + side * core;
        const body = new Uint8ClampedArray(d);
        const arm = new Uint8ClampedArray(d.length);
        let armPx = 0;
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            const inArm = y < legTop && (side > 0 ? x > cut : x < cut);
            if (!inArm) continue;
            const o = (y * w + x) * 4;
            if ((d[o + 3] ?? 0) > 0) armPx++;
            for (let k = 0; k < 4; k++) arm[o + k] = d[o + k] ?? 0;
            body[o + 3] = 0;
          }
        // đủ "tay" mới tách (hình không chìa vũ khí ra ngoài thì giữ nguyên)
        if (armPx > n * 0.04) {
          const bodyKey = `rigb_${ck}`;
          const armKey = `riga_${ck}`;
          for (const [k2, data] of [[bodyKey, body], [armKey, arm]] as const) {
            const t = scene.textures.createCanvas(k2, w, h);
            if (!t) continue;
            t.getContext().putImageData(new ImageData(data, w, h), 0, 0);
            t.refresh();
            t.setFilter(Phaser.Textures.FilterMode.NEAREST);
          }
          rig = { bodyKey, armKey, px: cut, py: top + figH * 0.36, w, h, side };
        }
      }
    }
  }
  rigCache.set(ck, rig);
  return rig;
}
