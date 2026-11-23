import type { BreedLook, BreedRecipe, BreedTier, Element, FishAppearance } from "@dccc/shared";

/**
 * ĐẢO LAI TẠO – dữ liệu. Thêm cặp Boss mới:
 *  1. khai báo 4 loài con trong fishes.ts (mục "Cá lai") + FIXED_ELEMENT,
 *  2. thêm bậc vào BREED_TIER, hình vào BREED_LOOKS,
 *  3. nối 1 công thức vào BREEDING_RECIPES (tổng tỷ lệ = 100).
 */
const SPECIAL_RECIPES: BreedRecipe[] = [
  {
    id: "thiet_san_ho",
    parents: ["f_boss_lao_ngu", "f_boss_bao_chua_san_ho"],
    egg: { name: "Trứng Thiết San Hô", a: "#8796ad", b: "#ff6b5e", spot: "#ffd54f" },
    hatchMinutes: 30,
    results: [
      { fish: "f_lai_thiet_ngu_san_ho", pct: 58 },
      { fish: "f_lai_chien_giap", pct: 30 },
      { fish: "f_lai_than_thu_huyen_thiet", pct: 10 },
      { fish: "f_lai_cu_thu_nguyen_thuy", pct: 2 },
    ],
  },
  {
    id: "hoa_thuy_than_thu",
    parents: ["f_boss_thuy_quai_kraken", "f_phuong_hoang_bien"],
    egg: { name: "Trứng Hỏa Thủy Thần Thú", a: "#8e63d6", b: "#ff9f1c", spot: "#4fc3f7" },
    hatchMinutes: 45,
    results: [
      { fish: "f_lai_hoa_xuc_kraken", pct: 58 },
      { fish: "f_lai_viem_vu_hai_quai", pct: 30 },
      { fish: "f_lai_bat_tu_hai_dieu", pct: 10 },
      { fish: "f_lai_than_khai_hong_thuy", pct: 2 },
    ],
  },
];

/** Bậc lai của cá con (cá Boss / Thần Thoại gốc mặc định là "boss"). */
export const BREED_TIER: Record<string, BreedTier> = {
  f_lai_thiet_ngu_san_ho: "hybrid",
  f_lai_chien_giap: "super",
  f_lai_than_thu_huyen_thiet: "mythic",
  f_lai_cu_thu_nguyen_thuy: "recessive",
  f_lai_hoa_xuc_kraken: "hybrid",
  f_lai_viem_vu_hai_quai: "super",
  f_lai_bat_tu_hai_dieu: "mythic",
  f_lai_than_khai_hong_thuy: "recessive",
};
export const breedTierOf = (fishId: string): BreedTier => BREED_TIER[fishId] ?? GEN_TIER.get(fishId) ?? "boss";

/** Hình vẽ riêng (art/BreedArt.ts) cho Kraken và các cá lai. */
export const BREED_LOOKS: Record<string, BreedLook> = {
  f_boss_thuy_quai_kraken: { shape: "kraken", body: "#8e63d6", dark: "#4a2a8a", belly: "#d9c8ff", fin: "#7048c0", eye: "#ffe082", tent: 6 },
  f_lai_thiet_ngu_san_ho: { shape: "fish", body: "#8796ad", dark: "#3f4c62", belly: "#e3e9f2", fin: "#ff8a65", eye: "#ffca28", horn: "short", back: "coral", skin: "plates" },
  f_lai_chien_giap: { shape: "fish", body: "#5f6f88", dark: "#28344a", belly: "#cfd9e6", fin: "#ff5252", eye: "#ff1744", eyeGlow: true, horn: "curved", back: "blades", skin: "plates", aura: "rgba(255,82,82,.35)" },
  f_lai_than_thu_huyen_thiet: { shape: "fish", body: "#2b2b36", dark: "#0d0d14", belly: "#4a4a5c", fin: "#ffb300", eye: "#ffea00", eyeGlow: true, horn: "crown", back: "flame", skin: "gold", aura: "rgba(255,193,7,.45)" },
  f_lai_cu_thu_nguyen_thuy: { shape: "fish", body: "#26314f", dark: "#0b1022", belly: "#3d4a72", fin: "#5ee7ff", eye: "#7df9ff", eyeGlow: true, horn: "curved", back: "crystal", skin: "cracked", crack: "#5ee7ff", crack2: "#c084fc", aura: "rgba(126,87,255,.5)", ring: true },
  f_lai_hoa_xuc_kraken: { shape: "kraken", body: "#a35bd1", dark: "#5b2386", belly: "#f3d0ff", fin: "#ff8f00", eye: "#ff1744", eyeGlow: true, tent: 6, tentFire: "#ff9800" },
  f_lai_viem_vu_hai_quai: { shape: "kraken", body: "#e0663a", dark: "#8a2b10", belly: "#ffe0c2", fin: "#29b6f6", eye: "#fff59d", eyeGlow: true, tent: 7, tentFire: "#29b6f6", wings: { a: "#29b6f6", b: "#ff9800" }, aura: "rgba(41,182,246,.3)" },
  f_lai_bat_tu_hai_dieu: { shape: "kraken", body: "#ffb300", dark: "#c62828", belly: "#fff3c4", fin: "#ff3d00", eye: "#ffffff", eyeGlow: true, tent: 6, tentFire: "#ff3d00", wings: { a: "#ff3d00", b: "#ffee58" }, horn: "crown", aura: "rgba(255,111,0,.5)" },
  f_lai_than_khai_hong_thuy: { shape: "kraken", body: "#6d28d9", dark: "#2e1065", belly: "#f5d0fe", fin: "#fde047", eye: "#fef08a", eyeGlow: true, tent: 8, tentFire: "#38bdf8", wings: { a: "#38bdf8", b: "#fbbf24", crystal: true }, horn: "crown", skin: "cracked", crack: "#fde047", crack2: "#38bdf8", aura: "rgba(168,85,247,.55)", ring: true },
};

// =====================================================================================
// DÒNG LAI THEO HỆ: mọi cặp cá từ Boss trở lên chưa có công thức riêng sẽ lai theo tổ hợp
// hệ của bố mẹ (7 hệ → 28 tổ hợp × 4 bậc = 112 dạng lai, mỗi dạng hình riêng).
// =====================================================================================

interface ElementStyle {
  word: string;
  title: string;
  body: string;
  dark: string;
  belly: string;
  fin: string;
  eye: string;
  accent: string;
}
const EL: Record<Element, ElementStyle> = {
  metal: { word: "Thiết", title: "Kim", body: "#9aa8bd", dark: "#3f4c62", belly: "#e6ecf4", fin: "#cfd8dc", eye: "#ffca28", accent: "#ffd54f" },
  wood: { word: "Mộc", title: "Mộc", body: "#5cbf6a", dark: "#1b5e20", belly: "#dcedc8", fin: "#9ccc65", eye: "#fff176", accent: "#c6ff00" },
  water: { word: "Thủy", title: "Thủy", body: "#3fa7f5", dark: "#0d47a1", belly: "#e1f5fe", fin: "#4dd0e1", eye: "#e1f5fe", accent: "#18ffff" },
  fire: { word: "Hỏa", title: "Hỏa", body: "#ff7043", dark: "#b71c1c", belly: "#ffe0b2", fin: "#ffab00", eye: "#fff59d", accent: "#ff3d00" },
  earth: { word: "Thạch", title: "Thổ", body: "#b8875a", dark: "#4e342e", belly: "#efe0c8", fin: "#d7a86e", eye: "#ffb300", accent: "#ff8f00" },
  dark: { word: "Ám", title: "Bóng Tối", body: "#5b3f9e", dark: "#1a0b3d", belly: "#b39ddb", fin: "#7c4dff", eye: "#ea80fc", accent: "#b388ff" },
  light: { word: "Quang", title: "Ánh Sáng", body: "#ffe082", dark: "#c79100", belly: "#fffde7", fin: "#fff176", eye: "#ffffff", accent: "#ffd740" },
};
const ORDER: Element[] = ["metal", "wood", "water", "fire", "earth", "dark", "light"];
const TIERS4: BreedTier[] = ["hybrid", "super", "mythic", "recessive"];
const TIER_MULT: Record<BreedTier, number> = { boss: 1, hybrid: 1, super: 1.15, mythic: 1.35, recessive: 1.6 };

const hexA = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/** Hình của 1 dạng lai: thân theo hệ 1, vây/mắt theo hệ 2, đặc điểm 2 hệ cộng dồn theo bậc. */
function genLook(e1: Element, e2: Element, tier: BreedTier): BreedLook {
  const A = EL[e1];
  const B = EL[e2];
  const lv = TIERS4.indexOf(tier); // 0..3
  const has = (e: Element) => e1 === e || e2 === e;
  const kraken = (has("water") && (has("dark") || has("fire") || e1 === e2)) || (has("wood") && has("dark"));
  const look: BreedLook = {
    shape: kraken ? "kraken" : "fish",
    body: A.body,
    dark: tier === "mythic" && has("metal") ? "#0d0d14" : A.dark,
    belly: A.belly,
    fin: B.fin,
    eye: lv >= 1 ? B.accent : B.eye,
    eyeGlow: lv >= 1,
    skin: "scales",
  };
  if (kraken) {
    look.tent = 5 + lv;
    if (has("fire") || has("light")) look.tentFire = has("fire") ? EL.fire.accent : EL.light.accent;
    else if (lv >= 1) look.tentFire = B.accent;
  }
  // đặc điểm theo hệ
  if (has("metal")) {
    look.skin = lv >= 2 ? "gold" : "plates";
    look.horn = lv === 0 ? "short" : "curved";
  }
  if (has("earth")) {
    look.skin = look.skin === "scales" ? "plates" : look.skin;
    look.back = "blades";
    look.backColor = lv >= 2 ? EL.earth.accent : "#a1887f";
    look.horn = look.horn ?? (lv >= 1 ? "curved" : "short");
  }
  if (has("wood")) {
    look.back = "coral";
    look.backColor = lv >= 2 ? "#76ff03" : "#43a047";
  }
  if (has("fire")) {
    look.back = has("wood") ? "coral" : "flame";
    if (has("wood")) look.backColor = "#ff5722";
  }
  if (has("water") && !look.back && lv >= 1) {
    look.back = "crystal";
    look.backColor = lv >= 2 ? "#18ffff" : "#80deea";
  }
  if (has("light")) {
    if (lv >= 1) look.wings = { a: EL.light.accent, b: "#ffffff" };
    if (lv >= 2) look.horn = "crown";
  }
  if (has("dark")) {
    look.skin = "cracked";
    look.crack = EL.dark.accent;
    look.crack2 = B.accent;
  }
  if (has("fire") && lv >= 1 && !look.wings) look.wings = { a: EL.fire.accent, b: "#ffd54f" };
  if (!kraken && (has("water") || has("light")) && lv === 0) look.plume = true;
  if (has("earth") && lv === 0) look.whisk = true;
  // bậc cao: hào quang, vương miện, vòng cổ ngữ
  if (lv >= 1) look.aura = hexA(B.accent, 0.28 + lv * 0.08);
  if (lv >= 2) look.horn = look.horn ?? "crown";
  if (lv === 3) {
    look.ring = true;
    look.skin = "cracked";
    look.crack = look.crack ?? A.accent;
    look.crack2 = look.crack2 ?? B.accent;
    look.back = look.back === "coral" ? "coral" : "crystal";
    look.backColor = look.back === "crystal" ? undefined : look.backColor;
    if (look.wings) look.wings = { ...look.wings, crystal: true };
    look.body = mix(A.body, "#1a1035", 0.45);
    look.dark = "#0b0620";
  }
  if (tier === "mythic") look.aura = hexA(A.accent, 0.5);
  return look;
}

function mix(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const c = (sh: number) => Math.round(((pa >> sh) & 255) * (1 - t) + ((pb >> sh) & 255) * t);
  return "#" + ((1 << 24) | (c(16) << 8 << 8) | (c(8) << 8) | c(0)).toString(16).slice(1);
}

const pairWord = (e1: Element, e2: Element) => (e1 === e2 ? `Song ${EL[e1].word}` : `${EL[e1].word} ${EL[e2].word}`);
const NAME: Record<Exclude<BreedTier, "boss">, (w: string) => string> = {
  hybrid: (w) => `${w} Ngư`,
  super: (w) => `${w} Chiến Vương`,
  mythic: (w) => `Thần Thú ${w}`,
  recessive: (w) => `Cổ Thú ${w} Nguyên Thủy`,
};
const DESC: Record<Exclude<BreedTier, "boss">, string> = {
  hybrid: "Thế hệ lai đầu tiên, mang dáng và màu của cả hai dòng Boss.",
  super: "Siêu Boss lai: giáp và vây hoá vũ khí, mắt phát sáng, hào quang nhẹ.",
  mythic: "Đột biến thần thoại: vương miện, giáp quý, hào quang rực rỡ.",
  recessive: "Gen lặn cổ đại thức tỉnh: giáp nứt phát quang, gai pha lê, vòng hào quang cổ xưa.",
};
const SKILL: Record<Element, [string, string]> = {
  metal: ["Giáp Thép", "Giảm sát thương nhận vào."],
  wood: ["Sinh Mộc", "Hồi máu mỗi lượt."],
  water: ["Thủy Triều", "Đòn nước cực mạnh."],
  fire: ["Liệt Hỏa", "Thiêu đốt đối thủ."],
  earth: ["Địa Chấn", "Giảm phòng thủ đối thủ."],
  dark: ["Hút Hồn", "Hút máu đối thủ."],
  light: ["Thánh Quang", "Thanh tẩy hiệu ứng xấu."],
};

/** Thông số để fishes.ts tạo FishDef cho các dạng lai theo hệ. */
export interface GeneratedHybrid {
  id: string;
  name: string;
  element: Element;
  mult: number;
  spd: number;
  weightKg: [number, number];
  appearance: Partial<FishAppearance> & Pick<FishAppearance, "shape" | "body">;
  skill: [string, string];
  description: string;
}

export const GENERATED_HYBRIDS: GeneratedHybrid[] = [];
const GEN_TIER = new Map<string, BreedTier>();
const ELEMENT_RECIPES: BreedRecipe[] = [];

ORDER.forEach((e1, i) => {
  ORDER.slice(i).forEach((e2) => {
    const key = `${e1}_${e2}`;
    const w = pairWord(e1, e2);
    const results = TIERS4.map((tier, k) => {
      const id = `f_lai_${key}_${k + 1}`;
      const look = genLook(e1, e2, tier);
      // hệ của con: Boss Lai & Mythic theo hệ 1, Siêu Boss theo hệ 2, Gen Lặn: Ánh Sáng / Bóng Tối
      const el: Element = tier === "super" ? e2 : tier === "recessive" ? (e1 === e2 ? e1 : e1 === "light" || e2 === "light" ? "light" : "dark") : e1;
      GENERATED_HYBRIDS.push({
        id,
        name: NAME[tier as Exclude<BreedTier, "boss">](w),
        element: el,
        mult: TIER_MULT[tier],
        spd: 50 + k * 8 + (ORDER.indexOf(e2) % 3) * 4,
        weightKg: [300 * (k + 1), 900 * (k + 1)],
        appearance: { shape: look.shape === "kraken" ? "angler" : "shark", body: look.body, belly: look.belly, fin: look.fin, horns: !!look.horn, spikes: !!look.back, eye: "glow", eyeColor: look.eye, glow: EL[e2].accent, scale: 1.6 },
        skill: SKILL[el],
        description: `${DESC[tier as Exclude<BreedTier, "boss">]} Dòng ${EL[e1].title} – ${EL[e2].title}.`,
      });
      GEN_TIER.set(id, tier);
      BREED_LOOKS[id] = look;
      return { fish: id, pct: [58, 30, 10, 2][k]! };
    });
    ELEMENT_RECIPES.push({
      id: `el_${key}`,
      elements: [e1, e2],
      title: `Dòng ${EL[e1].title}${e1 === e2 ? "" : ` – ${EL[e2].title}`}`,
      egg: { name: `Trứng ${w}`, a: EL[e1].body, b: EL[e2].fin, spot: EL[e2].accent },
      hatchMinutes: e1 === e2 ? 30 : 40,
      results,
    });
  });
});

/** Hệ của LOÀI cá lai theo dòng (2 hệ bố mẹ; dòng cùng hệ = 1 hệ) – dùng để phân loại Bộ Sưu Tập. */
export const HYBRID_SPECIES_ELEMENTS: Record<string, Element[]> = {};
for (const r of ELEMENT_RECIPES) {
  const [a, b] = r.elements!;
  for (const x of r.results) HYBRID_SPECIES_ELEMENTS[x.fish] = a === b ? [a] : [a, b];
}

/** Công thức riêng theo loài (ưu tiên) + 28 dòng lai theo hệ. */
export const BREEDING_RECIPES: BreedRecipe[] = [...SPECIAL_RECIPES, ...ELEMENT_RECIPES];
