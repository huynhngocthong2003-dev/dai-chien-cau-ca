-- Quảng Trường: vị trí, ngoại hình, cá đang khoe và biểu cảm của người chơi đang ở quảng trường.
-- Tên/cấp/danh hiệu do máy chủ lấy từ hồ sơ (không giả danh được). Chat dùng chung kênh Thế Giới.
create table if not exists public.plaza_presence (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  title text,
  level int not null default 1,
  x real not null default 0.5 check (x between 0 and 1),
  y real not null default 0.5 check (y between 0 and 1),
  look jsonb not null default '{}'::jsonb check (jsonb_typeof(look) = 'object' and pg_column_size(look) < 1200),
  showing jsonb check (showing is null or (jsonb_typeof(showing) = 'object' and pg_column_size(showing) < 800)),
  emote text check (emote is null or char_length(emote) <= 8),
  emote_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists plaza_presence_time on public.plaza_presence (updated_at desc);

create or replace function public.plaza_presence_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
declare c player_cards;
begin
  new.updated_at := now();
  select * into c from player_cards where user_id = new.user_id;
  new.name := coalesce(c.display_name, 'Người chơi');
  new.level := coalesce(c.level, 1);
  new.title := case when jsonb_typeof(c.stats -> 'title') = 'string' then left(c.stats ->> 'title', 64) end;
  if tg_op = 'UPDATE' and new.emote is distinct from old.emote then new.emote_at := now();
  elsif tg_op = 'INSERT' and new.emote is not null then new.emote_at := now();
  elsif tg_op = 'UPDATE' then new.emote_at := old.emote_at;
  end if;
  return new;
end $$;
drop trigger if exists plaza_presence_before_write on public.plaza_presence;
create trigger plaza_presence_before_write before insert or update on public.plaza_presence
  for each row execute function public.plaza_presence_before_write();

alter table public.plaza_presence enable row level security;
drop policy if exists "plaza_read" on public.plaza_presence;
create policy "plaza_read" on public.plaza_presence for select to authenticated using (true);
drop policy if exists "plaza_insert_own" on public.plaza_presence;
create policy "plaza_insert_own" on public.plaza_presence for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "plaza_update_own" on public.plaza_presence;
create policy "plaza_update_own" on public.plaza_presence for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "plaza_delete_own" on public.plaza_presence;
create policy "plaza_delete_own" on public.plaza_presence for delete to authenticated using (auth.uid() = user_id);
revoke all on public.plaza_presence from anon, authenticated;
grant select, insert, update, delete on public.plaza_presence to authenticated;
