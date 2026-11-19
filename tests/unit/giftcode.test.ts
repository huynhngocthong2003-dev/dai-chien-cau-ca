import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { buildLoadout, characterStats, createNewSave, hashGiftCode, redeemGiftCode } from "@dccc/shared";
import { CATALOG, CHARACTERS, CHARACTER_BY_ID, ROD_BY_ID } from "@dccc/game-data";
import { parseSave } from "@dccc/validation";

const fresh = () => createNewSave("p_gift", "Gift", CATALOG, Date.now());

describe("Mã quà tặng", () => {
  it("pine2606 → Gà Kim Kê, sapphire2601 → Khỉ Lam Ngọc Hầu", () => {
    const a = redeemGiftCode(fresh(), "pine2606", CHARACTERS, Date.now());
    expect(a.ok && a.character?.id).toBe("c_kim_ke");
    const b = redeemGiftCode(fresh(), "sapphire2601", CHARACTERS, Date.now());
    expect(b.ok && b.character?.id).toBe("c_lam_ngoc_hau");
  });

  it("không phân biệt hoa/thường và khoảng trắng", () => {
    expect(redeemGiftCode(fresh(), "  PINE 2606 ", CHARACTERS, Date.now()).ok).toBe(true);
  });

  it("mỗi mã chỉ dùng một lần; mã sai bị từ chối", () => {
    const a = redeemGiftCode(fresh(), "pine2606", CHARACTERS, Date.now());
    if (!a.ok) throw new Error(a.error);
    expect(a.save.characters.c_kim_ke).toBeDefined();
    expect(redeemGiftCode(a.save, "pine2606", CHARACTERS, Date.now()).ok).toBe(false);
    expect(redeemGiftCode(fresh(), "pine2607", CHARACTERS, Date.now()).ok).toBe(false);
    expect(redeemGiftCode(fresh(), "x", CHARACTERS, Date.now()).ok).toBe(false);
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
