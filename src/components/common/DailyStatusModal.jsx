// Daily Status Setup Modal (สถานะพนักงานวันนี้)
import React, { useState } from 'react';
import { CheckSquare, Square, Check, X, Users, AlertCircle } from 'lucide-react';
import { useDatabase } from '../../contexts/DatabaseContext';
import { DAILY_STATUS } from '../../utils/constants';

export default function DailyStatusModal() {
  const { 
    showDailyStatusModal, 
    setShowDailyStatusModal, 
    employees, 
    dailyData, 
    updateDailyStatus,
    selectedDate 
  } = useDatabase();

  const activeEmployees = Object.values(employees).filter(e => e.status !== 'resigned');
  const assignments = dailyData.assignments || {};

  // Local state for batch editing before final commit
  const [localStatuses, setLocalStatuses] = useState(() => {
    const map = {};
    activeEmployees.forEach(e => {
      map[e.id] = assignments[e.id]?.dailyStatus || DAILY_STATUS.UNSPECIFIED;
    });
    return map;
  });

  if (!showDailyStatusModal) return null;

  const workingCount = Object.values(localStatuses).filter(s => s === DAILY_STATUS.WORKING).length;
  const totalCount = activeEmployees.length;

  const handleSelectAllWorking = () => {
    const updated = {};
    activeEmployees.forEach(e => {
      updated[e.id] = DAILY_STATUS.WORKING;
    });
    setLocalStatuses(updated);
  };

  const handleClearAll = () => {
    const updated = {};
    activeEmployees.forEach(e => {
      updated[e.id] = DAILY_STATUS.UNSPECIFIED;
    });
    setLocalStatuses(updated);
  };

  const handleSingleChange = (empId, newStatus) => {
    setLocalStatuses(prev => ({
      ...prev,
      [empId]: newStatus
    }));
  };

  const handleSaveAndConfirm = async () => {
    for (const emp of activeEmployees) {
      const newStatus = localStatuses[emp.id] || DAILY_STATUS.UNSPECIFIED;
      const currentStatus = assignments[emp.id]?.dailyStatus || DAILY_STATUS.UNSPECIFIED;
      if (newStatus !== currentStatus) {
        await updateDailyStatus(emp.id, newStatus);
      }
    }
    sessionStorage.setItem(`dismissed_modal_${selectedDate}`, 'true');
    setShowDailyStatusModal(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-600" />
              สถานะพนักงานวันนี้
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              เริ่มต้นวันใหม่: กำหนดสถานะการมาทำงานของพนักงานทุกคน
            </p>
          </div>
          
          <div className="text-right">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
              มาทำงาน {workingCount} / {totalCount} คน
            </span>
          </div>
        </div>

        {/* Toolbar Batch Actions */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between flex-wrap gap-2 text-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAllWorking}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 text-slate-700 dark:text-slate-200 transition font-medium"
            >
              <CheckSquare className="w-4 h-4 text-emerald-600" />
              เลือกทั้งหมด (มาทำงาน)
            </button>
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 text-slate-700 dark:text-slate-200 transition font-medium"
            >
              <Square className="w-4 h-4 text-slate-400" />
              ยกเลิกทั้งหมด
            </button>
          </div>
          <span className="text-xs text-slate-400">
            * 'ยังไม่ได้ระบุ' ไม่ถือเป็นมาทำงาน
          </span>
        </div>

        {/* Employee List */}
        <div className="flex-1 overflow-y-auto p-6 divide-y divide-slate-100 dark:divide-slate-700/60">
          {activeEmployees.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              ยังไม่มีพนักงานในระบบ กรุณาเพิ่มพนักงานในเมนู 'พนักงาน'
            </div>
          ) : (
            activeEmployees.map((emp) => {
              const currentStatus = localStatuses[emp.id] || DAILY_STATUS.UNSPECIFIED;
              return (
                <div key={emp.id} className="py-3 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <div className="font-medium text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {emp.employeeId}
                      </span>
                      <span>{emp.name}</span>
                      {emp.nickname && (
                        <span className="text-xs text-slate-400">({emp.nickname})</span>
                      )}
                    </div>
                  </div>

                  {/* Status Options */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { key: DAILY_STATUS.WORKING, label: 'มาทำงาน', activeBg: 'bg-emerald-600 text-white' },
                      { key: DAILY_STATUS.HOLIDAY, label: 'วันหยุด', activeBg: 'bg-sky-600 text-white' },
                      { key: DAILY_STATUS.SICK, label: 'ลาป่วย', activeBg: 'bg-amber-600 text-white' },
                      { key: DAILY_STATUS.PERSONAL, label: 'ลากิจ', activeBg: 'bg-purple-600 text-white' },
                      { key: DAILY_STATUS.OTHER, label: 'อื่นๆ', activeBg: 'bg-slate-600 text-white' },
                      { key: DAILY_STATUS.UNSPECIFIED, label: 'ยังไม่ได้ระบุ', activeBg: 'bg-rose-600 text-white' }
                    ].map((opt) => {
                      const isSelected = currentStatus === opt.key;
                      return (
                        <button
                          key={opt.key}
                          onClick={() => handleSingleChange(emp.id, opt.key)}
                          className={`px-3 py-1 rounded-xl text-xs font-medium transition ${
                            isSelected
                              ? `${opt.activeBg} shadow-sm font-semibold`
                              : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <button
            onClick={() => {
              sessionStorage.setItem(`dismissed_modal_${selectedDate}`, 'true');
              setShowDailyStatusModal(false);
            }}
            className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-sm font-medium transition"
          >
            ข้ามไปก่อน
          </button>
          
          <button
            onClick={handleSaveAndConfirm}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-500/20 transition hover:scale-[1.01]"
          >
            <Check className="w-4 h-4" />
            ตกลงและบันทึกสถานะ
          </button>
        </div>

      </div>
    </div>
  );
}
