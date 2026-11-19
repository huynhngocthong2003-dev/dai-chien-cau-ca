import Phaser from "phaser";

/**
 * Đặt phần tử HTML (ô nhập, vùng văn bản) chồng đúng vị trí trên khung game.
 * Tọa độ (x, y) là tâm theo hệ 1280×720 của game; kích thước w×h cũng theo hệ đó.
 * Vị trí được tính từ khung canvas thật (getBoundingClientRect) nên luôn khớp
 * dù game co giãn, căn giữa, xoay màn hình hay nằm trong khung nhúng.
 * Phần tử tự xóa khi `owner` bị hủy hoặc scene tắt.
 */
export function htmlOverlay(
  scene: Phaser.Scene,
  owner: Phaser.GameObjects.GameObject,
  x: number,
  y: number,
  w: number,
  h: number,
  html: string,
): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "dccc-overlay";
  wrap.style.cssText = `position:fixed;left:0;top:0;width:${w}px;height:${h}px;transform-origin:0 0;z-index:30;display:flex;align-items:center;justify-content:center;box-sizing:border-box`;
  wrap.innerHTML = html;
  document.body.appendChild(wrap);
  // Không để phím gõ trong ô lọt xuống game (Space/Q/Enter…)
  wrap.addEventListener("keydown", (e) => e.stopPropagation());
  wrap.addEventListener("keyup", (e) => e.stopPropagation());

  const place = () => {
    const r = scene.game.canvas.getBoundingClientRect();
    const s = r.width / scene.scale.gameSize.width;
    // màn hình rộng: camera dịch khung thiết kế 1280 vào giữa → trừ scrollX
    const sx = scene.cameras?.main?.scrollX ?? 0;
    wrap.style.transform = `translate(${r.left + (x - sx - w / 2) * s}px, ${r.top + (y - h / 2) * s}px) scale(${s})`;
  };
  place();
  // camera có thể được dịch ngay sau khi scene tạo xong (màn hình rộng)
  scene.events.once(Phaser.Scenes.Events.CREATE, place);
  requestAnimationFrame(place);
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(place) : null;
  ro?.observe(scene.game.canvas);
  window.addEventListener("resize", place);
  window.addEventListener("orientationchange", place);
  scene.scale.on(Phaser.Scale.Events.RESIZE, place);

  let removed = false;
  const remove = () => {
    if (removed) return;
    removed = true;
    ro?.disconnect();
    window.removeEventListener("resize", place);
    window.removeEventListener("orientationchange", place);
    scene.scale.off(Phaser.Scale.Events.RESIZE, place);
    wrap.remove();
  };
  owner.once(Phaser.GameObjects.Events.DESTROY, remove);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, remove);
  return wrap;
}
