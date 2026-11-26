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

/** Đơn vị điểm ảnh của giao diện (khớp độ thô của nhân vật pixel-art). */
export const PX = 4;

function lighten(c: number, k: number): number {
  return Phaser.Display.Color.IntegerToColor(c).lighten(k).color;
}
function darken(c: number, k: number): number {
  return Phaser.Display.Color.IntegerToColor(c).darken(k).color;
}

/** Hộp pixel: góc bậc thang, viền đậm, mặt trên sáng / đáy tối (nổi khối). */
export function pixelBox(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, fill: number, opts: { outline?: number; bevel?: boolean; alpha?: number; pressed?: boolean } = {}): void {
  const p = PX;
  const o = opts.outline ?? 0x0b0a12;
  const a = opts.alpha ?? 1;
  x = Math.round(x / p) * p;
  y = Math.round(y / p) * p;
  w = Math.round(w / p) * p;
  h = Math.round(h / p) * p;
  // viền ngoài: hình chữ nhật cắt góc 1 ô
  g.fillStyle(o, a);
  g.fillRect(x + p, y, w - 2 * p, h);
  g.fillRect(x, y + p, w, h - 2 * p);
  // thân
  g.fillStyle(fill, a);
  g.fillRect(x + 2 * p, y + p, w - 4 * p, h - 2 * p);
  g.fillRect(x + p, y + 2 * p, w - 2 * p, h - 4 * p);
  if (opts.bevel !== false) {
    const top = opts.pressed ? darken(fill, 14) : lighten(fill, 18);
    const bot = opts.pressed ? lighten(fill, 10) : darken(fill, 22);
    g.fillStyle(top, a);
    g.fillRect(x + 2 * p, y + p, w - 4 * p, p);
    g.fillRect(x + p, y + 2 * p, p, h - 4 * p);
    g.fillStyle(bot, a);
    g.fillRect(x + 2 * p, y + h - 2 * p, w - 4 * p, p);
    g.fillRect(x + w - 2 * p, y + 2 * p, p, h - 4 * p);
  }
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
  let down = false;
  const draw = (hover: boolean) => {
    g.clear();
    const c = enabled ? (hover ? lighten(color, 8) : color) : 0x4a4f5a;
    // bóng đổ pixel
    g.fillStyle(0x000000, 0.45).fillRect(-w / 2 + PX, -h / 2 + 2 * PX, w, h);
    pixelBox(g, -w / 2, -h / 2 + (down ? PX : 0), w, h, c, { pressed: down });
  };
  draw(false);
  const t = text(scene, 0, 0, label, size).setOrigin(0.5);
  const hit = scene.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
  hit.on("pointerover", () => draw(true));
  hit.on("pointerout", () => {
    down = false;
    t.setY(0);
    draw(false);
  });
  hit.on("pointerup", () => {
    down = false;
    t.setY(0);
    draw(true);
  });
  hit.on("pointerdown", (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
    ev.stopPropagation();
    if (!enabled) return;
    down = true;
    t.setY(PX);
    draw(true);
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

/** Khung bảng pixel: nền đá tối, viền gỗ-đồng, đinh tán vàng ở 4 góc. */
export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, alpha = 0.94): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.45).fillRect(x + PX * 2, y + PX * 3, w, h);
  pixelBox(g, x, y, w, h, 0x6a4a2a, { alpha: 1 });
  pixelBox(g, x + PX * 2, y + PX * 2, w - PX * 4, h - PX * 4, 0x141a28, { bevel: false, outline: 0x2a1c10, alpha });
  // đường chỉ trong
  g.fillStyle(0x3a2e48, alpha);
  g.fillRect(x + PX * 4, y + PX * 4, w - PX * 8, PX / 2);
  // đinh tán
  for (const [cx, cy] of [[x + PX * 2, y + PX * 2], [x + w - PX * 4, y + PX * 2], [x + PX * 2, y + h - PX * 4], [x + w - PX * 4, y + h - PX * 4]] as const) {
    g.fillStyle(0x0b0a12, 1).fillRect(cx - PX / 2, cy - PX / 2, PX * 3, PX * 3);
    g.fillStyle(0xe8b84a, 1).fillRect(cx, cy, PX * 2, PX * 2);
    g.fillStyle(0xfff0a0, 1).fillRect(cx, cy, PX, PX);
  }
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

/** Hình tròn pixel (các hàng điểm ảnh PX), có viền và nổi khối. */
export function pixelCircle(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number, fill: number, opts: { outline?: number; alpha?: number; bevel?: boolean } = {}): void {
  const p = PX;
  const a = opts.alpha ?? 1;
  const row = (rad: number, color: number, al: number, from = -rad, to = rad) => {
    g.fillStyle(color, al);
    for (let yy = Math.ceil(from / p) * p; yy < to; yy += p) {
      const mid = yy + p / 2;
      const half = Math.floor(Math.sqrt(Math.max(0, rad * rad - mid * mid)) / p) * p;
      if (half > 0) g.fillRect(Math.round(cx) - half, Math.round(cy) + yy, half * 2, p);
    }
  };
  row(r + p, opts.outline ?? 0x0b0a12, a);
  row(r, fill, a);
  if (opts.bevel !== false) {
    row(r, Phaser.Display.Color.IntegerToColor(fill).lighten(16).color, a, -r, -r + p * 2);
    row(r, Phaser.Display.Color.IntegerToColor(fill).darken(20).color, a, r - p * 2, r);
  }
}
