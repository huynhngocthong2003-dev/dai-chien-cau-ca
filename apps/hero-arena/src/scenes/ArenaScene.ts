import Phaser from "phaser";
import {
  Arena,
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
import { decoTexture, dotTexture, heroTexture, makeMonsterTextures, monsterTexture, vignetteTexture, type DecoKind } from "../art.ts";
import { getSave, newMatchSeed, persist } from "../state.ts";
import { button, H, hex, panel, text, toast, W } from "../ui.ts";

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
  forest: ["tree", "darktree", "darktree", "tree", "rock", "grave", "fire"],
  ruined_temple: ["pillar", "pillar", "ruin", "grave", "rock", "tree"],
  desert: ["cactus", "cactus", "rock", "obelisk", "house"],
  ruined_village: ["house", "house", "rock", "cactus", "obelisk", "fire"],
  mountain: ["peak", "pine", "pine", "rock", "crystal", "rock"],
  glacier: ["crystal", "pine", "crystal", "peak", "rock"],
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
}

interface SkillButton {
  slot: SkillSlot | "attack" | "potion";
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
    this.cameras.main.setZoom(0.9);
    dotTexture(this);
    makeMonsterTextures(this);
    this.drawWorld(seed);

    for (const m of this.arena.monsters) {
      const img = this.add.image(m.x, m.y, monsterTexture(this, m.def));
      this.monsterViews.set(m.id, img);
    }
    for (const f of this.arena.fighters) {
      const key = heroTexture(this, f.state.heroId, null, f.state.gender);
      const img = this.add.image(f.x, f.y, key).setOrigin(0.5, 0.92);
      const name = text(this, f.x, f.y, f.isBot ? f.state.name : `★ ${f.state.name}`, 15, f.isBot ? "#f0e0d0" : "#ffe14a").setOrigin(0.5, 1);
      this.fighterViews.set(f.id, { img, name, key });
    }
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
    const g = this.add.graphics().setDepth(-10);
    const C = WORLD_CENTER;
    // vách đá quanh đảo
    g.fillStyle(0x1e2228, 1).fillCircle(C, C, ISLAND_RADIUS + 70);
    g.fillStyle(0x2c3038, 1).fillCircle(C, C, ISLAND_RADIUS + 30);
    for (const s of BIOME_SECTORS) {
      g.fillStyle(BIOME_COLOR[s.biome], 1);
      g.slice(C, C, ISLAND_RADIUS, Phaser.Math.DegToRad(s.from), Phaser.Math.DegToRad(s.to), false);
      g.fillPath();
    }
    // vân đất
    const rng = new Rng(seed ^ 0x5eed);
    for (let i = 0; i < 1400; i++) {
      const a = rng.range(0, Math.PI * 2);
      const d = Math.sqrt(rng.next()) * ISLAND_RADIUS;
      const x = C + Math.cos(a) * d;
      const y = C + Math.sin(a) * d;
      const b = biomeAt(x, y);
      const base = BIOME_COLOR[b];
      const light = rng.chance(0.5);
      g.fillStyle(light ? Phaser.Display.Color.IntegerToColor(base).lighten(12).color : Phaser.Display.Color.IntegerToColor(base).darken(12).color, 0.6);
      g.fillEllipse(x, y, rng.range(30, 110), rng.range(14, 40));
    }
    // đường đá từ tế đàn
    g.lineStyle(70, 0x4a4a52, 1);
    for (const s of BIOME_SECTORS) {
      const a = biomeMidAngle(s.biome);
      g.lineBetween(C, C, C + Math.cos(a) * ISLAND_RADIUS * 0.8, C + Math.sin(a) * ISLAND_RADIUS * 0.8);
    }
    g.lineStyle(4, 0x2a2a30, 0.6);
    for (const s of BIOME_SECTORS) {
      const a = biomeMidAngle(s.biome);
      g.lineBetween(C, C, C + Math.cos(a) * ISLAND_RADIUS * 0.8, C + Math.sin(a) * ISLAND_RADIUS * 0.8);
    }
    // tế đàn trung tâm (bát giác)
    const oct = (r: number) => Array.from({ length: 8 }, (_, i) => new Phaser.Math.Vector2(C + Math.cos((i * Math.PI) / 4 + Math.PI / 8) * r, C + Math.sin((i * Math.PI) / 4 + Math.PI / 8) * r));
    g.fillStyle(0x2a2630, 1).fillPoints(oct(ALTAR_RADIUS), true);
    g.lineStyle(6, 0x5a4a6a, 1).strokePoints(oct(ALTAR_RADIUS), true);
    g.fillStyle(0x3a3442, 1).fillPoints(oct(ALTAR_RADIUS * 0.62), true);
    g.fillStyle(0xc070ff, 0.25).fillCircle(C, C, ALTAR_RADIUS * 0.4);
    g.fillStyle(0xffb0ff, 0.25).fillCircle(C, C, ALTAR_RADIUS * 0.2);
    // nướng nền vào texture nửa độ phân giải (Graphics vẽ lại mỗi khung rất tốn)
    const BAKE = 0.5;
    const rt = this.add.renderTexture(0, 0, WORLD_SIZE * BAKE, WORLD_SIZE * BAKE).setOrigin(0).setScale(1 / BAKE).setDepth(-10);
    g.setScale(BAKE);
    rt.draw(g);
    g.destroy();
    // nhãn vùng
    for (const s of BIOME_SECTORS) {
      const a = biomeMidAngle(s.biome);
      text(this, C + Math.cos(a) * ISLAND_RADIUS * 0.96, C + Math.sin(a) * ISLAND_RADIUS * 0.96, BIOME_NAME_VI[s.biome], 30, "#ffffffaa").setOrigin(0.5).setDepth(-5);
    }
    // trang trí
    for (const s of BIOME_SECTORS) {
      const kinds = BIOME_DECO[s.biome];
      for (let i = 0; i < 55; i++) {
        const a = Phaser.Math.DegToRad(rng.range(s.from + 3, s.to - 3));
        const d = rng.range(ALTAR_RADIUS + 80, ISLAND_RADIUS - 60);
        const x = C + Math.cos(a) * d;
        const y = C + Math.sin(a) * d;
        // tránh đường đá
        const mid = biomeMidAngle(s.biome);
        const off = Math.abs(Math.sin(a - mid)) * d;
        if (off < 70) continue;
        const kind = rng.pick(kinds);
        this.add.image(x, y, decoTexture(this, kind)).setOrigin(0.5, 0.9).setDepth(y).setScale(rng.range(0.8, 1.25));
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
    this.portrait = fixed(this.add.image(66, 686, heroTexture(this, this.heroId, null, this.gender)).setScale(1.2).setOrigin(0.5, 0.92));
    for (let i = 0; i < 5; i++) this.feed.push(fixed(text(this, W - 24, 130 + i * 24, "", 17, "#f3ead8", 500).setOrigin(1, 0)));

    const mk = (slot: SkillButton["slot"], x: number, y: number, r: number, key: string) => {
      const g = fixed(this.add.graphics());
      const label = fixed(text(this, x, y, "", r > 50 ? 18 : 14, "#ffffff").setOrigin(0.5));
      const k = fixed(text(this, x + r * 0.62, y - r * 0.82, key, 13, "#ffe08a").setOrigin(0.5));
      const zone = fixed(this.add.zone(x, y, r * 2, r * 2).setInteractive());
      zone.on("pointerdown", (p: Phaser.Input.Pointer) => {
        if (slot === "attack") this.attackHeld.add(p.id);
        else if (slot === "potion") this.pendingPotion = true;
        else this.pendingCast = slot;
      });
      this.skillButtons.push({ slot, x, y, r, g, label, key: k });
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
        case "hit":
          if (e.sourceId === pid || e.targetId === pid) this.damageNumber(e.x, e.y, e.amount, e.crit, e.targetId === pid);
          break;
        case "fx":
          this.spawnFx(e);
          break;
        case "eliminated": {
          const v = a.fighterById(e.victimId);
          const k = e.killerId ? a.fighterById(e.killerId) : null;
          const how = e.cause === "zone" ? "bị vòng bo nuốt chửng" : e.cause === "monster" ? "bị quái hạ gục" : `bị ${k?.state.name ?? "?"} hạ gục`;
          this.pushFeed(`☠ ${v?.state.name ?? "?"} ${how} (hạng ${e.placement})`, e.victimId === pid || e.killerId === pid ? "#ffb347" : "#e8d8c8");
          if (e.victimId === pid) this.endMatch(false);
          break;
        }
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
            this.note(`LÊN CẤP ${e.level}!${e.level === ULTIMATE_LEVEL ? " Mở khóa chiêu Tối Thượng (F)" : e.level === MAX_LEVEL ? " THỨC TỈNH!" : ""}`, "#ffe14a");
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
        placement: s.placement,
        kills: s.kills,
        level: s.level,
        won: s.won,
        lootGold: s.gold,
        storePotionsUsed: Math.min(this.storePotions, s.potionsUsed),
      });
    });
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
        g.fillStyle(e.color, e.kind === "cleave" ? 0.45 : 0.28).fillCircle(e.x, e.y, e.radius * 0.55);
        break;
      case "nova":
      case "heal":
      case "storm":
        g.lineStyle(8, e.color, 0.9).strokeCircle(e.x, e.y, e.radius);
        g.fillStyle(e.color, 0.28).fillCircle(e.x, e.y, e.radius);
        if (e.kind === "storm") {
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            g.lineStyle(4, 0xffffff, 0.8).lineBetween(e.x, e.y, e.x + Math.cos(a) * e.radius, e.y + Math.sin(a) * e.radius);
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
      const key = heroTexture(this, f.state.heroId, f.state.branchId, f.state.gender);
      if (key !== v.key) {
        v.key = key;
        v.img.setTexture(key);
      }
      const bob = Math.hypot(f.vx, f.vy) > 20 ? Math.sin(t * 14 + f.x * 0.01) * 2.5 : 0;
      v.img.setPosition(f.x, f.y + bob).setDepth(f.y).setFlipX(f.faceX < -0.1);
      v.name.setPosition(f.x, f.y - 84).setDepth(5003);
    }
    for (const m of a.monsters) {
      const img = this.monsterViews.get(m.id);
      if (!img) continue;
      img.setVisible(m.alive);
      if (m.alive) img.setPosition(m.x, m.y).setDepth(m.y);
    }
    // thanh máu
    const b = this.bars;
    b.clear();
    for (const f of a.fighters) {
      if (!f.state.alive) continue;
      const w = 54;
      const x = f.x - w / 2;
      const y = f.y - 80;
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
    this.hazardText.setText(s.outsideSafeZone ? `⚠ NGOÀI BO · ${hz.nameVi.toUpperCase()}!` : "");
    const tint = HAZARD_TINT[s.activeHazard];
    this.hazardTint.setFillStyle(tint ? tint[0] : 0x000000, tint ? tint[1] + 0.05 * Math.sin(a.time * 4) : 0);
    this.vignette.setAlpha(s.outsideSafeZone ? Math.min(0.9, (1 - hz.vision) * 1.6) : 0);

    const hero = heroById(s.heroId);
    const br = hero?.branches.find((x) => x.id === s.branchId);
    this.portrait.setTexture(heroTexture(this, s.heroId, s.branchId, s.gender));
    this.infoText.setText(
      `${hero?.nameVi ?? ""}${br ? ` · ${br.name}` : " · chưa chọn nhánh"}  ·  🧪 ${p.potions}  ·  ⚔ ${s.kills}  ·  💰 ${p.gold}  ·  ${BIOME_NAME_VI[biomeAt(p.x, p.y)]}` +
        (Object.keys(p.equipped).length ? `\nTrang bị: ${Object.values(p.equipped).map((e) => e?.nameVi).join(", ")}` : ""),
    );
    const g = this.hudG;
    g.clear();
    // khung chân dung + thanh
    g.fillStyle(0x0b0f18, 0.75).fillRoundedRect(10, 594, 400, 116, 14);
    g.lineStyle(3, 0x8a6a3a, 1).strokeRoundedRect(10, 594, 400, 116, 14);
    g.fillStyle(0x1f2838, 1).fillRoundedRect(18, 602, 100, 100, 10);
    const bar = (y: number, ratio: number, color: number) => {
      g.fillStyle(0x05070c, 1).fillRoundedRect(130, y, 268, 14, 6);
      g.fillStyle(color, 1).fillRoundedRect(130, y, Math.max(0, 268 * Math.min(1, ratio)), 14, 6);
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
      gg.fillStyle(0x000000, 0.45).fillCircle(sb.x + 2, sb.y + 4, sb.r);
      gg.fillStyle(ready ? Phaser.Display.Color.IntegerToColor(color).darken(30).color : 0x2a2e36, 0.92).fillCircle(sb.x, sb.y, sb.r);
      if (ratio > 0) {
        gg.fillStyle(0x000000, 0.6);
        gg.slice(sb.x, sb.y, sb.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio, false);
        gg.fillPath();
      }
      gg.lineStyle(4, ready ? 0xd9b45a : 0x5a5f6a, 1).strokeCircle(sb.x, sb.y, sb.r);
      sb.label.setText(ratio > 0 && sb.slot !== "attack" && sb.slot !== "potion" ? `${Math.ceil(p.cd[sb.slot as SkillSlot])}s` : label);
      sb.label.setWordWrapWidth(sb.r * 1.9).setAlign("center").setAlpha(ready || ratio > 0 ? 1 : 0.55);
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
    g.fillStyle(0x0b0f18, 0.85).fillCircle(cx, cy, R + 12);
    g.lineStyle(4, 0x8a6a3a, 1).strokeCircle(cx, cy, R + 12);
    for (const s of BIOME_SECTORS) {
      g.fillStyle(BIOME_COLOR[s.biome], 0.95);
      g.slice(cx, cy, R, Phaser.Math.DegToRad(s.from), Phaser.Math.DegToRad(s.to), false);
      g.fillPath();
    }
    const z = a.zone;
    g.lineStyle(2, 0xc87aff, 1).strokeCircle(mx(z.centerX), my(z.centerY), Math.max(1, z.radius * k));
    if (z.phase === "wait") g.lineStyle(1.5, 0xffffff, 0.9).strokeCircle(mx(z.targetX), my(z.targetY), Math.max(1, z.targetRadius * k));
    for (const m of a.monsters) if (m.alive && m.def.isBoss) g.fillStyle(0xff8a2a, 1).fillCircle(mx(m.x), my(m.y), 3);
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

  // ------------------------------------------------------------------ chọn nhánh / thẻ
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
      c.add(text(this, W / 2, 40, "CẤP 5 – KHÓA NHÁNH CHUYÊN MÔN", 40, "#ffb347", 800).setOrigin(0.5, 0));
      c.add(text(this, W / 2, 96, "Chọn 1 nhánh cố định cho cả trận. Ngoại hình, kỹ năng và bị động sẽ đổi theo nhánh.", 20, "#e8e0d0", 500).setOrigin(0.5, 0));
      hero.branches.forEach((br, i) => {
        const x = 70 + i * 390;
        c.add(panel(this, x, 140, 360, 520));
        c.add(this.add.image(x + 180, 330, heroTexture(this, hero.id, br.id, s.gender)).setScale(2.2).setOrigin(0.5, 0.92));
        c.add(text(this, x + 180, 346, br.name, 30, hex(br.color)).setOrigin(0.5, 0));
        c.add(text(this, x + 180, 384, br.descVi, 17, "#e8e0d0", 500).setOrigin(0.5, 0).setWordWrapWidth(320).setAlign("center"));
        c.add(text(this, x + 24, 432, `Bị động: ${br.passive.nameVi}\nQ ${br.skills[0].nameVi} · E ${br.skills[1].nameVi}\nR ${br.skills[2].nameVi}\nF (cấp 10) ${br.ultimate.nameVi}`, 17, "#d8d0c0", 500).setWordWrapWidth(320));
        c.add(
          button(this, x + 180, 610, 260, 60, "Chọn nhánh", () => {
            if (a.chooseBranch(a.playerId, br.id)) {
              if (completeTutorialStep(getSave(), "lock_branch_at_lv5")) persist();
              this.note(`Đã khóa nhánh ${br.name}!`, hex(br.color));
            }
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
