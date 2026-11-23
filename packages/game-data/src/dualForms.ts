import type { Element, FishFormDef, FormAura } from "@dccc/shared";
import { EL, HYBRID_SPECIES_ELEMENTS, ORDER } from "./breeding.ts";
import { FISH_FORMS as BASE_FORMS } from "./forms.ts";

/**
 * DẠNG SONG HỆ CŨ (bản 0.53) – không còn đột biến ra được nữa, chỉ GIỮ LẠI để cá đã mang dạng này không mất dạng.
 * Cá song hệ nay đột biến bằng 5 loại Đá Tiến Hoá như mọi cá, ra DẠNG SONG HỆ RIÊNG của từng viên (xem DUAL_STONE_FORMS).
 */
export const DUAL_FORM_ITEM = "song_he";

const AURA: Record<Element, FormAura> = {
  metal: "storm",
  wood: "dragon",
  water: "abyss",
  fire: "flame",
  earth: "golddragon",
  dark: "darkflame",
  light: "angel",
};

const DRAGON: Record<Element, FormAura> = {
  metal: "golddragon",
  wood: "dragon",
  water: "dragon",
  fire: "golddragon",
  earth: "golddragon",
  dark: "blackdragon",
  light: "golddragon",
};

type Spec = { n: number; rank: NonNullable<FishFormDef["rank"]>; weight: number; focus: NonNullable<FishFormDef["focus"]> | "legend"; suffix: string; flavor: string };
const SPECS: Spec[] = [
  { n: 1, rank: "common", weight: 45, focus: "all", suffix: "Song Linh", flavor: "Hai dòng sức mạnh hoà quyện cân bằng" },
  { n: 2, rank: "rare", weight: 30, focus: "hp", suffix: "Hộ Thể", flavor: "Giáp hai hệ bọc kín thân, sinh lực dồi dào" },
  { n: 3, rank: "epic", weight: 18, focus: "atk", suffix: "Cuồng Ngư", flavor: "Hệ phụ bùng nổ thành vũ khí, sát khí ngút trời" },
  { n: 4, rank: "legend", weight: 7, focus: "legend", suffix: "Thánh Tôn", flavor: "Song hệ hợp nhất tuyệt đối, hào quang hai sắc" },
];
// song hệ mạnh hơn dạng đơn hệ ~10%
const MULT = {
  all: { hp: 1.65, atk: 1.65, def: 1.65, spd: 7 },
  hp: { hp: 2.4, atk: 1.6, def: 1.6, spd: 5 },
  atk: { hp: 1.5, atk: 2.35, def: 1.4, spd: 9 },
  def: { hp: 1.6, atk: 1.6, def: 2.3, spd: 5 },
  legend: { hp: 2.05, atk: 2.05, def: 2.05, spd: 18 },
};
const CODE = (n: number) => `SH-${n}`;
const fmt = (x: number) => `×${x.toFixed(2).replace(/0$/, "").replace(".", ",")}`;

/** Khoá cặp hệ theo thứ tự dòng lai (hệ chính trước). */
export const dualKey = (a: Element, b: Element) => `${a}_${b}`;

export const LEGACY_DUAL_FORMS: FishFormDef[] = [];
ORDER.forEach((a, i) =>
  ORDER.slice(i + 1).forEach((b) => {
    const A = EL[a];
    const B = EL[b];
    for (const sp of SPECS) {
      const m = MULT[sp.focus];
      const what = sp.focus === "legend" ? "Toàn diện" : sp.focus === "all" ? "Cân bằng" : sp.focus === "hp" ? "Chuyên MÁU" : "Chuyên CÔNG";
      LEGACY_DUAL_FORMS.push({
        id: `sh_${dualKey(a, b)}_${sp.n}`,
        name: `${A.word} ${B.word} ${sp.suffix}`,
        itemId: DUAL_FORM_ITEM,
        mult: { hp: m.hp, atk: m.atk, def: m.def },
        spdBonus: m.spd,
        element: a,
        glow: sp.n >= 3 ? B.accent : A.accent,
        look: {
          body: sp.n === 4 ? A.dark : sp.n === 2 ? A.fin : A.body,
          belly: A.belly,
          fin: B.fin,
          pattern: sp.n === 1 ? "stripes" : sp.n === 2 ? "scales" : "spots",
          patternColor: B.accent,
          eyeColor: B.eye,
          horns: sp.n >= 2,
          spikes: sp.n >= 3,
          teeth: sp.n >= 3,
          // mỗi dạng một hiệu ứng: SH-1 theo hệ chính · SH-2 theo hệ phụ · SH-3 rồng · SH-4 phượng hoàng
          aura: sp.n === 4 ? "phoenix" : sp.n === 3 ? DRAGON[b] : sp.n === 2 ? (AURA[b] === AURA[a] ? "storm" : AURA[b]) : AURA[a],
          palette: [A.accent, B.accent, sp.n === 4 ? "#ffffff" : B.fin],
        },
        rank: sp.rank,
        weight: sp.weight,
        focus: sp.focus === "legend" ? "all" : sp.focus,
        code: CODE(sp.n),
        description: `【${CODE(sp.n)} · ${sp.weight}%】 ${sp.flavor}: hệ chính ${A.title}, hệ phụ ${B.title}. ${what}: Máu ${fmt(m.hp)} · Công ${fmt(m.atk)} · Thủ ${fmt(m.def)} · Tốc +${m.spd}.`,
      });
    }
  }),
);

/**
 * BIẾN DỊ CÁ SONG HỆ THEO TỪNG VIÊN ĐÁ: cá 2 hệ (hệ đầu = CHÍNH, hệ 2 = PHỤ) vẫn dùng 5 loại Đá Tiến Hoá
 * (Ngọc Long Hồn · Lõi Dung Nham · Tinh Thể Băng Hà · Sấm Thạch · Đá Tiến Hoá Thần), nhưng mỗi viên ra BỘ DẠNG RIÊNG
 * của cặp hệ đó: giữ phong cách & hiệu ứng của viên đá, thêm vây / vân / mắt màu hệ phụ, sắc hào quang hai hệ,
 * mạnh hơn dạng 1 hệ ~10%. Cùng cấp bậc & tỉ lệ ra như dạng gốc. Cá GIỮ HỆ CHÍNH.
 */
export const DUAL_STONE_FORMS: FishFormDef[] = [];
const r2 = (x: number) => Math.round(x * 100) / 100;
ORDER.forEach((a, i) =>
  ORDER.slice(i + 1).forEach((b) => {
    const A = EL[a];
    const B = EL[b];
    for (const base of BASE_FORMS) {
      const mult = { hp: r2(base.mult.hp * 1.1), atk: r2(base.mult.atk * 1.1), def: r2(base.mult.def * 1.1) };
      const spdBonus = base.spdBonus + 2;
      DUAL_STONE_FORMS.push({
        ...base,
        id: `${base.id}__${dualKey(a, b)}`,
        name: `${base.name} ${A.word}-${B.word}`,
        pair: dualKey(a, b),
        mult,
        spdBonus,
        element: a,
        look: {
          ...base.look,
          fin: B.fin,
          pattern: base.look.pattern === "none" ? "stripes" : base.look.pattern,
          patternColor: B.accent,
          eyeColor: B.eye,
          palette: [A.accent, B.accent, base.glow],
        },
        description: `【${base.code ?? ""} · ${base.weight ?? 0}%】 ${base.description.replace(/^【[^】]*】\s*/, "").split(".")[0]} – song hệ ${A.title} (chính) · ${B.title} (phụ). Máu ×${String(mult.hp).replace(".", ",")} · Công ×${String(mult.atk).replace(".", ",")} · Thủ ×${String(mult.def).replace(".", ",")} · Tốc +${spdBonus}.`,
      });
    }
  }),
);

/** Cặp hệ (chính, phụ) của loài cá song hệ; null = cá 1 hệ. */
export function dualPairOf(fishId: string): [Element, Element] | null {
  const e = HYBRID_SPECIES_ELEMENTS[fishId];
  return e && e.length === 2 ? [e[0]!, e[1]!] : null;
}

/** Các dạng đột biến một LOÀI cá có thể ra với viên đá itemId (cá song hệ → bộ dạng song hệ riêng). */
export function formsForFish(fishId: string, itemId: string): FishFormDef[] {
  const pair = dualPairOf(fishId);
  if (!pair) return BASE_FORMS.filter((f) => f.itemId === itemId);
  const k = dualKey(pair[0], pair[1]);
  return DUAL_STONE_FORMS.filter((f) => f.pair === k && f.itemId === itemId);
}

/** Mọi dạng đột biến (theo mọi viên đá) của một loài cá. */
export function formListForFish(fishId: string): FishFormDef[] {
  const pair = dualPairOf(fishId);
  if (!pair) return BASE_FORMS;
  const k = dualKey(pair[0], pair[1]);
  return DUAL_STONE_FORMS.filter((f) => f.pair === k);
}
