/**
 * Tài khoản online (Supabase Auth + bảng player_saves có RLS).
 * Chỉ bật khi build có VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY.
 * Khóa "anon" của Supabase là khóa công khai (an toàn ở frontend nhờ RLS);
 * KHÔNG bao giờ đưa service_role key vào đây.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SaveStorage } from "./storage.ts";
import { isStaleSaveError } from "@dccc/shared";

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export function onlineConfigured(): boolean {
  return !!URL && !!KEY;
}

let clientPromise: Promise<SupabaseClient> | null = null;

/** Nạp thư viện Supabase khi cần (không làm nặng game khi chưa cấu hình). */
export function getClient(): Promise<SupabaseClient> {
  if (!onlineConfigured()) return Promise.reject(new Error("Chưa cấu hình máy chủ tài khoản"));
  clientPromise ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(URL!, KEY!, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "dccc_auth" } }),
  );
  return clientPromise;
}

export interface OnlineUser {
  id: string;
  email: string;
}

/** Dịch lỗi Supabase sang tiếng Việt dễ hiểu. */
function viError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "Sai email hoặc mật khẩu";
  if (m.includes("already registered") || m.includes("already been registered")) return "Email này đã có tài khoản – hãy đăng nhập";
  if (m.includes("password") && m.includes("6")) return "Mật khẩu cần ít nhất 6 ký tự";
  if (m.includes("email not confirmed")) return "Email chưa được xác nhận – hãy mở thư xác nhận trong hộp thư";
  if (m.includes("rate limit") || m.includes("too many")) return "Thao tác quá nhanh, hãy thử lại sau ít phút";
  if (m.includes("fetch") || m.includes("network")) return "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.";
  return msg;
}

export async function currentUser(): Promise<OnlineUser | null> {
  if (!onlineConfigured()) return null;
  try {
    const sb = await getClient();
    const { data } = await sb.auth.getSession();
    const u = data.session?.user;
    return u ? { id: u.id, email: u.email ?? "" } : null;
  } catch {
    return null;
  }
}

export type AuthResult = { ok: true; user: OnlineUser | null; needsConfirm?: boolean } | { ok: false; error: string };

export async function signUp(email: string, password: string, displayName: string): Promise<AuthResult> {
  try {
    const sb = await getClient();
    const { data, error } = await sb.auth.signUp({ email, password, options: { data: { display_name: displayName } } });
    if (error) return { ok: false, error: viError(error.message) };
    const u = data.session?.user;
    if (!u) return { ok: true, user: null, needsConfirm: true };
    return { ok: true, user: { id: u.id, email: u.email ?? email } };
  } catch (e) {
    return { ok: false, error: viError(String((e as Error).message ?? e)) };
  }
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  try {
    const sb = await getClient();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: viError(error.message) };
    return { ok: true, user: { id: data.user.id, email: data.user.email ?? email } };
  } catch (e) {
    return { ok: false, error: viError(String((e as Error).message ?? e)) };
  }
}

export async function signOut(): Promise<void> {
  try {
    const sb = await getClient();
    await sb.auth.signOut();
  } catch {
    /* bỏ qua */
  }
}

export async function fetchRemoteSave(userId: string): Promise<unknown | null> {
  const sb = await getClient();
  const { data, error } = await sb.from("player_saves").select("save").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(viError(error.message));
  return (data?.save as unknown) ?? null;
}

export async function pushRemoteSave(userId: string, save: { version: number; playerId: string; level: number }): Promise<void> {
  const sb = await getClient();
  const { error } = await sb
    .from("player_saves")
    .upsert({ user_id: userId, save, save_version: save.version, player_id: save.playerId, level: save.level });
  if (error) throw new Error(viError(error.message));
}

/**
 * Bộ lưu theo tài khoản online. Gộp các lần lưu dồn dập (tối đa 1 lần / 4 giây),
 * luôn giữ thêm một bản trên máy để chơi tiếp khi mất mạng.
 */
export class OnlineSaveStorage implements SaveStorage {
  readonly kind = "online" as const;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pending: unknown = null;
  lastSyncedAt: number | null = null;
  lastError: string | null = null;

  constructor(
    readonly user: OnlineUser,
    private readonly local: SaveStorage,
    /** Gọi khi máy chủ báo bản này cũ hơn tài khoản (STALE_SAVE). */
    private readonly onStale?: () => Promise<void>,
  ) {
    if (typeof document !== "undefined")
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") void this.flush();
      });
  }

  async load() {
    return fetchRemoteSave(this.user.id);
  }

  async save(data: unknown) {
    await this.local.save(data);
    this.pending = data;
    if (!this.timer) this.timer = setTimeout(() => void this.flush(), 4000);
  }

  async flush() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const data = this.pending;
    if (!data) return;
    this.pending = null;
    try {
      await pushRemoteSave(this.user.id, data as { version: number; playerId: string; level: number });
      this.lastSyncedAt = Date.now();
      this.lastError = null;
    } catch (e) {
      this.lastError = (e as Error).message;
      if (isStaleSaveError(this.lastError)) {
        // bản cũ – bỏ, không thử đẩy lại; tải bản mới nhất từ tài khoản
        this.lastError = "Đã tải tiến trình mới nhất từ tài khoản (máy này đang dùng bản cũ)";
        await this.onStale?.();
        return;
      }
      this.pending ??= data; // thử lại lần lưu sau
    }
  }

  async clear() {
    await this.local.clear();
  }

  async backup(data: unknown) {
    await this.local.backup(data);
  }
}
