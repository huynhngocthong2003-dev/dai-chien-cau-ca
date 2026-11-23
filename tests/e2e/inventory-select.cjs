/**
 * E2E Kho Cá: Chọn nhiều → bật NHIỀU BẬC cùng lúc (Thường + Huyền Thoại), bấm lại 1 bậc để bỏ bậc đó ra;
 * Kho Cá chia trang (18 con / trang, ◀ ▶).
 * Chạy: node tests/e2e/inventory-select.cjs [url] [thư-mục-ảnh]
 */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const out = process.argv[3] || 'test-results';
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => localStorage.setItem('dccc_skip_tutorial', '1')); // bỏ qua hướng dẫn tân thủ (có E2E riêng)
  await p.goto(process.argv[2] || 'http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'));
  await p.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('dccc_save_v1'));
    const mk = (uid, fishId) => ({ uid, fishId, level: 1, stars: 1, weightKg: 2, zoneId: 'z_ben_tan_thu', caughtAt: 1, locked: false });
    s.fishes = [mk('a', 'f_ca_ro'), mk('b', 'f_hoa_long_ngu'), mk('c', 'f_boss_lao_ngu'), mk('d', 'f_huyen_minh_long_ngu'), mk('e', 'f_ca_chep')];
    for (let i = 0; i < 20; i++) s.fishes.push(mk('x' + i, 'f_ca_chep'));
    localStorage.setItem('dccc_save_v1', JSON.stringify(s));
  });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'));
  await p.evaluate(() => window.__game.scene.getScene('Hub').scene.start('Inventory'));
  await p.waitForTimeout(800);
  const inv = () => p.evaluate(() => { const sc = window.__game.scene.getScene('Inventory'); return { page: sc.page, picked: [...sc.picked].filter((u) => !u.startsWith('x')).sort(), n: sc.picked.size }; });
  // chia trang
  await p.mouse.click(560, 678);
  await p.waitForTimeout(300);
  if ((await inv()).page !== 1) errs.push('Không lật sang trang 2');
  else console.log('• Kho Cá chia trang: 25 con → 2 trang, ▶ sang trang 2');
  await p.screenshot({ path: `${out}/inventory-page2.png` });
  await p.mouse.click(300, 678);
  await p.waitForTimeout(300);
  // chọn nhiều theo bậc
  await p.mouse.click(560, 116);
  await p.waitForTimeout(400);
  await p.mouse.click(930, 374); // Thường
  await p.waitForTimeout(300);
  await p.mouse.click(973, 420); // Huyền Thoại
  await p.waitForTimeout(300);
  let st = await inv();
  if (JSON.stringify(st.picked) !== JSON.stringify(['a', 'b', 'e']) || st.n !== 23) errs.push('Bật Thường + Huyền Thoại chọn sai: ' + JSON.stringify(st));
  else console.log('• Bật Thường + Huyền Thoại cùng lúc: chọn 23 con, giữ lại Boss & Thần Thoại');
  await p.screenshot({ path: `${out}/inventory-select.png` });
  await p.mouse.click(930, 374); // bỏ Thường ra
  await p.waitForTimeout(300);
  st = await inv();
  if (JSON.stringify(st.picked) !== JSON.stringify(['b']) || st.n !== 1) errs.push('Bỏ bậc Thường chưa đúng: ' + JSON.stringify(st));
  else console.log('• Bấm lại Thường: bỏ cả bậc Thường, còn Huyền Thoại');
  await b.close();
  if (errs.length) { console.error('LỖI: ' + errs.join(' | ')); process.exit(1); }
  console.log('Inventory Select E2E OK');
})();
