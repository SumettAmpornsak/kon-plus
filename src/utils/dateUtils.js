// Thai Date & Time Utils for Asia/Bangkok Timezone

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

/**
 * Returns current Date object shifted to Asia/Bangkok timezone
 */
export function getBangkokDate(dateInput = new Date()) {
  const date = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  const bangkokString = date.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' });
  return new Date(bangkokString);
}

/**
 * Get current date string in YYYY-MM-DD format (Asia/Bangkok)
 */
export function getBangkokTodayString(dateInput = new Date()) {
  const d = getBangkokDate(dateInput);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date string (YYYY-MM-DD or ISO) into Thai Buddhist Era string
 * Example: "1 ตุลาคม 2569 เวลา 13:42:15 น."
 */
export function formatThaiDateTime(dateInput, includeTime = true) {
  if (!dateInput) return '-';
  const d = getBangkokDate(dateInput);
  const day = d.getDate();
  const month = THAI_MONTHS[d.getMonth()];
  const yearBE = d.getFullYear() + 543;

  if (!includeTime) {
    return `${day} ${month} ${yearBE}`;
  }

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return `${day} ${month} ${yearBE} เวลา ${hours}:${minutes}:${seconds} น.`;
}

/**
 * Format short Thai date: "1 ต.ค. 2569"
 */
export function formatThaiDateShort(dateInput) {
  if (!dateInput) return '-';
  const d = getBangkokDate(dateInput);
  const day = d.getDate();
  const month = THAI_MONTHS_SHORT[d.getMonth()];
  const yearBE = d.getFullYear() + 543;
  return `${day} ${month} ${yearBE}`;
}

/**
 * Calculate Supervisor 30-Day countdown
 * Target date string: YYYY-MM-DD
 */
export function get30DayCountdown(dateString) {
  if (!dateString) return { isExpired: true, text: 'ไม่ระบุวันที่' };
  
  // Date of record at 23:59:59
  const recordDate = new Date(`${dateString}T23:59:59+07:00`);
  const expiryTime = recordDate.getTime() + (30 * 24 * 60 * 60 * 1000);
  const now = Date.now();
  const diffMs = expiryTime - now;

  if (diffMs <= 0) {
    return {
      isExpired: true,
      text: '🔒 ข้อมูลเกิน 30 วัน — เฉพาะ Owner เท่านั้นที่สามารถแก้ไขได้',
      diffMs: 0
    };
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return {
    isExpired: false,
    text: `⏳ เหลือเวลาแก้ไข ${days} วัน ${hours} ชั่วโมง ${minutes} นาที`,
    diffMs,
    days,
    hours,
    minutes
  };
}

/**
 * Group continuous employee daily statuses into segments
 * Example: 1-5 Oct = holiday -> "5 วัน"
 * entries: array of { date: 'YYYY-MM-DD', status: 'วันหยุด', ... } sorted by date ascending
 */
export function groupContinuousStatuses(entries = []) {
  if (!entries || entries.length === 0) return [];
  
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const groups = [];
  let currentGroup = null;

  for (const entry of sorted) {
    if (!currentGroup) {
      currentGroup = {
        status: entry.dailyStatus,
        startDate: entry.date,
        endDate: entry.date,
        count: 1,
        items: [entry]
      };
    } else if (currentGroup.status === entry.dailyStatus) {
      currentGroup.endDate = entry.date;
      currentGroup.count += 1;
      currentGroup.items.push(entry);
    } else {
      groups.push(currentGroup);
      currentGroup = {
        status: entry.dailyStatus,
        startDate: entry.date,
        endDate: entry.date,
        count: 1,
        items: [entry]
      };
    }
  }

  if (currentGroup) {
    groups.push(currentGroup);
  }

  return groups;
}
