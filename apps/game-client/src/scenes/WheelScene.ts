import Phaser from "phaser";
import { EVO_ITEM_BY_ID, WHEEL_GOOD_WEIGHT, WHEEL_PRIZES } from "@dccc/game-data";
import { WHEEL_COST_10, WHEEL_COST_DIAMONDS, rewardText } from "@dccc/shared";
import { GameState } from "../state/GameState.ts";
import { Button, fadeIn, goTo, modal, panel, toast, txt } from "../ui/widgets.ts";
import { TopBar } from "../ui/TopBar.ts";
import { COLORS } from "../ui/theme.ts";
import { menuBackdrop } from "../ui/backdrop.ts";
import { hexToInt } from "../art/color.ts";
import { Sfx } from "../audio/Sfx.ts";

const CX = 460;
const CY = 410;
const R = 270;

/** Vòng Quay May Mắn: 1 lượt miễn phí mỗi ngày, sau đó 30 kim cương. */
export class WheelScene extends Phaser.Scene {
  private wheel!: Phaser.GameObjects.Container;
  private spinning = false;
  private btn!: Button;
  private info!: Phaser.GameObjects.Text;

  constructor() {
    super("Wheel");
  }

  create() {
    this.input.enabled = true;
    this.spinning = false;
    fadeIn(this);
    menuBackdrop(this);
    GameState.refreshQuests();
    new TopBar(this, { title: "Vòng Quay May Mắn", onBack: () => !this.spinning && goTo(this, "Hub") });
    const n = WHEEL_PRIZES.length;
    const seg = (Math.PI * 2) / n;
    this.wheel = this.add.container(CX, CY);
    const g = this.add.graphics();
    g.fillStyle(0x1b1530, 1).fillCircle(0, 0, R + 14);
    WHEEL_PRIZES.forEach((p, i) => {
      const a0 = -Math.PI / 2 + i * seg - seg / 2;
      g.fillStyle(hexToInt(p.color), 1).slice(0, 0, R, a0, a0 + seg).fillPath();
      g.fillStyle(0xffffff, 0.12).slice(0, 0, R * 0.55, a0, a0 + seg).fillPath();
      g.lineStyle(3, 0x1b1530, 1).beginPath().moveTo(0, 0).lineTo(Math.cos(a0) * R, Math.sin(a0) * R).strokePath();
    });
    this.wheel.add(g);
    WHEEL_PRIZES.forEach((p, i) => {
      const a = -Math.PI / 2 + i * seg;
      const ic = this.add.text(Math.cos(a) * R * 0.8, Math.sin(a) * R * 0.8, p.icon, { fontSize: "30px", padding: { top: 8 } }).setOrigin(0.5).setRotation(a + Math.PI / 2);
      // chữ chạy dọc theo bán kính cho vừa ô hẹp
      const t = txt(this, Math.cos(a) * R * 0.48, Math.sin(a) * R * 0.48, p.label, 13, { align: "center" }).setOrigin(0.5).setRotation(a);
      this.wheel.add([ic, t]);
    });
    // đèn viền
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const dot = this.add.circle(CX + Math.cos(a) * (R + 7), CY + Math.sin(a) * (R + 7), 5, i % 2 ? 0xffeb3b : 0xffffff);
      this.tweens.add({ targets: dot, alpha: 0.3, duration: 400, yoyo: true, repeat: -1, delay: (i % 2) * 400 });
    }
    // tâm + kim chỉ
    const hub = this.add.graphics();
    hub.fillStyle(0xffc107, 1).fillCircle(CX, CY, 44).lineStyle(4, 0x1b1530).strokeCircle(CX, CY, 44);
    txt(this, CX, CY, "QUAY", 20, { color: "#1b1530", stroke: 0, shadow: false }).setOrigin(0.5);
    const pin = this.add.graphics();
    pin.fillStyle(0xff1744, 1).fillTriangle(CX - 22, CY - R - 34, CX + 22, CY - R - 34, CX, CY - R + 14);
    pin.lineStyle(3, 0x1b1530).strokeTriangle(CX - 22, CY - R - 34, CX + 22, CY - R - 34, CX, CY - R + 14);

    panel(this, 820, 120, 440, 586, 0.92);
    txt(this, 1040, 160, "🎡 Thử vận may!", 30, { color: COLORS.textGold, align: "center" }).setOrigin(0.5);
    txt(this, 1040, 250, `Mỗi ngày 1 lượt MIỄN PHÍ · thêm lượt ${WHEEL_COST_DIAMONDS} 💎\nQuay x10: ${WHEEL_COST_10} 💎 – tỉ lệ ra đồ ngon CAO HƠN!\n\nGiải lớn: 👑 500 KC · 🪶 Lông Phượng Thần\n🐉🌋❄️⚡ vật phẩm đột biến`, 17, { align: "center", weight: "700", wrap: 410 }).setOrigin(0.5);
    this.info = txt(this, 1040, 400, "", 20, { align: "center", color: "#b9f6ca", wrap: 400 }).setOrigin(0.5);
    this.btn = new Button(this, 1040, 500, 340, 70, "", { color: COLORS.orange, fontSize: 26, onClick: () => this.spin() });
    const x10 = new Button(this, 1040, 588, 340, 70, `QUAY x10 · ${WHEEL_COST_10} 💎`, { color: COLORS.purple, fontSize: 24, sub: "Tỉ lệ đồ ngon ×1,6", onClick: () => this.spin10() });
    this.tweens.add({ targets: x10, angle: { from: -1.5, to: 1.5 }, duration: 400, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: this.btn, scale: 1.05, duration: 600, yoyo: true, repeat: -1 });
    txt(this, 1040, 672, `Đã quay: ${GameState.save.stats.spins ?? 0} lần`, 16, { align: "center", color: COLORS.textDim, weight: "700" }).setOrigin(0.5).setName("count");
    this.updateBtn();
    this.input.keyboard?.on("keydown-SPACE", () => this.spin());
  }

  private updateBtn() {
    const free = !GameState.save.daily.freeSpinUsed;
    this.btn.setText(free ? "QUAY MIỄN PHÍ" : `QUAY · ${WHEEL_COST_DIAMONDS} 💎`);
    (this.children.getByName("count") as Phaser.GameObjects.Text | null)?.setText(`Đã quay: ${GameState.save.stats.spins ?? 0} lần`);
  }

  /** Quay 10 lần: vòng quay dừng ở món ngon nhất, sau đó hiện bảng 10 món. */
  private spin10() {
    if (this.spinning) return;
    const r = GameState.spinWheel10();
    if (!r.ok) return toast(this, r.error, COLORS.red);
    this.spinning = true;
    this.info.setText("");
    const best = r.indexes!.reduce((b, i) => (WHEEL_PRIZES[i]!.weight < WHEEL_PRIZES[b]!.weight ? i : b), r.indexes![0]!);
    this.rotateTo(best, 3000, () => {
      this.spinning = false;
      this.showX10(r.prizes!);
      this.updateBtn();
    });
  }

  private rotateTo(index: number, duration: number, done: () => void) {
    const segDeg = 360 / WHEEL_PRIZES.length;
    const jitter = (Math.random() - 0.5) * segDeg * 0.6;
    const cur = ((this.wheel.angle % 360) + 360) % 360;
    const target = 360 * 6 + ((360 - index * segDeg - cur + 360) % 360) + jitter;
    let lastTick = 0;
    this.tweens.add({
      targets: this.wheel,
      angle: this.wheel.angle + target,
      duration,
      ease: "Cubic.easeOut",
      onUpdate: () => {
        const k = Math.floor(this.wheel.angle / segDeg);
        if (k !== lastTick) {
          lastTick = k;
          Sfx.click();
        }
      },
      onComplete: done,
    });
  }

  private showX10(prizes: typeof WHEEL_PRIZES) {
    const good = prizes.filter((p) => p.weight <= WHEEL_GOOD_WEIGHT).length;
    if (good) {
      Sfx.catchFanfare(true);
      this.cameras.main.flash(400, 255, 235, 120);
    } else Sfx.coin();
    const m = modal(this, 900, 520, `🎡 Kết quả quay x10${good ? ` · ${good} món ngon!` : ""}`, () => this.updateBtn());
    prizes.forEach((p, i) => {
      const x = m.x + 40 + (i % 5) * 166;
      const y = m.y + 90 + Math.floor(i / 5) * 190;
      const g = this.add.graphics();
      const isGood = p.weight <= WHEEL_GOOD_WEIGHT;
      g.fillStyle(isGood ? 0x3a2f10 : 0x0a1628, 1).fillRoundedRect(x, y, 152, 170, 14);
      g.lineStyle(isGood ? 4 : 2, hexToInt(p.color)).strokeRoundedRect(x, y, 152, 170, 14);
      m.root.add(g);
      if (isGood) m.root.add(this.add.image(x + 76, y + 64, "p_spark").setTint(hexToInt(p.color)).setScale(5).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD));
      const ic = this.add.text(x + 76, y + 64, p.icon, { fontSize: "54px", padding: { top: 10 } }).setOrigin(0.5).setScale(0);
      this.tweens.add({ targets: ic, scale: 1, delay: i * 90, duration: 260, ease: "Back.easeOut" });
      m.root.add(ic);
      m.root.add(txt(this, x + 76, y + 138, p.label, 16, { align: "center", color: isGood ? "#ffd54f" : "#ffffff", wrap: 140 }).setOrigin(0.5));
    });
    m.root.add(new Button(this, m.x + m.w / 2, m.y + m.h - 44, 220, 54, "Nhận", { color: COLORS.green, fontSize: 22, onClick: () => m.close() }));
  }

  private spin() {
    if (this.spinning) return;
    const r = GameState.spinWheel();
    if (!r.ok) return toast(this, r.error, COLORS.red);
    this.spinning = true;
    this.info.setText("");
    const n = WHEEL_PRIZES.length;
    const segDeg = 360 / n;
    // ô trúng phải dừng dưới kim (đỉnh) → góc quay = -index*seg (+ lệch ngẫu nhiên trong ô)
    const jitter = (Math.random() - 0.5) * segDeg * 0.6;
    const cur = ((this.wheel.angle % 360) + 360) % 360;
    const target = 360 * 6 + ((360 - r.index! * segDeg - cur + 360) % 360) + jitter;
    let lastTick = 0;
    this.tweens.add({
      targets: this.wheel,
      angle: this.wheel.angle + target,
      duration: 4200,
      ease: "Cubic.easeOut",
      onUpdate: () => {
        const k = Math.floor(this.wheel.angle / segDeg);
        if (k !== lastTick) {
          lastTick = k;
          Sfx.click();
        }
      },
      onComplete: () => {
        this.spinning = false;
        const p = r.prize!;
        const big = p.weight <= 3;
        if (big) {
          Sfx.catchFanfare(true);
          this.cameras.main.flash(500, 255, 235, 120);
        } else Sfx.coin();
        this.add
          .particles(CX, CY, "p_spark", { speed: { min: 200, max: 600 }, lifespan: 1000, scale: { start: 1.5, end: 0 }, tint: [hexToInt(p.color), 0xffffff], quantity: big ? 80 : 30, stopAfter: big ? 80 : 30, blendMode: Phaser.BlendModes.ADD })
          .setDepth(100);
        this.info.setText(`${p.icon} Trúng: ${rewardText(p.reward, (id) => EVO_ITEM_BY_ID.get(id)?.name ?? id)}!`);
        toast(this, `🎉 Bạn trúng ${p.label}!`, COLORS.green);
        this.updateBtn();
      },
    });
    this.updateBtn();
  }
}
