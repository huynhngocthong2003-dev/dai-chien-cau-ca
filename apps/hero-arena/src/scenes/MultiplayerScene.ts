import Phaser from "phaser";
import { HEROES, heroById, MAX_PLAYERS } from "@hero-arena/core";
import { addHeroImage, breathe } from "../heroArt.ts";
import { getLobby, leaveNet, setNetSession, type NetLobby, type NetPeer, type NetRoom } from "../net/room.ts";
import { getSave, newMatchSeed, persist } from "../state.ts";
import { button, H, htmlInput, panel, text, toast, W } from "../ui.ts";

// Phòng chờ chơi chung: tạo phòng (mã), vào phòng bằng mã, chọn anh hùng.
// Chủ phòng bấm Bắt đầu khi có từ 2 người; thiếu bao nhiêu máy lấp cho đủ 20.

const MIN_PLAYERS = 2;
const CODE_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";

function randomCode(): string {
  let s = "";
  for (let i = 0; i < 5; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

/** Thông tin phòng chờ mỗi người đặt trong "trạng thái người tham gia". */
interface LobbyPresence {
  n?: string;
  hr?: string;
  host?: number;
  j?: number;
  st?: { sd: number; hs: Array<[string, string, string]> };
}

/** Tên hiển thị an toàn: bỏ ký tự điều khiển / vô hình, tối đa 16 ký tự. */
function cleanName(s: unknown): string {
  if (typeof s !== "string") return "Anh Hùng";
  const invisible = (c: number) => c < 32 || (c >= 0x7f && c <= 0x9f) || (c >= 0x200b && c <= 0x200f) || (c >= 0x202a && c <= 0x202e) || (c >= 0x2060 && c <= 0x2064) || c === 0xfeff;
  const out = [...s].filter((ch) => !invisible(ch.codePointAt(0) ?? 0)).join("").trim().slice(0, 16);
  return out || "Anh Hùng";
}

export class MultiplayerScene extends Phaser.Scene {
  private lobby: NetLobby | null = null;
  private room: NetRoom | null = null;
  private isHost = false;
  private code = "";
  private heroIdx = 0;
  private ui!: Phaser.GameObjects.Container;
  private nameInput: HTMLInputElement | null = null;
  private codeInput: HTMLInputElement | null = null;
  private unsub: (() => void) | null = null;
  private starting = false;
  private joinedAt = 0;
  /** Vào từ nút VÀO TRẬN: tự tạo phòng mời bạn ngay. */
  private auto = false;

  constructor() {
    super("Multiplayer");
  }

  init(data: { auto?: boolean }): void {
    this.auto = !!data?.auto;
  }

  create(): void {
    this.room = null;
    this.isHost = false;
    this.starting = false;
    const s = getSave();
    this.heroIdx = Math.max(0, HEROES.findIndex((h) => h.id === s.lastHero?.heroId));
    const bg = this.add.image(W / 2, H / 2, "lobby_map");
    bg.setScale(Math.max(W / bg.width, H / bg.height));
    this.add.rectangle(0, 0, W, H, 0x070a14, 0.78).setOrigin(0);
    text(this, 30, 14, this.auto ? "MỜI BẠN CÙNG CHƠI" : "VÀO PHÒNG BẠN", 40, "#ffcf5a", 800);
    text(this, this.auto ? 470 : 380, 30, `Từ ${MIN_PLAYERS} người trở lên là bắt đầu được · thiếu bao nhiêu máy lấp cho đủ ${MAX_PLAYERS}`, 18, "#c8c0b0", 500);
    button(this, 1186, 40, 150, 50, "← Sảnh", () => void this.back(), 0x4a4f5a, 22);
    this.ui = this.add.container(0, 0);
    this.events.once("shutdown", () => {
      this.unsub?.();
      this.unsub = null;
    });
    this.ui.add(text(this, W / 2, 300, "Đang kết nối…", 26).setOrigin(0.5));
    void getLobby().then((l) => {
      this.lobby = l;
      if (!this.scene.isActive()) return;
      if (!l) this.showUnavailable();
      else if (this.auto) void this.enter(randomCode(), true);
      else this.showMenu();
    });
  }

  private clearUi(): void {
    this.ui.removeAll(true);
    this.nameInput?.remove();
    this.codeInput?.remove();
    this.nameInput = null;
    this.codeInput = null;
  }

  private async back(): Promise<void> {
    this.unsub?.();
    this.unsub = null;
    if (this.room && !this.starting) {
      try {
        await this.room.leave();
      } catch {
        /* bỏ qua */
      }
    }
    this.room = null;
    this.scene.start("Lobby");
  }

  private showUnavailable(): void {
    this.clearUi();
    this.ui.add(panel(this, 240, 160, 800, 300));
    this.ui.add(text(this, W / 2, 200, "Chưa chơi chung được ở đây", 30, "#ffb347").setOrigin(0.5, 0));
    this.ui.add(
      text(this, W / 2, 260, "Chơi chung cần mở game trên trang claude.ai và đăng nhập.\nNgười được mời phải được chủ trò chơi chia sẻ trang (nút Share).", 20, "#e8e0d0", 500)
        .setOrigin(0.5, 0)
        .setAlign("center"),
    );
    this.ui.add(button(this, W / 2, 400, 380, 70, "⚔ Chơi một mình (đấu 19 máy)", () => this.playSolo(), 0xc8461e, 24).root);
  }

  private showMenu(): void {
    this.clearUi();
    const s = getSave();
    this.ui.add(panel(this, 240, 110, 800, 520));
    this.ui.add(text(this, 280, 136, "Tên của bạn", 22, "#ffe08a"));
    this.nameInput = htmlInput(this, 280, 172, 420, "Tên hiển thị");
    this.nameInput.id = "mp-name";
    this.nameInput.style.textTransform = "none";
    this.nameInput.maxLength = 16;
    this.nameInput.value = s.name;
    this.ui.add(text(this, 280, 262, "Tạo phòng mới và gửi mã cho bạn bè", 20, "#c8c0b0", 500));
    this.ui.add(button(this, 440, 330, 320, 64, "＋ Tạo phòng", () => void this.enter(randomCode(), true), 0xc8641e, 26).root);
    this.ui.add(text(this, 280, 400, "Hoặc nhập mã phòng của bạn bè", 20, "#c8c0b0", 500));
    this.codeInput = htmlInput(this, 280, 436, 300, "Mã phòng");
    this.codeInput.id = "mp-code";
    this.codeInput.maxLength = 8;
    this.ui.add(
      button(this, 800, 460, 260, 60, "Vào phòng", () => {
        const c = (this.codeInput?.value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
        if (c.length < 3) {
          toast(this, "Nhập mã phòng (ít nhất 3 ký tự)", "#ff9a8a", 690);
          return;
        }
        void this.enter(c, false);
      }, 0x2f5f8f, 24).root,
    );
  }

  private async enter(code: string, host: boolean): Promise<void> {
    if (!this.lobby) return;
    const s = getSave();
    s.name = cleanName(this.nameInput?.value ?? s.name);
    persist();
    this.clearUi();
    this.ui.add(text(this, W / 2, 300, "Đang vào phòng…", 26).setOrigin(0.5));
    try {
      this.room = await this.lobby.join(`ha-${code}`);
    } catch {
      this.showMenu();
      toast(this, "Không vào được phòng. Thử lại sau.", "#ff9a8a", 690);
      return;
    }
    this.code = code;
    this.isHost = host;
    this.joinedAt = Date.now();
    await this.room.presence({ n: s.name, hr: HEROES[this.heroIdx]?.id ?? "fighter", host: host ? 1 : 0, j: this.joinedAt });
    this.unsub = this.room.onPeers((peers) => this.onPeers(peers));
    this.renderRoom(this.room.peers());
  }

  private lobbyPeers(peers: readonly NetPeer[]): NetPeer[] {
    return peers.filter((p) => typeof (p.presence as LobbyPresence).n === "string").sort((a, b) => ((a.presence as LobbyPresence).j ?? 0) - ((b.presence as LobbyPresence).j ?? 0));
  }

  private onPeers(peers: readonly NetPeer[]): void {
    if (!this.room || this.starting) return;
    // khách: chủ phòng đã bắt đầu và có mình trong danh sách → vào trận
    if (!this.isHost) {
      const host = peers.find((p) => (p.presence as LobbyPresence).host === 1 && !p.isMe);
      const st = host ? (host.presence as LobbyPresence).st : undefined;
      if (host && st && Array.isArray(st.hs)) {
        const me = peers.find((p) => p.isMe && p.sameTab);
        const idx = st.hs.findIndex((h) => Array.isArray(h) && h[0] === me?.peer);
        if (idx >= 0) {
          this.startMatch(st.sd, st.hs, `h${idx}`, host.peer, "client");
          return;
        }
      }
    }
    this.renderRoom(peers);
  }

  private renderRoom(peers: readonly NetPeer[]): void {
    this.clearUi();
    const list = this.lobbyPeers(peers);
    const hero = HEROES[this.heroIdx] ?? HEROES[0]!;
    this.ui.add(panel(this, 30, 80, 640, 560));
    this.ui.add(text(this, 56, 96, `Phòng: ${this.code.toUpperCase()}`, 34, "#ffcf5a", 800));
    this.ui.add(text(this, 56, 142, "Gửi mã cho bạn bè: mở game → Vào phòng bạn → nhập mã.", 16, "#c8c0b0", 500));
    this.ui.add(
      button(this, 540, 116, 190, 48, "📋 Sao chép mã", () => {
        const msg = `Vào chơi Hero Arena cùng mình! Mã phòng: ${this.code.toUpperCase()}`;
        try {
          void navigator.clipboard.writeText(msg).then(
            () => toast(this, "Đã sao chép lời mời", "#8aff9a", 690),
            () => toast(this, `Mã phòng: ${this.code.toUpperCase()}`, undefined, 690),
          );
        } catch {
          toast(this, `Mã phòng: ${this.code.toUpperCase()}`, undefined, 690);
        }
      }, 0x2f5f8f, 20).root,
    );
    this.ui.add(text(this, 56, 176, `Người chơi (${list.length}/${MAX_PLAYERS})`, 22, "#ffe08a"));
    list.slice(0, 12).forEach((p, i) => {
      const pr = p.presence as LobbyPresence;
      const h = heroById(typeof pr.hr === "string" ? pr.hr : "") ?? HEROES[0]!;
      const y = 214 + i * 34;
      this.ui.add(text(this, 64, y, `${pr.host === 1 ? "👑" : "•"} ${cleanName(pr.n)}${p.isMe && p.sameTab ? " (bạn)" : ""}`, 19, p.isMe ? "#8affc0" : "#e8e0d0", 600));
      this.ui.add(text(this, 420, y, h.nameVi, 18, "#ffcf5a", 500));
    });
    if (list.length > 12) this.ui.add(text(this, 64, 214 + 12 * 34, `… và ${list.length - 12} người nữa`, 16, "#c8c0b0", 500));
    // chọn anh hùng
    this.ui.add(panel(this, 700, 80, 550, 400));
    this.ui.add(text(this, 975, 96, "Anh hùng của bạn", 22, "#ffe08a").setOrigin(0.5, 0));
    const fig = addHeroImage(this, 975, 330, hero.id, null, null, 1.15);
    breathe(this, fig);
    this.ui.add(fig);
    this.ui.add(text(this, 975, 340, `${hero.nameVi} · ${hero.roleVi}`, 22, "#ffcf5a").setOrigin(0.5, 0));
    const change = (d: number) => {
      this.heroIdx = (this.heroIdx + d + HEROES.length) % HEROES.length;
      const id = HEROES[this.heroIdx]?.id ?? "fighter";
      const s = getSave();
      s.lastHero = { heroId: id, gender: "male" };
      persist();
      void this.room?.presence({ hr: id });
      this.renderRoom(this.room?.peers() ?? []);
    };
    this.ui.add(button(this, 790, 400, 100, 56, "◀", () => change(-1), 0x4a4f5a, 28).root);
    this.ui.add(button(this, 1160, 400, 100, 56, "▶", () => change(1), 0x4a4f5a, 28).root);
    // bắt đầu / chờ
    if (this.isHost) {
      const ok = list.length >= MIN_PLAYERS;
      this.ui.add(button(this, 975, 640, 300, 52, "Chơi một mình", () => this.playSolo(), 0x4a4f5a, 22).root);
      const b = button(this, 975, 540, 470, 70, ok ? `⚔ BẮT ĐẦU · ${list.length} người + ${MAX_PLAYERS - Math.min(MAX_PLAYERS, list.length)} máy` : `Cần ít nhất ${MIN_PLAYERS} người`, () => this.hostStart(), 0xc8461e, 24);
      b.setEnabled(ok);
      this.ui.add(b.root);
    } else {
      const hasHost = list.some((p) => (p.presence as LobbyPresence).host === 1);
      this.ui.add(text(this, 975, 520, hasHost ? "Đang chờ chủ phòng bắt đầu…" : Date.now() - this.joinedAt > 4000 ? "Không thấy chủ phòng – kiểm tra lại mã" : "Đang tìm chủ phòng…", 22, "#c8c0b0", 600).setOrigin(0.5, 0));
    }
    if (!this.isHost) this.ui.add(button(this, 975, 640, 260, 52, "Rời phòng", () => void this.back(), 0x6a3a3a, 22).root);
  }

  /** Bỏ phòng, chơi một mình với 19 máy. */
  private playSolo(): void {
    this.unsub?.();
    this.unsub = null;
    const r = this.room;
    this.room = null;
    if (r) void r.leave().catch(() => undefined);
    setNetSession(null);
    this.starting = true;
    this.scene.start("Arena", { heroId: HEROES[this.heroIdx]?.id ?? "fighter", gender: "male" });
  }

  private hostStart(): void {
    if (!this.room) return;
    const list = this.lobbyPeers(this.room.peers()).slice(0, MAX_PLAYERS);
    if (list.length < MIN_PLAYERS) return;
    // chủ phòng đứng đầu, rồi theo thứ tự vào phòng
    list.sort((a, b) => (a.isMe && a.sameTab ? -1 : b.isMe && b.sameTab ? 1 : 0));
    const hs: Array<[string, string, string]> = list.map((p) => {
      const pr = p.presence as LobbyPresence;
      return [p.peer, cleanName(pr.n), heroById(typeof pr.hr === "string" ? pr.hr : "")?.id ?? "fighter"];
    });
    const seed = newMatchSeed();
    void this.room.presence({ st: { sd: seed, hs } });
    const me = list.find((p) => p.isMe && p.sameTab);
    this.startMatch(seed, hs, "h0", me?.peer ?? "", "host");
  }

  private startMatch(seed: number, hs: Array<[string, string, string]>, localId: string, hostPeer: string, role: "host" | "client"): void {
    if (!this.room || this.starting) return;
    this.starting = true;
    this.unsub?.();
    this.unsub = null;
    const humans = hs.map(([peer, name, heroId], i) => ({ id: `h${i}`, name: cleanName(name), heroId, peer }));
    setNetSession({ room: this.room, role, seed, code: this.code, humans, localId, hostPeer });
    const me = humans.find((h) => h.id === localId);
    this.scene.start("Arena", { heroId: me?.heroId ?? "fighter", gender: "male", net: true });
  }

  /** Rời phòng khi quay về sảnh từ nơi khác. */
  static async leave(): Promise<void> {
    await leaveNet();
  }
}
