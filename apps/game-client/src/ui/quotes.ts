/**
 * Bộ thoại "bựa" khi câu dính cá và khi kích hoạt kỹ năng.
 * - Chỉ hiện ~30–50% số lần để giữ nhịp chơi.
 * - Tránh lặp lại những câu vừa nói gần đây.
 * - Hỗ trợ biến động {ca} (tên cá) và {kg} (cân nặng).
 */
import type { ActiveEffect, FishRarity } from "@dccc/shared";

export const HOOK_LINES = {
  junk: [
    "Úi chà, hàng xịn! Ủa khoan… sao nó nhẹ tênh và hơi có mùi tất vậy?",
    "Cần rung bần bật, tim đập thình thịch… hóa ra là chiếc dép tổ ong thất lạc từ kiếp trước.",
    "Chúc mừng! Bạn vừa câu được một món quà đến từ đáy xã hội.",
    "Tưởng thủy quái, ai dè là 'thủy rác'.",
  ],
  small: [
    "Cá này chắc đang ăn kiêng, nhỏ tới mức soi kính hiển vi mới thấy vảy.",
    "Úi chà, hàng xịn! Ủa khoan… sao nó nhẹ tênh vậy?",
    "Cá con thôi mà, kéo nhẹ kẻo nó khóc!",
  ],
  big: [
    "Á à, lòi mặt chuột rồi nhé! Hôm nay không lên thớt thì cũng lên mâm!",
    "Cần sắp gãy tới nơi rồi, con cá này chắc bú hết cả đại dương mới to thế!",
    "Lên nào anh em ơi! Cá này mà sẩy thì mất luôn cả liêm sỉ!",
    "Nặng như người yêu cũ trốn nợ vậy trời, kéo hết ga đi!",
    "Hàng tuyển đây rồi, đừng giãy nữa, đằng nào chả thành nguyên liệu!",
  ],
  troll: [
    "Cá cắn câu rồi! Khoan… sao nó kéo ngược mình xuống nước luôn vậy?!",
    "Cảm giác này quen lắm… giống lúc sếp nhắn 'Em rảnh không?' vào 11 giờ đêm.",
    "Nó cắn rồi! Đừng giật vội, cứ từ từ cho nó… tự nghi ngờ nhân sinh.",
  ],
};

export const SKILL_LINES = {
  power: [
    "Bật max công suất! Hôm nay cá hay cần thủ gãy trước?",
    "Nội lực dồn hết vào bắp tay – ai cản đường thì… mặc kệ, kéo tiếp!",
    "Một cú giật đi vào lòng đất, tiễn cá về nơi chín suối (hoặc chảo chiên)!",
    "Khai mở 'Cơ bắp cuồn cuộn', cá to mấy cũng hóa thành tép riu!",
  ],
  control: [
    "Đứng im! Thả thính xong rồi thì miễn hoàn tiền, miễn đổi trả!",
    "Trói chân lại! Chạy đâu cho thoát khỏi bàn tay 'nghiệp quật' này!",
    "Skill khống chế kích hoạt: Cá muốn giãy cũng phải xin phép!",
  ],
  luck: [
    "Triệu hồi 'Nhân phẩm phát sáng' – hôm nay không ra cá SSR thì nghỉ ăn cơm!",
    "Bật chế độ 'Hút luck', mồi này không chỉ thơm mà còn… có tâm linh!",
    "Độ may mắn đang lên đỉnh, cá hiếm mà không cắn là cá thiếu i-ốt!",
  ],
  boom: [
    "Ai bảo câu cá là phải nhẹ nhàng? Cho nổ tung hồ luôn!",
    "Thả điện! Cả đàn cá đồng loạt 'tê tái cõi lòng'!",
    "Quét một mẻ sạch bong, không chừa một con nào để làm chứng!",
  ],
};

export const CATCH_LINES = [
  "Kéo lên được con {ca} nặng {kg}kg – nhìn mặt nó có vẻ hơi lú!",
  "{ca} {kg}kg! Tối nay nhà mình có món ngon rồi!",
  "Ai bảo {ca} khó câu? {kg}kg nằm gọn trong giỏ nè!",
];

const recent: string[] = [];

/** Chọn câu không trùng các câu vừa dùng; trả về null nếu lần này không nói (theo xác suất). */
export function pickLine(pool: string[], chance = 1, vars: Record<string, string> = {}): string | null {
  if (Math.random() > chance) return null;
  const fresh = pool.filter((l) => !recent.includes(l));
  const list = fresh.length ? fresh : pool;
  const line = list[Math.floor(Math.random() * list.length)]!;
  recent.push(line);
  if (recent.length > 10) recent.shift();
  return line.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? "");
}

export function hookPool(isJunk: boolean, rarity: FishRarity): string[] {
  if (isJunk) return HOOK_LINES.junk;
  if (Math.random() < 0.2) return HOOK_LINES.troll;
  if (["epic", "legendary", "mythic", "boss"].includes(rarity)) return HOOK_LINES.big;
  return HOOK_LINES.small;
}

/** Nhóm kỹ năng theo hiệu ứng chính để chọn bộ thoại phù hợp. */
export function skillPool(effects: ActiveEffect[]): string[] {
  const k = new Set(effects.map((e) => e.kind));
  if (k.has("stun") || k.has("freeze") || k.has("calm")) return SKILL_LINES.control;
  if (k.has("burn") || (k.has("damage_pct") && k.has("stun"))) return SKILL_LINES.boom;
  if (k.has("double_damage") && effects.length > 2) return SKILL_LINES.boom;
  if (k.has("damage_pct") || k.has("double_damage") || k.has("reel_boost") || k.has("distance_pull")) return SKILL_LINES.power;
  return SKILL_LINES.luck;
}
