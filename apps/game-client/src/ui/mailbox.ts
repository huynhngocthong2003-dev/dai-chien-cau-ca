import Phaser from "phaser";
import * as Social from "../state/social.ts";
import { Button, modal, txt } from "./widgets.ts";
import { COLORS } from "./theme.ts";

/**
 * Hòm Thư: thư từ Ban Quản Trị (đền bù, thông báo). Mở thư nào thì đánh dấu đã đọc thư đó.
 * Thư chỉ để thông báo – phần thưởng đã được cộng thẳng vào tài khoản (có ghi sổ).
 */
export function openMailbox(scene: Phaser.Scene, mails: Social.SystemMail[], onChange?: () => void) {
  const m = modal(scene, 900, 560, "📬 Hòm Thư");
  m.root.setDepth(1500);
  const listX = m.x + 24;
  const listY = m.y + 76;
  const view = scene.add.container(0, 0);
  m.root.add(view);
  const show = (mail: Social.SystemMail) => {
    view.removeAll(true);
    const date = new Date(mail.created_at).toLocaleString("vi-VN");
    view.add(txt(scene, m.x + 300, listY, mail.title, 24, { color: COLORS.textGold, wrap: 570 }));
    view.add(txt(scene, m.x + 300, listY + 36, date, 14, { color: COLORS.textDim }));
    view.add(txt(scene, m.x + 300, listY + 64, mail.body, 18, { weight: "500", wrap: 570 }));
    if (!mail.read_at) {
      mail.read_at = new Date().toISOString();
      void Social.markMailRead(mail.id).catch(() => null);
      onChange?.();
      draw();
    }
  };
  const btns: Phaser.GameObjects.GameObject[] = [];
  const draw = () => {
    btns.forEach((b) => b.destroy());
    btns.length = 0;
    mails.slice(0, 7).forEach((mail, i) => {
      const b = new Button(scene, listX + 125, listY + 22 + i * 62, 250, 54, `${mail.read_at ? "✉️" : "🔴"} ${mail.title.length > 18 ? `${mail.title.slice(0, 17)}…` : mail.title}`, {
        color: mail.read_at ? COLORS.panelLight : COLORS.orange,
        fontSize: 16,
        onClick: () => show(mail),
      });
      m.root.add(b);
      btns.push(b);
    });
  };
  draw();
  if (mails.length) show(mails.find((x) => !x.read_at) ?? mails[0]!);
  else view.add(txt(scene, m.x + m.w / 2, m.y + m.h / 2, "Chưa có thư nào", 22, { color: COLORS.textDim }).setOrigin(0.5));
  return m;
}
