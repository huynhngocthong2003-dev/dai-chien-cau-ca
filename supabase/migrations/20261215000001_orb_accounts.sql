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

-- Bản sao lưu tự động (tối đa 20 bản / tài khoản)
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
  last_backup timestamptz;
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

  select max(created_at) into last_backup from public.orb_save_backups where user_id = uid;
  if last_backup is null or last_backup < now() - interval '10 minutes' then
    insert into public.orb_save_backups (user_id, save, version, reason) values (uid, cur.save, cur.version, 'auto');
    delete from public.orb_save_backups
     where user_id = uid
       and id not in (select id from public.orb_save_backups where user_id = uid order by created_at desc, id desc limit 20);
  end if;

  update public.orb_saves set save = p_save, version = cur.version + 1, updated_at = now() where user_id = uid;
  return jsonb_build_object('ok', true, 'version', cur.version + 1);
end $$;

revoke all on function public.orb_save_put(jsonb, int) from public, anon;
grant execute on function public.orb_save_put(jsonb, int) to authenticated;
