import Phaser from "phaser";
import { TOPUP_BANK } from "@dccc/game-config";
import { TOPUP_PACKAGES } from "@dccc/game-data";
import { vietQrUrl } from "@dccc/shared";
import { GameState } from "../state/GameState.ts";
import * as Social from "../state/social.ts";
import { Button, fadeIn, goTo, panel, toast, txt } from "../ui/widgets.ts";
import { TopBar } from "../ui/TopBar.ts";
import { COLORS } from "../ui/theme.ts";
import { menuBackdrop } from "../ui/backdrop.ts";
import { htmlOverlay } from "../ui/htmlOverlay.ts";
import { Sfx } from "../audio/Sfx.ts";

const STATUS: Record<Social.TopupOrder["status"], [string, string]> = {
  pending: ["⏳ Chờ duyệt", "#ffd54f"],
  approved: ["✅ Đã duyệt – bấm Nhận", "#69f0ae"],
  claimed: ["✔ Đã nhận", "#80d8ff"],
  rejected: ["✖ Từ chối", "#ff8a80"],
  cancelled: ["Đã huỷ", "#90a4ae"],
};
const vnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`;
const pkgName = (id: string) => TOPUP_PACKAGES.find((p) => p.id === id)?.name ?? id;

/** Nạp kim cương / gói câu tự động bằng chuyển khoản – chủ dự án đối soát và duyệt. */
export class TopupScene extends Phaser.Scene {
  private body?: Phaser.GameObjects.Container;
  private tab: "buy" | "admin" = "buy";
  private admin = false;
  private current: { code: string; amount_vnd: number; pkg: string } | null = null;
  private busy = false;

  constructor() {
    super("Topup");
  }

  create() {
    this.input.enabled = true;
    this.current = null;
    fadeIn(this);
    menuBackdrop(this);
    new TopBar(this, { title: "Nạp Kim Cương", onBack: () => goTo(this, "Hub") });
    void this.refresh();
  }

  private frame() {
    this.body?.destroy(true);
    const c = this.add.container(0, 0);
    this.body = c;
    return c;
  }

  private async run(fn: () => Promise<unknown>) {
    if (this.busy) return;
    this.busy = true;
    try {
      await fn();
    } catch (e) {
      toast(this, (e as Error).message, COLORS.red);
    } finally {
      this.busy = false;
    }
  }

  private async refresh() {
    const c = this.frame();
    if (!GameState.online) {
      c.add(panel(this, 240, 160, 800, 440, 0.92));
      c.add(txt(this, 640, 320, "Đăng nhập tài khoản online để nạp.\nKim cương và gói câu tự động được cộng vào tài khoản,\nchơi trên máy nào cũng có.", 22, { align: "center" }).setOrigin(0.5));
      c.add(new Button(this, 640, 470, 300, 64, "👤 Đăng nhập", { color: COLORS.blue, fontSize: 24, onClick: () => goTo(this, "Account") }));
      return;
    }
    c.add(txt(this, 640, 400, "Đang tải…", 24, { align: "center" }).setOrigin(0.5));
    try {
      const [orders, admin] = await Promise.all([Social.myTopups(), Social.isAdmin().catch(() => false)]);
      this.admin = admin;
      if (!this.scene.isActive()) return;
      if (this.tab === "admin" && admin) await this.renderAdmin();
      else this.renderBuy(orders);
    } catch (e) {
      if (this.scene.isActive()) {
        const cc = this.frame();
        cc.add(txt(this, 640, 400, `Không tải được: ${(e as Error).message}`, 22, { align: "center", color: "#ff8a80", wrap: 1100 }).setOrigin(0.5));
      }
    }
  }

  private tabs(c: Phaser.GameObjects.Container) {
    if (!this.admin) return;
    c.add(new Button(this, 1120, 118, 220, 46, this.tab === "admin" ? "💳 Trang nạp" : "🛠 Duyệt nạp", { color: COLORS.purple, fontSize: 19, onClick: () => ((this.tab = this.tab === "admin" ? "buy" : "admin"), void this.refresh()) }));
  }

  private renderBuy(orders: Social.TopupOrder[]) {
    const c = this.frame();
    this.tabs(c);
    // gói nạp
    c.add(panel(this, 20, 92, 600, 614, 0.92));
    c.add(txt(this, 320, 124, "1. Chọn gói", 24, { color: COLORS.textGold, align: "center" }).setOrigin(0.5));
    TOPUP_PACKAGES.forEach((p, i) => {
      const y = 156 + i * 118;
      const sel = this.current?.pkg === p.id;
      const g = this.add.graphics();
      g.fillGradientStyle(0x1a3d66, 0x1a3d66, 0x0d2340, 0x0d2340, 1).fillRoundedRect(40, y, 560, 106, 16);
      g.lineStyle(sel ? 5 : 3, sel ? 0xffeb3b : 0x40c4ff).strokeRoundedRect(40, y, 560, 106, 16);
      c.add(g);
      c.add(this.add.text(96, y + 53, p.icon, { fontSize: "54px", padding: { top: 10 } }).setOrigin(0.5));
      c.add(txt(this, 146, y + 34, p.name, 24).setOrigin(0, 0.5));
      c.add(txt(this, 146, y + 72, p.autoFishHours ? "Nút 🤖 Tự động khi câu cá trong 48 giờ" : "Cộng thẳng vào tài khoản", 15, { weight: "700", color: COLORS.textDim }).setOrigin(0, 0.5));
      c.add(
        new Button(this, 520, y + 53, 140, 56, vnd(p.vnd), {
          color: COLORS.orange,
          fontSize: 20,
          onClick: () =>
            void this.run(async () => {
              const o = await Social.createTopup(p.id);
              this.current = { code: o.code, amount_vnd: o.amount_vnd, pkg: p.id };
              Sfx.click();
              await this.refresh();
            }),
        }),
      );
    });
    const left = GameState.save.autoFishUntil - Date.now();
    c.add(txt(this, 320, 530, left > 0 ? `🤖 Câu tự động còn ${Math.ceil(left / 3600_000)} giờ` : "🤖 Chưa có gói câu tự động", 18, { align: "center", color: left > 0 ? "#69f0ae" : COLORS.textDim }).setOrigin(0.5));
    c.add(txt(this, 320, 610, "Sau khi chuyển khoản, chủ game kiểm tra và duyệt\n(thường trong ngày). Bấm \"Kiểm tra & nhận\" để cộng.\nGiữ nguyên NỘI DUNG chuyển khoản để được duyệt nhanh.", 15, { align: "center", weight: "700", color: COLORS.textDim }).setOrigin(0.5));

    // QR + lệnh
    c.add(panel(this, 636, 140, 628, 566, 0.92));
    if (this.current) {
      const cur = this.current;
      c.add(txt(this, 950, 170, "2. Quét mã để chuyển khoản", 22, { color: COLORS.textGold, align: "center" }).setOrigin(0.5));
      const qr = htmlOverlay(this, c, 780, 340, 260, 300, `<img alt="Mã QR chuyển khoản" style="width:100%;height:100%;object-fit:contain;border-radius:12px;background:#fff" src="${vietQrUrl(TOPUP_BANK, cur.amount_vnd, cur.code)}">`);
      qr.style.pointerEvents = "none";
      const info = [
        `Ngân hàng: ${TOPUP_BANK.bankName}`,
        `Số TK: ${TOPUP_BANK.account}`,
        `Chủ TK: ${TOPUP_BANK.accountName}`,
        `Số tiền: ${vnd(cur.amount_vnd)}`,
      ].join("\n");
      c.add(txt(this, 930, 220, info, 17, { weight: "700", wrap: 320 }).setLineSpacing(4));
      c.add(txt(this, 930, 352, "Nội dung chuyển khoản:", 17, { weight: "700", color: "#ff8a80" }));
      c.add(txt(this, 930, 380, cur.code, 34, { color: "#ffeb3b" }));
      c.add(
        new Button(this, 1080, 452, 300, 48, "📋 Sao chép nội dung", {
          color: COLORS.blue,
          fontSize: 18,
          onClick: () => {
            void navigator.clipboard?.writeText(cur.code).then(
              () => toast(this, "Đã sao chép nội dung chuyển khoản", COLORS.green),
              () => toast(this, `Nội dung: ${cur.code}`),
            );
          },
        }),
      );
    } else {
      c.add(txt(this, 950, 300, "Chọn một gói ở bên trái để tạo\nmã QR chuyển khoản riêng cho bạn.", 20, { align: "center" }).setOrigin(0.5));
    }
    // lệnh của tôi
    c.add(txt(this, 656, 512, "Lệnh nạp gần đây", 18, { color: COLORS.textGold }));
    orders.slice(0, 3).forEach((o, i) => {
      const y = 552 + i * 40;
      const [label, col] = STATUS[o.status];
      c.add(txt(this, 656, y, `${o.code} · ${pkgName(o.package)} · ${vnd(o.amount_vnd)}`, 15, { weight: "700" }).setOrigin(0, 0.5));
      c.add(txt(this, 1010, y, label, 15, { color: col }).setOrigin(0, 0.5));
      if (o.status === "pending")
        c.add(new Button(this, 1215, y, 70, 32, "Huỷ", { color: COLORS.grey, fontSize: 14, onClick: () => void this.run(async () => (await Social.cancelTopup(o.id), await this.refresh())) }));
    });
    if (!orders.length) c.add(txt(this, 656, 560, "Chưa có lệnh nào", 15, { weight: "700", color: COLORS.textDim }).setOrigin(0, 0.5));
    c.add(
      new Button(this, 1130, 512, 230, 44, "🔄 Kiểm tra & nhận", {
        color: COLORS.green,
        fontSize: 18,
        onClick: () =>
          void this.run(async () => {
            const got = await GameState.claimTopups();
            if (got.length) {
              Sfx.catchFanfare(true);
              this.cameras.main.flash(400, 120, 220, 255);
              toast(this, `🎉 Đã nhận: ${got.map((p) => p.name).join(", ")}. Cảm ơn bạn đã ủng hộ!`, COLORS.green);
            } else toast(this, "Chưa có lệnh nào được duyệt. Vui lòng chờ chủ game kiểm tra.");
            await this.refresh();
          }),
      }),
    );
  }

  private async renderAdmin() {
    const list = await Social.adminListTopups("pending");
    if (!this.scene.isActive()) return;
    const c = this.frame();
    this.tabs(c);
    c.add(panel(this, 20, 150, 1240, 556, 0.92));
    c.add(txt(this, 40, 180, `🛠 Lệnh chờ duyệt (${list.length}) – chỉ duyệt khi sao kê ngân hàng có đúng số tiền + nội dung`, 19, { color: COLORS.textGold }).setOrigin(0, 0.5));
    if (!list.length) c.add(txt(this, 640, 420, "Không có lệnh nào đang chờ.", 22, { align: "center" }).setOrigin(0.5));
    list.slice(0, 7).forEach((o, i) => {
      const y = 214 + i * 66;
      const g = this.add.graphics();
      g.fillStyle(0x0a1628, 0.95).fillRoundedRect(40, y, 1200, 58, 12);
      c.add(g);
      c.add(txt(this, 56, y + 18, `${o.code}  ·  ${vnd(o.amount_vnd)}  ·  ${pkgName(o.package)}`, 19, { color: "#ffeb3b" }).setOrigin(0, 0.5));
      c.add(txt(this, 56, y + 42, `Người chơi: ${o.player_name || "(chưa đặt tên)"} · ${new Date(o.created_at).toLocaleString("vi-VN")}`, 14, { weight: "700", color: COLORS.textDim }).setOrigin(0, 0.5));
      let armed = false;
      const ok = new Button(this, 1010, y + 29, 160, 44, "✅ Duyệt", {
        color: COLORS.green,
        fontSize: 18,
        onClick: () => {
          if (!armed) {
            armed = true;
            ok.setText("Chắc chắn?");
            return;
          }
          void this.run(async () => (await Social.adminDecideTopup(o.id, true), toast(this, `Đã duyệt ${o.code}`, COLORS.green), await this.refresh()));
        },
      });
      c.add(ok);
      c.add(new Button(this, 1170, y + 29, 120, 44, "✖ Từ chối", { color: COLORS.red, fontSize: 16, onClick: () => void this.run(async () => (await Social.adminDecideTopup(o.id, false), await this.refresh())) }));
    });
  }
}
