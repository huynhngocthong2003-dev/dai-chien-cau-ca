import Phaser from "phaser";
import { makeScrollArea } from "../ui/scrollArea.ts";
import { menuBackdrop } from "../ui/backdrop.ts";
import { ECONOMY, FISH_RARITY_COLOR, FISH_RARITY_LABEL, RARITY_ORDER } from "@dccc/game-config";
import { EVO_ITEMS, FISHES, FISH_BY_ID, FORMS_BY_ITEM, FORM_BY_ID, FORM_RANK_INFO, ZONE_BY_ID } from "@dccc/game-data";
import { STAGE_NAMES, canAfford, decomposeValue, fishGender, isBreedable, evolveFodder, fishMaxLevel, isGrowthFish, stageName, evoStonesFor, fishPower, fishSellPrice, fishStats, nextFishAction, ownedFishPower, type FishDef, type FishFormDef, type FormRoll, type OwnedFish } from "@dccc/shared";
import { costText } from "./GearScene.ts";
import { GameState } from "../state/GameState.ts";
import { evoItemTexture, fishDisplayMult, fishSilhouetteTexture, fishTextureFor, formFishTexture, softGlowTexture } from "../art/textures.ts";
import { Button, fadeIn, formatNum, goTo, modal, panel, toast, txt } from "../ui/widgets.ts";
import { TopBar } from "../ui/TopBar.ts";
import { COLORS } from "../ui/theme.ts";
import { hexToInt } from "../art/color.ts";
import { Sfx } from "../audio/Sfx.ts";
import { elementBadges, elementName, elementTags, fishElementSet, type ElementSet } from "../ui/element.ts";


export class InventoryScene extends Phaser.Scene {
  private tab: "bag" | "collection" = "bag";
  private page = 0;
  /** Vị trí cuộn của Bộ Sưu Tập (giữ nguyên khi chọn loài khác). */
  private colScroll = 0;
  private bagScroll = 0;
  private gridC?: Phaser.GameObjects.Container;
  private detailC?: Phaser.GameObjects.Container;
  private selectedUid: string | null = null;
  private tabBtns: Button[] = [];
  /** Chế độ chọn nhiều để bán / phân giải. */
  private selectMode = false;
  private picked = new Set<string>();
  private confirmArmed: "sell" | "decompose" | null = null;

  constructor() {
    super("Inventory");
  }

  /** Mở từ màn câu cá → bấm Về quay lại đúng khu câu. */
  private back: { scene: string; data?: object } = { scene: "Hub" };

  init(data: { tab?: "bag" | "collection"; back?: { scene: string; data?: object } }) {
    this.tab = data.tab ?? "bag";
    this.back = data.back ?? { scene: "Hub" };
    this.selectMode = false;
    this.picked = new Set();
    this.confirmArmed = null;
    this.page = 0;
    this.selectedUid = null;
  }

  create() {
    this.input.enabled = true;
    fadeIn(this);
    menuBackdrop(this);
    new TopBar(this, { title: "Kho Cá", onBack: () => goTo(this, this.back.scene, this.back.data) });
    this.tabBtns = [
      new Button(this, 110, 116, 190, 50, "🐟 Kho Cá", { color: COLORS.blue, fontSize: 22, onClick: () => this.switchTab("bag") }),
      new Button(this, 310, 116, 190, 50, "📖 Bộ Sưu Tập", { color: COLORS.blue, fontSize: 22, onClick: () => this.switchTab("collection") }),
    ];
    this.render();
  }

  private switchTab(t: "bag" | "collection") {
    this.tab = t;
    this.page = 0;
    this.selectMode = false;
    this.picked.clear();
    this.selectedUid = null;
    this.render();
  }

  private sortedFishes(): OwnedFish[] {
    return [...GameState.save.fishes].sort((a, b) => {
      const fa = FISH_BY_ID.get(a.fishId)!;
      const fb = FISH_BY_ID.get(b.fishId)!;
      return RARITY_ORDER.indexOf(fb.rarity) - RARITY_ORDER.indexOf(fa.rarity) || fishSellPrice(fb, b.weightKg) - fishSellPrice(fa, a.weightKg);
    });
  }

  private render() {
    this.tabBtns[0]!.setColor(this.tab === "bag" ? COLORS.orange : COLORS.blue);
    if (this.tab !== "bag") this.tabBtns[0]!.setText("🐟 Kho Cá");
    this.tabBtns[1]!.setColor(this.tab === "collection" ? COLORS.orange : COLORS.blue);
    this.gridC?.destroy(true);
    const c = this.add.container(0, 0);
    this.gridC = c;
    if (this.tab === "bag") this.renderBag(c);
    else this.renderCollection(c);
  }

  private cell(
    c: Phaser.GameObjects.Container,
    x: number,
    y: number,
    w: number,
    h: number,
    f: FishDef,
    seen: boolean,
    selected: boolean,
    label: string,
    onClick: () => void,
    check?: "on" | "off" | "locked",
    formId?: string,
    stars?: number,
    element?: ElementSet,
    parents?: [string, string],
  ) {
    const g = this.add.graphics();
    const col = hexToInt(FISH_RARITY_COLOR[f.rarity]);
    g.fillStyle(check === "on" ? 0x1b5e20 : selected ? 0x2a5a8a : 0x10294a, 0.95).fillRoundedRect(x, y, w, h, 12);
    g.lineStyle(check === "on" ? 4 : selected ? 4 : 2.5, check === "on" ? 0x69f0ae : seen ? col : 0x455a64).strokeRoundedRect(x, y, w, h, 12);
    c.add(g);
    if (check) {
      const b = this.add.graphics();
      b.fillStyle(check === "on" ? 0x43a047 : check === "locked" ? 0x455a64 : 0xffffff, 1).fillRoundedRect(x + 6, y + 6, 28, 28, 7);
      b.lineStyle(2.5, 0x1b1530).strokeRoundedRect(x + 6, y + 6, 28, 28, 7);
      c.add(b);
      if (check !== "off") c.add(txt(this, x + 20, y + 21, check === "on" ? "✓" : "🔒", check === "on" ? 22 : 14, { align: "center" }).setOrigin(0.5));
    }
    const gm = Math.min(1.12, fishDisplayMult(f, stars));
    c.add(this.add.image(x + w / 2, y + h * 0.42, seen ? fishTextureFor(this, f, formId, stars, parents) : fishSilhouetteTexture(this, f)).setDisplaySize(w * 0.9 * gm, w * 0.56 * gm));
    // huy hiệu nguyên tố (góc phải trên)
    if (seen) c.add(elementBadges(this, x + w - 17, y + 17, element ?? { els: [f.element] }, Math.min(28, w * 0.24)));
    c.add(txt(this, x + w / 2, y + h - 14, label, 13, { align: "center", weight: "700", color: seen ? FISH_RARITY_COLOR[f.rarity] : COLORS.textDim }).setOrigin(0.5));
    const z = this.add.zone(x + w / 2, y + h / 2, w, h).setInteractive({ useHandCursor: true });
    z.on("pointerup", () => {
      Sfx.click();
      onClick();
    });
    c.add(z);
  }

  private renderBag(c: Phaser.GameObjects.Container) {
    const list = this.sortedFishes();
    this.tabBtns[0]!.setText(`🐟 Kho Cá ${list.length}/${ECONOMY.inventoryLimit}`);
    for (const uid of [...this.picked]) if (!list.some((o) => o.uid === uid && !o.locked)) this.picked.delete(uid);
    if (list.length === 0) {
      c.add(txt(this, 430, 380, "Kho cá đang trống.\nHãy ra bến câu vài con nhé!", 30, { align: "center" }).setOrigin(0.5));
      c.add(new Button(this, 430, 500, 260, 72, "Đi câu cá", { color: COLORS.orange, fontSize: 28, onClick: () => goTo(this, "Zone") }));
      this.renderDetail(null);
      return;
    }
    if (!this.selectedUid || !list.some((f) => f.uid === this.selectedUid)) this.selectedUid = list[0]?.uid ?? null;
    // lưới cuộn được (thanh trượt / lăn chuột / vuốt) thay cho lật trang
    const grid = this.add.container(0, 0);
    c.add(grid);
    let area: { dragged: () => boolean } | null = null;
    list.forEach((o, i) => {
      const f = FISH_BY_ID.get(o.fishId)!;
      const x = 24 + (i % 6) * 134;
      const y = 152 + Math.floor(i / 6) * 160;
      const sex = isBreedable(f) ? (fishGender(o) === "m" ? "♂ " : "♀ ") : "";
      const label = `${o.locked ? "🔒" : ""}${f.name}\n${sex}Lv.${o.level} ${isGrowthFish(f) ? `· ${stageName(o.stars)}` : "★".repeat(o.stars)}`;
      if (this.selectMode) {
        const check = o.locked ? "locked" : this.picked.has(o.uid) ? "on" : "off";
        this.cell(grid, x, y, 128, 150, f, true, false, label, () => {
          if (area?.dragged()) return;
          if (o.locked) return toast(this, "Cá đang khóa – mở khóa để chọn bán");
          if (this.picked.has(o.uid)) this.picked.delete(o.uid);
          else this.picked.add(o.uid);
          this.confirmArmed = null;
          this.render();
        }, check, o.form, o.stars, fishElementSet(o, f), o.parents);
      } else {
        this.cell(grid, x, y, 128, 150, f, true, o.uid === this.selectedUid, label, () => {
          if (area?.dragged()) return;
          this.selectedUid = o.uid;
          this.render();
        }, undefined, o.form, o.stars, fishElementSet(o, f), o.parents);
      }
    });
    area = makeScrollArea(this, c, grid, {
      left: 16,
      right: 838,
      top: 146,
      bottom: 712,
      trackX: 832,
      contentH: Math.ceil(list.length / 6) * 160 + 16,
      scroll: this.bagScroll,
      onScroll: (v) => (this.bagScroll = v),
    });
    c.add(
      new Button(this, 560, 116, 190, 50, this.selectMode ? "✕ Thoát chọn" : "☑ Chọn nhiều", {
        color: this.selectMode ? COLORS.red : COLORS.purple,
        fontSize: 20,
        onClick: () => {
          this.selectMode = !this.selectMode;
          this.picked.clear();
          this.confirmArmed = null;
          this.render();
        },
      }),
    );
    if (this.selectMode) {
      this.renderPickPanel(list, list);
      return;
    }
    const commons = list.filter((o) => FISH_BY_ID.get(o.fishId)!.rarity === "common" && !o.locked && o.level === 1 && o.stars === 1);
    const total = commons.reduce((s, o) => s + fishSellPrice(FISH_BY_ID.get(o.fishId)!, o.weightKg), 0);
    const sellAll = new Button(this, 760, 116, 170, 50, `Bán cá Thường (${commons.length})`, {
      color: COLORS.green,
      fontSize: 16,
      disabled: commons.length === 0,
      onClick: () => this.sell(commons.map((o) => o.uid), total),
    });
    c.add(sellAll);
    this.renderDetail(list.find((o) => o.uid === this.selectedUid) ?? null);
  }

  /** Bảng bên phải khi chọn nhiều: tổng giá, chọn nhanh, bán / phân giải hàng loạt. */
  private renderPickPanel(all: OwnedFish[], pageItems: OwnedFish[]) {
    const d = this.detailPanel();
    const picked = all.filter((o) => this.picked.has(o.uid));
    let gold = 0;
    let stones = 0;
    let soul = 0;
    let precious = 0;
    for (const o of picked) {
      const f = FISH_BY_ID.get(o.fishId)!;
      gold += fishSellPrice(f, o.weightKg);
      const v = decomposeValue(f, o);
      stones += v.stones;
      soul += v.soul;
      if (["epic", "legendary", "mythic", "boss"].includes(f.rarity) || o.level > 1 || o.stars > 1) precious++;
    }
    d.add(txt(this, 1058, 130, "☑ Chọn nhiều", 30, { color: COLORS.textGold, align: "center" }).setOrigin(0.5));
    d.add(txt(this, 1058, 176, `Đã chọn ${picked.length} con cá`, 24, { align: "center" }).setOrigin(0.5));
    d.add(
      txt(this, 1058, 236, `Bán được: 🪙 ${formatNum(gold)}\nPhân giải: 🔷 ${formatNum(stones)}${soul ? `   🔮 ${soul}` : ""}`, 21, { align: "center", weight: "700" })
        .setOrigin(0.5)
        .setLineSpacing(6),
    );
    if (precious) d.add(txt(this, 1058, 292, `⚠ Có ${precious} con quý / đã nâng cấp`, 16, { align: "center", color: "#ffab91", weight: "700" }).setOrigin(0.5));
    const pickable = (l: OwnedFish[]) => l.filter((o) => !o.locked).map((o) => o.uid);
    const quick = (x: number, y: number, label: string, fn: () => void) =>
      d.add(new Button(this, x, y, 186, 48, label, { color: COLORS.blue, fontSize: 17, onClick: () => ((this.confirmArmed = null), fn(), this.render()) }));
    quick(962, 344, "Chọn cả trang", () => pickable(pageItems).forEach((u) => this.picked.add(u)));
    quick(1154, 344, "Chọn tất cả", () => pickable(all).forEach((u) => this.picked.add(u)));
    quick(962, 402, "Chọn cá Thường", () =>
      all.filter((o) => !o.locked && FISH_BY_ID.get(o.fishId)!.rarity === "common").forEach((o) => this.picked.add(o.uid)),
    );
    quick(1154, 402, "Bỏ chọn hết", () => this.picked.clear());
    // chọn tất cả TRỪ cá Boss & Thần Thoại (giữ lại cá quý nhất)
    d.add(
      new Button(this, 1058, 458, 378, 46, "Chọn tất cả trừ Boss trở lên", {
        color: COLORS.orange,
        fontSize: 17,
        onClick: () => {
          this.confirmArmed = null;
          all.filter((o) => !o.locked && !["boss", "mythic"].includes(FISH_BY_ID.get(o.fishId)!.rarity)).forEach((o) => this.picked.add(o.uid));
          this.render();
        },
      }),
    );
    const act = (kind: "sell" | "decompose") => {
      const uids = [...this.picked];
      if (!uids.length) return toast(this, "Hãy chọn ít nhất 1 con cá");
      if (precious && this.confirmArmed !== kind) {
        this.confirmArmed = kind;
        this.render();
        return toast(this, `Trong số cá đã chọn có ${precious} con quý hoặc đã nâng cấp. Bấm lần nữa để xác nhận.`);
      }
      this.confirmArmed = null;
      if (kind === "sell") this.sell(uids, gold);
      else {
        const r = GameState.decompose(uids);
        if (!r.ok) return toast(this, r.error, COLORS.red);
        Sfx.coin();
        toast(this, `Đã phân giải ${uids.length} con: +${stones} Đá Nâng Cấp${soul ? `, +${soul} Mảnh Linh Hồn` : ""}`, COLORS.green);
      }
      this.picked.clear();
      this.render();
    };
    d.add(
      new Button(this, 1058, 520, 340, 62, this.confirmArmed === "sell" ? "Bấm lần nữa để bán!" : `💰 Bán ${picked.length} con`, {
        color: COLORS.green,
        fontSize: 24,
        disabled: picked.length === 0,
        onClick: () => act("sell"),
      }),
    );
    d.add(
      new Button(this, 1058, 600, 340, 62, this.confirmArmed === "decompose" ? "Bấm lần nữa để phân giải!" : `🔷 Phân giải ${picked.length} con`, {
        color: COLORS.orange,
        fontSize: 24,
        disabled: picked.length === 0,
        onClick: () => act("decompose"),
      }),
    );
    d.add(txt(this, 1058, 668, "Cá đã khóa 🔒 không thể chọn", 14, { align: "center", color: COLORS.textDim }).setOrigin(0.5));
  }

  private sell(uids: string[], expected: number) {
    const r = GameState.sell(uids);
    if (!r.ok) return toast(this, r.error, COLORS.red);
    Sfx.coin();
    toast(this, `Đã bán ${uids.length} con cá, nhận ${formatNum(r.gold ?? expected)} vàng 🪙`, COLORS.green);
    this.selectedUid = null;
    this.render();
  }

  private renderCollection(c: Phaser.GameObjects.Container) {
    const species = GameState.save.stats.species;
    // cá câu được + cá lai (Đảo Lai Tạo) đã từng nở – 120 dạng lai chỉ hiện khi đã có
    const LIST = FISHES.filter((f) => f.zones.length > 0 || (species[f.id] ?? 0) > 0);
    const seenCount = LIST.filter((f) => (species[f.id] ?? 0) > 0).length;
    c.add(txt(this, 440, 116, `Đã khám phá ${seenCount}/${LIST.length} loài`, 22, { color: COLORS.textGold }).setOrigin(0, 0.5));
    const sel = this.selectedUid && FISH_BY_ID.has(this.selectedUid) ? this.selectedUid : LIST[0]!.id;
    this.selectedUid = sel;
    // vùng lưới cuộn được: lăn chuột, vuốt/kéo, hoặc kéo thanh cuộn bên phải
    const grid = this.add.container(0, 0);
    c.add(grid);
    let area: { dragged: () => boolean } | null = null;
    // PHÂN NHÓM THEO CẤP BẬC (hiếm nhất trước), mỗi nhóm một tiêu đề
    let y0 = 148;
    for (const rar of [...RARITY_ORDER].reverse()) {
      const group = LIST.filter((f) => f.rarity === rar);
      if (!group.length) continue;
      const seenN = group.filter((f) => (species[f.id] ?? 0) > 0).length;
      grid.add(txt(this, 20, y0 + 12, `${FISH_RARITY_LABEL[rar]} · ${seenN}/${group.length}`, 18, { color: FISH_RARITY_COLOR[rar] }).setOrigin(0, 0.5));
      const gl = this.add.graphics();
      gl.lineStyle(2, hexToInt(FISH_RARITY_COLOR[rar]), 0.6).lineBetween(200, y0 + 12, 826, y0 + 12);
      grid.add(gl);
      y0 += 28;
      group.forEach((f, i) => {
        const x = 16 + (i % 8) * 103;
        const y = y0 + Math.floor(i / 8) * 80;
        const seen = (species[f.id] ?? 0) > 0;
        this.cell(grid, x, y, 97, 74, f, seen, f.id === sel, seen ? `×${species[f.id]}` : "???", () => {
          if (area?.dragged()) return;
          this.selectedUid = f.id;
          this.render();
        });
      });
      y0 += Math.ceil(group.length / 8) * 80 + 8;
    }
    area = makeScrollArea(this, c, grid, {
      left: 8,
      right: 848,
      top: 142,
      bottom: 706,
      trackX: 836,
      contentH: y0 - 148 + 12,
      scroll: this.colScroll,
      onScroll: (v) => (this.colScroll = v),
    });
    const f = FISH_BY_ID.get(sel)!;
    this.renderSpecies(f, (species[f.id] ?? 0) > 0);
  }

  private detailPanel() {
    this.detailC?.destroy(true);
    const d = this.add.container(0, 0);
    this.detailC = d;
    d.add(panel(this, 852, 92, 412, 614, 0.95));
    return d;
  }

  private statLines(d: Phaser.GameObjects.Container, f: FishDef, y: number) {
    const lines = [
      `Lực chiến: ${formatNum(fishPower(f))}`,
      `HP ${formatNum(f.hp)} · Công ${f.atk} · Thủ ${f.def} · Tốc ${f.spd}`,
      `Nguyên tố: ${elementName(f.element)} (cá câu ở khu nào mang hệ khu đó)`,
      `Kỹ năng: ${f.skill.name} – ${f.skill.description}`,
      `Khu vực: ${f.zones.map((z) => ZONE_BY_ID.get(z)?.name).join(", ")}`,
    ];
    d.add(txt(this, 876, y, lines.join("\n"), 17, { weight: "700", wrap: 366, color: COLORS.text }).setLineSpacing(4));
  }

  private header(d: Phaser.GameObjects.Container, f: FishDef, seen: boolean, formId?: string, stars?: number, element?: ElementSet, parents?: [string, string]) {
    const col = FISH_RARITY_COLOR[f.rarity];
    const glow = this.add.image(1058, 210, softGlowTexture(this)).setTint(hexToInt(col)).setDisplaySize(380, 260).setAlpha(seen ? 0.3 : 0);
    d.add(glow);
    // cá trưởng thành: Sơ Giai nhỏ → Thánh Giai lớn nhất (kèm hào quang)
    const dm = fishDisplayMult(f, stars) * (stars && fishDisplayMult(f, stars) !== 1 ? 0.88 : 1);
    d.add(this.add.image(1058, 210, seen ? fishTextureFor(this, f, formId, stars, parents) : fishSilhouetteTexture(this, f)).setDisplaySize(330 * dm, 206 * dm));
    d.add(txt(this, 1058, 330, seen ? f.name : "???", 30, { color: col, align: "center" }).setOrigin(0.5));
    d.add(txt(this, 1058, 364, FISH_RARITY_LABEL[f.rarity], 20, { color: col, align: "center" }).setOrigin(0.5));
    // nguyên tố – huy hiệu lớn góc trái trên khung chi tiết
    if (seen) d.add(elementTags(this, 870, 128, element ?? { els: [f.element] }, 44, 20));
  }

  private renderDetail(o: OwnedFish | null) {
    const d = this.detailPanel();
    if (!o) return;
    const f = FISH_BY_ID.get(o.fishId)!;
    this.header(d, f, true, o.form, o.stars, fishElementSet(o, f), o.parents);
    const form = o.form ? FORM_BY_ID.get(o.form) ?? null : null;
    const st = fishStats(f, o.level, o.stars, form, o.formRoll);
    const growth = isGrowthFish(f);
    if (form) {
      d.add(txt(this, 1058, 120, `🧬 ${form.name}`, 22, { color: form.glow, align: "center" }).setOrigin(0.5));
    }
    d.add(
      txt(
        this,
        876,
        388,
        `Cấp ${o.level}/${fishMaxLevel(o.stars, growth)}  ${growth ? `🌱 ${stageName(o.stars)}` : `${"★".repeat(o.stars)}${"☆".repeat(5 - o.stars)}`}   Lực chiến ${formatNum(ownedFishPower(f, o, form))}\nHP ${formatNum(st.hp)} · Công ${st.atk} · Thủ ${st.def} · Tốc ${st.spd}\nHệ ${fishElementSet(o, f).els.map(elementName).join(" · ")}${o.hiddenElement ? ` (+ẩn ${elementName(o.hiddenElement)})` : ""} · ${o.weightKg} kg · ${f.skill.name}`,
        16,
        { weight: "700", wrap: 372 },
      ).setLineSpacing(3),
    );
    // phát triển: cường hoá cấp → đủ cấp tối đa thì tiến hoá sao (cá thường, hợp cá cùng loài)
    // hoặc TRƯỞNG THÀNH lên giai mới (Huyền Thoại/Boss/Thần Thoại – to & đẹp hơn)
    const next = nextFishAction(GameState.save, o, f, FORM_BY_ID);
    const fodder = next.action === "evolve" && !growth ? evolveFodder(GameState.save, o.uid) : null;
    if (next.cost) {
      const err = canAfford(GameState.save, next.cost) ?? (next.action === "evolve" && !growth && !fodder ? `Cần thêm 1 con ${f.name} không khóa` : null);
      const evoHave = next.cost.evo ? ` (có ${evoStonesFor(GameState.save, next.cost.evo.item)})` : "";
      d.add(txt(this, 1058, 482, costText(next.cost) + evoHave + (next.action === "evolve" && !growth ? `  + 1 ${f.name}` : ""), 16, { align: "center", color: err ? "#ff8a80" : COLORS.textGold, wrap: 380 }).setOrigin(0.5));
      const evoLabel = growth ? `🌱 Trưởng thành → ${stageName(o.stars + 1)}` : "Tiến hóa ★ (hợp cá cùng loài)";
      const dev = new Button(this, 1058, 524, 330, 54, next.action === "evolve" ? evoLabel : "Cường hóa +1 cấp", {
        color: next.action === "evolve" && growth ? COLORS.green : COLORS.purple,
        fontSize: 20,
        disabled: !!err,
        onClick: () => {
          const r = GameState.developFish(o.uid);
          if (!r.ok) return toast(this, r.error, COLORS.red);
          Sfx.levelUp();
          if (next.action === "evolve" && growth) this.cameras.main.flash(400, 180, 255, 200);
          const msg = next.action !== "evolve" ? `${f.name} lên cấp ${o.level + 1}!` : growth ? `${f.name} trưởng thành: ${stageName(o.stars + 1)}! To hơn, đẹp hơn, mạnh hơn` : `${f.name} tiến hóa lên ${o.stars + 1} sao!`;
          toast(this, msg, COLORS.green);
          this.render();
        },
      });
      dev.on("disabled-click", () => toast(this, err ?? ""));
      d.add(dev);
    } else if (next.action === "form") {
      // BƯỚC 1: tiến hoá hệ (chọn 1 trong 5 hệ) – xong mới tới 4 giai đoạn trưởng thành
      d.add(txt(this, 1058, 482, "Bước 1: Tiến hoá thành 1 dạng của 5 hệ · sau đó mới trưởng thành 4 giai", 15, { align: "center", color: COLORS.textGold, wrap: 380 }).setOrigin(0.5));
      d.add(
        new Button(this, 1058, 524, 330, 54, "🧬 Tiến hoá hệ", {
          color: COLORS.purple,
          fontSize: 22,
          badge: Object.values(GameState.save.evoItems).some((n) => n > 0) ? "!" : undefined,
          onClick: () => this.formDialog(o),
        }),
      );
    } else d.add(txt(this, 1058, 524, growth ? "✨ THÁNH GIAI – ĐÃ TỐI ĐA ✨" : "★ ĐÃ TỐI ĐA ★", 22, { align: "center", color: COLORS.textGold }).setOrigin(0.5));
    // khóa / bán / phân giải
    d.add(
      new Button(this, 912, 600, 104, 54, o.locked ? "🔓 Mở" : "🔒 Khóa", {
        color: COLORS.blue,
        fontSize: 20,
        onClick: () => {
          GameState.toggleLock(o.uid);
          this.render();
        },
      }),
    );
    const price = fishSellPrice(f, o.weightKg);
    const sell = new Button(this, 1058, 600, 176, 54, `Bán ${formatNum(price)}🪙`, {
      color: COLORS.green,
      fontSize: 20,
      disabled: o.locked,
      onClick: () => this.sell([o.uid], price),
    });
    sell.on("disabled-click", () => toast(this, "Cá đang khóa. Mở khóa để bán."));
    d.add(sell);
    const dv = decomposeValue(f, o);
    const dec = new Button(this, 1058, 662, 330, 54, `Phân giải → 🔷${dv.stones}${dv.soul ? ` 🔮${dv.soul}` : ""}`, {
      color: COLORS.orange,
      fontSize: 20,
      disabled: o.locked,
      onClick: () => {
        const r = GameState.decompose([o.uid]);
        if (!r.ok) return toast(this, r.error, COLORS.red);
        Sfx.coin();
        toast(this, `Phân giải ${f.name}: +${dv.stones} Đá Nâng Cấp${dv.soul ? `, +${dv.soul} Mảnh Linh Hồn` : ""}`, COLORS.green);
        this.selectedUid = null;
        this.render();
      },
    });
    dec.on("disabled-click", () => toast(this, "Cá đang khóa. Mở khóa để phân giải."));
    d.add(dec);
  }

  /** Đột biến cá Boss: chọn vật phẩm → luôn thành công, ra ngẫu nhiên 1 dạng cùng hệ + chỉ số tăng ngẫu nhiên. */
  private formDialog(o: OwnedFish) {
    const f = FISH_BY_ID.get(o.fishId)!;
    const m = modal(this, 1040, 600, `🧬 Tiến hoá hệ – ${f.name}`, () => this.render());
    m.root.add(txt(this, m.x + m.w / 2, m.y + 74, "Chọn 1 trong 5 hệ: tiến hoá CHẮC CHẮN thành công, ra ngẫu nhiên 1 dạng của hệ đó (chỉ số tăng ngẫu nhiên – có thể VƯỢT BẬC). Tiến hoá xong KHÔNG đổi hệ được nữa – tiếp theo là 4 giai đoạn trưởng thành.", 16, { align: "center", weight: "700", color: COLORS.textDim, wrap: 960 }).setOrigin(0.5));
    EVO_ITEMS.filter((it) => (FORMS_BY_ITEM.get(it.id) ?? []).length > 0).forEach((it, i) => {
      const x = m.x + 20 + i * 202;
      const y = m.y + 104;
      const have = GameState.save.evoItems[it.id] ?? 0;
      const variants = FORMS_BY_ITEM.get(it.id) ?? [];
      const g = this.add.graphics();
      g.fillGradientStyle(0x1a1040, 0x1a1040, 0x0a0a1e, 0x0a0a1e, 1).fillRoundedRect(x, y, 192, 420, 16);
      g.lineStyle(3, hexToInt(it.glow), 0.9).strokeRoundedRect(x, y, 192, 420, 16);
      m.root.add(g);
      m.root.add(this.add.image(x + 96, y + 62, "p_spark").setTint(hexToInt(it.glow)).setScale(6).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD));
      m.root.add(this.add.image(x + 96, y + 62, evoItemTexture(this, it.id)).setDisplaySize(110, 110));
      m.root.add(txt(this, x + 96, y + 128, it.name, 19, { color: it.glow, align: "center", wrap: 180 }).setOrigin(0.5));
      m.root.add(txt(this, x + 96, y + 156, "Có thể hóa thành:", 13, { align: "center", weight: "700", color: COLORS.textDim }).setOrigin(0.5));
      variants.forEach((v, k) => {
        m.root.add(this.add.image(x + 40, y + 186 + k * 34, formFishTexture(this, f, v)).setDisplaySize(52, 32));
        m.root.add(txt(this, x + 72, y + 186 + k * 34, v.name, 14, { color: v.glow }).setOrigin(0, 0.5));
      });
      m.root.add(txt(this, x + 96, y + 362, `Có: ${have}`, 17, { align: "center", color: have ? "#b9f6ca" : "#ff8a80" }).setOrigin(0.5));
      const b = new Button(this, x + 96, y + 396, 170, 44, "Tiến hoá 100%", {
        color: COLORS.purple,
        fontSize: 17,
        disabled: have < 1,
        onClick: () => {
          const r = GameState.applyForm(o.uid, it);
          if (!r.ok) return toast(this, r.error, COLORS.red);
          m.close();
          this.time.delayedCall(180, () => this.revealForm(o.uid, r.form!, r.roll!, r.surge ?? null));
        },
      });
      b.on("disabled-click", () => toast(this, `Cần 1 ${it.name} – rơi cực hiếm khi câu cá (Boss ×3)`));
      m.root.add(b);
    });
  }

  /** Màn khoe dạng đột biến mới + hệ số tăng từng chỉ số. */
  private revealForm(uid: string, form: FishFormDef, roll: FormRoll, surge: keyof FormRoll | null) {
    const o = GameState.save.fishes.find((x) => x.uid === uid);
    if (!o) return;
    const f = FISH_BY_ID.get(o.fishId)!;
    Sfx.catchFanfare(true);
    const col = hexToInt(form.glow);
    this.cameras.main.flash(700, (col >> 16) & 255, (col >> 8) & 255, col & 255);
    const m = modal(this, 820, 600, `🧬 ĐỘT BIẾN THÀNH CÔNG!`, () => this.render());
    const cx = m.x + m.w / 2;
    const rays = this.add.container(cx, m.y + 220);
    for (let i = 0; i < 12; i++) rays.add(this.add.image(0, 0, "p_ray").setOrigin(0.5, 0).setAngle(i * 30).setTint(col).setAlpha(0.45).setBlendMode(Phaser.BlendModes.ADD).setScale(0.6));
    this.tweens.add({ targets: rays, angle: 360, duration: 9000, repeat: -1 });
    const img = this.add.image(cx, m.y + 220, formFishTexture(this, f, form)).setDisplaySize(420, 262).setScale(0.1);
    this.tweens.add({ targets: img, scaleX: 420 / 320, scaleY: 262 / 200, duration: 600, ease: "Back.easeOut" });
    m.root.add([rays, img]);
    m.root.add(this.add.particles(cx, m.y + 220, "p_spark", { speed: { min: 150, max: 450 }, lifespan: 1100, scale: { start: 1.4, end: 0 }, tint: [col, 0xffffff], quantity: 50, stopAfter: 50, blendMode: Phaser.BlendModes.ADD }));
    m.root.add(txt(this, cx, m.y + 372, `${f.name} → ${form.name}`, 30, { color: form.glow, align: "center" }).setOrigin(0.5));
    const pct = (k: keyof FormRoll) => Math.round((form.mult[k] - 1) * roll[k] * 100);
    const lines: [keyof FormRoll, string][] = [["hp", "❤ HP"], ["atk", "⚔ Công"], ["def", "🛡 Thủ"]];
    lines.forEach(([k, label], i) => {
      const big = surge === k;
      const t = txt(this, cx - 200 + i * 200, m.y + 430, `${label}\n+${pct(k)}%`, big ? 26 : 22, { align: "center", color: big ? "#ff4081" : roll[k] >= 1.25 ? "#69f0ae" : roll[k] <= 0.95 ? "#ffcc80" : "#ffffff" }).setOrigin(0.5);
      m.root.add(t);
      if (big) this.tweens.add({ targets: t, scale: 1.18, duration: 380, yoyo: true, repeat: -1 });
    });
    m.root.add(txt(this, cx, m.y + 486, `Tốc +${form.spdBonus} · Lực chiến ${formatNum(ownedFishPower(f, o, form))}`, 18, { align: "center", color: COLORS.textGold }).setOrigin(0.5));
    if (surge) {
      const sb = txt(this, cx, m.y + 90, "⚡ ĐỘT BIẾN VƯỢT BẬC! ⚡", 34, { color: "#ff4081", align: "center" }).setOrigin(0.5);
      m.root.add(sb);
      this.tweens.add({ targets: sb, scale: 1.12, duration: 300, yoyo: true, repeat: -1 });
      this.cameras.main.shake(400, 0.015);
    }
    m.root.add(new Button(this, cx, m.y + m.h - 46, 240, 56, "Tuyệt vời!", { color: COLORS.orange, fontSize: 22, onClick: () => m.close() }));
  }

  private renderSpecies(f: FishDef, seen: boolean) {
    const d = this.detailPanel();
    this.header(d, f, seen);
    if (!seen) {
      d.add(txt(this, 1058, 460, `Chưa câu được loài này.\nXuất hiện ở: ${f.zones.map((z) => ZONE_BY_ID.get(z)?.name).join(", ")}`, 18, { align: "center", wrap: 360, weight: "700", color: COLORS.textDim }).setOrigin(0.5));
      return;
    }
    d.add(txt(this, 876, 392, f.description, 16, { weight: "500", wrap: 366, color: COLORS.textDim }));
    this.statLines(d, f, 446);
    // cá Boss / Thần Thoại / Huyền Thoại: xem các giai tiến hoá & các dạng đột biến
    if (isGrowthFish(f)) {
      d.add(new Button(this, 958, 668, 196, 52, "🌱 Các giai tiến hoá", { color: COLORS.green, fontSize: 16, onClick: () => this.showStages(f) }));
      d.add(new Button(this, 1162, 668, 196, 52, "🧬 Các dạng đột biến", { color: COLORS.purple, fontSize: 16, onClick: () => this.showForms(f, EVO_ITEMS[0]!.id) }));
    }
  }

  /** 4 giai trưởng thành của loài: Sơ → Trung → Cao → Thánh. */
  private showStages(f: FishDef) {
    const m = modal(this, 1160, 470, `🌱 ${f.name} – các giai tiến hoá`);
    STAGE_NAMES.forEach((name, i) => {
      const x = m.x + 30 + i * 278;
      const y = m.y + 80;
      const g = this.add.graphics();
      g.fillStyle(0x10294a, 0.95).fillRoundedRect(x, y, 266, 340, 14).lineStyle(3, hexToInt(FISH_RARITY_COLOR[f.rarity])).strokeRoundedRect(x, y, 266, 340, 14);
      m.root.add(g);
      const k = Math.min(1.15, fishDisplayMult(f, i + 1));
      m.root.add(this.add.image(x + 133, y + 140, fishTextureFor(this, f, null, i + 1)).setDisplaySize(250 * k, 156 * k));
      m.root.add(txt(this, x + 133, y + 278, name, 24, { color: ["#b9f6ca", "#80d8ff", "#ea80fc", "#ffd740"][i], align: "center" }).setOrigin(0.5));
      m.root.add(txt(this, x + 133, y + 312, ["Dáng gốc", "Mắt sáng, sừng, gai lưng", "Cánh, giáp, hào quang", "Vương miện, cánh pha lê, ngân hà"][i]!, 14, { align: "center", weight: "700", color: COLORS.textDim }).setOrigin(0.5));
    });
  }

  /** Các dạng đột biến của loài theo từng viên đá: cấp bậc, tỉ lệ, chỉ số chuyên tăng. */
  private showForms(f: FishDef, itemId: string) {
    const m = modal(this, 1200, 620, `🧬 ${f.name} – các dạng đột biến`);
    const items = EVO_ITEMS.filter((it) => (FORMS_BY_ITEM.get(it.id) ?? []).length > 0);
    items.forEach((it, i) =>
      m.root.add(
        new Button(this, m.x + 120 + i * 196, m.y + 92, 186, 44, `${it.icon} ${it.name}`, {
          color: it.id === itemId ? COLORS.orange : COLORS.blue,
          fontSize: 14,
          onClick: () => {
            m.close();
            this.showForms(f, it.id);
          },
        }),
      ),
    );
    const variants = FORMS_BY_ITEM.get(itemId) ?? [];
    const w = Math.min(226, (1140 - (variants.length - 1) * 10) / variants.length);
    variants.forEach((fm, i) => {
      const x = m.x + 30 + i * (w + 10);
      const y = m.y + 130;
      const rk = fm.rank ? FORM_RANK_INFO[fm.rank] : null;
      const g = this.add.graphics();
      g.fillStyle(0x10294a, 0.95).fillRoundedRect(x, y, w, 456, 14).lineStyle(3, hexToInt(rk?.color ?? fm.glow)).strokeRoundedRect(x, y, w, 456, 14);
      m.root.add(g);
      m.root.add(this.add.image(x + w / 2, y + 96, formFishTexture(this, f, fm, 0)).setDisplaySize(w - 12, (w - 12) * 0.625));
      m.root.add(txt(this, x + w / 2, y + 196, fm.name, 21, { align: "center", color: fm.glow }).setOrigin(0.5));
      if (rk) m.root.add(txt(this, x + w / 2, y + 226, `${rk.name} · ${fm.weight}%`, 16, { align: "center", color: rk.color }).setOrigin(0.5));
      const focus = fm.rank === "legend" ? "Toàn diện" : { hp: "Chuyên MÁU", atk: "Chuyên CÔNG", def: "Chuyên THỦ", all: "Cân bằng" }[fm.focus ?? "all"];
      m.root.add(
        txt(this, x + w / 2, y + 330, `${focus}\n\nMáu ×${fm.mult.hp}\nCông ×${fm.mult.atk}\nThủ ×${fm.mult.def}\nTốc +${fm.spdBonus}`, 16, { align: "center", weight: "700" }).setOrigin(0.5),
      );
    });
  }
}
