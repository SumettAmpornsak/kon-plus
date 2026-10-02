// Database Service for Kon Plus (Firebase RTDB + Local Fallback)
import { 
  ref, set, get, update, remove, onValue, off 
} from 'firebase/database';
import { rtdb } from './firebase';
import { 
  INITIAL_MACHINES, 
  MACHINE_STATUS, 
  DAILY_STATUS, 
  ROLES, 
  AUDIT_CATEGORIES 
} from '../utils/constants';
import { getBangkokTodayString } from '../utils/dateUtils';
import { recordAuditLog } from './auditService';
import { cacheBranchLocally } from './offlineService';

/**
 * Initialize default machines and system settings if not already present
 */
export async function initializeSystemDefaults(ownerUser = null) {
  try {
    // Check if owner already claimed
    const ownerUidRef = ref(rtdb, 'system/ownerUid');
    const ownerUidSnap = await get(ownerUidRef);

    if (ownerUidSnap.exists() && ownerUidSnap.val()) {
      console.log('System already has an owner, skipping init.');
      return;
    }

    // ---------------------------------------------------------
    // FIRST: Create owner user record
    // ---------------------------------------------------------
    // This must happen before claiming /system/ownerUid because
    // the Security Rules allow the first user to create their
    // own user record only while ownerUid does not exist.
    if (ownerUser) {
      const ownerRecord = {
        uid: ownerUser.uid,
        email: ownerUser.email,
        displayName: ownerUser.displayName || ownerUser.email,
        photoURL: ownerUser.photoURL || null,
        role: ROLES.OWNER,
        nickname: 'Owner',
        employeeId: 'ADM-001',
        status: 'active',
        createdAt: Date.now(),
        lastLoginAt: Date.now()
      };

      await set(
        ref(rtdb, `users/${ownerUser.uid}`),
        ownerRecord
      );

      console.log('Owner created:', ownerUser.email);
    }

    // ---------------------------------------------------------
    // SECOND: Claim system owner UID
    // ---------------------------------------------------------
    if (ownerUser) {
      await set(
        ref(rtdb, 'system/ownerUid'),
        ownerUser.uid
      );
    }

    // ---------------------------------------------------------
    // THIRD: Write system settings separately
    // ---------------------------------------------------------
    // Do NOT write the whole /system node here.
    // Security Rules only allow writing the individual
    // /system/settings and /system/telegram paths.
    await set(
      ref(rtdb, 'system/settings'),
      {
        defaultOtRate: 50.0,
        maxMachines: 20,
        autoBackupDays: 7,
        notificationCategories: {
          newDaySummary: true,
          unassignedAlert: true,
          jobMachineChange: true,
          otChange: true,
          machineEvent: true,
          supervisorEvent: true,
          importantEdits: true,
          endOfDaySummary: true
        }
      }
    );

    // ---------------------------------------------------------
    // FOURTH: Write Telegram settings separately
    // ---------------------------------------------------------
    await set(
      ref(rtdb, 'system/telegram'),
      {
        botToken: '',
        chatId: '',
        enabled: false,
        verificationCode:
          Math.floor(100000 + Math.random() * 900000).toString()
      }
    );

    // ---------------------------------------------------------
    // FIFTH: Write default machines
    // ---------------------------------------------------------
    const defaultMachines = {};

    INITIAL_MACHINES.forEach(num => {
      defaultMachines[num] = {
        id: num,
        number: num,
        name: `เครื่อง ${num}`,
        createdAt: Date.now()
      };
    });

    await set(
      ref(rtdb, 'machines'),
      defaultMachines
    );

    console.log('System initialized successfully.');
  } catch (error) {
    console.error('Error during system initialization:', error);
    throw error;
  }
}

/**
 * Fetch or initialize daily assignment data for a specific date (YYYY-MM-DD)
 */
export async function ensureDailyStructure(
  dateString,
  activeEmployees = [],
  masterMachines = []
) {
  if (!dateString) dateString = getBangkokTodayString();

  try {
    const dailyRef = ref(rtdb, `daily/${dateString}`);
    const snapshot = await get(dailyRef);

    if (!snapshot.exists()) {
      // New Day initialization:
      // 1. All active employees start as 'ยังไม่ได้ระบุ'
      // 2. All machines start as 'vacant' (🟢 ว่าง)
      //    - does NOT carry over closed or assigned state!
      const initialAssignments = {};

      activeEmployees.forEach(emp => {
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

      masterMachines.forEach(m => {
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

      const newDayData = {
        positionOrder: ['เข้าเครื่อง', 'พับ', 'ซีน'],
        customPositions: {},
        assignments: initialAssignments,
        machineStates: initialMachineStates,
        createdAt: Date.now()
      };

      await set(dailyRef, newDayData);

      return newDayData;
    }

    return snapshot.val();
  } catch (error) {
    console.error('Error ensuring daily structure:', error);
    return null;
  }
}

/**
 * Record a login event into /loginHistory (Append-Only)
 */
export async function recordLoginHistory({
  user,
  success,
  ip = '127.0.0.1',
  location = 'Bangkok, Thailand'
}) {
  const timestamp = Date.now();

  const loginEntry = {
    id: `login_${timestamp}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp,
    dateString: new Date(timestamp).toLocaleString(
      'th-TH',
      { timeZone: 'Asia/Bangkok' }
    ),
    email: user?.email || 'unknown',
    uid: user?.uid || null,
    displayName:
      user?.displayName ||
      user?.email ||
      'ผู้ใช้งาน',
    success: !!success,
    ip,
    location
  };

  try {
    const loginRef = ref(
      rtdb,
      `loginHistory/${loginEntry.id}`
    );

    await set(loginRef, loginEntry);
  } catch (error) {
    console.error(
      'Failed to log login history:',
      error
    );
  }
}