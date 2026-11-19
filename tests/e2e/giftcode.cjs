/**
 * E2E mã quà tặng: Cài Đặt → Mã quà → nhập mã → nhận nhân vật LR → dùng lại mã bị từ chối.
 * Chạy: node tests/e2e/giftcode.cjs [thư-mục-ảnh] [url]  (cần `pnpm dev` đang chạy)
 */
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }
const out = process.argv[2] || 'test-results';
const url = process.argv[3] || 'http://localhost:5173/';
require('fs').mkdirSync(out, { recursive: true });

async function redeem(p, code) {
  await p.mouse.click(1186, 300); // Cài Đặt
  await p.waitForTimeout(400);
  await p.mouse.click(800, 505); // 🎁 Mã quà
  await p.waitForSelector('#gift-code');
  await p.fill('#gift-code', code);
  await p.mouse.click(640, 410); // Nhận quà
  await p.waitForTimeout(1200);
}

(async () => {
  const b = await pw.chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(url);
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'));
  await p.waitForTimeout(500);
  const save = () => p.evaluate(() => JSON.parse(localStorage.getItem('dccc_save_v1')));

  for (const [code, id] of [['pine2606', 'c_kim_ke'], ['SAPPHIRE2601', 'c_lam_ngoc_hau']]) {
    await redeem(p, code);
    await p.screenshot({ path: `${out}/gift-${id}.png` });
    await p.mouse.click(640, 650); // Nhận & Sử dụng
    await p.waitForTimeout(1200);
    const s = await save();
    if (!s.characters[id]) errs.push(`Mã ${code} không mở khóa ${id}`);
    if (s.selectedCharacterId !== id) errs.push(`Chưa chọn ${id} sau khi nhận`);
    console.log(`• ${code} → ${id}: OK`);
  }
  await p.screenshot({ path: `${out}/gift-hub.png` });
  // dùng lại mã
  const before = (await save()).redeemedCodes.length;
  await redeem(p, 'pine2606');
  const after = await save();
  if (after.redeemedCodes.length !== before) errs.push('Mã đã dùng lại được chấp nhận');
  else console.log('• Dùng lại mã: bị từ chối đúng');
  await p.keyboard.press('Escape');
  // mã sai
  await p.reload();
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'));
  await p.waitForTimeout(500);
  await redeem(p, 'sai-ma-123');
  if ((await save()).redeemedCodes.length !== 2) errs.push('Mã sai được chấp nhận');
  else console.log('• Mã sai: bị từ chối đúng');
  await b.close();
  if (errs.length) { console.error('LỖI:\n' + errs.join('\n')); process.exit(1); }
  console.log('Gift code E2E OK');
})();
