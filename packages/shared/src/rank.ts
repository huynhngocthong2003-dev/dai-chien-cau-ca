import { DM_RANK, DM_RANK_TIERS } from "@dccc/game-config";
import type { AiLevel } from "./combat.ts";

/** Hạng rank Đấu Sinh Tử tại một số điểm. */
export interface DmRank {
  points: number;
  /** 0..4 – chỉ số trong DM_RANK_TIERS. */
  tier: number;
  /** 1..5 – bậc trong hạng. */
  division: number;
  /** 0..5 – sao đã có ở bậc hiện tại (5 chỉ khi đã ở bậc cao nhất). */
  stars: number;
  /** 0..99 – điểm đang tích cho sao kế tiếp. */
  starPoints: number;
  /** Đã ở bậc cuối cùng (Thần Thoại bậc 5) – sao dư cộng dồn vào `extraStars`. */
  top: boolean;
  extraStars: number;
}

const STARS_PER_TIER = DM_RANK.starsPerDivision * DM_RANK.divisionsPerTier;
const MAX_DIVISION_INDEX = DM_RANK_TIERS.length * DM_RANK.divisionsPerTier - 1;

/** Điểm rank hiện tại trong bản lưu (mùa mới bắt đầu từ 0 – không tính số trận thắng cũ). */
export function dmRankPoints(stats: { rankPoints?: number } | undefined): number {
  return Math.max(0, Math.floor(stats?.rankPoints ?? 0));
}

/** Quy đổi điểm → hạng / bậc / sao. 100 điểm = 1 sao, 5 sao = lên bậc, 5 bậc = lên hạng. */
export function dmRankOf(points: number): DmRank {
  const p = Math.max(0, Math.floor(points));
  const totalStars = Math.floor(p / DM_RANK.pointsPerStar);
  const starPoints = p % DM_RANK.pointsPerStar;
  const divIdx = Math.floor(totalStars / DM_RANK.starsPerDivision);
  if (divIdx > MAX_DIVISION_INDEX) {
    // đỉnh bảng: giữ 5 sao, phần dư cộng dồn
    const extra = totalStars - (MAX_DIVISION_INDEX + 1) * DM_RANK.starsPerDivision;
    return { points: p, tier: DM_RANK_TIERS.length - 1, division: DM_RANK.divisionsPerTier, stars: DM_RANK.starsPerDivision, starPoints, top: true, extraStars: extra };
  }
  return {
    points: p,
    tier: Math.floor(divIdx / DM_RANK.divisionsPerTier),
    division: (divIdx % DM_RANK.divisionsPerTier) + 1,
    stars: totalStars % DM_RANK.starsPerDivision,
    starPoints,
    top: false,
    extraStars: 0,
  };
}

/** Điểm tối thiểu để vào hạng `tier`, bậc `division` (1..5). */
export function dmRankMinPoints(tier: number, division: number): number {
  return (tier * STARS_PER_TIER + (division - 1) * DM_RANK.starsPerDivision) * DM_RANK.pointsPerStar;
}

/** Tên đầy đủ: "Tinh Anh · Bậc 3". */
export function dmRankLabel(r: DmRank): string {
  return `${DM_RANK_TIERS[r.tier]!.name} · Bậc ${r.division}`;
}

/** So sánh trước/sau 1 trận: có lên sao / lên bậc / lên hạng không. */
export function dmRankChange(before: number, after: number): { star: boolean; division: boolean; tier: boolean } {
  const a = dmRankOf(before);
  const b = dmRankOf(after);
  const sa = Math.floor(a.points / DM_RANK.pointsPerStar);
  const sb = Math.floor(b.points / DM_RANK.pointsPerStar);
  return { star: sb > sa, division: b.tier * 10 + b.division > a.tier * 10 + a.division, tier: b.tier > a.tier };
}

/** Độ khó MÁY khi đấu sinh tử theo hạng: Tân Binh Dễ · Chiến Binh Thường · Tinh Anh Khó · Huyền Thoại/Thần Thoại Boss. */
export function dmAiLevel(points: number): AiLevel {
  return (["easy", "normal", "hard", "boss", "boss"] as const)[dmRankOf(points).tier]!;
}

/** Lực chiến đội máy so với đội mình: +2% mỗi bậc đã leo (Tân Binh 1 = ×1, Thần Thoại 5 = ×1,48). */
export function dmAiPowerScale(points: number): number {
  const r = dmRankOf(points);
  return 1 + 0.02 * (r.tier * DM_RANK.divisionsPerTier + r.division - 1);
}

export const AI_LEVEL_LABEL: Record<AiLevel, string> = { easy: "Dễ", normal: "Thường", hard: "Khó", boss: "Trùm" };
