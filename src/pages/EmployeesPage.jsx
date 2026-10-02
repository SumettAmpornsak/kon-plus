// Master Employees Page (พนักงาน)
import React, { useState, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit3, 
  UserMinus, 
  Archive, 
  Coins, 
  AlertCircle, 
  Check, 
  X 
} from 'lucide-react';
import { useDatabase } from '../contexts/DatabaseContext';
import { DEFAULT_OT_RATE } from '../utils/constants';

export default function EmployeesPage({ setCurrentPage }) {
  const { employees, addEmployee, updateEmployee, resignEmployee } = useDatabase();

  const [searchTerm, setSearchTerm] = useState('');
  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit' | 'resign'
  const [selectedEmp, setSelectedEmp] = useState(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formNickname, setFormNickname] = useState('');
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formOtRate, setFormOtRate] = useState(DEFAULT_OT_RATE);
  const [resignReason, setResignReason] = useState('ลาออก');

  const activeEmployees = useMemo(() => {
    return Object.values(employees)
      .filter(e => e.status !== 'resigned')
      .sort((a, b) => (a.employeeId || '').localeCompare(b.employeeId || '', undefined, { numeric: true }));
  }, [employees]);

  const backupCount = useMemo(() => {
    return Object.values(employees).filter(e => e.status === 'resigned').length;
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    if (!searchTerm) return activeEmployees;
    const term = searchTerm.toLowerCase();
    return activeEmployees.filter(e => 
      e.name?.toLowerCase().includes(term) ||
      e.nickname?.toLowerCase().includes(term) ||
      e.employeeId?.toLowerCase().includes(term)
    );
  }, [activeEmployees, searchTerm]);

  const openAddModal = () => {
    setFormName('');
    setFormNickname('');
    // Auto-suggest next employee ID
    const nextNum = activeEmployees.length + 1;
    setFormEmployeeId(String(nextNum).padStart(3, '0'));
    setFormOtRate(DEFAULT_OT_RATE);
    setModalMode('add');
  };

  const openEditModal = (emp) => {
    setSelectedEmp(emp);
    setFormName(emp.name || '');
    setFormNickname(emp.nickname || '');
    setFormEmployeeId(emp.employeeId || '');
    setFormOtRate(emp.otRate || DEFAULT_OT_RATE);
    setModalMode('edit');
  };

  const openResignModal = (emp) => {
    setSelectedEmp(emp);
    setResignReason('ลาออก');
    setModalMode('resign');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formName.trim() || !formEmployeeId.trim()) return;

    if (modalMode === 'add') {
      await addEmployee({
        name: formName.trim(),
        nickname: formNickname.trim(),
        employeeId: formEmployeeId.trim(),
        otRate: parseFloat(formOtRate) || DEFAULT_OT_RATE
      });
    } else if (modalMode === 'edit' && selectedEmp) {
      await updateEmployee(selectedEmp.id, {
        name: formName.trim(),
        nickname: formNickname.trim(),
        employeeId: formEmployeeId.trim(),
        otRate: parseFloat(formOtRate) || DEFAULT_OT_RATE
      });
    }

    setModalMode(null);
  };

  const handleConfirmResign = async () => {
    if (!selectedEmp) return;
    await resignEmployee(selectedEmp.id, resignReason);
    setModalMode(null);
  };

  return (
    <div className="space-y-6 pb-16 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
            <Users className="w-7 h-7 text-blue-600" />
            ข้อมูลพนักงาน (Master)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            จัดการรายชื่อพนักงาน ข้อมูลประจำตัว และอัตราค่า OT รายบุคคล
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setCurrentPage('backupList')}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-semibold transition"
          >
            <Archive className="w-4 h-4 text-slate-500" />
            รายชื่อสำรอง ({backupCount})
          </button>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-semibold shadow-md shadow-blue-500/20 transition hover:scale-[1.02]"
          >
            <UserPlus className="w-4 h-4" />
            เพิ่มพนักงานใหม่
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ, ชื่อเล่น, หรือรหัสพนักงาน..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          พนักงานทำงานทั้งหมด: <b className="text-blue-600 dark:text-blue-400 font-bold">{activeEmployees.length}</b> คน
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4">รหัสพนักงาน</th>
                <th className="px-6 py-4">ชื่อ - นามสกุล</th>
                <th className="px-6 py-4">ชื่อเล่น</th>
                <th className="px-6 py-4 text-right">อัตรา OT (บาท/ชม.)</th>
                <th className="px-6 py-4 text-center">สถานะ</th>
                <th className="px-6 py-4 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-400">
                    ไม่พบข้อมูลพนักงาน
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-750 transition">
                    <td className="px-6 py-4 font-mono font-bold text-slate-700 dark:text-slate-200">
                      {emp.employeeId}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                      {emp.name}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {emp.nickname || '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-semibold text-blue-600 dark:text-blue-400">
                      {(parseFloat(emp.otRate) || DEFAULT_OT_RATE).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        ทำงาน
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(emp)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition"
                          title="แก้ไขข้อมูล"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openResignModal(emp)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition"
                          title="ย้ายไปรายชื่อสำรอง (ลาออก)"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add / Edit Employee */}
      {(modalMode === 'add' || modalMode === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                {modalMode === 'add' ? 'เพิ่มพนักงานใหม่' : 'แก้ไขข้อมูลพนักงาน'}
              </h3>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  รหัสพนักงาน <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น 001"
                  value={formEmployeeId}
                  onChange={(e) => setFormEmployeeId(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  ชื่อ - นามสกุล <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น สมชาย ใจดี"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  ชื่อเล่น
                </label>
                <input
                  type="text"
                  placeholder="เช่น ชาย"
                  value={formNickname}
                  onChange={(e) => setFormNickname(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  อัตราค่า OT (บาท/ชั่วโมง)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="50.00"
                  value={formOtRate}
                  onChange={(e) => setFormOtRate(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  * ค่าเริ่มต้น 50 บาท/ชม. หากแก้ไขจะมีผลคำนวณใหม่ย้อนหลังทั้งหมด
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 text-sm font-medium transition"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-md transition"
              >
                {modalMode === 'add' ? 'บันทึกพนักงาน' : 'บันทึกการแก้ไข'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Resign (ย้ายไปรายชื่อสำรอง) */}
      {modalMode === 'resign' && selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 dark:bg-amber-950 text-amber-600 rounded-2xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  ย้ายไปยังรายชื่อสำรอง
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedEmp.name} ({selectedEmp.employeeId})
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300">
              พนักงานจะถูกย้ายไปยัง <b>"รายชื่อสำรอง"</b> และไม่แสดงในหน้าจัดพนักงานปกติ แต่ประวัติการทำงานและการทำ OT ทั้งหมดจะยังคงเก็บไว้อย่างสมบูรณ์
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                เหตุผล / หมายเหตุ
              </label>
              <select
                value={resignReason}
                onChange={(e) => setResignReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
              >
                <option value="ลาออก">ลาออก</option>
                <option value="ย้ายกะ/หยุดชั่วคราว">ย้ายกะ/หยุดชั่วคราว</option>
                <option value="เลิกจ้าง">เลิกจ้าง</option>
                <option value="อื่นๆ">อื่นๆ</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 text-sm font-medium transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmResign}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold shadow-md transition"
              >
                ยืนยันย้ายไปรายชื่อสำรอง
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
