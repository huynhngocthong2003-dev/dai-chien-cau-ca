import Phaser from "phaser";
import { BREEDING_RECIPES, FISH_BY_ID, breedTierOf } from "@dccc/game-data";
import {
  BREED_TIERS,
  HARVEST_CYCLE_MS,
  SLOT_UNLOCK,
  breedingOf,
  eggColorsFor,
  eggLookOf,
  habitatFishes,
  isBreedable,
  recipeFor,
  speedupCost,
  type BreedRecipe,
  type OwnedFish,
} from "@dccc/shared";
import { GameState } from "../state/GameState.ts";
import { breedEggTexture, fishDisplayMult, fishTextureFor, habitatMapTexture } from "../art/textures.ts";
import { HABITAT } from "../art/BreedArt.ts";
import { hexToInt } from "../art/color.ts";
import { Bar, Button, fadeIn, formatNum, goTo, modal, panel, toast, txt } from "../ui/widgets.ts";
import { TopBar } from "../ui/TopBar.ts";
import { COLORS } from "../ui/theme.ts";
import { menuBackdrop } from "../ui/backdrop.ts";
import { fishPickCard, fishPower } from "../ui/fishPickCard.ts";
import { Sfx } from "../audio/Sfx.ts";
import { elementTags, fishElementSet } from "../ui/element.ts";

type Mode = "map" | "breed";
/** Góc trái trên của vùng bản đồ trên màn hình. */
const MX = 20;
const MY = 150;
const POOL = { cx: MX + HABITAT.pool.cx, cy: MY + HABITAT.pool.cy, rx: HABITAT.pool.rx, ry: HABITAT.pool.ry };
const CAVE = { x: MX + HABITAT.cave.x, y: MY + HABITAT.cave.y };
/** Số cá vẽ tối đa trong bể (cá còn lại vẫn được thu hoạch). */
const MAX_SWIMMERS = 24;

interface Swimmer {
  uid: string;
  img: Phaser.GameObjects.Image;
  coin: Phaser.GameObjects.Container;
  tx: number;
  ty: number;
  speed: number;
  base: number;
}

const fmtTime = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const x = s % 60;
  return (h ? `${h}:${String(m).padStart(2, "0")}` : `${m}`) + ":" + String(x).padStart(2, "0");
};

/**
 * ĐẢO LAI TẠO: bể nuôi thả cá Boss (thu hoạch vàng) + hang ấp trứng (đếm ngược, tăng tốc, ấp nở)
 * và mục Lai Tạo riêng (chọn bố mẹ, xem trước tỷ lệ, đặt trứng). Mọi thay đổi qua GameState → packages/shared/breeding.ts.
 */
export class BreedingScene extends Phaser.Scene {
  private mode: Mode = "map";
  private pick: [string | null, string | null] = [null, null];
  private page = 0;
  private body?: Phaser.GameObjects.Container;
  private tabs: Button[] = [];
  private swimmers: Swimmer[] = [];
  private caveEggs: Phaser.GameObjects.Image[] = [];
  private caveText?: Phaser.GameObjects.Text;
  private bubbles?: Phaser.GameObjects.Graphics;
  private bubbleList: { x: number; y: number; r: number; v: number }[] = [];
  private hatchModal: { close: () => void; refresh: () => void } | null = null;
  private revealing = false;

  constructor() {
    super("Breeding");
  }

  init(data: { mode?: Mode; pick?: [string | null, string | null] }) {
    this.mode = data.mode ?? "map";
    if (data.pick) this.pick = data.pick;
    this.page = 0;
    this.swimmers = [];
    this.caveEggs = [];
    this.hatchModal = null;
    this.revealing = false;
  }

  create() {
    fadeIn(this);
    menuBackdrop(this);
    new TopBar(this, { title: "Đảo Lai Tạo", onBack: () => goTo(this, "Hub") });
    const defs: [Mode, string][] = [
      ["map", "🐠 Bể Nuôi & Hang Ấp"],
      ["breed", "💞 Lai Tạo"],
    ];
    this.tabs = defs.map(
      ([m, label], i) =>
        new Button(this, 144 + i * 266, 116, 256, 50, label, {
          color: COLORS.blue,
          fontSize: 18,
          onClick: () => this.setMode(m),
        }),
    );
    // cá Boss mới vào bể: bắt đầu đếm chu kỳ thu hoạch
    GameState.habitatInit();
    // mặc định chọn sẵn cặp đầu tiên người chơi có đủ
    if (!this.pick[0] && !this.pick[1]) this.pick = this.firstOwnedPair();
    this.render();
    this.time.addEvent({ delay: 500, loop: true, callback: () => this.tick() });
  }

  private setMode(m: Mode) {
    this.mode = m;
    this.render();
  }

  private firstOwnedPair(): [string | null, string | null] {
    for (const r of BREEDING_RECIPES) {
      if (!r.parents) continue;
      const a = GameState.save.fishes.find((f) => f.fishId === r.parents![0]);
      const b = GameState.save.fishes.find((f) => f.fishId === r.parents![1] && f !== a);
      if (a && b) return [a.uid, b.uid];
    }
    // không có cặp đặc biệt: 2 cá Boss mạnh nhất (lai theo hệ)
    const top = GameState.save.fishes.filter((f) => isBreedable(FISH_BY_ID.get(f.fishId))).sort((a, b) => fishPower(b) - fishPower(a));
    return [top[0]?.uid ?? null, top[1]?.uid ?? null];
  }

  private render() {
    this.tabs.forEach((b, i) => b.setColor((["map", "breed"] as Mode[])[i] === this.mode ? COLORS.orange : COLORS.blue));
    this.body?.destroy(true);
    this.swimmers = [];
    this.caveEggs = [];
    this.caveText = undefined;
    this.bubbles = undefined;
    const c = this.add.container(0, 0);
    this.body = c;
    if (this.mode === "map") this.renderMap(c);
    else this.renderBreed(c);
  }

  // ======================================================================== BẢN ĐỒ
  private renderMap(c: Phaser.GameObjects.Container) {
    c.add(this.add.image(MX, MY, habitatMapTexture(this)).setOrigin(0));
    // bong bóng
    this.bubbles = this.add.graphics();
    c.add(this.bubbles);
    this.bubbleList = Array.from({ length: 26 }, () => ({ x: POOL.cx + (Math.random() - 0.5) * POOL.rx * 1.6, y: POOL.cy + Math.random() * POOL.ry, r: 2 + Math.random() * 5, v: 12 + Math.random() * 22 }));
    // nhãn
    c.add(this.label("🐠 Bể Nuôi Thả", POOL.cx, MY + 26));
    c.add(this.label("🥚 Hang Ấp Trứng", CAVE.x, CAVE.y - 196));
    // cá bơi
    const fish = habitatFishes(GameState.save, FISH_BY_ID).sort((a, b) => fishPower(b) - fishPower(a));
    if (!fish.length) {
      c.add(txt(this, POOL.cx, POOL.cy, "Bể nuôi đang trống.\nCâu cá Boss / Thần Thoại – chúng sẽ bơi ở đây\nvà cho vàng mỗi 30 phút!", 22, { align: "center" }).setOrigin(0.5));
    }
    for (const o of fish.slice(0, MAX_SWIMMERS)) this.addSwimmer(c, o);
    if (fish.length > MAX_SWIMMERS) c.add(txt(this, POOL.cx, POOL.cy + POOL.ry - 6, `+${fish.length - MAX_SWIMMERS} con khác đang lặn sâu`, 15, { align: "center", weight: "700" }).setOrigin(0.5));
    // hang ấp: trứng + trạng thái, bấm để mở
    const caveZone = this.add.zone(CAVE.x, CAVE.y + 20, 290, 360).setInteractive({ useHandCursor: true });
    caveZone.on("pointerup", () => this.openHatch());
    c.add(caveZone);
    const st = breedingOf(GameState.save);
    const eggs = st.slots.filter((s) => s.egg);
    eggs.forEach((sl, k) => {
      const r = BREEDING_RECIPES.find((x) => x.id === sl.egg!.recipeId);
      if (!r) return;
      const img = this.add.image(CAVE.x + (k - (eggs.length - 1) / 2) * 58, CAVE.y + 112, breedEggTexture(this, eggLookOf(sl.egg!, r), 0, 0.3)).setDisplaySize(56, 61);
      img.setData("end", sl.egg!.end);
      this.caveEggs.push(img);
      c.add(img);
    });
    this.caveText = txt(this, CAVE.x, CAVE.y + 184, "", 20, { align: "center" }).setOrigin(0.5);
    c.add(this.caveText);
    // nút
    c.add(new Button(this, 1150, 676, 210, 52, "🪙 Thu hoạch tất cả", { color: COLORS.green, fontSize: 18, onClick: () => this.harvest() }));
    c.add(new Button(this, 922, 676, 200, 52, "🥚 Hang Ấp Trứng", { color: COLORS.orange, fontSize: 18, onClick: () => this.openHatch() }));
    this.tick();
  }

  private label(text: string, x: number, y: number) {
    const t = txt(this, x, y, text, 22, { color: "#16223f", stroke: 0, shadow: false }).setOrigin(0.5);
    const g = this.add.graphics();
    const w = t.width + 34;
    g.fillStyle(0x000000, 0.25).fillRoundedRect(x - w / 2, y - 14, w, 36, 18);
    g.fillStyle(0xfff8e8, 1).fillRoundedRect(x - w / 2, y - 18, w, 36, 18);
    g.lineStyle(3.5, 0x16223f).strokeRoundedRect(x - w / 2, y - 18, w, 36, 18);
    return this.add.container(0, 0, [g, t]);
  }

  private randomInPool() {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * 0.72;
    return { x: POOL.cx + Math.cos(a) * POOL.rx * r, y: POOL.cy + Math.sin(a) * POOL.ry * r };
  }

  private addSwimmer(c: Phaser.GameObjects.Container, o: OwnedFish, from?: { x: number; y: number }) {
    const def = FISH_BY_ID.get(o.fishId);
    if (!def) return;
    const tier = BREED_TIERS[breedTierOf(o.fishId)];
    const p = from ?? this.randomInPool();
    const k = tier.scale * Math.min(1.15, fishDisplayMult(def, o.stars));
    const img = this.add.image(p.x, p.y, fishTextureFor(this, def, o.form, o.stars)).setDisplaySize(190 * k, 119 * k);
    img.setInteractive({ useHandCursor: true, pixelPerfect: false });
    img.on("pointerup", () => this.openInfo(o));
    const cg = this.add.graphics();
    cg.fillStyle(0xffc22e, 1).fillCircle(0, 0, 17).lineStyle(3.5, 0x16223f).strokeCircle(0, 0, 17);
    const coin = this.add.container(p.x, p.y - 50, [cg, txt(this, 0, 1, "$", 18, { color: "#16223f", stroke: 0, shadow: false }).setOrigin(0.5)]).setSize(40, 40).setVisible(false);
    coin.setInteractive({ useHandCursor: true });
    coin.on("pointerup", () => this.harvest([o.uid]));
    const t = this.randomInPool();
    const sw: Swimmer = { uid: o.uid, img, coin, tx: t.x, ty: t.y, speed: (0.6 + (tier.scale - 1)) * (from ? 3 : 1), base: 119 * k };
    this.swimmers.push(sw);
    c.add([img, coin]);
    return sw;
  }

  override update(time: number) {
    if (this.mode !== "map") return;
    const t = time / 1000;
    for (const s of this.swimmers) {
      const dx = s.tx - s.img.x;
      const dy = s.ty - s.img.y;
      const d = Math.hypot(dx, dy);
      if (d < 6) {
        const p = this.randomInPool();
        s.tx = p.x;
        s.ty = p.y;
        s.speed = Math.min(s.speed, 0.6 + (s.base / 119 - 1));
      } else {
        s.img.x += (dx / d) * s.speed;
        s.img.y += (dy / d) * s.speed + Math.sin(t * 2 + s.img.x * 0.01) * 0.15;
        if (Math.abs(dx) > 2) s.img.setFlipX(dx < 0);
      }
      s.coin.setPosition(s.img.x, s.img.y - s.base * 0.62 + Math.sin(t * 4 + s.img.x) * 4);
    }
    this.swimmers.sort((a, b) => a.img.y - b.img.y).forEach((s, i) => s.img.setDepth(10 + i));
    // bong bóng
    if (this.bubbles) {
      this.bubbles.clear().lineStyle(2, 0xe0f7ff, 0.7);
      for (const b of this.bubbleList) {
        b.y -= b.v / 60;
        if (b.y < POOL.cy - POOL.ry + 20) {
          b.y = POOL.cy + POOL.ry - 20;
          b.x = POOL.cx + (Math.random() - 0.5) * POOL.rx * 1.6;
        }
        this.bubbles.strokeCircle(b.x + Math.sin(t * 2 + b.r) * 4, b.y, b.r);
      }
    }
    // trứng sẵn sàng thì rung
    for (const e of this.caveEggs) e.setRotation((e.getData("end") as number) <= Date.now() ? Math.sin(t * 14) * 0.12 : 0);
  }

  /** Cập nhật đồng xu thu hoạch, trạng thái hang, bảng ấp đang mở. */
  private tick() {
    const st = breedingOf(GameState.save);
    const now = Date.now();
    for (const s of this.swimmers) s.coin.setVisible((st.harvestAt[s.uid] ?? Infinity) <= now).setDepth(60);
    if (this.caveText) {
      const eggs = st.slots.filter((x) => x.egg).map((x) => x.egg!);
      const ready = eggs.filter((e) => e.end <= now).length;
      const soon = Math.min(...eggs.filter((e) => e.end > now).map((e) => e.end - now));
      const open = st.slots.filter((x) => x.open).length;
      this.caveText
        .setText(ready ? `✨ ${ready} trứng sẵn sàng nở!` : eggs.length ? `⏱ ${fmtTime(soon)}` : `Trống · ${open}/3 ổ mở`)
        .setColor(ready ? "#fff59d" : "#ffffff");
    }
    this.hatchModal?.refresh();
  }

  private harvest(uids?: string[]) {
    const r = GameState.harvestHabitat(uids);
    if (!r.ok) return toast(this, r.error, COLORS.red);
    if (!r.gold) return toast(this, uids ? "Chưa đủ chu kỳ thu hoạch" : "Chưa có cá nào đủ chu kỳ thu hoạch (30 phút)");
    Sfx.coin?.();
    toast(this, `🪙 Thu hoạch +${formatNum(r.gold)} vàng từ ${r.count} con cá`, COLORS.green);
    this.tick();
  }

  // ======================================================================== THÔNG TIN CÁ
  private openInfo(o: OwnedFish) {
    const def = FISH_BY_ID.get(o.fishId);
    if (!def) return;
    const tierId = breedTierOf(o.fishId);
    const tier = BREED_TIERS[tierId];
    const m = modal(this, 860, 440, def.name);
    m.root.add(this.add.image(m.x + 220, m.y + 200, fishTextureFor(this, def, o.form, o.stars)).setDisplaySize(380, 238));
    m.root.add(this.tierTag(m.x + 220, m.y + 340, tierId));
    m.root.add(elementTags(this, m.x + 440, m.y + 60, fishElementSet(o, def), 30, 17));
    const next = (breedingOf(GameState.save).harvestAt[o.uid] ?? Date.now() + HARVEST_CYCLE_MS) - Date.now();
    const lines = [
      `Lv.${o.level} · ⚔ ${formatNum(fishPower(o))}`,
      `Kích thước trong bể: ×${tier.scale.toFixed(2)}`,
      `Thu hoạch: ${tier.yieldGold} vàng / 30 phút`,
      next <= 0 ? "🪙 Đã sẵn sàng thu hoạch!" : `Thu hoạch sau: ${fmtTime(next)}`,
      "",
      def.description,
    ];
    m.root.add(txt(this, m.x + 440, m.y + 92, lines.join("\n"), 18, { weight: "700", wrap: 390 }).setLineSpacing(5));
    (["Đặt làm Bố", "Đặt làm Mẹ"] as const).forEach((label, i) =>
      m.root.add(
        new Button(this, m.x + 540 + i * 210, m.y + 384, 196, 56, `💞 ${label}`, {
          color: COLORS.purple,
          fontSize: 19,
          onClick: () => {
            this.pick[i] = o.uid;
            if (this.pick[1 - i] === o.uid) this.pick[1 - i] = null;
            m.close();
            this.setMode("breed");
          },
        }),
      ),
    );
  }

  private tierTag(x: number, y: number, tierId: keyof typeof BREED_TIERS) {
    const tier = BREED_TIERS[tierId];
    const t = txt(this, 0, 0, tier.name, 15, { stroke: 0, shadow: false }).setOrigin(0.5);
    const g = this.add.graphics();
    const w = t.width + 22;
    g.fillStyle(hexToInt(tier.color), 1).fillRoundedRect(-w / 2, -13, w, 26, 13).lineStyle(2.5, 0x16223f).strokeRoundedRect(-w / 2, -13, w, 26, 13);
    return this.add.container(x, y, [g, t]);
  }

  // ======================================================================== LAI TẠO
  private renderBreed(c: Phaser.GameObjects.Container) {
    c.add(panel(this, 20, 150, 820, 556, 0.95));
    // công thức đã biết → bấm để tự chọn cặp
    c.add(txt(this, 40, 168, "⭐ Công thức đặc biệt (mọi cặp cá Boss khác lai theo HỆ của bố mẹ – 28 dòng):", 15, { weight: "700", color: COLORS.textDim }));
    BREEDING_RECIPES.filter((r) => r.parents).forEach((r, i) => {
      const [a, b] = r.parents!.map((p) => FISH_BY_ID.get(p)?.name ?? p);
      c.add(
        new Button(this, 256 + i * 392, 210, 380, 44, `${a} + ${b}`, {
          color: COLORS.blue,
          fontSize: 14,
          onClick: () => {
            const fa = GameState.save.fishes.find((f) => f.fishId === r.parents![0]);
            const fb = GameState.save.fishes.find((f) => f.fishId === r.parents![1] && f !== fa);
            if (!fa || !fb) return toast(this, `Cần có cả ${a} và ${b} (cá Boss câu ở các khu)`, COLORS.red);
            this.pick = [fa.uid, fb.uid];
            this.render();
          },
        }),
      );
    });
    // chọn bố mẹ từ cá Boss trở lên
    const list = GameState.save.fishes.filter((f) => isBreedable(FISH_BY_ID.get(f.fishId))).sort((a, b) => fishPower(b) - fishPower(a));
    const per = 6;
    const pages = Math.max(1, Math.ceil(list.length / per));
    this.page = Math.min(this.page, pages - 1);
    c.add(txt(this, 40, 240, `Chọn cá bố mẹ – chỉ cá từ bậc Boss trở lên (${list.length} con)`, 15, { weight: "700", color: COLORS.textDim }));
    if (!list.length) c.add(txt(this, 430, 330, "Chưa có cá Boss nào. Hãy săn Boss ở các khu câu!", 20, { align: "center" }).setOrigin(0.5));
    list.slice(this.page * per, this.page * per + per).forEach((o, i) => {
      const idx = this.pick.indexOf(o.uid);
      fishPickCard(this, c, 40 + i * 132, 264, 124, 138, o, () => {
        if (idx >= 0) this.pick[idx] = null;
        else if (!this.pick[0]) this.pick[0] = o.uid;
        else if (!this.pick[1]) this.pick[1] = o.uid;
        else this.pick[1] = o.uid;
        this.render();
      }, idx === 0 ? "B" : idx === 1 ? "M" : undefined);
    });
    if (pages > 1) {
      c.add(new Button(this, 720, 240, 50, 30, "◀", { color: COLORS.blue, fontSize: 15, disabled: this.page === 0, onClick: () => ((this.page -= 1), this.render()) }));
      c.add(new Button(this, 780, 240, 50, 30, "▶", { color: COLORS.blue, fontSize: 15, disabled: this.page >= pages - 1, onClick: () => ((this.page += 1), this.render()) }));
    }
    // 2 ô bố mẹ
    for (let i = 0; i < 2; i++) {
      const x = 40 + i * 300;
      const o = this.pick[i] ? GameState.save.fishes.find((f) => f.uid === this.pick[i]) : undefined;
      c.add(txt(this, x + 140, 424, i ? "MẸ" : "BỐ", 16, { align: "center", color: COLORS.textDim }).setOrigin(0.5));
      if (o) fishPickCard(this, c, x, 440, 280, 250, o, () => ((this.pick[i] = null), this.render()), i ? "M" : "B");
      else {
        const g = this.add.graphics();
        g.fillStyle(0x0a1628, 0.7).fillRoundedRect(x, 440, 280, 250, 14).lineStyle(3, 0x5fb3ff, 0.6).strokeRoundedRect(x, 440, 280, 250, 14);
        c.add(g);
        c.add(txt(this, x + 140, 565, "Chạm cá ở trên để chọn", 17, { align: "center", color: COLORS.textDim }).setOrigin(0.5));
      }
    }
    c.add(txt(this, 330, 565, "+", 44, { align: "center" }).setOrigin(0.5));
    // trứng + bảng tỷ lệ
    const a = this.pick[0] ? GameState.save.fishes.find((f) => f.uid === this.pick[0]) : undefined;
    const b = this.pick[1] ? GameState.save.fishes.find((f) => f.uid === this.pick[1]) : undefined;
    const recipe = a && b ? recipeFor(a.fishId, b.fishId, BREEDING_RECIPES, FISH_BY_ID) : null;
    if (recipe && a && b) c.add(this.add.image(760, 548, breedEggTexture(this, { name: recipe.egg.name, ...eggColorsFor(FISH_BY_ID.get(a.fishId), FISH_BY_ID.get(b.fishId), recipe.egg) }, 0, 0.2)).setDisplaySize(100, 108));
    c.add(txt(this, 760, 630, recipe ? `${recipe.egg.name}\n⏱ ${recipe.hatchMinutes} phút` : a && b ? "Cặp này chưa\ncó công thức" : "Chọn đủ\n2 cá", 15, { align: "center", weight: "700" }).setOrigin(0.5));
    this.renderResults(c, recipe);
  }

  private renderResults(c: Phaser.GameObjects.Container, recipe: BreedRecipe | null) {
    c.add(panel(this, 852, 150, 412, 556, 0.95));
    c.add(txt(this, 1058, 172, recipe?.title ? `Xem trước · ${recipe.title}` : "Xem trước kết quả", 21, { color: COLORS.textGold, align: "center" }).setOrigin(0.5));
    if (!recipe) {
      c.add(txt(this, 1058, 400, "Chọn 2 cá Boss theo một công thức lai\nđể xem các con có thể nở ra.", 18, { align: "center", wrap: 360 }).setOrigin(0.5));
    } else {
      recipe.results.forEach((r, i) => {
        const def = FISH_BY_ID.get(r.fish)!;
        const tierId = breedTierOf(r.fish);
        const y = 214 + i * 96;
        const g = this.add.graphics();
        g.fillStyle(0x0a1628, 0.9).fillRoundedRect(868, y, 380, 88, 12).lineStyle(3, hexToInt(BREED_TIERS[tierId].color)).strokeRoundedRect(868, y, 380, 88, 12);
        c.add(g);
        c.add(this.add.image(930, y + 44, fishTextureFor(this, def, null, 1)).setDisplaySize(118, 74));
        c.add(txt(this, 996, y + 18, def.name, 15, { weight: "800", wrap: 190 }));
        c.add(this.tierTag(1050, y + 66, tierId));
        c.add(txt(this, 1236, y + 44, `${r.pct}%`, 26, { align: "right", color: COLORS.textGold }).setOrigin(1, 0.5));
      });
    }
    const st = breedingOf(GameState.save);
    const free = st.slots.findIndex((s) => s.open && !s.egg);
    const go = new Button(this, 1058, 650, 340, 70, "💞 LAI TẠO", { color: COLORS.green, fontSize: 30, disabled: !recipe || free < 0 });
    go.on("disabled-click", () => toast(this, !recipe ? "Hãy chọn 2 cá Boss theo đúng công thức lai" : "Hang ấp trứng đã đầy – ấp nở hoặc mở thêm ổ"));
    go.on("pointerup", () => {
      if (!recipe || free < 0) return;
      const r = GameState.breedStart([this.pick[0]!, this.pick[1]!]);
      if (!r.ok) return toast(this, r.error, COLORS.red);
      Sfx.levelUp();
      toast(this, `🥚 ${recipe.egg.name} đã vào hang ấp (ổ ${r.slot + 1})`, COLORS.green);
      this.setMode("map");
      this.openHatch();
    });
    c.add(go);
    if (recipe && free < 0) c.add(txt(this, 1058, 600, "Hang ấp trứng đã đầy", 16, { align: "center", color: "#ff8a80" }).setOrigin(0.5));
  }

  // ======================================================================== HANG ẤP TRỨNG
  private openHatch() {
    if (this.hatchModal || this.revealing) return;
    const m = modal(this, 1020, 520, "🥚 Hang Ấp Trứng", () => (this.hatchModal = null));
    const holder = this.add.container(0, 0);
    m.root.add(holder);
    let key = "";
    const timers: { t: Phaser.GameObjects.Text; bar: Bar; sp?: Button; slot: number }[] = [];
    const build = () => {
      holder.removeAll(true);
      timers.length = 0;
      const st = breedingOf(GameState.save);
      st.slots.forEach((slot, i) => {
        const x = m.x + 30 + i * 326;
        const y = m.y + 76;
        const g = this.add.graphics();
        g.fillStyle(slot.open ? 0x1a3d66 : 0x37404f, 1).fillRoundedRect(x, y, 310, 410, 16).lineStyle(3, 0x16223f).strokeRoundedRect(x, y, 310, 410, 16);
        holder.add(g);
        holder.add(txt(this, x + 155, y + 22, `Ổ ấp ${i + 1}`, 18, { align: "center", color: COLORS.textDim }).setOrigin(0.5));
        if (!slot.open) {
          const cost = SLOT_UNLOCK[i]!;
          holder.add(txt(this, x + 155, y + 170, "🔒", 64, { align: "center" }).setOrigin(0.5));
          holder.add(
            new Button(this, x + 155, y + 340, 260, 58, `Mở khoá · ${"gold" in cost ? `${formatNum(cost.gold)} 🪙` : `${cost.diamonds} 💎`}`, {
              color: COLORS.orange,
              fontSize: 19,
              onClick: () => {
                const r = GameState.breedUnlockSlot(i);
                if (!r.ok) return toast(this, r.error, COLORS.red);
                Sfx.levelUp();
                toast(this, `Đã mở ổ ấp ${i + 1}`, COLORS.green);
                key = "";
                refresh();
              },
            }),
          );
        } else if (!slot.egg) {
          holder.add(txt(this, x + 155, y + 170, "Ổ trống", 26, { align: "center", color: COLORS.textDim }).setOrigin(0.5));
          holder.add(
            new Button(this, x + 155, y + 340, 230, 56, "💞 Đi lai tạo", {
              color: COLORS.purple,
              fontSize: 20,
              onClick: () => {
                m.close();
                this.setMode("breed");
              },
            }),
          );
        } else {
          const egg = slot.egg;
          const recipe = BREEDING_RECIPES.find((r) => r.id === egg.recipeId);
          if (recipe) holder.add(this.add.image(x + 155, y + 130, breedEggTexture(this, eggLookOf(egg, recipe), 0, 0.3)).setDisplaySize(130, 140));
          holder.add(txt(this, x + 155, y + 222, recipe?.egg.name ?? "Trứng", 18, { align: "center" }).setOrigin(0.5));
          const t = txt(this, x + 155, y + 256, "", 28, { align: "center", color: COLORS.textGold }).setOrigin(0.5);
          const bar = new Bar(this, x + 30, y + 282, 250, 16, COLORS.gold, "");
          holder.add([t, bar]);
          const ready = egg.end <= Date.now();
          if (ready) {
            holder.add(
              new Button(this, x + 155, y + 350, 250, 64, "✨ ẤP NỞ", {
                color: COLORS.green,
                fontSize: 26,
                onClick: () => {
                  m.close();
                  this.hatch(i);
                },
              }),
            );
            timers.push({ t, bar, slot: i });
          } else {
            const sp = new Button(this, x + 155, y + 350, 260, 60, "", {
              color: COLORS.orange,
              fontSize: 20,
              onClick: () => {
                const r = GameState.breedSpeedup(i);
                if (!r.ok) return toast(this, r.error, COLORS.red);
                toast(this, `⚡ Tăng tốc: −${r.cost} 💎`, COLORS.green);
                key = "";
                refresh();
              },
            });
            holder.add(sp);
            timers.push({ t, bar, sp, slot: i });
          }
        }
      });
    };
    const refresh = () => {
      const st = breedingOf(GameState.save);
      const now = Date.now();
      // dựng lại khi trạng thái ổ đổi (mở khoá / có trứng / trứng vừa nở được)
      const k = st.slots.map((s) => `${s.open}|${s.egg?.id ?? ""}|${s.egg && s.egg.end <= now}`).join(",");
      if (k !== key) {
        key = k;
        build();
      }
      for (const tm of timers) {
        const egg = st.slots[tm.slot]?.egg;
        if (!egg) continue;
        const left = egg.end - now;
        tm.t.setText(left > 0 ? fmtTime(left) : "Đã sẵn sàng!");
        tm.bar.set(Math.min(1, (egg.end - egg.start - Math.max(0, left)) / (egg.end - egg.start)));
        tm.sp?.label.setText(`⚡ Tăng tốc · ${speedupCost(egg, now)} 💎`);
      }
    };
    this.hatchModal = { close: m.close, refresh };
    refresh();
  }

  // ======================================================================== ẤP NỞ
  private hatch(slot: number) {
    const egg = breedingOf(GameState.save).slots[slot]?.egg;
    const recipe = egg && BREEDING_RECIPES.find((r) => r.id === egg.recipeId);
    if (!egg || !recipe) return;
    const r = GameState.breedHatch(slot);
    if (!r.ok) return toast(this, r.error, COLORS.red);
    const def = FISH_BY_ID.get(r.fish.fishId)!;
    const tierId = breedTierOf(def.id);
    const rare = tierId === "recessive";
    this.revealing = true;
    const look = eggLookOf(egg, recipe);
    const root = this.add.container(0, 0).setDepth(2000);
    const W = this.scale.width + 200;
    const dim = this.add.rectangle(640, 360, W, 760, 0x040a1e, 0.88).setInteractive();
    root.add(dim);
    const eggImg = this.add.image(640, 360, breedEggTexture(this, look, 0, 0.4)).setDisplaySize(220, 238);
    root.add(eggImg);
    Sfx.bite();
    // các bước chạy theo ĐỒNG HỒ THẬT (máy yếu / khung hình thấp vẫn đúng nhịp)
    const at = (ms: number, fn: () => void) => window.setTimeout(() => root.active && fn(), ms);
    // 1) rung + nứt dần
    this.tweens.add({ targets: eggImg, angle: { from: -6, to: 6 }, duration: 70, yoyo: true, repeat: 14, ease: "Sine.easeInOut" });
    at(700, () => eggImg.setTexture(breedEggTexture(this, look, 0.45, 0.6)));
    at(1400, () => eggImg.setTexture(breedEggTexture(this, look, 1, 1)));
    // 2) vỡ: chớp sáng + mảnh vỏ
    at(2100, () => {
      eggImg.destroy();
      const flash = this.add.rectangle(640, 360, W, 760, rare ? 0xa855f7 : 0xffffe6, 1);
      root.add(flash);
      this.tweens.add({ targets: flash, alpha: 0, duration: 600, onComplete: () => flash.destroy() });
      if (rare) {
        this.cameras.main.shake(900, 0.012);
        const gold = this.add.rectangle(640, 360, W, 760, 0xfbbf24, 0.8);
        root.add(gold);
        this.tweens.add({ targets: gold, alpha: 0, duration: 260, yoyo: true, repeat: 2, delay: 200, onComplete: () => gold.destroy() });
      }
      for (let p = 0; p < 10; p++) {
        const a = (p / 10) * Math.PI * 2;
        const shard = this.add.ellipse(640, 360, 44, 30, hexToInt(p % 2 ? look.a : look.b)).setStrokeStyle(4, 0x16223f);
        root.add(shard);
        this.tweens.add({ targets: shard, x: 640 + Math.cos(a) * 420, y: 360 + Math.sin(a) * 300, angle: 360, alpha: 0, duration: 800, ease: "Cubic.easeOut", onComplete: () => shard.destroy() });
      }
      // 3) cá xuất hiện
      const rays = this.add.graphics();
      root.add(rays);
      const ray = (tt: number) => {
        rays.clear();
        for (let i = 0; i < 12; i++) {
          const a = tt + (i / 12) * Math.PI * 2;
          rays.fillStyle(rare ? (i % 2 ? 0xa855f7 : 0xfbbf24) : 0xfff9c4, rare ? 0.35 : 0.2);
          rays.fillTriangle(640, 330, 640 + Math.cos(a - 0.07) * 700, 330 + Math.sin(a - 0.07) * 700, 640 + Math.cos(a + 0.07) * 700, 330 + Math.sin(a + 0.07) * 700);
        }
      };
      const spin = this.time.addEvent({ delay: 30, loop: true, callback: () => ray(this.time.now / 1500) });
      const fishImg = this.add.image(640, 320, fishTextureFor(this, def, null, 1)).setDisplaySize(520, 325).setScale(0.1);
      root.add(fishImg);
      this.tweens.add({ targets: fishImg, scaleX: 520 / fishImg.width, scaleY: 325 / fishImg.height, duration: 600, ease: "Back.easeOut" });
      if (rare) {
        const banner = txt(this, 640, 96, "⚡ THỨC TỈNH GEN LẶN CỔ ĐẠI! ⚡", 40, { align: "center", color: "#fff8d6" }).setOrigin(0.5).setScale(0.3);
        const bg = this.add.graphics();
        bg.fillStyle(0x4c1d95, 1).fillRoundedRect(250, 60, 780, 72, 18).lineStyle(4, 0xffe08a).strokeRoundedRect(250, 60, 780, 72, 18);
        root.add([bg, banner]);
        this.tweens.add({ targets: banner, scale: 1, duration: 500, ease: "Back.easeOut" });
        Sfx.levelUp();
      } else Sfx.levelUp();
      root.add(txt(this, 640, 530, def.name, 38, { align: "center" }).setOrigin(0.5));
      root.add(this.tierTag(640, 578, tierId));
      const es = fishElementSet(r.fish, def);
      const tags = elementTags(this, 0, 0, es, 30, 17);
      tags.setPosition(640 - tags.getBounds().width / 2, 476);
      root.add(tags);
      root.add(txt(this, 640, 618, def.description, 17, { align: "center", wrap: 760, weight: "700" }).setOrigin(0.5));
      root.add(
        new Button(this, 640, 676, 300, 58, "🐠 Thả vào Bể Nuôi", {
          color: COLORS.green,
          fontSize: 22,
          onClick: () => {
            spin.remove();
            root.destroy(true);
            this.revealing = false;
            this.mode = "map";
            this.render();
            // cá mới bơi từ hang vào bể
            const sw = this.swimmers.find((s) => s.uid === r.fish.uid);
            if (sw) {
              sw.img.setPosition(CAVE.x - 60, CAVE.y + 110);
              sw.tx = POOL.cx + 180;
              sw.ty = POOL.cy;
              sw.speed = 3;
            } else if (this.body) this.addSwimmer(this.body, r.fish, { x: CAVE.x - 60, y: CAVE.y + 110 });
            toast(this, `${def.name} đã vào Bể Nuôi Thả!`, COLORS.green);
          },
        }),
      );
    });
  }
}
