import Phaser from "phaser";
import { ELEMENT_INFO } from "@dccc/game-config";
import { FISH_BY_ID, WORLD_BOSSES } from "@dccc/game-data";
import { ELEMENT_EVO_ITEM, TIMING_BANDS, TIMING_LABEL, WORLD_BOSS, needlePos, timingZone, wbRankReward, worldBossFor, worldBossMaxHp, worldBossSlot, type BarParams, type OwnedFish } from "@dccc/shared";
import { GameState } from "../state/GameState.ts";
import { wbCall, type WbEnter, type WbHit, type WbStatus } from "../state/worldBoss.ts";
import { fishTextureFor, worldBossArenaTexture, worldBossTexture } from "../art/textures.ts";
import { ARENA_FX } from "../art/WorldBossArena.ts";
import { Bar, Button, fadeIn, formatNum, goTo, panel, toast, txt } from "../ui/widgets.ts";
import { TopBar } from "../ui/TopBar.ts";
import { COLORS } from "../ui/theme.ts";
import { menuBackdrop } from "../ui/backdrop.ts";
import { elementTag } from "../ui/element.ts";
import { fishPower } from "../ui/fishPickCard.ts";
import { hexToInt } from "../art/color.ts";
import { Sfx } from "../audio/Sfx.ts";

const BAR = { x: 60, y: 618, w: 720, h: 36 };
const BOSS_X = 430;
const BOSS_Y = 380;
/** Boss đứng BÊN PHẢI quay mặt sang trái (to tràn khung), đội cá người chơi BÊN TRÁI. */
const BOSS_IMG_X = 590;
const HEAD_X = 320;
/** Cá thường trong trận vẽ cỡ này; boss to GẤP 10 LẦN (tràn cả khung đấu). */
const FISH_VIEW = { w: 88, h: 55 };
const BOSS_SIZE = 10;

/**
 * BOSS THẾ GIỚI – 12h · 15h · 20h (giờ VN): mọi người chơi đánh chung 1 thanh máu.
 * Mỗi lượt vào: đội 3 cá mạnh nhất (cá khoá cũng được – không mất cá), 15 đòn canh kim; tối đa 3 lượt / khung giờ.
 * Sát thương nhiều nhất → quà nhiều nhất (Hòm Thư); kết liễu → Đá Tiến Hoá đúng hệ boss.
 */
export class WorldBossScene extends Phaser.Scene {
  private status: WbStatus | null = null;
  private fight: { e: WbEnter; hits: number; bar: BarParams | null; t0: number; busy: boolean; dmg: number } | null = null;
  private timer: number | null = null;
  private root?: Phaser.GameObjects.Container;
  private needle?: Phaser.GameObjects.Graphics;
  private bossImg?: Phaser.GameObjects.Image;
  private teamFx: Phaser.GameObjects.Image[] = [];
  private maskG?: Phaser.GameObjects.Graphics;
  private hpBar?: Bar;
  private hpT?: Phaser.GameObjects.Text;
  private clockT?: Phaser.GameObjects.Text;

  constructor() {
    super("WorldBoss");
  }

  create() {
    this.input.enabled = true;
    this.fight = null;
    this.status = null;
    fadeIn(this);
    menuBackdrop(this);
    new TopBar(this, { title: "Boss Thế Giới", onBack: () => goTo(this, "Hub") });
    this.input.keyboard?.on("keydown-SPACE", () => this.hit());
    this.render();
    if (GameState.online) {
      void this.refresh();
      // giờ thật (máy yếu không làm chậm cập nhật)
      this.timer = window.setInterval(() => {
        if (!this.scene.isActive()) return;
        if (!this.fight) void this.refresh();
        this.tickClock();
      }, 4000);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.timer !== null && window.clearInterval(this.timer));
    }
  }

  private async refresh() {
    try {
      this.status = await wbCall<WbStatus>({ op: "status" });
      if (this.scene.isActive() && !this.fight) this.render();
    } catch (e) {
      if (this.scene.isActive()) toast(this, (e as Error).message, COLORS.red);
    }
  }

  /** Đội 3 cá mạnh nhất (kể cả cá khoá – đánh boss không mất cá). */
  private team(): OwnedFish[] {
    return [...GameState.save.fishes].filter((f) => FISH_BY_ID.has(f.fishId)).sort((a, b) => fishPower(b) - fishPower(a)).slice(0, 3);
  }

  private bossInfo() {
    if (this.status) return this.status.boss;
    const slot = worldBossSlot(Date.now());
    const b = worldBossFor(slot, WORLD_BOSSES);
    return { id: b.id, name: b.name, title: b.title, element: b.element, description: b.description };
  }

  private tickClock() {
    if (!this.clockT) return;
    const slot = this.status?.slot;
    const now = Date.now();
    const s = slot ? { live: slot.live, start: Date.parse(slot.startsAt), end: Date.parse(slot.endsAt) } : (() => {
      const x = worldBossSlot(now);
      return { live: x.live, start: x.startsAt, end: x.endsAt };
    })();
    const fmt = (ms: number) => {
      const t = Math.max(0, Math.floor(ms / 1000));
      const h = Math.floor(t / 3600);
      const m = Math.floor((t % 3600) / 60);
      const sec = t % 60;
      return `${h ? `${h}:` : ""}${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    };
    const hhmm = new Date(s.start).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });
    this.clockT.setText(s.live ? (this.status && this.status.hp <= 0 ? "☠ BOSS ĐÃ BỊ HẠ GỤC – chờ khung giờ sau" : `🔥 ĐANG DIỄN RA · còn ${fmt(s.end - now)}`) : `⏳ Xuất hiện lúc ${hhmm} · còn ${fmt(s.start - now)}`);
  }

  private render() {
    this.root?.destroy(true);
    this.teamFx = [];
    this.maskG?.destroy();
    this.needle?.destroy();
    this.needle = undefined;
    const c = this.add.container(0, 0);
    this.root = c;
    const b = this.bossInfo();
    const col = ELEMENT_INFO[b.element].color;
    const live = this.status?.slot.live ?? worldBossSlot(Date.now()).live;
    // ---- boss
    c.add(panel(this, 20, 92, 820, 614, 0.6));
    const hp = this.status?.hp ?? worldBossMaxHp(worldBossSlot(Date.now()));
    const maxHp = this.status?.maxHp ?? hp;
    // boss KHỔNG LỒ: gấp 10 lần cá thường, tràn khung đấu (cắt theo khung)
    this.maskG = this.make.graphics({}, false).fillRect(24, 96, 812, 606);
    const mask = this.maskG.createGeometryMask();
    // sảnh đấu riêng theo boss (cảnh nền + hạt hiệu ứng động)
    c.add(this.add.image(430, 399, worldBossArenaTexture(this, b.id)).setDisplaySize(812, 606));
    const fx = ARENA_FX[b.id];
    if (fx) {
      c.add(
        this.add
          .particles(0, 0, "p_spark", {
            x: { min: 30, max: 830 },
            y: fx.rise ? 700 : { min: 100, max: 690 },
            speedY: fx.rise ? { min: -90, max: -30 } : { min: -10, max: 10 },
            speedX: { min: -15, max: 15 },
            lifespan: fx.rise ? 6000 : 2400,
            scale: { start: 0.7, end: 0 },
            alpha: { start: 0.9, end: 0 },
            tint: fx.tint,
            frequency: 140,
            blendMode: Phaser.BlendModes.ADD,
          })
          .setMask(mask),
      );
      c.add(txt(this, 820, 690, fx.label, 15, { weight: "700", color: "#ffffff", align: "right" }).setOrigin(1, 1));
    }
    const glow = this.add.circle(BOSS_IMG_X - 60, BOSS_Y + 30, 330, hexToInt(col), 0.18).setMask(mask);
    c.add(glow);
    this.tweens.add({ targets: glow, scale: 1.12, alpha: 0.08, duration: 1400, yoyo: true, repeat: -1 });
    this.bossImg = this.add.image(BOSS_IMG_X, BOSS_Y + 60, worldBossTexture(this, b.id)).setDisplaySize(FISH_VIEW.w * BOSS_SIZE, FISH_VIEW.h * BOSS_SIZE).setFlipX(true).setMask(mask);
    if (hp <= 0) this.bossImg.setTint(0x555555).setAngle(-12);
    c.add(this.bossImg);
    this.tweens.add({ targets: this.bossImg, y: BOSS_Y + 44, duration: 1600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    // dải tối sau chữ để đọc rõ trên nền boss
    c.add(this.add.rectangle(430, 168, 812, 130, 0x050814, 0.55));
    c.add(txt(this, BOSS_X, 120, `🐉 ${b.name}`, 30, { color: col, align: "center" }).setOrigin(0.5));
    c.add(txt(this, BOSS_X, 150, b.title, 16, { weight: "700", color: COLORS.textDim, align: "center" }).setOrigin(0.5));
    c.add(elementTag(this, 44, 128, b.element, 30, 16));
    this.hpBar = new Bar(this, 60, 172, 740, 26, 0xe53935, "");
    this.hpBar.set(maxHp ? hp / maxHp : 1);
    c.add(this.hpBar);
    this.hpT = txt(this, BOSS_X, 185, `${formatNum(hp)} / ${formatNum(maxHp)}`, 16, { align: "center" }).setOrigin(0.5);
    c.add(this.hpT);
    this.clockT = txt(this, BOSS_X, 216, "", 18, { color: live ? "#ff8a80" : COLORS.textGold, align: "center" }).setOrigin(0.5);
    c.add(this.clockT);
    this.tickClock();
    // đội cá người chơi BÊN TRÁI, cỡ thường – nhỏ bằng 1/10 boss
    const myTeam = this.fight ? this.fight.e.team : this.team();
    myTeam.forEach((t, i) => {
      const def = FISH_BY_ID.get(t.fishId);
      if (!def) return;
      const x = 80 + (i === 1 ? 56 : 0);
      const y = 330 + i * 80;
      const sh = this.add.ellipse(x, y + 34, 70, 12, 0x000000, 0.25);
      const fxImg = this.add.image(x, y, fishTextureFor(this, def, t.form ?? null, t.stars, t.parents ?? null)).setDisplaySize(FISH_VIEW.w, FISH_VIEW.h);
      c.add([sh, fxImg]);
      this.teamFx.push(fxImg);
      this.tweens.add({ targets: fxImg, y: y - 6, duration: 900 + i * 120, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    });
    c.add(txt(this, 108, 290, "⚔ Đội của bạn", 14, { weight: "700", color: "#b9f6ca", align: "center" }).setOrigin(0.5));
    if (this.status?.killer) c.add(txt(this, BOSS_X, 560, `⚔ Kết liễu bởi: ${this.status.killer}`, 20, { color: "#ffd740", align: "center" }).setOrigin(0.5));

    if (this.fight) this.renderFight(c);
    else this.renderLobby(c, live, hp);
  }

  // ---------------------------------------------------------------- sảnh boss: bảng xếp hạng + vào đánh
  private renderLobby(c: Phaser.GameObjects.Container, live: boolean, hp: number) {
    c.add(panel(this, 852, 92, 412, 614, 0.95));
    c.add(txt(this, 1058, 120, "🏆 Bảng Sát Thương", 24, { color: COLORS.textGold, align: "center" }).setOrigin(0.5));
    if (!GameState.online) {
      c.add(txt(this, 1058, 330, "Cần đăng nhập tài khoản để đánh Boss Thế Giới cùng mọi người.", 18, { align: "center", wrap: 360, weight: "700" }).setOrigin(0.5));
      c.add(new Button(this, 1058, 420, 280, 60, "🔐 Đăng nhập", { color: COLORS.green, fontSize: 22, onClick: () => goTo(this, "Account") }));
      this.rules(c, 470);
      return;
    }
    const top = this.status?.top ?? [];
    if (!top.length) c.add(txt(this, 1058, 200, live ? "Chưa ai ra đòn – hãy là người đầu tiên!" : "Bảng sẽ có khi boss xuất hiện", 15, { align: "center", color: COLORS.textDim, wrap: 360 }).setOrigin(0.5));
    top.forEach((r, i) => {
      const y = 152 + i * 30;
      const g = this.add.graphics();
      g.fillStyle(r.me ? 0x2a5a8a : 0x0a1628, 0.9).fillRoundedRect(868, y, 380, 26, 8);
      c.add(g);
      c.add(txt(this, 880, y + 13, `${i < 3 ? ["🥇", "🥈", "🥉"][i] : `#${i + 1}`} ${r.name}`, 15, { weight: "700", color: r.me ? "#ffeb3b" : COLORS.text }).setOrigin(0, 0.5));
      c.add(txt(this, 1238, y + 13, formatNum(r.damage), 15, { color: COLORS.textGold }).setOrigin(1, 0.5));
    });
    const me = this.status?.me;
    const rw = wbRankReward(me?.rank ?? 99);
    c.add(
      txt(this, 1058, 466, me?.rank ? `Bạn: hạng #${me.rank} · ${formatNum(me.damage)} sát thương\nQuà dự kiến: ${rw.diamonds} 💎 · ${formatNum(rw.gold ?? 0)} 🪙 · ${rw.stones} 🔷 · ${rw.soul} 🔮` : "Bạn chưa ra đòn trong khung giờ này", 15, { align: "center", weight: "700", wrap: 380 }).setOrigin(0.5),
    );
    const left = me?.entriesLeft ?? WORLD_BOSS.entriesPerSlot;
    const can = live && hp > 0 && left > 0 && this.team().length >= 3;
    const go = new Button(this, 1058, 540, 330, 64, `⚔ VÀO ĐÁNH (${left}/${WORLD_BOSS.entriesPerSlot} lượt)`, { color: COLORS.red, fontSize: 22, disabled: !can, onClick: () => void this.enter() });
    go.on("disabled-click", () => toast(this, !live ? "Boss chưa xuất hiện – quay lại lúc 12h · 15h · 20h" : hp <= 0 ? "Boss đã bị hạ gục" : left <= 0 ? "Hết lượt đánh của khung giờ này" : "Cần ít nhất 3 con cá"));
    c.add(go);
    if (can) this.tweens.add({ targets: go, scale: 1.05, duration: 600, yoyo: true, repeat: -1 });
    this.rules(c, 590);
  }

  private rules(c: Phaser.GameObjects.Container, y: number) {
    const b = this.bossInfo();
    const lines = [
      "⏰ 12h · 15h · 20h, mỗi lần 30 phút",
      `⚔ Mỗi lượt ${WORLD_BOSS.hitsPerEntry} đòn canh kim (Space / chạm thanh)`,
      "🏅 Sát thương càng nhiều → quà càng nhiều",
      `🗡 Kết liễu: +1 Đá Tiến Hoá hệ ${ELEMENT_INFO[b.element].name} + 20 💎`,
    ];
    c.add(txt(this, 872, y, lines.join("\n"), 13, { weight: "700", color: COLORS.textDim, wrap: 380 }).setLineSpacing(3));
    void ELEMENT_EVO_ITEM;
  }

  private async enter() {
    const team = this.team();
    if (team.length < 3) return toast(this, "Cần ít nhất 3 con cá");
    try {
      const err = await GameState.syncNow(); // máy chủ đọc đội từ bản lưu mới nhất
      if (err) throw new Error(`Chưa đồng bộ được bản lưu: ${err}`);
      const e = await wbCall<WbEnter>({ op: "enter", team: team.map((f) => f.uid) });
      this.fight = { e, hits: e.hits, bar: e.bar, t0: performance.now(), busy: false, dmg: 0 };
      Sfx.skill();
      this.render();
    } catch (err) {
      toast(this, (err as Error).message, COLORS.red);
    }
  }

  // ---------------------------------------------------------------- đang đánh
  private renderFight(c: Phaser.GameObjects.Container) {
    const f = this.fight!;
    c.add(panel(this, 852, 92, 412, 614, 0.95));
    c.add(txt(this, 1058, 120, "⚔ Đội ra trận", 24, { color: COLORS.textGold, align: "center" }).setOrigin(0.5));
    f.e.team.forEach((t, i) => {
      const def = FISH_BY_ID.get(t.fishId);
      if (def) c.add(this.add.image(1058, 200 + i * 110, fishTextureFor(this, def, t.form, t.stars, t.parents ?? null)).setDisplaySize(170, 106));
      c.add(txt(this, 1058, 252 + i * 110, `${def?.name ?? t.name} · ⚔${t.atk}`, 14, { weight: "700", align: "center" }).setOrigin(0.5));
    });
    c.add(txt(this, 1058, 540, `Đòn ${f.hits}/${f.e.hitsMax}\nSát thương lượt này: ${formatNum(f.dmg)}`, 18, { align: "center" }).setOrigin(0.5));
    c.add(new Button(this, 1058, 640, 240, 54, "Rút lui", { color: COLORS.blue, fontSize: 20, onClick: () => this.endFight() }));
    // thanh canh kim
    const g = this.add.graphics();
    g.fillStyle(0x0a1628, 0.9).fillRoundedRect(BAR.x - 12, BAR.y - 14, BAR.w + 24, BAR.h + 28, 12);
    const seg = (d0: number, d1: number, color: number) => {
      for (const sgn of [-1, 1]) {
        const a = 0.5 + sgn * d0;
        const b = 0.5 + sgn * d1;
        g.fillStyle(color, 1).fillRect(BAR.x + Math.min(a, b) * BAR.w, BAR.y, Math.abs(b - a) * BAR.w, BAR.h);
      }
    };
    seg(TIMING_BANDS.yellow, 0.5, 0xe53935);
    seg(TIMING_BANDS.green, TIMING_BANDS.yellow, 0xfdd835);
    seg(TIMING_BANDS.perfect, TIMING_BANDS.green, 0x43a047);
    seg(0, TIMING_BANDS.perfect, 0xb2ff59);
    g.lineStyle(4, 0x1b1530).strokeRect(BAR.x, BAR.y, BAR.w, BAR.h);
    c.add(g);
    c.add(txt(this, BAR.x + BAR.w / 2, BAR.y - 26, "Canh kim vào giữa rồi bấm SPACE / chạm thanh", 15, { color: "#b9f6ca", align: "center" }).setOrigin(0.5));
    const z = this.add.zone(BAR.x + BAR.w / 2, BAR.y + BAR.h / 2, BAR.w + 24, BAR.h + 60).setInteractive({ useHandCursor: true });
    z.on("pointerdown", () => this.hit());
    c.add(z);
    // chạm vào boss cũng là đánh
    this.bossImg?.setInteractive({ useHandCursor: true }).on("pointerdown", () => this.hit());
    this.needle = this.add.graphics().setDepth(5);
  }

  override update() {
    const f = this.fight;
    if (!f || !f.bar || !this.needle) return;
    const p = needlePos(f.bar, performance.now() - f.t0);
    const x = BAR.x + p * BAR.w;
    this.needle.clear();
    this.needle.fillStyle(0xffffff, 1).fillRect(x - 4, BAR.y - 8, 8, BAR.h + 16);
    this.needle.lineStyle(2, 0x1b1530).strokeRect(x - 4, BAR.y - 8, 8, BAR.h + 16);
  }

  private hit() {
    const f = this.fight;
    if (!f || f.busy || !f.bar || f.hits >= f.e.hitsMax) return;
    f.busy = true;
    const pressMs = Math.round(performance.now() - f.t0);
    const guess = timingZone(needlePos(f.bar, pressMs));
    Sfx.click();
    void wbCall<WbHit>({ op: "hit", session: f.e.session, n: f.hits, pressMs })
      .then((r) => {
        if (!this.scene.isActive() || this.fight !== f) return;
        f.hits = r.hits;
        f.bar = r.bar;
        f.t0 = performance.now();
        f.dmg = r.sessionDamage;
        f.busy = false;
        this.showHit(r, guess);
        if (r.killed) {
          Sfx.catchFanfare(true);
          toast(this, "⚔ BẠN ĐÃ KẾT LIỄU BOSS! Đá Tiến Hoá đã gửi vào Hòm Thư", COLORS.green);
          window.setTimeout(() => this.scene.isActive() && this.endFight(), 1200);
        } else if (r.hits >= r.hitsMax) {
          toast(this, `Hết lượt: gây ${formatNum(r.sessionDamage)} sát thương!`, COLORS.green);
          window.setTimeout(() => this.scene.isActive() && this.endFight(), 1200);
        } else this.render();
      })
      .catch((e: Error) => {
        f.busy = false;
        toast(this, e.message, COLORS.red);
        if (/hạ gục|rút lui|hết đòn/.test(e.message)) this.endFight();
      });
  }

  private showHit(r: WbHit, guess: string) {
    void guess;
    this.hpBar?.set(r.maxHp ? r.hp / r.maxHp : 0);
    this.hpT?.setText(`${formatNum(r.hp)} / ${formatNum(r.maxHp)}`);
    const big = r.zone === "green" || r.zone === "perfect";
    this.teamFx.forEach((fx, i) => this.tweens.add({ targets: fx, x: fx.x + 90, duration: 120, delay: i * 50, yoyo: true, ease: "Quad.easeOut" }));
    this.cameras.main.shake(big ? 160 : 60, big ? 0.008 : 0.003);
    this.bossImg?.setTintFill(0xffffff);
    this.time.delayedCall(80, () => this.bossImg?.clearTint());
    const t = txt(this, HEAD_X + Phaser.Math.Between(-40, 80), BOSS_Y - 40, `-${formatNum(r.dmg)}`, big ? 44 : 32, { color: r.zone === "red" ? "#b0bec5" : big ? "#ffeb3b" : "#ffffff", align: "center" }).setOrigin(0.5).setDepth(20);
    const z = txt(this, t.x, t.y + 40, TIMING_LABEL[r.zone], 18, { color: big ? "#b9f6ca" : r.zone === "red" ? "#ff8a80" : "#fff59d", align: "center" }).setOrigin(0.5).setDepth(20);
    this.tweens.add({ targets: [t, z], y: "-=70", alpha: 0, duration: 900, onComplete: () => (t.destroy(), z.destroy()) });
    if (r.zone === "perfect") Sfx.crit();
    else Sfx.hook();
  }

  private endFight() {
    this.fight = null;
    this.bossImg?.disableInteractive();
    void this.refresh();
    this.render();
  }
}
