import React from 'react';
import { AlertTriangle, Layers, ArrowUpRight, X, ShieldAlert, Sparkles, Check } from 'lucide-react';
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
  if (!warning || !warning.isOpen) return null;

  const isDark = themeMode === 'dark';
  const { tier, attemptedTotal, maxCap, productFlavor, reason, targetTier } = warning;

  // Determine next available upgrade tier
  let nextTier: PackageTier | null = null;
  if (tier.id === 'silver') {
    nextTier = PACKAGE_TIERS.find((t) => t.id === 'gold') || null;
  } else if (tier.id === 'gold') {
    nextTier = PACKAGE_TIERS.find((t) => t.id === 'platinum') || null;
  }

  const excessCount = Math.max(1, attemptedTotal - maxCap);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exceed-dialog-title"
    >
      <div
        className={`w-full max-w-md rounded-3xl p-6 border shadow-2xl transition-all relative overflow-hidden animate-in zoom-in-95 duration-200 ${
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
          className={`absolute top-4 right-4 p-1.5 rounded-full transition-colors ${
            isDark ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100'
          }`}
          title="Close Warning"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with glowing icon badge */}
        <div className="flex items-start space-x-3.5 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="pr-6">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
              Capacity Limit Exceeded
            </span>
            <h3 id="exceed-dialog-title" className="text-lg font-black tracking-tight mt-1 leading-snug text-neutral-900 dark:text-white">
              Requisition Limit Warning
            </h3>
          </div>
        </div>

        {/* Contextual Warning Message */}
        <div className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed mb-4 space-y-1.5">
          {reason === 'cap_reached' && (
            <p>
              You have reached the maximum allowable limit of <strong className="text-neutral-900 dark:text-white font-bold">{maxCap} packs</strong> for the <strong className="text-[#F37021] font-bold">{tier.name} Package</strong>.
              You cannot add more packs to this order unless you upgrade to a larger package tier.
            </p>
          )}

          {reason === 'input_exceeded' && (
            <p>
              The quantity entered for <strong className="text-neutral-900 dark:text-white font-bold">{productFlavor || 'this flavor'}</strong> would push your total requisition to <strong className="text-red-500 font-bold">{attemptedTotal} packs</strong>, exceeding the <strong className="text-[#F37021] font-bold">{tier.name} Package</strong> maximum cap of <strong className="text-neutral-900 dark:text-white font-bold">{maxCap} packs</strong>.
            </p>
          )}

          {reason === 'tier_switch_exceeded' && (
            <p>
              Your current order contains <strong className="text-red-500 font-bold">{attemptedTotal} packs</strong>, which exceeds the <strong className="text-[#F37021] font-bold">{targetTier?.name || 'selected'} Package</strong> maximum cap of <strong className="text-neutral-900 dark:text-white font-bold">{maxCap} packs</strong>.
            </p>
          )}
        </div>

        {/* Breakdown Metric Card */}
        <div className={`p-3.5 rounded-2xl border mb-5 space-y-2 text-xs ${
          isDark ? 'bg-neutral-850 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
        }`}>
          <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
            <span className="text-neutral-500 flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-neutral-400" />
              <span>Active Package Tier:</span>
            </span>
            <span className="font-bold text-neutral-900 dark:text-white">
              {tier.name} Package ({tier.rangeLabel})
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-500">Tier Strict Maximum Cap:</span>
            <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
              {maxCap} packs
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-500">Attempted Requisition:</span>
            <span className="font-mono font-bold text-red-500">
              {attemptedTotal} packs
            </span>
          </div>

          <div className="flex items-center justify-between pt-1.5 border-t border-dashed border-neutral-200 dark:border-neutral-800 text-[11px]">
            <span className="text-amber-600 dark:text-amber-400 font-medium">Excess Over Limit:</span>
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
              +{excessCount} pack(s)
            </span>
          </div>
        </div>

        {/* Policy / Commissary Rule Reminder */}
        <div className="flex items-start space-x-2 text-[11px] text-neutral-500 dark:text-neutral-400 mb-5 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
          <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p>
            Commissary package tiers are strictly regulated to maintain batch quality and packaging capacities.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {nextTier && onUpgradeTier && (
            <button
              type="button"
              onClick={() => {
                onUpgradeTier(nextTier!.id);
                onClose();
              }}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#F37021] to-[#e06214] hover:from-[#e06214] hover:to-[#c85510] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4" />
              <span>Upgrade to {nextTier.name} Package ({nextTier.rangeLabel})</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          )}

          {onAutoAdjust && (
            <button
              type="button"
              onClick={() => {
                onAutoAdjust();
                onClose();
              }}
              className={`w-full py-2.5 px-4 rounded-2xl text-xs font-bold border transition-all flex items-center justify-center space-x-1.5 ${
                isDark
                  ? 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-neutral-200'
                  : 'bg-neutral-100 border-neutral-200 hover:bg-neutral-200 text-neutral-800'
              }`}
            >
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span>Auto-Adjust to Max Cap ({maxCap} packs)</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className={`w-full py-2.5 px-4 rounded-2xl text-xs font-semibold transition-all ${
              isDark
                ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
                : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100'
            }`}
          >
            Keep Selection & Adjust Manually
          </button>
        </div>
      </div>
    </div>
  );
};
