/**
 * E2E HERO ARENA – chơi chung (2 tab, kênh giả lập `?mockroom`):
 * A tạo phòng → B vào bằng mã → A bắt đầu (2 người + 18 máy) → B chạy & đánh, nhân vật B di chuyển trên trận của A
 * → B lên cấp 5 chọn Dạng 2 (gửi lên chủ phòng) → A rời phòng → B được báo và kết thúc.
 * Chạy: pnpm dev:arena (cửa sổ khác) rồi node tests/e2e/hero-arena-mp.mjs
 */
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";

const require = createRequire(import.meta.url);
let pw;
try {
  pw = require("playwright");
} catch {
  pw = require("/opt/node-tools/node_modules/playwright");
}
const base = process.argv[2] ?? "http://localhost:5174/";
const url = `${base}?mockroom`;
const outDir = process.argv[3] ?? "test-results/hero-arena-mp";
mkdirSync(outDir, { recursive: true });

const browser = await pw.chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const A = await ctx.newPage();
const B = await ctx.newPage();
const errors = [];
for (const [name, p] of [["A", A], ["B", B]]) {
  p.on("pageerror", (e) => errors.push(`${name} pageerror: ${e.message}`));
  p.on("console", (m) => m.type() === "error" && errors.push(`${name} console.error: ${m.text()}`));
}
const step = (m) => console.log(`• ${m}`);
const fail = async (m) => {
  console.error(`✗ ${m}`);
  await A.screenshot({ path: `${outDir}/fail-A.png` });
  await B.screenshot({ path: `${outDir}/fail-B.png` });
  await browser.close();
  process.exit(1);
};
const expect = async (c, m) => {
  if (!c) await fail(m);
};
const waitScene = (p, key, timeout = 10000) => p.waitForFunction((k) => window.__game.scene.isActive(k), key, { timeout });

for (const p of [A, B]) {
  await p.goto(url);
  await p.waitForFunction(() => window.__ready === true, null, { timeout: 20000 });
  await waitScene(p, "Lobby");
}
// A: VÀO TRẬN → chọn anh hùng → Tiếp tục → màn mời bạn (phòng tự tạo)
await A.mouse.click(235, 600);
await waitScene(A, "HeroSelect");
await A.mouse.click(1000, 676);
await waitScene(A, "Multiplayer");
await A.waitForFunction(() => window.__game.scene.getScene("Multiplayer").code?.length > 0, null, { timeout: 10000 });
const code = await A.evaluate(() => window.__game.scene.getScene("Multiplayer").code);
step(`A tạo phòng ${code}`);
// B vào phòng
await B.mouse.click(1130, 420);
await waitScene(B, "Multiplayer");
await B.waitForSelector("#mp-code");
await B.fill("#mp-name", "Bạn B");
await B.fill("#mp-code", code);
await B.mouse.click(800, 460);
await A.waitForFunction(() => window.__game.scene.getScene("Multiplayer").room?.peers().filter((p) => typeof p.presence.n === "string").length >= 2, null, { timeout: 10000 });
await A.waitForTimeout(500);
await A.screenshot({ path: `${outDir}/01-room-A.png` });
await B.screenshot({ path: `${outDir}/02-room-B.png` });
step("B vào phòng, A thấy 2 người");
// A bắt đầu
await A.mouse.click(975, 540);
await waitScene(A, "Arena", 15000);
await waitScene(B, "Arena", 15000);
await B.waitForFunction(() => window.__arenaScene?.lastSnapT >= 0, null, { timeout: 10000 });
const info = await B.evaluate(() => {
  const a = window.__arenaScene.arena;
  return { me: a.playerId, n: a.fighters.length, humans: a.fighters.filter((f) => !f.bot).map((f) => f.state.name) };
});
await expect(info.me === "h1" && info.n === 20 && info.humans.length === 2, `trận sai ở B: ${JSON.stringify(info)}`);
step(`Vào trận chung: ${info.humans.join(" + ")} + 18 máy`);
// B chạy sang phải: trên trận của A nhân vật h1 phải dịch chuyển
const ax0 = await A.evaluate(() => window.__arenaScene.arena.fighterById("h1").x);
await B.bringToFront();
await B.keyboard.down("d");
await B.waitForTimeout(1500);
await B.keyboard.up("d");
await A.waitForTimeout(400);
const ax1 = await A.evaluate(() => window.__arenaScene.arena.fighterById("h1").x);
await expect(ax1 - ax0 > 150, `thao tác của B không tới chủ phòng: ${ax0} → ${ax1}`);
const bx = await B.evaluate(() => window.__arenaScene.arena.player.x);
await expect(Math.abs(bx - ax1) < 200, `vị trí B lệch chủ phòng: B ${bx} / A ${ax1}`);
await B.screenshot({ path: `${outDir}/03-B-moving.png` });
step(`B điều khiển được nhân vật (A thấy h1 đi ${Math.round(ax1 - ax0)}px)`);
// B lên cấp 5 (chủ phòng cộng KN) → bảng chọn Dạng 2 ở B → B chọn → chủ phòng ghi nhận
await A.evaluate(() => {
  window.__arenaScene.arena.fighterById("h1").state.exp += 700;
});
await B.waitForFunction(() => window.__arenaScene.arena.player.state.needsBranch === true, null, { timeout: 8000 });
await B.waitForFunction(() => window.__arenaScene.modal !== null, null, { timeout: 5000 });
await B.waitForTimeout(300);
await B.screenshot({ path: `${outDir}/04-B-branch.png` });
await B.mouse.click(250, 610);
await A.waitForFunction(() => window.__arenaScene.arena.fighterById("h1").state.branchId !== null, null, { timeout: 8000 });
const br = await A.evaluate(() => window.__arenaScene.arena.fighterById("h1").state.branchId);
step(`B chọn Dạng 2 (${br}) – chủ phòng đã áp dụng`);
await A.screenshot({ path: `${outDir}/05-A-view.png` });
// A rời → B được báo, kết thúc
await A.close();
await waitScene(B, "Result", 20000);
await B.screenshot({ path: `${outDir}/06-B-result.png` });
step("Chủ phòng rời → B kết thúc trận");

await browser.close();
const real = errors.filter((e) => !/Target page, context or browser has been closed/.test(e));
if (real.length) {
  console.error("Lỗi console:\n" + real.join("\n"));
  process.exit(1);
}
console.log("✓ HERO ARENA chơi chung E2E đạt");
