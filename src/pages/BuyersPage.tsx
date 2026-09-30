import React from 'react';
import { Buyer } from '../types';
import { formatMoney } from '../utils/formatters';

interface BuyersPageProps {
  buyers: Buyer[];
  onOpenAddBuyer: () => void;
  onOpenEditBuyer: (buyer: Buyer) => void;
  onDeleteBuyer: (id: string, name: string) => Promise<{ success: boolean; error?: string }>;
  onOpenRecordMilk: (buyerId: string) => void;
}

export const BuyersPage: React.FC<BuyersPageProps> = ({
  buyers,
  onOpenAddBuyer,
  onOpenEditBuyer,
  onDeleteBuyer,
  onOpenRecordMilk,
}) => {
  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Delete buyer "${name}"?`)) {
      await onDeleteBuyer(id, name);
    }
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      {/* Page Heading & Action */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-2xl font-bold text-[#18181b] tracking-tight m-0">
            Buyers
          </h2>
          <p className="text-xs text-[#64748b] mt-0.5 m-0">
            Manage regular milk buyers and their agreed prices
          </p>
        </div>
        <button
          onClick={onOpenAddBuyer}
          className="btn-farm-primary text-xs md:text-sm py-2 px-3.5 flex items-center gap-1.5"
        >
          <span>+ Add Buyer</span>
        </button>
      </div>

      {/* Buyer Count Summary */}
      <div className="flex items-center justify-between text-xs text-[#64748b] px-0.5">
        <span>{buyers.length} regular buyer{buyers.length === 1 ? '' : 's'} registered</span>
      </div>

      {/* Buyers List */}
      {buyers.length === 0 ? (
        <div className="clean-card p-8 text-center space-y-3">
          <div className="text-sm font-semibold text-[#18181b]">
            No buyers added yet
          </div>
          <p className="text-xs text-[#64748b] max-w-xs mx-auto m-0">
            Add regular customers, cooperatives, or local hotels to save their agreed price per litre.
          </p>
          <button
            onClick={onOpenAddBuyer}
            className="btn-farm-primary text-xs py-2 px-4 inline-block mt-2"
          >
            + Add First Buyer
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {buyers.map((buyer) => (
            <div
              key={buyer.id}
              className="clean-card p-4 transition-colors hover:border-[#cbd5e1]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-bold text-base text-[#18181b]">
                    {buyer.name}
                  </div>

                  <div className="text-xs text-[#64748b] space-y-0.5">
                    {buyer.location && (
                      <div>
                        Location: <span className="text-[#18181b] font-medium">{buyer.location}</span>
                      </div>
                    )}
                    {buyer.phone && (
                      <div>
                        Phone:{' '}
                        <a
                          href={`tel:${buyer.phone}`}
                          className="text-[#166534] font-semibold hover:underline"
                        >
                          {buyer.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Agreed price per litre */}
                <div className="text-right shrink-0">
                  <div className="text-xs uppercase font-medium text-[#64748b]">
                    Agreed Price
                  </div>
                  <div className="text-base font-bold text-[#166534] num-font">
                    {formatMoney(buyer.pricePerLitre)} / L
                  </div>
                </div>
              </div>

              {/* Action buttons row */}
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#f1f5f9]">
                <button
                  onClick={() => onOpenRecordMilk(buyer.id)}
                  className="px-3 py-1.5 bg-[#f0fdf4] text-[#166534] text-xs font-semibold rounded-md border border-[#bbf7d0] hover:bg-[#dcfce7] transition-colors"
                >
                  Record Milk
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenEditBuyer(buyer)}
                    className="px-2.5 py-1 text-xs font-medium text-[#64748b] hover:text-[#18181b] hover:bg-[#f1f5f9] rounded-md transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(buyer.id, buyer.name)}
                    className="px-2.5 py-1 text-xs font-medium text-[#94a3b8] hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
