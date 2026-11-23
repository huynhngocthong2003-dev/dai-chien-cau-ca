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
    if (path === '/rest/v1/rpc/race_top') return json(200, [
      { rank: 1, user_id: OTHER, name: 'Pine Vô Địch', best_ms: 38120, fish_id: 'f_ca_kiem', char_id: 'c_kim_ke', equip: { skin: 's_samurai' } },
      { rank: 2, user_id: UID, name: 'Cần Thủ', best_ms: 41500, fish_id: 'f_ca_ro', char_id: 'c_be_tom', equip: {} },
      { rank: 3, user_id: 'u9', name: 'Wnynie', best_ms: 44990, fish_id: 'f_ca_chep', char_id: 'c_co_lai_do', equip: {} }]);
    if (path === '/rest/v1/rpc/race_submit_time') { db.submitted = req.postDataJSON(); return json(200, 2); }
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
  await p.addInitScript(() => localStorage.setItem('dccc_skip_tutorial', '1')); // bỏ qua hướng dẫn tân thủ (có E2E riêng)
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
  await p.screenshot({ path: `${out}/race-hall-of-fame.png` });
  const hof = await p.evaluate(() => window.__game.scene.getScene('Race').records.get('tap_su')?.length ?? 0);
  if (hof !== 3) errs.push('Không hiện bục vinh danh toàn server');
  else console.log('• Bục vinh danh toàn server: top 3 nhanh nhất');
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
  // Pine về đích TRƯỚC mình → mình phải được báo VỀ NHÌ (không phải "về nhất")
  db.otherX = 1205;
  db.otherFinish = 20000;
  await p.waitForFunction(() => window.__game.scene.getScene('Race').session.racers.find((r) => r.remote).finishTime !== null, null, { timeout: 20000 }).catch(() => errs.push('Không nhận được Pine về đích'));
  await p.waitForTimeout(400);
  const texts = () => p.evaluate(() => window.__game.scene.getScene('Race').children.list.filter((o) => o.type === 'Text' || o.type === 'Container').flatMap((o) => (o.type === 'Text' ? [o.text] : o.list.filter((x) => x.type === 'Text').map((x) => x.text))));
  const t1 = await texts();
  if (!t1.some((t) => t.includes('Pine Vô Địch về NHẤT'))) errs.push('Không báo cho mọi người: Pine về NHẤT');
  else console.log('• Mọi người được báo: "🏁 Pine Vô Địch về NHẤT"');
  // tua nhanh mình về đích
  await p.evaluate(() => { const sc = window.__game.scene.getScene('Race'); const s = sc.session; while (s.player.finishTime === null) { s.update(50); for (const e of s.drainEvents()) sc.onEvent(e); } });
  await p.waitForTimeout(300);
  const t2 = await texts();
  const myPlace = await p.evaluate(() => { const s = window.__game.scene.getScene('Race').session; return s.finishRank(s.player).place; });
  const want = ['', 'VỀ NHẤT', 'VỀ NHÌ', 'VỀ BA'][myPlace] ?? `VỀ ĐÍCH HẠNG ${myPlace}`;
  if (myPlace < 2 || t2.some((t) => t.includes('VỀ NHẤT'))) errs.push('Lỗi cũ: Pine về trước mà mình vẫn bị báo VỀ NHẤT');
  else if (!t2.some((t) => t.includes(want))) errs.push(`Không báo đúng hạng ${myPlace}: ` + t2.filter((t) => t.includes('VỀ')).join(' | '));
  else console.log(`• Mình về sau Pine → báo đúng "${want}" (không còn "về nhất")`);
  await p.waitForFunction(() => window.__game.scene.getScene('Race').mode === 'result', null, { timeout: 120000 });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${out}/race-online-result.png` });
  if (!db.submitted || db.submitted.p_league !== 'tap_su' || !(db.submitted.p_ms > 0)) errs.push('Không ghi thành tích lên bục vinh danh');
  else console.log(`• Ghi thành tích ${(db.submitted.p_ms / 1000).toFixed(2)}s lên bục vinh danh`);
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
