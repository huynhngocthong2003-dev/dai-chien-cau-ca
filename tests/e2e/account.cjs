/**
 * E2E tài khoản & sao lưu.
 *  A. Sao lưu bằng mã: máy 1 tạo mã → máy 2 (trình duyệt sạch) khôi phục → tiến trình giống hệt.
 *  B. Tài khoản online với máy chủ Supabase GIẢ (chặn request trong trình duyệt):
 *     tạo tài khoản → máy khác đăng nhập nhận đúng tiến trình → sai mật khẩu báo lỗi → đăng xuất.
 * Chạy: node tests/e2e/account.cjs <url-không-cấu-hình> <url-có-cấu-hình-https://fake.supabase.test> [thư-mục-ảnh]
 *   (bản B cần dev server chạy với VITE_SUPABASE_URL=https://fake.supabase.test VITE_SUPABASE_ANON_KEY=test)
 */
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }
const urlPlain = process.argv[2] || 'http://localhost:5173/';
const urlOnline = process.argv[3];
const out = process.argv[4] || 'test-results';
require('fs').mkdirSync(out, { recursive: true });
const errs = [];
const step = (m) => console.log('• ' + m);

async function open(browser, url, setup) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('401') && !m.text().includes('400')) errs.push('console: ' + m.text()); });
  if (setup) await setup(p);
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'), null, { timeout: 30000 });
  await p.waitForTimeout(400);
  return p;
}
const save = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('dccc_save_v1')));
const toAccount = async (p) => {
  await p.mouse.click(120, 38); // bấm avatar → Hồ Sơ
  await p.waitForFunction(() => window.__game.scene.isActive('Profile'));
  await p.waitForTimeout(500);
  await p.mouse.click(530, 160); // nút Tài khoản
  await p.waitForFunction(() => window.__game.scene.isActive('Account'));
  await p.waitForTimeout(500);
};
/** Cho máy 1 chút tiến trình bằng cách câu thật một con cá (đi qua logic game). */
async function playOneFish(p) {
  await p.evaluate(() => window.__game.scene.getScene('Hub').scene.start('Fishing', { zoneId: 'z_ben_tan_thu' }));
  await p.waitForTimeout(800);
  for (let round = 0; round < 10; round++) {
    await p.mouse.move(700, 450);
    await p.mouse.down();
    await p.waitForTimeout(500);
    await p.mouse.up();
    await p.waitForFunction(() => window.__game.scene.getScene('Fishing').session?.phase === 'bite', null, { timeout: 15000 });
    await p.mouse.click(700, 450);
    const t0 = Date.now();
    let phase = 'reeling';
    while (Date.now() - t0 < 60000) {
      const st = await p.evaluate(() => { const s = window.__game.scene.getScene('Fishing').session; return s ? { phase: s.phase, t: s.tension } : null; });
      if (!st || st.phase !== 'reeling') { phase = st?.phase; break; }
      if (st.t < 45) await p.mouse.down(); else if (st.t > 70) await p.mouse.up();
      await p.keyboard.press('q');
      await p.waitForTimeout(60);
    }
    await p.mouse.up();
    await p.waitForTimeout(2200);
    // câu được rác (12%) cũng là 'caught' nhưng không có cá → câu tiếp
    if (phase === 'caught' && (await p.evaluate(() => JSON.parse(localStorage.getItem('dccc_save_v1')).fishes.length)) > 0) break;
    await p.keyboard.press('Enter');
    await p.waitForTimeout(300);
  }
  await p.evaluate(() => window.__game.scene.getScene('Fishing').scene.start('Hub'));
  await p.waitForTimeout(600);
}

(async () => {
  const browser = await pw.chromium.launch();

  // ---------------- A. Sao lưu bằng mã ----------------
  const p1 = await open(browser, urlPlain);
  await playOneFish(p1);
  const s1 = await save(p1);
  if (!s1.fishes.length) errs.push('Máy 1 chưa câu được cá');
  await toAccount(p1);
  await p1.screenshot({ path: `${out}/acc-1-profile.png` });
  await p1.mouse.click(640, 640); // Tạo mã sao lưu
  await p1.waitForSelector('#backup-out');
  const code = await p1.$eval('#backup-out', (el) => el.value);
  await p1.screenshot({ path: `${out}/acc-2-export.png` });
  step(`Máy 1: cấp ${s1.level}, ${s1.fishes.length} cá → mã sao lưu ${code.length} ký tự`);

  const p2 = await open(browser, urlPlain);
  const before2 = await save(p2);
  await toAccount(p2);
  await p2.mouse.click(1040, 640); // Khôi phục từ mã
  await p2.waitForSelector('#backup-in');
  await p2.fill('#backup-in', code.replace(/(.{80})/g, '$1\n')); // dán có xuống dòng
  await p2.mouse.click(640, 550);
  await p2.waitForTimeout(300);
  await p2.mouse.click(640, 550); // xác nhận
  await p2.waitForTimeout(800);
  const s2 = await save(p2);
  if (s2.playerId !== s1.playerId || s2.fishes.length !== s1.fishes.length || s2.gold !== s1.gold) errs.push('Khôi phục từ mã không ra đúng tiến trình');
  else step('Máy 2: khôi phục đúng tiến trình của máy 1');
  const backups = await p2.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('dccc_save_v1_backup_')).length);
  if (backups < 1) errs.push('Không cất sao lưu tiến trình cũ của máy 2');
  else step(`Máy 2: tiến trình cũ (${before2.playerId}) đã được cất sao lưu`);
  await p2.screenshot({ path: `${out}/acc-3-restored.png` });
  // mã hỏng
  await p2.mouse.click(1040, 640);
  await p2.waitForSelector('#backup-in');
  await p2.fill('#backup-in', code.slice(0, 200));
  await p2.mouse.click(640, 550);
  await p2.mouse.click(640, 550);
  await p2.waitForTimeout(500);
  if ((await save(p2)).playerId !== s1.playerId) errs.push('Mã hỏng làm thay đổi tiến trình');
  else step('Mã hỏng bị từ chối, tiến trình không đổi');
  await p1.context().close();
  await p2.context().close();

  // ---------------- B. Tài khoản online (máy chủ giả) ----------------
  if (urlOnline) {
    const db = { users: new Map(), saves: new Map() };
    const mock = async (page) => {
      await page.route('https://fake.supabase.test/**', async (route) => {
        const req = route.request();
        const u = new URL(req.url());
        const json = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
        const session = (user) => ({ access_token: 'tok_' + user.id, token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r_' + user.id, user: { id: user.id, aud: 'authenticated', role: 'authenticated', email: user.email, user_metadata: user.meta, app_metadata: {}, created_at: new Date().toISOString() } });
        if (u.pathname === '/auth/v1/signup') {
          const b = req.postDataJSON();
          if ([...db.users.values()].some((x) => x.email === b.email)) return json(422, { code: 422, error_code: 'user_already_exists', msg: 'User already registered' });
          const user = { id: `00000000-0000-4000-8000-${String(db.users.size + 1).padStart(12, '0')}`, email: b.email, pass: b.password, meta: b.data };
          db.users.set(user.id, user);
          return json(200, session(user));
        }
        if (u.pathname === '/auth/v1/token') {
          const b = req.postDataJSON();
          const user = [...db.users.values()].find((x) => x.email === b.email && x.pass === b.password);
          if (!user) return json(400, { error: 'invalid_grant', error_description: 'Invalid login credentials', error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
          return json(200, session(user));
        }
        if (u.pathname === '/auth/v1/logout') return route.fulfill({ status: 204, body: '' });
        if (u.pathname === '/rest/v1/player_saves') {
          const auth = req.headers()['authorization'] || '';
          const uid = auth.replace('Bearer tok_', '');
          if (!db.users.has(uid)) return json(401, { message: 'JWT invalid' });
          if (req.method() === 'GET') {
            const want = (u.searchParams.get('user_id') || '').replace('eq.', '');
            if (want !== uid) return json(200, []); // RLS
            const row = db.saves.get(uid);
            return json(200, row ? [{ save: row.save }] : []);
          }
          if (req.method() === 'POST') {
            const b = req.postDataJSON();
            const row = Array.isArray(b) ? b[0] : b;
            if (row.user_id !== uid) return json(403, { message: 'new row violates row-level security policy' });
            db.saves.set(uid, row);
            return route.fulfill({ status: 201, body: '' });
          }
        }
        // Hồ sơ công khai / bạn bè / PvP (đủ để game đồng bộ hồ sơ khi đăng nhập)
        if (u.pathname === '/rest/v1/player_cards') {
          const uid = (req.headers()['authorization'] || '').replace('Bearer tok_', '');
          if (req.method() === 'POST') {
            const b = req.postDataJSON();
            const row = Array.isArray(b) ? b[0] : b;
            if (row.user_id !== uid) return json(403, { message: 'RLS' });
            db.cards = db.cards || new Map();
            db.cards.set(uid, { ...row, friend_code: uid.slice(0, 8).toUpperCase() });
            return route.fulfill({ status: 201, body: '' });
          }
          const want = (u.searchParams.get('user_id') || '').replace('eq.', '');
          const c = db.cards && db.cards.get(want);
          return json(200, c ? [c] : []);
        }
        if (u.pathname === '/rest/v1/pvp_matches' || u.pathname === '/rest/v1/friendships' || u.pathname === '/rest/v1/topup_orders') return json(200, []);
        if (u.pathname === '/rest/v1/rpc/claim_topups') return json(200, []);
        if (u.pathname.startsWith('/rest/v1/rpc/')) return json(200, null);
        return json(404, { message: 'mock: không hỗ trợ ' + req.method() + ' ' + u.pathname });
      });
    };

    // Máy 3: chơi rồi tạo tài khoản
    const p3 = await open(browser, urlOnline, mock);
    await playOneFish(p3);
    const s3 = await save(p3);
    await toAccount(p3);
    await p3.fill('#acc-email', 'ca@vi.du');
    await p3.fill('#acc-pass', 'matkhau123');
    await p3.fill('#acc-name', 'Vua Câu Cá');
    await p3.mouse.click(1050, 252); // Tạo tài khoản
    await p3.waitForFunction(() => window.__game && JSON.parse(localStorage.getItem('dccc_save_v1')).name === 'Vua Câu Cá', null, { timeout: 8000 }).catch(() => errs.push('Tạo tài khoản không đổi tên'));
    await p3.waitForTimeout(1200);
    await p3.screenshot({ path: `${out}/acc-4-online.png` });
    const remote = [...db.saves.values()][0];
    if (!remote || remote.save.playerId !== s3.playerId) errs.push('Tạo tài khoản không tải tiến trình lên máy chủ');
    else step(`Tạo tài khoản: tiến trình (${remote.save.fishes.length} cá) đã lên máy chủ, RLS chấp nhận`);
    await p3.context().close();

    // Máy 4: trình duyệt sạch, sai mật khẩu rồi đăng nhập đúng
    const p4 = await open(browser, urlOnline, mock);
    await toAccount(p4);
    await p4.fill('#acc-email', 'ca@vi.du');
    await p4.fill('#acc-pass', 'saimatkhau');
    await p4.mouse.click(1050, 178);
    await p4.waitForTimeout(1200);
    const wrong = await save(p4);
    if (wrong.playerId === s3.playerId) errs.push('Sai mật khẩu mà vẫn tải được tiến trình');
    else step('Sai mật khẩu: bị từ chối');
    await p4.fill('#acc-pass', 'matkhau123');
    await p4.mouse.click(1050, 178);
    await p4.waitForFunction((id) => JSON.parse(localStorage.getItem('dccc_save_v1')).playerId === id, s3.playerId, { timeout: 8000 }).catch(() => {});
    const s4 = await save(p4);
    if (s4.playerId !== s3.playerId || s4.fishes.length !== s3.fishes.length) errs.push('Đăng nhập máy khác không nhận đúng tiến trình');
    else step('Máy 4 đăng nhập: nhận đúng tiến trình từ tài khoản');
    await p4.waitForTimeout(800);
    await p4.screenshot({ path: `${out}/acc-5-login.png` });
    // tải lại trang vẫn đăng nhập
    await p4.reload();
    await p4.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'), null, { timeout: 20000 });
    await toAccount(p4);
    await p4.mouse.click(860, 370); // Đăng xuất
    await p4.waitForTimeout(800);
    await p4.screenshot({ path: `${out}/acc-6-logout.png` });
    step('Tải lại trang giữ đăng nhập, đăng xuất được');
  }

  await browser.close();
  if (errs.length) { console.error('LỖI:\n' + errs.join('\n')); process.exit(1); }
  console.log('Account E2E OK');
})();
