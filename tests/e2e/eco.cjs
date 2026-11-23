/**
 * E2E môi trường & sự kiện: tái chế rác → điểm → mua & mặc Mũ Lá Xanh; nhận quà Tân Thủ 500 💎.
 * Chạy: node tests/e2e/eco.cjs [thư-mục-ảnh] [url]   (test tự đặt sẵn rác vào save cục bộ)
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
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => localStorage.setItem('dccc_skip_tutorial', '1')); // bỏ qua hướng dẫn tân thủ (có E2E riêng)
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'));
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('dccc_save_v1')); s.eco.junk = { j_chai_nhua: 3, j_dep_le: 2 }; localStorage.setItem('dccc_save_v1', JSON.stringify(s)); });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'));
  await p.waitForTimeout(500);
  const save = () => p.evaluate(() => JSON.parse(localStorage.getItem('dccc_save_v1')));
  // Sự kiện Tân Thủ
  const d0 = (await save()).diamonds;
  await p.mouse.click(914, 580);
  await p.waitForTimeout(500);
  await p.mouse.click(900, 254);
  await p.waitForTimeout(500);
  const d1 = (await save()).diamonds;
  if (d1 !== d0 + 500) errs.push(`Quà Tân Thủ sai: ${d0} → ${d1}`);
  else console.log(`• Quà Tân Thủ: ${d0} → ${d1} 💎`);
  await p.mouse.click(900, 254); // bấm lại: không nhận thêm
  await p.waitForTimeout(300);
  if ((await save()).diamonds !== d1) errs.push('Nhận quà Tân Thủ 2 lần');
  await p.keyboard.press('Escape');
  // Cửa hàng → Môi Trường
  await p.evaluate(() => window.__game.scene.getScenes(true)[0].scene.start('Shop', { tab: 'eco' }));
  await p.waitForTimeout(700);
  await p.mouse.click(720, 370); // Tái chế
  await p.waitForTimeout(500);
  const s1 = await save();
  if (s1.eco.points !== 3 * 3 + 2 * 4 || Object.keys(s1.eco.junk).length) errs.push(`Tái chế sai: ${s1.eco.points} điểm`);
  else console.log(`• Tái chế 5 món rác → ${s1.eco.points} 🌿`);
  await p.mouse.click(16 + 79, 430 + 130); // Mũ Lá Xanh
  await p.waitForTimeout(300);
  await p.mouse.click(1058, 538); // mua
  await p.waitForTimeout(300);
  await p.mouse.click(966, 608); // mặc
  await p.waitForTimeout(500);
  const s2 = await save();
  if (s2.characters.c_be_tom.equip.hat !== 'h_mu_la_xanh' || s2.eco.points !== s1.eco.points - 15) errs.push('Mua/mặc Mũ Lá Xanh sai');
  else console.log(`• Mua & mặc Mũ Lá Xanh (−15 🌿, còn ${s2.eco.points})`);
  await p.screenshot({ path: `${out}/eco.png` });
  await b.close();
  if (errs.length) { console.error('LỖI:\n' + errs.join('\n')); process.exit(1); }
  console.log('Eco E2E OK');
})();
