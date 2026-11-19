/**
 * Hằng số cân bằng game. Tách riêng khỏi logic để Game Economy Designer
 * có thể tinh chỉnh mà không cần sửa code gameplay.
 */

export const RARITY_ORDER = ["common", "rare", "precious", "epic", "legendary", "mythic", "boss"] as const;

export const FISH_RARITY_LABEL: Record<(typeof RARITY_ORDER)[number], string> = {
  common: "Thường",
  rare: "Hiếm",
  precious: "Quý",
  epic: "Sử Thi",
  legendary: "Huyền Thoại",
  mythic: "Thần Thoại",
  boss: "Boss",
};

export const FISH_RARITY_COLOR: Record<(typeof RARITY_ORDER)[number], string> = {
  common: "#b8c4cc",
  rare: "#4fc3f7",
  precious: "#66bb6a",
  epic: "#ba68c8",
  legendary: "#ffb300",
  mythic: "#ff4081",
  boss: "#ff3d00",
};

export const CHAR_RARITY_COLOR = {
  N: "#9e9e9e",
  R: "#42a5f5",
  SR: "#ab47bc",
  SSR: "#ffa000",
  UR: "#ff1744",
} as const;

/** Các hiếm (trừ common) được nhân trọng số theo may mắn + tỷ lệ hiếm của cần. */
export const RARE_WEIGHT_SCALING: Record<(typeof RARITY_ORDER)[number], number> = {
  common: 0,
  rare: 0.6,
  precious: 0.9,
  epic: 1.2,
  legendary: 1.5,
  mythic: 1.8,
  boss: 1.0,
};

export const FISHING = {
  /** Thời gian chờ cá cắn (ms). */
  biteDelayMin: 1800,
  biteDelayMax: 5200,
  /** Cửa sổ giật cần sau khi cá cắn (ms). */
  biteWindow: 900,
  /** Khoảng cách ban đầu của cá (0 = đã kéo lên). */
  startDistance: 100,
  /** Cá thoát nếu vượt quá khoảng cách này. */
  escapeDistance: 150,
  /** Căng dây tối đa – vượt qua thì đứt. */
  maxTension: 100,
  /** Ngưỡng nguy hiểm: trên ngưỡng này dây bị hao mòn. */
  dangerTension: 80,
  tensionGainPerSec: 55,
  tensionDecayPerSec: 70,
  /** Cá vùng vẫy cộng thêm căng dây khi người chơi đang kéo. */
  struggleTensionPerSec: 60,
  baseReelPerSec: 20,
  struggleDistancePerSec: 11,
  idleDriftPerSec: 3,
  durabilityLossPerSec: 30,
  /** Thời lượng các pha vùng vẫy. */
  calmPhaseMs: [1400, 2800] as [number, number],
  strugglePhaseMs: [900, 2200] as [number, number],
  /** Hệ số cast: lực thả mạnh -> cá ở xa hơn nhưng tăng chút tỷ lệ hiếm. */
  castRareBonusMax: 0.25,
  bossBaseChance: 0.02,
};

export const PROGRESSION = {
  maxPlayerLevel: 60,
  xpToNext(level: number): number {
    return Math.round(80 * Math.pow(level, 1.55));
  },
  /** Mức hệ số chỉ số của nhân vật theo cấp. */
  maxCharacterLevel: 60,
  characterUpgradeGold(level: number): number {
    return Math.round(120 * Math.pow(level, 1.6));
  },
};

export const ECONOMY = {
  startingGold: 500,
  startingDiamonds: 50,
  /** Hệ số giá bán theo cân nặng: giá = value * (0.6 + 0.4 * weightRatio). */
  sellWeightFactor: 0.4,
  inventoryLimit: 200,
};
