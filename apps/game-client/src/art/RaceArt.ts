import { OUTLINE, rgba } from "./color.ts";

/** Đường đua trên sông/biển: trời + mặt nước (tĩnh), dải đảo xa (cuộn lặp), chướng ngại, cổng đích. */
export function drawRaceSky(ctx: CanvasRenderingContext2D) {
  const sky = ctx.createLinearGradient(0, 0, 0, 330);
  sky.addColorStop(0, "#4fc3f7");
  sky.addColorStop(1, "#e1f5fe");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1280, 330);
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  for (const [x, y, s] of [[160, 80, 1.3], [620, 50, 1], [1040, 100, 1.2]] as const) {
    ctx.beginPath();
    for (const [dx, dy, r] of [[0, 0, 24], [30, -14, 30], [64, -2, 22], [90, 8, 16]] as const) ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
    ctx.fill();
  }
  const sea = ctx.createLinearGradient(0, 330, 0, 720);
  sea.addColorStop(0, "#29b6f6");
  sea.addColorStop(0.4, "#0288d1");
  sea.addColorStop(1, "#01579b");
  ctx.fillStyle = sea;
  ctx.fillRect(0, 330, 1280, 390);
}

/** Dải bờ xa (1280×150) – lặp liền mạch theo chiều ngang. */
export function drawRaceFar(ctx: CanvasRenderingContext2D) {
  const W = 1280;
  ctx.fillStyle = "#66bb6a";
  ctx.beginPath();
  ctx.moveTo(0, 150);
  for (let x = 0; x <= W; x += 10) ctx.lineTo(x, 110 - Math.abs(Math.sin((x / W) * Math.PI * 4)) * 50 - Math.sin((x / W) * Math.PI * 10) * 8);
  ctx.lineTo(W, 150);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgba(OUTLINE, 0.35);
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // cờ đuôi nheo + khán đài nhỏ
  for (let x = 80; x < W; x += 320) {
    ctx.fillStyle = "#8d6e63";
    ctx.fillRect(x, 96, 120, 40);
    ctx.strokeRect(x, 96, 120, 40);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = ["#ef5350", "#ffca28", "#42a5f5", "#ab47bc", "#66bb6a", "#ff7043"][i]!;
      ctx.beginPath();
      ctx.arc(x + 12 + i * 19, 100, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "#5d4037";
    ctx.beginPath();
    ctx.moveTo(x - 10, 70);
    ctx.lineTo(x + 130, 70);
    ctx.stroke();
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = i % 2 ? "#ffeb3b" : "#e53935";
      ctx.beginPath();
      ctx.moveTo(x - 10 + i * 20, 70);
      ctx.lineTo(x + i * 20, 70);
      ctx.lineTo(x - 5 + i * 20, 84);
      ctx.fill();
    }
  }
  ctx.fillStyle = "#e3f2fd";
  ctx.fillRect(0, 140, W, 10);
}

export function drawSeaweed(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3;
  for (const [dx, h, c] of [[-26, 70, "#2e7d32"], [0, 92, "#43a047"], [24, 76, "#388e3c"], [-10, 56, "#66bb6a"], [12, 60, "#1b5e20"]] as const) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(50 + dx - 7, 96);
    ctx.quadraticCurveTo(50 + dx - 22, 96 - h * 0.5, 50 + dx + 4, 96 - h);
    ctx.quadraticCurveTo(50 + dx + 8, 96 - h * 0.5, 50 + dx + 7, 96);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath();
  ctx.ellipse(50, 96, 46, 7, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawRock(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3;
  const g = ctx.createLinearGradient(0, 10, 0, 80);
  g.addColorStop(0, "#b0bec5");
  g.addColorStop(1, "#546e7a");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(8, 78);
  ctx.lineTo(18, 34);
  ctx.lineTo(44, 12);
  ctx.lineTo(74, 22);
  ctx.lineTo(96, 52);
  ctx.lineTo(102, 78);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.moveTo(44, 12);
  ctx.lineTo(52, 50);
  ctx.lineTo(96, 52);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.beginPath();
  ctx.ellipse(55, 80, 56, 8, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawCurrent(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(128,222,234,0.35)";
  ctx.beginPath();
  ctx.ellipse(70, 26, 70, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#e0f7fa";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const x of [22, 58, 94]) {
    ctx.beginPath();
    ctx.moveTo(x, 12);
    ctx.lineTo(x + 18, 26);
    ctx.lineTo(x, 40);
    ctx.stroke();
  }
}

/** Cổng đích caro (160×330). */
export function drawFinish(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3;
  ctx.fillStyle = "#6d4c41";
  ctx.fillRect(10, 30, 14, 300);
  ctx.strokeRect(10, 30, 14, 300);
  ctx.fillRect(136, 30, 14, 300);
  ctx.strokeRect(136, 30, 14, 300);
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 8; c++) {
      ctx.fillStyle = (r + c) % 2 ? "#212121" : "#fafafa";
      ctx.fillRect(10 + c * 17.5, 10 + r * 14, 17.5, 14);
    }
  ctx.strokeRect(10, 10, 140, 42);
  ctx.fillStyle = "#ffeb3b";
  ctx.font = "800 18px 'Baloo 2', sans-serif";
  ctx.textAlign = "center";
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 4;
  ctx.strokeText("ĐÍCH", 80, 74);
  ctx.fillText("ĐÍCH", 80, 74);
}
