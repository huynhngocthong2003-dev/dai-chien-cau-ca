/**
 * BOSS THẾ GIỚI – logic thuần (chạy cả máy chủ Edge Function `world-boss` lẫn game, có test).
 *  - Xuất hiện 12h · 15h · 20h · 23h (giờ Việt Nam, UTC+7), mỗi lần 30 phút; mọi người chơi đánh chung 1 thanh máu.
 *  - Boss xoay vòng 7 con (7 hệ) theo ngày + khung giờ.
 *  - Mỗi lượt vào đánh: đội 3 cá, 15 đòn canh kim (máy chủ xét thời điểm bấm như trận 3vs3); tối đa 3 lượt / khung giờ.
 *  - Hết giờ / hạ boss: xếp hạng theo TỔNG SÁT THƯƠNG → quà theo hạng (gửi Hòm Thư);
 *    người KẾT LIỄU nhận thêm 1 Đá Tiến Hoá đúng hệ của boss.
 */
import type { Element } from "./types.ts";
import { TIMING_MULT, type CombatFish, type TimingZone } from "./combat.ts";
import { multiMatchup } from "./elements.ts";
import { ELEMENT_EVO_ITEM, ownedFishPower } from "./progression.ts";
import type { FishDef, FishFormDef } from "./types.ts";
import type { OwnedFish, PlayerSave } from "./save.ts";
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
  hours: [12, 15, 20, 23] as const,
  durationMin: 30,
  tzOffsetMin: 7 * 60,
  /** Máu theo khung giờ (20h đông người → trâu hơn). */
  maxHp: [800_000, 800_000, 1_200_000, 1_200_000] as const,
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
  // NGẪU NHIÊN mỗi khung giờ đúng 1 boss – băm tất định (máy chủ & máy khách ra cùng boss).
  // Trong cùng 1 ngày, khung sau LUÔN khác boss khung liền trước (bước nhảy 1..n-1).
  const n = bosses.length;
  const per = WORLD_BOSS.hours.length;
  const base = slot.dayIndex * per;
  let i = wbHash(base) % n;
  for (let j = 1; j <= slot.slotIndex && n > 1; j++) i = (i + 1 + (wbHash(base + j) % (n - 1))) % n;
  return bosses[i]!;
}

/** Băm số nguyên 32-bit (xáo trộn đều) – chọn boss ngẫu nhiên tất định theo khung giờ. */
function wbHash(x: number): number {
  let h = (x | 0) ^ 0x9e3779b9;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
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

/**
 * Đội đánh boss = đúng 3 CÁ TRƯNG BÀY của người chơi (Hồ Sơ) – phải trưng bày đủ 3 con mới được vào phòng boss.
 * Lực chiến = tổng lực chiến 3 con. Đánh boss không mất cá nên cá khoá cũng được dùng.
 */
export function worldBossTeam(
  save: Pick<PlayerSave, "fishes" | "showcase">,
  fishById: Map<string, FishDef>,
  formById: Map<string, FishFormDef>,
): { uids: string[]; power: number; fromShowcase: number } {
  const pow = (o: OwnedFish) => ownedFishPower(fishById.get(o.fishId)!, o, o.form ? formById.get(o.form) ?? null : null);
  const ok = save.fishes.filter((f) => fishById.has(f.fishId));
  const byUid = new Map(ok.map((f) => [f.uid, f]));
  const picked: OwnedFish[] = [];
  for (const u of save.showcase ?? []) {
    const f = byUid.get(u);
    if (f && !picked.includes(f) && picked.length < 3) picked.push(f);
  }
  const fromShowcase = picked.length;
  return { uids: picked.map((f) => f.uid), power: picked.reduce((n, f) => n + pow(f), 0), fromShowcase };
}

/**
 * CHIÊU BOSS GÂY SÁT THƯƠNG LÊN NGƯỜI CHƠI (trong lượt đánh): boss tung chiêu theo LỊCH CỐ ĐỊNH tính từ lúc vào trận
 * (giây 6, rồi mỗi 8 giây). Máu người chơi = tổng máu 3 cá trưng bày. Mỗi chiêu trừ % máu tối đa theo khắc hệ:
 * boss khắc đội 35% · bình thường 25% · đội khắc boss 15%. Hết máu = bị hạ gục → lượt đánh kết thúc (máy chủ từ chối đòn sau đó).
 */
export const WB_SKILL = { firstMs: 6000, everyMs: 8000, pct: { strong: 0.35, normal: 0.25, weak: 0.15 } } as const;

/** Máu tối đa của người chơi trong lượt đánh boss. */
export function wbPlayerMaxHp(team: Pick<CombatFish, "hp">[]): number {
  return Math.max(1, team.reduce((n, f) => n + Math.max(0, f.hp), 0));
}

/** % máu mỗi chiêu boss lấy đi, theo hệ boss tấn công hệ của đội (lấy hệ bị khắc nặng nhất trong đội). */
export function wbSkillPct(bossElement: Element, team: Pick<CombatFish, "element" | "elements">[]): number {
  let worst: "strong" | "normal" | "weak" = "weak";
  for (const f of team) {
    const k = multiMatchup([bossElement], f.elements?.length ? f.elements : [f.element]).kind;
    if (k === "strong") worst = "strong";
    else if (k === "normal" && worst === "weak") worst = "normal";
  }
  return WB_SKILL.pct[worst];
}

export type WbSkillSchedule = { firstMs: number; everyMs: number };
/** Kết quả phòng thủ một chiêu: né hoàn hảo (0 sát thương) hoặc đỡ đòn (40%). */
export type WbGuardKind = "dodge" | "guard";

/**
 * NÉ / ĐỠ CHIÊU BOSS: bấm B trong lúc boss cảnh báo. Tính theo thời điểm bấm so với lúc chiêu chạm (d = chạm − bấm):
 * −after ≤ d ≤ dodgeMs → NÉ HOÀN HẢO · d ≤ guardMs → ĐỠ ĐÒN (−60% sát thương) · sớm hơn = chưa tới lúc (không tính).
 */
export const WB_GUARD = { dodgeMs: 450, guardMs: 1300, afterMs: 250, guardMult: 0.4, warnMs: 1600 } as const;

/** Số chiêu boss đã trúng sau `elapsedMs` kể từ lúc vào trận. */
export function wbSkillsLanded(elapsedMs: number, sched: WbSkillSchedule = WB_SKILL): number {
  return elapsedMs < sched.firstMs ? 0 : Math.floor((elapsedMs - sched.firstMs) / sched.everyMs) + 1;
}

/** Thời điểm (ms từ lúc vào trận) chiêu thứ k (0-based) chạm người chơi. */
export function wbSkillImpactMs(k: number, sched: WbSkillSchedule = WB_SKILL): number {
  return sched.firstMs + k * sched.everyMs;
}

/** Chấm 1 lần bấm phòng thủ tại `elapsedMs`: chiêu nào (k) và né / đỡ; null nếu không nằm trong cửa sổ cảnh báo nào. */
export function wbJudgeGuard(elapsedMs: number, sched: WbSkillSchedule = WB_SKILL): { k: number; kind: WbGuardKind } | null {
  const k = Math.max(0, Math.round((elapsedMs - sched.firstMs) / sched.everyMs));
  for (const kk of [k, k + 1, k - 1]) {
    if (kk < 0) continue;
    const d = wbSkillImpactMs(kk, sched) - elapsedMs;
    if (d >= -WB_GUARD.afterMs && d <= WB_GUARD.dodgeMs) return { k: kk, kind: "dodge" };
    if (d > WB_GUARD.dodgeMs && d <= WB_GUARD.guardMs) return { k: kk, kind: "guard" };
  }
  return null;
}

/** Máu còn lại của người chơi sau `elapsedMs` (chiêu đã né / đỡ được giảm sát thương). */
export function wbPlayerHp(maxHp: number, pct: number, elapsedMs: number, sched: WbSkillSchedule = WB_SKILL, guards: Partial<Record<number, WbGuardKind>> = {}): number {
  let lost = 0;
  const n = wbSkillsLanded(elapsedMs, sched);
  for (let k = 0; k < n; k++) {
    const g = guards[k];
    lost += pct * (g === "dodge" ? 0 : g === "guard" ? WB_GUARD.guardMult : 1);
  }
  return Math.max(0, Math.round(maxHp * (1 - lost)));
}
