import Phaser from "phaser";

// Widget dùng chung: nút, bảng, thông báo nổi.

export const FONT = '"Baloo 2", system-ui, sans-serif';
export const W = 1280;
export const H = 720;

export function text(scene: Phaser.Scene, x: number, y: number, s: string, size = 22, color = "#f3ead8", weight = 700): Phaser.GameObjects.Text {
  return scene.add.text(x, y, s, { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: String(weight), stroke: "#0b0f18", strokeThickness: Math.max(2, size / 7) });
}

export interface Button {
  root: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  setEnabled(on: boolean): void;
  setLabel(s: string): void;
}

export function button(scene: Phaser.Scene, x: number, y: number, w: number, h: number, label: string, onClick: () => void, color = 0xc8641e, size = 24): Button {
  const root = scene.add.container(x, y);
  const g = scene.add.graphics();
  let enabled = true;
  const draw = (hover: boolean) => {
    g.clear();
    const c = enabled ? color : 0x4a4f5a;
    g.fillStyle(0x000000, 0.35).fillRoundedRect(-w / 2 + 3, -h / 2 + 5, w, h, 14);
    g.fillStyle(c, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    g.fillStyle(0xffffff, hover && enabled ? 0.22 : 0.12).fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h / 2 - 4, 10);
    g.lineStyle(3, 0x0b0f18, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
  };
  draw(false);
  const t = text(scene, 0, 0, label, size).setOrigin(0.5);
  const hit = scene.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
  hit.on("pointerover", () => draw(true));
  hit.on("pointerout", () => draw(false));
  hit.on("pointerdown", (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
    ev.stopPropagation();
    if (!enabled) return;
    scene.tweens.add({ targets: root, scale: 0.94, duration: 60, yoyo: true });
    onClick();
  });
  root.add([g, t, hit]);
  return {
    root,
    label: t,
    setEnabled(on: boolean) {
      enabled = on;
      draw(false);
      t.setAlpha(on ? 1 : 0.6);
    },
    setLabel(s: string) {
      t.setText(s);
    },
  };
}

export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, alpha = 0.92): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.4).fillRoundedRect(x + 4, y + 6, w, h, 18);
  g.fillStyle(0x151c2b, alpha).fillRoundedRect(x, y, w, h, 18);
  g.lineStyle(3, 0x8a6a3a, 1).strokeRoundedRect(x, y, w, h, 18);
  g.lineStyle(1, 0xd9b45a, 0.5).strokeRoundedRect(x + 6, y + 6, w - 12, h - 12, 14);
  return g;
}

export function toast(scene: Phaser.Scene, msg: string, color = "#ffe08a", y = 150): Phaser.GameObjects.Text {
  const t = text(scene, W / 2, y, msg, 26, color).setOrigin(0.5).setDepth(1000).setScrollFactor(0);
  scene.tweens.add({ targets: t, y: y - 30, alpha: 0, delay: 1600, duration: 500, onComplete: () => t.destroy() });
  return t;
}

export function hex(c: number): string {
  return `#${c.toString(16).padStart(6, "0")}`;
}

/** Ô nhập chữ HTML đặt chồng lên canvas (theo toạ độ logic 1280×720). */
export function htmlInput(scene: Phaser.Scene, x: number, y: number, w: number, placeholder: string): HTMLInputElement {
  const el = document.createElement("input");
  el.className = "ha-input";
  el.placeholder = placeholder;
  el.maxLength = 24;
  el.autocomplete = "off";
  el.spellcheck = false;
  document.body.appendChild(el);
  const place = () => {
    const canvas = scene.game.canvas.getBoundingClientRect();
    const s = canvas.width / W;
    el.style.left = `${canvas.left + x * s}px`;
    el.style.top = `${canvas.top + y * s}px`;
    el.style.width = `${w * s - 28}px`;
    el.style.fontSize = `${Math.max(16, 20 * s)}px`;
  };
  place();
  scene.scale.on("resize", place);
  scene.events.once("shutdown", () => {
    scene.scale.off("resize", place);
    el.remove();
  });
  return el;
}
