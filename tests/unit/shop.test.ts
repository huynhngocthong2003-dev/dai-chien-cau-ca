import { describe, expect, it } from "vitest";
import {
  DIAMOND_REWARDS,
  applyCatch,
  buildLoadout,
  buyCosmetic,
  buyShopItem,
  createNewSave,
  equipCosmetic,
  equipmentPassives,
  freeCopies,
  sellCosmetic,
  unlockItem,
  type PlayerSave,
} from "@dccc/shared";
import { CATALOG, CHARACTERS, CHARACTER_BY_ID, COSMETICS, COSMETIC_BY_ID, FISH_BY_ID, ROD_BY_ID, SHOP_ITEM_BY_ID } from "@dccc/game-data";
import { parseSave } from "@dccc/validation";
import { TIER_BONUS_CAP } from "@dccc/game-config";

const rich = (): PlayerSave => ({ ...createNewSave("p", "A", CATALOG, 1), gold: 1_000_000, diamonds: 10_000 });
let n = 0;
const tx = () => `s_${++n}`;
const ok = <T extends { ok: boolean }>(r: T) => {
  if (!r.ok) throw new Error((r as unknown as { error: string }).error);
  return (r as unknown as { save: PlayerSave }).save;
};

describe("Dữ liệu thú cưng & trang phục", () => {
  it("12 nhân vật đều là thú, có ít nhất 8 loài khác nhau", () => {
    expect(CHARACTERS.every((c) => !!c.appearance.species)).toBe(true);
    expect(new Set(CHARACTERS.map((c) => c.appearance.species)).size).toBeGreaterThanOrEqual(8);
  });
  it("có đủ 6 ô trang bị (cả Skin), ID duy nhất, chỉ số phụ không vượt trần theo bậc", () => {
    expect(new Set(COSMETICS.map((c) => c.slot))).toEqual(new Set(["hat", "outfit", "accessory", "wings", "horns", "skin"]));
    expect(COSMETICS.filter((c) => c.slot === "skin")).toHaveLength(24);
    expect(new Set(COSMETICS.map((c) => c.id)).size).toBe(COSMETICS.length);
    for (const c of COSMETICS)
      for (const b of c.bonus) if ("value" in b && b.kind !== "luck_bonus" && b.kind !== "snap_threshold") expect(b.value, c.id).toBeLessThanOrEqual(TIER_BONUS_CAP[c.tier]);
  });
  it("đủ 4 bậc cao: Hiếm, Cực Phẩm, Huyền Thoại, Thần Phẩm; bậc cao có nhiều chỉ số hơn và đắt hơn", () => {
    for (const t of ["rare", "superior", "legendary", "divine"] as const) expect(COSMETICS.some((c) => c.tier === t), t).toBe(true);
    const avg = (t: string) => {
      const l = COSMETICS.filter((c) => c.tier === t);
      return l.reduce((s, c) => s + c.bonus.length, 0) / l.length;
    };
    expect(avg("divine")).toBeGreaterThan(avg("rare"));
    const minDivine = Math.min(...COSMETICS.filter((c) => c.tier === "divine" && c.price.currency === "diamonds").map((c) => c.price.amount));
    const maxRare = Math.max(...COSMETICS.filter((c) => c.tier === "rare" && c.price.currency === "diamonds").map((c) => c.price.amount), 0);
    expect(minDivine).toBeGreaterThan(maxRare);
  });
});

describe("Cửa hàng", () => {
  it("mua đồ trừ đúng tiền, ghi sổ, chống trùng", () => {
    const s = rich();
    const hat = COSMETIC_BY_ID.get("h_vuong_mien")!;
    const r = buyCosmetic(s, hat, "b1", 2);
    const s2 = ok(r);
    expect(s2.diamonds).toBe(s.diamonds - hat.price.amount);
    expect(s2.wardrobe[hat.id]).toBe(1);
    expect(s2.ledger.some((l) => l.txId === "b1" && l.currency === "diamonds")).toBe(true);
    expect(buyCosmetic(s2, hat, "b1", 3).ok).toBe(false);
  });
  it("thiếu tiền thì từ chối", () => {
    const s = createNewSave("p", "A", CATALOG, 1);
    expect(buyCosmetic(s, COSMETIC_BY_ID.get("a_day_chuyen_long_ngoc")!, tx(), 1).ok).toBe(false);
  });
  it("mua vật phẩm cộng nguyên liệu", () => {
    const s = ok(buyShopItem(rich(), SHOP_ITEM_BY_ID.get("s_da_10")!, tx(), 1));
    expect(s.materials.stones).toBe(10);
    const s2 = ok(buyShopItem(s, SHOP_ITEM_BY_ID.get("s_ve_boss")!, tx(), 1));
    expect(s2.materials.bossTickets).toBe(4);
  });
  it("bán lại được 50%, không bán được món đang mặc", () => {
    const hat = COSMETIC_BY_ID.get("h_non_la")!;
    let s = ok(buyCosmetic(rich(), hat, tx(), 1));
    s = ok(equipCosmetic(s, "c_be_tom", "hat", hat, 1));
    expect(sellCosmetic(s, hat, tx(), 1).ok).toBe(false);
    s = ok(equipCosmetic(s, "c_be_tom", "hat", null, 1));
    const gold = s.gold;
    const r = sellCosmetic(s, hat, tx(), 1);
    const s2 = ok(r);
    expect(s2.gold).toBe(gold + hat.price.amount / 2);
    expect(s2.wardrobe[hat.id]).toBeUndefined();
  });
});

describe("Tủ đồ", () => {
  it("một món chỉ mặc cho một nhân vật; mua 2 món thì mặc cho 2 nhân vật", () => {
    const sc = COSMETIC_BY_ID.get("a_khan_quang")!;
    let s = ok(buyCosmetic(rich(), sc, tx(), 1));
    s = ok(equipCosmetic(s, "c_be_tom", "accessory", sc, 1));
    expect(equipCosmetic(s, "c_ong_lao", "accessory", sc, 1).ok).toBe(false);
    s = ok(buyCosmetic(s, sc, tx(), 1));
    s = ok(equipCosmetic(s, "c_ong_lao", "accessory", sc, 1));
    expect(freeCopies(s, sc.id)).toBe(0);
  });
  it("không mặc đồ chưa có, sai ô, hoặc cho nhân vật chưa sở hữu", () => {
    const hat = COSMETIC_BY_ID.get("h_mu_hai_tac")!;
    expect(equipCosmetic(rich(), "c_be_tom", "hat", hat, 1).ok).toBe(false);
    const s = ok(buyCosmetic(rich(), hat, tx(), 1));
    expect(equipCosmetic(s, "c_be_tom", "outfit", hat, 1).ok).toBe(false);
    expect(equipCosmetic(s, "c_than_sam", "hat", hat, 1).ok).toBe(false);
  });
  it("đồ đang mặc cộng chỉ số phụ vào loadout", () => {
    const cr = COSMETIC_BY_ID.get("h_mu_phu_thuy")!;
    let s = ok(buyCosmetic(rich(), cr, tx(), 1));
    s = ok(equipCosmetic(s, "c_be_tom", "hat", cr, 1));
    const extra = equipmentPassives(s.characters.c_be_tom!.equip, COSMETIC_BY_ID);
    const l = buildLoadout(CHARACTER_BY_ID.get("c_be_tom")!, s.characters.c_be_tom!, ROD_BY_ID.get("r_tre")!, s.rods.r_tre!, extra);
    expect(l.passives.some((p) => p.kind === "luck_bonus" && p.value === 5)).toBe(true);
  });
  it("mặc cánh và sừng, lưu được qua schema", () => {
    const w = COSMETIC_BY_ID.get("w_canh_thien_than")!;
    const h = COSMETIC_BY_ID.get("n_hao_quang_thanh")!;
    let s = ok(buyCosmetic(rich(), w, tx(), 1));
    s = ok(buyCosmetic(s, h, tx(), 1));
    s = ok(equipCosmetic(s, "c_be_tom", "wings", w, 1));
    s = ok(equipCosmetic(s, "c_be_tom", "horns", h, 1));
    const back = parseSave(JSON.parse(JSON.stringify(s)));
    expect(back.ok && back.save.characters.c_be_tom!.equip).toEqual({ wings: w.id, horns: h.id });
  });
  it("save có tủ đồ vượt schema", () => {
    let s = ok(buyCosmetic(rich(), COSMETIC_BY_ID.get("o_ao_hawaii")!, tx(), 1));
    s = ok(equipCosmetic(s, "c_be_tom", "outfit", COSMETIC_BY_ID.get("o_ao_hawaii")!, 1));
    expect(parseSave(JSON.parse(JSON.stringify(s))).ok).toBe(true);
  });
  it("nhân vật mới mở khóa có ô trang bị trống", () => {
    const s = ok(unlockItem(rich(), "characters", "c_hai_tac", { kind: "starter" }, tx(), 1));
    expect(s.characters.c_hai_tac!.equip).toEqual({});
  });
});

describe("Kim cương thưởng", () => {
  it("bắt loài mới lần đầu và bắt Boss cho kim cương", () => {
    const s = createNewSave("p", "A", CATALOG, 1);
    const a = ok(applyCatch(s, { txId: tx(), fish: FISH_BY_ID.get("f_ca_ro")!, weightKg: 0.3, zoneId: "z", passives: [], now: 1 }));
    expect(a.diamonds).toBe(s.diamonds + DIAMOND_REWARDS.newSpecies);
    const b = ok(applyCatch(a, { txId: tx(), fish: FISH_BY_ID.get("f_ca_ro")!, weightKg: 0.3, zoneId: "z", passives: [], now: 1 }));
    expect(b.diamonds).toBe(a.diamonds);
    const c = ok(applyCatch(b, { txId: tx(), fish: FISH_BY_ID.get("f_boss_lao_ngu")!, weightKg: 50, zoneId: "z", passives: [], now: 1 }));
    expect(c.diamonds).toBeGreaterThanOrEqual(b.diamonds + DIAMOND_REWARDS.newSpecies + DIAMOND_REWARDS.boss);
  });
});
