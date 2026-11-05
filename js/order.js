/* หน้าสั่งซื้อสินค้า — ฟอร์มเดียว: ที่อยู่จัดส่ง + QR โอนเงิน
   ใช้ createRequest เดิม (ออเดอร์เข้าแอดมินเป็น category product, สถานะ pending) */

let product = null;

async function loadProduct() {
  const params = new URLSearchParams(location.search);
  const id = params.get("service");
  if (!id) { toast("ไม่พบสินค้า กลับไปเลือกใหม่อีกครั้ง", { gold: true }); return; }

  try {
    const data = await apiCall("getProducts");
    product = (data.products || []).find(s => String(s.id) === String(id)) || null;
  } catch (e) {
    toast("โหลดข้อมูลสินค้าไม่สำเร็จ ลองใหม่อีกครั้ง", { gold: true });
    return;
  }
  if (!product) { toast("ไม่พบสินค้านี้แล้ว อาจถูกลบไปแล้ว", { gold: true }); return; }

  renderSummary();
  renderPayment();
}

function renderSummary() {
  $("#sideProduct").innerHTML =
    `<span class="ss-label">สินค้า</span><span style="text-align:right; max-width:180px;">${esc(product.name)}</span>`;
  $("#sideTotal").textContent = fmtMoney(product.price);
}

function renderPayment() {
  const pay = (window.AppConfig.payment) || {};
  $("#payAmount").textContent = fmtMoney(product.price);
  $("#payName").textContent = pay.promptpayName || window.AppConfig.shopName || "";
  const qr = $("#payQR");
  const warn = '<div class="side-hint">⚠️ ยังไม่ได้ตั้งค่า QR ชำระเงิน — วางรูป QR ที่ assets/img/ แล้วตั้งค่าใน js/config.js (payment.qrImage)</div>';
  if (pay.qrImage) {
    qr.src = pay.qrImage;
    qr.onerror = () => { $("#payBox").innerHTML = warn; };
  } else {
    $("#payBox").innerHTML = warn;
  }
}

async function submitOrder() {
  if (!product) { toast("ยังไม่มีสินค้าให้สั่งซื้อ", { gold: true }); return; }

  const name = $("#oName").value.trim();
  const phone = $("#oPhone").value.trim();
  const address = $("#oAddress").value.trim();

  if (!name) { toast("กรุณากรอกชื่อ-นามสกุล", { gold: true }); return; }
  if (!/^0\d{8,9}$/.test(phone)) { toast("กรุณากรอกเบอร์โทรศัพท์ 10 หลัก (ขึ้นต้นด้วย 0)", { gold: true }); return; }
  if (!address) { toast("กรุณากรอกที่อยู่จัดส่ง", { gold: true }); return; }

  const btn = $("#btnOrder");
  btn.disabled = true;
  btn.textContent = "กำลังส่ง...";

  const userNote = $("#oNote").value.trim();
  const payload = {
    name,
    phone,
    line_id: $("#oLine").value.trim(),
    service_ids: [product.id],
    services: [{ id: product.id, name: product.name, category: product.category, price: Number(product.price) || 0 }],
    appointment_date: "",
    preferred_time: "",
    location_type: "delivery",
    address,
    location_detail: "",
    number_of_people: 1,
    note: "สั่งซื้อสินค้า — ลูกค้าแจ้งว่าโอนแล้ว (รอตรวจสลิป)" + (userNote ? " | หมายเหตุลูกค้า: " + userNote : ""),
    estimated_total: Number(product.price) || 0,
  };

  try {
    const data = await apiCall("createRequest", payload);
    $("#refCode").textContent = data.booking_id || "BK-" + Date.now();
    $("#orderForm").style.display = "none";
    $("#orderDone").style.display = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (e) {
    toast(e.message, { gold: true });
    btn.disabled = false;
    btn.textContent = "ยืนยันการสั่งซื้อ";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadProduct();
  $("#btnOrder").addEventListener("click", submitOrder);
});
