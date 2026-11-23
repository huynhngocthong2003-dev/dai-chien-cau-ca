/**
 * E2E Đua Cá – phòng riêng mời bạn bè (máy chủ Supabase GIẢ).
 * Chủ phòng: 🏠 Phòng bạn bè → Tạo phòng → 📨 Mời bạn → bạn vào & sẵn sàng → 🏁 BẮT ĐẦU → đua cùng bạn (đúng bản đồ chủ phòng chọn).
 * Khách: mở bằng mã từ lời mời → ✅ SẴN SÀNG → chủ phòng bắt đầu → tự vào cuộc đua.
 * Chạy: node tests/e2e/race-lobby.cjs <url-có-cấu-hình-https://fake.supabase.test> [thư-mục-ảnh]
 */
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }
const url = process.argv[2] || 'http://localhost:5198/';
const out = process.argv[3] || 'test-results';
require('fs').mkdirSync(out, { recursive: true });
const errs = [];
const ME = '00000000-0000-4000-8000-000000000001';
const FRIEND = '00000000-0000-4000-8000-000000000002';
const friendRacer = { fishId: 'f_ca_kiem', formId: null, charId: 'c_kim_ke', equip: {}, stats: { speed: 70, accel: 45, stamina: 60, score: 60, grade: 'B' } };
const auth = (uid) => JSON.stringify({ access_token: 'tok', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r', user: { id: uid, aud: 'authenticated', role: 'authenticated', email: 'a@test', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } });

async function setup(b, uid, db) {
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.route('https://fake.supabase.test/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const json = (s, body) => route.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === '/auth/v1/user') return json(200, { id: uid, email: 'a@test' });
    if (path === '/rest/v1/player_saves') return req.method() === 'GET' ? json(200, []) : route.fulfill({ status: 201, body: '' });
    const fn = path.startsWith('/rest/v1/rpc/') ? path.slice(13) : null;
    if (fn && db[fn]) { db.calls.push(fn); return json(200, db[fn](req.postDataJSON() || {})); }
    if (path === '/rest/v1/friendships') return json(200, [{ id: 1, requester: ME, addressee: FRIEND, status: 'accepted' }]);
    if (path === '/rest/v1/player_cards') return req.method() === 'GET' ? json(200, [{ user_id: FRIEND, display_name: 'Pine Vô Địch', friend_code: 'X', level: 25, avatar: 'c_kim_ke', stats: {}, showcase: [], updated_at: new Date().toISOString() }]) : route.fulfill({ status: 201, body: '' });
    if (path === '/rest/v1/race_members') return req.method() === 'PATCH' ? route.fulfill({ status: 204, body: '' }) : json(200, []);
    if (fn) return json(200, fn.endsWith('unread_counts') || fn.endsWith('claim_topups') ? [] : null);
    if (path.startsWith('/rest/v1/')) return req.method() === 'GET' ? json(200, []) : route.fulfill({ status: 204, body: '' });
    return json(404, {});
  });
  await p.addInitScript((a) => localStorage.setItem('dccc_auth', a), auth(uid));
  await p.addInitScript(() => localStorage.setItem('dccc_skip_tutorial', '1')); // bỏ qua hướng dẫn tân thủ (có E2E riêng)
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'), null, { timeout: 30000 });
  await p.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('dccc_save_v1'));
    s.fishes = [{ uid: 'f1', fishId: 'f_ca_ro', level: 5, stars: 1, weightKg: 1, zoneId: 'z_ben_tan_thu', caughtAt: 1, locked: false }];
    s.gold = 5000;
    s.level = 12;
    localStorage.setItem('dccc_save_v1', JSON.stringify(s));
  });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'), null, { timeout: 30000 });
  return p;
}

(async () => {
  const b = await pw.chromium.launch();
  const room = { room_id: 77, league: 'tap_su', seed: 4242, map: 'nui_lua', start_in_ms: 2500, members: [
    { user_id: ME, slot: 0, racer: { fishId: 'f_ca_ro', formId: null, charId: 'c_be_tom', stats: {} } },
    { user_id: FRIEND, slot: 1, racer: { ...friendRacer, name: 'Pine Vô Địch' } }] };
  // ---------------- Chủ phòng
  const lobby = { lobby_id: 9, code: 'ABC123', host: ME, league: 'tap_su', map: 'nui_lua', status: 'open', room_id: null, members: [{ user_id: ME, name: 'Cần Thủ', level: 12, racer: {}, ready: true, is_host: true }] };
  let polls = 0;
  const host = { calls: [],
    race_lobby_create: (a) => ({ ...lobby, league: a.p_league, map: 'nui_lua' }),
    race_lobby_set: (a) => { lobby.league = a.p_league; lobby.map = a.p_map; return lobby; },
    race_lobby_state: () => {
      polls++;
      if (polls >= 2 && lobby.members.length === 1) lobby.members.push({ user_id: FRIEND, name: 'Pine Vô Địch', level: 25, racer: friendRacer, ready: true, is_host: false });
      return lobby;
    },
    race_lobby_ready: () => lobby,
    race_lobby_invite: () => null,
    race_lobby_start: () => { lobby.status = 'started'; lobby.room_id = 77; return room; },
  };
  const p = await setup(b, ME, host);
  await p.evaluate(() => { const sc = window.__game.scene.getScene('Hub'); sc.scene.start('Race'); });
  await p.waitForTimeout(1500);
  // chọn bản đồ Núi Lửa trước khi tạo phòng
  await p.mouse.click(512 + 4 * 134, 486);
  await p.waitForTimeout(300);
  await p.mouse.click(1172, 112);
  await p.waitForTimeout(600);
  await p.mouse.click(640, 160 + 150);
  await p.waitForFunction(() => window.__game.scene.getScene('Race').constructor.lobbyId === 9, null, { timeout: 10000 }).catch(() => null);
  if (!host.calls.includes('race_lobby_create')) errs.push('Không tạo được phòng');
  else console.log('• Tạo phòng ABC123 (Núi Lửa)');
  await p.waitForTimeout(3500);
  await p.screenshot({ path: `${out}/race-lobby-host.png` });
  // mời bạn
  await p.mouse.click(160 + 110, 40 + 640 - 46);
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${out}/race-lobby-invite.png` });
  await p.mouse.click(320 + 640 - 100, 80 + 90);
  await p.waitForTimeout(800);
  if (!host.calls.includes('race_lobby_invite')) errs.push('Không gửi được lời mời');
  else console.log('• Mời "Pine Vô Địch" vào phòng');
  await p.mouse.click(320 + 640 - 30, 80 + 30); // đóng hộp mời
  await p.waitForTimeout(600);
  // bắt đầu
  await p.mouse.click(160 + 960 - 130, 40 + 640 - 46);
  await p.waitForFunction(() => !!window.__game.scene.getScene('Race').room, null, { timeout: 15000 }).catch(() => null);
  const st = await p.evaluate(() => { const sc = window.__game.scene.getScene('Race'); return { map: sc.mapId, racers: sc.session?.racers.map((r) => ({ id: r.id, remote: !!r.remote, name: r.name })) }; });
  if (!host.calls.includes('race_lobby_start') || st.map !== 'nui_lua' || !st.racers?.some((r) => r.remote && r.name === 'Pine Vô Địch')) errs.push('Chủ phòng không bắt đầu được cuộc đua chung: ' + JSON.stringify(st));
  else console.log(`• Bắt đầu: đua cùng bạn trên bản đồ ${st.map} (${st.racers.length} tay đua, máy lấp chỗ trống)`);
  await p.close();
  // ---------------- Khách (vào từ lời mời)
  const lobby2 = { ...lobby, status: 'open', room_id: null, members: [{ user_id: FRIEND, name: 'Pine Vô Địch', level: 25, racer: friendRacer, ready: true, is_host: true }, { user_id: ME, name: 'Cần Thủ', level: 12, racer: {}, ready: false, is_host: false }], host: FRIEND };
  const guest = { calls: [],
    race_lobby_join: (a) => (a.p_code === 'ABC123' ? lobby2 : null),
    race_lobby_ready: (a) => { lobby2.members[1].ready = a.p_ready; return lobby2; },
    race_lobby_state: () => lobby2,
    race_room_get: () => ({ ...room, members: [room.members[1], room.members[0]].map((x, i) => ({ ...x, slot: i })) }),
  };
  const g = await setup(b, ME, guest);
  await g.evaluate(() => window.__game.scene.getScene('Hub').scene.start('Race', { joinCode: 'ABC123' }));
  await g.waitForTimeout(3000);
  if (!guest.calls.includes('race_lobby_join')) errs.push('Không vào phòng bằng mã từ lời mời');
  else console.log('• Khách vào phòng bằng mã từ lời mời');
  await g.mouse.click(160 + 960 - 130, 40 + 640 - 46);
  await g.waitForTimeout(800);
  await g.screenshot({ path: `${out}/race-lobby-guest.png` });
  if (!lobby2.members[1].ready) errs.push('Nút Sẵn sàng không hoạt động');
  else console.log('• Khách bấm ✅ Sẵn sàng');
  lobby2.status = 'started';
  lobby2.room_id = 77;
  await g.waitForFunction(() => !!window.__game.scene.getScene('Race').room, null, { timeout: 15000 }).catch(() => null);
  const gs = await g.evaluate(() => { const sc = window.__game.scene.getScene('Race'); return { map: sc.mapId, n: sc.session?.racers.length, slot0: sc.session?.racers[0]?.name }; });
  if (gs.map !== 'nui_lua' || gs.n !== 5 || gs.slot0 !== 'Pine Vô Địch') errs.push('Khách không tự vào cuộc đua: ' + JSON.stringify(gs));
  else console.log('• Chủ phòng bắt đầu → khách tự vào cuộc đua (cùng bản đồ, cùng thứ tự xuất phát)');
  await b.close();
  if (errs.length) { console.error('LỖI:\n' + errs.join('\n')); process.exit(1); }
  console.log('Race Lobby E2E OK');
})();
