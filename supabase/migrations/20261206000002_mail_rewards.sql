-- Quà đính kèm thư: người chơi bấm "Nhận" → game cộng quà (mã txId chống nhận trùng) rồi báo đã nhận.
alter table public.system_mail add column if not exists rewards jsonb;
alter table public.system_mail add column if not exists claimed_at timestamptz;

create or replace function public.mark_mail_claimed(p_id bigint) returns void
language sql security definer set search_path = public as $$
  update public.system_mail set claimed_at = coalesce(claimed_at, now()), read_at = coalesce(read_at, now())
   where id = p_id and user_id = auth.uid() and rewards is not null;
$$;
revoke all on function public.mark_mail_claimed(bigint) from public;
grant execute on function public.mark_mail_claimed(bigint) to authenticated;
