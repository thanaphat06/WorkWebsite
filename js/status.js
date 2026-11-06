/* ตรวจสอบสถานะคำขอนัดหมาย */

const STATUS_FLOW = ["pending", "contacting", "confirmed", "inservice", "completed"];

function statusBadge(status) {
  const cls = (window.AppConfig.statusMap[status] || {}).cls || "status-pending";
  return `<span class="status-badge ${cls}">${esc(t("st." + status))}</span>`;
}

function renderTimeline(status) {
  if (status === "cancelled") {
    return `<div class="timeline">
      <div class="tl-item"><div class="tl-dot">✕</div><div><div class="tl-title">${esc(t("stp.cancelledTitle"))}</div><div class="tl-date">${esc(t("stp.cancelledDesc"))}</div></div></div>
    </div>`;
  }
  if (status === "unable") {
    return `<div class="timeline">
      <div class="tl-item"><div class="tl-dot">!</div><div><div class="tl-title">${esc(t("stp.unableTitle"))}</div><div class="tl-date">${esc(t("stp.unableDesc"))}</div></div></div>
    </div>`;
  }

  const idx = STATUS_FLOW.indexOf(status);
  const labels = [t("stp.tlSubmitted"), t("stp.tlContacting"), t("stp.tlConfirmed"), t("stp.tlInservice"), t("stp.tlCompleted")];
  return `<div class="timeline">` + STATUS_FLOW.map((st, i) => {
    const state = i < idx ? "done" : i === idx ? "active" : "";
    const icon = i === 0 ? "✓" : i === 1 ? "✆" : i === 2 ? "📅" : i === 3 ? "💆" : "✦";
    return `
    <div class="tl-item ${state}">
      <div class="tl-dot">${icon}</div>
      <div>
        <div class="tl-title">${esc(labels[i])}</div>
        <div class="tl-date">${esc(i < idx ? t("stp.tlDone") : i === idx ? t("stp.tlInprogress") : t("stp.tlSoon"))}</div>
      </div>
    </div>`;
  }).join("") + `</div>`;
}

async function checkStatus() {
  const phone = $("#sPhone").value.trim();
  const ref = $("#sRef").value.trim().toUpperCase();
  const box = $("#statusResult");

  if (!/^0\d{8,9}$/.test(phone)) { toast(t("stp.phoneInvalid"), { gold: true }); return; }
  if (!/^BK-\d+-\d+$/.test(ref)) { toast(t("stp.refInvalid"), { gold: true }); return; }

  box.style.display = "none";

  try {
    const data = await apiCall("checkStatus", { phone, booking_id: ref });
    const a = data.appointment;

    if (!a) {
      box.style.display = "block";
      box.innerHTML = `<div class="card empty-state">
        <span class="icon">🔍</span>
        <h3 style="margin-bottom:8px;">${esc(t("stp.notFoundTitle"))}</h3>
        <p style="color:var(--muted);">${esc(t("stp.notFoundDesc"))}</p>
      </div>`;
      return;
    }

    const svc = a.services_text || a.services || "-";
    const locText = a.location_type === "home"
      ? `${t("stp.locHome")} (${a.address || "-"})`
      : a.location_type === "place" ? t("stp.locPlace")
      : a.location_type === "delivery" ? `${t("stp.locDelivery")} (${a.address || "-"})` : "-";

    box.innerHTML = `
      <div class="card status-card">
        <div class="status-card-head">
          <span class="ref">${esc(a.booking_id)}</span>
          ${statusBadge(a.status)}
        </div>
        <div class="status-detail">
          <div class="sd-item"><span class="sd-label">${esc(t("stp.fName"))}</span><span class="sd-value">${esc(a.name)}</span></div>
          <div class="sd-item"><span class="sd-label">${esc(t("stp.fService"))}</span><span class="sd-value">${esc(svc)}</span></div>
          <div class="sd-item"><span class="sd-label">${esc(t("stp.fDate"))}</span><span class="sd-value">${esc(formatDateThai(a.appointment_date))}</span></div>
          <div class="sd-item"><span class="sd-label">${esc(t("stp.fTime"))}</span><span class="sd-value">${esc(a.preferred_time)}</span></div>
          <div class="sd-item"><span class="sd-label">${esc(t("stp.fLocation"))}</span><span class="sd-value">${esc(locText)}</span></div>
          <div class="sd-item"><span class="sd-label">${esc(t("stp.fStatus"))}</span><span class="sd-value">${statusBadge(a.status)}</span></div>
        </div>
      </div>
      ${renderTimeline(a.status)}
      <div style="text-align:center; margin-top:28px;">
        <p style="color:var(--muted); font-size:14.5px; margin-bottom:14px;">${esc(t("stp.help"))}</p>
        <a href="contact.html" class="btn btn-outline">${esc(t("stp.contactShop"))}</a>
      </div>
    `;

    box.style.display = "block";
  } catch (e) {
    box.style.display = "block";
    box.innerHTML = `<div class="card empty-state">
      <span class="icon">⚠️</span>
      <h3 style="margin-bottom:8px;">${esc(t("stp.errTitle"))}</h3>
      <p style="color:var(--muted);">${esc(e.message)}</p>
    </div>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  $("#btnCheck").addEventListener("click", checkStatus);
  $("#sPhone").addEventListener("keydown", e => { if (e.key === "Enter") checkStatus(); });
  $("#sRef").addEventListener("keydown", e => { if (e.key === "Enter") checkStatus(); });
});
