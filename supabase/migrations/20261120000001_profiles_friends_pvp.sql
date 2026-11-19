-- Hồ sơ công khai, kết bạn, Đấu Sinh Tử người–người.
-- Chạy được nhiều lần (idempotent).

-- ============ Hồ sơ công khai ============
create table if not exists public.player_cards (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 16),
  friend_code text not null unique,
  level int not null default 1 check (level between 1 and 200),
  avatar text not null default 'c_be_tom' check (char_length(avatar) <= 64),
  stats jsonb not null default '{}'::jsonb check (jsonb_typeof(stats) = 'object' and pg_column_size(stats) < 4000),
  showcase jsonb not null default '[]'::jsonb check (jsonb_typeof(showcase) = 'array' and pg_column_size(showcase) < 8000),
  updated_at timestamptz not null default now()
);
create index if not exists player_cards_name on public.player_cards (lower(display_name));

create or replace function public.player_cards_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  -- mã kết bạn do máy chủ tạo, không cho sửa
  if tg_op = 'INSERT' then
    new.friend_code := upper(substr(replace(new.user_id::text, '-', ''), 1, 8));
  else
    new.friend_code := old.friend_code;
    new.user_id := old.user_id;
  end if;
  return new;
end $$;
drop trigger if exists player_cards_before_write on public.player_cards;
create trigger player_cards_before_write before insert or update on public.player_cards
  for each row execute function public.player_cards_before_write();

alter table public.player_cards enable row level security;
drop policy if exists "cards_read_all" on public.player_cards;
create policy "cards_read_all" on public.player_cards for select to authenticated using (true);
drop policy if exists "cards_insert_own" on public.player_cards;
create policy "cards_insert_own" on public.player_cards for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "cards_update_own" on public.player_cards;
create policy "cards_update_own" on public.player_cards for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update on public.player_cards to authenticated;
revoke all on public.player_cards from anon;

-- ============ Bạn bè ============
create table if not exists public.friendships (
  id bigint generated always as identity primary key,
  requester uuid not null references auth.users (id) on delete cascade,
  addressee uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  constraint friendships_not_self check (requester <> addressee)
);
create unique index if not exists friendships_pair on public.friendships (least(requester, addressee), greatest(requester, addressee));

create or replace function public.friendships_before_update() returns trigger
language plpgsql as $$
begin
  if new.requester <> old.requester or new.addressee <> old.addressee then
    raise exception 'Không được đổi người gửi / người nhận';
  end if;
  return new;
end $$;
drop trigger if exists friendships_before_update on public.friendships;
create trigger friendships_before_update before update on public.friendships
  for each row execute function public.friendships_before_update();

alter table public.friendships enable row level security;
drop policy if exists "friends_read_own" on public.friendships;
create policy "friends_read_own" on public.friendships for select to authenticated using (auth.uid() in (requester, addressee));
drop policy if exists "friends_request" on public.friendships;
create policy "friends_request" on public.friendships for insert to authenticated with check (auth.uid() = requester and status = 'pending');
drop policy if exists "friends_accept" on public.friendships;
create policy "friends_accept" on public.friendships for update to authenticated using (auth.uid() = addressee) with check (auth.uid() = addressee and status = 'accepted');
drop policy if exists "friends_remove" on public.friendships;
create policy "friends_remove" on public.friendships for delete to authenticated using (auth.uid() in (requester, addressee));
grant select, insert, update, delete on public.friendships to authenticated;
revoke all on public.friendships from anon;

-- ============ Đấu Sinh Tử người–người ============
-- Chỉ máy chủ (Edge Function dùng service role) ghi trận. Người chơi chỉ đọc trận của mình.
create table if not exists public.pvp_matches (
  id uuid primary key default gen_random_uuid(),
  challenger uuid not null references auth.users (id) on delete cascade,
  defender uuid not null references auth.users (id) on delete cascade,
  seed bigint not null,
  result jsonb not null,
  for_challenger jsonb not null,
  for_defender jsonb not null,
  challenger_name text not null,
  defender_name text not null,
  applied_challenger boolean not null default false,
  applied_defender boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists pvp_matches_challenger on public.pvp_matches (challenger, created_at desc);
create index if not exists pvp_matches_defender on public.pvp_matches (defender, created_at desc);

alter table public.pvp_matches enable row level security;
drop policy if exists "pvp_read_own" on public.pvp_matches;
create policy "pvp_read_own" on public.pvp_matches for select to authenticated using (auth.uid() in (challenger, defender));
grant select on public.pvp_matches to authenticated;
revoke all on public.pvp_matches from anon;

-- Đánh dấu đã áp dụng kết quả cho phía của chính mình
create or replace function public.mark_pvp_applied(match_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.pvp_matches set applied_challenger = true where id = match_id and challenger = auth.uid();
  update public.pvp_matches set applied_defender = true where id = match_id and defender = auth.uid();
end $$;
revoke all on function public.mark_pvp_applied(uuid) from public, anon;
grant execute on function public.mark_pvp_applied(uuid) to authenticated;
