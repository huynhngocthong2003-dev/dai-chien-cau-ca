/**
 * E2E mạng xã hội (máy chủ Supabase GIẢ): Bảng Xếp Hạng → bấm người chơi → trang cá nhân (nhân vật cầm cần,
 * danh hiệu, online) → 💬 Nhắn tin gửi được → 🌍 Chat Thế Giới gửi được.
 * Chạy: node tests/e2e/social.cjs <url-có-cấu-hình-https://fake.supabase.test> [thư-mục-ảnh]
 */
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }
const url = process.argv[2] || 'http://localhost:5198/';
const out = process.argv[3] || 'test-results';
require('fs').mkdirSync(out, { recursive: true });
const errs = [];
const UID = '00000000-0000-4000-8000-000000000001';
const OTHER = '00000000-0000-4000-8000-000000000002';
const card = { user_id: OTHER, display_name: 'Pine Vô Địch', friend_code: '0000ABCD', level: 25, avatar: 'c_kim_ke', updated_at: new Date().toISOString(),
  stats: { caught: 1234, bosses: 12, dmWins: 30, dmLosses: 4, teamPower: 9999, title: 't_vua_rac', equip: { skin: 's_samurai' }, rod: 'r_huyet_ma_long', awakened: true, pid: 'p_test' },
  showcase: [{ fishId: 'f_boss_lao_ngu', level: 20, stars: 2, form: 'hoa_lam', wins: 9, losses: 1, power: 4321 }] };
const db = { dms: [], world: [] };
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
    if (path === '/rest/v1/player_cards') return req.method() === 'GET' ? json(200, req.url().includes(OTHER) ? [card] : []) : route.fulfill({ status: 201, body: '' });
    if (path === '/rest/v1/rpc/leaderboard') return json(200, [{ rank: 1, user_id: OTHER, display_name: card.display_name, level: 25, avatar: 'c_kim_ke', title: 't_vua_rac', score: 9999, guild_name: null, guild_tag: null }]);
    if (path === '/rest/v1/rpc/my_rank') return json(200, null);
    if (path === '/rest/v1/messages') {
      if (req.method() === 'POST') { const r = req.postDataJSON(); db.dms.push({ id: db.dms.length + 1, ...r, created_at: new Date().toISOString(), read_at: null }); return route.fulfill({ status: 201, body: '' }); }
      return json(200, [...db.dms].reverse());
    }
    if (path === '/rest/v1/world_messages') {
      if (req.method() === 'POST') { const r = req.postDataJSON(); db.world.push({ id: db.world.length + 1, ...r, name: 'Cần Thủ', title: null, level: 1, created_at: new Date().toISOString() }); return route.fulfill({ status: 201, body: '' }); }
      return json(200, [...db.world, { id: 99, user_id: OTHER, name: card.display_name, title: 't_vua_rac', level: 25, body: 'Chào cả nhà!', created_at: new Date(Date.now() - 60000).toISOString() }].reverse());
    }
    if (path.startsWith('/rest/v1/rpc/')) return json(200, path.endsWith('unread_counts') || path.endsWith('claim_topups') ? [] : null);
    if (path.startsWith('/rest/v1/')) return json(200, []);
    return json(404, {});
  });
  await p.addInitScript((uid) => localStorage.setItem('dccc_auth', JSON.stringify({ access_token: 'tok', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r', user: { id: uid, aud: 'authenticated', role: 'authenticated', email: 'a@test', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } })), UID);
  await p.addInitScript(() => localStorage.setItem('dccc_skip_tutorial', '1')); // bỏ qua hướng dẫn tân thủ (có E2E riêng)
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'), null, { timeout: 30000 });
  await p.waitForTimeout(800);
  // Bảng Xếp Hạng → bấm hàng 1
  await p.evaluate(() => window.__game.scene.getScene('Hub').scene.start('Ranking'));
  await p.waitForTimeout(1500);
  await p.mouse.click(500, 170 + 30);
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${out}/player-profile.png` });
  const shown = await p.evaluate(() => window.__game.scene.getScene('Ranking').children.list.some((o) => o.depth === 900 && o.list?.some((t) => t.text === 'Pine Vô Địch')));
  if (!shown) errs.push('Không mở được trang cá nhân từ Bảng Xếp Hạng');
  else console.log('• Bảng Xếp Hạng → trang cá nhân "Pine Vô Địch"');
  // 💬 Nhắn tin (modal 1120×640 tại 80,40 → nút ở x 80+910, y 40+640-44)
  await p.mouse.click(80 + 910, 40 + 640 - 44);
  await p.waitForTimeout(800);
  await p.fill('#chat-input', 'Đấu sinh tử không bạn?');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(1000);
  await p.screenshot({ path: `${out}/chat.png` });
  if (db.dms.length !== 1 || db.dms[0].recipient !== OTHER || db.dms[0].sender !== UID) errs.push('Nhắn tin không gửi đúng: ' + JSON.stringify(db.dms));
  else console.log('• Nhắn tin 1–1 gửi thành công');
  // 🌍 Chat Thế Giới
  await p.evaluate(() => window.__game.scene.getScenes(true)[0].scene.start('Hub'));
  await p.waitForTimeout(1000);
  await p.mouse.click(92, 130);
  await p.waitForTimeout(1000);
  await p.fill('#world-input', 'Xin chào thế giới!');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(1000);
  await p.screenshot({ path: `${out}/world-chat.png` });
  if (db.world.length !== 1 || db.world[0].body !== 'Xin chào thế giới!') errs.push('Chat thế giới không gửi được');
  else console.log('• Chat Thế Giới gửi thành công');
  await b.close();
  if (errs.length) { console.error('LỖI:\n' + errs.join('\n')); process.exit(1); }
  console.log('Social E2E OK');
})();
