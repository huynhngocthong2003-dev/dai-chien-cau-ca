import Phaser from "phaser";
import { TIER_COLOR, TIER_LABEL } from "@dccc/game-config";
import { CHARACTER_BY_ID, COSMETICS, SHOP_ITEMS } from "@dccc/game-data";
import { SELL_BACK_RATE, freeCopies, type CosmeticDef, type CosmeticSlot, type ShopItemDef } from "@dccc/shared";
import { GameState } from "../state/GameState.ts";
import { characterTexture, cosmeticTexture } from "../art/textures.ts";
import { addFashionFx } from "../art/fashionFx.ts";
import { Button, fadeIn, formatNum, goTo, panel, toast, txt } from "../ui/widgets.ts";
import { TopBar } from "../ui/TopBar.ts";
import { COLORS } from "../ui/theme.ts";
import { hexToInt } from "../art/color.ts";
import { Sfx } from "../audio/Sfx.ts";

type Tab = CosmeticSlot | "items" | "market";

const TABS: { id: Tab; label: string }[] = [
  { id: "hat", label: "🎩 Mũ" },
  { id: "outfit", label: "👕 Áo" },
  { id: "accessory", label: "💍 Trang Sức" },
  { id: "wings", label: "🪽 Cánh" },
  { id: "horns", label: "🦄 Sừng" },
  { id: "items", label: "🎁 Vật Phẩm" },
  { id: "market", label: "🤝 Chợ" },
];

function priceText(p: { currency: "gold" | "diamonds"; amount: number }) {
  return `${p.currency === "gold" ? "🪙" : "💎"} ${formatNum(p.amount)}`;
}

/** Cửa hàng: trang phục, trang sức, vật phẩm; phòng thử đồ bên phải. */
export class ShopScene extends Phaser.Scene {
  private tab: Tab = "hat";
  private selected: string | null = null;
  private body?: Phaser.GameObjects.Container;
  private tabBtns: Button[] = [];

  constructor() {
    super("Shop");
  }

  init(data: { tab?: Tab }) {
    this.tab = data.tab ?? "hat";
    this.selected = null;
  }

  create() {
    this.input.enabled = true;
    fadeIn(this);
    this.add.rectangle(0, 0, 1280, 720, 0x0b2a4a).setOrigin(0);
    new TopBar(this, { title: "Cửa Hàng", onBack: () => goTo(this, "Hub") });
    this.tabBtns = TABS.map(
      (t, i) =>
        new Button(this, 74 + i * 118, 116, 112, 50, t.label, {
          color: COLORS.blue,
          fontSize: 17,
          onClick: () => {
            this.tab = t.id;
            this.selected = null;
            this.render();
          },
        }),
    );
    this.render();
  }

  private render() {
    TABS.forEach((t, i) => this.tabBtns[i]!.setColor(t.id === this.tab ? COLORS.orange : COLORS.blue));
    this.body?.destroy(true);
    const c = this.add.container(0, 0);
    this.body = c;
    if (this.tab === "market") return this.renderMarket(c);
    if (this.tab === "items") return this.renderItems(c);
    const list = COSMETICS.filter((it) => it.slot === this.tab);
    if (!this.selected || !list.some((x) => x.id === this.selected)) this.selected = list[0]!.id;
    list.forEach((it, i) => {
      const x = 16 + (i % 5) * 165;
      const y = 152 + Math.floor(i / 5) * 278;
      const owned = GameState.save.wardrobe[it.id] ?? 0;
      const tc = TIER_COLOR[it.tier];
      this.card(c, x, y, 158, 268, it.id === this.selected, tc, () => {
        this.selected = it.id;
        this.render();
      });
      const icon = this.add.image(x + 79, y + 118, cosmeticTexture(this, CHARACTER_BY_ID.get("c_be_tom")!, it.id)).setDisplaySize(132, 158);
      c.add(icon);
      if (it.tier === "divine" || it.tier === "legendary") this.tweens.add({ targets: icon, y: y + 112, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      c.add(txt(this, x + 8, y + 6, TIER_LABEL[it.tier], 15, { color: tc }));
      if (owned) c.add(txt(this, x + 150, y + 6, `×${owned}`, 16, { color: "#69f0ae" }).setOrigin(1, 0));
      c.add(txt(this, x + 79, y + 214, it.name, 15, { align: "center", wrap: 150 }).setOrigin(0.5));
      c.add(txt(this, x + 79, y + 248, priceText(it.price), 17, { align: "center", color: COLORS.textGold }).setOrigin(0.5));
    });
    this.renderCosmeticDetail(c, COSMETICS.find((x) => x.id === this.selected)!);
  }

  private card(c: Phaser.GameObjects.Container, x: number, y: number, w: number, h: number, sel: boolean, color: string, onClick: () => void) {
    const g = this.add.graphics();
    g.fillStyle(sel ? 0x2a5a8a : 0x10294a, 0.95).fillRoundedRect(x, y, w, h, 16);
    g.fillStyle(hexToInt(color), 0.18).fillRoundedRect(x, y, w, h * 0.4, 16);
    g.lineStyle(sel ? 4 : 3, hexToInt(color)).strokeRoundedRect(x, y, w, h, 16);
    c.add(g);
    const z = this.add.zone(x + w / 2, y + h / 2, w, h).setInteractive({ useHandCursor: true });
    z.on("pointerup", () => {
      Sfx.click();
      onClick();
    });
    c.add(z);
  }

  private renderCosmeticDetail(c: Phaser.GameObjects.Container, it: CosmeticDef) {
    const s = GameState.save;
    const char = CHARACTER_BY_ID.get(s.selectedCharacterId)!;
    const equip = { ...GameState.equipOf(char.id), [it.slot]: it.id };
    c.add(panel(this, 852, 152, 412, 554, 0.95));
    c.add(txt(this, 1058, 176, "Phòng thử đồ", 18, { color: COLORS.textDim, align: "center" }).setOrigin(0.5));
    const img = this.add.image(1058, 400, characterTexture(this, char, equip)).setOrigin(0.5, 1).setScale(0.95);
    c.add(img);
    addFashionFx(this, img, 1058, 290, 0.95, equip, 0, c);
    this.tweens.add({ targets: img, scaleY: 0.98, duration: 800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    c.add(txt(this, 1058, 420, `${it.name} · ${TIER_LABEL[it.tier]}`, 20, { color: TIER_COLOR[it.tier], align: "center", wrap: 390 }).setOrigin(0.5));
    c.add(txt(this, 1058, 452, it.description, 17, { align: "center", wrap: 380, weight: "700" }).setOrigin(0.5));
    const owned = s.wardrobe[it.id] ?? 0;
    const free = freeCopies(s, it.id);
    const wearing = GameState.equipOf(char.id)[it.slot] === it.id;
    c.add(txt(this, 1058, 486, `Đang có: ${owned} · ${char.name} ${wearing ? "đang mặc" : "chưa mặc"}`, 15, { align: "center", color: COLORS.textDim }).setOrigin(0.5));
    const buy = new Button(this, 1058, 538, 330, 58, `Mua · ${priceText(it.price)}`, {
      color: COLORS.orange,
      fontSize: 22,
      onClick: () => {
        const r = GameState.buyCosmetic(it);
        if (!r.ok) return toast(this, r.error, COLORS.red);
        Sfx.coin();
        toast(this, `Đã mua ${it.name}! Bấm "Mặc" để thử ngay.`, COLORS.green);
        this.render();
      },
    });
    c.add(buy);
    const wear = new Button(this, 966, 608, 160, 54, wearing ? "Tháo ra" : "Mặc", {
      color: COLORS.green,
      fontSize: 22,
      disabled: !wearing && free < 1,
      onClick: () => {
        const r = GameState.equip(char.id, it.slot, wearing ? null : it);
        if (!r.ok) return toast(this, r.error, COLORS.red);
        toast(this, wearing ? `${char.name} đã tháo ${it.name}` : `${char.name} đã mặc ${it.name}`);
        this.render();
      },
    });
    wear.on("disabled-click", () => toast(this, owned ? "Nhân vật khác đang mặc hết số món này" : "Hãy mua trước khi mặc"));
    c.add(wear);
    const refund = Math.floor(it.price.amount * SELL_BACK_RATE);
    const sell = new Button(this, 1150, 608, 190, 54, `Bán ${it.price.currency === "gold" ? "🪙" : "💎"}${formatNum(refund)}`, {
      color: COLORS.blue,
      fontSize: 20,
      disabled: free < 1,
      onClick: () => {
        const r = GameState.sellCosmetic(it);
        if (!r.ok) return toast(this, r.error, COLORS.red);
        Sfx.coin();
        toast(this, `Đã bán ${it.name}`, COLORS.green);
        this.render();
      },
    });
    sell.on("disabled-click", () => toast(this, owned ? "Hãy tháo ra trước khi bán" : "Bạn chưa có món này"));
    c.add(sell);
    c.add(txt(this, 1058, 668, "Đổi đồ cho nhân vật khác: chọn nhân vật ở mục Nhân Vật", 13, { align: "center", color: COLORS.textDim }).setOrigin(0.5));
  }

  private renderItems(c: Phaser.GameObjects.Container) {
    if (!this.selected || !SHOP_ITEMS.some((x) => x.id === this.selected)) this.selected = SHOP_ITEMS[0]!.id;
    SHOP_ITEMS.forEach((it, i) => {
      const x = 16 + (i % 4) * 206;
      const y = 152 + Math.floor(i / 4) * 274;
      this.card(c, x, y, 198, 264, it.id === this.selected, it.price.currency === "gold" ? "#ffc107" : "#40c4ff", () => {
        this.selected = it.id;
        this.render();
      });
      c.add(this.add.text(x + 99, y + 96, it.icon, { fontSize: "86px", padding: { top: 12 } }).setOrigin(0.5));
      c.add(txt(this, x + 99, y + 196, it.name, 18, { align: "center", wrap: 186 }).setOrigin(0.5));
      c.add(txt(this, x + 99, y + 240, priceText(it.price), 20, { align: "center", color: COLORS.textGold }).setOrigin(0.5));
    });
    const it = SHOP_ITEMS.find((x) => x.id === this.selected)!;
    this.renderItemDetail(c, it);
  }

  private renderItemDetail(c: Phaser.GameObjects.Container, it: ShopItemDef) {
    c.add(panel(this, 852, 152, 412, 554, 0.95));
    c.add(this.add.text(1058, 290, it.icon, { fontSize: "140px", padding: { top: 20 } }).setOrigin(0.5));
    c.add(txt(this, 1058, 420, it.name, 28, { color: COLORS.textGold, align: "center", wrap: 380 }).setOrigin(0.5));
    c.add(txt(this, 1058, 470, it.description, 18, { align: "center", wrap: 380, weight: "700" }).setOrigin(0.5));
    c.add(
      new Button(this, 1058, 600, 330, 66, `Mua · ${priceText(it.price)}`, {
        color: COLORS.orange,
        fontSize: 24,
        onClick: () => {
          const r = GameState.buyItem(it);
          if (!r.ok) return toast(this, r.error, COLORS.red);
          Sfx.coin();
          toast(this, `Đã mua ${it.name}`, COLORS.green);
          this.render();
        },
      }),
    );
  }

  private renderMarket(c: Phaser.GameObjects.Container) {
    c.add(panel(this, 140, 160, 1000, 520, 0.95));
    c.add(txt(this, 640, 210, "🤝 Chợ Giao Dịch Giữa Người Chơi", 34, { color: COLORS.textGold, align: "center" }).setOrigin(0.5));
    const lines = [
      "Sắp mở ở Giai đoạn 4, khi game có tài khoản online và server.",
      "",
      "• Đăng bán quần áo, trang sức cho người chơi khác, đặt giá bằng vàng hoặc kim cương.",
      "• Trao đổi trực tiếp 1-đổi-1 với bạn bè, cả hai cùng xác nhận.",
      "• Lịch sử giao dịch, phí chợ nhỏ để chống đầu cơ.",
      "",
      "Vì sao chưa mở ngay? Giao dịch giữa người chơi phải do server kiểm soát",
      "(chuyển đồ và tiền cùng lúc, kiểm tra quyền sở hữu, chống lừa đảo và",
      "chống tạo đồ giả). Làm trên trình duyệt sẽ rất dễ bị gian lận.",
      "",
      "Hiện tại: mua đồ ở các tab bên cạnh và bán lại cho cửa hàng với giá 50%.",
    ];
    c.add(txt(this, 200, 260, lines.join("\n"), 20, { weight: "700", wrap: 880 }).setLineSpacing(6));
  }
}
