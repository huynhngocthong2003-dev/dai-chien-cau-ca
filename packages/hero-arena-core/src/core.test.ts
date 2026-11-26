import { describe, expect, it } from "vitest";
import {
  Arena,
  biomeAt,
  chooseSpecializationBranch,
  createMatchPlayer,
  EXP_TO_NEXT,
  gainExp,
  hazardForBiome,
  HEROES,
  IDLE_INPUT,
  ISLAND_RADIUS,
  MAX_LEVEL,
  rollRandom3Choices,
  Rng,
  selectUpgradeChoice,
  SPECIALIZATION_LEVEL,
  UPGRADES,
  WORLD_CENTER,
  createZone,
  tickZone,
  ZONE_STAGES,
  getActiveSpriteKey,
  skillFor,
} from "./index.ts";

function expTo(level: number): number {
  let s = 0;
  for (let i = 1; i < level; i++) s += EXP_TO_NEXT[i] ?? 0;
  return s;
}

describe("dữ liệu anh hùng", () => {
  it("8 lớp × 3 nhánh, id duy nhất, có đủ 2 giới tính", () => {
    expect(HEROES).toHaveLength(8);
    const ids = new Set<string>();
    for (const h of HEROES) {
      expect(h.branches).toHaveLength(3);
      for (const b of h.branches) {
        expect(ids.has(b.id)).toBe(false);
        ids.add(b.id);
        expect(b.appearances.male.spriteKey).toBe(`${h.id}_${b.id}_male`);
        expect(b.appearances.female.gender).toBe("female");
        expect(b.skills.map((s) => s.kind)).toContain("dash");
      }
    }
    // thẻ riêng nhánh đều trỏ tới nhánh có thật
    for (const u of UPGRADES) if (u.branchId) expect(ids.has(u.branchId)).toBe(true);
  });
});

describe("cấp độ & nhánh chuyên môn", () => {
  it("lên cấp 5 thì phải chọn nhánh, không phát thẻ ở cấp 5", () => {
    const rng = new Rng(1);
    const p = createMatchPlayer("p", "A", "mage", "female");
    const r = gainExp(p, expTo(SPECIALIZATION_LEVEL), rng);
    expect(p.level).toBe(5);
    expect(r.needsBranchSelection).toBe(true);
    expect(p.needsBranch).toBe(true);
    // cấp 2,3,4 có thẻ; cấp 5 thì không
    expect(p.pendingOffers).toHaveLength(3);
    expect(p.pendingOffers.every((o) => o.length === 3)).toBe(true);
  });

  it("khóa nhánh một lần duy nhất và chỉ từ cấp 5", () => {
    const rng = new Rng(2);
    const p = createMatchPlayer("p", "A", "warrior", "male");
    expect(chooseSpecializationBranch(p, "berserker", rng)).toBe(false);
    gainExp(p, expTo(5), rng);
    expect(chooseSpecializationBranch(p, "khong_co", rng)).toBe(false);
    expect(chooseSpecializationBranch(p, "pyromancer", rng)).toBe(false); // nhánh của lớp khác
    const hpBefore = p.maxHp;
    expect(chooseSpecializationBranch(p, "berserker", rng)).toBe(true);
    expect(p.specializationLocked).toBe(true);
    expect(p.maxHp).toBe(hpBefore + 120);
    expect(chooseSpecializationBranch(p, "paladin", rng)).toBe(false);
    expect(p.branchId).toBe("berserker");
    expect(getActiveSpriteKey(p)).toBe("warrior_berserker_male");
  });

  it("chọn 1 trong 3 áp dụng hiệu ứng và xóa đúng lượt chọn", () => {
    const rng = new Rng(3);
    const p = createMatchPlayer("p", "A", "ranger", "female");
    gainExp(p, expTo(3), rng);
    expect(p.pendingOffers).toHaveLength(2);
    const offer = p.pendingOffers[0]!;
    const ids = new Set(offer.map((c) => c.upgradeId));
    expect(ids.size).toBe(3);
    expect(selectUpgradeChoice(p, "khong_co")).toBe(false);
    const c = offer[1]!;
    expect(selectUpgradeChoice(p, c.id)).toBe(true);
    expect(p.pickedUpgrades[c.upgradeId]).toBe(1);
    expect(p.pendingOffers).toHaveLength(1);
    // thẻ của lượt đã chọn không dùng lại được
    expect(selectUpgradeChoice(p, offer[0]!.id)).toBe(false);
  });

  it("thẻ đã đầy số lần nhận không xuất hiện lại; thẻ nhánh khác không xuất hiện", () => {
    const rng = new Rng(4);
    const p = createMatchPlayer("p", "A", "mage", "male");
    p.branchId = "cryomancer";
    for (const u of UPGRADES) if (u.id !== "u_vitality" && !u.branchId) p.pickedUpgrades[u.id] = u.maxStacks;
    for (let i = 0; i < 30; i++) {
      for (const c of rollRandom3Choices(p, rng)) {
        expect(["u_vitality", "u_cryo_glacial"]).toContain(c.upgradeId);
      }
    }
  });

  it("dừng ở cấp tối đa 15", () => {
    const rng = new Rng(5);
    const p = createMatchPlayer("p", "A", "monk", "female");
    gainExp(p, 1e9, rng);
    expect(p.level).toBe(MAX_LEVEL);
    expect(p.exp).toBe(0);
    expect(gainExp(p, 500, rng).levelsGained).toBe(0);
  });

  it("chiêu cuối mở ở cấp 10, thức tỉnh ở cấp 15", () => {
    const rng = new Rng(6);
    const hero = HEROES[0]!;
    const p = createMatchPlayer("p", "A", hero.id, "male");
    expect(skillFor(hero, p, "s1")?.id).toBe(hero.baseSkill.id);
    expect(skillFor(hero, p, "s2")).toBeNull();
    gainExp(p, expTo(5), rng);
    chooseSpecializationBranch(p, "pyromancer", rng);
    expect(skillFor(hero, p, "ult")).toBeNull();
    gainExp(p, expTo(10) - expTo(5), rng);
    expect(p.level).toBe(10);
    expect(skillFor(hero, p, "ult")?.id).toBe("fire_dragon");
    gainExp(p, 1e9, rng);
    expect(skillFor(hero, p, "ult")?.id).toBe("awakened_fire_dragon");
  });
});

describe("bản đồ & vòng bo", () => {
  it("6 vùng địa hình theo hướng; môi trường đúng theo vùng", () => {
    const at = (deg: number) => {
      const a = (deg * Math.PI) / 180;
      return biomeAt(WORLD_CENTER + Math.cos(a) * 1000, WORLD_CENTER + Math.sin(a) * 1000);
    };
    expect(at(-60)).toBe("ruined_temple");
    expect(at(0)).toBe("mountain");
    expect(at(60)).toBe("glacier");
    expect(at(120)).toBe("desert");
    expect(at(180)).toBe("ruined_village");
    expect(at(-120)).toBe("forest");
    expect(hazardForBiome("forest")).toBe("toxic_mist");
    expect(hazardForBiome("ruined_village")).toBe("sandstorm");
    expect(hazardForBiome("glacier")).toBe("frozen_ground");
  });

  it("bo thu dần, vòng mới luôn nằm trong vòng cũ, kết thúc ở bán kính 0", () => {
    const rng = new Rng(7);
    const z = createZone(rng);
    let prev = { x: z.centerX, y: z.centerY, r: z.radius };
    let stages = 0;
    for (let t = 0; t < 2000 && z.phase !== "done"; t++) {
      const res = tickZone(z, 0.5, rng);
      expect(z.radius).toBeLessThanOrEqual(prev.r + 1e-6);
      if (res.stageDone) {
        stages++;
        const d = Math.hypot(z.centerX - prev.x, z.centerY - prev.y);
        expect(d + z.radius).toBeLessThanOrEqual(prev.r + 1e-6);
        prev = { x: z.centerX, y: z.centerY, r: z.radius };
      }
    }
    expect(stages).toBe(ZONE_STAGES.length);
    expect(z.radius).toBe(0);
  });
});

describe("trận đấu 20 người", () => {
  function runAuto(seed: number) {
    const a = new Arena({ seed, playerName: "Tôi", heroId: "mage", gender: "female", bonusPotions: 3 });
    a.setAutopilot(true);
    let t = 0;
    while (!a.finished && t < 1200) {
      a.tick(1 / 20, IDLE_INPUT);
      t += 1 / 20;
    }
    return { a, t };
  }

  it("có 20 người, người chơi ở cấp 1, sinh ra trong đảo", () => {
    const a = new Arena({ seed: 9, playerName: "Tôi", heroId: "guardian", gender: "male" });
    expect(a.fighters).toHaveLength(20);
    expect(a.getAliveCount()).toBe(20);
    expect(a.player.state.level).toBe(1);
    expect(a.player.potions).toBe(2);
    for (const f of a.fighters) expect(Math.hypot(f.x - WORLD_CENTER, f.y - WORLD_CENTER)).toBeLessThan(ISLAND_RADIUS);
  });

  it("chạy hết trận: đúng 1 nhà vô địch, thứ hạng 1..20 không trùng, kết thúc trước khi bo đóng hẳn", () => {
    const { a, t } = runAuto(12345);
    expect(a.finished).toBe(true);
    expect(a.getAliveCount()).toBe(1);
    const places = a.fighters.map((f) => f.placement).sort((x, y) => (x ?? 0) - (y ?? 0));
    expect(places).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(a.fighters.filter((f) => f.state.alive)).toHaveLength(1);
    expect(t).toBeLessThan(800);
    // bot đã lên cấp, khóa nhánh khi đủ cấp 5
    for (const f of a.fighters) if (f.state.level >= 5) expect(f.state.branchId).not.toBeNull();
    expect(Math.max(...a.fighters.map((f) => f.state.level))).toBeGreaterThanOrEqual(6);
  });

  it("tất định: cùng seed → cùng kết quả", () => {
    const x = runAuto(777).a;
    const y = runAuto(777).a;
    expect(x.winnerId).toBe(y.winnerId);
    expect(x.fighters.map((f) => f.placement)).toEqual(y.fighters.map((f) => f.placement));
  });

  it("đứng ngoài bo bị trừ máu và chịu biến đổi môi trường", () => {
    const a = new Arena({ seed: 3, playerName: "Tôi", heroId: "warrior", gender: "male", players: 2 });
    a.zone.radius = 10;
    a.zone.centerX = WORLD_CENTER;
    a.zone.centerY = WORLD_CENTER;
    a.zone.phase = "done";
    a.zone.dps = 50;
    const p = a.player;
    p.x = WORLD_CENTER - 1000; // hướng tây → Làng Hoang → bão cát
    p.y = WORLD_CENTER;
    const hp = p.state.hp;
    a.tick(0.5, IDLE_INPUT);
    expect(p.state.outsideSafeZone).toBe(true);
    expect(p.state.activeHazard).toBe("sandstorm");
    expect(p.state.hp).toBeLessThan(hp - 20);
  });

  it("người chơi được tạm dừng khi cần chọn nhánh, bot thì tự chọn", () => {
    const a = new Arena({ seed: 4, playerName: "Tôi", heroId: "assassin", gender: "female" });
    gainExp(a.player.state, expTo(5), a.rng);
    expect(a.playerNeedsChoice()).toBe(true);
    expect(a.chooseBranch(a.playerId, "phantom")).toBe(true);
    while (a.player.state.pendingOffers.length > 0) a.chooseUpgrade(a.playerId, a.player.state.pendingOffers[0]![0]!.id);
    expect(a.playerNeedsChoice()).toBe(false);
  });
});
