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
