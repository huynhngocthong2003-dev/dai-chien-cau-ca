/**
 * Hình Đá Tiến Hoá / thần vật (khung 128×128, tâm 64,64) – vẽ thủ tục, mỗi loại một hình riêng.
 */
import { rgba, shade } from "./color.ts";

const C = 64;

function glowBack(ctx: CanvasRenderingContext2D, col: string, r = 60) {
  const g = ctx.createRadialGradient(C, C, 4, C, C, r);
  g.addColorStop(0, rgba(col, 0.55));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
}

function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

/** Viên đá mài nhiều mặt (dùng cho Sấm Thạch, Thánh Quang, U Minh, Địa Mạch). */
function facetGem(ctx: CanvasRenderingContext2D, light: string, mid: string, dark: string, outline: string) {
  const top = [
    [C - 34, C - 10],
    [C - 18, C - 34],
    [C + 18, C - 34],
    [C + 34, C - 10],
  ];
  const tip: [number, number] = [C, C + 40];
  ctx.lineJoin = "round";
  // các mặt
  const faces: [number[][], string][] = [
    [[top[0]!, top[1]!, [C - 6, C - 10]], light],
    [[top[1]!, top[2]!, [C + 6, C - 10], [C - 6, C - 10]], shade(light, 0.25)],
    [[top[2]!, top[3]!, [C + 6, C - 10]], mid],
    [[top[0]!, [C - 6, C - 10], tip], mid],
    [[[C - 6, C - 10], [C + 6, C - 10], tip], light],
    [[[C + 6, C - 10], top[3]!, tip], dark],
  ];
  for (const [pts, col] of faces) {
    ctx.fillStyle = col;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x!, y!) : ctx.moveTo(x!, y!)));
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = outline;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(top[0]![0]!, top[0]![1]!);
  for (const p of [top[1]!, top[2]!, top[3]!, tip]) ctx.lineTo(p[0]!, p[1]!);
  ctx.closePath();
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = rgba("#ffffff", 0.55);
  ctx.beginPath();
  ctx.moveTo(top[0]![0]!, top[0]![1]!);
  ctx.lineTo(top[3]![0]!, top[3]![1]!);
  ctx.moveTo(C - 6, C - 10);
  ctx.lineTo(tip[0], tip[1]);
  ctx.moveTo(C + 6, C - 10);
  ctx.lineTo(tip[0], tip[1]);
  ctx.stroke();
}

function dragonOrb(ctx: CanvasRenderingContext2D) {
  glowBack(ctx, "#29b6f6");
  const g = ctx.createRadialGradient(C - 12, C - 14, 4, C, C, 40);
  g.addColorStop(0, "#e1f5fe");
  g.addColorStop(0.45, "#29b6f6");
  g.addColorStop(1, "#01579b");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(C, C, 38, 0, Math.PI * 2);
  ctx.fill();
  // rồng cuộn bên trong
  ctx.strokeStyle = "rgba(255,236,140,0.95)";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(C - 22, C + 14);
  ctx.bezierCurveTo(C - 30, C - 10, C - 2, C - 26, C + 10, C - 10);
  ctx.bezierCurveTo(C + 22, C + 6, C + 4, C + 24, C - 8, C + 10);
  ctx.stroke();
  ctx.fillStyle = "#ffe082";
  ctx.beginPath();
  ctx.arc(C - 22, C + 14, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#01334f";
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(C, C, 38, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.ellipse(C - 14, C - 20, 12, 6, -0.6, 0, Math.PI * 2);
  ctx.fill();
}

function lavaCore(ctx: CanvasRenderingContext2D) {
  glowBack(ctx, "#ff3d00");
  const rock = new Path2D();
  rock.moveTo(C - 36, C + 6);
  rock.lineTo(C - 24, C - 28);
  rock.lineTo(C + 6, C - 38);
  rock.lineTo(C + 34, C - 18);
  rock.lineTo(C + 38, C + 16);
  rock.lineTo(C + 14, C + 38);
  rock.lineTo(C - 22, C + 34);
  rock.closePath();
  const g = ctx.createLinearGradient(C, C - 38, C, C + 38);
  g.addColorStop(0, "#5d4037");
  g.addColorStop(1, "#212121");
  ctx.fillStyle = g;
  ctx.fill(rock);
  // vết nứt dung nham
  ctx.save();
  ctx.clip(rock);
  ctx.shadowColor = "#ff9100";
  ctx.shadowBlur = 10;
  ctx.strokeStyle = "#ffab00";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(C - 30, C - 4);
  ctx.lineTo(C - 8, C + 2);
  ctx.lineTo(C + 4, C - 18);
  ctx.lineTo(C + 30, C - 10);
  ctx.moveTo(C - 8, C + 2);
  ctx.lineTo(C + 2, C + 30);
  ctx.moveTo(C + 4, C - 18);
  ctx.lineTo(C - 6, C - 34);
  ctx.stroke();
  const hot = ctx.createRadialGradient(C, C, 2, C, C, 22);
  hot.addColorStop(0, "rgba(255,241,118,0.95)");
  hot.addColorStop(1, "rgba(255,61,0,0)");
  ctx.fillStyle = hot;
  ctx.fillRect(0, 0, 128, 128);
  ctx.restore();
  ctx.strokeStyle = "#1b0a05";
  ctx.lineWidth = 3.5;
  ctx.stroke(rock);
}

function iceCrystal(ctx: CanvasRenderingContext2D) {
  glowBack(ctx, "#80d8ff");
  const shard = (x: number, y: number, w: number, h: number, a: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    const p = new Path2D();
    p.moveTo(0, -h);
    p.lineTo(w, -h * 0.55);
    p.lineTo(w, h * 0.5);
    p.lineTo(0, h * 0.75);
    p.lineTo(-w, h * 0.5);
    p.lineTo(-w, -h * 0.55);
    p.closePath();
    const g = ctx.createLinearGradient(-w, 0, w, 0);
    g.addColorStop(0, "#e1f5fe");
    g.addColorStop(0.5, "#81d4fa");
    g.addColorStop(1, "#4fc3f7");
    ctx.fillStyle = g;
    ctx.fill(p);
    ctx.strokeStyle = "#01579b";
    ctx.lineWidth = 2.5;
    ctx.stroke(p);
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -h);
    ctx.lineTo(0, h * 0.75);
    ctx.stroke();
    ctx.restore();
  };
  shard(C - 22, C + 8, 10, 26, -0.45);
  shard(C + 22, C + 8, 10, 26, 0.45);
  shard(C, C, 14, 40, 0);
}

function thunderStone(ctx: CanvasRenderingContext2D) {
  glowBack(ctx, "#ffee58");
  facetGem(ctx, "#fff59d", "#fdd835", "#f9a825", "#5d4300");
  ctx.shadowColor = "#ffffff";
  ctx.shadowBlur = 8;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(C + 4, C - 30);
  ctx.lineTo(C - 10, C - 2);
  ctx.lineTo(C, C - 2);
  ctx.lineTo(C - 6, C + 24);
  ctx.lineTo(C + 12, C - 8);
  ctx.lineTo(C + 2, C - 8);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
}

function phoenixFeather(ctx: CanvasRenderingContext2D) {
  glowBack(ctx, "#ff4081");
  ctx.save();
  ctx.translate(C, C);
  ctx.rotate(-0.6);
  const vane = new Path2D();
  vane.moveTo(0, 44);
  vane.bezierCurveTo(-26, 20, -22, -30, 0, -46);
  vane.bezierCurveTo(22, -30, 26, 20, 0, 44);
  const g = ctx.createLinearGradient(0, -46, 0, 44);
  g.addColorStop(0, "#fff59d");
  g.addColorStop(0.35, "#ff9100");
  g.addColorStop(0.75, "#ff1744");
  g.addColorStop(1, "#880e4f");
  ctx.fillStyle = g;
  ctx.fill(vane);
  ctx.strokeStyle = "#4a0d1f";
  ctx.lineWidth = 3;
  ctx.stroke(vane);
  // mắt lông
  ctx.fillStyle = "#1de9b6";
  ctx.beginPath();
  ctx.ellipse(0, -18, 8, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#304ffe";
  ctx.beginPath();
  ctx.ellipse(0, -18, 4, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#fff8e1";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, 54);
  ctx.lineTo(0, -40);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 1.2;
  for (let i = -30; i < 36; i += 8) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(-16, i - 10);
    ctx.moveTo(0, i);
    ctx.lineTo(16, i - 10);
    ctx.stroke();
  }
  ctx.restore();
}

const DRAW: Record<string, (ctx: CanvasRenderingContext2D) => void> = {
  e_ngoc_long_hon: dragonOrb,
  e_loi_dung_nham: lavaCore,
  e_tinh_the_bang_ha: iceCrystal,
  e_sam_thach: thunderStone,
  e_long_phuong_than: phoenixFeather,
  e_u_minh_thach: (ctx) => {
    glowBack(ctx, "#b388ff");
    facetGem(ctx, "#b388ff", "#6a1b9a", "#311b92", "#12002e");
  },
  e_thanh_quang_thach: (ctx) => {
    glowBack(ctx, "#fff59d", 64);
    facetGem(ctx, "#ffffff", "#fff59d", "#ffd54f", "#7a5c00");
  },
  e_dia_mach_thach: (ctx) => {
    glowBack(ctx, "#a5d6a7");
    facetGem(ctx, "#bcaaa4", "#8d6e63", "#5d4037", "#2e1a12");
    ctx.strokeStyle = "#69f0ae";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(C - 20, C - 16);
    ctx.lineTo(C - 4, C + 2);
    ctx.lineTo(C + 10, C - 14);
    ctx.moveTo(C - 4, C + 2);
    ctx.lineTo(C, C + 26);
    ctx.stroke();
  },
};

export function drawEvoItem(ctx: CanvasRenderingContext2D, id: string) {
  (DRAW[id] ?? thunderStone)(ctx);
  sparkle(ctx, 98, 30, 7);
  sparkle(ctx, 30, 98, 4);
}
