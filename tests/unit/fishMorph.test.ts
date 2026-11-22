import { describe, expect, it } from "vitest";
import { FISHES } from "@dccc/game-data";
import { fishMorph, morphSignature } from "../../apps/game-client/src/art/fishMorph.ts";

describe("Hình dáng cá (vẽ vector chibi)", () => {
  it("mỗi loài một dáng – không trùng", () => {
    const seen = new Map<string, string>();
    const dup: string[] = [];
    for (const f of FISHES) {
      const sig = morphSignature(fishMorph(f.id, f.appearance));
      const other = seen.get(sig);
      if (other) dup.push(`${f.id} trùng ${other}`);
      seen.set(sig, f.id);
    }
    expect(dup).toEqual([]);
  });
  it("tất định: cùng loài luôn ra cùng dáng", () => {
    const f = FISHES[0]!;
    expect(fishMorph(f.id, f.appearance)).toEqual(fishMorph(f.id, f.appearance));
  });
});

import { parseHex, shade } from "../../apps/game-client/src/art/color.ts";
describe("Màu", () => {
  it("đọc được cả màu rgba() do shade() trả về", () => {
    expect(parseHex("#ff0000")).toEqual([255, 0, 0, 1]);
    expect(parseHex(shade("#808080", 0))).toEqual([128, 128, 128, 1]);
    expect(parseHex("rgba(10, 20, 30, 0.5)")).toEqual([10, 20, 30, 0.5]);
  });
});
