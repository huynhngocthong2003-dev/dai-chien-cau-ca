import { describe, expect, it } from "vitest";
import { FISHING } from "@dccc/game-config";
import { FISH_BY_ID, JUNK, ZONES } from "@dccc/game-data";
import { Rng, catchOdds, chooseFish, junkChanceFor, luckFactor, rollJunk, rollWeight, type Loadout } from "@dccc/shared";

const lo = (luck: number) => ({ luck, rareRate: 5, passives: [] }) as unknown as Loadout;

describe("may mắn & mùa cá lớn", () => {
  it("may mắn càng cao càng ít vớt rác (không còn cố định 12%)", () => {
    const rate = (luck: number) => {
      const rng = new Rng(7);
      let n = 0;
      for (let i = 0; i < 20000; i++) if (rollJunk(rng, JUNK, junkChanceFor(FISHING.junkChance, luckFactor(lo(luck), 0.5)))) n++;
      return n / 20000;
    };
    const [r0, r50, r150] = [rate(0), rate(50), rate(150)];
    expect(r50).toBeLessThan(r0);
    expect(r150).toBeLessThan(r50);
    expect(r150).toBeLessThan(0.05);
    expect(junkChanceFor(0.12, 100)).toBeGreaterThanOrEqual(0.02); // luôn còn chút rác (nhiệm vụ Sinh Thái)
    expect(junkChanceFor(0.12, 0)).toBeCloseTo(0.12);
  });
  it("mùa cá lớn: cá luôn ở nửa trên khoảng cân nặng và loài to dễ cắn hơn", () => {
    const zone = ZONES[1]!;
    const run = (giant: boolean) => {
      const rng = new Rng(3);
      let kg = 0;
      for (let i = 0; i < 10000; i++) {
        const f = chooseFish(zone, FISH_BY_ID, lo(20), 0.5, rng, { giant });
        const w = rollWeight(f, rng, giant);
        if (giant) expect(w).toBeGreaterThanOrEqual(f.weightKg[0] + (f.weightKg[1] - f.weightKg[0]) * 0.55 - 0.01);
        kg += w;
      }
      return kg / 10000;
    };
    expect(run(true)).toBeGreaterThan(run(false) * 2);
  });
  it("không có mùa cá lớn thì giữ nguyên cách chọn cá cũ (cùng hạt giống → cùng con)", () => {
    const zone = ZONES[0]!;
    const a = new Rng(11);
    const b = new Rng(11);
    for (let i = 0; i < 200; i++) expect(chooseFish(zone, FISH_BY_ID, lo(10), 0.4, a).id).toBe(chooseFish(zone, FISH_BY_ID, lo(10), 0.4, b, {}).id);
  });
  it("may mắn cao → tỉ lệ cá cấp cao tăng rõ, cá thường & rác giảm (bảng tỉ lệ đúng với kết quả câu thật)", () => {
    for (const zone of ZONES) {
      const odds = [0, 50, 150].map((l) => catchOdds(zone, FISH_BY_ID, lo(l), 0.5, FISHING.junkChance));
      for (const o of odds) {
        const total = o.junk + Object.values(o.byRarity).reduce((a, b) => a + (b ?? 0), 0);
        expect(total, zone.id).toBeCloseTo(1, 6);
      }
      const high = (o: (typeof odds)[number]) => 1 - o.junk - (o.byRarity.common ?? 0);
      expect(high(odds[1]!), zone.id).toBeGreaterThan(high(odds[0]!));
      expect(high(odds[2]!), zone.id).toBeGreaterThan(high(odds[1]!));
      expect(odds[2]!.junk).toBeLessThan(odds[0]!.junk);
    }
    const z = ZONES[0]!;
    const o = catchOdds(z, FISH_BY_ID, lo(150), 0.5, FISHING.junkChance);
    expect(1 - o.junk - (o.byRarity.common ?? 0)).toBeGreaterThan(0.45); // may mắn 150 ở khu tân thủ: hơn nửa là cá cấp cao/rác ít
    // đối chiếu mô phỏng câu thật
    const rng = new Rng(5);
    let junk = 0, common = 0;
    const N = 40000;
    for (let i = 0; i < N; i++) {
      if (rollJunk(rng, JUNK, junkChanceFor(FISHING.junkChance, luckFactor(lo(150), 0.5)))) junk++;
      else if (chooseFish(z, FISH_BY_ID, lo(150), 0.5, rng).rarity === "common") common++;
    }
    expect(junk / N).toBeCloseTo(o.junk, 2);
    expect(common / N).toBeCloseTo(o.byRarity.common ?? 0, 1);
  });
});
