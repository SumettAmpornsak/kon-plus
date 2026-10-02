// Daily Assignment Page (จัดพนักงาน) - Main Operations
import React, { useState, useMemo } from 'react';
import { 
  UserCheck, 
  Search, 
  Filter, 
  Plus, 
  ArrowUpDown, 
  Cpu, 
  Clock, 
  Coins, 
  ChevronUp, 
  ChevronDown, 
  Trash2, 
  Check, 
  AlertTriangle 
} from 'lucide-react';
import { useDatabase } from '../contexts/DatabaseContext';
import { 
  DAILY_STATUS, 
  MAIN_POSITIONS, 
  MACHINE_STATUS 
} from '../utils/constants';
import { formatCurrency, calculateOtAmount } from '../utils/otCalculator';

export default function AssignmentPage({ initialFilters = null }) {
  const { 
    employees, 
    machines, 
    dailyData, 
    updateDailyStatus, 
    updateAssignment, 
    addCustomPosition, 
    reorderPositions,
    selectedDate 
  } = useDatabase();

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialFilters?.status || 'ALL');
  const [positionFilter, setPositionFilter] = useState(initialFilters?.position || 'ALL');
  const [otFilter, setOtFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('UNASSIGNED_FIRST'); // UNASSIGNED_FIRST | ID_ASC | NAME_ASC
  const [pageSize, setPageSize] = useState(20);
  const [pageIndex, setPageIndex] = useState(1);

  // Custom Position Modal
  const [showAddPosModal, setShowAddPosModal] = useState(false);
  const [newPosName, setNewPosName] = useState('');
  const [showReorderModal, setShowReorderModal] = useState(false);

  const activeEmployees = useMemo(() => {
    return Object.values(employees).filter(e => e.status !== 'resigned');
  }, [employees]);

  const assignments = dailyData.assignments || {};
  const machineStates = dailyData.machineStates || {};
  const customPositions = Object.values(dailyData.customPositions || {}).map(p => p.name);
  const positionOrder = dailyData.positionOrder || ['เข้าเครื่อง', 'พับ', 'ซีน'];

  // Check available vacant machines
  const vacantMachines = useMemo(() => {
    return Object.values(machines).filter(m => {
      const state = machineStates[m.number]?.status || MACHINE_STATUS.VACANT;
      return state === MACHINE_STATUS.VACANT;
    });
  }, [machines, machineStates]);

  const hasVacantMachine = vacantMachines.length > 0;

  // Filtered & Sorted Employees
  const processedList = useMemo(() => {
    return activeEmployees
      .filter(emp => {
        const assign = assignments[emp.id] || { dailyStatus: DAILY_STATUS.UNSPECIFIED };
        
        // Search term
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          const matchName = emp.name?.toLowerCase().includes(term);
          const matchNickname = emp.nickname?.toLowerCase().includes(term);
          const matchId = emp.employeeId?.toLowerCase().includes(term);
          const matchStatus = assign.dailyStatus?.toLowerCase().includes(term);
          const matchJob = assign.job?.toLowerCase().includes(term);
          if (!matchName && !matchNickname && !matchId && !matchStatus && !matchJob) {
            return false;
          }
        }

        // Status Filter
        if (statusFilter !== 'ALL' && assign.dailyStatus !== statusFilter) {
          return false;
        }

        // Position Filter
        if (positionFilter !== 'ALL') {
          if (positionFilter === 'ยังไม่ได้จัดงาน') {
            if (assign.dailyStatus !== DAILY_STATUS.WORKING || assign.job) return false;
          } else if (positionFilter === 'ตำแหน่งกำหนดเอง') {
            if (!customPositions.includes(assign.job)) return false;
          } else if (assign.job !== positionFilter) {
            return false;
          }
        }

        // OT Filter
        if (otFilter === 'HAS_OT') {
          if (!assign.isOt || assign.otHours <= 0) return false;
        } else if (otFilter === 'NO_OT') {
          if (assign.isOt && assign.otHours > 0) return false;
        } else if (otFilter === 'OVER_4') {
          if (!assign.isOt || parseFloat(assign.otHours) <= 4) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const assignA = assignments[a.id] || { dailyStatus: DAILY_STATUS.UNSPECIFIED };
        const assignB = assignments[b.id] || { dailyStatus: DAILY_STATUS.UNSPECIFIED };

        if (sortBy === 'UNASSIGNED_FIRST') {
          // Unassigned working people come first
          const aUnassigned = assignA.dailyStatus === DAILY_STATUS.WORKING && !assignA.job ? 0 : 1;
          const bUnassigned = assignB.dailyStatus === DAILY_STATUS.WORKING && !assignB.job ? 0 : 1;
          if (aUnassigned !== bUnassigned) return aUnassigned - bUnassigned;
          // Sub-sort by Employee ID
          return (a.employeeId || '').localeCompare(b.employeeId || '', undefined, { numeric: true });
        } else if (sortBy === 'ID_ASC') {
          return (a.employeeId || '').localeCompare(b.employeeId || '', undefined, { numeric: true });
        } else if (sortBy === 'NAME_ASC') {
          return (a.name || '').localeCompare(b.name || '', 'th');
        }
        return 0;
      });
  }, [activeEmployees, assignments, searchTerm, statusFilter, positionFilter, otFilter, sortBy, customPositions]);

  // Pagination
  const totalItems = processedList.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedList = useMemo(() => {
    const start = (pageIndex - 1) * pageSize;
    return processedList.slice(start, start + pageSize);
  }, [processedList, pageIndex, pageSize]);

  // Handlers for Assignment Updates
  const handleStatusChange = async (empId, newStatus) => {
    await updateDailyStatus(empId, newStatus);
  };

  const handleJobChange = async (empId, newJob) => {
    const assign = assignments[empId] || {};
    if (newJob === MAIN_POSITIONS.MACHINE) {
      // Must assign machine: pick first vacant machine if none assigned
      const currentMach = assign.machine;
      const machState = machineStates[currentMach]?.status;
      if (!currentMach || machState !== MACHINE_STATUS.VACANT) {
        if (vacantMachines.length > 0) {
          await updateAssignment(empId, { job: newJob, machine: vacantMachines[0].number });
        } else {
          alert('ไม่มีเครื่องจักรว่างในขณะนี้');
          return;
        }
      } else {
        await updateAssignment(empId, { job: newJob });
      }
    } else {
      // Fold, Seal, or Custom Position -> machine is null
      await updateAssignment(empId, { job: newJob, machine: null });
    }
  };

  const handleMachineChange = async (empId, newMachine) => {
    await updateAssignment(empId, { machine: newMachine });
  };

  const handleOtToggle = async (empId) => {
    const assign = assignments[empId] || {};
    const newIsOt = !assign.isOt;
    const newHours = newIsOt ? (assign.otHours > 0 ? assign.otHours : 2.5) : 0;
    await updateAssignment(empId, { isOt: newIsOt, otHours: newHours });
  };

  const handleOtHoursChange = async (empId, val) => {
    const hours = parseFloat(val);
    if (isNaN(hours) || hours <= 0) {
      await updateAssignment(empId, { isOt: false, otHours: 0 });
    } else {
      await updateAssignment(empId, { isOt: true, otHours: hours });
    }
  };

  // Add Custom Position
  const handleCreateCustomPos = async (e) => {
    e.preventDefault();
    if (!newPosName.trim()) return;
    await addCustomPosition(newPosName.trim());
    setNewPosName('');
    setShowAddPosModal(false);
  };

  // Reorder positions (Up / Down)
  const movePosition = async (index, direction) => {
    const newOrder = [...positionOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;
    await reorderPositions(newOrder);
  };

  return (
    <div className="space-y-5 pb-16 animate-fade-in">
      
      {/* Top Header & Custom Position Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
            <UserCheck className="w-7 h-7 text-blue-600" />
            จัดพนักงานประจำวัน
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            จัดการสถานะ ตำแหน่งงาน เครื่องจักร และคำนวณ OT (บันทึกอัตโนมัติ)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowReorderModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition"
          >
            <ArrowUpDown className="w-4 h-4 text-slate-500" />
            จัดลำดับตำแหน่ง
          </button>

          <button
            onClick={() => setShowAddPosModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            เพิ่มตำแหน่ง
          </button>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Search Box */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ, ชื่อเล่น, รหัส, ตำแหน่ง..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPageIndex(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>

          {/* Filter Daily Status */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPageIndex(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-slate-700 dark:text-slate-200"
            >
              <option value="ALL">สถานะ: ทั้งหมด</option>
              <option value={DAILY_STATUS.WORKING}>มาทำงาน</option>
              <option value={DAILY_STATUS.HOLIDAY}>วันหยุด</option>
              <option value={DAILY_STATUS.SICK}>ลาป่วย</option>
              <option value={DAILY_STATUS.PERSONAL}>ลากิจ</option>
              <option value={DAILY_STATUS.OTHER}>อื่นๆ</option>
              <option value={DAILY_STATUS.UNSPECIFIED}>ยังไม่ได้ระบุ</option>
            </select>
          </div>

          {/* Filter Position */}
          <div>
            <select
              value={positionFilter}
              onChange={(e) => {
                setPositionFilter(e.target.value);
                setPageIndex(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-slate-700 dark:text-slate-200"
            >
              <option value="ALL">ตำแหน่ง: ทั้งหมด</option>
              <option value="ยังไม่ได้จัดงาน">ยังไม่ได้จัดงาน</option>
              <option value={MAIN_POSITIONS.MACHINE}>เข้าเครื่อง</option>
              <option value={MAIN_POSITIONS.FOLD}>พับ</option>
              <option value={MAIN_POSITIONS.SEAL}>ซีน</option>
              {customPositions.length > 0 && (
                <option value="ตำแหน่งกำหนดเอง">ตำแหน่งกำหนดเอง ({customPositions.length})</option>
              )}
            </select>
          </div>

          {/* Filter OT */}
          <div>
            <select
              value={otFilter}
              onChange={(e) => {
                setOtFilter(e.target.value);
                setPageIndex(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-slate-700 dark:text-slate-200"
            >
              <option value="ALL">OT: ทั้งหมด</option>
              <option value="HAS_OT">ทำ OT</option>
              <option value="NO_OT">ไม่ทำ OT</option>
              <option value="OVER_4">OT เกิน 4 ชม.</option>
            </select>
          </div>

        </div>

        {/* Sorting & Result Counts */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>เรียงลำดับ:</span>
            <div className="inline-flex rounded-lg p-0.5 bg-slate-100 dark:bg-slate-900">
              <button
                onClick={() => setSortBy('UNASSIGNED_FIRST')}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  sortBy === 'UNASSIGNED_FIRST' 
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                ยังไม่จัดงานก่อน (Default)
              </button>
              <button
                onClick={() => setSortBy('ID_ASC')}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  sortBy === 'ID_ASC' 
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                รหัสพนักงาน
              </button>
              <button
                onClick={() => setSortBy('NAME_ASC')}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  sortBy === 'NAME_ASC' 
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                ชื่อ ก-ฮ
              </button>
            </div>
          </div>

          <div>
            พบข้อมูล {totalItems} รายการ (แสดงหน้า {pageIndex}/{totalPages})
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-5 py-3.5">รหัส / พนักงาน</th>
                <th className="px-4 py-3.5">สถานะวันนี้</th>
                <th className="px-4 py-3.5">ตำแหน่งงาน</th>
                <th className="px-4 py-3.5">เครื่องจักร</th>
                <th className="px-4 py-3.5">ทำ OT</th>
                <th className="px-4 py-3.5 text-center">ชม. OT</th>
                <th className="px-5 py-3.5 text-right">เงิน OT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    ไม่พบข้อมูลพนักงานที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              ) : (
                paginatedList.map((emp) => {
                  const assign = assignments[emp.id] || { dailyStatus: DAILY_STATUS.UNSPECIFIED };
                  const isWorking = assign.dailyStatus === DAILY_STATUS.WORKING;
                  const currentRate = parseFloat(emp.otRate) || 50.0;
                  const otAmount = isWorking && assign.isOt ? calculateOtAmount(assign.otHours, currentRate) : 0;
                  const isMachineJob = assign.job === MAIN_POSITIONS.MACHINE;

                  return (
                    <tr 
                      key={emp.id} 
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-750 transition ${
                        !isWorking ? 'opacity-70 bg-slate-50/30 dark:bg-slate-900/20' : ''
                      }`}
                    >
                      {/* Employee Info */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {emp.employeeId}
                          </span>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">
                              {emp.name}
                            </p>
                            {emp.nickname && (
                              <p className="text-xs text-slate-400">ชื่อเล่น: {emp.nickname}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Daily Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <select
                          value={assign.dailyStatus || DAILY_STATUS.UNSPECIFIED}
                          onChange={(e) => handleStatusChange(emp.id, e.target.value)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-xl border focus:outline-none transition ${
                            assign.dailyStatus === DAILY_STATUS.WORKING
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : assign.dailyStatus === DAILY_STATUS.HOLIDAY
                              ? 'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300'
                              : assign.dailyStatus === DAILY_STATUS.SICK
                              ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300'
                              : assign.dailyStatus === DAILY_STATUS.PERSONAL
                              ? 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300'
                              : assign.dailyStatus === DAILY_STATUS.OTHER
                              ? 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300'
                              : 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300'
                          }`}
                        >
                          <option value={DAILY_STATUS.WORKING}>มาทำงาน</option>
                          <option value={DAILY_STATUS.HOLIDAY}>วันหยุด</option>
                          <option value={DAILY_STATUS.SICK}>ลาป่วย</option>
                          <option value={DAILY_STATUS.PERSONAL}>ลากิจ</option>
                          <option value={DAILY_STATUS.OTHER}>อื่นๆ</option>
                          <option value={DAILY_STATUS.UNSPECIFIED}>ยังไม่ได้ระบุ</option>
                        </select>
                      </td>

                      {/* Position / Job */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <select
                          disabled={!isWorking}
                          value={assign.job || ''}
                          onChange={(e) => handleJobChange(emp.id, e.target.value || null)}
                          className={`text-xs font-medium px-3 py-1.5 rounded-xl border transition ${
                            !isWorking 
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed' 
                              : !assign.job
                              ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/30 dark:text-amber-300'
                              : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <option value="">-- ยังไม่ได้จัดงาน --</option>
                          {/* Main Positions ordered by positionOrder */}
                          {positionOrder.map(pos => {
                            if (pos === MAIN_POSITIONS.MACHINE) {
                              return (
                                <option 
                                  key={pos} 
                                  value={pos} 
                                  disabled={!hasVacantMachine && assign.job !== MAIN_POSITIONS.MACHINE}
                                >
                                  {pos} {!hasVacantMachine && assign.job !== MAIN_POSITIONS.MACHINE ? '(ไม่มีเครื่องว่าง)' : ''}
                                </option>
                              );
                            }
                            return (
                              <option key={pos} value={pos}>
                                {pos}
                              </option>
                            );
                          })}
                        </select>
                      </td>

                      {/* Machine Selector */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {isMachineJob ? (
                          <select
                            disabled={!isWorking}
                            value={assign.machine || ''}
                            onChange={(e) => handleMachineChange(emp.id, e.target.value)}
                            className="text-xs font-mono font-medium px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                          >
                            <option value="" disabled>-- เลือกเครื่อง --</option>
                            {Object.values(machines).map(m => {
                              const machState = machineStates[m.number]?.status || MACHINE_STATUS.VACANT;
                              const isCurrentThisEmp = assign.machine === m.number;
                              const isVacant = machState === MACHINE_STATUS.VACANT;
                              const isClosed = machState === MACHINE_STATUS.CLOSED;

                              return (
                                <option
                                  key={m.number}
                                  value={m.number}
                                  disabled={!isVacant && !isCurrentThisEmp}
                                >
                                  เครื่อง {m.number} {isClosed ? '(ปิดใช้งาน)' : !isVacant && !isCurrentThisEmp ? '(ใช้งานอยู่)' : '(ว่าง)'}
                                </option>
                              );
                            })}
                          </select>
                        ) : (
                          <span className="text-xs text-slate-400 font-mono">-</span>
                        )}
                      </td>

                      {/* OT Toggle */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <button
                          type="button"
                          disabled={!isWorking}
                          onClick={() => handleOtToggle(emp.id)}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            !isWorking ? 'opacity-40 cursor-not-allowed' : ''
                          } ${
                            assign.isOt ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              assign.isOt ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>

                      {/* OT Hours (Decimal input) */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-center">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          disabled={!isWorking || !assign.isOt}
                          value={assign.isOt ? assign.otHours : 0}
                          onChange={(e) => handleOtHoursChange(emp.id, e.target.value)}
                          className={`w-20 px-2 py-1 text-center font-bold text-xs rounded-xl border focus:outline-none transition ${
                            !isWorking || !assign.isOt
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                              : 'bg-white dark:bg-slate-900 border-blue-400 text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-blue-500/30'
                          }`}
                        />
                      </td>

                      {/* OT Amount */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-right font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                        {isWorking && assign.isOt ? formatCurrency(otAmount) : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span>แสดงแถวต่อหน้า:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPageIndex(1);
              }}
              className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs"
            >
              <option value={20}>20 แถว</option>
              <option value={50}>50 แถว</option>
              <option value={100}>100 แถว</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              disabled={pageIndex <= 1}
              onClick={() => setPageIndex(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              ย้อนกลับ
            </button>
            <span className="px-2 font-medium">
              {pageIndex} / {totalPages}
            </span>
            <button
              disabled={pageIndex >= totalPages}
              onClick={() => setPageIndex(p => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              ถัดไป
            </button>
          </div>
        </div>

      </div>

      {/* Modal: Add Custom Daily Position */}
      {showAddPosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <form onSubmit={handleCreateCustomPos} className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              เพิ่มตำแหน่งงานประจำวัน
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ตำแหน่งที่เพิ่มจะใช้เฉพาะวันนั้น หากไม่มีพนักงานอยู่ในตำแหน่งนี้ ระบบจะลบออกอัตโนมัติ
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                ชื่อตำแหน่งงาน (เช่น QC, แพ็กของ, ตรวจสินค้า)
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="ระบุชื่อตำแหน่ง"
                value={newPosName}
                onChange={(e) => setNewPosName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddPosModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 text-sm font-medium transition"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-md transition"
              >
                เพิ่มตำแหน่ง
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Position Ordering */}
      {showReorderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <ArrowUpDown className="w-5 h-5 text-blue-600" />
              จัดลำดับตำแหน่งงาน
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ใช้ปุ่มขึ้น/ลงเพื่อจัดลำดับตำแหน่งงาน ลำดับนี้จะใช้ร่วมกันทั้งระบบ
            </p>

            <div className="divide-y divide-slate-100 dark:divide-slate-700/60 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
              {positionOrder.map((pos, index) => (
                <div key={pos} className="p-3 flex items-center justify-between bg-white dark:bg-slate-800">
                  <span className="font-medium text-sm text-slate-800 dark:text-slate-200">
                    {index + 1}. {pos}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={index === 0}
                      onClick={() => movePosition(index, 'up')}
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      disabled={index === positionOrder.length - 1}
                      onClick={() => movePosition(index, 'down')}
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-right pt-2">
              <button
                onClick={() => setShowReorderModal(false)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition"
              >
                เสร็จสิ้น
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
