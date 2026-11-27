import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Bản web: thêm biểu tượng, cài ra màn hình chính (manifest) và ảnh xem trước khi gửi link.
// Bản 1 file (claude.ai) không kèm thư mục public nên bỏ qua các thẻ này.
const SITE = "https://huynhngocthong2003-dev.github.io/dai-chien-cau-ca/hero-arena/";
const WEB_HEAD = [
  '<link rel="icon" type="image/png" href="./favicon.png">',
  '<link rel="apple-touch-icon" sizes="180x180" href="./apple-touch-icon.png">',
  '<link rel="manifest" href="./manifest.webmanifest">',
  '<meta name="description" content="Đấu trường sinh tồn 20 anh hùng – 10 lớp, tiến hoá 3 dạng, chơi chung với bạn bè.">',
  '<meta property="og:type" content="website">',
  '<meta property="og:title" content="HERO ARENA – Đấu trường 20 anh hùng">',
  '<meta property="og:description" content="10 lớp nhân vật, tiến hoá 3 dạng, chơi chung với bạn bè ngay trên trình duyệt.">',
  `<meta property="og:url" content="${SITE}">`,
  `<meta property="og:image" content="${SITE}og-image.png">`,
  '<meta property="og:image:width" content="1200">',
  '<meta property="og:image:height" content="630">',
  '<meta name="twitter:card" content="summary_large_image">',
].join("\n");

// HERO ARENA – game riêng, cổng 5174 (game câu cá dùng 5173). mode "single": gói 1 file HTML.
export default defineConfig(({ mode }) => ({
  base: "./",
  plugins:
    mode === "single"
      ? [viteSingleFile()]
      : [{ name: "web-head", transformIndexHtml: (html: string) => html.replace("</title>", `</title>\n${WEB_HEAD}`) }],
  // bản 1 file không chép thư mục public
  publicDir: mode === "single" ? false : "public",
  build: {
    outDir: mode === "single" ? "dist-single" : "dist",
    target: "es2022",
    chunkSizeWarningLimit: 2000,
    assetsInlineLimit: mode === "single" ? 100_000_000 : 4096,
  },
  server: { port: 5174 },
}));
