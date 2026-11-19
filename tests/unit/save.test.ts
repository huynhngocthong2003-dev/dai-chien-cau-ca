import { describe, expect, it } from "vitest";
import { applyCatch, createNewSave, grantXp, sellFishes, unlockItem } from "@dccc/shared";
import { CATALOG, FISH_BY_ID, ROD_BY_ID } from "@dccc/game-data";
import { parseSave } from "@dccc/validation";

const fresh = () => createNewSave("p_test", "Tester", CATALOG, 1000);

describe("Save & kinh tế", () => {
  it("save mới hợp lệ theo schema", () => {
    const r = parseSave(JSON.parse(JSON.stringify(fresh())));
    expect(r.ok).toBe(true);
  });

  it("schema từ chối dữ liệu bị sửa (vàng âm)", () => {
    const s = { ...fresh(), gold: -5 };
    expect(parseSave(s).ok).toBe(false);
  });

  it("nhận cá cộng XP, vàng, ghi sổ và chống nhận trùng", () => {
    const fish = FISH_BY_ID.get("f_ca_loc")!;
    const r1 = applyCatch(fresh(), { txId: "tx_1", fish, weightKg: 2, zoneId: "z_ben_tan_thu", passives: [], now: 2000 });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    expect(r1.save.fishes).toHaveLength(1);
    expect(r1.save.ledger.some((l) => l.txId === "tx_1")).toBe(true);
    const r2 = applyCatch(r1.save, { txId: "tx_1", fish, weightKg: 2, zoneId: "z_ben_tan_thu", passives: [], now: 2001 });
    expect(r2.ok).toBe(false);
  });

  it("bán cá cộng vàng, từ chối cá không sở hữu", () => {
    const fish = FISH_BY_ID.get("f_ca_chep")!;
    const r1 = applyCatch(fresh(), { txId: "tx_a", fish, weightKg: 1, zoneId: "z_ben_tan_thu", passives: [], now: 1 });
    if (!r1.ok) throw new Error();
    const gold = r1.save.gold;
    const sold = sellFishes(r1.save, ["tx_a"], FISH_BY_ID, "sell_1", 2);
    expect(sold.ok).toBe(true);
    if (sold.ok) {
      expect(sold.save.gold).toBeGreaterThan(gold);
      expect(sold.save.fishes).toHaveLength(0);
    }
    expect(sellFishes(r1.save, ["khong_co"], FISH_BY_ID, "sell_2", 3).ok).toBe(false);
  });

  it("lên cấp theo XP", () => {
    const s = fresh();
    const ups = grantXp(s, 5000);
    expect(ups).toBeGreaterThan(3);
    expect(s.level).toBe(1 + ups);
  });

  it("mua cần bằng vàng trừ đúng tiền, thiếu cấp thì từ chối", () => {
    const s = fresh();
    const oak = ROD_BY_ID.get("r_go_soi")!;
    const r = unlockItem(s, "rods", oak.id, oak.unlock, "buy_1", 5);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.save.gold).toBe(s.gold - 300);
    const storm = ROD_BY_ID.get("r_bao_to")!;
    expect(unlockItem({ ...s, gold: 1e6 }, "rods", storm.id, storm.unlock, "buy_2", 5).ok).toBe(false);
  });
});

describe("Hồi quy: lưu rồi tải lại với thời gian thật", () => {
  it("save tạo bằng Date.now() vẫn hợp lệ sau khi tải lại", async () => {
    const { refillBossTickets } = await import("@dccc/shared");
    const now = Date.now();
    let s = refillBossTickets(createNewSave("p_real", "Thật", CATALOG, now), now);
    const r1 = applyCatch(s, { txId: "c_real", fish: FISH_BY_ID.get("f_ca_ro")!, weightKg: 0.2, zoneId: "z_ben_tan_thu", passives: [], now });
    if (!r1.ok) throw new Error(r1.error);
    s = r1.save;
    const back = parseSave(JSON.parse(JSON.stringify(s)));
    expect(back.ok, back.ok ? "" : back.error).toBe(true);
  });
});
