/**
 * E2E Quảng Trường (máy chủ Supabase GIẢ): vào từ sảnh → thấy người chơi khác (đi lại, khoe cá, nói chuyện)
 * → bấm nền để đi, phím mũi tên, cần điều khiển → thả biểu cảm → khoe cá → chat → rời quảng trường xóa hiện diện.
 * Chạy: node tests/e2e/plaza.cjs <url-có-cấu-hình-https://fake.supabase.test> [thư-mục-ảnh]
 */
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }
const url = process.argv[2] || 'http://localhost:5198/';
const out = process.argv[3] || 'test-results';
require('fs').mkdirSync(out, { recursive: true });
const errs = [];
const UID = '00000000-0000-4000-8000-000000000001';
const OTHER = '00000000-0000-4000-8000-000000000002';
const now = () => new Date().toISOString();
const other = { user_id: OTHER, name: 'Pine Vô Địch', title: 't_vua_rac', level: 25, x: 0.8, y: 0.7, look: { c: 'c_kim_ke', equip: { skin: 's_samurai' } },
  showing: { fishId: 'f_boss_lao_ngu', formId: null, kg: 88.5, lv: 20, stars: 3 }, emote: null, emote_at: null, updated_at: now() };
const db = { presence: new Map(), world: [], deletes: 0 };
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
    if (path === '/rest/v1/player_cards') return req.method() === 'GET' ? json(200, []) : route.fulfill({ status: 201, body: '' });
    if (path === '/rest/v1/plaza_presence') {
      if (req.method() === 'POST') { const r = req.postDataJSON(); db.presence.set(r.user_id, { ...r, name: 'Cần Thủ', level: 1, updated_at: now() }); return route.fulfill({ status: 201, body: '' }); }
      if (req.method() === 'DELETE') { db.deletes++; return route.fulfill({ status: 204, body: '' }); }
      return json(200, [{ ...other, updated_at: now() }, ...db.presence.values()]);
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
  await p.waitForTimeout(800);
  // cho người chơi có 1 con cá để khoe
  await p.evaluate(() => {
    const gs = window.__game.scene.getScene('Hub');
    void gs;
  });
  // nút 🏙 Quảng Trường ở sảnh
  await p.mouse.click(92, 190);
  await p.waitForFunction(() => window.__game.scene.isActive('Plaza'), null, { timeout: 8000 });
  await p.waitForTimeout(3500);
  const sc = () => p.evaluate(() => {
    const s = window.__game.scene.getScene('Plaza');
    return { me: { ...s.me.pos }, others: [...s.others.values()].map((a) => ({ id: a.id, show: !!a.show, bubble: !!a.bubble })) };
  });
  let st = await sc();
  if (st.others.length !== 1 || !st.others[0].show) errs.push('Không thấy người chơi khác đang khoe cá: ' + JSON.stringify(st));
  else console.log('• Thấy "Pine Vô Địch" ở quảng trường, đang giơ cá khoe');
  if (![...db.presence.keys()].includes(UID)) errs.push('Chưa gửi vị trí của mình lên máy chủ');
  else console.log('• Đã gửi hiện diện của mình');
  // người kia nói chuyện → bong bóng
  db.world.push({ id: 5, user_id: OTHER, name: 'Pine Vô Địch', title: 't_vua_rac', level: 25, body: 'Ê cá này nặng ghê 😎', created_at: now() });
  await p.waitForFunction(() => [...window.__game.scene.getScene('Plaza').others.values()].some((a) => a.bubble), null, { timeout: 10000 }).catch(() => null);
  st = await sc();
  if (!st.others[0]?.bubble) errs.push('Không hiện bong bóng chat của người khác');
  else console.log('• Bong bóng chat hiện trên đầu người nói');
  // bấm nền để đi
  const before = st.me;
  await p.mouse.click(300, 520);
  await p.waitForFunction(() => { const m = window.__game.scene.getScene('Plaza').me.pos; return Math.hypot(m.x - 300, m.y - 520) < 4; }, null, { timeout: 10000 }).catch(() => null);
  st = await sc();
  if (Math.hypot(st.me.x - 300, st.me.y - 520) > 4) errs.push(`Bấm nền không đi tới đúng chỗ: ${JSON.stringify(before)} → ${JSON.stringify(st.me)}`);
  else console.log('• Bấm vào nền: nhân vật đi tới đúng chỗ');
  // phím mũi tên phải
  const x0 = st.me.x;
  await p.keyboard.down('ArrowRight');
  await p.waitForTimeout(600);
  await p.keyboard.up('ArrowRight');
  st = await sc();
  if (st.me.x < x0 + 80) errs.push('Phím mũi tên không di chuyển được');
  else console.log(`• Phím mũi tên: đi ${Math.round(st.me.x - x0)}px`);
  // cần điều khiển ảo: kéo lên trên
  const y0 = st.me.y;
  await p.mouse.move(110, 600);
  await p.mouse.down();
  await p.mouse.move(110, 540, { steps: 4 });
  await p.waitForTimeout(500);
  await p.mouse.up();
  st = await sc();
  if (st.me.y > y0 - 40) errs.push(`Cần điều khiển không đi được: ${y0} → ${st.me.y}`);
  else console.log(`• Cần điều khiển: đi lên ${Math.round(y0 - st.me.y)}px`);
  // biểu cảm 👋 (nút đầu tiên)
  await p.mouse.click(905, 686);
  await p.waitForTimeout(1800);
  const em = db.presence.get(UID)?.emote;
  if (!em || !em.startsWith('👋')) errs.push('Biểu cảm không gửi lên: ' + em);
  else console.log('• Thả biểu cảm 👋');
  // chat
  await p.fill('#plaza-input', 'Chào mọi người!');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(800);
  if (!db.world.some((m) => m.body === 'Chào mọi người!' && m.user_id === UID)) errs.push('Chat ở quảng trường không gửi được');
  else console.log('• Chat từ quảng trường lên Kênh Thế Giới');
  await p.screenshot({ path: `${out}/plaza.png` });
  // khoe cá: mở hộp chọn (kho trống trong test → báo đi câu); kiểm tra không lỗi
  await p.mouse.click(1140, 620);
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${out}/plaza-showoff.png` });
  // rời quảng trường
  await p.evaluate(() => window.__game.scene.getScene('Plaza').scene.start('Hub'));
  await p.waitForTimeout(1000);
  if (db.deletes < 1) errs.push('Rời quảng trường không xóa hiện diện');
  else console.log('• Rời quảng trường: xóa hiện diện');
  // màn hình điện thoại ngang (iPhone 12 Pro)
  const m = await b.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  await m.route('https://fake.supabase.test/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await m.goto(url, { waitUntil: 'domcontentloaded' });
  await m.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'), null, { timeout: 30000 });
  await m.evaluate(() => window.__game.scene.getScene('Hub').scene.start('Plaza'));
  await m.waitForTimeout(1500);
  await m.screenshot({ path: `${out}/plaza-phone.png` });
  console.log('• Hiển thị trên điện thoại (ngang)');
  await b.close();
  if (errs.length) { console.error('LỖI:\n' + errs.join('\n')); process.exit(1); }
  console.log('Plaza E2E OK');
})();
