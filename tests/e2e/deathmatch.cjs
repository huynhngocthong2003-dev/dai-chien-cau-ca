/**
 * E2E Đấu Sinh Tử + Hồ sơ + Trưởng thành giai đoạn:
 * đặt sẵn 5 con cá + Đá Tiến Hoá hệ Thổ, cho Boss lên Trung Giai, chọn 3 con đấu máy (Dễ), bỏ qua phát lại,
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
    s.fishes = [mk('t1', 'f_ca_chep', 9), mk('t2', 'f_ca_ro', 8), mk('t3', 'f_ca_tre', 7), { ...mk('t4', 'f_boss_lao_ngu', 15) }, mk('t5', 'f_ca_chep', 2)];
    s.evoItems = { e_ngoc_long_hon: 3 };
    s.gold = 500000;
    s.materials = { ...s.materials, stones: 500, soul: 500 };
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
  // Boss đủ cấp Sơ Giai (15): BƯỚC 1 – Tiến hoá hệ (chọn Ngọc Long Hồn → 1 dạng hệ Long, chỉ 1 lần)
  await p.screenshot({ path: `${out}/growth-before.png` });
  await p.mouse.click(1058, 524); // 🧬 Tiến hoá hệ
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${out}/forms.png` });
  await p.mouse.click(120 + 20 + 96, 60 + 104 + 396); // "Tiến hoá 100%" – Ngọc Long Hồn
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${out}/form-reveal.png` });
  let s = await save();
  let t4 = s.fishes.find((f) => f.uid === 't4');
  if (!['long', 'long_hac', 'long_kim', 'long_huyet', 'long_bich'].includes(t4?.form) || s.evoItems.e_ngoc_long_hon !== 2) errs.push(`Tiến hoá hệ sai: ${JSON.stringify(t4)} ${JSON.stringify(s.evoItems)}`);
  else console.log(`• Boss Lão Ngư tiến hoá hệ Long → "${t4.form}"`);
  await p.mouse.click(640, 60 + 600 - 46); // Tuyệt vời!
  await p.waitForTimeout(500);
  await p.evaluate(() => { const sc = window.__game.scene.getScene('Inventory'); sc.selectedUid = 't4'; sc.render(); });
  await p.waitForTimeout(400);
  // BƯỚC 2 – Trưởng thành lên Trung Giai: vàng + linh hồn + đá + 1 Ngọc Long Hồn (đá của hệ Long)
  await p.mouse.click(1058, 524);
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${out}/growth-after.png` });
  s = await save();
  t4 = s.fishes.find((f) => f.uid === 't4');
  if (!t4 || t4.stars !== 2 || s.evoItems.e_ngoc_long_hon !== 1 || s.fishes.length !== 5) errs.push(`Trưởng thành sai: ${JSON.stringify(t4)} ${JSON.stringify(s.evoItems)}`);
  else console.log('• Lên Trung Giai (tốn 1 Ngọc Long Hồn, không mất cá, giữ dạng hệ Long)');

  // --- Màn Đấu Cá: bản Đấu Sinh Tử cũ đã gỡ – chế độ cũ "ai" tự chuyển sang tab 3vs3
  await start('DeathMatch', { mode: 'ai' });
  await p.waitForTimeout(800);
  const dm = await p.evaluate(() => { const sc = window.__game.scene.getScene('DeathMatch'); return { mode: sc.mode, tabs: sc.tabs.length }; });
  if (dm.mode !== 'arena' || dm.tabs !== 3) errs.push(`Màn Đấu Cá sai: ${JSON.stringify(dm)}`);
  if (await p.evaluate(() => !!window.__game.scene.getScene('Battle'))) errs.push('Màn trận Đấu Sinh Tử cũ vẫn còn');
  await p.screenshot({ path: `${out}/deathmatch-pick.png` });
  await p.mouse.click(360, 116); // tab Đấu với người (khoá, có thông báo giai đoạn)
  await p.waitForTimeout(400);
  if (await p.evaluate(() => window.__game.scene.getScene('DeathMatch').mode) !== 'pvp') errs.push('Tab Đấu với người không mở được');
  else console.log('• Đấu Cá: tab 3vs3 mặc định, tab Đấu với người mở được (chưa đăng nhập → mời đăng nhập)');
  await p.screenshot({ path: `${out}/pvp-locked.png` });

  // --- Cho ăn cá nướng (cá nướng cũ vẫn dùng được)
  {
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
