import { describe, expect, it } from "vitest";
import {
  Rng,
  aiTeam,
  applyDeathMatch,
  applyForm,
  createNewSave,
  eatRoasted,
  roastedXp,
  elementMultiplier,
  duel,
  fishStats,
  grantEvoItem,
  makeFighter,
  ownedFishPower,
  playMatch,
  resolvePvp,
  applyPvpOutcome,
  setDefense,
  rollEvoDrop,
  setShowcase,
  validateTeam,
  winRate,
  type OwnedFish,
  type PlayerSave,
} from "@dccc/shared";
import { FISHING } from "@dccc/game-config";
import { CATALOG, FISHES, FISH_BY_ID, FISH_FORMS, FORM_BY_ID } from "@dccc/game-data";
import { parseSave } from "@dccc/validation";

function owned(id: string, fishId: string, level = 1, stars = 1, extra: Partial<OwnedFish> = {}): OwnedFish {
  return { uid: id, fishId, weightKg: 1, zoneId: "z_ben_tan_thu", caughtAt: Date.now(), level, stars, locked: false, ...extra };
}
function saveWith(fishes: OwnedFish[]): PlayerSave {
  return { ...createNewSave("p_b", "Đấu Sĩ", CATALOG, Date.now()), fishes };
}
const F = (id: string, lv = 1, st = 1) => makeFighter(FISH_BY_ID.get(id)!, { uid: id, level: lv, stars: st });

describe("Cơ chế trận đấu", () => {
  it("tất định theo seed", () => {
    const a = [F("f_ca_loc"), F("f_ca_chep"), F("f_ca_tre")];
    const b = [F("f_ca_ro"), F("f_ca_hu"), F("f_ca_tai_tuong")];
    expect(JSON.stringify(playMatch(a, b, 42))).toBe(JSON.stringify(playMatch(a, b, 42)));
  });

  it("khắc hệ: Nước > Lửa, Lửa < Nước", () => {
    expect(elementMultiplier("water", "fire")).toBeGreaterThan(1);
    expect(elementMultiplier("fire", "water")).toBeLessThan(1);
    expect(elementMultiplier("light", "dark")).toBeGreaterThan(1);
  });

  it("ưu tiên lực chiến: cá mạnh hơn ~30% vẫn thắng phần lớn dù bị khắc hệ", () => {
    // Cá Lóc (Tối) bị cá Ánh Sáng khắc; cho cá Lóc cấp cao hơn để lực chiến hơn ~30%
    const light = FISHES.find((f) => f.element === "light" && f.rarity !== "boss")!;
    const weak = makeFighter(light, { uid: "w", level: 5, stars: 1 });
    let lv = 5;
    let strong = makeFighter(FISH_BY_ID.get("f_ca_loc")!, { uid: "s", level: lv, stars: 1 });
    while (strong.power < weak.power * 1.3 && lv < 50) strong = makeFighter(FISH_BY_ID.get("f_ca_loc")!, { uid: "s", level: ++lv, stars: Math.ceil(lv / 10) });
    expect(elementMultiplier(light.element, strong.element)).toBeGreaterThan(1);
    let w = 0;
    for (let seed = 1; seed <= 200; seed++) if (duel(strong, weak, new Rng(seed)).winner === 0) w++;
    expect(w).toBeGreaterThan(140);
  });

  it("thắng 2 là dừng; tỉ số hợp lệ", () => {
    for (let seed = 1; seed < 30; seed++) {
      const r = playMatch([F("f_ca_ro"), F("f_ca_chep"), F("f_ca_hu")], [F("f_ca_tre"), F("f_ca_loc"), F("f_ca_bong_mau")], seed);
      expect(Math.max(...r.score)).toBe(2);
      expect(r.duels.length).toBeGreaterThanOrEqual(2);
      expect(r.duels.length).toBeLessThanOrEqual(3);
      expect(r.score[r.winner]).toBe(2);
    }
  });

  it("đội mạnh hơn hẳn thắng gần như mọi trận", () => {
    let w = 0;
    for (let seed = 1; seed <= 50; seed++)
      if (playMatch([F("f_boss_lao_ngu", 10), F("f_ca_chep_rong", 10), F("f_ca_loc", 10)], [F("f_ca_ro"), F("f_ca_bong_mau"), F("f_ca_hu")], seed).winner === 0) w++;
    expect(w).toBeGreaterThanOrEqual(48);
  });

  it("đội cân sức thì thắng thua đều cả hai bên", () => {
    let w = 0;
    for (let seed = 1; seed <= 200; seed++) if (playMatch([F("f_ca_ro"), F("f_ca_chep"), F("f_ca_tre")], [F("f_ca_ro"), F("f_ca_chep"), F("f_ca_tre")], seed).winner === 0) w++;
    expect(w).toBeGreaterThan(60);
    expect(w).toBeLessThan(140);
  });

  it("đội máy có lực chiến gần mục tiêu theo độ khó", () => {
    const pool = FISHES.filter((f) => f.zones.includes("z_ben_tan_thu"));
    const t = aiTeam(new Rng(1), pool, 300, "hard");
    const avg = t.reduce((s, f) => s + f.power, 0) / 3;
    expect(avg).toBeGreaterThan(300);
  });
});

describe("Đấu Sinh Tử", () => {
  const team = ["a", "b", "c"];
  const mine = () => saveWith([owned("a", "f_ca_loc", 5), owned("b", "f_ca_chep", 3), owned("c", "f_ca_ro", 8), owned("d", "f_ca_hu")]);

  it("không cho cá khóa hoặc thiếu cá", () => {
    const s = mine();
    s.fishes[0]!.locked = true;
    expect(validateTeam(s, team)).toMatch(/khóa/);
    expect(validateTeam(mine(), ["a", "b"])).toMatch(/3/);
    expect(validateTeam(mine(), ["a", "a", "b"])).toMatch(/một lần/);
  });

  it("thua → mất con cá MẠNH NHẤT trong đội; bên kia không có cá nướng", () => {
    const opp = [F("f_boss_lao_ngu", 20), F("f_boss_lao_ngu", 20), F("f_boss_lao_ngu", 20)];
    const s = mine();
    const pw = (o: OwnedFish) => ownedFishPower(FISH_BY_ID.get(o.fishId)!, o);
    const strongest = s.fishes.filter((f) => team.includes(f.uid)).sort((x, y) => pw(y) - pw(x))[0]!;
    const r = applyDeathMatch(s, { txId: "dm1", teamUids: team, opponent: opp, seed: 7, difficulty: "hard", now: Date.now() }, FISH_BY_ID);
    if (!r.ok) throw new Error(r.error);
    expect(r.result!.winner).toBe(1);
    expect(r.lost!.uid).toBe(strongest.uid);
    expect(r.save.fishes.some((f) => f.uid === strongest.uid)).toBe(false);
    expect(r.save.fishes).toHaveLength(3);
    expect(r.save.stats.dmLosses).toBe(1);
  });

  it("thắng → nhận cá nướng từ con mạnh nhất của địch, vàng, KN; ăn cá nướng để lên cấp tương ứng", () => {
    const opp = [F("f_ca_ro", 4), F("f_ca_bong_mau", 1), F("f_ca_hu", 2)];
    const s = saveWith([owned("a", "f_boss_lao_ngu", 15), owned("b", "f_boss_lao_ngu", 15), owned("c", "f_boss_lao_ngu", 15), owned("d", "f_ca_chep", 2)]);
    const r = applyDeathMatch(s, { txId: "dm2", teamUids: team, opponent: opp, seed: 3, difficulty: "easy", now: Date.now() }, FISH_BY_ID);
    if (!r.ok) throw new Error(r.error);
    expect(r.result!.winner).toBe(0);
    const strongest = [...opp].sort((x, y) => y.power - x.power)[0]!;
    expect(r.roasted!.fishId).toBe(strongest.fishId);
    expect(r.save.gold).toBeGreaterThan(s.gold);
    expect(r.save.fishes.find((f) => f.uid === "a")!.wins).toBeGreaterThanOrEqual(1);
    const charId = Object.keys(r.save.characters)[0]!;
    const lv0 = r.save.characters[charId]!.level;
    const e = eatRoasted(r.save, r.roasted!.id, charId, FISH_BY_ID, Date.now());
    if (!e.ok) throw new Error(e.error);
    expect(e.xp).toBe(roastedXp(r.roasted!, FISH_BY_ID));
    expect(e.levels! > 0 || (e.save.characters[charId]!.xp ?? 0) > 0).toBe(true);
    // KN vừa phải: một con cá nướng thường không cho quá 3 cấp
    expect(e.levels).toBeLessThanOrEqual(3);
    expect(e.save.characters[charId]!.level).toBe(lv0 + e.levels!);
    expect(e.save.roasted).toHaveLength(0);
    // cá nướng loài hiếm cho nhiều KN hơn
    expect(roastedXp({ id: "x", fishId: "f_boss_lao_ngu", level: 3, stars: 1 }, FISH_BY_ID)).toBeGreaterThan(roastedXp({ id: "y", fishId: "f_ca_ro", level: 3, stars: 1 }, FISH_BY_ID));
    expect(applyDeathMatch(r.save, { txId: "dm2", teamUids: team, opponent: opp, seed: 3, difficulty: "easy", now: Date.now() }, FISH_BY_ID).ok).toBe(false);
    expect(parseSave(JSON.parse(JSON.stringify(e.save))).ok).toBe(true);
  });

  it("nhân vật đã max cấp (chưa đột phá) hoặc chưa sở hữu thì không ăn được", () => {
    const base = { ...saveWith([]), roasted: [{ id: "r", fishId: "f_ca_ro", level: 3, stars: 1 }] };
    const charId = Object.keys(base.characters)[0]!;
    const maxed = { ...base, characters: { ...base.characters, [charId]: { ...base.characters[charId]!, level: 10, breakthrough: 0 } } };
    expect(eatRoasted(maxed, "r", charId, FISH_BY_ID, Date.now()).ok).toBe(false);
    expect(eatRoasted(base, "r", "c_khong_co", FISH_BY_ID, Date.now()).ok).toBe(false);
    // trần cấp: không vượt quá giới hạn đột phá
    const big = { ...base, roasted: [{ id: "r", fishId: "f_boss_lao_ngu", level: 50, stars: 5 }] };
    const e = eatRoasted(big, "r", charId, FISH_BY_ID, Date.now());
    if (!e.ok) throw new Error(e.error);
    expect(e.save.characters[charId]!.level).toBe(10);
    expect(parseSave(JSON.parse(JSON.stringify(e.save))).ok).toBe(true);
  });

  it("trưng bày tối đa 3 cá; tỉ lệ thắng", () => {
    const s = mine();
    expect(setShowcase(s, ["a", "b", "c", "d"], 1).ok).toBe(false);
    expect(setShowcase(s, ["a", "zz"], 1).ok).toBe(false);
    const r = setShowcase(s, ["a", "b"], 1);
    expect(r.ok && r.save.showcase).toEqual(["a", "b"]);
    expect(winRate({ wins: 3, losses: 1 })).toBe(0.75);
    expect(winRate({})).toBeNull();
  });
});

describe("Thể tiến hóa đột biến", () => {
  it("vật phẩm rơi rất hiếm; Thần Hóa hiếm hơn nữa; Boss ×3", () => {
    const rng = new Rng(11);
    let normal = 0;
    let divine = 0;
    const N = 200000;
    for (let i = 0; i < N; i++) {
      const d = rollEvoDrop(rng, FISH_FORMS, false);
      if (d?.divine) divine++;
      else if (d) normal++;
    }
    expect(normal / N).toBeGreaterThan(FISHING.evoDropChance * 0.8);
    expect(normal / N).toBeLessThan(FISHING.evoDropChance * 1.2);
    expect(divine / N).toBeLessThan(normal / N / 4);
    let boss = 0;
    for (let i = 0; i < N; i++) if (rollEvoDrop(rng, FISH_FORMS, true)) boss++;
    expect(boss / N).toBeGreaterThan(((normal + divine) / N) * 2.4);
  });

  it("chỉ cá Boss tiến hóa được; tỉ lệ ẩn; thất bại vẫn mất vật phẩm; chỉ số tăng đột biến, đổi hệ", () => {
    const boss = FISHES.find((f) => f.rarity === "boss")!;
    const hoa = FORM_BY_ID.get("hoa")!;
    let s = saveWith([owned("a", boss.id, 5), owned("n", "f_ca_loc", 5)]);
    expect(applyForm(s, "a", hoa, "t0", 1, FISH_BY_ID, 0).ok).toBe(false); // chưa có vật phẩm
    for (const t of ["g1", "g2", "g3"]) {
      const g = grantEvoItem(s, hoa.itemId, t, 1);
      if (!g.ok) throw new Error(g.error);
      s = g.save;
    }
    // cá thường bị từ chối, không mất vật phẩm
    const normal = applyForm(s, "n", hoa, "t1", 1, FISH_BY_ID, 0);
    expect(normal.ok).toBe(false);
    // thất bại: mất 1 vật phẩm, không đổi thể
    const fail = applyForm(s, "a", hoa, "t2", 1, FISH_BY_ID, hoa.successRate + 0.01);
    if (!fail.ok) throw new Error(fail.error);
    expect(fail.success).toBe(false);
    expect(fail.save.evoItems[hoa.itemId]).toBe(2);
    expect(fail.save.fishes[0]!.form).toBeUndefined();
    // thành công
    const r = applyForm(fail.save, "a", hoa, "t3", 1, FISH_BY_ID, hoa.successRate - 0.01);
    if (!r.ok) throw new Error(r.error);
    expect(r.success).toBe(true);
    s = r.save;
    expect(s.fishes[0]!.form).toBe("hoa");
    expect(s.evoItems[hoa.itemId]).toBe(1);
    // mỗi thể có tỉ lệ khác nhau, thần hóa hiếm nhất
    const rates = FISH_FORMS.map((f) => f.successRate);
    expect(new Set(rates).size).toBeGreaterThan(2);
    expect(FORM_BY_ID.get("than")!.successRate).toBe(Math.min(...rates));
    const before = fishStats(boss, 5, 1);
    const after = fishStats(boss, 5, 1, hoa);
    expect(after.atk).toBeGreaterThan(before.atk * 1.7);
    expect(after.element).toBe("fire");
    const than = FORM_BY_ID.get("than")!;
    expect(ownedFishPower(boss, { level: 5, stars: 1 }, than)).toBeGreaterThan(ownedFishPower(boss, { level: 5, stars: 1 }) * 1.7);
    expect(parseSave(JSON.parse(JSON.stringify(s))).ok).toBe(true);
  });
});

describe("Đấu Sinh Tử người – người (máy chủ tính, mỗi bên tự áp dụng)", () => {
  it("bên thua mất cá mạnh nhất, bên thắng nhận cá nướng; áp dụng đúng 1 lần", () => {
    const strong = saveWith([owned("s1", "f_boss_lao_ngu", 15), owned("s2", "f_boss_lao_ngu", 15), owned("s3", "f_boss_lao_ngu", 15)]);
    const weak = saveWith([owned("w1", "f_ca_ro", 2), owned("w2", "f_ca_hu", 9), owned("w3", "f_ca_bong_mau", 1), owned("w4", "f_ca_chep", 1, 1, { locked: true })]);
    const d = setDefense(weak, ["w1", "w2", "w3"], 1);
    if (!d.ok) throw new Error(d.error);
    const r = resolvePvp(strong, ["s1", "s2", "s3"], d.save, 99, FISH_BY_ID);
    if ("error" in r) throw new Error(r.error);
    expect(r.result.winner).toBe(0);
    expect(r.forDefender.lostUid).toBe("w2"); // mạnh nhất đội phòng thủ
    expect(r.forChallenger.roasted?.fishId).toBe("f_ca_hu");
    const id = "11111111-2222-4333-8444-555555555555";
    const def = applyPvpOutcome(d.save, { ...r.forDefender, id, opponentName: "A" }, 2);
    if (!def.ok) throw new Error(def.error);
    expect(def.save.fishes.some((f) => f.uid === "w2")).toBe(false);
    expect(def.save.fishes.some((f) => f.uid === "w4")).toBe(true); // cá khóa không bị đụng
    expect(applyPvpOutcome(def.save, { ...r.forDefender, id, opponentName: "A" }, 3).ok).toBe(false);
    const ch = applyPvpOutcome(strong, { ...r.forChallenger, id, opponentName: "B" }, 2);
    if (!ch.ok) throw new Error(ch.error);
    expect(ch.save.roasted).toHaveLength(1);
    const pc = parseSave(JSON.parse(JSON.stringify(ch.save)));
    expect(pc.ok, pc.ok ? "" : pc.error).toBe(true);
    expect(parseSave(JSON.parse(JSON.stringify(def.save))).ok).toBe(true);
  });

  it("phòng thủ tự chọn 3 cá mạnh nhất không khóa nếu chưa chọn; thiếu cá thì từ chối", () => {
    const a = saveWith([owned("s1", "f_ca_ro"), owned("s2", "f_ca_ro"), owned("s3", "f_ca_ro")]);
    const few = saveWith([owned("x", "f_ca_ro"), owned("y", "f_ca_ro", 1, 1, { locked: true })]);
    const r = resolvePvp(a, ["s1", "s2", "s3"], few, 1, FISH_BY_ID);
    expect("error" in r).toBe(true);
  });
});
