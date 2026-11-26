import Phaser from "phaser";
import { applyMatchResult, completeTutorialStep, heroById, rewardText, type Gender, type MatchResult } from "@hero-arena/core";
import { addHeroImage, breathe, evolutionScale } from "../heroArt.ts";
import { getSave, now, persist } from "../state.ts";
import { button, H, panel, text, W } from "../ui.ts";

interface ResultData extends MatchResult {
  heroId: string;
  gender: Gender;
  branchId: string | null;
  evolutionId: string | null;
}

export class ResultScene extends Phaser.Scene {
  constructor() {
    super("Result");
  }

  create(d: ResultData): void {
    const save = getSave();
    // thưởng đi qua sổ cái (txId = mã trận → không nhận trùng)
    const reward = applyMatchResult(save, d, now());
    if (d.placement <= 10) completeTutorialStep(save, "claim_last_hero_victory");
    persist();

    this.add.rectangle(0, 0, W, H, 0x0d1320).setOrigin(0);
    const bg = this.add.image(W / 2, H / 2, "lobby_map").setAlpha(0.25);
    bg.setScale(Math.max(W / bg.width, H / bg.height));
    panel(this, 240, 70, 800, 560);
    text(this, W / 2, 96, d.won ? "🏆 THE LAST HERO!" : `BỊ LOẠI · HẠNG #${d.placement}`, 52, d.won ? "#ffe14a" : "#ff9a8a", 800).setOrigin(0.5, 0);
    breathe(this, addHeroImage(this, 420, 480, d.heroId, d.branchId, d.evolutionId ?? null, 1.6 * (evolutionScale(d.level) / evolutionScale(1))));
    const hero = heroById(d.heroId);
    const br = hero?.branches.find((b) => b.id === d.branchId);
    const evo = br?.evolutions.find((e) => e.id === d.evolutionId);
    text(this, 560, 200, `${hero?.nameVi ?? ""} · ${evo?.name ?? br?.name ?? hero?.baseNameVi ?? ""}`, 28, "#ffe08a");
    text(this, 560, 246, `Hạng: ${d.placement}/20\nHạ gục: ${d.kills}\nCấp đạt được: ${d.level}\nBình máu kho đã dùng: ${d.storePotionsUsed}`, 24, "#e8e0d0", 500);
    text(this, 560, 420, reward ? `Phần thưởng:\n${rewardText(reward)}` : "Trận này đã được tính thưởng.", 24, "#8aff9a").setWordWrapWidth(440);
    button(this, 470, 580, 300, 70, "⚔ Chơi lại", () => this.scene.start("Arena", { heroId: d.heroId, gender: d.gender }), 0xc8461e, 28);
    button(this, 810, 580, 300, 70, "Về sảnh", () => this.scene.start("Lobby"), 0x2f5f8f, 28);
  }
}
