/**
 * Dựng đội cho trận 3vs3 từ bản lưu (máy chủ & game dùng chung):
 * kiểm tra quyền sở hữu, đủ 3 cá, không trùng; đội máy luyện tập có lực chiến tương đương.
 */
import type { FishDef, FishFormDef, ZoneDef } from "./types.ts";
import type { PlayerSave } from "./save.ts";
import { Rng } from "./rng.ts";
import { ownedElement } from "./elements.ts";
import { aiTeam, type Difficulty } from "./deathmatch.ts";
import { makeFighter } from "./battle.ts";
import { makeCombatFish, type AiLevel, type CombatFish } from "./combat.ts";

export function buildPlayerTeam(
  save: PlayerSave,
  uids: unknown,
  fishById: Map<string, FishDef>,
  formById: Map<string, FishFormDef>,
  zoneById: Map<string, Pick<ZoneDef, "element">>,
): { team: CombatFish[] } | { error: string } {
  if (!Array.isArray(uids) || uids.length !== 3 || !uids.every((u) => typeof u === "string")) return { error: "Hãy chọn đúng 3 con cá" };
  if (new Set(uids).size !== 3) return { error: "Mỗi con cá chỉ được xuất hiện 1 lần trong đội hình" };
  const team: CombatFish[] = [];
  for (const uid of uids as string[]) {
    const o = save.fishes.find((f) => f.uid === uid);
    if (!o) return { error: "Có cá không thuộc quyền sở hữu của bạn" };
    const def = fishById.get(o.fishId);
    if (!def) return { error: "Dữ liệu cá không hợp lệ" };
    team.push(
      makeCombatFish({
        def,
        uid: o.uid,
        level: o.level,
        stars: o.stars,
        element: ownedElement(o, def, zoneById),
        form: o.form ? formById.get(o.form) ?? null : null,
        formRoll: o.formRoll ?? null,
      }),
    );
  }
  return { team };
}

const LEVEL_TO_DIFF: Record<AiLevel, Difficulty> = { easy: "easy", normal: "normal", hard: "hard", boss: "hard" };

/** Đội máy luyện tập: loài trong các khu đã mở, lực chiến quanh mức đội người chơi (theo độ khó). */
export function practiceOpponent(
  seed: number,
  playerTeam: CombatFish[],
  pool: FishDef[],
  level: AiLevel,
  fishById: Map<string, FishDef>,
): CombatFish[] {
  const rng = new Rng(seed ^ 0x5bd1e995);
  const avgPower = playerTeam.reduce((a, f) => {
    const def = fishById.get(f.fishId)!;
    return a + makeFighter(def, { uid: f.uid, level: f.level, stars: f.stars }).power;
  }, 0) / playerTeam.length;
  return aiTeam(rng, pool, avgPower, LEVEL_TO_DIFF[level]).map((fi, i) => {
    const def = fishById.get(fi.fishId)!;
    return makeCombatFish({ def, uid: `ai_${i}`, level: fi.level, stars: fi.stars, element: def.element });
  });
}
