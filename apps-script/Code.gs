/******************************************************************************
 * THD. BEAUTY & STUDIO — Google Apps Script Backend
 * ----------------------------------------------------------------------------
 * วิธีใช้งาน:
 *  1. ไปที่ https://sheets.new สร้าง Google Sheet ใหม่
 *  2. ตั้งชื่อ Sheet ตามชื่อที่กำหนดไว้ใน SHEET_NAME
 *  3. ไปที่เมนู "ส่วนขยาย (Extensions)" > "Apps Script"
 *  4. ลบโค้ดเดิมแล้ววางโค้ดนี้ทั้งหมด
 *  5. ไปที่ "การตั้งค่าโปรเจกต์" (ไอคอนเกียร์) > ตั้งค่า 2 อย่าง:
 *     - SCRIPT_PROPERTY "SHEET_ID" = ID ของ Google Sheet (ส่วนที่อยู่ระหว่าง /d/ กับ /edit ใน URL)
 *     - SCRIPT_PROPERTY "ADMIN_PIN" = รหัส PIN ที่ใช้เข้า Admin Dashboard
 *  6. ไปที่ "ปรับใช้ (Deploy)" > "การปรับใช้ใหม่" > เลือก Web app
 *     - Execute as: Me
 *     - Who has access: Anyone
 *  7. คัดลอก URL ที่ได้ ไปใส่ในไฟล์ js/config.js → appsScriptUrl
 *
 * NOTE: ระบบนี้ใช้ Google Sheet เป็นฐานข้อมูล (ไม่จำเป็นต้องมี server ของตัวเอง)
 * ****************************************************************************/

var SHEET_ID = PropertiesService.getScriptProperties().getProperty("SHEET_ID");
var ADMIN_PIN = PropertiesService.getScriptProperties().getProperty("ADMIN_PIN");

var SPREADSHEET = function () {
  if (!SHEET_ID) throw new Error("ยังไม่ได้ตั้งค่า SHEET_ID ใน Script Properties");
  return SpreadsheetApp.openById(SHEET_ID);
};

var STATUS_LIST = [
  "pending",      // รอยืนยัน
  "contacting",   // กำลังติดต่อ
  "confirmed",    // ยืนยันแล้ว
  "inservice",    // กำลังให้บริการ
  "completed",    // เสร็จสิ้น
  "cancelled",    // ยกเลิก
  "unable",       // ติดต่อไม่ได้
];

var APPT_HEADERS = [
  "booking_id", "name", "phone", "line_id",
  "services", "services_text", "estimated_total",
  "appointment_date", "preferred_time",
  "location_type", "address", "location_detail",
  "number_of_people", "note",
  "status", "admin_note", "created_at", "updated_at"
];

var SERVICE_HEADERS = [
  "id", "category", "name", "description", "duration", "price", "options", "image", "status", "created_at"
];

/* ===================== Entry Points ===================== */

function doGet(e) {
  return handleRequest(e, "GET");
}

function doPost(e) {
  return handleRequest(e, "POST");
}

function handleRequest(e, method) {
  var cacheBuster = new Date().getTime();

  try {
    var payload = null;
    if (method === "POST") {
      payload = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      payload = e.parameter;
    }
    if (!payload || !payload.action) {
      return jsonResponse({ success: false, message: "missing action" });
    }
    return route(payload);
  } catch (err) {
    Logger.log("ERROR: " + err);
    return jsonResponse({ success: false, message: "เกิดข้อผิดพลาด: " + err.message });
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function ok(obj) {
  obj.success = true;
  return jsonResponse(obj);
}

function fail(msg) {
  return jsonResponse({ success: false, message: msg });
}

function route(payload) {
  var action = String(payload.action || "");

  switch (action) {
    case "getServices":      return getServices();
    case "createRequest":    return createRequest(payload);
    case "checkStatus":      return checkStatus(payload);
    case "contactMessage":   return contactMessage(payload);
    case "adminLogin":       return adminLogin(payload);
    case "adminList":        return requireAdmin(payload, adminList);
    case "adminUpdate":      return requireAdmin(payload, adminUpdate);
    case "adminNote":        return requireAdmin(payload, adminNote);
    case "adminSaveService": return requireAdmin(payload, adminSaveService);
    case "adminDeleteService": return requireAdmin(payload, adminDeleteService);
    case "adminToggleService": return requireAdmin(payload, adminToggleService);
    case "uploadImage":      return requireAdmin(payload, uploadImage);

    default:
      return fail("ไม่รู้จัก action: " + action);
  }
}

function requireAdmin(payload, fn) {
  if (String(payload.pin || "") !== String(ADMIN_PIN || "")) {
    return fail("PIN ไม่ถูกต้อง");
  }
  return fn(payload);
}

/* ===================== Services ===================== */

function getServices() {
  var rows = readSheet("services");
  var list = rows.slice(1).filter(function (r) { return r.length > 0; })
    .map(function (r, i) {
      return rowToObj(SERVICE_HEADERS, r, i + 1);
    })
    .filter(function (s) {
      return s.name;
    });
  return ok({ services: list });
}

function rowToObj(headers, row, index) {
  var obj = { row: index };
  for (var i = 0; i < headers.length; i++) {
    obj[headers[i]] = row[i] !== undefined ? row[i] : "";
  }
  return obj;
}

/* ===================== Create Appointment Request ===================== */

function createRequest(p) {
  var name = String(p.name || "").trim();
  var phone = String(p.phone || "").trim();
  var services = p.services || [];
  var date = String(p.appointment_date || "").trim();
  var time = String(p.preferred_time || "").trim();
  var locType = String(p.location_type || "");

  if (!name) return fail("กรุณากรอกชื่อ");
  if (!/^0\d{8,9}$/.test(phone)) return fail("เบอร์โทรศัพท์ไม่ถูกต้อง");
  if (!services.length) return fail("กรุณาเลือกบริการอย่างน้อย 1 รายการ");
  if (!date) return fail("กรุณาเลือกวันที่");
  if (!time) return fail("กรุณาเลือกช่วงเวลา");
  if (locType !== "home" && locType !== "place") return fail("กรุณาเลือกสถานที่ให้บริการ");

  var bookingId = generateBookingId();

  var serviceNames = [];
  var serviceText = [];
  var total = 0;
  services.forEach(function (s) {
    var price = Number(s.price) || 0;
    total += price;
    serviceNames.push(String(s.name || ""));
    serviceText.push((s.category === "massage" ? "นวด: " : "ต่อขนตา: ") + (s.name || "") + " (" + price + " บาท)");
  });

  var now = new Date();
  var row = [
    bookingId,
    name,
    phone,
    String(p.line_id || "").trim(),
    serviceNames.join(", "),
    serviceText.join(" | "),
    total,
    date,
    time,
    locType,
    String(p.address || "").trim(),
    String(p.location_detail || "").trim(),
    String(p.number_of_people || "1"),
    String(p.note || "").trim(),
    "pending",
    "",
    now.toISOString(),
    now.toISOString()
  ];

  appendRow("appointments", row);

  try {
    var notifyEmail = PropertiesService.getScriptProperties().getProperty("NOTIFY_EMAIL");
    if (notifyEmail) {
      MailApp.sendEmail({
        to: notifyEmail,
        subject: "คำขอนัดหมายใหม่: " + bookingId + " (" + name + ")",
        body:
          "คำขอนัดหมายใหม่\n" +
          "รหัส: " + bookingId + "\n" +
          "ชื่อ: " + name + "\n" +
          "โทร: " + phone + "\n" +
          "LINE: " + (p.line_id || "-") + "\n" +
          "บริการ: " + serviceNames.join(", ") + "\n" +
          "วันที่: " + date + "\n" +
          "ช่วงเวลา: " + time + "\n" +
          "สถานที่: " + (locType === "home" ? "ให้ร้านไปหา - " + p.address : "ไปสถานที่นัดหมาย") + "\n" +
          "จำนวนคน: " + p.number_of_people + "\n" +
          "ตรวจสอบได้ที่ Google Sheet"
      });
    }
  } catch (e) {
    Logger.log("Email notify error: " + e);
  }

  return ok({ booking_id: bookingId, status: "pending" });
}

function generateBookingId() {
  var d = new Date();
  var pad = function (n) { return (n < 10 ? "0" : "") + n; };
  var dateStr = "" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
  var rand = Math.floor(1000 + Math.random() * 9000);
  return "BK-" + dateStr + "-" + rand;
}

/* ===================== Check Status (Public) ===================== */

function checkStatus(p) {
  var phone = String(p.phone || "").trim();
  var bookingId = String(p.booking_id || "").trim().toUpperCase();

  var rows = readSheet("appointments");
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (!r[0]) continue;
    if (String(r[0]).toUpperCase() === bookingId && String(r[2]).trim() === phone) {
      var a = rowToObj(APPT_HEADERS, r, i + 1);
      a.booking_id = String(a.booking_id).toUpperCase();
      return ok({ appointment: a });
    }
  }
  return ok({ appointment: null });
}

/* ===================== Admin ===================== */

function adminLogin() {
  if (!ADMIN_PIN) return fail("ยังไม่ได้ตั้งค่า ADMIN_PIN ใน Script Properties");
  return ok({ message: "เข้าสู่ระบบสำเร็จ" });
}

function adminList() {
  var rows = readSheet("appointments");
  var list = rows.slice(1)
    .filter(function (r) { return r.length > 0 && r[0]; })
    .map(function (r, i) { return rowToObj(APPT_HEADERS, r, i + 1); });

  list.sort(function (a, b) {
    return String(b.created_at || "").localeCompare(String(a.created_at || ""));
  });

  return ok({ appointments: list });
}

function adminUpdate(p) {
  var bookingId = String(p.booking_id || "").toUpperCase();
  var rowIndex = findAppointmentRow(bookingId);
  if (rowIndex < 0) return fail("ไม่พบคำขอนัดหมาย: " + bookingId);

  var sheet = SPREADSHEET().getSheetByName("appointments");
  var headers = sheet.getRange(1, 1, 1, APPT_HEADERS.length).getValues()[0];
  var current = readRow(sheet, rowIndex);

  if (p.status) {
    if (STATUS_LIST.indexOf(p.status) < 0) return fail("สถานะไม่ถูกต้อง");
    current[headers.indexOf("status")] = p.status;
  }

  if (p.appointment_date) current[headers.indexOf("appointment_date")] = p.appointment_date;
  if (p.preferred_time) current[headers.indexOf("preferred_time")] = p.preferred_time;
  if (p.location_type) current[headers.indexOf("location_type")] = p.location_type;
  if (p.address !== undefined) current[headers.indexOf("address")] = p.address;

  current[headers.indexOf("updated_at")] = new Date().toISOString();

  sheet.getRange(rowIndex, 1, 1, APPT_HEADERS.length).setValues([current]);

  return ok({ message: "อัปเดตคำขอนัดหมายแล้ว" });
}

function adminNote(p) {
  var bookingId = String(p.booking_id || "").toUpperCase();
  var rowIndex = findAppointmentRow(bookingId);
  if (rowIndex < 0) return fail("ไม่พบคำขอนัดหมาย: " + bookingId);

  var sheet = SPREADSHEET().getSheetByName("appointments");
  var headers = sheet.getRange(1, 1, 1, APPT_HEADERS.length).getValues()[0];
  var current = readRow(sheet, rowIndex);

  current[headers.indexOf("admin_note")] = String(p.admin_note || "");
  current[headers.indexOf("updated_at")] = new Date().toISOString();

  sheet.getRange(rowIndex, 1, 1, APPT_HEADERS.length).setValues([current]);

  return ok({ message: "บันทึกหมายเหตุแล้ว" });
}

/* ===================== Service Management (Admin) ===================== */

function adminSaveService(p) {
  var name = String(p.name || "").trim();
  if (!name) return fail("กรุณากรอกชื่อบริการ");

  var sheet = getOrCreateSheet("services", SERVICE_HEADERS);
  var category = String(p.category || "lash");
  var duration = String(p.duration || "");
  var price = Number(p.price) || 0;
  var description = String(p.description || "");
  var options = String(p.options || "");
  var image = String(p.image || "").trim();

  if (p.id) {
    var found = findServiceRow(String(p.id));
    if (found >= 0) {
      var headers = sheet.getRange(1, 1, 1, SERVICE_HEADERS.length).getValues()[0];
      var row = readRow(sheet, found);
      row[headers.indexOf("category")] = category;
      row[headers.indexOf("name")] = name;
      row[headers.indexOf("description")] = description;
      row[headers.indexOf("duration")] = duration;
      row[headers.indexOf("price")] = price;
      row[headers.indexOf("options")] = options;
      row[headers.indexOf("image")] = image;
      sheet.getRange(found, 1, 1, SERVICE_HEADERS.length).setValues([row]);
      return ok({ message: "แก้ไขบริการแล้ว" });
    }
  }

  var nextId = nextServiceId(sheet);
  var newRow = [nextId, category, name, description, duration, price, options, image, "active", new Date().toISOString()];
  appendRow("services", newRow);

  return ok({ message: "เพิ่มบริการแล้ว", id: nextId });
}

function adminToggleService(p) {
  var rowIndex = findServiceRow(String(p.id || ""));
  if (rowIndex < 0) return fail("ไม่พบบริการ");

  var sheet = getOrCreateSheet("services", SERVICE_HEADERS);
  var headers = sheet.getRange(1, 1, 1, SERVICE_HEADERS.length).getValues()[0];
  var row = readRow(sheet, rowIndex);
  var current = row[headers.indexOf("status")] === "active" ? "inactive" : "active";
  row[headers.indexOf("status")] = current;
  sheet.getRange(rowIndex, 1, 1, SERVICE_HEADERS.length).setValues([row]);

  return ok({ message: "อัปเดตสถานะบริการแล้ว" });
}

function adminDeleteService(p) {
  var rowIndex = findServiceRow(String(p.id || ""));
  if (rowIndex < 0) return fail("ไม่พบบริการ");

  var sheet = getOrCreateSheet("services", SERVICE_HEADERS);
  sheet.deleteRow(rowIndex);

  return ok({ message: "ลบบริการแล้ว" });
}

function uploadImage(p) {
  var imageData = String(p.image || "").trim();
  if (!imageData) return fail("ไม่มีข้อมูลรูปภาพ");

  var props = PropertiesService.getScriptProperties();
  var cloudName = props.getProperty("CLOUDINARY_CLOUD_NAME");
  var preset    = props.getProperty("CLOUDINARY_UPLOAD_PRESET");
  if (!cloudName || !preset) {
    return fail("ยังไม่ได้ตั้งค่า CLOUDINARY_CLOUD_NAME / CLOUDINARY_UPLOAD_PRESET ใน Script Properties");
  }

  try {
    var response = UrlFetchApp.fetch(
      "https://api.cloudinary.com/v1_1/" + cloudName + "/image/upload",
      {
        method: "post",
        payload: {
          file: "data:image/jpeg;base64," + imageData,  // Cloudinary รับ data URI ได้
          upload_preset: preset,
        },
        muteHttpExceptions: true,
      }
    );

    var result = JSON.parse(response.getContentText());

    if (result.secure_url) {
      return ok({ url: result.secure_url, display_url: result.secure_url });
    }
    return fail("cloudinary: " + JSON.stringify(result));
  } catch (e) {
    return fail("เกิดข้อผิดพลาด: " + e.message);
  }
}

/* ===================== Contact Message ===================== */

function contactMessage(p) {
  var name = String(p.name || "").trim();
  var phone = String(p.phone || "").trim();
  var message = String(p.message || "").trim();

  if (!name || !phone || !message) return fail("กรุณากรอกข้อมูลให้ครบ");

  var sheet = getOrCreateSheet("messages", ["created_at", "name", "phone", "line_id", "topic", "message"]);
  sheet.appendRow([
    new Date().toISOString(),
    name,
    phone,
    String(p.line || ""),
    String(p.topic || ""),
    message
  ]);

  try {
    var notifyEmail = PropertiesService.getScriptProperties().getProperty("NOTIFY_EMAIL");
    if (notifyEmail) {
      MailApp.sendEmail({
        to: notifyEmail,
        subject: "ข้อความจากเว็บไซต์: " + name,
        body: "ชื่อ: " + name + "\nโทร: " + phone + "\nหัวข้อ: " + (p.topic || "-") + "\n\n" + message
      });
    }
  } catch (e) { Logger.log("Email error: " + e); }

  return ok({ message: "ส่งข้อความเรียบร้อยแล้ว" });
}

/* ===================== Sheet Helpers ===================== */

function getOrCreateSheet(name, headers) {
  var ss = SPREADSHEET();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers || []);
    sheet.getRange(1, 1, 1, (headers || []).length)
      .setFontWeight("bold")
      .setBackground("#E7F0E1");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function readSheet(name) {
  var sheet = getOrCreateSheet(name, name === "services" ? SERVICE_HEADERS : APPT_HEADERS);
  var lastRow = sheet.getLastRow();
  if (lastRow < 1) return [];
  return sheet.getRange(1, 1, lastRow, sheet.getLastColumn()).getValues();
}

function appendRow(name, values) {
  var sheet = getOrCreateSheet(name, name === "services" ? SERVICE_HEADERS : APPT_HEADERS);
  sheet.appendRow(values);
}

function readRow(sheet, rowIndex) {
  var cols = Math.max(APPT_HEADERS.length, SERVICE_HEADERS.length);
  return sheet.getRange(rowIndex, 1, 1, cols).getValues()[0];
}

function findAppointmentRow(bookingId) {
  var rows = readSheet("appointments");
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] && String(rows[i][0]).toUpperCase() === bookingId) return i + 1;
  }
  return -1;
}

function findServiceRow(id) {
  var rows = readSheet("services");
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] !== undefined && String(rows[i][0]) === String(id)) return i + 1;
  }
  return -1;
}

function nextServiceId(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 1;
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var max = 0;
  ids.forEach(function (r) {
    var n = Number(r[0]);
    if (!isNaN(n) && n > max) max = n;
  });
  return max + 1;
}

/* ===================== On install ===================== */

function setup() {
  getOrCreateSheet("appointments", APPT_HEADERS);
  getOrCreateSheet("services", SERVICE_HEADERS);
  getOrCreateSheet("messages", ["created_at", "name", "phone", "line_id", "topic", "message"]);
  Logger.log("Setup complete: สร้างชีตเรียบร้อยแล้ว");
}
