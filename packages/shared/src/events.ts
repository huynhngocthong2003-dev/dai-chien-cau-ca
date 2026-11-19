import type { GameEventDef } from "./types.ts";
import { addLedger, clone, markTx, type ActionResult, type PlayerSave } from "./save.ts";

/** Nhận quà sự kiện – mỗi tài khoản một lần, có ghi sổ. */
export function claimEvent(save: PlayerSave, ev: GameEventDef, txId: string, now: number): ActionResult {
  if (save.claimedEvents.includes(ev.id)) return { ok: false, error: "Bạn đã nhận quà sự kiện này rồi" };
  if (save.appliedTx.includes(txId)) return { ok: false, error: "Giao dịch trùng lặp" };
  const s = clone(save);
  const why = `event:${ev.id}`;
  const r = ev.reward;
  if (r.diamonds) {
    s.diamonds += r.diamonds;
    addLedger(s, txId, "diamonds", r.diamonds, why, now);
  }
  if (r.gold) {
    s.gold += r.gold;
    addLedger(s, txId, "gold", r.gold, why, now);
  }
  if (r.stones) {
    s.materials.stones += r.stones;
    addLedger(s, txId, "stones", r.stones, why, now);
  }
  if (r.bossTickets) {
    s.materials.bossTickets += r.bossTickets;
    addLedger(s, txId, "bossTickets", r.bossTickets, why, now);
  }
  s.claimedEvents.push(ev.id);
  markTx(s, txId);
  s.updatedAt = now;
  return { ok: true, save: s };
}
