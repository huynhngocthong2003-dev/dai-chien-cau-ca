import Phaser from "phaser";
import { menuBackdrop } from "../ui/backdrop.ts";
import { CHAR_RARITY_COLOR } from "@dccc/game-config";
import { canAfford, canUnlock, type CharRarity, type Cost, type UnlockCondition } from "@dccc/shared";
import { GameState } from "../state/GameState.ts";
import { Button, fadeIn, goTo, panel, toast, txt } from "../ui/widgets.ts";
import { TopBar } from "../ui/TopBar.ts";
import { COLORS } from "../ui/theme.ts";
import { hexToInt } from "../art/color.ts";
import { Sfx } from "../audio/Sfx.ts";
import { openGiftCode } from "../ui/giftCode.ts";

export interface DevInfo {
  /** Nhãn nút, ví dụ "Nâng cấp", "Đột phá". null = đã tối đa. */
  label: string | null;
  cost: Cost | null;
  run: () => { ok: true } | { ok: false; error: string };
  successMsg: string;
}

export function costText(c: Cost): string {
  const parts = [];
  if (c.gold) parts.push(`🪙 ${c.gold.toLocaleString("vi-VN")}`);
  if (c.stones) parts.push(`🔷 ${c.stones}`);
  if (c.soul) parts.push(`🔮 ${c.soul}`);
  return parts.join("   ");
}

export interface GearItem {
  id: string;
  name: string;
  rarity: CharRarity;
  unlock: UnlockCondition;
}

export function unlockText(u: UnlockCondition): string {
  switch (u.kind) {
    case "starter":
      return "Có sẵn từ đầu";
    case "level":
      return `Mở khóa ở cấp ${u.level}`;
    case "gold":
      return `${u.amount.toLocaleString("vi-VN")} vàng${u.level ? ` · cần cấp ${u.level}` : ""}`;
    case "gacha":
      return "Nhận từ Vòng Quay (Giai đoạn 3)";
    case "event":
      return "Phần thưởng sự kiện mùa giải";
    case "code":
      return "Nhập mã quà tặng (Cài Đặt → Mã quà)";
  }
}

/** Khung chung cho màn hình chọn nhân vật / cần câu. */
export abstract class GearScene<T extends GearItem> extends Phaser.Scene {
  protected selectedId!: string;
  private gridC?: Phaser.GameObjects.Container;
  protected detailC?: Phaser.GameObjects.Container;

  protected abstract title: string;
  protected abstract kind: "characters" | "rods";
  protected abstract field: "selectedCharacterId" | "selectedRodId";
  protected abstract items(): T[];
  protected abstract cols: number;
  protected abstract cardIcon(item: T, x: number, y: number, w: number, h: number): Phaser.GameObjects.GameObject;
  protected abstract renderInfo(d: Phaser.GameObjects.Container, item: T, owned: boolean): void;
  protected abstract devInfo(item: T): DevInfo;
  /** Nhãn nhỏ dưới tên trên thẻ (vd "Lv.12 ★★"). */
  protected abstract cardBadge(item: T): string;

  create() {
    this.input.enabled = true;
    fadeIn(this);
    menuBackdrop(this);
    new TopBar(this, { title: this.title, onBack: () => goTo(this, "Hub") });
    this.selectedId = GameState.save[this.field];
    this.render();
  }

  protected render() {
    this.gridC?.destroy(true);
    const c = this.add.container(0, 0);
    this.gridC = c;
    const owned = GameState.save[this.kind];
    const list = this.items();
    const cols = this.cols;
    const rows = Math.ceil(list.length / cols);
    const cw = Math.floor(820 / cols) - 8;
    const ch = Math.min(190, Math.floor(600 / rows) - 8);
    list.forEach((it, i) => {
      const x = 16 + (i % cols) * (cw + 8);
      const y = 96 + Math.floor(i / cols) * (ch + 8);
      const isOwned = !!owned[it.id];
      const equipped = GameState.save[this.field] === it.id;
      const sel = it.id === this.selectedId;
      const g = this.add.graphics();
      const rc = hexToInt(CHAR_RARITY_COLOR[it.rarity]);
      const top = Phaser.Display.Color.IntegerToColor(rc).clone().darken(25).color;
      // bóng đổ + nền chuyển màu theo độ hiếm + ánh bóng
      g.fillStyle(0x000000, 0.35).fillRoundedRect(x + 3, y + 5, cw, ch, 14);
      g.fillGradientStyle(top, top, sel ? 0x2a5a8a : 0x0d2340, sel ? 0x2a5a8a : 0x0d2340, 0.95);
      g.fillRoundedRect(x, y, cw, ch, 14);
      g.fillStyle(0xffffff, 0.12).fillRoundedRect(x + 5, y + 4, cw - 10, ch * 0.22, 10);
      g.lineStyle(sel ? 5 : 3, sel ? 0xffeb3b : rc).strokeRoundedRect(x, y, cw, ch, 14);
      g.lineStyle(2, 0x1b1530).strokeRoundedRect(x - 2, y - 2, cw + 4, ch + 4, 15);
      c.add(g);
      if (it.rarity === "UR" || it.rarity === "LR") {
        const glow = this.add.graphics();
        glow.lineStyle(6, rc, 0.6).strokeRoundedRect(x - 4, y - 4, cw + 8, ch + 8, 16);
        c.add(glow);
        this.tweens.add({ targets: glow, alpha: 0.15, duration: 800, yoyo: true, repeat: -1 });
      }
      const icon = this.cardIcon(it, x + cw / 2, y + ch * 0.45, cw, ch);
      if (!isOwned) (icon as unknown as Phaser.GameObjects.Components.Tint).setTint?.(0x333a44);
      c.add(icon);
      c.add(txt(this, x + 8, y + 4, it.rarity, 18, { color: CHAR_RARITY_COLOR[it.rarity] }));
      c.add(txt(this, x + cw / 2, y + ch - 16, it.name, 15, { align: "center", weight: "700" }).setOrigin(0.5));
      if (isOwned) c.add(txt(this, x + cw / 2, y + ch - 36, this.cardBadge(it), 14, { align: "center", color: COLORS.textGold }).setOrigin(0.5));
      if (equipped) c.add(txt(this, x + cw - 6, y + 4, "✔", 20, { color: "#69f0ae" }).setOrigin(1, 0));
      else if (!isOwned) c.add(txt(this, x + cw - 6, y + 4, "🔒", 18).setOrigin(1, 0));
      const z = this.add.zone(x + cw / 2, y + ch / 2, cw, ch).setInteractive({ useHandCursor: true });
      z.on("pointerup", () => {
        Sfx.click();
        this.selectedId = it.id;
        this.render();
      });
      c.add(z);
    });
    this.renderDetail();
  }

  private renderDetail() {
    this.detailC?.destroy(true);
    const d = this.add.container(0, 0);
    this.detailC = d;
    d.add(panel(this, 852, 92, 412, 614, 0.95));
    const it = this.items().find((x) => x.id === this.selectedId)!;
    const owned = !!GameState.save[this.kind][it.id];
    this.renderInfo(d, it, owned);
    const equipped = GameState.save[this.field] === it.id;
    let btn: Button;
    if (owned) {
      btn = new Button(this, 940, 664, 150, 62, equipped ? "Đang dùng" : "Sử dụng", {
        color: COLORS.green,
        fontSize: 22,
        disabled: equipped,
        onClick: () => {
          GameState.select(this.field, it.id);
          toast(this, `Đã chọn ${it.name}`);
          this.render();
        },
      });
      const dev = this.devInfo(it);
      if (dev.label && dev.cost) {
        const err = canAfford(GameState.save, dev.cost);
        d.add(txt(this, 1058, 616, costText(dev.cost), 18, { align: "center", color: err ? "#ff8a80" : COLORS.textGold }).setOrigin(0.5));
        const devBtn = new Button(this, 1140, 664, 230, 62, dev.label, {
          color: COLORS.orange,
          fontSize: 22,
          disabled: !!err,
          onClick: () => {
            const r = dev.run();
            if (!r.ok) return toast(this, r.error, COLORS.red);
            Sfx.levelUp();
            toast(this, dev.successMsg, COLORS.green);
            this.render();
          },
        });
        devBtn.on("disabled-click", () => toast(this, err ?? ""));
        d.add(devBtn);
      } else {
        d.add(txt(this, 1140, 664, "★ ĐÃ TỐI ĐA ★", 22, { align: "center", color: COLORS.textGold }).setOrigin(0.5));
      }
    } else {
      const chk = canUnlock(GameState.save, it.unlock);
      const label =
        it.unlock.kind === "gold"
          ? `Mua · ${it.unlock.amount.toLocaleString("vi-VN")} 🪙`
          : it.unlock.kind === "code"
            ? "🎁 Nhập mã quà tặng"
            : chk.ok
              ? "Mở khóa"
              : chk.reason;
      btn = new Button(this, 1058, 664, 330, 62, label, {
        color: it.unlock.kind === "code" ? COLORS.purple : COLORS.orange,
        fontSize: 22,
        disabled: !chk.ok && it.unlock.kind !== "code",
        onClick: () => {
          if (it.unlock.kind === "code") return openGiftCode(this, () => this.render());
          const r = GameState.unlock(this.kind, it.id, it.unlock);
          if (!r.ok) return toast(this, r.error, COLORS.red);
          Sfx.levelUp();
          toast(this, `Đã mở khóa ${it.name}!`, COLORS.green);
          this.render();
        },
      });
      btn.on("disabled-click", () => (it.unlock.kind === "code" ? openGiftCode(this, () => this.render()) : toast(this, chk.reason)));
    }
    d.add(btn);
  }
}
