import { applyReward, type HeroArenaSave, type MailMessage } from "./save.ts";
import type { RewardPayload } from "./types.ts";

// Hòm thư: thông báo + quà đính kèm, hạn dùng, đã đọc / đã nhận.

const DAY = 24 * 60 * 60 * 1000;

export interface SystemMail {
  id: string;
  sender: string;
  title: string;
  body: string;
  /** Thời hạn sau khi gửi (ms). */
  ttl: number;
  reward?: RewardPayload;
}

export const SYSTEM_MAILS: readonly SystemMail[] = [
  {
    id: "mail_welcome_01",
    sender: "Hội Đồng Đấu Trường",
    title: "Chào mừng đến với HERO ARENA",
    body: "Vòng bo sẽ biến đổi môi trường theo từng vùng: sương độc ở Rừng/Đền, bão cát ở Sa Mạc/Làng, đất đóng băng ở Núi/Sông Băng. Sống sót đến cuối để trở thành The Last Hero!",
    ttl: 14 * DAY,
    reward: { gold: 300, items: [{ itemId: "mana_potion_small", quantity: 3 }] },
  },
  {
    id: "mail_rules_01",
    sender: "Hội Đồng Đấu Trường",
    title: "Luật đấu trường",
    body: "20 anh hùng, chết là bị loại vĩnh viễn. Cấp tối đa 15. Ở cấp 5 bạn phải khóa 1 trong 3 nhánh chuyên môn. Mỗi lần lên cấp chọn 1 trong 3 thẻ nâng cấp ngẫu nhiên.",
    ttl: 30 * DAY,
  },
];

/** Gửi thư hệ thống còn thiếu (mỗi thư một lần trong đời tài khoản). */
export function syncSystemMails(save: HeroArenaSave, now: number): number {
  let added = 0;
  for (const m of SYSTEM_MAILS) {
    if (save.seededMails.includes(m.id)) continue;
    sendMail(save, { id: m.id, sender: m.sender, title: m.title, body: m.body, sentAt: now, expiresAt: now + m.ttl, reward: m.reward });
    save.seededMails.push(m.id);
    added += 1;
  }
  return added;
}

export function sendMail(save: HeroArenaSave, mail: Omit<MailMessage, "isRead" | "isClaimed">): MailMessage | null {
  if (save.mails.some((m) => m.id === mail.id)) return null;
  const full: MailMessage = { ...mail, isRead: false, isClaimed: false };
  save.mails.unshift(full);
  return full;
}

export function listMails(save: HeroArenaSave, now: number): MailMessage[] {
  return save.mails.filter((m) => now <= m.expiresAt);
}

export function unreadCount(save: HeroArenaSave, now: number): number {
  return listMails(save, now).filter((m) => !m.isRead).length;
}

export function unclaimedCount(save: HeroArenaSave, now: number): number {
  return listMails(save, now).filter((m) => !!m.reward && !m.isClaimed).length;
}

export function markAsRead(save: HeroArenaSave, mailId: string): boolean {
  const m = save.mails.find((x) => x.id === mailId);
  if (!m) return false;
  m.isRead = true;
  return true;
}

export function claimMailReward(save: HeroArenaSave, mailId: string, now: number): { success: boolean; message: string } {
  const m = save.mails.find((x) => x.id === mailId);
  if (!m) return { success: false, message: "Không tìm thấy thư." };
  if (now > m.expiresAt) return { success: false, message: "Thư đã hết hạn." };
  if (!m.reward) return { success: false, message: "Thư không có quà đính kèm." };
  if (m.isClaimed) return { success: false, message: "Quà trong thư đã được nhận." };
  if (!applyReward(save, `mail:${m.id}`, m.reward, `Thư: ${m.title}`, now)) return { success: false, message: "Quà trong thư đã được nhận." };
  m.isClaimed = true;
  m.isRead = true;
  return { success: true, message: `Đã nhận quà từ thư: ${m.title}` };
}

export function claimAllMailRewards(save: HeroArenaSave, now: number): { claimedCount: number; messages: string[] } {
  const messages: string[] = [];
  for (const m of listMails(save, now)) {
    if (!m.reward || m.isClaimed) continue;
    const r = claimMailReward(save, m.id, now);
    if (r.success) messages.push(r.message);
  }
  return { claimedCount: messages.length, messages };
}

/** Xóa thư đã đọc & không còn quà chưa nhận, cùng thư hết hạn. */
export function deleteReadMails(save: HeroArenaSave, now: number): number {
  const before = save.mails.length;
  save.mails = save.mails.filter((m) => now <= m.expiresAt && (!m.isRead || (!!m.reward && !m.isClaimed)));
  return before - save.mails.length;
}
