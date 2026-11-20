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

/** Tất cả Boss của khu (Boss chính trước). */
export function zoneBosses(zone: ZoneDef): string[] {
  return [zone.bossId, ...(zone.extraBosses ?? [])];
}

/** Chọn ngẫu nhiên 1 Boss của khu (Boss chính trọng số 2, Boss phụ 1). */
export function pickZoneBoss(zone: ZoneDef, fishById: Map<string, FishDef>, rng: Rng): FishDef | null {
  const list = zoneBosses(zone)
    .map((id, i) => ({ f: fishById.get(id), w: i === 0 ? 2 : 1 }))
    .filter((x): x is { f: FishDef; w: number } => !!x.f);
  return list.length ? rng.pickWeighted(list, (x) => x.w).f : null;
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
  // Boss phụ siêu hiếm: cực kỳ khó gặp
  if (zone.secretBossId && rng.chance(Math.min(0.004, FISHING.secretBossChance * (1 + lf * 0.5)))) {
    const sb = fishById.get(zone.secretBossId);
    if (sb) return sb;
  }
  if (rng.chance(bossChance(lf))) {
    const boss = pickZoneBoss(zone, fishById, rng);
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
