/** Tiện ích màu sắc cho phần vẽ thủ tục. */
export function parseHex(hex: string): [number, number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
}

export function rgba(hex: string, alphaMul = 1): string {
  const [r, g, b, a] = parseHex(hex);
  return `rgba(${r},${g},${b},${(a * alphaMul).toFixed(3)})`;
}

export function shade(hex: string, amt: number): string {
  const [r, g, b, a] = parseHex(hex);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)));
  return `rgba(${f(r)},${f(g)},${f(b)},${a.toFixed(3)})`;
}

export function hexToInt(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return (r << 16) | (g << 8) | b;
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export const OUTLINE = "#1b1530";
