/**
 * E2E trang duyệt nạp admin.html (máy chủ Supabase GIẢ): quản trị viên thấy lệnh chờ, duyệt → lệnh chuyển sang Đã duyệt;
 * tab 👥 Tài khoản: thống kê, tìm kiếm, xem chi tiết bản lưu/sao lưu/nạp; tài khoản thường bị báo không có quyền.
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
      if (path === '/rest/v1/rpc/admin_list_users') {
        if (!admin) return json(400, { message: 'Chỉ quản trị viên' });
        const q = (req.postDataJSON().p_query || '').toLowerCase();
        const now = new Date().toISOString();
        const users = [
          { user_id: 'u1', email: 'pine@test.vn', created_at: now, last_sign_in_at: now, confirmed: true, display_name: 'pine', friend_code: 'AB12CD34', level: 14, gold: 30000, diamonds: 800, total_caught: 663, fishes: 21, save_updated_at: now, last_seen: now, topup_vnd: 50000, backups: 12, is_admin: true },
          { user_id: 'u2', email: 'newbie@test.vn', created_at: now, last_sign_in_at: null, confirmed: false, display_name: null, friend_code: null, level: null, gold: 0, diamonds: 0, total_caught: 0, fishes: 0, save_updated_at: null, last_seen: null, topup_vnd: 0, backups: 0, is_admin: false },
        ];
        return json(200, users.filter((u) => !q || (u.email + (u.display_name || '')).toLowerCase().includes(q)));
      }
      if (path === '/rest/v1/rpc/admin_user_detail') return json(200, { save: { playerId: 'p_x', name: 'pine', level: 14, gold: 30000, diamonds: 800, stats: { totalCaught: 663, bossesCaught: 9, dmWins: 30, races: 5, raceWins: 2 }, fishes: [], roasted: [], characters: { c_be_tom: {} }, rods: { r_tre: {} } },
        backups: [{ id: 1, created_at: new Date().toISOString(), level: 13, reason: 'auto', name: 'pine', caught: '650', player_id: 'p_x' }], topups: [{ code: 'DCCC1A2B3C', package: 'kc300', amount_vnd: 50000, status: 'claimed', created_at: new Date().toISOString() }] });
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
      // 👥 Tài khoản
      await p.click('#navUsers');
      await p.waitForTimeout(800);
      if ((await p.locator('#ulist tr.user').count()) !== 2) errs.push('Không liệt kê đủ tài khoản');
      else console.log('• Tab Tài khoản: liệt kê 2 tài khoản đăng ký');
      if (!(await p.locator('text=chưa xác nhận').count()) || !(await p.locator('#ustats >> text=Tổng tài khoản').count())) errs.push('Thiếu trạng thái/ thống kê tài khoản');
      await p.fill('#uq', 'pine');
      await p.press('#uq', 'Enter');
      await p.waitForTimeout(600);
      if ((await p.locator('#ulist tr.user').count()) !== 1) errs.push('Tìm kiếm tài khoản sai');
      else console.log('• Tìm "pine": 1 kết quả');
      await p.locator('#ulist tr.user').first().click();
      await p.waitForTimeout(600);
      await p.screenshot({ path: `${out}/admin-user-detail.png`, fullPage: true });
      if (!(await p.locator('#udetail >> text=663').count()) || !(await p.locator('#udetail >> text=Bản sao lưu gần đây (1)').count())) errs.push('Chi tiết tài khoản thiếu dữ liệu');
      else console.log('• Chi tiết: tiến trình, sao lưu, lịch sử nạp');
      await p.click('#udClose');
    } else {
      if (!(await p.locator('text=chưa có quyền quản trị').count())) errs.push('Tài khoản thường không bị chặn');
      if (await p.locator('#navUsers').isVisible()) errs.push('Tài khoản thường thấy tab Tài khoản');
      else console.log('• Tài khoản thường: báo không có quyền');
    }
    await p.close();
  }
  await b.close();
  if (errs.length) { console.error('LỖI:\n' + errs.join('\n')); process.exit(1); }
  console.log('Admin E2E OK');
})();
