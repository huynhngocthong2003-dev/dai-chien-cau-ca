import Phaser from "phaser";
import { PROGRESSION } from "@dccc/game-config";
import { CHARACTER_BY_ID } from "@dccc/game-data";
import type { PlayerSave } from "@dccc/shared";
import { GameState } from "../state/GameState.ts";
import { characterHeadTexture } from "../art/textures.ts";
import { Bar, Button, formatNum, txt } from "./widgets.ts";
import { COLORS } from "./theme.ts";

export interface TopBarOpts {
  title?: string;
  onBack?: () => void;
}

/** Thanh trên cùng: avatar, cấp, kinh nghiệm, vàng, kim cương, trạng thái lưu. */
export class TopBar extends Phaser.GameObjects.Container {
  private avatar!: Phaser.GameObjects.Image;
  private nameT!: Phaser.GameObjects.Text;
  private levelT!: Phaser.GameObjects.Text;
  private xpBar!: Bar;
  private goldT: Phaser.GameObjects.Text;
  private gemT: Phaser.GameObjects.Text;
  private stoneT: Phaser.GameObjects.Text;
  private soulT: Phaser.GameObjects.Text;
  private handler = (s: PlayerSave) => this.refresh(s);

  constructor(scene: Phaser.Scene, o: TopBarOpts = {}) {
    super(scene, 0, 0);
    const W = scene.scale.gameSize.width;
    const g = scene.add.graphics();
    g.fillStyle(0x071a33, 0.82).fillRect(0, 0, W, 76);
    g.fillStyle(0x5fb3ff, 0.5).fillRect(0, 74, W, 3);
    this.add(g);
    let x = 16;
    if (o.onBack) {
      this.add(new Button(scene, x + 46, 38, 92, 52, "← Về", { color: COLORS.blue, fontSize: 22, onClick: o.onBack }));
      x += 104;
    }
    if (o.title) {
      this.add(txt(scene, x, 38, o.title, 34, { color: COLORS.textGold }).setOrigin(0, 0.5));
    } else {
      const ring = scene.add.graphics();
      ring.fillStyle(0xffc107).fillCircle(x + 32, 38, 32);
      ring.lineStyle(3, COLORS.outline).strokeCircle(x + 32, 38, 32);
      this.add(ring);
      this.avatar = scene.add.image(x + 32, 40, "__DEFAULT").setDisplaySize(62, 74);
      const mask = scene.make.graphics({}).fillCircle(x + 32, 38, 29);
      this.avatar.setMask(mask.createGeometryMask());
      this.add(this.avatar);
      this.nameT = txt(scene, x + 74, 6, "", 22).setOrigin(0, 0);
      this.levelT = txt(scene, x + 74, 36, "", 18, { color: COLORS.textGold }).setOrigin(0, 0);
      this.xpBar = new Bar(scene, x + 140, 40, 150, 18, 0x7c4dff, "");
      this.add([this.nameT, this.levelT, this.xpBar]);
    }
    // tiền tệ + nguyên liệu
    const CW = 128;
    const chip = (cx: number, icon: string, color: number) => {
      const cg = scene.add.graphics();
      cg.fillStyle(0x0a1628, 0.9).fillRoundedRect(cx, 18, CW, 40, 20);
      cg.lineStyle(2.5, color).strokeRoundedRect(cx, 18, CW, 40, 20);
      const it = scene.add.text(cx + 6, 38, icon, { fontSize: "22px", padding: { top: 4 } }).setOrigin(0, 0.5);
      const t = txt(scene, cx + CW - 12, 38, "0", 20).setOrigin(1, 0.5);
      this.add([cg, it, t]);
      return t;
    };
    const x0 = W - 16 - 4 * CW - 3 * 8;
    this.goldT = chip(x0, "🪙", COLORS.gold);
    this.gemT = chip(x0 + (CW + 8), "💎", COLORS.diamond);
    this.stoneT = chip(x0 + 2 * (CW + 8), "🔷", 0x7c4dff);
    this.soulT = chip(x0 + 3 * (CW + 8), "🔮", 0xea80fc);
    const storage = GameState.storage.kind === "cloud" ? "☁️ Đám mây" : "💾 Trên máy";
    this.add(txt(scene, x0 - 10, 38, storage, 15, { color: COLORS.textDim, weight: "700" }).setOrigin(1, 0.5));
    this.setDepth(500);
    scene.add.existing(this);
    this.refresh(GameState.save);
    GameState.on("changed", this.handler);
    this.once(Phaser.GameObjects.Events.DESTROY, () => GameState.off("changed", this.handler));
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  refresh(s: PlayerSave) {
    this.goldT.setText(formatNum(s.gold));
    this.gemT.setText(formatNum(s.diamonds));
    this.stoneT.setText(formatNum(s.materials.stones));
    this.soulT.setText(formatNum(s.materials.soul));
    if (this.nameT) {
      const c = CHARACTER_BY_ID.get(s.selectedCharacterId)!;
      this.avatar.setTexture(characterHeadTexture(this.scene, c)).setDisplaySize(62, 74);
      this.nameT.setText(s.name);
      this.levelT.setText(`Cấp ${s.level}`);
      const need = PROGRESSION.xpToNext(s.level);
      this.xpBar.set(s.xp / need);
      this.xpBar.label?.setText(`${formatNum(s.xp)}/${formatNum(need)}`);
    }
  }
}
