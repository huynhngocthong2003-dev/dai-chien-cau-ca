import Phaser from "phaser";
import { CHECKIN_REWARDS, FORM_BY_ITEM, QUESTS, TITLES } from "@dccc/game-data";
import { checkinState, questProgress, rewardText, titleProgress, type RewardDef } from "@dccc/shared";
import { GameState } from "../state/GameState.ts";
import { Bar, Button, fadeIn, goTo, panel, toast, txt } from "../ui/widgets.ts";
import { TopBar } from "../ui/TopBar.ts";
import { COLORS } from "../ui/theme.ts";
import { menuBackdrop } from "../ui/backdrop.ts";
import { hexToInt } from "../art/color.ts";
import { Sfx } from "../audio/Sfx.ts";

type Tab = "daily" | "checkin" | "titles";
const evoName = (id: string) => FORM_BY_ITEM.get(id)?.itemName ?? "Vật phẩm đột biến";
const rw = (r: RewardDef) => rewardText(r, evoName);

/** Nhiệm vụ ngày, điểm danh 7 ngày và danh hiệu. */
export class QuestScene extends Phaser.Scene {
  private tab: Tab = "daily";
  private body?: Phaser.GameObjects.Container;
  private tabs: Button[] = [];
  private page = 0;

  constructor() {
    super("Quests");
  }

  init(data: { tab?: Tab }) {
    if (data.tab) this.tab = data.tab;
  }

  create() {
    this.input.enabled = true;
    fadeIn(this);
    menuBackdrop(this);
    GameState.refreshQuests();
    new TopBar(this, { title: "Nhiệm Vụ", onBack: () => goTo(this, "Hub") });
    const defs: [Tab, string][] = [
      ["daily", "📜 Nhiệm vụ ngày"],
      ["checkin", "📅 Điểm danh"],
      ["titles", "🏅 Danh hiệu"],
    ];
    this.tabs = defs.map(([t, label], i) => new Button(this, 130 + i * 230, 118, 220, 52, label, { color: COLORS.blue, fontSize: 20, onClick: () => ((this.tab = t), (this.page = 0), this.render()) }));
    this.render();
  }

  private render() {
    this.tabs.forEach((b, i) => b.setColor((["daily", "checkin", "titles"] as Tab[])[i] === this.tab ? COLORS.orange : COLORS.blue));
    this.body?.destroy(true);
    const c = this.add.container(0, 0);
    this.body = c;
    c.add(panel(this, 20, 152, 1240, 556, 0.92));
    if (this.tab === "daily") this.renderDaily(c);
    else if (this.tab === "checkin") this.renderCheckin(c);
    else this.renderTitles(c);
  }

  private row(c: Phaser.GameObjects.Container, y: number, icon: string, name: string, sub: string, prog: number, target: number, state: "claim" | "done" | "todo", onClaim: () => void, color = 0x5fb3ff) {
    const g = this.add.graphics();
    g.fillStyle(state === "claim" ? 0x1b4d2a : 0x0a1628, 0.95).fillRoundedRect(40, y, 1200, 64, 12);
    g.lineStyle(2.5, state === "claim" ? 0x69f0ae : color, 0.9).strokeRoundedRect(40, y, 1200, 64, 12);
    c.add(g);
    c.add(this.add.text(78, y + 33, icon, { fontSize: "34px", padding: { top: 8 } }).setOrigin(0.5));
    c.add(txt(this, 112, y + 18, name, 20).setOrigin(0, 0.5));
    c.add(txt(this, 112, y + 45, sub, 15, { weight: "700", color: COLORS.textDim }).setOrigin(0, 0.5));
    const bar = new Bar(this, 700, y + 22, 260, 22, state === "todo" ? 0x29b6f6 : 0x4caf50, `${Math.min(prog, target).toLocaleString("vi-VN")}/${target.toLocaleString("vi-VN")}`);
    bar.set(Math.min(1, prog / target));
    c.add(bar);
    const b = new Button(this, 1120, y + 32, 190, 48, state === "done" ? "Đã nhận ✓" : state === "claim" ? "Nhận" : "Chưa xong", {
      color: state === "claim" ? COLORS.green : COLORS.blue,
      fontSize: 19,
      disabled: state !== "claim",
      onClick: onClaim,
    });
    b.on("disabled-click", () => toast(this, state === "done" ? "Bạn đã nhận rồi" : "Hãy hoàn thành yêu cầu trước"));
    if (state === "claim") this.tweens.add({ targets: b, scale: 1.06, duration: 500, yoyo: true, repeat: -1 });
    c.add(b);
  }

  private renderDaily(c: Phaser.GameObjects.Container) {
    const s = GameState.save;
    c.add(txt(this, 640, 182, "Làm mới lúc 0h mỗi ngày (giờ Việt Nam)", 18, { weight: "700", color: COLORS.textDim, align: "center" }).setOrigin(0.5));
    QUESTS.forEach((q, i) => {
      const p = questProgress(s, q);
      const done = s.daily.claimed.includes(q.id);
      this.row(c, 206 + i * 70, q.icon, q.name, `Thưởng: ${rw(q.reward)}`, p, q.target, done ? "done" : p >= q.target ? "claim" : "todo", () => {
        const r = GameState.claimQuest(q);
        if (!r.ok) return toast(this, r.error, COLORS.red);
        Sfx.coin();
        toast(this, `Hoàn thành "${q.name}": +${rw(q.reward)}`, COLORS.green);
        this.render();
      });
    });
  }

  private renderCheckin(c: Phaser.GameObjects.Container) {
    const st = checkinState(GameState.save, Date.now(), CHECKIN_REWARDS.length);
    c.add(txt(this, 640, 190, `Điểm danh liên tiếp: ${st.streak} ngày · Tổng ${GameState.save.checkin.total} ngày`, 22, { color: COLORS.textGold, align: "center" }).setOrigin(0.5));
    c.add(txt(this, 640, 222, "Lỡ 1 ngày sẽ quay lại Ngày 1. Ngày 7 có quà lớn!", 16, { weight: "700", color: COLORS.textDim, align: "center" }).setOrigin(0.5));
    CHECKIN_REWARDS.forEach((r, i) => {
      const x = 60 + i * 168;
      const y = 260;
      const got = i < st.index || (st.done && i === st.index);
      const today = i === st.index && !st.done;
      const big = i === CHECKIN_REWARDS.length - 1;
      const g = this.add.graphics();
      g.fillGradientStyle(big ? 0x6a1b9a : 0x1a3d66, big ? 0x6a1b9a : 0x1a3d66, 0x0d2340, 0x0d2340, 1).fillRoundedRect(x, y, 156, 260, 16);
      g.lineStyle(today ? 5 : 3, today ? 0xffeb3b : got ? 0x4caf50 : 0x5fb3ff).strokeRoundedRect(x, y, 156, 260, 16);
      c.add(g);
      c.add(txt(this, x + 78, y + 28, `Ngày ${i + 1}`, 22, { color: today ? "#ffeb3b" : COLORS.textGold, align: "center" }).setOrigin(0.5));
      const icon = r.diamonds && r.diamonds >= 100 ? "💎" : r.diamonds ? "💎" : r.gold ? "🪙" : r.stones ? "🔷" : "🎫";
      const ic = this.add.text(x + 78, y + 104, big ? "🎁" : icon, { fontSize: big ? "72px" : "60px", padding: { top: 12 } }).setOrigin(0.5);
      c.add(ic);
      if (today) this.tweens.add({ targets: ic, scale: 1.15, angle: 8, duration: 450, yoyo: true, repeat: -1 });
      c.add(txt(this, x + 78, y + 186, rw(r).replace(/ \+ /g, "\n"), 16, { align: "center", weight: "700" }).setOrigin(0.5));
      if (got) c.add(txt(this, x + 78, y + 236, "✓ Đã nhận", 18, { color: "#69f0ae", align: "center" }).setOrigin(0.5));
    });
    const b = new Button(this, 640, 620, 340, 70, st.done ? "Mai quay lại nhé!" : "📅 Điểm danh hôm nay", {
      color: COLORS.orange,
      fontSize: 26,
      disabled: st.done,
      onClick: () => {
        const r = GameState.claimCheckin();
        if (!r.ok) return toast(this, r.error, COLORS.red);
        Sfx.catchFanfare(true);
        this.add
          .particles(640, 400, "p_spark", { speed: { min: 150, max: 450 }, lifespan: 900, scale: { start: 1.3, end: 0 }, tint: [0xffd54f, 0xffffff, 0x40c4ff], quantity: 40, stopAfter: 40, blendMode: Phaser.BlendModes.ADD })
          .setDepth(1000);
        toast(this, `Điểm danh Ngày ${r.index! + 1}: +${rw(CHECKIN_REWARDS[r.index!]!)}`, COLORS.green);
        this.render();
      },
    });
    b.on("disabled-click", () => toast(this, "Hôm nay bạn đã điểm danh rồi"));
    c.add(b);
  }

  private renderTitles(c: Phaser.GameObjects.Container) {
    const s = GameState.save;
    const eq = s.titles.equipped ? TITLES.find((t) => t.id === s.titles.equipped) : null;
    c.add(txt(this, 60, 186, `Đang đeo: ${eq ? `${eq.icon} ${eq.name}` : "(chưa có)"}`, 20, { color: eq?.color ?? COLORS.textDim }).setOrigin(0, 0.5));
    if (eq) c.add(new Button(this, 520, 186, 140, 40, "Tháo", { color: COLORS.grey, fontSize: 16, onClick: () => (GameState.equipTitle(null), this.render()) }));
    // sắp xếp: nhận được → đã có → đang làm
    const list = [...TITLES].sort((a, b) => {
      const k = (t: (typeof TITLES)[number]) => (s.titles.owned.includes(t.id) ? 1 : titleProgress(s, t) >= t.target ? 0 : 2);
      return k(a) - k(b);
    });
    const per = 7;
    const pages = Math.ceil(list.length / per);
    this.page = Math.min(this.page, pages - 1);
    list.slice(this.page * per, this.page * per + per).forEach((t, i) => {
      const owned = s.titles.owned.includes(t.id);
      const p = titleProgress(s, t);
      const y = 214 + i * 66;
      this.row(c, y, t.icon, t.name, `${t.description} · Quà: ${rw(t.reward)}`, p, t.target, owned ? "done" : p >= t.target ? "claim" : "todo", () => {
        const r = GameState.claimTitle(t);
        if (!r.ok) return toast(this, r.error, COLORS.red);
        Sfx.catchFanfare(true);
        this.cameras.main.flash(300, 255, 230, 120);
        toast(this, `🏅 Đạt danh hiệu "${t.name}"! +${rw(t.reward)}`, COLORS.green);
        this.render();
      }, hexToInt(t.color));
      if (owned) {
        const on = s.titles.equipped === t.id;
        c.add(new Button(this, 1120, y + 32, 190, 48, on ? "Đang đeo ✓" : "Đeo danh hiệu", { color: on ? COLORS.orange : COLORS.purple, fontSize: 18, onClick: () => (GameState.equipTitle(t.id), this.render()) }));
      }
    });
    if (pages > 1) {
      c.add(new Button(this, 1060, 186, 60, 40, "◀", { color: COLORS.blue, disabled: this.page === 0, onClick: () => ((this.page -= 1), this.render()) }));
      c.add(txt(this, 1130, 186, `${this.page + 1}/${pages}`, 18, { align: "center" }).setOrigin(0.5));
      c.add(new Button(this, 1200, 186, 60, 40, "▶", { color: COLORS.blue, disabled: this.page >= pages - 1, onClick: () => ((this.page += 1), this.render()) }));
    }
  }
}
