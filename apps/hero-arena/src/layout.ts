import Phaser from "phaser";
import { H, W } from "./ui.ts";

// Bố cục tự khớp mọi màn hình (tai thỏ, viền cong, 16:9 → 21:9, máy tính bảng 4:3).
// Game chạy ở chế độ Scale.EXPAND: luôn giữ trọn vùng thiết kế 1280×720 (không méo),
// cạnh dư theo tỉ lệ máy được nới ra; giao diện neo theo góc + tránh vùng tai thỏ.

/** Vùng an toàn (đơn vị CSS px) – đọc từ env(safe-area-inset-*) của trình duyệt. */
export interface Insets {
  l: number;
  r: number;
  t: number;
  b: number;
}

let probe: HTMLDivElement | null = null;

export function cssSafeInsets(): Insets {
  // kiểm thử: giả lập tai thỏ bằng window.__safeInsets (trình duyệt máy tính không có env())
  const fake = (window as unknown as { __safeInsets?: Insets }).__safeInsets;
  if (fake) return fake;
  if (!probe) {
    probe = document.createElement("div");
    probe.style.cssText =
      "position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;" +
      "padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)";
    document.body.appendChild(probe);
  }
  const cs = getComputedStyle(probe);
  const n = (v: string) => parseFloat(v) || 0;
  return { l: n(cs.paddingLeft), r: n(cs.paddingRight), t: n(cs.paddingTop), b: n(cs.paddingBottom) };
}

export interface View {
  /** Kích thước game hiện tại (đơn vị logic, ≥ 1280×720). */
  w: number;
  h: number;
  /** Độ lệch để vùng thiết kế 1280×720 nằm giữa. */
  ox: number;
  oy: number;
  /** Vùng an toàn quy ra đơn vị logic. */
  safe: Insets;
}

export function view(scene: Phaser.Scene): View {
  const w = scene.scale.gameSize.width;
  const h = scene.scale.gameSize.height;
  const rect = scene.game.canvas.getBoundingClientRect();
  const k = rect.width > 0 ? w / rect.width : 1;
  const css = cssSafeInsets();
  return {
    w,
    h,
    ox: (w - W) / 2,
    oy: (h - H) / 2,
    safe: { l: css.l * k, r: css.r * k, t: css.t * k, b: css.b * k },
  };
}

/** Màn hình menu: dời camera để nội dung thiết kế 1280×720 luôn nằm giữa, nền phủ kín. */
export function centerMenu(scene: Phaser.Scene, bg?: Phaser.GameObjects.Image): void {
  const apply = () => {
    const v = view(scene);
    scene.cameras.main.setScroll(-v.ox, -v.oy);
    if (bg) {
      // nền "cover": phủ kín cả phần nới ra, giữ tỉ lệ
      const s = Math.max(v.w / bg.width, v.h / bg.height);
      bg.setScale(s).setPosition(W / 2, H / 2);
    }
  };
  apply();
  scene.scale.on("resize", apply);
  scene.events.once("shutdown", () => scene.scale.off("resize", apply));
}

/** Neo ngang/dọc: -1 = trái/trên, 0 = giữa, 1 = phải/dưới, 2 = toạ độ màn hình thật (không dời). */
export type Anchor = -1 | 0 | 1 | 2;

interface Pinned {
  o: Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform;
  x: number;
  y: number;
  ax: Anchor;
  ay: Anchor;
}

/** Bộ neo giao diện cho các đối tượng cố định trên màn hình (scrollFactor 0). */
export class HudAnchors {
  private items: Pinned[] = [];
  private dx: Record<string, number> = {};
  private dy: Record<string, number> = {};

  constructor(private readonly scene: Phaser.Scene) {}

  /** Ghim đối tượng: toạ độ (x, y) hiện tại được hiểu là toạ độ thiết kế 1280×720. */
  pin<T extends Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform>(o: T, ax: Anchor, ay: Anchor): T {
    this.items.push({ o, x: o.x, y: o.y, ax, ay });
    this.place(this.items[this.items.length - 1]!);
    return o;
  }

  /** Độ dời hiện tại của một neo (dùng cho đối tượng tạo sau như thông báo, bảng chọn). */
  offset(ax: Anchor, ay: Anchor): { x: number; y: number } {
    return { x: this.dx[ax] ?? 0, y: this.dy[ay] ?? 0 };
  }

  relayout(): void {
    const v = view(this.scene);
    // cách mép thêm tối thiểu 0 – các nút đã có lề sẵn trong thiết kế
    this.dx = { [-1]: v.safe.l, 0: v.ox, 1: v.w - W - v.safe.r, 2: 0 };
    this.dy = { [-1]: v.safe.t, 0: v.oy, 1: v.h - H - v.safe.b, 2: 0 };
    this.items = this.items.filter((it) => it.o.active);
    for (const it of this.items) this.place(it);
  }

  private place(it: Pinned): void {
    it.o.setPosition(it.x + (this.dx[it.ax] ?? 0), it.y + (this.dy[it.ay] ?? 0));
  }
}

/** Thử khóa màn hình ngang (cần toàn màn hình trên Android; iOS/khung nhúng có thể từ chối). */
export function tryLockLandscape(): void {
  const coarse = window.matchMedia?.("(pointer: coarse)").matches;
  if (!coarse) return;
  const once = () => {
    window.removeEventListener("pointerdown", once);
    const el = document.documentElement;
    const lock = () => {
      const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
      o.lock?.("landscape").catch(() => undefined);
    };
    if (!document.fullscreenElement && el.requestFullscreen && document.fullscreenEnabled) {
      el.requestFullscreen({ navigationUI: "hide" }).then(lock, () => undefined);
    } else lock();
  };
  window.addEventListener("pointerdown", once);
}
