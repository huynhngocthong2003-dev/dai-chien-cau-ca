/**
 * Toàn màn hình cho điện thoại. Phóng to cả trang (không chỉ canvas) để các ô
 * nhập HTML vẫn hiện. iPhone (Safari) không hỗ trợ API này cho trang web – khi đó
 * hướng dẫn "Thêm vào Màn hình chính" để mở game như một ứng dụng toàn màn hình.
 */
type FsDoc = Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => Promise<void> };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };

export function isFullscreen(): boolean {
  const d = document as FsDoc;
  return !!(d.fullscreenElement ?? d.webkitFullscreenElement);
}

export function fullscreenSupported(): boolean {
  const el = document.documentElement as FsEl;
  return !!(el.requestFullscreen ?? el.webkitRequestFullscreen) && document.fullscreenEnabled !== false;
}

export function isStandaloneApp(): boolean {
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** Bật/tắt toàn màn hình. Trả về thông báo cho người chơi nếu không làm được. */
export async function toggleFullscreen(): Promise<string | null> {
  const d = document as FsDoc;
  try {
    if (isFullscreen()) {
      await (d.exitFullscreen?.() ?? d.webkitExitFullscreen?.());
      return null;
    }
    const el = document.documentElement as FsEl;
    const req = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el);
    if (!req || document.fullscreenEnabled === false) throw new Error("unsupported");
    await req();
    try {
      await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.("landscape");
    } catch {
      /* một số máy không cho khóa xoay – bỏ qua */
    }
    return null;
  } catch {
    if (isStandaloneApp()) return "Game đang chạy dạng ứng dụng toàn màn hình.";
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    return iOS
      ? "iPhone: bấm nút Chia sẻ ⬆ trong Safari → \"Thêm vào MH chính\", rồi mở game từ biểu tượng để chơi toàn màn hình."
      : "Trình duyệt này không cho phóng to toàn màn hình. Hãy mở game bằng Chrome hoặc thêm vào màn hình chính.";
  }
}
