import type { ActiveSkillDef, CharacterDef, PassiveEffect, RodDef } from "./types.ts";

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

export function characterStats(char: CharacterDef, level: number) {
  const l = Math.max(1, level) - 1;
  return {
    hp: Math.round(char.base.hp + char.growth.hp * l),
    pull: +(char.base.pull + char.growth.pull * l).toFixed(1),
    speed: +(char.base.speed + char.growth.speed * l).toFixed(1),
    luck: +(char.base.luck + char.growth.luck * l).toFixed(1),
  };
}

export function rodStats(rod: RodDef, level: number) {
  const m = 1 + 0.06 * (Math.max(1, level) - 1);
  return {
    pull: +(rod.pull * m).toFixed(1),
    durability: Math.round(rod.durability * m),
    reelSpeed: +(rod.reelSpeed * (1 + 0.02 * (Math.max(1, level) - 1))).toFixed(2),
    rareRate: rod.rareRate,
    antiSnap: rod.antiSnap,
  };
}

export function buildLoadout(char: CharacterDef, charLevel: number, rod: RodDef, rodLevel: number): Loadout {
  const c = characterStats(char, charLevel);
  const r = rodStats(rod, rodLevel);
  return {
    pull: c.pull + r.pull,
    reelSpeed: r.reelSpeed * (1 + c.speed / 200),
    durability: Math.round(r.durability * (1 + c.hp / 1000)),
    luck: c.luck,
    rareRate: r.rareRate,
    antiSnap: r.antiSnap,
    speed: c.speed,
    passives: [...char.passive.effects, ...rod.passive.effects],
    active: char.active,
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
