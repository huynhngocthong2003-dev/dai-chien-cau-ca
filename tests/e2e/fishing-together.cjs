/**
 * E2E Câu cùng nhau (máy chủ Supabase GIẢ): vào khu câu → máy chủ chia chỗ → thấy 3 người khác ở 3 chỗ riêng
 * trên bến xa (không chồng nhau, không đè bục của mình) → thấy người đang kéo cá và người vừa câu được cá
 * → mình câu → gửi trạng thái chờ/kéo/câu được → rời khu xóa chỗ.
 * Chạy: node tests/e2e/fishing-together.cjs <url-có-cấu-hình-https://fake.supabase.test> [thư-mục-ảnh]
 */
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }
const url = process.argv[2] || 'http://localhost:5198/';
const out = process.argv[3] || 'test-results';
require('fs').mkdirSync(out, { recursive: true });
const errs = [];
const UID = '00000000-0000-4000-8000-000000000001';
const now = () => new Date().toISOString();
const others = [
  { user_id: 'u2', zone_id: 'z_ben_tan_thu', spot: 1, name: 'Pine Vô Địch', title: 't_vua_rac', level: 25, look: { c: 'c_kim_ke', equip: { skin: 's_samurai' } }, state: 'reeling', catch: null, catch_at: null },
  { user_id: 'u3', zone_id: 'z_ben_tan_thu', spot: 2, name: 'Wnynie', title: null, level: 9, look: { c: 'c_co_lai_do' }, state: 'waiting', catch: null, catch_at: null },
  { user_id: 'u4', zone_id: 'z_ben_tan_thu', spot: 4, name: 'Chư Ngọc', title: null, level: 14, look: { c: 'c_ong_lao' }, state: 'caught', catch: { fishId: 'f_boss_lao_ngu', formId: null, kg: 88.5 }, catch_at: now() },
];
const db = { joins: 0, updates: [], leaves: 0, world: [] };
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
    if (path === '/rest/v1/rpc/fishing_join') { db.joins++; return json(200, 0); }
    if (path === '/rest/v1/rpc/fishing_leave') { db.leaves++; return json(200, null); }
    if (path === '/rest/v1/fishing_presence') {
      if (req.method() === 'PATCH') { db.updates.push(req.postDataJSON()); return route.fulfill({ status: 204, body: '' }); }
      return json(200, [{ ...others[0] }, { ...others[1] }, { ...others[2] }, { user_id: UID, zone_id: 'z_ben_tan_thu', spot: 0, name: 'Cần Thủ', title: null, level: 1, look: { c: 'c_be_tom' }, state: 'idle', catch: null, catch_at: null }]);
    }
    if (path === '/rest/v1/world_messages') {
      if (req.method() === 'POST') { const r = req.postDataJSON(); db.world.push({ id: 100 + db.world.length, ...r, name: 'Cần Thủ', title: null, level: 1, created_at: now() }); return route.fulfill({ status: 201, body: '' }); }
      return json(200, [...db.world].reverse());
    }
    if (path.startsWith('/rest/v1/rpc/')) return json(200, path.endsWith('unread_counts') || path.endsWith('claim_topups') ? [] : null);
    if (path.startsWith('/rest/v1/')) return json(200, []);
    return json(404, {});
  });
  await p.addInitScript((uid) => localStorage.setItem('dccc_auth', JSON.stringify({ access_token: 'tok', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r', user: { id: uid, aud: 'authenticated', role: 'authenticated', email: 'a@test', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } })), UID);
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'), null, { timeout: 30000 });
  await p.evaluate(() => window.__game.scene.getScene('Hub').scene.start('Fishing', { zoneId: 'z_ben_tan_thu' }));
  await p.waitForFunction(() => window.__game.scene.getScene('Fishing').together?.others?.size === 3, null, { timeout: 30000 }).catch(() => null);
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${out}/fishing-together.png` });
  const st = await p.evaluate(() => {
    const t = window.__game.scene.getScene('Fishing').together;
    return { spot: t.mySpot, others: [...t.others.values()].map((o) => ({ x: o.root.x, name: o.p.name, pop: !!o.pop })) };
  });
  if (db.joins !== 1 || st.spot !== 0) errs.push('Không vào khu / không nhận chỗ: ' + JSON.stringify(st));
  else console.log('• Vào khu câu – máy chủ chia chỗ 0');
  const xs = st.others.map((o) => o.x).sort((a, b) => a - b);
  const ok = st.others.length === 3 && xs.every((x, i) => i === 0 || x - xs[i - 1] >= 110) && xs[0] > 380;
  if (!ok) errs.push('Người khác chồng nhau hoặc đè bục: ' + JSON.stringify(st.others));
  else console.log('• Thấy 3 người ở 3 chỗ riêng: ' + st.others.map((o) => `${o.name}@${o.x}`).join(', '));
  if (!st.others.find((o) => o.name === 'Chư Ngọc')?.pop) errs.push('Không hiện cá người khác vừa câu được');
  else console.log('• "Chư Ngọc" giơ cá Boss vừa câu được');
  // 💬 khung chat lúc câu cá
  await p.mouse.click(740, 38);
  await p.waitForTimeout(600);
  await p.fill('#fish-chat-input', 'Có ai câu được boss chưa?');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(800);
  if (!db.world.some((m) => m.body === 'Có ai câu được boss chưa?')) errs.push('Khung chat lúc câu không gửi được');
  else console.log('• Khung chat lúc câu cá: gửi tin lên Chat Thế Giới');
  const noCast = await p.evaluate(() => window.__game.scene.getScene('Fishing').mode);
  if (noCast !== 'idle') errs.push('Gõ/bấm trong khung chat lại quăng cần: ' + noCast);
  db.world.push({ id: 7, user_id: 'u2', name: 'Pine Vô Địch', title: null, level: 25, body: 'Vừa dính con boss 88kg nè!', created_at: now() });
  await p.waitForFunction(() => window.__game.scene.getScene('Fishing').together.others.get('u2')?.root.getData('bubble')?.active, null, { timeout: 15000 }).catch(() => errs.push('Không hiện bong bóng chat trên đầu người cùng khu'));
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${out}/fishing-chat.png` });
  console.log('• Người cùng khu nói → bong bóng trên đầu họ; khung chat hiện tin mới');
  await p.mouse.click(16 + 700 - 30, 410 + 24); // nút ▾ thu gọn trên khung
  await p.waitForTimeout(400);
  const closed = await p.evaluate(() => !document.getElementById('fish-chat-input'));
  if (!closed) errs.push('Nút ▾ không thu gọn được khung chat');
  else console.log('• Khung chat thu gọn bằng nút ▾ (mở lại bằng 💬 Chat)');
  // mình quăng cần → trạng thái "waiting"
  await p.mouse.move(700, 450);
  await p.mouse.down();
  await p.waitForTimeout(500);
  await p.mouse.up();
  await p.waitForFunction(() => window.__game.scene.getScene('Fishing').session !== null, null, { timeout: 15000 });
  await p.waitForTimeout(800);
  if (!db.updates.some((u) => u.state === 'waiting')) errs.push('Không gửi trạng thái chờ cá: ' + JSON.stringify(db.updates));
  else console.log('• Gửi trạng thái "đang chờ cá"');
  await p.evaluate(() => window.__game.scene.getScene('Fishing').scene.start('Hub'));
  await p.waitForTimeout(800);
  if (db.leaves < 1) errs.push('Rời khu không trả chỗ');
  else console.log('• Rời khu: trả chỗ câu');
  await b.close();
  if (errs.length) { console.error('LỖI:\n' + errs.join('\n')); process.exit(1); }
  console.log('Fishing Together E2E OK');
})();
