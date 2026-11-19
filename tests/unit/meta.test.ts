import { describe, expect, it } from "vitest";
import {
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
    expect((count.wh_vang_nho ?? 0) / N).toBeGreaterThan((30 / total) * 0.9);
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
    expect(m.version).toBe(7);
    expect(m.titles).toEqual({ owned: [], equipped: null });
    valid(m);
  });
});
