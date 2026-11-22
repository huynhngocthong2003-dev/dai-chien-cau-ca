import Phaser from "phaser";
import { CHAR_RARITY_COLOR, FISH_RARITY_COLOR } from "@dccc/game-config";
import { CHARACTERS, FISHES, FISH_BY_ID, FORM_BY_ID, ZONES } from "@dccc/game-data";
import {
  DIFFICULTY,
  Rng,
  aiTeam,
  flipMatch,
  charMaxLevel,
  charXpToNext,
  roastedXp,
  makeFighter,
  ownedFishPower,
  randomSeed,
  validateTeam,
  winRate,
  type Difficulty,
  type Fighter,
  type OwnedFish,
} from "@dccc/shared";
import { GameState } from "../state/GameState.ts";
import * as Social from "../state/social.ts";
import { characterHeadTexture, fishTexture, fishDisplayMult, fishTextureFor, roastedFishTexture } from "../art/textures.ts";
import { Bar, Button, fadeIn, formatNum, goTo, modal, panel, toast, txt } from "../ui/widgets.ts";
import { TopBar } from "../ui/TopBar.ts";
import { COLORS } from "../ui/theme.ts";
import { menuBackdrop } from "../ui/backdrop.ts";
import { htmlOverlay } from "../ui/htmlOverlay.ts";
import { hexToInt } from "../art/color.ts";
import { Sfx } from "../audio/Sfx.ts";

type Mode = "ai" | "pvp" | "roasted";

const power = (o: OwnedFish) => ownedFishPower(FISH_BY_ID.get(o.fishId)!, o, o.form ? FORM_BY_ID.get(o.form) : null);

/** Đấu Sinh Tử: chọn & xếp 3 cá, đấu với máy hoặc người chơi, cho cá ăn cá nướng. */
export class DeathMatchScene extends Phaser.Scene {
  private mode: Mode = "ai";
  private team: string[] = [];
  private page = 0;
  private diff: Difficulty = "normal";
  private aiSeed = randomSeed();
  private opponent: Social.PlayerCard | null = null;
  private search: Social.PlayerCard[] = [];
  private friends: Social.PlayerCard[] = [];
  private body?: Phaser.GameObjects.Container;
  private tabs: Button[] = [];
  private busy = false;

  constructor() {
    super("DeathMatch");
  }

  init(data: { mode?: Mode; opponent?: Social.PlayerCard }) {
    this.mode = data.mode ?? (data.opponent ? "pvp" : "ai");
    if (data.opponent) this.opponent = data.opponent;
    this.team = this.team.filter((u) => GameState.save.fishes.some((f) => f.uid === u && !f.locked));
  }

  create() {
    this.input.enabled = true;
    fadeIn(this);
    menuBackdrop(this);
    new TopBar(this, { title: "Đấu Sinh Tử", onBack: () => goTo(this, "Hub") });
    const defs: [Mode, string][] = [
      ["ai", "🤖 Đấu với máy"],
      ["pvp", "👥 Đấu người chơi"],
      ["roasted", `🍖 Cá nướng (${GameState.save.roasted.length})`],
    ];
    this.tabs = defs.map(
      ([m, label], i) =>
        new Button(this, 120 + i * 214, 116, 204, 50, label, {
          color: COLORS.blue,
          fontSize: 19,
          onClick: () => {
            this.mode = m;
            this.render();
          },
        }),
    );
    this.render();
    if (GameState.online) void this.loadFriends();
  }

  private async loadFriends() {
    try {
      const me = GameState.online!.id;
      const fs = (await Social.listFriendships()).filter((f) => f.status === "accepted");
      this.friends = await Social.cardsByIds(fs.map((f) => (f.requester === me ? f.addressee : f.requester)));
      if (this.mode === "pvp" && this.scene.isActive()) this.render();
    } catch {
      /* hiển thị danh sách rỗng */
    }
  }

  private render() {
    this.tabs.forEach((b, i) => b.setColor(["ai", "pvp", "roasted"][i] === this.mode ? COLORS.orange : COLORS.blue));
    this.tabs[2]!.setText(`🍖 Cá nướng (${GameState.save.roasted.length})`);
    this.body?.destroy(true);
    const c = this.add.container(0, 0);
    this.body = c;
    if (this.mode === "roasted") return this.renderRoasted(c);
    this.renderPicker(c);
    this.renderSlots(c);
    if (this.mode === "ai") this.renderAi(c);
    else this.renderPvp(c);
  }

  // ---------------------------------------------------------------- chọn đội
  private candidates(): OwnedFish[] {
    return GameState.save.fishes.filter((f) => !f.locked && FISH_BY_ID.has(f.fishId)).sort((a, b) => power(b) - power(a));
  }

  private fishCard(c: Phaser.GameObjects.Container, x: number, y: number, w: number, h: number, o: OwnedFish, onClick: () => void, badge?: string) {
    const f = FISH_BY_ID.get(o.fishId)!;
    const col = hexToInt(FISH_RARITY_COLOR[f.rarity]);
    const g = this.add.graphics();
    g.fillGradientStyle(0x1a3d66, 0x1a3d66, 0x0d2340, 0x0d2340, 0.95).fillRoundedRect(x, y, w, h, 12);
    g.lineStyle(badge ? 4 : 2.5, badge ? 0xffeb3b : col).strokeRoundedRect(x, y, w, h, 12);
    c.add(g);
    if (o.form) {
      const fm = FORM_BY_ID.get(o.form);
      if (fm) c.add(this.add.image(x + w / 2, y + h * 0.4, "p_spark").setTint(hexToInt(fm.glow)).setScale(4).setAlpha(0.35));
    }
    c.add(this.add.image(x + w / 2, y + h * 0.4, fishTextureFor(this, f, o.form, o.stars)).setDisplaySize(w * 0.86 * Math.min(1.1, fishDisplayMult(f, o.stars)), w * 0.54 * Math.min(1.1, fishDisplayMult(f, o.stars))));
    const wr = winRate(o);
    c.add(
      txt(this, x + w / 2, y + h - 22, `${f.name}\nLv.${o.level} · ⚔${formatNum(power(o))}${wr !== null ? ` · ${Math.round(wr * 100)}%` : ""}`, 11, {
        align: "center",
        weight: "700",
        color: FISH_RARITY_COLOR[f.rarity],
      }).setOrigin(0.5),
    );
    if (badge) {
      const b = this.add.graphics();
      b.fillStyle(0xffc107, 1).fillCircle(x + 16, y + 16, 14);
      b.lineStyle(2.5, 0x1b1530).strokeCircle(x + 16, y + 16, 14);
      c.add(b);
      c.add(txt(this, x + 16, y + 17, badge, 18, { color: "#1b1530", stroke: 0, shadow: false }).setOrigin(0.5));
    }
    const z = this.add.zone(x + w / 2, y + h / 2, w, h).setInteractive({ useHandCursor: true });
    z.on("pointerup", () => {
      Sfx.click();
      onClick();
    });
    c.add(z);
  }

  private renderPicker(c: Phaser.GameObjects.Container) {
    const list = this.candidates();
    const per = 12;
    const pages = Math.max(1, Math.ceil(list.length / per));
    this.page = Math.min(this.page, pages - 1);
    c.add(txt(this, 20, 152, `Chọn 3 cá theo thứ tự ra sân (${list.length} cá có thể đấu – cá khóa 🔒 được bảo vệ)`, 15, { weight: "700", color: COLORS.textDim }));
    if (list.length < 3) {
      c.add(txt(this, 420, 300, "Cần ít nhất 3 con cá không khóa.\nHãy đi câu thêm!", 26, { align: "center" }).setOrigin(0.5));
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

  // ---------------------------------------------------------------- đấu với máy
  private aiPool() {
    const unlocked = ZONES.filter((z) => GameState.save.level >= z.requiredLevel).map((z) => z.id);
    return FISHES.filter((f) => f.rarity !== "boss" && f.zones.some((z) => unlocked.includes(z)));
  }

  private teamPower(): number {
    const own = this.team.map((u) => GameState.save.fishes.find((f) => f.uid === u)).filter((o): o is OwnedFish => !!o);
    if (own.length) return own.reduce((s, o) => s + power(o), 0) / own.length;
    const top = this.candidates().slice(0, 3);
    return top.length ? top.reduce((s, o) => s + power(o), 0) / top.length : 30;
  }

  private aiOpponent(): Fighter[] {
    return aiTeam(new Rng(this.aiSeed), this.aiPool(), this.teamPower(), this.diff);
  }

  private renderAi(c: Phaser.GameObjects.Container) {
    c.add(panel(this, 852, 92, 412, 614, 0.95));
    c.add(txt(this, 1058, 120, "🤖 Đối thủ máy", 26, { color: COLORS.textGold, align: "center" }).setOrigin(0.5));
    (Object.keys(DIFFICULTY) as Difficulty[]).forEach((d, i) => {
      c.add(
        new Button(this, 920 + i * 136, 176, 126, 48, DIFFICULTY[d].label, {
          color: d === this.diff ? COLORS.orange : COLORS.blue,
          fontSize: 20,
          onClick: () => {
            this.diff = d;
            this.aiSeed = randomSeed();
            this.render();
          },
        }),
      );
    });
    const opp = this.aiOpponent();
    opp.forEach((f, i) => {
      const y = 250 + i * 92;
      const g = this.add.graphics();
      g.fillStyle(0x0a1628, 0.9).fillRoundedRect(872, y - 38, 372, 80, 12);
      c.add(g);
      const def = FISH_BY_ID.get(f.fishId)!;
      c.add(this.add.image(930, y, fishTexture(this, def)).setDisplaySize(96, 60).setFlipX(true));
      c.add(txt(this, 990, y - 16, `${i + 1}. ${f.name}`, 17, { color: FISH_RARITY_COLOR[def.rarity] }));
      c.add(txt(this, 990, y + 10, `Lv.${f.level} · ⚔ ${formatNum(f.power)}`, 15, { weight: "700" }));
    });
    const d = DIFFICULTY[this.diff];
    c.add(txt(this, 1058, 528, `Thắng: +${d.gold} 🪙  +${d.xp} KN  + 🍖 cá nướng`, 17, { align: "center", color: "#b9f6ca" }).setOrigin(0.5));
    c.add(txt(this, 1058, 560, "⚠ Thua sẽ MẤT con cá mạnh nhất trong đội!", 16, { align: "center", color: "#ff8a80" }).setOrigin(0.5));
    const ready = this.team.length === 3;
    const go = new Button(this, 1058, 640, 330, 70, "⚔ BẮT ĐẦU", {
      color: COLORS.red,
      fontSize: 32,
      disabled: !ready,
      onClick: () => this.startAi(opp),
    });
    go.on("disabled-click", () => toast(this, "Hãy chọn đủ 3 con cá"));
    c.add(go);
    if (ready) this.tweens.add({ targets: go, scale: 1.05, duration: 600, yoyo: true, repeat: -1 });
  }

  private startAi(opp: Fighter[]) {
    const err = validateTeam(GameState.save, this.team);
    if (err) return toast(this, err, COLORS.red);
    const seed = randomSeed();
    const names = this.team.map((u) => {
      const o = GameState.save.fishes.find((f) => f.uid === u)!;
      return makeFighter(FISH_BY_ID.get(o.fishId)!, o, o.form ? FORM_BY_ID.get(o.form) : null);
    });
    const r = GameState.deathMatch(this.team, opp, seed, this.diff);
    if (!r.ok) return toast(this, r.error, COLORS.red);
    this.aiSeed = randomSeed();
    const lostUid = r.lost?.uid;
    this.team = this.team.filter((u) => u !== lostUid);
    goTo(this, "Battle", {
      result: r.result,
      teamA: names,
      teamB: opp,
      opponentName: `Máy (${DIFFICULTY[this.diff].label})`,
      outcome: { won: r.result!.winner === 0, lost: r.lost, roasted: r.roasted, gold: r.gold, xp: r.xp },
    });
  }

  // ---------------------------------------------------------------- đấu người chơi
  private renderPvp(c: Phaser.GameObjects.Container) {
    c.add(panel(this, 852, 92, 412, 614, 0.95));
    c.add(txt(this, 1058, 120, "👥 Đấu người chơi", 26, { color: COLORS.textGold, align: "center" }).setOrigin(0.5));
    if (!GameState.online) {
      c.add(
        txt(this, 1058, 300, "Đăng nhập tài khoản online để thách đấu người chơi khác và để người khác thách đấu bạn.", 18, {
          align: "center",
          wrap: 360,
          weight: "700",
        }).setOrigin(0.5),
      );
      c.add(new Button(this, 1058, 420, 300, 62, "👤 Đăng nhập", { color: COLORS.blue, fontSize: 24, onClick: () => goTo(this, "Account") }));
      return;
    }
    htmlOverlay(
      this,
      c,
      1000,
      170,
      260,
      44,
      `<input id="dm-search" placeholder="Tên hoặc mã kết bạn" style="width:100%;height:100%;box-sizing:border-box;font:700 18px 'Baloo 2',sans-serif;padding:4px 10px;border-radius:10px;border:3px solid #1b1530;background:#fff8e1;color:#1b1530">`,
    );
    c.add(
      new Button(this, 1192, 170, 100, 44, "🔍 Tìm", {
        color: COLORS.blue,
        fontSize: 18,
        onClick: async () => {
          const q = (document.getElementById("dm-search") as HTMLInputElement | null)?.value ?? "";
          try {
            this.search = await Social.searchPlayers(q, GameState.online!.id);
            if (!this.search.length) toast(this, "Không tìm thấy người chơi");
            this.render();
          } catch (e) {
            toast(this, (e as Error).message, COLORS.red);
          }
        },
      }),
    );
    const rows = [...this.search.map((p) => ({ p, tag: "🔍" })), ...this.friends.filter((f) => !this.search.some((s) => s.user_id === f.user_id)).map((p) => ({ p, tag: "👥" }))].slice(0, 5);
    if (!rows.length) c.add(txt(this, 1058, 260, "Chưa có bạn bè.\nTìm theo tên hoặc mã kết bạn ở trên.", 16, { align: "center", color: COLORS.textDim, weight: "700" }).setOrigin(0.5));
    rows.forEach(({ p, tag }, i) => {
      const y = 228 + i * 58;
      const sel = this.opponent?.user_id === p.user_id;
      const g = this.add.graphics();
      g.fillStyle(sel ? 0x2a5a8a : 0x0a1628, 0.95).fillRoundedRect(872, y, 372, 50, 10);
      g.lineStyle(2, sel ? 0xffeb3b : 0x5fb3ff).strokeRoundedRect(872, y, 372, 50, 10);
      c.add(g);
      c.add(txt(this, 884, y + 25, `${tag} ${p.display_name} · Lv.${p.level}`, 17, { weight: "700" }).setOrigin(0, 0.5));
      const z = this.add.zone(1058, y + 25, 372, 50).setInteractive({ useHandCursor: true });
      z.on("pointerup", () => {
        this.opponent = p;
        this.render();
      });
      c.add(z);
    });
    const rnd = new Button(this, 1058, 520, 372, 54, "🎲 Ghép ngẫu nhiên", {
      color: COLORS.purple,
      fontSize: 22,
      disabled: this.team.length !== 3,
      onClick: () => void this.matchmake(),
    });
    rnd.on("disabled-click", () => toast(this, "Hãy chọn đủ 3 con cá trước khi ghép trận"));
    c.add(rnd);
    c.add(txt(this, 1058, 566, this.opponent ? `Hoặc thách đấu: ${this.opponent.display_name}` : "Hoặc chọn một đối thủ ở trên", 17, { align: "center", color: COLORS.textGold }).setOrigin(0.5));
    c.add(txt(this, 1058, 592, "⚠ Bên thua mất con cá mạnh nhất!", 15, { align: "center", color: "#ff8a80" }).setOrigin(0.5));
    const ready = this.team.length === 3 && !!this.opponent;
    const go = new Button(this, 958, 640, 190, 62, "⚔ Thách đấu", { color: COLORS.red, fontSize: 22, disabled: !ready, onClick: () => void this.startPvp() });
    go.on("disabled-click", () => toast(this, this.team.length < 3 ? "Hãy chọn đủ 3 con cá" : "Hãy chọn đối thủ"));
    c.add(go);
    const defBtn = new Button(this, 1160, 640, 180, 62, "🛡 Đặt phòng thủ", {
      color: COLORS.green,
      fontSize: 18,
      disabled: this.team.length !== 3,
      onClick: () => {
        const r = GameState.setDefense(this.team);
        if (!r.ok) return toast(this, r.error, COLORS.red);
        toast(this, "Đã đặt 3 con này làm đội phòng thủ khi bị thách đấu", COLORS.green);
      },
    });
    defBtn.on("disabled-click", () => toast(this, "Chọn 3 con cá để làm đội phòng thủ"));
    c.add(defBtn);
  }

  /** Ghép ngẫu nhiên: ưu tiên người đang chờ cùng lúc (lực chiến gần nhất); chờ tối đa 40 giây,
   *  không có ai thì đấu với một người chơi ngẫu nhiên (đội phòng thủ của họ). */
  private async matchmake() {
    if (this.busy) return;
    const err = validateTeam(GameState.save, this.team);
    if (err) return toast(this, err, COLORS.red);
    const me = GameState.online!.id;
    this.busy = true;
    let cancelled = false;
    const m = modal(this, 620, 360, "🎲 Đang tìm đối thủ…", () => (cancelled = true));
    const status = txt(this, 640, m.y + 150, "Đang chuẩn bị đội hình…", 22, { align: "center", wrap: 540 }).setOrigin(0.5);
    const spin = this.add.text(640, m.y + 240, "🐟", { fontSize: "54px", padding: { top: 10 } }).setOrigin(0.5);
    this.tweens.add({ targets: spin, angle: 360, duration: 1200, repeat: -1 });
    m.root.add([status, spin]);
    const myPower = this.teamPower();
    const fighters = this.team.map((u) => {
      const o = GameState.save.fishes.find((f) => f.uid === u)!;
      return makeFighter(FISH_BY_ID.get(o.fishId)!, o, o.form ? FORM_BY_ID.get(o.form) : null);
    });
    const finish = () => {
      this.busy = false;
      void Social.queueLeave().catch(() => null);
    };
    try {
      // đội đang chọn cũng là đội phòng thủ khi người khác ghép trúng mình
      const d = GameState.setDefense(this.team);
      if (!d.ok) throw new Error(d.error);
      await GameState.syncNow();
      const since = new Date(Date.now() - 2000).toISOString();
      let opp = await Social.queuePair(myPower, false);
      if (!opp) {
        await Social.queueJoin(myPower);
        const t0 = Date.now();
        while (!cancelled && Date.now() - t0 < 40_000) {
          const waiting = await Social.queueCount().catch(() => 0);
          status.setText(`Đang chờ người chơi khác ghép… ${Math.ceil((40_000 - (Date.now() - t0)) / 1000)}s\n${waiting ? `${waiting} người đang chờ` : "Chưa có ai khác đang chờ"}`);
          // có người ghép trúng mình?
          const inc = await Social.incomingMatch(me, since).catch(() => null);
          if (inc) {
            finish();
            m.close();
            const lostOwned = inc.record.lostUid ? GameState.save.fishes.find((f) => f.uid === inc.record.lostUid) : undefined;
            await GameState.applyPvp(inc.record);
            const flipped = flipMatch(inc.result);
            this.team = this.team.filter((u) => u !== inc.record.lostUid);
            return goTo(this, "Battle", {
              result: flipped,
              teamA: flipped.duels.map((x) => x.a),
              teamB: flipped.duels.map((x) => x.b),
              opponentName: inc.record.opponentName,
              outcome: { won: inc.record.won, lost: lostOwned, roasted: inc.record.roasted ? { id: `pvp_${inc.record.id}`, ...inc.record.roasted } : undefined },
            });
          }
          opp = await Social.queuePair(myPower, true).catch(() => null);
          if (opp) break;
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
      if (cancelled) return finish();
      let name = "";
      if (!opp) {
        status.setText("Không có ai đang chờ – ghép với người chơi ngẫu nhiên…");
        await Social.queueLeave().catch(() => null);
        const list = await Social.randomOpponents(GameState.save.level);
        for (const p of list) {
          try {
            this.busy = false;
            await this.fightOnline(p.user_id, fighters);
            return m.close();
          } catch {
            /* thử người tiếp theo */
          }
        }
        throw new Error("Chưa tìm được đối thủ phù hợp, hãy thử lại sau");
      }
      name = opp;
      status.setText("Đã tìm thấy đối thủ! ⚔");
      this.busy = false;
      await this.fightOnline(name, fighters);
      m.close();
    } catch (e) {
      toast(this, (e as Error).message, COLORS.red);
      m.close();
    } finally {
      finish();
    }
  }

  /** Thách đấu một người (máy chủ tính trận) rồi phát lại trận. */
  private async fightOnline(userId: string, names: Fighter[]) {
    const ch = await Social.challenge(userId, this.team);
    const rec = { ...ch.record, id: ch.id, opponentName: ch.opponentName };
    const lostOwned = rec.lostUid ? GameState.save.fishes.find((f) => f.uid === rec.lostUid) : undefined;
    await GameState.applyPvp(rec);
    this.team = this.team.filter((u) => u !== rec.lostUid);
    goTo(this, "Battle", {
      result: ch.result,
      teamA: names,
      teamB: ch.result.duels.map((d) => d.b),
      opponentName: ch.opponentName,
      outcome: { won: rec.won, lost: lostOwned, roasted: rec.roasted ? { id: `pvp_${ch.id}`, ...rec.roasted } : undefined },
    });
  }

  private async startPvp() {
    if (this.busy || !this.opponent) return;
    const err = validateTeam(GameState.save, this.team);
    if (err) return toast(this, err, COLORS.red);
    this.busy = true;
    toast(this, "Đang đồng bộ và thách đấu…");
    try {
      await GameState.syncNow();
      const names = this.team.map((u) => {
        const o = GameState.save.fishes.find((f) => f.uid === u)!;
        return makeFighter(FISH_BY_ID.get(o.fishId)!, o, o.form ? FORM_BY_ID.get(o.form) : null);
      });
      const ch = await Social.challenge(this.opponent.user_id, this.team);
      const rec = { ...ch.record, id: ch.id, opponentName: ch.opponentName };
      const lostOwned = rec.lostUid ? GameState.save.fishes.find((f) => f.uid === rec.lostUid) : undefined;
      await GameState.applyPvp(rec);
      this.team = this.team.filter((u) => u !== rec.lostUid);
      goTo(this, "Battle", {
        result: ch.result,
        teamA: names,
        teamB: ch.result.duels.map((d) => d.b),
        opponentName: ch.opponentName,
        outcome: { won: rec.won, lost: lostOwned, roasted: rec.roasted ? { id: `pvp_${ch.id}`, ...rec.roasted } : undefined },
      });
    } catch (e) {
      toast(this, (e as Error).message, COLORS.red);
    } finally {
      this.busy = false;
    }
  }

  // ---------------------------------------------------------------- cá nướng
  private renderRoasted(c: Phaser.GameObjects.Container) {
    const list = GameState.save.roasted;
    c.add(panel(this, 20, 150, 1240, 556, 0.92));
    c.add(txt(this, 640, 182, "🍖 Cá nướng – cho nhân vật ăn để nhận kinh nghiệm", 24, { color: COLORS.textGold, align: "center" }).setOrigin(0.5));
    if (!list.length) {
      c.add(txt(this, 640, 420, "Chưa có cá nướng.\nThắng Đấu Sinh Tử để nhận cá nướng từ con cá mạnh nhất của đối thủ!", 22, { align: "center", weight: "700" }).setOrigin(0.5));
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
