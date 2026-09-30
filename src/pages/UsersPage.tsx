import React, { useState } from 'react';
import { AppUser, UpdateUserData, UserRole, AuthMethod } from '../types';
import { Users, LogOut, Check, X, KeyRound, ShieldAlert } from 'lucide-react';

interface UsersPageProps {
  currentUser: AppUser;
  users: AppUser[];
  onOpenAddUser: () => void;
  onUpdateUser: (data: UpdateUserData) => Promise<{ success: boolean; error?: string }>;
  onDisableUser: (id: string) => Promise<{ success: boolean; error?: string }>;
  onReactivateUser: (id: string) => Promise<{ success: boolean; error?: string }>;
  onLogout: () => void;
}

export const UsersPage: React.FC<UsersPageProps> = ({
  currentUser,
  users,
  onOpenAddUser,
  onUpdateUser,
  onDisableUser,
  onReactivateUser,
  onLogout,
}) => {
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('herdsman');
  const [editAuthMethod, setEditAuthMethod] = useState<AuthMethod>('google');
  const [editStatus, setEditStatus] = useState<'Active' | 'Inactive'>('Active');
  const [editError, setEditError] = useState<string | null>(null);

  const startEdit = (user: AppUser) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email || '');
    setEditPhone(user.phone || '');
    setEditRole(user.role);
    setEditAuthMethod(user.authMethod || 'both');
    setEditStatus(user.status || (user.active ? 'Active' : 'Inactive'));
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!editName.trim()) {
      setEditError('Full Name is required.');
      return;
    }

    if ((editAuthMethod === 'google' || editAuthMethod === 'both') && !editEmail.trim()) {
      setEditError('Email address is required for Google Sign-In.');
      return;
    }

    setBusyUserId(editingUser.id);
    setEditError(null);
    try {
      const res = await onUpdateUser({
        id: editingUser.id,
        name: editName.trim(),
        email: editEmail.trim().toLowerCase(),
        phone: editPhone.trim(),
        role: editRole,
        authMethod: editAuthMethod,
        active: editStatus === 'Active',
      });

      if (res.success) {
        setEditingUser(null);
      } else {
        setEditError(res.error || 'Failed to update user.');
      }
    } finally {
      setBusyUserId(null);
    }
  };

  const handleToggleStatus = async (user: AppUser) => {
    const isCurrentlyActive = user.active !== false && user.status !== 'Inactive';
    const actionText = isCurrentlyActive ? 'disable' : 'reactivate';
    if (!window.confirm(`Are you sure you want to ${actionText} ${user.name}?`)) {
      return;
    }

    setBusyUserId(user.id);
    try {
      if (isCurrentlyActive) {
        await onDisableUser(user.id);
      } else {
        await onReactivateUser(user.id);
      }
    } finally {
      setBusyUserId(null);
    }
  };

  const handleResetPassword = async (user: AppUser) => {
    const newPassword = window.prompt(`Enter new temporary password for ${user.name}:`, 'Farm@2026');
    if (!newPassword || !newPassword.trim()) return;

    setBusyUserId(user.id);
    try {
      const res = await onUpdateUser({
        id: user.id,
        password: newPassword.trim(),
      });
      if (res.success) {
        window.alert(`Password updated for ${user.name}. Inform them of their new password: ${newPassword.trim()}`);
      } else {
        window.alert(res.error || 'Failed to update password.');
      }
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      {/* Page Title & Add User Action */}
      <div className="flex items-start justify-between gap-3 pt-1">
        <div>
          <h2 className="text-2xl font-bold text-[#18181b] tracking-tight m-0">
            Farm Users
          </h2>
          <p className="text-xs text-[#64748b] mt-0.5 m-0">
            Manage people who can access this farm.
          </p>
        </div>

        <button
          onClick={onOpenAddUser}
          className="btn-farm-primary text-xs md:text-sm py-2 px-3.5 shrink-0 font-bold flex items-center gap-1.5 shadow-xs"
        >
          <span>+ Add User</span>
        </button>
      </div>

      {/* Users Count Summary */}
      <div className="flex items-center justify-between text-xs text-[#64748b] px-0.5">
        <span>{users.length} registered farm user{users.length === 1 ? '' : 's'}</span>
      </div>

      {/* Users List */}
      <div className="space-y-2.5">
        {users.map((u) => {
          const isCurrent = currentUser.id === u.id;
          const isOwnerRole = u.role === 'owner';
          const isInactive = u.active === false || u.status === 'Inactive';
          const isEditing = editingUser?.id === u.id;

          if (isEditing) {
            return (
              <div key={u.id} className="clean-card p-4 space-y-3 border-[#166534] ring-1 ring-[#166534]">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-[#18181b] m-0">Edit Farm User</h4>
                  <button
                    onClick={() => setEditingUser(null)}
                    className="text-xs text-[#64748b] hover:text-[#18181b]"
                  >
                    Cancel
                  </button>
                </div>

                {editError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
                    {editError}
                  </div>
                )}

                <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold mb-1">Full Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      className="w-full px-3 py-1.5 border border-[#e2e8f0] rounded text-sm focus:outline-none focus:border-[#166534]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold mb-1">Role</label>
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as UserRole)}
                        className="w-full px-2 py-1.5 border border-[#e2e8f0] rounded text-xs focus:outline-none focus:border-[#166534]"
                      >
                        <option value="herdsman">Herdsman</option>
                        <option value="owner">Owner</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Authentication</label>
                      <select
                        value={editAuthMethod}
                        onChange={(e) => setEditAuthMethod(e.target.value as AuthMethod)}
                        className="w-full px-2 py-1.5 border border-[#e2e8f0] rounded text-xs focus:outline-none focus:border-[#166534]"
                      >
                        <option value="google">Google</option>
                        <option value="password">Username + Password</option>
                        <option value="both">Both</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Email Address</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      required={editAuthMethod === 'google' || editAuthMethod === 'both'}
                      placeholder="e.g. john@gmail.com"
                      className="w-full px-3 py-1.5 border border-[#e2e8f0] rounded text-sm focus:outline-none focus:border-[#166534]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Phone (Optional)</label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+256 701 987654"
                      className="w-full px-3 py-1.5 border border-[#e2e8f0] rounded text-sm focus:outline-none focus:border-[#166534]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as 'Active' | 'Inactive')}
                      className="w-full px-2 py-1.5 border border-[#e2e8f0] rounded text-xs focus:outline-none focus:border-[#166534]"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive (Disabled)</option>
                    </select>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="btn-farm-secondary flex-1 py-1.5 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={busyUserId === u.id}
                      className="btn-farm-primary flex-1 py-1.5 text-xs font-bold"
                    >
                      {busyUserId === u.id ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            );
          }

          return (
            <div
              key={u.id}
              className={`clean-card p-4 space-y-2.5 transition-colors ${
                isInactive ? 'opacity-65 bg-[#fafafa]' : ''
              }`}
            >
              {/* Top row: Name, Role & Status */}
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

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#64748b] mt-1">
                    {u.email && <span className="text-[#18181b] font-medium">{u.email}</span>}
                    {u.username && <span>@{u.username}</span>}
                    {u.phone && (
                      <>
                        <span>•</span>
                        <span>{u.phone}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0 space-y-1">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold border inline-block ${
                      isInactive
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]'
                    }`}
                  >
                    {isInactive ? 'Inactive' : 'Active'}
                  </span>
                  <div className="text-[10px] text-[#94a3b8] capitalize">
                    {u.authMethod || 'Password'}
                  </div>
                </div>
              </div>

              {/* Description & metadata */}
              <div className="flex items-center justify-between text-[11px] text-[#64748b]">
                <span>
                  {isOwnerRole
                    ? 'Owner access: Full oversight of milk, finances, expenses, and users.'
                    : 'Herdsman access: Restricted to recording milk deliveries and today\'s entries.'}
                </span>
                {u.lastLoginAt && (
                  <span className="text-[#94a3b8] shrink-0 ml-2">
                    Last login: {new Date(u.lastLoginAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-[#f1f5f9] text-xs">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => startEdit(u)}
                    className="text-[#166534] font-semibold hover:underline"
                  >
                    Edit User
                  </button>

                  {u.authMethod !== 'google' && (
                    <button
                      onClick={() => handleResetPassword(u)}
                      disabled={busyUserId === u.id}
                      className="text-[#64748b] hover:text-[#18181b]"
                    >
                      Reset Password
                    </button>
                  )}
                </div>

                {!isCurrent && (
                  <button
                    onClick={() => handleToggleStatus(u)}
                    disabled={busyUserId === u.id}
                    className={`px-2.5 py-1 rounded text-xs font-semibold border transition-colors ${
                      isInactive
                        ? 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0] hover:bg-[#dcfce7]'
                        : 'bg-white text-red-700 border-red-200 hover:bg-red-50'
                    }`}
                  >
                    {isInactive ? 'Reactivate User' : 'Disable User'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
