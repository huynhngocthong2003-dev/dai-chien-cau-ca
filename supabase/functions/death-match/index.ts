/**
 * Đấu Sinh Tử người–người (Supabase Edge Function).
 * Máy chủ là nơi DUY NHẤT tính trận: đọc bản lưu của cả hai bên từ database,
 * chạy cùng cơ chế trận đấu với game (packages/shared), rồi ghi kết quả vào
 * pvp_matches. Mỗi bên tự áp kết quả của mình khi mở game (một lần).
 */
import { createClient } from "@supabase/supabase-js";
import { resolvePvp } from "@dccc/shared";
import { FISH_BY_ID, FORM_BY_ID } from "@dccc/game-data";
import { parseSave } from "@dccc/validation";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UID = /^[a-zA-Z0-9_-]{1,64}$/;
const MAX_PER_HOUR = 20;
const MAX_SAME_OPPONENT_PER_DAY = 5;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Chỉ hỗ trợ POST" });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: auth, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !auth.user) return json(401, { error: "Bạn cần đăng nhập để Đấu Sinh Tử" });
    const me = auth.user.id;

    const body = (await req.json().catch(() => null)) as { defenderId?: unknown; team?: unknown } | null;
    const defenderId = typeof body?.defenderId === "string" ? body.defenderId : "";
    const team = Array.isArray(body?.team) ? body.team : [];
    if (!UUID.test(defenderId)) return json(400, { error: "Đối thủ không hợp lệ" });
    if (defenderId === me) return json(400, { error: "Không thể tự đấu với chính mình" });
    if (team.length !== 3 || !team.every((u) => typeof u === "string" && UID.test(u))) return json(400, { error: "Hãy chọn đúng 3 con cá" });

    // chống spam
    const hourAgo = new Date(Date.now() - 3600_000).toISOString();
    const dayAgo = new Date(Date.now() - 86400_000).toISOString();
    const { count: perHour } = await admin.from("pvp_matches").select("id", { count: "exact", head: true }).eq("challenger", me).gte("created_at", hourAgo);
    if ((perHour ?? 0) >= MAX_PER_HOUR) return json(429, { error: "Bạn đấu quá nhiều, hãy nghỉ một lát rồi quay lại" });
    const { count: sameOpp } = await admin
      .from("pvp_matches")
      .select("id", { count: "exact", head: true })
      .eq("challenger", me)
      .eq("defender", defenderId)
      .gte("created_at", dayAgo);
    if ((sameOpp ?? 0) >= MAX_SAME_OPPONENT_PER_DAY) return json(429, { error: "Hôm nay bạn đã đấu người này đủ số lần" });

    // bản lưu của cả hai bên – đọc từ máy chủ
    const { data: rows, error: rowsErr } = await admin.from("player_saves").select("user_id, save").in("user_id", [me, defenderId]);
    if (rowsErr) return json(500, { error: "Không đọc được dữ liệu" });
    const mine = rows?.find((r) => r.user_id === me);
    const theirs = rows?.find((r) => r.user_id === defenderId);
    if (!mine) return json(400, { error: "Hãy đồng bộ tài khoản trước khi đấu" });
    if (!theirs) return json(404, { error: "Đối thủ chưa có dữ liệu" });
    const a = parseSave(mine.save);
    const b = parseSave(theirs.save);
    if (!a.ok || !b.ok) return json(400, { error: "Dữ liệu người chơi không hợp lệ" });

    const seed = crypto.getRandomValues(new Uint32Array(1))[0]!;
    const r = resolvePvp(a.save, team as string[], b.save, seed, FISH_BY_ID, FORM_BY_ID);
    if ("error" in r) return json(400, { error: r.error });

    const { data: cards } = await admin.from("player_cards").select("user_id, display_name").in("user_id", [me, defenderId]);
    const nameOf = (id: string) => cards?.find((c) => c.user_id === id)?.display_name ?? "Cần Thủ";
    const { data: ins, error: insErr } = await admin
      .from("pvp_matches")
      .insert({
        challenger: me,
        defender: defenderId,
        seed,
        result: r.result,
        for_challenger: r.forChallenger,
        for_defender: r.forDefender,
        challenger_name: nameOf(me),
        defender_name: nameOf(defenderId),
      })
      .select("id")
      .single();
    if (insErr || !ins) return json(500, { error: "Không ghi được kết quả trận" });
    return json(200, { id: ins.id, result: r.result, record: r.forChallenger, opponentName: nameOf(defenderId) });
  } catch (e) {
    console.error(e);
    return json(500, { error: "Lỗi máy chủ" });
  }
});
