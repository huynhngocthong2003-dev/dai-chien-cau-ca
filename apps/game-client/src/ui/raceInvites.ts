import Phaser from "phaser";
import { RACE_LEAGUES, RACE_MAPS, type RaceMapId } from "@dccc/shared";
import { GameState } from "../state/GameState.ts";
import * as Social from "../state/social.ts";
import { Bar, Button, goTo, txt } from "./widgets.ts";
import { COLORS } from "./theme.ts";
import { Sfx } from "../audio/Sfx.ts";

/** Thời gian người được mời có để xác nhận (ms). */
export const INVITE_CONFIRM_MS = 10_000;
const POLL_MS = 3000;
/** Màn không hiện lời mời (chưa đăng nhập / đang khởi động). */
const SKIP_SCENES = new Set(["Boot", "Account"]);

/**
 * Lời mời đua cá: kiểm tra mỗi 3 giây khi đang online; có lời mời mới thì hiện bảng xác nhận
 * ở MỌI màn hình (trừ lúc đang đua – chờ đua xong), đếm ngược 10 giây, hết giờ tự từ chối.
 */
export function installRaceInvites(game: Phaser.Game) {
  const shown = new Set<number>();
  let busy = false;
  let open: Phaser.GameObjects.Container | null = null;

  const topScene = (): Phaser.Scene | null => {
    const list = game.scene.getScenes(true);
    return list.length ? list[list.length - 1]! : null;
  };
  const racingNow = (sc: Phaser.Scene) => {
    const mode = (sc as unknown as { mode?: string }).mode;
    return (sc.scene.key === "Race" && (mode === "race" || mode === "countdown")) || sc.scene.key === "Battle";
  };

  const show = (sc: Phaser.Scene, inv: Social.RaceInvite) => {
    shown.add(inv.id);
    Sfx.bite();
    const W = 600;
    const H = 190;
    const x = 640 - W / 2;
    const y = 96;
    const c = sc.add.container(0, 0).setDepth(5000);
    open = c;
    const g = sc.add.graphics();
    g.fillStyle(0x0b2a4a, 0.97).fillRoundedRect(x, y, W, H, 18);
    g.lineStyle(4, 0xffd740).strokeRoundedRect(x, y, W, H, 18);
    const L = RACE_LEAGUES[inv.league];
    const mp = inv.map in RACE_MAPS ? RACE_MAPS[inv.map as RaceMapId] : null;
    const title = txt(sc, 640, y + 30, `🏁 ${inv.from_name} mời bạn đua cá!`, 24, { color: COLORS.textGold, align: "center" }).setOrigin(0.5);
    const info = txt(sc, 640, y + 66, `${L?.name ?? ""} · ${mp ? `${mp.icon} ${mp.name}` : "🎲 Bản đồ ngẫu nhiên"} · ${inv.members}/5 người · phí ${L?.fee ?? 0} vàng`, 16, {
      align: "center",
      weight: "700",
    }).setOrigin(0.5);
    const bar = new Bar(sc, x + 30, y + 92, W - 60, 14, COLORS.gold, "");
    let done = false;
    const close = (accept: boolean) => {
      if (done) return;
      done = true;
      void Social.raceInviteRespond(inv.id, accept).catch(() => null);
      sc.tweens.add({ targets: c, alpha: 0, y: -20, duration: 180, onComplete: () => c.destroy() });
      if (open === c) open = null;
      if (!accept) return;
      // đang ở màn Đua Cá → vào phòng ngay; màn khác → chuyển sang Đua Cá rồi vào phòng
      const race = sc.scene.key === "Race" ? (sc as unknown as { joinLobby?: (code: string) => Promise<void> }) : null;
      if (race?.joinLobby) void race.joinLobby(inv.code);
      else goTo(sc, "Race", { joinCode: inv.code });
    };
    const yes = new Button(sc, 640 - 120, y + 148, 210, 54, "✅ Vào phòng", { color: COLORS.green, fontSize: 21, onClick: () => close(true) });
    const no = new Button(sc, 640 + 120, y + 148, 190, 54, "✖ Từ chối", { color: COLORS.red, fontSize: 21, onClick: () => close(false) });
    c.add([g, title, info, bar, yes, no]);
    c.setAlpha(0).setY(-30);
    sc.tweens.add({ targets: c, alpha: 1, y: 0, duration: 220, ease: "Back.easeOut" });
    const t0 = Date.now();
    const tick = sc.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        const left = Math.max(0, INVITE_CONFIRM_MS - (Date.now() - t0));
        bar.set(left / INVITE_CONFIRM_MS, left < 3000 ? COLORS.red : COLORS.gold);
        bar.label?.setText(`${Math.ceil(left / 1000)} giây`);
        if (left <= 0) {
          tick.remove();
          close(false);
        }
      },
    });
    c.once(Phaser.GameObjects.Events.DESTROY, () => tick.remove());
  };

  const poll = async () => {
    if (busy || !GameState.online || document.visibilityState === "hidden") return;
    const sc = topScene();
    if (!sc || SKIP_SCENES.has(sc.scene.key) || (open && open.active)) return;
    busy = true;
    try {
      const list = await Social.raceMyInvites();
      const inv = list.find((i) => !shown.has(i.id));
      const now = topScene();
      // đang đua thì chờ đua xong (lời mời còn hạn sẽ hiện ở lần kiểm tra sau)
      if (inv && now && !SKIP_SCENES.has(now.scene.key) && !racingNow(now)) show(now, inv);
    } catch {
      /* mạng chập chờn – thử lại sau */
    } finally {
      busy = false;
    }
  };
  window.setInterval(() => void poll(), POLL_MS);
}
