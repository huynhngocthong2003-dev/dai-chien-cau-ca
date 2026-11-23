import { describe, expect, it } from "vitest";
import { ELEMENT_IDS, applyCatch, assignMissingElements, createNewSave, elementMatchup, elementOfCatch, ownedElement, type Element } from "@dccc/shared";
import { CATALOG, FISHES, FISH_BY_ID, ZONES, ZONE_BY_ID } from "@dccc/game-data";
import { ELEMENT_INFO } from "@dccc/game-config";

describe("7 nguyên tố & khắc chế", () => {
  const strong: [Element, Element][] = [
    ["metal", "wood"],
    ["wood", "earth"],
    ["earth", "water"],
    ["water", "fire"],
    ["fire", "metal"],
    ["dark", "light"],
    ["light", "dark"],
    // Bóng tối & Ánh sáng áp chế 5 hệ tự nhiên
    ...(["metal", "wood", "water", "fire", "earth"] as Element[]).flatMap((n): [Element, Element][] => [["dark", n], ["light", n]]),
  ];
  it("đủ 7 hệ, mỗi hệ có tên + màu hiển thị", () => {
    expect(ELEMENT_IDS).toHaveLength(7);
    expect(ELEMENT_IDS.map((e) => ELEMENT_INFO[e].name)).toEqual(["Kim", "Mộc", "Thủy", "Hỏa", "Thổ", "Bóng Tối", "Ánh Sáng"]);
  });
  it("bảng 7×7: khắc chế ×1.5, bị khắc ×0.75, còn lại ×1.0", () => {
    for (const a of ELEMENT_IDS)
      for (const d of ELEMENT_IDS) {
        const m = elementMatchup(a, d);
        const isStrong = strong.some(([x, y]) => x === a && y === d);
        const isWeak = strong.some(([x, y]) => x === d && y === a) && !isStrong;
        expect(m.mult).toBe(isStrong ? 1.5 : isWeak ? 0.75 : 1);
        expect(m.label).toBe(isStrong ? "KHẮC CHẾ!" : isWeak ? "BẤT LỢI!" : "BÌNH THƯỜNG.");
      }
    // ví dụ cụ thể
    expect(elementMatchup("metal", "wood").mult).toBe(1.5);
    expect(elementMatchup("wood", "metal").mult).toBe(0.75);
    expect(elementMatchup("water", "water").mult).toBe(1);
    expect(elementMatchup("dark", "light").mult).toBe(1.5);
    expect(elementMatchup("light", "dark").mult).toBe(1.5);
    // áp chế hệ tự nhiên: Bóng tối / Ánh sáng đánh ×1.5, bị hệ tự nhiên đánh ×0.75
    for (const n of ["metal", "wood", "water", "fire", "earth"] as const) {
      expect(elementMatchup("dark", n).mult).toBe(1.5);
      expect(elementMatchup("light", n).mult).toBe(1.5);
      expect(elementMatchup(n, "dark").mult).toBe(0.75);
      expect(elementMatchup(n, "light").mult).toBe(0.75);
    }
  });
});

describe("Gán nguyên tố cho cá", () => {
  it("7 khu, mỗi khu 1 hệ khác nhau, đúng ánh xạ chương", () => {
    const m = Object.fromEntries(ZONES.map((z) => [z.id, z.element]));
    expect(m).toEqual({
      z_ben_tan_thu: "earth",
      z_bien_nhiet_doi: "wood",
      z_vuong_quoc_kim_loai: "metal",
      z_bien_lua: "fire",
      z_bang_gia: "water",
      z_vuc_sau: "dark",
      z_dai_duong_than_thoai: "light",
    });
  });
  it("mọi loài có đúng 1 hệ hợp lệ; hệ loài = hệ khu đầu tiên (trừ loài cố định)", () => {
    for (const f of FISHES) {
      expect(ELEMENT_IDS).toContain(f.element);
      if (!f.elementFixed) expect(f.element).toBe(ZONE_BY_ID.get(f.zones[0]!)!.element);
    }
    expect(FISH_BY_ID.get("f_huyen_minh_long_ngu")!.element).toBe("dark"); // Vực Sâu Bí Ẩn
    expect(FISHES.filter((f) => f.zones.includes("z_vuong_quoc_kim_loai")).every((f) => f.element === "metal")).toBe(true);
  });
  it("cá câu được mang hệ của KHU NƠI CÂU; loài sống nhiều khu chỉ có 1 hệ (khu chính)", () => {
    const save = createNewSave("p", "A", CATALOG, 1);
    const ro = FISH_BY_ID.get("f_ca_ro")!; // chỉ sống ở Bến Tân Thủ
    const r = applyCatch(save, { txId: "c1", fish: ro, weightKg: 1, zoneId: "z_ben_tan_thu", zoneElement: "earth", passives: [], now: 1 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.save.fishes[0]!.element).toBe("earth");
    // Hỏa Long Ngư sống ở Biển Lửa + Đại Dương Thần Thoại → luôn hệ Hỏa
    const hl = FISH_BY_ID.get("f_hoa_long_ngu")!;
    expect(hl.zones.length).toBeGreaterThan(1);
    expect(hl.element).toBe("fire");
    expect(elementOfCatch(hl, "light")).toBe("fire");
    expect(ownedElement({ zoneId: "z_dai_duong_than_thoai", element: "light" }, hl, ZONE_BY_ID)).toBe("fire");
    for (const f of FISHES.filter((x) => x.zones.length > 1)) expect(f.elementFixed).toBe(true);
    // loài hệ cố định giữ hệ dù câu ở khu khác
    expect(elementOfCatch(FISH_BY_ID.get("f_diem_ma_tham_hai")!, "light")).toBe("fire");
  });
  it("bản lưu cũ: gán hệ theo khu câu, không đổi cá đã có hệ", () => {
    const save = createNewSave("p", "A", CATALOG, 1);
    save.fishes = [
      { uid: "a", fishId: "f_ca_ro", weightKg: 1, zoneId: "z_bien_lua", caughtAt: 1, level: 1, stars: 1, locked: false },
      { uid: "b", fishId: "f_ca_ro", element: "metal", weightKg: 1, zoneId: "z_ben_tan_thu", caughtAt: 1, level: 1, stars: 1, locked: false },
    ];
    expect(assignMissingElements(save, FISH_BY_ID, ZONE_BY_ID)).toBe(1);
    expect(save.fishes[0]!.element).toBe("fire");
    expect(save.fishes[1]!.element).toBe("metal");
    expect(ownedElement({ zoneId: "z_bang_gia" }, FISH_BY_ID.get("f_ca_ro")!, ZONE_BY_ID)).toBe("water");
    // cá loài nhiều khu bị ghi sai hệ → sửa về hệ loài
    save.fishes.push({ uid: "c", fishId: "f_hoa_long_ngu", element: "light", weightKg: 1, zoneId: "z_dai_duong_than_thoai", caughtAt: 1, level: 1, stars: 1, locked: false });
    expect(assignMissingElements(save, FISH_BY_ID, ZONE_BY_ID)).toBe(1);
    expect(save.fishes[2]!.element).toBe("fire");
  });
});
