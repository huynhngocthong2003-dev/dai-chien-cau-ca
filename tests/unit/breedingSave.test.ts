import { describe, expect, it } from "vitest";
import { BREEDING_RECIPES, CATALOG, FISH_BY_ID, breedTierOf } from "@dccc/game-data";
import { collectHabitat, createNewSave, hatchEgg, speedupEgg, startBreeding, unlockHatchSlot, type OwnedFish } from "@dccc/shared";
import { parseSave } from "@dccc/validation";

describe("Bản lưu có dữ liệu Đảo Lai Tạo vẫn hợp lệ với máy chủ (parseSave)", () => {
  it("sau lai / tăng tốc / nở / thu hoạch: parseSave OK và giữ nguyên trứng, 2 hệ, hệ ẩn", () => {
    const o = (uid: string, fishId: string, zoneId: string): OwnedFish => ({ uid, fishId, weightKg: 100, zoneId, caughtAt: 1, level: 10, stars: 1, locked: false, gender: uid === "lao" ? "m" : "f" });
    let s = createNewSave("p", "A", CATALOG, 1);
    s.fishes = [o("lao", "f_boss_lao_ngu", "z_ben_tan_thu"), o("bao", "f_boss_bao_chua_san_ho", "z_bien_nhiet_doi"), o("hac", "f_boss_hac_long", "z_vuc_sau")];
    s.diamonds = 500;
    s.gold = 9000;
    const step = <T extends { ok: boolean }>(r: T) => {
      if (!r.ok) throw new Error((r as unknown as { error: string }).error);
      return r as T & { save: typeof s };
    };
    s = step(unlockHatchSlot(s, { txId: "u1", slot: 1, now: 1 })).save;
    s = step(startBreeding(s, { txId: "egg_a1", parentUids: ["lao", "bao"], now: 10, seed: 4242 }, BREEDING_RECIPES, FISH_BY_ID)).save;
    s = step(startBreeding(s, { txId: "egg_a2", parentUids: ["lao", "hac"], now: 10, seed: 777 }, BREEDING_RECIPES, FISH_BY_ID)).save;
    s = step(speedupEgg(s, { txId: "sp1", slot: 0, now: 20 })).save;
    s = step(hatchEgg(s, { slot: 0, now: 21 }, BREEDING_RECIPES, FISH_BY_ID)).save;
    s = step(collectHabitat(s, { txId: "hv1", now: 22 }, FISH_BY_ID, breedTierOf)).save;
    // cá Gen Lặn có hệ ẩn
    s.fishes[s.fishes.length - 1]!.hiddenElement = "light";
    const p = parseSave(JSON.parse(JSON.stringify(s)));
    if (!p.ok) throw new Error(p.error);
    expect(p.save.breeding?.slots[1]?.egg?.colors).toBeTruthy();
    expect(p.save.fishes.at(-1)?.elements).toHaveLength(2);
    expect(p.save.fishes.at(-1)?.hiddenElement).toBe("light");
  });
});
