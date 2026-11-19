# PROJECT STATUS

Cập nhật: 2026-11-19 (v0.13.0)

| Giai đoạn | Trạng thái |
|---|---|
| 0 – Thiết kế & khởi tạo | ✅ Hoàn thành |
| 1 – Gameplay MVP | ✅ Hoàn thành (chơi đơn, lưu đám mây tạm thời qua Artifact) |
| 2 – Phát triển nhân vật | ✅ Hoàn thành phần cốt lõi (nâng cấp, đột phá, thức tỉnh, tiến hóa cần & cá, săn Boss). Còn lại: phụ kiện, trang phục, skin cần, hợp thể cần |
| 3 – Kinh tế | ✅ Cửa hàng, trang phục, kim cương, vòng quay, nhiệm vụ ngày, điểm danh, danh hiệu/thành tựu. Còn: nạp tiền thật (chờ chủ dự án chọn cách xác nhận thanh toán) |
| 4 – Multiplayer | ⏳ Tài khoản online, hồ sơ, bạn bè, **Đấu Sinh Tử người–người do máy chủ tính** (Edge Function). Còn: Colyseus thời gian thực, giao dịch đồ |
| 5 – Cộng đồng | ✅ Hồ sơ, bạn bè, Hội, Bảng Xếp Hạng + danh hiệu Top (cần triển khai database bằng 2 secret GitHub) |
| 6 – Phát hành | ⬜ |

## Đã kiểm thử
- 97 unit test (thêm: cơ chế trận đấu, Đấu Sinh Tử, cá nướng → KN nhân vật, PvP áp dụng 1 lần, thể đột biến chỉ cho Boss với tỉ lệ ẩn)
- E2E Đấu Sinh Tử: đột biến Boss, chọn đội, đấu máy, thắng/thua, cho nhân vật ăn cá nướng, trưng bày.
- DB test: RLS hồ sơ/bạn bè/PvP trên PostgreSQL 16.
- (cũ) 52 unit test (cửa hàng, tủ đồ, kim cương thưởng, hồi quy lưu/tải lại với thời gian thật, phát triển nhân vật/cần/cá, vé Boss, chuyển đổi save v1→v2, dữ liệu, tính tất định, cân bằng bằng bot mô phỏng, kinh tế, chống nhận trùng, schema save).
- E2E Playwright: chơi 1 ván bằng chuột (quăng → giật → kéo → kỹ năng → bắt cá) → lưu kho → bán cá → các màn hình → Săn Boss (Boss chắc chắn cắn, trừ đúng 1 vé) → hiển thị điện thoại ngang. Chạy trên bản dev, bản 1 file và bản GitHub Pages. Chạy trên cả bản dev và bản build 1 file. Không lỗi console.
- `pnpm typecheck`, `pnpm lint` sạch.

## Vấn đề đã biết
- Trên điện thoại màn hình nhỏ, chữ phụ khá nhỏ do co giãn toàn khung 1280×720 (sẽ tối ưu ở GĐ6).
- Lưu đám mây chỉ hoạt động cho người xem đã đăng nhập claude.ai và có quyền Contributor trở lên; khách xem qua link công khai lưu trên trình duyệt.
- Tiến trình do client ghi → chưa chống gian lận hoàn toàn. Trận PvP do máy chủ tính nhưng dựa trên save do client ghi.
- Database + Edge Function đã triển khai thủ công qua Supabase Management API (2026-11-19). Lần sau có thể tự động bằng secret GitHub `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`.
- Chưa chạy thử trên thiết bị Android/iOS thật.
- Web độc lập (GitHub Pages) đã có quy trình tự động nhưng chưa đăng được: cần chủ dự án tạo repository và cấp quyền GitHub.
- Trên web độc lập (ngoài claude.ai) tiến trình chỉ lưu trên trình duyệt cho đến khi có Supabase (GĐ4).
- Cân bằng kinh tế Giai đoạn 2 mới kiểm bằng test, cần chơi thử dài để tinh chỉnh tốc độ kiếm Đá/Linh Hồn.
- Giao dịch quần áo/trang sức giữa người chơi chờ Giai đoạn 4 (cần server). Hiện chỉ bán lại cho cửa hàng.
- Tiến trình chơi trước bản 0.3.0 có thể đã bị tạo mới khi tải lại trang (lỗi đã sửa).
- Tài khoản online chưa chạy trên web thật cho đến khi có dự án Supabase (xem docs/ACCOUNTS_SETUP.md). Đã kiểm thử bằng máy chủ giả và PostgreSQL thật.
- iPhone Safari không hỗ trợ nút toàn màn hình cho trang web: dùng "Thêm vào MH chính".
