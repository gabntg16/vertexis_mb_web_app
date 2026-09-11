import React from 'react';
import { Sparkles, Zap, X, AlertTriangle, ArrowRight, TrendingUp } from 'lucide-react';
import { PackageOptimizationAnalysis } from '../../hooks/usePackageUpgradeOptimization';

export interface PackageUpgradeCautionProps {
  analysis: PackageOptimizationAnalysis;
  onUpgrade: (nextTierId: 'silver' | 'gold' | 'platinum') => void;
  onDismiss: () => void;
  isDismissed?: boolean;
  themeMode?: 'light' | 'dark';
  compact?: boolean;
}

export const PackageUpgradeCaution: React.FC<PackageUpgradeCautionProps> = ({
  analysis,
  onUpgrade,
  onDismiss,
  isDismissed = false,
  themeMode = 'light',
  compact = false,
}) => {
  const {
    shouldTriggerCaution,
    currentTier,
    nextTier,
    extraPacks,
    currentTotalPacks,
    currentTotalCost,
    nextTierPrice,
    nextTierBaseCapacity,
    additionalPacksGained,
    priceDifference,
    isNextTierCheaper,
  } = analysis;

  if (!shouldTriggerCaution || !nextTier || isDismissed) {
    return null;
  }

  const isDark = themeMode === 'dark';
  const diffAbs = Math.abs(priceDifference);

  return (
    <div
      id="package-upgrade-caution-banner"
      role="alert"
      className={`relative overflow-hidden rounded-2xl border transition-all animate-in fade-in slide-in-from-top-2 duration-300 ${
        isDark
          ? 'bg-amber-950/40 border-amber-500/40 text-amber-100 shadow-lg shadow-amber-950/30'
          : 'bg-gradient-to-r from-amber-50 via-amber-100/70 to-orange-50 border-amber-300 text-amber-950 shadow-md shadow-amber-500/10'
      } ${compact ? 'p-3 sm:p-4' : 'p-4 sm:p-5'}`}
    >
      {/* Decorative background glow */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-start justify-between gap-3">
        {/* Header and Content */}
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          <div
            className={`p-2 rounded-xl shrink-0 mt-0.5 ${
              isDark
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-amber-500 text-white shadow-xs'
            }`}
          >
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-black tracking-tight flex items-center space-x-1.5">
                <span>💡 Cost Optimization Tip</span>
              </h4>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                  isDark
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-amber-200/90 text-amber-900 border border-amber-300'
                }`}
              >
                {isNextTierCheaper ? 'Immediate Cost Saving' : 'High Value Upgrade'}
              </span>
            </div>

            {/* Dynamic Message */}
            <p className="text-xs sm:text-sm mt-1.5 leading-relaxed font-medium">
              You are currently adding{' '}
              <strong className="font-extrabold underline decoration-amber-400 decoration-2">
                {extraPacks} extra packs
              </strong>{' '}
              to the <span className="font-bold">{currentTier.name} Package</span> (Total: ₱
              {currentTotalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}). Switching to
              the <strong className="font-extrabold text-[#d95d12] dark:text-amber-300">{nextTier.name} Package</strong> gives you{' '}
              <strong className="font-extrabold">
                {additionalPacksGained > 0
                  ? `${additionalPacksGained} more total packs (${nextTierBaseCapacity} base capacity)`
                  : `a higher tier bundle (${nextTierBaseCapacity}+ capacity)`}
              </strong>{' '}
              {isNextTierCheaper ? (
                <span>
                  for a <strong className="text-emerald-700 dark:text-emerald-400 font-black">lower total cost</strong> (save ₱
                  {diffAbs.toLocaleString('en-US', { minimumFractionDigits: 2 })})!
                </span>
              ) : (
                <span>
                  for only{' '}
                  <strong className="font-black text-amber-900 dark:text-white">
                    ₱{diffAbs.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </strong>{' '}
                  more!
                </span>
              )}
            </p>

            {/* Micro Breakdown comparison */}
            <div
              className={`mt-2.5 p-2.5 rounded-xl text-[11px] font-mono flex flex-wrap items-center gap-x-4 gap-y-1.5 ${
                isDark ? 'bg-black/20 text-amber-200/90' : 'bg-white/70 text-amber-900 border border-amber-200'
              }`}
            >
              <div>
                <span className="opacity-70">Current ({currentTotalPacks} packs):</span>{' '}
                <span className="font-bold">₱{currentTotalCost.toLocaleString()}</span>
              </div>
              <div className="flex items-center space-x-1">
                <ArrowRight className="w-3 h-3 text-amber-500" />
                <span className="opacity-70">{nextTier.name} ({nextTierBaseCapacity} packs base):</span>{' '}
                <span className="font-extrabold text-[#d95d12] dark:text-amber-300">₱{nextTierPrice.toLocaleString()}</span>
              </div>
              {additionalPacksGained > 0 && (
                <div className="text-emerald-700 dark:text-emerald-400 font-bold">
                  +{additionalPacksGained} extra packs included
                </div>
              )}
            </div>

            {/* Fast-Action Button and Dismiss */}
            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                id="btn-switch-next-tier"
                onClick={() => onUpgrade(nextTier.id)}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#F37021] hover:bg-[#e06214] active:scale-95 text-white shadow-md shadow-orange-500/20 transition-all flex items-center space-x-1.5 cursor-pointer"
                title={`Upgrade requisition to ${nextTier.name} Package`}
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>⚡ Switch to {nextTier.name} Package</span>
              </button>

              <button
                type="button"
                onClick={onDismiss}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  isDark
                    ? 'text-amber-300/80 hover:text-amber-100 hover:bg-amber-900/30'
                    : 'text-amber-800/80 hover:text-amber-950 hover:bg-amber-200/50'
                }`}
                title="Dismiss tip and retain current custom pack selection"
              >
                Keep Current Selection
              </button>
            </div>
          </div>
        </div>

        {/* Top-Right Dismiss Cross */}
        <button
          type="button"
          onClick={onDismiss}
          className={`p-1.5 rounded-lg transition-colors shrink-0 ${
            isDark ? 'text-amber-400/60 hover:text-amber-200 hover:bg-amber-900/40' : 'text-amber-700/60 hover:text-amber-950 hover:bg-amber-200/60'
          }`}
          title="Dismiss optimization caution"
          aria-label="Dismiss optimization caution"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
