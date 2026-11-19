/**
 * Rác dưới nước & tái chế (thuần túy, có test).
 */
import type { FishDef, JunkDef } from "./types.ts";
import type { Rng } from "./rng.ts";
import { addLedger, clone, grantXp, markTx, type ActionResult, type PlayerSave } from "./save.ts";

/** Có vớt phải rác không – nếu có trả về loại rác (chọn theo trọng số). */
export function rollJunk(rng: Rng, junk: JunkDef[], chance: number): JunkDef | null {
  if (!junk.length || !rng.chance(chance)) return null;
  return rng.pickWeighted(junk, (j) => j.weight);
}

/** Biến rác thành "con mồi" để dùng chung cơ chế kéo dây: nhẹ, không vùng vẫy mạnh. */
export function junkAsFish(j: JunkDef): FishDef {
  return {
    id: j.id,
    name: j.name,
    rarity: "common",
    element: "water",
    hp: 30,
    atk: 0,
    def: 0,
    spd: 1,
    skill: { id: "none", name: "", description: "" },
    value: 0,
    xp: 3,
    weightKg: [0.05, 0.5],
    zones: [],
    appearance: {
      shape: "round",
      body: j.color,
      belly: j.color,
      fin: j.color,
      pattern: "none",
      patternColor: "#0000",
      teeth: false,
      horns: false,
      spikes: false,
      eye: "normal",
      eyeColor: "#000",
      glow: null,
      scale: 0.7,
    },
    description: "",
  };
}

export const JUNK_XP = 3;

export function applyJunkCatch(save: PlayerSave, junk: JunkDef, txId: string, now: number): ActionResult {
  if (save.appliedTx.includes(txId)) return { ok: false, error: "Giao dịch trùng lặp" };
  const s = clone(save);
  s.eco.junk[junk.id] = (s.eco.junk[junk.id] ?? 0) + 1;
  s.stats.junkCaught = (s.stats.junkCaught ?? 0) + 1;
  grantXp(s, JUNK_XP);
  addLedger(s, txId, "xp", JUNK_XP, `junk:${junk.id}`, now);
  markTx(s, txId);
  s.updatedAt = now;
  return { ok: true, save: s };
}

export function junkCount(save: PlayerSave): number {
  return Object.values(save.eco.junk).reduce((a, b) => a + b, 0);
}

export function recyclePreview(save: PlayerSave, junkById: Map<string, JunkDef>): number {
  return Object.entries(save.eco.junk).reduce((s, [id, n]) => s + (junkById.get(id)?.ecoPoints ?? 0) * n, 0);
}

/** Tái chế toàn bộ rác đang giữ thành Điểm Môi Trường. */
export function recycleAll(save: PlayerSave, junkById: Map<string, JunkDef>, txId: string, now: number): ActionResult & { points?: number; items?: number } {
  if (save.appliedTx.includes(txId)) return { ok: false, error: "Giao dịch trùng lặp" };
  const items = junkCount(save);
  if (!items) return { ok: false, error: "Chưa có rác để tái chế – câu thêm nhé!" };
  const points = recyclePreview(save, junkById);
  const s = clone(save);
  s.eco.points += points;
  s.eco.recycled += items;
  s.eco.junk = {};
  addLedger(s, txId, "eco", points, `recycle:${items}`, now);
  markTx(s, txId);
  s.updatedAt = now;
  return { ok: true, save: s, points, items };
}
