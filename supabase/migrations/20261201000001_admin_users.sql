-- Quản trị: xem danh sách tài khoản đăng ký + tóm tắt tiến trình (CHỈ quản trị viên, kiểm tra ở máy chủ).
-- Email chỉ lộ cho quản trị viên qua hàm security definer; người chơi thường gọi sẽ bị từ chối.

create or replace function public.admin_list_users(p_query text default '', p_limit int default 300)
returns table (
  user_id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz, confirmed boolean,
  display_name text, friend_code text, level int, gold bigint, diamonds bigint, total_caught int, fishes int,
  save_updated_at timestamptz, last_seen timestamptz, topup_vnd bigint, backups int, is_admin boolean
)
language plpgsql stable security definer set search_path = public, auth as $$
declare q text := lower(btrim(coalesce(p_query, '')));
begin
  if not public.is_admin() then raise exception 'Chỉ quản trị viên'; end if;
  return query
    select u.id, u.email::text, u.created_at, u.last_sign_in_at, (u.email_confirmed_at is not null),
      c.display_name, c.friend_code, coalesce(s.level, c.level),
      coalesce((s.save ->> 'gold')::bigint, 0), coalesce((s.save ->> 'diamonds')::bigint, 0),
      coalesce((s.save -> 'stats' ->> 'totalCaught')::int, 0),
      coalesce(jsonb_array_length(case when jsonb_typeof(s.save -> 'fishes') = 'array' then s.save -> 'fishes' end), 0),
      s.updated_at, c.updated_at,
      coalesce((select sum(t.amount_vnd) from topup_orders t where t.user_id = u.id and t.status in ('approved', 'claimed')), 0)::bigint,
      (select count(*)::int from player_save_backups b where b.user_id = u.id),
      exists (select 1 from admins a where a.user_id = u.id)
    from auth.users u
    left join player_cards c on c.user_id = u.id
    left join player_saves s on s.user_id = u.id
    where q = '' or lower(coalesce(u.email, '')) like '%' || q || '%' or lower(coalesce(c.display_name, '')) like '%' || q || '%'
      or lower(coalesce(c.friend_code, '')) = q or u.id::text = q or lower(coalesce(s.save ->> 'playerId', '')) = q
    order by u.created_at desc
    limit least(greatest(coalesce(p_limit, 300), 1), 1000);
end $$;

-- Chi tiết 1 tài khoản: bản lưu hiện tại + các bản sao lưu gần đây (để tra soát / khôi phục khi cần)
create or replace function public.admin_user_detail(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'Chỉ quản trị viên'; end if;
  return jsonb_build_object(
    'save', (select s.save from player_saves s where s.user_id = p_user),
    'backups', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'created_at', b.created_at, 'level', b.level, 'reason', b.reason,
        'name', b.save ->> 'name', 'caught', b.save -> 'stats' ->> 'totalCaught', 'player_id', b.save ->> 'playerId') order by b.created_at desc)
      from (select * from player_save_backups where user_id = p_user order by created_at desc limit 30) b), '[]'::jsonb),
    'topups', coalesce((select jsonb_agg(jsonb_build_object('code', t.code, 'package', t.package, 'amount_vnd', t.amount_vnd, 'status', t.status, 'created_at', t.created_at) order by t.created_at desc)
      from topup_orders t where t.user_id = p_user), '[]'::jsonb)
  );
end $$;

revoke execute on function public.admin_list_users(text, int), public.admin_user_detail(uuid) from public, anon;
grant execute on function public.admin_list_users(text, int), public.admin_user_detail(uuid) to authenticated;
