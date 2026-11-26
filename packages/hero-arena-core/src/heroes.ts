import type { Gender, GenderAppearance, HeroBranch, HeroClassConfig, PassiveEffect, SkillDef, SkillKind } from "./types.ts";

// Dữ liệu 8 lớp anh hùng × 3 nhánh chuyên môn (chỉ dữ liệu).

function sk(id: string, nameVi: string, kind: SkillKind): SkillDef {
  return { id, nameVi, kind };
}

function pair(keyPrefix: string, maleDesc: string, femaleDesc: string): Record<Gender, GenderAppearance> {
  return {
    male: { gender: "male", spriteKey: `${keyPrefix}_male`, visualNotes: maleDesc },
    female: { gender: "female", spriteKey: `${keyPrefix}_female`, visualNotes: femaleDesc },
  };
}

interface BranchSpec {
  id: string;
  name: string;
  descVi: string;
  color: number;
  outfit: [number, number];
  passive: [string, string, PassiveEffect];
  skills: [SkillDef, SkillDef, SkillDef];
  ultimate: [string, string];
  awakening: [string, string];
  look: [string, string];
}

function branch(heroId: string, ultKind: SkillKind, s: BranchSpec): HeroBranch {
  return {
    id: s.id,
    name: s.name,
    descVi: s.descVi,
    color: s.color,
    outfit: s.outfit,
    passive: { id: s.passive[0], nameVi: s.passive[1], effect: s.passive[2] },
    skills: s.skills,
    ultimate: sk(s.ultimate[0], s.ultimate[1], ultKind),
    awakening: sk(s.awakening[0], s.awakening[1], ultKind),
    appearances: pair(`${heroId}_${s.id}`, s.look[0], s.look[1]),
  };
}

export const HEROES: readonly HeroClassConfig[] = [
  {
    id: "mage",
    name: "Mage",
    nameVi: "Pháp Sư",
    roleVi: "Phép thuật tầm xa",
    ranged: true,
    attackRange: 330,
    outfit: [0x4a3a6e, 0xd9b45a],
    baseStats: { hp: 900, mana: 300, stamina: 100, moveSpeed: 320, attackPower: 85 },
    baseSkill: sk("arcane_bolt", "Tia Huyền Bí", "bolt"),
    branches: [
      branch("mage", "storm", {
        id: "pyromancer", name: "Pyromancer", descVi: "Hỏa pháp sư – thiêu đốt kẻ địch theo thời gian.",
        color: 0xff7a1a, outfit: [0x9c2a12, 0x3a1a12],
        passive: ["burning", "Thiêu Đốt", { dotPct: 0.12 }],
        skills: [sk("fireball", "Cầu Lửa", "bolt"), sk("fire_dash", "Bộ Pháp Lửa", "dash"), sk("fire_pillar", "Cột Lửa", "trap")],
        ultimate: ["fire_dragon", "Hỏa Long"], awakening: ["awakened_fire_dragon", "Hỏa Long Thức Tỉnh"],
        look: ["Áo choàng đỏ sẫm rách vạt, mũ chóp nhọn lệch, tóc nâu che một mắt, cầm trượng lửa.", "Áo choàng đỏ đen viền rách, tóc dài, cầm trượng/đốm lửa."],
      }),
      branch("mage", "storm", {
        id: "cryomancer", name: "Cryomancer", descVi: "Băng pháp sư – làm chậm và khống chế.",
        color: 0x7fd6ff, outfit: [0x2f5f8f, 0xe8f2ff],
        passive: ["frost_energy", "Hàn Khí", { slowPct: 0.3 }],
        skills: [sk("ice_arrow", "Tên Băng", "bolt"), sk("frost_step", "Bước Sương Giá", "dash"), sk("ice_wall", "Giáp Băng", "shield")],
        ultimate: ["absolute_zero", "Độ Không Tuyệt Đối"], awakening: ["awakened_absolute_zero", "Độ Không Thức Tỉnh"],
        look: ["Áo choàng xanh băng viền lông trắng, mũ bông tuyết, tinh thể băng.", "Áo choàng xanh băng viền lông trắng, tóc sáng màu, mảnh băng."],
      }),
      branch("mage", "storm", {
        id: "stormcaller", name: "Stormcaller", descVi: "Lôi pháp sư – chí mạng và tốc độ.",
        color: 0xffe14a, outfit: [0x3a2a5a, 0xd9b45a],
        passive: ["electric_charge", "Tích Điện", { critChance: 0.18, attackSpeedPct: 0.1 }],
        skills: [sk("lightning_orb", "Cầu Sét", "bolt"), sk("lightning_dash", "Lôi Bộ", "dash"), sk("thunder_strike", "Sấm Rền", "nova")],
        ultimate: ["storm_field", "Trường Bão Tố"], awakening: ["awakened_storm_field", "Bão Tố Thức Tỉnh"],
        look: ["Áo choàng tím than viền vàng, khăn bay dài, tia sét quanh tay/trượng.", "Áo choàng tím than viền vàng, ruy băng bay, tia sét lóe sáng."],
      }),
    ],
  },
  {
    id: "warrior",
    name: "Warrior",
    nameVi: "Chiến Binh",
    roleVi: "Cận chiến bền bỉ",
    ranged: false,
    attackRange: 90,
    outfit: [0x5a5f6a, 0x8a2a2a],
    baseStats: { hp: 1250, mana: 150, stamina: 120, moveSpeed: 310, attackPower: 95 },
    baseSkill: sk("heavy_slash", "Trảm Mạnh", "cleave"),
    branches: [
      branch("warrior", "storm", {
        id: "juggernaut", name: "Juggernaut", descVi: "Pháo đài sống – giảm sát thương nhận vào.",
        color: 0xb0b8c8, outfit: [0x44484f, 0x7a6a4a],
        passive: ["iron_bulwark", "Thành Lũy Sắt", { damageReduction: 0.15 }],
        skills: [sk("shield_bash", "Khiên Đập", "cleave"), sk("charge", "Xung Phong", "dash"), sk("fortify_stance", "Thế Thủ Kiên Cố", "shield")],
        ultimate: ["colossus_roar", "Tiếng Gầm Khổng Lồ"], awakening: ["awakened_colossus_roar", "Khổng Lồ Thức Tỉnh"],
        look: ["Giáp thép nặng tối màu, khiên lớn khắc phù văn, tóc ngắn.", "Giáp vai và yếm giáp tối màu, khiên tháp viền kim loại, tóc búi gọn."],
      }),
      branch("warrior", "storm", {
        id: "berserker", name: "Berserker", descVi: "Cuồng chiến – hút máu khi chém.",
        color: 0xe03a3a, outfit: [0x5a2a1a, 0x2a1a1a],
        passive: ["blood_frenzy", "Cuồng Huyết", { lifesteal: 0.14, attackSpeedPct: 0.08 }],
        skills: [sk("cleave_axe", "Rìu Bổ", "cleave"), sk("crimson_leap", "Huyết Dược", "dash"), sk("war_howl", "Chiến Hống", "nova")],
        ultimate: ["undying_rage", "Cơn Thịnh Nộ Bất Tử"], awakening: ["awakened_undying_rage", "Thịnh Nộ Thức Tỉnh"],
        look: ["Rìu chiến đôi, áo choàng rách sẫm màu, mắt rực lửa.", "Rìu chiến, giáp da tối có vệt đỏ, tóc dài tung bay."],
      }),
      branch("warrior", "storm", {
        id: "paladin", name: "Paladin", descVi: "Hiệp sĩ thánh – hồi máu và bảo hộ.",
        color: 0xfff0a0, outfit: [0x9aa0aa, 0xd9b45a],
        passive: ["sacred_aegis", "Thánh Thuẫn", { damageReduction: 0.08, lifesteal: 0.06 }],
        skills: [sk("judgment_strike", "Phán Quyết", "cleave"), sk("purify_dash", "Thánh Bộ", "dash"), sk("holy_light", "Thánh Quang", "heal")],
        ultimate: ["dawn_cataclysm", "Bình Minh Hủy Diệt"], awakening: ["awakened_dawn_cataclysm", "Bình Minh Thức Tỉnh"],
        look: ["Áo choàng bạc xám, trọng kiếm, huy hiệu ánh sáng mờ.", "Áo choàng chiến binh bạc xám, kiếm dài, tóc cột cao."],
      }),
    ],
  },
  {
    id: "assassin",
    name: "Assassin",
    nameVi: "Sát Thủ",
    roleVi: "Cận chiến tốc độ",
    ranged: false,
    attackRange: 80,
    outfit: [0x2a2235, 0x6a3a8a],
    baseStats: { hp: 850, mana: 200, stamina: 140, moveSpeed: 365, attackPower: 110 },
    baseSkill: sk("quick_stab", "Đâm Nhanh", "cleave"),
    branches: [
      branch("assassin", "storm", {
        id: "nightblade", name: "Nightblade", descVi: "Dạ kiếm – chí mạng cực cao.",
        color: 0xa070ff, outfit: [0x1a1424, 0x4a2a6a],
        passive: ["lethal_ambush", "Phục Kích Chí Mạng", { critChance: 0.28 }],
        skills: [sk("shadow_dagger", "Ám Đao", "bolt"), sk("blink_strike", "Thuấn Sát", "dash"), sk("smoke_vanish", "Khói Ẩn", "shield")],
        ultimate: ["eclipse_execution", "Nhật Thực Hành Quyết"], awakening: ["awakened_eclipse_execution", "Nhật Thực Thức Tỉnh"],
        look: ["Áo trùm đầu đen tím, song đao sắc lạnh.", "Áo sát thủ bó gọn đen tím, song đao, khăn che nửa mặt."],
      }),
      branch("assassin", "storm", {
        id: "venomancer", name: "Venomancer", descVi: "Độc sư – độc ngấm theo thời gian.",
        color: 0x7ae04a, outfit: [0x234a2a, 0x1a2a1a],
        passive: ["viper_toxin", "Nọc Rắn", { dotPct: 0.14, slowPct: 0.1 }],
        skills: [sk("poison_fang", "Nanh Độc", "cleave"), sk("backstep", "Lùi Né", "dash"), sk("toxic_flask", "Bình Độc", "trap")],
        ultimate: ["plague_shroud", "Màn Dịch Hạch"], awakening: ["awakened_plague_shroud", "Dịch Hạch Thức Tỉnh"],
        look: ["Áo choàng lục sẫm, ống độc dược bên hông.", "Trang phục sát thủ lục sẫm, lọ độc nhỏ, tóc xõa."],
      }),
      branch("assassin", "storm", {
        id: "phantom", name: "Phantom", descVi: "Bóng ma – lướt nhanh, khó bắt.",
        color: 0xc8a0ff, outfit: [0x2a2a3a, 0x8a7aaa],
        passive: ["mirror_afterimage", "Ảo Ảnh", { moveSpeedPct: 0.12, critChance: 0.1 }],
        skills: [sk("phantom_slash", "Ảo Trảm", "cleave"), sk("phase_dash", "Xuyên Không", "dash"), sk("void_burst", "Hư Không Bộc Phá", "nova")],
        ultimate: ["void_tempest", "Bão Hư Không"], awakening: ["awakened_void_tempest", "Hư Không Thức Tỉnh"],
        look: ["Áo choàng bóng tối rách vạt, kiếm ngắn, bóng mờ tím.", "Áo choàng bóng đêm, lưỡi kiếm mảnh, tóc dài bay."],
      }),
    ],
  },
  {
    id: "ranger",
    name: "Ranger",
    nameVi: "Xạ Thủ",
    roleVi: "Cung thủ tầm xa",
    ranged: true,
    attackRange: 380,
    outfit: [0x3a5a2a, 0x7a5a3a],
    baseStats: { hp: 920, mana: 220, stamina: 130, moveSpeed: 350, attackPower: 102 },
    baseSkill: sk("power_shot", "Bắn Mạnh", "bolt"),
    branches: [
      branch("ranger", "storm", {
        id: "sniper", name: "Sniper", descVi: "Thiện xạ – đòn xa chí mạng.",
        color: 0xffd27a, outfit: [0x2f3f24, 0x5a4a2a],
        passive: ["piercing_focus", "Tập Trung Xuyên Giáp", { critChance: 0.22 }],
        skills: [sk("piercing_arrow", "Tên Xuyên", "bolt"), sk("vault_back", "Nhảy Lùi", "dash"), sk("eagle_eye", "Mắt Ưng", "shield")],
        ultimate: ["starfall_volley", "Mưa Sao Băng"], awakening: ["awakened_starfall_volley", "Sao Băng Thức Tỉnh"],
        look: ["Cung dài, áo choàng rêu tối, mũ trùm thợ săn.", "Cung dài tinh gọn, áo choàng rừng sâu, tóc đuôi ngựa."],
      }),
      branch("ranger", "storm", {
        id: "trapper", name: "Trapper", descVi: "Thợ bẫy – kiểm soát khu vực.",
        color: 0xd0a060, outfit: [0x5a3f24, 0x3a2a1a],
        passive: ["tactical_snare", "Bẫy Chiến Thuật", { slowPct: 0.22 }],
        skills: [sk("scatter_shot", "Bắn Tỏa", "bolt"), sk("camo_roll", "Lăn Ngụy Trang", "dash"), sk("bear_trap", "Bẫy Gấu", "trap")],
        ultimate: ["minefield_barrage", "Bãi Mìn"], awakening: ["awakened_minefield_barrage", "Bãi Mìn Thức Tỉnh"],
        look: ["Nỏ/cung ngắn, túi bẫy và dây thừng, áo da nâu.", "Cung săn, đai bẫy gọn, mũ rộng vành."],
      }),
      branch("ranger", "storm", {
        id: "windrunner", name: "Windrunner", descVi: "Phong xạ – chạy nhanh, bắn nhanh.",
        color: 0x9effc8, outfit: [0x2a5a4a, 0xbfe8d0],
        passive: ["gale_momentum", "Đà Gió", { moveSpeedPct: 0.12, attackSpeedPct: 0.14 }],
        skills: [sk("gale_arrow", "Tên Gió", "bolt"), sk("zephyr_step", "Bước Gió", "dash"), sk("tailwind_burst", "Gió Xoáy", "nova")],
        ultimate: ["hurricane_arrows", "Cuồng Phong Tiễn"], awakening: ["awakened_hurricane_arrows", "Cuồng Phong Thức Tỉnh"],
        look: ["Cung gió, khăn choàng dài bay theo gió.", "Cung gió, áo choàng nhẹ xanh rêu, tóc dài bay."],
      }),
    ],
  },
  {
    id: "guardian",
    name: "Guardian",
    nameVi: "Hộ Vệ",
    roleVi: "Đỡ đòn",
    ranged: false,
    attackRange: 95,
    outfit: [0x6a6050, 0x3a6a8a],
    baseStats: { hp: 1350, mana: 180, stamina: 115, moveSpeed: 300, attackPower: 82 },
    baseSkill: sk("hammer_blow", "Búa Giáng", "cleave"),
    branches: [
      branch("guardian", "storm", {
        id: "warden", name: "Warden", descVi: "Thủ hộ đá – da đá cứng chắc.",
        color: 0xc0a070, outfit: [0x5a5040, 0x8a7a5a],
        passive: ["stone_skin", "Da Đá", { damageReduction: 0.2 }],
        skills: [sk("taunt_slam", "Nện Khiêu Khích", "cleave"), sk("boulder_roll", "Lăn Đá", "dash"), sk("earth_pulse", "Địa Chấn", "nova")],
        ultimate: ["bastion_domain", "Lãnh Địa Thành Lũy"], awakening: ["awakened_bastion_domain", "Thành Lũy Thức Tỉnh"],
        look: ["Giáp đá cổ, chùy nặng, biểu tượng đá.", "Giáp hộ vệ cổ điển, búa/khiên đá, tóc búi."],
      }),
      branch("guardian", "storm", {
        id: "runeguard", name: "Runeguard", descVi: "Hộ vệ cổ ngữ – khiên phép.",
        color: 0x5ab0ff, outfit: [0x2a3f5a, 0x6ab0e0],
        passive: ["arcane_ward", "Phù Văn Hộ Mệnh", { damageReduction: 0.1, manaRegenPct: 0.5 }],
        skills: [sk("rune_seal", "Ấn Phù Văn", "bolt"), sk("glyph_step", "Bước Cổ Ngữ", "dash"), sk("ward_nova", "Khiên Phù Văn", "shield")],
        ultimate: ["aegis_cataclysm", "Đại Thuẫn Hủy Diệt"], awakening: ["awakened_aegis_cataclysm", "Đại Thuẫn Thức Tỉnh"],
        look: ["Giáp khắc cổ ngữ phát sáng xanh lam, giáo/khiên cổ.", "Giáp cổ ngữ, khiên tròn khắc rune, tóc dài buộc sau."],
      }),
      branch("guardian", "storm", {
        id: "thornknight", name: "Thornknight", descVi: "Kỵ sĩ gai – phản sát thương.",
        color: 0x6ad06a, outfit: [0x2a3a24, 0x5a3a2a],
        passive: ["bramble_thorns", "Gai Góc", { thorns: 0.25, damageReduction: 0.06 }],
        skills: [sk("thorn_lash", "Roi Gai", "cleave"), sk("spiked_dash", "Lao Gai", "dash"), sk("root_spike", "Rễ Gai", "trap")],
        ultimate: ["thorn_prison", "Ngục Gai"], awakening: ["awakened_thorn_prison", "Ngục Gai Thức Tỉnh"],
        look: ["Giáp gai rừng tối màu, khiên gai.", "Giáp gai thanh thoát, khiên nhỏ có gai, tóc xõa."],
      }),
    ],
  },
  {
    id: "monk",
    name: "Monk",
    nameVi: "Võ Tăng",
    roleVi: "Quyền pháp cơ động",
    ranged: false,
    attackRange: 85,
    outfit: [0xb06a2a, 0x3a2a1a],
    baseStats: { hp: 1050, mana: 240, stamina: 150, moveSpeed: 355, attackPower: 98 },
    baseSkill: sk("palm_strike", "Chưởng Phong", "cleave"),
    branches: [
      branch("monk", "storm", {
        id: "ironfist", name: "Ironfist", descVi: "Thiết quyền – đấm liên hoàn.",
        color: 0xffb04a, outfit: [0x8a4a1a, 0x2a1a12],
        passive: ["chi_combo", "Liên Hoàn Khí", { attackSpeedPct: 0.2 }],
        skills: [sk("dragon_kick", "Long Cước", "cleave"), sk("chi_dash", "Khí Bộ", "dash"), sk("chi_burst", "Khí Bạo", "nova")],
        ultimate: ["thousand_fists", "Thiên Quyền"], awakening: ["awakened_thousand_fists", "Thiên Quyền Thức Tỉnh"],
        look: ["Võ phục tối màu, băng quấn tay.", "Võ phục gọn tối màu, băng tay, tóc cột cao."],
      }),
      branch("monk", "storm", {
        id: "spiritwalker", name: "Spiritwalker", descVi: "Linh tu – hồi phục bằng linh khí.",
        color: 0x9ae0ff, outfit: [0x3a4a6a, 0xd0e0f0],
        passive: ["astral_flow", "Tinh Lưu", { lifesteal: 0.08, manaRegenPct: 0.6 }],
        skills: [sk("spirit_orb", "Linh Cầu", "bolt"), sk("astral_step", "Tinh Bộ", "dash"), sk("zen_pulse", "Thiền Quang", "heal")],
        ultimate: ["celestial_ascension", "Thăng Thiên"], awakening: ["awakened_celestial_ascension", "Thăng Thiên Thức Tỉnh"],
        look: ["Áo tu hành tối màu, chuỗi hạt cổ, linh khí bao quanh.", "Trang phục linh tu, dải lụa bay, linh khí quanh tay."],
      }),
      branch("monk", "storm", {
        id: "quakestriker", name: "Quakestriker", descVi: "Chấn địa – đòn đánh rung chuyển đất.",
        color: 0xd08a4a, outfit: [0x5a3a24, 0x8a6a4a],
        passive: ["seismic_impact", "Chấn Động", { slowPct: 0.18, damageReduction: 0.06 }],
        skills: [sk("seismic_punch", "Địa Chấn Quyền", "cleave"), sk("slam_leap", "Nhảy Nện", "dash"), sk("shock_wave", "Sóng Chấn", "nova")],
        ultimate: ["earthshatter_combo", "Liên Hoàn Vỡ Đất"], awakening: ["awakened_earthshatter_combo", "Vỡ Đất Thức Tỉnh"],
        look: ["Giáp tay nặng, đai lưng dày.", "Võ giáp chắc chắn, găng tay lớn."],
      }),
    ],
  },
  {
    id: "necromancer",
    name: "Necromancer",
    nameVi: "Vu Sư",
    roleVi: "Hắc thuật tầm xa",
    ranged: true,
    attackRange: 310,
    outfit: [0x2a2a2a, 0x6a1a3a],
    baseStats: { hp: 880, mana: 340, stamina: 100, moveSpeed: 315, attackPower: 92 },
    baseSkill: sk("dark_bolt", "Hắc Tiễn", "bolt"),
    branches: [
      branch("necromancer", "storm", {
        id: "soulweaver", name: "Soulweaver", descVi: "Dệt hồn – hút sinh lực.",
        color: 0x7affe0, outfit: [0x1a2a2a, 0x3a6a6a],
        passive: ["soul_harvest", "Thu Hồn", { lifesteal: 0.12 }],
        skills: [sk("soul_bolt", "Hồn Tiễn", "bolt"), sk("wraith_shift", "Hóa Bóng", "dash"), sk("spirit_link", "Hồn Liên", "heal")],
        ultimate: ["soul_apocalypse", "Tận Thế Linh Hồn"], awakening: ["awakened_soul_apocalypse", "Linh Hồn Thức Tỉnh"],
        look: ["Áo choàng linh hồn u ám, trượng sọ.", "Đầm choàng gothic tối màu, trượng linh hồn, tóc dài."],
      }),
      branch("necromancer", "storm", {
        id: "dreadlord", name: "Dreadlord", descVi: "Chúa tể bóng tối – xương giáo xuyên thủng.",
        color: 0xc0c0a0, outfit: [0x24242a, 0x7a6a3a],
        passive: ["undead_command", "Hiệu Lệnh Bất Tử", { damageReduction: 0.1, critChance: 0.08 }],
        skills: [sk("bone_spear", "Giáo Xương", "bolt"), sk("dark_step", "Hắc Bộ", "dash"), sk("bone_prison", "Ngục Xương", "trap")],
        ultimate: ["legion_of_ash", "Quân Đoàn Tro Tàn"], awakening: ["awakened_legion_of_ash", "Quân Đoàn Thức Tỉnh"],
        look: ["Giáp chúa tể bóng tối, mũ sừng nhỏ, quyền trượng.", "Trang phục chúa tể gothic, quyền trượng."],
      }),
      branch("necromancer", "storm", {
        id: "bloodmage", name: "Bloodmage", descVi: "Huyết pháp sư – đánh đổi máu lấy sức mạnh.",
        color: 0xff3a5a, outfit: [0x5a0a1a, 0x1a0a0a],
        passive: ["crimson_siphon", "Huyết Hấp", { lifesteal: 0.1, dotPct: 0.06 }],
        skills: [sk("blood_lance", "Huyết Thương", "bolt"), sk("crimson_step", "Huyết Bộ", "dash"), sk("sanguine_pool", "Huyết Trì", "trap")],
        ultimate: ["crimson_maelstrom", "Huyết Xoáy"], awakening: ["awakened_crimson_maelstrom", "Huyết Xoáy Thức Tỉnh"],
        look: ["Áo choàng đỏ sẫm đen, hoa văn huyết ma thuật.", "Váy áo đỏ sẫm gothic, tóc dài, huyết ma thuật."],
      }),
    ],
  },
  {
    id: "duelist",
    name: "Duelist",
    nameVi: "Kiếm Khách",
    roleVi: "Đấu kiếm phản đòn",
    ranged: false,
    attackRange: 100,
    outfit: [0x3a3a5a, 0xc0a060],
    baseStats: { hp: 980, mana: 210, stamina: 145, moveSpeed: 355, attackPower: 106 },
    baseSkill: sk("lunge", "Đâm Tới", "cleave"),
    branches: [
      branch("duelist", "storm", {
        id: "bladedancer", name: "Bladedancer", descVi: "Vũ kiếm – lướt chém liên tục.",
        color: 0xff8ab0, outfit: [0x5a2a3a, 0xe0c0c8],
        passive: ["graceful_riposte", "Phản Kiếm Uyển Chuyển", { attackSpeedPct: 0.14, moveSpeedPct: 0.06 }],
        skills: [sk("blade_whirl", "Kiếm Xoáy", "cleave"), sk("evade_step", "Bước Né", "dash"), sk("whirlwind", "Lốc Kiếm", "nova")],
        ultimate: ["crimson_waltz", "Vũ Điệu Đỏ"], awakening: ["awakened_crimson_waltz", "Vũ Điệu Thức Tỉnh"],
        look: ["Kiếm đôi, áo choàng ngắn gọn nhẹ.", "Kiếm mảnh, trang phục đấu sĩ gọn nhẹ, tóc cột cao."],
      }),
      branch("duelist", "storm", {
        id: "spellblade", name: "Spellblade", descVi: "Ma kiếm – kiếm mang phép.",
        color: 0x8ab0ff, outfit: [0x2a3a6a, 0xa0c0ff],
        passive: ["arcane_edge", "Lưỡi Huyền Bí", { critChance: 0.12, manaRegenPct: 0.4 }],
        skills: [sk("arc_bolt", "Kiếm Khí", "bolt"), sk("blink_thrust", "Thuấn Thích", "dash"), sk("enchanted_slash", "Ma Trảm", "nova")],
        ultimate: ["astral_tempest_blade", "Tinh Kiếm Phong Bạo"], awakening: ["awakened_astral_tempest_blade", "Tinh Kiếm Thức Tỉnh"],
        look: ["Trường kiếm phát sáng ma thuật, áo choàng đấu sĩ.", "Kiếm ma thuật, áo choàng ngắn viền sáng, tóc dài."],
      }),
      branch("duelist", "storm", {
        id: "countermaster", name: "Countermaster", descVi: "Phản kiếm – đỡ và phản đòn.",
        color: 0xe0e0e0, outfit: [0x2a2a2a, 0x8a8a8a],
        passive: ["perfect_parry", "Đỡ Hoàn Hảo", { thorns: 0.2, damageReduction: 0.1 }],
        skills: [sk("counter_slash", "Phản Trảm", "cleave"), sk("feint_dash", "Hư Chiêu", "dash"), sk("parry_stance", "Thế Đỡ", "shield")],
        ultimate: ["zero_point_cut", "Nhất Kiếm Điểm Không"], awakening: ["awakened_zero_point_cut", "Điểm Không Thức Tỉnh"],
        look: ["Kiếm dài, trang phục kiếm khách sẫm màu.", "Kiếm dài, trang phục kiếm khách tối, phong thái điềm tĩnh."],
      }),
    ],
  },
];

export function heroById(id: string): HeroClassConfig | undefined {
  return HEROES.find((h) => h.id === id);
}

export function branchById(hero: HeroClassConfig, branchId: string | null): HeroBranch | undefined {
  if (!branchId) return undefined;
  return hero.branches.find((b) => b.id === branchId);
}
