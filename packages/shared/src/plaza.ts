import { RARITY_ORDER } from "@dccc/game-config";
import type { FishDef } from "./types.ts";
import type { OwnedFish } from "./save.ts";

/**
 * Quảng Trường: logic thuần túy cho di chuyển và khoe cá.
 * Vị trí lưu dạng chuẩn hóa (0..1) để máy chủ chỉ cần kiểm tra khoảng; client đổi ra tọa độ màn hình.
 */
export const PLAZA = {
  /** Vùng đi lại trên màn hình (tọa độ thiết kế 1280×720). */
  left: 60,
  right: 1220,
  top: 400,
  bottom: 640,
  /** Tốc độ đi bộ (px/giây). */
  speed: 280,
  /** Đài phun nước giữa quảng trường – không đi xuyên qua. */
  fountain: { x: 640, y: 455, rx: 120, ry: 42 },
};

export interface Vec {
  x: number;
  y: number;
}

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function toScreen(n: Vec): Vec {
  return { x: PLAZA.left + clamp01(n.x) * (PLAZA.right - PLAZA.left), y: PLAZA.top + clamp01(n.y) * (PLAZA.bottom - PLAZA.top) };
}
export function toNorm(p: Vec): Vec {
  return { x: clamp01((p.x - PLAZA.left) / (PLAZA.right - PLAZA.left)), y: clamp01((p.y - PLAZA.top) / (PLAZA.bottom - PLAZA.top)) };
}

/** Đẩy điểm ra ngoài đài phun nước và giữ trong vùng đi lại. */
export function constrain(p: Vec): Vec {
  let x = Math.min(PLAZA.right, Math.max(PLAZA.left, p.x));
  let y = Math.min(PLAZA.bottom, Math.max(PLAZA.top, p.y));
  const f = PLAZA.fountain;
  const dx = (x - f.x) / f.rx;
  const dy = (y - f.y) / f.ry;
  const d = Math.hypot(dx, dy);
  if (d < 1) {
    const k = d < 1e-6 ? 1 : 1 / d;
    x = f.x + (d < 1e-6 ? 1 : dx * k) * f.rx;
    y = f.y + (d < 1e-6 ? 0 : dy * k) * f.ry;
    y = Math.min(PLAZA.bottom, Math.max(PLAZA.top, y));
  }
  return { x, y };
}

/**
 * Một bước di chuyển: theo hướng cần điều khiển/phím (dir, độ dài ≤ 1) nếu có,
 * nếu không thì đi tới điểm đích (bấm vào nền). Trả về vị trí mới và việc đã tới đích chưa.
 */
export function stepMove(pos: Vec, dtMs: number, input: { dir?: Vec | null; target?: Vec | null }): { pos: Vec; arrived: boolean; moving: boolean } {
  const maxStep = (PLAZA.speed * dtMs) / 1000;
  const dir = input.dir;
  if (dir && (dir.x || dir.y)) {
    const len = Math.hypot(dir.x, dir.y);
    const m = Math.min(1, len);
    const next = constrain({ x: pos.x + (dir.x / len) * m * maxStep, y: pos.y + (dir.y / len) * m * maxStep * 0.75 });
    return { pos: next, arrived: true, moving: true };
  }
  const t = input.target;
  if (!t) return { pos, arrived: true, moving: false };
  const goal = constrain(t);
  const dx = goal.x - pos.x;
  const dy = goal.y - pos.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= maxStep || dist < 1) return { pos: goal, arrived: true, moving: dist >= 1 };
  return { pos: constrain({ x: pos.x + (dx / dist) * maxStep, y: pos.y + (dy / dist) * maxStep }), arrived: false, moving: true };
}

/** Phối cảnh: càng xuống gần màn hình càng to. */
export function depthScale(y: number): number {
  return 0.42 + 0.2 * clamp01((y - PLAZA.top) / (PLAZA.bottom - PLAZA.top));
}

/** Thông tin cá đang khoe (gửi lên máy chủ, hiển thị trên đầu nhân vật). */
export interface PlazaShow {
  fishId: string;
  formId: string | null;
  kg: number;
  lv: number;
  stars: number;
}

/** Cá đáng khoe nhất: độ hiếm cao → cân nặng lớn. */
export function showOffCandidates(fishes: OwnedFish[], fishById: Map<string, FishDef>, limit = 12): OwnedFish[] {
  const rank = (f: OwnedFish) => RARITY_ORDER.indexOf(fishById.get(f.fishId)?.rarity ?? "common");
  return fishes
    .filter((f) => fishById.has(f.fishId))
    .slice()
    .sort((a, b) => rank(b) - rank(a) || (b.form ? 1 : 0) - (a.form ? 1 : 0) || b.weightKg - a.weightKg)
    .slice(0, limit);
}

export function toShow(f: OwnedFish): PlazaShow {
  return { fishId: f.fishId, formId: f.form ?? null, kg: Math.round(f.weightKg * 10) / 10, lv: f.level, stars: f.stars };
}

/** Lời khoe gửi lên kênh chat (≤ 200 ký tự). */
export function showOffMessage(show: PlazaShow, fish: FishDef, formName?: string): string {
  return `🐟 Khoe cá: ${formName ? `${formName} ` : ""}${fish.name} ${show.kg}kg · Lv.${show.lv} ${"★".repeat(Math.min(5, show.stars))}`.slice(0, 200);
}

/** Biểu cảm có sẵn. */
export const PLAZA_EMOTES = ["👋", "😂", "😎", "🔥", "❤️", "🎣", "😭", "👍"] as const;

// ------------------------------------------------------------------ câu cùng nhau
/** Số chỗ câu cho người chơi khác ở mỗi khu (máy chủ chia 0..5). */
export const FISHING_SPOTS = 6;
/**
 * Vị trí chỗ câu trên bến xa (tọa độ thiết kế): cách đều 120px, nằm giữa bục của mình (x < 330)
 * và đồng hồ lực căng (x > 1160) → không ai che ai, không che giao diện.
 */
export function fishingSpotX(spot: number): number {
  return 470 + Math.min(FISHING_SPOTS - 1, Math.max(0, spot)) * 120;
}
