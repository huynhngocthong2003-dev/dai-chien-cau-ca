/**
 * E2E Rank Đấu Sinh Tử: đặt số trận thắng → màn Đấu Cá hiện huy hiệu đúng hạng; bấm → bảng Thang Rank.
 * Thắng 1 trận với máy (ép thắng) → +10 điểm rank; độ khó máy theo rank (Chiến Binh = Thường).
 * Chạy: node tests/e2e/rank.cjs [url] [thư-mục-ảnh]
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
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => localStorage.setItem('dccc_skip_tutorial', '1')); // bỏ qua hướng dẫn tân thủ (có E2E riêng)
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'));
  await p.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('dccc_save_v1'));
    const mk = (uid, fishId, level) => ({ uid, fishId, level, stars: 1, weightKg: 2, zoneId: 'z_ben_tan_thu', caughtAt: Date.now(), locked: false });
    s.fishes = [mk('t1', 'f_ca_chep', 9), mk('t2', 'f_ca_ro', 8), mk('t3', 'f_ca_tre', 7)];
    s.stats.rankPoints = 3190; // Chiến Binh bậc 2, 1 sao, 90/100
    localStorage.setItem('dccc_save_v1', JSON.stringify(s));
  });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'));
  const start = (key, data) => p.evaluate(([k, d]) => window.__game.scene.getScenes(true)[0].scene.start(k, d), [key, data]);
  await start('DeathMatch');
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${out}/rank-chip.png` });
  await p.mouse.click(740, 116); // huy hiệu rank
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${out}/rank-ladder.png` });
  const texts = await p.evaluate(() => window.__game.scene.getScene('DeathMatch').children.list.filter((o) => o.type === 'Container').flatMap((c) => c.list).filter((o) => o.type === 'Text').map((t) => t.text));
  if (!texts.includes('Chiến Binh · Bậc 2')) errs.push('Không thấy hạng "Chiến Binh · Bậc 2" trong bảng: ' + texts.slice(0, 8).join(' | '));
  else console.log('• Bảng Thang Rank: Chiến Binh · Bậc 2');
  for (const n of ['Tân Binh', 'Chiến Binh', 'Tinh Anh', 'Huyền Thoại', 'Vô Địch / Thần Thoại']) if (!texts.includes(n)) errs.push('Thang thiếu hạng ' + n);
  // thắng 1 trận (máy) → +10 điểm, đủ 3200 = 2 sao
  await start('Combat3', { team: ['t1', 't2', 't3'], level: 'easy' });
  await p.waitForTimeout(1500);
  await p.evaluate(() => window.__game.scene.getScene('Combat3').finish(0));
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/rank-win.png` });
  const s = await p.evaluate(() => JSON.parse(localStorage.getItem('dccc_save_v1')));
  if (s.stats.rankPoints !== 3200) errs.push('rankPoints sau thắng = ' + s.stats.rankPoints);
  const lvl = await p.evaluate(() => window.__game.scene.getScene('Combat3').level);
  if (lvl !== 'normal') errs.push('Chiến Binh phải gặp máy Thường, gặp: ' + lvl);
  const info = await p.evaluate(() => window.__game.scene.getScene('Combat3').children.list.filter((o) => o.type === 'Text').map((t) => t.text).join('\n'));
  if (!/\+10 điểm rank → Chiến Binh · Bậc 2 · 2⭐/.test(info)) errs.push('Thiếu dòng điểm rank: ' + info.slice(0, 300));
  else console.log('• Thắng: +10 điểm rank → Chiến Binh · Bậc 2 · 2⭐ (+1 ⭐)');
  await b.close();
  if (errs.length) { console.error('LỖI:\n' + errs.join('\n')); process.exit(1); }
  console.log('RANK E2E OK');
})();
