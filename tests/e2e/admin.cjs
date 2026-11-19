/**
 * E2E trang duyệt nạp admin.html (máy chủ Supabase GIẢ): quản trị viên thấy lệnh chờ, duyệt → lệnh chuyển sang Đã duyệt;
 * tài khoản thường bị báo không có quyền.
 * Chạy: node tests/e2e/admin.cjs <url-gốc-có-cấu-hình-https://fake.supabase.test> [thư-mục-ảnh]
 */
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }
const base = (process.argv[2] || 'http://localhost:5198/').replace(/\/?$/, '/');
const out = process.argv[3] || 'test-results';
require('fs').mkdirSync(out, { recursive: true });
const errs = [];
const UID = '00000000-0000-4000-8000-0000000000aa';
(async () => {
  const b = await pw.chromium.launch();
  for (const admin of [true, false]) {
    const db = [{ id: 'aaaaaaaa-0000-4000-8000-000000000001', user_id: 'u1', player_name: 'pine', package: 'kc300', amount_vnd: 50000, code: 'DCCC1A2B3C', status: 'pending', created_at: new Date().toISOString() }];
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    p.on('dialog', (d) => d.accept());
    await p.route('https://fake.supabase.test/**', async (route) => {
      const req = route.request();
      const path = new URL(req.url()).pathname;
      const json = (s, body) => route.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(body) });
      if (path === '/rest/v1/rpc/is_admin') return json(200, admin);
      if (path === '/rest/v1/rpc/admin_list_topups') return admin ? json(200, db.filter((o) => o.status === req.postDataJSON().p_status)) : json(400, { message: 'Chỉ quản trị viên' });
      if (path === '/rest/v1/rpc/admin_decide_topup') { const x = req.postDataJSON(); db.find((o) => o.id === x.p_id).status = x.p_approve ? 'approved' : 'rejected'; return route.fulfill({ status: 204, body: '' }); }
      if (path === '/auth/v1/user') return json(200, { id: UID, email: 'admin@test' });
      return json(404, {});
    });
    await p.addInitScript((uid) => localStorage.setItem('dccc_auth', JSON.stringify({ access_token: 'tok', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r', user: { id: uid, aud: 'authenticated', role: 'authenticated', email: 'admin@test', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } })), UID);
    await p.goto(base + 'admin.html', { waitUntil: 'networkidle' });
    await p.waitForTimeout(800);
    if (admin) {
      if (!(await p.locator('text=DCCC1A2B3C').count())) errs.push('Không thấy lệnh chờ duyệt');
      await p.screenshot({ path: `${out}/admin-page.png` });
      await p.getByRole('button', { name: '✅ Duyệt', exact: true }).click();
      await p.waitForTimeout(800);
      if (db[0].status !== 'approved') errs.push('Duyệt không thành công');
      else console.log('• Quản trị viên duyệt lệnh DCCC1A2B3C (50.000đ · 300 KC)');
      if (!(await p.locator('text=50.000đ').count())) errs.push('Thiếu thống kê doanh thu');
    } else {
      if (!(await p.locator('text=chưa có quyền quản trị').count())) errs.push('Tài khoản thường không bị chặn');
      else console.log('• Tài khoản thường: báo không có quyền');
    }
    await p.close();
  }
  await b.close();
  if (errs.length) { console.error('LỖI:\n' + errs.join('\n')); process.exit(1); }
  console.log('Admin E2E OK');
})();
