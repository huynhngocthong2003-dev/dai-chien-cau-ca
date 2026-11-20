import { describe, expect, it } from "vitest";
import { CATALOG, FISH_BY_ID } from "@dccc/game-data";
import { PLAZA, constrain, createNewSave, depthScale, showOffCandidates, showOffMessage, stepMove, toNorm, toScreen, toShow, type OwnedFish } from "@dccc/shared";

describe("Quảng Trường", () => {
  it("đổi tọa độ chuẩn hóa ↔ màn hình", () => {
    const p = { x: 300, y: 600 };
    const back = toScreen(toNorm(p));
    expect(back.x).toBeCloseTo(300);
    expect(back.y).toBeCloseTo(600);
    expect(toNorm({ x: -100, y: 9999 })).toEqual({ x: 0, y: 1 });
  });

  it("không đi ra ngoài vùng quảng trường hay xuyên đài phun nước", () => {
    const out = constrain({ x: 5000, y: -50 });
    expect(out.x).toBe(PLAZA.right);
    expect(out.y).toBe(PLAZA.top);
    const f = PLAZA.fountain;
    const c = constrain({ x: f.x + 5, y: f.y });
    expect(Math.hypot((c.x - f.x) / f.rx, (c.y - f.y) / f.ry)).toBeGreaterThanOrEqual(0.999);
  });

  it("bấm vào nền: đi dần tới đích rồi dừng", () => {
    let pos = { x: 200, y: 600 };
    const target = { x: 400, y: 600 };
    let steps = 0;
    for (;;) {
      const r = stepMove(pos, 100, { target });
      pos = r.pos;
      steps++;
      if (r.arrived) break;
    }
    expect(pos.x).toBeCloseTo(400);
    expect(steps).toBeGreaterThan(5);
    expect(steps).toBeLessThan(10);
  });

  it("cần điều khiển: đi theo hướng, tốc độ không vượt quá giới hạn", () => {
    const r = stepMove({ x: 300, y: 600 }, 1000, { dir: { x: 5, y: 0 } });
    expect(r.pos.x).toBeCloseTo(300 + PLAZA.speed);
    expect(r.moving).toBe(true);
    expect(stepMove({ x: 300, y: 600 }, 1000, {}).moving).toBe(false);
  });

  it("phối cảnh: gần to hơn xa", () => {
    expect(depthScale(PLAZA.bottom)).toBeGreaterThan(depthScale(PLAZA.top));
  });

  it("khoe cá: cá hiếm và nặng nhất đứng đầu; lời khoe ngắn gọn", () => {
    const s = createNewSave("p_show", "Khoe", CATALOG, 0);
    const mk = (fishId: string, weightKg: number, i: number): OwnedFish => ({ uid: `u${i}`, fishId, weightKg, zoneId: "z", caughtAt: 0, level: 3, stars: 2, locked: false });
    s.fishes = [mk("f_ca_ro", 1, 1), mk("f_boss_lao_ngu", 50, 2), mk("f_ca_ro", 3, 3), mk("f_khong_co", 9, 4)];
    const top = showOffCandidates(s.fishes, FISH_BY_ID);
    expect(top.map((f) => f.uid)).toEqual(["u2", "u3", "u1"]);
    const show = toShow(top[0]!);
    const msg = showOffMessage(show, FISH_BY_ID.get(show.fishId)!);
    expect(msg).toContain("50kg");
    expect(msg.length).toBeLessThanOrEqual(200);
  });
});

describe("Câu cùng nhau – chỗ câu", () => {
  it("6 chỗ cách đều, không chồng nhau, không đè bục của mình hay đồng hồ lực căng", async () => {
    const { FISHING_SPOTS, fishingSpotX } = await import("@dccc/shared");
    const xs = Array.from({ length: FISHING_SPOTS }, (_, i) => fishingSpotX(i));
    for (let i = 1; i < xs.length; i++) expect(xs[i]! - xs[i - 1]!).toBeGreaterThanOrEqual(110); // nhân vật rộng ~80px
    expect(Math.min(...xs) - 50).toBeGreaterThan(330);
    expect(Math.max(...xs) + 60).toBeLessThan(1160);
  });
});
