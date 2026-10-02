// Reopen Machine Prompt Modal
import React from 'react';
import { Cpu, RotateCcw, CheckCircle2, X } from 'lucide-react';
import { useDatabase } from '../../contexts/DatabaseContext';

export default function ReopenPromptModal() {
  const { reopenPromptMachine, setReopenPromptMachine, reopenMachine, employees, dailyData } = useDatabase();

  if (!reopenPromptMachine) return null;

  const machineNumber = reopenPromptMachine;
  const state = dailyData.machineStates[machineNumber] || {};
  const lastEmp = state.lastAssignedEmpId ? employees[state.lastAssignedEmpId] : null;

  const handleChoice = async (mode) => {
    await reopenMachine(machineNumber, mode);
    setReopenPromptMachine(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 overflow-hidden">
        
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-950 text-blue-600 rounded-2xl">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                เปิดใช้งานเครื่อง {machineNumber}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                โปรดเลือกสถานะการเปิดเครื่องจักร
              </p>
            </div>
          </div>
          <button
            onClick={() => setReopenPromptMachine(null)}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {lastEmp ? (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-sm space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                พนักงานคนล่าสุดที่ใช้งานเครื่องนี้:
              </span>
              <p className="font-semibold text-slate-800 dark:text-slate-100">
                {lastEmp.name} ({lastEmp.employeeId})
              </p>
              <p className="text-xs text-slate-500">
                ตำแหน่งเดิม: {state.lastJob || 'เข้าเครื่อง'} {state.lastIsOt ? `| OT: ${state.lastOtHours} ชม.` : ''}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              ไม่มีข้อมูลพนักงานคนก่อนหน้า เครื่องนี้จะเปิดเป็นสถานะว่าง
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => handleChoice('vacant')}
              className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-emerald-500/30 hover:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 transition text-center group"
            >
              <CheckCircle2 className="w-6 h-6 mb-1 text-emerald-600 group-hover:scale-110 transition-transform" />
              <span className="font-bold text-sm">🟢 เปิดเป็นเครื่องว่าง</span>
              <span className="text-[11px] text-emerald-600/70 dark:text-emerald-400/70">
                รอจัดพนักงานใหม่
              </span>
            </button>

            {lastEmp ? (
              <button
                onClick={() => handleChoice('restore')}
                className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-blue-500/30 hover:border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 transition text-center group"
              >
                <RotateCcw className="w-6 h-6 mb-1 text-blue-600 group-hover:rotate-45 transition-transform" />
                <span className="font-bold text-sm">🔄 คืนพนักงานคนเดิม</span>
                <span className="text-[11px] text-blue-600/70 dark:text-blue-400/70">
                  คืนงานและ OT เดิม
                </span>
              </button>
            ) : null}
          </div>
        </div>

      </div>
    </div>
  );
}
