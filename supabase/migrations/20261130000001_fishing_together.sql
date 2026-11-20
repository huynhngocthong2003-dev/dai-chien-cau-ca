-- Câu cùng nhau: người chơi ở cùng khu câu thấy nhau. Máy chủ chia CHỖ CÂU (0..5) để không ai đứng chồng lên ai.
create table if not exists public.fishing_presence (
  user_id uuid primary key references auth.users (id) on delete cascade,
  zone_id text not null check (char_length(zone_id) <= 64),
  spot int not null default -1 check (spot between -1 and 5),
  name text not null default '',
  title text,
  level int not null default 1,
  look jsonb not null default '{}'::jsonb check (jsonb_typeof(look) = 'object' and pg_column_size(look) < 1200),
  state text not null default 'idle' check (state in ('idle', 'waiting', 'reeling', 'caught')),
  catch jsonb check (catch is null or (jsonb_typeof(catch) = 'object' and pg_column_size(catch) < 600)),
  catch_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists fishing_presence_zone on public.fishing_presence (zone_id, updated_at desc);

create or replace function public.fishing_presence_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
declare c player_cards;
begin
  new.updated_at := now();
  select * into c from player_cards where user_id = new.user_id;
  new.name := coalesce(c.display_name, 'Người chơi');
  new.level := coalesce(c.level, 1);
  new.title := case when jsonb_typeof(c.stats -> 'title') = 'string' then left(c.stats ->> 'title', 64) end;
  if tg_op = 'INSERT' or new.catch is distinct from old.catch then
    new.catch_at := case when new.catch is null then null else now() end;
  else
    new.catch_at := old.catch_at;
  end if;
  return new;
end $$;
drop trigger if exists fishing_presence_before_write on public.fishing_presence;
create trigger fishing_presence_before_write before insert or update on public.fishing_presence
  for each row execute function public.fishing_presence_before_write();

alter table public.fishing_presence enable row level security;
drop policy if exists "fishing_read" on public.fishing_presence;
create policy "fishing_read" on public.fishing_presence for select to authenticated using (true);
drop policy if exists "fishing_update_own" on public.fishing_presence;
create policy "fishing_update_own" on public.fishing_presence for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "fishing_delete_own" on public.fishing_presence;
create policy "fishing_delete_own" on public.fishing_presence for delete to authenticated using (user_id = auth.uid());
revoke all on public.fishing_presence from anon, authenticated;
-- khu & chỗ câu chỉ đổi qua RPC (máy chủ chia chỗ)
grant select, delete on public.fishing_presence to authenticated;
grant update (look, state, catch) on public.fishing_presence to authenticated;

-- Vào khu câu: giữ chỗ cũ nếu vẫn ở khu đó, không thì lấy chỗ trống thấp nhất (−1 = khu đã đủ 6 người)
create or replace function public.fishing_join(p_zone text, p_look jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); s int;
begin
  if me is null then raise exception 'Chưa đăng nhập'; end if;
  perform pg_advisory_xact_lock(hashtext('fishing:' || p_zone));
  delete from fishing_presence where updated_at < now() - interval '60 seconds';
  select spot into s from fishing_presence where user_id = me and zone_id = p_zone and spot >= 0;
  if s is null then
    select min(g) into s from generate_series(0, 5) g
      where g not in (select spot from fishing_presence where zone_id = p_zone and user_id <> me);
    s := coalesce(s, -1);
  end if;
  insert into fishing_presence (user_id, zone_id, spot, look, state, catch)
  values (me, p_zone, s, coalesce(p_look, '{}'::jsonb), 'idle', null)
  on conflict (user_id) do update set zone_id = excluded.zone_id, spot = excluded.spot, look = excluded.look, state = 'idle', catch = null;
  return s;
end $$;

create or replace function public.fishing_leave()
returns void language sql security definer set search_path = public as $$
  delete from fishing_presence where user_id = auth.uid()
$$;

revoke execute on function public.fishing_join(text, jsonb), public.fishing_leave() from public, anon;
grant execute on function public.fishing_join(text, jsonb), public.fishing_leave() to authenticated;
