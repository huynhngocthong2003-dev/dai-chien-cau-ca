# Changelog

## [0.7.0] – 2026-11-19 – Môi trường, bục câu, thoại bựa, giao diện mới
### Thêm
- **Rác dưới nước** (12% mỗi lần câu): chai nhựa, bọc nilông, dép, lon nước, lưới rách – kèm lời nhắn "♻ Mọi người hãy tái chế để bảo vệ môi trường nhé!".
- **Tái chế** rác thành 🌿 Điểm Môi Trường; đổi **Bộ Bảo Vệ Môi Trường màu xanh lá** (mũ, áo, khăn, cánh) trong Cửa Hàng → tab ♻ Môi Trường.
- **Bục câu theo khu**, càng về sau càng xịn: gỗ → tre nhiệt đới → đá pha lê → hắc thạch dung nham → băng → cẩm thạch vàng nạm ngọc.
- **Thoại bựa**: khi cá cắn (rác / cá nhỏ / cá to – Boss / troll), khi tung kỹ năng (theo từng nhân vật và theo nhóm kỹ năng), câu khoe cá có tên + cân nặng; hiện 40–60% số lần, tránh lặp.
- **Hiệu ứng kỹ năng bùng nổ**: bong bóng thoại, rung + phóng to giật, vệt tốc độ, sóng xung kích, sét đánh, nổ hạt, chữ tượng thanh, sao choáng, băng, lửa, nốt nhạc.
- **Sự kiện Tân Thủ**: nhận 500 kim cương (một lần mỗi tài khoản).
- **Giao diện**: nền đáy biển cho các màn menu, nút sảnh dùng hình vẽ của game, thẻ nhân vật / cần câu chuyển màu theo độ hiếm, thẻ UR/LR phát sáng.
- Space / Enter để "Câu tiếp".
### Sửa
- Tỉ lệ cá: Cá Chép Hóa Rồng (Sử Thi) ở Bến Câu Tân Thủ ra 1,2% (ít hơn cả Boss 2,2%) → nay ~3,7%, Boss 1,6%. Test bắt buộc thứ tự độ hiếm ở mọi khu.
- Điện thoại / mở dạng ứng dụng: khung game tràn màn hình, mất nút quay lại → nằm trong vùng an toàn và tự đo lại kích thước.
- Save phiên bản 5 (rác, điểm môi trường, sự kiện đã nhận) có chuyển đổi tự động.

## [0.6.1] – 2026-11-19
### Thêm
- Mã quà tặng tiền tệ: `kimcuong2000` nhận 2.000 kim cương (một lần mỗi tài khoản, ghi sổ giao dịch).

## [0.6.0] – 2026-11-19 – Thời trang 5 bậc, cánh & sừng, chọn nhiều để bán
### Thêm
- **Kho Cá – Chọn nhiều**: ô tích ✓ trên từng con cá, Chọn cả trang / Chọn tất cả / Chọn cá Thường / Bỏ chọn, xem tổng vàng và nguyên liệu, Bán hoặc Phân giải hàng loạt (xác nhận 2 lần nếu có cá quý / đã nâng cấp; cá khóa không chọn được).
- **5 bậc thời trang**: Thường, Hiếm, Cực Phẩm, Huyền Thoại, Thần Phẩm. Bậc càng cao càng nhiều chỉ số phụ (có trần theo bậc) và hiệu ứng: Cực Phẩm phát sáng; Huyền Thoại thêm lấp lánh bay lên; Thần Phẩm thêm hạt cầu vồng và quả cầu ánh sáng bay vòng quanh.
- **Ô trang bị Cánh** (Gà Con, Bướm Pha Lê, Thiên Thần, Ác Ma, Phượng Hoàng Thần, Long Thần) và **Sừng** (Quỷ Nhỏ, Kỳ Lân, Rồng Vàng, Hào Quang Thánh, Thần Sấm).
- Đồ Thần Phẩm cho mũ / áo / trang sức: Vương Miện Thần Thánh, Thần Giáp Cửu Long, Ngọc Bội Thần Hải.
- Cửa Hàng 7 tab, lưới 5 cột, nhãn bậc có màu; Tủ Đồ 5 hàng; hiệu ứng thời trang ở sảnh, cảnh câu, màn Nhân Vật.
### Sửa
- Kính Râm (Hiếm) giảm từ +8% xuống +5% cho đúng trần bậc Hiếm.

## [0.5.0] – 2026-11-19 – Tài khoản, sao lưu, cần siêu cấp, toàn màn hình
### Thêm
- **Tài khoản online** (Supabase Auth): tạo tài khoản / đăng nhập bằng email + mật khẩu, tự đồng bộ tiến trình, giữ đăng nhập khi tải lại, đăng xuất. Bật bằng 2 biến `SUPABASE_URL`, `SUPABASE_ANON_KEY` (xem `docs/ACCOUNTS_SETUP.md`).
- Database: `profiles`, `player_saves`, `player_save_backups` với RLS (mỗi người chỉ thấy dữ liệu của mình), máy chủ tự sao lưu lịch sử 30 bản. Kiểm thử trên PostgreSQL thật: `pnpm test:db`.
- **Sao lưu bằng mã**: tạo mã chứa toàn bộ tiến trình (nén gzip + tổng kiểm tra), dán vào máy khác để khôi phục; bản cũ được cất trước khi thay.
- Màn **Tài Khoản** (bấm avatar góc trái hoặc Cài Đặt → Tài khoản).
- **Cần Huyết Ma Long** (LR, đỏ đen): mạnh nhất game, đầu cần mắt rồng huyết ngọc, cánh dơi, vân sét đỏ, khói và tàn lửa; nhận bằng mã quà `ruby2602`.
- **Nút toàn màn hình ⛶** trên thanh trên cùng; hỗ trợ "Thêm vào Màn hình chính" (manifest, biểu tượng, mở toàn màn hình nằm ngang).
### Sửa
- Ô đổi tên / nhập mã bị lệch hoặc không hiện trên điện thoại: thay bằng lớp phủ HTML tự canh theo khung game, cho phép gõ chữ trên iOS/Android.
- Thanh trên cùng cập nhật trạng thái lưu sau khi đăng nhập.
### Kiểm thử
- 67 unit test, test database RLS, E2E: câu cá, cửa hàng, mã quà, tài khoản (máy chủ giả) + sao lưu mã, điện thoại cảm ứng.

## [0.4.0] – 2026-11-19 – Nhân vật LR, mã quà tặng, cần câu mới
### Thêm
- Bậc độ hiếm mới **LR** (trên UR) với 2 nhân vật mạnh nhất game, nhận bằng mã quà tặng:
  - **Kim Kê** – Gà Thần Bình Minh: kỹ năng "Bình Minh Rực Lửa" (35% HP + thiêu đốt 8%/giây + tăng tốc thu dây 80%), bị động +40 may mắn, chí mạng 25% x3, +30% KN, +20% vàng.
  - **Lam Ngọc Hầu** – Hầu Vương Sapphire: kỹ năng "Thiên Biến Vạn Hóa" (choáng 3 giây, sát thương x2, kéo cá lại 40, giảm 60 lực căng), bị động giảm vùng vẫy 30%, +40% sát thương Boss.
- Hệ thống mã quà tặng (Cài Đặt → 🎁 Mã quà, hoặc nút trên thẻ nhân vật): chỉ lưu mã băm, mỗi mã dùng một lần/tài khoản, màn chào mừng nhân vật mới. Save phiên bản 4.
- Cần câu vẽ lại: thân thon có gradient, quấn chỉ, khoen dẫn dây, tay cầm nút bần, guồng có tay quay, 10 kiểu trang trí đầu cần (quả cầu thiên hà, đinh ba, sao, lông phượng, lửa, pha lê, tia sét, san hô, bóng tối, nanh rồng); cần hiếm phát sáng và tỏa hạt khi câu.
- Test: 58 unit test (gồm kiểm tra mã gốc không có trong mã nguồn), E2E mã quà tặng.

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
