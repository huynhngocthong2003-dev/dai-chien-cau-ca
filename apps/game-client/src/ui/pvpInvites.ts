import Phaser from "phaser";
import { GameState } from "../state/GameState.ts";
import { myPvpInvites, pvpCall, serverTime, type PvpInvite } from "../state/pvp.ts";
import { joinRoom } from "../scenes/DeathMatchScene.ts";
import { Bar, Button, txt } from "./widgets.ts";
import { COLORS } from "./theme.ts";
import { Sfx } from "../audio/Sfx.ts";

const POLL_MS = 4000;
/** Màn không hiện lời mời (chưa vào game / đang đấu / đang trong phòng / đang đua). */
const SKIP_SCENES = new Set(["Boot", "Account", "Combat3", "PvpRoom", "Race"]);

/**
 * Lời mời ĐẤU CÁ 3vs3: kiểm tra mỗi 4 giây khi online; có lời mời thì hiện bảng ở mọi màn
 * (trừ lúc đang đấu/đua), đếm ngược theo thời hạn phòng (60 giây của máy chủ).
 */
export function installPvpInvites(game: Phaser.Game) {
  const shown = new Set<string>();
  let busy = false;
  let open: Phaser.GameObjects.Container | null = null;

  const topScene = (): Phaser.Scene | null => {
    const list = game.scene.getScenes(true);
    return list.length ? list[list.length - 1]! : null;
  };

  const show = (sc: Phaser.Scene, inv: PvpInvite) => {
    shown.add(inv.id);
    Sfx.bite();
    const W = 600;
    const H = 190;
    const x = 640 - W / 2;
    const y = 300;
    const c = sc.add.container(0, 0).setDepth(5000);
    open = c;
    const g = sc.add.graphics();
    g.fillStyle(0x2a0b0b, 0.97).fillRoundedRect(x, y, W, H, 18);
    g.lineStyle(4, 0xff5252).strokeRoundedRect(x, y, W, H, 18);
    const title = txt(sc, 640, y + 30, `⚔ ${inv.host_name} thách đấu cá 3vs3!`, 24, { color: COLORS.textGold, align: "center" }).setOrigin(0.5);
    const info = txt(sc, 640, y + 66, inv.stake === "death" ? "💀 Sinh tử – thua mất cá lực chiến thấp nhất" : "🤝 Giao hữu – không mất cá", 17, {
      align: "center",
      weight: "700",
      color: inv.stake === "death" ? "#ff8a80" : "#b9f6ca",
    }).setOrigin(0.5);
    const bar = new Bar(sc, x + 30, y + 92, W - 60, 14, COLORS.gold, "");
    let done = false;
    const close = (accept: boolean) => {
      if (done) return;
      done = true;
      sc.tweens.add({ targets: c, alpha: 0, duration: 180, onComplete: () => c.destroy() });
      if (open === c) open = null;
      if (accept) void joinRoom(sc, { id: inv.id });
      else void pvpCall({ op: "decline", id: inv.id }).catch(() => null);
    };
    const yes = new Button(sc, 640 - 120, y + 148, 210, 54, "✅ Nhận đấu", { color: COLORS.green, fontSize: 21, onClick: () => close(true) });
    const no = new Button(sc, 640 + 120, y + 148, 190, 54, "✖ Từ chối", { color: COLORS.red, fontSize: 21, onClick: () => close(false) });
    c.add([g, title, info, bar, yes, no]);
    c.setAlpha(0);
    sc.tweens.add({ targets: c, alpha: 1, duration: 220 });
    const end = Date.parse(inv.expires_at);
    const total = Math.max(1000, end - serverTime());
    const tick = sc.time.addEvent({
      delay: 200,
      loop: true,
      callback: () => {
        const left = Math.max(0, end - serverTime());
        bar.set(left / total, left < 10_000 ? COLORS.red : COLORS.gold);
        bar.label?.setText(`${Math.ceil(left / 1000)} giây`);
        if (left <= 0) {
          tick.remove();
          if (!done) {
            done = true;
            c.destroy();
            if (open === c) open = null;
          }
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
      const inv = (await myPvpInvites(GameState.online.id)).find((i) => !shown.has(i.id));
      const now = topScene();
      if (inv && now && !SKIP_SCENES.has(now.scene.key)) show(now, inv);
    } catch {
      /* thử lại sau */
    } finally {
      busy = false;
    }
  };
  window.setInterval(() => void poll(), POLL_MS);
}
