# Bật tài khoản online (Supabase) – hướng dẫn từng bước

Làm một lần, khoảng 10 phút, miễn phí. Sau đó người chơi tạo tài khoản bằng email + mật khẩu
và tiến trình tự đồng bộ trên mọi thiết bị.

## 1. Tạo dự án Supabase
1. Vào https://supabase.com → **Start your project** → đăng nhập bằng GitHub.
2. **New project**: đặt tên `dai-chien-cau-ca`, đặt mật khẩu database (lưu lại riêng, KHÔNG gửi cho ai),
   chọn Region **Southeast Asia (Singapore)** → **Create new project**. Chờ 1–2 phút.

## 2. Tạo bảng dữ liệu
1. Menu trái → **SQL Editor** → **New query**.
2. Mở file `supabase/migrations/20261119000001_accounts_and_saves.sql` trong repo, chép toàn bộ, dán vào → **Run**.
   Kết quả "Success. No rows returned" là đúng.

## 3. (Khuyên dùng) Cho phép chơi ngay không cần xác nhận email
**Authentication → Sign In / Providers → Email** → tắt **Confirm email** → Save.
(Nếu để bật, người chơi phải bấm link trong email trước khi đăng nhập.)

## 4. Lấy 2 thông số công khai
**Project Settings → API** (hoặc **Data API**):
- **Project URL** – dạng `https://xxxx.supabase.co`
- **anon public key** (hoặc **Publishable key**) – chuỗi dài.

Hai thông số này là **công khai**, được phép nằm trong game (dữ liệu được bảo vệ bằng RLS).
**TUYỆT ĐỐI KHÔNG** dùng hay gửi `service_role key` / `secret key`.

## 5. Gắn vào web GitHub Pages
Repo GitHub → **Settings → Secrets and variables → Actions → tab Variables → New repository variable**:
- `SUPABASE_URL` = Project URL
- `SUPABASE_ANON_KEY` = anon public key

Sau đó **Actions → Deploy web game → Run workflow** (hoặc nhờ Claude đẩy một bản cập nhật).
Mở game → bấm avatar góc trái → mục **Tài khoản online** sẽ có ô Email / Mật khẩu.

## Bảo mật đã có
- Row Level Security: mỗi người chỉ đọc/ghi bản lưu của chính mình; khách chưa đăng nhập không đọc được gì.
- Máy chủ tự sao lưu lịch sử (tối đa 1 bản / 10 phút, giữ 30 bản) trong bảng `player_save_backups`.
- Kiểm thử: `pnpm test:db` chạy migration trên PostgreSQL thật và kiểm tra các quy tắc trên.

## Giới hạn hiện tại (sẽ xử lý ở Giai đoạn 4)
Người chơi vẫn tự ghi bản lưu của mình (qua RLS) nên về lý thuyết có thể sửa dữ liệu của chính họ.
Giai đoạn 4 chuyển việc cấp thưởng/tiền tệ lên server có thẩm quyền.
