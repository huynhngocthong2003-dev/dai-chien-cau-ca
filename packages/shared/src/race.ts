import { RARITY_ORDER } from "@dccc/game-config";
import { Rng } from "./rng.ts";
import type { FishDef, FishFormDef } from "./types.ts";
import { addLedger, clone, grantXp, markTx, type ActionResult, type OwnedFish, type PlayerSave } from "./save.ts";

/**
 * ĐUA CÁ: nhân vật cưỡi cá đua trên 3 làn nước.
 * Mỗi con cá có chỉ số đua riêng, ngẫu nhiên khi câu được (sinh tất định từ mã riêng `uid` của con cá
 * + loài, độ hiếm, cấp, sao, thể đột biến, cân nặng) → cá cũ trong kho cũng có chỉ số mà không cần đổi save.
 */
export interface RaceStats {
  /** Tốc độ tối đa. */
  speed: number;
  /** Khả năng tăng tốc. */
  accel: number;
  /** Thể lực: hồi năng lượng tăng tốc, đỡ đuối sức cuối đường. */
  stamina: number;
  score: number;
  grade: "S" | "A" | "B" | "C" | "D";
}

function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[rng.int(0, items.length - 1)]!;
}

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Ba lần gieo ngẫu nhiên cố định của một con cá (0..1). */
export function raceRolls(uid: string): [number, number, number] {
  const r = new Rng(hash32(`race:${uid}`) || 1);
  return [r.next(), r.next(), r.next()];
}

export function raceGrade(score: number): RaceStats["grade"] {
  return score >= 80 ? "S" : score >= 68 ? "A" : score >= 56 ? "B" : score >= 45 ? "C" : "D";
}

export function raceStats(o: Pick<OwnedFish, "uid" | "level" | "stars" | "weightKg" | "form">, def: Pick<FishDef, "spd" | "rarity">, form?: FishFormDef | null): RaceStats {
  const ri = Math.max(0, RARITY_ORDER.indexOf(def.rarity));
  const [r1, r2, r3] = raceRolls(o.uid);
  const kg = Math.log10(1 + Math.max(0, o.weightKg));
  const formB = form || o.form ? 1 : 0;
  const speed = 30 + def.spd * 0.45 + ri * 3 + o.level * 0.25 + (o.stars - 1) * 2 + formB * 6 + (r1 - 0.4) * 18;
  const accel = 22 + def.spd * 0.25 + ri * 2 + o.level * 0.15 + formB * 4 + (r2 - 0.4) * 16 - Math.min(10, kg * 3);
  const stamina = 40 + ri * 4 + o.stars * 3 + o.level * 0.2 + formB * 5 + (r3 - 0.4) * 24 + Math.min(12, kg * 4);
  const round = (v: number) => Math.round(Math.max(5, v) * 10) / 10;
  const s = { speed: round(speed), accel: round(accel), stamina: round(stamina) };
  const score = Math.round((s.speed * 0.55 + s.accel * 0.25 + s.stamina * 0.2) * 10) / 10;
  return { ...s, score, grade: raceGrade(score) };
}

// ------------------------------------------------------------------ giải đua
export type RaceLeague = "tap_su" | "chuyen_nghiep" | "huyen_thoai";

export interface LeagueDef {
  id: RaceLeague;
  name: string;
  minLevel: number;
  fee: number;
  prizes: [number, number, number];
  firstDiamonds: number;
  xp: number;
  /** Độ hiếm cá của đối thủ máy. */
  rarities: FishDef["rarity"][];
  aiLevel: [number, number];
  aiStars: [number, number];
  /** Khả năng né chướng ngại của máy (0..1). */
  aiSkill: number;
}

export const RACE_LEAGUES: Record<RaceLeague, LeagueDef> = {
  tap_su: { id: "tap_su", name: "Giải Tập Sự", minLevel: 1, fee: 50, prizes: [250, 120, 60], firstDiamonds: 0, xp: 15, rarities: ["common", "rare"], aiLevel: [1, 10], aiStars: [1, 1], aiSkill: 0.45 },
  chuyen_nghiep: { id: "chuyen_nghiep", name: "Giải Chuyên Nghiệp", minLevel: 8, fee: 300, prizes: [1500, 700, 350], firstDiamonds: 2, xp: 40, rarities: ["rare", "precious", "epic"], aiLevel: [10, 30], aiStars: [1, 3], aiSkill: 0.65 },
  huyen_thoai: { id: "huyen_thoai", name: "Giải Huyền Thoại", minLevel: 20, fee: 1500, prizes: [7000, 3000, 1500], firstDiamonds: 8, xp: 100, rarities: ["epic", "legendary", "mythic", "boss"], aiLevel: [30, 60], aiStars: [2, 5], aiSkill: 0.85 },
};

const AI_NAMES = ["Tèo Tốc Độ", "Bà Năm Lướt Sóng", "Chú Sáu Rẽ Nước", "Bé Na Tia Chớp", "Anh Ba Phi Thuyền", "Cô Út Gió Lốc", "Ông Tư Cá Kình", "Bốn Mắt Lướt Ván", "Tí Nị Siêu Tốc", "Đại Ca Sông Hồng"];

export interface Racer {
  id: string;
  name: string;
  fishId: string;
  formId: string | null;
  charId: string;
  stats: RaceStats;
  /** null = người chơi điều khiển. */
  aiSkill: number | null;
  /** Người chơi khác (vị trí nhận qua mạng, không mô phỏng ở máy này). */
  remote?: boolean;
  lane: number;
  x: number;
  v: number;
  energy: number;
  boostUntil: number;
  slowUntil: number;
  padUntil: number;
  finishTime: number | null;
  /** Đang nhảy tới lúc nào / được nhảy lại từ lúc nào (ms). */
  jumpUntil?: number;
  /** Mặt băng: khóa đổi làn tới lúc nào. */
  laneLockUntil?: number;
  /** Đồ đang cầm (hộp may mắn), khiên tới lúc nào, bị mực che tới lúc nào. */
  item?: RaceItem | null;
  shieldUntil?: number;
  inkUntil?: number;
  jumpReadyAt?: number;
  hits: number;
  boosts: number;
}

/** Tạo đối thủ máy theo giải. */
export function makeRaceOpponents(league: RaceLeague, fishes: FishDef[], charIds: string[], rng: Rng, n = 4): Racer[] {
  const L = RACE_LEAGUES[league];
  const pool = fishes.filter((f) => L.rarities.includes(f.rarity));
  const names = [...AI_NAMES];
  return Array.from({ length: n }, (_, i) => {
    const def = pick(rng, pool);
    const uid = `ai_${rng.int(1, 1e9)}`;
    const o = { uid, level: rng.int(L.aiLevel[0], L.aiLevel[1]), stars: rng.int(L.aiStars[0], L.aiStars[1]), weightKg: rng.range(def.weightKg[0], def.weightKg[1]), form: undefined };
    const name = names.splice(rng.int(0, names.length - 1), 1)[0]!;
    return newRacer(`ai${i}`, name, def.id, null, pick(rng, charIds), raceStats(o, def), L.aiSkill);
  });
}

export function newRacer(id: string, name: string, fishId: string, formId: string | null, charId: string, stats: RaceStats, aiSkill: number | null): Racer {
  return { id, name, fishId, formId, charId, stats, aiSkill, lane: 1, x: 0, v: 0, energy: 30, boostUntil: 0, slowUntil: 0, padUntil: 0, finishTime: null, hits: 0, boosts: 0 };
}

export type ObstacleKind = "seaweed" | "rock" | "current" | "shark" | "log" | "jelly" | "whirl" | "geyser" | "drift" | "eruption" | "tentacle" | "box";

// ------------------------------------------------------------------ hộp may mắn
export type RaceItem = "turbo" | "shield" | "ink" | "thunder";
export const RACE_ITEM_INFO: Record<RaceItem, { name: string; icon: string; desc: string }> = {
  turbo: { name: "Tên lửa nước", icon: "🚀", desc: "Tự tăng tốc mạnh 1,6 giây (không tốn năng lượng)" },
  shield: { name: "Khiên bong bóng", icon: "🛡", desc: "Chặn 1 lần va chạm hoặc đòn tấn công (8 giây)" },
  ink: { name: "Bom mực", icon: "🦑", desc: "Bắn đối thủ ngay phía trước: chậm lại + mực che mắt" },
  thunder: { name: "Sấm sét", icon: "⚡", desc: "Giật chậm TẤT CẢ đối thủ đang dẫn trước" },
};
/** Ai càng ở sau càng dễ ra đồ mạnh để bám đuổi. */
const ITEM_WEIGHTS: Record<"front" | "mid" | "back", Record<RaceItem, number>> = {
  front: { turbo: 3, shield: 4, ink: 2, thunder: 0 },
  mid: { turbo: 4, shield: 2, ink: 3, thunder: 0.6 },
  back: { turbo: 4, shield: 1, ink: 3, thunder: 2 },
};
/** Gieo món đồ (tất định theo hộp + tay đua + vị trí, không dùng chung bộ ngẫu nhiên của đường đua). */
export function rollItem(seedKey: string, place: number, total: number): RaceItem {
  let h = 2166136261;
  for (let i = 0; i < seedKey.length; i++) h = Math.imul(h ^ seedKey.charCodeAt(i), 16777619);
  const u = ((h >>> 0) % 100000) / 100000;
  const w = ITEM_WEIGHTS[place <= 1 ? "front" : place >= total - 1 && total > 2 ? "back" : "mid"];
  const items = Object.keys(w) as RaceItem[];
  const sum = items.reduce((a, k) => a + w[k], 0);
  let r = u * sum;
  for (const k of items) {
    r -= w[k];
    if (r < 0) return k;
  }
  return "turbo";
}
export interface Obstacle {
  id: number;
  x: number;
  lane: number;
  kind: ObstacleKind;
  /** Chướng ngại chuyển động: pha + chu kỳ (ms) / tốc độ trôi (m/s). */
  phase?: number;
  period?: number;
  speed?: number;
  /** Dòng nước ngang (drift): dài bao nhiêu mét, đẩy lên (−1) hay xuống (+1). */
  len?: number;
  dir?: -1 | 1;
}

/** Chướng ngại nhảy qua được (cá mập, cột lửa/sét, xúc tu thì không!). */
export const JUMPABLE: ReadonlySet<ObstacleKind> = new Set<ObstacleKind>(["seaweed", "rock", "log", "jelly", "whirl"]);
/** Không phải chướng ngại gây hại (có lợi hoặc hiệu ứng vùng). */
export const HELPFUL: ReadonlySet<ObstacleKind> = new Set<ObstacleKind>(["current", "geyser", "drift", "box"]);

export const OBSTACLE_INFO: Record<ObstacleKind, { name: string; tip: string }> = {
  seaweed: { name: "Rong biển", tip: "Làm chậm – tăng tốc để xé toạc, hoặc nhảy qua" },
  rock: { name: "Đá ngầm", tip: "Khựng mạnh, mất tăng tốc – né hoặc nhảy" },
  current: { name: "Dòng xiết", tip: "Tăng tốc – bật TĂNG TỐC ngay trên dòng xiết để được SIÊU TĂNG TỐC" },
  shark: { name: "Cá mập tuần tra", tip: "Bơi qua lại giữa các làn – KHÔNG nhảy qua được, canh lúc nó rời làn" },
  log: { name: "Khúc gỗ trôi", tip: "Trôi ngược về phía bạn – nhảy đúng lúc" },
  jelly: { name: "Sứa điện", tip: "Lúc nổi lúc chìm – chỉ chích khi đang nổi" },
  whirl: { name: "Xoáy nước", tip: "Cuốn mạnh, gần như đứng yên – né hoặc nhảy" },
  geyser: { name: "Mạch phun", tip: "Hất bạn bay cao qua chướng ngại phía trước + tăng tốc" },
  drift: { name: "Dòng nước ngang", tip: "Đẩy lệch làn liên tục – đang tăng tốc hoặc đang bay thì không bị đẩy" },
  eruption: { name: "Cột phun", tip: "Phun theo nhịp – thấy báo hiệu đỏ thì đổi làn, KHÔNG nhảy qua được" },
  tentacle: { name: "Xúc tu thủy quái", tip: "Trồi lên rồi lặn xuống – KHÔNG nhảy qua được, canh lúc nó lặn" },
  box: { name: "Hộp may mắn", tip: "Đi qua để nhặt đồ: tên lửa, khiên, bom mực, sấm sét" },
};

// ------------------------------------------------------------------ bản đồ đua
export type RaceMapId = "song_que" | "ran_san_ho" | "bang_ha" | "nui_lua" | "than_thoai";
export interface RaceSectionDef {
  name: string;
  /** Trọng số loại chướng ngại trong chặng. */
  w: Partial<Record<ObstacleKind, number>>;
  /** Mật độ (càng cao chướng ngại càng sát nhau). */
  density: number;
  /** Mù/bão: chỉ thấy rõ được bấy nhiêu mét phía trước (chỉ ảnh hưởng hiển thị). */
  fog?: number;
  /** Mặt băng trơn: đổi làn xong phải chờ một chút mới đổi tiếp. */
  ice?: boolean;
}
export interface RaceMapDef {
  id: RaceMapId;
  name: string;
  icon: string;
  minLevel: number;
  description: string;
  /** 3 chặng: [0,400) [400,800) [800,1200] – càng về sau càng gay cấn. */
  sections: [RaceSectionDef, RaceSectionDef, RaceSectionDef];
}

export const RACE_MAPS: Record<RaceMapId, RaceMapDef> = {
  song_que: {
    id: "song_que",
    name: "Sông Quê",
    icon: "🏞",
    minLevel: 1,
    description: "Từ dòng sông yên bình xuyên rừng đước, kết thúc ở thác ghềnh dữ dội",
    sections: [
      { name: "Sông Quê Yên Bình", density: 1, w: { seaweed: 4, rock: 3, current: 2, log: 2 } },
      { name: "Rừng Đước Rậm Rạp", density: 1.2, w: { seaweed: 4, log: 3, rock: 2, current: 2, drift: 1.6 } },
      { name: "Thác Ghềnh Dữ Dội", density: 1.45, w: { rock: 4, log: 3, drift: 3, whirl: 2, current: 2 } },
    ],
  },
  ran_san_ho: {
    id: "ran_san_ho",
    name: "Rạn San Hô",
    icon: "🪸",
    minLevel: 1,
    description: "Rạn san hô rực rỡ, đầm phá hoàng hôn rồi lao xuống rãnh vực sâu có thủy quái",
    sections: [
      { name: "Rạn San Hô Rực Rỡ", density: 1, w: { rock: 3, seaweed: 2, jelly: 3, current: 2, geyser: 2 } },
      { name: "Đầm Phá Hoàng Hôn", density: 1.2, w: { jelly: 3, shark: 2, geyser: 2, current: 2, rock: 2 } },
      { name: "Rãnh Vực Sâu", density: 1.45, w: { shark: 3, tentacle: 2.5, jelly: 3, whirl: 2, geyser: 1 } },
    ],
  },
  bang_ha: {
    id: "bang_ha",
    name: "Băng Hà",
    icon: "🧊",
    minLevel: 5,
    description: "Mặt băng trơn trượt, bão tuyết che tầm nhìn, đích đến dưới cực quang",
    sections: [
      { name: "Biển Băng Trôi", density: 1, ice: true, w: { rock: 3, log: 3, current: 2, seaweed: 1 } },
      { name: "Bão Tuyết Mù Mịt", density: 1.2, ice: true, fog: 30, w: { rock: 3, log: 3, drift: 2, shark: 1.5 } },
      { name: "Cực Quang Huyền Ảo", density: 1.45, ice: true, w: { rock: 3, log: 3, whirl: 2, shark: 2, geyser: 1 } },
    ],
  },
  nui_lua: {
    id: "nui_lua",
    name: "Núi Lửa",
    icon: "🌋",
    minLevel: 10,
    description: "Bờ đá bazan, bão tro mù trời và dòng dung nham phun cột lửa theo nhịp",
    sections: [
      { name: "Bờ Đá Bazan", density: 1, w: { rock: 3, current: 2, eruption: 2, log: 2 } },
      { name: "Bão Tro Núi Lửa", density: 1.25, fog: 34, w: { eruption: 3, rock: 3, log: 2, whirl: 1.5 } },
      { name: "Dòng Dung Nham", density: 1.5, w: { eruption: 4, rock: 3, whirl: 2, drift: 2 } },
    ],
  },
  than_thoai: {
    id: "than_thoai",
    name: "Biển Thần Thoại",
    icon: "🌙",
    minLevel: 18,
    description: "Biển đêm trăng, giông bão sấm sét và hang ổ của Kraken",
    sections: [
      { name: "Biển Đêm Trăng", density: 1.05, w: { jelly: 3, shark: 2, current: 2, geyser: 2, rock: 2 } },
      { name: "Giông Bão Sấm Sét", density: 1.3, fog: 42, w: { eruption: 3, shark: 2, drift: 2, jelly: 2, rock: 2 } },
      { name: "Hang Ổ Thủy Quái", density: 1.55, w: { tentacle: 4, whirl: 3, shark: 2, eruption: 2, geyser: 1 } },
    ],
  },
};
export const RACE_MAP_IDS = Object.keys(RACE_MAPS) as RaceMapId[];
/** Mốc đổi chặng (mét). */
export const SECTION_MARKS = [400, 800] as const;
export function sectionIndex(x: number): 0 | 1 | 2 {
  return x < SECTION_MARKS[0] ? 0 : x < SECTION_MARKS[1] ? 1 : 2;
}
/** Bản đồ cho phòng đua nhiều người: suy ra từ seed để mọi máy giống nhau. */
export function mapFromSeed(seed: number): RaceMapId {
  return RACE_MAP_IDS[Math.abs(seed) % RACE_MAP_IDS.length]!;
}

export type RaceEvent =
  | { type: "boost"; racer: string; super?: boolean }
  | { type: "hit"; racer: string; kind: Exclude<ObstacleKind, "current" | "geyser" | "drift" | "box"> }
  | { type: "item_get"; racer: string; item: RaceItem; box: number }
  | { type: "item_use"; racer: string; item: RaceItem; targets: string[] }
  | { type: "shield_block"; racer: string }
  | { type: "smash"; racer: string }
  | { type: "pad"; racer: string }
  | { type: "jump"; racer: string }
  | { type: "dodge_jump"; racer: string; kind: ObstacleKind }
  | { type: "geyser"; racer: string }
  | { type: "drift"; racer: string; dir: -1 | 1 }
  | { type: "section"; racer: string; index: 1 | 2 }
  | { type: "perfect_start"; racer: string }
  | { type: "false_start"; racer: string }
  /** provisional = còn người chơi từ xa có thể đã về trước mà chưa báo → chưa chắc thứ hạng. */
  | { type: "finish"; racer: string; place: number; provisional: boolean }
  | { type: "energy_full"; racer: string };

export const RACE = {
  length: 1200,
  lanes: 3,
  tickMs: 50,
  boostMs: 2200,
  boostMul: 1.45,
  /** Năng lượng mỗi giây = base + thể lực × hệ số. */
  energyBase: 9,
  energyPerStamina: 0.09,
  /** Đổi tốc độ hiển thị (m/s) từ chỉ số. */
  speedToMs: 0.45,
  /** Nhảy: thời gian bay + hồi chiêu (ms). */
  jumpMs: 620,
  jumpCooldownMs: 1600,
  /** Cửa sổ "xuất phát hoàn hảo" sau tiếng XUẤT PHÁT (ms). */
  perfectStartMs: 350,
  /** Mặt băng: chờ giữa 2 lần đổi làn (ms). */
  iceLaneLockMs: 380,
  /** Dòng nước ngang đẩy làn mỗi bấy nhiêu ms. */
  driftEveryMs: 1100,
  /** Thưởng năng lượng khi qua mốc chặng. */
  checkpointEnergy: 15,
  /** Cột phun: báo hiệu + thời gian phun (ms). */
  eruptWarnMs: 800,
  eruptActiveMs: 650,
};

/** Mật độ theo giải: giải cao khoảng cách ngắn hơn và vật chuyển động nhiều hơn. */
const LEAGUE_MIX: Record<RaceLeague, { gap: [number, number]; double: number; moving: number }> = {
  tap_su: { gap: [64, 100], double: 0.28, moving: 1 },
  chuyen_nghiep: { gap: [54, 88], double: 0.36, moving: 1.4 },
  huyen_thoai: { gap: [46, 76], double: 0.44, moving: 1.8 },
};
const MOVING: ReadonlySet<ObstacleKind> = new Set<ObstacleKind>(["shark", "log", "jelly", "whirl", "eruption", "tentacle", "drift"]);

/** Trạng thái chướng ngại tại thời điểm t (ms): vị trí, làn (cá mập: số thực 0..2), đang hoạt động, đang báo hiệu. */
export function obstacleAt(o: Obstacle, t: number): { x: number; lane: number; lanePos: number; active: boolean; warn: boolean } {
  switch (o.kind) {
    case "shark": {
      const lanePos = 1 + Math.sin(((t + (o.phase ?? 0)) / (o.period ?? 2400)) * Math.PI * 2);
      return { x: o.x, lane: Math.round(lanePos), lanePos, active: true, warn: false };
    }
    case "log":
      return { x: Math.max(30, o.x - ((o.speed ?? 6) * t) / 1000), lane: o.lane, lanePos: o.lane, active: true, warn: false };
    case "jelly": {
      const p = o.period ?? 1800;
      return { x: o.x, lane: o.lane, lanePos: o.lane, active: (t + (o.phase ?? 0)) % p < p * 0.55, warn: false };
    }
    case "eruption": {
      const p = o.period ?? 3000;
      const c = (t + (o.phase ?? 0)) % p;
      const active = c >= p - RACE.eruptActiveMs;
      return { x: o.x, lane: o.lane, lanePos: o.lane, active, warn: !active && c >= p - RACE.eruptActiveMs - RACE.eruptWarnMs };
    }
    case "tentacle": {
      const p = o.period ?? 2600;
      const c = (t + (o.phase ?? 0)) % p;
      const active = c < p * 0.45;
      return { x: o.x, lane: o.lane, lanePos: o.lane, active, warn: !active && c >= p - 500 };
    }
    default:
      return { x: o.x, lane: o.lane, lanePos: o.lane, active: true, warn: false };
  }
}

/**
 * Đường đua theo bản đồ + giải: 3 chặng, chặng sau dày và hiểm hơn chặng trước;
 * giải cao hơn: khoảng cách ngắn hơn, nhiều vật chuyển động hơn.
 */
export function makeTrack(rng: Rng, league: RaceLeague = "tap_su", mapId: RaceMapId = "song_que"): Obstacle[] {
  const mix = LEAGUE_MIX[league];
  const map = RACE_MAPS[mapId];
  const out: Obstacle[] = [];
  let x = 140;
  let id = 0;
  while (x < RACE.length - 80) {
    const sec = map.sections[sectionIndex(x)];
    const kinds = Object.keys(sec.w) as ObstacleKind[];
    const lane = rng.int(0, RACE.lanes - 1);
    const kind = rng.pickWeighted(kinds, (k) => (sec.w[k] ?? 0) * (MOVING.has(k) ? mix.moving : 1));
    const o: Obstacle = { id: id++, x, lane, kind };
    if (kind === "shark") {
      o.lane = 1;
      o.phase = rng.int(0, 4000);
      o.period = rng.int(1800, 3200);
    } else if (kind === "log") {
      o.speed = rng.range(4, 9);
      o.x = x + o.speed * (x / 25); // trôi ngược về – xuất phát xa hơn để tới đúng khoảng đường
    } else if (kind === "jelly") {
      o.phase = rng.int(0, 2000);
      o.period = rng.int(1400, 2200);
    } else if (kind === "eruption") {
      o.phase = rng.int(0, 3000);
      o.period = rng.int(2400, 3400);
    } else if (kind === "tentacle") {
      o.phase = rng.int(0, 2600);
      o.period = rng.int(2200, 3000);
    } else if (kind === "drift") {
      o.len = rng.range(40, 70);
      o.dir = lane === 0 ? 1 : lane === 2 ? -1 : rng.chance(0.5) ? 1 : -1;
    }
    out.push(o);
    // đôi khi chặn thêm 1 làn (không bao giờ chặn cả 3 làn; vật lớn/vùng đứng riêng)
    const solo = HELPFUL.has(kind) || kind === "shark" || kind === "tentacle";
    if (!solo && rng.chance(mix.double))
      out.push({ id: id++, x: x + rng.range(-5, 5), lane: (lane + rng.int(1, 2)) % RACE.lanes, kind: rng.chance(0.5) ? "seaweed" : "rock" });
    x += rng.range(mix.gap[0], mix.gap[1]) / sec.density + (kind === "shark" || kind === "drift" ? 25 : 0);
  }
  // hàng hộp may mắn: mỗi ~180m, 2–3 làn, tránh đè lên chướng ngại
  for (let bx = 200; bx < RACE.length - 100; bx += 180) {
    const clear = (l: number) => !out.some((o) => o.lane === l && Math.abs(o.x - bx) < 10 && o.kind !== "box");
    const lanes = [0, 1, 2].filter(clear);
    if (lanes.length >= 2) for (const l of lanes) out.push({ id: id++, x: bx, lane: l, kind: "box" });
  }
  return out;
}

/**
 * Mô phỏng một cuộc đua theo tick 50ms (tất định khi biết seed + chuỗi input).
 * Người chơi: đổi làn, NHẢY, TĂNG TỐC (+ xuất phát hoàn hảo, siêu tăng tốc trên dòng xiết).
 * Máy: đoán trước vị trí chướng ngại chuyển động, né / nhảy theo kỹ năng, tăng tốc khi đầy năng lượng.
 */
export class RaceSession {
  readonly racers: Racer[];
  readonly track: Obstacle[];
  readonly league: RaceLeague;
  readonly map: RaceMapId;
  private readonly seedKey: string;
  /** Có người chơi từ xa (phòng nhiều người). */
  private get multi(): boolean {
    return this.racers.some((q) => q.remote);
  }
  time = 0;
  over = false;
  private rng: Rng;
  private acc = 0;
  private events: RaceEvent[] = [];
  private passed = new Map<string, Set<number>>();
  private aiPlan = new Map<string, Map<number, "jump" | "lane" | "ignore">>();
  private finishedOrder: string[] = [];
  private endAt: number | null = null;
  private started = new Set<string>();

  private readonly meId: string;

  /**
   * @param order thứ tự xuất phát (đua nhiều người: theo ô do máy chủ chia, để mọi máy có cùng làn xuất phát).
   */
  constructor(player: Racer, opponents: Racer[], seed: number, order?: Racer[], league: RaceLeague = "tap_su", map: RaceMapId = "song_que") {
    this.rng = new Rng(seed);
    this.seedKey = String(seed);
    this.league = league;
    this.map = map;
    this.track = makeTrack(this.rng, league, map);
    this.meId = player.id;
    this.racers = order ?? [player, ...opponents];
    // xếp làn xuất phát xen kẽ
    this.racers.forEach((r, i) => {
      r.lane = i % RACE.lanes;
      r.x = -i * 4; // xuất phát so le để không chồng lên nhau
      r.jumpUntil = 0;
      r.jumpReadyAt = 0;
      this.passed.set(r.id, new Set());
      this.aiPlan.set(r.id, new Map());
    });
  }

  get player(): Racer {
    return this.racers.find((r) => r.id === this.meId)!;
  }

  /** Cập nhật người chơi khác từ mạng. */
  setRemote(id: string, st: { x: number; lane: number; boosting: boolean; finishTime: number | null }) {
    const r = this.racers.find((x) => x.id === id && x.remote);
    if (!r) return;
    r.v = Math.max(0, (st.x - r.x) * 2);
    r.x = st.x;
    r.lane = Math.min(RACE.lanes - 1, Math.max(0, st.lane));
    r.boostUntil = st.boosting ? this.time + 300 : Math.min(r.boostUntil, this.time);
    if (st.finishTime !== null && r.finishTime === null) r.finishTime = st.finishTime;
  }

  drainEvents(): RaceEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  topSpeed(r: Racer): number {
    return r.stats.speed * RACE.speedToMs;
  }

  /** Đổi làn (−1 lên, +1 xuống). Đang bay thì không đổi được. */
  changeLane(id: string, dir: -1 | 1): boolean {
    const r = this.racers.find((x) => x.id === id);
    if (!r || r.finishTime !== null || this.over || this.isJumping(r)) return false;
    if (this.time < (r.laneLockUntil ?? 0)) return false; // mặt băng trơn
    const lane = Math.min(RACE.lanes - 1, Math.max(0, r.lane + dir));
    if (lane === r.lane) return false;
    r.lane = lane;
    if (this.sectionOf(r).ice) r.laneLockUntil = this.time + RACE.iceLaneLockMs;
    return true;
  }

  /** Chặng hiện tại của một tay đua. */
  sectionOf(r: Racer): RaceSectionDef {
    return RACE_MAPS[this.map].sections[sectionIndex(Math.max(0, r.x))];
  }

  isJumping(r: Racer): boolean {
    return this.time < (r.jumpUntil ?? 0);
  }

  canJump(r: Racer): boolean {
    return r.finishTime === null && this.time >= (r.jumpReadyAt ?? 0) && !this.isJumping(r);
  }

  /** NHẢY qua chướng ngại phía trước (có hồi chiêu). */
  jump(id: string): boolean {
    const r = this.racers.find((x) => x.id === id);
    if (!r || this.over || !this.canJump(r)) return false;
    r.jumpUntil = this.time + RACE.jumpMs;
    r.jumpReadyAt = this.time + RACE.jumpCooldownMs;
    this.events.push({ type: "jump", racer: r.id });
    return true;
  }

  canBoost(r: Racer): boolean {
    return r.energy >= 100 && r.finishTime === null && this.time >= r.boostUntil;
  }

  boost(id: string): boolean {
    const r = this.racers.find((x) => x.id === id);
    if (!r || this.over) return false;
    // xuất phát hoàn hảo: bấm đúng lúc vừa XUẤT PHÁT (chỉ 1 lần)
    if (this.time <= RACE.perfectStartMs && !this.started.has(r.id)) {
      this.started.add(r.id);
      r.v = this.topSpeed(r) * 0.75;
      this.events.push({ type: "perfect_start", racer: r.id });
      return true;
    }
    if (!this.canBoost(r)) return false;
    const onPad = this.time < r.padUntil;
    r.energy = 0;
    r.boostUntil = this.time + RACE.boostMs + r.stats.stamina * 8 + (onPad ? 1200 : 0);
    r.v += this.topSpeed(r) * (onPad ? 0.35 : 0.2);
    r.slowUntil = 0;
    r.boosts++;
    this.events.push({ type: "boost", racer: r.id, super: onPad });
    return true;
  }

  /** Dùng đồ đang cầm. Đồ tấn công chỉ nhắm tay đua mô phỏng ở máy này (máy & mình). */
  useItem(id: string): boolean {
    const r = this.racers.find((x) => x.id === id);
    if (!r || !r.item || r.finishTime !== null || this.over) return false;
    const item = r.item;
    r.item = null;
    const targets: string[] = [];
    const ahead = this.racers.filter((o) => o !== r && !o.remote && o.finishTime === null && o.x > r.x && !(this.multi && r.aiSkill !== null && o.aiSkill === null));
    const hitBy = (t: Racer, slowMs: number, ink: boolean) => {
      if (this.time < (t.shieldUntil ?? 0)) {
        t.shieldUntil = 0;
        this.events.push({ type: "shield_block", racer: t.id });
        return;
      }
      t.slowUntil = Math.max(t.slowUntil, this.time + slowMs);
      t.boostUntil = Math.min(t.boostUntil, this.time);
      if (ink) t.inkUntil = this.time + 1600;
      targets.push(t.id);
    };
    if (item === "turbo") {
      r.boostUntil = Math.max(r.boostUntil, this.time) + 1600;
      r.v += this.topSpeed(r) * 0.25;
      r.slowUntil = 0;
    } else if (item === "shield") r.shieldUntil = this.time + 8000;
    else if (item === "ink") {
      const t = ahead.sort((a, b) => a.x - b.x)[0];
      if (t) hitBy(t, 1300, true);
    } else for (const t of ahead) hitBy(t, 950, false);
    this.events.push({ type: "item_use", racer: r.id, item, targets });
    return true;
  }

  /** Bấm tăng tốc khi chưa xuất phát → khựng lại lúc xuất phát. */
  falseStart(id: string) {
    const r = this.racers.find((x) => x.id === id);
    if (!r || this.started.has(r.id)) return;
    this.started.add(r.id);
    r.slowUntil = 900;
    this.events.push({ type: "false_start", racer: r.id });
  }

  update(dtMs: number) {
    this.acc += Math.min(250, dtMs);
    while (this.acc >= RACE.tickMs && !this.over) {
      this.acc -= RACE.tickMs;
      this.tick();
    }
  }

  /** Thứ hạng hiện tại (đã về đích trước, sau đó theo quãng đường). */
  standings(): Racer[] {
    return [...this.racers].sort((a, b) => {
      if (a.finishTime !== null && b.finishTime !== null) return a.finishTime - b.finishTime;
      if (a.finishTime !== null) return -1;
      if (b.finishTime !== null) return 1;
      return b.x - a.x;
    });
  }

  /**
   * Thứ hạng về đích của một tay đua, tính cả người chơi từ xa đã báo về đích.
   * Chưa chắc chắn khi còn người chơi từ xa chưa báo về đích mà đang sát/vượt (có thể đã về trước).
   */
  finishRank(r: Racer): { place: number; provisional: boolean } {
    const t = r.finishTime ?? Infinity;
    const before = this.racers.filter((o) => o !== r && o.finishTime !== null && o.finishTime < t).length;
    const unsure = this.racers.some((o) => o !== r && o.remote && o.finishTime === null && o.x >= r.x - 30);
    return { place: before + 1, provisional: unsure };
  }

  placeOf(id: string): number {
    return this.standings().findIndex((r) => r.id === id) + 1;
  }

  /**
   * Chướng ngại nguy hiểm gần nhất phía trước ở 1 làn, ĐOÁN TRƯỚC theo thời điểm sẽ tới
   * (cá mập đổi làn, gỗ trôi lại gần, sứa nổi/chìm). Dùng cho máy và gợi ý.
   */
  hazardAhead(r: Racer, lane: number, lookM: number): { o: Obstacle; dist: number } | null {
    let best: { o: Obstacle; dist: number } | null = null;
    const v = Math.max(4, r.v);
    for (const o of this.track) {
      if (HELPFUL.has(o.kind) || this.passed.get(r.id)!.has(o.id)) continue;
      const now = obstacleAt(o, this.time);
      if (now.x < r.x - 2) continue;
      const closing = v + (o.kind === "log" ? (o.speed ?? 6) : 0);
      const dist = now.x - r.x;
      if (dist > lookM) continue;
      const at = obstacleAt(o, this.time + (dist / closing) * 1000);
      if (at.lane !== lane || !at.active) continue;
      if (!best || dist < best.dist) best = { o, dist };
    }
    return best;
  }

  private tick() {
    const dt = RACE.tickMs / 1000;
    const tPrev = this.time;
    this.time += RACE.tickMs;
    for (const r of this.racers) {
      if (r.remote) continue;
      if (r.finishTime !== null) {
        r.x += r.v * dt;
        r.v *= 0.97;
        continue;
      }
      if (r.aiSkill !== null) this.aiThink(r);
      // năng lượng
      if (this.time >= r.boostUntil) {
        const before = r.energy;
        r.energy = Math.min(100, r.energy + (RACE.energyBase + r.stats.stamina * RACE.energyPerStamina) * dt);
        if (before < 100 && r.energy >= 100) this.events.push({ type: "energy_full", racer: r.id });
      }
      const boosting = this.time < r.boostUntil;
      const slowed = this.time < r.slowUntil;
      const pad = this.time < r.padUntil;
      // đuối sức nửa sau đường đua (thể lực cao đỡ đuối)
      const prog = r.x / RACE.length;
      const fatigue = 1 - Math.max(0, prog - 0.5) * Math.max(0, 1 - r.stats.stamina / 120) * 0.3;
      const target = this.topSpeed(r) * fatigue * (boosting ? RACE.boostMul : 1) * (slowed ? 0.45 : 1) * (pad ? 1.25 : 1);
      const k = Math.min(1, (0.25 + r.stats.accel / 90) * dt * (target < r.v ? 2.5 : 1));
      r.v += (target - r.v) * k;
      const x0 = r.x;
      r.x += r.v * dt;
      const airborne = this.isJumping(r);
      // qua mốc chặng: khung cảnh đổi + thưởng năng lượng
      for (const [i, m] of SECTION_MARKS.entries())
        if (x0 < m && r.x >= m) {
          r.energy = Math.min(100, r.energy + RACE.checkpointEnergy);
          this.events.push({ type: "section", racer: r.id, index: (i + 1) as 1 | 2 });
        }
      // dòng nước ngang: đẩy lệch làn theo nhịp (đang tăng tốc / đang bay thì không bị đẩy)
      if (!airborne && !boosting && Math.floor(this.time / RACE.driftEveryMs) !== Math.floor(tPrev / RACE.driftEveryMs))
        for (const o of this.track) {
          if (o.kind !== "drift" || r.x < o.x || r.x > o.x + (o.len ?? 50)) continue;
          const nl = Math.min(RACE.lanes - 1, Math.max(0, r.lane + (o.dir ?? 1)));
          if (nl !== r.lane) {
            r.lane = nl;
            this.events.push({ type: "drift", racer: r.id, dir: o.dir ?? 1 });
          }
          break;
        }
      // va chạm: đi qua vị trí chướng ngại trong tick này (tính cả vật chuyển động)
      for (const o of this.track) {
        const seen = this.passed.get(r.id)!;
        if (seen.has(o.id)) continue;
        const a = obstacleAt(o, tPrev);
        const b = obstacleAt(o, this.time);
        if (!(a.x - x0 > 0 && b.x - r.x <= 0)) continue;
        seen.add(o.id);
        if (b.lane !== r.lane || !b.active) continue;
        if (o.kind === "drift") continue;
        if (o.kind === "box") {
          if (airborne || r.item) continue;
          // phòng nhiều người: máy chỉ so với máy (để mọi máy chơi giống hệt nhau)
          const pool = r.aiSkill !== null && this.multi ? this.racers.filter((q) => q.aiSkill !== null) : this.racers;
          const place = 1 + pool.filter((q) => q !== r && q.x > r.x).length;
          r.item = rollItem(`${this.seedKey}:${o.id}:${r.id}`, place, pool.length);
          this.events.push({ type: "item_get", racer: r.id, item: r.item, box: o.id });
          continue;
        }
        if (o.kind === "geyser") {
          if (airborne) continue;
          // mạch phun hất bay cao + tăng tốc (không tốn hồi chiêu nhảy)
          r.jumpUntil = this.time + RACE.jumpMs + 300;
          r.v += this.topSpeed(r) * 0.15;
          this.events.push({ type: "geyser", racer: r.id });
          continue;
        }
        if (o.kind === "current") {
          if (airborne) continue; // bay qua thì lỡ dòng xiết
          r.padUntil = this.time + 1300;
          this.events.push({ type: "pad", racer: r.id });
          continue;
        }
        if (airborne && JUMPABLE.has(o.kind)) {
          this.events.push({ type: "dodge_jump", racer: r.id, kind: o.kind });
          continue;
        }
        if (boosting && o.kind === "seaweed") {
          // đang tăng tốc thì xé toạc rong biển
          this.events.push({ type: "smash", racer: r.id });
          continue;
        }
        if (this.time < (r.shieldUntil ?? 0)) {
          r.shieldUntil = 0;
          this.events.push({ type: "shield_block", racer: r.id });
          continue;
        }
        r.hits++;
        const heavy = o.kind !== "seaweed" && o.kind !== "jelly";
        r.slowUntil = this.time + (o.kind === "whirl" ? 1500 : o.kind === "shark" || o.kind === "tentacle" ? 1300 : heavy ? 1100 : 800);
        if (heavy) {
          r.v *= o.kind === "whirl" ? 0.2 : o.kind === "shark" || o.kind === "tentacle" ? 0.3 : 0.45;
          r.boostUntil = Math.min(r.boostUntil, this.time);
        }
        const drain: Partial<Record<ObstacleKind, number>> = { shark: 40, tentacle: 35, eruption: 30, jelly: 25 };
        if (drain[o.kind]) r.energy = Math.max(0, r.energy - drain[o.kind]!);
        this.events.push({ type: "hit", racer: r.id, kind: o.kind as Exclude<ObstacleKind, "current" | "geyser" | "drift" | "box"> });
      }
      if (r.x >= RACE.length) {
        r.finishTime = this.time;
        this.finishedOrder.push(r.id);
        const fin = this.finishRank(r);
        this.events.push({ type: "finish", racer: r.id, place: fin.place, provisional: fin.provisional });
        if (r.id === this.player.id && this.endAt === null) this.endAt = this.time + 3000;
      }
    }
    if (this.racers.every((r) => r.finishTime !== null || r.remote) && this.player.finishTime !== null) this.over = true;
    if (this.endAt !== null && this.time >= this.endAt) this.over = true;
    // giới hạn an toàn: 3 phút
    if (this.time > 180_000) this.over = true;
  }

  /** Máy đổi làn theo đúng luật như người chơi (mặt băng, đang bay). */
  private aiSetLane(r: Racer, lane: number) {
    if (this.isJumping(r) || this.time < (r.laneLockUntil ?? 0) || lane === r.lane) return;
    r.lane = lane;
    if (this.sectionOf(r).ice) r.laneLockUntil = this.time + RACE.iceLaneLockMs;
  }

  /** Máy: đoán trước chướng ngại (kể cả vật chuyển động) → nhảy hoặc đổi làn theo kỹ năng; xuất phát đẹp; tăng tốc. */
  private aiThink(r: Racer) {
    const skill = r.aiSkill ?? 0;
    if (!this.started.has(r.id)) {
      this.started.add(r.id);
      if (this.rng.chance(skill * 0.5)) r.v = this.topSpeed(r) * 0.6;
    }
    const plan = this.aiPlan.get(r.id)!;
    const look = 20 + r.v * 1.0;
    const h = this.hazardAhead(r, r.lane, look);
    if (h) {
      let choice = plan.get(h.o.id);
      if (!choice) {
        choice = !this.rng.chance(skill) ? "ignore" : JUMPABLE.has(h.o.kind) && this.rng.chance(0.55) ? "jump" : "lane";
        plan.set(h.o.id, choice);
        if (choice === "lane") {
          const options = [r.lane - 1, r.lane + 1].filter((l) => l >= 0 && l < RACE.lanes && !this.hazardAhead(r, l, look));
          if (options.length) this.aiSetLane(r, pick(this.rng, options));
          else if (JUMPABLE.has(h.o.kind)) plan.set(h.o.id, "jump");
        }
      }
      // nhảy đúng lúc: khi còn ~0,3 giây tới chướng ngại
      if (plan.get(h.o.id) === "jump" && h.dist < Math.max(4, r.v * 0.32) && this.canJump(r)) this.jump(r.id);
    } else {
      const padAhead = this.track.find((o) => (o.kind === "current" || o.kind === "geyser") && o.x > r.x && o.x < r.x + look && Math.abs(o.lane - r.lane) === 1 && !plan.has(o.id));
      if (padAhead) {
        plan.set(padAhead.id, "lane");
        if (!this.hazardAhead(r, padAhead.lane, padAhead.x - r.x) && this.rng.chance(skill * 0.6)) this.aiSetLane(r, padAhead.lane);
      }
    }
    if (this.canBoost(r) && this.rng.chance(0.02 + skill * 0.03)) this.boost(r.id);
    // dùng đồ: khiên dùng ngay; tên lửa khi đường trống; bom mực/sấm sét khi có người dẫn trước gần
    if (r.item) {
      const near = this.racers.some((o) => o !== r && !o.remote && o.finishTime === null && o.x > r.x && o.x - r.x < 70 && !(this.multi && o.aiSkill === null));
      const want = r.item === "shield" || (r.item === "turbo" ? !this.hazardAhead(r, r.lane, 45) : near);
      if (want && this.rng.chance(0.04 + skill * 0.06)) this.useItem(r.id);
    }
  }
}

// ------------------------------------------------------------------ phần thưởng (sổ cái)
/** Ghi danh: trừ phí vào cửa. */
export function applyRaceEntry(save: PlayerSave, input: { txId: string; league: RaceLeague; fishUid: string; now: number }): ActionResult {
  if (save.appliedTx.includes(input.txId)) return { ok: false, error: "Đã ghi danh" };
  const L = RACE_LEAGUES[input.league];
  if (!L) return { ok: false, error: "Giải không tồn tại" };
  if (save.level < L.minLevel) return { ok: false, error: `Cần cấp ${L.minLevel} để vào ${L.name}` };
  if (!save.fishes.some((f) => f.uid === input.fishUid)) return { ok: false, error: "Không tìm thấy cá" };
  if (save.gold < L.fee) return { ok: false, error: `Cần ${L.fee} vàng phí vào cửa` };
  const s = clone(save);
  s.gold -= L.fee;
  addLedger(s, input.txId, "gold", -L.fee, `race_entry:${input.league}`, input.now);
  markTx(s, input.txId);
  s.updatedAt = input.now;
  return { ok: true, save: s };
}

export interface RaceReward {
  gold: number;
  diamonds: number;
  xp: number;
}

export function raceReward(league: RaceLeague, place: number): RaceReward {
  const L = RACE_LEAGUES[league];
  return { gold: L.prizes[place - 1] ?? 0, diamonds: place === 1 ? L.firstDiamonds : 0, xp: place <= 3 ? L.xp : Math.round(L.xp / 3) };
}

/** Nhận thưởng sau cuộc đua (mỗi lần ghi danh chỉ nhận 1 lần). */
export function applyRaceResult(save: PlayerSave, input: { entryTx: string; league: RaceLeague; place: number; now: number }): ActionResult & { reward?: RaceReward } {
  const txId = `${input.entryTx}_r`;
  if (!save.appliedTx.includes(input.entryTx)) return { ok: false, error: "Chưa ghi danh cuộc đua này" };
  if (save.appliedTx.includes(txId)) return { ok: false, error: "Đã nhận thưởng cuộc đua này" };
  if (!Number.isInteger(input.place) || input.place < 1 || input.place > 5) return { ok: false, error: "Thứ hạng không hợp lệ" };
  const rw = raceReward(input.league, input.place);
  const s = clone(save);
  if (rw.gold) {
    s.gold += rw.gold;
    addLedger(s, txId, "gold", rw.gold, `race_prize:${input.league}:${input.place}`, input.now);
  }
  if (rw.diamonds) {
    s.diamonds += rw.diamonds;
    addLedger(s, txId, "diamonds", rw.diamonds, `race_prize:${input.league}:${input.place}`, input.now);
  }
  if (rw.xp) {
    addLedger(s, txId, "xp", rw.xp, `race:${input.league}`, input.now);
    grantXp(s, rw.xp);
  }
  s.stats.races = (s.stats.races ?? 0) + 1;
  if (input.place === 1) s.stats.raceWins = (s.stats.raceWins ?? 0) + 1;
  markTx(s, txId);
  s.updatedAt = input.now;
  return { ok: true, save: s, reward: rw };
}

/** Cá hợp đua nhất trong kho (điểm cao trước). */
export function raceCandidates(fishes: OwnedFish[], fishById: Map<string, FishDef>, formById?: Map<string, FishFormDef>, limit = 12) {
  return fishes
    .filter((f) => fishById.has(f.fishId))
    .map((f) => ({ fish: f, stats: raceStats(f, fishById.get(f.fishId)!, f.form ? formById?.get(f.form) : null) }))
    .sort((a, b) => b.stats.score - a.stats.score)
    .slice(0, limit);
}
