// Chạy thử cơ chế trận trong môi trường Deno (giống Edge Function) – không cần mạng.
// deno run --config supabase/functions/death-match/deno.json supabase/functions/death-match/smoke_test.ts
import { createNewSave, resolvePvp, type OwnedFish } from "@dccc/shared";
import { CATALOG, FISH_BY_ID, FORM_BY_ID } from "@dccc/game-data";
import { parseSave } from "@dccc/validation";

const fish = (uid: string, fishId: string, level: number): OwnedFish => ({
  uid, fishId, weightKg: 1, zoneId: "z_ben_tan_thu", caughtAt: Date.now(), level, stars: 1, locked: false,
});
const a = { ...createNewSave("p_a", "An", CATALOG, Date.now()), fishes: [fish("a1", "f_boss_lao_ngu", 12), fish("a2", "f_ca_loc", 8), fish("a3", "f_ca_chep_rong", 9)] };
const b = { ...createNewSave("p_b", "Bình", CATALOG, Date.now()), fishes: [fish("b1", "f_ca_ro", 3), fish("b2", "f_ca_hu", 2), fish("b3", "f_ca_tre", 4)] };
const pa = parseSave(JSON.parse(JSON.stringify(a)));
const pb = parseSave(JSON.parse(JSON.stringify(b)));
if (!pa.ok || !pb.ok) throw new Error("schema");
const r = resolvePvp(pa.save, ["a1", "a2", "a3"], pb.save, 12345, FISH_BY_ID, FORM_BY_ID);
if ("error" in r) throw new Error(r.error);
console.log(JSON.stringify({ score: r.result.score, winner: r.result.winner, lost: r.forDefender.lostUid, roasted: r.forChallenger.roasted }));
