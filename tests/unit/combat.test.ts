import { describe, expect, it } from "vitest";
import { FISH_BY_ID } from "@dccc/game-data";
import {
  DEFEND_REDUCE,
  TIMING_MULT,
  aiAction,
  applyAction,
  barFor,
  computeDamage,
  createCombat,
  makeCombatFish,
  needlePos,
  simulateCombat,
  timingZone,
  type CombatFish,
  type CombatState,
  type Element,
} from "@dccc/shared";

const mk = (id: string, uid: string, level = 10, element?: Element): CombatFish => {
  const f = FISH_BY_ID.get(id)!;
  return makeCombatFish({ def: f, uid, level, stars: 1, element: element ?? f.element });
};
const team = (p: string, ids = ["f_ca_ro", "f_ca_chep", "f_ca_tre"]) => ids.map((id, i) => mk(id, `${p}${i}`));

describe("Thanh canh lực", () => {
  it("kim chạy qua lại thật: 0 → 1 → 0 trong 1 chu kỳ", () => {
    const bar = { periodMs: 1000, phase: 0 };
    expect(needlePos(bar, 0)).toBeCloseTo(0);
    expect(needlePos(bar, 250)).toBeCloseTo(0.5);
    expect(needlePos(bar, 500)).toBeCloseTo(1);
    expect(needlePos(bar, 750)).toBeCloseTo(0.5);
    expect(needlePos(bar, 1000)).toBeCloseTo(0);
  });
  it("vùng: giữa = PERFECT/xanh, kế = vàng, hai đầu = đỏ", () => {
    expect(timingZone(0.5)).toBe("perfect");
    expect(timingZone(0.6)).toBe("green");
    expect(timingZone(0.75)).toBe("yellow");
    expect(timingZone(0.95)).toBe("red");
    expect(timingZone(0.02)).toBe("red");
  });
  it("thanh mỗi lượt tất định theo seed (máy chủ & game giống nhau)", () => {
    expect(barFor(42, 3)).toEqual(barFor(42, 3));
    expect(barFor(42, 3)).not.toEqual(barFor(42, 4));
  });
});

describe("Công thức sát thương", () => {
  it("= MAX(1, ATK × canh lực × nguyên tố × kỹ năng − DEF)", () => {
    const a = mk("f_ca_ro", "a", 20, "water");
    const b = mk("f_ca_chep", "b", 20, "fire"); // Thủy khắc Hỏa ×1.5
    const r = computeDamage(a, b, "green", 1);
    expect(r.matchup).toBe("strong");
    expect(r.dmg).toBe(Math.max(1, Math.round(a.atk * 1.25 * 1.5 - b.def)));
    const y = computeDamage(a, mk("f_ca_chep", "c", 20, "earth"), "yellow", 1); // Thổ khắc Thủy → bất lợi ×0.75
    expect(y.matchup).toBe("weak");
    expect(y.base).toBeCloseTo(a.atk * 0.7 * 0.75);
  });
  it("vùng đỏ = 10% sát thương cơ bản trước phòng thủ, không bao giờ âm (tối thiểu 1)", () => {
    const a = mk("f_ca_ro", "a", 5, "water");
    const b = mk("f_boss_bang_de", "b", 40, "water");
    const r = computeDamage(a, b, "red", 1);
    expect(r.base).toBeCloseTo(a.atk * TIMING_MULT.red);
    expect(r.dmg).toBe(1);
  });
  it("phòng thủ giảm đúng 40% đòn kế tiếp", () => {
    const a = mk("f_ca_ro", "a", 30, "water");
    const b = mk("f_ca_chep", "b", 5, "water");
    const n = computeDamage(a, b, "green", 1).dmg;
    const d = computeDamage(a, { ...b, defending: true }, "green", 1).dmg;
    expect(d).toBe(Math.round(Math.max(1, a.atk * 1.25 - b.def) * (1 - DEFEND_REDUCE)));
    expect(d).toBeLessThan(n);
  });
});

describe("Lượt, tốc độ, hạ gục, thắng thua", () => {
  it("cá nhanh hơn đi trước; sau đó luân phiên", () => {
    const A = team("a");
    const B = team("b");
    A[0]!.spd = 99;
    B[0]!.spd = 10;
    let s = createCombat(A, B, 1);
    expect(s.turnSide).toBe(0);
    const r = applyAction(s, 0, { kind: "defend" });
    expect(r.ok).toBe(true);
    if (r.ok) s = r.state;
    expect(s.turnSide).toBe(1);
    expect(applyAction(s, 0, { kind: "defend" }).ok).toBe(false); // không gửi 2 lệnh 1 lượt
  });
  it("bằng tốc độ → quyết định công bằng & nhất quán theo seed", () => {
    const A = team("a");
    const B = team("b");
    for (const f of [...A, ...B]) f.spd = 50;
    expect(createCombat(A, B, 7).turnSide).toBe(createCombat(team("a").map((f) => ({ ...f, spd: 50 })), team("b").map((f) => ({ ...f, spd: 50 })), 7).turnSide);
    const firsts = new Set(Array.from({ length: 30 }, (_, i) => createCombat(A, B, i + 1).turnSide));
    expect(firsts.size).toBe(2);
  });
  it("hạ gục → cá kế tiếp vào sân; so lại tốc độ; hạ đủ 3 cá là thắng; không hồi sinh", () => {
    const A = team("a").map((f) => ({ ...f, atk: 99999 }));
    const B = team("b");
    B[1]!.spd = 999; // cá thứ 2 bên B rất nhanh
    A[0]!.spd = 500;
    let s: CombatState = createCombat(A, B, 3);
    expect(s.turnSide).toBe(0);
    let r = applyAction(s, 0, { kind: "attack", zone: "green" });
    if (!r.ok) throw new Error(r.error);
    s = r.state;
    expect(r.events.some((e) => e.t === "ko")).toBe(true);
    expect(s.sides[1].active).toBe(1);
    expect(s.turnSide).toBe(1); // cá mới nhanh hơn → đi trước
    r = applyAction(s, 1, { kind: "defend" });
    if (!r.ok) throw new Error(r.error);
    s = r.state;
    while (s.winner === null) {
      const x = applyAction(s, s.turnSide, s.turnSide === 0 ? { kind: "attack", zone: "green" } : { kind: "defend" });
      if (!x.ok) throw new Error(x.error);
      s = x.state;
    }
    expect(s.winner).toBe(0);
    expect(s.sides[1].team.every((f) => f.hp === 0)).toBe(true);
    expect(applyAction(s, 0, { kind: "attack", zone: "green" }).ok).toBe(false);
  });
  it("người chơi gửi thời điểm bấm → máy tính vùng từ thanh của lượt", () => {
    const s = createCombat(team("a"), team("b"), 11);
    const bar = barFor(s.seed, s.turn);
    // tìm thời điểm kim ở giữa thanh
    let best = 0;
    for (let ms = 120; ms < 3000; ms++) if (Math.abs(needlePos(bar, ms) - 0.5) < Math.abs(needlePos(bar, best) - 0.5)) best = ms;
    const r = applyAction(s, s.turnSide, { kind: "attack", pressMs: best });
    if (!r.ok) throw new Error(r.error);
    const ev = r.events.find((e) => e.t === "attack");
    expect(ev && ev.t === "attack" && ev.zone).toBe("perfect");
    const bad = applyAction(s, s.turnSide, { kind: "attack", pressMs: 5 }); // bấm bừa siêu sớm → hụt
    if (!bad.ok) throw new Error(bad.error);
    const e2 = bad.events.find((e) => e.t === "attack");
    expect(e2 && e2.t === "attack" && e2.zone).toBe("red");
  });
});

describe("Kỹ năng, combo, AI", () => {
  it("kỹ năng có hồi chiêu; dùng lại khi chưa hồi bị từ chối", () => {
    const A = team("a", ["f_ca_tre", "f_ca_ro", "f_ca_chep"]);
    let s = createCombat(A, team("b"), 5);
    // đi tới lượt thứ 2 của bên đi trước (kỹ năng sẵn sàng từ lượt 2)
    const first = s.turnSide;
    for (let i = 0; i < 2; i++) {
      const r = applyAction(s, s.turnSide, { kind: "defend" });
      if (!r.ok) throw new Error(r.error);
      s = r.state;
    }
    expect(s.turnSide).toBe(first);
    const r = applyAction(s, first, { kind: "skill", zone: "green" });
    if (!r.ok) throw new Error(r.error);
    expect(r.events.some((e) => e.t === "skill")).toBe(true);
    s = r.state;
    const r2 = applyAction(s, s.turnSide, { kind: "defend" });
    if (!r2.ok) throw new Error(r2.error);
    expect(applyAction(r2.state, first, { kind: "skill", zone: "green" }).ok).toBe(false);
  });
  it("combo xanh liên tiếp chỉ ghi nhận, không cộng sát thương", () => {
    const a = mk("f_ca_ro", "a", 30, "water");
    const b = mk("f_ca_chep", "b", 30, "water");
    const d1 = computeDamage(a, b, "green", 1).dmg;
    let s = createCombat([a, mk("f_ca_ro", "a1", 30), mk("f_ca_ro", "a2", 30)], [{ ...b, maxHp: 1e9, hp: 1e9 }, mk("f_ca_chep", "b1"), mk("f_ca_chep", "b2")], 2);
    const dmgs: number[] = [];
    const combos: number[] = [];
    while (dmgs.length < 3) {
      const r = applyAction(s, s.turnSide, s.turnSide === 0 ? { kind: "attack", zone: "green" } : { kind: "defend" });
      if (!r.ok) throw new Error(r.error);
      for (const e of r.events)
        if (e.t === "attack" && e.side === 0) {
          dmgs.push(e.dmg);
          combos.push(e.combo);
        }
      s = r.state;
    }
    expect(combos).toEqual([1, 2, 3]);
    expect(Math.max(...dmgs)).toBeLessThanOrEqual(d1); // không cộng thêm sát thương (đòn sau có thể bị phòng thủ giảm)
  });
  it("máy canh lực tốt (khó) thắng phần lớn trước máy kém (dễ) cùng đội hình", () => {
    let w = 0;
    for (let seed = 1; seed <= 120; seed++) if (simulateCombat(team("a"), team("b"), seed, ["hard", "easy"]).winner === 0) w++;
    expect(w).toBeGreaterThan(90);
  });
  it("tất định: cùng seed + cùng hành động → cùng kết quả; trận không quá dài", () => {
    const a = simulateCombat(team("a"), team("b"), 99);
    const b = simulateCombat(team("a"), team("b"), 99);
    expect(a).toEqual(b);
    expect(a.turn).toBeLessThan(120);
    expect(aiAction(a, 0, "normal").kind).toBeDefined();
  });
});

import { LATENCY_SLACK_MS, TURN_TIME_MS, buildPlayerTeam, practiceOpponent, refereeAction, runAiTurns, createNewSave } from "@dccc/shared";
import { CATALOG, FISHES, FORM_BY_ID, ZONE_BY_ID } from "@dccc/game-data";

describe("Trọng tài phía máy chủ (Edge Function `battle` dùng hàm này)", () => {
  const s0 = createCombat(team("a"), team("b"), 21);
  it("sai lượt / gửi trùng lệnh → 409", () => {
    const r = refereeAction(s0, { turn: s0.turn + 1, action: { kind: "defend" } }, 500);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(409);
  });
  it("quá giờ lượt → tự động PHÒNG THỦ", () => {
    const r = refereeAction(s0, { turn: s0.turn, action: { kind: "attack", pressMs: 600 } }, TURN_TIME_MS + LATENCY_SLACK_MS + 1);
    expect(r.ok && r.action.kind === "defend" && r.timedOut).toBe(true);
  });
  it("khai thời điểm bấm lớn hơn thời gian máy chủ đã chờ → ĐÒN HỤT; hợp lệ thì giữ nguyên", () => {
    const cheat = refereeAction(s0, { turn: s0.turn, action: { kind: "attack", pressMs: 5000 } }, 300);
    expect(cheat.ok && cheat.action.kind === "attack" && cheat.action.pressMs).toBe(0);
    const ok = refereeAction(s0, { turn: s0.turn, action: { kind: "attack", pressMs: 900 } }, 1000);
    expect(ok.ok && ok.action.kind === "attack" && ok.action.pressMs).toBe(900);
    const bad = refereeAction(s0, { turn: s0.turn, action: { kind: "fly" } }, 1000);
    expect(bad.ok).toBe(false);
  });
  it("đội từ bản lưu: phải sở hữu, đủ 3, không trùng; hệ theo khu câu", () => {
    const save = createNewSave("p", "A", CATALOG, 1);
    const o = (uid: string, fishId: string, zoneId: string) => ({ uid, fishId, weightKg: 1, zoneId, caughtAt: 1, level: 5, stars: 1, locked: false });
    save.fishes = [o("x", "f_ca_ro", "z_ben_tan_thu"), o("y", "f_ca_chep", "z_ben_tan_thu"), o("z", "f_ca_thiec_bac", "z_vuong_quoc_kim_loai")];
    expect("error" in buildPlayerTeam(save, ["x", "x", "y"], FISH_BY_ID, FORM_BY_ID, ZONE_BY_ID)).toBe(true);
    expect("error" in buildPlayerTeam(save, ["x", "y", "ko_co"], FISH_BY_ID, FORM_BY_ID, ZONE_BY_ID)).toBe(true);
    expect("error" in buildPlayerTeam(save, ["x", "y"], FISH_BY_ID, FORM_BY_ID, ZONE_BY_ID)).toBe(true);
    const ok = buildPlayerTeam(save, ["z", "x", "y"], FISH_BY_ID, FORM_BY_ID, ZONE_BY_ID);
    if ("error" in ok) throw new Error(ok.error);
    expect(ok.team.map((f) => f.uid)).toEqual(["z", "x", "y"]);
    expect(ok.team[0]!.element).toBe("metal");
    const foe = practiceOpponent(9, ok.team, FISHES.filter((f) => f.rarity !== "boss"), "normal", FISH_BY_ID);
    expect(foe).toHaveLength(3);
    // máy chỉ đi lượt của máy, dừng khi tới lượt người
    const st = runAiTurns(createCombat(ok.team, foe, 9), 1, "normal").state;
    expect(st.winner !== null || st.turnSide === 0).toBe(true);
  });
});

import { applyCombatOutcome, mirrorCombat, weakestFish } from "@dccc/shared";

describe("Kết quả trận 3vs3: THUA mất cá lực chiến THẤP NHẤT", () => {
  const mkSave = () => {
    const save = createNewSave("p", "A", CATALOG, 1);
    const o = (uid: string, fishId: string, level: number, locked = false) => ({ uid, fishId, weightKg: 1, zoneId: "z_ben_tan_thu", caughtAt: 1, level, stars: 1, locked });
    save.fishes = [o("manh", "f_ca_chep", 30), o("vua", "f_ca_ro", 12), o("yeu", "f_ca_ro", 2), o("khac", "f_ca_ro", 1)];
    save.showcase = ["yeu"];
    return save;
  };
  const team3 = ["manh", "vua", "yeu"];
  it("cá khoá không được ra trận (được bảo vệ)", () => {
    const s = mkSave();
    s.fishes[0]!.locked = true;
    const r = buildPlayerTeam(s, team3, FISH_BY_ID, FORM_BY_ID, ZONE_BY_ID);
    expect("error" in r && r.error).toMatch(/khoá/);
  });
  it("thua với máy → mất đúng con yếu nhất trong đội (không phải cá ngoài đội), gỡ khỏi trưng bày", () => {
    const s = mkSave();
    expect(weakestFish(s, team3, FISH_BY_ID, FORM_BY_ID)?.uid).toBe("yeu");
    const r = applyCombatOutcome(s, { txId: "cb_1", teamUids: team3, won: false, level: "normal", foe: [], now: 5 }, FISH_BY_ID, FORM_BY_ID);
    if (!r.ok) throw new Error(r.error);
    expect(r.lostUid).toBe("yeu");
    expect(r.save.fishes.map((f) => f.uid)).toEqual(["manh", "vua", "khac"]);
    expect(r.save.showcase).toEqual([]);
    expect(r.save.stats.dmLosses).toBe(1);
    // áp lần 2 cùng txId bị từ chối
    expect(applyCombatOutcome(r.save, { txId: "cb_1", teamUids: team3, won: false, level: "normal", foe: [], now: 6 }, FISH_BY_ID, FORM_BY_ID).ok).toBe(false);
  });
  it("thắng máy → vàng + KN (ghi sổ) + cá nướng, không mất cá", () => {
    const s = mkSave();
    const r = applyCombatOutcome(s, { txId: "cb_2", teamUids: team3, won: true, level: "hard", foe: [{ fishId: "f_ca_tre", level: 9, stars: 1 }, { fishId: "f_ca_ro", level: 3, stars: 1 }], now: 5 }, FISH_BY_ID, FORM_BY_ID);
    if (!r.ok) throw new Error(r.error);
    expect(r.save.gold - s.gold).toBe(800);
    expect(r.save.ledger.some((l) => l.txId === "cb_2" && l.currency === "gold")).toBe(true);
    expect(r.roasted?.fishId).toBe("f_ca_tre");
    expect(r.save.fishes).toHaveLength(4);
  });
  it("đấu người: giao hữu không mất gì; sinh tử thua mất con máy chủ chốt, thắng chỉ nhận cá nướng (không sinh vàng)", () => {
    const s = mkSave();
    const fr = applyCombatOutcome(s, { txId: "pv_1", teamUids: team3, won: false, level: null, stake: "friendly", foe: [], now: 5 }, FISH_BY_ID, FORM_BY_ID);
    expect(fr.ok && fr.save.fishes.length).toBe(4);
    const lose = applyCombatOutcome(s, { txId: "pv_2", teamUids: team3, won: false, level: null, loseUid: "vua", foe: [], now: 5 }, FISH_BY_ID, FORM_BY_ID);
    expect(lose.ok && lose.lostUid).toBe("vua");
    const win = applyCombatOutcome(s, { txId: "pv_3", teamUids: team3, won: true, level: null, foe: [{ fishId: "f_ca_tre", level: 4, stars: 1 }], now: 5 }, FISH_BY_ID, FORM_BY_ID);
    if (!win.ok) throw new Error(win.error);
    expect(win.save.gold).toBe(s.gold);
    expect(win.roasted?.fishId).toBe("f_ca_tre");
  });
  it("góc nhìn bên 1 được đảo thành bên 0", () => {
    const st = createCombat(team("a"), team("b"), 33);
    const m = mirrorCombat(st);
    expect(m.sides[0].team[0]!.uid).toBe("b0");
    expect(m.turnSide).toBe(st.turnSide === 0 ? 1 : 0);
    const first = st.log.find((e) => e.t === "start");
    const mf = m.log.find((e) => e.t === "start");
    expect(first && mf && first.t === "start" && mf.t === "start" && first.first !== mf.first).toBe(true);
  });
});
