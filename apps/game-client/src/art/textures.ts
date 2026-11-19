import Phaser from "phaser";
import type { CharacterDef, FishDef, ZoneDef } from "@dccc/shared";
import { FISH_H, FISH_W, drawFish, drawFishSilhouette } from "./FishArt.ts";
import { CHAR_H, CHAR_W, drawAura, drawCharacter } from "./CharacterArt.ts";
import { WORLD_H, WORLD_W, drawDock, drawZoneBackground } from "./Backgrounds.ts";

/** Tạo texture từ hàm vẽ Canvas 2D (chỉ tạo một lần, lazy). */
function canvasTexture(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
  res = 1,
): string {
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, Math.round(w * res), Math.round(h * res));
  if (!tex) throw new Error(`Không tạo được texture ${key}`);
  const ctx = tex.getContext();
  ctx.save();
  ctx.scale(res, res);
  draw(ctx);
  ctx.restore();
  tex.refresh();
  return key;
}

export function fishTexture(scene: Phaser.Scene, fish: FishDef): string {
  const res = fish.appearance.scale >= 1.5 ? 1.4 : 1;
  return canvasTexture(scene, `fish_${fish.id}`, FISH_W, FISH_H, (ctx) => drawFish(ctx, fish), res);
}

export function fishSilhouetteTexture(scene: Phaser.Scene, fish: FishDef): string {
  return canvasTexture(scene, `fishsil_${fish.id}`, FISH_W, FISH_H, (ctx) => drawFishSilhouette(ctx, fish), 0.6);
}

export function characterTexture(scene: Phaser.Scene, c: CharacterDef): string {
  return canvasTexture(scene, `char_${c.id}`, CHAR_W, CHAR_H, (ctx) => drawCharacter(ctx, c.appearance));
}

export function characterHeadTexture(scene: Phaser.Scene, c: CharacterDef): string {
  return canvasTexture(scene, `head_${c.id}`, CHAR_W, CHAR_H, (ctx) => drawCharacter(ctx, c.appearance, { headOnly: true }), 0.6);
}

export function auraTexture(scene: Phaser.Scene, c: CharacterDef): string {
  return canvasTexture(scene, `aura_${c.id}`, CHAR_W, CHAR_H, (ctx) => drawAura(ctx, c.appearance.aura));
}

export function zoneTexture(scene: Phaser.Scene, z: ZoneDef): string {
  return canvasTexture(scene, `zone_${z.id}`, WORLD_W, WORLD_H, (ctx) => drawZoneBackground(ctx, z));
}

export function dockTexture(scene: Phaser.Scene): string {
  return canvasTexture(scene, "dock", 340, 360, (ctx) => drawDock(ctx, 340, 360));
}

/** Các texture nhỏ dùng cho hạt hiệu ứng. */
export function makeParticleTextures(scene: Phaser.Scene) {
  canvasTexture(scene, "p_drop", 16, 16, (ctx) => {
    const g = ctx.createRadialGradient(8, 8, 1, 8, 8, 8);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(1, "rgba(180,230,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 16, 16);
  });
  canvasTexture(scene, "p_spark", 24, 24, (ctx) => {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = i % 2 ? 3 : 12;
      ctx.lineTo(12 + Math.cos(a) * r, 12 + Math.sin(a) * r);
    }
    ctx.fill();
  });
  canvasTexture(scene, "p_bubble", 16, 16, (ctx) => {
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(8, 8, 6, 0, Math.PI * 2);
    ctx.stroke();
  });
  canvasTexture(scene, "p_snow", 10, 10, (ctx) => {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(5, 5, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  canvasTexture(scene, "p_ember", 10, 10, (ctx) => {
    const g = ctx.createRadialGradient(5, 5, 0, 5, 5, 5);
    g.addColorStop(0, "#fff59d");
    g.addColorStop(1, "rgba(255,87,34,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 10, 10);
  });
  canvasTexture(scene, "p_leaf", 14, 10, (ctx) => {
    ctx.fillStyle = "#8bc34a";
    ctx.beginPath();
    ctx.ellipse(7, 5, 6, 3, 0.4, 0, Math.PI * 2);
    ctx.fill();
  });
  canvasTexture(scene, "p_ray", 64, 512, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, "rgba(255,255,255,0.9)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(26, 0);
    ctx.lineTo(38, 0);
    ctx.lineTo(64, 512);
    ctx.lineTo(0, 512);
    ctx.fill();
  });
  canvasTexture(scene, "bobber", 28, 40, (ctx) => {
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#1b1530";
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(14, 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(14, 22, 11, Math.PI, 0);
    ctx.fillStyle = "#e53935";
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(14, 22, 11, 0, Math.PI);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.stroke();
  });
}
