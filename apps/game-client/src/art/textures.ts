import Phaser from "phaser";
import type { AccessoryKind, CharacterDef, Element, FishFormDef, SkinKind, CosmeticSlot, CosmeticTier, FishDef, HatKind, HornKind, JunkDef, OutfitKind, RodDef, WingKind, ZoneDef } from "@dccc/shared";
import { TIER_COLOR, TIER_ORDER } from "@dccc/game-config";
import { drawOrnament, drawReel, drawRodIcon } from "./RodArt.ts";
import { BREED_LOOKS, COSMETIC_BY_ID, FISH_BY_ID, FORM_BY_ID, breedTierOf } from "@dccc/game-data";
import { HABITAT, drawBreedEgg, drawBreedFish, drawHabitatMap, drawParentHybrid, evolveBreedLook } from "./BreedArt.ts";
import type { EggLook } from "@dccc/shared";
import { drawFormFish } from "./FormArt.ts";
import { drawEvoItem } from "./EvoItemArt.ts";
import { drawElementIcon } from "./ElementArt.ts";
import { STAGE_K } from "./StageArt.ts";
import { fishStage, isGrowthFish, stageScale } from "@dccc/shared";
import { FISH_H, FISH_W, drawFish, drawFishSilhouette } from "./FishArt.ts";
import { CHAR_H, CHAR_W, defaultLook, drawAura, drawCharacter, type Look } from "./CharacterArt.ts";
import { WORLD_H, WORLD_W, drawDock, drawZoneBackground } from "./Backgrounds.ts";
import { drawJunk } from "./JunkArt.ts";
import { MENU_ICON_SIZE, drawMenuIcon, type MenuIcon } from "./MenuIcons.ts";

/** Tạo texture từ hàm vẽ Canvas 2D (chỉ tạo một lần, lazy). */
export function canvasTexture(
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

/**
 * Làm mờ dần mép khung (hình elip): hào quang / tia sét / mây của cá trưởng thành & đột biến
 * không bị cắt thành vệt vuông khi hiện trong ô nhỏ.
 */
function softEdges(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save();
  ctx.globalCompositeOperation = "destination-in";
  ctx.translate(w / 2, h / 2);
  ctx.scale(w / h, 1);
  const r = (h / 2) * 1.08;
  const g = ctx.createRadialGradient(0, 0, r * 0.62, 0, 0, r);
  g.addColorStop(0, "rgba(0,0,0,1)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(-w, -h, w * 2, h * 2);
  ctx.restore();
}

/** Biểu tượng mục menu sảnh (vẽ tay, cùng phong cách game). */
export function menuIconTexture(scene: Phaser.Scene, kind: MenuIcon): string {
  return canvasTexture(scene, `menuicon_${kind}`, MENU_ICON_SIZE, MENU_ICON_SIZE, (ctx) => drawMenuIcon(ctx, kind), 1.5);
}

/** Quầng sáng tròn mềm (thay cho hạt lấp lánh phóng to làm nền sau cá). */
export function softGlowTexture(scene: Phaser.Scene): string {
  return canvasTexture(scene, "soft_glow", 128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,0.95)");
    g.addColorStop(0.45, "rgba(255,255,255,0.45)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  });
}

/** stage 0 = hình loài (sách cá, câu được); 1..4 = cá Huyền Thoại/Boss/Thần Thoại theo giai trưởng thành. */
export function fishTexture(scene: Phaser.Scene, fish: FishDef, stage = 0): string {
  if (BREED_LOOKS[fish.id]) return breedFishTexture(scene, fish.id, stage);
  const res = fish.appearance.scale >= 1.5 || stage >= 3 ? 1.4 : 1;
  return canvasTexture(scene, `fish_${fish.id}${stage ? `_s${stage}` : ""}`, FISH_W, FISH_H, (ctx) => {
    drawFish(ctx, fish, stage);
    if (stage >= 1) softEdges(ctx, FISH_W, FISH_H);
  }, res);
}

/** Cá đã đột biến (ngoại hình riêng theo dạng). */
export function formFishTexture(scene: Phaser.Scene, fish: FishDef, form: FishFormDef, stage = 0): string {
  if (BREED_LOOKS[fish.id]) return breedFishTexture(scene, fish.id, stage);
  const res = fish.appearance.scale >= 1.5 || stage >= 3 ? 1.4 : 1;
  return canvasTexture(scene, `fishform_${fish.id}_${form.id}${stage ? `_s${stage}` : ""}`, FISH_W, FISH_H, (ctx) => {
    drawFormFish(ctx, fish, form, stage);
    softEdges(ctx, FISH_W, FISH_H);
  }, res);
}

/** Cá lai / Kraken của Đảo Lai Tạo: hình riêng (cùng khung 320×200 với cá thường). */
export function breedFishTexture(scene: Phaser.Scene, fishId: string, stage = 0, t = 0.3): string {
  // giai trưởng thành (Sơ/Trung/Cao/Thánh): hình tiến hoá riêng
  const look = evolveBreedLook(BREED_LOOKS[fishId]!, stage);
  const tier = breedTierOf(fishId);
  const fierce = stage >= 2 || tier === "super" || tier === "mythic" || tier === "recessive";
  return canvasTexture(scene, `breedfish_${fishId}${stage > 1 ? `_s${stage}` : ""}`, FISH_W, FISH_H, (ctx) => {
    ctx.translate(FISH_W / 2 + 10, FISH_H / 2 + 6);
    drawBreedFish(ctx, look, look.ring ? 0.72 : look.wings ? 0.8 : 0.9, t, fierce);
  }, 1.4);
}

const TIER_IDX = { boss: 0, hybrid: 0, super: 1, mythic: 2, recessive: 3 } as const;

/** Cá lai theo bố mẹ: đầu theo bố, đuôi/vây theo mẹ, bậc lai thêm cánh/hào quang; lớn & dữ dần theo giai. */
export function hybridTexture(scene: Phaser.Scene, fishId: string, parents: readonly [string, string], stage = 0): string {
  const dad = FISH_BY_ID.get(parents[0]);
  const mom = FISH_BY_ID.get(parents[1]);
  if (!dad || !mom || !BREED_LOOKS[fishId]) return breedFishTexture(scene, fishId, stage);
  const key = `hyb_${fishId}_${parents[0]}_${parents[1]}_s${stage}`;
  return canvasTexture(scene, key, FISH_W, FISH_H, (ctx) => {
    drawParentHybrid(ctx, dad, mom, BREED_LOOKS[fishId]!, TIER_IDX[breedTierOf(fishId)], Math.max(1, stage), `${parents[0]}x${parents[1]}#${fishId}`);
    softEdges(ctx, FISH_W, FISH_H);
  }, 1.4);
}

/** Trứng lai (crack 0..1 = mức nứt; glow 0..1 = toả sáng). */
export function breedEggTexture(scene: Phaser.Scene, egg: EggLook, crack = 0, glow = 0): string {
  const key = `breedegg_${egg.a}${egg.b}${egg.spot}_${Math.round(crack * 10)}_${Math.round(glow * 10)}`;
  return canvasTexture(scene, key, 240, 260, (ctx) => {
    ctx.translate(120, 136);
    drawBreedEgg(ctx, egg, 1.7, 0.4, crack, glow);
  });
}

/** Nền bản đồ Đảo Lai Tạo (bể nuôi + hang ấp trứng). */
export function habitatMapTexture(scene: Phaser.Scene): string {
  return canvasTexture(scene, "habitat_map", HABITAT.w, HABITAT.h, (ctx) => drawHabitatMap(ctx));
}

/** Giai hiển thị: 0 nếu không phải cá trưởng thành hoặc không biết sao. */
function displayStage(fish: FishDef, stars?: number | null): number {
  return stars && isGrowthFish(fish) ? fishStage(stars) : 0;
}

/** Texture cá theo dạng đột biến + giai trưởng thành (truyền `stars` của cá đang sở hữu). */
export function fishTextureFor(scene: Phaser.Scene, fish: FishDef, formId?: string | null, stars?: number | null, parents?: readonly [string, string] | null): string {
  // cá lai: vẽ theo dáng của chính cá bố & mẹ đã sinh ra nó
  if (parents && BREED_LOOKS[fish.id]) return hybridTexture(scene, fish.id, parents, displayStage(fish, stars));
  const form = formId ? FORM_BY_ID.get(formId) : null;
  const st = displayStage(fish, stars);
  return form ? formFishTexture(scene, fish, form, st) : fishTexture(scene, fish, st);
}

/**
 * Hệ số phóng hình cá trưởng thành so với khung hiển thị thường: Sơ Giai nhỏ, Thánh Giai lớn nhất
 * (cá được vẽ thu nhỏ trong texture để chừa chỗ hào quang/cánh).
 */
export function fishDisplayMult(fish: FishDef, stars?: number | null): number {
  const st = displayStage(fish, stars);
  return st ? stageScale(st) / STAGE_K : 1;
}

export function fishSilhouetteTexture(scene: Phaser.Scene, fish: FishDef): string {
  return canvasTexture(scene, `fishsil_${fish.id}`, FISH_W, FISH_H, (ctx) => drawFishSilhouette(ctx, fish), 0.6);
}

export type Equip = Partial<Record<CosmeticSlot, string>>;

/** Ghép đồ đang mặc vào diện mạo mặc định của nhân vật. */
/** Bậc thời trang cao nhất trong bộ đồ đang mặc. */
export function topTier(equip: Equip = {}): CosmeticTier | null {
  let best = -1;
  for (const id of Object.values(equip)) {
    const t = id ? COSMETIC_BY_ID.get(id)?.tier : undefined;
    if (t) best = Math.max(best, TIER_ORDER.indexOf(t));
  }
  return best < 0 ? null : TIER_ORDER[best]!;
}

/** Ghép đồ đang mặc vào diện mạo mặc định của nhân vật. */
export function resolveLook(c: CharacterDef, equip: Equip = {}): Look {
  const look = defaultLook(c.appearance);
  const get = (slot: CosmeticSlot) => (equip[slot] ? COSMETIC_BY_ID.get(equip[slot]!) : undefined);
  const hat = get("hat");
  const outfit = get("outfit");
  const acc = get("accessory");
  const wings = get("wings");
  const horns = get("horns");
  const skin = get("skin");
  if (hat) look.hat = { kind: hat.visual.kind as HatKind, color: hat.visual.color, accent: hat.visual.accent };
  if (outfit) look.outfit = { kind: outfit.visual.kind as OutfitKind, color: outfit.visual.color, accent: outfit.visual.accent };
  if (acc) look.accessory = { kind: acc.visual.kind as AccessoryKind, color: acc.visual.color, accent: acc.visual.accent };
  if (wings) look.wings = { kind: wings.visual.kind as WingKind, color: wings.visual.color, accent: wings.visual.accent };
  if (horns) look.horns = { kind: horns.visual.kind as HornKind, color: horns.visual.color, accent: horns.visual.accent };
  if (skin) {
    look.skin = skin.visual.kind as SkinKind;
    look.ownHat = !!hat;
    look.ownAccessory = !!acc;
  }
  const tier = topTier(equip);
  if (tier === "superior" || tier === "legendary" || tier === "divine") look.glow = TIER_COLOR[tier];
  look.sparkle = tier === "divine" ? 10 : tier === "legendary" ? 5 : 0;
  return look;
}

function equipKey(equip: Equip = {}) {
  return `${equip.hat ?? "-"}_${equip.outfit ?? "-"}_${equip.accessory ?? "-"}_${equip.wings ?? "-"}_${equip.horns ?? "-"}_${equip.skin ?? "-"}`;
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
  const full = item.slot === "outfit" || item.slot === "wings" || item.slot === "skin";
  return canvasTexture(scene, `cos_${itemId}`, CHAR_W, CHAR_H, (ctx) => drawCharacter(ctx, model.appearance, { look, headOnly: !full }), 0.6);
}

export function rodIconTexture(scene: Phaser.Scene, rod: RodDef): string {
  return canvasTexture(scene, `rodicon_${rod.id}`, 300, 300, (ctx) => drawRodIcon(ctx, rod, 300, 300));
}

export function ornamentTexture(scene: Phaser.Scene, rod: RodDef): string {
  return canvasTexture(scene, `rodorn_${rod.id}`, 80, 80, (ctx) => {
    ctx.translate(40, 58);
    drawOrnament(ctx, rod.visual.ornament, 22, rod);
  });
}

export function reelTexture(scene: Phaser.Scene, rod: RodDef): string {
  return canvasTexture(scene, `reel_${rod.id}`, 60, 60, (ctx) => {
    ctx.translate(26, 28);
    drawReel(ctx, rod, 13);
  });
}

export function auraTexture(scene: Phaser.Scene, c: CharacterDef): string {
  return canvasTexture(scene, `aura_${c.id}`, CHAR_W, CHAR_H, (ctx) => drawAura(ctx, c.appearance.aura));
}

export function zoneTexture(scene: Phaser.Scene, z: ZoneDef): string {
  return canvasTexture(scene, `zone_${z.id}`, WORLD_W, WORLD_H, (ctx) => drawZoneBackground(ctx, z));
}

/** Bục câu theo kiểu khu vực (0..5). */
export function dockTexture(scene: Phaser.Scene, style = 0): string {
  return canvasTexture(scene, `dock_${style}`, 340, 360, (ctx) => drawDock(ctx, 340, 360, style));
}

export function junkTexture(scene: Phaser.Scene, j: JunkDef): string {
  return canvasTexture(scene, `junk_${j.id}`, FISH_W, FISH_H, (ctx) => drawJunk(ctx, j));
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

/** Cá nướng: thân vàng nâu cháy cạnh, vằn vỉ nướng, xiên tre, lá chanh trang trí. */
export function roastedFishTexture(scene: Phaser.Scene, fish: FishDef): string {
  return canvasTexture(scene, `roast_${fish.id}`, FISH_W, FISH_H, (ctx) => {
    const W = FISH_W;
    const H = FISH_H;
    // vẽ cá lên lớp riêng rồi "nướng" (chỉ tô trong hình con cá)
    const layer = document.createElement("canvas");
    layer.width = W;
    layer.height = H;
    const l = layer.getContext("2d")!;
    l.save();
    l.translate(W * 0.08, H * 0.1);
    l.scale(0.84, 0.8);
    drawFish(l, fish);
    l.restore();
    l.globalCompositeOperation = "source-atop";
    // lớp màu nướng vàng nâu
    const g = l.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "rgba(170,85,20,0.6)");
    g.addColorStop(0.5, "rgba(240,160,60,0.5)");
    g.addColorStop(1, "rgba(140,60,12,0.65)");
    l.fillStyle = g;
    l.fillRect(0, 0, W, H);
    // cháy xém viền đuôi và đầu
    const burn = l.createRadialGradient(W / 2, H / 2, H * 0.15, W / 2, H / 2, W * 0.5);
    burn.addColorStop(0, "rgba(0,0,0,0)");
    burn.addColorStop(1, "rgba(60,22,0,0.5)");
    l.fillStyle = burn;
    l.fillRect(0, 0, W, H);
    // vằn vỉ nướng chéo
    l.strokeStyle = "rgba(70,28,4,0.55)";
    l.lineCap = "round";
    l.lineWidth = Math.max(3, W * 0.014);
    for (let i = 0; i < 5; i++) {
      const x = W * 0.24 + i * W * 0.11;
      l.beginPath();
      l.moveTo(x, H * 0.15);
      l.lineTo(x + W * 0.13, H * 0.85);
      l.stroke();
    }
    // bóng mỡ óng ánh
    l.fillStyle = "rgba(255,230,160,0.45)";
    for (let i = 0; i < 6; i++) {
      l.beginPath();
      l.ellipse(W * (0.28 + i * 0.09), H * (0.36 + (i % 2) * 0.06), W * 0.018, H * 0.03, -0.5, 0, Math.PI * 2);
      l.fill();
    }
    // xiên tre xuyên thân (phía sau)
    const stick = (alpha: number) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#1b1530";
      ctx.lineWidth = 11;
      ctx.beginPath();
      ctx.moveTo(W * 0.01, H * 0.6);
      ctx.lineTo(W * 0.99, H * 0.48);
      ctx.stroke();
      ctx.strokeStyle = "#d7a65a";
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,240,200,0.7)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    };
    stick(1);
    ctx.drawImage(layer, 0, 0);
    // đầu xiên lộ ra trước thân
    ctx.save();
    ctx.beginPath();
    ctx.rect(W * 0.9, 0, W * 0.1, H);
    ctx.rect(0, 0, W * 0.09, H);
    ctx.clip();
    stick(1);
    ctx.restore();
    // lá chanh + lát ớt trang trí
    ctx.save();
    ctx.translate(W * 0.5, H * 0.2);
    ctx.rotate(-0.4);
    ctx.fillStyle = "#43a047";
    ctx.strokeStyle = "#1b1530";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, W * 0.06, H * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#a5d6a7";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-W * 0.05, 0);
    ctx.lineTo(W * 0.05, 0);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "#e53935";
    ctx.strokeStyle = "#1b1530";
    ctx.lineWidth = 2;
    for (const [x, y] of [[0.6, 0.22], [0.42, 0.26]] as const) {
      ctx.beginPath();
      ctx.arc(W * x, H * y, W * 0.016, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  });
}

/** Hình Đá Tiến Hoá / thần vật. */
export function evoItemTexture(scene: Phaser.Scene, itemId: string): string {
  return canvasTexture(scene, `evo_${itemId}`, 128, 128, (ctx) => drawEvoItem(ctx, itemId));
}

/** Biểu tượng nguyên tố (một hình cho mỗi hệ – dùng ở mọi màn). */
export function elementTexture(scene: Phaser.Scene, el: Element): string {
  return canvasTexture(scene, `elem_${el}`, 96, 96, (ctx) => drawElementIcon(ctx, el));
}
