import Phaser from "phaser";
import { CHARACTER_BY_ID, TITLE_BY_ID } from "@dccc/game-data";
import { validateGuild } from "@dccc/shared";
import { GameState } from "../state/GameState.ts";
import * as Social from "../state/social.ts";
import { characterHeadTexture } from "../art/textures.ts";
import { Button, fadeIn, formatNum, goTo, panel, toast, txt } from "../ui/widgets.ts";
import { TopBar } from "../ui/TopBar.ts";
import { COLORS } from "../ui/theme.ts";
import { menuBackdrop } from "../ui/backdrop.ts";
import { htmlOverlay } from "../ui/htmlOverlay.ts";

const INPUT = (id: string, ph: string, max: number) =>
  `<input id="${id}" maxlength="${max}" placeholder="${ph}" style="width:100%;height:100%;box-sizing:border-box;font:700 18px 'Baloo 2',sans-serif;padding:4px 10px;border-radius:10px;border:3px solid #1b1530;background:#fff8e1;color:#1b1530">`;
const val = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value ?? "";

/** Hội Câu Cá: lập hội (đặt tên + ký hiệu), tìm & vào hội, xem thành viên, rời hội. */
export class GuildScene extends Phaser.Scene {
  private body?: Phaser.GameObjects.Container;
  private busy = false;

  constructor() {
    super("Guild");
  }

  create() {
    this.input.enabled = true;
    fadeIn(this);
    menuBackdrop(this);
    new TopBar(this, { title: "Hội Câu Cá", onBack: () => goTo(this, "Hub") });
    void this.refresh();
  }

  private frame() {
    this.body?.destroy(true);
    const c = this.add.container(0, 0);
    this.body = c;
    return c;
  }

  private async act(fn: () => Promise<unknown>, ok: string) {
    if (this.busy) return;
    this.busy = true;
    try {
      await fn();
      toast(this, ok, COLORS.green);
      await this.refresh();
    } catch (e) {
      toast(this, (e as Error).message, COLORS.red);
    } finally {
      this.busy = false;
    }
  }

  private async refresh(query = "") {
    const c = this.frame();
    if (!GameState.online) {
      c.add(panel(this, 240, 160, 800, 440, 0.92));
      c.add(txt(this, 640, 330, "Đăng nhập tài khoản online để lập hội,\nvào hội cùng bạn bè và leo Bảng Xếp Hạng Hội!", 22, { align: "center" }).setOrigin(0.5));
      c.add(new Button(this, 640, 460, 300, 64, "👤 Đăng nhập", { color: COLORS.blue, fontSize: 24, onClick: () => goTo(this, "Account") }));
      return;
    }
    const loading = txt(this, 640, 400, "Đang tải…", 24, { align: "center" }).setOrigin(0.5);
    c.add(loading);
    try {
      const me = GameState.online.id;
      const mem = await Social.myMembership(me);
      if (!this.scene.isActive()) return;
      if (mem) await this.renderMine(mem);
      else this.renderBrowse(await Social.listGuilds(query), query);
    } catch (e) {
      if (this.scene.isActive()) loading.setText(`Không tải được: ${(e as Error).message}`).setColor("#ff8a80").setWordWrapWidth(1100);
    }
  }

  private renderBrowse(list: Social.GuildRow[], query: string) {
    const c = this.frame();
    // lập hội
    c.add(panel(this, 20, 92, 440, 614, 0.92));
    c.add(txt(this, 240, 130, "🛡 Lập hội mới", 28, { color: COLORS.textGold, align: "center" }).setOrigin(0.5));
    c.add(txt(this, 50, 180, "Tên hội (3–24 ký tự)", 18, { weight: "700" }));
    htmlOverlay(this, c, 240, 232, 380, 50, INPUT("gd-name", "VD: Hội Cá Mập Sài Gòn", 24));
    c.add(txt(this, 50, 276, "Ký hiệu (2–5 chữ/số)", 18, { weight: "700" }));
    htmlOverlay(this, c, 240, 328, 380, 50, INPUT("gd-tag", "VD: CMSG", 5));
    c.add(txt(this, 50, 372, "Lời giới thiệu (tuỳ chọn)", 18, { weight: "700" }));
    htmlOverlay(this, c, 240, 424, 380, 50, INPUT("gd-desc", "Câu là phải to!", 120));
    c.add(txt(this, 240, 500, "Mỗi người chỉ ở 1 hội, tối đa 30 thành viên.\nChủ hội rời đi sẽ nhường cho thành viên lâu nhất.", 15, { align: "center", weight: "700", color: COLORS.textDim }).setOrigin(0.5));
    c.add(
      new Button(this, 240, 600, 300, 66, "✨ Lập hội", {
        color: COLORS.orange,
        fontSize: 26,
        onClick: () => {
          const name = val("gd-name");
          const tag = val("gd-tag");
          const err = validateGuild(name, tag);
          if (err) return toast(this, err, COLORS.red);
          void this.act(() => Social.createGuild(name.trim(), tag.trim(), val("gd-desc").trim()), `Đã lập hội "${name.trim()}"! 🎉`);
        },
      }),
    );
    // danh sách hội
    c.add(panel(this, 476, 92, 788, 614, 0.92));
    c.add(txt(this, 500, 130, "Tìm hội để tham gia", 24, { color: COLORS.textGold }).setOrigin(0, 0.5));
    const box = htmlOverlay(this, c, 990, 130, 300, 44, INPUT("gd-q", "Tên hoặc ký hiệu hội", 24));
    (box.querySelector("input") as HTMLInputElement).value = query;
    c.add(new Button(this, 1200, 130, 100, 44, "🔍", { color: COLORS.blue, fontSize: 20, onClick: () => void this.refresh(val("gd-q")) }));
    if (!list.length) c.add(txt(this, 870, 400, "Chưa có hội nào. Hãy lập hội đầu tiên!", 22, { align: "center" }).setOrigin(0.5));
    list.slice(0, 7).forEach((g, i) => {
      const y = 170 + i * 74;
      const bg = this.add.graphics();
      bg.fillStyle(0x0a1628, 0.95).fillRoundedRect(496, y, 748, 66, 12);
      c.add(bg);
      c.add(txt(this, 512, y + 20, `🛡 ${g.name} [${g.tag}]`, 20).setOrigin(0, 0.5));
      c.add(txt(this, 512, y + 47, `${g.members}/30 thành viên · ${formatNum(g.score)} điểm${g.description ? ` · ${g.description}` : ""}`.slice(0, 70), 14, { weight: "700", color: COLORS.textDim }).setOrigin(0, 0.5));
      const full = g.members >= 30;
      const b = new Button(this, 1170, y + 33, 120, 46, full ? "Đầy" : "Vào hội", {
        color: COLORS.green,
        fontSize: 18,
        disabled: full,
        onClick: () => void this.act(() => Social.joinGuild(g.id), `Chào mừng đến với ${g.name}!`),
      });
      b.on("disabled-click", () => toast(this, "Hội đã đủ 30 thành viên"));
      c.add(b);
    });
  }

  private async renderMine(mem: Social.GuildMember) {
    const [guilds, members] = await Promise.all([Social.listGuilds(""), Social.guildMembers(mem.guild_id)]);
    let g = guilds.find((x) => x.id === mem.guild_id);
    if (!g) g = (await Social.listGuilds("")).find((x) => x.id === mem.guild_id);
    const cards = await Social.cardsByIds(members.map((m) => m.user_id));
    if (!this.scene.isActive()) return;
    const c = this.frame();
    const owner = mem.role === "owner";
    c.add(panel(this, 20, 92, 440, 614, 0.92));
    c.add(txt(this, 240, 150, "🛡", 80, { align: "center" }).setOrigin(0.5));
    c.add(txt(this, 240, 230, g?.name ?? "Hội của bạn", 30, { color: COLORS.textGold, align: "center", wrap: 400 }).setOrigin(0.5));
    c.add(txt(this, 240, 272, `[${g?.tag ?? "?"}]`, 24, { align: "center", color: "#80d8ff" }).setOrigin(0.5));
    c.add(txt(this, 240, 330, g?.description || "(chưa có lời giới thiệu)", 17, { align: "center", weight: "700", wrap: 380, color: COLORS.textDim }).setOrigin(0.5));
    c.add(txt(this, 240, 410, `${members.length}/30 thành viên\nĐiểm hội: ${formatNum(g?.score ?? 0)}\nVai trò: ${owner ? "👑 Chủ hội" : "Thành viên"}`, 20, { align: "center" }).setOrigin(0.5));
    c.add(new Button(this, 240, 530, 300, 56, "🏆 Xếp hạng hội", { color: COLORS.purple, fontSize: 20, onClick: () => goTo(this, "Ranking") }));
    let armed = false;
    const leave = new Button(this, 240, 610, 300, 56, "🚪 Rời hội", {
      color: COLORS.red,
      fontSize: 20,
      onClick: () => {
        if (!armed) {
          armed = true;
          leave.setText("Bấm lần nữa để rời!");
          return;
        }
        void this.act(() => Social.leaveGuild(), "Bạn đã rời hội");
      },
    });
    c.add(leave);
    c.add(panel(this, 476, 92, 788, 614, 0.92));
    c.add(txt(this, 500, 130, "Thành viên", 26, { color: COLORS.textGold }).setOrigin(0, 0.5));
    const byId = new Map(cards.map((x) => [x.user_id, x]));
    const sorted = [...members].sort((a, b) => (a.role === "owner" ? -1 : b.role === "owner" ? 1 : (byId.get(b.user_id)?.level ?? 0) - (byId.get(a.user_id)?.level ?? 0)));
    sorted.slice(0, 8).forEach((m, i) => {
      const card = byId.get(m.user_id);
      const y = 166 + i * 66;
      const bg = this.add.graphics();
      bg.fillStyle(m.user_id === GameState.online?.id ? 0x2a5a8a : 0x0a1628, 0.95).fillRoundedRect(496, y, 748, 58, 12);
      c.add(bg);
      const ch = CHARACTER_BY_ID.get(card?.avatar ?? "") ?? CHARACTER_BY_ID.get("c_be_tom")!;
      c.add(this.add.image(530, y + 29, characterHeadTexture(this, ch, {})).setDisplaySize(44, 53));
      c.add(txt(this, 562, y + 18, `${m.role === "owner" ? "👑 " : ""}${card?.display_name ?? "Người chơi"} · Lv.${card?.level ?? "?"}`, 18).setOrigin(0, 0.5));
      const t = card?.stats.title ? TITLE_BY_ID.get(card.stats.title) : null;
      c.add(txt(this, 562, y + 42, `${t ? `${t.icon} ${t.name} · ` : ""}🐟 ${formatNum(card?.stats.caught ?? 0)} · ⚔ ${card?.stats.dmWins ?? 0}T`, 14, { weight: "700", color: t?.color ?? COLORS.textDim }).setOrigin(0, 0.5));
      if (card && m.user_id !== GameState.online?.id) {
        c.add(new Button(this, 1090, y + 29, 100, 42, "⚔ Đấu", { color: COLORS.red, fontSize: 16, onClick: () => goTo(this, "DeathMatch", { mode: "pvp", opponent: card }) }));
        if (owner) c.add(new Button(this, 1190, y + 29, 80, 42, "Mời ra", { color: COLORS.grey, fontSize: 14, onClick: () => void this.act(() => Social.kickMember(m.user_id), "Đã mời thành viên ra khỏi hội") }));
      }
    });
  }
}
