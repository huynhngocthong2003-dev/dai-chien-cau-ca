import type { CharRarity, RodDef } from "./types.ts";
import { addLedger, clone, markTx, type ActionResult, type PlayerSave, type RodProgress } from "./save.ts";

/**
 * Độ bền cần câu: mỗi cần có số LƯỢT CÂU tối đa (theo độ hiếm, sao, cấp).
 * Mỗi lần quăng tốn 1 lượt (đứt dây tốn thêm). Hết lượt phải SỬA CẦN bằng vàng.
 */
const BASE_USES: Record<CharRarity, number> = { N: 60, R: 80, SR: 100, SSR: 130, UR: 170, LR: 220 };
const REPAIR_FULL: Record<CharRarity, number> = { N: 150, R: 400, SR: 900, SSR: 2000, UR: 4500, LR: 9000 };
/** Lượt tốn thêm khi đứt dây. */
export const SNAP_EXTRA_WEAR = 2;

export function rodMaxUses(rod: Pick<RodDef, "rarity">, prog: Pick<RodProgress, "level" | "stars">): number {
  return BASE_USES[rod.rarity] + (prog.stars - 1) * 15 + Math.floor(prog.level / 5) * 5;
}

export function rodUsesLeft(rod: Pick<RodDef, "rarity">, prog: RodProgress): number {
  return Math.max(0, rodMaxUses(rod, prog) - (prog.wear ?? 0));
}

/** Giá sửa: tỷ lệ với độ hao mòn (cần càng xịn càng đắt), tối thiểu 20 vàng khi có hao mòn. */
export function rodRepairCost(rod: Pick<RodDef, "rarity">, prog: RodProgress): number {
  const wear = Math.min(prog.wear ?? 0, rodMaxUses(rod, prog));
  if (wear <= 0) return 0;
  return Math.max(20, Math.round((REPAIR_FULL[rod.rarity] * wear) / rodMaxUses(rod, prog)));
}

/** Dùng lượt câu (mỗi lần quăng). Hết lượt → từ chối, phải sửa cần. */
export function applyRodWear(save: PlayerSave, rod: RodDef, amount: number, now: number): ActionResult {
  const prog = save.rods[rod.id];
  if (!prog) return { ok: false, error: "Chưa sở hữu cần này" };
  if (rodUsesLeft(rod, prog) <= 0) return { ok: false, error: `${rod.name} đã hết lượt câu – hãy sửa cần` };
  const s = clone(save);
  const p = s.rods[rod.id]!;
  p.wear = Math.min(rodMaxUses(rod, p), (p.wear ?? 0) + Math.max(1, Math.round(amount)));
  s.updatedAt = now;
  return { ok: true, save: s };
}

/** Sửa cần: trả vàng (ghi sổ cái), hồi đầy lượt câu. */
export function applyRodRepair(save: PlayerSave, rod: RodDef, txId: string, now: number): ActionResult & { cost?: number } {
  if (save.appliedTx.includes(txId)) return { ok: false, error: "Đã sửa rồi" };
  const prog = save.rods[rod.id];
  if (!prog) return { ok: false, error: "Chưa sở hữu cần này" };
  const cost = rodRepairCost(rod, prog);
  if (cost <= 0) return { ok: false, error: "Cần còn mới, chưa cần sửa" };
  if (save.gold < cost) return { ok: false, error: `Cần ${cost.toLocaleString("vi-VN")} vàng để sửa` };
  const s = clone(save);
  s.gold -= cost;
  s.rods[rod.id]!.wear = 0;
  addLedger(s, txId, "gold", -cost, `rod_repair:${rod.id}`, now);
  markTx(s, txId);
  s.updatedAt = now;
  return { ok: true, save: s, cost };
}
