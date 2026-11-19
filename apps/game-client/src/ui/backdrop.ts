import Phaser from "phaser";

/**
 * Nền chung cho các màn menu: đáy biển có tia nắng, rong biển, cát và bọt khí bay lên.
 * Vẽ một lần thành texture, thêm hạt bọt động. Luôn nằm dưới mọi giao diện.
 */
export function menuBackdrop(scene: Phaser.Scene) {
  const key = "menu_backdrop";
  if (!scene.textures.exists(key)) {
    const t = scene.textures.createCanvas(key, 1280, 720)!;
    const ctx = t.getContext();
    const g = ctx.createLinearGradient(0, 0, 0, 720);
    g.addColorStop(0, "#0e5a8a");
    g.addColorStop(0.55, "#0a3358");
    g.addColorStop(1, "#061c33");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1280, 720);
    // tia nắng
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 9; i++) {
      const x = 80 + i * 150;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 60, 0);
      ctx.lineTo(x - 80, 720);
      ctx.lineTo(x - 200, 720);
      ctx.fill();
    }
    ctx.restore();
    // cát đáy biển
    ctx.fillStyle = "#c9a66b";
    ctx.beginPath();
    ctx.moveTo(0, 720);
    for (let x = 0; x <= 1280; x += 40) ctx.lineTo(x, 680 - Math.sin(x / 90) * 14 - Math.sin(x / 33) * 4);
    ctx.lineTo(1280, 720);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(0, 700, 1280, 20);
    // rong biển
    const weed = (x: number, h: number, c: string) => {
      ctx.strokeStyle = c;
      ctx.lineWidth = 10;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x, 700);
      for (let y = 700; y > 700 - h; y -= 20) ctx.quadraticCurveTo(x + (y % 40 ? 18 : -18), y - 10, x, y - 20);
      ctx.stroke();
    };
    for (const [x, h] of [[30, 160], [60, 110], [1220, 180], [1250, 120], [640, 70], [420, 90], [900, 100]] as const) weed(x, h, "rgba(46,125,50,0.7)");
    // san hô
    ctx.fillStyle = "rgba(255,112,67,0.7)";
    for (const x of [140, 1120]) {
      for (let k = 0; k < 5; k++) {
        ctx.beginPath();
        ctx.ellipse(x + (k - 2) * 14, 680 - k * 6, 9, 30 + k * 4, (k - 2) * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // đốm sáng mờ
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(255,255,255,${(0.03 + (i % 5) * 0.015).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc((i * 337) % 1280, (i * 151) % 640, 2 + (i % 4), 0, Math.PI * 2);
      ctx.fill();
    }
    t.refresh();
  }
  scene.add.image(0, 0, key).setOrigin(0).setDepth(-100);
  scene.add
    .particles(0, 0, "p_bubble", {
      x: { min: 0, max: 1280 },
      y: 730,
      speedY: { min: -70, max: -30 },
      speedX: { min: -8, max: 8 },
      lifespan: 9000,
      frequency: 350,
      scale: { min: 0.5, max: 1.4 },
      alpha: { start: 0.6, end: 0 },
    })
    .setDepth(-99);
}
