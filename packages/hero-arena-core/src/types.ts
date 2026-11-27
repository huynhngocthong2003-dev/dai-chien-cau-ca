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
  /** Thiêu đốt: tỉ lệ công/giây trong 3 giây sau mỗi đòn trúng. */
  dotPct?: number;
  /** Nhiễm độc: tỉ lệ công/giây trong 5 giây (cộng dồn riêng với thiêu đốt). */
  poisonPct?: number;
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

/** Dạng 3 – một trong 3 hướng tiến hoá của mỗi Dạng 2 (chọn ở cấp 10). */
export interface HeroEvolution {
  id: string;
  name: string;
  descVi: string;
  color: number;
  /** 0 = Tấn công (Kết liễu), 1 = Phòng thủ (Khiên tử thủ), 2 = Tinh thông (Lây lan). */
  style: number;
  /** Đánh đổi chỉ số khi chọn nhánh này. */
  mods: StatMods;
  passive: { id: string; nameVi: string; effect: PassiveEffect };
  ultimate: SkillDef;
  awakening: SkillDef;
}

/** Vai trò của hướng Dạng 2 (quyết định đánh đổi chỉ số). */
export type DirectionRole = "effect" | "offense" | "defense";

/** Thay đổi chỉ số theo tỉ lệ (âm = điểm yếu). */
export interface StatMods {
  hpPct?: number;
  atkPct?: number;
  burstPct?: number;
  speedPct?: number;
  rangePct?: number;
}

/** Dạng 2 – một trong 3 hướng nâng cấp cùng cấp bậc (chọn ở cấp 5). */
export interface HeroBranch {
  /** Hiệu ứng (DoT) / Công-tốc-chí mạng / Công-thủ. */
  role: DirectionRole;
  /** Đánh đổi chỉ số khi chọn hướng này. */
  mods: StatMods;
  id: string;
  name: string;
  descVi: string;
  /** Màu hiệu ứng chủ đạo (0xRRGGBB). */
  color: number;
  /** Thứ tự hướng (0..2). */
  form: number;
  passive: { id: string; nameVi: string; effect: PassiveEffect };
  skills: [SkillDef, SkillDef, SkillDef];
  evolutions: [HeroEvolution, HeroEvolution, HeroEvolution];
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
  /** Tên Dạng 1 (nhân vật bình thường, cấp 1–4). */
  baseNameVi: string;
  roleVi: string;
  ranged: boolean;
  attackRange: number;
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
  /** Hướng Dạng 2 đã chọn (cấp 5). */
  branchId: string | null;
  specializationLocked: boolean;
  /** Hướng Dạng 3 đã chọn (cấp 10). */
  evolutionId: string | null;
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
  /** Đang chờ chọn Dạng 2 (đạt cấp 5). */
  needsBranch: boolean;
  /** Đang chờ chọn Dạng 3 (đạt cấp 10). */
  needsEvolution: boolean;
  bonus: Required<Omit<UpgradeEffect, "passive" | "maxHp" | "maxMana">> & {
    /** Hệ số sát thương đòn trực tiếp (không tính thiêu/độc) – hướng hiệu ứng bị giảm. */
    burstPct: number;
    speedPct: number;
    rangePct: number;
  };
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
