-- Chặn máy CŨ ghi đè tiến trình mới hơn (cùng 1 tài khoản đăng nhập trên 2 máy, máy kia còn bản cũ).
-- Số cá đã câu & cấp chỉ tăng, không bao giờ giảm → bản lưu làm TỤT là bản cũ: từ chối (client tải bản mới nhất).
-- Đổi sang tiến trình KHÁC (playerId khác) cũng bị chặn, trừ khi bản trên máy chủ còn trắng.
-- Ngoại lệ cho cả hai: bản lưu mang resetAt mới (người chơi chủ ý "Chơi lại từ đầu" / nạp mã sao lưu).
--
-- LƯU Ý: thay luôn một bản guard khác từng được gắn trực tiếp lên máy chủ (trigger trg_player_saves_guard),
-- bản đó so save_version (phiên bản ĐỊNH DẠNG lưu, client luôn gửi 8) rồi tự tăng nó sau mỗi lần ghi
-- → từ lần ghi thứ 2 mọi lần lưu đều bị từ chối, người chơi kẹt tiến trình.
drop trigger if exists trg_player_saves_guard on public.player_saves;
drop trigger if exists player_saves_guard on public.player_saves;

create or replace function public.player_saves_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare old_caught bigint; new_caught bigint; reset_ok boolean; old_fresh boolean;
begin
  if tg_op = 'UPDATE' then
    old_caught := coalesce(public.stat_num(old.save -> 'stats', 'totalCaught'), 0);
    new_caught := coalesce(public.stat_num(new.save -> 'stats', 'totalCaught'), 0);
    reset_ok := (new.save ->> 'resetAt') is not null and (new.save ->> 'resetAt') is distinct from (old.save ->> 'resetAt');
    old_fresh := old.level <= 1 and old_caught = 0;
    if not reset_ok and (new.level < old.level or new_caught < old_caught) then
      -- (bản bị chặn là bản CŨ trên máy kia – không cần giữ; báo lỗi để máy đó tải bản mới nhất)
      raise exception 'STALE_SAVE: Tiến trình trên máy này cũ hơn tài khoản – đang tải bản mới nhất';
    end if;
    if not reset_ok and not old_fresh and (new.save ->> 'playerId') is distinct from (old.save ->> 'playerId') then
      raise exception 'STALE_SAVE: Máy này đang giữ tiến trình của tài khoản khác – đang tải bản của tài khoản';
    end if;
    -- save_version = phiên bản định dạng bản lưu (không phải bộ đếm)
    new.save_version := coalesce((new.save ->> 'version')::int, new.save_version);
  end if;
  return new;
end $$;

create trigger player_saves_guard before update on public.player_saves
  for each row execute function public.player_saves_guard();

-- sửa số save_version đã bị bản guard cũ đẩy lên
update public.player_saves set save_version = (save ->> 'version')::int
 where save ? 'version' and save_version is distinct from (save ->> 'version')::int;
