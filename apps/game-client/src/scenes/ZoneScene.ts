import Phaser from "phaser";
import { FISH_RARITY_COLOR, FISH_RARITY_LABEL } from "@dccc/game-config";
import { FISH_BY_ID, ZONES } from "@dccc/game-data";
import { zoneBosses, type ZoneDef } from "@dccc/shared";
import { GameState } from "../state/GameState.ts";
import { fishSilhouetteTexture, fishTexture } from "../art/textures.ts";
import { Button, fadeIn, goTo, panel, toast, txt } from "../ui/widgets.ts";
import { TopBar } from "../ui/TopBar.ts";
import { COLORS } from "../ui/theme.ts";
import { elementBadge, elementTag } from "../ui/element.ts";
import { hexToInt } from "../art/color.ts";
import { tutorialGuide } from "../ui/tutorial.ts";

const NODE_POS: [number, number][] = [
  [120, 575],
  [300, 465],
  [150, 325],
  [330, 200],
  [545, 245],
  [600, 415],
  [440, 570],
];

export class ZoneScene extends Phaser.Scene {
  private detail?: Phaser.GameObjects.Container;
  private selected!: ZoneDef;

  constructor() {
    super("Zone");
  }

  create() {
    this.input.enabled = true;
    fadeIn(this);
    // nền biển bản đồ
    const g = this.add.graphics();
    g.fillGradientStyle(0x0d47a1, 0x0d47a1, 0x01579b, 0x002f6c, 1);
    g.fillRect(0, 0, 1280, 720);
    for (let i = 0; i < 40; i++) {
      g.lineStyle(2, 0xffffff, 0.08);
      const y = 100 + i * 16;
      g.beginPath();
      for (let x = 0; x <= 700; x += 20) g.lineTo(x, y + Math.sin(x / 40 + i) * 4);
      g.strokePath();
    }
    // đường nối
    g.lineStyle(6, 0xfff8e1, 0.5);
    for (let i = 0; i < NODE_POS.length - 1; i++) {
      const [x1, y1] = NODE_POS[i]!;
      const [x2, y2] = NODE_POS[i + 1]!;
      for (let t = 0; t < 1; t += 0.08) g.fillStyle(0xfff8e1, 0.6).fillCircle(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t + 40, 4);
    }
    new TopBar(this, { title: "Chọn Khu Vực", onBack: () => goTo(this, "Hub") });

    const s = GameState.save;
    ZONES.forEach((z, i) => {
      const [x, y] = NODE_POS[i]!;
      const unlocked = s.level >= z.requiredLevel;
      const island = this.add.graphics();
      island.fillStyle(0x000000, 0.3).fillEllipse(x + 4, y + 50, 150, 50);
      island.fillStyle(hexToInt(z.theme.ground), 1).fillEllipse(x, y + 40, 150, 56);
      island.fillStyle(hexToInt(z.theme.waterTop), 1).fillCircle(x, y, 52);
      island.lineStyle(4, COLORS.outline).strokeCircle(x, y, 52);
      island.lineStyle(4, unlocked ? hexToInt(z.theme.accent) : 0x607d8b).strokeCircle(x, y, 60);
      const boss = FISH_BY_ID.get(z.bossId)!;
      const icon = this.add.image(x, y, unlocked ? fishTexture(this, boss) : fishSilhouetteTexture(this, boss)).setScale(0.32);
      const name = txt(this, x, y + 70, z.name, 20, { align: "center" }).setOrigin(0.5);
      const req = txt(this, x, y + 94, unlocked ? `Độ khó ${"★".repeat(z.difficulty)}` : `🔒 Cấp ${z.requiredLevel}`, 16, {
        color: unlocked ? COLORS.textGold : COLORS.textDim,
        align: "center",
      }).setOrigin(0.5);
      // nguyên tố của khu (cá câu ở đây mang hệ này)
      elementBadge(this, x + 46, y - 42, z.element, 36);
      const hit = this.add.zone(x, y + 20, 170, 170).setInteractive({ useHandCursor: true });
      hit.on("pointerup", () => this.select(z));
      if (z.id === s.selectedZoneId) {
        this.tweens.add({ targets: icon, scale: 0.36, yoyo: true, repeat: -1, duration: 600 });
      }
      void name;
      void req;
    });
    // hướng dẫn tân thủ: chọn khu đầu tiên, chỉ vào nút Câu Cá
    const tut = GameState.tutorial;
    if (tut) {
      GameState.tutorialAdvance("go_fish");
      this.select(ZONES[0]!);
      window.setTimeout(() =>
        this.scene.isActive() && tutorialGuide(this, {
          title: "Chọn bến câu",
          text: `${ZONES[0]!.name} là bến dành cho Tân Thủ, cá dễ câu.\nBấm CÂU CÁ để bắt đầu!`,
          target: { x: 720 + 145, y: 92 + 566, w: 250, h: 72 },
        }),
      );
      return;
    }
    this.select(ZONES.find((z) => z.id === s.selectedZoneId) ?? ZONES[0]!);
  }

  private select(z: ZoneDef) {
    this.selected = z;
    this.detail?.destroy(true);
    const s = GameState.save;
    const unlocked = s.level >= z.requiredLevel;
    const c = this.add.container(0, 0);
    this.detail = c;
    const X = 720;
    const Y = 92;
    c.add(panel(this, X, Y, 540, 614, 0.95));
    c.add(txt(this, X + 270, Y + 34, z.name, 34, { color: COLORS.textGold, align: "center" }).setOrigin(0.5));
    c.add(txt(this, X + 24, Y + 64, z.description, 18, { wrap: 492, weight: "700", color: COLORS.textDim }));
    c.add(txt(this, X + 24, Y + 118, `Yêu cầu cấp ${z.requiredLevel} · Độ khó ${"★".repeat(z.difficulty)} · ${zoneBosses(z).length} Boss`, 17, { color: COLORS.textGold, wrap: 500 }));
    c.add(elementTag(this, X + 390, Y + 127, z.element, 30, 17));
    // danh sách cá
    c.add(txt(this, X + 24, Y + 148, "Cá trong khu vực (đã câu được sẽ hiện màu):", 17, { weight: "700" }));
    const list = [...z.spawn.map((sp) => sp.fishId), ...zoneBosses(z), ...(z.secretBossId ? [z.secretBossId] : [])];
    // nhiều cá (có thêm Boss phụ) → lưới 5 cột cho vừa
    const cols = list.length > 12 ? 5 : 4;
    const cw = cols === 5 ? 94 : 116;
    const step = cols === 5 ? 100 : 126;
    list.forEach((id, i) => {
      const f = FISH_BY_ID.get(id)!;
      const seen = (s.stats.species[id] ?? 0) > 0;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const fx = X + 24 + cw / 2 + col * step;
      const fy = Y + 212 + row * 96;
      const bg = this.add.graphics();
      bg.fillStyle(0x0a1628, 0.8).fillRoundedRect(fx - cw / 2, fy - 36, cw, 88, 12);
      bg.lineStyle(f.rarity === "boss" ? 3.5 : 2.5, hexToInt(FISH_RARITY_COLOR[f.rarity])).strokeRoundedRect(fx - cw / 2, fy - 36, cw, 88, 12);
      c.add(bg);
      c.add(this.add.image(fx, fy - 2, seen ? fishTexture(this, f) : fishSilhouetteTexture(this, f)).setDisplaySize(cw - 12, (cw - 12) * 0.625));
      c.add(
        txt(this, fx, fy + 38, seen ? f.name : id === z.secretBossId ? "✦ Siêu hiếm" : FISH_RARITY_LABEL[f.rarity], 13, {
          align: "center",
          color: FISH_RARITY_COLOR[f.rarity],
          weight: "700",
        }).setOrigin(0.5),
      );
    });
    GameState.refreshDaily();
    const tickets = GameState.save.materials.bossTickets;
    const btn = new Button(this, X + 145, Y + 566, 250, 72, unlocked ? "Câu Cá" : `Cần cấp ${z.requiredLevel}`, {
      color: COLORS.orange,
      fontSize: 30,
      disabled: !unlocked,
      onClick: () => {
        GameState.select("selectedZoneId", z.id);
        goTo(this, "Fishing", { zoneId: z.id });
      },
    });
    btn.on("disabled-click", () => toast(this, `Đạt cấp ${z.requiredLevel} để mở khóa ${z.name}. Câu thêm cá để lên cấp!`));
    const hunt = new Button(this, X + 400, Y + 566, 230, 72, "Săn Boss", {
      color: COLORS.red,
      fontSize: 26,
      sub: `🎫 Vé: ${tickets}`,
      disabled: !unlocked || tickets < 1,
      onClick: () => {
        GameState.select("selectedZoneId", z.id);
        goTo(this, "Fishing", { zoneId: z.id, bossHunt: true });
      },
    });
    hunt.on("disabled-click", () =>
      toast(this, !unlocked ? `Mở khóa khu vực ở cấp ${z.requiredLevel}` : "Hết Vé Boss. Vé hồi lên 3 mỗi ngày, hoặc nhận khi bắt cá Huyền Thoại/Thần Thoại."),
    );
    c.add(hunt);
    c.add(btn);
  }
}
