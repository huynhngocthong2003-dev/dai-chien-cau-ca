import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene.ts";
import { HubScene } from "./scenes/HubScene.ts";
import { ZoneScene } from "./scenes/ZoneScene.ts";
import { FishingScene } from "./scenes/FishingScene.ts";
import { InventoryScene } from "./scenes/InventoryScene.ts";
import { CharacterScene } from "./scenes/CharacterScene.ts";
import { RodScene } from "./scenes/RodScene.ts";

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
      width: 1280,
      height: 720,
    },
    dom: { createContainer: true },
    input: { activePointers: 3 },
    render: { antialias: true, roundPixels: false },
    fps: { target: 60 },
    scene: [BootScene, HubScene, ZoneScene, FishingScene, InventoryScene, CharacterScene, RodScene],
  });
  (window as unknown as { __game: Phaser.Game }).__game = game;
}

void start();
