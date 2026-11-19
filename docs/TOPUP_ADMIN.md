# Nạp tiền – hướng dẫn cho chủ game (cách A: tự duyệt)

## Người chơi nạp thế nào
1. Đăng nhập tài khoản online → bấm ô **💎** trên thanh trên cùng → chọn gói:
   - 100 Kim Cương – 20.000đ · 300 Kim Cương – 50.000đ · Câu Tự Động 2 ngày – 20.000đ
2. Game tạo **mã QR VietQR** (ACB 13152551 – HUYNH NGOC THONG) đã điền sẵn số tiền và **nội dung** dạng `DCCCxxxxxx`.
3. Người chơi chuyển khoản, chờ duyệt, rồi bấm **Kiểm tra & nhận** (hoặc mở lại game – game tự nhận).

## Bật quyền duyệt cho bạn (làm 1 lần)
Cần database đã được triển khai (2 secret GitHub `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` → Actions → Deploy Supabase).
Sau đó vào **Supabase → SQL Editor → New query**, dán (thay email bằng email tài khoản game của bạn) rồi bấm **Run**:

```sql
insert into public.admins (user_id) select id from auth.users where email = 'EMAIL-TAI-KHOAN-GAME-CUA-BAN';
```

## Duyệt lệnh
1. Mở game bằng tài khoản quản trị → ô 💎 → nút **🛠 Duyệt nạp**.
2. So với sao kê ACB: **đúng số tiền + đúng nội dung `DCCC…`** → bấm **✅ Duyệt** 2 lần. Sai/không thấy tiền → **✖ Từ chối**.
3. Mỗi lệnh chỉ được nhận đúng 1 lần (máy chủ đánh dấu), người chơi không tự duyệt được.

## Lưu ý
- Không duyệt khi chưa thấy tiền trong sao kê.
- Kinh doanh vật phẩm game bằng tiền thật ở Việt Nam thường cần giấy phép phát hành game (G1) – nên tìm hiểu trước khi mở rộng.
- Sau này có thể chuyển sang tự động (SePay/Casso) mà không đổi giao diện người chơi.
