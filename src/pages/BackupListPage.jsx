// Backup Employee List Page (รายชื่อสำรอง)
import React, { useState, useMemo } from 'react';
import { 
  Archive, 
  RotateCcw, 
  Trash2, 
  Search, 
  ArrowLeft, 
  AlertTriangle, 
  ShieldAlert, 
  Check, 
  X 
} from 'lucide-react';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { formatThaiDateTime } from '../utils/dateUtils';

export default function BackupListPage({ setCurrentPage }) {
  const { employees, restoreEmployee, permanentDeleteEmployee } = useDatabase();
  const { isOwner } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTargetEmp, setDeleteTargetEmp] = useState(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const backupEmployees = useMemo(() => {
    return Object.values(employees)
      .filter(e => e.status === 'resigned')
      .sort((a, b) => (b.resignedAt || 0) - (a.resignedAt || 0));
  }, [employees]);

  const filtered = useMemo(() => {
    if (!searchTerm) return backupEmployees;
    const term = searchTerm.toLowerCase();
    return backupEmployees.filter(e =>
      e.name?.toLowerCase().includes(term) ||
      e.nickname?.toLowerCase().includes(term) ||
      e.employeeId?.toLowerCase().includes(term)
    );
  }, [backupEmployees, searchTerm]);

  const handleRestore = async (emp) => {
    await restoreEmployee(emp.id);
  };

  const handleOpenPermanentDelete = (emp) => {
    if (!isOwner) {
      alert('เฉพาะ Owner เท่านั้นที่สามารถลบข้อมูลพนักงานถาวรได้');
      return;
    }
    setDeleteTargetEmp(emp);
    setDeleteConfirmationText('');
    setErrorMessage('');
  };

  const handleConfirmPermanentDelete = async () => {
    if (deleteConfirmationText.trim() !== 'ยืนยันการลบบัญชี') {
      setErrorMessage('กรุณาพิมพ์ "ยืนยันการลบบัญชี" ให้ถูกต้อง');
      return;
    }

    try {
      await permanentDeleteEmployee(deleteTargetEmp.id);
      setDeleteTargetEmp(null);
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => setCurrentPage('employees')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 mb-2 transition"
          >
            <ArrowLeft className="w-4 h-4" /> กลับหน้ารายชื่อพนักงาน
          </button>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
            <Archive className="w-7 h-7 text-amber-600" />
            รายชื่อสำรอง (พนักงานที่ลาออก / ย้ายออก)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            พนักงานที่ถูกย้ายออกจะเก็บประวัติเดิมทั้งหมดไว้ สามารถนำกลับมาใช้งานใหม่ได้ทุกเมื่อ
          </p>
        </div>

        <div className="text-xs font-semibold text-slate-500">
          พนักงานในรายชื่อสำรอง: <b className="text-amber-600 font-bold">{backupEmployees.length}</b> คน
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ, ชื่อเล่น, รหัสในรายชื่อสำรอง..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4">รหัสพนักงาน</th>
                <th className="px-6 py-4">ชื่อ - นามสกุล</th>
                <th className="px-6 py-4">ชื่อเล่น</th>
                <th className="px-6 py-4">วันที่ย้ายออก</th>
                <th className="px-6 py-4">เหตุผล</th>
                <th className="px-6 py-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-400">
                    ไม่มีพนักงานในรายชื่อสำรอง
                  </td>
                </tr>
              ) : (
                filtered.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-750 transition">
                    <td className="px-6 py-4 font-mono font-bold text-slate-700 dark:text-slate-200">
                      {emp.employeeId}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                      {emp.name}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {emp.nickname || '-'}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {emp.resignedAt ? formatThaiDateTime(emp.resignedAt, false) : '-'}
                    </td>
                    <td className="px-6 py-4 text-xs text-amber-700 dark:text-amber-400">
                      <span className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                        {emp.resignedReason || 'ลาออก'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {/* Restore Button */}
                        <button
                          onClick={() => handleRestore(emp)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 rounded-xl text-xs font-semibold transition"
                          title="นำกลับมาเป็นพนักงานทำงาน"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>นำกลับมาใช้งาน</span>
                        </button>

                        {/* Permanent Delete Button (Owner Only) */}
                        <button
                          disabled={!isOwner}
                          onClick={() => handleOpenPermanentDelete(emp)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                            isOwner
                              ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                              : 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-50'
                          }`}
                          title={isOwner ? 'ลบข้อมูลถาวร' : 'เฉพาะ Owner เท่านั้นที่สามารถลบถาวรได้'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">ลบถาวร</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Permanent Delete Confirmation */}
      {deleteTargetEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full border border-rose-200 dark:border-rose-900 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 dark:bg-rose-950 text-rose-600 rounded-2xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-rose-600">
                  ลบพนักงานถาวร (Permanent Delete)
                </h3>
                <p className="text-xs text-slate-500">
                  {deleteTargetEmp.name} ({deleteTargetEmp.employeeId})
                </p>
              </div>
            </div>

            <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-2xl text-xs text-rose-800 dark:text-rose-200 space-y-2">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                คำเตือน: ข้อมูลและประวัติจะไม่สามารถกู้คืนได้!
              </p>
              <p>
                การลบถาวรจะลบข้อมูลบัญชีของพนักงานคนนี้ออกจากฐานข้อมูลโดยสิ้นเชิง เหมาะสำหรับการลงข้อมูลผิดพลาดเท่านั้น
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                พิมพ์คำว่า <span className="font-mono text-rose-600 select-all font-bold">ยืนยันการลบบัญชี</span> เพื่อยืนยัน:
              </label>
              <input
                type="text"
                autoFocus
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="ยืนยันการลบบัญชี"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/40 font-medium"
              />
              {errorMessage && (
                <p className="text-xs text-rose-600 mt-1 font-medium">{errorMessage}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setDeleteTargetEmp(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 text-sm font-medium transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmPermanentDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-md transition"
              >
                ยืนยันการลบถาวร
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
