-- ĐẤU TRƯỜNG QUẢ CẦU ANIME – ĐẤU XẾP HẠNG VỚI MÁY (khi 10 giây không ghép được người).
-- Máy mang tên ngẫu nhiên như người chơi (trình duyệt gửi tên); admin phân biệt qua bảng orb_ranked_bot_matches.
-- Trận với máy chạy trên máy người chơi nên máy chủ KHÔNG tự kiểm chứng được ai thắng → giới hạn để không cày điểm:
--   · điểm chỉ bằng bot_mul (60%) trận người – người, tối đa bot_daily_max trận có điểm / 24 giờ;
--   · trận phải kéo dài tối thiểu bot_min_seconds giây; mỗi lúc chỉ 1 trận máy đang mở;
--   · trận đã mở mà không báo kết quả (thoát giữa chừng) → tính THUA ("bỏ trận") khi mở trận mới hoặc sau 15 phút.

alter table public.orb_ranked_config
  add column if not exists bot_mul numeric not null default 0.6,
  add column if not exists bot_daily_max int not null default 10,
  add column if not exists bot_min_seconds int not null default 12;

create table if not exists public.orb_ranked_bot_matches (
  id text primary key check (char_length(id) between 6 and 64),
  user_id uuid not null references auth.users (id) on delete cascade,
  season int not null,
  bot_name text not null default 'Máy',
  created_at timestamptz not null default now(),
  settled boolean not null default false,
  won boolean,
  delta int,
  reason text,
  settled_at timestamptz
);
create index if not exists orb_ranked_bot_user on public.orb_ranked_bot_matches (user_id, created_at desc);
alter table public.orb_ranked_bot_matches enable row level security;
drop policy if exists "orb_rbot_own" on public.orb_ranked_bot_matches;
create policy "orb_rbot_own" on public.orb_ranked_bot_matches for select to authenticated using (auth.uid() = user_id);
revoke all on public.orb_ranked_bot_matches from anon, authenticated;
grant select on public.orb_ranked_bot_matches to authenticated;

create or replace function public.orb_rank_tier_name(p_rp int) returns text
language sql immutable as $$
  select case public.orb_rank_tier(p_rp) when 0 then 'Tân Binh' when 1 then 'Đồng' when 2 then 'Bạc' when 3 then 'Vàng'
    when 4 then 'Bạch Kim' when 5 then 'Kim Cương' else 'Cao Thủ' end $$;

/** Chốt một trận với máy (gọi nội bộ). */
create or replace function public.orb_ranked_bot_apply(m public.orb_ranked_bot_matches, p_won boolean, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare cfg public.orb_ranked_config; a public.orb_rank; n int; mul numeric; d int; ma int; ta int;
begin
  select * into cfg from public.orb_ranked_config where id = 1;
  perform public.orb_rank_row(m.user_id);
  select * into a from public.orb_rank where user_id = m.user_id and season = m.season for update;
  if not found then return; end if;
  select count(*) into n from public.orb_ranked_bot_matches
   where user_id = m.user_id and settled and delta is not null and settled_at > now() - interval '24 hours';
  mul := case when n >= cfg.bot_daily_max then 0 else cfg.bot_mul end;
  if p_won then d := round(cfg.win_even * mul); ma := round(cfg.mmr_k * 0.5 * mul);
  else d := -round(cfg.loss_even * mul); ma := -round(cfg.mmr_k * 0.5 * mul); end if;
  if a.placement < cfg.placement_games then d := greatest(0, d * 2); end if;
  ta := public.orb_rank_tier(a.rp);
  if d < 0 and public.orb_rank_tier(greatest(0, a.rp + d)) < ta and a.shield > 0 then d := public.orb_rank_floor(ta) - a.rp; a.shield := a.shield - 1; end if;
  d := greatest(d, -a.rp);
  insert into public.orb_rank_history (user_id, season, match_id, result, rp_before, rp_after, delta, mmr_before, mmr_after, opponent_name, reason)
  values (m.user_id, m.season, m.id, case when p_won then 'win' else 'loss' end, a.rp, a.rp + d, d, a.mmr, a.mmr + ma, m.bot_name,
          p_reason || case when mul = 0 then ' · không tính điểm (giới hạn trận trong ngày)' else '' end)
  on conflict (user_id, match_id) do nothing;
  update public.orb_rank set rp = rp + d, mmr = mmr + ma, wins = wins + p_won::int, losses = losses + (not p_won)::int,
         placement = least(placement + 1, 999), peak_rp = greatest(peak_rp, rp + d), updated_at = now(),
         shield = case when public.orb_rank_tier(rp + d) > public.orb_rank_tier(rp) then cfg.tier_shield else a.shield end
   where user_id = m.user_id and season = m.season;
  update public.orb_ranked_bot_matches set settled = true, won = p_won, delta = d, reason = p_reason, settled_at = now() where id = m.id;
end $$;
revoke all on function public.orb_ranked_bot_apply(public.orb_ranked_bot_matches, boolean, text) from public, anon, authenticated;

/** Trận máy bị bỏ dở (không báo kết quả) → tính thua. p_all: chốt mọi trận đang mở của người này (khi mở trận mới). */
create or replace function public.orb_ranked_bot_abandon(p_uid uuid, p_all boolean) returns void
language plpgsql security definer set search_path = public as $$
declare m public.orb_ranked_bot_matches;
begin
  for m in select * from public.orb_ranked_bot_matches where user_id = p_uid and not settled
           and (p_all or created_at < now() - interval '15 minutes') for update skip locked loop
    perform public.orb_ranked_bot_apply(m, false, 'một bên rời trận');
  end loop;
end $$;
revoke all on function public.orb_ranked_bot_abandon(uuid, boolean) from public, anon, authenticated;

/** Mở trận xếp hạng với máy: trả mã trận + bậc hạng để trình duyệt dựng máy cùng trình độ. p_name: tên hiển thị của máy. */
drop function if exists public.orb_ranked_bot_begin();
create or replace function public.orb_ranked_bot_begin(p_name text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); cfg public.orb_ranked_config; r public.orb_rank; blk text; mid text; nm text;
begin
  if uid is null then raise exception 'Chưa đăng nhập'; end if;
  select * into cfg from public.orb_ranked_config where id = 1;
  blk := public.orb_ranked_block(uid);
  if blk is not null then return jsonb_build_object('ok', false, 'reason', blk); end if;
  perform public.orb_ranked_bot_abandon(uid, true);
  r := public.orb_rank_row(uid);
  mid := 'B' || replace(gen_random_uuid()::text, '-', '');
  nm := coalesce(nullif(left(regexp_replace(coalesce(p_name, ''), '[<>"&]', '', 'g'), 20), ''), 'Đấu Sĩ');
  insert into public.orb_ranked_bot_matches (id, user_id, season, bot_name) values (mid, uid, cfg.season, nm);
  return jsonb_build_object('ok', true, 'id', mid, 'rp', r.rp, 'tier', public.orb_rank_tier(r.rp), 'bot_name', nm);
end $$;

/** Báo kết quả trận với máy (mỗi trận chỉ tính một lần). */
create or replace function public.orb_ranked_bot_report(p_match text, p_won boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); cfg public.orb_ranked_config; m public.orb_ranked_bot_matches;
begin
  if uid is null then raise exception 'Chưa đăng nhập'; end if;
  select * into cfg from public.orb_ranked_config where id = 1;
  select * into m from public.orb_ranked_bot_matches where id = p_match and user_id = uid for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'Không tìm thấy trận'); end if;
  if not m.settled then
    if p_won and now() - m.created_at < make_interval(secs => cfg.bot_min_seconds) then
      update public.orb_ranked_bot_matches set settled = true, settled_at = now(), reason = 'trận quá ngắn – không tính điểm' where id = m.id;
    else
      perform public.orb_ranked_bot_apply(m, coalesce(p_won, false), 'hai bên xác nhận');
    end if;
    select * into m from public.orb_ranked_bot_matches where id = p_match;
  end if;
  return jsonb_build_object('ok', true, 'settled', true, 'won', m.won, 'delta', m.delta, 'reason', m.reason, 'status', public.orb_ranked_status());
end $$;

-- trạng thái: chốt luôn các trận máy bị bỏ dở quá 15 phút
create or replace function public.orb_ranked_status()
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); cfg public.orb_ranked_config; r public.orb_rank; blk text; pos int;
begin
  if uid is null then raise exception 'Chưa đăng nhập'; end if;
  perform public.orb_ranked_settle_stale();
  perform public.orb_ranked_bot_abandon(uid, false);
  select * into cfg from public.orb_ranked_config where id = 1;
  blk := public.orb_ranked_block(uid);
  r := public.orb_rank_row(uid);
  select count(*) + 1 into pos from public.orb_rank where season = cfg.season and (rp > r.rp or (rp = r.rp and wins > r.wins));
  return jsonb_build_object('season', cfg.season, 'season_name', cfg.season_name, 'season_ends', cfg.season_ends,
    'rp', r.rp, 'mmr', r.mmr, 'wins', r.wins, 'losses', r.losses, 'placement', r.placement, 'placement_games', cfg.placement_games,
    'peak_rp', r.peak_rp, 'shield', r.shield, 'position', pos, 'challenger_top', cfg.challenger_top, 'block', blk,
    'challenger', (r.rp >= 2100 and pos <= cfg.challenger_top), 'bot_mul', cfg.bot_mul, 'bot_daily_max', cfg.bot_daily_max);
end $$;

revoke all on function public.orb_ranked_bot_begin(text), public.orb_ranked_bot_report(text, boolean) from public, anon;
grant execute on function public.orb_ranked_bot_begin(text), public.orb_ranked_bot_report(text, boolean) to authenticated;
grant execute on function public.orb_rank_tier_name(int) to authenticated;
