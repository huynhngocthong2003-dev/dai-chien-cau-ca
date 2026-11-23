import Phaser from "phaser";
import { FISH_BY_ID } from "@dccc/game-data";
import type { OwnedFish } from "@dccc/shared";
import { GameState } from "../state/GameState.ts";
import { pvpCall, serverTime, type PvpRoom } from "../state/pvp.ts";
import { Button, fadeIn, goTo, panel, toast, txt } from "../ui/widgets.ts";
import { TopBar } from "../ui/TopBar.ts";
import { COLORS } from "../ui/theme.ts";
import { menuBackdrop } from "../ui/backdrop.ts";
import { fishPickCard, fishPower } from "../ui/fishPickCard.ts";
import { Sfx } from "../audio/Sfx.ts";

const POLL_MS = 1000;

/**
 * PHÒNG ĐẤU VỚI NGƯỜI: chờ đối thủ (60 giây) → chọn 3 cá BÍ MẬT (30 giây, máy chủ giữ kín) → vào trận 3vs3.
 * Đồng hồ đếm theo giờ máy chủ; mọi chuyển trạng thái do máy chủ quyết định.
 */
export class PvpRoomScene extends Phaser.Scene {
  private room!: PvpRoom;
  private inviteeName: string | null = null;
  private team: string[] = [];
  private page = 0;
  private body?: Phaser.GameObjects.Container;
  private clock?: Phaser.GameObjects.Text;
  private oppT?: Phaser.GameObjects.Text;
  private lastKey = "";
  private polling = false;
  private sending = false;
  private left = false;

  constructor() {
    super("PvpRoom");
  }

  init(data: { room: PvpRoom; inviteeName?: string | null }) {
    this.room = data.room;
    this.inviteeName = data.inviteeName ?? null;
    this.team = [];
    this.page = 0;
    this.lastKey = "";
    this.polling = false;
    this.sending = false;
    this.left = false;
  }

  create() {
    fadeIn(this);
    menuBackdrop(this);
    new TopBar(this, { title: "Phòng Đấu 3vs3", onBack: () => void this.leave() });
    this.render();
    this.time.addEvent({ delay: POLL_MS, loop: true, callback: () => void this.poll() });
    this.time.addEvent({ delay: 250, loop: true, callback: () => this.tickClock() });
  }

  /** Hỏi máy chủ trạng thái phòng (giữ kết nối lại khi mạng chập chờn). */
  private async poll() {
    if (this.polling || this.left) return;
    this.polling = true;
    try {
      const r = await pvpCall({ op: "get", id: this.room.id });
      if (this.left || !this.scene.isActive()) return;
      this.room = r;
      this.render();
    } catch {
      /* thử lại ở nhịp sau */
    } finally {
      this.polling = false;
    }
  }

  private async leave() {
    if (this.left) return;
    this.left = true;
    if (this.room.status === "waiting" || this.room.status === "picking") await pvpCall({ op: "leave", id: this.room.id }).catch(() => null);
    goTo(this, "DeathMatch", { mode: "pvp" });
  }

  private tickClock() {
    if (!this.clock) return;
    const r = this.room;
    const until = r.status === "waiting" ? r.expiresAt : r.status === "picking" ? r.pickDeadline : null;
    if (!until) return;
    const s = Math.max(0, Math.ceil((Date.parse(until) - serverTime()) / 1000));
    this.clock.setText(`⏱ ${s}s`).setColor(s <= 10 ? "#ff8a80" : "#fff59d");
  }

  private render() {
    const r = this.room;
    // chỉ vẽ lại khi trạng thái hiển thị đổi (tránh nhấp nháy mỗi giây)
    const key = `${r.status}|${r.oppName}|${r.oppPicked}|${r.myTeam?.join(",")}|${this.team.join(",")}|${this.page}`;
    if (key === this.lastKey) return;
    this.lastKey = key;
    if (r.status === "fighting" || r.status === "done") {
      this.left = true;
      Sfx.levelUp();
      goTo(this, "Combat3", { team: r.myTeam ?? [], pvp: { id: r.id, oppName: r.oppName ?? "Đối thủ", stake: r.stake } });
      return;
    }
    this.body?.destroy(true);
    const c = this.add.container(0, 0);
    this.body = c;
    this.clock = undefined;
    const stakeTxt = r.stake === "death" ? "💀 Sinh tử – thua mất cá lực chiến thấp nhất" : "🤝 Giao hữu – không mất cá";
    if (r.status === "cancelled") {
      c.add(panel(this, 290, 180, 700, 420, 0.95));
      c.add(txt(this, 640, 250, "Phòng đã huỷ", 34, { color: "#ff8a80", align: "center" }).setOrigin(0.5));
      c.add(txt(this, 640, 360, r.cancelReason ?? "", 22, { align: "center", weight: "700", wrap: 620 }).setOrigin(0.5));
      c.add(new Button(this, 640, 520, 280, 64, "← Về sảnh đấu", { color: COLORS.blue, fontSize: 24, onClick: () => goTo(this, "DeathMatch", { mode: "pvp" }) }));
      this.left = true;
      return;
    }
    if (r.status === "waiting") {
      c.add(panel(this, 240, 150, 800, 520, 0.95));
      c.add(txt(this, 640, 200, this.inviteeName ? `Đang chờ ${this.inviteeName} nhận lời mời…` : "Đang chờ đối thủ vào phòng…", 28, { color: COLORS.textGold, align: "center" }).setOrigin(0.5));
      c.add(txt(this, 640, 270, "MÃ PHÒNG", 20, { color: COLORS.textDim, align: "center" }).setOrigin(0.5));
      const code = txt(this, 640, 340, r.code.split("").join(" "), 64, { color: "#fff59d", align: "center" }).setOrigin(0.5);
      this.tweens.add({ targets: code, scale: 1.06, duration: 700, yoyo: true, repeat: -1 });
      c.add(code);
      c.add(
        new Button(this, 640, 420, 240, 48, "📋 Chép mã", {
          color: COLORS.purple,
          fontSize: 20,
          onClick: () => {
            void navigator.clipboard?.writeText(r.code).then(
              () => toast(this, "Đã chép mã phòng", COLORS.green),
              () => toast(this, `Mã phòng: ${r.code}`),
            );
          },
        }),
      );
      c.add(txt(this, 640, 480, stakeTxt, 19, { align: "center", weight: "700", color: r.stake === "death" ? "#ff8a80" : "#b9f6ca" }).setOrigin(0.5));
      this.clock = txt(this, 640, 540, "", 30, { align: "center" }).setOrigin(0.5);
      c.add(this.clock);
      c.add(new Button(this, 640, 615, 260, 58, "✕ Huỷ phòng", { color: COLORS.red, fontSize: 22, onClick: () => void this.leave() }));
      this.tickClock();
      return;
    }
    // ---- chọn đội bí mật
    const picked = !!r.myTeam;
    c.add(txt(this, 20, 92, `⚔ Đối thủ: ${r.oppName ?? "?"}   ·   ${stakeTxt}`, 20, { weight: "700", color: COLORS.textGold }));
    this.clock = txt(this, 1260, 104, "", 30, { align: "right" }).setOrigin(1, 0.5);
    c.add(this.clock);
    this.oppT = txt(this, 1058, 160, r.oppPicked ? "Đối thủ: ĐÃ CHỐT ĐỘI ✓" : "Đối thủ: đang chọn… 🤔", 20, { align: "center", color: r.oppPicked ? "#b9f6ca" : "#ffe0b2" }).setOrigin(0.5);
    c.add(panel(this, 852, 130, 412, 576, 0.95));
    c.add(this.oppT);
    const info = [
      "Đội hình được GIỮ KÍN – đối thủ chỉ thấy",
      "khi trận bắt đầu.",
      "",
      "• Chọn 3 cá theo thứ tự xuất trận",
      "• Hết giờ chưa chốt đủ → huỷ trận",
      "• Cá khoá 🔒 không được ra trận",
      r.stake === "death" ? "• THUA: mất con lực chiến THẤP NHẤT" : "• Giao hữu: không mất cá",
    ];
    c.add(txt(this, 872, 196, info.join("\n"), 16, { weight: "700", wrap: 372 }).setLineSpacing(5));
    if (picked) {
      c.add(txt(this, 420, 300, "✅ Đã chốt đội!\nĐang chờ đối thủ…", 32, { align: "center", color: "#b9f6ca" }).setOrigin(0.5));
      (r.myTeam ?? []).forEach((uid, i) => {
        const o = GameState.save.fishes.find((f) => f.uid === uid);
        if (o) fishPickCard(this, c, 20 + i * 274, 440, 262, 182, o, () => undefined, String(i + 1));
      });
    } else this.renderPicker(c);
    const ready = this.team.length === 3 && !picked;
    const go = new Button(this, 1058, 640, 330, 70, picked ? "✓ ĐÃ CHỐT" : "🔒 CHỐT ĐỘI", {
      color: COLORS.red,
      fontSize: 30,
      disabled: !ready,
      onClick: () => void this.pick(),
    });
    go.on("disabled-click", () => !picked && toast(this, "Hãy chọn đủ 3 con cá"));
    c.add(go);
    this.tickClock();
  }

  private candidates(): OwnedFish[] {
    return GameState.save.fishes.filter((f) => !f.locked && FISH_BY_ID.has(f.fishId)).sort((a, b) => fishPower(b) - fishPower(a));
  }

  private renderPicker(c: Phaser.GameObjects.Container) {
    const list = this.candidates();
    const per = 12;
    const pages = Math.max(1, Math.ceil(list.length / per));
    this.page = Math.min(this.page, pages - 1);
    if (list.length < 3) {
      c.add(txt(this, 420, 300, "Cần ít nhất 3 con cá không khoá.", 26, { align: "center" }).setOrigin(0.5));
      return;
    }
    list.slice(this.page * per, this.page * per + per).forEach((o, i) => {
      const idx = this.team.indexOf(o.uid);
      fishPickCard(this, c, 20 + (i % 6) * 136, 130 + Math.floor(i / 6) * 150, 128, 142, o, () => {
        if (idx >= 0) this.team.splice(idx, 1);
        else if (this.team.length < 3) this.team.push(o.uid);
        else return toast(this, "Đã đủ 3 con. Bấm lại để bỏ bớt.");
        this.render();
      }, idx >= 0 ? String(idx + 1) : undefined);
    });
    if (pages > 1) {
      c.add(new Button(this, 700, 450, 56, 36, "◀", { color: COLORS.blue, fontSize: 16, disabled: this.page === 0, onClick: () => ((this.page -= 1), this.render()) }));
      c.add(new Button(this, 770, 450, 56, 36, "▶", { color: COLORS.blue, fontSize: 16, disabled: this.page >= pages - 1, onClick: () => ((this.page += 1), this.render()) }));
    }
    c.add(txt(this, 20, 470, "Đội hình (thứ tự xuất trận)", 18, { color: COLORS.textGold }));
    for (let i = 0; i < 3; i++) {
      const o = this.team[i] ? GameState.save.fishes.find((f) => f.uid === this.team[i]) : undefined;
      if (o) fishPickCard(this, c, 20 + i * 274, 500, 262, 200, o, () => (this.team.splice(i, 1), this.render()), String(i + 1));
      else {
        const g = this.add.graphics();
        g.fillStyle(0x0a1628, 0.7).fillRoundedRect(20 + i * 274, 500, 262, 200, 14);
        g.lineStyle(3, 0x5fb3ff, 0.6).strokeRoundedRect(20 + i * 274, 500, 262, 200, 14);
        c.add(g);
        c.add(txt(this, 151 + i * 274, 600, `Cá ${i + 1}`, 20, { color: COLORS.textDim, align: "center" }).setOrigin(0.5));
      }
    }
  }

  private async pick() {
    if (this.sending || this.team.length !== 3) return;
    this.sending = true;
    try {
      await GameState.syncNow(); // máy chủ đọc cá từ bản lưu mới nhất
      this.room = await pvpCall({ op: "pick", id: this.room.id, team: this.team });
      Sfx.click();
      this.render();
    } catch (e) {
      toast(this, (e as Error).message, COLORS.red);
    } finally {
      this.sending = false;
    }
  }
}
