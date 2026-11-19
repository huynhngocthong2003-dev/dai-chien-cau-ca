-- Tài khoản người chơi + lưu tiến trình đám mây + lịch sử sao lưu.
-- Giai đoạn chuyển tiếp: client vẫn ghi bản lưu của CHÍNH MÌNH (bị RLS giới hạn).
-- Giai đoạn 4: chuyển sang ghi qua server/Edge Function có thẩm quyền.

-- Hồ sơ hiển thị
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 16),
  created_at timestamptz not null default now()
);

-- Bản lưu hiện tại (một dòng cho mỗi tài khoản)
create table if not exists public.player_saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  save jsonb not null,
  save_version int not null check (save_version between 1 and 1000),
  player_id text not null check (char_length(player_id) between 1 and 64),
  level int not null default 1 check (level between 1 and 200),
  updated_at timestamptz not null default now(),
  constraint player_saves_size check (pg_column_size(save) < 2000000),
  constraint player_saves_is_object check (jsonb_typeof(save) = 'object')
);

-- Lịch sử sao lưu tự động (tối đa 1 bản mỗi 10 phút, giữ 30 bản gần nhất)
create table if not exists public.player_save_backups (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  save jsonb not null,
  level int not null,
  reason text not null,
  created_at timestamptz not null default now()
);
create index if not exists player_save_backups_user_time on public.player_save_backups (user_id, created_at desc);

-- Tự tạo hồ sơ khi đăng ký (tên lấy từ metadata đăng ký)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'Cần Thủ'), 16))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Thời gian cập nhật do server đặt + tự sao lưu bản cũ
create or replace function public.player_saves_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
declare last_backup timestamptz;
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    if new.user_id <> old.user_id then
      raise exception 'Không được đổi chủ sở hữu bản lưu';
    end if;
    select max(created_at) into last_backup from public.player_save_backups where user_id = old.user_id;
    if last_backup is null or last_backup < now() - interval '10 minutes' then
      insert into public.player_save_backups (user_id, save, level, reason) values (old.user_id, old.save, old.level, 'auto');
      delete from public.player_save_backups
       where user_id = old.user_id
         and id not in (select id from public.player_save_backups where user_id = old.user_id order by created_at desc, id desc limit 30);
    end if;
  end if;
  return new;
end $$;

drop trigger if exists player_saves_before_write on public.player_saves;
create trigger player_saves_before_write before insert or update on public.player_saves
  for each row execute function public.player_saves_before_write();

-- Row Level Security: mỗi người chỉ thấy và sửa dữ liệu của chính mình
alter table public.profiles enable row level security;
alter table public.player_saves enable row level security;
alter table public.player_save_backups enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "saves_select_own" on public.player_saves;
create policy "saves_select_own" on public.player_saves for select to authenticated using (auth.uid() = user_id);
drop policy if exists "saves_insert_own" on public.player_saves;
create policy "saves_insert_own" on public.player_saves for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "saves_update_own" on public.player_saves;
create policy "saves_update_own" on public.player_saves for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "backups_select_own" on public.player_save_backups;
create policy "backups_select_own" on public.player_save_backups for select to authenticated using (auth.uid() = user_id);
-- Không có policy insert/update/delete cho backups: chỉ trigger (security definer) được ghi.

grant select, update on public.profiles to authenticated;
grant select, insert, update on public.player_saves to authenticated;
grant select on public.player_save_backups to authenticated;
revoke all on public.profiles, public.player_saves, public.player_save_backups from anon;
