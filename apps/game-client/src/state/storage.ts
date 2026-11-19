/**
 * Lớp lưu trữ tiến trình. Giai đoạn 1 có hai bộ lưu:
 *  - CloudStorage: kho dữ liệu riêng tư theo tài khoản claude.ai (khi game chạy dạng Artifact
 *    và người chơi có quyền ghi) → vào từ thiết bị nào cũng giữ tiến trình.
 *  - LocalStorage: lưu trên trình duyệt hiện tại (dự phòng).
 * Giai đoạn 4 sẽ thêm SupabaseStorage làm hệ thống tài khoản chính thức, với server
 * là nguồn dữ liệu có thẩm quyền.
 */

export interface SaveStorage {
  readonly kind: "cloud" | "local" | "memory";
  load(): Promise<unknown | null>;
  save(data: unknown): Promise<void>;
  clear(): Promise<void>;
}

const LOCAL_KEY = "dccc_save_v1";

export class LocalSaveStorage implements SaveStorage {
  readonly kind = "local" as const;
  async load() {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      return raw ? (JSON.parse(raw) as unknown) : null;
    } catch {
      return null;
    }
  }
  async save(data: unknown) {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
    } catch {
      /* bộ nhớ trình duyệt bị chặn – bỏ qua */
    }
  }
  async clear() {
    try {
      localStorage.removeItem(LOCAL_KEY);
    } catch {
      /* bỏ qua */
    }
  }
}

export class MemorySaveStorage implements SaveStorage {
  readonly kind = "memory" as const;
  private data: unknown = null;
  async load() {
    return this.data;
  }
  async save(d: unknown) {
    this.data = d;
  }
  async clear() {
    this.data = null;
  }
}

// Kiểu tối thiểu cho runtime Artifact (chỉ dùng những gì cần).
interface DocRef {
  get(): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }>;
  set(data: Record<string, unknown>): Promise<void>;
  delete(): Promise<void>;
}
interface ArtifactDb {
  doc(path: string): DocRef;
}
interface ArtifactUser {
  id(): Promise<string | null>;
}
interface ClaudeRuntime {
  use(name: string): Promise<unknown>;
}

class CloudSaveStorage implements SaveStorage {
  readonly kind = "cloud" as const;
  private pending: Promise<void> = Promise.resolve();
  private latest: string | null = null;
  constructor(private readonly ref: DocRef) {}
  async load() {
    const snap = await this.ref.get();
    const raw = snap.exists ? snap.data()?.save : null;
    return typeof raw === "string" ? (JSON.parse(raw) as unknown) : null;
  }
  async save(data: unknown) {
    // Gộp các lần lưu liên tiếp: chỉ một lệnh ghi chạy tại một thời điểm.
    this.latest = JSON.stringify(data);
    this.pending = this.pending.then(async () => {
      const payload = this.latest;
      if (payload === null) return;
      this.latest = null;
      await this.ref.set({ save: payload, savedAt: Date.now() });
    });
    return this.pending;
  }
  async clear() {
    await this.ref.delete();
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]);
}

/** Chọn bộ lưu tốt nhất hiện có. Không bao giờ ném lỗi. */
export async function detectStorage(): Promise<SaveStorage> {
  const local = new LocalSaveStorage();
  const claude = (window as unknown as { claude?: ClaudeRuntime }).claude;
  if (!claude?.use) return local;
  try {
    const [db, user] = (await withTimeout(Promise.all([claude.use("db"), claude.use("user")]), 6000)) ?? [];
    if (!db || !user) return local;
    const id = await withTimeout((user as ArtifactUser).id(), 4000);
    if (!id) return local;
    // data/users/<id> là collection riêng tư của người chơi; "dccc_save" là document trong đó.
    const ref = (db as ArtifactDb).doc(`data/users/${id}/dccc_save`);
    const cloud = new CloudSaveStorage(ref);
    // Kiểm tra quyền đọc + ghi thật sự.
    const existing = await withTimeout(cloud.load(), 6000);
    if (existing === null) {
      const probe = await withTimeout(
        ref.set({ probe: true, savedAt: Date.now() }).then(() => true).catch(() => false),
        6000,
      );
      if (!probe) return local;
    }
    return cloud;
  } catch {
    return local;
  }
}
