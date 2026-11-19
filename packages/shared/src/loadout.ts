import type { ActiveEffect, ActiveSkillDef, CharacterDef, PassiveEffect, RodDef } from "./types.ts";

/** Chỉ số tổng hợp của nhân vật + cần câu dùng cho phiên câu cá. */
export interface Loadout {
  pull: number;
  reelSpeed: number;
  durability: number;
  luck: number;
  rareRate: number;
  antiSnap: number;
  speed: number;
  passives: PassiveEffect[];
  active: ActiveSkillDef;
}

export interface CharLevelInfo {
  level: number;
  breakthrough?: number;
  awakened?: boolean;
}

export interface RodLevelInfo {
  level: number;
  stars?: number;
}

/** Hệ số chỉ số từ đột phá (+6%/lần) và thức tỉnh (+20%). */
export function charMultiplier(p: CharLevelInfo): number {
  return (1 + 0.06 * (p.breakthrough ?? 0)) * (p.awakened ? 1.2 : 1);
}

export function characterStats(char: CharacterDef, level: number | CharLevelInfo) {
  const info = typeof level === "number" ? { level } : level;
  const l = Math.max(1, info.level) - 1;
  const m = charMultiplier(info);
  return {
    hp: Math.round((char.base.hp + char.growth.hp * l) * m),
    pull: +((char.base.pull + char.growth.pull * l) * m).toFixed(1),
    speed: +((char.base.speed + char.growth.speed * l) * m).toFixed(1),
    luck: +((char.base.luck + char.growth.luck * l) * m).toFixed(1),
  };
}

/** Hệ số sao tiến hóa cần câu: +10% mỗi sao trên 1. */
export function rodStarMultiplier(stars: number): number {
  return 1 + 0.1 * (Math.max(1, stars) - 1);
}

export function rodStats(rod: RodDef, level: number | RodLevelInfo) {
  const info = typeof level === "number" ? { level } : level;
  const lv = Math.max(1, info.level) - 1;
  const star = rodStarMultiplier(info.stars ?? 1);
  const m = (1 + 0.06 * lv) * star;
  return {
    pull: +(rod.pull * m).toFixed(1),
    durability: Math.round(rod.durability * m),
    reelSpeed: +(rod.reelSpeed * (1 + 0.02 * lv) * (1 + 0.03 * ((info.stars ?? 1) - 1))).toFixed(2),
    rareRate: +(rod.rareRate + 1.5 * ((info.stars ?? 1) - 1)).toFixed(1),
    antiSnap: Math.min(60, rod.antiSnap + 2 * ((info.stars ?? 1) - 1)),
  };
}

/**
 * Sức mạnh kỹ năng chủ động theo đột phá/thức tỉnh: giá trị hiệu ứng +10% mỗi lần
 * đột phá (+25% khi thức tỉnh), hồi chiêu giảm 4% mỗi lần (thêm 15% khi thức tỉnh).
 */
export function scaledActiveSkill(skill: ActiveSkillDef, p: CharLevelInfo): ActiveSkillDef {
  const b = p.breakthrough ?? 0;
  const power = (1 + 0.1 * b) * (p.awakened ? 1.25 : 1);
  const cd = (1 - 0.04 * b) * (p.awakened ? 0.85 : 1);
  if (power === 1 && cd === 1) return skill;
  const scale = (e: ActiveEffect): ActiveEffect => {
    switch (e.kind) {
      case "damage_pct":
      case "tension_reduce":
      case "reel_boost":
      case "durability_restore":
      case "distance_pull":
        return { ...e, value: +(e.value * power).toFixed(3) };
      case "calm":
        return { ...e, value: Math.min(0.95, +(e.value * power).toFixed(3)), durationMs: Math.round(e.durationMs * power) };
      case "burn":
        return { ...e, valuePctPerSec: +(e.valuePctPerSec * power).toFixed(4) };
      case "stun":
      case "freeze":
      case "double_damage":
        return { ...e, durationMs: Math.round(e.durationMs * power) };
    }
  };
  return { ...skill, cooldownMs: Math.round(skill.cooldownMs * cd), effects: skill.effects.map(scale) };
}

export function buildLoadout(
  char: CharacterDef,
  charInfo: number | CharLevelInfo,
  rod: RodDef,
  rodInfo: number | RodLevelInfo,
): Loadout {
  const ci = typeof charInfo === "number" ? { level: charInfo } : charInfo;
  const c = characterStats(char, ci);
  const r = rodStats(rod, rodInfo);
  return {
    pull: c.pull + r.pull,
    reelSpeed: r.reelSpeed * (1 + c.speed / 200),
    durability: Math.round(r.durability * (1 + c.hp / 1000)),
    luck: c.luck,
    rareRate: r.rareRate,
    antiSnap: r.antiSnap,
    speed: c.speed,
    passives: [...char.passive.effects, ...rod.passive.effects],
    active: scaledActiveSkill(char.active, ci),
  };
}

/** Cộng dồn giá trị của các hiệu ứng bị động cùng loại. */
export function sumPassive<K extends PassiveEffect["kind"]>(
  passives: PassiveEffect[],
  kind: K,
  pick: (e: Extract<PassiveEffect, { kind: K }>) => number,
): number {
  let s = 0;
  for (const p of passives) if (p.kind === kind) s += pick(p as Extract<PassiveEffect, { kind: K }>);
  return s;
}
