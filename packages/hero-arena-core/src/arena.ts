import { branchById, heroById, HEROES } from "./heroes.ts";
import {
  AWAKENING_LEVEL,
  chooseSpecializationBranch,
  createMatchPlayer,
  effectiveAttack,
  gainExp,
  selectUpgradeChoice,
  SPECIALIZATION_LEVEL,
  totalPassive,
  ULTIMATE_LEVEL,
} from "./progression.ts";
import { CRAFT_RECIPES, equipmentById, equipmentScore, MONSTERS, rollLoot, type EquipmentItem, type EquipmentSlot, type MonsterDef } from "./loot.ts";
import { Rng } from "./rng.ts";
import type { Gender, HeroClassConfig, PlayerMatchState, SkillDef, SkillKind, SkillSlot } from "./types.ts";
import {
  biomeAt,
  biomeMidAngle,
  createZone,
  HAZARD_EFFECTS,
  hazardForBiome,
  isOutsideZone,
  ISLAND_RADIUS,
  tickZone,
  WORLD_CENTER,
  type ZoneState,
} from "./zone.ts";

// Mô phỏng trận Battle Royale 20 người theo bước thời gian cố định (thuần túy, tất định theo seed).

export const MAX_PLAYERS = 20;
export const FIGHTER_RADIUS = 18;
export const POTION_HEAL_PCT = 0.35;
export const MAX_POTIONS = 5;
export const PASSIVE_EXP_PER_SEC = 6;
/** Hệ số sát thương giữa các anh hùng (để giao tranh kéo dài, có thời gian phản ứng). */
export const PVP_DAMAGE_MUL = 0.45;

const SKILL_COOLDOWN: Record<SkillSlot, number> = { s1: 4.5, s2: 6, s3: 10, ult: 28 };
const SKILL_MANA: Record<SkillSlot, number> = { s1: 30, s2: 15, s3: 45, ult: 90 };
const DASH_STAMINA = 35;
const ATTACK_INTERVAL = 0.75;

export interface FighterInput {
  moveX: number;
  moveY: number;
  attack: boolean;
  cast: SkillSlot | null;
  usePotion: boolean;
  /** Điểm ngắm (toạ độ thế giới); không có thì tự ngắm mục tiêu gần nhất. */
  aimX?: number;
  aimY?: number;
}

export const IDLE_INPUT: FighterInput = { moveX: 0, moveY: 0, attack: false, cast: null, usePotion: false };

export interface Fighter {
  id: string;
  isBot: boolean;
  state: PlayerMatchState;
  x: number;
  y: number;
  vx: number;
  vy: number;
  faceX: number;
  faceY: number;
  attackCd: number;
  cd: Record<SkillSlot, number>;
  shieldHp: number;
  shieldUntil: number;
  slowPct: number;
  slowUntil: number;
  dotDps: number;
  dotUntil: number;
  dotSourceId: string | null;
  dashTime: number;
  potions: number;
  potionsUsed: number;
  equipped: Partial<Record<EquipmentSlot, EquipmentItem>>;
  materials: Record<string, number>;
  gold: number;
  lastHitBy: string | null;
  /** Thứ hạng khi bị loại (1 = vô địch). */
  placement: number | null;
  bot: BotBrain | null;
  /** Thời điểm thôi bị coi là "vừa giao chiến" (bot dùng để quyết định). */
  combatUntil: number;
  /** Bị đối thủ (người) đánh gần đây – máy sẽ đánh trả kẻ đó. */
  pvpUntil: number;
}

export interface BotBrain {
  wanderX: number;
  wanderY: number;
  retarget: number;
  aimError: number;
  /** Bot "rụt rè": rút lui khi máu dưới ngưỡng này. */
  retreatAt: number;
  /** Trước thời điểm này máy chỉ săn quái (trừ khi bị đánh). */
  peaceUntil: number;
  targetId: string | null;
}

export interface Monster {
  id: string;
  def: MonsterDef;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  respawnAt: number;
  attackCd: number;
  aggroId: string | null;
  slowPct: number;
  slowUntil: number;
  dotDps: number;
  dotUntil: number;
  dotSourceId: string | null;
}

export interface Projectile {
  id: number;
  ownerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  damage: number;
  radius: number;
  pierce: boolean;
  color: number;
  hit: Set<string>;
  isSkill: boolean;
}

/** Vùng hiệu ứng kéo dài (bẫy, cột lửa). */
export interface Field {
  id: number;
  ownerId: string;
  x: number;
  y: number;
  radius: number;
  dps: number;
  slowPct: number;
  until: number;
  color: number;
}

export type ArenaEvent =
  | { type: "hit"; x: number; y: number; amount: number; crit: boolean; targetId: string; sourceId: string }
  | { type: "fx"; kind: SkillKind | "attack" | "potion" | "levelup" | "death"; x: number; y: number; radius: number; color: number; ownerId: string; toX?: number; toY?: number }
  | { type: "eliminated"; victimId: string; killerId: string | null; placement: number; cause: "fighter" | "zone" | "monster" }
  | { type: "monster_killed"; monsterId: string; killerId: string; isBoss: boolean }
  | { type: "loot"; fighterId: string; text: string }
  | { type: "levelup"; fighterId: string; level: number }
  | { type: "branch_needed"; fighterId: string }
  | { type: "offer"; fighterId: string }
  | { type: "zone_shrink"; stage: number }
  | { type: "zone_stage_done"; stage: number }
  | { type: "victory"; winnerId: string };

export interface ArenaConfig {
  seed: number;
  playerName: string;
  heroId: string;
  gender: Gender;
  /** Số bình máu mang vào trận (từ kho). */
  bonusPotions?: number;
  /** Số người (mặc định 20 = 1 người + 19 máy). */
  players?: number;
}

const BOT_NAMES = [
  "Hắc Phong", "Tiểu Long", "Bạch Hổ", "Lạc Nhạn", "Thiên Vũ", "Mộc Lan", "Kiếm Tâm", "Hàn Băng", "Liệt Hỏa", "Phong Vân",
  "Huyết Ảnh", "Dạ Xoa", "Linh Lung", "Cuồng Đao", "Thanh Y", "Ngân Hà", "Sấm Sét", "Tuyết Lang", "Ám Dạ", "Kim Ưng",
];

export function skillFor(hero: HeroClassConfig, p: PlayerMatchState, slot: SkillSlot): SkillDef | null {
  const br = branchById(hero, p.branchId);
  if (slot === "s1") return br ? br.skills[0] : hero.baseSkill;
  if (!br) return null;
  if (slot === "s2") return br.skills[1];
  if (slot === "s3") return br.skills[2];
  if (p.level < ULTIMATE_LEVEL) return null;
  return p.level >= AWAKENING_LEVEL ? br.awakening : br.ultimate;
}

export function fxColor(f: Fighter): number {
  const hero = heroById(f.state.heroId);
  if (!hero) return 0xffffff;
  return branchById(hero, f.state.branchId)?.color ?? 0xe0d0ff;
}

export class Arena {
  readonly rng: Rng;
  readonly zone: ZoneState;
  readonly fighters: Fighter[] = [];
  readonly monsters: Monster[] = [];
  readonly projectiles: Projectile[] = [];
  readonly fields: Field[] = [];
  readonly playerId = "p0";
  time = 0;
  finished = false;
  winnerId: string | null = null;
  private nextId = 1;
  private aliveCount = 0;

  constructor(cfg: ArenaConfig) {
    this.rng = new Rng(cfg.seed);
    this.zone = createZone(this.rng);
    const total = Math.min(MAX_PLAYERS, Math.max(2, cfg.players ?? MAX_PLAYERS));
    // Người chơi
    this.addFighter(this.playerId, cfg.playerName, cfg.heroId, cfg.gender, false, Math.min(3, cfg.bonusPotions ?? 0));
    // 19 đối thủ máy
    for (let i = 1; i < total; i++) {
      const hero = this.rng.pick(HEROES);
      const gender: Gender = this.rng.chance(0.5) ? "male" : "female";
      this.addFighter(`b${i}`, BOT_NAMES[i % BOT_NAMES.length] ?? `Máy ${i}`, hero.id, gender, true, 0);
    }
    this.aliveCount = this.fighters.length;
    this.spawnMonsters();
  }

  get player(): Fighter {
    return this.fighters[0] as Fighter;
  }

  getAliveCount(): number {
    return this.aliveCount;
  }

  fighterById(id: string): Fighter | undefined {
    return this.fighters.find((f) => f.id === id);
  }

  private addFighter(id: string, name: string, heroId: string, gender: Gender, isBot: boolean, bonusPotions: number): void {
    const state = createMatchPlayer(id, name, heroId, gender);
    // rải đều quanh đảo, cách tâm 55–85% bán kính
    const idx = this.fighters.length;
    const a = (idx / MAX_PLAYERS) * Math.PI * 2 + this.rng.range(-0.12, 0.12);
    const d = ISLAND_RADIUS * this.rng.range(0.55, 0.85);
    const f: Fighter = {
      id, isBot, state,
      x: WORLD_CENTER + Math.cos(a) * d,
      y: WORLD_CENTER + Math.sin(a) * d,
      vx: 0, vy: 0, faceX: 1, faceY: 0,
      attackCd: 0,
      cd: { s1: 0, s2: 0, s3: 0, ult: 0 },
      shieldHp: 0, shieldUntil: 0,
      slowPct: 0, slowUntil: 0,
      dotDps: 0, dotUntil: 0, dotSourceId: null,
      dashTime: 0,
      potions: 2 + bonusPotions,
      potionsUsed: 0,
      equipped: {},
      materials: {},
      gold: 0,
      lastHitBy: null,
      placement: null,
      combatUntil: 0,
      pvpUntil: 0,
      bot: isBot
        ? { wanderX: WORLD_CENTER, wanderY: WORLD_CENTER, retarget: 0, aimError: this.rng.range(0.05, 0.3), retreatAt: this.rng.range(0.15, 0.35), peaceUntil: this.rng.range(100, 220), targetId: null }
        : null,
    };
    this.fighters.push(f);
  }

  private spawnMonsters(): void {
    for (const def of MONSTERS) {
      const mid = biomeMidAngle(def.biome);
      const count = def.isBoss ? 1 : 9;
      for (let i = 0; i < count; i++) {
        const a = def.isBoss ? mid : mid + this.rng.range(-0.45, 0.45);
        const d = def.isBoss ? ISLAND_RADIUS * 0.5 : ISLAND_RADIUS * this.rng.range(0.25, 0.9);
        const x = WORLD_CENTER + Math.cos(a) * d;
        const y = WORLD_CENTER + Math.sin(a) * d;
        this.monsters.push({
          id: `m${this.nextId++}`,
          def, x, y, homeX: x, homeY: y,
          hp: def.hp, maxHp: def.hp, alive: true, respawnAt: 0,
          attackCd: 0, aggroId: null,
          slowPct: 0, slowUntil: 0, dotDps: 0, dotUntil: 0, dotSourceId: null,
        });
      }
    }
  }

  // ------------------------------------------------------------------ hành động ngoài vòng tick
  chooseBranch(fighterId: string, branchId: string): boolean {
    const f = this.fighterById(fighterId);
    if (!f || !f.state.alive) return false;
    return chooseSpecializationBranch(f.state, branchId, this.rng);
  }

  chooseUpgrade(fighterId: string, choiceId: string): boolean {
    const f = this.fighterById(fighterId);
    if (!f || !f.state.alive) return false;
    return selectUpgradeChoice(f.state, choiceId);
  }

  craft(fighterId: string, recipeId: string): EquipmentItem | null {
    const f = this.fighterById(fighterId);
    const r = CRAFT_RECIPES.find((x) => x.id === recipeId);
    if (!f || !r || !f.state.alive) return null;
    const have = f.materials[r.materialId] ?? 0;
    const item = equipmentById(r.outputItemId);
    if (have < r.quantity || !item) return null;
    f.materials[r.materialId] = have - r.quantity;
    this.equipIfBetter(f, item);
    return item;
  }

  /** Bật/tắt tự động chơi cho người chơi (máy điều khiển thay). */
  setAutopilot(on: boolean): void {
    const p = this.player;
    p.bot = on ? { wanderX: WORLD_CENTER, wanderY: WORLD_CENTER, retarget: 0, aimError: 0.05, retreatAt: 0.2, peaceUntil: 90, targetId: null } : null;
  }

  /** Người chơi đang phải chọn (nhánh hoặc thẻ) → client tạm dừng trận. */
  playerNeedsChoice(): boolean {
    const p = this.player.state;
    return p.alive && (p.needsBranch || p.pendingOffers.length > 0);
  }

  // ------------------------------------------------------------------ vòng tick
  tick(dt: number, playerInput: FighterInput): ArenaEvent[] {
    const ev: ArenaEvent[] = [];
    if (this.finished) return ev;
    this.time += dt;

    const z = tickZone(this.zone, dt, this.rng);
    if (z.shrinkStarted) ev.push({ type: "zone_shrink", stage: this.zone.stage + 1 });
    if (z.stageDone) ev.push({ type: "zone_stage_done", stage: this.zone.stage });

    for (const f of this.fighters) {
      if (!f.state.alive) continue;
      const input = f.bot ? this.botThink(f, dt) : playerInput;
      this.updateFighter(f, input, dt, ev);
    }
    this.updateMonsters(dt, ev);
    this.updateProjectiles(dt, ev);
    this.updateFields(dt, ev);

    // bot (và người chơi bật tự động) tự chọn nhánh/thẻ ngay
    for (const f of this.fighters) {
      if (!f.bot || !f.state.alive) continue;
      if (f.state.needsBranch) {
        const hero = heroById(f.state.heroId);
        if (hero) this.chooseBranch(f.id, this.rng.pick(hero.branches).id);
      }
      while (f.state.pendingOffers.length > 0) {
        const offer = f.state.pendingOffers[0];
        if (!offer || offer.length === 0) {
          f.state.pendingOffers.shift();
          continue;
        }
        this.chooseUpgrade(f.id, this.rng.pick(offer).id);
      }
    }

    if (this.aliveCount <= 1 && !this.finished) {
      this.finished = true;
      const w = this.fighters.find((f) => f.state.alive) ?? null;
      if (w) {
        w.placement = 1;
        this.winnerId = w.id;
        ev.push({ type: "victory", winnerId: w.id });
      }
    }
    return ev;
  }

  private speedOf(f: Fighter): number {
    const pas = totalPassive(f.state);
    const eqSpeed = (f.equipped.weapon?.bonusMoveSpeed ?? 0) + (f.equipped.armor?.bonusMoveSpeed ?? 0) + (f.equipped.accessory?.bonusMoveSpeed ?? 0);
    const hz = HAZARD_EFFECTS[f.state.activeHazard];
    const slow = this.time < f.slowUntil ? f.slowPct : 0;
    return (f.state.moveSpeed + eqSpeed) * (1 + pas.moveSpeedPct) * hz.speedMul * (1 - slow);
  }

  attackOf(f: Fighter): number {
    const eqAtk = (f.equipped.weapon?.bonusAttack ?? 0) + (f.equipped.armor?.bonusAttack ?? 0) + (f.equipped.accessory?.bonusAttack ?? 0);
    return effectiveAttack(f.state) + eqAtk;
  }

  rangeOf(f: Fighter): number {
    const hero = heroById(f.state.heroId);
    return (hero?.attackRange ?? 90) * HAZARD_EFFECTS[f.state.activeHazard].rangeMul;
  }

  private updateFighter(f: Fighter, input: FighterInput, dt: number, ev: ArenaEvent[]): void {
    const s = f.state;
    const pas = totalPassive(s);
    // hồi tài nguyên
    s.mana = Math.min(s.maxMana, s.mana + (6 + s.maxMana * 0.012) * (1 + pas.manaRegenPct) * dt);
    s.stamina = Math.min(s.maxStamina, s.stamina + 14 * dt);
    gainExpEv(this, f, PASSIVE_EXP_PER_SEC * dt, ev);
    for (const k of Object.keys(f.cd) as SkillSlot[]) f.cd[k] = Math.max(0, f.cd[k] - dt);
    f.attackCd = Math.max(0, f.attackCd - dt);
    if (this.time > f.shieldUntil) f.shieldHp = 0;

    // di chuyển
    const hz = HAZARD_EFFECTS[s.activeHazard];
    let mx = input.moveX;
    let my = input.moveY;
    const len = Math.hypot(mx, my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }
    if (f.dashTime > 0) {
      f.dashTime -= dt;
    } else {
      const sp = this.speedOf(f);
      const tx = mx * sp;
      const ty = my * sp;
      // mặt đất đóng băng: tăng tốc/giảm tốc chậm → trơn trượt
      const k = hz.slippery ? Math.min(1, dt * 2.2) : 1;
      f.vx += (tx - f.vx) * k;
      f.vy += (ty - f.vy) * k;
    }
    if (len > 0.1) {
      const fl = Math.hypot(mx, my);
      f.faceX = mx / fl;
      f.faceY = my / fl;
    }
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    this.clampToIsland(f);

    // vòng bo & môi trường
    const outside = isOutsideZone(this.zone, f.x, f.y);
    s.outsideSafeZone = outside;
    s.activeHazard = outside ? hazardForBiome(biomeAt(f.x, f.y)) : "none";
    if (outside) {
      const dmg = (this.zone.dps + HAZARD_EFFECTS[s.activeHazard].extraDps) * dt;
      this.damageFighter(f, dmg, null, ev, "zone", false, true);
      if (!s.alive) return;
    }
    // độc/cháy
    if (this.time < f.dotUntil && f.dotDps > 0) {
      const src = f.dotSourceId ? this.fighterById(f.dotSourceId) ?? null : null;
      this.damageFighter(f, f.dotDps * dt, src, ev, "fighter", false, true);
      if (!s.alive) return;
    }

    if (input.usePotion && f.potions > 0 && s.hp < s.maxHp) {
      f.potions -= 1;
      f.potionsUsed += 1;
      s.hp = Math.min(s.maxHp, s.hp + s.maxHp * POTION_HEAL_PCT);
      ev.push({ type: "fx", kind: "potion", x: f.x, y: f.y, radius: 30, color: 0xff4a6a, ownerId: f.id });
    }

    // ngắm
    let aimX = input.aimX;
    let aimY = input.aimY;
    if (aimX === undefined || aimY === undefined) {
      const t = this.nearestTarget(f, this.rangeOf(f) * 1.6);
      if (t) {
        aimX = t.x;
        aimY = t.y;
      } else {
        aimX = f.x + f.faceX * 100;
        aimY = f.y + f.faceY * 100;
      }
    }
    if (input.attack && f.attackCd <= 0) this.basicAttack(f, aimX, aimY, ev);
    if (input.cast) this.castSkill(f, input.cast, aimX, aimY, ev);
  }

  private clampToIsland(f: { x: number; y: number }): void {
    const dx = f.x - WORLD_CENTER;
    const dy = f.y - WORLD_CENTER;
    const d = Math.hypot(dx, dy);
    const max = ISLAND_RADIUS - 30;
    if (d > max) {
      f.x = WORLD_CENTER + (dx / d) * max;
      f.y = WORLD_CENTER + (dy / d) * max;
    }
  }

  /** Mục tiêu gần nhất (đối thủ hoặc quái) trong tầm. */
  nearestTarget(f: Fighter, range: number): { x: number; y: number; id: string } | null {
    let best: { x: number; y: number; id: string } | null = null;
    let bd = range;
    for (const o of this.fighters) {
      if (o === f || !o.state.alive) continue;
      const d = Math.hypot(o.x - f.x, o.y - f.y);
      if (d < bd) {
        bd = d;
        best = { x: o.x, y: o.y, id: o.id };
      }
    }
    for (const m of this.monsters) {
      if (!m.alive) continue;
      const d = Math.hypot(m.x - f.x, m.y - f.y) - m.def.size;
      if (d < bd) {
        bd = d;
        best = { x: m.x, y: m.y, id: m.id };
      }
    }
    return best;
  }

  private basicAttack(f: Fighter, ax: number, ay: number, ev: ArenaEvent[]): void {
    const hero = heroById(f.state.heroId);
    if (!hero) return;
    const pas = totalPassive(f.state);
    f.attackCd = ATTACK_INTERVAL / (1 + pas.attackSpeedPct) * (f.isBot ? 1.25 : 1);
    const dmg = this.attackOf(f) * 0.55;
    const { dx, dy } = dir(f.x, f.y, ax, ay, f);
    f.faceX = dx;
    f.faceY = dy;
    const color = fxColor(f);
    if (hero.ranged) {
      this.spawnProjectile(f, dx, dy, 620, this.rangeOf(f), dmg, 8, false, color, false);
    } else {
      this.meleeArc(f, dx, dy, this.rangeOf(f) + 10, 1.3, dmg, ev, false);
      ev.push({ type: "fx", kind: "attack", x: f.x + dx * 40, y: f.y + dy * 40, radius: this.rangeOf(f), color, ownerId: f.id });
    }
  }

  canCast(f: Fighter, slot: SkillSlot): boolean {
    const hero = heroById(f.state.heroId);
    if (!hero) return false;
    const skill = skillFor(hero, f.state, slot);
    if (!skill || f.cd[slot] > 0) return false;
    if (f.state.mana < SKILL_MANA[slot]) return false;
    if (skill.kind === "dash" && f.state.stamina < DASH_STAMINA) return false;
    return true;
  }

  skillCooldownMax(f: Fighter, slot: SkillSlot): number {
    const awakened = slot === "ult" && f.state.level >= AWAKENING_LEVEL;
    return SKILL_COOLDOWN[slot] * (1 - f.state.bonus.cooldownPct) * (awakened ? 0.7 : 1);
  }

  private castSkill(f: Fighter, slot: SkillSlot, ax: number, ay: number, ev: ArenaEvent[]): void {
    const hero = heroById(f.state.heroId);
    if (!hero || !this.canCast(f, slot)) return;
    const skill = skillFor(hero, f.state, slot);
    if (!skill) return;
    f.state.mana -= SKILL_MANA[slot];
    f.cd[slot] = this.skillCooldownMax(f, slot);
    const atk = this.attackOf(f) * (1 + f.state.bonus.skillDamagePct);
    const awakened = slot === "ult" && f.state.level >= AWAKENING_LEVEL;
    const color = fxColor(f);
    const { dx, dy, dist } = dir(f.x, f.y, ax, ay, f);
    f.faceX = dx;
    f.faceY = dy;
    switch (skill.kind) {
      case "bolt": {
        this.spawnProjectile(f, dx, dy, 760, this.rangeOf(f) * 1.35 + 60, atk * 1.7, 16, true, color, true);
        ev.push({ type: "fx", kind: "bolt", x: f.x, y: f.y, radius: 16, color, ownerId: f.id, toX: f.x + dx * 300, toY: f.y + dy * 300 });
        break;
      }
      case "cleave": {
        const r = this.rangeOf(f) + 60;
        this.meleeArc(f, dx, dy, r, 2.2, atk * 1.8, ev, true);
        ev.push({ type: "fx", kind: "cleave", x: f.x + dx * 50, y: f.y + dy * 50, radius: r, color, ownerId: f.id });
        break;
      }
      case "dash": {
        f.state.stamina -= DASH_STAMINA;
        f.dashTime = 0.22;
        f.vx = dx * 1050;
        f.vy = dy * 1050;
        ev.push({ type: "fx", kind: "dash", x: f.x, y: f.y, radius: 24, color, ownerId: f.id, toX: f.x + dx * 230, toY: f.y + dy * 230 });
        break;
      }
      case "nova": {
        this.aoe(f, f.x, f.y, 160, atk * 1.5, ev, true);
        ev.push({ type: "fx", kind: "nova", x: f.x, y: f.y, radius: 160, color, ownerId: f.id });
        break;
      }
      case "shield": {
        f.shieldHp = f.state.maxHp * 0.3;
        f.shieldUntil = this.time + 4;
        ev.push({ type: "fx", kind: "shield", x: f.x, y: f.y, radius: 34, color, ownerId: f.id });
        break;
      }
      case "heal": {
        f.state.hp = Math.min(f.state.maxHp, f.state.hp + f.state.maxHp * 0.25);
        this.aoe(f, f.x, f.y, 120, atk * 0.8, ev, true);
        ev.push({ type: "fx", kind: "heal", x: f.x, y: f.y, radius: 120, color, ownerId: f.id });
        break;
      }
      case "trap": {
        const d = Math.min(dist, this.rangeOf(f) + 120);
        const x = f.x + dx * d;
        const y = f.y + dy * d;
        this.fields.push({ id: this.nextId++, ownerId: f.id, x, y, radius: 110, dps: atk * 0.7, slowPct: 0.35, until: this.time + 3.5, color });
        ev.push({ type: "fx", kind: "trap", x, y, radius: 110, color, ownerId: f.id });
        break;
      }
      case "storm": {
        const mul = awakened ? 1.6 : 1;
        const radius = (hero.ranged ? 210 : 240) * (awakened ? 1.2 : 1);
        const d = hero.ranged ? Math.min(dist, this.rangeOf(f) + 100) : 0;
        const x = f.x + dx * d;
        const y = f.y + dy * d;
        this.aoe(f, x, y, radius, atk * 3.6 * mul, ev, true);
        this.fields.push({ id: this.nextId++, ownerId: f.id, x, y, radius, dps: atk * 0.5 * mul, slowPct: 0.25, until: this.time + 2.5, color });
        ev.push({ type: "fx", kind: "storm", x, y, radius, color, ownerId: f.id });
        break;
      }
    }
  }

  private spawnProjectile(f: Fighter, dx: number, dy: number, speed: number, range: number, damage: number, radius: number, pierce: boolean, color: number, isSkill: boolean): void {
    this.projectiles.push({
      id: this.nextId++, ownerId: f.id,
      x: f.x + dx * 24, y: f.y + dy * 24,
      vx: dx * speed, vy: dy * speed,
      life: range / speed, damage, radius, pierce, color, hit: new Set(), isSkill,
    });
  }

  private meleeArc(f: Fighter, dx: number, dy: number, range: number, arc: number, damage: number, ev: ArenaEvent[], isSkill: boolean): void {
    const half = arc / 2;
    const inArc = (x: number, y: number, extra: number) => {
      const ox = x - f.x;
      const oy = y - f.y;
      const d = Math.hypot(ox, oy);
      if (d > range + extra) return false;
      if (d < 1) return true;
      const ang = Math.acos(Math.max(-1, Math.min(1, (ox * dx + oy * dy) / d)));
      return ang <= half;
    };
    for (const o of this.fighters) {
      if (o === f || !o.state.alive) continue;
      if (inArc(o.x, o.y, FIGHTER_RADIUS)) this.hitFighter(f, o, damage, ev, true, isSkill);
    }
    for (const m of this.monsters) {
      if (m.alive && inArc(m.x, m.y, m.def.size)) this.hitMonster(f, m, damage, ev);
    }
  }

  private aoe(f: Fighter, x: number, y: number, radius: number, damage: number, ev: ArenaEvent[], isSkill: boolean): void {
    for (const o of this.fighters) {
      if (o === f || !o.state.alive) continue;
      if (Math.hypot(o.x - x, o.y - y) <= radius + FIGHTER_RADIUS) this.hitFighter(f, o, damage, ev, false, isSkill);
    }
    for (const m of this.monsters) {
      if (m.alive && Math.hypot(m.x - x, m.y - y) <= radius + m.def.size) this.hitMonster(f, m, damage, ev);
    }
  }

  private rollCrit(f: Fighter, damage: number): { dmg: number; crit: boolean } {
    const pas = totalPassive(f.state);
    if (pas.critChance > 0 && this.rng.chance(pas.critChance)) return { dmg: damage * 1.75, crit: true };
    return { dmg: damage, crit: false };
  }

  private applyOnHit(src: Fighter, target: { slowPct: number; slowUntil: number; dotDps: number; dotUntil: number; dotSourceId: string | null }): void {
    const pas = totalPassive(src.state);
    if (pas.slowPct > 0) {
      target.slowPct = Math.max(this.time < target.slowUntil ? target.slowPct : 0, pas.slowPct);
      target.slowUntil = this.time + 1.5;
    }
    if (pas.dotPct > 0) {
      target.dotDps = this.attackOf(src) * pas.dotPct * ("state" in target ? PVP_DAMAGE_MUL : 1);
      target.dotUntil = this.time + 3;
      target.dotSourceId = src.id;
    }
  }

  private hitFighter(src: Fighter, target: Fighter, base: number, ev: ArenaEvent[], melee: boolean, _isSkill: boolean): void {
    const { dmg, crit } = this.rollCrit(src, base * PVP_DAMAGE_MUL);
    const dealt = this.damageFighter(target, dmg, src, ev, "fighter", crit, false);
    this.applyOnHit(src, target);
    const pas = totalPassive(src.state);
    if (pas.lifesteal > 0 && src.state.alive) src.state.hp = Math.min(src.state.maxHp, src.state.hp + dealt * pas.lifesteal);
    // phản sát thương
    const tp = totalPassive(target.state);
    if (melee && tp.thorns > 0 && src.state.alive) this.damageFighter(src, dealt * tp.thorns, target, ev, "fighter", false, false);
    src.combatUntil = this.time + 3;
  }

  /** Trừ máu đấu thủ (qua khiên, giảm sát thương). Trả về lượng máu thực mất. */
  private damageFighter(target: Fighter, raw: number, src: Fighter | null, ev: ArenaEvent[], cause: "fighter" | "zone" | "monster", crit: boolean, quiet: boolean): number {
    const s = target.state;
    if (!s.alive || raw <= 0) return 0;
    let dmg = cause === "zone" ? raw : raw * (1 - totalPassive(s).damageReduction);
    if (target.shieldHp > 0 && cause !== "zone") {
      const absorbed = Math.min(target.shieldHp, dmg);
      target.shieldHp -= absorbed;
      dmg -= absorbed;
    }
    s.hp -= dmg;
    target.combatUntil = this.time + 3;
    if (src) {
      target.lastHitBy = src.id;
      target.pvpUntil = this.time + 4;
    }
    if (!quiet) ev.push({ type: "hit", x: target.x, y: target.y, amount: Math.round(dmg), crit, targetId: target.id, sourceId: src?.id ?? "" });
    if (s.hp <= 0) this.eliminate(target, src, cause, ev);
    return dmg;
  }

  private eliminate(victim: Fighter, src: Fighter | null, cause: "fighter" | "zone" | "monster", ev: ArenaEvent[]): void {
    const s = victim.state;
    s.hp = 0;
    s.alive = false;
    victim.placement = this.aliveCount;
    this.aliveCount -= 1;
    // người hạ gục: trực tiếp, hoặc người đánh cuối nếu chết vì bo/độc
    const killer = src ?? (victim.lastHitBy ? this.fighterById(victim.lastHitBy) ?? null : null);
    const killerAlive = killer && killer.state.alive && killer !== victim ? killer : null;
    if (killerAlive) {
      killerAlive.state.kills += 1;
      gainExpEv(this, killerAlive, 160 + 40 * s.level, ev);
      killerAlive.gold += 25;
      // nhặt một nửa bình máu của nạn nhân
      killerAlive.potions = Math.min(MAX_POTIONS, killerAlive.potions + Math.ceil(victim.potions / 2));
    }
    ev.push({ type: "fx", kind: "death", x: victim.x, y: victim.y, radius: 40, color: 0xffffff, ownerId: victim.id });
    ev.push({ type: "eliminated", victimId: victim.id, killerId: killerAlive?.id ?? null, placement: victim.placement, cause: killerAlive ? "fighter" : cause });
  }

  private hitMonster(src: Fighter, m: Monster, base: number, ev: ArenaEvent[]): void {
    const { dmg, crit } = this.rollCrit(src, base);
    m.hp -= dmg;
    m.aggroId = src.id;
    this.applyOnHit(src, m);
    const pas = totalPassive(src.state);
    if (pas.lifesteal > 0) src.state.hp = Math.min(src.state.maxHp, src.state.hp + dmg * pas.lifesteal);
    ev.push({ type: "hit", x: m.x, y: m.y, amount: Math.round(dmg), crit, targetId: m.id, sourceId: src.id });
    if (m.hp <= 0) this.killMonster(m, src, ev);
  }

  private killMonster(m: Monster, killer: Fighter, ev: ArenaEvent[]): void {
    if (!m.alive) return;
    m.alive = false;
    m.hp = 0;
    m.respawnAt = this.time + (m.def.isBoss ? 120 : 35);
    ev.push({ type: "monster_killed", monsterId: m.id, killerId: killer.id, isBoss: m.def.isBoss });
    ev.push({ type: "fx", kind: "death", x: m.x, y: m.y, radius: m.def.size, color: m.def.color, ownerId: killer.id });
    if (!killer.state.alive) return;
    const loot = rollLoot(m.def.loot, this.rng);
    killer.gold += loot.gold;
    gainExpEv(this, killer, loot.exp, ev);
    for (const mat of loot.materials) killer.materials[mat.materialId] = (killer.materials[mat.materialId] ?? 0) + mat.quantity;
    if (loot.potion && killer.potions < MAX_POTIONS) {
      killer.potions += 1;
      ev.push({ type: "loot", fighterId: killer.id, text: "+1 Bình máu" });
    }
    for (const item of loot.equipments) {
      if (this.equipIfBetter(killer, item)) ev.push({ type: "loot", fighterId: killer.id, text: `Trang bị: ${item.nameVi}` });
    }
  }

  /** Mặc trang bị nếu tốt hơn món đang mặc ở cùng ô. */
  equipIfBetter(f: Fighter, item: EquipmentItem): boolean {
    const cur = f.equipped[item.slot];
    if (equipmentScore(item) <= equipmentScore(cur)) return false;
    const s = f.state;
    if (cur) s.maxHp = Math.max(100, s.maxHp - cur.bonusHp);
    f.equipped[item.slot] = item;
    s.maxHp += item.bonusHp;
    s.hp = Math.min(s.maxHp, s.hp + item.bonusHp);
    return true;
  }

  private updateMonsters(dt: number, ev: ArenaEvent[]): void {
    for (const m of this.monsters) {
      if (!m.alive) {
        // hồi sinh nếu chỗ cũ vẫn trong bo
        if (this.time >= m.respawnAt && !isOutsideZone(this.zone, m.homeX, m.homeY)) {
          m.alive = true;
          m.hp = m.maxHp;
          m.x = m.homeX;
          m.y = m.homeY;
          m.aggroId = null;
        }
        continue;
      }
      if (this.time < m.dotUntil && m.dotDps > 0) {
        m.hp -= m.dotDps * dt;
        if (m.hp <= 0) {
          const src = m.dotSourceId ? this.fighterById(m.dotSourceId) : undefined;
          if (src) this.killMonster(m, src, ev);
          else m.alive = false;
          continue;
        }
      }
      m.attackCd = Math.max(0, m.attackCd - dt);
      // quái ngoài bo chịu sát thương bo → không ở lại vô hạn
      if (isOutsideZone(this.zone, m.x, m.y)) {
        m.hp -= this.zone.dps * 2 * dt;
        if (m.hp <= 0) {
          m.alive = false;
          m.respawnAt = this.time + 9999;
          continue;
        }
      }
      let target = m.aggroId ? this.fighterById(m.aggroId) : undefined;
      if (target && (!target.state.alive || Math.hypot(target.x - m.homeX, target.y - m.homeY) > 520)) {
        target = undefined;
        m.aggroId = null;
      }
      if (!target) {
        // gây hấn với ai lại quá gần
        for (const f of this.fighters) {
          if (f.state.alive && Math.hypot(f.x - m.x, f.y - m.y) < (m.def.isBoss ? 150 : 110)) {
            target = f;
            m.aggroId = f.id;
            break;
          }
        }
      }
      const sp = m.def.speed * (this.time < m.slowUntil ? 1 - m.slowPct : 1);
      const gx = target ? target.x : m.homeX;
      const gy = target ? target.y : m.homeY;
      const d = Math.hypot(gx - m.x, gy - m.y);
      const stop = target ? m.def.range * 0.8 : 4;
      if (d > stop) {
        m.x += ((gx - m.x) / d) * sp * dt;
        m.y += ((gy - m.y) / d) * sp * dt;
      }
      if (target && d <= m.def.range + FIGHTER_RADIUS && m.attackCd <= 0) {
        m.attackCd = m.def.isBoss ? 1.4 : 1.2;
        const dealt = this.damageFighter(target, m.def.attack * (1 + this.zone.stage * 0.15), null, ev, "monster", false, false);
        const tp = totalPassive(target.state);
        if (tp.thorns > 0 && target.state.alive) {
          m.hp -= dealt * tp.thorns;
          if (m.hp <= 0) this.killMonster(m, target, ev);
        }
      }
    }
  }

  private updateProjectiles(dt: number, ev: ArenaEvent[]): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i] as Projectile;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      const owner = this.fighterById(p.ownerId);
      let dead = p.life <= 0 || !owner;
      if (!dead && owner) {
        for (const o of this.fighters) {
          if (o === owner || !o.state.alive || p.hit.has(o.id)) continue;
          if (Math.hypot(o.x - p.x, o.y - p.y) <= p.radius + FIGHTER_RADIUS) {
            p.hit.add(o.id);
            this.hitFighter(owner, o, p.damage, ev, false, p.isSkill);
            if (!p.pierce) {
              dead = true;
              break;
            }
          }
        }
      }
      if (!dead && owner) {
        for (const m of this.monsters) {
          if (!m.alive || p.hit.has(m.id)) continue;
          if (Math.hypot(m.x - p.x, m.y - p.y) <= p.radius + m.def.size) {
            p.hit.add(m.id);
            this.hitMonster(owner, m, p.damage, ev);
            if (!p.pierce) {
              dead = true;
              break;
            }
          }
        }
      }
      if (dead) this.projectiles.splice(i, 1);
    }
  }

  private updateFields(dt: number, ev: ArenaEvent[]): void {
    for (let i = this.fields.length - 1; i >= 0; i--) {
      const fl = this.fields[i] as Field;
      if (this.time >= fl.until) {
        this.fields.splice(i, 1);
        continue;
      }
      const owner = this.fighterById(fl.ownerId);
      if (!owner) continue;
      for (const o of this.fighters) {
        if (o === owner || !o.state.alive) continue;
        if (Math.hypot(o.x - fl.x, o.y - fl.y) <= fl.radius) {
          this.damageFighter(o, fl.dps * PVP_DAMAGE_MUL * dt, owner, ev, "fighter", false, true);
          o.slowPct = Math.max(this.time < o.slowUntil ? o.slowPct : 0, fl.slowPct);
          o.slowUntil = this.time + 0.3;
        }
      }
      for (const m of this.monsters) {
        if (!m.alive) continue;
        if (Math.hypot(m.x - fl.x, m.y - fl.y) <= fl.radius + m.def.size) {
          m.hp -= fl.dps * dt;
          m.aggroId = m.aggroId ?? owner.id;
          if (m.hp <= 0) this.killMonster(m, owner, ev);
        }
      }
    }
  }

  // ------------------------------------------------------------------ AI máy
  /** Bộ não máy: chạy bo → rút lui khi yếu → đánh người gần → săn quái → lang thang. */
  botThink(f: Fighter, dt: number): FighterInput {
    const b = f.bot;
    if (!b) return IDLE_INPUT;
    const s = f.state;
    const input: FighterInput = { moveX: 0, moveY: 0, attack: false, cast: null, usePotion: false };
    const hpRatio = s.hp / s.maxHp;
    if (hpRatio < 0.45 && f.potions > 0) input.usePotion = true;

    const z = this.zone;
    const distC = Math.hypot(f.x - z.centerX, f.y - z.centerY);
    const safeR = z.phase === "wait" ? Math.min(z.radius, z.targetRadius + Math.hypot(z.targetX - z.centerX, z.targetY - z.centerY)) : z.radius;
    // đích an toàn: tâm bo kế tiếp
    const goalX = z.phase === "wait" ? z.targetX : z.centerX;
    const goalY = z.phase === "wait" ? z.targetY : z.centerY;
    const distGoal = Math.hypot(f.x - goalX, f.y - goalY);
    const needZone = distC > z.radius * 0.92 || (z.phase === "wait" && z.timer < 15 && distGoal > z.targetRadius * 0.8) || distC > safeR;

    b.retarget -= dt;
    // chọn mục tiêu
    if (b.retarget <= 0) {
      b.retarget = 0.5;
      b.targetId = null;
      let best = Infinity;
      // đầu trận máy ưu tiên săn quái; về sau (hoặc bị tấn công) mới săn người
      const aggressive = this.time > b.peaceUntil;
      const huntRange = aggressive ? 480 : 0;
      // bị đánh → đánh trả đúng kẻ đã đánh mình
      const attacker = this.time < f.pvpUntil && f.lastHitBy ? this.fighterById(f.lastHitBy) : undefined;
      if (attacker?.state.alive && Math.hypot(attacker.x - f.x, attacker.y - f.y) < 600) {
        b.targetId = attacker.id;
        best = -1;
      }
      for (const o of this.fighters) {
        if (o === f || !o.state.alive) continue;
        const d = Math.hypot(o.x - f.x, o.y - f.y);
        // ưu tiên đối thủ yếu máu
        const score = d * (0.6 + o.state.hp / o.state.maxHp);
        if (d < huntRange && score < best) {
          best = score;
          b.targetId = o.id;
        }
      }
      if (!b.targetId) {
        for (const m of this.monsters) {
          if (!m.alive) continue;
          if (m.def.isBoss && s.level < 7) continue;
          const d = Math.hypot(m.x - f.x, m.y - f.y);
          if (d < 700 && d < best) {
            best = d;
            b.targetId = m.id;
          }
        }
      }
      if (Math.hypot(b.wanderX - f.x, b.wanderY - f.y) < 60 || this.rng.chance(0.05)) {
        const a = this.rng.range(0, Math.PI * 2);
        const r = Math.sqrt(this.rng.next()) * Math.max(80, z.radius * 0.8);
        b.wanderX = z.centerX + Math.cos(a) * r;
        b.wanderY = z.centerY + Math.sin(a) * r;
      }
    }

    const targetF = b.targetId ? this.fighterById(b.targetId) : undefined;
    const targetM = !targetF && b.targetId ? this.monsters.find((m) => m.id === b.targetId && m.alive) : undefined;
    const tx = targetF?.state.alive ? targetF.x : targetM?.x;
    const ty = targetF?.state.alive ? targetF.y : targetM?.y;

    let mvx = 0;
    let mvy = 0;
    if (needZone) {
      mvx = goalX - f.x;
      mvy = goalY - f.y;
    } else if (hpRatio < b.retreatAt && targetF?.state.alive) {
      mvx = f.x - targetF.x;
      mvy = f.y - targetF.y;
    } else if (tx !== undefined && ty !== undefined) {
      const d = Math.hypot(tx - f.x, ty - f.y);
      const want = this.rangeOf(f) * 0.8;
      if (d > want) {
        mvx = tx - f.x;
        mvy = ty - f.y;
      } else if (d < want * 0.5 && heroById(s.heroId)?.ranged) {
        mvx = f.x - tx;
        mvy = f.y - ty;
      }
    } else {
      mvx = b.wanderX - f.x;
      mvy = b.wanderY - f.y;
    }
    const ml = Math.hypot(mvx, mvy);
    if (ml > 1) {
      input.moveX = mvx / ml;
      input.moveY = mvy / ml;
    }

    if (tx !== undefined && ty !== undefined) {
      const d = Math.hypot(tx - f.x, ty - f.y);
      // ngắm có sai số
      const err = b.aimError * d * 0.3;
      input.aimX = tx + this.rng.range(-err, err);
      input.aimY = ty + this.rng.range(-err, err);
      if (d < this.rangeOf(f) * 1.1) input.attack = true;
      if (this.rng.chance(dt * 1.2)) {
        const slots: SkillSlot[] = ["ult", "s1", "s3", "s2"];
        for (const slot of slots) {
          if (!this.canCast(f, slot)) continue;
          if (slot === "s2" && !needZone && hpRatio > b.retreatAt) continue;
          if (slot === "ult" && d > 260) continue;
          input.cast = slot;
          break;
        }
      }
    } else if (needZone && this.canCast(f, "s2") && this.rng.chance(dt * 0.5)) {
      input.cast = "s2";
      input.aimX = goalX;
      input.aimY = goalY;
    }
    return input;
  }

  /** Tóm tắt kết quả cho người chơi. */
  playerSummary(): { placement: number; kills: number; level: number; won: boolean; potionsUsed: number; gold: number; branchId: string | null } {
    const p = this.player;
    return {
      placement: p.placement ?? this.aliveCount,
      kills: p.state.kills,
      level: p.state.level,
      won: this.winnerId === p.id,
      potionsUsed: p.potionsUsed,
      gold: p.gold,
      branchId: p.state.branchId,
    };
  }
}

function dir(x: number, y: number, tx: number, ty: number, f: Fighter): { dx: number; dy: number; dist: number } {
  const dx = tx - x;
  const dy = ty - y;
  const d = Math.hypot(dx, dy);
  if (d < 1) return { dx: f.faceX, dy: f.faceY, dist: 0 };
  return { dx: dx / d, dy: dy / d, dist: d };
}

function gainExpEv(arena: Arena, f: Fighter, amount: number, ev: ArenaEvent[]): void {
  const before = f.state.level;
  const r = gainExp(f.state, amount, arena.rng);
  if (r.levelsGained > 0) {
    ev.push({ type: "levelup", fighterId: f.id, level: f.state.level });
    ev.push({ type: "fx", kind: "levelup", x: f.x, y: f.y, radius: 40, color: 0xffe14a, ownerId: f.id });
  }
  if (r.needsBranchSelection && before < SPECIALIZATION_LEVEL) ev.push({ type: "branch_needed", fighterId: f.id });
  if (r.offersAdded > 0) ev.push({ type: "offer", fighterId: f.id });
}
