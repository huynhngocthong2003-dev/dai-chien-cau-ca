/**
 * BOSS THẾ GIỚI – MÁY CHỦ LÀ TRỌNG TÀI (Supabase Edge Function).
 *  POST { op: "status" }                          → boss khung giờ hiện tại / kế tiếp, máu, top 10, hạng của mình, lượt còn lại
 *  POST { op: "enter", team: [uid×3] }            → vào đánh 1 lượt (đội đọc từ bản lưu trên máy chủ, cá khoá cũng được – không mất cá)
 *  POST { op: "hit", session, n, pressMs }        → 1 đòn canh kim (máy chủ xét thời điểm bấm, tính sát thương, trừ máu nguyên tử)
 * Hết giờ hoặc hạ boss → xếp hạng theo tổng sát thương → gửi quà Hòm Thư (txId riêng, chống nhận trùng);
 * người KẾT LIỄU nhận thêm 1 Đá Tiến Hoá đúng hệ của boss.
 * Không tin số liệu trình duyệt: sát thương, vùng canh kim, máu boss đều tính ở đây.
 */
import { createClient } from "@supabase/supabase-js";
import {
  LATENCY_SLACK_MS,
  MIN_PRESS_MS,
  TURN_TIME_MS,
  WORLD_BOSS,
  barFor,
  buildPlayerTeam,
  needlePos,
  timingZone,
  wbHitDamage,
  wbKillReward,
  wbRankReward,
  worldBossFor,
  worldBossTeam,
  worldBossMaxHp,
  worldBossSlot,
  type CombatFish,
  type TimingZone,
} from "@dccc/shared";
import { FISH_BY_ID, FORM_BY_ID, WORLD_BOSSES, WORLD_BOSS_BY_ID, ZONE_BY_ID } from "@dccc/game-data";
import { parseSave } from "@dccc/validation";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Khoảng nghỉ tối thiểu giữa 2 đòn (chống bấm máy). */
const MIN_GAP_MS = 450;

type Boss = {
  id: string;
  slot_key: string;
  boss_id: string;
  element: string;
  max_hp: number;
  hp: number;
  starts_at: string;
  ends_at: string;
  killer: string | null;
  killer_name: string | null;
  killed_at: string | null;
  rewarded: boolean;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Chỉ hỗ trợ POST" });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: auth, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !auth.user) return json(401, { error: "Bạn cần đăng nhập để đánh Boss Thế Giới" });
    const me = auth.user.id;
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const op = body?.op;
    const now = Date.now();
    const slot = worldBossSlot(now);
    const def = worldBossFor(slot, WORLD_BOSSES);

    const nameOf = async (uid: string) => {
      const { data } = await admin.from("player_cards").select("display_name").eq("user_id", uid).maybeSingle();
      return ((data?.display_name as string | undefined) ?? "Ngư thủ").slice(0, 24);
    };

    /** Boss của khung giờ đang diễn ra (tạo khi người đầu tiên ghé). */
    const liveBoss = async (): Promise<Boss | null> => {
      if (!slot.live) return null;
      const { data } = await admin.from("world_boss").select("*").eq("slot_key", slot.key).maybeSingle();
      if (data) return data as Boss;
      const hp = worldBossMaxHp(slot);
      await admin
        .from("world_boss")
        .upsert(
          { slot_key: slot.key, boss_id: def.id, element: def.element, max_hp: hp, hp, starts_at: new Date(slot.startsAt).toISOString(), ends_at: new Date(slot.endsAt).toISOString() },
          { onConflict: "slot_key", ignoreDuplicates: true },
        );
      const { data: d2 } = await admin.from("world_boss").select("*").eq("slot_key", slot.key).maybeSingle();
      return (d2 as Boss | null) ?? null;
    };

    /** Kết toán (1 lần): xếp hạng → thư quà; người kết liễu thêm Đá Tiến Hoá đúng hệ. */
    const settle = async (b: Boss) => {
      if (b.rewarded || (b.hp > 0 && Date.parse(b.ends_at) > Date.now())) return;
      const { data: won } = await admin.from("world_boss").update({ rewarded: true }).eq("id", b.id).eq("rewarded", false).select("*").maybeSingle();
      if (!won) return; // máy chủ khác đã kết toán
      const bd = WORLD_BOSS_BY_ID.get(b.boss_id);
      const bossName = bd?.name ?? "Boss Thế Giới";
      const { data: rows } = await admin.from("world_boss_damage").select("user_id, name, damage").eq("boss", b.id).gt("damage", 0).order("damage", { ascending: false }).limit(1000);
      const list = (rows ?? []) as { user_id: string; name: string; damage: number }[];
      const tag = b.id.replace(/-/g, "").slice(0, 10);
      const result = b.hp <= 0 ? "đã bị HẠ GỤC" : "đã rút lui (hết giờ)";
      const mails = list.map((r, i) => ({
        user_id: r.user_id,
        title: `🐉 Boss Thế Giới – Hạng #${i + 1}`.slice(0, 80),
        body: `${bossName} ${result}. Bạn gây ${Number(r.damage).toLocaleString("vi-VN")} sát thương, xếp hạng #${i + 1}/${list.length}. Bấm Nhận để lấy quà!`.slice(0, 1000),
        rewards: { txId: `wb_${tag}_${r.user_id.replace(/-/g, "").slice(0, 12)}`, ...wbRankReward(i + 1) },
      }));
      if (b.killer) {
        mails.push({
          user_id: b.killer,
          title: "⚔ Kết liễu Boss Thế Giới!".slice(0, 80),
          body: `Bạn tung đòn cuối hạ gục ${bossName}! Phần thưởng kết liễu: 1 Đá Tiến Hoá hệ ${bd ? bd.element : ""} và 20 kim cương.`.slice(0, 1000),
          rewards: { txId: `wbk_${tag}`, ...wbKillReward((bd?.element ?? b.element) as never) },
        });
      }
      for (let i = 0; i < mails.length; i += 200) await admin.from("system_mail").insert(mails.slice(i, i + 200));
    };

    if (op === "status") {
      const b = await liveBoss();
      // kết toán các boss đã xong mà chưa gửi quà (kể cả khung trước)
      const { data: pending } = await admin.from("world_boss").select("*").eq("rewarded", false).lt("starts_at", new Date().toISOString()).limit(5);
      for (const p of (pending ?? []) as Boss[]) await settle(p);
      let top: { user_id: string; name: string; damage: number }[] = [];
      let mine: { damage: number; rank: number | null; entries: number } = { damage: 0, rank: null, entries: 0 };
      if (b) {
        const { data: t } = await admin.from("world_boss_damage").select("user_id, name, damage").eq("boss", b.id).order("damage", { ascending: false }).limit(10);
        top = (t ?? []) as typeof top;
        const { data: m } = await admin.from("world_boss_damage").select("damage").eq("boss", b.id).eq("user_id", me).maybeSingle();
        const dmg = Number(m?.damage ?? 0);
        const { count: higher } = await admin.from("world_boss_damage").select("user_id", { count: "exact", head: true }).eq("boss", b.id).gt("damage", dmg);
        const { count: entries } = await admin.from("world_boss_sessions").select("id", { count: "exact", head: true }).eq("boss", b.id).eq("user_id", me);
        mine = { damage: dmg, rank: dmg > 0 ? (higher ?? 0) + 1 : null, entries: entries ?? 0 };
      }
      // PHÒNG CHUNG: người chơi vừa vào/ra đòn trong ~2,5 phút gần nhất (mỗi người 1 dòng mới nhất)
      const room: { name: string; look: unknown; power: number; me: boolean; at: string }[] = [];
      if (b) {
        const { data: rs } = await admin
          .from("world_boss_sessions")
          .select("user_id, name, look, power, bar_at")
          .eq("boss", b.id)
          .gt("bar_at", new Date(Date.now() - 150_000).toISOString())
          .order("bar_at", { ascending: false })
          .limit(40);
        const seen = new Set<string>();
        for (const r of (rs ?? []) as { user_id: string; name: string; look: unknown; power: number; bar_at: string }[]) {
          if (seen.has(r.user_id) || seen.size >= 10) continue;
          seen.add(r.user_id);
          room.push({ name: r.name || "Ngư thủ", look: r.look, power: Number(r.power), me: r.user_id === me, at: r.bar_at });
        }
      }
      // boss của khung giờ = boss đã ghi trong bảng (nếu đã xuất hiện) – không đổi giữa chừng
      const shown = (b && WORLD_BOSS_BY_ID.get(b.boss_id)) || def;
      return json(200, {
        serverNow: new Date().toISOString(),
        slot: { key: slot.key, live: slot.live, startsAt: new Date(slot.startsAt).toISOString(), endsAt: new Date(slot.endsAt).toISOString() },
        boss: { id: shown.id, name: shown.name, title: shown.title, element: shown.element, description: shown.description },
        hp: b ? Number(b.hp) : worldBossMaxHp(slot),
        maxHp: b ? Number(b.max_hp) : worldBossMaxHp(slot),
        killer: b?.killer_name ?? null,
        top: top.map((r) => ({ name: r.name, damage: Number(r.damage), me: r.user_id === me })),
        room,
        me: { ...mine, entriesLeft: Math.max(0, WORLD_BOSS.entriesPerSlot - mine.entries) },
        rules: { hitsPerEntry: WORLD_BOSS.hitsPerEntry, entriesPerSlot: WORLD_BOSS.entriesPerSlot },
      });
    }

    if (op === "enter") {
      const b = await liveBoss();
      if (!b) return json(400, { error: "Boss Thế Giới chưa xuất hiện – quay lại lúc 12h · 15h · 20h" });
      if (b.hp <= 0) return json(400, { error: "Boss đã bị hạ gục – chờ khung giờ sau" });
      const { count: used } = await admin.from("world_boss_sessions").select("id", { count: "exact", head: true }).eq("boss", b.id).eq("user_id", me);
      if ((used ?? 0) >= WORLD_BOSS.entriesPerSlot) return json(400, { error: `Bạn đã dùng hết ${WORLD_BOSS.entriesPerSlot} lượt đánh của khung giờ này` });
      const { data: row, error } = await admin.from("player_saves").select("save").eq("user_id", me).maybeSingle();
      if (error) return json(500, { error: "Không đọc được bản lưu trên máy chủ, thử lại sau" });
      if (!row) return json(400, { error: "Máy chủ chưa có bản lưu của bạn – vào Tài khoản bấm ☁ Đồng bộ rồi thử lại" });
      const p = parseSave(row.save);
      if (!p.ok) return json(400, { error: `Bản lưu trên máy chủ không hợp lệ (${p.error.split(";")[0]!.slice(0, 80)})` });
      // đánh boss không mất cá → cá khoá cũng được ra trận
      const save = { ...p.save, fishes: p.save.fishes.map((f) => ({ ...f, locked: false })) };
      // đội = đúng 3 CÁ TRƯNG BÀY (Hồ Sơ); lực chiến = tổng 3 con
      const pick = worldBossTeam(save, FISH_BY_ID, FORM_BY_ID);
      if (pick.uids.length < 3) return json(400, { error: "Hãy trưng bày đủ 3 cá (Hồ Sơ → Cá trưng bày) trước khi vào phòng boss" });
      const built = buildPlayerTeam(save, pick.uids, FISH_BY_ID, FORM_BY_ID, ZONE_BY_ID);
      if ("error" in built) return json(400, { error: built.error });
      const seed = crypto.getRandomValues(new Uint32Array(1))[0]!;
      // ngoại hình nhân vật để người khác trong phòng nhìn thấy
      const cid = typeof save.selectedCharacterId === "string" ? save.selectedCharacterId.slice(0, 64) : "c_be_tom";
      const equip = save.characters?.[cid]?.equip ?? {};
      const look = JSON.stringify({ c: cid, equip }).length < 1000 ? { c: cid, equip } : { c: cid };
      const { data: ses, error: sErr } = await admin
        .from("world_boss_sessions")
        .insert({ boss: b.id, user_id: me, team: built.team, seed, name: await nameOf(me), look, power: pick.power })
        .select("id, seed, bar_at")
        .single();
      if (sErr || !ses) return json(500, { error: "Không vào được trận" });
      return json(200, { session: ses.id, hits: 0, hitsMax: WORLD_BOSS.hitsPerEntry, bar: barFor(Number(ses.seed), 0), serverNow: new Date().toISOString(), power: pick.power, fromShowcase: pick.fromShowcase, team: built.team.map((f: CombatFish) => ({ uid: f.uid, fishId: f.fishId, name: f.name, atk: f.atk, element: f.element, elements: f.elements, form: f.form, stars: f.stars, parents: f.parents })) });
    }

    if (op === "hit") {
      const sid = typeof body?.session === "string" ? body.session : "";
      if (!UUID.test(sid)) return json(400, { error: "Phiên đánh không hợp lệ" });
      const { data: s } = await admin.from("world_boss_sessions").select("*").eq("id", sid).maybeSingle();
      if (!s || s.user_id !== me) return json(404, { error: "Không tìm thấy phiên đánh" });
      if (s.hits >= WORLD_BOSS.hitsPerEntry) return json(409, { error: "Lượt đánh đã hết đòn" });
      if (body?.n !== s.hits) return json(409, { error: "Đòn cũ (đã xử lý)" });
      const { data: bRow } = await admin.from("world_boss").select("*").eq("id", s.boss).maybeSingle();
      const b = bRow as Boss | null;
      if (!b || b.hp <= 0 || Date.parse(b.ends_at) <= Date.now()) {
        if (b) await settle(b);
        return json(409, { error: b && b.hp <= 0 ? "Boss đã bị hạ gục!" : "Boss đã rút lui (hết giờ)", ended: true });
      }
      const elapsed = Date.now() - Date.parse(s.bar_at);
      if (s.hits > 0 && elapsed < MIN_GAP_MS) return json(429, { error: "Đánh quá nhanh" });
      // trọng tài: thời điểm bấm phải hợp lệ so với đồng hồ máy chủ (không khai gian được PERFECT)
      const pm = Number(body?.pressMs);
      const valid = Number.isFinite(pm) && pm >= MIN_PRESS_MS && pm <= Math.min(TURN_TIME_MS, elapsed + LATENCY_SLACK_MS);
      const zone: TimingZone = valid ? timingZone(needlePos(barFor(Number(s.seed), s.hits), pm)) : "red";
      const bd = WORLD_BOSS_BY_ID.get(b.boss_id) ?? { element: b.element as never, def: 250 };
      const dmg = wbHitDamage(s.team as CombatFish[], bd, zone);
      const name = await nameOf(me);
      const { data: hitRows, error: hErr } = await admin.rpc("wb_apply_hit", { p_boss: b.id, p_user: me, p_name: name, p_dmg: dmg });
      if (hErr) return json(500, { error: "Không ghi được đòn đánh" });
      const r = ((hitRows ?? []) as { hp: number; dealt: number; killed: boolean }[])[0] ?? { hp: 0, dealt: 0, killed: false };
      const hits = s.hits + 1;
      await admin.from("world_boss_sessions").update({ hits, damage: Number(s.damage) + Number(r.dealt), bar_at: new Date().toISOString() }).eq("id", sid).eq("hits", s.hits);
      if (r.killed) await settle({ ...b, hp: 0, killer: me, killer_name: name });
      return json(200, {
        zone,
        dmg: Number(r.dealt),
        hp: Number(r.hp),
        maxHp: Number(b.max_hp),
        killed: !!r.killed,
        hits,
        hitsMax: WORLD_BOSS.hitsPerEntry,
        bar: hits < WORLD_BOSS.hitsPerEntry ? barFor(Number(s.seed), hits) : null,
        sessionDamage: Number(s.damage) + Number(r.dealt),
      });
    }
    return json(400, { error: "Thao tác không hợp lệ" });
  } catch (e) {
    console.error(e);
    return json(500, { error: "Lỗi máy chủ" });
  }
});
