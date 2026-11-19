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
  },
  server: { port: 5173 },
}));
