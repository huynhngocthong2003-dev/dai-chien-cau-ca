/**
 * CHIẾN ĐẤU 3VS3 THEO LƯỢT (thuần túy, tất định theo seed) – dùng chung cho game, máy chủ (Edge Function), PvE và PvP.
 *
 *  - Mỗi bên 3 cá, xuất trận theo thứ tự; cá bị hạ → cá kế tiếp tự vào; hạ đủ 3 cá đối phương là thắng.
 *  - Cá NHANH hơn hành động trước; sau đó luân phiên. Khi có cá mới vào sân, so lại tốc độ để định bên đi tiếp.
 *  - Hành động: TẤN CÔNG (canh lực) · KỸ NĂNG (có hồi chiêu) · PHÒNG THỦ (giảm 40% đòn kế tiếp).
 *  - SÁT THƯƠNG = MAX(1, ATK × canh lực × nguyên tố × kỹ năng − DEF)  (ATK/DEF/HP đã qua hệ số trận COMBAT_K).
 *  - Canh lực: đỏ ×0.1 (ĐÒN HỤT) · vàng ×0.7 (ĐÁNH YẾU) · xanh ×1.25 (ĐÁNH MẠNH) · PERFECT nằm giữa vùng xanh (chỉ thành tích).
 *  - Combo xanh liên tiếp chỉ để hiển thị, không cộng sát thương.
 * Mọi con số do hàm này tính – giao diện chỉ hiển thị kết quả.
 */
import type { Element, FishDef, FishFormDef } from "./types.ts";
import type { FormRoll } from "./save.ts";
import { Rng } from "./rng.ts";
import { fishStats } from "./progression.ts";
import { multiMatchup, type MatchupKind } from "./elements.ts";

// ------------------------------------------------------------------ hằng số cân bằng
/**
 * Đổi chỉ số cá sang chỉ số trận:
 *  - DEF ×0.35 để công thức trừ thẳng DEF không làm mọi đòn thành 1;
 *  - HP trận ≈ HP_HITS × ATK (nhân thêm độ "trâu" tương đối của loài) → mỗi cá cần ~4–5 đòn ĐÁNH MẠNH, trận ~30 lượt.
 */
export const COMBAT_K = { atk: 1, def: 0.35, hpHits: 3.6, tankExp: 0.35 };
export const TIMING_MULT = { red: 0.1, yellow: 0.7, green: 1.25, perfect: 1.25 } as const;
export type TimingZone = keyof typeof TIMING_MULT;
export const TIMING_LABEL: Record<TimingZone, string> = { red: "ĐÒN ĐÁNH HỤT", yellow: "ĐÁNH YẾU", green: "ĐÁNH MẠNH", perfect: "PERFECT!" };
/** Ranh giới vùng tính theo khoảng cách tới tâm thanh (0..0.5). */
export const TIMING_BANDS = { perfect: 0.04, green: 0.14, yellow: 0.36 } as const;
/** Phòng thủ khi KHÔNG canh (hết giờ / lệnh cũ): giảm 40% đòn kế tiếp. */
export const DEFEND_REDUCE = 0.4;
/** CANH BẢO VỆ (nút B): canh càng chuẩn, đòn kế tiếp của địch càng bị chặn mạnh. */
export const GUARD_REDUCE: Record<TimingZone, number> = { red: 0.1, yellow: 0.3, green: 0.55, perfect: 0.75 };
export const GUARD_LABEL: Record<TimingZone, string> = { red: "CHẶN HỤT", yellow: "CHẶN YẾU", green: "CHẶN TỐT", perfect: "CHẶN HOÀN HẢO!" };
/** THANH NỘ (nút V): tích từ sát thương địch gây cho mình – đầy 100 mới dùng kỹ năng. */
export const ENERGY_MAX = 100;
/** Nộ nhận được khi mất 100% máu của cá đang trên sân (mất ~62% máu → đầy). */
export const ENERGY_PER_HP = 160;
/** Thưởng nộ khi chặn HOÀN HẢO. */
export const ENERGY_PERFECT_GUARD = 15;
/** Giữ để tương thích trận cũ (kỹ năng nay dùng thanh nộ, không còn hồi chiêu). */
export const SKILL_COOLDOWN = 0;
/** Thời hạn 1 lượt của người chơi (hết giờ → tự động PHÒNG THỦ). */
export const TURN_TIME_MS = 20_000;
/** Bấm sớm hơn mức này coi như bấm bừa (chống gửi lệnh tự động). */
export const MIN_PRESS_MS = 120;
export const MAX_ACTIONS = 300;

// ------------------------------------------------------------------ thanh canh lực
export interface BarParams {
  /** Thời gian kim đi hết 1 vòng (trái → phải → trái), ms. */
  periodMs: number;
  /** Vị trí khởi đầu trong chu kỳ (0..1). */
  phase: number;
}

function hash32(a: number, b: number): number {
  let h = (a ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ b, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/** Tham số thanh canh lực của lượt `turn` (tất định theo seed trận – máy chủ & game tính giống nhau). */
export function barFor(seed: number, turn: number): BarParams {
  const r = new Rng(hash32(seed, turn * 2 + 1));
  return { periodMs: Math.round(r.range(1150, 1600)), phase: r.next() };
}

/** Vị trí kim (0 = trái, 1 = phải) sau `ms` mili giây kể từ lúc thanh hiện. */
export function needlePos(bar: BarParams, ms: number): number {
  const u = (((ms / bar.periodMs + bar.phase) % 1) + 1) % 1;
  return u < 0.5 ? u * 2 : 2 - u * 2;
}

export function timingZone(pos: number): TimingZone {
  const d = Math.abs(pos - 0.5);
  if (d <= TIMING_BANDS.perfect) return "perfect";
  if (d <= TIMING_BANDS.green) return "green";
  if (d <= TIMING_BANDS.yellow) return "yellow";
  return "red";
}

// ------------------------------------------------------------------ kỹ năng
export type SkillKind = "shield" | "heal" | "surge" | "rage" | "quake" | "drain" | "cleanse";

/** Thế mạnh của cá – kỹ năng thêm hiệu ứng theo thế mạnh (dạng đột biến quyết định, chưa đột biến thì theo chỉ số loài). */
export type SkillBonus = "atk" | "def" | "hp" | "all";

export interface CombatSkill {
  name: string;
  kind: SkillKind;
  /** Hiệu ứng thêm theo thế mạnh (công / thủ / máu / toàn diện). */
  bonus?: SkillBonus;
  /** Sức mạnh riêng của loài (0.9–1.15) – mỗi cá một kỹ năng riêng. */
  power: number;
  /** Kỹ năng có gây sát thương (dùng thanh canh lực) hay không. */
  attack: boolean;
  description: string;
}

const SKILL_BY_ELEMENT: Record<Element, SkillKind> = {
  metal: "shield",
  wood: "heal",
  water: "surge",
  fire: "rage",
  earth: "quake",
  dark: "drain",
  light: "cleanse",
};

function strHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Thế mạnh tự nhiên của loài: chỉ số nổi trội nhất (máu / công / thủ). */
export function naturalBonus(f: Pick<FishDef, "hp" | "atk" | "def">): SkillBonus {
  const v = { hp: f.hp / 10, atk: f.atk * 2, def: f.def * 1.5 };
  const best = (Object.keys(v) as (keyof typeof v)[]).sort((a, b) => v[b] - v[a]);
  return v[best[0]!] > v[best[1]!] * 1.12 ? best[0]! : "all";
}

const BONUS_TEXT: Record<SkillBonus, string> = {
  atk: "Thế mạnh CÔNG: đòn kỹ năng ×1,25 (kỹ năng hỗ trợ: +20% công 2 lượt)",
  def: "Thế mạnh THỦ: thêm khiên giảm 30% sát thương 2 lượt",
  hp: "Thế mạnh MÁU: hồi thêm 15% máu tối đa",
  all: "Toàn diện: đòn ×1,1 · hồi 6% máu · khiên 15%",
};

/**
 * Kỹ năng trận của một con cá – mỗi con một kỹ năng riêng:
 *  - cơ chế gốc theo HỆ (Kim khiên, Mộc hồi máu, Thủy sóng mạnh, Hỏa cuồng nộ, Thổ địa chấn, Bóng tối hút máu, Ánh sáng thanh tẩy);
 *  - DẠNG ĐỘT BIẾN (từng màu: Hắc Hỏa, Lam Hỏa, Lục Hỏa…) đặt tên riêng + hiệu ứng theo THẾ MẠNH của dạng;
 *  - chưa đột biến: thế mạnh theo chỉ số nổi trội của loài; độ mạnh riêng theo loài.
 * Kỹ năng nạp bằng THANH NỘ (sát thương địch gây cho mình), không còn hồi chiêu.
 */
export function combatSkillFor(
  f: Pick<FishDef, "id" | "skill"> & Partial<Pick<FishDef, "hp" | "atk" | "def">>,
  element: Element,
  form?: Pick<FishFormDef, "name" | "focus" | "rank"> | null,
): CombatSkill {
  const kind = SKILL_BY_ELEMENT[element];
  // kỹ năng hiếm dùng hơn (phải nạp nộ) → mạnh hơn trước 20%
  const power = Math.round((0.9 + (strHash(f.id) % 1000) / 4000) * 1.2 * 100) / 100; // 1.08 – 1.38
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const d: Record<SkillKind, [boolean, string]> = {
    shield: [false, `Giáp Kim Cương: giảm ${pct(Math.min(0.7, 0.45 * power))} sát thương nhận vào trong 2 lượt.`],
    heal: [false, `Sinh Mệnh: hồi ${pct(0.3 * power)} máu tối đa.`],
    surge: [true, `Thủy Triều: đòn đánh ×${(1.6 * power).toFixed(2)} sát thương.`],
    rage: [false, `Bùng Cháy: tăng ${pct(0.35 * power)} sức tấn công trong 3 lượt.`],
    quake: [true, `Địa Chấn: đánh thường và giảm ${pct(Math.min(0.7, 0.4 * power))} phòng thủ đối thủ trong 3 lượt.`],
    drain: [true, `Hút Sinh Lực: đòn ×${(1.2 * power).toFixed(2)}, hồi máu bằng 60% sát thương gây ra.`],
    cleanse: [false, `Thanh Tẩy: xoá hiệu ứng bất lợi, hồi ${pct(0.2 * power)} máu và giảm 20% sát thương nhận vào 1 lượt.`],
  };
  const [attack, description] = d[kind];
  const bonus: SkillBonus = form ? (form.rank === "legend" ? "all" : ((form.focus ?? "all") as SkillBonus)) : f.hp && f.atk && f.def ? naturalBonus(f as Pick<FishDef, "hp" | "atk" | "def">) : "all";
  const name = form ? `${f.skill.name} · ${form.name}` : f.skill.name;
  return { name, kind, power, attack, bonus, description: `${description} ${BONUS_TEXT[bonus]}.` };
}

// ------------------------------------------------------------------ trạng thái trận
export interface CombatFish {
  uid: string;
  fishId: string;
  name: string;
  element: Element;
  /** Cá lai: các hệ hiện (2 hệ bố mẹ). */
  elements?: Element[];
  /** Cá Gen Lặn: hệ ẩn (vẫn tính khắc chế; đối thủ chỉ thấy "?"). */
  hidden?: Element;
  /** Cá lai: loài [bố, mẹ] (chỉ để vẽ). */
  parents?: [string, string];
  level: number;
  stars: number;
  form: string | null;
  maxHp: number;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  skill: CombatSkill;
  /** (Trận cũ) hồi chiêu – nay kỹ năng dùng thanh nộ của đội. */
  cd: number;
  defending: boolean;
  /** Mức chặn của lần CANH BẢO VỆ (0..1); không có = phòng thủ thường 40%. */
  guard?: number;
  /** Hiệu ứng: [hệ số, số lượt còn lại]. */
  atkUp: [number, number] | null;
  dmgReduce: [number, number] | null;
  defDown: [number, number] | null;
}

export interface CombatSide {
  team: CombatFish[];
  active: number;
  /** Số lần canh lực XANH liên tiếp (combo – chỉ hiển thị). */
  combo: number;
  /** Thanh nộ của đội 0..100 (tích từ sát thương địch gây ra; cá ngã thì cá sau thừa hưởng). */
  energy?: number;
}

export type CombatAction =
  | { kind: "attack"; pressMs?: number; zone?: TimingZone }
  | { kind: "skill"; pressMs?: number; zone?: TimingZone }
  /** Canh bảo vệ: có pressMs / zone = canh theo thanh; không có = phòng thủ thường (hết giờ). */
  | { kind: "defend"; pressMs?: number; zone?: TimingZone };

export type CombatEvent =
  | { t: "start"; first: 0 | 1 }
  | {
      t: "attack";
      side: 0 | 1;
      skill: string | null;
      zone: TimingZone;
      matchup: MatchupKind;
      dmg: number;
      defended: boolean;
      combo: number;
      hp: number;
    }
  | { t: "skill"; side: 0 | 1; name: string; kind: SkillKind; text: string }
  | { t: "heal"; side: 0 | 1; amount: number; hp: number }
  | { t: "defend"; side: 0 | 1; auto?: boolean; zone?: TimingZone; reduce?: number }
  | { t: "energy"; side: 0 | 1; energy: number }
  | { t: "ko"; side: 0 | 1; uid: string }
  | { t: "enter"; side: 0 | 1; uid: string; index: number }
  | { t: "end"; winner: 0 | 1 };

export interface CombatState {
  seed: number;
  turn: number;
  turnSide: 0 | 1;
  sides: [CombatSide, CombatSide];
  winner: 0 | 1 | null;
  /** Nhật ký sự kiện của TẤT CẢ các lượt (để phát lại / đồng bộ). */
  log: CombatEvent[];
}

export interface CombatFishInput {
  def: FishDef;
  uid: string;
  level: number;
  stars: number;
  element: Element;
  elements?: Element[];
  hidden?: Element;
  parents?: [string, string];
  form?: FishFormDef | null;
  formRoll?: FormRoll | null;
}

export function makeCombatFish(i: CombatFishInput): CombatFish {
  const s = fishStats(i.def, i.level, i.stars, i.form ?? null, i.formRoll ?? null);
  const atkRaw = Math.max(1, s.atk);
  const maxHp = Math.max(1, Math.round(atkRaw * COMBAT_K.hpHits * Math.pow(s.hp / atkRaw / 10, COMBAT_K.tankExp)));
  return {
    uid: i.uid,
    fishId: i.def.id,
    name: i.form ? `${i.def.name} (${i.form.name})` : i.def.name,
    element: i.element,
    ...(i.elements && i.elements.length > 1 ? { elements: [...i.elements] } : {}),
    ...(i.hidden ? { hidden: i.hidden } : {}),
    ...(i.parents ? { parents: [...i.parents] as [string, string] } : {}),
    level: i.level,
    stars: i.stars,
    form: i.form?.id ?? null,
    maxHp,
    hp: maxHp,
    atk: Math.max(1, Math.round(s.atk * COMBAT_K.atk)),
    def: Math.max(0, Math.round(s.def * COMBAT_K.def)),
    spd: s.spd,
    skill: combatSkillFor(i.def, i.element, i.form ?? null),
    cd: 0,
    defending: false,
    atkUp: null,
    dmgReduce: null,
    defDown: null,
  };
}

const clone = (s: CombatState): CombatState => JSON.parse(JSON.stringify(s)) as CombatState;
const activeOf = (s: CombatState, side: 0 | 1) => s.sides[side].team[s.sides[side].active]!;

/** Bên đi trước giữa 2 cá đang trên sân: nhanh hơn đi trước; bằng nhau → tung đồng xu theo seed (công bằng, nhất quán). */
function fasterSide(s: CombatState, salt: number): 0 | 1 {
  const a = activeOf(s, 0).spd;
  const b = activeOf(s, 1).spd;
  if (a !== b) return a > b ? 0 : 1;
  return new Rng(hash32(s.seed, 7777 + salt)).chance(0.5) ? 0 : 1;
}

export function createCombat(teamA: CombatFish[], teamB: CombatFish[], seed: number): CombatState {
  if (teamA.length !== 3 || teamB.length !== 3) throw new Error("Mỗi bên phải có đúng 3 cá");
  const s: CombatState = {
    seed: seed >>> 0,
    turn: 0,
    turnSide: 0,
    sides: [
      { team: teamA, active: 0, combo: 0, energy: 0 },
      { team: teamB, active: 0, combo: 0, energy: 0 },
    ],
    winner: null,
    log: [],
  };
  s.turnSide = fasterSide(s, 0);
  s.log.push({ t: "start", first: s.turnSide });
  return s;
}

/** Thanh canh lực của lượt hiện tại. */
export function currentBar(s: CombatState): BarParams {
  return barFor(s.seed, s.turn);
}

/** Thanh nộ của một bên (trận cũ chưa có = 0). */
export function energyOf(s: CombatState, side: 0 | 1): number {
  return Math.max(0, Math.min(ENERGY_MAX, Math.round(s.sides[side].energy ?? 0)));
}

export function skillReady(s: CombatState, side: 0 | 1): boolean {
  return energyOf(s, side) >= ENERGY_MAX;
}

/** Mọi hệ của cá trong trận (hệ hiện + hệ ẩn). */
export function allElements(f: Pick<CombatFish, "element" | "elements" | "hidden">): Element[] {
  const base = f.elements?.length ? f.elements : [f.element];
  return f.hidden ? [...base, f.hidden] : [...base];
}

/** Sát thương của 1 đòn (đã gồm phòng thủ, giảm sát thương). Thuần – có test. */
export function computeDamage(att: CombatFish, tgt: CombatFish, zone: TimingZone, skillMult: number) {
  const m = multiMatchup(allElements(att), allElements(tgt));
  const atk = att.atk * (att.atkUp ? att.atkUp[0] : 1);
  const def = tgt.def * (tgt.defDown ? 1 - tgt.defDown[0] : 1);
  const base = atk * TIMING_MULT[zone] * m.mult * skillMult;
  let dmg = Math.max(1, base - def);
  if (tgt.defending) dmg *= 1 - (tgt.guard ?? DEFEND_REDUCE);
  if (tgt.dmgReduce) dmg *= 1 - tgt.dmgReduce[0];
  return { dmg: Math.max(1, Math.round(dmg)), matchup: m.kind, base };
}

function tickOwnTurnEnd(f: CombatFish) {
  if (f.cd > 0) f.cd--;
  for (const k of ["atkUp", "dmgReduce", "defDown"] as const) {
    const v = f[k];
    if (v) f[k] = v[1] <= 1 ? null : [v[0], v[1] - 1];
  }
}

export type CombatResult = { ok: true; state: CombatState; events: CombatEvent[] } | { ok: false; error: string };

/**
 * Áp dụng hành động của bên `side` ở lượt hiện tại.
 * Tấn công/kỹ năng gây sát thương: người chơi gửi `pressMs` (thời điểm bấm kể từ khi thanh hiện) → máy tính vùng từ thanh của lượt;
 * máy (AI) gửi thẳng `zone`.
 */
export function applyAction(state: CombatState, side: 0 | 1, action: CombatAction): CombatResult {
  if (state.winner !== null) return { ok: false, error: "Trận đấu đã kết thúc" };
  if (side !== state.turnSide) return { ok: false, error: "Chưa đến lượt của bạn" };
  if (state.turn >= MAX_ACTIONS) return { ok: false, error: "Trận đấu quá dài" };
  const s = clone(state);
  const events: CombatEvent[] = [];
  const foeSide = (1 - side) as 0 | 1;
  const me = activeOf(s, side);
  const foe = activeOf(s, foeSide);
  // lượt mới của mình: phòng thủ cũ hết hiệu lực
  me.defending = false;

  const zoneOf = (a: { pressMs?: number; zone?: TimingZone }): TimingZone | null => {
    if (a.zone) return a.zone;
    if (typeof a.pressMs !== "number" || !Number.isFinite(a.pressMs)) return null;
    if (a.pressMs < MIN_PRESS_MS || a.pressMs > TURN_TIME_MS) return "red";
    return timingZone(needlePos(currentBar(s), a.pressMs));
  };

  const strike = (zone: TimingZone, skillMult: number, skillName: string | null) => {
    const r = computeDamage(me, foe, zone, skillMult);
    const defended = foe.defending;
    const lost = Math.min(foe.hp, r.dmg);
    foe.hp = Math.max(0, foe.hp - r.dmg);
    foe.defending = false; // phòng thủ hết sau khi nhận đòn
    delete foe.guard;
    // THANH NỘ: bên bị đánh tích nộ theo % máu bị mất
    const fs = s.sides[foeSide];
    const before = fs.energy ?? 0;
    fs.energy = Math.min(ENERGY_MAX, before + Math.round((lost / foe.maxHp) * ENERGY_PER_HP));
    if (fs.energy !== before) events.push({ t: "energy", side: foeSide, energy: fs.energy });
    const green = zone === "green" || zone === "perfect";
    s.sides[side].combo = green ? s.sides[side].combo + 1 : 0;
    events.push({ t: "attack", side, skill: skillName, zone, matchup: r.matchup, dmg: r.dmg, defended, combo: s.sides[side].combo, hp: foe.hp });
    return r.dmg;
  };

  if (action.kind === "defend") {
    // CANH BẢO VỆ: vùng canh quyết định mức chặn đòn kế tiếp; không canh (hết giờ) = phòng thủ thường
    me.defending = true;
    const z = action.zone ?? (typeof action.pressMs === "number" ? zoneOf(action) : null);
    if (z) {
      me.guard = GUARD_REDUCE[z];
      if (z === "perfect") {
        const sd = s.sides[side];
        sd.energy = Math.min(ENERGY_MAX, (sd.energy ?? 0) + ENERGY_PERFECT_GUARD);
        events.push({ t: "defend", side, zone: z, reduce: me.guard });
        events.push({ t: "energy", side, energy: sd.energy });
      } else events.push({ t: "defend", side, zone: z, reduce: me.guard });
    } else {
      delete me.guard;
      events.push({ t: "defend", side });
    }
  } else if (action.kind === "attack") {
    const z = zoneOf(action);
    if (!z) return { ok: false, error: "Thiếu thời điểm canh lực" };
    strike(z, 1, null);
  } else {
    if (energyOf(s, side) < ENERGY_MAX) return { ok: false, error: `Thanh nộ chưa đầy (${energyOf(s, side)}/${ENERGY_MAX}) – nhận sát thương để tích nộ` };
    const sk = me.skill;
    const p = sk.power;
    const bonus = sk.bonus ?? "all";
    s.sides[side].energy = 0;
    events.push({ t: "skill", side, name: sk.name, kind: sk.kind, text: sk.description });
    events.push({ t: "energy", side, energy: 0 });
    // thế mạnh CÔNG làm đòn kỹ năng mạnh hơn
    const bm = bonus === "atk" ? 1.25 : bonus === "all" ? 1.1 : 1;
    if (sk.attack) {
      const z = zoneOf(action);
      if (!z) return { ok: false, error: "Thiếu thời điểm canh lực" };
      if (sk.kind === "surge") strike(z, 1.6 * p * bm, sk.name);
      else if (sk.kind === "quake") {
        strike(z, bm, sk.name);
        foe.defDown = [Math.min(0.7, 0.4 * p), 3];
      } else if (sk.kind === "drain") {
        const d = strike(z, 1.2 * p * bm, sk.name);
        const amt = Math.min(me.maxHp - me.hp, Math.round(d * 0.6));
        me.hp += amt;
        events.push({ t: "heal", side, amount: amt, hp: me.hp });
      }
    } else if (sk.kind === "shield") me.dmgReduce = [Math.min(0.7, 0.45 * p), 2];
    else if (sk.kind === "rage") me.atkUp = [1 + 0.35 * p, 3];
    else if (sk.kind === "heal" || sk.kind === "cleanse") {
      if (sk.kind === "cleanse") {
        me.defDown = null;
        me.dmgReduce = [0.2, 2]; // giữ đến hết lượt kế tiếp của mình
      }
      const amt = Math.min(me.maxHp - me.hp, Math.round(me.maxHp * (sk.kind === "heal" ? 0.3 : 0.2) * p));
      me.hp += amt;
      events.push({ t: "heal", side, amount: amt, hp: me.hp });
    }
    // hiệu ứng thêm theo THẾ MẠNH (dạng đột biến / chỉ số nổi trội của loài)
    if (bonus === "atk" && !sk.attack) me.atkUp = [Math.max(me.atkUp?.[0] ?? 1, 1.2), Math.max(me.atkUp?.[1] ?? 0, 2)];
    if (bonus === "def" || bonus === "all") {
      const r0 = bonus === "def" ? 0.3 : 0.15;
      me.dmgReduce = [Math.min(0.75, Math.max(me.dmgReduce?.[0] ?? 0, r0)), Math.max(me.dmgReduce?.[1] ?? 0, 2)];
    }
    if (bonus === "hp" || bonus === "all") {
      const amt = Math.min(me.maxHp - me.hp, Math.round(me.maxHp * (bonus === "hp" ? 0.15 : 0.06)));
      if (amt > 0) {
        me.hp += amt;
        events.push({ t: "heal", side, amount: amt, hp: me.hp });
      }
    }
  }

  tickOwnTurnEnd(me);
  s.turn++;
  // hạ gục → cá tiếp theo vào sân, so tốc độ để định bên đi tiếp
  if (foe.hp <= 0) {
    events.push({ t: "ko", side: foeSide, uid: foe.uid });
    const fs = s.sides[foeSide];
    const next = fs.team.findIndex((f, i) => i > fs.active && f.hp > 0);
    if (next < 0) {
      s.winner = side;
      events.push({ t: "end", winner: side });
    } else {
      fs.active = next;
      events.push({ t: "enter", side: foeSide, uid: fs.team[next]!.uid, index: next });
      s.turnSide = fasterSide(s, s.turn);
    }
  } else s.turnSide = foeSide;
  if (s.winner === null && s.turn >= MAX_ACTIONS) {
    // quá dài: bên còn tổng % máu cao hơn thắng
    const pct = (sd: CombatSide) => sd.team.reduce((a, f) => a + f.hp / f.maxHp, 0);
    s.winner = pct(s.sides[0]) >= pct(s.sides[1]) ? 0 : 1;
    events.push({ t: "end", winner: s.winner });
  }
  s.log.push(...events);
  return { ok: true, state: s, events };
}

// ------------------------------------------------------------------ máy (AI)
export type AiLevel = "easy" | "normal" | "hard" | "boss";
const AI_TIMING: Record<AiLevel, [number, number, number, number]> = {
  // red, yellow, green, perfect
  easy: [0.2, 0.5, 0.27, 0.03],
  normal: [0.12, 0.43, 0.4, 0.05],
  hard: [0.06, 0.34, 0.52, 0.08],
  boss: [0.04, 0.3, 0.56, 0.1],
};

/** Máy chọn hành động: biết khắc hệ, máu, kỹ năng; canh lực theo cấp độ khó (ngẫu nhiên tất định theo seed). */
export function aiAction(s: CombatState, side: 0 | 1, level: AiLevel): CombatAction {
  const r = new Rng(hash32(s.seed, 50_000 + s.turn));
  const me = activeOf(s, side);
  const foe = activeOf(s, (1 - side) as 0 | 1);
  const w = AI_TIMING[level];
  const zone = r.pickWeighted(["red", "yellow", "green", "perfect"] as const, (z) => w[["red", "yellow", "green", "perfect"].indexOf(z)]!);
  const hpPct = me.hp / me.maxHp;
  if (skillReady(s, side)) {
    const k = me.skill.kind;
    const useful =
      (k === "heal" && hpPct < 0.6) ||
      (k === "cleanse" && (hpPct < 0.7 || !!me.defDown)) ||
      (k === "shield" && hpPct < 0.8) ||
      (k === "rage" && !me.atkUp) ||
      k === "surge" ||
      k === "drain" ||
      (k === "quake" && !foe.defDown);
    // nộ đã đầy: dùng ngay nếu có ích, không thì giữ tới khi có ích (tối đa vài lượt)
    if (useful || r.chance(0.4)) return { kind: "skill", zone };
  }
  const foeAdv = multiMatchup(allElements(foe), allElements(me)).kind === "strong";
  // máy cũng CANH BẢO VỆ (cùng độ chuẩn với canh lực theo cấp độ khó)
  if ((hpPct < 0.35 && foeAdv && r.chance(0.4)) || (hpPct < 0.2 && r.chance(0.25))) return { kind: "defend", zone };
  return { kind: "attack", zone };
}

/** Hết giờ lượt: tự động PHÒNG THỦ. */
export function timeoutAction(): CombatAction {
  return { kind: "defend" };
}

/** Đánh tự động cả trận (máy vs máy) – dùng mô phỏng cân bằng & kiểm thử. */
export function simulateCombat(teamA: CombatFish[], teamB: CombatFish[], seed: number, levels: [AiLevel, AiLevel] = ["normal", "normal"]): CombatState {
  let s = createCombat(teamA, teamB, seed);
  while (s.winner === null) {
    const r = applyAction(s, s.turnSide, aiAction(s, s.turnSide, levels[s.turnSide]));
    if (!r.ok) throw new Error(r.error);
    s = r.state;
  }
  return s;
}

// ------------------------------------------------------------------ trọng tài phía máy chủ (thuần – có test)
/** Bù trễ mạng khi so thời điểm bấm với đồng hồ máy chủ. */
export const LATENCY_SLACK_MS = 2500;

/**
 * Xét lệnh người chơi gửi lên cho lượt hiện tại – KHÔNG tin số liệu trình duyệt:
 *  - sai lượt (lệnh cũ / gửi trùng) → từ chối;
 *  - quá giờ lượt → tự động PHÒNG THỦ;
 *  - thời điểm bấm khai lớn hơn thời gian thực máy chủ đã chờ (+ bù trễ) hoặc bấm bừa quá sớm → ĐÒN HỤT.
 */
export function refereeAction(
  state: CombatState,
  body: { turn?: unknown; action?: unknown },
  elapsedMs: number,
): { ok: true; action: CombatAction; timedOut: boolean } | { ok: false; status: number; error: string } {
  if (state.winner !== null) return { ok: false, status: 409, error: "Trận đấu đã kết thúc" };
  if (body.turn !== state.turn) return { ok: false, status: 409, error: "Lệnh của lượt cũ (đã xử lý)" };
  if (elapsedMs > TURN_TIME_MS + LATENCY_SLACK_MS) return { ok: true, action: timeoutAction(), timedOut: true };
  const raw = (body.action ?? {}) as { kind?: unknown; pressMs?: unknown };
  if (raw.kind === "defend") {
    // canh bảo vệ: thời điểm bấm do máy chủ xét như canh lực; không gửi thời điểm = phòng thủ thường
    if (raw.pressMs === undefined) return { ok: true, action: { kind: "defend" }, timedOut: false };
    const pm = Number(raw.pressMs);
    const valid = Number.isFinite(pm) && pm >= MIN_PRESS_MS && pm <= Math.min(TURN_TIME_MS, elapsedMs + LATENCY_SLACK_MS);
    return { ok: true, action: { kind: "defend", pressMs: valid ? pm : 0 }, timedOut: false };
  }
  if (raw.kind === "attack" || raw.kind === "skill") {
    const pm = Number(raw.pressMs);
    const valid = Number.isFinite(pm) && pm >= MIN_PRESS_MS && pm <= Math.min(TURN_TIME_MS, elapsedMs + LATENCY_SLACK_MS);
    return { ok: true, action: { kind: raw.kind, pressMs: valid ? pm : 0 }, timedOut: false };
  }
  return { ok: false, status: 400, error: "Hành động không hợp lệ" };
}

/** Máy đánh cho đến khi tới lượt bên `humanSide` (hoặc hết trận). */
export function runAiTurns(s: CombatState, aiSide: 0 | 1, level: AiLevel): { state: CombatState; events: CombatEvent[] } {
  const events: CombatEvent[] = [];
  let st = s;
  while (st.winner === null && st.turnSide === aiSide) {
    const r = applyAction(st, aiSide, aiAction(st, aiSide, level));
    if (!r.ok) break;
    st = r.state;
    events.push(...r.events);
  }
  return { state: st, events };
}

// ---------------------------------------------------------------- góc nhìn người chơi (đấu người)
const flip = (x: 0 | 1): 0 | 1 => (x === 0 ? 1 : 0);

/** Đảo một sự kiện sang góc nhìn bên kia (bên mình luôn là 0). */
export function mirrorEvent(e: CombatEvent): CombatEvent {
  if (e.t === "start") return { ...e, first: flip(e.first) };
  if (e.t === "end") return { ...e, winner: flip(e.winner) };
  return { ...e, side: flip(e.side) } as CombatEvent;
}

/** Đảo trạng thái trận để người chơi bên 1 cũng thấy mình là bên 0 (game chỉ vẽ theo bên 0 = mình). */
export function mirrorCombat(s: CombatState): CombatState {
  return {
    ...s,
    turnSide: flip(s.turnSide),
    winner: s.winner === null ? null : flip(s.winner),
    sides: [s.sides[1], s.sides[0]],
    log: s.log.map(mirrorEvent),
  };
}
