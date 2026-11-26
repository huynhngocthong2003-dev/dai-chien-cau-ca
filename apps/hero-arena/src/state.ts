import { createSave, parseSave, syncSystemMails, type HeroArenaSave } from "@hero-arena/core";

// Lưu tài khoản HERO ARENA trên trình duyệt (khóa riêng, không đụng save game câu cá).

const KEY = "hero_arena_save_v1";

function newPlayerId(): string {
  const c = globalThis.crypto;
  if (c && "randomUUID" in c) return c.randomUUID();
  return `p_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e9).toString(36)}`;
}

export const now = (): number => Date.now();

let current: HeroArenaSave | null = null;

export function getSave(): HeroArenaSave {
  if (current) return current;
  let loaded: HeroArenaSave | null = null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) loaded = parseSave(raw);
  } catch {
    /* bộ nhớ bị chặn → chơi tạm không lưu */
  }
  current = loaded ?? createSave(newPlayerId(), "Anh Hùng", now());
  syncSystemMails(current, now());
  persist();
  return current;
}

export function persist(): void {
  if (!current) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* bỏ qua */
  }
}

/** Seed trận mới (ngẫu nhiên thật – chỉ dùng để khởi tạo, logic trận vẫn tất định theo seed). */
export function newMatchSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0;
}
