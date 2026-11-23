import { describe, expect, it } from "vitest";
import { DUAL_FORMS, FISH_BY_ID, HYBRID_SPECIES_ELEMENTS, dualFormsOf, speciesElements } from "@dccc/game-data";
import { Rng, applyDualForm, dualStoneCost, formSeen, fishStats, ownedFishPower, type PlayerSave } from "@dccc/shared";

const base = (evoItems: Record<string, number>, fishId: string) =>
  ({ appliedTx: [], evoItems, fishes: [{ uid: "a", fishId, level: 10, stars: 1, weightKg: 500, zoneId: "z_ben_tan_thu", caughtAt: 0 }], stats: { formsSeen: [] }, updatedAt: 0 }) as unknown as PlayerSave;

describe("Cá 2 hệ: hệ chính / hệ phụ & biến dị Song Hệ", () => {
  it("hệ đầu là HỆ CHÍNH của loài (mọi bậc lai)", () => {
    const dual = Object.entries(HYBRID_SPECIES_ELEMENTS).filter(([, e]) => e.length === 2);
    expect(dual.length).toBe(84);
    for (const [id, els] of dual) expect(FISH_BY_ID.get(id)!.element, id).toBe(els[0]);
  });
  it("mỗi cặp hệ có 4 dạng Song Hệ hiếm dần, giữ hệ chính, mạnh hơn cá gốc", () => {
    expect(DUAL_FORMS.length).toBe(84);
    const f = FISH_BY_ID.get("f_lai_metal_wood_4")!;
    const [a, b] = speciesElements(f) as ["metal", "wood"];
    const fs = dualFormsOf(a, b);
    expect(fs.map((x) => x.weight)).toEqual([45, 30, 18, 7]);
    expect(fs.map((x) => x.rank)).toEqual(["common", "rare", "epic", "legend"]);
    expect(fs.every((x) => x.element === "metal")).toBe(true);
    const p0 = ownedFishPower(f, { level: 10, stars: 1 });
    for (const x of fs) expect(ownedFishPower(f, { level: 10, stars: 1, formRoll: { hp: 0.8, atk: 0.8, def: 0.8 } }, x)).toBeGreaterThan(p0 * 1.15);
    expect(fishStats(f, 10, 1, fs[0]!, { hp: 1, atk: 1, def: 1 }).element).toBe("metal");
  });
  it("tốn 1 đá hệ chính + 1 đá hệ phụ (thiếu thì đá vạn năng, đá Thần sau cùng)", () => {
    expect(dualStoneCost({ e_sam_thach: 1, e_tinh_the_bang_ha: 1 }, "metal", "wood")).toEqual(["e_sam_thach", "e_tinh_the_bang_ha"]);
    expect(dualStoneCost({ e_sam_thach: 1, e_u_minh_thach: 1, e_long_phuong_than: 1 }, "metal", "wood")).toEqual(["e_sam_thach", "e_u_minh_thach"]);
    expect(dualStoneCost({ e_sam_thach: 1 }, "metal", "wood")).toBeNull();
    expect(dualStoneCost({ e_long_phuong_than: 2 }, "metal", "wood")).toEqual(["e_long_phuong_than", "e_long_phuong_than"]);
  });
  it("đột biến Song Hệ luôn thành công, trừ đúng đá, mở dạng trong Bộ Sưu Tập; chỉ 1 lần", () => {
    const fs = dualFormsOf("metal", "wood");
    const s0 = base({ e_sam_thach: 1, e_tinh_the_bang_ha: 1 }, "f_lai_metal_wood_1");
    const r = applyDualForm(s0, "a", ["metal", "wood"], fs, "t1", 1, FISH_BY_ID, new Rng(3));
    if (!r.ok) throw new Error(r.error);
    expect(fs.map((x) => x.id)).toContain(r.form!.id);
    expect(r.save.evoItems).toEqual({});
    expect(formSeen(r.save, "f_lai_metal_wood_1", r.form!.id)).toBe(true);
    expect(applyDualForm(r.save, "a", ["metal", "wood"], fs, "t2", 1, FISH_BY_ID, new Rng(3)).ok).toBe(false);
    expect(applyDualForm(base({}, "f_lai_metal_wood_1"), "a", ["metal", "wood"], fs, "t3", 1, FISH_BY_ID, new Rng(3)).ok).toBe(false);
  });
});

describe("Bản lưu có cá Song Hệ hợp lệ", () => {
  it("parseSave chấp nhận mã dạng Song Hệ", async () => {
    const { parseSave } = await import("@dccc/validation");
    const { CATALOG } = await import("@dccc/game-data");
    const { createNewSave } = await import("@dccc/shared");
    const s = createNewSave("p_test", "Test", CATALOG, 1);
    s.fishes.push({ uid: "x1", fishId: "f_lai_metal_wood_4", level: 5, stars: 1, weightKg: 900, zoneId: "z_ben_tan_thu", caughtAt: 1, locked: false, form: "sh_metal_wood_4", formRoll: { hp: 1, atk: 1, def: 1 } } as never);
    const r = parseSave(JSON.parse(JSON.stringify(s)));
    expect(r.ok ? "ok" : r.error).toBe("ok");
  });
});
