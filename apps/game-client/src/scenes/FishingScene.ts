import Phaser from "phaser";
import { extraX, screenRect } from "../ui/wide.ts";
import { FISHING, FISH_RARITY_COLOR, FISH_RARITY_LABEL } from "@dccc/game-config";
import { CHARACTER_BY_ID, ECO_MESSAGE, FISH_BY_ID, EVO_ITEMS, JUNK, ROD_BY_ID, ZONES, ZONE_BY_ID } from "@dccc/game-data";
import {
  FishingSession,
  FIGHT_STYLE_INFO,
  CAST_EVENT_INFO,
  applyCastEvent,
  castEventWeightMul,
  rollCastEvent,
  type CastEventKind,
  Rng,
  chooseFish,
  huntBoss,
  pickZoneBoss,
  junkAsFish,
  randomSeed,
  rollJunk,
  rollEvoDrop,
  autoFishActive,
  type EvoItemDef,
  type JunkDef,
  rollWeight,
  catchRewards,
  fishPower,
  type FishDef,
  type FishingEvent,
  type Loadout,
  type ZoneDef,
} from "@dccc/shared";
import { GameState } from "../state/GameState.ts";
import { auraTexture, characterTexture, dockTexture, fishTexture, junkTexture, ornamentTexture, reelTexture, zoneTexture } from "../art/textures.ts";
import { playSkillFx, speechBubble } from "../ui/skillFx.ts";
import { CATCH_LINES, hookPool, pickLine } from "../ui/quotes.ts";
import { HORIZON } from "../art/Backgrounds.ts";
import { addAmbience } from "../art/ambience.ts";
import { addFashionFx } from "../art/fashionFx.ts";
import { hexToInt, parseHex } from "../art/color.ts";
import { Bar, Button, fadeIn, formatNum, goTo, panel, toast, txt } from "../ui/widgets.ts";
import { COLORS } from "../ui/theme.ts";
import { Sfx } from "../audio/Sfx.ts";

type Mode = "idle" | "charging" | "flying" | "fishing" | "landing" | "result";

const HAND = { x: 228, y: 318 };
const ROD_LEN = 230;

export class FishingScene extends Phaser.Scene {
  private zone!: ZoneDef;
  private bossHunt = false;
  private huntLabel?: Phaser.GameObjects.Text;
  private loadout!: Loadout;
  private mode: Mode = "idle";
  private session: FishingSession | null = null;
  private fishDef: FishDef | null = null;
  /** Rác vớt nhầm (nếu lần này không phải cá). */
  private junk: JunkDef | null = null;
  private weightKg = 0;
  /** Sự kiện quăng cần đang diễn ra (đàn cá quý / mùa cá lớn). */
  private castEvent: CastEventKind | null = null;
  private castEventLeft = 0;
  private eventLabel?: Phaser.GameObjects.Text;
  private comboT?: Phaser.GameObjects.Text;

  // hiển thị
  private water!: Phaser.GameObjects.Graphics;
  private rodG!: Phaser.GameObjects.Graphics;
  private rodOrn!: Phaser.GameObjects.Image;
  private rodReel!: Phaser.GameObjects.Image;
  private rodFx?: Phaser.GameObjects.Particles.ParticleEmitter;
  private rodSmoke?: Phaser.GameObjects.Particles.ParticleEmitter;
  private bobber!: Phaser.GameObjects.Image;
  private fishImg!: Phaser.GameObjects.Image;
  private hero!: Phaser.GameObjects.Image;
  private aura!: Phaser.GameObjects.Image;
  private hint!: Phaser.GameObjects.Text;
  private powerBar!: Bar;
  private alertT!: Phaser.GameObjects.Text;
  private hud!: Phaser.GameObjects.Container;
  private hpBar!: Bar;
  private distBar!: Bar;
  private durBar!: Bar;
  private tensionG!: Phaser.GameObjects.Graphics;
  private fishNameT!: Phaser.GameObjects.Text;
  private reelBtn!: Button;
  private skillBtn!: Button;
  private skillCd!: Phaser.GameObjects.Graphics;
  private resultC?: Phaser.GameObjects.Container;

  private t = 0;
  private power = 0;
  private powerDir = 1;
  private castX = 700;
  private bobberY = HORIZON;
  private fishX = 900;
  private fishY = HORIZON + 100;
  private jumping = false;
  private reelHeld = false;
  private keyHeld = false;
  /** Câu tự động (gói nạp 48 giờ). */
  private auto = false;
  private autoT = 0;
  private autoPower = 0.7;
  private autoBtn?: Button;
  private nibbleAt = 0;
  private lineSnapped = false;
  private shakeT = 0;

  constructor() {
    super("Fishing");
  }

  init(data: { zoneId?: string; bossHunt?: boolean }) {
    this.zone = ZONE_BY_ID.get(data.zoneId ?? GameState.save.selectedZoneId)!;
    this.bossHunt = !!data.bossHunt;
    this.mode = "idle";
    this.session = null;
    this.fishDef = null;
    this.jumping = false;
    this.lineSnapped = false;
    this.reelHeld = false;
    this.keyHeld = false;
  }

  create() {
    this.input.enabled = true;
    fadeIn(this);
    this.loadout = GameState.loadout();
    const s = GameState.save;
    const char = CHARACTER_BY_ID.get(s.selectedCharacterId)!;

    this.add.image(0, 0, zoneTexture(this, this.zone)).setOrigin(0);
    this.fishImg = this.add.image(900, HORIZON + 100, "__DEFAULT").setVisible(false).setDepth(1);
    this.water = this.add.graphics().setDepth(2);
    addAmbience(this, this.zone);
    this.addWeather();
    const dock = this.add.image(0, HORIZON - 42, dockTexture(this, Math.max(0, ZONES.findIndex((z) => z.id === this.zone.id)))).setOrigin(0).setDepth(3);
    // màn hình rộng: nối dài bệ sang trái (lật gương) để bệ liền với bờ
    if (extraX(this) > 0) this.add.image(0, dock.y, dock.texture.key).setOrigin(1, 0).setFlipX(true).setDepth(dock.depth);
    const awakened = !!GameState.save.characters[char.id]?.awakened;
    this.aura = this.add.image(190, 388, auraTexture(this, char)).setOrigin(0.5, 1).setScale(1.1).setAlpha(awakened ? 0.45 : 0).setDepth(3);
    if (awakened) this.tweens.add({ targets: this.aura, alpha: 0.2, scale: 1.2, duration: 900, yoyo: true, repeat: -1 });
    this.hero = this.add.image(190, 388, characterTexture(this, char, GameState.equipOf(char.id))).setOrigin(0.5, 1).setScale(0.95).setDepth(4);
    addFashionFx(this, this.hero, 190, 263, 0.95, GameState.equipOf(char.id), 4);
    this.tweens.add({ targets: this.hero, scaleY: 0.97, duration: 1100, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.rodG = this.add.graphics().setDepth(5);
    const rodDef = ROD_BY_ID.get(GameState.save.selectedRodId)!;
    this.rodReel = this.add.image(HAND.x + 6, HAND.y + 12, reelTexture(this, rodDef)).setDepth(6).setScale(0.9);
    this.rodOrn = this.add.image(0, 0, ornamentTexture(this, rodDef)).setOrigin(0.5, 58 / 80).setDepth(6).setVisible(rodDef.visual.ornament !== "none");
    if (rodDef.visual.glow) {
      this.rodFx = this.add
        .particles(0, 0, "p_spark", {
          speed: { min: 10, max: 50 },
          lifespan: 800,
          frequency: 90,
          scale: { start: 0.55, end: 0 },
          tint: hexToInt(rodDef.visual.glow),
          blendMode: Phaser.BlendModes.ADD,
        })
        .setDepth(6);
      this.tweens.add({ targets: this.rodOrn, scale: 1.12, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
    if (rodDef.visual.veins) {
      // khói đen + tàn lửa đỏ bay ra từ đầu cần siêu cấp
      this.rodSmoke = this.add
        .particles(0, 0, "p_ember", {
          speed: { min: 20, max: 80 },
          angle: { min: 200, max: 340 },
          lifespan: 1100,
          frequency: 45,
          scale: { start: 1.6, end: 0 },
          tint: [0xff1744, 0xb71c1c, 0x111111],
          blendMode: Phaser.BlendModes.NORMAL,
        })
        .setDepth(6);
    }
    this.bobber = this.add.image(0, 0, "bobber").setOrigin(0.5, 0.6).setVisible(false).setDepth(4);

    // UI cố định
    const top = this.add.graphics();
    top.fillStyle(0x071a33, 0.7).fillRoundedRect(8, 8, 420, 60, 16);
    new Button(this, 60, 38, 92, 46, "← Về", { color: COLORS.blue, fontSize: 20, onClick: () => this.leave() });
    txt(this, 116, 38, this.zone.name, 24, { color: COLORS.textGold }).setOrigin(0, 0.5);
    const rod = ROD_BY_ID.get(s.selectedRodId)!;
    txt(this, 16, 80, `${char.name} · ${rod.name}`, 16, { weight: "700", color: COLORS.textDim });
    this.huntLabel = txt(this, 16, 104, "", 18, { color: "#ff8a80" });
    this.refreshHuntLabel();

    this.hint = txt(this, 640, 640, "", 30, { align: "center" }).setOrigin(0.5).setDepth(50);
    this.eventLabel = txt(this, 16, 132, "", 18, { color: "#ffe082" }).setDepth(50);
    this.castEvent = null;
    this.castEventLeft = 0;
    this.alertT = txt(this, 640, 220, "", 56, { align: "center", stroke: 10 }).setOrigin(0.5).setDepth(60).setAlpha(0);
    this.powerBar = new Bar(this, 140, 250, 160, 24, COLORS.orange, "Lực quăng").setVisible(false).setDepth(50);

    this.buildHud();
    this.setupInput();
    this.toIdle();
    this.auto = false;
    this.autoBtn = new Button(this, 540, 38, 200, 46, "", { color: COLORS.purple, fontSize: 18, onClick: () => this.toggleAuto() }).setDepth(45);
    this.refreshAutoBtn();

    const onLevel = (lvl: number) => {
      Sfx.levelUp();
      this.flashAlert(`LÊN CẤP ${lvl}!`, "#ffd54f");
    };
    GameState.on("level-up", onLevel);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      GameState.off("level-up", onLevel);
      Sfx.setReeling(false);
    });
  }

  // ---------------------------------------------------------------- HUD
  private buildHud() {
    const c = this.add.container(0, 0).setDepth(40);
    this.hud = c;
    const g = this.add.graphics();
    g.fillStyle(0x071a33, 0.78).fillRoundedRect(400, 10, 560, 112, 18);
    g.lineStyle(3, COLORS.outline).strokeRoundedRect(400, 10, 560, 112, 18);
    c.add(g);
    this.fishNameT = txt(this, 680, 34, "", 26, { align: "center" }).setOrigin(0.5);
    this.hpBar = new Bar(this, 420, 56, 520, 26, COLORS.red, "");
    this.distBar = new Bar(this, 420, 90, 520, 20, COLORS.blue, "");
    c.add([this.fishNameT, this.hpBar, this.distBar]);
    this.comboT = txt(this, 680, 146, "", 30, { align: "center", color: "#ffd740" }).setOrigin(0.5);
    c.add(this.comboT);

    // đồng hồ lực căng (dọc, bên phải)
    const gx = 1200;
    const tg = this.add.graphics();
    tg.fillStyle(0x071a33, 0.8).fillRoundedRect(gx - 36, 140, 92, 330, 18);
    tg.lineStyle(3, COLORS.outline).strokeRoundedRect(gx - 36, 140, 92, 330, 18);
    c.add(tg);
    c.add(txt(this, gx + 10, 160, "Lực căng", 17, { align: "center" }).setOrigin(0.5));
    this.tensionG = this.add.graphics();
    c.add(this.tensionG);
    c.add(txt(this, gx + 10, 482, "Độ bền dây", 15, { align: "center" }).setOrigin(0.5));
    this.durBar = new Bar(this, gx - 34, 496, 88, 18, COLORS.green, "");
    c.add(this.durBar);

    // nút kỹ năng + kéo
    const skill = this.loadout.active;
    this.skillBtn = new Button(this, 1010, 640, 200, 84, skill.name, {
      color: COLORS.purple,
      fontSize: 24,
      sub: "Kỹ năng (Q)",
      onClick: () => this.useSkill(),
    });
    this.skillCd = this.add.graphics();
    this.reelBtn = new Button(this, 1170, 620, 190, 130, "KÉO", { color: COLORS.orange, fontSize: 40, sub: "Giữ (Space)" });
    this.reelBtn.removeAllListeners("pointerup");
    this.reelBtn.on("pointerdown", () => this.onReelDown());
    this.reelBtn.on("pointerup", () => (this.reelHeld = false));
    this.reelBtn.on("pointerout", () => (this.reelHeld = false));
    c.add([this.skillBtn, this.skillCd, this.reelBtn]);
    c.setVisible(false);
  }

  private setupInput() {
    this.input.on("pointerdown", (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      Sfx.unlock();
      if (over.length > 0) return; // bấm vào nút UI
      if (p.y < 130) return;
      this.onPrimaryDown();
    });
    this.input.on("pointerup", () => this.onPrimaryUp());
    const kb = this.input.keyboard;
    kb?.on("keydown-SPACE", (e: KeyboardEvent) => {
      e.preventDefault();
      if (this.keyHeld) return;
      this.keyHeld = true;
      Sfx.unlock();
      this.onPrimaryDown();
    });
    kb?.on("keyup-SPACE", () => {
      this.keyHeld = false;
      this.onPrimaryUp();
    });
    kb?.on("keydown-Q", () => this.useSkill());
    kb?.on("keydown-E", () => this.useSkill());
    kb?.on("keydown-ESC", () => this.leave());
  }

  private onReelDown() {
    Sfx.unlock();
    this.onPrimaryDown();
  }

  private onPrimaryDown() {
    if (this.mode === "idle") {
      this.mode = "charging";
      this.power = 0;
      this.powerDir = 1;
      this.powerBar.setVisible(true);
      this.hint.setText("Thả ra để quăng cần!");
    } else if (this.mode === "fishing" && this.session) {
      const ph = this.session.phase;
      if (ph === "waiting" || ph === "bite") this.session.hook();
      else if (ph === "reeling") this.reelHeld = true;
    }
  }

  private onPrimaryUp() {
    this.reelHeld = false;
    if (this.mode === "charging") this.cast();
  }

  // ---------------------------------------------------------------- vòng đời
  private toIdle() {
    this.mode = "idle";
    this.session = null;
    this.fishDef = null;
    this.lineSnapped = false;
    this.bobber.setVisible(false);
    this.fishImg.setVisible(false);
    this.hud.setVisible(false);
    this.powerBar.setVisible(false);
    this.hint.setText(
      this.bossHunt ? "SĂN BOSS: mỗi lần quăng tốn 1 vé – Boss chắc chắn cắn câu!" : "Nhấn giữ màn hình (hoặc Space) để lấy lực, thả ra để quăng cần",
    );
    this.tweens.add({ targets: this.hint, alpha: 0.5, yoyo: true, repeat: -1, duration: 700 });
  }

  private refreshAutoBtn() {
    const ok = autoFishActive(GameState.save, Date.now());
    const h = Math.ceil((GameState.save.autoFishUntil - Date.now()) / 3600_000);
    this.autoBtn?.setText(!ok ? "🔒 Câu tự động" : this.auto ? `🤖 ĐANG TỰ ĐỘNG` : `🤖 Tự động (${h}h)`);
    this.autoBtn?.setColor(this.auto ? COLORS.green : COLORS.purple);
  }

  private toggleAuto() {
    if (!autoFishActive(GameState.save, Date.now())) {
      toast(this, "Gói Câu Tự Động 2 ngày: nạp 20.000đ ở mục 💎 Nạp (bấm ô kim cương trên thanh trên cùng ở sảnh)");
      return;
    }
    if (this.bossHunt) return toast(this, "Câu tự động không dùng cho Săn Boss (tốn vé)");
    this.auto = !this.auto;
    this.autoT = 0;
    if (!this.auto) this.reelHeld = false;
    this.refreshAutoBtn();
    toast(this, this.auto ? "🤖 Bật câu tự động – game tự quăng, giật và kéo cá" : "Đã tắt câu tự động");
  }

  /** Mỗi khung hình khi bật tự động: quăng → giật khi cá cắn → kéo giữ lực căng an toàn → câu tiếp. */
  private autoStep(dt: number) {
    if (!this.auto) return;
    if (!autoFishActive(GameState.save, Date.now())) {
      this.auto = false;
      this.reelHeld = false;
      this.refreshAutoBtn();
      return toast(this, "Gói câu tự động đã hết hạn", COLORS.red);
    }
    const s = this.session;
    // chỉ đếm giờ khi đang chờ (sảnh câu / màn kết quả)
    if (this.mode === "idle" || this.mode === "result") this.autoT += dt;
    else this.autoT = 0;
    if (this.mode === "idle" && this.autoT > 600) {
      this.autoT = 0;
      this.autoPower = 0.55 + Math.random() * 0.4;
      this.onPrimaryDown();
    } else if (this.mode === "charging" && this.power >= this.autoPower) {
      this.onPrimaryUp();
    } else if (this.mode === "fishing" && s) {
      if (s.phase === "bite") s.hook();
      else if (s.phase === "reeling") {
        const limit = FISHING.dangerTension * (s.struggling ? 0.55 : 0.82);
        this.reelHeld = s.tension < limit && !s.warning && !s.jumping;
        if (s.struggling && s.skillCooldownLeft <= 0) this.useSkill();
      }
    } else if (this.mode === "result" && this.autoT > 1800) {
      this.autoT = 0;
      this.again();
    }
  }

  private refreshHuntLabel() {
    this.huntLabel?.setText(this.bossHunt ? `⚔ SĂN BOSS · 🎫 còn ${GameState.save.materials.bossTickets} vé` : "");
  }

  private cast() {
    if (this.bossHunt) {
      const r = GameState.useBossTicket();
      if (!r.ok) {
        toast(this, r.error, COLORS.red);
        this.bossHunt = false;
        this.refreshHuntLabel();
        this.mode = "idle";
        this.powerBar.setVisible(false);
        this.hint.setText("Chế độ câu thường – giữ rồi thả để quăng cần");
        return;
      }
      this.refreshHuntLabel();
    }
    this.tweens.killTweensOf(this.hint);
    this.hint.setAlpha(1);
    this.mode = "flying";
    this.powerBar.setVisible(false);
    const power = this.power;
    this.castX = 470 + power * 620;
    Sfx.cast();
    this.tweens.add({ targets: this.hero, angle: 8, duration: 120, yoyo: true });
    const tip = this.rodTip(0);
    this.bobber.setVisible(true).setPosition(tip.x, tip.y);
    const start = { x: tip.x, y: tip.y };
    const peak = Math.min(tip.y, 120) - 40;
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 650 + power * 350,
      onUpdate: (tw) => {
        const k = tw.getValue() ?? 0;
        const x = start.x + (this.castX - start.x) * k;
        const y = (1 - k) * (1 - k) * start.y + 2 * (1 - k) * k * peak + k * k * HORIZON;
        this.bobber.setPosition(x, y);
      },
      onComplete: () => this.landed(power),
    });
    this.hint.setText("");
  }

  private landed(power: number) {
    this.splash(this.castX, HORIZON, 14);
    Sfx.splash();
    this.ripple(this.castX, HORIZON);
    const seed = randomSeed();
    const rng = new Rng(seed);
    // sự kiện ngẫu nhiên khi quăng cần
    if (this.castEventLeft > 0) this.castEventLeft--;
    else this.castEvent = null;
    if (!this.castEvent && !this.bossHunt) {
      const ev = rollCastEvent(rng);
      if (ev) {
        this.castEvent = ev;
        this.castEventLeft = CAST_EVENT_INFO[ev].casts - 1;
        this.flashAlert(CAST_EVENT_INFO[ev].name, ev === "school" ? "#ffe082" : "#80d8ff", 48, 640, 200);
        toast(this, CAST_EVENT_INFO[ev].desc, COLORS.gold);
        Sfx.catchFanfare(false);
      }
    }
    this.eventLabel?.setText(this.castEvent ? `${CAST_EVENT_INFO[this.castEvent].name.replace("!", "")} · còn ${this.castEventLeft + 1} lần` : "");
    this.junk = this.bossHunt ? null : rollJunk(rng, JUNK, FISHING.junkChance);
    const fish = this.junk
      ? junkAsFish(this.junk)
      : this.bossHunt
        ? huntBoss(pickZoneBoss(this.zone, FISH_BY_ID, rng) ?? FISH_BY_ID.get(this.zone.bossId)!)
        : chooseFish(this.zone, FISH_BY_ID, applyCastEvent(this.loadout, this.castEvent), power, rng);
    this.fishDef = fish;
    this.weightKg = rollWeight(fish, rng);
    this.session = new FishingSession({ fish, loadout: this.loadout, seed: rng.int(1, 2 ** 31) });
    this.mode = "fishing";
    this.nibbleAt = this.t + Phaser.Math.Between(700, 1500);
    this.hint.setText("Đang chờ cá cắn… Bấm khi phao chìm hẳn!");
    this.fishImg.setTexture(this.junk ? junkTexture(this, this.junk) : fishTexture(this, fish));
    const dw = 150 * fish.appearance.scale;
    this.fishImg.setDisplaySize(dw, dw * 0.625).setVisible(false);
  }

  // ---------------------------------------------------------------- vòng lặp
  override update(_time: number, dtRaw: number) {
    const dt = Math.min(dtRaw, 100);
    this.t += dt;
    this.drawWater();

    if (this.mode === "charging") {
      this.power += (this.powerDir * dt) / 900;
      if (this.power >= 1) {
        this.power = 1;
        this.powerDir = -1;
      }
      if (this.power <= 0) {
        this.power = 0;
        this.powerDir = 1;
      }
      const col = this.power > 0.85 ? COLORS.red : this.power > 0.5 ? COLORS.gold : COLORS.green;
      this.powerBar.set(this.power, col);
    }

    const s = this.session;
    if (this.mode === "fishing" && s) {
      s.setReeling(this.reelHeld || this.keyHeld);
      s.update(dt);
      for (const e of s.drainEvents()) this.onEvent(e);
      if (s.phase === "waiting") this.updateWaiting();
      if (s.phase === "reeling") this.updateReeling(s);
    }
    this.autoStep(dt);
    if (this.mode === "fishing" && s?.phase === "bite") {
      this.bobber.setPosition(this.castX + Math.sin(this.t / 30) * 3, HORIZON + 14);
    }
    this.drawRodAndLine();
    if (this.shakeT > 0) this.shakeT -= dt;
  }

  private updateWaiting() {
    const bob = Math.sin(this.t / 300) * 3;
    let y = HORIZON + bob;
    if (this.t > this.nibbleAt) {
      // cú rỉa giả – chỉ là hiệu ứng, bấm lúc này sẽ bị tính là giật sớm
      if (this.t < this.nibbleAt + 220) y += 7;
      else this.nibbleAt = this.t + Phaser.Math.Between(900, 2200);
      if (this.t > this.nibbleAt - 5 && this.t < this.nibbleAt + 30) this.ripple(this.castX, HORIZON, 0.6);
    }
    this.bobber.setPosition(this.castX, y);
  }

  private updateReeling(s: FishingSession) {
    const reeling = this.reelHeld || this.keyHeld;
    Sfx.setReeling(reeling, s.tension);
    const targetX = 380 + (s.distance / FISHING.escapeDistance) * 820;
    this.fishX += (targetX - this.fishX) * Math.min(1, this.t ? 0.08 : 1);
    const thrash = s.struggling ? (s.frenzy ? 22 : 12) : 3;
    if (!this.jumping) {
      this.fishY = HORIZON + 95 + Math.sin(this.t / (s.struggling ? 70 : 400)) * thrash;
      this.fishImg.setPosition(this.fishX, this.fishY).setAngle(Math.sin(this.t / (s.struggling ? 50 : 500)) * (s.struggling ? 14 : 4));
      const stun = s.isActive("stun") || s.isActive("freeze");
      const warnFlash = s.warning && Math.floor(this.t / 90) % 2 === 0;
      this.fishImg
        .setTint(s.isActive("freeze") ? 0x9fe8ff : stun ? 0xb0a0c0 : warnFlash ? 0xffeb3b : s.tired ? 0x9cffb0 : s.struggling ? 0x8a4a5a : 0x3a5a7a)
        .setAlpha(0.85);
    }
    if (s.struggling && Math.random() < 0.15) this.splash(this.fishX, HORIZON, 3);

    // HUD
    const f = this.fishDef!;
    this.hpBar.set(s.hpRatio);
    this.hpBar.label?.setText(`HP ${formatNum(s.fishHp)} / ${formatNum(s.fishMaxHp)}  ·  Thu phục ${Math.round(s.progress * 100)}%`);
    const dr = s.distance / FISHING.escapeDistance;
    this.distBar.set(dr, dr > 0.8 ? COLORS.red : COLORS.blue);
    this.distBar.label?.setText(dr > 0.8 ? "⚠ Cá sắp thoát! Kéo lại!" : `Khoảng cách ${Math.round(s.distance)}m`);
    this.durBar.set(s.durability / s.maxDurability, s.durability / s.maxDurability < 0.3 ? COLORS.red : COLORS.green);
    this.drawTension(s);
    const cd = s.skillCooldownLeft;
    this.skillBtn.setDisabled(cd > 0);
    this.skillCd.clear();
    if (cd > 0) {
      const frac = cd / this.loadout.active.cooldownMs;
      this.skillCd.fillStyle(0x000000, 0.45);
      this.skillCd.slice(1010, 636, 46, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2, false).fillPath();
      this.skillBtn.setText(`${(cd / 1000).toFixed(1)}s`);
    } else this.skillBtn.setText(this.loadout.active.name);
    this.fishNameT.setColor(FISH_RARITY_COLOR[f.rarity]);
    const dangerFlash = s.tension > FISHING.dangerTension && Math.floor(this.t / 150) % 2 === 0;
    this.reelBtn.setColor(dangerFlash ? COLORS.red : COLORS.orange);
    if (s.jumping) this.hint.setText("CÁ ĐANG NHẢY – NHẢ TAY ĐỂ NÉ!");
    else if (s.warning) this.hint.setText("⚠ Cá sắp quẫy – nhả tay!");
    else if (s.tired) this.hint.setText("CÁ MỆT RỒI – KÉO NGAY! ✨");
    else if (s.tension > FISHING.dangerTension) this.hint.setText("Dây quá căng! Thả tay ra!");
    else if (s.struggling) this.hint.setText(s.frenzy ? "CÁ CUỒNG NỘ! Cẩn thận lực căng!" : "Cá đang vùng vẫy – nhả bớt dây!");
    else this.hint.setText(reeling ? "Kéo! Kéo! Kéo!" : "Giữ nút KÉO để thu dây");
  }

  private drawTension(s: FishingSession) {
    const g = this.tensionG;
    const x = 1190;
    const y0 = 180;
    const h = 280;
    g.clear();
    g.fillStyle(0x0a1628, 1).fillRoundedRect(x - 6, y0, 32, h, 12);
    const danger = FISHING.dangerTension / s.maxTension;
    g.fillStyle(0xe53935, 0.55).fillRect(x - 4, y0 + 2, 28, h * (1 - danger));
    g.fillStyle(0x43a047, 0.35).fillRect(x - 4, y0 + h * 0.55, 28, h * 0.45 - 2);
    const v = s.tension / s.maxTension;
    const col = v > danger ? 0xff1744 : v > 0.55 ? 0xffc107 : 0x76ff03;
    g.fillStyle(col, 1).fillRoundedRect(x - 2, y0 + h * (1 - v), 24, h * v, 8);
    g.lineStyle(3, COLORS.outline).strokeRoundedRect(x - 6, y0, 32, h, 12);
    g.lineStyle(2, 0xffffff, 0.8).lineBetween(x - 10, y0 + h * (1 - danger), x + 30, y0 + h * (1 - danger));
  }

  // ---------------------------------------------------------------- sự kiện
  private onEvent(e: FishingEvent) {
    const f = this.fishDef!;
    switch (e.type) {
      case "too_early":
        toast(this, "Giật sớm quá! Cá giật mình bơi đi chỗ khác…");
        this.splash(this.castX, HORIZON, 4);
        break;
      case "bite":
        Sfx.bite();
        this.splash(this.castX, HORIZON, 10);
        this.ripple(this.castX, HORIZON);
        this.flashAlert("!", "#ff5252", 90, this.castX, HORIZON - 80);
        this.hint.setText("CÁ CẮN! BẤM NGAY!");
        break;
      case "missed":
        Sfx.fail();
        this.endRound("missed");
        break;
      case "hooked": {
        Sfx.hook();
        this.bobber.setVisible(false);
        this.hud.setVisible(true);
        this.fishX = this.castX;
        this.fishY = HORIZON + 95;
        this.fishImg.setVisible(true).setPosition(this.fishX, this.fishY);
        this.fishNameT.setText(
          this.junk ? `♻ Rác: ${this.junk.name}` : `${f.name} · ${FISH_RARITY_LABEL[f.rarity]} · ${FIGHT_STYLE_INFO[this.session!.style].name}`,
        );
        this.comboT?.setText("");
        if (!this.junk) toast(this, `💡 ${FIGHT_STYLE_INFO[this.session!.style].tip}`);
        {
          const line = pickLine(hookPool(!!this.junk, f.rarity), this.junk || f.rarity === "boss" ? 0.6 : 0.4);
          if (line) speechBubble(this, 230, 238, line);
        }
        this.splash(this.castX, HORIZON, 18);
        this.cameras.main.shake(180, 0.006);
        if (f.id === this.zone.secretBossId) {
          // Boss phụ siêu hiếm
          this.flashAlert("✦ BOSS SIÊU HIẾM! ✦", "#ea80fc", 60);
          this.cameras.main.flash(500, 234, 128, 252);
          this.cameras.main.shake(500, 0.012);
        } else if (f.rarity === "boss") this.flashAlert("BOSS XUẤT HIỆN!", "#ff3d00", 64);
        else if (["legendary", "mythic"].includes(f.rarity)) this.flashAlert(`${FISH_RARITY_LABEL[f.rarity].toUpperCase()}!`, FISH_RARITY_COLOR[f.rarity], 60);
        break;
      }
      case "struggle_start":
        if (e.frenzy) {
          this.cameras.main.shake(300, 0.01);
          this.flashAlert("CUỒNG NỘ!", "#ff1744", 52);
        }
        break;
      case "jump":
        if (!this.junk) this.fishJump();
        break;
      case "warn":
        this.floatText("⚠", this.fishX, this.fishY - 70, "#ffeb3b");
        this.tweens.add({ targets: this.fishImg, scaleX: this.fishImg.scaleX * 1.12, duration: 90, yoyo: true, repeat: 2 });
        this.ripple(this.fishX, HORIZON, 1.2);
        break;
      case "dodge":
        Sfx.crit();
        this.floatText(`NÉ ĐẸP! -${formatNum(e.amount)}`, this.fishX, this.fishY - 90, "#69f0ae");
        this.showCombo(e.combo);
        break;
      case "jump_fail":
        Sfx.danger();
        this.cameras.main.shake(160, 0.008);
        this.floatText("Giật lúc cá nhảy! Dây căng!", this.fishX, this.fishY - 90, "#ff5252");
        break;
      case "perfect":
        Sfx.crit();
        this.floatText(e.combo > 1 ? `HOÀN HẢO x${e.combo}!` : "HOÀN HẢO!", this.fishX, this.fishY - 80, "#ffd740");
        this.sparks(this.fishX, this.fishY, 0xffd740);
        this.showCombo(e.combo);
        break;
      case "combo_break":
        this.comboT?.setText("");
        this.floatText("Mất combo", 680, 170, "#ff8a80");
        break;
      case "crit":
        Sfx.crit();
        this.floatText(`CHÍ MẠNG ${formatNum(e.amount)}`, this.fishX, this.fishY - 60, "#ffeb3b");
        break;
      case "danger":
        Sfx.danger();
        break;
      case "skill":
        break;
      case "caught":
        this.onCaught();
        break;
      case "escaped":
        Sfx.fail();
        this.tweens.add({ targets: this.fishImg, x: 1450, alpha: 0, duration: 700 });
        this.endRound("escaped");
        break;
      case "snapped":
        Sfx.snap();
        this.lineSnapped = true;
        this.cameras.main.shake(250, 0.012);
        this.sparks(this.rodTip(1).x, this.rodTip(1).y, 0xffffff);
        this.tweens.add({ targets: this.fishImg, x: 1450, alpha: 0, duration: 900 });
        this.endRound("snapped");
        break;
      default:
        break;
    }
  }

  private useSkill() {
    const s = this.session;
    if (!s || this.mode !== "fishing" || s.phase !== "reeling") return;
    const hpBefore = s.fishHp;
    if (!s.useSkill()) {
      if (s.skillCooldownLeft > 0) toast(this, `Kỹ năng hồi sau ${(s.skillCooldownLeft / 1000).toFixed(1)} giây`);
      return;
    }
    const char = CHARACTER_BY_ID.get(GameState.save.selectedCharacterId)!;
    Sfx.skill();
    const [r, g, b] = parseHex(char.appearance.aura);
    this.cameras.main.flash(250, r, g, b);
    this.aura.setAlpha(1).setScale(1.5);
    this.tweens.add({ targets: this.aura, alpha: 0, scale: 1.1, duration: 1400, ease: "Cubic.easeOut" });
    this.tweens.add({ targets: this.hero, scale: 1.08, duration: 120, yoyo: true });
    this.flashAlert(this.loadout.active.name.toUpperCase(), char.appearance.aura, 54);
    this.sparks(this.fishX, this.fishY, hexToInt(char.appearance.aura));
    playSkillFx(this, {
      heroX: 190,
      heroY: 388,
      fishX: this.fishX,
      fishY: this.fishY,
      color: hexToInt(char.appearance.aura),
      charId: char.id,
      effects: this.loadout.active.effects,
      skillName: this.loadout.active.name,
      heroKey: this.hero.texture.key,
    });
    const dmg = hpBefore - s.fishHp;
    if (dmg > 0) this.floatText(`-${formatNum(dmg)}`, this.fishX, this.fishY - 50, "#ff8a80");
  }

  private showCombo(n: number) {
    if (!this.comboT) return;
    this.comboT.setText(n >= 2 ? `COMBO x${n}` : "").setScale(1.4);
    this.tweens.add({ targets: this.comboT, scale: 1, duration: 220, ease: "Back.easeOut" });
  }

  private fishJump() {
    if (this.jumping || !this.fishDef) return;
    this.jumping = true;
    const f = this.fishDef;
    const x0 = this.fishX;
    const big = f.appearance.scale >= 1.5;
    this.splash(x0, HORIZON, big ? 30 : 16);
    Sfx.splash(big);
    if (big) this.cameras.main.shake(220, 0.008);
    this.fishImg.clearTint().setAlpha(1).setDepth(5);
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 900,
      onUpdate: (tw) => {
        const k = tw.getValue() ?? 0;
        const x = x0 + 60 * k;
        const y = HORIZON + 40 - Math.sin(k * Math.PI) * (big ? 230 : 170);
        this.fishImg.setPosition(x, y).setAngle(-40 + 80 * k);
        this.fishX = x;
      },
      onComplete: () => {
        this.splash(this.fishX, HORIZON, big ? 26 : 14);
        this.fishImg.setDepth(1);
        this.jumping = false;
      },
    });
  }

  private onCaught() {
    if (this.mode !== "fishing") return;
    this.mode = "landing";
    Sfx.setReeling(false);
    const f = this.fishDef!;
    if (!this.junk && this.session) {
      const mul = (1 + this.session.weightBonus) * castEventWeightMul(this.castEvent);
      if (mul > 1) {
        this.weightKg = Math.round(this.weightKg * mul * 100) / 100;
        if (this.session.weightBonus > 0) toast(this, `Combo x${this.session.maxCombo}: cá nặng thêm ${Math.round(this.session.weightBonus * 100)}%!`, COLORS.gold);
      }
    }
    const res = this.junk ? GameState.catchJunk(this.junk) : GameState.catchFish(FISH_BY_ID.get(f.id)!, this.weightKg, this.zone.id, this.bossHunt);
    // vật phẩm tiến hóa đột biến – tỉ lệ rất thấp
    let evo: EvoItemDef | null = null;
    if (res.ok && !this.junk) {
      evo = rollEvoDrop(new Rng(randomSeed()), EVO_ITEMS, f.rarity === "boss");
      if (evo && !GameState.grantEvoItem(evo.id).ok) evo = null;
    }
    this.hud.setVisible(false);
    this.hint.setText("");
    this.fishImg.clearTint().setAlpha(1).setDepth(6);
    this.splash(this.fishX, HORIZON, 30);
    Sfx.splash(true);
    this.cameras.main.shake(260, 0.01);
    const sx = this.fishX;
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 900,
      ease: "Sine.easeInOut",
      onUpdate: (tw) => {
        const k = tw.getValue() ?? 0;
        this.fishImg.setPosition(sx + (330 - sx) * k, HORIZON + 60 - Math.sin(k * Math.PI) * 260 - k * 140).setAngle(720 * k);
        this.fishX = this.fishImg.x;
        this.fishY = this.fishImg.y;
      },
      onComplete: () => {
        this.fishImg.setVisible(false);
        this.showResult("caught", res.ok ? undefined : res.error);
        if (evo) this.time.delayedCall(500, () => this.showEvoDrop(evo));
      },
    });
  }

  /** Thông báo rơi vật phẩm tiến hóa cực hiếm. */
  private showEvoDrop(form: EvoItemDef) {
    const col = hexToInt(form.glow);
    Sfx.catchFanfare(true);
    this.cameras.main.flash(500, (col >> 16) & 255, (col >> 8) & 255, col & 255);
    const c = this.add.container(640, 300).setDepth(1200);
    const g = this.add.graphics();
    g.fillStyle(0x0a0a1e, 0.92).fillRoundedRect(-330, -120, 660, 240, 24);
    g.lineStyle(5, col).strokeRoundedRect(-330, -120, 660, 240, 24);
    const icon = this.add.text(-230, 0, form.icon, { fontSize: "96px", padding: { top: 16 } }).setOrigin(0.5);
    c.add([
      g,
      this.add.particles(-230, 0, "p_spark", { speed: { min: 60, max: 260 }, lifespan: 1100, frequency: 60, scale: { start: 1.2, end: 0 }, tint: [col, 0xffffff], blendMode: Phaser.BlendModes.ADD }),
      icon,
      txt(this, -130, -70, form.divine ? "✨ THẦN VẬT XUẤT THẾ! ✨" : "💠 VẬT PHẨM CỰC HIẾM!", 30, { color: form.glow }),
      txt(this, -130, -24, form.name, 34, { color: "#ffffff" }),
      txt(this, -130, 22, `Dùng cho cá Huyền Thoại/Thần Thoại/Boss → 🧬 Thể\nđột biến CHẮC CHẮN thành công!`, 18, { weight: "700", color: COLORS.textDim }),
    ]);
    c.setScale(0.2);
    this.tweens.add({ targets: c, scale: 1, duration: 420, ease: "Back.easeOut" });
    this.tweens.add({ targets: icon, angle: { from: -12, to: 12 }, duration: 500, yoyo: true, repeat: -1 });
    this.time.delayedCall(3600, () => this.tweens.add({ targets: c, alpha: 0, duration: 300, onComplete: () => c.destroy() }));
    c.setInteractive(new Phaser.Geom.Rectangle(-330, -120, 660, 240), Phaser.Geom.Rectangle.Contains).on("pointerup", () => c.destroy());
  }

  private endRound(kind: "missed" | "escaped" | "snapped") {
    this.mode = "result";
    Sfx.setReeling(false);
    this.hud.setVisible(false);
    this.bobber.setVisible(false);
    this.hint.setText("");
    if (kind !== "missed") GameState.recordFail(kind);
    this.time.delayedCall(700, () => this.showResult(kind));
  }

  // ---------------------------------------------------------------- kết quả
  private showResult(kind: "caught" | "missed" | "escaped" | "snapped", error?: string) {
    this.mode = "result";
    const c = this.add.container(0, 0).setDepth(200);
    this.resultC = c;
    c.add(screenRect(this, 0x000000, 0.55).setInteractive());
    const f = this.fishDef;
    if (kind === "caught" && this.junk) {
      const j = this.junk;
      c.add(panel(this, 340, 110, 600, 520, 0.96, 0x0f3d24));
      c.add(txt(this, 640, 150, "BẠN VỚT ĐƯỢC RÁC!", 40, { color: "#b9f6ca", align: "center" }).setOrigin(0.5));
      const img = this.add.image(640, 280, junkTexture(this, j)).setScale(0.1);
      c.add(img);
      this.tweens.add({ targets: img, scale: 0.75, duration: 450, ease: "Back.easeOut" });
      this.tweens.add({ targets: img, angle: 8, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      c.add(txt(this, 640, 386, j.name, 34, { color: "#ffffff", align: "center" }).setOrigin(0.5));
      c.add(txt(this, 640, 424, `Tái chế được +${j.ecoPoints} 🌿 Điểm Môi Trường · Đã cất vào túi rác`, 19, { align: "center", weight: "700", color: "#c8e6c9" }).setOrigin(0.5));
      const msg = txt(this, 640, 482, ECO_MESSAGE, 26, { color: "#69f0ae", align: "center", wrap: 560 }).setOrigin(0.5);
      c.add(msg);
      this.tweens.add({ targets: msg, scale: 1.06, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      Sfx.coin();
      c.add(new Button(this, 520, 570, 210, 66, "Câu tiếp", { color: COLORS.orange, fontSize: 26, sub: "Space / Enter", onClick: () => this.again() }));
      c.add(new Button(this, 760, 570, 210, 66, "♻ Tái chế", { color: COLORS.green, fontSize: 26, onClick: () => goTo(this, "Shop", { tab: "eco" }) }));
      c.setAlpha(0);
      this.tweens.add({ targets: c, alpha: 1, duration: 220 });
      this.bindAgainKeys();
      return;
    }
    if (kind === "caught" && f) {
      const rare = ["epic", "legendary", "mythic", "boss"].includes(f.rarity);
      const col = hexToInt(FISH_RARITY_COLOR[f.rarity]);
      // tia sáng xoay
      const rays = this.add.container(640, 300);
      for (let i = 0; i < 12; i++) rays.add(this.add.image(0, 0, "p_ray").setOrigin(0.5, 0).setAngle(i * 30).setTint(col).setAlpha(rare ? 0.55 : 0.25));
      c.add(rays);
      this.tweens.add({ targets: rays, angle: 360, duration: 14000, repeat: -1 });
      c.add(panel(this, 340, 120, 600, 500, 0.95));
      c.add(txt(this, 640, 160, rare ? "BẮT ĐƯỢC CÁ HIẾM!" : "BẮT ĐƯỢC CÁ!", 40, { color: "#ffd54f", align: "center" }).setOrigin(0.5));
      const img = this.add.image(640, 300, fishTexture(this, f)).setScale(0.1);
      c.add(img);
      this.tweens.add({ targets: img, scale: f.appearance.scale >= 1.5 ? 0.95 : 0.85, duration: 500, ease: "Back.easeOut" });
      this.tweens.add({ targets: img, y: 290, duration: 1200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      c.add(txt(this, 640, 410, f.name, 36, { color: FISH_RARITY_COLOR[f.rarity], align: "center" }).setOrigin(0.5));
      const brag = pickLine(CATCH_LINES, 0.5, { ca: f.name, kg: String(this.weightKg) });
      if (brag) c.add(txt(this, 640, 528, `“${brag}”`, 17, { color: "#fff59d", align: "center", wrap: 560, weight: "700" }).setOrigin(0.5));
      c.add(txt(this, 640, 448, `${FISH_RARITY_LABEL[f.rarity]} · ${this.weightKg} kg · Lực chiến ${formatNum(fishPower(f))}`, 22, { align: "center", weight: "700" }).setOrigin(0.5));
      const r = catchRewards(f, this.loadout.passives, this.bossHunt);
      c.add(
        txt(this, 640, 486, error ? `⚠ ${error}` : `+${formatNum(r.xp)} KN  +${formatNum(r.gold)}🪙  +${r.stones}🔷${r.soul ? `  +${r.soul}🔮` : ""}${r.tickets ? `  +${r.tickets}🎫` : ""}`, 22, {
          align: "center",
          color: error ? "#ff8a80" : "#b9f6ca",
        }).setOrigin(0.5),
      );
      if (!error) Sfx.catchFanfare(rare);
      if (rare) {
        this.cameras.main.flash(400, 255, 255, 255);
        for (let i = 0; i < 3; i++) this.time.delayedCall(i * 250, () => this.sparks(Phaser.Math.Between(420, 860), Phaser.Math.Between(180, 400), col));
      }
    } else {
      const msg =
        kind === "snapped"
          ? ["ĐỨT DÂY!", "Dây quá căng quá lâu. Hãy thả tay khi thanh lực căng vào vùng đỏ."]
          : kind === "escaped"
            ? ["CÁ ĐÃ THOÁT!", "Cá bơi quá xa. Hãy kéo dây khi cá ngừng vùng vẫy."]
            : ["LỠ MẤT CÁ!", "Phao chìm hẳn và có dấu ! thì bấm ngay để giật cần."];
      c.add(panel(this, 390, 200, 500, 320, 0.95));
      c.add(txt(this, 640, 260, msg[0]!, 48, { color: "#ff8a80", align: "center" }).setOrigin(0.5));
      if (f && kind !== "missed") c.add(txt(this, 640, 320, `Đó là: ${f.name} (${FISH_RARITY_LABEL[f.rarity]})`, 22, { color: FISH_RARITY_COLOR[f.rarity], align: "center" }).setOrigin(0.5));
      c.add(txt(this, 640, 370, msg[1]!, 20, { align: "center", wrap: 440, weight: "700" }).setOrigin(0.5));
    }
    const by = kind === "caught" ? 570 : 470;
    c.add(new Button(this, 520, by, 210, 66, "Câu tiếp", { color: COLORS.orange, fontSize: 26, sub: "Space / Enter", onClick: () => this.again() }));
    c.add(new Button(this, 760, by, 210, 66, kind === "caught" ? "Xem Kho Cá" : "Về sảnh", {
      color: COLORS.blue,
      fontSize: 26,
      onClick: () => goTo(this, kind === "caught" ? "Inventory" : "Hub"),
    }));
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 220 });
    this.bindAgainKeys();
  }

  /** Enter hoặc Space ở bảng kết quả = "Câu tiếp". */
  private bindAgainKeys() {
    const kb = this.input.keyboard;
    if (!kb) return;
    const go = () => {
      kb.off("keydown-ENTER", go);
      kb.off("keydown-SPACE", go);
      // đợi nhả phím để lần nhấn Space này không bị tính là bắt đầu lấy lực
      this.time.delayedCall(0, () => this.again());
    };
    // bỏ qua lần nhấn đang giữ từ lúc kéo cá
    this.time.delayedCall(350, () => {
      kb.on("keydown-ENTER", go);
      kb.on("keydown-SPACE", go);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      kb.off("keydown-ENTER", go);
      kb.off("keydown-SPACE", go);
    });
  }

  private again() {
    if (this.mode !== "result") return;
    this.resultC?.destroy(true);
    this.resultC = undefined;
    this.fishImg.setAlpha(1).setAngle(0).setDepth(1);
    this.toIdle();
  }

  private leave() {
    if (this.mode === "fishing" && this.session?.phase === "reeling") {
      GameState.recordFail("escaped");
    }
    goTo(this, "Hub");
  }

  // ---------------------------------------------------------------- vẽ
  private rodTip(bend: number) {
    const ang = -0.95 + bend * 0.55;
    return { x: HAND.x + Math.cos(ang) * ROD_LEN, y: HAND.y + Math.sin(ang) * ROD_LEN };
  }

  private drawRodAndLine() {
    const g = this.rodG;
    g.clear();
    const s = this.session;
    const rod = ROD_BY_ID.get(GameState.save.selectedRodId)!;
    let tension = 0;
    if (s && s.phase === "reeling") tension = s.tension / s.maxTension;
    if (this.mode === "charging") tension = -this.power * 0.6;
    const tip = this.rodTip(Math.max(-0.5, tension));
    const shake = s?.struggling ? Math.sin(this.t / 25) * 4 * tension : 0;
    tip.y += shake;
    // thân cần cong
    const ctrl = { x: HAND.x + (tip.x - HAND.x) * 0.5 - 10, y: HAND.y + (tip.y - HAND.y) * 0.5 - 30 + tension * 40 };
    const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(HAND.x, HAND.y), new Phaser.Math.Vector2(ctrl.x, ctrl.y), new Phaser.Math.Vector2(tip.x, tip.y));
    const pts = curve.getPoints(18);
    const n = pts.length - 1;
    const width = (i: number) => 9 - (i / n) * 6.5; // thon dần về ngọn
    const shaft = hexToInt(rod.visual.shaft);
    if (rod.visual.glow) {
      const pulse = 0.22 + Math.sin(this.t / 220) * 0.1;
      g.lineStyle(18, hexToInt(rod.visual.glow), pulse);
      g.strokePoints(pts);
    }
    for (let i = 0; i < n; i++) {
      g.lineStyle(width(i) + 4, COLORS.outline, 1);
      g.lineBetween(pts[i]!.x, pts[i]!.y, pts[i + 1]!.x, pts[i + 1]!.y);
    }
    for (let i = 0; i < n; i++) {
      g.lineStyle(width(i), shaft, 1);
      g.lineBetween(pts[i]!.x, pts[i]!.y, pts[i + 1]!.x, pts[i + 1]!.y);
    }
    // vân sét đỏ (cần đặc biệt) – nhấp nháy
    if (rod.visual.veins) {
      const flick = 0.55 + 0.45 * Math.abs(Math.sin(this.t / 90));
      g.lineStyle(2.2, hexToInt(rod.visual.veins), flick);
      g.beginPath();
      for (let i = 1; i < n; i++) {
        const p0 = pts[i]!;
        const p1 = pts[i + 1]!;
        const ang = Math.atan2(p1.y - p0.y, p1.x - p0.x) - Math.PI / 2;
        const off = (i % 2 ? 1 : -1) * width(i) * 0.3;
        const px = p0.x + Math.cos(ang) * off;
        const py = p0.y + Math.sin(ang) * off;
        if (i === 1) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.strokePath();
    }
    // ánh sáng dọc thân
    g.lineStyle(1.6, 0xffffff, 0.45);
    for (let i = 1; i < n - 1; i++) g.lineBetween(pts[i]!.x - 1, pts[i]!.y - 1.5, pts[i + 1]!.x - 1, pts[i + 1]!.y - 1.5);
    // quấn chỉ + khoen dẫn dây
    const wrap = hexToInt(rod.visual.wrap);
    for (const i of [5, 9, 12, 15, 17]) {
      const p0 = pts[i]!;
      const p1 = pts[i + 1]!;
      g.lineStyle(width(i) + 1, wrap, 1);
      g.lineBetween(p0.x, p0.y, p0.x + (p1.x - p0.x) * 0.35, p0.y + (p1.y - p0.y) * 0.35);
      const ang = Math.atan2(p1.y - p0.y, p1.x - p0.x) - Math.PI / 2;
      g.lineStyle(1.8, 0xcfd8dc, 1);
      g.strokeCircle(p0.x + Math.cos(ang) * (width(i) / 2 + 3), p0.y + Math.sin(ang) * (width(i) / 2 + 3), 2.6);
    }
    // tay cầm nút bần
    g.lineStyle(17, COLORS.outline, 1);
    g.lineBetween(HAND.x - 30, HAND.y + 30, HAND.x + 4, HAND.y - 2);
    g.lineStyle(12, hexToInt(rod.visual.handle), 1);
    g.lineBetween(HAND.x - 28, HAND.y + 28, HAND.x + 2, HAND.y);
    g.lineStyle(12, 0x3e2723, 1);
    g.lineBetween(HAND.x - 32, HAND.y + 32, HAND.x - 27, HAND.y + 27);
    // đầu cần: vật trang trí xoay theo hướng ngọn
    const last = pts[n]!;
    const prev = pts[n - 2]!;
    const tipAng = Math.atan2(last.y - prev.y, last.x - prev.x);
    this.rodOrn.setPosition(last.x, last.y).setRotation(tipAng + Math.PI / 2);
    this.rodFx?.setPosition(last.x, last.y);
    this.rodSmoke?.setPosition(last.x, last.y);

    // dây câu
    if (this.lineSnapped || this.mode === "idle" || this.mode === "charging") {
      if (this.mode === "idle" || this.mode === "charging") {
        g.lineStyle(2, hexToInt(rod.visual.line), 0.9).lineBetween(tip.x, tip.y, tip.x + 4, tip.y + 60);
      }
      return;
    }
    let end = { x: this.bobber.x, y: this.bobber.y - 10 };
    if ((s?.phase === "reeling" || this.mode === "landing") && this.fishImg.visible) {
      const fw = this.fishImg.displayWidth;
      end = { x: this.fishImg.x + Math.cos((this.fishImg.angle * Math.PI) / 180) * fw * 0.42, y: this.fishImg.y };
    }
    const sag = s?.phase === "reeling" ? (1 - tension) * 70 : 50;
    const mid = { x: (tip.x + end.x) / 2, y: Math.max(tip.y, end.y) - 20 + sag };
    const line = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(tip.x, tip.y), new Phaser.Math.Vector2(mid.x, mid.y), new Phaser.Math.Vector2(end.x, end.y));
    const danger = s?.phase === "reeling" && s.tension > FISHING.dangerTension;
    const lc = danger ? (Math.floor(this.t / 100) % 2 ? 0xff1744 : 0xffffff) : hexToInt(rod.visual.line);
    g.lineStyle(danger ? 3.5 : 2.5, lc, 0.95);
    g.strokePoints(line.getPoints(20));
  }

  private drawWater() {
    const g = this.water;
    g.clear();
    const t = this.t / 1000;
    const top = hexToInt(this.zone.theme.waterTop);
    // dải sóng mặt nước
    g.fillStyle(top, 0.55);
    g.beginPath();
    g.moveTo(0, HORIZON + 30);
    for (let x = 0; x <= 1280; x += 20) g.lineTo(x, HORIZON + Math.sin(x / 60 + t * 2) * 4 + Math.sin(x / 23 - t * 3) * 2);
    g.lineTo(1280, HORIZON + 30);
    g.closePath();
    g.fillPath();
    g.lineStyle(3, 0xffffff, 0.7);
    g.beginPath();
    for (let x = 0; x <= 1280; x += 20) {
      const y = HORIZON + Math.sin(x / 60 + t * 2) * 4 + Math.sin(x / 23 - t * 3) * 2;
      if (x === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.strokePath();
    // gợn sóng lấp lánh
    g.lineStyle(2, 0xffffff, 0.25);
    for (let i = 0; i < 14; i++) {
      const y = HORIZON + 30 + i * 22;
      const x = ((i * 173 + t * (20 + i * 3)) % 1400) - 60;
      g.lineBetween(x, y, x + 40 + (i % 3) * 20, y);
    }
  }

  private addWeather() {
    const w = this.zone.theme.weather;
    const cfg: Record<string, Phaser.Types.GameObjects.Particles.ParticleEmitterConfig & { tex: string }> = {
      snow: { tex: "p_snow", x: { min: 0, max: 1280 }, y: -10, speedY: { min: 40, max: 90 }, speedX: { min: -20, max: 20 }, lifespan: 9000, frequency: 120, scale: { min: 0.4, max: 1 }, alpha: 0.8 },
      embers: { tex: "p_ember", x: { min: 300, max: 1280 }, y: 720, speedY: { min: -120, max: -60 }, speedX: { min: -20, max: 20 }, lifespan: 6000, frequency: 160, scale: { min: 0.6, max: 1.4 } },
      bubbles: { tex: "p_bubble", x: { min: 350, max: 1280 }, y: 720, speedY: { min: -60, max: -30 }, lifespan: 6500, frequency: 260, scale: { min: 0.4, max: 1.1 }, alpha: 0.7 },
      sparkles: { tex: "p_spark", x: { min: 350, max: 1280 }, y: { min: HORIZON - 10, max: HORIZON + 200 }, lifespan: 1400, frequency: 220, scale: { start: 0, end: 0.6 }, alpha: { start: 0.9, end: 0 } },
      leaves: { tex: "p_leaf", x: { min: 0, max: 1280 }, y: -10, speedY: { min: 30, max: 60 }, speedX: { min: 20, max: 60 }, rotate: { min: 0, max: 360 }, lifespan: 12000, frequency: 900 },
    };
    const c = cfg[w];
    if (!c) return;
    const { tex, ...rest } = c;
    this.add.particles(0, 0, tex, rest).setDepth(30);
  }

  private splash(x: number, y: number, n: number) {
    this.add
      .particles(x, y, "p_drop", {
        speed: { min: 80, max: 140 + n * 9 },
        angle: { min: 225, max: 315 },
        gravityY: 700,
        lifespan: 800,
        scale: { start: 1.3, end: 0.2 },
        quantity: n,
        stopAfter: n,
      })
      .setDepth(20);
  }

  private ripple(x: number, y: number, s = 1) {
    const r = this.add.ellipse(x, y + 4, 20 * s, 6 * s).setStrokeStyle(2, 0xffffff, 0.8).setDepth(3);
    this.tweens.add({ targets: r, scaleX: 5, scaleY: 4, alpha: 0, duration: 900, onComplete: () => r.destroy() });
  }

  private sparks(x: number, y: number, tint: number) {
    this.add
      .particles(x, y, "p_spark", {
        speed: { min: 100, max: 360 },
        lifespan: 700,
        scale: { start: 1.2, end: 0 },
        rotate: { min: 0, max: 360 },
        tint,
        quantity: 20,
        stopAfter: 20,
      })
      .setDepth(70);
  }

  private floatText(s: string, x: number, y: number, color: string) {
    const t = txt(this, x, y, s, 30, { color, align: "center" }).setOrigin(0.5).setDepth(80);
    this.tweens.add({ targets: t, y: y - 70, alpha: 0, duration: 1000, ease: "Cubic.easeOut", onComplete: () => t.destroy() });
  }

  private flashAlert(s: string, color: string, size = 56, x = 640, y = 230) {
    const t = this.alertT;
    t.setText(s).setColor(color).setFontSize(size).setPosition(x, y).setAlpha(1).setScale(0.4);
    this.tweens.killTweensOf(t);
    this.tweens.add({ targets: t, scale: 1, duration: 260, ease: "Back.easeOut" });
    this.tweens.add({ targets: t, alpha: 0, delay: 900, duration: 400 });
  }
}
