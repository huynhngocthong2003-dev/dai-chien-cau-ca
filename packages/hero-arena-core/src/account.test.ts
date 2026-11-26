import { describe, expect, it } from "vitest";
import {
  accountLevel,
  applyMatchResult,
  applyReward,
  availableGifts,
  claimAllMailRewards,
  claimGiftByCode,
  claimGiftById,
  claimMailReward,
  claimTutorialReward,
  completeTutorialStep,
  createSave,
  currentTutorialStep,
  deleteReadMails,
  GIFT_PACKAGES,
  listMails,
  parseSave,
  potionsAvailable,
  resetTutorial,
  skipTutorial,
  syncSystemMails,
  TUTORIAL_STEPS,
  unclaimedCount,
  unreadCount,
} from "./index.ts";

const NOW = Date.UTC(2026, 10, 27);

describe("sổ cái tài nguyên", () => {
  it("mỗi txId chỉ áp dụng một lần và được ghi sổ", () => {
    const s = createSave("u1", "A", NOW);
    expect(applyReward(s, "t1", { gold: 100, items: [{ itemId: "x", quantity: 2 }] }, "test", NOW)).toBe(true);
    expect(applyReward(s, "t1", { gold: 100 }, "test", NOW)).toBe(false);
    expect(s.inventory.gold).toBe(1100);
    expect(s.inventory.items.x).toBe(2);
    expect(s.ledger).toHaveLength(1);
    expect(s.ledger[0]!.txId).toBe("t1");
  });

  it("không cho trừ quá số đang có", () => {
    const s = createSave("u1", "A", NOW);
    expect(applyReward(s, "t2", { gems: -51 }, "mua", NOW)).toBe(false);
    expect(s.inventory.gems).toBe(50);
    expect(applyReward(s, "t3", { gems: -50 }, "mua", NOW)).toBe(true);
    expect(s.inventory.gems).toBe(0);
  });

  it("cấp tài khoản", () => {
    expect(accountLevel(0).level).toBe(1);
    expect(accountLevel(400).level).toBe(2);
    expect(accountLevel(399).level).toBe(1);
  });
});

describe("quà tặng", () => {
  it("mã quà: không phân biệt hoa thường, nhận 1 lần", () => {
    const s = createSave("u1", "A", NOW);
    expect(claimGiftByCode(s, "  heroarena2026 ", NOW).success).toBe(true);
    expect(s.inventory.gold).toBe(1800);
    expect(s.inventory.gems).toBe(200);
    expect(s.inventory.items.health_potion_medium).toBe(3);
    expect(claimGiftByCode(s, "HEROARENA2026", NOW).success).toBe(false);
    expect(claimGiftByCode(s, "SAI", NOW).message).toContain("không hợp lệ");
    expect(claimGiftByCode(s, "", NOW).success).toBe(false);
  });

  it("quà chỉ-nhập-mã không nhận trực tiếp được; quà hết hạn bị từ chối", () => {
    const s = createSave("u1", "A", NOW);
    expect(claimGiftById(s, "welcome_pack_2026", NOW).success).toBe(false);
    const listed = availableGifts(s, NOW);
    expect(listed.map((g) => g.id)).toEqual(["launch_login_gift"]);
    expect(claimGiftById(s, "launch_login_gift", NOW).success).toBe(true);
    expect(availableGifts(s, NOW)).toHaveLength(0);
    const late = GIFT_PACKAGES.find((g) => g.id === "last_hero_event")!.expiresAt + 1;
    expect(claimGiftByCode(s, "LASTHERO", late).message).toContain("hết hạn");
  });
});

describe("hòm thư", () => {
  it("thư hệ thống gửi 1 lần, nhận quà 1 lần, đếm đúng", () => {
    const s = createSave("u1", "A", NOW);
    expect(syncSystemMails(s, NOW)).toBe(2);
    expect(syncSystemMails(s, NOW)).toBe(0);
    expect(unreadCount(s, NOW)).toBe(2);
    expect(unclaimedCount(s, NOW)).toBe(1);
    const r = claimMailReward(s, "mail_welcome_01", NOW);
    expect(r.success).toBe(true);
    expect(s.inventory.gold).toBe(1300);
    expect(claimMailReward(s, "mail_welcome_01", NOW).success).toBe(false);
    expect(claimMailReward(s, "mail_rules_01", NOW).message).toContain("không có quà");
    expect(unreadCount(s, NOW)).toBe(1);
  });

  it("nhận tất cả, xóa thư đã đọc; xóa rồi không gửi lại", () => {
    const s = createSave("u1", "A", NOW);
    syncSystemMails(s, NOW);
    expect(claimAllMailRewards(s, NOW).claimedCount).toBe(1);
    expect(claimAllMailRewards(s, NOW).claimedCount).toBe(0);
    expect(deleteReadMails(s, NOW)).toBe(1); // chỉ thư đã đọc & đã nhận
    expect(listMails(s, NOW)).toHaveLength(1);
    expect(syncSystemMails(s, NOW)).toBe(0);
  });

  it("thư hết hạn không nhận được quà", () => {
    const s = createSave("u1", "A", NOW);
    syncSystemMails(s, NOW);
    const m = s.mails.find((x) => x.id === "mail_welcome_01")!;
    expect(claimMailReward(s, m.id, m.expiresAt + 1).message).toContain("hết hạn");
    expect(listMails(s, m.expiresAt + 1).some((x) => x.id === m.id)).toBe(false);
  });
});

describe("hướng dẫn tân thủ", () => {
  it("đủ bước mới có thưởng, thưởng 1 lần kể cả khi làm lại", () => {
    const s = createSave("u1", "A", NOW);
    expect(currentTutorialStep(s)?.id).toBe("select_hero_and_gender");
    expect(claimTutorialReward(s, NOW).success).toBe(false);
    for (const st of TUTORIAL_STEPS) completeTutorialStep(s, st.id);
    expect(currentTutorialStep(s)).toBeNull();
    expect(claimTutorialReward(s, NOW).success).toBe(true);
    expect(s.inventory.items.health_potion_small).toBe(5);
    resetTutorial(s);
    for (const st of TUTORIAL_STEPS) completeTutorialStep(s, st.id);
    expect(claimTutorialReward(s, NOW).success).toBe(false);
  });

  it("bỏ qua thì không có thưởng", () => {
    const s = createSave("u1", "A", NOW);
    skipTutorial(s);
    expect(currentTutorialStep(s)).toBeNull();
    expect(claimTutorialReward(s, NOW).success).toBe(false);
  });
});

describe("thưởng trận & lưu trữ", () => {
  it("thưởng theo hạng, trừ bình máu kho đã dùng, chống nhận trùng", () => {
    const s = createSave("u1", "A", NOW);
    applyReward(s, "seed", { items: [{ itemId: "health_potion_small", quantity: 1 }, { itemId: "health_potion_medium", quantity: 2 }] }, "t", NOW);
    expect(potionsAvailable(s)).toBe(3);
    const r = applyMatchResult(s, { matchId: "m1", placement: 1, kills: 3, level: 12, won: true, storePotionsUsed: 2, lootGold: 50 }, NOW);
    expect(r).not.toBeNull();
    expect(r!.gems).toBe(30);
    expect(s.inventory.items.health_potion_small).toBeUndefined();
    expect(s.inventory.items.health_potion_medium).toBe(1);
    expect(s.stats).toEqual({ matches: 1, wins: 1, kills: 3, bestPlacement: 1 });
    expect(applyMatchResult(s, { matchId: "m1", placement: 1, kills: 3, level: 12, won: true, storePotionsUsed: 0, lootGold: 0 }, NOW)).toBeNull();
    expect(s.stats.matches).toBe(1);
  });

  it("lưu → đọc lại giữ nguyên; dữ liệu hỏng bị từ chối", () => {
    const s = createSave("u1", "Anh Hùng", NOW);
    syncSystemMails(s, NOW);
    claimGiftByCode(s, "HEROARENA2026", NOW);
    completeTutorialStep(s, "lock_branch_at_lv5");
    s.lastHero = { heroId: "mage", gender: "female" };
    const back = parseSave(JSON.stringify(s));
    expect(back).toEqual(s);
    expect(parseSave("{not json")).toBeNull();
    expect(parseSave(JSON.stringify({ version: 99 }))).toBeNull();
    const evil = JSON.parse(JSON.stringify(s));
    evil.inventory.gold = -500;
    evil.tutorial.completed.push("hack");
    const fixed = parseSave(JSON.stringify(evil))!;
    expect(fixed.inventory.gold).toBe(0);
    expect(fixed.tutorial.completed).toEqual(["lock_branch_at_lv5"]);
  });
});
