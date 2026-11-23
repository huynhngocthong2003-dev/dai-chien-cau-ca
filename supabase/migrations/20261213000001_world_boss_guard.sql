-- BOSS THẾ GIỚI – NÉ / ĐỠ CHIÊU: lưu kết quả phòng thủ từng chiêu của phiên đánh ({"0":"dodge","1":"guard"}).
-- Máy chủ chấm thời điểm bấm theo đồng hồ của mình; mỗi chiêu chỉ tính lần bấm đầu tiên.
alter table public.world_boss_sessions add column if not exists guards jsonb not null default '{}'::jsonb
  check (jsonb_typeof(guards) = 'object' and pg_column_size(guards) < 2000);
