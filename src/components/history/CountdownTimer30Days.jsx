// 30-Day Historical Edit Limit Countdown for Supervisor
import React, { useState, useEffect } from 'react';
import { Clock, Lock, ShieldCheck } from 'lucide-react';
import { get30DayCountdown } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';

export default function CountdownTimer30Days({ targetDate }) {
  const { isOwner } = useAuth();
  const [countdown, setCountdown] = useState(() => get30DayCountdown(targetDate));

  useEffect(() => {
    if (isOwner) return;

    const timer = setInterval(() => {
      setCountdown(get30DayCountdown(targetDate));
    }, 10000); // Update every 10 seconds

    return () => clearInterval(timer);
  }, [targetDate, isOwner]);

  if (isOwner) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-semibold">
        <ShieldCheck className="w-4 h-4 text-purple-600" />
        <span>👑 สิทธิ์ Owner: สามารถแก้ไขข้อมูลย้อนหลังได้ไม่จำกัด</span>
      </div>
    );
  }

  if (countdown.isExpired) {
    return (
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold shadow-xs">
        <Lock className="w-4 h-4 text-rose-600" />
        <span>{countdown.text}</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-semibold shadow-xs animate-pulse">
      <Clock className="w-4 h-4 text-amber-600" />
      <span>{countdown.text}</span>
    </div>
  );
}
