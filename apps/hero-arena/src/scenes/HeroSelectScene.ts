import Phaser from "phaser";
import { HEROES, heroById, modsText, passiveText, ROLE_VI, type Gender } from "@hero-arena/core";
import { addHeroImage, breathe, skillIcon } from "../heroArt.ts";
import { getSave, persist } from "../state.ts";
import { button, H, hex, panel, text, W } from "../ui.ts";
import { centerMenu } from "../layout.ts";

export class HeroSelectScene extends Phaser.Scene {
  private heroId = "fighter";
  private gender: Gender = "male";
  private detail!: Phaser.GameObjects.Container;
  private cards: Array<{ id: string; frame: Phaser.GameObjects.Graphics; x: number; y: number }> = [];

  constructor() {
    super("HeroSelect");
  }

  create(): void {
    const s = getSave();
    if (s.lastHero && heroById(s.lastHero.heroId)) {
      this.heroId = s.lastHero.heroId;
    }
    const bg = this.add.image(W / 2, H / 2, "lobby_map");
    centerMenu(this, bg);
    this.add.rectangle(-W, -H, W * 3, H * 3, 0x070a14, 0.8).setOrigin(0);
    text(this, 30, 12, "CHỌN ANH HÙNG", 40, "#ffcf5a", 800);
    text(this, 372, 28, "10 lớp · mỗi lớp 3 dạng tiến hoá", 18, "#c8c0b0", 500);
    button(this, 1186, 40, 150, 50, "← Sảnh", () => this.scene.start("Lobby"), 0x4a4f5a, 22);
    this.cards = [];
    HEROES.forEach((h, i) => {
      const x = 22 + (i % 5) * 118;
      const y = 74 + Math.floor(i / 5) * 268;
      const g = this.add.graphics();
      g.fillStyle(0x131a2a, 0.95).fillRoundedRect(x, y, 112, 258, 10);
      const frame = this.add.graphics();
      breathe(this, addHeroImage(this, x + 56, y + 178, h.id, null, null, 0.72));
      text(this, x + 56, y + 184, h.nameVi, 20, "#ffe08a").setOrigin(0.5, 0);
      text(this, x + 56, y + 210, h.roleVi, 12, "#c8c0b0", 500).setOrigin(0.5, 0).setWordWrapWidth(104).setAlign("center");
      text(this, x + 56, y + 240, h.ranged ? "Tầm xa" : "Cận chiến", 12, h.ranged ? "#9ad8ff" : "#ffb0a0", 500).setOrigin(0.5, 0);
      this.add
        .zone(x, y, 112, 258)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => {
          this.heroId = h.id;
          this.refresh();
        });
      this.cards.push({ id: h.id, frame, x, y });
    });
    this.detail = this.add.container(0, 0);
    this.refresh();
  }

  private refresh(): void {
    for (const c of this.cards) {
      const sel = c.id === this.heroId;
      c.frame.clear();
      c.frame.lineStyle(sel ? 4 : 2, sel ? 0xffcf5a : 0x3a4458, 1).strokeRoundedRect(c.x, c.y, 112, 258, 10);
    }
    this.detail.removeAll(true);
    const h = heroById(this.heroId);
    if (!h) return;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.detail.add(o);
      return o;
    };
    add(panel(this, 618, 70, 646, 570));
    // Dạng 1
    breathe(this, add(addHeroImage(this, 680, 168, h.id, null, null, 0.56)));
    add(text(this, 720, 80, h.nameVi, 28, "#ffe08a"));
    add(text(this, 720, 116, `Dạng 1: ${h.baseNameVi} · Máu ${h.baseStats.hp} · Công ${h.baseStats.attackPower} · Tầm ${h.attackRange}`, 15, "#e8e0d0", 500));
    add(text(this, 720, 140, "Cấp 5 → chọn 1 trong 3 hướng Dạng 2 · Cấp 10 → 3 hướng Dạng 3 của hướng đó", 14, "#9ad8a0", 500));
    h.branches.forEach((br, i) => {
      const x = 636 + i * 208;
      const g = add(this.add.graphics());
      g.fillStyle(0x0b0f18, 0.7).fillRect(x, 176, 198, 452);
      g.lineStyle(2, br.color, 0.8).strokeRect(x, 176, 198, 452);
      breathe(this, add(addHeroImage(this, x + 99, 300, h.id, br.id, null, 0.78)));
      add(text(this, x + 99, 302, br.name, 21, hex(br.color)).setOrigin(0.5, 0));
      add(text(this, x + 99, 330, br.descVi, 13, "#d8d0c0", 500).setOrigin(0.5, 0).setWordWrapWidth(186).setAlign("center"));
      add(text(this, x + 99, 360, `${ROLE_VI[br.role]}: ${passiveText(br.passive.effect)}\n${modsText(br.mods)}`, 12, "#ffcf5a", 500).setOrigin(0.5, 0).setWordWrapWidth(186).setAlign("center"));
      br.skills.forEach((sk, j) => {
        add(this.add.image(x + 46 + j * 53, 424, skillIcon(this, sk.kind, br.color)).setDisplaySize(30, 30));
      });
      add(text(this, x + 8, 444, "Dạng 3 (cấp 10):", 12, "#a8a090", 500));
      br.evolutions.forEach((evo, j) => {
        const ex = x + 34 + j * 65;
        add(addHeroImage(this, ex, 550, h.id, br.id, evo.id, 0.46));
        add(text(this, ex, 554, evo.name, 11, `#${evo.color.toString(16).padStart(6, "0")}`, 500).setOrigin(0.5, 0).setWordWrapWidth(64).setAlign("center"));
      });
    });
    add(
      button(this, 1000, 676, 380, 56, "Tiếp tục → Mời bạn", () => {
        const s = getSave();
        s.lastHero = { heroId: this.heroId, gender: this.gender };
        persist();
        // vào màn mời bạn trước, người chơi tự bấm bắt đầu
        this.scene.start("Multiplayer", { auto: true });
      }, 0xc8461e, 26).root,
    );
  }
}
