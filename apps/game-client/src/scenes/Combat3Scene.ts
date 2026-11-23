import Phaser from "phaser";
import { ELEMENT_INFO, FISH_RARITY_COLOR } from "@dccc/game-config";
import { FISH_BY_ID, FORM_BY_ID } from "@dccc/game-data";
import {
  AI_LEVEL_LABEL,
  ENERGY_MAX,
  GUARD_LABEL,
  energyOf,
  MATCHUP_LABEL,
  TIMING_BANDS,
  TIMING_LABEL,
  TURN_TIME_MS,
  dmAiLevel,
  dmRankChange,
  dmRankLabel,
  dmRankOf,
  dmRankPoints,
  needlePos,
  timingZone,
  type AiLevel,
  type BarParams,
  type CombatEvent,
  type CombatFish,
  type CombatState,
  type TimingZone,
} from "@dccc/shared";
import { fishDisplayMult, fishTextureFor } from "../art/textures.ts";
import { hexToInt } from "../art/color.ts";
import { Bar, Button, fadeIn, formatNum, goTo, modal, toast, txt } from "../ui/widgets.ts";
import { COLORS } from "../ui/theme.ts";
import { elementBadges } from "../ui/element.ts";
import { Sfx } from "../audio/Sfx.ts";
import { PvpDriver, makeDriver, type CombatDriver, type CombatView, type PlayerAction } from "../state/combatDriver.ts";
import { GameState, pvpOutcome } from "../state/GameState.ts";
import { pvpCall, type PvpStake } from "../state/pvp.ts";

/** Trận với người: id phòng + tên đối thủ + mức cược. */
export interface PvpMatchInfo {
  id: string;
  oppName: string;
  stake: PvpStake;
}

/** Toạ độ thanh canh lực. */
const BAR = { x: 330, y: 560, w: 620, h: 40 };
const ZONE_COLOR: Record<TimingZone, number> = { red: 0xe53935, yellow: 0xfdd835, green: 0x43a047, perfect: 0xb2ff59 };
const SIDE_X = [330, 950] as const;
const FISH_Y = 330;

interface SideUi {
  img: Phaser.GameObjects.Image;
  hp: Bar;
  hpT: Phaser.GameObjects.Text;
  name: Phaser.GameObjects.Text;
  badge: Phaser.GameObjects.Container;
  status: Phaser.GameObjects.Text;
  dots: Phaser.GameObjects.Graphics;
}

/**
 * TRẬN 3VS3 THEO LƯỢT: Tấn công (canh lực) · Kỹ năng · Phòng thủ.
 * Mọi con số do trọng tài (máy chủ khi đăng nhập / lõi trận khi chơi không tài khoản) tính – màn này chỉ hiển thị.
 */
export class Combat3Scene extends Phaser.Scene {
  private driver!: CombatDriver;
  private team: string[] = [];
  private level: AiLevel = "normal";
  private view?: CombatView;
  private ui: SideUi[] = [];
  private needle?: Phaser.GameObjects.Graphics;
  private barRoot?: Phaser.GameObjects.Container;
  private bar: BarParams | null = null;
  private barT0 = 0;
  private myTurn = false;
  private busy = false;
  private turnT?: Phaser.GameObjects.Text;
  private turnLeftMs = 0;
  private btnAtk?: Button;
  private btnSkill?: Button;
  private btnDef?: Button;
  private banner?: Phaser.GameObjects.Text;

  constructor() {
    super("Combat3");
  }

  private pvp: PvpMatchInfo | null = null;
  private finished = false;

  init(data: { team: string[]; level?: AiLevel; pvp?: PvpMatchInfo }) {
    this.team = data.team;
    // đấu sinh tử với máy: độ khó theo rank (không tự chọn)
    this.level = data.pvp ? (data.level ?? "normal") : dmAiLevel(dmRankPoints(GameState.save.stats));
    this.pvp = data.pvp ?? null;
    this.finished = false;
    this.ui = [];
    this.view = undefined;
    this.myTurn = false;
    this.busy = false;
  }

  create() {
    // Phaser dùng lại cùng đối tượng màn → làm mới tham chiếu đồ hoạ của trận trước (đã bị huỷ)
    this.energyUi = [];
    fadeIn(this);
    this.drawArena();
    new Button(this, 76, 44, 128, 62, "← Thoát", { color: COLORS.blue, fontSize: 24, onClick: () => this.confirmExit() }).setDepth(60);
    const foeLabel = this.pvp ? `👤 ${this.pvp.oppName} · ${this.pvp.stake === "friendly" ? "Giao hữu" : "Sinh tử"}` : `🤖 Máy · ${AI_LEVEL_LABEL[this.level]}`;
    txt(this, 1180, 44, foeLabel, 18, { align: "right", weight: "700" }).setOrigin(1, 0.5).setDepth(60);
    this.banner = txt(this, 640, 40, "Đang vào trận…", 30, { color: COLORS.textGold, align: "center" }).setOrigin(0.5).setDepth(60);
    this.turnT = txt(this, 640, 84, "", 22, { align: "center" }).setOrigin(0.5).setDepth(60);
    this.driver = this.pvp ? new PvpDriver(this.pvp.id) : makeDriver();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.driver instanceof PvpDriver) this.driver.stopped = true;
    });
    // phím tắt: Space đánh · B canh bảo vệ · V kỹ năng (đủ nộ)
    this.input.keyboard?.on("keydown-SPACE", () => this.press("attack"));
    this.input.keyboard?.on("keydown-B", () => this.press("defend"));
    this.input.keyboard?.on("keydown-V", () => this.press("skill"));
    void this.driver
      .start(this.team, this.level)
      .then((v) => this.onView(v, true))
      .catch((e: Error) => {
        toast(this, e.message, COLORS.red);
        this.time.delayedCall(1500, () => this.back());
      });
  }

  // ---------------------------------------------------------------- khung cảnh
  private drawArena() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x4fc3f7, 0x4fc3f7, 0x0d47a1, 0x0d47a1, 1).fillRect(0, 0, 1280, 720);
    // cột đá & cờ hai phe
    for (const [x, c] of [[120, 0x1e88e5], [1160, 0xe53935]] as const) {
      g.fillStyle(0xcfd8dc, 1).fillRect(x - 34, 140, 68, 330);
      g.lineStyle(4, 0x37474f).strokeRect(x - 34, 140, 68, 330);
      g.fillStyle(c, 1).fillTriangle(x - 30, 160, x + 30, 160, x, 290);
      g.fillRect(x - 30, 150, 60, 80);
    }
    // sàn đấu nước
    g.fillStyle(0x0277bd, 0.9).fillEllipse(640, 430, 980, 190);
    g.lineStyle(6, 0xb3e5fc, 0.8).strokeEllipse(640, 430, 980, 190);
    g.lineStyle(3, 0xe1f5fe, 0.5).strokeEllipse(640, 430, 760, 130);
    g.fillStyle(0x000000, 0.35).fillRect(0, 500, 1280, 220);
    txt(this, 640, 300, "⚔", 90, { color: "#e1f5fe" }).setOrigin(0.5).setAlpha(0.18);
  }

  private buildSide(side: 0 | 1, f: CombatFish) {
    const def = FISH_BY_ID.get(f.fishId)!;
    const x = SIDE_X[side];
    const m = fishDisplayMult(def, f.stars);
    const img = this.add.image(x, FISH_Y, fishTextureFor(this, def, f.form, f.stars, f.parents)).setDisplaySize(300 * m, 188 * m).setFlipX(side === 1).setDepth(10);
    this.tweens.add({ targets: img, y: FISH_Y - 10, duration: 1100, yoyo: true, repeat: -1, ease: "Sine.easeInOut", delay: side * 400 });
    const hp = new Bar(this, x - 150, 150, 300, 24, side === 0 ? 0x4caf50 : 0xe53935, "").setDepth(20);
    const hpT = txt(this, x, 182, "", 16, { align: "center", weight: "700" }).setOrigin(0.5).setDepth(20);
    const name = txt(this, x + 14, 128, "", 22, { align: "center" }).setOrigin(0.5).setDepth(20);
    // cá lai: 2 hệ; hệ ẩn của mình thấy mờ, của đối thủ chỉ thấy "?"
    const nb = (f.elements?.length ?? 1) + (f.hidden ? 1 : 0);
    const badge = elementBadges(this, x - 150 + (nb - 1) * 31, 128, { els: f.elements ?? [f.element], hidden: f.hidden }, 34, side === 0).setDepth(21);
    const status = txt(this, x, 246, "", 16, { align: "center", color: "#fff59d", weight: "700" }).setOrigin(0.5).setDepth(20);
    const dots = this.add.graphics().setDepth(20);
    this.ui[side] = { img, hp, hpT, name, badge, status, dots };
  }

  /** Thanh NỘ của mỗi bên (tích từ sát thương bị nhận; đầy thì dùng kỹ năng bằng V). */
  private energyUi: ({ bar: Bar; t: Phaser.GameObjects.Text; glow?: Phaser.Tweens.Tween } | undefined)[] = [];

  private setEnergy(side: 0 | 1, v: number) {
    let e = this.energyUi[side];
    if (!e) {
      const x = SIDE_X[side];
      const bar = new Bar(this, x - 150, 198, 300, 14, 0xb388ff, "").setDepth(20);
      const t = txt(this, x, 224, "", 14, { align: "center", weight: "700", color: "#d1c4e9" }).setOrigin(0.5).setDepth(20);
      e = { bar, t };
      this.energyUi[side] = e;
    }
    const full = v >= ENERGY_MAX;
    e.bar.set(Math.max(0, Math.min(1, v / ENERGY_MAX)));
    e.t.setText(full ? `⚡ NỘ ĐẦY – ${side === 0 ? "bấm V dùng kỹ năng!" : "đối thủ sắp tung kỹ năng!"}` : `⚡ Nộ ${v}/${ENERGY_MAX}`).setColor(full ? "#ffd740" : "#d1c4e9");
    if (full && !e.glow) e.glow = this.tweens.add({ targets: e.bar, alpha: 0.55, duration: 380, yoyo: true, repeat: -1 });
    if (!full && e.glow) {
      e.glow.stop();
      e.glow = undefined;
      e.bar.setAlpha(1);
    }
  }

  private refreshSide(side: 0 | 1, s: CombatState) {
    this.setEnergy(side, energyOf(s, side));
    const sd = s.sides[side];
    const f = sd.team[sd.active]!;
    let u = this.ui[side];
    if (!u || u.img.getData("uid") !== f.uid) {
      if (u) {
        u.img.destroy();
        u.hp.destroy();
        u.hpT.destroy();
        u.name.destroy();
        u.badge.destroy();
        u.status.destroy();
        u.dots.destroy();
      }
      this.buildSide(side, f);
      u = this.ui[side]!;
      u.img.setData("uid", f.uid);
      u.img.x += side === 0 ? -400 : 400;
      this.tweens.add({ targets: u.img, x: SIDE_X[side], duration: 450, ease: "Back.easeOut" });
    }
    const def = FISH_BY_ID.get(f.fishId)!;
    const fm = f.form ? FORM_BY_ID.get(f.form) : null;
    u.name.setText(`${def.name}${fm ? ` · 🧬${fm.name}` : ""}  Lv.${f.level}`).setColor(FISH_RARITY_COLOR[def.rarity]);
    u.hp.set(f.hp / f.maxHp);
    u.hpT.setText(`${f.hp} / ${f.maxHp}   ⚔${f.atk} 🛡${f.def} ⚡${f.spd}`);
    const st: string[] = [];
    if (f.defending) st.push(f.guard !== undefined ? `🛡 Chặn ${Math.round(f.guard * 100)}%` : "🛡 Phòng thủ");
    if (f.atkUp) st.push(`🔥 ATK +${Math.round((f.atkUp[0] - 1) * 100)}%`);
    if (f.dmgReduce) st.push(`💎 Giảm ST ${Math.round(f.dmgReduce[0] * 100)}%`);
    if (f.defDown) st.push(`💥 DEF −${Math.round(f.defDown[0] * 100)}%`);
    u.status.setText(st.join("  "));
    // 3 chấm đội hình (sống / bị hạ)
    u.dots.clear();
    sd.team.forEach((t, i) => {
      const cx = SIDE_X[side] - 30 + i * 30;
      u!.dots.fillStyle(t.hp > 0 ? hexToInt(ELEMENT_INFO[t.element].color) : 0x455a64, 1).fillCircle(cx, 470, 10);
      u!.dots.lineStyle(2, i === sd.active ? 0xffffff : 0x1b1530).strokeCircle(cx, 470, 10);
    });
  }

  // ---------------------------------------------------------------- luồng trận
  private async onView(v: CombatView, first = false) {
    this.busy = true;
    this.hideBar();
    // dựng 2 cá ban đầu từ trạng thái lúc bắt đầu trận
    if (first) {
      const initial = JSON.parse(JSON.stringify(v.state)) as CombatState;
      for (const sd of initial.sides) {
        sd.active = 0;
        sd.energy = 0;
        for (const t of sd.team) {
          t.hp = t.maxHp;
          t.defending = false;
          t.atkUp = t.dmgReduce = t.defDown = null;
        }
      }
      this.refreshSide(0, initial);
      this.refreshSide(1, initial);
      const startEv = v.events.find((e) => e.t === "start");
      if (startEv && startEv.t === "start") await this.say(startEv.first === 0 ? "Cá của bạn nhanh hơn – ĐI TRƯỚC!" : "Đối thủ nhanh hơn – đi trước!", 900);
      this.view = { ...v, state: initial };
    }
    for (const e of v.events) if (e.t !== "start") await this.play(e, v.state);
    this.view = v;
    this.refreshSide(0, v.state);
    this.refreshSide(1, v.state);
    this.busy = false;
    if (v.state.winner !== null) return this.finish(v.state.winner);
    if (v.state.turnSide === 0) this.startMyTurn(v);
    else this.awaitOpponent();
  }

  /** Đấu người: chờ đối thủ đánh (máy chủ xử quá giờ nếu đối thủ không bấm). */
  private awaitOpponent() {
    if (this.finished) return;
    this.busy = true;
    void this.say("⏳ Đối thủ đang canh lực…", 0, "#ffe0b2");
    void this.driver
      .waitTurn()
      .then((v) => (this.finished ? undefined : this.onView(v)))
      .catch((e: Error) => {
        if (this.finished || !this.scene.isActive()) return;
        toast(this, e.message, COLORS.red);
        this.time.delayedCall(1500, () => this.back());
      });
  }

  private back() {
    goTo(this, "DeathMatch", { mode: this.pvp ? "pvp" : "arena" });
  }

  /** Thoát giữa trận = BỎ CUỘC (tính thua). */
  private confirmExit() {
    if (this.finished || !this.view) return this.back();
    const friendly = this.pvp?.stake === "friendly";
    const m = modal(this, 640, 300, "Thoát trận?");
    m.root.setDepth(950);
    m.root.add(
      txt(this, 640, m.y + 120, friendly ? "Thoát giữa trận = THUA\n(giao hữu: không mất cá)" : "Thoát giữa trận = THUA\n⚠ Mất con cá LỰC CHIẾN THẤP NHẤT trong đội!", 22, {
        align: "center",
        weight: "700",
        color: friendly ? "#e1f5fe" : "#ff8a80",
      }).setOrigin(0.5),
    );
    m.root.add(new Button(this, 520, m.y + 236, 220, 60, "Ở lại", { color: COLORS.blue, fontSize: 22, onClick: () => m.close() }));
    m.root.add(
      new Button(this, 760, m.y + 236, 220, 60, "Bỏ cuộc", {
        color: COLORS.red,
        fontSize: 22,
        onClick: () => {
          m.close();
          this.myTurn = false;
          this.hideBar();
          void this.driver
            .forfeit()
            .then((v) => {
              this.view = v;
              this.finish(1);
            })
            .catch((e: Error) => toast(this, e.message, COLORS.red));
        },
      }),
    );
  }

  private say(text: string, ms = 700, color = COLORS.textGold) {
    this.banner?.setText(text).setColor(color);
    return new Promise<void>((r) => this.time.delayedCall(ms, r));
  }

  private float(x: number, y: number, s: string, color: string, size = 32) {
    const t = txt(this, x, y, s, size, { color, align: "center" }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: t, y: y - 70, alpha: 0, duration: 1000, onComplete: () => t.destroy() });
  }

  private wait(ms: number) {
    return new Promise<void>((r) => this.time.delayedCall(ms, r));
  }

  private async play(e: CombatEvent, s: CombatState) {
    const u = this.ui;
    switch (e.t) {
      case "attack": {
        const me = u[e.side]!;
        const foe = u[1 - e.side]!;
        Sfx.hook();
        this.tweens.add({ targets: me.img, x: me.img.x + (e.side === 0 ? 140 : -140), duration: 150, yoyo: true });
        await this.wait(170);
        foe.img.setTintFill(0xffffff);
        this.time.delayedCall(90, () => foe.img.clearTint());
        const big = e.zone === "green" || e.zone === "perfect";
        this.cameras.main.shake(big ? 180 : 70, big ? 0.01 : 0.004);
        this.float(foe.img.x, FISH_Y - 120, `-${e.dmg}`, e.zone === "red" ? "#b0bec5" : big ? "#ffeb3b" : "#ffffff", big ? 44 : 34);
        this.float(foe.img.x, FISH_Y - 60, TIMING_LABEL[e.zone], e.zone === "red" ? "#ff8a80" : big ? "#b9f6ca" : "#fff59d", 22);
        if (e.matchup !== "normal") this.float(foe.img.x, FISH_Y - 20, MATCHUP_LABEL[e.matchup], e.matchup === "strong" ? "#69f0ae" : "#ff8a80", 24);
        if (e.defended) this.float(foe.img.x, FISH_Y + 20, "🛡 ĐÃ CHẶN", "#90caf9", 20);
        if (e.combo >= 2) this.float(me.img.x, FISH_Y - 150, `COMBO x${e.combo}!`, "#ff4081", 30);
        if (e.zone === "perfect") Sfx.crit();
        const sd = s.sides[(1 - e.side) as 0 | 1];
        const tgt = sd.team.find((t) => t.uid === foe.img.getData("uid"));
        if (tgt) {
          foe.hp.set(e.hp / tgt.maxHp);
          foe.hpT.setText(`${e.hp} / ${tgt.maxHp}`);
        }
        await this.wait(520);
        break;
      }
      case "skill": {
        Sfx.skill();
        const me = u[e.side]!;
        const col = hexToInt(ELEMENT_INFO[s.sides[e.side].team.find((t) => t.uid === me.img.getData("uid"))?.element ?? "water"].color);
        this.cameras.main.flash(160, (col >> 16) & 255, (col >> 8) & 255, col & 255);
        this.add
          .particles(me.img.x, me.img.y, "p_spark", { speed: { min: 120, max: 380 }, lifespan: 650, scale: { start: 1.4, end: 0 }, tint: col, quantity: 30, stopAfter: 30, blendMode: Phaser.BlendModes.ADD })
          .setDepth(40);
        await this.say(`✨ ${e.side === 0 ? "" : "Đối thủ: "}${e.name}!`, 650, "#fff59d");
        break;
      }
      case "heal":
        this.float(u[e.side]!.img.x, FISH_Y - 90, `+${e.amount} ❤`, "#69f0ae", 30);
        await this.wait(350);
        break;
      case "defend": {
        // canh bảo vệ: báo mức chặn theo vùng canh
        const lbl = e.zone ? `🛡 ${GUARD_LABEL[e.zone]} −${Math.round((e.reduce ?? 0) * 100)}%` : "🛡 PHÒNG THỦ";
        const col = e.zone === "perfect" ? "#ffd740" : e.zone === "green" ? "#b9f6ca" : e.zone === "red" ? "#ff8a80" : "#90caf9";
        this.float(u[e.side]!.img.x, FISH_Y - 90, lbl, col, 26);
        if (e.zone === "perfect") {
          Sfx.crit();
          const ring = this.add.graphics().setDepth(41).setPosition(u[e.side]!.img.x, FISH_Y);
          ring.lineStyle(8, 0xffd740, 1).strokeCircle(0, 0, 90);
          this.tweens.add({ targets: ring, scale: 1.6, alpha: 0, duration: 500, onComplete: () => ring.destroy() });
        }
        await this.wait(450);
        break;
      }
      case "energy": {
        const before = this.energyUi[e.side]?.bar.value ?? 0;
        this.setEnergy(e.side, e.energy);
        if (e.energy / ENERGY_MAX > before + 0.001) this.float(SIDE_X[e.side], 200, `+⚡${Math.round(e.energy - before * ENERGY_MAX)}`, "#b388ff", 20);
        break;
      }
      case "ko": {
        Sfx.fail();
        const f = u[e.side]!;
        this.tweens.add({ targets: f.img, alpha: 0, y: f.img.y + 80, angle: e.side === 0 ? -40 : 40, duration: 600 });
        await this.say(e.side === 0 ? "Cá của bạn bị hạ!" : "HẠ GỤC!", 800, e.side === 0 ? "#ff8a80" : "#69f0ae");
        break;
      }
      case "enter": {
        const st = JSON.parse(JSON.stringify(s)) as CombatState;
        st.sides[e.side].active = e.index;
        this.refreshSide(e.side, st);
        await this.say(e.side === 0 ? "Cá tiếp theo xuất trận!" : "Đối thủ tung cá mới!", 700);
        break;
      }
      case "end":
        break;
    }
  }

  // ---------------------------------------------------------------- lượt của người chơi
  private startMyTurn(v: CombatView) {
    this.myTurn = true;
    this.bar = v.bar;
    this.barT0 = performance.now();
    this.turnLeftMs = TURN_TIME_MS - 3000;
    const me = v.state.sides[0].team[v.state.sides[0].active]!;
    void this.say("LƯỢT CỦA BẠN – canh kim: Space ĐÁNH · B CANH BẢO VỆ · V KỸ NĂNG", 0, "#b9f6ca");
    this.showBar();
    const en = energyOf(v.state, 0);
    const ready = en >= ENERGY_MAX;
    this.btnAtk = new Button(this, 640, 650, 260, 74, "⚔ TẤN CÔNG", { color: COLORS.red, fontSize: 30, sub: "Bấm / Space", onClick: () => this.press("attack") }).setDepth(60);
    this.btnSkill = new Button(this, 360, 650, 250, 66, ready ? `✨ ${me.skill.name}` : `⚡ Nộ ${en}/${ENERGY_MAX}`, {
      color: COLORS.purple,
      fontSize: 17,
      sub: ready ? "Kỹ năng · V" : "Bị đánh để tích nộ",
      disabled: !ready,
      onClick: () => this.press("skill"),
    }).setDepth(60);
    if (ready) this.tweens.add({ targets: this.btnSkill, scale: 1.06, duration: 380, yoyo: true, repeat: -1 });
    this.btnSkill.on("disabled-click", () => toast(this, `${me.skill.name}: ${me.skill.description}\nNộ ${en}/${ENERGY_MAX} – nhận sát thương (hoặc chặn HOÀN HẢO) để tích nộ`));
    this.btnDef = new Button(this, 920, 650, 240, 66, "🛡 CANH BẢO VỆ", { color: COLORS.blue, fontSize: 20, sub: "Canh kim · B", onClick: () => this.press("defend") }).setDepth(60);
  }

  private showBar() {
    this.hideBar();
    const c = this.add.container(0, 0).setDepth(55);
    const g = this.add.graphics();
    g.fillStyle(0x0a1628, 0.9).fillRoundedRect(BAR.x - 14, BAR.y - 16, BAR.w + 28, BAR.h + 32, 14);
    // vùng: đỏ (2 đầu) → vàng → xanh → PERFECT (giữa) – đúng ranh giới TIMING_BANDS của lõi trận
    const seg = (d0: number, d1: number, col: number) => {
      for (const sgn of [-1, 1]) {
        const a = 0.5 + sgn * d0;
        const b = 0.5 + sgn * d1;
        const x0 = BAR.x + Math.min(a, b) * BAR.w;
        g.fillStyle(col, 1).fillRect(x0, BAR.y, Math.abs(b - a) * BAR.w, BAR.h);
      }
    };
    seg(TIMING_BANDS.yellow, 0.5, ZONE_COLOR.red);
    seg(TIMING_BANDS.green, TIMING_BANDS.yellow, ZONE_COLOR.yellow);
    seg(TIMING_BANDS.perfect, TIMING_BANDS.green, ZONE_COLOR.green);
    seg(0, TIMING_BANDS.perfect, ZONE_COLOR.perfect);
    g.lineStyle(4, 0x1b1530).strokeRect(BAR.x, BAR.y, BAR.w, BAR.h);
    c.add(g);
    c.add(txt(this, BAR.x + 30, BAR.y - 30, "HỤT", 14, { color: "#ff8a80" }).setOrigin(0.5));
    c.add(txt(this, BAR.x + BAR.w / 2, BAR.y - 30, "ĐÁNH MẠNH ×1.25", 15, { color: "#b9f6ca" }).setOrigin(0.5));
    c.add(txt(this, BAR.x + BAR.w - 30, BAR.y - 30, "HỤT", 14, { color: "#ff8a80" }).setOrigin(0.5));
    this.needle = this.add.graphics().setDepth(56);
    // bấm thẳng lên thanh cũng tính là tấn công
    const hit = this.add.zone(BAR.x + BAR.w / 2, BAR.y + BAR.h / 2, BAR.w + 28, BAR.h + 40).setInteractive({ useHandCursor: true }).setDepth(57);
    hit.on("pointerdown", () => this.press("attack"));
    c.add(hit);
    this.barRoot = c;
  }

  private hideBar() {
    this.barRoot?.destroy(true);
    this.barRoot = undefined;
    this.needle?.destroy();
    this.needle = undefined;
    for (const b of [this.btnAtk, this.btnSkill, this.btnDef]) b?.destroy();
    this.btnAtk = this.btnSkill = this.btnDef = undefined;
  }

  override update(_t: number, dt: number) {
    if (!this.myTurn || !this.bar || !this.needle) return;
    const ms = performance.now() - this.barT0;
    const p = needlePos(this.bar, ms);
    const x = BAR.x + p * BAR.w;
    this.needle.clear();
    this.needle.fillStyle(0xffffff, 1).fillRect(x - 4, BAR.y - 10, 8, BAR.h + 20);
    this.needle.lineStyle(2, 0x1b1530).strokeRect(x - 4, BAR.y - 10, 8, BAR.h + 20);
    this.needle.fillStyle(0xffffff, 1).fillTriangle(x - 10, BAR.y - 16, x + 10, BAR.y - 16, x, BAR.y - 4);
    this.turnLeftMs -= dt;
    this.turnT?.setText(`⏱ ${Math.max(0, Math.ceil(this.turnLeftMs / 1000))} giây`);
    if (this.turnLeftMs <= 0) this.press("defend", true);
  }

  /** Một lượt chỉ nhận 1 lệnh (chống bấm nhiều lần). */
  private press(kind: PlayerAction["kind"], timeout = false) {
    if (!this.myTurn || this.busy || !this.view) return;
    const me = this.view.state.sides[0].team[this.view.state.sides[0].active]!;
    if (kind === "skill" && energyOf(this.view.state, 0) < ENERGY_MAX) {
      if (!timeout) toast(this, `Nộ chưa đầy (${energyOf(this.view.state, 0)}/${ENERGY_MAX}) – bị đánh để tích nộ`);
      return;
    }
    this.myTurn = false;
    this.busy = true;
    const pressMs = Math.round(performance.now() - this.barT0);
    // canh bảo vệ (B) cũng dùng thanh kim; hết giờ = phòng thủ thường (không canh)
    const usesBar = kind === "attack" || (kind === "skill" && me.skill.attack) || (kind === "defend" && !timeout);
    if (usesBar && this.bar) {
      // phản hồi tức thì: đóng băng kim + báo vùng dự kiến (máy chủ sẽ xác nhận)
      const z = timingZone(needlePos(this.bar, pressMs));
      this.banner?.setText(kind === "defend" ? GUARD_LABEL[z] : TIMING_LABEL[z]).setColor(z === "red" ? "#ff8a80" : z === "yellow" ? "#fff59d" : "#b9f6ca");
      Sfx.click();
    }
    if (timeout) toast(this, "Hết giờ – tự động PHÒNG THỦ");
    this.turnT?.setText("");
    const action: PlayerAction = usesBar ? { kind, pressMs } : { kind };
    this.time.delayedCall(250, () => {
      this.hideBar();
      void this.driver
        .act(action)
        .then((v) => this.onView(v))
        .catch((e: Error) => {
          toast(this, e.message, COLORS.red);
          this.busy = false;
          if (this.view) this.startMyTurn(this.view);
        });
    });
  }

  // ---------------------------------------------------------------- kết thúc
  private finish(winner: 0 | 1) {
    if (this.finished) return;
    this.finished = true;
    this.myTurn = false;
    this.hideBar();
    this.turnT?.setText("");
    const won = winner === 0;
    if (won) Sfx.levelUp();
    else Sfx.fail();
    void this.say(won ? "🏆 CHIẾN THẮNG!" : "THẤT BẠI", 0, won ? "#ffd54f" : "#ff8a80");
    const g = this.add.graphics().setDepth(70);
    g.fillStyle(0x000000, 0.55).fillRect(0, 0, 1280, 720);
    const t = txt(this, 640, 290, won ? "🏆 CHIẾN THẮNG!" : "💀 THẤT BẠI", 72, { color: won ? "#ffd54f" : "#ff8a80", align: "center" }).setOrigin(0.5).setDepth(71).setScale(0.3);
    this.tweens.add({ targets: t, scale: 1, duration: 450, ease: "Back.easeOut" });
    const info = txt(this, 640, 382, "Đang ghi nhận kết quả…", 21, { align: "center", color: "#e1f5fe", weight: "700" }).setOrigin(0.5).setDepth(71);
    void this.settle(won).then((msg) => info.setText(msg));
    if (!this.pvp) new Button(this, 520, 480, 220, 66, "⚔ Đấu lại", { color: COLORS.red, fontSize: 24, onClick: () => this.scene.restart({ team: this.team.filter((u) => GameState.save.fishes.some((f) => f.uid === u)), level: this.level }) }).setDepth(72);
    new Button(this, this.pvp ? 640 : 760, 480, 220, 66, "← Về", { color: COLORS.blue, fontSize: 24, onClick: () => this.back() }).setDepth(72);
  }

  /** Áp kết quả vào bản lưu: thắng nhận thưởng, thua MẤT cá lực chiến thấp nhất. */
  private async settle(won: boolean): Promise<string> {
    const rankBefore = dmRankPoints(GameState.save.stats);
    const v = this.view;
    let r;
    if (this.pvp && this.driver instanceof PvpDriver) {
      // lấy trạng thái phòng cuối cùng (có con cá bị mất do máy chủ chốt)
      let room = this.driver.room;
      for (let i = 0; i < 3 && room && room.status !== "done"; i++) room = await pvpCall({ op: "get", id: this.pvp!.id });
      if (!room) return "Không lấy được kết quả – sẽ ghi nhận lần mở game sau";
      r = await GameState.settleCombat("pvp", room.id, pvpOutcome(room));
    } else {
      const foe = v?.state.sides[1].team ?? [];
      const id = v?.id ?? `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      r = await GameState.settleCombat(v?.id ? "battle" : "local", id, { txId: v?.id ? `cb_${id}` : `cbl_${id}`, teamUids: this.team, won, level: this.level, foe });
    }
    if (!r.ok) return r.error;
    if (this.pvp?.stake === "friendly") return "Giao hữu – không mất cá, không thưởng";
    if (won) {
      const parts = [r.gold ? `+${formatNum(r.gold)} 🪙` : "", r.xp ? `+${r.xp} KN` : "", r.roasted ? `🍖 ${FISH_BY_ID.get(r.roasted.fishId)?.name ?? "Cá"} nướng` : ""].filter(Boolean);
      const rankAfter = dmRankPoints(GameState.save.stats);
      const rk = dmRankOf(rankAfter);
      const up = dmRankChange(rankBefore, rankAfter);
      const rankLine = `🏅 +${rankAfter - rankBefore} điểm rank → ${dmRankLabel(rk)} · ${rk.stars}⭐ (${rk.starPoints}/100)${up.tier ? " · 🎉 LÊN HẠNG!" : up.division ? " · ⬆ LÊN BẬC!" : up.star ? " · +1 ⭐" : ""}`;
      return `${parts.length ? `Phần thưởng: ${parts.join(" · ")}` : "Chiến thắng!"}\n${rankLine}`;
    }
    return r.lostFishId ? `💔 Mất ${FISH_BY_ID.get(r.lostFishId)?.name ?? "cá"} (con lực chiến thấp nhất trong đội)` : "Không mất cá (cá trong đội đã khoá)";
  }
}
