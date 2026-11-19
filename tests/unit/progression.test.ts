import { describe, expect, it } from "vitest";
import {
  MAX_BREAKTHROUGH,
  applyCatch,
  buildLoadout,
  charMaxLevel,
  consumeBossTicket,
  createNewSave,
  decomposeFishes,
  developCharacter,
  developFish,
  developRod,
  nextCharAction,
  nextRodAction,
  ownedFishPower,
  refillBossTickets,
  scaledActiveSkill,
  sellFishes,
  toggleFishLock,
  type PlayerSave,
} from "@dccc/shared";
import { CATALOG, CHARACTER_BY_ID, FISH_BY_ID, ROD_BY_ID } from "@dccc/game-data";
import { parseSave } from "@dccc/validation";

const rich = (): PlayerSave => {
  const s = createNewSave("p_t", "Tester", CATALOG, 1);
  return { ...s, gold: 10_000_000, materials: { stones: 100_000, soul: 100_000, bossTickets: 3 } };
};
let n = 0;
const tx = () => `tx_${++n}`;

function catchOne(s: PlayerSave, fishId: string): PlayerSave {
  const r = applyCatch(s, { txId: tx(), fish: FISH_BY_ID.get(fishId)!, weightKg: 1, zoneId: "z_ben_tan_thu", passives: [], now: 5 });
  if (!r.ok) throw new Error(r.error);
  return r.save;
}

describe("Phát triển nhân vật", () => {
  const bt = CHARACTER_BY_ID.get("c_be_tom")!;

  it("nâng cấp trừ vàng + đá, ghi sổ", () => {
    const s = rich();
    const r = developCharacter(s, bt, "u1", 2);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.save.characters[bt.id]!.level).toBe(2);
    expect(r.save.gold).toBeLessThan(s.gold);
    expect(r.save.materials.stones).toBeLessThan(s.materials.stones);
    expect(r.save.ledger.filter((l) => l.txId === "u1").length).toBeGreaterThanOrEqual(2);
    expect(developCharacter(r.save, bt, "u1", 3).ok).toBe(false); // trùng txId
  });

  it("thiếu tài nguyên thì từ chối và không đổi save", () => {
    const s = createNewSave("p", "A", CATALOG, 1);
    const r = developCharacter(s, bt, "u2", 2);
    expect(r.ok).toBe(false);
  });

  it("đi hết chuỗi: nâng cấp → đột phá ×5 → thức tỉnh → tối đa", () => {
    let s = rich();
    let steps = 0;
    while (nextCharAction(s, bt).action !== "max" && steps < 200) {
      const r = developCharacter(s, bt, tx(), 3);
      if (!r.ok) throw new Error(r.error);
      s = r.save;
      steps++;
    }
    const p = s.characters[bt.id]!;
    expect(p.level).toBe(60);
    expect(p.breakthrough).toBe(MAX_BREAKTHROUGH);
    expect(p.awakened).toBe(true);
    expect(charMaxLevel(p.breakthrough)).toBe(60);
  });

  it("không vượt giới hạn cấp khi chưa đột phá", () => {
    let s = rich();
    for (let i = 0; i < 9; i++) {
      const r = developCharacter(s, bt, tx(), 3);
      if (!r.ok) throw new Error(r.error);
      s = r.save;
    }
    expect(s.characters[bt.id]!.level).toBe(10);
    expect(nextCharAction(s, bt).action).toBe("breakthrough");
  });

  it("đột phá + thức tỉnh tăng sức mạnh kỹ năng và giảm hồi chiêu", () => {
    const base = bt.active;
    const strong = scaledActiveSkill(base, { level: 60, breakthrough: 5, awakened: true });
    expect(strong.cooldownMs).toBeLessThan(base.cooldownMs);
    const v0 = (base.effects[0] as { value: number }).value;
    const v1 = (strong.effects[0] as { value: number }).value;
    expect(v1).toBeGreaterThan(v0 * 1.5);
  });

  it("loadout mạnh hơn khi phát triển", () => {
    const rod = ROD_BY_ID.get("r_tre")!;
    const a = buildLoadout(bt, { level: 1 }, rod, { level: 1, stars: 1 });
    const b = buildLoadout(bt, { level: 30, breakthrough: 2 }, rod, { level: 20, stars: 2 });
    expect(b.pull).toBeGreaterThan(a.pull * 2);
    expect(b.durability).toBeGreaterThan(a.durability);
  });
});

describe("Cần câu", () => {
  it("nâng cấp tới giới hạn rồi tiến hóa", () => {
    const rod = ROD_BY_ID.get("r_tre")!;
    let s = rich();
    for (let i = 0; i < 9; i++) {
      const r = developRod(s, rod, tx(), 1);
      if (!r.ok) throw new Error(r.error);
      s = r.save;
    }
    expect(nextRodAction(s, rod).action).toBe("evolve");
    const r = developRod(s, rod, tx(), 1);
    expect(r.ok && r.save.rods[rod.id]!.stars).toBe(2);
  });

  it("không thể phát triển cần chưa sở hữu", () => {
    expect(developRod(rich(), ROD_BY_ID.get("r_hai_than")!, tx(), 1).ok).toBe(false);
  });
});

describe("Cá", () => {
  it("bắt cá rơi nguyên liệu", () => {
    const s = catchOne(createNewSave("p", "A", CATALOG, 1), "f_boss_lao_ngu");
    expect(s.materials.stones).toBeGreaterThan(0);
    expect(s.materials.soul).toBeGreaterThan(0);
  });

  it("cường hóa cá, tiến hóa cần cá cùng loài và tiêu thụ nó", () => {
    let s = catchOne(rich(), "f_ca_ro");
    const uid = s.fishes[0]!.uid;
    for (let i = 0; i < 9; i++) {
      const r = developFish(s, uid, FISH_BY_ID, tx(), 1);
      if (!r.ok) throw new Error(r.error);
      s = r.save;
    }
    const before = ownedFishPower(FISH_BY_ID.get("f_ca_ro")!, { level: 1, stars: 1 });
    expect(ownedFishPower(FISH_BY_ID.get("f_ca_ro")!, s.fishes[0]!)).toBeGreaterThan(before);
    expect(developFish(s, uid, FISH_BY_ID, tx(), 1).ok).toBe(false); // chưa có cá cùng loài
    s = catchOne(s, "f_ca_ro");
    const r = developFish(s, uid, FISH_BY_ID, tx(), 1);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.save.fishes).toHaveLength(1);
      expect(r.save.fishes[0]!.stars).toBe(2);
    }
  });

  it("khóa cá chặn bán, phân giải và làm nguyên liệu tiến hóa", () => {
    let s = catchOne(rich(), "f_ca_ro");
    s = catchOne(s, "f_ca_ro");
    const [a, b] = s.fishes.map((f) => f.uid) as [string, string];
    const l = toggleFishLock(s, b, 1);
    if (!l.ok) throw new Error();
    s = l.save;
    expect(sellFishes(s, [b], FISH_BY_ID, tx(), 1).ok).toBe(false);
    expect(decomposeFishes(s, [b], FISH_BY_ID, tx(), 1).ok).toBe(false);
    s.fishes.find((f) => f.uid === a)!.level = 10;
    expect(developFish(s, a, FISH_BY_ID, tx(), 1).ok).toBe(false);
  });

  it("phân giải cá cho Đá Nâng Cấp", () => {
    const s = catchOne(createNewSave("p", "A", CATALOG, 1), "f_ca_loc");
    const stones = s.materials.stones;
    const r = decomposeFishes(s, [s.fishes[0]!.uid], FISH_BY_ID, tx(), 1);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.save.fishes).toHaveLength(0);
      expect(r.save.materials.stones).toBeGreaterThan(stones);
    }
  });
});

describe("Vé Boss", () => {
  it("hồi vé mỗi ngày một lần, tiêu vé, hết vé thì từ chối", () => {
    let s = createNewSave("p", "A", CATALOG, 1);
    s = { ...s, materials: { ...s.materials, bossTickets: 0 } };
    const day1 = Date.UTC(2026, 10, 19, 3);
    s = refillBossTickets(s, day1);
    expect(s.materials.bossTickets).toBe(3);
    for (let i = 0; i < 3; i++) {
      const r = consumeBossTicket(s, tx(), day1);
      if (!r.ok) throw new Error(r.error);
      s = r.save;
    }
    expect(consumeBossTicket(s, tx(), day1).ok).toBe(false);
    expect(refillBossTickets(s, day1).materials.bossTickets).toBe(0); // cùng ngày
    expect(refillBossTickets(s, day1 + 86_400_000).materials.bossTickets).toBe(3);
  });

  it("săn Boss cho thưởng cao hơn", () => {
    const boss = FISH_BY_ID.get("f_boss_lao_ngu")!;
    const base = createNewSave("p", "A", CATALOG, 1);
    const a = applyCatch(base, { txId: "a", fish: boss, weightKg: 50, zoneId: "z", passives: [], now: 1 });
    const b = applyCatch(base, { txId: "b", fish: boss, weightKg: 50, zoneId: "z", passives: [], now: 1, bossHunt: true });
    if (!a.ok || !b.ok) throw new Error();
    expect(b.save.materials.soul).toBeGreaterThan(a.save.materials.soul);
  });
});

describe("Nâng cấp dữ liệu lưu", () => {
  it("save phiên bản 1 được chuyển lên phiên bản 2 không mất tiến trình", () => {
    const v1 = {
      version: 1, playerId: "p_old", name: "Cũ", level: 7, xp: 30, gold: 1234, diamonds: 50,
      selectedCharacterId: "c_be_tom", selectedRodId: "r_tre", selectedZoneId: "z_ben_tan_thu",
      characters: { c_be_tom: { level: 1 } }, rods: { r_tre: { level: 1 }, r_go_soi: { level: 1 } },
      fishes: [{ uid: "c_1", fishId: "f_ca_ro", weightKg: 0.3, zoneId: "z_ben_tan_thu", caughtAt: 1, level: 1 }],
      stats: { totalCaught: 1, bossesCaught: 0, escaped: 0, snapped: 0, heaviestKg: 0.3, species: { f_ca_ro: 1 } },
      ledger: [{ txId: "c_1", currency: "gold", amount: 2, reason: "catch:f_ca_ro", at: 1 }],
      appliedTx: ["c_1"], createdAt: 1, updatedAt: 2,
    };
    const r = parseSave(v1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.save.version).toBe(2);
    expect(r.save.level).toBe(7);
    expect(r.save.gold).toBe(1234);
    expect(r.save.fishes[0]!.stars).toBe(1);
    expect(r.save.characters.c_be_tom).toEqual({ level: 1, breakthrough: 0, awakened: false });
    expect(r.save.rods.r_go_soi!.stars).toBe(1);
    expect(r.save.materials.bossTickets).toBe(3);
  });
});
