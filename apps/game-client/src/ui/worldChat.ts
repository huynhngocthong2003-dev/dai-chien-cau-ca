import Phaser from "phaser";
import { TITLE_BY_ID } from "@dccc/game-data";
import { GameState } from "../state/GameState.ts";
import * as Social from "../state/social.ts";
import { Button, goTo, modal, toast, txt } from "./widgets.ts";
import { COLORS } from "./theme.ts";
import { htmlOverlay } from "./htmlOverlay.ts";
import { openPlayerProfile } from "./playerProfile.ts";

/** Kênh chat Thế Giới (mọi người chơi online), làm mới mỗi 4 giây. Bấm tên để xem trang cá nhân. */
export function openWorldChat(scene: Phaser.Scene) {
  if (!GameState.online) {
    const m = modal(scene, 620, 320, "🌍 Chat Thế Giới");
    m.root.add(txt(scene, 640, m.y + 140, "Đăng nhập tài khoản online để trò chuyện\ncùng mọi người chơi!", 20, { align: "center" }).setOrigin(0.5));
    m.root.add(new Button(scene, 640, m.y + 250, 260, 56, "👤 Đăng nhập", { color: COLORS.blue, fontSize: 22, onClick: () => goTo(scene, "Account") }));
    return;
  }
  const me = GameState.online.id;
  let timer: Phaser.Time.TimerEvent | null = null;
  const m = modal(scene, 940, 640, "🌍 Chat Thế Giới", () => timer?.remove());
  const X = m.x;
  const Y = m.y;
  m.root.add(txt(scene, X + m.w / 2, Y + 66, "Lịch sự & vui vẻ nhé! Bấm vào tên để xem trang cá nhân.", 14, { weight: "700", color: COLORS.textDim, align: "center" }).setOrigin(0.5));
  const list = scene.add.container(0, 0);
  m.root.add(list);
  const draw = (msgs: Social.WorldMessage[]) => {
    list.removeAll(true);
    if (!msgs.length) list.add(txt(scene, X + m.w / 2, Y + 300, "Chưa có ai nói gì… Hãy là người mở màn! 🎣", 18, { color: COLORS.textDim, align: "center" }).setOrigin(0.5));
    let y = Y + 548;
    for (let i = msgs.length - 1; i >= 0; i--) {
      const msg = msgs[i]!;
      const mine = msg.user_id === me;
      const t = TITLE_BY_ID.get(msg.title ?? "");
      const head = `${msg.name} · Lv.${msg.level}${t ? ` ${t.icon} ${t.name}` : ""}`;
      const body = txt(scene, 0, 0, msg.body, 16, { weight: "700", wrap: 760, color: "#ffffff" });
      const h = body.height + 34;
      y -= h + 6;
      if (y < Y + 86) {
        body.destroy();
        break;
      }
      const g = scene.add.graphics();
      g.fillStyle(mine ? 0x1e4d7a : 0x0a1628, 0.95).fillRoundedRect(X + 30, y, m.w - 60, h, 12);
      const time = new Date(msg.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      const name = txt(scene, X + 44, y + 14, head, 14, { color: mine ? "#80d8ff" : t?.color ?? COLORS.textGold }).setOrigin(0, 0.5);
      name.setInteractive({ useHandCursor: true }).on("pointerup", () => void openPlayerProfile(scene, msg.user_id));
      body.setPosition(X + 44, y + 26);
      list.add([g, name, body, txt(scene, X + m.w - 44, y + 14, time, 12, { weight: "700", color: COLORS.textDim }).setOrigin(1, 0.5)]);
    }
  };
  const refresh = async () => {
    try {
      const msgs = await Social.fetchWorld(40);
      if (m.root.active) draw(msgs);
    } catch (e) {
      toast(scene, (e as Error).message, COLORS.red);
    }
  };
  const box = htmlOverlay(
    scene,
    m.root,
    X + 360,
    Y + m.h - 44,
    660,
    48,
    `<input id="world-input" maxlength="200" placeholder="Nói gì đó với cả thế giới…" style="width:100%;height:100%;box-sizing:border-box;font:700 17px 'Baloo 2',sans-serif;padding:4px 12px;border-radius:12px;border:3px solid #1b1530;background:#fff8e1;color:#1b1530">`,
  );
  const input = box.querySelector("input") as HTMLInputElement;
  let sending = false;
  const send = async () => {
    const body = input.value.trim();
    if (!body || sending) return;
    sending = true;
    try {
      await Social.sendWorld(me, body);
      input.value = "";
      await refresh();
    } catch (e) {
      toast(scene, (e as Error).message, COLORS.red);
    } finally {
      sending = false;
    }
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") void send();
  });
  m.root.add(new Button(scene, X + m.w - 110, Y + m.h - 44, 160, 48, "Gửi ➤", { color: COLORS.green, fontSize: 20, onClick: () => void send() }));
  void refresh();
  timer = scene.time.addEvent({ delay: 4000, loop: true, callback: () => void refresh() });
}
