import type { Rng } from "./rng.ts";
import type { BiomeType } from "./types.ts";

// Quái, Boss, rơi đồ và trang bị trong trận.

export type ItemRarity = "common" | "rare" | "epic" | "mythic";
export type EquipmentSlot = "weapon" | "armor" | "accessory";

export interface EquipmentItem {
  id: string;
  nameVi: string;
  slot: EquipmentSlot;
  rarity: ItemRarity;
  bonusAttack: number;
  bonusHp: number;
  bonusMoveSpeed: number;
}

export const ITEM_RARITY_COLOR: Record<ItemRarity, number> = {
  common: 0xd0d0d0,
  rare: 0x4aa8ff,
  epic: 0xc070ff,
  mythic: 0xffb020,
};

export const EQUIPMENT: readonly EquipmentItem[] = [
  { id: "eq_rusty_blade", nameVi: "Kiếm Gỉ", slot: "weapon", rarity: "common", bonusAttack: 10, bonusHp: 0, bonusMoveSpeed: 0 },
  { id: "eq_hunter_bow", nameVi: "Cung Thợ Săn", slot: "weapon", rarity: "rare", bonusAttack: 20, bonusHp: 0, bonusMoveSpeed: 0 },
  { id: "eq_ember_staff", nameVi: "Trượng Than Hồng", slot: "weapon", rarity: "epic", bonusAttack: 34, bonusHp: 60, bonusMoveSpeed: 0 },
  { id: "eq_glacier_fang", nameVi: "Nanh Sông Băng", slot: "weapon", rarity: "mythic", bonusAttack: 55, bonusHp: 120, bonusMoveSpeed: 10 },
  { id: "eq_leather_vest", nameVi: "Áo Da", slot: "armor", rarity: "common", bonusAttack: 0, bonusHp: 120, bonusMoveSpeed: 0 },
  { id: "eq_temple_mail", nameVi: "Giáp Đền Cổ", slot: "armor", rarity: "rare", bonusAttack: 0, bonusHp: 240, bonusMoveSpeed: 0 },
  { id: "eq_sandwalker_cloak", nameVi: "Áo Choàng Du Mạc", slot: "armor", rarity: "epic", bonusAttack: 6, bonusHp: 360, bonusMoveSpeed: 15 },
  { id: "eq_titan_plate", nameVi: "Giáp Titan", slot: "armor", rarity: "mythic", bonusAttack: 12, bonusHp: 600, bonusMoveSpeed: 0 },
  { id: "eq_bone_charm", nameVi: "Bùa Xương", slot: "accessory", rarity: "common", bonusAttack: 5, bonusHp: 50, bonusMoveSpeed: 0 },
  { id: "eq_wind_feather", nameVi: "Lông Vũ Gió", slot: "accessory", rarity: "rare", bonusAttack: 6, bonusHp: 60, bonusMoveSpeed: 25 },
  { id: "eq_spirit_amulet", nameVi: "Bùa Linh Hồn", slot: "accessory", rarity: "epic", bonusAttack: 18, bonusHp: 160, bonusMoveSpeed: 10 },
  { id: "eq_last_hero_crown", nameVi: "Vương Miện Anh Hùng", slot: "accessory", rarity: "mythic", bonusAttack: 30, bonusHp: 300, bonusMoveSpeed: 20 },
];

export function equipmentById(id: string): EquipmentItem | undefined {
  return EQUIPMENT.find((e) => e.id === id);
}

/** Điểm so sánh trang bị (để tự mặc đồ tốt hơn). */
export function equipmentScore(item: EquipmentItem | undefined): number {
  if (!item) return -1;
  return item.bonusAttack * 2 + item.bonusHp * 0.25 + item.bonusMoveSpeed * 1.5;
}

export interface LootDropTable {
  exp: number;
  gold: number;
  materials: Array<{ materialId: string; quantity: number; chance: number }>;
  equipments: Array<{ itemId: string; chance: number }>;
  potionChance: number;
}

export interface MonsterDef {
  id: string;
  nameVi: string;
  biome: BiomeType;
  isBoss: boolean;
  hp: number;
  attack: number;
  speed: number;
  range: number;
  size: number;
  color: number;
  loot: LootDropTable;
}

function small(id: string, nameVi: string, biome: BiomeType, color: number, eq: string, mat: string): MonsterDef {
  return {
    id, nameVi, biome, isBoss: false, hp: 260, attack: 16, speed: 150, range: 60, size: 20, color,
    loot: { exp: 70, gold: 8, materials: [{ materialId: mat, quantity: 1, chance: 0.5 }], equipments: [{ itemId: eq, chance: 0.12 }], potionChance: 0.18 },
  };
}

function boss(id: string, nameVi: string, biome: BiomeType, color: number, eqs: string[]): MonsterDef {
  return {
    id, nameVi, biome, isBoss: true, hp: 2600, attack: 48, speed: 120, range: 90, size: 44, color,
    loot: { exp: 520, gold: 60, materials: [{ materialId: "boss_essence", quantity: 1, chance: 1 }], equipments: eqs.map((itemId, i) => ({ itemId, chance: i === 0 ? 1 : 0.35 })), potionChance: 1 },
  };
}

export const MONSTERS: readonly MonsterDef[] = [
  small("m_wisp", "Ma Trơi", "forest", 0x7affc0, "eq_bone_charm", "spirit_dust"),
  boss("b_treant", "Cổ Thụ Hắc Ám", "forest", 0x3a6a3a, ["eq_spirit_amulet", "eq_hunter_bow"]),
  small("m_gargoyle", "Thạch Quỷ", "ruined_temple", 0x8a8a9a, "eq_temple_mail", "ancient_stone"),
  boss("b_lich", "Vu Vương Đền Cổ", "ruined_temple", 0x9a5aff, ["eq_temple_mail", "eq_ember_staff"]),
  small("m_scorpion", "Bọ Cạp Cát", "desert", 0xd09a4a, "eq_leather_vest", "sand_shell"),
  boss("b_sandworm", "Giun Cát Khổng Lồ", "desert", 0xb07a3a, ["eq_sandwalker_cloak", "eq_ember_staff"]),
  small("m_bandit", "Thổ Phỉ", "ruined_village", 0x8a5a3a, "eq_rusty_blade", "scrap_metal"),
  boss("b_warlord", "Thủ Lĩnh Thổ Phỉ", "ruined_village", 0x6a3a2a, ["eq_titan_plate", "eq_wind_feather"]),
  small("m_yeti", "Người Tuyết Con", "mountain", 0xe0f0ff, "eq_wind_feather", "frost_fur"),
  boss("b_yeti_king", "Vua Người Tuyết", "mountain", 0xc0e0ff, ["eq_glacier_fang", "eq_titan_plate"]),
  small("m_ice_wolf", "Sói Băng", "glacier", 0x9ad0ff, "eq_hunter_bow", "ice_shard"),
  boss("b_frost_wyrm", "Băng Long", "glacier", 0x5ab0ff, ["eq_glacier_fang", "eq_last_hero_crown"]),
];

export const MATERIAL_NAME_VI: Record<string, string> = {
  spirit_dust: "Bụi Linh Hồn",
  ancient_stone: "Đá Cổ",
  sand_shell: "Vỏ Cát",
  scrap_metal: "Sắt Vụn",
  frost_fur: "Lông Sương",
  ice_shard: "Mảnh Băng",
  boss_essence: "Tinh Hoa Boss",
};

export function monstersOfBiome(biome: BiomeType): MonsterDef[] {
  return MONSTERS.filter((m) => m.biome === biome);
}

export interface LootRoll {
  exp: number;
  gold: number;
  materials: Array<{ materialId: string; quantity: number }>;
  equipments: EquipmentItem[];
  potion: boolean;
}

/** Tung xúc xắc rơi đồ (mỗi dòng một lần tung độc lập). */
export function rollLoot(table: LootDropTable, rng: Rng): LootRoll {
  const out: LootRoll = { exp: table.exp, gold: table.gold, materials: [], equipments: [], potion: rng.chance(table.potionChance) };
  for (const m of table.materials) if (rng.chance(m.chance)) out.materials.push({ materialId: m.materialId, quantity: m.quantity });
  for (const e of table.equipments) {
    if (!rng.chance(e.chance)) continue;
    const item = equipmentById(e.itemId);
    if (item) out.equipments.push(item);
  }
  return out;
}

/** Công thức chế tạo trong trận từ nguyên liệu. */
export interface CraftRecipe {
  id: string;
  materialId: string;
  quantity: number;
  outputItemId: string;
}

export const CRAFT_RECIPES: readonly CraftRecipe[] = [
  { id: "cr_essence_crown", materialId: "boss_essence", quantity: 2, outputItemId: "eq_last_hero_crown" },
  { id: "cr_stone_mail", materialId: "ancient_stone", quantity: 3, outputItemId: "eq_temple_mail" },
  { id: "cr_fur_feather", materialId: "frost_fur", quantity: 3, outputItemId: "eq_wind_feather" },
];
