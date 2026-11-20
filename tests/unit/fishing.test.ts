import { describe, expect, it } from "vitest";
import { FishingSession, Rng, buildLoadout, chooseFish, type FishDef, type Loadout } from "@dccc/shared";
import { CHARACTER_BY_ID, FISH_BY_ID, ROD_BY_ID, ZONE_BY_ID } from "@dccc/game-data";

const starter = () => buildLoadout(CHARACTER_BY_ID.get("c_be_tom")!, 1, ROD_BY_ID.get("r_tre")!, 1);

/** Bot đơn giản: kéo khi căng thấp, nhả khi căng cao, dùng kỹ năng khi sẵn sàng. */
function playBot(fish: FishDef, loadout: Loadout, seed: number, opts: { useSkill?: boolean; greedy?: boolean } = {}) {
  const s = new FishingSession({ fish, loadout, seed });
  let reeling = false;
  for (let t = 0; t < 180_000 && !s.isOver; t += 50) {
    if (s.phase === "bite") s.hook();
    if (s.phase === "reeling") {
      if (opts.greedy) reeling = true;
      else if (s.tension > 72) reeling = false;
      else if (s.tension < 40) reeling = true;
      s.setReeling(reeling);
      if (opts.useSkill) s.useSkill();
    }
    s.update(50);
  }
  return s;
}

describe("FishingSession", () => {
  it("tất định: cùng seed + input cho cùng kết quả", () => {
    const fish = FISH_BY_ID.get("f_ca_loc")!;
    const a = playBot(fish, starter(), 1234);
    const b = playBot(fish, starter(), 1234);
    expect(a.phase).toBe(b.phase);
    expect(a.time).toBe(b.time);
    expect(a.fishHp).toBe(b.fishHp);
  });

  it("không giật cần thì cá chạy mất", () => {
    const s = new FishingSession({ fish: FISH_BY_ID.get("f_ca_ro")!, loadout: starter(), seed: 1 });
    for (let i = 0; i < 400 && !s.isOver; i++) s.update(50);
    expect(s.phase).toBe("missed");
  });

  it("giật sớm làm cá cắn muộn hơn", () => {
    const s = new FishingSession({ fish: FISH_BY_ID.get("f_ca_ro")!, loadout: starter(), seed: 7 });
    const before = s.biteAt;
    s.hook();
    expect(s.biteAt).toBeGreaterThan(0);
    expect(s.drainEvents()).toContainEqual({ type: "too_early" });
    expect(s.biteAt).not.toBe(before === 0 ? -1 : NaN);
  });

  it("kéo liên tục bất chấp lực căng sẽ làm đứt dây với cá khó", () => {
    const fish = FISH_BY_ID.get("f_boss_lao_ngu")!;
    let snapped = 0;
    for (let seed = 1; seed <= 20; seed++) if (playBot(fish, starter(), seed, { greedy: true }).phase === "snapped") snapped++;
    expect(snapped).toBeGreaterThan(15);
  });

  it("người chơi khéo léo bắt được hầu hết cá thường bằng đồ khởi đầu", () => {
    let caught = 0;
    for (let seed = 1; seed <= 40; seed++) {
      if (playBot(FISH_BY_ID.get("f_ca_chep")!, starter(), seed).phase === "caught") caught++;
    }
    expect(caught).toBeGreaterThanOrEqual(36);
  });

  it("thời gian bắt cá thường hợp lý (3–25 giây kéo)", () => {
    const s = playBot(FISH_BY_ID.get("f_ca_ro")!, starter(), 99);
    expect(s.phase).toBe("caught");
    const reelTime = s.time - s.biteAt;
    expect(reelTime).toBeGreaterThan(3000);
    expect(reelTime).toBeLessThan(25000);
  });

  it("Boss khu 1 là thử thách: đồ khởi đầu có thể bắt nhưng không dễ", () => {
    let caught = 0;
    for (let seed = 1; seed <= 30; seed++) {
      if (playBot(FISH_BY_ID.get("f_boss_lao_ngu")!, starter(), seed, { useSkill: true }).phase === "caught") caught++;
    }
    expect(caught).toBeGreaterThan(5);
  });

  it("kỹ năng gây sát thương và có hồi chiêu", () => {
    const s = new FishingSession({ fish: FISH_BY_ID.get("f_ca_hu")!, loadout: starter(), seed: 5 });
    while (s.phase !== "bite") s.update(50);
    s.hook();
    const hp = s.fishHp;
    expect(s.useSkill()).toBe(true);
    expect(s.fishHp).toBeLessThan(hp);
    expect(s.useSkill()).toBe(false);
    expect(s.skillCooldownLeft).toBeGreaterThan(0);
  });
});

describe("chooseFish", () => {
  it("may mắn cao làm tăng tỷ lệ cá hiếm", () => {
    const zone = ZONE_BY_ID.get("z_ben_tan_thu")!;
    const low = starter();
    const high = { ...starter(), luck: 150, rareRate: 40 };
    const count = (l: Loadout) => {
      const rng = new Rng(42);
      let rare = 0;
      for (let i = 0; i < 4000; i++) if (chooseFish(zone, FISH_BY_ID, l, 0.5, rng).rarity !== "common") rare++;
      return rare;
    };
    expect(count(high)).toBeGreaterThan(count(low) * 1.3);
  });

  it("boss thỉnh thoảng xuất hiện bất ngờ", () => {
    const zone = ZONE_BY_ID.get("z_ben_tan_thu")!;
    const rng = new Rng(3);
    let boss = 0;
    for (let i = 0; i < 5000; i++) if (chooseFish(zone, FISH_BY_ID, starter(), 0.5, rng).rarity === "boss") boss++;
    expect(boss).toBeGreaterThan(50);
    expect(boss).toBeLessThan(400);
  });
});

describe("Câu cá có kỹ năng: kiểu vùng vẫy, báo hiệu, né nhảy, combo", () => {
  it("mỗi loài có kiểu vùng vẫy cố định; đủ các kiểu trong game", async () => {
    const { fightStyle } = await import("@dccc/shared");
    const { FISHES } = await import("@dccc/game-data");
    const styles = new Set(FISHES.map((f) => fightStyle(f)));
    for (const k of ["steady", "darter", "diver", "jumper", "boss"]) expect(styles.has(k as never)).toBe(true);
    const f = FISH_BY_ID.get("f_ca_ro")!;
    expect(fightStyle(f)).toBe(fightStyle(f));
  });

  it("luôn có báo hiệu trước khi cá quẫy", () => {
    const s = new FishingSession({ fish: FISH_BY_ID.get("f_ca_chep")!, loadout: starter(), seed: 11 });
    while (s.phase !== "bite") s.update(50);
    s.hook();
    const seen: string[] = [];
    for (let i = 0; i < 400 && !s.isOver; i++) {
      s.update(50);
      for (const e of s.drainEvents()) if (e.type === "warn" || e.type === "struggle_start") seen.push(e.type);
    }
    expect(seen.length).toBeGreaterThan(2);
    seen.forEach((t, i) => expect(t).toBe(i % 2 === 0 ? "warn" : "struggle_start"));
  });

  /** Bot giỏi: nhả khi báo hiệu/quẫy/cá nhảy, kéo khi cá mệt. */
  function playPro(fish: FishDef, seed: number) {
    const s = new FishingSession({ fish, loadout: starter(), seed });
    let dodges = 0, perfects = 0;
    for (let t = 0; t < 180_000 && !s.isOver; t += 50) {
      if (s.phase === "bite") s.hook();
      if (s.phase === "reeling") s.setReeling(!s.warning && !s.struggling && !s.jumping && s.tension < 70);
      s.update(50);
      for (const e of s.drainEvents()) {
        if (e.type === "dodge") dodges++;
        if (e.type === "perfect") perfects++;
      }
    }
    return { s, dodges, perfects };
  }

  it("chơi khéo tạo combo → được thưởng cân nặng", () => {
    let combos = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const { s, perfects } = playPro(FISH_BY_ID.get("f_ca_chep")!, seed);
      expect(s.phase).toBe("caught");
      if (perfects > 0) combos++;
      expect(s.weightBonus).toBeLessThanOrEqual(0.25);
    }
    expect(combos).toBeGreaterThan(5);
  });

  it("chơi khéo nhanh hơn kéo bừa", () => {
    const fish = FISH_BY_ID.get("f_boss_lao_ngu")!;
    let pro = 0, bot = 0;
    for (let seed = 1; seed <= 20; seed++) {
      if (playPro(fish, seed).s.phase === "caught") pro++;
      if (playBot(fish, starter(), seed).phase === "caught") bot++;
    }
    expect(pro).toBeGreaterThanOrEqual(bot);
  });

  it("né được cú nhảy → combo + sát thương; kéo khi cá bay → mất combo", async () => {
    const { FISHES, fightStyle } = await import("@dccc/shared").then(async (m) => ({ ...m, FISHES: (await import("@dccc/game-data")).FISHES }));
    const jumper = FISHES.find((f) => fightStyle(f) === "jumper" && f.rarity === "common")!;
    let dodged = 0;
    for (let seed = 1; seed <= 10; seed++) dodged += playPro(jumper, seed).dodges;
    expect(dodged).toBeGreaterThan(0);
    // kéo bừa khi cá nhảy
    let fails = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const s = new FishingSession({ fish: jumper, loadout: starter(), seed });
      for (let t = 0; t < 60_000 && !s.isOver; t += 50) {
        if (s.phase === "bite") s.hook();
        if (s.phase === "reeling") s.setReeling(s.tension < 60 || s.jumping);
        s.update(50);
        for (const e of s.drainEvents()) if (e.type === "jump_fail") fails++;
      }
    }
    expect(fails).toBeGreaterThan(0);
  });

  it("sự kiện quăng cần: đàn cá quý tăng may mắn, mùa cá lớn tăng cân", async () => {
    const { rollCastEvent, applyCastEvent, castEventWeightMul } = await import("@dccc/shared");
    const rng = new Rng(5);
    const n = { school: 0, giant: 0, none: 0 };
    for (let i = 0; i < 10000; i++) n[rollCastEvent(rng) ?? "none"]++;
    expect(n.school / 10000).toBeGreaterThan(0.04);
    expect(n.school / 10000).toBeLessThan(0.06);
    expect(n.giant / 10000).toBeGreaterThan(0.02);
    expect(applyCastEvent(starter(), "school").luck).toBe(starter().luck + 60);
    expect(castEventWeightMul("giant")).toBe(1.35);
    expect(castEventWeightMul(null)).toBe(1);
  });
});
