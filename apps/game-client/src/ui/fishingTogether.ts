import Phaser from "phaser";
import { CHARACTER_BY_ID, FISH_BY_ID, TITLE_BY_ID } from "@dccc/game-data";
import { FISH_RARITY_COLOR } from "@dccc/game-config";
import { fishingSpotX } from "@dccc/shared";
import { GameState } from "../state/GameState.ts";
import * as Social from "../state/social.ts";
import { characterTexture, fishTextureFor } from "../art/textures.ts";
import { HORIZON } from "../art/Backgrounds.ts";
import { openPlayerProfile, safeEquip } from "./playerProfile.ts";
import { txt } from "./widgets.ts";

interface Other {
  p: Social.FishingPresence;
  root: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Image;
  line: Phaser.GameObjects.Graphics;
  pop?: Phaser.GameObjects.Container;
  lookKey: string;
  catchAt: string | null;
}

const FEET_Y = HORIZON - 8;
const SCALE = 0.36;
const DEPTH = 1.6;

/**
 * Câu cùng nhau: người chơi khác ở cùng khu câu đứng trên BẾN XA, mỗi người một chỗ do máy chủ chia
 * (không chồng nhau, không che bục của mình). Thấy họ chờ cá / kéo cá / khoe cá vừa câu được.
 */
export class FishingTogether {
  private others = new Map<string, Other>();
  private pier?: Phaser.GameObjects.Graphics;
  private countT?: Phaser.GameObjects.Text;
  private pollT = 0;
  private beatT = 0;
  private busy = false;
  private joined = false;
  private state: Social.FishingPresence["state"] = "idle";
  mySpot = -1;

  constructor(
    private scene: Phaser.Scene,
    private zoneId: string,
  ) {}

  get active() {
    return !!GameState.online;
  }

  start() {
    if (!this.active) return;
    this.pier = this.scene.add.graphics().setDepth(DEPTH - 0.1);
    this.drawPier();
    this.countT = txt(this.scene, 16, 158, "", 16, { weight: "700", color: "#b3e5fc" }).setOrigin(0, 0.5).setDepth(50);
    const s = GameState.save;
    void Social.fishingJoin(this.zoneId, { c: s.selectedCharacterId, equip: GameState.equipOf(s.selectedCharacterId) })
      .then((spot) => {
        this.mySpot = spot;
        this.joined = true;
        this.pollT = 99999;
      })
      .catch(() => null);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  /** Bến gỗ xa bên kia mặt nước – có 6 chỗ câu. */
  private drawPier() {
    const g = this.pier!;
    const x0 = fishingSpotX(0) - 60;
    const x1 = fishingSpotX(5) + 60;
    g.fillStyle(0x6d4c41, 1).fillRect(x0, FEET_Y - 1, x1 - x0, 7);
    g.fillStyle(0x8d6e63, 1).fillRect(x0, FEET_Y - 3, x1 - x0, 3);
    g.lineStyle(2, 0x1b1530, 0.6).strokeRect(x0, FEET_Y - 3, x1 - x0, 9);
    g.fillStyle(0x4e342e, 1);
    for (let x = x0 + 10; x < x1; x += 60) g.fillRect(x, FEET_Y + 6, 5, 12);
  }

  /** Báo trạng thái của mình (để người khác thấy). */
  setState(state: Social.FishingPresence["state"], caught?: Social.FishingCatch) {
    if (!this.active || !this.joined) return;
    this.state = state;
    this.beatT = 0;
    void Social.fishingUpdate(GameState.online!.id, caught ? { state, catch: caught } : { state }).catch(() => null);
  }

  update(dt: number) {
    if (!this.active || !this.joined) return;
    this.pollT += dt;
    this.beatT += dt;
    if (this.beatT > 20000) this.setState(this.state); // nhịp giữ chỗ
    if (this.pollT > 2500 && !this.busy) {
      this.pollT = 0;
      void this.poll();
    }
    const t = this.scene.time.now;
    for (const o of this.others.values()) this.drawLine(o, t);
  }

  private async poll() {
    this.busy = true;
    try {
      const rows = await Social.fishingList(this.zoneId);
      if (!this.scene.scene.isActive()) return;
      const me = GameState.online?.id;
      const seen = new Set<string>();
      let hidden = 0;
      for (const r of rows) {
        if (r.user_id === me) continue;
        if (r.spot < 0) {
          hidden++;
          continue;
        }
        seen.add(r.user_id);
        let o = this.others.get(r.user_id);
        if (!o) {
          o = this.make(r);
          this.others.set(r.user_id, o);
        } else {
          const lk = JSON.stringify(r.look ?? {});
          if (lk !== o.lookKey) {
            o.lookKey = lk;
            o.body.setTexture(this.tex(r.look));
          }
          if (o.p.spot !== r.spot) o.root.setX(fishingSpotX(r.spot));
          o.p = r;
        }
        if (r.catch && r.catch_at && r.catch_at !== o.catchAt) {
          // cá vừa câu (trong 15 giây) hoặc câu được trong lúc mình đang xem
          if (o.catchAt !== null || Math.abs(Date.now() - Date.parse(r.catch_at)) < 15000) this.showCatch(o, r.catch);
          o.catchAt = r.catch_at;
        }
      }
      for (const [id, o] of this.others)
        if (!seen.has(id)) {
          o.root.destroy();
          o.line.destroy();
          this.others.delete(id);
        }
      const n = this.others.size;
      this.countT?.setText(n || hidden ? `🎣 ${n + hidden} người đang câu cùng khu${hidden ? ` (+${hidden} chờ chỗ)` : ""}` : "");
    } catch {
      /* thử lại sau */
    } finally {
      this.busy = false;
    }
  }

  private tex(look: Social.PlazaLook) {
    const ch = CHARACTER_BY_ID.get(look?.c) ?? CHARACTER_BY_ID.get("c_be_tom")!;
    return characterTexture(this.scene, ch, safeEquip(look?.equip));
  }

  private make(r: Social.FishingPresence): Other {
    const sc = this.scene;
    const root = sc.add.container(fishingSpotX(r.spot), FEET_Y).setDepth(DEPTH);
    const body = sc.add.image(0, 0, this.tex(r.look)).setOrigin(0.5, 1).setScale(SCALE);
    const t = r.title ? TITLE_BY_ID.get(r.title) : undefined;
    const tag = txt(sc, 0, -240 * SCALE - 4, `${t ? `${t.icon} ` : ""}${r.name}`, 12, { align: "center", color: t?.color ?? "#ffffff" }).setOrigin(0.5, 1);
    root.add([body, tag]);
    body.setInteractive({ useHandCursor: true }).on("pointerup", () => void openPlayerProfile(sc, r.user_id));
    const line = sc.add.graphics().setDepth(DEPTH + 0.05);
    body.setAlpha(0);
    sc.tweens.add({ targets: body, alpha: 1, duration: 400 });
    return { p: r, root, body, line, lookKey: JSON.stringify(r.look ?? {}), catchAt: null };
  }

  /** Cần câu + dây của người khác theo trạng thái (chờ: dây thả lỏng; kéo: cần cong, nước bắn). */
  private drawLine(o: Other, t: number) {
    const g = o.line;
    g.clear();
    const x = o.root.x;
    const hand = { x: x + 10, y: FEET_Y - 40 };
    const reeling = o.p.state === "reeling";
    const bend = reeling ? 14 + Math.sin(t / 70) * 5 : 2;
    const tip = { x: x + 44, y: FEET_Y - 66 + bend };
    g.lineStyle(3, 0x5d4037, 1);
    g.beginPath();
    g.moveTo(hand.x, hand.y);
    g.lineTo((hand.x + tip.x) / 2 + 2, (hand.y + tip.y) / 2 - 4 + bend * 0.3);
    g.lineTo(tip.x, tip.y);
    g.strokePath();
    if (o.p.state === "idle") return;
    const water = { x: x + 58 + (reeling ? Math.sin(t / 90) * 6 : 0), y: HORIZON + 4 };
    g.lineStyle(1.5, 0xffffff, 0.85);
    g.beginPath();
    g.moveTo(tip.x, tip.y);
    g.lineTo(water.x, water.y);
    g.strokePath();
    g.fillStyle(reeling ? 0xffffff : 0xff5252, reeling ? 0.5 : 1);
    g.fillCircle(water.x, water.y, reeling ? 5 + Math.sin(t / 60) * 2 : 3);
  }

  /** Người cùng khu nói chuyện → bong bóng chat trên đầu (vài giây). */
  say(userId: string, text: string): boolean {
    const o = this.others.get(userId);
    if (!o) return false;
    const sc = this.scene;
    const old = o.root.getData("bubble") as Phaser.GameObjects.Container | undefined;
    old?.destroy();
    const t = txt(sc, 0, 0, text.length > 40 ? `${text.slice(0, 39)}…` : text, 12, { weight: "700", color: "#1b1530", stroke: 0, shadow: false, wrap: 150, align: "center" }).setOrigin(0.5, 1);
    const w = Math.max(40, t.width + 14);
    const h = t.height + 8;
    const g = sc.add.graphics();
    g.fillStyle(0xfff8e1, 0.97).fillRoundedRect(-w / 2, -h - 2, w, h, 8).lineStyle(2, 0x1b1530).strokeRoundedRect(-w / 2, -h - 2, w, h, 8);
    g.fillStyle(0xfff8e1, 1).fillTriangle(-5, -3, 5, -3, 0, 6);
    t.setY(-6);
    const b = sc.add.container(0, -240 * SCALE - (o.pop ? 110 : 26), [g, t]);
    o.root.add(b);
    o.root.setData("bubble", b);
    sc.time.delayedCall(6000, () => b.active && b.destroy());
    return true;
  }

  /** Người khác vừa câu được cá → giơ cá lên trên đầu vài giây. */
  private showCatch(o: Other, c: Social.FishingCatch) {
    const fish = FISH_BY_ID.get(c.fishId);
    if (!fish) return;
    const sc = this.scene;
    o.pop?.destroy();
    const pop = sc.add.container(0, -240 * SCALE - 40);
    const img = sc.add.image(0, 0, fishTextureFor(sc, fish, c.formId)).setDisplaySize(84, 52);
    const lb = txt(sc, 0, 24, `${fish.name} ${c.kg}kg`, 12, { align: "center", color: FISH_RARITY_COLOR[fish.rarity] }).setOrigin(0.5, 0);
    pop.add([img, lb]);
    o.root.add(pop);
    o.pop = pop;
    pop.setScale(0.2);
    sc.tweens.add({ targets: pop, scale: 1, y: pop.y - 10, duration: 350, ease: "Back.easeOut" });
    sc.time.delayedCall(4500, () => {
      if (o.pop === pop) sc.tweens.add({ targets: pop, alpha: 0, duration: 400, onComplete: () => pop.destroy() });
    });
  }

  destroy() {
    if (this.joined && GameState.online) void Social.fishingLeave().catch(() => null);
    this.joined = false;
    for (const o of this.others.values()) {
      o.root.destroy();
      o.line.destroy();
    }
    this.others.clear();
  }
}
