import React, { useState, useEffect } from 'react';
import { Expense, ExpenseCategory } from '../types';
import { Modal } from './Modal';
import { getTodayString } from '../utils/formatters';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expenseData: Omit<Expense, 'id' | 'createdAt'>) => Promise<{ success: boolean; error?: string }>;
}

const CATEGORIES: ExpenseCategory[] = [
  'Feed',
  'Transport',
  'Medicine',
  'Labour',
  'Fuel',
  'Repairs',
  'Other',
];

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [date, setDate] = useState(getTodayString());
  const [category, setCategory] = useState<ExpenseCategory>('Feed');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDate(getTodayString());
      setCategory('Feed');
      setAmount('');
      setDescription('');
      setNotes('');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid expense amount in UGX.');
      return;
    }

    if (!description.trim()) {
      setError('Please provide a short description.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onSave({
        date,
        category,
        amount: Math.round(numericAmount),
        description: description.trim(),
        notes: notes.trim(),
      });

      if (res.success) {
        onClose();
      } else {
        setError(res.error || 'Failed to save expense.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error saving expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Expense"
      subtitle="Log money spent on farm feed, labour, transport, or supplies"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        {/* Date */}
        <div>
          <label className="block text-xs font-semibold text-[#18181b] mb-1">
            Date Spent
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full px-3 py-2 text-xs bg-white border border-[#e2e8f0] rounded-lg text-[#18181b] focus:outline-none focus:border-[#166534]"
          />
        </div>

        {/* Category Grid */}
        <div>
          <label className="block text-xs font-semibold text-[#18181b] mb-1.5">
            Expense Category
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat;
              return (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`py-2 px-2 rounded-lg text-xs font-semibold border text-center transition-colors ${
                    isSelected
                      ? 'bg-[#166534] text-white border-[#166534]'
                      : 'bg-white text-[#64748b] border-[#e2e8f0] hover:text-[#18181b]'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs font-semibold text-[#18181b] mb-1">
            Amount Spent (UGX)
          </label>
          <input
            type="number"
            step="500"
            min="100"
            placeholder="e.g. 60000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="w-full px-3 py-2 text-sm font-bold bg-white border border-[#e2e8f0] rounded-lg text-[#18181b] focus:outline-none focus:border-[#166534] num-font"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-[#18181b] mb-1">
            What was this for?
          </label>
          <input
            type="text"
            placeholder="e.g. 2 bags dairy meal, boda transport, milker pay"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="w-full px-3 py-2 text-xs bg-white border border-[#e2e8f0] rounded-lg text-[#18181b] focus:outline-none focus:border-[#166534]"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-[#18181b] mb-1">
            Notes (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Bought from Kagoma Feeds store"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white border border-[#e2e8f0] rounded-lg text-[#18181b] focus:outline-none focus:border-[#166534]"
          />
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full btn-farm-primary py-3 text-sm font-semibold rounded-lg disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Expense'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
