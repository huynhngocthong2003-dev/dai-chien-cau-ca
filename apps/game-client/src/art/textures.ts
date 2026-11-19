import Phaser from "phaser";
import type { AccessoryKind, CharacterDef, CosmeticSlot, FishDef, HatKind, OutfitKind, ZoneDef } from "@dccc/shared";
import { COSMETIC_BY_ID } from "@dccc/game-data";
import { FISH_H, FISH_W, drawFish, drawFishSilhouette } from "./FishArt.ts";
import { CHAR_H, CHAR_W, defaultLook, drawAura, drawCharacter, type Look } from "./CharacterArt.ts";
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

export type Equip = Partial<Record<CosmeticSlot, string>>;

/** Ghép đồ đang mặc vào diện mạo mặc định của nhân vật. */
export function resolveLook(c: CharacterDef, equip: Equip = {}): Look {
  const look = defaultLook(c.appearance);
  const hat = equip.hat ? COSMETIC_BY_ID.get(equip.hat) : undefined;
  const outfit = equip.outfit ? COSMETIC_BY_ID.get(equip.outfit) : undefined;
  const acc = equip.accessory ? COSMETIC_BY_ID.get(equip.accessory) : undefined;
  if (hat) look.hat = { kind: hat.visual.kind as HatKind, color: hat.visual.color, accent: hat.visual.accent };
  if (outfit) look.outfit = { kind: outfit.visual.kind as OutfitKind, color: outfit.visual.color, accent: outfit.visual.accent };
  if (acc) look.accessory = { kind: acc.visual.kind as AccessoryKind, color: acc.visual.color, accent: acc.visual.accent };
  return look;
}

function equipKey(equip: Equip = {}) {
  return `${equip.hat ?? "-"}_${equip.outfit ?? "-"}_${equip.accessory ?? "-"}`;
}

export function characterTexture(scene: Phaser.Scene, c: CharacterDef, equip?: Equip): string {
  const look = resolveLook(c, equip);
  return canvasTexture(scene, `char_${c.id}_${equipKey(equip)}`, CHAR_W, CHAR_H, (ctx) => drawCharacter(ctx, c.appearance, { look }));
}

export function characterHeadTexture(scene: Phaser.Scene, c: CharacterDef, equip?: Equip): string {
  const look = resolveLook(c, equip);
  return canvasTexture(scene, `head_${c.id}_${equipKey(equip)}`, CHAR_W, CHAR_H, (ctx) => drawCharacter(ctx, c.appearance, { headOnly: true, look }), 0.6);
}

/** Hình vật phẩm trang phục (vẽ trên một nhân vật mẫu để thấy rõ). */
export function cosmeticTexture(scene: Phaser.Scene, model: CharacterDef, itemId: string): string {
  const item = COSMETIC_BY_ID.get(itemId)!;
  const equip: Equip = { [item.slot]: itemId };
  const look = resolveLook(model, equip);
  if (item.slot !== "hat") look.hat = { kind: "none", color: "#000", accent: "#000" };
  if (item.slot !== "outfit") look.outfit = { kind: "tee", color: "#eceff1", accent: "#eceff1" };
  return canvasTexture(scene, `cos_${itemId}`, CHAR_W, CHAR_H, (ctx) => drawCharacter(ctx, model.appearance, { look, headOnly: item.slot !== "outfit" }), 0.6);
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
