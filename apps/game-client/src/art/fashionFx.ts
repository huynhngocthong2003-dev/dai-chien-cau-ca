import Phaser from "phaser";
import { TIER_COLOR } from "@dccc/game-config";
import { topTier, type Equip } from "./textures.ts";

/**
 * Hiệu ứng động quanh nhân vật theo bậc thời trang cao nhất đang mặc:
 *  - Cực Phẩm: hào quang phát sáng nhịp nhàng
 *  - Huyền Thoại: + hạt lấp lánh bay lên
 *  - Thần Phẩm: + hạt cầu vồng và 3 quả cầu ánh sáng bay vòng quanh
 * (cx, cy) là tâm thân nhân vật trên màn hình; tự hủy cùng `owner`.
 */
export function addFashionFx(
  scene: Phaser.Scene,
  owner: Phaser.GameObjects.GameObject,
  cx: number,
  cy: number,
  scale: number,
  equip: Equip,
  depth: number,
  container?: Phaser.GameObjects.Container,
) {
  const tier = topTier(equip);
  if (tier !== "superior" && tier !== "legendary" && tier !== "divine") return;
  const col = Phaser.Display.Color.HexStringToColor(TIER_COLOR[tier]).color;
  const objs: Phaser.GameObjects.GameObject[] = [];
  const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
    objs.push(o);
    if (container) container.add(o);
    return o;
  };

  const glow = add(
    scene.add
      .image(cx, cy, "p_spark")
      .setTint(col)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.35)
      .setScale(7 * scale)
      .setDepth(depth - 1),
  );
  scene.tweens.add({ targets: glow, alpha: 0.12, scale: 8.5 * scale, duration: 1100, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

  if (tier === "legendary" || tier === "divine") {
    add(
      scene.add
        .particles(cx, cy + 40 * scale, "p_spark", {
          x: { min: -70 * scale, max: 70 * scale },
          y: { min: -20 * scale, max: 30 * scale },
          speedY: { min: -70 * scale, max: -25 * scale },
          lifespan: 1400,
          frequency: tier === "divine" ? 70 : 160,
          scale: { start: 0.55 * scale, end: 0 },
          rotate: { min: 0, max: 360 },
          tint: tier === "divine" ? [0xff1744, 0xffea00, 0x00e676, 0x2979ff, 0xd500f9, 0xffffff] : [col, 0xffffff],
          blendMode: Phaser.BlendModes.ADD,
        })
        .setDepth(depth + 1),
    );
  }

  if (tier === "divine") {
    const orbs = [0xff80ab, 0x80d8ff, 0xffff8d].map((c) =>
      add(scene.add.image(cx, cy, "p_drop").setTint(c).setScale(1.6 * scale).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 1)),
    );
    let t = 0;
    const onUpdate = (_: number, dt: number) => {
      t += dt / 1000;
      orbs.forEach((o, i) => {
        const a = t * 1.6 + (i * Math.PI * 2) / 3;
        o.setPosition(cx + Math.cos(a) * 80 * scale, cy - 10 * scale + Math.sin(a) * 26 * scale);
        o.setDepth(Math.sin(a) > 0 ? depth + 1 : depth - 1);
      });
    };
    scene.events.on(Phaser.Scenes.Events.UPDATE, onUpdate);
    owner.once(Phaser.GameObjects.Events.DESTROY, () => scene.events.off(Phaser.Scenes.Events.UPDATE, onUpdate));
  }
  owner.once(Phaser.GameObjects.Events.DESTROY, () => objs.forEach((o) => o.active && o.destroy()));
}
