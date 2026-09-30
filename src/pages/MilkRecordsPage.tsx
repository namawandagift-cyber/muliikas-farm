import React, { useState, useMemo } from 'react';
import { Sale } from '../types';
import {
  formatMoney,
  formatLitres,
  formatDayMonth,
  formatTime12Hour,
  getTodayString,
} from '../utils/formatters';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';

interface MilkRecordsPageProps {
  sales: Sale[];
  onOpenRecordMilk: () => void;
  onOpenRecordPayment: (sale: Sale) => void;
  onDeleteSale: (id: string, name?: string) => Promise<{ success: boolean; error?: string }>;
}

interface DayGroup {
  date: string; // YYYY-MM-DD
  dayLabel: string; // e.g. "26 September"
  isToday: boolean;
  totalLitres: number;
  totalAmount: number;
  totalReceived: number;
  totalOwed: number;
  records: Sale[];
}

export const MilkRecordsPage: React.FC<MilkRecordsPageProps> = ({
  sales,
  onOpenRecordMilk,
  onOpenRecordPayment,
  onDeleteSale,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>(() => {
    // Default today open if present, otherwise first available
    const today = getTodayString();
    return { [today]: true };
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Group and sort sales by date descending
  const dayGroups = useMemo<DayGroup[]>(() => {
    const today = getTodayString();
    const map: Record<string, DayGroup> = {};

    // First filter if search query
    const filtered = sales.filter((s) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchBuyer = s.buyerName.toLowerCase().includes(q);
      const matchDate = s.date.includes(q);
      const matchNotes = (s.notes || '').toLowerCase().includes(q);
      return matchBuyer || matchDate || matchNotes;
    });

    filtered.forEach((s) => {
      const d = s.date;
      if (!map[d]) {
        map[d] = {
          date: d,
          dayLabel: formatDayMonth(d),
          isToday: d === today,
          totalLitres: 0,
          totalAmount: 0,
          totalReceived: 0,
          totalOwed: 0,
          records: [],
        };
      }
      map[d].totalLitres += Number(s.litres) || 0;
      map[d].totalAmount += Number(s.totalAmount) || 0;
      map[d].totalReceived += Number(s.amountReceived) || 0;
      map[d].totalOwed += Number(s.balance) || 0;
      map[d].records.push(s);
    });

    // Sort days descending
    const sortedDays = Object.values(map).sort((a, b) => b.date.localeCompare(a.date));

    // Sort individual records within each day (newest first)
    sortedDays.forEach((group) => {
      group.records.sort((a, b) => {
        const timeA = a.createdAt || a.date;
        const timeB = b.createdAt || b.date;
        return timeB.localeCompare(timeA);
      });
    });

    return sortedDays;
  }, [sales, searchQuery]);

  const toggleDay = (date: string) => {
    setExpandedDates((prev) => ({
      ...prev,
      [date]: !prev[date],
    }));
  };

  const handleDelete = async (id: string, buyerName: string) => {
    if (window.confirm(`Delete milk record for ${buyerName}?`)) {
      setDeletingId(id);
      try {
        await onDeleteSale(id, buyerName);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      {/* 1. Page Header */}
      <div className="pt-1 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#18181b] tracking-tight m-0">
            Milk Records
          </h2>
          <p className="text-xs text-[#64748b] mt-0.5 m-0">
            A record of milk sold from the farm.
          </p>
        </div>

        {/* Primary Action: + Record Milk */}
        <button
          onClick={onOpenRecordMilk}
          className="btn-farm-primary text-xs py-2 px-3.5 shrink-0 font-bold"
        >
          + Record Milk
        </button>
      </div>

      {/* Search Input if needed */}
      {sales.length > 5 && (
        <div className="relative">
          <input
            type="text"
            placeholder="Search records by buyer or note..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-[#e2e8f0] rounded-lg text-[#18181b] focus:outline-none focus:border-[#166534]"
          />
          <Search className="w-3.5 h-3.5 text-[#94a3b8] absolute left-2.5 top-2.5" />
        </div>
      )}

      {/* 2. Daily Record View */}
      {dayGroups.length === 0 ? (
        <div className="clean-card p-10 text-center space-y-2">
          <div className="text-sm font-semibold text-[#18181b]">
            No milk records found
          </div>
          <p className="text-xs text-[#64748b] max-w-xs mx-auto m-0">
            Tap the "+ Record Milk" button above to log your first delivery.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {dayGroups.map((group) => {
            const isExpanded = !!expandedDates[group.date];

            return (
              <div
                key={group.date}
                className="clean-card overflow-hidden transition-all"
              >
                {/* Day Summary Card (Clickable to open detailed records) */}
                <button
                  type="button"
                  onClick={() => toggleDay(group.date)}
                  className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-[#f8fafc] transition-colors focus:outline-none"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-[#18181b] m-0">
                        {group.dayLabel}
                      </h3>
                      {group.isToday && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0]">
                          Today
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-bold text-[#166534] text-sm">
                        {formatLitres(group.totalLitres)}
                      </span>
                      <span className="text-[#94a3b8]">•</span>
                      <span className="font-bold text-[#18181b] num-font text-sm">
                        {formatMoney(group.totalAmount)}
                      </span>
                    </div>

                    <div className="text-xs text-[#64748b]">
                      {group.records.length}{' '}
                      {group.records.length === 1 ? 'milk record' : 'milk records'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[#64748b]">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-[#166534]" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </div>
                </button>

                {/* 3. Daily Detail (When user opens day) */}
                {isExpanded && (
                  <div className="border-t border-[#e2e8f0] bg-[#fafafa] p-4 space-y-3">
                    {/* Top summary box */}
                    <div className="p-3 bg-white rounded-lg border border-[#e2e8f0] flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
                          Milk sold
                        </span>
                        <div className="text-xl font-black text-[#18181b] num-font mt-0.5">
                          {formatLitres(group.totalLitres)}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
                          Total Value
                        </span>
                        <div className="text-lg font-bold text-[#166534] num-font mt-0.5">
                          {formatMoney(group.totalAmount)}
                        </div>
                      </div>
                    </div>

                    {/* Records List for this day */}
                    <div className="space-y-2">
                      {group.records.map((record) => {
                        const timeStr = formatTime12Hour(record.createdAt);

                        return (
                          <div
                            key={record.id}
                            className="bg-white p-3 rounded-lg border border-[#e2e8f0] space-y-2 hover:border-[#cbd5e1] transition-colors"
                          >
                            {/* Mobile stacked row & Desktop flexible row */}
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="font-bold text-sm text-[#18181b]">
                                  {record.buyerName}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-[#64748b] mt-0.5">
                                  {timeStr && (
                                    <span className="font-medium text-[#475569]">
                                      {timeStr}
                                    </span>
                                  )}
                                  {timeStr && <span>•</span>}
                                  <span className="font-bold text-[#166534]">
                                    {formatLitres(record.litres)}
                                  </span>
                                  <span>@</span>
                                  <span>{formatMoney(record.pricePerLitre)}/L</span>
                                </div>
                                {record.notes && (
                                  <div className="text-[11px] text-[#94a3b8] mt-0.5">
                                    {record.notes}
                                  </div>
                                )}
                              </div>

                              <div className="text-right shrink-0">
                                <div className="font-bold text-sm text-[#18181b] num-font">
                                  {formatMoney(record.totalAmount)}
                                </div>
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded font-medium border inline-block mt-0.5 ${
                                    record.paymentStatus === 'Paid'
                                      ? 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]'
                                      : record.paymentStatus === 'Partly Paid'
                                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                                      : 'bg-red-50 text-red-700 border-red-200'
                                  }`}
                                >
                                  {record.paymentStatus}
                                </span>
                              </div>
                            </div>

                            {/* Secondary actions & balance line */}
                            <div className="flex items-center justify-between pt-1.5 border-t border-[#f1f5f9] text-xs">
                              <span className="text-[11px] text-[#94a3b8]">
                                Received: {formatMoney(record.amountReceived)}
                                {record.balance > 0 && (
                                  <span className="text-amber-800 font-medium ml-1">
                                    • Owed: {formatMoney(record.balance)}
                                  </span>
                                )}
                              </span>

                              <div className="flex items-center gap-2">
                                {record.balance > 0 && (
                                  <button
                                    onClick={() => onOpenRecordPayment(record)}
                                    className="px-2.5 py-0.5 text-[11px] font-semibold bg-[#f0fdf4] text-[#166534] hover:bg-[#dcfce7] rounded border border-[#bbf7d0] transition-colors"
                                  >
                                    Receive
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDelete(record.id, record.buyerName)}
                                  disabled={deletingId === record.id}
                                  className="text-xs text-[#94a3b8] hover:text-red-700 p-0.5 transition-colors"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
