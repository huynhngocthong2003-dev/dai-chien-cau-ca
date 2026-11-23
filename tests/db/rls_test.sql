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

-- ================= Đua Cá nhiều người =================
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false) \g /dev/null
select public.race_queue_join('tap_su', '{"name":"ADMIN GIẢ","fishId":"f_ca_ro","stats":{"speed":50}}') \g /dev/null
do $$ begin
  if public.race_find('tap_su') is not null then raise exception 'LỖI: ghép khi chỉ có 1 người'; end if;
end $$;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false) \g /dev/null
select public.race_queue_join('tap_su', '{"fishId":"f_ca_chep"}') \g /dev/null
do $$ begin
  if public.race_queue_count('tap_su') <> 2 then raise exception 'Sai số người chờ'; end if;
  -- vừa đủ 2 người nhưng chưa ai chờ đủ 15 giây → chưa ghép
  if public.race_find('tap_su') is not null then raise exception 'LỖI: ghép quá sớm'; end if;
end $$;
reset role;
update public.race_queue set joined_at = now() - interval '20 seconds' where user_id = '11111111-1111-1111-1111-111111111111';
set role authenticated;
do $$ declare r jsonb; begin
  r := public.race_find('tap_su');
  if r is null then raise exception 'Không ghép được 2 người'; end if;
  if jsonb_array_length(r -> 'members') <> 2 then raise exception 'Phòng phải có 2 người'; end if;
  if (r -> 'members' -> 0 ->> 'user_id') <> '22222222-2222-2222-2222-222222222222' then raise exception 'Người gọi phải ở ô 0'; end if;
  if exists (select 1 from jsonb_array_elements(r -> 'members') m where m -> 'racer' ->> 'name' = 'ADMIN GIẢ') then raise exception 'LỖI: giả danh trong đua'; end if;
  if public.race_queue_count('tap_su') <> 0 then raise exception 'Hàng chờ chưa được dọn'; end if;
end $$;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false) \g /dev/null
do $$ declare r jsonb; begin
  r := public.race_find('tap_su');
  if r is null or jsonb_array_length(r -> 'members') <> 2 then raise exception 'Người được ghép không thấy phòng'; end if;
  update public.race_members set x = 300, lane = 2, finish_ms = 41000 where user_id = '11111111-1111-1111-1111-111111111111';
  update public.race_members set x = 1 where user_id = '22222222-2222-2222-2222-222222222222';
  begin update public.race_members set slot = 4 where user_id = '11111111-1111-1111-1111-111111111111'; raise exception 'LỖI: đổi được ô';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false) \g /dev/null
do $$ begin
  if (select count(*) from public.race_members) <> 0 then raise exception 'LỖI: người ngoài xem được phòng đua'; end if;
end $$;
reset role;
do $$ begin
  if (select x from public.race_members where user_id = '22222222-2222-2222-2222-222222222222') <> 0 then raise exception 'LỖI: sửa vị trí người khác'; end if;
  if (select finish_ms from public.race_members where user_id = '11111111-1111-1111-1111-111111111111') <> 41000 then raise exception 'Không ghi được thời gian về đích'; end if;
end $$;
select 'DB RACE TEST OK' as result;

-- ================= Câu cùng nhau =================
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false) \g /dev/null
do $$ begin
  if public.fishing_join('z_ben_tan_thu', '{"c":"c_be_tom"}') <> 0 then raise exception 'Người đầu phải ở chỗ 0'; end if;
  if public.fishing_join('z_ben_tan_thu', '{"c":"c_be_tom"}') <> 0 then raise exception 'Vào lại phải giữ chỗ cũ'; end if;
end $$;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false) \g /dev/null
do $$ begin
  if public.fishing_join('z_ben_tan_thu', '{}') <> 1 then raise exception 'Người thứ 2 phải ở chỗ 1 (không chồng)'; end if;
  if public.fishing_join('z_vuc_sau', '{}') <> 0 then raise exception 'Đổi khu phải lấy chỗ ở khu mới'; end if;
  if public.fishing_join('z_ben_tan_thu', '{}') <> 1 then raise exception 'Quay lại khu cũ lấy chỗ trống thấp nhất'; end if;
  update public.fishing_presence set state = 'caught', catch = '{"fishId":"f_ca_ro","kg":1.2}' where user_id = '22222222-2222-2222-2222-222222222222';
  if (select catch_at from public.fishing_presence where user_id = '22222222-2222-2222-2222-222222222222') is null then raise exception 'Thiếu thời điểm câu được'; end if;
  if (select name from public.fishing_presence where user_id = '22222222-2222-2222-2222-222222222222') <> 'Bình' then raise exception 'Tên phải lấy từ hồ sơ'; end if;
  begin update public.fishing_presence set spot = 0 where user_id = '22222222-2222-2222-2222-222222222222'; raise exception 'LỖI: tự giành chỗ';
  exception when insufficient_privilege then null; end;
  update public.fishing_presence set state = 'reeling' where user_id = '11111111-1111-1111-1111-111111111111';
end $$;
reset role;
do $$ begin
  if (select state from public.fishing_presence where user_id = '11111111-1111-1111-1111-111111111111') <> 'idle' then raise exception 'LỖI: sửa trạng thái người khác'; end if;
end $$;
-- 6 chỗ đầy → người thứ 7 nhận −1
insert into auth.users (id) select gen_random_uuid() from generate_series(1, 6);
insert into public.fishing_presence (user_id, zone_id, spot)
  select id, 'z_full', (row_number() over ())::int - 1 from (select id from auth.users where id not in (select user_id from public.fishing_presence) and id::text not like '1111%' limit 6) u;
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false) \g /dev/null
do $$ begin
  if public.fishing_join('z_full', '{}') <> -1 then raise exception 'Khu đầy phải trả −1'; end if;
end $$;
reset role;
set role anon;
do $$ begin
  begin perform 1 from public.fishing_presence; raise exception 'LỖI: khách xem được';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'DB FISHING TOGETHER TEST OK' as result;

-- ================= Quản trị: danh sách tài khoản =================
update auth.users set email = 'an@test.vn', email_confirmed_at = now() where id = '11111111-1111-1111-1111-111111111111';
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false) \g /dev/null
do $$ begin
  begin perform * from public.admin_list_users(''); raise exception 'LỖI: người thường xem được danh sách tài khoản';
  exception when raise_exception then if sqlerrm like 'LỖI%' then raise; end if; end;
  begin perform public.admin_user_detail('22222222-2222-2222-2222-222222222222'); raise exception 'LỖI: người thường xem được bản lưu người khác';
  exception when raise_exception then if sqlerrm like 'LỖI%' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false) \g /dev/null
do $$ declare r record; d jsonb; begin
  if (select count(*) from public.admin_list_users('')) < 3 then raise exception 'Quản trị viên phải thấy mọi tài khoản'; end if;
  select * into r from public.admin_list_users('an@test') limit 1;
  if r.user_id <> '11111111-1111-1111-1111-111111111111' or not r.confirmed or r.display_name <> 'An' then raise exception 'Tìm theo email sai: %', r; end if;
  if (select count(*) from public.admin_list_users('Bình')) <> 1 then raise exception 'Tìm theo tên sai'; end if;
  if not (select bool_or(is_admin) from public.admin_list_users('')) then raise exception 'Thiếu cờ quản trị'; end if;
  d := public.admin_user_detail('33333333-3333-3333-3333-333333333333');
  if d -> 'save' is null or jsonb_typeof(d -> 'backups') <> 'array' then raise exception 'Chi tiết tài khoản thiếu dữ liệu: %', d; end if;
end $$;
reset role;
set role anon;
do $$ begin
  begin perform * from public.admin_list_users(''); raise exception 'LỖI: khách gọi được';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'DB ADMIN USERS TEST OK' as result;

-- ================= Bục vinh danh Đua Cá =================
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false) \g /dev/null
do $$ begin
  if public.race_submit_time('tap_su', 45000, 'f_ca_ro', 'c_be_tom', '{}') <> 1 then raise exception 'Người đầu phải hạng 1'; end if;
  perform public.race_submit_time('tap_su', 50000, 'f_ca_ro', 'c_be_tom', '{}'); -- chậm hơn → không ghi đè
  begin perform public.race_submit_time('tap_su', 3000, 'f_ca_ro', 'c_be_tom', '{}'); raise exception 'LỖI: nhận thời gian phi lý';
  exception when raise_exception then if sqlerrm like 'LỖI%' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false) \g /dev/null
do $$ begin
  if public.race_submit_time('tap_su', 40000, 'f_ca_kiem', 'c_ninja', '{"skin":"s_samurai"}') <> 1 then raise exception 'Nhanh hơn phải lên hạng 1'; end if;
end $$;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false) \g /dev/null
do $$ declare t record; begin
  if (select count(*) from public.race_top('tap_su')) <> 2 then raise exception 'Sai số người trên bục'; end if;
  select * into t from public.race_top('tap_su') where rank = 1;
  if t.name <> 'Bình' or t.best_ms <> 40000 then raise exception 'Sai người hạng 1: %', t; end if;
  select * into t from public.race_top('tap_su') where rank = 2;
  if t.best_ms <> 45000 then raise exception 'Thành tích tốt nhất bị ghi đè bằng lần chậm hơn'; end if;
  begin insert into public.race_best (user_id, league, best_ms, fish_id, char_id) values ('33333333-3333-3333-3333-333333333333', 'tap_su', 12000, 'x', 'y'); raise exception 'LỖI: tự ghi kỷ lục';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'DB RACE RECORDS TEST OK' as result;

-- ================= Đua Cá – phòng riêng mời bạn bè =================
delete from public.friendships where least(requester, addressee) = '11111111-1111-1111-1111-111111111111' and greatest(requester, addressee) = '22222222-2222-2222-2222-222222222222';
insert into public.friendships (requester, addressee, status) values ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'accepted');
create temp table _lobby (id bigint, code text);
grant all on _lobby to authenticated;
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false) \g /dev/null
do $$ declare j jsonb; begin
  j := public.race_lobby_create('tap_su', 'nui_lua', '{"fishId":"f_ca_ro"}');
  if j ->> 'code' !~ '^[A-Z0-9]{6}$' then raise exception 'Mã phòng sai: %', j; end if;
  if (j ->> 'map') <> 'nui_lua' or jsonb_array_length(j -> 'members') <> 1 then raise exception 'Phòng mới sai: %', j; end if;
  insert into _lobby values ((j ->> 'lobby_id')::bigint, j ->> 'code');
  begin perform public.race_lobby_start((select id from _lobby)); raise exception 'LỖI: bắt đầu khi chỉ có 1 người';
  exception when raise_exception then if sqlerrm like 'LỖI%' then raise; end if; end;
  perform public.race_lobby_invite((select id from _lobby), '22222222-2222-2222-2222-222222222222');
  begin perform public.race_lobby_invite((select id from _lobby), '33333333-3333-3333-3333-333333333333'); raise exception 'LỖI: mời người không phải bạn';
  exception when raise_exception then if sqlerrm like 'LỖI%' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false) \g /dev/null
do $$ declare j jsonb; begin
  if not exists (select 1 from public.messages where recipient = '22222222-2222-2222-2222-222222222222' and body like '%DCCC-RACE:' || (select code from _lobby) || '%') then raise exception 'Không nhận được lời mời'; end if;
  j := public.race_lobby_join(lower((select code from _lobby)), '{"fishId":"f_ca_kiem"}');
  if jsonb_array_length(j -> 'members') <> 2 then raise exception 'Vào phòng bằng mã thất bại'; end if;
  begin perform public.race_lobby_set((select id from _lobby), 'huyen_thoai', 'random'); raise exception 'LỖI: khách đổi được giải';
  exception when raise_exception then if sqlerrm like 'LỖI%' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false) \g /dev/null
do $$ begin
  begin perform public.race_lobby_start((select id from _lobby)); raise exception 'LỖI: bắt đầu khi khách chưa sẵn sàng';
  exception when raise_exception then if sqlerrm like 'LỖI%' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false) \g /dev/null
select public.race_lobby_ready((select id from _lobby), true, '{"fishId":"f_ca_kiem","stats":{"speed":60}}') \g /dev/null
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false) \g /dev/null
do $$ declare r jsonb; begin
  r := public.race_lobby_start((select id from _lobby));
  if jsonb_array_length(r -> 'members') <> 2 or (r ->> 'map') <> 'nui_lua' then raise exception 'Cuộc đua sai: %', r; end if;
  if (r -> 'members' -> 0 ->> 'user_id') <> '11111111-1111-1111-1111-111111111111' then raise exception 'Chủ phòng phải ở ô 0'; end if;
end $$;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false) \g /dev/null
do $$ declare s jsonb; r jsonb; begin
  s := public.race_lobby_state((select id from _lobby));
  if s ->> 'status' <> 'started' or s ->> 'room_id' is null then raise exception 'Khách không thấy cuộc đua bắt đầu: %', s; end if;
  r := public.race_room_get((s ->> 'room_id')::bigint);
  if r is null or (r -> 'members' -> 1 -> 'racer' ->> 'fishId') <> 'f_ca_kiem' then raise exception 'Khách không lấy được phòng đua: %', r; end if;
end $$;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false) \g /dev/null
do $$ begin
  if public.race_lobby_state((select id from _lobby)) is not null then raise exception 'LỖI: người ngoài xem được phòng'; end if;
end $$;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false) \g /dev/null
select public.race_lobby_leave((select id from _lobby)) \g /dev/null
reset role;
do $$ begin
  if (select status from public.race_lobbies where id = (select id from _lobby)) <> 'closed' then raise exception 'Chủ phòng rời mà phòng chưa đóng'; end if;
end $$;
set role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false) \g /dev/null
do $$ begin
  begin perform public.race_lobby_join((select code from _lobby), '{}'); raise exception 'LỖI: vào được phòng đã đóng';
  exception when raise_exception then if sqlerrm like 'LỖI%' then raise; end if; end;
end $$;
reset role;
select 'DB RACE LOBBY TEST OK' as result;

-- ================= Lời mời đua cá (bảng xác nhận 10 giây) =================
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false) \g /dev/null
do $$ declare j jsonb; begin
  j := public.race_lobby_create('tap_su', 'random', '{"fishId":"f_ca_ro"}');
  delete from _lobby;
  insert into _lobby values ((j ->> 'lobby_id')::bigint, j ->> 'code');
  perform public.race_lobby_invite((select id from _lobby), '22222222-2222-2222-2222-222222222222');
  begin perform public.race_lobby_invite((select id from _lobby), '22222222-2222-2222-2222-222222222222'); raise exception 'LỖI: mời dồn dập';
  exception when raise_exception then if sqlerrm like 'LỖI%' then raise; end if; end;
  if (public.race_lobby_state((select id from _lobby)) -> 'invites' -> 0 ->> 'status') <> 'pending' then raise exception 'Chủ phòng không thấy lời mời đang chờ'; end if;
end $$;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false) \g /dev/null
do $$ begin
  if (select count(*) from public.race_my_invites()) <> 0 then raise exception 'LỖI: người khác thấy lời mời'; end if;
end $$;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false) \g /dev/null
do $$ declare r record; begin
  select * into r from public.race_my_invites() limit 1;
  if r.code <> (select code from _lobby) or r.from_name <> 'An' or r.members <> 1 then raise exception 'Lời mời sai: %', r; end if;
  perform public.race_invite_respond(r.id, false);
  if (select count(*) from public.race_my_invites()) <> 0 then raise exception 'Từ chối rồi vẫn hiện'; end if;
end $$;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false) \g /dev/null
do $$ begin
  if (public.race_lobby_state((select id from _lobby)) -> 'invites' -> 0 ->> 'status') <> 'declined' then raise exception 'Chủ phòng không thấy bị từ chối'; end if;
end $$;
reset role;
update public.race_invites set created_at = now() - interval '20 seconds';
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false) \g /dev/null
select public.race_lobby_invite((select id from _lobby), '22222222-2222-2222-2222-222222222222') \g /dev/null
reset role;
update public.race_invites set created_at = now() - interval '13 seconds' where status = 'pending';
set role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false) \g /dev/null
do $$ begin
  if (select count(*) from public.race_my_invites()) <> 0 then raise exception 'Lời mời quá 12 giây vẫn hiện'; end if;
end $$;
reset role;
select 'DB RACE INVITES TEST OK' as result;

-- ================= Chặn máy cũ ghi đè (cùng mã người chơi) =================
insert into public.player_saves (user_id, save, save_version, player_id, level)
values ('22222222-2222-2222-2222-222222222222', '{"version":8,"stats":{"totalCaught":570},"playerId":"p_same"}', 8, 'p_same', 29)
on conflict (user_id) do update set save = excluded.save, player_id = excluded.player_id, level = excluded.level;
set role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false) \g /dev/null
do $$ begin
  begin update public.player_saves set save = '{"version":8,"stats":{"totalCaught":109},"playerId":"p_same"}', level = 12 where user_id = '22222222-2222-2222-2222-222222222222';
    raise exception 'LỖI: máy cũ ghi đè được tiến trình mới';
  exception when raise_exception then if sqlerrm not like 'STALE_SAVE%' then raise; end if; end;
  -- tiến lên bình thường vẫn được
  update public.player_saves set save = '{"version":8,"stats":{"totalCaught":575},"playerId":"p_same"}', level = 29 where user_id = '22222222-2222-2222-2222-222222222222';
  -- xóa tiến trình (resetAt mới) được phép
  update public.player_saves set save = '{"version":8,"stats":{"totalCaught":0},"playerId":"p_same","resetAt":123}', level = 1 where user_id = '22222222-2222-2222-2222-222222222222';
  -- lưu nhiều lần liên tiếp không bị chặn (lỗi bản guard cũ tự tăng save_version)
  update public.player_saves set save = '{"version":8,"stats":{"totalCaught":3},"playerId":"p_same","resetAt":123}', save_version = 8, level = 1 where user_id = '22222222-2222-2222-2222-222222222222';
  update public.player_saves set save = '{"version":8,"stats":{"totalCaught":4},"playerId":"p_same","resetAt":123}', save_version = 8, level = 2 where user_id = '22222222-2222-2222-2222-222222222222';
  update public.player_saves set save = '{"version":8,"stats":{"totalCaught":9},"playerId":"p_same","resetAt":123}', save_version = 8, level = 3 where user_id = '22222222-2222-2222-2222-222222222222';
  -- máy đang giữ tiến trình của tài khoản KHÁC (playerId khác) → chặn
  begin update public.player_saves set save = '{"version":8,"stats":{"totalCaught":999},"playerId":"p_other","resetAt":123}', level = 40 where user_id = '22222222-2222-2222-2222-222222222222';
    raise exception 'LỖI: ghi đè được tiến trình của tài khoản khác';
  exception when raise_exception then if sqlerrm not like 'STALE_SAVE%' then raise; end if; end;
  -- nạp mã sao lưu (resetAt mới) được phép
  update public.player_saves set save = '{"version":8,"stats":{"totalCaught":50},"playerId":"p_other","resetAt":456}', level = 5 where user_id = '22222222-2222-2222-2222-222222222222';
end $$;
reset role;
do $$ begin
  if (select level from public.player_saves where user_id = '22222222-2222-2222-2222-222222222222') <> 5 then raise exception 'Xóa tiến trình / nạp sao lưu bị chặn nhầm'; end if;
end $$;
select 'DB STALE SAVE GUARD TEST OK' as result;

-- ================= Hòm Thư hệ thống =================
insert into public.system_mail (user_id, title, body) values ('22222222-2222-2222-2222-222222222222', 'Đền bù', 'Thư cho 2222');
insert into public.system_mail (user_id, title, body) values ('33333333-3333-3333-3333-333333333333', 'Riêng', 'Thư cho 3333');
set role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false) \g /dev/null
do $$ declare n int; mid bigint; begin
  select count(*) into n from public.system_mail; if n <> 1 then raise exception 'Thấy thư của người khác (%)', n; end if;
  begin insert into public.system_mail (user_id, title, body) values ('22222222-2222-2222-2222-222222222222', 'x', 'tự gửi'); raise exception 'LỖI: người chơi tự gửi thư được';
  exception when insufficient_privilege then null; end;
  select id into mid from public.system_mail limit 1;
  perform public.mark_mail_read(mid);
  if (select read_at from public.system_mail where id = mid) is null then raise exception 'Không đánh dấu đã đọc được'; end if;
end $$;
reset role;
select 'DB SYSTEM MAIL TEST OK' as result;

-- ================= Quà trong thư =================
insert into public.system_mail (user_id, title, body, rewards) values ('22222222-2222-2222-2222-222222222222', 'Quà', 'Có quà', '{"txId":"mail_t1","gold":100}');
set role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false) \g /dev/null
do $$ declare mid bigint; begin
  select id into mid from public.system_mail where title = 'Quà';
  if mid is not null then raise exception 'Người khác thấy thư có quà'; end if;
end $$;
reset role;
do $$ declare mid bigint; begin
  select id into mid from public.system_mail where title = 'Quà';
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
  perform public.mark_mail_claimed(mid);
  reset role;
  if (select claimed_at from public.system_mail where id = mid) is not null then raise exception 'Người khác đánh dấu nhận hộ được'; end if;
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
  perform public.mark_mail_claimed(mid);
  reset role;
  if (select claimed_at from public.system_mail where id = mid) is null then raise exception 'Chủ thư không đánh dấu nhận được'; end if;
end $$;
select 'DB MAIL REWARD TEST OK' as result;

-- ================= Trận 3vs3 (máy chủ làm trọng tài) =================
insert into public.battles (user_id, mode, ai_level, team, state) values ('22222222-2222-2222-2222-222222222222', 'practice', 'normal', array['a','b','c'], '{"turn":0}');
set role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false) \g /dev/null
do $$ declare n int; begin
  select count(*) into n from public.battles; if n <> 0 then raise exception 'Đọc được trận của người khác'; end if;
end $$;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false) \g /dev/null
do $$ declare n int; begin
  select count(*) into n from public.battles; if n <> 1 then raise exception 'Không đọc được trận của mình'; end if;
  begin update public.battles set winner = 0; raise exception 'LỖI: người chơi tự sửa kết quả trận được';
  exception when insufficient_privilege then null; end;
  begin insert into public.battles (user_id, mode, team, state) values ('22222222-2222-2222-2222-222222222222', 'practice', array['a','b','c'], '{}'); raise exception 'LỖI: người chơi tự tạo trận được';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'DB BATTLES TEST OK' as result;
