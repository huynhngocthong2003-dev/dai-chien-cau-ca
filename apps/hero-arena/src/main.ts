import Phaser from "phaser";
import { LobbyScene } from "./scenes/LobbyScene.ts";
import { HeroSelectScene } from "./scenes/HeroSelectScene.ts";
import { ArenaScene } from "./scenes/ArenaScene.ts";
import { ResultScene } from "./scenes/ResultScene.ts";
import { MultiplayerScene } from "./scenes/MultiplayerScene.ts";
import mapUrl from "./assets/lobby-map.jpg";
import heroesUrl from "./assets/heroes-atlas.png";
import { HERO_CELL_H, HERO_CELL_W, HERO_SHEET } from "./heroArt.ts";
import { H, W } from "./ui.ts";
import { tryLockLandscape } from "./layout.ts";

class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }
  preload(): void {
    // Hình của chủ dự án: bản đồ đảo pixel + bộ nhân vật pixel 10 lớp × 3 dạng
    this.load.image("lobby_map", mapUrl);
    this.load.spritesheet(HERO_SHEET, heroesUrl, { frameWidth: HERO_CELL_W, frameHeight: HERO_CELL_H });
  }
  create(): void {
    // pixel-art: phóng to giữ nét
    this.textures.get(HERO_SHEET).setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get("lobby_map").setFilter(Phaser.Textures.FilterMode.NEAREST);
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
    // EXPAND: giữ trọn 1280×720 không méo, nới thêm cạnh theo tỉ lệ màn hình (không viền đen)
    scale: { mode: Phaser.Scale.EXPAND, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
    input: { activePointers: 4 },
    render: { antialias: true },
    scene: [BootScene, LobbyScene, HeroSelectScene, ArenaScene, ResultScene, MultiplayerScene],
  });
  (window as unknown as { __game: Phaser.Game }).__game = game;
}

tryLockLandscape();
void start();
