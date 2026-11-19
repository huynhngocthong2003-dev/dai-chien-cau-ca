/**
 * Hồ sơ công khai, bạn bè và Đấu Sinh Tử người–người (Supabase).
 * Chỉ hoạt động khi đã đăng nhập tài khoản online.
 */
import { FISH_BY_ID, FORM_BY_ID } from "@dccc/game-data";
import { ownedFishPower, winRate, type MatchResult, type PlayerSave, type PvpMatchRecord, type RankCategory } from "@dccc/shared";
import { getClient } from "./online.ts";

export interface ShowcaseFish {
  fishId: string;
  level: number;
  stars: number;
  form: string | null;
  wins: number;
  losses: number;
  power: number;
}

export interface PlayerCard {
  user_id: string;
  display_name: string;
  friend_code: string;
  level: number;
  avatar: string;
  stats: { caught?: number; bosses?: number; dmWins?: number; dmLosses?: number; species?: number; junk?: number; title?: string | null };
  showcase: ShowcaseFish[];
}

export interface Friendship {
  id: number;
  requester: string;
  addressee: string;
  status: "pending" | "accepted";
}

export function cardFromSave(save: PlayerSave): Omit<PlayerCard, "user_id" | "friend_code"> {
  const showcase: ShowcaseFish[] = save.showcase
    .map((u) => save.fishes.find((f) => f.uid === u))
    .filter((o): o is NonNullable<typeof o> => !!o && FISH_BY_ID.has(o.fishId))
    .map((o) => ({
      fishId: o.fishId,
      level: o.level,
      stars: o.stars,
      form: o.form ?? null,
      wins: o.wins ?? 0,
      losses: o.losses ?? 0,
      power: ownedFishPower(FISH_BY_ID.get(o.fishId)!, o, o.form ? FORM_BY_ID.get(o.form) : null),
    }));
  return {
    display_name: save.name,
    level: save.level,
    avatar: save.selectedCharacterId,
    stats: {
      caught: save.stats.totalCaught,
      bosses: save.stats.bossesCaught,
      dmWins: save.stats.dmWins ?? 0,
      dmLosses: save.stats.dmLosses ?? 0,
      species: Object.keys(save.stats.species).length,
      junk: save.stats.junkCaught ?? 0,
      title: save.titles.equipped,
    },
    showcase,
  };
}

export function showcaseRate(f: ShowcaseFish): number | null {
  return winRate(f);
}

const CARD_COLS = "user_id, display_name, friend_code, level, avatar, stats, showcase";

export async function publishCard(userId: string, save: PlayerSave): Promise<void> {
  const sb = await getClient();
  const { error } = await sb.from("player_cards").upsert({ user_id: userId, friend_code: "-", ...cardFromSave(save) });
  if (error) throw new Error(friendlyRpc(error.message));
}

export async function myCard(userId: string): Promise<PlayerCard | null> {
  const sb = await getClient();
  const { data } = await sb.from("player_cards").select(CARD_COLS).eq("user_id", userId).maybeSingle();
  return (data as PlayerCard | null) ?? null;
}

/** Tìm theo mã kết bạn (8 ký tự) hoặc theo tên. */
export async function searchPlayers(q: string, exclude: string): Promise<PlayerCard[]> {
  const sb = await getClient();
  const term = q.trim();
  if (!term) return [];
  const code = term.toUpperCase().replace(/[^0-9A-F]/g, "");
  const query =
    code.length === 8 && code === term.toUpperCase()
      ? sb.from("player_cards").select(CARD_COLS).eq("friend_code", code)
      : sb.from("player_cards").select(CARD_COLS).ilike("display_name", `%${term.replace(/[%_]/g, "")}%`);
  const { data, error } = await query.neq("user_id", exclude).limit(20);
  if (error) throw new Error(friendlyRpc(error.message));
  return (data as PlayerCard[]) ?? [];
}

export async function cardsByIds(ids: string[]): Promise<PlayerCard[]> {
  if (!ids.length) return [];
  const sb = await getClient();
  const { data, error } = await sb.from("player_cards").select(CARD_COLS).in("user_id", ids);
  if (error) throw new Error(friendlyRpc(error.message));
  return (data as PlayerCard[]) ?? [];
}

export async function listFriendships(): Promise<Friendship[]> {
  const sb = await getClient();
  const { data, error } = await sb.from("friendships").select("id, requester, addressee, status").limit(200);
  if (error) throw new Error(friendlyRpc(error.message));
  return (data as Friendship[]) ?? [];
}

function friendlyError(msg: string): string {
  if (/duplicate|unique/i.test(msg)) return "Hai bạn đã kết bạn hoặc đã có lời mời rồi";
  if (/not_self|check/i.test(msg)) return "Không thể tự kết bạn với chính mình";
  return msg;
}

export async function sendFriendRequest(me: string, to: string): Promise<void> {
  const sb = await getClient();
  const { error } = await sb.from("friendships").insert({ requester: me, addressee: to });
  if (error) throw new Error(friendlyError(error.message));
}

export async function acceptFriend(id: number): Promise<void> {
  const sb = await getClient();
  const { error } = await sb.from("friendships").update({ status: "accepted" }).eq("id", id);
  if (error) throw new Error(friendlyRpc(error.message));
}

export async function removeFriend(id: number): Promise<void> {
  const sb = await getClient();
  const { error } = await sb.from("friendships").delete().eq("id", id);
  if (error) throw new Error(friendlyRpc(error.message));
}

export interface ChallengeResult {
  id: string;
  result: MatchResult;
  record: Omit<PvpMatchRecord, "id" | "opponentName">;
  opponentName: string;
}

/** Thách đấu: máy chủ tính trận và ghi kết quả. */
export async function challenge(defenderId: string, team: string[]): Promise<ChallengeResult> {
  const sb = await getClient();
  const { data, error } = await sb.functions.invoke("death-match", { body: { defenderId, team } });
  if (error) {
    let msg = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) msg = ((await ctx.json()) as { error?: string }).error ?? msg;
    } catch {
      /* giữ thông báo gốc */
    }
    if (/Failed to send|not found|404/i.test(msg)) msg = "Máy chủ Đấu Sinh Tử chưa được bật (cần triển khai hàm death-match)";
    throw new Error(msg);
  }
  return data as ChallengeResult;
}

interface PvpRow {
  id: string;
  challenger: string;
  defender: string;
  for_challenger: Omit<PvpMatchRecord, "id" | "opponentName">;
  for_defender: Omit<PvpMatchRecord, "id" | "opponentName">;
  challenger_name: string;
  defender_name: string;
  applied_challenger: boolean;
  applied_defender: boolean;
}

/** Các trận liên quan đến mình mà mình chưa áp dụng kết quả. */
export async function pendingPvp(me: string): Promise<PvpMatchRecord[]> {
  const sb = await getClient();
  const { data, error } = await sb
    .from("pvp_matches")
    .select("id, challenger, defender, for_challenger, for_defender, challenger_name, defender_name, applied_challenger, applied_defender")
    .or(`and(challenger.eq.${me},applied_challenger.eq.false),and(defender.eq.${me},applied_defender.eq.false)`)
    .order("created_at", { ascending: true })
    .limit(50);
  if (error) throw new Error(friendlyRpc(error.message));
  return ((data as PvpRow[]) ?? []).map((r) =>
    r.challenger === me
      ? { id: r.id, ...r.for_challenger, opponentName: r.defender_name }
      : { id: r.id, ...r.for_defender, opponentName: r.challenger_name },
  );
}

export async function markPvpApplied(id: string): Promise<void> {
  const sb = await getClient();
  const { error } = await sb.rpc("mark_pvp_applied", { match_id: id });
  if (error) throw new Error(friendlyRpc(error.message));
}

// ------------------------------------------------------------------ Bảng xếp hạng
export interface RankRow {
  rank: number;
  user_id: string;
  display_name: string;
  level: number;
  avatar: string;
  title: string | null;
  score: number;
  guild_name: string | null;
  guild_tag: string | null;
}

export async function leaderboard(cat: RankCategory, limit = 50): Promise<RankRow[]> {
  const sb = await getClient();
  const { data, error } = await sb.rpc("leaderboard", { p_cat: cat, p_limit: limit });
  if (error) throw new Error(friendlyRpc(error.message));
  return (data as RankRow[]) ?? [];
}

export async function myRank(cat: RankCategory): Promise<number | null> {
  const sb = await getClient();
  const { data, error } = await sb.rpc("my_rank", { p_cat: cat });
  if (error) throw new Error(friendlyRpc(error.message));
  return (data as number | null) ?? null;
}

// ------------------------------------------------------------------ Hội
export interface GuildRow {
  id: number;
  name: string;
  tag: string;
  description: string;
  owner: string;
  members: number;
  total_level: number;
  score: number;
}
export interface GuildMember {
  user_id: string;
  guild_id: number;
  role: "owner" | "member";
  joined_at: string;
}

function friendlyRpc(msg: string): string {
  if (/function .* does not exist|Could not find the function|Could not find the table|relation .* does not exist|schema cache/i.test(msg)) return "Máy chủ chưa cập nhật tính năng này (chờ chủ dự án triển khai database mới)";
  if (/guilds_name_ci|duplicate key/i.test(msg)) return "Tên hội đã có người dùng";
  if (/check constraint/i.test(msg)) return "Tên / ký hiệu hội không hợp lệ";
  return msg;
}

export async function listGuilds(q = ""): Promise<GuildRow[]> {
  const sb = await getClient();
  const { data, error } = await sb.rpc("list_guilds", { p_query: q.trim(), p_limit: 30 });
  if (error) throw new Error(friendlyRpc(error.message));
  return (data as GuildRow[]) ?? [];
}

export async function myMembership(me: string): Promise<GuildMember | null> {
  const sb = await getClient();
  const { data, error } = await sb.from("guild_members").select("user_id, guild_id, role, joined_at").eq("user_id", me).maybeSingle();
  if (error) throw new Error(friendlyRpc(error.message));
  return (data as GuildMember | null) ?? null;
}

export async function guildMembers(guildId: number): Promise<GuildMember[]> {
  const sb = await getClient();
  const { data, error } = await sb.from("guild_members").select("user_id, guild_id, role, joined_at").eq("guild_id", guildId).limit(50);
  if (error) throw new Error(friendlyRpc(error.message));
  return (data as GuildMember[]) ?? [];
}

async function rpc(fn: string, args: Record<string, unknown> = {}) {
  const sb = await getClient();
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw new Error(friendlyRpc(error.message));
  return data as unknown;
}

export const createGuild = (name: string, tag: string, description: string) =>
  rpc("create_guild", { p_name: name, p_tag: tag, p_description: description }) as Promise<number>;
export const joinGuild = (id: number) => rpc("join_guild", { p_guild: id });
export const leaveGuild = () => rpc("leave_guild");
export const kickMember = (userId: string) => rpc("kick_member", { p_user: userId });
