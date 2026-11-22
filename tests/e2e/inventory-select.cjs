/** E2E: Kho Cá → Chọn nhiều → "Chọn tất cả trừ Boss trở lên". Chạy: node tests/e2e/inventory-select.cjs [url] [thư-mục-ảnh] */
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(process.argv[2] || 'http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'));
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('dccc_save_v1'));
  const mk = (uid, fishId) => ({ uid, fishId, level: 1, stars: 1, weightKg: 2, zoneId: 'z_ben_tan_thu', caughtAt: 1, locked: false });
  s.fishes = [mk('a', 'f_ca_ro'), mk('b', 'f_hoa_long_ngu'), mk('c', 'f_boss_lao_ngu'), mk('d', 'f_huyen_minh_long_ngu'), mk('e', 'f_ca_chep')];
  localStorage.setItem('dccc_save_v1', JSON.stringify(s)); });
await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'));
await p.evaluate(() => window.__game.scene.getScene('Hub').scene.start('Inventory')); await p.waitForTimeout(800);
await p.mouse.click(560, 116); await p.waitForTimeout(400);
await p.mouse.click(1058, 458); await p.waitForTimeout(400);
const picked = await p.evaluate(() => [...window.__game.scene.getScene('Inventory').picked].sort());
await p.screenshot({ path: (process.argv[3] || 'test-results') + '/inventory-select.png' });
await b.close(); if (JSON.stringify(picked) !== JSON.stringify(['a','b','e']) || errs.length) { console.error('LỖI: chọn sai ' + JSON.stringify(picked) + ' ' + errs.join('|')); process.exit(1); } console.log('• Chọn tất cả trừ Boss trở lên: chọn Thường/Huyền Thoại, giữ lại Boss console.log(JSON.stringify(picked), errs.join('|')); await b.close(); Thần Thoại'); console.log('Inventory Select E2E OK'); })();
