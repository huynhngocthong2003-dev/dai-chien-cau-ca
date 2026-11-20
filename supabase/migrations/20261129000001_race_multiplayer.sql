-- ĐUA CÁ với người chơi: hàng chờ theo giải → phòng đua (tối đa 5 người, máy lấp chỗ trống) → vị trí trực tiếp.
-- Ghép qua RPC (khóa hàng chờ, không ghép trùng). Mỗi người chỉ cập nhật vị trí của chính mình.

create table if not exists public.race_queue (
  user_id uuid primary key references auth.users (id) on delete cascade,
  league text not null check (league in ('tap_su', 'chuyen_nghiep', 'huyen_thoai')),
  racer jsonb not null check (jsonb_typeof(racer) = 'object' and pg_column_size(racer) < 1500),
  joined_at timestamptz not null default now()
);
alter table public.race_queue enable row level security;
revoke all on public.race_queue from anon, authenticated;

create table if not exists public.race_rooms (
  id bigint generated always as identity primary key,
  league text not null,
  seed int not null,
  start_at timestamptz not null,
  created_at timestamptz not null default now()
);
create table if not exists public.race_members (
  room_id bigint not null references public.race_rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  slot int not null check (slot between 0 and 4),
  racer jsonb not null,
  x real not null default 0 check (x between -50 and 2000),
  lane int not null default 1 check (lane between 0 and 2),
  boosting boolean not null default false,
  finish_ms int check (finish_ms is null or finish_ms between 1000 and 600000),
  updated_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
create index if not exists race_members_user on public.race_members (user_id, room_id desc);

-- chỉ được sửa vị trí/làn/tăng tốc/thời gian về đích của chính mình
create or replace function public.race_members_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  new.room_id := old.room_id;
  new.user_id := old.user_id;
  new.slot := old.slot;
  new.racer := old.racer;
  if old.finish_ms is not null then new.finish_ms := old.finish_ms; end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists race_members_guard on public.race_members;
create trigger race_members_guard before update on public.race_members for each row execute function public.race_members_guard();

create or replace function public.is_race_member(p_room bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from race_members where room_id = p_room and user_id = auth.uid())
$$;

alter table public.race_rooms enable row level security;
alter table public.race_members enable row level security;
drop policy if exists "race_rooms_member" on public.race_rooms;
create policy "race_rooms_member" on public.race_rooms for select to authenticated using (public.is_race_member(id));
drop policy if exists "race_members_read" on public.race_members;
create policy "race_members_read" on public.race_members for select to authenticated using (public.is_race_member(room_id));
drop policy if exists "race_members_update_own" on public.race_members;
create policy "race_members_update_own" on public.race_members for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.race_rooms, public.race_members from anon, authenticated;
grant select on public.race_rooms to authenticated;
grant select, update (x, lane, boosting, finish_ms) on public.race_members to authenticated;

-- Vào hàng chờ (tên do máy chủ lấy từ hồ sơ – không giả danh)
create or replace function public.race_queue_join(p_league text, p_racer jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare nm text;
begin
  if auth.uid() is null then raise exception 'Chưa đăng nhập'; end if;
  select display_name into nm from player_cards where user_id = auth.uid();
  insert into race_queue (user_id, league, racer)
  values (auth.uid(), p_league, coalesce(p_racer, '{}'::jsonb) || jsonb_build_object('name', coalesce(nm, 'Người chơi')))
  on conflict (user_id) do update set league = excluded.league, racer = excluded.racer, joined_at = now();
end $$;

create or replace function public.race_queue_leave()
returns void language sql security definer set search_path = public as $$
  delete from race_queue where user_id = auth.uid()
$$;

create or replace function public.race_queue_count(p_league text)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from race_queue where league = p_league and joined_at > now() - interval '150 seconds'
$$;

-- Phòng đua của mình (nếu đã được ghép) hoặc ghép ngay khi đủ người.
-- Ghép khi: có ≥ 5 người, hoặc ≥ 2 người và người chờ lâu nhất đã đợi ≥ 15 giây.
create or replace function public.race_find(p_league text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); rid bigint; n int; oldest timestamptz; ids uuid[]; i int;
begin
  if me is null then raise exception 'Chưa đăng nhập'; end if;
  -- đã có phòng (được người khác ghép vào) trong 3 phút gần đây?
  select m.room_id into rid from race_members m join race_rooms r on r.id = m.room_id
    where m.user_id = me and r.created_at > now() - interval '3 minutes' and m.finish_ms is null
    order by m.room_id desc limit 1;
  if rid is null then
    delete from race_queue where joined_at < now() - interval '150 seconds';
    perform 1 from race_queue where user_id = me and league = p_league for update;
    if not found then return null; end if;
    select count(*), min(joined_at) into n, oldest from race_queue where league = p_league;
    if n < 2 or (n < 5 and oldest > now() - interval '15 seconds') then return null; end if;
    select array_agg(user_id order by (user_id = me) desc, joined_at) into ids
      from (select user_id, joined_at from race_queue where league = p_league
            order by (user_id = me) desc, joined_at limit 5 for update skip locked) q;
    if coalesce(array_length(ids, 1), 0) < 2 then return null; end if;
    insert into race_rooms (league, seed, start_at) values (p_league, floor(random() * 2000000000)::int + 1, now() + interval '6 seconds') returning id into rid;
    for i in 1 .. array_length(ids, 1) loop
      insert into race_members (room_id, user_id, slot, racer)
        select rid, q.user_id, i - 1, q.racer from race_queue q where q.user_id = ids[i];
    end loop;
    delete from race_queue where user_id = any (ids);
  end if;
  return (select jsonb_build_object(
    'room_id', r.id, 'league', r.league, 'seed', r.seed,
    'start_in_ms', greatest(0, round(extract(epoch from (r.start_at - now())) * 1000))::int,
    'members', (select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'slot', m.slot, 'racer', m.racer) order by m.slot) from race_members m where m.room_id = r.id))
    from race_rooms r where r.id = rid);
end $$;

revoke execute on function public.race_queue_join(text, jsonb), public.race_queue_leave(), public.race_queue_count(text), public.race_find(text), public.is_race_member(bigint) from public, anon;
grant execute on function public.race_queue_join(text, jsonb), public.race_queue_leave(), public.race_queue_count(text), public.race_find(text), public.is_race_member(bigint) to authenticated;
