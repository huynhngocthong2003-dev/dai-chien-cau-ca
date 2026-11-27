import { describe, expect, it } from "vitest";
import { applySnapshot, Arena, encodeInput, encodeSnapshot, EventLog, IDLE_INPUT, RemoteInput, SNAPSHOT_BUDGET } from "./index.ts";

const humans = [
  { id: "h0", name: "Chủ phòng", heroId: "mage" },
  { id: "h1", name: "Bạn", heroId: "fighter" },
];

describe("chơi chung", () => {
  it("phòng 2 người: 2 người thật + 18 máy, mọi máy dựng trận giống hệt nhau", () => {
    const host = new Arena({ seed: 77, playerName: "", heroId: "mage", gender: "male", humans, localId: "h0" });
    const client = new Arena({ seed: 77, playerName: "", heroId: "mage", gender: "male", humans, localId: "h1" });
    expect(host.fighters).toHaveLength(20);
    expect(host.fighters.filter((f) => !f.bot)).toHaveLength(2);
    expect(client.player.id).toBe("h1");
    expect(client.fighters.map((f) => f.state.heroId)).toEqual(host.fighters.map((f) => f.state.heroId));
    expect(client.props.map((p) => [p.kind, Math.round(p.x)])).toEqual(host.props.map((p) => [p.kind, Math.round(p.x)]));
  });

  it("ảnh chụp gọn trong ngân sách, áp vào máy khách đúng vị trí/máu/sự kiện; thao tác mạng điều khiển được nhân vật", () => {
    const host = new Arena({ seed: 78, playerName: "", heroId: "mage", gender: "male", humans, localId: "h0" });
    const client = new Arena({ seed: 78, playerName: "", heroId: "mage", gender: "male", humans, localId: "h1" });
    const log = new EventLog();
    const remote = new RemoteInput();
    const h1 = host.fighterById("h1")!;
    const x0 = h1.x;
    let lastSeq = 0;
    for (let step = 0; step < 600; step++) {
      // người chơi h1 chạy sang phải, bấm kỹ năng 1 lần ở bước 10
      const raw = encodeInput({ moveX: 1, moveY: 0, attack: true, cast: null, usePotion: false }, step >= 10 ? 1 : 0, "s1", 0);
      const ev = host.tickMulti(1 / 60, { h0: IDLE_INPUT, h1: remote.decode(raw) });
      log.push(ev, host.time, new Set(["h0", "h1"]));
      if (step % 4 === 0) {
        const snap = encodeSnapshot(host, log, ["h0", "h1"]);
        expect(JSON.stringify(snap).length).toBeLessThanOrEqual(SNAPSHOT_BUDGET);
        const r = applySnapshot(client, snap, lastSeq);
        lastSeq = r.lastSeq;
        for (const [id, t] of r.targets.fighters) {
          const hf = host.fighterById(id)!;
          expect(Math.abs(t.x - hf.x)).toBeLessThanOrEqual(1);
        }
      }
    }
    expect(h1.x).toBeGreaterThan(x0 + 300);
    expect(lastSeq).toBeGreaterThan(0);
    const c1 = client.fighterById("h1")!;
    expect(c1.state.hp).toBe(Math.round(h1.state.hp));
    expect(c1.state.level).toBe(h1.state.level);
    expect(client.zone.radius).toBe(Math.round(host.zone.radius));
  });

  it("kỹ năng / bình máu chỉ kích một lần cho mỗi số thứ tự", () => {
    const r = new RemoteInput();
    expect(r.decode([0, 0, 0, 0, 1, 2, 0]).cast).toBe("s3");
    expect(r.decode([0, 0, 0, 0, 1, 2, 0]).cast).toBeNull();
    expect(r.decode([0, 0, 0, 0, 1, 2, 1]).usePotion).toBe(true);
    expect(r.decode("rác").moveX).toBe(0);
    expect(r.choice([1, 0, "fire_mage"])).toEqual({ kind: 0, id: "fire_mage" });
    expect(r.choice([1, 0, "fire_mage"])).toBeNull();
  });
});
