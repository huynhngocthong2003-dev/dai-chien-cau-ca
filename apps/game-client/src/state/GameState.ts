import Phaser from "phaser";
import type { AiLevel, CombatState } from "@dccc/shared";
import { pvpCall, type PvpRoom } from "./pvp.ts";
import {
  advanceTutorial,
  finishTutorial,
  tutorialStep,
  type TutorialStep,
  Rng,
  randomSeed,
  applyCatch,
  applyJunkCatch,
  applyDeathMatch,
  applyCombatOutcome,
  collectHabitat,
  breedingOf,
  habitatFishes,
  hatchEgg,
  speedupEgg,
  startBreeding,
  unlockHatchSlot,
  type CombatOutcomeInput,
  applyRaceEntry,
  applyRodRepair,
  applyRodWear,
  applyRaceResult,
  type RaceLeague,
  applyForm,
  applyPvpOutcome,
  eatRoasted,
  grantEvoItem,
  setDefense,
  setShowcase,
  claimEvent,
  applyTopup,
  type TopupPackageDef,
  claimCheckin,
  claimQuest,
  claimTitle,
  equipTitle,
  refreshDaily,
  spinWheel,
  spinWheel10,
  type QuestDef,
  type TitleDef,
  recycleAll,
  decideSync,
  pickRecovery,
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
  applyMailReward,
  assignMissingElements,
  type MailReward,
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
  type EvoItemDef,
  type GameEventDef,
  type PvpMatchRecord,
  type JunkDef,
  type Loadout,
  type RodDef,
  type PlayerSave,
  type UnlockCondition,
} from "@dccc/shared";
import { BREEDING_RECIPES, breedTierOf, EVO_ITEMS, FISH_FORMS, CATALOG, CHECKIN_REWARDS, TOPUP_PACKAGES, WHEEL_GOOD_WEIGHT, WHEEL_PRIZES, CHARACTERS, CHARACTER_BY_ID, FORM_BY_ID, GIFT_REWARDS, JUNK_BY_ID, RODS, COSMETIC_BY_ID, FISH_BY_ID, ROD_BY_ID, ZONE_BY_ID } from "@dccc/game-data";
import { ECONOMY } from "@dccc/game-config";
import { parseSave } from "@dccc/validation";
import { detectStorage, MemorySaveStorage, type SaveStorage } from "./storage.ts";
import * as Online from "./online.ts";
import * as Social from "./social.ts";

/** Bản lưu mới (có hướng dẫn tân thủ). Cờ `dccc_skip_tutorial` = bỏ qua hướng dẫn (như nút "Bỏ qua", không có quà) – dùng cho kiểm thử E2E. */
function freshSave(playerId: string, now: number) {
  const s = createNewSave(playerId, "Cần Thủ", CATALOG, now);
  try {
    if (localStorage.getItem("dccc_skip_tutorial") === "1") s.tutorial = { step: "done", done: true };
  } catch {
    /* không có localStorage */
  }
  return s;
}

function uid(prefix: string): string {
  const r = crypto.getRandomValues(new Uint32Array(2));
  return `${prefix}_${Date.now().toString(36)}_${r[0]!.toString(36)}${r[1]!.toString(36)}`;
}

/**
 * Nguồn trạng thái duy nhất phía client ở Giai đoạn 1. Mọi thay đổi đi qua các
 * hàm thuần túy trong @dccc/shared (cũng sẽ chạy trên server ở Giai đoạn 4).
 */
/** Bản lưu cũ: gán nguyên tố cho cá chưa có hệ theo quy tắc khu câu (một lần, rồi lưu lên tài khoản). */
function withElements<T extends PlayerSave>(s: T): T {
  assignMissingElements(s, FISH_BY_ID, ZONE_BY_ID);
  return s;
}

class GameStateStore extends Phaser.Events.EventEmitter {
  private _save!: PlayerSave;
  storage: SaveStorage = new MemorySaveStorage();
  loadWarning: string | null = null;
  /** Người dùng tài khoản online đang đăng nhập (nếu có). */
  online: Online.OnlineUser | null = null;
  /** Máy này có phiên đăng nhập (kể cả khi tạm thời chưa đồng bộ được vì mất mạng). */
  hadSession = false;

  /** Bắt buộc đăng nhập: bản game có máy chủ tài khoản mà người chơi chưa đăng nhập. */
  get needsLogin(): boolean {
    return Online.onlineConfigured() && !this.online && !this.hadSession;
  }
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
        this.hadSession = true;
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
        this._save = refillBossTickets(withElements(parsed.save), Date.now());
        await this.persist();
        return;
      }
      await this.storage.backup(raw);
      console.warn("Dữ liệu lưu không hợp lệ, đã sao lưu bản cũ:", parsed.ok ? "tham chiếu dữ liệu không tồn tại" : parsed.error);
      this.loadWarning = "Không đọc được dữ liệu lưu cũ (đã cất bản sao lưu). Đã tạo tài khoản mới.";
    }
    this._save = freshSave(uid("p"), Date.now());
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
      zoneElement: ZONE_BY_ID.get(zoneId)?.element,
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

  // ------------------------------------------------------------ Hướng dẫn tân thủ
  /** Bước hướng dẫn hiện tại; null = chơi tự do. */
  get tutorial(): TutorialStep | null {
    return tutorialStep(this._save);
  }

  tutorialAdvance(from: TutorialStep | readonly TutorialStep[], to?: TutorialStep) {
    const next = advanceTutorial(this._save, from, to);
    if (next !== this._save) this.commit(next);
  }

  tutorialFinish(skipped: boolean) {
    const r = finishTutorial(this._save, uid("tut"), Date.now(), skipped);
    if (r.ok) this.commit(r.save);
    return r;
  }

  // ------------------------------------------------------------ Độ bền cần câu
  /** Tốn lượt câu của cần đang dùng (mỗi lần quăng; đứt dây tốn thêm). */
  wearRod(amount = 1) {
    return this.run(applyRodWear(this._save, ROD_BY_ID.get(this._save.selectedRodId)!, amount, Date.now()));
  }

  repairRod(rodId: string) {
    const r = applyRodRepair(this._save, ROD_BY_ID.get(rodId)!, uid("rr"), Date.now());
    if (r.ok) this.commit(r.save);
    return r;
  }

  // ------------------------------------------------------------ Đua Cá
  /** Ghi danh (trừ phí). Trả về mã ghi danh để nhận thưởng sau cuộc đua. */
  raceEntry(league: RaceLeague, fishUid: string) {
    const txId = uid("race");
    const r = this.run(applyRaceEntry(this._save, { txId, league, fishUid, now: Date.now() }));
    return r.ok ? { ok: true as const, entryTx: txId } : r;
  }

  raceResult(entryTx: string, league: RaceLeague, place: number) {
    const r = applyRaceResult(this._save, { entryTx, league, place, now: Date.now() });
    if (r.ok) this.commit(r.save);
    return r;
  }

  // ------------------------------------------------------------ Đấu Sinh Tử
  deathMatch(teamUids: string[], opponent: Fighter[], seed: number, difficulty: Difficulty) {
    return this.run(
      applyDeathMatch(this._save, { txId: uid("dm"), teamUids, opponent, seed, difficulty, now: Date.now() }, FISH_BY_ID, FORM_BY_ID),
    );
  }

  /**
   * Áp kết quả trận 3vs3 (thắng: thưởng; thua: mất cá lực chiến thấp nhất) rồi báo máy chủ đã kết toán.
   * `kind`: "battle" = trận với máy trên máy chủ, "pvp" = phòng đấu người, "local" = chơi không tài khoản.
   */
  async settleCombat(kind: "battle" | "pvp" | "local", id: string, input: Omit<CombatOutcomeInput, "now">) {
    const r = applyCombatOutcome(this._save, { ...input, now: Date.now() }, FISH_BY_ID, FORM_BY_ID);
    if (r.ok) this.commit(r.save);
    const done = r.ok || this._save.appliedTx.includes(input.txId);
    if (done && this.online && kind !== "local") {
      try {
        await this.syncNow();
        await this.markCombatSettled(kind, id);
      } catch {
        /* lần mở game sau sẽ thử lại – txId chống áp 2 lần */
      }
    }
    return r;
  }

  private async markCombatSettled(kind: "battle" | "pvp", id: string) {
    if (kind === "battle") {
      const sb = await Online.getClient();
      await sb.rpc("mark_battle_settled", { battle_id: id });
    } else await pvpCall({ op: "settle", id });
  }

  /** Kết toán các trận 3vs3 đã xong nhưng chưa áp (thoát giữa chừng, mất mạng, đóng game…). */
  async settlePendingCombats(): Promise<number> {
    if (!this.online) return 0;
    let n = 0;
    try {
      const sb = await Online.getClient();
      // trận với máy bỏ dở > 15 phút → máy chủ xử thua
      const old = new Date(Date.now() - 15 * 60_000).toISOString();
      const { data: open } = await sb.from("battles").select("id").is("winner", null).lt("updated_at", old).limit(10);
      for (const b of (open ?? []) as { id: string }[]) await sb.functions.invoke("battle", { body: { op: "forfeit", id: b.id } }).catch(() => null);
      const { data } = await sb.from("battles").select("id, team, ai_level, winner, state").not("winner", "is", null).eq("settled", false).limit(20);
      for (const b of (data ?? []) as { id: string; team: string[]; ai_level: AiLevel | null; winner: 0 | 1; state: CombatState }[]) {
        await this.settleCombat("battle", b.id, {
          txId: `cb_${b.id}`,
          teamUids: b.team,
          won: b.winner === 0,
          level: b.ai_level ?? "normal",
          foe: b.state.sides[1].team,
        });
        n++;
      }
      const { rooms } = await pvpCall<{ rooms: PvpRoom[] }>({ op: "pending" });
      for (const r of rooms) {
        await this.settleCombat("pvp", r.id, pvpOutcome(r));
        n++;
      }
    } catch (e) {
      console.warn("Kết toán trận 3vs3 thất bại:", (e as Error).message);
    }
    return n;
  }

  // ------------------------------------------------------------ Đảo Lai Tạo
  /** Lai 2 cá Boss → trứng vào hang ấp (kết quả đã định sẵn theo seed của trứng). */
  breedStart(parentUids: [string, string]) {
    return this.run(startBreeding(this._save, { txId: uid("egg"), parentUids, now: Date.now(), seed: randomSeed() }, BREEDING_RECIPES, FISH_BY_ID));
  }

  breedUnlockSlot(slot: number) {
    return this.run(unlockHatchSlot(this._save, { txId: uid("hs"), slot, now: Date.now() }));
  }

  breedSpeedup(slot: number) {
    return this.run(speedupEgg(this._save, { txId: uid("sp"), slot, now: Date.now() }));
  }

  breedHatch(slot: number) {
    return this.run(hatchEgg(this._save, { slot, now: Date.now() }, BREEDING_RECIPES, FISH_BY_ID));
  }

  /** Cá Boss mới vào bể nuôi: bắt đầu đếm chu kỳ thu hoạch (không cộng vàng). */
  habitatInit() {
    const st = breedingOf(this._save);
    const fresh = habitatFishes(this._save, FISH_BY_ID).filter((f) => st.harvestAt[f.uid] === undefined).map((f) => f.uid);
    if (fresh.length) this.run(collectHabitat(this._save, { txId: uid("hvi"), now: Date.now(), uids: fresh }, FISH_BY_ID, breedTierOf));
  }

  /** Thu vàng từ cá trong bể nuôi (uids bỏ trống = tất cả cá đã đủ chu kỳ). */
  harvestHabitat(uids?: string[]) {
    return this.run(collectHabitat(this._save, { txId: uid("hv"), now: Date.now(), uids }, FISH_BY_ID, breedTierOf));
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

  /** Đột biến cá Boss bằng vật phẩm – luôn thành công, ra ngẫu nhiên 1 dạng + chỉ số tăng ngẫu nhiên. */
  applyForm(fishUid: string, item: EvoItemDef) {
    return this.run(applyForm(this._save, fishUid, item, FISH_FORMS, uid("fm"), Date.now(), FISH_BY_ID, new Rng(randomSeed())));
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
      await this.settlePendingCombats();
    } catch (e) {
      console.warn("Đồng bộ mạng xã hội thất bại:", (e as Error).message);
    }
    return applied;
  }

  private heartbeat: ReturnType<typeof setInterval> | null = null;

  /** Gửi nhịp "đang online" mỗi 2 phút khi đã đăng nhập. */
  startHeartbeat() {
    if (this.heartbeat || typeof window === "undefined") return;
    this.heartbeat = setInterval(() => {
      if (this.online && document.visibilityState === "visible") void this.publishProfile();
    }, 120_000);
  }

  async publishProfile() {
    if (!this.online) return;
    try {
      await Social.publishCard(this.online.id, this._save);
    } catch (e) {
      console.warn("Không đăng được hồ sơ:", (e as Error).message);
    }
  }

  /** Sang ngày mới thì làm mới nhiệm vụ ngày (gọi khi mở bảng nhiệm vụ / vòng quay). */
  refreshQuests() {
    const r = refreshDaily(this._save, Date.now());
    if (r !== this._save) this.commit(r);
  }

  claimQuest(q: QuestDef) {
    this.refreshQuests();
    return this.run(claimQuest(this._save, q, uid("qs"), Date.now()));
  }

  claimCheckin() {
    return this.run(claimCheckin(this._save, CHECKIN_REWARDS, uid("ci"), Date.now()));
  }

  spinWheel10() {
    return this.run(spinWheel10(this._save, WHEEL_PRIZES, WHEEL_GOOD_WEIGHT, new Rng(randomSeed()), uid("w10"), Date.now()));
  }

  spinWheel() {
    return this.run(spinWheel(this._save, WHEEL_PRIZES, new Rng(randomSeed()), uid("wh"), Date.now()));
  }

  claimTitle(t: TitleDef) {
    const r = this.run(claimTitle(this._save, t, uid("tt"), Date.now()));
    if (r.ok) void this.publishProfile();
    return r;
  }

  equipTitle(id: string | null) {
    const r = this.run(equipTitle(this._save, id, Date.now()));
    if (r.ok) void this.publishProfile();
    return r;
  }

  /** Nhận các lệnh nạp đã được chủ dự án duyệt (máy chủ chỉ trả mỗi lệnh 1 lần). */
  async claimTopups(): Promise<TopupPackageDef[]> {
    if (!this.online) return [];
    const got: TopupPackageDef[] = [];
    const list = await Social.claimTopups();
    for (const o of list) {
      const r = applyTopup(this._save, o, TOPUP_PACKAGES, Date.now());
      if (r.ok) {
        this.commit(r.save);
        got.push(r.pkg!);
      }
    }
    if (got.length) await this.syncNow().catch(() => null);
    return got;
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
    return this.run(developFish(this._save, fishUid, FISH_BY_ID, uid("df"), Date.now(), FORM_BY_ID));
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
      if (p.ok && this.isConsistent(p.save)) remote = refillBossTickets(withElements(p.save), Date.now());
      else {
        // KHÔNG BAO GIỜ ghi đè tài khoản khi không đọc được bản trên máy chủ (bản game cũ / dữ liệu lạ):
        // giữ nguyên dữ liệu tài khoản, chơi tạm trên máy và báo người chơi tải lại trang.
        await this.baseStorage.backup(remoteRaw);
        console.warn("Không đọc được bản lưu trên tài khoản:", p.ok ? "tham chiếu dữ liệu không tồn tại" : p.error);
        this.online = null;
        throw new Error("Không đọc được tiến trình trên tài khoản (có thể bản game đã cũ). Hãy tải lại trang để cập nhật – dữ liệu tài khoản vẫn an toàn");
      }
    }
    const d = decideSync(this._save, remote);
    if (d.backupLocal) await this.baseStorage.backup(this._save);
    if (d.use === "remote" && remote) this._save = remote;
    let recovered = false;
    if (remote && this.baseStorage.listBackups) {
      // tiến trình bị lỡ còn cất trên máy (đợt máy chủ từ chối lưu) → lấy lại và tải lên
      const cands: PlayerSave[] = [];
      for (const raw of await this.baseStorage.listBackups()) {
        const p = parseSave(raw);
        if (p.ok && this.isConsistent(p.save)) cands.push(p.save);
      }
      const best = pickRecovery(this._save, cands);
      if (best) {
        await this.baseStorage.backup(this._save);
        this._save = { ...refillBossTickets(withElements(best), Date.now()), ...(this._save.resetAt !== undefined ? { resetAt: this._save.resetAt } : {}) };
        recovered = true;
      }
    }
    const online = new Online.OnlineSaveStorage(user, this.baseStorage, () => this.adoptRemoteAfterStale(user));
    this.storage = online;
    this.online = user;
    await online.save(this._save);
    if (d.upload || recovered) await online.flush();
    this.emit("changed", this._save);
    this.emit("account", user);
    void this.publishProfile();
    this.startHeartbeat();
    return recovered ? `Đã tìm lại tiến trình cấp ${this._save.level} còn lưu trên máy và cập nhật lên tài khoản` : d.reason;
  }

  /**
   * Máy chủ từ chối bản trên máy vì cũ hơn tài khoản (đã chơi tiếp trên máy khác) →
   * tải bản mới nhất về, cất bản trên máy làm sao lưu, chơi tiếp bằng bản mới.
   */
  private staleBusy = false;
  private async adoptRemoteAfterStale(user: Online.OnlineUser): Promise<void> {
    if (this.staleBusy || this.online?.id !== user.id) return;
    this.staleBusy = true;
    try {
      const raw = await Online.fetchRemoteSave(user.id);
      const p = raw ? parseSave(raw) : null;
      if (!p || !p.ok || !this.isConsistent(p.save)) return;
      await this.baseStorage.backup(this._save);
      this._save = refillBossTickets(withElements(p.save), Date.now());
      await this.baseStorage.save(this._save);
      this.emit("changed", this._save);
      this.emit("synced-remote", "Đã tải tiến trình mới nhất từ tài khoản (bạn vừa chơi trên máy khác)");
    } catch (e) {
      console.warn("Không tải được tiến trình mới nhất:", (e as Error).message);
    } finally {
      this.staleBusy = false;
    }
  }

  async signUp(email: string, password: string, name: string) {
    const r = await Online.signUp(email, password, name);
    if (!r.ok || !r.user) return r;
    this.hadSession = true;
    this.rename(name);
    try {
      return { ...r, message: await this.adoptAccount(r.user) };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }

  async signIn(email: string, password: string) {
    const r = await Online.signIn(email, password);
    if (!r.ok || !r.user) return r;
    this.hadSession = true;
    try {
      return { ...r, message: await this.adoptAccount(r.user) };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }

  async signOut() {
    if (this.storage instanceof Online.OnlineSaveStorage) await this.storage.flush();
    await Online.signOut();
    this.online = null;
    this.hadSession = false;
    this.storage = this.baseStorage;
    await this.persist();
    this.emit("account", null);
  }

  /**
   * Nhận quà trong Hòm Thư: cộng vào tiến trình (txId chống nhận trùng), lưu NGAY lên tài khoản,
   * rồi báo máy chủ thư đã nhận. Đã nhận từ trước (trên máy khác) → chỉ đánh dấu.
   */
  async claimMail(mailId: number, reward: MailReward): Promise<{ ok: true; already?: boolean } | { ok: false; error: string }> {
    if (this._save.appliedTx.includes(reward.txId)) {
      await Social.markMailClaimed(mailId).catch(() => null);
      return { ok: true, already: true };
    }
    const r = applyMailReward(this._save, reward, FISH_BY_ID, new Set(EVO_ITEMS.map((i) => i.id)), () => uid("ml"), Date.now(), ECONOMY.inventoryLimit);
    if (!r.ok) return r;
    this.commit(r.save);
    const err = await this.syncNow();
    if (err) return { ok: false, error: `Đã cộng quà nhưng chưa lưu lên tài khoản: ${err}. Hãy thử lại sau.` };
    await Social.markMailClaimed(mailId).catch(() => null);
    return { ok: true };
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
    // resetAt mới: máy chủ hiểu đây là chủ ý thay tiến trình (không phải máy cũ ghi đè)
    this.commit({ ...refillBossTickets(withElements(p.save), Date.now()), resetAt: Date.now() });
    return { ok: true, save: this._save };
  }

  async reset() {
    const now = Date.now();
    this._save = { ...freshSave(this._save.playerId, now), resetAt: now };
    await this.persist();
    this.emit("changed", this._save);
  }
}

export const GameState = new GameStateStore();

/** Đầu vào kết toán cho một phòng đấu người đã xong (góc nhìn của mình). */
export function pvpOutcome(r: PvpRoom): Omit<CombatOutcomeInput, "now"> {
  return {
    txId: `pv_${r.id}`,
    teamUids: r.myTeam ?? [],
    won: r.winner === 0,
    level: null,
    stake: r.stake,
    loseUid: r.myLose?.uid ?? null,
    foe: r.oppLose ? [r.oppLose] : [],
  };
}
