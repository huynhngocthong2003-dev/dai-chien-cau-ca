# Changelog

## [0.3.0] – 2026-11-19 – Thú cưng cute, Cửa Hàng, Tủ Đồ
### Sửa lỗi nghiêm trọng
- Kiểm tra dữ liệu lưu giới hạn mốc thời gian ở 10¹² ms (thời gian thực ~1,79×10¹²) ⇒ mỗi lần tải lại trang, tiến trình bị coi là hỏng và bị tạo mới. Đã sửa giới hạn, thêm test hồi quy dùng thời gian thật, thêm bước tải lại trang vào E2E.
- Khi dữ liệu lưu không đọc được, game giờ cất bản sao lưu (trên máy hoặc đám mây) thay vì ghi đè.
### Thêm
- 12 nhân vật chuyển thành thú chibi cute (gấu, chó, mèo, cáo, gấu mèo, thỏ, chim cánh cụt, rồng con, cáo tuyết, hổ, ếch, gấu trúc) – giữ nguyên tên, kỹ năng, chỉ số.
- Cửa Hàng: 8 mũ, 8 bộ quần áo, 7 trang sức (chỉ số phụ nhỏ, không pay-to-win), 5 vật phẩm (đá, rương đá, vé Boss, linh hồn, vàng); phòng thử đồ xem trước trên nhân vật.
- Tủ Đồ: mặc/tháo đồ cho từng nhân vật, đồ hiện trên hình ở mọi màn; bán lại 50%.
- Kim cương thưởng: +10 mỗi lần lên cấp, +3 khi bắt loài mới lần đầu, +5 khi bắt Boss.
- Chợ Giao Dịch: trang giới thiệu, sẽ mở ở Giai đoạn 4 (cần server để chống gian lận).
- Save phiên bản 3 (tủ đồ, đồ đang mặc) với chuyển đổi tự động.
- Test: 52 unit test, E2E cửa hàng (`tests/e2e/shop.cjs`).

## [0.2.0] – 2026-11-19 – Giai đoạn 2 + nâng cấp đồ họa
### Thêm
- Nguyên liệu mới: Đá Nâng Cấp 🔷, Mảnh Linh Hồn 🔮, Vé Boss 🎫 (rơi khi câu cá theo độ hiếm).
- Nhân vật: nâng cấp (tối đa 60), đột phá ×5 (mở thêm 10 cấp, kỹ năng +10%/lần, hồi chiêu −4%/lần, chỉ số +6%), thức tỉnh (+20% chỉ số, kỹ năng +25%, hồi chiêu −15%, hào quang thường trực).
- Cần câu: nâng cấp, tiến hóa 1–5 sao (+10% chỉ số mỗi sao, mở thêm 10 cấp).
- Cá: cường hóa cấp, tiến hóa 1–5 sao bằng cách hợp cá cùng loài, phân giải lấy nguyên liệu, khóa cá để bảo vệ, chỉ số và lực chiến theo cấp/sao.
- Săn Boss: tốn 1 vé, Boss mạnh hơn 40% nhưng thưởng ×1,5; vé hồi lên 3 mỗi ngày (giờ Việt Nam), nhận thêm khi bắt cá Huyền Thoại/Thần Thoại.
- Dữ liệu lưu phiên bản 2, tự động chuyển đổi save cũ không mất tiến trình.
- Đồ họa: nhân vật cơ bắp cel-shading, mặt quyết chiến, hào quang lửa nhiều lớp; cá có viền sáng, bóng bụng, điểm bóng loáng; mây trôi, tia nắng, ánh lấp lánh mặt nước, viền tối; tàn lửa quanh nhân vật ở sảnh.
- GitHub Actions tự động kiểm thử và đăng web lên GitHub Pages.
- 15 unit test mới (tổng 39), E2E thêm kiểm tra Săn Boss và nguyên liệu rơi.

## [0.1.0] – 2026-11-19 – Giai đoạn 0 + 1
### Thêm
- Monorepo pnpm: `apps/game-client`, `packages/{shared,game-data,game-config,validation}`, tests, docs.
- Logic câu cá tất định (RNG có seed, bước 50 ms): lực căng, độ bền dây, HP cá, khoảng cách, pha vùng vẫy/cuồng nộ, giật sớm, lỡ cá, đứt dây, cá thoát, 10 loại kỹ năng chủ động, 16 loại bị động.
- Dữ liệu: 12 nhân vật, 15 cần câu, 55 loài cá (7 độ hiếm), 6 khu vực có Boss.
- Kinh tế cơ bản: KN/cấp, vàng, bán cá, mua cần/nhân vật, sổ giao dịch, chống nhận trùng.
- Client Phaser 3: sảnh chính, bản đồ, câu cá (hiệu ứng sóng, nước bắn, cá nhảy, dây căng, rung màn hình, hào quang kỹ năng, tia sáng cá hiếm), kho cá, bộ sưu tập, nhân vật, cần câu, cài đặt.
- Mỹ thuật vẽ thủ tục bằng Canvas2D; âm thanh tổng hợp WebAudio.
- Lưu tiến trình: đám mây (Artifact db theo tài khoản) hoặc trình duyệt; kiểm tra schema Zod.
- Bản web công khai qua claude.ai Artifact.
- Unit test (Vitest) + E2E (Playwright).
