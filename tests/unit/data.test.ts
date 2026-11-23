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

  it("mọi cá đều câu được ở ít nhất một khu hoặc nở được từ Đảo Lai Tạo", async () => {
    const { BREEDING_RECIPES } = await import("@dccc/game-data");
    const spawned = new Set(ZONES.flatMap((z) => [z.bossId, ...(z.extraBosses ?? []), ...(z.secretBossId ? [z.secretBossId] : []), ...z.spawn.map((s) => s.fishId)]));
    for (const r of BREEDING_RECIPES) for (const x of r.results) spawned.add(x.fish);
    for (const f of FISHES) expect(spawned.has(f.id), f.id).toBe(true);
  });

  it("mỗi khu có 1 Boss phụ siêu hiếm (tí hon hoặc khổng lồ), tỉ lệ cực thấp", async () => {
    const { chooseFish, buildLoadout, createNewSave, Rng, canEvolveForm } = await import("@dccc/shared");
    const { CATALOG, CHARACTER_BY_ID, ROD_BY_ID } = await import("@dccc/game-data");
    for (const z of ZONES) {
      const sb = FISH_BY_ID.get(z.secretBossId!)!;
      expect(sb.rarity).toBe("boss");
      expect(sb.appearance.scale <= 0.6 || sb.appearance.scale >= 2.5).toBe(true);
      expect(canEvolveForm(sb)).toBe(true);
    }
    const save = createNewSave("p", "T", CATALOG, Date.now());
    const lo = buildLoadout(CHARACTER_BY_ID.get(save.selectedCharacterId)!, save.characters[save.selectedCharacterId]!, ROD_BY_ID.get(save.selectedRodId)!, save.rods[save.selectedRodId]!);
    const z = ZONES[0]!;
    const rng = new Rng(77);
    let hit = 0;
    const N = 200000;
    for (let i = 0; i < N; i++) if (chooseFish(z, FISH_BY_ID, lo, 0.5, rng).id === z.secretBossId) hit++;
    // ~0,06% mỗi lần quăng (hiếm hơn Boss thường 0,2%)
    expect(hit / N).toBeGreaterThan(0.0003);
    expect(hit / N).toBeLessThan(0.0015);
    expect(canEvolveForm(FISHES.find((f) => f.rarity === "legendary"))).toBe(true);
    expect(canEvolveForm(FISHES.find((f) => f.rarity === "common"))).toBe(false);
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

describe("Thần ngư cực hiếm mới", () => {
  it("Thần Thoại: mỗi khu 1 loài, cực khó gặp (< 0,6% mỗi lần cá cắn)", async () => {
    const { FISH_BY_ID, ZONES } = await import("@dccc/game-data");
    for (const z of ZONES) {
      const total = z.spawn.reduce((a, x) => a + x.weight, 0);
      for (const x of z.spawn.filter((s) => FISH_BY_ID.get(s.fishId)!.rarity === "mythic")) expect(x.weight / total, z.id).toBeLessThan(0.006);
    }
  });
});

describe("Thần Thoại theo khu", () => {
  it("khu nào cũng có đúng 1 loài Thần Thoại, cùng hệ với khu", async () => {
    const { ZONES: Z, FISH_BY_ID: F } = await import("@dccc/game-data");
    for (const z of Z) {
      const mythics = z.spawn.map((s) => F.get(s.fishId)!).filter((f) => f.rarity === "mythic");
      expect(mythics.length, z.id).toBe(1);
      expect(mythics[0]!.element, z.id).toBe(z.element);
      expect(mythics[0]!.elementFixed, z.id).toBe(true);
    }
  });
});
