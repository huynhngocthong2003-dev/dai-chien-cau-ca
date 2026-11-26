/**
 * E2E HERO ARENA: sảnh → quà/mã quà → hòm thư → chọn anh hùng → vào trận 20 người,
 * di chuyển & đánh bằng bàn phím → khóa nhánh cấp 5 → chọn thẻ → chơi tự động tới hết trận → nhận thưởng.
 * Chạy: pnpm dev:arena (cửa sổ khác) rồi pnpm test:e2e:arena
 *   node tests/e2e/hero-arena.mjs [url] [thư-mục-ảnh]
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
const url = process.argv[2] ?? "http://localhost:5174/";
const outDir = process.argv[3] ?? "test-results/hero-arena";
mkdirSync(outDir, { recursive: true });

const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console.error: ${m.text()}`);
});
const waitScene = (key, timeout = 8000) => page.waitForFunction((k) => window.__game.scene.isActive(k), key, { timeout });
const shot = (name) => page.screenshot({ path: `${outDir}/${name}.png` });
const save = () => page.evaluate(() => JSON.parse(localStorage.getItem("hero_arena_save_v1")));
const step = (msg) => console.log(`• ${msg}`);
const fail = async (msg) => {
  console.error(`✗ ${msg}`);
  await shot("fail");
  await browser.close();
  process.exit(1);
};
const expect = async (cond, msg) => {
  if (!cond) await fail(msg);
};

await page.goto(url);
await page.evaluate(() => localStorage.removeItem("hero_arena_save_v1"));
await page.reload();
await page.waitForFunction(() => window.__ready === true, null, { timeout: 20000 });
await waitScene("Lobby");
await page.waitForTimeout(500);
await shot("01-lobby");
let s = await save();
await expect(s.inventory.gold === 1000 && s.mails.length === 2, "save mới phải có 1000 vàng và 2 thư hệ thống");
step("Sảnh + save mới");

// Quà tặng: quà trong danh sách + mã quà
await page.mouse.click(1130, 150);
await page.waitForTimeout(300);
await page.mouse.click(980, 190); // Nhận "Quà Ra Mắt"
await page.waitForTimeout(300);
await page.fill("#gift-code", "heroarena2026");
await page.mouse.click(870, 574);
await page.waitForTimeout(300);
await page.fill("#gift-code", "HEROARENA2026");
await page.mouse.click(870, 574); // lần 2 phải bị từ chối
await page.waitForTimeout(300);
await shot("02-gift");
s = await save();
await expect(s.inventory.gold === 1000 + 300 + 800, `vàng sau quà sai: ${s.inventory.gold}`);
await expect(s.inventory.gems === 200, `ngọc sau quà sai: ${s.inventory.gems}`);
await expect(s.ledger.length === 2, "mỗi quà ghi đúng 1 dòng sổ cái");
await page.mouse.click(1080, 96);
step("Quà + mã quà (nhận 1 lần)");

// Hòm thư: nhận tất cả
await page.mouse.click(1130, 235);
await page.waitForTimeout(300);
await page.mouse.click(330, 610);
await page.waitForTimeout(300);
await shot("03-mail");
s = await save();
await expect(s.inventory.gold === 2400 && s.mails.every((m) => !m.reward || m.isClaimed), "nhận quà thư thất bại");
await page.mouse.click(1080, 96);
step("Hòm thư: nhận tất cả");

// Chọn anh hùng: Xạ Thủ, Nữ
await page.mouse.click(235, 600);
await waitScene("HeroSelect");
await page.mouse.click(559, 210);
await page.mouse.click(370, 640);
await page.waitForTimeout(300);
await shot("04-select");
await page.mouse.click(950, 660);
await waitScene("Arena");
await page.waitForTimeout(800);
const info = await page.evaluate(() => {
  const a = window.__arenaScene.arena;
  return { n: a.fighters.length, hero: a.player.state.heroId, g: a.player.state.gender, x: a.player.x, potions: a.player.potions };
});
await expect(info.n === 20 && info.hero === "ranger" && info.g === "female", `trận sai: ${JSON.stringify(info)}`);
await expect(info.potions === 5, `phải mang 3 bình máu kho + 2 mặc định, có ${info.potions}`);
step("Vào trận 20 người");

// Điều khiển bằng bàn phím
await page.keyboard.down("d");
await page.keyboard.down("Space");
await page.waitForTimeout(1200);
await page.keyboard.up("d");
await page.keyboard.up("Space");
await page.keyboard.press("q");
const x2 = await page.evaluate(() => window.__arenaScene.arena.player.x);
await expect(Math.abs(x2 - info.x) > 100, "nhân vật không di chuyển khi bấm D");
await shot("05-arena");
step("Di chuyển & đánh");

// Lên cấp 5 (móc kiểm thử) → khóa nhánh → chọn thẻ
await page.evaluate(() => {
  window.__arenaScene.arena.player.state.exp += 680;
});
await page.waitForFunction(() => window.__arenaScene.arena.player.state.needsBranch === true, null, { timeout: 5000 });
await page.waitForTimeout(400);
await shot("06-branch");
await page.mouse.click(250, 610); // nhánh 1: Sniper
await page.waitForTimeout(300);
let br = await page.evaluate(() => window.__arenaScene.arena.player.state.branchId);
await expect(br === "sniper", `chưa khóa nhánh: ${br}`);
await shot("07-upgrade");
for (let i = 0; i < 8; i++) {
  const left = await page.evaluate(() => window.__arenaScene.arena.player.state.pendingOffers.length);
  if (left === 0) break;
  await page.mouse.click(640, 540);
  await page.waitForTimeout(250);
}
const picked = await page.evaluate(() => Object.values(window.__arenaScene.arena.player.state.pickedUpgrades).reduce((a, b) => a + b, 0));
await expect(picked >= 4, `phải chọn đủ thẻ (cấp 2,3,4 + sau khi khóa nhánh), mới có ${picked}`);
step(`Khóa nhánh Sniper + chọn ${picked} thẻ`);

// Chơi tự động, tăng tốc tới hết trận
await page.evaluate(() => {
  const sc = window.__arenaScene;
  sc.arena.setAutopilot(true);
  sc.timeScale = 12;
});
await page.waitForTimeout(3000);
await shot("08-autoplay");
await waitScene("Result", 180000);
await page.waitForTimeout(600);
await shot("09-result");
s = await save();
await expect(s.stats.matches === 1, "chưa ghi nhận trận");
await expect(s.inventory.gold > 2400, "chưa cộng vàng thưởng trận");
await expect(s.ledger.some((e) => e.txId.startsWith("match:")), "thưởng trận phải ghi sổ cái");
await expect(s.tutorial.completed.includes("lock_branch_at_lv5") && s.tutorial.completed.includes("pick_random_upgrade"), "bước tân thủ chưa ghi");
step(`Kết thúc trận: hạng ${s.stats.bestPlacement}, vàng ${s.inventory.gold}`);

await page.mouse.click(810, 580);
await waitScene("Lobby");
await page.waitForTimeout(400);
await shot("10-lobby-after");
step("Về sảnh");

await browser.close();
if (errors.length) {
  console.error("Lỗi console:\n" + errors.join("\n"));
  process.exit(1);
}
console.log("✓ HERO ARENA E2E đạt");
