/* ตรวจสอบสถานะคำขอนัดหมาย */

const STATUS_FLOW = ["pending", "contacting", "confirmed", "inservice", "completed"];

function statusBadge(status) {
  const s = window.AppConfig.statusMap[status] || { label: status, cls: "status-pending" };
  return `<span class="status-badge ${s.cls}">${esc(s.label)}</span>`;
}

function renderTimeline(status) {
  if (status === "cancelled") {
    return `<div class="timeline">
      <div class="tl-item"><div class="tl-dot">✕</div><div><div class="tl-title">คำขอนัดหมายถูกยกเลิก</div><div class="tl-date">กรุณาติดต่อร้านเพื่อสอบถามข้อมูลเพิ่มเติม</div></div></div>
    </div>`;
  }
  if (status === "unable") {
    return `<div class="timeline">
      <div class="tl-item"><div class="tl-dot">!</div><div><div class="tl-title">ยังไม่สามารถติดต่อได้</div><div class="tl-date">ทางร้านจะพยายามติดต่อกลับอีกครั้ง กรุณารอรับสาย</div></div></div>
    </div>`;
  }

  const idx = STATUS_FLOW.indexOf(status);
  const labels = ["ส่งคำขอนัดหมาย", "กำลังติดต่อ", "ยืนยันแล้ว", "กำลังให้บริการ", "เสร็จสิ้น"];
  return `<div class="timeline">` + STATUS_FLOW.map((st, i) => {
    const state = i < idx ? "done" : i === idx ? "active" : "";
    const icon = i === 0 ? "✓" : i === 1 ? "✆" : i === 2 ? "📅" : i === 3 ? "💆" : "✦";
    return `
    <div class="tl-item ${state}">
      <div class="tl-dot">${icon}</div>
      <div>
        <div class="tl-title">${labels[i]}</div>
        <div class="tl-date">${i < idx ? "เรียบร้อยแล้ว" : i === idx ? "กำลังดำเนินการ..." : "เร็ว ๆ นี้"}</div>
      </div>
    </div>`;
  }).join("") + `</div>`;
}

async function checkStatus() {
  const phone = $("#sPhone").value.trim();
  const ref = $("#sRef").value.trim().toUpperCase();
  const box = $("#statusResult");

  if (!/^0\d{8,9}$/.test(phone)) { toast("กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง", { gold: true }); return; }
  if (!/^BK-\d+$/.test(ref)) { toast("กรุณากรอกรหัสอ้างอิงให้ถูกต้อง (เช่น BK-123456)", { gold: true }); return; }

  box.style.display = "none";

  try {
    const data = await apiCall("checkStatus", { phone, booking_id: ref });
    const a = data.appointment;

    if (!a) {
      box.style.display = "block";
      box.innerHTML = `<div class="card empty-state">
        <span class="icon">🔍</span>
        <h3 style="margin-bottom:8px;">ไม่พบข้อมูลคำขอนัดหมาย</h3>
        <p style="color:var(--muted);">กรุณาตรวจสอบเบอร์โทรศัพท์และรหัสอ้างอิงให้ถูกต้อง</p>
      </div>`;
      return;
    }

    const svc = a.services_text || a.services || "-";
    const locText = a.location_type === "home"
      ? `ให้ร้านไปหาฉัน (${a.address || "-"})`
      : a.location_type === "place" ? "ไปใช้บริการที่สถานที่นัดหมาย" : "-";

    box.innerHTML = `
      <div class="card status-card">
        <div class="status-card-head">
          <span class="ref">${esc(a.booking_id)}</span>
          ${statusBadge(a.status)}
        </div>
        <div class="status-detail">
          <div class="sd-item"><span class="sd-label">ชื่อ</span><span class="sd-value">${esc(a.name)}</span></div>
          <div class="sd-item"><span class="sd-label">บริการ</span><span class="sd-value">${esc(svc)}</span></div>
          <div class="sd-item"><span class="sd-label">วันที่</span><span class="sd-value">${esc(formatDateThai(a.appointment_date))}</span></div>
          <div class="sd-item"><span class="sd-label">ช่วงเวลาที่สะดวก</span><span class="sd-value">${esc(a.preferred_time)}</span></div>
          <div class="sd-item"><span class="sd-label">สถานที่</span><span class="sd-value">${esc(locText)}</span></div>
          <div class="sd-item"><span class="sd-label">สถานะ</span><span class="sd-value">${statusBadge(a.status)}</span></div>
        </div>
      </div>
      ${renderTimeline(a.status)}
      <div style="text-align:center; margin-top:28px;">
        <p style="color:var(--muted); font-size:14.5px; margin-bottom:14px;">มีข้อสงสัยเกี่ยวกับการนัดหมาย? ติดต่อเราได้เลย</p>
        <a href="contact.html" class="btn btn-outline">ติดต่อร้าน</a>
      </div>
    `;

    box.style.display = "block";
  } catch (e) {
    box.style.display = "block";
    box.innerHTML = `<div class="card empty-state">
      <span class="icon">⚠️</span>
      <h3 style="margin-bottom:8px;">ไม่สามารถตรวจสอบได้</h3>
      <p style="color:var(--muted);">${esc(e.message)}</p>
    </div>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  $("#btnCheck").addEventListener("click", checkStatus);
  $("#sPhone").addEventListener("keydown", e => { if (e.key === "Enter") checkStatus(); });
  $("#sRef").addEventListener("keydown", e => { if (e.key === "Enter") checkStatus(); });
});
