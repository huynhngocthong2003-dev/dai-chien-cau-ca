/**
 * Chuyển bản build một-file (dist-single/index.html) thành trang để xuất bản
 * lên claude.ai Artifact: bỏ khung <html>/<head>/<body> (nền tảng tự bọc),
 * giữ <title>, font, CSS, nội dung và script.
 */
import { readFileSync, writeFileSync } from "node:fs";
import process from "node:process";

// Tham số: thư mục app (mặc định game câu cá). Ví dụ: node scripts/make-artifact.mjs apps/hero-arena
const appDir = process.argv[2] ?? "apps/game-client";
const src = readFileSync(`${appDir}/dist-single/index.html`, "utf8");
const head = src.match(/<head>([\s\S]*?)<\/head>/i)?.[1] ?? "";
const body = src.match(/<body>([\s\S]*?)<\/body>/i)?.[1] ?? "";
const title = head.match(/<title>[\s\S]*?<\/title>/i)?.[0] ?? "<title>Đại Chiến Câu Cá</title>";
// Bỏ manifest/biểu tượng PWA: trang Artifact không phục vụ file riêng
const links = [...head.matchAll(/<link[^>]+>/gi)]
  .map((m) => m[0])
  .filter((l) => !/rel="(manifest|apple-touch-icon)"/.test(l))
  .join("\n");
const styles = [...head.matchAll(/<style[\s\S]*?<\/style>/gi)].map((m) => m[0]).join("\n");
const scripts = [...head.matchAll(/<script[\s\S]*?<\/script>/gi)].map((m) => m[0]).join("\n");
if (!scripts) throw new Error("Không tìm thấy script trong bản build");
const out = `${title}\n${links}\n${styles}\n${body.trim()}\n${scripts}\n`;
writeFileSync(`${appDir}/dist-single/artifact.html`, out);
console.log(`artifact.html: ${(out.length / 1024).toFixed(0)} KB`);
