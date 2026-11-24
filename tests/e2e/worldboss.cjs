/**
 * E2E BOSS THẾ GIỚI (máy chủ Supabase GIẢ): sảnh có nút "Boss TG" → màn boss: bảng sát thương, máu chung →
 * VÀO ĐÁNH (đội 3 cá mạnh nhất) → canh kim bấm SPACE ra đòn (máu boss giảm) → đòn kết liễu → về bảng.
 * Chạy: node tests/e2e/worldboss.cjs <url-có-cấu-hình-https://fake.supabase.test> [thư-mục-ảnh]
 */
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }
const url = process.argv[2] || 'http://localhost:5198/';
const out = process.argv[3] || 'test-results';
require('fs').mkdirSync(out, { recursive: true });
const errs = [];
const UID = '00000000-0000-4000-8000-000000000001';
const now = () => new Date().toISOString();
const db = { hp: 50000, max: 800000, hits: 0, entered: 0, ops: [] };
const status = () => ({
  serverNow: now(),
  slot: { key: '2026-11-23-12', live: true, startsAt: new Date(Date.now() - 60000).toISOString(), endsAt: new Date(Date.now() + 1500000).toISOString() },
  boss: { id: 'wb_thanh_long', name: 'Thanh Long Long Vương', title: 'Dragon Fruit Emperor', element: 'wood', description: 'x' },
  hp: db.hp, maxHp: db.max, killer: db.hp <= 0 ? 'Cần Thủ' : null,
  top: [{ name: 'Pine Vô Địch', damage: 320000, me: false }, ...(db.hits ? [{ name: 'Cần Thủ', damage: db.hits * 20000, me: true }] : [])],
  room: [{ name: 'Cần Thủ', look: { c: 'c_be_tom' }, power: 999, me: true, at: now() }, { name: 'Pine Vô Địch', look: { c: 'c_lam_ngoc_hau', rod: 'r_huyet_ma_long' }, power: 52000, me: false, at: new Date(Date.now() - db.ops.length * 1000).toISOString() }, { name: 'Mèo Câu', look: { c: 'c_kim_ke' }, power: 31000, me: false, at: '2026-11-23T12:00:00Z' }],
  me: { damage: db.hits * 20000, rank: db.hits ? 2 : null, entries: db.entered, entriesLeft: 3 - db.entered },
  rules: { hitsPerEntry: 100000, entriesPerSlot: 3 },
});
(async () => {
  const b = await pw.chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await p.route('https://fake.supabase.test/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const json = (s, body) => route.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === '/auth/v1/user') return json(200, { id: UID, email: 'a@test' });
    if (path === '/functions/v1/world-boss') {
      const body = req.postDataJSON() ?? {};
      db.ops.push(body.op);
      if (body.op === 'status') return json(200, status());
      if (body.op === 'enter') { db.entered++; return json(200, { session: '11111111-1111-4111-8111-111111111111', hits: 0, hitsMax: 100000, bar: { periodMs: 1400, phase: 0.1 }, serverNow: now(), power: 1234, playerMaxHp: 1000, playerHp: 1000, skillPct: db.ko ? 0.5 : 0.25, skill: db.ko ? { firstMs: 3000, everyMs: 3000 } : { firstMs: 6000, everyMs: 8000 }, team: ['w2', 'w1', 'w3'].map((u, i) => ({ uid: u, fishId: 'f_ca_chep', name: 'Cá', atk: 100 + i, element: 'water', form: null, stars: 1 })) }); }
      if (body.op === 'guard') { db.guards = (db.guards ?? 0) + 1; return json(200, { verdict: { k: 0, kind: 'dodge' }, guards: { 0: 'dodge' }, playerHp: 1000, playerMaxHp: 1000 }); }
      if (body.op === 'hit') {
        db.hits++;
        const dmg = 20000;
        db.hp = Math.max(0, db.hp - dmg);
        return json(200, { zone: 'green', dmg, hp: db.hp, maxHp: db.max, killed: db.hp === 0, hits: body.n + 1, hitsMax: 100000, bar: { periodMs: 1400, phase: 0.2 }, sessionDamage: (body.n + 1) * dmg });
      }
      return json(400, { error: 'op' });
    }
    if (path === '/functions/v1/pvp') return json(200, { rooms: [] });
    if (path === '/rest/v1/player_saves') return req.method() === 'GET' ? json(200, []) : route.fulfill({ status: 201, body: '' });
    if (path.startsWith('/rest/v1/rpc/')) return json(200, path.endsWith('unread_counts') || path.endsWith('claim_topups') ? [] : null);
    if (path.startsWith('/rest/v1/')) return req.method() === 'GET' ? json(200, []) : route.fulfill({ status: 201, body: '' });
    return json(404, {});
  });
  await p.addInitScript((uid) => {
    localStorage.setItem('dccc_skip_tutorial', '1');
    localStorage.setItem('dccc_auth', JSON.stringify({ access_token: 'tok', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r', user: { id: uid, aud: 'authenticated', role: 'authenticated', email: 'a@test', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } }));
  }, UID);
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'), null, { timeout: 30000 });
  // thêm 3 con cá (tài khoản mới)
  await p.evaluate(async () => {
    const src = window.performance.getEntriesByType('resource').map((e) => e.name).find((n) => /\/src\/state\/GameState\.ts/.test(n)) ?? '/src/state/GameState.ts';
    const { GameState } = await import(src);
    const s = JSON.parse(JSON.stringify(GameState.save));
    const mk = (uid, fishId, level) => ({ uid, fishId, level, stars: 1, weightKg: 2, zoneId: 'z_ben_tan_thu', caughtAt: Date.now(), locked: uid === 'w1' });
    s.fishes = [mk('w1', 'f_boss_lao_ngu', 15), mk('w2', 'f_ca_ro', 8), mk('w3', 'f_ca_tre', 7), mk('w4', 'f_ca_ro', 3)];
    s.showcase = ['w2', 'w1', 'w3'];
    s.rods = { ...s.rods, r_huyet_ma_long: s.rods[s.selectedRodId] ?? { level: 1, stars: 1 } };
    s.selectedRodId = 'r_huyet_ma_long';
    GameState.commit(s);
    window.__game.scene.getScene('Hub').scene.restart();
  });
  await p.waitForTimeout(1500);
  const hasBtn = await p.evaluate(() => {
    const find = (list) => list.some((o) => (o.label && /Boss TG/.test(o.label.text)) || (o.list && find(o.list)));
    return find(window.__game.scene.getScene('Hub').children.list);
  });
  if (!hasBtn) errs.push('Sảnh không có nút Boss TG');
  await p.evaluate(() => window.__game.scene.getScene('Hub').scene.start('WorldBoss'));
  await p.waitForFunction(() => window.__game.scene.isActive('WorldBoss'), null, { timeout: 8000 });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/worldboss-lobby.png` });
  const st0 = await p.evaluate(() => window.__game.scene.getScene('WorldBoss').status);
  if (!st0 || st0.hp !== 50000) errs.push('Không tải được trạng thái boss: ' + JSON.stringify(st0)?.slice(0, 120));
  else console.log('• Màn Boss Thế Giới: Thanh Long Long Vương, máu chung, bảng sát thương');
  const arena = await p.evaluate(() => {
    const sc = window.__game.scene.getScene('WorldBoss'); const b = sc.bossImg;
    const names = []; const walk = (o) => { if (o.text) names.push(o.text); (o.list || []).forEach(walk); }; sc.children.list.forEach(walk);
    return { tex: sc.textures.exists('wbarena_wb_thanh_long'), flip: b?.flipX, bx: b?.x, w: b?.displayWidth, me: sc.meBody && { x: sc.meBody.parentContainer.x, w: sc.meBody.displayWidth, key: sc.meBody.texture.key }, room: sc.roomC?.list.filter((o) => o.texture && o.texture.key.startsWith('char_')).length, names };
  });
  if (!arena.tex) errs.push('Không có sảnh đấu riêng cho boss');
  else if (!arena.flip || arena.bx < 500 || !arena.me || arena.me.x > 300 || !arena.me.key.startsWith('char_')) errs.push('Bố cục sai (boss bên phải quay trái, nhân vật người chơi bên trái): ' + JSON.stringify(arena).slice(0, 300));
  else if (Math.abs(arena.w / arena.me.w - 10) > 0.25) errs.push('Boss không to gấp 10 lần nhân vật: ' + JSON.stringify(arena.me));
  else if (arena.room !== 2 || !arena.names.includes('Pine Vô Địch') || !arena.names.some((t) => t.includes('3 người trong phòng'))) errs.push('Không thấy người chơi khác trong phòng boss: ' + JSON.stringify({ room: arena.room }));
  else if (!arena.names.some((t) => /Lực chiến/.test(t))) errs.push('Không hiện lực chiến đội');
  else console.log('• Sảnh Rừng Thanh Long; boss bên phải to gấp 10 lần nhân vật; nhân vật cầm cần bên trái; thấy 2 người chơi khác trong phòng');
  const rods = await p.evaluate(() => { const sc = window.__game.scene.getScene('WorldBoss'); return { mine: sc.myRod?.rod.id, others: sc.roomC.list.filter((o) => o.rod).map((o) => o.rod.id) }; });
  if (rods.mine !== 'r_huyet_ma_long' || !rods.others.includes('r_huyet_ma_long') || !rods.others.includes('r_tre')) errs.push('Cần câu trong phòng boss không đúng cần đang dùng: ' + JSON.stringify(rods));
  else console.log('• Nhân vật cầm đúng cần câu đang dùng (' + rods.mine + '); người khác cầm cần của họ');
  // boss tung chiêu: báo tên chiêu rồi phóng vào người chơi (không lỗi)
  await p.evaluate(() => { window.__game.scene.getScene('WorldBoss').nextSkillAt = 0; });
  const banner = await p.waitForFunction(() => window.__game.scene.getScene('WorldBoss').children.list.some((o) => o.text && /⚠ .*(Thanh Long|Dây Leo)/.test(o.text)), null, { timeout: 4000 }).then(() => true).catch(() => false);
  await p.waitForTimeout(2500);
  if (!banner) errs.push('Boss không tung chiêu');
  else console.log('• Boss tung chiêu (báo tên chiêu → phóng vào người chơi)');
  // độ mượt: lấy mẫu vị trí boss mỗi khung hình trong ~6 giây (qua lần cập nhật trạng thái 4 giây) – không được nhảy cóc
  const jump = await p.evaluate(() => new Promise((res) => { const sc = window.__game.scene.getScene('WorldBoss'); sc.nextSkillAt = Date.now() + 60000; let last = null; let max = 0; let n = 0; const t0 = window.performance.now(); const tick = () => { const b = sc.bossImg; if (b) { const q = { x: b.x, y: b.y, a: b.angle }; if (last) max = Math.max(max, Math.hypot(q.x - last.x, q.y - last.y)); last = q; n++; } if (window.performance.now() - t0 < 6000) window.requestAnimationFrame(tick); else res({ max, n }); }; tick(); }));
  if (jump.max > 12) errs.push('Boss chuyển động giật (nhảy ' + jump.max.toFixed(1) + 'px giữa 2 khung hình)');
  else console.log('• Boss bơi mượt: dịch chuyển tối đa ' + jump.max.toFixed(1) + 'px/khung hình qua ' + jump.n + ' khung (kể cả lúc cập nhật)');
  // vào đánh
  await p.mouse.click(1098, 490); // VÀO ĐÁNH
  await p.waitForFunction(() => !!window.__game.scene.getScene('WorldBoss').fight, null, { timeout: 8000 }).catch(() => errs.push('Không vào được trận boss'));
  const team = await p.evaluate(() => window.__game.scene.getScene('WorldBoss').fight?.e.team.map((t) => t.uid));
  if (!team || team.length !== 3 || !team.includes('w1')) errs.push('Đội đánh boss sai (cá khoá cũng phải được đánh): ' + JSON.stringify(team));
  else console.log('• Vào đánh: đội = 3 cá trưng bày (kể cả cá khoá – không mất cá)');
  for (let i = 0; i < 3; i++) {
    await p.waitForTimeout(700);
    await p.keyboard.press('Space');
    await p.waitForTimeout(400);
  }
  await p.screenshot({ path: `${out}/worldboss-fight.png` });
  if (db.hits < 3) errs.push('Bấm Space không ra đòn: ' + db.hits);
  else console.log(`• Ra ${db.hits} đòn canh kim, máu boss còn ${db.hp}`);
  await p.waitForTimeout(2200);
  const back = await p.evaluate(() => !window.__game.scene.getScene('WorldBoss').fight);
  if (!back) errs.push('Kết liễu xong không về bảng');
  else console.log('• Đòn kết liễu → về bảng (quà gửi Hòm Thư)');
  await p.screenshot({ path: `${out}/worldboss-killed.png` });
  // chiêu boss gây sát thương: máu người chơi giảm theo lịch, hết máu → bị hạ gục, lượt đánh kết thúc
  db.hp = 500000; db.ko = true;
  await p.evaluate(() => { const sc = window.__game.scene.getScene('WorldBoss'); sc.status = null; sc.render(); });
  await p.waitForTimeout(500);
  await p.evaluate(() => window.__game.scene.getScene('WorldBoss').enter());
  await p.waitForFunction(() => !!window.__game.scene.getScene('WorldBoss').fight, null, { timeout: 8000 });
  // ghi máu ngay trong trang theo đồng hồ thật (máy test chậm không làm lệch kết quả)
  await p.evaluate(() => { const sc = window.__game.scene.getScene('WorldBoss'); window.__snap = {}; const t = window.setInterval(() => { const f = sc.fight; if (!f) return window.clearInterval(t); const el = Date.now() - f.start; if (el >= 4300 && !window.__snap.a) window.__snap.a = { hp: f.hp, guards: { ...f.guards } }; if (el >= 7300 && !window.__snap.b) window.__snap.b = f.hp; }, 10); });
  const hp0 = await p.evaluate(() => window.__game.scene.getScene('WorldBoss').fight.hp);
  // cảnh báo hiện trước chiêu đầu (chạm ở giây 1,5) → bấm B sát lúc chạm = NÉ HOÀN HẢO
  const warned = await p.waitForFunction(() => window.__game.scene.getScene('WorldBoss').children.list.some((o) => o.text && /NÉ NGAY|NÉ! \(B\)/.test(o.text)), null, { timeout: 3000 }).then(() => true).catch(() => false);
  // bấm né đúng 0,25 giây trước khi chiêu chạm (đo bằng đồng hồ thật ngay trong trang)
  const pressEl = await p.evaluate(() => new Promise((res) => { const sc = window.__game.scene.getScene('WorldBoss'); const t = window.setInterval(() => { const f = sc.fight; if (f && Date.now() - f.start >= 2650) { window.clearInterval(t); const el = Date.now() - f.start; sc.guard(); res(el); } }, 5); }));
  const bKey = await p.evaluate(() => window.__game.scene.getScene('WorldBoss').input.keyboard.listenerCount('keydown-B'));
  await p.waitForTimeout(150);
  await p.screenshot({ path: `${out}/worldboss-dodge.png` });
  await p.waitForFunction(() => window.__snap.b !== undefined, null, { timeout: 12000 }).catch(() => {});
  const mid = await p.evaluate(() => window.__snap.a);
  const mid2 = await p.evaluate(() => window.__snap.b);
  await p.screenshot({ path: `${out}/worldboss-skill-dmg.png` });
  const ko = await p.waitForFunction(() => window.__game.scene.getScene('WorldBoss').children.list.some((o) => o.text && o.text.includes('BỊ BOSS HẠ GỤC')), null, { timeout: 9000 }).then(() => true).catch(() => false);
  await p.screenshot({ path: `${out}/worldboss-ko.png` });
  await p.waitForFunction(() => !window.__game.scene.getScene('WorldBoss').fight, null, { timeout: 6000 }).catch(() => {});
  const ended = await p.evaluate(() => !window.__game.scene.getScene('WorldBoss').fight);
  if (!warned) errs.push('Không cảnh báo trước khi boss tung chiêu');
  else if (!bKey) errs.push('Chưa gắn phím B để né');
  else if (hp0 !== 1000 || !mid || mid.hp !== 1000 || mid.guards[0] !== 'dodge' || !db.guards) errs.push('Bấm B đúng lúc mà không né được chiêu: ' + JSON.stringify({ hp0, mid, guards: db.guards, pressEl }));
  else if (mid2 !== 500) errs.push('Không né thì chiêu phải trừ máu (1000 → 500): ' + JSON.stringify({ mid2 }));
  else if (!ko || !ended) errs.push('Hết máu mà không bị hạ gục / lượt đánh không kết thúc: ' + JSON.stringify({ ko, ended }));
  else console.log('• Cảnh báo "⚠ NÉ NGAY" → bấm B sát lúc chạm: NÉ HOÀN HẢO (không mất máu); chiêu sau không né: 1000 → 500 → 💀 bị hạ gục, lượt kết thúc');
  db.ko = false;
  // chưa trưng bày đủ 3 cá → không vào được phòng boss, có nút đi trưng bày
  const gate = await p.evaluate(async () => {
    const src = window.performance.getEntriesByType('resource').map((e) => e.name).find((n) => /\/src\/state\/GameState\.ts/.test(n)) ?? '/src/state/GameState.ts';
    const { GameState } = await import(src);
    const s = JSON.parse(JSON.stringify(GameState.save)); s.showcase = ['w1']; GameState.commit(s);
    const sc = window.__game.scene.getScene('WorldBoss'); sc.render();
    const texts = []; const walk = (o) => { if (o.text) texts.push(o.text); if (o.label?.text) texts.push(o.label.text + (o.disabled ? '#off' : '')); (o.list || []).forEach(walk); }; sc.children.list.forEach(walk);
    return texts;
  });
  if (!gate.some((t) => t.includes('Cá trưng bày: 1/3')) || !gate.some((t) => t.includes('Trưng bày cá'))) errs.push('Chưa trưng bày đủ 3 cá mà không yêu cầu trưng bày: ' + JSON.stringify(gate).slice(0, 300));
  else console.log('• Chưa trưng bày đủ 3 cá: hiện "Cá trưng bày 1/3" + nút 🏅 Trưng bày cá');
  await b.close();
  if (errs.length) { console.error('LỖI:\n' + errs.join('\n')); process.exit(1); }
  console.log('WORLD BOSS E2E OK');
})();
