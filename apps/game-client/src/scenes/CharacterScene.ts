import Phaser from "phaser";
import { CHAR_RARITY_COLOR, TIER_COLOR } from "@dccc/game-config";
import { CHARACTERS, COSMETICS } from "@dccc/game-data";
import { charMaxLevel, characterStats, freeCopies, nextCharAction, scaledActiveSkill, type CharacterDef, type CosmeticSlot } from "@dccc/shared";
import { GameState } from "../state/GameState.ts";
import { auraTexture, characterHeadTexture, characterTexture, cosmeticTexture } from "../art/textures.ts";
import { Button, goTo, modal, toast, txt } from "../ui/widgets.ts";
import { addFashionFx } from "../art/fashionFx.ts";
import { Sfx } from "../audio/Sfx.ts";
import { COLORS } from "../ui/theme.ts";
import { GearScene, unlockText, type DevInfo } from "./GearScene.ts";

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
    return this.add.image(x, y + 4, characterHeadTexture(this, c, GameState.equipOf(c.id))).setDisplaySize(h * 0.78, h * 0.94);
  }

  protected cardBadge(c: CharacterDef) {
    const p = GameState.save.characters[c.id];
    if (!p) return "";
    return `Lv.${p.level}${p.breakthrough ? " " + "★".repeat(p.breakthrough) : ""}${p.awakened ? " ✦" : ""}`;
  }

  protected devInfo(c: CharacterDef): DevInfo {
    const { action, cost } = nextCharAction(GameState.save, c);
    const label = { upgrade: "Nâng cấp", breakthrough: "Đột phá ★", awaken: "THỨC TỈNH ✦", max: null }[action];
    const msg = { upgrade: `${c.name} lên cấp!`, breakthrough: `${c.name} đột phá! Mở thêm 10 cấp, kỹ năng mạnh hơn.`, awaken: `${c.name} đã THỨC TỈNH!`, max: "" }[action];
    return { label, cost, run: () => GameState.developCharacter(c), successMsg: msg };
  }

  protected renderInfo(d: Phaser.GameObjects.Container, c: CharacterDef, owned: boolean) {
    const prog = GameState.save.characters[c.id] ?? { level: 1, breakthrough: 0, awakened: false };
    const level = prog.level;
    const st = characterStats(c, prog);
    const skill = scaledActiveSkill(c.active, prog);
    d.add(this.add.image(960, 300, auraTexture(this, c)).setScale(prog.awakened ? 1 : 0.85).setAlpha(prog.awakened ? 1 : 0.6).setOrigin(0.5, 1));
    const img = this.add.image(960, 300, characterTexture(this, c, GameState.equipOf(c.id))).setScale(0.85).setOrigin(0.5, 1);
    if (!owned) img.setTint(0x333a44);
    d.add(img);
    if (owned) addFashionFx(this, img, 960, 188, 0.85, GameState.equipOf(c.id), 1, d);
    const rc = CHAR_RARITY_COLOR[c.rarity];
    if (owned) d.add(new Button(this, 912, 122, 104, 44, "👕 Đồ", { color: COLORS.purple, fontSize: 20, onClick: () => this.openWardrobe(c) }));
    d.add(txt(this, 1046, 112, c.rarity, 26, { color: rc }));
    d.add(txt(this, 1046, 142, c.name, 30, { color: COLORS.textGold, wrap: 210 }));
    d.add(txt(this, 1046, 182, c.title, 17, { weight: "700", color: COLORS.textDim, wrap: 210 }));
    d.add(
      txt(this, 1046, 214, `Cấp ${level}/${charMaxLevel(prog.breakthrough)} ${"★".repeat(prog.breakthrough)}${prog.awakened ? " ✦" : ""}\n❤ HP ${st.hp}\n💪 Lực kéo ${st.pull}\n⚡ Tốc độ ${st.speed}\n🍀 May mắn ${st.luck}`, 17, { weight: "700" }).setLineSpacing(2),
    );
    const info = [
      `🔥 ${c.active.name} (hồi ${(skill.cooldownMs / 1000).toFixed(1)}s)${prog.breakthrough || prog.awakened ? " ⬆" : ""}`,
      c.active.description,
      `🛡 ${c.passive.name}`,
      c.passive.description,
    ];
    d.add(txt(this, 872, 330, info[0]!, 19, { color: "#ce93d8", wrap: 372 }));
    d.add(txt(this, 872, 358, info[1]!, 16, { weight: "500", wrap: 372 }));
    d.add(txt(this, 872, 420, info[2]!, 19, { color: "#80deea", wrap: 372 }));
    d.add(txt(this, 872, 448, info[3]!, 16, { weight: "500", wrap: 372 }));
    d.add(txt(this, 872, 500, `"${c.lore}"`, 15, { weight: "500", color: COLORS.textDim, wrap: 372 }));
    if (!owned) d.add(txt(this, 872, 580, `Mở khóa: ${unlockText(c.unlock)}`, 16, { color: COLORS.textGold, wrap: 372 }));
    else if (prog.breakthrough || prog.awakened)
      d.add(txt(this, 872, 560, `Đột phá ${prog.breakthrough}/5: kỹ năng +${prog.breakthrough * 10}%${prog.awakened ? " · Thức tỉnh +20% chỉ số" : ""}`, 15, { color: "#b9f6ca", wrap: 372 }));
  }

  private openWardrobe(c: CharacterDef) {
    const m = modal(this, 1120, 640, `Tủ Đồ · ${c.name}`, () => this.render());
    const build = () => {
      const body = this.add.container(0, 0);
      m.root.add(body);
      const equip = GameState.equipOf(c.id);
      const hero = this.add.image(m.x + 150, m.y + 440, characterTexture(this, c, equip)).setOrigin(0.5, 1).setScale(1.1);
      body.add(hero);
      addFashionFx(this, hero, m.x + 150, m.y + 295, 1.1, equip, 1, body);
      const rows: { slot: CosmeticSlot; label: string }[] = [
        { slot: "hat", label: "Mũ" },
        { slot: "outfit", label: "Áo" },
        { slot: "accessory", label: "Trang sức" },
        { slot: "wings", label: "Cánh" },
        { slot: "horns", label: "Sừng" },
      ];
      rows.forEach((r, ri) => {
        const y = m.y + 110 + ri * 102;
        body.add(txt(this, m.x + 300, y, r.label, 19, { color: COLORS.textGold }).setOrigin(0, 0.5));
        const owned = COSMETICS.filter((it) => it.slot === r.slot && (GameState.save.wardrobe[it.id] ?? 0) > 0);
        const opts = [null, ...owned];
        opts.slice(0, 8).forEach((it, i) => {
          const x = m.x + 440 + i * 84;
          const on = (equip[r.slot] ?? null) === (it?.id ?? null);
          const usable = !it || on || freeCopies(GameState.save, it.id) > 0;
          const border = on ? 0x69f0ae : it ? Phaser.Display.Color.HexStringToColor(TIER_COLOR[it.tier]).color : 0x5fb3ff;
          const g = this.add.graphics();
          g.fillStyle(on ? 0x2a5a8a : 0x0a1628, 0.95).fillRoundedRect(x - 38, y - 44, 76, 92, 12);
          g.lineStyle(on ? 4 : 2.5, usable ? border : 0x455a64).strokeRoundedRect(x - 38, y - 44, 76, 92, 12);
          body.add(g);
          if (it) body.add(this.add.image(x, y - 6, cosmeticTexture(this, CHARACTERS[0]!, it.id)).setDisplaySize(62, 74).setAlpha(usable ? 1 : 0.4));
          else body.add(txt(this, x, y - 6, "✕", 30, { color: COLORS.textDim }).setOrigin(0.5));
          body.add(txt(this, x, y + 36, it ? it.name : "Không", 10, { align: "center", wrap: 72, weight: "700" }).setOrigin(0.5));
          const z = this.add.zone(x, y, 76, 92).setInteractive({ useHandCursor: true });
          z.on("pointerup", () => {
            Sfx.click();
            if (on) return;
            const res = GameState.equip(c.id, r.slot, it);
            if (!res.ok) return toast(this, res.error, COLORS.red);
            body.destroy(true);
            build();
          });
          body.add(z);
        });
        if (owned.length === 0) body.add(txt(this, m.x + 500, y, "Chưa có – mua ở Cửa Hàng", 15, { color: COLORS.textDim, weight: "700" }).setOrigin(0, 0.5));
      });
      body.add(new Button(this, m.x + 150, m.y + 560, 220, 56, "🛒 Cửa Hàng", { color: COLORS.orange, fontSize: 22, onClick: () => goTo(this, "Shop") }));
    };
    build();
  }
}
