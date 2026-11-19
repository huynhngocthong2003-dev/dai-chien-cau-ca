import Phaser from "phaser";
import { CHAR_RARITY_COLOR } from "@dccc/game-config";
import { RODS } from "@dccc/game-data";
import { nextRodAction, rodMaxLevel, rodStats, type RodDef } from "@dccc/shared";
import { GameState } from "../state/GameState.ts";
import { txt } from "../ui/widgets.ts";
import { COLORS } from "../ui/theme.ts";
import { hexToInt } from "../art/color.ts";
import { GearScene, unlockText, type DevInfo } from "./GearScene.ts";

function drawRod(g: Phaser.GameObjects.Graphics, rod: RodDef, x: number, y: number, len: number) {
  const x0 = x - len * 0.4;
  const y0 = y + len * 0.3;
  const x1 = x + len * 0.4;
  const y1 = y - len * 0.3;
  if (rod.visual.glow) g.lineStyle(len * 0.09, hexToInt(rod.visual.glow), 0.35).lineBetween(x0, y0, x1, y1);
  g.lineStyle(len * 0.06, 0x1b1530).lineBetween(x0, y0, x1, y1);
  g.lineStyle(len * 0.035, hexToInt(rod.visual.shaft)).lineBetween(x0, y0, x1, y1);
  g.lineStyle(len * 0.08, hexToInt(rod.visual.handle)).lineBetween(x0, y0, x0 + len * 0.18, y0 - len * 0.135);
  g.fillStyle(0x90a4ae).fillCircle(x0 + len * 0.2, y0 - len * 0.1, len * 0.05);
  g.lineStyle(2, 0x1b1530).strokeCircle(x0 + len * 0.2, y0 - len * 0.1, len * 0.05);
  g.lineStyle(1.5, hexToInt(rod.visual.line), 0.9).lineBetween(x1, y1, x1 + 2, y1 + len * 0.35);
}

export class RodScene extends GearScene<RodDef> {
  protected title = "Cần Câu";
  protected kind = "rods" as const;
  protected field = "selectedRodId" as const;
  protected cols = 5;

  constructor() {
    super("Rods");
  }

  protected items() {
    return RODS;
  }

  protected cardIcon(r: RodDef, x: number, y: number, w: number) {
    const g = this.add.graphics();
    drawRod(g, r, x, y, w * 0.8);
    return g;
  }

  protected cardBadge(r: RodDef) {
    const p = GameState.save.rods[r.id];
    return p ? `Lv.${p.level} ${"★".repeat(p.stars)}` : "";
  }

  protected devInfo(r: RodDef): DevInfo {
    const { action, cost } = nextRodAction(GameState.save, r);
    const label = { upgrade: "Nâng cấp", evolve: "Tiến hóa ★", max: null }[action];
    const msg = action === "evolve" ? `${r.name} tiến hóa! +10% chỉ số, mở thêm 10 cấp.` : `${r.name} lên cấp!`;
    return { label, cost, run: () => GameState.developRod(r), successMsg: msg };
  }

  protected renderInfo(d: Phaser.GameObjects.Container, r: RodDef, owned: boolean) {
    const prog = GameState.save.rods[r.id] ?? { level: 1, stars: 1 };
    const level = prog.level;
    const st = rodStats(r, prog);
    const g = this.add.graphics();
    drawRod(g, r, 1058, 200, 300);
    if (!owned) g.setAlpha(0.45);
    d.add(g);
    const rc = CHAR_RARITY_COLOR[r.rarity];
    d.add(txt(this, 872, 104, r.rarity, 26, { color: rc }));
    d.add(txt(this, 1058, 312, r.name, 30, { color: COLORS.textGold, align: "center" }).setOrigin(0.5));
    d.add(txt(this, 1058, 346, r.description, 16, { weight: "500", color: COLORS.textDim, align: "center", wrap: 370 }).setOrigin(0.5, 0));
    d.add(
      txt(
        this,
        872,
        394,
        `💪 Lực kéo ${st.pull}    🧵 Độ bền ${st.durability}\n🌀 Thu dây x${st.reelSpeed}    ✨ Cá hiếm +${st.rareRate}%\n🛡 Chống đứt ${st.antiSnap}%    Cấp ${level}/${rodMaxLevel(prog.stars)} ${"★".repeat(prog.stars)}`,
        17,
        { weight: "700" },
      ).setLineSpacing(4),
    );
    d.add(txt(this, 872, 488, `⭐ ${r.passive.name}`, 19, { color: "#80deea" }));
    d.add(txt(this, 872, 516, r.passive.description, 16, { weight: "500", wrap: 372 }));
    if (!owned) d.add(txt(this, 872, 580, `Mở khóa: ${unlockText(r.unlock)}`, 16, { color: COLORS.textGold, wrap: 372 }));
  }
}
