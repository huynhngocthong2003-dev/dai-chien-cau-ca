import Phaser from "phaser";
import { CHAR_RARITY_COLOR } from "@dccc/game-config";
import { CHARACTERS, COSMETICS } from "@dccc/game-data";
import { charMaxLevel, characterStats, nextCharAction, scaledActiveSkill, type CharacterDef } from "@dccc/shared";
import { GameState } from "../state/GameState.ts";
import { auraTexture, characterHeadTexture, characterTexture } from "../art/textures.ts";
import { Button, goTo, modal, toast, txt } from "../ui/widgets.ts";
import { freeCopies, type CosmeticSlot } from "@dccc/shared";
import { cosmeticTexture } from "../art/textures.ts";
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
    const m = modal(this, 1080, 600, `Tủ Đồ · ${c.name}`, () => this.render());
    const build = () => {
      const body = this.add.container(0, 0);
      m.root.add(body);
      const equip = GameState.equipOf(c.id);
      body.add(this.add.image(m.x + 140, m.y + 420, characterTexture(this, c, equip)).setOrigin(0.5, 1).setScale(1.05));
      const rows: { slot: CosmeticSlot; label: string }[] = [
        { slot: "hat", label: "Mũ" },
        { slot: "outfit", label: "Áo" },
        { slot: "accessory", label: "Trang sức" },
      ];
      rows.forEach((r, ri) => {
        const y = m.y + 120 + ri * 150;
        body.add(txt(this, m.x + 290, y + 12, r.label, 20, { color: COLORS.textGold }).setOrigin(0, 0.5));
        const owned = COSMETICS.filter((it) => it.slot === r.slot && (GameState.save.wardrobe[it.id] ?? 0) > 0);
        const opts = [null, ...owned];
        opts.slice(0, 7).forEach((it, i) => {
          const x = m.x + 450 + i * 88;
          const on = (equip[r.slot] ?? null) === (it?.id ?? null);
          const usable = !it || on || freeCopies(GameState.save, it.id) > 0;
          const g = this.add.graphics();
          g.fillStyle(on ? 0x2a5a8a : 0x0a1628, 0.95).fillRoundedRect(x - 42, y - 40, 84, 104, 12);
          g.lineStyle(on ? 4 : 2, on ? 0x69f0ae : usable ? 0x5fb3ff : 0x455a64).strokeRoundedRect(x - 42, y - 40, 84, 104, 12);
          body.add(g);
          if (it) body.add(this.add.image(x, y + 4, cosmeticTexture(this, CHARACTERS[0]!, it.id)).setDisplaySize(70, 84).setAlpha(usable ? 1 : 0.4));
          else body.add(txt(this, x, y + 6, "✕", 34, { color: COLORS.textDim }).setOrigin(0.5));
          body.add(txt(this, x, y + 52, it ? it.name : "Không", 11, { align: "center", wrap: 80, weight: "700" }).setOrigin(0.5));
          const z = this.add.zone(x, y + 12, 84, 104).setInteractive({ useHandCursor: true });
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
        if (owned.length === 0) body.add(txt(this, m.x + 490, y + 4, "Chưa có món nào – mua ở Cửa Hàng", 16, { color: COLORS.textDim, weight: "700" }).setOrigin(0, 0.5));
      });
      body.add(new Button(this, m.x + 140, m.y + 500, 220, 56, "🛒 Cửa Hàng", { color: COLORS.orange, fontSize: 22, onClick: () => goTo(this, "Shop") }));
    };
    build();
  }
}
