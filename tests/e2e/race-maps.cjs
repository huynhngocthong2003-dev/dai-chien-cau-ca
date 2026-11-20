/**
 * E2E bản đồ Đua Cá: chọn từng bản đồ (5 map) → đua → qua mốc 400m/800m khung cảnh đổi (chuyển chặng)
 * → nhặt 🎁 hộp may mắn, dùng đồ bằng phím Q → về đích. Chụp ảnh từng chặng để soát hình.
 * Chạy: node tests/e2e/race-maps.cjs <url> [thư-mục-ảnh]
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
    s.level = 30;
    s.gold = 100000;
    s.fishes = [{ uid: 'm1', fishId: 'f_ca_kiem', level: 20, stars: 2, weightKg: 3, zoneId: 'z_ben_tan_thu', caughtAt: 1, locked: false }];
    localStorage.setItem('dccc_save_v1', JSON.stringify(s));
  });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'));
  await p.evaluate(() => window.__game.scene.getScene('Hub').scene.start('Race'));
  await p.waitForTimeout(1500);
  const maps = ['song_que', 'ran_san_ho', 'bang_ha', 'nui_lua', 'than_thoai'];
  let usedItem = false;
  for (const [i, id] of maps.entries()) {
    // nút bản đồ: hàng ở y=486, x = 512 + (i+1)*134
    await p.mouse.click(512 + (i + 1) * 134, 486);
    await p.waitForTimeout(500);
    const choice = await p.evaluate(() => window.__game.scene.getScene('Race').mapChoice);
    if (choice !== id) { errs.push(`Không chọn được bản đồ ${id} (đang ${choice})`); continue; }
    await p.mouse.click(1130, 632);
    await p.waitForFunction(() => window.__game.scene.getScene('Race').mode === 'race', null, { timeout: 30000 });
    const seen = [];
    for (const [k, target] of [[0, 280], [1, 560], [2, 960]]) {
      await p.evaluate((t) => {
        const sc = window.__game.scene.getScene('Race');
        const s = sc.session;
        // tua nhanh: đẩy mô phỏng tới vị trí cần chụp, cho cảnh xử lý sự kiện
        while (s.player.x < t && !s.over) { s.update(50); for (const e of s.drainEvents()) sc.onEvent(e); }
      }, target);
      await p.waitForTimeout(1500);
      const st = await p.evaluate(() => { const sc = window.__game.scene.getScene('Race'); return { key: sc.themeKey, item: sc.session.player.item ?? null }; });
      seen.push(st.key);
      if (st.item && !usedItem) {
        await p.keyboard.press('q');
        await p.waitForTimeout(300);
        const left = await p.evaluate(() => window.__game.scene.getScene('Race').session.player.item ?? null);
        if (left) errs.push('Phím Q không dùng được đồ');
        else { usedItem = true; console.log(`• Nhặt được ${st.item} từ hộp may mắn – dùng bằng phím Q`); }
      }
      await p.screenshot({ path: `${out}/race-map-${id}-${k}.png` });
    }
    if (seen.join(',') !== `${id}_0,${id}_1,${id}_2`) errs.push(`Khung cảnh không đổi theo chặng ở ${id}: ${seen}`);
    else console.log(`• ${id}: 3 chặng, khung cảnh đổi ở 400m và 800m`);
    await p.evaluate(() => { const sc = window.__game.scene.getScene('Race'); const s = sc.session; while (s.player.finishTime === null) s.update(50); });
    await p.waitForFunction(() => window.__game.scene.getScene('Race').mode === 'result', null, { timeout: 60000 });
    await p.waitForTimeout(1000);
    await p.mouse.click(520, 20 + 680 - 44);
    await p.waitForTimeout(800);
  }
  if (!usedItem) errs.push('Không nhặt được hộp may mắn nào');
  await b.close();
  if (errs.length) { console.error('LỖI:\n' + errs.join('\n')); process.exit(1); }
  console.log('Race Maps E2E OK');
})();
