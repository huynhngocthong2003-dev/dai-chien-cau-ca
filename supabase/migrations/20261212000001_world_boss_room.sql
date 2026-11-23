-- BOSS THẾ GIỚI – PHÒNG CHUNG: mỗi phiên đánh lưu tên, ngoại hình nhân vật và lực chiến (tổng 3 cá trưng bày)
-- để mọi người trong khung giờ thấy nhau đang câu boss. Chỉ máy chủ (service_role) đọc/ghi bảng phiên.
alter table public.world_boss_sessions add column if not exists name text not null default '';
alter table public.world_boss_sessions add column if not exists look jsonb not null default '{}'::jsonb
  check (jsonb_typeof(look) = 'object' and pg_column_size(look) < 1200);
alter table public.world_boss_sessions add column if not exists power bigint not null default 0;
create index if not exists world_boss_sessions_recent on public.world_boss_sessions (boss, bar_at desc);
