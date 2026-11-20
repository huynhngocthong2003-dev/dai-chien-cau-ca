-- Lời mời đua cá hiện thành bảng xác nhận 10 giây trên màn hình người được mời.
create table if not exists public.race_invites (
  id bigint generated always as identity primary key,
  lobby_id bigint not null references public.race_lobbies (id) on delete cascade,
  from_user uuid not null references auth.users (id) on delete cascade,
  to_user uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired')),
  created_at timestamptz not null default now()
);
create index if not exists race_invites_to on public.race_invites (to_user, created_at desc);
alter table public.race_invites enable row level security;
revoke all on public.race_invites from anon, authenticated;

-- (cập nhật) mời bạn: vẫn gửi tin nhắn (để xem lại sau) + tạo lời mời hiện bảng xác nhận
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
  if exists (select 1 from race_invites where lobby_id = p_lobby and to_user = p_friend and status = 'pending' and created_at > now() - interval '12 seconds') then
    raise exception 'Vừa mời người này rồi – chờ chút nhé';
  end if;
  insert into race_invites (lobby_id, from_user, to_user) values (p_lobby, me, p_friend);
  insert into messages (sender, recipient, body) values (me, p_friend, '🏁 Mời bạn vào phòng đua cá! Mã phòng: ' || c || ' [DCCC-RACE:' || c || ']');
end $$;

-- lời mời đang chờ của mình (≤ 12 giây, phòng còn mở)
create or replace function public.race_my_invites()
returns table (id bigint, code text, from_name text, league text, map text, members int, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  update race_invites ri set status = 'expired' where ri.to_user = auth.uid() and ri.status = 'pending' and ri.created_at <= now() - interval '12 seconds';
  return query
    select i.id, l.code, coalesce(c.display_name, 'Bạn bè'), l.league, l.map,
      (select count(*)::int from race_lobby_members m where m.lobby_id = l.id), i.created_at
    from race_invites i join race_lobbies l on l.id = i.lobby_id
    left join player_cards c on c.user_id = i.from_user
    where i.to_user = auth.uid() and i.status = 'pending' and l.status <> 'closed'
    order by i.created_at desc limit 3;
end $$;

create or replace function public.race_invite_respond(p_id bigint, p_accept boolean)
returns void language sql security definer set search_path = public as $$
  update race_invites set status = case when p_accept then 'accepted' else 'declined' end
  where id = p_id and to_user = auth.uid() and status = 'pending'
$$;

-- (cập nhật) trạng thái phòng kèm lời mời gần đây (chủ phòng thấy ai đang được mời / đã từ chối)
create or replace function public.race_lobby_json(lid bigint) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'lobby_id', l.id, 'code', l.code, 'host', l.host, 'league', l.league, 'map', l.map, 'status', l.status, 'room_id', l.room_id,
    'members', coalesce((select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'name', coalesce(c.display_name, 'Người chơi'), 'level', coalesce(c.level, 1),
        'racer', m.racer, 'ready', m.ready or m.user_id = l.host, 'is_host', m.user_id = l.host) order by m.joined_at)
      from race_lobby_members m left join player_cards c on c.user_id = m.user_id where m.lobby_id = l.id), '[]'::jsonb),
    'invites', coalesce((select jsonb_agg(jsonb_build_object('name', coalesce(c.display_name, 'Bạn bè'),
        'status', case when i.status = 'pending' and i.created_at <= now() - interval '12 seconds' then 'expired' else i.status end) order by i.created_at desc)
      from (select distinct on (to_user) * from race_invites where lobby_id = l.id and created_at > now() - interval '2 minutes' order by to_user, created_at desc) i
      left join player_cards c on c.user_id = i.to_user
      where not exists (select 1 from race_lobby_members m where m.lobby_id = l.id and m.user_id = i.to_user)), '[]'::jsonb))
  from race_lobbies l where l.id = lid
$$;
revoke execute on function public.race_lobby_json(bigint) from public, anon, authenticated;

revoke execute on function public.race_my_invites(), public.race_invite_respond(bigint, boolean) from public, anon;
grant execute on function public.race_my_invites(), public.race_invite_respond(bigint, boolean) to authenticated;
