-- Bục vinh danh Đua Cá: thời gian về đích nhanh nhất của mỗi người ở từng giải. Top 3 hiện trên bục.
-- Chỉ thao tác qua RPC; tên lấy từ hồ sơ (không giả danh); thời gian quá nhanh so với giới hạn vật lý bị từ chối.
create table if not exists public.race_best (
  user_id uuid not null references auth.users (id) on delete cascade,
  league text not null check (league in ('tap_su', 'chuyen_nghiep', 'huyen_thoai')),
  best_ms int not null check (best_ms between 12000 and 600000),
  fish_id text not null check (char_length(fish_id) <= 64),
  char_id text not null check (char_length(char_id) <= 64),
  equip jsonb not null default '{}'::jsonb check (jsonb_typeof(equip) = 'object' and pg_column_size(equip) < 800),
  name text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, league)
);
create index if not exists race_best_rank on public.race_best (league, best_ms);
alter table public.race_best enable row level security;
revoke all on public.race_best from anon, authenticated;

-- Ghi thời gian về đích (chỉ giữ thành tích tốt nhất). Trả về thứ hạng hiện tại của mình ở giải đó.
create or replace function public.race_submit_time(p_league text, p_ms int, p_fish text, p_char text, p_equip jsonb default '{}'::jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); nm text; rk int;
begin
  if me is null then raise exception 'Chưa đăng nhập'; end if;
  if p_ms < 12000 or p_ms > 600000 then raise exception 'Thời gian không hợp lệ'; end if;
  select display_name into nm from player_cards where user_id = me;
  insert into race_best (user_id, league, best_ms, fish_id, char_id, equip, name)
  values (me, p_league, p_ms, left(p_fish, 64), left(p_char, 64), coalesce(p_equip, '{}'::jsonb), coalesce(nm, 'Người chơi'))
  on conflict (user_id, league) do update
    set best_ms = excluded.best_ms, fish_id = excluded.fish_id, char_id = excluded.char_id, equip = excluded.equip, name = excluded.name, updated_at = now()
    where excluded.best_ms < race_best.best_ms;
  select 1 + count(*) into rk from race_best b where b.league = p_league
    and b.best_ms < (select best_ms from race_best where user_id = me and league = p_league);
  return rk;
end $$;

create or replace function public.race_top(p_league text, p_limit int default 3)
returns table (rank int, user_id uuid, name text, best_ms int, fish_id text, char_id text, equip jsonb)
language sql stable security definer set search_path = public as $$
  select (row_number() over (order by b.best_ms, b.updated_at))::int, b.user_id, b.name, b.best_ms, b.fish_id, b.char_id, b.equip
  from race_best b where b.league = p_league
  order by b.best_ms, b.updated_at
  limit least(greatest(coalesce(p_limit, 3), 1), 20)
$$;

revoke execute on function public.race_submit_time(text, int, text, text, jsonb), public.race_top(text, int) from public, anon;
grant execute on function public.race_submit_time(text, int, text, text, jsonb), public.race_top(text, int) to authenticated;
