import type { WorldBossDef } from "@dccc/shared";

/** 7 BOSS THẾ GIỚI – sinh vật biển × trái cây, mỗi hệ 1 con (xoay vòng theo khung giờ 12h · 15h · 20h). */
export const WORLD_BOSSES: WorldBossDef[] = [
  { id: "wb_thanh_long", name: "Thanh Long Long Vương", title: "Dragon Fruit Emperor", element: "wood", def: 260, description: "Rồng phương Đông đầu cá, vảy thanh long đỏ hồng, gai lá xanh dọc sống lưng, râu rồng dài, mắt vàng rực, đuôi lửa xanh đỏ." },
  { id: "wb_ot_hoa", name: "Ớt Hỏa Long Ngư", title: "Chili Flame Dragonfish", element: "fire", def: 240, description: "Cá rồng vỏ ớt đỏ bóng loáng, cuống ớt xanh làm vương miện, vây và đuôi bốc lửa." },
  { id: "wb_dua_hau", name: "Dưa Hấu Hải Quái", title: "Watermelon Leviathan", element: "water", def: 220, description: "Hải quái tròn vo vỏ dưa hấu sọc xanh, bụng ruột đỏ lấm tấm hạt đen, phun nước từ mầm lá trên đầu." },
  { id: "wb_dua_giap", name: "Dứa Giáp Long Quy", title: "Pineapple Dragon Turtle", element: "metal", def: 320, description: "Long quy mai vàng mắt dứa cứng như thép, đội vương miện lá dứa, sừng rồng uốn cong." },
  { id: "wb_sau_rieng", name: "Sầu Riêng Bạo Ngư", title: "Durian Brute Puffer", element: "earth", def: 300, description: "Cá nóc khổng lồ phồng gai sầu riêng tua tủa, vỏ nứt lộ múi vàng kem." },
  { id: "wb_khe_tinh", name: "Khế Tinh Thần Ngư", title: "Starfruit Holy Ray", element: "light", def: 230, description: "Thần ngư thân khế vàng trong suốt phát sáng, cánh sao năm cánh, vầng hào quang trên đầu." },
  { id: "wb_mang_cut", name: "Măng Cụt Hắc Mặc Ngư", title: "Mangosteen Ink Kraken", element: "dark", def: 250, description: "Mực khổng lồ vỏ măng cụt tím sẫm, đài lá xanh trên đầu, xúc tu tím phun mực bóng tối." },
];
export const WORLD_BOSS_BY_ID = new Map(WORLD_BOSSES.map((b) => [b.id, b]));
