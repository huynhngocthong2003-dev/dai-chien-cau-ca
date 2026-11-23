/**
 * ĐẢO LAI TẠO: bể nuôi thả cá Boss, lai 2 cá Boss → trứng → ấp (đếm ngược) → nở ra cá lai.
 * Toàn bộ là hàm thuần (chạy được cả game và máy chủ). Mọi thay đổi tiền tệ ghi sổ bằng txId.
 * Kết quả nở được quyết định bởi `seed` lưu lúc đặt trứng → tải lại trang không "quay lại" được.
 */
import type { Element, FishDef } from "./types.ts";
import { ELEMENT_IDS } from "./elements.ts";
import { addLedger, clone, markTx, type OwnedFish, type PlayerSave } from "./save.ts";
import { Rng } from "./rng.ts";

/** Bậc của cá trong Đảo Lai Tạo (độ hiếm lai). */
export type BreedTier = "boss" | "hybrid" | "super" | "mythic" | "recessive";

export interface BreedTierInfo {
  name: string;
  color: string;
  /** Hệ số kích thước khi bơi trong bể. */
  scale: number;
  /** Vàng thu hoạch mỗi chu kỳ. */
  yieldGold: number;
}

export const BREED_TIERS: Record<BreedTier, BreedTierInfo> = {
  boss: { name: "Boss", color: "#e53935", scale: 1.0, yieldGold: 40 },
  hybrid: { name: "Boss Lai", color: "#43a047", scale: 1.0, yieldGold: 60 },
  super: { name: "Siêu Boss", color: "#1e88e5", scale: 1.15, yieldGold: 100 },
  mythic: { name: "Đột Biến · Mythic", color: "#fb8c00", scale: 1.3, yieldGold: 180 },
  recessive: { name: "Gen Lặn Cổ Đại", color: "#8e24aa", scale: 1.4, yieldGold: 300 },
};

/** Hình vẽ thủ tục của cá lai (xem apps/game-client/src/art/BreedArt.ts). */
export interface BreedLook {
  shape: "fish" | "kraken";
  body: string;
  dark: string;
  belly: string;
  fin: string;
  eye: string;
  eyeGlow?: boolean;
  horn?: "short" | "curved" | "crown";
  back?: "coral" | "blades" | "crystal" | "flame";
  /** Màu gai/san hô trên lưng (mặc định theo kiểu). */
  backColor?: string;
  tent?: number;
  tentFire?: string;
  wings?: { a: string; b: string; crystal?: boolean };
  skin?: "scales" | "plates" | "gold" | "cracked";
  crack?: string;
  crack2?: string;
  aura?: string;
  ring?: boolean;
  plume?: boolean;
  whisk?: boolean;
}

export interface EggLook {
  name: string;
  a: string;
  b: string;
  spot: string;
}

export interface BreedRecipe {
  id: string;
  /** 2 loài bố mẹ cụ thể (công thức đặc biệt, ưu tiên). */
  parents?: [string, string];
  /** Tên dòng lai hiển thị (vd "Dòng Thiết – Thủy"). */
  title?: string;
  /** Hoặc: 2 HỆ của bố mẹ (công thức chung cho mọi cặp cá Boss có tổ hợp hệ này). */
  elements?: [Element, Element];
  egg: EggLook;
  hatchMinutes: number;
  /** Tổng pct = 100. */
  results: { fish: string; pct: number }[];
}

export interface EggState {
  id: string;
  recipeId: string;
  /** [uid cá BỐ ♂, uid cá MẸ ♀]. */
  parents: [string, string];
  /** Loài của [bố, mẹ] lúc đặt trứng (bố mẹ có bán đi vẫn vẽ được con). */
  parentSpecies?: [string, string];
  /** Màu trứng phối từ cá bố (nửa trên) và cá mẹ (nửa dưới). */
  colors?: { a: string; b: string; spot: string };
  start: number;
  end: number;
  seed: number;
}

export interface HatchSlot {
  open: boolean;
  egg: EggState | null;
}

export interface BreedingState {
  slots: HatchSlot[];
  /** uid cá → mốc được thu hoạch kế tiếp. */
  harvestAt: Record<string, number>;
}

export const HATCH_SLOTS = 3;
/** Giá mở ổ ấp (ổ 1 mở sẵn). */
export const SLOT_UNLOCK: ({ gold: number } | { diamonds: number } | null)[] = [null, { gold: 2000 }, { diamonds: 60 }];
/** Tăng tốc: 1 kim cương cho mỗi 3 phút còn lại (làm tròn lên, tối thiểu 1). */
export const SPEEDUP_MINUTES_PER_DIAMOND = 3;
/** Chu kỳ thu hoạch của cá trong bể. */
export const HARVEST_CYCLE_MS = 30 * 60_000;

/** Giới tính của cá: lưu sẵn thì dùng, không thì suy CỐ ĐỊNH theo uid (mỗi con luôn 1 giới tính). */
export function fishGender(o: { uid: string; gender?: "m" | "f" }): "m" | "f" {
  if (o.gender === "m" || o.gender === "f") return o.gender;
  let h = 2166136261;
  for (let i = 0; i < o.uid.length; i++) h = Math.imul(h ^ o.uid.charCodeAt(i), 16777619);
  return (h >>> 0) % 2 === 0 ? "m" : "f";
}

/** Cá được ở bể nuôi & được lai: từ Boss trở lên (Boss, Thần Thoại). */
export const isBreedable = (def: FishDef | undefined): boolean => !!def && (def.rarity === "boss" || def.rarity === "mythic");

export function breedingOf(save: PlayerSave): BreedingState {
  const b = save.breeding;
  const slots: HatchSlot[] = Array.from({ length: HATCH_SLOTS }, (_, i) => ({
    open: i === 0 || !!b?.slots[i]?.open,
    egg: b?.slots[i]?.egg ?? null,
  }));
  return { slots, harvestAt: { ...(b?.harvestAt ?? {}) } };
}

/**
 * Công thức cho 2 loài: công thức đặc biệt theo loài trước, không có thì theo tổ hợp hệ của 2 loài
 * (mọi cặp cá từ Boss trở lên đều lai được).
 */
export function recipeFor(a: string, b: string, recipes: readonly BreedRecipe[], fishById?: Map<string, FishDef>): BreedRecipe | null {
  const exact = recipes.find((r) => r.parents && ((r.parents[0] === a && r.parents[1] === b) || (r.parents[0] === b && r.parents[1] === a)));
  if (exact) return exact;
  const ea = fishById?.get(a)?.element;
  const eb = fishById?.get(b)?.element;
  if (!ea || !eb) return null;
  return recipes.find((r) => r.elements && ((r.elements[0] === ea && r.elements[1] === eb) || (r.elements[0] === eb && r.elements[1] === ea))) ?? null;
}

/** Quay kết quả nở theo tỷ lệ – tất định theo seed của quả trứng. */
export function rollHatch(recipe: BreedRecipe, seed: number): string {
  const r = new Rng(seed).next() * 100;
  let acc = 0;
  for (const x of recipe.results) {
    acc += x.pct;
    if (r < acc) return x.fish;
  }
  return recipe.results[recipe.results.length - 1]!.fish;
}

/** Màu trứng theo bố mẹ: nửa trên màu thân cá bố, nửa dưới màu thân cá mẹ, chấm màu vây/hào quang. */
export function eggColorsFor(father: FishDef | undefined, mother: FishDef | undefined, fallback: EggLook): { a: string; b: string; spot: string } {
  const hex = (c: string | null | undefined) => (c && /^#[0-9a-fA-F]{6}/.test(c) ? c.slice(0, 7) : null);
  return {
    a: hex(father?.appearance.body) ?? fallback.a,
    b: hex(mother?.appearance.body) ?? fallback.b,
    spot: hex(father?.appearance.glow) ?? hex(mother?.appearance.fin) ?? fallback.spot,
  };
}

/** Hình trứng để vẽ: tên theo công thức, màu theo bố mẹ (nếu có). */
export function eggLookOf(egg: EggState, recipe: BreedRecipe): EggLook {
  return egg.colors ? { name: recipe.egg.name, ...egg.colors } : recipe.egg;
}

export function speedupCost(egg: EggState, now: number): number {
  const left = Math.max(0, egg.end - now);
  return left <= 0 ? 0 : Math.max(1, Math.ceil(left / 60_000 / SPEEDUP_MINUTES_PER_DIAMOND));
}

type Result<T = object> = ({ ok: true; save: PlayerSave } & T) | { ok: false; error: string };

/** Đặt 2 cá bố mẹ lên đài → trứng vào ổ trống đầu tiên. Cá bố mẹ KHÔNG bị mất. */
export function startBreeding(
  save: PlayerSave,
  input: { txId: string; parentUids: [string, string]; now: number; seed: number },
  recipes: readonly BreedRecipe[],
  fishById: Map<string, FishDef>,
): Result<{ slot: number; egg: EggState }> {
  if (save.appliedTx.includes(input.txId)) return { ok: false, error: "Thao tác đã được ghi nhận" };
  const [ua, ub] = input.parentUids;
  if (!ua || !ub || ua === ub) return { ok: false, error: "Hãy chọn 2 con cá khác nhau" };
  const a = save.fishes.find((f) => f.uid === ua);
  const b = save.fishes.find((f) => f.uid === ub);
  if (!a || !b) return { ok: false, error: "Cá bố mẹ không còn trong túi" };
  if (!isBreedable(fishById.get(a.fishId)) || !isBreedable(fishById.get(b.fishId))) return { ok: false, error: "Chỉ cá từ bậc Boss trở lên mới lai tạo được" };
  if (fishGender(a) === fishGender(b)) return { ok: false, error: "Cần 1 cá đực ♂ (bố) và 1 cá cái ♀ (mẹ)" };
  // bố = con đực, mẹ = con cái (thứ tự chọn không quan trọng)
  const [dad, mom] = fishGender(a) === "m" ? [a, b] : [b, a];
  const recipe = recipeFor(a.fishId, b.fishId, recipes, fishById);
  if (!recipe) return { ok: false, error: "Cặp cá này chưa có công thức lai" };
  const st = breedingOf(save);
  const slot = st.slots.findIndex((x) => x.open && !x.egg);
  if (slot < 0) return { ok: false, error: "Hang ấp trứng đã đầy – ấp nở hoặc mở thêm ổ" };
  const egg: EggState = {
    id: input.txId,
    recipeId: recipe.id,
    parents: [dad.uid, mom.uid],
    parentSpecies: [dad.fishId, mom.fishId],
    colors: eggColorsFor(fishById.get(dad.fishId), fishById.get(mom.fishId), recipe.egg),
    start: input.now,
    end: input.now + recipe.hatchMinutes * 60_000,
    seed: input.seed >>> 0,
  };
  st.slots[slot] = { open: true, egg };
  const s = clone(save);
  s.breeding = st;
  markTx(s, input.txId);
  s.updatedAt = input.now;
  return { ok: true, save: s, slot, egg };
}

/** Mở khoá ổ ấp (vàng / kim cương, ghi sổ). */
export function unlockHatchSlot(save: PlayerSave, input: { txId: string; slot: number; now: number }): Result {
  if (save.appliedTx.includes(input.txId)) return { ok: false, error: "Thao tác đã được ghi nhận" };
  const cost = SLOT_UNLOCK[input.slot];
  const st = breedingOf(save);
  if (!cost || !st.slots[input.slot] || st.slots[input.slot]!.open) return { ok: false, error: "Ổ này đã mở" };
  const s = clone(save);
  if ("gold" in cost) {
    if (s.gold < cost.gold) return { ok: false, error: `Cần ${cost.gold} vàng` };
    s.gold -= cost.gold;
    addLedger(s, input.txId, "gold", -cost.gold, `hatch_slot:${input.slot}`, input.now);
  } else {
    if (s.diamonds < cost.diamonds) return { ok: false, error: `Cần ${cost.diamonds} kim cương` };
    s.diamonds -= cost.diamonds;
    addLedger(s, input.txId, "diamonds", -cost.diamonds, `hatch_slot:${input.slot}`, input.now);
  }
  st.slots[input.slot]!.open = true;
  s.breeding = st;
  markTx(s, input.txId);
  s.updatedAt = input.now;
  return { ok: true, save: s };
}

/** Tăng tốc: trả kim cương để trứng nở ngay. */
export function speedupEgg(save: PlayerSave, input: { txId: string; slot: number; now: number }): Result<{ cost: number }> {
  if (save.appliedTx.includes(input.txId)) return { ok: false, error: "Thao tác đã được ghi nhận" };
  const st = breedingOf(save);
  const egg = st.slots[input.slot]?.egg;
  if (!egg) return { ok: false, error: "Ổ này không có trứng" };
  const cost = speedupCost(egg, input.now);
  if (cost <= 0) return { ok: false, error: "Trứng đã sẵn sàng nở" };
  if (save.diamonds < cost) return { ok: false, error: `Cần ${cost} kim cương` };
  const s = clone(save);
  s.diamonds -= cost;
  addLedger(s, input.txId, "diamonds", -cost, `hatch_speedup:${egg.recipeId}`, input.now);
  egg.end = input.now;
  s.breeding = st;
  markTx(s, input.txId);
  s.updatedAt = input.now;
  return { ok: true, save: s, cost };
}

/** Ấp nở khi hết giờ: tạo cá mới theo tỷ lệ (tất định theo seed trứng). */
export function hatchEgg(
  save: PlayerSave,
  input: { slot: number; now: number },
  recipes: readonly BreedRecipe[],
  fishById: Map<string, FishDef>,
): Result<{ fish: OwnedFish }> {
  const st = breedingOf(save);
  const egg = st.slots[input.slot]?.egg;
  if (!egg) return { ok: false, error: "Ổ này không có trứng" };
  if (egg.end > input.now) return { ok: false, error: "Trứng chưa nở" };
  const txId = `hatch_${egg.id}`;
  if (save.appliedTx.includes(txId)) return { ok: false, error: "Trứng đã nở" };
  const recipe = recipes.find((r) => r.id === egg.recipeId);
  if (!recipe) return { ok: false, error: "Công thức không còn tồn tại" };
  const fishId = rollHatch(recipe, egg.seed);
  const def = fishById.get(fishId);
  if (!def) return { ok: false, error: "Dữ liệu cá lai không hợp lệ" };
  const rng = new Rng(egg.seed ^ 0x9e3779b9);
  // HỆ: cá lai mang hệ chính của cá bố + cá mẹ; Gen Lặn thêm 1 hệ ẩn (khác 2 hệ bố mẹ)
  const primary = (uid: string) => {
    const p = save.fishes.find((f) => f.uid === uid);
    const pd = p && fishById.get(p.fishId);
    return p?.elements?.[0] ?? (pd?.elementFixed ? pd.element : p?.element) ?? pd?.element ?? def.element;
  };
  const els = [...new Set([primary(egg.parents[0]), primary(egg.parents[1])])] as Element[];
  const others = ELEMENT_IDS.filter((e) => !els.includes(e));
  const hidden = tierOfResult(recipe, fishId) === 3 ? others[rng.int(0, others.length - 1)] : undefined;
  const fish: OwnedFish = {
    uid: `b${egg.id}`.slice(0, 64),
    fishId,
    element: els[0]!,
    elements: els,
    ...(hidden ? { hiddenElement: hidden } : {}),
    gender: rng.next() < 0.5 ? "m" : "f",
    ...(egg.parentSpecies ? { parents: [...egg.parentSpecies] as [string, string] } : {}),
    weightKg: Math.round(rng.range(def.weightKg[0], def.weightKg[1]) * 100) / 100,
    zoneId: "z_dao_lai_tao",
    caughtAt: input.now,
    level: 1,
    stars: 1,
    locked: false,
  };
  const s = clone(save);
  s.fishes.push(fish);
  s.stats.species[fishId] = (s.stats.species[fishId] ?? 0) + 1;
  st.slots[input.slot]!.egg = null;
  st.harvestAt[fish.uid] = input.now + HARVEST_CYCLE_MS;
  s.breeding = st;
  markTx(s, txId);
  s.updatedAt = input.now;
  return { ok: true, save: s, fish };
}

/** Vị trí kết quả trong bảng tỷ lệ (0 Boss Lai · 1 Siêu Boss · 2 Mythic · 3 Gen Lặn). */
function tierOfResult(recipe: BreedRecipe, fishId: string): number {
  return recipe.results.findIndex((r) => r.fish === fishId);
}

/** Cá trong bể nuôi: cá Boss trở lên của người chơi. */
export function habitatFishes(save: PlayerSave, fishById: Map<string, FishDef>): OwnedFish[] {
  return save.fishes.filter((f) => isBreedable(fishById.get(f.fishId)));
}

/** Mốc thu hoạch kế tiếp (cá mới vào bể bắt đầu đếm từ `now`). */
export function harvestReadyAt(st: BreedingState, uid: string, now: number): number {
  return st.harvestAt[uid] ?? now + HARVEST_CYCLE_MS;
}

/**
 * Thu hoạch vàng của các cá đã đủ chu kỳ (`uids` = chỉ những con này; bỏ trống = tất cả).
 * Không tích luỹ nhiều chu kỳ: thu xong bắt đầu chu kỳ mới.
 */
export function collectHabitat(
  save: PlayerSave,
  input: { txId: string; now: number; uids?: string[] },
  fishById: Map<string, FishDef>,
  tierOf: (fishId: string) => BreedTier,
): Result<{ gold: number; count: number }> {
  if (save.appliedTx.includes(input.txId)) return { ok: false, error: "Thao tác đã được ghi nhận" };
  const st = breedingOf(save);
  let gold = 0;
  let count = 0;
  const pool = habitatFishes(save, fishById).filter((f) => !input.uids || input.uids.includes(f.uid));
  for (const f of pool) {
    const at = st.harvestAt[f.uid];
    if (at === undefined) {
      st.harvestAt[f.uid] = input.now + HARVEST_CYCLE_MS; // cá mới vào bể: bắt đầu chu kỳ
      continue;
    }
    if (at > input.now) continue;
    gold += BREED_TIERS[tierOf(f.fishId)].yieldGold;
    count++;
    st.harvestAt[f.uid] = input.now + HARVEST_CYCLE_MS;
  }
  // dọn mốc của cá đã bán / mất
  for (const uid of Object.keys(st.harvestAt)) if (!save.fishes.some((f) => f.uid === uid)) delete st.harvestAt[uid];
  const s = clone(save);
  s.breeding = st;
  if (gold > 0) {
    s.gold += gold;
    addLedger(s, input.txId, "gold", gold, "habitat_harvest", input.now);
    markTx(s, input.txId);
  }
  s.updatedAt = input.now;
  return { ok: true, save: s, gold, count };
}
