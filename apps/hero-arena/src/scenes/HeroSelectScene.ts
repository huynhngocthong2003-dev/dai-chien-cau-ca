import Phaser from "phaser";
import { HEROES, heroById, type Gender } from "@hero-arena/core";
import { heroTexture } from "../art.ts";
import { getSave, persist } from "../state.ts";
import { button, H, hex, panel, text, W } from "../ui.ts";

export class HeroSelectScene extends Phaser.Scene {
  private heroId = "mage";
  private gender: Gender = "male";
  private detail!: Phaser.GameObjects.Container;
  private cards: Array<{ id: string; frame: Phaser.GameObjects.Rectangle; img: Phaser.GameObjects.Image }> = [];

  constructor() {
    super("HeroSelect");
  }

  create(): void {
    const s = getSave();
    if (s.lastHero) {
      this.heroId = s.lastHero.heroId;
      this.gender = s.lastHero.gender;
    }
    this.add.rectangle(0, 0, W, H, 0x0d1320).setOrigin(0);
    const bg = this.add.image(W / 2, H / 2, "lobby_map").setAlpha(0.18);
    bg.setScale(Math.max(W / bg.width, H / bg.height));
    text(this, 40, 20, "CHỌN ANH HÙNG & GIỚI TÍNH", 38, "#ffb347", 800);
    button(this, 1180, 44, 150, 52, "← Sảnh", () => this.scene.start("Lobby"), 0x4a4f5a, 22);
    this.cards = [];
    HEROES.forEach((h, i) => {
      const x = 40 + (i % 4) * 150;
      const y = 90 + Math.floor(i / 4) * 250;
      const frame = this.add.rectangle(x, y, 138, 236, 0x151c2b, 0.95).setOrigin(0).setStrokeStyle(3, 0x3a4458);
      frame.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
        this.heroId = h.id;
        this.refresh();
      });
      const img = this.add.image(x + 69, y + 120, heroTexture(this, h.id, null, this.gender)).setScale(1.7).setOrigin(0.5, 0.92);
      text(this, x + 69, y + 150, h.nameVi, 24, "#ffe08a").setOrigin(0.5, 0);
      text(this, x + 69, y + 182, h.roleVi, 15, "#c8c0b0", 500).setOrigin(0.5, 0);
      text(this, x + 69, y + 204, h.ranged ? "Tầm xa" : "Cận chiến", 14, h.ranged ? "#9ad8ff" : "#ffb0a0", 500).setOrigin(0.5, 0);
      this.cards.push({ id: h.id, frame, img });
    });
    button(this, 150, 640, 200, 60, "♂ Nam", () => {
      this.gender = "male";
      this.refresh();
    }, 0x2f5f8f);
    button(this, 370, 640, 200, 60, "♀ Nữ", () => {
      this.gender = "female";
      this.refresh();
    }, 0x8f2f6a);
    this.detail = this.add.container(0, 0);
    this.refresh();
  }

  private refresh(): void {
    for (const c of this.cards) {
      const sel = c.id === this.heroId;
      c.frame.setStrokeStyle(sel ? 5 : 3, sel ? 0xffb347 : 0x3a4458);
      c.img.setTexture(heroTexture(this, c.id, null, this.gender));
    }
    this.detail.removeAll(true);
    const h = heroById(this.heroId);
    if (!h) return;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.detail.add(o);
      return o;
    };
    add(panel(this, 650, 90, 600, 520));
    add(this.add.image(740, 290, heroTexture(this, h.id, null, this.gender)).setScale(2.6).setOrigin(0.5, 0.92));
    add(text(this, 840, 104, `${h.nameVi} (${h.name}) · ${this.gender === "male" ? "Nam" : "Nữ"}`, 28, "#ffe08a"));
    const b = h.baseStats;
    add(text(this, 840, 146, `Máu ${b.hp} · Năng lượng ${b.mana}\nCông ${b.attackPower} · Tốc chạy ${b.moveSpeed}\nTầm đánh ${h.attackRange}\nKỹ năng đầu: ${h.baseSkill.nameVi}`, 19, "#e8e0d0", 500));
    add(text(this, 670, 310, "Nhánh chuyên môn (khóa ở cấp 5):", 21, "#ffb347"));
    h.branches.forEach((br, i) => {
      const y = 346 + i * 86;
      add(this.add.image(700, y + 66, heroTexture(this, h.id, br.id, this.gender)).setScale(0.9).setOrigin(0.5, 0.92));
      add(text(this, 740, y, `${br.name} – ${br.passive.nameVi}`, 20, hex(br.color)));
      add(text(this, 740, y + 26, br.descVi, 16, "#d8d0c0", 500).setWordWrapWidth(490));
      add(text(this, 740, y + 48, `${br.skills.map((x) => x.nameVi).join(" · ")} · Tối thượng: ${br.ultimate.nameVi}`, 15, "#a8a090", 500).setWordWrapWidth(490));
    });
    add(
      button(this, 950, 660, 360, 72, "⚔ VÀO TRẬN (20 người)", () => {
        const s = getSave();
        s.lastHero = { heroId: this.heroId, gender: this.gender };
        persist();
        this.scene.start("Arena", { heroId: this.heroId, gender: this.gender });
      }, 0xc8461e, 28).root,
    );
  }
}
