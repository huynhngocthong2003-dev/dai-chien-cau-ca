import Phaser from "phaser";
import {
  applyCatch,
  buildLoadout,
  consumeBossTicket,
  createNewSave,
  decomposeFishes,
  developCharacter,
  developFish,
  developRod,
  refillBossTickets,
  toggleFishLock,
  recordFail,
  sellFishes,
  unlockItem,
  type CharacterDef,
  type FishDef,
  type Loadout,
  type RodDef,
  type PlayerSave,
  type UnlockCondition,
} from "@dccc/shared";
import { CATALOG, CHARACTER_BY_ID, FISH_BY_ID, ROD_BY_ID, ZONE_BY_ID } from "@dccc/game-data";
import { parseSave } from "@dccc/validation";
import { detectStorage, MemorySaveStorage, type SaveStorage } from "./storage.ts";

function uid(prefix: string): string {
  const r = crypto.getRandomValues(new Uint32Array(2));
  return `${prefix}_${Date.now().toString(36)}_${r[0]!.toString(36)}${r[1]!.toString(36)}`;
}

/**
 * Nguồn trạng thái duy nhất phía client ở Giai đoạn 1. Mọi thay đổi đi qua các
 * hàm thuần túy trong @dccc/shared (cũng sẽ chạy trên server ở Giai đoạn 4).
 */
class GameStateStore extends Phaser.Events.EventEmitter {
  private _save!: PlayerSave;
  storage: SaveStorage = new MemorySaveStorage();
  loadWarning: string | null = null;
  soundOn = true;

  get save(): PlayerSave {
    return this._save;
  }

  async init(): Promise<void> {
    this.storage = await detectStorage();
    try {
      this.soundOn = localStorage.getItem("dccc_sound") !== "off";
    } catch {
      /* bỏ qua */
    }
    let raw: unknown;
    try {
      raw = await this.storage.load();
    } catch {
      raw = null;
    }
    if (raw) {
      const parsed = parseSave(raw);
      if (parsed.ok && this.isConsistent(parsed.save)) {
        this._save = refillBossTickets(parsed.save, Date.now());
        await this.persist();
        return;
      }
      this.loadWarning = "Dữ liệu lưu bị hỏng hoặc không hợp lệ, đã tạo tài khoản mới.";
    }
    this._save = createNewSave(uid("p"), "Cần Thủ", CATALOG, Date.now());
    await this.persist();
  }

  /** Kiểm tra save chỉ tham chiếu dữ liệu tồn tại. */
  private isConsistent(s: PlayerSave): boolean {
    return (
      CHARACTER_BY_ID.has(s.selectedCharacterId) &&
      ROD_BY_ID.has(s.selectedRodId) &&
      ZONE_BY_ID.has(s.selectedZoneId) &&
      Object.keys(s.characters).every((id) => CHARACTER_BY_ID.has(id)) &&
      Object.keys(s.rods).every((id) => ROD_BY_ID.has(id)) &&
      s.fishes.every((f) => FISH_BY_ID.has(f.fishId))
    );
  }

  private commit(next: PlayerSave) {
    this._save = next;
    this.emit("changed", next);
    void this.persist();
  }

  async persist() {
    try {
      await this.storage.save(this._save);
    } catch {
      this.emit("save-error");
    }
  }

  loadout(): Loadout {
    const s = this._save;
    const c = CHARACTER_BY_ID.get(s.selectedCharacterId)!;
    const r = ROD_BY_ID.get(s.selectedRodId)!;
    return buildLoadout(c, s.characters[c.id] ?? 1, r, s.rods[r.id] ?? 1);
  }

  catchFish(fish: FishDef, weightKg: number, zoneId: string, bossHunt = false) {
    const res = applyCatch(this._save, {
      txId: uid("c"),
      fish,
      weightKg,
      zoneId,
      passives: this.loadout().passives,
      now: Date.now(),
      bossHunt,
    });
    if (res.ok) {
      this.commit(res.save);
      if (res.levelUps) this.emit("level-up", this._save.level);
    }
    return res;
  }

  recordFail(kind: "escaped" | "snapped") {
    this.commit(recordFail(this._save, kind, Date.now()));
  }

  sell(uids: string[]) {
    const res = sellFishes(this._save, uids, FISH_BY_ID, uid("s"), Date.now());
    if (res.ok) this.commit(res.save);
    return res;
  }

  unlock(kind: "characters" | "rods", id: string, cond: UnlockCondition) {
    const res = unlockItem(this._save, kind, id, cond, uid("u"), Date.now());
    if (res.ok) this.commit(res.save);
    return res;
  }

  /** Áp dụng một hành động thuần túy; commit nếu thành công. */
  private run<R extends { ok: true; save: PlayerSave } | { ok: false; error: string }>(r: R): R {
    if (r.ok) this.commit(r.save);
    return r;
  }

  developCharacter(c: CharacterDef) {
    return this.run(developCharacter(this._save, c, uid("dc"), Date.now()));
  }

  developRod(r: RodDef) {
    return this.run(developRod(this._save, r, uid("dr"), Date.now()));
  }

  developFish(fishUid: string) {
    return this.run(developFish(this._save, fishUid, FISH_BY_ID, uid("df"), Date.now()));
  }

  decompose(uids: string[]) {
    return this.run(decomposeFishes(this._save, uids, FISH_BY_ID, uid("dx"), Date.now()));
  }

  toggleLock(fishUid: string) {
    return this.run(toggleFishLock(this._save, fishUid, Date.now()));
  }

  /** Hồi vé (nếu sang ngày mới) rồi tiêu 1 vé Boss. */
  useBossTicket() {
    const refreshed = refillBossTickets(this._save, Date.now());
    if (refreshed !== this._save) this.commit(refreshed);
    return this.run(consumeBossTicket(this._save, uid("bt"), Date.now()));
  }

  refreshDaily() {
    const refreshed = refillBossTickets(this._save, Date.now());
    if (refreshed !== this._save) this.commit(refreshed);
  }

  select(field: "selectedCharacterId" | "selectedRodId" | "selectedZoneId", id: string) {
    if (field === "selectedCharacterId" && !this._save.characters[id]) return false;
    if (field === "selectedRodId" && !this._save.rods[id]) return false;
    if (field === "selectedZoneId") {
      const z = ZONE_BY_ID.get(id);
      if (!z || this._save.level < z.requiredLevel) return false;
    }
    this.commit({ ...this._save, [field]: id, updatedAt: Date.now() });
    return true;
  }

  rename(name: string) {
    this.commit({ ...this._save, name, updatedAt: Date.now() });
  }

  setSound(on: boolean) {
    this.soundOn = on;
    try {
      localStorage.setItem("dccc_sound", on ? "on" : "off");
    } catch {
      /* bỏ qua */
    }
  }

  async reset() {
    this._save = createNewSave(uid("p"), "Cần Thủ", CATALOG, Date.now());
    await this.persist();
    this.emit("changed", this._save);
  }
}

export const GameState = new GameStateStore();
