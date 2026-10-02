// Authentication Context for Kon Plus
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { ref, get, set, update } from 'firebase/database';
import { auth, googleProvider, rtdb, isDemoConfig } from '../services/firebase';
import { ROLES } from '../utils/constants';
import { getBangkokTodayString } from '../utils/dateUtils';
import { recordLoginHistory, initializeSystemDefaults } from '../services/dbService';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [isNewDayLogout, setIsNewDayLogout] = useState(false);

  // Track login date for session rollover at 00:00 Bangkok time
  useEffect(() => {
    const sessionDate = localStorage.getItem('kon_plus_session_date');
    const today = getBangkokTodayString();

    if (sessionDate && sessionDate !== today && currentUser) {
      // New day arrived! Require re-login
      setIsNewDayLogout(true);
      logout();
    } else if (currentUser && !sessionDate) {
      localStorage.setItem('kon_plus_session_date', today);
    }

    // Periodic check every 1 minute to detect date change across 00:00
    const interval = setInterval(() => {
      const currentToday = getBangkokTodayString();
      const currentSessionDate = localStorage.getItem('kon_plus_session_date');
      if (currentSessionDate && currentSessionDate !== currentToday && currentUser) {
        setIsNewDayLogout(true);
        logout();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [currentUser]);

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await verifyAndLoadUserProfile(firebaseUser);
      } else {
        // Check for local demo session if applicable
        const demoUser = localStorage.getItem('kon_plus_demo_session');
        if (demoUser) {
          try {
            const parsed = JSON.parse(demoUser);
            setUserProfile(parsed);
            setCurrentUser({ uid: parsed.uid, email: parsed.email });
          } catch (e) {
            setUserProfile(null);
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
          setUserProfile(null);
        }
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  /**
   * Fetch user IP and location approximation
   */
  const fetchClientInfo = async () => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (res.ok) {
        const data = await res.json();
        return {
          ip: data.ip || '127.0.0.1',
          location: `${data.city || 'Bangkok'}, ${data.country_name || 'Thailand'}`
        };
      }
    } catch (e) {
      // Ignore network fail
    }
    return { ip: '127.0.0.1', location: 'Bangkok, Thailand' };
  };

  /**
   * Verify Whitelist and load profile from Realtime Database
   */
  const verifyAndLoadUserProfile = async (firebaseUser) => {
    setLoading(true);
    setAuthError(null);
    const clientInfo = await fetchClientInfo();

    try {
      // 1. Check if system has an owner
      const sysRef = ref(rtdb, 'system');
      const sysSnap = await get(sysRef);

      // Check user record in /users/{uid}
      const userRef = ref(rtdb, `users/${firebaseUser.uid}`);
      let userSnap = await get(userRef);

      // If user not found by UID, check if added by email
      if (!userSnap.exists()) {
        const usersRef = ref(rtdb, 'users');
        const allUsersSnap = await get(usersRef);
        if (allUsersSnap.exists()) {
          const allUsers = allUsersSnap.val();
          const matchEntry = Object.entries(allUsers).find(([_, u]) => u.email?.toLowerCase() === firebaseUser.email?.toLowerCase());
          if (matchEntry) {
            const [oldKey, existingData] = matchEntry;
            // Migrate to UID key if needed
            const migrated = {
              ...existingData,
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || existingData.displayName,
              photoURL: firebaseUser.photoURL || existingData.photoURL,
              lastLoginAt: Date.now()
            };
            await set(ref(rtdb, `users/${firebaseUser.uid}`), migrated);
            userSnap = await get(userRef);
          }
        }
      }

      // Case A: First time setup / No owner in system -> Claim Owner
      if (!sysSnap.exists() || !sysSnap.val()?.ownerUid) {
        await initializeSystemDefaults(firebaseUser);
        userSnap = await get(userRef);
      }

      // Case B: User does not exist in whitelist
      if (!userSnap.exists()) {
        await recordLoginHistory({
          user: firebaseUser,
          success: false,
          ip: clientInfo.ip,
          location: clientInfo.location
        });
        await firebaseSignOut(auth);
        setCurrentUser(null);
        setUserProfile(null);
        setAuthError('ไม่มีสิทธิ์เข้าใช้งานระบบคนพลัส');
        setLoading(false);
        return;
      }

      const profile = userSnap.val();

      // Case C: User is disabled
      if (profile.status === 'disabled') {
        await recordLoginHistory({
          user: firebaseUser,
          success: false,
          ip: clientInfo.ip,
          location: clientInfo.location
        });
        await firebaseSignOut(auth);
        setCurrentUser(null);
        setUserProfile(null);
        setAuthError('บัญชีนี้ถูกปิดการใช้งาน กรุณาติดต่อผู้ดูแลระบบ (Owner)');
        setLoading(false);
        return;
      }

      // Sync latest Google display name and photoURL
      await update(userRef, {
        displayName: firebaseUser.displayName || profile.displayName,
        photoURL: firebaseUser.photoURL || profile.photoURL,
        lastLoginAt: Date.now()
      });

      const updatedProfile = {
        ...profile,
        displayName: firebaseUser.displayName || profile.displayName,
        photoURL: firebaseUser.photoURL || profile.photoURL,
        uid: firebaseUser.uid,
        email: firebaseUser.email
      };

      // Record successful login
      await recordLoginHistory({
        user: updatedProfile,
        success: true,
        ip: clientInfo.ip,
        location: clientInfo.location
      });

      localStorage.setItem('kon_plus_session_date', getBangkokTodayString());
      setCurrentUser(firebaseUser);
      setUserProfile(updatedProfile);
    } catch (error) {
      console.error('Error verifying user profile:', error);
      setAuthError('เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Google Sign In
   */
  const loginWithGoogle = async () => {
    setLoading(true);
    setAuthError(null);
    setIsNewDayLogout(false);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login error:', error);
      if (error.code !== 'auth/popup-closed-by-user') {
        setAuthError('ไม่สามารถเข้าสู่ระบบผ่าน Google ได้: ' + error.message);
      }
      setLoading(false);
    }
  };

  /**
   * Demo Login Simulation for development / immediate evaluation without live credentials
   */
  const loginDemoAccount = async (role = ROLES.OWNER) => {
    setLoading(true);
    const isOwner = role === ROLES.OWNER;
    const mockUser = {
      uid: isOwner ? 'demo_owner_uid' : 'demo_supervisor_uid',
      email: isOwner ? 'owner.konplus@gmail.com' : 'supervisor.konplus@gmail.com',
      displayName: isOwner ? 'สมชัย ผู้ดูแลระบบ (Owner)' : 'สมศักดิ์ หัวหน้ากะ (Supervisor)',
      photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${isOwner ? 'owner' : 'supervisor'}`,
      role: role,
      nickname: isOwner ? 'บอส' : 'ศักดิ์',
      employeeId: isOwner ? 'ADM-001' : 'SUP-002',
      status: 'active',
      createdAt: Date.now(),
      lastLoginAt: Date.now()
    };

    localStorage.setItem('kon_plus_demo_session', JSON.stringify(mockUser));
    localStorage.setItem('kon_plus_session_date', getBangkokTodayString());
    setUserProfile(mockUser);
    setCurrentUser({ uid: mockUser.uid, email: mockUser.email });

    await recordLoginHistory({
      user: mockUser,
      success: true,
      ip: '127.0.0.1',
      location: 'Bangkok, Thailand'
    });

    setLoading(false);
  };

  /**
   * Logout
   */
  const logout = async () => {
    try {
      localStorage.removeItem('kon_plus_session_date');
      localStorage.removeItem('kon_plus_demo_session');
      await firebaseSignOut(auth);
    } catch (e) {
      // Ignore
    } finally {
      setCurrentUser(null);
      setUserProfile(null);
    }
  };

  const isOwner = userProfile?.role === ROLES.OWNER;
  const isSupervisor = userProfile?.role === ROLES.SUPERVISOR;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        authError,
        isNewDayLogout,
        isOwner,
        isSupervisor,
        loginWithGoogle,
        loginDemoAccount,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
