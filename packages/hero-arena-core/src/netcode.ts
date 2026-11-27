import type { Arena, ArenaEvent, FighterInput, TargetMode } from "./arena.ts";
import { heroById } from "./heroes.ts";
import { upgradeById } from "./progression.ts";
import type { SkillSlot } from "./types.ts";

// Chơi chung: máy chủ phòng chạy trận thật và phát "ảnh chụp" trạng thái gọn (≤ ~3,9 KB JSON);
// máy khác dựng cùng trận từ cùng seed rồi chỉ áp ảnh chụp. Thao tác người chơi gửi ngược lại.

/** Trường `s` của chủ phòng; cả đối tượng "trạng thái người tham gia" tối đa 4 KiB nên chừa chỗ cho tên & lệnh bắt đầu. */
export const SNAPSHOT_BUDGET = 3400;
/** Sự kiện giữ lại để gửi lặp (ảnh chụp có thể rơi) – giây. */
const EVENT_KEEP_SEC = 0.6;

const SLOTS: SkillSlot[] = ["s1", "s2", "s3", "ult"];
const MODES: TargetMode[] = ["auto", "monster", "prop"];

export interface Snapshot {
  v: 1;
  /** Thời gian trận (×10). */
  t: number;
  /** Vòng bo: giai đoạn, pha (0 chờ / 1 thu / 2 xong), giây còn ×10, tâm, bán kính, tâm & bán kính đích, sát thương. */
  z: number[];
  /** Đấu thủ theo thứ tự: [x, y, vx, vy, faceX×100, faceY×100, hp, maxHp, cấp, nhánh, dạng3, cờ, hạ gục, hạng]. */
  f: number[][];
  /** Quái còn sống: [chỉ số, x, y, máu %]. */
  m: number[][];
  /** Tổng số quái còn sống (để biết danh sách `m` có bị cắt bớt không). */
  mc: number;
  /** Đạn: [x, y, vx, vy, bán kính, màu]. */
  p: number[][];
  /** Vùng hiệu ứng: [x, y, bán kính, màu, giây còn ×10]. */
  fl: number[][];
  /** Vật thể đã vỡ: chuỗi bit (base36 theo nhóm 30 bit). */
  g: string;
  /** Vật thể đang bị đánh dở: [chỉ số, máu %]. */
  ph: number[][];
  /** Chi tiết riêng từng người chơi thật. */
  h: Record<string, number[] | string>;
  /** Sự kiện gần đây: [số thứ tự, sự kiện]. */
  e: Array<[number, ArenaEvent]>;
  /** Đã kết thúc, người thắng. */
  w: string | null;
}

/** Sổ sự kiện phía chủ phòng: đánh số thứ tự, giữ lại một lúc để gửi lặp. */
export class EventLog {
  private seq = 0;
  private items: Array<{ seq: number; at: number; ev: ArenaEvent }> = [];

  push(evs: ArenaEvent[], now: number, humanIds: Set<string>): void {
    for (const ev of evs) {
      if (!networthy(ev, humanIds)) continue;
      this.items.push({ seq: ++this.seq, at: now, ev });
    }
    const cut = now - EVENT_KEEP_SEC;
    while (this.items.length && (this.items[0]?.at ?? 0) < cut) this.items.shift();
  }

  recent(): Array<[number, ArenaEvent]> {
    return this.items.map((i) => [i.seq, i.ev]);
  }
}

/** Sự kiện đáng gửi qua mạng (bớt "trúng đòn" lặt vặt giữa máy với máy). */
function networthy(ev: ArenaEvent, humans: Set<string>): boolean {
  switch (ev.type) {
    case "hit":
      return humans.has(ev.targetId) || humans.has(ev.sourceId);
    case "loot":
    case "levelup":
    case "branch_needed":
    case "evolution_needed":
    case "offer":
      return humans.has(ev.fighterId);
    case "fx":
      return ev.kind !== "attack";
    case "prop_hit":
      return humans.has(ev.sourceId);
    default:
      return true;
  }
}

const r1 = (v: number) => Math.round(v);
const r10 = (v: number) => Math.round(v * 10);

function bitsToString(bits: boolean[]): string {
  const parts: string[] = [];
  for (let i = 0; i < bits.length; i += 30) {
    let n = 0;
    for (let k = 0; k < 30 && i + k < bits.length; k++) if (bits[i + k]) n |= 1 << k;
    parts.push(n.toString(36));
  }
  return parts.join(".");
}

function stringToBits(s: string, len: number): boolean[] {
  const out = new Array<boolean>(len).fill(false);
  s.split(".").forEach((part, gi) => {
    const n = parseInt(part || "0", 36);
    for (let k = 0; k < 30; k++) if (n & (1 << k)) out[gi * 30 + k] = true;
  });
  return out;
}

/** Chụp trạng thái trận để phát cho người chơi khác (gọn trong SNAPSHOT_BUDGET). */
export function encodeSnapshot(a: Arena, log: EventLog, humanIds: string[], budget = SNAPSHOT_BUDGET): Snapshot {
  const z = a.zone;
  const snap: Snapshot = {
    v: 1,
    t: r10(a.time),
    z: [z.stage, z.phase === "wait" ? 0 : z.phase === "shrink" ? 1 : 2, r10(z.timer), r1(z.centerX), r1(z.centerY), r1(z.radius), r1(z.targetX), r1(z.targetY), r1(z.targetRadius), r1(z.dps)],
    f: a.fighters.map((f) => {
      const hero = heroById(f.state.heroId);
      const bi = hero ? hero.branches.findIndex((b) => b.id === f.state.branchId) : -1;
      const ei = hero && bi >= 0 ? (hero.branches[bi]?.evolutions.findIndex((e) => e.id === f.state.evolutionId) ?? -1) : -1;
      const flags = (f.state.alive ? 1 : 0) | (a.time < f.protectUntil ? 2 : 0) | (f.respawnAt !== null ? 4 : 0) | (f.shieldHp > 0 ? 8 : 0);
      return [r1(f.x), r1(f.y), r1(f.vx), r1(f.vy), Math.round(f.faceX * 100), Math.round(f.faceY * 100), r1(f.state.hp), r1(f.state.maxHp), f.state.level, bi, ei, flags, f.state.kills, f.placement ?? 0];
    }),
    m: [],
    mc: 0,
    p: a.projectiles.map((p) => [r1(p.x), r1(p.y), r1(p.vx), r1(p.vy), r1(p.radius), p.color]),
    fl: a.fields.map((fl) => [r1(fl.x), r1(fl.y), r1(fl.radius), fl.color, r10(Math.max(0, fl.until - a.time))]),
    g: bitsToString(a.props.map((p) => !p.alive)),
    ph: [],
    h: {},
    e: log.recent(),
    w: a.finished ? a.winnerId : null,
  };
  a.props.forEach((p, i) => {
    if (p.alive && p.maxHp > 0 && p.hp < p.maxHp) snap.ph.push([i, Math.round((p.hp / p.maxHp) * 100)]);
  });
  for (const id of humanIds) {
    const f = a.fighterById(id);
    if (!f) continue;
    const s = f.state;
    const offer = s.pendingOffers[0]?.map((c) => c.upgradeId).join(",") ?? "";
    snap.h[id] = [
      r1(s.mana), r1(s.maxMana), r1(s.stamina), r1(s.maxStamina),
      ...SLOTS.map((k) => r10(f.cd[k])),
      s.needsBranch ? 1 : 0, s.needsEvolution ? 1 : 0, s.pendingOffers.length,
      f.potions, f.gold, f.lives, f.respawnAt === null ? -1 : r10(f.respawnAt), r1(s.exp), f.potionsUsed + f.lostPotions,
    ];
    if (offer) snap.h[`${id}.o`] = offer;
  }
  // quái: gần người chơi thật trước; cắt bớt khi vượt ngân sách
  const humans = humanIds.map((id) => a.fighterById(id)).filter((f) => f !== undefined);
  const mons = a.monsters
    .map((m, i) => ({ m, i, d: Math.min(...humans.map((h) => Math.hypot(h.x - m.x, h.y - m.y)), Infinity) }))
    .filter((o) => o.m.alive)
    .sort((x, y) => x.d - y.d);
  snap.m = mons.map((o) => [o.i, r1(o.m.x), r1(o.m.y), Math.round((o.m.hp / o.m.maxHp) * 100)]);
  snap.mc = snap.m.length;
  // giữ trong ngân sách: bỏ bớt sự kiện cũ, rồi quái xa, rồi đạn
  let size = JSON.stringify(snap).length;
  while (size > budget && snap.e.length > 4) {
    snap.e.shift();
    size = JSON.stringify(snap).length;
  }
  while (size > budget && snap.m.length > 10) {
    snap.m.splice(Math.max(10, snap.m.length - 8));
    size = JSON.stringify(snap).length;
  }
  while (size > budget && snap.p.length > 0) {
    snap.p.splice(Math.floor(snap.p.length / 2));
    size = JSON.stringify(snap).length;
  }
  return snap;
}

/** Vị trí đích của đấu thủ/quái (máy khách tự trượt dần tới để mượt). */
export interface NetTargets {
  fighters: Map<string, { x: number; y: number }>;
  monsters: Map<string, { x: number; y: number }>;
}

/** Áp ảnh chụp vào trận ở máy khách. Trả về vị trí đích + các sự kiện mới (chưa xử lý). */
export function applySnapshot(a: Arena, snap: Snapshot, lastSeq: number): { targets: NetTargets; events: ArenaEvent[]; lastSeq: number } {
  const targets: NetTargets = { fighters: new Map(), monsters: new Map() };
  a.time = snap.t / 10;
  const z = a.zone;
  const [stage, phase, timer, cx, cy, r, tx, ty, tr, dps] = snap.z;
  z.stage = stage ?? z.stage;
  z.phase = phase === 0 ? "wait" : phase === 1 ? "shrink" : "done";
  z.timer = (timer ?? 0) / 10;
  z.centerX = cx ?? z.centerX;
  z.centerY = cy ?? z.centerY;
  z.radius = r ?? z.radius;
  z.targetX = tx ?? z.targetX;
  z.targetY = ty ?? z.targetY;
  z.targetRadius = tr ?? z.targetRadius;
  z.dps = dps ?? z.dps;
  snap.f.forEach((row, i) => {
    const f = a.fighters[i];
    if (!f) return;
    const [x, y, vx, vy, fx, fy, hp, maxHp, level, bi, ei, flags, kills, placement] = row as number[];
    const hero = heroById(f.state.heroId);
    const br = hero && (bi ?? -1) >= 0 ? hero.branches[bi ?? 0] : undefined;
    const evo = br && (ei ?? -1) >= 0 ? br.evolutions[ei ?? 0] : undefined;
    const wasAlive = f.state.alive;
    const alive = ((flags ?? 0) & 1) === 1;
    targets.fighters.set(f.id, { x: x ?? f.x, y: y ?? f.y });
    // vừa hồi sinh / mới thấy lại: nhảy thẳng tới chỗ mới
    if (alive && !wasAlive) {
      f.x = x ?? f.x;
      f.y = y ?? f.y;
    }
    f.vx = vx ?? 0;
    f.vy = vy ?? 0;
    f.faceX = (fx ?? 100) / 100;
    f.faceY = (fy ?? 0) / 100;
    f.state.hp = hp ?? f.state.hp;
    f.state.maxHp = maxHp ?? f.state.maxHp;
    f.state.level = level ?? f.state.level;
    f.state.branchId = br?.id ?? null;
    f.state.evolutionId = evo?.id ?? null;
    f.state.alive = alive;
    f.protectUntil = ((flags ?? 0) & 2) === 2 ? a.time + 0.3 : 0;
    f.respawnAt = ((flags ?? 0) & 4) === 4 ? (f.respawnAt ?? a.time + 5) : null;
    f.shieldHp = ((flags ?? 0) & 8) === 8 ? Math.max(1, f.shieldHp) : 0;
    f.state.kills = kills ?? 0;
    f.placement = placement ? placement : null;
    const extra = snap.h[f.id];
    if (Array.isArray(extra)) {
      const [mana, maxMana, sta, maxSta, c1, c2, c3, c4, nb, ne, offers, potions, gold, lives, respAt, exp, usedPots] = extra;
      f.state.mana = mana ?? 0;
      f.state.maxMana = maxMana ?? 1;
      f.state.stamina = sta ?? 0;
      f.state.maxStamina = maxSta ?? 1;
      f.cd = { s1: (c1 ?? 0) / 10, s2: (c2 ?? 0) / 10, s3: (c3 ?? 0) / 10, ult: (c4 ?? 0) / 10 };
      f.state.needsBranch = nb === 1;
      f.state.needsEvolution = ne === 1;
      f.potions = potions ?? 0;
      f.gold = gold ?? 0;
      f.lives = lives ?? 0;
      f.respawnAt = (respAt ?? -1) >= 0 ? (respAt ?? 0) / 10 : null;
      f.state.exp = exp ?? 0;
      f.potionsUsed = usedPots ?? 0;
      f.lostPotions = 0;
      const offerIds = snap.h[`${f.id}.o`];
      const count = offers ?? 0;
      f.state.pendingOffers = [];
      if (typeof offerIds === "string" && count > 0) {
        f.state.pendingOffers.push(
          offerIds.split(",").map((uid, k) => {
            const u = upgradeById(uid);
            return { id: `net_${k}_${uid}`, upgradeId: uid, title: u?.titleVi ?? uid, description: u?.descVi ?? "", pool: u?.pool ?? "stat_enhancement", rarity: u?.rarity ?? "common" };
          }),
        );
      }
    }
  });
  // quái
  const seen = new Set<number>();
  for (const [i, x, y, hpPct] of snap.m) {
    const m = a.monsters[i ?? -1];
    if (!m) continue;
    seen.add(i ?? -1);
    if (!m.alive) {
      m.x = x ?? m.x;
      m.y = y ?? m.y;
    }
    m.alive = true;
    m.hp = ((hpPct ?? 100) / 100) * m.maxHp;
    targets.monsters.set(m.id, { x: x ?? m.x, y: y ?? m.y });
  }
  // danh sách đầy đủ → quái vắng mặt là đã chết; bị cắt bớt (quái xa) → giữ nguyên
  if (snap.m.length >= snap.mc) a.monsters.forEach((m, i) => {
    if (!seen.has(i)) m.alive = false;
  });
  // đạn & vùng hiệu ứng: thay toàn bộ (chỉ để vẽ)
  a.projectiles.length = 0;
  snap.p.forEach(([x, y, vx, vy, rad, color], k) => {
    a.projectiles.push({ id: k, ownerId: "", x: x ?? 0, y: y ?? 0, vx: vx ?? 0, vy: vy ?? 0, life: 1, damage: 0, radius: rad ?? 8, pierce: false, color: color ?? 0xffffff, hit: new Set(), isSkill: false });
  });
  a.fields.length = 0;
  snap.fl.forEach(([x, y, rad, color, ttl], k) => {
    a.fields.push({ id: k, ownerId: "", x: x ?? 0, y: y ?? 0, radius: rad ?? 50, dps: 0, slowPct: 0, until: a.time + (ttl ?? 0) / 10, color: color ?? 0xffffff, pvpMul: 0 });
  });
  // vật thể
  const gone = stringToBits(snap.g, a.props.length);
  a.props.forEach((p, i) => {
    if (gone[i]) p.alive = false;
    else if (p.maxHp > 0) p.hp = p.maxHp;
  });
  for (const [i, pct] of snap.ph) {
    const p = a.props[i ?? -1];
    if (p) p.hp = ((pct ?? 100) / 100) * p.maxHp;
  }
  if (snap.w !== null) {
    a.finished = true;
    a.winnerId = snap.w;
  }
  // sự kiện mới
  const events: ArenaEvent[] = [];
  let maxSeq = lastSeq;
  for (const [seq, ev] of snap.e) {
    if (seq <= lastSeq) continue;
    events.push(ev);
    maxSeq = Math.max(maxSeq, seq);
  }
  return { targets, events, lastSeq: maxSeq };
}

/** Thao tác người chơi gửi lên chủ phòng (qua "trạng thái người tham gia"). */
export interface NetInput {
  /** [moveX×100, moveY×100, đánh 0/1, chế độ khoá 0..2, số lần dùng kỹ năng, ô kỹ năng (0..3), số lần uống bình]. */
  i: number[];
  /** Lựa chọn gần nhất: [số thứ tự, loại 0 Dạng 2 / 1 Dạng 3 / 2 thẻ, mã]. */
  c?: [number, number, string];
}

export function encodeInput(inp: FighterInput, castSeq: number, castSlot: SkillSlot | null, potionSeq: number): number[] {
  return [Math.round(inp.moveX * 100), Math.round(inp.moveY * 100), inp.attack ? 1 : 0, MODES.indexOf(inp.targetMode ?? "auto"), castSeq, castSlot ? SLOTS.indexOf(castSlot) : 0, potionSeq];
}

/** Phía chủ phòng: biến thao tác mạng thành FighterInput (kỹ năng/bình máu chỉ kích một lần mỗi số thứ tự). */
export class RemoteInput {
  private lastCast = 0;
  private lastPotion = 0;
  private lastChoice = 0;

  decode(raw: unknown): FighterInput {
    const a = Array.isArray(raw) ? (raw as unknown[]).map((v) => (typeof v === "number" && Number.isFinite(v) ? v : 0)) : [];
    const [mx = 0, my = 0, atk = 0, mode = 0, castSeq = 0, slot = 0, potSeq = 0] = a;
    let cast: SkillSlot | null = null;
    if (castSeq > this.lastCast) {
      this.lastCast = castSeq;
      cast = SLOTS[Math.max(0, Math.min(3, slot))] ?? null;
    }
    let usePotion = false;
    if (potSeq > this.lastPotion) {
      this.lastPotion = potSeq;
      usePotion = true;
    }
    const clamp = (v: number) => Math.max(-1, Math.min(1, v / 100));
    return { moveX: clamp(mx), moveY: clamp(my), attack: atk === 1, cast, usePotion, targetMode: MODES[Math.max(0, Math.min(2, mode))] ?? "auto" };
  }

  /** Lựa chọn mới (chưa áp dụng) hoặc null. */
  choice(raw: unknown): { kind: number; id: string } | null {
    if (!Array.isArray(raw) || raw.length < 3) return null;
    const [seq, kind, id] = raw as [unknown, unknown, unknown];
    if (typeof seq !== "number" || typeof kind !== "number" || typeof id !== "string" || seq <= this.lastChoice) return null;
    this.lastChoice = seq;
    return { kind, id: id.slice(0, 80) };
  }
}
