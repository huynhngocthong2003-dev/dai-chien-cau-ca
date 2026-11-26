import type { Rng } from "./rng.ts";
import type { BiomeType, EnvironmentalHazard } from "./types.ts";

// Bản đồ đảo tròn 6 vùng địa hình + vòng bo thu hẹp + biến đổi môi trường.

export const WORLD_SIZE = 5200;
export const WORLD_CENTER = WORLD_SIZE / 2;
export const ISLAND_RADIUS = 2300;
/** Bán kính khu tế đàn trung tâm. */
export const ALTAR_RADIUS = 230;

/** 6 vùng theo góc (độ, 0 = hướng đông, chiều kim đồng hồ vì trục y hướng xuống). */
export const BIOME_SECTORS: ReadonlyArray<{ biome: BiomeType; from: number; to: number }> = [
  { biome: "ruined_temple", from: -90, to: -30 },
  { biome: "mountain", from: -30, to: 30 },
  { biome: "glacier", from: 30, to: 90 },
  { biome: "desert", from: 90, to: 150 },
  { biome: "ruined_village", from: 150, to: 210 },
  { biome: "forest", from: 210, to: 270 },
];

export const BIOME_NAME_VI: Record<BiomeType, string> = {
  forest: "Rừng U Linh",
  ruined_temple: "Đền Cổ Đổ Nát",
  desert: "Sa Mạc Cháy",
  ruined_village: "Làng Hoang",
  mountain: "Núi Tuyết",
  glacier: "Sông Băng",
};

export function biomeAt(x: number, y: number): BiomeType {
  const dx = x - WORLD_CENTER;
  const dy = y - WORLD_CENTER;
  if (dx * dx + dy * dy < ALTAR_RADIUS * ALTAR_RADIUS) return "ruined_temple";
  let a = (Math.atan2(dy, dx) * 180) / Math.PI; // -180..180
  if (a < -90) a += 360; // về khoảng -90..270
  for (const s of BIOME_SECTORS) if (a >= s.from && a < s.to) return s.biome;
  return "forest";
}

/** Góc giữa (radian) của một vùng – dùng để rải quái/trang trí. */
export function biomeMidAngle(biome: BiomeType): number {
  const s = BIOME_SECTORS.find((x) => x.biome === biome);
  if (!s) return 0;
  return (((s.from + s.to) / 2) * Math.PI) / 180;
}

export function hazardForBiome(biome: BiomeType): EnvironmentalHazard {
  switch (biome) {
    case "forest":
    case "ruined_temple":
      return "toxic_mist";
    case "desert":
    case "ruined_village":
      return "sandstorm";
    case "mountain":
    case "glacier":
      return "frozen_ground";
  }
}

export interface HazardEffect {
  nameVi: string;
  extraDps: number;
  speedMul: number;
  rangeMul: number;
  /** Tầm nhìn còn lại (1 = bình thường). */
  vision: number;
  slippery: boolean;
}

export const HAZARD_EFFECTS: Record<EnvironmentalHazard, HazardEffect> = {
  none: { nameVi: "", extraDps: 0, speedMul: 1, rangeMul: 1, vision: 1, slippery: false },
  toxic_mist: { nameVi: "Sương độc", extraDps: 6, speedMul: 1, rangeMul: 1, vision: 0.55, slippery: false },
  sandstorm: { nameVi: "Bão cát", extraDps: 4, speedMul: 0.78, rangeMul: 0.8, vision: 0.8, slippery: false },
  frozen_ground: { nameVi: "Đất đóng băng", extraDps: 5, speedMul: 0.92, rangeMul: 1, vision: 0.9, slippery: true },
};

export interface ZoneStage {
  waitSec: number;
  shrinkSec: number;
  radius: number;
  /** Sát thương/giây ngoài bo trong giai đoạn này. */
  dps: number;
}

export const ZONE_STAGES: readonly ZoneStage[] = [
  // tổng tối đa ~17,7 phút → trận 15–20 phút
  { waitSec: 150, shrinkSec: 60, radius: 1700, dps: 10 },
  { waitSec: 140, shrinkSec: 50, radius: 1250, dps: 18 },
  { waitSec: 130, shrinkSec: 45, radius: 880, dps: 28 },
  { waitSec: 115, shrinkSec: 40, radius: 560, dps: 42 },
  { waitSec: 100, shrinkSec: 35, radius: 320, dps: 64 },
  { waitSec: 80, shrinkSec: 30, radius: 130, dps: 95 },
  { waitSec: 60, shrinkSec: 25, radius: 0, dps: 150 },
]

export interface ZoneState {
  /** Chỉ số giai đoạn kế tiếp trong ZONE_STAGES (= số lần đã thu xong). */
  stage: number;
  phase: "wait" | "shrink" | "done";
  timer: number;
  centerX: number;
  centerY: number;
  radius: number;
  fromX: number;
  fromY: number;
  fromRadius: number;
  targetX: number;
  targetY: number;
  targetRadius: number;
  dps: number;
}

function pickTarget(z: ZoneState, rng: Rng): void {
  const st = ZONE_STAGES[z.stage];
  if (!st) return;
  const slack = Math.max(0, z.radius - st.radius);
  const a = rng.range(0, Math.PI * 2);
  const d = Math.sqrt(rng.next()) * slack * 0.85;
  z.targetX = z.centerX + Math.cos(a) * d;
  z.targetY = z.centerY + Math.sin(a) * d;
  z.targetRadius = st.radius;
}

export function createZone(rng: Rng): ZoneState {
  const z: ZoneState = {
    stage: 0,
    phase: "wait",
    timer: ZONE_STAGES[0]?.waitSec ?? 30,
    centerX: WORLD_CENTER,
    centerY: WORLD_CENTER,
    radius: ISLAND_RADIUS + 60,
    fromX: WORLD_CENTER,
    fromY: WORLD_CENTER,
    fromRadius: ISLAND_RADIUS + 60,
    targetX: WORLD_CENTER,
    targetY: WORLD_CENTER,
    targetRadius: ISLAND_RADIUS,
    dps: 6,
  };
  pickTarget(z, rng);
  return z;
}

/** Tiến vòng bo dt giây. Trả về true khi vừa bắt đầu thu hẹp (để báo động). */
export function tickZone(z: ZoneState, dt: number, rng: Rng): { shrinkStarted: boolean; stageDone: boolean } {
  const out = { shrinkStarted: false, stageDone: false };
  if (z.phase === "done") return out;
  z.timer -= dt;
  const st = ZONE_STAGES[z.stage];
  if (!st) {
    z.phase = "done";
    return out;
  }
  if (z.phase === "wait") {
    if (z.timer <= 0) {
      z.phase = "shrink";
      z.timer = st.shrinkSec;
      z.fromX = z.centerX;
      z.fromY = z.centerY;
      z.fromRadius = z.radius;
      z.dps = st.dps;
      out.shrinkStarted = true;
    }
    return out;
  }
  // đang thu hẹp: nội suy tuyến tính
  const t = Math.min(1, 1 - Math.max(0, z.timer) / st.shrinkSec);
  z.centerX = z.fromX + (z.targetX - z.fromX) * t;
  z.centerY = z.fromY + (z.targetY - z.fromY) * t;
  z.radius = z.fromRadius + (z.targetRadius - z.fromRadius) * t;
  if (z.timer <= 0) {
    out.stageDone = true;
    z.stage += 1;
    const next = ZONE_STAGES[z.stage];
    if (!next) {
      z.phase = "done";
      return out;
    }
    z.phase = "wait";
    z.timer = next.waitSec;
    pickTarget(z, rng);
  }
  return out;
}

export function isOutsideZone(z: ZoneState, x: number, y: number): boolean {
  return Math.hypot(x - z.centerX, y - z.centerY) > z.radius;
}
