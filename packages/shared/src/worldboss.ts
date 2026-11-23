/**
 * BOSS THẾ GIỚI – logic thuần (chạy cả máy chủ Edge Function `world-boss` lẫn game, có test).
 *  - Xuất hiện 12h · 15h · 20h (giờ Việt Nam, UTC+7), mỗi lần 30 phút; mọi người chơi đánh chung 1 thanh máu.
 *  - Boss xoay vòng 7 con (7 hệ) theo ngày + khung giờ.
 *  - Mỗi lượt vào đánh: đội 3 cá, 15 đòn canh kim (máy chủ xét thời điểm bấm như trận 3vs3); tối đa 3 lượt / khung giờ.
 *  - Hết giờ / hạ boss: xếp hạng theo TỔNG SÁT THƯƠNG → quà theo hạng (gửi Hòm Thư);
 *    người KẾT LIỄU nhận thêm 1 Đá Tiến Hoá đúng hệ của boss.
 */
import type { Element } from "./types.ts";
import { TIMING_MULT, type CombatFish, type TimingZone } from "./combat.ts";
import { multiMatchup } from "./elements.ts";
import { ELEMENT_EVO_ITEM } from "./progression.ts";
import type { MailReward } from "./mail.ts";

export interface WorldBossDef {
  id: string;
  name: string;
  title: string;
  element: Element;
  /** Phòng thủ: trừ vào mỗi đòn của từng con cá. */
  def: number;
  description: string;
}

export const WORLD_BOSS = {
  /** Giờ bắt đầu theo giờ Việt Nam. */
  hours: [12, 15, 20] as const,
  durationMin: 30,
  tzOffsetMin: 7 * 60,
  /** Máu theo khung giờ (20h đông người → trâu hơn). */
  maxHp: [800_000, 800_000, 1_200_000] as const,
  hitsPerEntry: 15,
  entriesPerSlot: 3,
} as const;

export interface WorldBossSlot {
  /** Mã khung giờ: "YYYY-MM-DD-HH" (giờ Việt Nam). */
  key: string;
  dayIndex: number;
  slotIndex: number;
  startsAt: number;
  endsAt: number;
  /** Đang diễn ra (now trong [startsAt, endsAt)). */
  live: boolean;
}

const DAY = 86_400_000;
const pad = (n: number) => String(n).padStart(2, "0");

function slotAt(dayIndex: number, slotIndex: number): Omit<WorldBossSlot, "live"> {
  const tz = WORLD_BOSS.tzOffsetMin * 60_000;
  const startsAt = dayIndex * DAY + WORLD_BOSS.hours[slotIndex]! * 3_600_000 - tz;
  const d = new Date(dayIndex * DAY);
  const key = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}-${pad(WORLD_BOSS.hours[slotIndex]!)}`;
  return { key, dayIndex, slotIndex, startsAt, endsAt: startsAt + WORLD_BOSS.durationMin * 60_000 };
}

/** Khung giờ đang diễn ra, hoặc khung giờ kế tiếp nếu chưa tới. */
export function worldBossSlot(now: number): WorldBossSlot {
  const tz = WORLD_BOSS.tzOffsetMin * 60_000;
  const day = Math.floor((now + tz) / DAY);
  for (const d of [day, day + 1]) {
    for (let i = 0; i < WORLD_BOSS.hours.length; i++) {
      const s = slotAt(d, i);
      if (now < s.endsAt) return { ...s, live: now >= s.startsAt };
    }
  }
  return { ...slotAt(day + 1, 0), live: false };
}

/** Boss của khung giờ: xoay vòng 7 con theo ngày + khung. */
export function worldBossFor<T>(slot: Pick<WorldBossSlot, "dayIndex" | "slotIndex">, bosses: readonly T[]): T {
  const n = bosses.length;
  return bosses[(((slot.dayIndex * WORLD_BOSS.hours.length + slot.slotIndex) % n) + n) % n]!;
}

/** Máu tối đa của boss trong khung giờ. */
export function worldBossMaxHp(slot: Pick<WorldBossSlot, "slotIndex">): number {
  return WORLD_BOSS.maxHp[slot.slotIndex] ?? WORLD_BOSS.maxHp[0];
}

/** Sát thương 1 đòn của cả đội 3 cá lên boss: công × canh kim × khắc hệ − phòng thủ boss (mỗi con ≥ 1). */
export function wbHitDamage(team: Pick<CombatFish, "atk" | "element" | "elements" | "hidden">[], boss: Pick<WorldBossDef, "element" | "def">, zone: TimingZone): number {
  let total = 0;
  for (const f of team) {
    const els = [...(f.elements?.length ? f.elements : [f.element]), ...(f.hidden ? [f.hidden] : [])];
    const m = multiMatchup(els, [boss.element]).mult;
    total += Math.max(1, Math.round(f.atk * TIMING_MULT[zone] * m - boss.def));
  }
  return total;
}

/** Quà theo hạng sát thương (hạng 1 nhiều nhất). */
export function wbRankReward(rank: number): Omit<MailReward, "txId"> {
  if (rank <= 1) return { diamonds: 80, gold: 30_000, stones: 60, soul: 30 };
  if (rank <= 3) return { diamonds: 50, gold: 20_000, stones: 40, soul: 20 };
  if (rank <= 10) return { diamonds: 25, gold: 10_000, stones: 25, soul: 10 };
  return { diamonds: 10, gold: 4_000, stones: 10, soul: 4 };
}

/** Quà KẾT LIỄU: 1 Đá Tiến Hoá đúng hệ của boss + 20 kim cương. */
export function wbKillReward(element: Element): Omit<MailReward, "txId"> {
  return { diamonds: 20, evoItems: { [ELEMENT_EVO_ITEM[element]]: 1 } };
}
