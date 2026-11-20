-- ĐUA CÁ – PHÒNG RIÊNG: chủ phòng tạo mã, mời bạn bè (tin nhắn có mã), mọi người sẵn sàng → chủ phòng bắt đầu.
-- Tái dùng race_rooms / race_members cho cuộc đua (vị trí trực tiếp như đua ghép ngẫu nhiên).

alter table public.race_rooms add column if not exists map text;

-- JSON phòng đua dùng chung cho ghép ngẫu nhiên và phòng riêng
create or replace function public.race_room_json(rid bigint) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'room_id', r.id, 'league', r.league, 'seed', r.seed, 'map', r.map,
    'start_in_ms', greatest(0, round(extract(epoch from (r.start_at - now())) * 1000))::int,
    'members', (select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'slot', m.slot, 'racer', m.racer) order by m.slot) from race_members m where m.room_id = r.id))
  from race_rooms r where r.id = rid
$$;
revoke execute on function public.race_room_json(bigint) from public, anon, authenticated;

-- (cập nhật) ghép ngẫu nhiên trả thêm bản đồ
create or replace function public.race_find(p_league text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); rid bigint; n int; oldest timestamptz; ids uuid[]; i int;
begin
  if me is null then raise exception 'Chưa đăng nhập'; end if;
  select m.room_id into rid from race_members m join race_rooms r on r.id = m.room_id
    where m.user_id = me and r.created_at > now() - interval '3 minutes' and m.finish_ms is null
      and not exists (select 1 from race_lobbies l where l.room_id = r.id)
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
  return public.race_room_json(rid);
end $$;

create table if not exists public.race_lobbies (
  id bigint generated always as identity primary key,
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  host uuid not null references auth.users (id) on delete cascade,
  league text not null check (league in ('tap_su', 'chuyen_nghiep', 'huyen_thoai')),
  map text not null default 'random' check (char_length(map) <= 32),
  status text not null default 'open' check (status in ('open', 'started', 'closed')),
  room_id bigint references public.race_rooms (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.race_lobby_members (
  lobby_id bigint not null references public.race_lobbies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  racer jsonb not null check (jsonb_typeof(racer) = 'object' and pg_column_size(racer) < 1500),
  ready boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (lobby_id, user_id)
);
create index if not exists race_lobby_members_user on public.race_lobby_members (user_id);
alter table public.race_lobbies enable row level security;
alter table public.race_lobby_members enable row level security;
revoke all on public.race_lobbies, public.race_lobby_members from anon, authenticated;

-- rời mọi phòng riêng khác (chủ phòng rời → đóng phòng)
create or replace function public.race_lobby_leave_all(me uuid, keep bigint default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  update race_lobbies set status = 'closed', updated_at = now() where host = me and status <> 'closed' and id is distinct from keep;
  delete from race_lobby_members where user_id = me and lobby_id is distinct from keep;
end $$;
revoke execute on function public.race_lobby_leave_all(uuid, bigint) from public, anon, authenticated;

create or replace function public.race_lobby_json(lid bigint) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'lobby_id', l.id, 'code', l.code, 'host', l.host, 'league', l.league, 'map', l.map, 'status', l.status, 'room_id', l.room_id,
    'members', coalesce((select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'name', coalesce(c.display_name, 'Người chơi'), 'level', coalesce(c.level, 1),
        'racer', m.racer, 'ready', m.ready or m.user_id = l.host, 'is_host', m.user_id = l.host) order by m.joined_at)
      from race_lobby_members m left join player_cards c on c.user_id = m.user_id where m.lobby_id = l.id), '[]'::jsonb))
  from race_lobbies l where l.id = lid
$$;
revoke execute on function public.race_lobby_json(bigint) from public, anon, authenticated;

create or replace function public.race_lobby_create(p_league text, p_map text, p_racer jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); lid bigint; c text;
begin
  if me is null then raise exception 'Chưa đăng nhập'; end if;
  perform public.race_lobby_leave_all(me);
  update race_lobbies set status = 'closed' where status <> 'closed' and updated_at < now() - interval '30 minutes';
  loop
    c := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when char_length(c) = 6 and c ~ '^[A-Z0-9]{6}$' and not exists (select 1 from race_lobbies where code = c);
  end loop;
  insert into race_lobbies (code, host, league, map) values (c, me, p_league, coalesce(nullif(p_map, ''), 'random')) returning id into lid;
  insert into race_lobby_members (lobby_id, user_id, racer, ready) values (lid, me, coalesce(p_racer, '{}'::jsonb), true);
  return public.race_lobby_json(lid);
end $$;

create or replace function public.race_lobby_join(p_code text, p_racer jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); l race_lobbies;
begin
  if me is null then raise exception 'Chưa đăng nhập'; end if;
  select * into l from race_lobbies where code = upper(btrim(p_code)) for update;
  if l.id is null or l.status = 'closed' then raise exception 'Không tìm thấy phòng (mã sai hoặc phòng đã đóng)'; end if;
  if not exists (select 1 from race_lobby_members where lobby_id = l.id and user_id = me) then
    if (select count(*) from race_lobby_members where lobby_id = l.id) >= 5 then raise exception 'Phòng đã đủ 5 người'; end if;
    perform public.race_lobby_leave_all(me, l.id);
    insert into race_lobby_members (lobby_id, user_id, racer) values (l.id, me, coalesce(p_racer, '{}'::jsonb));
    update race_lobbies set updated_at = now() where id = l.id;
  end if;
  return public.race_lobby_json(l.id);
end $$;

create or replace function public.race_lobby_state(p_lobby bigint)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from race_lobby_members where lobby_id = p_lobby and user_id = auth.uid()) then return null; end if;
  return public.race_lobby_json(p_lobby);
end $$;

create or replace function public.race_lobby_leave(p_lobby bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  update race_lobbies set status = 'closed', updated_at = now() where id = p_lobby and host = auth.uid();
  delete from race_lobby_members where lobby_id = p_lobby and user_id = auth.uid();
end $$;

-- chủ phòng đổi giải / bản đồ (mọi người phải sẵn sàng lại)
create or replace function public.race_lobby_set(p_lobby bigint, p_league text, p_map text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  update race_lobbies set league = p_league, map = coalesce(nullif(p_map, ''), 'random'), updated_at = now()
    where id = p_lobby and host = auth.uid() and status <> 'closed';
  if not found then raise exception 'Chỉ chủ phòng được đổi'; end if;
  update race_lobby_members set ready = false where lobby_id = p_lobby;
  return public.race_lobby_json(p_lobby);
end $$;

create or replace function public.race_lobby_ready(p_lobby bigint, p_ready boolean, p_racer jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  update race_lobby_members set ready = p_ready, racer = coalesce(p_racer, racer)
    where lobby_id = p_lobby and user_id = auth.uid();
  if not found then raise exception 'Bạn không ở trong phòng này'; end if;
  return public.race_lobby_json(p_lobby);
end $$;

-- chủ phòng bắt đầu: ≥ 2 người, ai cũng sẵn sàng → tạo cuộc đua chung
create or replace function public.race_lobby_start(p_lobby bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare l race_lobbies; rid bigint; n int;
begin
  select * into l from race_lobbies where id = p_lobby for update;
  if l.id is null or l.host <> auth.uid() then raise exception 'Chỉ chủ phòng được bắt đầu'; end if;
  if l.status = 'closed' then raise exception 'Phòng đã đóng'; end if;
  select count(*) into n from race_lobby_members where lobby_id = l.id;
  if n < 2 then raise exception 'Cần ít nhất 2 người để bắt đầu'; end if;
  if exists (select 1 from race_lobby_members where lobby_id = l.id and user_id <> l.host and not ready) then raise exception 'Còn người chưa sẵn sàng'; end if;
  insert into race_rooms (league, seed, start_at, map) values (l.league, floor(random() * 2000000000)::int + 1, now() + interval '6 seconds', nullif(l.map, 'random'))
    returning id into rid;
  insert into race_members (room_id, user_id, slot, racer)
    select rid, m.user_id, (row_number() over (order by (m.user_id = l.host) desc, m.joined_at))::int - 1, m.racer
    from race_lobby_members m where m.lobby_id = l.id;
  update race_lobbies set status = 'started', room_id = rid, updated_at = now() where id = l.id;
  update race_lobby_members set ready = false where lobby_id = l.id;
  return public.race_room_json(rid);
end $$;

-- lấy phòng đua (thành viên)
create or replace function public.race_room_get(p_room bigint)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from race_members where room_id = p_room and user_id = auth.uid()) then return null; end if;
  return public.race_room_json(p_room);
end $$;

-- mời bạn bè: gửi tin nhắn có mã phòng (chỉ bạn bè đã kết bạn)
create or replace function public.race_lobby_invite(p_lobby bigint, p_friend uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); c text;
begin
  if not exists (select 1 from race_lobby_members where lobby_id = p_lobby and user_id = me) then raise exception 'Bạn không ở trong phòng này'; end if;
  if not exists (select 1 from friendships where status = 'accepted' and ((requester = me and addressee = p_friend) or (requester = p_friend and addressee = me))) then
    raise exception 'Chỉ mời được bạn bè';
  end if;
  select code into c from race_lobbies where id = p_lobby and status <> 'closed';
  if c is null then raise exception 'Phòng đã đóng'; end if;
  insert into messages (sender, recipient, body) values (me, p_friend, '🏁 Mời bạn vào phòng đua cá! Mã phòng: ' || c || ' [DCCC-RACE:' || c || ']');
end $$;

revoke execute on function public.race_lobby_create(text, text, jsonb), public.race_lobby_join(text, jsonb), public.race_lobby_state(bigint),
  public.race_lobby_leave(bigint), public.race_lobby_set(bigint, text, text), public.race_lobby_ready(bigint, boolean, jsonb),
  public.race_lobby_start(bigint), public.race_room_get(bigint), public.race_lobby_invite(bigint, uuid) from public, anon;
grant execute on function public.race_lobby_create(text, text, jsonb), public.race_lobby_join(text, jsonb), public.race_lobby_state(bigint),
  public.race_lobby_leave(bigint), public.race_lobby_set(bigint, text, text), public.race_lobby_ready(bigint, boolean, jsonb),
  public.race_lobby_start(bigint), public.race_room_get(bigint), public.race_lobby_invite(bigint, uuid) to authenticated;
