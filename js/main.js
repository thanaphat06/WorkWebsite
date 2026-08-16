/* ฟังก์ชันร่วมสำหรับทุกหน้า */

function $(sel, root) { return (root || document).querySelector(sel); }
function $all(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

function fmtMoney(n) {
  const num = Number(n) || 0;
  return num.toLocaleString("th-TH") + " บาท";
}

function esc(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

function addDaysISO(base, days) {
  const d = new Date(base + "T00:00:00");
  d.setDate(d.getDate() + days);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

function formatDateThai(iso) {
  if (!iso) return "-";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const month = thaiMonths[Number(parts[1]) - 1];
  return `${Number(parts[2])} ${month} ${Number(parts[0]) + 543}`;
}

/* ---------- API helper ---------- */
async function apiCall(action, payload, { method = "POST" } = {}) {
  const url = window.AppConfig.appsScriptUrl;
  if (!url) {
    throw new Error("ยังไม่ได้ตั้งค่า Apps Script URL ใน js/config.js (ดู README.md)");
  }

  const options = {
    method: "POST",
    // ใช้ text/plain เพื่อเลี่ยง CORS preflight บน GitHub Pages
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      action,
      ...payload,
      _ts: Date.now(),
    }),
  };

  let res;
  try {
    res = await fetch(url, options);
  } catch (e) {
    throw new Error("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบอินเทอร์เน็ต แล้วลองอีกครั้ง");
  }

  let text = "";
  try { text = await res.text(); } catch (_) {}

  let data;
  try { data = JSON.parse(text); } catch (_) {
    data = { success: false, message: text || "การตอบกลับจากเซิร์ฟเวอร์ไม่ถูกต้อง" };
  }

  if (!data.success) {
    throw new Error(data.message || "เกิดข้อผิดพลาด กรุณาลองใหม่");
  }
  return data;
}

/* ---------- Toast ---------- */
function toast(msg, { gold = false } = {}) {
  let el = $("#toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.toggle("gold", gold);
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 3200);
}

/* ---------- Mobile nav ---------- */
function initNav() {
  const toggle = $("#navToggle");
  const links = $("#navLinks");
  if (toggle && links) {
    toggle.addEventListener("click", () => links.classList.toggle("open"));
    $all(".nav-links a", links).forEach(a => a.addEventListener("click", () => links.classList.remove("open")));
  }
}

/* ---------- ปีใน footer ---------- */
function initYear() {
  $all(".year").forEach(el => { el.textContent = new Date().getFullYear() + 543; });
}

document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initYear();
});
