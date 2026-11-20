# Changelog

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
