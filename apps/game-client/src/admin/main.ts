/**
 * Trang quản trị cho chủ game (admin.html): 💳 duyệt nạp + 👥 xem tài khoản đăng ký.
 * (Phần duyệt nạp) Trang duyệt nạp cho chủ game (admin.html): đăng nhập tài khoản quản trị, xem lệnh theo trạng thái,
 * duyệt / từ chối. Mọi quyền kiểm tra ở máy chủ (hàm admin_* chỉ chạy cho người trong bảng admins).
 */
import { TOPUP_PACKAGES } from "@dccc/game-data";
import * as Online from "../state/online.ts";
import * as Social from "../state/social.ts";

type Status = Social.TopupOrder["status"];
const TABS: [Status, string][] = [
  ["pending", "⏳ Chờ duyệt"],
  ["approved", "✅ Đã duyệt (chưa nhận)"],
  ["claimed", "✔ Đã nhận"],
  ["rejected", "✖ Từ chối"],
];
const $ = (id: string) => document.getElementById(id)!;
const vnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`;
const pkgName = (id: string) => TOPUP_PACKAGES.find((p) => p.id === id)?.name ?? id;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
let tab: Status = "pending";
let view: "topup" | "users" = "topup";
let timer: ReturnType<typeof setInterval> | null = null;

function say(text: string, err = false) {
  const m = $("msg");
  m.textContent = text;
  m.className = err ? "msg err" : "msg";
  setTimeout(() => m.classList.add("hidden"), 5000);
}

async function boot() {
  if (!Online.onlineConfigured()) {
    say("Bản web này chưa cấu hình máy chủ Supabase.", true);
    return;
  }
  const user = await Online.currentUser();
  if (!user) return showLogin();
  if (!(await Social.isAdmin().catch(() => false))) {
    showLogin();
    say(`Tài khoản ${user.email} chưa có quyền quản trị. Xem docs/TOPUP_ADMIN.md để cấp quyền.`, true);
    return;
  }
  $("login").classList.add("hidden");
  $("nav").classList.remove("hidden");
  setView(view);
  renderTabs();
  await refresh();
  timer ??= setInterval(() => void refresh(), 20_000);
}

function showLogin() {
  $("app").classList.add("hidden");
  $("users").classList.add("hidden");
  $("nav").classList.add("hidden");
  $("login").classList.remove("hidden");
}

function renderTabs() {
  $("tabs").innerHTML = "";
  for (const [s, label] of TABS) {
    const b = document.createElement("button");
    b.textContent = label;
    if (s === tab) b.className = "on";
    b.onclick = () => {
      tab = s;
      renderTabs();
      void refresh();
    };
    $("tabs").appendChild(b);
  }
}

async function refresh() {
  try {
    const [cur, pending, approved, claimed] = await Promise.all([
      Social.adminListTopups(tab),
      Social.adminListTopups("pending"),
      Social.adminListTopups("approved"),
      Social.adminListTopups("claimed"),
    ]);
    const revenue = [...approved, ...claimed].reduce((s, o) => s + o.amount_vnd, 0);
    $("stats").innerHTML = `
      <div class="stat">Chờ duyệt<b>${pending.length}</b></div>
      <div class="stat">Đã duyệt<b>${approved.length + claimed.length}</b></div>
      <div class="stat">Doanh thu đã duyệt<b>${vnd(revenue)}</b></div>`;
    document.title = pending.length ? `(${pending.length}) Duyệt nạp` : "Duyệt nạp – Đại Chiến Câu Cá";
    const list = $("list");
    list.innerHTML = cur.length ? "" : `<div class="card meta">Không có lệnh nào.</div>`;
    for (const o of cur) {
      const el = document.createElement("div");
      el.className = "card row";
      el.innerHTML = `<div><div class="code">${esc(o.code)}</div>
        <div><b>${vnd(o.amount_vnd)}</b> · ${esc(pkgName(o.package))}</div>
        <div class="meta">Người chơi: ${esc(o.player_name || "(chưa đặt tên)")} · ${new Date(o.created_at).toLocaleString("vi-VN")}</div></div>`;
      if (o.status === "pending") {
        const act = document.createElement("div");
        act.className = "actions";
        const ok = document.createElement("button");
        ok.className = "ok";
        ok.textContent = "✅ Duyệt";
        ok.onclick = () => void decide(o, true, ok);
        const no = document.createElement("button");
        no.className = "bad";
        no.textContent = "✖ Từ chối";
        no.onclick = () => void decide(o, false, no);
        act.append(ok, no);
        el.appendChild(act);
      }
      list.appendChild(el);
    }
  } catch (e) {
    say(`Không tải được: ${(e as Error).message}`, true);
  }
}

async function decide(o: Social.TopupOrder, approve: boolean, btn: HTMLButtonElement) {
  const q = approve
    ? `Duyệt lệnh ${o.code} – ${vnd(o.amount_vnd)} (${pkgName(o.package)})?\nChỉ duyệt khi sao kê đã có đúng số tiền và nội dung.`
    : `Từ chối lệnh ${o.code}?`;
  if (!confirm(q)) return;
  btn.disabled = true;
  try {
    await Social.adminDecideTopup(o.id, approve);
    say(approve ? `Đã duyệt ${o.code}. Người chơi bấm "Kiểm tra & nhận" hoặc mở lại game để nhận.` : `Đã từ chối ${o.code}.`);
    await refresh();
  } catch (e) {
    say((e as Error).message, true);
    btn.disabled = false;
  }
}

// ------------------------------------------------------------ 👥 Tài khoản
function setView(v: typeof view) {
  view = v;
  $("navTopup").className = v === "topup" ? "on" : "";
  $("navUsers").className = v === "users" ? "on" : "";
  $("app").classList.toggle("hidden", v !== "topup");
  $("users").classList.toggle("hidden", v !== "users");
  if (v === "users") void loadUsers();
}

const ago = (iso: string | null) => {
  if (!iso) return "—";
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m} phút trước`;
  if (m < 1440) return `${Math.round(m / 60)} giờ trước`;
  return `${Math.round(m / 1440)} ngày trước`;
};
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "—");
const num = (n: number | null | undefined) => (n ?? 0).toLocaleString("vi-VN");

async function loadUsers() {
  const q = ($("uq") as HTMLInputElement).value.trim();
  try {
    const rows = await Social.adminListUsers(q);
    const all = q ? null : rows;
    if (all) {
      const today = new Date().toDateString();
      const online = all.filter((u) => u.last_seen && Date.now() - Date.parse(u.last_seen) < 4 * 60000).length;
      const newToday = all.filter((u) => new Date(u.created_at).toDateString() === today).length;
      const noSave = all.filter((u) => !u.save_updated_at).length;
      $("ustats").innerHTML = `
        <div class="stat">Tổng tài khoản<b>${all.length}</b></div>
        <div class="stat">Đang online<b>${online}</b></div>
        <div class="stat">Đăng ký hôm nay<b>${newToday}</b></div>
        <div class="stat">Chưa có tiến trình<b>${noSave}</b></div>`;
    }
    const tb = $("ulist");
    tb.innerHTML = rows.length ? "" : `<tr><td colspan="8" class="meta">Không tìm thấy tài khoản nào.</td></tr>`;
    for (const u of rows) {
      const tr = document.createElement("tr");
      tr.className = "user";
      const online = u.last_seen && Date.now() - Date.parse(u.last_seen) < 4 * 60000;
      tr.innerHTML = `
        <td><b>${esc(u.display_name ?? "(chưa có hồ sơ)")}</b>${u.is_admin ? ' <span class="tag adm">QTV</span>' : ""}<div class="meta">${esc(u.friend_code ?? "")}</div></td>
        <td>${esc(u.email ?? "")}${u.confirmed ? "" : ' <span class="tag warn">chưa xác nhận</span>'}</td>
        <td>${u.level ?? "—"}</td>
        <td>${num(u.total_caught)}<div class="meta">${num(u.fishes)} trong kho</div></td>
        <td>${num(u.gold)}<div class="meta">💎 ${num(u.diamonds)}</div></td>
        <td>${u.topup_vnd ? vnd(u.topup_vnd) : "—"}</td>
        <td>${day(u.created_at)}</td>
        <td><span class="tag ${online ? "on" : "off"}">${online ? "online" : "offline"}</span><div class="meta">${ago(u.last_seen ?? u.last_sign_in_at)}</div>${u.save_updated_at ? "" : '<span class="tag warn">chưa có tiến trình</span>'}</td>`;
      tr.onclick = () => void openUser(u);
      tb.appendChild(tr);
    }
  } catch (e) {
    say(`Không tải được danh sách tài khoản: ${(e as Error).message}`, true);
  }
}

async function openUser(u: Social.AdminUserRow) {
  const box = $("udetail");
  box.innerHTML = `<p class="meta">Đang tải…</p>`;
  ($("udlg") as HTMLDialogElement).showModal();
  try {
    const d = await Social.adminUserDetail(u.user_id);
    const s = d.save;
    const chars = s ? Object.keys(s.characters).length : 0;
    const rods = s ? Object.keys(s.rods).length : 0;
    box.innerHTML = `
      <h2 style="margin:0 0 4px">${esc(u.display_name ?? "(chưa có hồ sơ)")}</h2>
      <div class="meta">${esc(u.email ?? "")} · UID ${esc(u.user_id)}<br>Mã người chơi: ${esc(s?.playerId ?? "—")} · Đăng ký ${day(u.created_at)} · Đăng nhập gần nhất ${day(u.last_sign_in_at)}</div>
      ${
        s
          ? `<div class="kv">
        <div>Tên trong game<b>${esc(s.name)}</b></div><div>Cấp<b>${s.level}</b></div>
        <div>Vàng<b>${num(s.gold)}</b></div><div>Kim cương<b>${num(s.diamonds)}</b></div>
        <div>Cá đã câu<b>${num(s.stats.totalCaught)}</b></div><div>Boss đã câu<b>${num(s.stats.bossesCaught)}</b></div>
        <div>Cá trong kho<b>${s.fishes.length}</b></div><div>Cá nướng<b>${s.roasted.length}</b></div>
        <div>Nhân vật / Cần<b>${chars} / ${rods}</b></div><div>Thắng Sinh Tử<b>${num(s.stats.dmWins)}</b></div>
        <div>Đua cá (thắng)<b>${num(s.stats.races)} (${num(s.stats.raceWins)})</b></div><div>Lưu lần cuối<b>${day(u.save_updated_at)}</b></div>
      </div>`
          : `<p class="meta">Tài khoản này chưa có tiến trình trên máy chủ.</p>`
      }
      <h3 style="margin:14px 0 6px">💳 Lịch sử nạp</h3>
      ${d.topups.length ? d.topups.map((t) => `<div class="meta">${esc(t.code)} · ${vnd(t.amount_vnd)} · ${esc(pkgName(t.package))} · ${esc(t.status)} · ${day(t.created_at)}</div>`).join("") : '<div class="meta">Chưa nạp.</div>'}
      <h3 style="margin:14px 0 6px">🗂 Bản sao lưu gần đây (${d.backups.length})</h3>
      ${
        d.backups.length
          ? `<div class="tablewrap" style="max-height:220px"><table><thead><tr><th>Thời gian</th><th>Tên</th><th>Cấp</th><th>Cá đã câu</th><th>Mã người chơi</th><th>Lý do</th></tr></thead><tbody>${d.backups
              .map(
                (b) =>
                  `<tr><td>${day(b.created_at)}</td><td>${esc(b.name ?? "")}</td><td>${b.level}</td><td>${esc(b.caught ?? "")}</td><td class="meta">${esc(b.player_id ?? "")}</td><td>${esc(b.reason)}</td></tr>`,
              )
              .join("")}</tbody></table></div>`
          : '<div class="meta">Chưa có bản sao lưu.</div>'
      }`;
  } catch (e) {
    box.innerHTML = `<p class="msg err">${esc((e as Error).message)}</p>`;
  }
}

$("navTopup").onclick = () => setView("topup");
$("navUsers").onclick = () => setView("users");
$("uSearch").onclick = () => void loadUsers();
($("uq") as HTMLInputElement).onkeydown = (e) => {
  if (e.key === "Enter") void loadUsers();
};
$("udClose").onclick = () => ($("udlg") as HTMLDialogElement).close();

$("btnLogin").onclick = async () => {
  const r = await Online.signIn(($("email") as HTMLInputElement).value.trim(), ($("pass") as HTMLInputElement).value);
  if (!r.ok) return say(r.error, true);
  await boot();
};
$("btnLogout").onclick = async () => {
  await Online.signOut();
  if (timer) clearInterval(timer);
  timer = null;
  showLogin();
};
void boot();
