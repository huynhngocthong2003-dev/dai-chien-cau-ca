# PROJECT STATUS

Cập nhật: 2026-11-22 (v0.35.0)

## HERO ARENA (game riêng – `apps/hero-arena`, `packages/hero-arena-core`)
- ✅ 0.3.0: chơi chung thời gian thực (kênh `room`, E2E 2 tab `tests/e2e/hero-arena-mp.mjs` với `?mockroom`), vật thể phá được/công trình, nút quái/phá, tay + vũ khí tách lớp.
- ✅ 0.2.0: 10 lớp × cây tiến hoá (1 → 3 → 9), hồi sinh đầu trận, pixel-art, quà/hòm thư/hướng dẫn.
- 🟡 Hình nhân vật: có ảnh thật cho 45 nút (đủ cây Pháp Sư); các nút còn lại tạm nhuộm màu – chờ chủ dự án gửi thêm ảnh cây tiến hoá cho 9 lớp còn lại.
- Chơi chung chạy trên máy chủ phòng (không có máy chủ riêng): chủ phòng tắt trang là trận dừng. Chưa có: âm thanh. Khung hình trên Chromium headless thấp (~10–20 fps), cần kiểm tra trên máy thật.

## ĐẠI TU (Master Prompt 11 phần – xem docs/GIAI_DOAN_1_BAO_CAO.md)
| GĐ đại tu | Trạng thái |
|---|---|
| 1 – Phân tích & kế hoạch | ✅ Báo cáo `docs/GIAI_DOAN_1_BAO_CAO.md` |
| 2 – 7 nguyên tố & khắc chế | ✅ v0.35.0 (Kim, Mộc, Thủy, Hỏa, Thổ, Bóng Tối, Ánh Sáng; khắc ×1.5/×1.0/×0.75; hệ theo khu câu; khu thứ 7 Vương Quốc Kim Loại; biểu tượng thống nhất) |
| 3 – Chiến đấu 3vs3 theo lượt (máy chủ) | ✅ v0.36.0 (lõi trận + thanh canh lực + kỹ năng + phòng thủ + combo; máy chủ trọng tài `battle`; chế độ luyện tập); v0.36.1 gỡ Đấu Sinh Tử cũ (Q8: bỏ bản cũ) |
| 4 – Nâng cấp Linh Hồn + Ngọc (= Đá Nâng Cấp), phân giải, bán | ⬜ |
| 5 – PvE 50 ải | ⬜ |
| 6 – PvP phòng riêng 30 giây | 🟡 v0.37.0: phòng mã/mời bạn, chọn đội bí mật 30s, trọng tài máy chủ, giao hữu & sinh tử (thua mất cá lực chiến thấp nhất); còn: xếp hạng, xem trận |
| 7 – Giao diện & hiệu ứng | ⬜ |
| 8 – Kiểm thử & nghiệm thu | ⬜ |


| Giai đoạn | Trạng thái |
|---|---|
| 0 – Thiết kế & khởi tạo | ✅ Hoàn thành |
| 1 – Gameplay MVP | ✅ Hoàn thành (chơi đơn, lưu đám mây tạm thời qua Artifact) |
| 2 – Phát triển nhân vật | ✅ Hoàn thành phần cốt lõi (nâng cấp, đột phá, thức tỉnh, tiến hóa cần & cá, săn Boss). Còn lại: phụ kiện, trang phục, skin cần, hợp thể cần |
| 3 – Kinh tế | ✅ Cửa hàng, trang phục, kim cương, vòng quay, nhiệm vụ ngày, điểm danh, danh hiệu/thành tựu. Còn: nạp tiền thật (chờ chủ dự án chọn cách xác nhận thanh toán) |
| 4 – Multiplayer | ⏳ Tài khoản online, hồ sơ, bạn bè, **Đấu Sinh Tử người–người do máy chủ tính** (Edge Function). Còn: Colyseus thời gian thực, giao dịch đồ |
| 5 – Cộng đồng | ✅ Hồ sơ, bạn bè, Hội, Bảng Xếp Hạng + danh hiệu Top, nhắn tin, Chat Thế Giới, **Quảng Trường** (đi lại, chat bong bóng, biểu cảm, khoe cá) |
| 6 – Phát hành | ⬜ |

## Đã kiểm thử
- v0.19.0: 126 unit test (thêm: kiểu vùng vẫy, báo hiệu, né nhảy, combo, sự kiện quăng cần, di chuyển & khoe cá ở Quảng Trường); DB test Quảng Trường (RLS, không giả danh, không đứng/di chuyển hộ); E2E Quảng Trường (thấy người khác, bong bóng chat, bấm nền/phím/cần điều khiển, biểu cảm, chat, rời đi) + toàn bộ E2E cũ.
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
