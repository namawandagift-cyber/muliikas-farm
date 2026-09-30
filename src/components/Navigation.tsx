import React from 'react';
import { Calendar, BookOpen, CalendarDays, Receipt, Users, MoreHorizontal } from 'lucide-react';

export type NavTab = 'today' | 'milk' | 'week' | 'expenses' | 'buyers' | 'more';

interface NavigationProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
}) => {
  const navItems: { tab: NavTab; label: string; icon: React.ReactNode }[] = [
    { tab: 'today', label: 'Today', icon: <Calendar className="w-4 h-4" /> },
    { tab: 'milk', label: 'Milk', icon: <BookOpen className="w-4 h-4" /> },
    { tab: 'week', label: 'Week', icon: <CalendarDays className="w-4 h-4" /> },
    { tab: 'expenses', label: 'Expenses', icon: <Receipt className="w-4 h-4" /> },
    { tab: 'buyers', label: 'Buyers', icon: <Users className="w-4 h-4" /> },
    { tab: 'more', label: 'More', icon: <MoreHorizontal className="w-4 h-4" /> },
  ];

  return (
    <>
      {/* Desktop Navigation Bar */}
      <div className="hidden md:block bg-white border-b border-[#e2e8f0]">
        <div className="max-w-2xl mx-auto px-4 flex items-center justify-center">
          <nav className="flex space-x-1.5 py-2" aria-label="Main Navigation">
            {navItems.map((item) => {
              const isActive = currentTab === item.tab;
              return (
                <button
                  key={item.tab}
                  onClick={() => onTabChange(item.tab)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    isActive
                      ? 'bg-[#166534] text-white'
                      : 'text-[#64748b] hover:text-[#166534] hover:bg-[#f0fdf4]'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (6 clean tabs) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#e2e8f0] z-40 px-1 py-1 shadow-xs"
        aria-label="Mobile Navigation"
      >
        <div className="grid grid-cols-6 gap-0.5 max-w-md mx-auto">
          {navItems.map((item) => {
            const isActive = currentTab === item.tab;
            return (
              <button
                key={item.tab}
                onClick={() => onTabChange(item.tab)}
                className={`flex flex-col items-center justify-center py-1 px-0.5 min-h-[46px] rounded-lg transition-colors ${
                  isActive
                    ? 'text-[#166534] font-bold'
                    : 'text-[#64748b] font-medium hover:text-[#18181b]'
                }`}
              >
                <div className={`${isActive ? 'text-[#166534]' : 'text-[#64748b]'}`}>
                  {item.icon}
                </div>
                <span className="text-[10px] mt-0.5 truncate">{item.label}</span>
                {isActive && (
                  <span className="w-1 h-1 bg-[#166534] rounded-full mt-0.5"></span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
