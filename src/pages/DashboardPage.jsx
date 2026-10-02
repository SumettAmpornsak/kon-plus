// Dashboard Page for Kon Plus - Fully Responsive & Zoom-Resilient
import React from 'react';
import { 
  Users, 
  UserCheck, 
  Cpu, 
  Clock, 
  Coins, 
  AlertCircle, 
  ChevronRight, 
  Layers, 
  Calendar 
} from 'lucide-react';
import { useDatabase } from '../contexts/DatabaseContext';
import { DAILY_STATUS, MAIN_POSITIONS, MACHINE_STATUS } from '../utils/constants';
import { formatCurrency, calculateOtAmount } from '../utils/otCalculator';
import { formatThaiDateTime, getBangkokTodayString } from '../utils/dateUtils';

export default function DashboardPage({ setCurrentPage, setAssignmentFilter, setMachineFilter }) {
  const { employees, machines, dailyData, selectedDate, setSelectedDate } = useDatabase();

  const activeEmployees = Object.values(employees).filter(e => e.status !== 'resigned');
  const assignments = dailyData.assignments || {};
  const machineStates = dailyData.machineStates || {};

  // Metrics Calculation
  let workingCount = 0;
  let machineJobCount = 0;
  let foldJobCount = 0;
  let sealJobCount = 0;
  let unassignedCount = 0;
  let unspecifiedCount = 0;
  let otCount = 0;
  let otHoursTotal = 0;
  let otMonthTotal = 0;
  const otWorkersToday = [];

  activeEmployees.forEach(emp => {
    const assign = assignments[emp.id] || { dailyStatus: DAILY_STATUS.UNSPECIFIED };
    const status = assign.dailyStatus;
    const rate = parseFloat(emp.otRate) || 50.0;

    if (status === DAILY_STATUS.WORKING) {
      workingCount++;
      if (!assign.job) {
        unassignedCount++;
      } else if (assign.job === MAIN_POSITIONS.MACHINE) {
        machineJobCount++;
      } else if (assign.job === MAIN_POSITIONS.FOLD) {
        foldJobCount++;
      } else if (assign.job === MAIN_POSITIONS.SEAL) {
        sealJobCount++;
      }

      if (assign.isOt && assign.otHours > 0) {
        otCount++;
        otHoursTotal += parseFloat(assign.otHours) || 0;
        const amount = calculateOtAmount(assign.otHours, rate);
        otMonthTotal += amount;
        otWorkersToday.push({
          id: emp.id,
          name: emp.name,
          employeeId: emp.employeeId,
          nickname: emp.nickname,
          job: assign.job || 'ยังไม่ได้จัดงาน',
          machine: assign.machine || '-',
          otHours: assign.otHours,
          rate,
          amount
        });
      }
    } else if (status === DAILY_STATUS.UNSPECIFIED) {
      unspecifiedCount++;
    }
  });

  // Machines metrics (Note: Do NOT show closed machines count on Dashboard as per Requirement 33)
  const allMachinesList = Object.values(machines);
  let vacantMachinesCount = 0;
  let inUseMachinesCount = 0;

  allMachinesList.forEach(m => {
    const state = machineStates[m.number]?.status || MACHINE_STATUS.VACANT;
    if (state === MACHINE_STATUS.IN_USE) {
      inUseMachinesCount++;
    } else if (state === MACHINE_STATUS.VACANT) {
      vacantMachinesCount++;
    }
  });

  // Action Click Handlers
  const handleGoToUnassigned = () => {
    if (setAssignmentFilter) {
      setAssignmentFilter({ position: 'ยังไม่ได้จัดงาน', status: DAILY_STATUS.WORKING });
    }
    setCurrentPage('assignment');
  };

  const handleGoToVacantMachines = () => {
    if (setMachineFilter) {
      setMachineFilter(MACHINE_STATUS.VACANT);
    }
    setCurrentPage('machines');
  };

  const handleGoToOtReport = () => {
    setCurrentPage('reports');
  };

  return (
    <div className="w-full max-w-full space-y-4 sm:space-y-6 pb-12 animate-fade-in">
      
      {/* Top Banner / Date Bar */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 text-white shadow-xl shadow-blue-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4 overflow-hidden">
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-medium mb-2.5">
            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">ภาพรวมการทำงาน</span>
          </span>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight truncate">
            ระบบบริหารงานคนพลัส
          </h1>
          <p className="text-blue-100 text-xs sm:text-sm mt-1 truncate">
            วันที่ {formatThaiDateTime(selectedDate, false)}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setSelectedDate(getBangkokTodayString())}
            className="px-4 py-2 sm:py-2.5 bg-white text-blue-700 font-semibold text-xs sm:text-sm rounded-xl sm:rounded-2xl hover:bg-blue-50 transition shadow-md whitespace-nowrap active:scale-95"
          >
            ดูข้อมูลวันนี้
          </button>
        </div>
      </div>

      {/* Main KPI Grid - Fluid columns adapting gracefully on Zoom in/out */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        
        {/* Working Employees */}
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 gap-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider truncate">มาทำงานวันนี้</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex-shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {workingCount}
            </span>
            <span className="text-xs text-slate-400 ml-1.5 font-medium whitespace-nowrap">/ {activeEmployees.length} คน</span>
          </div>
        </div>

        {/* In-Use Machines */}
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 gap-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider truncate">เครื่องกำลังใช้งาน</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex-shrink-0">
              <Cpu className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline">
            <span className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400 tracking-tight">
              {inUseMachinesCount}
            </span>
            <span className="text-xs text-slate-400 ml-1.5 font-medium whitespace-nowrap">เครื่อง</span>
          </div>
        </div>

        {/* Vacant Machines (Clickable -> Machines Page filtered by Vacant) */}
        <div 
          onClick={handleGoToVacantMachines}
          className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer hover:border-emerald-500/60 hover:shadow-md transition group flex flex-col justify-between overflow-hidden"
          title="คลิกเพื่อไปหน้าเครื่องจักร (ฟิลเตอร์เฉพาะเครื่องว่าง)"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 gap-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider group-hover:text-emerald-600 transition truncate">
              เครื่องว่าง (คลิกดู)
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 group-hover:scale-110 transition-transform flex-shrink-0">
              <Cpu className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <div className="flex items-baseline">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
                {vacantMachinesCount}
              </span>
              <span className="text-xs text-slate-400 ml-1.5 font-medium whitespace-nowrap">เครื่อง</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-transform group-hover:translate-x-1 flex-shrink-0" />
          </div>
        </div>

        {/* Unassigned Workers (Clickable -> Assignment Page filtered by Unassigned) */}
        <div 
          onClick={handleGoToUnassigned}
          className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer hover:border-amber-500/60 hover:shadow-md transition group flex flex-col justify-between overflow-hidden"
          title="คลิกเพื่อไปหน้าจัดพนักงาน (ฟิลเตอร์คนที่ยังไม่ได้จัดงาน)"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 gap-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider group-hover:text-amber-600 transition truncate">
              ยังไม่ได้จัดงาน (คลิกดู)
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 group-hover:scale-110 transition-transform flex-shrink-0">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <div className="flex items-baseline">
              <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${unassignedCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'}`}>
                {unassignedCount}
              </span>
              <span className="text-xs text-slate-400 ml-1.5 font-medium whitespace-nowrap">คน</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 transition-transform group-hover:translate-x-1 flex-shrink-0" />
          </div>
        </div>

      </div>

      {/* Positions Breakdown & OT Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        
        {/* Job Breakdown */}
        <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4 text-sm sm:text-base">
            <Layers className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <span>การกระจายตำแหน่งงาน</span>
          </h3>
          <div className="space-y-2.5 text-xs sm:text-sm">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30">
              <span className="font-medium text-slate-700 dark:text-slate-300">เข้าเครื่อง</span>
              <span className="font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">{machineJobCount} คน</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50">
              <span className="font-medium text-slate-700 dark:text-slate-300">พับ</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">{foldJobCount} คน</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50">
              <span className="font-medium text-slate-700 dark:text-slate-300">ซีน</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">{sealJobCount} คน</span>
            </div>
            {unspecifiedCount > 0 && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-rose-50/50 dark:bg-rose-950/30">
                <span className="font-medium text-rose-700 dark:text-rose-300 truncate mr-2">ยังไม่ได้ระบุสถานะ</span>
                <span className="font-bold text-rose-600 whitespace-nowrap">{unspecifiedCount} คน</span>
              </div>
            )}
          </div>
        </div>

        {/* OT Metrics & Shortcut */}
        <div 
          onClick={handleGoToOtReport}
          className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer hover:border-blue-500/60 transition group lg:col-span-2 flex flex-col justify-between overflow-hidden"
          title="คลิกเพื่อเปิดหน้ารายงาน OT โดยละเอียด"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 group-hover:text-blue-600 transition text-sm sm:text-base truncate">
                <Coins className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <span>สรุป OT วันนี้ & ยอดเงินรวม (คลิกดูรายงาน)</span>
              </h3>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition flex-shrink-0" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-900/50 min-w-0">
                <span className="text-[11px] sm:text-xs text-amber-700 dark:text-amber-300 font-semibold truncate block">คนทำ OT วันนี้</span>
                <p className="text-xl sm:text-2xl font-extrabold text-amber-700 dark:text-amber-300 mt-1 truncate">
                  {otCount} คน
                </p>
              </div>

              <div className="p-3.5 sm:p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-900/50 min-w-0">
                <span className="text-[11px] sm:text-xs text-blue-700 dark:text-blue-300 font-semibold truncate block">ชั่วโมง OT รวมวันนี้</span>
                <p className="text-xl sm:text-2xl font-extrabold text-blue-700 dark:text-blue-300 mt-1 truncate">
                  {otHoursTotal.toFixed(2)} ชม.
                </p>
              </div>

              <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-900/50 min-w-0" title={formatCurrency(otMonthTotal)}>
                <span className="text-[11px] sm:text-xs text-emerald-700 dark:text-emerald-300 font-semibold truncate block">ประมาณการเงิน OT วันนี้</span>
                <p className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1 truncate">
                  {formatCurrency(otMonthTotal)}
                </p>
              </div>
            </div>
          </div>

          <p className="text-[11px] sm:text-xs text-slate-400 mt-4 leading-relaxed">
            * ยอดเงิน OT คำนวณแบบ Dynamic ตามอัตราค่า OT ปัจจุบันของพนักงานแต่ละคน (ค่าเริ่มต้น 50 บาท/ชม.)
          </p>
        </div>

      </div>

      {/* List of OT Workers Today */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm sm:text-base">
            <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <span>รายชื่อพนักงานทำ OT วันนี้ ({otWorkersToday.length} คน)</span>
          </h3>
        </div>

        {otWorkersToday.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs sm:text-sm">
            ยังไม่มีพนักงานทำ OT ในวันนี้
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm min-w-[620px]">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-[11px] uppercase font-semibold">
                <tr>
                  <th className="px-5 sm:px-6 py-3.5 whitespace-nowrap">รหัส</th>
                  <th className="px-5 sm:px-6 py-3.5 whitespace-nowrap">ชื่อ-นามสกุล</th>
                  <th className="px-5 sm:px-6 py-3.5 whitespace-nowrap">ตำแหน่ง</th>
                  <th className="px-5 sm:px-6 py-3.5 whitespace-nowrap font-mono">เครื่อง</th>
                  <th className="px-5 sm:px-6 py-3.5 text-right whitespace-nowrap">ชม. OT</th>
                  <th className="px-5 sm:px-6 py-3.5 text-right whitespace-nowrap">อัตรา (บาท/ชม.)</th>
                  <th className="px-5 sm:px-6 py-3.5 text-right whitespace-nowrap">เงิน OT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {otWorkersToday.map((worker) => (
                  <tr key={worker.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-750 transition">
                    <td className="px-5 sm:px-6 py-3.5 sm:py-4 font-mono font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {worker.employeeId}
                    </td>
                    <td className="px-5 sm:px-6 py-3.5 sm:py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                      {worker.name} {worker.nickname && <span className="text-slate-400 text-xs font-normal">({worker.nickname})</span>}
                    </td>
                    <td className="px-5 sm:px-6 py-3.5 sm:py-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-medium bg-slate-100 dark:bg-slate-700">
                        {worker.job}
                      </span>
                    </td>
                    <td className="px-5 sm:px-6 py-3.5 sm:py-4 text-slate-600 dark:text-slate-300 font-mono whitespace-nowrap">
                      {worker.machine}
                    </td>
                    <td className="px-5 sm:px-6 py-3.5 sm:py-4 text-right font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {worker.otHours} ชม.
                    </td>
                    <td className="px-5 sm:px-6 py-3.5 sm:py-4 text-right text-slate-500 whitespace-nowrap font-mono">
                      {worker.rate.toFixed(2)}
                    </td>
                    <td className="px-5 sm:px-6 py-3.5 sm:py-4 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap font-mono">
                      {formatCurrency(worker.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
