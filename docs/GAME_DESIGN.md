# GAME DESIGN – ĐẠI CHIẾN CÂU CÁ

## 1. Tầm nhìn
Game câu cá 2D hoạt hình phong cách mobile thương mại: màu rực, viền đậm, cá quái vật khổng lồ (răng nanh, sừng, gai, mắt phát sáng), nhân vật chibi có hào quang khi tung kỹ năng. Cốt lõi là một cơ chế câu cá **có kỹ năng thật**, sau đó mở rộng sang PvP online, sưu tầm và cộng đồng.

Tham chiếu mỹ thuật: thể loại "câu cá đại chiến" (cá quái vật + nhân vật cơ bắp/hào quang). Mọi tên, nhân vật, cá và hình ảnh trong game là thiết kế riêng.

## 2. Vòng lặp gameplay
```
Câu cá → nhận cá + KN + vàng → bán cá / sưu tầm → mua cần, mở nhân vật → lên cấp mở khu mới
   ↑                                                                                   │
   └──────────── cá mạnh hơn, Boss, (GĐ3) nhiệm vụ, (GĐ4) PvP dùng cá đã bắt ──────────┘
```

## 3. Cơ chế câu cá (đã triển khai – `packages/shared/src/fishing.ts`)
| Pha | Người chơi làm gì | Thất bại khi |
|---|---|---|
| Quăng | Giữ để lấy lực (thanh dao động), thả để quăng. Quăng xa tăng nhẹ tỷ lệ cá hiếm. | – |
| Chờ | Quan sát phao. Có **cú rỉa giả** để thử phản xạ. | Giật sớm → cá sợ, chờ thêm |
| Cắn | Phao chìm + dấu **!** – có ~0,9 s (kỹ năng có thể kéo dài) để giật. | Hết thời gian → *Lỡ mất cá* |
| Kéo | Giữ KÉO: gây sát thương lên HP cá, thu khoảng cách, nhưng tăng **lực căng**. | Lực căng vùng đỏ quá lâu → *Đứt dây*. Khoảng cách ≥ 150 m → *Cá thoát* |
| Vùng vẫy | Cá luân phiên pha **bình tĩnh / vùng vẫy** (có lúc **cuồng nộ** khi yếu máu). Vùng vẫy: lực căng tăng mạnh, kéo kém hiệu quả, cá bơi ra xa. | |
| Thu phục | HP cá về 0 → cá bị kéo lên, nhận thưởng. | |

Chỉ số liên quan: HP cá, độ bền dây (từ cần × thể lực nhân vật), lực kéo, tốc thu dây, may mắn, tỷ lệ hiếm, chống đứt. Bước mô phỏng 50 ms cố định + RNG có seed → **tất định**, tái hiện được.

**Kỹ năng chủ động** (10 loại hiệu ứng): sát thương %HP, giảm lực căng, tăng tốc thu dây, choáng, xoa dịu, hồi độ bền, đóng băng, kéo cá lại gần, nhân đôi sát thương, thiêu đốt.
**Bị động** (16 loại): KN/vàng, giảm hao mòn dây, cửa sổ giật cần, cá cắn nhanh, lực kéo, may mắn, ngưỡng đứt, giảm vùng vẫy Boss, giảm tăng căng, tăng giảm căng, chí mạng, hồi độ bền, giảm vùng vẫy, sát thương Boss, khắc hệ.

## 4. Nội dung
- **12 nhân vật** (N×2, R×2, SR×3, SSR×3, UR×2) – `game-data/src/characters.ts`. Mở khóa: khởi đầu, theo cấp, bằng vàng, gacha (GĐ3).
- **15 cần câu** (N→UR) – `rods.ts`. Mua bằng vàng theo cấp; một số từ gacha/sự kiện.
- **55 loài cá**, 7 độ hiếm: Thường, Hiếm, Quý, Sử Thi, Huyền Thoại, Thần Thoại, Boss – `fishes.ts`. Mỗi cá có HP, Công, Thủ, Tốc, thuộc tính (7 hệ), kỹ năng PvP, giá trị, cân nặng, khu vực, tạo hình riêng.
- **6 khu vực** – `zones.ts`: Bến Câu Tân Thủ (cấp 1), Biển Nhiệt Đới (5), Vực Sâu Bí Ẩn (10), Biển Lửa (16), Vùng Băng Giá (22), Đại Dương Thần Thoại (30). Mỗi khu có bảng cá, Boss riêng (xuất hiện bất ngờ ~2%+), thời tiết riêng.

## 4b. Thú cưng & trang phục (0.3.0)
- Nhân vật là thú chibi: đầu to, mắt tròn long lanh, má hồng, bụng sáng màu; mỗi loài có tai/đuôi/hoa văn riêng.
- 3 ô trang bị: Mũ, Quần áo, Trang sức. Đồ hiện trên hình nhân vật. Chỉ số phụ ≤ 8% hoặc vài điểm may mắn – chủ yếu để đẹp.
- Mua bằng vàng hoặc kim cương; bán lại 50%. Một món chỉ mặc cho một nhân vật.
- Chợ giao dịch giữa người chơi (GĐ4): server chuyển đồ và tiền nguyên tử, kiểm tra sở hữu, phí chợ, lịch sử.

## 5. Tiến trình & kinh tế (GĐ1)
- KN lên cấp: `80 × cấp^1.55`. Cấp mở khu vực và nhân vật.
- Bắt cá: +KN, +10% giá trị cá bằng vàng; cá vào kho (giới hạn 200).
- Bán cá: giá = giá trị × (0,6 … 1,4 theo cân nặng).
- Mọi biến động có `txId` + sổ ghi (ledger), chống nhận trùng.
- GĐ3 thêm: kim cương, vé triệu hồi, mảnh linh hồn, vé Boss, nguyên liệu; cửa hàng, vòng quay có công bố tỷ lệ + bảo hiểm, nhiệm vụ, điểm danh, thành tựu.

## 6. Kế hoạch tính năng theo giai đoạn
| GĐ | Nội dung |
|---|---|
| 1 ✅ | Giao diện chính, câu cá, cá, kỹ năng, hiệu ứng, kho cá, lưu tiến trình |
| 2 | Nâng cấp / đột phá / thức tỉnh nhân vật & cần, tiến hóa cá, săn Boss bằng vé |
| 3 | Kim cương, cửa hàng, vòng quay (tỷ lệ server), nhiệm vụ, điểm danh, thành tựu |
| 4 | Supabase Auth + DB, Colyseus: 1v1, 3v3, phòng riêng, ghép trận ELO, chống gian lận |
| 5 | Hồ cá khoe, hồ sơ, bảng xếp hạng, hội, Boss cộng đồng |
| 6 | Âm nhạc, tối ưu, Android/iOS (Capacitor), triển khai production |

## 7. PvP (thiết kế cho GĐ4)
Lượt đấu: mỗi lượt cả hai chọn hành động (đánh / kỹ năng / đổi cá) trong thời hạn; server tính sát thương = f(Công, Thủ, khắc hệ, kỹ năng) bằng RNG có seed lưu trong `battle_records` để tái hiện. 3v3: đổi cá mất lượt, kỹ năng kết hợp khi đủ hệ. Xếp hạng ELO với các bậc Đồng → Thách Đấu, reset theo mùa.

## 8. Chống Pay-to-Win
Gói trả phí ưu tiên trang phục, skin, tiện lợi. Chỉ số mạnh nhất phải đạt được bằng chơi; PvP xếp hạng có ghép theo lực chiến.
