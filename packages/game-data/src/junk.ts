import type { JunkDef } from "@dccc/shared";

/** Rác dưới nước. Vớt lên để tái chế – bảo vệ môi trường! */
export const JUNK: JunkDef[] = [
  { id: "j_chai_nhua", name: "Chai Nhựa", kind: "bottle", ecoPoints: 3, weight: 30, color: "#81d4fa" },
  { id: "j_bao_nilong", name: "Bọc Nilông", kind: "bag", ecoPoints: 2, weight: 28, color: "#eceff1" },
  { id: "j_dep_le", name: "Dép Lẻ", kind: "sandal", ecoPoints: 4, weight: 20, color: "#ff7043" },
  { id: "j_lon_nuoc", name: "Lon Nước Ngọt", kind: "can", ecoPoints: 3, weight: 16, color: "#e53935" },
  { id: "j_luoi_rach", name: "Lưới Đánh Cá Rách", kind: "net", ecoPoints: 6, weight: 6, color: "#8d6e63" },
];

export const ECO_MESSAGE = "♻ Mọi người hãy tái chế để bảo vệ môi trường nhé!";
