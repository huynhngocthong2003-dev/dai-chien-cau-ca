/** Kiểu dữ liệu dùng chung cho client, server và dữ liệu game. */

/** LR (Legend Rare) là bậc cao nhất, trên UR. */
export type CharRarity = "N" | "R" | "SR" | "SSR" | "UR" | "LR";
export type FishRarity = "common" | "rare" | "precious" | "epic" | "legendary" | "mythic" | "boss";
/** 7 NGUYÊN TỐ: Kim, Mộc, Thủy, Hỏa, Thổ, Bóng tối, Ánh sáng (xem shared/elements.ts). */
export type Element = "metal" | "wood" | "water" | "fire" | "earth" | "dark" | "light";

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

export type CosmeticSlot = "hat" | "outfit" | "accessory" | "wings" | "horns" | "skin";
/** Skin trọn bộ (thay mũ + áo + phụ kiện, kèm đạo cụ theo chủ đề). */
export type SkinKind =
  | "forest" | "fire" | "samurai" | "cowboy" | "pharaoh" | "viking" | "cyborg" | "donut" | "bubbletea" | "jester" | "fairy" | "beach"
  | "princess" | "witch" | "blossom" | "bride" | "bunny" | "sakura" | "summer" | "mermaid" | "winter" | "painter" | "school" | "ballerina";
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
  visual: { kind: HatKind | OutfitKind | AccessoryKind | WingKind | HornKind | SkinKind; color: string; accent: string };
  /** Chỉ số phụ – tăng theo bậc, vẫn giữ mức không pay-to-win. */
  bonus: PassiveEffect[];
  description: string;
}

/** Mã quà tặng phần thưởng tiền tệ (chỉ lưu mã băm). */
/** Thể tiến hóa đột biến của cá – cần vật phẩm cực hiếm. */
/** Vật phẩm đột biến (rơi cực hiếm khi câu cá). */
export interface EvoItemDef {
  id: string;
  name: string;
  icon: string;
  glow: string;
  /** Trọng số rơi trong nhóm thường; 0 = chỉ rơi ở nhóm thần vật. */
  dropWeight: number;
  divine: boolean;
  /** Hệ của Đá Tiến Hoá (dùng lên giai cá cùng hệ). */
  element?: Element;
  description: string;
}

/** Hiệu ứng ngoại hình riêng của từng dạng đột biến. */
export type FormAura =
  | "flame" | "darkflame" | "blueflame"
  | "ice" | "frost" | "abyss"
  | "lightning" | "purplebolt" | "storm"
  | "dragon" | "golddragon" | "blackdragon"
  | "phoenix" | "angel";

/** Một dạng đột biến: mỗi vật phẩm biến cá thành 1 trong vài dạng cùng hệ (ngẫu nhiên, luôn thành công). */
export interface FishFormDef {
  id: string;
  name: string;
  itemId: string;
  mult: { hp: number; atk: number; def: number };
  spdBonus: number;
  /** Đổi thuộc tính (null = giữ nguyên). */
  element: Element | null;
  glow: string;
  /** Ngoại hình sau đột biến: đổi màu thân/vây/mắt + hiệu ứng riêng. */
  look: { body: string; belly: string; fin: string; pattern: "none" | "stripes" | "spots" | "scales"; patternColor: string; eyeColor: string; horns: boolean; spikes: boolean; teeth: boolean; aura: FormAura; palette?: [string, string, string] };
  description: string;
  /** Cấp bậc biến dị (độ hiếm khi đột biến). */
  rank?: FormRank;
  /** Trọng số ra khi đột biến (cùng viên đá). */
  weight?: number;
  /** Chỉ số chuyên tăng. */
  focus?: "hp" | "atk" | "def" | "all";
  /** Ký hiệu cấp đột biến theo độ hiếm trong cùng viên đá: "ĐB-1" (phổ biến) … "ĐB-5" (hiếm nhất). */
  code?: string;
}

export type FormRank = "common" | "rare" | "epic" | "legend";

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
  /** true: hệ cố định theo loài (Boss / cá đặc biệt), không theo khu câu. */
  elementFixed?: boolean;
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
  /** Nguyên tố của khu: cá câu ở đây mang hệ này (trừ loài có hệ cố định). */
  element: Element;
  /** Boss phụ của khu (xuất hiện ngẫu nhiên như Boss chính). */
  extraBosses?: string[];
  /** Boss phụ SIÊU HIẾM của khu (tỉ lệ cực thấp, ngoại hình tí hon hoặc khổng lồ). */
  secretBossId?: string;
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

// ------------------------------------------------------------------ Giai đoạn 3 & 5: meta game
/** Phần thưởng chung (điểm danh, nhiệm vụ, vòng quay, danh hiệu). */
export interface RewardDef {
  gold?: number;
  diamonds?: number;
  stones?: number;
  soul?: number;
  bossTickets?: number;
  /** Vật phẩm tiến hóa đột biến (id). */
  evoItem?: string;
  /** Mở khóa nhân vật / cần câu (đã có thì đổi thành nguyên liệu). */
  characterId?: string;
  rodId?: string;
  /** Bốc ngẫu nhiên 1 nhân vật / cần câu trong nhóm (dùng cho Vòng Quay). */
  characterPool?: string[];
  rodPool?: string[];
  /** Bốc ngẫu nhiên 1 Đá Tiến Hoá trong nhóm (vd 3 đá vạn năng). */
  evoPool?: string[];
}

/** Chỉ số dùng để tính nhiệm vụ / danh hiệu. */
export type MetricKey =
  | "caught"
  | "bosses"
  | "junk"
  | "recycled"
  | "dmWins"
  | "species"
  | "level"
  | "gold"
  | "roastedEaten"
  | "forms"
  | "spins"
  | "checkins"
  | "heaviest";

export interface QuestDef {
  id: string;
  name: string;
  icon: string;
  metric: MetricKey;
  target: number;
  reward: RewardDef;
}

export interface TitleDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  metric: MetricKey;
  target: number;
  color: string;
  reward: RewardDef;
}

export interface WheelPrizeDef {
  id: string;
  label: string;
  icon: string;
  color: string;
  /** Trọng số (ẩn với người chơi). */
  weight: number;
  reward: RewardDef;
}

export type RankCategory = "level" | "caught" | "bosses" | "dmWins" | "dmRank" | "junk" | "teamPower";

export interface TopupPackageDef {
  id: "kc100" | "kc300" | "auto2d";
  name: string;
  icon: string;
  vnd: number;
  diamonds?: number;
  /** Số giờ câu tự động. */
  autoFishHours?: number;
}
