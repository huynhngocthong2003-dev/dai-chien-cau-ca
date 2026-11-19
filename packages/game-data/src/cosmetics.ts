import type { CosmeticDef, ShopItemDef } from "@dccc/shared";

const g = (amount: number) => ({ currency: "gold" as const, amount });
const d = (amount: number) => ({ currency: "diamonds" as const, amount });

/** Quần áo, mũ, trang sức. Chỉ số phụ nhỏ (≤ 8%) để không pay-to-win. */
export const COSMETICS: CosmeticDef[] = [
  // ---- Mũ
  { id: "h_non_la", name: "Nón Lá", slot: "hat", rarity: "R", price: g(800), visual: { kind: "straw", color: "#f2c94c", accent: "#8d6e63" }, bonus: [{ kind: "luck_bonus", value: 2 }], description: "Che nắng bến sông. +2 may mắn." },
  { id: "h_mu_luoi_trai", name: "Mũ Lưỡi Trai Đỏ", slot: "hat", rarity: "R", price: g(600), visual: { kind: "cap", color: "#e53935", accent: "#ffffff" }, bonus: [{ kind: "xp_bonus", value: 0.03 }], description: "+3% kinh nghiệm." },
  { id: "h_bang_do_ninja", name: "Băng Đô Ninja", slot: "hat", rarity: "SR", price: g(1500), visual: { kind: "bandana", color: "#263238", accent: "#e53935" }, bonus: [{ kind: "bite_speed", value: 0.05 }], description: "Cá cắn nhanh hơn 5%." },
  { id: "h_mu_hai_tac", name: "Mũ Hải Tặc", slot: "hat", rarity: "SR", price: g(3000), visual: { kind: "pirate", color: "#212121", accent: "#ffd600" }, bonus: [{ kind: "pull_bonus", value: 0.03 }], description: "+3% lực kéo." },
  { id: "h_mu_tho_lan", name: "Mũ Thợ Lặn", slot: "hat", rarity: "SR", price: g(5000), visual: { kind: "helmet", color: "#f9a825", accent: "#90a4ae" }, bonus: [{ kind: "snap_threshold", value: 3 }], description: "Dây chịu căng thêm 3." },
  { id: "h_mu_tram_bang", name: "Mũ Trùm Băng", slot: "hat", rarity: "SR", price: d(80), visual: { kind: "hood", color: "#90caf9", accent: "#ffffff" }, bonus: [{ kind: "tension_gain_reduce", value: 0.03 }], description: "Lực căng tăng chậm hơn 3%." },
  { id: "h_vuong_mien", name: "Vương Miện Vàng", slot: "hat", rarity: "SSR", price: d(120), visual: { kind: "crown", color: "#ffc107", accent: "#e91e63" }, bonus: [{ kind: "gold_bonus", value: 0.05 }], description: "+5% vàng." },
  { id: "h_mu_phu_thuy", name: "Mũ Phù Thủy Sao", slot: "hat", rarity: "SSR", price: d(150), visual: { kind: "wizard", color: "#5e35b1", accent: "#ffeb3b" }, bonus: [{ kind: "luck_bonus", value: 5 }], description: "+5 may mắn." },
  // ---- Quần áo
  { id: "o_ao_thun_xanh", name: "Áo Thun Xanh Lá", slot: "outfit", rarity: "N", price: g(500), visual: { kind: "tee", color: "#43a047", accent: "#ffffff" }, bonus: [], description: "Áo thun mát mẻ. Chỉ để đẹp." },
  { id: "o_yem_ngu_dan", name: "Quần Yếm Ngư Dân", slot: "outfit", rarity: "R", price: g(1200), visual: { kind: "overalls", color: "#1565c0", accent: "#ffeb3b" }, bonus: [{ kind: "durability_loss_reduce", value: 0.03 }], description: "Dây hao mòn chậm hơn 3%." },
  { id: "o_ao_hawaii", name: "Áo Hawaii", slot: "outfit", rarity: "R", price: g(1500), visual: { kind: "hawaii", color: "#00bfa5", accent: "#ff4081" }, bonus: [{ kind: "bite_window_bonus", value: 0.05 }], description: "Cửa sổ giật cần dài hơn 5%." },
  { id: "o_ao_mua_vang", name: "Áo Mưa Vàng", slot: "outfit", rarity: "R", price: g(2000), visual: { kind: "raincoat", color: "#fdd835", accent: "#f57f17" }, bonus: [{ kind: "durability_regen", perSec: 1 }], description: "Dây tự hồi 1 độ bền/giây." },
  { id: "o_hoodie_ca_map", name: "Hoodie Cá Mập", slot: "outfit", rarity: "SR", price: d(60), visual: { kind: "hoodie", color: "#78909c", accent: "#ffffff" }, bonus: [{ kind: "xp_bonus", value: 0.05 }], description: "+5% kinh nghiệm." },
  { id: "o_kimono_anh_dao", name: "Kimono Anh Đào", slot: "outfit", rarity: "SR", price: d(100), visual: { kind: "kimono", color: "#f48fb1", accent: "#ffffff" }, bonus: [{ kind: "luck_bonus", value: 4 }], description: "+4 may mắn." },
  { id: "o_giap_hiep_si", name: "Giáp Hiệp Sĩ Biển", slot: "outfit", rarity: "SR", price: g(8000), visual: { kind: "armor", color: "#90a4ae", accent: "#ffd54f" }, bonus: [{ kind: "snap_threshold", value: 5 }], description: "Dây chịu căng thêm 5." },
  { id: "o_vest_lich_lam", name: "Vest Lịch Lãm", slot: "outfit", rarity: "SSR", price: d(150), visual: { kind: "tuxedo", color: "#212121", accent: "#e53935" }, bonus: [{ kind: "gold_bonus", value: 0.06 }], description: "+6% vàng." },
  // ---- Trang sức
  { id: "a_no_do", name: "Nơ Đỏ", slot: "accessory", rarity: "N", price: g(400), visual: { kind: "bowtie", color: "#e53935", accent: "#ffffff" }, bonus: [{ kind: "xp_bonus", value: 0.02 }], description: "+2% kinh nghiệm." },
  { id: "a_khan_quang", name: "Khăn Quàng Đỏ", slot: "accessory", rarity: "R", price: g(900), visual: { kind: "scarf", color: "#d32f2f", accent: "#ffeb3b" }, bonus: [{ kind: "tension_decay_bonus", value: 0.04 }], description: "Lực căng giảm nhanh hơn 4%." },
  { id: "a_kinh_ram", name: "Kính Râm Ngầu", slot: "accessory", rarity: "R", price: g(1800), visual: { kind: "glasses", color: "#212121", accent: "#4fc3f7" }, bonus: [{ kind: "bite_window_bonus", value: 0.08 }], description: "Cửa sổ giật cần dài hơn 8%." },
  { id: "a_vong_ngoc_trai", name: "Vòng Ngọc Trai", slot: "accessory", rarity: "SR", price: g(2500), visual: { kind: "pearl", color: "#fffaf0", accent: "#f8bbd0" }, bonus: [{ kind: "luck_bonus", value: 3 }], description: "+3 may mắn." },
  { id: "a_huy_chuong_vang", name: "Huy Chương Vàng", slot: "accessory", rarity: "SR", price: d(90), visual: { kind: "medal", color: "#ffc107", accent: "#1565c0" }, bonus: [{ kind: "gold_bonus", value: 0.05 }], description: "+5% vàng." },
  { id: "a_hoa_tai_kim_cuong", name: "Hoa Tai Kim Cương", slot: "accessory", rarity: "SSR", price: d(200), visual: { kind: "earrings", color: "#80d8ff", accent: "#ffffff" }, bonus: [{ kind: "crit", chance: 0.04, multiplier: 1.5 }], description: "4% chí mạng x1.5." },
  { id: "a_day_chuyen_long_ngoc", name: "Dây Chuyền Long Ngọc", slot: "accessory", rarity: "SSR", price: d(300), visual: { kind: "necklace", color: "#ffd700", accent: "#00e5ff" }, bonus: [{ kind: "boss_damage", value: 0.08 }], description: "+8% sát thương lên Boss." },
];

/** Vật phẩm tiêu hao bán trong cửa hàng. */
export const SHOP_ITEMS: ShopItemDef[] = [
  { id: "s_da_10", name: "Túi 10 Đá Nâng Cấp", icon: "🔷", price: g(900), grant: { stones: 10 }, description: "Dùng để nâng cấp nhân vật, cần câu, cá." },
  { id: "s_da_60", name: "Rương 60 Đá Nâng Cấp", icon: "🧰", price: d(40), grant: { stones: 60 }, description: "Gói lớn, tiết kiệm hơn." },
  { id: "s_ve_boss", name: "Vé Săn Boss", icon: "🎫", price: d(30), grant: { bossTickets: 1 }, description: "Thêm 1 lượt Săn Boss." },
  { id: "s_linh_hon_5", name: "5 Mảnh Linh Hồn", icon: "🔮", price: d(50), grant: { soul: 5 }, description: "Dùng để đột phá, thức tỉnh, tiến hóa." },
  { id: "s_vang_5000", name: "Túi 5.000 Vàng", icon: "💰", price: d(50), grant: { gold: 5000 }, description: "Đổi kim cương lấy vàng." },
];
