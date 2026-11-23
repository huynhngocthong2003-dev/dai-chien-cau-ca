import { FISHING, RARE_WEIGHT_SCALING } from "@dccc/game-config";
import type { Rng } from "./rng.ts";
import type { FishDef, ZoneDef } from "./types.ts";
import { type Loadout, sumPassive } from "./loadout.ts";

/** Hệ số may mắn tổng (0 = không cộng thêm). */
export function luckFactor(loadout: Loadout, castPower: number): number {
  const luck = loadout.luck + sumPassive(loadout.passives, "luck_bonus", (e) => e.value);
  return luck / 100 + loadout.rareRate / 100 + Math.min(1, Math.max(0, castPower)) * FISHING.castRareBonusMax;
}

/**
 * Hệ số hiếm gốc: cá càng hiếm càng khó ra – Thần Thoại khó nhất (hiếm hơn cả Boss khi câu thường).
 */
export const RARITY_SPAWN_MULT: Partial<Record<FishDef["rarity"], number>> = { legendary: 0.5, mythic: 0.1 };

/** May mắn làm cá THƯỜNG ít cắn hơn (nhường chỗ cho cá cấp cao): trọng số Thường ÷ (1 + lf × hệ số này). */
export const COMMON_LUCK_DAMP = 0.45;

export function spawnWeights(zone: ZoneDef, fishById: Map<string, FishDef>, lf: number) {
  const l = Math.max(0, lf);
  const base = zone.spawn.map((s) => {
    const fish = fishById.get(s.fishId);
    if (!fish) throw new Error(`Không tìm thấy cá ${s.fishId} trong khu ${zone.id}`);
    const luck = fish.rarity === "common" ? 1 : 1 + l * RARE_WEIGHT_SCALING[fish.rarity];
    return { fish, weight: s.weight * (RARITY_SPAWN_MULT[fish.rarity] ?? 1) * luck };
  });
  // may mắn làm cá Thường ít đi, nhưng KHÔNG bao giờ ít hơn cá Hiếm (cá càng hiếm càng khó gặp)
  const sum = (r: FishDef["rarity"]) => base.filter((w) => w.fish.rarity === r).reduce((n, w) => n + w.weight, 0);
  const common = sum("common");
  if (!common) return base;
  const k = Math.min(1, Math.max(1 / (1 + l * COMMON_LUCK_DAMP), sum("rare") / common));
  return base.map((w) => (w.fish.rarity === "common" ? { ...w, weight: w.weight * k } : w));
}

/**
 * BẢNG TỈ LỆ theo CHỈ SỐ NGƯỜI CHƠI (may mắn nhân vật + tỉ lệ hiếm của cần + bùa + lực quăng):
 * rác, từng cấp cá, Boss – đúng công thức chooseFish/rollJunk dùng khi câu.
 */
export function catchOdds(
  zone: ZoneDef,
  fishById: Map<string, FishDef>,
  loadout: Loadout,
  castPower: number,
  junkBase: number,
): { lf: number; junk: number; byRarity: Partial<Record<FishDef["rarity"], number>> } {
  const lf = luckFactor(loadout, castPower);
  const junk = junkChanceFor(junkBase, lf);
  const secret = zone.secretBossId ? Math.min(0.0015, FISHING.secretBossChance * (1 + lf * 0.5)) : 0;
  const boss = bossChance(lf);
  const fishPart = 1 - junk;
  const normal = fishPart * (1 - secret) * (1 - boss);
  const ws = spawnWeights(zone, fishById, lf);
  const tot = ws.reduce((n, w) => n + w.weight, 0) || 1;
  const byRarity: Partial<Record<FishDef["rarity"], number>> = {};
  for (const w of ws) byRarity[w.fish.rarity] = (byRarity[w.fish.rarity] ?? 0) + (normal * w.weight) / tot;
  byRarity.boss = (byRarity.boss ?? 0) + fishPart * (secret + (1 - secret) * boss);
  return { lf, junk, byRarity };
}

/**
 * Tỉ lệ vớt RÁC giảm theo may mắn: không may mắn = tỉ lệ gốc; may mắn càng cao càng ít rác (tối thiểu 2%).
 * (Trước đây rác cố định 12% bất kể may mắn → nâng may mắn mà vẫn ra rác.)
 */
export function junkChanceFor(base: number, lf: number): number {
  return Math.max(0.02, base / (1 + 1.5 * Math.max(0, lf)));
}

/** MÙA CÁ LỚN: ưu tiên loài to (trọng số nhân theo cân nặng trung bình của loài so với khu). */
export function giantSpawnBias(fish: FishDef, zoneAvgKg: number): number {
  const avg = (fish.weightKg[0] + fish.weightKg[1]) / 2;
  // giới hạn ×0,4 … ×3 để không lệch hẳn sang cá hiếm (giữ cân bằng kinh tế)
  return Math.min(3, Math.max(0.4, Math.pow(avg / Math.max(0.01, zoneAvgKg), 0.6)));
}

export function bossChance(lf: number): number {
  return Math.min(0.004, FISHING.bossBaseChance * (1 + lf * 0.4));
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

/** Tỉ lệ khi SĂN BOSS bằng vé: phần lớn là Boss, đôi khi gặp cá Huyền Thoại / Thần Thoại / Boss siêu hiếm. */
export const HUNT_ODDS = { secretBoss: 0.01, mythic: 0.02, legendary: 0.06 };

export type HuntPick = { fish: FishDef; kind: "boss" | "secret" | "mythic" | "legendary" };

/** Chọn cá khi săn Boss (cá Huyền Thoại/Thần Thoại lấy trong danh sách cá của khu; khu không có thì ra Boss). */
export function chooseHuntFish(zone: ZoneDef, fishById: Map<string, FishDef>, rng: Rng): HuntPick {
  const r = rng.next();
  const ofRarity = (rarity: FishDef["rarity"]) =>
    zone.spawn.map((s) => ({ f: fishById.get(s.fishId), w: s.weight })).filter((x): x is { f: FishDef; w: number } => !!x.f && x.f.rarity === rarity);
  if (r < HUNT_ODDS.secretBoss && zone.secretBossId) {
    const sb = fishById.get(zone.secretBossId);
    if (sb) return { fish: sb, kind: "secret" };
  }
  if (r < HUNT_ODDS.secretBoss + HUNT_ODDS.mythic) {
    const list = ofRarity("mythic");
    if (list.length) return { fish: rng.pickWeighted(list, (x) => x.w).f, kind: "mythic" };
  }
  if (r < HUNT_ODDS.secretBoss + HUNT_ODDS.mythic + HUNT_ODDS.legendary) {
    const list = ofRarity("legendary");
    if (list.length) return { fish: rng.pickWeighted(list, (x) => x.w).f, kind: "legendary" };
  }
  const boss = pickZoneBoss(zone, fishById, rng) ?? fishById.get(zone.bossId)!;
  return { fish: boss, kind: "boss" };
}

/** Chọn cá sẽ cắn câu. Boss có thể xuất hiện bất ngờ. */
export function chooseFish(
  zone: ZoneDef,
  fishById: Map<string, FishDef>,
  loadout: Loadout,
  castPower: number,
  rng: Rng,
  opts: { giant?: boolean } = {},
): FishDef {
  const lf = luckFactor(loadout, castPower);
  // Boss phụ siêu hiếm: cực kỳ khó gặp
  if (zone.secretBossId && rng.chance(Math.min(0.0015, FISHING.secretBossChance * (1 + lf * 0.5)))) {
    const sb = fishById.get(zone.secretBossId);
    if (sb) return sb;
  }
  if (rng.chance(bossChance(lf))) {
    const boss = pickZoneBoss(zone, fishById, rng);
    if (boss) return boss;
  }
  const ws = spawnWeights(zone, fishById, lf);
  if (opts.giant) {
    // cân nặng TRUNG BÌNH CÓ TRỌNG SỐ của khu (theo tỉ lệ xuất hiện) làm mốc "cá to"
    const tw = ws.reduce((n, w) => n + w.weight, 0) || 1;
    const avg = ws.reduce((n, w) => n + w.weight * ((w.fish.weightKg[0] + w.fish.weightKg[1]) / 2), 0) / tw;
    return rng.pickWeighted(ws, (w) => w.weight * giantSpawnBias(w.fish, avg)).fish;
  }
  return rng.pickWeighted(ws, (w) => w.weight).fish;
}

/** Cân nặng nghiêng về phía nhẹ, cá lớn hiếm hơn. MÙA CÁ LỚN: luôn ở nửa trên khoảng cân nặng, nghiêng về phía nặng. */
export function rollWeight(fish: FishDef, rng: Rng, giant = false): number {
  const [min, max] = fish.weightKg;
  const t = giant ? 0.55 + 0.45 * Math.pow(rng.next(), 0.6) : Math.pow(rng.next(), 1.8);
  return +(min + (max - min) * t).toFixed(2);
}
