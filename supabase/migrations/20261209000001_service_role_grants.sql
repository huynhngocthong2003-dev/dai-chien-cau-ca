-- Hàm máy chủ (battle, pvp, death-match) dùng service_role để đọc bản lưu và ghi trận.
-- Dự án được tạo không kèm quyền mặc định của service_role trên schema public
-- → "permission denied for table player_saves", không mở được trận nào.
-- service_role chỉ dùng trong Edge Function (không bao giờ ở trình duyệt).
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
