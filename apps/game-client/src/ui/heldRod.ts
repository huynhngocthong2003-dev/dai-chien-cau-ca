/**
 * CẦN CÂU NGƯỜI CHƠI ĐANG DÙNG – vẽ thu nhỏ trên tay nhân vật (phòng Boss Thế Giới…), cùng kiểu với màn câu cá:
 * thân cần thon màu riêng, hào quang & vân sét (cần xịn), quấn chỉ + khoen, tay cầm, máy câu và vật trang trí đầu cần.
 */
import Phaser from "phaser";
import type { RodDef } from "@dccc/shared";
import { ROD_BY_ID } from "@dccc/game-data";
import { ornamentTexture, reelTexture } from "../art/textures.ts";
import { hexToInt } from "../art/color.ts";
import { COLORS } from "./theme.ts";

type Pt = { x: number; y: number };

export class HeldRod extends Phaser.GameObjects.Container {
  readonly rod: RodDef;
  private g: Phaser.GameObjects.Graphics;
  private reel: Phaser.GameObjects.Image;
  private orn: Phaser.GameObjects.Image;
  /** Đầu cần (toạ độ trong container) sau lần vẽ gần nhất. */
  tip: Pt = { x: 0, y: 0 };

  /**
   * hand = chỗ nắm tay cầm, tip = đầu cần khi thẳng (toạ độ trong container), k = tỉ lệ thu nhỏ so với màn câu cá.
   */
  constructor(
    scene: Phaser.Scene,
    rodId: string | undefined,
    private hand: Pt,
    private rest: Pt,
    private k: number,
  ) {
    super(scene, 0, 0);
    this.rod = ROD_BY_ID.get(rodId ?? "") ?? ROD_BY_ID.get("r_tre")!;
    this.g = scene.add.graphics();
    this.reel = scene.add.image(hand.x + 3 * k, hand.y + 6 * k, reelTexture(scene, this.rod)).setScale(0.9 * k);
    this.orn = scene.add
      .image(0, 0, ornamentTexture(scene, this.rod))
      .setOrigin(0.5, 58 / 80)
      .setScale(k)
      .setVisible(this.rod.visual.ornament !== "none");
    this.add([this.g, this.reel, this.orn]);
    this.draw(0);
  }

  /** Vẽ lại cần; bend 0 = thẳng, 1 = cong mạnh (đang giật boss). */
  draw(bend: number) {
    const { g, rod, hand, k } = this;
    g.clear();
    const tip = { x: this.rest.x - bend * 26 * k * 2.2, y: this.rest.y + bend * 34 * k * 2.2 };
    this.tip = tip;
    const ctrl = { x: hand.x + (tip.x - hand.x) * 0.5 + bend * 18 * k, y: hand.y + (tip.y - hand.y) * 0.5 - 14 * k + bend * 10 * k };
    const pts = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(hand.x, hand.y), new Phaser.Math.Vector2(ctrl.x, ctrl.y), new Phaser.Math.Vector2(tip.x, tip.y)).getPoints(14);
    const n = pts.length - 1;
    const width = (i: number) => Math.max(1.2, (9 - (i / n) * 6.5) * k);
    if (rod.visual.glow) {
      g.lineStyle(16 * k, hexToInt(rod.visual.glow), 0.28);
      g.strokePoints(pts);
    }
    for (let i = 0; i < n; i++) {
      g.lineStyle(width(i) + 3 * k + 1, COLORS.outline, 1);
      g.lineBetween(pts[i]!.x, pts[i]!.y, pts[i + 1]!.x, pts[i + 1]!.y);
    }
    const shaft = hexToInt(rod.visual.shaft);
    for (let i = 0; i < n; i++) {
      g.lineStyle(width(i), shaft, 1);
      g.lineBetween(pts[i]!.x, pts[i]!.y, pts[i + 1]!.x, pts[i + 1]!.y);
    }
    if (rod.visual.veins) {
      g.lineStyle(Math.max(1, 2 * k), hexToInt(rod.visual.veins), 0.85);
      g.strokePoints(pts.slice(1, -1).map((p, i) => new Phaser.Math.Vector2(p.x + (i % 2 ? 1 : -1) * k, p.y)));
    }
    // quấn chỉ
    const wrap = hexToInt(rod.visual.wrap);
    for (const i of [4, 7, 10, 12]) {
      const p0 = pts[i]!;
      const p1 = pts[i + 1]!;
      g.lineStyle(width(i) + 1, wrap, 1);
      g.lineBetween(p0.x, p0.y, p0.x + (p1.x - p0.x) * 0.35, p0.y + (p1.y - p0.y) * 0.35);
    }
    // tay cầm nút bần
    g.lineStyle(16 * k + 1, COLORS.outline, 1);
    g.lineBetween(hand.x - 28 * k, hand.y + 28 * k, hand.x + 4 * k, hand.y - 2 * k);
    g.lineStyle(11 * k, hexToInt(rod.visual.handle), 1);
    g.lineBetween(hand.x - 26 * k, hand.y + 26 * k, hand.x + 2 * k, hand.y);
    // vật trang trí đầu cần xoay theo ngọn
    const last = pts[n]!;
    const prev = pts[n - 2]!;
    this.orn.setPosition(last.x, last.y).setRotation(Math.atan2(last.y - prev.y, last.x - prev.x) + Math.PI / 2);
  }

  /** Màu dây câu của cần này. */
  get lineColor(): number {
    return hexToInt(this.rod.visual.line);
  }
}
