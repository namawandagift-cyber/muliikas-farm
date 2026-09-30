import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { LoginCredentials, GoogleLoginCredentials } from '../types';
import { getGoogleClientId } from '../services/api';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          prompt: (momentListener?: (moment: any) => void) => void;
        };
      };
    };
  }
}

interface LoginScreenProps {
  onLogin: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  onGoogleLogin?: (credentials: GoogleLoginCredentials) => Promise<{
    success: boolean;
    error?: string;
    code?: string;
    email?: string;
    name?: string;
  }>;
  onNavigateToRegister?: (initialData?: { email?: string; name?: string }) => void;
  isSubmitting?: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLogin,
  onGoogleLogin,
  onNavigateToRegister,
  isSubmitting = false,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [unregisteredGoogle, setUnregisteredGoogle] = useState<{ email: string; name: string } | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  const googleClientId = getGoogleClientId();

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('Please enter both your username and password.');
      return;
    }

    setErrorMessage(null);
    setUnregisteredGoogle(null);
    setIsBusy(true);
    try {
      const res = await onLogin({
        username: username.trim(),
        password,
      });
      if (!res.success) {
        setErrorMessage(res.error || 'Username or password is incorrect.');
      }
    } finally {
      setIsBusy(false);
    }
  };

  const handleGoogleCredentialResponse = async (response: any) => {
    if (!response || !response.credential) {
      setErrorMessage('Google sign-in could not be completed. Please try again.');
      return;
    }

    if (!onGoogleLogin) {
      setErrorMessage('Google Sign-In is not configured.');
      return;
    }

    setErrorMessage(null);
    setUnregisteredGoogle(null);
    setIsGoogleLoading(true);
    try {
      const res = await onGoogleLogin({
        credential: response.credential,
      });
      if (!res.success) {
        if (res.code === 'NEW_GOOGLE_USER' || (res.error && res.error.toLowerCase().includes('not found'))) {
          setUnregisteredGoogle({
            email: res.email || '',
            name: res.name || '',
          });
        }
        setErrorMessage(res.error || 'Google sign-in could not be completed. Please try again.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Initialize Google Identity Services button if Client ID is configured
  useEffect(() => {
    if (!googleClientId) return;

    const interval = setInterval(() => {
      if (window.google?.accounts?.id && googleBtnContainerRef.current) {
        clearInterval(interval);
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          // Render official Google button
          googleBtnContainerRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: googleBtnContainerRef.current.offsetWidth || 340,
          });
        } catch (err) {
          console.error('Google button init error:', err);
        }
      }
    }, 200);

    return () => clearInterval(interval);
  }, [googleClientId]);

  const loading = isSubmitting || isBusy || isGoogleLoading;

  return (
    <div className="min-h-screen bg-white text-[#18181b] flex flex-col md:flex-row font-sans">
      {/* Left Column (Desktop Hero: Clean, professional, human design) */}
      <div className="hidden md:flex md:w-5/12 bg-[#f0fdf4] border-r border-[#e2e8f0] p-12 flex-col justify-between">
        <div>
          <div className="w-10 h-10 rounded-xl bg-[#166534] text-white flex items-center justify-center font-bold text-sm tracking-wider shadow-xs mb-8">
            DP
          </div>
          <h1 className="text-3xl font-extrabold text-[#18181b] tracking-tight mb-2">
            DairyPulse
          </h1>
          <p className="text-sm font-semibold text-[#166534] uppercase tracking-wider mb-6">
            Simple records. Better farming.
          </p>
          <p className="text-sm text-[#475569] leading-relaxed max-w-sm">
            Digital farm notebook for recording daily milk deliveries, managing buyers, tracking expenses, and keeping your farm team in sync.
          </p>
        </div>

        <div className="text-xs text-[#64748b] space-y-1">
          <div>Simple • Fast • Secure</div>
          <div>Dairy farm records management</div>
        </div>
      </div>

      {/* Right Column (Login Card & Sign-In Form) */}
      <div className="flex-1 flex flex-col justify-center items-center px-4 py-8 md:px-12">
        <div className="w-full max-w-sm space-y-6">
          {/* Mobile Brand Header */}
          <div className="md:hidden text-center space-y-1.5 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#166534] text-white flex items-center justify-center font-bold text-sm tracking-wider mx-auto shadow-xs">
              DP
            </div>
            <h1 className="text-2xl font-bold text-[#18181b] tracking-tight m-0">
              DairyPulse
            </h1>
            <p className="text-xs text-[#64748b] m-0">
              Simple records. Better farming.
            </p>
          </div>

          {/* Form Header */}
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-[#18181b] tracking-tight m-0">
              Welcome back
            </h2>
            <p className="text-xs text-[#64748b] m-0">
              Sign in to your farm account.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 font-medium leading-relaxed space-y-2">
              <div>{errorMessage}</div>
              {unregisteredGoogle && onNavigateToRegister && (
                <div>
                  <button
                    type="button"
                    onClick={() => onNavigateToRegister(unregisteredGoogle)}
                    className="font-bold underline text-[#166534] hover:text-[#14532d]"
                  >
                    Click here to register a new farm with {unregisteredGoogle.email} &rarr;
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Password Login Form */}
          <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
            <div className="space-y-1">
              <label
                htmlFor="username"
                className="block text-xs font-semibold text-[#18181b]"
              >
                Username or Email
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck="false"
                required
                disabled={loading}
                placeholder="Enter username or email"
                className="w-full px-3 py-2 text-sm bg-white border border-[#e2e8f0] rounded-lg text-[#18181b] focus:outline-none focus:border-[#166534] focus:ring-1 focus:ring-[#166534] transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-[#18181b]"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  placeholder="Enter password"
                  className="w-full px-3 py-2 pr-10 text-sm bg-white border border-[#e2e8f0] rounded-lg text-[#18181b] focus:outline-none focus:border-[#166534] focus:ring-1 focus:ring-[#166534] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-[#94a3b8] hover:text-[#475569] focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-farm-primary py-2.5 px-4 font-bold text-sm flex items-center justify-center gap-2 mt-1 shadow-xs"
            >
              {isBusy ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign in</span>
              )}
            </button>
          </form>

          {/* Google Sign-In Container (shown when Google Client ID is configured) */}
          {googleClientId && (
            <>
              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#e2e8f0]"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-white text-[#94a3b8] uppercase tracking-wider font-semibold">
                    or
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex flex-col items-center">
                  <div
                    ref={googleBtnContainerRef}
                    className="w-full flex justify-center min-h-[44px]"
                  />
                  {isGoogleLoading && (
                    <div className="text-xs text-[#166534] font-semibold flex items-center gap-2 mt-2">
                      <div className="w-3.5 h-3.5 border-2 border-[#166534] border-t-transparent rounded-full animate-spin" />
                      <span>Verifying Google account...</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* New to DairyPulse? Create an Account */}
          <div className="pt-4 border-t border-[#f1f5f9] text-center space-y-2">
            <div className="text-xs text-[#64748b]">
              New to DairyPulse?
            </div>
            <button
              type="button"
              onClick={() => onNavigateToRegister?.()}
              className="w-full py-2.5 px-4 bg-[#f0fdf4] hover:bg-[#dcfce7] text-[#166534] border border-[#bbf7d0] rounded-lg text-sm font-bold transition-colors shadow-xs"
            >
              Create an account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
