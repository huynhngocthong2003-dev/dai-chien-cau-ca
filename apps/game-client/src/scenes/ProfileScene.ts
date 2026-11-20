import Phaser from "phaser";
import { FISH_RARITY_COLOR } from "@dccc/game-config";
import { CHARACTER_BY_ID, FISH_BY_ID, FORM_BY_ID } from "@dccc/game-data";
import { ownedFishPower, winRate, type OwnedFish } from "@dccc/shared";
import { GameState } from "../state/GameState.ts";
import * as Social from "../state/social.ts";
import { characterHeadTexture, fishTexture, fishTextureFor } from "../art/textures.ts";
import { Button, fadeIn, formatNum, goTo, modal, panel, toast, txt } from "../ui/widgets.ts";
import { TopBar } from "../ui/TopBar.ts";
import { COLORS } from "../ui/theme.ts";
import { menuBackdrop } from "../ui/backdrop.ts";
import { htmlOverlay } from "../ui/htmlOverlay.ts";
import { hexToInt } from "../art/color.ts";

const pct = (r: number | null) => (r === null ? "chưa đấu" : `${Math.round(r * 100)}% thắng`);

/** Hồ sơ cá nhân: thông tin, cá trưng bày (tỉ lệ thắng), bạn bè. */
export class ProfileScene extends Phaser.Scene {
  private friendBox?: Phaser.GameObjects.Container;
  private code = "";
  private friendships: Social.Friendship[] = [];
  private cards = new Map<string, Social.PlayerCard>();
  private found: Social.PlayerCard[] = [];

  constructor() {
    super("Profile");
  }

  create() {
    this.input.enabled = true;
    fadeIn(this);
    menuBackdrop(this);
    new TopBar(this, { title: "Hồ Sơ & Bạn Bè", onBack: () => goTo(this, "Hub") });
    this.renderMe();
    this.renderFriends();
    if (GameState.online) void this.loadSocial();
  }

  // ------------------------------------------------------------- hồ sơ của tôi
  private renderMe() {
    const s = GameState.save;
    panel(this, 16, 92, 640, 614, 0.92);
    const ch = CHARACTER_BY_ID.get(s.selectedCharacterId)!;
    const ring = this.add.graphics();
    ring.fillStyle(0xffc107).fillCircle(96, 172, 62);
    ring.lineStyle(4, COLORS.outline).strokeCircle(96, 172, 62);
    this.add.image(96, 176, characterHeadTexture(this, ch, s.characters[ch.id]?.equip)).setDisplaySize(120, 144);
    txt(this, 176, 120, s.name, 32, { color: COLORS.textGold });
    txt(this, 176, 162, `Cấp ${s.level} · ${ch.name}`, 20, { weight: "700" });
    const codeT = txt(this, 176, 194, GameState.online ? "Mã kết bạn: …" : "Đăng nhập để có mã kết bạn", 18, { weight: "700", color: "#80d8ff" });
    if (GameState.online) {
      void Social.myCard(GameState.online.id).then((c) => {
        if (c && codeT.active) {
          this.code = c.friend_code;
          codeT.setText(`Mã kết bạn: ${c.friend_code}`);
        }
      }).catch(() => codeT.active && codeT.setText("Mã kết bạn: (chưa tải được)"));
    }
    new Button(this, 560, 140, 150, 50, "👤 Tài khoản", { color: COLORS.blue, fontSize: 18, onClick: () => goTo(this, "Account") });
    const dw = s.stats.dmWins ?? 0;
    const dl = s.stats.dmLosses ?? 0;
    const stats: [string, string][] = [
      ["🐟 Cá đã câu", formatNum(s.stats.totalCaught)],
      ["👑 Boss", formatNum(s.stats.bossesCaught)],
      ["📖 Loài", String(Object.keys(s.stats.species).length)],
      ["⚔ Sinh tử", `${dw}T – ${dl}B`],
    ];
    stats.forEach(([k, v], i) => {
      const x = 36 + i * 154;
      const g = this.add.graphics();
      g.fillStyle(0x0a1628, 0.9).fillRoundedRect(x, 250, 146, 70, 12);
      txt(this, x + 73, 272, k, 15, { weight: "700", color: COLORS.textDim, align: "center" }).setOrigin(0.5);
      txt(this, x + 73, 300, v, 22, { align: "center" }).setOrigin(0.5);
    });
    txt(this, 36, 336, "🏅 Cá trưng bày (người khác xem được tỉ lệ thắng)", 19, { color: COLORS.textGold });
    const show = s.showcase.map((u) => s.fishes.find((f) => f.uid === u)).filter((o): o is OwnedFish => !!o);
    for (let i = 0; i < 3; i++) {
      const o = show[i];
      const x = 36 + i * 206;
      if (o) this.showFish(x, 370, 196, 236, {
        fishId: o.fishId,
        level: o.level,
        stars: o.stars,
        form: o.form ?? null,
        wins: o.wins ?? 0,
        losses: o.losses ?? 0,
        power: ownedFishPower(FISH_BY_ID.get(o.fishId)!, o, o.form ? FORM_BY_ID.get(o.form) : null),
      });
      if (o) {
        // nút gỡ trực tiếp trên ô trưng bày
        new Button(this, x + 172, 394, 64, 36, "✖ Gỡ", {
          color: COLORS.red,
          fontSize: 14,
          onClick: () => {
            const r = GameState.setShowcase(GameState.save.showcase.filter((u) => u !== o.uid));
            if (!r.ok) return toast(this, r.error, COLORS.red);
            toast(this, "Đã gỡ khỏi trưng bày", COLORS.green);
            this.scene.restart();
          },
        });
      } else {
        const g = this.add.graphics();
        g.fillStyle(0x0a1628, 0.6).fillRoundedRect(x, 370, 196, 236, 14);
        g.lineStyle(3, 0x5fb3ff, 0.5).strokeRoundedRect(x, 370, 196, 236, 14);
        txt(this, x + 98, 470, "Trống", 20, { color: COLORS.textDim }).setOrigin(0.5);
        new Button(this, x + 98, 520, 140, 44, "➕ Thêm cá", { color: COLORS.green, fontSize: 17, onClick: () => this.pickShowcase() });
      }
    }
    new Button(this, 336, 660, 300, 58, "✏ Chọn cá trưng bày", { color: COLORS.orange, fontSize: 22, onClick: () => this.pickShowcase() });
  }

  private showFish(x: number, y: number, w: number, h: number, f: Social.ShowcaseFish, into?: Phaser.GameObjects.Container) {
    const def = FISH_BY_ID.get(f.fishId);
    if (!def) return;
    const objs: Phaser.GameObjects.GameObject[] = [];
    const g = this.add.graphics();
    g.fillGradientStyle(0x1a3d66, 0x1a3d66, 0x0d2340, 0x0d2340, 0.95).fillRoundedRect(x, y, w, h, 14);
    g.lineStyle(3, hexToInt(FISH_RARITY_COLOR[def.rarity])).strokeRoundedRect(x, y, w, h, 14);
    objs.push(g);
    const fm = f.form ? FORM_BY_ID.get(f.form) : null;
    if (fm) objs.push(this.add.image(x + w / 2, y + h * 0.33, "p_spark").setTint(hexToInt(fm.glow)).setScale(5).setAlpha(0.4));
    objs.push(this.add.image(x + w / 2, y + h * 0.33, fishTextureFor(this, def, f.form)).setDisplaySize(w * 0.85, w * 0.53));
    const r = f.wins + f.losses ? f.wins / (f.wins + f.losses) : null;
    objs.push(
      txt(this, x + w / 2, y + h * 0.7, `${def.name}${fm ? `\n${fm.name}` : ""}\nLv.${f.level} · ⚔${formatNum(f.power)}`, 15, {
        align: "center",
        color: FISH_RARITY_COLOR[def.rarity],
      }).setOrigin(0.5),
    );
    objs.push(txt(this, x + w / 2, y + h - 18, `${pct(r)} (${f.wins}T/${f.losses}B)`, 14, { align: "center", weight: "700", color: "#b9f6ca" }).setOrigin(0.5));
    into?.add(objs);
  }

  private pickShowcase() {
    const sel = [...GameState.save.showcase];
    const m = modal(this, 1060, 600, "Chọn tối đa 3 cá trưng bày", () => this.time.delayedCall(160, () => this.scene.restart()));
    // cá đang trưng bày luôn ở đầu danh sách để gỡ được
    const pw = (o: OwnedFish) => ownedFishPower(FISH_BY_ID.get(o.fishId)!, o, o.form ? FORM_BY_ID.get(o.form) : null);
    const all = GameState.save.fishes.filter((f) => FISH_BY_ID.has(f.fishId));
    const list = [
      ...sel.map((u) => all.find((f) => f.uid === u)).filter((o): o is OwnedFish => !!o),
      ...all.filter((f) => !sel.includes(f.uid)).sort((a, b) => pw(b) - pw(a)),
    ].slice(0, 18);
    const box = this.add.container(0, 0);
    m.root.add(box);
    const draw = () => {
      box.removeAll(true);
      list.forEach((o, i) => {
        const f = FISH_BY_ID.get(o.fishId)!;
        const x = m.x + 26 + (i % 6) * 168;
        const y = m.y + 74 + Math.floor(i / 6) * 160;
        const on = sel.includes(o.uid);
        const g = this.add.graphics();
        g.fillStyle(on ? 0x2a5a8a : 0x0d2340, 1).fillRoundedRect(x, y, 158, 150, 12);
        g.lineStyle(on ? 4 : 2, on ? 0xffeb3b : hexToInt(FISH_RARITY_COLOR[f.rarity])).strokeRoundedRect(x, y, 158, 150, 12);
        const im = this.add.image(x + 79, y + 56, fishTexture(this, f)).setDisplaySize(130, 80);
        const t = txt(this, x + 79, y + 122, `${f.name} Lv.${o.level}\n${pct(winRate(o))}`, 13, { align: "center", weight: "700" }).setOrigin(0.5);
        const z = this.add.zone(x + 79, y + 75, 158, 150).setInteractive({ useHandCursor: true });
        z.on("pointerup", () => {
          const k = sel.indexOf(o.uid);
          if (k >= 0) sel.splice(k, 1);
          else {
            // đủ 3 con thì thay con chọn sớm nhất
            if (sel.length >= 3) sel.shift();
            sel.push(o.uid);
          }
          draw();
        });
        box.add([g, im, t, z]);
      });
    };
    draw();
    m.root.add(new Button(this, m.x + 150, m.y + m.h - 44, 200, 52, "🗑 Gỡ hết", { color: COLORS.grey, fontSize: 20, onClick: () => ((sel.length = 0), draw()) }));
    m.root.add(txt(this, m.x + m.w - 30, m.y + m.h - 44, "Chạm cá đã chọn để gỡ.\nChọn con thứ 4 sẽ thay con cũ nhất.", 14, { weight: "700", color: COLORS.textDim, align: "right" }).setOrigin(1, 0.5));
    m.root.add(
      new Button(this, m.x + m.w / 2, m.y + m.h - 44, 240, 58, "💾 Lưu", {
        color: COLORS.green,
        fontSize: 24,
        onClick: () => {
          const r = GameState.setShowcase(sel);
          if (!r.ok) return toast(this, r.error, COLORS.red);
          toast(this, "Đã cập nhật cá trưng bày", COLORS.green);
          m.close();
        },
      }),
    );
  }

  // ------------------------------------------------------------- bạn bè
  private async loadSocial() {
    try {
      this.friendships = await Social.listFriendships();
      const me = GameState.online!.id;
      const ids = this.friendships.map((f) => (f.requester === me ? f.addressee : f.requester));
      (await Social.cardsByIds(ids)).forEach((c) => this.cards.set(c.user_id, c));
      if (this.scene.isActive()) this.renderFriends();
    } catch (e) {
      toast(this, `Không tải được bạn bè: ${(e as Error).message}`, COLORS.red);
    }
  }

  private renderFriends() {
    this.friendBox?.destroy(true);
    const c = this.add.container(0, 0);
    this.friendBox = c;
    c.add(panel(this, 672, 92, 592, 614, 0.92));
    c.add(txt(this, 968, 120, "👥 Bạn bè", 28, { color: COLORS.textGold }).setOrigin(0.5));
    if (!GameState.online) {
      c.add(txt(this, 968, 330, "Đăng nhập tài khoản online để kết bạn,\nxem hồ sơ và thách đấu sinh tử với người chơi khác.", 19, { align: "center", weight: "700" }).setOrigin(0.5));
      c.add(new Button(this, 968, 440, 280, 62, "👤 Đăng nhập", { color: COLORS.blue, fontSize: 24, onClick: () => goTo(this, "Account") }));
      return;
    }
    htmlOverlay(
      this,
      c,
      890,
      170,
      380,
      46,
      `<input id="pf-search" maxlength="24" placeholder="Nhập mã kết bạn hoặc tên" style="width:100%;height:100%;box-sizing:border-box;font:700 18px 'Baloo 2',sans-serif;padding:4px 10px;border-radius:10px;border:3px solid #1b1530;background:#fff8e1;color:#1b1530">`,
    );
    c.add(
      new Button(this, 1170, 170, 150, 46, "🔍 Tìm", {
        color: COLORS.blue,
        fontSize: 19,
        onClick: async () => {
          const q = (document.getElementById("pf-search") as HTMLInputElement | null)?.value ?? "";
          try {
            this.found = await Social.searchPlayers(q, GameState.online!.id);
            if (!this.found.length) toast(this, "Không tìm thấy người chơi");
            this.renderFriends();
          } catch (e) {
            toast(this, (e as Error).message, COLORS.red);
          }
        },
      }),
    );
    const me = GameState.online.id;
    const other = (f: Social.Friendship) => (f.requester === me ? f.addressee : f.requester);
    type Row = { card: Social.PlayerCard; kind: "found" | "incoming" | "outgoing" | "friend"; fs?: Social.Friendship };
    const rows: Row[] = [];
    for (const p of this.found) {
      const fs = this.friendships.find((f) => other(f) === p.user_id);
      if (!fs) rows.push({ card: p, kind: "found" });
    }
    for (const f of this.friendships) {
      const card = this.cards.get(other(f)) ?? this.found.find((p) => p.user_id === other(f));
      if (!card) continue;
      rows.push({ card, fs: f, kind: f.status === "accepted" ? "friend" : f.addressee === me ? "incoming" : "outgoing" });
    }
    const order = { incoming: 0, found: 1, friend: 2, outgoing: 3 };
    rows.sort((a, b) => order[a.kind] - order[b.kind]);
    if (!rows.length) c.add(txt(this, 968, 330, "Chưa có bạn bè.\nGửi mã kết bạn của bạn cho bạn bè,\nhoặc tìm theo tên / mã ở trên.", 18, { align: "center", weight: "700", color: COLORS.textDim }).setOrigin(0.5));
    rows.slice(0, 7).forEach((r, i) => {
      const y = 214 + i * 68;
      const g = this.add.graphics();
      g.fillStyle(r.kind === "incoming" ? 0x4a3a10 : 0x0a1628, 0.95).fillRoundedRect(690, y, 556, 60, 12);
      c.add(g);
      const tag = { found: "🔍", incoming: "📩", outgoing: "⏳", friend: "👥" }[r.kind];
      c.add(txt(this, 704, y + 18, `${tag} ${r.card.display_name}`, 19).setOrigin(0, 0.5));
      c.add(txt(this, 704, y + 44, `Lv.${r.card.level} · ⚔ ${r.card.stats.dmWins ?? 0}T/${r.card.stats.dmLosses ?? 0}B`, 14, { weight: "700", color: COLORS.textDim }).setOrigin(0, 0.5));
      const btn = (bx: number, w: number, label: string, color: number, fn: () => Promise<void> | void) =>
        c.add(new Button(this, bx, y + 30, w, 44, label, { color, fontSize: 16, onClick: () => void Promise.resolve(fn()).catch((e: Error) => toast(this, e.message, COLORS.red)) }));
      btn(1010, 76, "👁 Xem", COLORS.blue, () => this.viewCard(r.card));
      if (r.kind === "found")
        btn(1150, 170, "➕ Kết bạn", COLORS.green, async () => {
          await Social.sendFriendRequest(me, r.card.user_id);
          toast(this, "Đã gửi lời mời kết bạn", COLORS.green);
          await this.loadSocial();
        });
      if (r.kind === "incoming") {
        btn(1110, 100, "✔ Nhận", COLORS.green, async () => {
          await Social.acceptFriend(r.fs!.id);
          toast(this, `Đã kết bạn với ${r.card.display_name}`, COLORS.green);
          await this.loadSocial();
        });
        btn(1205, 70, "✖", COLORS.red, async () => {
          await Social.removeFriend(r.fs!.id);
          await this.loadSocial();
        });
      }
      if (r.kind === "outgoing") c.add(txt(this, 1150, y + 30, "Đang chờ…", 16, { color: COLORS.textDim, weight: "700" }).setOrigin(0.5));
      if (r.kind === "friend") {
        btn(1110, 100, "⚔ Đấu", COLORS.red, () => goTo(this, "DeathMatch", { mode: "pvp", opponent: r.card }));
        btn(1205, 70, "🗑", COLORS.grey, async () => {
          await Social.removeFriend(r.fs!.id);
          await this.loadSocial();
        });
      }
    });
    if (this.code) c.add(txt(this, 968, 686, `Mã của bạn: ${this.code} – gửi cho bạn bè để kết bạn`, 16, { weight: "700", color: "#80d8ff" }).setOrigin(0.5));
  }

  private viewCard(p: Social.PlayerCard) {
    const m = modal(this, 760, 520, `Hồ sơ ${p.display_name}`);
    m.root.add(txt(this, m.x + m.w / 2, m.y + 84, `Cấp ${p.level} · Cá đã câu ${formatNum(p.stats.caught ?? 0)} · Sinh tử ${p.stats.dmWins ?? 0}T/${p.stats.dmLosses ?? 0}B`, 19, { align: "center", weight: "700" }).setOrigin(0.5));
    if (!p.showcase.length) m.root.add(txt(this, m.x + m.w / 2, m.y + 260, "Người chơi chưa trưng bày cá nào", 20, { color: COLORS.textDim }).setOrigin(0.5));
    p.showcase.slice(0, 3).forEach((f, i) => this.showFish(m.x + 40 + i * 232, m.y + 120, 216, 260, f, m.root));
    m.root.add(new Button(this, m.x + m.w / 2, m.y + m.h - 48, 260, 58, "⚔ Thách đấu sinh tử", { color: COLORS.red, fontSize: 22, onClick: () => goTo(this, "DeathMatch", { mode: "pvp", opponent: p }) }));
  }
}
