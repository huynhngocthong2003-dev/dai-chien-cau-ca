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
  | { type: "warn" }
  | { type: "jump" }
  | { type: "dodge"; combo: number; amount: number }
  | { type: "jump_fail" }
  | { type: "perfect"; combo: number }
  | { type: "combo_break" }
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

/** Kiểu vùng vẫy của từng loài – người chơi học cách đối phó với từng con. */
export type FightStyle = "steady" | "darter" | "diver" | "jumper" | "boss" | "junk";

export const FIGHT_STYLE_INFO: Record<FightStyle, { name: string; tip: string }> = {
  steady: { name: "Bền bỉ", tip: "Quẫy đều đặn – nhả dây khi thấy báo hiệu" },
  darter: { name: "Giật lắt nhắt", tip: "Quẫy ngắn liên tục – báo hiệu rất nhanh!" },
  diver: { name: "Lặn sâu", tip: "Quẫy lâu, kéo dây ra xa – đừng cố kéo khi nó lặn" },
  jumper: { name: "Hay nhảy", tip: "Thường nhảy khỏi mặt nước – NHẢ TAY khi cá bay lên để né" },
  boss: { name: "Chúa tể", tip: "Đủ mọi chiêu – canh báo hiệu, né cú nhảy, kéo khi nó mệt" },
  junk: { name: "Rác", tip: "Cứ kéo thôi" },
};

interface StyleMods {
  calm: number;
  struggle: number;
  strength: number;
  push: number;
  jump: number;
  tellMs: number;
}
const STYLE_MODS: Record<FightStyle, StyleMods> = {
  steady: { calm: 1, struggle: 1, strength: 1, push: 1, jump: 0.35, tellMs: 650 },
  darter: { calm: 0.55, struggle: 0.5, strength: 0.85, push: 0.8, jump: 0.2, tellMs: 420 },
  diver: { calm: 1.1, struggle: 1.45, strength: 1.05, push: 1.6, jump: 0, tellMs: 750 },
  jumper: { calm: 0.95, struggle: 0.9, strength: 0.95, push: 0.9, jump: 0.9, tellMs: 600 },
  boss: { calm: 0.9, struggle: 1.1, strength: 1, push: 1.15, jump: 0.55, tellMs: 600 },
  junk: { calm: 1, struggle: 1, strength: 1, push: 1, jump: 0, tellMs: 650 },
};

/** Xác định kiểu vùng vẫy (tất định theo loài). */
export function fightStyle(fish: Pick<FishDef, "id" | "rarity" | "spd">): FightStyle {
  if (fish.id.startsWith("j_")) return "junk";
  if (fish.rarity === "boss") return "boss";
  let h = 0;
  for (const ch of fish.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  if (fish.spd >= 70 && h % 3 !== 0) return "darter";
  const pool: FightStyle[] = ["steady", "darter", "diver", "jumper"];
  return pool[h % pool.length]!;
}

/** Cửa sổ "cá mệt" sau mỗi lần quẫy: kéo lúc này gây sát thương lớn và tăng combo. */
export const TIRED_WINDOW_MS = 900;
/** Thời gian cá bay trên không – nhả tay để né. */
export const JUMP_WINDOW_MS = 750;
/** Combo cao nhất → thưởng cân nặng (tối đa +25%). */
export function comboWeightBonus(maxCombo: number): number {
  return Math.min(0.25, maxCombo * 0.03);
}

/** Sự kiện ngẫu nhiên khi quăng cần – giữ hiệu lực vài lần quăng. */
export type CastEventKind = "school" | "giant";
export const CAST_EVENT_INFO: Record<CastEventKind, { name: string; desc: string; casts: number }> = {
  school: { name: "🌟 ĐÀN CÁ QUÝ!", desc: "Cá hiếm dễ cắn hơn trong 3 lần quăng", casts: 3 },
  giant: { name: "🐋 MÙA CÁ LỚN!", desc: "Cá nặng hơn 35% trong 3 lần quăng", casts: 3 },
};
export function rollCastEvent(rng: Rng): CastEventKind | null {
  const r = rng.next();
  if (r < 0.05) return "school";
  if (r < 0.08) return "giant";
  return null;
}
/** Áp hiệu ứng sự kiện vào đội hình (đàn cá quý: +60 may mắn). */
export function applyCastEvent(loadout: Loadout, ev: CastEventKind | null): Loadout {
  return ev === "school" ? { ...loadout, luck: loadout.luck + 60 } : loadout;
}
export function castEventWeightMul(ev: CastEventKind | null): number {
  return ev === "giant" ? 1.35 : 1;
}

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
  readonly style: FightStyle;
  /** Đang báo hiệu sắp quẫy (người chơi nên nhả tay). */
  warning = false;
  /** Cá đang bay trên không – kéo lúc này bị phạt. */
  jumpUntil = 0;
  /** Cửa sổ cá mệt. */
  tiredUntil = 0;
  combo = 0;
  maxCombo = 0;

  private phaseUntil: number;
  private reeling = false;
  private accumulator = 0;
  private critTimer = 0;
  private events: FishingEvent[] = [];
  private wasDanger = false;
  private warnUntil = 0;
  private jumpFailed = false;
  private tiredHit = false;
  private readonly mods: StyleMods;
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
    this.style = fightStyle(opts.fish);
    this.mods = STYLE_MODS[this.style];
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
  get jumping(): boolean {
    return this.jumpUntil > this.time;
  }
  get tired(): boolean {
    return this.tiredUntil > this.time;
  }
  /** Thưởng cân nặng nhờ combo. */
  get weightBonus(): number {
    return comboWeightBonus(this.maxCombo);
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
    return Math.round((this.rng.range(a, b) / (0.6 + this.fish.spd / 100)) * this.mods.calm);
  }
  private struggleDuration() {
    const [a, b] = FISHING.strugglePhaseMs;
    return Math.round(this.rng.range(a, b) * (0.8 + this.fish.spd / 250) * this.mods.struggle);
  }
  private endStruggle() {
    if (this.struggling) {
      this.struggling = false;
      this.frenzy = false;
      this.phaseUntil = this.time + this.calmDuration();
      this.tiredUntil = this.time + TIRED_WINDOW_MS;
      this.tiredHit = false;
      this.events.push({ type: "struggle_end" });
    }
  }

  private struggleStrength(): number {
    let s = STRUGGLE_BY_RARITY[this.fish.rarity] * this.mods.strength * (0.55 + 0.45 * this.hpRatio) * (1 - this.struggleReduce);
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

    // Chuyển pha vùng vẫy: yên → BÁO HIỆU → quẫy → mệt (cửa sổ vàng) → yên
    if (!stunned && this.time >= this.phaseUntil) {
      if (this.struggling) {
        this.endStruggle();
      } else if (!this.warning) {
        this.warning = true;
        this.warnUntil = this.time + this.mods.tellMs;
        this.events.push({ type: "warn" });
      } else if (this.time >= this.warnUntil) {
        this.warning = false;
        this.struggling = true;
        this.frenzy = this.hpRatio < 0.35 && this.rng.chance(0.5);
        this.phaseUntil = this.time + this.struggleDuration();
        this.events.push({ type: "struggle_start", frenzy: this.frenzy });
        if (this.rng.chance(this.mods.jump)) {
          this.jumpUntil = this.time + JUMP_WINDOW_MS;
          this.jumpFailed = false;
          this.events.push({ type: "jump" });
        }
      }
    }

    // Cú nhảy: kéo khi cá đang bay → giật mạnh dây; nhả tay suốt cú nhảy → né thành công
    if (this.jumpUntil > 0) {
      if (this.time < this.jumpUntil) {
        if (this.reeling && !this.jumpFailed) {
          this.jumpFailed = true;
          this.tension += 15;
          this.breakCombo();
          this.events.push({ type: "jump_fail" });
        }
      } else {
        if (!this.jumpFailed) {
          this.combo++;
          this.maxCombo = Math.max(this.maxCombo, this.combo);
          const amount = this.fishMaxHp * 0.03 * (1 + Math.min(10, this.combo) * 0.1);
          this.fishHp = Math.max(0, this.fishHp - amount);
          this.events.push({ type: "dodge", combo: this.combo, amount });
        }
        this.jumpUntil = 0;
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
      // Kéo đúng lúc cá mệt: lần đầu trong cửa sổ → "Hoàn hảo", tăng combo
      const tired = this.tiredUntil > this.time && !this.struggling;
      if (tired && !this.tiredHit) {
        this.tiredHit = true;
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        this.events.push({ type: "perfect", combo: this.combo });
      }
      const tiredMul = tired ? 1.6 + 0.15 * Math.min(10, this.combo) : 1;
      const dmgPerSec = this.loadout.pull * this.pullMul * tiredMul * (this.struggling && !stunned ? 0.45 : 1);
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
    if (strength > 0) this.distance += FISHING.struggleDistancePerSec * strength * this.mods.push * dt;

    this.tension = Math.max(0, Math.min(this.maxTension, this.tension));
    this.distance = Math.max(this.hpRatio > 0 ? 6 : 0, this.distance);

    // Hao mòn dây khi quá căng
    if (this.tension > FISHING.dangerTension) {
      if (!this.wasDanger) this.events.push({ type: "danger" });
      if (this.reeling) this.breakCombo();
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

  private breakCombo() {
    if (this.combo > 0) {
      this.combo = 0;
      this.events.push({ type: "combo_break" });
    }
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
