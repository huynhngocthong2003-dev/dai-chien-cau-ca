-- ĐẤU TRƯỜNG QUẢ CẦU ANIME – CÀI ĐẶT MÁY CHỦ (gộp 2 migration, chạy 1 lần trong Supabase → SQL Editor → Run).
-- An toàn khi chạy lại. Không sửa / xoá bảng nào của game câu cá.

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

-- ĐẤU TRƯỜNG QUẢ CẦU ANIME – Hòm thư người chơi + công cụ quản trị (xem người chơi, gửi quà vàng).
-- Nhận quà: máy chủ cộng vàng thẳng vào bản lưu orb_saves trong CÙNG một giao dịch với việc đánh dấu đã nhận
-- → không thể nhận 2 lần, và nếu cộng vàng lỗi thì thư vẫn là "chưa nhận".

-- Chụp toàn bộ bản lưu trước khi nâng cấp (quy tắc sao lưu)
select public.orb_snapshot_all('truoc_20261216_hom_thu');

create table if not exists public.orb_mail (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'gift' check (kind in ('gift', 'system', 'event', 'ranking')),
  title text not null check (char_length(title) between 1 and 80),
  body text not null default '' check (char_length(body) <= 1000),
  gold int not null default 0 check (gold between 0 and 1000000),
  sender uuid references auth.users (id) on delete set null,
  batch_id uuid,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  read_at timestamptz,
  claimed_at timestamptz,
  hidden_at timestamptz
);
create index if not exists orb_mail_user_time on public.orb_mail (user_id, created_at desc);
create index if not exists orb_mail_batch on public.orb_mail (batch_id);

-- Nhật ký thao tác quản trị
create table if not exists public.orb_admin_log (
  id bigserial primary key,
  admin_id uuid references auth.users (id) on delete set null,
  action text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.orb_mail enable row level security;
alter table public.orb_admin_log enable row level security;
drop policy if exists "orb_mail_select_own" on public.orb_mail;
create policy "orb_mail_select_own" on public.orb_mail for select to authenticated using (auth.uid() = user_id);
-- Không có policy ghi: chỉ các hàm bên dưới (security definer) được ghi. orb_admin_log: không ai đọc trực tiếp.
revoke all on public.orb_mail, public.orb_admin_log from anon, authenticated;
grant select on public.orb_mail to authenticated;

-- ===== NGƯỜI CHƠI =====
create or replace function public.orb_mail_read(p_id bigint)
returns void language sql security definer set search_path = public as $$
  update public.orb_mail set read_at = coalesce(read_at, now()) where id = p_id and user_id = auth.uid();
$$;

/** Ẩn thư (chỉ thư đã nhận hoặc không có quà). */
create or replace function public.orb_mail_hide(p_id bigint)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.orb_mail set hidden_at = now()
   where id = p_id and user_id = auth.uid() and hidden_at is null and (claimed_at is not null or gold = 0);
  return found;
end $$;

/**
 * Nhận quà trong thư. p_expected = phiên bản bản lưu máy đang giữ (giống orb_save_put).
 * Trả về { ok: true, version, gold, added } | { ok: false, reason: 'stale' | 'claimed' | 'expired' | 'no_save', version? }
 */
create or replace function public.orb_mail_claim(p_id bigint, p_expected int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  m public.orb_mail;
  cur public.orb_saves;
  newgold bigint;
begin
  if uid is null then raise exception 'Chưa đăng nhập'; end if;
  select * into m from public.orb_mail where id = p_id and user_id = uid for update;
  if not found then raise exception 'Không tìm thấy thư'; end if;
  if m.claimed_at is not null then return jsonb_build_object('ok', false, 'reason', 'claimed'); end if;
  if m.expires_at is not null and m.expires_at < now() then return jsonb_build_object('ok', false, 'reason', 'expired'); end if;
  select * into cur from public.orb_saves where user_id = uid for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'no_save'); end if;
  if p_expected is distinct from cur.version then
    return jsonb_build_object('ok', false, 'reason', 'stale', 'version', cur.version);
  end if;
  perform public.orb_backup_rotate(uid, cur.save, cur.version);
  newgold := greatest(0, coalesce(case when jsonb_typeof(cur.save -> 'gold') = 'number' then (cur.save ->> 'gold')::numeric end, 0))::bigint + m.gold;
  update public.orb_saves
     set save = jsonb_set(cur.save, '{gold}', to_jsonb(newgold)), version = cur.version + 1, updated_at = now()
   where user_id = uid;
  update public.orb_mail set claimed_at = now(), read_at = coalesce(read_at, now()) where id = m.id;
  return jsonb_build_object('ok', true, 'version', cur.version + 1, 'gold', newgold, 'added', m.gold);
end $$;

revoke all on function public.orb_mail_read(bigint), public.orb_mail_hide(bigint), public.orb_mail_claim(bigint, int) from public, anon;
grant execute on function public.orb_mail_read(bigint), public.orb_mail_hide(bigint), public.orb_mail_claim(bigint, int) to authenticated;

-- ===== QUẢN TRỊ (bảng admins / service_role / chủ database) =====
create or replace function public.orb_num(j jsonb, k text) returns bigint
language sql immutable as $$ select case when jsonb_typeof(j -> k) = 'number' then (j ->> k)::numeric::bigint else 0 end $$;

/** Tổng quan. */
create or replace function public.orb_admin_stats()
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.orb_is_admin() then raise exception 'Chỉ quản trị viên'; end if;
  return jsonb_build_object(
    'players', (select count(*) from public.orb_saves),
    'active_24h', (select count(*) from public.orb_saves where updated_at > now() - interval '24 hours'),
    'active_7d', (select count(*) from public.orb_saves where updated_at > now() - interval '7 days'),
    'new_7d', (select count(*) from public.orb_saves where created_at > now() - interval '7 days'),
    'total_gold', (select coalesce(sum(public.orb_num(save, 'gold')), 0) from public.orb_saves),
    'total_matches', (select coalesce(sum(public.orb_num(save, 'matches')), 0) from public.orb_saves),
    'mail_unclaimed', (select count(*) from public.orb_mail where claimed_at is null and gold > 0),
    'gold_unclaimed', (select coalesce(sum(gold), 0) from public.orb_mail where claimed_at is null)
  );
end $$;

/** Danh sách người chơi (tìm theo ID #XXXXXX, tên hoặc email). */
create or replace function public.orb_admin_players(p_query text default '', p_limit int default 200)
returns table (user_id uuid, player_id text, name text, email text, gold bigint, matches bigint, wins bigint, owned int, friends int,
               created_at timestamptz, updated_at timestamptz, last_sign_in_at timestamptz, mail_unclaimed bigint)
language plpgsql stable security definer set search_path = public, auth as $$
declare q text := lower(trim(replace(coalesce(p_query, ''), '#', '')));
begin
  if not public.orb_is_admin() then raise exception 'Chỉ quản trị viên'; end if;
  return query
    select s.user_id, s.player_id, coalesce(s.save ->> 'name', '')::text, u.email::text,
           public.orb_num(s.save, 'gold'), public.orb_num(s.save, 'matches'), public.orb_num(s.save, 'wins'),
           case when jsonb_typeof(s.save -> 'unlocked') = 'array' then jsonb_array_length(s.save -> 'unlocked') else 0 end,
           case when jsonb_typeof(s.save -> 'friends') = 'array' then jsonb_array_length(s.save -> 'friends') else 0 end,
           s.created_at, s.updated_at, u.last_sign_in_at,
           (select count(*) from public.orb_mail m where m.user_id = s.user_id and m.claimed_at is null and m.gold > 0)
      from public.orb_saves s left join auth.users u on u.id = s.user_id
     where q = '' or lower(s.player_id) like q || '%' or lower(coalesce(s.save ->> 'name', '')) like '%' || q || '%' or lower(coalesce(u.email, '')) like '%' || q || '%'
     order by s.updated_at desc
     limit greatest(1, least(coalesce(p_limit, 200), 1000));
end $$;

/** Chi tiết một người chơi. */
create or replace function public.orb_admin_player(p_player_id text)
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
declare s public.orb_saves; u auth.users;
begin
  if not public.orb_is_admin() then raise exception 'Chỉ quản trị viên'; end if;
  select * into s from public.orb_saves where player_id = upper(replace(coalesce(p_player_id, ''), '#', ''));
  if not found then return null; end if;
  select * into u from auth.users where id = s.user_id;
  return jsonb_build_object(
    'user_id', s.user_id, 'player_id', s.player_id, 'email', u.email, 'signed_up_at', u.created_at, 'last_sign_in_at', u.last_sign_in_at,
    'created_at', s.created_at, 'updated_at', s.updated_at, 'version', s.version,
    'name', s.save -> 'name', 'gold', s.save -> 'gold', 'matches', s.save -> 'matches', 'wins', s.save -> 'wins',
    'unlocked', s.save -> 'unlocked', 'main', s.save -> 'main', 'fav', s.save -> 'fav', 'title', s.save -> 'title',
    'renames', s.save -> 'renames', 'status', s.save -> 'status', 'history', s.save -> 'history',
    'friends', (select coalesce(jsonb_agg(jsonb_build_object('f', f -> 'f', 'n', f -> 'n')), '[]'::jsonb) from jsonb_array_elements(case when jsonb_typeof(s.save -> 'friends') = 'array' then s.save -> 'friends' else '[]'::jsonb end) f),
    'mail', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'title', m.title, 'gold', m.gold, 'created_at', m.created_at, 'read_at', m.read_at, 'claimed_at', m.claimed_at) order by m.created_at desc), '[]'::jsonb)
               from (select * from public.orb_mail where user_id = s.user_id order by created_at desc limit 50) m),
    'backups', (select count(*) from public.orb_save_backups where user_id = s.user_id)
  );
end $$;

/**
 * Gửi thư (có thể kèm vàng). p_player_ids: danh sách ID #XXXXXX; p_all = true để gửi TẤT CẢ người chơi.
 * Trả về { ok, sent, batch_id, missing[] }.
 */
create or replace function public.orb_admin_send_mail(p_player_ids text[], p_all boolean, p_title text, p_body text, p_gold int, p_days int default 30)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  b uuid := gen_random_uuid();
  ids text[];
  n int;
  miss text[];
begin
  if not public.orb_is_admin() then raise exception 'Chỉ quản trị viên'; end if;
  if char_length(trim(coalesce(p_title, ''))) not between 1 and 80 then raise exception 'Tiêu đề 1–80 ký tự'; end if;
  if char_length(coalesce(p_body, '')) > 1000 then raise exception 'Nội dung tối đa 1000 ký tự'; end if;
  if coalesce(p_gold, 0) not between 0 and 1000000 then raise exception 'Vàng mỗi thư 0–1.000.000'; end if;
  if coalesce(p_all, false) then
    insert into public.orb_mail (user_id, kind, title, body, gold, sender, batch_id, expires_at)
    select user_id, 'gift', trim(p_title), coalesce(p_body, ''), coalesce(p_gold, 0), auth.uid(), b,
           case when coalesce(p_days, 0) > 0 then now() + make_interval(days => p_days) end
      from public.orb_saves;
    get diagnostics n = row_count;
    miss := '{}';
  else
    select array_agg(distinct upper(replace(trim(x), '#', ''))) into ids from unnest(coalesce(p_player_ids, '{}')) x where trim(x) <> '';
    if ids is null or array_length(ids, 1) is null then raise exception 'Chưa chọn người nhận'; end if;
    if array_length(ids, 1) > 500 then raise exception 'Tối đa 500 người nhận mỗi lần (dùng "gửi tất cả")'; end if;
    insert into public.orb_mail (user_id, kind, title, body, gold, sender, batch_id, expires_at)
    select s.user_id, 'gift', trim(p_title), coalesce(p_body, ''), coalesce(p_gold, 0), auth.uid(), b,
           case when coalesce(p_days, 0) > 0 then now() + make_interval(days => p_days) end
      from public.orb_saves s where s.player_id = any (ids);
    get diagnostics n = row_count;
    select coalesce(array_agg(x), '{}') into miss from unnest(ids) x where not exists (select 1 from public.orb_saves s where s.player_id = x);
  end if;
  insert into public.orb_admin_log (admin_id, action, detail)
  values (auth.uid(), 'send_mail', jsonb_build_object('batch_id', b, 'all', coalesce(p_all, false), 'to', to_jsonb(coalesce(ids, '{}'::text[])),
          'title', trim(p_title), 'gold', coalesce(p_gold, 0), 'sent', n, 'missing', to_jsonb(miss)));
  return jsonb_build_object('ok', true, 'sent', n, 'batch_id', b, 'missing', to_jsonb(miss));
end $$;

/** Lịch sử gửi thư (kèm số người đã nhận). */
create or replace function public.orb_admin_mail_log(p_limit int default 50)
returns table (id bigint, created_at timestamptz, admin_email text, title text, gold int, is_all boolean, sent int, claimed bigint, missing jsonb)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.orb_is_admin() then raise exception 'Chỉ quản trị viên'; end if;
  return query
    select l.id, l.created_at, u.email::text, l.detail ->> 'title', (l.detail ->> 'gold')::int, (l.detail ->> 'all')::boolean, (l.detail ->> 'sent')::int,
           (select count(*) from public.orb_mail m where m.batch_id = (l.detail ->> 'batch_id')::uuid and m.claimed_at is not null),
           l.detail -> 'missing'
      from public.orb_admin_log l left join auth.users u on u.id = l.admin_id
     where l.action = 'send_mail'
     order by l.created_at desc
     limit greatest(1, least(coalesce(p_limit, 50), 500));
end $$;

revoke all on function public.orb_num(jsonb, text), public.orb_admin_stats(), public.orb_admin_players(text, int), public.orb_admin_player(text),
  public.orb_admin_send_mail(text[], boolean, text, text, int, int), public.orb_admin_mail_log(int) from public, anon;
grant execute on function public.orb_admin_stats(), public.orb_admin_players(text, int), public.orb_admin_player(text),
  public.orb_admin_send_mail(text[], boolean, text, text, int, int), public.orb_admin_mail_log(int) to authenticated, service_role;
grant execute on function public.orb_num(jsonb, text) to authenticated, service_role;
