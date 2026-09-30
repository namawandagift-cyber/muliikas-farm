import React, { useState, useMemo } from 'react';
import { Expense, ExpenseCategory } from '../types';
import { formatMoney, formatDisplayDate, isDateInFilter, getTodayString } from '../utils/formatters';

interface ExpensesPageProps {
  expenses: Expense[];
  onOpenAddExpense: () => void;
  onDeleteExpense: (id: string) => Promise<{ success: boolean; error?: string }>;
}

export const ExpensesPage: React.FC<ExpensesPageProps> = ({
  expenses,
  onOpenAddExpense,
  onDeleteExpense,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const todayStr = getTodayString();

  // Metrics required by Section 3:
  // - Money Spent Today
  // - Money Spent This Week
  // - Money Spent This Month
  const metrics = useMemo(() => {
    let spentToday = 0;
    let spentThisWeek = 0;
    let spentThisMonth = 0;

    expenses.forEach((e) => {
      const amt = Number(e.amount) || 0;
      if (e.date === todayStr) {
        spentToday += amt;
      }
      if (isDateInFilter(e.date, { type: 'week' })) {
        spentThisWeek += amt;
      }
      if (isDateInFilter(e.date, { type: 'month' })) {
        spentThisMonth += amt;
      }
    });

    // Filtered expenses list
    const filtered = expenses.filter((e) => {
      if (selectedCategory === 'All') return true;
      return e.category === selectedCategory;
    });

    return { spentToday, spentThisWeek, spentThisMonth, filteredList: filtered };
  }, [expenses, todayStr, selectedCategory]);

  const handleDelete = async (id: string, desc: string) => {
    if (window.confirm(`Delete expense "${desc}"?`)) {
      setDeletingId(id);
      try {
        await onDeleteExpense(id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const categories: ExpenseCategory[] = [
    'Feed',
    'Transport',
    'Medicine',
    'Labour',
    'Fuel',
    'Repairs',
    'Other',
  ];

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      {/* Page Heading & Action */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-2xl font-bold text-[#18181b] tracking-tight m-0">
            Expenses
          </h2>
          <p className="text-xs text-[#64748b] mt-0.5 m-0">
            Keep track of what was spent on the farm
          </p>
        </div>
        <button
          onClick={onOpenAddExpense}
          className="btn-farm-primary text-xs md:text-sm py-2 px-3.5 flex items-center gap-1.5"
        >
          <span>+ Record Expense</span>
        </button>
      </div>

      {/* 3 Metrics Cards: Money Spent Today, This Week, This Month */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="clean-card p-3">
          <div className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider">
            Today
          </div>
          <div className="text-lg md:text-xl font-bold text-[#18181b] mt-1 num-font">
            {formatMoney(metrics.spentToday)}
          </div>
          <div className="text-[10px] text-[#94a3b8] mt-0.5">Spent today</div>
        </div>

        <div className="clean-card p-3">
          <div className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider">
            This Week
          </div>
          <div className="text-lg md:text-xl font-bold text-[#18181b] mt-1 num-font">
            {formatMoney(metrics.spentThisWeek)}
          </div>
          <div className="text-[10px] text-[#94a3b8] mt-0.5">Mon – Sun</div>
        </div>

        <div className="clean-card p-3">
          <div className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider">
            This Month
          </div>
          <div className="text-lg md:text-xl font-bold text-[#18181b] mt-1 num-font">
            {formatMoney(metrics.spentThisMonth)}
          </div>
          <div className="text-[10px] text-[#94a3b8] mt-0.5">Current month</div>
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedCategory('All')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border ${
            selectedCategory === 'All'
              ? 'bg-[#166534] text-white border-[#166534]'
              : 'bg-white text-[#64748b] border-[#e2e8f0] hover:text-[#18181b]'
          }`}
        >
          All Categories
        </button>
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border ${
                isSelected
                  ? 'bg-[#166534] text-white border-[#166534]'
                  : 'bg-white text-[#64748b] border-[#e2e8f0] hover:text-[#18181b]'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Expense List */}
      <div className="space-y-2">
        {metrics.filteredList.length === 0 ? (
          <div className="clean-card py-10 px-4 text-center space-y-2">
            <div className="text-sm font-semibold text-[#18181b]">
              No expenses recorded
            </div>
            <p className="text-xs text-[#64748b] max-w-xs mx-auto m-0">
              Record costs like cattle feed, veterinary medicines, fuel, or labour.
            </p>
            <button
              onClick={onOpenAddExpense}
              className="btn-farm-primary text-xs py-2 px-3 inline-block mt-2"
            >
              + Record First Expense
            </button>
          </div>
        ) : (
          metrics.filteredList.map((exp) => (
            <div
              key={exp.id}
              className="clean-card p-3.5 space-y-2 hover:border-[#cbd5e1] transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] px-2 py-0.5 rounded font-medium bg-[#f8fafc] text-[#475569] border border-[#e2e8f0]">
                      {exp.category}
                    </span>
                    <span className="font-semibold text-sm text-[#18181b]">
                      {exp.description}
                    </span>
                  </div>
                  <div className="text-xs text-[#64748b]">
                    {formatDisplayDate(exp.date)}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-bold text-base text-[#18181b] num-font">
                    {formatMoney(exp.amount)}
                  </div>
                </div>
              </div>

              {/* Notes if provided */}
              {exp.notes && (
                <div className="text-xs text-[#64748b] bg-[#f8fafc] px-2.5 py-1.5 rounded border border-[#f1f5f9]">
                  {exp.notes}
                </div>
              )}

              {/* Action row */}
              <div className="flex justify-end pt-1 border-t border-[#f1f5f9]">
                <button
                  onClick={() => handleDelete(exp.id, exp.description)}
                  disabled={deletingId === exp.id}
                  className="text-xs text-[#94a3b8] hover:text-red-700 transition-colors p-1"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
