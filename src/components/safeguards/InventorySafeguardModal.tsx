import React from 'react';
import { AlertTriangle, ShieldAlert, Package, TrendingDown, CheckCircle2, RotateCcw, X, AlertCircle } from 'lucide-react';

export interface InventorySafeguardDetails {
  isOpen: boolean;
  productName: string;
  currentStock: number;
  attemptedStock: number;
  totalBranchStock?: number;
  reason: 'zero_stock' | 'large_deduction';
  onConfirmAdjustment: () => void;
}

export interface InventorySafeguardModalProps {
  details: InventorySafeguardDetails | null;
  themeMode?: 'light' | 'dark';
  onClose: () => void;
}

export const InventorySafeguardModal: React.FC<InventorySafeguardModalProps> = ({
  details,
  themeMode = 'light',
  onClose,
}) => {
  if (!details || !details.isOpen) return null;

  const isDark = themeMode === 'dark';
  const { productName, currentStock, attemptedStock, totalBranchStock, reason, onConfirmAdjustment } = details;

  const unitsDeducted = Math.max(0, currentStock - attemptedStock);
  const deductionPct = currentStock > 0 ? Math.round((unitsDeducted / currentStock) * 100) : 0;
  const isZeroing = attemptedStock === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inventory-safeguard-title"
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
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />

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
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="pr-6">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
              Inventory Ledger Safeguard
            </span>
            <h3 id="inventory-safeguard-title" className="text-lg font-black tracking-tight mt-1 leading-snug text-neutral-900 dark:text-white">
              {isZeroing ? 'Zero Stock Depletion Warning' : 'High-Volume Stock Deduction'}
            </h3>
          </div>
        </div>

        {/* Warning Explanation */}
        <div className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed mb-4 space-y-2">
          {isZeroing ? (
            <p>
              You are setting the on-hand stock for <strong className="text-neutral-900 dark:text-white font-bold">{productName}</strong> to <strong className="text-red-500 font-bold">0 units</strong>.
              This will mark this flavor as <em>Out of Stock</em> and disable POS sales for this item until restocked.
            </p>
          ) : (
            <p>
              You are manually deducting <strong className="text-red-500 font-bold">{unitsDeducted} units ({deductionPct}%)</strong> of <strong className="text-neutral-900 dark:text-white font-bold">{productName}</strong>, which exceeds the <strong className="text-neutral-900 dark:text-white font-bold">10% manual adjustment safeguard threshold</strong>.
            </p>
          )}

          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-800 dark:text-amber-300 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Inventory Audit Record:</span> All manual adjustments create a non-editable timestamped ledger entry visible to Commissary HQ auditors.
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
            <span className="text-neutral-500 flex items-center space-x-1.5">
              <Package className="w-3.5 h-3.5 text-neutral-400" />
              <span>Gourmet Flavor:</span>
            </span>
            <span className="font-bold text-neutral-900 dark:text-white">{productName}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-500">Current Ledger Stock:</span>
            <span className="font-mono font-bold text-neutral-900 dark:text-white">
              {currentStock} units
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-500 flex items-center space-x-1">
              <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              <span>Attempted Stock Adjustment:</span>
            </span>
            <span className="font-mono font-black text-sm text-red-500">
              {attemptedStock} units (-{unitsDeducted} units / {deductionPct}%)
            </span>
          </div>

          <div className="pt-2 border-t border-dashed border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-[11px]">
            <span className="text-neutral-400">Safeguard Threshold:</span>
            <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
              {isZeroing ? 'Stock Level = 0 (Critical Out-of-Stock)' : 'Deduction > 10% of Available Stock'}
            </span>
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
            <span>Keep Current Stock</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onConfirmAdjustment();
              onClose();
            }}
            className="w-full py-3 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 active:scale-[0.98]"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm Stock Adjustment</span>
          </button>
        </div>
      </div>
    </div>
  );
};
