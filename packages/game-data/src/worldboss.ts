import type { WorldBossDef } from "@dccc/shared";

/** 7 BOSS THẾ GIỚI – sinh vật biển × trái cây, mỗi hệ 1 con (xoay vòng theo khung giờ 12h · 15h · 20h). */
export const WORLD_BOSSES: WorldBossDef[] = [
  { id: "wb_thanh_long", name: "Thanh Long Long Vương", title: "Dragon Fruit Emperor", element: "wood", def: 260, description: "Cá rồng thân dài vảy thanh long hồng, lá xanh dọc sống lưng, râu dài, đuôi lửa đỏ." },
  { id: "wb_ot_hoa", name: "Ớt Hỏa Long Ngư", title: "Chili Flame Dragonfish", element: "fire", def: 240, description: "Cá hình trái ớt đỏ bóng, to ở đầu thon nhọn về đuôi, đội đài lá và cuống ớt xanh." },
  { id: "wb_dua_hau", name: "Dưa Hấu Hải Quái", title: "Watermelon Leviathan", element: "water", def: 220, description: "Cá tròn vỏ dưa hấu sọc xanh, bụng ruột đỏ lấm tấm hạt đen, mầm lá phun nước trên đầu." },
  { id: "wb_dua_giap", name: "Dứa Giáp Long Quy", title: "Pineapple Dragon Turtle", element: "metal", def: 320, description: "Cá vảy vàng mắt dứa cứng như thép, đuôi là chùm lá dứa xanh xoè rộng." },
  { id: "wb_sau_rieng", name: "Sầu Riêng Bạo Ngư", title: "Durian Brute Puffer", element: "earth", def: 300, description: "Cá nóc khổng lồ phồng gai sầu riêng tua tủa, bụng lộ múi vàng kem." },
  { id: "wb_khe_tinh", name: "Khế Tinh Thần Ngư", title: "Starfruit Holy Ray", element: "light", def: 230, description: "Thần ngư thân khế vàng phát sáng, sao khế trên lưng, vầng hào quang trên đầu, vây như cánh." },
  { id: "wb_mang_cut", name: "Măng Cụt Hắc Mặc Ngư", title: "Mangosteen Ink Kraken", element: "dark", def: 250, description: "Cá tròn tím sẫm như trái măng cụt, đuôi là đài lá xanh sẫm nhọn cong xoè ra." },
];
export const WORLD_BOSS_BY_ID = new Map(WORLD_BOSSES.map((b) => [b.id, b]));
