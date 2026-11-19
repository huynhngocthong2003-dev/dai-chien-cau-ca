import Phaser from "phaser";
import { menuBackdrop } from "../ui/backdrop.ts";
import { CHARACTER_BY_ID } from "@dccc/game-data";
import { playerNameSchema } from "@dccc/validation";
import { GameState } from "../state/GameState.ts";
import * as Online from "../state/online.ts";
import { characterHeadTexture } from "../art/textures.ts";
import { Button, fadeIn, goTo, modal, panel, toast, txt } from "../ui/widgets.ts";
import { TopBar } from "../ui/TopBar.ts";
import { COLORS } from "../ui/theme.ts";
import { Sfx } from "../audio/Sfx.ts";
import { htmlOverlay } from "../ui/htmlOverlay.ts";

const INPUT_CSS =
  "width:100%;box-sizing:border-box;font:700 20px 'Baloo 2',sans-serif;padding:6px 12px;border-radius:12px;border:3px solid #1b1530;background:#fff8e1;color:#1b1530";

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

/** Tài khoản: hồ sơ, đăng ký / đăng nhập online, sao lưu & khôi phục bằng mã. */
export class AccountScene extends Phaser.Scene {
  private body?: Phaser.GameObjects.Container;
  private busy = false;

  constructor() {
    super("Account");
  }

  create() {
    this.input.enabled = true;
    fadeIn(this);
    menuBackdrop(this);
    new TopBar(this, { title: "Tài Khoản", onBack: () => goTo(this, "Hub") });
    this.render();
  }

  private render() {
    this.body?.destroy(true);
    const c = this.add.container(0, 0);
    this.body = c;
    this.renderProfile(c);
    this.renderOnline(c);
    this.renderBackup(c);
  }

  private renderProfile(c: Phaser.GameObjects.Container) {
    const s = GameState.save;
    const ch = CHARACTER_BY_ID.get(s.selectedCharacterId)!;
    c.add(panel(this, 16, 92, 404, 614, 0.95));
    c.add(this.add.image(218, 230, characterHeadTexture(this, ch, GameState.equipOf(ch.id))).setDisplaySize(190, 228));
    c.add(txt(this, 218, 364, s.name, 32, { color: COLORS.textGold, align: "center" }).setOrigin(0.5));
    c.add(txt(this, 218, 400, `Cấp ${s.level} · ${Object.keys(s.characters).length} nhân vật · ${s.stats.totalCaught} cá đã câu`, 17, { align: "center", weight: "700" }).setOrigin(0.5));
    const where =
      GameState.storage.kind === "online"
        ? `☁️ Tài khoản online\n${GameState.online?.email ?? ""}`
        : GameState.storage.kind === "cloud"
          ? "☁️ Đám mây claude.ai"
          : "💾 Chỉ trên máy này";
    c.add(txt(this, 218, 456, `Đang lưu tại:\n${where}`, 18, { align: "center", weight: "700", color: COLORS.textDim }).setOrigin(0.5));
    c.add(txt(this, 218, 530, `Mã người chơi:\n${s.playerId}`, 15, { align: "center", weight: "500", color: COLORS.textDim }).setOrigin(0.5));
    c.add(
      new Button(this, 218, 640, 260, 56, "Đổi tên", {
        color: COLORS.blue,
        fontSize: 22,
        onClick: () => this.renameDialog(),
      }),
    );
  }

  private renderOnline(c: Phaser.GameObjects.Container) {
    c.add(panel(this, 440, 92, 824, 330, 0.95));
    c.add(txt(this, 464, 112, "🔐 Tài khoản online", 26, { color: COLORS.textGold }));
    if (!Online.onlineConfigured()) {
      c.add(
        txt(
          this,
          464,
          160,
          "Máy chủ tài khoản chưa được bật cho bản game này.\n\nKhi bật, bạn có thể tạo tài khoản bằng email + mật khẩu, tiến trình\ntự đồng bộ lên máy chủ và đăng nhập trên mọi thiết bị.\n\nTrong lúc chờ: dùng Sao lưu bằng mã ở bên dưới để chuyển tiến trình\nsang máy khác.",
          18,
          { weight: "700", wrap: 780 },
        ).setLineSpacing(3),
      );
      return;
    }
    const user = GameState.online;
    if (user) {
      const st = GameState.storage as Online.OnlineSaveStorage;
      const sync = st.lastError
        ? `⚠ Lỗi đồng bộ: ${st.lastError}`
        : st.lastSyncedAt
          ? `Đồng bộ lần cuối: ${new Date(st.lastSyncedAt).toLocaleTimeString("vi-VN")}`
          : "Tự đồng bộ vài giây sau mỗi thay đổi";
      c.add(txt(this, 464, 170, `Đã đăng nhập: ${user.email}\n${sync}\n\nTiến trình được lưu trên máy chủ và tự sao lưu lịch sử (30 bản gần nhất).`, 19, { weight: "700", wrap: 780 }).setLineSpacing(4));
      c.add(
        new Button(this, 600, 370, 240, 56, "🔄 Đồng bộ ngay", {
          color: COLORS.green,
          fontSize: 21,
          onClick: async () => {
            const err = await GameState.syncNow();
            toast(this, err ? `Chưa đồng bộ được: ${err}` : "Đã đồng bộ lên máy chủ", err ? COLORS.red : COLORS.green);
            this.render();
          },
        }),
      );
      c.add(
        new Button(this, 860, 370, 220, 56, "Đăng xuất", {
          color: COLORS.red,
          fontSize: 21,
          onClick: async () => {
            await GameState.signOut();
            toast(this, "Đã đăng xuất. Tiến trình vẫn được giữ trên máy này.");
            this.render();
          },
        }),
      );
      return;
    }
    htmlOverlay(
      this,
      c,
      660,
      236,
      370,
      160,
      `<div style="display:flex;flex-direction:column;gap:10px;width:100%">
        <input id="acc-email" type="email" autocomplete="email" placeholder="Email" style="${INPUT_CSS}">
        <input id="acc-pass" type="password" autocomplete="current-password" placeholder="Mật khẩu (ít nhất 6 ký tự)" style="${INPUT_CSS}">
        <input id="acc-name" maxlength="16" placeholder="Tên hiển thị (khi tạo mới)" value="${esc(GameState.save.name)}" style="${INPUT_CSS}">
      </div>`,
    );
    const val = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value.trim() ?? "";
    const run = async (mode: "in" | "up") => {
      if (this.busy) return;
      const email = val("acc-email");
      const pass = (document.getElementById("acc-pass") as HTMLInputElement | null)?.value ?? "";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast(this, "Email không hợp lệ", COLORS.red);
      if (pass.length < 6) return toast(this, "Mật khẩu cần ít nhất 6 ký tự", COLORS.red);
      let name = GameState.save.name;
      if (mode === "up") {
        const r = playerNameSchema.safeParse(val("acc-name"));
        if (!r.success) return toast(this, "Tên gồm 2–16 ký tự: chữ, số, khoảng trắng hoặc _", COLORS.red);
        name = r.data;
      }
      this.busy = true;
      toast(this, mode === "up" ? "Đang tạo tài khoản…" : "Đang đăng nhập…");
      try {
        const r = mode === "up" ? await GameState.signUp(email, pass, name) : await GameState.signIn(email, pass);
        if (!r.ok) return toast(this, r.error, COLORS.red);
        if (!r.user) return toast(this, "Đã tạo tài khoản! Mở email xác nhận rồi quay lại đăng nhập.", COLORS.green);
        Sfx.levelUp();
        const msg = (r as { message?: string }).message;
        toast(this, msg || "Đăng nhập thành công", COLORS.green);
        this.render();
      } catch (e) {
        toast(this, `Lỗi: ${(e as Error).message}`, COLORS.red);
      } finally {
        this.busy = false;
      }
    };
    c.add(new Button(this, 1050, 178, 240, 58, "Đăng nhập", { color: COLORS.green, fontSize: 24, onClick: () => void run("in") }));
    c.add(new Button(this, 1050, 252, 240, 58, "Tạo tài khoản", { color: COLORS.orange, fontSize: 24, onClick: () => void run("up") }));
    c.add(txt(this, 464, 352, "Tạo tài khoản sẽ lưu tiến trình hiện tại vào tài khoản. Đăng nhập tài khoản cũ sẽ tải tiến trình từ máy chủ\n(tiến trình trên máy được cất sao lưu, không mất).", 14, { weight: "700", color: COLORS.textDim, wrap: 790 }));
  }

  private renderBackup(c: Phaser.GameObjects.Container) {
    c.add(panel(this, 440, 440, 824, 266, 0.95));
    c.add(txt(this, 464, 460, "💾 Sao lưu bằng mã", 26, { color: COLORS.textGold }));
    c.add(
      txt(
        this,
        464,
        502,
        "Tạo một đoạn mã chứa toàn bộ tiến trình. Gửi mã cho chính bạn (Zalo, ghi chú, email…)\nrồi dán vào máy khác để chơi tiếp. Không cần tài khoản.",
        17,
        { weight: "700", wrap: 790 },
      ).setLineSpacing(3),
    );
    c.add(new Button(this, 640, 640, 320, 64, "📤 Tạo mã sao lưu", { color: COLORS.blue, fontSize: 24, onClick: () => void this.exportDialog() }));
    c.add(new Button(this, 1040, 640, 320, 64, "📥 Khôi phục từ mã", { color: COLORS.purple, fontSize: 24, onClick: () => this.importDialog() }));
  }

  private async exportDialog() {
    const code = await GameState.exportBackup();
    const m = modal(this, 900, 520, "Mã sao lưu của bạn");
    const cx = m.x + m.w / 2;
    m.root.add(txt(this, cx, m.y + 80, `Mã gồm ${code.length.toLocaleString("vi-VN")} ký tự – hãy chép TOÀN BỘ. Ai có mã này đều chép được tiến trình của bạn.`, 17, { align: "center", wrap: 840, weight: "700" }).setOrigin(0.5));
    htmlOverlay(this, m.root, cx, m.y + 260, 840, 250, `<textarea id="backup-out" readonly style="width:100%;height:100%;box-sizing:border-box;font:500 13px monospace;border-radius:12px;border:3px solid #1b1530;background:#fff8e1;color:#1b1530;padding:8px;word-break:break-all">${code}</textarea>`);
    m.root.add(
      new Button(this, cx, m.y + 450, 280, 62, "📋 Sao chép mã", {
        color: COLORS.orange,
        fontSize: 24,
        onClick: () => {
          const ta = document.getElementById("backup-out") as HTMLTextAreaElement | null;
          const fallback = () => {
            ta?.focus();
            ta?.select();
            toast(this, "Đã chọn toàn bộ mã – nhấn giữ hoặc Ctrl+C để sao chép");
          };
          try {
            navigator.clipboard.writeText(code).then(() => toast(this, "Đã sao chép mã sao lưu", COLORS.green), fallback);
          } catch {
            fallback();
          }
        },
      }),
    );
  }

  private importDialog() {
    const m = modal(this, 900, 520, "Khôi phục từ mã");
    const cx = m.x + m.w / 2;
    m.root.add(txt(this, cx, m.y + 80, "Dán mã sao lưu vào ô dưới. Tiến trình hiện tại sẽ được cất sao lưu trước khi thay thế.", 17, { align: "center", wrap: 840, weight: "700" }).setOrigin(0.5));
    htmlOverlay(this, m.root, cx, m.y + 260, 840, 250, `<textarea id="backup-in" placeholder="DCCC1.…" style="width:100%;height:100%;box-sizing:border-box;font:500 13px monospace;border-radius:12px;border:3px solid #1b1530;background:#fff8e1;color:#1b1530;padding:8px;word-break:break-all"></textarea>`);
    let armed = false;
    const btn = new Button(this, cx, m.y + 450, 300, 62, "📥 Khôi phục", {
      color: COLORS.purple,
      fontSize: 24,
      onClick: async () => {
        const code = (document.getElementById("backup-in") as HTMLTextAreaElement | null)?.value ?? "";
        if (!code.trim()) return toast(this, "Hãy dán mã sao lưu trước", COLORS.red);
        if (!armed) {
          armed = true;
          btn.setText("Bấm lần nữa để thay");
          return toast(this, "Tiến trình hiện tại sẽ bị thay bằng bản trong mã. Bấm lần nữa để xác nhận.");
        }
        const r = await GameState.importBackup(code);
        if (!r.ok) {
          armed = false;
          btn.setText("📥 Khôi phục");
          return toast(this, r.error, COLORS.red);
        }
        Sfx.levelUp();
        m.close();
        toast(this, `Đã khôi phục: ${r.save.name}, cấp ${r.save.level}, ${r.save.fishes.length} cá`, COLORS.green);
        this.render();
      },
    });
    m.root.add(btn);
  }

  private renameDialog() {
    const m = modal(this, 600, 300, "Đổi tên");
    const cx = m.x + m.w / 2;
    htmlOverlay(this, m.root, cx, m.y + 130, 370, 50, `<input id="acc-rename" maxlength="16" value="${esc(GameState.save.name)}" style="${INPUT_CSS}">`);
    m.root.add(
      new Button(this, cx, m.y + 220, 220, 58, "Lưu tên", {
        color: COLORS.green,
        fontSize: 22,
        onClick: () => {
          const r = playerNameSchema.safeParse((document.getElementById("acc-rename") as HTMLInputElement | null)?.value ?? "");
          if (!r.success) return toast(this, "Tên gồm 2–16 ký tự: chữ, số, khoảng trắng hoặc _", COLORS.red);
          GameState.rename(r.data);
          m.close();
          this.render();
        },
      }),
    );
  }
}
