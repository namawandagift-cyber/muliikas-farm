import React, { useState, useEffect } from 'react';
import { Buyer } from '../types';
import { Modal } from './Modal';

interface BuyerModalProps {
  isOpen: boolean;
  onClose: () => void;
  buyerToEdit: Buyer | null;
  onSaveBuyer: (buyerData: Omit<Buyer, 'id' | 'createdAt'>) => Promise<{ success: boolean; error?: string }>;
  onUpdateBuyer: (buyerData: Partial<Buyer> & { id: string }) => Promise<{ success: boolean; error?: string }>;
}

export const BuyerModal: React.FC<BuyerModalProps> = ({
  isOpen,
  onClose,
  buyerToEdit,
  onSaveBuyer,
  onUpdateBuyer,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [pricePerLitre, setPricePerLitre] = useState<string>('3500');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (buyerToEdit) {
        setName(buyerToEdit.name);
        setPhone(buyerToEdit.phone || '');
        setLocation(buyerToEdit.location || '');
        setPricePerLitre(String(buyerToEdit.pricePerLitre || 3500));
      } else {
        setName('');
        setPhone('');
        setLocation('');
        setPricePerLitre('3500');
      }
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, buyerToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Buyer name is required.');
      return;
    }

    const price = parseFloat(pricePerLitre);
    if (isNaN(price) || price <= 0) {
      setError('Please enter a valid price per litre.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (buyerToEdit) {
        const res = await onUpdateBuyer({
          id: buyerToEdit.id,
          name: name.trim(),
          phone: phone.trim(),
          location: location.trim(),
          pricePerLitre: Math.round(price),
        });
        if (res.success) onClose();
        else setError(res.error || 'Failed to update buyer.');
      } else {
        const res = await onSaveBuyer({
          name: name.trim(),
          phone: phone.trim(),
          location: location.trim(),
          pricePerLitre: Math.round(price),
        });
        if (res.success) onClose();
        else setError(res.error || 'Failed to add buyer.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error saving buyer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={buyerToEdit ? 'Edit Buyer' : 'Add Buyer'}
      subtitle="Save buyer details and agreed price per litre"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-[#18181b] mb-1">
            Buyer / Business Name
          </label>
          <input
            type="text"
            placeholder="e.g. Mama Sarah Milk Bar"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 text-xs bg-white border border-[#e2e8f0] rounded-lg text-[#18181b] focus:outline-none focus:border-[#166534]"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-xs font-semibold text-[#18181b] mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            placeholder="e.g. 0782 123456"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white border border-[#e2e8f0] rounded-lg text-[#18181b] focus:outline-none focus:border-[#166534]"
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-xs font-semibold text-[#18181b] mb-1">
            Location / Drop-off
          </label>
          <input
            type="text"
            placeholder="e.g. Trading Centre Shop #4"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white border border-[#e2e8f0] rounded-lg text-[#18181b] focus:outline-none focus:border-[#166534]"
          />
        </div>

        {/* Price Per Litre */}
        <div>
          <label className="block text-xs font-semibold text-[#18181b] mb-1">
            Agreed Price per Litre (UGX)
          </label>
          <input
            type="number"
            step="50"
            min="500"
            value={pricePerLitre}
            onChange={(e) => setPricePerLitre(e.target.value)}
            required
            className="w-full px-3 py-2 text-sm font-bold bg-white border border-[#e2e8f0] rounded-lg text-[#18181b] focus:outline-none focus:border-[#166534] num-font"
          />
          <p className="text-[11px] text-[#64748b] mt-1 m-0">
            This price will pre-fill whenever milk is sold to this buyer.
          </p>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full btn-farm-primary py-3 text-sm font-semibold rounded-lg disabled:opacity-50"
          >
            {isSubmitting
              ? 'Saving...'
              : buyerToEdit
              ? 'Save Changes'
              : 'Add Buyer'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
