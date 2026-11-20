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

/** Cá mập tuần tra (150×90): vây lưng nhô lên mặt nước + thân mờ dưới nước. */
export function drawShark(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(55,71,79,0.45)";
  ctx.beginPath();
  ctx.ellipse(75, 64, 66, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3;
  const g = ctx.createLinearGradient(0, 10, 0, 62);
  g.addColorStop(0, "#90a4ae");
  g.addColorStop(1, "#455a64");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(48, 60);
  ctx.quadraticCurveTo(70, 30, 92, 6);
  ctx.quadraticCurveTo(98, 34, 110, 60);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.ellipse(80, 62, 50, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // mắt + răng dưới nước
  ctx.fillStyle = "#ff1744";
  ctx.beginPath();
  ctx.arc(128, 68, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(130 + i * 4, 74);
    ctx.lineTo(132 + i * 4, 80);
    ctx.lineTo(134 + i * 4, 74);
    ctx.fill();
  }
}

/** Khúc gỗ trôi (140×56). */
export function drawLog(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3;
  const g = ctx.createLinearGradient(0, 10, 0, 44);
  g.addColorStop(0, "#a1887f");
  g.addColorStop(1, "#5d4037");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(14, 12, 112, 30, 15);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#d7ccc8";
  ctx.beginPath();
  ctx.ellipse(118, 27, 10, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#8d6e63";
  ctx.lineWidth = 2;
  for (const r of [4, 8]) {
    ctx.beginPath();
    ctx.ellipse(118, 27, r * 0.6, r, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  for (const x of [34, 60, 86]) {
    ctx.beginPath();
    ctx.moveTo(x, 16);
    ctx.lineTo(x + 8, 38);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.beginPath();
  ctx.ellipse(70, 44, 66, 7, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Sứa điện (80×96). */
export function drawJelly(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(234,128,252,0.25)";
  ctx.beginPath();
  ctx.arc(40, 34, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ce93d8";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  for (const x of [22, 34, 46, 58]) {
    ctx.beginPath();
    ctx.moveTo(x, 40);
    ctx.quadraticCurveTo(x - 8, 62, x + 2, 90);
    ctx.stroke();
  }
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3;
  const g = ctx.createRadialGradient(36, 22, 4, 40, 32, 30);
  g.addColorStop(0, "#fce4ec");
  g.addColorStop(1, "#ab47bc");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(40, 40, 28, Math.PI, 0);
  ctx.quadraticCurveTo(40, 50, 12, 40);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#fff59d";
  ctx.font = "800 20px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("⚡", 40, 34);
}

/** Xoáy nước (130×60) – xoay bằng tween. */
export function drawWhirl(ctx: CanvasRenderingContext2D) {
  ctx.translate(65, 30);
  ctx.scale(1, 0.42);
  const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 62);
  g.addColorStop(0, "#0d47a1");
  g.addColorStop(0.6, "#1976d2");
  g.addColorStop(1, "rgba(129,212,250,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 62, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 5;
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 3; a += 0.15) {
      const r = 6 + a * 5.5;
      const ang = a + (k * Math.PI * 2) / 3;
      const px = Math.cos(ang) * r;
      const py = Math.sin(ang) * r;
      if (a === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
}

// ------------------------------------------------------------------ khung cảnh theo bản đồ / chặng
export type FarStyle =
  | "hills"
  | "mangrove"
  | "cliffs"
  | "coral"
  | "palms"
  | "trench"
  | "glacier"
  | "snow"
  | "peaks"
  | "basalt"
  | "volcano"
  | "lava"
  | "moonrocks"
  | "storm"
  | "wrecks";
export type Weather = "none" | "leaves" | "bubbles" | "snow" | "ash" | "rain" | "embers" | "spray";
export interface RaceTheme {
  sky: [string, string];
  sea: [string, string];
  far: FarStyle;
  farCol: [string, string];
  sun?: string;
  moon?: boolean;
  stars?: boolean;
  aurora?: boolean;
  weather: Weather;
  rockTint?: number;
  logTint?: number;
  /** Cột phun: dung nham hay sét. */
  strike?: "lava" | "lightning";
  /** Màu vệt sóng trên mặt nước. */
  foam?: number;
}

export const RACE_THEMES: Record<string, [RaceTheme, RaceTheme, RaceTheme]> = {
  song_que: [
    { sky: ["#4fc3f7", "#e1f5fe"], sea: ["#29b6f6", "#01579b"], far: "hills", farCol: ["#66bb6a", "#2e7d32"], sun: "#fff59d", weather: "leaves" },
    { sky: ["#81c784", "#dcedc8"], sea: ["#4db6ac", "#00695c"], far: "mangrove", farCol: ["#2e7d32", "#1b5e20"], weather: "leaves", logTint: 0x8d6e63 },
    { sky: ["#90a4ae", "#eceff1"], sea: ["#4fc3f7", "#0d47a1"], far: "cliffs", farCol: ["#8d6e63", "#4e342e"], weather: "spray", rockTint: 0x9e9e9e },
  ],
  ran_san_ho: [
    { sky: ["#00e5ff", "#e0f7fa"], sea: ["#1de9b6", "#00838f"], far: "coral", farCol: ["#ff8a80", "#f06292"], sun: "#fff9c4", weather: "bubbles", rockTint: 0xff8a80 },
    { sky: ["#ff7043", "#ffe0b2"], sea: ["#ff8a65", "#4a148c"], far: "palms", farCol: ["#6d4c41", "#3e2723"], sun: "#ffab40", weather: "none", rockTint: 0xf48fb1 },
    { sky: ["#0d1b3e", "#1a237e"], sea: ["#283593", "#060b26"], far: "trench", farCol: ["#1a237e", "#000051"], stars: true, weather: "bubbles", rockTint: 0x5c6bc0, foam: 0x7986cb },
  ],
  bang_ha: [
    { sky: ["#b3e5fc", "#ffffff"], sea: ["#81d4fa", "#0277bd"], far: "glacier", farCol: ["#e1f5fe", "#81d4fa"], sun: "#ffffff", weather: "snow", rockTint: 0xe1f5fe, logTint: 0xe3f2fd },
    { sky: ["#cfd8dc", "#eceff1"], sea: ["#90a4ae", "#37474f"], far: "snow", farCol: ["#eceff1", "#b0bec5"], weather: "snow", rockTint: 0xeceff1, logTint: 0xeceff1 },
    { sky: ["#0b1a3a", "#1b3a5a"], sea: ["#0d47a1", "#020c26"], far: "peaks", farCol: ["#263238", "#102027"], stars: true, aurora: true, weather: "snow", rockTint: 0xb3e5fc, logTint: 0xb3e5fc, foam: 0x80deea },
  ],
  nui_lua: [
    { sky: ["#ffab91", "#ffe0b2"], sea: ["#4e6a8a", "#1c2833"], far: "basalt", farCol: ["#455a64", "#212121"], sun: "#ffccbc", weather: "embers", rockTint: 0x546e7a, logTint: 0x5d4037, strike: "lava" },
    { sky: ["#5d4037", "#8d6e63"], sea: ["#4e342e", "#1b0000"], far: "volcano", farCol: ["#3e2723", "#1b0000"], weather: "ash", rockTint: 0x4e342e, logTint: 0x3e2723, strike: "lava" },
    { sky: ["#b71c1c", "#ff6f00"], sea: ["#bf360c", "#3e0000"], far: "lava", farCol: ["#212121", "#000000"], weather: "embers", rockTint: 0x37474f, logTint: 0x212121, strike: "lava", foam: 0xffab40 },
  ],
  than_thoai: [
    { sky: ["#0d1b3e", "#283593"], sea: ["#1a237e", "#000033"], far: "moonrocks", farCol: ["#1a237e", "#0d0d2b"], moon: true, stars: true, weather: "none", rockTint: 0x7986cb, foam: 0x9fa8da, strike: "lightning" },
    { sky: ["#263238", "#455a64"], sea: ["#37474f", "#0d1117"], far: "storm", farCol: ["#212121", "#000000"], weather: "rain", rockTint: 0x546e7a, strike: "lightning" },
    { sky: ["#1a0033", "#4a148c"], sea: ["#311b92", "#0a0014"], far: "wrecks", farCol: ["#212121", "#0a0014"], stars: true, weather: "bubbles", rockTint: 0x7e57c2, foam: 0xb388ff, strike: "lightning" },
  ],
};

export function drawThemeSky(ctx: CanvasRenderingContext2D, t: RaceTheme) {
  const sky = ctx.createLinearGradient(0, 0, 0, 330);
  sky.addColorStop(0, t.sky[0]);
  sky.addColorStop(1, t.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1280, 330);
  if (t.stars) {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (let i = 0; i < 90; i++) ctx.fillRect((i * 337) % 1280, (i * 151) % 280, i % 7 === 0 ? 3 : 2, i % 7 === 0 ? 3 : 2);
  }
  if (t.aurora) {
    for (const [c, y] of [["rgba(105,240,174,0.35)", 70], ["rgba(124,77,255,0.3)", 120], ["rgba(64,196,255,0.3)", 160]] as const) {
      ctx.strokeStyle = c;
      ctx.lineWidth = 34;
      ctx.beginPath();
      for (let x = -20; x <= 1300; x += 20) ctx.lineTo(x, y + Math.sin(x / 140) * 30);
      ctx.stroke();
    }
  }
  if (t.sun) {
    ctx.fillStyle = t.sun;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(1000, 110, 90, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(1000, 110, 50, 0, Math.PI * 2);
    ctx.fill();
  }
  if (t.moon) {
    ctx.fillStyle = "#fffde7";
    ctx.shadowColor = "#fff9c4";
    ctx.shadowBlur = 40;
    ctx.beginPath();
    ctx.arc(980, 100, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    for (const [x, y, r] of [[965, 90, 9], [995, 115, 7], [990, 82, 5]] as const) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (t.weather === "rain" || t.far === "storm") {
    ctx.fillStyle = "rgba(33,33,33,0.6)";
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      for (const [dx, dy, r] of [[0, 0, 50], [50, -20, 60], [110, 0, 50]] as const) ctx.arc(i * 170 + dx, 50 + (i % 3) * 25 + dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const sea = ctx.createLinearGradient(0, 330, 0, 720);
  sea.addColorStop(0, t.sea[0]);
  sea.addColorStop(1, t.sea[1]);
  ctx.fillStyle = sea;
  ctx.fillRect(0, 330, 1280, 390);
}

/** Dải cảnh xa 1280×150, lặp liền mạch theo chiều ngang. */
export function drawThemeFar(ctx: CanvasRenderingContext2D, t: RaceTheme) {
  const W = 1280;
  const [c0, c1] = t.farCol;
  const g = ctx.createLinearGradient(0, 20, 0, 150);
  g.addColorStop(0, c0);
  g.addColorStop(1, c1);
  ctx.fillStyle = g;
  ctx.strokeStyle = rgba(OUTLINE, 0.35);
  ctx.lineWidth = 2.5;
  const ridge = (f: (x: number) => number) => {
    ctx.beginPath();
    ctx.moveTo(0, 150);
    for (let x = 0; x <= W; x += 8) ctx.lineTo(x, f(x));
    ctx.lineTo(W, 150);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };
  const per = (x: number, n: number) => (x / W) * Math.PI * 2 * n;
  switch (t.far) {
    case "hills":
    case "moonrocks":
      ridge((x) => 110 - Math.abs(Math.sin(per(x, 2))) * 50 - Math.sin(per(x, 5)) * 8);
      break;
    case "mangrove":
      ridge((x) => 120 - Math.abs(Math.sin(per(x, 6))) * 25);
      ctx.fillStyle = c0;
      for (let x = 30; x < W; x += 90) {
        ctx.beginPath();
        ctx.arc(x, 70, 38, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#4e342e";
        ctx.lineWidth = 4;
        for (const dx of [-14, 0, 14]) {
          ctx.beginPath();
          ctx.moveTo(x, 90);
          ctx.quadraticCurveTo(x + dx, 120, x + dx * 1.6, 150);
          ctx.stroke();
        }
      }
      break;
    case "cliffs":
    case "basalt":
      ridge((x) => 40 + (Math.floor(x / 80) % 3) * 18 + Math.sin(per(x, 9)) * 4);
      if (t.far === "cliffs") {
        ctx.fillStyle = "rgba(225,245,254,0.85)";
        for (let x = 140; x < W; x += 320) ctx.fillRect(x, 50, 26, 100);
      }
      break;
    case "coral":
      ridge((x) => 125 - Math.abs(Math.sin(per(x, 4))) * 18);
      for (let x = 40; x < W; x += 110) {
        ctx.fillStyle = ["#ff8a80", "#ffd180", "#ea80fc", "#80deea"][(x / 110) % 4 | 0]!;
        for (let k = -2; k <= 2; k++) {
          ctx.beginPath();
          ctx.ellipse(x + k * 10, 95 - Math.abs(k) * 6, 6, 30 - Math.abs(k) * 6, k * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    case "palms":
      ridge((x) => 128 - Math.abs(Math.sin(per(x, 2))) * 14);
      for (let x = 80; x < W; x += 200) {
        ctx.strokeStyle = c0;
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(x, 130);
        ctx.quadraticCurveTo(x + 14, 90, x + 6, 50);
        ctx.stroke();
        ctx.fillStyle = c1;
        for (let i = 0; i < 6; i++) {
          const a = -Math.PI / 2 + (i - 2.5) * 0.55;
          ctx.beginPath();
          ctx.ellipse(x + 6 + Math.cos(a) * 24, 50 + Math.sin(a) * 12, 26, 6, a, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    case "trench":
    case "wrecks":
      ridge((x) => 70 + Math.abs(Math.sin(per(x, 3))) * 50 + Math.sin(per(x, 11)) * 6);
      if (t.far === "wrecks") {
        ctx.strokeStyle = "#3e2723";
        ctx.lineWidth = 6;
        for (let x = 160; x < W; x += 420) {
          ctx.beginPath();
          ctx.moveTo(x, 140);
          ctx.lineTo(x + 20, 40);
          ctx.moveTo(x - 20, 70);
          ctx.lineTo(x + 50, 76);
          ctx.stroke();
        }
      }
      break;
    case "glacier":
    case "snow":
      ridge((x) => (t.far === "snow" ? 115 : 70) - Math.abs(Math.sin(per(x, t.far === "snow" ? 3 : 5))) * 30);
      if (t.far === "glacier") {
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        for (let x = 0; x < W; x += 64) ctx.fillRect(x + 8, 60, 6, 80);
      }
      break;
    case "peaks":
    case "storm":
      ridge((x) => 30 + Math.abs(((x % 160) - 80) / 80) * 90);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      if (t.far === "peaks")
        for (let x = 80; x < W; x += 160) {
          ctx.beginPath();
          ctx.moveTo(x - 20, 52);
          ctx.lineTo(x, 30);
          ctx.lineTo(x + 20, 52);
          ctx.fill();
        }
      break;
    case "volcano":
    case "lava":
      ridge((x) => {
        const d = Math.abs((x % 640) - 320);
        return d < 60 ? 20 + d * 0.2 : 32 + (d - 60) * 0.42;
      });
      ctx.fillStyle = "#ff6d00";
      for (let x = 320; x < W; x += 640) {
        ctx.beginPath();
        ctx.ellipse(x, 24, 40, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(66,66,66,0.6)";
        for (let k = 0; k < 4; k++) {
          ctx.beginPath();
          ctx.arc(x + k * 18 - 10, 10 - k * 10, 18 + k * 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "#ff6d00";
      }
      if (t.far === "lava") {
        ctx.strokeStyle = "#ff9100";
        ctx.lineWidth = 4;
        for (let x = 40; x < W; x += 130) {
          ctx.beginPath();
          ctx.moveTo(x, 150);
          ctx.lineTo(x + 18, 110);
          ctx.lineTo(x + 6, 80);
          ctx.stroke();
        }
      }
      break;
  }
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(0, 142, W, 8);
}

/** Cột dung nham (90×230). */
export function drawLavaColumn(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, 0, 0, 230);
  g.addColorStop(0, "#fff176");
  g.addColorStop(0.4, "#ff9100");
  g.addColorStop(1, "#d50000");
  ctx.fillStyle = g;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(30, 230);
  ctx.quadraticCurveTo(10, 120, 34, 30);
  ctx.quadraticCurveTo(45, 0, 56, 30);
  ctx.quadraticCurveTo(80, 120, 60, 230);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffeb3b";
  for (const [x, y, r] of [[20, 40, 6], [70, 60, 5], [45, 12, 7], [15, 90, 4]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Tia sét (90×270). */
export function drawLightning(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = "#e1f5fe";
  ctx.shadowBlur = 20;
  ctx.fillStyle = "#fffde7";
  ctx.strokeStyle = "#82b1ff";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(50, 0);
  ctx.lineTo(24, 110);
  ctx.lineTo(48, 110);
  ctx.lineTo(18, 270);
  ctx.lineTo(70, 130);
  ctx.lineTo(46, 130);
  ctx.lineTo(74, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
}

/** Xúc tu thủy quái (100×180). */
export function drawTentacle(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3;
  const g = ctx.createLinearGradient(0, 0, 100, 0);
  g.addColorStop(0, "#7b1fa2");
  g.addColorStop(1, "#ba68c8");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(30, 180);
  ctx.bezierCurveTo(10, 120, 80, 90, 50, 30);
  ctx.quadraticCurveTo(46, 6, 66, 14);
  ctx.bezierCurveTo(98, 60, 50, 110, 74, 180);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#f3e5f5";
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(52 + Math.sin(i) * 8, 50 + i * 22, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.beginPath();
  ctx.ellipse(52, 176, 46, 6, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Mạch phun bong bóng (120×60). */
export function drawGeyser(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(178,235,242,0.5)";
  ctx.beginPath();
  ctx.ellipse(60, 46, 56, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#e0f7fa";
  ctx.lineWidth = 3;
  for (const r of [14, 28, 44]) {
    ctx.beginPath();
    ctx.ellipse(60, 46, r, r * 0.24, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  for (const [x, y, r] of [[50, 26, 7], [68, 14, 5], [58, 4, 4], [76, 30, 6]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Mũi tên dòng nước ngang (80×80, lặp dọc theo làn). */
export function drawDriftArrow(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(128,222,234,0.18)";
  ctx.fillRect(0, 0, 80, 80);
  ctx.strokeStyle = "rgba(224,247,250,0.9)";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const y of [22, 58]) {
    ctx.beginPath();
    ctx.moveTo(24, y - 10);
    ctx.lineTo(40, y + 6);
    ctx.lineTo(56, y - 10);
    ctx.stroke();
  }
}
