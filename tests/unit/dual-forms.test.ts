import { describe, expect, it } from "vitest";
import { EVO_ITEMS, FISH_BY_ID, FORMS_BY_ITEM, FORM_BY_ID, HYBRID_SPECIES_ELEMENTS, LEGACY_DUAL_FORMS, dualPairOf, formListForFish, formsForFish } from "@dccc/game-data";
import { Rng, applyForm, fishStats, formSeen, ownedFishPower, type PlayerSave } from "@dccc/shared";

const base = (evoItems: Record<string, number>, fishId: string) =>
  ({ appliedTx: [], evoItems, fishes: [{ uid: "a", fishId, level: 10, stars: 1, weightKg: 500, zoneId: "z_ben_tan_thu", caughtAt: 0, locked: false }], stats: { formsSeen: [] }, updatedAt: 0 }) as unknown as PlayerSave;
const STONES = EVO_ITEMS.filter((it) => (FORMS_BY_ITEM.get(it.id) ?? []).length > 0);

describe("Cá 2 hệ: hệ chính / hệ phụ", () => {
  it("hệ đầu là HỆ CHÍNH của loài (mọi bậc lai)", () => {
    const dual = Object.entries(HYBRID_SPECIES_ELEMENTS).filter(([, e]) => e.length === 2);
    expect(dual.length).toBe(84);
    for (const [id, els] of dual) expect(FISH_BY_ID.get(id)!.element, id).toBe(els[0]);
  });
});

describe("Biến dị cá song hệ theo TỪNG viên Đá Tiến Hoá", () => {
  it("vẫn dùng 5 loại đá; mỗi viên ra bộ dạng song hệ riêng của cặp hệ (cùng số dạng, cấp bậc, tỉ lệ như dạng gốc)", () => {
    expect(STONES.length).toBe(5);
    const id = "f_lai_metal_wood_4";
    expect(dualPairOf(id)).toEqual(["metal", "wood"]);
    for (const st of STONES) {
      const single = FORMS_BY_ITEM.get(st.id)!;
      const dual = formsForFish(id, st.id);
      expect(dual.length, st.id).toBe(single.length);
      expect(dual.map((f) => f.weight)).toEqual(single.map((f) => f.weight));
      expect(dual.map((f) => f.rank)).toEqual(single.map((f) => f.rank));
      expect(dual.every((f) => f.pair === "metal_wood" && f.itemId === st.id && f.element === "metal")).toBe(true);
      // mạnh hơn dạng 1 hệ ~10%
      dual.forEach((f, k) => expect(f.mult.atk).toBeGreaterThan(single[k]!.mult.atk));
    }
    // cá 1 hệ vẫn ra dạng gốc
    expect(formsForFish("f_boss_lao_ngu", STONES[0]!.id)).toEqual(FORMS_BY_ITEM.get(STONES[0]!.id));
    expect(formListForFish("f_lai_fire_dark_2").every((f) => f.pair === "fire_dark")).toBe(true);
  });
  it("đột biến cá song hệ bằng 1 viên đá: luôn thành công, ra dạng song hệ của viên đó, trừ đúng 1 viên", () => {
    const id = "f_lai_metal_wood_1";
    const lava = STONES.find((s) => s.id === "e_loi_dung_nham")!;
    const s0 = base({ e_loi_dung_nham: 1 }, id);
    const r = applyForm(s0, "a", lava, formListForFish(id), "t1", 1, FISH_BY_ID, new Rng(3));
    if (!r.ok) throw new Error(r.error);
    expect(r.form!.pair).toBe("metal_wood");
    expect(r.form!.itemId).toBe("e_loi_dung_nham");
    expect(r.save.evoItems).toEqual({});
    expect(formSeen(r.save, id, r.form!.id)).toBe(true);
    const f = FISH_BY_ID.get(id)!;
    expect(fishStats(f, 10, 1, r.form!, { hp: 1, atk: 1, def: 1 }).element).toBe("metal");
    expect(ownedFishPower(f, { level: 10, stars: 1, form: r.form!.id, formRoll: { hp: 0.8, atk: 0.8, def: 0.8 } }, r.form!)).toBeGreaterThan(ownedFishPower(f, { level: 10, stars: 1 }) * 1.15);
  });
  it("dạng song hệ cũ (bản 0.53) vẫn tra được – cá đã mang dạng cũ không mất dạng", () => {
    expect(LEGACY_DUAL_FORMS.length).toBe(84);
    expect(FORM_BY_ID.get("sh_metal_wood_4")?.name).toBeTruthy();
  });
  it("bản lưu có cá mang dạng song hệ hợp lệ", async () => {
    const { parseSave } = await import("@dccc/validation");
    const { CATALOG } = await import("@dccc/game-data");
    const { createNewSave } = await import("@dccc/shared");
    const s = createNewSave("p_test", "Test", CATALOG, 1);
    const formId = formsForFish("f_lai_metal_wood_4", "e_long_phuong_than")[3]!.id;
    expect(formId.length).toBeLessThanOrEqual(64);
    s.fishes.push({ uid: "x1", fishId: "f_lai_metal_wood_4", level: 5, stars: 1, weightKg: 900, zoneId: "z_ben_tan_thu", caughtAt: 1, locked: false, form: formId, formRoll: { hp: 1, atk: 1, def: 1 } } as never);
    const r = parseSave(JSON.parse(JSON.stringify(s)));
    expect(r.ok ? "ok" : r.error).toBe("ok");
  });
});
