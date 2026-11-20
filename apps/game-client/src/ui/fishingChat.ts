import Phaser from "phaser";
import { GameState } from "../state/GameState.ts";
import * as Social from "../state/social.ts";
import { Button, toast, txt } from "./widgets.ts";
import { COLORS } from "./theme.ts";
import { htmlOverlay } from "./htmlOverlay.ts";
import { openWorldChat } from "./worldChat.ts";
import type { FishingTogether } from "./fishingTogether.ts";

const POLL_MS = 4000;
const X = 16;
const Y = 428;
const W = 430;
const H = 186;

/**
 * Khung chat thu gọn trong màn câu cá: xem & gửi Chat Thế Giới mà không rời chỗ câu.
 * Người câu cùng khu nói → bong bóng chat trên đầu họ ở bến xa.
 */
export class FishingChat {
  private open = false;
  private panel?: Phaser.GameObjects.Container;
  private log?: Phaser.GameObjects.Container;
  private btn!: Button;
  private seen = new Set<number>();
  private ready = false;
  private unread = 0;
  private busy = false;
  private timer: number | null = null;
  private last: Social.WorldMessage[] = [];

  constructor(
    private scene: Phaser.Scene,
    private together?: FishingTogether,
  ) {}

  start() {
    // nút luôn hiện; chưa kết nối tài khoản thì bấm vào sẽ báo lý do
    this.btn = new Button(this.scene, 740, 38, 150, 46, "💬 Chat", { color: COLORS.blue, fontSize: 18, onClick: () => this.toggle() }).setDepth(45);
    if (!GameState.online) return;
    void this.poll();
    this.timer = window.setInterval(() => void this.poll(), POLL_MS);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  private toggle() {
    if (!GameState.online)
      return toast(this.scene, "Chưa kết nối tài khoản online (mất mạng?) – kiểm tra mạng rồi tải lại trang để trò chuyện", COLORS.red);
    this.open = !this.open;
    if (this.open) {
      this.unread = 0;
      this.btn.setText("💬 Thu gọn");
      this.build();
    } else {
      this.panel?.destroy();
      this.panel = undefined;
      this.btn.setText("💬 Chat");
    }
  }

  private build() {
    const sc = this.scene;
    const c = sc.add.container(0, 0).setDepth(60);
    this.panel = c;
    const g = sc.add.graphics();
    g.fillStyle(0x071a33, 0.82).fillRoundedRect(X, Y, W, H, 14).lineStyle(3, COLORS.outline).strokeRoundedRect(X, Y, W, H, 14);
    // vùng chặn: bấm vào khung chat không bị tính là quăng/kéo cần
    const block = sc.add.zone(X + W / 2, Y + H / 2, W, H).setInteractive();
    const head = txt(sc, X + 14, Y + 14, "💬 Chat Thế Giới", 15, { color: COLORS.textGold }).setOrigin(0, 0.5);
    const all = txt(sc, X + W - 52, Y + 14, "Xem tất cả ›", 13, { weight: "700", color: "#80d8ff" }).setOrigin(1, 0.5);
    // nút thu gọn ngay trên khung
    const mini = new Button(sc, X + W - 20, Y + 16, 30, 26, "▾", { color: COLORS.panelLight, fontSize: 16, onClick: () => this.toggle() });
    all.setInteractive({ useHandCursor: true }).on("pointerup", () => openWorldChat(sc));
    this.log = sc.add.container(0, 0);
    c.add([block, g, head, all, mini, this.log]);
    const box = htmlOverlay(
      sc,
      c,
      X + 158,
      Y + H - 24,
      296,
      38,
      `<input id="fish-chat-input" maxlength="200" placeholder="Nói gì đó…" style="width:100%;height:100%;box-sizing:border-box;font:700 15px 'Baloo 2',sans-serif;padding:2px 10px;border-radius:10px;border:3px solid #1b1530;background:#fff8e1;color:#1b1530">`,
    );
    const input = box.querySelector("input") as HTMLInputElement;
    let sending = false;
    const send = async () => {
      const body = input.value.trim();
      if (!body || sending || !GameState.online) return;
      sending = true;
      try {
        await Social.sendWorld(GameState.online.id, body);
        input.value = "";
        void this.poll();
      } catch (e) {
        toast(sc, (e as Error).message, COLORS.red);
      } finally {
        sending = false;
      }
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") void send();
    });
    c.add(new Button(sc, X + W - 52, Y + H - 24, 84, 38, "Gửi", { color: COLORS.green, fontSize: 16, onClick: () => void send() }));
    this.drawLog();
  }

  private drawLog() {
    const sc = this.scene;
    const log = this.log;
    if (!log || !log.active) return;
    log.removeAll(true);
    const me = GameState.online?.id;
    const msgs = this.last.slice(-5);
    if (!msgs.length) log.add(txt(sc, X + 14, Y + 40, "Chưa có tin nhắn – chào mọi người đi! 👋", 13, { weight: "700", color: COLORS.textDim }));
    msgs.forEach((m, i) => {
      const line = `${m.name}: ${m.body}`;
      log.add(txt(sc, X + 14, Y + 34 + i * 23, line.length > 52 ? `${line.slice(0, 51)}…` : line, 13, { weight: "700", color: m.user_id === me ? "#80d8ff" : "#ffffff" }));
    });
  }

  private async poll() {
    if (this.busy || !GameState.online || document.visibilityState === "hidden") return;
    this.busy = true;
    try {
      const msgs = await Social.fetchWorld(12);
      if (!this.scene.scene.isActive()) return;
      const me = GameState.online?.id;
      for (const m of msgs) {
        if (this.seen.has(m.id)) continue;
        this.seen.add(m.id);
        if (!this.ready) continue;
        // người câu cùng khu nói → bong bóng trên đầu họ
        this.together?.say(m.user_id, m.body);
        if (!this.open && m.user_id !== me) this.unread++;
      }
      this.ready = true;
      this.last = msgs;
      if (this.open) this.drawLog();
      else this.btn.setText(this.unread ? `💬 Chat (${this.unread})` : "💬 Chat");
    } catch {
      /* thử lại sau */
    } finally {
      this.busy = false;
    }
  }

  destroy() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }
}
