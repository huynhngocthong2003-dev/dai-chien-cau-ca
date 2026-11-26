import type { Gender, GenderAppearance, HeroBaseStats, HeroBranch, HeroClassConfig, HeroEvolution, PassiveEffect, SkillDef, SkillKind } from "./types.ts";

// 10 lớp, mỗi lớp là một cây tiến hoá (chỉ dữ liệu):
//   Cấp 1–4  : Dạng 1 – nhân vật bình thường, mọi người như nhau.
//   Cấp 5    : chọn 1 trong 3 hướng Dạng 2 (cùng cấp bậc, chỉ số & hiệu ứng khác nhau).
//   Cấp 10   : chọn 1 trong 3 hướng Dạng 3 của Dạng 2 đó (Tấn công / Phòng thủ / Tinh thông) + mở chiêu tối thượng.
//   Cấp 15   : thức tỉnh (chiêu tối thượng mạnh hơn).
// Thứ tự lớp = hàng trong sprite sheet.

type K = SkillKind;
/** [id, tên, mô tả, màu, [tên bị động, hiệu ứng], s1, s2 (lướt), s3, [3 tên Dạng 3], [3 chiêu tối thượng], ngoại hình] */
type DirRow = [string, string, string, number, [string, PassiveEffect], [string, K], string, [string, K], [string, string, string], [string, string, string], string];

function sk(id: string, nameVi: string, kind: SkillKind): SkillDef {
  return { id, nameVi, kind };
}

function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function scale(e: PassiveEffect, k: number): PassiveEffect {
  const out: PassiveEffect = {};
  for (const key of Object.keys(e) as Array<keyof PassiveEffect>) out[key] = Math.round((e[key] ?? 0) * k * 100) / 100;
  return out;
}

function add(a: PassiveEffect, b: PassiveEffect): PassiveEffect {
  const out: PassiveEffect = { ...a };
  for (const key of Object.keys(b) as Array<keyof PassiveEffect>) out[key] = Math.round(((out[key] ?? 0) + (b[key] ?? 0)) * 100) / 100;
  return out;
}

function mix(c1: number, c2: number, t: number): number {
  const ch = (s: number) => Math.round(((c1 >> s) & 255) * (1 - t) + ((c2 >> s) & 255) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

export const EVOLUTION_STYLE_VI = ["Tấn Công", "Phòng Thủ", "Tinh Thông"] as const;

/** 3 hướng Dạng 3 sinh từ Dạng 2: tấn công (chí mạng, tốc đánh), phòng thủ (giảm sát thương, hút máu), tinh thông (nhân đôi hiệu ứng). */
function evolutions(dirId: string, dirName: string, color: number, base: PassiveEffect, names: [string, string, string], ults: [string, string, string]): [HeroEvolution, HeroEvolution, HeroEvolution] {
  const effects: PassiveEffect[] = [
    add({ critChance: 0.12, attackSpeedPct: 0.1 }, scale(base, 0.5)),
    add({ damageReduction: 0.14, lifesteal: 0.06 }, scale(base, 0.3)),
    add({ critChance: 0.05 }, scale(base, 1)),
  ];
  const descs = [
    `Hướng tấn công của ${dirName}: chí mạng và tốc đánh cao.`,
    `Hướng phòng thủ của ${dirName}: chịu đòn và hồi máu tốt.`,
    `Tinh thông ${dirName}: hiệu ứng nguyên tố mạnh gấp đôi.`,
  ];
  const colors = [mix(color, 0xff5a3a, 0.25), mix(color, 0x6a9aff, 0.45), mix(color, 0xffe070, 0.4)];
  return names.map((name, i) => {
    const id = `${dirId}_${["atk", "def", "mst"][i]}`;
    const ult = ults[i] ?? name;
    return {
      id,
      name,
      descVi: descs[i] ?? "",
      color: colors[i] ?? color,
      style: i,
      passive: { id: `${id}_passive`, nameVi: `${EVOLUTION_STYLE_VI[i]} · ${name}`, effect: effects[i] ?? {} },
      ultimate: sk(slug(ult), ult, "storm"),
      awakening: sk(`awakened_${slug(ult)}`, `${ult} · Thức Tỉnh`, "storm"),
    } satisfies HeroEvolution;
  }) as [HeroEvolution, HeroEvolution, HeroEvolution];
}

function dirs(heroId: string, rows: [DirRow, DirRow, DirRow]): [HeroBranch, HeroBranch, HeroBranch] {
  return rows.map(([id, name, desc, color, [pName, pEff], s1, s2, s3, evoNames, ults, look], form) => {
    const appearances: Record<Gender, GenderAppearance> = {
      male: { gender: "male", spriteKey: `${heroId}_${id}_male`, visualNotes: look },
      female: { gender: "female", spriteKey: `${heroId}_${id}_female`, visualNotes: look },
    };
    return {
      id,
      name,
      descVi: desc,
      color,
      form,
      passive: { id: `${id}_passive`, nameVi: pName, effect: pEff },
      skills: [sk(slug(s1[0]), s1[0], s1[1]), sk(slug(s2), s2, "dash"), sk(slug(s3[0]), s3[0], s3[1])],
      evolutions: evolutions(id, name, color, pEff, evoNames, ults),
      appearances,
    } satisfies HeroBranch;
  }) as [HeroBranch, HeroBranch, HeroBranch];
}

function hero(id: string, nameVi: string, baseNameVi: string, roleVi: string, ranged: boolean, attackRange: number, baseStats: HeroBaseStats, base: [string, K], rows: [DirRow, DirRow, DirRow]): HeroClassConfig {
  return { id, name: id, nameVi, baseNameVi, roleVi, ranged, attackRange, baseStats, baseSkill: sk(slug(base[0]), base[0], base[1]), branches: dirs(id, rows) };
}

const st = (hp: number, mana: number, stamina: number, moveSpeed: number, attackPower: number): HeroBaseStats => ({ hp, mana, stamina, moveSpeed, attackPower });

export const HEROES: readonly HeroClassConfig[] = [
  hero("fighter", "Đấu Sĩ", "Kiếm Sĩ Tập Sự", "Cận chiến mạnh mẽ", false, 92, st(1150, 160, 130, 330, 100), ["Chém Thường", "cleave"], [
    ["flame_blade", "Hỏa Kiếm", "Kiếm lửa – mỗi nhát chém gây THIÊU ĐỐT.", 0xff7a2a, ["Lửa Kiếm", { dotPct: 0.12, lifesteal: 0.04 }], ["Hỏa Trảm", "cleave"], "Lao Lửa", ["Vòng Lửa", "nova"], ["Hỏa Kiếm Bạo Liệt", "Hỏa Giáp Bất Diệt", "Hỏa Long Kiếm Thánh"], ["Liệt Hỏa Trảm", "Hỏa Ngục Thuẫn", "Hỏa Long Giáng Thế"], "Kiếm lửa, giáp xích, khăn và áo choàng đỏ."],
    ["venom_blade", "Độc Kiếm", "Kiếm tẩm độc – gây NHIỄM ĐỘC lâu và làm chậm.", 0x7aff4a, ["Nọc Kiếm", { poisonPct: 0.12, slowPct: 0.08 }], ["Độc Trảm", "cleave"], "Lướt Độc", ["Đầm Độc", "trap"], ["Độc Kiếm Tử Thần", "Giáp Độc Gai", "Xà Vương Kiếm"], ["Vạn Độc Trảm", "Độc Vụ Thuẫn", "Xà Vương Hiện Thân"], "Kiếm xanh độc, giáp xích, khăn lục."],
    ["sword_shield", "Kiếm Khiên", "Kiếm và khiên – vừa CÔNG vừa THỦ tốt.", 0x6ab0ff, ["Công Thủ Toàn Diện", { damageReduction: 0.14, critChance: 0.08, thorns: 0.08 }], ["Khiên Đập", "cleave"], "Xung Phong", ["Khiên Chắn", "shield"], ["Kiếm Khiên Phá Trận", "Thánh Thuẫn Hộ Vệ", "Kiếm Khiên Hoàng Kim"], ["Phá Trận Trảm", "Thành Lũy Thép", "Hoàng Kim Phán Quyết"], "Kiếm thép, khiên lớn, giáp xanh thép."],
  ]),
  hero("helper", "Trợ Thủ", "Dược Sư Tập Sự", "Hồi phục, bảo hộ", true, 300, st(960, 320, 110, 330, 84), ["Tia Lá", "bolt"], [
    ["leaf_healer", "Thảo Mộc", "Dược thảo – HÚT MÁU và hồi năng lượng.", 0x5ae0d0, ["Dược Thảo", { lifesteal: 0.1, manaRegenPct: 0.3 }], ["Gai Lá", "bolt"], "Bước Gió", ["Suối Thảo Mộc", "heal"], ["Thảo Mộc Hồi Xuân", "Mộc Thuẫn", "Tiên Thảo Thánh Y"], ["Hồi Xuân Đại Pháp", "Rễ Thần Hộ Thể", "Tiên Thảo Giáng Lâm"], "Vòng lá, trượng dây leo, gió xanh ngọc."],
    ["thorn_druid", "Gai Độc", "Dây gai độc – NHIỄM ĐỘC và trói chân.", 0xb0ff4a, ["Gai Độc", { poisonPct: 0.1, slowPct: 0.12 }], ["Roi Gai", "bolt"], "Lướt Lá", ["Vòng Rễ Độc", "trap"], ["Độc Đằng", "Gai Thép", "Vua Rừng Độc"], ["Vạn Gai Xuyên Tâm", "Rừng Gai Hộ Vệ", "Độc Lâm Thức Giấc"], "Áo lá sẫm, dây gai quấn tay."],
    ["holy_light", "Thánh Quang", "Ánh sáng thánh – GIẢM SÁT THƯƠNG nhận vào.", 0xffe07a, ["Thánh Thuẫn", { damageReduction: 0.12, lifesteal: 0.06 }], ["Thánh Tiễn", "bolt"], "Cánh Sáng", ["Khiên Thánh", "shield"], ["Thánh Tiễn Sứ", "Thiên Thuẫn", "Đại Thiên Sứ"], ["Thánh Quang Xuyên Thiên", "Thiên Thuẫn Bất Diệt", "Thiên Sứ Giáng Lâm"], "Áo trắng vàng, hào quang thánh."],
  ]),
  hero("marksman", "Xạ Thủ", "Thợ Săn Tập Sự", "Tầm xa chí mạng", true, 380, st(920, 220, 130, 345, 104), ["Bắn Tên", "bolt"], [
    ["wind_archer", "Phong Tiễn", "Tên gió – TỐC ĐÁNH và tốc chạy cao.", 0x5affb0, ["Theo Gió", { attackSpeedPct: 0.15, moveSpeedPct: 0.08 }], ["Tên Gió", "bolt"], "Bước Gió", ["Gió Xoáy", "nova"], ["Phong Tiễn Bão Táp", "Gió Hộ Thân", "Phong Thần Tiễn"], ["Cuồng Phong Tiễn", "Lốc Xoáy Hộ Vệ", "Phong Thần Giáng"], "Mũ trùm, khăn che mặt, cung phát sáng xanh."],
    ["fire_archer", "Hỏa Tiễn", "Tên lửa – THIÊU ĐỐT mục tiêu.", 0xff7a3a, ["Tên Lửa", { dotPct: 0.12, critChance: 0.06 }], ["Tên Lửa", "bolt"], "Lăn Né", ["Bẫy Lửa", "trap"], ["Hỏa Tiễn Bạo Liệt", "Giáp Than Hồng", "Phượng Hoàng Tiễn"], ["Mưa Lửa", "Tường Lửa", "Phượng Hoàng Lửa"], "Mũ trùm đỏ, cung lửa."],
    ["venom_archer", "Độc Tiễn", "Tên độc – NHIỄM ĐỘC kéo dài.", 0x9aff3a, ["Tên Độc", { poisonPct: 0.14 }], ["Tên Độc", "bolt"], "Nhảy Lùi", ["Bẫy Độc", "trap"], ["Độc Tiễn Xuyên Giáp", "Áo Choàng Độc", "Xà Thần Tiễn"], ["Vạn Độc Tiễn", "Màn Sương Độc", "Xà Thần Tiễn Vũ"], "Mũ trùm lục, tên tẩm độc."],
  ]),
  hero("gunner", "Pháo Thủ", "Lính Súng Tập Sự", "Sát thương diện rộng", true, 320, st(1040, 220, 110, 310, 98), ["Bắn Súng", "bolt"], [
    ["fire_gunner", "Hỏa Pháo", "Đạn cháy – THIÊU ĐỐT diện rộng.", 0xffb03a, ["Thuốc Nổ", { dotPct: 0.12 }], ["Đạn Cháy", "bolt"], "Tên Lửa Đẩy", ["Bom Lửa", "trap"], ["Hỏa Pháo Bạo Liệt", "Giáp Lò Lửa", "Hỏa Thần Pháo"], ["Mưa Pháo Lửa", "Pháo Đài Lửa", "Hỏa Thần Hủy Diệt"], "Tóc vàng, kính bảo hộ, súng khói."],
    ["frost_gunner", "Băng Pháo", "Đạn băng – LÀM CHẬM mạnh.", 0x7ad8ff, ["Đạn Băng", { slowPct: 0.28 }], ["Đạn Băng", "bolt"], "Trượt Băng", ["Mìn Băng", "trap"], ["Băng Pháo Xuyên Phá", "Giáp Băng", "Băng Thần Pháo"], ["Bão Đạn Băng", "Thành Băng", "Kỷ Băng Hà"], "Kính bảo hộ xanh, súng băng."],
    ["heavy_gunner", "Trọng Pháo", "Pháo hạng nặng – bền bỉ, CHÍ MẠNG.", 0xc0c8d8, ["Giáp Pháo", { damageReduction: 0.14, critChance: 0.1 }], ["Pháo Nổ", "bolt"], "Lao Giáp", ["Nổ Chấn Động", "nova"], ["Trọng Pháo Xuyên Giáp", "Pháo Đài Di Động", "Siêu Trọng Pháo"], ["Càn Quét", "Lô Cốt Thép", "Pháo Hủy Diệt"], "Áo giáp thép, pháo vác vai."],
  ]),
  hero("assassin", "Sát Thủ", "Đạo Tặc Tập Sự", "Ám sát, dồn sát thương", false, 82, st(850, 200, 140, 370, 112), ["Đâm Nhanh", "cleave"], [
    ["shadow_blade", "Ảnh Nhận", "Bóng tối – CHÍ MẠNG và lướt nhanh.", 0xa05aff, ["Màn Đêm", { critChance: 0.2, moveSpeedPct: 0.08 }], ["Ám Đao", "cleave"], "Thuấn Sát", ["Màn Đêm", "shield"], ["Ảnh Sát", "Ảnh Giáp", "Bóng Tối Tông Sư"], ["Ảnh Sát Tuyệt Kỹ", "Màn Đêm Hộ Thân", "Bóng Tối Nuốt Chửng"], "Mũ trùm, mặt nạ sọ, khói tím."],
    ["poison_blade", "Độc Nhận", "Dao tẩm độc – NHIỄM ĐỘC chết người.", 0x7aff4a, ["Nọc Độc", { poisonPct: 0.14, critChance: 0.06 }], ["Lưỡi Độc", "cleave"], "Ảnh Bộ", ["Khói Độc", "trap"], ["Độc Nhận Tử Huyệt", "Áo Độc", "Độc Vương"], ["Vạn Độc Trảm", "Màn Sương Độc", "Độc Vương Hiện Thân"], "Mặt nạ, áo choàng lục, dao độc."],
    ["blood_blade", "Huyết Nhận", "Huyết đao – HÚT MÁU khi chém.", 0xff3a5a, ["Khát Máu", { lifesteal: 0.14, attackSpeedPct: 0.08 }], ["Huyết Trảm", "cleave"], "Huyết Bộ", ["Huyết Vũ", "nova"], ["Huyết Nhận Cuồng Sát", "Huyết Giáp", "Huyết Vương"], ["Huyết Vũ Tuyệt Sát", "Huyết Thuẫn", "Huyết Vương Thức Tỉnh"], "Mặt nạ, áo choàng đỏ thẫm, dao đỏ."],
  ]),
  hero("support", "Hỗ Trợ", "Tu Sĩ Tập Sự", "Buff & hồi máu", true, 300, st(940, 330, 110, 330, 84), ["Thánh Văn", "bolt"], [
    ["healer", "Hồi Phục", "Hồi máu – HÚT MÁU và hồi năng lượng nhanh.", 0x8ad8ff, ["Phúc Âm", { lifesteal: 0.12, manaRegenPct: 0.4 }], ["Tia Hồi Sinh", "bolt"], "Bước Nhẹ", ["Lời Cầu Nguyện", "heal"], ["Hồi Sinh Sư", "Thánh Y Hộ Mệnh", "Thánh Tổ"], ["Hồi Sinh Đại Pháp", "Kết Giới Sinh Mệnh", "Thánh Tổ Giáng Lâm"], "Tóc vàng, áo choàng xanh trắng, trượng pha lê."],
    ["barrier", "Kết Giới", "Kết giới – GIẢM SÁT THƯƠNG, làm chậm kẻ địch.", 0xc0a0ff, ["Kết Giới", { damageReduction: 0.15, slowPct: 0.1 }], ["Tia Phán Xét", "bolt"], "Dịch Chuyển", ["Kết Giới Thánh", "shield"], ["Phán Quan", "Kết Giới Sư", "Thần Hộ Mệnh"], ["Phán Xét", "Thánh Địa", "Thần Hộ Mệnh Giáng Thế"], "Áo choàng tím trắng, sách phép."],
    ["blessing", "Chúc Phúc", "Chúc phúc – TỐC ĐÁNH và chí mạng.", 0xffd84a, ["Phúc Lành", { attackSpeedPct: 0.14, critChance: 0.08 }], ["Thánh Văn", "bolt"], "Thăng Hoa", ["Vòng Chúc Phúc", "nova"], ["Chiến Ca", "Chúc Phúc Hộ Thân", "Thánh Ca Tông Sư"], ["Chiến Ca Hùng Tráng", "Phúc Lành Bất Diệt", "Thiên Ca"], "Áo vàng, hào quang ấm."],
  ]),
  hero("summoner", "Triệu Hồi Sư", "Triệu Hồi Sư Tập Sự", "Gọi linh hồn & thú", true, 320, st(900, 340, 110, 320, 88), ["Hồn Cầu", "bolt"], [
    ["beast_caller", "Thú Linh", "Sói linh – TỐC ĐÁNH và cắn xé.", 0x7ad0ff, ["Bầy Thú", { attackSpeedPct: 0.14, dotPct: 0.05 }], ["Sói Linh Vồ", "bolt"], "Lướt Cùng Sói", ["Sói Tru", "nova"], ["Sói Vương", "Gấu Linh Hộ Vệ", "Thú Thần"], ["Bầy Sói Thần", "Gấu Thần Hộ Thể", "Thú Thần Giáng Lâm"], "Vòng lá, trượng gỗ, sói linh."],
    ["ghost_caller", "Hồn Linh", "Linh hồn lạnh – LÀM CHẬM và hút sinh lực.", 0x6affd0, ["Hồn Lạnh", { slowPct: 0.18, lifesteal: 0.06 }], ["Linh Hồn Tiễn", "bolt"], "Hồn Bộ", ["Linh Hồn Hộ Thân", "shield"], ["Hồn Sư", "Hồn Giáp", "Vạn Hồn Chủ"], ["Đại Quân Linh Hồn", "Linh Hồn Bất Diệt", "Vạn Hồn Quy Tông"], "Áo choàng xanh lục, hồn ma bay quanh."],
    ["bone_caller", "Cốt Linh", "Rồng xương – NHIỄM ĐỘC và chí mạng.", 0x9a8aff, ["Độc Cốt", { poisonPct: 0.1, critChance: 0.06 }], ["Giáo Xương", "bolt"], "Cánh Rồng", ["Ngục Xương", "trap"], ["Cốt Long Sư", "Cốt Giáp", "Long Hồn Chủ"], ["Cốt Long Phun Độc", "Ngục Xương Bất Diệt", "Hắc Long Giáng Thế"], "Áo tím, trượng sọ, rồng xương."],
  ]),
  hero("swordsman", "Kiếm Khách", "Võ Sĩ Tập Sự", "Kiếm thuật nhanh", false, 100, st(1000, 210, 145, 355, 106), ["Rút Kiếm Chém", "cleave"], [
    ["samurai", "Samurai", "Võ sĩ đạo – thủ chắc, CHÍ MẠNG.", 0xff6a3a, ["Võ Sĩ Đạo", { damageReduction: 0.1, critChance: 0.12 }], ["Song Đao Trảm", "cleave"], "Thuấn Bộ", ["Thế Thủ", "shield"], ["Kiếm Thánh", "Võ Sĩ Đạo Giáp", "Samurai Huyền Thoại"], ["Nhất Đao Đoạn Không", "Giáp Võ Sĩ Đạo", "Đao Thần"], "Giáp đỏ, hai thanh đao."],
    ["flame_sword", "Hỏa Đao", "Đao lửa – THIÊU ĐỐT và hút máu.", 0xffa03a, ["Hỏa Đao", { dotPct: 0.12, lifesteal: 0.05 }], ["Hỏa Đao Trảm", "cleave"], "Lướt Lửa", ["Vòng Lửa", "nova"], ["Hỏa Đao Cuồng Trảm", "Hỏa Giáp Đao Khách", "Hỏa Đao Thần"], ["Liệt Hỏa Đao", "Hỏa Thuẫn", "Hỏa Thần Đao"], "Giáp cam, đao lửa."],
    ["wind_sword", "Phong Kiếm", "Kiếm gió – TỐC ĐÁNH và tốc chạy.", 0x6ad0ff, ["Phong Vũ", { moveSpeedPct: 0.1, attackSpeedPct: 0.15 }], ["Kiếm Gió", "bolt"], "Lướt Gió", ["Lốc Kiếm", "nova"], ["Phong Kiếm Bão Táp", "Phong Giáp", "Kiếm Thần Phong Vũ"], ["Cuồng Phong Kiếm Vũ", "Phong Thuẫn", "Kiếm Phong Vạn Lý"], "Giáp xanh, kiếm gió."],
  ]),
  hero("mage", "Pháp Sư", "Pháp Sư Tập Sự", "Sát thương phép", true, 330, st(880, 340, 100, 320, 90), ["Tia Huyền Bí", "bolt"], [
    ["fire_mage", "Hỏa Pháp Sư", "Sát thương THIÊU ĐỐT.", 0xff6a2a, ["Thiêu Đốt", { dotPct: 0.14 }], ["Cầu Lửa", "bolt"], "Bộ Pháp Lửa", ["Cột Lửa", "trap"], ["Xạ Hỏa Pháp Sư", "Ma Pháp Núi Lửa", "Hỏa Thần Pháp"], ["Hỏa Tiễn Liên Châu", "Dung Nham Hộ Thể", "Phượng Hoàng Lửa"], "Áo choàng đỏ rách, hai tay cầm đuốc lửa."],
    ["poison_mage", "Độc Pháp Sư", "Sát thương NHIỄM ĐỘC.", 0x6aff4a, ["Kịch Độc", { poisonPct: 0.14, slowPct: 0.06 }], ["Cầu Độc", "bolt"], "Bước Sương Độc", ["Đầm Độc", "trap"], ["Mãng Xà Độc Pháp", "Đại Dịch Pháp Sư", "Độc Vương Pháp"], ["Mãng Xà Phun Độc", "Dịch Bệnh Lan Tràn", "Độc Vương Giáng Thế"], "Mũ trùm lục, khăn che mặt, khói độc."],
    ["guard_mage", "Hộ Pháp Sư", "Vừa CÔNG vừa THỦ – khiên phép và pha lê.", 0x6ab0ff, ["Hộ Pháp", { damageReduction: 0.14, critChance: 0.08, thorns: 0.06 }], ["Tia Pha Lê", "bolt"], "Dịch Chuyển", ["Khiên Phép", "shield"], ["Ảnh Pháp Hộ Sư", "Thiên Quân Pháp Sư", "Thánh Quang Pháp"], ["Gương Ảnh Phản Kích", "Thiên Quân Thuẫn", "Thánh Quang Phán Quyết"], "Giáp xanh bạc, trượng pha lê, khiên phép."],
  ]),
  hero("seer", "Tiên Tri", "Tiên Tri Tập Sự", "Khống chế, tiên đoán", true, 320, st(900, 340, 110, 330, 88), ["Cầu Tiên Tri", "bolt"], [
    ["rune_scribe", "Huyền Thư", "Cổ ngữ nguyền rủa – NHIỄM ĐỘC và làm chậm.", 0x7affe0, ["Lời Nguyền", { poisonPct: 0.08, slowPct: 0.14 }], ["Cổ Ngữ", "bolt"], "Dịch Chuyển", ["Lồng Cổ Ngữ", "trap"], ["Ấn Chú Sư", "Thư Giới", "Đại Huyền Thư"], ["Lời Nguyền Diệt Vong", "Thư Giới Phong Ấn", "Lời Tiên Tri"], "Mũ trùm tím, sách cổ, chữ cổ bay."],
    ["star_oracle", "Tinh Tú", "Sao trời – CHÍ MẠNG rực rỡ.", 0xffd84a, ["Tinh Mệnh", { critChance: 0.16, manaRegenPct: 0.3 }], ["Sao Băng", "bolt"], "Bước Tinh Không", ["Vòng Tinh Tú", "nova"], ["Sao Băng Sư", "Tinh Giới", "Tinh Tú Chi Chủ"], ["Mưa Sao Băng", "Vòng Tinh Tú Hộ Mệnh", "Thiên Hà Sụp Đổ"], "Áo choàng sao, vòng vàng."],
    ["time_seer", "Thời Không", "Thời gian – LÀM CHẬM cực mạnh, lướt nhanh.", 0xa0b0ff, ["Ngưng Đọng", { slowPct: 0.24, moveSpeedPct: 0.08 }], ["Kim Thời Gian", "bolt"], "Dịch Chuyển Thời Gian", ["Vùng Ngưng Đọng", "trap"], ["Thời Không Sát", "Thời Không Giáp", "Chủ Thời Gian"], ["Ngưng Đọng Thời Gian", "Vòng Lặp", "Lồng Thời Gian"], "Áo choàng bạc xanh, đồng hồ cát."],
  ]),
];

export function heroById(id: string): HeroClassConfig | undefined {
  return HEROES.find((h) => h.id === id);
}

export function branchById(hero: HeroClassConfig, branchId: string | null): HeroBranch | undefined {
  if (!branchId) return undefined;
  return hero.branches.find((b) => b.id === branchId);
}

export function evolutionById(hero: HeroClassConfig, branchId: string | null, evolutionId: string | null): HeroEvolution | undefined {
  if (!evolutionId) return undefined;
  return branchById(hero, branchId)?.evolutions.find((e) => e.id === evolutionId);
}
