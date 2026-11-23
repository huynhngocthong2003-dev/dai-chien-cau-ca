import { describe, expect, it } from "vitest";
import { CATALOG } from "@dccc/game-data";
import { TUTORIAL_REWARD, advanceTutorial, createNewSave, finishTutorial, tutorialStep } from "@dccc/shared";
import { parseSave } from "@dccc/validation";

const fresh = () => createNewSave("p1", "Tân Thủ", CATALOG, 1);

describe("hướng dẫn tân thủ", () => {
  it("tài khoản mới bắt đầu hướng dẫn; bản lưu cũ (không có tutorial) chơi tự do", () => {
    expect(tutorialStep(fresh())).toBe("welcome");
    const old = fresh();
    delete old.tutorial;
    expect(tutorialStep(old)).toBeNull();
    expect(parseSave(JSON.parse(JSON.stringify(fresh()))).ok).toBe(true);
  });
  it("chỉ chuyển bước khi đang đúng bước; có thể quay lại bước quăng cần khi câu hụt", () => {
    let s = fresh();
    s = advanceTutorial(s, "go_fish"); // sai bước → không đổi
    expect(tutorialStep(s)).toBe("welcome");
    for (const st of ["welcome", "go_fish", "pick_zone", "cast", "hook"] as const) s = advanceTutorial(s, st);
    expect(tutorialStep(s)).toBe("reel");
    s = advanceTutorial(s, ["hook", "reel"], "cast"); // cá thoát → quăng lại
    expect(tutorialStep(s)).toBe("cast");
  });
  it("xong đủ bước → nhận quà 1 lần (ghi sổ); bỏ qua → chơi tự do, không quà", () => {
    let s = fresh();
    expect(finishTutorial(s, "tut_1", 5, false).ok).toBe(false); // chưa tới bước cuối
    for (const st of ["welcome", "go_fish", "pick_zone", "cast", "hook", "reel", "to_bag", "bag"] as const) s = advanceTutorial(s, st);
    expect(tutorialStep(s)).toBe("tour");
    const r = finishTutorial(s, "tut_1", 5, false);
    if (!r.ok) throw new Error(r.error);
    expect(r.save.gold - s.gold).toBe(TUTORIAL_REWARD.gold);
    expect(r.save.diamonds - s.diamonds).toBe(TUTORIAL_REWARD.diamonds);
    expect(r.save.ledger.filter((l) => l.txId === "tut_1")).toHaveLength(3);
    expect(tutorialStep(r.save)).toBeNull();
    expect(finishTutorial(r.save, "tut_2", 6, false).ok).toBe(false);
    const sk = finishTutorial(fresh(), "tut_3", 5, true);
    if (!sk.ok) throw new Error(sk.error);
    expect(sk.save.gold).toBe(fresh().gold);
    expect(tutorialStep(sk.save)).toBeNull();
  });
});
