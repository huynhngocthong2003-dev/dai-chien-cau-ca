-- ĐẠI TU GĐ6 (một phần): PHÒNG ĐẤU 3VS3 VỚI NGƯỜI + kết toán trận 3vs3 (thua mất cá lực chiến thấp nhất).
-- An toàn: chỉ thêm bảng/cột/hàm mới, không xoá dữ liệu.

-- 1) Trận với máy: đánh dấu đã áp kết quả vào bản lưu (game gọi sau khi áp).
alter table public.battles add column if not exists settled boolean not null default false;
-- các trận luyện tập trước bản này không có thắng/thua → coi như đã kết toán
update public.battles set settled = true where settled = false and created_at < now();

create or replace function public.mark_battle_settled(battle_id uuid) returns void
language sql security definer set search_path = public as $$
  update public.battles set settled = true where id = battle_id and user_id = auth.uid() and winner is not null;
$$;
revoke all on function public.mark_battle_settled(uuid) from public, anon;
grant execute on function public.mark_battle_settled(uuid) to authenticated;

-- 2) Phòng đấu với người. Mọi thay đổi đi qua Edge Function `pvp` (service role).
create table if not exists public.pvp_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  stake text not null check (stake in ('friendly', 'death')),
  status text not null default 'waiting' check (status in ('waiting', 'picking', 'fighting', 'done', 'cancelled')),
  host uuid not null references auth.users (id) on delete cascade,
  guest uuid references auth.users (id) on delete cascade,
  invitee uuid references auth.users (id) on delete cascade,
  host_name text not null,
  guest_name text,
  expires_at timestamptz not null,
  pick_deadline timestamptz,
  host_team text[],
  guest_team text[],
  host_lose jsonb,
  guest_lose jsonb,
  state jsonb,
  turn int not null default 0,
  turn_started_at timestamptz,
  timeouts int[] not null default '{0,0}',
  winner smallint check (winner in (0, 1)),
  cancel_reason text,
  settled_host boolean not null default false,
  settled_guest boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists pvp_rooms_code_open on public.pvp_rooms (code) where status in ('waiting', 'picking', 'fighting');
create index if not exists pvp_rooms_invitee on public.pvp_rooms (invitee) where status = 'waiting';
create index if not exists pvp_rooms_host on public.pvp_rooms (host, created_at desc);
create index if not exists pvp_rooms_guest on public.pvp_rooms (guest, created_at desc);

alter table public.pvp_rooms enable row level security;
revoke all on public.pvp_rooms from anon, authenticated;
-- chỉ đọc các cột công khai (đội hình bí mật KHÔNG được cấp quyền đọc), chỉ phòng mình liên quan
grant select (id, code, stake, status, host, guest, invitee, host_name, guest_name, expires_at, created_at) on public.pvp_rooms to authenticated;
drop policy if exists pvp_rooms_read on public.pvp_rooms;
create policy pvp_rooms_read on public.pvp_rooms for select to authenticated using (auth.uid() in (host, guest, invitee));
