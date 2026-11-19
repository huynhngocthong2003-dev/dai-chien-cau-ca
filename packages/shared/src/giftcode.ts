/**
 * Mã quà tặng. Client chỉ giữ mã BĂM (không có mã gốc trong mã nguồn).
 * Lưu ý: băm phía client chỉ giấu mã khỏi người đọc code; Giai đoạn 4 việc
 * đổi mã chuyển lên server (Edge Function) để kiểm soát hoàn toàn.
 */
import type { CharacterDef, RodDef } from "./types.ts";
import { addLedger, clone, newCharProgress, newRodProgress, type ActionResult, type PlayerSave } from "./save.ts";

const SALT = "dccc:gift:v1:";

/** Chuẩn hóa mã người chơi nhập: bỏ khoảng trắng, chữ thường. */
export function normalizeCode(code: string): string {
  return code.replace(/\s+/g, "").toLowerCase();
}

/** Băm 53-bit (cyrb53) hai vòng, trả về chuỗi hex 26 ký tự. Tất định trên mọi nền tảng. */
export function hashGiftCode(code: string): string {
  return hash53x2(SALT + normalizeCode(code));
}

/** Băm không mật mã (cyrb53 ×2) – dùng cho mã băm và tổng kiểm tra. */
export function hash53x2(str: string): string {
  const round = (seed: number) => {
    let h1 = 0xdeadbeef ^ seed;
    let h2 = 0x41c6ce57 ^ seed;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, "0");
  };
  return round(7) + round(1337).slice(0, 12);
}

export type RedeemResult = ActionResult & { character?: CharacterDef; rod?: RodDef };

/** Đổi mã: mở khóa nhân vật / cần câu có unlock.kind === "code" khớp mã băm. Mỗi mã dùng một lần. */
export function redeemGiftCode(
  save: PlayerSave,
  code: string,
  catalog: { characters: CharacterDef[]; rods: RodDef[] },
  now: number,
): RedeemResult {
  const norm = normalizeCode(code);
  if (norm.length < 4 || norm.length > 32) return { ok: false, error: "Mã không hợp lệ" };
  const h = hashGiftCode(norm);
  if (save.redeemedCodes.includes(h)) return { ok: false, error: "Bạn đã dùng mã này rồi" };
  const char = catalog.characters.find((c) => c.unlock.kind === "code" && c.unlock.codeHash === h);
  const rod = char ? undefined : catalog.rods.find((r) => r.unlock.kind === "code" && r.unlock.codeHash === h);
  if (!char && !rod) return { ok: false, error: "Mã không đúng hoặc đã hết hạn" };
  const s = clone(save);
  s.redeemedCodes.push(h);
  if (char && !s.characters[char.id]) s.characters[char.id] = newCharProgress();
  if (rod && !s.rods[rod.id]) s.rods[rod.id] = newRodProgress();
  addLedger(s, `gift_${h.slice(0, 16)}`, "diamonds", 0, `gift_code:${(char ?? rod)!.id}`, now);
  s.updatedAt = now;
  return { ok: true, save: s, character: char, rod };
}
