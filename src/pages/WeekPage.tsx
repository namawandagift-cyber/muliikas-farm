import React, { useMemo } from 'react';
import { Sale } from '../types';
import {
  formatMoney,
  formatLitres,
  getCurrentWeekDays,
  isDateInFilter,
} from '../utils/formatters';

interface DaySummary {
  dateStr: string;
  dayName: string;
  displayDate: string;
  isToday: boolean;
  litres: number;
  received: number;
  totalSales: number;
  owed: number;
  recordCount: number;
}

interface WeekPageProps {
  sales: Sale[];
  onOpenRecordPayment: (sale: Sale) => void;
}

export const WeekPage: React.FC<WeekPageProps> = ({ sales, onOpenRecordPayment }) => {
  const weekDays = useMemo(() => getCurrentWeekDays(), []);

  // Filter sales for this week (Monday to Sunday)
  const weekSales = useMemo(() => {
    return sales.filter((s) => isDateInFilter(s.date, { type: 'week' }));
  }, [sales]);

  // Overall Week Metrics
  const { totalLitres, totalReceived, totalOwed } = useMemo(() => {
    let litres = 0;
    let received = 0;
    let owed = 0;

    weekSales.forEach((s) => {
      litres += Number(s.litres) || 0;
      received += Number(s.amountReceived) || 0;
      owed += Number(s.balance) || 0;
    });

    return { totalLitres: litres, totalReceived: received, totalOwed: owed };
  }, [weekSales]);

  // Daily breakdown array (Monday to Sunday)
  const dailyBreakdown = useMemo<DaySummary[]>(() => {
    return weekDays.map((day) => {
      const dayRecords = weekSales.filter((s) => s.date === day.dateStr);
      let dayLitres = 0;
      let dayReceived = 0;
      let dayTotalSales = 0;
      let dayOwed = 0;

      dayRecords.forEach((s) => {
        dayLitres += Number(s.litres) || 0;
        dayReceived += Number(s.amountReceived) || 0;
        dayTotalSales += Number(s.totalAmount) || 0;
        dayOwed += Number(s.balance) || 0;
      });

      return {
        ...day,
        litres: dayLitres,
        received: dayReceived,
        totalSales: dayTotalSales,
        owed: dayOwed,
        recordCount: dayRecords.length,
      };
    });
  }, [weekDays, weekSales]);

  // Find the best/highest milk day of the week
  const bestDay = useMemo<DaySummary | null>(() => {
    let maxLitres = 0;
    let best: DaySummary | null = null;
    dailyBreakdown.forEach((d) => {
      if (d.litres > maxLitres) {
        maxLitres = d.litres;
        best = d;
      }
    });
    return best;
  }, [dailyBreakdown]);

  // Top buyers of the week
  const topBuyers = useMemo(() => {
    const map: Record<string, { name: string; litres: number; received: number; owed: number }> = {};
    weekSales.forEach((s) => {
      const name = s.buyerName || 'Walk-in Customer';
      if (!map[name]) {
        map[name] = { name, litres: 0, received: 0, owed: 0 };
      }
      map[name].litres += Number(s.litres) || 0;
      map[name].received += Number(s.amountReceived) || 0;
      map[name].owed += Number(s.balance) || 0;
    });
    return Object.values(map).sort((a, b) => b.litres - a.litres);
  }, [weekSales]);

  // Outstanding unpaid sales from this week
  const unpaidWeekSales = useMemo(() => {
    return weekSales.filter((s) => Number(s.balance) > 0);
  }, [weekSales]);

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      {/* 1. Top Header */}
      <div className="pt-1">
        <h2 className="text-2xl font-bold text-[#18181b] tracking-tight m-0">
          This Week
        </h2>
        <p className="text-xs text-[#64748b] mt-0.5 m-0">
          Weekly milk summary · Monday {weekDays[0]?.displayDate} to Sunday {weekDays[6]?.displayDate}
        </p>
      </div>

      {/* 2. Key Weekly Figures */}
      <div className="grid grid-cols-2 gap-3">
        {/* Milk sold */}
        <div className="clean-card p-4 md:p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#64748b] mb-1">
              Milk Sold
            </div>
            <div className="text-3xl md:text-4xl font-black text-[#18181b] num-font tracking-tight mt-1">
              {formatLitres(totalLitres)}
            </div>
          </div>
          <div className="text-xs text-[#64748b] mt-3 font-medium">
            {bestDay && bestDay.litres > 0 ? (
              <span>Best day: {bestDay.dayName} ({formatLitres(bestDay.litres)})</span>
            ) : (
              <span>Total this week</span>
            )}
          </div>
        </div>

        {/* Money received */}
        <div className="clean-card p-4 md:p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#64748b] mb-1">
              Money Received
            </div>
            <div className="text-2xl md:text-3xl font-black text-[#166534] num-font tracking-tight mt-1">
              {formatMoney(totalReceived)}
            </div>
          </div>
          <div className="text-xs mt-3 font-medium">
            {totalOwed > 0 ? (
              <span className="text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Owed: {formatMoney(totalOwed)}
              </span>
            ) : (
              <span className="text-[#166534]">Full cash collected</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Daily Breakdown Table */}
      <div className="clean-card p-4 space-y-2.5">
        <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748b] m-0">
            Daily Breakdown
          </h3>
          <span className="text-xs text-[#64748b]">Mon – Sun</span>
        </div>

        <div className="divide-y divide-[#f1f5f9]">
          {dailyBreakdown.map((day) => {
            const hasData = day.litres > 0;
            return (
              <div
                key={day.dayName}
                className={`py-2.5 flex items-center justify-between text-sm ${
                  day.isToday ? 'bg-[#f0fdf4] -mx-2 px-2 rounded-md font-semibold' : ''
                }`}
              >
                {/* Day name & date */}
                <div className="w-1/3">
                  <div className={`text-sm ${day.isToday ? 'text-[#166534] font-bold' : 'text-[#18181b] font-medium'}`}>
                    {day.dayName}
                  </div>
                  <div className="text-[10px] text-[#94a3b8]">
                    {day.displayDate} {day.isToday && '• Today'}
                  </div>
                </div>

                {/* Litres */}
                <div className="w-1/3 text-center">
                  {hasData ? (
                    <span className="font-bold text-[#18181b] num-font">
                      {formatLitres(day.litres)}
                    </span>
                  ) : (
                    <span className="text-[#94a3b8] text-xs">—</span>
                  )}
                </div>

                {/* Money */}
                <div className="w-1/3 text-right">
                  {hasData ? (
                    <div>
                      <div className="font-bold text-[#166534] num-font">
                        {formatMoney(day.received)}
                      </div>
                      {day.owed > 0 && (
                        <div className="text-[10px] text-amber-800 font-semibold">
                          Owed: {formatMoney(day.owed)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-[#94a3b8] text-xs">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Subtle Human Summary */}
      <div className="p-3.5 bg-[#f0fdf4] rounded-xl border border-[#bbf7d0]">
        <p className="text-xs md:text-sm font-medium text-[#14532d] m-0 leading-relaxed">
          {totalLitres > 0
            ? `This week you sold ${Number.isInteger(totalLitres) ? totalLitres : totalLitres.toFixed(1)} litres and received ${formatMoney(totalReceived)}.`
            : 'No milk recorded this week yet.'}
        </p>
      </div>

      {/* 5. Top buyers this week */}
      {topBuyers.length > 0 && (
        <div className="clean-card p-4 space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748b] m-0">
            Who bought milk this week
          </h3>
          <div className="space-y-1.5">
            {topBuyers.slice(0, 5).map((buyer) => (
              <div
                key={buyer.name}
                className="p-2.5 bg-[#f8fafc] rounded-lg border border-[#f1f5f9] flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-semibold text-[#18181b]">{buyer.name}</div>
                  <div className="text-[#64748b] mt-0.5">{formatLitres(buyer.litres)}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[#166534] num-font">{formatMoney(buyer.received)}</div>
                  {buyer.owed > 0 && (
                    <div className="text-[10px] text-amber-800 font-semibold">
                      Owes: {formatMoney(buyer.owed)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Unpaid balances from this week */}
      {unpaidWeekSales.length > 0 && (
        <div className="clean-card p-4 border-amber-200 bg-amber-50/50 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-amber-900 m-0">
              Unpaid balances from this week
            </h3>
            <span className="text-sm font-bold text-amber-900 num-font">
              {formatMoney(totalOwed)}
            </span>
          </div>

          <div className="space-y-1.5">
            {unpaidWeekSales.map((s) => (
              <div
                key={s.id}
                className="p-2 bg-white rounded border border-amber-200 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-[#18181b]">{s.buyerName}</span>
                  <span className="text-[#64748b] ml-2">
                    {s.litres} L · Owes {formatMoney(s.balance)}
                  </span>
                </div>
                <button
                  onClick={() => onOpenRecordPayment(s)}
                  className="px-2.5 py-1 text-xs font-semibold bg-[#f0fdf4] text-[#166534] hover:bg-[#dcfce7] rounded border border-[#bbf7d0] transition-colors"
                >
                  Receive
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
