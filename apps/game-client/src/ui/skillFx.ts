import Phaser from "phaser";
import type { ActiveEffect } from "@dccc/shared";
import { txt } from "./widgets.ts";
import { pickLine, skillPool } from "./quotes.ts";

/** Câu thoại "bựa" vui nhộn khi tung kỹ năng – mỗi nhân vật vài câu, chọn ngẫu nhiên. */
export const SKILL_QUOTES: Record<string, string[]> = {
  c_be_tom: ["Cá ơi về với anh đi!", "Mẹ ơi con câu được cá TO!", "Giật cần như giật lì xì!", "Hôm nay câu cá, mai làm đại gia!"],
  c_ong_lao: ["Ông câu cá từ hồi mày chưa đẻ!", "Bình tĩnh… thả dây… rồi KÉO!", "Sáu mươi năm kinh nghiệm, trốn đi đâu?"],
  c_co_lai_do: ["Lên thuyền đi, chị chở về nồi lẩu!", "Gió thuận buồm xuôi, cá về tay tui!", "Chèo nhẹ thôi… mà kéo thì MẠNH!"],
  c_hai_tac: ["Arrr! Kho báu hôm nay là… CÁ!", "Râu đỏ ra tay, cá nằm ngay!", "Móc sắt này không phải để trang trí!"],
  c_ninja: ["Nhẫn thuật: Cá Không Thấy Đường Về!", "Phân thân! Một con cá, hai cái cần!", "Ninja không bao giờ câu trượt… thường thôi."],
  c_tien_ca: ["La la la~ ngủ ngoan nha cá…", "Nghe chị hát rồi lên bờ nè cưng!", "Giọng ca vàng làng câu cá đây!"],
  c_tho_lan: ["Dây thép! Cắn gãy răng luôn!", "Khỏi câu, lặn xuống bắt cho nhanh!", "Cơ bắp này là đồ thật nha!"],
  c_long_vuong_tu: ["Ta là hoàng tử Long Cung! Quỳ xuống!", "Vuốt rồng đây, né đường nào?", "Cha ta là Long Vương đó nha!"],
  c_phu_thuy_bang: ["Lạnh chưa cưng? Lạnh thì lên bờ!", "Biến cá thành… cá viên đông lạnh!", "Đóng băng! Đứng im cho chị câu!"],
  c_hoa_than: ["Nướng tại chỗ, khỏi mang về!", "Cơ bắp này không phải để làm cảnh!", "Lửa lên! Cá chín tới!"],
  c_hai_vuong: ["Đại dương là nhà ta, con chạy đi đâu?", "Sóng thần mini tặng cá vé lên bờ!", "Hải Vương đã ra tay, cả biển im lặng!"],
  c_than_sam: ["ĐOÀNG! Sét trúng tim cá rồi!", "Tia chớp lấp lánh, cá lên đĩa nhanh!", "Sấm sét tình yêu dành cho cá!"],
  c_kim_ke: ["Ò Ó O! Dậy đi cá, lên bờ ăn sáng!", "Gà gáy mặt trời mọc, cá nằm ta thắng!", "Gà Thần không đùa đâu nha!"],
  c_lam_ngoc_hau: ["Bảy mươi hai phép biến hóa – phép nào cũng câu được cá!", "Khỉ này không phải dạng vừa đâu!", "Một trăm con khỉ cùng kéo, cá chạy đằng trời!"],
};
const GENERIC = ["Xem chiêu này!", "Kéo mạnh lên nào!", "Hôm nay ta là vua câu cá!"];

/** Chữ tượng thanh kiểu truyện tranh theo loại kỹ năng. */
const BOOM: Record<string, string[]> = {
  damage_pct: ["BÙM!", "RẦM!", "CHÁT!"],
  stun: ["ĐOÀNG!", "CHOÁNG!", "BỐP!"],
  freeze: ["ĐÓNG BĂNG!", "RẮC RẮC!"],
  burn: ["CHÁY!", "PHỪNG!"],
  calm: ["♪ RU NGỦ ♪", "ZZZ…"],
  reel_boost: ["VÚT!", "TĂNG TỐC!"],
  double_damage: ["X2!", "COMBO!"],
  distance_pull: ["SÓNG THẦN!", "VÈO!"],
  tension_reduce: ["XOẸT!", "NHẢ DÂY!"],
  durability_restore: ["HỒI DÂY!", "KENG!"],
};

export function pickQuote(charId: string): string {
  const list = SKILL_QUOTES[charId] ?? GENERIC;
  return list[Math.floor(Math.random() * list.length)]!;
}

interface FxOpts {
  heroX: number;
  heroY: number;
  fishX: number;
  fishY: number;
  color: number;
  charId: string;
  effects: ActiveEffect[];
}

/** Bong bóng thoại cạnh nhân vật. */
export function speechBubble(scene: Phaser.Scene, x: number, y: number, text: string) {
  const t = txt(scene, 0, 0, text, 22, { color: "#1b1530", stroke: 0, shadow: false, wrap: 300, align: "center" }).setOrigin(0.5);
  const w = Math.min(330, t.width + 30);
  const h = t.height + 22;
  const g = scene.add.graphics();
  g.fillStyle(0xffffff, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 18);
  g.lineStyle(4, 0x1b1530).strokeRoundedRect(-w / 2, -h / 2, w, h, 18);
  g.fillStyle(0xffffff, 1).fillTriangle(-w / 2 + 30, h / 2 - 2, -w / 2 + 56, h / 2 - 2, -w / 2 + 18, h / 2 + 22);
  g.lineStyle(4, 0x1b1530).lineBetween(-w / 2 + 30, h / 2 - 1, -w / 2 + 18, h / 2 + 22).lineBetween(-w / 2 + 18, h / 2 + 22, -w / 2 + 56, h / 2 - 1);
  const c = scene.add.container(x + w / 2 - 30, y - h / 2 - 20, [g, t]).setDepth(90).setScale(0.2);
  scene.tweens.add({ targets: c, scale: 1, duration: 280, ease: "Back.easeOut" });
  scene.tweens.add({ targets: c, y: c.y - 6, duration: 300, yoyo: true, repeat: 3, delay: 280 });
  scene.tweens.add({ targets: c, alpha: 0, delay: 2200, duration: 300, onComplete: () => c.destroy() });
}

function shockwaves(scene: Phaser.Scene, x: number, y: number, color: number, n = 3) {
  for (let i = 0; i < n; i++) {
    const r = scene.add.circle(x, y, 20).setStrokeStyle(8 - i * 2, i === 0 ? 0xffffff : color, 1).setDepth(85);
    scene.tweens.add({ targets: r, scale: 9 + i * 3, alpha: 0, duration: 650 + i * 150, delay: i * 90, ease: "Cubic.easeOut", onComplete: () => r.destroy() });
  }
}

function speedLines(scene: Phaser.Scene, color: number) {
  const g = scene.add.graphics().setDepth(84).setBlendMode(Phaser.BlendModes.ADD);
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2 + Math.random() * 0.1;
    const r0 = 260 + Math.random() * 120;
    const r1 = r0 + 260 + Math.random() * 200;
    g.lineStyle(2 + Math.random() * 4, i % 3 ? 0xffffff : color, 0.55);
    g.lineBetween(640 + Math.cos(a) * r0, 360 + Math.sin(a) * r0, 640 + Math.cos(a) * r1, 360 + Math.sin(a) * r1);
  }
  scene.tweens.add({ targets: g, alpha: 0, duration: 500, onComplete: () => g.destroy() });
}

function lightning(scene: Phaser.Scene, x: number, y: number, color: number) {
  const g = scene.add.graphics().setDepth(86).setBlendMode(Phaser.BlendModes.ADD);
  for (const [w, c] of [[12, color], [5, 0xffffff]] as const) {
    g.lineStyle(w, c, 1);
    g.beginPath();
    let px = x + Phaser.Math.Between(-60, 60);
    let py = -10;
    g.moveTo(px, py);
    while (py < y) {
      px += Phaser.Math.Between(-40, 40);
      py += Phaser.Math.Between(40, 70);
      g.lineTo(px, Math.min(py, y));
    }
    g.strokePath();
  }
  scene.tweens.add({ targets: g, alpha: 0, duration: 380, onComplete: () => g.destroy() });
}

function burst(scene: Phaser.Scene, x: number, y: number, tex: string, tint: number[], n = 50, speed = 520) {
  scene.add
    .particles(x, y, tex, {
      speed: { min: speed * 0.3, max: speed },
      lifespan: 900,
      scale: { start: 1.6, end: 0 },
      rotate: { min: 0, max: 360 },
      tint,
      quantity: n,
      stopAfter: n,
      blendMode: Phaser.BlendModes.ADD,
    })
    .setDepth(87);
}

function comicWord(scene: Phaser.Scene, x: number, y: number, word: string, color: string) {
  const t = txt(scene, x, y, word, 64, { color, stroke: 12 }).setOrigin(0.5).setDepth(92).setScale(3).setAngle(Phaser.Math.Between(-14, 14));
  scene.tweens.add({ targets: t, scale: 1, duration: 260, ease: "Back.easeOut" });
  scene.tweens.add({ targets: t, alpha: 0, y: y - 60, delay: 900, duration: 400, onComplete: () => t.destroy() });
}

function stunStars(scene: Phaser.Scene, x: number, y: number) {
  const stars = [0, 1, 2, 3].map(() => txt(scene, x, y, "★", 34, { color: "#ffeb3b" }).setOrigin(0.5).setDepth(88));
  let t = 0;
  const ev = scene.time.addEvent({
    delay: 16,
    repeat: 140,
    callback: () => {
      t += 0.09;
      stars.forEach((s, i) => s.setPosition(x + Math.cos(t + (i * Math.PI) / 2) * 60, y - 60 + Math.sin(t + (i * Math.PI) / 2) * 16));
    },
  });
  scene.time.delayedCall(2300, () => {
    ev.remove();
    stars.forEach((s) => s.destroy());
  });
}

/** Hiệu ứng bùng nổ khi tung kỹ năng: thoại vui + rung + sóng xung kích + hạt + chữ tượng thanh. */
export function playSkillFx(scene: Phaser.Scene, o: FxOpts) {
  const cam = scene.cameras.main;
  // ~50% câu riêng của nhân vật, còn lại dùng bộ thoại theo nhóm kỹ năng
  const line = Math.random() < 0.5 ? pickQuote(o.charId) : (pickLine(skillPool(o.effects)) ?? pickQuote(o.charId));
  speechBubble(scene, o.heroX + 40, o.heroY - 150, line);
  cam.shake(380, 0.014);
  cam.zoomTo(1.07, 110, "Sine.easeOut", true, (_c: Phaser.Cameras.Scene2D.Camera, p: number) => {
    if (p === 1) cam.zoomTo(1, 260, "Sine.easeIn", true);
  });
  speedLines(scene, o.color);
  shockwaves(scene, o.heroX, o.heroY - 60, o.color, 2);
  shockwaves(scene, o.fishX, o.fishY, o.color, 3);
  burst(scene, o.fishX, o.fishY, "p_spark", [o.color, 0xffffff, 0xffeb3b], 60);
  burst(scene, o.heroX, o.heroY - 60, "p_ember", [o.color, 0xffffff], 30, 320);
  const kinds = new Set(o.effects.map((e) => e.kind));
  const main = o.effects[0]?.kind ?? "damage_pct";
  const words = BOOM[main] ?? BOOM.damage_pct!;
  comicWord(scene, o.fishX + Phaser.Math.Between(-30, 30), o.fishY - 110, words[Math.floor(Math.random() * words.length)]!, "#ffeb3b");
  if (kinds.has("damage_pct") || kinds.has("stun") || kinds.has("double_damage")) {
    lightning(scene, o.fishX, o.fishY, o.color);
    scene.time.delayedCall(120, () => lightning(scene, o.fishX + 20, o.fishY, 0xffffff));
  }
  if (kinds.has("stun")) stunStars(scene, o.fishX, o.fishY);
  if (kinds.has("freeze")) {
    burst(scene, o.fishX, o.fishY, "p_snow", [0xb3e5fc, 0xffffff, 0x4fc3f7], 70, 420);
    cam.flash(300, 180, 230, 255);
  }
  if (kinds.has("burn")) burst(scene, o.fishX, o.fishY + 20, "p_ember", [0xff3d00, 0xffab00, 0xffeb3b], 80, 300);
  if (kinds.has("calm")) {
    for (let i = 0; i < 6; i++) {
      const n = txt(scene, o.heroX + 40, o.heroY - 120, i % 2 ? "♪" : "♫", 34, { color: "#f8bbd0" }).setOrigin(0.5).setDepth(88);
      scene.tweens.add({ targets: n, x: o.fishX + Phaser.Math.Between(-40, 40), y: o.fishY - 40, alpha: 0, delay: i * 120, duration: 1100, onComplete: () => n.destroy() });
    }
  }
  if (kinds.has("distance_pull") || kinds.has("tension_reduce") || kinds.has("reel_boost")) {
    burst(scene, (o.heroX + o.fishX) / 2, o.fishY - 20, "p_drop", [0x80d8ff, 0xffffff], 60, 380);
  }
}
