/**
 * PHÒNG ĐẤU 3VS3 VỚI NGƯỜI – máy chủ là trọng tài (Supabase Edge Function).
 *  create { stake: "friendly"|"death", invitee? }  → tạo phòng (mã 6 ký tự, chờ 60 giây)
 *  join   { code } | { id }                         → vào phòng → 30 giây chọn đội bí mật
 *  pick   { id, team: [uid×3] }                     → chốt đội (đọc từ bản lưu trên máy chủ, đối thủ không thấy)
 *  get    { id }                                    → trạng thái phòng/trận theo góc nhìn của mình (mình luôn là bên 0)
 *  act    { id, turn, action }                      → 1 lệnh / lượt (đúng lượt của mình)
 *  leave  { id }                                    → rời phòng (đang đấu = BỎ CUỘC, tính thua)
 *  decline{ id }                                    → từ chối lời mời
 *  quick  {}                                       → TÌM TRẬN sinh tử: vào phòng công khai của người khác (gần rank nhất), không có thì mở/giữ phòng chờ
 *  settle { id }                                    → báo đã áp kết quả vào bản lưu
 *  pending{}                                        → các trận đã xong mà mình chưa áp kết quả
 * Đồng hồ: chỉ dùng giờ máy chủ. Thiếu đội khi hết 30 giây → huỷ trận. 3 lượt liên tiếp không đánh → xử thua.
 */
import { createClient } from "@supabase/supabase-js";
import {
  TURN_TIME_MS,
  LATENCY_SLACK_MS,
  applyAction,
  buildPlayerTeam,
  createCombat,
  currentBar,
  mirrorCombat,
  mirrorEvent,
  refereeAction,
  timeoutAction,
  weakestFish,
  dmRankPoints,
  type CombatEvent,
  type CombatState,
} from "@dccc/shared";
import { FISH_BY_ID, FORM_BY_ID, ZONE_BY_ID } from "@dccc/game-data";
import { parseSave } from "@dccc/validation";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WAIT_MS = 60_000;
/** Phòng TÌM TRẬN chờ tối đa (người chơi tự chuyển sang đấu máy sau ~20 giây). */
const QUICK_WAIT_MS = 30_000;
const PICK_MS = 30_000;
const MAX_TIMEOUTS = 3;
const MAX_ROOMS_PER_10MIN = 15;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

type Room = {
  id: string;
  code: string;
  stake: "friendly" | "death";
  status: "waiting" | "picking" | "fighting" | "done" | "cancelled";
  host: string;
  guest: string | null;
  invitee: string | null;
  host_name: string;
  guest_name: string | null;
  expires_at: string;
  pick_deadline: string | null;
  host_team: string[] | null;
  guest_team: string[] | null;
  host_lose: LoseFish | null;
  guest_lose: LoseFish | null;
  state: CombatState | null;
  turn: number;
  turn_started_at: string | null;
  timeouts: number[];
  winner: 0 | 1 | null;
  cancel_reason: string | null;
  settled_host: boolean;
  settled_guest: boolean;
  quick: boolean;
  host_rank: number;
};
type LoseFish = { uid: string; fishId: string; level: number; stars: number } | null;

const now = () => new Date().toISOString();
const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");

/** Phòng nhìn từ phía `me` (bên 0 = mình). Không bao giờ lộ đội đối thủ trước khi vào trận. */
function view(r: Room, me: string, events: CombatEvent[] = []) {
  const side: 0 | 1 = r.host === me ? 0 : 1;
  const st = r.state ? (side === 0 ? r.state : mirrorCombat(r.state)) : null;
  const myTeam = side === 0 ? r.host_team : r.guest_team;
  const oppPicked = !!(side === 0 ? r.guest_team : r.host_team);
  const myLose = side === 0 ? r.host_lose : r.guest_lose;
  const oppLose = side === 0 ? r.guest_lose : r.host_lose;
  return {
    id: r.id,
    code: r.code,
    stake: r.stake,
    status: r.status,
    side,
    isHost: side === 0,
    oppName: side === 0 ? r.guest_name : r.host_name,
    expiresAt: r.expires_at,
    pickDeadline: r.pick_deadline,
    myTeam,
    oppPicked,
    state: st,
    turn: r.turn,
    bar: st && st.winner === null ? currentBar(r.state!) : null,
    turnStartedAt: r.turn_started_at,
    serverNow: now(),
    turnTimeMs: TURN_TIME_MS,
    winner: r.winner === null ? null : r.winner === side ? 0 : 1,
    myLose: r.stake === "death" ? myLose : null,
    oppLose: r.stake === "death" && r.status === "done" ? oppLose : null,
    cancelReason: r.cancel_reason,
    settled: side === 0 ? r.settled_host : r.settled_guest,
    events: side === 0 ? events : events.map(mirrorEvent),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Chỉ hỗ trợ POST" });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: auth, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !auth.user) return json(401, { error: "Bạn cần đăng nhập để đấu với người" });
    const me = auth.user.id;
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const op = body?.op;

    const nameOf = async (uid: string) => {
      const { data } = await admin.from("player_cards").select("display_name").eq("user_id", uid).maybeSingle();
      return (data?.display_name as string | undefined) ?? "Ngư thủ";
    };
    /** Bản lưu trên máy chủ; lỗi thì ghi rõ lý do (chưa có bản lưu / bản lưu không hợp lệ). */
    let saveError = "";
    const loadSave = async (uid: string) => {
      const { data, error } = await admin.from("player_saves").select("save").eq("user_id", uid).maybeSingle();
      if (error) {
        saveError = "Không đọc được bản lưu trên máy chủ, thử lại sau";
        return null;
      }
      if (!data) {
        saveError = uid === me ? "Máy chủ chưa có bản lưu của bạn – vào Tài khoản bấm ☁ Đồng bộ rồi thử lại" : "Bản lưu của đối thủ chưa có trên máy chủ";
        return null;
      }
      const p = parseSave(data.save);
      if (!p.ok) {
        console.error("parseSave lỗi", uid, p.error.slice(0, 500));
        saveError = `Bản lưu ${uid === me ? "của bạn" : "của đối thủ"} không hợp lệ (${p.error.split(";")[0]!.slice(0, 80)}) – hãy báo Ban Quản Trị`;
        return null;
      }
      return p.save;
    };
    /** Ghi phòng có điều kiện (chống 2 yêu cầu cùng lúc ghi đè nhau). */
    const write = async (r: Room, patch: Partial<Room>, guard: Partial<Room>) => {
      let q = admin.from("pvp_rooms").update({ ...patch, updated_at: now() }).eq("id", r.id);
      for (const [k, v] of Object.entries(guard)) q = v === null ? q.is(k, null) : q.eq(k, v as never);
      const { data } = await q.select("*").maybeSingle();
      return data as Room | null;
    };

    /** Chuyển trạng thái theo đồng hồ máy chủ: hết giờ chờ / chọn đội / lượt đánh. */
    const tick = async (r: Room): Promise<{ room: Room; events: CombatEvent[] }> => {
      const t = Date.now();
      if (r.status === "waiting" && t > Date.parse(r.expires_at)) {
        return { room: (await write(r, { status: "cancelled", cancel_reason: "Hết 60 giây chờ – không ai vào phòng" }, { status: "waiting" })) ?? r, events: [] };
      }
      if (r.status === "picking" && r.pick_deadline && t > Date.parse(r.pick_deadline) + 1500) {
        const who = !r.host_team && !r.guest_team ? "Cả hai" : !r.host_team ? r.host_name : r.guest_name;
        return { room: (await write(r, { status: "cancelled", cancel_reason: `${who} chưa chọn đủ đội trong 30 giây – huỷ trận` }, { status: "picking" })) ?? r, events: [] };
      }
      if (r.status === "fighting" && r.state && r.state.winner === null && r.turn_started_at) {
        const late = t - Date.parse(r.turn_started_at) > TURN_TIME_MS + LATENCY_SLACK_MS;
        if (!late) return { room: r, events: [] };
        const side = r.state.turnSide;
        const timeouts = [...r.timeouts];
        timeouts[side] = (timeouts[side] ?? 0) + 1;
        let state: CombatState;
        let events: CombatEvent[];
        if (timeouts[side]! >= MAX_TIMEOUTS) {
          const w = (side === 0 ? 1 : 0) as 0 | 1;
          events = [{ t: "end", winner: w }];
          state = { ...r.state, winner: w, log: [...r.state.log, ...events] };
        } else {
          const a = applyAction(r.state, side, timeoutAction());
          if (!a.ok) return { room: r, events: [] };
          state = a.state;
          events = a.events;
        }
        const upd = await write(
          r,
          { state, turn: state.turn, turn_started_at: now(), timeouts, winner: state.winner, status: state.winner === null ? "fighting" : "done" },
          { status: "fighting", turn: r.turn },
        );
        return { room: upd ?? r, events: upd ? events : [] };
      }
      return { room: r, events: [] };
    };

    if (op === "create") {
      const stake = body?.stake === "friendly" ? "friendly" : "death";
      const invitee = typeof body?.invitee === "string" && UUID.test(body.invitee) && body.invitee !== me ? body.invitee : null;
      const since = new Date(Date.now() - 600_000).toISOString();
      const { count } = await admin.from("pvp_rooms").select("id", { count: "exact", head: true }).eq("host", me).gte("created_at", since);
      if ((count ?? 0) >= MAX_ROOMS_PER_10MIN) return json(429, { error: "Bạn tạo phòng quá nhanh, hãy nghỉ một lát" });
      if (!(await loadSave(me))) return json(400, { error: saveError });
      // mỗi người chỉ giữ 1 phòng đang chờ
      await admin.from("pvp_rooms").update({ status: "cancelled", cancel_reason: "Chủ phòng tạo phòng mới", updated_at: now() }).eq("host", me).eq("status", "waiting");
      const host_name = await nameOf(me);
      for (let i = 0; i < 5; i++) {
        const { data, error } = await admin
          .from("pvp_rooms")
          .insert({ code: newCode(), stake, host: me, invitee, host_name, expires_at: new Date(Date.now() + WAIT_MS).toISOString() })
          .select("*")
          .single();
        if (!error && data) return json(200, view(data as Room, me));
      }
      return json(500, { error: "Không tạo được phòng" });
    }

    if (op === "quick") {
      // ưu tiên ghép với NGƯỜI: phòng TÌM TRẬN đang chờ của người khác, rank gần mình nhất, chờ lâu nhất
      const save = await loadSave(me);
      if (!save) return json(400, { error: saveError });
      const myRank = dmRankPoints(save.stats);
      const { data: mine } = await admin.from("pvp_rooms").select("*").eq("host", me).eq("quick", true).eq("status", "waiting").maybeSingle();
      const { data: others } = await admin
        .from("pvp_rooms")
        .select("*")
        .eq("quick", true)
        .eq("status", "waiting")
        .neq("host", me)
        .gt("expires_at", now())
        .order("created_at")
        .limit(20);
      const cands = ((others ?? []) as Room[]).sort((a, b) => Math.abs(a.host_rank - myRank) - Math.abs(b.host_rank - myRank));
      for (const o of cands) {
        if (mine) {
          // huỷ phòng chờ của mình trước; huỷ không được = vừa có người vào phòng mình → đã ghép xong
          const c = await write(mine as Room, { status: "cancelled", cancel_reason: "Đã ghép phòng khác" }, { status: "waiting", guest: null });
          if (!c) {
            const { data: cur } = await admin.from("pvp_rooms").select("*").eq("id", (mine as Room).id).maybeSingle();
            return json(200, view(cur as Room, me));
          }
        }
        const upd = await write(
          o,
          { guest: me, guest_name: await nameOf(me), status: "picking", pick_deadline: new Date(Date.now() + PICK_MS).toISOString() },
          { status: "waiting", guest: null },
        );
        if (upd) return json(200, view(upd, me));
        if (mine) break; // phòng mình đã huỷ → mở phòng mới bên dưới
      }
      if (mine && cands.length === 0) {
        const t = (await tick(mine as Room)).room;
        if (t.status !== "cancelled") return json(200, view(t, me));
      }
      const since = new Date(Date.now() - 600_000).toISOString();
      const { count } = await admin.from("pvp_rooms").select("id", { count: "exact", head: true }).eq("host", me).gte("created_at", since);
      if ((count ?? 0) >= MAX_ROOMS_PER_10MIN * 2) return json(429, { error: "Bạn tìm trận quá nhanh, hãy nghỉ một lát" });
      await admin.from("pvp_rooms").update({ status: "cancelled", cancel_reason: "Tìm trận mới", updated_at: now() }).eq("host", me).eq("status", "waiting");
      const host_name = await nameOf(me);
      for (let i = 0; i < 5; i++) {
        const { data, error } = await admin
          .from("pvp_rooms")
          .insert({ code: newCode(), stake: "death", quick: true, host_rank: myRank, host: me, invitee: null, host_name, expires_at: new Date(Date.now() + QUICK_WAIT_MS).toISOString() })
          .select("*")
          .single();
        if (!error && data) return json(200, view(data as Room, me));
      }
      return json(500, { error: "Không tìm được trận" });
    }

    if (op === "pending") {
      const { data } = await admin
        .from("pvp_rooms")
        .select("*")
        .eq("status", "done")
        .or(`and(host.eq.${me},settled_host.eq.false),and(guest.eq.${me},settled_guest.eq.false)`)
        .limit(20);
      return json(200, { rooms: ((data ?? []) as Room[]).map((r) => view(r, me)) });
    }

    // các thao tác còn lại cần phòng
    let r: Room | null = null;
    if (op === "join" && typeof body?.code === "string") {
      const code = body.code.trim().toUpperCase();
      const { data } = await admin.from("pvp_rooms").select("*").eq("code", code).in("status", ["waiting", "picking", "fighting"]).maybeSingle();
      r = data as Room | null;
      if (!r) return json(404, { error: "Không tìm thấy phòng với mã này" });
    } else {
      const id = typeof body?.id === "string" ? body.id : "";
      if (!UUID.test(id)) return json(400, { error: "Mã phòng không hợp lệ" });
      const { data } = await admin.from("pvp_rooms").select("*").eq("id", id).maybeSingle();
      r = data as Room | null;
      if (!r) return json(404, { error: "Không tìm thấy phòng" });
    }
    const ticked = await tick(r);
    r = ticked.room;
    const member = r.host === me || r.guest === me;

    if (op === "join") {
      if (member) return json(200, view(r, me));
      if (r.status !== "waiting") return json(409, { error: r.status === "cancelled" ? r.cancel_reason ?? "Phòng đã huỷ" : "Phòng đã đủ người" });
      if (r.invitee && r.invitee !== me) return json(403, { error: "Phòng này chỉ dành cho người được mời" });
      if (!(await loadSave(me))) return json(400, { error: saveError });
      const guest_name = await nameOf(me);
      const upd = await write(
        r,
        { guest: me, guest_name, status: "picking", pick_deadline: new Date(Date.now() + PICK_MS).toISOString() },
        { status: "waiting", guest: null },
      );
      if (!upd) return json(409, { error: "Phòng vừa có người khác vào" });
      return json(200, view(upd, me));
    }
    if (op === "decline") {
      if (r.invitee === me && r.status === "waiting") await write(r, { status: "cancelled", cancel_reason: "Người được mời đã từ chối" }, { status: "waiting" });
      return json(200, { ok: true });
    }
    if (!member) return json(404, { error: "Không tìm thấy phòng" });
    const side: 0 | 1 = r.host === me ? 0 : 1;

    if (op === "get") return json(200, view(r, me, ticked.events));

    if (op === "settle") {
      if (r.status !== "done") return json(400, { error: "Trận chưa kết thúc" });
      await admin.from("pvp_rooms").update(side === 0 ? { settled_host: true } : { settled_guest: true }).eq("id", r.id);
      return json(200, { ok: true });
    }

    if (op === "leave") {
      if (r.status === "waiting" || r.status === "picking") {
        const upd = await write(r, { status: "cancelled", cancel_reason: `${side === 0 ? r.host_name : r.guest_name} đã rời phòng` }, { status: r.status });
        return json(200, view(upd ?? r, me));
      }
      if (r.status === "fighting" && r.state && r.state.winner === null) {
        const w = (side === 0 ? 1 : 0) as 0 | 1;
        const state: CombatState = { ...r.state, winner: w, log: [...r.state.log, { t: "end", winner: w }] };
        const upd = await write(r, { state, winner: w, status: "done" }, { status: "fighting" });
        return json(200, view(upd ?? r, me));
      }
      return json(200, view(r, me));
    }

    if (op === "pick") {
      if (r.status !== "picking") return json(409, { error: r.status === "cancelled" ? r.cancel_reason ?? "Phòng đã huỷ" : "Không còn trong thời gian chọn đội" });
      if ((side === 0 ? r.host_team : r.guest_team) !== null) return json(409, { error: "Bạn đã chốt đội rồi" });
      const save = await loadSave(me);
      if (!save) return json(400, { error: saveError });
      const built = buildPlayerTeam(save, body?.team, FISH_BY_ID, FORM_BY_ID, ZONE_BY_ID);
      if ("error" in built) return json(400, { error: built.error });
      const uids = body!.team as string[];
      const w = weakestFish(save, uids, FISH_BY_ID, FORM_BY_ID);
      const lose: LoseFish = w ? { uid: w.uid, fishId: w.fishId, level: w.level, stars: w.stars } : null;
      const mine = side === 0 ? { host_team: uids, host_lose: lose } : { guest_team: uids, guest_lose: lose };
      let upd = await write(r, mine, side === 0 ? { status: "picking", host_team: null } : { status: "picking", guest_team: null });
      if (!upd) return json(409, { error: "Không chốt được đội, thử lại" });
      // cả hai đã chốt → máy chủ dựng trận từ bản lưu của 2 người
      if (upd.host_team && upd.guest_team) {
        const [hs, gs] = await Promise.all([loadSave(upd.host), loadSave(upd.guest!)]);
        const ht = hs && buildPlayerTeam(hs, upd.host_team, FISH_BY_ID, FORM_BY_ID, ZONE_BY_ID);
        const gt = gs && buildPlayerTeam(gs, upd.guest_team, FISH_BY_ID, FORM_BY_ID, ZONE_BY_ID);
        if (!ht || !gt || "error" in ht || "error" in gt) {
          upd = (await write(upd, { status: "cancelled", cancel_reason: "Đội hình không còn hợp lệ – huỷ trận" }, { status: "picking" })) ?? upd;
          return json(200, view(upd, me));
        }
        const seed = crypto.getRandomValues(new Uint32Array(1))[0]!;
        const state = createCombat(ht.team, gt.team, seed);
        const started = await write(upd, { status: "fighting", state, turn: state.turn, turn_started_at: now() }, { status: "picking" });
        return json(200, view(started ?? upd, me, started ? state.log : []));
      }
      return json(200, view(upd, me));
    }

    if (op === "act") {
      if (r.status !== "fighting" || !r.state) return json(409, { error: "Trận chưa bắt đầu hoặc đã kết thúc", ...view(r, me) });
      const st = r.state;
      if (st.turnSide !== side) return json(409, { error: "Chưa tới lượt của bạn", ...view(r, me) });
      // góc nhìn của khách đã được đảo → lượt gửi lên là lượt thật (không đổi khi đảo)
      const ref = refereeAction(st, body ?? {}, Date.now() - Date.parse(r.turn_started_at!));
      if (!ref.ok) return json(ref.status, { error: ref.error, ...view(r, me) });
      const a = applyAction(st, side, ref.action);
      if (!a.ok) return json(400, { error: a.error, ...view(r, me) });
      const timeouts = [...r.timeouts];
      timeouts[side] = ref.timedOut ? (timeouts[side] ?? 0) + 1 : 0;
      const next = a.state;
      const upd = await write(
        r,
        { state: next, turn: next.turn, turn_started_at: now(), timeouts, winner: next.winner, status: next.winner === null ? "fighting" : "done" },
        { status: "fighting", turn: r.turn },
      );
      if (!upd) return json(409, { error: "Lệnh trùng – lượt này đã được xử lý", ...view(r, me) });
      return json(200, view(upd, me, a.events));
    }
    return json(400, { error: "Thao tác không hợp lệ" });
  } catch (e) {
    console.error(e);
    return json(500, { error: "Lỗi máy chủ" });
  }
});
