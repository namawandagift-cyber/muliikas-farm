import React from 'react';
import { Sale } from '../types';
import {
  formatMoney,
  formatLitres,
  getTimeGreeting,
  getTodayFormatted,
  getTodayString,
  formatTimeFromDate,
  generateTodayMilkSummary,
} from '../utils/formatters';

interface TodayPageProps {
  sales: Sale[];
  onOpenRecordMilk: () => void;
  onOpenRecordPayment: (sale: Sale) => void;
  onDeleteRecord: (id: string, buyerName: string) => Promise<{ success: boolean; error?: string }>;
}

export const TodayPage: React.FC<TodayPageProps> = ({
  sales,
  onOpenRecordMilk,
  onOpenRecordPayment,
  onDeleteRecord,
}) => {
  const greeting = getTimeGreeting();
  const todayFormatted = getTodayFormatted();
  const todayStr = getTodayString();

  // Filter only today's milk records
  const todaySales = sales.filter((s) => s.date === todayStr);

  // Today's totals
  let totalLitres = 0;
  let totalReceived = 0;
  let totalOwed = 0;

  todaySales.forEach((s) => {
    totalLitres += Number(s.litres) || 0;
    totalReceived += Number(s.amountReceived) || 0;
    totalOwed += Number(s.balance) || 0;
  });

  const humanSummary = generateTodayMilkSummary(
    todaySales.length,
    totalLitres,
    totalReceived,
    totalOwed
  );

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      {/* 1. Time-Based Greeting & Date */}
      <div className="pt-1 flex items-center justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#18181b] tracking-tight m-0">
            {greeting}
          </h2>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[#64748b]">
            <span className="font-semibold text-[#166534]">Today</span>
            <span>•</span>
            <span>{todayFormatted}</span>
          </div>
        </div>

        {todaySales.length > 0 && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0]">
            {todaySales.length} {todaySales.length === 1 ? 'batch' : 'batches'}
          </span>
        )}
      </div>

      {/* 2. Large, Clear Stats: 'Milk Sold' and 'Money Received' (Visually Prioritized) */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        {/* 'Milk Sold' */}
        <div className="clean-card p-4 md:p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#64748b] mb-1">
              Milk Sold
            </div>
            <div className="text-4xl md:text-5xl font-black text-[#18181b] num-font tracking-tight mt-1">
              {formatLitres(totalLitres)}
            </div>
          </div>
          <div className="text-xs text-[#64748b] mt-3 font-medium">
            {todaySales.length === 0
              ? 'No milk logged yet'
              : todaySales.length === 1
              ? '1 delivery today'
              : `${todaySales.length} deliveries today`}
          </div>
        </div>

        {/* 'Money Received' */}
        <div className="clean-card p-4 md:p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#64748b] mb-1">
              Money Received
            </div>
            <div className="text-3xl md:text-4xl font-black text-[#166534] num-font tracking-tight mt-1">
              {formatMoney(totalReceived)}
            </div>
          </div>
          <div className="text-xs mt-3 font-medium">
            {totalOwed > 0 ? (
              <span className="text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Owed: {formatMoney(totalOwed)}
              </span>
            ) : totalReceived > 0 ? (
              <span className="text-[#166534]">Full cash collected</span>
            ) : (
              <span className="text-[#64748b]">UGX 0 collected</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Subtle Human Summary Note */}
      <div className="p-3.5 bg-[#f0fdf4] rounded-xl border border-[#bbf7d0]">
        <p className="text-xs md:text-sm font-medium text-[#14532d] m-0 leading-relaxed">
          {humanSummary}
        </p>
      </div>

      {/* 4. Primary Action: + Record Milk */}
      <div>
        <button
          onClick={onOpenRecordMilk}
          className="w-full btn-farm-primary py-3.5 px-5 flex items-center justify-center gap-2 text-base font-bold shadow-xs hover:bg-[#14532d] transition-colors"
        >
          <span>+ Record Milk</span>
        </button>
      </div>

      {/* 5. Today's Activity: "Today's milk" */}
      <div className="pt-2 space-y-2.5">
        <div className="flex items-center justify-between px-0.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748b] m-0">
            Today's milk
          </h3>
          <span className="text-xs text-[#64748b]">
            {todaySales.length} {todaySales.length === 1 ? 'record' : 'records'}
          </span>
        </div>

        {todaySales.length === 0 ? (
          <div className="clean-card p-8 text-center space-y-2">
            <div className="text-sm font-semibold text-[#18181b]">
              No milk recorded yet today
            </div>
            <p className="text-xs text-[#64748b] max-w-xs mx-auto m-0">
              Tap the green "+ Record Milk" button above to log your morning or evening milk.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {todaySales.map((item) => {
              const timeStr = formatTimeFromDate(item.createdAt);
              return (
                <div
                  key={item.id}
                  className="clean-card p-3.5 flex items-center justify-between gap-3 hover:border-[#cbd5e1] transition-colors"
                >
                  {/* Left: Time & Buyer info */}
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#18181b]">
                        {item.buyerName}
                      </span>
                      {timeStr && (
                        <span className="text-[11px] text-[#94a3b8] font-mono">
                          {timeStr}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#64748b]">
                      <span className="font-semibold text-[#166534]">
                        {item.litres} L
                      </span>{' '}
                      @ {formatMoney(item.pricePerLitre)}/L
                    </div>
                    {item.notes && (
                      <div className="text-[11px] text-[#94a3b8]">
                        {item.notes}
                      </div>
                    )}
                  </div>

                  {/* Right: Total Amount, Status, and Actions */}
                  <div className="text-right shrink-0 space-y-1">
                    <div className="font-bold text-sm md:text-base text-[#18181b] num-font">
                      {formatMoney(item.totalAmount)}
                    </div>

                    <div className="flex items-center justify-end gap-1.5">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-medium border ${
                          item.paymentStatus === 'Paid'
                            ? 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]'
                            : item.paymentStatus === 'Partly Paid'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        {item.paymentStatus}
                      </span>

                      {item.balance > 0 && (
                        <button
                          onClick={() => onOpenRecordPayment(item)}
                          className="px-2 py-0.5 text-[11px] font-semibold bg-[#f0fdf4] text-[#166534] hover:bg-[#dcfce7] rounded border border-[#bbf7d0] transition-colors"
                        >
                          Receive
                        </button>
                      )}

                      <button
                        onClick={() => onDeleteRecord(item.id, item.buyerName)}
                        title="Delete record"
                        className="text-xs text-[#94a3b8] hover:text-red-700 p-1 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
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
