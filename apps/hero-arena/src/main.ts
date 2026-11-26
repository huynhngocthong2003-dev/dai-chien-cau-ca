import Phaser from "phaser";
import { LobbyScene } from "./scenes/LobbyScene.ts";
import { HeroSelectScene } from "./scenes/HeroSelectScene.ts";
import { ArenaScene } from "./scenes/ArenaScene.ts";
import { ResultScene } from "./scenes/ResultScene.ts";
import mapUrl from "./assets/lobby-map.jpg";
import { H, W } from "./ui.ts";

class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }
  preload(): void {
    this.load.image("lobby_map", mapUrl);
  }
  create(): void {
    document.getElementById("loading")?.remove();
    (window as unknown as { __ready: boolean }).__ready = true;
    this.scene.start("Lobby");
  }
}

async function start(): Promise<void> {
  try {
    await Promise.race([document.fonts.load('800 24px "Baloo 2"'), new Promise((r) => setTimeout(r, 2500))]);
  } catch {
    /* dùng font dự phòng */
  }
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    backgroundColor: "#0d1320",
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
    input: { activePointers: 4 },
    render: { antialias: true },
    scene: [BootScene, LobbyScene, HeroSelectScene, ArenaScene, ResultScene],
  });
  (window as unknown as { __game: Phaser.Game }).__game = game;
}

void start();
