import { describe, expect, it } from "vitest";
import { BREEDING_RECIPES, BREED_LOOKS, CATALOG, FISH_BY_ID, breedTierOf } from "@dccc/game-data";
import {
  BREED_TIERS,
  HARVEST_CYCLE_MS,
  breedingOf,
  collectHabitat,
  createNewSave,
  hatchEgg,
  isBreedable,
  recipeFor,
  rollHatch,
  speedupCost,
  speedupEgg,
  startBreeding,
  unlockHatchSlot,
  type OwnedFish,
} from "@dccc/shared";

const GENDER: Record<string, "m" | "f"> = { lao: "m", bao: "f", kra: "m", phu: "f", hac: "f", ro: "m" };
const o = (uid: string, fishId: string): OwnedFish => ({ uid, fishId, weightKg: 100, zoneId: "z_ben_tan_thu", caughtAt: 1, level: 10, stars: 1, locked: false, gender: GENDER[uid] });
const mkSave = () => {
  const s = createNewSave("p", "A", CATALOG, 1);
  s.fishes = [o("lao", "f_boss_lao_ngu"), o("bao", "f_boss_bao_chua_san_ho"), o("kra", "f_boss_thuy_quai_kraken"), o("phu", "f_phuong_hoang_bien"), o("ro", "f_ca_ro")];
  s.diamonds = 100;
  s.gold = 5000;
  return s;
};

describe("Đảo Lai Tạo – dữ liệu", () => {
  it("mỗi công thức: tổng tỷ lệ 100, bố mẹ là cá Boss trở lên, cá con có hình + bậc đúng thứ tự 58/30/10/2", () => {
    for (const r of BREEDING_RECIPES) {
      expect(r.results.reduce((a, x) => a + x.pct, 0)).toBe(100);
      for (const p of r.parents ?? []) expect(isBreedable(FISH_BY_ID.get(p)), p).toBe(true);
      expect(!!r.parents !== !!r.elements, r.id).toBe(true);
      expect(r.results.map((x) => breedTierOf(x.fish))).toEqual(["hybrid", "super", "mythic", "recessive"]);
      for (const x of r.results) {
        expect(FISH_BY_ID.get(x.fish), x.fish).toBeTruthy();
        expect(BREED_LOOKS[x.fish], x.fish).toBeTruthy();
        expect(FISH_BY_ID.get(x.fish)!.elementFixed).toBe(true);
      }
    }
    expect(BREED_TIERS.recessive.scale).toBe(1.4);
  });
  it("mọi cặp cá từ Boss trở lên đều lai được; 28 dòng theo hệ × 4 bậc, mỗi dạng một hình riêng", () => {
    const bosses = [...FISH_BY_ID.values()].filter((f) => isBreedable(f));
    for (const a of bosses) for (const b of bosses) expect(recipeFor(a.id, b.id, BREEDING_RECIPES, FISH_BY_ID), `${a.id}+${b.id}`).toBeTruthy();
    expect(BREEDING_RECIPES.filter((r) => r.elements)).toHaveLength(28);
    const sigs = new Set(Object.values(BREED_LOOKS).map((l) => JSON.stringify(l)));
    expect(sigs.size).toBe(Object.keys(BREED_LOOKS).length);
    // công thức riêng được ưu tiên hơn dòng theo hệ
    expect(recipeFor("f_boss_lao_ngu", "f_boss_bao_chua_san_ho", BREEDING_RECIPES, FISH_BY_ID)?.id).toBe("thiet_san_ho");
    expect(recipeFor("f_boss_lao_ngu", "f_boss_hac_long", BREEDING_RECIPES, FISH_BY_ID)?.elements?.sort()).toEqual(["dark", "earth"]);
  });
  it("quay tỷ lệ đúng (~58/30/10/2 trên 20.000 trứng) và tất định theo seed", () => {
    const r = BREEDING_RECIPES[0]!;
    const n: Record<string, number> = {};
    for (let i = 0; i < 20000; i++) {
      const f = rollHatch(r, i * 2654435761);
      n[f] = (n[f] ?? 0) + 1;
    }
    r.results.forEach((x) => expect(Math.abs((n[x.fish] ?? 0) / 200 - x.pct)).toBeLessThan(1.5));
    expect(rollHatch(r, 12345)).toBe(rollHatch(r, 12345));
  });
});

describe("Đảo Lai Tạo – luồng chơi", () => {
  it("lai: cần 2 cá khác nhau, Boss trở lên, đúng công thức; bố mẹ KHÔNG mất; trứng vào ổ 1", () => {
    const s = mkSave();
    expect(startBreeding(s, { txId: "e1", parentUids: ["lao", "lao"], now: 0, seed: 1 }, BREEDING_RECIPES, FISH_BY_ID).ok).toBe(false);
    expect(startBreeding(s, { txId: "e1", parentUids: ["lao", "ro"], now: 0, seed: 1 }, BREEDING_RECIPES, FISH_BY_ID).ok).toBe(false);
    // cùng giới tính (2 con cái) → không lai được
    const same = startBreeding(s, { txId: "e1", parentUids: ["bao", "phu"], now: 0, seed: 1 }, BREEDING_RECIPES, FISH_BY_ID);
    expect(!same.ok && same.error).toMatch(/đực/);
    const r = startBreeding(s, { txId: "e1", parentUids: ["bao", "lao"], now: 1000, seed: 7 }, BREEDING_RECIPES, FISH_BY_ID);
    if (!r.ok) throw new Error(r.error);
    expect(r.slot).toBe(0);
    // chọn mẹ trước vẫn đúng: bố = con đực
    expect(r.egg.parents).toEqual(["lao", "bao"]);
    expect(r.egg.parentSpecies).toEqual(["f_boss_lao_ngu", "f_boss_bao_chua_san_ho"]);
    expect(r.egg.end - r.egg.start).toBe(30 * 60_000);
    expect(r.save.fishes).toHaveLength(5);
    // ổ 2, 3 còn khoá → hang đầy
    const r2 = startBreeding(r.save, { txId: "e2", parentUids: ["kra", "phu"], now: 1000, seed: 8 }, BREEDING_RECIPES, FISH_BY_ID);
    expect(!r2.ok && r2.error).toMatch(/đầy/);
    expect(recipeFor("f_phuong_hoang_bien", "f_boss_thuy_quai_kraken", BREEDING_RECIPES)?.hatchMinutes).toBe(45);
  });
  it("mở ổ (vàng / kim cương, ghi sổ) → lai được trứng thứ 2", () => {
    let s = mkSave();
    const a = unlockHatchSlot(s, { txId: "u1", slot: 1, now: 1 });
    if (!a.ok) throw new Error(a.error);
    expect(a.save.gold).toBe(3000);
    const b = unlockHatchSlot(a.save, { txId: "u2", slot: 2, now: 1 });
    if (!b.ok) throw new Error(b.error);
    expect(b.save.diamonds).toBe(40);
    expect(b.save.ledger.filter((l) => l.txId === "u1" || l.txId === "u2")).toHaveLength(2);
    s = b.save;
    for (const [i, p] of [["e1", ["lao", "bao"]], ["e2", ["kra", "phu"]]] as const) {
      const r = startBreeding(s, { txId: i, parentUids: [...p] as [string, string], now: 0, seed: 3 }, BREEDING_RECIPES, FISH_BY_ID);
      if (!r.ok) throw new Error(r.error);
      s = r.save;
    }
    expect(breedingOf(s).slots.filter((x) => x.egg)).toHaveLength(2);
  });
  it("chưa hết giờ không nở; tăng tốc trả kim cương theo phút còn lại; nở ra cá con đúng kết quả seed", () => {
    const r = startBreeding(mkSave(), { txId: "e1", parentUids: ["lao", "bao"], now: 0, seed: 99 }, BREEDING_RECIPES, FISH_BY_ID);
    if (!r.ok) throw new Error(r.error);
    expect(hatchEgg(r.save, { slot: 0, now: 60_000 }, BREEDING_RECIPES, FISH_BY_ID).ok).toBe(false);
    expect(speedupCost(r.egg, 60_000)).toBe(10); // còn 29 phút → 10 kim cương
    const sp = speedupEgg(r.save, { txId: "sp1", slot: 0, now: 60_000 });
    if (!sp.ok) throw new Error(sp.error);
    expect(sp.save.diamonds).toBe(90);
    const h = hatchEgg(sp.save, { slot: 0, now: 60_001 }, BREEDING_RECIPES, FISH_BY_ID);
    if (!h.ok) throw new Error(h.error);
    expect(h.fish.fishId).toBe(rollHatch(BREEDING_RECIPES[0]!, 99));
    expect(h.save.fishes).toHaveLength(6);
    expect(h.fish.parents).toEqual(["f_boss_lao_ngu", "f_boss_bao_chua_san_ho"]);
    expect(["m", "f"]).toContain(h.fish.gender);
    expect(breedingOf(h.save).slots[0]!.egg).toBeNull();
    // nở 2 lần không được
    expect(hatchEgg(h.save, { slot: 0, now: 70_000 }, BREEDING_RECIPES, FISH_BY_ID).ok).toBe(false);
  });
  it("bể nuôi: chỉ cá Boss trở lên; đủ chu kỳ mới thu vàng (theo bậc), thu xong bắt đầu chu kỳ mới", () => {
    let s = mkSave();
    const first = collectHabitat(s, { txId: "h0", now: 0 }, FISH_BY_ID, breedTierOf);
    if (!first.ok) throw new Error(first.error);
    expect(first.gold).toBe(0); // vừa vào bể → bắt đầu đếm
    expect(Object.keys(breedingOf(first.save).harvestAt).sort()).toEqual(["bao", "kra", "lao", "phu"]);
    s = first.save;
    const early = collectHabitat(s, { txId: "h1", now: HARVEST_CYCLE_MS - 1 }, FISH_BY_ID, breedTierOf);
    expect(early.ok && early.gold).toBe(0);
    const ok = collectHabitat(s, { txId: "h2", now: HARVEST_CYCLE_MS }, FISH_BY_ID, breedTierOf);
    if (!ok.ok) throw new Error(ok.error);
    expect(ok.gold).toBe(4 * BREED_TIERS.boss.yieldGold);
    expect(ok.save.gold - s.gold).toBe(160);
    const again = collectHabitat(ok.save, { txId: "h3", now: HARVEST_CYCLE_MS + 10 }, FISH_BY_ID, breedTierOf);
    expect(again.ok && again.gold).toBe(0);
  });
});

import { ELEMENT_IDS, allElements, multiMatchup, rollHatch as roll2 } from "@dccc/shared";

describe("Đảo Lai Tạo – hệ của cá lai", () => {
  it("cá lai mang 2 hệ của bố mẹ; Gen Lặn thêm 1 hệ ẩn khác 2 hệ đó", () => {
    const r0 = BREEDING_RECIPES.find((r) => r.id === "thiet_san_ho")!;
    // tìm seed cho ra Boss Lai và seed cho ra Gen Lặn
    const seedFor = (k: number) => {
      for (let s = 1; s < 200000; s++) if (roll2(r0, s) === r0.results[k]!.fish) return s;
      throw new Error("không tìm được seed");
    };
    for (const [k, hiddenExpected] of [[0, false], [3, true]] as const) {
      const st = startBreeding(mkSave(), { txId: "e" + k, parentUids: ["lao", "bao"], now: 0, seed: seedFor(k) }, BREEDING_RECIPES, FISH_BY_ID);
      if (!st.ok) throw new Error(st.error);
      const h = hatchEgg(st.save, { slot: 0, now: 31 * 60_000 }, BREEDING_RECIPES, FISH_BY_ID);
      if (!h.ok) throw new Error(h.error);
      const els = [FISH_BY_ID.get("f_boss_lao_ngu")!.element, FISH_BY_ID.get("f_boss_bao_chua_san_ho")!.element];
      expect(h.fish.elements).toEqual(els);
      expect(!!h.fish.hiddenElement).toBe(hiddenExpected);
      if (h.fish.hiddenElement) {
        expect(els.includes(h.fish.hiddenElement)).toBe(false);
        expect(ELEMENT_IDS.includes(h.fish.hiddenElement)).toBe(true);
      }
    }
  });
  it("khắc hệ nhiều hệ: chọn hệ đánh có lợi nhất, nhân qua mọi hệ phòng thủ, giới hạn ×0.75–×1.5", () => {
    expect(multiMatchup(["metal"], ["wood"]).mult).toBe(1.5);
    expect(multiMatchup(["wood", "metal"], ["wood"]).mult).toBe(1.5); // dùng hệ Kim
    expect(multiMatchup(["metal"], ["wood", "fire"]).mult).toBe(1.125); // khắc Mộc ×1.5 nhưng bị Hỏa khắc ×0.75
    expect(multiMatchup(["water"], ["metal", "fire"]).mult).toBe(1.5); // không vượt trần
    expect(multiMatchup(["water"], ["fire", "earth"]).mult).toBe(1.125);
    expect(multiMatchup(["wood"], ["water", "light"]).kind).toBe("weak"); // Ánh sáng áp chế hệ tự nhiên
    expect(multiMatchup(["wood", "dark"], ["water", "light"]).mult).toBe(1.5); // hệ Bóng tối: áp chế Thủy & khắc Ánh sáng (trần ×1.5)
    expect(allElements({ element: "fire", elements: ["fire", "water"], hidden: "dark" })).toEqual(["fire", "water", "dark"]);
  });
});
