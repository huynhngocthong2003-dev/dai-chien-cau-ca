# CLAUDE.md – Quy tắc phát triển ĐẠI CHIẾN CÂU CÁ

Đọc file này trước mọi thay đổi. Sau đó đọc `docs/PROJECT_STATUS.md` để biết đang ở giai đoạn nào.

## Lệnh thường dùng
```bash
pnpm install          # cài thư viện (pnpm workspace)
pnpm dev              # chạy game ở http://localhost:5173
pnpm test             # unit test (Vitest)
pnpm typecheck        # kiểm tra TypeScript toàn bộ workspace
pnpm lint             # ESLint
pnpm build            # build web (apps/game-client/dist)
pnpm build:artifact   # build 1 file HTML + chuyển sang dạng Artifact (dist-single/artifact.html)
pnpm test:e2e         # E2E: chơi thật 1 ván bằng Playwright (cần `pnpm dev` đang chạy)
```

## Cấu trúc
- `packages/game-config` – hằng số cân bằng (không logic).
- `packages/shared` – kiểu dữ liệu + logic thuần túy, tất định (RNG có seed, phiên câu cá, kinh tế, save). **Chạy được cả client và server.**
- `packages/game-data` – dữ liệu nhân vật, cần câu, cá, khu vực. Chỉ dữ liệu.
- `packages/validation` – schema Zod cho dữ liệu vào/ra (save, tên người chơi; sau này: message PvP).
- `apps/game-client` – Phaser 3 + Vite. `art/` vẽ thủ tục bằng Canvas2D, `scenes/` mỗi màn hình một file, `ui/` widget dùng chung, `state/` GameState + storage.
- `apps/game-server` – (Giai đoạn 4) Colyseus.
- `apps/mobile` – (Giai đoạn 6) Capacitor.
- `supabase/` – (Giai đoạn 4) migrations, edge functions.
- `tests/unit`, `tests/e2e`, `docs/`.

## Quy tắc bắt buộc
1. Kiểm tra cấu trúc dự án trước khi sửa; không tạo file trùng chức năng.
2. Logic gameplay/kinh tế viết trong `packages/shared` dưới dạng hàm thuần túy, có test. Scene chỉ hiển thị và gọi logic.
3. Mọi thay đổi tiền tệ/phần thưởng đi qua hàm trong `shared/save.ts`, có `txId` duy nhất và ghi sổ `ledger`. Ở Giai đoạn 4 các hàm này chạy trên server – client không bao giờ tự cộng tiền.
4. Không nút bấm “chết”: tính năng chưa làm phải hiển thị khóa + thông báo giai đoạn.
5. Không dữ liệu giả để đánh dấu hoàn thành. Không nhận đã xong khi chưa chạy `pnpm test`, `pnpm typecheck`, `pnpm lint` và E2E.
6. Không bỏ qua lỗi TypeScript hay lỗi console.
7. Khóa phiên bản dependency (`save-exact=true`). Phaser **3.x** (không lên 4). Kiểm tra tài liệu chính thức trước khi dùng thư viện mới.
8. Không đưa secret/service-role key vào frontend. Không lưu thông tin thanh toán.
9. Không triển khai giao dịch tiền thật hoặc phát hành store khi chưa có đồng ý của chủ dự án.
10. Sau mỗi giai đoạn: cập nhật `CHANGELOG.md`, `docs/PROJECT_STATUS.md`, tạo git commit checkpoint.

## Quy ước
- Văn bản hiển thị: tiếng Việt. Tên biến/hàm: tiếng Anh. Comment: tiếng Việt.
- ID dữ liệu: tiền tố `c_` nhân vật, `r_` cần câu, `f_` cá, `z_` khu vực.
- Màn hình logic 1280×720, `Scale.FIT`.
