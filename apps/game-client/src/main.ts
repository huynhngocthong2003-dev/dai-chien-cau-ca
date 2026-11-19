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
import { DeathMatchScene } from "./scenes/DeathMatchScene.ts";
import { BattleScene } from "./scenes/BattleScene.ts";
import { ProfileScene } from "./scenes/ProfileScene.ts";
import { QuestScene } from "./scenes/QuestScene.ts";
import { WheelScene } from "./scenes/WheelScene.ts";
import { RankingScene } from "./scenes/RankingScene.ts";
import { GuildScene } from "./scenes/GuildScene.ts";

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
    scene: [BootScene, HubScene, ZoneScene, FishingScene, InventoryScene, CharacterScene, RodScene, ShopScene, AccountScene, DeathMatchScene, BattleScene, ProfileScene, QuestScene, WheelScene, RankingScene, GuildScene],
  });
  (window as unknown as { __game: Phaser.Game }).__game = game;

  // Điện thoại (đặc biệt khi mở dạng ứng dụng toàn màn hình): kích thước màn hình
  // có thể đổi sau khi game khởi động → đo lại nhiều lần để khung game luôn vừa.
  const rewide = installWide(game);
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
