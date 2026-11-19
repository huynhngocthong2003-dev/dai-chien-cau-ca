import Phaser from "phaser";
import {
  Rng,
  randomSeed,
  applyCatch,
  applyJunkCatch,
  applyDeathMatch,
  applyForm,
  applyPvpOutcome,
  eatRoasted,
  grantEvoItem,
  setDefense,
  setShowcase,
  claimEvent,
  recycleAll,
  decideSync,
  decodeBackup,
  encodeBackup,
  redeemGiftCode,
  buildLoadout,
  buyCosmetic,
  buyShopItem,
  equipCosmetic,
  equipmentPassives,
  sellCosmetic,
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
  type CosmeticDef,
  type CosmeticSlot,
  type ShopItemDef,
  type Difficulty,
  type Fighter,
  type FishDef,
  type FishFormDef,
  type GameEventDef,
  type PvpMatchRecord,
  type JunkDef,
  type Loadout,
  type RodDef,
  type PlayerSave,
  type UnlockCondition,
} from "@dccc/shared";
import { CATALOG, CHARACTERS, CHARACTER_BY_ID, FORM_BY_ID, GIFT_REWARDS, JUNK_BY_ID, RODS, COSMETIC_BY_ID, FISH_BY_ID, ROD_BY_ID, ZONE_BY_ID } from "@dccc/game-data";
import { parseSave } from "@dccc/validation";
import { detectStorage, MemorySaveStorage, type SaveStorage } from "./storage.ts";
import * as Online from "./online.ts";
import * as Social from "./social.ts";

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
  /** Người dùng tài khoản online đang đăng nhập (nếu có). */
  online: Online.OnlineUser | null = null;
  /** Bộ lưu trên máy/Artifact – dùng lại khi đăng xuất. */
  private baseStorage: SaveStorage = new MemorySaveStorage();
  soundOn = true;

  get save(): PlayerSave {
    return this._save;
  }

  async init(): Promise<void> {
    await this.initLocal();
    if (Online.onlineConfigured()) {
      const user = await Online.currentUser();
      if (user) {
        try {
          const msg = await this.adoptAccount(user);
          if (msg && msg.includes("cất")) this.loadWarning = msg;
        } catch (e) {
          this.loadWarning = `Chưa đồng bộ được tài khoản: ${(e as Error).message}. Đang chơi bằng dữ liệu trên máy.`;
        }
      }
    }
  }

  private async initLocal(): Promise<void> {
    this.storage = await detectStorage();
    this.baseStorage = this.storage;
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
      await this.storage.backup(raw);
      console.warn("Dữ liệu lưu không hợp lệ, đã sao lưu bản cũ:", parsed.ok ? "tham chiếu dữ liệu không tồn tại" : parsed.error);
      this.loadWarning = "Không đọc được dữ liệu lưu cũ (đã cất bản sao lưu). Đã tạo tài khoản mới.";
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
      s.fishes.every((f) => FISH_BY_ID.has(f.fishId)) &&
      Object.keys(s.wardrobe).every((id) => COSMETIC_BY_ID.has(id))
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
    const cp = s.characters[c.id];
    const extra = cp ? equipmentPassives(cp.equip, COSMETIC_BY_ID) : [];
    return buildLoadout(c, cp ?? 1, r, s.rods[r.id] ?? 1, extra);
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

  catchJunk(j: JunkDef) {
    return this.run(applyJunkCatch(this._save, j, uid("j"), Date.now()));
  }

  // ------------------------------------------------------------ Đấu Sinh Tử
  deathMatch(teamUids: string[], opponent: Fighter[], seed: number, difficulty: Difficulty) {
    return this.run(
      applyDeathMatch(this._save, { txId: uid("dm"), teamUids, opponent, seed, difficulty, now: Date.now() }, FISH_BY_ID, FORM_BY_ID),
    );
  }

  /** Cho nhân vật ăn cá nướng để nhận kinh nghiệm. */
  eatRoasted(roastedId: string, charId: string) {
    return this.run(eatRoasted(this._save, roastedId, charId, FISH_BY_ID, Date.now()));
  }

  setDefense(uids: string[]) {
    const r = this.run(setDefense(this._save, uids, Date.now()));
    if (r.ok) void this.publishProfile();
    return r;
  }

  setShowcase(uids: string[]) {
    const r = this.run(setShowcase(this._save, uids, Date.now()));
    if (r.ok) void this.publishProfile();
    return r;
  }

  grantEvoItem(itemId: string) {
    return this.run(grantEvoItem(this._save, itemId, uid("ev"), Date.now()));
  }

  applyForm(fishUid: string, form: FishFormDef) {
    return this.run(applyForm(this._save, fishUid, form, uid("fm"), Date.now(), FISH_BY_ID, new Rng(randomSeed()).next()));
  }

  /** Áp kết quả một trận PvP vừa đấu (phía mình) rồi báo máy chủ. */
  async applyPvp(rec: PvpMatchRecord) {
    const r = this.run(applyPvpOutcome(this._save, rec, Date.now()));
    if (r.ok) {
      try {
        await this.syncNow();
        await Social.markPvpApplied(rec.id);
      } catch {
        /* lần mở game sau sẽ thử lại – pvpApplied chống áp dụng 2 lần */
      }
    }
    return r;
  }

  /** Đăng hồ sơ công khai + nhận kết quả các trận bị thách đấu. Trả về các trận vừa áp dụng. */
  async syncSocial(): Promise<PvpMatchRecord[]> {
    if (!this.online) return [];
    const applied: PvpMatchRecord[] = [];
    try {
      for (const m of await Social.pendingPvp(this.online.id)) {
        if (this._save.pvpApplied.includes(m.id)) {
          await Social.markPvpApplied(m.id);
          continue;
        }
        const r = applyPvpOutcome(this._save, m, Date.now());
        if (r.ok) {
          this.commit(r.save);
          applied.push(m);
        }
      }
      if (applied.length) await this.syncNow();
      for (const m of applied) await Social.markPvpApplied(m.id);
      await this.publishProfile();
    } catch (e) {
      console.warn("Đồng bộ mạng xã hội thất bại:", (e as Error).message);
    }
    return applied;
  }

  async publishProfile() {
    if (!this.online) return;
    try {
      await Social.publishCard(this.online.id, this._save);
    } catch (e) {
      console.warn("Không đăng được hồ sơ:", (e as Error).message);
    }
  }

  claimEvent(ev: GameEventDef) {
    return this.run(claimEvent(this._save, ev, uid("ev"), Date.now()));
  }

  recycle() {
    return this.run(recycleAll(this._save, JUNK_BY_ID, uid("rc"), Date.now()));
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

  redeem(code: string) {
    return this.run(redeemGiftCode(this._save, code, { characters: CHARACTERS, rods: RODS, rewards: GIFT_REWARDS }, Date.now()));
  }

  /** Đồ đang mặc của nhân vật (để vẽ). */
  equipOf(charId: string) {
    return this._save.characters[charId]?.equip ?? {};
  }

  buyCosmetic(item: CosmeticDef) {
    return this.run(buyCosmetic(this._save, item, uid("bc"), Date.now()));
  }

  buyItem(item: ShopItemDef) {
    return this.run(buyShopItem(this._save, item, uid("bi"), Date.now()));
  }

  sellCosmetic(item: CosmeticDef) {
    return this.run(sellCosmetic(this._save, item, uid("sc"), Date.now()));
  }

  equip(charId: string, slot: CosmeticSlot, item: CosmeticDef | null) {
    return this.run(equipCosmetic(this._save, charId, slot, item, Date.now()));
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

  // ------------------------------------------------------------ tài khoản online
  /** Gắn tài khoản: chọn bản lưu (tài khoản hay máy), chuyển sang lưu online. */
  async adoptAccount(user: Online.OnlineUser): Promise<string> {
    const remoteRaw = await Online.fetchRemoteSave(user.id);
    let remote: PlayerSave | null = null;
    if (remoteRaw) {
      const p = parseSave(remoteRaw);
      if (p.ok && this.isConsistent(p.save)) remote = refillBossTickets(p.save, Date.now());
      else await this.baseStorage.backup(remoteRaw);
    }
    const d = decideSync(this._save, remote);
    if (d.backupLocal) await this.baseStorage.backup(this._save);
    if (d.use === "remote" && remote) this._save = remote;
    const online = new Online.OnlineSaveStorage(user, this.baseStorage);
    this.storage = online;
    this.online = user;
    await online.save(this._save);
    if (d.upload) await online.flush();
    this.emit("changed", this._save);
    this.emit("account", user);
    void this.publishProfile();
    return d.reason;
  }

  async signUp(email: string, password: string, name: string) {
    const r = await Online.signUp(email, password, name);
    if (!r.ok || !r.user) return r;
    this.rename(name);
    return { ...r, message: await this.adoptAccount(r.user) };
  }

  async signIn(email: string, password: string) {
    const r = await Online.signIn(email, password);
    if (!r.ok || !r.user) return r;
    return { ...r, message: await this.adoptAccount(r.user) };
  }

  async signOut() {
    if (this.storage instanceof Online.OnlineSaveStorage) await this.storage.flush();
    await Online.signOut();
    this.online = null;
    this.storage = this.baseStorage;
    await this.persist();
    this.emit("account", null);
  }

  async syncNow(): Promise<string | null> {
    if (!(this.storage instanceof Online.OnlineSaveStorage)) return "Chưa đăng nhập";
    await this.storage.save(this._save);
    await this.storage.flush();
    return this.storage.lastError;
  }

  // ------------------------------------------------------------ mã sao lưu
  exportBackup(): Promise<string> {
    return encodeBackup(this._save);
  }

  async importBackup(code: string): Promise<{ ok: true; save: PlayerSave } | { ok: false; error: string }> {
    const d = await decodeBackup(code);
    if (!d.ok) return d;
    const p = parseSave(d.data);
    if (!p.ok) return { ok: false, error: "Dữ liệu sao lưu không hợp lệ hoặc của phiên bản game khác" };
    if (!this.isConsistent(p.save)) return { ok: false, error: "Sao lưu chứa vật phẩm không tồn tại trong game" };
    await this.baseStorage.backup(this._save);
    this.commit(refillBossTickets(p.save, Date.now()));
    return { ok: true, save: this._save };
  }

  async reset() {
    this._save = createNewSave(uid("p"), "Cần Thủ", CATALOG, Date.now());
    await this.persist();
    this.emit("changed", this._save);
  }
}

export const GameState = new GameStateStore();
