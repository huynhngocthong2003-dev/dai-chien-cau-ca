/**
 * BẢNG CHÚ THÍCH KHẮC HỆ (đấu cá): nút "?" nhỏ → bảng gồm sơ đồ vòng khắc 5 hệ + Bóng Tối ⇄ Ánh Sáng (áp chế 5 hệ tự nhiên),
 * bảng hệ số 7×7 (hàng = cá đánh, cột = cá bị đánh) và cách tính cho cá song hệ. Dữ liệu lấy từ shared/elements.
 */
import Phaser from "phaser";
import { ELEMENT_INFO } from "@dccc/game-config";
import { ELEMENT_IDS, ELEMENT_STRONG, ELEMENT_WEAK, elementMatchup, type Element } from "@dccc/shared";
import { modal, txt } from "./widgets.ts";
import { elementBadge } from "./element.ts";
import { COLORS } from "./theme.ts";
import { Sfx } from "../audio/Sfx.ts";

const fmt = (x: number) => `×${String(x).replace(".", ",")}`;

/** Nút tròn "?" nhỏ – bấm mở bảng khắc hệ. */
export function elementChartButton(scene: Phaser.Scene, x: number, y: number, depth = 60): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y).setDepth(depth);
  const bg = scene.add.circle(0, 0, 21, 0x7c4dff, 1).setStrokeStyle(3, 0x1b1530);
  const q = txt(scene, 0, 1, "?", 26, { color: "#ffffff", align: "center" }).setOrigin(0.5);
  c.add([bg, q]);
  bg.setInteractive({ useHandCursor: true })
    .on("pointerover", () => bg.setFillStyle(0x9575ff))
    .on("pointerout", () => bg.setFillStyle(0x7c4dff))
    .on("pointerdown", () => {
      Sfx.click();
      openElementChart(scene);
    });
  scene.tweens.add({ targets: c, scale: 1.08, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  return c;
}

/** Mở bảng chú thích khắc hệ. */
export function openElementChart(scene: Phaser.Scene) {
  const m = modal(scene, 1180, 640, "📖 Bảng khắc hệ");
  m.root.setDepth(1000);
  const X = m.x;
  const Y = m.y;
  // ---- sơ đồ vòng khắc (trái)
  const cx = X + 230;
  const cy = Y + 270;
  const R = 140;
  const ring: Element[] = ["metal", "wood", "earth", "water", "fire"]; // Kim → Mộc → Thổ → Thủy → Hỏa → Kim
  const pos = ring.map((_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / ring.length;
    return { x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R };
  });
  const g = scene.add.graphics();
  m.root.add(g);
  const arrow = (ax: number, ay: number, bx: number, by: number, col: number, both = false) => {
    const ang = Math.atan2(by - ay, bx - ax);
    const s = { x: ax + Math.cos(ang) * 40, y: ay + Math.sin(ang) * 40 };
    const e = { x: bx - Math.cos(ang) * 40, y: by - Math.sin(ang) * 40 };
    g.lineStyle(5, col, 1).lineBetween(s.x, s.y, e.x, e.y);
    const head = (p: { x: number; y: number }, a: number) =>
      g.fillStyle(col, 1).fillTriangle(p.x, p.y, p.x - Math.cos(a - 0.45) * 18, p.y - Math.sin(a - 0.45) * 18, p.x - Math.cos(a + 0.45) * 18, p.y - Math.sin(a + 0.45) * 18);
    head(e, ang);
    if (both) head(s, ang + Math.PI);
  };
  ring.forEach((el, i) => {
    const a = pos[i]!;
    const b = pos[(i + 1) % ring.length]!;
    arrow(a.x, a.y, b.x, b.y, 0x69f0ae);
  });
  ring.forEach((el, i) => {
    const p = pos[i]!;
    m.root.add(elementBadge(scene, p.x, p.y, el, 58));
    m.root.add(txt(scene, p.x, p.y + 44, ELEMENT_INFO[el].name, 16, { color: ELEMENT_INFO[el].color, align: "center" }).setOrigin(0.5));
  });
  m.root.add(txt(scene, cx, cy - 8, "mũi tên\n= KHẮC", 15, { align: "center", weight: "700", color: "#69f0ae" }).setOrigin(0.5));
  // Bóng Tối ⇄ Ánh Sáng
  const dy = Y + 545;
  arrow(cx - 90, dy, cx + 90, dy, 0xea80fc, true);
  m.root.add(elementBadge(scene, cx - 90, dy, "dark", 58));
  m.root.add(elementBadge(scene, cx + 90, dy, "light", 58));
  m.root.add(txt(scene, cx - 90, dy + 44, ELEMENT_INFO.dark.name, 16, { color: ELEMENT_INFO.dark.color, align: "center" }).setOrigin(0.5));
  m.root.add(txt(scene, cx + 90, dy + 44, ELEMENT_INFO.light.name, 16, { color: ELEMENT_INFO.light.color, align: "center" }).setOrigin(0.5));
  m.root.add(txt(scene, cx, dy - 34, "khắc lẫn nhau", 15, { align: "center", weight: "700", color: "#ea80fc" }).setOrigin(0.5));
  // áp chế 5 hệ tự nhiên: mũi tên vàng từ Bóng Tối & Ánh Sáng lên vòng khắc
  arrow(cx - 90, dy, cx - 30, cy + 40, 0xffd740);
  arrow(cx + 90, dy, cx + 30, cy + 40, 0xffd740);
  m.root.add(txt(scene, cx, cy + 58, "⚡ ÁP CHẾ cả 5 hệ\ntự nhiên ×1,5", 14, { align: "center", weight: "700", color: "#ffd740" }).setOrigin(0.5));

  // ---- bảng hệ số 7×7 (phải): hàng = cá ĐÁNH, cột = cá BỊ ĐÁNH
  const tx = X + 470;
  const ty = Y + 110;
  const cw = 82;
  const ch = 50;
  m.root.add(txt(scene, tx + cw / 2, ty - 26, "Đánh ↓  ·  Bị đánh →", 14, { weight: "700", color: COLORS.textDim, align: "center" }).setOrigin(0.5));
  ELEMENT_IDS.forEach((d, j) => m.root.add(elementBadge(scene, tx + cw * (j + 1) + cw / 2, ty + ch / 2 - 4, d, 34)));
  const cells = scene.add.graphics();
  m.root.add(cells);
  ELEMENT_IDS.forEach((a, i) => {
    const y = ty + ch * (i + 1);
    m.root.add(elementBadge(scene, tx + cw / 2 - 18, y + ch / 2, a, 34));
    m.root.add(txt(scene, tx + cw / 2 + 4, y + ch / 2, ELEMENT_INFO[a].name, 12, { color: ELEMENT_INFO[a].color, weight: "700" }).setOrigin(0, 0.5));
    ELEMENT_IDS.forEach((d, j) => {
      const mu = elementMatchup(a, d);
      const x = tx + cw * (j + 1);
      const col = mu.kind === "strong" ? 0x2e7d32 : mu.kind === "weak" ? 0xc62828 : 0x263a55;
      cells.fillStyle(col, mu.kind === "normal" ? 0.6 : 0.9).fillRoundedRect(x + 3, y + 3, cw - 6, ch - 6, 8);
      m.root.add(txt(scene, x + cw / 2, y + ch / 2, fmt(mu.mult), 17, { align: "center", weight: "700", color: mu.kind === "normal" ? "#b0bec5" : "#ffffff" }).setOrigin(0.5));
    });
  });
  // ---- chú thích
  const ny = ty + ch * 8 + 8;
  m.root.add(
    txt(
      scene,
      tx,
      ny,
      `🟩 Khắc chế: sát thương ${fmt(ELEMENT_STRONG)}   🟥 Bị khắc: ${fmt(ELEMENT_WEAK)}   ⬛ Bình thường: ×1\n` +
        "⚡ Bóng Tối & Ánh Sáng ÁP CHẾ 5 hệ tự nhiên: đánh ×1,5, bị đánh chỉ ×0,75.\n" +
        "☯ Cá SONG HỆ: nhân hệ số với TỪNG hệ của đối thủ, lấy hệ có lợi nhất (giới hạn ×0,75 … ×1,5).\n" +
        "💡 Chọn cá khắc hệ đối thủ để thắng dễ hơn!",
      15,
      { weight: "700", color: COLORS.text, wrap: 660 },
    ).setLineSpacing(6),
  );
  return m;
}
