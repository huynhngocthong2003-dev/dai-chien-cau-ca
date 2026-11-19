import type { CosmeticDef, ShopItemDef } from "@dccc/shared";

const g = (amount: number) => ({ currency: "gold" as const, amount });
const d = (amount: number) => ({ currency: "diamonds" as const, amount });

/** Quần áo, mũ, trang sức. Chỉ số phụ nhỏ (≤ 8%) để không pay-to-win. */
export const COSMETICS: CosmeticDef[] = [
  // ---- Mũ
  { id: "h_non_la", name: "Nón Lá", slot: "hat", tier: "rare", price: g(800), visual: { kind: "straw", color: "#f2c94c", accent: "#8d6e63" }, bonus: [{ kind: "luck_bonus", value: 2 }], description: "Che nắng bến sông. +2 may mắn." },
  { id: "h_mu_luoi_trai", name: "Mũ Lưỡi Trai Đỏ", slot: "hat", tier: "rare", price: g(600), visual: { kind: "cap", color: "#e53935", accent: "#ffffff" }, bonus: [{ kind: "xp_bonus", value: 0.03 }], description: "+3% kinh nghiệm." },
  { id: "h_bang_do_ninja", name: "Băng Đô Ninja", slot: "hat", tier: "superior", price: g(1500), visual: { kind: "bandana", color: "#263238", accent: "#e53935" }, bonus: [{ kind: "bite_speed", value: 0.05 }], description: "Cá cắn nhanh hơn 5%." },
  { id: "h_mu_hai_tac", name: "Mũ Hải Tặc", slot: "hat", tier: "superior", price: g(3000), visual: { kind: "pirate", color: "#212121", accent: "#ffd600" }, bonus: [{ kind: "pull_bonus", value: 0.03 }], description: "+3% lực kéo." },
  { id: "h_mu_tho_lan", name: "Mũ Thợ Lặn", slot: "hat", tier: "superior", price: g(5000), visual: { kind: "helmet", color: "#f9a825", accent: "#90a4ae" }, bonus: [{ kind: "snap_threshold", value: 3 }], description: "Dây chịu căng thêm 3." },
  { id: "h_mu_tram_bang", name: "Mũ Trùm Băng", slot: "hat", tier: "superior", price: d(80), visual: { kind: "hood", color: "#90caf9", accent: "#ffffff" }, bonus: [{ kind: "tension_gain_reduce", value: 0.03 }], description: "Lực căng tăng chậm hơn 3%." },
  { id: "h_vuong_mien", name: "Vương Miện Vàng", slot: "hat", tier: "legendary", price: d(120), visual: { kind: "crown", color: "#ffc107", accent: "#e91e63" }, bonus: [{ kind: "gold_bonus", value: 0.05 }], description: "+5% vàng." },
  { id: "h_mu_phu_thuy", name: "Mũ Phù Thủy Sao", slot: "hat", tier: "legendary", price: d(150), visual: { kind: "wizard", color: "#5e35b1", accent: "#ffeb3b" }, bonus: [{ kind: "luck_bonus", value: 5 }], description: "+5 may mắn." },
  // ---- Quần áo
  { id: "o_ao_thun_xanh", name: "Áo Thun Xanh Lá", slot: "outfit", tier: "common", price: g(500), visual: { kind: "tee", color: "#43a047", accent: "#ffffff" }, bonus: [], description: "Áo thun mát mẻ. Chỉ để đẹp." },
  { id: "o_yem_ngu_dan", name: "Quần Yếm Ngư Dân", slot: "outfit", tier: "rare", price: g(1200), visual: { kind: "overalls", color: "#1565c0", accent: "#ffeb3b" }, bonus: [{ kind: "durability_loss_reduce", value: 0.03 }], description: "Dây hao mòn chậm hơn 3%." },
  { id: "o_ao_hawaii", name: "Áo Hawaii", slot: "outfit", tier: "rare", price: g(1500), visual: { kind: "hawaii", color: "#00bfa5", accent: "#ff4081" }, bonus: [{ kind: "bite_window_bonus", value: 0.05 }], description: "Cửa sổ giật cần dài hơn 5%." },
  { id: "o_ao_mua_vang", name: "Áo Mưa Vàng", slot: "outfit", tier: "rare", price: g(2000), visual: { kind: "raincoat", color: "#fdd835", accent: "#f57f17" }, bonus: [{ kind: "durability_regen", perSec: 1 }], description: "Dây tự hồi 1 độ bền/giây." },
  { id: "o_hoodie_ca_map", name: "Hoodie Cá Mập", slot: "outfit", tier: "superior", price: d(60), visual: { kind: "hoodie", color: "#78909c", accent: "#ffffff" }, bonus: [{ kind: "xp_bonus", value: 0.05 }], description: "+5% kinh nghiệm." },
  { id: "o_kimono_anh_dao", name: "Kimono Anh Đào", slot: "outfit", tier: "superior", price: d(100), visual: { kind: "kimono", color: "#f48fb1", accent: "#ffffff" }, bonus: [{ kind: "luck_bonus", value: 4 }], description: "+4 may mắn." },
  { id: "o_giap_hiep_si", name: "Giáp Hiệp Sĩ Biển", slot: "outfit", tier: "superior", price: g(8000), visual: { kind: "armor", color: "#90a4ae", accent: "#ffd54f" }, bonus: [{ kind: "snap_threshold", value: 5 }], description: "Dây chịu căng thêm 5." },
  { id: "o_vest_lich_lam", name: "Vest Lịch Lãm", slot: "outfit", tier: "legendary", price: d(150), visual: { kind: "tuxedo", color: "#212121", accent: "#e53935" }, bonus: [{ kind: "gold_bonus", value: 0.06 }], description: "+6% vàng." },
  // ---- Trang sức
  { id: "a_no_do", name: "Nơ Đỏ", slot: "accessory", tier: "common", price: g(400), visual: { kind: "bowtie", color: "#e53935", accent: "#ffffff" }, bonus: [{ kind: "xp_bonus", value: 0.02 }], description: "+2% kinh nghiệm." },
  { id: "a_khan_quang", name: "Khăn Quàng Đỏ", slot: "accessory", tier: "rare", price: g(900), visual: { kind: "scarf", color: "#d32f2f", accent: "#ffeb3b" }, bonus: [{ kind: "tension_decay_bonus", value: 0.04 }], description: "Lực căng giảm nhanh hơn 4%." },
  { id: "a_kinh_ram", name: "Kính Râm Ngầu", slot: "accessory", tier: "rare", price: g(1800), visual: { kind: "glasses", color: "#212121", accent: "#4fc3f7" }, bonus: [{ kind: "bite_window_bonus", value: 0.05 }], description: "Cửa sổ giật cần dài hơn 5%." },
  { id: "a_vong_ngoc_trai", name: "Vòng Ngọc Trai", slot: "accessory", tier: "superior", price: g(2500), visual: { kind: "pearl", color: "#fffaf0", accent: "#f8bbd0" }, bonus: [{ kind: "luck_bonus", value: 3 }], description: "+3 may mắn." },
  { id: "a_huy_chuong_vang", name: "Huy Chương Vàng", slot: "accessory", tier: "superior", price: d(90), visual: { kind: "medal", color: "#ffc107", accent: "#1565c0" }, bonus: [{ kind: "gold_bonus", value: 0.05 }], description: "+5% vàng." },
  { id: "a_hoa_tai_kim_cuong", name: "Hoa Tai Kim Cương", slot: "accessory", tier: "legendary", price: d(200), visual: { kind: "earrings", color: "#80d8ff", accent: "#ffffff" }, bonus: [{ kind: "crit", chance: 0.04, multiplier: 1.5 }], description: "4% chí mạng x1.5." },
  { id: "a_day_chuyen_long_ngoc", name: "Dây Chuyền Long Ngọc", slot: "accessory", tier: "legendary", price: d(300), visual: { kind: "necklace", color: "#ffd700", accent: "#00e5ff" }, bonus: [{ kind: "boss_damage", value: 0.08 }], description: "+8% sát thương lên Boss." },
  // ---- Thần Phẩm cho mũ / áo / trang sức
  { id: "h_vuong_mien_than", name: "Vương Miện Thần Thánh", slot: "hat", tier: "divine", price: d(600), visual: { kind: "crown", color: "#ffe082", accent: "#00e5ff" }, bonus: [{ kind: "luck_bonus", value: 12 }, { kind: "gold_bonus", value: 0.1 }], description: "+12 may mắn, +10% vàng. Hào quang cầu vồng." },
  { id: "o_than_giap_cuu_long", name: "Thần Giáp Cửu Long", slot: "outfit", tier: "divine", price: d(900), visual: { kind: "armor", color: "#ffd54f", accent: "#d50000" }, bonus: [{ kind: "snap_threshold", value: 12 }, { kind: "durability_loss_reduce", value: 0.1 }], description: "Dây chịu căng thêm 12, hao mòn chậm hơn 10%." },
  { id: "a_ngoc_boi_than_hai", name: "Ngọc Bội Thần Hải", slot: "accessory", tier: "divine", price: d(600), visual: { kind: "necklace", color: "#ffd700", accent: "#ff1744" }, bonus: [{ kind: "crit", chance: 0.08, multiplier: 2 }, { kind: "boss_damage", value: 0.1 }], description: "8% chí mạng x2, +10% sát thương Boss." },
  // ---- Cánh
  { id: "w_canh_ga_con", name: "Cánh Gà Con", slot: "wings", tier: "rare", price: g(3000), visual: { kind: "fluffy", color: "#fff59d", accent: "#ffb300" }, bonus: [{ kind: "xp_bonus", value: 0.03 }], description: "Đôi cánh bông xù đáng yêu. +3% kinh nghiệm." },
  { id: "w_canh_buom_pha_le", name: "Cánh Bướm Pha Lê", slot: "wings", tier: "superior", price: d(120), visual: { kind: "butterfly", color: "#80deea", accent: "#ea80fc" }, bonus: [{ kind: "luck_bonus", value: 5 }, { kind: "bite_window_bonus", value: 0.05 }], description: "+5 may mắn, cửa sổ giật cần dài hơn 5%. Phát sáng." },
  { id: "w_canh_thien_than", name: "Cánh Thiên Thần", slot: "wings", tier: "legendary", price: d(300), visual: { kind: "angel", color: "#ffffff", accent: "#ffe082" }, bonus: [{ kind: "luck_bonus", value: 8 }, { kind: "gold_bonus", value: 0.08 }], description: "+8 may mắn, +8% vàng. Lông vũ ánh sáng bay quanh." },
  { id: "w_canh_ac_ma", name: "Cánh Ác Ma", slot: "wings", tier: "legendary", price: d(300), visual: { kind: "demon", color: "#212121", accent: "#ff1744" }, bonus: [{ kind: "boss_damage", value: 0.1 }, { kind: "crit", chance: 0.05, multiplier: 1.5 }], description: "+10% sát thương Boss, 5% chí mạng x1.5." },
  { id: "w_canh_phuong_hoang_than", name: "Cánh Phượng Hoàng Thần", slot: "wings", tier: "divine", price: d(800), visual: { kind: "phoenix", color: "#ff6d00", accent: "#ffea00" }, bonus: [{ kind: "pull_bonus", value: 0.1 }, { kind: "luck_bonus", value: 15 }, { kind: "durability_regen", perSec: 5 }], description: "+10% lực kéo, +15 may mắn, dây hồi 5/giây. Lửa thần bao quanh." },
  { id: "w_canh_long_than", name: "Cánh Long Thần", slot: "wings", tier: "divine", price: d(800), visual: { kind: "dragon", color: "#1565c0", accent: "#ffd600" }, bonus: [{ kind: "boss_damage", value: 0.15 }, { kind: "struggle_reduce", value: 0.1 }], description: "+15% sát thương Boss, cá vùng vẫy yếu đi 10%." },
  // ---- Sừng / hào quang
  { id: "n_sung_quy_nho", name: "Sừng Quỷ Nhỏ", slot: "horns", tier: "rare", price: g(2500), visual: { kind: "devil", color: "#e53935", accent: "#ff8a80" }, bonus: [{ kind: "pull_bonus", value: 0.03 }], description: "Tinh nghịch. +3% lực kéo." },
  { id: "n_sung_ky_lan", name: "Sừng Kỳ Lân", slot: "horns", tier: "superior", price: d(100), visual: { kind: "unicorn", color: "#fff8e1", accent: "#f48fb1" }, bonus: [{ kind: "luck_bonus", value: 5 }], description: "+5 may mắn. Phát sáng." },
  { id: "n_sung_rong_vang", name: "Sừng Rồng Vàng", slot: "horns", tier: "legendary", price: d(250), visual: { kind: "dragon", color: "#ffc107", accent: "#ff6f00" }, bonus: [{ kind: "boss_damage", value: 0.08 }, { kind: "pull_bonus", value: 0.05 }], description: "+8% sát thương Boss, +5% lực kéo." },
  { id: "n_hao_quang_thanh", name: "Hào Quang Thánh", slot: "horns", tier: "legendary", price: d(250), visual: { kind: "halo", color: "#ffeb3b", accent: "#ffffff" }, bonus: [{ kind: "xp_bonus", value: 0.08 }, { kind: "luck_bonus", value: 5 }], description: "+8% kinh nghiệm, +5 may mắn." },
  { id: "n_sung_than_sam", name: "Sừng Thần Sấm", slot: "horns", tier: "divine", price: d(700), visual: { kind: "thunder", color: "#ffee58", accent: "#2979ff" }, bonus: [{ kind: "crit", chance: 0.1, multiplier: 2 }, { kind: "tension_gain_reduce", value: 0.1 }], description: "10% chí mạng x2, lực căng tăng chậm hơn 10%. Sét chạy quanh." },
];

/** Vật phẩm tiêu hao bán trong cửa hàng. */
export const SHOP_ITEMS: ShopItemDef[] = [
  { id: "s_da_10", name: "Túi 10 Đá Nâng Cấp", icon: "🔷", price: g(900), grant: { stones: 10 }, description: "Dùng để nâng cấp nhân vật, cần câu, cá." },
  { id: "s_da_60", name: "Rương 60 Đá Nâng Cấp", icon: "🧰", price: d(40), grant: { stones: 60 }, description: "Gói lớn, tiết kiệm hơn." },
  { id: "s_ve_boss", name: "Vé Săn Boss", icon: "🎫", price: d(30), grant: { bossTickets: 1 }, description: "Thêm 1 lượt Săn Boss." },
  { id: "s_linh_hon_5", name: "5 Mảnh Linh Hồn", icon: "🔮", price: d(50), grant: { soul: 5 }, description: "Dùng để đột phá, thức tỉnh, tiến hóa." },
  { id: "s_vang_5000", name: "Túi 5.000 Vàng", icon: "💰", price: d(50), grant: { gold: 5000 }, description: "Đổi kim cương lấy vàng." },
];
