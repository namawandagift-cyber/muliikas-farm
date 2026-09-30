import React, { useState, useRef, useEffect } from 'react';
import { RotateCw, User as UserIcon, LogOut } from 'lucide-react';
import { AppUser } from '../types';

interface HeaderProps {
  currentUser: AppUser;
  onLogout: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  onRefresh,
  isRefreshing = false,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isOwner = currentUser.role === 'owner';
  const shortName = currentUser.name.split(' ')[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  return (
    <header className="bg-white border-b border-[#e2e8f0] sticky top-0 z-30">
      <div className="max-w-2xl mx-auto px-4 py-2.5 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#166534] text-white flex items-center justify-center font-bold text-xs tracking-wider">
            DP
          </div>
          <div>
            <h1 className="text-base font-bold text-[#18181b] tracking-tight m-0 leading-tight">
              DairyPulse
            </h1>
          </div>
        </div>

        {/* Right actions: Refresh + Authenticated User Profile & Logout */}
        <div className="flex items-center gap-2">
          {/* Silent Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh farm records"
            className="p-1.5 text-[#64748b] hover:text-[#166534] hover:bg-[#f0fdf4] rounded-md transition-colors"
            aria-label="Refresh farm records"
          >
            <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#166534]' : ''}`} />
          </button>

          {/* Active User Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold text-[#18181b] hover:bg-[#f0fdf4] border border-[#e2e8f0] transition-colors"
              title="Farm Account"
              aria-expanded={isMenuOpen}
            >
              <UserIcon className="w-3.5 h-3.5 text-[#166534]" />
              <span className="hidden sm:inline">{shortName}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                  isOwner
                    ? 'bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0]'
                    : 'bg-[#f1f5f9] text-[#475569]'
                }`}
              >
                {isOwner ? 'Owner' : 'Herdsman'}
              </span>
            </button>

            {/* Profile Dropdown */}
            {isMenuOpen && (
              <div className="absolute right-0 mt-1 w-52 bg-white rounded-lg border border-[#e2e8f0] shadow-lg py-1.5 z-50 text-xs">
                <div className="px-3 py-2 border-b border-[#f1f5f9]">
                  <div className="font-bold text-[#18181b] truncate">{currentUser.name}</div>
                  <div className="text-[11px] text-[#64748b]">@{currentUser.username}</div>
                  <div className="text-[10px] text-[#166534] font-semibold mt-0.5">{currentUser.title}</div>
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full px-3 py-2 text-left text-red-700 hover:bg-red-50 flex items-center gap-2 font-medium transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
