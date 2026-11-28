-- ĐẤU TRƯỜNG QUẢ CẦU ANIME – ĐẤU XẾP HẠNG (Ranked) bản đầu.
-- RP / MMR do MÁY CHỦ tính; trình duyệt chỉ báo "ai thắng trận có mã X". Chỉ cộng/trừ khi HAI người chơi báo khớp
-- (hoặc sau 90 giây mà chỉ một bên báo – bên kia đã thoát trận). Mỗi mã trận chỉ được tính một lần.
-- Một bên báo một mình chỉ được tính khi CẢ HAI đã "vào trận" (orb_ranked_begin) với cùng mã trận – không thể
-- tự bịa trận với một ID bất kỳ để lấy điểm.
-- Giới hạn: hai người thông đồng vẫn có thể dàn xếp kết quả – chặn hẳn cần máy chủ làm trọng tài (giai đoạn 2).

select public.orb_snapshot_all('truoc_20261217_ranked');

-- ----- cấu hình (Admin sửa trong SQL Editor) -----
create table if not exists public.orb_ranked_config (
  id int primary key default 1 check (id = 1),
  season int not null default 1,
  season_name text not null default 'Mùa 1',
  season_ends timestamptz,
  win_even int not null default 25,     -- thắng đối thủ ngang trình
  win_spread int not null default 10,   -- ± theo chênh lệch MMR (→ 15..35)
  loss_even int not null default 20,    -- thua đối thủ ngang trình
  loss_spread int not null default 5,   -- ± (→ -15..-25)
  mmr_k int not null default 32,
  placement_games int not null default 5,
  min_level int not null default 5,
  min_owned int not null default 5,
  min_matches int not null default 10,
  tier_shield int not null default 3,   -- số trận được bảo vệ khỏi tụt bậc sau khi vừa lên bậc
  challenger_top int not null default 100,
  pair_daily_full int not null default 3, -- số trận/ngày với cùng 1 đối thủ được tính đủ điểm
  pair_daily_max int not null default 6   -- sau mức này không tính điểm nữa
);
insert into public.orb_ranked_config (id) values (1) on conflict (id) do nothing;

-- ----- hạng của từng người chơi theo mùa -----
create table if not exists public.orb_rank (
  user_id uuid not null references auth.users (id) on delete cascade,
  season int not null,
  player_id text not null,
  name text not null default '',
  rp int not null default 0 check (rp >= 0),
  mmr int not null default 1000,
  wins int not null default 0,
  losses int not null default 0,
  placement int not null default 0,     -- số trận phân hạng đã đấu
  shield int not null default 0,
  peak_rp int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, season)
);
create index if not exists orb_rank_board on public.orb_rank (season, rp desc, wins desc, updated_at);

-- ----- trận xếp hạng (mỗi mã trận 1 dòng) -----
create table if not exists public.orb_ranked_matches (
  id text primary key check (char_length(id) between 6 and 64),
  season int not null,
  p1 uuid not null references auth.users (id) on delete cascade,
  p2 uuid not null references auth.users (id) on delete cascade,
  begun1 boolean not null default false, -- p1 đã xác nhận vào trận
  begun2 boolean not null default false, -- p2 đã xác nhận vào trận
  report1 uuid,            -- người thắng theo p1
  report2 uuid,            -- người thắng theo p2
  winner uuid,
  settled boolean not null default false,
  reason text,
  delta1 int, delta2 int,
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  check (p1 <> p2)
);
create index if not exists orb_ranked_matches_pair on public.orb_ranked_matches (p1, p2, created_at desc);

-- ----- lịch sử thay đổi RP (log mọi thay đổi) -----
create table if not exists public.orb_rank_history (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  season int not null,
  match_id text not null,
  result text not null,
  rp_before int not null, rp_after int not null, delta int not null,
  mmr_before int not null, mmr_after int not null,
  opponent_name text, reason text,
  created_at timestamptz not null default now(),
  unique (user_id, match_id)
);
create index if not exists orb_rank_history_user on public.orb_rank_history (user_id, created_at desc);

alter table public.orb_ranked_config enable row level security;
alter table public.orb_rank enable row level security;
alter table public.orb_ranked_matches enable row level security;
alter table public.orb_rank_history enable row level security;
drop policy if exists "orb_rank_read_all" on public.orb_rank;
create policy "orb_rank_read_all" on public.orb_rank for select to authenticated using (true);
drop policy if exists "orb_cfg_read_all" on public.orb_ranked_config;
create policy "orb_cfg_read_all" on public.orb_ranked_config for select to authenticated using (true);
drop policy if exists "orb_rhist_own" on public.orb_rank_history;
create policy "orb_rhist_own" on public.orb_rank_history for select to authenticated using (auth.uid() = user_id);
drop policy if exists "orb_rmatch_own" on public.orb_ranked_matches;
create policy "orb_rmatch_own" on public.orb_ranked_matches for select to authenticated using (auth.uid() in (p1, p2));
revoke all on public.orb_ranked_config, public.orb_rank, public.orb_ranked_matches, public.orb_rank_history from anon, authenticated;
grant select on public.orb_ranked_config, public.orb_rank, public.orb_ranked_matches, public.orb_rank_history to authenticated;

-- ----- bậc rank từ RP: 0 Tân Binh · 1..5 Đồng→Kim Cương (4 cấp × 100 RP) · 6 Cao Thủ (≥ 2100) -----
create or replace function public.orb_rank_tier(p_rp int) returns int
language sql immutable as $$ select case when p_rp < 100 then 0 when p_rp >= 2100 then 6 else 1 + (p_rp - 100) / 400 end $$;
create or replace function public.orb_rank_floor(p_tier int) returns int
language sql immutable as $$ select case when p_tier <= 0 then 0 when p_tier >= 6 then 2100 else 100 + (p_tier - 1) * 400 end $$;

/** Hàng hạng của người chơi ở mùa hiện tại (tạo nếu chưa có). */
create or replace function public.orb_rank_row(p_uid uuid) returns public.orb_rank
language plpgsql security definer set search_path = public as $$
declare cfg public.orb_ranked_config; r public.orb_rank; s public.orb_saves;
begin
  select * into cfg from public.orb_ranked_config where id = 1;
  select * into r from public.orb_rank where user_id = p_uid and season = cfg.season;
  if found then return r; end if;
  select * into s from public.orb_saves where user_id = p_uid;
  if not found then raise exception 'Chưa có bản lưu tài khoản'; end if;
  insert into public.orb_rank (user_id, season, player_id, name) values (p_uid, cfg.season, s.player_id, coalesce(s.save ->> 'name', ''))
  returning * into r;
  return r;
end $$;
revoke all on function public.orb_rank_row(uuid) from public, anon, authenticated;

/** Đủ điều kiện mở Ranked (đọc từ bản lưu tài khoản). Trả về null nếu đủ, hoặc lý do. */
create or replace function public.orb_ranked_block(p_uid uuid) returns text
language plpgsql stable security definer set search_path = public as $$
declare cfg public.orb_ranked_config; s public.orb_saves; m int; w int; owned int; xp int; lv int := 1; need int := 100;
begin
  select * into cfg from public.orb_ranked_config where id = 1;
  select * into s from public.orb_saves where user_id = p_uid;
  if not found then return 'Chưa có bản lưu tài khoản'; end if;
  m := public.orb_num(s.save, 'matches'); w := public.orb_num(s.save, 'wins');
  owned := case when jsonb_typeof(s.save -> 'unlocked') = 'array' then jsonb_array_length(s.save -> 'unlocked') else 0 end;
  xp := m * 20 + w * 30;
  while xp >= need and lv < 99 loop xp := xp - need; lv := lv + 1; need := 100 + (lv - 1) * 50; end loop;
  if lv < cfg.min_level then return format('Cần cấp độ %s (hiện %s)', cfg.min_level, lv); end if;
  if owned < cfg.min_owned then return format('Cần sở hữu %s quả cầu (hiện %s)', cfg.min_owned, owned); end if;
  if m < cfg.min_matches then return format('Cần hoàn thành %s trận thường (hiện %s)', cfg.min_matches, m); end if;
  return null;
end $$;
revoke all on function public.orb_ranked_block(uuid) from public, anon, authenticated;

/** Chốt một trận: cập nhật RP / MMR cho cả hai người (gọi nội bộ, đã khoá dòng trận). */
create or replace function public.orb_ranked_apply(m public.orb_ranked_matches, p_winner uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  cfg public.orb_ranked_config; a public.orb_rank; b public.orb_rank; pairn int; mul numeric := 1;
  ea numeric; d int; da int; db int; ma int; mb int; na text; nb text; ta int; tb int;
begin
  select * into cfg from public.orb_ranked_config where id = 1;
  a := public.orb_rank_row(m.p1); b := public.orb_rank_row(m.p2);
  select * into a from public.orb_rank where user_id = m.p1 and season = cfg.season for update;
  select * into b from public.orb_rank where user_id = m.p2 and season = cfg.season for update;
  -- chống cày điểm với cùng một người
  select count(*) into pairn from public.orb_ranked_matches
   where settled and winner is not null and settled_at > now() - interval '24 hours'
     and ((p1 = m.p1 and p2 = m.p2) or (p1 = m.p2 and p2 = m.p1));
  if pairn >= cfg.pair_daily_max then mul := 0; elsif pairn >= cfg.pair_daily_full then mul := 0.5; end if;
  ea := 1 / (1 + power(10, (b.mmr - a.mmr) / 400.0));
  d := b.mmr - a.mmr; -- > 0: A gặp đối thủ mạnh hơn
  if p_winner = m.p1 then
    da := round((cfg.win_even + greatest(-cfg.win_spread, least(cfg.win_spread, d / 40))) * mul);
    db := -round((cfg.loss_even + greatest(-cfg.loss_spread, least(cfg.loss_spread, d / 40))) * mul);
    ma := round(cfg.mmr_k * (1 - ea)); mb := -ma;
  else
    da := -round((cfg.loss_even - greatest(-cfg.loss_spread, least(cfg.loss_spread, d / 40))) * mul);
    db := round((cfg.win_even - greatest(-cfg.win_spread, least(cfg.win_spread, d / 40))) * mul);
    ma := -round(cfg.mmr_k * ea); mb := -ma;
  end if;
  -- phân hạng: điểm gấp đôi, không trừ
  if a.placement < cfg.placement_games then da := greatest(0, da * 2); end if;
  if b.placement < cfg.placement_games then db := greatest(0, db * 2); end if;
  -- bảo vệ tụt bậc ngay sau khi vừa lên
  ta := public.orb_rank_tier(a.rp); tb := public.orb_rank_tier(b.rp);
  if da < 0 and public.orb_rank_tier(greatest(0, a.rp + da)) < ta and a.shield > 0 then da := public.orb_rank_floor(ta) - a.rp; a.shield := a.shield - 1; end if;
  if db < 0 and public.orb_rank_tier(greatest(0, b.rp + db)) < tb and b.shield > 0 then db := public.orb_rank_floor(tb) - b.rp; b.shield := b.shield - 1; end if;
  da := greatest(da, -a.rp); db := greatest(db, -b.rp);
  insert into public.orb_rank_history (user_id, season, match_id, result, rp_before, rp_after, delta, mmr_before, mmr_after, opponent_name, reason)
  values (m.p1, cfg.season, m.id, case when p_winner = m.p1 then 'win' else 'loss' end, a.rp, a.rp + da, da, a.mmr, a.mmr + ma, b.name, p_reason),
         (m.p2, cfg.season, m.id, case when p_winner = m.p2 then 'win' else 'loss' end, b.rp, b.rp + db, db, b.mmr, b.mmr + mb, a.name, p_reason)
  on conflict (user_id, match_id) do nothing;
  update public.orb_rank set rp = rp + da, mmr = mmr + ma, wins = wins + (p_winner = m.p1)::int, losses = losses + (p_winner <> m.p1)::int,
         placement = least(placement + 1, 999), peak_rp = greatest(peak_rp, rp + da), updated_at = now(),
         shield = case when public.orb_rank_tier(rp + da) > public.orb_rank_tier(rp) then cfg.tier_shield else a.shield end
   where user_id = m.p1 and season = cfg.season;
  update public.orb_rank set rp = rp + db, mmr = mmr + mb, wins = wins + (p_winner = m.p2)::int, losses = losses + (p_winner <> m.p2)::int,
         placement = least(placement + 1, 999), peak_rp = greatest(peak_rp, rp + db), updated_at = now(),
         shield = case when public.orb_rank_tier(rp + db) > public.orb_rank_tier(rp) then cfg.tier_shield else b.shield end
   where user_id = m.p2 and season = cfg.season;
  update public.orb_ranked_matches set winner = p_winner, settled = true, settled_at = now(), reason = p_reason, delta1 = da, delta2 = db where id = m.id;
end $$;
revoke all on function public.orb_ranked_apply(public.orb_ranked_matches, uuid, text) from public, anon, authenticated;

/** Chốt trận treo: một bên báo (cả hai đã vào trận) quá 90 giây → tính theo bên đã báo; quá 15 phút không ai báo → huỷ. */
create or replace function public.orb_ranked_settle_stale() returns void
language plpgsql security definer set search_path = public as $$
declare m public.orb_ranked_matches;
begin
  for m in select * from public.orb_ranked_matches where not settled and begun1 and begun2
           and created_at < now() - interval '90 seconds'
           and ((report1 is null) <> (report2 is null)) for update skip locked loop
    perform public.orb_ranked_apply(m, coalesce(m.report1, m.report2), 'một bên rời trận');
  end loop;
  update public.orb_ranked_matches set settled = true, settled_at = now(), reason = 'trận bị huỷ – không tính điểm'
   where not settled and created_at < now() - interval '15 minutes';
end $$;
revoke all on function public.orb_ranked_settle_stale() from public, anon, authenticated;

/** Trạng thái Ranked của chính mình (+ điều kiện mở, cấu hình hiển thị). */
create or replace function public.orb_ranked_status()
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); cfg public.orb_ranked_config; r public.orb_rank; blk text; pos int;
begin
  if uid is null then raise exception 'Chưa đăng nhập'; end if;
  perform public.orb_ranked_settle_stale();
  select * into cfg from public.orb_ranked_config where id = 1;
  blk := public.orb_ranked_block(uid);
  r := public.orb_rank_row(uid);
  select count(*) + 1 into pos from public.orb_rank where season = cfg.season and (rp > r.rp or (rp = r.rp and wins > r.wins));
  return jsonb_build_object('season', cfg.season, 'season_name', cfg.season_name, 'season_ends', cfg.season_ends,
    'rp', r.rp, 'mmr', r.mmr, 'wins', r.wins, 'losses', r.losses, 'placement', r.placement, 'placement_games', cfg.placement_games,
    'peak_rp', r.peak_rp, 'shield', r.shield, 'position', pos, 'challenger_top', cfg.challenger_top, 'block', blk,
    'challenger', (r.rp >= 2100 and pos <= cfg.challenger_top));
end $$;

/** Xác nhận vào trận xếp hạng (gọi lúc trận bắt đầu ở cả hai máy). */
create or replace function public.orb_ranked_begin(p_match text, p_opponent text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); opp uuid; cfg public.orb_ranked_config; m public.orb_ranked_matches; blk text;
begin
  if uid is null then raise exception 'Chưa đăng nhập'; end if;
  select * into cfg from public.orb_ranked_config where id = 1;
  if char_length(coalesce(p_match, '')) not between 6 and 64 then return jsonb_build_object('ok', false, 'reason', 'Mã trận không hợp lệ'); end if;
  select user_id into opp from public.orb_saves where player_id = upper(replace(coalesce(p_opponent, ''), '#', ''));
  if opp is null then return jsonb_build_object('ok', false, 'reason', 'Đối thủ không có tài khoản'); end if;
  if opp = uid then return jsonb_build_object('ok', false, 'reason', 'Không thể tự đấu với chính mình'); end if;
  blk := public.orb_ranked_block(uid);
  if blk is not null then return jsonb_build_object('ok', false, 'reason', blk); end if;
  perform public.orb_rank_row(uid); perform public.orb_rank_row(opp);
  insert into public.orb_ranked_matches (id, season, p1, p2) values (p_match, cfg.season, uid, opp) on conflict (id) do nothing;
  select * into m from public.orb_ranked_matches where id = p_match for update;
  if not (uid in (m.p1, m.p2) and opp in (m.p1, m.p2)) then return jsonb_build_object('ok', false, 'reason', 'Mã trận không khớp người chơi'); end if;
  if m.settled then return jsonb_build_object('ok', false, 'reason', 'Trận đã kết thúc'); end if;
  if uid = m.p1 then update public.orb_ranked_matches set begun1 = true where id = m.id;
  else update public.orb_ranked_matches set begun2 = true where id = m.id; end if;
  return jsonb_build_object('ok', true);
end $$;

/**
 * Báo kết quả trận xếp hạng. p_match: mã trận (giống nhau ở cả hai máy), p_opponent: ID #XXXXXX đối thủ,
 * p_winner: ID người thắng. Máy chủ tự tính điểm khi hai bên báo khớp.
 */
create or replace function public.orb_ranked_report(p_match text, p_opponent text, p_winner text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); opp uuid; win uuid; cfg public.orb_ranked_config; m public.orb_ranked_matches; blk text;
begin
  if uid is null then raise exception 'Chưa đăng nhập'; end if;
  select * into cfg from public.orb_ranked_config where id = 1;
  if char_length(coalesce(p_match, '')) not between 6 and 64 then return jsonb_build_object('ok', false, 'reason', 'Mã trận không hợp lệ'); end if;
  select user_id into opp from public.orb_saves where player_id = upper(replace(coalesce(p_opponent, ''), '#', ''));
  if opp is null then return jsonb_build_object('ok', false, 'reason', 'Đối thủ không có tài khoản'); end if;
  if opp = uid then return jsonb_build_object('ok', false, 'reason', 'Không thể tự đấu với chính mình'); end if;
  blk := public.orb_ranked_block(uid);
  if blk is not null then return jsonb_build_object('ok', false, 'reason', blk); end if;
  select user_id into win from public.orb_saves where player_id = upper(replace(coalesce(p_winner, ''), '#', ''));
  if win is null or win not in (uid, opp) then return jsonb_build_object('ok', false, 'reason', 'Người thắng không hợp lệ'); end if;
  perform public.orb_rank_row(uid); perform public.orb_rank_row(opp);
  insert into public.orb_ranked_matches (id, season, p1, p2) values (p_match, cfg.season, uid, opp) on conflict (id) do nothing;
  select * into m from public.orb_ranked_matches where id = p_match for update;
  if not (uid in (m.p1, m.p2) and opp in (m.p1, m.p2)) then return jsonb_build_object('ok', false, 'reason', 'Mã trận không khớp người chơi'); end if;
  if not m.settled then
    if uid = m.p1 and m.report1 is null then update public.orb_ranked_matches set report1 = win where id = m.id; m.report1 := win; end if;
    if uid = m.p2 and m.report2 is null then update public.orb_ranked_matches set report2 = win where id = m.id; m.report2 := win; end if;
    if m.report1 is not null and m.report2 is not null then
      if m.report1 = m.report2 then perform public.orb_ranked_apply(m, m.report1, 'hai bên xác nhận');
      else update public.orb_ranked_matches set settled = true, settled_at = now(), reason = 'kết quả không khớp – không tính điểm' where id = m.id; end if;
    end if;
    select * into m from public.orb_ranked_matches where id = p_match;
  end if;
  return jsonb_build_object('ok', true, 'settled', m.settled, 'reason', m.reason,
    'delta', case when uid = m.p1 then m.delta1 else m.delta2 end, 'won', m.winner = uid, 'status', public.orb_ranked_status());
end $$;

/** Bảng xếp hạng mùa (toàn máy chủ hoặc danh sách ID bạn bè). */
create or replace function public.orb_ranked_board(p_fids text[] default null, p_limit int default 100, p_season int default null)
returns table (pos bigint, player_id text, name text, rp int, wins int, losses int, peak_rp int)
language plpgsql stable security definer set search_path = public as $$
declare cfg public.orb_ranked_config;
begin
  select * into cfg from public.orb_ranked_config where id = 1;
  return query
    select row_number() over (order by r.rp desc, r.wins desc, r.updated_at), r.player_id, r.name, r.rp, r.wins, r.losses, r.peak_rp
      from public.orb_rank r
     where r.season = coalesce(p_season, cfg.season) and (r.wins + r.losses) > 0
       and (p_fids is null or r.player_id = any (p_fids))
     order by r.rp desc, r.wins desc, r.updated_at
     limit greatest(1, least(coalesce(p_limit, 100), 500));
end $$;

/** Lịch sử Ranked của chính mình. */
create or replace function public.orb_ranked_history(p_limit int default 20)
returns setof public.orb_rank_history language sql stable security definer set search_path = public as $$
  select * from public.orb_rank_history where user_id = auth.uid() order by created_at desc limit greatest(1, least(coalesce(p_limit, 20), 100));
$$;

revoke all on function public.orb_ranked_status(), public.orb_ranked_begin(text, text), public.orb_ranked_report(text, text, text), public.orb_ranked_board(text[], int, int), public.orb_ranked_history(int) from public, anon;
grant execute on function public.orb_ranked_status(), public.orb_ranked_begin(text, text), public.orb_ranked_report(text, text, text), public.orb_ranked_board(text[], int, int), public.orb_ranked_history(int) to authenticated;
grant execute on function public.orb_rank_tier(int), public.orb_rank_floor(int) to authenticated;
