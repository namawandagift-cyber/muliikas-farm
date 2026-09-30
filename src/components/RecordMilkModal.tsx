import React, { useState, useEffect } from 'react';
import { Buyer, PaymentStatus, Sale } from '../types';
import { Modal } from './Modal';
import { formatMoney, getTodayString } from '../utils/formatters';

interface RecordMilkModalProps {
  isOpen: boolean;
  onClose: () => void;
  buyers: Buyer[];
  onSave: (saleData: Omit<Sale, 'id' | 'createdAt'>) => Promise<{ success: boolean; error?: string }>;
  onQuickAddBuyer?: (buyerData: Omit<Buyer, 'id' | 'createdAt'>) => Promise<{ success: boolean; error?: string; buyerId?: string }>;
  preselectedBuyerId?: string;
}

export const RecordMilkModal: React.FC<RecordMilkModalProps> = ({
  isOpen,
  onClose,
  buyers,
  onSave,
  onQuickAddBuyer,
  preselectedBuyerId,
}) => {
  const [litres, setLitres] = useState<string>('');
  const [selectedBuyerId, setSelectedBuyerId] = useState<string>('');
  const [pricePerLitre, setPricePerLitre] = useState<string>('3500');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Paid');
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Inline add new buyer state
  const [isAddingNewBuyer, setIsAddingNewBuyer] = useState(false);
  const [newBuyerName, setNewBuyerName] = useState('');
  const [newBuyerPhone, setNewBuyerPhone] = useState('');

  // Form submission & confirmation states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);
  const [lastSavedSummary, setLastSavedSummary] = useState<{ litres: number; amount: number; buyer: string } | null>(null);

  // Initialize/reset form whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setLitres('');
      setNotes('');
      setError(null);
      setIsSubmitting(false);
      setIsSavedSuccess(false);
      setLastSavedSummary(null);
      setIsAddingNewBuyer(false);
      setNewBuyerName('');
      setNewBuyerPhone('');

      if (preselectedBuyerId) {
        const found = buyers.find((b) => b.id === preselectedBuyerId);
        if (found) {
          setSelectedBuyerId(found.id);
          setPricePerLitre(found.pricePerLitre ? String(found.pricePerLitre) : '3500');
        }
      } else if (buyers.length > 0) {
        setSelectedBuyerId(buyers[0].id);
        setPricePerLitre(buyers[0].pricePerLitre ? String(buyers[0].pricePerLitre) : '3500');
      } else {
        setSelectedBuyerId('');
        setPricePerLitre('3500');
      }
    }
  }, [isOpen, preselectedBuyerId, buyers]);

  // Handle buyer change
  const handleSelectBuyer = (buyer: Buyer) => {
    setSelectedBuyerId(buyer.id);
    setIsAddingNewBuyer(false);
    if (buyer.pricePerLitre) {
      setPricePerLitre(String(buyer.pricePerLitre));
    }
  };

  // Immediate Calculations
  const numericLitres = parseFloat(litres) || 0;
  const numericPrice = parseFloat(pricePerLitre) || 0;
  const calculatedTotal = Math.round(numericLitres * numericPrice);

  // Sync amountReceived with payment status
  useEffect(() => {
    if (paymentStatus === 'Paid') {
      setAmountReceived(calculatedTotal > 0 ? String(calculatedTotal) : '');
    } else if (paymentStatus === 'Not Paid') {
      setAmountReceived('0');
    }
  }, [calculatedTotal, paymentStatus]);

  const numericReceived = parseFloat(amountReceived) || 0;
  const calculatedBalance = Math.max(0, calculatedTotal - numericReceived);

  // Handle form submit
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (numericLitres <= 0) {
      setError('Please enter how much milk was sold.');
      return;
    }
    if (numericPrice <= 0) {
      setError('Please enter a valid price per litre.');
      return;
    }

    let finalBuyerId = selectedBuyerId;
    let finalBuyerName = 'Milk Customer';

    // Handle inline new buyer
    if (isAddingNewBuyer) {
      if (!newBuyerName.trim()) {
        setError('Please enter the name of the buyer.');
        return;
      }
      finalBuyerName = newBuyerName.trim();

      if (onQuickAddBuyer) {
        try {
          const res = await onQuickAddBuyer({
            name: finalBuyerName,
            phone: newBuyerPhone.trim(),
            location: '',
            pricePerLitre: numericPrice,
          });
          if (res.buyerId) {
            finalBuyerId = res.buyerId;
          }
        } catch {
          // continue with sale recording
        }
      }
    } else {
      const b = buyers.find((x) => x.id === selectedBuyerId);
      if (b) {
        finalBuyerName = b.name;
        finalBuyerId = b.id;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await onSave({
        date: getTodayString(),
        buyerId: finalBuyerId,
        buyerName: finalBuyerName,
        litres: numericLitres,
        pricePerLitre: numericPrice,
        totalAmount: calculatedTotal,
        amountReceived: numericReceived,
        balance: calculatedBalance,
        paymentStatus,
        notes: notes.trim(),
      });

      if (res.success) {
        setLastSavedSummary({
          litres: numericLitres,
          amount: calculatedTotal,
          buyer: finalBuyerName,
        });
        setIsSavedSuccess(true);
      } else {
        setError(res.error || 'Could not record milk. Please try again.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error recording milk.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isSavedSuccess ? 'Milk Recorded' : 'Record Milk'}
      subtitle={isSavedSuccess ? 'Saved to farm records' : "Record today's milk delivery"}
    >
      {/* SUCCESS CONFIRMATION STATE */}
      {isSavedSuccess && lastSavedSummary ? (
        <div className="py-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#f0fdf4] text-[#166534] flex items-center justify-center mx-auto text-2xl font-bold">
            ✓
          </div>

          <div>
            <h3 className="text-xl font-bold text-[#18181b] m-0">
              Milk recorded
            </h3>
            <p className="text-xs text-[#64748b] mt-1 m-0">
              Successfully saved to farm records
            </p>
          </div>

          <div className="p-4 bg-[#f8fafc] rounded-xl border border-[#e2e8f0] max-w-xs mx-auto space-y-1">
            <div className="text-2xl font-bold text-[#166534] num-font">
              {lastSavedSummary.litres} litres
            </div>
            <div className="text-base font-bold text-[#18181b] num-font">
              {formatMoney(lastSavedSummary.amount)}
            </div>
            <div className="text-xs text-[#64748b] pt-1">
              Sold to {lastSavedSummary.buyer}
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={onClose}
              className="btn-farm-primary w-full py-3 text-sm font-semibold rounded-lg"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        /* MAIN RECORD MILK FORM */
        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          {/* 1. HOW MUCH MILK DID YOU SELL? */}
          <div>
            <label className="block text-sm font-bold text-[#18181b] mb-1.5">
              How much milk did you sell?
            </label>

            <div className="relative">
              <input
                type="number"
                step="any"
                min="0.1"
                placeholder="0"
                value={litres}
                onChange={(e) => setLitres(e.target.value)}
                autoFocus
                required
                className="w-full pl-4 pr-16 py-3 text-2xl md:text-3xl font-bold bg-white border border-[#e2e8f0] focus:border-[#166534] rounded-lg text-[#18181b] focus:outline-none transition-colors num-font"
              />
              <span className="absolute right-4 top-4 text-xs font-bold text-[#64748b] uppercase tracking-wider">
                Litres
              </span>
            </div>

            {/* Quick Litres Presets */}
            <div className="flex gap-1.5 mt-2">
              {[10, 20, 30, 50, 70].map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setLitres(String(preset))}
                  className="px-2.5 py-1 text-xs font-semibold rounded-md bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#64748b] border border-[#e2e8f0] transition-colors"
                >
                  +{preset}L
                </button>
              ))}
            </div>
          </div>

          {/* 2. WHO BOUGHT IT? */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-bold text-[#18181b] m-0">
                Who bought it?
              </label>
              {!isAddingNewBuyer && (
                <button
                  type="button"
                  onClick={() => setIsAddingNewBuyer(true)}
                  className="text-xs font-semibold text-[#166534] hover:underline"
                >
                  + New Buyer
                </button>
              )}
            </div>

            {/* Buyer selection pills */}
            {!isAddingNewBuyer ? (
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                {buyers.map((b) => {
                  const isSelected = selectedBuyerId === b.id;
                  return (
                    <button
                      type="button"
                      key={b.id}
                      onClick={() => handleSelectBuyer(b)}
                      className={`p-2.5 rounded-lg text-left border transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-[#f0fdf4] border-[#166534] ring-1 ring-[#166534]'
                          : 'bg-white border-[#e2e8f0] hover:bg-[#f8fafc]'
                      }`}
                    >
                      <div className="font-semibold text-xs text-[#18181b] truncate">
                        {b.name}
                      </div>
                      <div className="text-[11px] text-[#64748b] mt-0.5">
                        {b.pricePerLitre ? formatMoney(b.pricePerLitre) : '3,500'}/L
                      </div>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setIsAddingNewBuyer(true)}
                  className="p-2.5 rounded-lg border border-dashed border-[#cbd5e1] text-[#64748b] hover:bg-[#f8fafc] text-xs font-semibold flex items-center justify-center transition-colors"
                >
                  + Add Buyer
                </button>
              </div>
            ) : (
              /* Inline new buyer inputs */
              <div className="p-3 bg-[#f8fafc] rounded-lg border border-[#e2e8f0] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#18181b]">
                    New Buyer
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewBuyer(false)}
                    className="text-xs text-[#64748b] hover:text-[#18181b]"
                  >
                    Cancel
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Buyer Name (e.g. John or Kagoma Hotel)"
                  value={newBuyerName}
                  onChange={(e) => setNewBuyerName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#e2e8f0] rounded-md text-[#18181b] focus:outline-none focus:border-[#166534]"
                />
                <input
                  type="tel"
                  placeholder="Phone number (optional)"
                  value={newBuyerPhone}
                  onChange={(e) => setNewBuyerPhone(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#e2e8f0] rounded-md text-[#18181b] focus:outline-none focus:border-[#166534]"
                />
              </div>
            )}
          </div>

          {/* 3 & 4. PRICE & AUTOMATIC TOTAL */}
          <div className="p-3 bg-[#f8fafc] rounded-lg border border-[#e2e8f0] space-y-2">
            <div className="grid grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1">
                  Price per litre
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-semibold text-[#64748b]">UGX</span>
                  <input
                    type="number"
                    step="50"
                    min="500"
                    value={pricePerLitre}
                    onChange={(e) => setPricePerLitre(e.target.value)}
                    className="w-full px-2 py-1 text-sm font-bold bg-white border border-[#e2e8f0] rounded text-[#18181b] focus:outline-none focus:border-[#166534] num-font"
                  />
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-medium text-[#64748b]">
                  Total Amount
                </span>
                <div className="text-lg font-bold text-[#166534] num-font mt-0.5">
                  {formatMoney(calculatedTotal)}
                </div>
              </div>
            </div>

            {/* Clear Calculation Display: e.g. 40 L × UGX 3,500 = UGX 140,000 */}
            {numericLitres > 0 && numericPrice > 0 && (
              <div className="pt-1.5 border-t border-[#e2e8f0] text-center text-xs font-semibold text-[#18181b] font-mono">
                {numericLitres} L × {formatMoney(numericPrice)} = {formatMoney(calculatedTotal)}
              </div>
            )}
          </div>

          {/* 5. WAS IT PAID? */}
          <div>
            <label className="block text-sm font-bold text-[#18181b] mb-1.5">
              Payment
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { status: 'Paid', label: 'Paid' },
                { status: 'Partly Paid', label: 'Partly paid' },
                { status: 'Not Paid', label: 'Not yet paid' },
              ].map((opt) => {
                const isSelected = paymentStatus === opt.status;
                return (
                  <button
                    type="button"
                    key={opt.status}
                    onClick={() => setPaymentStatus(opt.status as PaymentStatus)}
                    className={`py-2 px-2 text-xs font-semibold rounded-lg border transition-colors text-center ${
                      isSelected
                        ? opt.status === 'Paid'
                          ? 'bg-[#f0fdf4] text-[#166534] border-[#166534]'
                          : opt.status === 'Not Paid'
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-white text-[#64748b] border-[#e2e8f0] hover:bg-[#f8fafc]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Paid Feedback */}
            {paymentStatus === 'Paid' && calculatedTotal > 0 && (
              <div className="mt-2 text-xs text-[#166534] font-medium p-2 bg-[#f0fdf4] rounded-md border border-[#bbf7d0]">
                {formatMoney(calculatedTotal)} received in cash
              </div>
            )}

            {/* Not Yet Paid Feedback */}
            {paymentStatus === 'Not Paid' && calculatedTotal > 0 && (
              <div className="mt-2 text-xs text-amber-800 font-medium p-2 bg-amber-50 rounded-md border border-amber-200">
                {formatMoney(calculatedTotal)} will be owed by buyer
              </div>
            )}

            {/* Partly Paid Input */}
            {paymentStatus === 'Partly Paid' && (
              <div className="mt-2 p-3 bg-[#f8fafc] rounded-lg border border-[#e2e8f0] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#18181b]">
                    Amount received (UGX)
                  </span>
                  <span className="text-xs font-bold text-amber-800">
                    Owed: {formatMoney(calculatedBalance)}
                  </span>
                </div>
                <input
                  type="number"
                  step="500"
                  min="0"
                  max={calculatedTotal}
                  placeholder="e.g. 50000"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm font-bold bg-white border border-[#e2e8f0] rounded-md text-[#18181b] focus:outline-none focus:border-[#166534]"
                />
              </div>
            )}
          </div>

          {/* Optional Note */}
          <div>
            <input
              type="text"
              placeholder="Note (optional, e.g. Morning delivery)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-[#e2e8f0] rounded-lg text-[#18181b] focus:outline-none focus:border-[#166534]"
            />
          </div>

          {/* SAVE BUTTON */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-farm-primary py-3.5 text-sm font-bold rounded-lg disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Record'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
