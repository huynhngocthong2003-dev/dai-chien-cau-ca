/**
 * E2E Giai đoạn 3–5 (không cần máy chủ): điểm danh, nhiệm vụ ngày, Vòng Quay, danh hiệu "Kẻ Săn Lùng Rác",
 * Xếp Hạng / Hội hiện yêu cầu đăng nhập khi chơi không tài khoản.
 * Chạy: node tests/e2e/meta.cjs [thư-mục-ảnh] [url]
 */
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }
const out = process.argv[2] || 'test-results';
const url = process.argv[3] || 'http://localhost:5173/';
require('fs').mkdirSync(out, { recursive: true });
const errs = [];
(async () => {
  const b = await pw.chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'));
  await p.waitForTimeout(500);
  const save = () => p.evaluate(() => JSON.parse(localStorage.getItem('dccc_save_v1')));
  const start = (key, data) => p.evaluate(([k, d]) => window.__game.scene.getScenes(true)[0].scene.start(k, d), [key, data]);

  // Nhiệm vụ: nút ở sảnh mở được (không còn khóa)
  await p.mouse.click(914 + 2 * 136, 160 + 2 * 140); // Nhiệm Vụ
  await p.waitForFunction(() => window.__game.scene.isActive('Quests'), null, { timeout: 5000 });
  await p.waitForTimeout(500);
  // Điểm danh
  await p.mouse.click(130 + 230, 118);
  await p.waitForTimeout(400);
  const s0 = await save();
  await p.mouse.click(640, 620);
  await p.waitForTimeout(500);
  const s1 = await save();
  if (s1.checkin.streak !== 1 || s1.gold !== s0.gold + 500) errs.push(`Điểm danh sai: ${JSON.stringify(s1.checkin)} vàng ${s0.gold}→${s1.gold}`);
  else console.log('• Điểm danh ngày 1: +500 vàng');
  await p.mouse.click(640, 620); // lần 2: không nhận thêm
  await p.waitForTimeout(300);
  if ((await save()).checkin.total !== 1) errs.push('Điểm danh 2 lần trong ngày');
  await p.screenshot({ path: `${out}/checkin.png` });

  // Vòng Quay: lượt miễn phí rồi trả kim cương
  await start('Wheel');
  await p.waitForTimeout(700);
  const d0 = (await save()).diamonds;
  await p.mouse.click(1040, 500);
  await p.waitForTimeout(4800);
  await p.mouse.click(640, 620); // đóng màn Độc Đắc nếu có
  await p.waitForTimeout(300);
  const w1 = await save();
  if ((w1.stats.spins ?? 0) !== 1 || !w1.daily.freeSpinUsed) errs.push('Quay miễn phí không ghi nhận');
  else console.log(`• Quay miễn phí: ${w1.ledger.filter((l) => l.reason.startsWith('wheel:')).map((l) => l.reason).join(', ')}`);
  await p.screenshot({ path: `${out}/wheel.png` });
  await p.mouse.click(1040, 500);
  await p.waitForTimeout(4800);
  await p.mouse.click(640, 620);
  await p.waitForTimeout(300);
  const w2 = await save();
  // kim cương trúng trong đúng lượt quay thứ 2 (cùng mã giao dịch với dòng trừ 30 💎)
  const paid = w2.ledger.filter((l) => l.reason === 'wheel:spin').slice(-1)[0];
  const won = paid ? w2.ledger.filter((l) => l.txId === paid.txId && l.currency === 'diamonds' && l.amount > 0).reduce((a, l) => a + l.amount, 0) : 0;
  const exp = w1.diamonds - 30 + won;
  if ((w2.stats.spins ?? 0) !== 2 || w2.diamonds !== exp) errs.push(`Quay lần 2 trừ kim cương sai: ${w1.diamonds} → ${w2.diamonds}`);
  else console.log(`• Quay lần 2: −30 💎 (${d0} → ${w2.diamonds})`);

  // Quay x10: −270 💎, 10 món, bảng kết quả
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('dccc_save_v1')); s.diamonds = 1000; s.updatedAt = Date.now(); localStorage.setItem('dccc_save_v1', JSON.stringify(s)); });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'));
  await start('Wheel');
  await p.waitForTimeout(700);
  const x0 = await save();
  await p.mouse.click(1040, 588);
  await p.waitForTimeout(3600);
  await p.screenshot({ path: `${out}/wheel-x10.png` });
  const x1 = await save();
  const paid10 = x1.ledger.filter((l) => l.reason === 'wheel:spin10').slice(-1)[0];
  const wonKc = paid10 ? x1.ledger.filter((l) => l.txId === paid10.txId && l.currency === 'diamonds' && l.amount > 0).reduce((a, l) => a + l.amount, 0) : 0;
  if ((x1.stats.spins ?? 0) !== (x0.stats.spins ?? 0) + 10 || x1.diamonds !== x0.diamonds - 270 + wonKc) errs.push(`Quay x10 sai: ${x0.diamonds} → ${x1.diamonds}, spins ${x1.stats.spins}`);
  else console.log(`• Quay x10: −270 💎, +10 lượt quay`);
  await p.mouse.click(640, 620); // NHẬN THƯỞNG (màn Độc Đắc nếu có)
  await p.waitForTimeout(500);
  await p.mouse.click(640, 100 + 520 - 44); // Nhận
  await p.waitForTimeout(300);

  // Nhiệm vụ "Quay Vòng Quay 1 lần" hoàn thành → nhận thưởng
  await start('Quests', { tab: 'daily' });
  await p.waitForTimeout(700);
  const qi = 6; // q_quay_1
  const g0 = (await save()).gold;
  await p.mouse.click(1120, 206 + qi * 70 + 32);
  await p.waitForTimeout(500);
  const q1 = await save();
  if (!q1.daily.claimed.includes('q_quay_1') || q1.gold !== g0 + 300) errs.push('Nhận nhiệm vụ quay vòng quay sai');
  else console.log('• Nhiệm vụ "Quay Vòng Quay 1 lần": +300 vàng');
  await p.screenshot({ path: `${out}/quests.png` });

  // Danh hiệu: vớt đủ 20 rác → nhận "Kẻ Săn Lùng Rác", tự đeo, hiện trên thanh trên cùng
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('dccc_save_v1')); s.stats.junkCaught = 20; localStorage.setItem('dccc_save_v1', JSON.stringify(s)); });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'));
  await start('Quests', { tab: 'titles' });
  await p.waitForTimeout(700);
  const t0 = await save();
  await p.mouse.click(1120, 214 + 32); // danh hiệu nhận được xếp đầu
  await p.waitForTimeout(600);
  const t1 = await save();
  if (!t1.titles.owned.includes('t_san_rac') || t1.titles.equipped !== 't_san_rac' || t1.diamonds !== t0.diamonds + 10) errs.push(`Danh hiệu sai: ${JSON.stringify(t1.titles)}`);
  else console.log('• Danh hiệu "🗑️ Kẻ Săn Lùng Rác" (+10 💎), đang đeo');
  await p.screenshot({ path: `${out}/titles.png` });

  // Xếp Hạng / Hội khi chưa đăng nhập: báo cần đăng nhập, không lỗi
  for (const k of ['Ranking', 'Guild']) {
    await start(k);
    await p.waitForTimeout(700);
    const ok = await p.evaluate((k) => window.__game.scene.getScene(k).children.list.some((o) => o.list?.some?.((t) => typeof t.text === 'string' && t.text.includes('Đăng nhập'))), k);
    if (!ok) errs.push(`${k}: thiếu hướng dẫn đăng nhập`);
    await p.screenshot({ path: `${out}/${k.toLowerCase()}.png` });
  }
  console.log('• Xếp Hạng & Hội: yêu cầu đăng nhập khi chơi không tài khoản');
  await b.close();
  if (errs.length) { console.error('LỖI:\n' + errs.join('\n')); process.exit(1); }
  console.log('Meta E2E OK');
})();
