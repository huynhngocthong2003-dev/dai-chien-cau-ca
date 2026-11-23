/**
 * E2E nạp tiền (cách A – chủ dự án duyệt) với máy chủ Supabase GIẢ:
 * tạo lệnh gói 100 KC → hiện QR + nội dung DCCC… → (giả lập chủ game duyệt) → Kiểm tra & nhận → +100 💎;
 * gói Câu Tự Động 2 ngày → nút 🤖 khi câu cá tự quăng/giật/kéo được 1 con.
 * Chạy: node tests/e2e/topup.cjs <url-có-cấu-hình-https://fake.supabase.test> [thư-mục-ảnh]
 */
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }
const url = process.argv[2] || 'http://localhost:5198/';
const out = process.argv[3] || 'test-results';
require('fs').mkdirSync(out, { recursive: true });
const errs = [];
const UID = '00000000-0000-4000-8000-000000000001';
const db = { orders: [], save: null, admin: true };
(async () => {
  const b = await pw.chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/img\.vietqr\.io|ERR_NAME|net::/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.route('https://img.vietqr.io/**', (r) => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>' }));
  await p.route('https://fake.supabase.test/**', async (route) => {
    const req = route.request();
    const u = new URL(req.url());
    const json = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    const path = u.pathname;
    if (path === '/auth/v1/user') return json(200, { id: UID, aud: 'authenticated', email: 'a@test' });
    if (path === '/rest/v1/player_saves') {
      if (req.method() === 'GET') return json(200, db.save ? [{ save: db.save }] : []);
      const row = req.postDataJSON(); db.save = (Array.isArray(row) ? row[0] : row).save; return route.fulfill({ status: 201, body: '' });
    }
    if (path === '/rest/v1/player_cards') return req.method() === 'GET' ? json(200, []) : route.fulfill({ status: 201, body: '' });
    if (path === '/rest/v1/pvp_matches' || path === '/rest/v1/friendships') return json(200, []);
    if (path === '/rest/v1/topup_orders') return json(200, [...db.orders].reverse());
    if (path === '/rest/v1/rpc/is_admin') return json(200, db.admin);
    if (path === '/rest/v1/rpc/create_topup') {
      const pkg = req.postDataJSON().p_package;
      const amt = { kc100: 20000, kc300: 50000, auto2d: 20000 }[pkg];
      const o = { id: `aaaaaaaa-0000-4000-8000-00000000000${db.orders.length + 1}`, package: pkg, amount_vnd: amt, code: `DCCC00000${db.orders.length + 1}`, status: 'pending', created_at: new Date().toISOString(), player_name: 'Test' };
      db.orders.push(o);
      return json(200, [{ id: o.id, code: o.code, amount_vnd: amt }]);
    }
    if (path === '/rest/v1/rpc/admin_list_topups') return json(200, db.orders.filter((o) => o.status === 'pending'));
    if (path === '/rest/v1/rpc/admin_decide_topup') { const b2 = req.postDataJSON(); const o = db.orders.find((x) => x.id === b2.p_id); o.status = b2.p_approve ? 'approved' : 'rejected'; return route.fulfill({ status: 204, body: '' }); }
    if (path === '/rest/v1/rpc/claim_topups') { const got = db.orders.filter((o) => o.status === 'approved'); got.forEach((o) => (o.status = 'claimed')); return json(200, got.map((o) => ({ id: o.id, package: o.package }))); }
    if (path.startsWith('/rest/v1/rpc/')) return json(200, null);
    // các bảng khác (câu cùng nhau, quảng trường…) không liên quan tới nạp: trả rỗng
    if (path.startsWith('/rest/v1/')) return req.method() === 'GET' ? json(200, []) : route.fulfill({ status: 204, body: '' });
    return json(404, { message: 'mock: ' + path });
  });
  // phiên đăng nhập có sẵn
  await p.addInitScript((uid) => {
    localStorage.setItem('dccc_auth', JSON.stringify({ access_token: 'tok', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r', user: { id: uid, aud: 'authenticated', role: 'authenticated', email: 'a@test', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } }));
  }, UID);
  await p.addInitScript(() => localStorage.setItem('dccc_skip_tutorial', '1')); // bỏ qua hướng dẫn tân thủ (có E2E riêng)
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'), null, { timeout: 30000 });
  await p.waitForTimeout(800);
  const save = () => p.evaluate(() => JSON.parse(localStorage.getItem('dccc_save_v1')));
  // bấm ô kim cương trên thanh trên cùng → màn Nạp
  await p.mouse.click(728 + 136 + 64, 38);
  await p.waitForFunction(() => window.__game.scene.isActive('Topup'), null, { timeout: 5000 });
  await p.waitForTimeout(800);
  await p.mouse.click(520, 156 + 53); // gói 100 KC – 20.000đ
  await p.waitForTimeout(900);
  const qr = await p.evaluate(() => document.querySelector('.dccc-overlay img')?.getAttribute('src'));
  if (!qr || !qr.includes('ACB-13152551') || !qr.includes('amount=20000') || !qr.includes('DCCC000001')) errs.push('QR sai: ' + qr);
  else console.log('• Lệnh nạp DCCC000001 · 20.000đ · QR ACB 13152551');
  await p.screenshot({ path: `${out}/topup.png` });
  // chủ game duyệt (trang 🛠 Duyệt nạp)
  await p.mouse.click(1120, 118);
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${out}/topup-admin.png` });
  await p.mouse.click(1010, 214 + 29); await p.waitForTimeout(200);
  await p.mouse.click(1010, 214 + 29); await p.waitForTimeout(800);
  if (db.orders[0].status !== 'approved') errs.push('Duyệt lệnh không thành công');
  await p.mouse.click(1120, 118); // về trang nạp
  await p.waitForTimeout(800);
  const d0 = (await save()).diamonds;
  await p.mouse.click(1130, 512); // Kiểm tra & nhận
  await p.waitForTimeout(1000);
  const d1 = (await save()).diamonds;
  if (d1 !== d0 + 100) errs.push(`Nhận kim cương sai: ${d0} → ${d1}`);
  else console.log(`• Duyệt → Kiểm tra & nhận: ${d0} → ${d1} 💎`);
  await p.mouse.click(1130, 512); await p.waitForTimeout(800);
  if ((await save()).diamonds !== d1) errs.push('Nhận 1 lệnh 2 lần');
  // gói câu tự động
  await p.mouse.click(520, 156 + 2 * 118 + 53);
  await p.waitForTimeout(800);
  db.orders.find((o) => o.package === 'auto2d').status = 'approved';
  await p.mouse.click(1130, 512);
  await p.waitForTimeout(1000);
  const s2 = await save();
  if (!(s2.autoFishUntil > Date.now() + 47 * 3600_000)) errs.push('Chưa kích hoạt câu tự động 48h');
  else console.log('• Gói Câu Tự Động: còn 48 giờ');
  // câu tự động 1 con
  await p.evaluate(() => window.__game.scene.getScenes(true)[0].scene.start('Fishing', { zoneId: 'z_ben_tan_thu' }));
  await p.waitForTimeout(1200);
  const c0 = (await save()).stats.totalCaught + ((await save()).stats.junkCaught ?? 0) + (await save()).stats.escaped + (await save()).stats.snapped;
  await p.mouse.click(540, 38); // 🤖 Tự động
  let done = false;
  for (let i = 0; i < 90 && !done; i++) {
    await p.waitForTimeout(1000);
    const s = await save();
    done = s.stats.totalCaught + (s.stats.junkCaught ?? 0) + s.stats.escaped + s.stats.snapped > c0;
  }
  await p.screenshot({ path: `${out}/autofish.png` });
  if (!done) errs.push('Câu tự động không hoàn thành lượt nào sau 90 giây: ' + JSON.stringify(await p.evaluate(() => { const f = window.__game.scene.getScene('Fishing'); return { mode: f.mode, auto: f.auto, phase: f.session?.phase, active: window.__game.scene.isActive('Fishing'), until: JSON.parse(localStorage.getItem('dccc_save_v1')).autoFishUntil - Date.now() }; })));
  else console.log('• 🤖 Câu tự động hoàn thành 1 lượt');
  await b.close();
  if (errs.length) { console.error('LỖI:\n' + errs.join('\n')); process.exit(1); }
  console.log('Topup E2E OK');
})();
