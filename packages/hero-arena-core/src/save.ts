import { HEROES } from "./heroes.ts";
import type { PlayerInventory, RewardPayload } from "./types.ts";

// Tài khoản HERO ARENA: kho tài nguyên + sổ cái giao dịch (mọi thay đổi tiền/đồ đều qua applyReward).

export const SAVE_VERSION = 1;
export const LEDGER_LIMIT = 300;

export type TutorialStepId =
  | "select_hero_and_gender"
  | "hunt_monsters_and_loot"
  | "lock_branch_at_lv5"
  | "pick_random_upgrade"
  | "survive_zone_and_hazard"
  | "claim_last_hero_victory";

export interface LedgerEntry {
  txId: string;
  at: number;
  reason: string;
  reward: RewardPayload;
}

export interface MailMessage {
  id: string;
  sender: string;
  title: string;
  body: string;
  sentAt: number;
  expiresAt: number;
  isRead: boolean;
  isClaimed: boolean;
  reward?: RewardPayload;
}

export interface MatchStats {
  matches: number;
  wins: number;
  kills: number;
  bestPlacement: number;
}

export interface HeroArenaSave {
  version: number;
  playerId: string;
  name: string;
  createdAt: number;
  inventory: PlayerInventory;
  ledger: LedgerEntry[];
  /** Mọi txId đã áp dụng (chống nhận trùng, kể cả khi sổ cái đã cắt bớt). */
  appliedTx: string[];
  giftClaims: Record<string, number>;
  mails: MailMessage[];
  /** ID thư hệ thống đã gửi (không gửi lại sau khi xóa). */
  seededMails: string[];
  tutorial: { completed: TutorialStepId[]; skipped: boolean; rewardClaimed: boolean };
  stats: MatchStats;
  lastHero: { heroId: string; gender: "male" | "female" } | null;
}

export function createSave(playerId: string, name: string, now: number): HeroArenaSave {
  return {
    version: SAVE_VERSION,
    playerId,
    name,
    createdAt: now,
    inventory: { gold: 1000, gems: 50, accountExp: 0, items: {}, unlockedHeroes: HEROES.map((h) => h.id) },
    ledger: [],
    appliedTx: [],
    giftClaims: {},
    mails: [],
    seededMails: [],
    tutorial: { completed: [], skipped: false, rewardClaimed: false },
    stats: { matches: 0, wins: 0, kills: 0, bestPlacement: 0 },
    lastHero: null,
  };
}

export function hasTx(save: HeroArenaSave, txId: string): boolean {
  return save.appliedTx.includes(txId);
}

/** Phần thưởng có trừ (số âm) không được làm kho âm. */
export function canAfford(inv: PlayerInventory, r: RewardPayload): boolean {
  if ((r.gold ?? 0) < 0 && inv.gold + (r.gold ?? 0) < 0) return false;
  if ((r.gems ?? 0) < 0 && inv.gems + (r.gems ?? 0) < 0) return false;
  for (const it of r.items ?? []) if (it.quantity < 0 && (inv.items[it.itemId] ?? 0) + it.quantity < 0) return false;
  return true;
}

/**
 * Cách DUY NHẤT để cộng/trừ tài nguyên. Mỗi giao dịch có txId duy nhất và được ghi sổ.
 * Trả về false nếu txId đã dùng hoặc không đủ tài nguyên.
 */
export function applyReward(save: HeroArenaSave, txId: string, reward: RewardPayload, reason: string, now: number): boolean {
  if (!txId || hasTx(save, txId)) return false;
  const inv = save.inventory;
  if (!canAfford(inv, reward)) return false;
  inv.gold += Math.trunc(reward.gold ?? 0);
  inv.gems += Math.trunc(reward.gems ?? 0);
  inv.accountExp += Math.max(0, Math.trunc(reward.exp ?? 0));
  for (const it of reward.items ?? []) {
    const n = (inv.items[it.itemId] ?? 0) + Math.trunc(it.quantity);
    if (n > 0) inv.items[it.itemId] = n;
    else delete inv.items[it.itemId];
  }
  for (const h of reward.unlockedHeroIds ?? []) if (!inv.unlockedHeroes.includes(h)) inv.unlockedHeroes.push(h);
  save.appliedTx.push(txId);
  save.ledger.push({ txId, at: now, reason, reward });
  if (save.ledger.length > LEDGER_LIMIT) save.ledger.splice(0, save.ledger.length - LEDGER_LIMIT);
  return true;
}

/** Cấp tài khoản từ EXP tích lũy (mỗi cấp cần 300 + 100×cấp). */
export function accountLevel(exp: number): { level: number; into: number; need: number } {
  let level = 1;
  let left = Math.max(0, exp);
  for (;;) {
    const need = 300 + 100 * level;
    if (left < need) return { level, into: left, need };
    left -= need;
    level += 1;
  }
}

export function rewardText(r: RewardPayload): string {
  const parts: string[] = [];
  if (r.gold) parts.push(`${r.gold > 0 ? "+" : ""}${r.gold} Vàng`);
  if (r.gems) parts.push(`${r.gems > 0 ? "+" : ""}${r.gems} Ngọc`);
  if (r.exp) parts.push(`+${r.exp} KN`);
  for (const it of r.items ?? []) parts.push(`${it.quantity > 0 ? "+" : ""}${it.quantity} ${ITEM_NAME_VI[it.itemId] ?? it.itemId}`);
  for (const h of r.unlockedHeroIds ?? []) parts.push(`Mở khóa ${h}`);
  return parts.join(" · ");
}

export const ITEM_NAME_VI: Record<string, string> = {
  health_potion_small: "Bình Máu Nhỏ",
  health_potion_medium: "Bình Máu Vừa",
  mana_potion_small: "Bình Năng Lượng",
};

/** Bình máu mang được vào trận (tối đa 3), lấy từ kho. */
export function potionsAvailable(save: HeroArenaSave): number {
  const it = save.inventory.items;
  return Math.min(3, (it.health_potion_small ?? 0) + (it.health_potion_medium ?? 0));
}

// ------------------------------------------------------------------ đọc save an toàn
function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function num(v: unknown, d: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : d;
}
function str(v: unknown, d: string): string {
  return typeof v === "string" ? v : d;
}
function strArr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}
function numRecord(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!isObj(v)) return out;
  for (const [k, x] of Object.entries(v)) if (typeof x === "number" && Number.isFinite(x) && x > 0) out[k] = Math.trunc(x);
  return out;
}
function reward(v: unknown): RewardPayload | undefined {
  if (!isObj(v)) return undefined;
  const r: RewardPayload = {};
  if (typeof v.gold === "number") r.gold = v.gold;
  if (typeof v.gems === "number") r.gems = v.gems;
  if (typeof v.exp === "number") r.exp = v.exp;
  if (Array.isArray(v.items)) {
    r.items = v.items
      .filter(isObj)
      .filter((x) => typeof x.itemId === "string" && typeof x.quantity === "number")
      .map((x) => ({ itemId: x.itemId as string, quantity: x.quantity as number }));
  }
  if (Array.isArray(v.unlockedHeroIds)) r.unlockedHeroIds = strArr(v.unlockedHeroIds);
  return r;
}

const STEP_IDS: readonly TutorialStepId[] = [
  "select_hero_and_gender",
  "hunt_monsters_and_loot",
  "lock_branch_at_lv5",
  "pick_random_upgrade",
  "survive_zone_and_hazard",
  "claim_last_hero_victory",
];

/** Đọc save từ JSON không tin cậy. Trả null nếu hỏng hoặc sai phiên bản. */
export function parseSave(json: string): HeroArenaSave | null {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isObj(raw) || raw.version !== SAVE_VERSION || typeof raw.playerId !== "string" || !isObj(raw.inventory)) return null;
  const inv = raw.inventory;
  const base = createSave(raw.playerId, str(raw.name, "Anh Hùng"), num(raw.createdAt, 0));
  base.inventory = {
    gold: Math.max(0, Math.trunc(num(inv.gold, 0))),
    gems: Math.max(0, Math.trunc(num(inv.gems, 0))),
    accountExp: Math.max(0, Math.trunc(num(inv.accountExp, 0))),
    items: numRecord(inv.items),
    unlockedHeroes: strArr(inv.unlockedHeroes).filter((h) => HEROES.some((x) => x.id === h)),
  };
  base.ledger = Array.isArray(raw.ledger)
    ? raw.ledger.filter(isObj).map((e) => ({ txId: str(e.txId, ""), at: num(e.at, 0), reason: str(e.reason, ""), reward: reward(e.reward) ?? {} }))
    : [];
  base.appliedTx = strArr(raw.appliedTx);
  base.giftClaims = numRecord(raw.giftClaims);
  base.mails = Array.isArray(raw.mails)
    ? raw.mails.filter(isObj).filter((m) => typeof m.id === "string").map((m) => ({
        id: m.id as string,
        sender: str(m.sender, ""),
        title: str(m.title, ""),
        body: str(m.body, ""),
        sentAt: num(m.sentAt, 0),
        expiresAt: num(m.expiresAt, 0),
        isRead: m.isRead === true,
        isClaimed: m.isClaimed === true,
        reward: reward(m.reward),
      }))
    : [];
  base.seededMails = strArr(raw.seededMails);
  if (isObj(raw.tutorial)) {
    base.tutorial = {
      completed: strArr(raw.tutorial.completed).filter((s): s is TutorialStepId => (STEP_IDS as readonly string[]).includes(s)),
      skipped: raw.tutorial.skipped === true,
      rewardClaimed: raw.tutorial.rewardClaimed === true,
    };
  }
  if (isObj(raw.stats)) {
    base.stats = {
      matches: Math.max(0, num(raw.stats.matches, 0)),
      wins: Math.max(0, num(raw.stats.wins, 0)),
      kills: Math.max(0, num(raw.stats.kills, 0)),
      bestPlacement: Math.max(0, num(raw.stats.bestPlacement, 0)),
    };
  }
  if (isObj(raw.lastHero) && typeof raw.lastHero.heroId === "string" && (raw.lastHero.gender === "male" || raw.lastHero.gender === "female")) {
    base.lastHero = { heroId: raw.lastHero.heroId, gender: raw.lastHero.gender };
  }
  return base;
}
