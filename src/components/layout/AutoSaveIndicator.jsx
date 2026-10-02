// Auto Save Feedback Toast
import React from 'react';
import { Check } from 'lucide-react';
import { useDatabase } from '../../contexts/DatabaseContext';

export default function AutoSaveIndicator() {
  const { autoSaveToast } = useDatabase();

  if (!autoSaveToast) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-emerald-600 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg transition-all animate-bounce">
      <Check className="w-4 h-4" />
      <span>✓ บันทึกแล้ว</span>
    </div>
  );
}
