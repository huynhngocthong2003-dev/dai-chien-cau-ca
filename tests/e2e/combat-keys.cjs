/**
 * E2E phím trận 3vs3: B = CANH BẢO VỆ (canh kim → mức chặn), V = KỸ NĂNG (chỉ khi đầy NỘ – nộ tích khi bị đánh).
 * Chạy: node tests/e2e/combat-keys.cjs [url] [thư-mục-ảnh]
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
  await p.addInitScript(() => localStorage.setItem('dccc_skip_tutorial', '1'));
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'));
  await p.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('dccc_save_v1'));
    const mk = (uid, fishId, level) => ({ uid, fishId, level, stars: 1, weightKg: 2, zoneId: 'z_ben_tan_thu', caughtAt: 1, locked: false });
    s.fishes = [mk('k1', 'f_boss_lao_ngu', 15), mk('k2', 'f_ca_ro', 10), mk('k3', 'f_ca_chep', 10)];
    localStorage.setItem('dccc_save_v1', JSON.stringify(s));
  });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'));
  await p.evaluate(() => window.__game.scene.getScene('Hub').scene.start('Combat3', { team: ['k1', 'k2', 'k3'] }));
  const myTurn = () => p.waitForFunction(() => { const c = window.__game.scene.getScene('Combat3'); return c && c.myTurn && !c.busy; }, null, { timeout: 30000 });
  await myTurn();
  await p.waitForTimeout(400);
  // B: canh bảo vệ
  await p.keyboard.press('b');
  await p.waitForFunction(() => window.__game.scene.getScene('Combat3').view?.state.log.some((e) => e.t === 'defend' && e.side === 0 && e.zone), null, { timeout: 15000 }).catch(() => null);
  const g = await p.evaluate(() => window.__game.scene.getScene('Combat3').view.state.log.filter((e) => e.t === 'defend' && e.side === 0).pop());
  if (!g?.zone || typeof g.reduce !== 'number') errs.push('Phím B không canh bảo vệ: ' + JSON.stringify(g));
  else console.log(`• B: canh bảo vệ → ${g.zone} chặn ${Math.round(g.reduce * 100)}%`);
  await p.screenshot({ path: `${out}/combat-guard.png` });
  // V khi chưa đầy nộ → không dùng được
  await myTurn();
  const en0 = await p.evaluate(() => window.__game.scene.getScene('Combat3').view.state.sides[0].energy ?? 0);
  if (en0 < 100) {
    await p.keyboard.press('v');
    await p.waitForTimeout(500);
    if (!(await p.evaluate(() => window.__game.scene.getScene('Combat3').myTurn))) errs.push('Chưa đủ nộ mà V vẫn dùng kỹ năng');
    else console.log(`• V khi nộ ${en0}/100: bị chặn (báo cần tích nộ)`);
  }
  // làm đầy nộ (trận chạy trên máy) rồi bấm V
  await p.evaluate(() => { const c = window.__game.scene.getScene('Combat3'); c.driver.state.sides[0].energy = 100; c.view.state.sides[0].energy = 100; });
  await p.keyboard.press('v');
  await p.waitForFunction(() => window.__game.scene.getScene('Combat3').view?.state.log.some((e) => e.t === 'skill' && e.side === 0), null, { timeout: 15000 }).catch(() => null);
  const sk = await p.evaluate(() => window.__game.scene.getScene('Combat3').view.state.log.filter((e) => e.t === 'skill' && e.side === 0).pop());
  if (!sk) errs.push('Đầy nộ mà V không dùng được kỹ năng');
  else console.log(`• V khi đầy nộ: dùng kỹ năng "${sk.name}"`);
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${out}/combat-skill.png` });
  await b.close();
  if (errs.length) { console.error('LỖI:\n' + errs.join('\n')); process.exit(1); }
  console.log('COMBAT KEYS E2E OK');
})();
