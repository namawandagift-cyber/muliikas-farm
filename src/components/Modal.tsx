import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`relative w-full ${maxWidthClasses} bg-white rounded-t-xl sm:rounded-xl shadow-xl border border-[#e2e8f0] overflow-hidden max-h-[90vh] flex flex-col z-10 animate-in slide-in-from-bottom sm:zoom-in-95 duration-150`}
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-[#e2e8f0] bg-white flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#18181b] m-0">{title}</h3>
            {subtitle && (
              <p className="text-xs text-[#64748b] m-0 mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#18181b] transition-colors"
            aria-label="Close dialog"
          >
            <i className="bi bi-x-lg text-sm"></i>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};
