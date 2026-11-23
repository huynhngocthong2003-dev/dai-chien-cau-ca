/* global performance */
/**
 * E2E Trận 3vs3 theo lượt (chơi không tài khoản → lõi trận chạy trên máy):
 * chọn 3 cá ở tab ⚔ Đấu 3vs3 → vào trận → mỗi lượt canh kim vào giữa thanh rồi bấm Space (thật, theo thời gian thực),
 * thỉnh thoảng dùng Kỹ năng / Phòng thủ → đánh đến khi có kết quả → kiểm tra kết toán
 * (thắng: vàng + cá nướng; thua: mất con lực chiến THẤP NHẤT, cá khoá không ra trận) → trận 2: bỏ cuộc = thua.
 * Chạy: node tests/e2e/combat3.cjs [url] [thư-mục-ảnh]
 */
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }
const url = process.argv[2] || 'http://localhost:5173/';
const out = process.argv[3] || 'test-results';
require('fs').mkdirSync(out, { recursive: true });
const errs = [];
(async () => {
  const b = await pw.chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => localStorage.setItem('dccc_skip_tutorial', '1')); // bỏ qua hướng dẫn tân thủ (có E2E riêng)
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'), null, { timeout: 30000 });
  await p.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('dccc_save_v1'));
    const mk = (uid, fishId, zoneId, level) => ({ uid, fishId, weightKg: 2, zoneId, caughtAt: 1, level, stars: 2, locked: uid === 'k1' });
    s.level = 12;
    s.fishes = [mk('k1', 'f_ca_thiec_bac', 'z_vuong_quoc_kim_loai', 30), mk('k2', 'f_ca_loc', 'z_ben_tan_thu', 18), mk('k3', 'f_ca_bo', 'z_bien_nhiet_doi', 18), mk('k4', 'f_ca_thiec_bac', 'z_vuong_quoc_kim_loai', 14), mk('k5', 'f_ca_ro', 'z_ben_tan_thu', 1)];
    localStorage.setItem('dccc_save_v1', JSON.stringify(s));
  });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'));
  await p.evaluate(() => window.__game.scene.getScene('Hub').scene.start('DeathMatch', { mode: 'arena' }));
  await p.waitForTimeout(900);
  const save = () => p.evaluate(() => JSON.parse(localStorage.getItem('dccc_save_v1')));
  const before = await save();
  // chọn 3 thẻ đầu (cá khoá k1 không hiện – được bảo vệ)
  for (let i = 0; i < 3; i++) { await p.mouse.click(20 + i * 136 + 64, 178 + 71); await p.waitForTimeout(200); }
  await p.screenshot({ path: `${out}/combat3-pick.png` });
  const team = await p.evaluate(() => window.__game.scene.getScene('DeathMatch').team);
  if (team.length !== 3 || team.includes('k1')) errs.push('Đội 3vs3 sai (cá khoá không được ra trận): ' + JSON.stringify(team));
  await p.mouse.click(1058, 640); // VÀO TRẬN
  await p.waitForFunction(() => window.__game.scene.isActive('Combat3'), null, { timeout: 10000 }).catch(() => errs.push('Không vào được màn trận 3vs3'));
  const sc = () => p.evaluate(() => { const c = window.__game.scene.getScene('Combat3'); return c.view ? { my: c.myTurn, busy: c.busy, winner: c.view.state.winner, turn: c.view.state.turn, cd: c.view.state.sides[0].team[c.view.state.sides[0].active].cd } : null; });
  let actions = 0;
  let shot = false;
  const kinds = {};
  const t0 = Date.now();
  while (Date.now() - t0 < 420000) {
    const st = await sc();
    if (st && st.winner !== null && st.winner !== undefined) break;
    if (!st || !st.my || st.busy) { await p.waitForTimeout(150); continue; }
    if (!shot) { await p.waitForTimeout(500); await p.screenshot({ path: `${out}/combat3-bar.png` }); }
    let kind = 'attack';
    if (actions % 5 === 2 && st.cd <= 0) kind = 'skill';
    else if (actions % 7 === 4) kind = 'defend';
    if (kind === 'defend') {
      await p.mouse.click(920, 650);
    } else {
      // tính thời gian chờ để kim vào giữa thanh (vùng xanh) rồi bấm
      const wait = await p.evaluate(() => {
        const c = window.__game.scene.getScene('Combat3');
        const now = performance.now() - c.barT0;
        const pos = (ms) => { const u = ((ms / c.bar.periodMs + c.bar.phase) % 1 + 1) % 1; return u < 0.5 ? u * 2 : 2 - u * 2; };
        for (let d = 60; d < 3000; d += 5) if (Math.abs(pos(now + d) - 0.5) < 0.03) return d;
        return 100;
      });
      await p.waitForTimeout(Math.max(0, wait - 25));
      if (kind === 'skill') await p.mouse.click(360, 650); else await p.keyboard.press('Space');
      if (!shot) { await p.waitForTimeout(150); await p.screenshot({ path: `${out}/combat3-press.png` }); shot = true; }
    }
    kinds[kind] = (kinds[kind] || 0) + 1;
    actions++;
    await p.waitForTimeout(400);
  }
  const fin = await p.evaluate(() => { const c = window.__game.scene.getScene('Combat3'); const s = c.view.state; return { winner: s.winner, turn: s.turn, log: s.log.map((e) => e.t + (e.zone ? ':' + e.zone : '')).slice(0, 400) }; });
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${out}/combat3-end.png` });
  const myZones = fin.log.filter((x) => x.startsWith('attack:'));
  const good = myZones.filter((x) => x.endsWith('green') || x.endsWith('perfect')).length;
  if (fin.winner === null) errs.push('Trận không kết thúc sau ' + actions + ' lượt');
  if (!fin.log.some((x) => x === 'ko')) errs.push('Không thấy cá nào bị hạ');
  if (!fin.log.some((x) => x === 'defend')) errs.push('Phòng thủ không hoạt động');
  if (!fin.log.some((x) => x === 'skill')) errs.push('Không dùng được kỹ năng');
  if (good < 3) errs.push('Canh lực thật không ra vùng xanh/perfect: ' + JSON.stringify(myZones.slice(0, 12)));
  console.log(`• Trận 3vs3: ${actions} lệnh của người chơi (${JSON.stringify(kinds)}), ${fin.turn} lượt, ${good} đòn xanh/perfect, ${fin.winner === 0 ? 'THẮNG' : 'THUA'}`);
  // --- kết toán: thắng nhận thưởng, thua mất con LỰC CHIẾN THẤP NHẤT trong đội
  await p.waitForTimeout(800);
  const after = await save();
  const weakest = team[team.length - 1]; // thẻ đã sắp theo lực chiến giảm dần → con chọn cuối là yếu nhất
  if (fin.winner === 0) {
    if (after.gold <= before.gold || after.roasted.length !== before.roasted.length + 1) errs.push('Thắng nhưng không nhận vàng/cá nướng');
    else console.log(`• THẮNG: +${after.gold - before.gold} vàng, nhận cá nướng`);
  } else if (after.fishes.some((f) => f.uid === weakest) || after.fishes.length !== before.fishes.length - 1) errs.push(`Thua nhưng không mất đúng con yếu nhất ${weakest}: ${after.fishes.map((f) => f.uid)}`);
  else console.log(`• THUA: mất đúng con lực chiến thấp nhất (${weakest})`);
  if (!after.fishes.some((f) => f.uid === 'k1')) errs.push('Cá khoá k1 bị mất');

  // --- trận 2: thoát giữa trận = bỏ cuộc = THUA → mất con yếu nhất
  await p.evaluate(() => window.__game.scene.getScene('Combat3').scene.start('DeathMatch', { mode: 'arena' }));
  await p.waitForTimeout(900);
  await p.evaluate(() => { const d = window.__game.scene.getScene('DeathMatch'); d.team = []; d.render(); }); // màn giữ đội cũ → bỏ chọn trước
  for (let i = 0; i < 3; i++) { await p.mouse.click(20 + i * 136 + 64, 178 + 71); await p.waitForTimeout(200); }
  const team2 = await p.evaluate(() => window.__game.scene.getScene('DeathMatch').team);
  const pre2 = await save();
  await p.screenshot({ path: `${out}/combat3-pick2.png` });
  await p.mouse.click(1058, 640);
  await p.waitForFunction(() => { const c = window.__game.scene.getScene('Combat3'); return c && c.scene.isActive() && c.view; }, null, { timeout: 10000 });
  await p.waitForTimeout(1500);
  await p.mouse.click(76, 44); // ← Thoát
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/combat3-quit.png` });
  await p.mouse.click(760, 210 + 236); // Bỏ cuộc (modal 640×300 giữa màn: y = 210)
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/combat3-forfeit.png` });
  const post2 = await save();
  const w2 = team2[team2.length - 1];
  if (post2.fishes.some((f) => f.uid === w2) || post2.fishes.length !== pre2.fishes.length - 1) errs.push(`Bỏ cuộc nhưng không mất con yếu nhất ${w2}: ${post2.fishes.map((f) => f.uid)}`);
  else console.log(`• Bỏ cuộc giữa trận → THUA, mất ${w2}`);
  await b.close();
  if (errs.length) { console.error('LỖI:\n' + errs.join('\n')); process.exit(1); }
  console.log('Combat3 E2E OK');
})();
