import Phaser from "phaser";
import { CHAR_RARITY_COLOR } from "@dccc/game-config";
import { CHARACTER_BY_ID, ROD_BY_ID } from "@dccc/game-data";
import { GameState } from "../state/GameState.ts";
import { auraTexture, characterTexture, rodIconTexture } from "../art/textures.ts";
import { Button, modal, toast, txt } from "./widgets.ts";
import { htmlOverlay } from "./htmlOverlay.ts";
import { COLORS } from "./theme.ts";
import { Sfx } from "../audio/Sfx.ts";

/** Hộp nhập mã quà tặng. Gọi onDone sau khi đổi mã thành công và đóng. */
export function openGiftCode(scene: Phaser.Scene, onDone?: () => void) {
  const m = modal(scene, 640, 400, "🎁 Mã Quà Tặng");
  const cx = m.x + m.w / 2;
  m.root.add(txt(scene, cx, m.y + 90, "Nhập mã để nhận nhân vật và quà đặc biệt", 20, { align: "center", weight: "700" }).setOrigin(0.5));
  const input = htmlOverlay(
    scene,
    m.root,
    cx,
    m.y + 160,
    420,
    60,
    `<input id="gift-code" maxlength="32" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Nhập mã…" style="width:100%;height:100%;box-sizing:border-box;text-align:center;font:800 26px 'Baloo 2',sans-serif;padding:4px 14px;border-radius:14px;border:3px solid #1b1530;background:#fff8e1;color:#1b1530;letter-spacing:.06em">`,
  );
  const submit = () => {
    const el = document.getElementById("gift-code") as HTMLInputElement | null;
    const code = el?.value ?? "";
    const r = GameState.redeem(code);
    if (!r.ok) {
      Sfx.locked();
      toast(scene, r.error, COLORS.red);
      return;
    }
    m.close();
    if (r.character) celebrate(scene, r.character.id, onDone);
    else if (r.rod) celebrateRod(scene, r.rod.id, onDone);
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submit();
  });
  m.root.add(new Button(scene, cx, m.y + 250, 260, 64, "Nhận quà", { color: COLORS.orange, fontSize: 28, onClick: submit }));
  m.root.add(txt(scene, cx, m.y + 320, "Mỗi mã chỉ dùng được một lần cho mỗi tài khoản.", 16, { align: "center", color: COLORS.textDim, weight: "700" }).setOrigin(0.5));
}

/** Màn chào mừng nhân vật mới: hào quang, tia sáng, pháo hoa. */
function celebrate(scene: Phaser.Scene, charId: string, onDone?: () => void) {
  {
    const ch = CHARACTER_BY_ID.get(charId)!;
    const root = scene.add.container(0, 0).setDepth(950);
    root.add(scene.add.rectangle(0, 0, 1280, 720, 0x000000, 0.75).setOrigin(0).setInteractive());
    const rays = scene.add.container(640, 330);
    const col = Phaser.Display.Color.HexStringToColor(CHAR_RARITY_COLOR[ch.rarity]).color;
    for (let i = 0; i < 16; i++) rays.add(scene.add.image(0, 0, "p_ray").setOrigin(0.5, 0).setAngle(i * 22.5).setTint(col).setAlpha(0.6).setBlendMode(Phaser.BlendModes.ADD));
    root.add(rays);
    scene.tweens.add({ targets: rays, angle: 360, duration: 12000, repeat: -1 });
    const aura = scene.add.image(640, 470, auraTexture(scene, ch)).setOrigin(0.5, 1).setScale(1.8).setAlpha(0.9);
    const hero = scene.add.image(640, 470, characterTexture(scene, ch, GameState.equipOf(ch.id))).setOrigin(0.5, 1).setScale(0.2);
    root.add([aura, hero]);
    scene.tweens.add({ targets: hero, scale: 1.6, duration: 600, ease: "Back.easeOut" });
    scene.tweens.add({ targets: aura, scale: 2.1, alpha: 0.5, duration: 900, yoyo: true, repeat: -1 });
    root.add(txt(scene, 640, 90, `${ch.rarity} · NHÂN VẬT MỚI!`, 44, { color: CHAR_RARITY_COLOR[ch.rarity], align: "center" }).setOrigin(0.5));
    root.add(txt(scene, 640, 520, ch.name, 52, { color: "#ffd54f", align: "center" }).setOrigin(0.5));
    root.add(txt(scene, 640, 568, `${ch.title} · ${ch.active.name}`, 24, { align: "center" }).setOrigin(0.5));
    for (let i = 0; i < 5; i++) {
      scene.time.delayedCall(i * 300, () =>
        root.add(
          scene.add.particles(Phaser.Math.Between(300, 980), Phaser.Math.Between(150, 400), "p_spark", {
            speed: { min: 120, max: 360 },
            lifespan: 900,
            scale: { start: 1.2, end: 0 },
            tint: [col, 0xffffff, 0xffd54f],
            quantity: 26,
            stopAfter: 26,
            blendMode: Phaser.BlendModes.ADD,
          }),
        ),
      );
    }
    scene.cameras.main.flash(500, 255, 255, 255);
    Sfx.catchFanfare(true);
    root.add(
      new Button(scene, 640, 650, 300, 66, "Nhận & Sử dụng", {
        color: COLORS.orange,
        fontSize: 28,
        onClick: () => {
          GameState.select("selectedCharacterId", ch.id);
          root.destroy(true);
          onDone?.();
        },
      }),
    );
  }
}

/** Màn chào mừng cần câu mới. */
function celebrateRod(scene: Phaser.Scene, rodId: string, onDone?: () => void) {
  const rod = ROD_BY_ID.get(rodId)!;
  const col = Phaser.Display.Color.HexStringToColor(rod.visual.glow ?? CHAR_RARITY_COLOR[rod.rarity]).color;
  const root = scene.add.container(0, 0).setDepth(950);
  root.add(scene.add.rectangle(0, 0, 1280, 720, 0x000000, 0.82).setOrigin(0).setInteractive());
  const rays = scene.add.container(640, 320);
  for (let i = 0; i < 16; i++) rays.add(scene.add.image(0, 0, "p_ray").setOrigin(0.5, 0).setAngle(i * 22.5).setTint(col).setAlpha(0.55).setBlendMode(Phaser.BlendModes.ADD));
  root.add(rays);
  scene.tweens.add({ targets: rays, angle: -360, duration: 10000, repeat: -1 });
  const img = scene.add.image(640, 320, rodIconTexture(scene, rod)).setScale(0.2).setAngle(-20);
  root.add(img);
  scene.tweens.add({ targets: img, scale: 1.5, angle: 0, duration: 700, ease: "Back.easeOut" });
  scene.tweens.add({ targets: img, y: 305, duration: 1100, yoyo: true, repeat: -1, ease: "Sine.easeInOut", delay: 700 });
  root.add(
    scene.add.particles(640, 320, "p_ember", {
      x: { min: -160, max: 160 },
      y: { min: -160, max: 160 },
      speedY: { min: -90, max: -30 },
      lifespan: 1400,
      frequency: 30,
      scale: { start: 1.8, end: 0 },
      tint: [col, 0x111111, 0xff8a80],
    }),
  );
  root.add(txt(scene, 640, 70, `${rod.rarity} · CẦN CÂU SIÊU CẤP!`, 44, { color: CHAR_RARITY_COLOR[rod.rarity], align: "center" }).setOrigin(0.5));
  root.add(txt(scene, 640, 540, rod.name, 54, { color: "#ff5252", align: "center" }).setOrigin(0.5));
  root.add(txt(scene, 640, 590, `Lực kéo ${rod.pull} · Độ bền ${rod.durability} · ${rod.passive.name}`, 22, { align: "center" }).setOrigin(0.5));
  scene.cameras.main.flash(500, 255, 30, 60);
  scene.cameras.main.shake(400, 0.01);
  Sfx.catchFanfare(true);
  root.add(
    new Button(scene, 640, 660, 300, 62, "Nhận & Sử dụng", {
      color: COLORS.red,
      fontSize: 28,
      onClick: () => {
        GameState.select("selectedRodId", rod.id);
        root.destroy(true);
        onDone?.();
      },
    }),
  );
}
