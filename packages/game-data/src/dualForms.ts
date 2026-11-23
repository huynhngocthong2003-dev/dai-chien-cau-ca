import type { Element, FishFormDef, FormAura } from "@dccc/shared";
import { EL, ORDER } from "./breeding.ts";

/**
 * BIẾN DỊ SONG HỆ – riêng cho cá 2 hệ (cá lai theo dòng): HỆ ĐẦU là HỆ CHÍNH, hệ thứ 2 là HỆ PHỤ.
 * Mỗi cặp hệ có 4 dạng hiếm dần (Thường 45% · Hiếm 30% · Cực Hiếm 18% · Thần Thoại 7%): thân màu hệ chính,
 * vây / vân / mắt / hào quang theo hệ phụ; cá GIỮ HỆ CHÍNH. Đột biến tốn 1 Đá Tiến Hoá hệ chính + 1 viên hệ phụ.
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

export const DUAL_FORMS: FishFormDef[] = [];
ORDER.forEach((a, i) =>
  ORDER.slice(i + 1).forEach((b) => {
    const A = EL[a];
    const B = EL[b];
    for (const sp of SPECS) {
      const m = MULT[sp.focus];
      const what = sp.focus === "legend" ? "Toàn diện" : sp.focus === "all" ? "Cân bằng" : sp.focus === "hp" ? "Chuyên MÁU" : "Chuyên CÔNG";
      DUAL_FORMS.push({
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

/** 4 dạng Song Hệ của cặp hệ (hệ chính, hệ phụ). */
export function dualFormsOf(a: Element, b: Element): FishFormDef[] {
  return DUAL_FORMS.filter((f) => f.id.startsWith(`sh_${dualKey(a, b)}_`));
}
