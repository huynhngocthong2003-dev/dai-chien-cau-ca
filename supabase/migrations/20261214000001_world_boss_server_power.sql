-- BOSS THẾ GIỚI: máu boss = TỔNG CHIẾN LỰC đội hình (stats.teamPower) của mọi người chơi trên máy chủ, tính lúc boss xuất hiện.
-- Chỉ trả về MỘT con số tổng (không lộ dữ liệu từng người); chỉ máy chủ (service_role) được gọi.
create or replace function public.wb_server_power()
returns bigint language sql stable security definer set search_path = public as $$
  select coalesce(sum(public.stat_num(c.stats, 'teamPower')), 0)::bigint from public.player_cards c
$$;
revoke all on function public.wb_server_power() from public, anon, authenticated;
grant execute on function public.wb_server_power() to service_role;
