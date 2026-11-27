-- ĐẤU TRƯỜNG QUẢ CẦU ANIME (/dau-truong/) – Giai đoạn 1: tiến độ lưu theo TÀI KHOẢN (dùng chung tài khoản với game câu cá).
-- Bảng riêng tiền tố orb_ – không đụng bảng của game câu cá.
-- Giai đoạn chuyển tiếp: người chơi chỉ ghi bản lưu của CHÍNH MÌNH qua hàm orb_save_put (kiểm tra phiên bản, giữ cố định ID);
-- giai đoạn 2 sẽ chuyển vàng / kết quả trận sang máy chủ làm trọng tài.

create table if not exists public.orb_saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  save jsonb not null check (jsonb_typeof(save) = 'object'),
  version int not null default 1 check (version >= 1),
  player_id text not null check (player_id ~ '^[A-HJ-NP-Z2-9]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists orb_saves_player_id on public.orb_saves (player_id);

-- SAO LƯU (nằm trong database, không xuất ra ngoài – repo công khai):
--  · auto: bản cũ trước khi ghi đè, tối đa 1 bản / 10 phút, giữ 20 bản mới nhất
--  · daily: bản đầu tiên mỗi ngày, giữ 30 ngày gần nhất
--  · snapshot:* / before_restore: chụp toàn bộ hoặc trước khi khôi phục – giữ 180 ngày
create table if not exists public.orb_save_backups (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  save jsonb not null,
  version int not null,
  reason text not null,
  created_at timestamptz not null default now()
);
create index if not exists orb_save_backups_user_time on public.orb_save_backups (user_id, created_at desc);

alter table public.orb_saves enable row level security;
alter table public.orb_save_backups enable row level security;
drop policy if exists "orb_saves_select_own" on public.orb_saves;
create policy "orb_saves_select_own" on public.orb_saves for select to authenticated using (auth.uid() = user_id);
drop policy if exists "orb_backups_select_own" on public.orb_save_backups;
create policy "orb_backups_select_own" on public.orb_save_backups for select to authenticated using (auth.uid() = user_id);
-- Không có policy insert/update/delete: chỉ hàm orb_save_put (security definer) được ghi.
revoke all on public.orb_saves, public.orb_save_backups from anon, authenticated;
grant select on public.orb_saves, public.orb_save_backups to authenticated;

-- Cất bản cũ trước khi ghi đè + dọn bản quá hạn (gọi nội bộ)
create or replace function public.orb_backup_rotate(p_uid uuid, p_save jsonb, p_version int)
returns void language plpgsql security definer set search_path = public as $$
declare last_auto timestamptz;
begin
  if not exists (select 1 from public.orb_save_backups where user_id = p_uid and reason = 'daily' and created_at >= date_trunc('day', now())) then
    insert into public.orb_save_backups (user_id, save, version, reason) values (p_uid, p_save, p_version, 'daily');
  end if;
  select max(created_at) into last_auto from public.orb_save_backups where user_id = p_uid and reason = 'auto';
  if last_auto is null or last_auto < now() - interval '10 minutes' then
    insert into public.orb_save_backups (user_id, save, version, reason) values (p_uid, p_save, p_version, 'auto');
  end if;
  delete from public.orb_save_backups
   where user_id = p_uid and reason = 'auto'
     and id not in (select id from public.orb_save_backups where user_id = p_uid and reason = 'auto' order by created_at desc, id desc limit 20);
  delete from public.orb_save_backups where user_id = p_uid and reason = 'daily' and created_at < now() - interval '30 days';
  delete from public.orb_save_backups where user_id = p_uid and reason not in ('auto', 'daily') and created_at < now() - interval '180 days';
end $$;
revoke all on function public.orb_backup_rotate(uuid, jsonb, int) from public, anon, authenticated;

/**
 * Ghi bản lưu của chính mình.
 *  p_expected = phiên bản người chơi đang giữ (0 = chưa có bản lưu trên tài khoản).
 * Trả về jsonb: { ok: true, version } | { ok: false, reason: 'stale' | 'fid_taken', version? }
 *  - stale: tài khoản đã được cập nhật từ máy khác → máy này phải tải bản mới nhất, không ghi đè.
 *  - fid_taken: ID người chơi trùng với tài khoản khác (chỉ khi tạo lần đầu) → máy tạo ID mới rồi gửi lại.
 * ID người chơi (save.fid) được giữ cố định sau lần tạo đầu tiên.
 */
create or replace function public.orb_save_put(p_save jsonb, p_expected int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cur public.orb_saves;
  fid text;
begin
  if uid is null then raise exception 'Chưa đăng nhập'; end if;
  if p_save is null or jsonb_typeof(p_save) <> 'object' then raise exception 'Bản lưu không hợp lệ'; end if;
  if pg_column_size(p_save) > 200000 then raise exception 'Bản lưu quá lớn'; end if;

  select * into cur from public.orb_saves where user_id = uid for update;

  if not found then
    if coalesce(p_expected, 0) <> 0 then
      return jsonb_build_object('ok', false, 'reason', 'stale', 'version', 0);
    end if;
    fid := p_save ->> 'fid';
    if fid is null or fid !~ '^[A-HJ-NP-Z2-9]{6}$' then raise exception 'ID người chơi không hợp lệ'; end if;
    if exists (select 1 from public.orb_saves where player_id = fid) then
      return jsonb_build_object('ok', false, 'reason', 'fid_taken');
    end if;
    insert into public.orb_saves (user_id, save, version, player_id) values (uid, p_save, 1, fid);
    return jsonb_build_object('ok', true, 'version', 1);
  end if;

  if p_expected is distinct from cur.version then
    return jsonb_build_object('ok', false, 'reason', 'stale', 'version', cur.version);
  end if;

  -- giữ cố định ID người chơi
  p_save := jsonb_set(p_save, '{fid}', to_jsonb(cur.player_id));

  perform public.orb_backup_rotate(uid, cur.save, cur.version);

  update public.orb_saves set save = p_save, version = cur.version + 1, updated_at = now() where user_id = uid;
  return jsonb_build_object('ok', true, 'version', cur.version + 1);
end $$;

revoke all on function public.orb_save_put(jsonb, int) from public, anon;
grant execute on function public.orb_save_put(jsonb, int) to authenticated;

-- ===== QUẢN TRỊ: chụp toàn bộ & khôi phục (chỉ admin hoặc service_role) =====
create or replace function public.orb_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  -- session_user là tài khoản kết nối thật (API: authenticator; migration / SQL Editor: postgres)
  select session_user in ('postgres', 'supabase_admin')
      or coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
      or coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '') = 'service_role'
      or exists (select 1 from public.admins where user_id = auth.uid())
$$;

/** Chụp bản lưu của TẤT CẢ người chơi vào orb_save_backups (chạy trước mỗi lần nâng cấp lớn). Trả về số bản đã chụp. */
create or replace function public.orb_snapshot_all(p_reason text default 'manual')
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.orb_is_admin() then raise exception 'Chỉ quản trị viên'; end if;
  insert into public.orb_save_backups (user_id, save, version, reason)
  select user_id, save, version, 'snapshot:' || left(coalesce(nullif(trim(p_reason), ''), 'manual'), 40) from public.orb_saves;
  get diagnostics n = row_count;
  return n;
end $$;

/** Danh sách bản sao lưu của một người chơi (theo user id hoặc ID #XXXXXX). */
create or replace function public.orb_admin_backups(p_user uuid default null, p_player_id text default null)
returns table (id bigint, user_id uuid, version int, reason text, created_at timestamptz, gold int, matches int, unlocked int)
language plpgsql stable security definer set search_path = public as $$
declare u uuid := p_user;
begin
  if not public.orb_is_admin() then raise exception 'Chỉ quản trị viên'; end if;
  if u is null then select s.user_id into u from public.orb_saves s where s.player_id = upper(replace(coalesce(p_player_id, ''), '#', '')); end if;
  return query
    select b.id, b.user_id, b.version, b.reason, b.created_at,
           case when jsonb_typeof(b.save -> 'gold') = 'number' then (b.save ->> 'gold')::numeric::int end,
           case when jsonb_typeof(b.save -> 'matches') = 'number' then (b.save ->> 'matches')::numeric::int end,
           case when jsonb_typeof(b.save -> 'unlocked') = 'array' then jsonb_array_length(b.save -> 'unlocked') end
      from public.orb_save_backups b where b.user_id = u order by b.created_at desc, b.id desc;
end $$;

/** Khôi phục bản lưu của người chơi từ một bản sao lưu (cất bản hiện tại trước). Máy người chơi sẽ tự tải bản mới. */
create or replace function public.orb_admin_restore(p_backup_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare b public.orb_save_backups; cur public.orb_saves;
begin
  if not public.orb_is_admin() then raise exception 'Chỉ quản trị viên'; end if;
  select * into b from public.orb_save_backups where id = p_backup_id;
  if not found then raise exception 'Không thấy bản sao lưu %', p_backup_id; end if;
  select * into cur from public.orb_saves where user_id = b.user_id for update;
  if not found then raise exception 'Người chơi chưa có bản lưu'; end if;
  insert into public.orb_save_backups (user_id, save, version, reason) values (cur.user_id, cur.save, cur.version, 'before_restore');
  update public.orb_saves
     set save = jsonb_set(b.save, '{fid}', to_jsonb(cur.player_id)), version = cur.version + 1, updated_at = now()
   where user_id = cur.user_id;
  return jsonb_build_object('ok', true, 'user_id', cur.user_id, 'version', cur.version + 1, 'from_backup', p_backup_id);
end $$;

revoke all on function public.orb_is_admin(), public.orb_snapshot_all(text), public.orb_admin_backups(uuid, text), public.orb_admin_restore(bigint) from public, anon;
grant execute on function public.orb_is_admin(), public.orb_snapshot_all(text), public.orb_admin_backups(uuid, text), public.orb_admin_restore(bigint) to authenticated, service_role;
