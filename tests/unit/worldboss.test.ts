import { describe, expect, it } from "vitest";
import { FISH_BY_ID, WORLD_BOSSES } from "@dccc/game-data";
import { ELEMENT_EVO_ITEM, WORLD_BOSS, makeCombatFish, wbHitDamage, wbKillReward, wbRankReward, worldBossFor, worldBossMaxHp, worldBossSlot } from "@dccc/shared";

// 2026-11-23 theo giờ Việt Nam (UTC+7)
const vn = (h: number, m = 0) => Date.UTC(2026, 10, 23, h - 7, m);

describe("Boss Thế Giới", () => {
  it("khung giờ 12h · 15h · 20h (giờ VN), mỗi lần 30 phút", () => {
    expect(worldBossSlot(vn(11, 59))).toMatchObject({ key: "2026-11-23-12", live: false });
    expect(worldBossSlot(vn(12, 0))).toMatchObject({ key: "2026-11-23-12", live: true });
    expect(worldBossSlot(vn(12, 29))).toMatchObject({ key: "2026-11-23-12", live: true });
    expect(worldBossSlot(vn(12, 30))).toMatchObject({ key: "2026-11-23-15", live: false });
    expect(worldBossSlot(vn(20, 10))).toMatchObject({ key: "2026-11-23-20", live: true });
    expect(worldBossSlot(vn(21, 0))).toMatchObject({ key: "2026-11-24-12", live: false });
    const s = worldBossSlot(vn(15, 5));
    expect(s.endsAt - s.startsAt).toBe(WORLD_BOSS.durationMin * 60_000);
    expect(s.startsAt).toBe(vn(15));
  });
  it("xoay vòng đủ 7 boss (7 hệ), mỗi khung 1 boss tất định", () => {
    expect(new Set(WORLD_BOSSES.map((b) => b.element)).size).toBe(7);
    const seen = new Set<string>();
    for (let d = 0; d < 3; d++) for (let i = 0; i < 3; i++) seen.add(worldBossFor({ dayIndex: 20000 + d, slotIndex: i }, WORLD_BOSSES).id);
    expect(seen.size).toBe(7);
    const s = worldBossSlot(vn(12, 1));
    expect(worldBossFor(s, WORLD_BOSSES).id).toBe(worldBossFor(s, WORLD_BOSSES).id);
    expect(worldBossMaxHp({ slotIndex: 2 })).toBeGreaterThan(worldBossMaxHp({ slotIndex: 0 }));
  });
  it("sát thương theo canh kim & khắc hệ; quà theo hạng; kết liễu nhận Đá Tiến Hoá đúng hệ", () => {
    const def = FISH_BY_ID.get("f_boss_lao_ngu")!;
    const team = [0, 1, 2].map((i) => makeCombatFish({ def, uid: `t${i}`, level: 15, stars: 1, element: "metal" }));
    const wood = { element: "wood" as const, def: 200 };
    const fire = { element: "fire" as const, def: 200 };
    expect(wbHitDamage(team, wood, "perfect")).toBeGreaterThan(wbHitDamage(team, wood, "yellow"));
    expect(wbHitDamage(team, wood, "yellow")).toBeGreaterThan(wbHitDamage(team, wood, "red"));
    expect(wbHitDamage(team, wood, "green")).toBeGreaterThan(wbHitDamage(team, fire, "green")); // Kim khắc Mộc, bị Hỏa khắc
    expect(wbHitDamage(team, { element: "wood", def: 1e9 }, "red")).toBe(3); // mỗi con ≥ 1
    expect(wbRankReward(1).diamonds!).toBeGreaterThan(wbRankReward(2).diamonds!);
    expect(wbRankReward(3).diamonds!).toBeGreaterThan(wbRankReward(10).diamonds!);
    expect(wbRankReward(10).diamonds!).toBeGreaterThan(wbRankReward(11).diamonds!);
    expect(wbKillReward("wood").evoItems).toEqual({ [ELEMENT_EVO_ITEM.wood]: 1 });
  });
});
