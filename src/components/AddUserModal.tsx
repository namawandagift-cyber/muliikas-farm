import React, { useState } from 'react';
import { Modal } from './Modal';
import { CreateUserData, UserRole, AuthMethod } from '../types';
import { Check } from 'lucide-react';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveUser: (data: CreateUserData) => Promise<{ success: boolean; error?: string }>;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({
  isOpen,
  onClose,
  onSaveUser,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('Farm@2026');
  const [role, setRole] = useState<UserRole>('herdsman');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('google');
  const [active, setActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setUsername('');
    setPhone('');
    setPassword('Farm@2026');
    setRole('herdsman');
    setAuthMethod('google');
    setActive(true);
    setErrorMessage(null);
    setIsSuccess(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }

    if ((authMethod === 'google' || authMethod === 'both') && !email.trim()) {
      setErrorMessage('Email address is required for Google Sign-In.');
      return;
    }

    if ((authMethod === 'password' || authMethod === 'both')) {
      if (!username.trim()) {
        setErrorMessage('Username is required for password authentication.');
        return;
      }
      if (!password.trim()) {
        setErrorMessage('Temporary password is required for password authentication.');
        return;
      }
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const res = await onSaveUser({
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
        username: username.trim().toLowerCase() || (email ? email.split('@')[0] : fullName.toLowerCase().replace(/[^a-z0-9]/g, '')),
        phone: phone.trim(),
        password: password.trim(),
        role,
        authMethod,
        active,
      });

      if (res.success) {
        setIsSuccess(true);
        setTimeout(() => {
          handleClose();
        }, 1200);
      } else {
        setErrorMessage(res.error || 'Failed to create user.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Suggest username/email helpers
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFullName(name);
    if (!username || username === fullName.toLowerCase().replace(/[^a-z0-9]/g, '')) {
      setUsername(name.toLowerCase().replace(/[^a-z0-9]/g, ''));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add User"
      subtitle="Register a new farm user to this farm"
    >
      {isSuccess ? (
        <div className="py-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0] flex items-center justify-center mx-auto">
            <Check className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div className="text-base font-bold text-[#18181b]">User created</div>
          <p className="text-xs text-[#64748b] max-w-xs mx-auto m-0 leading-relaxed">
            {fullName} is now registered to this farm. They can now sign in using {authMethod === 'google' ? 'Google (' + email + ')' : authMethod === 'password' ? 'username "' + username + '"' : 'Google or password'}.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5 py-1">
          {errorMessage && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium leading-relaxed">
              {errorMessage}
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-1">
            <label
              htmlFor="fullName"
              className="block text-xs font-semibold text-[#18181b]"
            >
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={handleNameChange}
              required
              placeholder="e.g. John"
              className="w-full px-3 py-2 text-sm bg-white border border-[#e2e8f0] rounded-lg text-[#18181b] focus:outline-none focus:border-[#166534]"
            />
          </div>

          {/* Authentication Method Selection */}
          <div className="space-y-1">
            <label
              htmlFor="authMethod"
              className="block text-xs font-semibold text-[#18181b]"
            >
              Authentication Method
            </label>
            <select
              id="authMethod"
              value={authMethod}
              onChange={(e) => setAuthMethod(e.target.value as AuthMethod)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#e2e8f0] rounded-lg text-[#18181b] focus:outline-none focus:border-[#166534]"
            >
              <option value="google">Google (Continue with Google)</option>
              <option value="password">Username + Password</option>
              <option value="both">Both (Google & Password)</option>
            </select>
          </div>

          {/* Email Address (Required for Google, optional otherwise) */}
          <div className="space-y-1">
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-[#18181b]"
            >
              Email Address {(authMethod === 'google' || authMethod === 'both') && <span className="text-[#166534]">*</span>}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required={authMethod === 'google' || authMethod === 'both'}
              placeholder="e.g. john@gmail.com"
              className="w-full px-3 py-2 text-sm bg-white border border-[#e2e8f0] rounded-lg text-[#18181b] focus:outline-none focus:border-[#166534]"
            />
            {(authMethod === 'google' || authMethod === 'both') && (
              <p className="text-[11px] text-[#64748b] m-0">
                User must sign in with this exact Google account.
              </p>
            )}
          </div>

          {/* Username (Optional if Google-only, required if password) */}
          <div className="space-y-1">
            <label
              htmlFor="username"
              className="block text-xs font-semibold text-[#18181b]"
            >
              Username {authMethod === 'google' ? <span className="text-[#94a3b8] font-normal">(Optional for Google-only)</span> : <span className="text-[#166534]">*</span>}
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
              required={authMethod === 'password' || authMethod === 'both'}
              autoCapitalize="none"
              placeholder="e.g. john"
              className="w-full px-3 py-2 text-sm bg-white border border-[#e2e8f0] rounded-lg text-[#18181b] focus:outline-none focus:border-[#166534]"
            />
          </div>

          {/* Temporary Password (only when password/both enabled) */}
          {(authMethod === 'password' || authMethod === 'both') && (
            <div className="space-y-1">
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-[#18181b]"
              >
                Temporary Password
              </label>
              <input
                id="password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Farm@2026"
                className="w-full px-3 py-2 text-sm bg-white border border-[#e2e8f0] rounded-lg text-[#18181b] focus:outline-none focus:border-[#166534]"
              />
            </div>
          )}

          {/* Role */}
          <div className="space-y-1">
            <label
              htmlFor="role"
              className="block text-xs font-semibold text-[#18181b]"
            >
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#e2e8f0] rounded-lg text-[#18181b] focus:outline-none focus:border-[#166534]"
            >
              <option value="herdsman">Herdsman (Can only record milk & see today's entries)</option>
              <option value="owner">Owner (Full access to Dashboard, Milk, Expenses, Buyers, Users)</option>
            </select>
          </div>

          {/* Phone (Optional) */}
          <div className="space-y-1">
            <label
              htmlFor="phone"
              className="block text-xs font-semibold text-[#18181b]"
            >
              Phone <span className="text-[#94a3b8] font-normal">(Optional)</span>
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +256 701 987654"
              className="w-full px-3 py-2 text-sm bg-white border border-[#e2e8f0] rounded-lg text-[#18181b] focus:outline-none focus:border-[#166534]"
            />
          </div>

          {/* Active Status */}
          <div className="space-y-1">
            <label
              htmlFor="active"
              className="block text-xs font-semibold text-[#18181b]"
            >
              Status
            </label>
            <select
              id="active"
              value={active ? 'yes' : 'no'}
              onChange={(e) => setActive(e.target.value === 'yes')}
              className="w-full px-3 py-2 text-sm bg-white border border-[#e2e8f0] rounded-lg text-[#18181b] focus:outline-none focus:border-[#166534]"
            >
              <option value="yes">Active</option>
              <option value="no">Inactive (Deactivated)</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 btn-farm-secondary py-2 text-xs font-semibold rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 btn-farm-primary py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? 'Saving User...' : 'Create User'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
