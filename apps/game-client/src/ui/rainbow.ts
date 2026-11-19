import Phaser from "phaser";

/** 7 sắc cầu vồng: đỏ, cam, vàng, lục, lam, chàm, tím. */
export const RAINBOW = [0xff1744, 0xff9100, 0xffea00, 0x00e676, 0x2979ff, 0x3d5afe, 0xd500f9];

/** Điểm trên chu vi hình chữ nhật bo góc theo tỉ lệ t ∈ [0,1). */
function perimeterPoint(x: number, y: number, w: number, h: number, r: number, t: number): [number, number] {
  const sw = w - 2 * r;
  const sh = h - 2 * r;
  const arc = (Math.PI * r) / 2;
  const total = 2 * sw + 2 * sh + 4 * arc;
  let d = (((t % 1) + 1) % 1) * total;
  const seg = (len: number) => {
    if (d <= len) return true;
    d -= len;
    return false;
  };
  if (seg(sw)) return [x + r + d, y];
  if (seg(arc)) { const a = -Math.PI / 2 + d / r; return [x + w - r + Math.cos(a) * r, y + r + Math.sin(a) * r]; }
  if (seg(sh)) return [x + w, y + r + d];
  if (seg(arc)) { const a = d / r; return [x + w - r + Math.cos(a) * r, y + h - r + Math.sin(a) * r]; }
  if (seg(sw)) return [x + w - r - d, y + h];
  if (seg(arc)) { const a = Math.PI / 2 + d / r; return [x + r + Math.cos(a) * r, y + h - r + Math.sin(a) * r]; }
  if (seg(sh)) return [x, y + h - r - d];
  const a = Math.PI + d / r;
  return [x + r + Math.cos(a) * r, y + r + Math.sin(a) * r];
}

function lerpColor(a: number, b: number, t: number) {
  const ca = Phaser.Display.Color.IntegerToColor(a);
  const cb = Phaser.Display.Color.IntegerToColor(b);
  return Phaser.Display.Color.GetColor(ca.red + (cb.red - ca.red) * t, ca.green + (cb.green - ca.green) * t, ca.blue + (cb.blue - ca.blue) * t);
}

/** Màu cầu vồng liên tục theo u ∈ [0,1). */
export function rainbowAt(u: number) {
  const f = (((u % 1) + 1) % 1) * RAINBOW.length;
  const i = Math.floor(f);
  return lerpColor(RAINBOW[i]!, RAINBOW[(i + 1) % RAINBOW.length]!, f - i);
}

/**
 * Khung viền cầu vồng 7 sắc chạy vòng quanh thẻ (màu trôi liên tục) + quầng sáng.
 * Tự huỷ khi `owner` bị huỷ.
 */
export function rainbowFrame(scene: Phaser.Scene, owner: Phaser.GameObjects.Container | null, x: number, y: number, w: number, h: number, r = 14, thick = 5) {
  const g = scene.add.graphics();
  const glow = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
  const N = 120;
  let phase = 0;
  const draw = () => {
    g.clear();
    glow.clear();
    for (let i = 0; i < N; i++) {
      const [x1, y1] = perimeterPoint(x, y, w, h, r, i / N);
      const [x2, y2] = perimeterPoint(x, y, w, h, r, (i + 1.15) / N);
      const col = rainbowAt(i / N + phase);
      g.lineStyle(thick, col, 1).lineBetween(x1, y1, x2, y2);
      glow.lineStyle(thick * 2.6, col, 0.28).lineBetween(x1, y1, x2, y2);
    }
  };
  draw();
  const ev = scene.time.addEvent({ delay: 50, loop: true, callback: () => ((phase += 0.012), draw()) });
  const cleanup = () => {
    ev.remove();
    g.destroy();
    glow.destroy();
  };
  if (owner) {
    owner.add([glow, g]);
    owner.once(Phaser.GameObjects.Events.DESTROY, () => ev.remove());
  }
  g.once(Phaser.GameObjects.Events.DESTROY, () => ev.remove());
  return { g, glow, destroy: cleanup };
}

/** Chữ tô cầu vồng (VD: nhãn "LR"). */
export function rainbowText(t: Phaser.GameObjects.Text) {
  const grad = t.context.createLinearGradient(0, 0, t.width, 0);
  ["#ff1744", "#ff9100", "#ffea00", "#00e676", "#2979ff", "#3d5afe", "#d500f9"].forEach((c, i, a) => grad.addColorStop(i / (a.length - 1), c));
  t.setFill(grad);
  return t;
}
