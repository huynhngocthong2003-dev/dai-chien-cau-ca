import { CHARACTERS, COSMETICS, FISHES, ZONES } from "@dccc/game-data";
import { FISH_H, FISH_W, drawFish } from "../src/art/FishArt.ts";
import { CHAR_H, CHAR_W, defaultLook, drawAura, drawCharacter } from "../src/art/CharacterArt.ts";
import type { AccessoryKind, HatKind, OutfitKind } from "@dccc/shared";
import { resolveLook } from "../src/art/textures.ts";
import { drawDock, drawZoneBackground } from "../src/art/Backgrounds.ts";

const mode = new URLSearchParams(location.search).get("mode") ?? "fish";
const c = document.getElementById("c") as HTMLCanvasElement;
const ctx = c.getContext("2d")!;
if (mode === "fish") {
  const cols = 6, cw = FISH_W * 0.75, ch = FISH_H * 0.75 + 18;
  c.width = cols * cw;
  c.height = Math.ceil(FISHES.length / cols) * ch;
  FISHES.forEach((f, i) => {
    ctx.save();
    ctx.translate((i % cols) * cw, Math.floor(i / cols) * ch);
    ctx.fillStyle = "#fff";
    ctx.font = "13px sans-serif";
    ctx.fillText(`${f.name} (${f.rarity})`, 6, 14);
    ctx.translate(0, 16);
    ctx.scale(0.75, 0.75);
    drawFish(ctx, f);
    ctx.restore();
  });
} else if (mode === "chars") {
  c.width = 7 * CHAR_W;
  c.height = 2 * CHAR_H + 200;
  CHARACTERS.forEach((ch, i) => {
    ctx.save();
    ctx.translate((i % 7) * CHAR_W, Math.floor(i / 7) * CHAR_H);
    if (i === 0) drawAura(ctx, ch.appearance.aura);
    drawCharacter(ctx, ch.appearance);
    ctx.restore();
  });
  CHARACTERS.slice(0, 6).forEach((ch, i) => {
    ctx.save();
    ctx.translate(i * 200, 2 * CHAR_H);
    ctx.scale(0.8, 0.8);
    drawCharacter(ctx, ch.appearance, { headOnly: true });
    ctx.restore();
  });
} else if (mode === "icon") {
  c.width = 512;
  c.height = 512;
  const g = ctx.createRadialGradient(256, 200, 40, 256, 256, 360);
  g.addColorStop(0, "#4fc3f7");
  g.addColorStop(1, "#0b2a4a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    for (let x = 0; x <= 512; x += 16) ctx.lineTo(x, 330 + i * 40 + Math.sin(x / 40 + i) * 8);
    ctx.lineTo(512, 512);
    ctx.lineTo(0, 512);
    ctx.fill();
  }
  const boss = FISHES.find((f) => f.id === "f_boss_lao_ngu")!;
  ctx.save();
  ctx.translate(150, 210);
  ctx.rotate(-0.35);
  ctx.scale(1.15, 1.15);
  drawFish(ctx, boss);
  ctx.restore();
  ctx.save();
  ctx.translate(-30, 150);
  ctx.scale(1.55, 1.55);
  drawCharacter(ctx, CHARACTERS[0]!.appearance, { headOnly: true });
  ctx.restore();
} else if (mode === "fashion") {
  const list = COSMETICS.filter((x) => x.slot === "wings" || x.slot === "horns" || x.tier === "divine");
  c.width = 7 * CHAR_W;
  c.height = 2 * CHAR_H;
  list.forEach((it, i) => {
    const equip = { [it.slot]: it.id };
    const look = resolveLook(CHARACTERS[i % CHARACTERS.length]!, equip);
    ctx.save();
    ctx.translate((i % 7) * CHAR_W, Math.floor(i / 7) * CHAR_H);
    drawCharacter(ctx, CHARACTERS[i % CHARACTERS.length]!.appearance, { look });
    ctx.fillStyle = "#fff";
    ctx.font = "12px sans-serif";
    ctx.fillText(`${it.name} (${it.tier})`, 4, 12);
    ctx.restore();
  });
} else if (mode === "cos") {
  c.width = 8 * CHAR_W;
  c.height = 3 * CHAR_H;
  const bear = CHARACTERS[0]!;
  COSMETICS.forEach((it, i) => {
    const look = defaultLook(bear.appearance);
    look.hat = { kind: "none", color: "#000", accent: "#000" };
    if (it.slot === "hat") look.hat = { kind: it.visual.kind as HatKind, color: it.visual.color, accent: it.visual.accent };
    if (it.slot === "outfit") look.outfit = { kind: it.visual.kind as OutfitKind, color: it.visual.color, accent: it.visual.accent };
    if (it.slot === "accessory") look.accessory = { kind: it.visual.kind as AccessoryKind, color: it.visual.color, accent: it.visual.accent };
    ctx.save();
    ctx.translate((i % 8) * CHAR_W, Math.floor(i / 8) * CHAR_H);
    drawCharacter(ctx, bear.appearance, { look });
    ctx.fillStyle = "#fff";
    ctx.font = "13px sans-serif";
    ctx.fillText(it.name, 4, 14);
    ctx.restore();
  });
} else {
  c.width = 1280 * 2;
  c.height = 720 * 3;
  ZONES.forEach((z, i) => {
    ctx.save();
    ctx.translate((i % 2) * 1280, Math.floor(i / 2) * 720);
    drawZoneBackground(ctx, z);
    ctx.translate(0, 340);
    drawDock(ctx, 330, 400);
    ctx.restore();
  });
}
(window as unknown as { __done: boolean }).__done = true;
