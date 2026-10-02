// Append-Only Audit Logging Service for Kon Plus
import { ref, push, set } from 'firebase/database';
import { rtdb } from './firebase';
import { formatThaiDateTime } from '../utils/dateUtils';
import { cacheItemLocally } from './offlineService';

/**
 * Record an append-only audit log entry
 */
export async function recordAuditLog({
  category,
  action,
  targetEmp = null,
  oldValue = null,
  newValue = null,
  description = '',
  user = null
}) {
  const timestamp = Date.now();
  const dateString = formatThaiDateTime(timestamp, true);

  const logEntry = {
    id: `log_${timestamp}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp,
    dateString,
    category: category || 'อื่นๆ',
    action: action || '',
    userId: user?.uid || 'system',
    userName: user?.displayName || user?.email || 'ระบบ',
    userEmail: user?.email || '',
    userRole: user?.role || 'unknown',
    targetEmpId: targetEmp?.id || targetEmp?.empId || null,
    targetEmpName: targetEmp?.name || null,
    targetEmpCode: targetEmp?.employeeId || null,
    oldValue: oldValue !== undefined ? oldValue : null,
    newValue: newValue !== undefined ? newValue : null,
    description: description || ''
  };

  try {
    // 1. Cache to local IndexedDB
    await cacheItemLocally('auditLogs', logEntry);

    // 2. Write to Firebase RTDB (Append-Only)
    if (navigator.onLine && rtdb) {
      const logsRef = ref(rtdb, `auditLogs/${logEntry.id}`);
      await set(logsRef, logEntry);
    }
  } catch (error) {
    console.error('Failed to record audit log:', error);
  }

  return logEntry;
}
