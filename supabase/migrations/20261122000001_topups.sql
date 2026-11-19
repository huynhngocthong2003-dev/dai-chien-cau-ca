-- Nạp tiền bằng chuyển khoản – chủ dự án tự đối soát & duyệt (cách A).
-- Người chơi chỉ tạo lệnh và nhận lệnh đã duyệt qua hàm RPC; không ai tự sửa trạng thái lệnh.
-- Thêm quản trị viên (chạy 1 lần trong Supabase → SQL Editor, thay email):
--   insert into public.admins (user_id) select id from auth.users where email = 'email-cua-ban@example.com';

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

create table if not exists public.topup_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  package text not null check (package in ('kc100', 'kc300', 'auto2d')),
  amount_vnd int not null check (amount_vnd > 0),
  code text not null unique,
  player_name text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'claimed', 'cancelled')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  claimed_at timestamptz
);
create index if not exists topup_orders_user on public.topup_orders (user_id, created_at desc);
create index if not exists topup_orders_status on public.topup_orders (status, created_at);

alter table public.topup_orders enable row level security;
drop policy if exists "topup_read_own" on public.topup_orders;
create policy "topup_read_own" on public.topup_orders for select to authenticated using (auth.uid() = user_id);
revoke all on public.topup_orders from anon, authenticated;
grant select on public.topup_orders to authenticated;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid())
$$;

-- Tạo lệnh nạp: giá do máy chủ quyết định, mã nội dung chuyển khoản ngẫu nhiên, tối đa 3 lệnh đang chờ
create or replace function public.create_topup(p_package text)
returns table (id uuid, code text, amount_vnd int)
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); amt int; c text; nm text;
begin
  if me is null then raise exception 'Chưa đăng nhập'; end if;
  amt := case p_package when 'kc100' then 20000 when 'kc300' then 50000 when 'auto2d' then 20000 else null end;
  if amt is null then raise exception 'Gói nạp không tồn tại'; end if;
  if (select count(*) from topup_orders o where o.user_id = me and o.status = 'pending') >= 3 then
    raise exception 'Bạn đang có 3 lệnh chờ duyệt – hãy chờ hoặc huỷ bớt';
  end if;
  loop
    c := 'DCCC' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from topup_orders o where o.code = c);
  end loop;
  select coalesce(display_name, '') into nm from player_cards where user_id = me;
  return query insert into topup_orders as o (user_id, package, amount_vnd, code, player_name)
    values (me, p_package, amt, c, coalesce(nm, '')) returning o.id, o.code, o.amount_vnd;
end $$;

-- Huỷ lệnh đang chờ của chính mình
create or replace function public.cancel_topup(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update topup_orders set status = 'cancelled', decided_at = now() where id = p_id and user_id = auth.uid() and status = 'pending';
  if not found then raise exception 'Không huỷ được lệnh này'; end if;
end $$;

-- Nhận các lệnh đã duyệt (mỗi lệnh chỉ nhận được 1 lần)
create or replace function public.claim_topups()
returns table (id uuid, package text)
language sql security definer set search_path = public as $$
  update topup_orders o set status = 'claimed', claimed_at = now()
  where o.user_id = auth.uid() and o.status = 'approved'
  returning o.id, o.package
$$;

-- Quản trị: xem lệnh theo trạng thái
create or replace function public.admin_list_topups(p_status text default 'pending')
returns table (id uuid, user_id uuid, player_name text, package text, amount_vnd int, code text, status text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Chỉ quản trị viên'; end if;
  return query select o.id, o.user_id, o.player_name, o.package, o.amount_vnd, o.code, o.status, o.created_at
    from topup_orders o where o.status = p_status order by o.created_at limit 100;
end $$;

-- Quản trị: duyệt / từ chối lệnh đang chờ
create or replace function public.admin_decide_topup(p_id uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Chỉ quản trị viên'; end if;
  update topup_orders set status = case when p_approve then 'approved' else 'rejected' end, decided_at = now()
    where id = p_id and status = 'pending';
  if not found then raise exception 'Lệnh không ở trạng thái chờ duyệt'; end if;
end $$;

revoke execute on function public.is_admin(), public.create_topup(text), public.cancel_topup(uuid), public.claim_topups(),
  public.admin_list_topups(text), public.admin_decide_topup(uuid, boolean) from public, anon;
grant execute on function public.is_admin(), public.create_topup(text), public.cancel_topup(uuid), public.claim_topups(),
  public.admin_list_topups(text), public.admin_decide_topup(uuid, boolean) to authenticated;
