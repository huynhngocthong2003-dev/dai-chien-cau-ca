/**
 * E2E lời mời đua cá (máy chủ GIẢ): người được mời đang ở sảnh → bảng xác nhận hiện với đếm ngược 10 giây
 * → bấm ✅ Vào phòng → chuyển sang Đua Cá và vào đúng phòng. Lời mời thứ 2 không bấm → hết 10 giây tự từ chối.
 * Chạy: node tests/e2e/race-invite.cjs <url-có-cấu-hình-https://fake.supabase.test> [thư-mục-ảnh]
 */
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }
const url = process.argv[2] || 'http://localhost:5198/';
const out = process.argv[3] || 'test-results';
require('fs').mkdirSync(out, { recursive: true });
const errs = [];
const ME = '00000000-0000-4000-8000-000000000001';
const auth = JSON.stringify({ access_token: 'tok', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r', user: { id: ME, aud: 'authenticated', role: 'authenticated', email: 'a@test', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } });
(async () => {
  const b = await pw.chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  const db = { invites: [], responses: [], joins: [] };
  const lobby = { lobby_id: 5, code: 'XYZ789', host: 'u2', league: 'tap_su', map: 'ran_san_ho', status: 'open', room_id: null, members: [{ user_id: 'u2', name: 'Pine Vô Địch', level: 25, racer: {}, ready: true, is_host: true }] };
  await p.route('https://fake.supabase.test/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const json = (s, body) => route.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === '/auth/v1/user') return json(200, { id: ME, email: 'a@test' });
    if (path === '/rest/v1/player_saves') return req.method() === 'GET' ? json(200, []) : route.fulfill({ status: 201, body: '' });
    if (path === '/rest/v1/rpc/race_my_invites') return json(200, db.invites.filter((i) => !db.responses.some((r) => r.p_id === i.id)));
    if (path === '/rest/v1/rpc/race_invite_respond') { db.responses.push(req.postDataJSON()); return json(200, null); }
    if (path === '/rest/v1/rpc/race_lobby_join') { db.joins.push(req.postDataJSON().p_code); lobby.members.push({ user_id: ME, name: 'Cần Thủ', level: 5, racer: {}, ready: false, is_host: false }); return json(200, lobby); }
    if (path === '/rest/v1/rpc/race_lobby_state') return json(200, lobby);
    if (path.startsWith('/rest/v1/rpc/')) return json(200, path.endsWith('unread_counts') || path.endsWith('claim_topups') ? [] : null);
    if (path.startsWith('/rest/v1/')) return req.method() === 'GET' ? json(200, []) : route.fulfill({ status: 204, body: '' });
    return json(404, {});
  });
  await p.addInitScript((a) => localStorage.setItem('dccc_auth', a), auth);
  await p.addInitScript(() => localStorage.setItem('dccc_skip_tutorial', '1')); // bỏ qua hướng dẫn tân thủ (có E2E riêng)
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'), null, { timeout: 30000 });
  await p.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('dccc_save_v1'));
    s.fishes = [{ uid: 'f1', fishId: 'f_ca_ro', level: 5, stars: 1, weightKg: 1, zoneId: 'z_ben_tan_thu', caughtAt: 1, locked: false }];
    localStorage.setItem('dccc_save_v1', JSON.stringify(s));
  });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'), null, { timeout: 30000 });
  await p.waitForTimeout(1000);
  // 1) lời mời → bảng xác nhận → Vào phòng
  db.invites.push({ id: 1, code: 'XYZ789', from_name: 'Pine Vô Địch', league: 'tap_su', map: 'ran_san_ho', members: 1, created_at: new Date().toISOString() });
  const hasPopup = () => p.evaluate(() => window.__game.scene.getScenes(true).some((s) => s.children.list.some((o) => o.depth === 5000 && o.active)));
  await p.waitForFunction(() => window.__game.scene.getScenes(true).some((s) => s.children.list.some((o) => o.depth === 5000)), null, { timeout: 15000 }).catch(() => null);
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${out}/race-invite-popup.png` });
  if (!(await hasPopup())) errs.push('Không hiện bảng xác nhận lời mời');
  else console.log('• Ở sảnh: hiện bảng "🏁 Pine Vô Địch mời bạn đua cá!" đếm ngược 10 giây');
  await p.mouse.click(640 - 120, 96 + 148);
  await p.waitForFunction(() => window.__game.scene.isActive('Race'), null, { timeout: 15000 }).catch(() => null);
  await p.waitForTimeout(2500);
  if (!db.responses.some((r) => r.p_id === 1 && r.p_accept === true) || !db.joins.includes('XYZ789')) errs.push('Bấm Vào phòng không vào được phòng: ' + JSON.stringify(db));
  else console.log('• Bấm ✅ Vào phòng → sang Đua Cá, vào đúng phòng XYZ789');
  // 2) lời mời thứ 2 không trả lời → tự từ chối sau 10 giây
  await p.evaluate(() => {
    const sc = window.__game.scene.getScene('Race');
    sc.lobbyModal?.close();
  });
  await p.waitForTimeout(500);
  db.invites.push({ id: 2, code: 'XYZ789', from_name: 'Wnynie', league: 'tap_su', map: 'random', members: 2, created_at: new Date().toISOString() });
  await p.waitForFunction(() => window.__game.scene.getScenes(true).some((s) => s.children.list.some((o) => o.depth === 5000 && o.active)), null, { timeout: 15000 }).catch(() => errs.push('Lời mời thứ 2 không hiện'));
  const t0 = Date.now();
  await p.waitForFunction(() => !window.__game.scene.getScenes(true).some((s) => s.children.list.some((o) => o.depth === 5000 && o.active)), null, { timeout: 20000 }).catch(() => null);
  const took = (Date.now() - t0) / 1000;
  if (!db.responses.some((r) => r.p_id === 2 && r.p_accept === false)) errs.push('Hết giờ không tự từ chối');
  else console.log(`• Không bấm gì: sau ~${took.toFixed(0)} giây tự từ chối`);
  await b.close();
  if (errs.length) { console.error('LỖI:\n' + errs.join('\n')); process.exit(1); }
  console.log('Race Invite E2E OK');
})();
