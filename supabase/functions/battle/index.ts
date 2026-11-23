/**
 * TRẬN 3VS3 THEO LƯỢT – MÁY CHỦ LÀ TRỌNG TÀI (Supabase Edge Function).
 *  POST { op: "start", mode: "practice", team: [uid×3], level }  → tạo trận (đội đọc từ bản lưu trên máy chủ)
 *  POST { op: "act", id, turn, action: { kind, pressMs? } }        → 1 lệnh / lượt; máy chủ tính vùng canh lực, sát thương, lượt máy
 *  POST { op: "get", id }                                          → lấy lại trạng thái (kết nối lại)
 *  POST { op: "forfeit", id }                                      → bỏ cuộc = THUA (mất cá lực chiến thấp nhất)
 * Kết quả (thắng/thua) do game áp vào bản lưu bằng applyCombatOutcome với txId = "cb_" + id (chống áp 2 lần).
 * Mở trận mới khi còn trận dang dở → trận cũ tính THUA (chống thoát giữa chừng để né thua).
 * Không tin HP / sát thương / chỉ số từ trình duyệt: mọi con số do packages/shared/combat.ts tính tại đây.
 */
import { createClient } from "@supabase/supabase-js";
import {
  TURN_TIME_MS,
  applyAction,
  refereeAction,
  runAiTurns,
  buildPlayerTeam,
  createCombat,
  currentBar,
  practiceOpponent,
  type AiLevel,
  type CombatEvent,
  type CombatState,
} from "@dccc/shared";
import { FISHES, FISH_BY_ID, FORM_BY_ID, ZONES, ZONE_BY_ID } from "@dccc/game-data";
import { parseSave } from "@dccc/validation";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LEVELS: AiLevel[] = ["easy", "normal", "hard"];
const MAX_STARTS_PER_10MIN = 20;
const AI_SIDE = 1;

const runAi = (s: CombatState, level: AiLevel) => runAiTurns(s, AI_SIDE, level);

const view = (row: { id: string; state: CombatState; turn: number; turn_started_at: string; ai_level: string | null }, events: CombatEvent[] = []) => ({
  id: row.id,
  state: row.state,
  turn: row.turn,
  bar: row.state.winner === null ? currentBar(row.state) : null,
  turnStartedAt: row.turn_started_at,
  serverNow: new Date().toISOString(),
  turnTimeMs: TURN_TIME_MS,
  level: row.ai_level,
  events,
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Chỉ hỗ trợ POST" });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: auth, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !auth.user) return json(401, { error: "Bạn cần đăng nhập để đấu" });
    const me = auth.user.id;
    /** Trận dang dở của mình (thoát giữa chừng) → tính THUA. */
    const forfeitOpen = async () => {
      const { data } = await admin.from("battles").select("id, state").eq("user_id", me).is("winner", null).limit(20);
      for (const r of (data ?? []) as { id: string; state: CombatState }[]) {
        await admin
          .from("battles")
          .update({ state: { ...r.state, winner: AI_SIDE }, winner: AI_SIDE, updated_at: new Date().toISOString() })
          .eq("id", r.id)
          .is("winner", null);
      }
    };
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const op = body?.op;

    if (op === "start") {
      const level = LEVELS.includes(body?.level as AiLevel) ? (body!.level as AiLevel) : "normal";
      if (body?.mode !== "practice") return json(400, { error: "Chế độ chưa mở" });
      const since = new Date(Date.now() - 600_000).toISOString();
      const { count } = await admin.from("battles").select("id", { count: "exact", head: true }).eq("user_id", me).gte("created_at", since);
      if ((count ?? 0) >= MAX_STARTS_PER_10MIN) return json(429, { error: "Bạn mở trận quá nhanh, hãy nghỉ một lát" });
      const { data: row, error } = await admin.from("player_saves").select("save").eq("user_id", me).maybeSingle();
      if (error) return json(500, { error: "Không đọc được bản lưu trên máy chủ, thử lại sau" });
      if (!row) return json(400, { error: "Máy chủ chưa có bản lưu của bạn – vào Tài khoản bấm ☁ Đồng bộ rồi thử lại" });
      const p = parseSave(row.save);
      if (!p.ok) {
        console.error("parseSave lỗi", me, p.error.slice(0, 500));
        return json(400, { error: `Bản lưu trên máy chủ không hợp lệ (${p.error.split(";")[0]!.slice(0, 80)}) – hãy báo Ban Quản Trị` });
      }
      const built = buildPlayerTeam(p.save, body?.team, FISH_BY_ID, FORM_BY_ID, ZONE_BY_ID);
      if ("error" in built) return json(400, { error: built.error });
      // trận dang dở (thoát giữa chừng) → tính thua
      await forfeitOpen();
      const seed = crypto.getRandomValues(new Uint32Array(1))[0]!;
      const open = new Set(ZONES.filter((z) => p.save.level >= z.requiredLevel).map((z) => z.id));
      const pool = FISHES.filter((f) => f.rarity !== "boss" && f.zones.some((z) => open.has(z)));
      const foe = practiceOpponent(seed, built.team, pool, level, FISH_BY_ID);
      const first = runAi(createCombat(built.team, foe, seed), level);
      const { data: ins, error: insErr } = await admin
        .from("battles")
        .insert({ user_id: me, mode: "practice", ai_level: level, team: body!.team as string[], state: first.state, turn: first.state.turn, winner: first.state.winner })
        .select("id, state, turn, turn_started_at, ai_level")
        .single();
      if (insErr || !ins) return json(500, { error: "Không tạo được trận" });
      return json(200, view(ins as never, first.state.log));
    }

    const id = typeof body?.id === "string" ? body.id : "";
    if (!UUID.test(id)) return json(400, { error: "Mã trận không hợp lệ" });
    const { data: b, error: bErr } = await admin.from("battles").select("id, user_id, state, turn, turn_started_at, ai_level, winner").eq("id", id).maybeSingle();
    if (bErr || !b || b.user_id !== me) return json(404, { error: "Không tìm thấy trận" });
    if (op === "get") return json(200, view(b as never));
    if (op === "forfeit") {
      if (b.winner !== null) return json(200, view(b as never));
      const st = { ...(b.state as CombatState), winner: AI_SIDE as 0 | 1 };
      const { data: f } = await admin
        .from("battles")
        .update({ state: st, winner: AI_SIDE, updated_at: new Date().toISOString() })
        .eq("id", id)
        .is("winner", null)
        .select("id, state, turn, turn_started_at, ai_level")
        .maybeSingle();
      return json(200, view((f ?? b) as never));
    }
    if (op !== "act") return json(400, { error: "Thao tác không hợp lệ" });

    const state = b.state as CombatState;
    // trọng tài: sai lượt / trùng lệnh / quá giờ / khai gian thời điểm bấm (logic thuần trong packages/shared – có test)
    const ref = refereeAction(state, body ?? {}, Date.now() - Date.parse(b.turn_started_at));
    if (!ref.ok) return json(ref.status, { error: ref.error, ...view(b as never) });
    const action = ref.action;
    const r = applyAction(state, 0, action);
    if (!r.ok) return json(400, { error: r.error, ...view(b as never) });
    const ai = runAi(r.state, (b.ai_level as AiLevel) ?? "normal");
    const next = ai.state;
    const { data: upd, error: updErr } = await admin
      .from("battles")
      .update({ state: next, turn: next.turn, turn_started_at: new Date().toISOString(), winner: next.winner, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("turn", b.turn) // chống gửi 2 lệnh cùng lượt
      .select("id, state, turn, turn_started_at, ai_level")
      .maybeSingle();
    if (updErr) return json(500, { error: "Không lưu được lượt đánh" });
    if (!upd) return json(409, { error: "Lệnh trùng – lượt này đã được xử lý" });
    return json(200, view(upd as never, [...r.events, ...ai.events]));
  } catch (e) {
    console.error(e);
    return json(500, { error: "Lỗi máy chủ" });
  }
});
