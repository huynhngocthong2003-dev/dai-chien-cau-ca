/**
 * E2E cửa hàng & tủ đồ: mua mũ/áo/trang sức, mặc vào, kiểm tra tiền và đồ đã lưu.
 * Chạy: node tests/e2e/shop.cjs [thư-mục-ảnh] [url]  (cần `pnpm dev` đang chạy)
 * Lưu ý: test tự cộng tiền vào save cục bộ để có thể mua – chỉ dùng cho kiểm thử.
 */
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }
const { chromium } = pw;
(async () => {
  const out = process.argv[2] || 'test-results'; require('fs').mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto((process.argv[3] || 'http://localhost:5173/'));
  await p.waitForFunction(() => window.__ready);
  // cho người chơi tiền để thử (chỉ trong test)
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('dccc_save_v1')); s.gold = 50000; s.diamonds = 500; localStorage.setItem('dccc_save_v1', JSON.stringify(s)); });
  await p.reload();
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'));
  await p.waitForTimeout(700);
  await p.screenshot({ path: out + '/s1-hub.png' });
  // Cửa hàng: nút thứ 4 (hàng 2 cột 1)
  await p.mouse.click(914, 300);
  await p.waitForFunction(() => window.__game.scene.isActive('Shop'));
  await p.waitForTimeout(500);
  // chọn vương miện (thẻ 7: cột 2 hàng 2)
  await p.mouse.click(16 + 1*165 + 79, 152 + 278 + 130); // Vương Miện Vàng (thẻ 7)
  await p.waitForTimeout(300);
  await p.mouse.click(1058, 538); // mua
  await p.waitForTimeout(300);
  await p.mouse.click(966, 608); // mặc
  await p.waitForTimeout(500);
  await p.screenshot({ path: out + '/s2-shop-hat.png' });
  // quần áo tab, chọn kimono (thẻ 6: cột 1 hàng 2)
  await p.mouse.click(74 + 118, 116); // tab Áo
  await p.waitForTimeout(300);
  await p.mouse.click(16 + 0*165 + 79, 152 + 278 + 130); // Kimono (thẻ 6)
  await p.waitForTimeout(300);
  await p.mouse.click(1058, 538);
  await p.waitForTimeout(300);
  await p.mouse.click(966, 608);
  await p.waitForTimeout(300);
  // trang sức: kính râm (thẻ 3)
  await p.mouse.click(74 + 2*118, 116); // tab Trang Sức
  await p.waitForTimeout(300);
  await p.mouse.click(16 + 2*165 + 79, 152 + 130); // Kính Râm (thẻ 3)
  await p.waitForTimeout(300);
  await p.mouse.click(1058, 538);
  await p.waitForTimeout(300);
  await p.mouse.click(966, 608);
  await p.waitForTimeout(500);
  await p.screenshot({ path: out + '/s3-shop-acc.png' });
  await p.mouse.click(74 + 5*118, 116); // tab Vật Phẩm
  await p.waitForTimeout(400);
  await p.screenshot({ path: out + '/s4-items.png' });
  await p.mouse.click(74 + 7*118, 116); // tab Chợ
  await p.waitForTimeout(400);
  await p.screenshot({ path: out + '/s5-market.png' });
  const save = await p.evaluate(() => JSON.parse(localStorage.getItem('dccc_save_v1')));
  console.log('wardrobe', JSON.stringify(save.wardrobe), 'equip', JSON.stringify(save.characters.c_be_tom.equip), 'gold', save.gold, 'dia', save.diamonds);
  // Nhân vật -> tủ đồ
  await p.mouse.click(62, 38);
  await p.waitForFunction(() => window.__game.scene.isActive('Hub'));
  await p.waitForTimeout(500);
  await p.screenshot({ path: out + '/s6-hub-dressed.png' });
  await p.mouse.click(914, 160);
  await p.waitForFunction(() => window.__game.scene.isActive('Characters'));
  await p.waitForTimeout(400);
  await p.mouse.click(912, 122);
  await p.waitForTimeout(500);
  await p.screenshot({ path: out + '/s7-wardrobe.png' });
  if (JSON.stringify(save.characters.c_be_tom.equip) !== JSON.stringify({ hat: 'h_vuong_mien', outfit: 'o_kimono_anh_dao', accessory: 'a_kinh_ram' })) errs.push('Đồ mặc không đúng');
  if (save.gold !== 50000 - 1800 || save.diamonds !== 500 - 120 - 100) errs.push(`Tiền sai: ${save.gold} vàng, ${save.diamonds} kim cương`);
  if (errs.length) { console.error('LỖI:\n' + errs.join('\n')); process.exit(1); }
  console.log('Shop E2E OK');
  await b.close();
})();
