import { describe, expect, it } from "vitest";
import { CHARACTERS, FISHES, FISH_BY_ID, RODS, ZONES } from "@dccc/game-data";

describe("Dữ liệu game", () => {
  it("có đủ số lượng tối thiểu", () => {
    expect(CHARACTERS.length).toBeGreaterThanOrEqual(12);
    expect(RODS.length).toBeGreaterThanOrEqual(16);
    expect(FISHES.length).toBeGreaterThanOrEqual(50);
    expect(ZONES.length).toBeGreaterThanOrEqual(6);
  });

  it("ID là duy nhất", () => {
    for (const list of [CHARACTERS, RODS, FISHES, ZONES] as { id: string }[][]) {
      expect(new Set(list.map((x) => x.id)).size).toBe(list.length);
    }
  });

  it("có đủ 5 độ hiếm nhân vật và 7 độ hiếm cá", () => {
    expect(new Set(CHARACTERS.map((c) => c.rarity))).toEqual(new Set(["N", "R", "SR", "SSR", "UR", "LR"]));
    expect(new Set(FISHES.map((f) => f.rarity)).size).toBe(7);
  });

  it("mọi khu vực tham chiếu cá và boss hợp lệ, cá thuộc đúng khu", () => {
    for (const z of ZONES) {
      const boss = FISH_BY_ID.get(z.bossId);
      expect(boss?.rarity, z.id).toBe("boss");
      for (const s of z.spawn) {
        const f = FISH_BY_ID.get(s.fishId);
        expect(f, `${z.id}/${s.fishId}`).toBeDefined();
        expect(f!.zones, `${s.fishId} phải liệt kê ${z.id}`).toContain(z.id);
        expect(s.weight).toBeGreaterThan(0);
      }
    }
  });

  it("mọi cá đều xuất hiện ở ít nhất một khu", () => {
    const spawned = new Set(ZONES.flatMap((z) => [z.bossId, ...z.spawn.map((s) => s.fishId)]));
    for (const f of FISHES) expect(spawned.has(f.id), f.id).toBe(true);
  });

  it("chỉ số cá hợp lệ", () => {
    for (const f of FISHES) {
      expect(f.hp).toBeGreaterThan(0);
      expect(f.value).toBeGreaterThan(0);
      expect(f.weightKg[0]).toBeLessThan(f.weightKg[1]);
    }
  });

  it("mỗi nhân vật có kỹ năng chủ động và bị động có hiệu ứng", () => {
    for (const c of CHARACTERS) {
      expect(c.active.effects.length).toBeGreaterThan(0);
      expect(c.passive.effects.length).toBeGreaterThan(0);
      expect(c.active.cooldownMs).toBeGreaterThan(0);
    }
  });

  it("có nhân vật và cần câu khởi đầu", () => {
    expect(CHARACTERS.some((c) => c.unlock.kind === "starter")).toBe(true);
    expect(RODS.some((r) => r.unlock.kind === "starter")).toBe(true);
  });
});
