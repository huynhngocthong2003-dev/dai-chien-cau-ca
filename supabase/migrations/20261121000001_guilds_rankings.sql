-- Giai đoạn 5: Hội (guild), danh hiệu trên hồ sơ, Bảng Xếp Hạng.
-- Chạy được nhiều lần (idempotent). Mọi thay đổi hội đi qua hàm RPC (security definer) – bảng chỉ cho đọc.

-- Danh hiệu đang đeo nằm trong player_cards.stats ->> 'title' (không cần thêm cột).

-- Lấy số từ stats (jsonb do client ghi) an toàn: không phải số → 0
create or replace function public.stat_num(s jsonb, k text) returns bigint
language sql immutable as $$
  select case when jsonb_typeof(s -> k) = 'number' then greatest(0, least((s ->> k)::numeric, 1e15))::bigint else 0 end
$$;

-- ============ Hội ============
create table if not exists public.guilds (
  id bigint generated always as identity primary key,
  name text not null check (char_length(btrim(name)) between 3 and 24 and name !~ '[<>&"''`\\{}/;]'),
  tag text not null check (char_length(tag) between 2 and 5 and tag !~ '[^[:alnum:]]'),
  owner uuid not null references auth.users (id) on delete cascade,
  description text not null default '' check (char_length(description) <= 120 and description !~ '[<>]'),
  created_at timestamptz not null default now()
);
create unique index if not exists guilds_name_ci on public.guilds (lower(btrim(name)));

create table if not exists public.guild_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  guild_id bigint not null references public.guilds (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now()
);
create index if not exists guild_members_guild on public.guild_members (guild_id);

alter table public.guilds enable row level security;
alter table public.guild_members enable row level security;
drop policy if exists "guilds_read" on public.guilds;
create policy "guilds_read" on public.guilds for select to authenticated using (true);
drop policy if exists "guild_members_read" on public.guild_members;
create policy "guild_members_read" on public.guild_members for select to authenticated using (true);
revoke all on public.guilds, public.guild_members from anon, authenticated;
grant select on public.guilds, public.guild_members to authenticated;

-- Tạo hội: người gọi chưa ở hội nào → tạo hội + làm chủ hội
create or replace function public.create_guild(p_name text, p_tag text, p_description text default '')
returns bigint language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); gid bigint;
begin
  if me is null then raise exception 'Chưa đăng nhập'; end if;
  if exists (select 1 from guild_members where user_id = me) then raise exception 'Bạn đang ở trong một hội'; end if;
  if exists (select 1 from guilds where lower(btrim(name)) = lower(btrim(p_name))) then raise exception 'Tên hội đã có người dùng'; end if;
  insert into guilds (name, tag, owner, description) values (btrim(p_name), upper(btrim(p_tag)), me, coalesce(p_description, ''))
    returning id into gid;
  insert into guild_members (user_id, guild_id, role) values (me, gid, 'owner');
  return gid;
end $$;

-- Vào hội (tối đa 30 thành viên)
create or replace function public.join_guild(p_guild bigint)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Chưa đăng nhập'; end if;
  if exists (select 1 from guild_members where user_id = me) then raise exception 'Bạn đang ở trong một hội'; end if;
  if not exists (select 1 from guilds where id = p_guild) then raise exception 'Hội không tồn tại'; end if;
  perform 1 from guilds where id = p_guild for update;
  if (select count(*) from guild_members where guild_id = p_guild) >= 30 then raise exception 'Hội đã đủ 30 thành viên'; end if;
  insert into guild_members (user_id, guild_id, role) values (me, p_guild, 'member');
end $$;

-- Rời hội: chủ hội rời thì nhường cho thành viên lâu nhất; hội trống thì giải tán
create or replace function public.leave_guild()
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); m guild_members; heir uuid;
begin
  select * into m from guild_members where user_id = me;
  if not found then raise exception 'Bạn chưa ở trong hội nào'; end if;
  delete from guild_members where user_id = me;
  if m.role = 'owner' then
    select user_id into heir from guild_members where guild_id = m.guild_id order by joined_at, user_id limit 1;
    if heir is null then
      delete from guilds where id = m.guild_id;
    else
      update guild_members set role = 'owner' where user_id = heir;
      update guilds set owner = heir where id = m.guild_id;
    end if;
  end if;
end $$;

-- Chủ hội mời ra khỏi hội
create or replace function public.kick_member(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); g bigint;
begin
  select guild_id into g from guild_members where user_id = me and role = 'owner';
  if g is null then raise exception 'Chỉ chủ hội mới mời thành viên ra'; end if;
  if p_user = me then raise exception 'Hãy dùng Rời hội'; end if;
  delete from guild_members where user_id = p_user and guild_id = g;
  if not found then raise exception 'Người này không ở trong hội của bạn'; end if;
end $$;

-- Chủ hội đổi lời giới thiệu
create or replace function public.set_guild_description(p_description text)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  update guilds set description = coalesce(p_description, '') where owner = me;
  if not found then raise exception 'Chỉ chủ hội mới sửa được'; end if;
end $$;

-- Danh sách hội kèm số thành viên và điểm hội (tổng cá đã câu của thành viên)
create or replace function public.list_guilds(p_query text default '', p_limit int default 30)
returns table (id bigint, name text, tag text, description text, owner uuid, members bigint, total_level bigint, score bigint)
language sql stable security invoker set search_path = public as $$
  select g.id, g.name, g.tag, g.description, g.owner,
         count(m.user_id) as members,
         coalesce(sum(c.level), 0)::bigint as total_level,
         coalesce(sum(public.stat_num(c.stats, 'caught')), 0)::bigint as score
  from guilds g
  left join guild_members m on m.guild_id = g.id
  left join player_cards c on c.user_id = m.user_id
  where coalesce(p_query, '') = '' or g.name ilike '%' || replace(replace(p_query, '%', ''), '_', '') || '%' or g.tag ilike p_query
  group by g.id
  order by score desc, members desc, g.id
  limit least(greatest(p_limit, 1), 100)
$$;

-- ============ Bảng Xếp Hạng ============
create or replace function public.leaderboard(p_cat text, p_limit int default 50)
returns table (rank bigint, user_id uuid, display_name text, level int, avatar text, title text, score bigint, guild_name text, guild_tag text)
language sql stable security invoker set search_path = public as $$
  with s as (
    select c.*, case p_cat
      when 'level' then c.level::bigint
      when 'caught' then public.stat_num(c.stats, 'caught')
      when 'bosses' then public.stat_num(c.stats, 'bosses')
      when 'dmWins' then public.stat_num(c.stats, 'dmWins')
      when 'junk' then public.stat_num(c.stats, 'junk')
      else 0 end as score
    from player_cards c
  )
  select rank() over (order by s.score desc), s.user_id, s.display_name, s.level, s.avatar,
         case when jsonb_typeof(s.stats -> 'title') = 'string' then left(s.stats ->> 'title', 64) end, s.score, g.name, g.tag
  from s
  left join guild_members m on m.user_id = s.user_id
  left join guilds g on g.id = m.guild_id
  where s.score > 0
  order by s.score desc, s.updated_at
  limit least(greatest(p_limit, 1), 100)
$$;

-- Thứ hạng của chính mình trong một bảng
create or replace function public.my_rank(p_cat text)
returns bigint language sql stable security invoker set search_path = public as $$
  select r.rank from (
    select c.user_id, rank() over (order by case p_cat
      when 'level' then c.level::bigint
      when 'caught' then public.stat_num(c.stats, 'caught')
      when 'bosses' then public.stat_num(c.stats, 'bosses')
      when 'dmWins' then public.stat_num(c.stats, 'dmWins')
      when 'junk' then public.stat_num(c.stats, 'junk')
      else 0 end desc) as rank
    from player_cards c
  ) r where r.user_id = auth.uid()
$$;

revoke execute on function public.create_guild(text, text, text), public.join_guild(bigint), public.leave_guild(),
  public.kick_member(uuid), public.set_guild_description(text), public.list_guilds(text, int),
  public.leaderboard(text, int), public.my_rank(text) from public, anon;
grant execute on function public.create_guild(text, text, text), public.join_guild(bigint), public.leave_guild(),
  public.kick_member(uuid), public.set_guild_description(text), public.list_guilds(text, int),
  public.leaderboard(text, int), public.my_rank(text), public.stat_num(jsonb, text) to authenticated;
