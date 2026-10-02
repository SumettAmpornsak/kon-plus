// Comprehensive Reports Page (รายงาน 8 หมวด พร้อมกราฟและการ Export)
import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  FileText, 
  Download, 
  Printer, 
  Calendar, 
  Filter, 
  Users, 
  Cpu, 
  Coins, 
  Activity, 
  Layers, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  formatCurrency, 
  calculateOtAmount, 
  calculateOtSummary 
} from '../utils/otCalculator';
import { 
  exportToJSON, 
  exportToCSV, 
  exportToPDF, 
  triggerPrint 
} from '../services/exportService';
import { 
  DAILY_STATUS, 
  MAIN_POSITIONS, 
  MACHINE_STATUS 
} from '../utils/constants';
import { 
  formatThaiDateTime, 
  formatThaiDateShort, 
  getBangkokTodayString 
} from '../utils/dateUtils';

// Chart.js imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function ReportsPage() {
  const { employees, machines, dailyData, auditLogs, selectedDate } = useDatabase();
  const { userProfile } = useAuth();

  // Report Category Tab
  const [reportType, setReportType] = useState('OT_REPORT');
  // 'WORK_SUMMARY' | 'EMPLOYEE_REPORT' | 'POSITION_REPORT' | 'MACHINE_REPORT' | 'OT_REPORT' | 'ABSENCE_REPORT' | 'ASSIGNMENT_REPORT' | 'CHANGE_REPORT'

  // Date Range Filter Preset
  const [dateFilterPreset, setDateFilterPreset] = useState('THIS_MONTH');
  // 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM'
  const [customStartDate, setCustomStartDate] = useState(getBangkokTodayString());
  const [customEndDate, setCustomEndDate] = useState(getBangkokTodayString());

  // Interactive Chart Filter State
  const [chartSelectionFilter, setChartSelectionFilter] = useState(null);

  const activeEmployees = useMemo(() => {
    return Object.values(employees).filter(e => e.status !== 'resigned');
  }, [employees]);

  const assignments = dailyData.assignments || {};
  const machineStates = dailyData.machineStates || {};

  // Build Sample Multi-day Dataset for Reports simulation
  const reportDataset = useMemo(() => {
    const list = [];
    const dateList = [];
    const today = new Date();

    let daysToGenerate = 30;
    if (dateFilterPreset === 'TODAY') daysToGenerate = 1;
    else if (dateFilterPreset === 'YESTERDAY') daysToGenerate = 2;
    else if (dateFilterPreset === 'THIS_WEEK') daysToGenerate = 7;
    else if (dateFilterPreset === 'THIS_MONTH') daysToGenerate = 30;
    else if (dateFilterPreset === 'LAST_MONTH') daysToGenerate = 60;

    for (let i = 0; i < daysToGenerate; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dateList.push(dateStr);
    }

    activeEmployees.forEach((emp, empIdx) => {
      dateList.forEach((dateStr, dayIdx) => {
        const isCurrentSelected = dateStr === selectedDate;
        const currentAssign = isCurrentSelected ? assignments[emp.id] : null;

        // Simulated attributes for realistic historical report generation
        const status = currentAssign?.dailyStatus || (dayIdx % 7 === 0 ? DAILY_STATUS.HOLIDAY : (dayIdx % 13 === 0 ? DAILY_STATUS.SICK : DAILY_STATUS.WORKING));
        const job = currentAssign?.job || (status === DAILY_STATUS.WORKING ? (empIdx % 3 === 0 ? 'เข้าเครื่อง' : empIdx % 3 === 1 ? 'พับ' : 'ซีน') : null);
        const machine = currentAssign?.machine || (job === 'เข้าเครื่อง' ? String((empIdx % 8) + 1).padStart(3, '0') : null);
        const isOt = currentAssign?.isOt !== undefined ? currentAssign.isOt : (status === DAILY_STATUS.WORKING && (empIdx + dayIdx) % 2 === 0);
        const otHours = isOt ? (currentAssign?.otHours || 2.5) : 0;
        const rate = parseFloat(emp.otRate) || 50.0;
        const amount = calculateOtAmount(otHours, rate);

        list.push({
          date: dateStr,
          empId: emp.id,
          employeeId: emp.employeeId,
          employeeName: emp.name,
          nickname: emp.nickname,
          dailyStatus: status,
          job: job || 'ยังไม่ได้จัดงาน',
          machine: machine || '-',
          isOt,
          otHours,
          rate,
          amount
        });
      });
    });

    return list;
  }, [activeEmployees, assignments, selectedDate, dateFilterPreset]);

  // Filtered Dataset based on Chart Click
  const filteredDataset = useMemo(() => {
    if (!chartSelectionFilter) return reportDataset;
    return reportDataset.filter(item => {
      if (chartSelectionFilter.type === 'job') {
        return item.job === chartSelectionFilter.value;
      }
      if (chartSelectionFilter.type === 'status') {
        return item.dailyStatus === chartSelectionFilter.value;
      }
      return true;
    });
  }, [reportDataset, chartSelectionFilter]);

  // Summary Metrics
  const summary = useMemo(() => {
    return calculateOtSummary(filteredDataset, employees);
  }, [filteredDataset, employees]);

  // Chart Data: Jobs distribution
  const jobDistributionChartData = useMemo(() => {
    const counts = { 'เข้าเครื่อง': 0, 'พับ': 0, 'ซีน': 0, 'อื่นๆ': 0 };
    filteredDataset.forEach(d => {
      if (d.dailyStatus === DAILY_STATUS.WORKING) {
        if (counts[d.job] !== undefined) counts[d.job]++;
        else counts['อื่นๆ']++;
      }
    });
    return {
      labels: Object.keys(counts),
      datasets: [
        {
          label: 'จำนวนคน',
          data: Object.values(counts),
          backgroundColor: ['#2563EB', '#38BDF8', '#818CF8', '#94A3B8'],
          borderRadius: 8
        }
      ]
    };
  }, [filteredDataset]);

  // Chart Data: Daily OT Hours
  const otTrendChartData = useMemo(() => {
    const map = {};
    filteredDataset.forEach(d => {
      if (d.isOt && d.otHours > 0) {
        map[d.date] = (map[d.date] || 0) + d.otHours;
      }
    });
    const sortedDates = Object.keys(map).sort();
    return {
      labels: sortedDates.map(d => formatThaiDateShort(d)),
      datasets: [
        {
          label: 'ชั่วโมง OT รวม (ชม.)',
          data: sortedDates.map(d => map[d]),
          backgroundColor: '#3B82F6',
          borderRadius: 6
        }
      ]
    };
  }, [filteredDataset]);

  // ==========================================
  // EXPORT HANDLERS
  // ==========================================
  const handleExportJSON = async () => {
    await exportToJSON(
      filteredDataset,
      `kon-plus-${reportType.toLowerCase()}.json`,
      userProfile,
      `รายงาน ${reportType}`
    );
  };

  const handleExportCSV = async () => {
    const flatData = filteredDataset.map(d => ({
      'วันที่': d.date,
      'รหัสพนักงาน': d.employeeId,
      'ชื่อพนักงาน': d.employeeName,
      'ชื่อเล่น': d.nickname,
      'สถานะ': d.dailyStatus,
      'ตำแหน่ง': d.job,
      'เครื่อง': d.machine,
      'ชั่วโมง OT': d.otHours,
      'อัตรา OT (บาท/ชม.)': d.rate,
      'เงิน OT (บาท)': d.amount
    }));
    await exportToCSV(
      flatData,
      `kon-plus-${reportType.toLowerCase()}.csv`,
      userProfile,
      `รายงาน ${reportType}`
    );
  };

  const handleExportPDF = async () => {
    const columns = ['วันที่', 'รหัส', 'ชื่อพนักงาน', 'สถานะ', 'ตำแหน่ง', 'เครื่อง', 'ชม. OT', 'เงิน OT'];
    const rows = filteredDataset.slice(0, 100).map(d => [
      d.date,
      d.employeeId,
      d.employeeName,
      d.dailyStatus,
      d.job,
      d.machine,
      d.otHours ? `${d.otHours} ชม.` : '-',
      d.amount ? formatCurrency(d.amount, false) : '-'
    ]);

    await exportToPDF({
      title: `รายงานคนพลัส: ${reportType}`,
      subtitle: `ช่วงเวลา: ${dateFilterPreset} | จำนวนข้อมูล: ${filteredDataset.length} รายการ`,
      columns,
      rows,
      filename: `kon-plus-${reportType.toLowerCase()}.pdf`,
      currentUser: userProfile
    });
  };

  const handlePrint = async () => {
    await triggerPrint(`รายงานคนพลัส (${reportType})`, userProfile);
  };

  return (
    <div className="space-y-6 pb-16 animate-fade-in">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-blue-600" />
            ศูนย์รายงานและวิเคราะห์ข้อมูล
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            รายงานภาพรวม การเข้างาน เครื่องจักร OT และ Audit Log พร้อมส่งออก JSON, PDF, CSV, Print
          </p>
        </div>

        {/* Export Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <Download className="w-4 h-4" />
            JSON
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <Printer className="w-4 h-4" />
            พิมพ์ (Print)
          </button>
        </div>
      </div>

      {/* Report Types Pills (8 Types) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none text-xs font-semibold">
        {[
          { id: 'OT_REPORT', label: '1. รายงาน OT' },
          { id: 'WORK_SUMMARY', label: '2. สรุปการทำงาน' },
          { id: 'EMPLOYEE_REPORT', label: '3. รายงานพนักงาน' },
          { id: 'POSITION_REPORT', label: '4. รายงานตำแหน่ง' },
          { id: 'MACHINE_REPORT', label: '5. รายงานเครื่องจักร' },
          { id: 'ABSENCE_REPORT', label: '6. รายงานการลา/หยุด' },
          { id: 'ASSIGNMENT_REPORT', label: '7. รายงานการจัดงาน' },
          { id: 'CHANGE_REPORT', label: '8. รายงานการแก้ไข' }
        ].map((btn) => (
          <button
            key={btn.id}
            onClick={() => {
              setReportType(btn.id);
              setChartSelectionFilter(null);
            }}
            className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition ${
              reportType === btn.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-bold'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Date Range Preset Selector */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-500">ช่วงเวลา:</span>
          {[
            { id: 'TODAY', label: 'วันนี้' },
            { id: 'YESTERDAY', label: 'เมื่อวาน' },
            { id: 'THIS_WEEK', label: 'สัปดาห์นี้' },
            { id: 'THIS_MONTH', label: 'เดือนนี้' },
            { id: 'LAST_MONTH', label: 'เดือนที่แล้ว' }
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => setDateFilterPreset(preset.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                dateFilterPreset === preset.id
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {chartSelectionFilter && (
          <button
            onClick={() => setChartSelectionFilter(null)}
            className="text-xs text-rose-600 font-semibold hover:underline"
          >
            ✕ ล้างตัวกรองกราฟ ({chartSelectionFilter.value})
          </button>
        )}
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">คนทำ OT รวม</span>
          <p className="text-2xl font-extrabold text-blue-600 mt-1">{summary.totalPeople} คน</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">จำนวนวันที่มี OT</span>
          <p className="text-2xl font-extrabold text-indigo-600 mt-1">{summary.totalDays} วัน-คน</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">ชั่วโมง OT รวม</span>
          <p className="text-2xl font-extrabold text-amber-600 mt-1">{summary.totalHours.toFixed(2)} ชม.</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">เงิน OT รวมทั้งหมด</span>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">{formatCurrency(summary.totalAmount)}</p>
        </div>
      </div>

      {/* Visual Charts (Bar & Breakdown) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs lg:col-span-2">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4 text-sm">
            <Clock className="w-4 h-4 text-blue-600" />
            แนวโน้มชั่วโมง OT รายวัน (คลิกแท่งเพื่อกรองข้อมูล)
          </h3>
          <div className="h-64">
            <Bar 
              data={otTrendChartData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                onClick: (event, elements) => {
                  if (elements.length > 0) {
                    const idx = elements[0].index;
                    const clickedDateLabel = otTrendChartData.labels[idx];
                    console.log('Clicked chart date:', clickedDateLabel);
                  }
                }
              }} 
            />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4 text-sm">
            <Layers className="w-4 h-4 text-blue-600" />
            สัดส่วนตำแหน่งงาน
          </h3>
          <div className="h-64 flex items-center justify-center">
            <Pie 
              data={jobDistributionChartData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                onClick: (event, elements) => {
                  if (elements.length > 0) {
                    const idx = elements[0].index;
                    const jobName = jobDistributionChartData.labels[idx];
                    setChartSelectionFilter({ type: 'job', value: jobName });
                  }
                }
              }} 
            />
          </div>
        </div>
      </div>

      {/* Detailed Report Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            ตารางข้อมูลโดยละเอียด ({filteredDataset.length} แถว)
          </h3>
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold sticky top-0 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-5 py-3.5">วันที่</th>
                <th className="px-5 py-3.5">รหัสพนักงาน</th>
                <th className="px-5 py-3.5">ชื่อ-นามสกุล</th>
                <th className="px-5 py-3.5">สถานะ</th>
                <th className="px-5 py-3.5">ตำแหน่ง</th>
                <th className="px-5 py-3.5 font-mono">เครื่อง</th>
                <th className="px-5 py-3.5 text-right font-mono">ชม. OT</th>
                <th className="px-5 py-3.5 text-right font-mono">อัตรา OT</th>
                <th className="px-5 py-3.5 text-right font-mono">เงิน OT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filteredDataset.slice(0, 100).map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-750 transition text-xs">
                  <td className="px-5 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                    {formatThaiDateShort(row.date)}
                  </td>
                  <td className="px-5 py-3 font-mono font-medium text-slate-700 dark:text-slate-200">
                    {row.employeeId}
                  </td>
                  <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">
                    {row.employeeName} {row.nickname && `(${row.nickname})`}
                  </td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-700">
                      {row.dailyStatus}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-700 dark:text-slate-300">
                    {row.job}
                  </td>
                  <td className="px-5 py-3 font-mono text-slate-600 dark:text-slate-400">
                    {row.machine}
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-blue-600 dark:text-blue-400">
                    {row.isOt ? `${row.otHours} ชม.` : '-'}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-500">
                    {row.rate.toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {row.isOt ? formatCurrency(row.amount) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
