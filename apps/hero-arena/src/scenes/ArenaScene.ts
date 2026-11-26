import Phaser from "phaser";
import {
  Arena,
  EVOLUTION_STYLE_VI,
  passiveText,
  ALTAR_RADIUS,
  BIOME_NAME_VI,
  BIOME_SECTORS,
  biomeAt,
  biomeMidAngle,
  completeTutorialStep,
  fxColor,
  HAZARD_EFFECTS,
  heroById,
  ISLAND_RADIUS,
  ITEM_RARITY_COLOR,
  MAX_LEVEL,
  EXP_TO_NEXT,
  potionsAvailable,
  Rng,
  RESPAWN_WINDOW_SEC,
  skillFor,
  ULTIMATE_LEVEL,
  WORLD_CENTER,
  WORLD_SIZE,
  type ArenaEvent,
  type BiomeType,
  type FighterInput,
  type Gender,
  type SkillSlot,
  type UpgradeChoice,
} from "@hero-arena/core";
import { dotTexture, makeMonsterTextures, monsterTexture, vignetteTexture } from "../art.ts";
import { decoTexture, type DecoKind } from "../decoArt.ts";
import { TERRAIN_SCALE, terrainTexture } from "../terrain.ts";
import { addHeroImage, breathe, evolutionScale, evolutionTier, hasRealArt, heroArtKey, HERO_FIGURE_H, setHeroImage, skillIcon } from "../heroArt.ts";
import { getSave, newMatchSeed, persist } from "../state.ts";
import { button, H, hex, panel, pixelBox, pixelCircle, PX, text, toast, W } from "../ui.ts";

const STEP = 1 / 30;

const BIOME_COLOR: Record<BiomeType, number> = {
  forest: 0x22392b,
  ruined_temple: 0x34402f,
  desert: 0xa8763a,
  ruined_village: 0x86663c,
  mountain: 0xc6d0dc,
  glacier: 0xa6c4e2,
};

const BIOME_DECO: Record<BiomeType, DecoKind[]> = {
  forest: ["tree", "darktree", "darktree", "tree", "bush", "rock", "grave", "fire", "deadtree"],
  ruined_temple: ["pillar", "brokenpillar", "ruin", "arch", "statue", "grave", "tree", "bush"],
  desert: ["cactus", "cactus", "rock", "boulder", "obelisk", "deadtree", "bones"],
  ruined_village: ["house", "ruinhouse", "well", "barrel", "rock", "deadtree", "fire", "obelisk"],
  mountain: ["peak", "snowpine", "snowpine", "boulder", "crystal", "rock"],
  glacier: ["crystal", "icechunk", "snowpine", "crystal", "peak", "rock"],
};

/** Chi tiết nhỏ rải trên mặt đất (vẽ hàng loạt bằng Blitter). */
const BIOME_GROUND: Record<BiomeType, DecoKind[]> = {
  forest: ["tuft", "tuft", "flowers", "mushroom", "pebbles"],
  ruined_temple: ["tuft", "pebbles", "flowers", "bones"],
  desert: ["pebbles", "bones", "pebbles"],
  ruined_village: ["pebbles", "tuft", "bones"],
  mountain: ["snowdrift", "pebbles"],
  glacier: ["snowdrift", "pebbles"],
};

const HAZARD_TINT: Record<string, [number, number]> = {
  toxic_mist: [0x3aff5a, 0.16],
  sandstorm: [0xd89a4a, 0.22],
  frozen_ground: [0x9ad8ff, 0.18],
};

interface FighterView {
  img: Phaser.GameObjects.Image;
  name: Phaser.GameObjects.Text;
  key: string;
  /** Hiệu ứng động: lao người khi đánh, loé khi trúng đòn, pha thở riêng. */
  lunge: number;
  flash: number;
  phase: number;
  scale: number;
  aura: Phaser.GameObjects.Particles.ParticleEmitter | null;
  auraKey: string;
}

interface SkillButton {
  slot: SkillSlot | "attack" | "potion";
  icon: Phaser.GameObjects.Image;
  cdG: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  r: number;
  g: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  key: Phaser.GameObjects.Text;
}

export class ArenaScene extends Phaser.Scene {
  arena!: Arena;
  /** Hệ số tốc độ mô phỏng (dùng cho kiểm thử tự động). */
  timeScale = 1;
  private heroId = "mage";
  private gender: Gender = "male";
  private matchId = "";
  private storePotions = 0;
  private acc = 0;
  private ending = false;
  private fighterViews = new Map<string, FighterView>();
  private monsterViews = new Map<string, Phaser.GameObjects.Image>();
  private bars!: Phaser.GameObjects.Graphics;
  private ringG!: Phaser.GameObjects.Graphics;
  private portraitKey = "init";
  private fxG!: Phaser.GameObjects.Graphics;
  private zoneG!: Phaser.GameObjects.Graphics;
  private hudG!: Phaser.GameObjects.Graphics;
  private miniG!: Phaser.GameObjects.Graphics;
  private miniTimer = 0;
  private aliveText!: Phaser.GameObjects.Text;
  private zoneText!: Phaser.GameObjects.Text;
  private hazardText!: Phaser.GameObjects.Text;
  private statText!: Phaser.GameObjects.Text;
  private infoText!: Phaser.GameObjects.Text;
  private feed: Phaser.GameObjects.Text[] = [];
  private hazardTint!: Phaser.GameObjects.Rectangle;
  private vignette!: Phaser.GameObjects.Image;
  private portrait!: Phaser.GameObjects.Image;
  private skillButtons: SkillButton[] = [];
  private modal: Phaser.GameObjects.Container | null = null;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private joy = { id: -1, bx: 0, by: 0, x: 0, y: 0 };
  private joyG!: Phaser.GameObjects.Graphics;
  private attackHeld = new Set<number>();
  private pendingCast: SkillSlot | null = null;
  private pendingPotion = false;
  private dmgPool: Phaser.GameObjects.Text[] = [];

  constructor() {
    super("Arena");
  }

  init(data: { heroId?: string; gender?: Gender }): void {
    this.heroId = data.heroId ?? "mage";
    this.gender = data.gender ?? "male";
  }

  create(): void {
    const save = getSave();
    const seed = newMatchSeed();
    this.matchId = `${seed.toString(36)}_${Date.now().toString(36)}`;
    this.storePotions = potionsAvailable(save);
    this.arena = new Arena({ seed, playerName: save.name, heroId: this.heroId, gender: this.gender, bonusPotions: this.storePotions });
    this.acc = 0;
    this.ending = false;
    this.timeScale = 1;
    this.fighterViews.clear();
    this.monsterViews.clear();
    this.skillButtons = [];
    this.feed = [];
    this.dmgPool = [];
    this.modal = null;
    this.attackHeld.clear();
    this.pendingCast = null;
    if (completeTutorialStep(save, "select_hero_and_gender")) persist();

    this.cameras.main.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);
    this.cameras.main.setBackgroundColor("#0a1622");
    this.cameras.main.setZoom(1);
    dotTexture(this);
    makeMonsterTextures(this);
    this.drawWorld(seed);

    for (const m of this.arena.monsters) {
      const img = this.add.image(m.x, m.y, monsterTexture(this, m.def)).setScale(1.5);
      this.monsterViews.set(m.id, img);
    }
    for (const f of this.arena.fighters) {
      const img = addHeroImage(this, f.x, f.y, f.state.heroId, null, null, evolutionScale(1));
      const key = `${heroArtKey(f.state.heroId, null, null)}:1`;
      const phase = this.fighterViews.size * 0.7;
      const name = text(this, f.x, f.y, f.isBot ? f.state.name : `★ ${f.state.name}`, 15, f.isBot ? "#f0e0d0" : "#ffe14a").setOrigin(0.5, 1);
      this.fighterViews.set(f.id, { img, name, key, lunge: 0, flash: 0, phase, scale: evolutionScale(1), aura: null, auraKey: "" });
    }
    this.ringG = this.add.graphics().setDepth(1);
    this.zoneG = this.add.graphics().setDepth(5000);
    this.fxG = this.add.graphics().setDepth(5001).setBlendMode(Phaser.BlendModes.ADD);
    this.bars = this.add.graphics().setDepth(5002);
    this.cameras.main.startFollow(this.fighterViews.get(this.arena.playerId)!.img, true, 0.15, 0.15);

    this.buildHud();
    this.setupInput();
    this.events.once("shutdown", () => this.input.keyboard?.removeAllKeys(true));
    if (import.meta.env.DEV) (window as unknown as { __arenaScene: ArenaScene }).__arenaScene = this;
  }

  // ------------------------------------------------------------------ bản đồ
  private drawWorld(seed: number): void {
    const C = WORLD_CENTER;
    // mặt đất vẽ từng điểm ảnh (độ phân giải 1/3, nét pixel)
    this.add.image(0, 0, terrainTexture(this, seed)).setOrigin(0).setScale(TERRAIN_SCALE).setDepth(-10);
    const rng = new Rng(seed ^ 0x5eed);
    // nhãn vùng
    for (const s of BIOME_SECTORS) {
      const a = biomeMidAngle(s.biome);
      text(this, C + Math.cos(a) * ISLAND_RADIUS * 0.96, C + Math.sin(a) * ISLAND_RADIUS * 0.96, BIOME_NAME_VI[s.biome], 30, "#ffffffaa").setOrigin(0.5).setDepth(-5);
    }
    // trang trí lớn (sắp xếp chiều sâu theo y)
    const blitters = new Map<DecoKind, Phaser.GameObjects.Blitter>();
    for (const s of BIOME_SECTORS) {
      const kinds = BIOME_DECO[s.biome];
      const mid = biomeMidAngle(s.biome);
      for (let i = 0; i < 110; i++) {
        const a = Phaser.Math.DegToRad(rng.range(s.from + 2, s.to - 2));
        const d = rng.range(ALTAR_RADIUS + 90, ISLAND_RADIUS - 70);
        const x = C + Math.cos(a) * d;
        const y = C + Math.sin(a) * d;
        if (Math.abs(Math.sin(a - mid)) * d < 80) continue; // chừa đường đá
        const kind = rng.pick(kinds);
        this.add.image(x, y, decoTexture(this, kind)).setOrigin(0.5, 0.9).setDepth(y).setFlipX(rng.chance(0.5));
      }
      // chi tiết nhỏ trên mặt đất
      const ground = BIOME_GROUND[s.biome];
      for (let i = 0; i < 320; i++) {
        const a = Phaser.Math.DegToRad(rng.range(s.from, s.to));
        const d = rng.range(ALTAR_RADIUS + 40, ISLAND_RADIUS - 30);
        const kind = rng.pick(ground);
        let bl = blitters.get(kind);
        if (!bl) {
          bl = this.add.blitter(0, 0, decoTexture(this, kind)).setDepth(-5);
          blitters.set(kind, bl);
        }
        const fr = this.textures.getFrame(decoTexture(this, kind));
        bl.create(C + Math.cos(a) * d - fr.width / 2, C + Math.sin(a) * d - fr.height * 0.9);
      }
    }
  }

  // ------------------------------------------------------------------ HUD
  private buildHud(): void {
    const fixed = <T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth>(o: T, d = 9000): T => {
      o.setScrollFactor(0);
      o.setDepth(d);
      return o;
    };
    this.hazardTint = fixed(this.add.rectangle(0, 0, W / 0.9 + 200, H / 0.9 + 200, 0x000000, 0).setOrigin(0.5), 8000);
    this.vignette = fixed(this.add.image(W / 2, H / 2, vignetteTexture(this, W, H)).setAlpha(0), 8001);
    this.hazardTint.setPosition(W / 2, H / 2);
    // camera zoom làm lệch toạ độ HUD → dùng camera riêng cho HUD
    const hudCam = this.cameras.add(0, 0, W, H);
    hudCam.setName("hud");
    this.hudG = fixed(this.add.graphics());
    this.miniG = fixed(this.add.graphics());
    this.joyG = fixed(this.add.graphics(), 9100);
    this.aliveText = fixed(text(this, W - 24, 18, "", 30, "#ffe08a").setOrigin(1, 0));
    this.zoneText = fixed(text(this, W - 24, 58, "", 22).setOrigin(1, 0));
    this.hazardText = fixed(text(this, W - 24, 92, "", 22, "#ff7a6a").setOrigin(1, 0));
    this.statText = fixed(text(this, 132, 610, "", 17, "#f3ead8", 500));
    this.infoText = fixed(text(this, 250, 20, "", 18, "#d8d0c0", 500));
    this.portrait = fixed(addHeroImage(this, 68, 700, this.heroId, null, null, 0.62));
    for (let i = 0; i < 5; i++) this.feed.push(fixed(text(this, W - 24, 130 + i * 24, "", 17, "#f3ead8", 500).setOrigin(1, 0)));

    const mk = (slot: SkillButton["slot"], x: number, y: number, r: number, key: string) => {
      const g = fixed(this.add.graphics());
      const icon = fixed(this.add.image(x, y, skillIcon(this, "attack", 0xd06a3a)).setDisplaySize(r * 1.42, r * 1.42).setVisible(slot === "attack"));
      const cdG = fixed(this.add.graphics());
      const label = fixed(text(this, x, y, "", r > 50 ? 18 : 15, "#ffffff").setOrigin(0.5));
      const k = fixed(text(this, x + r * 0.62, y - r * 0.82, key, 13, "#ffe08a").setOrigin(0.5));
      const zone = fixed(this.add.zone(x, y, r * 2, r * 2).setInteractive());
      zone.on("pointerdown", (p: Phaser.Input.Pointer) => {
        if (slot === "attack") this.attackHeld.add(p.id);
        else if (slot === "potion") this.pendingPotion = true;
        else this.pendingCast = slot;
      });
      this.skillButtons.push({ slot, icon, cdG, x, y, r, g, label, key: k });
    };
    mk("attack", 1176, 618, 62, "Space");
    mk("s1", 1052, 650, 40, "Q");
    mk("s2", 1068, 534, 40, "E");
    mk("s3", 1176, 486, 40, "R");
    mk("ult", 948, 598, 46, "F");
    mk("potion", 870, 668, 32, "H");
    this.cameras.main.ignore(this.children.list.filter((o) => (o as unknown as { scrollFactorX: number }).scrollFactorX === 0));
    hudCam.ignore(this.children.list.filter((o) => (o as unknown as { scrollFactorX: number }).scrollFactorX !== 0));
  }

  private note(msg: string, color?: string): void {
    this.cameras.main.ignore(toast(this, msg, color));
  }

  /** Đối tượng thế giới tạo sau (chữ sát thương...) không được hiện trên camera HUD. */
  private worldOnly<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.cameras.getCamera("hud")?.ignore(o);
    return o;
  }

  private hudOnly<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.cameras.main.ignore(o);
    return o;
  }

  private setupInput(): void {
    const kb = this.input.keyboard;
    if (kb) {
      this.keys = kb.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,J,Q,E,R,F,H,ONE,TWO,THREE,FOUR") as Record<string, Phaser.Input.Keyboard.Key>;
      kb.on("keydown-Q", () => (this.pendingCast = "s1"));
      kb.on("keydown-ONE", () => (this.pendingCast = "s1"));
      kb.on("keydown-E", () => (this.pendingCast = "s2"));
      kb.on("keydown-TWO", () => (this.pendingCast = "s2"));
      kb.on("keydown-R", () => (this.pendingCast = "s3"));
      kb.on("keydown-THREE", () => (this.pendingCast = "s3"));
      kb.on("keydown-F", () => (this.pendingCast = "ult"));
      kb.on("keydown-FOUR", () => (this.pendingCast = "ult"));
      kb.on("keydown-H", () => (this.pendingPotion = true));
    }
    this.input.on("pointerdown", (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length > 0 || this.modal) return;
      if (p.x < W * 0.55 && this.joy.id === -1) this.joy = { id: p.id, bx: p.x, by: p.y, x: p.x, y: p.y };
    });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (p.id === this.joy.id) {
        this.joy.x = p.x;
        this.joy.y = p.y;
      }
    });
    const up = (p: Phaser.Input.Pointer) => {
      if (p.id === this.joy.id) this.joy.id = -1;
      this.attackHeld.delete(p.id);
    };
    this.input.on("pointerup", up);
    this.input.on("pointerupoutside", up);
  }

  private readInput(): FighterInput {
    const k = this.keys;
    let mx = 0;
    let my = 0;
    if (k) {
      if (k.A?.isDown || k.LEFT?.isDown) mx -= 1;
      if (k.D?.isDown || k.RIGHT?.isDown) mx += 1;
      if (k.W?.isDown || k.UP?.isDown) my -= 1;
      if (k.S?.isDown || k.DOWN?.isDown) my += 1;
    }
    if (this.joy.id !== -1) {
      const dx = this.joy.x - this.joy.bx;
      const dy = this.joy.y - this.joy.by;
      const d = Math.hypot(dx, dy);
      if (d > 8) {
        const k2 = Math.min(1, d / 60);
        mx = (dx / d) * k2;
        my = (dy / d) * k2;
      }
    }
    const attack = this.attackHeld.size > 0 || !!k?.SPACE?.isDown || !!k?.J?.isDown;
    const input: FighterInput = { moveX: mx, moveY: my, attack, cast: this.pendingCast, usePotion: this.pendingPotion };
    this.pendingCast = null;
    this.pendingPotion = false;
    return input;
  }

  // ------------------------------------------------------------------ vòng lặp
  override update(_t: number, deltaMs: number): void {
    const a = this.arena;
    if (!this.ending && a.playerNeedsChoice() && !a.player.bot) {
      if (!this.modal) this.openChoice();
      this.render();
      return;
    }
    if (!this.ending) {
      // dùng thời gian thật (delta của Phaser bị làm mượt, chậm hơn thực tế khi máy yếu)
      const real = this.game.loop.rawDelta || deltaMs;
      this.acc += Math.min(0.25, real / 1000) * this.timeScale;
      let steps = 0;
      while (this.acc >= STEP && steps < 60) {
        this.acc -= STEP;
        steps++;
        const input = this.readInput();
        const ev = a.tick(STEP, input);
        this.handleEvents(ev);
        if (this.ending || (a.playerNeedsChoice() && !a.player.bot)) break;
      }
    }
    this.render();
  }

  private handleEvents(evs: ArenaEvent[]): void {
    const a = this.arena;
    const pid = a.playerId;
    const save = getSave();
    let dirty = false;
    for (const e of evs) {
      switch (e.type) {
        case "hit": {
          if (e.sourceId === pid || e.targetId === pid) this.damageNumber(e.x, e.y, e.amount, e.crit, e.targetId === pid);
          const tv = this.fighterViews.get(e.targetId);
          if (tv) tv.flash = 0.09;
          break;
        }
        case "fx": {
          this.spawnFx(e);
          const ov = this.fighterViews.get(e.ownerId);
          if (ov && e.kind !== "death" && e.kind !== "potion") ov.lunge = 0.16;
          break;
        }
        case "eliminated": {
          const v = a.fighterById(e.victimId);
          const k = e.killerId ? a.fighterById(e.killerId) : null;
          const how = e.cause === "zone" ? "bị vòng bo nuốt chửng" : e.cause === "monster" ? "bị quái hạ gục" : `bị ${k?.state.name ?? "?"} hạ gục`;
          this.pushFeed(`☠ ${v?.state.name ?? "?"} ${how} (hạng ${e.placement})`, e.victimId === pid || e.killerId === pid ? "#ffb347" : "#e8d8c8");
          if (e.victimId === pid) this.endMatch(false);
          break;
        }
        case "downed": {
          const v = a.fighterById(e.victimId);
          const k = e.killerId ? a.fighterById(e.killerId) : null;
          this.pushFeed(`✚ ${v?.state.name ?? "?"} gục${k ? ` bởi ${k.state.name}` : ""} – sẽ hồi sinh`, e.victimId === pid ? "#ffb347" : "#b8d8c8");
          if (e.victimId === pid) this.note("BẠN ĐÃ GỤC – hồi sinh sau 5 giây (mất hết đồ & kinh nghiệm)", "#ff9a8a");
          break;
        }
        case "respawned":
          if (e.fighterId === pid) this.note("ĐÃ HỒI SINH! Không còn mạng hồi sinh nào nữa", "#8aff9a");
          break;
        case "victory":
          if (e.winnerId === pid) this.endMatch(true);
          break;
        case "monster_killed":
          if (e.killerId === pid) {
            dirty = completeTutorialStep(save, "hunt_monsters_and_loot") || dirty;
            if (e.isBoss) this.note("Đã hạ Boss! +Tinh Hoa Boss", "#ffb347");
          }
          break;
        case "loot":
          if (e.fighterId === pid) this.note(e.text, "#8aff9a");
          break;
        case "levelup":
          if (e.fighterId === pid) {
            this.note(`LÊN CẤP ${e.level}!${e.level === ULTIMATE_LEVEL ? " TIẾN HOÁ! Mở khóa chiêu Tối Thượng (F)" : e.level === MAX_LEVEL ? " THỨC TỈNH – sức mạnh tối đa!" : ""}`, "#ffe14a");
          }
          break;
        case "zone_shrink":
          this.pushFeed(`⚠ Vòng bo đang thu hẹp (giai đoạn ${e.stage})!`, "#ff7a6a");
          break;
        case "zone_stage_done":
          if (a.player.state.alive) dirty = completeTutorialStep(save, "survive_zone_and_hazard") || dirty;
          break;
        default:
          break;
      }
    }
    if (dirty) persist();
  }

  private endMatch(won: boolean): void {
    if (this.ending) return;
    this.ending = true;
    const s = this.arena.playerSummary();
    this.pushFeed(won ? "🏆 BẠN LÀ THE LAST HERO!" : `Bạn đã bị loại – hạng ${s.placement}`, won ? "#ffe14a" : "#ff9a8a");
    this.time.delayedCall(won ? 2200 : 1600, () => {
      this.scene.start("Result", {
        matchId: this.matchId,
        heroId: this.heroId,
        gender: this.gender,
        branchId: s.branchId,
        evolutionId: this.arena.player.state.evolutionId,
        placement: s.placement,
        kills: s.kills,
        level: s.level,
        won: s.won,
        lootGold: s.gold,
        storePotionsUsed: Math.min(this.storePotions, s.potionsUsed + this.arena.player.lostPotions),
      });
    });
  }

  /** Hạt sáng màu dạng bay quanh nhân vật – dày hơn khi tiến hoá / thức tỉnh. */
  private updateAura(f: Arena["fighters"][number], v: FighterView): void {
    const tier = evolutionTier(f.state.level);
    const want = f.state.branchId ? `${f.state.branchId}:${tier}` : "";
    if (want !== v.auraKey) {
      v.auraKey = want;
      v.aura?.destroy();
      v.aura = null;
      if (want) {
        const color = fxColor(f);
        const em = this.add.particles(0, 0, "dot", {
          x: { min: -34, max: 34 },
          y: { min: -10, max: 6 },
          speedY: { min: -40 - tier * 25, max: -15 - tier * 10 },
          speedX: { min: -12, max: 12 },
          lifespan: { min: 700, max: 1300 },
          scale: { start: 0.32 + tier * 0.1, end: 0 },
          alpha: { start: 0.95, end: 0 },
          tint: [color, 0xffffff, color],
          blendMode: "ADD",
          frequency: [200, 90, 40][tier] ?? 200,
          quantity: tier === 2 ? 2 : 1,
        });
        em.startFollow(v.img, 0, -18);
        this.worldOnly(em);
        v.aura = em;
      }
    }
    if (v.aura) {
      v.aura.setDepth(f.y + 1);
      v.aura.emitting = f.state.alive;
    }
  }

  /** Bùng sáng khi tiến hoá (cấp 10) / thức tỉnh (cấp 15). */
  private evolveBurst(x: number, y: number, color: number): void {
    const em = this.add.particles(x, y - 70, "dot", {
      speed: { min: 120, max: 420 },
      lifespan: 900,
      scale: { start: 0.9, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [color, 0xffffff],
      blendMode: "ADD",
      emitting: false,
    });
    this.worldOnly(em).setDepth(6000);
    em.explode(60);
    const ring = this.worldOnly(this.add.graphics().setDepth(5999).setBlendMode(Phaser.BlendModes.ADD));
    ring.lineStyle(10, color, 0.9).strokeCircle(x, y - 60, 40);
    this.tweens.add({ targets: ring, scale: 3, alpha: 0, duration: 700, onUpdate: () => ring.setPosition(x - x * ring.scale, y - 60 - (y - 60) * ring.scale), onComplete: () => ring.destroy() });
    this.time.delayedCall(1200, () => em.destroy());
  }

  private pushFeed(msg: string, color: string): void {
    for (let i = this.feed.length - 1; i > 0; i--) {
      const cur = this.feed[i] as Phaser.GameObjects.Text;
      const prev = this.feed[i - 1] as Phaser.GameObjects.Text;
      cur.setText(prev.text).setColor(prev.style.color as string).setAlpha(prev.alpha * 0.85);
    }
    this.feed[0]?.setText(msg).setColor(color).setAlpha(1);
  }

  private damageNumber(x: number, y: number, amount: number, crit: boolean, onPlayer: boolean): void {
    if (amount <= 0) return;
    let t = this.dmgPool.find((d) => !d.active);
    if (!t) {
      if (this.dmgPool.length > 40) return;
      t = this.worldOnly(text(this, 0, 0, "", 20).setDepth(6000));
      this.dmgPool.push(t);
    }
    t.setActive(true).setVisible(true).setAlpha(1).setScale(crit ? 1.35 : 1);
    t.setText(crit ? `${amount}!` : String(amount)).setColor(onPlayer ? "#ff5a5a" : crit ? "#ffd84a" : "#ffffff");
    t.setPosition(x + Phaser.Math.Between(-14, 14), y - 50).setOrigin(0.5);
    this.tweens.add({ targets: t, y: y - 95, alpha: 0, duration: 750, onComplete: () => t?.setActive(false).setVisible(false) });
  }

  private spawnFx(e: Extract<ArenaEvent, { type: "fx" }>): void {
    const cam = this.cameras.main;
    if (Math.abs(e.x - cam.midPoint.x) > 900 || Math.abs(e.y - cam.midPoint.y) > 600) return;
    const g = this.worldOnly(this.add.graphics().setDepth(5500).setBlendMode(Phaser.BlendModes.ADD));
    const dur = e.kind === "storm" ? 700 : e.kind === "trap" ? 3500 : 380;
    switch (e.kind) {
      case "attack":
      case "cleave":
        g.fillStyle(e.color, e.kind === "cleave" ? 0.3 : 0.18).fillCircle(e.x, e.y, e.radius * 0.55);
        break;
      case "nova":
      case "heal":
      case "storm":
        g.lineStyle(6, e.color, 0.75).strokeCircle(e.x, e.y, e.radius);
        g.fillStyle(e.color, e.kind === "storm" ? 0.12 : 0.16).fillCircle(e.x, e.y, e.radius);
        if (e.kind === "storm") {
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            g.lineStyle(3, e.color, 0.45).lineBetween(e.x, e.y, e.x + Math.cos(a) * e.radius, e.y + Math.sin(a) * e.radius);
          }
          if (e.ownerId === this.arena.playerId) cam.shake(220, 0.006);
        }
        break;
      case "trap":
        g.lineStyle(4, e.color, 0.8).strokeCircle(e.x, e.y, e.radius);
        g.fillStyle(e.color, 0.18).fillCircle(e.x, e.y, e.radius);
        break;
      case "shield":
        g.lineStyle(5, e.color, 0.9).strokeCircle(e.x, e.y - 30, 42);
        break;
      case "dash":
      case "bolt":
        g.lineStyle(e.kind === "dash" ? 14 : 6, e.color, 0.5).lineBetween(e.x, e.y - 30, e.toX ?? e.x, (e.toY ?? e.y) - 30);
        break;
      case "potion":
        g.fillStyle(0xff4a6a, 0.4).fillCircle(e.x, e.y - 30, 40);
        break;
      case "levelup":
        g.lineStyle(6, 0xffe14a, 0.9).strokeCircle(e.x, e.y - 30, 50);
        break;
      case "death":
        g.setBlendMode(Phaser.BlendModes.NORMAL);
        g.lineStyle(4, 0xffffff, 0.6).strokeCircle(e.x, e.y - 20, e.radius + 14);
        g.fillStyle(0x000000, 0.25).fillCircle(e.x, e.y - 20, e.radius + 10);
        break;
    }
    this.tweens.add({ targets: g, alpha: 0, duration: dur, ease: "Quad.easeIn", onComplete: () => g.destroy() });
    // hạt sáng cho kỹ năng
    const sparks: Partial<Record<string, number>> = { cleave: 8, nova: 18, storm: 30, heal: 16, shield: 10, trap: 10, dash: 8, levelup: 24 };
    const n = sparks[e.kind];
    if (n) {
      const em = this.add.particles(e.x, e.y - 30, "dot", {
        speed: { min: 60, max: e.kind === "storm" ? 520 : 280 },
        lifespan: { min: 300, max: 700 },
        scale: { start: e.kind === "storm" ? 0.55 : 0.4, end: 0 },
        alpha: { start: 0.85, end: 0 },
        tint: e.color,
        blendMode: "ADD",
        emitting: false,
      });
      this.worldOnly(em).setDepth(5600);
      em.explode(n);
      this.time.delayedCall(800, () => em.destroy());
    }
  }

  // ------------------------------------------------------------------ vẽ
  private render(): void {
    const a = this.arena;
    const t = a.time;
    for (const f of a.fighters) {
      const v = this.fighterViews.get(f.id);
      if (!v) continue;
      if (!f.state.alive) {
        if (v.img.visible) {
          v.img.setVisible(false);
          v.name.setVisible(false);
        }
        continue;
      }
      if (!v.img.visible) {
        v.img.setVisible(true);
        v.name.setVisible(true);
      }
      // nhấp nháy khi đang bất tử sau hồi sinh
      v.img.setAlpha(t < f.protectUntil ? 0.5 + 0.5 * Math.sin(t * 20) : 1);
      const speed = Math.hypot(f.vx, f.vy);
      const moving = speed > 20;
      const back = moving && f.faceY < -0.6;
      const key = `${heroArtKey(f.state.heroId, f.state.branchId, f.state.evolutionId, back)}:${f.state.level}`;
      if (key !== v.key) {
        const evolved = v.key !== "" && v.scale < evolutionScale(f.state.level);
        v.key = key;
        v.scale = evolutionScale(f.state.level);
        setHeroImage(v.img, f.state.heroId, f.state.branchId, f.state.evolutionId, back, v.scale);
        if (evolved) this.evolveBurst(f.x, f.y, fxColor(f));
      }
      // ---- hiệu ứng động ----
      const dtv = this.game.loop.delta / 1000;
      v.lunge = Math.max(0, v.lunge - dtv);
      v.flash = Math.max(0, v.flash - dtv);
      const tt = t * (moving ? 13 : 3) + v.phase;
      // thở khi đứng, nhún + nghiêng khi chạy
      const breatheY = moving ? 1 + Math.abs(Math.sin(tt)) * 0.04 : 1 + Math.sin(tt) * 0.028;
      const breatheX = moving ? 1 - Math.abs(Math.sin(tt)) * 0.02 : 1 - Math.sin(tt) * 0.012;
      const bob = moving ? -Math.abs(Math.sin(tt)) * 6 : 0;
      const tilt = moving ? Math.sin(tt) * 0.07 + (f.vx / Math.max(1, speed)) * 0.05 : 0;
      // lao người về hướng đánh + phóng to nhẹ
      const lk = v.lunge > 0 ? Math.sin((v.lunge / 0.16) * Math.PI) : 0;
      const punch = 1 + lk * 0.07;
      v.img
        .setPosition(f.x + f.faceX * lk * 14, f.y + bob + f.faceY * lk * 8)
        .setDepth(f.y)
        .setFlipX(f.faceX < -0.1)
        .setRotation(tilt)
        .setScale(v.scale * breatheX * punch, v.scale * breatheY * punch);
      // loé trắng khi trúng đòn
      if (v.flash > 0) v.img.setTintFill(0xffffff);
      else v.img.clearTint();
      v.name.setPosition(f.x, f.y - 30 - HERO_FIGURE_H * v.scale).setDepth(5003);
      this.updateAura(f, v);
    }
    for (const m of a.monsters) {
      const img = this.monsterViews.get(m.id);
      if (!img) continue;
      img.setVisible(m.alive);
      if (m.alive) img.setPosition(m.x, m.y).setDepth(m.y);
    }
    // vòng sáng dưới chân (màu nhánh; người chơi viền vàng)
    const rg = this.ringG;
    rg.clear();
    if (a.respawnOpen()) {
      for (const pt of a.respawnPoints) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 3 + pt.x);
        rg.fillStyle(0x6affb0, 0.12 + 0.1 * pulse).fillEllipse(pt.x, pt.y, 150, 60);
        rg.lineStyle(4, 0x6affb0, 0.7).strokeEllipse(pt.x, pt.y, 150, 60);
        rg.lineStyle(2, 0xffffff, 0.5 * pulse).strokeEllipse(pt.x, pt.y, 110, 40);
        rg.lineStyle(5, 0x6affb0, 0.8).lineBetween(pt.x, pt.y - 18, pt.x, pt.y + 18).lineBetween(pt.x - 36, pt.y, pt.x + 36, pt.y);
      }
    }
    for (const f of a.fighters) {
      if (!f.state.alive) continue;
      const isP = f.id === a.playerId;
      const tier = evolutionTier(f.state.level);
      if (tier > 0) {
        // tiến hoá: hào quang toả sáng; thức tỉnh: cột sáng + vòng kép
        const pul = 0.5 + 0.5 * Math.sin(t * 4 + f.x);
        rg.fillStyle(fxColor(f), 0.12 + 0.08 * pul).fillEllipse(f.x, f.y, 130 + tier * 30, 44 + tier * 10);
        if (tier === 2) {
          rg.fillStyle(fxColor(f), 0.07 + 0.05 * pul).fillRect(f.x - 30, f.y - 190, 60, 190);
          rg.lineStyle(2, 0xffffff, 0.5 * pul).strokeEllipse(f.x, f.y, 150, 50);
        }
      }
      rg.fillStyle(fxColor(f), 0.18).fillEllipse(f.x, f.y, 70, 22);
      rg.lineStyle(isP ? 3 : 2, isP ? 0xffd84a : fxColor(f), isP ? 0.95 : 0.6).strokeEllipse(f.x, f.y, 70 + Math.sin(t * 5) * 4, 22);
    }
    // thanh máu
    const b = this.bars;
    b.clear();
    for (const f of a.fighters) {
      if (!f.state.alive) continue;
      const w = 54;
      const x = f.x - w / 2;
      const y = f.y - 26 - HERO_FIGURE_H * evolutionScale(f.state.level);
      b.fillStyle(0x0b0f18, 0.85).fillRect(x - 1, y - 1, w + 2, 8);
      b.fillStyle(f.id === a.playerId ? 0x5ad05a : 0xe04a3a, 1).fillRect(x, y, (w * f.state.hp) / f.state.maxHp, 6);
      if (f.shieldHp > 0) b.fillStyle(0xffffff, 0.8).fillRect(x, y - 3, Math.min(w, (w * f.shieldHp) / f.state.maxHp), 2);
    }
    for (const m of a.monsters) {
      if (!m.alive || m.hp >= m.maxHp) continue;
      const w = m.def.isBoss ? 90 : 40;
      b.fillStyle(0x0b0f18, 0.85).fillRect(m.x - w / 2 - 1, m.y - m.def.size - 13, w + 2, 6);
      b.fillStyle(m.def.isBoss ? 0xff8a2a : 0xd0b040, 1).fillRect(m.x - w / 2, m.y - m.def.size - 12, (w * m.hp) / m.maxHp, 4);
    }
    // đạn & vùng hiệu ứng
    const fx = this.fxG;
    fx.clear();
    for (const p of a.projectiles) {
      fx.fillStyle(p.color, 0.35).fillCircle(p.x, p.y - 30, p.radius * 1.8);
      fx.fillStyle(0xffffff, 0.9).fillCircle(p.x, p.y - 30, p.radius * 0.6);
    }
    for (const fl of a.fields) {
      fx.fillStyle(fl.color, 0.12 + 0.06 * Math.sin(t * 10)).fillCircle(fl.x, fl.y, fl.radius);
    }
    // vòng bo
    const z = a.zone;
    const zg = this.zoneG;
    zg.clear();
    // vùng ngoài bo: đa giác hình vành khuyên (ngoài → trong ngược chiều)
    const outerR = ISLAND_RADIUS * 2 + 600;
    const pts: Phaser.Math.Vector2[] = [];
    const N = 72;
    for (let i = 0; i <= N; i++) {
      const ang = (i / N) * Math.PI * 2;
      pts.push(new Phaser.Math.Vector2(z.centerX + Math.cos(ang) * outerR, z.centerY + Math.sin(ang) * outerR));
    }
    for (let i = N; i >= 0; i--) {
      const ang = (i / N) * Math.PI * 2;
      pts.push(new Phaser.Math.Vector2(z.centerX + Math.cos(ang) * z.radius, z.centerY + Math.sin(ang) * z.radius));
    }
    zg.fillStyle(0x6a2a8a, 0.28).fillPoints(pts, true);
    zg.lineStyle(6, 0xc87aff, 0.9).strokeCircle(z.centerX, z.centerY, Math.max(1, z.radius));
    if (z.phase === "wait") zg.lineStyle(3, 0xffffff, 0.7).strokeCircle(z.targetX, z.targetY, Math.max(1, z.targetRadius));

    this.renderHud();
  }

  private renderHud(): void {
    const a = this.arena;
    const p = a.player;
    const s = p.state;
    const z = a.zone;
    this.aliveText.setText(`CÒN SỐNG: ${a.getAliveCount()}/${a.fighters.length} ☠`);
    const tm = Math.max(0, Math.ceil(z.timer));
    const mmss = `${Math.floor(tm / 60)}:${String(tm % 60).padStart(2, "0")}`;
    this.zoneText.setText(z.phase === "wait" ? `Bo thu hẹp sau: ${mmss}` : z.phase === "shrink" ? `BO ĐANG THU: ${mmss}` : "Bo đã đóng!");
    this.zoneText.setColor(z.phase === "shrink" ? "#ff9a6a" : "#f3ead8");
    const hz = HAZARD_EFFECTS[s.activeHazard];
    const respawnLeft = Math.max(0, Math.ceil(RESPAWN_WINDOW_SEC - a.time));
    const lifeInfo = p.respawnAt !== null ? `✚ Hồi sinh sau ${Math.max(0, Math.ceil(p.respawnAt - a.time))}s` : p.lives > 0 && respawnLeft > 0 ? `✚ Còn 1 mạng hồi sinh (${Math.floor(respawnLeft / 60)}:${String(respawnLeft % 60).padStart(2, "0")})` : "";
    this.hazardText.setText(s.outsideSafeZone ? `⚠ NGOÀI BO · ${hz.nameVi.toUpperCase()}!` : lifeInfo);
    this.hazardText.setColor(s.outsideSafeZone ? "#ff7a6a" : "#8affc0");
    const tint = HAZARD_TINT[s.activeHazard];
    this.hazardTint.setFillStyle(tint ? tint[0] : 0x000000, tint ? tint[1] + 0.05 * Math.sin(a.time * 4) : 0);
    this.vignette.setAlpha(s.outsideSafeZone ? Math.min(0.9, (1 - hz.vision) * 1.6) : 0);

    const hero = heroById(s.heroId);
    const br = hero?.branches.find((x) => x.id === s.branchId);
    const pk = `${s.branchId ?? ""}:${s.evolutionId ?? ""}`;
    if (pk !== this.portraitKey) {
      this.portraitKey = pk;
      setHeroImage(this.portrait, s.heroId, s.branchId, s.evolutionId, false, 0.62);
    }
    this.infoText.setText(
      `${hero?.nameVi ?? ""} · ${br?.evolutions.find((e) => e.id === s.evolutionId)?.name ?? br?.name ?? hero?.baseNameVi ?? ""}  ·  🧪 ${p.potions}  ·  ⚔ ${s.kills}  ·  💰 ${p.gold}  ·  ${BIOME_NAME_VI[biomeAt(p.x, p.y)]}` +
        (Object.keys(p.equipped).length ? `\nTrang bị: ${Object.values(p.equipped).map((e) => e?.nameVi).join(", ")}` : ""),
    );
    const g = this.hudG;
    g.clear();
    // khung chân dung + thanh
    pixelBox(g, 8, 592, 404, 120, 0x6a4a2a);
    pixelBox(g, 16, 600, 388, 104, 0x141a28, { bevel: false, outline: 0x2a1c10 });
    pixelBox(g, 20, 604, 100, 96, 0x232c40, { outline: 0x0b0a12 });
    const bar = (y: number, ratio: number, color: number) => {
      const w = 268;
      g.fillStyle(0x0b0a12, 1).fillRect(128, y - 2, w + 4, 16);
      g.fillStyle(0x05070c, 1).fillRect(130, y, w, 12);
      const fw = Math.floor((w * Math.max(0, Math.min(1, ratio))) / PX) * PX;
      g.fillStyle(color, 1).fillRect(130, y, fw, 12);
      g.fillStyle(Phaser.Display.Color.IntegerToColor(color).lighten(22).color, 1).fillRect(130, y, fw, PX);
      g.fillStyle(Phaser.Display.Color.IntegerToColor(color).darken(25).color, 1).fillRect(130, y + 12 - PX, fw, PX);
      // vạch chia ô
      g.fillStyle(0x0b0a12, 0.5);
      for (let i = 1; i < 10; i++) g.fillRect(130 + (w / 10) * i, y, 2, 12);
    };
    bar(636, s.hp / s.maxHp, 0xd83a3a);
    bar(656, s.mana / s.maxMana, 0x3a7ad8);
    bar(676, s.stamina / s.maxStamina, 0xd8c03a);
    const need = EXP_TO_NEXT[s.level] ?? 1;
    bar(696, s.level >= MAX_LEVEL ? 1 : s.exp / need, 0x9a5aff);
    this.statText.setText(`Cấp ${s.level}${s.level >= MAX_LEVEL ? " (tối đa)" : ""}   Máu ${Math.ceil(s.hp)}/${s.maxHp}`);
    this.statText.setPosition(130, 606);

    // nút kỹ năng
    for (const sb of this.skillButtons) {
      const gg = sb.g;
      gg.clear();
      let ready = true;
      let ratio = 0;
      let label = "";
      let color = 0x4a4f5a;
      if (sb.slot === "attack") {
        label = "ĐÁNH";
        color = 0x8a3a2a;
      } else if (sb.slot === "potion") {
        label = `🧪${p.potions}`;
        ready = p.potions > 0;
        color = 0x8a2a4a;
      } else if (hero) {
        const sk = skillFor(hero, s, sb.slot);
        if (!sk) {
          ready = false;
          label = sb.slot === "ult" ? `Cấp ${ULTIMATE_LEVEL}` : "Cấp 5";
        } else {
          label = sk.nameVi;
          color = fxColor(p);
          const max = a.skillCooldownMax(p, sb.slot);
          ratio = p.cd[sb.slot] / max;
          ready = a.canCast(p, sb.slot);
        }
      }
      let iconKey = sb.slot === "attack" ? skillIcon(this, "attack", 0xd06a3a) : "";
      if (hero && sb.slot !== "attack" && sb.slot !== "potion") {
        const sk = skillFor(hero, s, sb.slot);
        if (sk) iconKey = skillIcon(this, sk.kind, fxColor(p));
      }
      const iconFrame = iconKey ? 0 : -1;
      pixelCircle(gg, sb.x + PX, sb.y + PX * 2, sb.r, 0x000000, { alpha: 0.4, bevel: false, outline: 0x000000 });
      pixelCircle(gg, sb.x, sb.y, sb.r, ready ? 0xe8b84a : 0x5a5f6a);
      pixelCircle(gg, sb.x, sb.y, sb.r - PX * 2, ready ? Phaser.Display.Color.IntegerToColor(color).darken(30).color : 0x2a2e36, { outline: ready ? 0x8a6a2a : 0x3a3e46 });
      if (iconFrame >= 0) {
        if (sb.icon.texture.key !== iconKey) sb.icon.setTexture(iconKey).setDisplaySize(sb.r * 1.42, sb.r * 1.42);
        sb.icon.setVisible(true).setAlpha(ready ? 1 : 0.45);
      } else sb.icon.setVisible(false);
      const cg = sb.cdG;
      cg.clear();
      if (ratio > 0) {
        cg.fillStyle(0x000000, 0.62);
        cg.slice(sb.x, sb.y, sb.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio, false);
        cg.fillPath();
      }
      if (ready && iconFrame >= 0) sb.icon.setAlpha(0.85 + 0.15 * Math.sin(a.time * 6));
      const cdText = ratio > 0 && sb.slot !== "attack" && sb.slot !== "potion" ? `${Math.ceil(p.cd[sb.slot as SkillSlot])}s` : "";
      sb.label.setText(cdText || (iconFrame >= 0 ? "" : label));
      sb.label.setWordWrapWidth(sb.r * 1.9).setAlign("center").setAlpha(ready || ratio > 0 ? 1 : 0.7);
    }
    // cần điều khiển ảo
    this.joyG.clear();
    if (this.joy.id !== -1) {
      this.joyG.fillStyle(0xffffff, 0.12).fillCircle(this.joy.bx, this.joy.by, 64);
      this.joyG.lineStyle(3, 0xffffff, 0.4).strokeCircle(this.joy.bx, this.joy.by, 64);
      const dx = this.joy.x - this.joy.bx;
      const dy = this.joy.y - this.joy.by;
      const d = Math.hypot(dx, dy);
      const k = d > 64 ? 64 / d : 1;
      this.joyG.fillStyle(0xffffff, 0.45).fillCircle(this.joy.bx + dx * k, this.joy.by + dy * k, 28);
    }
    // bản đồ nhỏ (10 lần/giây)
    this.miniTimer -= this.game.loop.delta / 1000;
    if (this.miniTimer <= 0) {
      this.miniTimer = 0.1;
      this.drawMinimap();
    }
  }

  private drawMinimap(): void {
    const a = this.arena;
    const g = this.miniG;
    const cx = 112;
    const cy = 112;
    const R = 92;
    const k = R / ISLAND_RADIUS;
    const mx = (x: number) => cx + (x - WORLD_CENTER) * k;
    const my = (y: number) => cy + (y - WORLD_CENTER) * k;
    g.clear();
    pixelCircle(g, cx, cy, R + 12, 0x6a4a2a);
    pixelCircle(g, cx, cy, R + 4, 0x0b0f18, { bevel: false, outline: 0xe8b84a });
    for (const s of BIOME_SECTORS) {
      g.fillStyle(BIOME_COLOR[s.biome], 0.95);
      g.slice(cx, cy, R, Phaser.Math.DegToRad(s.from), Phaser.Math.DegToRad(s.to), false);
      g.fillPath();
    }
    const z = a.zone;
    g.lineStyle(2, 0xc87aff, 1).strokeCircle(mx(z.centerX), my(z.centerY), Math.max(1, z.radius * k));
    if (z.phase === "wait") g.lineStyle(1.5, 0xffffff, 0.9).strokeCircle(mx(z.targetX), my(z.targetY), Math.max(1, z.targetRadius * k));
    for (const m of a.monsters) if (m.alive && m.def.isBoss) g.fillStyle(0xff8a2a, 1).fillCircle(mx(m.x), my(m.y), 3);
    if (a.respawnOpen()) for (const pt of a.respawnPoints) g.lineStyle(2, 0x6affb0, 1).strokeCircle(mx(pt.x), my(pt.y), 3.5);
    // chỉ hiện đối thủ ở gần (tầm nhìn)
    const p = a.player;
    for (const f of a.fighters) {
      if (!f.state.alive || f === p) continue;
      if (Math.hypot(f.x - p.x, f.y - p.y) < 900) g.fillStyle(0xff3a3a, 1).fillCircle(mx(f.x), my(f.y), 3);
    }
    if (p.state.alive) {
      g.fillStyle(0x5affff, 1).fillCircle(mx(p.x), my(p.y), 4.5);
      g.lineStyle(1.5, 0xffffff, 1).strokeCircle(mx(p.x), my(p.y), 4.5);
    }
  }

  // ------------------------------------------------------------------ chọn Dạng 2 / Dạng 3 / thẻ
  private openChoice(): void {
    const a = this.arena;
    const s = a.player.state;
    const hero = heroById(s.heroId);
    if (!hero) return;
    this.joy.id = -1;
    this.attackHeld.clear();
    const c = this.hudOnly(this.add.container(0, 0).setScrollFactor(0).setDepth(9500));
    this.modal = c;
    c.add(this.add.rectangle(0, 0, W, H, 0x000000, 0.65).setOrigin(0).setInteractive());
    const close = () => {
      c.destroy();
      this.modal = null;
    };
    if (s.needsBranch) {
      c.add(text(this, W / 2, 40, "CẤP 5 – CHỌN HƯỚNG DẠNG 2", 40, "#ffb347", 800).setOrigin(0.5, 0));
      c.add(text(this, W / 2, 96, "3 hướng cùng cấp bậc, chỉ số & hiệu ứng khác nhau. Chọn 1 hướng cố định cho cả trận.", 19, "#e8e0d0", 500).setOrigin(0.5, 0));
      hero.branches.forEach((br, i) => {
        const x = 70 + i * 390;
        c.add(panel(this, x, 140, 360, 520));
        c.add(text(this, x + 180, 150, `HƯỚNG ${i + 1}`, 18, hex(br.color)).setOrigin(0.5, 0));
        const fig = addHeroImage(this, x + 180, 342, hero.id, br.id, null, 1.15);
        c.add(fig);
        breathe(this, fig);
        c.add(text(this, x + 180, 346, br.name, 30, hex(br.color)).setOrigin(0.5, 0));
        c.add(text(this, x + 180, 384, br.descVi, 17, "#e8e0d0", 500).setOrigin(0.5, 0).setWordWrapWidth(320).setAlign("center"));
        c.add(text(this, x + 24, 432, `Bị động: ${br.passive.nameVi}\nQ ${br.skills[0].nameVi} · E ${br.skills[1].nameVi} · R ${br.skills[2].nameVi}\nCấp 10 → ${br.evolutions.map((e) => e.name).join(" / ")}`, 16, "#d8d0c0", 500).setWordWrapWidth(320));
        c.add(
          button(this, x + 180, 610, 260, 60, "Chọn dạng này", () => {
            if (a.chooseBranch(a.playerId, br.id)) {
              if (completeTutorialStep(getSave(), "lock_branch_at_lv5")) persist();
              this.note(`Đã nâng cấp thành ${br.name}!`, hex(br.color));
            }
            close();
          }, 0xc8641e).root,
        );
      });
      return;
    }
    if (s.needsEvolution) {
      const br = hero.branches.find((b) => b.id === s.branchId);
      if (!br) {
        close();
        return;
      }
      c.add(text(this, W / 2, 34, `CẤP 10 – TIẾN HOÁ DẠNG 3 · ${br.name.toUpperCase()}`, 38, hex(br.color), 800).setOrigin(0.5, 0));
      c.add(text(this, W / 2, 88, "Chọn 1 trong 3 hướng: Tấn Công / Phòng Thủ / Tinh Thông. Mở khóa chiêu Tối Thượng (F).", 19, "#e8e0d0", 500).setOrigin(0.5, 0));
      br.evolutions.forEach((evo, i) => {
        const x = 70 + i * 390;
        c.add(panel(this, x, 130, 360, 530));
        c.add(text(this, x + 180, 142, EVOLUTION_STYLE_VI[evo.style]?.toUpperCase() ?? "", 18, hex(evo.color)).setOrigin(0.5, 0));
        const fig = addHeroImage(this, x + 180, 352, hero.id, br.id, evo.id, 1.25);
        c.add(fig);
        breathe(this, fig);
        c.add(text(this, x + 180, 358, evo.name, 28, hex(evo.color)).setOrigin(0.5, 0).setWordWrapWidth(330).setAlign("center"));
        c.add(text(this, x + 180, 396, evo.descVi, 16, "#e8e0d0", 500).setOrigin(0.5, 0).setWordWrapWidth(320).setAlign("center"));
        c.add(text(this, x + 24, 446, `${passiveText(evo.passive.effect)}\nTối thượng: ${evo.ultimate.nameVi}${hasRealArt(hero.id, br.id, evo.id) ? "" : "\n(hình tạm – chờ ảnh nhân vật)"}`, 16, "#d8d0c0", 500).setWordWrapWidth(320));
        c.add(
          button(this, x + 180, 616, 260, 58, "Tiến hoá", () => {
            if (a.chooseEvolution(a.playerId, evo.id)) this.note(`TIẾN HOÁ: ${evo.name}!`, hex(evo.color));
            close();
          }, 0xc8641e).root,
        );
      });
      return;
    }
    const offer = s.pendingOffers[0];
    if (!offer) {
      close();
      return;
    }
    c.add(text(this, W / 2, 60, "NÂNG CẤP – CHỌN 1 TRONG 3 THẺ", 40, "#ffe14a", 800).setOrigin(0.5, 0));
    if (s.pendingOffers.length > 1) c.add(text(this, W / 2, 112, `Còn ${s.pendingOffers.length - 1} lượt chọn nữa`, 20, "#c8c0b0", 500).setOrigin(0.5, 0));
    const RARITY_VI: Record<UpgradeChoice["rarity"], [string, number]> = { common: ["Thường", ITEM_RARITY_COLOR.common], rare: ["Hiếm", ITEM_RARITY_COLOR.rare], epic: ["Sử Thi", ITEM_RARITY_COLOR.epic] };
    const POOL_VI: Record<UpgradeChoice["pool"], string> = { skill_modifier: "Sửa đổi kỹ năng", passive_boost: "Tăng bị động", stat_enhancement: "Tăng chỉ số" };
    offer.forEach((ch, i) => {
      const x = 90 + i * 380;
      const [rv, rc] = RARITY_VI[ch.rarity];
      const g = this.add.graphics();
      g.fillStyle(0x151c2b, 0.97).fillRoundedRect(x, 170, 340, 420, 18);
      g.lineStyle(5, rc, 1).strokeRoundedRect(x, 170, 340, 420, 18);
      g.fillStyle(rc, 0.18).fillRoundedRect(x + 8, 178, 324, 90, 12);
      c.add(g);
      c.add(text(this, x + 170, 190, rv.toUpperCase(), 20, hex(rc)).setOrigin(0.5, 0));
      c.add(text(this, x + 170, 222, ch.title, 30, "#ffffff").setOrigin(0.5, 0));
      c.add(text(this, x + 170, 290, POOL_VI[ch.pool], 18, "#ffb347").setOrigin(0.5, 0));
      c.add(text(this, x + 170, 330, ch.description, 21, "#e8e0d0", 500).setOrigin(0.5, 0).setWordWrapWidth(300).setAlign("center"));
      c.add(
        button(this, x + 170, 540, 240, 62, "Chọn", () => {
          if (a.chooseUpgrade(a.playerId, ch.id)) {
            if (completeTutorialStep(getSave(), "pick_random_upgrade")) persist();
          }
          close();
        }, 0x3a8a3a).root,
      );
    });
  }
}
