import type { EvoItemDef, FishFormDef } from "@dccc/shared";

/** Vật phẩm đột biến – rơi rất hiếm khi câu cá (Boss ×3). Dùng là đột biến chắc chắn thành công. */
export const EVO_ITEMS: EvoItemDef[] = [
  { id: "e_ngoc_long_hon", name: "Ngọc Long Hồn", icon: "🐉", glow: "#29b6f6", dropWeight: 3, divine: false, element: "water", description: "Đá Tiến Hoá hệ Thủy – hồn rồng ngàn năm." },
  { id: "e_loi_dung_nham", name: "Lõi Dung Nham", icon: "🌋", glow: "#ff3d00", dropWeight: 3, divine: false, element: "fire", description: "Đá Tiến Hoá hệ Hỏa – lõi lửa núi lửa đáy biển." },
  { id: "e_tinh_the_bang_ha", name: "Tinh Thể Băng Hà", icon: "❄️", glow: "#80d8ff", dropWeight: 3, divine: false, element: "water", description: "Đá Tiến Hoá hệ Băng – băng vĩnh cửu cực bắc." },
  { id: "e_sam_thach", name: "Sấm Thạch", icon: "⚡", glow: "#ffee58", dropWeight: 3, divine: false, element: "metal", description: "Đá Tiến Hoá hệ Lôi – đá sét giữa tâm bão." },
  { id: "e_u_minh_thach", name: "U Minh Thạch", icon: "🌑", glow: "#b388ff", dropWeight: 0, divine: false, element: "dark", description: "Đá vạn năng – dùng thay Đá Tiến Hoá của mọi hệ." },
  { id: "e_thanh_quang_thach", name: "Thánh Quang Thạch", icon: "🌟", glow: "#fff59d", dropWeight: 0, divine: false, element: "light", description: "Đá vạn năng – dùng thay Đá Tiến Hoá của mọi hệ." },
  { id: "e_dia_mach_thach", name: "Địa Mạch Thạch", icon: "🪨", glow: "#bcaaa4", dropWeight: 0, divine: false, element: "earth", description: "Đá vạn năng – dùng thay Đá Tiến Hoá của mọi hệ." },
  { id: "e_long_phuong_than", name: "Lông Phượng Thần", icon: "🪶", glow: "#ff4081", dropWeight: 0, divine: true, description: "Thần vật cực hiếm – dùng thay Đá Tiến Hoá của MỌI hệ." },
];

const L = (body: string, belly: string, fin: string, eyeColor: string, aura: FishFormDef["look"]["aura"], o: Partial<FishFormDef["look"]> = {}): FishFormDef["look"] => ({
  body, belly, fin, eyeColor, aura, pattern: "scales", patternColor: fin, horns: false, spikes: false, teeth: true, ...o,
});

/** Mỗi vật phẩm → 2–3 dạng cùng hệ, ra ngẫu nhiên; dạng nào cũng mạnh hơn hẳn cá thường. */
export const FISH_FORMS: FishFormDef[] = [
  // ——— Ngọc Long Hồn
  { id: "long", name: "Thanh Long", itemId: "e_ngoc_long_hon", mult: { hp: 1.65, atk: 1.55, def: 1.35 }, spdBonus: 6, element: "water", glow: "#1de9b6",
    look: L("#00897b", "#b2dfdb", "#26c6da", "#ffeb3b", "dragon", { horns: true, spikes: true }), description: "Rồng xanh thủy cung: râu rồng, sừng ngọc, vảy phát sáng. HP ×1,65 · Công ×1,55." },
  { id: "long_hac", name: "Hắc Long", itemId: "e_ngoc_long_hon", mult: { hp: 1.55, atk: 1.8, def: 1.3 }, spdBonus: 9, element: "dark", glow: "#aa00ff",
    look: L("#212121", "#4a148c", "#7b1fa2", "#ff1744", "blackdragon", { horns: true, spikes: true }), description: "Rồng đen vực thẳm, mắt đỏ rực. Công ×1,8 · hệ Bóng Tối." },
  { id: "long_kim", name: "Kim Long", itemId: "e_ngoc_long_hon", mult: { hp: 1.8, atk: 1.55, def: 1.5 }, spdBonus: 6, element: "light", glow: "#ffd600",
    look: L("#ffb300", "#fff8e1", "#fff176", "#d50000", "golddragon", { horns: true, spikes: true }), description: "Rồng vàng hoàng tộc, ánh kim chói lọi. HP ×1,8 · Thủ ×1,5 · hệ Ánh Sáng." },
  { id: "long_huyet", name: "Huyết Long", itemId: "e_ngoc_long_hon", mult: { hp: 1.5, atk: 1.85, def: 1.25 }, spdBonus: 8, element: "fire", glow: "#ff1744",
    look: L("#7f0000", "#ff8a80", "#ff1744", "#ffea00", "blackdragon", { horns: true, spikes: true, palette: ["#b71c1c", "#ff8a80", "#ff1744"] }), description: "Rồng máu cuồng nộ, bờm đỏ như lửa. Công ×1,85 · hệ Lửa." },
  { id: "long_bich", name: "Bích Ngọc Long", itemId: "e_ngoc_long_hon", mult: { hp: 1.75, atk: 1.45, def: 1.55 }, spdBonus: 7, element: "water", glow: "#00e676",
    look: L("#1b5e20", "#c8e6c9", "#69f0ae", "#ffd600", "dragon", { horns: true, spikes: true, palette: ["#00c853", "#b9f6ca", "#00e676"] }), description: "Rồng ngọc bích, vảy xanh như lá non. HP ×1,75 · Thủ ×1,55." },
  // ——— Lõi Dung Nham
  { id: "hoa", name: "Hỏa Viêm", itemId: "e_loi_dung_nham", mult: { hp: 1.35, atk: 1.85, def: 1.15 }, spdBonus: 9, element: "fire", glow: "#ff3d00",
    look: L("#d32f2f", "#ffcc80", "#ff9100", "#ffeb3b", "flame", { spikes: true }), description: "Thân rực lửa đỏ, vây là ngọn lửa. Công ×1,85 · hệ Lửa." },
  { id: "hoa_hac", name: "Hắc Viêm", itemId: "e_loi_dung_nham", mult: { hp: 1.35, atk: 2.0, def: 1.1 }, spdBonus: 11, element: "dark", glow: "#7c4dff",
    look: L("#1a1a1a", "#4527a0", "#651fff", "#ea80fc", "darkflame", { spikes: true }), description: "Lửa đen địa ngục thiêu cả bóng tối. Công ×2,0 · hệ Bóng Tối." },
  { id: "hoa_lam", name: "Lam Viêm", itemId: "e_loi_dung_nham", mult: { hp: 1.45, atk: 1.9, def: 1.2 }, spdBonus: 13, element: "fire", glow: "#00b0ff",
    look: L("#0d47a1", "#80d8ff", "#00e5ff", "#ffffff", "blueflame", { spikes: true }), description: "Lửa xanh nhiệt độ cao nhất. Công ×1,9 · Tốc +13 · hệ Lửa." },
  { id: "hoa_kim", name: "Kim Viêm", itemId: "e_loi_dung_nham", mult: { hp: 1.5, atk: 1.85, def: 1.25 }, spdBonus: 10, element: "light", glow: "#ffd600",
    look: L("#ff8f00", "#fff8e1", "#ffd54f", "#d50000", "flame", { spikes: true, palette: ["#ff6f00", "#ffd600", "#ffffff"] }), description: "Lửa vàng thần thánh, chói như mặt trời. Công ×1,85 · hệ Ánh Sáng." },
  { id: "hoa_luc", name: "Lục Quỷ Hỏa", itemId: "e_loi_dung_nham", mult: { hp: 1.4, atk: 1.95, def: 1.1 }, spdBonus: 14, element: "dark", glow: "#00e676",
    look: L("#1b2e1b", "#69f0ae", "#00e676", "#ccff90", "darkflame", { spikes: true, palette: ["#003300", "#00e676", "#ccff90"] }), description: "Lửa ma xanh lục chập chờn. Công ×1,95 · Tốc +14 · hệ Bóng Tối." },
  // ——— Tinh Thể Băng Hà
  { id: "bang", name: "Băng Tinh", itemId: "e_tinh_the_bang_ha", mult: { hp: 1.55, atk: 1.35, def: 1.95 }, spdBonus: 2, element: "water", glow: "#80d8ff",
    look: L("#4fc3f7", "#e1f5fe", "#b3e5fc", "#01579b", "ice", { spikes: true }), description: "Giáp pha lê băng mọc khắp lưng. Thủ ×1,95 · hệ Băng." },
  { id: "bang_tuyet", name: "Tuyết Ma", itemId: "e_tinh_the_bang_ha", mult: { hp: 1.75, atk: 1.45, def: 1.75 }, spdBonus: 5, element: "water", glow: "#e3f2fd",
    look: L("#eceff1", "#ffffff", "#b0bec5", "#00b0ff", "frost", { pattern: "spots", patternColor: "#cfd8dc" }), description: "Bóng ma tuyết trắng, sương lạnh bao quanh. HP ×1,75 · hệ Băng." },
  { id: "bang_han", name: "Hàn Ngục", itemId: "e_tinh_the_bang_ha", mult: { hp: 1.6, atk: 1.55, def: 2.05 }, spdBonus: 3, element: "dark", glow: "#2962ff",
    look: L("#0d1b4a", "#1e88e5", "#4fc3f7", "#00e5ff", "abyss", { spikes: true, horns: true }), description: "Băng ngục đáy biển, gai băng đen. Thủ ×2,05 · hệ Bóng Tối." },
  { id: "bang_tinh_van", name: "Tinh Vân Băng", itemId: "e_tinh_the_bang_ha", mult: { hp: 1.65, atk: 1.45, def: 1.85 }, spdBonus: 6, element: "light", glow: "#ea80fc",
    look: L("#b39ddb", "#f3e5f5", "#f8bbd0", "#7c4dff", "ice", { spikes: true, palette: ["#f8bbd0", "#7c4dff", "#ffffff"] }), description: "Băng cực quang tím hồng lấp lánh. Thủ ×1,85 · hệ Ánh Sáng." },
  { id: "bang_huyen", name: "Huyền Băng", itemId: "e_tinh_the_bang_ha", mult: { hp: 1.7, atk: 1.4, def: 2.0 }, spdBonus: 2, element: "water", glow: "#18ffff",
    look: L("#006064", "#84ffff", "#18ffff", "#ffffff", "abyss", { spikes: true, palette: ["#00bcd4", "#004d40", "#18ffff"] }), description: "Băng huyền bí đáy đại dương. Thủ ×2,0 · hệ Nước." },
  // ——— Sấm Thạch
  { id: "loi", name: "Lôi Quang", itemId: "e_sam_thach", mult: { hp: 1.35, atk: 1.65, def: 1.25 }, spdBonus: 22, element: "metal", glow: "#ffee58",
    look: L("#fbc02d", "#fff9c4", "#fff59d", "#1a237e", "lightning", { pattern: "stripes", patternColor: "#f57f17" }), description: "Thân vàng điện, sét chạy quanh mình. Tốc +22 · hệ Sấm." },
  { id: "loi_tu", name: "Tử Lôi", itemId: "e_sam_thach", mult: { hp: 1.35, atk: 1.8, def: 1.2 }, spdBonus: 24, element: "metal", glow: "#e040fb",
    look: L("#6a1b9a", "#e1bee7", "#e040fb", "#ffff00", "purplebolt", { pattern: "stripes", patternColor: "#ea80fc" }), description: "Sét tím thiên phạt. Công ×1,8 · Tốc +24 · hệ Sấm." },
  { id: "loi_bao", name: "Bạo Lôi Long", itemId: "e_sam_thach", mult: { hp: 1.5, atk: 1.7, def: 1.35 }, spdBonus: 20, element: "metal", glow: "#ffd600",
    look: L("#37474f", "#90a4ae", "#ffeb3b", "#ffeb3b", "storm", { horns: true, spikes: true }), description: "Long ngư giữa tâm bão, mây giông quấn thân. HP ×1,5 · hệ Sấm." },
  { id: "loi_huyet", name: "Huyết Lôi", itemId: "e_sam_thach", mult: { hp: 1.35, atk: 1.85, def: 1.15 }, spdBonus: 21, element: "fire", glow: "#ff1744",
    look: L("#4e0000", "#ff8a80", "#ff1744", "#ffea00", "lightning", { pattern: "stripes", patternColor: "#ff5252", palette: ["#ff1744", "#ff1744", "#ff1744"] }), description: "Sét máu đỏ rực. Công ×1,85 · Tốc +21 · hệ Lửa." },
  { id: "loi_bang", name: "Băng Lôi", itemId: "e_sam_thach", mult: { hp: 1.45, atk: 1.6, def: 1.4 }, spdBonus: 20, element: "water", glow: "#00e5ff",
    look: L("#01579b", "#e1f5fe", "#00e5ff", "#ffffff", "storm", { horns: true, spikes: true, palette: ["#00e5ff", "#00e5ff", "#00e5ff"] }), description: "Bão sét băng giá. Thủ ×1,4 · Tốc +20 · hệ Băng." },
  // ——— Lông Phượng Thần (thần vật)
  { id: "than", name: "Phượng Hoàng Thần", itemId: "e_long_phuong_than", mult: { hp: 2.2, atk: 2.3, def: 2.0 }, spdBonus: 16, element: "fire", glow: "#ff6d00",
    look: L("#ff5722", "#ffe0b2", "#ffd54f", "#ffffff", "phoenix", { horns: true }), description: "Cánh lửa phượng hoàng, bất tử tái sinh. Mọi chỉ số ×2+ · hệ Lửa." },
  { id: "than_thien", name: "Thiên Thần Ngư", itemId: "e_long_phuong_than", mult: { hp: 2.35, atk: 2.1, def: 2.25 }, spdBonus: 16, element: "light", glow: "#fff59d",
    look: L("#fffde7", "#ffffff", "#fff176", "#2979ff", "angel", { pattern: "none" }), description: "Cánh thiên thần và hào quang thánh. Mọi chỉ số ×2+ · hệ Ánh Sáng." },
  { id: "than_ma", name: "Ma Thần Ngư", itemId: "e_long_phuong_than", mult: { hp: 2.2, atk: 2.4, def: 1.95 }, spdBonus: 17, element: "dark", glow: "#d500f9",
    look: L("#12001f", "#6a1b9a", "#aa00ff", "#ff1744", "phoenix", { horns: true, palette: ["#1a0033", "#aa00ff", "#ff4081"] }), description: "Cánh ma thần đen tím, lửa tà khí. Công ×2,4 · hệ Bóng Tối." },
  { id: "than_hai", name: "Hải Thần Ngư", itemId: "e_long_phuong_than", mult: { hp: 2.4, atk: 2.05, def: 2.2 }, spdBonus: 16, element: "water", glow: "#00b0ff",
    look: L("#0d47a1", "#e3f2fd", "#40c4ff", "#ffd600", "angel", { pattern: "scales", palette: ["#e1f5fe", "#40c4ff", "#ffd600"] }), description: "Thần biển với đôi cánh sóng và vương miện vàng. HP ×2,4 · hệ Nước." },
];
