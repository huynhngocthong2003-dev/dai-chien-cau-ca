import { describe, expect, it } from "vitest";
import { FISHING } from "@dccc/game-config";
import { CHARACTER_BY_ID, FISH_BY_ID, ROD_BY_ID, ZONES } from "@dccc/game-data";
import { Rng, buildLoadout, catchOdds, chooseFish } from "@dccc/shared";

const lo = (rodId: string) => buildLoadout(CHARACTER_BY_ID.get("c_be_tom")!, 20, ROD_BY_ID.get(rodId)!, 1);

describe("Cần Cửu Thiên Thần Long (LR): dụ Boss & cá Thần", () => {
  it("là cần LR, nhận bằng mã quà tặng, có kỹ năng dụ Boss ×5 & dụ Huyền Thoại/Thần Thoại ×5", () => {
    const r = ROD_BY_ID.get("r_cuu_thien_than_long")!;
    expect(r.rarity).toBe("LR");
    expect(r.unlock.kind).toBe("code");
    expect(r.visual.ornament).toBe("celestial");
    expect(r.passive.effects).toEqual(expect.arrayContaining([{ kind: "boss_lure", value: 4 }, { kind: "mythic_lure", value: 4 }]));
  });
  it("tỉ lệ Boss & cá Thần Thoại/Huyền Thoại tăng mạnh so với cần LR Huyết Ma Long (ở mọi khu)", () => {
    for (const zone of ZONES) {
      const a = catchOdds(zone, FISH_BY_ID, lo("r_huyet_ma_long"), 0.6, FISHING.junkChance);
      const b = catchOdds(zone, FISH_BY_ID, lo("r_cuu_thien_than_long"), 0.6, FISHING.junkChance);
      expect(b.byRarity.boss!, zone.id).toBeGreaterThan(a.byRarity.boss! * 4);
      const hi = (o: typeof a) => (o.byRarity.mythic ?? 0) + (o.byRarity.legendary ?? 0);
      if (hi(a) > 0) expect(hi(b), zone.id).toBeGreaterThan(hi(a) * 3);
    }
  });
  it("câu thật (mô phỏng): Boss ra nhiều hơn rõ rệt", () => {
    const zone = ZONES[0]!;
    const count = (rodId: string) => {
      const rng = new Rng(9);
      let boss = 0;
      for (let i = 0; i < 20000; i++) if (chooseFish(zone, FISH_BY_ID, lo(rodId), 0.6, rng).rarity === "boss") boss++;
      return boss;
    };
    expect(count("r_cuu_thien_than_long")).toBeGreaterThan(count("r_huyet_ma_long") * 3.5);
  });
});
