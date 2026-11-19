-- Đấu Sinh Tử – ghép trận ngẫu nhiên với người chơi đang chờ cùng lúc.
-- Hàng chờ chỉ thao tác qua RPC; trận đấu vẫn do Edge Function death-match tính.

create table if not exists public.dm_queue (
  user_id uuid primary key references auth.users (id) on delete cascade,
  power int not null default 0 check (power between 0 and 100000000),
  joined_at timestamptz not null default now()
);
alter table public.dm_queue enable row level security;
revoke all on public.dm_queue from anon, authenticated;

-- Vào hàng chờ (hoặc làm mới thời gian chờ)
create or replace function public.dm_queue_join(p_power int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Chưa đăng nhập'; end if;
  insert into dm_queue (user_id, power) values (auth.uid(), greatest(0, least(p_power, 100000000)))
  on conflict (user_id) do update set power = excluded.power, joined_at = now();
end $$;

create or replace function public.dm_queue_leave()
returns void language sql security definer set search_path = public as $$
  delete from dm_queue where user_id = auth.uid()
$$;

-- Tìm đối thủ đang chờ (ưu tiên lực chiến gần nhất). Nếu p_require_queued = true thì chỉ ghép khi
-- người gọi vẫn còn trong hàng chờ (tránh ghép 2 lần khi người khác vừa ghép mình).
-- Ghép xong: cả 2 rời hàng chờ; người gọi là bên thách đấu.
create or replace function public.dm_queue_pair(p_power int, p_require_queued boolean default false)
returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); opp uuid;
begin
  if me is null then raise exception 'Chưa đăng nhập'; end if;
  delete from dm_queue where joined_at < now() - interval '90 seconds';
  if p_require_queued then
    perform 1 from dm_queue where user_id = me for update;
    if not found then return null; end if;
  end if;
  select q.user_id into opp from dm_queue q
    where q.user_id <> me
    order by abs(q.power - greatest(0, p_power)), q.joined_at
    limit 1 for update skip locked;
  if opp is null then return null; end if;
  delete from dm_queue where user_id in (me, opp);
  return opp;
end $$;

-- Số người đang chờ (không tính mình)
create or replace function public.dm_queue_count()
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from dm_queue where user_id <> auth.uid() and joined_at > now() - interval '90 seconds'
$$;

-- Đối thủ ngẫu nhiên khi không ai đang chờ (dùng đội phòng thủ của họ)
create or replace function public.dm_random_opponents(p_level int, p_limit int default 5)
returns table (user_id uuid, display_name text, level int)
language sql volatile security invoker set search_path = public as $$
  select c.user_id, c.display_name, c.level from player_cards c
  where c.user_id <> auth.uid()
  order by abs(c.level - p_level) / 5, random()
  limit least(greatest(p_limit, 1), 20)
$$;

revoke execute on function public.dm_queue_join(int), public.dm_queue_leave(), public.dm_queue_pair(int, boolean),
  public.dm_queue_count(), public.dm_random_opponents(int, int) from public, anon;
grant execute on function public.dm_queue_join(int), public.dm_queue_leave(), public.dm_queue_pair(int, boolean),
  public.dm_queue_count(), public.dm_random_opponents(int, int) to authenticated;
