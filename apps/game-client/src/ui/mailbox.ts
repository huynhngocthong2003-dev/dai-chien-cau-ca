import Phaser from "phaser";
import { EVO_ITEM_BY_ID, FISH_BY_ID, FORM_BY_ID } from "@dccc/game-data";
import { mailRewardClaimed, mailRewardEmpty, type MailReward } from "@dccc/shared";
import * as Social from "../state/social.ts";
import { GameState } from "../state/GameState.ts";
import { Sfx } from "../audio/Sfx.ts";
import { fishTextureFor } from "../art/textures.ts";
import { Button, formatNum, modal, toast, txt } from "./widgets.ts";
import { COLORS } from "./theme.ts";

/** Dòng mô tả quà. */
function rewardLines(r: MailReward): string[] {
  const out: string[] = [];
  if (r.gold) out.push(`🪙 ${formatNum(r.gold)} vàng`);
  if (r.diamonds) out.push(`💎 ${formatNum(r.diamonds)} kim cương`);
  if (r.stones) out.push(`🔷 ${formatNum(r.stones)} Đá Nâng Cấp`);
  if (r.soul) out.push(`🔮 ${formatNum(r.soul)} Mảnh Linh Hồn`);
  for (const [id, n] of Object.entries(r.evoItems ?? {})) {
    const it = EVO_ITEM_BY_ID.get(id);
    if (it) out.push(`${it.icon} ${n} ${it.name}`);
  }
  for (const f of r.fishes ?? []) {
    const d = FISH_BY_ID.get(f.fishId);
    const form = f.form ? FORM_BY_ID.get(f.form) : null;
    if (d) out.push(`🐟 ${d.name}${form ? ` (thể ${form.name})` : ""} · ${f.weightKg} kg`);
  }
  return out;
}

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
    const body = txt(scene, m.x + 300, listY + 64, mail.body, 17, { weight: "500", wrap: 570 });
    view.add(body);
    const r = mail.rewards;
    if (r && !mailRewardEmpty(r)) {
      const y0 = Math.min(listY + 64 + body.height + 14, m.y + m.h - 190);
      const g = scene.add.graphics();
      g.fillStyle(0x0d2b45, 0.9).fillRoundedRect(m.x + 290, y0, 590, 168, 14).lineStyle(2, 0xffd54f, 0.9).strokeRoundedRect(m.x + 290, y0, 590, 168, 14);
      view.add(g);
      view.add(txt(scene, m.x + 306, y0 + 10, "🎁 QUÀ ĐÍNH KÈM", 18, { color: COLORS.textGold }));
      view.add(txt(scene, m.x + 306, y0 + 38, rewardLines(r).join("\n"), 16, { weight: "700", wrap: 380 }).setLineSpacing(2));
      const f0 = r.fishes?.[0];
      const fd = f0 ? FISH_BY_ID.get(f0.fishId) : undefined;
      if (fd) view.add(scene.add.image(m.x + 800, y0 + 70, fishTextureFor(scene, fd, f0!.form ?? null)).setDisplaySize(140, 88));
      const claimed = !!mail.claimed_at || mailRewardClaimed(GameState.save, r);
      const btn = new Button(scene, m.x + 800, y0 + 138, 150, 44, claimed ? "✔ Đã nhận" : "🎁 Nhận quà", {
        color: claimed ? COLORS.panelLight : COLORS.green,
        fontSize: 18,
        disabled: claimed,
        onClick: () => {
          btn.setDisabled(true);
          void GameState.claimMail(mail.id, r).then((res) => {
            if (!res.ok) {
              toast(scene, res.error, COLORS.red);
              btn.setDisabled(false);
              return;
            }
            mail.claimed_at = new Date().toISOString();
            if (!res.already) Sfx.coin();
            toast(scene, res.already ? "Quà này đã được nhận trước đó" : "🎁 Đã nhận quà vào tài khoản!", COLORS.green);
            onChange?.();
            draw();
            show(mail);
          });
        },
      });
      btn.on("disabled-click", () => toast(scene, "Bạn đã nhận quà này rồi"));
      view.add(btn);
    }
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
      const gift = mail.rewards && !mailRewardEmpty(mail.rewards) && !mail.claimed_at && !mailRewardClaimed(GameState.save, mail.rewards);
      const b = new Button(scene, listX + 125, listY + 22 + i * 62, 250, 54, `${gift ? "🎁" : mail.read_at ? "✉️" : "🔴"} ${mail.title.length > 18 ? `${mail.title.slice(0, 17)}…` : mail.title}`, {
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
