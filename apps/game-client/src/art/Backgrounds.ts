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
    case "z_vuong_quoc_kim_loai":
      // tháp thép & bánh răng vàng của vương quốc chìm
      for (const [x, h, w] of [[560, 210, 46], [660, 290, 60], [760, 180, 40], [960, 250, 54], [1120, 200, 44]] as const) {
        const tg = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
        tg.addColorStop(0, "#90a4ae");
        tg.addColorStop(0.5, "#eceff1");
        tg.addColorStop(1, "#546e7a");
        ctx.fillStyle = tg;
        ctx.beginPath();
        ctx.moveTo(x - w / 2, HORIZON);
        ctx.lineTo(x - w / 2, HORIZON - h);
        ctx.lineTo(x, HORIZON - h - w * 0.7);
        ctx.lineTo(x + w / 2, HORIZON - h);
        ctx.lineTo(x + w / 2, HORIZON);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#37474f";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = "#ffca28";
        for (let yy = HORIZON - h + 20; yy < HORIZON - 10; yy += 34) ctx.fillRect(x - w * 0.18, yy, w * 0.36, 12);
      }
      for (const [gx, gy, r] of [[860, HORIZON - 70, 46], [460, HORIZON - 40, 30]] as const) {
        ctx.fillStyle = "#ffb300";
        ctx.beginPath();
        for (let i = 0; i < 24; i++) {
          const a2 = (i / 24) * Math.PI * 2;
          const rr = i % 2 ? r : r * 1.22;
          ctx.lineTo(gx + Math.cos(a2) * rr, gy + Math.sin(a2) * rr);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#6d4c00";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = "#455a64";
        ctx.beginPath();
        ctx.arc(gx, gy, r * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
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

/**
 * Bục câu bên trái màn hình. Mỗi khu một kiểu, càng về sau càng xịn:
 * 0 gỗ mộc · 1 tre nhiệt đới · 2 đá pha lê · 3 hắc thạch dung nham · 4 băng tinh · 5 cẩm thạch vàng.
 */
export function drawDock(ctx: CanvasRenderingContext2D, w: number, h: number, style = 0) {
  const top = 40;
  const plankH = 14;
  const deckH = plankH * 3;
  const sf = (fill: string | CanvasGradient, lw = 2.5) => {
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = lw;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
  };
  const STY = [
    { post: ["#5d4037", "#3e2723"], planks: ["#b5794a", "#a1673f"] },
    { post: ["#c0ca33", "#827717"], planks: ["#dce775", "#c0ca33"] },
    { post: ["#546e7a", "#263238"], planks: ["#78909c", "#607d8b"] },
    { post: ["#37474f", "#000000"], planks: ["#263238", "#1c1c1c"] },
    { post: ["#b3e5fc", "#4fc3f7"], planks: ["#e1f5fe", "#b3e5fc"] },
    { post: ["#fff8e1", "#ffd54f"], planks: ["#fafafa", "#eceff1"] },
  ][style] ?? { post: ["#5d4037", "#3e2723"], planks: ["#b5794a", "#a1673f"] };

  // cột
  for (const x of [30, 140, 250]) {
    const g = ctx.createLinearGradient(x, 0, x + 26, 0);
    g.addColorStop(0, STY.post[0]!);
    g.addColorStop(1, STY.post[1]!);
    ctx.beginPath();
    if (style === 5) {
      ctx.rect(x - 4, top + 10, 34, h - top - 10);
    } else ctx.rect(x, top + 10, 26, h - top - 10);
    sf(g, 3);
    if (style === 1) {
      ctx.strokeStyle = "rgba(51,105,30,0.7)";
      ctx.lineWidth = 2;
      for (let y = top + 40; y < h; y += 46) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 26, y);
        ctx.stroke();
      }
    }
    if (style === 5) {
      ctx.fillStyle = "#ffb300";
      ctx.fillRect(x - 8, top + 10, 42, 10);
      ctx.fillRect(x - 8, h - 30, 42, 10);
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      for (let k = 0; k < 3; k++) ctx.fillRect(x + 2 + k * 10, top + 24, 3, h - top - 60);
    }
    if (style === 3) {
      ctx.strokeStyle = "#ff6d00";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "#ff3d00";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(x + 8, top + 30);
      ctx.lineTo(x + 16, top + 70);
      ctx.lineTo(x + 6, top + 110);
      ctx.lineTo(x + 18, top + 170);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }
  // sàn
  for (let i = 0; i < 3; i++) {
    const y = top + i * plankH;
    ctx.beginPath();
    ctx.roundRect(-10, y, w + 10, plankH, 3);
    sf(i % 2 ? STY.planks[1]! : STY.planks[0]!);
  }
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(0, top + deckH, w, 10);

  switch (style) {
    case 0: {
      ctx.fillStyle = "#3e2723";
      for (let x = 20; x < w; x += 54) for (let i = 0; i < 3; i++) ctx.fillRect(x, top + i * plankH + 5, 4, 4);
      ctx.beginPath();
      ctx.roundRect(w - 40, top - 26, 20, 30, 5);
      sf("#6d4c41");
      break;
    }
    case 1: {
      // đốt tre + dây buộc + đuốc tiki
      ctx.strokeStyle = "rgba(51,105,30,0.6)";
      ctx.lineWidth = 2;
      for (let x = 30; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x, top + deckH);
        ctx.stroke();
      }
      ctx.fillStyle = "#8d6e63";
      for (const x of [30, 140, 250]) ctx.fillRect(x - 2, top + deckH - 4, 30, 6);
      ctx.beginPath();
      ctx.rect(w - 36, top - 70, 10, 74);
      sf("#8d6e63");
      ctx.beginPath();
      ctx.moveTo(w - 42, top - 70);
      ctx.lineTo(w - 20, top - 70);
      ctx.lineTo(w - 26, top - 88);
      ctx.lineTo(w - 36, top - 88);
      ctx.closePath();
      sf("#5d4037");
      const fl = ctx.createRadialGradient(w - 31, top - 98, 2, w - 31, top - 98, 26);
      fl.addColorStop(0, "#fff59d");
      fl.addColorStop(0.4, "#ff9800");
      fl.addColorStop(1, "rgba(255,87,34,0)");
      ctx.fillStyle = fl;
      ctx.beginPath();
      ctx.arc(w - 31, top - 98, 26, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 2: {
      // đá + pha lê phát sáng tím
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.lineWidth = 2;
      for (let x = 30; x < w; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x + 10, top + deckH);
        ctx.stroke();
      }
      for (const [x, s] of [[70, 1], [200, 0.8], [w - 40, 1.2]] as const) {
        ctx.save();
        ctx.shadowColor = "#b388ff";
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x - 8 * s, top - 22 * s);
        ctx.lineTo(x, top - 46 * s);
        ctx.lineTo(x + 8 * s, top - 22 * s);
        ctx.closePath();
        const g = ctx.createLinearGradient(x, top - 46 * s, x, top);
        g.addColorStop(0, "#ffffff");
        g.addColorStop(1, "#7c4dff");
        sf(g, 2);
        ctx.restore();
      }
      break;
    }
    case 3: {
      // khe nham thạch + lan can sắt
      ctx.save();
      ctx.strokeStyle = "#ff6d00";
      ctx.shadowColor = "#ff3d00";
      ctx.shadowBlur = 10;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 0; x < w; x += 34) {
        ctx.moveTo(x, top + 4);
        ctx.lineTo(x + 14, top + 20);
        ctx.lineTo(x + 6, top + deckH - 4);
      }
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = "#90a4ae";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, top - 30);
      ctx.lineTo(w - 10, top - 30);
      for (let x = 10; x < w; x += 50) {
        ctx.moveTo(x, top - 30);
        ctx.lineTo(x, top);
      }
      ctx.stroke();
      ctx.fillStyle = "#ff3d00";
      for (let x = 10; x < w; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x - 6, top - 30);
        ctx.lineTo(x, top - 42);
        ctx.lineTo(x + 6, top - 30);
        ctx.fill();
      }
      break;
    }
    case 4: {
      // tuyết phủ + nhũ băng
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(-10, top + 2);
      for (let x = -10; x <= w; x += 20) ctx.quadraticCurveTo(x + 10, top - 12, x + 20, top + 2);
      ctx.lineTo(w, top + 6);
      ctx.lineTo(-10, top + 6);
      ctx.fill();
      ctx.fillStyle = "rgba(225,245,254,0.95)";
      ctx.strokeStyle = rgba(OUTLINE, 0.5);
      ctx.lineWidth = 1.5;
      for (let x = 8; x < w; x += 22) {
        const len = 14 + ((x * 7) % 18);
        ctx.beginPath();
        ctx.moveTo(x, top + deckH);
        ctx.lineTo(x + 5, top + deckH + len);
        ctx.lineTo(x + 10, top + deckH);
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
    case 5: {
      // viền vàng, thảm đỏ, ngọc, đèn lồng vàng
      ctx.fillStyle = "#ffb300";
      ctx.fillRect(-10, top - 4, w + 10, 6);
      ctx.fillRect(-10, top + deckH - 4, w + 10, 6);
      ctx.beginPath();
      ctx.rect(0, top + 8, w - 20, 22);
      const rg = ctx.createLinearGradient(0, top + 8, 0, top + 30);
      rg.addColorStop(0, "#e53935");
      rg.addColorStop(1, "#8e0000");
      sf(rg, 2);
      ctx.fillStyle = "#ffd54f";
      ctx.fillRect(0, top + 8, w - 20, 3);
      ctx.fillRect(0, top + 27, w - 20, 3);
      for (const [x, c] of [[60, "#00e5ff"], [160, "#ff1744"], [260, "#76ff03"]] as const) {
        ctx.save();
        ctx.shadowColor = c;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(x, top - 2);
        ctx.lineTo(x + 6, top + 4);
        ctx.lineTo(x, top + 10);
        ctx.lineTo(x - 6, top + 4);
        ctx.closePath();
        sf(c, 1.5);
        ctx.restore();
      }
      // trụ đèn vàng
      ctx.beginPath();
      ctx.rect(w - 34, top - 80, 10, 84);
      sf("#ffb300");
      ctx.save();
      ctx.shadowColor = "#fff59d";
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.roundRect(w - 44, top - 106, 30, 30, 8);
      sf("#fff59d", 2.5);
      ctx.restore();
      break;
    }
  }
}
