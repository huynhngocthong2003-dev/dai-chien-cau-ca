import { CHARACTERS, COSMETICS, FISHES, ZONES } from "@dccc/game-data";
import { FISH_H, FISH_W, drawFish } from "../src/art/FishArt.ts";
import { CHAR_H, CHAR_W, defaultLook, drawAura, drawCharacter } from "../src/art/CharacterArt.ts";
import type { AccessoryKind, HatKind, OutfitKind } from "@dccc/shared";
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
  c.width = 6 * CHAR_W;
  c.height = 2 * CHAR_H + 200;
  CHARACTERS.forEach((ch, i) => {
    ctx.save();
    ctx.translate((i % 6) * CHAR_W, Math.floor(i / 6) * CHAR_H);
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
