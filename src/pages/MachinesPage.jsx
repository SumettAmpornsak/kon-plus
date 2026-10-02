// Machines Management Page (เครื่อง)
import React, { useState, useMemo } from 'react';
import { 
  Cpu, 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Power, 
  RotateCcw, 
  AlertCircle, 
  Check, 
  X, 
  Lock 
} from 'lucide-react';
import { useDatabase } from '../contexts/DatabaseContext';
import { MACHINE_STATUS } from '../utils/constants';

export default function MachinesPage({ initialFilter = 'ALL' }) {
  const { 
    machines, 
    dailyData, 
    employees, 
    closeMachine, 
    setReopenPromptMachine, 
    addMachine, 
    editMachineNumber,
    systemSettings 
  } = useDatabase();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialFilter || 'ALL');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [customAddNumber, setCustomAddNumber] = useState('');
  const [editTargetMachine, setEditTargetMachine] = useState(null);
  const [newMachineNumber, setNewMachineNumber] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const machineStates = dailyData.machineStates || {};
  const maxMachines = systemSettings.maxMachines || 20;

  // Sorted 001 -> 020
  const sortedMachines = useMemo(() => {
    return Object.values(machines).sort((a, b) => 
      (a.number || '').localeCompare(b.number || '', undefined, { numeric: true })
    );
  }, [machines]);

  // Next suggested machine number
  const suggestedNumber = useMemo(() => {
    for (let i = 1; i <= maxMachines; i++) {
      const formatted = String(i).padStart(3, '0');
      if (!machines[formatted]) return formatted;
    }
    return '';
  }, [machines, maxMachines]);

  // Filtered List (No pagination as per Requirement 18)
  const filteredMachines = useMemo(() => {
    return sortedMachines.filter(m => {
      const state = machineStates[m.number]?.status || MACHINE_STATUS.VACANT;

      if (searchTerm) {
        if (!m.number.includes(searchTerm)) return false;
      }

      if (statusFilter !== 'ALL' && state !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [sortedMachines, machineStates, searchTerm, statusFilter]);

  const handleOpenAdd = () => {
    setCustomAddNumber(suggestedNumber);
    setErrorMessage('');
    setShowAddModal(true);
  };

  const handleConfirmAdd = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    const num = customAddNumber.trim().padStart(3, '0');
    if (!/^\d{3}$/.test(num)) {
      setErrorMessage('หมายเลขเครื่องต้องเป็นตัวเลข 3 หลัก (เช่น 009)');
      return;
    }

    try {
      await addMachine(num);
      setShowAddModal(false);
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const handleOpenEdit = (m) => {
    const state = machineStates[m.number]?.status || MACHINE_STATUS.VACANT;
    if (state === MACHINE_STATUS.IN_USE) {
      alert('ไม่สามารถแก้ไขหมายเลขเครื่องขณะที่เครื่องกำลังใช้งานอยู่ได้');
      return;
    }
    setEditTargetMachine(m);
    setNewMachineNumber(m.number);
    setErrorMessage('');
  };

  const handleConfirmEdit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    const num = newMachineNumber.trim().padStart(3, '0');
    if (!/^\d{3}$/.test(num)) {
      setErrorMessage('หมายเลขเครื่องต้องเป็นตัวเลข 3 หลัก');
      return;
    }

    try {
      await editMachineNumber(editTargetMachine.number, num);
      setEditTargetMachine(null);
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const handleToggleMachinePower = async (m) => {
    const state = machineStates[m.number]?.status || MACHINE_STATUS.VACANT;
    if (state === MACHINE_STATUS.CLOSED) {
      // Reopen machine -> open prompt modal
      setReopenPromptMachine(m.number);
    } else {
      // Close machine
      if (state === MACHINE_STATUS.IN_USE) {
        const empId = machineStates[m.number]?.assignedEmpId;
        const emp = employees[empId];
        const confirmClose = window.confirm(
          `เครื่อง ${m.number} กำลังมีพนักงานใช้งานอยู่ (${emp?.name || empId})\nหากปิดเครื่อง พนักงานคนนี้จะถูกเปลี่ยนเป็น 'ยังไม่ได้จัดงาน' และล้างงาน/OT ทันที\n\nต้องการปิดเครื่องหรือไม่?`
        );
        if (!confirmClose) return;
      }
      await closeMachine(m.number);
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
            <Cpu className="w-7 h-7 text-blue-600" />
            การจัดการเครื่องจักร
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            แสดงเครื่องจักรทั้งหมด (สูงสุด 20 เครื่อง) ตรวจสอบสถานะการใช้งานและเปิด/ปิดเครื่อง
          </p>
        </div>

        <button
          disabled={sortedMachines.length >= maxMachines}
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl text-xs font-semibold shadow-md shadow-blue-500/20 transition hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          เพิ่มเครื่องใหม่ ({sortedMachines.length}/{maxMachines})
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between gap-4 flex-wrap">
        <div className="relative min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาเลขเครื่อง (เช่น 001)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'ALL', label: 'ทั้งหมด' },
            { id: MACHINE_STATUS.VACANT, label: '🟢 ว่าง' },
            { id: MACHINE_STATUS.IN_USE, label: '🔴 กำลังใช้งาน' },
            { id: MACHINE_STATUS.CLOSED, label: '⚪ ปิดใช้งาน' }
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setStatusFilter(btn.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                statusFilter === btn.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Machines Grid (001 -> 020) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredMachines.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700">
            ไม่พบเครื่องจักรตามเงื่อนไข
          </div>
        ) : (
          filteredMachines.map((m) => {
            const state = machineStates[m.number]?.status || MACHINE_STATUS.VACANT;
            const isVacant = state === MACHINE_STATUS.VACANT;
            const isInUse = state === MACHINE_STATUS.IN_USE;
            const isClosed = state === MACHINE_STATUS.CLOSED;

            const assignedEmpId = machineStates[m.number]?.assignedEmpId;
            const assignedEmp = assignedEmpId ? employees[assignedEmpId] : null;

            return (
              <div
                key={m.number}
                className={`p-5 rounded-3xl border transition-all shadow-xs flex flex-col justify-between ${
                  isVacant
                    ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-500/50'
                    : isInUse
                    ? 'bg-blue-50/40 dark:bg-slate-800 border-blue-200 dark:border-blue-900/60'
                    : 'bg-slate-100/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-70'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                      {m.number}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      isVacant
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : isInUse
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                    }`}>
                      {isVacant ? '🟢 ว่าง' : isInUse ? '🔴 กำลังใช้งาน' : '⚪ ปิดใช้งาน'}
                    </span>
                  </div>

                  <div className="min-h-[48px] text-xs">
                    {isInUse && assignedEmp ? (
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-700/60 border border-blue-100 dark:border-blue-900/40 space-y-0.5">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase block">ผู้ใช้งานปัจจุบัน:</span>
                        <p className="font-bold text-slate-900 dark:text-white truncate">
                          {assignedEmp.name}
                        </p>
                        <p className="text-slate-500 font-mono">
                          รหัส: {assignedEmp.employeeId}
                        </p>
                      </div>
                    ) : isVacant ? (
                      <p className="text-slate-400 italic">พร้อมจัดพนักงานเข้าใช้งาน</p>
                    ) : (
                      <p className="text-slate-400 italic">เครื่องถูกปิดใช้งานชั่วคราว</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                  {/* Edit Machine Number Button (Allowed only when machine is Vacant) */}
                  <button
                    disabled={!isVacant}
                    onClick={() => handleOpenEdit(m)}
                    className={`flex items-center gap-1 text-xs font-medium transition ${
                      isVacant
                        ? 'text-slate-500 hover:text-blue-600 dark:text-slate-400'
                        : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                    }`}
                    title={isVacant ? 'แก้ไขเลขเครื่อง' : 'แก้เลขได้เฉพาะตอนเครื่องว่าง'}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>แก้ไขเลข</span>
                  </button>

                  {/* Close / Reopen Power Button */}
                  <button
                    onClick={() => handleToggleMachinePower(m)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      isClosed
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-xs'
                        : 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{isClosed ? 'เปิดเครื่อง' : 'ปิดเครื่อง'}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Add Machine */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <form onSubmit={handleConfirmAdd} className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-sm w-full border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              เพิ่มเครื่องจักรใหม่
            </h3>
            <p className="text-xs text-slate-500">
              ระบุหมายเลขเครื่องจักร 3 หลัก (ห้ามซ้ำ, สูงสุด 20 เครื่อง)
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                หมายเลขเครื่อง
              </label>
              <input
                type="text"
                maxLength={3}
                required
                autoFocus
                placeholder="เช่น 009"
                value={customAddNumber}
                onChange={(e) => setCustomAddNumber(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-lg font-mono font-bold text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
              {errorMessage && (
                <p className="text-xs text-rose-600 mt-1 font-medium">{errorMessage}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 text-sm font-medium transition"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-md transition"
              >
                เพิ่มเครื่อง
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Edit Machine Number */}
      {editTargetMachine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <form onSubmit={handleConfirmEdit} className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-sm w-full border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-blue-600" />
              แก้ไขหมายเลขเครื่องจักร
            </h3>
            <p className="text-xs text-slate-500">
              แก้ไขหมายเลขเดิม ({editTargetMachine.number}) โดยเครื่องต้องอยู่ในสถานะว่าง
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                หมายเลขเครื่องใหม่ (3 หลัก)
              </label>
              <input
                type="text"
                maxLength={3}
                required
                autoFocus
                value={newMachineNumber}
                onChange={(e) => setNewMachineNumber(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-lg font-mono font-bold text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
              {errorMessage && (
                <p className="text-xs text-rose-600 mt-1 font-medium">{errorMessage}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditTargetMachine(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 text-sm font-medium transition"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-md transition"
              >
                บันทึกการแก้ไข
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
