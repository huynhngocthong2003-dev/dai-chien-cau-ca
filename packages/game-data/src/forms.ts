import type { FishFormDef } from "@dccc/shared";

/** Các thể tiến hóa đột biến – CHỈ dành cho cá Boss. Vật phẩm rơi rất hiếm khi bắt cá;
 * mỗi thể có tỉ lệ thành công ẩn khác nhau (thất bại vẫn mất vật phẩm). */
export const FISH_FORMS: FishFormDef[] = [
  { id: "long", name: "Long Hóa", itemId: "e_ngoc_long_hon", itemName: "Ngọc Long Hồn", itemIcon: "🐉", mult: { hp: 1.6, atk: 1.5, def: 1.3 }, spdBonus: 5, element: null, glow: "#29b6f6", dropWeight: 3, divine: false, successRate: 0.35, description: "Hấp thụ hồn rồng: HP ×1,6, Công ×1,5, Thủ ×1,3." },
  { id: "hoa", name: "Hỏa Hóa", itemId: "e_loi_dung_nham", itemName: "Lõi Dung Nham", itemIcon: "🌋", mult: { hp: 1.3, atk: 1.8, def: 1.1 }, spdBonus: 8, element: "fire", glow: "#ff3d00", dropWeight: 3, divine: false, successRate: 0.3, description: "Thân rực lửa: Công ×1,8, chuyển sang hệ Lửa." },
  { id: "bang", name: "Băng Hóa", itemId: "e_tinh_the_bang_ha", itemName: "Tinh Thể Băng Hà", itemIcon: "❄️", mult: { hp: 1.5, atk: 1.3, def: 1.9 }, spdBonus: 0, element: "ice", glow: "#80d8ff", dropWeight: 3, divine: false, successRate: 0.3, description: "Giáp băng vĩnh cửu: Thủ ×1,9, chuyển sang hệ Băng." },
  { id: "loi", name: "Lôi Hóa", itemId: "e_sam_thach", itemName: "Sấm Thạch", itemIcon: "⚡", mult: { hp: 1.3, atk: 1.6, def: 1.2 }, spdBonus: 20, element: "thunder", glow: "#ffee58", dropWeight: 3, divine: false, successRate: 0.25, description: "Nhanh như chớp: Tốc +20, Công ×1,6, chuyển sang hệ Sấm." },
  { id: "than", name: "Thần Hóa", itemId: "e_long_phuong_than", itemName: "Lông Phượng Thần", itemIcon: "🪶", mult: { hp: 2.2, atk: 2.2, def: 2 }, spdBonus: 15, element: "light", glow: "#ff4081", dropWeight: 0, divine: true, successRate: 0.08, description: "Thần lực tối thượng: mọi chỉ số ×2, hệ Ánh Sáng. Cực kỳ hiếm!" },
];
