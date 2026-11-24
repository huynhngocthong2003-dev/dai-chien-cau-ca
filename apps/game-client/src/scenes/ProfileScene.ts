import Phaser from "phaser";
import { makeScrollArea } from "../ui/scrollArea.ts";
import { FISH_RARITY_COLOR } from "@dccc/game-config";
import { CHARACTER_BY_ID, FISH_BY_ID, FORM_BY_ID, ROD_BY_ID, TITLE_BY_ID } from "@dccc/game-data";
import { CHAR_RARITY_COLOR } from "@dccc/game-config";
import { addFashionFx } from "../art/fashionFx.ts";
import { showPlayerProfile } from "../ui/playerProfile.ts";
import { openChat } from "../ui/chat.ts";
import { ownedFishPower, teamPower, winRate, type OwnedFish } from "@dccc/shared";
import { GameState } from "../state/GameState.ts";
import * as Social from "../state/social.ts";
import { auraTexture, characterHeadTexture, characterTexture, fishTexture, fishDisplayMult, fishTextureFor, rodIconTexture } from "../art/textures.ts";
import { Button, fadeIn, formatNum, goTo, modal, panel, toast, txt } from "../ui/widgets.ts";
import { TopBar } from "../ui/TopBar.ts";
import { COLORS } from "../ui/theme.ts";
import { menuBackdrop } from "../ui/backdrop.ts";
import { htmlOverlay } from "../ui/htmlOverlay.ts";
import { hexToInt } from "../art/color.ts";
import { elementBadge } from "../ui/element.ts";

const pct = (r: number | null) => (r === null ? "chưa đấu" : `${Math.round(r * 100)}% thắng`);

/** Hồ sơ cá nhân: thông tin, cá trưng bày (tỉ lệ thắng), bạn bè. */
export class ProfileScene extends Phaser.Scene {
  private friendBox?: Phaser.GameObjects.Container;
  private code = "";
  private friendships: Social.Friendship[] = [];
  private cards = new Map<string, Social.PlayerCard>();
  private found: Social.PlayerCard[] = [];
  private unread = new Map<string, number>();

  private mode: "profile" | "friends" = "profile";

  constructor() {
    super("Profile");
  }

  init(data: { mode?: "profile" | "friends" }) {
    this.mode = data.mode ?? this.mode;
  }

  create() {
    this.input.enabled = true;
    fadeIn(this);
    menuBackdrop(this);
    new TopBar(this, { title: this.mode === "profile" ? "Hồ Sơ" : "Bạn Bè", onBack: () => goTo(this, "Hub") });
    const sw = () => this.scene.restart({ mode: this.mode === "profile" ? "friends" : "profile" });
    if (this.mode === "profile") {
      this.renderMe();
      new Button(this, 680, 160, 140, 44, "👥 Bạn bè", { color: COLORS.purple, fontSize: 17, onClick: sw }).setDepth(10);
      this.renderModel();
    } else {
      this.renderMyCode();
      new Button(this, 560, 130, 150, 44, "🪪 Hồ sơ", { color: COLORS.purple, fontSize: 18, onClick: sw }).setDepth(10);
      this.renderFriends();
      if (GameState.online) void this.loadSocial();
    }
  }

  // ------------------------------------------------------------- mô hình nhân vật cầm cần (bên phải)
  private renderModel() {
    const s = GameState.save;
    const ch = CHARACTER_BY_ID.get(s.selectedCharacterId)!;
    const rod = ROD_BY_ID.get(s.selectedRodId)!;
    const prog = s.characters[ch.id];
    const equip = prog?.equip ?? {};
    panel(this, 776, 92, 488, 614, 0.92);
    txt(this, 1020, 122, "Nhân vật đang dùng", 22, { color: COLORS.textGold, align: "center" }).setOrigin(0.5);
    const col = hexToInt(CHAR_RARITY_COLOR[ch.rarity]);
    // bục đứng phát sáng + tia sáng
    const rays = this.add.container(1020, 380);
    for (let i = 0; i < 12; i++) rays.add(this.add.image(0, 0, "p_ray").setOrigin(0.5, 0).setAngle(i * 30).setTint(col).setAlpha(0.18).setScale(0.7).setBlendMode(Phaser.BlendModes.ADD));
    this.tweens.add({ targets: rays, angle: 360, duration: 20000, repeat: -1 });
    const ped = this.add.graphics();
    ped.fillStyle(0x000000, 0.35).fillEllipse(1020, 586, 260, 44);
    ped.fillStyle(col, 0.85).fillEllipse(1020, 576, 240, 40);
    ped.fillStyle(0xffffff, 0.25).fillEllipse(1020, 570, 200, 24);
    ped.lineStyle(3, COLORS.outline).strokeEllipse(1020, 576, 240, 40);
    if (prog?.awakened) this.add.image(1020, 580, auraTexture(this, ch)).setOrigin(0.5, 1).setScale(1.55).setAlpha(0.8);
    const k = 1.55;
    const hero = this.add.image(1020, 580, characterTexture(this, ch, equip)).setOrigin(0.5, 1).setScale(k);
    addFashionFx(this, hero, 1020, 580 - 120 * k, k, equip, 1);
    // cần câu cầm trên tay (tay trước ở (112,170) trong khung 200×240)
    const hx = 1020 + (112 - 100) * k;
    const hy = 580 - (240 - 170) * k;
    const rodImg = this.add.image(hx, hy, rodIconTexture(this, rod)).setOrigin(0.1, 0.88).setScale(0.72);
    this.tweens.add({ targets: [hero], y: 574, duration: 1400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: [rodImg], y: hy - 6, angle: -3, duration: 1400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    txt(this, 1020, 616, `${ch.rarity} · ${ch.name}`, 22, { color: CHAR_RARITY_COLOR[ch.rarity], align: "center" }).setOrigin(0.5);
    txt(this, 1020, 644, `🎣 ${rod.name} (${rod.rarity})`, 17, { color: CHAR_RARITY_COLOR[rod.rarity], align: "center" }).setOrigin(0.5);
    new Button(this, 920, 680, 180, 40, "🧑 Đổi nhân vật", { color: COLORS.blue, fontSize: 16, onClick: () => goTo(this, "Characters") });
    new Button(this, 1120, 680, 180, 40, "🎣 Đổi cần câu", { color: COLORS.blue, fontSize: 16, onClick: () => goTo(this, "Rods") });
  }

  // ------------------------------------------------------------- thẻ mã kết bạn (chế độ Bạn bè)
  private renderMyCode() {
    panel(this, 16, 92, 640, 614, 0.92);
    txt(this, 336, 130, "🤝 Kết bạn", 30, { color: COLORS.textGold, align: "center" }).setOrigin(0.5);
    if (!GameState.online) {
      txt(this, 336, 300, "Đăng nhập tài khoản online để có mã kết bạn,\ntìm người chơi và thấy ai đang online.", 19, { align: "center", weight: "700" }).setOrigin(0.5);
      return;
    }
    const codeT = txt(this, 336, 230, "…", 64, { color: "#80d8ff", align: "center" }).setOrigin(0.5);
    txt(this, 336, 180, "Mã kết bạn của bạn", 18, { weight: "700", color: COLORS.textDim, align: "center" }).setOrigin(0.5);
    void Social.myCard(GameState.online.id).then((c) => {
      if (c && codeT.active) {
        this.code = c.friend_code;
        codeT.setText(c.friend_code);
      }
    }).catch(() => codeT.active && codeT.setText("—"));
    new Button(this, 336, 312, 260, 50, "📋 Sao chép mã", {
      color: COLORS.blue,
      fontSize: 20,
      onClick: () => void navigator.clipboard?.writeText(this.code).then(() => toast(this, "Đã sao chép mã kết bạn", COLORS.green), () => toast(this, `Mã: ${this.code}`)),
    });
    txt(this, 336, 440, "Cách kết bạn:\n1. Gửi mã này cho bạn bè (Zalo, Messenger…)\n2. Bạn bè nhập mã hoặc tên bạn vào ô tìm kiếm\n3. Bấm ➕ Kết bạn – bạn bấm ✔ Nhận là xong!\n\n🟢 Chấm xanh = đang online · ⚔ Đấu để thách đấu sinh tử", 18, { weight: "700", align: "center", wrap: 580 }).setOrigin(0.5);
  }

  // ------------------------------------------------------------- hồ sơ của tôi
  private renderMe() {
    const s = GameState.save;
    panel(this, 16, 92, 744, 614, 0.92);
    const ch = CHARACTER_BY_ID.get(s.selectedCharacterId)!;
    const ring = this.add.graphics();
    ring.fillStyle(0xffc107).fillCircle(96, 172, 62);
    ring.lineStyle(4, COLORS.outline).strokeCircle(96, 172, 62);
    this.add.image(96, 176, characterHeadTexture(this, ch, s.characters[ch.id]?.equip)).setDisplaySize(120, 144);
    txt(this, 176, 108, s.name, 30, { color: COLORS.textGold });
    const tt = s.titles.equipped ? TITLE_BY_ID.get(s.titles.equipped) : null;
    txt(this, 176, 146, tt ? `${tt.icon} ${tt.name}` : "🏅 Chưa đeo danh hiệu", 18, { color: tt?.color ?? COLORS.textDim });
    txt(this, 176, 174, `Cấp ${s.level} · ${ch.name}`, 17, { weight: "700" });
    const uid = txt(this, 176, 200, `UID: ${s.playerId}`, 15, { weight: "700", color: COLORS.textDim });
    uid.setInteractive({ useHandCursor: true }).on("pointerup", () => void navigator.clipboard?.writeText(s.playerId).then(() => toast(this, "Đã sao chép UID", COLORS.green), () => undefined));
    const codeT = txt(this, 176, 222, GameState.online ? "Mã kết bạn: …" : "", 15, { weight: "700", color: "#80d8ff" });
    if (GameState.online) {
      void Social.myCard(GameState.online.id).then((c) => {
        if (c && codeT.active) {
          this.code = c.friend_code;
          codeT.setText(`Mã kết bạn: ${c.friend_code}`);
        }
      }).catch(() => codeT.active && codeT.setText(""));
    }
    const dot = this.add.graphics();
    dot.fillStyle(GameState.online ? 0x00e676 : 0x9e9e9e, 1).fillCircle(146, 214, 9).lineStyle(3, COLORS.outline).strokeCircle(146, 214, 9);
    txt(this, 605, 108, GameState.online ? "🟢 Đang online" : "⚪ Chơi ngoại tuyến", 15, { weight: "700", color: GameState.online ? "#69f0ae" : COLORS.textDim, align: "center" }).setOrigin(0.5, 0);
    new Button(this, 530, 160, 140, 44, "👤 Tài khoản", { color: COLORS.blue, fontSize: 17, onClick: () => goTo(this, "Account") });
    const dw = s.stats.dmWins ?? 0;
    const dl = s.stats.dmLosses ?? 0;
    const stats: [string, string][] = [
      ["🐟 Đã câu", formatNum(s.stats.totalCaught)],
      ["👑 Boss", formatNum(s.stats.bossesCaught)],
      ["📖 Loài", String(Object.keys(s.stats.species).length)],
      ["⚔ Sinh tử", `${dw}T–${dl}B`],
      ["💪 Chiến lực", formatNum(teamPower(s, FISH_BY_ID, FORM_BY_ID))],
    ];
    stats.forEach(([k, v], i) => {
      const x = 36 + i * 146;
      const g = this.add.graphics();
      g.fillStyle(0x0a1628, 0.9).fillRoundedRect(x, 250, 138, 70, 12);
      txt(this, x + 69, 272, k, 14, { weight: "700", color: COLORS.textDim, align: "center" }).setOrigin(0.5);
      txt(this, x + 69, 300, v, 20, { align: "center" }).setOrigin(0.5);
    });
    txt(this, 36, 336, "🏅 Cá trưng bày (người khác xem được tỉ lệ thắng)", 19, { color: COLORS.textGold });
    const show = s.showcase.map((u) => s.fishes.find((f) => f.uid === u)).filter((o): o is OwnedFish => !!o);
    for (let i = 0; i < 3; i++) {
      const o = show[i];
      const x = 40 + i * 240;
      if (o) this.showFish(x, 370, 226, 236, {
        fishId: o.fishId,
        level: o.level,
        stars: o.stars,
        element: o.element,
        form: o.form ?? null,
        wins: o.wins ?? 0,
        losses: o.losses ?? 0,
        power: ownedFishPower(FISH_BY_ID.get(o.fishId)!, o, o.form ? FORM_BY_ID.get(o.form) : null),
      });
      if (o) {
        // nút gỡ trực tiếp trên ô trưng bày
        new Button(this, x + 192, 394, 64, 36, "✖ Gỡ", {
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
        g.fillStyle(0x0a1628, 0.6).fillRoundedRect(x, 370, 226, 236, 14);
        g.lineStyle(3, 0x5fb3ff, 0.5).strokeRoundedRect(x, 370, 226, 236, 14);
        txt(this, x + 113, 470, "Trống", 20, { color: COLORS.textDim }).setOrigin(0.5);
        new Button(this, x + 113, 520, 140, 44, "➕ Thêm cá", { color: COLORS.green, fontSize: 17, onClick: () => this.pickShowcase() });
      }
    }
    new Button(this, 388, 660, 300, 58, "✏ Chọn cá trưng bày", { color: COLORS.orange, fontSize: 22, onClick: () => this.pickShowcase() });
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
    objs.push(this.add.image(x + w / 2, y + h * 0.33, fishTextureFor(this, def, f.form, f.stars)).setDisplaySize(w * 0.85 * Math.min(1.1, fishDisplayMult(def, f.stars)), w * 0.53 * Math.min(1.1, fishDisplayMult(def, f.stars))));
    objs.push(elementBadge(this, x + w - 18, y + 18, f.element ?? def.element, 28));
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
    const m = modal(this, 1080, 640, "Chọn tối đa 3 cá trưng bày", () => this.time.delayedCall(160, () => this.scene.restart()));
    // cá đang trưng bày luôn ở đầu danh sách để gỡ được
    const pw = (o: OwnedFish) => ownedFishPower(FISH_BY_ID.get(o.fishId)!, o, o.form ? FORM_BY_ID.get(o.form) : null);
    const all = GameState.save.fishes.filter((f) => FISH_BY_ID.has(f.fishId));
    // TẤT CẢ cá (không còn giới hạn 18 con) – cuộn bằng thanh trượt / lăn chuột / vuốt
    const list = [
      ...sel.map((u) => all.find((f) => f.uid === u)).filter((o): o is OwnedFish => !!o),
      ...all.filter((f) => !sel.includes(f.uid)).sort((a, b) => pw(b) - pw(a)),
    ];
    const box = this.add.container(0, 0);
    m.root.add(box);
    const top = m.y + 70;
    const bottom = m.y + m.h - 84;
    const cards: { uid: string; g: Phaser.GameObjects.Graphics; x: number; y: number; col: number }[] = [];
    const paint = () => {
      for (const c of cards) {
        const on = sel.includes(c.uid);
        c.g.clear().fillStyle(on ? 0x2a5a8a : 0x0d2340, 1).fillRoundedRect(c.x, c.y, 158, 150, 12);
        c.g.lineStyle(on ? 4 : 2, on ? 0xffeb3b : c.col).strokeRoundedRect(c.x, c.y, 158, 150, 12);
      }
      countT.setText(`Đã chọn ${sel.length}/3 · ${list.length} con cá`);
    };
    let area: { dragged: () => boolean } | null = null;
    list.forEach((o, i) => {
      const f = FISH_BY_ID.get(o.fishId)!;
      const x = m.x + 26 + (i % 6) * 168;
      const y = top + 4 + Math.floor(i / 6) * 160;
      const g = this.add.graphics();
      const im = this.add.image(x + 79, y + 56, fishTexture(this, f)).setDisplaySize(130, 80);
      const t = txt(this, x + 79, y + 122, `${f.name} Lv.${o.level}\n${pct(winRate(o))}`, 13, { align: "center", weight: "700" }).setOrigin(0.5);
      const z = this.add.zone(x + 79, y + 75, 158, 150).setInteractive({ useHandCursor: true });
      z.on("pointerup", () => {
        if (area?.dragged()) return; // vừa kéo cuộn – không tính là chọn
        const k = sel.indexOf(o.uid);
        if (k >= 0) sel.splice(k, 1);
        else {
          // đủ 3 con thì thay con chọn sớm nhất
          if (sel.length >= 3) sel.shift();
          sel.push(o.uid);
        }
        paint();
      });
      cards.push({ uid: o.uid, g, x, y, col: hexToInt(FISH_RARITY_COLOR[f.rarity]) });
      box.add([g, im, t, z]);
    });
    const countT = txt(this, m.x + 30, m.y + 50, "", 15, { weight: "700", color: COLORS.textGold }).setOrigin(0, 0.5);
    m.root.add(countT);
    paint();
    area = makeScrollArea(this, m.root, box, {
      left: m.x + 16,
      right: m.x + m.w - 30,
      top,
      bottom,
      trackX: m.x + m.w - 18,
      contentH: Math.ceil(list.length / 6) * 160 + 10,
      scroll: 0,
      onScroll: () => undefined,
    });
    m.root.add(new Button(this, m.x + 150, m.y + m.h - 44, 200, 52, "🗑 Gỡ hết", { color: COLORS.grey, fontSize: 20, onClick: () => ((sel.length = 0), paint()) }));
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
      this.unread = new Map((await Social.unreadCounts().catch(() => [])).map((u) => [u.sender, Number(u.n)]));
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
      const st = Social.onlineStatus(r.card);
      const od = this.add.graphics();
      od.fillStyle(st.online ? 0x00e676 : 0x78909c, 1).fillCircle(700, y + 18, 6);
      c.add(od);
      c.add(txt(this, 712, y + 18, `${tag} ${r.card.display_name}`, 19).setOrigin(0, 0.5));
      c.add(txt(this, 900, y + 44, st.text, 13, { weight: "700", color: st.online ? "#69f0ae" : COLORS.textDim }).setOrigin(0, 0.5));
      c.add(txt(this, 712, y + 44, `Lv.${r.card.level} · ⚔ ${r.card.stats.dmWins ?? 0}T/${r.card.stats.dmLosses ?? 0}B`, 14, { weight: "700", color: COLORS.textDim }).setOrigin(0, 0.5));
      const btn = (bx: number, w: number, label: string, color: number, fn: () => Promise<void> | void) =>
        c.add(new Button(this, bx, y + 30, w, 44, label, { color, fontSize: 16, onClick: () => void Promise.resolve(fn()).catch((e: Error) => toast(this, e.message, COLORS.red)) }));
      if (r.kind !== "friend") btn(1010, 76, "👁 Xem", COLORS.blue, () => this.viewCard(r.card));
      else {
        // bấm tên bạn để xem trang cá nhân
        const zn = this.add.zone(800, y + 30, 200, 56).setInteractive({ useHandCursor: true });
        zn.on("pointerup", () => this.viewCard(r.card));
        c.add(zn);
      }
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
        const un = this.unread.get(r.card.user_id) ?? 0;
        btn(1010, 76, un ? `💬${un}` : "💬", un ? COLORS.orange : COLORS.blue, () => void openChat(this, r.card));
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
    showPlayerProfile(this, p);
  }

}
