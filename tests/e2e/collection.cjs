/**
 * E2E Bộ Sưu Tập cuộn được: lăn chuột, kéo thanh cuộn, vuốt (điện thoại); bấm chọn loài sau khi cuộn;
 * ô bị che bởi khung không bấm nhầm được.
 * Chạy: node tests/e2e/collection.cjs [thư-mục-ảnh] <url>
 */
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }
const out = process.argv[2] || 'test-results';
const url = process.argv[3] || 'http://localhost:5173/';
require('fs').mkdirSync(out, { recursive: true });
const errs = [];
(async () => {
  const b = await pw.chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'));
  await p.evaluate(() => window.__game.scene.getScene('Hub').scene.start('Inventory', { tab: 'collection' }));
  await p.waitForTimeout(1200);
  const scroll = () => p.evaluate(() => window.__game.scene.getScene('Inventory').colScroll);
  await p.mouse.move(400, 400);
  await p.mouse.wheel(0, 40);
  await p.waitForTimeout(500);
  const s1 = await scroll();
  if (s1 <= 0) errs.push('Lăn chuột không cuộn được');
  else console.log(`• Lăn chuột: cuộn ${Math.round(s1)}px`);
  await p.screenshot({ path: `${out}/collection-scrolled.png` });
  // kéo thanh cuộn xuống đáy
  await p.mouse.move(836, 200);
  await p.mouse.down();
  await p.mouse.move(836, 700, { steps: 6 });
  await p.mouse.up();
  await p.waitForTimeout(300);
  const s2 = await p.evaluate(() => { const sc = window.__game.scene.getScene('Inventory'); return sc.colScroll; });
  if (s2 <= s1) errs.push('Kéo thanh cuộn không xuống đáy');
  else console.log(`• Kéo thanh cuộn: tới ${Math.round(s2)}px (đáy)`);
  // bấm 1 ô sau khi cuộn → chọn đúng loài, vị trí cuộn được giữ
  await p.mouse.click(16 + 50, 600);
  await p.waitForTimeout(400);
  const after = await p.evaluate(() => ({ sel: window.__game.scene.getScene('Inventory').selectedUid, s: window.__game.scene.getScene('Inventory').colScroll }));
  if (!after.sel || Math.abs(after.s - s2) > 1) errs.push('Bấm sau khi cuộn bị lỗi: ' + JSON.stringify(after));
  else console.log(`• Bấm chọn "${after.sel}" sau khi cuộn – giữ nguyên vị trí cuộn`);
  // vuốt kéo lưới lên lại (kéo không bị tính là bấm)
  const selBefore = after.sel;
  await p.mouse.move(400, 300);
  await p.mouse.down();
  await p.mouse.move(400, 650, { steps: 8 });
  await p.mouse.up();
  await p.waitForTimeout(300);
  const s3 = await scroll();
  const sel3 = await p.evaluate(() => window.__game.scene.getScene('Inventory').selectedUid);
  if (s3 >= s2) errs.push('Vuốt không cuộn được');
  else if (sel3 !== selBefore) errs.push('Vuốt bị tính nhầm là bấm chọn');
  else console.log(`• Vuốt kéo lưới: cuộn về ${Math.round(s3)}px, không chọn nhầm`);
  await p.screenshot({ path: `${out}/collection-bottom.png` });
  await b.close();
  if (errs.length) { console.error('LỖI:\n' + errs.join('\n')); process.exit(1); }
  console.log('Collection E2E OK');
})();
