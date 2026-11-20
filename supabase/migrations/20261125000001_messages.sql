-- Nhắn tin 1–1 giữa người chơi. Chỉ người gửi/nhận đọc được; chống spam bằng giới hạn tốc độ.
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  sender uuid not null references auth.users (id) on delete cascade,
  recipient uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 300),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint messages_not_self check (sender <> recipient)
);
create index if not exists messages_pair on public.messages (least(sender, recipient), greatest(sender, recipient), created_at desc);
create index if not exists messages_unread on public.messages (recipient, read_at) where read_at is null;

-- Giới hạn: tối đa 15 tin / phút và 300 tin / ngày cho mỗi người gửi
create or replace function public.messages_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.created_at := now();
  new.read_at := null;
  new.body := btrim(new.body);
  if (select count(*) from messages where sender = new.sender and created_at > now() - interval '1 minute') >= 15 then
    raise exception 'Bạn nhắn quá nhanh, thử lại sau ít giây';
  end if;
  if (select count(*) from messages where sender = new.sender and created_at > now() - interval '1 day') >= 300 then
    raise exception 'Đã đạt giới hạn tin nhắn hôm nay';
  end if;
  return new;
end $$;
drop trigger if exists messages_before_insert on public.messages;
create trigger messages_before_insert before insert on public.messages for each row execute function public.messages_before_insert();

alter table public.messages enable row level security;
drop policy if exists "messages_read_own" on public.messages;
create policy "messages_read_own" on public.messages for select to authenticated using (auth.uid() in (sender, recipient));
drop policy if exists "messages_send_own" on public.messages;
create policy "messages_send_own" on public.messages for insert to authenticated with check (auth.uid() = sender);
revoke all on public.messages from anon, authenticated;
grant select, insert on public.messages to authenticated;

-- Đánh dấu đã đọc các tin người kia gửi cho mình
create or replace function public.mark_messages_read(p_from uuid)
returns void language sql security definer set search_path = public as $$
  update messages set read_at = now() where recipient = auth.uid() and sender = p_from and read_at is null
$$;

-- Số tin chưa đọc theo từng người gửi
create or replace function public.unread_counts()
returns table (sender uuid, n bigint)
language sql stable security invoker set search_path = public as $$
  select sender, count(*) from messages where recipient = auth.uid() and read_at is null group by sender
$$;

revoke execute on function public.mark_messages_read(uuid), public.unread_counts() from public, anon;
grant execute on function public.mark_messages_read(uuid), public.unread_counts() to authenticated;
