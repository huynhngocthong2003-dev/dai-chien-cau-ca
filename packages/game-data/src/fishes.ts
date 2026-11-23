import type { Element, FishAppearance, FishDef, FishRarity } from "@dccc/shared";
import { ZONES } from "./zones.ts";
import { GENERATED_HYBRIDS } from "./breeding.ts";

/** Chỉ số cơ bản theo bậc khu vực (1..6). */
const TIER_HP = [0, 90, 220, 450, 800, 1300, 2000];
const TIER_VALUE = [0, 20, 60, 150, 320, 650, 1200];
const RARITY_MUL: Record<FishRarity, number> = {
  common: 1,
  rare: 1.5,
  precious: 2.1,
  epic: 2.8,
  legendary: 3.6,
  mythic: 4.6,
  boss: 6,
};
const RARITY_VALUE_MUL: Record<FishRarity, number> = {
  common: 1,
  rare: 2,
  precious: 3.5,
  epic: 6,
  legendary: 12,
  mythic: 25,
  boss: 30,
};

type Look = Partial<FishAppearance> & Pick<FishAppearance, "shape" | "body">;

function fish(
  id: string,
  name: string,
  rarity: FishRarity,
  element: Element,
  tier: number,
  zones: string[],
  spd: number,
  weightKg: [number, number],
  look: Look,
  skill: [string, string],
  description: string,
): FishDef {
  const m = RARITY_MUL[rarity];
  const hp = Math.round(TIER_HP[tier]! * m);
  const appearance: FishAppearance = {
    belly: "#fff8e1",
    fin: look.body,
    pattern: "none",
    patternColor: "#00000033",
    teeth: false,
    horns: false,
    spikes: false,
    eye: "normal",
    eyeColor: "#000000",
    glow: null,
    scale: 1,
    ...look,
  };
  return {
    id,
    name,
    rarity,
    element,
    hp,
    atk: Math.round(12 * tier * m * (0.8 + spd / 250)),
    def: Math.round(10 * tier * m * (1.1 - spd / 250)),
    spd,
    skill: { id: `fs_${id.slice(2)}`, name: skill[0], description: skill[1] },
    value: Math.round(TIER_VALUE[tier]! * RARITY_VALUE_MUL[rarity]),
    xp: Math.round(8 * tier * m),
    weightKg,
    zones,
    appearance,
    description,
  };
}

/** Cá lai: Boss bậc 6, chỉ số nhân theo bậc lai (Boss Lai ×1 · Siêu Boss ×1.15 · Mythic ×1.35 · Gen Lặn ×1.6). */
function hybrids(list: [string, string, Element, number, number, [number, number], Look, [string, string], string][]): FishDef[] {
  return list.map(([id, name, el, mult, spd, w, look, skill, desc]) => {
    const f = fish(id, name, "boss", el, 6, [], spd, w, { scale: 1.6, ...look }, skill, desc);
    return { ...f, hp: Math.round(f.hp * mult), atk: Math.round(f.atk * mult), def: Math.round(f.def * mult), value: Math.round(f.value * mult), xp: Math.round(f.xp * mult) };
  });
}

const Z1 = "z_ben_tan_thu";
const Z2 = "z_bien_nhiet_doi";
const Z3 = "z_vuc_sau";
const Z4 = "z_bien_lua";
const Z5 = "z_bang_gia";
const Z6 = "z_dai_duong_than_thoai";
const Z7 = "z_vuong_quoc_kim_loai";

const RAW_FISHES: FishDef[] = [
  // ===== Bến Câu Tân Thủ =====
  fish("f_ca_ro", "Cá Rô Đồng", "common", "water", 1, [Z1], 30, [0.1, 0.6],
    { shape: "round", body: "#8d9b5a", belly: "#e6ee9c", pattern: "scales", patternColor: "#55602a55" },
    ["Vây Gai", "Phản 10% sát thương."], "Nhỏ mà có võ, vây lưng sắc như dao."),
  fish("f_ca_chep", "Cá Chép Vàng", "common", "water", 1, [Z1], 25, [0.5, 3],
    { shape: "round", body: "#ffb300", belly: "#fff3e0", fin: "#ff7043", pattern: "scales", patternColor: "#e6510055" },
    ["Vảy Vàng", "Tăng 10% phòng thủ."], "Biểu tượng của may mắn ở làng chài."),
  fish("f_ca_tre", "Cá Trê Râu Dài", "common", "earth", 1, [Z1], 35, [0.3, 2.5],
    { shape: "long", body: "#5d4037", belly: "#bcaaa4", eye: "angry", eyeColor: "#212121" },
    ["Quẫy Bùn", "Giảm chính xác của đối thủ."], "Râu dài đánh hơi mồi từ xa."),
  fish("f_ca_hu", "Cá Hú Mập", "common", "water", 1, [Z1], 20, [1, 5],
    { shape: "round", body: "#90a4ae", belly: "#eceff1", scale: 1.1 },
    ["Thân Dày", "Hồi 5% HP mỗi lượt."], "Ăn nhiều, ngủ nhiều, kéo rất nặng tay."),
  fish("f_ca_loc", "Cá Lóc Gầm Gừ", "rare", "dark", 1, [Z1], 55, [0.8, 4],
    { shape: "long", body: "#37474f", belly: "#90a4ae", pattern: "spots", patternColor: "#1c2529aa", teeth: true, eye: "angry", eyeColor: "#d32f2f" },
    ["Cắn Xé", "Sát thương x1.5 lên mục tiêu dưới 50% HP."], "Cá săn mồi hung dữ nhất bến sông."),
  fish("f_ca_tai_tuong", "Cá Tai Tượng", "precious", "earth", 1, [Z1], 30, [2, 8],
    { shape: "flat", body: "#a1887f", belly: "#ffe0b2", fin: "#ef9a9a", pattern: "stripes", patternColor: "#6d4c4155", scale: 1.15 },
    ["Tai Tượng Che Chắn", "Chặn 1 đòn tấn công."], "Thân dẹt to như cái quạt."),
  fish("f_ca_chep_rong", "Cá Chép Hóa Rồng", "epic", "light", 1, [Z1, Z2], 60, [3, 10],
    { shape: "long", body: "#ffca28", belly: "#fff8e1", fin: "#ff5722", pattern: "scales", patternColor: "#ff8f0066", horns: true, eye: "glow", eyeColor: "#ff1744", glow: "#ffe082", scale: 1.2 },
    ["Vượt Vũ Môn", "Hồi sinh với 30% HP một lần."], "Truyền thuyết kể nó đã vượt thác để hóa rồng."),
  fish("f_boss_lao_ngu", "Lão Ngư Sừng Sắt", "boss", "earth", 1, [Z1], 45, [40, 120],
    { shape: "long", body: "#e0a800", belly: "#fff176", fin: "#8d6e63", pattern: "scales", patternColor: "#9e6b0088", teeth: true, horns: true, eye: "glow", eyeColor: "#ff1744", scale: 1.7 },
    ["Húc Sừng", "Gây sát thương lớn và làm choáng."], "Chúa tể trăm năm của bến sông, sừng cứng như sắt."),

  // ===== Biển Nhiệt Đới =====
  fish("f_ca_he", "Cá Hề Sọc Cam", "common", "water", 2, [Z2], 40, [0.1, 0.4],
    { shape: "round", body: "#ff6d00", belly: "#ffe0b2", fin: "#212121", pattern: "stripes", patternColor: "#ffffffee", scale: 0.85 },
    ["Trốn Hải Quỳ", "Né 1 đòn."], "Thích trốn trong hải quỳ và trêu chọc cần thủ."),
  fish("f_ca_bo", "Cá Bò Mắt Xanh", "common", "water", 2, [Z2], 35, [0.5, 2],
    { shape: "flat", body: "#4db6ac", belly: "#e0f2f1", eye: "glow", eyeColor: "#00e5ff" },
    ["Da Cứng", "Giảm 10% sát thương nhận."], "Da sần như giấy nhám."),
  fish("f_ca_vet", "Cá Vẹt Cầu Vồng", "rare", "light", 2, [Z2], 45, [1, 6],
    { shape: "round", body: "#26c6da", belly: "#b2ff59", fin: "#ec407a", pattern: "scales", patternColor: "#7c4dff55" },
    ["Mỏ Vẹt", "Phá giáp đối thủ."], "Nhai san hô rau ráu, đổi màu theo ánh nắng."),
  fish("f_ca_noc", "Cá Nóc Gai", "rare", "dark", 2, [Z2], 25, [0.4, 2],
    { shape: "puffer", body: "#fdd835", belly: "#fffde7", pattern: "spots", patternColor: "#5d403799", spikes: true, eye: "angry", eyeColor: "#212121" },
    ["Phồng Độc", "Gây độc 3 lượt."], "Phồng to như quả bóng gai khi bị kéo."),
  fish("f_ca_kiem", "Cá Kiếm Lướt Sóng", "precious", "water", 2, [Z2], 85, [20, 80],
    { shape: "long", body: "#1e88e5", belly: "#e3f2fd", fin: "#0d47a1", horns: true, eye: "angry", eyeColor: "#0d47a1", scale: 1.25 },
    ["Đâm Xuyên", "Bỏ qua 30% phòng thủ."], "Tốc độ lướt sóng nhanh như tên bắn."),
  fish("f_ca_mu", "Cá Mú Khổng Lồ", "precious", "earth", 2, [Z2], 20, [30, 150],
    { shape: "round", body: "#6d4c41", belly: "#d7ccc8", pattern: "spots", patternColor: "#3e272399", teeth: true, scale: 1.35 },
    ["Nuốt Chửng", "Hút 15% HP đối thủ."], "Miệng to đủ nuốt cả một con cá mập con."),
  fish("f_ca_map_bua", "Cá Mập Búa", "epic", "water", 2, [Z2], 70, [80, 300],
    { shape: "shark", body: "#78909c", belly: "#eceff1", teeth: true, eye: "angry", eyeColor: "#ff1744", scale: 1.4 },
    ["Búa Tạ", "Gây sát thương lan sang cá kế tiếp."], "Đầu búa đánh nát cả thuyền nhỏ."),
  fish("f_boss_bao_chua_san_ho", "Bạo Chúa San Hô", "boss", "water", 2, [Z2], 50, [200, 600],
    { shape: "puffer", body: "#ff5252", belly: "#ffcdd2", fin: "#ff8a80", pattern: "spots", patternColor: "#ffffffaa", teeth: true, spikes: true, horns: true, eye: "glow", eyeColor: "#ffff00", scale: 1.8 },
    ["Rạn San Hô", "Tạo khiên gai phản sát thương."], "Rạn san hô sống, ăn mọi thứ đi ngang qua."),

  // ===== Vực Sâu Bí Ẩn =====
  fish("f_ca_den_long", "Cá Đèn Lồng", "common", "light", 5, [Z3], 30, [0.5, 3],
    { shape: "angler", body: "#3949ab", belly: "#7986cb", teeth: true, eye: "glow", eyeColor: "#e1f5fe", glow: "#fff59d" },
    ["Ánh Sáng Mê Hoặc", "Làm đối thủ mất lượt."], "Chiếc đèn trên đầu dụ con mồi lại gần."),
  fish("f_ca_ma", "Cá Ma Trong Suốt", "common", "dark", 5, [Z3], 50, [0.2, 1.5],
    { shape: "long", body: "#b0bec566", belly: "#eceff166", fin: "#cfd8dc88", eye: "glow", eyeColor: "#80d8ff" },
    ["Tàng Hình", "Né đòn 30%."], "Nhìn xuyên được cả xương sống."),
  fish("f_luon_dien", "Lươn Điện Vực Sâu", "rare", "metal", 5, [Z3, Z6], 70, [2, 12],
    { shape: "eel", body: "#1a237e", belly: "#ffeb3b", pattern: "stripes", patternColor: "#ffff00aa", eye: "glow", eyeColor: "#ffff00", glow: "#ffff8d" },
    ["Phóng Điện", "Gây choáng 1 lượt."], "Mỗi cú quẫy phát ra 600 vôn."),
  fish("f_ca_rang_kiem", "Cá Răng Kiếm", "rare", "dark", 5, [Z3], 65, [1, 5],
    { shape: "round", body: "#212121", belly: "#616161", teeth: true, eye: "angry", eyeColor: "#ff1744", scale: 1.05 },
    ["Răng Nanh", "Gây chảy máu."], "Răng dài đến mức không ngậm được miệng."),
  fish("f_ca_mat_quy", "Cá Mắt Quỷ", "precious", "dark", 5, [Z3], 45, [3, 15],
    { shape: "angler", body: "#4a148c", belly: "#7b1fa2", teeth: true, eye: "glow", eyeColor: "#ff1744", glow: "#ea80fc", scale: 1.2 },
    ["Ánh Nhìn Ma Quỷ", "Giảm tấn công đối thủ 20%."], "Ai nhìn vào mắt nó sẽ gặp ác mộng ba đêm."),
  fish("f_ca_ho_bong_dem", "Cá Hố Bóng Đêm", "precious", "dark", 5, [Z3], 75, [4, 20],
    { shape: "eel", body: "#cfd8dc", belly: "#ffffff", fin: "#90a4ae", teeth: true, eye: "angry", eyeColor: "#263238" },
    ["Lưỡi Bạc", "Tấn công 2 lần."], "Thân bạc dài như thanh kiếm."),
  fish("f_ac_ngu_gai_tim", "Ác Ngư Gai Tím", "epic", "dark", 5, [Z3], 40, [30, 120],
    { shape: "puffer", body: "#6a1b9a", belly: "#ce93d8", fin: "#9c27b0", spikes: true, teeth: true, eye: "glow", eyeColor: "#ff1744", scale: 1.4 },
    ["Gai Độc Tím", "Phản sát thương và gây độc."], "Gai nhọn mọc khắp người, miệng đầy răng cưa."),
  fish("f_boss_thuy_quai_kraken", "Thủy Quái Kraken", "boss", "dark", 5, [Z3], 52, [600, 2000],
    { shape: "angler", body: "#8e63d6", belly: "#d9c8ff", fin: "#7048c0", eye: "glow", eyeColor: "#ffe082", glow: "#b388ff", scale: 1.8 },
    ["Xúc Tu Siết", "Quấn đối thủ, giảm tốc 2 lượt."], "Đầu tròn khổng lồ, 6 xúc tu cuộn sóng dưới đáy vực. Bố/mẹ lai tạo với Phượng Hoàng Biển."),
  fish("f_boss_hac_long", "Hắc Long Ngư Vực Thẳm", "boss", "dark", 5, [Z3], 60, [500, 1500],
    { shape: "serpent", body: "#1b0033", belly: "#4a148c", fin: "#7c4dff", spikes: true, teeth: true, horns: true, eye: "glow", eyeColor: "#00e5ff", glow: "#7c4dff", scale: 1.9 },
    ["Hố Đen", "Hút năng lượng toàn đội đối thủ."], "Kẻ canh giữ đáy vực, chưa ai thấy hết thân nó."),

  // ===== Biển Lửa =====
  fish("f_ca_than_hong", "Cá Than Hồng", "common", "fire", 4, [Z4], 40, [0.5, 3],
    { shape: "round", body: "#424242", belly: "#ff7043", pattern: "spots", patternColor: "#ff3d00cc", eye: "glow", eyeColor: "#ffab00" },
    ["Than Nóng", "Gây bỏng."], "Vảy như than đang cháy âm ỉ."),
  fish("f_ca_dung_nham", "Cá Dung Nham", "common", "fire", 4, [Z4], 30, [1, 6],
    { shape: "round", body: "#d84315", belly: "#ffcc80", pattern: "stripes", patternColor: "#ffeb3b88", scale: 1.1 },
    ["Phun Nham", "Gây sát thương lửa."], "Sống được trong dòng nham thạch."),
  fish("f_ca_phuong_lua", "Cá Phượng Lửa", "rare", "fire", 4, [Z4], 75, [2, 10],
    { shape: "long", body: "#ff6f00", belly: "#ffe082", fin: "#ff1744", eye: "glow", eyeColor: "#ffff00", glow: "#ffab40" },
    ["Cánh Lửa", "Tăng tốc độ."], "Vây như đôi cánh lửa xòe rộng."),
  fish("f_ca_noc_nui_lua", "Cá Nóc Núi Lửa", "rare", "fire", 4, [Z4], 25, [1, 5],
    { shape: "puffer", body: "#bf360c", belly: "#ffab91", spikes: true, teeth: true, eye: "angry", eyeColor: "#ffeb3b" },
    ["Nổ Tung", "Gây sát thương lớn khi bị hạ."], "Phồng lên rồi phun khói như núi lửa."),
  fish("f_ca_map_hoa_nguc", "Cá Mập Hỏa Ngục", "precious", "fire", 4, [Z4], 80, [100, 400],
    { shape: "shark", body: "#b71c1c", belly: "#ffcdd2", fin: "#ff6f00", teeth: true, eye: "glow", eyeColor: "#ffeb3b", glow: "#ff3d00", scale: 1.4 },
    ["Hàm Lửa", "Cắn kèm bỏng 2 lượt."], "Ngửi thấy mồi cách 10 hải lý."),
  fish("f_ran_bien_lua", "Rắn Biển Lửa", "epic", "fire", 4, [Z4], 70, [40, 160],
    { shape: "serpent", body: "#ff3d00", belly: "#ffe0b2", fin: "#ffd600", spikes: true, eye: "glow", eyeColor: "#ffff00", glow: "#ff9100", scale: 1.5 },
    ["Quấn Lửa", "Trói đối thủ 2 lượt."], "Thân dài quấn chặt, nóng như lò rèn."),
  fish("f_hoa_long_ngu", "Hỏa Long Ngư", "legendary", "fire", 4, [Z4, Z6], 75, [80, 300],
    { shape: "long", body: "#ff6d00", belly: "#fff176", fin: "#d50000", pattern: "scales", patternColor: "#d5000066", teeth: true, horns: true, eye: "glow", eyeColor: "#ff1744", glow: "#ffab00", scale: 1.6 },
    ["Long Hỏa", "Thiêu đốt toàn đội đối thủ."], "Nửa cá nửa rồng, thở ra lửa dưới nước."),
  fish("f_boss_hoa_nguc_bao_ngu", "Hỏa Ngục Bạo Ngư", "boss", "fire", 4, [Z4], 65, [800, 2500],
    { shape: "angler", body: "#ff8f00", belly: "#ffecb3", fin: "#ff3d00", pattern: "scales", patternColor: "#d84315aa", teeth: true, horns: true, spikes: true, eye: "glow", eyeColor: "#ff1744", glow: "#ff3d00", scale: 2 },
    ["Miệng Núi Lửa", "Nuốt chửng – gây sát thương bằng 40% HP."], "Hàm răng như dãy núi lửa, mỗi tiếng gầm làm biển sôi."),

  // ===== Vương Quốc Kim Loại (hệ Kim) =====
  fish("f_ca_thiec_bac", "Cá Thiếc Bạc", "common", "metal", 3, [Z7], 40, [1, 7],
    { shape: "long", body: "#b0bec5", belly: "#eceff1", fin: "#78909c", pattern: "scales", patternColor: "#ffffff88" },
    ["Vảy Thiếc", "Giảm 10% sát thương nhận vào."], "Vảy bạc sáng loáng như lá thiếc mới đánh bóng."),
  fish("f_ca_dong_do", "Cá Đồng Đỏ", "common", "metal", 3, [Z7], 45, [1, 9],
    { shape: "round", body: "#c77b3f", belly: "#ffe0b2", fin: "#8d4b1f", pattern: "spots", patternColor: "#5d300f66" },
    ["Thân Đồng", "Tăng phòng thủ 2 lượt."], "Thân đúc bằng đồng đỏ, gõ vào kêu boong boong."),
  fish("f_ca_banh_rang", "Cá Bánh Răng", "rare", "metal", 3, [Z7], 50, [2, 10],
    { shape: "flat", body: "#90a4ae", belly: "#cfd8dc", fin: "#ffca28", spikes: true, eye: "glow", eyeColor: "#ffca28" },
    ["Xoay Bánh Răng", "Đánh 2 lần với 60% sát thương."], "Vây lưng là một bánh răng quay tít không ngừng."),
  fish("f_ca_giap_sat", "Cá Giáp Sắt", "rare", "metal", 3, [Z7], 30, [3, 14],
    { shape: "puffer", body: "#607d8b", belly: "#b0bec5", fin: "#455a64", spikes: true, eye: "angry", eyeColor: "#ffab00" },
    ["Giáp Gai", "Phản 15% sát thương cận chiến."], "Phồng lên thành quả cầu sắt đầy gai."),
  fish("f_ca_kiem_thep", "Cá Kiếm Thép", "precious", "metal", 3, [Z7], 85, [40, 160],
    { shape: "long", body: "#cfd8dc", belly: "#ffffff", fin: "#546e7a", eye: "angry", eyeColor: "#263238", scale: 1.4 },
    ["Kiếm Thép", "Xuyên 30% phòng thủ."], "Mũi kiếm rèn từ thép tinh luyện ngàn lần."),
  fish("f_ca_map_thep", "Cá Mập Thép", "epic", "metal", 3, [Z7], 70, [400, 1200],
    { shape: "shark", body: "#78909c", belly: "#eceff1", fin: "#37474f", teeth: true, spikes: true, eye: "glow", eyeColor: "#ff6d00", scale: 1.5 },
    ["Hàm Thép", "Cắn xé, sát thương ×1.6 lên mục tiêu dưới 50% máu."], "Hàm răng thép nghiền nát cả mỏ neo."),
  fish("f_kim_giap_long_ngu", "Kim Giáp Long Ngư", "legendary", "metal", 3, [Z7], 72, [180, 600],
    { shape: "serpent", body: "#ffca28", belly: "#fff8e1", fin: "#ff8f00", pattern: "scales", patternColor: "#8d6e0088", spikes: true, horns: true, eye: "glow", eyeColor: "#ffffff", glow: "#ffe082", scale: 1.7 },
    ["Kim Giáp Hộ Thể", "Miễn nhiễm sát thương 1 lượt, sau đó phản đòn."], "Rồng biển khoác giáp vàng ròng, mỗi vảy là một tấm khiên."),
  fish("f_boss_kim_long_de", "Kim Long Đế", "boss", "metal", 3, [Z7], 66, [1800, 4500],
    { shape: "serpent", body: "#b8860b", belly: "#ffe082", fin: "#fff59d", spikes: true, teeth: true, horns: true, eye: "glow", eyeColor: "#ff1744", glow: "#ffd740", scale: 2 },
    ["Vạn Kiếm Quy Tông", "Triệu hồi mưa kiếm vàng, giảm phòng thủ toàn đội đối thủ."], "Đế vương của Vương Quốc Kim Loại, thân rèn từ vàng và thép thần."),
  fish("f_sboss_kim_tien", "Cá Kim Tiền Tí Hon", "boss", "metal", 3, [Z7], 95, [0.2, 0.6],
    { shape: "round", body: "#ffd740", belly: "#fff8e1", fin: "#ff8f00", pattern: "scales", patternColor: "#b8860b88", eye: "glow", eyeColor: "#ff6d00", glow: "#fff59d", scale: 0.5 },
    ["Mưa Tiền Vàng", "Né 50% đòn đánh, mỗi lượt rơi vàng."], "Bé tí như đồng xu nhưng là Boss – ai câu được sẽ phát tài cả năm."),

  // ===== Vùng Băng Giá =====
  fish("f_ca_tuyet", "Cá Tuyết Bạc", "common", "water", 5, [Z5], 35, [1, 8],
    { shape: "long", body: "#b0bec5", belly: "#ffffff", pattern: "spots", patternColor: "#78909c88" },
    ["Thân Lạnh", "Làm chậm đối thủ."], "Món khoái khẩu của gấu bắc cực."),
  fish("f_ca_hoi_bang", "Cá Hồi Băng", "common", "water", 5, [Z5], 55, [2, 12],
    { shape: "long", body: "#ef9a9a", belly: "#e1f5fe", fin: "#90caf9", pattern: "spots", patternColor: "#5c6bc066" },
    ["Ngược Dòng", "Tăng tốc độ 2 lượt."], "Bơi ngược cả dòng sông băng."),
  fish("f_ca_pha_le", "Cá Pha Lê", "rare", "water", 5, [Z5], 45, [0.5, 4],
    { shape: "flat", body: "#b3e5fc", belly: "#ffffff", fin: "#e1f5fe", eye: "glow", eyeColor: "#00b0ff", glow: "#e1f5fe" },
    ["Khúc Xạ", "Phản 20% sát thương phép."], "Trong suốt như pha lê, lấp lánh dưới băng."),
  fish("f_ca_noc_bang", "Cá Nóc Băng", "rare", "water", 5, [Z5], 25, [1, 6],
    { shape: "puffer", body: "#4fc3f7", belly: "#e1f5fe", spikes: true, eye: "angry", eyeColor: "#01579b" },
    ["Gai Băng", "Đóng băng đối thủ 1 lượt."], "Gai của nó là những mũi băng nhọn."),
  fish("f_ca_voi_sat_thu", "Cá Voi Sát Thủ Băng", "precious", "water", 5, [Z5], 70, [300, 900],
    { shape: "shark", body: "#212121", belly: "#ffffff", fin: "#212121", teeth: true, eye: "angry", eyeColor: "#d32f2f", scale: 1.5 },
    ["Săn Bầy", "Tăng sát thương theo số cá đồng đội."], "Thợ săn đỉnh cao của vùng cực."),
  fish("f_ca_kiem_bang", "Cá Kiếm Băng", "epic", "water", 5, [Z5], 90, [60, 200],
    { shape: "long", body: "#4fc3f7", belly: "#e1f5fe", fin: "#0288d1", horns: true, eye: "glow", eyeColor: "#e1f5fe", glow: "#b3e5fc", scale: 1.45 },
    ["Kiếm Băng", "Đâm xuyên và đóng băng."], "Mũi kiếm làm từ băng vĩnh cửu."),
  fish("f_bang_long_ngu", "Băng Long Ngư", "legendary", "water", 5, [Z5], 70, [150, 500],
    { shape: "serpent", body: "#26c6da", belly: "#e0f7fa", fin: "#00838f", spikes: true, teeth: true, horns: true, eye: "glow", eyeColor: "#ffffff", glow: "#84ffff", scale: 1.7 },
    ["Băng Phong", "Đóng băng toàn đội đối thủ 1 lượt."], "Rồng biển phủ băng, hơi thở làm đông cứng sóng."),
  fish("f_than_ngu_bac_cuc", "Thần Ngư Bắc Cực", "mythic", "light", 5, [Z5], 80, [200, 700],
    { shape: "long", body: "#e1f5fe", belly: "#ffffff", fin: "#b388ff", pattern: "scales", patternColor: "#80d8ff88", horns: true, eye: "glow", eyeColor: "#18ffff", glow: "#ffffff", scale: 1.7 },
    ["Cực Quang", "Hồi máu toàn đội và tăng thủ."], "Xuất hiện cùng cực quang mỗi trăm năm."),
  fish("f_boss_bang_de", "Băng Đế Hải Xà", "boss", "water", 5, [Z5], 65, [1500, 4000],
    { shape: "serpent", body: "#0277bd", belly: "#b3e5fc", fin: "#e1f5fe", spikes: true, teeth: true, horns: true, eye: "glow", eyeColor: "#ff1744", glow: "#80d8ff", scale: 2 },
    ["Kỷ Băng Hà", "Đóng băng toàn sân 2 lượt."], "Hoàng đế của biển băng, ngủ say dưới sông băng nghìn năm."),

  // ===== Đại Dương Thần Thoại =====
  fish("f_ca_than_quang", "Cá Thần Quang", "rare", "light", 6, [Z6], 60, [2, 10],
    { shape: "round", body: "#fff176", belly: "#ffffff", fin: "#ffd54f", eye: "glow", eyeColor: "#ff6f00", glow: "#fff59d" },
    ["Hào Quang", "Tăng thủ cho đồng đội."], "Phát sáng như một mặt trời nhỏ."),
  fish("f_ca_sam_set", "Cá Sấm Sét", "rare", "metal", 6, [Z6], 85, [3, 15],
    { shape: "long", body: "#3f51b5", belly: "#ffeb3b", pattern: "stripes", patternColor: "#ffff00cc", eye: "glow", eyeColor: "#ffff00", glow: "#ffff8d" },
    ["Lôi Kích", "Gây choáng ngẫu nhiên."], "Vằn trên thân là những tia sét thật."),
  fish("f_ca_thien_than", "Cá Thiên Thần", "precious", "light", 6, [Z6], 50, [1, 6],
    { shape: "flat", body: "#f8bbd0", belly: "#ffffff", fin: "#ffffff", pattern: "stripes", patternColor: "#ffd70088", eye: "glow", eyeColor: "#00b0ff", glow: "#ffffff" },
    ["Ban Phước", "Hồi 20% HP cho đồng đội."], "Vây như đôi cánh thiên thần."),
  fish("f_ca_map_titan", "Cá Mập Titan", "epic", "earth", 6, [Z6], 65, [800, 2500],
    { shape: "shark", body: "#455a64", belly: "#cfd8dc", fin: "#263238", teeth: true, spikes: true, eye: "angry", eyeColor: "#ff6d00", scale: 1.6 },
    ["Hàm Titan", "Bỏ qua mọi khiên."], "Hậu duệ của loài cá mập cổ đại."),
  fish("f_ca_cau_vong", "Cá Cầu Vồng Vĩnh Cửu", "epic", "light", 6, [Z6], 70, [5, 20],
    { shape: "long", body: "#e040fb", belly: "#69f0ae", fin: "#40c4ff", pattern: "stripes", patternColor: "#ffff0088", eye: "glow", eyeColor: "#ffffff", glow: "#ea80fc" },
    ["Lăng Kính", "Đổi thuộc tính theo đối thủ."], "Mỗi chiếc vảy một màu khác nhau."),
  fish("f_ky_lan_ngu", "Kỳ Lân Ngư", "legendary", "light", 6, [Z6], 75, [100, 400],
    { shape: "long", body: "#ffffff", belly: "#fce4ec", fin: "#b388ff", pattern: "scales", patternColor: "#ffd54f88", horns: true, eye: "glow", eyeColor: "#e040fb", glow: "#ffd54f", scale: 1.6 },
    ["Thánh Giác", "Thanh tẩy hiệu ứng xấu."], "Sừng ngọc của nó chữa được mọi vết thương."),
  fish("f_long_vuong_hai_than", "Long Vương Hải Thần", "legendary", "water", 6, [Z6], 70, [400, 1200],
    { shape: "serpent", body: "#00897b", belly: "#ffe082", fin: "#ffd600", spikes: true, teeth: true, horns: true, eye: "glow", eyeColor: "#ffd600", glow: "#64ffda", scale: 1.8 },
    ["Long Uy", "Giảm tấn công toàn đội đối thủ."], "Vua của các loài rồng biển."),
  fish("f_kim_lan_than_ngu", "Kim Lân Thần Ngư", "mythic", "metal", 6, [Z7], 72, [400, 1400],
    { shape: "long", body: "#cfd8dc", belly: "#fffde7", fin: "#ffd54f", pattern: "scales", patternColor: "#ffb300aa", horns: true, spikes: true, eye: "glow", eyeColor: "#ffd600", glow: "#ffe082", scale: 1.7 },
    ["Kim Lân Hộ Thể", "Giáp vảy vàng: giảm mạnh sát thương nhận vào 2 lượt."], "Vảy bạc viền vàng cứng hơn thép, vương miện kim loại lấp lánh – chúa tể Vương Quốc Kim Loại."),
  fish("f_thai_co_than_ngu", "Thái Cổ Thần Ngư", "mythic", "earth", 6, [Z1], 55, [2000, 6000],
    { shape: "round", body: "#5d4037", belly: "#ffcc80", fin: "#3e2723", pattern: "scales", patternColor: "#ffab0066", teeth: true, horns: true, spikes: true, eye: "glow", eyeColor: "#00e676", glow: "#ffab00", scale: 2 },
    ["Thái Cổ", "Miễn nhiễm hiệu ứng 2 lượt."], "Sinh vật cổ xưa nhất, lưng nó từng được tưởng là một hòn đảo."),
  fish("f_phuong_hoang_bien", "Phượng Hoàng Biển", "mythic", "fire", 6, [Z6], 95, [50, 200],
    { shape: "long", body: "#ff1744", belly: "#ffea00", fin: "#ff9100", pattern: "scales", patternColor: "#ffd60088", horns: true, eye: "glow", eyeColor: "#ffffff", glow: "#ff9100", scale: 1.7 },
    ["Niết Bàn", "Hồi sinh với 100% HP một lần."], "Tái sinh từ bọt sóng mỗi khi bị hạ gục."),
  // Hai thần ngư cực hiếm – có hình vẽ riêng (art/MythicArt.ts)
  fish("f_huyen_minh_long_ngu", "Huyền Minh Long Ngư", "mythic", "water", 6, [Z3], 92, [300, 1200],
    { shape: "serpent", body: "#26c6da", belly: "#fff3c4", fin: "#ffd54f", pattern: "scales", patternColor: "#ffffff66", horns: true, eye: "glow", eyeColor: "#e0f7fa", glow: "#80deea", scale: 2 },
    ["Sóng Thần Thiên Đàn", "Triệu hồi rồng nước khổng lồ tinh tú cuốn phăng đối thủ."], "Rồng nước sinh ra từ dải ngân hà rơi xuống biển sâu; vảy nó lấp lánh cả một bầu trời sao."),
  fish("f_diem_ma_tham_hai", "Diễm Ma Thâm Hải", "mythic", "fire", 6, [Z4], 62, [1500, 5000],
    { shape: "shark", body: "#2a1236", belly: "#4a1020", fin: "#d50000", teeth: true, horns: true, spikes: true, eye: "glow", eyeColor: "#ff1744", glow: "#ff3d00", scale: 2.1 },
    ["Hỏa Ngục Phệ Hồn", "Phun bão lửa lôi điện nuốt chửng cả màn chơi."], "Ác ma dung nham ngủ dưới vực sâu nhất; nơi nó bơi qua, nước biển sôi sùng sục."),
  fish("f_tien_ngu_hong_ngoc", "Tiên Ngư Hồng Ngọc", "mythic", "light", 6, [Z2], 78, [80, 400],
    { shape: "round", body: "#f48fb1", belly: "#fce4ec", fin: "#ff80ab", pattern: "stripes", patternColor: "#b2ebf2aa", horns: true, eye: "glow", eyeColor: "#4a148c", glow: "#ff80ab", scale: 1.8 },
    ["Mộng Ảo Hồng Quang", "Ánh hồng mê hoặc khiến đối thủ quên tấn công."], "Công chúa của biển sao – nụ cười của nàng làm cả đại dương bừng sáng."),
  fish("f_boss_hai_than_cu_thu", "Hải Thần Cự Thú", "boss", "metal", 6, [Z6], 70, [5000, 15000],
    { shape: "serpent", body: "#1a237e", belly: "#82b1ff", fin: "#ffd600", spikes: true, teeth: true, horns: true, eye: "glow", eyeColor: "#ffff00", glow: "#448aff", scale: 2.1 },
    ["Lôi Hải Cuồng Phong", "Gây sát thương sấm sét lên toàn đội."], "Cự thú cuối cùng của đại dương, sấm sét bao quanh thân."),

  // ===== Cá xuất hiện ở nhiều khu =====
  fish("f_ca_bong_mau", "Cá Bống Mập Mạp", "common", "water", 1, [Z1, Z2], 20, [0.05, 0.3],
    { shape: "round", body: "#bcaaa4", belly: "#efebe9", pattern: "spots", patternColor: "#5d403766", scale: 0.8 },
    ["Lì Lợm", "Chịu được 1 đòn chí mạng."], "Bé xíu mà lì đòn vô cùng."),
  fish("f_ca_nhan_ngu_xanh", "Cá Ngừ Vây Xanh", "precious", "water", 2, [Z2, Z5], 80, [50, 250],
    { shape: "shark", body: "#1565c0", belly: "#e3f2fd", fin: "#ffd600", scale: 1.3 },
    ["Tốc Biến", "Luôn ra đòn trước."], "Tên lửa của đại dương."),
  fish("f_ca_bach_tuoc", "Cá Mặt Trăng", "epic", "light", 5, [Z3, Z5], 25, [200, 1000],
    { shape: "flat", body: "#cfd8dc", belly: "#ffffff", fin: "#90a4ae", eye: "glow", eyeColor: "#7c4dff", glow: "#e8eaf6", scale: 1.6 },
    ["Nguyệt Quang", "Hồi 10% HP mỗi lượt."], "Tròn và sáng như mặt trăng đêm rằm."),
  fish("f_ca_hong_long", "Cá Hồng Long", "legendary", "dark", 5, [Z3, Z4], 70, [10, 40],
    { shape: "long", body: "#c62828", belly: "#ffcdd2", fin: "#b71c1c", pattern: "scales", patternColor: "#ffd70088", teeth: true, eye: "glow", eyeColor: "#ffd600", glow: "#ff5252", scale: 1.4 },
    ["Long Huyết", "Tăng 30% tấn công khi dưới 50% HP."], "Loài cá cảnh quý nhất, đắt hơn vàng ròng."),


  // ===== Boss phụ SIÊU HIẾM – mỗi khu 1 con, tí hon dễ thương hoặc khổng lồ =====
  fish("f_sboss_chep_than_tai", "Chép Tí Hon Thần Tài", "boss", "light", 1, [Z1], 60, [0.05, 0.2],
    { shape: "round", body: "#ffd600", belly: "#fffde7", fin: "#ff6f00", pattern: "scales", patternColor: "#ff8f0088", eye: "glow", eyeColor: "#d50000", glow: "#ffea00", scale: 0.55 },
    ["Lộc Trời Ban", "Né mọi đòn trong 2 lượt."], "Bé xíu bằng ngón tay mà đem lộc cả năm – gặp được là trúng số!"),
  fish("f_sboss_kinh_ngu_cau_vong", "Kình Ngư Cầu Vồng", "boss", "light", 2, [Z2], 40, [20000, 60000],
    { shape: "round", body: "#ab47bc", belly: "#fff59d", fin: "#29b6f6", pattern: "stripes", patternColor: "#ff5252aa", horns: true, eye: "glow", eyeColor: "#ffffff", glow: "#ea80fc", scale: 2.5 },
    ["Mưa Cầu Vồng", "Hồi 30% HP cả đội."], "Cá voi khổng lồ bảy sắc – chỉ hiện ra sau những cơn mưa hiếm hoi."),
  fish("f_sboss_noc_bong_gon", "Nóc Bông Gòn", "boss", "water", 5, [Z3], 55, [0.1, 0.3],
    { shape: "puffer", body: "#f8bbd0", belly: "#ffffff", fin: "#f06292", pattern: "spots", patternColor: "#ffffffcc", eye: "glow", eyeColor: "#7c4dff", glow: "#ff80ab", scale: 0.6 },
    ["Ôm Mềm", "Làm đối thủ ngủ 1 lượt."], "Tròn ủm như cục bông, ai nhìn cũng muốn ôm – nhưng cực khó câu!"),
  fish("f_sboss_co_long_vuong", "Cổ Long Vương Dung Nham", "boss", "fire", 4, [Z4], 62, [40000, 120000],
    { shape: "serpent", body: "#3e2723", belly: "#ff6d00", fin: "#ffab00", pattern: "scales", patternColor: "#ff3d00cc", teeth: true, horns: true, spikes: true, eye: "glow", eyeColor: "#ffea00", glow: "#ff3d00", scale: 2.6 },
    ["Diệt Thế Hỏa", "Thiêu đốt 15% HP mỗi lượt."], "Rồng cổ đại dài như dãy núi lửa, ngủ say ngàn năm dưới biển lửa."),
  fish("f_sboss_ca_tuyet_mochi", "Cá Tuyết Mochi", "boss", "water", 5, [Z5], 58, [0.08, 0.25],
    { shape: "round", body: "#ffffff", belly: "#e1f5fe", fin: "#b3e5fc", pattern: "none", eye: "glow", eyeColor: "#29b6f6", glow: "#e1f5fe", scale: 0.55 },
    ["Lăn Tuyết", "Đóng băng đối thủ 2 lượt."], "Viên mochi tuyết biết bơi, mềm mịn và lạnh buốt tay."),
  fish("f_sboss_leviathan", "Leviathan Diệt Thế", "boss", "dark", 6, [Z6], 68, [80000, 250000],
    { shape: "shark", body: "#0d0d1a", belly: "#4a148c", fin: "#7c4dff", pattern: "stripes", patternColor: "#00e5ffaa", teeth: true, horns: true, spikes: true, eye: "glow", eyeColor: "#00e5ff", glow: "#651fff", scale: 2.7 },
    ["Nuốt Trời", "Nuốt chửng: hút 25% HP đối thủ."], "Quái vật cổ xưa lớn hơn cả hòn đảo – truyền thuyết của mọi cần thủ."),

  // ===== Cá lai (Đảo Lai Tạo) – không câu được, chỉ nở từ trứng =====
  ...hybrids([
    ["f_lai_thiet_ngu_san_ho", "Thiết Ngư San Hô", "metal", 1.0, 55, [300, 900], { shape: "long", body: "#8796ad", belly: "#e3e9f2", fin: "#ff8a65", horns: true, spikes: true, pattern: "scales", patternColor: "#3f4c6255" }, ["Giáp San Hô", "Giảm sát thương nhận vào 2 lượt."], "Vảy sắt chắc chắn, sừng thép ngắn trước trán, cụm san hô đỏ dọc sống lưng."],
    ["f_lai_chien_giap", "Chiến Giáp San Hô Vương", "metal", 1.15, 60, [600, 1600], { shape: "shark", body: "#5f6f88", belly: "#cfd9e6", fin: "#ff5252", horns: true, spikes: true, teeth: true, eye: "glow", eyeColor: "#ff1744", glow: "#ff5252" }, ["Lưỡi San Hô", "Chém xuyên giáp."], "Cặp sừng sắt lớn cong về trước, vây và đuôi hóa lưỡi san hô sắc bén phát sáng."],
    ["f_lai_than_thu_huyen_thiet", "Thần Thú Huyền Thiết Hải Vương", "metal", 1.35, 64, [1200, 3000], { shape: "shark", body: "#2b2b36", belly: "#4a4a5c", fin: "#ffb300", horns: true, spikes: true, teeth: true, eye: "glow", eyeColor: "#ffea00", glow: "#ffc107" }, ["Vương Miện Lửa", "Tăng mạnh tấn công toàn đội."], "Giáp hắc kim viền vàng rực, vương miện san hô rực lửa, hào quang năng lượng."],
    ["f_lai_cu_thu_nguyen_thuy", "Cự Thú Nguyên Thủy Thâm Uyên", "dark", 1.6, 66, [3000, 8000], { shape: "serpent", body: "#26314f", belly: "#3d4a72", fin: "#5ee7ff", horns: true, spikes: true, eye: "glow", eyeColor: "#7df9ff", glow: "#7e57ff" }, ["Thâm Uyên Cổ Đại", "Đòn cực mạnh, bỏ qua phòng thủ."], "Giáp cổ đại nứt rạn phát sáng xanh lam/tím thâm uyên, gai pha lê biển sâu phát quang, vòng hào quang cổ xưa."],
    ["f_lai_hoa_xuc_kraken", "Hỏa Xúc Kraken", "fire", 1.0, 56, [500, 1500], { shape: "angler", body: "#a35bd1", belly: "#f3d0ff", fin: "#ff8f00", eye: "glow", eyeColor: "#ff1744", glow: "#ff9800" }, ["Xúc Tu Lửa", "Gây bỏng 2 lượt."], "Xúc tu bạch tuộc quấn vây lửa cam, mắt phát sáng đỏ rực."],
    ["f_lai_viem_vu_hai_quai", "Viêm Vũ Hải Quái", "fire", 1.15, 70, [800, 2200], { shape: "angler", body: "#e0663a", belly: "#ffe0c2", fin: "#29b6f6", eye: "glow", eyeColor: "#fff59d", glow: "#29b6f6" }, ["Sải Vây Lửa", "Tăng tốc độ toàn đội."], "Xúc tu lớn có lông/vây cánh phượng hoàng, sải vây rực lửa xanh-cam."],
    ["f_lai_bat_tu_hai_dieu", "Bất Tử Hải Điểu Vương", "fire", 1.35, 78, [1000, 2800], { shape: "angler", body: "#ffb300", belly: "#fff3c4", fin: "#ff3d00", horns: true, eye: "glow", eyeColor: "#ffffff", glow: "#ff6f00" }, ["Tái Sinh Lửa", "Hồi máu mạnh khi máu thấp."], "Thân uy nghi kết hợp xúc tu uốn lượn và đôi cánh lửa thần thoại, hào quang rực rỡ."],
    ["f_lai_than_khai_hong_thuy", "Thần Khải Hồng Thủy Phượng", "light", 1.6, 84, [2000, 6000], { shape: "angler", body: "#6d28d9", belly: "#f5d0fe", fin: "#fde047", horns: true, eye: "glow", eyeColor: "#fef08a", glow: "#a855f7" }, ["Thần Khải", "Thanh tẩy và tấn công cực mạnh."], "Dáng thần thú cổ đại rực ánh tím/vàng kim nguyên thủy, vây cánh tinh thể lửa-nước phát sáng cực mạnh."],
  ]),
  ...GENERATED_HYBRIDS.map((g) => hybrids([[g.id, g.name, g.element, g.mult, g.spd, g.weightKg, g.appearance, g.skill, g.description]])[0]!),
];

/**
 * HỆ CỦA LOÀI = hệ của khu đầu tiên loài đó sống. Mỗi loài chỉ có ĐÚNG 1 hệ:
 *  - loài sống 1 khu: hệ của khu đó;
 *  - loài sống nhiều khu: hệ khu chính (cố định, không đổi theo nơi câu);
 *  - loài đặc biệt (FIXED_ELEMENT): hệ riêng.
 */
const FIXED_ELEMENT: Record<string, Element> = {
  // THẦN THOẠI: mỗi khu 1 loài, hệ cố định theo loài (cá đã câu cũng theo hệ này)
  f_thai_co_than_ngu: "earth", // Bến Tân Thủ
  f_tien_ngu_hong_ngoc: "wood", // Biển Nhiệt Đới
  f_kim_lan_than_ngu: "metal", // Vương Quốc Kim Loại
  f_diem_ma_tham_hai: "fire", // Biển Lửa – ác ma dung nham
  f_than_ngu_bac_cuc: "water", // Băng Giá
  f_huyen_minh_long_ngu: "dark", // Vực Sâu – rồng huyền minh (u tối)
  f_phuong_hoang_bien: "light", // Đại Dương Thần Thoại
  // cá lai (không có khu câu)
  f_lai_thiet_ngu_san_ho: "metal",
  f_lai_chien_giap: "metal",
  f_lai_than_thu_huyen_thiet: "metal",
  f_lai_cu_thu_nguyen_thuy: "dark",
  f_lai_hoa_xuc_kraken: "fire",
  f_lai_viem_vu_hai_quai: "fire",
  f_lai_bat_tu_hai_dieu: "fire",
  f_lai_than_khai_hong_thuy: "light",
};
const ZONE_ELEMENT = new Map(ZONES.map((z) => [z.id, z.element]));

const GEN_ELEMENT = new Map(GENERATED_HYBRIDS.map((g) => [g.id, g.element]));
export const FISHES: FishDef[] = RAW_FISHES.map((f) => {
  const fixed = FIXED_ELEMENT[f.id] ?? GEN_ELEMENT.get(f.id);
  if (fixed) return { ...f, element: fixed, elementFixed: true };
  const home = ZONE_ELEMENT.get(f.zones[0]!) ?? f.element;
  // loài sống ở NHIỀU khu: chỉ 1 hệ duy nhất = hệ khu chính (khu đầu tiên), câu ở khu nào cũng vậy
  return f.zones.length > 1 ? { ...f, element: home, elementFixed: true } : { ...f, element: home };
});

