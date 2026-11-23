import Phaser from "phaser";
import { CHARACTER_BY_ID, EVO_ITEM_BY_ID, ROD_BY_ID, WHEEL_GOOD_WEIGHT, WHEEL_PRIZES } from "@dccc/game-data";
import { CHAR_RARITY_COLOR } from "@dccc/game-config";
import { characterHeadTexture, characterTexture, evoItemTexture, menuIconTexture, rodIconTexture } from "../art/textures.ts";

const nameOf = (id: string) => EVO_ITEM_BY_ID.get(id)?.name ?? CHARACTER_BY_ID.get(id)?.name ?? ROD_BY_ID.get(id)?.name ?? id;
import { DUPLICATE_CHAR_SOUL, DUPLICATE_ROD_STONES, WHEEL_COST_10, WHEEL_COST_DIAMONDS, WHEEL_X10_GOOD_BOOST, rewardText, type RewardDef } from "@dccc/shared";
import { GameState } from "../state/GameState.ts";
import { Button, fadeIn, goTo, modal, panel, toast, txt } from "../ui/widgets.ts";
import { TopBar } from "../ui/TopBar.ts";
import { COLORS } from "../ui/theme.ts";
import { menuBackdrop } from "../ui/backdrop.ts";
import { hexToInt } from "../art/color.ts";
import { Sfx } from "../audio/Sfx.ts";

/** Cấp bậc theo tỉ lệ ra (quay lẻ): màu càng hiếm càng nổi. */
const TIERS = [
  { name: "Thần Thoại", min: 0, color: "#ff1744" },
  { name: "Huyền Thoại", min: 0.004, color: "#ffb300" },
  { name: "Cực Phẩm", min: 0.01, color: "#ab47bc" },
  { name: "Hiếm", min: 0.03, color: "#29b6f6" },
  { name: "Thường", min: 0.08, color: "#90a4ae" },
];
const TOTAL_W = WHEEL_PRIZES.reduce((a, p) => a + p.weight, 0);
const rate1 = (p: (typeof WHEEL_PRIZES)[number]) => p.weight / TOTAL_W;
const TOTAL_W10 = WHEEL_PRIZES.reduce((a, p) => a + (p.weight <= WHEEL_GOOD_WEIGHT ? p.weight * WHEEL_X10_GOOD_BOOST : p.weight), 0);
const rate10 = (p: (typeof WHEEL_PRIZES)[number]) => (p.weight <= WHEEL_GOOD_WEIGHT ? p.weight * WHEEL_X10_GOOD_BOOST : p.weight) / TOTAL_W10;
function tierOf(p: (typeof WHEEL_PRIZES)[number]) {
  const r = rate1(p);
  return [...TIERS].reverse().find((t) => r >= t.min) ?? TIERS[0]!;
}
/** Thứ tự ô trên vòng: xếp xen kẽ để 2 ô cạnh nhau (kể cả ô cuối – ô đầu) không cùng cấp màu. */
const DISPLAY: number[] = (() => {
  const groups = new Map<string, number[]>();
  WHEEL_PRIZES.forEach((p, i) => {
    const t = tierOf(p).name;
    groups.set(t, [...(groups.get(t) ?? []), i]);
  });
  const out: number[] = [];
  let prev = "";
  while (out.length < WHEEL_PRIZES.length) {
    const left = WHEEL_PRIZES.length - out.length;
    const cands = [...groups.entries()].filter(([t, l]) => l.length && t !== prev).sort((a, b) => b[1].length - a[1].length);
    // ô cuối không trùng màu ô đầu
    const firstTier = out.length ? tierOf(WHEEL_PRIZES[out[0]!]!).name : "";
    const pick = (left === 1 ? cands.find(([t]) => t !== firstTier) : undefined) ?? cands[0] ?? [...groups.entries()].find(([, l]) => l.length)!;
    out.push(pick[1].shift()!);
    prev = pick[0];
  }
  return out;
})();
/** Vị trí hiển thị của một phần quà. */
const slotOf = (prizeIndex: number) => DISPLAY.indexOf(prizeIndex);

/** Món tỉ lệ thấp (Huyền Thoại / Thần Thoại) → màn TRÚNG ĐỘC ĐẮC. */
const isJackpot = (p: (typeof WHEEL_PRIZES)[number]) => rate1(p) < 0.01;

const pct = (x: number) => (x >= 0.01 ? `${(x * 100).toFixed(1)}%` : `${(x * 100).toFixed(2)}%`);

const CX = 460;
const CY = 410;
const R = 270;

/** Vòng Quay May Mắn: 1 lượt miễn phí mỗi ngày, sau đó 30 kim cương. */
/** Hình phần quà trên vòng quay. */
function prizeIcon(scene: Phaser.Scene, p: (typeof WHEEL_PRIZES)[number]): string {
  const r = p.reward;
  if (r.rodId && ROD_BY_ID.get(r.rodId)) return rodIconTexture(scene, ROD_BY_ID.get(r.rodId)!);
  if (r.characterId && CHARACTER_BY_ID.get(r.characterId)) return characterHeadTexture(scene, CHARACTER_BY_ID.get(r.characterId)!);
  if (r.evoItem) return evoItemTexture(scene, r.evoItem);
  if (r.evoPool?.length) return evoItemTexture(scene, r.evoPool[0]!);
  if (r.diamonds) return menuIconTexture(scene, r.diamonds >= 500 ? "crown" : "diamond");
  if (r.gold) return menuIconTexture(scene, r.gold >= 3000 ? "coins" : "coin");
  if (r.stones) return menuIconTexture(scene, "stone");
  if (r.soul) return menuIconTexture(scene, "soul");
  if (r.bossTickets) return menuIconTexture(scene, "ticket");
  return menuIconTexture(scene, "wheel");
}

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
    DISPLAY.map((pi) => WHEEL_PRIZES[pi]!).forEach((p, i) => {
      const a0 = -Math.PI / 2 + i * seg - seg / 2;
      // màu ô theo cấp bậc tỉ lệ
      g.fillStyle(hexToInt(tierOf(p).color), 1).slice(0, 0, R, a0, a0 + seg).fillPath();
      g.fillStyle(0xffffff, 0.12).slice(0, 0, R * 0.55, a0, a0 + seg).fillPath();
      g.lineStyle(3, 0x1b1530, 1).beginPath().moveTo(0, 0).lineTo(Math.cos(a0) * R, Math.sin(a0) * R).strokePath();
    });
    this.wheel.add(g);
    DISPLAY.map((pi) => WHEEL_PRIZES[pi]!).forEach((p, i) => {
      const a = -Math.PI / 2 + i * seg;
      // biểu tượng vẽ thật của phần quà (cần câu, nhân vật, đá, vàng, kim cương…)
      const ic = this.add.image(Math.cos(a) * R * 0.8, Math.sin(a) * R * 0.8, prizeIcon(this, p)).setRotation(a + Math.PI / 2);
      ic.setScale(40 / Math.max(ic.width, ic.height));
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
    txt(this, 1040, 250, `Mỗi ngày 1 lượt MIỄN PHÍ · thêm lượt ${WHEEL_COST_DIAMONDS} 💎\nQuay x10: ${WHEEL_COST_10} 💎 – tỉ lệ ra đồ ngon CAO HƠN!\n\nGiải lớn: 👑 500 KC · 💎 Đá Tiến Hoá Vạn Năng\nCần Long Cốt · Phượng Hoàng · Hải Thần\nNhân vật Ngao Thiên · Viêm Hỏa · Thủy Tổ · Lôi Vũ\nĐá Tiến Hoá Thủy · Hỏa · Băng · Lôi`, 17, { align: "center", weight: "700", wrap: 410 }).setOrigin(0.5);
    this.info = txt(this, 1040, 372, "", 18, { align: "center", color: "#b9f6ca", wrap: 400 }).setOrigin(0.5);
    new Button(this, 1040, 430, 230, 46, "📊 Tỉ lệ rơi", { color: COLORS.blue, fontSize: 19, onClick: () => this.showRates() });
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
    this.rotateTo(slotOf(best), 3000, () => {
      this.spinning = false;
      const jp = r.prizes!.filter(isJackpot);
      if (jp.length) this.jackpot(jp, () => this.showX10(r.prizes!, r.rewards, r.dups));
      else this.showX10(r.prizes!, r.rewards, r.dups);
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

  /** Màn TRÚNG ĐỘC ĐẮC: tối màn hình, tia sáng xoay, mưa vàng & pháo hoa, món quà phóng to. */
  private jackpot(items: (typeof WHEEL_PRIZES)[number][], then?: () => void) {
    Sfx.catchFanfare(true);
    this.time.delayedCall(350, () => Sfx.catchFanfare(true));
    this.cameras.main.flash(700, 255, 230, 120);
    this.cameras.main.shake(600, 0.012);
    const ex = Math.max(0, (this.scale.gameSize.width - 1280) / 2);
    const root = this.add.container(0, 0).setDepth(1500);
    const dim = this.add.rectangle(-ex, 0, 1280 + 2 * ex, 720, 0x000000, 0.82).setOrigin(0).setInteractive();
    root.add(dim);
    const top = items.reduce((a, b) => (b.weight < a.weight ? b : a));
    const col = hexToInt(tierOf(top).color);
    const rays = this.add.container(640, 340);
    for (let i = 0; i < 18; i++) rays.add(this.add.image(0, 0, "p_ray").setOrigin(0.5, 0).setAngle(i * 20).setTint(i % 2 ? col : 0xffd54f).setAlpha(0.55).setBlendMode(Phaser.BlendModes.ADD));
    this.tweens.add({ targets: rays, angle: 360, duration: 8000, repeat: -1 });
    root.add(rays);
    // mưa vàng + pháo hoa
    root.add(this.add.particles(0, -20, "p_spark", { x: { min: -ex, max: 1280 + ex }, speedY: { min: 200, max: 420 }, speedX: { min: -40, max: 40 }, lifespan: 2600, scale: { start: 1.2, end: 0.4 }, tint: [0xffd54f, 0xffffff, 0xff8a65, col], frequency: 20, blendMode: Phaser.BlendModes.ADD }));
    for (let k = 0; k < 6; k++)
      this.time.delayedCall(200 + k * 380, () => {
        const fx = this.add.particles(Phaser.Math.Between(200, 1080), Phaser.Math.Between(120, 400), "p_spark", { speed: { min: 150, max: 480 }, lifespan: 1100, scale: { start: 1.4, end: 0 }, tint: [Phaser.Math.RND.pick([0xff1744, 0x40c4ff, 0x69f0ae, 0xffd54f, 0xea80fc]), 0xffffff], quantity: 60, stopAfter: 60, blendMode: Phaser.BlendModes.ADD });
        root.add(fx);
      });
    const title = txt(this, 640, 110, "🎉 TRÚNG ĐỘC ĐẮC! 🎉", 66, { color: "#ffd54f", align: "center", stroke: 12 }).setOrigin(0.5).setScale(0.2);
    this.tweens.add({ targets: title, scale: 1, duration: 500, ease: "Back.easeOut" });
    this.tweens.add({ targets: title, scale: 1.08, duration: 420, yoyo: true, repeat: -1, delay: 500 });
    root.add(title);
    items.slice(0, 4).forEach((p, i, arr) => {
      const x = 640 + (i - (arr.length - 1) / 2) * 230;
      const icon = this.add.text(x, 330, p.icon, { fontSize: arr.length > 1 ? "110px" : "160px", padding: { top: 24 } }).setOrigin(0.5).setScale(0);
      this.tweens.add({ targets: icon, scale: 1, angle: { from: -30, to: 0 }, delay: 300 + i * 200, duration: 600, ease: "Back.easeOut" });
      this.tweens.add({ targets: icon, y: 316, duration: 700, yoyo: true, repeat: -1, delay: 900 + i * 200, ease: "Sine.easeInOut" });
      root.add(icon);
      const t = tierOf(p);
      root.add(txt(this, x, 470, `${p.label}\n${t.name} · ${pct(rate1(p))}`, arr.length > 1 ? 20 : 30, { color: t.color, align: "center" }).setOrigin(0.5));
    });
    const ok = new Button(this, 640, 620, 280, 70, "NHẬN THƯỞNG", { color: COLORS.orange, fontSize: 28, onClick: () => {
      root.destroy(true);
      this.updateBtn();
      then?.();
    } });
    ok.setAlpha(0);
    this.tweens.add({ targets: ok, alpha: 1, delay: 900, duration: 300 });
    root.add(ok);
  }

  /** Bảng tỉ lệ rơi từng món, phân màu theo cấp bậc. */
  private showRates() {
    if (this.spinning) return;
    const m = modal(this, 1000, 660, "📊 Tỉ lệ rơi Vòng Quay", () => undefined);
    // chú thích cấp bậc
    TIERS.forEach((t, i) => {
      const x = m.x + 60 + i * 190;
      const g = this.add.graphics();
      g.fillStyle(hexToInt(t.color), 1).fillRoundedRect(x, m.y + 66, 26, 20, 5);
      m.root.add(g);
      m.root.add(txt(this, x + 34, m.y + 76, t.name, 16, { color: t.color }).setOrigin(0, 0.5));
    });
    m.root.add(txt(this, m.x + 590, m.y + 106, "Quay lẻ", 16, { color: COLORS.textGold, align: "center" }).setOrigin(0.5));
    m.root.add(txt(this, m.x + 720, m.y + 106, "Quay x10 (mỗi lượt)", 16, { color: COLORS.textGold, align: "center" }).setOrigin(0.5));
    const list = [...WHEEL_PRIZES].sort((a, b) => b.weight - a.weight);
    // một cột đầy đủ dễ đọc: tên · cấp · % lẻ · % x10
    list.forEach((p, i) => {
      const y = m.y + 130 + i * 25;
      const t = tierOf(p);
      const g = this.add.graphics();
      g.fillStyle(hexToInt(t.color), i % 2 ? 0.18 : 0.28).fillRoundedRect(m.x + 30, y - 11, m.w - 60, 23, 6);
      m.root.add(g);
      m.root.add(this.add.text(m.x + 50, y, p.icon, { fontSize: "16px", padding: { top: 4 } }).setOrigin(0.5));
      m.root.add(txt(this, m.x + 70, y, p.label, 15, { weight: "700" }).setOrigin(0, 0.5));
      m.root.add(txt(this, m.x + 330, y, t.name, 14, { color: t.color }).setOrigin(0, 0.5));
      m.root.add(txt(this, m.x + 590, y, pct(rate1(p)), 15, { align: "center" }).setOrigin(0.5));
      const up = p.weight <= WHEEL_GOOD_WEIGHT;
      m.root.add(txt(this, m.x + 720, y, `${pct(rate10(p))}${up ? " ▲" : ""}`, 15, { align: "center", color: up ? "#69f0ae" : "#ffffff" }).setOrigin(0.5));
    });
    m.root.add(txt(this, m.x + m.w / 2, m.y + m.h - 34, "▲ = món ngon được tăng tỉ lệ ×1,6 khi quay x10 (không đảm bảo). Nhân vật / cần câu hiếm bốc ngẫu nhiên trong nhóm; đã có thì đổi nguyên liệu.", 13, { align: "center", weight: "700", color: COLORS.textDim, wrap: 920 }).setOrigin(0.5));
  }

  /** Màn khoe trúng nhân vật / cần câu hiếm. */
  private bigWin(rw: RewardDef) {
    Sfx.catchFanfare(true);
    this.cameras.main.flash(600, 255, 255, 255);
    const ch = rw.characterId ? CHARACTER_BY_ID.get(rw.characterId) : null;
    const rod = rw.rodId ? ROD_BY_ID.get(rw.rodId) : null;
    const m = modal(this, 700, 520, ch ? "🌟 NHẬN NHÂN VẬT HIẾM!" : "🎣 NHẬN CẦN CÂU HIẾM!", () => this.updateBtn());
    const cx = m.x + m.w / 2;
    const col = hexToInt(CHAR_RARITY_COLOR[(ch ?? rod)!.rarity]);
    m.root.add(this.add.image(cx, m.y + 240, "p_spark").setTint(col).setScale(14).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD));
    const img = ch ? this.add.image(cx, m.y + 360, characterTexture(this, ch, {})).setOrigin(0.5, 1).setScale(1.1) : this.add.image(cx, m.y + 240, rodIconTexture(this, rod!)).setScale(1.6);
    img.setScale(img.scale * 0.2);
    this.tweens.add({ targets: img, scale: img.scale * 5, duration: 600, ease: "Back.easeOut" });
    m.root.add(img);
    m.root.add(this.add.particles(cx, m.y + 240, "p_spark", { speed: { min: 150, max: 450 }, lifespan: 1200, scale: { start: 1.4, end: 0 }, tint: [col, 0xffffff], quantity: 60, stopAfter: 60, blendMode: Phaser.BlendModes.ADD }));
    m.root.add(txt(this, cx, m.y + 400, `${(ch ?? rod)!.rarity} · ${(ch ?? rod)!.name}`, 30, { color: CHAR_RARITY_COLOR[(ch ?? rod)!.rarity], align: "center" }).setOrigin(0.5));
    m.root.add(new Button(this, cx, m.y + m.h - 46, 220, 54, "Tuyệt vời!", { color: COLORS.orange, fontSize: 22, onClick: () => m.close() }));
  }

  private showX10(prizes: typeof WHEEL_PRIZES, rewards: RewardDef[] = [], dups: boolean[] = []) {
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
      const rw = rewards[i];
      const nm = rw?.characterId ? CHARACTER_BY_ID.get(rw.characterId)?.name : rw?.rodId ? ROD_BY_ID.get(rw.rodId)?.name : null;
      m.root.add(txt(this, x + 76, y + 138, nm ? `${nm}${dups[i] ? "\n(đã có → nguyên liệu)" : ""}` : p.label, nm ? 14 : 16, { align: "center", color: isGood ? "#ffd54f" : "#ffffff", wrap: 140 }).setOrigin(0.5));
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
    const target = 360 * 6 + ((360 - slotOf(r.index!) * segDeg - cur + 360) % 360) + jitter;
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
        const rw = r.reward ?? p.reward;
        this.info.setText(`${p.icon} Trúng: ${rewardText(rw, nameOf)}!${r.dup ? `\n(đã có → đổi thành ${rw.characterId ? `${DUPLICATE_CHAR_SOUL} Linh Hồn` : `${DUPLICATE_ROD_STONES} Đá`})` : ""}`);
        if ((rw.characterId || rw.rodId) && !r.dup) this.bigWin(rw);
        else if (isJackpot(p)) this.jackpot([p]);
        else toast(this, `🎉 Bạn trúng ${p.label}!`, COLORS.green);
        this.updateBtn();
      },
    });
    this.updateBtn();
  }
}
