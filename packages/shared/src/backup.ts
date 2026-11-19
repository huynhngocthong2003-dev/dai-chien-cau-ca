/**
 * Mã sao lưu tiến trình: chép sang thiết bị khác bằng một đoạn văn bản.
 * Định dạng: DCCC1.<tổng kiểm tra>.<dữ liệu gzip, base64url>
 * Tổng kiểm tra phát hiện mã bị chép thiếu hoặc bị sửa tay. Đây KHÔNG phải bảo mật
 * mật mã; dữ liệu khôi phục vẫn luôn được kiểm tra bằng schema trước khi dùng.
 */
import { hash53x2 } from "./giftcode.ts";

export const BACKUP_PREFIX = "DCCC1";
const SIGN_SALT = "dccc:backup:v1:";

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pipe(data: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const res = new Response(new Blob([data as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await res.arrayBuffer());
}

export async function encodeBackup(data: unknown): Promise<string> {
  const json = JSON.stringify(data);
  const packed = await pipe(new TextEncoder().encode(json), new CompressionStream("gzip"));
  const payload = toBase64Url(packed);
  return `${BACKUP_PREFIX}.${hash53x2(SIGN_SALT + payload)}.${payload}`;
}

export type DecodeResult = { ok: true; data: unknown } | { ok: false; error: string };

export async function decodeBackup(code: string): Promise<DecodeResult> {
  const clean = code.replace(/\s+/g, "");
  const parts = clean.split(".");
  if (parts.length !== 3 || parts[0] !== BACKUP_PREFIX) return { ok: false, error: "Không phải mã sao lưu của Đại Chiến Câu Cá" };
  const [, sum, payload] = parts as [string, string, string];
  if (hash53x2(SIGN_SALT + payload) !== sum) return { ok: false, error: "Mã sao lưu bị thiếu hoặc đã bị sửa. Hãy chép lại toàn bộ mã." };
  try {
    const raw = await pipe(fromBase64Url(payload), new DecompressionStream("gzip"));
    return { ok: true, data: JSON.parse(new TextDecoder().decode(raw)) as unknown };
  } catch {
    return { ok: false, error: "Không giải mã được dữ liệu sao lưu" };
  }
}
