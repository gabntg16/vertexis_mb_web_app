import React from 'react';
import { ShieldAlert, Tag, Percent, AlertCircle, CheckCircle2, RotateCcw, X } from 'lucide-react';

export interface HighDiscountSafeguardDetails {
  isOpen: boolean;
  grossSubtotal: number;
  discountType: string;
  discountAmount: number;
  netPayable: number;
  thresholdPercentage: number;
}

export interface HighDiscountSafeguardModalProps {
  details: HighDiscountSafeguardDetails | null;
  themeMode?: 'light' | 'dark';
  onClose: () => void;
  onConfirm: () => void;
}

export const HighDiscountSafeguardModal: React.FC<HighDiscountSafeguardModalProps> = ({
  details,
  themeMode = 'light',
  onClose,
  onConfirm,
}) => {
  if (!details || !details.isOpen) return null;

  const isDark = themeMode === 'dark';
  const { grossSubtotal, discountType, discountAmount, netPayable, thresholdPercentage = 20 } = details;

  const discountPercentage = grossSubtotal > 0 ? Math.round((discountAmount / grossSubtotal) * 100) : 0;
  const isNearZero = netPayable <= 10 && grossSubtotal > 50;
  const maxThresholdAmount = Math.round(grossSubtotal * (thresholdPercentage / 100));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="discount-safeguard-title"
    >
      <div
        className={`w-full max-w-lg rounded-3xl p-6 border shadow-2xl transition-all relative overflow-hidden animate-in zoom-in-95 duration-200 ${
          isDark
            ? 'bg-neutral-900 border-red-500/40 text-neutral-100 shadow-red-950/30'
            : 'bg-white border-red-500/40 text-neutral-900 shadow-red-500/15'
        }`}
      >
        {/* Decorative ambient glow */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-red-500/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className={`absolute top-4 right-4 p-1.5 rounded-full transition-colors ${
            isDark ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100'
          }`}
          title="Cancel"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-start space-x-3.5 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 shadow-xs">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="pr-6">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/25">
              High-Value Discount Safeguard
            </span>
            <h3 id="discount-safeguard-title" className="text-lg font-black tracking-tight mt-1 leading-snug text-neutral-900 dark:text-white">
              Excessive Discount Authorization
            </h3>
          </div>
        </div>

        {/* Warning Message */}
        <div className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed mb-4 space-y-2">
          <p>
            The selected discount reduces the order total by <strong className="text-red-500 font-bold">₱{discountAmount.toLocaleString()} ({discountPercentage}%)</strong>.
            Standard branch limit without senior/PWD statutory exemption is <strong className="text-neutral-900 dark:text-white font-bold">{thresholdPercentage}% (₱{maxThresholdAmount.toLocaleString()})</strong>.
          </p>

          {isNearZero && (
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-[11px] text-red-800 dark:text-red-300 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Near-Zero Order Warning:</span> This discount brings the final payable amount down to <strong>₱{netPayable.toLocaleString()}</strong>.
              </div>
            </div>
          )}
        </div>

        {/* Breakdown Card */}
        <div
          className={`p-4 rounded-2xl border mb-5 space-y-2.5 text-xs ${
            isDark ? 'bg-neutral-850 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
          }`}
        >
          <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
            <span className="text-neutral-500">Gross Sales Value:</span>
            <span className="font-mono font-bold text-neutral-900 dark:text-white">
              ₱{grossSubtotal.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-500 flex items-center space-x-1">
              <Tag className="w-3.5 h-3.5 text-red-500" />
              <span>Applied Discount ({discountType.toUpperCase()}):</span>
            </span>
            <span className="font-mono font-black text-sm text-red-500">
              -₱{discountAmount.toLocaleString()} ({discountPercentage}%)
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-500">Standard Threshold:</span>
            <span className="font-mono font-semibold text-neutral-600 dark:text-neutral-400">
              Max {thresholdPercentage}% (₱{maxThresholdAmount.toLocaleString()})
            </span>
          </div>

          <div className="pt-2 border-t border-dashed border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <span className="font-bold text-neutral-700 dark:text-neutral-300">Final Order Net Payable:</span>
            <span className="font-mono font-black text-base text-[#F37021]">
              ₱{netPayable.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className={`w-full py-3 px-4 rounded-2xl text-xs font-bold border transition-all flex items-center justify-center space-x-2 ${
              isDark
                ? 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-neutral-200'
                : 'bg-neutral-100 border-neutral-200 hover:bg-neutral-200 text-neutral-800'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Cancel / Adjust Discount</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="w-full py-3 px-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 active:scale-[0.98]"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Authorize & Proceed</span>
          </button>
        </div>
      </div>
    </div>
  );
};
