import React, { useState, useEffect } from 'react';
import { Sale } from '../types';
import { Modal } from './Modal';
import { formatMoney } from '../utils/formatters';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  onSavePayment: (saleId: string, amount: number) => Promise<{ success: boolean; error?: string }>;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  sale,
  onSavePayment,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && sale) {
      setAmount(String(sale.balance || ''));
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, sale]);

  if (!sale) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numeric = parseFloat(amount);
    if (isNaN(numeric) || numeric <= 0) {
      setError('Please enter a payment amount greater than 0.');
      return;
    }

    if (numeric > sale.balance) {
      setError(`Payment cannot exceed the outstanding balance of ${formatMoney(sale.balance)}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onSavePayment(sale.id, Math.round(numeric));
      if (res.success) {
        onClose();
      } else {
        setError(res.error || 'Failed to record payment.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error recording payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Payment"
      subtitle={`Receive owed money from ${sale.buyerName}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        {/* Sale Summary */}
        <div className="p-3 bg-[#f8fafc] rounded-lg border border-[#e2e8f0] space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-[#64748b]">Buyer:</span>
            <span className="font-semibold text-[#18181b]">{sale.buyerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#64748b]">Sale Date:</span>
            <span className="text-[#18181b]">{sale.date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#64748b]">Total Milk:</span>
            <span className="text-[#18181b]">
              {sale.litres} L ({formatMoney(sale.totalAmount)})
            </span>
          </div>
          <div className="flex justify-between border-t border-[#e2e8f0] pt-1.5">
            <span className="text-[#64748b]">Currently Owed:</span>
            <span className="font-bold text-amber-800 text-sm">
              {formatMoney(sale.balance)}
            </span>
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-xs font-semibold text-[#18181b] mb-1">
            Amount Received (UGX)
          </label>
          <input
            type="number"
            step="500"
            min="100"
            max={sale.balance}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="w-full px-3 py-2 text-base font-bold bg-white border border-[#e2e8f0] rounded-lg text-[#18181b] focus:outline-none focus:border-[#166534] num-font"
          />
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => setAmount(String(sale.balance))}
              className="px-2.5 py-1 text-xs font-semibold bg-[#f0fdf4] text-[#166534] rounded-md border border-[#bbf7d0]"
            >
              Full Balance ({formatMoney(sale.balance)})
            </button>
            {sale.balance >= 10000 && (
              <button
                type="button"
                onClick={() => setAmount(String(Math.round(sale.balance / 2)))}
                className="px-2.5 py-1 text-xs font-semibold bg-[#f8fafc] text-[#64748b] rounded-md border border-[#e2e8f0]"
              >
                Half (50%)
              </button>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full btn-farm-primary py-3 text-sm font-semibold rounded-lg disabled:opacity-50"
          >
            {isSubmitting ? 'Saving Payment...' : 'Confirm Payment Received'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
