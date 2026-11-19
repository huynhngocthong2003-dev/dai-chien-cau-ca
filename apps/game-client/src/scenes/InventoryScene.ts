import Phaser from "phaser";
import { ECONOMY, FISH_RARITY_COLOR, FISH_RARITY_LABEL, RARITY_ORDER } from "@dccc/game-config";
import { FISHES, FISH_BY_ID, ZONE_BY_ID } from "@dccc/game-data";
import { canAfford, decomposeValue, evolveFodder, fishMaxLevel, fishPower, fishSellPrice, fishStats, nextFishAction, ownedFishPower, type FishDef, type OwnedFish } from "@dccc/shared";
import { costText } from "./GearScene.ts";
import { GameState } from "../state/GameState.ts";
import { fishSilhouetteTexture, fishTexture } from "../art/textures.ts";
import { Button, fadeIn, formatNum, goTo, panel, toast, txt } from "../ui/widgets.ts";
import { TopBar } from "../ui/TopBar.ts";
import { COLORS } from "../ui/theme.ts";
import { hexToInt } from "../art/color.ts";
import { Sfx } from "../audio/Sfx.ts";

const ELEMENT_LABEL: Record<string, string> = {
  water: "💧 Nước",
  fire: "🔥 Lửa",
  ice: "❄️ Băng",
  thunder: "⚡ Sấm",
  dark: "🌑 Bóng Tối",
  light: "✨ Ánh Sáng",
  earth: "🪨 Đất",
};

export class InventoryScene extends Phaser.Scene {
  private tab: "bag" | "collection" = "bag";
  private page = 0;
  private gridC?: Phaser.GameObjects.Container;
  private detailC?: Phaser.GameObjects.Container;
  private selectedUid: string | null = null;
  private tabBtns: Button[] = [];

  constructor() {
    super("Inventory");
  }

  init(data: { tab?: "bag" | "collection" }) {
    this.tab = data.tab ?? "bag";
    this.page = 0;
    this.selectedUid = null;
  }

  create() {
    this.input.enabled = true;
    fadeIn(this);
    this.add.rectangle(0, 0, 1280, 720, 0x0b2a4a).setOrigin(0);
    this.add.image(640, 400, "p_ray").setTint(0x1d5b8f).setAlpha(0.15).setScale(18, 1.4);
    new TopBar(this, { title: "Kho Cá", onBack: () => goTo(this, "Hub") });
    this.tabBtns = [
      new Button(this, 110, 116, 190, 50, "🐟 Kho Cá", { color: COLORS.blue, fontSize: 22, onClick: () => this.switchTab("bag") }),
      new Button(this, 310, 116, 190, 50, "📖 Bộ Sưu Tập", { color: COLORS.blue, fontSize: 22, onClick: () => this.switchTab("collection") }),
    ];
    this.render();
  }

  private switchTab(t: "bag" | "collection") {
    this.tab = t;
    this.page = 0;
    this.selectedUid = null;
    this.render();
  }

  private sortedFishes(): OwnedFish[] {
    return [...GameState.save.fishes].sort((a, b) => {
      const fa = FISH_BY_ID.get(a.fishId)!;
      const fb = FISH_BY_ID.get(b.fishId)!;
      return RARITY_ORDER.indexOf(fb.rarity) - RARITY_ORDER.indexOf(fa.rarity) || fishSellPrice(fb, b.weightKg) - fishSellPrice(fa, a.weightKg);
    });
  }

  private render() {
    this.tabBtns[0]!.setColor(this.tab === "bag" ? COLORS.orange : COLORS.blue);
    this.tabBtns[1]!.setColor(this.tab === "collection" ? COLORS.orange : COLORS.blue);
    this.gridC?.destroy(true);
    const c = this.add.container(0, 0);
    this.gridC = c;
    if (this.tab === "bag") this.renderBag(c);
    else this.renderCollection(c);
  }

  private cell(c: Phaser.GameObjects.Container, x: number, y: number, w: number, h: number, f: FishDef, seen: boolean, selected: boolean, label: string, onClick: () => void) {
    const g = this.add.graphics();
    const col = hexToInt(FISH_RARITY_COLOR[f.rarity]);
    g.fillStyle(selected ? 0x2a5a8a : 0x10294a, 0.95).fillRoundedRect(x, y, w, h, 12);
    g.lineStyle(selected ? 4 : 2.5, seen ? col : 0x455a64).strokeRoundedRect(x, y, w, h, 12);
    c.add(g);
    c.add(this.add.image(x + w / 2, y + h * 0.42, seen ? fishTexture(this, f) : fishSilhouetteTexture(this, f)).setDisplaySize(w * 0.9, w * 0.56));
    c.add(txt(this, x + w / 2, y + h - 14, label, 13, { align: "center", weight: "700", color: seen ? FISH_RARITY_COLOR[f.rarity] : COLORS.textDim }).setOrigin(0.5));
    const z = this.add.zone(x + w / 2, y + h / 2, w, h).setInteractive({ useHandCursor: true });
    z.on("pointerup", () => {
      Sfx.click();
      onClick();
    });
    c.add(z);
  }

  private renderBag(c: Phaser.GameObjects.Container) {
    const list = this.sortedFishes();
    const per = 18;
    const pages = Math.max(1, Math.ceil(list.length / per));
    this.page = Math.min(this.page, pages - 1);
    c.add(txt(this, 440, 116, `${list.length}/${ECONOMY.inventoryLimit} con cá`, 22, { color: COLORS.textGold }).setOrigin(0, 0.5));
    if (list.length === 0) {
      c.add(txt(this, 430, 380, "Kho cá đang trống.\nHãy ra bến câu vài con nhé!", 30, { align: "center" }).setOrigin(0.5));
      c.add(new Button(this, 430, 500, 260, 72, "Đi câu cá", { color: COLORS.orange, fontSize: 28, onClick: () => goTo(this, "Zone") }));
      this.renderDetail(null);
      return;
    }
    if (!this.selectedUid || !list.some((f) => f.uid === this.selectedUid)) this.selectedUid = list[this.page * per]?.uid ?? null;
    list.slice(this.page * per, this.page * per + per).forEach((o, i) => {
      const f = FISH_BY_ID.get(o.fishId)!;
      const x = 24 + (i % 6) * 136;
      const y = 152 + Math.floor(i / 6) * 160;
      this.cell(c, x, y, 128, 150, f, true, o.uid === this.selectedUid, `${o.locked ? "🔒" : ""}${f.name}\nLv.${o.level} ${"★".repeat(o.stars)}`, () => {
        this.selectedUid = o.uid;
        this.render();
      });
    });
    if (pages > 1) {
      c.add(new Button(this, 300, 680, 120, 48, "◀", { color: COLORS.blue, disabled: this.page === 0, onClick: () => ((this.page -= 1), this.render()) }));
      c.add(txt(this, 430, 680, `Trang ${this.page + 1}/${pages}`, 22).setOrigin(0.5));
      c.add(new Button(this, 560, 680, 120, 48, "▶", { color: COLORS.blue, disabled: this.page >= pages - 1, onClick: () => ((this.page += 1), this.render()) }));
    }
    const commons = list.filter((o) => FISH_BY_ID.get(o.fishId)!.rarity === "common" && !o.locked && o.level === 1 && o.stars === 1);
    const total = commons.reduce((s, o) => s + fishSellPrice(FISH_BY_ID.get(o.fishId)!, o.weightKg), 0);
    const sellAll = new Button(this, 720, 116, 230, 50, `Bán cá Thường (${commons.length})`, {
      color: COLORS.green,
      fontSize: 20,
      disabled: commons.length === 0,
      onClick: () => this.sell(commons.map((o) => o.uid), total),
    });
    c.add(sellAll);
    this.renderDetail(list.find((o) => o.uid === this.selectedUid) ?? null);
  }

  private sell(uids: string[], expected: number) {
    const r = GameState.sell(uids);
    if (!r.ok) return toast(this, r.error, COLORS.red);
    Sfx.coin();
    toast(this, `Đã bán ${uids.length} con cá, nhận ${formatNum(r.gold ?? expected)} vàng 🪙`, COLORS.green);
    this.selectedUid = null;
    this.render();
  }

  private renderCollection(c: Phaser.GameObjects.Container) {
    const species = GameState.save.stats.species;
    const seenCount = FISHES.filter((f) => (species[f.id] ?? 0) > 0).length;
    c.add(txt(this, 440, 116, `Đã khám phá ${seenCount}/${FISHES.length} loài`, 22, { color: COLORS.textGold }).setOrigin(0, 0.5));
    const sel = this.selectedUid && FISH_BY_ID.has(this.selectedUid) ? this.selectedUid : FISHES[0]!.id;
    this.selectedUid = sel;
    FISHES.forEach((f, i) => {
      const x = 16 + (i % 8) * 103;
      const y = 148 + Math.floor(i / 8) * 80;
      const seen = (species[f.id] ?? 0) > 0;
      this.cell(c, x, y, 97, 74, f, seen, f.id === sel, seen ? `×${species[f.id]}` : "???", () => {
        this.selectedUid = f.id;
        this.render();
      });
    });
    const f = FISH_BY_ID.get(sel)!;
    this.renderSpecies(f, (species[f.id] ?? 0) > 0);
  }

  private detailPanel() {
    this.detailC?.destroy(true);
    const d = this.add.container(0, 0);
    this.detailC = d;
    d.add(panel(this, 852, 92, 412, 614, 0.95));
    return d;
  }

  private statLines(d: Phaser.GameObjects.Container, f: FishDef, y: number) {
    const lines = [
      `Lực chiến: ${formatNum(fishPower(f))}`,
      `HP ${formatNum(f.hp)} · Công ${f.atk} · Thủ ${f.def} · Tốc ${f.spd}`,
      `Thuộc tính: ${ELEMENT_LABEL[f.element]}`,
      `Kỹ năng: ${f.skill.name} – ${f.skill.description}`,
      `Khu vực: ${f.zones.map((z) => ZONE_BY_ID.get(z)?.name).join(", ")}`,
    ];
    d.add(txt(this, 876, y, lines.join("\n"), 17, { weight: "700", wrap: 366, color: COLORS.text }).setLineSpacing(4));
  }

  private header(d: Phaser.GameObjects.Container, f: FishDef, seen: boolean) {
    const col = FISH_RARITY_COLOR[f.rarity];
    const glow = this.add.image(1058, 210, "p_spark").setTint(hexToInt(col)).setScale(9).setAlpha(seen ? 0.25 : 0);
    d.add(glow);
    d.add(this.add.image(1058, 210, seen ? fishTexture(this, f) : fishSilhouetteTexture(this, f)).setDisplaySize(330, 206));
    d.add(txt(this, 1058, 330, seen ? f.name : "???", 30, { color: col, align: "center" }).setOrigin(0.5));
    d.add(txt(this, 1058, 364, FISH_RARITY_LABEL[f.rarity], 20, { color: col, align: "center" }).setOrigin(0.5));
  }

  private renderDetail(o: OwnedFish | null) {
    const d = this.detailPanel();
    if (!o) return;
    const f = FISH_BY_ID.get(o.fishId)!;
    this.header(d, f, true);
    const st = fishStats(f, o.level, o.stars);
    d.add(
      txt(
        this,
        876,
        388,
        `Cấp ${o.level}/${fishMaxLevel(o.stars)}  ${"★".repeat(o.stars)}${"☆".repeat(5 - o.stars)}   Lực chiến ${formatNum(ownedFishPower(f, o))}\nHP ${formatNum(st.hp)} · Công ${st.atk} · Thủ ${st.def} · Tốc ${st.spd}\n${ELEMENT_LABEL[f.element]} · ${o.weightKg} kg · ${f.skill.name}`,
        16,
        { weight: "700", wrap: 372 },
      ).setLineSpacing(3),
    );
    // phát triển
    const next = nextFishAction(GameState.save, o, f);
    const fodder = next.action === "evolve" ? evolveFodder(GameState.save, o.uid) : null;
    if (next.cost) {
      const err = canAfford(GameState.save, next.cost) ?? (next.action === "evolve" && !fodder ? `Cần thêm 1 con ${f.name} không khóa` : null);
      const info = next.action === "evolve" ? `${costText(next.cost)}  + 1 ${f.name}` : costText(next.cost);
      d.add(txt(this, 1058, 482, info, 16, { align: "center", color: err ? "#ff8a80" : COLORS.textGold, wrap: 380 }).setOrigin(0.5));
      const dev = new Button(this, 1058, 524, 330, 54, next.action === "evolve" ? "Tiến hóa ★ (hợp cá cùng loài)" : "Cường hóa +1 cấp", {
        color: COLORS.purple,
        fontSize: 20,
        disabled: !!err,
        onClick: () => {
          const r = GameState.developFish(o.uid);
          if (!r.ok) return toast(this, r.error, COLORS.red);
          Sfx.levelUp();
          toast(this, next.action === "evolve" ? `${f.name} tiến hóa lên ${o.stars + 1} sao!` : `${f.name} lên cấp ${o.level + 1}!`, COLORS.green);
          this.render();
        },
      });
      dev.on("disabled-click", () => toast(this, err ?? ""));
      d.add(dev);
    } else d.add(txt(this, 1058, 524, "★ ĐÃ TỐI ĐA ★", 24, { align: "center", color: COLORS.textGold }).setOrigin(0.5));
    // khóa / bán / phân giải
    d.add(
      new Button(this, 912, 600, 104, 54, o.locked ? "🔓 Mở" : "🔒 Khóa", {
        color: COLORS.blue,
        fontSize: 20,
        onClick: () => {
          GameState.toggleLock(o.uid);
          this.render();
        },
      }),
    );
    const price = fishSellPrice(f, o.weightKg);
    const sell = new Button(this, 1058, 600, 176, 54, `Bán ${formatNum(price)}🪙`, {
      color: COLORS.green,
      fontSize: 20,
      disabled: o.locked,
      onClick: () => this.sell([o.uid], price),
    });
    sell.on("disabled-click", () => toast(this, "Cá đang khóa. Mở khóa để bán."));
    d.add(sell);
    const dv = decomposeValue(f, o);
    const dec = new Button(this, 1058, 662, 330, 54, `Phân giải → 🔷${dv.stones}${dv.soul ? ` 🔮${dv.soul}` : ""}`, {
      color: COLORS.orange,
      fontSize: 20,
      disabled: o.locked,
      onClick: () => {
        const r = GameState.decompose([o.uid]);
        if (!r.ok) return toast(this, r.error, COLORS.red);
        Sfx.coin();
        toast(this, `Phân giải ${f.name}: +${dv.stones} Đá Nâng Cấp${dv.soul ? `, +${dv.soul} Mảnh Linh Hồn` : ""}`, COLORS.green);
        this.selectedUid = null;
        this.render();
      },
    });
    dec.on("disabled-click", () => toast(this, "Cá đang khóa. Mở khóa để phân giải."));
    d.add(dec);
  }

  private renderSpecies(f: FishDef, seen: boolean) {
    const d = this.detailPanel();
    this.header(d, f, seen);
    if (!seen) {
      d.add(txt(this, 1058, 460, `Chưa câu được loài này.\nXuất hiện ở: ${f.zones.map((z) => ZONE_BY_ID.get(z)?.name).join(", ")}`, 18, { align: "center", wrap: 360, weight: "700", color: COLORS.textDim }).setOrigin(0.5));
      return;
    }
    d.add(txt(this, 876, 392, f.description, 16, { weight: "500", wrap: 366, color: COLORS.textDim }));
    this.statLines(d, f, 446);
  }
}
