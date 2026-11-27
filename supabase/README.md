# Supabase (Giai đoạn 4)

Migrations và Edge Functions sẽ được thêm ở Giai đoạn 4 và chạy thử trên Postgres thật trước khi đánh dấu hoàn thành. Schema dự kiến: docs/TECHNICAL_ARCHITECTURE.md §5.

## Đấu Trường Quả Cầu Anime (`/dau-truong/`) – sao lưu dữ liệu người chơi

Bảng `orb_saves` (1 bản lưu / tài khoản) và `orb_save_backups` (sao lưu nằm **trong database**, không xuất ra GitHub vì repo công khai):

| Loại | Khi nào | Giữ |
|---|---|---|
| `auto` | bản cũ trước khi ghi đè, ≤ 1 bản / 10 phút | 20 bản mới nhất |
| `daily` | lần ghi đầu tiên mỗi ngày | 30 ngày |
| `snapshot:<lý do>` | admin chụp toàn bộ người chơi | 180 ngày |
| `before_restore` | trước khi admin khôi phục | 180 ngày |

Trình duyệt cũng giữ 3 bản gần nhất (`anime_orb_arena_local_backup_v1`) và tiến độ Khách (`anime_orb_arena_guest_v1`).

**Quy tắc khi nâng cấp**: mọi migration sau này có đụng tới dữ liệu `orb_*` phải chạy chụp toàn bộ ở đầu file, ví dụ
`select public.orb_snapshot_all('truoc_20261216');` (chạy được trong migration vì dùng quyền chủ database).

Công cụ admin (tài khoản có trong bảng `admins`, gọi trong SQL Editor hoặc RPC):
- `select public.orb_snapshot_all('ly_do');` – chụp toàn bộ, trả về số bản.
- `select * from public.orb_admin_backups(null, '#ABCDEF');` – xem các bản sao lưu của một người chơi (vàng, số trận, số bóng).
- `select public.orb_admin_restore(<id bản sao lưu>);` – khôi phục (bản hiện tại được cất lại trước; máy người chơi tự tải bản mới).
