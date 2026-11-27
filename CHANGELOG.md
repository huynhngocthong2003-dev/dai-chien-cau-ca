# Changelog

## [Đấu Trường Quả Cầu Anime – giữ màn hình sáng] – 2026-11-27
- Điện thoại không còn tự tắt màn hình giữa trận (trận tự đánh, người chơi không chạm): dùng **Screen Wake Lock** khi đang mở game, tự xin lại khi quay lại tab / sau lần chạm đầu. Công tắc **☀ Giữ màn hình sáng khi chơi** trong Cài đặt (mặc định bật, lưu theo tài khoản). Trình duyệt chưa hỗ trợ → hiện hướng dẫn tăng "Tự động khóa".

## [Đấu Trường Quả Cầu Anime – 15 bóng hoạt hình & quà tân thủ] – 2026-11-27
- **15 quả bóng hoạt hình** (tên riêng, nhân vật gốc ghi ở mục "Cảm hứng"; hình chibi tự vẽ, không dùng hình gốc) – tổng **45 quả**:
  - S: Mèo Máy Bảo Bối (bảo bối ngẫu nhiên: Cánh Cửa Thần Kỳ / Chong Chóng Tre / Đèn Pin Thu Nhỏ) · Tề Thiên Đại Thánh (3 phân thân + Gậy Như Ý) · Vua Slime Phân Tách (tách đôi tái sinh tối đa 2 lần).
  - A: Nắm Đấm Co Giãn (tay co giãn đấm xa, va chạm bật mạnh) · Đấm Một Phát (dồn lực, lao +34, đẩy lùi cực mạnh) · Thiên Thạch Hủy Diệt (vòng cảnh báo rồi thiên thạch giáng xuống, rung sân).
  - B: Xạ Thủ Ngủ Gật (bắn chính xác, 25% chí mạng xuyên thấu) · Nhóc Bút Chì Lém Lỉnh (nhảy tưng, tiếp đất gây choáng) · Thám Tử Sút Bóng (bóng nảy 4 lần, làm chậm).
  - C: Tia Sét Vàng · Ngôi Sao Hút Lực · Rượt Đuổi Liên Hoàn. D: Slime Con Tách Đôi · Cao Su Tích Lực · Nét Vẽ Bút Chì.
- Cơ chế mới dùng chung trong trận: thu nhỏ đối thủ, chống chết/tách đôi (`onLethal`), đạn làm chậm, thiên thạch có cảnh báo, phân thân/slime con bám đuổi, tay đấm co giãn, bóng sút nảy. Ngẫu nhiên trong trận dùng RNG có hạt giống (đồng bộ khi chơi trực tuyến).
- Nguồn gốc mới **🎨 Hoạt hình** (lọc trong Bộ sưu tập); Vòng Quay có đủ 45 ô ghi tên + cấp; bảng chọn bóng vẫn xếp bóng sở hữu lên đầu theo S → D. Thành tích "Đại Gia Bóng" = sở hữu đủ 45 quả.
- **Quà tân thủ**: lần đầu nhận thưởng đủ 4 nhiệm vụ ngày → **1 quả bóng cấp A ngẫu nhiên** chưa sở hữu (đã có đủ cấp A → 300 vàng), hiện trong màn chúc mừng; có dòng nhắc tiến độ ở tab Hôm nay.

## [Đấu Trường Quả Cầu Anime – bảng chọn bóng bật lên] – 2026-11-27
- Phòng Chờ: bỏ danh sách bóng cố định ở cạnh/cuối trang; **bấm vào ô của mình** (hoặc ô máy khi được đổi) → bảng chọn bóng bật lên, **chọn xong tự đóng**. Bấm Sẵn sàng khi chưa chọn cũng mở bảng. Ô của mình nhấp nháy viền vàng + "👆 Bấm để chọn bóng" khi chưa chọn; đã chọn có "✏ Đổi bóng".
- Đội hình và nút Sẵn sàng / Bắt đầu đưa lên ngay dưới mã phòng; Chế độ & Bối cảnh chuyển xuống dưới. Trên điện thoại thẻ bóng trong bảng được thu gọn (ẩn thanh chỉ số, mô tả chiêu 2 dòng).

## [Đấu Trường Quả Cầu Anime – nhiệm vụ tuần & tháng] – 2026-11-27
- Khung Nhiệm vụ ở Sảnh có 3 tab **Hôm nay · Tuần này · Tháng này** (số nhiệm vụ chờ nhận trên từng tab, đếm ngược tới lúc làm mới).
- **Tuần** (làm mới thứ Hai 0:00): chơi 15 trận +80 · thắng 8 +120 · quay 3 lần +60 · 3 trận trực tuyến +100 · thắng 2 trận Hỗn Chiến +90.
- **Tháng** (làm mới ngày 1): chơi 60 trận +300 · thắng 30 +450 · thắng 10 trận bằng bóng C/D +250 · 10 trận trực tuyến +350 · quay 10 lần +200 · mở khóa 3 quả cầu mới +300.
- Tiến độ mới: trận trực tuyến, thắng Hỗn Chiến, mở khóa quả cầu mới. Một trận cộng cho cả ngày/tuần/tháng; nhận thưởng hiện màn chúc mừng; bản lưu cũ giữ nguyên tiến độ nhiệm vụ ngày.

## [Đấu Trường Quả Cầu Anime – chúc mừng mỗi lần nhận quà] – 2026-11-27
- Có quà mới trong hòm thư → thông báo nổi "🎁 Bạn có quà mới!" (tên quà, số vàng, nút Mở hòm thư).
- Nhận nhiều thư cùng lúc → màn chúc mừng hiện **từng món quà** (kèm tên thư) và tổng vàng; nhận thưởng **nhiệm vụ hằng ngày** cũng hiện màn chúc mừng.
- Khi chưa tải được tiến độ tài khoản: chỉ báo 1 lần (không lặp mỗi 15 giây).
- `docs/DAU_TRUONG_SETUP.md`: hướng dẫn chạy migration Đấu Trường trong SQL Editor (workflow Deploy Supabase đang bỏ qua vì repo chưa có khóa bí mật).

## [Đấu Trường Quả Cầu Anime – Hòm thư & app quản trị] – 2026-11-27
- **Database (`20261216000001_orb_mail_admin.sql`)**: chụp toàn bộ bản lưu trước khi nâng cấp; bảng `orb_mail`, `orb_admin_log`; hàm người chơi `orb_mail_read`, `orb_mail_hide`, `orb_mail_claim` (máy chủ cộng vàng + đánh dấu đã nhận trong 1 giao dịch, kiểm tra phiên bản bản lưu); hàm admin `orb_admin_stats`, `orb_admin_players`, `orb_admin_player`, `orb_admin_send_mail` (từng người / tất cả, ≤ 1.000.000 vàng/thư, hạn nhận), `orb_admin_mail_log`. Tất cả hàm admin kiểm tra bảng `admins` ở máy chủ.
- **Game**: nút 📬 hòm thư ở thanh trên (số thư mới, rung nhẹ khi có thư mới), mở thư, nhận quà / nhận tất cả, đánh dấu đã đọc, xoá thư đã nhận; **màn mở quà** (nền tối, tia sáng, hộp quà mở, vàng đếm lên, "Chúc mừng", Xác nhận) – không phát lại khi mở thư đã nhận.
- **App quản trị** `dau-truong/admin.html`: tổng quan, tìm/xem người chơi, gửi quà vàng, lịch sử gửi, sao lưu toàn bộ.
- Kiểm thử đầu-cuối bằng supabase-js thật + SQL thật (PostgreSQL 16, RLS, vai trò authenticated/anon): người thường bị chặn khỏi app admin; admin gửi quà; người chơi nhận +500 (100 → 600), nhận lần 2 bị từ chối, tải lại vẫn 600 khớp database.

## [Đấu Trường Quả Cầu Anime – Hỗn Chiến 6 người, bắt buộc tài khoản] – 2026-11-27
- **Hỗn Chiến**: tối đa **6 ô**, chỉ cần **2** người chơi/máy là bắt đầu được – ô trống tự bỏ qua; vị trí xuất phát chia đều theo vòng tròn (2–6 quả). Trực tuyến: chủ phòng gửi kèm danh sách ô vào trận để mọi máy khớp đúng quả bóng của mình. Các chế độ đội (1v1, 2v2, 4v4) vẫn phải đủ ô.
- **Người chơi mới / chưa đăng nhập** (trên link GitHub): màn "Chào mừng" bắt buộc tạo tài khoản hoặc đăng nhập để sao lưu tiến độ; tiến độ đang có trên máy được giữ. Không kết nối được máy chủ → có nút chơi tạm. Link Claude không có máy chủ tài khoản nên không bắt buộc.

## [Đấu Trường Quả Cầu Anime – Giai đoạn 1: tài khoản & lưu trên máy chủ] – 2026-11-27
- **Database (migration `20261215000001_orb_accounts.sql`)**: thêm bảng `orb_saves` (1 bản lưu / tài khoản, có số phiên bản, ID người chơi `#XXXXXX` duy nhất) và `orb_save_backups` (sao lưu tự động ≤ 20 bản). RLS: chỉ đọc bản của chính mình; không ghi thẳng vào bảng – mọi lần ghi qua hàm `orb_save_put` (security definer): kiểm tra phiên bản (chống máy cũ ghi đè máy mới), giữ cố định ID người chơi, báo trùng ID. Không sửa bảng nào của game câu cá. Đã chạy thử trên PostgreSQL 16 (kể cả chạy lại lần 2).
- **Game**: đăng nhập / tạo tài khoản **dùng chung với game câu cá** (cùng phiên đăng nhập `dccc_auth`); tiến độ Khách trên máy được đưa lên tài khoản lần đầu, giữ nguyên ID; đăng nhập máy khác tải đúng tiến độ; xung đột giữa 2 máy → tải bản mới nhất và báo; đăng xuất → quay về tiến độ Khách của máy (không mất). Thẻ Tài khoản ở Hồ sơ, biểu tượng ☁/⏳/⚠ cạnh ID, nhắc đăng nhập ở Sảnh khi đang là Khách.
- **Sao lưu dữ liệu người chơi** (trong database, không xuất ra GitHub vì repo công khai): `auto` (bản cũ trước khi ghi đè, 20 bản), `daily` (30 ngày), `snapshot:*` & `before_restore` (180 ngày). Admin: `orb_snapshot_all` (chụp toàn bộ – chạy được trong migration), `orb_admin_backups` (xem theo ID #XXXXXX), `orb_admin_restore` (khôi phục, cất bản hiện tại trước). Trình duyệt giữ thêm 3 bản gần nhất + tiến độ Khách. Hướng dẫn: `supabase/README.md`.
- Giới hạn còn lại (giai đoạn 2 sẽ xử lý): vàng và kết quả trận vẫn do trình duyệt tính rồi gửi lên.

## [Đấu Trường Quả Cầu Anime – phí đổi tên] – 2026-11-27
- Đổi tên ở Hồ sơ: **lần đầu miễn phí**, sau đó tốn Vàng và **gấp đôi mỗi lần** (100 → 200 → 400 …); bấm 2 lần để xác nhận, báo rõ khi thiếu vàng. Người chơi cũ đã đặt tên coi như đã dùng lượt miễn phí.

## [Đấu Trường Quả Cầu Anime – Sảnh kiểu mobile & chơi trực tuyến trên GitHub Pages] – 2026-11-27
- **Chơi trực tuyến + kết bạn trên link GitHub Pages**: phòng đấu, bạn bè, người online dùng **Supabase Realtime** (kênh broadcast công khai, khóa anon) của dự án hiện có; không thêm bảng database. Bước đăng Pages chạy `scripts/build-dau-truong.mjs` để chép supabase-js (bản đã khóa 2.119.0) và ghi `online-config.js` từ biến `SUPABASE_URL` / `SUPABASE_ANON_KEY`. Trên link Claude vẫn dùng kết nối của Claude.
- **Sảnh Chính kiểu game mobile**: thanh trên (avatar, tên, cấp, ID, vàng, cài đặt) + thanh điều hướng dưới 5 mục (Sảnh · Phòng đấu · Bạn bè · Bộ sưu tập · Hồ sơ) + trang Cửa hàng (Vòng Quay).
  - Phòng đấu: Tạo phòng · Vào bằng mã · **Ghép trận ngẫu nhiên** (phòng công khai) · Đấu với máy – dùng lại hệ thống phòng sẵn có.
  - Bạn bè 3 tab: Bạn bè · Lời mời (nhận/đã gửi) · Tìm kiếm theo ID; xem hồ sơ người chơi khác, mời vào phòng, huỷ kết bạn.
  - Bộ sưu tập: phân loại theo cấp, lọc nguồn gốc / sở hữu, tìm kiếm, trang bị & yêu thích.
  - Hồ sơ: đổi tên, cấp độ (tính từ số trận/thắng), danh hiệu từ thành tích, trạng thái & biểu cảm, lịch sử 20 trận gần nhất.
- Dữ liệu người chơi vẫn lưu trên trình duyệt (khóa lưu cũ, thêm trường mới – không mất tiến độ).
- Ẩn công cụ thử nghiệm (+100 Vàng, Mở khóa tất cả) khỏi bản chơi thật; chỉ hiện khi mở link có `?dev`.

## [Đấu Trường Quả Cầu Anime] – 2026-11-27
- Thêm game riêng 1 file **Đấu Trường Quả Cầu Anime** tại `apps/game-client/public/dau-truong/index.html` → đăng kèm GitHub Pages ở đường dẫn `/dau-truong/`. Game câu cá không đổi.
- Gồm: Sảnh Chính (hồ sơ, mã kết bạn, trạng thái & biểu cảm, bóng trưng bày, nhiệm vụ hằng ngày, thành tích, Bộ Sưu Tập 30 bóng có tìm kiếm/lọc) → Phòng Chờ (1v1/2v2/4v4/Hỗn Chiến, ô trống mời người chơi hoặc thêm máy, chọn bóng – bóng sở hữu lên đầu, Sẵn sàng) → Sàn Đấu (đếm ngược 3 giây, chọn hướng xuất phát).
- Chơi trực tuyến và kết bạn chỉ hoạt động khi mở qua link Claude; bản GitHub Pages chơi với máy (hiện cảnh báo rõ ràng).

## [Gỡ HERO ARENA] – 2026-11-27
- Theo yêu cầu chủ dự án: gỡ hoàn toàn game riêng HERO ARENA (`apps/hero-arena`, `packages/hero-arena-core`, script, E2E, bước đăng `/hero-arena/` trên GitHub Pages, bản trên claude.ai). Game câu cá không đổi. Code cũ vẫn còn trong lịch sử git (commit a77a1c8 → 23486dc) nếu cần khôi phục.

## [0.60.1] – 2026-11-24
### Sửa lỗi
- **Chọn cá trưng bày** (Hồ Sơ): hiện **toàn bộ cá** (trước chỉ 18 con) kèm **thanh trượt** kéo được, lăn chuột hoặc vuốt trên điện thoại; kéo để cuộn không bị tính nhầm là chọn cá; hiện "Đã chọn n/3 · tổng số cá".

## [0.60.0] – 2026-11-24 – Boss Thế Giới mạnh theo cả máy chủ · câu boss không giới hạn
### Thay đổi
- **Sức mạnh Boss Thế Giới = TỔNG CHIẾN LỰC đội hình của cả máy chủ** lúc boss xuất hiện; **máu = sức mạnh × 10** (tối thiểu 1 triệu). Mỗi lần boss xuất hiện (12h · 15h · 20h · 23h) tính lại → người chơi mạnh lên thì boss cũng mạnh lên. Hiện tại máy chủ ~405 nghìn chiến lực → boss ~4,05 triệu máu (trước cố định 0,8–1,2 triệu).
- **Câu boss KHÔNG GIỚI HẠN đòn** (bỏ giới hạn 15 đòn/lượt): một lượt chỉ kết thúc khi bị boss hạ gục, rút lui, boss chết hoặc hết giờ. **Bị hạ gục được vào lại** – tối đa **3 lượt** mỗi khung giờ.
- Sảnh boss hiện "💪 Sức mạnh boss = tổng chiến lực máy chủ"; ô trận đấu đếm "Đòn N · không giới hạn".
- **Cần Cửu Thiên Thần Long**: ẩn mô tả & chi tiết kỹ năng – chỉ ghi "Cần câu được một vị thần tối cao đánh rơi." (kỹ năng vẫn hoạt động).

## [0.59.0] – 2026-11-24 – Cửu Thiên Thần Long: Thần Thoại 1%
### Thay đổi
- **Cần Cửu Thiên Thần Long** thêm 2 kỹ năng:
  - **Thần Thoại tối thiểu 1%** mỗi lần quăng (ở mọi khu có cá Thần Thoại – trước ~0,2–0,5%).
  - **Xua cá tạp**: tỉ phần cá Thường + Hiếm giảm một nửa, nhường cho cá Quý / Sử Thi / Huyền Thoại.
  - Ví dụ Biển Lửa: Thường 39% → 16%, Hiếm 36% → 15%, Huyền Thoại 2% → 33%, Thần Thoại 0,05% → 1%, Boss 3,3%.
- Kỹ năng bị động mới: **mythic_floor** (Thần Thoại tối thiểu) và **low_tier_cut** (xua cá Thường & Hiếm).

## [0.58.2] – 2026-11-24
### Sửa lỗi
- **Đàn Cá Quý** nay thật sự ra cá quý: trong 3 lần quăng, cá **Sử Thi trở lên chiếm 40%** số cá cắn câu (trước đây chỉ +60 may mắn → Sử Thi+ chỉ tăng ~5% lên ~8%). Cá Thường / Hiếm giảm tương ứng, ví dụ Bến Câu Tân Thủ: cá Thường 74,5% → 41%, Sử Thi+ 4,9% → 39,8%.

## [0.58.1] – 2026-11-24
### Thay đổi
- **Cần Cửu Thiên Thần Long** mạnh hơn: tỉ lệ gặp **BOSS ×10** (trước ×5) và cá **HUYỀN THOẠI & THẦN THOẠI ×10** (trước ×5). Boss ~3,3% mỗi lần quăng; ở Đại Dương Thần Thoại cá Huyền Thoại ~21,8%, Thần Thoại ~0,52%.

## [0.58.0] – 2026-11-24 – Cần LR "Cửu Thiên Thần Long"
### Thêm
- **Cần Cửu Thiên Thần Long (LR)** – nhận bằng mã quà tặng. Ngoại hình mới: thân trắng ngà viền vàng, tay cầm xanh hoàng gia, đầu cần là **vầng hào quang tia vàng + đôi cánh vàng + trăng khuyết ôm ngọc tinh tú cầu vồng + vương miện**.
  - Kỹ năng **Thần Long Triệu Hồi**: tỉ lệ gặp **BOSS ×5** (kể cả Boss siêu hiếm, nâng luôn trần tỉ lệ), cá **HUYỀN THOẠI & THẦN THOẠI ×5**, +30 may mắn, 20% chí mạng x2,5, +40% sát thương Boss, dây tự hồi 12 độ bền/giây.
  - Ví dụ: Boss ~1,7% mỗi lần quăng (Huyết Ma Long ~0,33%); ở Đại Dương Thần Thoại cá Huyền Thoại ~12,9% (Huyết Ma Long ~2,9%).
  - Chỉ số chiến đấu nhỉnh sau Cần Huyết Ma Long (vẫn là cần mạnh nhất về lực kéo / độ bền).
- Kỹ năng bị động mới cho cần / nhân vật: **dụ Boss** (boss_lure) và **dụ cá Thần** (mythic_lure).

## [0.57.1] – 2026-11-23
### Thêm
- **Mã quà tặng 5 Đá Tiến Hoá Thần** (Cài Đặt → 🎁 Mã quà; mỗi tài khoản dùng 1 lần). Mã quà tặng nay tặng được cả Đá Tiến Hoá; nhận xong hiện màn CHÚC MỪNG với phần quà.

## [0.57.0] – 2026-11-23 – Bóng Tối & Ánh Sáng áp chế hệ tự nhiên
### Thay đổi
- **Bóng Tối & Ánh Sáng ÁP CHẾ 5 hệ tự nhiên** (Kim, Mộc, Thủy, Hỏa, Thổ): đánh hệ tự nhiên **×1,5**, bị hệ tự nhiên đánh chỉ **×0,75**. Bóng Tối ⇄ Ánh Sáng vẫn khắc lẫn nhau; vòng khắc Kim → Mộc → Thổ → Thủy → Hỏa → Kim giữ nguyên.
- Áp dụng mọi nơi tính khắc hệ: Đấu Sinh Tử, đấu cá, PvP, Boss Thế Giới (Khế Tinh – Ánh Sáng & Măng Cụt – Bóng Tối đánh đội hệ tự nhiên mạnh hơn: chiêu trừ 35% máu).
- Bảng khắc hệ (nút "?") cập nhật: mũi tên vàng "ÁP CHẾ cả 5 hệ tự nhiên".

## [0.56.0] – 2026-11-23 – Bảng chú thích khắc hệ
### Thêm
- **Nút "?" bảng khắc hệ** trong đấu cá (góc phải trên khi đang đánh, và ở màn chọn đội Đấu Sinh Tử). Bấm để xem:
  - Sơ đồ vòng khắc: **Kim → Mộc → Thổ → Thủy → Hỏa → Kim**, **Bóng Tối ⇄ Ánh Sáng** khắc lẫn nhau.
  - Bảng hệ số 7×7 (hàng = cá đánh, cột = cá bị đánh): 🟩 khắc chế ×1,5 · 🟥 bị khắc ×0,75 · ×1 bình thường.
  - Cách tính cho cá song hệ (lấy hệ có lợi nhất, giới hạn ×0,75 … ×1,5).

## [0.55.0] – 2026-11-23 – Biến dị cá song hệ theo từng Đá Tiến Hoá
### Thay đổi
- **Cá song hệ đột biến bằng 5 loại Đá Tiến Hoá như mọi cá** (Ngọc Long Hồn · Lõi Dung Nham · Tinh Thể Băng Hà · Sấm Thạch · Đá Tiến Hoá Thần) – mỗi viên ra **bộ dạng SONG HỆ riêng** của cặp hệ đó, ví dụ cá Kim–Mộc dùng Lõi Dung Nham → Hỏa Viêm / Lục Hỏa / Lam Hỏa / Hắc Hỏa / Kim Hỏa **Thiết-Mộc**.
  - 21 cặp hệ × 24 dạng = **504 dạng** song hệ, cùng cấp bậc & tỉ lệ ra như dạng gốc, **mạnh hơn ~10%**, cá giữ hệ chính.
  - Vẽ trên **chính dáng của từng loài cá lai hai hệ** (thân, đầu, sừng, gai, giáp giữ nguyên) + màu & hiệu ứng của viên đá, vây / vân / mắt màu hệ phụ, sắc hào quang hai hệ.
  - Bộ Sưu Tập: các tab theo viên đá hiện đúng dạng song hệ của loài (ẩn đến khi mở).
- Bỏ thẻ "☯ Song Hệ" riêng (tốn 2 đá) của bản 0.53; cá đã mang dạng Song Hệ cũ vẫn giữ nguyên dạng.

## [0.54.0] – 2026-11-23 – Tân Thủ x2 KN · Cần câu không giới hạn cấp
### Thêm
- **Tân Thủ bắt kịp: người chơi DƯỚI cấp 30 nhận ×2 kinh nghiệm khi câu cá** (cả cá lẫn rác vớt được); đạt cấp 30 tự về bình thường. Màn câu cá hiện "⭐ x2 KN Tân Thủ (đến cấp 30)", kết quả câu ghi "+… KN (x2 Tân Thủ)".
### Thay đổi
- **Cần câu không còn giới hạn cấp**: mọi cần mua bằng vàng chỉ cần đủ vàng (bỏ yêu cầu cấp 3 / 5 / 7 / 10 / 12 / 16 / 20…).

## [0.53.0] – 2026-11-23 – Cá 2 hệ: hệ chính / hệ phụ · Biến dị Song Hệ
### Thay đổi
- **Cá 2 hệ (84 loài cá lai theo dòng): hệ ĐẦU là HỆ CHÍNH, hệ thứ 2 là HỆ PHỤ.** Mọi bậc lai (Boss Lai, Chiến Vương, Thần Thú, Cổ Thú) nay đều mang hệ chính – trước đây Chiến Vương theo hệ 2 và Cổ Thú thành Ánh Sáng / Bóng Tối. Thông tin cá & Bộ Sưu Tập ghi rõ "Chính: … · Phụ: …".
### Thêm
- **Biến dị SONG HỆ** riêng cho cá 2 hệ – 21 cặp hệ × 4 dạng (84 dạng mới), hiếm dần:
  - **SH-1 Song Linh** (45%, cân bằng) · **SH-2 Hộ Thể** (30%, chuyên Máu) · **SH-3 Cuồng Ngư** (18%, chuyên Công) · **SH-4 Thánh Tôn** (7%, toàn diện) – mạnh hơn dạng đơn hệ ~10%.
  - Ngoại hình: thân màu hệ chính, vây / vân / mắt theo hệ phụ; hào quang SH-1 theo hệ chính, SH-2 theo hệ phụ, SH-3 rồng, SH-4 phượng hoàng. Cá **giữ hệ chính**.
  - Đột biến tốn **1 Đá Tiến Hoá hệ chính + 1 viên hệ phụ** (thiếu thì dùng đá vạn năng, Đá Tiến Hoá Thần dùng sau cùng), luôn thành công.
  - Màn Đột biến có thêm thẻ **☯ Song Hệ**; Bộ Sưu Tập có tab **☯ Song Hệ** (ẩn đến khi mở được dạng đó).

## [0.52.2] – 2026-11-23
### Thêm
- **Vòng Quay có ô ✨ Đá TH Thần** (Đá Tiến Hoá Thần – mở 4 dạng đột biến THẦN, dùng thay đá mọi hệ): tỉ lệ **0,5%** mỗi lượt (quay x10 cao hơn ×1,6), trúng hiện màn TRÚNG ĐỘC ĐẮC. Bớt tương ứng từ ô 500 Vàng – tỉ lệ các ô khác không đổi.

## [0.52.1] – 2026-11-23
### Thay đổi
- Gỡ nút **📊 Tỉ lệ** trong màn câu cá – người chơi không xem được bảng tỉ lệ ra cá / rác. Cơ chế may mắn vẫn giữ nguyên (may mắn cao → nhiều cá cấp cao, ít rác).

## [0.52.0] – 2026-11-23 – Chiêu boss gây sát thương · Né / Đỡ chiêu
### Thêm
- **Chiêu boss gây sát thương lên người chơi** (trong lượt đánh): bạn có **thanh máu = tổng máu 3 cá trưng bày** (hiện dưới chân nhân vật). Boss tung chiêu theo lịch **giây 6, rồi mỗi 8 giây**; mỗi chiêu trừ **25%** máu (boss khắc hệ đội: **35%**, đội khắc boss: **15%**).
- **Hết máu = 💀 bị boss hạ gục**: lượt đánh kết thúc sớm (sát thương đã gây vẫn được tính & xếp hạng). Máy chủ tự tính máu theo thời gian và từ chối mọi đòn sau khi gục – không gian lận được.
- **Cảnh báo trước khi boss ra đòn**: dải tên chiêu + "⚠ NÉ NGAY! Bấm B" và vòng đỏ co dần về nhân vật, chuyển **xanh "⚡ NÉ!"** khi tới lúc né.
- **Né / Đỡ chiêu**: bấm **B** (hoặc nút **🛡 Né (B)**):
  - sát lúc chiêu chạm (≤ 0,45 giây trước) → **NÉ HOÀN HẢO**: không mất máu, nhân vật nhảy tránh, "MISS";
  - sớm hơn trong lúc cảnh báo (≤ 1,3 giây) → **ĐỠ ĐÒN**: khiên bảo vệ, chỉ mất 40% sát thương;
  - bấm quá sớm: "Chưa tới lúc né!" (không mất lượt né). Mỗi chiêu tính lần bấm đầu tiên; máy chủ chấm theo đồng hồ của mình.
- Ở sảnh chờ (chưa vào đánh) chiêu boss vẫn chỉ là hiệu ứng.

## [0.51.0] – 2026-11-23 – Boss tung chiêu
### Thêm
- **Boss Thế Giới tung chiêu thức** mỗi 7–11 giây khi đang xuất hiện: gồng sức (năng lượng hút về miệng, ngửa ra sau, dải tên chiêu "⚠ …!") rồi phóng vào người chơi – nhân vật trúng chiêu bị hất lùi, chớp đỏ, rung màn hình. Mỗi boss 2 chiêu riêng theo hệ:
  - 🐉 Thanh Long: **Bão Lá Thanh Long**, **Roi Dây Leo Thần**
  - 🌶 Ớt Hỏa: **Mưa Cầu Lửa Ớt**, **Long Hoả Phun Thiêu**
  - 🍉 Dưa Hấu: **Pháo Nước Dưa Hấu**, **Sóng Thần Hải Quái**
  - 🍍 Dứa Giáp: **Mưa Mảnh Vàng**, **Trận Gai Kim Cương**
  - 🥥 Sầu Riêng: **Đá Gai Lăn Lóc**, **Địa Chấn Sầu Riêng**
  - ⭐ Khế Tinh: **Tinh Quang Xạ Tuyến**, **Thánh Quang Giáng Thế**
  - 🟣 Măng Cụt: **Mực Đen Vực Thẳm**, **Xúc Tu Bóng Tối**
- Chiêu thức chỉ là hiệu ứng – không trừ máu, không đổi sát thương của người chơi.

## [0.50.1] – 2026-11-23 – Boss: cầm đúng cần câu · chuyển động mượt
### Thay đổi
- **Đánh Boss Thế Giới bằng đúng cần câu đang dùng khi câu cá**: thân cần đúng màu, quấn chỉ, tay cầm, máy câu, vật trang trí đầu cần, hào quang / vân sét của cần xịn, dây câu đúng màu khi quăng móc boss. Người chơi khác trong phòng cũng cầm đúng cần của họ.
### Sửa lỗi
- **Boss chuyển động mượt**: trước đây mỗi đòn đánh và mỗi lần cập nhật (4 giây) vẽ lại cả màn → boss khựng, nhảy về chỗ cũ giữa lúc bị giật. Nay chỉ cập nhật số liệu; boss bơi liên tục theo thời gian thật (nhấp nhô, lắc thân, thở phồng, trôi nhẹ), cú giật cần cộng mượt vào rồi trôi về.
- Chớp sáng khi trúng đòn dùng đồng hồ thật (máy yếu không còn bị boss trắng xoá lâu).

## [0.50.0] – 2026-11-23 – Tỉ lệ câu theo chỉ số người chơi · Boss 23h
### Thêm
- **Tỉ lệ ra cá / rác tuỳ theo chỉ số người chơi**: may mắn (nhân vật + bùa) và tỉ lệ hiếm của cần càng cao → **cá cấp cao càng nhiều**, cá thường & rác càng ít. Ví dụ Bến Câu Tân Thủ: may mắn 0 → 22% cá Hiếm trở lên · 9,5% rác; may mắn 50 → 33% · 6% rác; may mắn 150 → 51% · 3,4% rác. Cá hiếm hơn vẫn luôn khó gặp hơn cá cấp dưới.
- Nút **📊 Tỉ lệ** trong màn câu cá: bảng tỉ lệ rác, từng cấp cá (Thường → Thần Thoại) và Boss tính đúng theo chỉ số hiện tại của bạn (kể cả "Đàn cá quý").
- **Boss Thế Giới thêm khung 23h** (23h–23h30): nay có 4 khung **12h · 15h · 20h · 23h**, máu boss khung 23h như khung 20h.
### Thay đổi
- Chọn boss ngẫu nhiên: trong cùng một ngày, khung sau luôn là boss khác khung trước.

## [0.49.1] – 2026-11-23 – Sửa May Mắn & Mùa Cá Lớn
### Sửa lỗi
- **May mắn giờ giảm tỉ lệ vớt rác**: trước đây rác cố định 12% mỗi lần quăng bất kể may mắn → nâng may mắn vẫn ra rác. Nay: may mắn thấp ~9%, +50 may mắn ~6%, +150 may mắn ~3,5% (tối thiểu 2% để còn nhiệm vụ Sinh Thái). "Đàn cá quý" (+60 may mắn) cũng giảm rác.
- **Mùa Cá Lớn câu ra cá lớn thật**: trước đây chỉ nhân cân nặng +35% lúc kéo lên (loài cá & cân nặng vẫn như thường). Nay trong 3 lần quăng: **loài cá to dễ cắn hơn**, cân nặng **luôn ở nửa trên** khoảng của loài rồi **+35%**, cá hiện **to hơn** trên mặt nước, báo "🐋 CÁ KHỔNG LỒ: … kg!". Trung bình nặng gấp ~4–8 lần bình thường.

## [0.49.0] – 2026-11-23 – Câu Boss bằng nhân vật · Phòng boss chung · Nhạc nền mới
### Thêm
- **Đánh Boss Thế Giới bằng NHÂN VẬT của bạn**: nhân vật cầm cần câu đứng bên trái, mỗi đòn canh kim là **quăng dây móc vào miệng boss rồi GIẬT mạnh** (cần cong, boss bị kéo lệch; đòn mạnh giật mạnh hơn). Boss to gấp ~10 lần nhân vật.
- **Lực chiến = tổng 3 cá trưng bày** (Hồ Sơ). Phải **trưng bày đủ 3 cá** mới được vào phòng boss – sảnh boss báo "🏅 Cá trưng bày n/3" và có nút đi trưng bày. Máy chủ lấy đúng 3 cá trưng bày làm đội (cá khoá vẫn dùng được, không mất cá).
- **Phòng boss chung**: thấy nhân vật (đúng ngoại hình, trang phục) và tên của những người chơi khác đang đánh cùng khung giờ, họ cũng quăng dây giật boss mỗi khi ra đòn; "👥 n người trong phòng".
### Thay đổi
- **Không gian đánh boss rộng toàn màn hình**: bỏ khung cá trưng bày bên phải; chỉ còn ô nhỏ góc phải (số đòn, sát thương, Rút lui). Sảnh chờ: khung boss rộng hơn, bảng xếp hạng gọn lại. Tranh nền 7 sảnh boss vẽ lại theo bề rộng mới.
- **Nhạc nền mới vui tươi, hào hứng**: mỗi màn một bài có giai điệu riêng dễ nhớ (Sảnh lễ hội, Câu cá thư thái, Đấu Sinh Tử sôi sục, Boss hùng tráng), bass nảy, rải hợp âm, trống nhẹ, tiếng vang; vòng lặp thứ hai thêm bè hoà âm. Tiếng mềm (không còn chói), nốt ngân liền, lập lịch xa hơn nên không giật khi máy bận.
### Sửa lỗi
- Nhãn "⚠️ Chưa lưu – bấm thử lại" cập nhật bằng đồng hồ thật (trước đây chậm trên máy yếu, bấm thử lại xong vẫn còn cảnh báo).

## [0.48.0] – 2026-11-23 – Sảnh Boss riêng · Boss Cá Trái Cây · Chúc mừng nhận quà
### Thêm
- **Hòm Thư – màn CHÚC MỪNG khi nhận quà**: bấm "🎁 Nhận quà" → tia sáng, pháo giấy, từng món quà hiện lần lượt kèm hình (vàng, kim cương, đá, linh hồn, Đá Tiến Hoá, cá) và số lượng đầy đủ; bấm "Tuyệt vời!" để đóng.
- **Sảnh đánh boss riêng cho từng boss** (vẽ tay + hạt hiệu ứng động): 🌿 Rừng Thanh Long · 🌋 Núi Lửa Ruộng Ớt · 🌊 Biển Dưa Hấu · 🏯 Pháo Đài Dứa Vàng · ⛰ Hang Sầu Riêng · ✨ Thiên Cung Khế · 🌑 Vực Măng Cụt.
- Bố cục mới: **boss bên phải, to gấp 10 lần cá thường** (tràn khung), **đội cá người chơi bên trái**, lao vào mỗi khi ra đòn. Vẫn đánh bằng **thanh kim trượt** (canh kim vào giữa rồi bấm Space / chạm).
### Thay đổi
- **Boss dùng tạo hình Cá Trái Cây**: Thanh Long, Ớt (vẽ đúng dáng trái ớt: đỏ bóng, đài lá + cuống xanh), Dưa Hấu, Dứa (đuôi chùm lá dứa), Sầu Riêng (gai bám viền thân), Khế, Măng Cụt (thân tròn, đuôi đài lá nhọn cong ra). Mọi con đều có vảy.
- **Boss xuất hiện ngẫu nhiên**: mỗi khung giờ chỉ 1 boss, chọn ngẫu nhiên (máy chủ quyết định), hầu như không trùng khung liền trước.

## [0.47.0] – 2026-11-23 – Boss Thế Giới: 7 Boss Trái Cây
### Thêm
- **Boss Thế Giới** lúc **12h · 15h · 20h** (giờ Việt Nam), mỗi lần 30 phút – mọi người chơi đánh chung 1 thanh máu (máy chủ làm trọng tài, trừ máu nguyên tử).
  - Vào đánh bằng đội 3 cá mạnh nhất (cá khoá cũng được – đánh boss **không mất cá**); mỗi lượt 15 đòn canh kim (Space / chạm thanh / chạm boss), tối đa 3 lượt mỗi khung giờ.
  - **Sát thương càng nhiều quà càng nhiều** (gửi Hòm Thư khi hết giờ / hạ boss): hạng 1: 80 💎 · 30.000 🪙 · 60 🔷 · 30 🔮; hạng 2–3; hạng 4–10; còn lại vẫn có quà tham gia.
  - **Người kết liễu** nhận thêm **1 Đá Tiến Hoá đúng hệ của boss** + 20 💎.
  - Bảng sát thương top 10 cập nhật liên tục, hạng & quà dự kiến của mình, đồng hồ đếm ngược tới khung giờ kế tiếp.
  - Nút **🐉 Boss TG** ở sảnh (nhấp nháy "LIVE" khi boss đang xuất hiện).
- **7 Boss Trái Cây** (mỗi hệ 1 con, xoay vòng theo ngày & khung giờ), vẽ tay bằng đồ hoạ trong game – dáng mới, không dùng dáng cá có sẵn:
  🐉 **Thanh Long Long Vương** (Mộc) – rồng phương Đông vảy thanh long, gai lá, sừng, râu dài, đuôi lửa xanh đỏ ·
  🌶 **Ớt Hỏa Long Ngư** (Hỏa) – rồng con thân quả ớt, cánh lửa, cuống ớt làm sừng ·
  🍉 **Dưa Hấu Hải Quái** (Thủy) – bạch tuộc dưa hấu phun nước ·
  🍍 **Dứa Giáp Long Quy** (Kim) – rùa rồng mai mắt dứa, vương miện lá ·
  🌰 **Sầu Riêng Bạo Ngư** (Thổ) – quái cầu gai sầu riêng ·
  ⭐ **Khế Tinh Thần Ngư** (Ánh Sáng) – cá đuối thần hình sao khế ·
  🟣 **Măng Cụt Hắc Mặc Ngư** (Bóng Tối) – mực khổng lồ măng cụt.
### Máy chủ
- Migration `20261211000001_world_boss.sql` (bảng boss, sát thương, phiên đánh + hàm `wb_apply_hit`) – đã áp. Edge Function mới `world-boss` – đã triển khai.

## [0.46.0] – 2026-11-23 – Đấu cá: B canh bảo vệ, V kỹ năng nạp nộ; lên giai không cần đá
### Thay đổi – Đấu cá 3vs3 (máy & người, máy chủ làm trọng tài)
- **B = CANH BẢO VỆ**: canh kim trên thanh như khi đánh – chặn đòn kế tiếp của địch theo độ chuẩn: PERFECT 75% · XANH 55% · VÀNG 30% · ĐỎ 10% (hết giờ = phòng thủ thường 40%). Chặn HOÀN HẢO thưởng +15 nộ.
- **V = KỸ NĂNG** dùng **THANH NỘ** (bỏ hồi chiêu): vào trận nộ = 0; nộ tích từ sát thương địch gây cho mình (mất ~62% máu → đầy 100), dùng kỹ năng thì về 0. Nộ của cả đội (cá ngã thì cá sau thừa hưởng). Máy cũng theo đúng luật này và cũng biết canh bảo vệ.
- **Kỹ năng riêng**: cơ chế theo **HỆ** (Kim khiên · Mộc hồi máu · Thủy sóng mạnh · Hỏa cuồng nộ · Thổ địa chấn · Bóng tối hút máu · Ánh sáng thanh tẩy) + tên & hiệu ứng thêm theo **DẠNG ĐỘT BIẾN / THẾ MẠNH**: chuyên CÔNG đòn kỹ năng ×1,25, chuyên THỦ thêm khiên 30%, chuyên MÁU hồi thêm 15%, dạng huyền thoại / cân bằng có đủ cả ba. Chưa đột biến: thế mạnh theo chỉ số nổi trội của loài. Kỹ năng mạnh hơn trước 20% (vì phải nạp nộ).
- Màn trận: thanh nộ dưới thanh máu mỗi bên, nút "⚡ Nộ x/100" sáng khi đầy, nút "🛡 CANH BẢO VỆ"; báo mức chặn ("CHẶN HOÀN HẢO! −75%").
### Thay đổi – Trưởng thành
- **Lên giai không cần Đá Tiến Hoá** (chỉ vàng + đá nâng cấp + linh hồn); riêng **Cao → Thánh Giai cần 1 viên đá cùng loại** (cá đã đột biến: đá của dạng; chưa đột biến: đá theo hệ cá; đá vạn năng thay được).
- Đột biến là **tuỳ chọn** (nút 🧬 lúc nào cũng được), không còn bắt buộc trước khi lên giai.
### Sửa lỗi
- Từ trận thứ 2 trở đi thanh nộ không hiện (tham chiếu đồ hoạ của trận trước không được làm mới).
- Máy chủ trận đấu triển khai lại với lõi mới (`battle`, `pvp`); trận đang dở dạng cũ vẫn chơi tiếp được (nộ tính từ 0).

## [0.45.0] – 2026-11-23 – Hướng dẫn tân thủ, hiệu ứng đột biến theo dáng cá
### Thêm
- **Hướng dẫn tân thủ** cho tài khoản mới: chào mừng → bấm CÂU CÁ → chọn bến Tân Thủ → quăng cần → giật khi có dấu ❗ → kéo cá (giữ kéo, thả khi lực căng đỏ) → xem Kho Cá → làm quen Đấu Cá, Lai Tạo, Nhân Vật/Cần Câu, Nhiệm Vụ, Vòng Quay → **nhận 2.000 🪙 + 30 💎 + 20 🔷** → chơi tự do. Trong lúc hướng dẫn chỉ bấm được đúng chỗ được chỉ; câu hụt / cá thoát thì quay lại bước quăng cần. Có nút "Bỏ qua hướng dẫn" (bấm 2 lần, không nhận quà). Người chơi cũ không bị ảnh hưởng.
- **Nút 🧬 Đột biến** luôn có ở chi tiết cá Huyền Thoại / Boss / Thần Thoại chưa đột biến (không phải đợi đủ cấp Sơ Giai), có dấu "!" khi đang có Đá Tiến Hoá.
### Thay đổi
- **Hiệu ứng đột biến mới**: màn tối dần, cá rung, vòng năng lượng cùng màu dạng đột biến co vào thân → cá loé trắng → quầng sáng & sóng xung kích toả ra → bảng kết quả hiện hình cá mới đúng giai (không còn phủ kín màn bằng 1 màu).
- **Hiệu ứng đột biến bám đúng dáng cá**: loài có hình vẽ riêng (Thần Thoại, Boss đặc biệt, cá lai) được dò đường viền thật để gai / lửa / bờm / râu / cánh / vương miện mọc đúng sống lưng, đầu, mũi, đuôi. Sửa lỗi **Huyết Long Thần** (khối gai đỏ nổi rời) và các dạng của **Hắc Long Ngư Vực Thẳm** thân cuộn (hàng vây thẳng cắt ngang, râu dựng đứng, cánh lệch, tia sét lạc góc).
- **Cá Mập Búa**: vẽ lại đầu búa mềm mại kiểu cá mập búa thật (thuỳ đầu bo tròn, mắt ở chóp thuỳ, rãnh mũi, khe mang). **Hỏa Ngục Bạo Ngư** bỏ đầu búa, đổi sang đầu bạo chúa to hầm hố, hàm nanh, mào & bờm lửa – mỗi loài một kiểu đầu hợp tên.
### Sửa lỗi
- **Bấm Kho Cá lại mở Bộ Sưu Tập** (sau khi vào Bộ Sưu Tập): chuyển màn luôn làm mới dữ liệu màn.
- Hẹn giờ của hướng dẫn dùng giờ thật (máy yếu / FPS thấp không bị treo).

## [0.44.0] – 2026-11-23 – Tiến hoá hệ: lên giai theo hướng dạng đột biến
### Thay đổi
- **Giữ Tiến hoá hệ (Q6)**: cá đột biến **giữ nguyên hệ gốc**, chỉ thêm dạng đột biến – ghi rõ ở chi tiết cá ("Hệ Hỏa · 🧬 Lam Hỏa (thiên THỦ)"), thẻ chọn cá ("🧬 Lam Hỏa") và tên cá trong trận.
- **Lên giai theo hướng dạng đột biến**: chỉ số = chỉ số cá + phần đột biến, phần đột biến lớn thêm mỗi giai (Sơ ×1 · Trung ×1,25 · Cao ×1,5 · Thánh ×1,75) theo đúng hướng của dạng – VD Lam Hỏa (chuyên Thủ) càng lên giai càng thiên phòng thủ; tốc độ thưởng của dạng cũng tăng theo giai.
- **Hình theo giai của dạng đột biến**: cá thường/Boss/Thần Thoại đã có hình đột biến lớn dần qua 4 giai; nay **vẽ thêm cá lai đột biến** – giữ dáng lai theo bố mẹ, thân tô bảng màu của dạng, thêm hào quang & hiệu ứng của dạng, to dần theo giai.
- Máy chủ trận đấu dùng chỉ số mới (đã triển khai lại `battle`, `pvp`).

## [0.43.1] – 2026-11-23 – Bộ Sưu Tập: dạng đột biến ẩn đến khi mở
### Thay đổi
- **Bộ Sưu Tập → 🧬 Các dạng đột biến**: hiện đủ các dạng loài đó có thể đột biến, nhưng dạng **chưa mở** chỉ hiện bóng "???", mã ĐB và tỉ lệ (ẩn tên, hình, chỉ số). Đột biến ra dạng nào thì dạng đó được mở vĩnh viễn trong Bộ Sưu Tập (bán / mất cá vẫn giữ). Tiêu đề và từng viên đá có đếm "đã mở x/y". Cá đã đột biến từ trước được tính là đã mở.
- **Lông Phượng Thần → Đá Tiến Hoá Thần** ở mọi nơi (tên, hình vẽ viên đá thần hồng–vàng có hào quang); vẫn mở 4 dạng đột biến Thần và dùng thay đá mọi hệ. Đồ đang có giữ nguyên.

## [0.43.0] – 2026-11-23 – Bộ Sưu Tập theo hệ, Kho Cá chia trang, sửa lỗi Android
### Thay đổi
- **Bộ Sưu Tập chia theo HỆ**: Tất cả · Kim · Mộc · Thủy · Hỏa · Thổ · Ánh Sáng · Bóng Tối (bỏ các mục theo cấp bậc). Trong mỗi hệ: khu cá 1 hệ, rồi từng khu cá lai 2 hệ có huy hiệu 2 hệ (VD tab Mộc có khu Mộc + Thủy, Mộc + Thổ…; cá 2 hệ hiện ở cả 2 hệ của nó, chưa lai được hiện bóng "???").
- **Kho Cá và Bộ Sưu Tập là 2 màn riêng** (mở riêng từ sảnh).
- **Kho Cá chia trang** (18 con / trang, nút ◀ ▶).
- **Chọn nhiều theo bậc**: bật nhiều bậc cùng lúc (Thường, Hiếm, Quý, Sử Thi, Huyền Thoại, Thần Thoại, Boss) – bấm lại 1 bậc để bỏ cả bậc đó ra; vẫn chọn/bỏ từng con được.
- **Câu cá: giật sớm = thu dây luôn**, mất lượt quăng đó (như bấm hụt) – không còn bấm sớm rồi chờ tiếp. Màn kết quả báo rõ "GIẬT SỚM – THU DÂY" / "BẤM HỤT – THU DÂY".
### Sửa lỗi
- **Android: bấm sửa tên bị thoát ra** – bàn phím ảo làm màn hình co lại khiến game dựng lại màn (đóng hộp thoại). Nay đang gõ chữ thì không dựng lại màn hình.

## [0.42.0] – 2026-11-23 – Lực chiến theo bậc
### Thay đổi
- **Lực chiến gốc theo độ hiếm** (cá mới câu: cấp 1, Sơ Giai, chưa đột biến):
  Thường **100–500** · Hiếm **501–1.000** · Quý **1.001–1.500** · Sử Thi **1.501–2.000** · Huyền Thoại **2.001–2.500** · Boss & Boss siêu hiếm **2.501–3.000** · Thần Thoại **3.001–3.500**.
  Trong cùng bậc, loài mạnh hơn vẫn đứng cao hơn. Lên cấp, tiến hoá (sao / giai) và đột biến **cộng thêm** trên nền này (VD Boss 2.501 → cấp 15: 5.255 → Thánh Giai cấp 50: 17.581).
- Chỉ đổi chỉ số **chiến đấu** (máu/công/thủ khi đấu): độ khó lúc **câu** cá giữ nguyên.
- Đội máy, Bảng Xếp Hạng Chiến Lực và máy chủ trận đấu dùng thang mới (đã triển khai lại `battle`, `pvp`).

## [0.41.0] – 2026-11-23 – Rank Đấu Sinh Tử, Tìm Trận, giảm vàng nâng cấp cá
### Thêm
- **Rank Đấu Sinh Tử** (mùa mới – mọi người bắt đầu từ 0): mỗi trận THẮNG sinh tử +10 điểm · 100 điểm = 1 ⭐ · đủ 5 ⭐ lên bậc · 5 bậc mỗi hạng. Thua không trừ điểm, giao hữu không tính.
  - 5 hạng, mỗi hạng một huy hiệu vẽ riêng (ruy băng có số ngọc = bậc): **Tân Binh** (Khởi động / Vòng loại) · **Chiến Binh** (Vòng bảng / Tích lũy điểm) · **Tinh Anh** (Vòng tứ kết / Nhóm bứt phá) · **Huyền Thoại** (Vòng bán kết / Top đầu) · **Vô Địch / Thần Thoại** (Quán quân / Đỉnh bảng).
  - Nút huy hiệu ở màn Đấu Cá → bảng **Thang Rank**: hạng của bạn, sao, điểm tới sao kế, và thang chú thích đủ 5 hạng với mốc điểm.
  - Thắng trận hiện "+10 điểm rank", báo lên sao / lên bậc / lên hạng. Hồ sơ người chơi hiện hạng rank.
- **Tìm Trận sinh tử ưu tiên ghép NGƯỜI**: tìm người đang tìm trận (gần rank nhất) trong 20 giây, tự chốt đội đã chọn; không có ai mới đấu MÁY.
- **Đấu máy: rank càng cao càng khó** – Tân Binh Dễ · Chiến Binh Thường · Tinh Anh Khó · Huyền Thoại/Thần Thoại Trùm, lực chiến đội máy +2% mỗi bậc (tối đa ×1,48). Máy chủ tự tính theo rank trên bản lưu (bỏ nút chọn độ khó).
### Thay đổi
- **Bảng Xếp Hạng Sinh Tử reset**: xếp theo **hạng rank** (điểm rank mùa mới) thay cho số trận thắng; mỗi dòng hiện huy hiệu, hạng · bậc, sao.
- **Giảm mạnh vàng nâng cấp cá**: tính theo độ hiếm thay vì giá trị cá. Boss: cấp 10 ≈ 1,8K (trước 124K), trọn cấp 1→50 ≈ 220K (trước 15,2M); tiến hoá giai Boss ≈ 13K–103K (trước 170K–1,5M).
- **Biểu tượng đồng bộ**: mọi chữ có 🪙 💎 🔷 🔮 🎫 (giá, phần thưởng, nút, thông báo) tự vẽ bằng biểu tượng mới giống thanh tài nguyên.
- **Bảng Tỉ lệ rơi Vòng Quay** có thanh trượt (kéo / lăn chuột / vuốt) và dùng hình vẽ từng món.
### Máy chủ
- Migration `20261210000001_pvp_quick_match.sql` (phòng tìm trận công khai + hạng mục xếp hạng `dmRank`) – đã áp. Triển khai lại `battle`, `pvp`.

## [0.40.3] – 2026-11-23 – Sửa lỗi không đấu cá được
### Sửa lỗi
- **Đấu Cá (với máy và với người) không mở được trận**: máy chủ trận đấu bị thiếu quyền đọc bản lưu ("permission denied for table player_saves") nên mọi lần bấm đấu đều lỗi. Đã cấp lại quyền cho tài khoản máy chủ (migration `20261209000001_service_role_grants.sql`, đã áp lên máy chủ thật).
- Triển khai lại máy chủ trận đấu (`battle`, `pvp`) với dữ liệu mới nhất: Kim Lân Thần Ngư, mã đột biến ĐB-1…ĐB-5, Đá Tiến Hoá Vạn Năng.

## [0.40.2] – 2026-11-23 – Biểu tượng tiền tệ vẽ mới
### Thay đổi
- Thanh tài nguyên trên cùng: **đồng vàng, kim cương, đá nâng cấp, linh hồn** dùng biểu tượng vẽ (cùng bộ với menu & Vòng Quay) thay emoji.

## [0.40.1] – 2026-11-23 – Vòng Quay may mắn
### Thay đổi
- Ô **Lông Phượng Thần → Đá Tiến Hoá Vạn Năng** (ra ngẫu nhiên U Minh / Thánh Quang / Địa Mạch Thạch – dùng thay đá của mọi hệ). 4 đá theo hệ ghi rõ: Đá TH Thủy · Hỏa · Băng · Lôi.
- **Ghi rõ từng cần câu và nhân vật**: thay "Cần Câu Hiếm" / "Nhân Vật Hiếm" chung chung bằng từng ô riêng – Cần Long Cốt, Cần Phượng Hoàng, Cần Hải Thần; NV Ngao Thiên, Viêm Hỏa, Thủy Tổ, Lôi Vũ (tổng tỉ lệ vẫn rất thấp như cũ).
- **Biểu tượng trong vòng quay vẽ thật**: hình cần câu, chân dung nhân vật, đá tiến hoá, đồng vàng, kim cương, vương miện, vé Boss, linh hồn – thay emoji.
- **Biểu tượng Vòng Quay ở sảnh** vẽ lại: chân đế, viền vàng gắn bóng đèn, ô màu có sao/đồng xu, trục ngọc, kim chỉ có viên ngọc.

## [0.40.0] – 2026-11-23 – Mỗi khu 1 Thần Thoại, biểu tượng menu mới
### Thay đổi
- **Phân bổ lại cá Thần Thoại: mỗi khu (ải) đúng 1 loài, cùng hệ khu** (trước đây 5/6 loài dồn ở Đại Dương Thần Thoại, 3 loài hệ Ánh Sáng):
  Bến Tân Thủ – Thái Cổ Thần Ngư (Thổ) · Biển Nhiệt Đới – Tiên Ngư Hồng Ngọc (Mộc) · Vương Quốc Kim Loại – **Kim Lân Thần Ngư** (Kim, loài mới) · Biển Lửa – Diễm Ma Thâm Hải (Hỏa) · Băng Giá – Thần Ngư Bắc Cực (Thủy) · Vực Sâu Bí Ẩn – Huyền Minh Long Ngư (Bóng Tối) · Đại Dương Thần Thoại – Phượng Hoàng Biển (Ánh Sáng). Tỉ lệ gặp cực hiếm (< 0,6% mỗi lần cá cắn). Hệ cố định theo loài → **cá đã câu cũng đổi sang hệ mới**.
- **Biểu tượng menu sảnh vẽ mới** đồng bộ phong cách game: giỏ cá, sạp hàng, sách sưu tập, bánh răng, kiếm & khiên, trứng lai, cờ đua, đài phun nước quảng trường, vòng quay, cuộn nhiệm vụ, hộp quà, cúp, khiên hội. Chữ dài trên nút tự thu nhỏ cho vừa.

## [0.39.1] – 2026-11-23 – Ký hiệu ĐB-1…ĐB-5, Bộ Sưu Tập chia vùng
### Thay đổi
- Dạng đột biến ghi bằng **ký hiệu ĐB-1 … ĐB-5** (ĐB-1 phổ biến nhất 45% → ĐB-5 hiếm nhất 3%) thay cho phân loại bằng màu / tên cấp bậc.
- **Bộ Sưu Tập chia vùng theo cấp bậc**: thanh chọn Tất cả · Boss · Thần Thoại · Huyền Thoại · Sử Thi · Quý · Hiếm · Thường (kèm số đã khám phá), mỗi vùng chỉ hiện loài của vùng đó.

## [0.39.0] – 2026-11-23 – Hình cá Boss mới, cá lai theo bố mẹ, giới tính, biến dị có cấp bậc
### Thêm / Thay đổi
- **21 loài Boss & Thần Thoại mỗi loài một kiểu dáng riêng** (cá trê già, cá mập đầu búa, rồng cuộn, kỳ lân biển mõm kiếm, rắn biển, cá vây tay cổ đại, cá voi, cá nóc bông…) + **nét nhận diện luôn hiện** (gạc, vương miện pha lê, mào lửa, bờm, mây, vây cánh), lớn & đẹp dần theo giai.
- **Cá lai mang dáng của chính bố & mẹ**: đầu/mõm/mắt/râu/nét đầu theo BỐ, đuôi/vây/bờm/mây theo MẸ, tỉ lệ thân mới, thân pha màu 2 bên; con của Kraken có xúc tu; bậc lai cao dùng bộ tiến hoá (Siêu Boss ~ Trung Giai … Gen Lặn ~ Thánh Giai). Hiện đúng ở Kho Cá, thẻ chọn, Đảo Lai Tạo, trận 3vs3, Quảng Trường.
- **Giới tính ♂ / ♀**: mỗi con cá 1 giới tính cố định (cá cũ gán theo mã cá, không đổi). Lai tạo cần **1 đực (bố) + 1 cái (mẹ)**; ô Bố ♂ / Mẹ ♀ tự xếp theo giới tính. Cá nở ra có giới tính ngẫu nhiên.
- **Biến dị theo hệ có cấp bậc** (giữ hệ viên đá): mỗi viên đá 5 dạng – Thường 45% (cân bằng) · Hiếm 27% (chuyên MÁU) · Hiếm 15% (chuyên THỦ) · Cực Hiếm 10% (chuyên CÔNG) · Thần Thoại 3% (toàn diện + tốc). Ví dụ Lõi Dung Nham: Hỏa Viêm · Lục Hỏa · Lam Hỏa · Hắc Hỏa · Kim Hỏa. Lông Phượng Thần: 4 dạng thần mạnh hơn. *Cá đã đột biến đổi chỉ số theo bảng mới.*
- **Gai / lửa biến dị mọc theo sống lưng thật của từng loài**, to dần theo giai (Sơ ×0,85 → Thánh ×1,3).
- **Bộ Sưu Tập**: phân nhóm theo cấp bậc (Boss → Thường, kèm số đã khám phá); cá Boss/Thần Thoại/Huyền Thoại có nút **🌱 Các giai tiến hoá** (4 giai) và **🧬 Các dạng đột biến** (theo từng viên đá: cấp bậc, tỉ lệ, chỉ số).
- **Đua Cá** và **Quảng Trường** vào bảng menu ở sảnh.
- **Danh sách có thanh trượt** (thay lật trang): Kho Cá, chọn đội Đấu Cá, phòng đấu người, Lai Tạo, Bảng Xếp Hạng, Danh Hiệu.
### Kiểm thử
- 229 unit test (mới: giới tính khi lai, loài bố mẹ lưu ở cá con, biến dị có cấp bậc & tỷ lệ 45/27/15/10/3 trên 20.000 lần); E2E Đảo Lai Tạo, 3vs3, Đấu Cá, Bộ Sưu Tập, Kho Cá chọn nhiều, Đua Cá, Tài khoản, câu cá. E2E Quảng Trường chập chờn từ trước (lỗi cả ở bản cũ) – theo dõi riêng.

## [0.38.2] – 2026-11-23 – Sửa lỗi hiệu ứng cá đột biến / trưởng thành
### Sửa
- Cá đã **Tiến hoá hệ (đột biến)** và cá **trưởng thành** (Trung/Cao/Thánh Giai): hào quang, tia sét, mây vẽ tràn khung hình bị cắt thành **vệt màu vuông** trong ô Kho Cá / chọn đội → nay mép hình mờ dần tròn mềm.
- Khung chi tiết Kho Cá và thẻ chọn cá: nền sáng sau cá dùng hạt lấp lánh phóng to (thành **dấu chữ thập** loang màu) → thay bằng quầng sáng tròn mềm.

## [0.38.1] – 2026-11-23 – Sửa "Hãy đồng bộ tài khoản trước khi đấu"
### Sửa
- Vào trận 3vs3 với máy (đã đăng nhập), tạo / vào phòng, chốt đội: game **đẩy bản lưu mới nhất lên máy chủ trước**; đồng bộ lỗi thì báo đúng lỗi (vd mất mạng, máy đang dùng bản cũ) thay vì để máy chủ từ chối.
- Máy chủ (`battle`, `pvp`) báo rõ từng trường hợp: chưa có bản lưu trên máy chủ / bản lưu không hợp lệ (kèm mục dữ liệu bị lỗi, ghi nhật ký máy chủ) / lỗi đọc dữ liệu – thay cho một câu chung "Hãy đồng bộ tài khoản".
- Test: bản lưu có dữ liệu Đảo Lai Tạo (trứng, cá 2 hệ, hệ ẩn) hợp lệ với bộ kiểm tra của máy chủ.

## [0.38.0] – 2026-11-23 – Đảo Lai Tạo
### Thêm
- **Đảo Lai Tạo** (nút 🥚 Lai Tạo ở sảnh), chuyển từ bản đồ nguyên mẫu `docs/prototypes/dao-lai-tao.html` vào game:
  - **Bể Nuôi Thả**: mọi cá từ Boss trở lên (Boss, Thần Thoại, cá lai) tự bơi trong bể, càng hiếm càng to (Boss Lai ×1 · Siêu Boss ×1.15 · Mythic ×1.3 · Gen Lặn ×1.4). Mỗi 30 phút hiện 🪙 trên đầu cá → bấm để thu vàng (40/60/100/180/300 theo bậc, ghi sổ). Bấm cá xem thông tin / đặt làm bố mẹ.
  - **Hang Ấp Trứng**: 3 ổ (ổ 1 mở sẵn, ổ 2: 2.000 vàng, ổ 3: 60 kim cương), đếm ngược theo giờ thật, ⚡ Tăng tốc 1 kim cương / 3 phút còn lại, ✨ Ấp Nở có hiệu ứng rung–nứt–vỡ–chớp sáng; **Gen Lặn Cổ Đại** rung màn hình, chớp tím–vàng, băng rôn "THỨC TỈNH GEN LẶN CỔ ĐẠI!"; cá mới bơi từ hang vào bể.
  - Mục **Lai Tạo** riêng: chọn bố mẹ, xem trứng sẽ ra, thời gian ấp, bảng tỷ lệ 58% / 30% / 10% / 2%.
- **Mọi cặp cá từ Boss trở lên đều lai được**: 2 công thức đặc biệt (Lão Ngư Sừng Sắt + Bạo Chúa San Hô → Trứng Thiết San Hô 30 phút; Thủy Quái Kraken + Phượng Hoàng Biển → Trứng Hỏa Thủy Thần Thú 45 phút, mỗi cặp 4 cá lai vẽ tay) và **28 dòng lai theo hệ** của bố mẹ × 4 bậc = **112 dạng lai** có hình riêng (thân theo hệ bố, vây/mắt theo hệ mẹ, đặc điểm 2 hệ cộng dồn theo bậc: sừng thép, gai đá, san hô lá, lửa, gai pha lê, cánh lửa/ánh sáng, vương miện, giáp nứt phát quang, vòng cổ ngữ).
- **Trứng mang màu cá bố mẹ** (nửa trên màu cá bố, nửa dưới màu cá mẹ).
- **Hệ của cá lai**: mang **2 hệ** (hệ chính của cá bố + cá mẹ); cá **Gen Lặn** thêm **1 hệ ẩn** (khác 2 hệ bố mẹ; chủ cá thấy mờ kèm chữ "ẩn", đối thủ chỉ thấy "?"). Khắc hệ nhiều hệ trong trận 3vs3: mỗi hệ bên đánh nhân qua mọi hệ bên bị đánh, chọn hệ có lợi nhất, giới hạn ×0.75–×1.5 (máy chủ `battle` / `pvp` đã cập nhật).
- **Tiến hoá cá lai**: 4 giai Sơ → Trung (mắt sáng, hào quang, sừng, gai lưng) → Cao (cánh, giáp, xúc tu lửa) → Thánh (vương miện, vòng cổ ngữ, cánh pha lê, giáp nứt phát quang), lớn dần theo giai.
- Boss mới **Thủy Quái Kraken** (Vực Sâu Bí Ẩn, Boss phụ, hệ Bóng Tối) – bố/mẹ của dòng Hỏa Thủy Thần Thú.
- Kết quả nở được định sẵn theo seed lưu trong trứng (tải lại trang không đổi được kết quả); cá bố mẹ không bị mất. Bộ sưu tập chỉ hiện cá lai đã từng có; cá lai không xuất hiện ở khu câu hay đối thủ đua.
### Kiểm thử
- 227 unit test (mới: công thức & tỷ lệ 58/30/10/2 trên 20.000 trứng, mọi cặp Boss đều lai được, 116 hình không trùng, mở ổ/tăng tốc/ấp nở/thu hoạch ghi sổ, 2 hệ + hệ ẩn, khắc nhiều hệ); E2E `breeding.cjs` chơi thật cả luồng; toàn bộ E2E cũ.

## [0.37.0] – 2026-11-23 – Đấu cá với NGƯỜI + thua mất cá lực chiến thấp nhất
### Thêm
- **Đấu 3vs3 với người (phòng)** – tab 👥 Đấu với người: chọn mức **💀 Sinh tử** / **🤝 Giao hữu** → **Tạo Phòng** (mã 6 ký tự, chờ 60 giây), **Vào bằng mã phòng**, hoặc **⚔ Mời** bạn bè (phòng riêng). Lời mời hiện ở mọi màn (trừ lúc đang đấu/đua) với đếm ngược theo giờ máy chủ, Nhận đấu / Từ chối.
- **Chọn đội bí mật 30 giây** (màn Phòng Đấu): máy chủ giữ kín đội hình (cột đội hình không cấp quyền đọc), chỉ báo "đối thủ đã chốt ✓"; hết giờ còn bên chưa chốt → **huỷ trận**.
- **Máy chủ làm trọng tài cả 2 người** – Edge Function `pvp` + bảng `pvp_rooms` (migration `20261208000001_pvp_rooms`, RLS: chỉ thấy phòng mình liên quan): đúng lượt mới được đánh, lệnh trùng bị từ chối, quá giờ lượt → tự phòng thủ, **3 lượt liên tiếp không đánh → xử thua**, thoát giữa trận = bỏ cuộc, mất mạng tự kết nối lại (hỏi lại máy chủ).
- **Kết quả trận 3vs3** (`applyCombatOutcome` trong `packages/shared`, có test, chống áp 2 lần bằng txId):
  - **THUA → mất con cá LỰC CHIẾN THẤP NHẤT trong đội** (đấu máy và Sinh tử). Đấu người: con cá bị mất do máy chủ chốt lúc chọn đội.
  - Thắng máy: vàng + KN theo độ khó (Dễ 150 / Thường 350 / Khó 800 vàng) + cá nướng. Thắng người (Sinh tử): nhận chính con cá đối thủ bị mất dạng cá nướng (không sinh vàng – chống nuôi tài khoản phụ). Giao hữu: không mất, không thưởng.
  - **Bỏ cuộc / thoát giữa trận = THUA** (có hộp xác nhận). Mở trận mới khi còn trận dang dở → trận cũ tính thua; trận bỏ dở > 15 phút cũng tính thua khi mở game. Kết quả chưa ghi (mất mạng/đóng game) được kết toán ở lần mở game sau.
  - **Cá khoá 🔒 không được ra trận** (được bảo vệ khỏi bị mất).
- Edge Function `battle`: thêm `op: forfeit`; bảng `battles` thêm cột `settled` + hàm `mark_battle_settled`.
### Kiểm thử
- 218 unit test (mới: thua mất đúng con yếu nhất, cá khoá, thưởng thắng, giao hữu/sinh tử, góc nhìn đảo bên); DB test phòng đấu (không đọc được đội hình bí mật, không tự sửa/tạo phòng, người ngoài không thấy); `deno check` 2 hàm máy chủ; E2E `combat3.cjs` thêm kết toán thắng/thua + bỏ cuộc giữa trận.

## [0.36.1] – 2026-11-23 – Đấu Cá: chỉ còn bản 3vs3 mới
### Thay đổi
- Gỡ **Đấu Sinh Tử bản cũ** (đấu 1 lần tự động, thua mất cá) cả với máy lẫn với người: bỏ tab cũ, màn trận cũ `BattleScene`, ghép trận ngẫu nhiên cũ. Nút ở sảnh đổi tên **Đấu Cá**.
- Màn Đấu Cá còn 3 tab: **⚔ Đấu 3vs3 với máy** (mặc định; Dễ/Thường/Khó là độ giỏi của MÁY), **👥 Đấu với người 🔒** (hiển thị khoá + nội dung Giai đoạn 6), **🍖 Cá nướng** (cá nướng đã có vẫn cho nhân vật ăn được).
- Nút "⚔ Đấu" ở hồ sơ/bạn bè/hội mở tab Đấu với người (khoá, nêu tên đối thủ) thay vì trận cũ.
- Dữ liệu cũ giữ nguyên: thống kê thắng/thua, cá nướng, kết quả trận cũ đang chờ đồng bộ.

## [0.36.0] – 2026-11-23 – ĐẠI TU GĐ3: Chiến đấu 3vs3 theo lượt
### Thêm
- **Lõi trận 3vs3** (`packages/shared/src/combat.ts`, thuần & tất định – game và máy chủ dùng chung): 3 cá mỗi bên theo thứ tự xuất trận; cá NHANH hơn đi trước rồi luân phiên, cá mới vào sân so lại tốc độ (bằng nhau → tung đồng xu theo seed); hạ đủ 3 cá là thắng, không hồi sinh, không đổi đội giữa trận.
- **Thanh canh lực thật**: kim chạy qua lại theo thời gian thực (tham số thanh mỗi lượt tính từ seed trận), vùng ĐỎ ×0.1 (ĐÒN HỤT) · VÀNG ×0.7 (ĐÁNH YẾU) · XANH ×1.25 (ĐÁNH MẠNH) · PERFECT giữa vùng xanh (thành tích); bấm nút / chạm thanh / phím Space; khoá sau lần bấm đầu.
- **Sát thương = MAX(1, ATK × canh lực × nguyên tố × kỹ năng − DEF)** (chỉ số trận: DEF ×0.35, HP trận theo ATK để mỗi cá chịu ~4–5 đòn mạnh – mô phỏng cân bằng).
- **Kỹ năng riêng mỗi cá** (tên theo loài, độ mạnh riêng 0.9–1.15, cơ chế theo hệ): Kim giảm sát thương · Mộc hồi máu · Thủy đòn ×1.6 · Hỏa tăng ATK · Thổ đánh + giảm DEF · Bóng tối hút máu · Ánh sáng thanh tẩy; hồi chiêu 3 lượt. **Phòng thủ** giảm 40% đòn kế tiếp (không cộng dồn, hết sau khi nhận đòn). **Combo** xanh liên tiếp chỉ hiển thị.
- **Máy chủ làm trọng tài** – Edge Function `battle` + bảng `battles` (migration `20261207000001_battles`, RLS: chỉ đọc trận của mình, chỉ máy chủ ghi): đội đọc từ bản lưu trên máy chủ (kiểm quyền sở hữu, đủ 3, không trùng), 1 lệnh/lượt (cập nhật kèm điều kiện lượt – lệnh trùng bị từ chối 409), quá giờ lượt → tự PHÒNG THỦ, thời điểm bấm khai vượt thời gian thực máy chủ đã chờ → ĐÒN HỤT, giới hạn mở trận. Kết nối lại bằng `op: get`.
- **Máy (AI)** biết khắc hệ, máu, kỹ năng, phòng thủ; canh lực theo độ khó.
- Màn **Đấu Sinh Tử → tab ⚔ Đấu 3vs3** (luyện tập, không mất cá, dùng được cá đã khoá) và màn trận **Combat3Scene** (đấu trường nước, huy hiệu hệ, thanh máu + chỉ số, hiệu ứng KHẮC CHẾ!/BẤT LỢI!/ĐÁNH MẠNH/HỤT/COMBO, đồng hồ lượt, cá mới xuất trận, kết quả). Đăng nhập → trận chạy trên máy chủ; chơi không tài khoản → lõi trận chạy trên máy.
- Cấp mở khu: 5 khu ngũ hành mở hết trước cấp 15 (Biển Lửa & Băng Giá cấp 15), Vực Sâu (Bóng Tối) cấp 35, Đại Dương Thần Thoại (Ánh Sáng) cấp 40.
### Kiểm thử
- 213 unit test (mới: thanh canh lực, công thức sát thương, vùng đỏ 10%, phòng thủ 40%, lượt & tốc độ, hạ gục/xuất trận/thắng, kỹ năng hồi chiêu, combo, AI, trọng tài máy chủ, dựng đội từ bản lưu); DB test bảng `battles`; `deno check` Edge Function; E2E `combat3.cjs` chơi thật cả trận bằng canh lực theo thời gian thực + toàn bộ E2E cũ.

## [0.35.0] – 2026-11-22 – ĐẠI TU GĐ2: Hệ thống 7 nguyên tố & khắc chế
### Thay đổi lớn
- **7 nguyên tố**: Kim, Mộc, Thủy, Hỏa, Thổ, Bóng Tối, Ánh Sáng (thay hệ cũ; Băng gộp vào Thủy, Lôi → Kim). Bảng hiển thị chung `ELEMENT_INFO` (tên, màu) + **biểu tượng vẽ thủ tục duy nhất cho mỗi hệ** (`art/ElementArt.ts`).
- **Khắc chế** (`packages/shared/src/elements.ts` – nguồn sự thật duy nhất, Edge Function dùng chung): Kim>Mộc>Thổ>Thủy>Hỏa>Kim, Bóng Tối⇄Ánh Sáng. **×1.5 / ×1.0 / ×0.75**; trận đấu hiện "KHẮC CHẾ!" / "BẤT LỢI!".
- **Hệ theo khu**: Bến Tân Thủ = Thổ, Biển Nhiệt Đới = Mộc, **Vương Quốc Kim Loại = Kim (khu mới)**, Biển Lửa = Hỏa, Vùng Băng Giá = Thủy, Vực Sâu Bí Ẩn = Bóng Tối, Đại Dương Thần Thoại = Ánh Sáng. Mỗi loài ĐÚNG 1 hệ (loài sống nhiều khu lấy hệ khu chính; Huyền Minh Long Ngư = Thủy, Diễm Ma Thâm Hải = Hỏa cố định). Mỗi con cá lưu `element` trong bản lưu (cá cũ tự gán theo quy tắc khi mở game, không đổi cấp/chỉ số).
- **Khu thứ 7 – Vương Quốc Kim Loại** (cấp 10, độ khó 3): 8 loài hệ Kim + Boss **Kim Long Đế** + Boss siêu hiếm **Cá Kim Tiền Tí Hon**, cảnh tháp thép & bánh răng vàng.
- **Vực Sâu Bí Ẩn chuyển xuống cấp 26, độ khó 5**; chỉ số / độ khó câu của cá Vực Sâu tăng theo (tier 3 → 5), cá Kim tier 3.
- Chiêu đặc biệt trận tự động theo hệ: Giáp Kim Cương, Sinh Mệnh, Thủy Triều, Bùng Cháy, Địa Chấn, Hút Sinh Lực, Thanh Tẩy. Thể đột biến không còn đổi hệ.
- Biểu tượng nguyên tố ở: Kho Cá (lưới + chi tiết), Bộ Sưu Tập, Đấu Sinh Tử, màn Trận đấu, kết quả câu cá, Hồ sơ / trưng bày, Chọn Khu Vực.
### Kiểm thử
- 195 unit test (mới: bảng khắc chế 7×7, ánh xạ khu → hệ, 1 hệ/loài, gán hệ bản lưu cũ), typecheck, lint; E2E smoke, Bộ Sưu Tập, Đấu Sinh Tử, Thời trang, Chọn nhiều, Tài khoản, Đua cá.

## [0.34.0] – 2026-11-22 – Tiến hoá hệ (5 hệ) → 4 giai đoạn trưởng thành · Hình Đá Tiến Hoá
### Thay đổi
- Cá Huyền Thoại / Boss / Thần Thoại phát triển theo 2 bước:
  1. **🧬 Tiến hoá hệ**: dùng vật phẩm của 1 trong **5 hệ** (Long – Ngọc Long Hồn, Hỏa – Lõi Dung Nham, Băng – Tinh Thể Băng Hà, Lôi – Sấm Thạch, Thần – Lông Phượng Thần) → chắc chắn thành 1 dạng của hệ đó. **Chỉ 1 lần**, không đổi hệ được nữa.
  2. **🌱 4 giai đoạn trưởng thành** (Sơ → Trung → Cao → Thánh Giai): vàng + linh hồn + đá + **Đá Tiến Hoá của chính hệ đó** (1/2/3 viên). Chưa tiến hoá hệ thì chưa lên giai được.
- 3 đá U Minh / Thánh Quang / Địa Mạch thành **đá vạn năng** (thay đá mọi hệ), ngừng rơi; Lông Phượng Thần cũng thay được đá mọi hệ.
- **Vẽ lại hình 8 loại Đá Tiến Hoá** (trước là emoji): quả cầu rồng, lõi dung nham nứt lửa, cụm pha lê băng, đá sét, lông phượng, đá vạn năng mài mặt. Hiện ở bảng Tiến hoá hệ và thông báo rơi đồ.
- Màn câu cá: **cột nút góc phải trên** (từ trên xuống) Câu tự động → Túi đồ → Chat, cùng cỡ; thước Lực căng dời xuống – không còn che thanh máu cá.

## [0.33.1] – 2026-11-22 – Nút câu cá to hơn, Túi đồ, chọn tất cả trừ Boss
### Thay đổi
- Màn câu cá: nút **← Về / Câu tự động / Chat** to hơn (cao 66px, chữ 23–26) cho dễ bấm trên điện thoại; thêm nút **🎒 Túi đồ** (mở Kho Cá, bấm Về quay lại đúng khu đang câu; đang kéo cá thì báo câu xong trước).
- Kho Cá → Chọn nhiều: thêm **"Chọn tất cả trừ Boss trở lên"** (chọn mọi cá không khoá trừ Boss & Thần Thoại). E2E `tests/e2e/inventory-select.cjs`.
- Huyền Minh Long Ngư vẽ lại thanh thoát hợp tên: vảy chỉ ánh nhẹ để lộ dải ngân hà, sừng mảnh, mõm giữ dáng tròn, bờm lụa mềm, vây má trong suốt, mày vàng mảnh, mắt ngọc lam → tím ngân hà theo giai.

## [0.33.0] – 2026-11-22 – Tiến hoá giai đoạn: giữ dáng gốc, mỗi loài một bộ chi tiết riêng
### Thay đổi
- Bỏ kiểu biến mọi loài thành cùng một khuôn (rồng cuộn / cầu gai). Nay **mỗi loài giữ dáng gốc của chính nó** rồi lớn dần qua 4 giai, kèm **bộ chi tiết tiến hoá riêng** chọn theo loài (`evoFeatures`): đồ đầu (sừng nai phân nhánh / sừng nhọn / vương miện pha lê / mào lửa), thân (vảy giáp / gai quanh thân / sọc phát sáng), thêm (bờm bay / mây bông / vây cánh). Vây, đuôi, gai lưng, sừng dài dần; Cao Giai vây lưng màu điểm nhấn; Thánh Giai cánh tiên + thân ngân hà. Test bảo đảm không 2 loài trưởng thành nào trùng dáng.
- **Huyền Minh Long Ngư**: giữ đúng hình gốc, thêm dần vảy rồng viền vàng, gai lưng cao, bờm lửa + bờm lụa, sừng to thêm nhánh, vây má nhọn, mõm dài nhọn, nanh dài, gai mày, mắt vàng → đồng tử dọc, ngọc thần trên trán (Thánh Giai), đuôi lụa dài nhiều dải.
- Diễm Ma Thâm Hải & Tiên Ngư Hồng Ngọc giữ hình gốc ở mọi giai (lớn dần + hiệu ứng giai).

## [0.32.2] – 2026-11-22 – Huyền Minh Long Ngư giữ đúng dáng gốc khi trưởng thành
### Sửa lỗi
- Huyền Minh Long Ngư từ Trung Giai trở lên bị vẽ thành cá mập tròn: nay giữ dáng rồng nước thân mảnh, gai lưng vàng, đuôi lụa trắng như hình gốc rồi mới cuộn thành rồng ở Cao/Thánh Giai.

## [0.32.1] – 2026-11-22 – Cá trưởng thành BIẾN DÁNG thật
### Thay đổi
- Thân cá Huyền Thoại / Boss / Thần Thoại biến đổi rõ theo giai (như ảnh mẫu):
  - **Nhóm dài** (rồng, lươn, cá dài): Trung Giai uốn chữ S, gai lưng vàng, sừng rồng, râu, đuôi bướm hoa văn → Cao Giai thành **rồng dựng đứng cuộn chữ S**, mõm rồng, bờm bay, vảy giáp vàng → Thánh Giai thân dài hơn, sừng dài phân nhánh, cánh tiên, thân ngân hà.
  - **Nhóm tròn**: Trung Giai tròn mập, đầu & mắt to, đuôi bướm → Cao Giai tròn như quả cầu, **gai pha lê mọc quanh thân**, sừng, mây bông, vây sứa dài → Thánh Giai gai dài hơn, cánh tiên lớn.
- **Ánh mắt ngầu dần**: Trung Giai mống mắt màu + gờ mày; Cao Giai mắt phát sáng, mí xếch, mày vàng; Thánh Giai đồng tử dọc như thần thú.
- Thánh Giai có đàn cá nhỏ phát sáng bơi quanh; vòng phù văn, vầng hào quang.
- 3 cá thần thoại có hình riêng: Sơ Giai giữ hình riêng, từ Trung Giai trở lên biến dáng như mọi loài.

## [0.32.0] – 2026-11-22 – Quà trong Hòm Thư có nút Nhận · Cá trưởng thành theo giai đoạn
### Thêm
- **Quà đính kèm thư + nút "🎁 Nhận quà"** (vàng, kim cương, đá, Đá Tiến Hoá, cá). Bấm nhận → cộng vào tiến trình đang chơi (mã txId chống nhận trùng, ghi sổ), lưu ngay lên tài khoản, máy chủ đánh dấu đã nhận. Nút Hòm Thư ở sảnh đếm cả thư còn quà chưa nhận. Migration `20261206000002_mail_rewards`.
- Thư đền bù lỗi lưu 21–22/11 của 4 người chơi đã gắn quà: Chư Ngọc Lão Tôn (quà cộng thẳng hôm trước bị máy có tiến trình cấp 30 ghi đè) nhận lại đủ 550.000 vàng, 1.000 kim cương, Băng Đế Hải Xà thể Thiên Thần Ngư; 3 người còn lại dùng đúng mã giao dịch cũ nên không nhận trùng.
- **Trưởng thành theo giai đoạn** cho cá **Huyền Thoại (siêu hiếm), Boss, Thần Thoại**: Sơ Giai → Trung Giai → Cao Giai → Thánh Giai. Lên giai bằng vàng + Mảnh Linh Hồn + Đá Nâng Cấp + **Đá Tiến Hoá đúng hệ** (1/2/3 viên), không cần hợp cá cùng loài. Cấp tối đa theo giai 15/25/35/50.
- 7 Đá Tiến Hoá theo hệ (thêm U Minh Thạch – Ám, Thánh Quang Thạch – Quang, Địa Mạch Thạch – Thổ); Lông Phượng Thần thay được mọi hệ.
- Hình theo giai: Trung Giai vây to, viền vàng, bong bóng lấp lánh; Cao Giai vương miện pha lê, dải lụa, vòng phù văn; Thánh Giai vầng hào quang toả nắng, cánh tiên, thân ngân hà. Cá càng trưởng thành hiển thị càng lớn (Kho Cá, trận đấu, Đấu Sinh Tử, hồ sơ).
### Thay đổi
- **Bỏ đột biến bằng vật phẩm** (không biến sang dạng khác nữa); cá đã đột biến giữ nguyên dạng. Cá thường vẫn tiến hoá sao ★ như cũ.
- Trang trí của thể đột biến (vương miện, vầng hào quang, râu rồng) bám đúng đầu cá theo dáng mới của từng loài.
- `parseHex` đọc được màu `rgba()` (sửa màu bị đen ở vài hiệu ứng).

## [0.31.0] – 2026-11-22 – Cá phong cách chibi vector, mỗi loài một dáng
### Thay đổi
- Vẽ lại toàn bộ cá theo phong cách **chibi vector hoạt hình** (thân bóng, viền cùng tông màu, vảy sáng, mắt to long lanh, ngóc đầu như đang nhảy) – vẽ bằng code, không tốn tài nguyên tải.
- **Mỗi loài một hình dáng riêng**: dáng thân (tròn mập / dài / dẹt / thân rắn chữ S), mõm (tù, nhọn, hếch, mũi kiếm, đầu búa), miệng, đuôi (chẻ, tròn, quạt, lưỡi liềm, roi, lửa…), vây lưng (gai, buồm, sóng, mào…), râu, đèn lồng. Có test bảo đảm không loài nào trùng dáng (`fishMorph.ts`).
- 3 cá thần thoại có hình vẽ riêng giữ nguyên.
- Huyền Minh Long Ngư: đuôi lụa vẽ đè lên và neo sâu vào thân, thân vuốt nhọn ở đuôi – hết lỗi đuôi bị cắt cụt.
- Bộ vẽ cũ giữ lại dưới tên `drawClassicFish`.

## [0.30.1] – 2026-11-22 – Skin không còn che mũ / phụ kiện
### Thay đổi
- Skin tách thành phần: phần THÂN (áo, đồ sau lưng) luôn hiện; **mũ** đang đội thay phần mũ của skin, **phụ kiện** đang đeo thay phần mặt / đồ cầm tay của skin. Ô nào trống thì vẫn hiện phần đó của skin như cũ. Cánh, sừng vẫn hiện cùng skin.
- Chỉ số thưởng của đồ không đổi.

## [0.30.0] – 2026-11-22 – Hòm Thư hệ thống
### Thêm
- **📬 Hòm Thư** ở sảnh (dưới nút Đua Cá): thư Ban Quản Trị gửi riêng từng người (đền bù, thông báo). Có thư chưa đọc → tự mở khi vào sảnh; nút hiện số thư chưa đọc.
- Bảng `system_mail` (migration `20261206000001_system_mail`): người chơi chỉ đọc thư của mình, không tự gửi được; RPC `mark_mail_read`. Thư chỉ để thông báo – phần thưởng cộng thẳng qua sổ giao dịch.
- Đã gửi thư đền bù lỗi lưu 21–22/11 cho 4 người chơi (cấp, cá, vàng, kim cương đã cộng có ghi sổ).
- Test: DB (RLS hòm thư), E2E tài khoản (thư tự hiện, mở → đã đọc).

## [0.29.2] – 2026-11-22 – Báo rõ khi không lưu được lên tài khoản
### Thêm
- Thanh trên cùng: lưu lên tài khoản thất bại liên tiếp → nhãn đỏ "⚠️ Chưa lưu – bấm thử lại" (bấm để lưu ngay). Không còn lỗi lưu âm thầm như đợt 21–22/11.
- Lưu lỗi tự thử lại mỗi 20 giây kể cả khi người chơi đứng yên.
- E2E tài khoản: máy 6 giả lập máy chủ lỗi lưu → phải hiện cảnh báo, bấm thử lại → lưu được.

## [0.29.1] – 2026-11-22 – Tự tìm lại tiến trình bị lỡ trên máy
### Sửa lỗi
- Đợt máy chủ từ chối lưu (21–22/11) làm tiến trình chỉ còn trên máy/trình duyệt đã chơi. Khi đăng nhập, game giờ dò cả các bản cất trên máy (`dccc_save_v1_backup_*`): bản nào CÙNG người chơi với tài khoản mà cấp/số cá cao hơn → tự dùng lại và tải lên tài khoản, báo "Đã tìm lại tiến trình cấp X…".
- Không lấy lại tiến trình cũ hơn lần người chơi tự "Chơi lại từ đầu".
- E2E tài khoản thêm bước máy 5 (tìm lại tiến trình còn cất trên máy).

## [0.29.0] – 2026-11-22 – Sửa đồng bộ tiến trình điện thoại ↔ máy tính
### Sửa lỗi
- **Máy chủ chặn nhầm mọi lần lưu** (nguyên nhân "kẹt lv29" / không đồng bộ): một bản guard gắn thêm trên máy chủ (`trg_player_saves_guard`) so `save_version` (phiên bản định dạng, luôn là 8) rồi tự tăng nó sau mỗi lần ghi → từ lần ghi thứ 2 trở đi mọi lần lưu bị từ chối. Đã gỡ, đưa `save_version` về đúng, thay bằng guard mới (migration `20261205000001_stale_save_guard`).
- Guard mới: chặn bản lưu làm TỤT cấp/số cá (máy cũ) hoặc mang tiến trình của tài khoản khác, lỗi `STALE_SAVE`. Ngoại lệ khi bản lưu có `resetAt` mới (Chơi lại từ đầu / Nạp mã sao lưu).
- Game: khi máy chủ báo `STALE_SAVE` → tự tải tiến trình mới nhất từ tài khoản (cất bản trên máy làm sao lưu), báo "☁️ Đã tải tiến trình mới nhất từ tài khoản".
- Đăng nhập trên máy thứ 2: so **tiến trình** (cấp, số cá) trước, thời gian lưu chỉ phân xử khi ngang nhau – máy để lâu không còn ghi đè máy kia.
- Khôi phục tài khoản bị chép nhầm dữ liệu của người khác về bản sao lưu của chính chủ.

## [0.28.5] – 2026-11-20 – Khung chat câu cá to hơn nữa
### Thay đổi
- Khung chat lúc câu cá to hơn nữa: 700×302, chữ tin nhắn cỡ 21, tiêu đề 24, ô nhập chữ 22 (cao 54), nút Gửi/▾ to hơn.
- Khi mở khung chat, dòng hướng dẫn ("CÁ CẮN! BẤM NGAY!", "Kéo!"…) tự dời sang bên phải phía trên nút KÉO để không bị che; thu gọn chat thì về chỗ cũ.

## [0.28.4] – 2026-11-20 – Khung chat câu cá to hơn
### Thay đổi
- Khung chat lúc câu cá to hơn, dễ đọc trên điện thoại: khung 560×234 (trước 430×186), chữ tin nhắn cỡ 16 (trước 13), tiêu đề 19, ô nhập chữ 18 và cao hơn, nút Gửi và nút ▾ thu gọn to hơn; mỗi dòng hiện tới ~62 ký tự.

## [0.28.3] – 2026-11-20 – Nút chat câu cá luôn hiện
### Sửa
- Nút **💬 Chat** trong màn câu cá giờ **luôn hiện**. Trước đây nếu lúc vào game tài khoản chưa kết nối được máy chủ (mạng chập chờn) thì nút bị ẩn hoàn toàn → người chơi không thấy phần trò chuyện. Giờ bấm vào sẽ báo lý do và cách khắc phục.

## [0.28.2] – 2026-11-20 – Thu gọn khung chat câu cá
### Thêm
- Khung chat lúc câu cá có thêm nút **▾** ngay góc khung để thu gọn (mở lại bằng nút "💬 Chat" ở thanh trên – nút hiện số tin mới khi đang thu gọn).

## [0.28.1] – 2026-11-20 – Khung chat lúc câu cá
### Thêm
- **💬 Khung chat ngay trong màn câu cá** (nút "💬 Chat" ở thanh trên, bấm để mở/thu gọn): xem 5 tin gần nhất của Chat Thế Giới (làm mới mỗi 4 giây), gõ + Enter để gửi, "Xem tất cả ›" mở Chat Thế Giới đầy đủ. Khi thu gọn, nút hiện số tin mới.
- Người **câu cùng khu** nói chuyện → **bong bóng chat trên đầu họ** ở bến xa.
- Bấm/gõ trong khung chat không bị tính là quăng/kéo cần (Space, Q… không lọt xuống game).

## [0.28.0] – 2026-11-20 – 3 thần ngư mới, tỉ lệ theo độ hiếm, Săn Boss đa dạng, kho đầy
### Thêm
- **3 Thần Ngư cực hiếm** (chỉ ở Đại Dương Thần Thoại, mỗi con ≈ 1/11.000 lần cá cắn), **hình vẽ riêng chi tiết**:
  - 🐉 **Huyền Minh Long Ngư** (Nước): rồng nước ngọc lam thân chữ S, vảy & gai lưng vàng, dải ngân hà lấp lánh trên thân, sừng vàng phân nhánh, bờm, râu rồng, đuôi lụa bay. Kỹ năng *Sóng Thần Thiên Đàn*.
  - 🔥 **Diễm Ma Thâm Hải** (Lửa): ác ma thân đen tím, vết nứt dung nham phát sáng, hàm há răng lởm chởm, mắt đỏ rực, sừng, gai lưng lửa, đuôi lửa, sét tím. Kỹ năng *Hỏa Ngục Phệ Hồn*.
  - 🌸 **Tiên Ngư Hồng Ngọc** (Ánh Sáng): cá hồng dễ thương, vương miện cầu vồng, sừng hồng, sọc gợn sóng phát sáng, mắt to có mi, má hồng, răng khểnh, lửa hồng & đốm sáng. Kỹ năng *Mộng Ảo Hồng Quang*.
- **Săn Boss bằng vé** giờ đa dạng: 91% Boss (mạnh hơn), 6% cá **Huyền Thoại**, 2% cá **Thần Thoại**, 1% **Boss siêu hiếm** (khu chưa có thì ra Boss).
- **Kho cá đầy (200/200) → không cho câu nữa** (không tốn lượt câu), hiện hộp báo + nút "🐟 Đến Kho Cá để bán".
### Thay đổi – tỉ lệ
- **Cá càng hiếm càng khó ra, Thần Thoại khó nhất** (ở mọi khu, mọi mức may mắn – có test kiểm tra): Huyền Thoại giảm ½, Thần Thoại giảm còn 1/10 (khu cuối ~0,13% thay vì 1,2%) – hiếm hơn cả Boss.
- **Boss bất ngờ khi câu thường giảm**: ~0,2% mỗi lần quăng (trước 0,5%), tối đa 0,4% dù may mắn cao. Boss siêu hiếm ~0,06%.

## [0.27.0] – 2026-11-20 – Khu cao cấp câu khó hơn + độ bền cần câu
### Thay đổi
- **Khu câu cao cấp khó hơn hẳn** (theo độ khó khu 1→6): cá dai hơn (máu tới ~×1,9 ở khu cuối), quẫy mạnh & kéo dây xa hơn, cửa sổ giật cần ngắn hơn (tới −25%), báo hiệu quẫy và lúc "cá mệt" ngắn hơn. Cùng con cá, cùng trang bị: khu khó kéo lâu hơn ≥1,4 lần và dễ xổng hơn.
### Thêm – 🔧 Độ bền cần câu
- Mỗi cần có **số lượt câu** tối đa theo độ hiếm (N 60 · R 80 · SR 100 · SSR 130 · UR 170 · LR 220) + thêm theo sao & cấp. Mỗi lần quăng tốn 1 lượt, **đứt dây tốn thêm 2**.
- Hết lượt: không quăng được, hiện hộp **🔧 Sửa cần** (vàng, tỷ lệ với độ mòn – sửa sớm rẻ hơn; cần càng xịn sửa càng đắt). Câu tự động hết lượt thì tự dừng.
- Màn câu cá hiện "🔧 còn/tối đa lượt" (vàng khi sắp hết, đỏ khi hết); màn Cần Câu hiện lượt câu + nút Sửa. Sửa cần ghi sổ cái.

## [0.26.2] – 2026-11-20 – Đua Cá: báo đúng thứ hạng về đích
### Sửa
- **Lỗi ai về đích cũng được báo "VỀ NHẤT"** khi đua với người chơi: trước đây mỗi máy chỉ đếm những tay đua nó tự tính (mình + máy), bỏ qua người chơi thật đã về trước. Giờ thứ hạng tính cả người chơi khác đã về đích → báo đúng **🥇 VỀ NHẤT / 🥈 VỀ NHÌ / 🥉 VỀ BA / VỀ ĐÍCH HẠNG N**.
- Còn người chơi khác bám sát mà chưa kịp báo về đích → hiện "🏁 VỀ ĐÍCH!" rồi báo hạng chính xác ngay khi có đủ thông tin (không đoán sai).
- Người chơi khác về đích → mọi người trong phòng thấy "🏁 X về NHẤT/NHÌ/…".
- Luôn gửi thời gian về đích ngay khi kết thúc (trước đây đua xong quá nhanh có thể chưa kịp gửi → người khác phải chờ và xếp sai).

## [0.26.1] – 2026-11-20 – Sửa lag điện thoại sau khi Đua Cá
### Sửa
- **Ảnh nền bản đồ đua không được giải phóng**: mỗi chặng tạo 1 ảnh lớn và giữ mãi trong bộ nhớ đồ họa (đo được 7MB → 56MB sau 3 cuộc đua) → điện thoại lag cả sau khi rời màn đua. Giờ ảnh trời vẽ ở nửa độ phân giải (nhẹ hơn 4 lần, nhìn không khác) và **được giải phóng khi rời màn Đua Cá** (về sảnh còn ~11MB, không tăng nữa).
- **Nhạc trận đấu/đua tạo bộ đệm âm thanh mới cho mỗi tiếng trống** (~10 lần/giây) → máy yếu phải dọn rác liên tục. Giờ dùng lại 1 bộ đệm.
- Màn chọn giải & màn kết quả không còn vẽ lại đường đua mỗi khung hình.
- Hiệu ứng nhẹ hơn: hạt thời tiết thưa hơn, vệt bóng mờ của đối thủ thưa hơn; **máy yếu (dưới 40 khung/giây) tự bật chế độ nhẹ** (chỉ giữ vệt của mình, thời tiết thưa gấp 3).
- Chuyển động lặp của chướng ngại được tắt khi ra khỏi màn hình.

## [0.26.0] – 2026-11-20 – Bắt buộc tài khoản, lời mời đua hiện bảng xác nhận, Cửa Hàng cuộn được
### Thay đổi
- **Vào game bắt buộc tạo tài khoản / đăng nhập** (bản có máy chủ): màn "Đăng Nhập Để Chơi" với lời chào và lợi ích; không vào được sảnh khi chưa đăng nhập. Máy đã có tiến trình chơi khách từ trước → **tạo tài khoản giữ nguyên tiến trình** và đưa lên máy chủ. Đăng nhập/tạo xong vào thẳng sảnh; đăng xuất → quay về màn đăng nhập. Mất mạng tạm thời khi đã có phiên đăng nhập vẫn chơi được trên máy.
### Thêm
- **Lời mời đua cá hiện bảng xác nhận** ở MỌI màn hình của người được mời: "🏁 X mời bạn đua cá!" + giải, bản đồ, số người, phí; **đếm ngược 10 giây** với ✅ Vào phòng / ✖ Từ chối – hết giờ tự từ chối. Đang đua thì chờ đua xong mới hiện. Chủ phòng thấy trạng thái lời mời (đang chờ / từ chối / không trả lời); chặn mời dồn dập cùng 1 người.
- **Cửa Hàng có thanh cuộn** (lăn chuột, kéo thanh cuộn, vuốt): xem hết đồ ở mọi tab, giữ vị trí cuộn khi chọn/mua đồ. Bộ Sưu Tập dùng chung khung cuộn này.
- Database: `race_invites` + RPC `race_my_invites`, `race_invite_respond`.

## [0.25.0] – 2026-11-20 – Đua Cá: phòng riêng mời bạn bè
### Thêm
- Nút **🏠 Phòng bạn bè** ở màn Đua Cá: **tạo phòng** (mã 6 ký tự, nút 📋 Chép) hoặc **nhập mã** để vào phòng bạn tạo.
- **📨 Mời bạn**: danh sách bạn bè (🟢 online lên đầu) → gửi lời mời qua tin nhắn; trong khung chat lời mời có nút **🏁 Vào phòng** – bấm là vào thẳng phòng.
- Trong phòng: tối đa 5 người, thấy cá + hạng đua của từng người, trạng thái ✅ Sẵn sàng; **chủ phòng 👑 đổi giải và bản đồ** (◀ ▶), đổi thì mọi người sẵn sàng lại.
- Đủ ≥ 2 người và ai cũng sẵn sàng → chủ phòng bấm **🏁 BẮT ĐẦU**: cả phòng xuất phát cùng lúc trên bản đồ đã chọn, máy lấp chỗ trống; đua xong tự quay lại phòng để **đua tiếp**. 🐟 Đổi cá rồi bấm "🏠 Về phòng"; chủ phòng rời → phòng đóng.
- Database: `race_lobbies`, `race_lobby_members` + RPC (chỉ mời được bạn bè đã kết bạn, chỉ chủ phòng đổi/bắt đầu, người ngoài không xem được phòng, tên lấy từ hồ sơ); phòng đua lưu thêm bản đồ.
### Sửa
- E2E Đua Cá ổn định hơn (bấm tăng tốc thử lại nếu vừa bị sứa/cá mập rút năng lượng).

## [0.24.0] – 2026-11-20 – 5 bản đồ đua, 3 chặng đổi cảnh, hộp may mắn
### Thêm – 🗺 Bản đồ đua (chọn ở màn Đua Cá, hoặc 🎲 Ngẫu nhiên)
Mỗi bản đồ có **3 chặng – khung cảnh đổi ở mốc 400m và 800m** (chuyển cảnh mờ dần, banner tên vùng, +15 năng lượng), **chặng sau dày và hiểm hơn chặng trước**; thời tiết riêng (lá bay, bong bóng, tuyết, tro, mưa, tàn lửa, bụi nước).
- 🏞 **Sông Quê**: Sông yên bình → Rừng đước → **Thác ghềnh** – *dòng nước ngang* đẩy lệch làn theo nhịp (đang tăng tốc / đang bay thì không bị đẩy).
- 🪸 **Rạn San Hô**: Rạn san hô → Đầm phá hoàng hôn → **Rãnh vực sâu** – *mạch phun* hất bay qua chướng ngại + tăng tốc; *xúc tu thủy quái* trồi/lặn (không nhảy qua được).
- 🧊 **Băng Hà** (cấp 5): Biển băng → **Bão tuyết** (mù, chỉ thấy ~30m phía trước) → Cực quang – *mặt băng trơn*: đổi làn liên tiếp bị trễ.
- 🌋 **Núi Lửa** (cấp 10): Bờ bazan → **Bão tro** (mù) → Dòng dung nham – *cột dung nham* phun theo nhịp, có vệt đỏ báo hiệu trước.
- 🌙 **Biển Thần Thoại** (cấp 18): Biển đêm trăng → **Giông bão sấm sét** (mù, sét đánh xuống làn theo nhịp) → **Hang ổ Kraken**.
- Đua với người chơi: bản đồ suy ra từ phòng (mọi máy cùng bản đồ).
### Thêm – 🎁 Hộp may mắn
- Hàng hộp mỗi ~180m: đi qua để nhặt (cầm 1 món), bấm **DÙNG / Q**: 🚀 Tên lửa nước (tự tăng tốc, không tốn năng lượng) · 🛡 Khiên bong bóng (chặn 1 va chạm/đòn) · 🦑 Bom mực (làm chậm + mực che mắt đối thủ ngay phía trước) · ⚡ Sấm sét (làm chậm mọi người dẫn trước).
- Ai càng ở sau càng dễ ra đồ mạnh (bám đuổi); người dẫn đầu không bao giờ ra Sấm sét. Đối thủ máy cũng nhặt và dùng đồ.
### Sửa
- Hộp thoại "Tìm người chơi"/kết quả/bỏ cuộc trong Đua Cá không còn bị panel che.

## [0.23.0] – 2026-11-20 – Đua Cá khó hơn, cần kỹ năng + Bục vinh danh
### Thêm – chướng ngại chuyển động & kỹ năng
- 🦈 **Cá mập tuần tra** bơi qua lại giữa 3 làn – KHÔNG nhảy qua được, phải canh lúc nó rời làn (có cảnh báo ⚠ khi tới gần). Bị đớp: khựng nặng, −40 năng lượng.
- 🪵 **Khúc gỗ trôi** ngược về phía người đua · 🪼 **Sứa điện** lúc nổi lúc chìm (chỉ chích khi nổi, −25 năng lượng) · 🌀 **Xoáy nước** cuốn gần như đứng yên.
- **NHẢY** (nút / Space, hồi 1,6 giây): bay qua đá, gỗ, rong, sứa, xoáy – nhảy sớm/muộn vẫn dính; đang bay không đổi làn được và lỡ dòng xiết.
- **Xuất phát hoàn hảo**: bấm TĂNG TỐC đúng lúc "XUẤT PHÁT!" → vọt lên; bấm sớm → xuất phát lỗi, khựng lại.
- **SIÊU TĂNG TỐC**: bật tăng tốc ngay trên 🌊 dòng xiết → mạnh hơn và lâu hơn 1,2 giây.
- **Giải càng cao chướng ngại càng dày** và càng nhiều vật chuyển động (Huyền Thoại gấp ~1,4 lần Tập Sự). Đối thủ máy đoán trước vị trí cá mập/gỗ/sứa, biết né hoặc nhảy và xuất phát đẹp theo kỹ năng.
- Phím: Space = NHẢY, Shift/E = TĂNG TỐC, ↑↓/W S = đổi làn.
### Thêm – 🏆 Bục vinh danh
- **Sau mỗi cuộc đua**: top 3 đứng trên bục 🥈🥇🥉 cùng con cá đã cưỡi, vương miện cho người nhất, pháo giấy.
- **Màn chọn giải**: bục vinh danh toàn server – **3 người về đích nhanh nhất** ở từng giải (lưu trên máy chủ, giữ thành tích tốt nhất của mỗi người; tên lấy từ hồ sơ; thời gian phi lý bị từ chối). Lên top 3 có thông báo.

## [0.22.1] – 2026-11-20 – Bộ Sưu Tập cuộn được + Quản trị tài khoản
### Thêm
- **Bộ Sưu Tập có thanh cuộn**: lăn chuột, kéo thanh cuộn vàng bên phải, hoặc vuốt lên/xuống trên điện thoại; giữ vị trí cuộn khi chọn loài; kéo không bị tính nhầm là bấm.
- **Trang quản trị (admin.html) → tab 👥 Tài khoản**: thống kê (tổng tài khoản, đang online, đăng ký hôm nay, chưa có tiến trình), bảng mọi tài khoản đăng ký (tên, email, xác nhận email, cấp, cá đã câu, vàng/KC, tổng nạp, ngày đăng ký, online/lần cuối hoạt động), tìm theo tên/email/mã kết bạn/UID/mã người chơi, bấm vào để xem chi tiết bản lưu + 30 bản sao lưu gần nhất + lịch sử nạp.
- Database: RPC `admin_list_users`, `admin_user_detail` – **chỉ quản trị viên** gọi được (kiểm tra ở máy chủ); người chơi thường/khách bị từ chối.
### Sửa
- Thanh chuyển tab quản trị không còn hiện với tài khoản không có quyền.

## [0.22.0] – 2026-11-20 – Câu cá cùng nhau
### Thêm
- **Mỗi khu câu, người chơi ngồi câu cùng nhau**: người khác cùng khu đứng trên **bến xa** bên kia mặt nước, **mỗi người một chỗ câu riêng do máy chủ chia** (6 chỗ cách đều 120px, giữa bục của mình và đồng hồ lực căng → không ai che ai, không che giao diện). Vào lại khu giữ chỗ cũ; khu đủ 6 người thì người tới sau chờ chỗ.
- Thấy họ **thả câu (phao đỏ), kéo cá (cần cong, nước sủi)**, và **giơ con cá vừa câu được** kèm số kg trên đầu. Mặc đúng nhân vật + trang phục; bấm vào người khác → xem trang cá nhân.
- Góc trái hiện "🎣 N người đang câu cùng khu".
- Database: `fishing_presence` + RPC `fishing_join` (khóa theo khu khi chia chỗ), `fishing_leave`; chỉ sửa được trạng thái của mình, không tự giành chỗ, tên lấy từ hồ sơ.

## [0.21.0] – 2026-11-20 – Đua Cá với người chơi
### Thêm
- Nút **👥 ĐUA VỚI NGƯỜI** (cạnh 🤖 ĐUA VỚI MÁY): vào hàng chờ theo giải, ghép tối đa 5 người (đủ 2 người chờ ≥15 giây là xuất phát; máy lấp chỗ trống). **Chờ quá 2 phút chưa có ai → tự đua với máy** (hoặc bấm "🤖 Đua với máy ngay"). Phí vào cửa chỉ trừ khi bắt đầu đua.
- Người chơi khác hiện trên đường đua (tên xanh 👤, đúng nhân vật + trang phục + cá của họ), vị trí/làn/tăng tốc cập nhật ~2,5 lần/giây và được nội suy mượt. Về đích thì chờ người khác tối đa 15 giây rồi xếp hạng chung.
- Đối thủ máy trong phòng chạy giống hệt nhau trên mọi máy (cùng seed).
- Database: `race_queue`, `race_rooms`, `race_members` + RPC ghép (khóa hàng chờ, không ghép trùng, tên lấy từ hồ sơ – không giả danh; chỉ sửa được vị trí của mình; người ngoài không xem được phòng).
### Sửa
- Xuất phát so le, làn đua giãn rộng – các tay đua không còn chồng lên nhau.

## [0.20.0] – 2026-11-20 – 🏁 Đua Cá
### Thêm
- Nút **🏁 Đua Cá** ở sảnh. Nhân vật **cưỡi lên con cá người chơi chọn**, đua 1.200m trên 3 làn nước với 4 đối thủ.
- **Mỗi con cá có chỉ số đua riêng** – ⚡ Tốc độ, 🚀 Tăng tốc, 💪 Thể lực – **ngẫu nhiên khi câu được** (gieo từ mã riêng của từng con; cá cũ trong kho cũng có). Độ hiếm, cấp, sao, thể đột biến và cân nặng ảnh hưởng chỉ số. Xếp hạng **S/A/B/C/D**.
- **Đường đua**: 🌿 rong biển (chậm), 🪨 đá (chậm nặng, mất tăng tốc), 🌊 dòng xiết (tăng tốc). Đổi làn bằng nút ▲▼, vuốt lên/xuống, phím ↑↓/W S.
- **Kỹ năng TĂNG TỐC** (nút / Space / Shift) khi đầy năng lượng: vọt nhanh 45%, **xé toạc rong biển**; hiệu ứng màn hình chớp màu theo hệ của cá, vòng sóng xung kích, vệt tốc độ, bóng mờ + tia nước theo màu hệ, máy quay phóng nhẹ.
- 3 giải: **Tập Sự** (phí 50, giải 250/120/60), **Chuyên Nghiệp** (cấp 8, phí 300, giải 1.500+💎2/700/350), **Huyền Thoại** (cấp 20, phí 1.500, giải 7.000+💎8/3.000/1.500). Đối thủ máy mạnh dần theo giải và biết né chướng ngại.
- Thưởng qua sổ cái (phí ghi danh + thưởng mỗi cuộc đua chỉ nhận 1 lần).

## [0.19.1] – 2026-11-20 – Cân bằng: câu khó hơn, Boss hiếm hơn
### Thay đổi
- **Boss bất ngờ khi câu thường hiếm hơn ~3 lần**: ~0,6% mỗi lần quăng (trước 1,7–2%), tối đa 1,2% dù may mắn cao. Săn Boss bằng vé vẫn chắc chắn gặp.
- **Kỹ năng gây sát thương theo % máu** (và thiêu đốt) giờ bị giới hạn theo lực kéo của trang bị: cá nhỏ vẫn mất trọn %, nhưng cá to/Boss không còn bị nhân vật yếu "xóa sổ" (trước đây nhân vật khởi đầu hạ được cá Thần Thoại 9.200 HP).
- **Cá hiếm vùng vẫy mạnh hơn** (Quý → Boss) và kéo dây ra xa hơn khi quẫy → nhả tay quá lâu là cá thoát.
- Cửa sổ giật cần khi cá cắn ngắn hơn (0,9 → 0,8 giây).
- Thưởng "cá mệt" và "né nhảy" giảm bớt (vẫn đáng chơi khéo, nhưng không còn quá dễ).

## [0.19.0] – 2026-11-20 – Câu cá có kỹ năng + Quảng Trường
### Thêm – câu cá đỡ chán
- **Mỗi loài cá vùng vẫy một kiểu**: Bền bỉ, Giật lắt nhắt, Lặn sâu, Hay nhảy, Chúa tể (Boss). Tên kiểu hiện cạnh tên cá, kèm mẹo đối phó khi cá cắn câu.
- **Báo hiệu trước khi cá quẫy** (cá nháy vàng + ⚠): nhả tay kịp thì không bị căng dây. Cá giật lắt nhắt báo hiệu rất nhanh.
- **Né cú nhảy**: cá bay khỏi mặt nước thì NHẢ TAY → "NÉ ĐẸP!" gây sát thương + combo; kéo lúc cá bay → dây giật căng, mất combo.
- **Cá mệt – kéo ngay!** Sau mỗi lần quẫy có cửa sổ ~0,9 giây (cá chuyển xanh): kéo lúc này → "HOÀN HẢO!", sát thương lớn, tăng combo.
- **Combo** (mất khi kéo lúc dây quá căng): combo cao nhất cộng tới **+25% cân nặng** cá bắt được.
- **Sự kiện khi quăng cần**: 🌟 Đàn Cá Quý (cá hiếm dễ cắn hơn 3 lần quăng), 🐋 Mùa Cá Lớn (cá nặng hơn 35% trong 3 lần quăng).
- Câu tự động cũng biết nhả tay khi cá báo hiệu/nhảy.
### Thêm – 🏙 Quảng Trường
- Nút **🏙 Quảng Trường** ở sảnh: bến cảng hoàng hôn với đài phun nước tượng cá chép vàng, tiệm mồi, bảng tin, dây đèn lồng.
- **Tự điều khiển nhân vật**: bấm vào nền để đi tới, kéo **cần điều khiển ảo** (điện thoại) hoặc dùng **phím mũi tên / WASD**. Thấy người chơi khác đi lại (cập nhật ~1–2 giây), mặc đúng nhân vật + trang phục của họ.
- **Trò chuyện**: ô chat gửi lên Kênh Thế Giới, lời nói hiện thành **bong bóng trên đầu** nhân vật; khung nhật ký chat nhỏ (bấm để mở Chat Thế Giới).
- **8 biểu cảm** 👋😂😎🔥❤️🎣😭👍 bay lên trên đầu.
- **🐟 Khoe cá**: chọn cá xịn nhất trong kho (xếp theo độ hiếm/thể đột biến/cân nặng) → cá được giơ trên đầu nhân vật kèm số kg, và báo lên Kênh Thế Giới.
- Bấm vào người khác → xem trang cá nhân (kết bạn, nhắn tin, đấu).
- Database: bảng `plaza_presence` (RLS: chỉ tự cập nhật mình; tên/cấp/danh hiệu do máy chủ gắn – không giả danh).
### Sửa
- E2E chơi thử không còn báo lỗi khi ván đầu vớt phải rác.

## [0.18.1] – 2026-11-20 – Sửa lỗi mất tài khoản / đăng nhập không hiện tiến trình
### Sửa
- **Nguyên nhân**: bản lưu có **hơn 200 cá nướng** (hoặc danh sách khác vượt giới hạn) bị kiểm tra dữ liệu coi là "hỏng" → khi đăng nhập game tưởng tài khoản trống và **tải bản nhân vật mới lên đè**.
- Kiểm tra dữ liệu giờ **gọt bớt** danh sách quá dài thay vì từ chối cả bản lưu; giới hạn cá nướng nâng lên 2000.
- Nếu vẫn không đọc được bản trên tài khoản, game **không bao giờ ghi đè** nữa – chơi tạm trên máy và báo tải lại trang.
- Máy chủ: trigger `player_saves_guard` **chặn** mọi lần ghi đè bằng tiến trình khác có cấp/số cá thấp hơn (tự sao lưu bản bị chặn). Đã áp dụng lên máy chủ.
- "Xóa tiến trình" giữ nguyên mã người chơi để không bị lớp chặn cản.

## [0.18.0] – 2026-11-20 – Hồ sơ chi tiết, trang cá nhân người chơi, nhắn tin, chat Thế Giới, trạng thái online
### Thêm
- **Hồ Sơ mới**: trái – avatar (chấm online), tên, **danh hiệu**, cấp, **UID** (bấm để sao chép), mã kết bạn, 5 ô thống kê (thêm Chiến lực), cá trưng bày; phải – **mô hình nhân vật đứng trên bục, cầm cần câu đang dùng**, mặc đồ/skin đang mặc, nút đổi nhân vật/cần câu.
- Tab **Bạn bè** riêng: thẻ mã kết bạn lớn + hướng dẫn, danh sách bạn có **🟢 trạng thái online** ("Đang online" / "Online x phút trước"), nút 💬 có số tin chưa đọc.
- **Trang cá nhân người chơi khác** (bấm vào người trong **Bảng Xếp Hạng**, bạn bè hoặc tên trong chat): đầy đủ thông tin + mô hình nhân vật cầm cần, nút **➕ Kết bạn**, **💬 Nhắn tin**, **⚔ Đấu**.
- **Nhắn tin 1–1** (làm mới mỗi 4 giây, "đã xem", chống spam 15 tin/phút) và **🌍 Chat Thế Giới** (nút ở sảnh; tên & danh hiệu do máy chủ gắn – không giả danh được; 5 tin/30 giây). Sảnh báo khi có tin nhắn mới.
- Trạng thái online: game gửi nhịp hồ sơ mỗi 2 phút khi đang mở.
- Database: bảng `messages`, `world_messages` có RLS + giới hạn tốc độ (đã chạy thử trên PostgreSQL và áp dụng lên máy chủ).

## [0.17.1] – 2026-11-20
### Thêm / Sửa
- Vòng Quay: các ô **xếp xen kẽ màu** – không còn 2 ô cùng cấp màu nằm cạnh nhau.
- **Màn "TRÚNG ĐỘC ĐẮC!"** khi trúng món tỉ lệ thấp (Huyền Thoại / Thần Thoại, < 1%): tối màn hình, tia sáng xoay, mưa vàng, pháo hoa, quà phóng to kèm cấp & tỉ lệ. Quay x10 có món độc đắc sẽ hiện màn này trước bảng kết quả.

## [0.17.0] – 2026-11-20 – 24 Skin nhân vật, tỉ lệ Vòng Quay theo cấp màu
### Thêm
- **Ô trang bị mới "Skin"** – bộ trang phục trọn bộ (thay mũ + áo + trang sức, có đạo cụ riêng). Tab 🧸 Skin ở Cửa Hàng (mở đầu tiên), hàng Skin trong Tủ Đồ. **24 skin**:
  - Bộ 1: Thần Rừng Xanh, Du Khách Đi Biển, Cao Bồi Miền Tây, Bánh Donut Dâu, Ly Trà Sữa Trân Châu, Chú Hề Cầu Vồng, Samurai Huyết Giáp (kiếm katana), Chiến Binh Viking (rìu + khiên), Pharaoh Hoàng Kim (gậy vàng), Chiến Binh Cyborg (mắt laser), Hỏa Thần Bất Diệt (đuốc + quầng lửa), Tiên Bướm Cầu Vồng.
  - Bộ 2: Công Chúa Hồng, Phù Thủy Nhỏ (đũa trái tim), Tiên Hoa Mùa Xuân, Cô Dâu Hoa Hồng (voan + bó hoa), Thỏ Hồng Cà Rốt, Kimono Hoa Anh Đào (quạt), Cô Nàng Mùa Hè (phao kỳ lân), Nàng Tiên Cá (đuôi cá), Mùa Đông Ấm Áp, Họa Sĩ Nhí (cọ + bảng màu), Nữ Sinh Thủy Thủ (cặp sách), Vũ Công Ballet (váy tutu).
  - Bậc Hiếm → Thần Phẩm, chỉ số phụ theo trần bậc; bậc cao phát sáng như thời trang.
- Vòng Quay: nút **📊 Tỉ lệ rơi** (bảng % quay lẻ và quay x10 từng món); **5 cấp màu theo tỉ lệ** – Thường (xám), Hiếm (xanh), Cực Phẩm (tím), Huyền Thoại (vàng cam), Thần Thoại (đỏ); ô trên vòng quay tô đúng màu cấp.

## [0.16.0] – 2026-11-20 – Nhân vật & cần câu từ Vòng Quay, xếp hạng Chiến Lực
### Thêm
- Vòng Quay thêm ô **🌟 Nhân Vật Hiếm** (~0,2%/lượt: Ngao Thiên, Viêm Hỏa – SSR; Thủy Tổ, Lôi Vũ – UR hiếm hơn) và **🎣 Cần Câu Hiếm** (~0,3%/lượt: Long Cốt, Phượng Hoàng – SSR; Hải Thần – UR). Đây là các nhân vật/cần trước đây chưa có cách nhận. Trúng món đã có → đổi thành 30 Linh Hồn (nhân vật) / 60 Đá (cần câu). Màn khoe riêng khi trúng.
- **Bảng Xếp Hạng Chiến Lực đội hình** (tab mặc định 🐟 Chiến lực): tổng lực chiến 3 con cá mạnh nhất (tính cả đột biến). Danh hiệu Top: 👑 Bá Chủ Đại Dương, 🥈 Hải Vương Chiến Lực, 🥉 Thủy Quân Vô Địch, 🏅 Top 10 Đội Hình Mạnh. Hiện chiến lực đội hình của bạn.

## [0.15.0] – 2026-11-20 – Vòng Quay mới: 17 phần quà + Quay x10
### Thêm
- Vòng Quay May Mắn có **17 phần quà**: thêm 40 Đá, 15.000 Vàng, 3 Vé Boss, 15 Linh Hồn, Lõi Dung Nham, Tinh Thể Băng Hà, Sấm Thạch, **👑 500 KC** và **🪶 Lông Phượng Thần** (cực hiếm).
- Nút **QUAY x10 · 270 💎** (rẻ hơn 10%): tỉ lệ ra **đồ ngon ×1,6** so với quay lẻ (không đảm bảo). Vòng quay dừng ở món ngon nhất, sau đó hiện bảng 10 phần quà, món ngon phát sáng.

## [0.14.1] – 2026-11-20
### Thêm
- Cá **Huyền Thoại** đột biến: thêm vương miện vàng, quầng ánh kim, sao lấp lánh.
- Cá **Thần Thoại** đột biến: vương miện ngọc 5 sắc, **vòng ấn chú cổ xưa** quanh thân, quầng cầu vồng, cầu năng lượng bay quanh.

## [0.14.0] – 2026-11-20 – Đột biến mới: 24 dạng, 100% thành công, chỉ số ngẫu nhiên; Boss siêu hiếm
### Thay đổi
- **Đột biến luôn thành công** (khó ở khâu kiếm vật phẩm, rơi cực hiếm). Mỗi vật phẩm biến cá thành **ngẫu nhiên 1 trong 4–5 dạng cùng hệ**; đột biến lại sẽ ra dạng khác:
  - 🐉 Ngọc Long Hồn: Thanh Long, Hắc Long, Kim Long, Huyết Long, Bích Ngọc Long
  - 🌋 Lõi Dung Nham: Hỏa Viêm, Hắc Viêm, Lam Viêm, Kim Viêm, Lục Quỷ Hỏa
  - ❄️ Tinh Thể Băng Hà: Băng Tinh, Tuyết Ma, Hàn Ngục, Tinh Vân Băng, Huyền Băng
  - ⚡ Sấm Thạch: Lôi Quang, Tử Lôi, Bạo Lôi Long, Huyết Lôi, Băng Lôi
  - 🪶 Lông Phượng Thần: Phượng Hoàng Thần, Thiên Thần Ngư, Ma Thần Ngư, Hải Thần Ngư
- **Mỗi dạng có ngoại hình riêng** ngầu hơn: đổi màu thân/vây/mắt + lửa (đỏ/đen/xanh/vàng/lục), pha lê băng, sương tuyết, gai băng, sét (vàng/tím/đỏ/xanh), mây giông, bờm & râu rồng, cánh phượng hoàng, cánh thiên thần + hào quang… hiển thị ở Kho Cá, đội hình, trận đấu, hồ sơ.
- **Chỉ số tăng ngẫu nhiên**: mỗi chỉ số (HP/Công/Thủ) nhận hệ số 0,8–1,5 phần tăng của dạng; **12% ĐỘT BIẾN VƯỢT BẬC** – một chỉ số nhận ×1,8–2,4. Màn khoe dạng mới hiện % tăng từng chỉ số.
- Cá **Huyền Thoại** và **Thần Thoại** cũng đột biến được (trước chỉ Boss).
### Thêm
- **Boss phụ siêu hiếm** mỗi khu (≈0,15%/lần quăng): Chép Tí Hon Thần Tài, Kình Ngư Cầu Vồng (khổng lồ), Nóc Bông Gòn, Cổ Long Vương Dung Nham (khổng lồ), Cá Tuyết Mochi, Leviathan Diệt Thế (khổng lồ). Có cảnh báo "✦ BOSS SIÊU HIẾM! ✦".
- Máy chủ Đấu Sinh Tử đã cập nhật để tính chỉ số đột biến mới.

## [0.13.1] – 2026-11-19
### Thêm
- Nhân vật / cần câu **LR**: khung **cầu vồng 7 sắc** chạy vòng quanh thẻ (màu trôi liên tục, có quầng sáng), chữ "LR" tô cầu vồng; bảng chi tiết nhân vật LR và màn nhận nhân vật LR từ mã quà cũng viền cầu vồng + tia sáng 7 sắc.

## [0.13.0] – 2026-11-19 – Nhạc nền
### Thêm
- **Nhạc nền tự soạn** (WebAudio, không dùng file nhạc → nhẹ, không lo bản quyền): Sảnh vui tươi (Đô trưởng ngũ cung), Câu cá êm đềm âm hưởng dân ca (La thứ ngũ cung), Săn Boss căng thẳng, Đấu Sinh Tử dồn dập có trống, các màn khác nhẹ nhàng. Chuyển bài mượt khi đổi màn.
- Cài Đặt: nút **🎵 Nhạc: Bật/Tắt** riêng với âm thanh hiệu ứng (nhớ lựa chọn).

## [0.12.0] – 2026-11-19 – Hiệu ứng kỹ năng theo từng tướng, trang duyệt nạp
### Thêm
- **Hiệu ứng kỹ năng riêng cho 14 nhân vật** đúng mô tả: Giật Cần (vệt quất cần), Thả Dây (dây xoắn lỏng), Gió Thuận (luồng gió + lá + thuyền buồm), Móc Sắt (mỏ neo sắt + xích), Ảnh Phân Thân (phân thân + phi tiêu), Ca Khúc Biển (sóng âm + nốt nhạc), Lưới Thép (lưới thép + tia hàn), **Long Trảo (bàn vuốt rồng 4 móng vồ xuống + 3 vết cào)**, Đóng Băng (mặt nước đóng băng + tinh thể), Lửa Hỏa Ngục (cột lửa), Triều Cường (sóng thần cuộn), Lôi Phạt (mây giông + sét liên hoàn), Bình Minh Rực Lửa (mặt trời mọc + lông phượng), Thiên Biến Vạn Hóa (gậy như ý + đàn khỉ).
- **Tướng càng hiếm hiệu ứng càng hoành tráng**: N/R băng tên chiêu · SR cắt cảnh anime (chân dung lớn + dải màu) · SSR/UR/LR **đổi cả nền trời và mặt nước** (lãnh địa riêng: Long Cung, cực quang băng, hỏa ngục, đại dương đêm trăng, bão sét, bình minh, thiên đình mây vàng) · LR thêm khung vàng phát sáng.
- **Trang duyệt nạp riêng** `admin.html` (mở trên điện thoại/máy tính): đăng nhập tài khoản quản trị, xem lệnh Chờ duyệt / Đã duyệt / Đã nhận / Từ chối, thống kê doanh thu, duyệt bằng 1 chạm (có hỏi lại).

## [0.11.1] – 2026-11-19
### Sửa
- **Database đã được triển khai lên Supabase** (hồ sơ, bạn bè, Đấu Sinh Tử người chơi, hội, xếp hạng, nạp, ghép trận) + hàm máy chủ `death-match`; hồ sơ công khai của người chơi cũ đã được tạo sẵn để **tìm tên & kết bạn** ngay.
- Hồ sơ: mỗi ô cá trưng bày có nút **✖ Gỡ**; ô trống có nút **➕ Thêm cá**.

## [0.11.0] – 2026-11-19 – Ghép trận ngẫu nhiên
### Thêm
- **🎲 Ghép ngẫu nhiên** trong Đấu Sinh Tử → Đấu người chơi: ưu tiên ghép với người đang chờ **cùng lúc** (lực chiến gần nhất); chờ tối đa 40 giây (hiện số người đang chờ, có thể huỷ); không có ai thì tự ghép với một người chơi ngẫu nhiên cùng tầm cấp (dùng đội phòng thủ của họ). Người bị ghép trúng khi đang chờ cũng xem trận ngay.
- Database: hàng chờ `dm_queue` + hàm ghép an toàn (không ghép 2 lần), đã kiểm thử trên PostgreSQL.

## [0.10.0] – 2026-11-19 – Nạp kim cương & Câu tự động
### Thêm
- **Nạp bằng chuyển khoản** (bấm ô 💎 trên thanh trên cùng): 100 💎 = 20.000đ, 300 💎 = 50.000đ, **Câu Tự Động 2 ngày** = 20.000đ. Mã QR VietQR có sẵn số tiền + nội dung riêng `DCCC…`; chủ game đối soát sao kê và **duyệt** ở trang 🛠 Duyệt nạp; mỗi lệnh chỉ nhận 1 lần (xem docs/TOPUP_ADMIN.md).
- **Nút 🤖 Tự động** khi câu cá (có gói): tự quăng, giật đúng lúc, kéo giữ lực căng an toàn, dùng kỹ năng khi cá vùng vẫy, câu liên tục.
### Sửa
- Cá trưng bày: cá đang trưng bày luôn hiện đầu danh sách để gỡ; chọn con thứ 4 sẽ thay con cũ nhất; nút Gỡ hết.
- Cá nướng cho nhân vật ăn: giảm KN còn 1/5.

## [0.9.1] – 2026-11-19
### Sửa
- Ô nhập mã quà / đổi tên / đăng nhập bị lệch trên màn hình điện thoại dài (do khung game giãn ngang) – nay khớp đúng vị trí.

## [0.9.0] – 2026-11-19 – Giai đoạn 3 & 5: Nhiệm vụ, Điểm danh, Vòng Quay, Danh hiệu, Xếp hạng, Hội
### Thêm
- **Nhiệm Vụ** (sảnh → 📜): 7 nhiệm vụ ngày (câu cá, vớt rác, tái chế, bắt Boss, thắng Sinh Tử, quay vòng quay), làm mới 0h giờ VN.
- **Điểm danh 7 ngày** liên tiếp (ngày 7: 100 💎 + 5.000 vàng; lỡ 1 ngày quay lại ngày 1).
- **Vòng Quay May Mắn** (sảnh → 🎡): 1 lượt miễn phí/ngày, thêm lượt 30 💎; có thể trúng 150 💎 hoặc Ngọc Long Hồn.
- **19 danh hiệu vui** mở khi đạt yêu cầu: Kẻ Săn Lùng Rác, Vua Nhặt Rác, Chiến Binh Xanh, Thiên Thần Tái Chế, Sát Thủ Đại Dương, Thần Câu Ngàn Năm, Thợ Săn Boss, Diệt Boss Vô Song, Đấu Sĩ Máu Lửa, Chiến Thần Bất Diệt, Đầu Bếp Cá Nướng, Phù Thủy Đột Biến, Đại Gia Làng Chài, Lực Sĩ Kéo Cá, Con Nghiện Vòng Quay, Chuyên Cần Gương Mẫu… Đeo danh hiệu để hiện cạnh tên (thanh trên, hồ sơ, xếp hạng).
- **Bảng Xếp Hạng** (cần tài khoản): Cấp, Câu cá, Săn Boss, Sinh tử, Nhặt rác, Hội. **Danh hiệu Top**: 👑 Top 1 (Vua Câu Cá, Vua Nhặt Rác, Chiến Thần Sinh Tử…), 🥈 Top 2, 🥉 Top 3, 🏅 Top 10.
- **Hội Câu Cá** (cần tài khoản): lập hội với tên + ký hiệu + lời giới thiệu, tìm & vào hội (tối đa 30), xem thành viên, thách đấu, chủ hội mời ra, rời hội (tự nhường chủ hội).

## [0.8.1] – 2026-11-19 – Lấp đầy màn hình điện thoại, biểu tượng mới
### Sửa / Thêm
- **Màn hình dài (iPhone 12 Pro 19,5:9…)**: game giãn ngang theo tỉ lệ màn hình (tối đa 1600×720), nền kéo kín hai bên, thanh trên cùng bám mép và chừa tai thỏ; bệ câu nối dài sang trái; lưới chức năng ở sảnh dạt sát mép phải.
- **Biểu tượng game mới** (màn hình chính điện thoại, tab trình duyệt). Cần xóa biểu tượng cũ và "Thêm vào MH chính" lại để thấy.
- Đấu Sinh Tử: **ưu tiên lực chiến** – khắc hệ chỉ còn ±10% sát thương (trước +35%/−20%).
- Báo lỗi rõ ràng khi máy chủ chưa có bảng bạn bè/hội (chưa triển khai database).
- Chuẩn bị Giai đoạn 3–5 (logic + database, giao diện ở bản sau): điểm danh 7 ngày, nhiệm vụ ngày, Vòng Quay, 19 danh hiệu vui, danh hiệu Top xếp hạng, Hội (tạo/đặt tên/vào/rời), bảng xếp hạng an toàn với dữ liệu lỗi. Save phiên bản 7.

## [0.8.0] – 2026-11-19 – Đấu Sinh Tử, Hồ sơ & Bạn bè, Thể đột biến
### Thêm
- **Đấu Sinh Tử** (nút ⚔ ở sảnh): chọn 3 cá và tự xếp thứ tự ra sân, đấu tay đôi lần lượt, thắng 2/3 là thắng. Khắc hệ (Nước > Lửa > Băng > Đất > Sấm > Nước; Sáng ⇄ Tối), chí mạng, kỹ năng hệ mỗi lượt thứ 3 (đốt, đóng băng, tê liệt, hồi máu, khiên).
  - Đấu với máy 3 độ khó (Dễ/Thường/Khó), xem trước đội máy và phần thưởng.
  - **Bên thua mất con cá mạnh nhất** trong đội; bên thắng nhận con đó dạng **🍖 cá nướng**. Cá khóa 🔒 không được đem đấu.
  - **Cá nướng cho nhân vật ăn để nhận kinh nghiệm** (loài càng hiếm, cấp/sao càng cao càng nhiều KN; nhân vật tự lên cấp, không vượt giới hạn đột phá).
  - Màn trận đấu hoạt hình: thanh máu, số sát thương bay, rung màn, chớp sáng kỹ năng, x2 tốc độ, bỏ qua.
  - Ghi thắng/thua cho từng con cá → tỉ lệ thắng.
- **Đấu Sinh Tử với người chơi khác** (cần tài khoản online): máy chủ (Supabase Edge Function `death-match`) tự tính trận bằng save thật của 2 bên – không ai sửa kết quả được; giới hạn 20 trận/giờ, 5 trận/ngày với cùng đối thủ. Đặt **đội phòng thủ** 🛡; khi mở game sẽ thông báo ai đã thách đấu bạn và kết quả.
- **Hồ sơ & Bạn bè** (bấm avatar): thông tin, thống kê, **mã kết bạn**, chọn **3 cá trưng bày** – người khác xem được tỉ lệ thắng; tìm theo tên/mã, gửi/nhận/xóa lời mời, xem hồ sơ bạn bè, thách đấu.
- **Thể đột biến cho cá Boss**: Long Hóa, Hỏa Hóa, Băng Hóa, Lôi Hóa, Thần Hóa – chỉ số tăng đột biến (tới ×2,2), có thể đổi hệ. Vật phẩm rơi cực hiếm khi câu (0,6%; Thần vật 0,08%; Boss ×3). **Tỉ lệ thành công ẩn, khác nhau từng thể; thất bại vẫn mất vật phẩm.**
- Hình **cá nướng** riêng: thân vàng nâu, vằn vỉ, xiên tre, lá chanh.
- Database: bảng `player_cards`, `friendships`, `pvp_matches` có RLS (đã chạy thử trên PostgreSQL thật). Workflow `deploy-supabase.yml` tự đẩy migration + Edge Function khi có secret.
- Save phiên bản 6 (cá nướng, trưng bày, vật phẩm đột biến, đội phòng thủ, KN nhân vật) có chuyển đổi tự động.

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
