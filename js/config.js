window.AppConfig = {
  // ใส่ Web App URL ที่ได้จาก Google Apps Script (ขั้นตอนใน README.md)
  // เช่น "https://script.google.com/macros/s/XXXXX/exec"
  appsScriptUrl: "https://script.google.com/macros/s/AKfycbyUuZnygEXZ2PUfFNC33w2K7owRAWtuvwgP2RTfxVHl3rhIqwq96U78QENu8LS2SG8/exec",

  // ชื่อร้าน (ใช้แสดงผลทั่วเว็บ)
  shopName: "THD. BEAUTY STUDIO",
  shopTagline: "Beauty & Relaxation, Wherever You Are",

  // ข้อมูลติดต่อร้าน
  contact: {
    phone: "0986545684",
    lineId: "ยังไม่มีช่องทางนี้",
    email: "hello@eyesbeauty.example",
    facebook: "https://www.facebook.com/people/THD-Beauty-Studio/61593494246633/",
    instagram: "eyesbeauty",
    tiktok: "eyesbeauty",
  },

  // ช่วงเวลาที่ลูกค้าเลือกได้ (Admin จะโทรยืนยันเวลาจริงอีกครั้ง)
  timeSlots: [
    "09:00 - 12:00",
    "12:00 - 15:00",
    "15:00 - 18:00",
    "18:00 - 20:00",
  ],

  // สถานะคำขอนัดหมาย + แสดงผลภาษาไทย
  statusMap: {
    pending: { label: "รอยืนยัน", cls: "status-pending" },
    contacting: { label: "กำลังติดต่อ", cls: "status-contacting" },
    confirmed: { label: "ยืนยันแล้ว", cls: "status-confirmed" },
    inservice: { label: "กำลังให้บริการ", cls: "status-inservice" },
    completed: { label: "เสร็จสิ้น", cls: "status-completed" },
    cancelled: { label: "ยกเลิก", cls: "status-cancelled" },
    unable: { label: "ติดต่อไม่ได้", cls: "status-unable" },
  },

  // ไอคอนสำหรับหมวดบริการ (ใช้ตอนที่ไม่มีรูป)
  serviceIcons: {
    lash: "✨",
    massage: "🌸",
    default: "💖",
  },

  shopImage: {
    hero: "", // ใส่ URL รูปจริงทีหลัง (วางใน assets/img แล้วใส่ชื่อไฟล์)
    about: "",
  },
};
