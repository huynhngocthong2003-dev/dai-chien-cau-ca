import Phaser from "phaser";
import { ELEMENT_INFO } from "@dccc/game-config";
import { CHARACTER_BY_ID, FISH_BY_ID, FORM_BY_ID, WORLD_BOSSES } from "@dccc/game-data";
import { ELEMENT_EVO_ITEM, TIMING_BANDS, TIMING_LABEL, WORLD_BOSS, needlePos, timingZone, wbRankReward, worldBossFor, worldBossMaxHp, worldBossSlot, worldBossTeam, type BarParams, type OwnedFish } from "@dccc/shared";
import { GameState } from "../state/GameState.ts";
import { wbCall, type WbEnter, type WbHit, type WbStatus } from "../state/worldBoss.ts";
import { characterTexture, worldBossArenaTexture, worldBossTexture } from "../art/textures.ts";
import { safeEquip } from "../ui/playerProfile.ts";
import { HeldRod } from "../ui/heldRod.ts";
import { BOSS_SKILLS, castBossSkill, chargeUp, skillBanner } from "../ui/bossSkills.ts";
import { ARENA_FX, ARENA_H, ARENA_W } from "../art/WorldBossArena.ts";
import { Bar, Button, fadeIn, formatNum, goTo, panel, toast, txt } from "../ui/widgets.ts";
import { TopBar } from "../ui/TopBar.ts";
import { COLORS } from "../ui/theme.ts";
import { menuBackdrop } from "../ui/backdrop.ts";
import { elementTag } from "../ui/element.ts";
import { hexToInt } from "../art/color.ts";
import { Sfx } from "../audio/Sfx.ts";

const BAR = { y: 618, w: 720, h: 36 };
const BOSS_Y = 380;
/** Khung đấu bắt đầu từ x = ARENA_X; rộng toàn màn khi đang đánh, chừa bảng xếp hạng khi ở sảnh chờ. */
const ARENA_X = 24;
/** Cá thường trong trận vẽ cỡ này; boss to GẤP 10 LẦN (tràn cả khung đấu). */
const FISH_VIEW = { w: 88, h: 55 };
const BOSS_SIZE = 10;
/** Nhân vật người chơi cỡ thường (khung 200×240) – boss to gấp ~10 lần. */
const CHAR_VIEW = { w: 88, h: 106 };
const ME_POS = { x: 120, y: 560 };
/** Đầu cần câu (toạ độ trong nhân vật) & miệng boss (nơi lưỡi câu móc vào). */
const ROD_TIP = { x: 92, y: -138 };
const ROD_HAND = { x: 22, y: -52 };
/** Cần câu thu nhỏ so với màn câu cá (nhân vật ở đây cỡ ~0,46 lần). */
const ROD_K = 0.46;
const HOOK_Y = 452;
/** Chỗ đứng người chơi khác trong phòng (sau lưng mình, lớp xa nhỏ hơn). */
const ROOM_SPOTS = [
  { x: 230, y: 600 },
  { x: 60, y: 470 },
  { x: 190, y: 456 },
  { x: 90, y: 360 },
  { x: 220, y: 345 },
  { x: 50, y: 610 },
  { x: 150, y: 290 },
  { x: 260, y: 520 },
  { x: 40, y: 285 },
];

/**
 * BOSS THẾ GIỚI – 12h · 15h · 20h · 23h (giờ VN): mọi người chơi đánh chung 1 thanh máu.
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
  private roomC?: Phaser.GameObjects.Container;
  private myRod?: HeldRod;
  /** Vị trí gốc của boss; chuyển động bơi tính liên tục theo thời gian thật trong update() (không khựng khi cập nhật). */
  private bossBase = { x: 0, y: 0, dead: false };
  /** Độ lệch do bị giật cần (tween mượt, cộng dồn vào tư thế bơi). */
  private yank = { x: 0, a: 0 };
  private bossGlow?: Phaser.GameObjects.Arc;
  private hudT?: Phaser.GameObjects.Text;
  /** Khoá nội dung sảnh chờ – chỉ vẽ lại cả màn khi thứ gì đó thật sự đổi (không phải mỗi 4 giây). */
  private lobbyKey = "";
  /** Chiêu thức boss: thời điểm tung chiêu kế tiếp (đồng hồ thật) & chiêu kế. */
  private nextSkillAt = 0;
  private skillIdx = 0;
  private roomBodies: { body: Phaser.GameObjects.Image; x: number; y: number }[] = [];
  private lineG?: Phaser.GameObjects.Graphics;
  private meBody?: Phaser.GameObjects.Image;
  /** Lần ra đòn gần nhất đã thấy của từng người trong phòng (để phát hoạt cảnh giật cần). */
  private roomSeen = new Map<string, string>();
  private maskG?: Phaser.GameObjects.Graphics;
  private hpBar?: Bar;
  private hpT?: Phaser.GameObjects.Text;
  private clockT?: Phaser.GameObjects.Text;

  constructor() {
    super("WorldBoss");
  }

  /** Bề rộng khung đấu: toàn màn khi đang đánh (không gian boss rộng), chừa bảng xếp hạng ở sảnh chờ. */
  private aw() {
    return this.fight ? 1232 : 896;
  }
  /** Giữa khung đấu (tiêu đề, thanh máu). */
  private cx() {
    return ARENA_X + this.aw() / 2;
  }
  /** Tâm ảnh boss (boss đứng sát mép phải, quay mặt sang trái). */
  private bx() {
    return ARENA_X + this.aw() - 326;
  }
  /** Miệng boss – nơi lưỡi câu móc vào. */
  private hookX() {
    return this.bx() - 328;
  }
  private barX() {
    return this.cx() - BAR.w / 2;
  }

  create() {
    this.input.enabled = true;
    this.fight = null;
    this.status = null;
    this.lobbyKey = "";
    this.nextSkillAt = Date.now() + 3500;
    this.skillIdx = 0;
    // boss tung chiêu định kỳ (giờ thật) khi đang xuất hiện
    const skillTimer = window.setInterval(() => this.scene.isActive() && this.maybeCastSkill(), 500);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => window.clearInterval(skillTimer));
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
        void this.refresh(); // cả lúc đang đánh: thấy người khác vào phòng & giật cần
        this.tickClock();
      }, 4000);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.timer !== null && window.clearInterval(this.timer));
    }
  }

  private async refresh() {
    try {
      this.status = await wbCall<WbStatus>({ op: "status" });
      if (!this.scene.isActive()) return;
      const st = this.status;
      const key = JSON.stringify([st.boss.id, st.slot.key, st.slot.live, st.killer, st.top, st.me, st.hp <= 0]);
      // chỉ cập nhật thanh máu & phòng; vẽ lại cả màn khi bảng xếp hạng / trạng thái đổi
      if (!this.fight && key !== this.lobbyKey) {
        this.lobbyKey = key;
        this.render();
      } else {
        this.hpBar?.set(st.maxHp ? st.hp / st.maxHp : 0);
        this.hpT?.setText(`${formatNum(st.hp)} / ${formatNum(st.maxHp)}`);
        this.renderRoom();
      }
    } catch (e) {
      if (this.scene.isActive()) toast(this, (e as Error).message, COLORS.red);
    }
  }

  /** Đội = đúng 3 CÁ TRƯNG BÀY (Hồ Sơ); cá khoá cũng được – đánh boss không mất cá. */
  private team(): OwnedFish[] {
    const uids = worldBossTeam(GameState.save, FISH_BY_ID, FORM_BY_ID).uids;
    return uids.map((u) => GameState.save.fishes.find((f) => f.uid === u)!).filter(Boolean);
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
    this.maskG?.destroy();
    this.needle?.destroy();
    this.needle = undefined;
    const c = this.add.container(0, 0);
    this.root = c;
    const b = this.bossInfo();
    const col = ELEMENT_INFO[b.element].color;
    const live = this.status?.slot.live ?? worldBossSlot(Date.now()).live;
    // ---- boss
    c.add(panel(this, 20, 92, this.aw() + 8, 614, 0.6));
    const hp = this.status?.hp ?? worldBossMaxHp(worldBossSlot(Date.now()));
    const maxHp = this.status?.maxHp ?? hp;
    // boss KHỔNG LỒ: gấp 10 lần cá thường, tràn khung đấu (cắt theo khung)
    this.maskG = this.make.graphics({}, false).fillRect(ARENA_X, 96, this.aw(), 606);
    const mask = this.maskG.createGeometryMask();
    // sảnh đấu riêng theo boss (cảnh nền + hạt hiệu ứng động)
    c.add(this.add.image(ARENA_X, 399, worldBossArenaTexture(this, b.id)).setOrigin(0, 0.5).setDisplaySize(ARENA_W, ARENA_H).setMask(mask));
    const fx = ARENA_FX[b.id];
    if (fx) {
      c.add(
        this.add
          .particles(0, 0, "p_spark", {
            x: { min: ARENA_X, max: ARENA_X + this.aw() },
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
      c.add(txt(this, ARENA_X + 12, 694, fx.label, 15, { weight: "700", color: "#ffffff" }).setOrigin(0, 1));
    }
    const glow = this.add.circle(this.bx() - 60, BOSS_Y + 30, 330, hexToInt(col), 0.18).setMask(mask);
    c.add(glow);
    this.bossGlow = glow;
    this.bossImg = this.add.image(this.bx(), BOSS_Y + 60, worldBossTexture(this, b.id)).setDisplaySize(FISH_VIEW.w * BOSS_SIZE, FISH_VIEW.h * BOSS_SIZE).setFlipX(true).setMask(mask);
    if (hp <= 0) this.bossImg.setTint(0x555555).setAngle(-12);
    c.add(this.bossImg);
    this.bossBase = { x: this.bx(), y: BOSS_Y + 52, dead: hp <= 0 };
    this.yank = { x: 0, a: 0 };
    this.poseBoss();
    // dải tối sau chữ để đọc rõ trên nền boss
    c.add(this.add.rectangle(this.cx(), 168, this.aw(), 130, 0x050814, 0.55));
    c.add(txt(this, this.cx(), 120, `🐉 ${b.name}`, 30, { color: col, align: "center" }).setOrigin(0.5));
    c.add(txt(this, this.cx(), 150, b.title, 16, { weight: "700", color: COLORS.textDim, align: "center" }).setOrigin(0.5));
    c.add(elementTag(this, 44, 128, b.element, 30, 16));
    this.hpBar = new Bar(this, this.cx() - 370, 172, 740, 26, 0xe53935, "");
    this.hpBar.set(maxHp ? hp / maxHp : 1);
    c.add(this.hpBar);
    this.hpT = txt(this, this.cx(), 185, `${formatNum(hp)} / ${formatNum(maxHp)}`, 16, { align: "center" }).setOrigin(0.5);
    c.add(this.hpT);
    this.clockT = txt(this, this.cx(), 216, "", 18, { color: live ? "#ff8a80" : COLORS.textGold, align: "center" }).setOrigin(0.5);
    c.add(this.clockT);
    this.tickClock();
    // NHÂN VẬT người chơi BÊN TRÁI cầm cần câu (nhỏ bằng 1/10 boss) + người chơi khác trong phòng
    this.roomC = this.add.container(0, 0);
    c.add(this.roomC);
    this.renderRoom();
    const me = this.add.container(ME_POS.x, ME_POS.y);
    const ch = CHARACTER_BY_ID.get(GameState.save.selectedCharacterId) ?? CHARACTER_BY_ID.get("c_be_tom")!;
    me.add(this.add.ellipse(0, 2, 80, 16, 0x000000, 0.3));
    const body = this.add.image(0, 0, characterTexture(this, ch, GameState.equipOf(ch.id))).setOrigin(0.5, 1).setDisplaySize(CHAR_VIEW.w, CHAR_VIEW.h);
    me.add(body);
    // đúng cần câu người chơi đang dùng khi câu cá
    this.myRod = new HeldRod(this, GameState.save.selectedRodId, ROD_HAND, ROD_TIP, ROD_K);
    me.add(this.myRod);
    this.meBody = body;
    this.drawRod(0);
    c.add(me);
    const pw = this.fight ? this.fight.e.power : this.myPower();
    c.add(txt(this, ME_POS.x, ME_POS.y - CHAR_VIEW.h - 26, `${GameState.save.name || "Bạn"}`, 14, { weight: "700", color: "#b9f6ca", align: "center" }).setOrigin(0.5));
    c.add(txt(this, ME_POS.x, ME_POS.y + 14, `⚔ Lực chiến ${formatNum(pw ?? 0)}`, 13, { weight: "700", color: "#ffd740", align: "center" }).setOrigin(0.5, 0));
    this.lineG = this.add.graphics().setDepth(4);
    c.add(this.lineG);
    if (this.status?.killer) c.add(txt(this, this.cx(), 560, `⚔ Kết liễu bởi: ${this.status.killer}`, 20, { color: "#ffd740", align: "center" }).setOrigin(0.5));

    if (this.fight) this.renderFight(c);
    else this.renderLobby(c, live, hp);
  }

  /** Lực chiến đội = tổng 3 cá trưng bày (thiếu thì bù cá mạnh nhất). */
  private myPower(): number {
    return worldBossTeam(GameState.save, FISH_BY_ID, FORM_BY_ID).power;
  }

  /** Cần câu trong tay nhân vật; bend > 0 = cần cong khi đang giật boss. */
  private drawRod(bend: number) {
    if (this.myRod?.active) this.myRod.draw(bend);
  }

  /**
   * Hoạt cảnh CÂU BOSS: quăng dây từ đầu cần tới miệng boss → móc → GIẬT mạnh (cần cong, boss bị kéo lệch).
   * rodWorld = toạ độ đầu cần trên màn hình; who = nhân vật để nghiêng người.
   */
  private hookAndYank(rodWorld: { x: number; y: number }, who: Phaser.GameObjects.Image | null, strong: boolean, mine: boolean, lineColor = 0xffffff) {
    const g = this.add.graphics().setDepth(4);
    this.root?.add(g);
    const t = { p: 0, slack: 1 };
    const draw = () => {
      g.clear();
      const ex = rodWorld.x + (this.hookX() - rodWorld.x) * t.p;
      const ey = rodWorld.y + (HOOK_Y - rodWorld.y) * t.p;
      const mx = (rodWorld.x + ex) / 2;
      const my = (rodWorld.y + ey) / 2 + 40 * t.slack * t.p;
      g.lineStyle(mine ? 2.5 : 1.6, lineColor, mine ? 0.95 : 0.7);
      new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(rodWorld.x, rodWorld.y), new Phaser.Math.Vector2(mx, my), new Phaser.Math.Vector2(ex, ey)).draw(g, 18);
      g.fillStyle(0xcfd8dc, 1).fillCircle(ex, ey, mine ? 4 : 3);
    };
    this.tweens.add({
      targets: t,
      p: 1,
      duration: 160,
      ease: "Quad.easeOut",
      onUpdate: draw,
      onComplete: () => {
        // giật: dây căng, cần cong, người ngả ra sau, boss bị kéo về phía người chơi
        this.tweens.add({ targets: t, slack: 0, duration: 90, onUpdate: draw });
        if (mine) {
          this.drawRod(1);
          window.setTimeout(() => this.drawRod(0), 260);
        }
        if (who) this.tweens.add({ targets: who, angle: -14, duration: 90, yoyo: true, hold: 120 });
        if (mine || strong) {
          // giật: kéo boss về phía người chơi rồi trôi về chậm, mượt (cộng vào tư thế bơi)
          this.tweens.killTweensOf(this.yank);
          this.tweens.add({ targets: this.yank, x: strong ? -46 : -22, a: strong ? -5 : -2, duration: 110, ease: "Quad.easeOut", onComplete: () => {
            this.tweens.add({ targets: this.yank, x: 0, a: 0, duration: 520, ease: "Back.easeOut" });
          } });
        }
        window.setTimeout(() => {
          this.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => g.destroy() });
        }, 330);
      },
    });
  }

  /** Người chơi khác đang trong phòng boss (cùng khung giờ, ra đòn ~2,5 phút gần nhất). */
  private renderRoom() {
    const rc = this.roomC;
    if (!rc) return;
    rc.removeAll(true);
    this.roomBodies = [];
    const others = (this.status?.room ?? []).filter((r) => !r.me).slice(0, ROOM_SPOTS.length);
    others.forEach((r, i) => {
      const spot = ROOM_SPOTS[i]!;
      const k = 0.62 + (spot.y / 720) * 0.3;
      const ch = CHARACTER_BY_ID.get(r.look?.c ?? "") ?? CHARACTER_BY_ID.get("c_be_tom")!;
      const body = this.add.image(spot.x, spot.y, characterTexture(this, ch, safeEquip(r.look?.equip))).setOrigin(0.5, 1).setDisplaySize(CHAR_VIEW.w * k, CHAR_VIEW.h * k).setAlpha(0.95);
      // cần câu họ đang dùng (máy chủ gửi kèm ngoại hình)
      const rod = new HeldRod(this, r.look?.rod, { x: ROD_HAND.x * k, y: ROD_HAND.y * k }, { x: ROD_TIP.x * k, y: ROD_TIP.y * k }, ROD_K * k).setPosition(spot.x, spot.y);
      const name = txt(this, spot.x, spot.y - CHAR_VIEW.h * k - 12, r.name, 11, { weight: "700", color: "#ffffff", align: "center" }).setOrigin(0.5);
      rc.add([this.add.ellipse(spot.x, spot.y + 2, 60 * k, 12 * k, 0x000000, 0.25), rod, body, name]);
      this.roomBodies.push({ body, x: spot.x, y: spot.y });
      const prev = this.roomSeen.get(r.name);
      this.roomSeen.set(r.name, r.at);
      if (prev && prev !== r.at) window.setTimeout(() => this.scene.isActive() && body.active && this.hookAndYank({ x: spot.x + rod.tip.x, y: spot.y + rod.tip.y }, body, false, false, rod.lineColor), 200 + i * 260);
    });
    if (others.length) rc.add(txt(this, 30, 250, `👥 ${others.length + 1} người trong phòng`, 13, { weight: "700", color: "#b9f6ca" }));
  }

  // ---------------------------------------------------------------- sảnh boss: bảng xếp hạng + vào đánh
  private renderLobby(c: Phaser.GameObjects.Container, live: boolean, hp: number) {
    c.add(panel(this, 932, 92, 332, 614, 0.95));
    c.add(txt(this, 1098, 120, "🏆 Bảng Sát Thương", 24, { color: COLORS.textGold, align: "center" }).setOrigin(0.5));
    if (!GameState.online) {
      c.add(txt(this, 1098, 330, "Cần đăng nhập tài khoản để đánh Boss Thế Giới cùng mọi người.", 18, { align: "center", wrap: 300, weight: "700" }).setOrigin(0.5));
      c.add(new Button(this, 1098, 420, 280, 60, "🔐 Đăng nhập", { color: COLORS.green, fontSize: 22, onClick: () => goTo(this, "Account") }));
      this.rules(c, 470);
      return;
    }
    const top = this.status?.top ?? [];
    if (!top.length) c.add(txt(this, 1098, 200, live ? "Chưa ai ra đòn – hãy là người đầu tiên!" : "Bảng sẽ có khi boss xuất hiện", 15, { align: "center", color: COLORS.textDim, wrap: 300 }).setOrigin(0.5));
    top.forEach((r, i) => {
      const y = 152 + i * 30;
      const g = this.add.graphics();
      g.fillStyle(r.me ? 0x2a5a8a : 0x0a1628, 0.9).fillRoundedRect(944, y, 308, 26, 8);
      c.add(g);
      c.add(txt(this, 954, y + 13, `${i < 3 ? ["🥇", "🥈", "🥉"][i] : `#${i + 1}`} ${r.name}`, 15, { weight: "700", color: r.me ? "#ffeb3b" : COLORS.text }).setOrigin(0, 0.5));
      c.add(txt(this, 1242, y + 13, formatNum(r.damage), 15, { color: COLORS.textGold }).setOrigin(1, 0.5));
    });
    const me = this.status?.me;
    const rw = wbRankReward(me?.rank ?? 99);
    c.add(
      txt(this, 1098, 466, me?.rank ? `Bạn: hạng #${me.rank} · ${formatNum(me.damage)} sát thương\nQuà dự kiến: ${rw.diamonds} 💎 · ${formatNum(rw.gold ?? 0)} 🪙 · ${rw.stones} 🔷 · ${rw.soul} 🔮` : "Bạn chưa ra đòn trong khung giờ này", 15, { align: "center", weight: "700", wrap: 300 }).setOrigin(0.5),
    );
    const left = me?.entriesLeft ?? WORLD_BOSS.entriesPerSlot;
    const shown = this.team().length;
    const can = live && hp > 0 && left > 0 && shown >= 3;
    const go = new Button(this, 1098, 540, 300, 64, `⚔ VÀO ĐÁNH (${left}/${WORLD_BOSS.entriesPerSlot} lượt)`, { color: COLORS.red, fontSize: 22, disabled: !can, onClick: () => void this.enter() });
    go.on("disabled-click", () => toast(this, !live ? "Boss chưa xuất hiện – quay lại lúc 12h · 15h · 20h · 23h" : hp <= 0 ? "Boss đã bị hạ gục" : left <= 0 ? "Hết lượt đánh của khung giờ này" : "Hãy trưng bày đủ 3 cá (Hồ Sơ) trước khi vào phòng boss"));
    c.add(go);
    if (can) this.tweens.add({ targets: go, scale: 1.05, duration: 600, yoyo: true, repeat: -1 });
    // vào phòng boss phải TRƯNG BÀY đủ 3 cá (lực chiến = tổng 3 con)
    c.add(txt(this, 1098, 590, `🏅 Cá trưng bày: ${shown}/3`, 15, { weight: "700", color: shown >= 3 ? "#b9f6ca" : "#ff8a80", align: "center" }).setOrigin(0.5));
    if (shown < 3) c.add(new Button(this, 1098, 632, 240, 46, "🏅 Trưng bày cá", { color: COLORS.green, fontSize: 18, onClick: () => goTo(this, "Profile", { mode: "profile" }) }));
    else this.rules(c, 616);
  }

  private rules(c: Phaser.GameObjects.Container, y: number) {
    const b = this.bossInfo();
    const lines = [
      "⏰ 12h · 15h · 20h · 23h, mỗi lần 30 phút",
      `⚔ Mỗi lượt ${WORLD_BOSS.hitsPerEntry} đòn canh kim (Space / chạm thanh)`,
      "🏅 Sát thương càng nhiều → quà càng nhiều",
      `🗡 Kết liễu: +1 Đá Tiến Hoá hệ ${ELEMENT_INFO[b.element].name} + 20 💎`,
    ];
    c.add(txt(this, 946, y, lines.join("\n"), 13, { weight: "700", color: COLORS.textDim, wrap: 300 }).setLineSpacing(3));
    void ELEMENT_EVO_ITEM;
  }

  private async enter() {
    const team = this.team();
    if (team.length < 3) return toast(this, "Hãy trưng bày đủ 3 cá (Hồ Sơ) trước khi vào phòng boss");
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
    // không gian boss rộng toàn màn – chỉ còn HUD nhỏ góc phải dưới
    const hud = this.add.graphics();
    hud.fillStyle(0x0a1628, 0.8).fillRoundedRect(1036, 560, 214, 132, 14);
    c.add(hud);
    this.hudT = txt(this, 1143, 592, `Đòn ${f.hits}/${f.e.hitsMax}\nSát thương: ${formatNum(f.dmg)}`, 16, { align: "center", weight: "700" }).setOrigin(0.5);
    c.add(this.hudT);
    c.add(new Button(this, 1143, 654, 180, 46, "Rút lui", { color: COLORS.blue, fontSize: 18, onClick: () => this.endFight() }));
    // thanh canh kim
    const g = this.add.graphics();
    g.fillStyle(0x0a1628, 0.9).fillRoundedRect(this.barX() - 12, BAR.y - 14, BAR.w + 24, BAR.h + 28, 12);
    const seg = (d0: number, d1: number, color: number) => {
      for (const sgn of [-1, 1]) {
        const a = 0.5 + sgn * d0;
        const b = 0.5 + sgn * d1;
        g.fillStyle(color, 1).fillRect(this.barX() + Math.min(a, b) * BAR.w, BAR.y, Math.abs(b - a) * BAR.w, BAR.h);
      }
    };
    seg(TIMING_BANDS.yellow, 0.5, 0xe53935);
    seg(TIMING_BANDS.green, TIMING_BANDS.yellow, 0xfdd835);
    seg(TIMING_BANDS.perfect, TIMING_BANDS.green, 0x43a047);
    seg(0, TIMING_BANDS.perfect, 0xb2ff59);
    g.lineStyle(4, 0x1b1530).strokeRect(this.barX(), BAR.y, BAR.w, BAR.h);
    c.add(g);
    c.add(txt(this, this.barX() + BAR.w / 2, BAR.y - 26, "Canh kim vào giữa rồi bấm SPACE / chạm thanh", 15, { color: "#b9f6ca", align: "center" }).setOrigin(0.5));
    const z = this.add.zone(this.barX() + BAR.w / 2, BAR.y + BAR.h / 2, BAR.w + 24, BAR.h + 60).setInteractive({ useHandCursor: true });
    z.on("pointerdown", () => this.hit());
    c.add(z);
    // chạm vào boss cũng là đánh
    this.bossImg?.setInteractive({ useHandCursor: true }).on("pointerdown", () => this.hit());
    this.needle = this.add.graphics().setDepth(5);
  }

  /** Boss gồng sức → báo tên chiêu → phóng chiêu vào người chơi (bản thân + người trong phòng). */
  private maybeCastSkill() {
    const boss = this.bossImg;
    if (!boss?.active || this.bossBase.dead || Date.now() < this.nextSkillAt) return;
    const live = this.status?.slot.live ?? worldBossSlot(Date.now()).live;
    if (!live) return;
    const skills = BOSS_SKILLS[this.bossInfo().id];
    if (!skills?.length) return;
    const skill = skills[this.skillIdx++ % skills.length]!;
    this.nextSkillAt = Date.now() + Phaser.Math.Between(7000, 11000);
    // gồng sức: ngửa ra sau, rực sáng
    skillBanner(this, skill, this.cx(), 300);
    chargeUp(this, skill, { x: this.hookX(), y: HOOK_Y - 10 }, 750);
    Sfx.skill();
    this.tweens.killTweensOf(this.yank);
    this.tweens.add({ targets: this.yank, x: 40, a: 6, duration: 600, ease: "Sine.easeInOut" });
    window.setTimeout(() => {
      if (!this.scene.isActive() || !boss.active) return;
      this.cameras.main.shake(220, 0.006);
      this.tweens.add({ targets: this.yank, x: -30, a: -4, duration: 140, ease: "Quad.easeOut", onComplete: () => this.tweens.add({ targets: this.yank, x: 0, a: 0, duration: 700, ease: "Sine.easeOut" }) });
      const targets = [{ x: ME_POS.x, y: ME_POS.y, body: this.meBody ?? null }, ...this.roomBodies.map((r) => ({ x: r.x, y: r.y, body: r.body as Phaser.GameObjects.Image | null }))];
      castBossSkill(this, skill, { x: this.hookX() + this.yank.x, y: HOOK_Y - 10 }, targets, (i) => {
        const b = targets[i]?.body;
        if (!b?.active) return;
        // trúng chiêu: hất lùi + chớp đỏ
        this.tweens.add({ targets: b, x: b.x - 16, duration: 90, yoyo: true, ease: "Quad.easeOut" });
        b.setTint(0xff8a80);
        window.setTimeout(() => b.active && b.clearTint(), 220);
        if (i === 0) Sfx.hook();
      });
    }, 750);
  }

  /** Tư thế boss theo thời gian thật: nhấp nhô, lắc thân, thở phồng, trôi nhẹ + độ lệch khi bị giật. */
  private poseBoss() {
    const b = this.bossImg;
    if (!b?.active) return;
    const t = performance.now() / 1000;
    const base = this.bossBase;
    if (base.dead) {
      b.setPosition(base.x, base.y + 30 + Math.sin(t * 0.8) * 4).setAngle(-12);
      return;
    }
    const sx = (FISH_VIEW.w * BOSS_SIZE) / b.width;
    const sy = (FISH_VIEW.h * BOSS_SIZE) / b.height;
    const breathe = Math.sin(t * 2.1) * 0.018;
    b.setPosition(base.x + Math.sin(t * 0.55) * 14 + this.yank.x, base.y + Math.sin(t * 1.25) * 12);
    b.setAngle(Math.sin(t * 0.95) * 2.2 + this.yank.a);
    b.setScale(sx * (1 - breathe * 0.5), sy * (1 + breathe));
    this.bossGlow?.setScale(1.06 + Math.sin(t * 2.2) * 0.06).setAlpha(0.13 + Math.sin(t * 2.2) * 0.05);
  }

  override update() {
    this.poseBoss();
    const f = this.fight;
    if (!f || !f.bar || !this.needle) return;
    const p = needlePos(f.bar, performance.now() - f.t0);
    const x = this.barX() + p * BAR.w;
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
        } else this.hudT?.setText(`Đòn ${f.hits}/${f.e.hitsMax}\nSát thương: ${formatNum(f.dmg)}`);
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
    const tip = this.myRod?.tip ?? ROD_TIP;
    this.hookAndYank({ x: ME_POS.x + tip.x, y: ME_POS.y + tip.y }, this.meBody ?? null, big, true, this.myRod?.lineColor ?? 0xffffff);
    this.cameras.main.shake(big ? 160 : 60, big ? 0.008 : 0.003);
    // chớp sáng ngắn (đồng hồ thật – đồng hồ Phaser chậm trên máy yếu làm boss trắng xoá lâu)
    this.bossImg?.setTint(big ? 0xfff3b0 : 0xffe0e0);
    window.setTimeout(() => this.bossImg?.active && this.bossImg.clearTint(), 90);
    const t = txt(this, (this.bx() - 270) + Phaser.Math.Between(-40, 80), BOSS_Y - 40, `-${formatNum(r.dmg)}`, big ? 44 : 32, { color: r.zone === "red" ? "#b0bec5" : big ? "#ffeb3b" : "#ffffff", align: "center" }).setOrigin(0.5).setDepth(20);
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
