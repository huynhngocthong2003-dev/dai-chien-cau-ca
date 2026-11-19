import Phaser from "phaser";

/**
 * Màn hình rộng (điện thoại 19.5:9 như iPhone 12 Pro): game vẫn thiết kế trong khung 1280×720,
 * nhưng chiều ngang thật của game giãn theo tỉ lệ màn hình (tối đa 1600) để lấp đầy màn hình.
 * Camera dịch sang trái để khung thiết kế nằm giữa; nền được kéo giãn ra hai bên;
 * thanh trên cùng bám mép màn hình (tránh tai thỏ theo safe-area).
 */
export const DESIGN_W = 1280;
export const DESIGN_H = 720;
const MAX_W = 1600;

/** Bề rộng game cho khung hiển thị hiện tại. */
export function targetWidth(): number {
  const el = document.getElementById("game");
  const w = el?.clientWidth || window.innerWidth;
  const h = el?.clientHeight || window.innerHeight;
  if (!w || !h || w < h) return DESIGN_W;
  return Math.max(DESIGN_W, Math.min(MAX_W, Math.round((DESIGN_H * w) / h)));
}

/** Phần thừa mỗi bên (đơn vị game) so với khung thiết kế 1280. */
export function extraX(scene: Phaser.Scene): number {
  return Math.max(0, (scene.scale.gameSize.width - DESIGN_W) / 2);
}

/** Lề an toàn (tai thỏ/camera) theo đơn vị game. */
export function safeX(scene: Phaser.Scene): number {
  const probe = document.getElementById("safe-probe");
  if (!probe) return 0;
  const cs = getComputedStyle(probe);
  const css = Math.max(parseFloat(cs.paddingLeft) || 0, parseFloat(cs.paddingRight) || 0);
  const r = scene.game.canvas.getBoundingClientRect();
  return r.width ? (css * scene.scale.gameSize.width) / r.width : 0;
}

/** Hình chữ nhật phủ toàn màn hình (lớp tối của hộp thoại, kết quả…). */
export function screenRect(scene: Phaser.Scene, color: number, alpha: number) {
  const ex = extraX(scene);
  return scene.add.rectangle(-ex, 0, DESIGN_W + 2 * ex, DESIGN_H, color, alpha).setOrigin(0);
}

/** Áp dụng cho scene vừa tạo: dịch camera, kéo giãn nền phủ kín khung thiết kế. */
export function applyWide(scene: Phaser.Scene) {
  if (!scene.cameras?.main) return;
  const ex = extraX(scene);
  scene.cameras.main.setScroll(-ex, 0);
  if (!ex) return;
  for (const o of scene.children.list) {
    if (o instanceof Phaser.GameObjects.Image && !(o instanceof Phaser.GameObjects.Sprite)) {
      const full = o.displayWidth >= DESIGN_W - 4 && o.displayHeight >= DESIGN_H - 4;
      if (!full) continue;
      const h = o.displayHeight;
      const cx = o.x + (0.5 - o.originX) * o.displayWidth;
      o.setOrigin(0.5, o.originY).setX(cx).setDisplaySize(DESIGN_W + 2 * ex, h);
    } else if (o instanceof Phaser.GameObjects.Rectangle && o.width >= DESIGN_W && o.height >= DESIGN_H && o.x === 0) {
      o.setPosition(-ex, o.y).setSize(DESIGN_W + 2 * ex, o.height);
      o.input?.hitArea?.setTo?.(0, 0, DESIGN_W + 2 * ex, o.height);
    }
  }
}

/** Gắn vào game: mỗi scene khi tạo xong sẽ được áp dụng; xoay màn hình thì đổi bề rộng. */
export function installWide(game: Phaser.Game) {
  const hook = () => {
    for (const sc of game.scene.scenes) {
      sc.events.on(Phaser.Scenes.Events.CREATE, () => applyWide(sc));
      if (sc.sys.settings.status === Phaser.Scenes.RUNNING) applyWide(sc);
    }
  };
  // các scene chỉ được tạo khi game khởi động xong
  if (game.scene.scenes.length) hook();
  else game.events.once(Phaser.Core.Events.READY, () => setTimeout(hook, 0));
  let last = game.scale.gameSize.width;
  return () => {
    const w = targetWidth();
    if (w === last) return;
    last = w;
    game.scale.setGameSize(w, DESIGN_H);
    game.scale.refresh();
    for (const sc of game.scene.getScenes(true)) {
      if (sc.scene.key === "Boot") continue;
      sc.scene.restart();
    }
  };
}
