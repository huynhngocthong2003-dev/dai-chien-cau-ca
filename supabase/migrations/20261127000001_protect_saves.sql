-- Chặn ghi đè tài khoản bằng một tiến trình KHÁC và ÍT hơn (vd game tạo nhân vật mới do không đọc được bản cũ).
-- Bản cũ luôn được cất vào player_save_backups trước khi bị thay.
create or replace function public.player_saves_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare old_caught bigint; new_caught bigint;
begin
  if tg_op = 'UPDATE' and old.player_id is distinct from new.player_id then
    old_caught := coalesce(public.stat_num(old.save -> 'stats', 'totalCaught'), 0);
    new_caught := coalesce(public.stat_num(new.save -> 'stats', 'totalCaught'), 0);
    if new.level < old.level or new_caught < old_caught then
      insert into public.player_save_backups (user_id, save, level, reason) values (old.user_id, old.save, old.level, 'blocked_overwrite');
      raise exception 'Đã chặn ghi đè tài khoản bằng tiến trình ít hơn – hãy tải lại trang';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists player_saves_guard on public.player_saves;
create trigger player_saves_guard before update on public.player_saves for each row execute function public.player_saves_guard();
