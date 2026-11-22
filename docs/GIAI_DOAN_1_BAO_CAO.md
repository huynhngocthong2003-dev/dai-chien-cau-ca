# ĐẠI CHIẾN CÂU CÁ – BÁO CÁO GIAI ĐOẠN 1
## Phân tích hiện trạng & kế hoạch đại tu (Master Prompt 11 phần)

Ngày: 22/11/2026 · Phiên bản đang chạy: **v0.34.0** · Giai đoạn này **không sửa code / database**.

---

## 1. Kiến trúc hiện tại

| Lớp | Hiện trạng |
|---|---|
| Client | Phaser 3.90 + Vite, 20 màn (`apps/game-client/src/scenes`), vẽ thủ tục Canvas2D (`art/`) |
| Logic | `packages/shared` – hàm thuần TypeScript (~4.600 dòng): câu cá, kinh tế, tiến hoá, trận đấu, đua cá… có 188 unit test |
| Dữ liệu | `packages/game-data`: 64 loài cá, 6 khu vực, 7 độ hiếm, 24 thể đột biến, 8 Đá Tiến Hoá |
| Kiểm tra dữ liệu | `packages/validation` (Zod) – đọc/ghi bản lưu |
| Máy chủ | Supabase: 23 bảng, 19 migration, RLS + RPC `security definer`, **1 Edge Function** `death-match` (đang ACTIVE) |
| Lưu tiến trình | **Toàn bộ tiến trình người chơi là 1 khối JSON** `player_saves.save` (vàng, kim cương, đá, linh hồn, 200 cá, cấp…) |
| Đồng bộ | Không dùng Supabase Realtime; các chế độ nhiều người (đua cá, quảng trường, câu cùng) dùng **RPC + hỏi định kỳ (polling)** |

**Số liệu thật trên máy chủ:** 11 người chơi (11 hoạt động 3 ngày qua), 376 con cá, 4 cá đã tiến hoá hệ, tổng 21.978 Đá Nâng Cấp, 3.703 Linh Hồn, 8.579 kim cương. `pvp_matches`: 0 trận.

### 1.1. Điểm then chốt về bảo mật (ảnh hưởng mọi hạng mục)
Hiện nay **game tin client**: client tự tính câu cá, bán cá, nâng cấp… rồi ghi cả khối JSON lên máy chủ. Máy chủ chỉ chặn việc *tụt* tiến trình (guard STALE_SAVE) và RLS chặn ghi tài khoản người khác. Người chơi biết kỹ thuật **có thể tự sửa JSON** để tăng vàng/cá.

Master Prompt yêu cầu "Backend là nguồn xác nhận cuối cùng" cho tài nguyên và trận đấu → đây là **thay đổi kiến trúc lớn nhất**, phải làm trước các tính năng khác (xem mục 5).

---

## 2. Chức năng đang hoạt động (giữ nguyên, không xoá)
Câu cá (kỹ năng, kéo, né, combo, sự kiện), câu tự động, Săn Boss, 6 khu vực, độ bền cần, kho 200 cá, bán / phân giải, nhân vật – cần câu – cá (cấp, sao ★, tiến hoá hệ 5 hệ, 4 giai trưởng thành), thời trang + skin, cửa hàng, nạp, quà mã, vòng quay, nhiệm vụ, điểm danh, danh hiệu, hồ sơ, bạn bè, nhắn tin, chat thế giới, hội, xếp hạng, **Đấu Sinh Tử** (3 cá đánh tự động với máy + PvP bất đồng bộ qua Edge Function), Đua Cá (nhiều người, phòng riêng, bục vinh danh), Quảng Trường, câu cùng nhau, Hòm Thư có quà, trang quản trị.

---

## 3. So sánh với Master Prompt – những gì phải thay đổi

### Phần 1 – 7 nguyên tố
| Hiện tại | Yêu cầu |
|---|---|
| 7 hệ: Thủy, Hỏa, **Băng**, **Lôi**, Ám, Quang, Thổ | Kim, **Mộc**, Thủy, Hỏa, Thổ, Bóng tối, Ánh sáng |
| Hệ gắn theo **loài** (64 loài) | Hệ theo **khu vực câu** |
| Khắc chế vòng 5 + Quang↔Ám, hệ số **1.1 / 0.92** | Ngũ hành + Sáng↔Tối, hệ số **1.5 / 0.75** |
| Không có biểu tượng hệ thống nhất (chỉ chữ/emoji) | Biểu tượng + màu + hiệu ứng thống nhất ở 8 màn |

Phân bố hệ hiện tại theo khu: Bến Tân Thủ (Thủy 3, Thổ 3, Ám 1, Quang 1), Biển Nhiệt Đới (Thủy 5…), Vực Sâu (Ám 6), Biển Lửa (Hỏa 8), Băng Giá (Băng 9), Đại Dương Thần Thoại (lẫn 6 hệ). **12 loài xuất hiện ở 2 khu** → phải chốt quy tắc (câu hỏi Q1–Q3).

**Chỉ có 6 khu vực** nhưng chiến dịch cần 7 chương; chương 6 **"Vương Quốc Kim Loại" chưa có khu và chưa có cá hệ Kim** (câu hỏi Q2).

### Phần 2 – Chiến đấu 3vs3
| Hiện tại (`battle.ts`, `deathmatch.ts`) | Yêu cầu |
|---|---|
| 3 cá, **đánh tự động** từ đầu đến cuối, có tốc độ, có chí mạng | Đánh **theo lượt, người chơi điều khiển**: Thanh canh lực, Tấn công / Phòng thủ / Kỹ năng |
| Sát thương: `ATK×3×100/(100+DEF)` | `MAX(1, ATK×canh lực×nguyên tố×kỹ năng − DEF)` |
| Kỹ năng cá **chỉ là mô tả**, chưa có tác dụng trong trận | 64 kỹ năng có hiệu ứng, hồi chiêu, logic máy chủ |

⚠ **Cân bằng:** với chỉ số hiện tại (ATK và DEF cùng cỡ vài chục – vài trăm), công thức *trừ thẳng DEF* sẽ làm rất nhiều đòn chỉ gây **1 sát thương** (nhất là vùng đỏ 10%, vùng vàng 0.7). Cần **thang lại ATK/DEF/HP cho trận** (không đổi chỉ số đang hiển thị) – sẽ mô phỏng hàng nghìn trận để chốt số trước khi chơi thật.

### Phần 3 – Nâng cấp & Đột phá
| Hiện tại | Yêu cầu |
|---|---|
| Lên cấp: vàng + Đá Nâng Cấp · Lên sao/giai: vàng + đá + linh hồn (+ Đá Tiến Hoá hệ) | **Chỉ Linh Hồn + Ngọc**, bảng giá theo 4 giai |
| Cá thường có 5 sao ★; Huyền Thoại/Boss/Thần Thoại có Tiến hoá hệ + 4 giai | Bảng 4 giai (Sơ/Trung/Cao/Thánh) |

"Ngọc" **chưa tồn tại** → tài nguyên mới (câu hỏi Q4). Số dư cũ (Đá Nâng Cấp, Đá Tiến Hoá) giữ nguyên, không xoá, không quy đổi.

### Phần 4 & 5 – Phân giải, Bán cá
- Đã có phân giải (ra Đá Nâng Cấp + Linh Hồn) và bán (giá theo loài × cân nặng).
- Game có **7 bậc độ hiếm** (Thường, Hiếm, Quý, Sử Thi, Huyền Thoại, Thần Thoại, Boss), không phải 6 → cần chốt bậc 7 (câu hỏi Q5).
- **Chưa có khái niệm "cá trong đội hình"** để chặn bán/phân giải → thêm (đội phòng thủ PvP đã có `defense`).

### Phần 6 – PvE 50 ải: **chưa có** (chỉ có Đấu Sinh Tử với máy dễ/thường/khó).
### Phần 7 – PvP phòng riêng 30 giây bí mật: **chưa có** (hiện là PvP bất đồng bộ đánh với đội phòng thủ). Hạ tầng phòng/mời/mã phòng của **Đua Cá** (race_lobbies, race_invites, hết giờ phía máy chủ) tái sử dụng được nhiều.

---

## 4. Bảng database dự kiến (chỉ THÊM, không xoá)

| Bảng / thành phần mới | Mục đích |
|---|---|
| `player_wallet` (user_id, ngoc, linh_hon, version) | Ngọc & Linh Hồn do **máy chủ** quản lý, chỉ đổi qua RPC/Edge Function |
| `wallet_ledger` (tx_id unique, delta, lý do) | Sổ giao dịch – chống trừ/cộng trùng |
| `player_teams` (user_id, uids[3]) | Đội hình 3 cá – chặn bán/phân giải cá trong đội |
| `pve_progress` (user_id, ải cao nhất, ải đã nhận thưởng[]) | Tiến trình chiến dịch |
| `battles` (id, mode, state jsonb, turn, deadline, seed, winner) | Trạng thái trận do máy chủ giữ (PvE & PvP) |
| `battle_actions` (battle_id, turn, user_id, action, unique(battle_id,turn)) | Mỗi lượt đúng 1 lệnh – chống gửi nhiều lần |
| `pvp_rooms`, `pvp_room_members`, `pvp_picks` (RLS: **chỉ chủ đội hình đọc được**) | Phòng, mời, chọn đội bí mật 30 giây |
| Edge Functions: `battle-action`, `economy` | Chạy chung code `packages/shared` phía máy chủ (đã chứng minh được với `death-match`) |

Mỗi migration kèm test SQL (`tests/db`) và câu lệnh khôi phục; trước khi áp dụng sẽ chụp bản sao lưu `player_saves`.

---

## 5. Rủi ro chính & cách xử lý

| # | Rủi ro | Cách xử lý |
|---|---|---|
| R1 | Client đang tự ghi tài nguyên → không thể "Backend xác nhận" nếu giữ nguyên | Tài nguyên mới (Ngọc/Linh Hồn), trận đấu, thưởng PvE/PvP **chỉ do máy chủ ghi**; thêm trigger chặn client tự tăng các trường đó trong `player_saves`. Phần cũ (vàng, câu cá) chuyển dần ở các đợt sau – báo rõ phạm vi |
| R2 | Thanh canh lực là thao tác theo thời gian ở máy người chơi – không thể chống gian lận 100% | Máy chủ phát tham số thanh (tốc độ, pha) mỗi lượt, nhận "thời điểm bấm", tự tính vùng + kiểm tra hợp lý (thời hạn lượt, phân bố bất thường) |
| R3 | Công thức trừ DEF làm đòn chỉ còn 1 sát thương | Hệ số trận cho ATK/HP, mô phỏng cân bằng trước |
| R4 | Đổi hệ của 64 loài + 376 cá đã sở hữu | Bảng ánh xạ rõ ràng, áp dụng bằng migration có sao lưu; hệ cũ lưu lại để khôi phục |
| R5 | Mất kết nối PvP / thoát trận | Trạng thái nằm trên máy chủ, hạn kết nối lại (vd 60 giây), hết hạn thì xử thua |
| R6 | Đụng các hệ thống vừa làm (Tiến hoá hệ, Đá Tiến Hoá, 4 giai) | Chờ quyết định Q6 |
| R7 | Khối lượng lớn (8 giai đoạn) | Phát hành từng giai đoạn, mỗi lần có test + báo cáo |

---

## 6. Kế hoạch triển khai

| GĐ | Nội dung | Đầu ra kiểm thử |
|---|---|---|
| 2 | 7 nguyên tố: dữ liệu + ánh xạ cá cũ, khắc chế 1.5/1/0.75 (hàm chung client & máy chủ), biểu tượng nguyên tố vẽ thủ tục, hiện ở 8 màn | Unit test bảng khắc chế; test dữ liệu: mọi cá có đúng 1 hệ |
| 3 | Lõi trận 3vs3 theo lượt **chạy trên máy chủ** (Edge Function) + màn chiến đấu: tốc độ, thanh canh lực thật, Tấn công/Phòng thủ/Kỹ năng, combo, 64 kỹ năng | Unit test công thức, mô phỏng cân bằng, E2E đánh hết 1 trận |
| 4 | Ví Ngọc/Linh Hồn phía máy chủ, nâng cấp & đột phá theo bảng, phân giải & bán qua máy chủ, đội hình chặn bán | Test DB (trừ đúng 1 lần, chống trùng), E2E |
| 5 | Chiến dịch 50 ải / 7 chương / 7 Boss, AI biết khắc hệ, lưu tiến trình máy chủ | E2E qua ải, nhận thưởng 1 lần |
| 6 | PvP phòng riêng: tạo / mời / mã phòng, chọn đội bí mật 30 giây (đồng hồ máy chủ, RLS ẩn), trận đồng bộ, kết nối lại | Test RLS "không đọc được đội đối thủ", E2E 2 trình duyệt |
| 7 | Hoàn thiện giao diện & hiệu ứng 13 màn | Ảnh chụp điện thoại + máy tính |
| 8 | Kiểm thử tổng, sửa lỗi, tối ưu, nghiệm thu 27 tiêu chí | Báo cáo nghiệm thu |

---

## 7. Câu hỏi cần chủ dự án chốt trước Giai đoạn 2

- **Q1 – Hệ theo loài hay theo khu?** Đề xuất: theo **khu nơi câu được** (mỗi con cá sở hữu đã lưu khu câu `zoneId`), Boss/cá đặc biệt cấu hình riêng.
- **Q2 – Khu & cá hệ Kim:** chưa có. Đề xuất: (a) thêm khu thứ 7 "Vương Quốc Kim Loại" + loài cá mới hệ Kim (nội dung mới), hoặc (b) tạm gán 3 loài hệ Lôi sang Kim.
- **Q3 – Ánh xạ khu → hệ:** Bến Tân Thủ = Thổ, Biển Nhiệt Đới = Mộc, Vực Sâu = Bóng tối, Biển Lửa = Hỏa, Băng Giá = Thủy, Đại Dương Thần Thoại = Ánh sáng (theo đúng 7 chương). Đồng ý?
- **Q4 – "Ngọc":** tài nguyên **mới** (khác Kim Cương mua bằng tiền thật và khác Đá Nâng Cấp)? Kim Cương giữ nguyên công dụng?
- **Q5 – Bậc 7 (Boss):** thứ tự trong game: Thường < Hiếm < Quý < Sử Thi < Huyền Thoại < Thần Thoại < Boss. Phân giải bậc 7 = 128 Ngọc? Giá bán bậc 7 = ? (đề xuất 25.000 Vàng). Hay xếp Boss ngang Thần Thoại?
- **Q6 – Hệ thống vừa làm:** Tiến hoá hệ (5 hệ) + Đá Tiến Hoá: **bỏ** (theo "loại bỏ đá tiến hoá") hay giữ làm ngoại hình? 4 giai trưởng thành áp dụng cho **mọi cá** hay chỉ Huyền Thoại trở lên? Cá thường còn sao ★ không?
- **Q7 – Phạm vi bảo mật đợt này:** đồng ý làm máy chủ xác nhận cho **tài nguyên mới + trận đấu + thưởng**, còn vàng/câu cá chuyển dần sau (R1)?
- **Q8 – Đấu Sinh Tử cũ** (đánh tự động + PvP bất đồng bộ): thay bằng hệ 3vs3 mới, hay giữ song song?
- **Q9 – PvP người chơi không chọn đủ 3 cá khi hết 30 giây:** hủy trận (đề xuất) hay xử thua người thiếu?
