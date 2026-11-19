import type { FishDef, GameCatalog } from "@dccc/shared";
import { CHARACTERS } from "./characters.ts";
import { RODS } from "./rods.ts";
import { FISHES } from "./fishes.ts";
import { ZONES } from "./zones.ts";
import { COSMETICS, SHOP_ITEMS } from "./cosmetics.ts";
import { GIFT_REWARDS } from "./giftcodes.ts";

export { CHARACTERS, RODS, FISHES, ZONES, COSMETICS, SHOP_ITEMS, GIFT_REWARDS };

export const CATALOG: GameCatalog = { characters: CHARACTERS, rods: RODS, fishes: FISHES, zones: ZONES };

export const FISH_BY_ID: Map<string, FishDef> = new Map(FISHES.map((f) => [f.id, f]));
export const CHARACTER_BY_ID = new Map(CHARACTERS.map((c) => [c.id, c]));
export const ROD_BY_ID = new Map(RODS.map((r) => [r.id, r]));
export const ZONE_BY_ID = new Map(ZONES.map((z) => [z.id, z]));
export const COSMETIC_BY_ID = new Map(COSMETICS.map((c) => [c.id, c]));
export const SHOP_ITEM_BY_ID = new Map(SHOP_ITEMS.map((i) => [i.id, i]));
