import Phaser from "phaser";
import { extraX, safeX } from "../ui/wide.ts";
import { CHARACTER_BY_ID, CHECKIN_REWARDS, EVENTS, FISH_BY_ID, QUESTS, ROD_BY_ID, TITLES, ZONES, ZONE_BY_ID } from "@dccc/game-data";
import { checkinState, dayKey, mailRewardClaimed, mailRewardEmpty, questProgress, refreshDaily, titleProgress, TUTORIAL_REWARD, worldBossSlot } from "@dccc/shared";
import { playerNameSchema } from "@dccc/validation";
import { GameState } from "../state/GameState.ts";
import * as Social from "../state/social.ts";
import { auraTexture, characterHeadTexture, characterTexture, dockTexture, fishTexture, rodIconTexture, zoneTexture, menuIconTexture } from "../art/textures.ts";
import { Button, fadeIn, formatNum, goTo, modal, panel, toast, txt } from "../ui/widgets.ts";
import { TopBar } from "../ui/TopBar.ts";
import { COLORS } from "../ui/theme.ts";
import { Sfx } from "../audio/Sfx.ts";
import { Music } from "../audio/Music.ts";
import { addAmbience } from "../art/ambience.ts";
import { addFashionFx } from "../art/fashionFx.ts";
import { openGiftCode } from "../ui/giftCode.ts";
import { openWorldChat } from "../ui/worldChat.ts";
import { openMailbox } from "../ui/mailbox.ts";
import { tutorialGuide, type GuideRect } from "../ui/tutorial.ts";
import { htmlOverlay } from "../ui/htmlOverlay.ts";

/** Tính năng chưa mở (hiện chưa có – mọi mục ở sảnh đã hoạt động). */
const COMING: Record<string, string> = {};

export class HubScene extends Phaser.Scene {
  constructor() {
    super("Hub");
  }

  create() {
    // chưa đăng nhập (vd. vừa đăng xuất) → về màn tài khoản bắt buộc
    if (GameState.needsLogin) {
      this.scene.start("Account", { required: true });
      return;
    }
    this.input.enabled = true;
    fadeIn(this);
    const W = 1280;
    const s = GameState.save;
    const zone = ZONE_BY_ID.get(s.selectedZoneId)!;
    this.add.image(0, 0, zoneTexture(this, zone)).setOrigin(0).setDepth(-10);
    addAmbience(this, zone, { baseDepth: -9, vignetteDepth: -6 });
    this.add.rectangle(0, 0, W, 720, 0x061428, 0.15).setOrigin(0).setDepth(-6);

    // Boss nhảy khỏi mặt nước làm nền sinh động
    const boss = FISH_BY_ID.get(zone.bossId)!;
    const bossImg = this.add.image(620, 470, fishTexture(this, boss)).setAlpha(0).setScale(1.25).setDepth(-7);
    const leap = () => {
      bossImg.setPosition(560, 520).setAngle(-35).setAlpha(1);
      this.tweens.add({ targets: bossImg, x: 700, y: 300, angle: 0, duration: 900, ease: "Sine.easeOut", yoyo: false,
        onComplete: () => this.tweens.add({ targets: bossImg, x: 820, y: 560, angle: 40, alpha: 0, duration: 800, ease: "Sine.easeIn" }) });
      this.splash(600, 382);
      this.time.delayedCall(1650, () => this.splash(800, 382));
    };
    this.time.delayedCall(800, leap);
    this.time.addEvent({ delay: 6500, loop: true, callback: leap });

    const dock = this.add.image(0, 330, dockTexture(this, Math.max(0, ZONES.findIndex((z) => z.id === zone.id)))).setOrigin(0).setDepth(-5);
    // màn hình rộng: nối dài bệ sang trái (lật gương) để bệ liền với bờ
    if (extraX(this) > 0) this.add.image(0, dock.y, dock.texture.key).setOrigin(1, 0).setFlipX(true).setDepth(dock.depth);
    const char = CHARACTER_BY_ID.get(s.selectedCharacterId)!;
    const aura = this.add.image(190, 384, auraTexture(this, char)).setOrigin(0.5, 1).setScale(1.25).setAlpha(0.55).setDepth(-5);
    const hero = this.add.image(190, 384, characterTexture(this, char, GameState.equipOf(char.id))).setOrigin(0.5, 1).setScale(1.15).setDepth(-4);
    addFashionFx(this, hero, 190, 232, 1.15, GameState.equipOf(char.id), -4);
    // tàn lửa bay lên quanh nhân vật
    this.add
      .particles(190, 360, "p_ember", {
        x: { min: -60, max: 60 },
        speedY: { min: -80, max: -30 },
        lifespan: 1600,
        frequency: 140,
        scale: { start: 1.2, end: 0 },
        tint: Phaser.Display.Color.HexStringToColor(char.appearance.aura).color,
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(-4);
    this.tweens.add({ targets: [hero], scaleY: 1.18, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: aura, alpha: 0.2, scale: 1.35, duration: 1200, yoyo: true, repeat: -1 });
    txt(this, 190, 400, `${char.name} · ${char.title}`, 20, { align: "center" }).setOrigin(0.5, 0);

    // Logo
    const logo1 = txt(this, 400, 108, "ĐẠI CHIẾN", 64, { stroke: 10 }).setOrigin(0.5);
    const logo2 = txt(this, 420, 176, "CÂU CÁ", 84, { stroke: 12 }).setOrigin(0.5);
    for (const l of [logo1, logo2]) {
      const g = l.context.createLinearGradient(0, 0, 0, l.height);
      g.addColorStop(0, "#fff59d");
      g.addColorStop(0.5, "#ffb300");
      g.addColorStop(1, "#ff6f00");
      l.setFill(g);
    }
    this.tweens.add({ targets: logo2, scale: 1.04, duration: 1100, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    new TopBar(this);

    // Nút chính
    const fishBtn = new Button(this, 420, 640, 340, 100, "CÂU CÁ", {
      color: COLORS.orange,
      fontSize: 44,
      sub: `Khu: ${zone.name}`,
      onClick: () => goTo(this, "Zone"),
    });
    this.tweens.add({ targets: fishBtn, scale: 1.05, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    // Lưới tính năng (màn hình rộng: dạt sát mép phải cho cân đối)
    const gridStart = this.children.list.length;
    panel(this, 836, 96, 428, 610, 0.72);
    const eventsLeft = EVENTS.filter((e) => !s.claimedEvents.includes(e.id)).length;
    const charIcon = characterHeadTexture(this, char, GameState.equipOf(char.id));
    const rodIcon = rodIconTexture(this, ROD_BY_ID.get(s.selectedRodId)!);
    // có việc cần nhận: điểm danh hôm nay / nhiệm vụ xong / danh hiệu đạt
    const fresh = refreshDaily(s, Date.now());
    const questBadge =
      !checkinState(s, Date.now(), CHECKIN_REWARDS.length).done ||
      QUESTS.some((q) => !fresh.daily.claimed.includes(q.id) && questProgress(fresh, q) >= q.target) ||
      TITLES.some((t) => !s.titles.owned.includes(t.id) && titleProgress(s, t) >= t.target)
        ? "!"
        : undefined;
    // Đảo Lai Tạo: có trứng nở được → "!"
    const breedBadge = (s.breeding?.slots ?? []).some((x) => x.egg && x.egg.end <= Date.now()) ? "!" : undefined;
    const items: { icon: string; iconKey?: string; label: string; color: number; act: () => void; locked?: string; badge?: string }[] = [
      { icon: "🧑", iconKey: charIcon, label: "Nhân Vật", color: COLORS.blue, act: () => goTo(this, "Characters") },
      { icon: "🎣", iconKey: rodIcon, label: "Cần Câu", color: COLORS.blue, act: () => goTo(this, "Rods") },
      { icon: "🐟", iconKey: menuIconTexture(this, "bag"), label: "Kho Cá", color: COLORS.blue, act: () => goTo(this, "Inventory", { tab: "bag" }), badge: s.fishes.length ? String(s.fishes.length) : undefined },
      { icon: "🛒", iconKey: menuIconTexture(this, "shop"), label: "Cửa Hàng", color: COLORS.orange, act: () => goTo(this, "Shop") },
      { icon: "📖", iconKey: menuIconTexture(this, "book"), label: "Bộ Sưu Tập", color: COLORS.green, act: () => goTo(this, "Inventory", { tab: "collection" }) },
      { icon: "⚙️", iconKey: menuIconTexture(this, "gear"), label: "Cài Đặt", color: COLORS.green, act: () => this.openSettings() },
      { icon: "⚔️", iconKey: menuIconTexture(this, "battle"), label: "Đấu Cá", color: COLORS.red, act: () => goTo(this, "DeathMatch") },
      { icon: "🥚", iconKey: menuIconTexture(this, "breed"), label: "Lai Tạo", color: COLORS.orange, act: () => goTo(this, "Breeding"), badge: breedBadge },
      { icon: "🏁", iconKey: menuIconTexture(this, "race"), label: "Đua Cá", color: COLORS.green, act: () => goTo(this, "Race") },
      { icon: "🏙", iconKey: menuIconTexture(this, "plaza"), label: "Quảng Trường", color: COLORS.orange, act: () => goTo(this, "Plaza") },
      { icon: "🎡", iconKey: menuIconTexture(this, "wheel"), label: "Vòng Quay", color: COLORS.purple, act: () => goTo(this, "Wheel"), badge: s.daily.freeSpinUsed && s.daily.day === dayKey(Date.now()) ? undefined : "FREE" },
      { icon: "📜", iconKey: menuIconTexture(this, "quest"), label: "Nhiệm Vụ", color: COLORS.purple, act: () => goTo(this, "Quests"), badge: questBadge },
      { icon: "🎉", iconKey: menuIconTexture(this, "event"), label: "Sự Kiện", color: COLORS.orange, act: () => this.openEvents(), badge: eventsLeft ? "!" : undefined },
      { icon: "🏆", iconKey: menuIconTexture(this, "trophy"), label: "Xếp Hạng", color: COLORS.purple, act: () => goTo(this, "Ranking") },
      { icon: "🛡️", iconKey: menuIconTexture(this, "guild"), label: "Hội", color: COLORS.purple, act: () => goTo(this, "Guild") },
    ];
    const menuBtns = new Map<string, Button>();
    items.forEach((it, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const bx = 914 + col * 136;
      const by = 150 + row * 110;
      const b = new Button(this, bx, by, 126, 100, it.label, {
        color: it.color,
        icon: it.icon,
        iconKey: it.iconKey,
        disabled: !!it.locked,
        badge: it.locked ? "🔒" : it.badge,
        onClick: it.act,
      });
      if (it.locked) b.on("disabled-click", () => toast(this, COMING[it.locked!]!));
      menuBtns.set(it.label, b);
    });
    const dx = Math.max(0, extraX(this) - safeX(this) - 8);
    if (dx) for (const o of this.children.list.slice(gridStart)) (o as unknown as { x: number }).x += dx;

    // hướng dẫn tân thủ (chỉ tài khoản mới)
    // (bản lưu tài khoản mới có thể nạp xong sau khi sảnh hiện → nghe thêm sự kiện "changed")
    this.tutC = undefined;
    // giờ thật (máy yếu / FPS thấp làm đồng hồ Phaser chạy chậm)
    window.setTimeout(() => this.scene.isActive() && this.runTutorial(fishBtn, menuBtns), 350);
    const onSave = () => {
      if (GameState.tutorial && !this.tutC && this.scene.isActive()) this.runTutorial(fishBtn, menuBtns);
    };
    GameState.on("changed", onSave);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => GameState.off("changed", onSave));

    if (GameState.loadWarning) {
      toast(this, GameState.loadWarning, COLORS.red);
      GameState.loadWarning = null;
    }
    this.input.keyboard?.on("keydown-ENTER", () => goTo(this, "Zone"));
    // kênh chat thế giới
    const wc = new Button(this, 92 - extraX(this) + safeX(this), 130, 150, 50, "🌍 Chat", { color: COLORS.blue, fontSize: 20, onClick: () => openWorldChat(this) });
    wc.setDepth(20);
    // Boss Thế Giới (12h · 15h · 20h · 23h): "LIVE" khi đang diễn ra
    const wbSlot = worldBossSlot(Date.now());
    const wb = new Button(this, 92 - extraX(this) + safeX(this), GameState.online ? 250 : 190, 150, 50, "🐉 Boss TG", {
      color: wbSlot.live ? COLORS.red : COLORS.orange,
      fontSize: 19,
      badge: wbSlot.live ? "LIVE" : undefined,
      onClick: () => goTo(this, "WorldBoss"),
    });
    wb.setDepth(20);
    if (wbSlot.live) this.tweens.add({ targets: wb, scale: 1.07, duration: 500, yoyo: true, repeat: -1 });
    // Hòm Thư hệ thống (thư đền bù / thông báo) – có thư chưa đọc thì tự mở 1 lần
    if (GameState.online) {
      const mb = new Button(this, 92 - extraX(this) + safeX(this), 190, 150, 50, "📬 Hòm Thư", { color: COLORS.purple, fontSize: 18, onClick: () => void openMail(false) });
      mb.setDepth(20);
      const pending = (mails: Social.SystemMail[]) =>
        mails.filter((x) => !x.read_at || (x.rewards && !mailRewardEmpty(x.rewards) && !x.claimed_at && !mailRewardClaimed(GameState.save, x.rewards))).length;
      const label = (mails: Social.SystemMail[]) => {
        const n = pending(mails);
        mb.label.setText(n ? `📬 Hòm Thư (${n})` : "📬 Hòm Thư");
      };
      const openMail = async (auto: boolean) => {
        try {
          const mails = await Social.fetchMail();
          if (!this.scene.isActive()) return;
          label(mails);
          if (!auto || pending(mails)) openMailbox(this, mails, () => label(mails));
        } catch (e) {
          if (!auto) toast(this, `Không mở được Hòm Thư: ${(e as Error).message}`, COLORS.red);
        }
      };
      // đang hướng dẫn tân thủ: không tự bật Hòm Thư (che mất chỗ cần bấm)
      if (!GameState.tutorial) void openMail(true);
    }
    // Quảng Trường & Đua Cá: đã đưa vào bảng menu bên phải
    if (GameState.online && !HubScene.socialSynced) {
      HubScene.socialSynced = true;
      void GameState.claimTopups()
        .then((got) => got.length && this.scene.isActive() && toast(this, `💎 Đã nhận gói nạp: ${got.map((p) => p.name).join(", ")}. Cảm ơn bạn!`, COLORS.green))
        .catch(() => null);
      void Social.unreadCounts()
        .then((u) => {
          const n = u.reduce((a, x) => a + Number(x.n), 0);
          if (n && this.scene.isActive()) this.time.delayedCall(1500, () => toast(this, `💬 Bạn có ${n} tin nhắn mới – xem ở Hồ Sơ → Bạn bè`, COLORS.blue));
        })
        .catch(() => null);
      void GameState.syncSocial().then((list) => {
        if (!this.scene.isActive()) return;
        list.forEach((m, i) =>
          this.time.delayedCall(i * 2600, () =>
            toast(
              this,
              m.won ? `⚔ ${m.opponentName} thách đấu bạn và đã THUA! Bạn nhận cá nướng 🍖` : `⚔ ${m.opponentName} thách đấu và thắng bạn – bạn mất 1 con cá 😭`,
              m.won ? COLORS.green : COLORS.red,
            ),
          ),
        );
      });
    }
  }

  /** Chỉ đồng bộ kết quả bị thách đấu một lần mỗi lần mở game. */
  static socialSynced = false;

  private splash(x: number, y: number) {
    this.add.particles(x, y, "p_drop", {
      speed: { min: 120, max: 320 },
      angle: { min: 220, max: 320 },
      gravityY: 600,
      lifespan: 900,
      scale: { start: 1.4, end: 0.3 },
      quantity: 26,
      stopAfter: 26,
    }).setDepth(-6);
  }

  private openEvents() {
    const m = modal(this, 760, 460, "🎉 Sự Kiện", () => this.time.delayedCall(160, () => this.scene.restart()));
    EVENTS.forEach((ev, i) => {
      const y = m.y + 110 + i * 150;
      const got = GameState.save.claimedEvents.includes(ev.id);
      const g = this.add.graphics();
      g.fillStyle(0x1a3d66, 1).fillRoundedRect(m.x + 30, y - 50, m.w - 60, 130, 16);
      g.lineStyle(3, got ? 0x607d8b : 0xffc107).strokeRoundedRect(m.x + 30, y - 50, m.w - 60, 130, 16);
      m.root.add(g);
      const ic = this.add.text(m.x + 90, y + 14, ev.icon, { fontSize: "60px", padding: { top: 10 } }).setOrigin(0.5);
      m.root.add(ic);
      if (!got) this.tweens.add({ targets: ic, scale: 1.15, angle: 8, duration: 500, yoyo: true, repeat: -1 });
      m.root.add(txt(this, m.x + 140, y - 36, ev.name, 26, { color: COLORS.textGold }));
      m.root.add(txt(this, m.x + 140, y + 2, ev.description, 16, { weight: "700", wrap: 380 }));
      const btn = new Button(this, m.x + m.w - 120, y + 14, 170, 60, got ? "Đã nhận ✓" : `Nhận 💎${ev.reward.diamonds ?? ""}`, {
        color: COLORS.orange,
        fontSize: 22,
        disabled: got,
        onClick: () => {
          const r = GameState.claimEvent(ev);
          if (!r.ok) return toast(this, r.error, COLORS.red);
          Sfx.catchFanfare(true);
          this.cameras.main.flash(300, 120, 220, 255);
          this.add
            .particles(btn.x, btn.y, "p_spark", { speed: { min: 150, max: 420 }, lifespan: 900, scale: { start: 1.3, end: 0 }, tint: [0x40c4ff, 0xffffff, 0xffd54f], quantity: 40, stopAfter: 40, blendMode: Phaser.BlendModes.ADD })
            .setDepth(1000);
          toast(this, `🎁 Đã nhận ${ev.reward.diamonds} kim cương! Chúc bạn câu được nhiều cá khủng!`, COLORS.green);
          btn.setText("Đã nhận ✓").setDisabled(true);
        },
      });
      btn.on("disabled-click", () => toast(this, "Bạn đã nhận quà sự kiện này rồi"));
      m.root.add(btn);
    });
    m.root.add(txt(this, m.x + m.w / 2, m.y + m.h - 40, "Sự kiện mới sẽ được cập nhật thường xuyên!", 16, { color: COLORS.textDim, align: "center", weight: "700" }).setOrigin(0.5));
  }

  // ---------------------------------------------------------------- hướng dẫn tân thủ
  private tutC?: Phaser.GameObjects.Container;

  private runTutorial(fishBtn: Button, menu: Map<string, Button>) {
    this.tutC?.destroy(true);
    this.tutC = undefined;
    const step = GameState.tutorial;
    if (!step || !this.scene.isActive()) return;
    const rect = (b: Button): GuideRect => ({ x: b.x, y: b.y, w: b.width, h: b.height });
    if (step === "welcome") {
      this.tutC = tutorialGuide(this, {
        title: "🎣 Chào mừng Tân Thủ!",
        text: `Mình sẽ hướng dẫn bạn chơi cơ bản:\nCâu con cá đầu tiên → xem Kho Cá → làm quen các mục chính.\n\nXong nhận quà ${formatNum(TUTORIAL_REWARD.gold)} 🪙 + ${TUTORIAL_REWARD.diamonds} 💎 + ${TUTORIAL_REWARD.stones} 🔷, rồi được chơi tự do!`,
        next: {
          label: "Bắt đầu ▶",
          onClick: () => {
            GameState.tutorialAdvance("welcome");
            this.runTutorial(fishBtn, menu);
          },
        },
      });
    } else if (step === "to_bag" || step === "bag") {
      const bag = menu.get("Kho Cá");
      if (bag) this.tutC = tutorialGuide(this, { title: "🐟 Kho Cá", text: "Tuyệt vời! Bấm KHO CÁ để xem con cá bạn vừa câu được.", target: rect(bag) });
    } else if (step === "tour") this.tutorialTour(menu, 0);
    else this.tutC = tutorialGuide(this, { title: "Bước 1: Đi câu", text: "Bấm nút CÂU CÁ để ra bến câu và câu con cá đầu tiên!", target: rect(fishBtn) });
  }

  /** Giới thiệu nhanh các mục chính, xong → nhận quà, chơi tự do. */
  private tutorialTour(menu: Map<string, Button>, i: number) {
    this.tutC?.destroy(true);
    const TOUR: [string, string][] = [
      ["Đấu Cá", "⚔ ĐẤU CÁ: xếp 3 cá đấu 3vs3 theo lượt với máy hoặc người, leo Rank Sinh Tử.\nThua mất con lực chiến thấp nhất – nhớ KHOÁ 🔒 cá quý!"],
      ["Lai Tạo", "🥚 LAI TẠO: ghép 1 cá ♂ + 1 cá ♀ (Huyền Thoại / Boss trở lên) ra trứng cá lai mang 2 hệ."],
      ["Nhân Vật", "🧑 NHÂN VẬT & 🎣 CẦN CÂU: nâng cấp để kéo cá khoẻ hơn, câu được cá to và hiếm hơn."],
      ["Nhiệm Vụ", "📜 NHIỆM VỤ: điểm danh mỗi ngày và làm nhiệm vụ để nhận vàng, kim cương."],
      ["Vòng Quay", "🎡 VÒNG QUAY: mỗi ngày 1 lượt MIỄN PHÍ – có Đá Tiến Hoá, cần câu và nhân vật hiếm!"],
    ];
    const [name, text] = TOUR[i]!;
    const b = menu.get(name);
    const last = i === TOUR.length - 1;
    this.tutC = tutorialGuide(this, {
      title: `Làm quen (${i + 1}/${TOUR.length})`,
      text,
      target: b ? { x: b.x, y: b.y, w: b.width, h: b.height } : undefined,
      lockTarget: true,
      at: { x: 420, y: 360 },
      next: {
        label: last ? "Hoàn thành 🎉" : "Tiếp ▶",
        onClick: () => (last ? this.finishTutorial() : this.tutorialTour(menu, i + 1)),
      },
    });
  }

  private finishTutorial() {
    this.tutC?.destroy(true);
    this.tutC = undefined;
    const r = GameState.tutorialFinish(false);
    if (!r.ok) return toast(this, r.error, COLORS.red);
    Sfx.levelUp();
    const m = modal(this, 620, 380, "🎉 Hoàn thành hướng dẫn!", () => this.scene.restart());
    m.root.add(
      txt(this, 640, m.y + 150, `Phần thưởng:\n+${formatNum(TUTORIAL_REWARD.gold)} 🪙   +${TUTORIAL_REWARD.diamonds} 💎   +${TUTORIAL_REWARD.stones} 🔷\n\nGiờ bạn được CHƠI TỰ DO – khám phá mọi thứ nhé!`, 22, { align: "center", weight: "700" }).setOrigin(0.5),
    );
    m.root.add(new Button(this, 640, m.y + m.h - 56, 240, 60, "Chơi thôi! 🎣", { color: COLORS.orange, fontSize: 24, onClick: () => m.close() }));
  }

  private openSettings() {
    const m = modal(this, 620, 540, "Cài Đặt");
    const s = GameState.save;
    const cx = m.x + m.w / 2;
    m.root.add(txt(this, m.x + 40, m.y + 80, "Tên người chơi", 22));
    htmlOverlay(
      this,
      m.root,
      cx - 60,
      m.y + 140,
      340,
      52,
      `<input id="player-name" maxlength="16" value="${s.name.replace(/[&<>"]/g, "")}" style="width:100%;height:100%;box-sizing:border-box;font:700 22px 'Baloo 2',sans-serif;padding:4px 12px;border-radius:12px;border:3px solid #1b1530;background:#fff8e1;color:#1b1530">`,
    );
    m.root.add(
      new Button(this, cx + 190, m.y + 140, 140, 52, "Đổi tên", {
        color: COLORS.green,
        fontSize: 22,
        onClick: () => {
          const el = document.getElementById("player-name") as HTMLInputElement | null;
          const r = playerNameSchema.safeParse(el?.value ?? "");
          if (!r.success) return toast(this, "Tên gồm 2–16 ký tự: chữ, số, khoảng trắng hoặc _", COLORS.red);
          GameState.rename(r.data);
          toast(this, "Đã đổi tên");
        },
      }),
    );
    const musicBtn = new Button(this, cx - 30, m.y + 230, 170, 58, Music.enabled ? "🎵 Nhạc: Bật" : "🎵 Nhạc: Tắt", {
      color: COLORS.purple,
      fontSize: 20,
      onClick: () => {
        Music.setEnabled(!Music.enabled);
        musicBtn.setText(Music.enabled ? "🎵 Nhạc: Bật" : "🎵 Nhạc: Tắt");
      },
    });
    m.root.add(musicBtn);
    const soundBtn = new Button(this, cx - 210, m.y + 230, 170, 58, GameState.soundOn ? "🔊 Âm: Bật" : "🔇 Âm: Tắt", {
      color: COLORS.blue,
      fontSize: 20,
      onClick: () => {
        GameState.setSound(!GameState.soundOn);
        soundBtn.setText(GameState.soundOn ? "🔊 Âm: Bật" : "🔇 Âm: Tắt");
        Sfx.click();
      },
    });
    m.root.add(soundBtn);
    const storageInfo =
      GameState.storage.kind === "cloud"
        ? "☁️ Tiến trình lưu trên đám mây theo tài khoản claude.ai\ncủa bạn – vào từ thiết bị nào cũng chơi tiếp được."
        : "💾 Tiến trình lưu trên trình duyệt này.\nĐăng nhập claude.ai (khi được mời) để lưu đám mây.";
    m.root.add(txt(this, m.x + 40, m.y + 280, storageInfo, 18, { weight: "700", color: COLORS.textDim }));
    let armed = false;
    const reset = new Button(this, cx + 170, m.y + 230, 200, 58, "Xóa tiến trình", {
      color: COLORS.red,
      fontSize: 20,
      onClick: () => {
        if (!armed) {
          armed = true;
          reset.setText("Bấm lần nữa!");
          toast(this, "Bấm lần nữa để xóa toàn bộ tiến trình. Không thể hoàn tác.", COLORS.red);
          return;
        }
        void GameState.reset().then(() => this.scene.restart());
      },
    });
    m.root.add(reset);
    m.root.add(
      new Button(this, cx - 80, m.y + 380, 240, 56, "👤 Tài khoản", {
        color: COLORS.blue,
        fontSize: 22,
        onClick: () => {
          m.close();
          goTo(this, "Account");
        },
      }),
    );
    m.root.add(
      new Button(this, cx + 160, m.y + 380, 220, 56, "🎁 Mã quà", {
        color: COLORS.purple,
        fontSize: 22,
        onClick: () => {
          m.close();
          openGiftCode(this, () => this.scene.restart());
        },
      }),
    );
    m.root.add(txt(this, m.x + 40, m.y + 460, `Mã người chơi: ${s.playerId}\nPhiên bản 0.52.1 · Giai đoạn 2–5`, 16, { weight: "500", color: COLORS.textDim }));
  }
}
