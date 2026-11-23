-- BOSS THẾ GIỚI: 12h · 15h · 20h (giờ VN), mọi người chơi đánh chung 1 thanh máu.
-- Máy chủ (Edge Function world-boss, service_role) là trọng tài: tạo boss theo khung giờ, tính sát thương,
-- trừ máu nguyên tử (wb_apply_hit), xếp hạng & gửi quà Hòm Thư. Người chơi chỉ được ĐỌC bảng boss & bảng sát thương.
create table if not exists public.world_boss (
  id uuid primary key default gen_random_uuid(),
  slot_key text not null unique,
  boss_id text not null,
  element text not null,
  max_hp bigint not null check (max_hp > 0),
  hp bigint not null check (hp >= 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  killer uuid references auth.users (id) on delete set null,
  killer_name text,
  killed_at timestamptz,
  rewarded boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.world_boss_damage (
  boss uuid not null references public.world_boss (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  damage bigint not null default 0,
  hits int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (boss, user_id)
);
create index if not exists world_boss_damage_rank on public.world_boss_damage (boss, damage desc);

-- phiên đánh (đội + thời điểm hiện thanh kim) – chỉ máy chủ đọc/ghi
create table if not exists public.world_boss_sessions (
  id uuid primary key default gen_random_uuid(),
  boss uuid not null references public.world_boss (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  team jsonb not null,
  seed bigint not null,
  hits int not null default 0,
  damage bigint not null default 0,
  bar_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists world_boss_sessions_user on public.world_boss_sessions (boss, user_id);

alter table public.world_boss enable row level security;
alter table public.world_boss_damage enable row level security;
alter table public.world_boss_sessions enable row level security;
drop policy if exists world_boss_read on public.world_boss;
create policy world_boss_read on public.world_boss for select to authenticated using (true);
drop policy if exists world_boss_damage_read on public.world_boss_damage;
create policy world_boss_damage_read on public.world_boss_damage for select to authenticated using (true);
grant select on public.world_boss, public.world_boss_damage to authenticated;
grant select, insert, update, delete on public.world_boss, public.world_boss_damage, public.world_boss_sessions to service_role;

-- Trừ máu NGUYÊN TỬ (khoá dòng boss): nhiều người đánh cùng lúc vẫn đúng; chỉ 1 người là người kết liễu.
create or replace function public.wb_apply_hit(p_boss uuid, p_user uuid, p_name text, p_dmg bigint)
returns table (hp bigint, dealt bigint, killed boolean)
language plpgsql set search_path = public as $$
declare
  v_old bigint;
  v_new bigint;
begin
  select w.hp into v_old from public.world_boss w where w.id = p_boss and w.hp > 0 and now() < w.ends_at for update;
  if not found then
    return query select 0::bigint, 0::bigint, false;
    return;
  end if;
  v_new := greatest(0, v_old - greatest(0, p_dmg));
  update public.world_boss w
     set hp = v_new,
         killer = case when v_new = 0 then p_user else w.killer end,
         killer_name = case when v_new = 0 then p_name else w.killer_name end,
         killed_at = case when v_new = 0 then now() else w.killed_at end
   where w.id = p_boss;
  insert into public.world_boss_damage as d (boss, user_id, name, damage, hits)
  values (p_boss, p_user, p_name, v_old - v_new, 1)
  on conflict (boss, user_id) do update
     set damage = d.damage + excluded.damage, hits = d.hits + 1, name = excluded.name, updated_at = now();
  return query select v_new, v_old - v_new, v_new = 0;
end;
$$;
revoke all on function public.wb_apply_hit(uuid, uuid, text, bigint) from public;
grant execute on function public.wb_apply_hit(uuid, uuid, text, bigint) to service_role;
