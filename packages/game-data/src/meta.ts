import type { QuestDef, RewardDef, TitleDef, TopupPackageDef, WheelPrizeDef } from "@dccc/shared";

/** Nhiệm vụ ngày (làm mới 0h giờ Việt Nam). */
export const QUESTS: QuestDef[] = [
  { id: "q_cau_10", name: "Câu 10 con cá", icon: "🎣", metric: "caught", target: 10, reward: { gold: 800, diamonds: 5 } },
  { id: "q_cau_30", name: "Câu 30 con cá", icon: "🐟", metric: "caught", target: 30, reward: { gold: 2000, stones: 10, diamonds: 10 } },
  { id: "q_rac_3", name: "Vớt 3 món rác", icon: "♻️", metric: "junk", target: 3, reward: { gold: 600, diamonds: 5 } },
  { id: "q_tai_che_5", name: "Tái chế 5 món rác", icon: "🌿", metric: "recycled", target: 5, reward: { diamonds: 10 } },
  { id: "q_boss_1", name: "Bắt 1 Boss", icon: "👑", metric: "bosses", target: 1, reward: { soul: 2, diamonds: 10 } },
  { id: "q_sinh_tu_1", name: "Thắng 1 trận Đấu Sinh Tử", icon: "⚔️", metric: "dmWins", target: 1, reward: { gold: 1000, diamonds: 10 } },
  { id: "q_quay_1", name: "Quay Vòng Quay 1 lần", icon: "🎡", metric: "spins", target: 1, reward: { gold: 300 } },
];

/** Điểm danh 7 ngày liên tiếp (lỡ 1 ngày quay lại ngày 1). */
export const CHECKIN_REWARDS: RewardDef[] = [
  { gold: 500 },
  { diamonds: 10 },
  { stones: 15 },
  { gold: 2000 },
  { diamonds: 30 },
  { bossTickets: 2, soul: 2 },
  { diamonds: 100, gold: 5000 },
];

/** Vòng Quay May Mắn – trọng số ẩn với người chơi. */
export const WHEEL_PRIZES: WheelPrizeDef[] = [
  { id: "wh_vang_nho", label: "500 Vàng", icon: "🪙", color: "#ffca28", weight: 26, reward: { gold: 500 } },
  { id: "wh_da", label: "10 Đá", icon: "🔷", color: "#7c4dff", weight: 16, reward: { stones: 10 } },
  { id: "wh_kc_nho", label: "20 KC", icon: "💎", color: "#29b6f6", weight: 12, reward: { diamonds: 20 } },
  { id: "wh_vang_lon", label: "3.000 Vàng", icon: "💰", color: "#ff9800", weight: 12, reward: { gold: 3000 } },
  { id: "wh_ve_boss", label: "1 Vé Boss", icon: "🎫", color: "#ef5350", weight: 9, reward: { bossTickets: 1 } },
  { id: "wh_linh_hon", label: "3 Linh Hồn", icon: "🔮", color: "#ea80fc", weight: 8, reward: { soul: 3 } },
  { id: "wh_da_lon", label: "40 Đá", icon: "💠", color: "#651fff", weight: 5, reward: { stones: 40 } },
  { id: "wh_vang_khung", label: "15.000 Vàng", icon: "🏆", color: "#ffd600", weight: 4, reward: { gold: 15000 } },
  { id: "wh_ve_boss_3", label: "3 Vé Boss", icon: "🎟️", color: "#d50000", weight: 3, reward: { bossTickets: 3 } },
  { id: "wh_kc_lon", label: "150 KC", icon: "💎", color: "#00e5ff", weight: 2.5, reward: { diamonds: 150 } },
  { id: "wh_linh_hon_lon", label: "15 Linh Hồn", icon: "👻", color: "#aa00ff", weight: 2, reward: { soul: 15 } },
  { id: "wh_dot_bien", label: "Ngọc Long Hồn", icon: "🐉", color: "#00b0ff", weight: 0.8, reward: { evoItem: "e_ngoc_long_hon" } },
  { id: "wh_dung_nham", label: "Lõi Dung Nham", icon: "🌋", color: "#ff3d00", weight: 0.8, reward: { evoItem: "e_loi_dung_nham" } },
  { id: "wh_bang_ha", label: "Tinh Thể Băng Hà", icon: "❄️", color: "#80d8ff", weight: 0.8, reward: { evoItem: "e_tinh_the_bang_ha" } },
  { id: "wh_sam_thach", label: "Sấm Thạch", icon: "⚡", color: "#ffee58", weight: 0.8, reward: { evoItem: "e_sam_thach" } },
  { id: "wh_jackpot", label: "500 KC", icon: "👑", color: "#ff4081", weight: 0.5, reward: { diamonds: 500 } },
  { id: "wh_can_hiem", label: "Cần Câu Hiếm", icon: "🎣", color: "#00bfa5", weight: 0.3, reward: { rodPool: ["r_long_cot", "r_phuong_hoang", "r_long_cot", "r_phuong_hoang", "r_hai_than"] } },
  { id: "wh_nhan_vat_hiem", label: "Nhân Vật Hiếm", icon: "🌟", color: "#e040fb", weight: 0.2, reward: { characterPool: ["c_long_vuong_tu", "c_hoa_than", "c_long_vuong_tu", "c_hoa_than", "c_hai_vuong", "c_than_sam"] } },
  { id: "wh_phuong_than", label: "Lông Phượng Thần", icon: "🪶", color: "#ff6d00", weight: 0.12, reward: { evoItem: "e_long_phuong_than" } },
];

/** Món "ngon" (trọng số ≤ 5): quay x10 được tăng tỉ lệ ra. */
export const WHEEL_GOOD_WEIGHT = 5;

/** Danh hiệu vui – mở khi đạt yêu cầu, đeo để hiện cạnh tên. */
export const TITLES: TitleDef[] = [
  { id: "t_tap_su", name: "Cần Thủ Tập Sự", icon: "🎣", description: "Câu được 10 con cá", metric: "caught", target: 10, color: "#a5d6a7", reward: { diamonds: 5 } },
  { id: "t_sat_thu", name: "Sát Thủ Đại Dương", icon: "🦈", description: "Câu được 500 con cá", metric: "caught", target: 500, color: "#4fc3f7", reward: { diamonds: 50 } },
  { id: "t_than_cau", name: "Thần Câu Ngàn Năm", icon: "🔱", description: "Câu được 3.000 con cá", metric: "caught", target: 3000, color: "#ffd54f", reward: { diamonds: 200 } },
  { id: "t_san_rac", name: "Kẻ Săn Lùng Rác", icon: "🗑️", description: "Vớt được 20 món rác", metric: "junk", target: 20, color: "#81c784", reward: { diamonds: 10 } },
  { id: "t_vua_rac", name: "Vua Nhặt Rác", icon: "👑", description: "Vớt được 200 món rác", metric: "junk", target: 200, color: "#66bb6a", reward: { diamonds: 60 } },
  { id: "t_chien_binh_xanh", name: "Chiến Binh Xanh", icon: "🌿", description: "Tái chế 50 món rác", metric: "recycled", target: 50, color: "#00e676", reward: { diamonds: 20 } },
  { id: "t_thien_than_tai_che", name: "Thiên Thần Tái Chế", icon: "♻️", description: "Tái chế 500 món rác", metric: "recycled", target: 500, color: "#69f0ae", reward: { diamonds: 120 } },
  { id: "t_tho_san_boss", name: "Thợ Săn Boss", icon: "🐲", description: "Bắt được 5 Boss", metric: "bosses", target: 5, color: "#ff8a65", reward: { diamonds: 20 } },
  { id: "t_diet_boss", name: "Diệt Boss Vô Song", icon: "⚡", description: "Bắt được 50 Boss", metric: "bosses", target: 50, color: "#ff5252", reward: { diamonds: 100 } },
  { id: "t_dau_si", name: "Đấu Sĩ Máu Lửa", icon: "⚔️", description: "Thắng 10 trận Đấu Sinh Tử", metric: "dmWins", target: 10, color: "#ff7043", reward: { diamonds: 30 } },
  { id: "t_chien_than", name: "Chiến Thần Bất Diệt", icon: "🔥", description: "Thắng 100 trận Đấu Sinh Tử", metric: "dmWins", target: 100, color: "#ff1744", reward: { diamonds: 150 } },
  { id: "t_dau_bep", name: "Đầu Bếp Cá Nướng", icon: "🍖", description: "Cho nhân vật ăn 10 con cá nướng", metric: "roastedEaten", target: 10, color: "#ffb74d", reward: { diamonds: 20 } },
  { id: "t_nha_suu_tam", name: "Nhà Sưu Tầm Thủy Sinh", icon: "📖", description: "Câu được 20 loài cá khác nhau", metric: "species", target: 20, color: "#ce93d8", reward: { diamonds: 40 } },
  { id: "t_phu_thuy", name: "Phù Thủy Đột Biến", icon: "🧬", description: "Sở hữu 1 cá Boss đột biến", metric: "forms", target: 1, color: "#e040fb", reward: { diamonds: 30 } },
  { id: "t_dai_gia", name: "Đại Gia Làng Chài", icon: "💰", description: "Có 1.000.000 vàng", metric: "gold", target: 1_000_000, color: "#ffd740", reward: { diamonds: 50 } },
  { id: "t_luc_si", name: "Lực Sĩ Kéo Cá", icon: "💪", description: "Câu được con cá nặng 100 kg", metric: "heaviest", target: 100, color: "#90a4ae", reward: { diamonds: 30 } },
  { id: "t_nghien_quay", name: "Con Nghiện Vòng Quay", icon: "🎡", description: "Quay Vòng Quay 50 lần", metric: "spins", target: 50, color: "#b388ff", reward: { diamonds: 20 } },
  { id: "t_chuyen_can", name: "Chuyên Cần Gương Mẫu", icon: "📅", description: "Điểm danh 30 ngày", metric: "checkins", target: 30, color: "#80deea", reward: { diamonds: 60 } },
  { id: "t_lao_lang", name: "Lão Làng Bến Cá", icon: "🧓", description: "Đạt cấp 50", metric: "level", target: 50, color: "#bcaaa4", reward: { diamonds: 80 } },
];

/** Gói nạp (VNĐ) – giá do chủ dự án đặt. */
export const TOPUP_PACKAGES: TopupPackageDef[] = [
  { id: "kc100", name: "100 Kim Cương", icon: "💎", vnd: 20_000, diamonds: 100 },
  { id: "kc300", name: "300 Kim Cương", icon: "💠", vnd: 50_000, diamonds: 300 },
  { id: "auto2d", name: "Câu Tự Động 2 ngày", icon: "🤖", vnd: 20_000, autoFishHours: 48 },
];
