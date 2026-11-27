// Kênh phòng chơi chung.
// - Trên claude.ai: capability `room` của trang (khai báo khi đăng: capabilities: { room: {} }).
// - Trên web (GitHub Pages, như game câu cá): Supabase Realtime (kênh phát sóng), cần bản build có
//   VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (khóa công khai "anon", không phải service_role).
// - Kiểm thử tại máy: thêm `?mockroom` vào địa chỉ → kênh giả lập giữa các tab (BroadcastChannel).
// Chỉ dùng "trạng thái người tham gia" (presence): ai mở trang cũng gửi được, không cần quyền sửa.

export interface NetPeer {
  peer: string;
  isMe: boolean;
  sameTab: boolean;
  presence: Readonly<Record<string, unknown>>;
}

export interface NetRoom {
  readonly name: string;
  presence(patch: Record<string, unknown>): Promise<void>;
  peers(): readonly NetPeer[];
  onPeers(fn: (peers: readonly NetPeer[]) => void): () => void;
  connected(): boolean;
  leave(): Promise<void>;
}

export interface NetLobby {
  join(name: string): Promise<NetRoom>;
  /** "claude" = kênh trang claude.ai; "online" = Supabase Realtime; "mock" = giả lập giữa các tab. */
  kind: "claude" | "online" | "mock";
}

interface ClaudeRoomNs {
  join(name: string): Promise<{
    name: string;
    presence(patch: Record<string, unknown>): Promise<void>;
    peers(): readonly NetPeer[];
    onPeers(h: (c: { peers: readonly NetPeer[] }) => void, onError?: (e: { code: string }) => void): () => void;
    connected(): boolean;
    leave(): Promise<void>;
  }>;
}

let lobbyPromise: Promise<NetLobby | null> | null = null;

/** Kênh phòng của trang, hoặc null khi trang không có (mở ngoài claude.ai, chưa đăng nhập…). */
export function getLobby(): Promise<NetLobby | null> {
  if (lobbyPromise) return lobbyPromise;
  lobbyPromise = (async () => {
    try {
      if (new URLSearchParams(location.search).has("mockroom")) return mockLobby();
    } catch {
      /* bỏ qua */
    }
    const w = window as unknown as { claude?: { use?: (n: string) => Promise<unknown> } };
    if (!w.claude?.use) return onlineLobby();
    try {
      const ns = (await w.claude.use("room")) as ClaudeRoomNs | null;
      if (!ns) return null;
      return {
        kind: "claude",
        async join(name: string): Promise<NetRoom> {
          const r = await ns.join(name);
          return {
            name: r.name,
            presence: (p) => r.presence(p),
            peers: () => r.peers(),
            onPeers: (fn) => r.onPeers((c) => fn(c.peers)),
            connected: () => r.connected(),
            leave: () => r.leave(),
          };
        },
      } satisfies NetLobby;
    } catch {
      return null;
    }
  })();
  return lobbyPromise;
}

// ---------------------------------------------------------------- kênh phát sóng chung
/** Đường truyền tin nhắn tối thiểu (BroadcastChannel hoặc Supabase Realtime). */
interface Bus {
  post(msg: BusMsg): void;
  close(): void;
}
interface BusMsg {
  type: "state" | "leave";
  peer: string;
  presence: Record<string, unknown>;
}

/**
 * Phòng dựng trên kênh phát sóng: mỗi người phát "trạng thái" của mình (gộp tối đa 1 lần / `coalesceMs`),
 * nhịp tim mỗi giây, chào người mới, tự xoá người im lặng quá 4 giây. Giống ngữ nghĩa presence của claude.ai.
 */
function busRoom(name: string, me: string, open: (onMsg: (m: BusMsg) => void) => Bus, coalesceMs: number): NetRoom {
  const others = new Map<string, { presence: Record<string, unknown>; seen: number }>();
  let mine: Record<string, unknown> = {};
  const listeners = new Set<(p: readonly NetPeer[]) => void>();
  let left = false;
  const snapshot = (): NetPeer[] => [
    { peer: me, isMe: true, sameTab: true, presence: mine },
    ...[...others.entries()].map(([peer, o]) => ({ peer, isMe: false, sameTab: false, presence: o.presence })),
  ];
  const notify = () => {
    const ps = snapshot();
    for (const l of listeners) l(ps);
  };
  let lastSent = 0;
  const send = (type: BusMsg["type"]) => {
    if (left && type !== "leave") return;
    lastSent = Date.now();
    try {
      bus.post({ type, peer: me, presence: mine });
    } catch {
      /* kênh đã đóng */
    }
  };
  const bus = open((d) => {
    if (!d || typeof d.peer !== "string" || d.peer === me) return;
    if (d.type === "leave") others.delete(d.peer);
    else {
      const isNew = !others.has(d.peer);
      const pr = d.presence && typeof d.presence === "object" ? d.presence : {};
      others.set(d.peer, { presence: pr, seen: Date.now() });
      if (isNew) send("state"); // chào người mới
    }
    notify();
  });
  const beat = setInterval(() => {
    if (left) return;
    if (Date.now() - lastSent > 900) send("state");
    const now = Date.now();
    let changed = false;
    for (const [peer, o] of others)
      if (now - o.seen > 4000) {
        others.delete(peer);
        changed = true;
      }
    if (changed) notify();
  }, 1000);
  let pending: ReturnType<typeof setTimeout> | null = null;
  send("state");
  return {
    name,
    async presence(patch) {
      if (left) return;
      mine = { ...mine };
      for (const [k, v] of Object.entries(patch)) {
        if (v === null) delete mine[k];
        else mine[k] = v;
      }
      if (!pending) {
        const wait = Math.max(0, coalesceMs - (Date.now() - lastSent));
        pending = setTimeout(() => {
          pending = null;
          send("state");
        }, wait);
      }
      notify();
    },
    peers: snapshot,
    onPeers(fn) {
      listeners.add(fn);
      queueMicrotask(() => fn(snapshot()));
      return () => listeners.delete(fn);
    },
    connected: () => !left,
    async leave() {
      if (left) return;
      clearInterval(beat);
      if (pending) clearTimeout(pending);
      send("leave");
      left = true;
      bus.close();
    },
  };
}

const randomPeer = () => Math.random().toString(36).slice(2, 10);

// ---------------------------------------------------------------- giả lập giữa các tab
function mockLobby(): NetLobby {
  const me = randomPeer();
  return {
    kind: "mock",
    async join(name: string): Promise<NetRoom> {
      return busRoom(
        name,
        me,
        (onMsg) => {
          const ch = new BroadcastChannel(`hero-arena-mock-${name}`);
          ch.onmessage = (e: MessageEvent<BusMsg>) => onMsg(e.data);
          return { post: (m) => ch.postMessage(m), close: () => ch.close() };
        },
        33,
      );
    },
  };
}

// ---------------------------------------------------------------- Supabase Realtime (bản web)
const SB_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Có cấu hình máy chủ chơi chung trên web không (bản GitHub Pages). */
export const ONLINE_CONFIGURED = !!(SB_URL && SB_KEY);

async function onlineLobby(): Promise<NetLobby | null> {
  if (!SB_URL || !SB_KEY) return null;
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const me = randomPeer();
    return {
      kind: "online",
      async join(name: string): Promise<NetRoom> {
        const ch = sb.channel(`hero-arena:${name}`, { config: { broadcast: { self: false, ack: false } } });
        let onMsg: (m: BusMsg) => void = () => undefined;
        ch.on("broadcast", { event: "m" }, (e: { payload?: unknown }) => onMsg(e.payload as BusMsg));
        await new Promise<void>((resolve, reject) => {
          const t = setTimeout(() => reject(new Error("timeout")), 10000);
          ch.subscribe((status) => {
            if (status === "SUBSCRIBED") {
              clearTimeout(t);
              resolve();
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              clearTimeout(t);
              reject(new Error(status));
            }
          });
        });
        // gộp tối đa 10 lần/giây mỗi người để không vượt hạn mức tin nhắn của Supabase
        return busRoom(
          name,
          me,
          (fn) => {
            onMsg = fn;
            return {
              post: (m) => void ch.send({ type: "broadcast", event: "m", payload: m }),
              close: () => void sb.removeChannel(ch),
            };
          },
          100,
        );
      },
    } satisfies NetLobby;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- phiên chơi chung hiện tại
export interface NetSession {
  room: NetRoom;
  role: "host" | "client";
  seed: number;
  code: string;
  humans: Array<{ id: string; name: string; heroId: string; peer: string }>;
  localId: string;
  hostPeer: string;
}

let current: NetSession | null = null;

export function setNetSession(s: NetSession | null): void {
  current = s;
}

export function netSession(): NetSession | null {
  return current;
}

export async function leaveNet(): Promise<void> {
  const s = current;
  current = null;
  if (s) {
    try {
      await s.room.leave();
    } catch {
      /* bỏ qua */
    }
  }
}
