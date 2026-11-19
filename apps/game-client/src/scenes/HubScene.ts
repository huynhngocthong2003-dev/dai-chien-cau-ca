import Phaser from "phaser";
import { CHARACTER_BY_ID, FISH_BY_ID, ZONE_BY_ID } from "@dccc/game-data";
import { playerNameSchema } from "@dccc/validation";
import { GameState } from "../state/GameState.ts";
import { auraTexture, characterTexture, dockTexture, fishTexture, zoneTexture } from "../art/textures.ts";
import { Button, fadeIn, goTo, modal, panel, toast, txt } from "../ui/widgets.ts";
import { TopBar } from "../ui/TopBar.ts";
import { COLORS } from "../ui/theme.ts";
import { Sfx } from "../audio/Sfx.ts";
import { addAmbience } from "../art/ambience.ts";
import { openGiftCode } from "../ui/giftCode.ts";

/** Tính năng sẽ có ở giai đoạn sau – hiển thị rõ ràng là "sắp ra mắt", không giả lập. */
const COMING: Record<string, string> = {
  pvp: "Đấu Cá online (1v1, 3v3) sẽ mở ở Giai đoạn 4 – cần server Colyseus.",
  spin: "Vòng Quay & Gacha sẽ mở ở Giai đoạn 3.",
  quest: "Nhiệm vụ ngày/tuần & điểm danh sẽ mở ở Giai đoạn 3.",
  event: "Sự kiện cộng đồng sẽ mở ở Giai đoạn 5.",
  rank: "Bảng xếp hạng online sẽ mở ở Giai đoạn 5.",
  clan: "Hội Câu Cá sẽ mở ở Giai đoạn 5.",
};

export class HubScene extends Phaser.Scene {
  constructor() {
    super("Hub");
  }

  create() {
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

    this.add.image(0, 330, dockTexture(this)).setOrigin(0).setDepth(-5);
    const char = CHARACTER_BY_ID.get(s.selectedCharacterId)!;
    const aura = this.add.image(190, 384, auraTexture(this, char)).setOrigin(0.5, 1).setScale(1.25).setAlpha(0.55).setDepth(-5);
    const hero = this.add.image(190, 384, characterTexture(this, char, GameState.equipOf(char.id))).setOrigin(0.5, 1).setScale(1.15).setDepth(-4);
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

    // Lưới tính năng
    panel(this, 836, 96, 428, 610, 0.72);
    const items: { icon: string; label: string; color: number; act: () => void; locked?: string; badge?: string }[] = [
      { icon: "🧑", label: "Nhân Vật", color: COLORS.blue, act: () => goTo(this, "Characters") },
      { icon: "🎣", label: "Cần Câu", color: COLORS.blue, act: () => goTo(this, "Rods") },
      { icon: "🐟", label: "Kho Cá", color: COLORS.blue, act: () => goTo(this, "Inventory"), badge: s.fishes.length ? String(s.fishes.length) : undefined },
      { icon: "🛒", label: "Cửa Hàng", color: COLORS.orange, act: () => goTo(this, "Shop") },
      { icon: "📖", label: "Bộ Sưu Tập", color: COLORS.green, act: () => goTo(this, "Inventory", { tab: "collection" }) },
      { icon: "⚙️", label: "Cài Đặt", color: COLORS.green, act: () => this.openSettings() },
      { icon: "⚔️", label: "Đấu Cá", color: COLORS.red, act: () => {}, locked: "pvp" },
      { icon: "🎡", label: "Vòng Quay", color: COLORS.purple, act: () => {}, locked: "spin" },
      { icon: "📜", label: "Nhiệm Vụ", color: COLORS.purple, act: () => {}, locked: "quest" },
      { icon: "🎉", label: "Sự Kiện", color: COLORS.purple, act: () => {}, locked: "event" },
      { icon: "🏆", label: "Xếp Hạng", color: COLORS.purple, act: () => {}, locked: "rank" },
      { icon: "🛡️", label: "Hội", color: COLORS.purple, act: () => {}, locked: "clan" },
    ];
    items.forEach((it, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const bx = 914 + col * 136;
      const by = 160 + row * 140;
      const b = new Button(this, bx, by, 126, 120, it.label, {
        color: it.color,
        icon: it.icon,
        disabled: !!it.locked,
        badge: it.locked ? "🔒" : it.badge,
        onClick: it.act,
      });
      if (it.locked) b.on("disabled-click", () => toast(this, COMING[it.locked!]!));
    });

    if (GameState.loadWarning) {
      toast(this, GameState.loadWarning, COLORS.red);
      GameState.loadWarning = null;
    }
    this.input.keyboard?.on("keydown-ENTER", () => goTo(this, "Zone"));
  }

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

  private openSettings() {
    const m = modal(this, 620, 470, "Cài Đặt");
    const s = GameState.save;
    const cx = m.x + m.w / 2;
    m.root.add(txt(this, m.x + 40, m.y + 80, "Tên người chơi", 22));
    const input = this.add.dom(cx - 60, m.y + 140).createFromHTML(
      `<input id="player-name" maxlength="16" value="${s.name.replace(/"/g, "")}" style="width:300px;font:700 22px 'Baloo 2',sans-serif;padding:6px 12px;border-radius:12px;border:3px solid #1b1530;background:#fff8e1;color:#1b1530">`,
    );
    m.root.add(input);
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
    const soundBtn = new Button(this, cx - 130, m.y + 230, 240, 58, GameState.soundOn ? "🔊 Âm thanh: Bật" : "🔇 Âm thanh: Tắt", {
      color: COLORS.blue,
      fontSize: 22,
      onClick: () => {
        GameState.setSound(!GameState.soundOn);
        soundBtn.setText(GameState.soundOn ? "🔊 Âm thanh: Bật" : "🔇 Âm thanh: Tắt");
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
    const reset = new Button(this, cx + 150, m.y + 230, 220, 58, "Xóa tiến trình", {
      color: COLORS.red,
      fontSize: 22,
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
      new Button(this, cx + 160, m.y + 380, 220, 56, "🎁 Mã quà", {
        color: COLORS.purple,
        fontSize: 22,
        onClick: () => {
          m.close();
          openGiftCode(this, () => this.scene.restart());
        },
      }),
    );
    m.root.add(txt(this, m.x + 40, m.y + 360, `Mã người chơi: ${s.playerId}\nPhiên bản 0.4.0 · Giai đoạn 2–3`, 16, { weight: "500", color: COLORS.textDim }));
  }
}
