import React, { useState } from 'react';
import { Eye, EyeOff, ArrowRight, ArrowLeft, Check, CheckCircle2, Building2, User, ShieldCheck } from 'lucide-react';
import { RegisterFarmData } from '../types';

interface RegisterScreenProps {
  onRegister: (data: RegisterFarmData) => Promise<{ success: boolean; error?: string }>;
  onNavigateToLogin: () => void;
  initialOwnerName?: string;
  initialOwnerEmail?: string;
  isSubmitting?: boolean;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  onRegister,
  onNavigateToLogin,
  initialOwnerName = '',
  initialOwnerEmail = '',
  isSubmitting = false,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Owner Details
  const [ownerName, setOwnerName] = useState(initialOwnerName);
  const [ownerEmail, setOwnerEmail] = useState(initialOwnerEmail);
  const [ownerPhone, setOwnerPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 2: Farm Details
  const [farmName, setFarmName] = useState('');
  const [farmLocation, setFarmLocation] = useState('');
  const [farmPhone, setFarmPhone] = useState('');
  const [farmDescription, setFarmDescription] = useState('');

  // UI state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  // Validation for Step 1
  const handleNextToFarm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = ownerName.trim();
    const trimmedEmail = ownerEmail.trim().toLowerCase();

    if (!trimmedName) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Please create a password for your account.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please check and try again.');
      return;
    }

    setStep(2);
  };

  // Validation for Step 2
  const handleNextToReview = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedFarmName = farmName.trim();
    const trimmedLocation = farmLocation.trim();

    if (!trimmedFarmName) {
      setErrorMessage('Please enter your farm name.');
      return;
    }

    if (!trimmedLocation) {
      setErrorMessage('Please enter your farm location.');
      return;
    }

    setStep(3);
  };

  // Submit Registration (Step 3)
  const handleFinalSubmit = async () => {
    setErrorMessage(null);
    setIsBusy(true);

    try {
      const payload: RegisterFarmData = {
        ownerName: ownerName.trim(),
        ownerEmail: ownerEmail.trim().toLowerCase(),
        ownerPhone: ownerPhone.trim() || undefined,
        password: password,
        farmName: farmName.trim(),
        farmLocation: farmLocation.trim(),
        farmPhone: farmPhone.trim() || undefined,
        farmDescription: farmDescription.trim() || undefined,
      };

      const res = await onRegister(payload);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to create your farm account. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create your farm account. Please try again.');
    } finally {
      setIsBusy(false);
    }
  };

  const loading = isSubmitting || isBusy;

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
          <p className="text-sm text-[#475569] leading-relaxed max-w-sm mb-8">
            Set up your digital farm notebook in minutes. Record daily milk deliveries, manage buyers, track expenses, and give your herdsmen clear task tools.
          </p>

          <div className="space-y-3.5 max-w-xs">
            <div className="flex items-start gap-3 text-xs text-[#334155]">
              <div className="w-5 h-5 rounded-full bg-[#dcfce7] text-[#166534] flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
              <span><strong>Owner control:</strong> You own the farm and can add herdsmen anytime.</span>
            </div>
            <div className="flex items-start gap-3 text-xs text-[#334155]">
              <div className="w-5 h-5 rounded-full bg-[#dcfce7] text-[#166534] flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
              <span><strong>Separate milk logs:</strong> Herdsmen enter litres quickly without seeing private finances.</span>
            </div>
            <div className="flex items-start gap-3 text-xs text-[#334155]">
              <div className="w-5 h-5 rounded-full bg-[#dcfce7] text-[#166534] flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
              <span><strong>Debtor tracking:</strong> Real-time buyer balances and payment records.</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-[#64748b] space-y-1">
          <div>Simple • Fast • Secure</div>
          <div>Dairy farm records management</div>
        </div>
      </div>

      {/* Right Column (Registration Stepper & Forms) */}
      <div className="flex-1 flex flex-col justify-center items-center px-4 py-8 md:px-12">
        <div className="w-full max-w-md space-y-6">
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

          {/* Page Title & Subtitle */}
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-[#18181b] tracking-tight m-0">
              Create your DairyPulse account
            </h2>
            <p className="text-xs text-[#64748b] m-0">
              Set up your account and farm in a few steps.
            </p>
          </div>

          {/* 3-Step Progress Indicator */}
          <div className="flex items-center justify-between border-y border-[#f1f5f9] py-3">
            {/* Step 1 Pill */}
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === 1
                    ? 'bg-[#166534] text-white'
                    : step > 1
                    ? 'bg-[#dcfce7] text-[#166534]'
                    : 'bg-[#f1f5f9] text-[#94a3b8]'
                }`}
              >
                {step > 1 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '1'}
              </div>
              <span className={`text-xs font-semibold ${step === 1 ? 'text-[#18181b]' : 'text-[#64748b]'}`}>
                Owner
              </span>
            </div>

            <div className={`flex-1 h-0.5 mx-2 ${step >= 2 ? 'bg-[#166534]' : 'bg-[#e2e8f0]'}`} />

            {/* Step 2 Pill */}
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === 2
                    ? 'bg-[#166534] text-white'
                    : step > 2
                    ? 'bg-[#dcfce7] text-[#166534]'
                    : 'bg-[#f1f5f9] text-[#94a3b8]'
                }`}
              >
                {step > 2 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '2'}
              </div>
              <span className={`text-xs font-semibold ${step === 2 ? 'text-[#18181b]' : 'text-[#64748b]'}`}>
                Farm
              </span>
            </div>

            <div className={`flex-1 h-0.5 mx-2 ${step >= 3 ? 'bg-[#166534]' : 'bg-[#e2e8f0]'}`} />

            {/* Step 3 Pill */}
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === 3
                    ? 'bg-[#166534] text-white'
                    : 'bg-[#f1f5f9] text-[#94a3b8]'
                }`}
              >
                3
              </div>
              <span className={`text-xs font-semibold ${step === 3 ? 'text-[#18181b]' : 'text-[#64748b]'}`}>
                Review
              </span>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 font-medium leading-relaxed flex flex-col gap-1.5">
              <div>{errorMessage}</div>
              {errorMessage.toLowerCase().includes('already exists') && (
                <div>
                  <button
                    type="button"
                    onClick={onNavigateToLogin}
                    className="font-bold underline text-[#166534] hover:text-[#14532d]"
                  >
                    Click here to sign in to your existing account &rarr;
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 1: OWNER DETAILS */}
          {step === 1 && (
            <form onSubmit={handleNextToFarm} className="space-y-3.5">
              <div className="text-xs font-semibold text-[#166534] uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <User className="w-3.5 h-3.5" />
                <span>Step 1: Your Account Details</span>
              </div>

              {/* Full Name */}
              <div className="space-y-1">
                <label htmlFor="ownerName" className="block text-xs font-semibold text-[#18181b]">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="ownerName"
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  autoComplete="name"
                  required
                  placeholder="e.g. Gift Namawanda"
                  className="w-full px-3 py-2 text-sm bg-white border border-[#e2e8f0] rounded-lg text-[#18181b] focus:outline-none focus:border-[#166534] focus:ring-1 focus:ring-[#166534] transition-colors"
                />
              </div>

              {/* Email Address */}
              <div className="space-y-1">
                <label htmlFor="ownerEmail" className="block text-xs font-semibold text-[#18181b]">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="ownerEmail"
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  autoComplete="email"
                  required
                  placeholder="e.g. gift@example.com"
                  className="w-full px-3 py-2 text-sm bg-white border border-[#e2e8f0] rounded-lg text-[#18181b] focus:outline-none focus:border-[#166534] focus:ring-1 focus:ring-[#166534] transition-colors"
                />
              </div>

              {/* Phone Number (Optional) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="ownerPhone" className="block text-xs font-semibold text-[#18181b]">
                    Phone Number
                  </label>
                  <span className="text-[11px] text-[#94a3b8]">Optional</span>
                </div>
                <input
                  id="ownerPhone"
                  type="tel"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  autoComplete="tel"
                  placeholder="e.g. +256 701 234567"
                  className="w-full px-3 py-2 text-sm bg-white border border-[#e2e8f0] rounded-lg text-[#18181b] focus:outline-none focus:border-[#166534] focus:ring-1 focus:ring-[#166534] transition-colors"
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label htmlFor="password" className="block text-xs font-semibold text-[#18181b]">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    placeholder="Create a password (min. 6 characters)"
                    className="w-full px-3 py-2 pr-10 text-sm bg-white border border-[#e2e8f0] rounded-lg text-[#18181b] focus:outline-none focus:border-[#166534] focus:ring-1 focus:ring-[#166534] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-[#94a3b8] hover:text-[#475569] focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label htmlFor="confirmPassword" className="block text-xs font-semibold text-[#18181b]">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    placeholder="Re-enter your password"
                    className="w-full px-3 py-2 pr-10 text-sm bg-white border border-[#e2e8f0] rounded-lg text-[#18181b] focus:outline-none focus:border-[#166534] focus:ring-1 focus:ring-[#166534] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-2.5 text-[#94a3b8] hover:text-[#475569] focus:outline-none"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Continue to Step 2 Button */}
              <button
                type="submit"
                className="w-full btn-farm-primary py-2.5 px-4 font-bold text-sm flex items-center justify-center gap-2 mt-4 shadow-xs"
              >
                <span>Next: Farm details</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* STEP 2: FARM DETAILS */}
          {step === 2 && (
            <form onSubmit={handleNextToReview} className="space-y-3.5">
              <div className="space-y-1 mb-2">
                <div className="text-xs font-semibold text-[#166534] uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Step 2: Tell us about your farm</span>
                </div>
                <p className="text-xs text-[#64748b]">
                  Enter your farm information so your records and receipts are accurately labeled.
                </p>
              </div>

              {/* Farm Name */}
              <div className="space-y-1">
                <label htmlFor="farmName" className="block text-xs font-semibold text-[#18181b]">
                  Farm Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="farmName"
                  type="text"
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  required
                  placeholder="e.g. Green Valley Farm"
                  className="w-full px-3 py-2 text-sm bg-white border border-[#e2e8f0] rounded-lg text-[#18181b] focus:outline-none focus:border-[#166534] focus:ring-1 focus:ring-[#166534] transition-colors"
                />
              </div>

              {/* Farm Location */}
              <div className="space-y-1">
                <label htmlFor="farmLocation" className="block text-xs font-semibold text-[#18181b]">
                  Farm Location <span className="text-red-500">*</span>
                </label>
                <input
                  id="farmLocation"
                  type="text"
                  value={farmLocation}
                  onChange={(e) => setFarmLocation(e.target.value)}
                  required
                  placeholder="e.g. Mbarara, Uganda"
                  className="w-full px-3 py-2 text-sm bg-white border border-[#e2e8f0] rounded-lg text-[#18181b] focus:outline-none focus:border-[#166534] focus:ring-1 focus:ring-[#166534] transition-colors"
                />
              </div>

              {/* Farm Phone (Optional) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="farmPhone" className="block text-xs font-semibold text-[#18181b]">
                    Farm Phone
                  </label>
                  <span className="text-[11px] text-[#94a3b8]">Optional</span>
                </div>
                <input
                  id="farmPhone"
                  type="tel"
                  value={farmPhone}
                  onChange={(e) => setFarmPhone(e.target.value)}
                  placeholder="e.g. +256 772 123456"
                  className="w-full px-3 py-2 text-sm bg-white border border-[#e2e8f0] rounded-lg text-[#18181b] focus:outline-none focus:border-[#166534] focus:ring-1 focus:ring-[#166534] transition-colors"
                />
              </div>

              {/* Farm Description (Optional) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="farmDescription" className="block text-xs font-semibold text-[#18181b]">
                    Farm Description
                  </label>
                  <span className="text-[11px] text-[#94a3b8]">Optional</span>
                </div>
                <textarea
                  id="farmDescription"
                  rows={2}
                  value={farmDescription}
                  onChange={(e) => setFarmDescription(e.target.value)}
                  placeholder="e.g. Dairy farm producing and selling fresh milk."
                  className="w-full px-3 py-2 text-sm bg-white border border-[#e2e8f0] rounded-lg text-[#18181b] focus:outline-none focus:border-[#166534] focus:ring-1 focus:ring-[#166534] transition-colors"
                />
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 py-2.5 px-3 bg-white hover:bg-[#f8fafc] text-[#475569] border border-[#e2e8f0] rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  className="w-2/3 btn-farm-primary py-2.5 px-4 font-bold text-sm flex items-center justify-center gap-2 shadow-xs"
                >
                  <span>Next: Review</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: REVIEW & CREATE FARM */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-1 mb-2">
                <div className="text-xs font-semibold text-[#166534] uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Step 3: Review & Confirm</span>
                </div>
                <p className="text-xs text-[#64748b]">
                  Please review your details before creating your farm.
                </p>
              </div>

              {/* Review Card */}
              <div className="border border-[#e2e8f0] rounded-xl p-4 bg-[#f8fafc] space-y-4">
                {/* Account Details */}
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
                    Your account
                  </div>
                  <div className="text-sm font-bold text-[#18181b]">{ownerName}</div>
                  <div className="text-xs text-[#475569]">{ownerEmail}</div>
                  {ownerPhone && <div className="text-xs text-[#64748b]">{ownerPhone}</div>}
                  <div className="inline-block mt-1 px-2 py-0.5 bg-[#dcfce7] text-[#166534] rounded text-[11px] font-semibold">
                    Role: Farm Owner
                  </div>
                </div>

                <div className="border-t border-[#e2e8f0]" />

                {/* Farm Details */}
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
                    Your farm
                  </div>
                  <div className="text-sm font-bold text-[#18181b]">{farmName}</div>
                  <div className="text-xs text-[#475569]">{farmLocation}</div>
                  {farmPhone && <div className="text-xs text-[#64748b]">Phone: {farmPhone}</div>}
                  {farmDescription && (
                    <div className="text-xs text-[#64748b] italic pt-0.5">"{farmDescription}"</div>
                  )}
                </div>
              </div>

              {/* Final Submit & Back Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setStep(2)}
                  className="w-1/3 py-2.5 px-3 bg-white hover:bg-[#f8fafc] text-[#475569] border border-[#e2e8f0] rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={loading}
                  className="w-2/3 btn-farm-primary py-2.5 px-4 font-bold text-sm flex items-center justify-center gap-2 shadow-xs"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating my farm...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Create my farm</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Already have an account? Sign In Link */}
          <div className="pt-4 border-t border-[#f1f5f9] text-center">
            <div className="text-xs text-[#64748b]">
              Already have a farm account?{' '}
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="font-bold text-[#166534] hover:underline ml-1"
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
