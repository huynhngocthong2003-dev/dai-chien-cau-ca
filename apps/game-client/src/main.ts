import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene.ts";
import { HubScene } from "./scenes/HubScene.ts";
import { ZoneScene } from "./scenes/ZoneScene.ts";
import { FishingScene } from "./scenes/FishingScene.ts";
import { InventoryScene } from "./scenes/InventoryScene.ts";
import { CharacterScene } from "./scenes/CharacterScene.ts";
import { RodScene } from "./scenes/RodScene.ts";
import { ShopScene } from "./scenes/ShopScene.ts";
import { AccountScene } from "./scenes/AccountScene.ts";
import { DESIGN_H, installWide, targetWidth } from "./ui/wide.ts";
import { Music, type MusicTheme } from "./audio/Music.ts";
import { Sfx } from "./audio/Sfx.ts";
import { DeathMatchScene } from "./scenes/DeathMatchScene.ts";
import { Combat3Scene } from "./scenes/Combat3Scene.ts";
import { PvpRoomScene } from "./scenes/PvpRoomScene.ts";
import { BreedingScene } from "./scenes/BreedingScene.ts";
import { installPvpInvites } from "./ui/pvpInvites.ts";
import { installInlineIcons } from "./ui/inlineIcons.ts";
import { WorldBossScene } from "./scenes/WorldBossScene.ts";
import { ProfileScene } from "./scenes/ProfileScene.ts";
import { QuestScene } from "./scenes/QuestScene.ts";
import { WheelScene } from "./scenes/WheelScene.ts";
import { RankingScene } from "./scenes/RankingScene.ts";
import { GuildScene } from "./scenes/GuildScene.ts";
import { TopupScene } from "./scenes/TopupScene.ts";
import { PlazaScene } from "./scenes/PlazaScene.ts";
import { RaceScene } from "./scenes/RaceScene.ts";
import { installRaceInvites } from "./ui/raceInvites.ts";

async function start() {
  // Chờ font tiếng Việt tải xong (tối đa 3 giây) để chữ không bị nhảy.
  try {
    await Promise.race([
      Promise.all([document.fonts.load('800 24px "Baloo 2"'), document.fonts.load('700 24px "Baloo 2"')]),
      new Promise((r) => setTimeout(r, 3000)),
    ]);
  } catch {
    /* dùng font dự phòng */
  }
  // emoji tiền tệ cũ trong chữ → biểu tượng vẽ mới (đồng bộ với thanh tài nguyên)
  installInlineIcons();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    backgroundColor: "#0b2a4a",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: targetWidth(),
      height: DESIGN_H,
    },
    input: { activePointers: 3 },
    render: { antialias: true, roundPixels: false },
    fps: { target: 60 },
    scene: [BootScene, HubScene, ZoneScene, FishingScene, InventoryScene, CharacterScene, RodScene, ShopScene, AccountScene, DeathMatchScene, Combat3Scene, PvpRoomScene, BreedingScene, ProfileScene, QuestScene, WheelScene, RankingScene, GuildScene, TopupScene, PlazaScene, RaceScene, WorldBossScene],
  });
  (window as unknown as { __game: Phaser.Game }).__game = game;

  // Điện thoại (đặc biệt khi mở dạng ứng dụng toàn màn hình): kích thước màn hình
  // có thể đổi sau khi game khởi động → đo lại nhiều lần để khung game luôn vừa.
  const rewide = installWide(game);
  // lời mời đua cá: bảng xác nhận 10 giây ở mọi màn hình
  installRaceInvites(game);
  // lời mời đấu cá 3vs3 với người
  installPvpInvites(game);
  // nhạc nền theo màn: sảnh vui, câu cá êm, săn Boss căng thẳng, đấu sinh tử dồn dập
  const themeFor = (sc: Phaser.Scene): MusicTheme => {
    const k = sc.scene.key;
    if (k === "Hub" || k === "Plaza") return "hub";
    if (k === "Fishing") return (sc as unknown as { bossHunt?: boolean }).bossHunt ? "boss" : "fishing";
    if (k === "Combat3" || k === "DeathMatch" || k === "PvpRoom" || k === "Race") return "battle";
    return "calm";
  };
  const hookMusic = () => {
    for (const sc of game.scene.scenes) {
      if (sc.scene.key === "Boot") continue;
      sc.events.on(Phaser.Scenes.Events.CREATE, () => Music.play(themeFor(sc)));
      if (sc.sys.settings.status === Phaser.Scenes.RUNNING) Music.play(themeFor(sc));
    }
  };
  // trình duyệt chỉ cho phát âm thanh sau lần chạm/bấm phím đầu tiên
  const unlock = () => Sfx.unlock();
  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock);
  if (game.scene.scenes.length) hookMusic();
  else game.events.once(Phaser.Core.Events.READY, () => setTimeout(hookMusic, 0));
  const refresh = () => {
    game.scale.refresh();
    rewide();
  };
  const refreshSoon = () => [50, 300, 800].forEach((ms) => setTimeout(refresh, ms));
  window.addEventListener("resize", refreshSoon);
  window.addEventListener("orientationchange", refreshSoon);
  window.visualViewport?.addEventListener("resize", refreshSoon);
  document.addEventListener("fullscreenchange", refreshSoon);
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && refreshSoon());
  window.addEventListener("pageshow", refreshSoon);
  refreshSoon();
}

void start();
