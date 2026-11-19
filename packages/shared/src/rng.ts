/**
 * Bộ sinh số ngẫu nhiên có seed (mulberry32). Dùng chung cho client và server
 * để mọi phiên câu cá / trận đấu đều có thể tái hiện từ seed đã lưu.
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

  getState(): number {
    return this.state;
  }
}

export function randomSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0;
}
