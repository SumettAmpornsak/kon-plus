// Authentication Context for Kon Plus
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';

import {
  ref,
  get,
  set,
  update
} from 'firebase/database';

import {
  auth,
  googleProvider,
  rtdb
} from '../services/firebase';

import { ROLES } from '../utils/constants';
import { getBangkokTodayString } from '../utils/dateUtils';

import {
  recordLoginHistory,
  initializeSystemDefaults
} from '../services/dbService';


const AuthContext = createContext();


export function AuthProvider({ children }) {

  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [isNewDayLogout, setIsNewDayLogout] = useState(false);


  // ============================================================
  // SESSION DATE CHECK
  // ============================================================

  useEffect(() => {

    const sessionDate = localStorage.getItem(
      'kon_plus_session_date'
    );

    const today = getBangkokTodayString();

    if (
      sessionDate &&
      sessionDate !== today &&
      currentUser
    ) {

      setIsNewDayLogout(true);

      logout();

    } else if (
      currentUser &&
      !sessionDate
    ) {

      localStorage.setItem(
        'kon_plus_session_date',
        today
      );

    }


    const interval = setInterval(() => {

      const currentToday =
        getBangkokTodayString();

      const currentSessionDate =
        localStorage.getItem(
          'kon_plus_session_date'
        );

      if (
        currentSessionDate &&
        currentSessionDate !== currentToday &&
        currentUser
      ) {

        setIsNewDayLogout(true);

        logout();

      }

    }, 60000);


    return () => clearInterval(interval);

  }, [currentUser]);


  // ============================================================
  // FIREBASE AUTH STATE
  // ============================================================

  useEffect(() => {

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (firebaseUser) => {

          if (firebaseUser) {

            await verifyAndLoadUserProfile(
              firebaseUser
            );

          } else {

            const demoUser =
              localStorage.getItem(
                'kon_plus_demo_session'
              );

            if (demoUser) {

              try {

                const parsed =
                  JSON.parse(demoUser);

                setUserProfile(parsed);

                setCurrentUser({
                  uid: parsed.uid,
                  email: parsed.email
                });

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

        }
      );


    return () => unsubscribe();

  }, []);


  // ============================================================
  // CLIENT INFORMATION
  // ============================================================

  const fetchClientInfo = async () => {

    try {

      const res =
        await fetch(
          'https://ipapi.co/json/'
        );

      if (res.ok) {

        const data =
          await res.json();

        return {

          ip:
            data.ip ||
            '127.0.0.1',

          location:
            `${data.city || 'Bangkok'}, ${data.country_name || 'Thailand'}`
        };

      }

    } catch (e) {

      // ไม่ให้ IP API ทำให้ Login ล้มเหลว
    }


    return {

      ip: '127.0.0.1',

      location:
        'Bangkok, Thailand'

    };

  };


  // ============================================================
  // REJECT LOGIN
  // ============================================================

  const rejectLogin = async (
    message,
    user,
    clientInfo
  ) => {

    try {

      await recordLoginHistory({

        user,

        success: false,

        ip: clientInfo.ip,

        location: clientInfo.location

      });

    } catch (e) {

      // ไม่ให้การบันทึก Login History
      // ทำให้ Logout ไม่สำเร็จ
    }


    try {

      await firebaseSignOut(auth);

    } catch (e) {}


    setCurrentUser(null);

    setUserProfile(null);

    setAuthError(message);

    setLoading(false);

  };


  // ============================================================
  // VERIFY USER PROFILE
  // ============================================================

  const verifyAndLoadUserProfile =
    async (firebaseUser) => {

      setLoading(true);

      setAuthError(null);


      const clientInfo =
        await fetchClientInfo();


      try {

        // ------------------------------------------------------
        // SYSTEM
        // ------------------------------------------------------

        const sysRef =
          ref(rtdb, 'system');

        const sysSnap =
          await get(sysRef);


        // ------------------------------------------------------
        // CURRENT USER
        // ------------------------------------------------------

        const userRef =
          ref(
            rtdb,
            `users/${firebaseUser.uid}`
          );

        let userSnap =
          await get(userRef);


        // ------------------------------------------------------
        // USER MIGRATION
        // ------------------------------------------------------
        //
        // ป้องกัน Supervisor ไปสร้าง /users/{uid}
        // ของตัวเองหรือของคนอื่นโดยไม่ได้รับอนุญาต
        //
        // จะ migrate เฉพาะกรณีที่ข้อมูลเดิมมี uid
        // ตรงกับ Firebase UID อยู่แล้ว
        // ------------------------------------------------------

        if (!userSnap.exists()) {

          const usersSnap =
            await get(
              ref(rtdb, 'users')
            );


          if (usersSnap.exists()) {

            const users =
              usersSnap.val();


            const match =
              Object.entries(users)
                .find(
                  ([key, value]) =>

                    key !== firebaseUser.uid &&

                    value?.email
                      ?.toLowerCase() ===
                    firebaseUser.email
                      ?.toLowerCase()
                );


            if (match) {

              const [
                ,
                existingData
              ] = match;


              // ------------------------------------------------
              // migrate เฉพาะ record ที่ระบุ UID ตรงกัน
              // ------------------------------------------------

              if (
                existingData?.uid ===
                firebaseUser.uid
              ) {

                await set(
                  userRef,
                  {

                    ...existingData,

                    uid:
                      firebaseUser.uid,

                    displayName:
                      firebaseUser.displayName ||
                      existingData.displayName,

                    photoURL:
                      firebaseUser.photoURL ||
                      existingData.photoURL,

                    lastLoginAt:
                      Date.now()

                  }
                );


                userSnap =
                  await get(userRef);

              }

            }

          }

        }


        // ------------------------------------------------------
        // FIRST USER = OWNER
        // ------------------------------------------------------

        if (
          !sysSnap.exists() ||
          !sysSnap.val()?.ownerUid
        ) {

          await initializeSystemDefaults(
            firebaseUser
          );

          userSnap =
            await get(userRef);

        }


        // ------------------------------------------------------
        // USER NOT FOUND
        // ------------------------------------------------------

        if (!userSnap.exists()) {

          await rejectLogin(

            'ไม่มีสิทธิ์เข้าใช้งานระบบคนพลัส',

            firebaseUser,

            clientInfo

          );

          return;

        }


        const profile =
          userSnap.val();


        // ------------------------------------------------------
        // DISABLED USER
        // ------------------------------------------------------

        if (
          profile.status ===
          'disabled'
        ) {

          await rejectLogin(

            'บัญชีนี้ถูกปิดการใช้งาน กรุณาติดต่อผู้ดูแลระบบ (Owner)',

            firebaseUser,

            clientInfo

          );

          return;

        }


        // ------------------------------------------------------
        // UPDATE ONLY SAFE PROFILE FIELDS
        // ------------------------------------------------------
        //
        // database.rules.json อนุญาตให้เจ้าของ UID
        // แก้เฉพาะ:
        //
        // displayName
        // photoURL
        // lastLoginAt
        //
        // role / status ไม่สามารถแก้เองได้
        // ------------------------------------------------------

        await update(

          userRef,

          {

            displayName:
              firebaseUser.displayName ||
              profile.displayName,

            photoURL:
              firebaseUser.photoURL ||
              profile.photoURL,

            lastLoginAt:
              Date.now()

          }

        );


        // ------------------------------------------------------
        // UPDATED PROFILE
        // ------------------------------------------------------

        const updatedProfile = {

          ...profile,

          displayName:
            firebaseUser.displayName ||
            profile.displayName,

          photoURL:
            firebaseUser.photoURL ||
            profile.photoURL,

          uid:
            firebaseUser.uid,

          email:
            firebaseUser.email

        };


        // ------------------------------------------------------
        // LOGIN HISTORY
        // ------------------------------------------------------
        //
        // ถ้าเขียน Login History ไม่ได้
        // ห้ามทำให้ Login หลักล้มเหลว
        // ------------------------------------------------------

        try {

          await recordLoginHistory({

            user:
              updatedProfile,

            success:
              true,

            ip:
              clientInfo.ip,

            location:
              clientInfo.location

          });

        } catch (e) {

          console.warn(
            'Login history write failed:',
            e
          );

        }


        // ------------------------------------------------------
        // SESSION
        // ------------------------------------------------------

        localStorage.setItem(

          'kon_plus_session_date',

          getBangkokTodayString()

        );


        setCurrentUser(
          firebaseUser
        );

        setUserProfile(
          updatedProfile
        );

      } catch (error) {

        console.error(
          'Error verifying user profile:',
          error
        );


        setAuthError(

          'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์: ' +
          error.message

        );

      } finally {

        setLoading(false);

      }

    };


  // ============================================================
  // GOOGLE LOGIN
  // ============================================================

  const loginWithGoogle =
    async () => {

      setLoading(true);

      setAuthError(null);

      setIsNewDayLogout(false);


      try {

        await signInWithPopup(
          auth,
          googleProvider
        );

      } catch (error) {

        console.error(
          'Login error:',
          error
        );


        if (
          error.code !==
          'auth/popup-closed-by-user'
        ) {

          setAuthError(

            'ไม่สามารถเข้าสู่ระบบผ่าน Google ได้: ' +
            error.message

          );

        }


        setLoading(false);

      }

    };


  // ============================================================
  // DEMO ACCOUNT
  // ============================================================

  const loginDemoAccount =
    async (
      role = ROLES.OWNER
    ) => {

      setLoading(true);


      const isOwner =
        role === ROLES.OWNER;


      const mockUser = {

        uid:
          isOwner
            ? 'demo_owner_uid'
            : 'demo_supervisor_uid',

        email:
          isOwner
            ? 'owner.konplus@gmail.com'
            : 'supervisor.konplus@gmail.com',

        displayName:
          isOwner
            ? 'สมชัย ผู้ดูแลระบบ (Owner)'
            : 'สมศักดิ์ หัวหน้ากะ (Supervisor)',

        photoURL:
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${
            isOwner
              ? 'owner'
              : 'supervisor'
          }`,

        role,

        nickname:
          isOwner
            ? 'บอส'
            : 'ศักดิ์',

        employeeId:
          isOwner
            ? 'ADM-001'
            : 'SUP-002',

        status:
          'active',

        createdAt:
          Date.now(),

        lastLoginAt:
          Date.now()

      };


      localStorage.setItem(

        'kon_plus_demo_session',

        JSON.stringify(mockUser)

      );


      localStorage.setItem(

        'kon_plus_session_date',

        getBangkokTodayString()

      );


      setUserProfile(
        mockUser
      );


      setCurrentUser({

        uid:
          mockUser.uid,

        email:
          mockUser.email

      });


      try {

        await recordLoginHistory({

          user:
            mockUser,

          success:
            true,

          ip:
            '127.0.0.1',

          location:
            'Bangkok, Thailand'

        });

      } catch (e) {

        // Demo Login ไม่ควรล้มเหลว
        // เพราะ Login History
      }


      setLoading(false);

    };


  // ============================================================
  // LOGOUT
  // ============================================================

  const logout =
    async () => {

      try {

        localStorage.removeItem(
          'kon_plus_session_date'
        );

        localStorage.removeItem(
          'kon_plus_demo_session'
        );


        await firebaseSignOut(
          auth
        );

      } catch (e) {

        // ignore

      } finally {

        setCurrentUser(null);

        setUserProfile(null);

      }

    };


  // ============================================================
  // ROLE
  // ============================================================

  const isOwner =
    userProfile?.role ===
    ROLES.OWNER;


  const isSupervisor =
    userProfile?.role ===
    ROLES.SUPERVISOR;


  // ============================================================
  // CONTEXT
  // ============================================================

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

  return useContext(
    AuthContext
  );

}