// Database Context & Real-time State Manager for Kon Plus
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  ref, onValue, set, update, remove, get 
} from 'firebase/database';
import { rtdb } from '../services/firebase';
import { useAuth } from './AuthContext';
import { 
  DAILY_STATUS, 
  MAIN_POSITIONS, 
  MACHINE_STATUS, 
  ROLES, 
  AUDIT_CATEGORIES, 
  DEFAULT_OT_RATE,
  INITIAL_MACHINES
} from '../utils/constants';
import { getBangkokTodayString, get30DayCountdown } from '../utils/dateUtils';
import { recordAuditLog } from '../services/auditService';
import { 
  db as idb, 
  enqueuePendingSync, 
  getPendingSyncItems, 
  removePendingSyncItem, 
  logSyncEvent, 
  cacheBranchLocally 
} from '../services/offlineService';
import { sendTelegramNotification } from '../services/telegramService';

const DatabaseContext = createContext();

export function DatabaseProvider({ children }) {
  const { userProfile, isOwner, isSupervisor } = useAuth();
  
  // Date State
  const [selectedDate, setSelectedDate] = useState(getBangkokTodayString());
  const isToday = selectedDate === getBangkokTodayString();

  // Core Data States
  const [employees, setEmployees] = useState({});
  const [machines, setMachines] = useState({});
  const [dailyData, setDailyData] = useState({
    assignments: {},
    machineStates: {},
    positionOrder: ['เข้าเครื่อง', 'พับ', 'ซีน'],
    customPositions: {}
  });
  const [auditLogs, setAuditLogs] = useState([]);
  const [systemSettings, setSystemSettings] = useState({
    defaultOtRate: 50.0,
    maxMachines: 20,
    notificationCategories: {}
  });
  const [usersList, setUsersList] = useState({});

  // UI & Sync Indicators
  const [autoSaveToast, setAutoSaveToast] = useState(false);
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced' | 'syncing' | 'offline' | 'pending'
  const [pendingCount, setPendingCount] = useState(0);
  const [showDailyStatusModal, setShowDailyStatusModal] = useState(false);
  const [reopenPromptMachine, setReopenPromptMachine] = useState(null); // For Reopen Modal

  // Trigger quick toast "✓ บันทึกแล้ว"
  const triggerAutoSaveFeedback = () => {
    setAutoSaveToast(true);
    setTimeout(() => setAutoSaveToast(false), 2000);
  };

  // Check Pending Sync Queue size
  const updatePendingCount = async () => {
    try {
      const items = await getPendingSyncItems();
      setPendingCount(items.length);
      if (!navigator.onLine) {
        setSyncStatus('offline');
      } else if (items.length > 0) {
        setSyncStatus('pending');
      } else {
        setSyncStatus('synced');
      }
    } catch (e) {
      // Ignore
    }
  };

  // Sync Queue Runner (Latest Timestamp Wins)
  const processPendingSyncQueue = useCallback(async () => {
    if (!navigator.onLine) return;
    const items = await getPendingSyncItems();
    if (items.length === 0) {
      setSyncStatus('synced');
      return;
    }

    setSyncStatus('syncing');
    for (const item of items) {
      try {
        const itemRef = ref(rtdb, item.path);
        if (item.action === 'set') {
          await set(itemRef, item.payload);
        } else if (item.action === 'update') {
          await update(itemRef, item.payload);
        } else if (item.action === 'remove') {
          await remove(itemRef);
        }
        await removePendingSyncItem(item.id);
        await logSyncEvent('success', `Synced ${item.action} at ${item.path}`);
      } catch (err) {
        console.error('Sync failed for item:', item, err);
        await logSyncEvent('conflict', `Conflict at ${item.path}: ${err.message}`);
      }
    }
    await updatePendingCount();
  }, []);

  // Listen to network status
  useEffect(() => {
    const handleOnline = () => {
      processPendingSyncQueue();
    };
    const handleOffline = () => {
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    updatePendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [processPendingSyncQueue]);

  // Real-time RTDB Listeners
  useEffect(() => {
    if (!userProfile) return;

    // 1. Employees Listener
    const empRef = ref(rtdb, 'employees');
    const unsubEmp = onValue(empRef, (snap) => {
      const val = snap.val() || {};
      setEmployees(val);
      cacheBranchLocally('employees', val);
    });

    // 2. Machines Listener
    const machRef = ref(rtdb, 'machines');
    const unsubMach = onValue(machRef, (snap) => {
      let val = snap.val();
      if (!val) {
        // Fallback default machines
        val = {};
        INITIAL_MACHINES.forEach(num => {
          val[num] = { id: num, number: num, name: `เครื่อง ${num}` };
        });
      }
      setMachines(val);
      cacheBranchLocally('machines', val);
    });

    // 3. System Settings Listener
    const sysRef = ref(rtdb, 'system/settings');
    const unsubSys = onValue(sysRef, (snap) => {
      const val = snap.val() || {};
      setSystemSettings(prev => ({ ...prev, ...val }));
    });

    // 4. Audit Logs Listener (Last 100)
    const logsRef = ref(rtdb, 'auditLogs');
    const unsubLogs = onValue(logsRef, (snap) => {
      const val = snap.val() || {};
      const list = Object.values(val).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setAuditLogs(list);
      cacheBranchLocally('auditLogs', val);
    });

    // 5. Users List (Owner only or for display)
    const usersRef = ref(rtdb, 'users');
    const unsubUsers = onValue(usersRef, (snap) => {
      setUsersList(snap.val() || {});
    });

    return () => {
      unsubEmp();
      unsubMach();
      unsubSys();
      unsubLogs();
      unsubUsers();
    };
  }, [userProfile]);

  // Daily Data Listener for selectedDate
  useEffect(() => {
    if (!userProfile || !selectedDate) return;

    const dailyRef = ref(rtdb, `daily/${selectedDate}`);
    const unsubDaily = onValue(dailyRef, (snap) => {
      const val = snap.val();
      if (val) {
        setDailyData({
          assignments: val.assignments || {},
          machineStates: val.machineStates || {},
          positionOrder: val.positionOrder || ['เข้าเครื่อง', 'พับ', 'ซีน'],
          customPositions: val.customPositions || {}
        });
      } else {
        // Initialize daily data if empty
        initDailyData(selectedDate);
      }
    });

    return () => unsubDaily();
  }, [userProfile, selectedDate, employees, machines]);

  // Initializer for a given date
  const initDailyData = async (date) => {
    const activeList = Object.values(employees).filter(e => e.status !== 'resigned');
    const machineList = Object.values(machines);

    const initialAssignments = {};
    activeList.forEach(emp => {
      initialAssignments[emp.id] = {
        empId: emp.id,
        dailyStatus: DAILY_STATUS.UNSPECIFIED,
        otherStatusReason: '',
        job: null,
        machine: null,
        isOt: false,
        otHours: 0,
        updatedAt: Date.now()
      };
    });

    const initialMachineStates = {};
    machineList.forEach(m => {
      initialMachineStates[m.number] = {
        status: MACHINE_STATUS.VACANT,
        assignedEmpId: null,
        lastAssignedEmpId: null,
        lastJob: null,
        lastOtHours: null,
        lastIsOt: false,
        closedAt: null
      };
    });

    const newDaily = {
      assignments: initialAssignments,
      machineStates: initialMachineStates,
      positionOrder: ['เข้าเครื่อง', 'พับ', 'ซีน'],
      customPositions: {},
      createdAt: Date.now()
    };

    if (navigator.onLine) {
      await set(ref(rtdb, `daily/${date}`), newDaily);
    } else {
      await enqueuePendingSync('set', `daily/${date}`, newDaily);
    }
  };

  // Check if Daily Status Modal should pop up on login
  useEffect(() => {
    if (!isToday || !userProfile) return;
    const assignments = dailyData.assignments || {};
    const activeEmpList = Object.values(employees).filter(e => e.status !== 'resigned');
    
    if (activeEmpList.length > 0) {
      const hasUnspecified = activeEmpList.some(emp => {
        const assign = assignments[emp.id];
        return !assign || assign.dailyStatus === DAILY_STATUS.UNSPECIFIED;
      });

      const dismissedToday = sessionStorage.getItem(`dismissed_modal_${selectedDate}`);
      if (hasUnspecified && !dismissedToday) {
        setShowDailyStatusModal(true);
      }
    }
  }, [dailyData.assignments, employees, isToday, selectedDate, userProfile]);

  /**
   * Helper to write RTDB mutation with Offline Queue fallback
   */
  const writeData = async (path, payload, action = 'update') => {
    triggerAutoSaveFeedback();
    if (navigator.onLine) {
      try {
        const targetRef = ref(rtdb, path);
        if (action === 'set') {
          await set(targetRef, payload);
        } else if (action === 'update') {
          await update(targetRef, payload);
        } else if (action === 'remove') {
          await remove(targetRef);
        }
      } catch (err) {
        console.warn('Network write failed, enqueuing offline write:', err);
        await enqueuePendingSync(action, path, payload);
        await updatePendingCount();
      }
    } else {
      await enqueuePendingSync(action, path, payload);
      await updatePendingCount();
    }
  };

  // ==========================================
  // EMPLOYEE ACTIONS (Master)
  // ==========================================
  const addEmployee = async ({ name, nickname, employeeId, otRate }) => {
    const id = `emp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newEmp = {
      id,
      name,
      nickname: nickname || '',
      employeeId: employeeId || '',
      otRate: parseFloat(otRate) || DEFAULT_OT_RATE,
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await writeData(`employees/${id}`, newEmp, 'set');
    
    // Also add to today's daily assignment
    if (isToday) {
      await writeData(`daily/${selectedDate}/assignments/${id}`, {
        empId: id,
        dailyStatus: DAILY_STATUS.UNSPECIFIED,
        job: null,
        machine: null,
        isOt: false,
        otHours: 0,
        updatedAt: Date.now()
      });
    }

    await recordAuditLog({
      category: AUDIT_CATEGORIES.EMPLOYEE_INFO,
      action: 'เพิ่มพนักงานใหม่',
      targetEmp: newEmp,
      newValue: newEmp,
      description: `เพิ่มพนักงานใหม่: ${newEmp.name} (${newEmp.employeeId})`,
      user: userProfile
    });
  };

  const updateEmployee = async (id, updates) => {
    const oldEmp = employees[id] || {};
    const updated = {
      ...updates,
      updatedAt: Date.now()
    };

    await writeData(`employees/${id}`, updated, 'update');

    if (updates.otRate !== undefined && updates.otRate !== oldEmp.otRate) {
      await recordAuditLog({
        category: AUDIT_CATEGORIES.OT,
        action: 'เปลี่ยนอัตราค่า OT',
        targetEmp: oldEmp,
        oldValue: oldEmp.otRate,
        newValue: updates.otRate,
        description: `เปลี่ยนอัตราค่า OT ของ ${oldEmp.name}: ${oldEmp.otRate} → ${updates.otRate} บาท/ชม. (มีผลย้อนหลังทั้งหมด)`,
        user: userProfile
      });
    } else {
      await recordAuditLog({
        category: AUDIT_CATEGORIES.EMPLOYEE_INFO,
        action: 'แก้ไขข้อมูลพนักงาน',
        targetEmp: oldEmp,
        oldValue: oldEmp,
        newValue: { ...oldEmp, ...updates },
        description: `แก้ไขข้อมูลพนักงาน: ${oldEmp.name}`,
        user: userProfile
      });
    }
  };

  const resignEmployee = async (id, reason = 'ลาออก') => {
    const emp = employees[id];
    if (!emp) return;

    // Soft delete -> move to backup list
    await writeData(`employees/${id}`, {
      status: 'resigned',
      resignedAt: Date.now(),
      resignedReason: reason
    }, 'update');

    // If currently assigned today, clear
    const currentAssign = dailyData.assignments[id];
    if (currentAssign && currentAssign.machine) {
      await setMachineStatus(currentAssign.machine, MACHINE_STATUS.VACANT);
    }
    if (isToday) {
      await writeData(`daily/${selectedDate}/assignments/${id}`, {
        dailyStatus: DAILY_STATUS.UNSPECIFIED,
        job: null,
        machine: null,
        isOt: false,
        otHours: 0
      });
    }

    await recordAuditLog({
      category: AUDIT_CATEGORIES.EMPLOYEE_INFO,
      action: 'ย้ายไปรายชื่อสำรอง',
      targetEmp: emp,
      oldValue: 'active',
      newValue: 'resigned',
      description: `ย้ายพนักงาน ${emp.name} (${emp.employeeId}) ไปยังรายชื่อสำรอง (เหตุผล: ${reason})`,
      user: userProfile
    });
  };

  const restoreEmployee = async (id) => {
    const emp = employees[id];
    if (!emp) return;

    await writeData(`employees/${id}`, {
      status: 'active',
      resignedAt: null
    }, 'update');

    // If restore on today -> daily status = 'ยังไม่ได้ระบุ'
    if (isToday) {
      await writeData(`daily/${selectedDate}/assignments/${id}`, {
        empId: id,
        dailyStatus: DAILY_STATUS.UNSPECIFIED,
        job: null,
        machine: null,
        isOt: false,
        otHours: 0,
        updatedAt: Date.now()
      });
    }

    await recordAuditLog({
      category: AUDIT_CATEGORIES.EMPLOYEE_INFO,
      action: 'นำกลับมาใช้งาน',
      targetEmp: emp,
      oldValue: 'resigned',
      newValue: 'active',
      description: `นำพนักงาน ${emp.name} กลับมาใช้งานจากรายชื่อสำรอง`,
      user: userProfile
    });
  };

  const permanentDeleteEmployee = async (id) => {
    if (!isOwner) throw new Error('เฉพาะ Owner เท่านั้นที่สามารถลบถาวรได้');
    const emp = employees[id];
    if (!emp) return;

    await writeData(`employees/${id}`, null, 'remove');

    await recordAuditLog({
      category: AUDIT_CATEGORIES.EMPLOYEE_INFO,
      action: 'ลบบัญชีถาวร',
      targetEmp: emp,
      description: `⚠️ ลบพนักงาน ${emp.name} (${emp.employeeId}) ถาวรจากระบบโดย Owner`,
      user: userProfile
    });
  };

  // ==========================================
  // DAILY STATUS & ASSIGNMENT ACTIONS
  // ==========================================
  const updateDailyStatus = async (empId, newStatus, reason = '') => {
    const emp = employees[empId];
    const prevAssign = dailyData.assignments[empId] || {};
    const oldStatus = prevAssign.dailyStatus || DAILY_STATUS.UNSPECIFIED;

    if (oldStatus === newStatus && (!reason || reason === prevAssign.otherStatusReason)) return;

    let updates = {
      dailyStatus: newStatus,
      otherStatusReason: reason || '',
      updatedAt: Date.now(),
      updatedBy: userProfile?.uid
    };

    // Business Rule 17:
    // When changing from 'มาทำงาน' to 'ลา/หยุด/อื่นๆ' -> CLEAR job, machine, OT immediately!
    if (oldStatus === DAILY_STATUS.WORKING && newStatus !== DAILY_STATUS.WORKING) {
      if (prevAssign.machine) {
        // Free machine
        await setMachineStatus(prevAssign.machine, MACHINE_STATUS.VACANT);
      }
      updates.job = null;
      updates.machine = null;
      updates.isOt = false;
      updates.otHours = 0;
    }

    // When changing from 'ลา/หยุด' to 'มาทำงาน' -> Set to มาทำงาน, ยังไม่ได้จัดงาน, no machine, OT=0
    if (oldStatus !== DAILY_STATUS.WORKING && newStatus === DAILY_STATUS.WORKING) {
      updates.job = null;
      updates.machine = null;
      updates.isOt = false;
      updates.otHours = 0;
    }

    await writeData(`daily/${selectedDate}/assignments/${empId}`, updates);

    // Auto-clean custom position if vacated
    if (prevAssign.job && !Object.values(MAIN_POSITIONS).includes(prevAssign.job)) {
      cleanupCustomPositionIfEmpty(prevAssign.job, empId);
    }

    await recordAuditLog({
      category: AUDIT_CATEGORIES.DAILY_STATUS,
      action: 'เปลี่ยนสถานะประจำวัน',
      targetEmp: emp,
      oldValue: oldStatus,
      newValue: newStatus,
      description: `สถานะของ ${emp?.name || empId}: ${oldStatus} → ${newStatus}`,
      user: userProfile
    });
  };

  const updateAssignment = async (empId, { job, machine, isOt, otHours }) => {
    const emp = employees[empId];
    const prevAssign = dailyData.assignments[empId] || {};
    const oldJob = prevAssign.job;
    const oldMach = prevAssign.machine;

    const updates = {
      updatedAt: Date.now(),
      updatedBy: userProfile?.uid
    };

    if (job !== undefined) updates.job = job;
    if (machine !== undefined) updates.machine = machine;
    if (isOt !== undefined) {
      updates.isOt = isOt;
      if (!isOt) updates.otHours = 0;
    }
    if (otHours !== undefined) {
      const parsedHours = parseFloat(otHours) || 0;
      updates.otHours = parsedHours;
      if (parsedHours <= 0) {
        updates.isOt = false;
      } else {
        updates.isOt = true;
      }
    }

    // Machine rules:
    // If job changed away from 'เข้าเครื่อง' -> release machine
    if (updates.job && updates.job !== MAIN_POSITIONS.MACHINE && oldMach) {
      await setMachineStatus(oldMach, MACHINE_STATUS.VACANT);
      updates.machine = null;
    }

    // If machine changed (e.g. 005 -> 007)
    if (updates.machine && updates.machine !== oldMach) {
      if (oldMach) {
        await setMachineStatus(oldMach, MACHINE_STATUS.VACANT);
      }
      await setMachineStatus(updates.machine, MACHINE_STATUS.IN_USE, empId);
    }

    await writeData(`daily/${selectedDate}/assignments/${empId}`, updates);

    // Clean empty custom position if vacated
    if (oldJob && !Object.values(MAIN_POSITIONS).includes(oldJob) && oldJob !== updates.job) {
      cleanupCustomPositionIfEmpty(oldJob, empId);
    }

    // Audit Logging
    let logDesc = [];
    if (job !== undefined && job !== oldJob) {
      logDesc.push(`งาน: ${oldJob || 'ยังไม่ได้จัดงาน'} → ${job || 'ยังไม่ได้จัดงาน'}`);
    }
    if (machine !== undefined && machine !== oldMach) {
      logDesc.push(`เครื่อง: ${oldMach || 'ไม่มี'} → ${machine || 'ไม่มี'}`);
    }
    if (otHours !== undefined && otHours !== prevAssign.otHours) {
      logDesc.push(`OT: ${prevAssign.otHours || 0} → ${otHours} ชม.`);
    }

    if (logDesc.length > 0) {
      await recordAuditLog({
        category: machine !== undefined && machine !== oldMach ? AUDIT_CATEGORIES.MACHINE_CHANGE : (otHours !== undefined ? AUDIT_CATEGORIES.OT : AUDIT_CATEGORIES.ASSIGNMENT),
        action: 'ปรับปรุงการจัดงาน',
        targetEmp: emp,
        oldValue: { job: oldJob, machine: oldMach, otHours: prevAssign.otHours },
        newValue: { job: updates.job ?? oldJob, machine: updates.machine ?? oldMach, otHours: updates.otHours ?? prevAssign.otHours },
        description: `${emp?.name}: ${logDesc.join(', ')}`,
        user: userProfile
      });
    }
  };

  // ==========================================
  // CUSTOM POSITIONS ACTIONS
  // ==========================================
  const addCustomPosition = async (positionName) => {
    const trimmed = positionName.trim();
    if (!trimmed) return;

    const id = `pos_${Date.now()}`;
    const newPos = { id, name: trimmed, createdAt: Date.now() };

    // Append to positionOrder
    const currentOrder = dailyData.positionOrder || ['เข้าเครื่อง', 'พับ', 'ซีน'];
    const updatedOrder = [...currentOrder, trimmed];

    await writeData(`daily/${selectedDate}/customPositions/${id}`, newPos, 'set');
    await writeData(`daily/${selectedDate}/positionOrder`, updatedOrder, 'set');
  };

  const cleanupCustomPositionIfEmpty = async (positionName, excludedEmpId = null) => {
    const assignments = dailyData.assignments || {};
    // Check if any other employee is using this custom position
    const isStillUsed = Object.entries(assignments).some(([empId, assign]) => {
      if (empId === excludedEmpId) return false;
      return assign.job === positionName;
    });

    if (!isStillUsed) {
      // Find key in customPositions
      const customPos = dailyData.customPositions || {};
      const match = Object.entries(customPos).find(([_, p]) => p.name === positionName);
      if (match) {
        await writeData(`daily/${selectedDate}/customPositions/${match[0]}`, null, 'remove');
      }
      // Remove from position order
      const currentOrder = dailyData.positionOrder || ['เข้าเครื่อง', 'พับ', 'ซีน'];
      const filteredOrder = currentOrder.filter(p => p !== positionName);
      await writeData(`daily/${selectedDate}/positionOrder`, filteredOrder, 'set');
    }
  };

  const reorderPositions = async (newOrder) => {
    // Note: Position reordering does NOT record audit log as per Req 15
    await writeData(`daily/${selectedDate}/positionOrder`, newOrder, 'set');
  };

  // ==========================================
  // MACHINE ACTIONS
  // ==========================================
  const setMachineStatus = async (machineNumber, status, empId = null) => {
    const currentState = dailyData.machineStates[machineNumber] || {};
    const machineUpdates = {
      status,
      assignedEmpId: status === MACHINE_STATUS.IN_USE ? empId : null
    };

    if (status === MACHINE_STATUS.IN_USE && empId) {
      machineUpdates.lastAssignedEmpId = empId;
      const assign = dailyData.assignments[empId] || {};
      machineUpdates.lastJob = assign.job || MAIN_POSITIONS.MACHINE;
      machineUpdates.lastOtHours = assign.otHours || 0;
      machineUpdates.lastIsOt = assign.isOt || false;
    } else if (status === MACHINE_STATUS.CLOSED) {
      machineUpdates.closedAt = Date.now();
    }

    await writeData(`daily/${selectedDate}/machineStates/${machineNumber}`, machineUpdates);
  };

  const closeMachine = async (machineNumber) => {
    const state = dailyData.machineStates[machineNumber] || {};
    const currentEmpId = state.assignedEmpId;

    await setMachineStatus(machineNumber, MACHINE_STATUS.CLOSED);

    // Business Rule 22:
    // If machine was in use, employee becomes 'ยังไม่ได้จัดงาน', clear job/machine/OT
    if (currentEmpId) {
      const emp = employees[currentEmpId];
      await writeData(`daily/${selectedDate}/assignments/${currentEmpId}`, {
        job: null,
        machine: null,
        isOt: false,
        otHours: 0,
        updatedAt: Date.now()
      });

      await recordAuditLog({
        category: AUDIT_CATEGORIES.MACHINE,
        action: 'ปิดใช้งานเครื่องจักรขณะทำงาน',
        targetEmp: emp,
        description: `ปิดเครื่อง ${machineNumber} (พนักงาน ${emp?.name || currentEmpId} ถูกเปลี่ยนเป็นยังไม่ได้จัดงาน)`,
        user: userProfile
      });
    } else {
      await recordAuditLog({
        category: AUDIT_CATEGORIES.MACHINE,
        action: 'ปิดใช้งานเครื่องจักร',
        description: `ปิดเครื่อง ${machineNumber}`,
        user: userProfile
      });
    }
  };

  const reopenMachine = async (machineNumber, mode = 'vacant') => {
    const state = dailyData.machineStates[machineNumber] || {};
    const lastEmpId = state.lastAssignedEmpId;

    if (mode === 'restore' && lastEmpId && employees[lastEmpId]?.status !== 'resigned') {
      // Restore previous employee
      await setMachineStatus(machineNumber, MACHINE_STATUS.IN_USE, lastEmpId);
      await writeData(`daily/${selectedDate}/assignments/${lastEmpId}`, {
        dailyStatus: DAILY_STATUS.WORKING,
        job: state.lastJob || MAIN_POSITIONS.MACHINE,
        machine: machineNumber,
        isOt: state.lastIsOt || false,
        otHours: state.lastOtHours || 0,
        updatedAt: Date.now()
      });

      await recordAuditLog({
        category: AUDIT_CATEGORIES.MACHINE,
        action: 'เปิดเครื่องจักรและคืนพนักงานคนเดิม',
        targetEmp: employees[lastEmpId],
        description: `เปิดเครื่อง ${machineNumber} และคืนพนักงาน ${employees[lastEmpId]?.name}`,
        user: userProfile
      });
    } else {
      // Reopen as vacant
      await setMachineStatus(machineNumber, MACHINE_STATUS.VACANT);
      await recordAuditLog({
        category: AUDIT_CATEGORIES.MACHINE,
        action: 'เปิดเครื่องจักร',
        description: `เปิดเครื่อง ${machineNumber} เป็นสถานะว่าง`,
        user: userProfile
      });
    }
  };

  const addMachine = async (customNumber = null) => {
    const existingList = Object.keys(machines);
    if (existingList.length >= systemSettings.maxMachines) {
      throw new Error(`ไม่สามารถเพิ่มเครื่องเกิน ${systemSettings.maxMachines} เครื่องได้`);
    }

    // Auto-suggest next 3-digit number
    let nextNum = customNumber;
    if (!nextNum) {
      for (let i = 1; i <= systemSettings.maxMachines; i++) {
        const candidate = String(i).padStart(3, '0');
        if (!machines[candidate]) {
          nextNum = candidate;
          break;
        }
      }
    }

    if (!nextNum || machines[nextNum]) {
      throw new Error('หมายเลขเครื่องซ้ำหรือไม่ถูกต้อง');
    }

    const machineObj = {
      id: nextNum,
      number: nextNum,
      name: `เครื่อง ${nextNum}`,
      createdAt: Date.now()
    };

    await writeData(`machines/${nextNum}`, machineObj, 'set');
    await setMachineStatus(nextNum, MACHINE_STATUS.VACANT);

    await recordAuditLog({
      category: AUDIT_CATEGORIES.MACHINE,
      action: 'เพิ่มเครื่องจักรใหม่',
      description: `เพิ่มเครื่องจักรหมายเลข ${nextNum}`,
      user: userProfile
    });
  };

  const editMachineNumber = async (oldNumber, newNumber) => {
    const currentState = dailyData.machineStates[oldNumber] || {};
    if (currentState.status === MACHINE_STATUS.IN_USE) {
      throw new Error('ไม่สามารถแก้ไขหมายเลขเครื่องขณะกำลังใช้งานได้');
    }

    if (machines[newNumber]) {
      throw new Error('หมายเลขเครื่องใหม่ซ้ำกับเครื่องที่มีอยู่แล้ว');
    }

    const machineObj = {
      id: newNumber,
      number: newNumber,
      name: `เครื่อง ${newNumber}`,
      createdAt: machines[oldNumber]?.createdAt || Date.now()
    };

    // Remove old, add new
    await writeData(`machines/${newNumber}`, machineObj, 'set');
    await writeData(`machines/${oldNumber}`, null, 'remove');
    await setMachineStatus(newNumber, currentState.status || MACHINE_STATUS.VACANT);
    await writeData(`daily/${selectedDate}/machineStates/${oldNumber}`, null, 'remove');

    await recordAuditLog({
      category: AUDIT_CATEGORIES.MACHINE,
      action: 'แก้ไขหมายเลขเครื่องจักร',
      description: `เปลี่ยนหมายเลขเครื่อง: ${oldNumber} → ${newNumber}`,
      user: userProfile
    });
  };

  return (
    <DatabaseContext.Provider
      value={{
        selectedDate,
        setSelectedDate,
        isToday,
        employees,
        machines,
        dailyData,
        auditLogs,
        systemSettings,
        usersList,
        autoSaveToast,
        syncStatus,
        pendingCount,
        showDailyStatusModal,
        setShowDailyStatusModal,
        reopenPromptMachine,
        setReopenPromptMachine,
        addEmployee,
        updateEmployee,
        resignEmployee,
        restoreEmployee,
        permanentDeleteEmployee,
        updateDailyStatus,
        updateAssignment,
        addCustomPosition,
        reorderPositions,
        setMachineStatus,
        closeMachine,
        reopenMachine,
        addMachine,
        editMachineNumber,
        writeData
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  return useContext(DatabaseContext);
}
