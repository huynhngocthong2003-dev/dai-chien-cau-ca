/**
 * E2E HƯỚNG DẪN TÂN THỦ: tài khoản mới → chào mừng → (bấm lung tung bị chặn) → CÂU CÁ → chọn bến → quăng, giật, kéo
 * câu thật 1 con → Xem Kho Cá → về sảnh làm quen 5 mục → Hoàn thành nhận quà → chơi tự do.
 * Chạy: node tests/e2e/tutorial.cjs [url] [thư-mục-ảnh]
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
  const waitScene = (k, t = 10000) => p.waitForFunction((k) => window.__game.scene.isActive(k), k, { timeout: t });
  const step = () => p.evaluate(() => JSON.parse(localStorage.getItem('dccc_save_v1') || '{}').tutorial ?? null);
  // bấm nút có nhãn khớp (trong lớp hướng dẫn) của màn đang mở
  const press = (key, re) => p.evaluate(([k, src]) => {
    const r = new RegExp(src);
    const find = (list) => { for (const o of list) { if (o.label && r.test(o.label.text)) return o; if (o.list) { const x = find(o.list); if (x) return x; } } return null; };
    const btn = find(window.__game.scene.getScene(k).children.list);
    if (btn) btn.emit('pointerup');
    return !!btn;
  }, [key, re]);
  const log = (m) => console.log('• ' + m);

  await p.goto(url, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'), null, { timeout: 30000 });
  await p.waitForTimeout(900);
  if ((await step())?.step !== 'welcome') errs.push('Tài khoản mới không bắt đầu hướng dẫn: ' + JSON.stringify(await step()));
  await p.screenshot({ path: `${out}/tut-01-welcome.png` });
  // bấm Kho Cá khi đang hướng dẫn → bị chặn
  await p.mouse.click(1186, 150);
  await p.waitForTimeout(700);
  if (!(await p.evaluate(() => window.__game.scene.isActive('Hub')))) errs.push('Đang hướng dẫn mà bấm được mục khác');
  else log('Chào mừng; bấm mục khác bị chặn');
  await press('Hub', 'Bắt đầu');
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/tut-02-go-fish.png` });
  await p.mouse.click(420, 640);
  await waitScene('Zone');
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${out}/tut-03-zone.png` });
  await p.mouse.click(865, 658);
  await waitScene('Fishing');
  await p.waitForTimeout(800);
  if ((await step())?.step !== 'cast') errs.push('Vào bến câu chưa sang bước quăng cần: ' + JSON.stringify(await step()));
  else log('Chọn bến → bước Quăng cần');
  await p.screenshot({ path: `${out}/tut-04-cast.png` });
  const seen = new Set();
  let result = null;
  for (let round = 1; round <= 5 && result !== 'caught'; round++) {
    await p.mouse.move(700, 450);
    await p.mouse.down();
    await p.waitForTimeout(650);
    await p.mouse.up();
    await p.waitForFunction(() => window.__game.scene.getScene('Fishing').session !== null, null, { timeout: 6000 });
    await p.waitForTimeout(150);
    seen.add((await step())?.step);
    await p.waitForFunction(() => window.__game.scene.getScene('Fishing').session?.phase === 'bite', null, { timeout: 15000 });
    await p.mouse.click(700, 450);
    await p.waitForFunction(() => window.__game.scene.getScene('Fishing').session?.phase === 'reeling', null, { timeout: 3000 });
    await p.waitForTimeout(150);
    seen.add((await step())?.step);
    if (round === 1) await p.screenshot({ path: `${out}/tut-05-reel.png` });
    const t0 = Date.now();
    while (Date.now() - t0 < 90000) {
      const st = await p.evaluate(() => { const s = window.__game.scene.getScene('Fishing').session; return s ? { phase: s.phase, tension: s.tension } : null; });
      if (!st || st.phase !== 'reeling') { result = st?.phase ?? 'unknown'; break; }
      if (st.tension < 45) await p.mouse.down();
      else if (st.tension > 70) await p.mouse.up();
      await p.waitForTimeout(60);
    }
    await p.mouse.up();
    await p.waitForTimeout(2400);
    if (result !== 'caught') { await p.keyboard.press('Space'); await p.waitForTimeout(500); }
  }
  if (!seen.has('hook') || !seen.has('reel')) errs.push('Không qua đủ bước giật / kéo: ' + [...seen].join(','));
  if (result !== 'caught') errs.push('Không câu được cá: ' + result);
  if ((await step())?.step !== 'to_bag') errs.push('Câu được cá chưa sang bước Kho Cá: ' + JSON.stringify(await step()));
  else log('Quăng → giật → kéo → câu được cá → bước Kho Cá');
  await p.screenshot({ path: `${out}/tut-06-caught.png` });
  await p.mouse.click(760, 570); // Xem Kho Cá
  await waitScene('Inventory');
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${out}/tut-07-bag.png` });
  await press('Inventory', 'Về sảnh');
  await waitScene('Hub');
  await p.waitForTimeout(900);
  if ((await step())?.step !== 'tour') errs.push('Chưa sang bước làm quen: ' + JSON.stringify(await step()));
  await p.screenshot({ path: `${out}/tut-08-tour.png` });
  for (let i = 0; i < 4; i++) { await press('Hub', 'Tiếp'); await p.waitForTimeout(350); }
  const gold0 = await p.evaluate(() => JSON.parse(localStorage.getItem('dccc_save_v1')).gold);
  await press('Hub', 'Hoàn thành');
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${out}/tut-09-done.png` });
  const s = await p.evaluate(() => JSON.parse(localStorage.getItem('dccc_save_v1')));
  if (!s.tutorial?.done || s.gold - gold0 !== 2000) errs.push(`Hoàn thành chưa đúng: ${JSON.stringify(s.tutorial)} vàng +${s.gold - gold0}`);
  else log('Làm quen 5 mục → Hoàn thành: +2.000 vàng +30 KC +20 đá');
  await press('Hub', 'Chơi thôi');
  await p.waitForTimeout(900);
  await p.mouse.click(1186, 150); // giờ bấm Kho Cá được
  await p.waitForTimeout(900);
  if (!(await p.evaluate(() => window.__game.scene.isActive('Inventory')))) errs.push('Xong hướng dẫn mà chưa chơi tự do được');
  else log('Chơi tự do: mở Kho Cá bình thường');
  await b.close();
  if (errs.length) { console.error('LỖI:\n' + errs.join('\n')); process.exit(1); }
  console.log('TUTORIAL E2E OK');
})();
