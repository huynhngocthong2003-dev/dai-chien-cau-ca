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
