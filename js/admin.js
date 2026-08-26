/* Admin Dashboard — จัดการคำขอนัดหมายและบริการ */

const ADMIN_PIN_KEY = "eyes_admin_pin";
const ADMIN_SESSION_KEY = "eyes_admin_logged_in";

const apptCache = { list: [] };
let serviceCache = [];

function getPin() { return sessionStorage.getItem(ADMIN_PIN_KEY) || ""; }
function isLoggedIn() { return sessionStorage.getItem(ADMIN_SESSION_KEY) === "1"; }

function setLoggedIn(on) {
  sessionStorage.setItem(ADMIN_SESSION_KEY, on ? "1" : "0");
  if (!on) sessionStorage.removeItem(ADMIN_PIN_KEY);
}

function statusBadge(status) {
  const s = window.AppConfig.statusMap[status] || { label: status, cls: "status-pending" };
  return `<span class="status-badge ${s.cls}">${esc(s.label)}</span>`;
}

function showView(name) {
  document.querySelectorAll(".admin-side a").forEach(a =>
    a.classList.toggle("active", a.dataset.view === name));
  document.getElementById("view-appointments").style.display = name === "appointments" ? "" : "none";
  document.getElementById("view-services").style.display = name === "services" ? "" : "none";
}

/* ---------- Login / Logout ---------- */
async function login() {
  const pin = $("#pinInput").value.trim();
  if (!pin) { toast("กรุณากรอก PIN", { gold: true }); return; }
  try {
    await apiCall("adminLogin", { pin });
    sessionStorage.setItem(ADMIN_PIN_KEY, pin);
    setLoggedIn(true);
    enterDashboard();
  } catch (e) {
    toast(e.message, { gold: true });
  }
}

function logout() {
  setLoggedIn(false);
  $("#loginView").style.display = "";
  $("#dashView").style.display = "none";
  $("#btnLogout").style.display = "none";
}

function enterDashboard() {
  $("#loginView").style.display = "none";
  $("#dashView").style.display = "";
  $("#btnLogout").style.display = "";
  loadDashboard();
}

/* ---------- Dashboard data ---------- */
async function loadDashboard() {
  try {
    const [apptData, svcData] = await Promise.all([
      apiCall("adminList", { pin: getPin() }),
      apiCall("getServices"),
    ]);
    apptCache.list = apptData.appointments || [];
    serviceCache = svcData.services || [];
    renderSummary();
    renderTable();
    renderServiceTable();
  } catch (e) {
    toast(e.message, { gold: true });
    logout();
  }
}

function renderSummary() {
  const list = apptCache.list;
  const today = todayISO();
  const todayCount = list.filter(a => a.appointment_date === today).length;

  const cards = [
    { lbl: "นัดหมายทั้งหมด", num: list.length, cls: "" },
    { lbl: "รอยืนยัน", num: list.filter(a => a.status === "pending").length, cls: "" },
    { lbl: "ยืนยันแล้ว", num: list.filter(a => a.status === "confirmed").length, cls: "" },
    { lbl: "วันนี้", num: todayCount, cls: "gold" },
    { lbl: "เสร็จสิ้น", num: list.filter(a => a.status === "completed").length, cls: "" },
  ];

  $("#summaryCards").innerHTML = cards.map(c =>
    `<div class="card sum-card ${c.cls}"><div class="num">${c.num}</div><div class="lbl">${c.lbl}</div></div>`
  ).join("");
}

function locLabel(a) {
  if (a.location_type === "home") return "ไปหาลูกค้า";
  if (a.location_type === "place") return "สถานที่นัดหมาย";
  return "-";
}

function renderTable() {
  const tbody = $("#apptTableBody");
  const filter = $("#filterStatus").value;
  const list = filter === "all" ? apptCache.list : apptCache.list.filter(a => a.status === filter);

  list.sort((x, y) => (x.appointment_date || "").localeCompare(y.appointment_date || ""));

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><span class="icon">🍃</span>ไม่พบคำขอนัดหมาย</div></td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(a => `
    <tr>
      <td class="bold">${esc(a.booking_id)}</td>
      <td>${esc(a.name)}</td>
      <td><a href="tel:${esc(a.phone)}">${esc(a.phone)}</a></td>
      <td>${esc((a.services_text || a.services || "-").split(", ").slice(0, 2).join(", "))}</td>
      <td>${esc(formatDateThai(a.appointment_date))}</td>
      <td>${esc(a.preferred_time)}</td>
      <td>${esc(locLabel(a))}</td>
      <td>${statusBadge(a.status)}</td>
      <td><button class="btn btn-dark btn-sm" data-open="${esc(a.booking_id)}">ดูรายละเอียด</button></td>
    </tr>
  `).join("");

  tbody.querySelectorAll("[data-open]").forEach(btn => {
    btn.addEventListener("click", () => openDetail(btn.dataset.open));
  });
}

function renderServiceTable() {
  const tbody = $("#serviceTableBody");
  if (!serviceCache.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">ยังไม่มีบริการ</div></td></tr>`;
    return;
  }
  tbody.innerHTML = serviceCache.map(s => `
    <tr>
      <td class="bold">${esc(s.id)}</td>
      <td>${esc(s.category === "massage" ? "นวด" : "ต่อขนตา")}</td>
      <td>${esc(s.name)}</td>
      <td>${esc(s.duration)}</td>
      <td class="bold">${fmtMoney(s.price)}</td>
      <td>${s.status === "active" || !s.status ? '<span class="status-badge status-completed">ใช้งาน</span>' : '<span class="status-badge status-cancelled">ปิด</span>'}</td>
      <td>
        <button class="btn btn-outline btn-sm" data-edit-svc="${esc(s.id)}">แก้ไข</button>
        <button class="btn btn-outline btn-sm" style="border-color:#d88; color:#b34040;" data-toggle-svc="${esc(s.id)}">${s.status === "active" || !s.status ? "ปิด" : "เปิด"}</button>
        <button class="btn btn-outline btn-sm" style="border-color:#d88; color:#b34040;" data-delete-svc="${esc(s.id)}">ลบ</button>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll("[data-edit-svc]").forEach(btn => {
    btn.addEventListener("click", () => openServiceModal(btn.dataset.editSvc));
  });
  tbody.querySelectorAll("[data-toggle-svc]").forEach(btn => {
    btn.addEventListener("click", () => toggleService(btn.dataset.toggleSvc));
  });
  tbody.querySelectorAll("[data-delete-svc]").forEach(btn => {
    btn.addEventListener("click", () => deleteService(btn.dataset.deleteSvc));
  });
}

/* ---------- Detail modal ---------- */
function findAppt(id) { return apptCache.list.find(a => a.booking_id === id); }

function openDetail(id) {
  const a = findAppt(id);
  if (!a) { toast("ไม่พบข้อมูล", { gold: true }); return; }

  $("#modalRef").textContent = a.booking_id;
  $("#modalStatusBadge").innerHTML = statusBadge(a.status);
  $("#mName").textContent = a.name || "-";
  $("#mPhone").textContent = a.phone || "-";
  $("#mLine").textContent = a.line_id || "-";
  $("#mPeople").textContent = (a.number_of_people || 1) + " คน";
  $("#mServices").textContent = a.services_text || a.services || "-";
  $("#mTotal").textContent = a.estimated_total ? fmtMoney(a.estimated_total) : "-";
  $("#mDate").textContent = formatDateThai(a.appointment_date);
  $("#mTime").textContent = a.preferred_time || "-";
  $("#mLocType").textContent = a.location_type === "home" ? "ให้ร้านไปหาลูกค้า" : a.location_type === "place" ? "ไปใช้บริการที่สถานที่นัดหมาย" : "-";
  $("#mAddress").textContent = a.address || "-";
  $("#mLocDetail").textContent = a.location_detail || "-";
  $("#mNote").textContent = a.note || "-";
  $("#mAdminNote").value = a.admin_note || "";

  $("#btnCall").href = "tel:" + (a.phone || "");
  $("#apptModal").classList.add("show");
  document.body.style.overflow = "hidden";
}

function closeModal(id) {
  $("#" + id).classList.remove("show");
  document.body.style.overflow = "";
}

/* ---------- Status actions ---------- */
async function changeStatus(status) {
  const a = currentAppt();
  if (!a) return;
  try {
    const data = await apiCall("adminUpdate", {
      pin: getPin(), booking_id: a.booking_id, status,
    });
    toast(data.message || "อัปเดตสถานะแล้ว");
    closeModal("apptModal");
    await loadDashboard();
  } catch (e) { toast(e.message, { gold: true }); }
}

function currentAppt() {
  const id = $("#modalRef").textContent;
  return findAppt(id);
}

/* ---------- Admin note ---------- */
async function saveNote() {
  const a = currentAppt();
  if (!a) return;
  const note = $("#mAdminNote").value.trim();
  try {
    await apiCall("adminNote", { pin: getPin(), booking_id: a.booking_id, admin_note: note });
    toast("บันทึกหมายเหตุแล้ว");
    a.admin_note = note;
  } catch (e) { toast(e.message, { gold: true }); }
}

/* ---------- Edit appointment ---------- */
function openEdit() {
  const a = currentAppt();
  if (!a) return;
  $("#eDate").value = a.appointment_date || "";
  $("#eTime").innerHTML = window.AppConfig.timeSlots.map(t =>
    `<option ${t === a.preferred_time ? "selected" : ""}>${esc(t)}</option>`).join("");
  $("#eLocType").value = a.location_type === "home" ? "home" : "place";
  $("#eAddress").value = a.address || "";
  closeModal("apptModal");
  $("#editModal").classList.add("show");
  document.body.style.overflow = "hidden";
}

async function saveEdit() {
  const a = currentAppt();
  if (!a) return;
  const payload = {
    pin: getPin(),
    booking_id: a.booking_id,
    appointment_date: $("#eDate").value,
    preferred_time: $("#eTime").value,
    location_type: $("#eLocType").value,
    address: $("#eAddress").value.trim(),
  };
  if (!payload.appointment_date) { toast("กรุณาเลือกวันที่", { gold: true }); return; }
  try {
    await apiCall("adminUpdate", payload);
    toast("บันทึกการเปลี่ยนแปลงแล้ว");
    closeModal("editModal");
    await loadDashboard();
  } catch (e) { toast(e.message, { gold: true }); }
}

/* ---------- Services ---------- */
function parseOptions(str) {
  if (!str) return [];
  try { return JSON.parse(str); } catch (_) { return []; }
}

function renderOptionRows(options) {
  const wrap = $("#svcOptionsList");
  wrap.innerHTML = options.map((o, i) => `
    <div class="option-row">
      <input type="text" class="opt-label" placeholder="เช่น 3D" value="${esc(o.label || "")}" />
      <input type="number" class="opt-price" placeholder="ราคา" value="${o.price || ""}" />
      <button type="button" class="btn-remove-option" data-rm="${i}">✕</button>
    </div>
  `).join("");
  wrap.querySelectorAll("[data-rm]").forEach(btn => {
    btn.addEventListener("click", () => {
      const rows = wrap.querySelectorAll(".option-row");
      rows[Number(btn.dataset.rm)].remove();
    });
  });
}

function addOptionRow() {
  const wrap = $("#svcOptionsList");
  const div = document.createElement("div");
  div.className = "option-row";
  div.innerHTML = `
    <input type="text" class="opt-label" placeholder="เช่น 3D" />
    <input type="number" class="opt-price" placeholder="ราคา" />
    <button type="button" class="btn-remove-option">✕</button>
  `;
  div.querySelector(".btn-remove-option").addEventListener("click", () => div.remove());
  wrap.appendChild(div);
}

function collectOptions() {
  const rows = $("#svcOptionsList").querySelectorAll(".option-row");
  const arr = [];
  rows.forEach(row => {
    const label = row.querySelector(".opt-label").value.trim();
    const price = Number(row.querySelector(".opt-price").value) || 0;
    if (label && price > 0) arr.push({ label, price });
  });
  return arr.length ? JSON.stringify(arr) : "";
}

function openServiceModal(id) {
  if (id) {
    const s = serviceCache.find(x => String(x.id) === String(id));
    if (!s) return;
    $("#svcModalTitle").textContent = "แก้ไขบริการ";
    $("#svcId").value = s.id;
    $("#svcCategory").value = s.category;
    $("#svcName").value = s.name;
    $("#svcDesc").value = s.description || "";
    $("#svcDuration").value = s.duration || "";
    $("#svcPrice").value = s.price || "";
    renderOptionRows(parseOptions(s.options));
    $("#svcImage").value = s.image || "";
    $("#svcImageFile").value = "";
    if (s.image) {
      $("#svcImagePreviewImg").src = s.image;
      $("#svcImagePreview").style.display = "";
      $("#svcImageName").textContent = s.image.split("/").pop();
    } else {
      $("#svcImagePreview").style.display = "none";
      $("#svcImageName").textContent = "ยังไม่ได้เลือกรูป";
    }
  } else {
    $("#svcModalTitle").textContent = "เพิ่มบริการ";
    $("#svcId").value = "";
    $("#svcCategory").value = "lash";
    $("#svcName").value = "";
    $("#svcDesc").value = "";
    $("#svcDuration").value = "";
    $("#svcPrice").value = "";
    renderOptionRows([]);
    $("#svcImage").value = "";
    $("#svcImageFile").value = "";
    $("#svcImagePreview").style.display = "none";
    $("#svcImageName").textContent = "ยังไม่ได้เลือกรูป";
  }
  $("#serviceModal").classList.add("show");
  document.body.style.overflow = "hidden";
}

async function saveService() {
  const id = $("#svcId").value;
  const payload = {
    pin: getPin(),
    category: $("#svcCategory").value,
    name: $("#svcName").value.trim(),
    description: $("#svcDesc").value.trim(),
    duration: $("#svcDuration").value.trim(),
    price: Number($("#svcPrice").value) || 0,
    options: collectOptions(),
    image: $("#svcImage").value.trim(),
  };
  if (!payload.name) { toast("กรุณากรอกชื่อบริการ", { gold: true }); return; }
  if (id) payload.id = id;
  try {
    await apiCall("adminSaveService", payload);
    toast("บันทึกบริการแล้ว");
    closeModal("serviceModal");
    await loadDashboard();
  } catch (e) { toast(e.message, { gold: true }); }
}

async function toggleService(id) {
  try {
    await apiCall("adminToggleService", { pin: getPin(), id });
    toast("อัปเดตสถานะบริการแล้ว");
    await loadDashboard();
  } catch (e) { toast(e.message, { gold: true }); }
}

async function deleteService(id) {
  const s = serviceCache.find(x => String(x.id) === String(id));
  if (!s) return;
  if (!confirm("ลบบริการ \"" + s.name + "\" จริงหรือไม่?")) return;
  try {
    await apiCall("adminDeleteService", { pin: getPin(), id });
    toast("ลบบริการแล้ว");
    await loadDashboard();
  } catch (e) { toast(e.message, { gold: true }); }
}

/* ---------- Image upload ---------- */
const MAX_IMAGE_DIMENSION = 300;
const IMAGE_QUALITY = 0.4;

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > MAX_IMAGE_DIMENSION || h > MAX_IMAGE_DIMENSION) {
          if (w > h) {
            h = Math.round(h * MAX_IMAGE_DIMENSION / w);
            w = MAX_IMAGE_DIMENSION;
          } else {
            w = Math.round(w * MAX_IMAGE_DIMENSION / h);
            h = MAX_IMAGE_DIMENSION;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", IMAGE_QUALITY);
        resolve(dataUrl.split(",")[1]);
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function initImageUpload() {
  const fileInput = $("#svcImageFile");
  const pickBtn = $("#btnPickImage");
  const removeBtn = $("#btnRemoveImage");
  const nameEl = $("#svcImageName");
  const preview = $("#svcImagePreview");
  const previewImg = $("#svcImagePreviewImg");
  const statusEl = $("#svcImageUploadStatus");

  pickBtn.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast("ไฟล์รูปต้องไม่เกิน 10 MB", { gold: true });
      fileInput.value = "";
      return;
    }

    nameEl.textContent = file.name;
    statusEl.style.display = "";
    statusEl.textContent = "กำลังย่อรูป...";
    pickBtn.disabled = true;

    try {
      const base64 = await resizeImage(file);
      statusEl.textContent = "กำลังอัปโหลด...";
      const data = await apiCall("uploadImage", { pin: getPin(), image: base64 });

      $("#svcImage").value = data.display_url || data.url;
      previewImg.src = data.display_url || data.url;
      preview.style.display = "";
      statusEl.textContent = "อัปโหลดสำเร็จ";
      setTimeout(() => { statusEl.style.display = "none"; }, 2000);
    } catch (e) {
      toast("อัปโหลดไม่สำเร็จ: " + e.message, { gold: true });
      statusEl.textContent = "";
      statusEl.style.display = "none";
      fileInput.value = "";
      nameEl.textContent = "ยังไม่ได้เลือกรูป";
    }
    pickBtn.disabled = false;
  });

  if (removeBtn) {
    removeBtn.addEventListener("click", () => {
      $("#svcImage").value = "";
      fileInput.value = "";
      nameEl.textContent = "ยังไม่ได้เลือกรูป";
      preview.style.display = "none";
      previewImg.src = "";
    });
  }
}

/* ---------- Wire up ---------- */
document.addEventListener("DOMContentLoaded", () => {
  $("#btnLogin").addEventListener("click", login);
  $("#pinInput").addEventListener("keydown", e => { if (e.key === "Enter") login(); });
  $("#btnLogout").addEventListener("click", logout);

  document.querySelectorAll(".admin-side a[data-view]").forEach(a => {
    a.addEventListener("click", e => { e.preventDefault(); showView(a.dataset.view); });
  });

  $("#filterStatus").addEventListener("change", renderTable);
  $("#btnRefresh").addEventListener("click", loadDashboard);

  $("#modalClose").addEventListener("click", () => closeModal("apptModal"));
  $("#editClose").addEventListener("click", () => closeModal("editModal"));
  $("#svcClose").addEventListener("click", () => closeModal("serviceModal"));
  ["apptModal", "editModal", "serviceModal"].forEach(id => {
    $("#" + id).addEventListener("click", e => { if (e.target.id === id) closeModal(id); });
  });

  document.querySelectorAll(".admin-actions [data-status]").forEach(btn => {
    btn.addEventListener("click", () => changeStatus(btn.dataset.status));
  });
  $("#btnSaveNote").addEventListener("click", saveNote);
  $("#btnEditAppt").addEventListener("click", openEdit);
  $("#btnSaveEdit").addEventListener("click", saveEdit);

  $("#btnAddService").addEventListener("click", () => openServiceModal(null));
  $("#btnSaveService").addEventListener("click", saveService);
  $("#btnAddOption").addEventListener("click", addOptionRow);
  initImageUpload();

  if (isLoggedIn()) enterDashboard();
});
