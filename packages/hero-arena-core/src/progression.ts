import { branchById, evolutionById, heroById, HEROES } from "./heroes.ts";
import type { Rng } from "./rng.ts";
import type { Gender, PassiveEffect, PlayerMatchState, Rarity, StatMods, UpgradeChoice, UpgradeDef } from "./types.ts";

// Hệ thống cấp độ trong trận: cấp 1 → 15, khóa nhánh ở cấp 5, chọn 1 trong 3 thẻ khi lên cấp.

export const MAX_LEVEL = 15;
export const SPECIALIZATION_LEVEL = 5;
export const ULTIMATE_LEVEL = 10;
/** Cấp chọn Dạng 3 (trùng cấp mở chiêu tối thượng). */
export const EVOLUTION_LEVEL = ULTIMATE_LEVEL;
export const AWAKENING_LEVEL = 15;

/** EXP cần để lên từ cấp i lên cấp i+1. */
export const EXP_TO_NEXT: Readonly<Record<number, number>> = {
  1: 100, 2: 140, 3: 190, 4: 250, 5: 320, 6: 400, 7: 490, 8: 590, 9: 700, 10: 820, 11: 950, 12: 1100, 13: 1260, 14: 1450,
};

const HP_PER_LEVEL = 65;
const MANA_PER_LEVEL = 25;
const ATK_PER_LEVEL = 0.04;
const BRANCH_HP_BONUS = 120;
const EVOLUTION_HP_BONUS = 220;

const RARITY_WEIGHT: Record<Rarity, number> = { common: 60, rare: 30, epic: 10 };

/** Kho thẻ nâng cấp. Thẻ có branchId chỉ ra cho nhánh đó. */
const GENERIC_UPGRADES: readonly UpgradeDef[] = [
  // --- tăng chỉ số ---
  { id: "u_vitality", titleVi: "Sinh Lực", descVi: "+150 máu tối đa.", pool: "stat_enhancement", rarity: "common", maxStacks: 5, effect: { maxHp: 150 } },
  { id: "u_might", titleVi: "Sức Mạnh", descVi: "+10% công.", pool: "stat_enhancement", rarity: "common", maxStacks: 5, effect: { attackPct: 0.1 } },
  { id: "u_wisdom", titleVi: "Trí Tuệ", descVi: "+80 năng lượng tối đa, +30% hồi năng lượng.", pool: "stat_enhancement", rarity: "common", maxStacks: 3, effect: { maxMana: 80, passive: { manaRegenPct: 0.3 } } },
  { id: "u_titan", titleVi: "Thể Chất Khổng Lồ", descVi: "+350 máu tối đa.", pool: "stat_enhancement", rarity: "rare", maxStacks: 2, effect: { maxHp: 350 } },
  { id: "u_warlord", titleVi: "Chiến Thần", descVi: "+22% công, +150 máu.", pool: "stat_enhancement", rarity: "epic", maxStacks: 1, effect: { attackPct: 0.22, maxHp: 150 } },
  // --- bị động ---
  { id: "u_swift", titleVi: "Nhanh Nhẹn", descVi: "+8% tốc chạy.", pool: "passive_boost", rarity: "common", maxStacks: 3, effect: { passive: { moveSpeedPct: 0.08 } } },
  { id: "u_frenzy", titleVi: "Cuồng Nộ", descVi: "+12% tốc đánh.", pool: "passive_boost", rarity: "common", maxStacks: 3, effect: { passive: { attackSpeedPct: 0.12 } } },
  { id: "u_vamp", titleVi: "Hút Máu", descVi: "Hút 6% sát thương gây ra.", pool: "passive_boost", rarity: "rare", maxStacks: 3, effect: { passive: { lifesteal: 0.06 } } },
  { id: "u_keen", titleVi: "Mắt Tinh", descVi: "+10% chí mạng.", pool: "passive_boost", rarity: "rare", maxStacks: 3, effect: { passive: { critChance: 0.1 } } },
  { id: "u_iron", titleVi: "Da Sắt", descVi: "Giảm 8% sát thương nhận vào.", pool: "passive_boost", rarity: "rare", maxStacks: 3, effect: { passive: { damageReduction: 0.08 } } },
  { id: "u_spikes", titleVi: "Giáp Gai", descVi: "Phản 12% sát thương cận chiến.", pool: "passive_boost", rarity: "rare", maxStacks: 2, effect: { passive: { thorns: 0.12 } } },
  { id: "u_venom", titleVi: "Tẩm Độc", descVi: "Đòn đánh gây độc 6% công/giây trong 3 giây.", pool: "passive_boost", rarity: "rare", maxStacks: 2, effect: { passive: { dotPct: 0.06 } } },
  { id: "u_toxin", titleVi: "Kịch Độc", descVi: "Đòn đánh gây nhiễm độc 5% công/giây trong 5 giây.", pool: "passive_boost", rarity: "rare", maxStacks: 2, effect: { passive: { poisonPct: 0.05 } } },
  { id: "u_frostbite", titleVi: "Tê Cóng", descVi: "Đòn đánh làm chậm 12%.", pool: "passive_boost", rarity: "rare", maxStacks: 2, effect: { passive: { slowPct: 0.12 } } },
  { id: "u_immortal", titleVi: "Bất Diệt", descVi: "Giảm 15% sát thương nhận, hút 8% máu.", pool: "passive_boost", rarity: "epic", maxStacks: 1, effect: { passive: { damageReduction: 0.15, lifesteal: 0.08 } } },
  // --- sửa đổi kỹ năng ---
  { id: "u_haste", titleVi: "Tinh Thông", descVi: "Giảm 10% hồi chiêu mọi kỹ năng.", pool: "skill_modifier", rarity: "common", maxStacks: 3, effect: { cooldownPct: 0.1 } },
  { id: "u_empower", titleVi: "Cường Hóa Kỹ Năng", descVi: "+15% sát thương kỹ năng.", pool: "skill_modifier", rarity: "common", maxStacks: 4, effect: { skillDamagePct: 0.15 } },
  { id: "u_archmage", titleVi: "Đại Pháp", descVi: "+30% sát thương kỹ năng, giảm 10% hồi chiêu.", pool: "skill_modifier", rarity: "epic", maxStacks: 1, effect: { skillDamagePct: 0.3, cooldownPct: 0.1 } },
];

/** Mỗi nhánh có 1 thẻ "Tinh Thông" riêng = 60% bị động của nhánh (tối đa 2 lần). */
function branchUpgrades(): UpgradeDef[] {
  const out: UpgradeDef[] = [];
  for (const h of HEROES) {
    for (const b of h.branches) {
      const eff: PassiveEffect = {};
      for (const k of Object.keys(b.passive.effect) as Array<keyof PassiveEffect>) eff[k] = Math.round((b.passive.effect[k] ?? 0) * 0.6 * 100) / 100;
      const parts = Object.entries(eff).map(([k, v]) => `${PASSIVE_VI[k as keyof PassiveEffect]} +${Math.round((v ?? 0) * 100)}%`);
      out.push({ id: `u_master_${b.id}`, titleVi: `Tinh Thông ${b.name}`, descVi: `Cường hóa ${b.passive.nameVi}: ${parts.join(", ")}.`, pool: "skill_modifier", rarity: "rare", maxStacks: 2, branchId: b.id, effect: { passive: eff, skillDamagePct: 0.08 } });
    }
  }
  return out;
}

const PASSIVE_VI: Record<keyof PassiveEffect, string> = {
  dotPct: "thiêu đốt",
  poisonPct: "nhiễm độc",
  slowPct: "làm chậm",
  lifesteal: "hút máu",
  damageReduction: "giảm sát thương",
  critChance: "chí mạng",
  moveSpeedPct: "tốc chạy",
  attackSpeedPct: "tốc đánh",
  thorns: "phản đòn",
  manaRegenPct: "hồi năng lượng",
};

export const UPGRADES: readonly UpgradeDef[] = [...GENERIC_UPGRADES, ...branchUpgrades()];

export function upgradeById(id: string): UpgradeDef | undefined {
  return UPGRADES.find((u) => u.id === id);
}

function emptyPassive(): Required<PassiveEffect> {
  return { dotPct: 0, poisonPct: 0, slowPct: 0, lifesteal: 0, damageReduction: 0, critChance: 0, moveSpeedPct: 0, attackSpeedPct: 0, thorns: 0, manaRegenPct: 0 };
}

function addPassive(target: Required<PassiveEffect>, p: PassiveEffect | undefined): void {
  if (!p) return;
  for (const k of Object.keys(p) as Array<keyof PassiveEffect>) target[k] += p[k] ?? 0;
}

export function createMatchPlayer(playerId: string, name: string, heroId: string, gender: Gender): PlayerMatchState {
  const hero = heroById(heroId);
  if (!hero) throw new Error(`Không có anh hùng: ${heroId}`);
  const b = hero.baseStats;
  return {
    playerId,
    name,
    heroId,
    gender,
    branchId: null,
    specializationLocked: false,
    evolutionId: null,
    level: 1,
    exp: 0,
    hp: b.hp,
    maxHp: b.hp,
    mana: b.mana,
    maxMana: b.mana,
    stamina: b.stamina,
    maxStamina: b.stamina,
    attackPower: b.attackPower,
    moveSpeed: b.moveSpeed,
    alive: true,
    kills: 0,
    activeHazard: "none",
    outsideSafeZone: false,
    pickedUpgrades: {},
    pendingOffers: [],
    needsBranch: false,
    needsEvolution: false,
    bonus: { attackPct: 0, cooldownPct: 0, skillDamagePct: 0, burstPct: 0, speedPct: 0, rangePct: 0 },
    passive: emptyPassive(),
  };
}

/** Công thực tế (cơ bản × cấp × thẻ). */
export function effectiveAttack(p: PlayerMatchState): number {
  return p.attackPower * (1 + ATK_PER_LEVEL * (p.level - 1)) * (1 + p.bonus.attackPct);
}

/** Bị động tổng = nhánh + thẻ. Giới hạn để không vượt ngưỡng vô lý. */
export function totalPassive(p: PlayerMatchState): Required<PassiveEffect> {
  const out = emptyPassive();
  const hero = heroById(p.heroId);
  const br = hero ? branchById(hero, p.branchId) : undefined;
  addPassive(out, br?.passive.effect);
  if (hero) addPassive(out, evolutionById(hero, p.branchId, p.evolutionId)?.passive.effect);
  addPassive(out, p.passive);
  out.damageReduction = Math.min(0.6, out.damageReduction);
  out.critChance = Math.min(0.75, out.critChance);
  out.slowPct = Math.min(0.6, out.slowPct);
  out.lifesteal = Math.min(0.5, out.lifesteal);
  return out;
}

export interface ExpResult {
  levelsGained: number;
  needsBranchSelection: boolean;
  needsEvolutionSelection: boolean;
  offersAdded: number;
}

/** Cộng EXP; mỗi cấp mới tạo một lượt chọn 1 trong 3 (trừ cấp phải chọn nhánh). */
export function gainExp(p: PlayerMatchState, amount: number, rng: Rng): ExpResult {
  const res: ExpResult = { levelsGained: 0, needsBranchSelection: false, needsEvolutionSelection: false, offersAdded: 0 };
  if (!p.alive || amount <= 0 || p.level >= MAX_LEVEL) return res;
  p.exp += amount;
  while (p.level < MAX_LEVEL) {
    const need = EXP_TO_NEXT[p.level] ?? Infinity;
    if (p.exp < need) break;
    p.exp -= need;
    p.level += 1;
    res.levelsGained += 1;
    p.maxHp += HP_PER_LEVEL;
    p.hp = Math.min(p.maxHp, p.hp + HP_PER_LEVEL + p.maxHp * 0.15);
    p.maxMana += MANA_PER_LEVEL;
    p.mana = p.maxMana;
    p.stamina = p.maxStamina;
    if (p.level === SPECIALIZATION_LEVEL && !p.branchId) {
      p.needsBranch = true;
      res.needsBranchSelection = true;
    } else if (p.level === EVOLUTION_LEVEL && p.branchId && !p.evolutionId) {
      p.needsEvolution = true;
      res.needsEvolutionSelection = true;
    } else {
      p.pendingOffers.push(rollRandom3Choices(p, rng));
      res.offersAdded += 1;
    }
  }
  if (p.level >= MAX_LEVEL) p.exp = 0;
  return res;
}

/** Áp đánh đổi chỉ số của một hướng/nhánh (âm là điểm yếu). */
function applyMods(p: PlayerMatchState, m: StatMods): void {
  if (m.hpPct) p.maxHp = Math.max(100, Math.round(p.maxHp * (1 + m.hpPct)));
  p.bonus.attackPct += m.atkPct ?? 0;
  p.bonus.burstPct += m.burstPct ?? 0;
  p.bonus.speedPct += m.speedPct ?? 0;
  p.bonus.rangePct += m.rangePct ?? 0;
}

/** Khóa nhánh chuyên môn (chỉ một lần, từ cấp 5). */
export function chooseSpecializationBranch(p: PlayerMatchState, branchId: string, rng: Rng): boolean {
  if (p.specializationLocked) return false;
  if (p.level < SPECIALIZATION_LEVEL) return false;
  const hero = heroById(p.heroId);
  const br = hero ? branchById(hero, branchId) : undefined;
  if (!br) return false;
  p.branchId = br.id;
  p.specializationLocked = true;
  p.needsBranch = false;
  p.maxHp += BRANCH_HP_BONUS;
  applyMods(p, br.mods);
  p.hp = p.maxHp;
  p.pendingOffers.push(rollRandom3Choices(p, rng));
  // chọn Dạng 2 muộn (đã quá cấp 10) → phải chọn tiếp Dạng 3
  if (p.level >= EVOLUTION_LEVEL) p.needsEvolution = true;
  return true;
}

/** Chọn Dạng 3 (chỉ một lần, từ cấp 10, phải thuộc Dạng 2 đã chọn). */
export function chooseEvolution(p: PlayerMatchState, evolutionId: string, rng: Rng): boolean {
  if (p.evolutionId || !p.branchId || p.level < EVOLUTION_LEVEL) return false;
  const hero = heroById(p.heroId);
  const evo = hero ? evolutionById(hero, p.branchId, evolutionId) : undefined;
  if (!evo) return false;
  p.evolutionId = evo.id;
  p.needsEvolution = false;
  p.maxHp += EVOLUTION_HP_BONUS;
  applyMods(p, evo.mods);
  p.hp = p.maxHp;
  p.pendingOffers.push(rollRandom3Choices(p, rng));
  return true;
}

/** Chọn 1 thẻ trong lượt chọn đầu hàng đợi. */
export function selectUpgradeChoice(p: PlayerMatchState, choiceId: string): boolean {
  const offer = p.pendingOffers[0];
  if (!offer) return false;
  const chosen = offer.find((c) => c.id === choiceId);
  if (!chosen) return false;
  const def = upgradeById(chosen.upgradeId);
  if (!def) return false;
  p.pendingOffers.shift();
  p.pickedUpgrades[def.id] = (p.pickedUpgrades[def.id] ?? 0) + 1;
  const e = def.effect;
  if (e.maxHp) {
    p.maxHp += e.maxHp;
    p.hp = Math.min(p.maxHp, p.hp + e.maxHp);
  }
  if (e.maxMana) {
    p.maxMana += e.maxMana;
    p.mana = Math.min(p.maxMana, p.mana + e.maxMana);
  }
  p.bonus.attackPct += e.attackPct ?? 0;
  p.bonus.skillDamagePct += e.skillDamagePct ?? 0;
  p.bonus.cooldownPct = Math.min(0.5, p.bonus.cooldownPct + (e.cooldownPct ?? 0));
  addPassive(p.passive, e.passive);
  return true;
}

/** Sinh 3 thẻ khác nhau (theo độ hiếm, nhánh, chưa đầy số lần nhận). */
export function rollRandom3Choices(p: PlayerMatchState, rng: Rng): UpgradeChoice[] {
  const pool = UPGRADES.filter((u) => (!u.branchId || u.branchId === p.branchId) && (p.pickedUpgrades[u.id] ?? 0) < u.maxStacks);
  const picked: UpgradeDef[] = [];
  const left = [...pool];
  while (picked.length < 3 && left.length > 0) {
    // thẻ riêng của nhánh được ưu tiên gấp đôi
    const u = rng.pickWeighted(left, (x) => RARITY_WEIGHT[x.rarity] * (x.branchId ? 2 : 1));
    picked.push(u);
    left.splice(left.indexOf(u), 1);
  }
  const offerNo = Object.values(p.pickedUpgrades).reduce((s, n) => s + n, 0) + p.pendingOffers.length;
  return picked.map((u, i) => ({
    id: `${p.playerId}_o${offerNo}_${i}_${u.id}`,
    upgradeId: u.id,
    title: u.titleVi,
    description: u.descVi,
    pool: u.pool,
    rarity: u.rarity,
  }));
}

export function getActiveSpriteKey(p: PlayerMatchState): string {
  const hero = heroById(p.heroId);
  if (!hero) return `${p.heroId}_${p.gender}`;
  const br = branchById(hero, p.branchId);
  const evo = evolutionById(hero, p.branchId, p.evolutionId);
  if (evo) return `${hero.id}_${evo.id}_${p.gender}`;
  return br ? br.appearances[p.gender].spriteKey : `${hero.id}_base_${p.gender}`;
}

/** Mô tả hiệu ứng bị động bằng tiếng Việt, ví dụ "Thiêu đốt +12% · Hút máu +4%". */
export function passiveText(e: PassiveEffect): string {
  return (Object.keys(e) as Array<keyof PassiveEffect>)
    .filter((k) => (e[k] ?? 0) > 0)
    .map((k) => {
      const v = PASSIVE_VI[k];
      return `${v.charAt(0).toUpperCase()}${v.slice(1)} +${Math.round((e[k] ?? 0) * 100)}%`;
    })
    .join(" · ");
}
