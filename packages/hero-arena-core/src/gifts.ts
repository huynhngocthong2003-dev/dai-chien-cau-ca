import { applyReward, type HeroArenaSave } from "./save.ts";
import type { RewardPayload } from "./types.ts";

// Hệ thống quà tặng: gói quà (có thể kèm mã), giới hạn số lần nhận, hạn dùng.

export interface GiftPackage {
  id: string;
  code?: string;
  title: string;
  description: string;
  reward: RewardPayload;
  maxClaimsPerPlayer: number;
  /** Hạn dùng (Unix ms). */
  expiresAt: number;
  /** Quà nhận trực tiếp trong danh sách (false = chỉ nhập mã). */
  listed: boolean;
}

const DAY = 24 * 60 * 60 * 1000;
const LAUNCH = Date.UTC(2026, 10, 26); // 26/11/2026

export const GIFT_PACKAGES: readonly GiftPackage[] = [
  {
    id: "welcome_pack_2026",
    code: "HEROARENA2026",
    title: "Quà Tân Thủ Hero Arena",
    description: "Gói khởi đầu cho anh hùng mới gia nhập đấu trường 20 người.",
    reward: { gold: 800, gems: 150, items: [{ itemId: "health_potion_medium", quantity: 3 }] },
    maxClaimsPerPlayer: 1,
    expiresAt: LAUNCH + 28 * DAY,
    listed: false,
  },
  {
    id: "launch_login_gift",
    title: "Quà Ra Mắt",
    description: "Mừng đấu trường mở cửa – nhận ngay!",
    reward: { gold: 300, items: [{ itemId: "health_potion_small", quantity: 2 }] },
    maxClaimsPerPlayer: 1,
    expiresAt: LAUNCH + 60 * DAY,
    listed: true,
  },
  {
    id: "last_hero_event",
    code: "LASTHERO",
    title: "Sự Kiện The Last Hero",
    description: "Mã sự kiện: thêm Ngọc để thử mọi anh hùng.",
    reward: { gems: 80 },
    maxClaimsPerPlayer: 1,
    expiresAt: LAUNCH + 14 * DAY,
    listed: false,
  },
];

export interface ClaimResult {
  success: boolean;
  message: string;
}

export function giftClaimsUsed(save: HeroArenaSave, giftId: string): number {
  return save.giftClaims[giftId] ?? 0;
}

/** Quà đang nhận được trong danh sách (không gồm quà chỉ nhập mã). */
export function availableGifts(save: HeroArenaSave, now: number): GiftPackage[] {
  return GIFT_PACKAGES.filter((g) => g.listed && now <= g.expiresAt && giftClaimsUsed(save, g.id) < g.maxClaimsPerPlayer);
}

export function claimGiftById(save: HeroArenaSave, giftId: string, now: number, viaCode = false): ClaimResult {
  const gift = GIFT_PACKAGES.find((g) => g.id === giftId);
  if (!gift) return { success: false, message: "Không tìm thấy gói quà." };
  if (!gift.listed && !viaCode) return { success: false, message: "Quà này chỉ nhận bằng mã." };
  if (now > gift.expiresAt) return { success: false, message: "Gói quà đã hết hạn." };
  const used = giftClaimsUsed(save, gift.id);
  if (used >= gift.maxClaimsPerPlayer) return { success: false, message: "Bạn đã nhận đủ số lần cho quà này." };
  if (!applyReward(save, `gift:${gift.id}:${used + 1}`, gift.reward, `Quà: ${gift.title}`, now)) {
    return { success: false, message: "Quà đã được nhận." };
  }
  save.giftClaims[gift.id] = used + 1;
  return { success: true, message: `Đã nhận quà: ${gift.title}` };
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function claimGiftByCode(save: HeroArenaSave, code: string, now: number): ClaimResult {
  const c = normalizeCode(code);
  if (!c) return { success: false, message: "Hãy nhập mã quà tặng." };
  const gift = GIFT_PACKAGES.find((g) => g.code && g.code === c);
  if (!gift) return { success: false, message: "Mã quà tặng không hợp lệ." };
  return claimGiftById(save, gift.id, now, true);
}
