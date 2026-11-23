/**
 * Kết nối màn chiến đấu 3vs3 với trọng tài:
 *  - ServerDriver: đã đăng nhập → máy chủ (Edge Function `battle`) giữ trận, tính mọi con số.
 *  - LocalDriver: chơi không tài khoản (luyện tập, không thưởng) → chạy cùng lõi trận ngay trên máy.
 */
import {
  applyAction,
  buildPlayerTeam,
  createCombat,
  currentBar,
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
    const foe = practiceOpponent(seed, built.team, pool, level, FISH_BY_ID);
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

  start(team: string[], level: AiLevel) {
    return this.call({ op: "start", mode: "practice", team, level });
  }

  act(action: PlayerAction) {
    return this.call({ op: "act", id: this.id, turn: this.turn, action });
  }
}

export function makeDriver(): CombatDriver {
  return GameState.online ? new ServerDriver() : new LocalDriver();
}
