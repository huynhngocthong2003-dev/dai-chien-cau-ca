import Phaser from "phaser";
import { CHARACTER_BY_ID, FISH_BY_ID, FORM_BY_ID, TITLE_BY_ID } from "@dccc/game-data";
import {
  PLAZA,
  PLAZA_EMOTES,
  constrain,
  depthScale,
  showOffCandidates,
  showOffMessage,
  stepMove,
  toNorm,
  toScreen,
  toShow,
  type PlazaShow,
  type Vec,
} from "@dccc/shared";
import { GameState } from "../state/GameState.ts";
import * as Social from "../state/social.ts";
import { canvasTexture, characterTexture, fishTextureFor } from "../art/textures.ts";
import { drawFountain, drawPlaza } from "../art/PlazaArt.ts";
import { TopBar } from "../ui/TopBar.ts";
import { Button, fadeIn, goTo, modal, panel, toast, txt } from "../ui/widgets.ts";
import { COLORS } from "../ui/theme.ts";
import { htmlOverlay } from "../ui/htmlOverlay.ts";
import { openPlayerProfile, safeEquip } from "../ui/playerProfile.ts";
import { openWorldChat } from "../ui/worldChat.ts";
import { Sfx } from "../audio/Sfx.ts";

/** Một nhân vật trên quảng trường (của mình hoặc người khác). */
interface Avatar {
  id: string;
  root: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  label: Phaser.GameObjects.Text;
  show?: Phaser.GameObjects.Container;
  bubble?: Phaser.GameObjects.Container;
  pos: Vec;
  target: Vec;
  walkT: number;
  lookKey: string;
  showKey: string;
  emoteSeen: string | null;
  lastSeen: number;
}

const UI = 2000;
const SEND_MS = 1200;
const POLL_MS = 2000;
const CHAT_MS = 3000;

/**
 * Quảng Trường: nơi người chơi gặp nhau, đi lại, trò chuyện (kênh Thế Giới), thả biểu cảm và khoe cá.
 * Điều khiển: bấm vào nền để đi tới, kéo cần điều khiển ảo (điện thoại), hoặc phím mũi tên / WASD.
 */
export class PlazaScene extends Phaser.Scene {
  private me!: Avatar;
  private others = new Map<string, Avatar>();
  private target: Vec | null = null;
  private joy = { active: false, pid: -1, vec: { x: 0, y: 0 } as Vec };
  private joyKnob!: Phaser.GameObjects.Arc;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private showing: PlazaShow | null = null;
  private emote: string | null = null;
  private emoteN = 0;
  private dirty = true;
  private lastSent = 0;
  private lastSentPos: Vec = { x: -1, y: -1 };
  private sendT = 0;
  private pollT = 0;
  private chatT = 0;
  private busy = { send: false, poll: false, chat: false };
  private seenMsg = new Set<number>();
  private chatReady = false;
  private countT!: Phaser.GameObjects.Text;
  private logC!: Phaser.GameObjects.Container;
  private marker!: Phaser.GameObjects.Ellipse;

  constructor() {
    super("Plaza");
  }

  private get myId(): string {
    return GameState.online?.id ?? "me";
  }

  create() {
    this.input.enabled = true;
    fadeIn(this);
    this.others = new Map();
    this.target = null;
    this.joy = { active: false, pid: -1, vec: { x: 0, y: 0 } };
    this.showing = null;
    this.emote = null;
    this.dirty = true;
    this.lastSent = 0;
    this.seenMsg = new Set();
    this.chatReady = false;
    this.busy = { send: false, poll: false, chat: false };
    this.sendT = SEND_MS;
    this.pollT = POLL_MS;
    this.chatT = CHAT_MS;

    this.add.image(0, 0, canvasTexture(this, "plaza_bg", 1280, 720, drawPlaza)).setOrigin(0).setDepth(-10);
    const f = PLAZA.fountain;
    this.add.image(f.x, f.y + 6, canvasTexture(this, "plaza_fountain", 320, 230, drawFountain)).setOrigin(0.5, 186 / 230).setDepth(f.y);
    this.addFountainSpray();
    this.marker = this.add.ellipse(0, 0, 40, 14, 0xffffff, 0.35).setStrokeStyle(2, 0xffffff, 0.8).setVisible(false).setDepth(1);

    new TopBar(this, { title: "Quảng Trường", onBack: () => goTo(this, "Hub") });

    const s = GameState.save;
    const start = constrain({ x: 400 + Math.random() * 480, y: 560 + Math.random() * 60 });
    this.me = this.makeAvatar(this.myId, s.name, null, s.level, start, { c: s.selectedCharacterId, equip: GameState.equipOf(s.selectedCharacterId) }, true);

    this.buildUi();
    this.setupInput();

    if (GameState.online) {
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => void Social.plazaLeave(this.myId).catch(() => null));
      toast(this, "Chào mừng tới Quảng Trường! Bấm vào nền hoặc kéo cần điều khiển để đi lại 🚶", COLORS.blue);
    } else this.offlinePanel();
  }

  // ------------------------------------------------------------------ nhân vật
  private makeAvatar(id: string, name: string, title: string | null, level: number, pos: Vec, look: Social.PlazaLook, mine: boolean): Avatar {
    const root = this.add.container(pos.x, pos.y);
    const shadow = this.add.ellipse(0, 0, 70, 18, 0x000000, 0.25);
    const body = this.add.image(0, 0, this.lookTexture(look)).setOrigin(0.5, 1);
    const t = title ? TITLE_BY_ID.get(title) : undefined;
    const label = txt(this, 0, 0, `${t ? `${t.icon} ` : ""}${name} · Lv.${level}`, 15, { align: "center", color: mine ? "#80d8ff" : (t?.color ?? "#ffffff") }).setOrigin(0.5, 1);
    root.add([shadow, body, label]);
    if (!mine) {
      body.setInteractive({ useHandCursor: true, pixelPerfect: false }).on("pointerup", () => void openPlayerProfile(this, id));
      label.setInteractive({ useHandCursor: true }).on("pointerup", () => void openPlayerProfile(this, id));
    }
    const av: Avatar = { id, root, body, shadow, label, pos: { ...pos }, target: { ...pos }, walkT: 0, lookKey: JSON.stringify(look), showKey: "", emoteSeen: null, lastSeen: Date.now() };
    this.layout(av, false);
    return av;
  }

  private lookTexture(look: Social.PlazaLook): string {
    const ch = CHARACTER_BY_ID.get(look.c) ?? CHARACTER_BY_ID.get("c_be_tom")!;
    return characterTexture(this, ch, safeEquip(look.equip));
  }

  private layout(av: Avatar, moving: boolean) {
    const k = depthScale(av.pos.y);
    const bob = moving ? Math.abs(Math.sin(av.walkT / 90)) * 6 : 0;
    av.root.setPosition(av.pos.x, av.pos.y).setDepth(av.pos.y);
    av.body.setScale(k).setY(-bob).setAngle(moving ? Math.sin(av.walkT / 90) * 3 : 0);
    av.shadow.setScale(k * 1.4, k * 1.4);
    const top = -240 * k - bob;
    av.label.setY(top + 4);
    av.show?.setY(top - 74 + Math.sin(this.time.now / 300) * 4);
    av.bubble?.setY(top - (av.show ? 124 : 26));
  }

  private setShow(av: Avatar, show: PlazaShow | null) {
    const key = show ? JSON.stringify(show) : "";
    if (key === av.showKey) return;
    av.showKey = key;
    av.show?.destroy();
    av.show = undefined;
    const fish = show ? FISH_BY_ID.get(show.fishId) : undefined;
    if (!show || !fish) return;
    const c = this.add.container(0, 0);
    const glow = this.add.ellipse(0, 0, 120, 60, 0xffd740, 0.25);
    const img = this.add.image(0, 0, fishTextureFor(this, fish, show.formId)).setDisplaySize(104, 65);
    const kg = txt(this, 0, 28, `${show.kg}kg`, 15, { color: "#ffe082", align: "center" }).setOrigin(0.5, 0);
    c.add([glow, img, kg]);
    av.root.add(c);
    av.show = c;
    this.tweens.add({ targets: glow, alpha: 0.05, duration: 700, yoyo: true, repeat: -1 });
    c.setScale(0.2);
    this.tweens.add({ targets: c, scale: 1, duration: 380, ease: "Back.easeOut" });
  }

  private say(av: Avatar, text: string) {
    av.bubble?.destroy();
    const t = txt(this, 0, 0, text, 15, { weight: "700", color: "#1b1530", stroke: 0, wrap: 230, align: "center", shadow: false }).setOrigin(0.5, 1);
    const w = Math.max(60, t.width + 22);
    const h = t.height + 12;
    const g = this.add.graphics();
    g.fillStyle(0xfff8e1, 0.97).fillRoundedRect(-w / 2, -h - 2, w, h, 12);
    g.lineStyle(3, 0x1b1530).strokeRoundedRect(-w / 2, -h - 2, w, h, 12);
    g.fillStyle(0xfff8e1, 1).fillTriangle(-8, -3, 8, -3, 0, 10);
    t.setY(-6);
    const c = this.add.container(0, 0, [g, t]);
    av.root.add(c);
    av.bubble = c;
    this.layout(av, false);
    c.setScale(0.3);
    this.tweens.add({ targets: c, scale: 1, duration: 200, ease: "Back.easeOut" });
    this.time.delayedCall(6500, () => {
      if (av.bubble === c) {
        this.tweens.add({ targets: c, alpha: 0, duration: 300, onComplete: () => c.destroy() });
        av.bubble = undefined;
      }
    });
  }

  private popEmote(av: Avatar, e: string) {
    const t = txt(this, av.pos.x, av.pos.y - 240 * depthScale(av.pos.y) - 20, e, 54, { stroke: 0 }).setOrigin(0.5).setDepth(UI - 1);
    t.setScale(0.2);
    this.tweens.add({ targets: t, scale: 1.2, duration: 260, ease: "Back.easeOut" });
    this.tweens.add({ targets: t, y: t.y - 90, alpha: 0, delay: 900, duration: 900, onComplete: () => t.destroy() });
  }

  // ------------------------------------------------------------------ giao diện
  private buildUi() {
    this.countT = txt(this, 1260, 92, "", 18, { color: COLORS.textGold }).setOrigin(1, 0).setDepth(UI);
    this.countT.setText(GameState.online ? "🟢 Đang tải…" : "⚪ Ngoại tuyến");

    // nhật ký chat nhỏ (bấm để mở Chat Thế Giới)
    this.logC = this.add.container(0, 0).setDepth(UI);
    const lp = panel(this, 16, 90, 430, 150, 0.55);
    lp.setDepth(UI - 1).setInteractive(new Phaser.Geom.Rectangle(16, 90, 430, 150), Phaser.Geom.Rectangle.Contains);
    lp.on("pointerup", () => openWorldChat(this));
    this.logC.add(txt(this, 30, 98, "💬 Kênh Thế Giới (bấm để xem tất cả)", 14, { color: COLORS.textDim, weight: "700" }));

    // cần điều khiển ảo
    const jx = 110;
    const jy = 600;
    this.add.circle(jx, jy, 70, 0x071a33, 0.45).setStrokeStyle(4, 0xffffff, 0.5).setDepth(UI);
    this.joyKnob = this.add.circle(jx, jy, 30, 0xffffff, 0.55).setStrokeStyle(3, 0x1b1530).setDepth(UI + 1);
    txt(this, jx, jy + 84, "Di chuyển", 14, { color: COLORS.textDim, weight: "700" }).setOrigin(0.5).setDepth(UI);

    // biểu cảm
    PLAZA_EMOTES.forEach((e, i) => {
      new Button(this, 905 + i * 46, 686, 42, 42, e, { color: COLORS.panelLight, fontSize: 22, onClick: () => this.doEmote(e) }).setDepth(UI);
    });
    new Button(this, 1140, 620, 200, 56, "🐟 Khoe cá", { color: COLORS.orange, fontSize: 22, onClick: () => this.openShowOff() }).setDepth(UI);

    // ô chat
    const owner = this.add.container(0, 0).setDepth(UI);
    const box = htmlOverlay(
      this,
      owner,
      520,
      686,
      420,
      44,
      `<input id="plaza-input" maxlength="200" placeholder="${GameState.online ? "Nói gì đó…" : "Đăng nhập để trò chuyện"}" style="width:100%;height:100%;box-sizing:border-box;font:700 17px 'Baloo 2',sans-serif;padding:4px 12px;border-radius:12px;border:3px solid #1b1530;background:#fff8e1;color:#1b1530">`,
    );
    const input = box.querySelector("input") as HTMLInputElement;
    let sending = false;
    const send = async () => {
      const body = input.value.trim();
      if (!body || sending) return;
      if (!GameState.online) return toast(this, "Đăng nhập tài khoản online để trò chuyện", COLORS.red);
      sending = true;
      try {
        await Social.sendWorld(this.myId, body);
        input.value = "";
        this.say(this.me, body);
        this.chatT = CHAT_MS - 400;
      } catch (e) {
        toast(this, (e as Error).message, COLORS.red);
      } finally {
        sending = false;
      }
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") void send();
    });
    new Button(this, 790, 686, 100, 44, "Gửi", { color: COLORS.green, fontSize: 20, onClick: () => void send() }).setDepth(UI);
  }

  private offlinePanel() {
    const c = this.add.container(0, 0).setDepth(UI);
    c.add(panel(this, 380, 250, 520, 130, 0.85));
    c.add(txt(this, 640, 290, "Bạn đang ở Quảng Trường một mình…", 22, { align: "center", color: COLORS.textGold }).setOrigin(0.5));
    c.add(txt(this, 640, 322, "Đăng nhập để gặp, trò chuyện và khoe cá với người chơi khác!", 16, { align: "center", weight: "700" }).setOrigin(0.5));
    c.add(new Button(this, 640, 360, 220, 44, "👤 Đăng nhập", { color: COLORS.blue, fontSize: 20, onClick: () => goTo(this, "Account") }));
  }

  private addFountainSpray() {
    const f = PLAZA.fountain;
    for (let i = 0; i < 3; i++) {
      const d = this.add.circle(f.x, f.y - 150, 5, 0xb3e5fc, 0.9).setDepth(f.y + 1);
      this.tweens.add({ targets: d, y: f.y - 30, x: f.x + (i - 1) * 60, alpha: 0.2, duration: 900, delay: i * 300, repeat: -1 });
    }
  }

  // ------------------------------------------------------------------ điều khiển
  private setupInput() {
    const jx = 110;
    const jy = 600;
    this.input.on("pointerdown", (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      Sfx.unlock();
      if (Math.hypot(p.worldX - jx, p.worldY - jy) < 95) {
        this.joy = { active: true, pid: p.id, vec: { x: 0, y: 0 } };
        this.target = null;
        this.updateJoy(p);
        return;
      }
      if (over.length) return;
      if (p.worldY < 380 || p.worldY > 665) return;
      this.target = constrain({ x: p.worldX, y: p.worldY });
      this.marker.setPosition(this.target.x, this.target.y).setVisible(true).setScale(0.4).setAlpha(1);
      this.tweens.add({ targets: this.marker, scale: 1, alpha: 0.3, duration: 400 });
    });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (this.joy.active && p.id === this.joy.pid) this.updateJoy(p);
    });
    const end = (p: Phaser.Input.Pointer) => {
      if (this.joy.active && p.id === this.joy.pid) {
        this.joy = { active: false, pid: -1, vec: { x: 0, y: 0 } };
        this.joyKnob.setPosition(jx, jy);
      }
    };
    this.input.on("pointerup", end);
    this.input.on("pointerupoutside", end);
    this.keys = this.input.keyboard!.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT", false) as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard?.on("keydown-ESC", () => goTo(this, "Hub"));
  }

  private updateJoy(p: Phaser.Input.Pointer) {
    const jx = 110;
    const jy = 600;
    let dx = p.worldX - jx;
    let dy = p.worldY - jy;
    const d = Math.hypot(dx, dy);
    if (d > 60) {
      dx = (dx / d) * 60;
      dy = (dy / d) * 60;
    }
    this.joyKnob.setPosition(jx + dx, jy + dy);
    this.joy.vec = d < 8 ? { x: 0, y: 0 } : { x: dx / 60, y: dy / 60 };
  }

  private keyDir(): Vec | null {
    const k = this.keys;
    if (!k) return null;
    const x = (k.RIGHT?.isDown || k.D?.isDown ? 1 : 0) - (k.LEFT?.isDown || k.A?.isDown ? 1 : 0);
    const y = (k.DOWN?.isDown || k.S?.isDown ? 1 : 0) - (k.UP?.isDown || k.W?.isDown ? 1 : 0);
    return x || y ? { x, y } : null;
  }

  private doEmote(e: string) {
    this.popEmote(this.me, e);
    Sfx.unlock();
    this.emoteN = (this.emoteN + 1) % 10;
    this.emote = `${e}|${this.emoteN}`;
    this.dirty = true;
    this.sendT = SEND_MS;
  }

  private openShowOff() {
    const list = showOffCandidates(GameState.save.fishes, FISH_BY_ID, 12);
    const m = modal(this, 900, 600, "🐟 Chọn cá để khoe");
    if (!list.length) {
      m.root.add(txt(this, 640, m.y + 280, "Kho cá trống – đi câu vài con rồi quay lại khoe nhé!", 20, { align: "center" }).setOrigin(0.5));
      return;
    }
    m.root.add(txt(this, 640, m.y + 70, "Cá sẽ được giơ trên đầu nhân vật và báo lên Kênh Thế Giới", 15, { align: "center", weight: "700", color: COLORS.textDim }).setOrigin(0.5));
    list.forEach((o, i) => {
      const fish = FISH_BY_ID.get(o.fishId)!;
      const form = o.form ? FORM_BY_ID.get(o.form) : undefined;
      const x = m.x + 130 + (i % 4) * 214;
      const y = m.y + 150 + Math.floor(i / 4) * 140;
      const b = new Button(this, x, y, 200, 128, "", { color: COLORS.panelLight, onClick: () => pick() });
      const img = this.add.image(x, y - 20, fishTextureFor(this, fish, o.form ?? null, o.stars, o.parents)).setDisplaySize(120, 75);
      const t = txt(this, x, y + 30, `${form ? `${form.name} ` : ""}${fish.name}\n${o.weightKg.toFixed(1)}kg · Lv.${o.level}`, 13, { align: "center", weight: "700" }).setOrigin(0.5);
      m.root.add([b, img, t]);
      const pick = () => {
        const show = toShow(o);
        this.showing = show;
        this.setShow(this.me, show);
        this.dirty = true;
        this.sendT = SEND_MS;
        m.close();
        Sfx.catchFanfare(false);
        if (GameState.online) {
          const msg = showOffMessage(show, fish, form?.name);
          void Social.sendWorld(this.myId, msg)
            .then(() => this.say(this.me, msg))
            .catch((e: Error) => toast(this, e.message, COLORS.red));
        } else toast(this, "Đăng nhập để mọi người cùng thấy cá của bạn!", COLORS.blue);
      };
    });
    if (this.showing)
      m.root.add(
        new Button(this, 640, m.y + m.h - 44, 220, 52, "Cất cá đi", {
          color: COLORS.red,
          fontSize: 20,
          onClick: () => {
            this.showing = null;
            this.setShow(this.me, null);
            this.dirty = true;
            m.close();
          },
        }),
      );
  }

  // ------------------------------------------------------------------ mạng
  private async sendPresence() {
    if (!GameState.online || this.busy.send) return;
    const moved = Math.hypot(this.me.pos.x - this.lastSentPos.x, this.me.pos.y - this.lastSentPos.y) > 2;
    if (!this.dirty && !moved && Date.now() - this.lastSent < 15000) return;
    this.busy.send = true;
    const s = GameState.save;
    const n = toNorm(this.me.pos);
    try {
      await Social.plazaUpsert(this.myId, { x: n.x, y: n.y, look: { c: s.selectedCharacterId, equip: GameState.equipOf(s.selectedCharacterId) }, showing: this.showing, emote: this.emote });
      this.dirty = false;
      this.lastSent = Date.now();
      this.lastSentPos = { ...this.me.pos };
    } catch {
      /* mất mạng tạm thời – thử lại lần sau */
    } finally {
      this.busy.send = false;
    }
  }

  private async poll() {
    if (!GameState.online || this.busy.poll) return;
    this.busy.poll = true;
    try {
      const rows = await Social.plazaList();
      if (!this.scene.isActive()) return;
      const seen = new Set<string>();
      for (const r of rows) {
        if (r.user_id === this.myId) continue;
        seen.add(r.user_id);
        const pos = toScreen({ x: r.x, y: r.y });
        let av = this.others.get(r.user_id);
        if (!av) {
          av = this.makeAvatar(r.user_id, r.name, r.title, r.level, pos, r.look ?? { c: "c_be_tom" }, false);
          av.emoteSeen = r.emote;
          this.others.set(r.user_id, av);
        } else {
          const lk = JSON.stringify(r.look ?? {});
          if (lk !== av.lookKey) {
            av.lookKey = lk;
            av.body.setTexture(this.lookTexture(r.look ?? { c: "c_be_tom" }));
          }
          if (r.emote && r.emote !== av.emoteSeen) this.popEmote(av, r.emote.split("|")[0]!);
          av.emoteSeen = r.emote;
        }
        av.target = pos;
        av.lastSeen = Date.now();
        this.setShow(av, r.showing);
      }
      for (const [id, av] of this.others)
        if (!seen.has(id)) {
          av.root.destroy();
          this.others.delete(id);
        }
      this.countT.setText(`🟢 ${this.others.size + 1} người ở quảng trường`);
    } catch {
      this.countT.setText("⚠ Mất kết nối – đang thử lại…");
    } finally {
      this.busy.poll = false;
    }
  }

  private async pollChat() {
    if (!GameState.online || this.busy.chat) return;
    this.busy.chat = true;
    try {
      const msgs = await Social.fetchWorld(12);
      if (!this.scene.isActive()) return;
      for (const m of msgs) {
        if (this.seenMsg.has(m.id)) continue;
        this.seenMsg.add(m.id);
        if (!this.chatReady) continue; // lần đầu: chỉ ghi nhận tin cũ, không hiện bong bóng
        if (m.user_id === this.myId) continue; // tin của mình đã hiện khi gửi
        const av = this.others.get(m.user_id);
        if (av) this.say(av, m.body);
      }
      this.chatReady = true;
      this.drawLog(msgs.slice(-5));
    } catch {
      /* thử lại sau */
    } finally {
      this.busy.chat = false;
    }
  }

  private drawLog(msgs: Social.WorldMessage[]) {
    this.logC.list.slice(1).forEach((o) => o.destroy());
    msgs.forEach((m, i) => {
      const line = `${m.name}: ${m.body}`;
      this.logC.add(txt(this, 30, 120 + i * 23, line.length > 46 ? `${line.slice(0, 45)}…` : line, 14, { weight: "700", color: m.user_id === this.myId ? "#80d8ff" : "#ffffff" }));
    });
  }

  // ------------------------------------------------------------------ vòng lặp
  override update(_t: number, dtRaw: number) {
    const dt = Math.min(100, dtRaw);
    // mình
    const dir = this.joy.active ? this.joy.vec : this.keyDir();
    if (dir) this.target = null;
    const r = stepMove(this.me.pos, dt, { dir, target: this.target });
    if (r.moving) {
      if (Math.abs(r.pos.x - this.me.pos.x) > 0.3) this.me.body.setFlipX(r.pos.x < this.me.pos.x);
      this.me.walkT += dt;
    }
    this.me.pos = r.pos;
    if (this.target && r.arrived) {
      this.target = null;
      this.marker.setVisible(false);
    }
    this.layout(this.me, r.moving);
    // người khác: trượt mượt tới vị trí mới nhận
    for (const av of this.others.values()) {
      const far = Math.hypot(av.target.x - av.pos.x, av.target.y - av.pos.y) > 500;
      const m = far ? { pos: av.target, moving: false } : stepMove(av.pos, dt * 1.15, { target: av.target });
      if (m.moving) {
        if (Math.abs(m.pos.x - av.pos.x) > 0.3) av.body.setFlipX(m.pos.x < av.pos.x);
        av.walkT += dt;
      }
      av.pos = m.pos;
      this.layout(av, m.moving);
    }
    // mạng
    this.sendT += dt;
    this.pollT += dt;
    this.chatT += dt;
    if (this.sendT >= SEND_MS) {
      this.sendT = 0;
      void this.sendPresence();
    }
    if (this.pollT >= POLL_MS) {
      this.pollT = 0;
      void this.poll();
    }
    if (this.chatT >= CHAT_MS) {
      this.chatT = 0;
      void this.pollChat();
    }
  }
}
