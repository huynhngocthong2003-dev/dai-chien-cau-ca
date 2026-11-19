/**
 * Nạp tiền (cách A – chủ dự án tự duyệt): người chơi tạo lệnh trên máy chủ, chuyển khoản đúng nội dung,
 * chủ dự án đối soát sao kê rồi duyệt. Máy chủ đánh dấu lệnh "đã nhận" đúng một lần; client áp phần thưởng
 * bằng hàm dưới đây (txId = mã lệnh nên không thể cộng 2 lần).
 */
import type { TopupPackageDef } from "./types.ts";
import { addLedger, clone, markTx, type ActionResult, type PlayerSave } from "./save.ts";

export interface ApprovedTopup {
  id: string;
  package: TopupPackageDef["id"];
}

export function applyTopup(save: PlayerSave, order: ApprovedTopup, packages: TopupPackageDef[], now: number): ActionResult & { pkg?: TopupPackageDef } {
  const txId = `topup_${order.id}`.slice(0, 64);
  if (save.appliedTx.includes(txId) || save.ledger.some((l) => l.txId === txId)) return { ok: false, error: "Lệnh nạp đã được cộng" };
  const pkg = packages.find((p) => p.id === order.package);
  if (!pkg) return { ok: false, error: "Gói nạp không tồn tại" };
  const s = clone(save);
  if (pkg.diamonds) {
    s.diamonds += pkg.diamonds;
    addLedger(s, txId, "diamonds", pkg.diamonds, `topup:${pkg.id}`, now);
  }
  if (pkg.autoFishHours) {
    s.autoFishUntil = Math.max(now, s.autoFishUntil) + pkg.autoFishHours * 3600_000;
    addLedger(s, txId, "xp", 0, `topup:${pkg.id}`, now);
  }
  markTx(s, txId);
  s.updatedAt = now;
  return { ok: true, save: s, pkg };
}

export function autoFishActive(save: PlayerSave, now: number): boolean {
  return save.autoFishUntil > now;
}

/** Nội dung QR VietQR (ảnh do img.vietqr.io tạo theo chuẩn NAPAS). */
export function vietQrUrl(bank: { bankId: string; account: string; accountName: string }, amount: number, memo: string): string {
  const q = new URLSearchParams({ amount: String(amount), addInfo: memo, accountName: bank.accountName });
  return `https://img.vietqr.io/image/${encodeURIComponent(bank.bankId)}-${encodeURIComponent(bank.account)}-compact2.png?${q.toString()}`;
}
