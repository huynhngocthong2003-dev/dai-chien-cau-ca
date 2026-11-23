/**
 * Hình dáng riêng của từng loài cá (thuần dữ liệu – không đụng Canvas, có test).
 * Mỗi loài ra một tổ hợp: dáng thân, mõm, miệng, đuôi, vây lưng, tư thế… không trùng nhau.
 * Lấy từ `appearance` (dáng gốc) + băm theo id, cộng vài loài được chỉnh tay cho đúng chất.
 */
import type { FishAppearance } from "@dccc/shared";

export type Snout = "blunt" | "pointed" | "sword" | "hammer" | "upturned" | "duck" | "round";
export type MouthKind = "smile" | "open" | "fangs" | "pout" | "grin";
export type TailKind = "fork" | "round" | "fan" | "lunate" | "split" | "whip" | "flame";
export type DorsalKind = "spiky" | "sail" | "wave" | "low" | "double" | "crest" | "none";

export interface FishMorph {
  /** Độ dài thân so với độ cao (2 = tròn mập, 6 = dài như lươn). */
  aspect: number;
  /** Vị trí phần dày nhất (0 đuôi → 1 mõm). */
  peak: number;
  /** Độ to của đầu / độ tù mõm (0.3 nhọn → 1.4 tù). */
  head: number;
  /** Lưng gù hơn bụng (>1) hay bụng phệ hơn (<1). */
  hump: number;
  /** Độ cong của thân (tư thế bơi / nhảy). */
  bend: number;
  /** Cong chữ S (lươn, rắn biển, rồng). */
  wave: number;
  /** Góc nghiêng cả con (độ) – hơi ngóc đầu lên như đang nhảy. */
  tilt: number;
  snout: Snout;
  mouth: MouthKind;
  tail: TailKind;
  tailSize: number;
  dorsal: DorsalKind;
  dorsalSize: number;
  pectoral: number;
  whiskers: boolean;
  lure: boolean;
  scales: boolean;
  /** Mắt to cỡ nào (so với chiều cao đầu). */
  eyeSize: number;
  /** Cuộn chữ S theo chiều dài thân (rồng cuộn khi trưởng thành), 0 = không. */
  coil?: number;
  /** Màu đuôi riêng (vd đuôi lụa trắng). */
  tailColor?: string;
  /** NÉT NHẬN DIỆN luôn hiện từ Sơ Giai (cá Boss / Thần Thoại): đồ trên đầu, bờm, mây, vây cánh. */
  sig?: { head?: "antlers" | "horns" | "crystal" | "flame"; mane?: boolean; clouds?: boolean; finwings?: boolean };
}

/** Số giả ngẫu nhiên tất định theo chuỗi. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function picker(seed: number) {
  let x = seed || 1;
  const next = () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
  return {
    f: (a: number, b: number) => a + (b - a) * next(),
    pick: <T>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)]!,
  };
}

/** Dáng gốc theo nhóm hình. */
const BASE: Record<FishAppearance["shape"], Omit<Partial<FishMorph>, "aspect"> & { aspect: [number, number] }> = {
  // tỉ lệ chibi: thân ngắn, đầu to
  round: { aspect: [1.55, 1.95], peak: 0.64, head: 1.15 },
  long: { aspect: [2.2, 2.8], peak: 0.66, head: 1 },
  flat: { aspect: [1.25, 1.55], peak: 0.6, head: 1.2 },
  shark: { aspect: [2.5, 3.0], peak: 0.64, head: 0.85, snout: "pointed" },
  angler: { aspect: [1.5, 1.8], peak: 0.7, head: 1.45, lure: true },
  puffer: { aspect: [1.12, 1.28], peak: 0.56, head: 1.35 },
  eel: { aspect: [4.2, 5], peak: 0.74, head: 1.05, tail: "whip", dorsal: "wave" },
  serpent: { aspect: [4, 4.8], peak: 0.74, head: 1.15, tail: "flame", dorsal: "crest" },
};

/** Vài loài chỉnh tay cho đúng đặc trưng (ngoài phần sinh tự động). */
const OVERRIDES: Record<string, Partial<FishMorph>> = {
  // ===== CÁ BOSS & THẦN THOẠI: mỗi loài một KIỂU DÁNG riêng hẳn + nét nhận diện luôn hiện =====
  // Lão Ngư Sừng Sắt – cá trê già lưng gù, râu dài, đầu to
  f_boss_lao_ngu: { aspect: 2.5, peak: 0.72, head: 1.45, hump: 1.55, bend: 0.12, tilt: 6, snout: "blunt", mouth: "pout", tail: "round", tailSize: 0.95, dorsal: "low", whiskers: true, scales: false, eyeSize: 1.25, sig: { head: "horns" } },
  // Bạo Chúa San Hô – thân tròn hầm hố, hàm cá mập hếch, vương miện san hô
  f_boss_bao_chua_san_ho: { aspect: 1.35, peak: 0.6, head: 1.55, hump: 1.2, bend: 0.2, tilt: 14, snout: "upturned", mouth: "fangs", tail: "fan", tailSize: 1.15, dorsal: "spiky", dorsalSize: 1.35, whiskers: false, eyeSize: 1.35, sig: { head: "crystal" } },
  // Hắc Long Ngư Vực Thẳm – rồng đen cuộn chữ S, bờm bay, đuôi roi
  f_boss_hac_long: { aspect: 6.2, peak: 0.8, head: 1.2, hump: 1, bend: 0.1, wave: 0.55, coil: 1.2, tilt: 2, snout: "duck", mouth: "fangs", tail: "whip", tailSize: 1.2, dorsal: "crest", dorsalSize: 1.2, whiskers: true, eyeSize: 1.2, sig: { head: "horns", mane: true } },
  // Hỏa Ngục Bạo Ngư – cá mập đầu búa rực lửa, vây buồm
  f_boss_hoa_nguc_bao_ngu: { aspect: 2.9, peak: 0.62, head: 0.95, hump: 1.1, bend: 0.22, tilt: 10, snout: "hammer", mouth: "fangs", tail: "lunate", tailSize: 1.25, dorsal: "sail", dorsalSize: 1.4, whiskers: false, lure: false, eyeSize: 1.3, sig: { head: "flame" } },
  // Kim Long Đế – rồng vàng uốn lượn, gạc nai, râu rồng, đuôi quạt
  f_boss_kim_long_de: { aspect: 5.2, peak: 0.76, head: 1.25, hump: 1, bend: 0.14, wave: 0.42, tilt: 6, snout: "duck", mouth: "grin", tail: "fan", tailSize: 1.3, dorsal: "spiky", dorsalSize: 1.1, whiskers: true, eyeSize: 1.3, sig: { head: "antlers", clouds: true } },
  // Cá Kim Tiền Tí Hon – đồng xu tròn vo, vây đôi, vương miện vàng
  f_sboss_kim_tien: { aspect: 1.12, peak: 0.55, head: 1.3, hump: 1, bend: 0.05, tilt: 4, snout: "round", mouth: "smile", tail: "split", tailSize: 1.2, dorsal: "double", whiskers: false, eyeSize: 1.6, sig: { head: "crystal" } },
  // Thần Ngư Bắc Cực – kỳ lân biển mõm kiếm, thân thoi, mây băng
  f_than_ngu_bac_cuc: { aspect: 3.3, peak: 0.6, head: 0.9, hump: 0.9, bend: 0.16, tilt: 8, snout: "sword", mouth: "smile", tail: "lunate", tailSize: 1.1, dorsal: "low", whiskers: false, eyeSize: 1.35, sig: { clouds: true } },
  // Băng Đế Hải Xà – rắn biển dài mõm nhọn, vương miện pha lê, đuôi chẻ
  f_boss_bang_de: { aspect: 5.4, peak: 0.8, head: 1, hump: 0.95, bend: 0.1, wave: 0.42, tilt: 2, snout: "pointed", mouth: "open", tail: "split", tailSize: 1.15, dorsal: "spiky", dorsalSize: 1.25, whiskers: false, lure: false, eyeSize: 1.15, sig: { head: "crystal" } },
  // Thái Cổ Thần Ngư – cá vây tay cổ đại: thân đẫy, vây đôi, vây ngực như chân
  f_thai_co_than_ngu: { aspect: 2.6, peak: 0.6, head: 1.3, hump: 1.25, bend: 0.1, tilt: 4, snout: "blunt", mouth: "grin", tail: "split", tailSize: 1.05, dorsal: "double", dorsalSize: 1.2, pectoral: 1.5, whiskers: false, scales: true, eyeSize: 1.2, sig: { head: "horns", finwings: true } },
  // Phượng Hoàng Biển – vây cánh lớn, đuôi lửa dài, mào lửa
  f_phuong_hoang_bien: { aspect: 2.3, peak: 0.66, head: 1.05, hump: 1.1, bend: 0.3, tilt: 20, snout: "pointed", mouth: "smile", tail: "flame", tailSize: 1.55, dorsal: "crest", dorsalSize: 1.4, pectoral: 1.7, whiskers: false, eyeSize: 1.35, sig: { head: "flame", finwings: true } },
  // Hải Thần Cự Thú – cá voi khổng lồ: đầu vuông to, lưng phẳng, đuôi trăng khuyết rộng
  f_boss_hai_than_cu_thu: { aspect: 2.3, peak: 0.72, head: 1.55, hump: 0.9, bend: 0.03, tilt: 0, snout: "blunt", mouth: "grin", tail: "fan", tailSize: 0.85, dorsal: "none", pectoral: 1.2, whiskers: false, lure: false, scales: false, eyeSize: 1.0, sig: { head: "horns", clouds: true } },
  // Chép Tí Hon Thần Tài – cá chép râu dài, đuôi quạt bồng, mào vàng
  f_sboss_chep_than_tai: { aspect: 1.9, peak: 0.62, head: 1.15, hump: 1.35, bend: 0.28, tilt: 18, snout: "round", mouth: "pout", tail: "fan", tailSize: 1.55, dorsal: "crest", dorsalSize: 1.3, whiskers: true, scales: true, eyeSize: 1.5, sig: { head: "crystal" } },
  // Kình Ngư Cầu Vồng – cá voi lưng gù mõm tròn, vây ngực dài như cánh
  f_sboss_kinh_ngu_cau_vong: { aspect: 2.4, peak: 0.66, head: 1.25, hump: 1.4, bend: 0.2, tilt: 12, snout: "round", mouth: "smile", tail: "fork", tailSize: 1.35, dorsal: "low", pectoral: 1.8, whiskers: false, scales: false, eyeSize: 1.2, sig: { finwings: true, clouds: true } },
  // Nóc Bông Gòn – cá nóc tròn như bông, mây bông quanh mình
  f_sboss_noc_bong_gon: { aspect: 1.08, peak: 0.55, head: 1.45, hump: 1.05, bend: 0.04, tilt: 3, snout: "round", mouth: "pout", tail: "round", tailSize: 0.8, dorsal: "low", whiskers: false, eyeSize: 1.7, sig: { clouds: true } },
  // Cổ Long Vương Dung Nham – rồng dung nham mõm hếch, nanh, mào lửa + bờm
  f_sboss_co_long_vuong: { aspect: 3.4, peak: 0.7, head: 1.4, hump: 1.3, bend: 0.3, wave: 0.2, tilt: 18, snout: "upturned", mouth: "fangs", tail: "flame", tailSize: 1.35, dorsal: "spiky", dorsalSize: 1.45, whiskers: false, lure: false, eyeSize: 1.15, sig: { head: "flame", mane: true } },
  // Cá Tuyết Mochi – bánh mochi tròn dẹt, vây ngắn, vương miện tuyết
  f_sboss_ca_tuyet_mochi: { aspect: 1.25, peak: 0.5, head: 1.25, hump: 0.85, bend: 0.06, tilt: 5, snout: "blunt", mouth: "smile", tail: "fan", tailSize: 0.9, dorsal: "none", pectoral: 0.8, whiskers: false, scales: false, eyeSize: 1.6, sig: { head: "crystal" } },
  // Leviathan Diệt Thế – thuỷ quái lươn khổng lồ, hàm nanh, gai lưng, đuôi roi, bờm
  f_sboss_leviathan: { aspect: 3.8, peak: 0.7, head: 1.45, hump: 1.3, bend: 0.14, wave: 0.2, tilt: 4, snout: "pointed", mouth: "fangs", tail: "lunate", tailSize: 1.2, dorsal: "sail", dorsalSize: 1.6, pectoral: 1.4, whiskers: false, lure: false, eyeSize: 1.0, sig: { head: "horns", finwings: true } },
  // giữ đúng dáng hình gốc (rồng nước thân mảnh, gai lưng vàng, đuôi lụa trắng)
  f_huyen_minh_long_ngu: { aspect: 6.4, peak: 0.78, head: 1.1, dorsal: "spiky", dorsalSize: 1.1, tail: "flame", tailSize: 1.3, tailColor: "#e0f7fa", whiskers: true, scales: true, wave: 0.35, tilt: 4 },
  f_ca_ro: { dorsal: "spiky", dorsalSize: 1.25, mouth: "grin", tail: "round", snout: "blunt" },
  f_ca_map_bua: { snout: "hammer", mouth: "grin", dorsal: "sail", tail: "lunate", tilt: 8 },
  f_hoa_long_ngu: { tail: "flame", dorsal: "crest", whiskers: true, wave: 0.4, snout: "duck" },
  f_ca_kiem_bang: { snout: "sword", tail: "lunate", dorsal: "sail" },
  f_ca_tre: { whiskers: true, snout: "round", tail: "round" },
  f_ca_chep: { whiskers: true, tail: "fan" },
};

export function fishMorph(id: string, a: FishAppearance): FishMorph {
  const r = picker(hash(id));
  const b = BASE[a.shape];
  const tube = a.shape === "eel" || a.shape === "serpent";
  const m: FishMorph = {
    aspect: r.f(b.aspect[0], b.aspect[1]),
    peak: (b.peak ?? 0.6) + r.f(-0.06, 0.06),
    head: (b.head ?? 1) * r.f(0.85, 1.15),
    hump: r.f(0.8, 1.35),
    bend: tube ? r.f(0.08, 0.2) : r.f(0.08, 0.34),
    wave: tube ? r.f(0.3, 0.5) : 0,
    tilt: tube ? r.f(-4, 8) : r.f(6, 22),
    snout: b.snout ?? r.pick(["blunt", "pointed", "upturned", "round", "blunt", "pointed"] as const),
    mouth: a.teeth ? r.pick(["fangs", "grin", "open"] as const) : r.pick(["smile", "pout", "open", "smile"] as const),
    tail: b.tail ?? (a.shape === "shark" ? r.pick(["lunate", "fork"] as const) : r.pick(["fork", "round", "fan", "lunate", "split"] as const)),
    tailSize: r.f(0.85, 1.25),
    dorsal: b.dorsal ?? (a.spikes ? "spiky" : r.pick(["sail", "wave", "low", "double", "crest", "spiky", "none"] as const)),
    dorsalSize: r.f(0.8, 1.3),
    pectoral: r.f(0.8, 1.3),
    whiskers: a.horns && a.shape === "long",
    lure: !!b.lure,
    scales: a.pattern === "scales" || (!tube && a.shape !== "shark" && a.shape !== "puffer" && r.f(0, 1) < 0.7),
    eyeSize: r.f(1.35, 1.65) * (a.shape === "puffer" ? 1.15 : 1),
  };
  return { ...m, ...OVERRIDES[id] };
}

/** Chữ ký hình dáng (để kiểm tra không trùng): làm tròn các thông số chính. */
export function morphSignature(m: FishMorph): string {
  return [
    Math.round(m.aspect * 2),
    Math.round(m.peak * 10),
    Math.round(m.head * 5),
    Math.round(m.hump * 4),
    Math.round(m.bend * 10),
    m.snout,
    m.mouth,
    m.tail,
    m.dorsal,
    m.whiskers,
    m.lure,
  ].join("|");
}

/** Bộ chi tiết TIẾN HOÁ riêng của từng loài (Huyền Thoại/Boss/Thần Thoại) – thêm dần theo giai trên dáng gốc. */
export interface EvoFeatures {
  /** Đồ trên đầu: sừng nai phân nhánh / sừng nhọn / vương miện pha lê / mào lửa. */
  head: "antlers" | "horns" | "crystal" | "flame";
  /** Thân: vảy giáp viền vàng / gai quanh thân / sọc phát sáng. */
  body: "scales" | "spikes" | "glow";
  /** Thêm: bờm bay / mây bông / vây cánh dài. */
  extra: "mane" | "clouds" | "finwings";
  /** Màu điểm nhấn (vàng / bạc / hồng ngọc / ngọc lục). */
  accent: string;
}

export function evoFeatures(id: string, a: FishAppearance): EvoFeatures {
  const r = picker(hash(`evo_${id}`));
  const long = a.shape === "eel" || a.shape === "serpent" || a.shape === "long";
  return {
    head: long ? r.pick(["antlers", "antlers", "horns", "flame"] as const) : r.pick(["horns", "crystal", "flame", "crystal", "antlers"] as const),
    body: a.spikes ? r.pick(["spikes", "scales"] as const) : r.pick(["scales", "glow", "spikes"] as const),
    extra: long ? r.pick(["mane", "mane", "finwings"] as const) : r.pick(["clouds", "finwings", "mane"] as const),
    accent: r.pick(["#ffca28", "#e0e0e0", "#ff4081", "#1de9b6", "#ffca28"] as const),
  };
}
