/**
 * E2E Đấu Sinh Tử + Hồ sơ + Thể đột biến:
 * đặt sẵn 5 con cá + 1 Ngọc Long Hồn, tiến hóa 1 con, chọn 3 con đấu máy (Dễ), bỏ qua phát lại,
 * kiểm tra thắng → cá nướng / thua → mất cá mạnh nhất; cho nhân vật ăn cá nướng nhận KN; trưng bày ở Hồ sơ.
 * Chạy: node tests/e2e/deathmatch.cjs [thư-mục-ảnh] [url]
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
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'));
  await p.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('dccc_save_v1'));
    const mk = (uid, fishId, level) => ({ uid, fishId, level, stars: 1, weightKg: 2, zoneId: 'z_ben_tan_thu', caughtAt: Date.now(), locked: false });
    s.fishes = [mk('t1', 'f_ca_chep', 9), mk('t2', 'f_ca_ro', 8), mk('t3', 'f_ca_tre', 7), mk('t4', 'f_boss_lao_ngu', 5), mk('t5', 'f_ca_chep', 2)];
    s.evoItems = { e_ngoc_long_hon: 20 };
    localStorage.setItem('dccc_save_v1', JSON.stringify(s));
  });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'));
  await p.waitForTimeout(500);
  const save = () => p.evaluate(() => JSON.parse(localStorage.getItem('dccc_save_v1')));
  const start = (key, data) => p.evaluate(([k, d]) => window.__game.scene.getScenes(true)[0].scene.start(k, d), [key, data]);

  // --- Thể đột biến trong Kho Cá
  await start('Inventory');
  await p.waitForTimeout(700);
  await p.evaluate(() => {
    const sc = window.__game.scene.getScene('Inventory');
    sc.selectedUid = 't4';
    sc.render();
  });
  await p.waitForTimeout(300);
  // Chỉ cá Boss mới có nút 🧬; dùng vật phẩm → đột biến CHẮC CHẮN thành công, ra 1 dạng của Ngọc Long Hồn
  await p.mouse.click(1200, 130); // 🧬 Thể
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/forms.png` });
  await p.mouse.click(120 + 20 + 96, 60 + 104 + 396); // "Đột biến 100%" – Ngọc Long Hồn (modal 1040×600 tại 120,60)
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${out}/form-reveal.png` });
  let s = await save();
  const t4 = s.fishes.find((f) => f.uid === 't4');
  if (!['long', 'long_hac', 'long_kim', 'long_huyet', 'long_bich'].includes(t4?.form) || s.evoItems.e_ngoc_long_hon !== 19 || !t4.formRoll) errs.push(`Đột biến sai: ${JSON.stringify(t4)} ${JSON.stringify(s.evoItems)}`);
  else console.log(`• Boss Lão Ngư đột biến thành "${t4.form}" ngay lần đầu (100%), hệ số ${JSON.stringify(t4.formRoll)}`);
  await p.mouse.click(640, 60 + 600 - 46); // Tuyệt vời!
  await p.waitForTimeout(400);
  // cá thường không có nút đột biến
  await p.evaluate(() => { const sc = window.__game.scene.getScene('Inventory'); sc.selectedUid = 't1'; sc.render(); });
  await p.waitForTimeout(300);
  await p.mouse.click(1200, 130);
  await p.waitForTimeout(400);
  if (await p.evaluate(() => window.__game.scene.getScene('Inventory').children.list.some((o) => o.depth === 900))) errs.push('Cá thường vẫn mở được bảng đột biến');

  // --- Đấu Sinh Tử với máy
  await start('DeathMatch', { mode: 'ai' });
  await p.waitForTimeout(800);
  // chọn 3 thẻ đầu (đã sắp theo lực chiến)
  for (let i = 0; i < 3; i++) { await p.mouse.click(20 + i * 136 + 64, 178 + 71); await p.waitForTimeout(150); }
  await p.mouse.click(920, 176); // Dễ
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/deathmatch-pick.png` });
  const before = await save();
  await p.mouse.click(1058, 640); // BẮT ĐẦU
  await p.waitForFunction(() => window.__game.scene.isActive('Battle'), null, { timeout: 5000 });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${out}/battle.png` });
  await p.mouse.click(1180, 680); // Bỏ qua
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${out}/battle-result.png` });
  s = await save();
  const won = (s.stats.dmWins ?? 0) === 1;
  const lost = (s.stats.dmLosses ?? 0) === 1;
  if (won === lost) errs.push('Kết quả trận không được ghi');
  if (won) {
    if (s.roasted.length !== 1 || s.gold <= before.gold) errs.push('Thắng nhưng không nhận cá nướng/vàng');
    else console.log(`• THẮNG: nhận cá nướng ${s.roasted[0].fishId} Lv.${s.roasted[0].level}, +${s.gold - before.gold} vàng`);
  } else {
    if (s.fishes.length !== before.fishes.length - 1) errs.push('Thua nhưng không mất cá');
    else console.log('• THUA: mất con cá mạnh nhất', before.fishes.find((f) => !s.fishes.some((x) => x.uid === f.uid)).uid);
  }
  const fought = s.fishes.filter((f) => (f.wins ?? 0) + (f.losses ?? 0) > 0).length;
  if (fought < 2) errs.push('Chưa ghi thắng/thua cho từng cá');

  // --- Cho ăn cá nướng (nếu có; nếu thua thì đặt sẵn 1 con để kiểm tra)
  if (!won) {
    await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('dccc_save_v1')); s.roasted = [{ id: 'r_test', fishId: 'f_ca_ro', level: 3, stars: 1 }]; localStorage.setItem('dccc_save_v1', JSON.stringify(s)); });
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'));
  }
  await start('DeathMatch', { mode: 'roasted' });
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${out}/roasted.png` });
  s = await save();
  const r0 = s.roasted[0];
  await p.mouse.click(50 + 93, 230 + 186); // Cho ăn
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/feed.png` });
  const cid = Object.keys(s.characters)[0];
  await p.mouse.click(120 + 28 + 78, 80 + 76 + 107); // nhân vật đầu tiên (modal 1040×560 tại 120,80)
  await p.waitForTimeout(600);
  const s2 = await save();
  const c0 = s.characters[cid], c1 = s2.characters[cid];
  if (s2.roasted.length !== s.roasted.length - 1 || !(c1.level > c0.level || (c1.xp ?? 0) > (c0.xp ?? 0))) errs.push('Cho nhân vật ăn cá nướng không tăng KN');
  else console.log(`• Nhân vật ${cid} ăn cá nướng ${r0.fishId}: Cấp ${c0.level} → ${c1.level} (KN ${c1.xp ?? 0})`);
  s.characters = s2.characters;

  // --- Hồ sơ: chọn cá trưng bày
  await start('Profile');
  await p.waitForTimeout(800);
  await p.mouse.click(388, 660); // Chọn cá trưng bày
  await p.waitForTimeout(500);
  await p.mouse.click(110 + 26 + 79, 60 + 74 + 75); // con đầu tiên (modal 1060×600 tại 110,60)
  await p.waitForTimeout(200);
  await p.mouse.click(640, 60 + 600 - 44); // Lưu
  await p.waitForTimeout(800);
  const s3 = await save();
  if (s3.showcase.length !== 1) errs.push(`Trưng bày sai: ${JSON.stringify(s3.showcase)}`);
  else console.log('• Trưng bày 1 con cá ở Hồ sơ');
  await p.screenshot({ path: `${out}/profile.png` });
  await b.close();
  if (errs.length) { console.error('LỖI:\n' + errs.join('\n')); process.exit(1); }
  console.log('DeathMatch E2E OK');
})();
