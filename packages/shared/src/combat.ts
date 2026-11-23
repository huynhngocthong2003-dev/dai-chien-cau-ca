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
import { elementMatchup, type MatchupKind } from "./elements.ts";

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
export const DEFEND_REDUCE = 0.4;
export const SKILL_COOLDOWN = 3;
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

export interface CombatSkill {
  name: string;
  kind: SkillKind;
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

/** Kỹ năng trận của một loài: tên theo dữ liệu loài, cơ chế theo hệ, độ mạnh riêng theo loài. */
export function combatSkillFor(f: Pick<FishDef, "id" | "skill">, element: Element): CombatSkill {
  const kind = SKILL_BY_ELEMENT[element];
  const power = Math.round((0.9 + (strHash(f.id) % 1000) / 4000) * 100) / 100; // 0.90 – 1.15
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const d: Record<SkillKind, [boolean, string]> = {
    shield: [false, `Giáp Kim Cương: giảm ${pct(0.45 * power)} sát thương nhận vào trong 2 lượt.`],
    heal: [false, `Sinh Mệnh: hồi ${pct(0.3 * power)} máu tối đa.`],
    surge: [true, `Thủy Triều: đòn đánh ×${(1.6 * power).toFixed(2)} sát thương.`],
    rage: [false, `Bùng Cháy: tăng ${pct(0.35 * power)} sức tấn công trong 3 lượt.`],
    quake: [true, `Địa Chấn: đánh thường và giảm ${pct(0.4 * power)} phòng thủ đối thủ trong 3 lượt.`],
    drain: [true, `Hút Sinh Lực: đòn ×${(1.2 * power).toFixed(2)}, hồi máu bằng 60% sát thương gây ra.`],
    cleanse: [false, `Thanh Tẩy: xoá hiệu ứng bất lợi, hồi ${pct(0.2 * power)} máu và giảm 20% sát thương nhận vào 1 lượt.`],
  };
  const [attack, description] = d[kind];
  return { name: f.skill.name, kind, power, attack, description };
}

// ------------------------------------------------------------------ trạng thái trận
export interface CombatFish {
  uid: string;
  fishId: string;
  name: string;
  element: Element;
  level: number;
  stars: number;
  form: string | null;
  maxHp: number;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  skill: CombatSkill;
  /** Số lượt (của chính nó) còn lại trước khi dùng lại kỹ năng; 0 = sẵn sàng. */
  cd: number;
  defending: boolean;
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
}

export type CombatAction = { kind: "attack"; pressMs?: number; zone?: TimingZone } | { kind: "skill"; pressMs?: number; zone?: TimingZone } | { kind: "defend" };

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
  | { t: "defend"; side: 0 | 1; auto?: boolean }
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
    level: i.level,
    stars: i.stars,
    form: i.form?.id ?? null,
    maxHp,
    hp: maxHp,
    atk: Math.max(1, Math.round(s.atk * COMBAT_K.atk)),
    def: Math.max(0, Math.round(s.def * COMBAT_K.def)),
    spd: s.spd,
    skill: combatSkillFor(i.def, i.element),
    cd: 1,
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
      { team: teamA, active: 0, combo: 0 },
      { team: teamB, active: 0, combo: 0 },
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

export function skillReady(s: CombatState, side: 0 | 1): boolean {
  return activeOf(s, side).cd <= 0;
}

/** Sát thương của 1 đòn (đã gồm phòng thủ, giảm sát thương). Thuần – có test. */
export function computeDamage(att: CombatFish, tgt: CombatFish, zone: TimingZone, skillMult: number) {
  const m = elementMatchup(att.element, tgt.element);
  const atk = att.atk * (att.atkUp ? att.atkUp[0] : 1);
  const def = tgt.def * (tgt.defDown ? 1 - tgt.defDown[0] : 1);
  const base = atk * TIMING_MULT[zone] * m.mult * skillMult;
  let dmg = Math.max(1, base - def);
  if (tgt.defending) dmg *= 1 - DEFEND_REDUCE;
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
    foe.hp = Math.max(0, foe.hp - r.dmg);
    foe.defending = false; // phòng thủ hết sau khi nhận đòn
    const green = zone === "green" || zone === "perfect";
    s.sides[side].combo = green ? s.sides[side].combo + 1 : 0;
    events.push({ t: "attack", side, skill: skillName, zone, matchup: r.matchup, dmg: r.dmg, defended, combo: s.sides[side].combo, hp: foe.hp });
    return r.dmg;
  };

  if (action.kind === "defend") {
    me.defending = true;
    events.push({ t: "defend", side });
  } else if (action.kind === "attack") {
    const z = zoneOf(action);
    if (!z) return { ok: false, error: "Thiếu thời điểm canh lực" };
    strike(z, 1, null);
  } else {
    if (me.cd > 0) return { ok: false, error: `Kỹ năng còn hồi ${me.cd} lượt` };
    const sk = me.skill;
    const p = sk.power;
    events.push({ t: "skill", side, name: sk.name, kind: sk.kind, text: sk.description });
    if (sk.attack) {
      const z = zoneOf(action);
      if (!z) return { ok: false, error: "Thiếu thời điểm canh lực" };
      if (sk.kind === "surge") strike(z, 1.6 * p, sk.name);
      else if (sk.kind === "quake") {
        strike(z, 1, sk.name);
        foe.defDown = [Math.min(0.7, 0.4 * p), 3];
      } else if (sk.kind === "drain") {
        const d = strike(z, 1.2 * p, sk.name);
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
    me.cd = SKILL_COOLDOWN + 1; // +1 vì cuối lượt này trừ 1
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
  if (me.cd <= 0) {
    const k = me.skill.kind;
    const useful =
      (k === "heal" && hpPct < 0.6) ||
      (k === "cleanse" && (hpPct < 0.7 || !!me.defDown)) ||
      (k === "shield" && hpPct < 0.8) ||
      (k === "rage" && !me.atkUp) ||
      k === "surge" ||
      k === "drain" ||
      (k === "quake" && !foe.defDown);
    if (useful) return { kind: "skill", zone };
  }
  const foeAdv = elementMatchup(foe.element, me.element).kind === "strong";
  if (hpPct < 0.3 && foeAdv && r.chance(0.35)) return { kind: "defend" };
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
  if (raw.kind === "defend") return { ok: true, action: { kind: "defend" }, timedOut: false };
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
