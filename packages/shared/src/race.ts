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
  /** Đang nhảy tới lúc nào / được nhảy lại từ lúc nào (ms). */
  jumpUntil?: number;
  jumpReadyAt?: number;
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

export type ObstacleKind = "seaweed" | "rock" | "current" | "shark" | "log" | "jelly" | "whirl";
export interface Obstacle {
  id: number;
  x: number;
  lane: number;
  kind: ObstacleKind;
  /** Chướng ngại chuyển động: pha + chu kỳ (ms) / tốc độ trôi (m/s). */
  phase?: number;
  period?: number;
  speed?: number;
}

/** Chướng ngại nhảy qua được (cá mập thì không – nó đớp cả khi bạn nhảy!). */
export const JUMPABLE: ReadonlySet<ObstacleKind> = new Set<ObstacleKind>(["seaweed", "rock", "log", "jelly", "whirl"]);

export const OBSTACLE_INFO: Record<ObstacleKind, { name: string; tip: string }> = {
  seaweed: { name: "Rong biển", tip: "Làm chậm – tăng tốc để xé toạc, hoặc nhảy qua" },
  rock: { name: "Đá ngầm", tip: "Khựng mạnh, mất tăng tốc – né hoặc nhảy" },
  current: { name: "Dòng xiết", tip: "Tăng tốc – bật TĂNG TỐC ngay trên dòng xiết để được SIÊU TĂNG TỐC" },
  shark: { name: "Cá mập tuần tra", tip: "Bơi qua lại giữa các làn – KHÔNG nhảy qua được, canh lúc nó rời làn" },
  log: { name: "Khúc gỗ trôi", tip: "Trôi ngược về phía bạn – nhảy đúng lúc" },
  jelly: { name: "Sứa điện", tip: "Lúc nổi lúc chìm – chỉ chích khi đang nổi" },
  whirl: { name: "Xoáy nước", tip: "Cuốn mạnh, gần như đứng yên – né hoặc nhảy" },
};

export type RaceEvent =
  | { type: "boost"; racer: string; super?: boolean }
  | { type: "hit"; racer: string; kind: Exclude<ObstacleKind, "current"> }
  | { type: "smash"; racer: string }
  | { type: "pad"; racer: string }
  | { type: "jump"; racer: string }
  | { type: "dodge_jump"; racer: string; kind: ObstacleKind }
  | { type: "perfect_start"; racer: string }
  | { type: "false_start"; racer: string }
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
  /** Nhảy: thời gian bay + hồi chiêu (ms). */
  jumpMs: 620,
  jumpCooldownMs: 1600,
  /** Cửa sổ "xuất phát hoàn hảo" sau tiếng XUẤT PHÁT (ms). */
  perfectStartMs: 350,
};

/** Mật độ & thành phần chướng ngại theo giải: giải càng cao càng nhiều vật chuyển động. */
const TRACK_MIX: Record<RaceLeague, { gap: [number, number]; w: Record<ObstacleKind, number>; double: number }> = {
  tap_su: { gap: [62, 100], double: 0.3, w: { seaweed: 4, rock: 3, current: 2, log: 2, jelly: 1.5, shark: 1.2, whirl: 0.6 } },
  chuyen_nghiep: { gap: [52, 86], double: 0.38, w: { seaweed: 3, rock: 3, current: 2, log: 2.5, jelly: 2, shark: 2, whirl: 1.2 } },
  huyen_thoai: { gap: [44, 74], double: 0.45, w: { seaweed: 2, rock: 3, current: 2, log: 3, jelly: 2.5, shark: 3, whirl: 2 } },
};

/** Trạng thái chướng ngại tại thời điểm t (ms): vị trí, làn (cá mập: số thực 0..2), đang hoạt động không. */
export function obstacleAt(o: Obstacle, t: number): { x: number; lane: number; lanePos: number; active: boolean } {
  switch (o.kind) {
    case "shark": {
      const lanePos = 1 + Math.sin(((t + (o.phase ?? 0)) / (o.period ?? 2400)) * Math.PI * 2);
      return { x: o.x, lane: Math.round(lanePos), lanePos, active: true };
    }
    case "log":
      return { x: Math.max(30, o.x - ((o.speed ?? 6) * t) / 1000), lane: o.lane, lanePos: o.lane, active: true };
    case "jelly": {
      const p = o.period ?? 1800;
      return { x: o.x, lane: o.lane, lanePos: o.lane, active: (t + (o.phase ?? 0)) % p < p * 0.55 };
    }
    default:
      return { x: o.x, lane: o.lane, lanePos: o.lane, active: true };
  }
}

/** Đường đua theo giải: rong, đá, dòng xiết, cá mập tuần tra, gỗ trôi, sứa điện, xoáy nước. */
export function makeTrack(rng: Rng, league: RaceLeague = "tap_su"): Obstacle[] {
  const mix = TRACK_MIX[league];
  const kinds = Object.keys(mix.w) as ObstacleKind[];
  const out: Obstacle[] = [];
  let x = 140;
  let id = 0;
  while (x < RACE.length - 80) {
    const lane = rng.int(0, RACE.lanes - 1);
    const kind = rng.pickWeighted(kinds, (k) => mix.w[k]);
    const o: Obstacle = { id: id++, x, lane, kind };
    if (kind === "shark") {
      o.lane = 1;
      o.phase = rng.int(0, 4000);
      o.period = rng.int(1800, 3200);
    } else if (kind === "log") {
      o.speed = rng.range(4, 9);
      o.x = x + o.speed * (x / 25); // trôi ngược về – xuất phát xa hơn để tới đúng khoảng đường
    } else if (kind === "jelly") {
      o.phase = rng.int(0, 2000);
      o.period = rng.int(1400, 2200);
    }
    out.push(o);
    // đôi khi chặn thêm 1 làn (không bao giờ chặn cả 3 làn cùng lúc; cá mập luôn đứng một mình)
    if (kind !== "current" && kind !== "shark" && rng.chance(mix.double))
      out.push({ id: id++, x: x + rng.range(-5, 5), lane: (lane + rng.int(1, 2)) % RACE.lanes, kind: rng.chance(0.5) ? "seaweed" : "rock" });
    x += rng.range(mix.gap[0], mix.gap[1]) + (kind === "shark" ? 25 : 0);
  }
  return out;
}

/**
 * Mô phỏng một cuộc đua theo tick 50ms (tất định khi biết seed + chuỗi input).
 * Người chơi: đổi làn, NHẢY, TĂNG TỐC (+ xuất phát hoàn hảo, siêu tăng tốc trên dòng xiết).
 * Máy: đoán trước vị trí chướng ngại chuyển động, né / nhảy theo kỹ năng, tăng tốc khi đầy năng lượng.
 */
export class RaceSession {
  readonly racers: Racer[];
  readonly track: Obstacle[];
  readonly league: RaceLeague;
  time = 0;
  over = false;
  private rng: Rng;
  private acc = 0;
  private events: RaceEvent[] = [];
  private passed = new Map<string, Set<number>>();
  private aiPlan = new Map<string, Map<number, "jump" | "lane" | "ignore">>();
  private finishedOrder: string[] = [];
  private endAt: number | null = null;
  private started = new Set<string>();

  private readonly meId: string;

  /**
   * @param order thứ tự xuất phát (đua nhiều người: theo ô do máy chủ chia, để mọi máy có cùng làn xuất phát).
   */
  constructor(player: Racer, opponents: Racer[], seed: number, order?: Racer[], league: RaceLeague = "tap_su") {
    this.rng = new Rng(seed);
    this.league = league;
    this.track = makeTrack(this.rng, league);
    this.meId = player.id;
    this.racers = order ?? [player, ...opponents];
    // xếp làn xuất phát xen kẽ
    this.racers.forEach((r, i) => {
      r.lane = i % RACE.lanes;
      r.x = -i * 4; // xuất phát so le để không chồng lên nhau
      r.jumpUntil = 0;
      r.jumpReadyAt = 0;
      this.passed.set(r.id, new Set());
      this.aiPlan.set(r.id, new Map());
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

  /** Đổi làn (−1 lên, +1 xuống). Đang bay thì không đổi được. */
  changeLane(id: string, dir: -1 | 1): boolean {
    const r = this.racers.find((x) => x.id === id);
    if (!r || r.finishTime !== null || this.over || this.isJumping(r)) return false;
    const lane = Math.min(RACE.lanes - 1, Math.max(0, r.lane + dir));
    if (lane === r.lane) return false;
    r.lane = lane;
    return true;
  }

  isJumping(r: Racer): boolean {
    return this.time < (r.jumpUntil ?? 0);
  }

  canJump(r: Racer): boolean {
    return r.finishTime === null && this.time >= (r.jumpReadyAt ?? 0) && !this.isJumping(r);
  }

  /** NHẢY qua chướng ngại phía trước (có hồi chiêu). */
  jump(id: string): boolean {
    const r = this.racers.find((x) => x.id === id);
    if (!r || this.over || !this.canJump(r)) return false;
    r.jumpUntil = this.time + RACE.jumpMs;
    r.jumpReadyAt = this.time + RACE.jumpCooldownMs;
    this.events.push({ type: "jump", racer: r.id });
    return true;
  }

  canBoost(r: Racer): boolean {
    return r.energy >= 100 && r.finishTime === null && this.time >= r.boostUntil;
  }

  boost(id: string): boolean {
    const r = this.racers.find((x) => x.id === id);
    if (!r || this.over) return false;
    // xuất phát hoàn hảo: bấm đúng lúc vừa XUẤT PHÁT (chỉ 1 lần)
    if (this.time <= RACE.perfectStartMs && !this.started.has(r.id)) {
      this.started.add(r.id);
      r.v = this.topSpeed(r) * 0.75;
      this.events.push({ type: "perfect_start", racer: r.id });
      return true;
    }
    if (!this.canBoost(r)) return false;
    const onPad = this.time < r.padUntil;
    r.energy = 0;
    r.boostUntil = this.time + RACE.boostMs + r.stats.stamina * 8 + (onPad ? 1200 : 0);
    r.v += this.topSpeed(r) * (onPad ? 0.35 : 0.2);
    r.slowUntil = 0;
    r.boosts++;
    this.events.push({ type: "boost", racer: r.id, super: onPad });
    return true;
  }

  /** Bấm tăng tốc khi chưa xuất phát → khựng lại lúc xuất phát. */
  falseStart(id: string) {
    const r = this.racers.find((x) => x.id === id);
    if (!r || this.started.has(r.id)) return;
    this.started.add(r.id);
    r.slowUntil = 900;
    this.events.push({ type: "false_start", racer: r.id });
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

  /**
   * Chướng ngại nguy hiểm gần nhất phía trước ở 1 làn, ĐOÁN TRƯỚC theo thời điểm sẽ tới
   * (cá mập đổi làn, gỗ trôi lại gần, sứa nổi/chìm). Dùng cho máy và gợi ý.
   */
  hazardAhead(r: Racer, lane: number, lookM: number): { o: Obstacle; dist: number } | null {
    let best: { o: Obstacle; dist: number } | null = null;
    const v = Math.max(4, r.v);
    for (const o of this.track) {
      if (o.kind === "current" || this.passed.get(r.id)!.has(o.id)) continue;
      const now = obstacleAt(o, this.time);
      if (now.x < r.x - 2) continue;
      const closing = v + (o.kind === "log" ? (o.speed ?? 6) : 0);
      const dist = now.x - r.x;
      if (dist > lookM) continue;
      const at = obstacleAt(o, this.time + (dist / closing) * 1000);
      if (at.lane !== lane || !at.active) continue;
      if (!best || dist < best.dist) best = { o, dist };
    }
    return best;
  }

  private tick() {
    const dt = RACE.tickMs / 1000;
    const tPrev = this.time;
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
      const airborne = this.isJumping(r);
      // va chạm: đi qua vị trí chướng ngại trong tick này (tính cả vật chuyển động)
      for (const o of this.track) {
        const seen = this.passed.get(r.id)!;
        if (seen.has(o.id)) continue;
        const a = obstacleAt(o, tPrev);
        const b = obstacleAt(o, this.time);
        if (!(a.x - x0 > 0 && b.x - r.x <= 0)) continue;
        seen.add(o.id);
        if (b.lane !== r.lane || !b.active) continue;
        if (o.kind === "current") {
          if (airborne) continue; // bay qua thì lỡ dòng xiết
          r.padUntil = this.time + 1300;
          this.events.push({ type: "pad", racer: r.id });
          continue;
        }
        if (airborne && JUMPABLE.has(o.kind)) {
          this.events.push({ type: "dodge_jump", racer: r.id, kind: o.kind });
          continue;
        }
        if (boosting && o.kind === "seaweed") {
          // đang tăng tốc thì xé toạc rong biển
          this.events.push({ type: "smash", racer: r.id });
          continue;
        }
        r.hits++;
        const heavy = o.kind === "rock" || o.kind === "shark" || o.kind === "whirl" || o.kind === "log";
        r.slowUntil = this.time + (o.kind === "whirl" ? 1500 : o.kind === "shark" ? 1300 : heavy ? 1100 : 800);
        if (heavy) {
          r.v *= o.kind === "whirl" ? 0.2 : o.kind === "shark" ? 0.3 : 0.45;
          r.boostUntil = Math.min(r.boostUntil, this.time);
        }
        if (o.kind === "shark" || o.kind === "jelly") r.energy = Math.max(0, r.energy - (o.kind === "shark" ? 40 : 25));
        this.events.push({ type: "hit", racer: r.id, kind: o.kind });
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

  /** Máy: đoán trước chướng ngại (kể cả vật chuyển động) → nhảy hoặc đổi làn theo kỹ năng; xuất phát đẹp; tăng tốc. */
  private aiThink(r: Racer) {
    const skill = r.aiSkill ?? 0;
    if (!this.started.has(r.id)) {
      this.started.add(r.id);
      if (this.rng.chance(skill * 0.5)) r.v = this.topSpeed(r) * 0.6;
    }
    const plan = this.aiPlan.get(r.id)!;
    const look = 20 + r.v * 1.0;
    const h = this.hazardAhead(r, r.lane, look);
    if (h) {
      let choice = plan.get(h.o.id);
      if (!choice) {
        choice = !this.rng.chance(skill) ? "ignore" : JUMPABLE.has(h.o.kind) && this.rng.chance(0.55) ? "jump" : "lane";
        plan.set(h.o.id, choice);
        if (choice === "lane") {
          const options = [r.lane - 1, r.lane + 1].filter((l) => l >= 0 && l < RACE.lanes && !this.hazardAhead(r, l, look));
          if (options.length) r.lane = pick(this.rng, options);
          else if (JUMPABLE.has(h.o.kind)) plan.set(h.o.id, "jump");
        }
      }
      // nhảy đúng lúc: khi còn ~0,3 giây tới chướng ngại
      if (plan.get(h.o.id) === "jump" && h.dist < Math.max(4, r.v * 0.32) && this.canJump(r)) this.jump(r.id);
    } else {
      const padAhead = this.track.find((o) => o.kind === "current" && o.x > r.x && o.x < r.x + look && Math.abs(o.lane - r.lane) === 1 && !plan.has(o.id));
      if (padAhead) {
        plan.set(padAhead.id, "lane");
        if (!this.hazardAhead(r, padAhead.lane, padAhead.x - r.x) && this.rng.chance(skill * 0.6)) r.lane = padAhead.lane;
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
