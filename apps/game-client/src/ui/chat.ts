import Phaser from "phaser";
import { GameState } from "../state/GameState.ts";
import * as Social from "../state/social.ts";
import { Button, goTo, modal, toast, txt } from "./widgets.ts";
import { COLORS } from "./theme.ts";
import { htmlOverlay } from "./htmlOverlay.ts";

/** Khung chat 1–1 (làm mới mỗi 4 giây khi đang mở). */
export function openChat(scene: Phaser.Scene, other: { user_id: string; display_name: string }) {
  const me = GameState.online?.id;
  if (!me) return toast(scene, "Đăng nhập tài khoản online để nhắn tin");
  let timer: Phaser.Time.TimerEvent | null = null;
  const m = modal(scene, 760, 600, `💬 ${other.display_name}`, () => timer?.remove());
  const list = scene.add.container(0, 0);
  m.root.add(list);
  const X = m.x;
  const Y = m.y;
  const draw = (msgs: Social.ChatMessage[]) => {
    list.removeAll(true);
    if (!msgs.length) list.add(txt(scene, X + m.w / 2, Y + 260, "Chưa có tin nhắn. Gửi lời chào nhé! 👋", 18, { color: COLORS.textDim, align: "center" }).setOrigin(0.5));
    // xếp từ dưới lên, tối đa vừa khung
    let y = Y + 470;
    for (let i = msgs.length - 1; i >= 0 && y > Y + 80; i--) {
      const msg = msgs[i]!;
      const mine = msg.sender === me;
      // lời mời đua cá: ẩn thẻ máy, thêm nút "Vào phòng"
      const invite = /\[DCCC-RACE:([A-Z0-9]{6})\]/.exec(msg.body);
      const bodyText = invite ? msg.body.replace(invite[0], "").trim() : msg.body;
      const t = txt(scene, 0, 0, bodyText, 16, { weight: "700", wrap: 420, color: mine ? "#1b1530" : "#ffffff", stroke: 0, shadow: false });
      const w = Math.min(450, t.width + 24);
      const h = t.height + 30 + (invite && !mine ? 50 : 0);
      y -= h + 8;
      if (y < Y + 70) {
        t.destroy();
        break;
      }
      const bx = mine ? X + m.w - 30 - w : X + 30;
      const g = scene.add.graphics();
      g.fillStyle(mine ? 0x80d8ff : 0x37474f, 1).fillRoundedRect(bx, y, w, h, 14);
      t.setPosition(bx + 12, y + 8);
      const time = new Date(msg.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      const meta = txt(scene, mine ? bx + w - 10 : bx + 12, y + h - 12, `${time}${mine && msg.read_at ? " · đã xem" : ""}`, 11, { weight: "700", color: mine ? "#37474f" : "#b0bec5", stroke: 0, shadow: false }).setOrigin(mine ? 1 : 0, 0.5);
      list.add([g, t, meta]);
      if (invite && !mine) {
        list.add(
          new Button(scene, bx + 110, y + h - 40, 190, 42, "🏁 Vào phòng", {
            color: COLORS.green,
            fontSize: 18,
            onClick: () => {
              m.close();
              goTo(scene, "Race", { joinCode: invite[1] });
            },
          }),
        );
        meta.setY(y + h - 64);
      }
    }
  };
  const refresh = async () => {
    try {
      const msgs = await Social.fetchChat(me, other.user_id);
      if (!m.root.active) return;
      draw(msgs);
      if (msgs.some((x) => x.recipient === me && !x.read_at)) void Social.markRead(other.user_id).catch(() => null);
    } catch (e) {
      toast(scene, (e as Error).message, COLORS.red);
    }
  };
  const box = htmlOverlay(
    scene,
    m.root,
    X + 300,
    Y + m.h - 48,
    520,
    48,
    `<input id="chat-input" maxlength="300" placeholder="Nhập tin nhắn…" style="width:100%;height:100%;box-sizing:border-box;font:700 17px 'Baloo 2',sans-serif;padding:4px 12px;border-radius:12px;border:3px solid #1b1530;background:#fff8e1;color:#1b1530">`,
  );
  const input = box.querySelector("input") as HTMLInputElement;
  let sending = false;
  const send = async () => {
    const body = input.value.trim();
    if (!body || sending) return;
    sending = true;
    try {
      await Social.sendMessage(me, other.user_id, body);
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
  m.root.add(new Button(scene, X + m.w - 100, Y + m.h - 48, 150, 48, "Gửi ➤", { color: COLORS.green, fontSize: 20, onClick: () => void send() }));
  void refresh();
  timer = scene.time.addEvent({ delay: 4000, loop: true, callback: () => void refresh() });
  return m;
}
