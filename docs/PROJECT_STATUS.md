# PROJECT STATUS

Cập nhật: 2026-11-19

| Giai đoạn | Trạng thái |
|---|---|
| 0 – Thiết kế & khởi tạo | ✅ Hoàn thành |
| 1 – Gameplay MVP | ✅ Hoàn thành (chơi đơn, lưu đám mây tạm thời qua Artifact) |
| 2 – Phát triển nhân vật | ✅ Hoàn thành phần cốt lõi (nâng cấp, đột phá, thức tỉnh, tiến hóa cần & cá, săn Boss). Còn lại: phụ kiện, trang phục, skin cần, hợp thể cần |
| 3 – Kinh tế | ⬜ |
| 4 – Multiplayer | ⬜ |
| 5 – Cộng đồng | ⬜ |
| 6 – Phát hành | ⬜ |

## Đã kiểm thử
- 39 unit test (phát triển nhân vật/cần/cá, vé Boss, chuyển đổi save v1→v2, dữ liệu, tính tất định, cân bằng bằng bot mô phỏng, kinh tế, chống nhận trùng, schema save).
- E2E Playwright: chơi 1 ván bằng chuột (quăng → giật → kéo → kỹ năng → bắt cá) → lưu kho → bán cá → các màn hình → Săn Boss (Boss chắc chắn cắn, trừ đúng 1 vé) → hiển thị điện thoại ngang. Chạy trên bản dev, bản 1 file và bản GitHub Pages. Chạy trên cả bản dev và bản build 1 file. Không lỗi console.
- `pnpm typecheck`, `pnpm lint` sạch.

## Vấn đề đã biết
- Trên điện thoại màn hình nhỏ, chữ phụ khá nhỏ do co giãn toàn khung 1280×720 (sẽ tối ưu ở GĐ6).
- Lưu đám mây chỉ hoạt động cho người xem đã đăng nhập claude.ai và có quyền Contributor trở lên; khách xem qua link công khai lưu trên trình duyệt.
- Tiến trình do client ghi → chưa chống gian lận (sẽ giải quyết ở GĐ4).
- Chưa có nhạc nền.
- Chưa chạy thử trên thiết bị Android/iOS thật.
- Web độc lập (GitHub Pages) đã có quy trình tự động nhưng chưa đăng được: cần chủ dự án tạo repository và cấp quyền GitHub.
- Trên web độc lập (ngoài claude.ai) tiến trình chỉ lưu trên trình duyệt cho đến khi có Supabase (GĐ4).
- Cân bằng kinh tế Giai đoạn 2 mới kiểm bằng test, cần chơi thử dài để tinh chỉnh tốc độ kiếm Đá/Linh Hồn.
