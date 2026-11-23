import { z } from "zod";
import { SAVE_VERSION, migrateSave, type PlayerSave } from "@dccc/shared";

const id = z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/);
const nonNegInt = z.number().int().min(0).max(1e12);
/** Mốc thời gian (ms kể từ 1970) – hiện tại ~1,8×10¹², cho phép tới năm ~5000. */
const timestamp = z.number().int().min(0).max(1e14);

export const ownedFishSchema = z.object({
  uid: id,
  fishId: id,
  element: z.enum(["metal", "wood", "water", "fire", "earth", "dark", "light"]).optional(),
  elements: z.array(z.enum(["metal", "wood", "water", "fire", "earth", "dark", "light"])).min(1).max(2).optional(),
  hiddenElement: z.enum(["metal", "wood", "water", "fire", "earth", "dark", "light"]).optional(),
  weightKg: z.number().min(0).max(1e6),
  zoneId: id,
  caughtAt: timestamp,
  level: z.number().int().min(1).max(200),
  stars: z.number().int().min(1).max(5),
  locked: z.boolean(),
  wins: nonNegInt.optional(),
  losses: nonNegInt.optional(),
  form: id.optional(),
  formRoll: z.object({ hp: z.number().min(0).max(5), atk: z.number().min(0).max(5), def: z.number().min(0).max(5) }).optional(),
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
      equip: z.object({ hat: id.optional(), outfit: id.optional(), accessory: id.optional(), wings: id.optional(), horns: id.optional(), skin: id.optional() }),
    }),
  ),
  rods: z.record(id, z.object({ level: z.number().int().min(1).max(50), stars: z.number().int().min(1).max(5), wear: z.number().int().min(0).max(100000).optional() })),
  materials: z.object({ stones: nonNegInt, soul: nonNegInt, bossTickets: z.number().int().min(0).max(99) }),
  bossTicketDay: z.string().max(10),
  wardrobe: z.record(id, z.number().int().min(1).max(99)),
  redeemedCodes: z.array(z.string().regex(/^[0-9a-f]{20,32}$/)).max(200),
  claimedEvents: z.array(id).max(500),
  roasted: z.array(z.object({ id, fishId: id, level: z.number().int().min(1).max(200), stars: z.number().int().min(1).max(5) })).max(2000),
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
    races: nonNegInt.optional(),
    raceWins: nonNegInt.optional(),
  }),
  daily: z.object({
    day: z.string().max(10),
    base: z.record(z.string().max(24), z.number().min(0)),
    claimed: z.array(id).max(50),
    freeSpinUsed: z.boolean(),
  }),
  checkin: z.object({ lastDay: z.string().max(10), streak: z.number().int().min(0).max(100000), total: nonNegInt }),
  titles: z.object({ owned: z.array(id).max(200), equipped: id.nullable() }),
  autoFishUntil: z.number().int().min(0).max(1e14),
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
  resetAt: timestamp.optional(),
  breeding: z
    .object({
      slots: z
        .array(
          z.object({
            open: z.boolean(),
            egg: z
              .object({
                id,
                recipeId: id,
                parents: z.tuple([id, id]),
                colors: z.object({ a: z.string().regex(/^#[0-9a-fA-F]{6}$/), b: z.string().regex(/^#[0-9a-fA-F]{6}$/), spot: z.string().regex(/^#[0-9a-fA-F]{6}$/) }).optional(),
                start: timestamp,
                end: timestamp,
                seed: z.number().int().min(0).max(4294967295),
              })
              .nullable(),
          }),
        )
        .max(3),
      harvestAt: z.record(id, timestamp),
    })
    .optional(),
});

/**
 * Gọt các danh sách / số đếm vượt giới hạn về trong giới hạn TRƯỚC khi kiểm tra,
 * để một chỉ số "quá nhiều" (vd tích hơn 200 cá nướng) không làm cả bản lưu bị coi là hỏng.
 */
export function sanitizeSave(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const s = raw as Record<string, unknown>;
  const tail = (k: string, n: number) => {
    if (Array.isArray(s[k]) && (s[k] as unknown[]).length > n) s[k] = (s[k] as unknown[]).slice(-n);
  };
  tail("roasted", 2000);
  tail("redeemedCodes", 200);
  tail("claimedEvents", 500);
  tail("pvpApplied", 500);
  tail("appliedTx", 500);
  tail("ledger", 200);
  tail("showcase", 3);
  tail("defense", 3);
  const mats = s.materials as Record<string, unknown> | undefined;
  if (mats && typeof mats.bossTickets === "number" && mats.bossTickets > 99) mats.bossTickets = 99;
  const wardrobe = s.wardrobe as Record<string, unknown> | undefined;
  if (wardrobe && typeof wardrobe === "object") for (const k of Object.keys(wardrobe)) if (typeof wardrobe[k] === "number" && (wardrobe[k] as number) > 99) wardrobe[k] = 99;
  const titles = s.titles as Record<string, unknown> | undefined;
  if (titles && Array.isArray(titles.owned) && titles.owned.length > 200) titles.owned = titles.owned.slice(0, 200);
  const evo = s.evoItems as Record<string, unknown> | undefined;
  if (evo && typeof evo === "object") for (const k of Object.keys(evo)) if (typeof evo[k] === "number" && (evo[k] as number) > 9999) evo[k] = 9999;
  return s;
}

export function parseSave(raw: unknown): { ok: true; save: PlayerSave } | { ok: false; error: string } {
  const r = playerSaveSchema.safeParse(sanitizeSave(migrateSave(raw)));
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
