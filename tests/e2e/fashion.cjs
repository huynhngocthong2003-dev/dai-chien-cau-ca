/**
 * E2E thời trang bậc cao + chọn nhiều để bán:
 *  - mua & mặc Cánh Phượng Hoàng Thần (Thần Phẩm) → hiệu ứng ở sảnh
 *  - Kho Cá: chọn 3 con → bán (vàng tăng đúng), chọn tất cả → phân giải (cá khóa được giữ)
 * Chạy: node tests/e2e/fashion.cjs [thư-mục-ảnh] [url]
 * Lưu ý: test tự thêm tiền và cá vào save cục bộ để kiểm thử.
 */
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }
const out = process.argv[2] || 'test-results';
const url = process.argv[3] || 'http://localhost:5173/';
require('fs').mkdirSync(out, { recursive: true });
const errs = [];
const step = (m) => console.log('• ' + m);

(async () => {
  const b = await pw.chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => localStorage.setItem('dccc_skip_tutorial', '1')); // bỏ qua hướng dẫn tân thủ (có E2E riêng)
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'));
  await p.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('dccc_save_v1'));
    s.gold = 100000;
    s.diamonds = 5000;
    const ids = ['f_ca_ro', 'f_ca_chep', 'f_ca_tre', 'f_ca_hu', 'f_ca_loc', 'f_ca_bong_mau', 'f_ca_ro'];
    s.fishes = ids.map((id, i) => ({ uid: 'e2e_' + i, fishId: id, weightKg: 0.5, zoneId: 'z_ben_tan_thu', caughtAt: Date.now(), level: 1, stars: 1, locked: i === 6 }));
    localStorage.setItem('dccc_save_v1', JSON.stringify(s));
  });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'));
  await p.waitForTimeout(500);
  const save = () => p.evaluate(() => JSON.parse(localStorage.getItem('dccc_save_v1')));

  // ---- Cửa hàng → tab Cánh → Cánh Phượng Hoàng Thần
  await p.mouse.click(914, 300);
  await p.waitForFunction(() => window.__game.scene.isActive('Shop'));
  await p.waitForTimeout(400);
  await p.mouse.click(68 + 4 * 106, 116); // tab Cánh
  await p.waitForTimeout(400);
  await p.mouse.click(16 + 4 * 165 + 79, 152 + 130); // thẻ thứ 5
  await p.waitForTimeout(400);
  await p.mouse.click(1058, 538); // mua
  await p.waitForTimeout(300);
  await p.mouse.click(966, 608); // mặc
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${out}/fashion-1-shop.png` });
  let s = await save();
  if (s.characters.c_be_tom.equip.wings !== 'w_canh_phuong_hoang_than') errs.push('Chưa mặc được cánh Thần Phẩm');
  else step(`Mặc Cánh Phượng Hoàng Thần (−${5000 - s.diamonds} 💎)`);
  // Sừng
  await p.mouse.click(68 + 5 * 106, 116);
  await p.waitForTimeout(400);
  await p.mouse.click(16 + 3 * 165 + 79, 152 + 130); // Hào Quang Thánh
  await p.waitForTimeout(300);
  await p.mouse.click(1058, 538);
  await p.waitForTimeout(300);
  await p.mouse.click(966, 608);
  await p.waitForTimeout(600);
  s = await save();
  if (s.characters.c_be_tom.equip.horns !== 'n_hao_quang_thanh') errs.push('Chưa mặc được Hào Quang Thánh');
  else step('Mặc Hào Quang Thánh');
  await p.mouse.click(62, 38);
  await p.waitForFunction(() => window.__game.scene.isActive('Hub'));
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${out}/fashion-2-hub.png` });

  // ---- Kho cá: chọn nhiều
  await p.mouse.click(1186, 160);
  await p.waitForFunction(() => window.__game.scene.isActive('Inventory'));
  await p.waitForTimeout(400);
  await p.mouse.click(560, 116); // ☑ Chọn nhiều
  await p.waitForTimeout(300);
  const before = await save();
  for (const i of [0, 1, 2]) {
    await p.mouse.click(24 + i * 136 + 64, 152 + 75);
    await p.waitForTimeout(150);
  }
  await p.screenshot({ path: `${out}/fashion-3-pick.png` });
  await p.mouse.click(1058, 520); // Bán
  await p.waitForTimeout(500);
  let after = await save();
  if (after.fishes.length !== before.fishes.length - 3 || after.gold <= before.gold) errs.push(`Bán đã chọn sai: ${before.fishes.length}→${after.fishes.length} cá, ${before.gold}→${after.gold} vàng`);
  else step(`Bán 3 con đã chọn: ${before.gold} → ${after.gold} vàng`);
  await p.mouse.click(962, 300); // Chọn cả trang (ít cá – vừa 1 trang)
  await p.waitForTimeout(300);
  await p.mouse.click(1058, 600); // Phân giải
  await p.waitForTimeout(300);
  after = await save();
  if (after.fishes.length !== 1 || !after.fishes[0].locked) errs.push(`Phân giải tất cả sai: còn ${after.fishes.length} cá`);
  else step(`Chọn tất cả → phân giải: còn 1 con (đã khóa), đá ${before.materials.stones} → ${after.materials.stones}`);
  await p.screenshot({ path: `${out}/fashion-4-after.png` });

  await b.close();
  if (errs.length) { console.error('LỖI:\n' + errs.join('\n')); process.exit(1); }
  console.log('Fashion E2E OK');
})();
