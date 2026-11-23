/**
 * BIỂU TƯỢNG VẼ TRONG CHỮ: mọi chữ trong game (nhãn nút, giá, phần thưởng, thông báo…) có emoji tiền tệ cũ
 * 🪙 💎 🔷 🔮 🎫 sẽ được vẽ bằng biểu tượng mới (cùng bộ với thanh tài nguyên & menu) đúng chỗ, đúng cỡ chữ.
 * Cách làm: bọc fillText/strokeText của Canvas 2D – chỉ đụng tới chuỗi có chứa các emoji này,
 * vị trí từng đoạn tính bằng measureText nên khớp hoàn toàn với cách Phaser dàn dòng.
 */
import { MENU_ICON_SIZE, drawMenuIcon, type MenuIcon } from "../art/MenuIcons.ts";

const MAP: Record<string, MenuIcon> = {
  "🪙": "coin",
  "💎": "diamond",
  "🔷": "stone",
  "🔮": "soul",
  "🎫": "ticket",
};
const RE = /(🪙|💎|🔷|🔮|🎫)/u;
const SPLIT = /(🪙|💎|🔷|🔮|🎫)/gu;

const cache = new Map<MenuIcon, HTMLCanvasElement>();
function iconCanvas(kind: MenuIcon): HTMLCanvasElement {
  let c = cache.get(kind);
  if (!c) {
    c = document.createElement("canvas");
    c.width = c.height = MENU_ICON_SIZE;
    drawMenuIcon(c.getContext("2d")!, kind);
    cache.set(kind, c);
  }
  return c;
}

function fontPx(ctx: CanvasRenderingContext2D): number {
  const m = /(\d+(?:\.\d+)?)px/.exec(ctx.font);
  return m ? Number(m[1]) : 16;
}

let installed = false;

export function installInlineIcons() {
  if (installed || typeof CanvasRenderingContext2D === "undefined") return;
  installed = true;
  const proto = CanvasRenderingContext2D.prototype;
  const fill = proto.fillText;
  const stroke = proto.strokeText;

  const draw = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, mode: "fill" | "stroke") => {
    const parts = text.split(SPLIT).filter((p) => p !== "");
    const total = ctx.measureText(text).width;
    // quy về căn trái để tự dàn từng đoạn
    const align = ctx.textAlign;
    let cx = align === "center" ? x - total / 2 : align === "right" || align === "end" ? x - total : x;
    ctx.save();
    ctx.textAlign = "left";
    const em = fontPx(ctx);
    for (const p of parts) {
      const w = ctx.measureText(p).width;
      const kind = MAP[p];
      if (kind) {
        if (mode === "fill") {
          const s = em * 1.08;
          // chữ vẽ theo đường chân (alphabetic): đỉnh biểu tượng ~ 0.86 em trên đường chân
          const top = ctx.textBaseline === "middle" ? y - s / 2 : ctx.textBaseline === "top" ? y : y - em * 0.86;
          ctx.drawImage(iconCanvas(kind), cx + (w - s) / 2, top, s, s);
        }
      } else if (mode === "fill") fill.call(ctx, p, cx, y);
      else stroke.call(ctx, p, cx, y);
      cx += w;
    }
    ctx.restore();
  };

  proto.fillText = function (this: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth?: number) {
    if (typeof text === "string" && RE.test(text) && maxWidth === undefined) return draw(this, text, x, y, "fill");
    return maxWidth === undefined ? fill.call(this, text, x, y) : fill.call(this, text, x, y, maxWidth);
  };
  proto.strokeText = function (this: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth?: number) {
    if (typeof text === "string" && RE.test(text) && maxWidth === undefined) return draw(this, text, x, y, "stroke");
    return maxWidth === undefined ? stroke.call(this, text, x, y) : stroke.call(this, text, x, y, maxWidth);
  };
}
