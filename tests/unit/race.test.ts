import { describe, expect, it } from "vitest";
import { CATALOG, CHARACTERS, FISHES, FISH_BY_ID } from "@dccc/game-data";
import {
  JUMPABLE,
  RACE,
  RACE_LEAGUES,
  RaceSession,
  Rng,
  applyRaceEntry,
  applyRaceResult,
  createNewSave,
  makeRaceOpponents,
  makeTrack,
  newRacer,
  raceCandidates,
  raceStats,
  type OwnedFish,
  type Racer,
} from "@dccc/shared";

const mk = (uid: string, fishId: string, level = 5, stars = 1, weightKg = 2): OwnedFish => ({ uid, fishId, level, stars, weightKg, zoneId: "z_ben_tan_thu", caughtAt: 0, locked: false });
const chars = CHARACTERS.map((c) => c.id);

/** Người chơi giỏi: xuất phát đẹp, đoán trước chướng ngại (kể cả vật chuyển động), né hoặc NHẢY đúng lúc, tăng tốc khi đầy. */
function smartPlayer(s: RaceSession) {
  const me = s.player;
  if (s.time === 0) s.boost(me.id);
  const look = 20 + me.v;
  const h = s.hazardAhead(me, me.lane, look);
  if (h) {
    const free = [-1, 1].filter((d) => me.lane + d >= 0 && me.lane + d < RACE.lanes && !s.hazardAhead(me, me.lane + d, look)) as (-1 | 1)[];
    if (free.length && (!JUMPABLE.has(h.o.kind) || !s.canJump(me))) s.changeLane(me.id, free[0]!);
    else if (JUMPABLE.has(h.o.kind) && h.dist < Math.max(4, me.v * 0.32)) s.jump(me.id);
  }
  if (s.time > 1000 && s.canBoost(me)) s.boost(me.id);
  // dùng đồ hộp may mắn: khiên ngay, tên lửa khi đường trống, bom mực/sấm sét khi có người dẫn trước
  if (me.item && !s.racers.some((r) => r.remote)) {
    const ahead = s.racers.some((r) => r !== me && r.finishTime === null && r.x > me.x);
    if (me.item === "shield" || (me.item === "turbo" ? !h : ahead)) s.useItem(me.id);
  }
}

function run(player: Racer, opp: Racer[], seed: number, ai?: (s: RaceSession) => void) {
  const s = new RaceSession(player, opp, seed);
  while (!s.over) {
    ai?.(s);
    s.update(50);
  }
  return s;
}

describe("Đua Cá – chỉ số", () => {
  it("mỗi con cá có chỉ số riêng, cố định theo mã con cá", () => {
    const def = FISH_BY_ID.get("f_ca_ro")!;
    const a = raceStats(mk("u1", "f_ca_ro"), def);
    const b = raceStats(mk("u2", "f_ca_ro"), def);
    expect(raceStats(mk("u1", "f_ca_ro"), def)).toEqual(a);
    expect(a.speed === b.speed && a.accel === b.accel && a.stamina === b.stamina).toBe(false);
    // ngẫu nhiên trải rộng: 200 con cùng loài có tốc độ khác nhau đáng kể
    const sp = Array.from({ length: 200 }, (_, i) => raceStats(mk(`x${i}`, "f_ca_ro"), def).speed);
    expect(Math.max(...sp) - Math.min(...sp)).toBeGreaterThan(12);
  });

  it("cá hiếm, cấp/sao cao, thể đột biến nhanh hơn trung bình", () => {
    const avg = (fishId: string, level = 5, stars = 1, form?: string) =>
      Array.from({ length: 100 }, (_, i) => raceStats({ ...mk(`a${i}`, fishId, level, stars), form }, FISH_BY_ID.get(fishId)!).score).reduce((x, y) => x + y) / 100;
    expect(avg("f_boss_lao_ngu")).toBeGreaterThan(avg("f_ca_ro"));
    expect(avg("f_ca_ro", 40, 4)).toBeGreaterThan(avg("f_ca_ro"));
    expect(avg("f_ca_ro", 5, 1, "hoa_lam")).toBeGreaterThan(avg("f_ca_ro"));
  });

  it("có đủ các hạng S–D trong game", () => {
    const grades = new Set<string>();
    FISHES.forEach((f, i) => [1, 30, 60].forEach((lv) => grades.add(raceStats(mk(`g${i}_${lv}`, f.id, lv, lv > 30 ? 5 : 1), f).grade)));
    for (const g of ["S", "A", "B", "C", "D"]) expect(grades.has(g)).toBe(true);
  });
});

describe("Đua Cá – cuộc đua", () => {
  it("tất định: cùng seed + cùng input cho cùng kết quả; ai cũng về đích", () => {
    const mkP = () => newRacer("me", "Tôi", "f_ca_ro", null, "c_be_tom", raceStats(mk("p", "f_ca_ro"), FISH_BY_ID.get("f_ca_ro")!), null);
    const opp = () => makeRaceOpponents("tap_su", FISHES, chars, new Rng(9));
    const a = run(mkP(), opp(), 42, smartPlayer);
    const b = run(mkP(), opp(), 42, smartPlayer);
    expect(a.standings().map((r) => r.id)).toEqual(b.standings().map((r) => r.id));
    expect(a.time).toBe(b.time);
    expect(a.player.finishTime).not.toBeNull();
    expect(a.time / 1000).toBeGreaterThan(20);
    expect(a.time / 1000).toBeLessThan(90);
  });

  it("đường đua có rong biển, đá và dòng xiết ở cả 3 làn", () => {
    const t = makeTrack(new Rng(3));
    expect(new Set(t.map((o) => o.kind)).size).toBeGreaterThanOrEqual(5);
    expect(new Set(t.map((o) => o.lane)).size).toBe(3);
    expect(t.every((o) => o.x > 100 && o.x < RACE.length)).toBe(true);
  });

  it("tăng tốc: cần đầy năng lượng, có hiệu lực, xé được rong biển", () => {
    const p = newRacer("me", "Tôi", "f_ca_ro", null, "c_be_tom", raceStats(mk("p", "f_ca_ro"), FISH_BY_ID.get("f_ca_ro")!), null);
    const s = new RaceSession(p, [], 1);
    for (let i = 0; i < 10; i++) s.update(50); // qua cửa sổ xuất phát
    expect(s.boost("me")).toBe(false);
    while (!s.canBoost(s.player)) s.update(50);
    const v0 = s.player.v;
    expect(s.boost("me")).toBe(true);
    expect(s.player.v).toBeGreaterThan(v0);
    expect(s.player.energy).toBe(0);
    expect(s.drainEvents().some((e) => e.type === "boost")).toBe(true);
  });

  it("chơi khéo (né + tăng tốc) thắng nhiều hơn hẳn người chơi đứng yên một làn", () => {
    const def = FISH_BY_ID.get("f_ca_chep")!;
    let smart = 0;
    let lazy = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const p = () => newRacer("me", "Tôi", def.id, null, "c_be_tom", raceStats(mk(`p${seed}`, def.id, 8), def), null);
      const o = () => makeRaceOpponents("tap_su", FISHES, chars, new Rng(seed * 7));
      smart += run(p(), o(), seed, smartPlayer).placeOf("me");
      lazy += run(p(), o(), seed).placeOf("me");
    }
    expect(smart / 30).toBeLessThan(lazy / 30 - 0.8);
  });

  it("giải cao hơn có đối thủ mạnh hơn", () => {
    const avg = (l: keyof typeof RACE_LEAGUES) => makeRaceOpponents(l, FISHES, chars, new Rng(5), 40).reduce((s, r) => s + r.stats.score, 0) / 40;
    expect(avg("chuyen_nghiep")).toBeGreaterThan(avg("tap_su") + 5);
    expect(avg("huyen_thoai")).toBeGreaterThan(avg("chuyen_nghiep") + 5);
  });
});

describe("Đua Cá – phần thưởng qua sổ cái", () => {
  it("trừ phí khi ghi danh, nhận thưởng đúng 1 lần theo hạng", () => {
    const s = createNewSave("p_r", "Đua", CATALOG, 0);
    s.fishes = [mk("f1", "f_ca_ro")];
    s.gold = 1000;
    const e = applyRaceEntry(s, { txId: "race_1", league: "tap_su", fishUid: "f1", now: 1 });
    if (!e.ok) throw new Error(e.error);
    expect(e.save.gold).toBe(950);
    expect(applyRaceEntry(e.save, { txId: "race_1", league: "tap_su", fishUid: "f1", now: 1 }).ok).toBe(false);
    const r = applyRaceResult(e.save, { entryTx: "race_1", league: "tap_su", place: 1, now: 2 });
    if (!r.ok) throw new Error(r.error);
    expect(r.save.gold).toBe(950 + 250);
    expect(r.save.stats.raceWins).toBe(1);
    expect(r.save.ledger.some((l) => l.txId === "race_1_r" && l.amount === 250)).toBe(true);
    expect(applyRaceResult(r.save, { entryTx: "race_1", league: "tap_su", place: 1, now: 3 }).ok).toBe(false);
    expect(applyRaceResult(s, { entryTx: "race_x", league: "tap_su", place: 1, now: 3 }).ok).toBe(false);
  });

  it("chặn khi thiếu cấp / thiếu vàng / không có cá", () => {
    const s = createNewSave("p_r2", "Đua", CATALOG, 0);
    s.fishes = [mk("f1", "f_ca_ro")];
    expect(applyRaceEntry(s, { txId: "t1", league: "huyen_thoai", fishUid: "f1", now: 1 }).ok).toBe(false);
    s.gold = 10;
    expect(applyRaceEntry(s, { txId: "t2", league: "tap_su", fishUid: "f1", now: 1 }).ok).toBe(false);
    s.gold = 1000;
    expect(applyRaceEntry(s, { txId: "t3", league: "tap_su", fishUid: "khong", now: 1 }).ok).toBe(false);
  });

  it("danh sách cá đua xếp theo điểm", () => {
    const list = raceCandidates([mk("a", "f_ca_ro"), mk("b", "f_boss_lao_ngu", 20, 3), mk("c", "f_khong_co")], FISH_BY_ID);
    expect(list.map((x) => x.fish.uid)).toEqual(["b", "a"]);
  });
});

describe("Đua Cá nhiều người", () => {
  it("máy (AI) chạy giống hệt nhau trên mọi máy dù người chơi điều khiển khác nhau", () => {
    const def = FISH_BY_ID.get("f_ca_chep")!;
    const human = (id: string, remote: boolean) => ({ ...newRacer(id, id, def.id, null, "c_be_tom", raceStats(mk(id, def.id), def), null), remote });
    const ai = () => makeRaceOpponents("tap_su", FISHES, chars, new Rng(77), 3);
    // máy A: A là mình, B từ xa; máy B: ngược lại. Thứ tự xuất phát theo ô.
    const mkSession = (mine: "A" | "B") => {
      const a = human(mine === "A" ? "me" : "A", mine !== "A");
      const b = human(mine === "B" ? "me" : "B", mine !== "B");
      const opp = ai();
      return new RaceSession(mine === "A" ? a : b, [], 99, [a, b, ...opp]);
    };
    const sa = mkSession("A");
    const sb = mkSession("B");
    const snap = (x: RaceSession) => x.racers.filter((r) => r.id.startsWith("ai")).map((r) => `${r.lane}:${r.x.toFixed(3)}:${r.hits}`);
    for (let i = 0; i < 2000 && !(sa.over && sb.over); i++) {
      if (i % 50 === 0 && !sa.over && !sb.over) expect(snap(sa)).toEqual(snap(sb));
      smartPlayer(sa); // A chơi khéo
      sa.setRemote("B", { x: sb.player.x, lane: sb.player.lane, boosting: false, finishTime: sb.player.finishTime });
      sb.setRemote("A", { x: sa.player.x, lane: sa.player.lane, boosting: false, finishTime: sa.player.finishTime });
      sa.update(50);
      sb.update(50);
    }
    const aiA = sa.racers.filter((r) => r.id.startsWith("ai") && r.finishTime !== null).map((r) => [r.id, r.finishTime]);
    const aiB = sb.racers.filter((r) => r.id.startsWith("ai") && r.finishTime !== null).map((r) => [r.id, r.finishTime]);
    const common = aiA.filter(([id]) => aiB.some(([j]) => j === id));
    expect(common).toEqual(aiB.filter(([id]) => aiA.some(([j]) => j === id)));
    expect(sa.player.lane === undefined).toBe(false);
    // hai máy cùng thứ hạng giữa 2 người chơi
    expect(sa.placeOf("me") < sa.placeOf("B")).toBe(sb.placeOf("A") < sb.placeOf("me"));
  });
});

describe("Đua Cá – thử thách kỹ năng", () => {
  const def = FISH_BY_ID.get("f_ca_chep")!;
  const me = (seed = 1) => newRacer("me", "Tôi", def.id, null, "c_be_tom", raceStats(mk(`p${seed}`, def.id, 8), def), null);

  it("có chướng ngại chuyển động: cá mập đổi làn, gỗ trôi lại gần, sứa nổi/chìm", async () => {
    const { obstacleAt } = await import("@dccc/shared");
    const shark = { id: 1, x: 300, lane: 1, kind: "shark" as const, phase: 0, period: 2000 };
    expect(new Set(Array.from({ length: 40 }, (_, i) => obstacleAt(shark, i * 100).lane)).size).toBe(3);
    const log = { id: 2, x: 500, lane: 0, kind: "log" as const, speed: 6 };
    expect(obstacleAt(log, 5000).x).toBeCloseTo(470);
    const jelly = { id: 3, x: 400, lane: 2, kind: "jelly" as const, phase: 0, period: 2000 };
    expect(obstacleAt(jelly, 100).active).toBe(true);
    expect(obstacleAt(jelly, 1500).active).toBe(false);
  });

  it("giải cao hơn có nhiều chướng ngại và vật chuyển động hơn", async () => {
    const { makeTrack } = await import("@dccc/shared");
    const moving = (l: "tap_su" | "huyen_thoai") => {
      let n = 0;
      let all = 0;
      for (let i = 1; i <= 20; i++) {
        const t = makeTrack(new Rng(i), l);
        all += t.length;
        n += t.filter((o) => o.kind === "shark" || o.kind === "log" || o.kind === "jelly" || o.kind === "whirl").length;
      }
      return { n, all };
    };
    const a = moving("tap_su");
    const b = moving("huyen_thoai");
    expect(b.all).toBeGreaterThan(a.all * 1.2);
    expect(b.n).toBeGreaterThan(a.n * 1.5);
  });

  it("NHẢY qua đá thì không bị khựng; cá mập thì nhảy cũng không thoát", () => {
    const s = new RaceSession(me(), [], 1);
    (s.track as unknown as unknown[]).length = 0;
    s.track.push({ id: 900, x: 60, lane: s.player.lane, kind: "rock" });
    s.track.push({ id: 901, x: 140, lane: s.player.lane, kind: "shark", phase: 0, period: 1e12 });
    s.player.lane = 1;
    s.track[0]!.lane = 1;
    const ev: string[] = [];
    while (s.player.x < 200) {
      const h = s.hazardAhead(s.player, s.player.lane, 30);
      if (h && h.dist < Math.max(4, s.player.v * 0.32)) s.jump("me");
      s.update(50);
      ev.push(...s.drainEvents().map((e) => e.type + ("kind" in e ? `:${e.kind}` : "")));
    }
    expect(ev).toContain("dodge_jump:rock");
    expect(ev).toContain("hit:shark");
    expect(s.player.hits).toBe(1);
  });

  it("nhảy có hồi chiêu; đang bay không đổi làn được", () => {
    const s = new RaceSession(me(), [], 1);
    for (let i = 0; i < 20; i++) s.update(50);
    expect(s.jump("me")).toBe(true);
    expect(s.jump("me")).toBe(false);
    expect(s.changeLane("me", s.player.lane === 0 ? 1 : -1)).toBe(false);
    for (let i = 0; i < 40; i++) s.update(50);
    expect(s.jump("me")).toBe(true);
  });

  it("xuất phát hoàn hảo vọt lên; bấm sớm bị khựng", () => {
    const a = new RaceSession(me(), [], 1);
    a.update(50);
    expect(a.boost("me")).toBe(true);
    expect(a.drainEvents().some((e) => e.type === "perfect_start")).toBe(true);
    const b = new RaceSession(me(), [], 1);
    b.falseStart("me");
    for (let i = 0; i < 20; i++) {
      a.update(50);
      b.update(50);
    }
    expect(a.player.x).toBeGreaterThan(b.player.x + 10);
  });

  it("tăng tốc trên dòng xiết = SIÊU TĂNG TỐC (lâu hơn)", () => {
    const s = new RaceSession(me(), [], 1);
    for (let i = 0; i < 20; i++) s.update(50);
    s.player.energy = 100;
    s.player.padUntil = s.time + 1000;
    s.boost("me");
    const ev = s.drainEvents().find((e) => e.type === "boost");
    expect(ev && "super" in ev && ev.super).toBe(true);
    expect(s.player.boostUntil - s.time).toBeGreaterThan(RACE.boostMs + 1000);
  });

  it("ở Giải Huyền Thoại, đứng yên một làn bị va chạm nhiều gấp bội người chơi khéo", () => {
    let smartHits = 0;
    let lazyHits = 0;
    for (let seed = 1; seed <= 15; seed++) {
      const a = new RaceSession(me(seed), [], seed, undefined, "huyen_thoai");
      while (!a.over) {
        smartPlayer(a);
        a.update(50);
      }
      const b = new RaceSession(me(seed), [], seed, undefined, "huyen_thoai");
      while (!b.over) b.update(50);
      smartHits += a.player.hits;
      lazyHits += b.player.hits;
    }
    expect(lazyHits).toBeGreaterThan(smartHits * 2.5);
  });
});

describe("Đua Cá – bản đồ & chặng", () => {
  const def = FISH_BY_ID.get("f_ca_chep")!;
  const me = (seed = 1) => newRacer("me", "Tôi", def.id, null, "c_be_tom", raceStats(mk(`m${seed}`, def.id, 8), def), null);

  it("5 bản đồ, mỗi bản đồ 3 chặng, chặng sau dày đặc hơn", async () => {
    const { RACE_MAPS, RACE_MAP_IDS, makeTrack, sectionIndex } = await import("@dccc/shared");
    expect(RACE_MAP_IDS.length).toBe(5);
    for (const id of RACE_MAP_IDS) {
      const m = RACE_MAPS[id];
      expect(m.sections.length).toBe(3);
      expect(m.sections[2].density).toBeGreaterThan(m.sections[0].density);
      const per = [0, 0, 0];
      for (let i = 1; i <= 20; i++) for (const o of makeTrack(new Rng(i), "tap_su", id)) if (o.kind !== "box") per[sectionIndex(o.x)]!++;
      expect(per[2]).toBeGreaterThan(per[0]!);
    }
  });

  it("mỗi bản đồ có cơ chế riêng", async () => {
    const { makeTrack } = await import("@dccc/shared");
    const kinds = (id: "song_que" | "ran_san_ho" | "nui_lua" | "than_thoai") => new Set(Array.from({ length: 10 }, (_, i) => makeTrack(new Rng(i + 1), "huyen_thoai", id)).flat().map((o) => o.kind));
    expect(kinds("song_que").has("drift")).toBe(true);
    expect(kinds("ran_san_ho").has("geyser")).toBe(true);
    expect(kinds("ran_san_ho").has("tentacle")).toBe(true);
    expect(kinds("nui_lua").has("eruption")).toBe(true);
    expect(kinds("than_thoai").has("tentacle")).toBe(true);
  });

  it("cột phun: có báo hiệu trước khi phun", async () => {
    const { obstacleAt, RACE: R } = await import("@dccc/shared");
    const o = { id: 1, x: 300, lane: 1, kind: "eruption" as const, phase: 0, period: 3000 };
    expect(obstacleAt(o, 3000 - R.eruptActiveMs - 100).warn).toBe(true);
    expect(obstacleAt(o, 3000 - 100).active).toBe(true);
    expect(obstacleAt(o, 500).active || obstacleAt(o, 500).warn).toBe(false);
  });

  it("mạch phun hất bay qua chướng ngại phía sau", () => {
    const s = new RaceSession(me(), [], 1);
    (s.track as unknown as unknown[]).length = 0;
    s.player.lane = 1;
    s.track.push({ id: 1, x: 60, lane: 1, kind: "geyser" }, { id: 2, x: 66, lane: 1, kind: "rock" });
    const ev: string[] = [];
    while (s.player.x < 120) {
      s.update(50);
      ev.push(...s.drainEvents().map((e) => e.type));
    }
    expect(ev).toContain("geyser");
    expect(ev).toContain("dodge_jump");
    expect(s.player.hits).toBe(0);
  });

  it("dòng nước ngang đẩy lệch làn; đang tăng tốc thì không bị đẩy", () => {
    const run = (boost: boolean) => {
      const s = new RaceSession(me(), [], 1);
      (s.track as unknown as unknown[]).length = 0;
      s.player.lane = 0;
      s.track.push({ id: 1, x: 40, lane: 0, kind: "drift", len: 200, dir: 1 });
      while (s.player.x < 140) {
        if (boost) {
          s.player.energy = 100;
          if (s.canBoost(s.player)) s.boost("me");
        }
        s.update(50);
      }
      return s.player.lane;
    };
    expect(run(false)).toBeGreaterThan(0);
    expect(run(true)).toBe(0);
  });

  it("mặt băng trơn: đổi làn liên tiếp bị trễ", () => {
    const s = new RaceSession(me(), [], 1, undefined, "tap_su", "bang_ha");
    for (let i = 0; i < 10; i++) s.update(50);
    s.player.lane = 0;
    expect(s.changeLane("me", 1)).toBe(true);
    expect(s.changeLane("me", 1)).toBe(false);
    for (let i = 0; i < 9; i++) s.update(50);
    expect(s.changeLane("me", 1)).toBe(true);
  });

  it("qua mốc chặng được thưởng năng lượng và báo đổi khung cảnh", () => {
    const s = new RaceSession(me(), [], 1);
    (s.track as unknown as unknown[]).length = 0;
    const secs: number[] = [];
    while (s.player.finishTime === null) {
      s.update(50);
      for (const e of s.drainEvents()) if (e.type === "section") secs.push(e.index);
    }
    expect(secs).toEqual([1, 2]);
  });

  it("mọi bản đồ: người chơi khéo va chạm ít hơn hẳn người đứng yên", () => {
    for (const id of ["song_que", "ran_san_ho", "bang_ha", "nui_lua", "than_thoai"] as const) {
      let smart = 0;
      let lazy = 0;
      for (let seed = 1; seed <= 8; seed++) {
        const a = new RaceSession(me(seed), [], seed, undefined, "chuyen_nghiep", id);
        while (!a.over) {
          smartPlayer(a);
          a.update(50);
        }
        const b = new RaceSession(me(seed), [], seed, undefined, "chuyen_nghiep", id);
        while (!b.over) b.update(50);
        smart += a.player.hits;
        lazy += b.player.hits;
      }
      expect(lazy, id).toBeGreaterThan(smart * 1.8);
    }
  });

  it("bản đồ phòng nhiều người suy ra từ seed (mọi máy giống nhau)", async () => {
    const { mapFromSeed, RACE_MAP_IDS } = await import("@dccc/shared");
    expect(new Set(Array.from({ length: 50 }, (_, i) => mapFromSeed(i * 7919))).size).toBe(RACE_MAP_IDS.length);
    expect(mapFromSeed(123)).toBe(mapFromSeed(123));
  });
});

describe("Đua Cá – hộp may mắn", () => {
  const def = FISH_BY_ID.get("f_ca_chep")!;
  const me = () => newRacer("me", "Tôi", def.id, null, "c_be_tom", raceStats(mk("it", def.id, 8), def), null);

  it("đường đua có hàng hộp may mắn ở nhiều làn", async () => {
    const { makeTrack } = await import("@dccc/shared");
    const boxes = makeTrack(new Rng(3)).filter((o) => o.kind === "box");
    expect(boxes.length).toBeGreaterThanOrEqual(8);
    expect(new Set(boxes.map((b) => b.lane)).size).toBe(3);
  });

  it("đi sau dễ ra đồ mạnh hơn (sấm sét), dẫn đầu không bao giờ ra sấm sét", async () => {
    const { rollItem } = await import("@dccc/shared");
    const count = (place: number) => Array.from({ length: 2000 }, (_, i) => rollItem(`k${i}`, place, 5)).filter((x) => x === "thunder").length;
    expect(count(1)).toBe(0);
    expect(count(5)).toBeGreaterThan(count(3));
  });

  it("nhặt hộp → có đồ; tên lửa tăng tốc, khiên chặn va chạm", () => {
    const s = new RaceSession(me(), [], 1);
    (s.track as unknown as unknown[]).length = 0;
    s.player.lane = 1;
    s.track.push({ id: 1, x: 40, lane: 1, kind: "box" }, { id: 2, x: 120, lane: 1, kind: "rock" });
    while (s.player.x < 60) s.update(50);
    expect(s.player.item).toBeTruthy();
    s.player.item = "shield";
    expect(s.useItem("me")).toBe(true);
    while (s.player.x < 140) s.update(50);
    expect(s.player.hits).toBe(0);
    expect(s.drainEvents().some((e) => e.type === "shield_block")).toBe(true);
    s.player.item = "turbo";
    const v0 = s.player.v;
    s.useItem("me");
    expect(s.player.v).toBeGreaterThan(v0);
  });

  it("bom mực làm chậm đối thủ ngay phía trước; sấm sét làm chậm mọi người phía trước", () => {
    const opp = makeRaceOpponents("tap_su", FISHES, chars, new Rng(2), 3);
    const s = new RaceSession(me(), opp, 1);
    for (let i = 0; i < 40; i++) s.update(50);
    s.player.x = -50;
    s.player.item = "ink";
    s.useItem("me");
    const ev = s.drainEvents().find((e) => e.type === "item_use");
    expect(ev && "targets" in ev ? ev.targets.length : 0).toBe(1);
    s.player.item = "thunder";
    s.useItem("me");
    const ev2 = s.drainEvents().find((e) => e.type === "item_use");
    expect(ev2 && "targets" in ev2 ? ev2.targets.length : 0).toBe(3);
  });
});

describe("Đua Cá nhiều người – báo đúng thứ hạng về đích", () => {
  const def = FISH_BY_ID.get("f_ca_chep")!;
  const human = (id: string, remote: boolean) => ({ ...newRacer(id, id, def.id, null, "c_be_tom", raceStats(mk(id, def.id), def), null), remote });
  const race = () => {
    const me = human("me", false);
    const other = human("B", true);
    const s = new RaceSession(me, [], 7, [me, other]);
    (s.track as unknown as unknown[]).length = 0;
    return s;
  };
  const finishEv = (s: RaceSession) => {
    for (let i = 0; i < 4000 && s.player.finishTime === null; i++) s.update(50);
    return s.drainEvents().find((e) => e.type === "finish" && e.racer === "me") as { place: number; provisional: boolean };
  };

  it("người kia đã về trước → mình về NHÌ (không còn ai cũng 'về nhất')", () => {
    const s = race();
    s.setRemote("B", { x: 1205, lane: 1, boosting: false, finishTime: 1000 });
    const e = finishEv(s);
    expect(e.place).toBe(2);
    expect(e.provisional).toBe(false);
  });

  it("người kia còn ở xa phía sau → chắc chắn mình NHẤT", () => {
    const s = race();
    s.setRemote("B", { x: 100, lane: 1, boosting: false, finishTime: null });
    for (let i = 0; i < 4000 && s.player.x < 1100; i++) s.update(50);
    const e = finishEv(s);
    expect(e.place).toBe(1);
    expect(e.provisional).toBe(false);
  });

  it("người kia đang sát nút mà chưa báo về đích → chưa chắc (chờ xếp hạng)", () => {
    const s = race();
    // người kia bám sát (vị trí cập nhật liên tục qua mạng) tới tận vạch đích
    for (let i = 0; i < 4000 && s.player.x < 1196; i++) {
      s.setRemote("B", { x: s.player.x - 5, lane: 1, boosting: false, finishTime: null });
      s.update(50);
    }
    const e = finishEv(s);
    expect(e.provisional).toBe(true);
    // người kia báo về đích sau mình → mình NHẤT
    s.setRemote("B", { x: 1210, lane: 1, boosting: false, finishTime: s.player.finishTime! + 300 });
    expect(s.finishRank(s.player)).toEqual({ place: 1, provisional: false });
    expect(s.finishRank(s.racers.find((r) => r.id === "B")!).place).toBe(2);
  });
});
