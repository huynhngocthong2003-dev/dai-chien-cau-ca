/**
 * Boss Thế Giới (Edge Function `world-boss`): mọi số liệu do máy chủ quyết định.
 */
import type { BarParams, Element, TimingZone } from "@dccc/shared";
import { getClient } from "./online.ts";

export interface WbStatus {
  serverNow: string;
  slot: { key: string; live: boolean; startsAt: string; endsAt: string };
  boss: { id: string; name: string; title: string; element: Element; description: string };
  hp: number;
  maxHp: number;
  killer: string | null;
  top: { name: string; damage: number; me: boolean }[];
  /** Người chơi đang trong phòng boss (ra đòn gần đây): tên, ngoại hình nhân vật, lực chiến. */
  room?: { name: string; look: { c?: string; equip?: Partial<Record<string, string>>; rod?: string } | null; power: number; me: boolean; at: string }[];
  me: { damage: number; rank: number | null; entries: number; entriesLeft: number };
  rules: { hitsPerEntry: number; entriesPerSlot: number };
}

export interface WbEnter {
  session: string;
  hits: number;
  hitsMax: number;
  bar: BarParams;
  serverNow: string;
  /** Lực chiến đội = tổng 3 cá trưng bày. */
  power: number;
  fromShowcase?: number;
  team: { uid: string; fishId: string; name: string; atk: number; element: Element; form: string | null; stars: number; parents?: [string, string] }[];
}

export interface WbHit {
  zone: TimingZone;
  dmg: number;
  hp: number;
  maxHp: number;
  killed: boolean;
  hits: number;
  hitsMax: number;
  bar: BarParams | null;
  sessionDamage: number;
}

export async function wbCall<T>(body: Record<string, unknown>): Promise<T> {
  const sb = await getClient();
  const { data, error } = await sb.functions.invoke("world-boss", { body });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    let msg = "Không kết nối được máy chủ Boss Thế Giới";
    try {
      const j = ctx ? ((await ctx.json()) as { error?: string }) : null;
      if (j?.error) msg = j.error;
    } catch {
      /* giữ thông báo mặc định */
    }
    throw new Error(msg);
  }
  return data as T;
}
