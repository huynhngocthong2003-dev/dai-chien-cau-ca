import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { buildLoadout, characterStats, createNewSave, hashGiftCode, redeemGiftCode } from "@dccc/shared";
import { CATALOG, CHARACTERS, CHARACTER_BY_ID, GIFT_REWARDS, RODS, ROD_BY_ID } from "@dccc/game-data";
import { rodStats } from "@dccc/shared";
import { parseSave } from "@dccc/validation";

const fresh = () => createNewSave("p_gift", "Gift", CATALOG, Date.now());

describe("Mã quà tặng", () => {
  it("pine2606 → Gà Kim Kê, sapphire2601 → Khỉ Lam Ngọc Hầu", () => {
    const a = redeemGiftCode(fresh(), "pine2606", { characters: CHARACTERS, rods: RODS }, Date.now());
    expect(a.ok && a.character?.id).toBe("c_kim_ke");
    const b = redeemGiftCode(fresh(), "sapphire2601", { characters: CHARACTERS, rods: RODS }, Date.now());
    expect(b.ok && b.character?.id).toBe("c_lam_ngoc_hau");
  });

  it("không phân biệt hoa/thường và khoảng trắng", () => {
    expect(redeemGiftCode(fresh(), "  PINE 2606 ", { characters: CHARACTERS, rods: RODS }, Date.now()).ok).toBe(true);
  });

  it("mỗi mã chỉ dùng một lần; mã sai bị từ chối", () => {
    const a = redeemGiftCode(fresh(), "pine2606", { characters: CHARACTERS, rods: RODS }, Date.now());
    if (!a.ok) throw new Error(a.error);
    expect(a.save.characters.c_kim_ke).toBeDefined();
    expect(redeemGiftCode(a.save, "pine2606", { characters: CHARACTERS, rods: RODS }, Date.now()).ok).toBe(false);
    expect(redeemGiftCode(fresh(), "pine2607", { characters: CHARACTERS, rods: RODS }, Date.now()).ok).toBe(false);
    expect(redeemGiftCode(fresh(), "x", { characters: CHARACTERS, rods: RODS }, Date.now()).ok).toBe(false);
    expect(parseSave(JSON.parse(JSON.stringify(a.save))).ok).toBe(true);
  });

  it("mã gốc không xuất hiện trong mã nguồn game", () => {
    const files: string[] = [];
    const walk = (d: string) => {
      for (const f of readdirSync(d)) {
        const p = join(d, f);
        if (statSync(p).isDirectory()) {
          if (!["node_modules", "dist", "dist-single"].includes(f)) walk(p);
        } else if (/\.(ts|js)$/.test(f)) files.push(p);
      }
    };
    walk("packages");
    walk("apps/game-client/src");
    for (const f of files) {
      const src = readFileSync(f, "utf8").toLowerCase();
      expect(src.includes("pine2606"), f).toBe(false);
      expect(src.includes("sapphire2601"), f).toBe(false);
      expect(src.includes("ruby2602"), f).toBe(false);
      expect(src.includes("kimcuong2000"), f).toBe(false);
    }
    expect(hashGiftCode("pine2606")).not.toContain("pine");
  });
});

describe("Nhân vật LR mạnh nhất", () => {
  it("chỉ số cơ bản và lực kéo cao hơn mọi nhân vật UR trở xuống", () => {
    const lr = CHARACTERS.filter((c) => c.rarity === "LR");
    const others = CHARACTERS.filter((c) => c.rarity !== "LR");
    expect(lr).toHaveLength(2);
    for (const c of lr)
      for (const o of others) {
        const a = characterStats(c, 1);
        const b = characterStats(o, 1);
        expect(a.pull).toBeGreaterThan(b.pull);
        expect(a.hp).toBeGreaterThan(b.hp);
      }
  });
  it("loadout LR với cần khởi đầu vẫn mạnh hơn UR", () => {
    const rod = ROD_BY_ID.get("r_tre")!;
    const lr = buildLoadout(CHARACTER_BY_ID.get("c_kim_ke")!, 1, rod, 1);
    const ur = buildLoadout(CHARACTER_BY_ID.get("c_than_sam")!, 1, rod, 1);
    expect(lr.pull).toBeGreaterThan(ur.pull);
  });
});

describe("Cần Huyết Ma Long (LR)", () => {
  it("ruby2602 mở khóa cần, dùng một lần", () => {
    const r = redeemGiftCode(fresh(), "RUBY2602", { characters: CHARACTERS, rods: RODS }, Date.now());
    expect(r.ok && r.rod?.id).toBe("r_huyet_ma_long");
    if (!r.ok) return;
    expect(r.save.rods.r_huyet_ma_long).toEqual({ level: 1, stars: 1 });
    expect(redeemGiftCode(r.save, "ruby2602", { characters: CHARACTERS, rods: RODS }, Date.now()).ok).toBe(false);
    expect(parseSave(JSON.parse(JSON.stringify(r.save))).ok).toBe(true);
  });
  it("mạnh hơn mọi cần câu khác ở mọi chỉ số chính", () => {
    const top = rodStats(ROD_BY_ID.get("r_huyet_ma_long")!, 1);
    for (const r of RODS.filter((x) => x.id !== "r_huyet_ma_long")) {
      const o = rodStats(r, 1);
      expect(top.pull).toBeGreaterThan(o.pull);
      expect(top.durability).toBeGreaterThan(o.durability);
      expect(top.reelSpeed).toBeGreaterThan(o.reelSpeed);
      expect(top.rareRate).toBeGreaterThan(o.rareRate);
      expect(top.antiSnap).toBeGreaterThan(o.antiSnap);
    }
  });
});

describe("Mã 2000 kim cương", () => {
  const cat = { characters: CHARACTERS, rods: RODS, rewards: GIFT_REWARDS };
  it("kimcuong2000 cộng đúng 2000 kim cương, ghi sổ, chỉ dùng một lần", () => {
    const s0 = fresh();
    const r = redeemGiftCode(s0, "KimCuong2000", cat, Date.now());
    expect(r.ok && r.reward?.diamonds).toBe(2000);
    if (!r.ok) return;
    expect(r.save.diamonds).toBe(s0.diamonds + 2000);
    expect(r.save.ledger.some((l) => l.currency === "diamonds" && l.amount === 2000)).toBe(true);
    expect(redeemGiftCode(r.save, "kimcuong2000", cat, Date.now()).ok).toBe(false);
    expect(parseSave(JSON.parse(JSON.stringify(r.save))).ok).toBe(true);
  });
});
