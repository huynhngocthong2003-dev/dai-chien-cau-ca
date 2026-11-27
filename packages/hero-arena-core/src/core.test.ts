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
  chooseEvolution,
  totalPassive,
} from "./index.ts";

function expTo(level: number): number {
  let s = 0;
  for (let i = 1; i < level; i++) s += EXP_TO_NEXT[i] ?? 0;
  return s;
}

describe("dữ liệu anh hùng", () => {
  it("8 lớp × 3 nhánh, id duy nhất, có đủ 2 giới tính", () => {
    expect(HEROES).toHaveLength(10);
    const ids = new Set<string>();
    for (const h of HEROES) {
      expect(h.branches).toHaveLength(3);
      for (const b of h.branches) {
        expect(ids.has(b.id)).toBe(false);
        ids.add(b.id);
        expect(b.appearances.male.spriteKey).toBe(`${h.id}_${b.id}_male`);
        expect(b.form).toBe(h.branches.indexOf(b));
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
    const p = createMatchPlayer("p", "A", "fighter", "male");
    expect(chooseSpecializationBranch(p, "flame_blade", rng)).toBe(false);
    gainExp(p, expTo(5), rng);
    expect(chooseSpecializationBranch(p, "khong_co", rng)).toBe(false);
    expect(chooseSpecializationBranch(p, "fire_mage", rng)).toBe(false); // nhánh của lớp khác
    const hpBefore = p.maxHp;
    expect(chooseSpecializationBranch(p, "flame_blade", rng)).toBe(true);
    expect(p.specializationLocked).toBe(true);
    expect(p.maxHp).toBe(hpBefore + 120);
    expect(chooseSpecializationBranch(p, "inferno_armor", rng)).toBe(false);
    expect(p.branchId).toBe("flame_blade");
    expect(getActiveSpriteKey(p)).toBe("fighter_flame_blade_male");
  });

  it("chọn 1 trong 3 áp dụng hiệu ứng và xóa đúng lượt chọn", () => {
    const rng = new Rng(3);
    const p = createMatchPlayer("p", "A", "marksman", "female");
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
    p.branchId = "frost_gunner";
    for (const u of UPGRADES) if (u.id !== "u_vitality" && !u.branchId) p.pickedUpgrades[u.id] = u.maxStacks;
    for (let i = 0; i < 30; i++) {
      for (const c of rollRandom3Choices(p, rng)) {
        expect(["u_vitality", "u_master_frost_gunner"]).toContain(c.upgradeId);
      }
    }
  });

  it("dừng ở cấp tối đa 15", () => {
    const rng = new Rng(5);
    const p = createMatchPlayer("p", "A", "support", "female");
    gainExp(p, 1e9, rng);
    expect(p.level).toBe(MAX_LEVEL);
    expect(p.exp).toBe(0);
    expect(gainExp(p, 500, rng).levelsGained).toBe(0);
  });

  it("cây tiến hoá: Dạng 1 → cấp 5 chọn Dạng 2 → cấp 10 chọn Dạng 3 (thuộc Dạng 2) → cấp 15 thức tỉnh", () => {
    const rng = new Rng(6);
    const hero = HEROES.find((h) => h.id === "mage")!;
    const p = createMatchPlayer("p", "A", hero.id, "male");
    expect(hero.baseNameVi).toBe("Pháp Sư Tập Sự");
    expect(skillFor(hero, p, "s1")?.id).toBe(hero.baseSkill.id);
    expect(skillFor(hero, p, "s2")).toBeNull();
    gainExp(p, expTo(5), rng);
    expect(chooseSpecializationBranch(p, "fire_mage", rng)).toBe(true);
    expect(chooseEvolution(p, "fire_mage_mst", rng)).toBe(false); // chưa tới cấp 10
    gainExp(p, expTo(10) - expTo(5), rng);
    expect(p.level).toBe(10);
    expect(p.needsEvolution).toBe(true);
    expect(skillFor(hero, p, "ult")).toBeNull(); // chưa chọn Dạng 3
    expect(chooseEvolution(p, "poison_mage_mst", rng)).toBe(false); // Dạng 3 của nhánh khác
    expect(chooseEvolution(p, "fire_mage_mst", rng)).toBe(true);
    expect(chooseEvolution(p, "fire_mage_atk", rng)).toBe(false); // chỉ chọn 1 lần
    expect(p.needsEvolution).toBe(false);
    expect(hero.branches[0].evolutions.map((e) => e.name)).toEqual(["Xạ Hỏa Pháp Sư", "Ma Pháp Núi Lửa", "Hỏa Thần Pháp"]);
    expect(skillFor(hero, p, "ult")?.nameVi).toBe("Phượng Hoàng Lửa");
    expect(getActiveSpriteKey(p)).toBe("mage_fire_mage_mst_male");
    // bị động cộng dồn: Dạng 2 (thiêu 14%) + Tinh Thông (thêm 14%)
    expect(totalPassive(p).dotPct).toBeCloseTo(0.28);
    gainExp(p, 1e9, rng);
    expect(skillFor(hero, p, "ult")?.nameVi).toBe("Phượng Hoàng Lửa · Thức Tỉnh");
  });

  it("mỗi lớp có 3 Dạng 2 × 3 Dạng 3, id không trùng", () => {
    const ids = new Set<string>();
    for (const h of HEROES) for (const b of h.branches) for (const e of b.evolutions) {
      expect(ids.has(e.id)).toBe(false);
      ids.add(e.id);
    }
    expect(ids.size).toBe(90);
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
    for (let t = 0; t < 4000 && z.phase !== "done"; t++) {
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
    while (!a.finished && t < 1500) {
      a.tick(1 / 20, IDLE_INPUT);
      t += 1 / 20;
    }
    return { a, t };
  }

  it("có 20 người, người chơi ở cấp 1, sinh ra trong đảo", () => {
    const a = new Arena({ seed: 9, playerName: "Tôi", heroId: "swordsman", gender: "male" });
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
    expect(t).toBeLessThan(1100);
    expect(t).toBeGreaterThan(420); // trận dài: chỉ có máy ~9–15 phút, có người thật tới 15–20 phút
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
    const a = new Arena({ seed: 3, playerName: "Tôi", heroId: "fighter", gender: "male", players: 2 });
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
    expect(a.chooseBranch(a.playerId, "poison_blade")).toBe(true);
    while (a.player.state.pendingOffers.length > 0) a.chooseUpgrade(a.playerId, a.player.state.pendingOffers[0]![0]!.id);
    expect(a.playerNeedsChoice()).toBe(false);
  });
});

describe("không có thời gian hoà bình", () => {
  it("giây đầu tiên đã gây sát thương được cho đối thủ", () => {
    const a = new Arena({ seed: 21, playerName: "Tôi", heroId: "fighter", gender: "male", players: 2 });
    const p = a.player;
    const enemy = a.fighters[1]!;
    enemy.bot = null; // đứng yên
    enemy.x = p.x + 60;
    enemy.y = p.y;
    const hp = enemy.state.hp;
    a.tick(0.05, { moveX: 0, moveY: 0, attack: true, cast: null, usePotion: false, aimX: enemy.x, aimY: enemy.y });
    expect(a.time).toBeLessThan(0.1);
    expect(enemy.state.hp).toBeLessThan(hp);
  });
});

describe("hồi sinh đầu trận", () => {
  function setup(seed = 31) {
    const a = new Arena({ seed, playerName: "Tôi", heroId: "mage", gender: "female", players: 3 });
    for (const f of a.fighters) f.bot = null;
    return a;
  }
  const idle = { moveX: 0, moveY: 0, attack: false, cast: null, usePotion: false } as const;
  function kill(a: Arena) {
    const p = a.player;
    // đẩy ra ngoài bo với sát thương rất lớn
    a.zone.centerX = 0;
    a.zone.centerY = 0;
    a.zone.radius = 1;
    a.zone.phase = "done";
    a.zone.dps = 1e7;
    a.tick(0.05, idle);
    return p;
  }

  it("mỗi trận có 8 điểm hồi sinh, vị trí khác nhau theo seed", () => {
    const x = setup(1).respawnPoints;
    const y = setup(2).respawnPoints;
    expect(x).toHaveLength(8);
    expect(y).toHaveLength(8);
    expect(x).not.toEqual(y);
  });

  it("gục trong 5 phút đầu → hồi sinh sau 5 giây ở điểm hồi sinh, mất hết đồ và kinh nghiệm", () => {
    const a = setup();
    const p = a.player;
    gainExp(p.state, 2000, a.rng);
    p.gold = 99;
    p.materials.boss_essence = 2;
    p.equipped.weapon = { id: "eq_rusty_blade", nameVi: "x", slot: "weapon", rarity: "common", bonusAttack: 10, bonusHp: 0, bonusMoveSpeed: 0 };
    const pts = a.respawnPoints.map((q) => ({ ...q }));
    const zoneBackup = { ...a.zone };
    kill(a);
    expect(p.state.alive).toBe(false);
    expect(p.placement).toBeNull();
    expect(p.respawnAt).not.toBeNull();
    expect(a.getAliveCount()).toBe(3);
    Object.assign(a.zone, zoneBackup);
    for (let i = 0; i < 110; i++) a.tick(0.05, idle);
    expect(p.state.alive).toBe(true);
    expect(p.state.level).toBe(1);
    expect(p.state.exp).toBeLessThan(50);
    expect(p.state.branchId).toBeNull();
    expect(p.gold).toBe(0);
    expect(p.materials).toEqual({});
    expect(p.equipped).toEqual({});
    expect(p.lives).toBe(0);
    expect(pts.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 1)).toBe(true);
    // bất tử 3 giây sau hồi sinh
    expect(kill(a).state.alive).toBe(true);
    Object.assign(a.zone, zoneBackup);
    for (let i = 0; i < 70; i++) a.tick(0.05, idle);
    // lần gục thứ hai → bị loại hẳn
    kill(a);
    expect(p.placement).not.toBeNull();
    expect(p.respawnAt).toBeNull();
  });

  it("sau 5 phút đầu thì gục là bị loại luôn", () => {
    const a = setup();
    a.time = 301;
    const p = kill(a);
    expect(p.placement).not.toBeNull();
    expect(p.respawnAt).toBeNull();
  });
});

describe("tự khoá mục tiêu", () => {
  it("ưu tiên đối thủ, giữ nút đánh thì tự chạy tới cho đủ tầm và đánh trúng", () => {
    const a = new Arena({ seed: 41, playerName: "Tôi", heroId: "fighter", gender: "male", players: 2 });
    for (const m of a.monsters) m.alive = false;
    const p = a.player;
    const e = a.fighters[1]!;
    e.bot = null;
    e.x = p.x + 300;
    e.y = p.y;
    expect(a.lockTarget(p)?.id).toBe(e.id);
    const hp = e.state.hp;
    for (let i = 0; i < 60; i++) a.tick(1 / 30, { moveX: 0, moveY: 0, attack: true, cast: null, usePotion: false });
    expect(Math.hypot(e.x - p.x, e.y - p.y)).toBeLessThan(150);
    expect(e.state.hp).toBeLessThan(hp);
  });
});

describe("vật thể trên bản đồ", () => {
  it("có cả công trình (không phá được) lẫn vật phá được; không mọc đè chỗ xuất phát", () => {
    const a = new Arena({ seed: 51, playerName: "Tôi", heroId: "fighter", gender: "male" });
    expect(a.props.length).toBeGreaterThan(200);
    expect(a.props.some((p) => p.maxHp === 0)).toBe(true);
    expect(a.props.some((p) => p.maxHp > 0)).toBe(true);
    for (const f of a.fighters) for (const p of a.props) expect(Math.hypot(p.x - f.x, p.y - f.y)).toBeGreaterThan(p.radius + 18);
  });

  it("công trình chắn đường, không phá được; vật thường bị phá bằng đòn đánh", () => {
    const a = new Arena({ seed: 52, playerName: "Tôi", heroId: "fighter", gender: "male", players: 2 });
    for (const m of a.monsters) m.alive = false;
    a.fighters[1]!.x = 100;
    a.fighters[1]!.y = 100;
    a.fighters[1]!.bot = null;
    const p = a.player;
    const house = a.props.find((x) => x.maxHp === 0 && x.solid && x.radius >= 50)!;
    // chạy thẳng vào nhà 2 giây → không đi xuyên qua
    p.x = house.x - house.radius - 60;
    p.y = house.y;
    for (let i = 0; i < 120; i++) a.tick(1 / 60, { moveX: 1, moveY: 0, attack: false, cast: null, usePotion: false });
    expect(Math.hypot(p.x - house.x, p.y - house.y)).toBeGreaterThanOrEqual(house.radius + 17.9);
    // chém nhà không làm gì
    for (let i = 0; i < 120; i++) a.tick(1 / 60, { moveX: 0, moveY: 0, attack: true, cast: null, usePotion: false, aimX: house.x, aimY: house.y });
    expect(house.alive).toBe(true);
    // vật phá được
    const tree = a.props.find((x) => x.maxHp > 0 && x.maxHp <= 160)!;
    p.x = tree.x - tree.radius - 30;
    p.y = tree.y;
    let destroyed = false;
    for (let i = 0; i < 600 && !destroyed; i++) {
      const ev = a.tick(1 / 60, { moveX: 0, moveY: 0, attack: true, cast: null, usePotion: false, aimX: tree.x, aimY: tree.y });
      destroyed = ev.some((e) => e.type === "prop_destroyed" && e.propId === tree.id);
    }
    expect(destroyed).toBe(true);
    expect(tree.alive).toBe(false);
  });
});

describe("nút đánh quái / phá vật", () => {
  it("chế độ quái chỉ khoá quái, chế độ phá chỉ khoá vật phá được (không khoá công trình)", () => {
    const a = new Arena({ seed: 61, playerName: "Tôi", heroId: "fighter", gender: "male", players: 2 });
    const p = a.player;
    const e = a.fighters[1]!;
    e.x = p.x + 40;
    e.y = p.y;
    expect(a.lockTarget(p, "auto")?.id).toBe(e.id);
    const m = a.lockTarget(p, "monster");
    if (m) expect(a.monsters.some((x) => x.id === m.id)).toBe(true);
    const pr = a.lockTarget(p, "prop");
    expect(pr).not.toBeNull();
    const prop = a.props.find((x) => x.id === pr!.id)!;
    expect(prop.maxHp).toBeGreaterThan(0);
  });
});
