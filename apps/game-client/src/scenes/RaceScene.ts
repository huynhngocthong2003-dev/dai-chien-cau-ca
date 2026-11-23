import Phaser from "phaser";
import { CHARACTERS, CHARACTER_BY_ID, FISHES, FISH_BY_ID, FORM_BY_ID } from "@dccc/game-data";

/** Cá đối thủ trong đua: chỉ loài câu được (không dùng cá lai của Đảo Lai Tạo). */
const CATCHABLE = FISHES.filter((f) => f.zones.length > 0);
import { ELEMENT_INFO, FISH_RARITY_COLOR, FISH_RARITY_LABEL } from "@dccc/game-config";
import {
  RACE,
  RACE_LEAGUES,
  OBSTACLE_INFO,
  RACE_ITEM_INFO,
  RACE_MAPS,
  RACE_MAP_IDS,
  mapFromSeed,
  sectionIndex,
  type RaceItem,
  type RaceMapId,
  RaceSession,
  Rng,
  obstacleAt,
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
import * as Social from "../state/social.ts";
import { safeEquip } from "../ui/playerProfile.ts";
import { canvasTexture, characterHeadTexture, characterTexture, fishTextureFor } from "../art/textures.ts";
import {
  RACE_THEMES,
  drawCurrent,
  drawDriftArrow,
  drawFinish,
  drawGeyser,
  drawJelly,
  drawLavaColumn,
  drawLightning,
  drawLog,
  drawRock,
  drawSeaweed,
  drawShark,
  drawTentacle,
  drawThemeFar,
  drawThemeSky,
  drawWhirl,
  type RaceTheme,
} from "../art/RaceArt.ts";
import { TopBar } from "../ui/TopBar.ts";
import { Bar, Button, fadeIn, formatNum, goTo, modal, panel, toast, txt } from "../ui/widgets.ts";
import { htmlOverlay } from "../ui/htmlOverlay.ts";
import { COLORS } from "../ui/theme.ts";
import { extraX } from "../ui/wide.ts";
import { Sfx } from "../audio/Sfx.ts";

/** Màu vệt tăng tốc theo nguyên tố – bảng chung 7 hệ. */
const ELEMENT_COLOR: Record<string, number> = Object.fromEntries(Object.entries(ELEMENT_INFO).map(([k, v]) => [k, parseInt(v.color.slice(1), 16)]));
const GRADE_COLOR: Record<RaceStats["grade"], string> = { S: "#ff4081", A: "#ffd740", B: "#69f0ae", C: "#40c4ff", D: "#b0bec5" };
const LANE_Y = [432, 540, 650];
const LANE_SCALE = [0.74, 0.84, 0.94];
const PX = 13; // pixel mỗi mét
const ME_X = 400;
/** Chờ ghép người chơi tối đa 2 phút, quá thì đua với máy. */
const MATCH_WAIT_MS = 120_000;
const NET_MS = 400;

interface RacerView {
  r: Racer;
  root: Phaser.GameObjects.Container;
  fish: Phaser.GameObjects.Image;
  rider: Phaser.GameObjects.Image;
  wake: Phaser.GameObjects.Ellipse;
  aura: Phaser.GameObjects.Ellipse;
  shield: Phaser.GameObjects.Ellipse;
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
  private obstacleImgs = new Map<number, Phaser.GameObjects.Image | Phaser.GameObjects.Container | Phaser.GameObjects.TileSprite>();
  private far!: Phaser.GameObjects.TileSprite;
  private skyImg?: Phaser.GameObjects.Image;
  private theme!: RaceTheme;
  private themeKey = "";
  private weatherFx?: Phaser.GameObjects.Particles.ParticleEmitter;
  /** Chế độ nhẹ cho máy yếu: tự bật khi khung hình thấp (ít vệt bóng, ít hạt thời tiết). */
  private lowFx = false;
  private fpsLowT = 0;
  private fogG!: Phaser.GameObjects.Graphics;
  private inkG!: Phaser.GameObjects.Graphics;
  /** Bản đồ chọn ở màn chọn ("random" = ngẫu nhiên) và bản đồ đang đua. */
  private mapChoice: RaceMapId | "random" = "random";
  private mapId: RaceMapId = "song_que";
  private secIdx = 0;
  private itemBtn!: Button;
  private pickedBoxes = new Set<number>();
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
  private jumpBtn!: Button;
  private falseStartFlag = false;
  /** Đã về đích nhưng chưa chắc thứ hạng (đua nhiều người). */
  private pendingPlace = false;
  /** Người chơi khác đã được thông báo về đích. */
  private announced = new Set<string>();
  /** Bục vinh danh (top 3 nhanh nhất toàn server) – lưu tạm theo giải. */
  private records = new Map<RaceLeague, Social.RaceRecord[]>();
  // đua nhiều người
  private room: Social.RaceRoom | null = null;
  private equips = new Map<string, Partial<Record<string, string>>>();
  private remote = new Map<string, { x: number; t: number; v: number }>();
  private netT = 0;
  private netBusy = false;
  private waitEndAt = 0;
  private waitT?: Phaser.GameObjects.Text;
  private matchTimer: number | null = null;
  private matchModal: ReturnType<typeof modal> | null = null;

  constructor() {
    super("Race");
  }

  /** Phòng riêng đang tham gia (giữ qua các lần mở lại màn Đua Cá). */
  static lobbyId: number | null = null;
  private lastRoomId: number | null = null;
  private lobbyTimer: number | null = null;
  private lobbyModal: ReturnType<typeof modal> | null = null;
  private pendingJoin: string | null = null;

  init(data?: { joinCode?: string }) {
    this.pendingJoin = data?.joinCode ?? null;
    this.room = null;
    this.equips = new Map();
    this.remote = new Map();
    this.mode = "select";
    this.session = null;
    this.entryTx = null;
    this.views = [];
    this.obstacleImgs = new Map();
    this.pickedBoxes = new Set();
    this.secIdx = 0;
    this.skyImg = undefined;
    this.themeKey = "";
  }

  create() {
    this.input.enabled = true;
    fadeIn(this);
    this.fogG = this.add.graphics().setDepth(930);
    this.inkG = this.add.graphics().setDepth(960);
    this.applyTheme(this.mapChoice === "random" ? "song_que" : this.mapChoice, 0, true);
    this.lanesG = this.add.graphics().setDepth(-5);
    this.speedG = this.add.graphics().setDepth(900);
    this.finishImg = this.add.image(0, 300, canvasTexture(this, "race_finish", 160, 340, drawFinish)).setOrigin(0.5, 0).setDepth(380).setVisible(false);
    canvasTexture(this, "race_weed", 100, 104, drawSeaweed);
    canvasTexture(this, "race_rock", 110, 90, drawRock);
    canvasTexture(this, "race_current", 140, 52, drawCurrent);
    canvasTexture(this, "race_shark", 150, 90, drawShark);
    canvasTexture(this, "race_log", 140, 56, drawLog);
    canvasTexture(this, "race_jelly", 80, 96, drawJelly);
    canvasTexture(this, "race_whirl", 130, 60, drawWhirl);
    canvasTexture(this, "race_lava", 90, 230, drawLavaColumn);
    canvasTexture(this, "race_bolt", 90, 270, drawLightning);
    canvasTexture(this, "race_tentacle", 100, 180, drawTentacle);
    canvasTexture(this, "race_geyser", 120, 60, drawGeyser);
    canvasTexture(this, "race_drift", 80, 80, drawDriftArrow);
    this.drawLanes(0);
    new TopBar(this, { title: "Đua Cá", onBack: () => (this.mode === "race" || this.mode === "countdown" ? this.confirmQuit() : goTo(this, "Hub")) });
    this.buildHud();
    this.setupInput();
    this.showSelect();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.stopMatchmaking(true);
      this.stopLobbyPoll();
      this.session = null;
      // giải phóng ảnh nền các bản đồ (mỗi chặng 1 ảnh lớn) – tránh đầy bộ nhớ đồ họa sau khi đua
      const keys = this.textures.getTextureKeys().filter((k) => /^race_(sky|far)_/.test(k));
      window.setTimeout(() => {
        // màn đua được mở lại ngay (khởi động lại) → giữ ảnh đang dùng
        const inUse = this.sys.isActive() ? [`race_sky_${this.themeKey}`, `race_far_${this.themeKey}`] : [];
        for (const k of keys) if (!inUse.includes(k) && this.textures.exists(k)) this.textures.remove(k);
      }, 0);
    });
    if (this.pendingJoin) {
      const code = this.pendingJoin;
      this.pendingJoin = null;
      window.setTimeout(() => this.scene.isActive() && void this.joinLobby(code), 300);
    }
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
      const y = 178 + i * 118;
      const sel = id === this.league;
      const b = new Button(this, 220, y, 370, 108, "", {
        color: sel ? COLORS.orange : COLORS.panelLight,
        disabled: locked,
        onClick: () => {
          this.league = id;
          this.showSelect();
        },
      });
      if (locked) b.on("disabled-click", () => toast(this, `Cần cấp ${L.minLevel} để vào ${L.name}`, COLORS.red));
      c.add(b);
      c.add(txt(this, 220, y - 30, `${locked ? "🔒 " : ""}${L.name}`, 21, { align: "center" }).setOrigin(0.5));
      c.add(
        txt(this, 220, y + 14, `Phí: ${formatNum(L.fee)} vàng · Cần cấp ${L.minLevel}\nGiải: 🥇${formatNum(L.prizes[0])}${L.firstDiamonds ? `+💎${L.firstDiamonds}` : ""}  🥈${formatNum(L.prizes[1])}  🥉${formatNum(L.prizes[2])}`, 15, {
          align: "center",
          weight: "700",
        }).setOrigin(0.5),
      );
    });

    this.drawHallOfFame(c);

    c.add(panel(this, 440, 88, 820, 612, 0.9));
    c.add(txt(this, 790, 112, "🐟 Chọn cá để cưỡi (chỉ số đua riêng)", 22, { color: COLORS.textGold, align: "center" }).setOrigin(0.5));
    c.add(
      new Button(this, 1172, 112, 156, 40, RaceScene.lobbyId ? "🏠 Về phòng" : "🏠 Phòng bạn bè", {
        color: COLORS.purple,
        fontSize: 16,
        onClick: () => this.openLobbyMenu(),
      }),
    );
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
      c.add(this.add.image(x, y - 26, fishTextureFor(this, def, o.form ?? null, o.stars)).setDisplaySize(120, 75));
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
    // chọn bản đồ
    const maps: (RaceMapId | "random")[] = ["random", ...RACE_MAP_IDS];
    maps.forEach((id, i) => {
      const mp = id === "random" ? null : RACE_MAPS[id];
      const locked = !!mp && s.level < mp.minLevel;
      const b = new Button(this, 512 + i * 134, 486, 128, 46, mp ? `${mp.icon} ${mp.name}` : "🎲 Ngẫu nhiên", {
        color: id === this.mapChoice ? COLORS.orange : COLORS.panelLight,
        fontSize: 14,
        disabled: locked,
        onClick: () => {
          this.mapChoice = id;
          this.applyTheme(id === "random" ? "song_que" : id, 0, false);
          this.showSelect();
          if (mp) toast(this, `${mp.icon} ${mp.name}: ${mp.description}`);
        },
      });
      if (locked && mp) b.on("disabled-click", () => toast(this, `Cần cấp ${mp.minLevel} để đua ở ${mp.name}`, COLORS.red));
      c.add(b);
    });
    c.add(txt(this, 1130, y0 + 50, `${L.name} · phí ${formatNum(L.fee)} vàng`, 14, { align: "center", weight: "700" }).setOrigin(0.5));
    c.add(new Button(this, 1130, y0 + 92, 230, 56, "🤖 ĐUA VỚI MÁY", { color: COLORS.green, fontSize: 21, onClick: () => this.start(null) }));
    c.add(new Button(this, 1130, y0 + 154, 230, 56, "👥 ĐUA VỚI NGƯỜI", { color: COLORS.orange, fontSize: 21, onClick: () => void this.findPlayers() }));
  }

  // ------------------------------------------------------------------ bục vinh danh
  /**
   * Vẽ bục 3 bậc (🥈 trái · 🥇 giữa · 🥉 phải) với nhân vật đứng trên, cá đã cưỡi bên cạnh.
   * @param full true = nhân vật toàn thân (màn kết quả), false = chỉ đầu (màn chọn giải, nhỏ gọn)
   */
  private drawPodium(
    parent: Phaser.GameObjects.Container,
    cx: number,
    baseY: number,
    k: number,
    entries: { name: string; charId: string; equip: Partial<Record<string, string>>; fishId: string; formId: string | null; label: string; mine?: boolean }[],
    full: boolean,
  ) {
    const steps = [
      { place: 2, dx: -1, h: 70, col: 0xb0bec5, medal: "🥈" },
      { place: 1, dx: 0, h: 100, col: 0xffd740, medal: "🥇" },
      { place: 3, dx: 1, h: 48, col: 0xd7a26b, medal: "🥉" },
    ];
    const w = 120 * k;
    for (const st of steps) {
      const e = entries[st.place - 1];
      const x = cx + st.dx * (w + 6 * k);
      const h = st.h * k;
      const g = this.add.graphics();
      g.fillStyle(st.col, 1).fillRoundedRect(x - w / 2, baseY - h, w, h, 8 * k);
      g.lineStyle(3, 0x1b1530).strokeRoundedRect(x - w / 2, baseY - h, w, h, 8 * k);
      parent.add(g);
      parent.add(txt(this, x, baseY - h / 2, `${st.place}`, Math.round(34 * k), { color: "#1b1530", stroke: 0, shadow: false, align: "center" }).setOrigin(0.5));
      if (!e) {
        parent.add(txt(this, x, baseY - h - 18 * k, "—", Math.round(16 * k), { color: COLORS.textDim, align: "center" }).setOrigin(0.5));
        continue;
      }
      const ch = CHARACTER_BY_ID.get(e.charId) ?? CHARACTER_BY_ID.get("c_be_tom")!;
      const def = FISH_BY_ID.get(e.fishId);
      const top = baseY - h;
      if (full) {
        const hero = this.add.image(x - 14 * k, top + 2, characterTexture(this, ch, safeEquip(e.equip))).setOrigin(0.5, 1).setScale(0.42 * k);
        parent.add(hero);
        if (def) parent.add(this.add.image(x + 34 * k, top - 34 * k, fishTextureFor(this, def, e.formId)).setDisplaySize(70 * k, 44 * k).setAngle(-20));
        parent.add(txt(this, x, top - 112 * k, st.medal, Math.round(30 * k), { stroke: 0 }).setOrigin(0.5));
        if (st.place === 1) {
          const crown = txt(this, x - 14 * k, top - 140 * k, "👑", Math.round(28 * k), { stroke: 0 }).setOrigin(0.5);
          parent.add(crown);
          this.tweens.add({ targets: crown, y: crown.y - 6, duration: 600, yoyo: true, repeat: -1 });
        }
      } else {
        parent.add(this.add.image(x, top - 26 * k, characterHeadTexture(this, ch, safeEquip(e.equip))).setDisplaySize(52 * k, 62 * k));
        parent.add(txt(this, x + 26 * k, top - 48 * k, st.medal, Math.round(18 * k), { stroke: 0 }).setOrigin(0.5));
      }
      parent.add(
        txt(this, x, baseY + 12 * k, `${e.mine ? "⭐ " : ""}${e.name}\n${e.label}`, Math.round(13 * k), {
          align: "center",
          weight: "700",
          color: e.mine ? "#ffeb3b" : "#ffffff",
          wrap: w + 20,
        }).setOrigin(0.5, 0),
      );
    }
  }

  /** Bục vinh danh toàn server: 3 người về đích nhanh nhất ở giải đang chọn. */
  private drawHallOfFame(c: Phaser.GameObjects.Container) {
    const league = this.league;
    const box = this.add.container(0, 0);
    c.add(box);
    box.add(txt(this, 220, 500, `🏆 Bục vinh danh · ${RACE_LEAGUES[league].name}`, 16, { color: COLORS.textGold, align: "center" }).setOrigin(0.5));
    const draw = (list: Social.RaceRecord[]) => {
      if (!box.active) return;
      box.list.slice(1).forEach((o) => o.destroy());
      if (!list.length) {
        box.add(txt(this, 220, 620, "Chưa có ai lên bục –\nhãy là người đầu tiên! 🏁", 15, { align: "center", weight: "700", color: COLORS.textDim }).setOrigin(0.5));
        return;
      }
      const myId = GameState.online?.id;
      this.drawPodium(
        box,
        220,
        664,
        0.75,
        list.map((r) => ({ name: r.name, charId: r.char_id, equip: r.equip, fishId: r.fish_id, formId: null, label: `${(r.best_ms / 1000).toFixed(2)}s`, mine: r.user_id === myId })),
        false,
      );
    };
    if (!GameState.online) {
      box.add(txt(this, 220, 620, "Đăng nhập để ghi danh\nlên bục vinh danh!", 15, { align: "center", weight: "700", color: COLORS.textDim }).setOrigin(0.5));
      return;
    }
    const cached = this.records.get(league);
    if (cached) draw(cached);
    void Social.raceTop(league, 3)
      .then((list) => {
        this.records.set(league, list);
        if (this.league === league) draw(list);
      })
      .catch(() => null);
  }

  // ------------------------------------------------------------------ phòng riêng mời bạn bè
  private openLobbyMenu() {
    if (!GameState.online) return toast(this, "Đăng nhập tài khoản online để tạo phòng đua với bạn bè", COLORS.red);
    if (RaceScene.lobbyId) return void this.showLobby();
    const m = modal(this, 640, 400, "🏠 Phòng đua bạn bè");
    m.root.setDepth(2000);
    m.root.add(txt(this, 640, m.y + 84, "Tạo phòng rồi mời bạn bè, hoặc nhập mã phòng bạn gửi.", 17, { align: "center", weight: "700" }).setOrigin(0.5));
    m.root.add(
      new Button(this, 640, m.y + 150, 320, 62, "🏠 Tạo phòng mới", {
        color: COLORS.green,
        fontSize: 22,
        onClick: () => {
          m.close();
          void this.createLobby();
        },
      }),
    );
    m.root.add(txt(this, 640, m.y + 218, "— hoặc —", 16, { color: COLORS.textDim, align: "center" }).setOrigin(0.5));
    const box = htmlOverlay(
      this,
      m.root,
      560,
      m.y + 280,
      260,
      52,
      `<input id="lobby-code" maxlength="6" placeholder="Mã phòng" style="width:100%;height:100%;box-sizing:border-box;font:800 24px 'Baloo 2',sans-serif;letter-spacing:4px;text-transform:uppercase;text-align:center;border-radius:12px;border:3px solid #1b1530;background:#fff8e1;color:#1b1530">`,
    );
    const input = box.querySelector("input") as HTMLInputElement;
    const go = () => {
      const code = input.value.trim().toUpperCase();
      if (!/^[A-Z0-9]{6}$/.test(code)) return toast(this, "Mã phòng gồm 6 ký tự", COLORS.red);
      m.close();
      void this.joinLobby(code);
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") go();
    });
    m.root.add(new Button(this, 790, m.y + 280, 150, 52, "🔑 Vào", { color: COLORS.blue, fontSize: 20, onClick: go }));
  }

  private async createLobby() {
    const racer = this.myNetRacer();
    if (!racer) return toast(this, "Hãy chọn một con cá trước", COLORS.red);
    try {
      const l = await Social.raceLobbyCreate(this.league, this.mapChoice, racer);
      RaceScene.lobbyId = l.lobby_id;
      this.lastRoomId = l.room_id;
      void this.showLobby(l);
      toast(this, `🏠 Đã tạo phòng ${l.code} – bấm 📨 Mời để gọi bạn bè!`, COLORS.green);
    } catch (e) {
      toast(this, (e as Error).message, COLORS.red);
    }
  }

  /** Vào phòng bằng mã (cũng được gọi từ bảng lời mời). */
  async joinLobby(code: string) {
    if (!GameState.online) return toast(this, "Đăng nhập tài khoản online để vào phòng", COLORS.red);
    const racer = this.myNetRacer();
    if (!racer) return toast(this, "Hãy câu ít nhất 1 con cá để đua nhé!", COLORS.red);
    try {
      const l = await Social.raceLobbyJoin(code, racer);
      RaceScene.lobbyId = l.lobby_id;
      this.lastRoomId = l.room_id;
      this.league = l.league;
      void this.showLobby(l);
    } catch (e) {
      toast(this, (e as Error).message, COLORS.red);
    }
  }

  private stopLobbyPoll() {
    if (this.lobbyTimer !== null) window.clearInterval(this.lobbyTimer);
    this.lobbyTimer = null;
  }

  private async showLobby(initial?: Social.RaceLobby) {
    const id = RaceScene.lobbyId;
    if (!id || !GameState.online) return;
    this.stopLobbyPoll();
    this.lobbyModal?.close();
    const m = modal(this, 960, 640, "🏠 Phòng đua bạn bè", () => {
      this.stopLobbyPoll();
      this.lobbyModal = null;
      this.showSelect();
    });
    m.root.setDepth(2000);
    this.lobbyModal = m;
    const body = this.add.container(0, 0);
    m.root.add(body);
    const myId = GameState.online.id;
    let busy = false;
    let readyBusy = false;
    const leave = async () => {
      this.stopLobbyPoll();
      RaceScene.lobbyId = null;
      m.close();
      await Social.raceLobbyLeave(id).catch(() => null);
    };
    const draw = (l: Social.RaceLobby) => {
      if (!body.active) return;
      body.removeAll(true);
      const isHost = l.host === myId;
      const L = RACE_LEAGUES[l.league];
      const mp = l.map === "random" ? null : RACE_MAPS[l.map as RaceMapId];
      body.add(txt(this, m.x + 40, m.y + 80, "Mã phòng", 16, { color: COLORS.textDim, weight: "700" }).setOrigin(0, 0.5));
      body.add(txt(this, m.x + 40, m.y + 118, l.code, 44, { color: "#ffeb3b" }).setOrigin(0, 0.5));
      body.add(
        new Button(this, m.x + 300, m.y + 116, 110, 40, "📋 Chép", {
          color: COLORS.panelLight,
          fontSize: 16,
          onClick: () => {
            void navigator.clipboard?.writeText(l.code).catch(() => null);
            toast(this, `Đã chép mã ${l.code}`);
          },
        }),
      );
      // giải & bản đồ (chủ phòng đổi được)
      const leagues = Object.keys(RACE_LEAGUES) as RaceLeague[];
      const maps = ["random", ...RACE_MAP_IDS.filter((x) => GameState.save.level >= RACE_MAPS[x].minLevel)];
      const row = (y: number, label: string, value: string, cycle: (d: 1 | -1) => void) => {
        body.add(txt(this, m.x + 470, y, label, 16, { color: COLORS.textDim, weight: "700" }).setOrigin(0, 0.5));
        body.add(txt(this, m.x + 720, y, value, 19, { align: "center" }).setOrigin(0.5));
        if (isHost) {
          body.add(new Button(this, m.x + 590, y, 40, 36, "◀", { color: COLORS.blue, fontSize: 16, onClick: () => cycle(-1) }));
          body.add(new Button(this, m.x + 850, y, 40, 36, "▶", { color: COLORS.blue, fontSize: 16, onClick: () => cycle(1) }));
        }
      };
      const setRoom = async (league: RaceLeague, map: string) => {
        try {
          draw(await Social.raceLobbySet(id, league, map));
        } catch (e) {
          toast(this, (e as Error).message, COLORS.red);
        }
      };
      row(m.y + 86, "Giải", `${L.name} · ${formatNum(L.fee)}🪙`, (d) => {
        const next = leagues[(leagues.indexOf(l.league) + d + leagues.length) % leagues.length]!;
        void setRoom(next, l.map);
      });
      row(m.y + 128, "Bản đồ", mp ? `${mp.icon} ${mp.name}` : "🎲 Ngẫu nhiên", (d) => {
        const i = Math.max(0, maps.indexOf(l.map));
        void setRoom(l.league, maps[(i + d + maps.length) % maps.length]!);
      });
      // thành viên
      for (let i = 0; i < 5; i++) {
        const mb = l.members[i];
        const y = m.y + 190 + i * 66;
        const g = this.add.graphics();
        g.fillStyle(mb?.user_id === myId ? 0x1e4d7a : 0x0a1628, mb ? 0.95 : 0.4).fillRoundedRect(m.x + 30, y - 28, m.w - 60, 58, 12);
        body.add(g);
        if (!mb) {
          body.add(txt(this, m.x + 60, y, "Chỗ trống – mời bạn bè hoặc máy sẽ đua thay", 15, { color: COLORS.textDim, weight: "700" }).setOrigin(0, 0.5));
          continue;
        }
        const fdef = mb.racer.fishId ? FISH_BY_ID.get(mb.racer.fishId) : undefined;
        body.add(txt(this, m.x + 50, y, `${mb.is_host ? "👑 " : ""}${mb.name}${mb.user_id === myId ? " (bạn)" : ""} · Lv.${mb.level}`, 18, { color: mb.user_id === myId ? "#ffeb3b" : "#ffffff" }).setOrigin(0, 0.5));
        if (fdef) {
          body.add(this.add.image(m.x + 520, y, fishTextureFor(this, fdef, mb.racer.formId ?? null)).setDisplaySize(70, 44));
          body.add(txt(this, m.x + 566, y, `${fdef.name}${mb.racer.stats ? ` (${mb.racer.stats.grade})` : ""}`, 15, { weight: "700" }).setOrigin(0, 0.5));
        }
        body.add(txt(this, m.x + m.w - 50, y, mb.ready ? "✅ Sẵn sàng" : "⏳ Chưa", 16, { color: mb.ready ? "#69f0ae" : "#ffd740" }).setOrigin(1, 0.5));
      }
      // lời mời đã gửi (người chưa vào phòng)
      if (l.invites?.length) {
        const label = { pending: "⏳ đang chờ", accepted: "✅ đồng ý", declined: "✖ từ chối", expired: "⌛ không trả lời" } as const;
        body.add(
          txt(this, m.x + 40, m.y + 530, `📨 Đã mời: ${l.invites.slice(0, 4).map((i) => `${i.name} (${label[i.status]})`).join(" · ")}`, 15, {
            weight: "700",
            color: COLORS.textDim,
            wrap: m.w - 80,
          }).setOrigin(0, 0.5),
        );
      }
      // nút
      const by = m.y + m.h - 46;
      body.add(new Button(this, m.x + 110, by, 170, 54, "📨 Mời bạn", { color: COLORS.blue, fontSize: 19, onClick: () => void this.inviteFriends(id) }));
      body.add(
        new Button(this, m.x + 290, by, 170, 54, "🐟 Đổi cá", {
          color: COLORS.panelLight,
          fontSize: 19,
          onClick: () => {
            m.close();
            toast(this, "Chọn cá khác rồi bấm 🏠 Về phòng", COLORS.blue);
          },
        }),
      );
      body.add(new Button(this, m.x + 470, by, 170, 54, "🚪 Rời phòng", { color: COLORS.red, fontSize: 19, onClick: () => void leave() }));
      if (isHost) {
        const others = l.members.filter((x) => !x.is_host);
        const can = l.members.length >= 2 && others.every((x) => x.ready);
        const b = new Button(this, m.x + m.w - 130, by, 220, 62, "🏁 BẮT ĐẦU", {
          color: COLORS.green,
          fontSize: 24,
          disabled: !can,
          onClick: () => void startNow(),
        });
        b.on("disabled-click", () => toast(this, l.members.length < 2 ? "Cần ít nhất 2 người – mời bạn bè vào phòng!" : "Chờ mọi người bấm Sẵn sàng"));
        body.add(b);
      } else {
        const me = l.members.find((x) => x.user_id === myId);
        body.add(
          new Button(this, m.x + m.w - 130, by, 220, 62, me?.ready ? "❌ Huỷ sẵn sàng" : "✅ SẴN SÀNG", {
            color: me?.ready ? COLORS.orange : COLORS.green,
            fontSize: 22,
            onClick: () => void toggleReady(!me?.ready, l),
          }),
        );
      }
    };
    const toggleReady = async (ready: boolean, l: Social.RaceLobby) => {
      if (readyBusy) return;
      const L = RACE_LEAGUES[l.league];
      if (ready && GameState.save.level < L.minLevel) return toast(this, `Cần cấp ${L.minLevel} để đua ${L.name}`, COLORS.red);
      if (ready && GameState.save.gold < L.fee) return toast(this, `Cần ${formatNum(L.fee)} vàng phí vào cửa`, COLORS.red);
      const racer = this.myNetRacer();
      if (ready && !racer) return toast(this, "Hãy chọn một con cá", COLORS.red);
      readyBusy = true;
      try {
        draw(await Social.raceLobbyReady(id, ready, racer));
      } catch (e) {
        toast(this, (e as Error).message, COLORS.red);
      } finally {
        readyBusy = false;
      }
    };
    const startNow = async () => {
      const l = await Social.raceLobbyState(id).catch(() => null);
      if (!l) return;
      const L = RACE_LEAGUES[l.league];
      if (GameState.save.gold < L.fee) return toast(this, `Cần ${formatNum(L.fee)} vàng phí vào cửa`, COLORS.red);
      // cập nhật cá đang chọn của chủ phòng trước khi xuất phát
      await Social.raceLobbyReady(id, true, this.myNetRacer()).catch(() => null);
      try {
        const room = await Social.raceLobbyStart(id);
        enterRace(l, room);
      } catch (e) {
        toast(this, (e as Error).message, COLORS.red);
      }
    };
    const enterRace = (l: Social.RaceLobby, room: Social.RaceRoom) => {
      if (this.lastRoomId === room.room_id) return;
      this.lastRoomId = room.room_id;
      this.stopLobbyPoll();
      this.lobbyModal = null;
      m.root.destroy();
      document.querySelectorAll<HTMLElement>(".dccc-overlay").forEach((el) => (el.style.visibility = ""));
      this.league = l.league;
      this.start(room);
    };
    const poll = async () => {
      if (busy || this.lobbyModal !== m) return;
      busy = true;
      try {
        const l = await Social.raceLobbyState(id);
        if (this.lobbyModal !== m) return;
        if (!l || l.status === "closed") {
          this.stopLobbyPoll();
          RaceScene.lobbyId = null;
          m.close();
          toast(this, "Phòng đã đóng (chủ phòng đã rời)", COLORS.red);
          return;
        }
        if (l.status === "started" && l.room_id && l.room_id !== this.lastRoomId) {
          const room = await Social.raceRoomGet(l.room_id);
          if (room && this.lobbyModal === m) return enterRace(l, room);
        }
        draw(l);
      } catch {
        /* thử lại */
      } finally {
        busy = false;
      }
    };
    if (initial) draw(initial);
    void poll();
    this.lobbyTimer = window.setInterval(() => void poll(), 1500);
  }

  /** Danh sách bạn bè (online trước) để mời vào phòng. */
  private async inviteFriends(lobbyId: number) {
    const me = GameState.online?.id;
    if (!me) return;
    try {
      const fr = (await Social.listFriendships()).filter((f) => f.status === "accepted");
      const ids = fr.map((f) => (f.requester === me ? f.addressee : f.requester));
      const cards = await Social.cardsByIds(ids);
      const m = modal(this, 640, 560, "📨 Mời bạn bè");
      m.root.setDepth(2100);
      if (!cards.length) {
        m.root.add(txt(this, 640, m.y + 240, "Chưa có bạn bè nào.\nKết bạn ở Hồ Sơ → Bạn bè, hoặc gửi mã phòng cho bạn nhé!", 18, { align: "center" }).setOrigin(0.5));
        return;
      }
      cards
        .map((c) => ({ c, st: Social.onlineStatus(c) }))
        .sort((a, b) => Number(b.st.online) - Number(a.st.online))
        .slice(0, 7)
        .forEach(({ c, st }, i) => {
          const y = m.y + 90 + i * 62;
          m.root.add(txt(this, m.x + 40, y, `${st.online ? "🟢" : "⚪"} ${c.display_name} · Lv.${c.level}`, 18).setOrigin(0, 0.5));
          m.root.add(txt(this, m.x + 40, y + 20, st.text, 12, { color: COLORS.textDim, weight: "700" }).setOrigin(0, 0.5));
          const b = new Button(this, m.x + m.w - 100, y, 140, 46, "📨 Mời", {
            color: COLORS.green,
            fontSize: 18,
            onClick: () => {
              b.setDisabled(true);
              void Social.raceLobbyInvite(lobbyId, c.user_id)
                .then(() => {
                  b.setText("Đã mời ✓");
                  toast(this, `Đã gửi lời mời cho ${c.display_name}`, COLORS.green);
                })
                .catch((e: Error) => {
                  b.setDisabled(false);
                  toast(this, e.message, COLORS.red);
                });
            },
          });
          m.root.add(b);
        });
    } catch (e) {
      toast(this, (e as Error).message, COLORS.red);
    }
  }

  /** Cá đang chọn → thông tin gửi cho người chơi khác. */
  private myNetRacer(): Social.RaceNetRacer | null {
    const s = GameState.save;
    const own = s.fishes.find((f) => f.uid === this.fishUid);
    if (!own) return null;
    const stats = raceCandidates([own], FISH_BY_ID, FORM_BY_ID, 1)[0]!.stats;
    return { fishId: own.fishId, formId: own.form ?? null, charId: s.selectedCharacterId, equip: GameState.equipOf(s.selectedCharacterId), stats };
  }

  // ------------------------------------------------------------------ ghép người chơi
  private async findPlayers() {
    if (!GameState.online) return toast(this, "Đăng nhập tài khoản online để đua với người chơi khác", COLORS.red);
    const L = RACE_LEAGUES[this.league];
    if (GameState.save.gold < L.fee) return toast(this, `Cần ${L.fee} vàng phí vào cửa`, COLORS.red);
    const me = this.myNetRacer();
    if (!me) return toast(this, "Hãy chọn một con cá", COLORS.red);
    try {
      await Social.raceQueueJoin(this.league, me);
    } catch (e) {
      return toast(this, (e as Error).message, COLORS.red);
    }
    const m = modal(this, 620, 380, "👥 Tìm người chơi", () => this.stopMatchmaking(true));
    m.root.setDepth(2000); // trên panel chọn (1000) và HUD
    this.matchModal = m;
    const status = txt(this, 640, m.y + 120, "Đang tìm đối thủ…", 22, { align: "center" }).setOrigin(0.5);
    const timer = txt(this, 640, m.y + 170, "", 18, { align: "center", weight: "700", color: COLORS.textDim }).setOrigin(0.5);
    const bar = new Bar(this, m.x + 60, m.y + 210, m.w - 120, 18, COLORS.orange, "");
    m.root.add([status, timer, bar]);
    m.root.add(
      new Button(this, 640, m.y + m.h - 60, 300, 60, "🤖 Đua với máy ngay", {
        color: COLORS.green,
        fontSize: 21,
        onClick: () => {
          this.stopMatchmaking(true);
          m.close();
          this.start(null);
        },
      }),
    );
    const t0 = Date.now();
    let busy = false;
    const tick = async () => {
      if (busy || this.matchModal !== m) return;
      busy = true;
      try {
        const left = MATCH_WAIT_MS - (Date.now() - t0);
        const room = await Social.raceFind(this.league);
        if (this.matchModal !== m) return;
        if (room) {
          this.stopMatchmaking(false);
          m.close();
          this.start(room);
          return;
        }
        if (left <= 0) {
          this.stopMatchmaking(true);
          m.close();
          toast(this, "Chưa có người chơi nào – đua với máy nhé! 🤖", COLORS.blue);
          this.start(null);
          return;
        }
        const n = await Social.raceQueueCount(this.league);
        if (this.matchModal !== m) return;
        status.setText(n > 1 ? `Có ${n} người đang chờ – sắp xuất phát!` : "Đang tìm đối thủ…");
        const sec = Math.ceil(left / 1000);
        timer.setText(`Quá ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")} nữa sẽ đua với máy`);
        bar.set(1 - left / MATCH_WAIT_MS);
      } catch {
        status.setText("⚠ Mất kết nối – đang thử lại…");
      } finally {
        busy = false;
      }
    };
    void tick();
    this.matchTimer = window.setInterval(() => void tick(), 2000);
  }

  private stopMatchmaking(leaveQueue: boolean) {
    if (this.matchTimer !== null) window.clearInterval(this.matchTimer);
    this.matchTimer = null;
    const wasWaiting = this.matchModal !== null;
    this.matchModal = null;
    if (leaveQueue && wasWaiting && GameState.online) void Social.raceQueueLeave().catch(() => null);
  }

  private start(room: Social.RaceRoom | null) {
    const s = GameState.save;
    const own = s.fishes.find((f) => f.uid === this.fishUid);
    if (!own) return toast(this, "Hãy chọn một con cá", COLORS.red);
    const entry = GameState.raceEntry(this.league, own.uid);
    if (!entry.ok) return toast(this, entry.error, COLORS.red);
    this.entryTx = entry.entryTx;
    const def = FISH_BY_ID.get(own.fishId)!;
    const stats = raceCandidates([own], FISH_BY_ID, FORM_BY_ID, 1)[0]!.stats;
    const me = newRacer("me", s.name, def.id, own.form ?? null, s.selectedCharacterId, stats, null);
    const chars = CHARACTERS.map((c) => c.id);
    this.room = room;
    this.equips = new Map([["me", GameState.equipOf(s.selectedCharacterId)]]);
    this.remote = new Map();
    this.waitEndAt = 0;
    this.pendingPlace = false;
    this.announced = new Set();
    if (room) {
      const myId = GameState.online?.id;
      const humans = [...room.members].sort((a, b) => a.slot - b.slot).map((mb) => {
        if (mb.user_id === myId) return me;
        const r = mb.racer;
        this.equips.set(mb.user_id, safeEquip(r.equip));
        return { ...newRacer(mb.user_id, r.name ?? "Người chơi", r.fishId, r.formId ?? null, r.charId, r.stats, null), remote: true };
      });
      const ai = makeRaceOpponents(this.league, CATCHABLE, chars, new Rng(room.seed), Math.max(0, 5 - humans.length));
      this.mapId = room.map && room.map in RACE_MAPS ? (room.map as RaceMapId) : mapFromSeed(room.seed);
      this.session = new RaceSession(me, [], room.seed, [...humans, ...ai], this.league, this.mapId);
    } else {
      const seed = randomSeed();
      const rng = new Rng(seed);
      const open = RACE_MAP_IDS.filter((id) => GameState.save.level >= RACE_MAPS[id].minLevel);
      this.mapId = this.mapChoice === "random" ? open[rng.int(0, open.length - 1)]! : this.mapChoice;
      this.session = new RaceSession(me, makeRaceOpponents(this.league, CATCHABLE, chars, rng, 4), seed, undefined, this.league, this.mapId);
    }
    this.selectC?.destroy();
    this.selectC = undefined;
    this.secIdx = 0;
    this.pickedBoxes = new Set();
    this.applyTheme(this.mapId, 0, true);
    this.buildRacers();
    this.hud.setVisible(true);
    if (room) {
      toast(this, `👥 Đã ghép ${room.members.length} người chơi – xuất phát cùng lúc!`, COLORS.green);
      this.mode = "countdown";
      this.layoutRace();
      window.setTimeout(() => this.scene.isActive() && this.countdown(), Math.max(0, room.start_in_ms - 2400));
    } else this.countdown();
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
      const shield = this.add.ellipse(0, -30, 200, 170, 0x80d8ff, 0.18).setStrokeStyle(4, 0xe1f5fe, 0.9).setVisible(false);
      const wake = this.add.ellipse(-70, 12, 120, 22, 0xffffff, 0.55);
      const fish = this.add.image(0, 0, fishTextureFor(this, def, r.formId)).setDisplaySize(170, 106);
      const ch = CHARACTER_BY_ID.get(r.charId) ?? CHARACTER_BY_ID.get("c_be_tom")!;
      const rider = this.add
        .image(-6, -22, characterTexture(this, ch, (this.equips.get(r.id) ?? {}) as never))
        .setOrigin(0.5, 1)
        .setScale(0.4);
      const tag = txt(this, 0, -122, r.id === "me" ? "⭐ BẠN" : r.remote ? `👤 ${r.name}` : r.name, r.id === "me" ? 18 : 15, {
        align: "center",
        color: r.id === "me" ? "#ffeb3b" : r.remote ? "#80d8ff" : "#ffffff",
      }).setOrigin(0.5);
      root.add([aura, wake, fish, rider, tag, shield]);
      this.views.push({ r, root, fish, rider, wake, aura, tag, shield, color, y: LANE_Y[r.lane]!, ghostT: 0 });
    }
  }

  private drawLanes(scroll: number) {
    const g = this.lanesG;
    g.clear();
    const ex = extraX(this);
    // vệt sóng chạy ngược để tạo cảm giác tốc độ
    for (let l = 0; l < 4; l++) {
      const y = 395 + l * 90;
      g.lineStyle(4, this.theme?.foam ?? 0xffffff, 0.35);
      for (let x = -ex - ((scroll * PX) % 80); x < 1280 + ex; x += 80) g.lineBetween(x, y, x + 44, y);
    }
    g.fillStyle(0xffffff, 0.12);
    for (let i = 0; i < 26; i++) {
      const x = ((i * 157 - scroll * PX * 1.3) % (1280 + 2 * ex)) + (1280 + 2 * ex);
      g.fillEllipse((x % (1280 + 2 * ex)) - ex, 360 + ((i * 53) % 340), 40, 6);
    }
  }

  /** Đổi khung cảnh theo bản đồ/chặng (chuyển cảnh mờ dần), thời tiết đi kèm. */
  private applyTheme(map: RaceMapId, idx: number, instant: boolean) {
    const key = `${map}_${idx}`;
    if (key === this.themeKey) return;
    this.themeKey = key;
    const t = RACE_THEMES[map]![idx]!;
    this.theme = t;
    const ex = extraX(this);
    const sky = this.add
      // trời chỉ là dải màu → vẽ nửa độ phân giải (ít bộ nhớ hơn 4 lần, nhìn không khác)
      .image(-ex, 0, canvasTexture(this, `race_sky_${key}`, 1280, 720, (ctx) => drawThemeSky(ctx, t), 0.5))
      .setOrigin(0)
      .setDisplaySize(1280 + 2 * ex, 720)
      .setDepth(-20);
    const far = this.add
      .tileSprite(-ex, 220, 1280 + 2 * ex, 150, canvasTexture(this, `race_far_${key}`, 1280, 150, (ctx) => drawThemeFar(ctx, t)))
      .setOrigin(0)
      .setDepth(-15);
    const oldSky = this.skyImg;
    const oldFar = this.far as Phaser.GameObjects.TileSprite | undefined;
    if (oldFar) far.tilePositionX = oldFar.tilePositionX;
    this.skyImg = sky;
    this.far = far;
    if (instant || !oldSky) {
      oldSky?.destroy();
      oldFar?.destroy();
    } else {
      sky.setAlpha(0).setDepth(-19);
      far.setAlpha(0).setDepth(-14);
      this.tweens.add({
        targets: [sky, far],
        alpha: 1,
        duration: 1100,
        onComplete: () => {
          oldSky.destroy();
          oldFar?.destroy();
          sky.setDepth(-20);
          far.setDepth(-15);
        },
      });
    }
    this.setWeather(t);
  }

  private setWeather(t: RaceTheme) {
    this.weatherFx?.destroy();
    this.weatherFx = undefined;
    const ex = extraX(this);
    const X = { min: -ex, max: 1280 + ex };
    const cfg: Record<string, [string, Phaser.Types.GameObjects.Particles.ParticleEmitterConfig] | null> = {
      none: null,
      leaves: ["p_spark", { x: X, y: -10, speedY: { min: 40, max: 90 }, speedX: { min: -220, max: -120 }, lifespan: 7000, frequency: 160, scale: { min: 0.4, max: 0.7 }, tint: [0x81c784, 0xaed581, 0xffd54f], rotate: { min: 0, max: 360 } }],
      bubbles: ["p_bubble", { x: X, y: 730, speedY: { min: -120, max: -60 }, speedX: { min: -60, max: 20 }, lifespan: 6000, frequency: 120, scale: { min: 0.6, max: 1.3 }, alpha: { start: 0.8, end: 0.2 } }],
      snow: ["p_spark", { x: X, y: -10, speedY: { min: 60, max: 140 }, speedX: { min: -220, max: -80 }, lifespan: 6000, frequency: 30, scale: { min: 0.25, max: 0.6 }, tint: 0xffffff }],
      ash: ["p_spark", { x: X, y: -10, speedY: { min: 40, max: 90 }, speedX: { min: -160, max: -60 }, lifespan: 7000, frequency: 40, scale: { min: 0.3, max: 0.6 }, tint: [0x9e9e9e, 0x616161], alpha: { start: 0.8, end: 0.3 } }],
      rain: ["p_drop", { x: X, y: -10, speedY: { min: 800, max: 1000 }, speedX: { min: -260, max: -200 }, lifespan: 900, frequency: 10, scale: { min: 0.5, max: 0.9 }, alpha: 0.6 }],
      embers: ["p_ember", { x: X, y: 730, speedY: { min: -180, max: -80 }, speedX: { min: -120, max: 40 }, lifespan: 4000, frequency: 70, scale: { min: 1, max: 2 }, tint: [0xff6d00, 0xffab00, 0xff1744], blendMode: Phaser.BlendModes.ADD }],
      spray: ["p_drop", { x: X, y: 730, speedY: { min: -360, max: -200 }, speedX: { min: -200, max: -80 }, gravityY: 500, lifespan: 1600, frequency: 60, scale: { min: 0.4, max: 0.8 }, alpha: 0.7 }],
    };
    const c = cfg[t.weather];
    if (!c) return;
    // máy yếu: thưa hạt hơn
    const conf = { ...c[1], frequency: ((c[1].frequency as number) ?? 60) * (this.lowFx ? 3 : 1.6) };
    this.weatherFx = this.add.particles(0, 0, c[0], conf).setDepth(940);
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
    this.boostBtn = new Button(this, 1150, 630, 210, 100, "TĂNG TỐC", { color: COLORS.purple, fontSize: 28, sub: "Shift / E", onClick: () => this.doBoost() });
    this.jumpBtn = new Button(this, 1150, 470, 210, 90, "NHẢY", { color: COLORS.orange, fontSize: 30, sub: "Space", onClick: () => this.doJump() });
    this.energyBar = new Bar(this, 1050, 560, 200, 16, COLORS.purple, "");
    this.itemBtn = new Button(this, 80, 340, 110, 100, "—", { color: COLORS.panelLight, fontSize: 40, sub: "DÙNG (Q)", onClick: () => this.doItem() });
    c.add([up, down, this.boostBtn, this.energyBar, this.jumpBtn, this.itemBtn]);
  }

  private setupInput() {
    const kb = this.input.keyboard;
    kb?.on("keydown-UP", () => this.lane(-1));
    kb?.on("keydown-W", () => this.lane(-1));
    kb?.on("keydown-DOWN", () => this.lane(1));
    kb?.on("keydown-S", () => this.lane(1));
    kb?.on("keydown-SPACE", (e: KeyboardEvent) => {
      e.preventDefault();
      this.doJump();
    });
    kb?.on("keydown-SHIFT", () => this.doBoost());
    kb?.on("keydown-E", () => this.doBoost());
    kb?.on("keydown-Q", () => this.doItem());
    kb?.on("keydown-F", () => this.doItem());
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

  private doItem() {
    if (this.mode !== "race" || !this.session) return;
    if (!this.session.player.item) return toast(this, "Chưa có đồ – đi qua 🎁 hộp may mắn để nhặt!");
    this.session.useItem("me");
  }

  private doJump() {
    if (this.mode !== "race" || !this.session) return;
    if (!this.session.jump("me") && this.session.isJumping(this.session.player) === false) toast(this, "Nhảy đang hồi chiêu!");
  }

  private doBoost() {
    if (this.mode === "countdown" && this.session && !this.falseStartFlag) {
      // bấm sớm trước tiếng XUẤT PHÁT → xuất phát lỗi
      this.falseStartFlag = true;
      toast(this, "Bấm sớm quá! Sẽ bị khựng lúc xuất phát 😵", COLORS.red);
      return;
    }
    if (this.mode !== "race" || !this.session) return;
    if (!this.session.boost("me")) {
      if (this.session.player.energy < 100) toast(this, "Năng lượng chưa đầy!");
    }
  }

  private countdown() {
    this.mode = "countdown";
    this.falseStartFlag = false;
    this.layoutRace();
    const mp = RACE_MAPS[this.mapId];
    const banner = txt(this, 640, 200, `${mp.icon} ${mp.name}\n${mp.sections[0].name} → ${mp.sections[1].name} → ${mp.sections[2].name}`, 26, { align: "center", color: "#ffe082" })
      .setOrigin(0.5)
      .setDepth(1500);
    this.time.delayedCall(3400, () => banner.destroy());
    const tip = txt(this, 640, 400, "Mẹo: TĂNG TỐC đúng lúc \"XUẤT PHÁT!\" · Space NHẢY · Q dùng đồ 🎁 · 🦈🐙🔥 không nhảy qua được – phải né!", 17, {
      align: "center",
      weight: "700",
      wrap: 900,
    })
      .setOrigin(0.5)
      .setDepth(1500);
    this.time.delayedCall(3400, () => tip.destroy());
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
          if (this.falseStartFlag) this.session?.falseStart("me");
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
      if (this.room) this.netStep(dt);
      if (s.over) {
        if (!this.room) this.finish();
        else {
          // chờ người chơi khác về đích (tối đa 15 giây)
          if (!this.waitEndAt) this.waitEndAt = Date.now() + 15000;
          const pending = s.racers.some((r) => r.remote && r.finishTime === null);
          if (pending && Date.now() < this.waitEndAt) {
            if (!this.waitT) this.waitT = txt(this, 640, 330, "⏳ Chờ người chơi khác về đích…", 30, { align: "center" }).setOrigin(0.5).setDepth(1400);
          } else {
            this.waitT?.destroy();
            this.waitT = undefined;
            this.finish();
          }
        }
      }
      this.watchFps(dt);
    }
    // chỉ dựng lại đường đua khi đang đếm ngược / đua (màn chọn & kết quả không cần → đỡ tốn pin)
    if (this.mode === "race" || this.mode === "countdown") this.layoutRace(dt);
  }

  /** Khung hình thấp kéo dài 2 giây → bật chế độ nhẹ. */
  private watchFps(dt: number) {
    if (this.lowFx) return;
    this.fpsLowT = this.game.loop.actualFps < 40 ? this.fpsLowT + dt : 0;
    if (this.fpsLowT > 2000) {
      this.lowFx = true;
      if (this.theme) this.setWeather(this.theme);
    }
  }

  /** Gửi vị trí của mình + nhận vị trí người khác (~2,5 lần/giây). */
  private netStep(dt: number) {
    this.netT += dt;
    if (this.netT < NET_MS || this.netBusy || !this.room || !this.session || !GameState.online) return;
    this.netT = 0;
    this.netBusy = true;
    const s = this.session;
    const me = s.player;
    const roomId = this.room.room_id;
    const myId = GameState.online.id;
    void (async () => {
      try {
        await Social.raceUpdate(roomId, myId, { x: Math.min(1999, me.x), lane: me.lane, boosting: s.time < me.boostUntil, finish_ms: me.finishTime });
        const rows = await Social.raceMembers(roomId);
        const now = Date.now();
        for (const row of rows) {
          if (row.user_id === myId) continue;
          const prev = this.remote.get(row.user_id);
          const v = prev && now > prev.t ? Math.max(0, (row.x - prev.x) / ((now - prev.t) / 1000)) : 0;
          this.remote.set(row.user_id, { x: row.x, t: now, v });
          s.setRemote(row.user_id, { x: s.racers.find((r) => r.id === row.user_id)?.x ?? row.x, lane: row.lane, boosting: row.boosting, finishTime: row.finish_ms });
          // người chơi khác về đích → báo cho mọi người đúng thứ hạng của họ
          const rr = s.racers.find((r) => r.id === row.user_id);
          if (rr && rr.finishTime !== null && !this.announced.has(rr.id)) {
            this.announced.add(rr.id);
            const f = s.finishRank(rr);
            const word = ["", "NHẤT", "NHÌ", "BA"][f.place] ?? `hạng ${f.place}`;
            toast(this, `🏁 ${rr.name} về ${word}${f.provisional ? " (tạm)" : ""}`, COLORS.blue);
          }
        }
        // mình đã về đích, chờ đủ thông tin → báo đúng thứ hạng
        if (this.pendingPlace && me.finishTime !== null) {
          const f = s.finishRank(me);
          if (!f.provisional) this.announcePlace(f.place);
        }
      } catch {
        /* mất mạng tạm – thử lại lần sau */
      } finally {
        this.netBusy = false;
      }
    })();
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
      const st = obstacleAt(o, s.time);
      const x = sx(st.x);
      const w = o.kind === "drift" ? (o.len ?? 50) * PX : 0;
      const visible = x + w > -ex - 150 && x < 1280 + ex + 150;
      let img = this.obstacleImgs.get(o.id);
      if (!visible) {
        if (img) {
          this.tweens.killTweensOf(img);
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
      if (o.kind === "shark") {
        // cá mập bơi giữa các làn (vị trí làn liên tục)
        const lp = st.lanePos;
        const lo = Math.floor(lp);
        const fr = lp - lo;
        const y = LANE_Y[lo]! + ((LANE_Y[Math.min(2, lo + 1)] ?? LANE_Y[lo]!) - LANE_Y[lo]!) * fr;
        img.setY(y + 26).setDepth(y - 1).setScale(0.75 + lp * 0.1);
        if (img instanceof Phaser.GameObjects.Image) img.setFlipX(Math.cos(((s.time + (o.phase ?? 0)) / (o.period ?? 2400)) * Math.PI * 2) < 0);
        const warn = img.getData("warn") as Phaser.GameObjects.Text | undefined;
        const near = st.x - s.player.x;
        if (warn) warn.setPosition(x, y - 40).setVisible(near > 0 && near < 70 && Math.floor(this.time.now / 200) % 2 === 0);
      }
      if (o.kind === "jelly") {
        const y = LANE_Y[o.lane]!;
        img.setY(y + (st.active ? 0 : 34)).setAlpha(st.active ? 1 : 0.3).setScale(LANE_SCALE[o.lane]! * (st.active ? 1 : 0.8));
      }
      if (o.kind === "log") img.setAngle(Math.sin((this.time.now + o.id * 200) / 260) * 3);
      if (o.kind === "whirl") img.setScale(LANE_SCALE[o.lane]! * (1 + Math.sin(this.time.now / 200) * 0.05));
      if (o.kind === "drift" && img instanceof Phaser.GameObjects.TileSprite) img.tilePositionY -= (o.dir ?? 1) * 2.5;
      if (o.kind === "box" && img instanceof Phaser.GameObjects.Container) {
        img.setY(LANE_Y[o.lane]! - 6 + Math.sin((this.time.now + o.id * 170) / 220) * 5).setAlpha(this.pickedBoxes.has(o.id) ? 0.2 : 1);
        (img.list[0] as Phaser.GameObjects.Graphics | undefined)?.setAngle(Math.sin(this.time.now / 300) * 8);
      }
      if ((o.kind === "eruption" || o.kind === "tentacle") && img instanceof Phaser.GameObjects.Container) {
        const [glow, body] = img.list as [Phaser.GameObjects.Ellipse, Phaser.GameObjects.Image];
        glow.setVisible(st.warn || st.active).setAlpha(st.warn ? 0.4 + (Math.floor(this.time.now / 120) % 2) * 0.4 : 0.7);
        if (o.kind === "eruption") body.setVisible(st.active).setScale(LANE_SCALE[o.lane]! * (0.9 + Math.random() * 0.15), LANE_SCALE[o.lane]!);
        else body.setVisible(true).setAlpha(st.active ? 1 : 0.18).setY(st.active ? 24 : 80);
      }
    }
    // sương mù / bão: chỉ thấy rõ một khoảng phía trước
    this.fogG.clear();
    const fogM = s.sectionOf(me).fog;
    if (fogM && this.mode !== "result") {
      const col = this.theme.weather === "snow" ? 0xeceff1 : this.theme.weather === "ash" ? 0x6d4c41 : 0x37474f;
      const x0 = ME_X + fogM * PX;
      for (let i = 0; i < 14; i++) this.fogG.fillStyle(col, Math.min(0.94, 0.08 + i * 0.07)).fillRect(x0 + i * 40, 330, 40, 390);
      this.fogG.fillStyle(col, 0.94).fillRect(x0 + 14 * 40, 330, 1280 + ex * 2, 390);
    }
    // bị mực che mắt
    this.inkG.clear();
    if (s.time < (me.inkUntil ?? 0)) {
      const a = Math.min(1, ((me.inkUntil ?? 0) - s.time) / 600);
      this.inkG.fillStyle(0x111111, 0.72 * a);
      for (const [x, y, r] of [[300, 260, 160], [720, 420, 210], [1050, 220, 140], [520, 600, 130], [900, 620, 120]] as const) this.inkG.fillCircle(x, y, r);
    }
    const fx = sx(RACE.length);
    this.finishImg.setVisible(fx < 1280 + ex + 200).setX(fx);
    // người chơi khác: nội suy mượt giữa các lần nhận vị trí
    const now = Date.now();
    for (const r of s.racers) {
      if (!r.remote) continue;
      const st = this.remote.get(r.id);
      if (!st) continue;
      const target = r.finishTime !== null ? Math.max(st.x, RACE.length + 5) : st.x + st.v * Math.min(0.6, (now - st.t) / 1000);
      r.x += (target - r.x) * Math.min(1, dt / 160);
      r.v = st.v;
    }
    // người đua
    for (const v of this.views) {
      const r = v.r;
      const targetY = LANE_Y[r.lane]!;
      v.y += (targetY - v.y) * Math.min(1, dt / 90);
      const boosting = s.time < r.boostUntil;
      const slowed = s.time < r.slowUntil;
      const k = LANE_SCALE[r.lane]!;
      const bob = Math.sin((this.time.now + v.r.id.length * 200) / (boosting ? 60 : 140)) * (boosting ? 5 : 3);
      const jumping = s.isJumping(r);
      const jp = jumping ? 1 - (r.jumpUntil! - s.time) / RACE.jumpMs : 0;
      const lift = jumping ? Math.sin(jp * Math.PI) * 80 : 0;
      v.root.setPosition(sx(r.x), v.y + bob - lift).setScale(k).setDepth(v.y + (r.id === "me" ? 0.5 : 0) + (jumping ? 20 : 0));
      v.wake.setVisible(!jumping);
      v.fish.setAngle(Math.sin(this.time.now / (boosting ? 50 : 120)) * (slowed ? 10 : 4));
      v.rider.setAngle(boosting ? -8 : slowed ? 10 : -2);
      v.wake.setScale(0.6 + Math.min(1.6, r.v / 18), 1).setAlpha(slowed ? 0.2 : 0.55);
      v.aura.setAlpha(boosting ? 0.45 + Math.sin(this.time.now / 60) * 0.15 : 0);
      v.fish.setTint(slowed ? 0x9e9e9e : 0xffffff);
      v.shield.setVisible(s.time < (r.shieldUntil ?? 0)).setScale(1 + Math.sin(this.time.now / 150) * 0.04);
      // vệt bóng mờ khi tăng tốc
      // (chế độ nhẹ: chỉ vệt của mình; bình thường: của người khác thưa hơn)
      if (boosting && dt && (r.id === "me" || !this.lowFx)) {
        v.ghostT += dt;
        if (v.ghostT > (r.id === "me" ? (this.lowFx ? 110 : 70) : 140)) {
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

  private makeObstacle(o: Obstacle): Phaser.GameObjects.Image | Phaser.GameObjects.Container | Phaser.GameObjects.TileSprite {
    const y = LANE_Y[o.lane]!;
    const k = LANE_SCALE[o.lane]!;
    const th = RACE_THEMES[this.mapId]![sectionIndex(o.x)];
    if (o.kind === "rock") {
      const img = this.add.image(0, y + 26, "race_rock").setOrigin(0.5, 0.9).setScale(k).setDepth(y - 1);
      if (th.rockTint) img.setTint(th.rockTint);
      return img;
    }
    if (o.kind === "log") {
      const img = this.add.image(0, y + 22, "race_log").setOrigin(0.5, 0.8).setScale(k).setDepth(y - 1);
      if (th.logTint) img.setTint(th.logTint);
      return img;
    }
    if (o.kind === "geyser") return this.add.image(0, y + 18, "race_geyser").setScale(k).setDepth(y - 30);
    if (o.kind === "drift")
      return this.add
        .tileSprite(0, y + 12, (o.len ?? 50) * PX, 70, "race_drift")
        .setOrigin(0, 0.5)
        .setFlipY((o.dir ?? 1) < 0)
        .setDepth(y - 40);
    if (o.kind === "box") {
      const g = this.add.graphics();
      g.fillStyle(0xffd740, 1).fillRoundedRect(-24, -24, 48, 48, 10).lineStyle(4, 0x1b1530).strokeRoundedRect(-24, -24, 48, 48, 10);
      g.fillStyle(0xff5252, 1).fillRect(-5, -24, 10, 48).fillRect(-24, -5, 48, 10);
      const q = txt(this, 0, 0, "?", 26, { align: "center", color: "#ffffff" }).setOrigin(0.5);
      return this.add.container(0, y - 6, [g, q]).setScale(k).setDepth(y + 1);
    }
    if (o.kind === "eruption" || o.kind === "tentacle") {
      const glow = this.add.ellipse(0, 22, 110, 26, o.kind === "eruption" ? (th.strike === "lightning" ? 0x82b1ff : 0xff3d00) : 0xce93d8, 0.6);
      const key = o.kind === "tentacle" ? "race_tentacle" : th.strike === "lightning" ? "race_bolt" : "race_lava";
      const body = this.add.image(0, o.kind === "tentacle" ? 24 : 26, key).setOrigin(0.5, 1).setScale(k);
      if (o.kind === "eruption" && th.strike === "lightning") body.setY(30);
      return this.add.container(0, y, [glow, body]).setDepth(y + 2);
    }
    if (o.kind === "seaweed") return this.add.image(0, y + 24, "race_weed").setOrigin(0.5, 0.92).setScale(k).setDepth(y - 1);
    if (o.kind === "shark") {
      const img = this.add.image(0, y + 26, "race_shark").setOrigin(0.5, 0.75).setDepth(y - 1);
      const warn = txt(this, 0, y - 40, "⚠ 🦈", 22, { color: "#ff5252", align: "center" }).setOrigin(0.5).setDepth(1100).setVisible(false);
      img.setData("warn", warn);
      img.once(Phaser.GameObjects.Events.DESTROY, () => warn.destroy());
      return img;
    }
    if (o.kind === "jelly") return this.add.image(0, y, "race_jelly").setOrigin(0.5, 0.7).setScale(k).setDepth(y - 1);
    if (o.kind === "whirl") {
      const img = this.add.image(0, y + 18, "race_whirl").setScale(k).setDepth(y - 30);
      this.tweens.add({ targets: img, angle: 360, duration: 1400, repeat: -1 });
      return img;
    }
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
    for (const mk of [400, 800]) g.fillStyle(0xffe082, 1).fillRect(320 + (mk / RACE.length) * 640 - 2, 102, 4, 26);
    const it = me.item;
    if (this.itemBtn.getData("item") !== (it ?? null)) {
      this.itemBtn.setData("item", it ?? null);
      this.itemBtn.setText(it ? RACE_ITEM_INFO[it].icon : "—");
      this.itemBtn.setColor(it ? COLORS.gold : COLORS.panelLight);
    }
    const place = s.placeOf("me");
    this.placeT.setText(`Hạng ${place}/${s.racers.length}`);
    this.speedT.setText(`${Math.round(me.v * 3.6)} km/h · ${Math.max(0, Math.round(RACE.length - me.x))}m`);
    this.energyBar.set(me.energy / 100, me.energy >= 100 ? COLORS.gold : COLORS.purple);
    this.jumpBtn.setDisabled(!s.canJump(me));
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
        if (mine && e.super) {
          this.bigText("⚡ SIÊU TĂNG TỐC!! ⚡", "#80d8ff");
          this.cameras.main.flash(300, 128, 216, 255);
        }
        if (mine) {
          Sfx.skill();
          const c = v.color;
          this.cameras.main.flash(220, (c >> 16) & 255, (c >> 8) & 255, c & 255);
          this.cameras.main.shake(260, 0.006);
          this.tweens.add({ targets: this.cameras.main, zoom: 1.06, duration: 180, yoyo: true, hold: 900, ease: "Sine.easeOut" });
          if (!e.super) this.bigText("TĂNG TỐC!!", "#ffeb3b");
          // vòng sóng xung kích
          const ring = this.add.circle(v.root.x, v.root.y, 30, c, 0).setStrokeStyle(8, c, 0.9).setDepth(950);
          this.tweens.add({ targets: ring, scale: 6, alpha: 0, duration: 600, onComplete: () => ring.destroy() });
        } else this.floatText(v, "🔥 Tăng tốc!", "#ffab40");
        break;
      }
      case "hit": {
        this.splash(v, 14, e.kind === "jelly" ? 0xea80fc : 0xffffff);
        if (mine) {
          Sfx.fail();
          const heavy = e.kind !== "seaweed" && e.kind !== "jelly";
          this.cameras.main.shake(heavy ? 300 : 200, heavy ? 0.014 : 0.006);
          const label: Record<string, string> = {
            eruption: this.theme.strike === "lightning" ? "⚡ Bị sét đánh!" : "🔥 Dính cột dung nham!",
            tentacle: "🐙 Xúc tu quật trúng!",
            rock: "💥 Đâm đá!",
            seaweed: "🌿 Vướng rong!",
            shark: "🦈 Bị cá mập đớp! −40 năng lượng",
            log: "🪵 Đâm khúc gỗ!",
            jelly: "⚡ Sứa chích! −25 năng lượng",
            whirl: "🌀 Kẹt xoáy nước!",
          };
          this.floatText(v, label[e.kind] ?? "Va chạm!", "#ff8a80");
          if (e.kind === "jelly") this.cameras.main.flash(150, 234, 128, 252);
          if (e.kind === "whirl") this.tweens.add({ targets: v.fish, angle: 720, duration: 900 });
        }
        break;
      }
      case "jump":
        this.splash(v, 12, 0xffffff);
        if (mine) Sfx.cast();
        break;
      case "dodge_jump":
        if (mine) {
          Sfx.crit();
          this.floatText(v, `✨ Nhảy qua ${OBSTACLE_INFO[e.kind].name.toLowerCase()}!`, "#b9f6ca");
        }
        break;
      case "perfect_start":
        if (mine) {
          Sfx.skill();
          this.bigText("🚀 XUẤT PHÁT HOÀN HẢO!", "#69f0ae");
          this.splash(v, 26, v.color);
        }
        break;
      case "false_start":
        if (mine) this.floatText(v, "😵 Xuất phát lỗi!", "#ff8a80");
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
      case "section":
        if (mine) {
          this.secIdx = e.index;
          this.applyTheme(this.mapId, e.index, false);
          const sec = RACE_MAPS[this.mapId].sections[e.index];
          this.bigText(`${RACE_MAPS[this.mapId].icon} ${sec.name}`, "#ffe082");
          this.floatText(v, `+${15} năng lượng`, "#b388ff");
          this.cameras.main.flash(400, 255, 255, 255);
          if (sec.fog) this.time.delayedCall(900, () => toast(this, "🌫 Tầm nhìn bị che – nhìn kỹ phía trước!", COLORS.blue));
          if (sec.ice) this.time.delayedCall(900, () => toast(this, "🧊 Mặt băng trơn – đổi làn chậm lại!", COLORS.blue));
        }
        break;
      case "geyser":
        this.splash(v, 26, 0xe0f7fa);
        if (mine) this.floatText(v, "💨 Mạch phun hất bay!", "#80deea");
        break;
      case "drift":
        if (mine) this.floatText(v, e.dir > 0 ? "🌊 Bị đẩy xuống!" : "🌊 Bị đẩy lên!", "#80deea");
        break;
      case "item_get":
        if (mine) {
          this.pickedBoxes.add(e.box);
          Sfx.crit();
          // vòng quay đồ ngắn trên ô đồ
          const icons = Object.values(RACE_ITEM_INFO).map((x) => x.icon);
          let n = 0;
          const tm = this.time.addEvent({
            delay: 70,
            repeat: 7,
            callback: () => {
              n++;
              this.itemBtn.setText(n >= 8 ? RACE_ITEM_INFO[e.item].icon : icons[n % icons.length]!);
            },
          });
          void tm;
          this.time.delayedCall(620, () => toast(this, `🎁 ${RACE_ITEM_INFO[e.item].icon} ${RACE_ITEM_INFO[e.item].name}: ${RACE_ITEM_INFO[e.item].desc}`, COLORS.gold));
        }
        break;
      case "item_use": {
        const item: RaceItem = e.item;
        if (item === "turbo") {
          this.splash(v, 20, 0xff9100);
          if (mine) this.bigText("🚀 TÊN LỬA NƯỚC!", "#ffab40");
        } else if (item === "shield") {
          if (mine) this.floatText(v, "🛡 Khiên bong bóng!", "#80d8ff");
        } else {
          for (const tid of e.targets) {
            const tv = this.views.find((x) => x.r.id === tid);
            if (!tv) continue;
            if (item === "ink") {
              const blob = this.add.circle(v.root.x, v.root.y - 40, 12, 0x111111).setDepth(1200);
              this.tweens.add({ targets: blob, x: tv.root.x, y: tv.root.y - 40, duration: 350, onComplete: () => (blob.destroy(), this.splash(tv, 18, 0x111111)) });
            } else {
              const bolt = this.add.image(tv.root.x, tv.root.y - 30, "race_bolt").setOrigin(0.5, 1).setScale(0.6).setDepth(1200);
              this.tweens.add({ targets: bolt, alpha: 0, duration: 500, delay: 150, onComplete: () => bolt.destroy() });
              this.splash(tv, 14, 0xfff59d);
            }
            if (tid === "me") {
              this.cameras.main.shake(250, 0.01);
              this.floatText(tv, item === "ink" ? "🦑 Bị bom mực!" : "⚡ Bị sét giật!", "#ff8a80");
            }
          }
          if (mine) {
            this.bigText(item === "ink" ? "🦑 BOM MỰC!" : "⚡ SẤM SÉT!", item === "ink" ? "#b0bec5" : "#fff59d");
            if (item === "thunder") this.cameras.main.flash(250, 255, 253, 200);
          }
        }
        break;
      }
      case "shield_block":
        this.splash(v, 16, 0x80d8ff);
        this.floatText(v, "🛡 Chặn!", "#80d8ff");
        break;
      case "energy_full":
        if (mine) toast(this, "⚡ Năng lượng đầy – bấm TĂNG TỐC!", COLORS.purple);
        break;
      case "finish":
        if (mine) {
          this.cameras.main.flash(300, 255, 255, 255);
          if (e.provisional) {
            // người chơi khác có thể đã về trước mà chưa báo → chờ xếp hạng chắc chắn
            Sfx.catchFanfare(false);
            this.bigText("🏁 VỀ ĐÍCH!", "#ffffff");
            this.pendingPlace = true;
          } else this.announcePlace(e.place);
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

  /** Thông báo đúng thứ hạng của mình: NHẤT / NHÌ / BA / hạng N. */
  private announcePlace(place: number) {
    this.pendingPlace = false;
    Sfx.catchFanfare(place === 1);
    const label = ["", "🥇 VỀ NHẤT!", "🥈 VỀ NHÌ!", "🥉 VỀ BA!"][place] ?? `VỀ ĐÍCH HẠNG ${place}`;
    this.bigText(label, place === 1 ? "#ffd740" : place === 2 ? "#e0e0e0" : place === 3 ? "#ffab40" : "#ffffff");
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
    // đua nhiều người: gửi ngay thời gian về đích (đua kết thúc nhanh có thể chưa kịp gửi ở nhịp mạng)
    if (this.room && GameState.online && s.player.finishTime !== null)
      void Social.raceUpdate(this.room.room_id, GameState.online.id, { x: Math.min(1999, s.player.x), lane: s.player.lane, boosting: false, finish_ms: s.player.finishTime }).catch(() => null);
    const place = s.placeOf("me");
    const res = GameState.raceResult(this.entryTx, this.league, place);
    const reward = res.ok ? res.reward! : raceReward(this.league, place);
    // ghi thành tích lên bục vinh danh toàn server
    const me = s.player;
    if (GameState.online && me.finishTime !== null) {
      const league = this.league;
      void Social.raceSubmitTime(league, me.finishTime, me.fishId, me.charId, GameState.equipOf(me.charId))
        .then((rank) => {
          this.records.delete(league);
          if (rank !== null && rank <= 3) toast(this, `🏆 Bạn đứng hạng ${rank} trên Bục vinh danh ${RACE_LEAGUES[league].name}!`, COLORS.gold);
        })
        .catch(() => null);
    }
    this.time.delayedCall(600, () => {
      this.hud.setVisible(false);
      this.speedG.clear();
      const m = modal(this, 900, 680, place === 1 ? "🏆 VÔ ĐỊCH!" : `🏁 Về đích hạng ${place}`, () => {
        this.showSelect();
        // đua trong phòng riêng → quay lại phòng để đua tiếp
        if (RaceScene.lobbyId) this.time.delayedCall(250, () => void this.showLobby());
      });
      m.root.setDepth(2000); // trên panel chọn (1000) và HUD
      const order = s.standings();
      const equipOf = (r: Racer) => (this.equips.get(r.id) ?? {}) as Partial<Record<string, string>>;
      this.drawPodium(
        m.root,
        640,
        m.y + 300,
        1,
        order.slice(0, 3).map((r) => ({
          name: r.id === "me" ? "BẠN" : r.name,
          charId: r.charId,
          equip: equipOf(r),
          fishId: r.fishId,
          formId: r.formId,
          label: r.finishTime !== null ? `${(r.finishTime / 1000).toFixed(2)}s` : "—",
          mine: r.id === "me",
        })),
        true,
      );
      // pháo giấy mừng top 3
      for (let i = 0; i < 40; i++) {
        const cf = this.add.rectangle(Phaser.Math.Between(m.x + 40, m.x + m.w - 40), m.y + 60, 8, 12, Phaser.Utils.Array.GetRandom([0xff5252, 0xffd740, 0x69f0ae, 0x40c4ff, 0xea80fc]));
        m.root.add(cf);
        this.tweens.add({ targets: cf, y: m.y + Phaser.Math.Between(200, 380), angle: Phaser.Math.Between(-360, 360), alpha: 0, duration: Phaser.Math.Between(1200, 2200), delay: Phaser.Math.Between(0, 500) });
      }
      order.forEach((r, i) => {
        const y = m.y + 372 + i * 42;
        const mine = r.id === "me";
        const def = FISH_BY_ID.get(r.fishId)!;
        const g = this.add.graphics();
        g.fillStyle(mine ? 0x1e4d7a : 0x0a1628, 0.95).fillRoundedRect(m.x + 30, y - 19, m.w - 60, 38, 10);
        m.root.add(g);
        m.root.add(this.add.image(m.x + 110, y, fishTextureFor(this, def, r.formId)).setDisplaySize(54, 34));
        m.root.add(txt(this, m.x + 50, y, ["🥇", "🥈", "🥉", "4", "5"][i] ?? String(i + 1), 22).setOrigin(0.5));
        m.root.add(txt(this, m.x + 160, y, `${mine ? "⭐ BẠN" : r.name} · ${def.name} (${r.stats.grade})`, 17, { color: mine ? "#ffeb3b" : "#ffffff" }).setOrigin(0, 0.5));
        m.root.add(
          txt(this, m.x + m.w - 50, y, r.finishTime !== null ? `${(r.finishTime / 1000).toFixed(2)}s` : `còn ${Math.round(RACE.length - r.x)}m`, 16, { weight: "700" }).setOrigin(1, 0.5),
        );
      });
      const line = `Thưởng: ${reward.gold ? `🪙${formatNum(reward.gold)} ` : ""}${reward.diamonds ? `💎${reward.diamonds} ` : ""}✨${reward.xp} KN`;
      m.root.add(txt(this, 640, m.y + m.h - 96, res.ok ? line : `⚠ ${res.error}`, 22, { color: COLORS.textGold, align: "center" }).setOrigin(0.5));
      m.root.add(new Button(this, 520, m.y + m.h - 44, 220, 56, "🔁 Đua tiếp", { color: COLORS.green, fontSize: 22, onClick: () => m.close() }));
      m.root.add(new Button(this, 760, m.y + m.h - 44, 200, 56, "Về sảnh", { color: COLORS.blue, fontSize: 22, onClick: () => goTo(this, "Hub") }));
    });
  }

  private confirmQuit() {
    const m = modal(this, 560, 280, "Bỏ cuộc?");
    m.root.setDepth(2000); // trên panel chọn (1000) và HUD
    m.root.add(txt(this, 640, m.y + 120, "Bỏ dở cuộc đua sẽ mất phí vào cửa.", 20, { align: "center" }).setOrigin(0.5));
    m.root.add(new Button(this, 540, m.y + 210, 180, 56, "Bỏ cuộc", { color: COLORS.red, fontSize: 20, onClick: () => goTo(this, "Hub") }));
    m.root.add(new Button(this, 740, m.y + 210, 180, 56, "Đua tiếp", { color: COLORS.green, fontSize: 20, onClick: () => m.close() }));
  }
}

