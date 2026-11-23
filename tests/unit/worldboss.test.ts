import { describe, expect, it } from "vitest";
import { FORM_BY_ID, FISH_BY_ID, WORLD_BOSSES } from "@dccc/game-data";
import { ELEMENT_EVO_ITEM, WORLD_BOSS, makeCombatFish, worldBossTeam, wbHitDamage, wbKillReward, wbRankReward, worldBossFor, worldBossMaxHp, worldBossSlot } from "@dccc/shared";

// 2026-11-23 theo giờ Việt Nam (UTC+7)
const vn = (h: number, m = 0) => Date.UTC(2026, 10, 23, h - 7, m);

describe("Boss Thế Giới", () => {
  it("khung giờ 12h · 15h · 20h · 23h (giờ VN), mỗi lần 30 phút", () => {
    expect(worldBossSlot(vn(11, 59))).toMatchObject({ key: "2026-11-23-12", live: false });
    expect(worldBossSlot(vn(12, 0))).toMatchObject({ key: "2026-11-23-12", live: true });
    expect(worldBossSlot(vn(12, 29))).toMatchObject({ key: "2026-11-23-12", live: true });
    expect(worldBossSlot(vn(12, 30))).toMatchObject({ key: "2026-11-23-15", live: false });
    expect(worldBossSlot(vn(20, 10))).toMatchObject({ key: "2026-11-23-20", live: true });
    expect(worldBossSlot(vn(21, 0))).toMatchObject({ key: "2026-11-23-23", live: false });
    expect(worldBossSlot(vn(23, 15))).toMatchObject({ key: "2026-11-23-23", live: true });
    expect(worldBossSlot(vn(23, 31))).toMatchObject({ key: "2026-11-24-12", live: false });
    const s = worldBossSlot(vn(15, 5));
    expect(s.endsAt - s.startsAt).toBe(WORLD_BOSS.durationMin * 60_000);
    expect(s.startsAt).toBe(vn(15));
  });
  it("mỗi khung giờ 1 boss NGẪU NHIÊN (tất định), không trùng khung liền trước, đủ 7 boss xuất hiện", () => {
    expect(new Set(WORLD_BOSSES.map((b) => b.element)).size).toBe(7);
    const seen = new Map<string, number>();
    let prev = "";
    let sameAsPrev = 0;
    let sameInDay = 0;
    let rotation = 0;
    for (let d = 0; d < 200; d++)
      for (let i = 0; i < WORLD_BOSS.hours.length; i++) {
        const id = worldBossFor({ dayIndex: 20000 + d, slotIndex: i }, WORLD_BOSSES).id;
        seen.set(id, (seen.get(id) ?? 0) + 1);
        if (id === prev) sameAsPrev++;
        if (id === prev && i > 0) sameInDay++;
        if (WORLD_BOSSES[(WORLD_BOSSES.findIndex((b) => b.id === prev) + 1) % 7]!.id === id) rotation++;
        prev = id;
      }
    expect(seen.size).toBe(7);
    for (const n of seen.values()) expect(n).toBeGreaterThan(60); // 800 khung / 7 ≈ 114, phân bố đều
    expect(sameInDay).toBe(0); // trong ngày: khung sau luôn khác boss khung trước
    expect(sameAsPrev).toBeLessThan(45); // qua ngày (23h → 12h hôm sau) thỉnh thoảng trùng
    expect(rotation).toBeLessThan(400); // không còn xoay vòng theo thứ tự cố định
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
  it("đội đánh boss = đúng 3 cá trưng bày; lực chiến = tổng 3 con; thiếu thì không đủ đội", () => {
    const mk = (uid: string, fishId: string, level: number) => ({ uid, fishId, level, stars: 1, weightKg: 1, zoneId: "z_ben_tan_thu", caughtAt: 0 });
    const fishes = [mk("a", "f_boss_lao_ngu", 20), mk("b", "f_ca_ro", 5), mk("c", "f_ca_tre", 4), mk("d", "f_ca_ro", 1)];
    const t = worldBossTeam({ fishes, showcase: ["d", "b", "c"] } as never, FISH_BY_ID, FORM_BY_ID);
    expect(t.uids).toEqual(["d", "b", "c"]); // không tự đổi sang cá mạnh nhất
    expect(t.fromShowcase).toBe(3);
    expect(t.power).toBeGreaterThan(0);
    const one = worldBossTeam({ fishes, showcase: ["a", "zz"] } as never, FISH_BY_ID, FORM_BY_ID);
    expect(one.uids).toEqual(["a"]);
  });
});

describe("Chiêu boss gây sát thương lên người chơi", () => {
  it("lịch cố định: giây 6 rồi mỗi 8 giây; trừ máu theo khắc hệ; hết máu = 0", async () => {
    const { WB_SKILL, wbPlayerHp, wbPlayerMaxHp, wbSkillPct, wbSkillsLanded } = await import("@dccc/shared");
    expect(wbSkillsLanded(5999)).toBe(0);
    expect(wbSkillsLanded(6000)).toBe(1);
    expect(wbSkillsLanded(13999)).toBe(1);
    expect(wbSkillsLanded(14000)).toBe(2);
    const team = [{ hp: 400, element: "wood" as const }, { hp: 300, element: "wood" as const }, { hp: 300, element: "wood" as const }];
    expect(wbPlayerMaxHp(team)).toBe(1000);
    // Kim khắc Mộc → boss Kim đánh đội Mộc mạnh; boss Thổ bị Mộc khắc → đánh nhẹ
    expect(wbSkillPct("metal", team)).toBe(WB_SKILL.pct.strong);
    expect(wbSkillPct("earth", team)).toBe(WB_SKILL.pct.weak);
    expect(wbSkillPct("light", team)).toBe(WB_SKILL.pct.strong); // Ánh sáng áp chế hệ tự nhiên
    expect(wbSkillPct("water", team)).toBe(WB_SKILL.pct.normal);
    expect(wbPlayerHp(1000, 0.25, 0)).toBe(1000);
    expect(wbPlayerHp(1000, 0.25, 6000)).toBe(750);
    expect(wbPlayerHp(1000, 0.25, 30000)).toBe(0); // chiêu thứ 4 (giây 30) hạ gục
    expect(wbPlayerHp(1000, 0.35, 22000)).toBe(0); // bị khắc: gục ở chiêu thứ 3 (giây 22)
    expect(wbPlayerHp(1000, 0.15, 30000)).toBe(400);
  });
});

describe("Né / đỡ chiêu boss", () => {
  it("bấm sát lúc chạm = né hoàn hảo; sớm hơn trong cảnh báo = đỡ (40%); quá sớm = không tính", async () => {
    const { WB_GUARD, wbJudgeGuard, wbPlayerHp } = await import("@dccc/shared");
    const sched = { firstMs: 6000, everyMs: 8000 };
    expect(wbJudgeGuard(5800, sched)).toEqual({ k: 0, kind: "dodge" });
    expect(wbJudgeGuard(6200, sched)).toEqual({ k: 0, kind: "dodge" }); // trễ chút do mạng vẫn tính
    expect(wbJudgeGuard(5000, sched)).toEqual({ k: 0, kind: "guard" });
    expect(wbJudgeGuard(3000, sched)).toBeNull();
    expect(wbJudgeGuard(13700, sched)).toEqual({ k: 1, kind: "dodge" });
    expect(wbPlayerHp(1000, 0.25, 15000, sched, { 0: "dodge" })).toBe(750);
    expect(wbPlayerHp(1000, 0.25, 15000, sched, { 0: "guard", 1: "dodge" })).toBe(1000 - 250 * WB_GUARD.guardMult);
    expect(wbPlayerHp(1000, 0.25, 15000, sched)).toBe(500);
  });
});
