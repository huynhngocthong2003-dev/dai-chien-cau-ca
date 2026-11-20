import { RARITY_ORDER } from "@dccc/game-config";
import { Rng } from "./rng.ts";
import type { FishDef, FishFormDef } from "./types.ts";
import { addLedger, clone, grantXp, markTx, type ActionResult, type OwnedFish, type PlayerSave } from "./save.ts";

/**
 * ĐUA CÁ: nhân vật cưỡi cá đua trên 3 làn nước.
 * Mỗi con cá có chỉ số đua riêng, ngẫu nhiên khi câu được (sinh tất định từ mã riêng `uid` của con cá
 * + loài, độ hiếm, cấp, sao, thể đột biến, cân nặng) → cá cũ trong kho cũng có chỉ số mà không cần đổi save.
 */
export interface RaceStats {
  /** Tốc độ tối đa. */
  speed: number;
  /** Khả năng tăng tốc. */
  accel: number;
  /** Thể lực: hồi năng lượng tăng tốc, đỡ đuối sức cuối đường. */
  stamina: number;
  score: number;
  grade: "S" | "A" | "B" | "C" | "D";
}

function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[rng.int(0, items.length - 1)]!;
}

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Ba lần gieo ngẫu nhiên cố định của một con cá (0..1). */
export function raceRolls(uid: string): [number, number, number] {
  const r = new Rng(hash32(`race:${uid}`) || 1);
  return [r.next(), r.next(), r.next()];
}

export function raceGrade(score: number): RaceStats["grade"] {
  return score >= 80 ? "S" : score >= 68 ? "A" : score >= 56 ? "B" : score >= 45 ? "C" : "D";
}

export function raceStats(o: Pick<OwnedFish, "uid" | "level" | "stars" | "weightKg" | "form">, def: Pick<FishDef, "spd" | "rarity">, form?: FishFormDef | null): RaceStats {
  const ri = Math.max(0, RARITY_ORDER.indexOf(def.rarity));
  const [r1, r2, r3] = raceRolls(o.uid);
  const kg = Math.log10(1 + Math.max(0, o.weightKg));
  const formB = form || o.form ? 1 : 0;
  const speed = 30 + def.spd * 0.45 + ri * 3 + o.level * 0.25 + (o.stars - 1) * 2 + formB * 6 + (r1 - 0.4) * 18;
  const accel = 22 + def.spd * 0.25 + ri * 2 + o.level * 0.15 + formB * 4 + (r2 - 0.4) * 16 - Math.min(10, kg * 3);
  const stamina = 40 + ri * 4 + o.stars * 3 + o.level * 0.2 + formB * 5 + (r3 - 0.4) * 24 + Math.min(12, kg * 4);
  const round = (v: number) => Math.round(Math.max(5, v) * 10) / 10;
  const s = { speed: round(speed), accel: round(accel), stamina: round(stamina) };
  const score = Math.round((s.speed * 0.55 + s.accel * 0.25 + s.stamina * 0.2) * 10) / 10;
  return { ...s, score, grade: raceGrade(score) };
}

// ------------------------------------------------------------------ giải đua
export type RaceLeague = "tap_su" | "chuyen_nghiep" | "huyen_thoai";

export interface LeagueDef {
  id: RaceLeague;
  name: string;
  minLevel: number;
  fee: number;
  prizes: [number, number, number];
  firstDiamonds: number;
  xp: number;
  /** Độ hiếm cá của đối thủ máy. */
  rarities: FishDef["rarity"][];
  aiLevel: [number, number];
  aiStars: [number, number];
  /** Khả năng né chướng ngại của máy (0..1). */
  aiSkill: number;
}

export const RACE_LEAGUES: Record<RaceLeague, LeagueDef> = {
  tap_su: { id: "tap_su", name: "Giải Tập Sự", minLevel: 1, fee: 50, prizes: [250, 120, 60], firstDiamonds: 0, xp: 15, rarities: ["common", "rare"], aiLevel: [1, 10], aiStars: [1, 1], aiSkill: 0.45 },
  chuyen_nghiep: { id: "chuyen_nghiep", name: "Giải Chuyên Nghiệp", minLevel: 8, fee: 300, prizes: [1500, 700, 350], firstDiamonds: 2, xp: 40, rarities: ["rare", "precious", "epic"], aiLevel: [10, 30], aiStars: [1, 3], aiSkill: 0.65 },
  huyen_thoai: { id: "huyen_thoai", name: "Giải Huyền Thoại", minLevel: 20, fee: 1500, prizes: [7000, 3000, 1500], firstDiamonds: 8, xp: 100, rarities: ["epic", "legendary", "mythic", "boss"], aiLevel: [30, 60], aiStars: [2, 5], aiSkill: 0.85 },
};

const AI_NAMES = ["Tèo Tốc Độ", "Bà Năm Lướt Sóng", "Chú Sáu Rẽ Nước", "Bé Na Tia Chớp", "Anh Ba Phi Thuyền", "Cô Út Gió Lốc", "Ông Tư Cá Kình", "Bốn Mắt Lướt Ván", "Tí Nị Siêu Tốc", "Đại Ca Sông Hồng"];

export interface Racer {
  id: string;
  name: string;
  fishId: string;
  formId: string | null;
  charId: string;
  stats: RaceStats;
  /** null = người chơi điều khiển. */
  aiSkill: number | null;
  /** Người chơi khác (vị trí nhận qua mạng, không mô phỏng ở máy này). */
  remote?: boolean;
  lane: number;
  x: number;
  v: number;
  energy: number;
  boostUntil: number;
  slowUntil: number;
  padUntil: number;
  finishTime: number | null;
  hits: number;
  boosts: number;
}

/** Tạo đối thủ máy theo giải. */
export function makeRaceOpponents(league: RaceLeague, fishes: FishDef[], charIds: string[], rng: Rng, n = 4): Racer[] {
  const L = RACE_LEAGUES[league];
  const pool = fishes.filter((f) => L.rarities.includes(f.rarity));
  const names = [...AI_NAMES];
  return Array.from({ length: n }, (_, i) => {
    const def = pick(rng, pool);
    const uid = `ai_${rng.int(1, 1e9)}`;
    const o = { uid, level: rng.int(L.aiLevel[0], L.aiLevel[1]), stars: rng.int(L.aiStars[0], L.aiStars[1]), weightKg: rng.range(def.weightKg[0], def.weightKg[1]), form: undefined };
    const name = names.splice(rng.int(0, names.length - 1), 1)[0]!;
    return newRacer(`ai${i}`, name, def.id, null, pick(rng, charIds), raceStats(o, def), L.aiSkill);
  });
}

export function newRacer(id: string, name: string, fishId: string, formId: string | null, charId: string, stats: RaceStats, aiSkill: number | null): Racer {
  return { id, name, fishId, formId, charId, stats, aiSkill, lane: 1, x: 0, v: 0, energy: 30, boostUntil: 0, slowUntil: 0, padUntil: 0, finishTime: null, hits: 0, boosts: 0 };
}

export type ObstacleKind = "seaweed" | "rock" | "current";
export interface Obstacle {
  id: number;
  x: number;
  lane: number;
  kind: ObstacleKind;
}

export type RaceEvent =
  | { type: "boost"; racer: string }
  | { type: "hit"; racer: string; kind: "seaweed" | "rock" }
  | { type: "smash"; racer: string }
  | { type: "pad"; racer: string }
  | { type: "finish"; racer: string; place: number }
  | { type: "energy_full"; racer: string };

export const RACE = {
  length: 1200,
  lanes: 3,
  tickMs: 50,
  boostMs: 2200,
  boostMul: 1.45,
  /** Năng lượng mỗi giây = base + thể lực × hệ số. */
  energyBase: 9,
  energyPerStamina: 0.09,
  /** Đổi tốc độ hiển thị (m/s) từ chỉ số. */
  speedToMs: 0.45,
};

/** Đường đua: rong biển (chậm), đá (chậm nặng), dòng xiết (tăng tốc). */
export function makeTrack(rng: Rng): Obstacle[] {
  const out: Obstacle[] = [];
  let x = 140;
  let id = 0;
  while (x < RACE.length - 80) {
    const lane = rng.int(0, RACE.lanes - 1);
    const kind = rng.pickWeighted<ObstacleKind>(["seaweed", "rock", "current"], (k) => (k === "seaweed" ? 4 : k === "rock" ? 3 : 2));
    out.push({ id: id++, x, lane, kind });
    // đôi khi chặn 2 làn cùng lúc
    if (kind !== "current" && rng.chance(0.3)) out.push({ id: id++, x: x + rng.range(-6, 6), lane: (lane + rng.int(1, 2)) % RACE.lanes, kind: rng.chance(0.5) ? "seaweed" : "rock" });
    x += rng.range(70, 120);
  }
  return out;
}

/**
 * Mô phỏng một cuộc đua theo tick 50ms (tất định khi biết seed + chuỗi input).
 * Người chơi: đổi làn + tăng tốc. Máy: né chướng ngại theo kỹ năng, tăng tốc khi đầy năng lượng.
 */
export class RaceSession {
  readonly racers: Racer[];
  readonly track: Obstacle[];
  time = 0;
  over = false;
  private rng: Rng;
  private acc = 0;
  private events: RaceEvent[] = [];
  private passed = new Map<string, Set<number>>();
  private aiPlan = new Map<string, Set<number>>();
  private finishedOrder: string[] = [];
  private endAt: number | null = null;

  private readonly meId: string;

  /**
   * @param order thứ tự xuất phát (đua nhiều người: theo ô do máy chủ chia, để mọi máy có cùng làn xuất phát).
   */
  constructor(player: Racer, opponents: Racer[], seed: number, order?: Racer[]) {
    this.rng = new Rng(seed);
    this.track = makeTrack(this.rng);
    this.meId = player.id;
    this.racers = order ?? [player, ...opponents];
    // xếp làn xuất phát xen kẽ
    this.racers.forEach((r, i) => {
      r.lane = i % RACE.lanes;
      r.x = -i * 4; // xuất phát so le để không chồng lên nhau
      this.passed.set(r.id, new Set());
      this.aiPlan.set(r.id, new Set());
    });
  }

  get player(): Racer {
    return this.racers.find((r) => r.id === this.meId)!;
  }

  /** Cập nhật người chơi khác từ mạng. */
  setRemote(id: string, st: { x: number; lane: number; boosting: boolean; finishTime: number | null }) {
    const r = this.racers.find((x) => x.id === id && x.remote);
    if (!r) return;
    r.v = Math.max(0, (st.x - r.x) * 2);
    r.x = st.x;
    r.lane = Math.min(RACE.lanes - 1, Math.max(0, st.lane));
    r.boostUntil = st.boosting ? this.time + 300 : Math.min(r.boostUntil, this.time);
    if (st.finishTime !== null && r.finishTime === null) r.finishTime = st.finishTime;
  }

  drainEvents(): RaceEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  topSpeed(r: Racer): number {
    return r.stats.speed * RACE.speedToMs;
  }

  /** Đổi làn (−1 lên, +1 xuống). */
  changeLane(id: string, dir: -1 | 1): boolean {
    const r = this.racers.find((x) => x.id === id);
    if (!r || r.finishTime !== null || this.over) return false;
    const lane = Math.min(RACE.lanes - 1, Math.max(0, r.lane + dir));
    if (lane === r.lane) return false;
    r.lane = lane;
    return true;
  }

  canBoost(r: Racer): boolean {
    return r.energy >= 100 && r.finishTime === null && this.time >= r.boostUntil;
  }

  boost(id: string): boolean {
    const r = this.racers.find((x) => x.id === id);
    if (!r || !this.canBoost(r) || this.over) return false;
    r.energy = 0;
    r.boostUntil = this.time + RACE.boostMs + r.stats.stamina * 8;
    r.v += this.topSpeed(r) * 0.2;
    r.slowUntil = 0;
    r.boosts++;
    this.events.push({ type: "boost", racer: r.id });
    return true;
  }

  update(dtMs: number) {
    this.acc += Math.min(250, dtMs);
    while (this.acc >= RACE.tickMs && !this.over) {
      this.acc -= RACE.tickMs;
      this.tick();
    }
  }

  /** Thứ hạng hiện tại (đã về đích trước, sau đó theo quãng đường). */
  standings(): Racer[] {
    return [...this.racers].sort((a, b) => {
      if (a.finishTime !== null && b.finishTime !== null) return a.finishTime - b.finishTime;
      if (a.finishTime !== null) return -1;
      if (b.finishTime !== null) return 1;
      return b.x - a.x;
    });
  }

  placeOf(id: string): number {
    return this.standings().findIndex((r) => r.id === id) + 1;
  }

  private tick() {
    const dt = RACE.tickMs / 1000;
    this.time += RACE.tickMs;
    for (const r of this.racers) {
      if (r.remote) continue;
      if (r.finishTime !== null) {
        r.x += r.v * dt;
        r.v *= 0.97;
        continue;
      }
      if (r.aiSkill !== null) this.aiThink(r);
      // năng lượng
      if (this.time >= r.boostUntil) {
        const before = r.energy;
        r.energy = Math.min(100, r.energy + (RACE.energyBase + r.stats.stamina * RACE.energyPerStamina) * dt);
        if (before < 100 && r.energy >= 100) this.events.push({ type: "energy_full", racer: r.id });
      }
      const boosting = this.time < r.boostUntil;
      const slowed = this.time < r.slowUntil;
      const pad = this.time < r.padUntil;
      // đuối sức nửa sau đường đua (thể lực cao đỡ đuối)
      const prog = r.x / RACE.length;
      const fatigue = 1 - Math.max(0, prog - 0.5) * Math.max(0, 1 - r.stats.stamina / 120) * 0.3;
      const target = this.topSpeed(r) * fatigue * (boosting ? RACE.boostMul : 1) * (slowed ? 0.45 : 1) * (pad ? 1.25 : 1);
      const k = Math.min(1, (0.25 + r.stats.accel / 90) * dt * (target < r.v ? 2.5 : 1));
      r.v += (target - r.v) * k;
      const x0 = r.x;
      r.x += r.v * dt;
      // va chạm chướng ngại khi đi qua
      for (const o of this.track) {
        if (o.lane !== r.lane || o.x <= x0 || o.x > r.x) continue;
        const seen = this.passed.get(r.id)!;
        if (seen.has(o.id)) continue;
        seen.add(o.id);
        if (o.kind === "current") {
          r.padUntil = this.time + 1300;
          this.events.push({ type: "pad", racer: r.id });
        } else if (boosting && o.kind === "seaweed") {
          // đang tăng tốc thì xé toạc rong biển
          this.events.push({ type: "smash", racer: r.id });
        } else {
          r.hits++;
          r.slowUntil = this.time + (o.kind === "rock" ? 1100 : 750);
          if (o.kind === "rock") {
            r.v *= 0.45;
            r.boostUntil = Math.min(r.boostUntil, this.time);
          }
          this.events.push({ type: "hit", racer: r.id, kind: o.kind });
        }
      }
      if (r.x >= RACE.length) {
        r.finishTime = this.time;
        this.finishedOrder.push(r.id);
        this.events.push({ type: "finish", racer: r.id, place: this.finishedOrder.length });
        if (r.id === this.player.id && this.endAt === null) this.endAt = this.time + 3000;
      }
    }
    if (this.racers.every((r) => r.finishTime !== null || r.remote) && this.player.finishTime !== null) this.over = true;
    if (this.endAt !== null && this.time >= this.endAt) this.over = true;
    // giới hạn an toàn: 3 phút
    if (this.time > 180_000) this.over = true;
  }

  /** Máy: thấy chướng ngại phía trước trong làn → né (theo kỹ năng); thấy dòng xiết làn bên → có thể rẽ vào. */
  private aiThink(r: Racer) {
    const skill = r.aiSkill ?? 0;
    const look = 25 + r.v * 1.1;
    const plan = this.aiPlan.get(r.id)!;
    const ahead = this.track.filter((o) => o.x > r.x && o.x < r.x + look);
    const danger = ahead.find((o) => o.lane === r.lane && o.kind !== "current" && !plan.has(o.id));
    if (danger) {
      plan.add(danger.id);
      if (this.rng.chance(skill)) {
        const blocked = (lane: number) => ahead.some((o) => o.lane === lane && o.kind !== "current");
        const options = [r.lane - 1, r.lane + 1].filter((l) => l >= 0 && l < RACE.lanes && !blocked(l));
        if (options.length) r.lane = pick(this.rng, options);
      }
    } else {
      const padAhead = ahead.find((o) => o.kind === "current" && Math.abs(o.lane - r.lane) === 1 && !plan.has(o.id));
      if (padAhead) {
        plan.add(padAhead.id);
        const safe = !ahead.some((o) => o.lane === padAhead.lane && o.kind !== "current" && o.x < padAhead.x);
        if (safe && this.rng.chance(skill * 0.6)) r.lane = padAhead.lane;
      }
    }
    if (this.canBoost(r) && this.rng.chance(0.02 + skill * 0.03)) this.boost(r.id);
  }
}

// ------------------------------------------------------------------ phần thưởng (sổ cái)
/** Ghi danh: trừ phí vào cửa. */
export function applyRaceEntry(save: PlayerSave, input: { txId: string; league: RaceLeague; fishUid: string; now: number }): ActionResult {
  if (save.appliedTx.includes(input.txId)) return { ok: false, error: "Đã ghi danh" };
  const L = RACE_LEAGUES[input.league];
  if (!L) return { ok: false, error: "Giải không tồn tại" };
  if (save.level < L.minLevel) return { ok: false, error: `Cần cấp ${L.minLevel} để vào ${L.name}` };
  if (!save.fishes.some((f) => f.uid === input.fishUid)) return { ok: false, error: "Không tìm thấy cá" };
  if (save.gold < L.fee) return { ok: false, error: `Cần ${L.fee} vàng phí vào cửa` };
  const s = clone(save);
  s.gold -= L.fee;
  addLedger(s, input.txId, "gold", -L.fee, `race_entry:${input.league}`, input.now);
  markTx(s, input.txId);
  s.updatedAt = input.now;
  return { ok: true, save: s };
}

export interface RaceReward {
  gold: number;
  diamonds: number;
  xp: number;
}

export function raceReward(league: RaceLeague, place: number): RaceReward {
  const L = RACE_LEAGUES[league];
  return { gold: L.prizes[place - 1] ?? 0, diamonds: place === 1 ? L.firstDiamonds : 0, xp: place <= 3 ? L.xp : Math.round(L.xp / 3) };
}

/** Nhận thưởng sau cuộc đua (mỗi lần ghi danh chỉ nhận 1 lần). */
export function applyRaceResult(save: PlayerSave, input: { entryTx: string; league: RaceLeague; place: number; now: number }): ActionResult & { reward?: RaceReward } {
  const txId = `${input.entryTx}_r`;
  if (!save.appliedTx.includes(input.entryTx)) return { ok: false, error: "Chưa ghi danh cuộc đua này" };
  if (save.appliedTx.includes(txId)) return { ok: false, error: "Đã nhận thưởng cuộc đua này" };
  if (!Number.isInteger(input.place) || input.place < 1 || input.place > 5) return { ok: false, error: "Thứ hạng không hợp lệ" };
  const rw = raceReward(input.league, input.place);
  const s = clone(save);
  if (rw.gold) {
    s.gold += rw.gold;
    addLedger(s, txId, "gold", rw.gold, `race_prize:${input.league}:${input.place}`, input.now);
  }
  if (rw.diamonds) {
    s.diamonds += rw.diamonds;
    addLedger(s, txId, "diamonds", rw.diamonds, `race_prize:${input.league}:${input.place}`, input.now);
  }
  if (rw.xp) {
    addLedger(s, txId, "xp", rw.xp, `race:${input.league}`, input.now);
    grantXp(s, rw.xp);
  }
  s.stats.races = (s.stats.races ?? 0) + 1;
  if (input.place === 1) s.stats.raceWins = (s.stats.raceWins ?? 0) + 1;
  markTx(s, txId);
  s.updatedAt = input.now;
  return { ok: true, save: s, reward: rw };
}

/** Cá hợp đua nhất trong kho (điểm cao trước). */
export function raceCandidates(fishes: OwnedFish[], fishById: Map<string, FishDef>, formById?: Map<string, FishFormDef>, limit = 12) {
  return fishes
    .filter((f) => fishById.has(f.fishId))
    .map((f) => ({ fish: f, stats: raceStats(f, fishById.get(f.fishId)!, f.form ? formById?.get(f.form) : null) }))
    .sort((a, b) => b.stats.score - a.stats.score)
    .slice(0, limit);
}
