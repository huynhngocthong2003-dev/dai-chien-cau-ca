import { describe, expect, it } from "vitest";
import { applyMailReward, createNewSave, mailRewardClaimed, mailRewardEmpty } from "@dccc/shared";
import { CHARACTERS, EVO_ITEMS, FISHES, FISH_BY_ID, RODS, ZONES } from "@dccc/game-data";

const CATALOG = { characters: CHARACTERS, rods: RODS, fishes: FISHES, zones: ZONES };
const items = new Set(EVO_ITEMS.map((i) => i.id));
let n = 0;
const uid = () => `m_${++n}`;

describe("Quà trong Hòm Thư", () => {
  it("nhận quà: cộng vàng, kim cương, cá, đá – ghi sổ – chỉ 1 lần", () => {
    const s = createNewSave("p", "A", CATALOG, 1);
    const r = applyMailReward(s, { txId: "mail_1", gold: 50000, diamonds: 1000, evoItems: { e_tinh_the_bang_ha: 1 }, fishes: [{ fishId: "f_boss_bang_de", weightKg: 2860.5, zoneId: "z_bang_gia", form: "than_thien" }] }, FISH_BY_ID, items, uid, 5);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.save.gold).toBe(s.gold + 50000);
    expect(r.save.diamonds).toBe(s.diamonds + 1000);
    expect(r.save.evoItems.e_tinh_the_bang_ha).toBe(1);
    expect(r.save.fishes.at(-1)).toMatchObject({ fishId: "f_boss_bang_de", form: "than_thien", locked: true });
    expect(r.save.ledger.filter((l) => l.txId === "mail_1")).toHaveLength(2);
    expect(mailRewardClaimed(r.save, { txId: "mail_1" })).toBe(true);
    const again = applyMailReward(r.save, { txId: "mail_1", gold: 50000 }, FISH_BY_ID, items, uid, 6);
    expect(again.ok).toBe(false);
  });
  it("chặn quà không hợp lệ / kho đầy", () => {
    const s = createNewSave("p", "A", CATALOG, 1);
    expect(applyMailReward(s, { txId: "mail_2", gold: -5 }, FISH_BY_ID, items, uid, 1).ok).toBe(false);
    expect(applyMailReward(s, { txId: "mail_3", fishes: [{ fishId: "f_khong_co", weightKg: 1, zoneId: "z" }] }, FISH_BY_ID, items, uid, 1).ok).toBe(false);
    expect(applyMailReward(s, { txId: "mail_4", evoItems: { x_la: 1 } }, FISH_BY_ID, items, uid, 1).ok).toBe(false);
    const full = { ...s, fishes: Array.from({ length: 200 }, (_, i) => ({ uid: `u${i}`, fishId: "f_ca_ro", weightKg: 1, zoneId: "z_ben_tan_thu", caughtAt: 1, level: 1, stars: 1, locked: false })) };
    expect(applyMailReward(full, { txId: "mail_5", fishes: [{ fishId: "f_ca_ro", weightKg: 1, zoneId: "z_ben_tan_thu" }] }, FISH_BY_ID, items, uid, 1).ok).toBe(false);
    expect(mailRewardEmpty({ txId: "x" })).toBe(true);
  });
});
