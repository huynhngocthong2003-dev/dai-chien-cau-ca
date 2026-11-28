# Đấu Trường Quả Cầu Anime – bật tài khoản, hòm thư & app quản trị trên Supabase

Workflow `Deploy Supabase` **bỏ qua** khi repo chưa có khóa bí mật `SUPABASE_ACCESS_TOKEN` và `SUPABASE_DB_PASSWORD`,
nên các migration của Đấu Trường cần chạy tay trong Supabase (giống `docs/ACCOUNTS_SETUP.md`). Mỗi file chỉ chạy **một lần**,
đúng thứ tự; chạy lại cũng không sao (file viết an toàn khi chạy lại).

1. Vào Supabase → dự án của game → menu trái **SQL Editor** → **New query**.
2. Mở file **`supabase/dau-truong-setup.sql`** trong repo (đã gộp sẵn 2 migration), chép toàn bộ, dán vào → **Run**.
   (Tạo bảng `orb_saves`, `orb_save_backups` (lưu tiến độ + sao lưu), hòm thư `orb_mail` và các hàm quản trị.)
   Hoặc chạy lần lượt 2 file gốc `supabase/migrations/20261215000001_orb_accounts.sql` rồi `20261216000001_orb_mail_admin.sql`.
3. Cho tài khoản của bạn quyền quản trị (nếu chưa là admin của game câu cá), thay email rồi **Run**:
   ```sql
   insert into public.admins (user_id) select id from auth.users where email = 'email-cua-ban@vd.com' on conflict do nothing;
   ```
4. Kiểm tra: mở game `/dau-truong/`, đăng nhập → biểu tượng ☁ cạnh ID; mở `/dau-truong/admin.html` → đăng nhập bằng tài khoản admin.

5. **Bật Đấu Xếp Hạng** (sau bước 2): New query → chép toàn bộ file **`supabase/dau-truong-xep-hang.sql`** → **Run**.
   (Giống file gốc `supabase/migrations/20261217000001_orb_ranked.sql`; tự chụp bản sao lưu tất cả người chơi trước khi chạy.)
   Tạo bảng hạng `orb_rank`, trận `orb_ranked_matches`, lịch sử `orb_rank_history`, cấu hình `orb_ranked_config` và các hàm tính điểm.
   Kiểm tra: mở game → ⚔ Phòng đấu → thẻ **🏆 Đấu Xếp Hạng** hiện "Đang phân hạng · 0 RP" (thay vì "Máy chủ chưa bật Xếp Hạng").

### Chỉnh Đấu Xếp Hạng (tuỳ chọn, trong SQL Editor)
- Đổi mùa: `update public.orb_ranked_config set season = 2, season_name = 'Mùa 2';` (mọi người bắt đầu lại 0 RP, bảng mùa cũ vẫn giữ).
- Điều kiện mở (mặc định cấp 5, 5 quả cầu, 10 trận): `update public.orb_ranked_config set min_level = 3, min_owned = 3, min_matches = 5;`
- Điểm thắng/thua: các cột `win_even` (25), `loss_even` (20), `placement_games` (5), `tier_shield` (3).

Không file nào ở trên sửa hay xoá bảng của game câu cá.

**Tự động hoá (tuỳ chọn)**: thêm 2 khóa ở GitHub → Settings → Secrets and variables → Actions → *Secrets*:
`SUPABASE_ACCESS_TOKEN` (supabase.com/dashboard/account/tokens) và `SUPABASE_DB_PASSWORD` (mật khẩu database).
Khi đó mỗi lần đưa code lên `main`, migration mới sẽ tự chạy.
