import React, { useState, useMemo } from 'react';
import { Sale, AppUser, UpdateUserData } from '../types';
import { formatMoney, formatDisplayDate } from '../utils/formatters';
import { Users, LogOut, ShieldAlert, KeyRound, Check, X } from 'lucide-react';
import { Modal } from '../components/Modal';

interface MorePageProps {
  sales: Sale[];
  currentUser: AppUser;
  users: AppUser[];
  onOpenAddUser: () => void;
  onUpdateUser: (data: UpdateUserData) => Promise<{ success: boolean; error?: string }>;
  onLogout: () => void;
  onOpenRecordMilk: () => void;
  onOpenRecordPayment: (sale: Sale) => void;
  onNavigateToRecords: () => void;
}

type MoreSubTab = 'users' | 'debtors';

export const MorePage: React.FC<MorePageProps> = ({
  sales,
  currentUser,
  users,
  onOpenAddUser,
  onUpdateUser,
  onLogout,
  onOpenRecordPayment,
  onNavigateToRecords,
}) => {
  const [activeTab, setActiveTab] = useState<MoreSubTab>('users');
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [resetModalUser, setResetModalUser] = useState<AppUser | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('Farm@2026');
  const [isResetting, setIsResetting] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Debtors calculation (buyers with an outstanding balance)
  const debtors = useMemo(() => {
    const map: Record<string, { buyerId: string; buyerName: string; owed: number; sales: Sale[] }> = {};
    sales.forEach((s) => {
      const bal = Number(s.balance) || 0;
      if (bal > 0) {
        const key = s.buyerId || s.buyerName;
        if (!map[key]) {
          map[key] = {
            buyerId: s.buyerId,
            buyerName: s.buyerName,
            owed: 0,
            sales: [],
          };
        }
        map[key].owed += bal;
        map[key].sales.push(s);
      }
    });
    return Object.values(map).sort((a, b) => b.owed - a.owed);
  }, [sales]);

  const totalOwedAllTime = debtors.reduce((acc, d) => acc + d.owed, 0);

  const handleToggleActive = async (user: AppUser) => {
    const newActive = !user.active;
    setBusyUserId(user.id);
    try {
      const res = await onUpdateUser({
        id: user.id,
        active: newActive,
      });
      if (res.success) {
        setFeedback({
          text: `${user.name} is now ${newActive ? 'active' : 'deactivated'}.`,
          type: 'success',
        });
      } else {
        setFeedback({
          text: res.error || 'Failed to update user status.',
          type: 'error',
        });
      }
    } finally {
      setBusyUserId(null);
    }
  };

  const handleOpenResetModal = (user: AppUser) => {
    setResetModalUser(user);
    setNewPasswordVal('Farm@2026');
    setFeedback(null);
  };

  const handleSaveResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser || !newPasswordVal.trim()) return;

    setIsResetting(true);
    try {
      const res = await onUpdateUser({
        id: resetModalUser.id,
        password: newPasswordVal.trim(),
      });
      if (res.success) {
        setFeedback({
          text: `Password for ${resetModalUser.name} updated to "${newPasswordVal.trim()}".`,
          type: 'success',
        });
        setResetModalUser(null);
      } else {
        setFeedback({
          text: res.error || 'Failed to update password.',
          type: 'error',
        });
      }
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      {/* Page Title */}
      <div className="pt-1">
        <h2 className="text-2xl font-bold text-[#18181b] tracking-tight m-0">
          More
        </h2>
        <p className="text-xs text-[#64748b] mt-0.5 m-0">
          Farm team management and debtor records
        </p>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs font-semibold flex items-center justify-between border ${
            feedback.type === 'success'
              ? 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 hover:opacity-70 text-current"
            aria-label="Dismiss feedback"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sub Tabs: Farm Users vs Money Owed */}
      <div className="flex bg-[#f1f5f9] p-1 rounded-lg gap-1">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'users'
              ? 'bg-white text-[#166534] shadow-xs'
              : 'text-[#64748b] hover:text-[#18181b]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Farm Users</span>
          <span className="bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0] text-[10px] px-1.5 py-0.2 rounded-full font-bold">
            {users.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('debtors')}
          className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'debtors'
              ? 'bg-white text-[#166534] shadow-xs'
              : 'text-[#64748b] hover:text-[#18181b]'
          }`}
        >
          <span>Money Owed</span>
          {debtors.length > 0 && (
            <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {debtors.length}
            </span>
          )}
        </button>
      </div>

      {/* 1. FARM USERS (Owner-Controlled User Management) */}
      {activeTab === 'users' && (
        <div className="space-y-3">
          {/* Section Header & Primary Action: + Add User */}
          <div className="flex items-start justify-between gap-3 pt-1">
            <div>
              <h3 className="text-base font-bold text-[#18181b] m-0">
                Farm Users
              </h3>
              <p className="text-xs text-[#64748b] mt-0.5 m-0">
                Manage people who can access this farm.
              </p>
            </div>

            <button
              onClick={onOpenAddUser}
              className="btn-farm-primary text-xs py-2 px-3 shrink-0 font-bold"
            >
              + Add User
            </button>
          </div>

          {/* Users List */}
          <div className="space-y-2">
            {users.map((u) => {
              const isCurrent = currentUser.id === u.id;
              const isOwnerRole = u.role === 'owner';
              const isDeactivated = u.active === false;

              return (
                <div
                  key={u.id}
                  className={`clean-card p-3.5 space-y-2.5 transition-colors ${
                    isDeactivated ? 'opacity-70 bg-[#fafafa]' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#18181b]">
                          {u.name}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0]">
                            You
                          </span>
                        )}
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-medium border ${
                            isOwnerRole
                              ? 'bg-[#166534] text-white border-[#166534]'
                              : 'bg-[#f1f5f9] text-[#475569] border-[#cbd5e1]'
                          }`}
                        >
                          {isOwnerRole ? 'Owner' : 'Herdsman'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-[#64748b] mt-1">
                        <span>@{u.username}</span>
                        {u.phone && (
                          <>
                            <span>•</span>
                            <span>{u.phone}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-semibold border inline-block ${
                          isDeactivated
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]'
                        }`}
                      >
                        {isDeactivated ? 'Deactivated' : 'Active'}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-[#64748b] m-0 leading-relaxed">
                    {isOwnerRole
                      ? 'Full owner access: can manage records, finances, expenses, and farm team.'
                      : 'Herdsman access: restricted to daily milk delivery entry. Financial records remain hidden.'}
                  </p>

                  {/* Actions for User */}
                  {!isCurrent && (
                    <div className="flex items-center justify-between pt-2 border-t border-[#f1f5f9] text-xs">
                      <button
                        onClick={() => handleOpenResetModal(u)}
                        disabled={busyUserId === u.id}
                        className="text-[#64748b] hover:text-[#166534] font-medium"
                      >
                        Reset Password
                      </button>

                      <button
                        onClick={() => handleToggleActive(u)}
                        disabled={busyUserId === u.id}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors ${
                          isDeactivated
                            ? 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0] hover:bg-[#dcfce7]'
                            : 'bg-white text-red-700 border-red-200 hover:bg-red-50'
                        }`}
                      >
                        {isDeactivated ? 'Reactivate User' : 'Deactivate User'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick link to Milk Records */}
          <div className="p-3 bg-[#f8fafc] rounded-lg border border-[#e2e8f0] flex items-center justify-between">
            <span className="text-xs font-semibold text-[#18181b]">
              Need historical milk records?
            </span>
            <button
              onClick={onNavigateToRecords}
              className="text-xs font-bold text-[#166534] hover:underline"
            >
              View Milk Records →
            </button>
          </div>
        </div>
      )}

      {/* 2. MONEY OWED (DEBTORS) */}
      {activeTab === 'debtors' && (
        <div className="space-y-3">
          <div className="clean-card p-4 border-amber-200 bg-amber-50/50 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-amber-900 uppercase tracking-wider">
                Total Unpaid Owed
              </div>
              <div className="text-xl font-bold text-amber-900 num-font mt-0.5">
                {formatMoney(totalOwedAllTime)}
              </div>
            </div>
            <div className="text-xs text-amber-900 font-medium">
              {debtors.length} buyer{debtors.length === 1 ? '' : 's'} owing
            </div>
          </div>

          {debtors.length === 0 ? (
            <div className="clean-card p-8 text-center space-y-1">
              <div className="text-sm font-semibold text-[#18181b]">
                All milk payments are cleared!
              </div>
              <p className="text-xs text-[#64748b] m-0">
                No buyers have outstanding milk balances right now.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {debtors.map((d) => (
                <div
                  key={d.buyerId || d.buyerName}
                  className="clean-card p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-[#18181b] m-0">
                        {d.buyerName}
                      </h4>
                      <span className="text-xs text-[#64748b]">
                        {d.sales.length} unpaid batch{d.sales.length > 1 ? 'es' : ''}
                      </span>
                    </div>
                    <div className="text-base font-bold text-amber-900 num-font">
                      {formatMoney(d.owed)}
                    </div>
                  </div>

                  <div className="space-y-1 pt-1.5 border-t border-[#f1f5f9]">
                    {d.sales.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between text-xs bg-[#f8fafc] p-2 rounded border border-[#f1f5f9]"
                      >
                        <span className="text-[#64748b]">
                          {formatDisplayDate(s.date)}: {s.litres} L · Owes{' '}
                          <span className="font-semibold text-amber-900">
                            {formatMoney(s.balance)}
                          </span>
                        </span>
                        <button
                          onClick={() => onOpenRecordPayment(s)}
                          className="px-2.5 py-0.5 bg-[#f0fdf4] text-[#166534] hover:bg-[#dcfce7] font-semibold rounded text-xs border border-[#bbf7d0] transition-colors"
                        >
                          Receive
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Account Session & Log Out */}
      <div className="pt-4 border-t border-[#e2e8f0]">
        <div className="clean-card p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-[#18181b]">
              Signed in as {currentUser.name}
            </div>
            <div className="text-[11px] text-[#64748b]">
              {currentUser.title} (@{currentUser.username})
            </div>
          </div>
          <button
            onClick={onLogout}
            className="btn-farm-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 text-red-700 hover:bg-red-50 hover:border-red-200"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log out</span>
          </button>
        </div>
      </div>

      {/* Reset User Password Modal */}
      {resetModalUser && (
        <Modal
          isOpen={!!resetModalUser}
          onClose={() => setResetModalUser(null)}
          title={`Reset Password: ${resetModalUser.name}`}
          subtitle="Set a new temporary password for this farm team member."
          maxWidth="sm"
        >
          <form onSubmit={handleSaveResetPassword} className="p-4 space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="new-temp-password"
                className="block text-xs font-semibold text-[#18181b]"
              >
                New Temporary Password
              </label>
              <input
                id="new-temp-password"
                type="text"
                value={newPasswordVal}
                onChange={(e) => setNewPasswordVal(e.target.value)}
                required
                disabled={isResetting}
                placeholder="e.g. Farm@2026"
                className="w-full px-3 py-2 text-sm bg-white border border-[#e2e8f0] rounded-lg text-[#18181b] focus:outline-none focus:border-[#166534] focus:ring-1 focus:ring-[#166534]"
              />
              <p className="text-[11px] text-[#64748b] m-0">
                Inform the user of this password so they can log in to DairyPulse.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResetModalUser(null)}
                disabled={isResetting}
                className="btn-farm-secondary text-xs py-2 px-3"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isResetting || !newPasswordVal.trim()}
                className="btn-farm-primary text-xs py-2 px-4 font-bold flex items-center gap-1.5"
              >
                {isResetting ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Save Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
