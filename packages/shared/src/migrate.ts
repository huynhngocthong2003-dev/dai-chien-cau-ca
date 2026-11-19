import { SAVE_VERSION, newCharProgress, newRodProgress } from "./save.ts";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Nâng cấp dữ liệu lưu cũ lên phiên bản hiện tại để người chơi không mất tiến trình.
 * Chỉ bổ sung trường mới với giá trị mặc định; kiểm tra hợp lệ do schema đảm nhận sau đó.
 */
export function migrateSave(raw: unknown): unknown {
  if (!isObj(raw)) return raw;
  const s: Obj = structuredClone(raw);
  if (s.version === 1) {
    for (const k of ["characters", "rods"] as const) {
      const rec = s[k];
      if (!isObj(rec)) continue;
      for (const id of Object.keys(rec)) {
        const old = rec[id];
        const level = isObj(old) && typeof old.level === "number" ? old.level : 1;
        rec[id] = k === "characters" ? { ...newCharProgress(), level } : { ...newRodProgress(), level: Math.min(level, 10) };
      }
    }
    if (Array.isArray(s.fishes)) s.fishes = s.fishes.map((f) => (isObj(f) ? { stars: 1, locked: false, ...f } : f));
    s.materials = { stones: 0, soul: 0, bossTickets: 3 };
    s.bossTicketDay = "";
    s.version = 2;
  }
  if (s.version === 2) {
    const rec = s.characters;
    if (isObj(rec)) for (const id of Object.keys(rec)) if (isObj(rec[id])) rec[id] = { equip: {}, ...(rec[id] as Obj) };
    s.wardrobe = {};
    s.version = 3;
  }
  if (s.version !== SAVE_VERSION) return s;
  return s;
}
