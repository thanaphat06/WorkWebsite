/* ระบบ Step Form จองบริการ (5 ขั้นตอน) */

const state = {
  services: [],
  selectedServices: new Set(),
  customer: { name: "", phone: "", line: "" },
  date: "",
  time: "",
  locationType: "",
  people: 1,
  address: "",
  locDetail: "",
};

let currentStep = 1;
const TOTAL_STEPS = 5;

/* ---------- Load services ---------- */
async function loadServices() {
  const list = document.getElementById("serviceList");
  try {
    const data = await apiCall("getServices");
    state.services = data.services || [];
  } catch (e) {
    list.innerHTML = '<div class="empty-state"><span class="icon">⚠️</span>โหลดรายการบริการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</div>';
    return;
  }

  // รองรับการเลือกบริการล่วงหน้าจาก services.html (booking.html?service=ID)
  const params = new URLSearchParams(location.search);
  const preId = params.get("service");
  if (preId) state.selectedServices.add(String(preId));

  renderServices();
  updateSummary();
}

function renderServices() {
  const list = document.getElementById("serviceList");
  if (!state.services.length) {
    list.innerHTML = '<div class="empty-state"><span class="icon">🍃</span>ยังไม่มีบริการให้เลือกในขณะนี้</div>';
    return;
  }
  list.innerHTML = state.services.map(s => {
    const id = String(s.id);
    const catLabel = s.category === "massage" ? "นวด" : "ต่อขนตา";
    const selected = state.selectedServices.has(id) ? "selected" : "";
    return `
    <div class="service-pick ${selected}" data-id="${id}">
      <span class="check">✓</span>
      <div>
        <span class="sp-cat">${catLabel}</span>
        <div class="sp-name">${esc(s.name)}</div>
        <div class="sp-info">${esc(s.duration)}</div>
      </div>
      <span class="sp-price">${fmtMoney(s.price)}</span>
    </div>`;
  }).join("");

  list.querySelectorAll(".service-pick").forEach(el => {
    el.addEventListener("click", () => {
      const id = el.dataset.id;
      if (state.selectedServices.has(id)) state.selectedServices.delete(id);
      else state.selectedServices.add(id);
      el.classList.toggle("selected", state.selectedServices.has(id));
      updateSummary();
    });
  });
}

/* ---------- Time slots ---------- */
function renderTimeSlots() {
  const wrap = document.getElementById("timeSlots");
  wrap.innerHTML = window.AppConfig.timeSlots.map(t =>
    `<div class="slot" data-time="${esc(t)}">${esc(t)}</div>`
  ).join("");

  wrap.querySelectorAll(".slot").forEach(el => {
    el.addEventListener("click", () => {
      wrap.querySelectorAll(".slot").forEach(s => s.classList.remove("selected"));
      el.classList.add("selected");
      state.time = el.dataset.time;
      updateSummary();
    });
  });
}

/* ---------- Navigation ---------- */
function goToStep(n) {
  if (n < 1 || n > TOTAL_STEPS + 1) return;
  currentStep = n;

  // อัปเดต indicator
  const indicator = document.getElementById("stepsIndicator");
  indicator.dataset.step = Math.min(n, TOTAL_STEPS);
  document.querySelectorAll(".step-dot").forEach(d => {
    const dn = Number(d.dataset.dot);
    d.classList.toggle("active", dn === n);
    d.classList.toggle("done", dn < n);
  });

  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById("step" + i);
    if (el) el.style.display = i === n ? "" : "none";
  }

  const done = document.getElementById("stepDone");
  if (done) done.style.display = n === TOTAL_STEPS + 1 ? "" : "none";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- Validation per step ---------- */
function validateStep(n) {
  if (n === 1) {
    if (state.selectedServices.size === 0) {
      toast("กรุณาเลือกบริการอย่างน้อย 1 รายการ", { gold: true });
      return false;
    }
  }
  if (n === 2) {
    const name = $("#bName").value.trim();
    const phone = $("#bPhone").value.trim();
    if (!name) { toast("กรุณากรอกชื่อ-นามสกุล", { gold: true }); return false; }
    if (!/^0\d{8,9}$/.test(phone)) {
      toast("กรุณากรอกเบอร์โทรศัพท์ 10 หลัก (ขึ้นต้นด้วย 0)", { gold: true });
      return false;
    }
    state.customer = { name, phone, line: $("#bLine").value.trim() };
  }
  if (n === 3) {
    const date = $("#bDate").value;
    if (!date) { toast("กรุณาเลือกวันที่", { gold: true }); return false; }
    if (date < todayISO()) { toast("กรุณาเลือกวันที่ไม่เป็นอดีต", { gold: true }); return false; }
    if (!state.time) { toast("กรุณาเลือกช่วงเวลาที่สะดวก", { gold: true }); return false; }
    state.date = date;
  }
  if (n === 4) {
    if (state.locationType === "home") {
      const type = $("#bLocType").value;
      const addr = $("#bAddress").value.trim();
      if (!type) { toast("กรุณาเลือกประเภทสถานที่", { gold: true }); return false; }
      if (!addr) { toast("กรุณากรอกที่อยู่ / เลขห้อง", { gold: true }); return false; }
      state.people = Number($("#bPeople").value) || 1;
      state.address = addr;
      state.locDetail = $("#bLocDetail").value.trim();
    } else if (state.locationType === "place") {
      state.people = Number($("#bPeople").value) || 1;
      state.address = "";
      state.locDetail = "";
    } else {
      toast("กรุณาเลือกสถานที่ให้บริการ", { gold: true });
      return false;
    }
  }
  return true;
}

/* ---------- Review ---------- */
function renderReview() {
  const list = document.getElementById("reviewList");
  const svc = state.services.filter(s => state.selectedServices.has(String(s.id)));
  const total = svc.reduce((sum, s) => sum + (Number(s.price) || 0), 0);

  const locText = state.locationType === "home"
    ? "ให้ร้านไปหาฉัน"
    : "ไปใช้บริการที่สถานที่นัดหมาย";

  const rows = [
    ["บริการ", svc.map(s => s.name).join(", ") || "-"],
    ["วันที่", formatDateThai(state.date)],
    ["ช่วงเวลาที่สะดวก", state.time],
    ["สถานที่", locText],
    ...(state.locationType === "home" ? [
      ["ประเภทสถานที่", state.locationType === "home" ? $("#bLocType").value : ""],
      ["ที่อยู่", state.address || "-"],
      ["รายละเอียด", state.locDetail || "-"],
    ] : []),
    ["จำนวนผู้ใช้บริการ", state.people + " คน"],
    ["ชื่อ", state.customer.name],
    ["เบอร์โทร", state.customer.phone],
    ["LINE ID", state.customer.line || "-"],
    ["ราคาโดยประมาณ", fmtMoney(total)],
  ];

  list.innerHTML = rows.map(([k, v]) =>
    `<li><span class="rl-label">${esc(k)}</span><span class="rl-value">${esc(v)}</span></li>`
  ).join("");
}

/* ---------- Summary sidebar ---------- */
function updateSummary() {
  const svc = state.services.filter(s => state.selectedServices.has(String(s.id)));
  const total = svc.reduce((sum, s) => sum + (Number(s.price) || 0), 0);

  const sSvc = document.getElementById("sideServices");
  sSvc.innerHTML = `<span class="ss-label">บริการ</span><span style="text-align:right; max-width:180px;">${
    svc.length ? svc.map(s => s.name).join(", ") : "—"
  }</span>`;
  $("#sideDate").textContent = state.date ? formatDateThai(state.date) : "—";
  $("#sideTime").textContent = state.time || "—";
  $("#sideLoc").textContent = state.locationType === "home"
    ? "ให้ร้านไปหาฉัน"
    : state.locationType === "place" ? "สถานที่นัดหมาย" : "—";
  $("#sideTotal").textContent = svc.length ? fmtMoney(total) : "—";
}

/* ---------- Submit ---------- */
async function submitRequest() {
  const btn = document.getElementById("btnSubmit");
  btn.disabled = true;
  btn.textContent = "กำลังส่ง...";

  const svc = state.services.filter(s => state.selectedServices.has(String(s.id)));
  const total = svc.reduce((sum, s) => sum + (Number(s.price) || 0), 0);

  const payload = {
    name: state.customer.name,
    phone: state.customer.phone,
    line_id: state.customer.line,
    service_ids: svc.map(s => s.id),
    services: svc.map(s => ({ id: s.id, name: s.name, category: s.category, price: Number(s.price) || 0 })),
    appointment_date: state.date,
    preferred_time: state.time,
    location_type: state.locationType,
    address: state.address,
    location_detail: state.locDetail,
    number_of_people: state.people,
    note: "",
    estimated_total: total,
  };

  try {
    const data = await apiCall("createRequest", payload);
    const ref = data.booking_id || "BK-" + Date.now();
    document.getElementById("refCode").textContent = ref;
    goToStep(6);
  } catch (e) {
    toast(e.message, { gold: true });
    btn.disabled = false;
    btn.textContent = "ส่งคำขอนัดหมาย";
  }
}

/* ---------- Location selectors ---------- */
function initLocations() {
  document.querySelectorAll(".loc-opt").forEach(opt => {
    opt.addEventListener("click", () => {
      document.querySelectorAll(".loc-opt").forEach(o => o.classList.remove("selected"));
      opt.classList.add("selected");
      state.locationType = opt.dataset.loc;
      updateSummary();
    });
  });
}

/* ---------- Wire up ---------- */
document.addEventListener("DOMContentLoaded", () => {
  loadServices();
  renderTimeSlots();
  initLocations();

  // วันที่ต่ำสุด = พรุ่งนี้
  $("#bDate").min = addDaysISO(todayISO(), 1);

  // ปุ่ม back / next
  document.querySelectorAll("[data-back]").forEach(btn => {
    btn.addEventListener("click", () => goToStep(Number(btn.dataset.back)));
  });
  document.querySelectorAll("[data-next]").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = Number(btn.dataset.next);
      if (validateStep(currentStep)) {
        if (target === 5) renderReview();
        goToStep(target);
      }
    });
  });

  document.getElementById("btnSubmit").addEventListener("click", submitRequest);
});
