import { FISHING } from "@dccc/game-config";
import { Rng } from "./rng.ts";
import type { FishDef, FishRarity } from "./types.ts";
import { type Loadout, sumPassive } from "./loadout.ts";

export type FishingPhase = "waiting" | "bite" | "reeling" | "caught" | "escaped" | "snapped" | "missed";

export type FishingEvent =
  | { type: "bite" }
  | { type: "too_early" }
  | { type: "hooked" }
  | { type: "struggle_start"; frenzy: boolean }
  | { type: "struggle_end" }
  | { type: "jump" }
  | { type: "crit"; amount: number }
  | { type: "damage"; amount: number }
  | { type: "skill"; skillId: string }
  | { type: "danger" }
  | { type: "caught" }
  | { type: "escaped" }
  | { type: "snapped" }
  | { type: "missed" };

const STRUGGLE_BY_RARITY: Record<FishRarity, number> = {
  common: 0.7,
  rare: 0.85,
  precious: 1.0,
  epic: 1.15,
  legendary: 1.3,
  mythic: 1.45,
  boss: 1.6,
};

export const TICK_MS = 50;

export interface FishingSessionOptions {
  fish: FishDef;
  loadout: Loadout;
  seed: number;
}

interface TimedBuff {
  until: number;
  value: number;
}

/**
 * Mô phỏng một lần câu cá theo bước thời gian cố định (50ms) để kết quả
 * hoàn toàn tất định khi biết seed + chuỗi input. Client chạy để hiển thị;
 * server có thể chạy lại để xác minh.
 */
export class FishingSession {
  readonly fish: FishDef;
  readonly loadout: Loadout;
  readonly seed: number;
  private rng: Rng;

  phase: FishingPhase = "waiting";
  time = 0;
  fishHp: number;
  readonly fishMaxHp: number;
  distance: number = FISHING.startDistance;
  tension = 0;
  durability: number;
  readonly maxDurability: number;
  struggling = false;
  frenzy = false;
  skillReadyAt = 0;
  biteAt: number;
  biteUntil = 0;

  private phaseUntil: number;
  private reeling = false;
  private accumulator = 0;
  private critTimer = 0;
  private events: FishingEvent[] = [];
  private wasDanger = false;
  private buffs = {
    reel: [] as TimedBuff[],
    stun: [] as TimedBuff[],
    calm: [] as TimedBuff[],
    freeze: [] as TimedBuff[],
    double: [] as TimedBuff[],
    burn: [] as TimedBuff[],
  };

  // chỉ số tính trước từ bị động
  private readonly pullMul: number;
  private readonly tensionPenalty: number;
  private readonly tensionGainReduce: number;
  private readonly tensionDecayBonus: number;
  private readonly durabilityLossReduce: number;
  private readonly durabilityRegen: number;
  private readonly struggleReduce: number;
  private readonly snapBonus: number;
  private readonly critChance: number;
  private readonly critMul: number;
  private readonly biteWindow: number;

  constructor(opts: FishingSessionOptions) {
    this.fish = opts.fish;
    this.loadout = opts.loadout;
    this.seed = opts.seed;
    this.rng = new Rng(opts.seed);
    const p = opts.loadout.passives;
    const isBoss = this.fish.rarity === "boss";

    this.fishMaxHp = this.fish.hp;
    this.fishHp = this.fish.hp;
    this.maxDurability = opts.loadout.durability;
    this.durability = this.maxDurability;

    const elementBonus = p.reduce(
      (s, e) => (e.kind === "element_damage" && e.element === this.fish.element ? s + e.value : s),
      0,
    );
    this.pullMul =
      1 +
      sumPassive(p, "pull_bonus", (e) => e.value) +
      (isBoss ? sumPassive(p, "boss_damage", (e) => e.value) : 0) +
      elementBonus;
    this.tensionPenalty = sumPassive(p, "pull_bonus", (e) => e.tensionPenalty ?? 0);
    this.tensionGainReduce = Math.min(0.7, sumPassive(p, "tension_gain_reduce", (e) => e.value));
    this.tensionDecayBonus = sumPassive(p, "tension_decay_bonus", (e) => e.value);
    this.durabilityLossReduce = Math.min(
      0.8,
      opts.loadout.antiSnap / 100 + sumPassive(p, "durability_loss_reduce", (e) => e.value),
    );
    this.durabilityRegen = sumPassive(p, "durability_regen", (e) => e.perSec);
    this.struggleReduce = Math.min(
      0.7,
      sumPassive(p, "struggle_reduce", (e) => e.value) +
        (isBoss ? sumPassive(p, "boss_struggle_reduce", (e) => e.value) : 0),
    );
    this.snapBonus = sumPassive(p, "snap_threshold", (e) => e.value);
    this.critChance = sumPassive(p, "crit", (e) => e.chance);
    this.critMul = Math.max(1.5, ...p.filter((e) => e.kind === "crit").map((e) => (e as { multiplier: number }).multiplier));
    this.biteWindow = FISHING.biteWindow * (1 + sumPassive(p, "bite_window_bonus", (e) => e.value));

    const biteSpeed = sumPassive(p, "bite_speed", (e) => e.value) + opts.loadout.speed / 400;
    const delay = this.rng.range(FISHING.biteDelayMin, FISHING.biteDelayMax) / (1 + biteSpeed);
    this.biteAt = Math.round(delay);
    this.phaseUntil = 0;
  }

  get maxTension(): number {
    return FISHING.maxTension + this.snapBonus;
  }
  get hpRatio(): number {
    return Math.max(0, this.fishHp / this.fishMaxHp);
  }
  get progress(): number {
    return 1 - this.hpRatio;
  }
  get skillCooldownLeft(): number {
    return Math.max(0, this.skillReadyAt - this.time);
  }
  get isOver(): boolean {
    return this.phase === "caught" || this.phase === "escaped" || this.phase === "snapped" || this.phase === "missed";
  }
  isActive(buff: keyof typeof this.buffs): boolean {
    return this.buffs[buff].some((b) => b.until > this.time);
  }

  /** Lấy và xóa hàng đợi sự kiện (client dùng để phát hiệu ứng). */
  drainEvents(): FishingEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  setReeling(on: boolean) {
    this.reeling = on;
  }

  /** Người chơi giật cần. */
  hook(): void {
    if (this.phase === "waiting") {
      // giật sớm làm cá sợ: chờ thêm
      this.biteAt = this.time + Math.round(this.rng.range(1200, 2400));
      this.events.push({ type: "too_early" });
    } else if (this.phase === "bite") {
      this.phase = "reeling";
      this.phaseUntil = this.time + this.calmDuration();
      this.events.push({ type: "hooked" });
    }
  }

  useSkill(): boolean {
    if (this.phase !== "reeling" || this.time < this.skillReadyAt) return false;
    const skill = this.loadout.active;
    this.skillReadyAt = this.time + skill.cooldownMs;
    for (const eff of skill.effects) {
      switch (eff.kind) {
        case "damage_pct":
          this.dealDamage(this.fishMaxHp * eff.value, false);
          break;
        case "tension_reduce":
          this.tension = Math.max(0, this.tension - eff.value);
          break;
        case "reel_boost":
          this.buffs.reel.push({ until: this.time + eff.durationMs, value: eff.value });
          break;
        case "stun":
          this.buffs.stun.push({ until: this.time + eff.durationMs, value: 1 });
          this.endStruggle();
          break;
        case "calm":
          this.buffs.calm.push({ until: this.time + eff.durationMs, value: eff.value });
          break;
        case "durability_restore":
          this.durability = Math.min(this.maxDurability, this.durability + (this.maxDurability * eff.value) / 100);
          break;
        case "freeze":
          this.buffs.freeze.push({ until: this.time + eff.durationMs, value: 1 });
          this.endStruggle();
          break;
        case "distance_pull":
          this.distance = Math.max(8, this.distance - eff.value);
          break;
        case "double_damage":
          this.buffs.double.push({ until: this.time + eff.durationMs, value: 2 });
          break;
        case "burn":
          this.buffs.burn.push({ until: this.time + eff.durationMs, value: eff.valuePctPerSec });
          break;
      }
    }
    this.events.push({ type: "skill", skillId: skill.id });
    this.checkEnd();
    return true;
  }

  /** Tiến mô phỏng theo thời gian thực (ms); nội bộ chia thành tick 50ms. */
  update(dtMs: number): void {
    this.accumulator += Math.min(dtMs, 250);
    while (this.accumulator >= TICK_MS && !this.isOver) {
      this.accumulator -= TICK_MS;
      this.tick();
    }
  }

  private calmDuration() {
    const [a, b] = FISHING.calmPhaseMs;
    return Math.round(this.rng.range(a, b) / (0.6 + this.fish.spd / 100));
  }
  private struggleDuration() {
    const [a, b] = FISHING.strugglePhaseMs;
    return Math.round(this.rng.range(a, b) * (0.8 + this.fish.spd / 250));
  }
  private endStruggle() {
    if (this.struggling) {
      this.struggling = false;
      this.frenzy = false;
      this.phaseUntil = this.time + this.calmDuration();
      this.events.push({ type: "struggle_end" });
    }
  }

  private struggleStrength(): number {
    let s = STRUGGLE_BY_RARITY[this.fish.rarity] * (0.55 + 0.45 * this.hpRatio) * (1 - this.struggleReduce);
    if (this.frenzy) s *= 1.35;
    const calm = this.buffs.calm.filter((b) => b.until > this.time).reduce((m, b) => Math.max(m, b.value), 0);
    return s * (1 - calm);
  }

  private dealDamage(amount: number, canCrit: boolean) {
    let dmg = amount;
    if (this.isActive("double")) dmg *= 2;
    if (canCrit && this.critChance > 0 && this.rng.chance(this.critChance)) {
      dmg *= this.critMul;
      this.events.push({ type: "crit", amount: Math.round(dmg) });
    }
    this.fishHp = Math.max(0, this.fishHp - dmg);
    this.events.push({ type: "damage", amount: dmg });
  }

  private tick() {
    const dt = TICK_MS / 1000;
    this.time += TICK_MS;

    if (this.phase === "waiting") {
      if (this.time >= this.biteAt) {
        this.phase = "bite";
        this.biteUntil = this.time + this.biteWindow;
        this.events.push({ type: "bite" });
      }
      return;
    }
    if (this.phase === "bite") {
      if (this.time >= this.biteUntil) {
        this.phase = "missed";
        this.events.push({ type: "missed" });
      }
      return;
    }
    if (this.phase !== "reeling") return;

    const frozen = this.isActive("freeze");
    const stunned = this.isActive("stun") || frozen;

    // Chuyển pha vùng vẫy
    if (!stunned && this.time >= this.phaseUntil) {
      if (this.struggling) {
        this.endStruggle();
      } else {
        this.struggling = true;
        this.frenzy = this.hpRatio < 0.35 && this.rng.chance(0.5);
        this.phaseUntil = this.time + this.struggleDuration();
        this.events.push({ type: "struggle_start", frenzy: this.frenzy });
        if (this.rng.chance(0.55)) this.events.push({ type: "jump" });
      }
    }

    const strength = stunned || !this.struggling ? 0 : this.struggleStrength();
    const reelBoost = 1 + this.buffs.reel.filter((b) => b.until > this.time).reduce((s, b) => s + b.value, 0);

    // Sát thương cháy
    for (const b of this.buffs.burn) {
      if (b.until > this.time) this.fishHp = Math.max(0, this.fishHp - this.fishMaxHp * b.value * dt);
    }

    if (this.reeling) {
      // Kéo khi cá vùng vẫy gây ít sát thương hơn
      const dmgPerSec = this.loadout.pull * this.pullMul * (this.struggling && !stunned ? 0.45 : 1);
      this.critTimer += TICK_MS;
      if (this.critTimer >= 250) {
        this.critTimer -= 250;
        this.dealDamage(dmgPerSec * 0.25, true);
      }
      this.distance -= FISHING.baseReelPerSec * this.loadout.reelSpeed * reelBoost * (strength > 0 ? 0.3 : 1) * dt;
      if (!frozen) {
        const gain =
          FISHING.tensionGainPerSec * (1 - this.tensionGainReduce + this.tensionPenalty) +
          FISHING.struggleTensionPerSec * strength;
        this.tension += gain * dt;
      }
    } else if (!frozen) {
      this.tension -= FISHING.tensionDecayPerSec * (1 + this.tensionDecayBonus) * dt;
      this.distance += FISHING.idleDriftPerSec * (stunned ? 0 : 1) * dt;
    }
    if (strength > 0) this.distance += FISHING.struggleDistancePerSec * strength * dt;

    this.tension = Math.max(0, Math.min(this.maxTension, this.tension));
    this.distance = Math.max(this.hpRatio > 0 ? 6 : 0, this.distance);

    // Hao mòn dây khi quá căng
    if (this.tension > FISHING.dangerTension) {
      if (!this.wasDanger) this.events.push({ type: "danger" });
      this.wasDanger = true;
      const over = (this.tension - FISHING.dangerTension) / (this.maxTension - FISHING.dangerTension);
      const atMax = this.tension >= this.maxTension ? 2.5 : 1;
      const loss = (FISHING.durabilityLossPerSec * over * atMax * (1 - this.durabilityLossReduce) * this.maxDurability) / 100;
      this.durability -= loss * dt;
    } else {
      this.wasDanger = false;
      this.durability = Math.min(this.maxDurability, this.durability + this.durabilityRegen * dt);
    }

    this.checkEnd();
  }

  private checkEnd() {
    if (this.phase !== "reeling") return;
    if (this.fishHp <= 0) {
      this.phase = "caught";
      this.events.push({ type: "caught" });
    } else if (this.durability <= 0) {
      this.durability = 0;
      this.phase = "snapped";
      this.events.push({ type: "snapped" });
    } else if (this.distance >= FISHING.escapeDistance) {
      this.phase = "escaped";
      this.events.push({ type: "escaped" });
    }
  }
}
