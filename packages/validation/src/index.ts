import { z } from "zod";
import { SAVE_VERSION, migrateSave, type PlayerSave } from "@dccc/shared";

const id = z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/);
const nonNegInt = z.number().int().min(0).max(1e12);
/** Mốc thời gian (ms kể từ 1970) – hiện tại ~1,8×10¹², cho phép tới năm ~5000. */
const timestamp = z.number().int().min(0).max(1e14);

export const ownedFishSchema = z.object({
  uid: id,
  fishId: id,
  weightKg: z.number().min(0).max(1e6),
  zoneId: id,
  caughtAt: timestamp,
  level: z.number().int().min(1).max(200),
  stars: z.number().int().min(1).max(5),
  locked: z.boolean(),
  wins: nonNegInt.optional(),
  losses: nonNegInt.optional(),
  form: id.optional(),
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
    z.object({
      level: z.number().int().min(1).max(60),
      breakthrough: z.number().int().min(0).max(5),
      awakened: z.boolean(),
      xp: nonNegInt.optional(),
      equip: z.object({ hat: id.optional(), outfit: id.optional(), accessory: id.optional(), wings: id.optional(), horns: id.optional() }),
    }),
  ),
  rods: z.record(id, z.object({ level: z.number().int().min(1).max(50), stars: z.number().int().min(1).max(5) })),
  materials: z.object({ stones: nonNegInt, soul: nonNegInt, bossTickets: z.number().int().min(0).max(99) }),
  bossTicketDay: z.string().max(10),
  wardrobe: z.record(id, z.number().int().min(1).max(99)),
  redeemedCodes: z.array(z.string().regex(/^[0-9a-f]{20,32}$/)).max(200),
  claimedEvents: z.array(id).max(500),
  roasted: z.array(z.object({ id, fishId: id, level: z.number().int().min(1).max(200), stars: z.number().int().min(1).max(5) })).max(200),
  showcase: z.array(id).max(3),
  evoItems: z.record(id, z.number().int().min(1).max(9999)),
  defense: z.array(id).max(3),
  pvpApplied: z.array(z.string().uuid()).max(500),
  eco: z.object({ points: nonNegInt, junk: z.record(id, z.number().int().min(1).max(100000)), recycled: nonNegInt }),
  fishes: z.array(ownedFishSchema).max(1000),
  stats: z.object({
    totalCaught: nonNegInt,
    bossesCaught: nonNegInt,
    escaped: nonNegInt,
    snapped: nonNegInt,
    heaviestKg: z.number().min(0),
    species: z.record(id, nonNegInt),
    dmWins: nonNegInt.optional(),
    dmLosses: nonNegInt.optional(),
    junkCaught: nonNegInt.optional(),
    roastedEaten: nonNegInt.optional(),
    spins: nonNegInt.optional(),
  }),
  daily: z.object({
    day: z.string().max(10),
    base: z.record(z.string().max(24), z.number().min(0)),
    claimed: z.array(id).max(50),
    freeSpinUsed: z.boolean(),
  }),
  checkin: z.object({ lastDay: z.string().max(10), streak: z.number().int().min(0).max(100000), total: nonNegInt }),
  titles: z.object({ owned: z.array(id).max(200), equipped: id.nullable() }),
  ledger: z.array(
    z.object({
      txId: id,
      currency: z.enum(["gold", "diamonds", "xp", "stones", "soul", "bossTickets", "eco"]),
      amount: z.number().int(),
      reason: z.string().max(128),
      at: timestamp,
    }),
  ),
  appliedTx: z.array(id),
  createdAt: timestamp,
  updatedAt: timestamp,
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
