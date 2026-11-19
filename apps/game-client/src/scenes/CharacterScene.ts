import Phaser from "phaser";
import { CHAR_RARITY_COLOR } from "@dccc/game-config";
import { CHARACTERS } from "@dccc/game-data";
import { characterStats, type CharacterDef } from "@dccc/shared";
import { GameState } from "../state/GameState.ts";
import { auraTexture, characterHeadTexture, characterTexture } from "../art/textures.ts";
import { txt } from "../ui/widgets.ts";
import { COLORS } from "../ui/theme.ts";
import { GearScene, unlockText } from "./GearScene.ts";

export class CharacterScene extends GearScene<CharacterDef> {
  protected title = "Nhân Vật";
  protected kind = "characters" as const;
  protected field = "selectedCharacterId" as const;
  protected cols = 4;

  constructor() {
    super("Characters");
  }

  protected items() {
    return CHARACTERS;
  }

  protected cardIcon(c: CharacterDef, x: number, y: number, _w: number, h: number) {
    return this.add.image(x, y + 4, characterHeadTexture(this, c)).setDisplaySize(h * 0.78, h * 0.94);
  }

  protected renderInfo(d: Phaser.GameObjects.Container, c: CharacterDef, owned: boolean) {
    const level = GameState.save.characters[c.id]?.level ?? 1;
    const st = characterStats(c, level);
    d.add(this.add.image(960, 300, auraTexture(this, c)).setScale(0.85).setAlpha(0.6).setOrigin(0.5, 1));
    const img = this.add.image(960, 300, characterTexture(this, c)).setScale(0.85).setOrigin(0.5, 1);
    if (!owned) img.setTint(0x333a44);
    d.add(img);
    const rc = CHAR_RARITY_COLOR[c.rarity];
    d.add(txt(this, 1046, 112, c.rarity, 26, { color: rc }));
    d.add(txt(this, 1046, 142, c.name, 30, { color: COLORS.textGold, wrap: 210 }));
    d.add(txt(this, 1046, 182, c.title, 17, { weight: "700", color: COLORS.textDim, wrap: 210 }));
    d.add(
      txt(this, 1046, 214, `Cấp ${level}\n❤ HP ${st.hp}\n💪 Lực kéo ${st.pull}\n⚡ Tốc độ ${st.speed}\n🍀 May mắn ${st.luck}`, 17, { weight: "700" }).setLineSpacing(2),
    );
    const info = [
      `🔥 ${c.active.name} (hồi ${c.active.cooldownMs / 1000}s)`,
      c.active.description,
      `🛡 ${c.passive.name}`,
      c.passive.description,
    ];
    d.add(txt(this, 872, 330, info[0]!, 19, { color: "#ce93d8", wrap: 372 }));
    d.add(txt(this, 872, 358, info[1]!, 16, { weight: "500", wrap: 372 }));
    d.add(txt(this, 872, 420, info[2]!, 19, { color: "#80deea", wrap: 372 }));
    d.add(txt(this, 872, 448, info[3]!, 16, { weight: "500", wrap: 372 }));
    d.add(txt(this, 872, 506, `"${c.lore}"`, 15, { weight: "500", color: COLORS.textDim, wrap: 372 }));
    d.add(txt(this, 872, 580, `Mở khóa: ${unlockText(c.unlock)}`, 16, { color: COLORS.textGold, wrap: 372 }));
  }
}
