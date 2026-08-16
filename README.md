# THD. BEAUTY & STUDIO — เว็บจองคิวต่อขนตาและนวด

เว็บไซต์จองคิวสำหรับร้านที่ให้บริการ **ต่อขนตา** และ **นวด** แบบ **Appointment Request** (คำขอนัดหมาย)
ร้านไม่มีหน้าร้านถาวร ลูกค้าส่งคำขอนัดหมายผ่านเว็บ แล้วทางร้านจะ **โทรกลับเพื่อยืนยัน** วัน เวลา และสถานที่อีกครั้ง

---

## 🏗️ สถาปัตยกรรม

```
ลูกค้า (มือถือ/PC)                     เจ้าของร้าน
      │                                   │
      ▼                                   ▼
  เว็บ (GitHub Pages)                admin.html (ล็อกอินด้วย PIN)
      │                                   │
      └────────────┬──────────────────────┘
                   ▼
        Google Apps Script (Web App)
                   │
                   ▼
           Google Sheets (ฐานข้อมูล)
```

- **Frontend:** HTML/CSS/JS ธรรมดา (โฮสต์ฟรีบน GitHub Pages)
- **Backend:** Google Apps Script (ฟรี ไม่ต้องมี server ของเรา)
- **ฐานข้อมูล:** Google Sheet (ฟรี)

---

## 📁 โครงสร้างไฟล์

```
Eyes/
├── index.html          # หน้าแรก
├── services.html       # หน้ารายการบริการ
├── booking.html        # หน้ารองคิว (Step Form 5 ขั้นตอน)
├── status.html         # ตรวจสอบสถานะคำขอนัดหมาย
├── about.html          # เกี่ยวกับร้าน
├── contact.html        # หน้าติดต่อ
├── admin.html          # Admin Dashboard (จัดการคิว + บริการ)
├── css/
│   └── style.css       # ธีม Sage Green
├── js/
│   ├── config.js       # ⚙️ ตั้งค่า: Apps Script URL, ชื่อร้าน, เบอร์โทร
│   ├── main.js         # ฟังก์ชันร่วม
│   ├── booking.js      # ตรรกะฟอร์มจอง
│   ├── status.js       # ตรวจสอบสถานะ
│   └── admin.js        # ตรรกะ Admin Dashboard
├── apps-script/
│   └── Code.gs         # ⚙️ Backend ทั้งหมด (วางลงใน Google Apps Script)
├── assets/img/         # ใส่รูปภาพที่นี่
├── robots.txt
└── README.md
```

---

## 🚀 วิธีตั้งค่า (ทีละขั้นตอน)

### ส่วนที่ 1: สร้าง Google Sheet

1. ไปที่ [sheets.new](https://sheets.new) (ต้องล็อกอิน Google Account ของร้าน)
2. ตั้งชื่อไฟล์ เช่น `eyes-booking-data`
3. คัดลอก **Sheet ID** จาก URL — คือส่วนที่อยู่ระหว่าง `/d/` กับ `/edit`
   ```
   https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890/edit
                                              ↑──────────────────────↑
                                                        Sheet ID
   ```

### ส่วนที่ 2: ตั้งค่า Google Apps Script

1. ใน Google Sheet → เมนู **Extensions (ส่วนขยาย)** → **Apps Script**
2. ลบโค้ดเดิมออก แล้ววางโค้ดจากไฟล์ [`apps-script/Code.gs`](apps-script/Code.gs) ลงไปทั้งหมด
3. กด **Save** (💾)
4. ไปที่ **Project Settings (การตั้งค่าโปรเจกต์)** — ไอคอนรูปเกียร์ ⚙️ ด้านซ้าย
   - ในหัวข้อ **Script Properties** กด **Add script property** แล้วเพิ่ม 2 รายการ:

     | Key | Value |
     |---|---|
     | `SHEET_ID` | (Sheet ID ที่คัดลอกมาจากส่วนที่ 1) |
     | `ADMIN_PIN` | รหัส PIN 4-6 หลักสำหรับเข้า Admin (เช่น `2468`) |

   - ตั้งชื่อโปรเจกต์ เช่น `Eyes Booking Backend`

5. รันฟังก์ชัน `setup()` ครั้งแรกเพื่อสร้างหัวตาราง:
   - ในแถบโค้ด เลือกฟังก์ชัน `setup` จาก dropdown แล้วกด **Run** (▶️)
   - อนุญาตสิทธิ์ (กด review permissions → เลือกบัญชี → Allow)
   - กลับไปที่ Google Sheet จะเห็น tab `appointments`, `services`, `messages` ถูกสร้างขึ้น

6. **Deploy เป็น Web App:**
   - กด **Deploy (ปรับใช้)** → **New deployment (การปรับใช้ใหม่)**
   - รูปแบบการทำงาน: เลือก **Web app**
   - **Description**: `v1`
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
   - กด **Deploy**
   - ยืนยันสิทธิ์ (กด authorize) แล้วคัดลอก **Web app URL**
   - (หมายเหตุ: ถ้าเปลี่ยนสิทธิ์ภายหลังต้องกด **Manage deployments → Edit → Version: New version → Deploy** ใหม่)

### ส่วนที่ 3: ใส่ URL ลงในเว็บ

เปิดไฟล์ [`js/config.js`](js/config.js) แล้วแก้:

```js
appsScriptUrl: "https://script.google.com/macros/s/XXXXXXXXX/exec",
```

> 💡 **URL สุดท้ายต้องลงท้ายด้วย `/exec`**

### ส่วนที่ 4: ปรับข้อมูลร้าน (ถ้าต้องการ)

ใน `js/config.js` เดียวกันนี้ เปลี่ยน:
- ชื่อร้าน, เบอร์โทร, LINE ID
- ช่วงเวลาที่เปิดให้จอง (`timeSlots`)
- ไอคอน/รูปภาพ

แล้วแก้ข้อมูลติดต่อที่ท้ายทุกหน้า HTML (footer + contact.html + ข้อมูล JSON-LD ใน index.html)

### ส่วนที่ 5: เปิดใช้งานบน GitHub Pages

1. สร้างบัญชี GitHub (ถ้ายังไม่มี) ที่ https://github.com
2. สร้าง Repository ใหม่: กด **New repository** ตั้งชื่อ เช่น `eyes` (public)
3. อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้ (ยกเว้น `README.md` ที่มีอยู่แล้ว ไม่เป็นไรให้รวมด้วยได้)
4. ไปที่ **Settings** ของ repo → **Pages**
   - **Source:** `Deploy from a branch`
   - **Branch:** `main` / folder: `/ (root)` → **Save**
5. รอ 1-2 นาที แล้วเว็บจะอยู่ที่:
   ```
   https://<ชื่อผู้ใช้ของคุณ>.github.io/eyes/
   ```
6. เปิดหน้าเว็บ → ทดสอบจอง → ดูข้อมูลใน Google Sheet

### ส่วนที่ 6: ตรวจสอบ SEO (ให้ค้นหาเจอบน Google)

- แก้ `og:url` และ `og:image` ใน `index.html` ให้เป็น URL จริงของเว็บ
- ส่ง sitemap ไปยัง [Google Search Console](https://search.google.com/search-console) (ทำได้แม้เป็น GitHub Pages)
- เปิดเว็บบนมือถือเพื่อตรวจสอบความสวยงาม

---

## 🔑 การเข้า Admin

1. เปิดเว็บ → ต่อท้าย URL ด้วย `admin.html`
   ```
   https://<ชื่อผู้ใช้>.github.io/eyes/admin.html
   ```
2. กรอก PIN ที่ตั้งไว้ใน Script Properties (`ADMIN_PIN`)

ฟีเจอร์ Admin:
- ดูสรุป: นัดหมายทั้งหมด / รอยืนยัน / ยืนยันแล้ว / วันนี้ / เสร็จสิ้น
- ตารางรายการนัดหมาย + กรองตามสถานะ
- ดูรายละเอียดลูกค้า, บริการ, สถานที่
- ปุ่มโทรหาลูกค้า (กดแล้วโทรออกทันทีบนมือถือ)
- เปลี่ยนสถานะ: รอยืนยัน → กำลังติดต่อ → ยืนยันแล้ว → กำลังให้บริการ → เสร็จสิ้น / ยกเลิก / ติดต่อไม่ได้
- เปลี่ยนวัน/เวลา/สถานที่
- บันทึก Admin Note (บันทึกจากการโทร)
- จัดการบริการและราคา (เพิ่ม/แก้ไข/ปิด)

> 📱 เจ้าของร้านสะดวกแค่ดูใน Google Sheet ก็ได้ — ข้อมูลจะถูกบันทึกลงไปโดยอัตโนมัติ

---

## 🧾 สถานะคำขอนัดหมาย

| ค่า | ภาษาไทย | หมายเหตุ |
|---|---|---|
| `pending` | รอยืนยัน | สถานะเริ่มต้นเมื่อลูกค้าส่งคำขอ |
| `contacting` | กำลังติดต่อ | แอดมินกำลังโทรหาลูกค้า |
| `confirmed` | ยืนยันแล้ว | ตกลงวันเวลาเรียบร้อย |
| `inservice` | กำลังให้บริการ | ถึงวันนัด กำลังให้บริการ |
| `completed` | เสร็จสิ้น | ให้บริการเสร็จเรียบร้อย |
| `cancelled` | ยกเลิก | ยกเลิกนัดหมาย |
| `unable` | ติดต่อไม่ได้ | ติดต่อลูกค้าหลายครั้งไม่สำเร็จ |

---

## 🎨 โทนสี

| สี | รหัส | ใช้กับ |
|---|---|---|
| Teal | `#4CA5A0` | ปุ่ม / องค์ประกอบหลัก |
| Sky Blue | `#4FA3CF` | เน้น / ราคา |
| Light Mint | `#F1F8F6` | พื้นหลังหลัก |
| White | `#FFFFFF` | การ์ด / พื้นหลังรอง |
| Deep Teal | `#2E4B4A` | ข้อความ |

---

## ⚠️ หมายเหตุสำคัญ

- **ไม่ใช่ระบบ "จองสำเร็จ" ทันที** — ทุกคำขอเป็น Appointment Request ที่สถานะ `pending` รอแอดมินโทรยืนยัน
- PIN แอดมินเก็บอยู่ใน Script Properties ของ Google (ไม่ใช่ในเว็บ) — ปลอดภัยกว่าการฝังในโค้ด
- ข้อมูลเป็นไปตาม schema ที่ระบุ: `users` → ใช้ข้อมูลในตาราง appointments แทน (ไม่มีระบบ user หลายคน ตามความต้องการร้านเล็กๆ)
- เปลี่ยน `NOTIFY_EMAIL` เพิ่มได้ใน Script Properties เพื่อให้ระบบส่งอีเมลแจ้งเมื่อมีคำขอใหม่ (optional)
