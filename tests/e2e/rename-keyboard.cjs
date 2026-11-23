/**
 * E2E Android: bấm "Đổi tên" → ô nhập tên được chọn → bàn phím ảo làm màn hình co lại
 * → game KHÔNG được dựng lại màn hình (trước đây bị đóng hộp thoại / thoát ra sảnh).
 * Chạy: node tests/e2e/rename-keyboard.cjs [url]
 */
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }
const url = process.argv[2] || 'http://localhost:5173/';
const errs = [];
(async () => {
  const b = await pw.chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 915, height: 412 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'), null, { timeout: 30000 });
  await p.evaluate(() => window.__game.scene.getScene('Hub').scene.start('Account'));
  await p.waitForFunction(() => window.__game.scene.isActive('Account'), null, { timeout: 8000 });
  await p.waitForTimeout(600);
  await p.evaluate(() => window.__game.scene.getScene('Account').renameDialog());
  await p.waitForTimeout(400);
  await p.focus('#acc-rename');
  // bàn phím ảo mở: chiều cao còn ~45%
  await p.setViewportSize({ width: 915, height: 190 });
  await p.waitForTimeout(1200);
  const st = await p.evaluate(() => ({ account: window.__game.scene.isActive('Account'), hub: window.__game.scene.isActive('Hub'), input: !!document.getElementById('acc-rename') }));
  if (!st.account || st.hub || !st.input) errs.push('Bàn phím mở làm mất hộp thoại đổi tên: ' + JSON.stringify(st));
  else console.log('• Bàn phím mở: vẫn ở hộp thoại Đổi tên');
  await p.fill('#acc-rename', 'Ca Map 99');
  await p.evaluate(() => document.activeElement.blur());
  await p.setViewportSize({ width: 915, height: 412 });
  await p.waitForTimeout(1200);
  const st2 = await p.evaluate(() => ({ account: window.__game.scene.isActive('Account'), val: document.getElementById('acc-rename')?.value }));
  if (!st2.account || st2.val !== 'Ca Map 99') errs.push('Đóng bàn phím làm mất tên đang gõ: ' + JSON.stringify(st2));
  else console.log('• Đóng bàn phím: tên đang gõ còn nguyên');
  await b.close();
  if (errs.length) { console.error('LỖI:\n' + errs.join('\n')); process.exit(1); }
  console.log('RENAME KEYBOARD E2E OK');
})();
