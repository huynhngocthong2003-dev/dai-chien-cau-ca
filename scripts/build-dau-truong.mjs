// Chuẩn bị bản GitHub Pages của game "Đấu Trường Quả Cầu Anime" (dist/dau-truong):
//  - chép thư viện supabase-js (bản UMD, đúng phiên bản đã khóa trong game-client) cạnh trang;
//  - ghi online-config.js chứa địa chỉ dự án + khóa "anon" CÔNG KHAI (đọc từ biến môi trường, không ghi vào repo).
// Không bao giờ dùng service_role key ở đây.
/* global process, URL */
import { copyFileSync, existsSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const out = "apps/game-client/dist/dau-truong";
if (!existsSync(join(out, "index.html"))) {
  console.error("Không thấy " + out + "/index.html – hãy chạy pnpm build trước.");
  process.exit(1);
}
const require = createRequire(new URL("../apps/game-client/package.json", import.meta.url));
const umd = join(dirname(require.resolve("@supabase/supabase-js/package.json")), "dist/umd/supabase.js");
copyFileSync(umd, join(out, "supabase.js"));

const url = (process.env.SUPABASE_URL || "").trim().replace(/\/$/, "");
const key = (process.env.SUPABASE_ANON_KEY || "").trim();
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) || !key) {
  // vẫn ghi file (rỗng) để trang không báo lỗi 404 khi tải cấu hình
  writeFileSync(join(out, "online-config.js"), "window.ORB_ONLINE = null;\n");
  console.log("Chưa có SUPABASE_URL / SUPABASE_ANON_KEY → bản Pages chỉ chơi với máy.");
  process.exit(0);
}
writeFileSync(join(out, "online-config.js"), "window.ORB_ONLINE = " + JSON.stringify({ url, key }) + ";\n");
console.log("Đã nạp kết nối trực tuyến cho Đấu Trường Quả Cầu Anime.");
