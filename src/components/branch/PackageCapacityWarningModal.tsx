import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Layers, ArrowUpRight, X, Sparkles, Check, ArrowRight } from 'lucide-react';
import { PackageTier, PACKAGE_TIERS } from './BranchOrders';

export interface PackageExceedWarningDetails {
  isOpen: boolean;
  tier: PackageTier;
  attemptedTotal: number;
  maxCap: number;
  productFlavor?: string;
  reason: 'cap_reached' | 'input_exceeded' | 'tier_switch_exceeded';
  targetTier?: PackageTier;
}

export interface PackageCapacityWarningModalProps {
  warning: PackageExceedWarningDetails | null;
  themeMode?: 'light' | 'dark';
  onClose: () => void;
  onUpgradeTier?: (tierId: 'silver' | 'gold' | 'platinum') => void;
  onAutoAdjust?: () => void;
}

export const PackageCapacityWarningModal: React.FC<PackageCapacityWarningModalProps> = ({
  warning,
  themeMode = 'light',
  onClose,
  onUpgradeTier,
  onAutoAdjust,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Escape key handler & scroll lock
  useEffect(() => {
    if (!warning || !warning.isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [warning, onClose]);

  if (!warning || !warning.isOpen || !mounted || typeof document === 'undefined') return null;

  const isDark = themeMode === 'dark';
  const { tier, attemptedTotal, maxCap, productFlavor, reason, targetTier } = warning;

  // Determine available upgrade tiers
  let nextTier: PackageTier | null = null;
  let highestTier: PackageTier | null = null;
  if (tier.id === 'silver') {
    nextTier = PACKAGE_TIERS.find((t) => t.id === 'gold') || null;
    highestTier = PACKAGE_TIERS.find((t) => t.id === 'platinum') || null;
  } else if (tier.id === 'gold') {
    nextTier = PACKAGE_TIERS.find((t) => t.id === 'platinum') || null;
  }

  const excessCount = Math.max(1, attemptedTotal - maxCap);

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exceed-dialog-title"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md mx-4 sm:mx-auto my-auto rounded-3xl p-4 sm:p-6 border shadow-2xl transition-all relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 ${
          isDark
            ? 'bg-neutral-900 border-amber-500/30 text-neutral-100 shadow-amber-950/20'
            : 'bg-white border-amber-500/30 text-neutral-900 shadow-amber-500/10'
        }`}
      >
        {/* Subtle decorative glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className={`absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-2 rounded-xl transition-colors cursor-pointer ${
            isDark ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100'
          }`}
          title="Close Warning"
          aria-label="Close Warning"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with glowing icon badge */}
        <div className="flex items-start space-x-3.5 mb-4">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="pr-6">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
              Maximum Limit Reached
            </span>
            <h3 id="exceed-dialog-title" className="text-base sm:text-lg font-black tracking-tight mt-1 leading-snug text-neutral-900 dark:text-white">
              Package Limit Reached
            </h3>
          </div>
        </div>

        {/* Action Prevented & Limit Explanation */}
        <div className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed mb-4 space-y-1.5">
          {reason === 'cap_reached' && (
            <p>
              The action was prevented because you have reached the strict maximum base capacity limit of{' '}
              <strong className="text-neutral-900 dark:text-white font-bold">{tier.baseCapacity} packs</strong> for the{' '}
              <strong className="text-[#F37021] font-bold">{tier.name} Package</strong>.
            </p>
          )}

          {reason === 'input_exceeded' && (
            <p>
              The entered quantity for <strong className="text-neutral-900 dark:text-white font-bold">{productFlavor || 'this flavor'}</strong> was prevented from exceeding the strict base limit of{' '}
              <strong className="text-neutral-900 dark:text-white font-bold">{tier.baseCapacity} packs</strong> for the{' '}
              <strong className="text-[#F37021] font-bold">{tier.name} Package</strong> (attempted {attemptedTotal} packs).
            </p>
          )}

          {reason === 'tier_switch_exceeded' && (
            <p>
              Your current order contains <strong className="text-red-500 font-bold">{attemptedTotal} packs</strong>, which exceeds the{' '}
              <strong className="text-[#F37021] font-bold">{targetTier?.name || 'selected'} Package</strong> strict base limit of{' '}
              <strong className="text-neutral-900 dark:text-white font-bold">{targetTier?.baseCapacity || maxCap} packs</strong>.
            </p>
          )}
        </div>

        {/* Explicit Recommendation Card */}
        <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-neutral-900 dark:text-neutral-100">
          <div className="flex items-center space-x-2 mb-1.5">
            <Sparkles className="w-4 h-4 text-[#F37021]" />
            <span className="text-xs font-black text-[#d95d12] dark:text-amber-300 uppercase tracking-wide">
              Recommendation to Order More Packs
            </span>
          </div>
          <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
            {nextTier ? (
              <>
                If you wish to order more packs, we explicitly recommend switching to a higher-tier package:{' '}
                <strong className="font-bold text-neutral-900 dark:text-white">
                  {nextTier.name} Package ({nextTier.baseCapacity} packs)
                </strong>
                {highestTier && highestTier.id !== nextTier.id && (
                  <>
                    {' '}or{' '}
                    <strong className="font-bold text-neutral-900 dark:text-white">
                      {highestTier.name} Package ({highestTier.baseCapacity} packs)
                    </strong>
                  </>
                )}
                . Switching will preserve your selected flavors and unlock additional pack capacity.
              </>
            ) : (
              <>
                You have reached the maximum capacity of our highest tier (<strong className="font-bold text-neutral-900 dark:text-white">{tier.name} Package, {tier.baseCapacity} packs</strong>). If you require larger bulk commissary quantities, please submit a separate requisition or contact commissary dispatch.
              </>
            )}
          </p>
        </div>

        {/* Breakdown Metric Card */}
        <div className={`p-3 rounded-2xl border mb-4 space-y-1.5 text-xs ${
          isDark ? 'bg-neutral-850 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
        }`}>
          <div className="flex items-center justify-between pb-1.5 border-b border-neutral-200 dark:border-neutral-800">
            <span className="text-neutral-500 flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-neutral-400" />
              <span>Current Package:</span>
            </span>
            <span className="font-bold text-neutral-900 dark:text-white">
              {tier.name} Package ({tier.baseCapacity} packs)
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-500">Strict Base Capacity Limit:</span>
            <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
              {tier.baseCapacity} packs
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-500">Attempted Total:</span>
            <span className="font-mono font-bold text-red-500">
              {attemptedTotal} packs
            </span>
          </div>

          {excessCount > 0 && attemptedTotal > tier.baseCapacity && (
            <div className="flex items-center justify-between pt-1 border-t border-dashed border-neutral-200 dark:border-neutral-800 text-[11px]">
              <span className="text-amber-600 dark:text-amber-400 font-medium">Prevented Excess:</span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                +{excessCount} pack(s)
              </span>
            </div>
          )}
        </div>

        {/* Actions - Vertical Stack with Full Width */}
        <div className="flex flex-col space-y-2 w-full mt-4">
          {nextTier && onUpgradeTier && (
            <button
              type="button"
              onClick={() => {
                onUpgradeTier(nextTier!.id);
                onClose();
              }}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#F37021] to-[#e06214] hover:from-[#e06214] hover:to-[#c85510] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Switch to {nextTier.name} Package ({nextTier.baseCapacity} packs)</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          )}

          {highestTier && highestTier.id !== nextTier?.id && onUpgradeTier && (
            <button
              type="button"
              onClick={() => {
                onUpgradeTier(highestTier!.id);
                onClose();
              }}
              className={`w-full py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-bold border transition-all flex items-center justify-center space-x-1.5 cursor-pointer active:scale-[0.98] ${
                isDark
                  ? 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-neutral-100'
                  : 'bg-white border-neutral-300 hover:bg-neutral-100 text-neutral-800 shadow-2xs'
              }`}
            >
              <ArrowUpRight className="w-4 h-4 text-[#F37021] shrink-0" />
              <span>Switch to {highestTier.name} Package ({highestTier.baseCapacity} packs)</span>
            </button>
          )}

          {onAutoAdjust && attemptedTotal > tier.baseCapacity && (
            <button
              type="button"
              onClick={() => {
                onAutoAdjust();
                onClose();
              }}
              className={`w-full py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-semibold border transition-all flex items-center justify-center space-x-1.5 cursor-pointer active:scale-[0.98] ${
                isDark
                  ? 'bg-neutral-850 border-neutral-800 hover:bg-neutral-800 text-neutral-300'
                  : 'bg-neutral-100 border-neutral-200 hover:bg-neutral-200 text-neutral-700'
              }`}
            >
              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Adjust Quantities to Base Capacity ({tier.baseCapacity} packs)</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className={`w-full py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              isDark
                ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
                : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100'
            }`}
          >
            Keep Selection ({Math.min(attemptedTotal, tier.baseCapacity)} packs)
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default PackageCapacityWarningModal;
