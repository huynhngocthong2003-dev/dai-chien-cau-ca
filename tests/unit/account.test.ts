import { describe, expect, it } from "vitest";
import { applyCatch, createNewSave, decideSync, isStaleSaveError, pickRecovery, decodeBackup, encodeBackup, type PlayerSave } from "@dccc/shared";
import { CATALOG, FISH_BY_ID } from "@dccc/game-data";
import { parseSave } from "@dccc/validation";

function played(id = "p_a"): PlayerSave {
  let s = createNewSave(id, "Người Chơi", CATALOG, Date.now());
  for (let i = 0; i < 30; i++) {
    const r = applyCatch(s, { txId: `c_${id}_${i}`, fish: FISH_BY_ID.get("f_ca_loc")!, weightKg: 2, zoneId: "z_ben_tan_thu", passives: [], now: Date.now() + i });
    if (!r.ok) throw new Error(r.error);
    s = r.save;
  }
  return s;
}

describe("Mã sao lưu", () => {
  it("mã hóa rồi giải mã cho lại đúng tiến trình, vượt schema", async () => {
    const s = played();
    const code = await encodeBackup(s);
    expect(code.startsWith("DCCC1.")).toBe(true);
    const d = await decodeBackup(code);
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(d.data).toEqual(s);
    expect(parseSave(d.data).ok).toBe(true);
  });

  it("mã được nén gọn hơn JSON", async () => {
    const s = played();
    const code = await encodeBackup(s);
    expect(code.length).toBeLessThan(JSON.stringify(s).length);
  });

  it("chấp nhận mã có xuống dòng/khoảng trắng khi dán", async () => {
    const code = await encodeBackup(played());
    const messy = code.replace(/(.{60})/g, "$1\n ");
    expect((await decodeBackup(messy)).ok).toBe(true);
  });

  it("phát hiện mã bị sửa, bị cắt, hoặc không phải mã", async () => {
    const code = await encodeBackup(played());
    const pos = code.length - 10;
    const tampered = code.slice(0, pos) + (code[pos] === "A" ? "B" : "A") + code.slice(pos + 1);
    expect((await decodeBackup(tampered)).ok).toBe(false);
    expect((await decodeBackup(code.slice(0, code.length - 30))).ok).toBe(false);
    expect((await decodeBackup("xin chào")).ok).toBe(false);
  });
});

describe("Đồng bộ khi đăng nhập", () => {
  it("tài khoản mới → giữ tiến trình máy và tải lên", () => {
    expect(decideSync(played(), null)).toMatchObject({ use: "local", upload: true });
  });
  it("cùng người chơi → lấy bản mới hơn", () => {
    const remote = played("p_same");
    const local = { ...remote, updatedAt: remote.updatedAt + 1000, gold: remote.gold + 5 };
    expect(decideSync(local, remote)).toMatchObject({ use: "local", upload: true });
    expect(decideSync(remote, { ...local })).toMatchObject({ use: "remote", upload: false });
  });
  it("khác người chơi → dùng tài khoản, cất bản trên máy nếu đã chơi", () => {
    expect(decideSync(played("p_x"), played("p_y"))).toMatchObject({ use: "remote", backupLocal: true });
    const fresh = createNewSave("p_new", "Mới", CATALOG, Date.now());
    expect(decideSync(fresh, played("p_y"))).toMatchObject({ use: "remote", backupLocal: false });
  });
});

describe("Đồng bộ 2 máy cùng tài khoản (v0.29)", () => {
  it("máy cũ có updatedAt mới hơn nhưng cấp thấp hơn → vẫn lấy bản tài khoản", () => {
    const remote = { ...played("p_same"), level: 29 };
    const local = { ...remote, level: 17, updatedAt: remote.updatedAt + 99999 };
    expect(decideSync(local, remote)).toMatchObject({ use: "remote", upload: false, backupLocal: true });
  });
  it("máy này cao cấp hơn → đẩy lên", () => {
    const remote = { ...played("p_same"), level: 10 };
    const local = { ...remote, level: 12, updatedAt: remote.updatedAt - 5000 };
    expect(decideSync(local, remote)).toMatchObject({ use: "local", upload: true });
  });
  it("chơi lại từ đầu (resetAt mới) được tôn trọng", () => {
    const remote = { ...played("p_same"), level: 20 };
    const local = { ...createNewSave("p_same", "Mới", CATALOG, Date.now()), resetAt: Date.now() };
    expect(decideSync(local, remote)).toMatchObject({ use: "local", upload: true });
  });
  it("nhận ra lỗi STALE_SAVE từ máy chủ", () => {
    expect(isStaleSaveError("STALE_SAVE: Tiến trình trên máy này cũ hơn")).toBe(true);
    expect(isStaleSaveError("network")).toBe(false);
  });
});

describe("Tìm lại tiến trình bị lỡ trên máy (v0.29.1)", () => {
  it("chọn bản cùng người chơi, tiến xa nhất", () => {
    const acc = { ...played("p_me"), level: 18 };
    const a = { ...acc, level: 21 };
    const b = { ...acc, level: 20 };
    const other = { ...played("p_other"), level: 40 };
    expect(pickRecovery(acc, [b, other, a])?.level).toBe(21);
    expect(pickRecovery(acc, [{ ...acc, level: 10 }, other])).toBeNull();
  });
  it("không lấy lại tiến trình trước khi người chơi tự chơi lại từ đầu", () => {
    const now = Date.now();
    const acc = { ...createNewSave("p_me", "Mới", CATALOG, now), resetAt: now };
    const old = { ...played("p_me"), level: 25, updatedAt: now - 60000 };
    expect(pickRecovery(acc, [old])).toBeNull();
  });
  it("bản khôi phục của quản trị (resetAt khác createdAt) vẫn cho lấy lại", () => {
    const acc = { ...played("p_me"), level: 18, createdAt: Date.now() - 3 * 86400000, resetAt: Date.now() };
    const old = { ...acc, level: 21, updatedAt: Date.now() - 86400000, resetAt: undefined };
    expect(pickRecovery(acc, [old])?.level).toBe(21);
  });
});
