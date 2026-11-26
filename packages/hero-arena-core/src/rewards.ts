import { applyReward, type HeroArenaSave } from "./save.ts";
import type { RewardPayload } from "./types.ts";

// Thưởng sau trận (tính từ kết quả, cộng qua sổ cái với txId = mã trận).

export interface MatchResult {
  matchId: string;
  placement: number;
  kills: number;
  level: number;
  won: boolean;
  /** Bình máu từ kho đã dùng trong trận (bị trừ khỏi kho). */
  storePotionsUsed: number;
  /** Vàng nhặt trong trận. */
  lootGold: number;
}

export function matchReward(r: MatchResult, players = 20): RewardPayload {
  const rankBonus = Math.max(0, players + 1 - r.placement);
  const gold = 40 + rankBonus * 15 + r.kills * 30 + Math.min(300, r.lootGold) + (r.won ? 300 : 0);
  const exp = 50 + rankBonus * 10 + r.kills * 20 + r.level * 10;
  const gems = r.won ? 30 : r.placement <= 5 ? 10 : 0;
  const reward: RewardPayload = { gold, exp };
  if (gems > 0) reward.gems = gems;
  return reward;
}

/** Trừ bình máu kho đã dùng: ưu tiên bình nhỏ trước. */
function potionDeduction(save: HeroArenaSave, used: number): Array<{ itemId: string; quantity: number }> {
  const out: Array<{ itemId: string; quantity: number }> = [];
  let left = used;
  for (const id of ["health_potion_small", "health_potion_medium"]) {
    const have = save.inventory.items[id] ?? 0;
    const take = Math.min(have, left);
    if (take > 0) out.push({ itemId: id, quantity: -take });
    left -= take;
  }
  return out;
}

export function applyMatchResult(save: HeroArenaSave, r: MatchResult, now: number): RewardPayload | null {
  const reward = matchReward(r);
  const items = potionDeduction(save, r.storePotionsUsed);
  if (items.length > 0) reward.items = items;
  if (!applyReward(save, `match:${r.matchId}`, reward, `Trận đấu – hạng ${r.placement}`, now)) return null;
  const st = save.stats;
  st.matches += 1;
  st.kills += r.kills;
  if (r.won) st.wins += 1;
  if (st.bestPlacement === 0 || r.placement < st.bestPlacement) st.bestPlacement = r.placement;
  return reward;
}
