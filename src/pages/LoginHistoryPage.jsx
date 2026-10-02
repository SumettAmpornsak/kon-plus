// Login History Page - Permanent Append-Only Log
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  Search, 
  CheckCircle2, 
  XCircle, 
  MapPin, 
  Globe, 
  Calendar, 
  ShieldCheck 
} from 'lucide-react';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../services/firebase';

export default function LoginHistoryPage() {
  const [historyList, setHistoryList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const historyRef = ref(rtdb, 'loginHistory');
    const unsub = onValue(historyRef, (snap) => {
      const val = snap.val() || {};
      const list = Object.values(val).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setHistoryList(list);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    if (!searchTerm) return historyList;
    const term = searchTerm.toLowerCase();
    return historyList.filter(item => 
      item.email?.toLowerCase().includes(term) ||
      item.displayName?.toLowerCase().includes(term) ||
      item.ip?.toLowerCase().includes(term) ||
      item.location?.toLowerCase().includes(term)
    );
  }, [historyList, searchTerm]);

  return (
    <div className="space-y-6 pb-16 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
            <Activity className="w-7 h-7 text-blue-600" />
            ประวัติการเข้าสู่ระบบ (Login History)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            เก็บบันทึกประวัติการเข้าสู่ระบบอย่างถาวร พร้อม IP และพิกัดโดยประมาณ (ห้ามแก้ไข/ลบ)
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>บันทึกถาวร (Permanent Storage)</span>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาอีเมล, ชื่อ, หรือ IP address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[650px]">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-700 sticky top-0">
              <tr>
                <th className="px-6 py-4">วันและเวลา</th>
                <th className="px-6 py-4">บัญชี Google</th>
                <th className="px-6 py-4">สถานะ</th>
                <th className="px-6 py-4">IP Address</th>
                <th className="px-6 py-4">ตำแหน่งโดยประมาณ (GeoIP)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-slate-400">
                    ไม่พบข้อมูลประวัติการเข้าสู่ระบบ
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-750 transition text-xs sm:text-sm">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                      {item.dateString}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {item.displayName || 'ไม่ระบุชื่อ'}
                        </p>
                        <p className="text-xs text-slate-400 font-mono">
                          {item.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.success ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5" /> สำเร็จ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                          <XCircle className="w-3.5 h-3.5" /> ไม่ได้รับอนุญาต
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-slate-400" />
                        {item.ip || '127.0.0.1'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-500" />
                        {item.location || 'Bangkok, Thailand'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
