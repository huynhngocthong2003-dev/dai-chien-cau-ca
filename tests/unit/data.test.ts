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
    const spawned = new Set(ZONES.flatMap((z) => [z.bossId, ...(z.extraBosses ?? []), ...(z.secretBossId ? [z.secretBossId] : []), ...z.spawn.map((s) => s.fishId)]));
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
  it("Huyền Minh Long Ngư & Diễm Ma Thâm Hải: bậc Thần Thoại, chỉ ở Đại Dương Thần Thoại, cực khó gặp", async () => {
    const { FISH_BY_ID, ZONE_BY_ID } = await import("@dccc/game-data");
    const z = ZONE_BY_ID.get("z_dai_duong_than_thoai")!;
    const total = z.spawn.reduce((a, x) => a + x.weight, 0);
    for (const id of ["f_huyen_minh_long_ngu", "f_diem_ma_tham_hai", "f_tien_ngu_hong_ngoc"]) {
      const f = FISH_BY_ID.get(id)!;
      expect(f.rarity).toBe("mythic");
      const w = z.spawn.find((x) => x.fishId === id)!.weight;
      expect(w / total).toBeLessThan(0.001); // < 0,1% mỗi lần cá cắn (chưa tính may mắn)
      expect(w).toBeLessThan(z.spawn.find((x) => x.fishId === "f_thai_co_than_ngu")!.weight / 4);
    }
  });
});
