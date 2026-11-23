import { describe, expect, test } from "vitest";
import { DM_RANK_TIERS } from "@dccc/game-config";
import { dmAiLevel, dmAiPowerScale, dmRankChange, dmRankLabel, dmRankMinPoints, dmRankOf, dmRankPoints } from "@dccc/shared";

describe("rank Đấu Sinh Tử", () => {
  test("điểm rank đọc từ bản lưu, mùa mới = 0 (không tính trận thắng cũ)", () => {
    expect(dmRankPoints(undefined)).toBe(0);
    expect(dmRankPoints({})).toBe(0);
    expect(dmRankPoints({ rankPoints: 70 })).toBe(70);
  });
  test("máy càng khó khi rank càng cao", () => {
    expect(dmAiLevel(0)).toBe("easy");
    expect(dmAiLevel(2500)).toBe("normal");
    expect(dmAiLevel(5000)).toBe("hard");
    expect(dmAiLevel(7500)).toBe("boss");
    expect(dmAiLevel(13000)).toBe("boss");
    expect(dmAiPowerScale(0)).toBe(1);
    expect(dmAiPowerScale(500)).toBeCloseTo(1.02);
    expect(dmAiPowerScale(12000)).toBeCloseTo(1.48);
    expect(dmAiPowerScale(99999)).toBeCloseTo(1.48);
  });
  test("bắt đầu Tân Binh bậc 1, 0 sao", () => {
    expect(dmRankOf(0)).toMatchObject({ tier: 0, division: 1, stars: 0, starPoints: 0, top: false });
    expect(dmRankLabel(dmRankOf(0))).toBe("Tân Binh · Bậc 1");
  });
  test("100 điểm = 1 sao, 5 sao = lên bậc", () => {
    expect(dmRankOf(90)).toMatchObject({ division: 1, stars: 0, starPoints: 90 });
    expect(dmRankOf(100)).toMatchObject({ division: 1, stars: 1, starPoints: 0 });
    expect(dmRankOf(499)).toMatchObject({ division: 1, stars: 4, starPoints: 99 });
    expect(dmRankOf(500)).toMatchObject({ tier: 0, division: 2, stars: 0 });
  });
  test("bậc 5 đủ 5 sao → lên hạng kế", () => {
    expect(dmRankOf(2499)).toMatchObject({ tier: 0, division: 5, stars: 4 });
    expect(dmRankOf(2500)).toMatchObject({ tier: 1, division: 1, stars: 0 });
    expect(dmRankLabel(dmRankOf(2500))).toBe("Chiến Binh · Bậc 1");
  });
  test("mốc điểm từng hạng / bậc", () => {
    DM_RANK_TIERS.forEach((_, t) => {
      for (let d = 1; d <= 5; d++) expect(dmRankOf(dmRankMinPoints(t, d))).toMatchObject({ tier: t, division: d, stars: 0 });
    });
    expect(dmRankMinPoints(4, 5)).toBe(12000);
  });
  test("đỉnh bảng: Thần Thoại bậc 5 giữ 5 sao, sao dư cộng dồn", () => {
    expect(dmRankOf(12400)).toMatchObject({ tier: 4, division: 5, stars: 4, top: false });
    expect(dmRankOf(12500)).toMatchObject({ tier: 4, division: 5, stars: 5, top: true, extraStars: 0 });
    expect(dmRankOf(13730)).toMatchObject({ tier: 4, division: 5, stars: 5, top: true, extraStars: 12, starPoints: 30 });
  });
  test("báo lên sao / bậc / hạng", () => {
    expect(dmRankChange(90, 100)).toEqual({ star: true, division: false, tier: false });
    expect(dmRankChange(490, 500)).toEqual({ star: true, division: true, tier: false });
    expect(dmRankChange(2490, 2500)).toEqual({ star: true, division: true, tier: true });
    expect(dmRankChange(10, 20)).toEqual({ star: false, division: false, tier: false });
  });
});
