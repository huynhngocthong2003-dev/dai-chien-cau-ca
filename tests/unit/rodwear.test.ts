import { describe, expect, it } from "vitest";
import { CATALOG, CHARACTER_BY_ID, FISH_BY_ID, ROD_BY_ID } from "@dccc/game-data";
import { FishingSession, applyRodRepair, applyRodWear, buildLoadout, createNewSave, rodMaxUses, rodRepairCost, rodUsesLeft, zoneDifficultyMods } from "@dccc/shared";
import { parseSave } from "@dccc/validation";

const rod = ROD_BY_ID.get("r_tre")!;

describe("Độ bền cần câu (lượt câu)", () => {
  it("cần xịn có nhiều lượt hơn; sao/cấp cộng thêm", () => {
    const lr = [...ROD_BY_ID.values()].find((r) => r.rarity === "LR")!;
    expect(rodMaxUses(lr, { level: 1, stars: 1 })).toBeGreaterThan(rodMaxUses(rod, { level: 1, stars: 1 }) * 3);
    expect(rodMaxUses(rod, { level: 20, stars: 3 })).toBeGreaterThan(rodMaxUses(rod, { level: 1, stars: 1 }));
  });

  it("mỗi lần quăng tốn lượt; hết lượt không câu được; sửa cần tốn vàng (ghi sổ cái) và hồi đầy", () => {
    let s = createNewSave("p_w", "Thợ", CATALOG, 0);
    const max = rodMaxUses(rod, s.rods[rod.id]!);
    for (let i = 0; i < max; i++) {
      const r = applyRodWear(s, rod, 1, i);
      if (!r.ok) throw new Error(r.error);
      s = r.save;
    }
    expect(rodUsesLeft(rod, s.rods[rod.id]!)).toBe(0);
    const blocked = applyRodWear(s, rod, 1, 1);
    expect(blocked.ok).toBe(false);
    const cost = rodRepairCost(rod, s.rods[rod.id]!);
    expect(cost).toBe(150);
    s.gold = 1000;
    const r = applyRodRepair(s, rod, "rep_1", 5);
    if (!r.ok) throw new Error(r.error);
    expect(r.save.gold).toBe(850);
    expect(rodUsesLeft(rod, r.save.rods[rod.id]!)).toBe(max);
    expect(r.save.ledger.some((l) => l.txId === "rep_1" && l.amount === -150)).toBe(true);
    expect(applyRodRepair(r.save, rod, "rep_1", 6).ok).toBe(false);
    // bản lưu vẫn hợp lệ
    expect(parseSave(JSON.parse(JSON.stringify(r.save))).ok).toBe(true);
  });

  it("sửa sớm rẻ hơn (tỷ lệ hao mòn); cần mới không cần sửa; thiếu vàng bị chặn", () => {
    let s = createNewSave("p_w2", "Thợ", CATALOG, 0);
    expect(applyRodRepair(s, rod, "x", 1).ok).toBe(false);
    for (let i = 0; i < 10; i++) s = (applyRodWear(s, rod, 1, i) as { save: typeof s }).save;
    expect(rodRepairCost(rod, s.rods[rod.id]!)).toBeLessThan(150);
    s.gold = 0;
    expect(applyRodRepair(s, rod, "y", 1).ok).toBe(false);
  });
});

describe("Khu cao cấp câu khó hơn", () => {
  const starter = () => buildLoadout(CHARACTER_BY_ID.get("c_ong_lao")!, 20, ROD_BY_ID.get("r_ngu_dan")!, 10);
  const bot = (zd: number, seed: number) => {
    const s = new FishingSession({ fish: FISH_BY_ID.get("f_ca_hu")!, loadout: starter(), seed, zoneDifficulty: zd });
    let reel = false;
    for (let t = 0; t < 180000 && !s.isOver; t += 50) {
      if (s.phase === "bite") s.hook();
      if (s.phase === "reeling") {
        if (s.tension > 72) reel = false;
        else if (s.tension < 40) reel = true;
        s.setReeling(reel);
      }
      s.update(50);
    }
    return s;
  };
  it("độ khó tăng dần theo khu", () => {
    const a = zoneDifficultyMods(1);
    const b = zoneDifficultyMods(6);
    expect(b.hp).toBeGreaterThan(a.hp * 1.8);
    expect(b.biteWindow).toBeLessThan(a.biteWindow);
    expect(b.struggle).toBeGreaterThan(a.struggle);
  });
  it("cùng con cá, cùng trang bị: ở khu khó kéo lâu hơn và dễ xổng hơn", () => {
    let t1 = 0;
    let t6 = 0;
    let lost1 = 0;
    let lost6 = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const a = bot(1, seed);
      const b = bot(6, seed);
      if (a.phase === "caught") t1 += a.time - a.biteAt;
      else lost1++;
      if (b.phase === "caught") t6 += b.time - b.biteAt;
      else lost6++;
      expect(b.fishMaxHp).toBeGreaterThan(a.fishMaxHp);
    }
    expect(t6 / Math.max(1, 20 - lost6)).toBeGreaterThan((t1 / Math.max(1, 20 - lost1)) * 1.4);
    expect(lost6).toBeGreaterThanOrEqual(lost1);
  });
});
