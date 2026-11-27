import type { Rng } from "./rng.ts";
import type { BiomeType } from "./types.ts";
import { ALTAR_RADIUS, BIOME_SECTORS, biomeMidAngle, ISLAND_RADIUS, WORLD_CENTER } from "./zone.ts";

// Vật thể trên bản đồ: công trình (không phá được, chắn đường & đạn) và vật phá được (có máu).

export type PropKind =
  | "tree" | "darktree" | "deadtree" | "pine" | "snowpine" | "cactus" | "pillar" | "brokenpillar" | "ruin" | "arch" | "statue"
  | "house" | "ruinhouse" | "well" | "barrel" | "rock" | "boulder" | "peak" | "crystal" | "icechunk" | "fire" | "grave" | "obelisk" | "bush";

export interface PropDef {
  /** Bán kính va chạm (đơn vị thế giới). */
  radius: number;
  /** Máu; 0 = công trình không phá được. */
  hp: number;
  /** Chắn đường đi & đạn. */
  solid: boolean;
  nameVi: string;
}

export const PROP_DEFS: Record<PropKind, PropDef> = {
  tree: { radius: 24, hp: 320, solid: true, nameVi: "Cây" },
  darktree: { radius: 24, hp: 320, solid: true, nameVi: "Cây u linh" },
  deadtree: { radius: 14, hp: 150, solid: true, nameVi: "Cây khô" },
  pine: { radius: 18, hp: 240, solid: true, nameVi: "Cây thông" },
  snowpine: { radius: 18, hp: 240, solid: true, nameVi: "Thông tuyết" },
  cactus: { radius: 13, hp: 120, solid: true, nameVi: "Xương rồng" },
  bush: { radius: 20, hp: 90, solid: true, nameVi: "Bụi cây" },
  barrel: { radius: 13, hp: 70, solid: true, nameVi: "Thùng gỗ" },
  rock: { radius: 22, hp: 260, solid: true, nameVi: "Đá" },
  boulder: { radius: 36, hp: 520, solid: true, nameVi: "Tảng đá" },
  crystal: { radius: 16, hp: 180, solid: true, nameVi: "Pha lê" },
  icechunk: { radius: 26, hp: 260, solid: true, nameVi: "Khối băng" },
  grave: { radius: 11, hp: 90, solid: true, nameVi: "Bia mộ" },
  // công trình
  house: { radius: 60, hp: 0, solid: true, nameVi: "Nhà" },
  ruinhouse: { radius: 60, hp: 0, solid: true, nameVi: "Nhà đổ nát" },
  well: { radius: 28, hp: 0, solid: true, nameVi: "Giếng" },
  arch: { radius: 56, hp: 0, solid: true, nameVi: "Cổng vòm" },
  ruin: { radius: 58, hp: 0, solid: true, nameVi: "Tường phế tích" },
  pillar: { radius: 16, hp: 0, solid: true, nameVi: "Cột đá" },
  brokenpillar: { radius: 16, hp: 0, solid: true, nameVi: "Cột gãy" },
  statue: { radius: 22, hp: 0, solid: true, nameVi: "Tượng" },
  obelisk: { radius: 15, hp: 0, solid: true, nameVi: "Tháp đá" },
  peak: { radius: 70, hp: 0, solid: true, nameVi: "Núi" },
  fire: { radius: 14, hp: 0, solid: false, nameVi: "Lửa trại" },
};

export const BIOME_PROPS: Record<BiomeType, PropKind[]> = {
  forest: ["tree", "darktree", "darktree", "tree", "bush", "rock", "grave", "fire", "deadtree"],
  ruined_temple: ["pillar", "brokenpillar", "ruin", "arch", "statue", "grave", "tree", "bush"],
  desert: ["cactus", "cactus", "rock", "boulder", "obelisk", "deadtree", "barrel"],
  ruined_village: ["house", "ruinhouse", "well", "barrel", "barrel", "rock", "deadtree", "fire"],
  mountain: ["peak", "snowpine", "snowpine", "boulder", "crystal", "rock"],
  glacier: ["crystal", "icechunk", "snowpine", "crystal", "peak", "rock"],
};

export interface Prop {
  id: string;
  kind: PropKind;
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  solid: boolean;
  alive: boolean;
  /** Lật hình (chỉ để hiển thị cho đa dạng). */
  flip: boolean;
}

export function isStructure(p: Prop): boolean {
  return p.maxHp === 0;
}

/** Rải vật thể theo vùng; chừa đường đá, tế đàn và các điểm cần trống (chỗ xuất phát, quái…). */
export function generateProps(rng: Rng, keepClear: Array<{ x: number; y: number }>): Prop[] {
  const out: Prop[] = [];
  let n = 0;
  for (const s of BIOME_SECTORS) {
    const kinds = BIOME_PROPS[s.biome];
    const mid = biomeMidAngle(s.biome);
    for (let i = 0; i < 110; i++) {
      const a = ((rng.range(s.from + 2, s.to - 2)) * Math.PI) / 180;
      const d = rng.range(ALTAR_RADIUS + 90, ISLAND_RADIUS - 70);
      const kind = rng.pick(kinds);
      const flip = rng.chance(0.5);
      const x = WORLD_CENTER + Math.cos(a) * d;
      const y = WORLD_CENTER + Math.sin(a) * d;
      if (Math.abs(Math.sin(a - mid)) * d < 80) continue; // đường đá
      const def = PROP_DEFS[kind];
      if (keepClear.some((p) => Math.hypot(p.x - x, p.y - y) < def.radius + 70)) continue;
      if (out.some((p) => Math.hypot(p.x - x, p.y - y) < p.radius + def.radius + 26)) continue; // chừa lối đi giữa các vật
      out.push({ id: `pr${n++}`, kind, x, y, radius: def.radius, hp: def.hp, maxHp: def.hp, solid: def.solid, alive: true, flip });
    }
  }
  return out;
}

/** Lưới tra cứu nhanh vật thể theo ô. */
export class PropGrid {
  private readonly cells = new Map<number, Prop[]>();
  private readonly cell: number;
  constructor(props: Prop[], cell = 160) {
    this.cell = cell;
    for (const p of props) {
      const x0 = Math.floor((p.x - p.radius) / cell);
      const x1 = Math.floor((p.x + p.radius) / cell);
      const y0 = Math.floor((p.y - p.radius) / cell);
      const y1 = Math.floor((p.y + p.radius) / cell);
      for (let gx = x0; gx <= x1; gx++)
        for (let gy = y0; gy <= y1; gy++) {
          const k = gx * 10000 + gy;
          const arr = this.cells.get(k);
          if (arr) arr.push(p);
          else this.cells.set(k, [p]);
        }
    }
  }

  /** Vật thể còn tồn tại có thể chạm vòng tròn (x, y, r). */
  near(x: number, y: number, r: number): Prop[] {
    const res: Prop[] = [];
    const x0 = Math.floor((x - r) / this.cell);
    const x1 = Math.floor((x + r) / this.cell);
    const y0 = Math.floor((y - r) / this.cell);
    const y1 = Math.floor((y + r) / this.cell);
    for (let gx = x0; gx <= x1; gx++)
      for (let gy = y0; gy <= y1; gy++) {
        const arr = this.cells.get(gx * 10000 + gy);
        if (!arr) continue;
        for (const p of arr) if (p.alive && !res.includes(p)) res.push(p);
      }
    return res;
  }
}
