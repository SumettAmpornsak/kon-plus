# คนพลัส (Kon Plus) - Web Application & PWA

**คนพลัส (Kon Plus)** คือระบบเว็บแอปพลิเคชัน Progressive Web App (PWA) ระดับองค์กร สำหรับบริหารจัดการพนักงาน งานประจำวัน เครื่องจักร OT ย้อนหลัง รายงาน และ Audit Log ออกแบบตามหลักการ **Offline-First**, **Real-time Sync**, และ **Strict Security**

---

## 🌟 คุณสมบัติเด่นของระบบ

1. **Google Login ผ่าน Firebase Authentication เท่านั้น** (ไม่มีระบบ Username/Password และไม่มีปุ่มสมัครสมาชิกเอง)
2. **ระบบสิทธิ์ 2 ระดับ**:
   - **Owner (เจ้าของระบบ)**: สิทธิ์สูงสุด จัดการบัญชีผู้ใช้ ลบพนักงานถาวร ตั้งค่า Telegram/ระบบ/ความปลอดภัย และแก้ไขประวัติย้อนหลังได้ไม่จำกัดวัน
   - **หัวหน้ากะ (Supervisor)**: จัดการงานประจำวัน พนักงาน เครื่องจักร รายงาน ดู Log แต่ไม่สามารถแก้ผู้ใช้ ลบถาวร หรือแก้ข้อมูลย้อนหลังเกิน 30 วันได้
3. **การจัดพนักงานประจำวัน (Daily Operations)**:
   - บันทึกการมาทำงาน: `มาทำงาน`, `วันหยุด`, `ลาป่วย`, `ลากิจ`, `อื่นๆ`, `ยังไม่ได้ระบุ`
   - จัดตำแหน่งงาน: `เข้าเครื่อง` (บังคับเลือกเครื่อง), `พับ`, `ซีน`, และ **ตำแหน่งกำหนดเอง (Custom Daily Position)** ที่สร้างได้ง่าย ลบออกอัตโนมัติหากไม่มีคนใช้
   - จัดลำดับตำแหน่งงานด้วย Drag & Drop หรือปุ่มขึ้น/ลง
   - **Auto Save** ทันทีทุกการเปลี่ยนแปลง พร้อมข้อความแจ้งเตือน `✓ บันทึกแล้ว`
4. **การจัดการเครื่องจักร (Machines 001 - 020)**:
   - สถานะ: `🟢 ว่าง`, `🔴 กำลังใช้งาน`, `⚪ ปิดใช้งาน`
   - เมื่อขึ้นวันใหม่: เครื่องจักรทุกเครื่องเริ่มใหม่เป็น `🟢 ว่าง` โดยอัตโนมัติ
   - ปิดเครื่องขณะใช้งาน: พนักงานจะถูกเปลี่ยนเป็น `ยังไม่ได้จัดงาน` และล้างงาน/เครื่อง/OT ทันที
   - เปิดเครื่องที่ปิด: มีระบบถาม "เปิดเป็นเครื่องว่าง" หรือ "คืนพนักงานคนเดิม"
5. **การคำนวณเงิน OT แบบ Dynamic**:
   - สูตรคำนวณ: `ชั่วโมง OT × อัตรา OT ปัจจุบันของพนักงาน` (ค่าเริ่มต้น 50.00 บาท/ชม.)
   - การเปลี่ยนอัตราค่า OT รายบุคคลจะมีผลคำนวณใหม่ย้อนหลังทั้งหมด
6. **ประวัติย้อนหลังและการควบคุมเวลา 30 วัน**:
   - ดูข้อมูลย้อนหลังได้ทั้งแบบตามวันที่ (By Date) และตามพนักงาน (By Employee)
   - จัดกลุ่มสถานะต่อเนื่อง เช่น `1-5 ต.ค. = วันหยุด` แสดงเป็น `5 วัน` อัตโนมัติ
   - หัวหน้ากะมีนาฬิกานับถอยหลัง Real-time `⏳ เหลือเวลาแก้ไข X วัน Y ชม. Z นาที` เมื่อเกิน 30 วันจะถูกล็อคเป็น View Only
7. **รายงาน 8 หมวดหมู่ พร้อมกราฟและการ Export**:
   - ส่งออกข้อมูลได้ 4 รูปแบบ: **JSON, CSV (รองรับภาษาไทย Excel), PDF, Print**
   - ทุกครั้งที่มีการ Export หรือพิมพ์ จะถูกบันทึก Audit Log โดยอัตโนมัติ
8. **Audit Log & Login History แบบ Append-Only**:
   - บันทึกทุกความเปลี่ยนแปลงที่สำคัญและประวัติการเข้าสู่ระบบถาวร ไม่สามารถแก้ไขหรือลบได้
9. **ระบบสำรองและกู้คืนข้อมูล (Backup & Restore)**:
   - สำรองข้อมูลอัตโนมัติทุก 7 วัน (เก็บสูงสุด 4 ชุดล่าสุดแบบ FIFO)
   - ระบบกู้คืนข้อมูลแบบยืนยัน 2 ชั้น พร้อมสร้าง Auto Backup ปัจจุบันก่อนกู้คืนเสมอ
10. **Telegram Bot Integration**:
    - รองรับการแจ้งเตือน 8 หมวดหมู่ (A-H)
    - รองรับคำสั่ง Interactive: `/วันนี้`, `/พนักงาน`, `/เครื่อง`, `/ot`, `/ยังไม่จัดงาน`, `/รายงาน`
11. **Offline-First PWA (Service Worker + IndexedDB)**:
    - ใช้งานแบบออฟไลน์ได้ ข้อมูลจะถูกเก็บใน IndexedDB และเมื่อเชื่อมต่อเน็ตจะซิงก์กลับ Firebase อัตโนมัติด้วยนโยบาย *Latest Timestamp Wins*

---

## 🚀 การติดตั้งและเริ่มต้นใช้งาน (Installation)

### 1. ความต้องการของระบบ (Prerequisites)
- Node.js version 18.0 ขึ้นไป
- npm หรือ yarn

### 2. ติดตั้ง Dependencies
```bash
cd kon-plus
npm install
```

### 3. รัน Development Server
```bash
npm run dev
```
เปิดเบราว์เซอร์ไปที่ `http://localhost:3000`

### 4. บิลด์สำหรับ Production
```bash
npm run build
npm run preview
```

---

## ⚙️ การตั้งค่า Firebase (Configuration)

สร้างโปรเจกต์ใน [Firebase Console](https://console.firebase.google.com/):

1. **Authentication**:
   - เปิดใช้งาน **Google Sign-In Provider** ในเมนู *Authentication > Sign-in method*
   - เพิ่ม Authorized Domain ของคุณ (เช่น `localhost` หรือโดเมน Production)

2. **Realtime Database**:
   - สร้าง Realtime Database เลือก Location `asia-southeast1` (Singapore)
   - นำกฎความปลอดภัยในไฟล์ `database.rules.json` ไปใส่ในแท็บ *Rules*

3. **กำหนดค่า Environment Variables**:
สร้างไฟล์ `.env.local` ที่โฟลเดอร์หลัก:
```env
VITE_FIREBASE_API_KEY="AIzaSy..."
VITE_FIREBASE_AUTH_DOMAIN="your-app.firebaseapp.com"
VITE_FIREBASE_DATABASE_URL="https://your-app-default-rtdb.asia-southeast1.firebasedatabase.app"
VITE_FIREBASE_PROJECT_ID="your-app"
VITE_FIREBASE_STORAGE_BUCKET="your-app.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="123456789"
VITE_FIREBASE_APP_ID="1:123456789:web:abcdef"
```

*(หมายเหตุ: หากยังไม่ได้ใส่ค่า Firebase ใน .env ระบบมีโหมด **Demo Test Accounts** สำหรับทดลองสิทธิ์ Owner และ Supervisor ได้ทันทีโดยไม่ต้องเชื่อมต่อ Firebase)*

---

## 🔒 Firebase Realtime Database Security Rules (`database.rules.json`)

```json
{
  "rules": {
    ".read": "auth != null && root.child('users').child(auth.uid).child('status').val() === 'active'",
    
    "users": {
      ".read": "auth != null",
      "$uid": {
        ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'owner' || (auth.uid === $uid && !newData.child('role').exists() && !newData.child('status').exists()))"
      }
    },

    "system": {
      "settings": {
        ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'owner'"
      },
      "telegram": {
        ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'owner'"
      }
    },

    "employees": {
      "$empId": {
        ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'owner' || (root.child('users').child(auth.uid).child('role').val() === 'supervisor' && newData.exists()))"
      }
    },

    "machines": {
      ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'owner' || root.child('users').child(auth.uid).child('role').val() === 'supervisor')"
    },

    "daily": {
      "$date": {
        ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'owner' || root.child('users').child(auth.uid).child('role').val() === 'supervisor')"
      }
    },

    "auditLogs": {
      "$logId": {
        ".write": "auth != null && !data.exists() && newData.exists()"
      }
    },

    "loginHistory": {
      "$loginId": {
        ".write": "auth != null && !data.exists() && newData.exists()"
      }
    },

    "backups": {
      ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'owner' || root.child('users').child(auth.uid).child('role').val() === 'supervisor')"
    }
  }
}
```

---

## 📱 PWA & Offline Support

ระบบถูกคอมไพล์เป็น Progressive Web App:
- สามารถติดตั้ง (Install) บนหน้าจอโฮมของสมาร์ตโฟน (Android / iOS) และบน Desktop (Chrome / Edge / Safari)
- มี Service Worker แคชหน้าจอหลัก ทำให้เปิดแอปได้แม้อยู่ในที่ไม่มีสัญญาณ
- ข้อมูลการแก้ไขขณะออฟไลน์จะถูกเก็บในคิว IndexedDB พร้อมแสดงแบดจ์สถานะ `🔴 Offline` หรือ `🟠 รอ Sync N รายการ` และจะซิงก์กลับเซิร์ฟเวอร์ทันทีเมื่อกลับมาออนไลน์

---

## 🤖 โครงสร้างคำสั่ง Telegram Bot

ระบบรองรับคำสั่ง Telegram Bot:
- `/วันนี้` - สรุปภาพรวมงานประจำวัน
- `/พนักงาน` - รายชื่อและสถานะพนักงาน
- `/เครื่อง` - ดูสถานะเครื่องจักรทั้งหมด (🟢 ว่าง / 🔴 ใช้งาน / ⚪ ปิด)
- `/ot` - ดูรายชื่อคนทำ OT วันนี้ และจำนวนชั่วโมง
- `/ยังไม่จัดงาน` - ดูรายชื่อพนักงานที่มาทำงานแต่ยังไม่ได้จัดงาน
- `/รายงาน` - ดูสรุปยอดรวมประจำเดือน

---

## 📂 โครงสร้างซอร์สโค้ด (Directory Structure)

```
kon-plus/
├── public/
│   ├── icon-192.svg
│   ├── icon-512.svg
│   ├── manifest.json
│   └── sw.js
├── src/
│   ├── components/
│   │   ├── common/DailyStatusModal.jsx
│   │   ├── history/CountdownTimer30Days.jsx
│   │   ├── layout/Navbar.jsx, SyncBadge.jsx, AutoSaveIndicator.jsx
│   │   └── machines/ReopenPromptModal.jsx
│   ├── contexts/
│   │   ├── AuthContext.jsx
│   │   ├── DatabaseContext.jsx
│   │   └── ThemeContext.jsx
│   ├── pages/
│   │   ├── AssignmentPage.jsx
│   │   ├── AuditLogsPage.jsx
│   │   ├── BackupListPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── EmployeesPage.jsx
│   │   ├── HistoryPage.jsx
│   │   ├── LoginHistoryPage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── MachinesPage.jsx
│   │   ├── NotificationPage.jsx
│   │   ├── ReportsPage.jsx
│   │   ├── SettingsPage.jsx
│   │   └── UserManagementPage.jsx
│   ├── services/
│   │   ├── auditService.js
│   │   ├── dbService.js
│   │   ├── exportService.js
│   │   ├── firebase.js
│   │   ├── offlineService.js
│   │   └── telegramService.js
│   ├── utils/
│   │   ├── constants.js
│   │   ├── dateUtils.js
│   │   └── otCalculator.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── database.rules.json
├── package.json
├── tailwind.config.js
└── vite.config.js
```
