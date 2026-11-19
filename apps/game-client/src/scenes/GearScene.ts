import Phaser from "phaser";
import { CHAR_RARITY_COLOR } from "@dccc/game-config";
import { canUnlock, type CharRarity, type UnlockCondition } from "@dccc/shared";
import { GameState } from "../state/GameState.ts";
import { Button, fadeIn, goTo, panel, toast, txt } from "../ui/widgets.ts";
import { TopBar } from "../ui/TopBar.ts";
import { COLORS } from "../ui/theme.ts";
import { hexToInt } from "../art/color.ts";
import { Sfx } from "../audio/Sfx.ts";

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

  create() {
    this.input.enabled = true;
    fadeIn(this);
    this.add.rectangle(0, 0, 1280, 720, 0x0b2a4a).setOrigin(0);
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
      g.fillStyle(sel ? 0x2a5a8a : 0x10294a, 0.95).fillRoundedRect(x, y, cw, ch, 14);
      g.fillStyle(rc, 0.25).fillRoundedRect(x, y, cw, ch * 0.35, 14);
      g.lineStyle(sel ? 4 : 3, rc).strokeRoundedRect(x, y, cw, ch, 14);
      c.add(g);
      const icon = this.cardIcon(it, x + cw / 2, y + ch * 0.45, cw, ch);
      if (!isOwned) (icon as unknown as Phaser.GameObjects.Components.Tint).setTint?.(0x333a44);
      c.add(icon);
      c.add(txt(this, x + 8, y + 4, it.rarity, 18, { color: CHAR_RARITY_COLOR[it.rarity] }));
      c.add(txt(this, x + cw / 2, y + ch - 16, it.name, 15, { align: "center", weight: "700" }).setOrigin(0.5));
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
      btn = new Button(this, 1058, 664, 300, 62, equipped ? "Đang sử dụng" : "Sử dụng", {
        color: COLORS.green,
        fontSize: 26,
        disabled: equipped,
        onClick: () => {
          GameState.select(this.field, it.id);
          toast(this, `Đã chọn ${it.name}`);
          this.render();
        },
      });
    } else {
      const chk = canUnlock(GameState.save, it.unlock);
      const label = it.unlock.kind === "gold" ? `Mua · ${it.unlock.amount.toLocaleString("vi-VN")} 🪙` : chk.ok ? "Mở khóa" : chk.reason;
      btn = new Button(this, 1058, 664, 330, 62, label, {
        color: COLORS.orange,
        fontSize: 22,
        disabled: !chk.ok,
        onClick: () => {
          const r = GameState.unlock(this.kind, it.id, it.unlock);
          if (!r.ok) return toast(this, r.error, COLORS.red);
          Sfx.levelUp();
          toast(this, `Đã mở khóa ${it.name}!`, COLORS.green);
          this.render();
        },
      });
      btn.on("disabled-click", () => toast(this, chk.reason));
    }
    d.add(btn);
  }
}
