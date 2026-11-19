import { z } from "zod";
import { SAVE_VERSION, migrateSave, type PlayerSave } from "@dccc/shared";

const id = z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/);
const nonNegInt = z.number().int().min(0).max(1e12);

export const ownedFishSchema = z.object({
  uid: id,
  fishId: id,
  weightKg: z.number().min(0).max(1e6),
  zoneId: id,
  caughtAt: nonNegInt,
  level: z.number().int().min(1).max(200),
  stars: z.number().int().min(1).max(5),
  locked: z.boolean(),
});

export const playerSaveSchema = z.object({
  version: z.literal(SAVE_VERSION),
  playerId: id,
  name: z.string().min(1).max(24),
  level: z.number().int().min(1).max(200),
  xp: nonNegInt,
  gold: nonNegInt,
  diamonds: nonNegInt,
  selectedCharacterId: id,
  selectedRodId: id,
  selectedZoneId: id,
  characters: z.record(
    id,
    z.object({ level: z.number().int().min(1).max(60), breakthrough: z.number().int().min(0).max(5), awakened: z.boolean() }),
  ),
  rods: z.record(id, z.object({ level: z.number().int().min(1).max(50), stars: z.number().int().min(1).max(5) })),
  materials: z.object({ stones: nonNegInt, soul: nonNegInt, bossTickets: z.number().int().min(0).max(99) }),
  bossTicketDay: z.string().max(10),
  fishes: z.array(ownedFishSchema).max(1000),
  stats: z.object({
    totalCaught: nonNegInt,
    bossesCaught: nonNegInt,
    escaped: nonNegInt,
    snapped: nonNegInt,
    heaviestKg: z.number().min(0),
    species: z.record(id, nonNegInt),
  }),
  ledger: z.array(
    z.object({
      txId: id,
      currency: z.enum(["gold", "diamonds", "xp", "stones", "soul", "bossTickets"]),
      amount: z.number().int(),
      reason: z.string().max(128),
      at: nonNegInt,
    }),
  ),
  appliedTx: z.array(id),
  createdAt: nonNegInt,
  updatedAt: nonNegInt,
});

export function parseSave(raw: unknown): { ok: true; save: PlayerSave } | { ok: false; error: string } {
  const r = playerSaveSchema.safeParse(migrateSave(raw));
  if (!r.success) return { ok: false, error: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  return { ok: true, save: r.data as PlayerSave };
}

/** Tên người chơi: 2–16 ký tự, chữ (kể cả tiếng Việt), số, khoảng trắng, gạch dưới. */
export const playerNameSchema = z
  .string()
  .trim()
  .min(2)
  .max(16)
  .regex(/^[\p{L}\p{N} _]+$/u);
