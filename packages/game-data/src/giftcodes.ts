import type { GiftRewardDef } from "@dccc/shared";

/** Mã quà tặng tiền tệ. Chỉ lưu mã băm – không có mã gốc trong mã nguồn. */
export const GIFT_REWARDS: GiftRewardDef[] = [
  { id: "g_kim_cuong_2000", codeHash: "1834e7a71fbb1e1f6b965071af", label: "2.000 Kim Cương", diamonds: 2000 },
  { id: "g_da_than_5", codeHash: "1828b69669a477047803109cbd", label: "5 Đá Tiến Hoá Thần", evoItems: { e_long_phuong_than: 5 } },
];
