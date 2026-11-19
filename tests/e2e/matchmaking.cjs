/**
 * E2E ghép trận ngẫu nhiên (máy chủ Supabase GIẢ):
 *  1. Không ai chờ sẵn → vào hàng chờ → người khác ghép trúng mình (mình là bên phòng thủ) → xem trận, mất cá mạnh nhất.
 *  2. Có người đang chờ → ghép ngay, mình thách đấu (máy chủ tính) → thắng nhận cá nướng.
 * Chạy: node tests/e2e/matchmaking.cjs <url-có-cấu-hình-https://fake.supabase.test> [thư-mục-ảnh]
 */
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }
const url = process.argv[2] || 'http://localhost:5198/';
const out = process.argv[3] || 'test-results';
require('fs').mkdirSync(out, { recursive: true });
const errs = [];
const UID = '00000000-0000-4000-8000-000000000001';
const OPP = '00000000-0000-4000-8000-000000000002';
const F = (uid, fishId, name, power) => ({ uid, fishId, name, element: 'water', level: 5, stars: 1, maxHp: 100, atk: 10, def: 5, spd: 5, power, form: null });
const mine = [F('t1', 'f_ca_chep', 'Cá Chép Vàng', 90), F('t2', 'f_ca_ro', 'Cá Rô Đồng', 80), F('t3', 'f_ca_tre', 'Cá Trê Râu Dài', 70)];
const theirs = [F('o1', 'f_ca_loc', 'Cá Lóc Gầm Gừ', 95), F('o2', 'f_ca_ro', 'Cá Rô Đồng', 60), F('o3', 'f_ca_hu', 'Cá Hú', 50)];
const duel = (a, b, w) => ({ a, b, winner: w, events: [{ t: 'attack', side: w, dmg: 100, crit: true, adv: 1, hp: w === 0 ? [100, 0] : [0, 100] }, { t: 'ko', side: 1 - w }] });
// trận theo góc nhìn bên thách đấu (side 0)
const match = (chWins) => ({ seed: 7, duels: [duel(theirs[0], mine[0], chWins ? 0 : 1), duel(theirs[1], mine[1], chWins ? 0 : 1)], score: chWins ? [2, 0] : [0, 2], winner: chWins ? 0 : 1 });
const state = { scenario: 1, polls: 0, applied: [] };
(async () => {
  const b = await pw.chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  let remote = null;
  await p.route('https://fake.supabase.test/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const json = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === '/auth/v1/user') return json(200, { id: UID, aud: 'authenticated', email: 'a@test' });
    if (path === '/rest/v1/player_saves') {
      if (req.method() === 'GET') return json(200, remote ? [{ save: remote }] : []);
      const row = req.postDataJSON(); remote = (Array.isArray(row) ? row[0] : row).save; return route.fulfill({ status: 201, body: '' });
    }
    if (path === '/rest/v1/player_cards') return req.method() === 'GET' ? json(200, []) : route.fulfill({ status: 201, body: '' });
    if (path === '/rest/v1/friendships' || path === '/rest/v1/topup_orders') return json(200, []);
    if (path === '/rest/v1/pvp_matches') {
      // incomingMatch: ở kịch bản 1, lần hỏi thứ 2 có người ghép trúng mình và thắng mình
      if (req.url().includes('defender=eq.') && state.scenario === 1 && ++state.polls >= 2)
        return json(200, [{ id: '11111111-2222-4333-8444-000000000001', result: match(true), challenger_name: 'Đối Thủ Ngẫu Nhiên', applied_defender: false,
          for_defender: { side: 1, won: false, myTeam: ['t1', 't2', 't3'], duelWins: [false, false], lostUid: 't1' } }]);
      return json(200, []);
    }
    if (path === '/rest/v1/rpc/dm_queue_pair') return json(200, state.scenario === 2 ? OPP : null);
    if (path === '/rest/v1/rpc/dm_queue_count') return json(200, 1);
    if (path === '/rest/v1/rpc/mark_pvp_applied') { state.applied.push(req.postDataJSON().match_id); return route.fulfill({ status: 204, body: '' }); }
    if (path === '/functions/v1/death-match') {
      const body = req.postDataJSON();
      if (body.defenderId !== OPP) return json(400, { error: 'sai đối thủ' });
      const m = match(true); // mình là bên thách đấu và thắng
      const mm = { ...m, duels: m.duels.map((d) => ({ ...d, a: mine[0], b: theirs[0] })) };
      return json(200, { id: '11111111-2222-4333-8444-000000000002', result: mm, opponentName: 'Người Đang Chờ',
        record: { side: 0, won: true, myTeam: body.team, duelWins: [true, true], roasted: { fishId: 'f_ca_loc', level: 5, stars: 1 } } });
    }
    if (path.startsWith('/rest/v1/rpc/')) return json(200, path.endsWith('claim_topups') ? [] : null);
    return json(404, { message: 'mock: ' + path });
  });
  await p.addInitScript((uid) => {
    if (!localStorage.getItem('dccc_auth'))
      localStorage.setItem('dccc_auth', JSON.stringify({ access_token: 'tok', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r', user: { id: uid, aud: 'authenticated', role: 'authenticated', email: 'a@test', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } }));
  }, UID);
  const boot = async () => {
    await p.goto(url, { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'), null, { timeout: 30000 });
    await p.waitForTimeout(800);
  };
  await boot();
  // cho 4 con cá (đồng bộ cả máy chủ giả)
  const fish = (uid, fishId, level) => ({ uid, fishId, level, stars: 1, weightKg: 2, zoneId: 'z_ben_tan_thu', caughtAt: Date.now(), locked: false });
  remote = await p.evaluate((fs) => { const s = JSON.parse(localStorage.getItem('dccc_save_v1')); s.fishes = fs; s.updatedAt = Date.now() + 5000; localStorage.setItem('dccc_save_v1', JSON.stringify(s)); return s; },
    [fish('t1', 'f_ca_chep', 9), fish('t2', 'f_ca_ro', 8), fish('t3', 'f_ca_tre', 7), fish('t4', 'f_ca_ro', 2)]);
  await boot();
  const save = () => p.evaluate(() => JSON.parse(localStorage.getItem('dccc_save_v1')));
  const openPvp = async () => {
    await p.evaluate(() => window.__game.scene.getScenes(true)[0].scene.start('DeathMatch', { mode: 'pvp' }));
    await p.waitForTimeout(900);
    for (let i = 0; i < 3; i++) { await p.mouse.click(20 + i * 136 + 64, 178 + 71); await p.waitForTimeout(150); }
  };

  // ---- 1. chờ và bị ghép
  await openPvp();
  await p.screenshot({ path: `${out}/mm-pick.png` });
  await p.mouse.click(1058, 520); // 🎲 Ghép ngẫu nhiên
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/mm-wait.png` });
  await p.waitForFunction(() => window.__game.scene.isActive('Battle'), null, { timeout: 20000 });
  await p.waitForTimeout(600);
  let s = await save();
  if (s.fishes.some((f) => f.uid === 't1') || !s.pvpApplied.includes('11111111-2222-4333-8444-000000000001')) errs.push('Bị ghép & thua nhưng chưa mất cá mạnh nhất');
  else console.log('• Đang chờ thì có người ghép trúng → xem trận, thua, mất Cá Chép (mạnh nhất)');
  await p.screenshot({ path: `${out}/mm-battle-def.png` });

  // ---- 2. có người chờ sẵn → ghép ngay và thắng
  state.scenario = 2;
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('dccc_save_v1')); s.fishes.push({ uid: 't5', fishId: 'f_ca_chep', level: 6, stars: 1, weightKg: 2, zoneId: 'z_ben_tan_thu', caughtAt: Date.now(), locked: false }); s.updatedAt = Date.now() + 9000; localStorage.setItem('dccc_save_v1', JSON.stringify(s)); });
  remote = await save();
  await boot();
  await openPvp();
  const r0 = (await save()).roasted.length;
  await p.mouse.click(1058, 520);
  await p.waitForFunction(() => window.__game.scene.isActive('Battle'), null, { timeout: 20000 });
  await p.waitForTimeout(600);
  s = await save();
  if (s.roasted.length !== r0 + 1) errs.push('Ghép ngay & thắng nhưng không nhận cá nướng');
  else console.log('• Có người đang chờ → ghép ngay, thắng, nhận cá nướng Cá Lóc');
  if (state.applied.length < 2) errs.push('Chưa báo máy chủ đã áp dụng trận');
  await b.close();
  if (errs.length) { console.error('LỖI:\n' + errs.join('\n')); process.exit(1); }
  console.log('Matchmaking E2E OK');
})();
