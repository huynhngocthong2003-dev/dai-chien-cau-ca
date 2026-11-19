import Phaser from "phaser";
import { DESIGN_H, DESIGN_W, screenRect } from "./wide.ts";
import { COLORS, FONT } from "./theme.ts";
import { Sfx } from "../audio/Sfx.ts";

export interface TextOpts {
  color?: string;
  stroke?: number;
  align?: "left" | "center" | "right";
  wrap?: number;
  weight?: "500" | "700" | "800";
  shadow?: boolean;
}

export function txt(scene: Phaser.Scene, x: number, y: number, s: string, size: number, o: TextOpts = {}) {
  const t = scene.add.text(x, y, s, {
    fontFamily: FONT,
    fontSize: `${size}px`,
    fontStyle: o.weight ?? "800",
    color: o.color ?? COLORS.text,
    stroke: "#1b1530",
    strokeThickness: o.stroke ?? Math.max(2, Math.round(size / 7)),
    align: o.align ?? "left",
    wordWrap: o.wrap ? { width: o.wrap, useAdvancedWrap: true } : undefined,
    padding: { top: 4, bottom: 2 },
  });
  if (o.shadow !== false) t.setShadow(0, Math.max(1, size / 12), "#00000088", 0, true, true);
  return t;
}

function lighten(c: number, amt: number) {
  const col = Phaser.Display.Color.IntegerToColor(c);
  return amt > 0 ? col.clone().lighten(amt * 100).color : col.clone().darken(-amt * 100).color;
}

export interface ButtonOpts {
  color?: number;
  fontSize?: number;
  icon?: string;
  /** Texture dùng làm biểu tượng (ưu tiên hơn icon chữ). */
  iconKey?: string;
  disabled?: boolean;
  badge?: string;
  sub?: string;
  onClick?: () => void;
}

export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  private bw: number;
  private bh: number;
  private color: number;
  disabled: boolean;
  private onClick?: () => void;
  private badgeObjs: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, text: string, o: ButtonOpts = {}) {
    super(scene, x, y);
    this.bw = w;
    this.bh = h;
    this.color = o.color ?? COLORS.orange;
    this.disabled = !!o.disabled;
    this.onClick = o.onClick;
    this.bg = scene.add.graphics();
    this.add(this.bg);
    const fs = o.fontSize ?? Math.min(28, Math.round(h * 0.42));
    const hasIcon = !!o.icon || !!o.iconKey;
    if (o.iconKey && h >= 80) {
      const img = scene.add.image(0, -h * 0.1, o.iconKey);
      const k = Math.min((w * 0.62) / img.width, (h * 0.58) / img.height);
      img.setScale(k);
      this.add(img);
      this.label = txt(scene, 0, h * 0.3, text, Math.round(fs * 0.8), { align: "center" }).setOrigin(0.5);
    } else if (hasIcon && h >= 80) {
      const icon = scene.add.text(0, -h * 0.14, o.icon!, { fontSize: `${Math.round(h * 0.4)}px`, fontFamily: FONT, padding: { top: 6 } }).setOrigin(0.5);
      this.add(icon);
      this.label = txt(scene, 0, h * 0.28, text, Math.round(fs * 0.8), { align: "center" }).setOrigin(0.5);
    } else {
      this.label = txt(scene, 0, o.sub ? -fs * 0.28 : 0, hasIcon ? `${o.icon} ${text}` : text, fs, { align: "center" }).setOrigin(0.5);
    }
    this.add(this.label);
    if (o.sub) this.add(txt(scene, 0, fs * 0.55, o.sub, Math.round(fs * 0.55), { align: "center", weight: "700" }).setOrigin(0.5));
    if (o.badge) this.setBadge(o.badge);
    this.draw();
    this.setSize(w, h);
    this.setInteractive({ useHandCursor: true });
    this.on("pointerdown", () => {
      Sfx.unlock();
      scene.tweens.add({ targets: this, scale: 0.93, duration: 60 });
    });
    this.on("pointerout", () => scene.tweens.add({ targets: this, scale: 1, duration: 80 }));
    this.on("pointerover", () => {
      if (!this.disabled) scene.tweens.add({ targets: this, scale: 1.04, duration: 80 });
    });
    this.on("pointerup", () => {
      scene.tweens.add({ targets: this, scale: 1, duration: 80 });
      if (this.disabled) {
        Sfx.locked();
        this.emit("disabled-click");
        return;
      }
      Sfx.click();
      this.onClick?.();
    });
    scene.add.existing(this);
  }

  setBadge(s: string | null) {
    this.badgeObjs.forEach((o) => o.destroy());
    this.badgeObjs = [];
    if (!s) return;
    const g = this.scene.add.graphics();
    const t = txt(this.scene, this.bw / 2 - 8, -this.bh / 2 + 6, s, 14).setOrigin(1, 0.5);
    const bw = t.width + 12;
    g.fillStyle(COLORS.red, 1).fillRoundedRect(this.bw / 2 - bw - 2, -this.bh / 2 - 6, bw, 24, 10);
    g.lineStyle(2, COLORS.outline).strokeRoundedRect(this.bw / 2 - bw - 2, -this.bh / 2 - 6, bw, 24, 10);
    this.add([g, t]);
    this.badgeObjs = [g, t];
  }

  setDisabled(d: boolean) {
    this.disabled = d;
    this.draw();
    return this;
  }

  setText(s: string) {
    this.label.setText(s);
    return this;
  }

  setColor(c: number) {
    this.color = c;
    this.draw();
    return this;
  }

  private draw() {
    const { bw: w, bh: h } = this;
    const g = this.bg;
    const c = this.disabled ? COLORS.grey : this.color;
    const r = Math.min(18, h / 3);
    g.clear();
    g.fillStyle(0x000000, 0.35).fillRoundedRect(-w / 2 + 2, -h / 2 + 6, w, h, r);
    g.fillStyle(lighten(c, -0.25), 1).fillRoundedRect(-w / 2, -h / 2, w, h, r);
    g.fillStyle(c, 1).fillRoundedRect(-w / 2, -h / 2, w, h - 6, r);
    g.fillStyle(lighten(c, 0.25), 1).fillRoundedRect(-w / 2 + 6, -h / 2 + 4, w - 12, (h - 6) * 0.38, Math.max(4, r - 6));
    g.lineStyle(3, COLORS.outline, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, r);
    this.label.setAlpha(this.disabled ? 0.75 : 1);
  }
}

export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, alpha = 0.92, color = COLORS.panel) {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.35).fillRoundedRect(x + 3, y + 6, w, h, 20);
  g.fillStyle(color, alpha).fillRoundedRect(x, y, w, h, 20);
  g.lineStyle(3, COLORS.panelBorder, 0.9).strokeRoundedRect(x, y, w, h, 20);
  g.lineStyle(3, COLORS.outline, 1).strokeRoundedRect(x - 2, y - 2, w + 4, h + 4, 22);
  return g;
}

export class Bar extends Phaser.GameObjects.Container {
  private g: Phaser.GameObjects.Graphics;
  private bw: number;
  private bh: number;
  private color: number;
  label?: Phaser.GameObjects.Text;
  value = 1;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, color: number, label?: string) {
    super(scene, x, y);
    this.bw = w;
    this.bh = h;
    this.color = color;
    this.g = scene.add.graphics();
    this.add(this.g);
    if (label !== undefined) {
      this.label = txt(scene, w / 2, h / 2, label, Math.max(12, Math.round(h * 0.62))).setOrigin(0.5);
      this.add(this.label);
    }
    this.set(1);
    scene.add.existing(this);
  }

  set(v: number, color?: number) {
    this.value = Phaser.Math.Clamp(v, 0, 1);
    if (color !== undefined) this.color = color;
    const { bw: w, bh: h } = this;
    const r = h / 2;
    const g = this.g;
    g.clear();
    g.fillStyle(0x0a1628, 0.9).fillRoundedRect(0, 0, w, h, r);
    if (this.value > 0.001) {
      const fw = Math.max(h, w * this.value);
      g.fillStyle(this.color, 1).fillRoundedRect(0, 0, fw, h, r);
      g.fillStyle(0xffffff, 0.3).fillRoundedRect(3, 2, fw - 6, h * 0.35, r * 0.5);
    }
    g.lineStyle(2.5, COLORS.outline, 1).strokeRoundedRect(0, 0, w, h, r);
    return this;
  }
}

let activeToast: Phaser.GameObjects.Container | null = null;

export function toast(scene: Phaser.Scene, message: string, color = COLORS.panelLight) {
  activeToast?.destroy();
  const width = DESIGN_W;
  const t = txt(scene, 0, 0, message, 24, { align: "center", wrap: 700 }).setOrigin(0.5);
  const w = Math.min(760, t.width + 48);
  const h = t.height + 22;
  const g = scene.add.graphics();
  g.fillStyle(color, 0.96).fillRoundedRect(-w / 2, -h / 2, w, h, 16);
  g.lineStyle(3, COLORS.outline).strokeRoundedRect(-w / 2, -h / 2, w, h, 16);
  const c = scene.add.container(width / 2, 120, [g, t]).setDepth(1000).setAlpha(0);
  activeToast = c;
  scene.tweens.add({ targets: c, alpha: 1, y: 130, duration: 180 });
  scene.tweens.add({
    targets: c,
    alpha: 0,
    delay: 1900,
    duration: 300,
    onComplete: () => {
      c.destroy();
      if (activeToast === c) activeToast = null;
    },
  });
}

/** Lớp phủ modal có nút đóng. Trả về container để thêm nội dung. */
export function modal(scene: Phaser.Scene, w: number, h: number, title: string, onClose?: () => void) {
  const width = DESIGN_W;
  const height = DESIGN_H;
  const root = scene.add.container(0, 0).setDepth(900);
  const dim = screenRect(scene, 0x000000, 0.6).setInteractive();
  const x = (width - w) / 2;
  const y = (height - h) / 2;
  const p = panel(scene, x, y, w, h, 0.98);
  const titleT = txt(scene, width / 2, y + 34, title, 32, { color: COLORS.textGold }).setOrigin(0.5);
  // Ẩn các ô nhập HTML của màn bên dưới để không nổi lên trên hộp thoại
  const hiddenBelow = [...document.querySelectorAll<HTMLElement>(".dccc-overlay")].filter((el) => el.style.visibility !== "hidden");
  hiddenBelow.forEach((el) => (el.style.visibility = "hidden"));
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    hiddenBelow.forEach((el) => el.isConnected && (el.style.visibility = ""));
    scene.tweens.add({ targets: root, alpha: 0, duration: 140, onComplete: () => root.destroy() });
    onClose?.();
  };
  const closeBtn = new Button(scene, x + w - 30, y + 30, 48, 48, "✕", { color: COLORS.red, fontSize: 24, onClick: close });
  root.add([dim, p, titleT, closeBtn]);
  root.setAlpha(0);
  scene.tweens.add({ targets: root, alpha: 1, duration: 160 });
  return { root, x, y, w, h, close };
}

export function goTo(scene: Phaser.Scene, key: string, data?: object) {
  scene.input.enabled = false;
  scene.cameras.main.fadeOut(220, 5, 20, 40);
  scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => scene.scene.start(key, data));
}

export function fadeIn(scene: Phaser.Scene) {
  scene.cameras.main.fadeIn(260, 5, 20, 40);
}

export function formatNum(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e4) return `${(n / 1e3).toFixed(1)}K`;
  return Math.round(n).toLocaleString("vi-VN");
}
