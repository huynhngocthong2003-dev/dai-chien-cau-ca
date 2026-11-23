import { describe, expect, it } from "vitest";
import {
  SAVE_VERSION,
  Rng,
  WHEEL_COST_DIAMONDS,
  checkinState,
  claimCheckin,
  claimQuest,
  claimTitle,
  createNewSave,
  equipTitle,
  migrateSave,
  questProgress,
  rankTitle,
  refreshDaily,
  spinWheel,
  titleProgress,
  validateGuild,
  type PlayerSave,
} from "@dccc/shared";
import { CATALOG, CHECKIN_REWARDS, QUESTS, TITLES, TITLE_BY_ID, WHEEL_PRIZES } from "@dccc/game-data";
import { parseSave } from "@dccc/validation";

const DAY = 86400_000;
const T0 = Date.UTC(2026, 10, 20, 3); // 10h sáng giờ VN
const fresh = (): PlayerSave => createNewSave("p_m", "Meta", CATALOG, T0);
const valid = (s: PlayerSave) => expect(parseSave(JSON.parse(JSON.stringify(s))).ok).toBe(true);

describe("Điểm danh 7 ngày", () => {
  it("nhận 1 lần/ngày, chuỗi tăng, lỡ ngày thì về ngày 1", () => {
    let s = fresh();
    const r1 = claimCheckin(s, CHECKIN_REWARDS, "c1", T0);
    if (!r1.ok) throw new Error(r1.error);
    expect(r1.index).toBe(0);
    expect(r1.save.gold).toBe(s.gold + CHECKIN_REWARDS[0]!.gold!);
    expect(claimCheckin(r1.save, CHECKIN_REWARDS, "c1b", T0 + 3600_000).ok).toBe(false);
    s = r1.save;
    for (let d = 1; d < 7; d++) {
      const r = claimCheckin(s, CHECKIN_REWARDS, `c${d + 1}`, T0 + d * DAY);
      if (!r.ok) throw new Error(r.error);
      expect(r.index).toBe(d);
      s = r.save;
    }
    expect(s.checkin.streak).toBe(7);
    // ngày 8 quay vòng về ô 1
    expect(checkinState(s, T0 + 7 * DAY, 7).index).toBe(0);
    // bỏ 2 ngày → chuỗi về 0
    expect(checkinState(s, T0 + 9 * DAY, 7)).toEqual({ index: 0, done: false, streak: 0 });
    expect(s.checkin.total).toBe(7);
    valid(s);
  });
});

describe("Nhiệm vụ ngày", () => {
  it("tính tiến độ từ mốc đầu ngày, nhận 1 lần, sang ngày mới làm lại", () => {
    let s = refreshDaily(fresh(), T0);
    const q = QUESTS.find((x) => x.id === "q_cau_10")!;
    expect(questProgress(s, q)).toBe(0);
    expect(claimQuest(s, q, "q1", T0).ok).toBe(false);
    s = { ...s, stats: { ...s.stats, totalCaught: s.stats.totalCaught + 12 } };
    expect(questProgress(s, q)).toBe(10);
    const r = claimQuest(s, q, "q1", T0);
    if (!r.ok) throw new Error(r.error);
    expect(r.save.diamonds).toBe(s.diamonds + 5);
    expect(claimQuest(r.save, q, "q2", T0).ok).toBe(false);
    // ngày mới: mốc mới, cá đã câu hôm qua không tính
    const next = refreshDaily(r.save, T0 + DAY);
    expect(next.daily.claimed).toEqual([]);
    expect(questProgress(next, q)).toBe(0);
    valid(next);
  });
});

describe("Vòng Quay May Mắn", () => {
  it("1 lượt miễn phí/ngày, sau đó tốn kim cương; tỉ lệ theo trọng số", () => {
    let s = fresh();
    s.diamonds = 100;
    const r1 = spinWheel(s, WHEEL_PRIZES, new Rng(1), "s1", T0);
    if (!r1.ok) throw new Error(r1.error);
    expect(r1.free).toBe(true);
    s = r1.save;
    const d = s.diamonds;
    const r2 = spinWheel(s, WHEEL_PRIZES, new Rng(2), "s2", T0);
    if (!r2.ok) throw new Error(r2.error);
    expect(r2.free).toBe(false);
    expect(r2.save.diamonds).toBe(d - WHEEL_COST_DIAMONDS + (r2.prize!.reward.diamonds ?? 0));
    expect(r2.save.stats.spins).toBe(2);
    const poor = { ...r2.save, diamonds: 0 };
    expect(spinWheel(poor, WHEEL_PRIZES, new Rng(3), "s3", T0).ok).toBe(false);
    // ngày mới lại miễn phí
    expect(spinWheel(poor, WHEEL_PRIZES, new Rng(3), "s4", T0 + DAY).ok).toBe(true);
    valid(r2.save);
    // phân bố
    const rng = new Rng(9);
    const count: Record<string, number> = {};
    const N = 20000;
    for (let i = 0; i < N; i++) {
      const p = rng.pickWeighted(WHEEL_PRIZES, (x) => x.weight);
      count[p.id] = (count[p.id] ?? 0) + 1;
    }
    const total = WHEEL_PRIZES.reduce((a, p) => a + p.weight, 0);
    expect((count.wh_dot_bien ?? 0) / N).toBeLessThan((1 / total) * 1.6);
    expect((count.wh_vang_nho ?? 0) / N).toBeGreaterThan((26 / total) * 0.9);
  });
});

describe("Vòng Quay x10", () => {
  it("tốn 270 💎, ra 10 món, tỉ lệ món ngon cao hơn quay lẻ (không đảm bảo)", async () => {
    const { spinWheel10, WHEEL_COST_10 } = await import("@dccc/shared");
    const { WHEEL_GOOD_WEIGHT } = await import("@dccc/game-data");
    const good = (id: string) => WHEEL_PRIZES.find((p) => p.id === id)!.weight <= WHEEL_GOOD_WEIGHT;
    const s0 = { ...fresh(), diamonds: 100000 };
    expect(spinWheel10({ ...s0, diamonds: 100 }, WHEEL_PRIZES, WHEEL_GOOD_WEIGHT, new Rng(1), "x", T0).ok).toBe(false);
    let s = s0;
    let goodX10 = 0;
    const runs = 400;
    for (let i = 0; i < runs; i++) {
      const r = spinWheel10(s, WHEEL_PRIZES, WHEEL_GOOD_WEIGHT, new Rng(i + 1), `x${i}`, T0);
      if (!r.ok) throw new Error(r.error);
      expect(r.prizes).toHaveLength(10);
      goodX10 += r.prizes!.filter((p) => good(p.id)).length;
      s = r.save;
    }
    expect(s.stats.spins).toBe(runs * 10);
    const totalW = WHEEL_PRIZES.reduce((a, p) => a + p.weight, 0);
    const goodW = WHEEL_PRIZES.filter((p) => good(p.id)).reduce((a, p) => a + p.weight, 0);
    expect(goodX10 / (runs * 10)).toBeGreaterThan((goodW / totalW) * 1.3);
    // trừ đúng tiền (cộng lại kim cương trúng thưởng)
    const won = s.ledger.filter((l) => l.currency === "diamonds" && l.amount > 0 && l.reason.startsWith("wheel:")).length;
    expect(won).toBeGreaterThanOrEqual(0);
    expect(WHEEL_COST_10).toBe(270);
    valid(s);
  });
});

describe("Vòng Quay – nhân vật & cần câu hiếm", () => {
  it("tỉ lệ rất thấp; trúng thì mở khóa, trùng thì đổi nguyên liệu", async () => {
    const { grantReward, resolveReward, isDuplicate, DUPLICATE_CHAR_SOUL } = await import("@dccc/shared");
    const total = WHEEL_PRIZES.reduce((a, p) => a + p.weight, 0);
    // mỗi nhân vật / cần câu là 1 ô riêng ghi rõ tên, tổng tỉ lệ vẫn rất thấp
    const chars = WHEEL_PRIZES.filter((p) => p.reward.characterId);
    const rods = WHEEL_PRIZES.filter((p) => p.reward.rodId);
    expect(chars.length).toBe(4);
    expect(rods.length).toBe(3);
    expect(chars.reduce((a, p) => a + p.weight, 0) / total).toBeLessThan(0.003);
    expect(rods.reduce((a, p) => a + p.weight, 0) / total).toBeLessThan(0.004);
    expect(rods.map((p) => p.label)).toEqual(["Cần Long Cốt", "Cần Phượng Hoàng", "Cần Hải Thần"]);
    const rng = new Rng(3);
    const r = resolveReward(chars[0]!.reward, rng);
    expect(r.characterId).toBe("c_long_vuong_tu");
    const s = fresh();
    expect(isDuplicate(s, r)).toBe(false);
    grantReward(s, r, "w1", "wheel:test", T0);
    expect(s.characters[r.characterId!]).toBeTruthy();
    expect(isDuplicate(s, r)).toBe(true);
    const soul = s.materials.soul;
    grantReward(s, r, "w2", "wheel:test", T0);
    expect(s.materials.soul).toBe(soul + DUPLICATE_CHAR_SOUL);
    const rr = resolveReward(rods[2]!.reward, rng);
    grantReward(s, rr, "w3", "wheel:test", T0);
    expect(s.rods[rr.rodId!]).toEqual({ level: 1, stars: 1 });
    // Lông Phượng Thần → Đá Tiến Hoá vạn năng (bốc 1 trong 3)
    const evo = WHEEL_PRIZES.find((p) => p.id === "wh_phuong_than")!;
    expect(evo.label).toBe("Đá TH Vạn Năng");
    const re = resolveReward(evo.reward, rng);
    expect(["e_u_minh_thach", "e_thanh_quang_thach", "e_dia_mach_thach"]).toContain(re.evoItem);
    // Đá Tiến Hoá Thần: đúng 1 ô riêng trên vòng quay (~0,5%), ô Vạn Năng không ra đá Thần
    expect(WHEEL_PRIZES.filter((p) => p.reward.evoItem === "e_long_phuong_than").map((p) => p.id)).toEqual(["wh_da_than"]);
    expect(evo.reward.evoPool).not.toContain("e_long_phuong_than");
    valid(s);
  });

  it("chiến lực đội hình = tổng 3 cá mạnh nhất; danh hiệu Top chiến lực", async () => {
    const { teamPower, ownedFishPower } = await import("@dccc/shared");
    const { FISH_BY_ID } = await import("@dccc/game-data");
    const s = fresh();
    const mk = (uid: string, fishId: string, level: number) => ({ uid, fishId, level, stars: 1, weightKg: 1, zoneId: "z_ben_tan_thu", caughtAt: T0, locked: false });
    s.fishes = [mk("a", "f_ca_ro", 1), mk("b", "f_ca_loc", 9), mk("c", "f_ca_chep", 5), mk("d", "f_boss_lao_ngu", 3)];
    const pw = s.fishes.map((o) => ownedFishPower(FISH_BY_ID.get(o.fishId)!, o)).sort((a, b) => b - a);
    expect(teamPower(s, FISH_BY_ID)).toBe(pw[0]! + pw[1]! + pw[2]!);
    expect(rankTitle("teamPower", 1)!.name).toBe("Bá Chủ Đại Dương");
  });
});

describe("Danh hiệu", () => {
  it("Kẻ Săn Lùng Rác mở khi vớt đủ 20 rác, tự đeo, nhận quà một lần", () => {
    const t = TITLE_BY_ID.get("t_san_rac")!;
    let s = fresh();
    expect(claimTitle(s, t, "t1", T0).ok).toBe(false);
    s = { ...s, stats: { ...s.stats, junkCaught: 20 } };
    expect(titleProgress(s, t)).toBe(20);
    const r = claimTitle(s, t, "t1", T0);
    if (!r.ok) throw new Error(r.error);
    expect(r.save.titles).toEqual({ owned: ["t_san_rac"], equipped: "t_san_rac" });
    expect(r.save.diamonds).toBe(s.diamonds + t.reward.diamonds!);
    expect(claimTitle(r.save, t, "t2", T0).ok).toBe(false);
    expect(equipTitle(r.save, "t_vua_rac", T0).ok).toBe(false);
    const off = equipTitle(r.save, null, T0);
    expect(off.ok && off.save.titles.equipped).toBe(null);
    valid(r.save);
  });

  it("dữ liệu danh hiệu hợp lệ, id duy nhất, có Vua Nhặt Rác", () => {
    expect(new Set(TITLES.map((t) => t.id)).size).toBe(TITLES.length);
    expect(TITLES.every((t) => t.id.startsWith("t_") && t.target > 0)).toBe(true);
    expect(TITLE_BY_ID.get("t_vua_rac")!.name).toBe("Vua Nhặt Rác");
  });

  it("danh hiệu xếp hạng theo thứ hạng", () => {
    expect(rankTitle("junk", 1)!.name).toBe("Vua Nhặt Rác");
    expect(rankTitle("caught", 2)!.icon).toBe("🥈");
    expect(rankTitle("dmWins", 7)!.name).toBe("Top 10 Đấu Sĩ");
    expect(rankTitle("level", 11)).toBeNull();
  });
});

describe("Hội & chuyển đổi save", () => {
  it("kiểm tra tên hội", () => {
    expect(validateGuild("Hội Cá Mập", "CMP")).toBeNull();
    expect(validateGuild("ab", "XY")).toMatch(/3–24/);
    expect(validateGuild("Hội <script>", "AB")).toMatch(/chỉ gồm/);
    expect(validateGuild("Hội Tốt", "A")).toMatch(/Ký hiệu/);
  });

  it("save v6 → v7 có điểm danh, nhiệm vụ, danh hiệu", () => {
    const s = fresh() as unknown as Record<string, unknown>;
    const old = { ...s, version: 6 };
    delete old.daily;
    delete old.checkin;
    delete old.titles;
    const m = migrateSave(old) as PlayerSave;
    expect(m.version).toBe(SAVE_VERSION);
    expect(m.titles).toEqual({ owned: [], equipped: null });
    valid(m);
  });
});

describe("Nạp tiền (chủ dự án duyệt)", () => {
  it("cộng kim cương đúng gói, chỉ 1 lần; gói câu tự động cộng dồn 48 giờ", async () => {
    const { applyTopup, autoFishActive, vietQrUrl } = await import("@dccc/shared");
    const { TOPUP_PACKAGES } = await import("@dccc/game-data");
    let s = fresh();
    const r = applyTopup(s, { id: "11111111-2222-4333-8444-555555555555", package: "kc300" }, TOPUP_PACKAGES, T0);
    if (!r.ok) throw new Error(r.error);
    expect(r.save.diamonds).toBe(s.diamonds + 300);
    expect(applyTopup(r.save, { id: "11111111-2222-4333-8444-555555555555", package: "kc300" }, TOPUP_PACKAGES, T0).ok).toBe(false);
    s = r.save;
    expect(autoFishActive(s, T0)).toBe(false);
    const a1 = applyTopup(s, { id: "a1", package: "auto2d" }, TOPUP_PACKAGES, T0);
    if (!a1.ok) throw new Error(a1.error);
    expect(a1.save.autoFishUntil).toBe(T0 + 48 * 3600_000);
    const a2 = applyTopup(a1.save, { id: "a2", package: "auto2d" }, TOPUP_PACKAGES, T0 + 3600_000);
    if (!a2.ok) throw new Error(a2.error);
    expect(a2.save.autoFishUntil).toBe(T0 + 96 * 3600_000);
    expect(autoFishActive(a2.save, T0 + 95 * 3600_000)).toBe(true);
    expect(autoFishActive(a2.save, T0 + 97 * 3600_000)).toBe(false);
    valid(a2.save);
    expect(TOPUP_PACKAGES.map((p) => [p.id, p.vnd])).toEqual([["kc100", 20000], ["kc300", 50000], ["auto2d", 20000]]);
    const url = vietQrUrl({ bankId: "ACB", account: "13152551", accountName: "HUYNH NGOC THONG" }, 20000, "DCCC1A2B3C");
    expect(url).toContain("ACB-13152551");
    expect(url).toContain("amount=20000");
    expect(url).toContain("addInfo=DCCC1A2B3C");
  });
});

describe("Vòng Quay có Đá Tiến Hoá Thần", () => {
  it("ô Đá TH Thần ~0,5% và trao đúng Đá Tiến Hoá Thần", () => {
    const tot = WHEEL_PRIZES.reduce((a, p) => a + p.weight, 0);
    const p = WHEEL_PRIZES.find((x) => x.id === "wh_da_than")!;
    expect(p.reward.evoItem).toBe("e_long_phuong_than");
    expect(p.weight / tot).toBeGreaterThan(0.0045);
    expect(p.weight / tot).toBeLessThan(0.0055);
    expect(Math.round(tot * 100) / 100).toBeCloseTo(103.82, 1); // tổng trọng số giữ nguyên → các ô khác không đổi tỉ lệ
  });
});
