import React, { useState } from 'react';
import { Sale, AppUser } from '../types';
import {
  formatLitres,
  getTimeGreeting,
  getTodayFormatted,
  getTodayString,
  formatTime12Hour,
} from '../utils/formatters';
import { LogOut, Trash2 } from 'lucide-react';

interface HerdsmanPageProps {
  sales: Sale[];
  currentUser: AppUser;
  onOpenRecordMilk: () => void;
  onLogout: () => void;
  onDeleteRecord?: (id: string, buyerName?: string) => Promise<{ success: boolean; error?: string }>;
}

export const HerdsmanPage: React.FC<HerdsmanPageProps> = ({
  sales,
  currentUser,
  onOpenRecordMilk,
  onLogout,
  onDeleteRecord,
}) => {
  const greeting = getTimeGreeting();
  const todayFormatted = getTodayFormatted();
  const todayStr = getTodayString();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter only today's milk entries
  const todaySales = sales.filter((s) => s.date === todayStr);

  // Total litres recorded today
  const totalLitres = todaySales.reduce((acc, s) => acc + (Number(s.litres) || 0), 0);

  // First name
  const firstName = currentUser.name.split(' ')[0] || 'Herdsman';

  const handleDelete = async (id: string, buyerName: string) => {
    if (!onDeleteRecord) return;
    if (window.confirm(`Delete milk record for ${buyerName}?`)) {
      setDeletingId(id);
      try {
        await onDeleteRecord(id, buyerName);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      {/* 1. Time-Based Greeting, Herdsman Badge & Real Log Out */}
      <div className="pt-1 flex items-start justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#18181b] tracking-tight m-0">
            {greeting}, {firstName}
          </h2>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[#64748b]">
            <span className="font-semibold text-[#166534]">Today</span>
            <span>•</span>
            <span>{todayFormatted}</span>
          </div>
        </div>

        <div className="text-right flex flex-col items-end gap-1">
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0] inline-block">
            Herdsman
          </span>
          <button
            onClick={onLogout}
            className="flex items-center gap-1 text-[11px] font-semibold text-[#64748b] hover:text-red-700 transition-colors pt-0.5"
            title="Log out of DairyPulse"
          >
            <LogOut className="w-3 h-3" />
            <span>Log out</span>
          </button>
        </div>
      </div>

      {/* 2. Milk Litres Summary Card (No financial numbers!) */}
      <div className="clean-card p-5 space-y-1">
        <div className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
          Today's Milk Logged
        </div>
        <div className="text-4xl md:text-5xl font-black text-[#166534] num-font tracking-tight">
          {formatLitres(totalLitres)}
        </div>
        <div className="text-xs text-[#64748b] pt-1 font-medium">
          {todaySales.length === 0
            ? 'No milk recorded yet today'
            : todaySales.length === 1
            ? '1 milk delivery logged today'
            : `${todaySales.length} milk deliveries logged today`}
        </div>
      </div>

      {/* 3. Prominent Primary Action: + Record Milk */}
      <div>
        <button
          onClick={onOpenRecordMilk}
          className="w-full btn-farm-primary py-4 px-5 flex items-center justify-center gap-2 text-base md:text-lg font-bold shadow-xs hover:bg-[#14532d] transition-colors"
        >
          <span>+ Record Milk</span>
        </button>
      </div>

      {/* 4. Today's Logged Deliveries */}
      <div className="pt-2 space-y-2.5">
        <div className="flex items-center justify-between px-0.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748b] m-0">
            Today's entries
          </h3>
          <span className="text-xs text-[#64748b]">
            {todaySales.length} {todaySales.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        {todaySales.length === 0 ? (
          <div className="clean-card p-8 text-center space-y-2">
            <div className="text-sm font-semibold text-[#18181b]">
              No milk recorded yet today
            </div>
            <p className="text-xs text-[#64748b] max-w-xs mx-auto m-0">
              Tap the green "+ Record Milk" button above as soon as milking is finished and collected.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {todaySales.map((item) => {
              const timeStr = formatTime12Hour(item.createdAt);

              return (
                <div
                  key={item.id}
                  className="clean-card p-3.5 flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#18181b]">
                        {item.buyerName}
                      </span>
                      {timeStr && (
                        <span className="text-[11px] text-[#64748b] font-medium">
                          {timeStr}
                        </span>
                      )}
                    </div>
                    {item.notes && (
                      <div className="text-xs text-[#64748b]">
                        {item.notes}
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0 flex items-center gap-3">
                    <div className="space-y-1">
                      <div className="font-bold text-base text-[#166534] num-font">
                        {formatLitres(item.litres)}
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0] inline-block">
                        Recorded
                      </span>
                    </div>

                    {onDeleteRecord && (
                      <button
                        onClick={() => handleDelete(item.id, item.buyerName)}
                        disabled={deletingId === item.id}
                        className="text-[#94a3b8] hover:text-red-700 p-1 transition-colors"
                        title="Delete this record"
                        aria-label="Delete this record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
