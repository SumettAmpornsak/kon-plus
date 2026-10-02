// User Management Page (Owner Only)
import React, { useState, useEffect, useMemo } from 'react';
import {
  UserCog,
  UserPlus,
  ShieldAlert,
  Trash2,
  Lock
} from 'lucide-react';

import {
  ref,
  onValue,
  update
} from 'firebase/database';

import { rtdb } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  ROLES,
  AUDIT_CATEGORIES
} from '../utils/constants';

import { recordAuditLog } from '../services/auditService';


// ============================================================
// EMAIL KEY
// ============================================================
// Firebase Realtime Database key ไม่อนุญาต "." ใน key
// จึงแปลง . เป็น %2E ให้ตรงกับ AuthContext + Rules
// ============================================================

const makeEmailKey = (email) => {
  return String(email || '')
    .trim()
    .toLowerCase()
    .replace(/\./g, '%2E');
};


// ============================================================
// USER MANAGEMENT PAGE
// ============================================================

export default function UserManagementPage() {

  const {
    userProfile,
    isOwner
  } = useAuth();

  const [usersList, setUsersList] = useState({});


  // ==========================================================
  // MODALS
  // ==========================================================

  const [showAddModal, setShowAddModal] =
    useState(false);

  const [newEmail, setNewEmail] =
    useState('');

  const [newNickname, setNewNickname] =
    useState('');

  const [newEmployeeId, setNewEmployeeId] =
    useState('');

  const [deleteTargetUser, setDeleteTargetUser] =
    useState(null);

  const [deleteConfirmationText, setDeleteConfirmationText] =
    useState('');

  const [errorMessage, setErrorMessage] =
    useState('');


  // ==========================================================
  // LOAD USERS
  // ==========================================================

  useEffect(() => {

    const usersRef =
      ref(rtdb, 'users');

    const unsub =
      onValue(
        usersRef,
        (snap) => {

          setUsersList(
            snap.val() || {}
          );

        }
      );

    return () => unsub();

  }, []);


  // ==========================================================
  // USERS ARRAY
  // ==========================================================

  const usersArray = useMemo(() => {

    return Object.values(usersList);

  }, [usersList]);


  // ==========================================================
  // ACCESS CHECK
  // ==========================================================

  if (!isOwner) {

    return (

      <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-4">

        <Lock className="w-12 h-12 text-rose-500 mx-auto" />

        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          ไม่มีสิทธิ์เข้าถึงหน้านี้
        </h2>

        <p className="text-sm text-slate-500">
          หน้านี้สงวนสิทธิ์สำหรับเจ้าของระบบ (Owner) เท่านั้น
        </p>

      </div>

    );

  }


  // ==========================================================
  // ADD SUPERVISOR
  // ==========================================================

  const handleAddSupervisor = async (e) => {

    e.preventDefault();

    setErrorMessage('');

    const email =
      newEmail
        .trim()
        .toLowerCase();


    // --------------------------------------------------------
    // Validate email
    // --------------------------------------------------------

    if (
      !email ||
      !email.includes('@')
    ) {

      setErrorMessage(
        'กรุณาระบุ Gmail ให้ถูกต้อง'
      );

      return;

    }


    // --------------------------------------------------------
    // Check duplicate
    // --------------------------------------------------------

    const exists =
      usersArray.some(
        (u) =>
          u.email?.toLowerCase() === email
      );


    if (exists) {

      setErrorMessage(
        'บัญชีนี้มีอยู่ในระบบแล้ว'
      );

      return;

    }


    // --------------------------------------------------------
    // Temporary user key
    // --------------------------------------------------------
    // ก่อน Login Google จะยังไม่มี Firebase UID
    // จึงใช้ temporary key ไปก่อน
    // AuthContext จะ migrate ไป UID จริง
    // --------------------------------------------------------

    const tempKey =
      `user_${Date.now()}`;


    const now =
      Date.now();


    const displayName =
      newNickname.trim()
        ? `หัวหน้ากะ (${newNickname.trim()})`
        : 'หัวหน้ากะ';


    const newUser = {

      uid:
        tempKey,

      email,

      displayName,

      role:
        ROLES.SUPERVISOR,

      nickname:
        newNickname.trim(),

      employeeId:
        newEmployeeId.trim(),

      status:
        'active',

      createdAt:
        now

    };


    // --------------------------------------------------------
    // Create Invite
    // --------------------------------------------------------
    // สำคัญมาก:
    // AuthContext จะใช้ Gmail หา Invite นี้
    // ตอนหัวหน้ากะ Login Google
    // --------------------------------------------------------

    const emailKey =
      makeEmailKey(email);


    const invite = {

      email,

      role:
        ROLES.SUPERVISOR,

      status:
        'active',

      displayName,

      nickname:
        newNickname.trim(),

      employeeId:
        newEmployeeId.trim(),

      enabled:
        true,

      createdAt:
        now

    };


    try {

      // ------------------------------------------------------
      // เขียนพร้อมกันทั้ง 2 จุด
      // ------------------------------------------------------
      //
      // users/user_xxxxx
      // userInvites/email
      //
      // ------------------------------------------------------

      await update(
        ref(rtdb),
        {

          [`users/${tempKey}`]:
            newUser,

          [`userInvites/${emailKey}`]:
            invite

        }
      );


      // ------------------------------------------------------
      // Audit Log
      // ------------------------------------------------------

      await recordAuditLog({

        category:
          AUDIT_CATEGORIES.USER_ACCOUNT,

        action:
          'เพิ่มหัวหน้ากะ (Supervisor)',

        newValue:
          newUser,

        description:
          `เพิ่มสิทธิ์หัวหน้ากะ: ${email} (${newNickname.trim() || 'ไม่ระบุชื่อเล่น'})`,

        user:
          userProfile

      });


      // ------------------------------------------------------
      // Reset form
      // ------------------------------------------------------

      setShowAddModal(false);

      setNewEmail('');

      setNewNickname('');

      setNewEmployeeId('');

      setErrorMessage('');


    } catch (err) {

      console.error(
        'Failed to add supervisor:',
        err
      );

      setErrorMessage(
        err?.message ||
        'ไม่สามารถเพิ่มหัวหน้ากะได้'
      );

    }

  };


  // ==========================================================
  // TOGGLE USER STATUS
  // ==========================================================

  const handleToggleStatus =
    async (user) => {

      if (
        user.role ===
        ROLES.OWNER
      ) {

        alert(
          'ไม่สามารถปิดการใช้งานบัญชี Owner ได้'
        );

        return;

      }


      const newStatus =
        user.status === 'active'
          ? 'disabled'
          : 'active';


      const emailKey =
        makeEmailKey(
          user.email
        );


      try {

        // ----------------------------------------------------
        // Update ทั้ง User + Invite
        // ----------------------------------------------------

        await update(
          ref(rtdb),
          {

            [`users/${user.uid}/status`]:
              newStatus,

            [`userInvites/${emailKey}/status`]:
              newStatus,

            [`userInvites/${emailKey}/enabled`]:
              newStatus === 'active'

          }
        );


        // ----------------------------------------------------
        // Audit
        // ----------------------------------------------------

        await recordAuditLog({

          category:
            AUDIT_CATEGORIES.USER_ACCOUNT,

          action:
            newStatus === 'active'
              ? 'เปิดใช้งานบัญชี'
              : 'ระงับการใช้งานบัญชี',

          description:
            `${newStatus === 'active' ? 'เปิดใช้งาน' : 'ระงับ'} บัญชี ${user.email} โดย Owner`,

          user:
            userProfile

        });


      } catch (err) {

        console.error(
          'Failed to toggle user status:',
          err
        );

        setErrorMessage(
          err?.message ||
          'ไม่สามารถเปลี่ยนสถานะบัญชีได้'
        );

      }

    };


  // ==========================================================
  // OPEN DELETE
  // ==========================================================

  const handleOpenDelete =
    (user) => {

      if (
        user.role ===
        ROLES.OWNER
      ) {

        alert(
          'ไม่สามารถลบบัญชี Owner ได้'
        );

        return;

      }


      setDeleteTargetUser(
        user
      );

      setDeleteConfirmationText('');

      setErrorMessage('');

    };


  // ==========================================================
  // CONFIRM DELETE
  // ==========================================================

  const handleConfirmDelete =
    async () => {

      if (
        deleteConfirmationText.trim() !==
        'ยืนยันการลบบัญชี'
      ) {

        setErrorMessage(
          'กรุณาพิมพ์ "ยืนยันการลบบัญชี" ให้ถูกต้อง'
        );

        return;

      }


      const target =
        deleteTargetUser;


      if (!target) {
        return;
      }


      const emailKey =
        makeEmailKey(
          target.email
        );


      try {

        // ----------------------------------------------------
        // Delete both:
        //
        // users/{uid}
        // userInvites/{emailKey}
        //
        // ----------------------------------------------------

        await update(
          ref(rtdb),
          {

            [`users/${target.uid}`]:
              null,

            [`userInvites/${emailKey}`]:
              null

          }
        );


        // ----------------------------------------------------
        // Keep audit history
        // ----------------------------------------------------

        await recordAuditLog({

          category:
            AUDIT_CATEGORIES.USER_ACCOUNT,

          action:
            'ลบบัญชีผู้ใช้งาน',

          description:
            `⚠️ ลบสิทธิ์ผู้ใช้: ${target.displayName || 'ผู้ใช้'} + Google Account (${target.email}) + บัญชีถูกลบ`,

          user:
            userProfile

        });


        setDeleteTargetUser(
          null
        );

        setDeleteConfirmationText('');

        setErrorMessage('');


      } catch (err) {

        console.error(
          'Failed to delete user:',
          err
        );

        setErrorMessage(
          err?.message ||
          'ไม่สามารถลบบัญชีได้'
        );

      }

    };


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <div className="space-y-6 pb-16 animate-fade-in">


      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        <div>

          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2.5">

            <UserCog className="w-7 h-7 text-blue-600" />

            จัดการบัญชีผู้ใช้งาน (User Management)

          </h1>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">

            เพิ่มหัวหน้ากะ (Supervisor) กำหนดสิทธิ์ และเปิด/ปิดการเข้าใช้งาน (เฉพาะ Owner)

          </p>

        </div>


        <button

          onClick={() => {

            setErrorMessage('');

            setShowAddModal(true);

          }}

          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-semibold shadow-md shadow-blue-500/20 transition hover:scale-[1.02]"

        >

          <UserPlus className="w-4 h-4" />

          เพิ่มหัวหน้ากะ

        </button>

      </div>


      {/* ======================================================
          USERS TABLE
      ====================================================== */}

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">

        <div className="overflow-x-auto">

          <table className="w-full text-left text-sm">

            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-700">

              <tr>

                <th className="px-6 py-4">
                  ผู้ใช้งาน
                </th>

                <th className="px-6 py-4">
                  Gmail
                </th>

                <th className="px-6 py-4">
                  บทบาท (Role)
                </th>

                <th className="px-6 py-4">
                  รหัส / ชื่อเล่น
                </th>

                <th className="px-6 py-4 text-center">
                  สถานะ
                </th>

                <th className="px-6 py-4 text-right">
                  การจัดการ
                </th>

              </tr>

            </thead>


            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">

              {usersArray.map((user) => {

                const isOwnerRow =
                  user.role === ROLES.OWNER;

                const isActive =
                  user.status === 'active';


                return (

                  <tr
                    key={user.uid}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-750 transition"
                  >


                    {/* USER */}

                    <td className="px-6 py-4">

                      <div className="flex items-center gap-3">

                        <img

                          src={
                            user.photoURL ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`
                          }

                          alt="avatar"

                          className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700"

                        />

                        <div>

                          <p className="font-semibold text-slate-900 dark:text-white">

                            {user.displayName ||
                              'หัวหน้ากะ'}

                          </p>

                          <p className="text-xs text-slate-400 font-mono">

                            UID: {user.uid?.slice(0, 8)}...

                          </p>

                        </div>

                      </div>

                    </td>


                    {/* EMAIL */}

                    <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300">

                      {user.email}

                    </td>


                    {/* ROLE */}

                    <td className="px-6 py-4">

                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          isOwnerRow
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        }`}
                      >

                        {isOwnerRow
                          ? '👑 Owner'
                          : '💼 หัวหน้ากะ'}

                      </span>

                    </td>


                    {/* EMPLOYEE ID / NICKNAME */}

                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 text-xs">

                      <div>

                        รหัส:{' '}

                        <b className="font-mono">

                          {user.employeeId ||
                            '-'}

                        </b>

                      </div>

                      <div>

                        ชื่อเล่น:{' '}

                        <b>

                          {user.nickname ||
                            '-'}

                        </b>

                      </div>

                    </td>


                    {/* STATUS */}

                    <td className="px-6 py-4 text-center">

                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >

                        {isActive
                          ? 'ใช้งานได้'
                          : 'ถูกระงับ'}

                      </span>

                    </td>


                    {/* ACTIONS */}

                    <td className="px-6 py-4 text-right whitespace-nowrap">

                      {isOwnerRow ? (

                        <span className="text-xs text-slate-400 italic">

                          เจ้าของระบบหลัก

                        </span>

                      ) : (

                        <div className="flex items-center justify-end gap-2">

                          <button

                            type="button"

                            onClick={() =>
                              handleToggleStatus(user)
                            }

                            className={`p-1.5 rounded-xl transition ${
                              isActive
                                ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                                : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                            }`}

                            title={
                              isActive
                                ? 'ระงับการใช้งาน'
                                : 'เปิดใช้งาน'
                            }

                          >

                            {isActive ? (

                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="w-4 h-4"
                              >

                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M18.364 5.636A9 9 0 115.636 18.364 9 9 0 0118.364 5.636z"
                                />

                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M9 9l6 6"
                                />

                              </svg>

                            ) : (

                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="w-4 h-4"
                              >

                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M12 3v9"
                                />

                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5.64 5.64a9 9 0 1012.72 0"
                                />

                              </svg>

                            )}

                          </button>


                          <button

                            type="button"

                            onClick={() =>
                              handleOpenDelete(user)
                            }

                            className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"

                            title="ลบสิทธิ์บัญชี"

                          >

                            <Trash2 className="w-4 h-4" />

                          </button>

                        </div>

                      )}

                    </td>

                  </tr>

                );

              })}


              {usersArray.length === 0 && (

                <tr>

                  <td
                    colSpan="6"
                    className="px-6 py-12 text-center text-sm text-slate-400"
                  >

                    ยังไม่มีบัญชีผู้ใช้งาน

                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

      </div>


      {/* ======================================================
          ADD SUPERVISOR MODAL
      ====================================================== */}

      {showAddModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">

          <form
            onSubmit={handleAddSupervisor}
            className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 p-6 space-y-4"
          >

            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">

              <UserPlus className="w-5 h-5 text-blue-600" />

              เพิ่มสิทธิ์หัวหน้ากะ (Supervisor)

            </h3>


            <p className="text-xs text-slate-500">

              ระบุ Gmail ของหัวหน้ากะ เมื่อบุคคลนี้เข้าสู่ระบบด้วย Google Login จะได้รับสิทธิ์ทันที

            </p>


            <div className="space-y-3 text-sm">


              {/* EMAIL */}

              <div>

                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">

                  Gmail ที่จะให้สิทธิ์{' '}

                  <span className="text-rose-500">
                    *
                  </span>

                </label>

                <input

                  type="email"

                  required

                  autoFocus

                  placeholder="supervisor@gmail.com"

                  value={newEmail}

                  onChange={(e) =>
                    setNewEmail(e.target.value)
                  }

                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"

                />

              </div>


              {/* NICKNAME */}

              <div>

                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">

                  ชื่อเล่น

                </label>

                <input

                  type="text"

                  placeholder="เช่น ศักดิ์"

                  value={newNickname}

                  onChange={(e) =>
                    setNewNickname(e.target.value)
                  }

                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"

                />

              </div>


              {/* EMPLOYEE ID */}

              <div>

                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">

                  รหัสพนักงาน (ถ้ามี)

                </label>

                <input

                  type="text"

                  placeholder="เช่น SUP-002"

                  value={newEmployeeId}

                  onChange={(e) =>
                    setNewEmployeeId(e.target.value)
                  }

                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono"

                />

              </div>


              {/* ERROR */}

              {errorMessage && (

                <p className="text-xs text-rose-600 font-medium">

                  {errorMessage}

                </p>

              )}

            </div>


            {/* BUTTONS */}

            <div className="flex items-center justify-end gap-2 pt-2">

              <button

                type="button"

                onClick={() =>
                  setShowAddModal(false)
                }

                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 text-sm font-medium transition"

              >

                ยกเลิก

              </button>


              <button

                type="submit"

                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-md transition"

              >

                เพิ่มสิทธิ์หัวหน้ากะ

              </button>

            </div>

          </form>

        </div>

      )}


      {/* ======================================================
          DELETE CONFIRMATION MODAL
      ====================================================== */}

      {deleteTargetUser && (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">

          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full border border-rose-200 dark:border-rose-900 p-6 space-y-4">


            <div className="flex items-center gap-3">

              <div className="p-3 bg-rose-100 dark:bg-rose-950 text-rose-600 rounded-2xl">

                <ShieldAlert className="w-6 h-6" />

              </div>

              <div>

                <h3 className="text-lg font-bold text-rose-600">

                  ลบสิทธิ์บัญชีหัวหน้ากะ

                </h3>

                <p className="text-xs text-slate-500 font-mono">

                  {deleteTargetUser.email}

                </p>

              </div>

            </div>


            <p className="text-xs text-slate-600 dark:text-slate-300">

              การลบจะยกเลิกสิทธิ์เข้าใช้งานระบบของบัญชีนี้ทันที แต่ประวัติการทำงานและ Audit Log ที่เคยทำไว้จะไม่สูญหาย

            </p>


            <div>

              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">

                พิมพ์คำว่า{' '}

                <span className="font-mono text-rose-600 select-all font-bold">

                  ยืนยันการลบบัญชี

                </span>{' '}

                เพื่อยืนยัน:

              </label>

              <input

                type="text"

                autoFocus

                value={deleteConfirmationText}

                onChange={(e) =>
                  setDeleteConfirmationText(
                    e.target.value
                  )
                }

                placeholder="ยืนยันการลบบัญชี"

                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/40 font-medium"

              />


              {errorMessage && (

                <p className="text-xs text-rose-600 mt-1 font-medium">

                  {errorMessage}

                </p>

              )}

            </div>


            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">

              <button

                type="button"

                onClick={() => {

                  setDeleteTargetUser(null);

                  setDeleteConfirmationText('');

                  setErrorMessage('');

                }}

                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 text-sm font-medium transition"

              >

                ยกเลิก

              </button>


              <button

                type="button"

                onClick={handleConfirmDelete}

                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-md transition"

              >

                ยืนยันการลบ

              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );

}