/**
 * HƯỚNG DẪN TÂN THỦ: chỉ tài khoản mới (bản lưu có `tutorial`) mới phải đi qua; bản lưu cũ = chơi tự do.
 * Các bước theo thứ tự; xong bước cuối → nhận quà (ghi sổ, txId riêng) → chơi tự do.
 */
import { addLedger, clone, markTx, type ActionResult, type PlayerSave } from "./save.ts";

export const TUTORIAL_STEPS = ["welcome", "go_fish", "pick_zone", "cast", "hook", "reel", "to_bag", "bag", "tour", "done"] as const;
export type TutorialStep = (typeof TUTORIAL_STEPS)[number];

/** Quà hoàn thành hướng dẫn. */
export const TUTORIAL_REWARD = { gold: 2000, diamonds: 30, stones: 20 } as const;

/** Bước hiện tại; null = chơi tự do (đã xong / bỏ qua / bản lưu cũ). */
export function tutorialStep(save: Pick<PlayerSave, "tutorial">): TutorialStep | null {
  const t = save.tutorial;
  if (!t || t.done || t.step === "done") return null;
  return (TUTORIAL_STEPS as readonly string[]).includes(t.step) ? (t.step as TutorialStep) : null;
}

/**
 * Chuyển bước: chỉ khi đang ở `from` (tránh nhảy bước khi sự kiện đến muộn).
 * `to` mặc định = bước kế tiếp. Không đổi → trả về chính bản lưu cũ.
 */
export function advanceTutorial(save: PlayerSave, from: TutorialStep | readonly TutorialStep[], to?: TutorialStep): PlayerSave {
  const cur = tutorialStep(save);
  const froms = typeof from === "string" ? [from] : from;
  if (!cur || !froms.includes(cur)) return save;
  const next = to ?? TUTORIAL_STEPS[TUTORIAL_STEPS.indexOf(cur) + 1]!;
  if (next === "done") return save; // kết thúc phải qua finishTutorial (có quà)
  const s = clone(save);
  s.tutorial = { step: next };
  return s;
}

/** Kết thúc hướng dẫn: xong đủ → nhận quà; bỏ qua → không quà. Chỉ 1 lần (txId). */
export function finishTutorial(save: PlayerSave, txId: string, now: number, skipped: boolean): ActionResult & { reward?: typeof TUTORIAL_REWARD } {
  const cur = tutorialStep(save);
  if (!cur) return { ok: false, error: "Đã hoàn thành hướng dẫn" };
  if (save.appliedTx.includes(txId)) return { ok: false, error: "Giao dịch trùng lặp" };
  if (!skipped && cur !== "tour") return { ok: false, error: "Chưa xong các bước hướng dẫn" };
  const s = clone(save);
  s.tutorial = { step: "done", done: true };
  if (!skipped) {
    s.gold += TUTORIAL_REWARD.gold;
    s.diamonds += TUTORIAL_REWARD.diamonds;
    s.materials.stones += TUTORIAL_REWARD.stones;
    addLedger(s, txId, "gold", TUTORIAL_REWARD.gold, "tutorial", now);
    addLedger(s, txId, "diamonds", TUTORIAL_REWARD.diamonds, "tutorial", now);
    addLedger(s, txId, "stones", TUTORIAL_REWARD.stones, "tutorial", now);
  }
  markTx(s, txId);
  s.updatedAt = now;
  return skipped ? { ok: true, save: s } : { ok: true, save: s, reward: TUTORIAL_REWARD };
}
