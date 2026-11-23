/**
 * RANK ĐẤU SINH TỬ – nút huy hiệu nhỏ + bảng "Thang Rank" (hạng hiện tại, sao, tiến độ và chú thích 5 hạng).
 * Logic quy đổi điểm nằm trong packages/shared/rank.ts; ở đây chỉ hiển thị.
 */
import Phaser from "phaser";
import { DM_RANK, DM_RANK_TIERS } from "@dccc/game-config";
import { AI_LEVEL_LABEL, dmAiLevel, dmAiPowerScale, dmRankLabel, dmRankMinPoints, dmRankOf, dmRankPoints } from "@dccc/shared";
import { rankBadgeTexture } from "../art/textures.ts";
import { hexToInt } from "../art/color.ts";
import { formatNum, modal, txt } from "./widgets.ts";
import { COLORS } from "./theme.ts";

/** Hàng 5 ngôi sao (đã có = vàng, chưa có = xám). */
export function rankStars(scene: Phaser.Scene, x: number, y: number, have: number, size = 26): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const gap = size * 1.15;
  for (let i = 0; i < DM_RANK.starsPerDivision; i++) {
    const s = scene.add.star((i - (DM_RANK.starsPerDivision - 1) / 2) * gap, 0, 5, size * 0.22, size * 0.5, i < have ? 0xffd54f : 0x37474f);
    s.setStrokeStyle(2.5, 0x16223f);
    c.add(s);
  }
  return c;
}

/** Nút nhỏ: huy hiệu + tên hạng, bấm mở Thang Rank. */
export function rankChip(scene: Phaser.Scene, x: number, y: number, stats: { rankPoints?: number; dmWins?: number }): Phaser.GameObjects.Container {
  const r = dmRankOf(dmRankPoints(stats));
  const tier = DM_RANK_TIERS[r.tier]!;
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(0x0a1628, 0.92).fillRoundedRect(-4, -26, 184, 52, 14);
  g.lineStyle(3, hexToInt(tier.color), 1).strokeRoundedRect(-4, -26, 184, 52, 14);
  c.add(g);
  c.add(scene.add.image(26, -2, rankBadgeTexture(scene, r.tier, r.division)).setDisplaySize(58, 58));
  const short = r.tier === 4 ? "Thần Thoại" : tier.name;
  c.add(txt(scene, 60, -12, `${short} ${r.division}`, 17, { color: tier.color }).setOrigin(0, 0.5));
  c.add(rankStars(scene, 108, 12, r.stars, 17));
  c.setSize(184, 52);
  c.setInteractive(new Phaser.Geom.Rectangle(-4, -26, 184, 52), Phaser.Geom.Rectangle.Contains);
  c.input!.cursor = "pointer";
  c.on("pointerup", () => openRankLadder(scene, stats));
  return c;
}

/** Bảng Thang Rank: bên trái hạng của bạn, bên phải thang chú thích 5 hạng. */
export function openRankLadder(scene: Phaser.Scene, stats: { rankPoints?: number; dmWins?: number }) {
  const points = dmRankPoints(stats);
  const r = dmRankOf(points);
  const tier = DM_RANK_TIERS[r.tier]!;
  const m = modal(scene, 1160, 660, "🏆 Rank Đấu Sinh Tử");
  const root = m.root;
  const L = m.x + 24;
  const T = m.y + 70;

  // ---------------- hạng của bạn
  const lp = scene.add.graphics();
  lp.fillStyle(0x0a1628, 0.85).fillRoundedRect(L, T, 400, 566, 18);
  lp.lineStyle(3, hexToInt(tier.color), 0.9).strokeRoundedRect(L, T, 400, 566, 18);
  root.add(lp);
  root.add(txt(scene, L + 200, T + 26, "Hạng của bạn", 20, { color: COLORS.textDim }).setOrigin(0.5));
  const badge = scene.add.image(L + 200, T + 140, rankBadgeTexture(scene, r.tier, r.division)).setDisplaySize(200, 200);
  root.add(badge);
  scene.tweens.add({ targets: badge, scale: badge.scale * 1.04, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  root.add(txt(scene, L + 200, T + 256, dmRankLabel(r), 28, { color: tier.color, align: "center" }).setOrigin(0.5));
  root.add(txt(scene, L + 200, T + 288, tier.stage, 16, { weight: "700", color: COLORS.textDim, align: "center" }).setOrigin(0.5));
  root.add(rankStars(scene, L + 200, T + 332, r.stars, 40));
  // thanh điểm tới sao kế
  const bx = L + 40;
  const by = T + 370;
  const bw = 320;
  const bar = scene.add.graphics();
  bar.fillStyle(0x1c2b45, 1).fillRoundedRect(bx, by, bw, 22, 11);
  bar.fillStyle(0xffc93c, 1).fillRoundedRect(bx, by, Math.max(22, (bw * r.starPoints) / DM_RANK.pointsPerStar), 22, 11);
  bar.lineStyle(2.5, 0x16223f, 1).strokeRoundedRect(bx, by, bw, 22, 11);
  root.add(bar);
  root.add(txt(scene, L + 200, by + 11, `${r.starPoints} / ${DM_RANK.pointsPerStar} điểm tới ⭐ kế`, 14, { align: "center" }).setOrigin(0.5));
  const winsToStar = Math.ceil((DM_RANK.pointsPerStar - r.starPoints) / DM_RANK.pointsPerWin);
  const next = r.top
    ? `👑 Đỉnh bảng! Sao dư: +${r.extraStars} ⭐`
    : r.stars === DM_RANK.starsPerDivision - 1
      ? `Còn ${winsToStar} trận thắng nữa để ${r.division === DM_RANK.divisionsPerTier ? `lên hạng ${DM_RANK_TIERS[r.tier + 1]!.name}` : `lên Bậc ${r.division + 1}`}`
      : `Còn ${winsToStar} trận thắng nữa để có thêm 1 ⭐`;
  root.add(txt(scene, L + 200, T + 420, next, 17, { align: "center", color: "#b9f6ca", wrap: 360 }).setOrigin(0.5));
  root.add(txt(scene, L + 200, T + 452, `Tổng điểm mùa này: ${formatNum(points)} · Máy: ${AI_LEVEL_LABEL[dmAiLevel(points)]} ×${dmAiPowerScale(points).toFixed(2)} lực`, 15, { weight: "700", color: COLORS.textDim, align: "center" }).setOrigin(0.5));
  const rules = [
    `• Mỗi trận THẮNG sinh tử: +${DM_RANK.pointsPerWin} điểm`,
    `• ${DM_RANK.pointsPerStar} điểm = 1 ⭐ · đủ ${DM_RANK.starsPerDivision} ⭐ = lên bậc`,
    `• Mỗi hạng ${DM_RANK.divisionsPerTier} bậc (số ngọc trên ruy băng)`,
    "• Rank cao → máy càng khó & mạnh hơn",
    "• Thua không trừ điểm · giao hữu không tính",
  ];
  root.add(txt(scene, L + 22, T + 478, rules.join("\n"), 14, { weight: "700", wrap: 360 }).setLineSpacing(3));

  // ---------------- thang rank (chú thích các hạng)
  const RX = L + 424;
  const RW = 688;
  root.add(txt(scene, RX + RW / 2, T + 14, "📶 Thang Rank – từ thấp lên cao ↑", 20, { color: COLORS.textGold }).setOrigin(0.5));
  const rowH = 104;
  const top = T + 36;
  // thân thang: thanh dọc nối các hạng
  const rail = scene.add.graphics();
  const railX = RX + 22;
  for (let i = 0; i < DM_RANK_TIERS.length - 1; i++) {
    const y0 = top + i * rowH + rowH / 2;
    const tierIdx = DM_RANK_TIERS.length - 1 - i;
    rail.lineStyle(8, hexToInt(DM_RANK_TIERS[tierIdx - 1]!.color), tierIdx - 1 <= r.tier ? 1 : 0.35);
    rail.lineBetween(railX, y0, railX, y0 + rowH);
  }
  root.add(rail);
  DM_RANK_TIERS.forEach((_, i) => {
    const t = DM_RANK_TIERS.length - 1 - i; // hạng cao ở trên
    const def = DM_RANK_TIERS[t]!;
    const y = top + i * rowH;
    const cur = t === r.tier;
    const reached = t <= r.tier;
    const g = scene.add.graphics();
    g.fillStyle(cur ? 0x203a63 : 0x0a1628, cur ? 0.95 : 0.8).fillRoundedRect(RX + 44, y + 4, RW - 44, rowH - 10, 14);
    g.lineStyle(cur ? 4 : 2, hexToInt(def.color), cur ? 1 : 0.55).strokeRoundedRect(RX + 44, y + 4, RW - 44, rowH - 10, 14);
    // nút trên thang
    g.fillStyle(reached ? hexToInt(def.color) : 0x37474f, 1).fillCircle(railX, y + rowH / 2, 16);
    g.lineStyle(3, 0x16223f, 1).strokeCircle(railX, y + rowH / 2, 16);
    root.add(g);
    root.add(txt(scene, railX, y + rowH / 2, String(t + 1), 17, { color: "#ffffff" }).setOrigin(0.5));
    const img = scene.add.image(RX + 96, y + rowH / 2 - 1, rankBadgeTexture(scene, t, cur ? r.division : DM_RANK.divisionsPerTier)).setDisplaySize(90, 90);
    if (!reached) img.setAlpha(0.55);
    root.add(img);
    root.add(txt(scene, RX + 150, y + 26, def.name, 23, { color: def.color }).setOrigin(0, 0.5));
    root.add(txt(scene, RX + 150, y + 54, def.stage, 15, { weight: "700", color: COLORS.textDim }).setOrigin(0, 0.5));
    const lo = dmRankMinPoints(t, 1);
    const hi = t < DM_RANK_TIERS.length - 1 ? dmRankMinPoints(t + 1, 1) - DM_RANK.pointsPerWin : null;
    const range = hi === null ? `${formatNum(lo)}+ điểm` : `${formatNum(lo)} – ${formatNum(hi)} điểm`;
    root.add(txt(scene, RX + 150, y + 78, `Bậc 1 → 5 · ${range} · từ ${formatNum(lo / DM_RANK.pointsPerWin)} trận thắng`, 13, { weight: "700", color: "#90caf9" }).setOrigin(0, 0.5));
    if (cur) {
      const tag = txt(scene, RX + RW - 18, y + rowH / 2 - 2, "◀ BẠN ĐANG Ở ĐÂY", 15, { color: "#ffd54f" }).setOrigin(1, 0.5);
      root.add(tag);
      scene.tweens.add({ targets: tag, x: tag.x - 8, duration: 500, yoyo: true, repeat: -1 });
    }
  });
}
