import Phaser from "phaser";
import { CHAR_RARITY_COLOR } from "@dccc/game-config";
import { CHARACTERS, FISH_BY_ID } from "@dccc/game-data";
import { DIFFICULTY, charMaxLevel, charXpToNext, roastedXp, type OwnedFish } from "@dccc/shared";
import { GameState } from "../state/GameState.ts";
import * as Social from "../state/social.ts";
import { pvpCall, type PvpRoom, type PvpStake } from "../state/pvp.ts";
import { characterHeadTexture, roastedFishTexture } from "../art/textures.ts";
import { fishPickCard } from "../ui/fishPickCard.ts";
import { htmlOverlay } from "../ui/htmlOverlay.ts";
import { Bar, Button, fadeIn, formatNum, goTo, modal, panel, toast, txt } from "../ui/widgets.ts";
import { TopBar } from "../ui/TopBar.ts";
import { COLORS } from "../ui/theme.ts";
import { menuBackdrop } from "../ui/backdrop.ts";
import { hexToInt } from "../art/color.ts";
import { Sfx } from "../audio/Sfx.ts";
import { fishPower as power } from "../ui/fishPickCard.ts";

type Mode = "arena" | "pvp" | "roasted";

/**
 * Đấu Cá: chọn & xếp 3 cá → trận 3vs3 theo lượt (canh lực) với MÁY, hoặc vào PHÒNG đấu với NGƯỜI.
 * Thua (không phải giao hữu) → mất con cá lực chiến THẤP NHẤT trong đội; cá khoá 🔒 không được ra trận.
 */
export class DeathMatchScene extends Phaser.Scene {
  private mode: Mode = "arena";
  private team: string[] = [];
  private page = 0;
  private opponent: Social.PlayerCard | null = null;
  private stake: PvpStake = "death";
  private friends: Social.PlayerCard[] | null = null;
  private busy = false;
  private body?: Phaser.GameObjects.Container;
  private tabs: Button[] = [];

  constructor() {
    super("DeathMatch");
  }

  init(data: { mode?: Mode; opponent?: Social.PlayerCard }) {
    const m = data.mode as string | undefined;
    this.mode = m === "pvp" || m === "roasted" ? m : data.opponent ? "pvp" : "arena";
    this.opponent = data.opponent ?? null;
    this.team = this.team.filter((u) => GameState.save.fishes.some((f) => f.uid === u && !f.locked));
    this.busy = false;
  }

  create() {
    this.input.enabled = true;
    fadeIn(this);
    menuBackdrop(this);
    new TopBar(this, { title: "Đấu Cá", onBack: () => goTo(this, "Hub") });
    const defs: [Mode, string][] = [
      ["arena", "⚔ Đấu 3vs3 với máy"],
      ["pvp", "👥 Đấu với người"],
      ["roasted", `🍖 Cá nướng (${GameState.save.roasted.length})`],
    ];
    this.tabs = defs.map(
      ([m, label], i) =>
        new Button(this, 124 + i * 236, 116, 228, 50, label, {
          color: COLORS.blue,
          fontSize: 17,
          onClick: () => {
            this.mode = m;
            this.render();
          },
        }),
    );
    this.render();
  }

  private render() {
    this.tabs.forEach((b, i) => b.setColor(["arena", "pvp", "roasted"][i] === this.mode ? COLORS.orange : COLORS.blue));
    this.tabs[2]!.setText(`🍖 Cá nướng (${GameState.save.roasted.length})`);
    this.body?.destroy(true);
    const c = this.add.container(0, 0);
    this.body = c;
    if (this.mode === "roasted") return this.renderRoasted(c);
    if (this.mode === "pvp") return this.renderPvp(c);
    this.renderPicker(c);
    this.renderSlots(c);
    this.renderArena(c);
  }

  // ---------------------------------------------------------------- chọn đội
  private candidates(): OwnedFish[] {
    // thua có thể mất cá → cá đã khoá 🔒 được bảo vệ, không ra trận
    return GameState.save.fishes.filter((f) => !f.locked && FISH_BY_ID.has(f.fishId)).sort((a, b) => power(b) - power(a));
  }

  private fishCard(c: Phaser.GameObjects.Container, x: number, y: number, w: number, h: number, o: OwnedFish, onClick: () => void, badge?: string) {
    fishPickCard(this, c, x, y, w, h, o, onClick, badge);
  }

  private renderPicker(c: Phaser.GameObjects.Container) {
    const list = this.candidates();
    const per = 12;
    const pages = Math.max(1, Math.ceil(list.length / per));
    this.page = Math.min(this.page, pages - 1);
    c.add(txt(this, 20, 152, `Chọn 3 cá theo thứ tự ra sân (${list.length} cá – cá khoá 🔒 được bảo vệ)`, 15, { weight: "700", color: COLORS.textDim }));
    if (list.length < 3) {
      c.add(txt(this, 420, 300, "Cần ít nhất 3 con cá không khoá.\nHãy đi câu thêm!", 26, { align: "center" }).setOrigin(0.5));
      return;
    }
    list.slice(this.page * per, this.page * per + per).forEach((o, i) => {
      const x = 20 + (i % 6) * 136;
      const y = 178 + Math.floor(i / 6) * 150;
      const idx = this.team.indexOf(o.uid);
      this.fishCard(c, x, y, 128, 142, o, () => {
        if (idx >= 0) this.team.splice(idx, 1);
        else if (this.team.length < 3) this.team.push(o.uid);
        else return toast(this, "Đã đủ 3 con. Bấm vào ô bên dưới để bỏ bớt.");
        this.render();
      }, idx >= 0 ? String(idx + 1) : undefined);
    });
    if (pages > 1) {
      c.add(new Button(this, 700, 152, 56, 32, "◀", { color: COLORS.blue, fontSize: 16, disabled: this.page === 0, onClick: () => ((this.page -= 1), this.render()) }));
      c.add(new Button(this, 770, 152, 56, 32, "▶", { color: COLORS.blue, fontSize: 16, disabled: this.page >= pages - 1, onClick: () => ((this.page += 1), this.render()) }));
    }
  }

  private renderSlots(c: Phaser.GameObjects.Container) {
    c.add(txt(this, 20, 488, "Đội hình của bạn", 20, { color: COLORS.textGold }));
    for (let i = 0; i < 3; i++) {
      const x = 20 + i * 274;
      const y = 518;
      const uid = this.team[i];
      const o = uid ? GameState.save.fishes.find((f) => f.uid === uid) : undefined;
      if (o) {
        this.fishCard(c, x, y, 262, 182, o, () => {
          this.team.splice(i, 1);
          this.render();
        }, String(i + 1));
      } else {
        const g = this.add.graphics();
        g.fillStyle(0x0a1628, 0.7).fillRoundedRect(x, y, 262, 182, 14);
        g.lineStyle(3, 0x5fb3ff, 0.6).strokeRoundedRect(x, y, 262, 182, 14);
        c.add(g);
        c.add(txt(this, x + 131, y + 91, `Trận ${i + 1}\nChạm cá ở trên để chọn`, 18, { align: "center", color: COLORS.textDim }).setOrigin(0.5));
      }
    }
  }

  // ---------------------------------------------------------------- đấu 3vs3 theo lượt (canh lực)
  private arenaLevel: "easy" | "normal" | "hard" = "normal";

  private renderArena(c: Phaser.GameObjects.Container) {
    c.add(panel(this, 852, 92, 412, 614, 0.95));
    c.add(txt(this, 1058, 120, "⚔ Luyện tập 3vs3 với máy", 26, { color: COLORS.textGold, align: "center" }).setOrigin(0.5));
    c.add(txt(this, 1058, 148, "Chọn độ giỏi của MÁY:", 15, { weight: "700", align: "center" }).setOrigin(0.5));
    const lv: ["easy" | "normal" | "hard", string][] = [
      ["easy", "Dễ"],
      ["normal", "Thường"],
      ["hard", "Khó"],
    ];
    lv.forEach(([k, label], i) =>
      c.add(
        new Button(this, 920 + i * 136, 184, 126, 46, label, {
          color: k === this.arenaLevel ? COLORS.orange : COLORS.blue,
          fontSize: 20,
          onClick: () => {
            this.arenaLevel = k;
            this.render();
          },
        }),
      ),
    );
    const rules = [
      "• Cá NHANH hơn đánh trước, sau đó luân phiên",
      "• Thanh canh lực: XANH ×1.25 · VÀNG ×0.7 · ĐỎ hụt",
      "• Khắc hệ ×1.5 · bị khắc ×0.75",
      "• Kỹ năng riêng mỗi cá (có hồi chiêu)",
      "• Phòng thủ: giảm 40% đòn kế tiếp",
      "• Hạ đủ 3 cá đối phương để thắng",
      "",
      `🏆 Thắng: +${DIFFICULTY[this.arenaLevel].gold} 🪙 +${DIFFICULTY[this.arenaLevel].xp} KN + 🍖 cá nướng`,
      "💔 Thua / bỏ cuộc: MẤT con cá lực chiến THẤP NHẤT trong đội",
      GameState.online ? "☁ Trận do máy chủ làm trọng tài" : "💾 Chơi không tài khoản: trận chạy trên máy",
    ];
    c.add(txt(this, 872, 220, rules.join("\n"), 16, { weight: "700", wrap: 372 }).setLineSpacing(5));
    const ready = this.team.length === 3;
    const go = new Button(this, 1058, 640, 330, 70, "⚔ VÀO TRẬN", {
      color: COLORS.red,
      fontSize: 30,
      disabled: !ready,
      onClick: () => goTo(this, "Combat3", { team: [...this.team], level: this.arenaLevel }),
    });
    go.on("disabled-click", () => toast(this, "Hãy chọn đủ 3 con cá (thứ tự chọn = thứ tự xuất trận)"));
    c.add(go);
    if (ready) this.tweens.add({ targets: go, scale: 1.05, duration: 600, yoyo: true, repeat: -1 });
  }

  // ---------------------------------------------------------------- đấu với người (phòng)
  private renderPvp(c: Phaser.GameObjects.Container) {
    c.add(panel(this, 20, 150, 820, 556, 0.95));
    c.add(txt(this, 430, 182, "👥 Đấu 3vs3 với người", 28, { color: COLORS.textGold, align: "center" }).setOrigin(0.5));
    if (!GameState.online) {
      c.add(txt(this, 430, 360, "Cần đăng nhập tài khoản để đấu với người chơi khác.\nTrận do máy chủ làm trọng tài.", 22, { align: "center", weight: "700" }).setOrigin(0.5));
      c.add(new Button(this, 430, 470, 300, 64, "🔐 Đăng nhập", { color: COLORS.green, fontSize: 24, onClick: () => goTo(this, "Account") }));
      this.renderPvpRules(c);
      return;
    }
    // mức cược của phòng
    const stakes: [PvpStake, string][] = [
      ["death", "💀 Sinh tử"],
      ["friendly", "🤝 Giao hữu"],
    ];
    stakes.forEach(([k, label], i) =>
      c.add(
        new Button(this, 300 + i * 260, 236, 240, 50, label, {
          color: k === this.stake ? COLORS.orange : COLORS.blue,
          fontSize: 20,
          onClick: () => {
            this.stake = k;
            this.render();
          },
        }),
      ),
    );
    c.add(
      txt(this, 430, 276, this.stake === "death" ? "Thua mất con cá lực chiến THẤP NHẤT · thắng nhận cá đó nướng" : "Không mất cá, không thưởng – đấu cho vui", 15, {
        align: "center",
        weight: "700",
        color: this.stake === "death" ? "#ff8a80" : "#b9f6ca",
      }).setOrigin(0.5),
    );
    c.add(new Button(this, 230, 336, 360, 70, "➕ Tạo Phòng", { color: COLORS.green, fontSize: 28, onClick: () => this.createRoom(null) }));
    c.add(new Button(this, 630, 336, 360, 70, "🔑 Vào bằng mã phòng", { color: COLORS.purple, fontSize: 24, onClick: () => this.joinByCode() }));
    // mời bạn bè
    c.add(txt(this, 44, 392, "Mời bạn bè (phòng riêng – chỉ người được mời vào được):", 16, { weight: "700", color: COLORS.textDim }));
    const list: Social.PlayerCard[] = [];
    if (this.opponent) list.push(this.opponent);
    for (const f of this.friends ?? []) if (!list.some((x) => x.user_id === f.user_id)) list.push(f);
    if (this.friends === null) void this.loadFriends();
    if (!list.length) {
      c.add(txt(this, 430, 520, this.friends === null ? "Đang tải danh sách bạn…" : "Chưa có bạn bè – kết bạn ở Hồ sơ, hoặc gửi MÃ PHÒNG cho người khác.", 18, { align: "center", color: COLORS.textDim }).setOrigin(0.5));
    }
    list.slice(0, 5).forEach((p, i) => {
      const y = 420 + i * 56;
      const g = this.add.graphics();
      g.fillStyle(p === this.opponent ? 0x4a3a10 : 0x0a1628, 0.95).fillRoundedRect(40, y, 780, 48, 10);
      c.add(g);
      c.add(txt(this, 60, y + 24, `${p === this.opponent ? "⭐ " : "👥 "}${p.display_name}  ·  Cấp ${p.level}`, 19, { weight: "700" }).setOrigin(0, 0.5));
      c.add(new Button(this, 740, y + 24, 140, 40, "⚔ Mời", { color: COLORS.red, fontSize: 18, onClick: () => this.createRoom(p) }));
    });
    this.renderPvpRules(c);
  }

  private renderPvpRules(c: Phaser.GameObjects.Container) {
    c.add(panel(this, 852, 150, 412, 556, 0.95));
    c.add(txt(this, 1058, 182, "📜 Quy tắc", 26, { color: COLORS.textGold, align: "center" }).setOrigin(0.5));
    const rules = [
      "• Phòng chờ 60 giây – gửi mã 6 ký tự hoặc mời bạn",
      "• Đủ 2 người → 30 giây chọn 3 cá BÍ MẬT (máy chủ giữ kín đến khi vào trận)",
      "• Hết 30 giây còn bên chưa chọn đủ → huỷ trận",
      "• Cá nhanh hơn đi trước, luân phiên; mỗi lượt 20 giây",
      "• Không đánh 3 lượt liên tiếp → xử thua",
      "• Thoát giữa trận = bỏ cuộc = THUA",
      "• Mất mạng: game tự kết nối lại",
      "• Sinh tử: thua mất cá lực chiến THẤP NHẤT; cá khoá 🔒 không ra trận",
      "• Đồng hồ & kết quả theo máy chủ",
    ];
    c.add(txt(this, 872, 214, rules.join("\n"), 15, { weight: "700", wrap: 372 }).setLineSpacing(6));
  }

  private async loadFriends() {
    if (!GameState.online) return;
    this.friends = [];
    try {
      const me = GameState.online.id;
      const fs = (await Social.listFriendships()).filter((f) => f.status === "accepted");
      this.friends = await Social.cardsByIds(fs.map((f) => (f.requester === me ? f.addressee : f.requester)));
    } catch {
      /* danh sách rỗng */
    }
    if (this.mode === "pvp" && this.scene.isActive()) this.render();
  }

  private async createRoom(invitee: Social.PlayerCard | null) {
    if (this.busy) return;
    this.busy = true;
    try {
      const err = await GameState.syncNow(); // máy chủ đọc đội hình từ bản lưu mới nhất
      if (err) throw new Error(`Chưa đồng bộ được bản lưu: ${err}`);
      const room = await pvpCall({ op: "create", stake: this.stake, invitee: invitee?.user_id ?? null });
      goTo(this, "PvpRoom", { room, inviteeName: invitee?.display_name ?? null });
    } catch (e) {
      toast(this, (e as Error).message, COLORS.red);
      this.busy = false;
    }
  }

  private joinByCode() {
    const m = modal(this, 560, 300, "Vào bằng mã phòng");
    const box = htmlOverlay(
      this,
      m.root,
      640,
      m.y + 130,
      300,
      56,
      `<input maxlength="6" placeholder="MÃ PHÒNG" style="width:100%;height:100%;box-sizing:border-box;font:800 26px 'Baloo 2',sans-serif;letter-spacing:5px;text-transform:uppercase;text-align:center;border-radius:12px;border:3px solid #1b1530;background:#fff8e1;color:#1b1530">`,
    );
    const input = box.querySelector("input") as HTMLInputElement;
    setTimeout(() => input.focus(), 50);
    const go = () => {
      const code = input.value.trim().toUpperCase();
      if (!/^[A-Z0-9]{6}$/.test(code)) return toast(this, "Mã phòng gồm 6 ký tự", COLORS.red);
      m.close();
      void joinRoom(this, { code });
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") go();
    });
    m.root.add(new Button(this, 640, m.y + 232, 240, 60, "Vào phòng", { color: COLORS.green, fontSize: 24, onClick: go }));
  }

  // ---------------------------------------------------------------- cá nướng
  private renderRoasted(c: Phaser.GameObjects.Container) {
    const list = GameState.save.roasted;
    c.add(panel(this, 20, 150, 1240, 556, 0.92));
    c.add(txt(this, 640, 182, "🍖 Cá nướng – cho nhân vật ăn để nhận kinh nghiệm", 24, { color: COLORS.textGold, align: "center" }).setOrigin(0.5));
    if (!list.length) {
      c.add(txt(this, 640, 420, "Chưa có cá nướng.", 22, { align: "center", weight: "700" }).setOrigin(0.5));
      return;
    }
    list.slice(0, 12).forEach((r, i) => {
      const f = FISH_BY_ID.get(r.fishId);
      if (!f) return;
      const x = 50 + (i % 6) * 200;
      const y = 230 + Math.floor(i / 6) * 230;
      const g = this.add.graphics();
      g.fillGradientStyle(0x5d2b0a, 0x5d2b0a, 0x2a1205, 0x2a1205, 0.95).fillRoundedRect(x, y, 186, 210, 14);
      g.lineStyle(3, 0xff8f00).strokeRoundedRect(x, y, 186, 210, 14);
      c.add(g);
      c.add(this.add.image(x + 93, y + 80, roastedFishTexture(this, f)).setDisplaySize(176, 110));
      c.add(this.add.particles(x + 93, y + 60, "p_ember", { speedY: { min: -40, max: -15 }, x: { min: -50, max: 50 }, lifespan: 1200, frequency: 260, scale: { start: 0.8, end: 0 }, tint: 0xbdbdbd }));
      c.add(txt(this, x + 93, y + 146, `${f.name} nướng\n+${formatNum(roastedXp(r, FISH_BY_ID))} KN nhân vật`, 15, { align: "center", color: "#ffcc80" }).setOrigin(0.5));
      c.add(new Button(this, x + 93, y + 186, 150, 38, "🍽 Cho ăn", { color: COLORS.orange, fontSize: 16, onClick: () => this.feedDialog(r.id) }));
    });
  }

  /** Chọn nhân vật để ăn cá nướng (nhận kinh nghiệm, tự lên cấp). */
  private feedDialog(roastedId: string) {
    const r = GameState.save.roasted.find((x) => x.id === roastedId);
    if (!r) return;
    const xp = roastedXp(r, FISH_BY_ID);
    const m = modal(this, 1040, 560, `Cho nhân vật ăn cá nướng (+${formatNum(xp)} KN)`, () => this.render());
    const owned = CHARACTERS.filter((c) => GameState.save.characters[c.id]).slice(0, 12);
    owned.forEach((ch, i) => {
      const p = GameState.save.characters[ch.id]!;
      const cap = charMaxLevel(p.breakthrough);
      const x = m.x + 28 + (i % 6) * 166;
      const y = m.y + 76 + Math.floor(i / 6) * 226;
      const full = p.level >= cap;
      const g = this.add.graphics();
      g.fillGradientStyle(0x1a3d66, 0x1a3d66, 0x0d2340, 0x0d2340, 1).fillRoundedRect(x, y, 156, 214, 14);
      g.lineStyle(3, hexToInt(CHAR_RARITY_COLOR[ch.rarity])).strokeRoundedRect(x, y, 156, 214, 14);
      m.root.add(g);
      m.root.add(this.add.image(x + 78, y + 70, characterHeadTexture(this, ch, p.equip)).setDisplaySize(104, 125));
      m.root.add(txt(this, x + 78, y + 146, `${ch.name}\nCấp ${p.level}/${cap}`, 15, { align: "center", color: CHAR_RARITY_COLOR[ch.rarity] }).setOrigin(0.5));
      const need = charXpToNext(p.level);
      const bar = new Bar(this, x + 14, y + 176, 128, 14, 0x7c4dff, "");
      bar.set(full ? 1 : Math.min(1, (p.xp ?? 0) / need));
      m.root.add(bar);
      const z = this.add.zone(x + 78, y + 107, 156, 214).setInteractive({ useHandCursor: true });
      z.on("pointerup", () => {
        if (full) return toast(this, `${ch.name} đã đạt cấp tối đa ${cap} – hãy đột phá trước`);
        const res = GameState.eatRoasted(roastedId, ch.id);
        if (!res.ok) return toast(this, res.error, COLORS.red);
        Sfx.levelUp();
        toast(this, `😋 ${ch.name} ăn cá nướng: +${formatNum(res.xp ?? 0)} KN${res.levels ? `, lên ${res.levels} cấp!` : ""}`, COLORS.green);
        m.close();
      });
      m.root.add(z);
    });
  }
}

/** Vào phòng (bằng mã hoặc nhận lời mời) rồi chuyển sang màn phòng. */
export async function joinRoom(scene: Phaser.Scene, key: { code: string } | { id: string }) {
  try {
    const err = await GameState.syncNow();
    if (err) throw new Error(`Chưa đồng bộ được bản lưu: ${err}`);
    const room = await pvpCall<PvpRoom>({ op: "join", ...key });
    goTo(scene, "PvpRoom", { room });
  } catch (e) {
    toast(scene, (e as Error).message, COLORS.red);
  }
}
