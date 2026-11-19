import { describe, expect, it } from "vitest";
import {
  Rng,
  applyJunkCatch,
  bossChance,
  buildLoadout,
  buyCosmetic,
  createNewSave,
  junkAsFish,
  junkCount,
  luckFactor,
  recycleAll,
  rollJunk,
  spawnWeights,
  FishingSession,
  type PlayerSave,
} from "@dccc/shared";
import { RARITY_ORDER, FISHING } from "@dccc/game-config";
import { CATALOG, CHARACTER_BY_ID, COSMETICS, FISH_BY_ID, JUNK, JUNK_BY_ID, ROD_BY_ID, ZONES } from "@dccc/game-data";
import { parseSave } from "@dccc/validation";

const starter = () => buildLoadout(CHARACTER_BY_ID.get("c_be_tom")!, 1, ROD_BY_ID.get("r_tre")!, 1);

describe("Tỉ lệ ra cá hợp lý ở mọi khu", () => {
  for (const z of ZONES) {
    it(`${z.id}: hiếm hơn thì ít gặp hơn; Sử Thi dễ gặp hơn Boss`, () => {
      const lf = luckFactor(starter(), 0.5);
      const w = spawnWeights(z, FISH_BY_ID, lf);
      const tot = w.reduce((s, x) => s + x.weight, 0);
      const boss = bossChance(lf);
      const share: Record<string, number> = {};
      for (const x of w) share[x.fish.rarity] = (share[x.fish.rarity] ?? 0) + (x.weight / tot) * (1 - boss);
      const seq = RARITY_ORDER.filter((r) => r !== "boss" && share[r] !== undefined).map((r) => share[r]!);
      for (let i = 1; i < seq.length; i++) expect(seq[i]!, `${z.id} bậc ${i}`).toBeLessThan(seq[i - 1]!);
      if (share.epic !== undefined) {
        expect(share.epic).toBeGreaterThan(boss);
        expect(share.epic).toBeGreaterThanOrEqual(0.025);
      }
    });
  }
});

describe("Rác & tái chế", () => {
  it("đủ chai nhựa, dép, bọc nilông", () => {
    const kinds = new Set(JUNK.map((j) => j.kind));
    for (const k of ["bottle", "sandal", "bag"] as const) expect(kinds.has(k)).toBe(true);
  });

  it("tỉ lệ vớt rác xấp xỉ cấu hình", () => {
    const rng = new Rng(9);
    let n = 0;
    for (let i = 0; i < 10000; i++) if (rollJunk(rng, JUNK, FISHING.junkChance)) n++;
    expect(n / 10000).toBeGreaterThan(FISHING.junkChance * 0.85);
    expect(n / 10000).toBeLessThan(FISHING.junkChance * 1.15);
  });

  it("rác kéo lên dễ dàng bằng đồ khởi đầu", () => {
    const s = new FishingSession({ fish: junkAsFish(JUNK[0]!), loadout: starter(), seed: 4 });
    while (s.phase === "waiting") s.update(50);
    s.hook();
    s.setReeling(true);
    for (let i = 0; i < 400 && !s.isOver; i++) s.update(50);
    expect(s.phase).toBe("caught");
  });

  it("vớt rác → tái chế ra điểm → đổi bộ đồ xanh", () => {
    let s: PlayerSave = createNewSave("p_eco", "Xanh", CATALOG, Date.now());
    let i = 0;
    for (const j of Array.from({ length: 8 }, () => JUNK).flat()) {
      const r = applyJunkCatch(s, j, `j_${i++}`, Date.now());
      if (!r.ok) throw new Error(r.error);
      s = r.save;
    }
    expect(junkCount(s)).toBe(JUNK.length * 8);
    const rr = recycleAll(s, JUNK_BY_ID, "rec_1", Date.now());
    if (!rr.ok) throw new Error(rr.error);
    const expected = JUNK.reduce((a, j) => a + j.ecoPoints, 0) * 8;
    expect(rr.points).toBe(expected);
    expect(rr.save.eco.points).toBe(expected);
    expect(junkCount(rr.save)).toBe(0);
    expect(rr.save.ledger.some((l) => l.currency === "eco" && l.amount === expected)).toBe(true);
    expect(recycleAll(rr.save, JUNK_BY_ID, "rec_2", Date.now()).ok).toBe(false); // hết rác
    // mua bộ xanh
    const set = COSMETICS.filter((c) => c.price.currency === "eco");
    expect(set.length).toBeGreaterThanOrEqual(3);
    let s2 = rr.save;
    for (const c of set) {
      const b = buyCosmetic(s2, c, `buy_${c.id}`, Date.now());
      if (!b.ok) throw new Error(`${c.id}: ${b.error}`);
      s2 = b.save;
    }
    expect(s2.eco.points).toBe(expected - set.reduce((a, c) => a + c.price.amount, 0));
    expect(parseSave(JSON.parse(JSON.stringify(s2))).ok).toBe(true);
  });

  it("bộ đồ môi trường màu xanh lá, không mua được bằng vàng/kim cương", () => {
    const set = COSMETICS.filter((c) => c.price.currency === "eco");
    const hue = (hex: string) => {
      const n = parseInt(hex.slice(1, 7), 16);
      const [r, g, b] = [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      if (mx === mn) return -1;
      const d = mx - mn;
      const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return (h * 60 + 360) % 360;
    };
    for (const c of set) {
      const h = hue(c.visual.color);
      expect(h, `${c.id} ${c.visual.color}`).toBeGreaterThan(80);
      expect(h, `${c.id} ${c.visual.color}`).toBeLessThan(170);
    }
    const s = { ...createNewSave("p", "A", CATALOG, Date.now()), gold: 1e9, diamonds: 1e9 };
    expect(buyCosmetic(s, set[0]!, "x", Date.now()).ok).toBe(false);
  });
});

describe("Sự kiện Tân Thủ", () => {
  it("nhận 500 kim cương đúng một lần, ghi sổ, qua schema", async () => {
    const { claimEvent } = await import("@dccc/shared");
    const { EVENTS } = await import("@dccc/game-data");
    const ev = EVENTS.find((e) => e.id === "ev_tan_thu")!;
    const s0 = createNewSave("p_new", "Mới", CATALOG, Date.now());
    const r = claimEvent(s0, ev, "ev1", Date.now());
    if (!r.ok) throw new Error(r.error);
    expect(r.save.diamonds).toBe(s0.diamonds + 500);
    expect(r.save.ledger.some((l) => l.currency === "diamonds" && l.amount === 500 && l.reason === "event:ev_tan_thu")).toBe(true);
    expect(claimEvent(r.save, ev, "ev2", Date.now()).ok).toBe(false);
    expect(parseSave(JSON.parse(JSON.stringify(r.save))).ok).toBe(true);
  });
});
