// Main Application Router & Shell for Kon Plus
import React, { useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DatabaseProvider } from './contexts/DatabaseContext';

// Layout & Global Indicators
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import AutoSaveIndicator from './components/layout/AutoSaveIndicator';
import DailyStatusModal from './components/common/DailyStatusModal';
import ReopenPromptModal from './components/machines/ReopenPromptModal';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AssignmentPage from './pages/AssignmentPage';
import EmployeesPage from './pages/EmployeesPage';
import BackupListPage from './pages/BackupListPage';
import MachinesPage from './pages/MachinesPage';
import HistoryPage from './pages/HistoryPage';
import ReportsPage from './pages/ReportsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import LoginHistoryPage from './pages/LoginHistoryPage';
import UserManagementPage from './pages/UserManagementPage';
import NotificationPage from './pages/NotificationPage';
import SettingsPage from './pages/SettingsPage';

function AppContent() {
  const { currentUser, userProfile, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  
  // Navigation filters passed across pages (e.g. from Dashboard click badges)
  const [assignmentFilter, setAssignmentFilter] = useState(null);
  const [machineFilter, setMachineFilter] = useState('ALL');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-500 mx-auto flex items-center justify-center text-white font-bold text-xl shadow-lg animate-pulse">
            ค+
          </div>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            กำลังโหลดระบบคนพลัส...
          </p>
        </div>
      </div>
    );
  }

  // Not logged in -> Show Google Sign-In Screen
  if (!currentUser || !userProfile) {
    return <LoginPage />;
  }

  return (
    <DatabaseProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col font-['Prompt',sans-serif]">
        
        {/* Desktop Left Sidebar (Visible on >= lg screens) */}
        <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />

        {/* Mobile Header (Visible on < lg screens) */}
        <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />

        {/* Main Content Area: Offset by sidebar width on desktop */}
        <div className="flex-1 flex flex-col lg:pl-64 xl:pl-72 min-w-0 transition-all">
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
            {currentPage === 'dashboard' && (
              <DashboardPage 
                setCurrentPage={setCurrentPage}
                setAssignmentFilter={setAssignmentFilter}
                setMachineFilter={setMachineFilter}
              />
            )}

            {currentPage === 'assignment' && (
              <AssignmentPage initialFilters={assignmentFilter} />
            )}

            {currentPage === 'employees' && (
              <EmployeesPage setCurrentPage={setCurrentPage} />
            )}

            {currentPage === 'backupList' && (
              <BackupListPage setCurrentPage={setCurrentPage} />
            )}

            {currentPage === 'machines' && (
              <MachinesPage initialFilter={machineFilter} />
            )}

            {currentPage === 'history' && (
              <HistoryPage />
            )}

            {currentPage === 'reports' && (
              <ReportsPage />
            )}

            {currentPage === 'auditLogs' && (
              <AuditLogsPage />
            )}

            {currentPage === 'loginHistory' && (
              <LoginHistoryPage />
            )}

            {currentPage === 'userManagement' && (
              <UserManagementPage />
            )}

            {currentPage === 'notifications' && (
              <NotificationPage />
            )}

            {currentPage === 'settings' && (
              <SettingsPage />
            )}
          </main>
        </div>

        {/* Global Modals & Indicators */}
        <DailyStatusModal />
        <ReopenPromptModal />
        <AutoSaveIndicator />

      </div>
    </DatabaseProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
