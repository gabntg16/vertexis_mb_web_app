import React, { useMemo } from 'react';
import { useData } from '../../context/DataContext';
import {
  TrendingUp,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Package,
  Calendar,
  Layers,
  ArrowRight,
  Info,
  CheckCircle2,
  Clock,
  Flame,
} from 'lucide-react';
import { ProductDemandAnalytics } from '../../types';

interface BranchDemandForecastViewProps {
  onApplyAutoFill?: (quantities: Record<string, number>) => void;
  onNavigateToReorder?: () => void;
}

export const BranchDemandForecastView: React.FC<BranchDemandForecastViewProps> = ({
  onApplyAutoFill,
  onNavigateToReorder,
}) => {
  const {
    currentBranch,
    getDetailedDemandAnalyticsForBranch,
    themeMode,
  } = useData();

  const isDark = themeMode === 'dark';
  const branchId = currentBranch?.id || '';

  const analyticsList: ProductDemandAnalytics[] = useMemo(() => {
    if (!branchId) return [];
    return getDetailedDemandAnalyticsForBranch(branchId);
  }, [branchId, getDetailedDemandAnalyticsForBranch]);

  const totalSuggestedPacks = analyticsList.reduce((sum, a) => sum + Math.max(0, a.suggestedOrderQuantity), 0);
  const urgentCount = analyticsList.filter((a) => a.urgency === 'Urgent').length;
  const reviewCount = analyticsList.filter((a) => a.urgency === 'Review').length;

  const handleAutoFillClick = () => {
    const autoFilled: Record<string, number> = {};
    analyticsList.forEach((a) => {
      if (a.suggestedOrderQuantity > 0) {
        autoFilled[a.productId] = a.suggestedOrderQuantity;
      }
    });
    if (onApplyAutoFill) {
      onApplyAutoFill(autoFilled);
    }
    if (onNavigateToReorder) {
      onNavigateToReorder();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F37021] text-white">
              Single Exponential Smoothing (α = 0.3)
            </span>
            <span className="text-xs font-mono text-neutral-400">
              Branch: {currentBranch?.name} ({currentBranch?.code})
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-1">
            Predictive Demand & Reorder Analytics
          </h1>
          <p className="text-xs text-neutral-500 font-medium">
            AI-modeled replenishment suggestions balancing 14-day historical sales velocity, transit lead time, and safety buffer stock.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAutoFillClick}
          className="px-5 py-2.5 rounded-2xl bg-[#F37021] text-white font-bold text-xs sm:text-sm hover:bg-[#d85e15] shadow-md transition-all flex items-center space-x-2 self-start sm:self-auto cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Apply to Commissary Requisition</span>
        </button>
      </div>

      {/* Smoothing Model Explanation Box */}
      <div
        className={`p-5 rounded-3xl border ${
          isDark
            ? 'bg-[#161616] border-neutral-800'
            : 'bg-gradient-to-r from-orange-500/5 via-sky-500/5 to-white border-[#80C7F2]/30 shadow-xs'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-[#F37021]" />
              <h3 className="text-sm font-black text-neutral-900 dark:text-white">
                Exponential Smoothing Model Specification: S_t = 0.3·Y_t + 0.7·S_{'{t-1}'}
              </h3>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Smooths daily sales fluctuations with a <strong>0.3 smoothing constant (alpha)</strong>. Spoilage and write-offs are automatically removed from Y_t to prevent bullwhip distortion.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <div className="text-center p-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
              <span className="text-[10px] text-neutral-400 font-bold uppercase">Total Recommended</span>
              <p className="text-lg font-black text-[#F37021]">+{totalSuggestedPacks} packs</p>
            </div>
            <div className="text-center p-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
              <span className="text-[10px] text-neutral-400 font-bold uppercase">Urgent Shortages</span>
              <p className="text-lg font-black text-red-500">{urgentCount} SKUs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {analyticsList.map((item) => (
          <div
            key={item.productId}
            className={`p-5 rounded-3xl border flex flex-col justify-between transition-all ${
              item.urgency === 'Urgent'
                ? 'bg-red-500/5 border-red-500/30'
                : item.urgency === 'Review'
                ? 'bg-amber-500/5 border-amber-500/30'
                : isDark
                ? 'bg-[#161616] border-neutral-800'
                : 'bg-white border-neutral-200 shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                <div>
                  <h4 className="font-extrabold text-base text-neutral-900 dark:text-white">
                    {item.flavor}
                  </h4>
                  <p className="text-xs text-neutral-500">{item.productName}</p>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    item.urgency === 'Urgent'
                      ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                      : item.urgency === 'Review'
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {item.urgency} Priority
                </span>
              </div>

              {/* Metrics Breakdown */}
              <div className="grid grid-cols-2 gap-2 my-4 text-xs">
                <div className="p-2.5 rounded-2xl bg-neutral-100 dark:bg-neutral-900/80">
                  <span className="text-[10px] text-neutral-400 font-medium">On-Hand Stock</span>
                  <p className="font-black text-sm text-neutral-900 dark:text-white mt-0.5">
                    {item.currentStock} packs
                  </p>
                </div>

                <div className="p-2.5 rounded-2xl bg-neutral-100 dark:bg-neutral-900/80">
                  <span className="text-[10px] text-neutral-400 font-medium">In-Transit Inbound</span>
                  <p className="font-black text-sm text-sky-600 dark:text-sky-400 mt-0.5">
                    {item.inTransitStock} packs
                  </p>
                </div>

                <div className="p-2.5 rounded-2xl bg-neutral-100 dark:bg-neutral-900/80">
                  <span className="text-[10px] text-neutral-400 font-medium">Smoothed Velocity (v)</span>
                  <p className="font-black text-sm text-neutral-900 dark:text-white mt-0.5">
                    {item.smoothedDailyDemand} packs/day
                  </p>
                </div>

                <div className="p-2.5 rounded-2xl bg-neutral-100 dark:bg-neutral-900/80">
                  <span className="text-[10px] text-neutral-400 font-medium">Safety Buffer (SS)</span>
                  <p className="font-black text-sm text-neutral-900 dark:text-white mt-0.5">
                    {item.recommendedSafetyStock} packs
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-neutral-500 py-2 border-t border-neutral-100 dark:border-neutral-800">
                <div className="flex justify-between">
                  <span>Expected 7-Day Demand:</span>
                  <strong className="text-neutral-900 dark:text-white">{item.expectedWeeklyDemand} packs</strong>
                </div>
                <div className="flex justify-between">
                  <span>Days of Inventory Remaining:</span>
                  <strong
                    className={
                      item.daysOfInventoryLeft <= 3
                        ? 'text-red-500 font-bold'
                        : item.daysOfInventoryLeft <= 6
                        ? 'text-amber-500 font-bold'
                        : 'text-emerald-500'
                    }
                  >
                    ~{item.daysOfInventoryLeft} days
                  </strong>
                </div>
              </div>
            </div>

            {/* Reorder Callout */}
            <div className="pt-3 mt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-neutral-400 block font-medium">Recommended Restock</span>
                <span className="font-black text-base text-[#F37021]">
                  +{item.suggestedOrderQuantity} packs
                </span>
              </div>

              <button
                type="button"
                onClick={handleAutoFillClick}
                className="px-3 py-1.5 rounded-xl bg-[#F37021]/15 text-[#d85e15] dark:text-[#F37021] hover:bg-[#F37021] hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center space-x-1"
              >
                <span>Requisition</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
