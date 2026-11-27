import { applyReward, type HeroArenaSave, type TutorialStepId } from "./save.ts";
import type { RewardPayload } from "./types.ts";

// Hướng dẫn tân thủ: chuỗi bước theo ngữ cảnh, bỏ qua / làm lại, thưởng khi hoàn thành.

export interface TutorialStep {
  id: TutorialStepId;
  title: string;
  instruction: string;
}

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  { id: "select_hero_and_gender", title: "Chọn Anh hùng", instruction: "Chọn 1 trong 10 lớp nhân vật rồi vào trận Battle Royale 20 người." },
  { id: "hunt_monsters_and_loot", title: "Săn quái & Thu thập", instruction: "Hạ quái để nhận KN, vàng, nguyên liệu, bình máu và trang bị." },
  { id: "lock_branch_at_lv5", title: "Khóa nhánh ở Cấp 5", instruction: "Đạt cấp 5 và chọn 1 nhánh chuyên môn cố định – không đổi được trong trận." },
  { id: "pick_random_upgrade", title: "Chọn 1 trong 3 thẻ", instruction: "Mỗi lần lên cấp, chọn 1 trong 3 thẻ nâng cấp ngẫu nhiên." },
  { id: "survive_zone_and_hazard", title: "Né vòng bo & Môi trường", instruction: "Xem bản đồ nhỏ, chạy vào vòng an toàn. Ngoài bo có sương độc, bão cát hoặc đất đóng băng." },
  { id: "claim_last_hero_victory", title: "Lọt Top 10", instruction: "Giao tranh tự do – chết là bị loại vĩnh viễn. Sống sót vào Top 10 (hoặc vô địch: The Last Hero)." },
];

export const TUTORIAL_REWARD: RewardPayload = { gold: 500, gems: 100, items: [{ itemId: "health_potion_small", quantity: 5 }] };

export function isStepDone(save: HeroArenaSave, id: TutorialStepId): boolean {
  return save.tutorial.completed.includes(id);
}

export function currentTutorialStep(save: HeroArenaSave): TutorialStep | null {
  if (save.tutorial.skipped) return null;
  return TUTORIAL_STEPS.find((s) => !isStepDone(save, s.id)) ?? null;
}

export function isTutorialAllCompleted(save: HeroArenaSave): boolean {
  return TUTORIAL_STEPS.every((s) => isStepDone(save, s.id));
}

/** Đánh dấu một bước xong (bất kể thứ tự – người chơi có thể làm trước). */
export function completeTutorialStep(save: HeroArenaSave, id: TutorialStepId): boolean {
  if (isStepDone(save, id)) return false;
  save.tutorial.completed.push(id);
  return true;
}

export function skipTutorial(save: HeroArenaSave): void {
  save.tutorial.skipped = true;
}

/** Xem lại hướng dẫn. Thưởng chỉ nhận một lần duy nhất. */
export function resetTutorial(save: HeroArenaSave): void {
  save.tutorial.skipped = false;
  save.tutorial.completed = [];
}

/** Thưởng chỉ khi làm đủ các bước (bỏ qua thì không có thưởng). */
export function claimTutorialReward(save: HeroArenaSave, now: number): { success: boolean; message: string } {
  if (!isTutorialAllCompleted(save)) return { success: false, message: "Bạn chưa hoàn thành hướng dẫn tân thủ." };
  if (save.tutorial.rewardClaimed) return { success: false, message: "Bạn đã nhận quà hoàn thành tân thủ." };
  if (!applyReward(save, "tutorial:complete", TUTORIAL_REWARD, "Hoàn thành hướng dẫn tân thủ", now)) {
    save.tutorial.rewardClaimed = true;
    return { success: false, message: "Bạn đã nhận quà hoàn thành tân thủ." };
  }
  save.tutorial.rewardClaimed = true;
  return { success: true, message: "Đã nhận thưởng hướng dẫn tân thủ!" };
}
