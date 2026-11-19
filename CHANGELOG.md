# Changelog

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
