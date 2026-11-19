/** Kiểu dữ liệu dùng chung cho client, server và dữ liệu game. */

/** LR (Legend Rare) là bậc cao nhất, trên UR. */
export type CharRarity = "N" | "R" | "SR" | "SSR" | "UR" | "LR";
export type FishRarity = "common" | "rare" | "precious" | "epic" | "legendary" | "mythic" | "boss";
export type Element = "water" | "fire" | "ice" | "thunder" | "dark" | "light" | "earth";

/** Hiệu ứng kỹ năng chủ động trong lúc câu cá. Tất cả do logic chung tính toán. */
export type ActiveEffect =
  | { kind: "damage_pct"; value: number } // gây sát thương = % HP tối đa của cá
  | { kind: "tension_reduce"; value: number } // giảm lực căng dây ngay lập tức
  | { kind: "reel_boost"; value: number; durationMs: number } // tăng tốc thu dây (%)
  | { kind: "stun"; durationMs: number } // cá choáng, không vùng vẫy
  | { kind: "calm"; value: number; durationMs: number } // giảm lực vùng vẫy (%)
  | { kind: "durability_restore"; value: number } // hồi độ bền dây
  | { kind: "freeze"; durationMs: number } // đóng băng lực căng + cá
  | { kind: "distance_pull"; value: number } // kéo cá lại gần ngay
  | { kind: "double_damage"; durationMs: number }
  | { kind: "burn"; valuePctPerSec: number; durationMs: number };

/** Hiệu ứng bị động (nhân vật hoặc cần câu). */
export type PassiveEffect =
  | { kind: "xp_bonus"; value: number }
  | { kind: "gold_bonus"; value: number }
  | { kind: "durability_loss_reduce"; value: number }
  | { kind: "bite_window_bonus"; value: number }
  | { kind: "bite_speed"; value: number }
  | { kind: "pull_bonus"; value: number; tensionPenalty?: number }
  | { kind: "luck_bonus"; value: number }
  | { kind: "snap_threshold"; value: number }
  | { kind: "boss_struggle_reduce"; value: number }
  | { kind: "tension_gain_reduce"; value: number }
  | { kind: "tension_decay_bonus"; value: number }
  | { kind: "crit"; chance: number; multiplier: number }
  | { kind: "durability_regen"; perSec: number }
  | { kind: "struggle_reduce"; value: number }
  | { kind: "boss_damage"; value: number }
  | { kind: "element_damage"; element: Element; value: number };

export interface SkillDef<E> {
  id: string;
  name: string;
  description: string;
  effects: E[];
}

export interface ActiveSkillDef extends SkillDef<ActiveEffect> {
  cooldownMs: number;
}
export type PassiveSkillDef = SkillDef<PassiveEffect>;

export type UnlockCondition =
  | { kind: "starter" }
  | { kind: "level"; level: number }
  | { kind: "gold"; amount: number; level?: number }
  | { kind: "gacha" }
  | { kind: "event"; eventId: string }
  /** Nhận bằng mã quà tặng. Chỉ lưu mã băm, không lưu mã gốc. */
  | { kind: "code"; codeHash: string };

export type HatKind = "none" | "cap" | "straw" | "bandana" | "crown" | "hood" | "pirate" | "helmet" | "wizard";
export type OutfitKind = "tee" | "overalls" | "raincoat" | "hoodie" | "kimono" | "armor" | "tuxedo" | "hawaii";
export type AccessoryKind = "none" | "necklace" | "pearl" | "bowtie" | "glasses" | "scarf" | "medal" | "earrings";
export type Species =
  | "bear"
  | "dog"
  | "cat"
  | "fox"
  | "raccoon"
  | "rabbit"
  | "penguin"
  | "dragon"
  | "tiger"
  | "frog"
  | "panda"
  | "chicken"
  | "monkey";

export interface CharacterAppearance {
  species: Species;
  fur: string; // màu lông chính
  light: string; // màu mõm / bụng / tai trong
  mark: string; // màu hoa văn (sọc, mặt nạ, đốm)
  eye: string; // màu mắt
  outfit: string; // màu áo mặc định
  outfitKind: OutfitKind;
  accent: string;
  hat: HatKind;
  aura: string; // màu hào quang khi dùng kỹ năng
}

export type CosmeticSlot = "hat" | "outfit" | "accessory" | "wings" | "horns";
export type WingKind = "fluffy" | "butterfly" | "angel" | "demon" | "phoenix" | "dragon";
export type HornKind = "devil" | "unicorn" | "dragon" | "halo" | "thunder";
/** Bậc thời trang: càng cao càng nhiều chỉ số phụ và hiệu ứng. */
export type CosmeticTier = "common" | "rare" | "superior" | "legendary" | "divine";

export interface CosmeticDef {
  id: string;
  name: string;
  slot: CosmeticSlot;
  tier: CosmeticTier;
  price: { currency: "gold" | "diamonds" | "eco"; amount: number };
  /** Hình dạng hiển thị theo ô trang bị. */
  visual: { kind: HatKind | OutfitKind | AccessoryKind | WingKind | HornKind; color: string; accent: string };
  /** Chỉ số phụ – tăng theo bậc, vẫn giữ mức không pay-to-win. */
  bonus: PassiveEffect[];
  description: string;
}

/** Mã quà tặng phần thưởng tiền tệ (chỉ lưu mã băm). */
/** Thể tiến hóa đột biến của cá – cần vật phẩm cực hiếm. */
export interface FishFormDef {
  id: string;
  name: string;
  itemId: string;
  itemName: string;
  itemIcon: string;
  mult: { hp: number; atk: number; def: number };
  spdBonus: number;
  /** Đổi thuộc tính (null = giữ nguyên). */
  element: Element | null;
  glow: string;
  /** Trọng số rơi trong nhóm thường; 0 = chỉ rơi ở nhóm thần thoại. */
  dropWeight: number;
  divine: boolean;
  /** Tỉ lệ tiến hóa thành công (ẩn với người chơi). Thất bại vẫn mất vật phẩm. */
  successRate: number;
  description: string;
}

/** Rác câu nhầm – tái chế thành Điểm Môi Trường. */
export interface JunkDef {
  id: string;
  name: string;
  kind: "bottle" | "sandal" | "bag" | "can" | "net";
  ecoPoints: number;
  weight: number;
  color: string;
}

/** Sự kiện nhận quà (mỗi tài khoản nhận một lần). */
export interface GameEventDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  reward: { diamonds?: number; gold?: number; stones?: number; bossTickets?: number };
}

export interface GiftRewardDef {
  id: string;
  codeHash: string;
  label: string;
  diamonds?: number;
  gold?: number;
}

export interface ShopItemDef {
  id: string;
  name: string;
  icon: string;
  price: { currency: "gold" | "diamonds"; amount: number };
  grant: { stones?: number; soul?: number; bossTickets?: number; gold?: number };
  description: string;
}

export interface CharacterDef {
  id: string;
  name: string;
  title: string;
  rarity: CharRarity;
  element: Element;
  base: { hp: number; pull: number; speed: number; luck: number };
  growth: { hp: number; pull: number; speed: number; luck: number }; // tăng mỗi cấp
  active: ActiveSkillDef;
  passive: PassiveSkillDef;
  unlock: UnlockCondition;
  appearance: CharacterAppearance;
  lore: string;
}

export type RodOrnament =
  | "none"
  | "coral"
  | "bolt"
  | "shadow"
  | "flame"
  | "crystal"
  | "bone"
  | "feather"
  | "star"
  | "trident"
  | "orb"
  | "dragon_eye";

export interface RodDef {
  id: string;
  name: string;
  rarity: CharRarity;
  pull: number;
  durability: number;
  reelSpeed: number;
  rareRate: number; // % cộng thêm vào tỷ lệ cá hiếm
  antiSnap: number; // % giảm hao mòn dây khi căng
  passive: PassiveSkillDef;
  unlock: UnlockCondition;
  visual: {
    shaft: string;
    handle: string;
    glow: string | null;
    line: string;
    /** Màu chỉ quấn thân cần. */
    wrap: string;
    /** Vật trang trí đầu cần. */
    ornament: RodOrnament;
    /** Vân sét chạy dọc thân cần (chỉ cần đặc biệt). */
    veins?: string;
  };
  description: string;
}

export type FishShape = "round" | "long" | "flat" | "eel" | "shark" | "puffer" | "angler" | "serpent";

export interface FishAppearance {
  shape: FishShape;
  body: string;
  belly: string;
  fin: string;
  pattern: "none" | "stripes" | "spots" | "scales";
  patternColor: string;
  teeth: boolean;
  horns: boolean;
  spikes: boolean;
  eye: "normal" | "angry" | "glow";
  eyeColor: string;
  glow: string | null;
  scale: number; // hệ số kích thước hiển thị
}

export interface FishDef {
  id: string;
  name: string;
  rarity: FishRarity;
  element: Element;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  skill: { id: string; name: string; description: string };
  value: number; // giá bán cơ bản (vàng)
  xp: number;
  weightKg: [number, number];
  zones: string[];
  appearance: FishAppearance;
  description: string;
}

export interface ZoneDef {
  id: string;
  name: string;
  description: string;
  requiredLevel: number;
  difficulty: 1 | 2 | 3 | 4 | 5 | 6;
  spawn: { fishId: string; weight: number }[];
  bossId: string;
  theme: {
    skyTop: string;
    skyBottom: string;
    waterTop: string;
    waterBottom: string;
    accent: string;
    ground: string;
    weather: "none" | "snow" | "embers" | "bubbles" | "sparkles" | "leaves";
  };
}
