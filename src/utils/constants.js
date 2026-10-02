// ระบบคนพลัส - Constants

export const ROLES = {
  OWNER: 'owner',
  SUPERVISOR: 'supervisor'
};

export const MASTER_EMPLOYEE_STATUS = {
  ACTIVE: 'active',
  RESIGNED: 'resigned' // ย้ายไปรายชื่อสำรอง
};

export const DAILY_STATUS = {
  WORKING: 'มาทำงาน',
  HOLIDAY: 'วันหยุด',
  SICK: 'ลาป่วย',
  PERSONAL: 'ลากิจ',
  OTHER: 'อื่นๆ',
  UNSPECIFIED: 'ยังไม่ได้ระบุ'
};

export const MAIN_POSITIONS = {
  MACHINE: 'เข้าเครื่อง', // ต้องมีเครื่อง
  FOLD: 'พับ',
  SEAL: 'ซีน'
};

export const MACHINE_STATUS = {
  VACANT: 'vacant',    // 🟢 ว่าง
  IN_USE: 'in_use',    // 🔴 กำลังใช้งาน
  CLOSED: 'closed'     // ⚪ ปิดใช้งาน
};

export const INITIAL_MACHINES = [
  '001', '002', '003', '004', '005', '006', '007', '008'
];

export const MAX_MACHINES = 20;

export const DEFAULT_OT_RATE = 50.0;
export const DEFAULT_OT_HOURS = 2.5;

export const AUDIT_CATEGORIES = {
  DAILY_STATUS: 'สถานะพนักงาน',
  ASSIGNMENT: 'จัดงาน',
  MACHINE_CHANGE: 'เปลี่ยนเครื่อง',
  OT: 'OT',
  MACHINE: 'เครื่องจักร',
  POSITION: 'ตำแหน่งงาน',
  EMPLOYEE_INFO: 'ข้อมูลพนักงาน',
  USER_ACCOUNT: 'บัญชีผู้ใช้งาน',
  BACKUP: 'สำรองข้อมูล',
  RESTORE: 'กู้คืนข้อมูล',
  IMPORT_EXPORT: 'นำเข้าส่งออก',
  OTHER: 'อื่นๆ'
};

export const TIMEZONE = 'Asia/Bangkok';
