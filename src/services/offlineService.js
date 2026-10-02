// IndexedDB (Dexie) Offline Storage and Sync Queue for Kon Plus
import Dexie from 'dexie';

export const db = new Dexie('KonPlusLocalDB');

db.version(1).stores({
  employees: 'id, employeeId, name, status, updatedAt',
  machines: 'id, number',
  daily: 'date, updatedAt',
  auditLogs: 'id, timestamp, category, dateString',
  loginHistory: 'id, timestamp',
  pendingSync: '++id, action, path, timestamp',
  syncEvents: '++id, timestamp, status, details'
});

/**
 * Enqueue a mutation to the pending sync queue when offline or saving
 */
export async function enqueuePendingSync(action, path, payload) {
  const item = {
    action, // 'set' | 'update' | 'remove'
    path,
    payload,
    timestamp: Date.now(),
    retryCount: 0
  };
  return await db.pendingSync.add(item);
}

/**
 * Get all pending sync items
 */
export async function getPendingSyncItems() {
  return await db.pendingSync.orderBy('timestamp').toArray();
}

/**
 * Remove an item from the pending sync queue once synced
 */
export async function removePendingSyncItem(id) {
  return await db.pendingSync.delete(id);
}

/**
 * Record a sync event / conflict resolution
 */
export async function logSyncEvent(status, details) {
  return await db.syncEvents.add({
    timestamp: Date.now(),
    status, // 'success' | 'conflict' | 'error'
    details
  });
}

/**
 * Save snapshot of RTDB branch to local IndexedDB
 */
export async function cacheBranchLocally(tableName, items) {
  if (!items) return;
  const table = db[tableName];
  if (!table) return;

  const array = Array.isArray(items) 
    ? items 
    : Object.entries(items).map(([k, v]) => ({ id: k, ...v }));

  await table.bulkPut(array).catch(err => {
    console.warn(`Failed to bulk put into ${tableName}:`, err);
  });
}

/**
 * Cache single item to local IndexedDB
 */
export async function cacheItemLocally(tableName, item) {
  const table = db[tableName];
  if (!table) return;
  await table.put(item);
}
