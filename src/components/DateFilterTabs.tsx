import React from 'react';
import { DateFilter, DateFilterOption } from '../types';
import { getTodayString } from '../utils/formatters';

interface DateFilterTabsProps {
  filter: DateFilter;
  onChange: (filter: DateFilter) => void;
}

export const DateFilterTabs: React.FC<DateFilterTabsProps> = ({ filter, onChange }) => {
  const tabs: { key: DateFilterOption; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'custom', label: 'Custom' },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 bg-[#F4EFEA] p-1 rounded-xl border border-[#E6DFD5] overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const isActive = filter.type === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                if (tab.key === 'custom') {
                  onChange({
                    type: 'custom',
                    startDate: filter.startDate || getTodayString(),
                    endDate: filter.endDate || getTodayString(),
                  });
                } else {
                  onChange({ type: tab.key });
                }
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs md:text-sm font-semibold transition-all whitespace-nowrap text-center ${
                isActive
                  ? 'bg-white text-[#1B4332] shadow-xs border border-[#E6DFD5]'
                  : 'text-[#5E6C64] hover:text-[#1B4332] hover:bg-[#EAE4DD]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {filter.type === 'custom' && (
        <div className="flex flex-wrap items-center gap-2 p-2.5 bg-white rounded-xl border border-[#E6DFD5] text-xs">
          <div className="flex items-center gap-1.5 flex-1 min-w-[130px]">
            <span className="text-[#5E6C64] font-medium">From:</span>
            <input
              type="date"
              value={filter.startDate || ''}
              onChange={(e) =>
                onChange({
                  ...filter,
                  startDate: e.target.value,
                })
              }
              className="flex-1 px-2 py-1 border border-[#E6DFD5] rounded-md text-xs font-medium text-[#202B25] bg-[#FAF7F2] focus:outline-none focus:border-[#1B4332]"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-1 min-w-[130px]">
            <span className="text-[#5E6C64] font-medium">To:</span>
            <input
              type="date"
              value={filter.endDate || ''}
              onChange={(e) =>
                onChange({
                  ...filter,
                  endDate: e.target.value,
                })
              }
              className="flex-1 px-2 py-1 border border-[#E6DFD5] rounded-md text-xs font-medium text-[#202B25] bg-[#FAF7F2] focus:outline-none focus:border-[#1B4332]"
            />
          </div>
        </div>
      )}
    </div>
  );
};
