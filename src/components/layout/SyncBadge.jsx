// Sync Status Badge & Modal
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Wifi, WifiOff, RefreshCw, Clock, AlertTriangle, X } from 'lucide-react';
import { useDatabase } from '../../contexts/DatabaseContext';

export default function SyncBadge() {
  const { syncStatus, pendingCount } = useDatabase();
  const [showModal, setShowModal] = useState(false);

  let badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300';
  let icon = <Wifi className="w-3.5 h-3.5" />;
  let label = '🟢 Sync แล้ว';

  if (syncStatus === 'offline') {
    badgeColor = 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border-rose-300';
    icon = <WifiOff className="w-3.5 h-3.5" />;
    label = '🔴 Offline';
  } else if (syncStatus === 'syncing') {
    badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-300';
    icon = <RefreshCw className="w-3.5 h-3.5 animate-spin" />;
    label = '🟡 กำลัง Sync';
  } else if (syncStatus === 'pending' || pendingCount > 0) {
    badgeColor = 'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300 border-orange-300';
    icon = <Clock className="w-3.5 h-3.5" />;
    label = `🟠 รอ Sync ${pendingCount} รายการ`;
  }

  const modalContent = showModal ? (
    <div className="fixed inset-0 z-[9999] overflow-y-auto flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="fixed inset-0" 
        onClick={() => setShowModal(false)} 
        aria-hidden="true"
      />
      <div className="relative my-auto bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 overflow-hidden z-10 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm sm:text-base">
            <RefreshCw className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <span>สถานะการซิงก์ข้อมูล (Real-time & Offline)</span>
          </h3>
          <button
            onClick={() => setShowModal(false)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-sm overflow-y-auto">
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
            <span className="text-slate-600 dark:text-slate-300">สถานะเครือข่ายปัจจุบัน:</span>
            <span className="font-medium flex items-center gap-1.5">
              {navigator.onLine ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Wifi className="w-4 h-4" /> เชื่อมต่ออินเทอร์เน็ตแล้ว
                </span>
              ) : (
                <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <WifiOff className="w-4 h-4" /> ออฟไลน์ (Offline Mode)
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
            <span className="text-slate-600 dark:text-slate-300">รายการค้างในคิว (Pending Queue):</span>
            <span className="font-bold text-blue-600 dark:text-blue-400 text-base">
              {pendingCount} รายการ
            </span>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-2xl text-xs text-blue-800 dark:text-blue-200 space-y-1.5 leading-relaxed">
            <div className="font-bold flex items-center gap-1.5 text-blue-900 dark:text-blue-100 text-xs">
              <AlertTriangle className="w-4 h-4 text-blue-600 flex-shrink-0" /> 
              นโยบายการแก้ปัญหาความขัดแย้ง (Conflict Resolution)
            </div>
            <p>
              ระบบใช้กฎ <b>Latest Timestamp Wins</b> เมื่อคุณทำงานในโหมดออฟไลน์ ข้อมูลจะถูกบันทึกไว้ในเบราว์เซอร์ (IndexedDB) และจะซิงก์กลับขึ้น Firebase Realtime Database ทันทีที่เครื่องต่ออินเทอร์เน็ต
            </p>
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-700 text-right flex-shrink-0">
          <button
            onClick={() => setShowModal(false)}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border transition-all hover:opacity-85 ${badgeColor}`}
        title="คลิกเพื่อดูสถานะการซิงก์"
      >
        {icon}
        <span>{label}</span>
      </button>

      {typeof document !== 'undefined' && modalContent && createPortal(modalContent, document.body)}
    </>
  );
}
