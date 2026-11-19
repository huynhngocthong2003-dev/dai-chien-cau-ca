import { FISHING, RARE_WEIGHT_SCALING } from "@dccc/game-config";
import type { Rng } from "./rng.ts";
import type { FishDef, ZoneDef } from "./types.ts";
import { type Loadout, sumPassive } from "./loadout.ts";

/** Hệ số may mắn tổng (0 = không cộng thêm). */
export function luckFactor(loadout: Loadout, castPower: number): number {
  const luck = loadout.luck + sumPassive(loadout.passives, "luck_bonus", (e) => e.value);
  return luck / 100 + loadout.rareRate / 100 + Math.min(1, Math.max(0, castPower)) * FISHING.castRareBonusMax;
}

export function spawnWeights(zone: ZoneDef, fishById: Map<string, FishDef>, lf: number) {
  return zone.spawn.map((s) => {
    const fish = fishById.get(s.fishId);
    if (!fish) throw new Error(`Không tìm thấy cá ${s.fishId} trong khu ${zone.id}`);
    return { fish, weight: s.weight * (1 + lf * RARE_WEIGHT_SCALING[fish.rarity]) };
  });
}

export function bossChance(lf: number): number {
  return Math.min(0.08, FISHING.bossBaseChance * (1 + lf * 0.6));
}

/** Chọn cá sẽ cắn câu. Boss có thể xuất hiện bất ngờ. */
export function chooseFish(
  zone: ZoneDef,
  fishById: Map<string, FishDef>,
  loadout: Loadout,
  castPower: number,
  rng: Rng,
): FishDef {
  const lf = luckFactor(loadout, castPower);
  if (rng.chance(bossChance(lf))) {
    const boss = fishById.get(zone.bossId);
    if (boss) return boss;
  }
  return rng.pickWeighted(spawnWeights(zone, fishById, lf), (w) => w.weight).fish;
}

/** Cân nặng nghiêng về phía nhẹ, cá lớn hiếm hơn. */
export function rollWeight(fish: FishDef, rng: Rng): number {
  const [min, max] = fish.weightKg;
  const t = Math.pow(rng.next(), 1.8);
  return +(min + (max - min) * t).toFixed(2);
}
