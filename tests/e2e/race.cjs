/**
 * E2E Đua Cá: sảnh → 🏁 Đua Cá → chọn giải + chọn cá (chỉ số riêng, hạng) → XUẤT PHÁT (trừ phí)
 * → đổi làn (phím + nút), TĂNG TỐC khi đầy năng lượng (hiệu ứng) → về đích → nhận thưởng đúng 1 lần.
 * Chạy: node tests/e2e/race.cjs <url> [thư-mục-ảnh]
 */
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }
const url = process.argv[2] || 'http://localhost:5173/';
const out = process.argv[3] || 'test-results';
require('fs').mkdirSync(out, { recursive: true });
const errs = [];
(async () => {
  const b = await pw.chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'));
  await p.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('dccc_save_v1'));
    const mk = (uid, fishId, level, stars) => ({ uid, fishId, level, stars, weightKg: 3, zoneId: 'z_ben_tan_thu', caughtAt: Date.now(), locked: false });
    s.fishes = [mk('r1', 'f_ca_ro', 5, 1), mk('r2', 'f_ca_kiem', 12, 2), mk('r3', 'f_ca_chep', 3, 1)];
    s.gold = 1000;
    localStorage.setItem('dccc_save_v1', JSON.stringify(s));
  });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'));
  await p.waitForTimeout(600);
  await p.evaluate(() => window.__game.scene.getScene('Hub').scene.start('Race')); // Đua Cá nay nằm trong bảng menu
  await p.waitForFunction(() => window.__game.scene.isActive('Race'), null, { timeout: 8000 });
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${out}/race-select.png` });
  const sel = await p.evaluate(() => window.__game.scene.getScene('Race').fishUid);
  if (!sel) errs.push('Không tự chọn cá tốt nhất');
  else console.log(`• Màn chọn giải/cá – cá được chọn: ${sel}`);
  // XUẤT PHÁT (nút ở 1130, 640)
  await p.mouse.click(1130, 632);
  // trình duyệt ẩn chạy ~15 khung/giây nên đồng hồ Phaser chậm hơn thực tế → chờ lâu hơn
  await p.waitForFunction(() => window.__game.scene.getScene('Race').mode === 'race', null, { timeout: 30000 });
  const gold1 = await p.evaluate(() => JSON.parse(localStorage.getItem('dccc_save_v1')).gold);
  if (gold1 !== 950) errs.push('Không trừ đúng phí vào cửa: ' + gold1);
  else console.log('• Xuất phát – trừ 50 vàng phí');
  const lane0 = await p.evaluate(() => window.__game.scene.getScene('Race').session.player.lane);
  await p.keyboard.press(lane0 === 2 ? 'ArrowUp' : 'ArrowDown');
  await p.waitForTimeout(200);
  const lane1 = await p.evaluate(() => window.__game.scene.getScene('Race').session.player.lane);
  if (lane1 === lane0) errs.push('Phím không đổi làn được');
  else console.log(`• Đổi làn bằng phím: ${lane0} → ${lane1}`);
  await p.mouse.click(80, lane1 === 0 ? 600 : 470);
  await p.waitForTimeout(200);
  const lane2 = await p.evaluate(() => window.__game.scene.getScene('Race').session.player.lane);
  if (lane2 === lane1) errs.push('Nút ▲▼ không đổi làn được');
  else console.log(`• Đổi làn bằng nút: ${lane1} → ${lane2}`);
  // chờ đầy năng lượng rồi tăng tốc bằng nút
  // tua nhanh mô phỏng tới khi đầy năng lượng (logic giữ nguyên, chỉ bỏ thời gian chờ)
  await p.evaluate(() => { const s = window.__game.scene.getScene('Race').session; while (!s.canBoost(s.player) && !s.over) s.update(50); });
  let boosted = false;
  // thử tối đa 2 lần: giữa lúc tua và lúc bấm có thể bị sứa/cá mập rút năng lượng
  for (let i = 0; i < 2 && !boosted; i++) {
    await p.evaluate(() => { const s = window.__game.scene.getScene('Race').session; while (!s.canBoost(s.player) && !s.over) s.update(50); });
    await p.mouse.click(1150, 610);
    await p.waitForTimeout(350);
    boosted = await p.evaluate(() => { const s = window.__game.scene.getScene('Race').session; return s.time < s.player.boostUntil; });
  }
  await p.screenshot({ path: `${out}/race-boost.png` });
  if (!boosted) errs.push('Nút TĂNG TỐC không hoạt động');
  else console.log('• TĂNG TỐC (có hiệu ứng)');
  // về đích
  await p.waitForTimeout(1500);
  await p.evaluate(() => { const s = window.__game.scene.getScene('Race').session; while (s.player.finishTime === null) s.update(50); });
  await p.waitForFunction(() => window.__game.scene.getScene('Race').mode === 'result', null, { timeout: 60000 });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${out}/race-result.png` });
  const s = await p.evaluate(() => JSON.parse(localStorage.getItem('dccc_save_v1')));
  const place = await p.evaluate(() => window.__game.scene.getScene('Race').session.placeOf('me'));
  const prize = [250, 120, 60][place - 1] ?? 0;
  if (s.gold !== 950 + prize || (s.stats.races ?? 0) !== 1) errs.push(`Thưởng sai: hạng ${place}, vàng ${s.gold}, races ${s.stats.races}`);
  else console.log(`• Về đích hạng ${place} – nhận ${prize} vàng, ghi sổ cái`);
  // 🔁 Đua tiếp → về màn chọn
  await p.mouse.click(520, 20 + 680 - 44);
  await p.waitForTimeout(700);
  const mode = await p.evaluate(() => window.__game.scene.getScene('Race').mode);
  if (mode !== 'select') errs.push('Không quay lại màn chọn: ' + mode);
  else console.log('• Đua tiếp → màn chọn giải/cá');
  await b.close();
  if (errs.length) { console.error('LỖI:\n' + errs.join('\n')); process.exit(1); }
  console.log('Race E2E OK');
})();
