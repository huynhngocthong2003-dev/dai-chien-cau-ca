-- Hòm Thư hệ thống: thư từ Ban Quản Trị gửi riêng cho từng người chơi (thông báo đền bù, sự kiện…).
-- Người chơi chỉ đọc được thư của mình; chỉ quản trị (service role / SQL) gửi được thư.
-- Thư CHỈ là thông báo – phần thưởng (nếu có) đã được cộng qua sổ giao dịch, không nhận lại từ thư.
create table if not exists public.system_mail (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists system_mail_user on public.system_mail (user_id, created_at desc);

alter table public.system_mail enable row level security;
drop policy if exists system_mail_select_own on public.system_mail;
create policy system_mail_select_own on public.system_mail for select to authenticated using (user_id = auth.uid());
grant select on public.system_mail to authenticated;

create or replace function public.mark_mail_read(p_id bigint) returns void
language sql security definer set search_path = public as $$
  update public.system_mail set read_at = coalesce(read_at, now()) where id = p_id and user_id = auth.uid();
$$;
revoke all on function public.mark_mail_read(bigint) from public;
grant execute on function public.mark_mail_read(bigint) to authenticated;
