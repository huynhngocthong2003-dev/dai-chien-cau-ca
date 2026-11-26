import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// HERO ARENA – game riêng, cổng 5174 (game câu cá dùng 5173). mode "single": gói 1 file HTML.
export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: mode === "single" ? [viteSingleFile()] : [],
  build: {
    outDir: mode === "single" ? "dist-single" : "dist",
    target: "es2022",
    chunkSizeWarningLimit: 2000,
    assetsInlineLimit: mode === "single" ? 100_000_000 : 4096,
  },
  server: { port: 5174 },
}));
