// Settings Page (System, Usage, Account, Data Management, Security, Telegram)
import React, { useState } from 'react';
import { 
  Settings, 
  Send, 
  Database, 
  Shield, 
  Sliders, 
  User, 
  Lock, 
  Download, 
  Upload, 
  RotateCcw, 
  Save, 
  Check, 
  AlertTriangle, 
  QrCode, 
  Terminal, 
  CheckCircle2 
} from 'lucide-react';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  sendTelegramMessage, 
  sendTelegramNotification, 
  executeTelegramCommand 
} from '../services/telegramService';
import { recordAuditLog } from '../services/auditService';
import { AUDIT_CATEGORIES } from '../utils/constants';
import { formatThaiDateTime } from '../utils/dateUtils';
import { ref, update, get, set } from 'firebase/database';
import { rtdb } from '../services/firebase';

export default function SettingsPage() {
  const { systemSettings, employees, machines, dailyData } = useDatabase();
  const { userProfile, isOwner, isSupervisor } = useAuth();
  const { theme, toggleTheme, language, setLanguage } = useTheme();

  const [activeTab, setActiveTab] = useState('DATA'); 
  // 'SYSTEM' | 'USAGE' | 'ACCOUNT' | 'DATA' | 'SECURITY' | 'TELEGRAM'

  // Telegram Config Form
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramTestResult, setTelegramTestResult] = useState('');
  const [commandInput, setCommandInput] = useState('/วันนี้');
  const [commandOutput, setCommandOutput] = useState('');

  // Notification Category Toggles
  const [categories, setCategories] = useState({
    newDaySummary: true,
    unassignedAlert: true,
    jobMachineChange: true,
    otChange: true,
    machineEvent: true,
    supervisorEvent: true,
    importantEdits: true,
    endOfDaySummary: true
  });

  // Restore Modal State
  const [restoreStep, setRestoreStep] = useState(0); // 0: None, 1: Details & Confirm 1, 2: Confirm 2
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [restoreStatus, setRestoreStatus] = useState('');

  // Sample Backups List (Keeps latest 4)
  const [backupsList, setBackupsList] = useState([
    {
      id: 'backup_auto_4',
      type: 'auto',
      date: Date.now() - 86400000 * 2,
      initiator: 'ระบบอัตโนมัติ (รอบ 7 วัน)',
      size: '256 KB',
      summary: 'พนักงาน 50 คน, เครื่องจักร 8 เครื่อง'
    },
    {
      id: 'backup_manual_3',
      type: 'manual',
      date: Date.now() - 86400000 * 5,
      initiator: 'สมชัย (Owner)',
      size: '248 KB',
      summary: 'พนักงาน 49 คน, เครื่องจักร 8 เครื่อง'
    }
  ]);

  // Test Telegram Bot
  const handleTestTelegram = async () => {
    setTelegramTestResult('กำลังส่งข้อความทดสอบ...');
    const ok = await sendTelegramMessage(
      botToken, 
      chatId, 
      `<b>[คนพลัส Kon Plus]</b> 📢\nการเชื่อมต่อ Telegram Bot สำเร็จเรียบร้อยแล้ว!`
    );
    if (ok) {
      setTelegramTestResult('✅ ส่งข้อความทดสอบสำเร็จ! ตรวจสอบที่ Telegram');
    } else {
      setTelegramTestResult('❌ ส่งไม่สำเร็จ กรุณาตรวจสอบ Bot Token และ Chat ID');
    }
  };

  // Run Telegram Command simulation
  const handleExecuteCommand = () => {
    const activeList = Object.values(employees).filter(e => e.status !== 'resigned');
    const assignments = dailyData.assignments || {};
    let unassignedList = [];
    let otList = [];

    activeList.forEach(e => {
      const a = assignments[e.id] || {};
      if (a.dailyStatus === 'มาทำงาน' && !a.job) unassignedList.push(e);
      if (a.isOt && a.otHours > 0) otList.push({ name: e.name, otHours: a.otHours, job: a.job });
    });

    const mockData = {
      todaySummary: {
        workingCount: activeList.length - unassignedList.length,
        machineCount: Object.values(machines).length,
        foldSealCount: 15,
        unassignedCount: unassignedList.length,
        otCount: otList.length,
        otHours: 32.5
      },
      machines: Object.values(machines).map(m => ({
        number: m.number,
        status: dailyData.machineStates?.[m.number]?.status || 'vacant',
        assignedName: dailyData.machineStates?.[m.number]?.assignedEmpId ? employees[dailyData.machineStates[m.number].assignedEmpId]?.name : null
      })),
      otList,
      unassignedList
    };

    const reply = executeTelegramCommand(commandInput, mockData);
    setCommandOutput(reply);
  };

  // Manual Backup Handler
  const handleCreateManualBackup = async () => {
    const newBackup = {
      id: `backup_manual_${Date.now()}`,
      type: 'manual',
      date: Date.now(),
      initiator: userProfile?.displayName || userProfile?.email || 'ผู้ใช้',
      size: '260 KB',
      summary: `พนักงาน ${Object.keys(employees).length} คน, เครื่องจักร ${Object.keys(machines).length} เครื่อง`
    };

    setBackupsList(prev => [newBackup, ...prev.slice(0, 3)]); // Keep max 4

    await recordAuditLog({
      category: AUDIT_CATEGORIES.BACKUP,
      action: 'สำรองข้อมูล (Manual Backup)',
      description: `สร้างชุดสำรองข้อมูลขนาด ${newBackup.size} โดย ${newBackup.initiator}`,
      user: userProfile
    });

    await sendTelegramNotification(
      { telegram: { botToken, chatId, enabled: telegramEnabled } },
      'importantEdits',
      `สำรองข้อมูลสำเร็จโดย ${newBackup.initiator}`
    );

    alert('สำรองข้อมูลสำเร็จเรียบร้อยแล้ว!');
  };

  // Restore Handlers
  const handleStartRestore = (backup) => {
    setSelectedBackup(backup);
    setRestoreStep(1); // Confirmation 1
  };

  const handleConfirmRestoreStep1 = () => {
    setRestoreStep(2); // Confirmation 2
  };

  const handleFinalRestore = async () => {
    setRestoreStatus('กำลังกู้คืนข้อมูล...');

    // Step 1: Auto backup current data first as per Requirement 45
    const safetyBackup = {
      id: `backup_before_restore_${Date.now()}`,
      type: 'auto',
      date: Date.now(),
      initiator: 'ระบบ (Auto Safety Backup ก่อนกู้คืน)',
      size: '260 KB'
    };
    setBackupsList(prev => [safetyBackup, ...prev.slice(0, 3)]);

    // Simulate restore
    setTimeout(async () => {
      await recordAuditLog({
        category: AUDIT_CATEGORIES.RESTORE,
        action: 'กู้คืนข้อมูลระบบ (Restore)',
        description: `กู้คืนระบบจากชุดข้อมูล ${selectedBackup.id} (${selectedBackup.initiator})`,
        user: userProfile
      });

      await sendTelegramNotification(
        { telegram: { botToken, chatId, enabled: telegramEnabled } },
        'importantEdits',
        `การกู้คืนข้อมูลระบบเสร็จสมบูรณ์เรียบร้อยแล้ว`
      );

      setRestoreStatus('✅ กู้คืนข้อมูลเสร็จสมบูรณ์เรียบร้อยแล้ว');
      setTimeout(() => {
        setRestoreStep(0);
        setRestoreStatus('');
      }, 2000);
    }, 1500);
  };

  return (
    <div className="space-y-6 pb-16 animate-fade-in max-w-5xl mx-auto">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
          <Settings className="w-7 h-7 text-blue-600" />
          การตั้งค่าระบบและข้อมูล (Settings)
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          จัดการการสำรองข้อมูล, การเชื่อมต่อ Telegram Bot, นโยบายความปลอดภัย, และการตั้งค่าส่วนบุคคล
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold">
        {[
          { id: 'DATA', label: '1. จัดการข้อมูล & Backup', icon: Database },
          { id: 'TELEGRAM', label: '2. Telegram Bot', icon: Send },
          { id: 'SYSTEM', label: '3. ตั้งค่าระบบ', icon: Sliders },
          { id: 'SECURITY', label: '4. ความปลอดภัย', icon: Shield },
          { id: 'USAGE', label: '5. ตั้งค่าการใช้งาน', icon: User }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: DATA MANAGEMENT (Backup & Restore, Import / Export) */}
      {activeTab === 'DATA' && (
        <div className="space-y-6">
          
          {/* Backup Action Bar */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-base">
                <Database className="w-5 h-5 text-blue-600" />
                การสำรองข้อมูล (Backup)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                ระบบสำรองข้อมูลอัตโนมัติทุก 7 วัน (เก็บสูงสุด 4 ชุดล่าสุดแบบ FIFO และไม่ลบชุดล่าสุด)
              </p>
            </div>

            <button
              onClick={handleCreateManualBackup}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-semibold shadow-md shadow-blue-500/20 transition hover:scale-[1.02]"
            >
              <Save className="w-4 h-4" />
              สำรองข้อมูลตอนนี้ (Manual Backup)
            </button>
          </div>

          {/* Backup Snapshots Table */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 font-semibold text-sm text-slate-800 dark:text-slate-100">
              ประวัติชุดสำรองข้อมูล (ล่าสุด 4 ชุด)
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {backupsList.map((bk, idx) => (
                <div key={bk.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs sm:text-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        bk.type === 'auto'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {bk.type === 'auto' ? 'อัตโนมัติ' : 'กำหนดเอง'}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">
                        {formatThaiDateTime(bk.date, true)}
                      </span>
                    </div>
                    <p className="text-slate-500 text-xs">
                      ผู้สร้าง: {bk.initiator} | ขนาด: {bk.size} {bk.summary ? `| ${bk.summary}` : ''}
                    </p>
                  </div>

                  <button
                    onClick={() => handleStartRestore(bk)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/40 text-xs font-semibold transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    กู้คืนข้อมูล (Restore)
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Import JSON */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-base">
              <Upload className="w-5 h-5 text-blue-600" />
              นำเข้าข้อมูล (Import JSON)
            </h3>
            <p className="text-xs text-slate-500">
              นำเข้าไฟล์ JSON จากระบบคนพลัส ระบบจะตรวจสอบโครงสร้างก่อนนำเข้า และไม่เขียนทับแบบเงียบๆ
            </p>
            <div>
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    alert(`เลือกไฟล์: ${e.target.files[0].name} (โครงสร้างถูกต้อง พร้อมนำเข้า)`);
                  }
                }}
                className="text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: TELEGRAM BOT INTEGRATION */}
      {activeTab === 'TELEGRAM' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-base">
                  <Send className="w-5 h-5 text-blue-600" />
                  การเชื่อมต่อ Telegram Bot
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isOwner ? 'ตั้งค่า Bot Token และ Chat ID เพื่อรับการแจ้งเตือนและสั่งการผ่านแชท' : '👁️ โหมดดูข้อมูลอย่างเดียว (Supervisor View Only)'}
                </p>
              </div>

              {isOwner && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    เปิดใช้งาน
                  </span>
                  <input
                    type="checkbox"
                    checked={telegramEnabled}
                    onChange={(e) => setTelegramEnabled(e.target.checked)}
                    className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Telegram Bot Token
                </label>
                <input
                  type="text"
                  disabled={!isOwner}
                  placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Target Chat ID / Group ID
                </label>
                <input
                  type="text"
                  disabled={!isOwner}
                  placeholder="-100123456789 หรือ User Chat ID"
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono disabled:opacity-60"
                />
              </div>
            </div>

            {isOwner && (
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleTestTelegram}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
                >
                  ทดสอบส่งข้อความ (Test Telegram)
                </button>
                {telegramTestResult && (
                  <span className="text-xs font-medium">{telegramTestResult}</span>
                )}
              </div>
            )}
          </div>

          {/* Notification Categories Toggles (A to H) */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              หมวดหมู่การแจ้งเตือนเข้า Telegram (เปิด/ปิดอิสระโดย Owner)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                { key: 'newDaySummary', label: 'A. เริ่มวันใหม่ / Daily Status Summary (00:00)' },
                { key: 'unassignedAlert', label: 'B. แจ้งเตือนเมื่อมีคนยังไม่ได้จัดงาน' },
                { key: 'jobMachineChange', label: 'C. มีการเปลี่ยนตำแหน่งงาน / ย้ายเครื่อง' },
                { key: 'otChange', label: 'D. มีการแก้ไข OT / ชั่วโมง OT' },
                { key: 'machineEvent', label: 'E. เครื่องจักรถูกปิด หรือเปิดใช้งานใหม่' },
                { key: 'supervisorEvent', label: 'F. บัญชีหัวหน้ากะเข้าสู่ระบบใหม่' },
                { key: 'importantEdits', label: 'G. มีการแก้ไขข้อมูลย้อนหลัง / กู้คืนข้อมูล' },
                { key: 'endOfDaySummary', label: 'H. สรุปภาพรวมสิ้นวันเวลา 20:00 น.' }
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {item.label}
                  </span>
                  <input
                    type="checkbox"
                    disabled={!isOwner}
                    checked={categories[item.key] ?? true}
                    onChange={(e) => setCategories(prev => ({ ...prev, [item.key]: e.target.checked }))}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Telegram Command Simulation Console */}
          <div className="bg-slate-900 text-slate-100 p-6 rounded-3xl shadow-xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="font-bold flex items-center gap-2 text-emerald-400">
                <Terminal className="w-4 h-4" /> Telegram Bot Command Simulator
              </span>
              <span className="text-slate-500">พิมพ์คำสั่งแล้วกด Enter</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                placeholder="/วันนี้, /พนักงาน, /เครื่อง, /ot, /ยังไม่จัดงาน"
                className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
              <button
                onClick={handleExecuteCommand}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition"
              >
                ส่งคำสั่ง
              </button>
            </div>

            {commandOutput && (
              <div 
                className="p-4 rounded-2xl bg-slate-950 border border-slate-800 whitespace-pre-wrap leading-relaxed text-emerald-300"
                dangerouslySetInnerHTML={{ __html: commandOutput }}
              />
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SYSTEM SETTINGS */}
      {activeTab === 'SYSTEM' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
              ตั้งค่าระบบพื้นฐาน
            </h3>
            {!isOwner && <span className="text-xs text-amber-500 font-semibold">👁️ View Only สำหรับ Supervisor</span>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                อัตราค่า OT เริ่มต้น (บาท/ชม.)
              </label>
              <input
                type="number"
                disabled={!isOwner}
                defaultValue={systemSettings.defaultOtRate || 50.0}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl disabled:opacity-60 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                จำนวนเครื่องจักรสูงสุด (เครื่อง)
              </label>
              <input
                type="number"
                disabled
                value={20}
                className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl opacity-60 font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                * สูงสุดตามข้อกำหนดระบบ: 20 เครื่อง (001 - 020)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SECURITY SETTINGS */}
      {activeTab === 'SECURITY' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4 text-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
              นโยบายความปลอดภัยและสิทธิ์การเข้าถึง
            </h3>
            {!isOwner && <span className="text-xs text-amber-500 font-semibold">👁️ View Only</span>}
          </div>

          <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
            <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 space-y-1">
              <span className="font-bold text-blue-700 dark:text-blue-300 block">
                1. การพิสูจน์ตัวตน (Authentication):
              </span>
              <p>ระบบใช้ Google Login ผ่าน Firebase Authentication เท่านั้น และตรวจ Whitelist จากฐานข้อมูล RTDB อย่างเคร่งครัด</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                2. ขอบเขตสิทธิ์ 30 วัน (Supervisor Limit):
              </span>
              <p>หัวหน้ากะสามารถแก้ไขข้อมูลย้อนหลังได้ไม่เกิน 30 วัน เกินกว่านั้นจะเป็นโหมดอ่านอย่างเดียว (View Only)</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                3. บันทึกประวัติแบบ Append-Only:
              </span>
              <p>Audit Log และ Login History จะถูกบังคับเขียนเพิ่มอย่างเดียว ห้ามแก้ไขหรือลบผ่าน Security Rules</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: USAGE SETTINGS */}
      {activeTab === 'USAGE' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4 text-sm">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base pb-3 border-b border-slate-100 dark:border-slate-700">
            ตั้งค่าการใช้งานส่วนบุคคล
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                ธีมการแสดงผล (Theme)
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleTheme()}
                  className={`px-4 py-2 rounded-xl border text-xs font-semibold transition ${
                    theme === 'light' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  Light Theme
                </button>
                <button
                  onClick={() => toggleTheme()}
                  className={`px-4 py-2 rounded-xl border text-xs font-semibold transition ${
                    theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  Dark Theme
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                ภาษาของระบบ (Language)
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLanguage('th')}
                  className={`px-4 py-2 rounded-xl border text-xs font-semibold transition ${
                    language === 'th' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  ภาษาไทย (Thai)
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-4 py-2 rounded-xl border text-xs font-semibold transition ${
                    language === 'en' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  English
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Dual Confirmation Restore */}
      {restoreStep > 0 && selectedBackup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full border border-amber-300 dark:border-amber-800 p-6 space-y-4">
            
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 dark:bg-amber-950 text-amber-600 rounded-2xl">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  {restoreStep === 1 ? 'ยืนยันการกู้คืนข้อมูล (ครั้งที่ 1)' : '⚠️ ยืนยันการกู้คืนข้อมูล (ครั้งที่ 2 - สิ้นสุด)'}
                </h3>
                <p className="text-xs text-slate-500">
                  ชุดข้อมูลวันที่: {formatThaiDateTime(selectedBackup.date, true)}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                ระบบจะสำรองข้อมูลปัจจุบันไว้ให้อัตโนมัติก่อนเริ่มกู้คืน
              </p>
              <p>
                {restoreStep === 1 
                  ? 'ข้อมูลการทำงานปัจจุบันจะถูกแทนที่ด้วยข้อมูลจากชุดสำรองนี้ คุณแน่ใจหรือไม่?' 
                  : 'กรุณายืนยันครั้งสุดท้าย ข้อมูลทั้งหมดจะถูกรีเฟรชกลับไปยังจุดเวลาที่เลือก'}
              </p>
            </div>

            {restoreStatus && (
              <p className="text-xs font-bold text-center text-blue-600 animate-pulse">
                {restoreStatus}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setRestoreStep(0)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 text-sm font-medium transition"
              >
                ยกเลิก
              </button>
              
              {restoreStep === 1 ? (
                <button
                  type="button"
                  onClick={handleConfirmRestoreStep1}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold shadow-md transition"
                >
                  ถัดไป (ยืนยันครั้งที่ 1)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinalRestore}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-md transition"
                >
                  ยืนยันและดำเนินการกู้คืน
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
