import Phaser from "phaser";
import { GameState } from "../state/GameState.ts";
import { makeParticleTextures } from "../art/textures.ts";
import { txt } from "../ui/widgets.ts";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create() {
    document.getElementById("loading")?.remove();
    const { width, height } = this.scale.gameSize;
    const t = txt(this, width / 2, height / 2, "Đang kết nối dữ liệu…", 30).setOrigin(0.5);
    makeParticleTextures(this);
    GameState.init()
      .then(() => {
        (window as unknown as { __ready: boolean }).__ready = true;
        this.scene.start("Hub");
      })
      .catch((e: unknown) => {
        console.error(e);
        t.setText("Không tải được dữ liệu. Hãy tải lại trang.");
      });
  }
}
