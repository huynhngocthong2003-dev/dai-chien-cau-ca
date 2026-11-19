import Phaser from "phaser";
import { screenRect } from "../ui/wide.ts";
import { FISH_RARITY_COLOR } from "@dccc/game-config";
import { FISH_BY_ID, FORM_BY_ID } from "@dccc/game-data";
import { roastedXp, type BattleEvent, type Fighter, type MatchResult, type OwnedFish, type RoastedFish } from "@dccc/shared";
import { fishTexture, roastedFishTexture } from "../art/textures.ts";
import { Bar, Button, fadeIn, formatNum, goTo, txt } from "../ui/widgets.ts";
import { COLORS } from "../ui/theme.ts";
import { hexToInt } from "../art/color.ts";
import { Sfx } from "../audio/Sfx.ts";
import { menuBackdrop } from "../ui/backdrop.ts";

export interface BattleData {
  result: MatchResult;
  teamA: Fighter[];
  teamB: Fighter[];
  opponentName: string;
  outcome: { won: boolean; lost?: OwnedFish; roasted?: RoastedFish; gold?: number; xp?: number };
}

const ELEMENT_COLOR: Record<string, number> = {
  water: 0x40c4ff,
  fire: 0xff6d00,
  ice: 0xb3e5fc,
  earth: 0x8d6e63,
  thunder: 0xffeb3b,
  light: 0xfff59d,
  dark: 0x9c27b0,
};

/** Phát lại trận Đấu Sinh Tử (kết quả đã tính sẵn, chỉ hiển thị). */
export class BattleScene extends Phaser.Scene {
  private d!: BattleData;
  private speed = 1;
  private skip = false;
  private fish: [Phaser.GameObjects.Image, Phaser.GameObjects.Image] | null = null;
  private bars: [Bar, Bar] | null = null;
  private names: Phaser.GameObjects.Text[] = [];
  private scoreT!: Phaser.GameObjects.Text;
  private dots: Phaser.GameObjects.Graphics[] = [];
  private cur = 0;

  constructor() {
    super("Battle");
  }

  init(data: BattleData) {
    this.d = data;
    this.skip = false;
    this.speed = 1;
    this.fish = null;
    this.bars = null;
    this.names = [];
    this.dots = [];
  }

  create() {
    this.input.enabled = true;
    fadeIn(this);
    menuBackdrop(this);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.35).fillRect(0, 0, 1280, 90);
    txt(this, 320, 44, "Bạn", 30, { color: "#80d8ff" }).setOrigin(0.5);
    txt(this, 960, 44, this.d.opponentName, 30, { color: "#ff8a80" }).setOrigin(0.5);
    this.scoreT = txt(this, 640, 44, "0 – 0", 44, { color: COLORS.textGold }).setOrigin(0.5);
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i < 3; i++) {
        const dg = this.add.graphics();
        this.dots.push(dg);
        this.drawDot(side, i, "wait");
      }
    }
    new Button(this, 1180, 680, 160, 52, "⏩ Bỏ qua", {
      color: COLORS.blue,
      fontSize: 20,
      onClick: () => {
        this.skip = true;
        this.tweens.killAll();
        this.time.removeAllEvents();
        this.showResult();
      },
    });
    new Button(this, 1000, 680, 140, 52, "x2 tốc độ", {
      color: COLORS.green,
      fontSize: 20,
      onClick: () => {
        this.speed = this.speed === 1 ? 2.5 : 1;
        this.time.timeScale = this.speed;
        this.tweens.timeScale = this.speed;
      },
    });
    this.time.timeScale = 1;
    this.tweens.timeScale = 1;
    void this.play();
  }

  private drawDot(side: number, i: number, st: "wait" | "win" | "lose") {
    const g = this.dots[side * 3 + i]!;
    const x = (side === 0 ? 260 : 900) + i * 60;
    g.clear();
    g.fillStyle(st === "win" ? 0x4caf50 : st === "lose" ? 0xe53935 : 0x37474f, 1).fillCircle(x, 78, 10);
    g.lineStyle(2, 0x1b1530).strokeCircle(x, 78, 10);
  }

  private wait(ms: number) {
    return new Promise<void>((res) => this.time.delayedCall(ms, () => res()));
  }

  private async play() {
    const score = [0, 0];
    for (let i = 0; i < this.d.result.duels.length; i++) {
      if (this.skip) return;
      const du = this.d.result.duels[i]!;
      this.cur = i;
      await this.intro(du.a, du.b, i);
      for (const ev of du.events) {
        if (this.skip) return;
        await this.event(ev);
      }
      if (this.skip) return;
      score[du.winner] = score[du.winner]! + 1;
      this.drawDot(0, i, du.winner === 0 ? "win" : "lose");
      this.drawDot(1, i, du.winner === 1 ? "win" : "lose");
      this.scoreT.setText(`${score[0]} – ${score[1]}`);
      this.tweens.add({ targets: this.scoreT, scale: 1.4, duration: 200, yoyo: true });
      const t = txt(this, 640, 300, du.winner === 0 ? "THẮNG!" : "THUA!", 72, { color: du.winner === 0 ? "#b9f6ca" : "#ff8a80" }).setOrigin(0.5).setScale(0.2);
      this.tweens.add({ targets: t, scale: 1, duration: 300, ease: "Back.easeOut" });
      await this.wait(1100);
      t.destroy();
    }
    if (!this.skip) this.showResult();
  }

  private async intro(a: Fighter, b: Fighter, i: number) {
    this.fish?.forEach((f) => f.destroy());
    this.bars?.forEach((b2) => b2.destroy());
    this.names.forEach((n) => n.destroy());
    const mk = (f: Fighter, side: 0 | 1) => {
      const def = FISH_BY_ID.get(f.fishId)!;
      const img = this.add.image(side === 0 ? -200 : 1480, 400, fishTexture(this, def)).setDisplaySize(300, 190).setFlipX(side === 1);
      if (f.form) {
        const fm = FORM_BY_ID.get(f.form);
        if (fm) img.setTint(0xffffff, hexToInt(fm.glow), 0xffffff, hexToInt(fm.glow));
      }
      this.tweens.add({ targets: img, x: side === 0 ? 380 : 900, duration: 500, ease: "Back.easeOut" });
      this.tweens.add({ targets: img, y: 410, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut", delay: side * 300 });
      const bar = new Bar(this, (side === 0 ? 380 : 900) - 150, 220, 300, 26, side === 0 ? 0x4caf50 : 0xe53935, "");
      bar.set(1);
      const n = txt(this, side === 0 ? 380 : 900, 186, `${f.name}  Lv.${f.level}`, 22, {
        color: FISH_RARITY_COLOR[def.rarity],
        align: "center",
      }).setOrigin(0.5);
      return { img, bar, n };
    };
    const A = mk(a, 0);
    const B = mk(b, 1);
    this.fish = [A.img, B.img];
    this.bars = [A.bar, B.bar];
    this.names = [A.n, B.n];
    const vs = txt(this, 640, 400, `TRẬN ${i + 1}`, 60, { color: COLORS.textGold }).setOrigin(0.5).setScale(0.3);
    this.tweens.add({ targets: vs, scale: 1, duration: 350, ease: "Back.easeOut" });
    Sfx.danger();
    await this.wait(900);
    vs.destroy();
  }

  private float(x: number, y: number, s: string, color: string, size = 34) {
    const t = txt(this, x, y, s, size, { color }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: t, y: y - 80, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }

  private async event(ev: BattleEvent) {
    const [A, B] = this.fish!;
    const actor = ev.side === 0 ? A : B;
    const target = ev.side === 0 ? B : A;
    const hpBars = (hp: [number, number]) => {
      const duel = this.d.result.duels[this.cur]!;
      const max: [number, number] = [duel.a.maxHp, duel.b.maxHp];
      this.bars![0].set(Math.max(0, hp[0] / max[0]));
      this.bars![1].set(Math.max(0, hp[1] / max[1]));
    };
    switch (ev.t) {
      case "attack": {
        Sfx.hook();
        const dx = ev.side === 0 ? 120 : -120;
        this.tweens.add({ targets: actor, x: actor.x + dx, duration: 140, yoyo: true });
        await this.wait(150);
        this.cameras.main.shake(ev.crit ? 200 : 80, ev.crit ? 0.012 : 0.004);
        target.setTintFill(0xffffff);
        this.time.delayedCall(80, () => target.clearTint());
        this.float(target.x, target.y - 100, `-${ev.dmg}${ev.crit ? " CHÍ MẠNG!" : ""}`, ev.crit ? "#ffeb3b" : "#ffffff", ev.crit ? 40 : 32);
        if (ev.adv > 1) this.float(target.x, target.y - 40, "Khắc hệ!", "#69f0ae", 22);
        hpBars(ev.hp);
        if (ev.crit) Sfx.crit();
        await this.wait(380);
        break;
      }
      case "special": {
        Sfx.skill();
        const col = ELEMENT_COLOR[ev.element] ?? 0xffffff;
        const banner = txt(this, actor.x, actor.y - 150, `✨ ${ev.name}!`, 34, { color: "#fff59d" }).setOrigin(0.5);
        this.tweens.add({ targets: banner, scale: 1.2, duration: 300, yoyo: true, onComplete: () => banner.destroy() });
        this.add
          .particles(target.x, target.y, "p_spark", { speed: { min: 150, max: 450 }, lifespan: 700, scale: { start: 1.6, end: 0 }, tint: col, quantity: 40, stopAfter: 40, blendMode: Phaser.BlendModes.ADD })
          .setDepth(40);
        this.cameras.main.flash(180, (col >> 16) & 255, (col >> 8) & 255, col & 255);
        this.cameras.main.shake(260, 0.015);
        this.float(target.x, target.y - 100, `-${ev.dmg}`, "#ff5252", 44);
        hpBars(ev.hp);
        await this.wait(700);
        break;
      }
      case "skip":
        this.float(actor.x, actor.y - 100, ev.reason === "freeze" ? "❄ Bị đóng băng" : "⚡ Bị tê liệt", "#b3e5fc", 26);
        await this.wait(450);
        break;
      case "burn":
        this.float(actor.x, actor.y - 60, `🔥 -${ev.dmg}`, "#ff9100", 26);
        hpBars(ev.hp);
        await this.wait(300);
        break;
      case "heal":
        this.float(actor.x, actor.y - 60, `+${ev.amount}`, "#69f0ae", 30);
        hpBars(ev.hp);
        await this.wait(350);
        break;
      case "shield":
        this.float(actor.x, actor.y - 60, "🛡 Khiên", "#90caf9", 26);
        await this.wait(300);
        break;
      case "ko":
        Sfx.snap();
        this.tweens.killTweensOf(actor);
        this.tweens.add({ targets: actor, angle: ev.side === 0 ? -180 : 180, alpha: 0.2, y: actor.y + 120, duration: 600 });
        await this.wait(650);
        break;
    }
  }

  private showResult() {
    this.time.timeScale = 1;
    this.tweens.timeScale = 1;
    const o = this.d.outcome;
    this.fish?.forEach((f) => f.setVisible(false));
    this.children.list.filter((o) => o instanceof Phaser.GameObjects.Text && o.depth < 800).forEach((o) => (o as Phaser.GameObjects.Text).setVisible(false));
    this.scoreT.setVisible(true);
    const c = this.add.container(0, 0).setDepth(800);
    c.add(screenRect(this, 0x000000, 0.72).setInteractive());
    const [sa, sb] = this.d.result.score;
    c.add(txt(this, 640, 130, o.won ? "🏆 CHIẾN THẮNG!" : "💀 THẤT BẠI", 72, { color: o.won ? "#ffd54f" : "#ff8a80" }).setOrigin(0.5));
    c.add(txt(this, 640, 200, `Tỉ số ${sa} – ${sb}`, 32).setOrigin(0.5));
    if (o.won) {
      Sfx.catchFanfare(true);
      this.add.particles(640, 130, "p_spark", { speed: { min: 200, max: 600 }, lifespan: 1400, scale: { start: 1.5, end: 0 }, tint: [0xffd54f, 0xffffff, 0xff8a65], quantity: 60, stopAfter: 60, blendMode: Phaser.BlendModes.ADD }).setDepth(900);
      if (o.roasted) {
        const def = FISH_BY_ID.get(o.roasted.fishId);
        if (def) {
          c.add(this.add.image(640, 340, roastedFishTexture(this, def)).setDisplaySize(300, 186));
          c.add(this.add.particles(640, 300, "p_ember", { speedY: { min: -60, max: -20 }, x: { min: -90, max: 90 }, lifespan: 1300, frequency: 120, scale: { start: 1, end: 0 }, tint: 0xbdbdbd }));
          c.add(txt(this, 640, 450, `Nhận 🍖 ${def.name} nướng – cho nhân vật ăn được +${formatNum(roastedXp(o.roasted, FISH_BY_ID))} KN`, 24, { color: "#ffcc80", align: "center" }).setOrigin(0.5));
        }
      }
      if (o.gold) c.add(txt(this, 640, 500, `+${o.gold} 🪙   +${o.xp} KN`, 26, { color: "#b9f6ca" }).setOrigin(0.5));
    } else {
      Sfx.fail();
      if (o.lost) {
        const def = FISH_BY_ID.get(o.lost.fishId);
        if (def) {
          const img = this.add.image(640, 340, fishTexture(this, def)).setDisplaySize(260, 160);
          c.add(img);
          this.tweens.add({ targets: img, alpha: 0.15, angle: 180, duration: 1500, delay: 300 });
          c.add(txt(this, 640, 460, `${def.name} Lv.${o.lost.level} đã bị đối thủ nướng mất… 😭`, 26, { color: "#ff8a80", align: "center" }).setOrigin(0.5));
        }
      }
    }
    c.add(new Button(this, 500, 620, 240, 66, "⚔ Đấu tiếp", { color: COLORS.red, fontSize: 26, onClick: () => goTo(this, "DeathMatch", { mode: this.d.opponentName.startsWith("Máy") ? "ai" : "pvp" }) }));
    c.add(new Button(this, 780, 620, 240, 66, o.won && o.roasted ? "🍖 Cho ăn" : "🏠 Sảnh", {
      color: COLORS.orange,
      fontSize: 26,
      onClick: () => (o.won && o.roasted ? goTo(this, "DeathMatch", { mode: "roasted" }) : goTo(this, "Hub")),
    }));
    this.input.keyboard?.once("keydown-SPACE", () => goTo(this, "DeathMatch"));
  }
}
