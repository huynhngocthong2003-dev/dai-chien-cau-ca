/**
 * E2E TÌM TRẬN Đấu Sinh Tử (máy chủ Supabase GIẢ):
 *  1) Có người đang tìm trận → ghép NGƯỜI, tự chốt đội đã chọn → vào phòng đấu chờ đối thủ chốt.
 *  2) Không có ai trong 20 giây → rời phòng chờ, chuyển sang đấu MÁY.
 * Chạy: node tests/e2e/quickmatch.cjs <url-có-cấu-hình-https://fake.supabase.test> [thư-mục-ảnh]
 */
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }
const url = process.argv[2] || 'http://localhost:5198/';
const out = process.argv[3] || 'test-results';
require('fs').mkdirSync(out, { recursive: true });
const errs = [];
const UID = '00000000-0000-4000-8000-000000000001';
const now = () => new Date().toISOString();
const room = (o) => ({ id: '11111111-1111-4111-8111-111111111111', code: 'ABCDEF', stake: 'death', status: 'waiting', side: 0, isHost: true, oppName: null,
  expiresAt: new Date(Date.now() + 30000).toISOString(), pickDeadline: null, myTeam: null, oppPicked: false, state: null, turn: 0, bar: null, turnStartedAt: null,
  serverNow: now(), turnTimeMs: 20000, winner: null, myLose: null, oppLose: null, cancelReason: null, settled: false, events: [], ...o });
const db = { mode: 'human', quick: 0, picked: null, left: 0 };

async function run(b, mode) {
  db.mode = mode; db.quick = 0; db.picked = null; db.left = 0;
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', (e) => errs.push(`[${mode}] pageerror: ` + e.message));
  await p.route('https://fake.supabase.test/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const json = (s, body) => route.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === '/auth/v1/user') return json(200, { id: UID, email: 'a@test' });
    if (path === '/rest/v1/player_saves') return req.method() === 'GET' ? json(200, []) : route.fulfill({ status: 201, body: '' });
    if (path.startsWith('/rest/v1/rpc/')) return json(200, path.endsWith('unread_counts') || path.endsWith('claim_topups') ? [] : null);
    if (path.startsWith('/rest/v1/')) return req.method() === 'GET' ? json(200, []) : route.fulfill({ status: 201, body: '' });
    if (path === '/functions/v1/pvp') {
      const body = req.postDataJSON() ?? {};
      if (body.op === 'pending') return json(200, { rooms: [] });
      if (body.op === 'quick') {
        db.quick++;
        if (db.mode === 'human' && db.quick >= 2) return json(200, room({ status: 'picking', oppName: 'Pine Vô Địch', side: 1, isHost: false, pickDeadline: new Date(Date.now() + 30000).toISOString() }));
        return json(200, room({}));
      }
      if (body.op === 'pick') { db.picked = body.team; return json(200, room({ status: 'picking', oppName: 'Pine Vô Địch', myTeam: body.team, pickDeadline: new Date(Date.now() + 30000).toISOString() })); }
      if (body.op === 'leave') { db.left++; return json(200, room({ status: 'cancelled' })); }
      if (body.op === 'get') return json(200, room({ status: 'picking', oppName: 'Pine Vô Địch', myTeam: db.picked, pickDeadline: new Date(Date.now() + 30000).toISOString() }));
      return json(200, room({}));
    }
    if (path === '/functions/v1/battle') return json(500, { error: 'giả lập' });
    return json(404, {});
  });
  await p.addInitScript((uid) => {
    localStorage.setItem('dccc_auth', JSON.stringify({ access_token: 'tok', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r', user: { id: uid, aud: 'authenticated', role: 'authenticated', email: 'a@test', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } }));
  }, UID);
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'), null, { timeout: 30000 });
  await p.evaluate(async () => {
    // tài khoản mới chưa có cá → thêm 3 con để chọn đội
    const { GameState } = await import('/src/state/GameState.ts');
    const s = structuredClone(GameState.save);
    const mk = (uid, fishId, level) => ({ uid, fishId, level, stars: 1, weightKg: 2, zoneId: 'z_ben_tan_thu', caughtAt: Date.now(), locked: false });
    s.fishes = [mk('q1', 'f_ca_chep', 9), mk('q2', 'f_ca_ro', 8), mk('q3', 'f_ca_tre', 7)];
    GameState.commit(s);
    window.__game.scene.getScene('Hub').scene.start('DeathMatch');
  });
  await p.waitForFunction(() => window.__game.scene.isActive('DeathMatch'), null, { timeout: 8000 });
  await p.waitForTimeout(600);
  // chọn 3 cá đầu tiên có thể ra trận
  const ok = await p.evaluate(() => {
    const sc = window.__game.scene.getScene('DeathMatch');
    const list = sc.candidates();
    if (list.length < 3) return false;
    sc.team = list.slice(0, 3).map((f) => f.uid);
    sc.render();
    return true;
  });
  if (!ok) { errs.push(`[${mode}] không đủ 3 cá để thử`); await p.close(); return; }
  await p.waitForTimeout(300);
  await p.mouse.click(1058, 640); // 🔎 TÌM TRẬN
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/quick-${mode}-search.png` });
  if (mode === 'human') {
    await p.waitForFunction(() => window.__game.scene.isActive('PvpRoom'), null, { timeout: 15000 }).catch(() => null);
    const inRoom = await p.evaluate(() => window.__game.scene.isActive('PvpRoom'));
    if (!inRoom || !db.picked) errs.push(`[human] không vào phòng đấu người (picked=${JSON.stringify(db.picked)})`);
    else console.log(`• Ghép được NGƯỜI sau ${db.quick} lần tìm, tự chốt đội ${db.picked.length} cá → phòng đấu`);
    if (db.left) errs.push('[human] đã ghép mà vẫn gọi rời phòng');
    await p.screenshot({ path: `${out}/quick-human-room.png` });
  } else {
    await p.waitForFunction(() => window.__game.scene.isActive('Combat3'), null, { timeout: 30000 }).catch(() => null);
    const ai = await p.evaluate(() => window.__game.scene.isActive('Combat3'));
    if (!ai) errs.push('[ai] hết giờ không chuyển sang đấu máy');
    else console.log(`• Không có người sau 20 giây (${db.quick} lần tìm) → rời phòng chờ (${db.left}) → đấu MÁY`);
    if (!db.left) errs.push('[ai] không rời phòng chờ trước khi đấu máy');
  }
  await p.close();
}

(async () => {
  const b = await pw.chromium.launch();
  await run(b, 'human');
  await run(b, 'ai');
  await b.close();
  if (errs.length) { console.error('LỖI:\n' + errs.join('\n')); process.exit(1); }
  console.log('QUICKMATCH E2E OK');
})();
