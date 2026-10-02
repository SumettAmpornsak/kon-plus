// Google Login Page for Kon Plus
import React from 'react';
import { 
  LogIn, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  Lock 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ROLES } from '../utils/constants';

export default function LoginPage() {
  const { 
    loginWithGoogle, 
    loginDemoAccount, 
    authError, 
    isNewDayLogout, 
    loading 
  } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-100/40 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/20 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-8 space-y-6 animate-scale-in">
        
        {/* Brand Logo */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-500 mx-auto flex items-center justify-center text-white font-extrabold text-3xl shadow-lg shadow-blue-500/30">
            ค+
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            คนพลัส (Kon Plus)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            ระบบบริหารพนักงาน งานประจำวัน เครื่องจักร OT ประวัติ และรายงาน
          </p>
        </div>

        {/* New Day Rollover Notice */}
        {isNewDayLogout && (
          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-200 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold">เริ่มต้นวันใหม่ (00:00 น.)</p>
              <p>ระบบออกจากระบบโดยอัตโนมัติเพื่อรีเซ็ตข้อมูลประจำวัน กรุณาเข้าสู่ระบบใหม่อีกครั้ง</p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {authError && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold">ไม่สามารถเข้าสู่ระบบได้</p>
              <p>{authError}</p>
            </div>
          </div>
        )}

        {/* Google Sign-In Button */}
        <div className="space-y-3 pt-2">
          <button
            onClick={loginWithGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-slate-50 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-100 font-semibold text-sm rounded-2xl border border-slate-300 dark:border-slate-600 shadow-sm transition hover:shadow-md disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>เข้าสู่ระบบด้วย Google Account</span>
          </button>
          <span className="text-[11px] text-slate-400 text-center block">
            * เฉพาะบัญชีที่ได้รับการแต่งตั้งจาก Owner เท่านั้น ไม่มีปุ่มสมัครสมาชิกเอง
          </span>
        </div>

        {/* Quick Demo Login Option for Immediate Test / Offline Evaluation */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-2">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 text-center">
            หรือทดลองใช้งานทันที (Demo Test Accounts):
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => loginDemoAccount(ROLES.OWNER)}
              className="py-2.5 px-3 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 text-purple-700 dark:text-purple-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-purple-200 dark:border-purple-800"
            >
              👑 ทดลองสิทธิ์ Owner
            </button>
            <button
              onClick={() => loginDemoAccount(ROLES.SUPERVISOR)}
              className="py-2.5 px-3 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-blue-200 dark:border-blue-800"
            >
              💼 ทดลองสิทธิ์ หัวหน้ากะ
            </button>
          </div>
        </div>

        {/* Security Badge */}
        <div className="text-center pt-2">
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            ระบบรักษาความปลอดภัยตามมาตรฐาน Firebase Realtime Database
          </span>
        </div>

      </div>
    </div>
  );
}
