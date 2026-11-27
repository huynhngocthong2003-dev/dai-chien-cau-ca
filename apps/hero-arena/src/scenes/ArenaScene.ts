import Phaser from "phaser";
import {
  Arena,
  applySnapshot,
  IDLE_INPUT,
  encodeInput,
  encodeSnapshot,
  EventLog,
  RemoteInput,
  type NetTargets,
  type Snapshot,
  EVOLUTION_STYLE_VI,
  EVOLUTION_MECHANIC_VI,
  ROLE_VI,
  modsText,
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
  type PropKind,
  type TargetMode,
  type FighterInput,
  type Gender,
  type SkillSlot,
  type UpgradeChoice,
} from "@hero-arena/core";
import { dotTexture, vignetteTexture } from "../art.ts";
import { makeMonsterTextures, monsterDisplayScale, monsterTexture } from "../monsterArt.ts";
import { decoTexture, type DecoKind } from "../decoArt.ts";
import { TERRAIN_SCALE, terrainTexture } from "../terrain.ts";
import { addHeroImage, armRig, breathe, evolutionScale, evolutionTier, hasRealArt, heroArtKey, heroTex, HERO_FIGURE_H, nativeFacing, setHeroImage, skillIcon, walkFrameKey, WALK_FRAMES, type ArmRig } from "../heroArt.ts";
import { getSave, newMatchSeed, persist } from "../state.ts";
import { leaveNet, netSession, type NetSession } from "../net/room.ts";
import { button, H, hex, panel, pixelBox, pixelCircle, PX, text, toast, W } from "../ui.ts";
import { HudAnchors, view } from "../layout.ts";

/** Bước mô phỏng 60 lần/giây – khớp tốc độ khung hình, chuyển động mượt. */
const STEP = 1 / 60;

const BIOME_COLOR: Record<BiomeType, number> = {
  forest: 0x22392b,
  ruined_temple: 0x34402f,
  desert: 0xa8763a,
  ruined_village: 0x86663c,
  mountain: 0xc6d0dc,
  glacier: 0xa6c4e2,
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

/** Lớp cầm gậy/trượng – đánh thường là vung gậy. */
const STAFF_CLASSES = new Set(["helper", "mage", "support", "summoner", "seer"]);

/** Màu mảnh vỡ khi phá vật. */
const PROP_DEBRIS: Partial<Record<PropKind, number>> = {
  tree: 0x3a6a3a, darktree: 0x6a4a9a, deadtree: 0x5a4a3a, pine: 0x2e5a4a, snowpine: 0xe8f0ff, cactus: 0x4a9a48, bush: 0x3a7a3a,
  barrel: 0x8a5a2a, rock: 0x7a7682, boulder: 0x6a6672, crystal: 0x8ac8f4, icechunk: 0xb8e0ff, grave: 0x8a8f98,
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
  /** Texture gốc hiện tại (để sinh khung bước chân). */
  texKey: string;
  texFrame: number | undefined;
  /** Hành động đang diễn: chém / bắn / tung chiêu / tối thượng. */
  act: { kind: "melee" | "wave" | "shot" | "cast" | "ult"; t: number; dur: number; dx: number; dy: number; color: number } | null;
  /** Trúng đòn: thời gian còn lại + hướng bị đẩy. */
  hit: number;
  hitDx: number;
  hitDy: number;
  /** Lớp phát sáng khi tung chiêu. */
  glow: Phaser.GameObjects.Image;
  /** Hướng đang quay mặt (1 phải, -1 trái) và thời gian còn lại của động tác quay người. */
  dir: 1 | -1;
  turn: number;
  /** Lớp tay + vũ khí (xoay quanh vai khi đánh) và cách tách hình hiện tại. */
  arm: Phaser.GameObjects.Image;
  rig: ArmRig | null;
  armAngle: number;
  aura: Phaser.GameObjects.Particles.ParticleEmitter | null;
  auraKey: string;
}

type CastAim = { dx: number; dy: number; dist: number };
/** Kéo dưới ngưỡng này = chạm nhanh (tự ngắm). */
const AIM_DEAD = 46;
/** Kéo hết cỡ (đơn vị màn hình) = tầm tối đa với chiêu chọn điểm rơi. */
const AIM_MAX = 140;
/** Ô "Hủy chiêu" (toạ độ thiết kế, neo góc dưới-phải). */
const CANCEL_X = 1000;
const CANCEL_Y = 404;
const CANCEL_R = 38;

interface SkillButton {
  slot: SkillSlot | "attack" | "potion" | "atk_monster" | "atk_prop";
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
  /** Vị trí khung trước + hướng nhìn của quái (để quay mặt & chạy hoạt ảnh bước). */
  private monsterAnim = new Map<string, { px: number; py: number; face: number; moving: number }>();
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
  private anchors!: HudAnchors;
  private hazardTint!: Phaser.GameObjects.Rectangle;
  private vignette!: Phaser.GameObjects.Image;
  private portrait!: Phaser.GameObjects.Image;
  private skillButtons: SkillButton[] = [];
  private modal: Phaser.GameObjects.Container | null = null;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private joy = { id: -1, bx: 0, by: 0, x: 0, y: 0 };
  private joyG!: Phaser.GameObjects.Graphics;
  private attackHeld = new Set<number>();
  /** Nút nhỏ đang giữ: chỉ đánh quái / chỉ phá vật. */
  private modeHeld = new Map<number, TargetMode>();
  private pendingCast: SkillSlot | null = null;
  private pendingPotion = false;
  private dmgPool: Phaser.GameObjects.Text[] = [];
  private dust!: Phaser.GameObjects.Particles.ParticleEmitter;
  // ---- chơi chung ----
  private net: NetSession | null = null;
  private eventLog = new EventLog();
  private remoteInputs = new Map<string, RemoteInput>();
  private snapTimer = 0;
  private lastSnapT = -1;
  private lastSeq = 0;
  private netTargets: NetTargets | null = null;
  private castSeq = 0;
  private lastCastSlot: SkillSlot | null = null;
  /** Hướng ngắm chiêu tay gần nhất (gửi kèm số thứ tự chiêu khi chơi chung). */
  private lastCastAim: CastAim | null = null;
  private pendingAim: CastAim | null = null;
  /** Đang giữ nút/phím chiêu để canh chỉnh hướng. */
  private aiming: { slot: SkillSlot; pid: number; bx: number; by: number; x: number; y: number; kb: boolean } | null = null;
  private mouseSeen = false;
  private cancelG!: Phaser.GameObjects.Graphics;
  private cancelText!: Phaser.GameObjects.Text;
  private potionSeq = 0;
  private choiceSeq = 0;
  private lastChoice: [number, number, string] | null = null;
  private choiceWaitUntil = 0;
  private inputTimer = 0;
  private hostGoneSince = 0;
  private spectating = false;
  private propViews = new Map<string, Phaser.GameObjects.Image>();
  private lastStep = new Map<string, number>();

  constructor() {
    super("Arena");
  }

  init(data: { heroId?: string; gender?: Gender; net?: boolean }): void {
    this.heroId = data.heroId ?? "mage";
    this.gender = data.gender ?? "male";
    this.net = data.net ? netSession() : null;
  }

  create(): void {
    const save = getSave();
    const net = this.net;
    const seed = net?.seed ?? newMatchSeed();
    this.matchId = net ? `mp_${net.code}_${seed.toString(36)}` : `${seed.toString(36)}_${Date.now().toString(36)}`;
    // chơi chung: không mang bình máu kho vào trận (công bằng cho mọi người)
    this.storePotions = net ? 0 : potionsAvailable(save);
    this.arena = new Arena({
      seed, playerName: save.name, heroId: this.heroId, gender: this.gender, bonusPotions: this.storePotions,
      humans: net?.humans.map((h) => ({ id: h.id, name: h.name, heroId: h.heroId })),
      localId: net?.localId,
    });
    this.eventLog = new EventLog();
    this.remoteInputs.clear();
    this.snapTimer = 0;
    this.lastSnapT = -1;
    this.lastSeq = 0;
    this.netTargets = null;
    this.castSeq = 0;
    this.potionSeq = 0;
    this.choiceSeq = 0;
    this.lastChoice = null;
    this.choiceWaitUntil = 0;
    this.hostGoneSince = 0;
    this.spectating = false;
    this.acc = 0;
    this.ending = false;
    this.timeScale = 1;
    this.fighterViews.clear();
    this.propViews.clear();
    this.monsterViews.clear();
    this.monsterAnim.clear();
    this.skillButtons = [];
    this.feed = [];
    this.dmgPool = [];
    this.modal = null;
    this.attackHeld.clear();
    this.pendingCast = null;
    this.pendingAim = null;
    this.lastCastAim = null;
    this.aiming = null;
    if (completeTutorialStep(save, "select_hero_and_gender")) persist();

    this.cameras.main.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);
    this.cameras.main.setBackgroundColor("#0a1622");
    this.cameras.main.setZoom(1);
    dotTexture(this);
    makeMonsterTextures(this);
    this.drawWorld(seed);

    for (const m of this.arena.monsters) {
      const img = this.add.image(m.x, m.y, monsterTexture(this, m.def)).setScale(monsterDisplayScale(m.def));
      this.monsterViews.set(m.id, img);
    }
    for (const f of this.arena.fighters) {
      const img = addHeroImage(this, f.x, f.y, f.state.heroId, null, null, evolutionScale(1));
      const key = `${heroArtKey(f.state.heroId, null, null)}:1`;
      const phase = this.fighterViews.size * 0.7;
      const name = text(this, f.x, f.y, f.isBot ? f.state.name : `★ ${f.state.name}`, 15, f.isBot ? "#f0e0d0" : "#ffe14a").setOrigin(0.5, 1);
      const glow = this.add.image(f.x, f.y, img.texture.key, img.frame.name).setOrigin(0.5, 0.97).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
      const arm = this.add.image(f.x, f.y, img.texture.key, img.frame.name).setVisible(false);
      this.fighterViews.set(f.id, {
        img, name, key, lunge: 0, flash: 0, phase, scale: evolutionScale(1), aura: null, auraKey: "",
        texKey: heroTex(this, f.state.heroId, null, null).key, texFrame: heroTex(this, f.state.heroId, null, null).frame, act: null, hit: 0, hitDx: 0, hitDy: 0, glow, dir: 1, turn: 0, arm, armAngle: 0,
        rig: armRig(this, heroTex(this, f.state.heroId, null, null).key, heroTex(this, f.state.heroId, null, null).frame),
      });
    }
    this.ringG = this.add.graphics().setDepth(1);
    // bụi tung dưới chân khi chạy
    this.dust = this.add.particles(0, 0, "dot", {
      speedX: { min: -40, max: 40 },
      speedY: { min: -50, max: -10 },
      lifespan: 420,
      scale: { start: 0.38, end: 0 },
      alpha: { start: 0.55, end: 0 },
      tint: 0xd8ccb8,
      emitting: false,
    }).setDepth(2);
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
    // vật thể lớn: lấy từ trận (va chạm & phá huỷ do lõi tính)
    for (const pr of this.arena.props) {
      const img = this.add.image(pr.x, pr.y, decoTexture(this, pr.kind)).setOrigin(0.5, 0.9).setDepth(pr.y).setFlipX(pr.flip);
      this.propViews.set(pr.id, img);
    }
    const blitters = new Map<DecoKind, Phaser.GameObjects.Blitter>();
    for (const s of BIOME_SECTORS) {
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
    // neo giao diện theo góc màn hình + tránh tai thỏ/viền cong (vùng an toàn)
    const A = (this.anchors = new HudAnchors(this));
    // lớp phủ toàn màn hình: phủ rộng hơn mọi tỉ lệ máy
    this.hazardTint = A.pin(fixed(this.add.rectangle(W / 2, H / 2, W * 2.4, H * 2.4, 0x000000, 0).setOrigin(0.5), 8000), 0, 0);
    this.vignette = A.pin(fixed(this.add.image(W / 2, H / 2, vignetteTexture(this, W, H)).setAlpha(0), 8001), 0, 0);
    // camera zoom làm lệch toạ độ HUD → dùng camera riêng cho HUD
    const hudCam = this.cameras.add(0, 0, W, H);
    hudCam.setName("hud");
    this.hudG = A.pin(fixed(this.add.graphics()), -1, 1);
    this.miniG = A.pin(fixed(this.add.graphics()), -1, -1);
    // cần điều khiển vẽ theo toạ độ chạm thật → không dời
    this.joyG = A.pin(fixed(this.add.graphics(), 9100), 2, 2);
    this.aliveText = A.pin(fixed(text(this, W - 24, 18, "", 30, "#ffe08a").setOrigin(1, 0)), 1, -1);
    this.zoneText = A.pin(fixed(text(this, W - 24, 58, "", 22).setOrigin(1, 0)), 1, -1);
    this.hazardText = A.pin(fixed(text(this, W - 24, 92, "", 22, "#ff7a6a").setOrigin(1, 0)), 1, -1);
    this.statText = A.pin(fixed(text(this, 130, 606, "", 17, "#f3ead8", 500)), -1, 1);
    this.infoText = A.pin(fixed(text(this, 250, 20, "", 18, "#d8d0c0", 500)), -1, -1);
    this.portrait = A.pin(fixed(addHeroImage(this, 68, 700, this.heroId, null, null, 0.62)), -1, 1);
    for (let i = 0; i < 5; i++) this.feed.push(A.pin(fixed(text(this, W - 24, 130 + i * 24, "", 17, "#f3ead8", 500).setOrigin(1, 0)), 1, -1));

    const mk = (slot: SkillButton["slot"], x: number, y: number, r: number, key: string) => {
      // nút kỹ năng neo góc dưới-phải; graphics vẽ theo toạ độ thiết kế nên chỉ dời gốc
      const g = A.pin(fixed(this.add.graphics()), 1, 1);
      const icon = A.pin(fixed(this.add.image(x, y, skillIcon(this, "attack", 0xd06a3a)).setDisplaySize(r * 1.42, r * 1.42).setVisible(slot === "attack")), 1, 1);
      const cdG = A.pin(fixed(this.add.graphics()), 1, 1);
      const label = A.pin(fixed(text(this, x, y, "", r > 50 ? 18 : 15, "#ffffff").setOrigin(0.5)), 1, 1);
      const k = A.pin(fixed(text(this, x + r * 0.62, y - r * 0.82, key, 13, "#ffe08a").setOrigin(0.5)), 1, 1);
      const zone = A.pin(fixed(this.add.zone(x, y, r * 2, r * 2).setInteractive()), 1, 1);
      zone.on("pointerdown", (p: Phaser.Input.Pointer) => {
        if (slot === "attack") this.attackHeld.add(p.id);
        else if (slot === "atk_monster" || slot === "atk_prop") {
          this.attackHeld.add(p.id);
          this.modeHeld.set(p.id, slot === "atk_monster" ? "monster" : "prop");
        }
        else if (slot === "potion") this.pendingPotion = true;
        // giữ nút chiêu để canh chỉnh: kéo để ngắm, thả để tung, chạm nhanh = tự ngắm
        else if (!this.aiming) this.aiming = { slot, pid: p.id, bx: zone.x, by: zone.y, x: p.x, y: p.y, kb: false };
      });
      this.skillButtons.push({ slot, icon, cdG, x, y, r, g, label, key: k });
    };
    mk("attack", 1176, 618, 62, "Space");
    mk("s1", 1052, 650, 40, "Q");
    mk("s2", 1068, 534, 40, "E");
    mk("s3", 1176, 486, 40, "R");
    mk("ult", 948, 598, 46, "F");
    mk("potion", 870, 668, 32, "H");
    // nút nhỏ kiểu Liên Quân: chỉ đánh quái / chỉ phá vật thể
    mk("atk_monster", 1246, 500, 26, "Z");
    mk("atk_prop", 1246, 424, 26, "X");
    // ô hủy chiêu (chỉ hiện khi đang kéo ngắm)
    this.cancelG = A.pin(fixed(this.add.graphics(), 9050), 1, 1);
    this.cancelText = A.pin(fixed(text(this, CANCEL_X, CANCEL_Y, "✕\nHủy", 15, "#ffffff").setOrigin(0.5).setAlign("center").setVisible(false), 9051), 1, 1);
    this.cameras.main.ignore(this.children.list.filter((o) => (o as unknown as { scrollFactorX: number }).scrollFactorX === 0));
    hudCam.ignore(this.children.list.filter((o) => (o as unknown as { scrollFactorX: number }).scrollFactorX !== 0));
    this.onResize();
    this.scale.on("resize", this.onResize, this);
    this.events.once("shutdown", () => this.scale.off("resize", this.onResize, this));
  }

  /** Đổi kích thước/xoay máy: nới camera, giữ diện tích nhìn thấy tương đương, neo lại HUD. */
  private onResize(): void {
    const v = view(this);
    this.cameras.getCamera("hud")?.setSize(v.w, v.h);
    // màn hình dài (20:9, 21:9) không được nhìn xa hơn quá nhiều: giữ diện tích ≈ 1280×720
    this.cameras.main.setZoom(Math.sqrt((v.w * v.h) / (W * H)));
    this.anchors.relayout();
    if (this.modal) this.modal.setPosition(v.ox, v.oy);
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
      this.keys = kb.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,J,Q,E,R,F,H,Z,X,ONE,TWO,THREE,FOUR") as Record<string, Phaser.Input.Keyboard.Key>;
      // giữ phím chiêu: hiện vùng ngắm theo chuột; thả phím: tung chiêu
      const bind = (key: string, slot: SkillSlot) => {
        kb.on(`keydown-${key}`, () => {
          if (!this.aiming && !this.modal) this.aiming = { slot, pid: -2, bx: 0, by: 0, x: 0, y: 0, kb: true };
        });
        kb.on(`keyup-${key}`, () => {
          if (this.aiming?.kb && this.aiming.slot === slot) this.releaseAim();
        });
      };
      bind("Q", "s1");
      bind("ONE", "s1");
      bind("E", "s2");
      bind("TWO", "s2");
      bind("R", "s3");
      bind("THREE", "s3");
      bind("F", "ult");
      bind("FOUR", "ult");
      kb.on("keydown-H", () => (this.pendingPotion = true));
    }
    this.input.on("pointerdown", (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length > 0 || this.modal) return;
      if (p.x < this.scale.gameSize.width * 0.55 && this.joy.id === -1) this.joy = { id: p.id, bx: p.x, by: p.y, x: p.x, y: p.y };
    });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!p.wasTouch) this.mouseSeen = true;
      if (this.aiming && !this.aiming.kb && p.id === this.aiming.pid) {
        this.aiming.x = p.x;
        this.aiming.y = p.y;
      }
      if (p.id === this.joy.id) {
        this.joy.x = p.x;
        this.joy.y = p.y;
      }
    });
    const up = (p: Phaser.Input.Pointer) => {
      if (this.aiming && !this.aiming.kb && p.id === this.aiming.pid) {
        this.aiming.x = p.x;
        this.aiming.y = p.y;
        this.releaseAim();
      }
      if (p.id === this.joy.id) this.joy.id = -1;
      this.attackHeld.delete(p.id);
      this.modeHeld.delete(p.id);
    };
    this.input.on("pointerup", up);
    this.input.on("pointerupoutside", up);
  }

  /** Vị trí ô hủy chiêu trên màn hình (đã neo). */
  private inCancel(x: number, y: number): boolean {
    return this.aiming !== null && !this.aiming.kb && Math.hypot(x - this.cancelText.x, y - this.cancelText.y) < CANCEL_R + 6;
  }

  /** Hướng ngắm hiện tại (null = chưa kéo đủ / chiêu quanh bản thân → tự ngắm). */
  private currentAim(): CastAim | null {
    const am = this.aiming;
    const a = this.arena;
    if (!am) return null;
    const shape = a.aimShape(a.player, am.slot);
    if (!shape || shape.shape === "self") return null;
    if (am.kb) {
      if (!this.mouseSeen) return null;
      const w = this.input.activePointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
      const dx = w.x - a.player.x;
      const dy = w.y - a.player.y;
      const len = Math.hypot(dx, dy);
      if (len < 4) return null;
      return { dx: dx / len, dy: dy / len, dist: shape.shape === "point" ? Math.min(len, shape.range) : shape.range };
    }
    const dx = am.x - am.bx;
    const dy = am.y - am.by;
    const len = Math.hypot(dx, dy);
    if (len < AIM_DEAD) return null;
    const k = Math.min(1, (len - AIM_DEAD * 0.5) / AIM_MAX);
    return { dx: dx / len, dy: dy / len, dist: shape.shape === "point" ? Math.max(0.15, k) * shape.range : shape.range };
  }

  /** Thả nút/phím chiêu: hủy nếu kéo vào ô Hủy, ngược lại tung chiêu theo hướng đã canh. */
  private releaseAim(): void {
    const am = this.aiming;
    if (!am) return;
    if (this.inCancel(am.x, am.y)) {
      this.aiming = null;
      this.note("Đã hủy chiêu", "#c8c0b0");
      return;
    }
    this.pendingAim = this.currentAim();
    this.pendingCast = am.slot;
    this.aiming = null;
  }

  /** Vẽ chỉ dẫn canh chỉnh chiêu (đường bắn / quạt chém / điểm rơi / vòng quanh bản thân). */
  private drawAim(g: Phaser.GameObjects.Graphics): void {
    const am = this.aiming;
    const a = this.arena;
    const p = a.player;
    const showCancel = !!am && !am.kb;
    this.cancelText.setVisible(showCancel);
    this.cancelG.clear();
    if (showCancel) {
      const hot = this.inCancel(am.x, am.y);
      pixelCircle(this.cancelG, CANCEL_X, CANCEL_Y, CANCEL_R, hot ? 0xd83a3a : 0x5a2a2a, { alpha: hot ? 0.95 : 0.75 });
    }
    if (!am || !p.state.alive) return;
    const shape = a.aimShape(p, am.slot);
    if (!shape) return;
    const col = fxColor(p);
    let aim = this.currentAim();
    if (shape.shape === "self") {
      g.fillStyle(col, 0.18).fillCircle(p.x, p.y, shape.radius);
      g.lineStyle(3, col, 0.85).strokeCircle(p.x, p.y, shape.radius);
      return;
    }
    // vòng tầm tối đa
    g.lineStyle(2, 0xffffff, 0.35).strokeCircle(p.x, p.y, shape.range);
    if (!aim) {
      // chưa kéo: chiêu tự ghim vào mục tiêu đang khoá (ưu tiên người chơi) – hiện luôn hướng sẽ bắn
      const lk = a.lockTarget(p, this.currentMode());
      if (!lk) {
        g.fillStyle(0xffffff, 0.05).fillCircle(p.x, p.y, shape.range);
        return;
      }
      const dx = lk.x - p.x;
      const dy = lk.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      aim = { dx: dx / d, dy: dy / d, dist: Math.min(d, shape.range) };
      // dấu ghim trên mục tiêu
      const rr = (lk.isFighter ? 40 : lk.radius * 1.4 + 12) + Math.sin(a.time * 10) * 3;
      g.lineStyle(4, 0xffe14a, 0.95).strokeCircle(lk.x, lk.y - 20, rr);
      g.lineStyle(2, 0xffe14a, 0.95);
      for (const [sx, sy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const)
        g.lineBetween(lk.x + sx * (rr - 8), lk.y - 20 + sy * (rr - 8), lk.x + sx * (rr + 10), lk.y - 20 + sy * (rr + 10));
    }
    const ang = Math.atan2(aim.dy, aim.dx);
    if (shape.shape === "line") {
      const nx = -aim.dy;
      const ny = aim.dx;
      const w = Math.max(14, shape.radius);
      const ex = p.x + aim.dx * shape.range;
      const ey = p.y + aim.dy * shape.range;
      g.fillStyle(col, 0.28);
      g.fillPoints([
        { x: p.x + nx * w, y: p.y + ny * w },
        { x: ex - aim.dx * 30 + nx * w, y: ey - aim.dy * 30 + ny * w },
        { x: ex - aim.dx * 30 - nx * w, y: ey - aim.dy * 30 - ny * w },
        { x: p.x - nx * w, y: p.y - ny * w },
      ] as Phaser.Types.Math.Vector2Like[], true);
      g.fillStyle(col, 0.7).fillTriangle(ex, ey, ex - aim.dx * 34 + nx * w * 1.8, ey - aim.dy * 34 + ny * w * 1.8, ex - aim.dx * 34 - nx * w * 1.8, ey - aim.dy * 34 - ny * w * 1.8);
    } else if (shape.shape === "cone") {
      const half = (shape.arc ?? 1.5) / 2;
      g.fillStyle(col, 0.28);
      g.slice(p.x, p.y, shape.range, ang - half, ang + half, false);
      g.fillPath();
      g.lineStyle(3, col, 0.85);
      g.slice(p.x, p.y, shape.range, ang - half, ang + half, false);
      g.strokePath();
    } else {
      const tx = p.x + aim.dx * aim.dist;
      const ty = p.y + aim.dy * aim.dist;
      g.lineStyle(2, col, 0.6).lineBetween(p.x, p.y, tx, ty);
      g.fillStyle(col, 0.25).fillCircle(tx, ty, shape.radius);
      g.lineStyle(3, col, 0.9).strokeCircle(tx, ty, shape.radius);
    }
  }

  /** Chế độ khoá mục tiêu theo nút đang giữ (mặc định tự động). */
  private currentMode(): TargetMode {
    const k = this.keys;
    if (k?.Z?.isDown) return "monster";
    if (k?.X?.isDown) return "prop";
    for (const m of this.modeHeld.values()) return m;
    return "auto";
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
    const attack = this.attackHeld.size > 0 || !!k?.SPACE?.isDown || !!k?.J?.isDown || !!k?.Z?.isDown || !!k?.X?.isDown;
    const input: FighterInput = { moveX: mx, moveY: my, attack, cast: this.pendingCast, usePotion: this.pendingPotion, targetMode: this.currentMode() };
    if (this.pendingCast) {
      this.castSeq++;
      this.lastCastSlot = this.pendingCast;
      this.lastCastAim = this.pendingAim;
      if (this.pendingAim) input.castAim = this.pendingAim;
    }
    this.pendingAim = null;
    if (this.pendingPotion) this.potionSeq++;
    this.pendingCast = null;
    this.pendingPotion = false;
    return input;
  }

  // ------------------------------------------------------------------ vòng lặp
  override update(_t: number, deltaMs: number): void {
    const a = this.arena;
    const real = this.game.loop.rawDelta || deltaMs;
    if (this.net?.role === "client") {
      this.updateClient(Math.min(0.25, real / 1000));
      this.render();
      return;
    }
    const needs = !this.ending && !this.spectating && a.playerNeedsChoice() && !a.player.bot;
    if (needs && !this.modal) this.openChoice();
    // chơi một mình: tạm dừng khi chọn; chơi chung: trận vẫn chạy
    if (needs && !this.net) {
      this.render();
      return;
    }
    if (!this.ending || (this.net && !a.finished)) {
      // dùng thời gian thật (delta của Phaser bị làm mượt, chậm hơn thực tế khi máy yếu)
      this.acc += Math.min(0.25, real / 1000) * this.timeScale;
      let steps = 0;
      while (this.acc >= STEP && steps < 60 * Math.max(1, this.timeScale / 2)) {
        this.acc -= STEP;
        steps++;
        const input = this.readInput();
        const ev = this.net ? a.tickMulti(STEP, this.hostInputs(input)) : a.tick(STEP, input);
        if (this.net) this.eventLog.push(ev, a.time, new Set(this.net.humans.map((h) => h.id)));
        this.handleEvents(ev);
        if (!this.net && (this.ending || a.playerNeedsChoice())) break;
      }
    }
    if (this.net) this.hostBroadcast(real / 1000);
    this.render();
  }

  // ------------------------------------------------------------------ chơi chung: chủ phòng
  /** Thao tác của mọi người chơi thật: của mình đọc tại chỗ, của người khác đọc từ phòng. */
  private hostInputs(local: FighterInput): Record<string, FighterInput> {
    const net = this.net;
    const out: Record<string, FighterInput> = { [this.arena.playerId]: this.spectating ? IDLE_INPUT : local };
    if (!net) return out;
    const peers = net.room.peers();
    for (const h of net.humans) {
      if (h.id === this.arena.playerId) continue;
      const pr = peers.find((p) => p.peer === h.peer)?.presence as { in?: unknown; c?: unknown } | undefined;
      if (!pr) continue;
      let ri = this.remoteInputs.get(h.id);
      if (!ri) {
        ri = new RemoteInput();
        this.remoteInputs.set(h.id, ri);
      }
      out[h.id] = ri.decode(pr.in);
      const ch = ri.choice(pr.c);
      if (ch) this.applyChoice(h.id, ch.kind, ch.id);
    }
    return out;
  }

  private applyChoice(fighterId: string, kind: number, id: string): boolean {
    const a = this.arena;
    if (kind === 0) return a.chooseBranch(fighterId, id);
    if (kind === 1) return a.chooseEvolution(fighterId, id);
    const f = a.fighterById(fighterId);
    const ch = f?.state.pendingOffers[0]?.find((c) => c.upgradeId === id || c.id === id);
    return ch ? a.chooseUpgrade(fighterId, ch.id) : false;
  }

  /** Phát ảnh chụp trạng thái trận ~15 lần/giây. */
  private hostBroadcast(dt: number): void {
    const net = this.net;
    if (!net) return;
    this.snapTimer -= dt;
    if (this.snapTimer > 0) return;
    this.snapTimer = 1 / 15;
    const room = net.room;
    const me = room.peers().find((p) => p.isMe && p.sameTab);
    const others = me ? JSON.stringify({ ...me.presence, s: undefined }).length : 1200;
    const snap = encodeSnapshot(this.arena, this.eventLog, net.humans.map((h) => h.id), Math.max(1500, 3950 - others));
    void room.presence({ s: snap }).catch(() => undefined);
  }

  // ------------------------------------------------------------------ chơi chung: khách
  private updateClient(dt: number): void {
    const net = this.net;
    if (!net) return;
    const a = this.arena;
    const now = Date.now();
    const host = net.room.peers().find((p) => p.peer === net.hostPeer);
    if (!host) {
      if (!this.hostGoneSince) this.hostGoneSince = now;
      if (now - this.hostGoneSince > 5000 && !this.ending) {
        this.note("Chủ phòng đã rời – trận kết thúc", "#ff9a8a");
        this.endMatch(false);
      }
    } else this.hostGoneSince = 0;
    const snap = host?.presence.s as Snapshot | undefined;
    if (snap && typeof snap === "object" && snap.v === 1 && snap.t !== this.lastSnapT) {
      this.lastSnapT = snap.t;
      // giữ vị trí đang hiển thị, chỉ lấy đích (trượt dần tới cho mượt)
      const keep = new Map(a.fighters.map((f) => [f.id, { x: f.x, y: f.y, alive: f.state.alive }]));
      const keepM = new Map(a.monsters.map((m) => [m.id, { x: m.x, y: m.y, alive: m.alive }]));
      const r = applySnapshot(a, snap, this.lastSeq);
      for (const f of a.fighters) {
        const k = keep.get(f.id);
        if (k && k.alive && f.state.alive) {
          f.x = k.x;
          f.y = k.y;
        }
      }
      for (const m of a.monsters) {
        const k = keepM.get(m.id);
        if (k && k.alive && m.alive) {
          m.x = k.x;
          m.y = k.y;
        }
      }
      this.lastSeq = r.lastSeq;
      this.netTargets = r.targets;
      this.handleEvents(r.events);
    }
    // thao tác của mình: gửi lên chủ phòng + đoán trước chuyển động
    const input = this.readInput();
    const me = a.player;
    if (me.state.alive && !this.ending) {
      const sp = a.speedOf(me);
      me.x += input.moveX * sp * dt;
      me.y += input.moveY * sp * dt;
      if (Math.hypot(input.moveX, input.moveY) > 0.1) {
        const l = Math.hypot(input.moveX, input.moveY);
        me.faceX = input.moveX / l;
        me.faceY = input.moveY / l;
        me.vx = input.moveX * sp;
        me.vy = input.moveY * sp;
      }
      const d = Math.hypot(me.x - WORLD_CENTER, me.y - WORLD_CENTER);
      if (d > ISLAND_RADIUS - 30) {
        me.x = WORLD_CENTER + ((me.x - WORLD_CENTER) / d) * (ISLAND_RADIUS - 30);
        me.y = WORLD_CENTER + ((me.y - WORLD_CENTER) / d) * (ISLAND_RADIUS - 30);
      }
      a.collideProps(me, 18);
    }
    this.inputTimer -= dt;
    if (this.inputTimer <= 0) {
      this.inputTimer = 1 / 20;
      const patch: Record<string, unknown> = { in: encodeInput(input, this.castSeq, this.lastCastSlot, this.potionSeq, this.lastCastAim) };
      if (this.lastChoice) patch.c = this.lastChoice;
      void net.room.presence(patch).catch(() => undefined);
    }
    // trượt dần tới vị trí chủ phòng gửi
    const t = this.netTargets;
    if (t) {
      const k = Math.min(1, dt * 12);
      for (const f of a.fighters) {
        const g = t.fighters.get(f.id);
        if (!g) continue;
        const own = f.id === a.playerId;
        const gap = Math.hypot(g.x - f.x, g.y - f.y);
        if (gap > (own ? 160 : 300)) {
          f.x = g.x;
          f.y = g.y;
        } else {
          const kk = own ? Math.min(1, dt * 4) : k;
          f.x += (g.x - f.x) * kk;
          f.y += (g.y - f.y) * kk;
        }
      }
      for (const m of a.monsters) {
        const g = t.monsters.get(m.id);
        if (!g) continue;
        m.x += (g.x - m.x) * k;
        m.y += (g.y - m.y) * k;
      }
    }
    for (const p of a.projectiles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    // bảng chọn (không tạm dừng; chờ chủ phòng xác nhận lựa chọn trước khi mở lại)
    if (!this.ending && !this.modal && me.state.alive && now > this.choiceWaitUntil && a.playerNeedsChoice()) this.openChoice();
  }

  /** Chọn Dạng 2 (0) / Dạng 3 (1) / thẻ (2): chơi chung gửi lên chủ phòng, còn lại áp dụng ngay. */
  private choose(kind: number, id: string): boolean {
    if (this.net?.role === "client") {
      this.choiceSeq++;
      this.lastChoice = [this.choiceSeq, kind, id];
      this.choiceWaitUntil = Date.now() + 1200;
      void this.net.room.presence({ c: this.lastChoice }).catch(() => undefined);
      return true;
    }
    return this.applyChoice(this.arena.playerId, kind, id);
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
          const tf = a.fighterById(e.targetId);
          if (tv && tf) {
            tv.flash = 0.1;
            tv.hit = 0.18;
            const src = a.fighterById(e.sourceId);
            const sxp = src ? src.x : e.x - tf.faceX * 10;
            const syp = src ? src.y : e.y - tf.faceY * 10;
            const d = Math.hypot(tf.x - sxp, tf.y - syp) || 1;
            tv.hitDx = (tf.x - sxp) / d;
            tv.hitDy = (tf.y - syp) / d;
          }
          break;
        }
        case "fx": {
          this.spawnFx(e);
          break;
        }
        case "eliminated": {
          const v = a.fighterById(e.victimId);
          const k = e.killerId ? a.fighterById(e.killerId) : null;
          const how = e.cause === "zone" ? "bị vòng bo nuốt chửng" : e.cause === "monster" ? "bị quái hạ gục" : `bị ${k?.state.name ?? "?"} hạ gục`;
          this.pushFeed(`☠ ${v?.state.name ?? "?"} ${how} (hạng ${e.placement})`, e.victimId === pid || e.killerId === pid ? "#ffb347" : "#e8d8c8");
          if (v) this.deathFx(v, true);
          if (e.victimId === pid) this.endMatch(false);
          break;
        }
        case "prop_hit": {
          const img = this.propViews.get(e.propId);
          if (img && this.nearCamera(img.x, img.y)) {
            img.setTintFill(0xffffff);
            this.time.delayedCall(60, () => img.clearTint());
            const x0 = img.x;
            this.tweens.add({ targets: img, x: x0 + 4, duration: 40, yoyo: true, repeat: 1, onComplete: () => img.setX(x0) });
          }
          break;
        }
        case "prop_destroyed": {
          const img = this.propViews.get(e.propId);
          if (img) {
            this.propViews.delete(e.propId);
            if (this.nearCamera(e.x, e.y)) {
              const col = PROP_DEBRIS[e.kind] ?? 0x8a7a6a;
              const em = this.worldOnly(
                this.add.particles(e.x, e.y - 30, "dot", { speed: { min: 80, max: 300 }, angle: { min: 200, max: 340 }, gravityY: 600, lifespan: 700, scale: { start: 0.6, end: 0.1 }, tint: [col, 0xffffff], emitting: false }),
              ).setDepth(e.y + 1);
              em.explode(22);
              this.time.delayedCall(900, () => em.destroy());
              this.tweens.add({ targets: img, scaleY: 0.2, alpha: 0, angle: (Math.random() - 0.5) * 40, duration: 260, onComplete: () => img.destroy() });
            } else img.destroy();
          }
          break;
        }
        case "act": {
          const av = this.fighterViews.get(e.fighterId);
          const af = a.fighterById(e.fighterId);
          if (!av || !af) break;
          // lớp cầm gậy/trượng: đánh thường = vung gậy; cung/súng: giật khi bắn
          const staff = STAFF_CLASSES.has(af.state.heroId);
          const kind = e.action === "ult" ? "ult" : e.action === "cast" ? "cast" : e.melee ? "melee" : staff ? "wave" : "shot";
          av.act = { kind, t: 0, dur: kind === "melee" ? 0.36 : kind === "wave" ? 0.32 : kind === "shot" ? 0.2 : kind === "ult" ? 0.7 : 0.45, dx: e.dirX, dy: e.dirY, color: e.color };
          if (this.nearCamera(af.x, af.y)) {
            if (kind === "melee") this.slashFx(af.x, af.y - 50 * av.scale, e.dirX, e.dirY, e.color, av.scale);
            else if (kind === "shot") this.muzzleFx(af.x + e.dirX * 40, af.y - 60 * av.scale + e.dirY * 20, e.color);
            else if (kind === "wave") this.time.delayedCall(90, () => this.muzzleFx(af.x + e.dirX * 55, af.y - 90 * av.scale + e.dirY * 20, e.color));
          }
          break;
        }
        case "downed": {
          const v = a.fighterById(e.victimId);
          const k = e.killerId ? a.fighterById(e.killerId) : null;
          if (v) this.deathFx(v, false);
          this.pushFeed(`✚ ${v?.state.name ?? "?"} gục${k ? ` bởi ${k.state.name}` : ""} – sẽ hồi sinh`, e.victimId === pid ? "#ffb347" : "#b8d8c8");
          if (e.victimId === pid) this.note("BẠN ĐÃ GỤC – hồi sinh sau 5 giây (mất hết đồ & kinh nghiệm)", "#ff9a8a");
          break;
        }
        case "respawned":
          if (e.fighterId === pid) this.note("ĐÃ HỒI SINH! Không còn mạng hồi sinh nào nữa", "#8aff9a");
          break;
        case "victory":
          if (this.spectating && this.net?.role === "host") {
            const w = a.fighterById(e.winnerId);
            this.pushFeed(`🏆 ${w?.state.name ?? "?"} là THE LAST HERO!`, "#ffe14a");
            this.spectating = false;
            this.endMatch(false);
          }
          if (e.winnerId === pid) this.endMatch(true);
          break;
        case "monster_killed": {
          const mm = a.monsters.find((m) => m.id === e.monsterId);
          const mimg = this.monsterViews.get(e.monsterId);
          if (mm && mimg && this.nearCamera(mm.x, mm.y)) this.monsterDeathFx(mimg, mm.def.color);
          if (e.killerId === pid) {
            dirty = completeTutorialStep(save, "hunt_monsters_and_loot") || dirty;
            if (e.isBoss) this.note("Đã hạ Boss! +Tinh Hoa Boss", "#ffb347");
          }
          break;
        }
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
    // chủ phòng bị loại khi trận chưa xong: tiếp tục chạy trận cho người khác (xem)
    if (this.net?.role === "host" && !won && !this.arena.finished) {
      if (!this.spectating) {
        this.spectating = true;
        this.pushFeed("Bạn đã bị loại – máy bạn vẫn chạy trận cho mọi người, đừng tắt trang", "#ffb347");
        this.followNextHuman();
      }
      return;
    }
    this.ending = true;
    const s = this.arena.playerSummary();
    this.pushFeed(won ? "🏆 BẠN LÀ THE LAST HERO!" : `Bạn đã bị loại – hạng ${s.placement}`, won ? "#ffe14a" : "#ff9a8a");
    this.time.delayedCall(won || this.net?.role === "host" ? 2800 : 1600, () => {
      if (this.net) void leaveNet();
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

  /** Đặt lớp tay + vũ khí: gắn ở vai của thân (theo vị trí/tỉ lệ/lật/xoay của thân), xoay thêm theo động tác. */
  private placeArm(v: FighterView, armA: number, walkI: number): void {
    const r = v.rig;
    if (!r || !v.img.visible) {
      v.arm.setVisible(false);
      return;
    }
    v.armAngle += (armA - v.armAngle) * 0.6;
    const img = v.img;
    const flip = img.flipX;
    let lx = r.px - r.w * 0.5;
    const ly = r.py - r.h * 0.97 + (walkI >= 0 ? ([3, -3, 3, -3][walkI] ?? 0) : 0);
    if (flip) lx = -lx;
    const sx = lx * img.scaleX;
    const sy = ly * img.scaleY;
    const c = Math.cos(img.rotation);
    const sn = Math.sin(img.rotation);
    // hướng "phía trước" của hình gốc là bên cầm vũ khí; lật hình thì đảo chiều xoay
    const native = r.side;
    v.arm
      .setTexture(r.armKey)
      .setVisible(true)
      .setFlipX(flip)
      .setOrigin(flip ? 1 - r.px / r.w : r.px / r.w, r.py / r.h)
      .setPosition(img.x + sx * c - sy * sn, img.y + sx * sn + sy * c)
      .setRotation(img.rotation + v.armAngle * native * (flip ? -1 : 1))
      .setScale(img.scaleX, img.scaleY)
      .setDepth(img.depth + 0.2)
      .setAlpha(img.alpha);
    if (img.isTinted && img.tintFill) v.arm.setTintFill(img.tintTopLeft);
    else if (img.isTinted) v.arm.setTint(img.tintTopLeft);
    else v.arm.clearTint();
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

  private nearCamera(x: number, y: number): boolean {
    const c = this.cameras.main;
    return Math.abs(x - c.midPoint.x) < 900 && Math.abs(y - c.midPoint.y) < 600;
  }

  /** Vệt chém hình lưỡi liềm quét qua theo hướng đánh. */
  private slashFx(x: number, y: number, dx: number, dy: number, color: number, scale: number): void {
    const g = this.worldOnly(this.add.graphics().setDepth(5600));
    const base = Math.atan2(dy, dx);
    const R = 95 * scale + 30;
    const state = { p: 0 };
    const draw = () => {
      g.clear();
      const a0 = base - 1.7;
      const a1 = a0 + 3.4 * Math.min(1, state.p * 1.8);
      const n = 14;
      const outer: Phaser.Math.Vector2[] = [];
      const inner: Phaser.Math.Vector2[] = [];
      for (let i = 0; i <= n; i++) {
        const ang = a0 + ((a1 - a0) * i) / n;
        const thick = Math.sin((i / n) * Math.PI) * 28 * scale + 3;
        outer.push(new Phaser.Math.Vector2(x + Math.cos(ang) * R, y + Math.sin(ang) * R * 0.75));
        inner.push(new Phaser.Math.Vector2(x + Math.cos(ang) * (R - thick), y + Math.sin(ang) * (R - thick) * 0.75));
      }
      const pts = [...outer, ...inner.reverse()];
      const al = 1 - Math.max(0, state.p - 0.5) * 2;
      g.fillStyle(color, 0.75 * al).fillPoints(pts, true);
      g.lineStyle(3, 0xffffff, 0.95 * al).strokePoints(outer, false);
    };
    draw();
    this.tweens.add({ targets: state, p: 1, duration: 260, delay: 90, onUpdate: draw, onComplete: () => g.destroy() });
    // tia lửa cuối đường chém
    this.time.delayedCall(200, () => {
      const ex = x + Math.cos(base + 1.2) * R;
      const ey = y + Math.sin(base + 1.2) * R * 0.75;
      const em = this.worldOnly(this.add.particles(ex, ey, "dot", { speed: { min: 80, max: 260 }, lifespan: 300, scale: { start: 0.4, end: 0 }, tint: [0xffffff, color], blendMode: "ADD", emitting: false })).setDepth(5601);
      em.explode(10);
      this.time.delayedCall(400, () => em.destroy());
    });
  }

  /** Bóng mờ của nhân vật (vệt chuyển động khi vung đòn). */
  private afterImage(v: FighterView, color: number): void {
    const gh = this.worldOnly(this.add.image(v.img.x, v.img.y, v.img.texture.key, v.img.frame.name))
      .setOrigin(0.5, 0.97)
      .setScale(v.img.scaleX, v.img.scaleY)
      .setRotation(v.img.rotation)
      .setFlipX(v.img.flipX)
      .setDepth(v.img.depth - 0.5)
      .setTintFill(color)
      .setAlpha(0.35)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: gh, alpha: 0, duration: 160, onComplete: () => gh.destroy() });
  }

  /** Loé sáng đầu vũ khí khi bắn. */
  private muzzleFx(x: number, y: number, color: number): void {
    const g = this.worldOnly(this.add.graphics().setDepth(5600).setBlendMode(Phaser.BlendModes.ADD));
    g.fillStyle(color, 0.8).fillCircle(x, y, 14);
    g.fillStyle(0xffffff, 0.9).fillCircle(x, y, 6);
    this.tweens.add({ targets: g, alpha: 0, duration: 140, onComplete: () => g.destroy() });
  }

  /** Ngã xuống, chìm & mờ dần, linh hồn bay lên; bị loại thì để lại bia mộ. */
  private deathFx(f: Arena["fighters"][number], eliminated: boolean): void {
    const v = this.fighterViews.get(f.id);
    if (!v) return;
    const corpse = this.worldOnly(this.add.image(v.img.x, v.img.y, v.texKey, v.texFrame))
      .setOrigin(0.5, 0.97)
      .setScale(v.scale)
      .setFlipX(v.img.flipX)
      .setDepth(f.y)
      .setTintFill(0xffffff);
    const side = v.img.flipX ? 1 : -1;
    this.time.delayedCall(90, () => corpse.clearTint().setTint(0x9a9ab0));
    this.tweens.add({ targets: corpse, rotation: side * 1.45, y: corpse.y + 8, duration: 420, ease: "Bounce.easeOut" });
    this.tweens.add({ targets: corpse, alpha: 0, delay: 900, duration: 700, onComplete: () => corpse.destroy() });
    if (this.nearCamera(f.x, f.y)) {
      const em = this.worldOnly(
        this.add.particles(f.x, f.y - 50, "dot", {
          speedY: { min: -140, max: -60 },
          speedX: { min: -30, max: 30 },
          lifespan: 1200,
          scale: { start: 0.6, end: 0 },
          alpha: { start: 0.9, end: 0 },
          tint: [0xd8e8ff, 0x9ad8ff],
          blendMode: "ADD",
          emitting: false,
        }),
      ).setDepth(6000);
      em.explode(24);
      this.time.delayedCall(1400, () => em.destroy());
    }
    // dấu tại chỗ: bia mộ (bị loại) hoặc dấu ✚ (chờ hồi sinh)
    const mark = eliminated
      ? this.worldOnly(this.add.image(f.x, f.y, decoTexture(this, "grave")).setOrigin(0.5, 0.9).setDepth(f.y - 1).setAlpha(0))
      : this.worldOnly(text(this, f.x, f.y - 20, "✚", 34, "#6affb0").setOrigin(0.5).setDepth(f.y - 1).setAlpha(0));
    this.tweens.add({ targets: mark, alpha: 1, delay: 600, duration: 300 });
    this.tweens.add({ targets: mark, alpha: 0, delay: eliminated ? 9000 : 4800, duration: 600, onComplete: () => mark.destroy() });
  }

  /** Quái chết: bẹp xuống rồi tan thành hạt. */
  private monsterDeathFx(img: Phaser.GameObjects.Image, color: number): void {
    const ghost = this.worldOnly(this.add.image(img.x, img.y, img.texture.key).setScale(img.scaleX).setFlipX(img.flipX).setDepth(img.depth).setTintFill(0xffffff));
    this.time.delayedCall(70, () => ghost.clearTint());
    this.tweens.add({ targets: ghost, scaleY: img.scaleY * 0.2, scaleX: img.scaleX * 1.4, alpha: 0, duration: 380, ease: "Quad.easeIn", onComplete: () => ghost.destroy() });
    const em = this.worldOnly(
      this.add.particles(img.x, img.y, "dot", { speed: { min: 60, max: 200 }, lifespan: 500, scale: { start: 0.5, end: 0 }, tint: color, emitting: false }),
    ).setDepth(5600);
    em.explode(16);
    this.time.delayedCall(700, () => em.destroy());
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

  /** Camera theo người chơi thật còn sống (khi chủ phòng đang xem). */
  private followNextHuman(): void {
    const a = this.arena;
    const ids = new Set(this.net?.humans.map((h) => h.id) ?? []);
    const t = a.fighters.find((f) => f.state.alive && ids.has(f.id)) ?? a.fighters.find((f) => f.state.alive);
    const v = t ? this.fighterViews.get(t.id) : undefined;
    if (v) this.cameras.main.startFollow(v.img, true, 0.15, 0.15);
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
          v.glow.setVisible(false);
          v.arm.setVisible(false);
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
      // hướng lên → mặt sau (khi đi hoặc khi đánh lên)
      const back = f.faceY < -0.55;
      const key = `${heroArtKey(f.state.heroId, f.state.branchId, f.state.evolutionId, back)}:${f.state.level}`;
      if (key !== v.key) {
        const evolved = v.key !== "" && v.scale < evolutionScale(f.state.level);
        v.key = key;
        v.scale = evolutionScale(f.state.level);
        const tx = heroTex(this, f.state.heroId, f.state.branchId, f.state.evolutionId, back);
        v.texKey = tx.key;
        v.texFrame = tx.frame;
        v.rig = armRig(this, tx.key, tx.frame);
        if (evolved) this.evolveBurst(f.x, f.y, fxColor(f));
      }
      // ---- hoạt ảnh ----
      const dtv = this.game.loop.delta / 1000;
      v.flash = Math.max(0, v.flash - dtv);
      v.hit = Math.max(0, v.hit - dtv);
      v.turn = Math.max(0, v.turn - dtv);
      // quay trái/phải theo hướng đi hoặc hướng đánh (có ngưỡng để không lật liên tục)
      const wantDir: 1 | -1 = f.faceX > 0.15 ? 1 : f.faceX < -0.15 ? -1 : v.dir;
      if (wantDir !== v.dir) {
        v.dir = wantDir;
        v.turn = 0.12;
      }
      // đi/chạy: 4 khung bước chân, nhịp theo tốc độ
      const stepRate = 6 + speed / 40;
      const walkI = moving ? Math.floor((t * stepRate + v.phase) % WALK_FRAMES) : -1;
      const bodyKey = v.rig ? v.rig.bodyKey : v.texKey;
      const bodyFrame = v.rig ? undefined : v.texFrame;
      if (walkI >= 0) {
        v.img.setTexture(walkFrameKey(this, bodyKey, bodyFrame, walkI));
        // chân chạm đất (khung 0 và 2) → tung bụi
        if ((walkI === 0 || walkI === 2) && this.lastStep.get(f.id) !== walkI && this.nearCamera(f.x, f.y)) this.dust.emitParticleAt(f.x - f.faceX * 12, f.y - 2, 3);
        this.lastStep.set(f.id, walkI);
      } else v.img.setTexture(bodyKey, bodyFrame);
      // góc tay: >0 là vung về phía trước-xuống, <0 là giơ lên ra sau
      let armA = moving ? Math.sin(t * stepRate * Math.PI * 0.5 + v.phase) * 0.22 : Math.sin(t * 3 + v.phase) * 0.05;
      const tt = t * 3 + v.phase;
      let sx = 1 - Math.sin(tt) * 0.012;
      let sy = 1 + Math.sin(tt) * 0.026;
      // chạy: người nghiêng về hướng chạy
      let rot = moving ? (f.vx / Math.max(1, speed)) * 0.13 * Math.min(1, speed / 300) : 0;
      let ox = 0;
      let oy = 0;
      // hành động
      let glowA = 0;
      if (v.act) {
        v.act.t += dtv;
        const p = Math.min(1, v.act.t / v.act.dur);
        const side = v.act.dx < -0.1 ? -1 : 1;
        if (v.act.kind === "wave") armA = 0.8 * (p < 0.3 ? -1.1 * (p / 0.3) : p < 0.55 ? -1.1 + 2.9 * ((p - 0.3) / 0.25) : 1.8 * (1 - (p - 0.55) / 0.45));
        else if (v.act.kind === "melee") armA = p < 0.3 ? -1.1 * (p / 0.3) : p < 0.55 ? -1.1 + 2.9 * ((p - 0.3) / 0.25) : 1.8 * (1 - (p - 0.55) / 0.45);
        else if (v.act.kind === "shot") armA = -0.3 * Math.sin(p * Math.PI);
        else armA = -1.3 * Math.sin(p * Math.PI);
        if (v.act.kind === "melee") {
          // lấy đà ngả ra sau (0–30%), vung mạnh tới (30–55%), giữ thế rồi thu về
          let swing: number;
          if (p < 0.3) swing = -(p / 0.3) * 0.45;
          else if (p < 0.55) swing = -0.45 + ((p - 0.3) / 0.25) * 1.05;
          else swing = 0.6 * (1 - (p - 0.55) / 0.45);
          rot += swing * side;
          const lk = p < 0.3 ? -(p / 0.3) * 0.25 : Math.sin(Math.min(1, (p - 0.3) / 0.7) * Math.PI);
          ox = v.act.dx * lk * 30;
          oy = v.act.dy * lk * 16;
          sx *= 1 + Math.max(0, lk) * 0.1 - (p < 0.3 ? 0.06 : 0);
          sy *= 1 - Math.max(0, lk) * 0.04 + (p < 0.3 ? 0.06 : 0);
          // bóng mờ nối đuôi lúc vung
          if (p > 0.3 && p < 0.6 && this.nearCamera(f.x, f.y) && Math.random() < 0.6) this.afterImage(v, v.act.color);
        } else if (v.act.kind === "wave") {
          // vung gậy: thân nghiêng theo nhịp vung, nhẹ hơn chém
          const sw = p < 0.3 ? -(p / 0.3) * 0.2 : p < 0.55 ? -0.2 + ((p - 0.3) / 0.25) * 0.45 : 0.25 * (1 - (p - 0.55) / 0.45);
          rot += sw * side;
          ox = v.act.dx * Math.max(0, Math.sin(p * Math.PI)) * 8;
        } else if (v.act.kind === "shot") {
          // giật lùi khi bắn
          const rk = Math.sin(p * Math.PI);
          ox = -v.act.dx * rk * 13;
          oy = -v.act.dy * rk * 6;
          rot -= side * rk * 0.16;
          sx *= 1 + rk * 0.06;
          sy *= 1 - rk * 0.05;
        } else {
          // tung chiêu: vươn người lên, toả sáng
          const up = Math.sin(p * Math.PI);
          sy *= 1 + up * (v.act.kind === "ult" ? 0.16 : 0.1);
          sx *= 1 - up * 0.06;
          oy = -up * (v.act.kind === "ult" ? 12 : 6);
          glowA = up * (v.act.kind === "ult" ? 0.85 : 0.6);
        }
        if (p >= 1) v.act = null;
      } else if (moving) {
        oy = -Math.abs(Math.sin(t * stepRate * Math.PI * 0.5 + v.phase)) * 3;
      }
      // trúng đòn: bị đẩy lùi
      if (v.hit > 0) {
        const k = v.hit / 0.18;
        ox += v.hitDx * k * 10;
        oy += v.hitDy * k * 6;
        rot += -(v.hitDx >= 0 ? 1 : -1) * k * 0.1;
      }
      // động tác quay người: co chiều ngang trong chốc lát
      if (v.turn > 0) sx *= 1 - 0.45 * Math.sin((v.turn / 0.12) * Math.PI);
      const native = nativeFacing(this, v.texKey, v.texFrame);
      v.img
        .setPosition(f.x + ox, f.y + oy)
        .setDepth(f.y)
        .setFlipX(v.dir !== native)
        .setRotation(rot)
        .setOrigin(0.5, 0.97)
        .setScale(v.scale * sx, v.scale * sy);
      // loé: trắng (chí mạng/hồi sinh) hoặc đỏ (trúng đòn)
      // trúng đòn: loé trắng rất ngắn rồi ửng đỏ
      if (v.flash > 0.06) v.img.setTintFill(0xffffff);
      else if (v.hit > 0) v.img.setTint(0xff8080);
      else v.img.clearTint();
      // lớp sáng khi tung chiêu
      if (glowA > 0.01) {
        v.glow
          .setTexture(v.img.texture.key, v.img.frame.name)
          .setVisible(true)
          .setPosition(v.img.x, v.img.y)
          .setDepth(f.y + 0.5)
          .setFlipX(v.img.flipX)
          .setRotation(v.img.rotation)
          .setScale(v.img.scaleX * 1.06, v.img.scaleY * 1.06)
          .setTintFill(v.act?.color ?? fxColor(f))
          .setAlpha(glowA);
      } else v.glow.setVisible(false);
      this.placeArm(v, armA, walkI);
      v.name.setPosition(f.x, f.y - 30 - HERO_FIGURE_H * v.scale).setDepth(5003);
      this.updateAura(f, v);
    }
    for (const m of a.monsters) {
      const img = this.monsterViews.get(m.id);
      if (!img) continue;
      img.setVisible(m.alive);
      if (!m.alive) continue;
      // hoạt ảnh: bước chân/vỗ cánh khi di chuyển, thở chậm khi đứng; quay mặt theo hướng đi
      let st = this.monsterAnim.get(m.id);
      if (!st) {
        st = { px: m.x, py: m.y, face: 1, moving: 0 };
        this.monsterAnim.set(m.id, st);
      }
      const mdx = m.x - st.px;
      const md = Math.hypot(mdx, m.y - st.py);
      st.moving = md > 0.4 ? 0.25 : Math.max(0, st.moving - this.game.loop.delta / 1000);
      if (Math.abs(mdx) > 0.3) st.face = mdx > 0 ? 1 : -1;
      st.px = m.x;
      st.py = m.y;
      const ph = (m.homeX % 7) * 0.3;
      const fr = st.moving > 0 ? Math.floor(t * 7 + ph) % 2 : Math.floor(t * 1.6 + ph) % 2;
      const key = monsterTexture(this, m.def, fr);
      if (img.texture.key !== key) img.setTexture(key);
      const breath = st.moving > 0 ? 0 : Math.sin(t * 3 + ph) * 0.025;
      const ms = monsterDisplayScale(m.def);
      img.setFlipX(st.face < 0).setScale(ms * (1 - breath * 0.5), ms * (1 + breath)).setPosition(m.x, m.y).setDepth(m.y);
    }
    // vòng sáng dưới chân (màu nhánh; người chơi viền vàng)
    const rg = this.ringG;
    rg.clear();
    // vòng ngắm đỏ tại mục tiêu tự khoá
    if (a.player.state.alive && !a.player.bot) {
      const lk = a.lockTarget(a.player, this.currentMode());
      if (lk) {
        const rr = (lk.isFighter ? 46 : lk.radius * 1.6 + 16) + Math.sin(t * 8) * 4;
        rg.lineStyle(3, 0xff3a3a, 0.9).strokeEllipse(lk.x, lk.y, rr * 2, rr * 0.75);
        for (let k = 0; k < 4; k++) {
          const ang = (k / 4) * Math.PI * 2 + t * 2;
          const cx = lk.x + Math.cos(ang) * rr;
          const cy = lk.y + Math.sin(ang) * rr * 0.375;
          rg.fillStyle(0xff3a3a, 1).fillTriangle(cx, cy, cx - Math.cos(ang) * 12 - Math.sin(ang) * 7, cy - Math.sin(ang) * 4.5 + Math.cos(ang) * 4, cx - Math.cos(ang) * 12 + Math.sin(ang) * 7, cy - Math.sin(ang) * 4.5 - Math.cos(ang) * 4);
        }
      }
    }
    this.drawAim(rg);
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
      const fv = this.fighterViews.get(f.id);
      if (fv?.act && (fv.act.kind === "cast" || fv.act.kind === "ult")) {
        const p = Math.min(1, fv.act.t / fv.act.dur);
        const big = fv.act.kind === "ult" ? 1.5 : 1;
        const r = (50 + p * 40) * big;
        const al = Math.sin(p * Math.PI);
        const col = fv.act.color;
        rg.lineStyle(4, col, 0.9 * al).strokeEllipse(f.x, f.y, r * 2.2, r * 0.8);
        rg.lineStyle(2, 0xffffff, 0.7 * al).strokeEllipse(f.x, f.y, r * 1.7, r * 0.6);
        for (let k = 0; k < 8; k++) {
          const ang = (k / 8) * Math.PI * 2 + t * 3;
          rg.fillStyle(col, al).fillRect(f.x + Math.cos(ang) * r * 0.97 - 4, f.y + Math.sin(ang) * r * 0.35 - 4, 8, 8);
        }
        if (fv.act.kind === "ult") rg.fillStyle(col, 0.18 * al).fillRect(f.x - 26, f.y - 260, 52, 260);
      }
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
    for (const pr of a.props) {
      if (!pr.alive || pr.maxHp === 0 || pr.hp >= pr.maxHp) continue;
      const w = 44;
      b.fillStyle(0x0b0f18, 0.85).fillRect(pr.x - w / 2 - 1, pr.y + 6, w + 2, 6);
      b.fillStyle(0xd0b070, 1).fillRect(pr.x - w / 2, pr.y + 7, (w * pr.hp) / pr.maxHp, 4);
    }
    for (const m of a.monsters) {
      if (!m.alive || m.hp >= m.maxHp) continue;
      const w = m.def.isBoss ? 90 : 40;
      // trên đầu quái (hình mới cao hơn hình tròn cũ)
      const by = m.y - (this.monsterViews.get(m.id)?.displayHeight ?? m.def.size * 2) * 0.44;
      b.fillStyle(0x0b0f18, 0.85).fillRect(m.x - w / 2 - 1, by - 1, w + 2, 6);
      b.fillStyle(m.def.isBoss ? 0xff8a2a : 0xd0b040, 1).fillRect(m.x - w / 2, by, (w * m.hp) / m.maxHp, 4);
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
      } else if (sb.slot === "atk_monster" || sb.slot === "atk_prop") {
        const mode: TargetMode = sb.slot === "atk_monster" ? "monster" : "prop";
        label = mode === "monster" ? "QUÁI" : "PHÁ";
        color = mode === "monster" ? 0x6a8a2a : 0x8a6a3a;
        // sáng khi có mục tiêu loại đó trong tầm
        ready = a.lockTarget(p, mode) !== null;
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
      if (hero && sb.slot !== "attack" && sb.slot !== "potion" && sb.slot !== "atk_monster" && sb.slot !== "atk_prop") {
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
      const cdText = ratio > 0 && sb.slot !== "attack" && sb.slot !== "potion" && sb.slot !== "atk_monster" && sb.slot !== "atk_prop" ? `${Math.ceil(p.cd[sb.slot as SkillSlot])}s` : "";
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
    this.aiming = null;
    this.attackHeld.clear();
    const off = this.anchors.offset(0, 0);
    const c = this.hudOnly(this.add.container(off.x, off.y).setScrollFactor(0).setDepth(9500));
    this.modal = c;
    // nền tối phủ kín mọi tỉ lệ màn hình
    c.add(this.add.rectangle(-W, -H, W * 3, H * 3, 0x000000, 0.65).setOrigin(0).setInteractive());
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
        c.add(text(this, x + 180, 150, `HƯỚNG ${i + 1} · ${ROLE_VI[br.role].toUpperCase()}`, 18, hex(br.color)).setOrigin(0.5, 0));
        const fig = addHeroImage(this, x + 180, 342, hero.id, br.id, null, 1.15);
        c.add(fig);
        breathe(this, fig);
        c.add(text(this, x + 180, 346, br.name, 30, hex(br.color)).setOrigin(0.5, 0));
        c.add(text(this, x + 180, 384, br.descVi, 17, "#e8e0d0", 500).setOrigin(0.5, 0).setWordWrapWidth(320).setAlign("center"));
        c.add(text(this, x + 24, 432, `Bị động: ${br.passive.nameVi}\n${modsText(br.mods)}\nQ ${br.skills[0].nameVi} · E ${br.skills[1].nameVi} · R ${br.skills[2].nameVi}\nCấp 10 → ${br.evolutions.map((e) => e.name).join(" / ")}`, 16, "#d8d0c0", 500).setWordWrapWidth(320));
        c.add(
          button(this, x + 180, 610, 260, 60, "Chọn dạng này", () => {
            if (this.choose(0, br.id)) {
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
        c.add(text(this, x + 24, 446, `${EVOLUTION_MECHANIC_VI[evo.style] ?? ""}\n${[modsText(evo.mods), passiveText(evo.passive.effect)].filter(Boolean).join(" · ")}\nTối thượng: ${evo.ultimate.nameVi}${hasRealArt(hero.id, br.id, evo.id) ? "" : "\n(hình tạm – chờ ảnh nhân vật)"}`, 16, "#d8d0c0", 500).setWordWrapWidth(320));
        c.add(
          button(this, x + 180, 616, 260, 58, "Tiến hoá", () => {
            if (this.choose(1, evo.id)) this.note(`TIẾN HOÁ: ${evo.name}!`, hex(evo.color));
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
          if (this.choose(2, ch.upgradeId)) {
            if (completeTutorialStep(getSave(), "pick_random_upgrade")) persist();
          }
          close();
        }, 0x3a8a3a).root,
      );
    });
  }
}
