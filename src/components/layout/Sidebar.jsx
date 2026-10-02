// Desktop Sidebar Navigation for Kon Plus
import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  Cpu, 
  History, 
  BarChart3, 
  Settings, 
  FileText, 
  UserX, 
  Bell, 
  Sun, 
  Moon, 
  LogOut, 
  UserCog, 
  Activity, 
  Globe 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import SyncBadge from './SyncBadge';

export default function Sidebar({ currentPage, setCurrentPage }) {
  const { userProfile, isOwner, isSupervisor, logout } = useAuth();
  const { theme, toggleTheme, language, setLanguage } = useTheme();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'assignment', label: 'จัดพนักงาน', icon: UserCheck },
    { id: 'employees', label: 'พนักงาน', icon: Users },
    { id: 'machines', label: 'เครื่องจักร', icon: Cpu },
    { id: 'history', label: 'ประวัติย้อนหลัง', icon: History },
    { id: 'reports', label: 'รายงาน & สถิติ', icon: BarChart3 },
    { id: 'auditLogs', label: 'Log การแก้ไข', icon: FileText },
    { id: 'settings', label: 'ตั้งค่าระบบ', icon: Settings }
  ];

  const secondaryItems = [
    { id: 'backupList', label: 'รายชื่อสำรอง', icon: UserX, allowed: true },
    { id: 'loginHistory', label: 'Login History', icon: Activity, allowed: true },
    { 
      id: 'userManagement', 
      label: 'จัดการผู้ใช้', 
      icon: UserCog, 
      allowed: isOwner, 
      disabledNote: 'เฉพาะ Owner' 
    },
    { id: 'notifications', label: 'ศูนย์แจ้งเตือน', icon: Bell, allowed: true }
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 xl:w-72 fixed inset-y-0 left-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-30 transition-colors shadow-xs">
      
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
        <div 
          onClick={() => setCurrentPage('dashboard')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center text-white font-extrabold text-xl shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform flex-shrink-0">
            ค+
          </div>
          <div className="min-w-0">
            <span className="text-xl font-bold bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent dark:from-blue-400 dark:to-blue-200 block truncate">
              คนพลัส
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 block leading-none font-medium truncate">
              Kon Plus Operations
            </span>
          </div>
        </div>
      </div>

      {/* User Profile Card */}
      <div className="p-4 mx-3 my-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex-shrink-0">
        <div className="flex items-center gap-3">
          <img
            src={userProfile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile?.uid || 'user'}`}
            alt="avatar"
            className="w-10 h-10 rounded-full border-2 border-blue-500/80 object-cover flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 truncate">
              {userProfile?.displayName || 'ผู้ใช้งาน'}
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              {userProfile?.email}
            </p>
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-[11px]">
          <span className={`px-2 py-0.5 rounded-full font-bold ${
            isOwner 
              ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' 
              : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
          }`}>
            {isOwner ? '👑 Owner' : '💼 หัวหน้ากะ'}
          </span>
          {userProfile?.employeeId && (
            <span className="font-mono text-slate-500 dark:text-slate-400 font-semibold">
              ID: {userProfile.employeeId}
            </span>
          )}
        </div>
      </div>

      {/* Navigation List - Scrollable */}
      <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 py-1 block">
          เมนูหลัก
        </span>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-500/20'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}

        <div className="pt-3 pb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 py-1 block">
            ระบบและสิทธิ์
          </span>
        </div>

        {secondaryItems.map((item) => {
          const Icon = item.icon;
          const isAllowed = item.allowed;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              disabled={!isAllowed}
              onClick={() => isAllowed && setCurrentPage(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm transition ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-500/20'
                  : isAllowed
                  ? 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  : 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-60'
              }`}
            >
              <span className="flex items-center gap-3 truncate">
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </span>
              {!isAllowed && (
                <span className="text-[10px] font-semibold text-amber-500 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">
                  {item.disabledNote}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Footer Controls */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 space-y-2 flex-shrink-0">
        
        {/* Sync Status Badge in Sidebar */}
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xs text-slate-500 font-medium">การซิงก์:</span>
          <SyncBadge />
        </div>

        {/* Quick Preferences: Theme & Language */}
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition"
            title="เปลี่ยนธีม"
          >
            {theme === 'light' ? <Moon className="w-3.5 h-3.5 text-slate-500" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
            <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
          </button>

          <button
            onClick={() => setLanguage(language === 'th' ? 'en' : 'th')}
            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition"
            title="เปลี่ยนภาษา"
          >
            <Globe className="w-3.5 h-3.5 text-blue-500" />
            <span>{language === 'th' ? 'ไทย' : 'EN'}</span>
          </button>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition"
        >
          <LogOut className="w-4 h-4" />
          <span>ออกจากระบบ</span>
        </button>

      </div>

    </aside>
  );
}
