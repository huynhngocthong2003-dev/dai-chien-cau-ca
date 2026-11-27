// Kênh phòng chơi chung.
// - Trên claude.ai: capability `room` của trang (khai báo khi đăng: capabilities: { room: {} }).
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
  /** "claude" = kênh thật; "mock" = giả lập giữa các tab. */
  kind: "claude" | "mock";
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
    if (!w.claude?.use) return null;
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

// ---------------------------------------------------------------- giả lập giữa các tab
function mockLobby(): NetLobby {
  const me = Math.random().toString(36).slice(2, 10);
  return {
    kind: "mock",
    async join(name: string): Promise<NetRoom> {
      const ch = new BroadcastChannel(`hero-arena-mock-${name}`);
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
      const send = (type: string) => {
        if (left && type !== "leave") return;
        try {
          ch.postMessage({ type, peer: me, presence: mine });
        } catch {
          /* kênh đã đóng */
        }
      };
      ch.onmessage = (e: MessageEvent<{ type: string; peer: string; presence: Record<string, unknown> }>) => {
        const d = e.data;
        if (!d || d.peer === me) return;
        if (d.type === "leave") others.delete(d.peer);
        else {
          const isNew = !others.has(d.peer);
          others.set(d.peer, { presence: d.presence ?? {}, seen: Date.now() });
          if (isNew) send("state"); // chào người mới
        }
        notify();
      };
      const beat = setInterval(() => {
        if (left) return;
        send("state");
        const now = Date.now();
        let changed = false;
        for (const [peer, o] of others) if (now - o.seen > 4000) {
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
          // gộp như kênh thật (~30 lần/giây)
          if (!pending) {
            pending = setTimeout(() => {
              pending = null;
              send("state");
            }, 33);
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
          ch.close();
        },
      };
    },
  };
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
