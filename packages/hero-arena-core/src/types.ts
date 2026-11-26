// Kiểu dữ liệu dùng chung của HERO ARENA (không logic).

export type Gender = "male" | "female";

export type BiomeType = "forest" | "ruined_temple" | "desert" | "ruined_village" | "mountain" | "glacier";

export type EnvironmentalHazard =
  | "none"
  | "toxic_mist" // Rừng / Đền cổ: sương độc (sát thương theo thời gian + giảm tầm nhìn)
  | "sandstorm" // Sa mạc / Làng: bão cát (giảm tốc chạy + tầm đánh)
  | "frozen_ground"; // Núi / Băng: mặt đất đóng băng (trơn trượt)

export type UpgradePoolType = "skill_modifier" | "passive_boost" | "stat_enhancement";
export type Rarity = "common" | "rare" | "epic";

/** Loại kỹ năng (quyết định cách mô phỏng). */
export type SkillKind = "bolt" | "cleave" | "dash" | "nova" | "shield" | "heal" | "trap" | "storm";
export type SkillSlot = "s1" | "s2" | "s3" | "ult";

export interface SkillDef {
  id: string;
  nameVi: string;
  kind: SkillKind;
}

/** Hiệu ứng bị động của nhánh/thẻ nâng cấp (cộng dồn). */
export interface PassiveEffect {
  /** Gây cháy/độc: tỉ lệ công/giây trong 3 giây sau mỗi đòn trúng. */
  dotPct?: number;
  /** Làm chậm mục tiêu (tỉ lệ) 1,5 giây. */
  slowPct?: number;
  lifesteal?: number;
  damageReduction?: number;
  critChance?: number;
  moveSpeedPct?: number;
  attackSpeedPct?: number;
  /** Phản sát thương cận chiến (tỉ lệ). */
  thorns?: number;
  manaRegenPct?: number;
}

export interface GenderAppearance {
  gender: Gender;
  spriteKey: string;
  visualNotes: string;
}

export interface HeroBranch {
  id: string;
  name: string;
  descVi: string;
  /** Màu hiệu ứng chủ đạo (0xRRGGBB). */
  color: number;
  /** Màu trang phục chính / phụ. */
  outfit: [number, number];
  passive: { id: string; nameVi: string; effect: PassiveEffect };
  skills: [SkillDef, SkillDef, SkillDef];
  ultimate: SkillDef;
  awakening: SkillDef;
  appearances: Record<Gender, GenderAppearance>;
}

export interface HeroBaseStats {
  hp: number;
  mana: number;
  stamina: number;
  moveSpeed: number;
  attackPower: number;
}

export interface HeroClassConfig {
  id: string;
  name: string;
  nameVi: string;
  roleVi: string;
  ranged: boolean;
  attackRange: number;
  outfit: [number, number];
  baseStats: HeroBaseStats;
  /** Kỹ năng cơ bản trước khi chọn nhánh. */
  baseSkill: SkillDef;
  branches: [HeroBranch, HeroBranch, HeroBranch];
}

export interface UpgradeEffect {
  maxHp?: number;
  attackPct?: number;
  maxMana?: number;
  /** Giảm hồi chiêu toàn bộ kỹ năng (tỉ lệ). */
  cooldownPct?: number;
  /** Tăng sát thương kỹ năng (tỉ lệ). */
  skillDamagePct?: number;
  passive?: PassiveEffect;
}

export interface UpgradeDef {
  id: string;
  titleVi: string;
  descVi: string;
  pool: UpgradePoolType;
  rarity: Rarity;
  maxStacks: number;
  /** Chỉ xuất hiện cho nhánh này (không có = mọi nhánh). */
  branchId?: string;
  effect: UpgradeEffect;
}

export interface UpgradeChoice {
  id: string;
  upgradeId: string;
  title: string;
  description: string;
  pool: UpgradePoolType;
  rarity: Rarity;
}

export interface PlayerMatchState {
  playerId: string;
  name: string;
  heroId: string;
  gender: Gender;
  branchId: string | null;
  specializationLocked: boolean;
  level: number;
  exp: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  stamina: number;
  maxStamina: number;
  attackPower: number;
  moveSpeed: number;
  alive: boolean;
  kills: number;
  activeHazard: EnvironmentalHazard;
  outsideSafeZone: boolean;
  /** Số lần đã nhận mỗi thẻ nâng cấp. */
  pickedUpgrades: Record<string, number>;
  /** Hàng đợi các lượt chọn 1 trong 3 (mỗi phần tử là 3 thẻ). */
  pendingOffers: UpgradeChoice[][];
  /** Đang chờ chọn nhánh chuyên môn (đạt cấp 5). */
  needsBranch: boolean;
  bonus: Required<Omit<UpgradeEffect, "passive" | "maxHp" | "maxMana">>;
  passive: Required<PassiveEffect>;
}

export interface RewardPayload {
  gold?: number;
  gems?: number;
  exp?: number;
  items?: Array<{ itemId: string; quantity: number }>;
  unlockedHeroIds?: string[];
}

export interface PlayerInventory {
  gold: number;
  gems: number;
  accountExp: number;
  items: Record<string, number>;
  unlockedHeroes: string[];
}
