// Audit Logs Page (Log การแก้ไข) - Append-Only
import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  ShieldCheck, 
  Clock, 
  User, 
  Calendar 
} from 'lucide-react';
import { useDatabase } from '../contexts/DatabaseContext';
import { AUDIT_CATEGORIES } from '../utils/constants';

export default function AuditLogsPage() {
  const { auditLogs } = useDatabase();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      if (categoryFilter !== 'ALL' && log.category !== categoryFilter) {
        return false;
      }
      if (dateFilter && !log.dateString?.includes(dateFilter)) {
        return false;
      }
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchDesc = log.description?.toLowerCase().includes(term);
        const matchUser = log.userName?.toLowerCase().includes(term);
        const matchTarget = log.targetEmpName?.toLowerCase().includes(term);
        const matchAction = log.action?.toLowerCase().includes(term);
        if (!matchDesc && !matchUser && !matchTarget && !matchAction) return false;
      }
      return true;
    });
  }, [auditLogs, categoryFilter, dateFilter, searchTerm]);

  return (
    <div className="space-y-6 pb-16 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-blue-600" />
            Log การแก้ไข (Audit Log)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            บันทึกประวัติการเปลี่ยนแปลงทั้งหมดของระบบแบบ Append-Only (ห้ามลบ/แก้ไข)
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>ระบบบันทึกแบบ Append-Only ปลอดภัย 100%</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาข้อความ, ผู้แก้ไข, พนักงาน..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>

        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
          >
            <option value="ALL">หมวดหมู่ทั้งหมด</option>
            {Object.values(AUDIT_CATEGORIES).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
          />
        </div>
      </div>

      {/* Log Entries List */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500">
          <span>พบ {filteredLogs.length} รายการ (เรียงจากใหม่สุด → เก่าสุด)</span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-700/60 max-h-[700px] overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">
              ไม่พบบันทึกการแก้ไข
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="p-5 hover:bg-slate-50/70 dark:hover:bg-slate-750 transition flex flex-col md:flex-row md:items-center justify-between gap-3 text-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      {log.category}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      {log.action}
                    </span>
                    {log.targetEmpName && (
                      <span className="text-xs text-slate-500">
                        (เป้าหมาย: <b className="text-slate-700 dark:text-slate-300">{log.targetEmpName}</b>)
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-medium">
                    {log.description}
                  </p>
                </div>

                <div className="text-right text-xs text-slate-400 whitespace-nowrap space-y-0.5">
                  <div className="flex items-center gap-1.5 justify-end">
                    <User className="w-3.5 h-3.5" />
                    <span className="font-medium text-slate-600 dark:text-slate-300">{log.userName}</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{log.dateString}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
