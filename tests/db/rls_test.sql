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

-- ================= Hồ sơ, bạn bè, PvP =================
insert into auth.users (id, email, raw_user_meta_data) values ('33333333-3333-3333-3333-333333333333', 'c@test', '{}');
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false) \g /dev/null
insert into public.player_cards (user_id, display_name, friend_code, level, showcase) values ('11111111-1111-1111-1111-111111111111', 'An', 'HACK0000', 5, '[{"fishId":"f_ca_ro"}]');
do $$ begin
  if (select friend_code from public.player_cards where user_id = '11111111-1111-1111-1111-111111111111') <> '11111111' then raise exception 'Mã kết bạn phải do máy chủ tạo'; end if;
end $$;
do $$ begin
  begin
    insert into public.player_cards (user_id, display_name, friend_code) values ('22222222-2222-2222-2222-222222222222', 'Giả', 'X');
    raise exception 'LỖI: A tạo được hồ sơ cho B';
  exception when insufficient_privilege then null;
  end;
end $$;
-- A gửi lời mời cho B
insert into public.friendships (requester, addressee) values ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
do $$ begin
  begin
    insert into public.friendships (requester, addressee, status) values ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'accepted');
    raise exception 'LỖI: tự chấp nhận lời mời';
  exception when insufficient_privilege then null;
  end;
end $$;
-- A không tự chấp nhận lời mời mình gửi
update public.friendships set status = 'accepted' where true;
do $$ begin
  if (select status from public.friendships limit 1) <> 'pending' then raise exception 'Người gửi tự chấp nhận được'; end if;
end $$;

-- B xem hồ sơ A, chấp nhận lời mời
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false) \g /dev/null
insert into public.player_cards (user_id, display_name, friend_code) values ('22222222-2222-2222-2222-222222222222', 'Bình', 'x');
do $$ begin
  if (select count(*) from public.player_cards) <> 2 then raise exception 'B phải xem được các hồ sơ công khai'; end if;
end $$;
update public.friendships set status = 'accepted' where addressee = '22222222-2222-2222-2222-222222222222';
do $$ begin
  if (select status from public.friendships limit 1) <> 'accepted' then raise exception 'B không chấp nhận được'; end if;
end $$;
-- B không sửa được hồ sơ của A
update public.player_cards set display_name = 'Bị Hack' where user_id = '11111111-1111-1111-1111-111111111111';
-- C không thấy quan hệ bạn bè của A–B
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false) \g /dev/null
do $$ begin
  if (select count(*) from public.friendships) <> 0 then raise exception 'C thấy quan hệ bạn bè của người khác'; end if;
end $$;
-- Người chơi không tự ghi trận PvP
do $$ begin
  begin
    insert into public.pvp_matches (challenger, defender, seed, result, for_challenger, for_defender, challenger_name, defender_name)
    values ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 1, '{}', '{}', '{}', 'C', 'A');
    raise exception 'LỖI: người chơi tự ghi được trận PvP';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
do $$ begin
  if (select display_name from public.player_cards where user_id = '11111111-1111-1111-1111-111111111111') <> 'An' then raise exception 'B sửa được hồ sơ A'; end if;
end $$;
-- Máy chủ ghi trận; mỗi bên chỉ đánh dấu phía mình
insert into public.pvp_matches (id, challenger, defender, seed, result, for_challenger, for_defender, challenger_name, defender_name)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 1, '{}', '{}', '{}', 'An', 'Bình');
set role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false) \g /dev/null
select public.mark_pvp_applied('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') \g /dev/null
do $$ begin
  if (select count(*) from public.pvp_matches) <> 0 then raise exception 'C thấy trận của người khác'; end if;
end $$;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false) \g /dev/null
select public.mark_pvp_applied('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') \g /dev/null
reset role;
do $$ begin
  if (select applied_defender from public.pvp_matches) is not true then raise exception 'B không đánh dấu được phía mình'; end if;
  if (select applied_challenger from public.pvp_matches) is true then raise exception 'Đánh dấu nhầm phía người thách đấu'; end if;
end $$;

select 'DB PROFILES/FRIENDS/PVP TEST OK' as result;

-- ================= Hội & Bảng Xếp Hạng =================
update public.player_cards set stats = '{"caught":50,"junk":30}' where user_id = '11111111-1111-1111-1111-111111111111';
update public.player_cards set stats = '{"caught":10,"junk":"hack"}' where user_id = '22222222-2222-2222-2222-222222222222';
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false) \g /dev/null
select public.create_guild('Hội Cá Mập', 'cmp', 'Câu là phải to') \g /dev/null
do $$ begin
  if (select tag from public.guilds) <> 'CMP' then raise exception 'Ký hiệu hội phải viết hoa'; end if;
  begin perform public.create_guild('Hội Thứ Hai', 'AB'); raise exception 'LỖI: một người tạo 2 hội';
  exception when raise_exception then if sqlerrm like 'LỖI%' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false) \g /dev/null
do $$ begin
  begin perform public.create_guild('hội cá mập', 'XY'); raise exception 'LỖI: trùng tên hội';
  exception when raise_exception then if sqlerrm like 'LỖI%' then raise; end if; end;
  begin perform public.create_guild('<script>', 'XY'); raise exception 'LỖI: tên hội độc hại';
  exception when check_violation then null; end;
  begin insert into public.guilds (name, tag, owner) values ('Hội Lậu', 'HL', '22222222-2222-2222-2222-222222222222'); raise exception 'LỖI: ghi thẳng bảng hội';
  exception when insufficient_privilege then null; end;
  begin insert into public.guild_members (user_id, guild_id) values ('22222222-2222-2222-2222-222222222222', 1); raise exception 'LỖI: tự thêm thành viên';
  exception when insufficient_privilege then null; end;
end $$;
select public.join_guild((select id from public.guilds limit 1)) \g /dev/null
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false) \g /dev/null
select public.join_guild((select id from public.guilds limit 1)) \g /dev/null
do $$ begin
  if (select members from public.list_guilds('', 10)) <> 3 then raise exception 'Hội phải có 3 thành viên'; end if;
  if (select score from public.list_guilds('cá', 10)) <> 60 then raise exception 'Điểm hội sai'; end if;
end $$;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false) \g /dev/null
do $$ begin
  begin perform public.kick_member('33333333-3333-3333-3333-333333333333'); raise exception 'LỖI: thành viên thường mời người khác ra';
  exception when raise_exception then if sqlerrm like 'LỖI%' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false) \g /dev/null
select public.kick_member('33333333-3333-3333-3333-333333333333') \g /dev/null
-- Bảng xếp hạng: dữ liệu rác ("hack") tính là 0, không làm hỏng bảng
do $$ begin
  if (select user_id from public.leaderboard('caught', 10) where rank = 1) <> '11111111-1111-1111-1111-111111111111' then raise exception 'Hạng 1 câu cá sai'; end if;
  if (select count(*) from public.leaderboard('junk', 10)) <> 1 then raise exception 'Bảng rác phải bỏ qua dữ liệu lỗi'; end if;
  if (select guild_tag from public.leaderboard('caught', 10) where rank = 1) <> 'CMP' then raise exception 'Thiếu hội trên bảng xếp hạng'; end if;
  if public.my_rank('caught') <> 1 then raise exception 'my_rank sai'; end if;
end $$;
select public.leave_guild() \g /dev/null
reset role;
do $$ begin
  if (select owner from public.guilds) <> '22222222-2222-2222-2222-222222222222' then raise exception 'Chủ hội rời thì phải nhường lại'; end if;
  if (select count(*) from public.guild_members) <> 1 then raise exception 'Số thành viên sau khi rời sai'; end if;
end $$;
set role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false) \g /dev/null
select public.leave_guild() \g /dev/null
reset role;
do $$ begin
  if (select count(*) from public.guilds) <> 0 then raise exception 'Hội trống phải được giải tán'; end if;
end $$;
set role anon;
do $$ begin
  begin perform public.leaderboard('caught', 10); raise exception 'LỖI: khách xem được bảng xếp hạng';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'DB GUILDS/RANKINGS TEST OK' as result;

-- ================= Nạp tiền (chủ dự án duyệt) =================
insert into public.admins (user_id) values ('33333333-3333-3333-3333-333333333333');
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false) \g /dev/null
select public.create_topup('kc100') \g /dev/null
do $$ begin
  if (select amount_vnd from public.topup_orders) <> 20000 then raise exception 'Giá gói phải do máy chủ đặt'; end if;
  if (select code from public.topup_orders) !~ '^DCCC[0-9A-F]{6}$' then raise exception 'Mã chuyển khoản sai định dạng'; end if;
  begin perform public.create_topup('kc999999'); raise exception 'LỖI: tạo được gói không tồn tại';
  exception when raise_exception then if sqlerrm like 'LỖI%' then raise; end if; end;
  begin update public.topup_orders set status = 'approved'; raise exception 'LỖI: tự duyệt lệnh của mình';
  exception when insufficient_privilege then null; end;
  begin perform public.admin_decide_topup((select id from public.topup_orders limit 1), true); raise exception 'LỖI: người thường duyệt được';
  exception when raise_exception then if sqlerrm like 'LỖI%' then raise; end if; end;
  if (select count(*) from public.claim_topups()) <> 0 then raise exception 'Nhận được lệnh chưa duyệt'; end if;
end $$;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false) \g /dev/null
do $$ begin
  if (select count(*) from public.topup_orders) <> 0 then raise exception 'B thấy lệnh nạp của A'; end if;
end $$;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false) \g /dev/null
do $$ begin
  if not public.is_admin() then raise exception 'Quản trị viên không được nhận diện'; end if;
  if (select count(*) from public.admin_list_topups('pending')) <> 1 then raise exception 'Quản trị viên không thấy lệnh chờ'; end if;
  perform public.admin_decide_topup((select id from public.admin_list_topups('pending') limit 1), true);
end $$;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false) \g /dev/null
do $$ begin
  if (select package from public.claim_topups()) <> 'kc100' then raise exception 'Không nhận được lệnh đã duyệt'; end if;
  if (select count(*) from public.claim_topups()) <> 0 then raise exception 'Nhận lệnh 2 lần'; end if;
end $$;
reset role;
select 'DB TOPUP TEST OK' as result;

-- ================= Ghép trận ngẫu nhiên =================
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false) \g /dev/null
do $$ begin
  if public.dm_queue_pair(100) is not null then raise exception 'Ghép được khi hàng chờ trống'; end if;
end $$;
select public.dm_queue_join(100) \g /dev/null
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false) \g /dev/null
select public.dm_queue_join(5000) \g /dev/null
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false) \g /dev/null
do $$ begin
  if public.dm_queue_count() <> 2 then raise exception 'Đếm người chờ sai'; end if;
  begin insert into public.dm_queue (user_id) values ('22222222-2222-2222-2222-222222222222'); raise exception 'LỖI: ghi thẳng hàng chờ';
  exception when insufficient_privilege then null; end;
  -- B (lực 120) được ghép với A (lực 100, gần nhất), không phải C (5000)
  if public.dm_queue_pair(120) <> '11111111-1111-1111-1111-111111111111' then raise exception 'Không ưu tiên lực chiến gần'; end if;
end $$;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false) \g /dev/null
do $$ begin
  -- A đã được ghép (rời hàng chờ) nên không tự ghép tiếp với C
  if public.dm_queue_pair(100, true) is not null then raise exception 'Ghép 2 lần'; end if;
  if public.dm_queue_count() <> 1 then raise exception 'Hàng chờ sau khi ghép sai'; end if;
  if (select count(*) from public.dm_random_opponents(5, 5)) < 1 then raise exception 'Không có đối thủ ngẫu nhiên'; end if;
end $$;
reset role;
select 'DB MATCHMAKING TEST OK' as result;

-- ================= Xếp hạng chiến lực đội hình =================
update public.player_cards set stats = stats || '{"teamPower": 900}' where user_id = '11111111-1111-1111-1111-111111111111';
update public.player_cards set stats = stats || '{"teamPower": 1500}' where user_id = '22222222-2222-2222-2222-222222222222';
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false) \g /dev/null
do $$ begin
  if (select user_id from public.leaderboard('teamPower', 10) where rank = 1) <> '22222222-2222-2222-2222-222222222222' then raise exception 'Hạng 1 chiến lực sai'; end if;
  if public.my_rank('teamPower') <> 2 then raise exception 'my_rank chiến lực sai'; end if;
end $$;
reset role;
select 'DB TEAM POWER RANK TEST OK' as result;

-- ================= Nhắn tin =================
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false) \g /dev/null
insert into public.messages (sender, recipient, body) values ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '  Chào bạn, đấu không?  ');
do $$ begin
  begin insert into public.messages (sender, recipient, body) values ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'giả mạo'); raise exception 'LỖI: gửi tin giả danh người khác';
  exception when insufficient_privilege then null; end;
  begin insert into public.messages (sender, recipient, body) values ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', repeat('a', 301)); raise exception 'LỖI: tin quá dài';
  exception when check_violation then null; end;
  if (select body from public.messages limit 1) <> 'Chào bạn, đấu không?' then raise exception 'Chưa cắt khoảng trắng'; end if;
end $$;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false) \g /dev/null
do $$ begin
  if (select count(*) from public.messages) <> 0 then raise exception 'Người ngoài đọc được tin nhắn'; end if;
end $$;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false) \g /dev/null
do $$ begin
  if (select n from public.unread_counts()) <> 1 then raise exception 'Đếm tin chưa đọc sai'; end if;
end $$;
select public.mark_messages_read('11111111-1111-1111-1111-111111111111') \g /dev/null
do $$ begin
  if (select count(*) from public.unread_counts()) <> 0 then raise exception 'Chưa đánh dấu đã đọc'; end if;
  begin update public.messages set body = 'sửa'; raise exception 'LỖI: sửa được tin';
  exception when insufficient_privilege then null; end;
end $$;
-- chống spam: tin thứ 16 trong 1 phút bị chặn
do $$ begin
  for i in 1..15 loop insert into public.messages (sender, recipient, body) values ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'spam ' || i); end loop;
  begin insert into public.messages (sender, recipient, body) values ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'spam 16'); raise exception 'LỖI: không chặn spam';
  exception when raise_exception then if sqlerrm like 'LỖI%' then raise; end if; end;
end $$;
reset role;
select 'DB MESSAGES TEST OK' as result;

-- ================= Chat thế giới =================
set role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false) \g /dev/null
insert into public.world_messages (user_id, name, body) values ('22222222-2222-2222-2222-222222222222', 'ADMIN GIẢ', 'Xin chào cả server!');
do $$ begin
  if (select name from public.world_messages) <> 'Bình' then raise exception 'Tên phải lấy từ hồ sơ, không giả danh được'; end if;
  begin insert into public.world_messages (user_id, body) values ('11111111-1111-1111-1111-111111111111', 'giả'); raise exception 'LỖI: chat giả danh';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false) \g /dev/null
do $$ begin
  if (select count(*) from public.world_messages) <> 1 then raise exception 'Người khác không đọc được chat thế giới'; end if;
end $$;
reset role;
set role anon;
do $$ begin
  begin perform 1 from public.world_messages; raise exception 'LỖI: khách đọc được';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'DB WORLD CHAT TEST OK' as result;

-- ================= Chặn ghi đè tiến trình =================
insert into public.player_saves (user_id, save, save_version, player_id, level)
values ('33333333-3333-3333-3333-333333333333', '{"version":8,"stats":{"totalCaught":300}}', 8, 'p_old', 11)
on conflict (user_id) do update set save = excluded.save, player_id = excluded.player_id, level = excluded.level;
set role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false) \g /dev/null
do $$ begin
  begin update public.player_saves set save = '{"version":8,"stats":{"totalCaught":0}}', player_id = 'p_new', level = 1 where user_id = '33333333-3333-3333-3333-333333333333';
    raise exception 'LỖI: ghi đè được bằng tiến trình mới tinh';
  exception when raise_exception then if sqlerrm like 'LỖI%' then raise; end if; end;
end $$;
-- cùng mã người chơi thì cập nhật bình thường
update public.player_saves set save = '{"version":8,"stats":{"totalCaught":305}}', level = 11 where user_id = '33333333-3333-3333-3333-333333333333';
reset role;
do $$ begin
  if (select player_id from public.player_saves where user_id = '33333333-3333-3333-3333-333333333333') <> 'p_old' then raise exception 'Tiến trình cũ bị mất'; end if;
end $$;
select 'DB SAVE GUARD TEST OK' as result;

-- ================= Quảng Trường =================
set role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false) \g /dev/null
insert into public.plaza_presence (user_id, name, level, x, y, look, emote) values ('22222222-2222-2222-2222-222222222222', 'ADMIN GIẢ', 99, 0.3, 0.6, '{"c":"c_be_tom"}', '👋');
do $$ begin
  if (select name from public.plaza_presence) <> 'Bình' then raise exception 'Tên quảng trường phải lấy từ hồ sơ'; end if;
  if (select level from public.plaza_presence) = 99 then raise exception 'Cấp phải lấy từ hồ sơ'; end if;
  if (select emote_at from public.plaza_presence) is null then raise exception 'Thiếu thời điểm biểu cảm'; end if;
  begin insert into public.plaza_presence (user_id) values ('11111111-1111-1111-1111-111111111111'); raise exception 'LỖI: đứng hộ người khác';
  exception when insufficient_privilege then null; end;
  begin update public.plaza_presence set x = 5 where user_id = '22222222-2222-2222-2222-222222222222'; raise exception 'LỖI: ra ngoài quảng trường';
  exception when check_violation then null; end;
end $$;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false) \g /dev/null
do $$ begin
  if (select count(*) from public.plaza_presence) <> 1 then raise exception 'Không thấy người khác ở quảng trường'; end if;
  update public.plaza_presence set x = 0.9 where user_id = '22222222-2222-2222-2222-222222222222';
end $$;
reset role;
do $$ begin
  if abs((select x from public.plaza_presence) - 0.3) > 0.01 then raise exception 'LỖI: di chuyển hộ người khác'; end if;
end $$;
set role anon;
do $$ begin
  begin perform 1 from public.plaza_presence; raise exception 'LỖI: khách xem được quảng trường';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'DB PLAZA TEST OK' as result;
