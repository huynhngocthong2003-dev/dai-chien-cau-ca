import type { ZoneDef } from "@dccc/shared";
import { Rng } from "@dccc/shared";
import { OUTLINE, hashString, rgba, shade } from "./color.ts";

export const WORLD_W = 1280;
export const WORLD_H = 720;
export const HORIZON = 382;

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (const [dx, dy, r] of [[0, 0, 26], [28, -14, 30], [60, -4, 24], [86, 6, 18], [40, 10, 26]] as const) {
    ctx.moveTo(x + dx * s + r * s, y + dy * s);
    ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
  }
  ctx.fill();
}

function hills(ctx: CanvasRenderingContext2D, base: number, amp: number, color: string, rng: Rng, freq = 3) {
  ctx.beginPath();
  ctx.moveTo(0, HORIZON + 2);
  const ph = rng.range(0, 6);
  for (let x = 0; x <= WORLD_W; x += 16) {
    const y = base - Math.abs(Math.sin((x / WORLD_W) * Math.PI * freq + ph)) * amp - Math.sin(x / 90 + ph) * amp * 0.12;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(WORLD_W, HORIZON + 2);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = rgba(OUTLINE, 0.35);
  ctx.stroke();
}

function tree(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, leaf: string) {
  ctx.fillStyle = "#5d4037";
  ctx.fillRect(x - 3 * s, y - 20 * s, 6 * s, 22 * s);
  ctx.fillStyle = leaf;
  ctx.strokeStyle = rgba(OUTLINE, 0.4);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const [dx, dy, r] of [[0, -32, 16], [-12, -22, 12], [12, -22, 12]] as const) {
    ctx.moveTo(x + dx * s + r * s, y + dy * s);
    ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.stroke();
}

function palm(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.strokeStyle = "#8d6e63";
  ctx.lineWidth = 7 * s;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + 14 * s, y - 40 * s, x + 6 * s, y - 80 * s);
  ctx.stroke();
  ctx.fillStyle = "#2e7d32";
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.55;
    ctx.beginPath();
    ctx.ellipse(x + 6 * s + Math.cos(a) * 26 * s, y - 80 * s + Math.sin(a) * 12 * s + 8 * s, 30 * s, 7 * s, a, 0, Math.PI * 2);
    ctx.fill();
  }
}

function volcano(ctx: CanvasRenderingContext2D, x: number, w: number, h: number, rng: Rng) {
  ctx.beginPath();
  ctx.moveTo(x - w / 2, HORIZON + 2);
  ctx.lineTo(x - w * 0.09, HORIZON - h);
  ctx.lineTo(x + w * 0.09, HORIZON - h);
  ctx.lineTo(x + w / 2, HORIZON + 2);
  ctx.closePath();
  ctx.fillStyle = "#3e2723";
  ctx.fill();
  ctx.strokeStyle = rgba(OUTLINE, 0.5);
  ctx.lineWidth = 3;
  ctx.stroke();
  // dòng nham thạch
  ctx.strokeStyle = "#ff6d00";
  ctx.lineWidth = 5;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    let px = x + rng.range(-w * 0.06, w * 0.06);
    let py = HORIZON - h + 4;
    ctx.moveTo(px, py);
    while (py < HORIZON - 4) {
      px += rng.range(-12, 12) + (px > x ? 4 : -4);
      py += rng.range(14, 26);
      ctx.lineTo(px, Math.min(py, HORIZON - 4));
    }
    ctx.stroke();
  }
  const glow = ctx.createRadialGradient(x, HORIZON - h, 4, x, HORIZON - h, w * 0.4);
  glow.addColorStop(0, "rgba(255,160,0,0.9)");
  glow.addColorStop(1, "rgba(255,60,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, HORIZON - h, w * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(60,40,40,0.55)";
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(x + rng.range(-30, 60) + i * 10, HORIZON - h - 20 - i * 26, 18 + i * 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function iceberg(ctx: CanvasRenderingContext2D, x: number, w: number, h: number, rng: Rng) {
  ctx.beginPath();
  ctx.moveTo(x, HORIZON + 2);
  const n = 5;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    ctx.lineTo(x + w * t, HORIZON - h * (0.4 + 0.6 * Math.sin(t * Math.PI)) * rng.range(0.75, 1.1));
  }
  ctx.lineTo(x + w, HORIZON + 2);
  ctx.closePath();
  const g = ctx.createLinearGradient(x, HORIZON - h, x + w, HORIZON);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(1, "#90caf9");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = rgba(OUTLINE, 0.35);
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

/** Vẽ bầu trời + cảnh xa của khu vực (phần nước động do scene tự vẽ). */
export function drawZoneBackground(ctx: CanvasRenderingContext2D, zone: ZoneDef) {
  const t = zone.theme;
  const rng = new Rng(hashString(zone.id));
  const sky = ctx.createLinearGradient(0, 0, 0, HORIZON);
  sky.addColorStop(0, t.skyTop);
  sky.addColorStop(1, t.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WORLD_W, HORIZON + 4);

  const dark = zone.id === "z_vuc_sau";
  // sao
  if (dark || zone.id === "z_dai_duong_than_thoai") {
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = `rgba(255,255,255,${rng.range(0.3, 1).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(rng.range(0, WORLD_W), rng.range(0, HORIZON * 0.8), rng.range(0.6, 2), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // cực quang
  if (zone.id === "z_bang_gia" || zone.id === "z_dai_duong_than_thoai") {
    for (let i = 0; i < 3; i++) {
      const g = ctx.createLinearGradient(0, 40, 0, 220);
      const c = i === 1 ? "#b388ff" : "#69f0ae";
      g.addColorStop(0, rgba(c, 0));
      g.addColorStop(0.5, rgba(c, 0.35));
      g.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, 120 + i * 30);
      for (let x = 0; x <= WORLD_W; x += 40) ctx.lineTo(x, 80 + i * 30 + Math.sin(x / 140 + i) * 40);
      for (let x = WORLD_W; x >= 0; x -= 40) ctx.lineTo(x, 190 + i * 30 + Math.sin(x / 160 + i) * 30);
      ctx.fill();
    }
  }
  // mặt trời / mặt trăng
  const sunX = zone.id === "z_ben_tan_thu" ? 1040 : 980;
  const sunY = dark ? 110 : 120;
  const sunC = dark ? "#e1f5fe" : zone.id === "z_bien_lua" ? "#ffab40" : zone.id === "z_dai_duong_than_thoai" ? "#ffd740" : "#fff59d";
  const halo = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 170);
  halo.addColorStop(0, rgba(sunC, 0.9));
  halo.addColorStop(1, rgba(sunC, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(sunX - 170, sunY - 170, 340, 340);
  ctx.fillStyle = sunC;
  ctx.beginPath();
  ctx.arc(sunX, sunY, zone.id === "z_dai_duong_than_thoai" ? 70 : 46, 0, Math.PI * 2);
  ctx.fill();
  if (zone.id === "z_dai_duong_than_thoai") {
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(sunX, sunY, 120, 22, -0.25, 0, Math.PI * 2);
    ctx.stroke();
  }
  // mây
  if (!dark) {
    const cc = zone.id === "z_bien_lua" ? "rgba(90,40,40,0.55)" : "rgba(255,255,255,0.85)";
    for (let i = 0; i < 6; i++) cloud(ctx, rng.range(0, WORLD_W - 100), rng.range(40, 230), rng.range(0.7, 1.4), cc);
  }

  // cảnh xa
  switch (zone.id) {
    case "z_ben_tan_thu":
      hills(ctx, HORIZON - 30, 70, "#81c784", rng, 2);
      hills(ctx, HORIZON - 5, 40, "#66bb6a", rng, 4);
      for (let i = 0; i < 14; i++) tree(ctx, rng.range(380, WORLD_W), HORIZON - rng.range(2, 22), rng.range(0.8, 1.4), i % 2 ? "#43a047" : "#2e7d32");
      break;
    case "z_bien_nhiet_doi":
      for (const [x, w] of [[760, 260], [1090, 180]] as const) {
        ctx.fillStyle = "#f6d68b";
        ctx.beginPath();
        ctx.ellipse(x, HORIZON + 2, w / 2, 26, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#43a047";
        ctx.beginPath();
        ctx.ellipse(x, HORIZON - 8, w / 3, 40, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        palm(ctx, x - 30, HORIZON - 30, 1);
        palm(ctx, x + 40, HORIZON - 24, 0.8);
      }
      break;
    case "z_vuc_sau":
      hills(ctx, HORIZON - 40, 110, "#1a0b35", rng, 3);
      for (let i = 0; i < 10; i++) {
        const x = rng.range(420, WORLD_W);
        const y = HORIZON - rng.range(10, 60);
        const g = ctx.createRadialGradient(x, y, 1, x, y, 26);
        g.addColorStop(0, "rgba(179,136,255,0.9)");
        g.addColorStop(1, "rgba(179,136,255,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, 26, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case "z_bien_lua":
      volcano(ctx, 820, 420, 210, rng);
      volcano(ctx, 1160, 300, 140, rng);
      break;
    case "z_bang_gia":
      hills(ctx, HORIZON - 60, 120, "#e3f2fd", rng, 2.5);
      iceberg(ctx, 520, 200, 70, rng);
      iceberg(ctx, 900, 280, 110, rng);
      break;
    case "z_dai_duong_than_thoai":
      for (const [x, y, w] of [[620, 200, 150], [900, 150, 110], [1150, 240, 130]] as const) {
        ctx.fillStyle = "#7e57c2";
        ctx.beginPath();
        ctx.moveTo(x - w / 2, y);
        ctx.lineTo(x + w / 2, y);
        ctx.lineTo(x, y + w * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#9ccc65";
        ctx.beginPath();
        ctx.ellipse(x, y, w / 2, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff8e1";
        for (const dx of [-0.25, 0, 0.25]) ctx.fillRect(x + dx * w - 4, y - 40, 8, 40);
        ctx.fillRect(x - w * 0.32, y - 46, w * 0.64, 8);
      }
      break;
  }

  // nước sâu tĩnh
  const water = ctx.createLinearGradient(0, HORIZON, 0, WORLD_H);
  water.addColorStop(0, t.waterTop);
  water.addColorStop(1, t.waterBottom);
  ctx.fillStyle = water;
  ctx.fillRect(0, HORIZON, WORLD_W, WORLD_H - HORIZON);
  // tia sáng dưới nước
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 6; i++) {
    const x = 380 + i * 150;
    ctx.beginPath();
    ctx.moveTo(x, HORIZON);
    ctx.lineTo(x + 40, HORIZON);
    ctx.lineTo(x - 60, WORLD_H);
    ctx.lineTo(x - 140, WORLD_H);
    ctx.fill();
  }
  ctx.restore();
  // đáy
  ctx.fillStyle = shade(t.waterBottom, -0.35);
  ctx.beginPath();
  ctx.moveTo(0, WORLD_H);
  for (let x = 0; x <= WORLD_W; x += 40) ctx.lineTo(x, WORLD_H - 24 - Math.sin(x / 70) * 10 - rng.range(0, 8));
  ctx.lineTo(WORLD_W, WORLD_H);
  ctx.fill();
}

/** Bến gỗ bên trái màn hình câu cá. */
export function drawDock(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const top = 40;
  // cột
  for (const x of [30, 140, 250]) {
    const g = ctx.createLinearGradient(x, 0, x + 26, 0);
    g.addColorStop(0, "#5d4037");
    g.addColorStop(1, "#3e2723");
    ctx.fillStyle = g;
    ctx.fillRect(x, top + 10, 26, h - top - 10);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, top + 10, 26, h - top - 10);
  }
  // sàn
  const plankH = 14;
  for (let i = 0; i < 3; i++) {
    const y = top + i * plankH;
    ctx.fillStyle = i % 2 ? "#a1673f" : "#b5794a";
    ctx.beginPath();
    ctx.roundRect(-10, y, w + 10, plankH, 3);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(0, top + 3 * plankH, w, 10);
  // đinh
  ctx.fillStyle = "#3e2723";
  for (let x = 20; x < w; x += 54) for (let i = 0; i < 3; i++) ctx.fillRect(x, top + i * plankH + 5, 4, 4);
  // cọc buộc thuyền
  ctx.fillStyle = "#6d4c41";
  ctx.beginPath();
  ctx.roundRect(w - 40, top - 26, 20, 30, 5);
  ctx.fill();
  ctx.stroke();
}
