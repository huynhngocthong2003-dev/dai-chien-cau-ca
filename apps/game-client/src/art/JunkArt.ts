import type { JunkDef } from "@dccc/shared";
import { OUTLINE, rgba, shade } from "./color.ts";

/** Vẽ rác trong khung 320×200 (cùng kích thước khung cá). */
export function drawJunk(ctx: CanvasRenderingContext2D, j: JunkDef) {
  const sf = (p: Path2D, fill: string | CanvasGradient, lw = 3.5) => {
    ctx.fillStyle = fill;
    ctx.fill(p);
    ctx.lineWidth = lw;
    ctx.strokeStyle = OUTLINE;
    ctx.lineJoin = "round";
    ctx.stroke(p);
  };
  ctx.save();
  ctx.translate(160, 100);
  switch (j.kind) {
    case "bottle": {
      ctx.rotate(-0.35);
      const p = new Path2D();
      p.moveTo(-90, -28);
      p.lineTo(40, -28);
      p.quadraticCurveTo(62, -28, 72, -14);
      p.lineTo(92, -12);
      p.lineTo(92, 12);
      p.lineTo(72, 14);
      p.quadraticCurveTo(62, 28, 40, 28);
      p.lineTo(-90, 28);
      p.quadraticCurveTo(-104, 0, -90, -28);
      p.closePath();
      const g = ctx.createLinearGradient(0, -28, 0, 28);
      g.addColorStop(0, rgba("#e1f5fe", 0.85));
      g.addColorStop(0.5, rgba(j.color, 0.6));
      g.addColorStop(1, rgba("#4fc3f7", 0.8));
      sf(p, g);
      const cap = new Path2D();
      cap.roundRect(90, -15, 20, 30, 4);
      sf(cap, "#1e88e5", 3);
      const label = new Path2D();
      label.rect(-50, -28, 60, 56);
      sf(label, "#ffffff", 2);
      ctx.fillStyle = "#43a047";
      ctx.font = "bold 26px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("♻", -20, 9);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillRect(-84, -20, 26, 6);
      break;
    }
    case "bag": {
      const p = new Path2D();
      p.moveTo(-70, -30);
      p.quadraticCurveTo(-80, 40, -50, 70);
      p.quadraticCurveTo(0, 86, 50, 70);
      p.quadraticCurveTo(80, 40, 70, -30);
      p.lineTo(40, -30);
      p.quadraticCurveTo(40, -78, 22, -80);
      p.quadraticCurveTo(14, -50, 16, -30);
      p.lineTo(-16, -30);
      p.quadraticCurveTo(-14, -50, -22, -80);
      p.quadraticCurveTo(-40, -78, -40, -30);
      p.closePath();
      const g = ctx.createLinearGradient(-70, -30, 70, 70);
      g.addColorStop(0, rgba("#ffffff", 0.9));
      g.addColorStop(1, rgba("#b0bec5", 0.75));
      sf(p, g);
      ctx.strokeStyle = rgba(OUTLINE, 0.35);
      ctx.lineWidth = 2;
      for (const [x1, y1, x2, y2] of [[-40, 0, -10, 50], [20, -10, 40, 40], [-20, 20, 10, 10]] as const) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo((x1 + x2) / 2 + 10, (y1 + y2) / 2, x2, y2);
        ctx.stroke();
      }
      break;
    }
    case "sandal": {
      ctx.rotate(-0.2);
      const sole = new Path2D();
      sole.ellipse(0, 0, 110, 42, 0, 0, Math.PI * 2);
      sf(sole, shade(j.color, -0.15));
      const top = new Path2D();
      top.ellipse(-4, -6, 100, 34, 0, 0, Math.PI * 2);
      sf(top, j.color, 2.5);
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 11;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(40, -4);
      ctx.quadraticCurveTo(10, -50, -30, -30);
      ctx.moveTo(40, -4);
      ctx.quadraticCurveTo(10, 40, -30, 20);
      ctx.stroke();
      ctx.strokeStyle = "#1565c0";
      ctx.lineWidth = 7;
      ctx.stroke();
      break;
    }
    case "can": {
      ctx.rotate(0.45);
      const body = new Path2D();
      body.roundRect(-40, -70, 80, 140, 12);
      const g = ctx.createLinearGradient(-40, 0, 40, 0);
      g.addColorStop(0, shade(j.color, -0.3));
      g.addColorStop(0.35, shade(j.color, 0.25));
      g.addColorStop(1, shade(j.color, -0.35));
      sf(body, g);
      const lid = new Path2D();
      lid.ellipse(0, -70, 40, 11, 0, 0, Math.PI * 2);
      sf(lid, "#cfd8dc", 3);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 22px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("SODA", 0, 8);
      // vết móp
      ctx.strokeStyle = rgba(OUTLINE, 0.5);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-30, 30);
      ctx.lineTo(-10, 40);
      ctx.lineTo(-25, 50);
      ctx.stroke();
      break;
    }
    case "net": {
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 5;
      const mesh = () => {
        for (let i = -4; i <= 4; i++) {
          ctx.beginPath();
          ctx.moveTo(-110 + i * 6, -60 + i * 14);
          ctx.quadraticCurveTo(0, -40 + i * 18, 110 - i * 4, -50 + i * 15);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-90 + i * 24, -70);
          ctx.quadraticCurveTo(-80 + i * 22, 0, -95 + i * 26, 70);
          ctx.stroke();
        }
      };
      mesh();
      ctx.strokeStyle = j.color;
      ctx.lineWidth = 3;
      mesh();
      for (const [x, y] of [[-60, -30], [40, 20], [70, -40]] as const) {
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fillStyle = "#ffb300";
        ctx.fill();
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
      break;
    }
  }
  ctx.restore();
}
