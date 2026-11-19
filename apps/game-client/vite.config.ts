import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// mode "single": đóng gói toàn bộ game vào một file HTML để xuất bản lên web.
export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: mode === "single" ? [viteSingleFile()] : [],
  build: {
    outDir: mode === "single" ? "dist-single" : "dist",
    target: "es2022",
    chunkSizeWarningLimit: 2000,
    // bản web thường có thêm trang duyệt nạp cho chủ game (admin.html)
    rollupOptions: mode === "single" ? undefined : { input: { main: "index.html", admin: "admin.html" } },
  },
  server: { port: 5173 },
}));
