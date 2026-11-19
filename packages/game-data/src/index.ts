import type { FishDef, GameCatalog } from "@dccc/shared";
import { CHARACTERS } from "./characters.ts";
import { RODS } from "./rods.ts";
import { FISHES } from "./fishes.ts";
import { ZONES } from "./zones.ts";
import { COSMETICS, SHOP_ITEMS } from "./cosmetics.ts";
import { GIFT_REWARDS } from "./giftcodes.ts";
import { ECO_MESSAGE, JUNK } from "./junk.ts";
import { EVENTS } from "./events.ts";
import { FISH_FORMS } from "./forms.ts";
import { CHECKIN_REWARDS, QUESTS, TITLES, TOPUP_PACKAGES, WHEEL_PRIZES } from "./meta.ts";

export { CHARACTERS, RODS, FISHES, ZONES, COSMETICS, SHOP_ITEMS, GIFT_REWARDS, JUNK, ECO_MESSAGE, EVENTS, FISH_FORMS };
export const FORM_BY_ID = new Map(FISH_FORMS.map((f) => [f.id, f]));
export const FORM_BY_ITEM = new Map(FISH_FORMS.map((f) => [f.itemId, f]));
export const JUNK_BY_ID = new Map(JUNK.map((j) => [j.id, j]));

export const CATALOG: GameCatalog = { characters: CHARACTERS, rods: RODS, fishes: FISHES, zones: ZONES };

export const FISH_BY_ID: Map<string, FishDef> = new Map(FISHES.map((f) => [f.id, f]));
export const CHARACTER_BY_ID = new Map(CHARACTERS.map((c) => [c.id, c]));
export const ROD_BY_ID = new Map(RODS.map((r) => [r.id, r]));
export const ZONE_BY_ID = new Map(ZONES.map((z) => [z.id, z]));
export const COSMETIC_BY_ID = new Map(COSMETICS.map((c) => [c.id, c]));
export const SHOP_ITEM_BY_ID = new Map(SHOP_ITEMS.map((i) => [i.id, i]));
export { CHECKIN_REWARDS, QUESTS, TITLES, TOPUP_PACKAGES, WHEEL_PRIZES };
export const TITLE_BY_ID = new Map(TITLES.map((t) => [t.id, t]));
