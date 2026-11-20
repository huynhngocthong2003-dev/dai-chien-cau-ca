/**
 * E2E Đua Cá với người chơi (máy chủ Supabase GIẢ): 👥 ĐUA VỚI NGƯỜI → vào hàng chờ → được ghép phòng
 * với "Pine Vô Địch" → thấy người kia trên đường đua (vị trí nhận qua mạng) → gửi vị trí của mình
 * → về đích, chờ người kia về → xếp hạng chung. Kiểm thêm nút "🤖 Đua với máy ngay" khi đang chờ.
 * Chạy: node tests/e2e/race-online.cjs <url-có-cấu-hình-https://fake.supabase.test> [thư-mục-ảnh]
 */
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }
const url = process.argv[2] || 'http://localhost:5198/';
const out = process.argv[3] || 'test-results';
require('fs').mkdirSync(out, { recursive: true });
const errs = [];
const UID = '00000000-0000-4000-8000-000000000001';
const OTHER = '00000000-0000-4000-8000-000000000002';
const db = { joined: 0, finds: 0, left: 0, myUpdates: [], otherX: 0, otherFinish: null, roomOn: true };
const otherRacer = { name: 'Pine Vô Địch', fishId: 'f_ca_kiem', formId: null, charId: 'c_kim_ke', equip: { skin: 's_samurai' }, stats: { speed: 70, accel: 45, stamina: 60, score: 60, grade: 'B' } };
(async () => {
  const b = await pw.chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.route('https://fake.supabase.test/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const json = (s, body) => route.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === '/auth/v1/user') return json(200, { id: UID, email: 'a@test' });
    if (path === '/rest/v1/player_saves') return req.method() === 'GET' ? json(200, []) : route.fulfill({ status: 201, body: '' });
    if (path === '/rest/v1/rpc/race_queue_join') { db.joined++; return json(200, null); }
    if (path === '/rest/v1/rpc/race_queue_leave') { db.left++; return json(200, null); }
    if (path === '/rest/v1/rpc/race_queue_count') return json(200, 2);
    if (path === '/rest/v1/rpc/race_find') {
      db.finds++;
      if (!db.roomOn || db.finds < 2) return json(200, null);
      return json(200, { room_id: 7, league: 'tap_su', seed: 12345, start_in_ms: 3000, members: [
        { user_id: UID, slot: 0, racer: { name: 'Cần Thủ', fishId: 'f_ca_ro', formId: null, charId: 'c_be_tom', stats: {} } },
        { user_id: OTHER, slot: 1, racer: otherRacer }] });
    }
    if (path === '/rest/v1/race_members') {
      if (req.method() === 'PATCH') { db.myUpdates.push(req.postDataJSON()); return route.fulfill({ status: 204, body: '' }); }
      db.otherX = Math.min(1205, db.otherX + 9);
      if (db.otherX >= 1200 && db.otherFinish === null) db.otherFinish = 52000;
      return json(200, [{ user_id: OTHER, x: db.otherX, lane: 2, boosting: false, finish_ms: db.otherFinish }]);
    }
    if (path.startsWith('/rest/v1/rpc/')) return json(200, path.endsWith('unread_counts') || path.endsWith('claim_topups') ? [] : null);
    if (path.startsWith('/rest/v1/')) return json(200, []);
    return json(404, {});
  });
  await p.addInitScript((uid) => localStorage.setItem('dccc_auth', JSON.stringify({ access_token: 'tok', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r', user: { id: uid, aud: 'authenticated', role: 'authenticated', email: 'a@test', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } })), UID);
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'), null, { timeout: 30000 });
  await p.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('dccc_save_v1'));
    s.fishes = [{ uid: 'r1', fishId: 'f_ca_ro', level: 5, stars: 1, weightKg: 1, zoneId: 'z_ben_tan_thu', caughtAt: 1, locked: false }];
    s.gold = 1000;
    localStorage.setItem('dccc_save_v1', JSON.stringify(s));
  });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'), null, { timeout: 30000 });
  await p.evaluate(() => window.__game.scene.getScene('Hub').scene.start('Race'));
  await p.waitForTimeout(1500);
  // 1) nút "Đua với máy ngay" khi đang chờ
  db.roomOn = false;
  await p.mouse.click(1130, 694);
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/race-matchmaking.png` });
  if (db.joined !== 1) errs.push('Không vào hàng chờ');
  else console.log('• Vào hàng chờ đua với người chơi');
  await p.mouse.click(640, 170 + 380 - 60); // nút "🤖 Đua với máy ngay" (modal 620×380 ở y=170)
  await p.waitForTimeout(600);
  const m1 = await p.evaluate(() => ({ mode: window.__game.scene.getScene('Race').mode, room: window.__game.scene.getScene('Race').room }));
  if (db.left < 1 || m1.room !== null || !['countdown', 'race'].includes(m1.mode)) errs.push('Nút "Đua với máy ngay" không hoạt động: ' + JSON.stringify(m1) + ' left=' + db.left);
  else console.log('• "Đua với máy ngay": rời hàng chờ, đua với máy');
  // quay lại màn chọn
  await p.evaluate(() => window.__game.scene.getScene('Race').scene.restart());
  await p.waitForTimeout(1500);
  // 2) được ghép phòng với người chơi khác
  db.roomOn = true; db.finds = 0;
  await p.mouse.click(1130, 694);
  await p.waitForFunction(() => !!window.__game.scene.getScene('Race').room, null, { timeout: 20000 });
  const humans = await p.evaluate(() => window.__game.scene.getScene('Race').session.racers.map((r) => ({ id: r.id, remote: !!r.remote, name: r.name })));
  if (humans.length !== 5 || !humans.some((r) => r.remote && r.name === 'Pine Vô Địch') || humans[0].id !== 'me') errs.push('Phòng đua sai: ' + JSON.stringify(humans));
  else console.log('• Được ghép phòng: mình + "Pine Vô Địch" + 3 máy');
  await p.waitForFunction(() => window.__game.scene.getScene('Race').mode === 'race', null, { timeout: 40000 });
  await p.waitForFunction(() => window.__game.scene.getScene('Race').session.racers.find((r) => r.remote).x > 5, null, { timeout: 20000 });
  await p.screenshot({ path: `${out}/race-online.png` });
  const otherLane = await p.evaluate(() => window.__game.scene.getScene('Race').session.racers.find((r) => r.remote).lane);
  if (otherLane !== 2) errs.push('Không nhận làn của người kia');
  else console.log('• Thấy người kia di chuyển (vị trí + làn nhận qua mạng)');
  if (!db.myUpdates.length) errs.push('Không gửi vị trí của mình');
  else console.log(`• Gửi vị trí của mình (${db.myUpdates.length} lần)`);
  // tua nhanh mình về đích
  await p.evaluate(() => { const s = window.__game.scene.getScene('Race').session; while (s.player.finishTime === null) s.update(50); });
  await p.waitForFunction(() => window.__game.scene.getScene('Race').mode === 'result', null, { timeout: 120000 });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${out}/race-online-result.png` });
  const fin = db.myUpdates.find((u) => u.finish_ms);
  if (!fin) errs.push('Không gửi thời gian về đích');
  else console.log(`• Gửi thời gian về đích ${fin.finish_ms}ms`);
  const res = await p.evaluate(() => { const s = window.__game.scene.getScene('Race').session; return s.standings().map((r) => (r.remote ? 'PINE' : r.id)); });
  console.log('• Bảng xếp hạng chung: ' + res.join(' > '));
  if (!res.includes('PINE')) errs.push('Thiếu người chơi khác trong xếp hạng');
  await b.close();
  if (errs.length) { console.error('LỖI:\n' + errs.join('\n')); process.exit(1); }
  console.log('Race Online E2E OK');
})();
