/**
 * Phòng đấu 3vs3 với người (Edge Function `pvp`). Mọi số liệu do máy chủ quyết định;
 * trạng thái trả về đã đảo góc nhìn: bên 0 luôn là MÌNH.
 */
import type { BarParams, CombatEvent, CombatState } from "@dccc/shared";
import { getClient } from "./online.ts";

export type PvpStake = "friendly" | "death";
export interface LoseFish {
  uid: string;
  fishId: string;
  level: number;
  stars: number;
}

export interface PvpRoom {
  id: string;
  code: string;
  stake: PvpStake;
  status: "waiting" | "picking" | "fighting" | "done" | "cancelled";
  side: 0 | 1;
  isHost: boolean;
  oppName: string | null;
  expiresAt: string;
  pickDeadline: string | null;
  myTeam: string[] | null;
  oppPicked: boolean;
  state: CombatState | null;
  turn: number;
  bar: BarParams | null;
  turnStartedAt: string | null;
  serverNow: string;
  turnTimeMs: number;
  winner: 0 | 1 | null;
  myLose: LoseFish | null;
  oppLose: LoseFish | null;
  cancelReason: string | null;
  settled: boolean;
  events: CombatEvent[];
}

/** Lệch giờ máy chủ – máy mình (ms), cập nhật mỗi lần gọi để đếm ngược theo giờ máy chủ. */
export let serverSkewMs = 0;

export async function pvpCall<T = PvpRoom>(body: Record<string, unknown>): Promise<T> {
  const sb = await getClient();
  const t0 = Date.now();
  const { data, error } = await sb.functions.invoke("pvp", { body });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    let msg = "Không kết nối được máy chủ đấu";
    try {
      const j = ctx ? ((await ctx.json()) as { error?: string }) : null;
      if (j?.error) msg = j.error;
    } catch {
      /* giữ thông báo mặc định */
    }
    throw new Error(msg);
  }
  const sn = (data as { serverNow?: string })?.serverNow;
  if (sn) serverSkewMs = Date.parse(sn) - (t0 + Date.now()) / 2;
  return data as T;
}

/** Giờ hiện tại theo đồng hồ máy chủ. */
export const serverTime = () => Date.now() + serverSkewMs;

export interface PvpInvite {
  id: string;
  code: string;
  stake: PvpStake;
  host_name: string;
  expires_at: string;
}

/** Lời mời đang chờ mình (đọc trực tiếp – RLS chỉ cho thấy phòng mình liên quan, không lộ đội hình). */
export async function myPvpInvites(me: string): Promise<PvpInvite[]> {
  const sb = await getClient();
  const { data, error } = await sb
    .from("pvp_rooms")
    .select("id, code, stake, host_name, expires_at")
    .eq("invitee", me)
    .eq("status", "waiting")
    .gt("expires_at", new Date().toISOString())
    .limit(5);
  if (error) return [];
  return (data as PvpInvite[]) ?? [];
}
