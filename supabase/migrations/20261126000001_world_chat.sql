-- Kênh chat Thế Giới: mọi người chơi đã đăng nhập đều đọc được; tên & danh hiệu do máy chủ lấy từ hồ sơ (không giả danh được).
create table if not exists public.world_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default '',
  title text,
  level int not null default 1,
  body text not null check (char_length(btrim(body)) between 1 and 200),
  created_at timestamptz not null default now()
);
create index if not exists world_messages_time on public.world_messages (created_at desc);

create or replace function public.world_messages_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare c player_cards;
begin
  new.created_at := now();
  new.body := btrim(new.body);
  select * into c from player_cards where user_id = new.user_id;
  new.name := coalesce(c.display_name, 'Người chơi');
  new.level := coalesce(c.level, 1);
  new.title := case when jsonb_typeof(c.stats -> 'title') = 'string' then left(c.stats ->> 'title', 64) end;
  if (select count(*) from world_messages where user_id = new.user_id and created_at > now() - interval '30 seconds') >= 5 then
    raise exception 'Bạn chat quá nhanh, chờ chút nhé';
  end if;
  if (select count(*) from world_messages where user_id = new.user_id and created_at > now() - interval '1 day') >= 200 then
    raise exception 'Đã đạt giới hạn chat thế giới hôm nay';
  end if;
  return new;
end $$;
drop trigger if exists world_messages_before_insert on public.world_messages;
create trigger world_messages_before_insert before insert on public.world_messages for each row execute function public.world_messages_before_insert();

alter table public.world_messages enable row level security;
drop policy if exists "world_read" on public.world_messages;
create policy "world_read" on public.world_messages for select to authenticated using (created_at > now() - interval '3 days');
drop policy if exists "world_send_own" on public.world_messages;
create policy "world_send_own" on public.world_messages for insert to authenticated with check (auth.uid() = user_id);
revoke all on public.world_messages from anon, authenticated;
grant select, insert on public.world_messages to authenticated;
