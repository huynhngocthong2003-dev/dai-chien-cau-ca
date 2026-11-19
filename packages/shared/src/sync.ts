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
    if (local.updatedAt > remote.updatedAt) {
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
