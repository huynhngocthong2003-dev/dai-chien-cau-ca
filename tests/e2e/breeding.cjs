/**
 * E2E Đảo Lai Tạo (chơi không tài khoản): bể nuôi có cá Boss → tab Lai Tạo chọn cặp đặc biệt →
 * LAI TẠO → hang ấp có trứng → Tăng tốc (kim cương) → ẤP NỞ (hiệu ứng) → Thả vào bể → cá mới trong túi;
 * lai cặp theo HỆ; thu hoạch vàng khi đủ chu kỳ.
 * Chạy: node tests/e2e/breeding.cjs [url] [thư-mục-ảnh]
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
    const mk = (uid, fishId, level, zoneId = 'z_ben_tan_thu') => ({ uid, fishId, weightKg: 500, zoneId, caughtAt: 1, level, stars: 1, locked: false, gender: uid === 'lao' ? 'm' : 'f' });
    s.level = 40; s.diamonds = 200; s.gold = 10000;
    s.fishes = [mk('lao', 'f_boss_lao_ngu', 30), mk('bao', 'f_boss_bao_chua_san_ho', 30, 'z_bien_nhiet_doi'), mk('hac', 'f_boss_hac_long', 28, 'z_vuc_sau'), mk('ro', 'f_ca_ro', 5)];
    delete s.breeding;
    localStorage.setItem('dccc_save_v1', JSON.stringify(s));
  });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'));
  await p.screenshot({ path: `${out}/breed-hub.png` });
  const save = () => p.evaluate(() => JSON.parse(localStorage.getItem('dccc_save_v1')));
  const scene = (fn) => p.evaluate(fn);
  await scene(() => window.__game.scene.getScene('Hub').scene.start('Breeding'));
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/breed-map.png` });
  const swim = await scene(() => window.__game.scene.getScene('Breeding').swimmers.map((s) => s.uid));
  if (swim.length !== 3 || swim.includes('ro')) errs.push('Bể nuôi phải có đúng 3 cá Boss (không có cá thường): ' + JSON.stringify(swim));
  const s0 = await save();
  if (!s0.breeding || Object.keys(s0.breeding.harvestAt).length !== 3) errs.push('Cá Boss vào bể chưa được bắt đầu chu kỳ thu hoạch');

  // --- tab Lai Tạo: cặp đặc biệt được chọn sẵn → LAI TẠO
  await p.mouse.click(410, 116);
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${out}/breed-page.png` });
  const pick = await scene(() => window.__game.scene.getScene('Breeding').pick);
  if (JSON.stringify(pick.slice().sort()) !== JSON.stringify(['bao', 'lao'])) errs.push('Chưa chọn sẵn cặp đặc biệt: ' + JSON.stringify(pick));
  await p.mouse.click(1058, 650); // LAI TẠO
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${out}/breed-hatch.png` });
  let s1 = await save();
  const egg = s1.breeding.slots[0].egg;
  if (!egg || egg.recipeId !== 'thiet_san_ho' || egg.end - egg.start !== 30 * 60000) errs.push('Trứng chưa vào ổ 1 đúng công thức: ' + JSON.stringify(s1.breeding.slots));
  if (s1.fishes.length !== 4) errs.push('Lai tạo làm mất cá bố mẹ');
  // --- tăng tốc bằng kim cương rồi ấp nở
  await p.mouse.click(130 + 30 + 155, 100 + 76 + 350); // nút Tăng tốc ổ 1 (modal 1020×520 tại 130,100)
  await p.waitForTimeout(900);
  s1 = await save();
  if (s1.diamonds !== 190) errs.push(`Tăng tốc phải trừ 10 kim cương (còn 29–30 phút): còn ${s1.diamonds}`);
  await p.mouse.click(130 + 30 + 155, 100 + 76 + 350); // ẤP NỞ
  await p.waitForTimeout(3600);
  await p.screenshot({ path: `${out}/breed-reveal.png` });
  const s2 = await save();
  const born = s2.fishes.find((f) => f.uid === 'b' + egg.id);
  if (!egg.colors || egg.colors.a === egg.colors.b) errs.push('Trứng chưa lấy màu theo cá bố/mẹ: ' + JSON.stringify(egg.colors));
  if (!born || !born.fishId.startsWith('f_lai_')) errs.push('Ấp nở không ra cá lai: ' + JSON.stringify(s2.fishes.map((f) => f.fishId)));
  else if (!born.elements || born.elements.length !== 2) errs.push('Cá lai phải mang 2 hệ bố mẹ: ' + JSON.stringify(born));
  else console.log(`• Cá lai mang 2 hệ ${born.elements.join('+')}${born.hiddenElement ? ' + ẩn ' + born.hiddenElement : ''}`);
  if (born) console.log(`• Lai Lão Ngư + Bạo Chúa → trứng 30 phút → tăng tốc −10💎 → nở: ${born.fishId}`);
  await p.mouse.click(640, 676); // Thả vào Bể Nuôi
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/breed-after.png` });
  const swim2 = await scene(() => window.__game.scene.getScene('Breeding').swimmers.length);
  if (swim2 !== 4) errs.push('Cá mới chưa bơi vào bể: ' + swim2);

  // --- cặp không có công thức riêng: lai theo HỆ (Lão Ngư Thổ + Hắc Long Bóng Tối)
  await scene(() => { const sc = window.__game.scene.getScene('Breeding'); sc.pick = ['lao', 'hac']; sc.setMode('breed'); });
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/breed-element.png` });
  await p.mouse.click(1058, 650);
  await p.waitForTimeout(600);
  const s3 = await save();
  if (s3.breeding.slots[0].egg?.recipeId !== 'el_earth_dark') errs.push('Lai theo hệ sai: ' + JSON.stringify(s3.breeding.slots[0].egg));
  else console.log('• Cặp không có công thức riêng → dòng lai theo hệ el_earth_dark (40 phút)');

  // --- thu hoạch: tua chu kỳ rồi bấm "Thu hoạch tất cả"
  await scene(() => { const gs = window.__game.scene.getScene('Breeding'); gs.hatchModal?.close(); });
  await p.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('dccc_save_v1'));
    for (const k of Object.keys(s.breeding.harvestAt)) s.breeding.harvestAt[k] = Date.now() - 1;
    localStorage.setItem('dccc_save_v1', JSON.stringify(s));
  });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__ready && window.__game.scene.isActive('Hub'));
  await scene(() => window.__game.scene.getScene('Hub').scene.start('Breeding'));
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${out}/breed-coins.png` });
  const g0 = (await save()).gold;
  await p.mouse.click(1150, 676);
  await p.waitForTimeout(500);
  const g1 = (await save()).gold;
  if (g1 - g0 < 3 * 40) errs.push(`Thu hoạch sai: +${g1 - g0}`);
  else console.log(`• Thu hoạch bể nuôi: +${g1 - g0} vàng`);

  await b.close();
  if (errs.length) { console.error('LỖI:\n' + errs.join('\n')); process.exit(1); }
  console.log('Breeding E2E OK');
})();
