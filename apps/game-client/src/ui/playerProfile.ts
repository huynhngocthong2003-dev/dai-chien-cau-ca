import Phaser from "phaser";
import { CHAR_RARITY_COLOR, FISH_RARITY_COLOR } from "@dccc/game-config";
import { CHARACTER_BY_ID, COSMETIC_BY_ID, FISH_BY_ID, FORM_BY_ID, ROD_BY_ID, TITLE_BY_ID } from "@dccc/game-data";
import type { CosmeticSlot } from "@dccc/shared";
import { GameState } from "../state/GameState.ts";
import * as Social from "../state/social.ts";
import { auraTexture, characterHeadTexture, characterTexture, fishTextureFor, rodIconTexture } from "../art/textures.ts";
import { Button, formatNum, goTo, modal, toast, txt } from "./widgets.ts";
import { COLORS } from "./theme.ts";
import { hexToInt } from "../art/color.ts";
import { openChat } from "./chat.ts";

/** Chỉ giữ đồ hợp lệ (đề phòng dữ liệu hồ sơ cũ / lạ). */
export function safeEquip(e: Partial<Record<string, string>> | undefined): Partial<Record<CosmeticSlot, string>> {
  const out: Partial<Record<CosmeticSlot, string>> = {};
  for (const [k, v] of Object.entries(e ?? {})) {
    const it = v ? COSMETIC_BY_ID.get(v) : undefined;
    if (it && it.slot === k) out[k as CosmeticSlot] = v;
  }
  return out;
}

/**
 * Trang cá nhân của một người chơi (xem từ Bảng Xếp Hạng / Bạn bè):
 * trái – avatar, tên, danh hiệu, mã, online, thống kê, cá trưng bày; phải – nhân vật cầm cần câu.
 */
export function showPlayerProfile(scene: Phaser.Scene, p: Social.PlayerCard, opts: { rankLine?: string } = {}) {
  const m = modal(scene, 1120, 640, "");
  const X = m.x;
  const Y = m.y;
  const me = p.user_id === GameState.online?.id;
  const ch = CHARACTER_BY_ID.get(p.avatar) ?? CHARACTER_BY_ID.get("c_be_tom")!;
  const equip = safeEquip(p.stats.equip);
  const rod = ROD_BY_ID.get(p.stats.rod ?? "") ?? null;
  const st = Social.onlineStatus(p);
  const add = (o: Phaser.GameObjects.GameObject) => m.root.add(o);
  // ---- trái
  const ring = scene.add.graphics();
  ring.fillStyle(0xffc107).fillCircle(X + 90, Y + 100, 56).lineStyle(4, COLORS.outline).strokeCircle(X + 90, Y + 100, 56);
  ring.fillStyle(st.online ? 0x00e676 : 0x9e9e9e).fillCircle(X + 134, Y + 140, 10).lineStyle(3, COLORS.outline).strokeCircle(X + 134, Y + 140, 10);
  add(ring);
  add(scene.add.image(X + 90, Y + 104, characterHeadTexture(scene, ch, equip)).setDisplaySize(108, 130));
  add(txt(scene, X + 164, Y + 50, p.display_name, 30, { color: COLORS.textGold }));
  const tt = p.stats.title ? TITLE_BY_ID.get(p.stats.title) : null;
  add(txt(scene, X + 164, Y + 90, tt ? `${tt.icon} ${tt.name}` : "Chưa đeo danh hiệu", 18, { color: tt?.color ?? COLORS.textDim }));
  add(txt(scene, X + 164, Y + 118, `Cấp ${p.level} · Mã kết bạn: ${p.friend_code}`, 16, { weight: "700" }));
  add(txt(scene, X + 164, Y + 142, `${st.online ? "🟢" : "⚪"} ${st.text}${opts.rankLine ? `  ·  ${opts.rankLine}` : ""}`, 15, { weight: "700", color: st.online ? "#69f0ae" : COLORS.textDim }));
  if (p.stats.pid) add(txt(scene, X + 164, Y + 164, `UID: ${p.stats.pid}`, 13, { weight: "700", color: COLORS.textDim }));
  const stats: [string, string][] = [
    ["🐟 Đã câu", formatNum(p.stats.caught ?? 0)],
    ["👑 Boss", formatNum(p.stats.bosses ?? 0)],
    ["⚔ Sinh tử", `${p.stats.dmWins ?? 0}T–${p.stats.dmLosses ?? 0}B`],
    ["💪 Chiến lực", formatNum(p.stats.teamPower ?? 0)],
  ];
  stats.forEach(([k, v], i) => {
    const x = X + 24 + i * 156;
    const g = scene.add.graphics();
    g.fillStyle(0x0a1628, 0.9).fillRoundedRect(x, Y + 196, 148, 64, 12);
    add(g);
    add(txt(scene, x + 74, Y + 214, k, 14, { weight: "700", color: COLORS.textDim, align: "center" }).setOrigin(0.5));
    add(txt(scene, x + 74, Y + 240, v, 19, { align: "center" }).setOrigin(0.5));
  });
  add(txt(scene, X + 24, Y + 280, "🏅 Cá trưng bày", 18, { color: COLORS.textGold }));
  if (!p.showcase.length) add(txt(scene, X + 330, Y + 420, "Chưa trưng bày cá nào", 20, { color: COLORS.textDim }).setOrigin(0.5));
  p.showcase.slice(0, 3).forEach((f, i) => {
    const def = FISH_BY_ID.get(f.fishId);
    if (!def) return;
    const x = X + 24 + i * 208;
    const y = Y + 306;
    const g = scene.add.graphics();
    g.fillGradientStyle(0x1a3d66, 0x1a3d66, 0x0d2340, 0x0d2340, 0.95).fillRoundedRect(x, y, 198, 230, 14);
    g.lineStyle(3, hexToInt(FISH_RARITY_COLOR[def.rarity])).strokeRoundedRect(x, y, 198, 230, 14);
    add(g);
    add(scene.add.image(x + 99, y + 74, fishTextureFor(scene, def, f.form)).setDisplaySize(170, 106));
    const fm = f.form ? FORM_BY_ID.get(f.form) : null;
    const total = f.wins + f.losses;
    add(txt(scene, x + 99, y + 160, `${def.name}${fm ? `\n${fm.name}` : ""}\nLv.${f.level} · ⚔${formatNum(f.power)}`, 14, { align: "center", color: FISH_RARITY_COLOR[def.rarity] }).setOrigin(0.5));
    add(txt(scene, x + 99, y + 212, total ? `${Math.round((f.wins / total) * 100)}% thắng (${f.wins}T/${f.losses}B)` : "chưa đấu", 13, { align: "center", weight: "700", color: "#b9f6ca" }).setOrigin(0.5));
  });
  // ---- phải: nhân vật cầm cần
  const RX = X + 860;
  const g = scene.add.graphics();
  g.fillStyle(0x0a1628, 0.7).fillRoundedRect(X + 660, Y + 40, 420, 520, 18);
  const col = hexToInt(CHAR_RARITY_COLOR[ch.rarity]);
  g.fillStyle(0x000000, 0.35).fillEllipse(RX, Y + 470, 230, 40).fillStyle(col, 0.85).fillEllipse(RX, Y + 462, 214, 36);
  g.lineStyle(3, COLORS.outline).strokeEllipse(RX, Y + 462, 214, 36);
  add(g);
  const k = 1.4;
  if (p.stats.awakened) add(scene.add.image(RX, Y + 466, auraTexture(scene, ch)).setOrigin(0.5, 1).setScale(k).setAlpha(0.8));
  const hero = scene.add.image(RX, Y + 466, characterTexture(scene, ch, equip)).setOrigin(0.5, 1).setScale(k);
  add(hero);
  if (rod) add(scene.add.image(RX + 12 * k, Y + 466 - 70 * k, rodIconTexture(scene, rod)).setOrigin(0.1, 0.88).setScale(0.66));
  add(txt(scene, RX, Y + 500, `${ch.rarity} · ${ch.name}`, 20, { color: CHAR_RARITY_COLOR[ch.rarity], align: "center" }).setOrigin(0.5));
  if (rod) add(txt(scene, RX, Y + 528, `🎣 ${rod.name}`, 16, { color: CHAR_RARITY_COLOR[rod.rarity], align: "center" }).setOrigin(0.5));
  // ---- nút
  if (!me && GameState.online) {
    add(
      new Button(scene, X + 720, Y + m.h - 44, 180, 52, "➕ Kết bạn", {
        color: COLORS.green,
        fontSize: 20,
        onClick: () =>
          void Social.sendFriendRequest(GameState.online!.id, p.user_id).then(
            () => toast(scene, "Đã gửi lời mời kết bạn", COLORS.green),
            (e: Error) => toast(scene, /duplicate|unique/i.test(e.message) ? "Hai bạn đã kết bạn hoặc đã có lời mời" : e.message, COLORS.red),
          ),
      }),
    );
    add(new Button(scene, X + 910, Y + m.h - 44, 180, 52, "💬 Nhắn tin", { color: COLORS.blue, fontSize: 20, onClick: () => openChat(scene, p) }));
    add(new Button(scene, X + 1050, Y + m.h - 44, 120, 52, "⚔ Đấu", { color: COLORS.red, fontSize: 20, onClick: () => goTo(scene, "DeathMatch", { mode: "pvp", opponent: p }) }));
  } else if (me) add(txt(scene, X + 860, Y + m.h - 44, "Đây là hồ sơ của bạn", 18, { color: COLORS.textDim, align: "center" }).setOrigin(0.5));
  return m;
}

/** Mở trang cá nhân theo user_id (tải hồ sơ từ máy chủ). */
export async function openPlayerProfile(scene: Phaser.Scene, userId: string, rankLine?: string) {
  try {
    const [card] = await Social.cardsByIds([userId]);
    if (!card) return toast(scene, "Không tìm thấy hồ sơ người chơi", COLORS.red);
    if (scene.scene.isActive()) showPlayerProfile(scene, card, { rankLine });
  } catch (e) {
    toast(scene, (e as Error).message, COLORS.red);
  }
}
