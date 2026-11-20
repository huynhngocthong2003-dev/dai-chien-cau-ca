import Phaser from "phaser";
import { CHARACTER_BY_ID, FISH_BY_ID, FORM_BY_ID, TITLE_BY_ID } from "@dccc/game-data";
import { rankTitle, teamPower, type RankCategory } from "@dccc/shared";
import { GameState } from "../state/GameState.ts";
import * as Social from "../state/social.ts";
import { characterHeadTexture } from "../art/textures.ts";
import { Button, fadeIn, formatNum, goTo, panel, txt } from "../ui/widgets.ts";
import { TopBar } from "../ui/TopBar.ts";
import { COLORS } from "../ui/theme.ts";
import { menuBackdrop } from "../ui/backdrop.ts";
import { openPlayerProfile } from "../ui/playerProfile.ts";

type Tab = RankCategory | "guild";
const TABS: [Tab, string, string][] = [
  ["level", "⭐ Cấp độ", "Cấp"],
  ["caught", "🐟 Câu cá", "Cá"],
  ["bosses", "👑 Săn Boss", "Boss"],
  ["dmWins", "⚔ Sinh tử", "Thắng"],
  ["junk", "♻ Nhặt rác", "Rác"],
  ["teamPower", "🐟 Chiến lực", "⚔"],
  ["guild", "🛡 Hội", "Điểm"],
];

/** Bảng Xếp Hạng: top 50 mỗi hạng mục, danh hiệu cho top 10, hạng của mình. */
export class RankingScene extends Phaser.Scene {
  private tab: Tab = "teamPower";
  private body?: Phaser.GameObjects.Container;
  private tabs: Button[] = [];
  private page = 0;
  private reqId = 0;

  constructor() {
    super("Ranking");
  }

  create() {
    this.input.enabled = true;
    fadeIn(this);
    menuBackdrop(this);
    new TopBar(this, { title: "Bảng Xếp Hạng", onBack: () => goTo(this, "Hub") });
    this.tabs = TABS.map(([t, label], i) => new Button(this, 99 + i * 180, 118, 172, 50, label, { color: COLORS.blue, fontSize: 17, onClick: () => ((this.tab = t), (this.page = 0), void this.fetchData()) }));
    void this.fetchData();
  }

  private frame() {
    this.tabs.forEach((b, i) => b.setColor(TABS[i]![0] === this.tab ? COLORS.orange : COLORS.blue));
    this.body?.destroy(true);
    const c = this.add.container(0, 0);
    this.body = c;
    c.add(panel(this, 20, 152, 1240, 556, 0.92));
    return c;
  }

  private async fetchData() {
    const c = this.frame();
    if (!GameState.online) {
      c.add(txt(this, 640, 360, "Đăng nhập tài khoản online để xem Bảng Xếp Hạng\nvà giành danh hiệu 👑 Top 1 – 🥈 Top 2 – 🥉 Top 3 – 🏅 Top 10!", 22, { align: "center" }).setOrigin(0.5));
      c.add(new Button(this, 640, 480, 300, 64, "👤 Đăng nhập", { color: COLORS.blue, fontSize: 24, onClick: () => goTo(this, "Account") }));
      return;
    }
    const id = ++this.reqId;
    const loading = txt(this, 640, 420, "Đang tải…", 24, { align: "center" }).setOrigin(0.5);
    c.add(loading);
    try {
      await GameState.publishProfile();
      if (this.tab === "guild") {
        const list = await Social.listGuilds("");
        if (id === this.reqId && this.scene.isActive()) this.renderGuilds(list);
      } else {
        const [rows, mine] = await Promise.all([Social.leaderboard(this.tab, 50), Social.myRank(this.tab)]);
        if (id === this.reqId && this.scene.isActive()) this.renderRows(this.tab, rows, mine);
      }
    } catch (e) {
      if (id !== this.reqId || !this.scene.isActive()) return;
      loading.setText(`Không tải được: ${(e as Error).message}`).setColor("#ff8a80").setWordWrapWidth(1100);
    }
  }

  private badge(c: Phaser.GameObjects.Container, x: number, y: number, rank: number) {
    const col = rank === 1 ? 0xffd54f : rank === 2 ? 0xe0e0e0 : rank === 3 ? 0xffab91 : 0x37474f;
    const g = this.add.graphics();
    g.fillStyle(col, 1).fillCircle(x, y, 22).lineStyle(3, 0x1b1530).strokeCircle(x, y, 22);
    c.add(g);
    c.add(txt(this, x, y + 1, String(rank), rank > 99 ? 15 : 20, { color: rank <= 3 ? "#1b1530" : "#ffffff", stroke: rank <= 3 ? 0 : 4, shadow: false }).setOrigin(0.5));
  }

  private renderRows(cat: RankCategory, rows: Social.RankRow[], mine: number | null) {
    const c = this.frame();
    const unit = TABS.find((t) => t[0] === cat)![2];
    if (!rows.length) c.add(txt(this, 640, 400, "Chưa có ai trên bảng này. Hãy là người đầu tiên!", 22, { align: "center" }).setOrigin(0.5));
    const per = 7;
    const pages = Math.max(1, Math.ceil(rows.length / per));
    rows.slice(this.page * per, this.page * per + per).forEach((r, i) => {
      const y = 170 + i * 66;
      const me = r.user_id === GameState.online?.id;
      const g = this.add.graphics();
      g.fillStyle(me ? 0x2a5a8a : r.rank <= 3 ? 0x3a2f10 : 0x0a1628, 0.95).fillRoundedRect(40, y, 1200, 60, 12);
      g.lineStyle(2, me ? 0xffeb3b : 0x5fb3ff, 0.7).strokeRoundedRect(40, y, 1200, 60, 12);
      c.add(g);
      this.badge(c, 80, y + 30, r.rank);
      const ch = CHARACTER_BY_ID.get(r.avatar) ?? CHARACTER_BY_ID.get("c_be_tom")!;
      c.add(this.add.image(140, y + 30, characterHeadTexture(this, ch, {})).setDisplaySize(48, 58));
      c.add(txt(this, 176, y + 18, `${r.display_name}${r.guild_tag ? ` [${r.guild_tag}]` : ""}  · Lv.${r.level}`, 19).setOrigin(0, 0.5));
      const t = r.title ? TITLE_BY_ID.get(r.title) : null;
      if (t) c.add(txt(this, 176, y + 44, `${t.icon} ${t.name}`, 14, { weight: "700", color: t.color }).setOrigin(0, 0.5));
      const rt = rankTitle(cat, r.rank);
      if (rt) {
        const tt = txt(this, 760, y + 30, `${rt.icon} ${rt.name}`, 18, { color: rt.color, align: "center" }).setOrigin(0.5);
        c.add(tt);
        if (r.rank === 1) this.tweens.add({ targets: tt, scale: 1.08, duration: 600, yoyo: true, repeat: -1 });
      }
      c.add(txt(this, 1210, y + 30, `${formatNum(r.score)} ${unit}`, 22, { color: COLORS.textGold }).setOrigin(1, 0.5));
      // bấm vào dòng để xem trang cá nhân
      const z = this.add.zone(640, y + 30, 1200, 60).setInteractive({ useHandCursor: true });
      z.on("pointerup", () => void openPlayerProfile(this, r.user_id, `Hạng #${r.rank} ${TABS.find((t) => t[0] === cat)![1]}`));
      c.add(z);
    });
    c.add(txt(this, 640, 160, "👆 Bấm vào người chơi để xem trang cá nhân", 13, { weight: "700", color: COLORS.textDim, align: "center" }).setOrigin(0.5));
    const myT = mine ? rankTitle(cat, mine) : null;
    const myTeam = cat === "teamPower" ? ` · Đội hình của bạn ⚔ ${formatNum(teamPower(GameState.save, FISH_BY_ID, FORM_BY_ID))}` : "";
    c.add(
      txt(this, 60, 682, mine ? `Hạng của bạn: #${mine}${myT ? ` – ${myT.icon} ${myT.name}` : " – lọt Top 10 để nhận danh hiệu!"}${myTeam}` : `Bạn chưa có điểm ở bảng này${myTeam}`, 17, { color: "#80d8ff" }).setOrigin(0, 0.5),
    );
    if (pages > 1) {
      c.add(new Button(this, 1060, 682, 60, 40, "◀", { color: COLORS.blue, disabled: this.page === 0, onClick: () => ((this.page -= 1), this.renderRows(cat, rows, mine)) }));
      c.add(txt(this, 1130, 682, `${this.page + 1}/${pages}`, 18, { align: "center" }).setOrigin(0.5));
      c.add(new Button(this, 1200, 682, 60, 40, "▶", { color: COLORS.blue, disabled: this.page >= pages - 1, onClick: () => ((this.page += 1), this.renderRows(cat, rows, mine)) }));
    }
  }

  private renderGuilds(list: Social.GuildRow[]) {
    const c = this.frame();
    if (!list.length) c.add(txt(this, 640, 400, "Chưa có hội nào. Vào mục Hội để lập hội đầu tiên!", 22, { align: "center" }).setOrigin(0.5));
    list.slice(0, 7).forEach((gr, i) => {
      const y = 170 + i * 66;
      const g = this.add.graphics();
      g.fillStyle(i < 3 ? 0x3a2f10 : 0x0a1628, 0.95).fillRoundedRect(40, y, 1200, 60, 12);
      c.add(g);
      this.badge(c, 80, y + 30, i + 1);
      c.add(txt(this, 120, y + 18, `🛡 ${gr.name} [${gr.tag}]`, 20, { color: i === 0 ? "#ffd54f" : COLORS.text }).setOrigin(0, 0.5));
      c.add(txt(this, 120, y + 44, `${gr.members}/30 thành viên · tổng cấp ${gr.total_level}`, 14, { weight: "700", color: COLORS.textDim }).setOrigin(0, 0.5));
      if (i < 3) c.add(txt(this, 760, y + 30, ["👑 Hội Bá Chủ Đại Dương", "🥈 Hội Danh Tiếng", "🥉 Hội Tinh Anh"][i]!, 18, { color: ["#ffd54f", "#e0e0e0", "#ffab91"][i]!, align: "center" }).setOrigin(0.5));
      c.add(txt(this, 1210, y + 30, `${formatNum(gr.score)} điểm`, 22, { color: COLORS.textGold }).setOrigin(1, 0.5));
    });
    c.add(txt(this, 60, 682, "Điểm hội = tổng số cá thành viên đã câu", 17, { weight: "700", color: COLORS.textDim }).setOrigin(0, 0.5));
    c.add(new Button(this, 1140, 682, 200, 44, "🛡 Vào mục Hội", { color: COLORS.green, fontSize: 18, onClick: () => goTo(this, "Guild") }));
  }
}
