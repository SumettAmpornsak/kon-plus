// History Page (ประวัติ) - By Date & By Employee with 30-Day Supervisor Restriction
import React, { useState, useMemo } from 'react';
import { 
  History, 
  Calendar, 
  User, 
  Search, 
  Clock, 
  Edit3, 
  Lock, 
  Check, 
  AlertCircle 
} from 'lucide-react';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  getBangkokTodayString, 
  formatThaiDateTime, 
  formatThaiDateShort, 
  get30DayCountdown,
  groupContinuousStatuses 
} from '../utils/dateUtils';
import { formatCurrency, calculateOtAmount } from '../utils/otCalculator';
import CountdownTimer30Days from '../components/history/CountdownTimer30Days';
import { DAILY_STATUS, MAIN_POSITIONS, MACHINE_STATUS } from '../utils/constants';

export default function HistoryPage() {
  const { 
    selectedDate, 
    setSelectedDate, 
    dailyData, 
    employees, 
    machines, 
    updateDailyStatus, 
    updateAssignment 
  } = useDatabase();
  const { isOwner, isSupervisor } = useAuth();

  const [activeTab, setActiveTab] = useState('BY_DATE'); // 'BY_DATE' | 'BY_EMPLOYEE'
  const [empSearch, setEmpSearch] = useState('');
  const [selectedEmpId, setSelectedEmpId] = useState(null);

  // Edit Modal State
  const [editTarget, setEditTarget] = useState(null);
  const [editStatus, setEditStatus] = useState(DAILY_STATUS.WORKING);
  const [editJob, setEditJob] = useState('');
  const [editMachine, setEditMachine] = useState('');
  const [editIsOt, setEditIsOt] = useState(false);
  const [editOtHours, setEditOtHours] = useState(0);

  const activeEmployees = Object.values(employees).filter(e => e.status !== 'resigned');
  const countdown = get30DayCountdown(selectedDate);
  const canEditSelectedDate = isOwner || (!isOwner && !countdown.isExpired);

  // Assignments for current selectedDate
  const assignments = dailyData.assignments || {};

  const handleOpenEdit = (emp, assign) => {
    if (!canEditSelectedDate) {
      alert('🔒 ข้อมูลเกิน 30 วัน — เฉพาะ Owner เท่านั้นที่สามารถแก้ไขได้');
      return;
    }
    setEditTarget({ emp, assign });
    setEditStatus(assign.dailyStatus || DAILY_STATUS.UNSPECIFIED);
    setEditJob(assign.job || '');
    setEditMachine(assign.machine || '');
    setEditIsOt(assign.isOt || false);
    setEditOtHours(assign.otHours || 0);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editTarget) return;
    const empId = editTarget.emp.id;

    // Save Daily Status
    if (editStatus !== editTarget.assign.dailyStatus) {
      await updateDailyStatus(empId, editStatus);
    }

    // Save Assignment
    if (editStatus === DAILY_STATUS.WORKING) {
      await updateAssignment(empId, {
        job: editJob || null,
        machine: editJob === MAIN_POSITIONS.MACHINE ? editMachine : null,
        isOt: editIsOt,
        otHours: editIsOt ? parseFloat(editOtHours) || 0 : 0
      });
    }

    setEditTarget(null);
  };

  // Mock / Simulated multi-day employee history for "BY_EMPLOYEE" view
  const employeeHistory = useMemo(() => {
    if (!selectedEmpId) return [];
    // Generate recent 15 days history entries for the selected employee based on daily store
    const list = [];
    const today = new Date();
    for (let i = 0; i < 15; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const assign = (dateStr === selectedDate) ? assignments[selectedEmpId] : null;
      list.push({
        date: dateStr,
        dailyStatus: assign?.dailyStatus || (i % 7 === 0 ? DAILY_STATUS.HOLIDAY : DAILY_STATUS.WORKING),
        job: assign?.job || (i % 2 === 0 ? 'เข้าเครื่อง' : 'พับ'),
        machine: assign?.machine || (i % 2 === 0 ? '001' : null),
        isOt: assign?.isOt || (i % 3 === 0),
        otHours: assign?.otHours || (i % 3 === 0 ? 2.5 : 0)
      });
    }
    return list;
  }, [selectedEmpId, selectedDate, assignments]);

  const continuousGroups = useMemo(() => {
    return groupContinuousStatuses(employeeHistory);
  }, [employeeHistory]);

  return (
    <div className="space-y-6 pb-16 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
            <History className="w-7 h-7 text-blue-600" />
            ประวัติการทำงานย้อนหลัง
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            ตรวจสอบข้อมูลย้อนหลังตามวันที่ หรือประวัติรายบุคคล และแก้ไขข้อมูลตามสิทธิ์
          </p>
        </div>

        {/* 30-Day Supervisor Restriction Countdown */}
        <CountdownTimer30Days targetDate={selectedDate} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-1">
        <button
          onClick={() => setActiveTab('BY_DATE')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
            activeTab === 'BY_DATE'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          ดูตามวันที่ (By Date)
        </button>

        <button
          onClick={() => setActiveTab('BY_EMPLOYEE')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
            activeTab === 'BY_EMPLOYEE'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <User className="w-4 h-4" />
          ดูตามรายบุคคล (By Employee)
        </button>
      </div>

      {/* Tab 1: BY DATE */}
      {activeTab === 'BY_DATE' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                เลือกวันที่ต้องการดู:
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
              <button
                onClick={() => setSelectedDate(getBangkokTodayString())}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                วันนี้
              </button>
            </div>

            <div className="text-xs text-slate-500">
              สถานะการแก้ไข:{' '}
              {canEditSelectedDate ? (
                <span className="text-emerald-600 font-bold">สามารถแก้ไขได้</span>
              ) : (
                <span className="text-rose-600 font-bold">ดูได้อย่างเดียว (View Only)</span>
              )}
            </div>
          </div>

          {/* Table for Selected Date */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4">รหัส / พนักงาน</th>
                    <th className="px-6 py-4">สถานะ</th>
                    <th className="px-6 py-4">งาน / ตำแหน่ง</th>
                    <th className="px-6 py-4">เครื่อง</th>
                    <th className="px-6 py-4 text-center">ชั่วโมง OT</th>
                    <th className="px-6 py-4 text-right">เงิน OT</th>
                    <th className="px-6 py-4 text-right">แก้ไข</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {activeEmployees.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-12 text-slate-400">
                        ไม่มีข้อมูลพนักงาน
                      </td>
                    </tr>
                  ) : (
                    activeEmployees.map((emp) => {
                      const assign = assignments[emp.id] || { dailyStatus: DAILY_STATUS.UNSPECIFIED };
                      const rate = parseFloat(emp.otRate) || 50.0;
                      const otAmount = assign.isOt ? calculateOtAmount(assign.otHours, rate) : 0;

                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-750 transition">
                          <td className="px-6 py-4">
                            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 mr-2">
                              {emp.employeeId}
                            </span>
                            <span className="font-medium text-slate-900 dark:text-white">
                              {emp.name}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-700">
                              {assign.dailyStatus || DAILY_STATUS.UNSPECIFIED}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                            {assign.job || '-'}
                          </td>
                          <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-400">
                            {assign.machine || '-'}
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-blue-600 dark:text-blue-400">
                            {assign.isOt ? `${assign.otHours} ชม.` : '-'}
                          </td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {assign.isOt ? formatCurrency(otAmount) : '-'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              disabled={!canEditSelectedDate}
                              onClick={() => handleOpenEdit(emp, assign)}
                              className={`p-1.5 rounded-lg transition ${
                                canEditSelectedDate
                                  ? 'text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                                  : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                              }`}
                              title={canEditSelectedDate ? 'แก้ไขข้อมูลย้อนหลัง' : 'เกิน 30 วัน ไม่สามารถแก้ไขได้'}
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: BY EMPLOYEE */}
      {activeTab === 'BY_EMPLOYEE' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อหรือรหัสพนักงาน..."
                value={empSearch}
                onChange={(e) => setEmpSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>

            <div>
              <select
                value={selectedEmpId || ''}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium"
              >
                <option value="">-- เลือกพนักงาน --</option>
                {activeEmployees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.employeeId} - {e.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Continuous Status Group Summary (Requirement 10) */}
          {selectedEmpId && continuousGroups.length > 0 && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                สรุปช่วงสถานะต่อเนื่อง (Continuous Status Groups)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {continuousGroups.map((grp, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                    <span className="font-semibold text-blue-600 dark:text-blue-400 uppercase">
                      {grp.status}
                    </span>
                    <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                      {grp.startDate === grp.endDate 
                        ? formatThaiDateShort(grp.startDate) 
                        : `${formatThaiDateShort(grp.startDate)} - ${formatThaiDateShort(grp.endDate)}`}
                    </p>
                    <p className="text-slate-500 font-semibold">
                      รวมต่อเนื่อง: <span className="text-slate-800 dark:text-slate-200 font-bold">{grp.count} วัน</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Chronological History Table */}
          {selectedEmpId && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                  ประวัติรายวัน (เรียงจากใหม่ → เก่า)
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-6 py-3.5">วันที่</th>
                      <th className="px-6 py-3.5">สถานะ</th>
                      <th className="px-6 py-3.5">ตำแหน่ง</th>
                      <th className="px-6 py-3.5">เครื่อง</th>
                      <th className="px-6 py-3.5 text-center">OT (ชม.)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {employeeHistory.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-750 transition">
                        <td className="px-6 py-3.5 font-medium text-slate-800 dark:text-slate-200">
                          {formatThaiDateShort(item.date)}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-700">
                            {item.dailyStatus}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-slate-600 dark:text-slate-300">
                          {item.job || '-'}
                        </td>
                        <td className="px-6 py-3.5 font-mono text-slate-600 dark:text-slate-400">
                          {item.machine || '-'}
                        </td>
                        <td className="px-6 py-3.5 text-center font-bold text-blue-600 dark:text-blue-400">
                          {item.isOt ? `${item.otHours} ชม.` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Historical Edit */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <form onSubmit={handleSaveEdit} className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-blue-600" />
              แก้ไขข้อมูลย้อนหลัง: {editTarget.emp.name}
            </h3>
            <p className="text-xs text-slate-500">
              วันที่ {formatThaiDateTime(selectedDate, false)} (ทุกการแก้ไขจะถูกบันทึกลง Audit Log)
            </p>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  สถานะประจำวัน
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  <option value={DAILY_STATUS.WORKING}>มาทำงาน</option>
                  <option value={DAILY_STATUS.HOLIDAY}>วันหยุด</option>
                  <option value={DAILY_STATUS.SICK}>ลาป่วย</option>
                  <option value={DAILY_STATUS.PERSONAL}>ลากิจ</option>
                  <option value={DAILY_STATUS.OTHER}>อื่นๆ</option>
                  <option value={DAILY_STATUS.UNSPECIFIED}>ยังไม่ได้ระบุ</option>
                </select>
              </div>

              {editStatus === DAILY_STATUS.WORKING && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      ตำแหน่งงาน
                    </label>
                    <select
                      value={editJob}
                      onChange={(e) => setEditJob(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    >
                      <option value="">-- ยังไม่ได้จัดงาน --</option>
                      <option value={MAIN_POSITIONS.MACHINE}>เข้าเครื่อง</option>
                      <option value={MAIN_POSITIONS.FOLD}>พับ</option>
                      <option value={MAIN_POSITIONS.SEAL}>ซีน</option>
                    </select>
                  </div>

                  {editJob === MAIN_POSITIONS.MACHINE && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        หมายเลขเครื่อง
                      </label>
                      <select
                        value={editMachine}
                        onChange={(e) => setEditMachine(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                      >
                        <option value="">-- เลือกเครื่อง --</option>
                        {Object.values(machines).map(m => (
                          <option key={m.number} value={m.number}>
                            เครื่อง {m.number}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900">
                    <span className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                      ทำ OT หรือไม่
                    </span>
                    <input
                      type="checkbox"
                      checked={editIsOt}
                      onChange={(e) => setEditIsOt(e.target.checked)}
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                    />
                  </div>

                  {editIsOt && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        ชั่วโมง OT (ทศนิยมได้)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editOtHours}
                        onChange={(e) => setEditOtHours(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
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
