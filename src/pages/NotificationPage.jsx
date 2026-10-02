// Notification Center Page
import React, { useState } from 'react';
import { 
  Bell, 
  CheckCheck, 
  AlertTriangle, 
  Info, 
  AlertCircle, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';
import { formatThaiDateTime } from '../utils/dateUtils';

export default function NotificationPage() {
  const [notifications, setNotifications] = useState([
    {
      id: 'notif_1',
      title: 'เริ่มวันใหม่สำเร็จ',
      message: 'ระบบรีเซ็ตสถานะเครื่องจักรเป็นว่าง และสร้างวันใหม่ 00:00 ตามเวลาไทยเรียบร้อยแล้ว',
      type: 'info',
      timestamp: Date.now() - 3600000,
      read: false
    },
    {
      id: 'notif_2',
      title: 'สำรองข้อมูลอัตโนมัติสำเร็จ',
      message: 'ระบบสำรองข้อมูลอัตโนมัติประจำรอบ 7 วันเรียบร้อยแล้ว (ขนาด 256 KB)',
      type: 'success',
      timestamp: Date.now() - 86400000,
      read: false
    },
    {
      id: 'notif_3',
      title: 'พนักงานยังไม่ได้จัดงาน',
      message: 'มีพนักงานมาทำงานแต่ยังไม่ได้จัดงาน 2 คน กรุณาตรวจสอบที่หน้าจัดพนักงาน',
      type: 'warning',
      timestamp: Date.now() - 172800000,
      read: true
    }
  ]);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6 pb-16 animate-fade-in max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
            <Bell className="w-7 h-7 text-blue-600" />
            ศูนย์การแจ้งเตือน (Notification Center)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            แจ้งเตือนเหตุการณ์สำคัญ การสำรองข้อมูล และสถานะเครื่องจักร
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-semibold transition"
          >
            <CheckCheck className="w-4 h-4" />
            ทำเครื่องหมายว่าอ่านแล้วทั้งหมด ({unreadCount})
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs divide-y divide-slate-100 dark:divide-slate-700/60 overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            ไม่มีการแจ้งเตือนใหม่ในขณะนี้
          </div>
        ) : (
          notifications.map((n) => {
            const isUnread = !n.read;
            return (
              <div
                key={n.id}
                className={`p-5 flex items-start gap-4 transition ${
                  isUnread ? 'bg-blue-50/30 dark:bg-blue-950/20' : 'hover:bg-slate-50/50'
                }`}
              >
                <div className="mt-1">
                  {n.type === 'warning' ? (
                    <div className="p-2 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                  ) : n.type === 'success' ? (
                    <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="p-2 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                      <Info className="w-5 h-5" />
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className={`text-sm ${isUnread ? 'font-bold text-slate-900 dark:text-white' : 'font-semibold text-slate-700 dark:text-slate-300'}`}>
                      {n.title}
                    </h4>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatThaiDateTime(n.timestamp, true)}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {n.message}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
