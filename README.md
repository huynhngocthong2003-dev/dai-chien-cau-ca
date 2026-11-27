# 🎣 ĐẠI CHIẾN CÂU CÁ

Game câu cá 2D hoạt hình: quăng cần, chống lại cá quái vật vùng vẫy, sưu tầm 55 loài cá, 12 nhân vật, 15 cần câu và 6 khu vực. Mục tiêu dài hạn: PvP online thật (Colyseus), hội, sự kiện.

**Trạng thái:** Giai đoạn 2 xong, Giai đoạn 3 đang làm (cửa hàng, trang phục) – xem [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md).

## Chơi ngay
- Web: https://huynhngocthong2003-dev.github.io/dai-chien-cau-ca/
- Bản trên claude.ai: https://claude.ai/artifact/UUQjn9CvJUM84c6iH2vXTZ
- **HERO ARENA** (game riêng, Battle Royale 20 anh hùng, chơi chung): https://huynhngocthong2003-dev.github.io/dai-chien-cau-ca/hero-arena/

## Chạy trên máy
Cần Node.js ≥ 22 và pnpm 10.
```bash
pnpm install
pnpm dev
```
Mở http://localhost:5173. Trên điện thoại cùng mạng Wi-Fi: mở `http://<IP-máy-tính>:5173`.

## Cách chơi
1. **Câu Cá** → chọn khu vực → **Bắt Đầu Câu!**
2. Nhấn giữ màn hình (hoặc Space) để lấy lực, thả ra để quăng.
3. Chờ phao **chìm hẳn và hiện dấu !** rồi bấm ngay để giật cần (bấm lúc phao rỉa nhẹ là giật sớm).
4. Giữ **KÉO** để thu dây. Khi cá vùng vẫy hoặc lực căng vào vùng đỏ: thả tay ra, nếu không dây sẽ đứt. Để cá bơi quá xa thì cá thoát.
5. **Q** hoặc nút kỹ năng để dùng kỹ năng nhân vật.
6. Bán cá trong **Kho Cá** lấy vàng để mua cần câu tốt hơn. Lên cấp để mở khu vực và nhân vật mới.

Tài liệu: [GAME_DESIGN](docs/GAME_DESIGN.md) · [TECHNICAL_ARCHITECTURE](docs/TECHNICAL_ARCHITECTURE.md) · [CLAUDE.md](CLAUDE.md)
