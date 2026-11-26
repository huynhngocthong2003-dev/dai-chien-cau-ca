/**
 * Bộ sinh số ngẫu nhiên có seed (mulberry32) riêng của HERO ARENA.
 * Mọi trận đấu tái hiện được từ seed – không dùng Math.random trong logic.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0 || 0x9e3779b9;
  }

  /** Số thực trong [0, 1). */
  next(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  int(min: number, maxInclusive: number): number {
    return Math.floor(this.range(min, maxInclusive + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error("pick: danh sách rỗng");
    return items[Math.floor(this.next() * items.length)] as T;
  }

  pickWeighted<T>(items: readonly T[], weight: (item: T) => number): T {
    if (items.length === 0) throw new Error("pickWeighted: danh sách rỗng");
    const total = items.reduce((s, it) => s + Math.max(0, weight(it)), 0);
    if (total <= 0) return items[0] as T;
    let r = this.next() * total;
    for (const it of items) {
      r -= Math.max(0, weight(it));
      if (r < 0) return it;
    }
    return items[items.length - 1] as T;
  }
}
