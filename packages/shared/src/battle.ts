/**
 * Cơ chế đấu cá (thuần túy, tất định theo seed – dùng cho Đấu Sinh Tử và PvP sau này).
 */
import type { Element, FishDef, FishFormDef } from "./types.ts";
import { Rng } from "./rng.ts";
import { fishStats, ownedFishPower } from "./progression.ts";
import type { FormRoll } from "./save.ts";

export interface Fighter {
  uid: string;
  fishId: string;
  name: string;
  element: Element;
  level: number;
  stars: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  power: number;
  form: string | null;
}

export function makeFighter(f: FishDef, o: { uid: string; level: number; stars: number; formRoll?: FormRoll }, form?: FishFormDef | null): Fighter {
  const s = fishStats(f, o.level, o.stars, form, o.formRoll);
  return {
    uid: o.uid,
    fishId: f.id,
    name: form ? `${f.name} (${form.name})` : f.name,
    element: s.element,
    level: o.level,
    stars: o.stars,
    maxHp: s.hp,
    atk: s.atk,
    def: s.def,
    spd: s.spd,
    power: ownedFishPower(f, o, form),
    form: form?.id ?? null,
  };
}

/** Hệ khắc chế: khóa khắc các hệ trong danh sách. */
const BEATS: Record<Element, Element[]> = {
  water: ["fire"],
  fire: ["ice"],
  ice: ["earth"],
  earth: ["thunder"],
  thunder: ["water"],
  light: ["dark"],
  dark: ["light"],
};

/** Khắc hệ chỉ điều chỉnh nhẹ (~±10% sát thương) – lực chiến vẫn là yếu tố quyết định. */
export const ELEMENT_ADVANTAGE = 1.1;
export const ELEMENT_DISADVANTAGE = 0.92;

export function elementMultiplier(att: Element, tgt: Element): number {
  if (BEATS[att].includes(tgt)) return ELEMENT_ADVANTAGE;
  if (BEATS[tgt].includes(att)) return ELEMENT_DISADVANTAGE;
  return 1;
}

export const SPECIAL_NAME: Record<Element, string> = {
  fire: "Thiêu Đốt",
  ice: "Đóng Băng",
  thunder: "Lôi Kích",
  dark: "Hút Máu",
  light: "Thánh Quang",
  earth: "Khiên Đá",
  water: "Song Kích",
};

export type BattleEvent =
  | { t: "attack"; side: 0 | 1; dmg: number; crit: boolean; adv: number; hp: [number, number] }
  | { t: "special"; side: 0 | 1; element: Element; name: string; dmg: number; hp: [number, number] }
  | { t: "skip"; side: 0 | 1; reason: "freeze" | "stun" }
  | { t: "burn"; side: 0 | 1; dmg: number; hp: [number, number] }
  | { t: "heal"; side: 0 | 1; amount: number; hp: [number, number] }
  | { t: "shield"; side: 0 | 1 }
  | { t: "ko"; side: 0 | 1 };

export interface DuelResult {
  a: Fighter;
  b: Fighter;
  winner: 0 | 1;
  events: BattleEvent[];
}

const MAX_ACTIONS = 40;

/** Một trận tay đôi giữa hai con cá. */
export function duel(a: Fighter, b: Fighter, rng: Rng): DuelResult {
  const f = [a, b] as const;
  const hp: [number, number] = [a.maxHp, b.maxHp];
  const turns: [number, number] = [0, 0];
  const skip: [boolean, boolean] = [false, false];
  const burn: [number, number] = [0, 0];
  const shield: [boolean, boolean] = [false, false];
  const events: BattleEvent[] = [];
  let side: 0 | 1 = a.spd === b.spd ? (rng.chance(0.5) ? 0 : 1) : a.spd > b.spd ? 0 : 1;

  const hit = (from: 0 | 1, mul: number) => {
    const to = (1 - from) as 0 | 1;
    const adv = elementMultiplier(f[from].element, f[to].element);
    const crit = rng.chance(0.1);
    let dmg = f[from].atk * 3 * (100 / (100 + f[to].def)) * adv * rng.range(0.9, 1.1) * (crit ? 1.5 : 1) * mul;
    if (shield[to]) {
      dmg *= 0.5;
      shield[to] = false;
    }
    const d = Math.max(1, Math.round(dmg));
    hp[to] = Math.max(0, hp[to] - d);
    return { d, crit, adv };
  };

  for (let n = 0; n < MAX_ACTIONS && hp[0] > 0 && hp[1] > 0; n++) {
    const me = side;
    const foe = (1 - me) as 0 | 1;
    if (burn[me] > 0) {
      burn[me]--;
      const d = Math.max(1, Math.round(f[me].maxHp * 0.08));
      hp[me] = Math.max(0, hp[me] - d);
      events.push({ t: "burn", side: me, dmg: d, hp: [hp[0], hp[1]] });
      if (hp[me] <= 0) break;
    }
    if (skip[me]) {
      skip[me] = false;
      events.push({ t: "skip", side: me, reason: f[foe].element === "ice" ? "freeze" : "stun" });
    } else {
      turns[me]++;
      if (turns[me] % 3 === 0) {
        const el = f[me].element;
        const { d } = hit(me, 1.7);
        let total = d;
        if (el === "water" && hp[foe] > 0) total += hit(me, 0.6).d;
        events.push({ t: "special", side: me, element: el, name: SPECIAL_NAME[el], dmg: total, hp: [hp[0], hp[1]] });
        if (el === "fire") burn[foe] = 2;
        if (el === "ice") skip[foe] = true;
        if (el === "thunder" && rng.chance(0.5)) skip[foe] = true;
        if (el === "dark") {
          const amt = Math.round(total * 0.4);
          hp[me] = Math.min(f[me].maxHp, hp[me] + amt);
          events.push({ t: "heal", side: me, amount: amt, hp: [hp[0], hp[1]] });
        }
        if (el === "light") {
          const amt = Math.round(f[me].maxHp * 0.15);
          hp[me] = Math.min(f[me].maxHp, hp[me] + amt);
          events.push({ t: "heal", side: me, amount: amt, hp: [hp[0], hp[1]] });
        }
        if (el === "earth") {
          shield[me] = true;
          events.push({ t: "shield", side: me });
        }
      } else {
        const { d, crit, adv } = hit(me, 1);
        events.push({ t: "attack", side: me, dmg: d, crit, adv, hp: [hp[0], hp[1]] });
      }
    }
    side = foe;
  }
  let winner: 0 | 1;
  if (hp[0] <= 0) winner = 1;
  else if (hp[1] <= 0) winner = 0;
  else winner = hp[0] / a.maxHp >= hp[1] / b.maxHp ? 0 : 1;
  events.push({ t: "ko", side: (1 - winner) as 0 | 1 });
  return { a, b, winner, events };
}

export interface MatchResult {
  seed: number;
  duels: DuelResult[];
  /** Số trận thắng của mỗi bên. */
  score: [number, number];
  winner: 0 | 1;
}

/** Đấu 3 cặp theo thứ tự đã xếp, ai thắng 2 trước thì thắng. */
export function playMatch(teamA: Fighter[], teamB: Fighter[], seed: number): MatchResult {
  if (teamA.length !== 3 || teamB.length !== 3) throw new Error("Mỗi đội cần đúng 3 con cá");
  const rng = new Rng(seed);
  const duels: DuelResult[] = [];
  const score: [number, number] = [0, 0];
  for (let i = 0; i < 3 && score[0] < 2 && score[1] < 2; i++) {
    const r = duel(teamA[i]!, teamB[i]!, rng);
    duels.push(r);
    score[r.winner]++;
  }
  return { seed, duels, score, winner: score[0] >= 2 ? 0 : 1 };
}

/** Đảo góc nhìn trận đấu (để bên bị thách đấu xem trận với đội mình ở bên trái). */
export function flipMatch(m: MatchResult): MatchResult {
  const fs = (s: 0 | 1) => (1 - s) as 0 | 1;
  const fh = (hp: [number, number]): [number, number] => [hp[1], hp[0]];
  return {
    seed: m.seed,
    score: [m.score[1], m.score[0]],
    winner: fs(m.winner),
    duels: m.duels.map((d) => ({
      a: d.b,
      b: d.a,
      winner: fs(d.winner),
      events: d.events.map((e) => ("hp" in e ? { ...e, side: fs(e.side), hp: fh(e.hp) } : { ...e, side: fs(e.side) })) as BattleEvent[],
    })),
  };
}
