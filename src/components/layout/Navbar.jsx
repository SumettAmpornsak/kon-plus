// Mobile Navigation Header & Drawer for Kon Plus (Visible on < lg screens)
import React, { useState } from 'react';
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
  Menu, 
  X, 
  LogOut, 
  UserCog, 
  Activity 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import SyncBadge from './SyncBadge';

export default function Navbar({ currentPage, setCurrentPage }) {
  const { userProfile, isOwner, isSupervisor, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'assignment', label: 'จัดพนักงาน', icon: UserCheck },
    { id: 'employees', label: 'พนักงาน', icon: Users },
    { id: 'machines', label: 'เครื่องจักร', icon: Cpu },
    { id: 'history', label: 'ประวัติ', icon: History },
    { id: 'reports', label: 'รายงาน', icon: BarChart3 },
    { id: 'auditLogs', label: 'Log การแก้ไข', icon: FileText },
    { id: 'settings', label: 'ตั้งค่า', icon: Settings }
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
    }
  ];

  const handleNavClick = (pageId, allowed = true) => {
    if (!allowed) return;
    setCurrentPage(pageId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="lg:hidden sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          
          {/* Mobile Hamburger & Logo */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="เปิดเมนู"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div 
              onClick={() => setCurrentPage('dashboard')}
              className="flex items-center gap-2 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center text-white font-bold text-base shadow-sm">
                ค+
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent dark:from-blue-400 dark:to-blue-200">
                คนพลัส
              </span>
            </div>
          </div>

          {/* Right Mobile Controls */}
          <div className="flex items-center gap-2">
            <SyncBadge />

            <button
              onClick={() => setCurrentPage('notifications')}
              className={`p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
                currentPage === 'notifications' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50' : ''
              }`}
              title="การแจ้งเตือน"
            >
              <Bell className="w-5 h-5" />
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="เปลี่ยนธีม"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-amber-400" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-3 pb-6 space-y-2 shadow-xl animate-fade-in max-h-[85vh] overflow-y-auto">
          {/* User Profile Snippet */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
            <img
              src={userProfile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile?.uid || 'user'}`}
              alt="avatar"
              className="w-10 h-10 rounded-full border border-blue-500"
            />
            <div className="overflow-hidden flex-1">
              <p className="font-semibold text-slate-800 dark:text-slate-100 truncate text-sm">
                {userProfile?.displayName || 'ผู้ใช้งาน'}
              </p>
              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mt-0.5 ${
                isOwner 
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' 
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
              }`}>
                {isOwner ? '👑 Owner' : '💼 หัวหน้ากะ'}
              </span>
            </div>
          </div>

          <div className="space-y-1 pt-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
            {secondaryItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  disabled={!item.allowed}
                  onClick={() => handleNavClick(item.id, item.allowed)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition ${
                    item.allowed
                      ? 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      : 'text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-slate-400" />
                    <span>{item.label}</span>
                  </span>
                  {!item.allowed && <span className="text-[10px] text-amber-500 font-bold">{item.disabledNote}</span>}
                </button>
              );
            })}

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
            >
              <LogOut className="w-5 h-5" />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
