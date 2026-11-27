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
