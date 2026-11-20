import Phaser from "phaser";
import { CHAR_RARITY_COLOR } from "@dccc/game-config";
import { RODS } from "@dccc/game-data";
import { nextRodAction, rodMaxLevel, rodMaxUses, rodRepairCost, rodStats, rodUsesLeft, type RodDef } from "@dccc/shared";
import { GameState } from "../state/GameState.ts";
import { rodIconTexture } from "../art/textures.ts";
import { Button, formatNum, toast, txt } from "../ui/widgets.ts";
import { Sfx } from "../audio/Sfx.ts";
import { COLORS } from "../ui/theme.ts";
import { hexToInt } from "../art/color.ts";
import { GearScene, unlockText, type DevInfo } from "./GearScene.ts";

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

  protected cardIcon(r: RodDef, x: number, y: number, w: number, h: number) {
    const img = this.add.image(x, y, rodIconTexture(this, r)).setDisplaySize(Math.min(w, h) * 0.85, Math.min(w, h) * 0.85);
    if (r.visual.glow) this.tweens.add({ targets: img, alpha: 0.82, duration: 900, yoyo: true, repeat: -1 });
    return img;
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
    const img = this.add.image(1058, 200, rodIconTexture(this, r)).setDisplaySize(260, 260);
    if (!owned) img.setTint(0x555a66);
    d.add(img);
    if (r.visual.glow && owned) {
      const tip = this.add
        .particles(1058 + 95, 200 - 95, "p_spark", {
          speed: { min: 20, max: 70 },
          lifespan: 900,
          frequency: 120,
          scale: { start: 0.6, end: 0 },
          tint: hexToInt(r.visual.glow),
          blendMode: Phaser.BlendModes.ADD,
        });
      d.add(tip);
    }
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
    else {
      // độ bền: lượt câu còn lại + sửa cần
      const p = GameState.save.rods[r.id]!;
      const left = rodUsesLeft(r, p);
      const max = rodMaxUses(r, p);
      const cost = rodRepairCost(r, p);
      d.add(txt(this, 872, 590, `🔧 Lượt câu: ${left}/${max}`, 18, { color: left === 0 ? "#ff5252" : left <= max * 0.15 ? "#ffd740" : "#b2ebf2" }).setOrigin(0, 0.5));
      if (cost > 0)
        d.add(
          new Button(this, 1170, 590, 170, 42, `Sửa · ${formatNum(cost)}🪙`, {
            color: left === 0 ? COLORS.red : COLORS.green,
            fontSize: 17,
            onClick: () => {
              const res = GameState.repairRod(r.id);
              if (!res.ok) return toast(this, res.error, COLORS.red);
              Sfx.coin();
              toast(this, `${r.name} đã được sửa – đầy ${max} lượt câu!`, COLORS.green);
              this.scene.restart();
            },
          }),
        );
    }
  }
}
