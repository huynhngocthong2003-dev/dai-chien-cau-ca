import { OUTLINE, rgba } from "./color.ts";

/**
 * Quảng Trường Bến Cảng lúc hoàng hôn (vẽ thủ tục bằng Canvas2D).
 * Nền 1280×720: trời – biển – kè đá có đèn – sân lát gạch phối cảnh – quầy mồi, bảng tin, ghế, chậu cây.
 * Đài phun nước vẽ riêng (drawFountain) để nhân vật đứng sau/trước được.
 */
const W = 1280;
const H = 720;

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function lantern(ctx: CanvasRenderingContext2D, x: number, y: number, col: string) {
  ctx.fillStyle = rgba(col, 0.35);
  ctx.beginPath();
  ctx.arc(x, y + 8, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = col;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y + 8, 8, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#3e2723";
  ctx.fillRect(x - 5, y - 4, 10, 4);
  ctx.fillRect(x - 4, y + 17, 8, 3);
}

function bench(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.5;
  ctx.fillStyle = "#8d5a3b";
  for (let i = 0; i < 3; i++) {
    rr(ctx, x - 60 * s, y - 34 * s + i * 9 * s, 120 * s, 7 * s, 3);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = "#a0693f";
  rr(ctx, x - 64 * s, y - 6 * s, 128 * s, 10 * s, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#37474f";
  ctx.fillRect(x - 54 * s, y + 4 * s, 7 * s, 18 * s);
  ctx.fillRect(x + 47 * s, y + 4 * s, 7 * s, 18 * s);
}

function plant(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, flower: string) {
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.5;
  ctx.fillStyle = "#2e7d32";
  for (const [dx, dy, r] of [[0, -46, 22], [-18, -32, 17], [18, -32, 17], [0, -26, 18]] as const) {
    ctx.beginPath();
    ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = flower;
  for (const [dx, dy] of [[-12, -50], [10, -58], [16, -36], [-20, -32], [2, -40]] as const) {
    ctx.beginPath();
    ctx.arc(x + dx * s, y + dy * s, 5 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#c8693a";
  ctx.beginPath();
  ctx.moveTo(x - 24 * s, y - 16 * s);
  ctx.lineTo(x + 24 * s, y - 16 * s);
  ctx.lineTo(x + 17 * s, y + 14 * s);
  ctx.lineTo(x - 17 * s, y + 14 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function sign(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, text: string, bg: string, size = 22) {
  ctx.fillStyle = bg;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3;
  rr(ctx, x - w / 2, y - 18, w, 36, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#fff8e1";
  ctx.font = `800 ${size}px 'Baloo 2', 'Arial Rounded MT Bold', sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 4;
  ctx.strokeText(text, x, y + 1);
  ctx.fillText(text, x, y + 1);
}

export function drawPlaza(ctx: CanvasRenderingContext2D) {
  // trời hoàng hôn
  const sky = ctx.createLinearGradient(0, 0, 0, 250);
  sky.addColorStop(0, "#3b3f8f");
  sky.addColorStop(0.55, "#e5786d");
  sky.addColorStop(1, "#ffd29a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, 250);
  // mặt trời + mây
  ctx.fillStyle = "rgba(255,236,179,0.35)";
  ctx.beginPath();
  ctx.arc(900, 238, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffe082";
  ctx.beginPath();
  ctx.arc(900, 238, 62, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  for (const [x, y, s] of [[180, 90, 1.2], [520, 60, 0.9], [1120, 110, 1.1], [760, 140, 0.7]] as const) {
    ctx.beginPath();
    for (const [dx, dy, r] of [[0, 0, 22], [26, -12, 26], [56, -2, 20], [80, 6, 15]] as const) ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
    ctx.fill();
  }
  // biển
  const sea = ctx.createLinearGradient(0, 240, 0, 330);
  sea.addColorStop(0, "#f0a37a");
  sea.addColorStop(0.15, "#3f6fb5");
  sea.addColorStop(1, "#1f3f7a");
  ctx.fillStyle = sea;
  ctx.fillRect(0, 240, W, 95);
  ctx.fillStyle = "rgba(255,224,130,0.7)";
  for (let i = 0; i < 26; i++) ctx.fillRect(860 + Math.sin(i * 7.3) * 70, 252 + i * 3, 30 + (i % 4) * 12, 2);
  // đảo xa + thuyền buồm
  ctx.fillStyle = "#5b4a7a";
  ctx.beginPath();
  ctx.moveTo(60, 246);
  ctx.quadraticCurveTo(170, 196, 300, 246);
  ctx.moveTo(420, 248);
  ctx.quadraticCurveTo(480, 220, 560, 248);
  ctx.fill();
  for (const [bx, by, s] of [[640, 262, 1], [1120, 270, 0.8]] as const) {
    ctx.fillStyle = "#4e342e";
    ctx.beginPath();
    ctx.moveTo(bx - 26 * s, by);
    ctx.lineTo(bx + 26 * s, by);
    ctx.lineTo(bx + 18 * s, by + 9 * s);
    ctx.lineTo(bx - 18 * s, by + 9 * s);
    ctx.fill();
    ctx.fillStyle = "#fff3e0";
    ctx.beginPath();
    ctx.moveTo(bx, by - 2);
    ctx.lineTo(bx, by - 40 * s);
    ctx.lineTo(bx + 22 * s, by - 4);
    ctx.fill();
  }
  // kè đá + lan can
  ctx.fillStyle = "#8d7b6a";
  ctx.fillRect(0, 330, W, 40);
  ctx.strokeStyle = rgba(OUTLINE, 0.5);
  ctx.lineWidth = 2;
  for (let x = 0; x < W; x += 64) {
    ctx.strokeRect(x + ((x / 64) % 2) * 0, 330, 64, 20);
    ctx.strokeRect(x - 32, 350, 64, 20);
  }
  ctx.fillStyle = "#6d4c41";
  ctx.fillRect(0, 300, W, 8);
  for (let x = 20; x < W; x += 50) ctx.fillRect(x, 300, 6, 32);
  // sân lát gạch (phối cảnh)
  const floor = ctx.createLinearGradient(0, 370, 0, H);
  floor.addColorStop(0, "#c9a77c");
  floor.addColorStop(1, "#e6c899");
  ctx.fillStyle = floor;
  ctx.fillRect(0, 370, W, H - 370);
  ctx.strokeStyle = "rgba(90,60,30,0.28)";
  ctx.lineWidth = 2;
  let y = 370;
  for (let i = 0; y < H; i++) {
    const gap = 14 + i * 5;
    y += gap;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  for (let i = -14; i <= 14; i++) {
    ctx.beginPath();
    ctx.moveTo(640 + i * 60, 370);
    ctx.lineTo(640 + i * 150, H);
    ctx.stroke();
  }
  // vòng gạch trang trí quanh đài phun nước
  ctx.strokeStyle = "rgba(160,90,50,0.45)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.ellipse(640, 460, 230, 74, 0, 0, Math.PI * 2);
  ctx.stroke();

  // dây đèn lồng
  for (const [x0, x1] of [[0, 420], [860, W]] as const) {
    ctx.strokeStyle = "#3e2723";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0, 150);
    ctx.quadraticCurveTo((x0 + x1) / 2, 210, x1, 150);
    ctx.stroke();
    const cols = ["#ff5252", "#ffd740", "#69f0ae", "#40c4ff", "#ea80fc"];
    for (let k = 1; k < 8; k++) {
      const t = k / 8;
      const lx = x0 + (x1 - x0) * t;
      const ly = (1 - t) * (1 - t) * 150 + 2 * (1 - t) * t * 210 + t * t * 150;
      lantern(ctx, lx, ly, cols[k % cols.length]!);
    }
  }

  // Quầy Mồi Câu (trái)
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3;
  ctx.fillStyle = "#8d5a3b";
  rr(ctx, 70, 300, 250, 100, 8);
  ctx.fill();
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 ? "#fff3e0" : "#e53935";
    ctx.beginPath();
    ctx.moveTo(60 + i * 45, 250);
    ctx.lineTo(105 + i * 45, 250);
    ctx.lineTo(105 + i * 45, 286);
    ctx.quadraticCurveTo(82 + i * 45, 300, 60 + i * 45, 286);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = "#4e342e";
  ctx.fillRect(74, 250, 8, 150);
  ctx.fillRect(308, 250, 8, 150);
  sign(ctx, 195, 232, 190, "🪱 TIỆM MỒI", "#c62828");
  // hũ mồi trên quầy
  for (const [x, c] of [[120, "#ffb74d"], [170, "#81c784"], [220, "#64b5f6"], [270, "#f06292"]] as const) {
    ctx.fillStyle = c;
    rr(ctx, x - 14, 318, 28, 30, 6);
    ctx.fill();
    ctx.stroke();
  }

  // Bảng Tin (phải)
  ctx.fillStyle = "#6d4c41";
  ctx.fillRect(1010, 290, 10, 110);
  ctx.fillRect(1170, 290, 10, 110);
  ctx.fillStyle = "#a1887f";
  rr(ctx, 990, 236, 210, 120, 10);
  ctx.fill();
  ctx.stroke();
  sign(ctx, 1095, 226, 170, "📌 BẢNG TIN", "#1565c0");
  const notes: [number, number, string][] = [[1020, 262, "#fff59d"], [1080, 270, "#b3e5fc"], [1140, 258, "#f8bbd0"], [1040, 312, "#c8e6c9"], [1110, 316, "#ffe0b2"]];
  for (const [x, ny, c] of notes) {
    ctx.fillStyle = c;
    ctx.save();
    ctx.translate(x + 22, ny + 18);
    ctx.rotate(Math.sin(x) * 0.12);
    ctx.fillRect(-22, -18, 44, 36);
    ctx.strokeRect(-22, -18, 44, 36);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    for (let l = 0; l < 3; l++) ctx.fillRect(-15, -9 + l * 8, 30 - l * 6, 3);
    ctx.fillStyle = "#e53935";
    ctx.beginPath();
    ctx.arc(0, -16, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ghế đá + chậu hoa
  bench(ctx, 420, 392, 0.9);
  bench(ctx, 880, 392, 0.9);
  plant(ctx, 40, 640, 1.2, "#ff80ab");
  plant(ctx, 1240, 640, 1.2, "#ffd740");
  plant(ctx, 360, 392, 0.8, "#b388ff");
  plant(ctx, 950, 392, 0.8, "#ff8a80");
}

/** Đài phun nước có tượng Cá Chép vàng phun nước (320×230, gốc ở đáy bồn ≈ y 180). */
export function drawFountain(ctx: CanvasRenderingContext2D) {
  const cx = 160;
  const by = 180;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3;
  // bồn ngoài
  ctx.fillStyle = "#9e9e9e";
  ctx.beginPath();
  ctx.ellipse(cx, by, 150, 46, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#bdbdbd";
  ctx.beginPath();
  ctx.ellipse(cx, by - 12, 150, 44, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const water = ctx.createLinearGradient(0, by - 50, 0, by + 20);
  water.addColorStop(0, "#4fc3f7");
  water.addColorStop(1, "#0277bd");
  ctx.fillStyle = water;
  ctx.beginPath();
  ctx.ellipse(cx, by - 14, 130, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 2;
  for (const r of [40, 70, 100]) {
    ctx.beginPath();
    ctx.ellipse(cx, by - 14, r, r * 0.26, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // trụ
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3;
  ctx.fillStyle = "#a1a1a1";
  rr(ctx, cx - 20, by - 90, 40, 76, 8);
  ctx.fill();
  ctx.stroke();
  // tượng cá chép vàng (đầu chúc lên, phun nước)
  ctx.save();
  ctx.translate(cx, by - 110);
  ctx.rotate(-0.35);
  const gold = ctx.createLinearGradient(-50, -30, 50, 30);
  gold.addColorStop(0, "#fff176");
  gold.addColorStop(0.5, "#ffb300");
  gold.addColorStop(1, "#e65100");
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.ellipse(0, 0, 52, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-44, 0);
  ctx.lineTo(-82, -26);
  ctx.lineTo(-74, 0);
  ctx.lineTo(-82, 26);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(120,60,0,0.6)";
  ctx.lineWidth = 2;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.arc(i * 14, 0, 10, -1, 1);
    ctx.stroke();
  }
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(32, -8, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = OUTLINE;
  ctx.beginPath();
  ctx.arc(34, -8, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // tia nước
  ctx.strokeStyle = "rgba(179,229,252,0.9)";
  ctx.lineWidth = 6;
  for (const dx of [-70, -36, 36, 70]) {
    ctx.beginPath();
    ctx.moveTo(cx + 46, by - 150);
    ctx.quadraticCurveTo(cx + 46 + dx * 0.6, by - 214, cx + dx, by - 22);
    ctx.stroke();
  }
}
