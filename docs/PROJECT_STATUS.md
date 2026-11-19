# PROJECT STATUS

Cập nhật: 2026-11-19

| Giai đoạn | Trạng thái |
|---|---|
| 0 – Thiết kế & khởi tạo | ✅ Hoàn thành |
| 1 – Gameplay MVP | ✅ Hoàn thành (chơi đơn, lưu đám mây tạm thời qua Artifact) |
| 2 – Phát triển nhân vật | ⏳ Dữ liệu 12/15/55 đã có; chưa có nâng cấp/tiến hóa/săn Boss |
| 3 – Kinh tế | ⬜ |
| 4 – Multiplayer | ⬜ |
| 5 – Cộng đồng | ⬜ |
| 6 – Phát hành | ⬜ |

## Đã kiểm thử
- 24 unit test (dữ liệu, tính tất định, cân bằng bằng bot mô phỏng, kinh tế, chống nhận trùng, schema save).
- E2E Playwright: chơi 1 ván bằng chuột (quăng → giật → kéo → kỹ năng → bắt cá) → lưu kho → bán cá → các màn hình → hiển thị điện thoại ngang. Chạy trên cả bản dev và bản build 1 file. Không lỗi console.
- `pnpm typecheck`, `pnpm lint` sạch.

## Vấn đề đã biết
- Trên điện thoại màn hình nhỏ, chữ phụ khá nhỏ do co giãn toàn khung 1280×720 (sẽ tối ưu ở GĐ6).
- Lưu đám mây chỉ hoạt động cho người xem đã đăng nhập claude.ai và có quyền Contributor trở lên; khách xem qua link công khai lưu trên trình duyệt.
- Tiến trình do client ghi → chưa chống gian lận (sẽ giải quyết ở GĐ4).
- Chưa có nhạc nền.
- Chưa chạy thử trên thiết bị Android/iOS thật.
