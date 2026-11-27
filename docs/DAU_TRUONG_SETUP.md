# Đấu Trường Quả Cầu Anime – bật tài khoản, hòm thư & app quản trị trên Supabase

Workflow `Deploy Supabase` **bỏ qua** khi repo chưa có khóa bí mật `SUPABASE_ACCESS_TOKEN` và `SUPABASE_DB_PASSWORD`,
nên các migration của Đấu Trường cần chạy tay trong Supabase (giống `docs/ACCOUNTS_SETUP.md`). Mỗi file chỉ chạy **một lần**,
đúng thứ tự; chạy lại cũng không sao (file viết an toàn khi chạy lại).

1. Vào Supabase → dự án của game → menu trái **SQL Editor** → **New query**.
2. Mở `supabase/migrations/20261215000001_orb_accounts.sql` trong repo, chép toàn bộ, dán vào → **Run**.
   (Tạo bảng `orb_saves`, `orb_save_backups`, hàm lưu tiến độ và sao lưu.)
3. **New query** lần nữa, chép toàn bộ `supabase/migrations/20261216000001_orb_mail_admin.sql` → **Run**.
   (Tự chụp sao lưu toàn bộ người chơi trước, rồi tạo hòm thư `orb_mail` và các hàm quản trị.)
4. Cho tài khoản của bạn quyền quản trị (nếu chưa là admin của game câu cá), thay email rồi **Run**:
   ```sql
   insert into public.admins (user_id) select id from auth.users where email = 'email-cua-ban@vd.com' on conflict do nothing;
   ```
5. Kiểm tra: mở game `/dau-truong/`, đăng nhập → biểu tượng ☁ cạnh ID; mở `/dau-truong/admin.html` → đăng nhập bằng tài khoản admin.

Không file nào ở trên sửa hay xoá bảng của game câu cá.

**Tự động hoá (tuỳ chọn)**: thêm 2 khóa ở GitHub → Settings → Secrets and variables → Actions → *Secrets*:
`SUPABASE_ACCESS_TOKEN` (supabase.com/dashboard/account/tokens) và `SUPABASE_DB_PASSWORD` (mật khẩu database).
Khi đó mỗi lần đưa code lên `main`, migration mới sẽ tự chạy.
