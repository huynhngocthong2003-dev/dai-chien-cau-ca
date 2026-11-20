/**
 * Kiểm thử E2E: mở game, đi qua các màn hình và chơi thật một ván câu cá
 * bằng chuột (giống người chơi). Chạy: pnpm dev (cửa sổ khác) rồi pnpm test:e2e
 *   node tests/e2e/smoke.mjs [url] [thư-mục-ảnh]
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
const url = process.argv[2] ?? "http://localhost:5173/";
const outDir = process.argv[3] ?? "test-results";
mkdirSync(outDir, { recursive: true });

const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console.error: ${m.text()}`);
});

const scene = (key) => page.evaluate((k) => window.__game.scene.isActive(k), key);
const waitScene = (key) => page.waitForFunction((k) => window.__game.scene.isActive(k), key, { timeout: 8000 });
const shot = (name) => page.screenshot({ path: `${outDir}/${name}.png` });
const step = (msg) => console.log(`• ${msg}`);

await page.goto(url);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 15000 });
await waitScene("Hub");
await page.waitForTimeout(600);
await shot("01-hub");
step("Sảnh chính hiển thị");

// Vào bản đồ bằng nút CÂU CÁ
await page.mouse.click(420, 640);
await waitScene("Zone");
await page.waitForTimeout(500);
await shot("02-zone");
step("Bản đồ khu vực");

// Bắt đầu câu
await page.mouse.click(865, 658);
await waitScene("Fishing");
await page.waitForTimeout(500);
await shot("03-fishing-idle");

let result = null;
for (let round = 1; round <= 4 && result !== "caught"; round++) {
  // Giữ để lấy lực rồi thả để quăng
  await page.mouse.move(700, 450);
  await page.mouse.down();
  await page.waitForTimeout(650);
  await page.mouse.up();
  await page.waitForFunction(() => window.__game.scene.getScene("Fishing").session !== null, null, { timeout: 5000 });
  step(`Ván ${round}: đã quăng cần`);
  // Chờ cá cắn rồi giật cần
  await page.waitForFunction(() => window.__game.scene.getScene("Fishing").session?.phase === "bite", null, { timeout: 15000 });
  await page.mouse.click(700, 450);
  await page.waitForFunction(() => window.__game.scene.getScene("Fishing").session?.phase === "reeling", null, { timeout: 3000 });
  step("Đã giật cần – bắt đầu kéo");
  let shotTaken = false;
  const t0 = Date.now();
  while (Date.now() - t0 < 90000) {
    const st = await page.evaluate(() => {
      const s = window.__game.scene.getScene("Fishing").session;
      return s ? { phase: s.phase, tension: s.tension, cd: s.skillCooldownLeft } : null;
    });
    if (!st || st.phase !== "reeling") {
      result = st?.phase ?? "unknown";
      // vớt phải rác (12%) không tính là bắt được cá – câu ván khác
      if (result === "caught" && (await page.evaluate(() => !!window.__game.scene.getScene("Fishing").junk))) {
        step("Vớt phải rác – câu ván khác");
        result = "junk";
      }
      break;
    }
    if (st.tension < 45) await page.mouse.down();
    else if (st.tension > 70) await page.mouse.up();
    if (st.cd === 0) await page.keyboard.press("q");
    if (!shotTaken && Date.now() - t0 > 2500) {
      await shot("04-fishing-reeling");
      shotTaken = true;
    }
    await page.waitForTimeout(60);
  }
  await page.mouse.up();
  step(`Kết quả ván ${round}: ${result}`);
  await page.waitForTimeout(2200);
  await shot(`05-result-${round}`);
  if (result !== "caught") await page.keyboard.press("Space");
  await page.waitForTimeout(400);
  if (result !== "caught") {
    const mode = await page.evaluate(() => window.__game.scene.getScene("Fishing").mode);
    if (mode !== "idle") errors.push(`Space không bấm được "Câu tiếp" (mode=${mode})`);
  }
}
// Space ở bảng kết quả khi đã bắt được cá
if (result === "caught") {
  await page.keyboard.press("Space");
  await page.waitForTimeout(600);
  const mode = await page.evaluate(() => window.__game.scene.getScene("Fishing").mode);
  if (mode !== "idle") errors.push(`Space không bấm được "Câu tiếp" sau khi bắt cá (mode=${mode})`);
  else step('Space → "Câu tiếp" hoạt động');
  // quay lại bảng kết quả để các bước sau bấm "Xem Kho Cá"
  await page.evaluate(() => { const f = window.__game.scene.getScene("Fishing"); f.mode = "result"; f.showResult("caught"); });
  await page.waitForTimeout(500);
}

const save = await page.evaluate(() => JSON.parse(localStorage.getItem("dccc_save_v1") ?? "null"));
if (result === "caught") {
  if (!save || save.fishes.length < 1) errors.push("Bắt được cá nhưng không có trong save");
  step(`Save: cấp ${save.level}, ${save.fishes.length} cá, ${save.gold} vàng, ${save.materials.stones} đá`);
  if (save.materials.stones < 1) errors.push("Bắt cá không rơi Đá Nâng Cấp");
}

// Tải lại trang: tiến trình phải còn nguyên (hồi quy lỗi mất dữ liệu)
if (result === "caught") {
  await page.reload();
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 15000 });
  await waitScene("Hub");
  const reloaded = await page.evaluate(() => JSON.parse(localStorage.getItem("dccc_save_v1")));
  if (reloaded.playerId !== save.playerId || reloaded.fishes.length !== save.fishes.length) errors.push("Mất tiến trình sau khi tải lại trang");
  else step("Tải lại trang: tiến trình còn nguyên");
  await page.waitForTimeout(400);
  await page.mouse.click(1186, 160);
  await waitScene("Inventory");
} else {
  await page.mouse.click(760, 570);
  await waitScene("Inventory");
}

// Kho cá + bán cá
await page.waitForTimeout(500);
await shot("06-inventory");
step("Kho cá");
const goldBefore = save?.gold ?? 0;
if (save?.fishes.length) {
  await page.mouse.click(1058, 600);
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem("dccc_save_v1")));
  if (after.gold <= goldBefore || after.fishes.length !== save.fishes.length - 1) errors.push("Bán cá không cộng vàng");
  else step(`Bán cá: ${goldBefore} → ${after.gold} vàng`);
}
await page.mouse.click(310, 116);
await page.waitForTimeout(400);
await shot("07-collection");

// Nhân vật & cần câu
await page.mouse.click(62, 38);
await waitScene("Hub");
await page.waitForTimeout(400);
await page.mouse.click(914, 160);
await waitScene("Characters");
await page.waitForTimeout(500);
await shot("08-characters");
await page.mouse.click(62, 38);
await waitScene("Hub");
await page.waitForTimeout(400);
await page.mouse.click(1050, 160);
await waitScene("Rods");
await page.waitForTimeout(500);
await shot("09-rods");
step("Màn hình nhân vật & cần câu");

// Săn Boss: vào bản đồ → nút Săn Boss → Boss chắc chắn cắn câu, tiêu 1 vé
await page.mouse.click(62, 38);
await waitScene("Hub");
await page.waitForTimeout(400);
await page.mouse.click(420, 640);
await waitScene("Zone");
await page.waitForTimeout(500);
const ticketsBefore = await page.evaluate(() => JSON.parse(localStorage.getItem("dccc_save_v1")).materials.bossTickets);
await page.mouse.click(1120, 658);
await waitScene("Fishing");
await page.waitForTimeout(400);
await page.mouse.move(700, 450);
await page.mouse.down();
await page.waitForTimeout(500);
await page.mouse.up();
await page.waitForFunction(() => window.__game.scene.getScene("Fishing").session !== null, null, { timeout: 5000 });
const huntFish = await page.evaluate(() => window.__game.scene.getScene("Fishing").fishDef.rarity);
const ticketsAfter = await page.evaluate(() => JSON.parse(localStorage.getItem("dccc_save_v1")).materials.bossTickets);
if (huntFish !== "boss") errors.push(`Săn Boss nhưng cá là ${huntFish}`);
if (ticketsAfter !== ticketsBefore - 1) errors.push(`Vé Boss không bị trừ đúng: ${ticketsBefore} → ${ticketsAfter}`);
await page.waitForFunction(() => window.__game.scene.getScene("Fishing").session?.phase === "bite", null, { timeout: 15000 });
await page.mouse.click(700, 450);
await page.waitForTimeout(2500);
await shot("09b-boss-hunt");
step(`Săn Boss: cá ${huntFish}, vé ${ticketsBefore} → ${ticketsAfter}`);

// Điện thoại (ngang)
const phone = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
phone.on("pageerror", (e) => errors.push(`phone pageerror: ${e.message}`));
await phone.goto(url);
await phone.waitForFunction(() => window.__ready === true, null, { timeout: 15000 });
await phone.waitForTimeout(800);
await phone.screenshot({ path: `${outDir}/10-phone-landscape.png` });
step("Hiển thị trên điện thoại (ngang)");

await browser.close();
void scene;
if (errors.length) {
  console.error("LỖI:\n" + errors.join("\n"));
  process.exit(1);
}
console.log(`\nE2E OK – kết quả câu: ${result}`);
