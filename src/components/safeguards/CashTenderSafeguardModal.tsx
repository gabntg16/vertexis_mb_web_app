import React from 'react';
import { AlertCircle, Banknote, CheckCircle2, ArrowRight, RotateCcw, ShieldAlert, Sparkles, X } from 'lucide-react';

export interface CashTenderSafeguardDetails {
  isOpen: boolean;
  orderTotal: number;
  cashTendered: number;
  changeDue: number;
  paymentMode: 'single' | 'split';
  splitSecondaryMethod?: string;
  splitSecondaryAmount?: number;
}

export interface CashTenderSafeguardModalProps {
  details: CashTenderSafeguardDetails | null;
  themeMode?: 'light' | 'dark';
  onClose: () => void;
  onConfirm: () => void;
}

export const CashTenderSafeguardModal: React.FC<CashTenderSafeguardModalProps> = ({
  details,
  themeMode = 'light',
  onClose,
  onConfirm,
}) => {
  if (!details || !details.isOpen) return null;

  const isDark = themeMode === 'dark';
  const { orderTotal, cashTendered, changeDue } = details;
  const difference = cashTendered - orderTotal;
  const ratio = orderTotal > 0 ? (cashTendered / orderTotal).toFixed(1) : '0';

  const isHighMultiplier = orderTotal > 0 && cashTendered >= orderTotal * 5;
  const isHighDifference = difference > 2000;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tender-safeguard-title"
    >
      <div
        className={`w-full max-w-lg rounded-3xl p-6 border shadow-2xl transition-all relative overflow-hidden animate-in zoom-in-95 duration-200 ${
          isDark
            ? 'bg-neutral-900 border-amber-500/40 text-neutral-100 shadow-amber-950/30'
            : 'bg-white border-amber-500/40 text-neutral-900 shadow-amber-500/15'
        }`}
      >
        {/* Decorative ambient glow */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
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

        {/* Header with High-Visibility Safeguard Icon */}
        <div className="flex items-start space-x-3.5 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="pr-6">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
              POS Tender Validation Safeguard
            </span>
            <h3 id="tender-safeguard-title" className="text-lg font-black tracking-tight mt-1 leading-snug text-neutral-900 dark:text-white">
              High Cash Tender Verification
            </h3>
          </div>
        </div>

        {/* Explanation Message */}
        <div className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed mb-4 space-y-2">
          <p>
            The cash tendered (<strong className="text-neutral-900 dark:text-white font-bold">₱{cashTendered.toLocaleString()}</strong>) is unusually high compared to the total order amount (<strong className="text-neutral-900 dark:text-white font-bold">₱{orderTotal.toLocaleString()}</strong>).
          </p>
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-800 dark:text-amber-300 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Accidental Input Warning:</span> Please check if an extra zero was typed by mistake (e.g. typing ₱5,000 for a ₱500 bill).
            </div>
          </div>
        </div>

        {/* Metric Comparison Card */}
        <div
          className={`p-4 rounded-2xl border mb-5 space-y-2.5 text-xs ${
            isDark ? 'bg-neutral-850 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
          }`}
        >
          <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
            <span className="text-neutral-500">Order Net Payable:</span>
            <span className="font-mono font-black text-sm text-neutral-900 dark:text-white">
              ₱{orderTotal.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-500 flex items-center space-x-1">
              <Banknote className="w-3.5 h-3.5 text-amber-500" />
              <span>Cash Tendered by Customer:</span>
            </span>
            <span className="font-mono font-black text-base text-amber-600 dark:text-amber-400">
              ₱{cashTendered.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-500">Calculated Change Due:</span>
            <span className="font-mono font-black text-base text-emerald-600 dark:text-emerald-400">
              ₱{changeDue.toLocaleString()}
            </span>
          </div>

          <div className="pt-2 border-t border-dashed border-neutral-200 dark:border-neutral-800 grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-neutral-400 block">Tender Multiplier:</span>
              <span className={`font-mono font-bold ${isHighMultiplier ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-700 dark:text-neutral-300'}`}>
                {ratio}× of Order Total
              </span>
            </div>
            <div>
              <span className="text-neutral-400 block">Tender Overpay:</span>
              <span className={`font-mono font-bold ${isHighDifference ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-700 dark:text-neutral-300'}`}>
                +₱{difference.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
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
            <span>Edit Cash Amount</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="w-full py-3 px-4 rounded-2xl bg-[#F37021] hover:bg-[#d95d14] text-white text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 active:scale-[0.98]"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm Tender (₱{cashTendered.toLocaleString()})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
