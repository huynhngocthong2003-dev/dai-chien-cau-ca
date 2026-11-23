/**
 * Kết nối màn chiến đấu 3vs3 với trọng tài:
 *  - ServerDriver: đã đăng nhập → máy chủ (Edge Function `battle`) giữ trận, tính mọi con số.
 *  - LocalDriver: chơi không tài khoản → chạy cùng lõi trận ngay trên máy.
 *  - PvpDriver: đấu với NGƯỜI trong phòng (Edge Function `pvp`) – chờ lượt đối thủ bằng cách hỏi máy chủ.
 */
import {
  applyAction,
  buildPlayerTeam,
  createCombat,
  currentBar,
  dmAiPowerScale,
  dmRankPoints,
  practiceOpponent,
  refereeAction,
  runAiTurns,
  type AiLevel,
  type BarParams,
  type CombatEvent,
  type CombatState,
} from "@dccc/shared";
import { FISHES, FISH_BY_ID, FORM_BY_ID, ZONES, ZONE_BY_ID } from "@dccc/game-data";
import { GameState } from "./GameState.ts";
import { getClient } from "./online.ts";
import { pvpCall, type PvpRoom } from "./pvp.ts";

export interface CombatView {
  id: string | null;
  state: CombatState;
  bar: BarParams | null;
  events: CombatEvent[];
}

export interface PlayerAction {
  kind: "attack" | "skill" | "defend";
  pressMs?: number;
}

export interface CombatDriver {
  readonly server: boolean;
  start(team: string[], level: AiLevel): Promise<CombatView>;
  act(action: PlayerAction): Promise<CombatView>;
  /** Chờ tới lượt mình (đấu người) – trả về các sự kiện mới. */
  waitTurn(): Promise<CombatView>;
  /** Bỏ cuộc = THUA. */
  forfeit(): Promise<CombatView>;
}

export class LocalDriver implements CombatDriver {
  readonly server = false;
  private state!: CombatState;
  private level: AiLevel = "normal";
  private turnStart = 0;

  async start(team: string[], level: AiLevel): Promise<CombatView> {
    const built = buildPlayerTeam(GameState.save, team, FISH_BY_ID, FORM_BY_ID, ZONE_BY_ID);
    if ("error" in built) throw new Error(built.error);
    this.level = level;
    const seed = crypto.getRandomValues(new Uint32Array(1))[0]!;
    const open = new Set(ZONES.filter((z) => GameState.save.level >= z.requiredLevel).map((z) => z.id));
    const pool = FISHES.filter((f) => f.rarity !== "boss" && f.zones.some((z) => open.has(z)));
    const foe = practiceOpponent(seed, built.team, pool, level, FISH_BY_ID, dmAiPowerScale(dmRankPoints(GameState.save.stats)));
    const first = runAiTurns(createCombat(built.team, foe, seed), 1, level);
    this.state = first.state;
    this.turnStart = performance.now();
    return { id: null, state: this.state, bar: this.state.winner === null ? currentBar(this.state) : null, events: first.state.log };
  }

  async act(action: PlayerAction): Promise<CombatView> {
    const ref = refereeAction(this.state, { turn: this.state.turn, action }, performance.now() - this.turnStart);
    if (!ref.ok) throw new Error(ref.error);
    const r = applyAction(this.state, 0, ref.action);
    if (!r.ok) throw new Error(r.error);
    const ai = runAiTurns(r.state, 1, this.level);
    this.state = ai.state;
    this.turnStart = performance.now();
    return { id: null, state: this.state, bar: this.state.winner === null ? currentBar(this.state) : null, events: [...r.events, ...ai.events] };
  }

  async waitTurn(): Promise<CombatView> {
    return { id: null, state: this.state, bar: currentBar(this.state), events: [] };
  }

  async forfeit(): Promise<CombatView> {
    if (this.state.winner === null) this.state = { ...this.state, winner: 1, log: [...this.state.log, { t: "end", winner: 1 }] };
    return { id: null, state: this.state, bar: null, events: [] };
  }
}

export class ServerDriver implements CombatDriver {
  readonly server = true;
  private id = "";
  private turn = 0;

  private async call(body: Record<string, unknown>): Promise<CombatView & { turn: number }> {
    const sb = await getClient();
    const { data, error } = await sb.functions.invoke("battle", { body });
    if (error) {
      const ctx = (error as { context?: Response }).context;
      let msg = "Không kết nối được máy chủ trận đấu";
      try {
        const j = ctx ? ((await ctx.json()) as { error?: string }) : null;
        if (j?.error) msg = j.error;
      } catch {
        /* giữ thông báo mặc định */
      }
      throw new Error(msg);
    }
    const v = data as { id: string; state: CombatState; bar: BarParams | null; events: CombatEvent[]; turn: number };
    this.id = v.id;
    this.turn = v.turn;
    return { id: v.id, state: v.state, bar: v.bar, events: v.events ?? [], turn: v.turn };
  }

  async start(team: string[], level: AiLevel) {
    // máy chủ dựng đội từ bản lưu trên máy chủ → đẩy bản lưu mới nhất lên trước
    const err = await GameState.syncNow();
    if (err) throw new Error(`Chưa đồng bộ được bản lưu: ${err}`);
    return this.call({ op: "start", mode: "practice", team, level });
  }

  act(action: PlayerAction) {
    return this.call({ op: "act", id: this.id, turn: this.turn, action });
  }

  waitTurn() {
    return this.call({ op: "get", id: this.id });
  }

  forfeit() {
    return this.call({ op: "forfeit", id: this.id });
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Đấu với người: phòng đã vào trận; sự kiện mới = phần nhật ký trận chưa phát. */
export class PvpDriver implements CombatDriver {
  readonly server = true;
  private seen = 0;
  private turn = 0;
  room: PvpRoom | null = null;
  stopped = false;

  constructor(readonly roomId: string) {}

  private toView(r: PvpRoom): CombatView {
    this.room = r;
    this.turn = r.turn;
    const log = r.state?.log ?? [];
    const events = log.slice(this.seen);
    this.seen = log.length;
    return { id: r.id, state: r.state!, bar: r.bar, events };
  }

  async start(): Promise<CombatView> {
    for (let i = 0; i < 20; i++) {
      const r = await pvpCall({ op: "get", id: this.roomId });
      if (r.state) return this.toView(r);
      if (r.status === "cancelled") throw new Error(r.cancelReason ?? "Trận đã huỷ");
      await sleep(700);
    }
    throw new Error("Trận chưa bắt đầu");
  }

  async act(action: PlayerAction): Promise<CombatView> {
    return this.toView(await pvpCall({ op: "act", id: this.roomId, turn: this.turn, action }));
  }

  async waitTurn(): Promise<CombatView> {
    let fails = 0;
    for (;;) {
      if (this.stopped) throw new Error("Đã rời trận");
      try {
        const r = await pvpCall({ op: "get", id: this.roomId });
        fails = 0;
        if (!r.state) throw new Error(r.cancelReason ?? "Trận đã huỷ");
        if (r.state.log.length > this.seen || r.state.winner !== null || r.state.turnSide === 0) return this.toView(r);
      } catch (e) {
        // mất mạng thoáng qua → thử lại (kết nối lại); lỗi liên tục mới báo
        if (++fails >= 8) throw e;
      }
      await sleep(900);
    }
  }

  async forfeit(): Promise<CombatView> {
    this.stopped = true;
    return this.toView(await pvpCall({ op: "leave", id: this.roomId }));
  }
}

export function makeDriver(): CombatDriver {
  return GameState.online ? new ServerDriver() : new LocalDriver();
}
