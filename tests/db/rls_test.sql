-- Kiểm thử RLS + trigger. Mỗi khối lỗi sẽ dừng với ON_ERROR_STOP.
\set ON_ERROR_STOP on
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'a@test', '{"display_name":"An"}'),
  ('22222222-2222-2222-2222-222222222222', 'b@test', '{}');

-- 1. Hồ sơ được tạo tự động
do $$ begin
  if (select display_name from public.profiles where id = '11111111-1111-1111-1111-111111111111') <> 'An' then raise exception 'Hồ sơ A sai'; end if;
  if (select display_name from public.profiles where id = '22222222-2222-2222-2222-222222222222') <> 'Cần Thủ' then raise exception 'Hồ sơ B sai'; end if;
end $$;

-- Đăng nhập là A
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false) \g /dev/null

-- 2. A ghi bản lưu của mình
insert into public.player_saves (user_id, save, save_version, player_id, level)
values ('11111111-1111-1111-1111-111111111111', '{"version":4,"gold":10}', 4, 'p_a', 3);
update public.player_saves set save = '{"version":4,"gold":20}', level = 4 where user_id = '11111111-1111-1111-1111-111111111111';

-- 3. A không thể ghi bản lưu của B
do $$ begin
  begin
    insert into public.player_saves (user_id, save, save_version, player_id) values ('22222222-2222-2222-2222-222222222222', '{}', 4, 'x');
    raise exception 'LỖI: A ghi được bản lưu của B';
  exception when insufficient_privilege then null;
  end;
end $$;

-- 4. A thấy bản sao lưu tự động của mình, không xóa được
do $$ begin
  if (select count(*) from public.player_save_backups) <> 1 then raise exception 'Phải có đúng 1 bản sao lưu tự động'; end if;
  if (select (save ->> 'gold')::int from public.player_save_backups limit 1) <> 10 then raise exception 'Bản sao lưu phải là bản cũ (gold=10)'; end if;
end $$;
do $$ begin
  begin
    delete from public.player_save_backups where true;
    raise exception 'LỖI: A xóa được bản sao lưu';
  exception when insufficient_privilege then null;
  end;
end $$;
do $$ begin
  begin
    delete from public.player_saves where true;
    raise exception 'LỖI: A xóa được bản lưu';
  exception when insufficient_privilege then null;
  end;
end $$;

-- 5. B không thấy dữ liệu của A
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false) \g /dev/null
do $$ begin
  if (select count(*) from public.player_saves) <> 0 then raise exception 'B thấy bản lưu của A'; end if;
  if (select count(*) from public.player_save_backups) <> 0 then raise exception 'B thấy sao lưu của A'; end if;
  if (select count(*) from public.profiles) <> 1 then raise exception 'B thấy hồ sơ người khác'; end if;
end $$;
update public.player_saves set save = '{"hack":true}' where true; -- không ảnh hưởng dòng nào
reset role;
do $$ begin
  if (select save ->> 'hack' from public.player_saves where user_id = '11111111-1111-1111-1111-111111111111') is not null then raise exception 'B sửa được bản lưu của A'; end if;
end $$;

-- 6. Khách (anon) không đọc được gì
set role anon;
do $$ begin
  begin
    perform 1 from public.player_saves;
    raise exception 'LỖI: anon đọc được player_saves';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- 7. Ràng buộc dữ liệu
do $$ begin
  begin
    insert into public.player_saves (user_id, save, save_version, player_id) values ('22222222-2222-2222-2222-222222222222', '[1,2]', 4, 'p_b');
    raise exception 'LỖI: chấp nhận save không phải object';
  exception when check_violation then null;
  end;
end $$;

select 'DB RLS TEST OK' as result;
