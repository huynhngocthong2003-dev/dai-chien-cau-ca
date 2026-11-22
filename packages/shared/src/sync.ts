/**
 * Quy tắc chọn bản lưu khi đăng nhập tài khoản online (thuần túy, có test).
 */
import type { PlayerSave } from "./save.ts";

export interface SyncDecision {
  /** Bản sẽ dùng sau khi đăng nhập. */
  use: "local" | "remote";
  /** Có cần tải bản đang dùng lên máy chủ không. */
  upload: boolean;
  /** Có cần cất bản trên máy làm bản sao lưu (vì sắp bị thay) không. */
  backupLocal: boolean;
  reason: string;
}

export function decideSync(local: PlayerSave, remote: PlayerSave | null): SyncDecision {
  if (!remote) {
    return { use: "local", upload: true, backupLocal: false, reason: "Tài khoản mới – tiến trình trên máy được lưu vào tài khoản" };
  }
  if (remote.playerId === local.playerId) {
    // Cùng tài khoản trên 2 máy: TIẾN TRÌNH (cấp, số cá) quyết định trước, thời gian lưu chỉ để phân xử khi ngang nhau.
    // (Máy để lâu không mở có thể có updatedAt mới hơn do nhận quà/điểm danh, nhưng tiến trình cũ hơn.)
    const p = compareProgress(local, remote);
    if (isNewerReset(local, remote)) {
      return { use: "local", upload: true, backupLocal: false, reason: "Đã chơi lại từ đầu – cập nhật lên tài khoản" };
    }
    if (p > 0 && !isNewerReset(remote, local)) {
      return { use: "local", upload: true, backupLocal: false, reason: "Tiến trình trên máy cao hơn – đã cập nhật lên tài khoản" };
    }
    if (p < 0 && !isNewerReset(local, remote)) {
      return { use: "remote", upload: false, backupLocal: true, reason: "Đã tải tiến trình mới nhất từ tài khoản" };
    }
    if (p === 0 && local.updatedAt > remote.updatedAt) {
      return { use: "local", upload: true, backupLocal: false, reason: "Tiến trình trên máy mới hơn – đã cập nhật lên tài khoản" };
    }
    return { use: "remote", upload: false, backupLocal: false, reason: "Đã tải tiến trình từ tài khoản" };
  }
  // Hai tiến trình khác nhau: ưu tiên tài khoản, cất bản trên máy để không mất.
  const localIsFresh = local.stats.totalCaught === 0 && local.level <= 1;
  return {
    use: "remote",
    upload: false,
    backupLocal: !localIsFresh,
    reason: localIsFresh ? "Đã tải tiến trình từ tài khoản" : "Đã tải tiến trình từ tài khoản (tiến trình cũ trên máy đã được cất sao lưu)",
  };
}

/** So tiến trình: >0 nếu a tiến xa hơn b (cấp trước, rồi tổng số cá đã câu). */
export function compareProgress(a: PlayerSave, b: PlayerSave): number {
  if (a.level !== b.level) return a.level - b.level;
  return a.stats.totalCaught - b.stats.totalCaught;
}

/** a là bản "chơi lại từ đầu" mới hơn b (thấp cấp hơn nhưng là chủ ý của người chơi). */
function isNewerReset(a: PlayerSave, b: PlayerSave): boolean {
  return (a.resetAt ?? 0) > (b.resetAt ?? 0);
}

/** Lỗi máy chủ báo bản trên máy cũ hơn tài khoản (máy kia đã chơi tiếp). */
export function isStaleSaveError(message: string | null | undefined): boolean {
  return !!message && message.includes("STALE_SAVE");
}
