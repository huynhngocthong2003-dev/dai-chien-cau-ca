import Phaser from "phaser";
import {
  accountLevel,
  availableGifts,
  claimAllMailRewards,
  claimGiftByCode,
  claimGiftById,
  claimMailReward,
  claimTutorialReward,
  currentTutorialStep,
  deleteReadMails,
  isStepDone,
  isTutorialAllCompleted,
  listMails,
  markAsRead,
  potionsAvailable,
  resetTutorial,
  rewardText,
  skipTutorial,
  TUTORIAL_REWARD,
  TUTORIAL_STEPS,
  unclaimedCount,
  unreadCount,
} from "@hero-arena/core";
import { getSave, now, persist } from "../state.ts";
import { button, H, htmlInput, panel, text, toast, W } from "../ui.ts";
import { centerMenu } from "../layout.ts";

type Overlay = "gift" | "mail" | "tutorial" | null;

export class LobbyScene extends Phaser.Scene {
  private hud!: Phaser.GameObjects.Container;
  private overlay: Phaser.GameObjects.Container | null = null;
  private overlayKind: Overlay = null;
  private selectedMail: string | null = null;
  private codeInput: HTMLInputElement | null = null;

  constructor() {
    super("Lobby");
  }

  create(): void {
    this.overlay = null;
    this.overlayKind = null;
    const bg = this.add.image(W / 2, H / 2, "lobby_map");
    centerMenu(this, bg);
    this.add.rectangle(-W, -H, W * 3, H * 3, 0x05070c, 0.45).setOrigin(0);
    this.add.rectangle(-W, -H, 470 + W, H * 3, 0x05070c, 0.55).setOrigin(0);
    text(this, 40, 26, "HERO ARENA", 64, "#ffb347", 800);
    text(this, 44, 104, "Đấu trường sinh tồn 20 anh hùng · The Last Hero", 20, "#d8cfc0", 500);
    this.hud = this.add.container(0, 0).setDepth(10);
    this.drawHud();

    button(this, 235, 600, 360, 92, "⚔  VÀO TRẬN", () => this.scene.start("HeroSelect"), 0xc8461e, 38);
    const side = (y: number, label: string, kind: Exclude<Overlay, null>) => button(this, 1130, y, 230, 64, label, () => this.openOverlay(kind), 0x2f5f8f, 24);
    side(150, "🎁 Quà Tặng", "gift");
    side(235, "✉ Hòm Thư", "mail");
    side(320, "📘 Hướng Dẫn", "tutorial");
    button(this, 1130, 420, 230, 72, "👥 Vào phòng bạn", () => this.scene.start("Multiplayer", { auto: false }), 0xc8461e, 24);
  }

  private drawHud(): void {
    this.hud.removeAll(true);
    const s = getSave();
    const t = now();
    const lv = accountLevel(s.inventory.accountExp);
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.hud.add(o);
      return o;
    };
    add(panel(this, 30, 150, 410, 176));
    add(text(this, 52, 162, `Cấp tài khoản ${lv.level}`, 26, "#ffe08a"));
    const g = add(this.add.graphics());
    g.fillStyle(0x0b0f18, 1).fillRoundedRect(52, 200, 366, 14, 7);
    g.fillStyle(0x6ad06a, 1).fillRoundedRect(52, 200, Math.max(10, (366 * lv.into) / lv.need), 14, 7);
    add(text(this, 52, 220, `💰 ${s.inventory.gold.toLocaleString("vi-VN")} Vàng`, 24));
    add(text(this, 250, 220, `💎 ${s.inventory.gems} Ngọc`, 24, "#9ad8ff"));
    add(text(this, 52, 254, `🧪 Bình máu mang vào trận: ${potionsAvailable(s)}/3`, 20, "#ffb0c0", 500));
    add(text(this, 52, 284, `Trận ${s.stats.matches} · Thắng ${s.stats.wins} · Hạ gục ${s.stats.kills} · Hạng tốt nhất ${s.stats.bestPlacement || "–"}`, 18, "#c8c0b0", 500));

    // hướng dẫn hiện tại
    const step = currentTutorialStep(s);
    add(panel(this, 30, 344, 410, 180));
    if (step) {
      const idx = TUTORIAL_STEPS.findIndex((x) => x.id === step.id) + 1;
      add(text(this, 52, 356, `📘 Tân thủ ${idx}/${TUTORIAL_STEPS.length}: ${step.title}`, 21, "#ffe08a"));
      add(text(this, 52, 390, step.instruction, 18, "#e8e0d0", 500).setWordWrapWidth(370));
    } else if (isTutorialAllCompleted(s) && !s.tutorial.rewardClaimed) {
      add(text(this, 52, 356, "📘 Đã hoàn thành hướng dẫn!", 22, "#8aff9a"));
      add(text(this, 52, 390, `Mở Hướng Dẫn để nhận: ${rewardText(TUTORIAL_REWARD)}`, 18, "#e8e0d0", 500).setWordWrapWidth(370));
    } else {
      add(text(this, 52, 356, "Mẹo chiến đấu", 22, "#ffe08a"));
      add(text(this, 52, 390, "Di chuyển: WASD / cần ảo. Đánh: Space. Kỹ năng: Q E R F. Bình máu: H. 5 phút đầu được hồi sinh 1 lần (mất hết đồ & kinh nghiệm).", 18, "#e8e0d0", 500).setWordWrapWidth(370));
    }

    // huy hiệu
    const badge = (y: number, n: number) => {
      if (n <= 0) return;
      const c = add(this.add.circle(1240, y - 22, 15, 0xe03a3a).setStrokeStyle(2, 0x0b0f18));
      void c;
      add(text(this, 1240, y - 23, String(n), 18).setOrigin(0.5));
    };
    badge(150, availableGifts(s, t).length);
    badge(235, Math.max(unreadCount(s, t), unclaimedCount(s, t)));
    badge(320, isTutorialAllCompleted(s) && !s.tutorial.rewardClaimed ? 1 : 0);
  }

  private refresh(): void {
    persist();
    this.drawHud();
    if (this.overlayKind) this.openOverlay(this.overlayKind);
  }

  private closeOverlay(): void {
    this.overlay?.destroy();
    this.overlay = null;
    this.overlayKind = null;
    this.codeInput?.remove();
    this.codeInput = null;
  }

  private openOverlay(kind: Exclude<Overlay, null>): void {
    const keepCode = this.codeInput?.value ?? "";
    this.closeOverlay();
    this.overlayKind = kind;
    const c = this.add.container(0, 0).setDepth(100);
    this.overlay = c;
    const dim = this.add.rectangle(-W, -H, W * 3, H * 3, 0x000000, 0.6).setOrigin(0).setInteractive();
    c.add(dim);
    c.add(panel(this, 160, 60, 960, 600, 0.97));
    c.add(button(this, 1080, 96, 56, 48, "✕", () => this.closeOverlay(), 0x8a2a2a, 26).root);
    if (kind === "gift") this.buildGift(c, keepCode);
    else if (kind === "mail") this.buildMail(c);
    else this.buildTutorial(c);
  }

  private buildGift(c: Phaser.GameObjects.Container, keepCode: string): void {
    const s = getSave();
    const t = now();
    c.add(text(this, 200, 80, "🎁 QUÀ TẶNG", 36, "#ffb347", 800));
    const gifts = availableGifts(s, t);
    let y = 150;
    if (gifts.length === 0) c.add(text(this, 200, y, "Không còn quà nào để nhận. Hãy theo dõi sự kiện mới!", 22, "#c8c0b0", 500));
    for (const g of gifts) {
      c.add(text(this, 200, y, g.title, 26, "#ffe08a"));
      c.add(text(this, 200, y + 34, `${g.description}\n${rewardText(g.reward)}`, 19, "#e8e0d0", 500));
      c.add(
        button(this, 980, y + 40, 180, 56, "Nhận", () => {
          const r = claimGiftById(s, g.id, now());
          toast(this, r.message, r.success ? "#8aff9a" : "#ff9a8a", 690);
          this.refresh();
        }, 0x3a8a3a).root,
      );
      y += 110;
    }
    c.add(text(this, 200, 470, "Nhập mã quà tặng", 26, "#ffe08a"));
    c.add(text(this, 200, 506, "Mã không phân biệt chữ hoa/thường. Mỗi mã nhận 1 lần.", 18, "#c8c0b0", 500));
    this.codeInput = htmlInput(this, 200, 550, 520, "VD: HEROARENA2026");
    this.codeInput.value = keepCode;
    this.codeInput.id = "gift-code";
    c.add(
      button(this, 870, 574, 220, 60, "Đổi mã", () => {
        const r = claimGiftByCode(s, this.codeInput?.value ?? "", now());
        toast(this, r.message, r.success ? "#8aff9a" : "#ff9a8a", 690);
        if (r.success && this.codeInput) this.codeInput.value = "";
        this.refresh();
      }, 0xc8641e).root,
    );
  }

  private buildMail(c: Phaser.GameObjects.Container): void {
    const s = getSave();
    const t = now();
    c.add(text(this, 200, 80, "✉ HÒM THƯ", 36, "#ffb347", 800));
    const mails = listMails(s, t);
    if (!this.selectedMail || !mails.some((m) => m.id === this.selectedMail)) this.selectedMail = mails[0]?.id ?? null;
    if (this.selectedMail && markAsRead(s, this.selectedMail)) persist();
    let y = 150;
    for (const m of mails.slice(0, 6)) {
      const sel = m.id === this.selectedMail;
      const row = this.add.rectangle(190, y, 380, 62, sel ? 0x2f4a6a : 0x1f2838, 1).setOrigin(0).setStrokeStyle(2, sel ? 0xffb347 : 0x3a4458);
      row.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
        this.selectedMail = m.id;
        this.refresh();
      });
      c.add(row);
      c.add(text(this, 204, y + 6, `${m.isRead ? "" : "● "}${m.title}`, 19, m.isRead ? "#c8c0b0" : "#ffe08a"));
      c.add(text(this, 204, y + 34, `${m.sender}${m.reward ? (m.isClaimed ? " · đã nhận quà" : " · 🎁 có quà") : ""}`, 15, "#a8a090", 500));
      y += 72;
    }
    if (mails.length === 0) c.add(text(this, 200, 160, "Hòm thư trống.", 22, "#c8c0b0", 500));
    const m = mails.find((x) => x.id === this.selectedMail);
    if (m) {
      const days = Math.max(0, Math.ceil((m.expiresAt - t) / 86400000));
      c.add(text(this, 600, 150, m.title, 26, "#ffe08a").setWordWrapWidth(480));
      c.add(text(this, 600, 190, `Từ: ${m.sender} · còn ${days} ngày`, 17, "#a8a090", 500));
      c.add(text(this, 600, 225, m.body, 19, "#e8e0d0", 500).setWordWrapWidth(480));
      if (m.reward) {
        c.add(text(this, 600, 430, `Quà: ${rewardText(m.reward)}`, 20, "#8aff9a").setWordWrapWidth(480));
        const b = button(this, 720, 500, 220, 56, m.isClaimed ? "Đã nhận" : "Nhận quà", () => {
          const r = claimMailReward(s, m.id, now());
          toast(this, r.message, r.success ? "#8aff9a" : "#ff9a8a", 690);
          this.refresh();
        }, 0x3a8a3a);
        b.setEnabled(!m.isClaimed);
        c.add(b.root);
      }
    }
    c.add(
      button(this, 330, 610, 240, 52, "Nhận tất cả", () => {
        const r = claimAllMailRewards(s, now());
        toast(this, r.claimedCount > 0 ? `Đã nhận quà từ ${r.claimedCount} thư` : "Không còn quà để nhận", undefined, 690);
        this.refresh();
      }, 0x3a8a3a, 22).root,
    );
    c.add(
      button(this, 600, 610, 260, 52, "Xóa thư đã đọc", () => {
        const n = deleteReadMails(s, now());
        toast(this, n > 0 ? `Đã xóa ${n} thư` : "Không có thư nào để xóa", undefined, 690);
        this.selectedMail = null;
        this.refresh();
      }, 0x6a4a3a, 22).root,
    );
  }

  private buildTutorial(c: Phaser.GameObjects.Container): void {
    const s = getSave();
    c.add(text(this, 200, 80, "📘 HƯỚNG DẪN TÂN THỦ", 36, "#ffb347", 800));
    let y = 146;
    TUTORIAL_STEPS.forEach((st, i) => {
      const done = isStepDone(s, st.id);
      c.add(text(this, 200, y, `${done ? "✅" : "⬜"} ${i + 1}. ${st.title}`, 22, done ? "#8aff9a" : "#ffe08a"));
      c.add(text(this, 250, y + 30, st.instruction, 17, "#d8d0c0", 500).setWordWrapWidth(820));
      y += 68;
    });
    const status = s.tutorial.skipped ? "Đã bỏ qua hướng dẫn (không có thưởng)." : `Thưởng hoàn thành: ${rewardText(TUTORIAL_REWARD)}`;
    c.add(text(this, 200, 560, status, 19, "#c8c0b0", 500));
    const claim = button(this, 330, 620, 240, 52, s.tutorial.rewardClaimed ? "Đã nhận thưởng" : "Nhận thưởng", () => {
      const r = claimTutorialReward(s, now());
      toast(this, r.message, r.success ? "#8aff9a" : "#ff9a8a", 690);
      this.refresh();
    }, 0x3a8a3a, 22);
    claim.setEnabled(isTutorialAllCompleted(s) && !s.tutorial.rewardClaimed);
    c.add(claim.root);
    const skip = button(this, 600, 620, 240, 52, "Bỏ qua", () => {
      skipTutorial(s);
      this.refresh();
    }, 0x6a4a3a, 22);
    skip.setEnabled(!s.tutorial.skipped && !isTutorialAllCompleted(s));
    c.add(skip.root);
    c.add(
      button(this, 870, 620, 240, 52, "Xem lại từ đầu", () => {
        resetTutorial(s);
        toast(this, "Đã bắt đầu lại hướng dẫn", undefined, 690);
        this.refresh();
      }, 0x2f5f8f, 22).root,
    );
  }
}
