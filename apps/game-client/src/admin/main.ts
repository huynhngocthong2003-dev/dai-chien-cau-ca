/**
 * Trang duyệt nạp cho chủ game (admin.html): đăng nhập tài khoản quản trị, xem lệnh theo trạng thái,
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
  $("app").classList.remove("hidden");
  renderTabs();
  await refresh();
  timer ??= setInterval(() => void refresh(), 20_000);
}

function showLogin() {
  $("app").classList.add("hidden");
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
