-- ĐẠI TU GĐ3 – Trận 3vs3 theo lượt do MÁY CHỦ làm trọng tài (Edge Function `battle`).
-- Trạng thái trận (HP, hiệu ứng, lượt, seed) chỉ máy chủ ghi; người chơi chỉ ĐỌC trận của chính mình.
-- Chống gửi 2 lệnh 1 lượt: Edge Function cập nhật kèm điều kiện `turn = lượt cũ` (ai đến sau bị từ chối).
create table if not exists public.battles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null check (mode in ('practice', 'pve', 'pvp')),
  ai_level text check (ai_level in ('easy', 'normal', 'hard', 'boss')),
  team text[] not null,
  state jsonb not null,
  turn int not null default 0,
  turn_started_at timestamptz not null default now(),
  winner smallint check (winner in (0, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists battles_user on public.battles (user_id, created_at desc);

alter table public.battles enable row level security;
drop policy if exists battles_select_own on public.battles;
create policy battles_select_own on public.battles for select to authenticated using (user_id = auth.uid());
grant select on public.battles to authenticated;
-- (không có policy insert/update/delete: chỉ service role của Edge Function được ghi)
