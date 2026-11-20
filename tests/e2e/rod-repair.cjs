/**
 * E2E độ bền cần câu: cần còn 1 lượt → quăng được (còn 0) → quăng tiếp bị chặn, hiện hộp "Cần câu đã hết lượt"
 * → bấm Sửa cần (trừ vàng) → đầy lượt, quăng được. Màn Cần Câu hiện lượt câu.
 * Chạy: node tests/e2e/rod-repair.cjs [thư-mục-ảnh] <url>
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
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('dccc_save_v1')); s.rods.r_tre.wear = 59; s.gold = 1000; localStorage.setItem('dccc_save_v1', JSON.stringify(s)); });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'));
  const save = () => p.evaluate(() => JSON.parse(localStorage.getItem('dccc_save_v1')));
  await p.evaluate(() => window.__game.scene.getScene('Hub').scene.start('Fishing', { zoneId: 'z_ben_tan_thu' }));
  await p.waitForTimeout(1500);
  const cast = async () => { await p.mouse.move(700, 450); await p.mouse.down(); await p.waitForTimeout(500); await p.mouse.up(); await p.waitForTimeout(1500); };
  await cast();
  let s = await save();
  if (s.rods.r_tre.wear !== 60) errs.push('Quăng cần không tốn lượt: ' + s.rods.r_tre.wear);
  else console.log('• Quăng cần: tốn 1 lượt (còn 0/60)');
  // quay lại trạng thái chờ rồi quăng tiếp → bị chặn
  await p.evaluate(() => { const f = window.__game.scene.getScene('Fishing'); f.toIdle(); });
  await p.waitForTimeout(500);
  await cast();
  const blocked = await p.evaluate(() => window.__game.scene.getScene('Fishing').session === null);
  await p.screenshot({ path: `${out}/rod-repair-dialog.png` });
  if (!blocked) errs.push('Hết lượt mà vẫn quăng được');
  else console.log('• Hết lượt: không quăng được, hiện hộp sửa cần');
  await p.mouse.click(640, 200 + 230); // nút Sửa cần (modal 600×320 ở y=200)
  await p.waitForTimeout(800);
  s = await save();
  if ((s.rods.r_tre.wear ?? 0) !== 0 || s.gold !== 850 || !s.ledger.some((l) => l.reason === 'rod_repair:r_tre')) errs.push('Sửa cần sai: ' + JSON.stringify({ wear: s.rods.r_tre.wear, gold: s.gold }));
  else console.log('• Sửa cần: −150 vàng (ghi sổ cái), đầy 60 lượt');
  await p.evaluate(() => window.__game.scene.getScene('Fishing').scene.start('Rods'));
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${out}/rod-uses.png` });
  const shown = await p.evaluate(() => window.__game.scene.getScene('Rods').children.list.some((o) => (o.list ?? [o]).some((x) => typeof x.text === 'string' && x.text.includes('Lượt câu'))));
  if (!shown) errs.push('Màn Cần Câu không hiện lượt câu');
  else console.log('• Màn Cần Câu hiện "🔧 Lượt câu"');
  await b.close();
  if (errs.length) { console.error('LỖI:\n' + errs.join('\n')); process.exit(1); }
  console.log('Rod Repair E2E OK');
})();
