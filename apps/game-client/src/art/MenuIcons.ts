/**
 * BIỂU TƯỢNG MENU SẢNH (khung 128×128): vẽ tay bằng Canvas 2D cùng phong cách game –
 * viền đậm, khối nổi có điểm sáng, màu tươi, mỗi mục một hình dễ nhận ra.
 */
const S = 128;
const INK = "#16223f";

export type MenuIcon =
  | "bag"
  | "shop"
  | "book"
  | "gear"
  | "battle"
  | "breed"
  | "race"
  | "plaza"
  | "wheel"
  | "quest"
  | "event"
  | "trophy"
  | "guild"
  // biểu tượng phần quà (Vòng Quay)
  | "coin"
  | "coins"
  | "diamond"
  | "crown"
  | "stone"
  | "soul"
  | "ticket";

function ol(ctx: CanvasRenderingContext2D, p: Path2D, fill: string | CanvasGradient, w = 5) {
  ctx.fillStyle = fill;
  ctx.fill(p);
  ctx.lineWidth = w;
  ctx.strokeStyle = INK;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke(p);
}
function lg(ctx: CanvasRenderingContext2D, y0: number, y1: number, a: string, b: string) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  return g;
}
function shine(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rot = -0.5) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,.55)";
  ctx.beginPath();
  ctx.ellipse(x, y, w, h, rot, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, col = "#fff59d") {
  const p = new Path2D();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    if (i) p.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else p.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  p.closePath();
  ol(ctx, p, col, 3);
}
/** Con cá hoạt hình nhỏ (hướng phải). */
function fish(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, body: string, fin: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const t = new Path2D();
  t.moveTo(-18, 0);
  t.lineTo(-34, -14);
  t.lineTo(-30, 0);
  t.lineTo(-34, 14);
  t.closePath();
  ol(ctx, t, fin, 4);
  const b = new Path2D();
  b.ellipse(0, 0, 24, 16, 0, 0, Math.PI * 2);
  ol(ctx, b, lg(ctx, -16, 16, body, fin), 4);
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(12, -4, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(13.5, -4, 2.6, 0, Math.PI * 2);
  ctx.fill();
  shine(ctx, -4, -8, 9, 3.5, -0.2);
  ctx.restore();
}

const DRAW: Partial<Record<MenuIcon, (ctx: CanvasRenderingContext2D) => void>> = {
  // KHO CÁ: giỏ mây đầy cá
  bag: (ctx) => {
    fish(ctx, 52, 50, 1.05, "#4fc3f7", "#0277bd");
    fish(ctx, 80, 44, 0.95, "#ffb74d", "#e65100");
    const b = new Path2D();
    b.moveTo(18, 58);
    b.lineTo(110, 58);
    b.lineTo(98, 112);
    b.lineTo(30, 112);
    b.closePath();
    ol(ctx, b, lg(ctx, 58, 112, "#d7a86e", "#8d5a2b"));
    ctx.strokeStyle = "rgba(22,34,63,.4)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(24 + i * 3, 70 + i * 11);
      ctx.lineTo(104 - i * 3, 70 + i * 11);
      ctx.stroke();
    }
    const rim = new Path2D();
    rim.roundRect(12, 52, 104, 14, 7);
    ol(ctx, rim, "#c58b4e");
  },
  // CỬA HÀNG: sạp có mái sọc + túi tiền
  shop: (ctx) => {
    const wall = new Path2D();
    wall.roundRect(22, 52, 84, 60, 6);
    ol(ctx, wall, lg(ctx, 52, 112, "#fff3e0", "#ffcc80"));
    const door = new Path2D();
    door.roundRect(50, 76, 28, 36, 4);
    ol(ctx, door, "#8d6e63", 4);
    const roof = new Path2D();
    roof.moveTo(12, 56);
    roof.lineTo(24, 22);
    roof.lineTo(104, 22);
    roof.lineTo(116, 56);
    roof.closePath();
    ol(ctx, roof, "#ef5350");
    ctx.save();
    ctx.clip(roof);
    ctx.fillStyle = "#fff";
    for (let i = 0; i < 6; i++) ctx.fillRect(20 + i * 18, 18, 9, 42);
    ctx.restore();
    ctx.lineWidth = 5;
    ctx.strokeStyle = INK;
    ctx.stroke(roof);
    for (let i = 0; i < 5; i++) {
      const sc = new Path2D();
      sc.arc(22 + i * 21, 56, 10.5, 0, Math.PI);
      ol(ctx, sc, i % 2 ? "#fff" : "#ef5350", 4);
    }
    const coin = new Path2D();
    coin.arc(96, 98, 16, 0, Math.PI * 2);
    ol(ctx, coin, lg(ctx, 82, 114, "#fff59d", "#ffb300"));
    ctx.fillStyle = INK;
    ctx.font = "900 20px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("$", 96, 99);
  },
  // BỘ SƯU TẬP: sách mở có hình cá + ngôi sao
  book: (ctx) => {
    const l = new Path2D();
    l.moveTo(64, 34);
    l.quadraticCurveTo(40, 22, 14, 30);
    l.lineTo(14, 104);
    l.quadraticCurveTo(40, 96, 64, 108);
    l.closePath();
    ol(ctx, l, lg(ctx, 30, 108, "#ffffff", "#e3f2fd"));
    const r = new Path2D();
    r.moveTo(64, 34);
    r.quadraticCurveTo(88, 22, 114, 30);
    r.lineTo(114, 104);
    r.quadraticCurveTo(88, 96, 64, 108);
    r.closePath();
    ol(ctx, r, lg(ctx, 30, 108, "#ffffff", "#e3f2fd"));
    const cov = new Path2D();
    cov.moveTo(10, 104);
    cov.quadraticCurveTo(40, 98, 64, 112);
    cov.quadraticCurveTo(88, 98, 118, 104);
    cov.lineTo(118, 112);
    cov.quadraticCurveTo(88, 106, 64, 118);
    cov.quadraticCurveTo(40, 106, 10, 112);
    cov.closePath();
    ol(ctx, cov, "#5c6bc0", 4);
    fish(ctx, 40, 66, 0.72, "#4dd0e1", "#00838f");
    ctx.strokeStyle = "rgba(22,34,63,.35)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(74, 50 + i * 13);
      ctx.lineTo(104, 48 + i * 13);
      ctx.stroke();
    }
    star(ctx, 100, 26, 12);
  },
  // CÀI ĐẶT: bánh răng
  gear: (ctx) => {
    const p = new Path2D();
    const n = 9;
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2;
      const r = i % 2 ? 44 : 54;
      const a2 = a + Math.PI / (n * 2);
      if (i) p.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r);
      else p.moveTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r);
      p.lineTo(64 + Math.cos(a2) * r, 64 + Math.sin(a2) * r);
    }
    p.closePath();
    ol(ctx, p, lg(ctx, 10, 118, "#eceff1", "#78909c"));
    const hole = new Path2D();
    hole.arc(64, 64, 18, 0, Math.PI * 2);
    ol(ctx, hole, "#37474f");
    shine(ctx, 46, 38, 14, 6);
  },
  // ĐẤU CÁ: 2 kiếm bắt chéo trên khiên có cá
  battle: (ctx) => {
    for (const k of [-1, 1]) {
      ctx.save();
      ctx.translate(64, 62);
      ctx.rotate(k * 0.72);
      const bl = new Path2D();
      bl.moveTo(-6, 34);
      bl.lineTo(-6, -44);
      bl.lineTo(0, -56);
      bl.lineTo(6, -44);
      bl.lineTo(6, 34);
      bl.closePath();
      ol(ctx, bl, lg(ctx, -56, 34, "#ffffff", "#90a4ae"), 4);
      const hilt = new Path2D();
      hilt.roundRect(-16, 32, 32, 8, 4);
      hilt.roundRect(-5, 40, 10, 16, 3);
      ol(ctx, hilt, "#ffb300", 4);
      ctx.restore();
    }
    const sh = new Path2D();
    sh.moveTo(64, 40);
    sh.lineTo(92, 50);
    sh.quadraticCurveTo(92, 92, 64, 110);
    sh.quadraticCurveTo(36, 92, 36, 50);
    sh.closePath();
    ol(ctx, sh, lg(ctx, 40, 110, "#ef5350", "#b71c1c"));
    fish(ctx, 66, 74, 0.62, "#fff176", "#ff8f00");
  },
  // LAI TẠO: quả trứng 2 màu có trái tim
  breed: (ctx) => {
    const egg = new Path2D();
    egg.moveTo(64, 14);
    egg.bezierCurveTo(98, 14, 108, 78, 102, 92);
    egg.bezierCurveTo(94, 118, 34, 118, 26, 92);
    egg.bezierCurveTo(20, 78, 30, 14, 64, 14);
    ctx.save();
    ctx.clip(egg);
    ctx.fillStyle = lg(ctx, 14, 70, "#b39ddb", "#7e57c2");
    ctx.fillRect(0, 0, S, 70);
    ctx.fillStyle = lg(ctx, 66, 118, "#ffab91", "#f4511e");
    ctx.beginPath();
    ctx.moveTo(0, 72);
    for (let x = 0; x <= S; x += 16) ctx.lineTo(x, 70 + ((x / 16) % 2 ? -8 : 6));
    ctx.lineTo(S, S);
    ctx.lineTo(0, S);
    ctx.fill();
    ctx.fillStyle = "#fff59d";
    for (const [x, y, r] of [[48, 40, 6], [80, 52, 4], [44, 96, 5], [84, 100, 4]] as const) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.lineWidth = 5;
    ctx.strokeStyle = INK;
    ctx.stroke(egg);
    shine(ctx, 50, 32, 8, 14, -0.3);
    const h = new Path2D();
    h.moveTo(64, 86);
    h.bezierCurveTo(40, 70, 48, 48, 64, 60);
    h.bezierCurveTo(80, 48, 88, 70, 64, 86);
    ol(ctx, h, "#ff4081", 4);
  },
  // ĐUA CÁ: cờ caro + cá phóng nhanh
  race: (ctx) => {
    const pole = new Path2D();
    pole.roundRect(22, 14, 8, 100, 4);
    ol(ctx, pole, "#8d6e63", 4);
    const flag = new Path2D();
    flag.moveTo(30, 18);
    flag.quadraticCurveTo(70, 8, 106, 22);
    flag.lineTo(106, 64);
    flag.quadraticCurveTo(70, 50, 30, 60);
    flag.closePath();
    ctx.save();
    ctx.clip(flag);
    for (let r = 0; r < 6; r++) for (let c = 0; c < 8; c++) {
      ctx.fillStyle = (r + c) % 2 ? INK : "#ffffff";
      ctx.fillRect(30 + c * 10, 8 + r * 10, 10, 10);
    }
    ctx.restore();
    ctx.lineWidth = 5;
    ctx.strokeStyle = INK;
    ctx.stroke(flag);
    ctx.strokeStyle = "#4fc3f7";
    ctx.lineWidth = 5;
    for (const [y, l] of [[84, 30], [96, 20], [108, 26]] as const) {
      ctx.beginPath();
      ctx.moveTo(42, y);
      ctx.lineTo(42 + l, y);
      ctx.stroke();
    }
    fish(ctx, 94, 96, 0.85, "#69f0ae", "#00c853");
  },
  // QUẢNG TRƯỜNG: đài phun nước giữa 2 mái nhà
  plaza: (ctx) => {
    for (const [x, c] of [[26, "#7e57c2"], [102, "#26a69a"]] as const) {
      const w = new Path2D();
      w.roundRect(x - 18, 56, 36, 44, 4);
      ol(ctx, w, "#fff8e1", 4);
      const r = new Path2D();
      r.moveTo(x - 24, 58);
      r.lineTo(x, 32);
      r.lineTo(x + 24, 58);
      r.closePath();
      ol(ctx, r, c, 4);
      const win = new Path2D();
      win.roundRect(x - 7, 68, 14, 14, 3);
      ol(ctx, win, "#81d4fa", 3);
    }
    const basin = new Path2D();
    basin.ellipse(64, 100, 38, 14, 0, 0, Math.PI * 2);
    ol(ctx, basin, lg(ctx, 86, 114, "#b0bec5", "#607d8b"));
    const water = new Path2D();
    water.ellipse(64, 96, 30, 8, 0, 0, Math.PI * 2);
    ol(ctx, water, "#4fc3f7", 3);
    const col = new Path2D();
    col.roundRect(58, 58, 12, 38, 4);
    ol(ctx, col, "#cfd8dc", 4);
    ctx.strokeStyle = "#29b6f6";
    ctx.lineWidth = 5;
    for (const k of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(64, 56);
      ctx.quadraticCurveTo(64 + k * 26, 20, 64 + k * 30, 86);
      ctx.stroke();
    }
    const top = new Path2D();
    top.arc(64, 52, 9, 0, Math.PI * 2);
    ol(ctx, top, "#e1f5fe", 4);
  },
  // VÒNG QUAY: chân đế, viền vàng gắn bóng đèn, ô màu có sao/đồng xu, trục ngọc, kim chỉ có viên ngọc
  wheel: (ctx) => {
    const cx = 64;
    const cy = 58;
    // chân đế chữ A
    const legs = new Path2D();
    legs.moveTo(cx - 6, cy + 10);
    legs.lineTo(cx - 34, 120);
    legs.lineTo(cx - 22, 120);
    legs.lineTo(cx, cy + 22);
    legs.lineTo(cx + 22, 120);
    legs.lineTo(cx + 34, 120);
    legs.lineTo(cx + 6, cy + 10);
    legs.closePath();
    ol(ctx, legs, lg(ctx, cy, 120, "#ff8a65", "#bf360c"), 4);
    const base = new Path2D();
    base.roundRect(cx - 44, 114, 88, 10, 5);
    ol(ctx, base, "#8d6e63", 4);
    // viền vàng
    const rim = new Path2D();
    rim.arc(cx, cy, 50, 0, Math.PI * 2);
    ol(ctx, rim, lg(ctx, cy - 50, cy + 50, "#fff59d", "#ff8f00"));
    // các ô màu
    const cols = ["#ef5350", "#ffca28", "#66bb6a", "#29b6f6", "#ab47bc", "#ff7043", "#26c6da", "#ec407a"];
    const R = 40;
    cols.forEach((c, i) => {
      const a0 = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const a1 = ((i + 1) / 8) * Math.PI * 2 - Math.PI / 2;
      const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, R);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.35, c);
      g.addColorStop(1, c);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, a0, a1);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#fff8e1";
      ctx.stroke();
      // hình nhỏ trong ô: sao / đồng xu xen kẽ
      const am = (a0 + a1) / 2;
      const px = cx + Math.cos(am) * R * 0.66;
      const py = cy + Math.sin(am) * R * 0.66;
      if (i % 2) star(ctx, px, py, 6.5, "#fffde7");
      else {
        const coin = new Path2D();
        coin.arc(px, py, 5.5, 0, Math.PI * 2);
        ol(ctx, coin, "#ffd54f", 2);
      }
    });
    ctx.lineWidth = 4;
    ctx.strokeStyle = INK;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
    // bóng đèn quanh viền
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const bx = cx + Math.cos(a) * 45.5;
      const by = cy + Math.sin(a) * 45.5;
      ctx.fillStyle = i % 2 ? "#ffffff" : "#fff176";
      ctx.beginPath();
      ctx.arc(bx, by, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = "#e65100";
      ctx.stroke();
    }
    // trục ngọc
    const hub = new Path2D();
    hub.arc(cx, cy, 11, 0, Math.PI * 2);
    ol(ctx, hub, lg(ctx, cy - 11, cy + 11, "#fff59d", "#ffa000"), 4);
    const gem = new Path2D();
    gem.arc(cx, cy, 5, 0, Math.PI * 2);
    ol(ctx, gem, "#e040fb", 2);
    shine(ctx, cx - 3, cy - 3, 2.5, 1.5);
    // kim chỉ phía trên + viên ngọc
    const pin = new Path2D();
    pin.moveTo(cx - 12, 2);
    pin.lineTo(cx + 12, 2);
    pin.lineTo(cx, 22);
    pin.closePath();
    ol(ctx, pin, lg(ctx, 2, 22, "#ff5252", "#b71c1c"), 4);
    const pg = new Path2D();
    pg.arc(cx, 7, 4, 0, Math.PI * 2);
    ol(ctx, pg, "#80d8ff", 2);
    shine(ctx, cx - 24, cy - 22, 10, 5);
  },
  // NHIỆM VỤ: cuộn giấy có dấu tick
  quest: (ctx) => {
    const paper = new Path2D();
    paper.roundRect(26, 20, 76, 88, 6);
    ol(ctx, paper, lg(ctx, 20, 108, "#fffde7", "#ffe082"));
    for (const y of [16, 104]) {
      const roll = new Path2D();
      roll.roundRect(18, y, 92, 16, 8);
      ol(ctx, roll, "#d7a86e", 4);
    }
    for (let i = 0; i < 3; i++) {
      const y = 46 + i * 20;
      const box = new Path2D();
      box.roundRect(36, y - 7, 14, 14, 3);
      ol(ctx, box, "#fff", 3);
      ctx.strokeStyle = "rgba(22,34,63,.45)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(58, y);
      ctx.lineTo(90, y);
      ctx.stroke();
      if (i < 2) {
        ctx.strokeStyle = "#2e7d32";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(38, y);
        ctx.lineTo(43, y + 5);
        ctx.lineTo(52, y - 8);
        ctx.stroke();
      }
    }
  },
  // SỰ KIỆN: hộp quà có nơ + pháo giấy
  event: (ctx) => {
    const box = new Path2D();
    box.roundRect(24, 56, 80, 56, 6);
    ol(ctx, box, lg(ctx, 56, 112, "#ba68c8", "#7b1fa2"));
    const lid = new Path2D();
    lid.roundRect(18, 44, 92, 18, 6);
    ol(ctx, lid, "#ce93d8");
    const rib = new Path2D();
    rib.rect(56, 44, 16, 68);
    ol(ctx, rib, "#ffd54f", 4);
    for (const k of [-1, 1]) {
      const bow = new Path2D();
      bow.ellipse(64 + k * 16, 36, 16, 10, k * 0.5, 0, Math.PI * 2);
      ol(ctx, bow, "#ffca28", 4);
    }
    const knot = new Path2D();
    knot.arc(64, 40, 7, 0, Math.PI * 2);
    ol(ctx, knot, "#ffb300", 3);
    star(ctx, 22, 22, 9, "#4fc3f7");
    star(ctx, 108, 18, 8, "#f48fb1");
    for (const [x, y, c] of [[16, 46, "#66bb6a"], [112, 44, "#ff7043"], [100, 30, "#29b6f6"]] as const) {
      ctx.fillStyle = c;
      ctx.fillRect(x, y, 6, 6);
    }
  },
  // XẾP HẠNG: cúp vàng
  trophy: (ctx) => {
    for (const k of [-1, 1]) {
      const h = new Path2D();
      h.arc(64 + k * 36, 46, 14, k > 0 ? -Math.PI / 2 : Math.PI / 2, k > 0 ? Math.PI / 2 : (Math.PI * 3) / 2, k < 0);
      ctx.lineWidth = 12;
      ctx.strokeStyle = INK;
      ctx.stroke(h);
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#ffca28";
      ctx.stroke(h);
    }
    const cup = new Path2D();
    cup.moveTo(30, 22);
    cup.lineTo(98, 22);
    cup.quadraticCurveTo(98, 78, 64, 82);
    cup.quadraticCurveTo(30, 78, 30, 22);
    cup.closePath();
    ol(ctx, cup, lg(ctx, 22, 82, "#fff59d", "#ffa000"));
    const stem = new Path2D();
    stem.roundRect(56, 80, 16, 16, 3);
    ol(ctx, stem, "#ffb300", 4);
    const base = new Path2D();
    base.roundRect(36, 94, 56, 18, 5);
    ol(ctx, base, "#8d6e63");
    star(ctx, 64, 48, 13, "#fffde7");
    shine(ctx, 44, 36, 6, 14, 0.2);
  },
  // HỘI: cờ hiệu trên khiên
  guild: (ctx) => {
    const sh = new Path2D();
    sh.moveTo(64, 14);
    sh.lineTo(106, 28);
    sh.quadraticCurveTo(106, 90, 64, 116);
    sh.quadraticCurveTo(22, 90, 22, 28);
    sh.closePath();
    ol(ctx, sh, lg(ctx, 14, 116, "#5c6bc0", "#283593"));
    const inner = new Path2D();
    inner.moveTo(64, 26);
    inner.lineTo(94, 36);
    inner.quadraticCurveTo(94, 84, 64, 102);
    inner.quadraticCurveTo(34, 84, 34, 36);
    inner.closePath();
    ol(ctx, inner, "#7986cb", 3);
    star(ctx, 64, 60, 20, "#ffd54f");
    shine(ctx, 46, 38, 6, 12, 0.3);
  },
};

function coinAt(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const c = new Path2D();
  c.arc(x, y, r, 0, Math.PI * 2);
  ol(ctx, c, lg(ctx, y - r, y + r, "#fff59d", "#ffa000"), 4);
  const in2 = new Path2D();
  in2.arc(x, y, r * 0.68, 0, Math.PI * 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#e65100";
  ctx.stroke(in2);
  ctx.fillStyle = "#e65100";
  ctx.font = `900 ${Math.round(r * 0.95)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("$", x, y + 1);
  shine(ctx, x - r * 0.4, y - r * 0.45, r * 0.25, r * 0.12);
}
function gemAt(ctx: CanvasRenderingContext2D, x: number, y: number, k: number, a: string, b: string) {
  const g = new Path2D();
  g.moveTo(x - 30 * k, y - 10 * k);
  g.lineTo(x - 16 * k, y - 28 * k);
  g.lineTo(x + 16 * k, y - 28 * k);
  g.lineTo(x + 30 * k, y - 10 * k);
  g.lineTo(x, y + 30 * k);
  g.closePath();
  ol(ctx, g, lg(ctx, y - 28 * k, y + 30 * k, a, b));
  ctx.strokeStyle = "rgba(255,255,255,.7)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x - 30 * k, y - 10 * k);
  ctx.lineTo(x + 30 * k, y - 10 * k);
  ctx.moveTo(x - 10 * k, y - 10 * k);
  ctx.lineTo(x, y + 30 * k);
  ctx.lineTo(x + 10 * k, y - 10 * k);
  ctx.stroke();
  shine(ctx, x - 12 * k, y - 18 * k, 7 * k, 3 * k, -0.3);
}

const PRIZE: Partial<Record<MenuIcon, (ctx: CanvasRenderingContext2D) => void>> = {
  coin: (ctx) => coinAt(ctx, 64, 64, 40),
  coins: (ctx) => {
    coinAt(ctx, 44, 78, 28);
    coinAt(ctx, 84, 78, 28);
    coinAt(ctx, 64, 46, 30);
  },
  diamond: (ctx) => gemAt(ctx, 64, 62, 1.6, "#e1f5fe", "#0288d1"),
  crown: (ctx) => {
    const c = new Path2D();
    c.moveTo(16, 96);
    c.lineTo(20, 36);
    c.lineTo(44, 62);
    c.lineTo(64, 24);
    c.lineTo(84, 62);
    c.lineTo(108, 36);
    c.lineTo(112, 96);
    c.closePath();
    ol(ctx, c, lg(ctx, 24, 96, "#fff59d", "#ff8f00"));
    const band = new Path2D();
    band.roundRect(14, 90, 100, 18, 6);
    ol(ctx, band, "#ffb300");
    for (const [x, col] of [[36, "#e040fb"], [64, "#29b6f6"], [92, "#ff1744"]] as const) {
      const j = new Path2D();
      j.arc(x, 99, 6, 0, Math.PI * 2);
      ol(ctx, j, col, 2.5);
    }
    gemAt(ctx, 64, 60, 0.45, "#e1f5fe", "#00b0ff");
  },
  stone: (ctx) => {
    const top = new Path2D();
    top.moveTo(64, 20);
    top.lineTo(104, 40);
    top.lineTo(64, 60);
    top.lineTo(24, 40);
    top.closePath();
    ol(ctx, top, "#90caf9");
    const l = new Path2D();
    l.moveTo(24, 40);
    l.lineTo(64, 60);
    l.lineTo(64, 108);
    l.lineTo(24, 86);
    l.closePath();
    ol(ctx, l, "#1e88e5");
    const r = new Path2D();
    r.moveTo(104, 40);
    r.lineTo(64, 60);
    r.lineTo(64, 108);
    r.lineTo(104, 86);
    r.closePath();
    ol(ctx, r, "#0d47a1");
  },
  soul: (ctx) => {
    const orb = new Path2D();
    orb.arc(64, 60, 38, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(54, 48, 4, 64, 60, 38);
    g.addColorStop(0, "#f3e5f5");
    g.addColorStop(0.5, "#ce93d8");
    g.addColorStop(1, "#6a1b9a");
    ol(ctx, orb, g);
    ctx.strokeStyle = "rgba(255,255,255,.75)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(48, 72);
    ctx.bezierCurveTo(56, 50, 72, 78, 80, 50);
    ctx.stroke();
    const stand = new Path2D();
    stand.moveTo(40, 96);
    stand.lineTo(88, 96);
    stand.lineTo(80, 114);
    stand.lineTo(48, 114);
    stand.closePath();
    ol(ctx, stand, "#8d6e63", 4);
    shine(ctx, 50, 44, 9, 5);
  },
  ticket: (ctx) => {
    ctx.save();
    ctx.translate(64, 64);
    ctx.rotate(-0.25);
    const t = new Path2D();
    t.moveTo(-48, -26);
    t.lineTo(48, -26);
    t.arc(48, 0, 9, -Math.PI / 2, Math.PI / 2, true);
    t.lineTo(48, 26);
    t.lineTo(-48, 26);
    t.arc(-48, 0, 9, Math.PI / 2, -Math.PI / 2, true);
    t.closePath();
    ol(ctx, t, lg(ctx, -26, 26, "#ff8a80", "#d50000"));
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(22, -20);
    ctx.lineTo(22, 20);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#fff";
    ctx.font = "900 20px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("BOSS", -14, 1);
    ctx.restore();
  },
};

export function drawMenuIcon(ctx: CanvasRenderingContext2D, kind: MenuIcon) {
  (PRIZE[kind] ?? (DRAW as Partial<Record<MenuIcon, (c: CanvasRenderingContext2D) => void>>)[kind])?.(ctx);
}
export const MENU_ICON_SIZE = S;
