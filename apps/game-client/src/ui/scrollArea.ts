import Phaser from "phaser";

export interface ScrollAreaOpts {
  /** Khung nhìn (tọa độ thiết kế). */
  left: number;
  right: number;
  top: number;
  bottom: number;
  /** Chiều cao toàn bộ nội dung (tính từ `top`). */
  contentH: number;
  /** Vị trí thanh cuộn (x). */
  trackX: number;
  /** Vị trí cuộn ban đầu và nơi lưu lại khi đổi. */
  scroll: number;
  onScroll: (v: number) => void;
}

/**
 * Biến một container nội dung thành vùng cuộn dọc: che phần ngoài khung, thanh cuộn kéo được,
 * lăn chuột, vuốt/kéo trên điện thoại; ô bị che không bấm được; kéo không bị tính nhầm là bấm.
 * Trả về `dragged()` để nút trong lưới bỏ qua cú bấm khi người chơi vừa kéo.
 */
export function makeScrollArea(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, content: Phaser.GameObjects.Container, o: ScrollAreaOpts) {
  const viewH = o.bottom - o.top;
  const maxScroll = Math.max(0, o.contentH - viewH);
  const maskG = scene.make.graphics({}, false);
  maskG.fillStyle(0xffffff).fillRect(o.left, o.top, o.right - o.left, viewH);
  content.setMask(maskG.createGeometryMask());
  parent.once(Phaser.GameObjects.Events.DESTROY, () => maskG.destroy());
  // mọi thứ bấm được trong danh sách (ô, nút): che khuất thì không bấm được
  const zones = () =>
    content.list.filter((x) => !!(x as unknown as { input?: unknown }).input) as unknown as { y: number; height: number; input: { enabled: boolean } | null }[];
  const track = scene.add.graphics();
  const thumb = scene.add.graphics();
  parent.add([track, thumb]);
  const thumbH = maxScroll ? Math.max(60, (viewH * viewH) / o.contentH) : viewH;
  track.fillStyle(0x0a1628, 0.85).fillRoundedRect(o.trackX - 7, o.top, 14, viewH, 7);
  let scroll = 0;
  const apply = (v: number) => {
    scroll = Phaser.Math.Clamp(v, 0, maxScroll);
    o.onScroll(scroll);
    content.y = -scroll;
    const ty = o.top + (maxScroll ? (scroll / maxScroll) * (viewH - thumbH) : 0);
    thumb.clear().fillStyle(0xffd740, 1).fillRoundedRect(o.trackX - 7, ty, 14, thumbH, 7).lineStyle(2, 0x1b1530).strokeRoundedRect(o.trackX - 7, ty, 14, thumbH, 7);
    for (const z of zones()) {
      const zy = z.y - scroll;
      if (z.input) z.input.enabled = zy + z.height / 2 > o.top && zy - z.height / 2 < o.bottom;
    }
  };
  apply(o.scroll);
  track.setVisible(maxScroll > 0);
  thumb.setVisible(maxScroll > 0);
  let drag: { y0: number; s0: number; moved: boolean; bar: boolean } | null = null;
  const dragged = () => !!drag?.moved;
  if (!maxScroll) return { dragged };
  const inView = (p: Phaser.Input.Pointer) => p.worldX > o.left && p.worldX < o.trackX + 24 && p.worldY > o.top && p.worldY < o.bottom;
  const barTo = (y: number) => apply(((y - o.top - thumbH / 2) / (viewH - thumbH)) * maxScroll);
  const onWheel = (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
    if (inView(p)) apply(scroll + dy * 0.8);
  };
  const onDown = (p: Phaser.Input.Pointer) => {
    if (!inView(p)) return;
    const bar = Math.abs(p.worldX - o.trackX) < 22;
    drag = { y0: p.worldY, s0: scroll, moved: false, bar };
    if (bar) barTo(p.worldY);
  };
  const onMove = (p: Phaser.Input.Pointer) => {
    if (!drag || !p.isDown) return;
    const dy = p.worldY - drag.y0;
    if (Math.abs(dy) > 8) drag.moved = true;
    if (drag.bar) barTo(p.worldY);
    else if (drag.moved) apply(drag.s0 - dy);
  };
  const onUp = () => scene.time.delayedCall(0, () => (drag = null));
  scene.input.on("wheel", onWheel);
  scene.input.on("pointerdown", onDown);
  scene.input.on("pointermove", onMove);
  scene.input.on("pointerup", onUp);
  parent.once(Phaser.GameObjects.Events.DESTROY, () => {
    scene.input.off("wheel", onWheel);
    scene.input.off("pointerdown", onDown);
    scene.input.off("pointermove", onMove);
    scene.input.off("pointerup", onUp);
  });
  return { dragged };
}
