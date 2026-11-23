/**
 * HƯỚNG DẪN TÂN THỦ – lớp phủ dùng chung cho mọi màn:
 *  - làm tối màn hình, chừa "lỗ" sáng ở đúng chỗ cần bấm (chặn bấm chỗ khác nếu `block`),
 *  - mũi tên nhún chỉ vào chỗ cần bấm, khung lời dẫn, nút "Tiếp" (nếu có),
 *  - nút "Bỏ qua hướng dẫn" (bấm 2 lần để chắc chắn; bỏ qua thì không nhận quà).
 * Logic bước / phần thưởng nằm ở packages/shared/tutorial.ts; ở đây chỉ hiển thị.
 */
import Phaser from "phaser";
import { GameState } from "../state/GameState.ts";
import { Button, toast, txt } from "./widgets.ts";
import { COLORS } from "./theme.ts";
import { DESIGN_H, DESIGN_W, extraX } from "./wide.ts";

export interface GuideRect {
  /** Tâm vùng cần bấm. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GuideOpts {
  title?: string;
  text: string;
  target?: GuideRect;
  /** Chặn bấm mọi chỗ ngoài vùng `target` (mặc định: có khi có target). */
  block?: boolean;
  next?: { label: string; onClick: () => void };
  /** Tâm khung lời dẫn (mặc định tự đặt trên / dưới vùng cần bấm). */
  at?: { x: number; y: number };
  /** Hiện nút bỏ qua (mặc định có). */
  skip?: boolean;
  /** Chỉ chỉ vào vùng (giới thiệu), không cho bấm xuyên qua – đi tiếp bằng nút "Tiếp". */
  lockTarget?: boolean;
  /** Khung lời dẫn không chặn bấm (dùng khi đang câu cá: cả màn hình là vùng bấm). */
  passive?: boolean;
}

const DEPTH = 950;

export function tutorialGuide(scene: Phaser.Scene, o: GuideOpts): Phaser.GameObjects.Container {
  const root = scene.add.container(0, 0).setDepth(DEPTH);
  const ex = extraX(scene);
  const L = -ex;
  const R = DESIGN_W + ex;
  const block = o.block ?? !!o.target;
  if (o.target) {
    const t = o.target;
    const pad = 10;
    const x0 = t.x - t.w / 2 - pad;
    const y0 = t.y - t.h / 2 - pad;
    const x1 = t.x + t.w / 2 + pad;
    const y1 = t.y + t.h / 2 + pad;
    // 4 tấm tối quanh "lỗ"; khi chặn bấm thì 4 tấm này nuốt mọi cú chạm ngoài lỗ
    const parts: [number, number, number, number][] = [
      [L, 0, R - L, y0],
      [L, y1, R - L, DESIGN_H - y1],
      [L, y0, x0 - L, y1 - y0],
      [x1, y0, R - x1, y1 - y0],
    ];
    for (const [x, y, w, h] of parts) {
      if (w <= 0 || h <= 0) continue;
      const r = scene.add.rectangle(x, y, w, h, 0x000000, 0.62).setOrigin(0);
      if (block) r.setInteractive();
      root.add(r);
    }
    if (o.lockTarget) root.add(scene.add.rectangle(x0, y0, x1 - x0, y1 - y0, 0x000000, 0.001).setOrigin(0).setInteractive());
    const hl = scene.add.graphics();
    hl.lineStyle(5, 0xffeb3b, 1).strokeRoundedRect(x0, y0, x1 - x0, y1 - y0, 16);
    root.add(hl);
    scene.tweens.add({ targets: hl, alpha: 0.35, duration: 520, yoyo: true, repeat: -1 });
    // mũi tên chỉ vào chỗ cần bấm
    const above = t.y > 200;
    const ay = above ? y0 - 34 : y1 + 34;
    const arrow = txt(scene, t.x, ay, above ? "👇" : "👆", 44, { align: "center", stroke: 0 }).setOrigin(0.5);
    root.add(arrow);
    scene.tweens.add({ targets: arrow, y: ay + (above ? -14 : 14), duration: 420, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  } else if (!o.passive) {
    const dim = scene.add.rectangle(L, 0, R - L, DESIGN_H, 0x000000, 0.55).setOrigin(0).setInteractive();
    root.add(dim);
  }

  // ---- khung lời dẫn
  const BW = 560;
  const lines = txt(scene, 0, 0, o.text, 19, { weight: "700", wrap: BW - 40, align: "center" }).setOrigin(0.5, 0);
  const extra = (o.title ? 40 : 0) + (o.next || o.skip !== false ? 64 : 10);
  const BH = Math.max(110, lines.height + extra + 30);
  let cx = o.at?.x ?? (o.target ? Phaser.Math.Clamp(o.target.x, BW / 2 + 20, DESIGN_W - BW / 2 - 20) : DESIGN_W / 2);
  let cy = o.at?.y ?? (o.target ? (o.target.y > DESIGN_H / 2 ? o.target.y - o.target.h / 2 - 90 - BH / 2 : o.target.y + o.target.h / 2 + 90 + BH / 2) : DESIGN_H / 2);
  cx = Phaser.Math.Clamp(cx, BW / 2 + 10, DESIGN_W - BW / 2 - 10);
  cy = Phaser.Math.Clamp(cy, BH / 2 + 80, DESIGN_H - BH / 2 - 10);
  const box = scene.add.container(cx, cy);
  const g = scene.add.graphics();
  g.fillStyle(0x0d2340, 0.97).fillRoundedRect(-BW / 2, -BH / 2, BW, BH, 18);
  g.lineStyle(4, 0xffd54f, 1).strokeRoundedRect(-BW / 2, -BH / 2, BW, BH, 18);
  box.add(g);
  if (!o.passive) box.add(scene.add.zone(0, 0, BW, BH).setInteractive()); // bấm vào khung không lọt xuống dưới
  let y = -BH / 2 + 18;
  if (o.title) {
    box.add(txt(scene, 0, y + 14, o.title, 24, { color: COLORS.textGold, align: "center" }).setOrigin(0.5));
    y += 40;
  }
  lines.setPosition(0, y);
  box.add(lines);
  const by = BH / 2 - 34;
  if (o.next) {
    const n = o.next;
    box.add(new Button(scene, o.skip === false ? 0 : 110, by, 200, 46, n.label, { color: COLORS.green, fontSize: 20, onClick: () => n.onClick() }));
  }
  if (o.skip !== false) {
    let armed = false;
    const sk = new Button(scene, o.next ? -150 : 0, by, 200, 40, "Bỏ qua hướng dẫn", {
      color: COLORS.grey,
      fontSize: 15,
      onClick: () => {
        if (!armed) {
          armed = true;
          sk.setText("Bấm lần nữa để bỏ qua");
          return;
        }
        GameState.tutorialFinish(true);
        root.destroy(true);
        toast(scene, "Đã bỏ qua hướng dẫn – bạn được chơi tự do!", COLORS.blue);
        scene.scene.restart();
      },
    });
    box.add(sk);
  }
  root.add(box);
  root.setAlpha(0);
  scene.tweens.add({ targets: root, alpha: 1, duration: 180 });
  return root;
}
