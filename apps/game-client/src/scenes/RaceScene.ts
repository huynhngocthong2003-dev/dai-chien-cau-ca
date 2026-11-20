import Phaser from "phaser";
import { CHARACTERS, CHARACTER_BY_ID, FISHES, FISH_BY_ID, FORM_BY_ID } from "@dccc/game-data";
import { FISH_RARITY_COLOR, FISH_RARITY_LABEL } from "@dccc/game-config";
import {
  RACE,
  RACE_LEAGUES,
  RaceSession,
  Rng,
  makeRaceOpponents,
  newRacer,
  raceCandidates,
  raceReward,
  randomSeed,
  type Obstacle,
  type RaceEvent,
  type RaceLeague,
  type RaceStats,
  type Racer,
} from "@dccc/shared";
import { GameState } from "../state/GameState.ts";
import { canvasTexture, characterTexture, fishTextureFor } from "../art/textures.ts";
import { drawCurrent, drawFinish, drawRaceFar, drawRaceSky, drawRock, drawSeaweed } from "../art/RaceArt.ts";
import { TopBar } from "../ui/TopBar.ts";
import { Bar, Button, fadeIn, formatNum, goTo, modal, panel, toast, txt } from "../ui/widgets.ts";
import { COLORS } from "../ui/theme.ts";
import { extraX } from "../ui/wide.ts";
import { Sfx } from "../audio/Sfx.ts";

const ELEMENT_COLOR: Record<string, number> = {
  water: 0x40c4ff,
  fire: 0xff6d00,
  ice: 0xb3e5fc,
  earth: 0xa1887f,
  thunder: 0xffeb3b,
  light: 0xfff59d,
  dark: 0xd500f9,
};
const GRADE_COLOR: Record<RaceStats["grade"], string> = { S: "#ff4081", A: "#ffd740", B: "#69f0ae", C: "#40c4ff", D: "#b0bec5" };
const LANE_Y = [440, 530, 620];
const LANE_SCALE = [0.82, 0.92, 1.02];
const PX = 13; // pixel mỗi mét
const ME_X = 400;

interface RacerView {
  r: Racer;
  root: Phaser.GameObjects.Container;
  fish: Phaser.GameObjects.Image;
  rider: Phaser.GameObjects.Image;
  wake: Phaser.GameObjects.Ellipse;
  aura: Phaser.GameObjects.Ellipse;
  tag: Phaser.GameObjects.Text;
  color: number;
  y: number;
  ghostT: number;
}

/**
 * ĐUA CÁ: chọn giải + chọn cá → cưỡi cá đua 3 làn (đổi làn né rong/đá, ăn dòng xiết, TĂNG TỐC khi đầy năng lượng).
 * Điều khiển: nút ▲▼ / vuốt lên-xuống / phím ↑↓ W S; tăng tốc: nút TĂNG TỐC / Space / Shift.
 */
export class RaceScene extends Phaser.Scene {
  private league: RaceLeague = "tap_su";
  private fishUid: string | null = null;
  private mode: "select" | "countdown" | "race" | "result" = "select";
  private session: RaceSession | null = null;
  private entryTx: string | null = null;
  private views: RacerView[] = [];
  private obstacleImgs = new Map<number, Phaser.GameObjects.Image>();
  private far!: Phaser.GameObjects.TileSprite;
  private lanesG!: Phaser.GameObjects.Graphics;
  private speedG!: Phaser.GameObjects.Graphics;
  private finishImg!: Phaser.GameObjects.Image;
  private hud!: Phaser.GameObjects.Container;
  private progG!: Phaser.GameObjects.Graphics;
  private placeT!: Phaser.GameObjects.Text;
  private speedT!: Phaser.GameObjects.Text;
  private boostBtn!: Button;
  private energyBar!: Bar;
  private standT!: Phaser.GameObjects.Text;
  private selectC?: Phaser.GameObjects.Container;
  private swipeY: number | null = null;

  constructor() {
    super("Race");
  }

  init() {
    this.mode = "select";
    this.session = null;
    this.entryTx = null;
    this.views = [];
    this.obstacleImgs = new Map();
  }

  create() {
    this.input.enabled = true;
    fadeIn(this);
    this.add.image(0, 0, canvasTexture(this, "race_sky", 1280, 720, drawRaceSky)).setOrigin(0).setDepth(-20);
    const ex = extraX(this);
    this.far = this.add.tileSprite(-ex, 220, 1280 + 2 * ex, 150, canvasTexture(this, "race_far", 1280, 150, drawRaceFar)).setOrigin(0).setDepth(-15);
    this.lanesG = this.add.graphics().setDepth(-5);
    this.speedG = this.add.graphics().setDepth(900);
    this.finishImg = this.add.image(0, 300, canvasTexture(this, "race_finish", 160, 340, drawFinish)).setOrigin(0.5, 0).setDepth(380).setVisible(false);
    canvasTexture(this, "race_weed", 100, 104, drawSeaweed);
    canvasTexture(this, "race_rock", 110, 90, drawRock);
    canvasTexture(this, "race_current", 140, 52, drawCurrent);
    this.drawLanes(0);
    new TopBar(this, { title: "Đua Cá", onBack: () => (this.mode === "race" || this.mode === "countdown" ? this.confirmQuit() : goTo(this, "Hub")) });
    this.buildHud();
    this.setupInput();
    this.showSelect();
  }

  // ------------------------------------------------------------------ chọn giải & cá
  private showSelect() {
    this.mode = "select";
    this.hud.setVisible(false);
    this.selectC?.destroy();
    const c = this.add.container(0, 0).setDepth(1000);
    this.selectC = c;
    const s = GameState.save;
    c.add(panel(this, 20, 88, 400, 612, 0.9));
    c.add(txt(this, 220, 112, "🏁 Chọn giải đua", 24, { color: COLORS.textGold, align: "center" }).setOrigin(0.5));
    (Object.keys(RACE_LEAGUES) as RaceLeague[]).forEach((id, i) => {
      const L = RACE_LEAGUES[id];
      const locked = s.level < L.minLevel;
      const y = 200 + i * 150;
      const sel = id === this.league;
      const b = new Button(this, 220, y, 370, 136, "", {
        color: sel ? COLORS.orange : COLORS.panelLight,
        disabled: locked,
        onClick: () => {
          this.league = id;
          this.showSelect();
        },
      });
      if (locked) b.on("disabled-click", () => toast(this, `Cần cấp ${L.minLevel} để vào ${L.name}`, COLORS.red));
      c.add(b);
      c.add(txt(this, 220, y - 42, `${locked ? "🔒 " : ""}${L.name}`, 22, { align: "center" }).setOrigin(0.5));
      c.add(
        txt(this, 220, y + 8, `Phí: ${formatNum(L.fee)} vàng · Cần cấp ${L.minLevel}\nGiải: 🥇${formatNum(L.prizes[0])}${L.firstDiamonds ? `+💎${L.firstDiamonds}` : ""}  🥈${formatNum(L.prizes[1])}  🥉${formatNum(L.prizes[2])}`, 15, {
          align: "center",
          weight: "700",
        }).setOrigin(0.5),
      );
    });

    c.add(panel(this, 440, 88, 820, 612, 0.9));
    c.add(txt(this, 850, 112, "🐟 Chọn cá để cưỡi (mỗi con có chỉ số đua riêng)", 22, { color: COLORS.textGold, align: "center" }).setOrigin(0.5));
    const list = raceCandidates(s.fishes, FISH_BY_ID, FORM_BY_ID, 8);
    if (!list.length) {
      c.add(txt(this, 850, 380, "Kho cá trống – hãy đi câu vài con rồi quay lại đua nhé!", 20, { align: "center" }).setOrigin(0.5));
      c.add(new Button(this, 850, 450, 240, 60, "🎣 Đi câu", { color: COLORS.orange, fontSize: 22, onClick: () => goTo(this, "Zone") }));
      return;
    }
    if (!this.fishUid || !list.some((x) => x.fish.uid === this.fishUid)) this.fishUid = list[0]!.fish.uid;
    list.forEach(({ fish: o, stats }, i) => {
      const def = FISH_BY_ID.get(o.fishId)!;
      const x = 545 + (i % 4) * 202;
      const y = 210 + Math.floor(i / 4) * 160;
      const sel = o.uid === this.fishUid;
      const b = new Button(this, x, y, 190, 148, "", {
        color: sel ? COLORS.blue : COLORS.panelLight,
        onClick: () => {
          this.fishUid = o.uid;
          this.showSelect();
        },
      });
      c.add(b);
      c.add(this.add.image(x, y - 26, fishTextureFor(this, def, o.form ?? null)).setDisplaySize(120, 75));
      c.add(txt(this, x - 84, y - 66, stats.grade, 30, { color: GRADE_COLOR[stats.grade] }).setOrigin(0, 0.5));
      c.add(txt(this, x, y + 24, def.name, 15, { align: "center", color: FISH_RARITY_COLOR[def.rarity] }).setOrigin(0.5));
      c.add(txt(this, x, y + 48, `⚡${stats.speed}  🚀${stats.accel}  💪${stats.stamina}`, 13, { align: "center", weight: "700" }).setOrigin(0.5));
    });
    const pick = list.find((x) => x.fish.uid === this.fishUid)!;
    const def = FISH_BY_ID.get(pick.fish.fishId)!;
    const y0 = 540;
    c.add(txt(this, 470, y0, `${def.name} · ${FISH_RARITY_LABEL[def.rarity]} · Lv.${pick.fish.level} · ${pick.fish.weightKg.toFixed(1)}kg`, 18, { color: FISH_RARITY_COLOR[def.rarity] }));
    const bars: [string, number, number][] = [
      ["⚡ Tốc độ", pick.stats.speed, 130],
      ["🚀 Tăng tốc", pick.stats.accel, 90],
      ["💪 Thể lực", pick.stats.stamina, 120],
    ];
    bars.forEach(([label, v, max], i) => {
      const by = y0 + 40 + i * 34;
      c.add(txt(this, 470, by, label, 16, { weight: "700" }).setOrigin(0, 0.5));
      const bar = new Bar(this, 600, by - 11, 300, 22, [COLORS.red, COLORS.orange, COLORS.green][i]!, `${v}`);
      bar.set(Math.min(1, v / max));
      c.add(bar);
    });
    c.add(txt(this, 1130, y0 + 4, `Hạng ${pick.stats.grade}`, 28, { color: GRADE_COLOR[pick.stats.grade], align: "center" }).setOrigin(0.5, 0));
    const L = RACE_LEAGUES[this.league];
    c.add(
      new Button(this, 1130, y0 + 100, 220, 76, "XUẤT PHÁT", {
        color: COLORS.green,
        fontSize: 28,
        sub: `${L.name} · ${formatNum(L.fee)} vàng`,
        onClick: () => this.start(),
      }),
    );
  }

  private start() {
    const s = GameState.save;
    const own = s.fishes.find((f) => f.uid === this.fishUid);
    if (!own) return toast(this, "Hãy chọn một con cá", COLORS.red);
    const entry = GameState.raceEntry(this.league, own.uid);
    if (!entry.ok) return toast(this, entry.error, COLORS.red);
    this.entryTx = entry.entryTx;
    const def = FISH_BY_ID.get(own.fishId)!;
    const stats = raceCandidates([own], FISH_BY_ID, FORM_BY_ID, 1)[0]!.stats;
    const seed = randomSeed();
    const rng = new Rng(seed);
    const me = newRacer("me", s.name, def.id, own.form ?? null, s.selectedCharacterId, stats, null);
    const opp = makeRaceOpponents(this.league, FISHES, CHARACTERS.map((c) => c.id), rng, 4);
    this.session = new RaceSession(me, opp, rng.int(1, 2 ** 31));
    this.selectC?.destroy();
    this.selectC = undefined;
    this.buildRacers();
    this.hud.setVisible(true);
    this.countdown();
  }

  // ------------------------------------------------------------------ dựng đường đua
  private buildRacers() {
    for (const v of this.views) v.root.destroy();
    this.views = [];
    for (const img of this.obstacleImgs.values()) img.destroy();
    this.obstacleImgs.clear();
    const s = this.session!;
    for (const r of s.racers) {
      const def = FISH_BY_ID.get(r.fishId)!;
      const root = this.add.container(0, 0);
      const color = ELEMENT_COLOR[def.element] ?? 0x40c4ff;
      const aura = this.add.ellipse(0, 6, 210, 70, color, 0).setBlendMode(Phaser.BlendModes.ADD);
      const wake = this.add.ellipse(-70, 12, 120, 22, 0xffffff, 0.55);
      const fish = this.add.image(0, 0, fishTextureFor(this, def, r.formId)).setDisplaySize(170, 106);
      const ch = CHARACTER_BY_ID.get(r.charId) ?? CHARACTER_BY_ID.get("c_be_tom")!;
      const rider = this.add
        .image(-6, -22, characterTexture(this, ch, r.id === "me" ? GameState.equipOf(ch.id) : {}))
        .setOrigin(0.5, 1)
        .setScale(0.4);
      const tag = txt(this, 0, -130, r.id === "me" ? "⭐ BẠN" : r.name, r.id === "me" ? 18 : 14, { align: "center", color: r.id === "me" ? "#ffeb3b" : "#ffffff" }).setOrigin(0.5);
      root.add([aura, wake, fish, rider, tag]);
      this.views.push({ r, root, fish, rider, wake, aura, tag, color, y: LANE_Y[r.lane]!, ghostT: 0 });
    }
  }

  private drawLanes(scroll: number) {
    const g = this.lanesG;
    g.clear();
    const ex = extraX(this);
    // vệt sóng chạy ngược để tạo cảm giác tốc độ
    for (let l = 0; l < 4; l++) {
      const y = 395 + l * 90;
      g.lineStyle(4, 0xffffff, 0.35);
      for (let x = -ex - ((scroll * PX) % 80); x < 1280 + ex; x += 80) g.lineBetween(x, y, x + 44, y);
    }
    g.fillStyle(0xffffff, 0.12);
    for (let i = 0; i < 26; i++) {
      const x = ((i * 157 - scroll * PX * 1.3) % (1280 + 2 * ex)) + (1280 + 2 * ex);
      g.fillEllipse((x % (1280 + 2 * ex)) - ex, 360 + ((i * 53) % 340), 40, 6);
    }
  }

  // ------------------------------------------------------------------ HUD
  private buildHud() {
    const c = this.add.container(0, 0).setDepth(1000);
    this.hud = c;
    const g = this.add.graphics();
    g.fillStyle(0x071a33, 0.78).fillRoundedRect(300, 86, 680, 58, 16);
    g.lineStyle(3, COLORS.outline).strokeRoundedRect(300, 86, 680, 58, 16);
    c.add(g);
    this.progG = this.add.graphics();
    c.add(this.progG);
    this.placeT = txt(this, 30, 96, "", 34, { color: "#ffeb3b" });
    this.speedT = txt(this, 30, 140, "", 20, { weight: "700" });
    this.standT = txt(this, 1250, 96, "", 15, { weight: "700", align: "right" }).setOrigin(1, 0);
    c.add([this.placeT, this.speedT, this.standT]);
    const up = new Button(this, 80, 470, 110, 90, "▲", { color: COLORS.blue, fontSize: 40, onClick: () => this.lane(-1) });
    const down = new Button(this, 80, 600, 110, 90, "▼", { color: COLORS.blue, fontSize: 40, onClick: () => this.lane(1) });
    this.boostBtn = new Button(this, 1150, 610, 210, 120, "TĂNG TỐC", { color: COLORS.purple, fontSize: 30, sub: "Space", onClick: () => this.doBoost() });
    this.energyBar = new Bar(this, 1050, 532, 200, 18, COLORS.purple, "");
    c.add([up, down, this.boostBtn, this.energyBar]);
  }

  private setupInput() {
    const kb = this.input.keyboard;
    kb?.on("keydown-UP", () => this.lane(-1));
    kb?.on("keydown-W", () => this.lane(-1));
    kb?.on("keydown-DOWN", () => this.lane(1));
    kb?.on("keydown-S", () => this.lane(1));
    kb?.on("keydown-SPACE", (e: KeyboardEvent) => {
      e.preventDefault();
      this.doBoost();
    });
    kb?.on("keydown-SHIFT", () => this.doBoost());
    // vuốt lên/xuống trên mặt nước để đổi làn
    this.input.on("pointerdown", (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      Sfx.unlock();
      this.swipeY = over.length ? null : p.y;
    });
    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      if (this.swipeY === null) return;
      const dy = p.y - this.swipeY;
      this.swipeY = null;
      if (Math.abs(dy) > 40) this.lane(dy < 0 ? -1 : 1);
    });
  }

  private lane(dir: -1 | 1) {
    if (this.mode !== "race" || !this.session) return;
    if (this.session.changeLane("me", dir)) Sfx.cast();
  }

  private doBoost() {
    if (this.mode !== "race" || !this.session) return;
    if (!this.session.boost("me")) {
      if (this.session.player.energy < 100) toast(this, "Năng lượng chưa đầy!");
    }
  }

  private countdown() {
    this.mode = "countdown";
    this.layoutRace();
    const steps = ["3", "2", "1", "XUẤT PHÁT!"];
    steps.forEach((s, i) => {
      this.time.delayedCall(i * 800, () => {
        const t = txt(this, 640, 300, s, i === 3 ? 80 : 120, { color: i === 3 ? "#69f0ae" : "#ffeb3b", align: "center" }).setOrigin(0.5).setDepth(1500);
        t.setScale(2).setAlpha(0);
        this.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 250, ease: "Back.easeOut" });
        this.tweens.add({ targets: t, alpha: 0, delay: 550, duration: 250, onComplete: () => t.destroy() });
        if (i < 3) Sfx.bite();
        else {
          Sfx.hook();
          this.mode = "race";
        }
      });
    });
  }

  // ------------------------------------------------------------------ vòng lặp
  override update(_t: number, dtRaw: number) {
    const s = this.session;
    if (!s) return;
    const dt = Math.min(100, dtRaw);
    if (this.mode === "race") {
      s.update(dt);
      for (const e of s.drainEvents()) this.onEvent(e);
      if (s.over) this.finish();
    }
    this.layoutRace(dt);
  }

  private layoutRace(dt = 0) {
    const s = this.session!;
    const me = s.player;
    const cam = me.x;
    this.far.tilePositionX = cam * PX * 0.15;
    this.drawLanes(cam);
    const ex = extraX(this);
    const sx = (x: number) => ME_X + (x - cam) * PX;
    // chướng ngại trong tầm nhìn
    for (const o of s.track) {
      const x = sx(o.x);
      const visible = x > -ex - 150 && x < 1280 + ex + 150;
      let img = this.obstacleImgs.get(o.id);
      if (!visible) {
        if (img) {
          img.destroy();
          this.obstacleImgs.delete(o.id);
        }
        continue;
      }
      if (!img) {
        img = this.makeObstacle(o);
        this.obstacleImgs.set(o.id, img);
      }
      img.setX(x);
      if (o.kind === "seaweed") img.setAngle(Math.sin((this.time.now + o.id * 300) / 300) * 4);
      if (o.kind === "current") img.setAlpha(0.6 + Math.sin(this.time.now / 150 + o.id) * 0.3);
    }
    const fx = sx(RACE.length);
    this.finishImg.setVisible(fx < 1280 + ex + 200).setX(fx);
    // người đua
    for (const v of this.views) {
      const r = v.r;
      const targetY = LANE_Y[r.lane]!;
      v.y += (targetY - v.y) * Math.min(1, dt / 90);
      const boosting = s.time < r.boostUntil;
      const slowed = s.time < r.slowUntil;
      const k = LANE_SCALE[r.lane]!;
      const bob = Math.sin((this.time.now + v.r.id.length * 200) / (boosting ? 60 : 140)) * (boosting ? 5 : 3);
      v.root.setPosition(sx(r.x), v.y + bob).setScale(k).setDepth(v.y + (r.id === "me" ? 0.5 : 0));
      v.fish.setAngle(Math.sin(this.time.now / (boosting ? 50 : 120)) * (slowed ? 10 : 4));
      v.rider.setAngle(boosting ? -8 : slowed ? 10 : -2);
      v.wake.setScale(0.6 + Math.min(1.6, r.v / 18), 1).setAlpha(slowed ? 0.2 : 0.55);
      v.aura.setAlpha(boosting ? 0.45 + Math.sin(this.time.now / 60) * 0.15 : 0);
      v.fish.setTint(slowed ? 0x9e9e9e : 0xffffff);
      // vệt bóng mờ khi tăng tốc
      if (boosting && dt) {
        v.ghostT += dt;
        if (v.ghostT > 55) {
          v.ghostT = 0;
          this.ghost(v);
        }
      }
    }
    // hiệu ứng tốc độ màn hình khi MÌNH tăng tốc
    this.speedG.clear();
    if (s.time < me.boostUntil) {
      this.speedG.lineStyle(3, 0xffffff, 0.6);
      for (let i = 0; i < 18; i++) {
        const y = 90 + ((i * 97 + this.time.now * 0.9) % 620);
        const x = 1280 + ex - ((this.time.now * 2.4 + i * 211) % (1280 + 2 * ex + 300));
        this.speedG.lineBetween(x, y, x + 140 + (i % 3) * 60, y);
      }
    }
    this.drawHud();
  }

  private makeObstacle(o: Obstacle) {
    const y = LANE_Y[o.lane]!;
    const k = LANE_SCALE[o.lane]!;
    if (o.kind === "seaweed") return this.add.image(0, y + 24, "race_weed").setOrigin(0.5, 0.92).setScale(k).setDepth(y - 1);
    if (o.kind === "rock") return this.add.image(0, y + 26, "race_rock").setOrigin(0.5, 0.9).setScale(k).setDepth(y - 1);
    return this.add.image(0, y + 18, "race_current").setScale(k).setDepth(y - 30);
  }

  private ghost(v: RacerView) {
    const g = this.add.image(v.root.x, v.root.y, v.fish.texture.key).setDisplaySize(v.fish.displayWidth * v.root.scale, v.fish.displayHeight * v.root.scale);
    g.setTint(v.color).setAlpha(0.55).setBlendMode(Phaser.BlendModes.ADD).setDepth(v.root.depth - 1);
    this.tweens.add({ targets: g, x: g.x - 90, alpha: 0, duration: 380, onComplete: () => g.destroy() });
    const d = this.add.circle(v.root.x - 80 * v.root.scale, v.root.y + 10, Phaser.Math.Between(4, 9), v.color, 0.9).setDepth(v.root.depth - 1).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: d, x: d.x - Phaser.Math.Between(60, 140), y: d.y + Phaser.Math.Between(-30, 30), alpha: 0, scale: 0.2, duration: 450, onComplete: () => d.destroy() });
  }

  private drawHud() {
    const s = this.session!;
    const me = s.player;
    const g = this.progG;
    g.clear();
    g.fillStyle(0x0a1628, 1).fillRoundedRect(320, 106, 640, 18, 9);
    for (const r of s.racers) {
      const x = 320 + Math.min(1, Math.max(0, r.x / RACE.length)) * 640;
      const mine = r.id === "me";
      g.fillStyle(mine ? 0xffeb3b : 0xffffff, 1).fillCircle(x, 115, mine ? 11 : 7);
      g.lineStyle(2, 0x1b1530).strokeCircle(x, 115, mine ? 11 : 7);
    }
    g.fillStyle(0xffffff, 1).fillRect(958, 100, 4, 30);
    const place = s.placeOf("me");
    this.placeT.setText(`Hạng ${place}/${s.racers.length}`);
    this.speedT.setText(`${Math.round(me.v * 3.6)} km/h · ${Math.max(0, Math.round(RACE.length - me.x))}m`);
    this.energyBar.set(me.energy / 100, me.energy >= 100 ? COLORS.gold : COLORS.purple);
    const ready = s.canBoost(me);
    this.boostBtn.setDisabled(!ready);
    if (ready && !this.boostBtn.getData("pulse")) {
      this.boostBtn.setData("pulse", true);
      this.tweens.add({ targets: this.boostBtn, scale: 1.08, duration: 300, yoyo: true, repeat: -1 });
    } else if (!ready && this.boostBtn.getData("pulse")) {
      this.boostBtn.setData("pulse", false);
      this.tweens.killTweensOf(this.boostBtn);
      this.boostBtn.setScale(1);
    }
    this.standT.setText(
      s
        .standings()
        .slice(0, 5)
        .map((r, i) => `${i + 1}. ${r.id === "me" ? "⭐ BẠN" : r.name}`)
        .join("\n"),
    );
  }

  // ------------------------------------------------------------------ sự kiện
  private onEvent(e: RaceEvent) {
    const v = this.views.find((x) => x.r.id === e.racer);
    if (!v) return;
    const mine = e.racer === "me";
    switch (e.type) {
      case "boost": {
        this.splash(v, 22, v.color);
        if (mine) {
          Sfx.skill();
          const c = v.color;
          this.cameras.main.flash(220, (c >> 16) & 255, (c >> 8) & 255, c & 255);
          this.cameras.main.shake(260, 0.006);
          this.tweens.add({ targets: this.cameras.main, zoom: 1.06, duration: 180, yoyo: true, hold: 900, ease: "Sine.easeOut" });
          this.bigText("TĂNG TỐC!!", "#ffeb3b");
          // vòng sóng xung kích
          const ring = this.add.circle(v.root.x, v.root.y, 30, c, 0).setStrokeStyle(8, c, 0.9).setDepth(950);
          this.tweens.add({ targets: ring, scale: 6, alpha: 0, duration: 600, onComplete: () => ring.destroy() });
        } else this.floatText(v, "🔥 Tăng tốc!", "#ffab40");
        break;
      }
      case "hit":
        this.splash(v, 14, 0xffffff);
        if (mine) {
          Sfx.fail();
          this.cameras.main.shake(220, e.kind === "rock" ? 0.012 : 0.006);
          this.floatText(v, e.kind === "rock" ? "💥 Đâm đá!" : "🌿 Vướng rong!", "#ff8a80");
        }
        break;
      case "smash":
        this.splash(v, 18, 0x66bb6a);
        if (mine) this.floatText(v, "Xé toạc rong biển! 💪", "#b9f6ca");
        break;
      case "pad":
        if (mine) {
          Sfx.crit();
          this.floatText(v, "🌊 Dòng xiết!", "#80d8ff");
        }
        break;
      case "energy_full":
        if (mine) toast(this, "⚡ Năng lượng đầy – bấm TĂNG TỐC!", COLORS.purple);
        break;
      case "finish":
        if (mine) {
          Sfx.catchFanfare(e.place === 1);
          this.bigText(e.place === 1 ? "🥇 VỀ NHẤT!" : `VỀ ĐÍCH HẠNG ${e.place}`, e.place === 1 ? "#ffd740" : "#ffffff");
          this.cameras.main.flash(300, 255, 255, 255);
        }
        break;
    }
  }

  private splash(v: RacerView, n: number, color: number) {
    for (let i = 0; i < n; i++) {
      const d = this.add.circle(v.root.x + Phaser.Math.Between(-40, 40), v.root.y + 10, Phaser.Math.Between(3, 7), color, 0.9).setDepth(v.root.depth + 1);
      this.tweens.add({
        targets: d,
        x: d.x + Phaser.Math.Between(-80, 30),
        y: d.y - Phaser.Math.Between(30, 110),
        alpha: 0,
        duration: Phaser.Math.Between(350, 650),
        ease: "Quad.easeOut",
        onComplete: () => d.destroy(),
      });
    }
  }

  private floatText(v: RacerView, s: string, color: string) {
    const t = txt(this, v.root.x, v.root.y - 150, s, 22, { color, align: "center" }).setOrigin(0.5).setDepth(1200);
    this.tweens.add({ targets: t, y: t.y - 50, alpha: 0, duration: 1100, onComplete: () => t.destroy() });
  }

  private bigText(s: string, color: string) {
    const t = txt(this, 640, 250, s, 72, { color, align: "center" }).setOrigin(0.5).setDepth(1500).setScale(0.3);
    this.tweens.add({ targets: t, scale: 1, duration: 260, ease: "Back.easeOut" });
    this.tweens.add({ targets: t, alpha: 0, delay: 900, duration: 400, onComplete: () => t.destroy() });
  }

  // ------------------------------------------------------------------ kết quả
  private finish() {
    if (this.mode !== "race" || !this.session || !this.entryTx) return;
    this.mode = "result";
    const s = this.session;
    const place = s.placeOf("me");
    const res = GameState.raceResult(this.entryTx, this.league, place);
    const reward = res.ok ? res.reward! : raceReward(this.league, place);
    this.time.delayedCall(600, () => {
      const m = modal(this, 760, 560, place === 1 ? "🏆 VÔ ĐỊCH!" : `🏁 Về đích hạng ${place}`, () => this.showSelect());
      s.standings().forEach((r, i) => {
        const y = m.y + 100 + i * 52;
        const mine = r.id === "me";
        const def = FISH_BY_ID.get(r.fishId)!;
        const g = this.add.graphics();
        g.fillStyle(mine ? 0x1e4d7a : 0x0a1628, 0.95).fillRoundedRect(m.x + 30, y - 22, m.w - 60, 46, 10);
        m.root.add(g);
        m.root.add(this.add.image(m.x + 110, y, fishTextureFor(this, def, r.formId)).setDisplaySize(64, 40));
        m.root.add(txt(this, m.x + 50, y, ["🥇", "🥈", "🥉", "4", "5"][i] ?? String(i + 1), 22).setOrigin(0.5));
        m.root.add(txt(this, m.x + 160, y, `${mine ? "⭐ BẠN" : r.name} · ${def.name} (${r.stats.grade})`, 17, { color: mine ? "#ffeb3b" : "#ffffff" }).setOrigin(0, 0.5));
        m.root.add(
          txt(this, m.x + m.w - 50, y, r.finishTime !== null ? `${(r.finishTime / 1000).toFixed(2)}s` : `còn ${Math.round(RACE.length - r.x)}m`, 16, { weight: "700" }).setOrigin(1, 0.5),
        );
      });
      const line = `Thưởng: ${reward.gold ? `🪙${formatNum(reward.gold)} ` : ""}${reward.diamonds ? `💎${reward.diamonds} ` : ""}✨${reward.xp} KN`;
      m.root.add(txt(this, 640, m.y + m.h - 112, res.ok ? line : `⚠ ${res.error}`, 22, { color: COLORS.textGold, align: "center" }).setOrigin(0.5));
      m.root.add(new Button(this, 520, m.y + m.h - 50, 220, 60, "🔁 Đua tiếp", { color: COLORS.green, fontSize: 22, onClick: () => m.close() }));
      m.root.add(new Button(this, 760, m.y + m.h - 50, 200, 60, "Về sảnh", { color: COLORS.blue, fontSize: 22, onClick: () => goTo(this, "Hub") }));
    });
  }

  private confirmQuit() {
    const m = modal(this, 560, 280, "Bỏ cuộc?");
    m.root.add(txt(this, 640, m.y + 120, "Bỏ dở cuộc đua sẽ mất phí vào cửa.", 20, { align: "center" }).setOrigin(0.5));
    m.root.add(new Button(this, 540, m.y + 210, 180, 56, "Bỏ cuộc", { color: COLORS.red, fontSize: 20, onClick: () => goTo(this, "Hub") }));
    m.root.add(new Button(this, 740, m.y + 210, 180, 56, "Đua tiếp", { color: COLORS.green, fontSize: 20, onClick: () => m.close() }));
  }
}

