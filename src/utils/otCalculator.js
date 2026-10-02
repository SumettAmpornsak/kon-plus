// Dynamic OT Calculator for Kon Plus

/**
 * Calculate OT Amount
 * Formula: OT Hours × Employee Current OT Rate
 * Do not round up/down internally; support floating points
 */
export function calculateOtAmount(otHours, otRate) {
  const hours = parseFloat(otHours) || 0;
  const rate = parseFloat(otRate) || 0;
  if (hours <= 0 || rate <= 0) return 0;
  return hours * rate;
}

/**
 * Format currency in Thai Baht (e.g. 138.75 บาท)
 */
export function formatCurrency(amount, includeUnit = true) {
  const val = parseFloat(amount) || 0;
  // Format with commas and 2 decimal places, or as exact decimal if needed
  const formatted = val.toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return includeUnit ? `${formatted} บาท` : formatted;
}

/**
 * Calculate Summary for an array of assignments + employee rate map
 * assignments: [{ empId, isOt, otHours, dailyStatus, date, job, machine }]
 * employeeMap: { [empId]: { otRate, name, ... } }
 */
export function calculateOtSummary(assignments = [], employeeMap = {}) {
  let otPeopleSet = new Set();
  let otDaysSet = new Set();
  let totalHours = 0;
  let totalAmount = 0;
  const detailedList = [];

  for (const item of assignments) {
    if (item.isOt && parseFloat(item.otHours) > 0) {
      const emp = employeeMap[item.empId] || {};
      const currentRate = parseFloat(emp.otRate) || 50.0;
      const hours = parseFloat(item.otHours) || 0;
      const amount = calculateOtAmount(hours, currentRate);

      otPeopleSet.add(item.empId);
      if (item.date) {
        otDaysSet.add(`${item.date}_${item.empId}`);
      }
      totalHours += hours;
      totalAmount += amount;

      detailedList.push({
        ...item,
        employeeName: emp.name || 'ไม่พบชื่อ',
        nickname: emp.nickname || '',
        employeeId: emp.employeeId || '',
        currentRate,
        amount
      });
    }
  }

  return {
    totalPeople: otPeopleSet.size,
    totalDays: otDaysSet.size,
    totalHours: Math.round(totalHours * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    detailedList
  };
}
