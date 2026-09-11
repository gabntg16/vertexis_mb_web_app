import React, { useMemo } from 'react';
import { useData } from '../../context/DataContext';
import {
  TrendingUp,
  AlertTriangle,
  Package,
  Calendar,
  Layers,
  ArrowRight,
  Info,
  CheckCircle2,
  Clock,
  Sparkles,
  ShoppingBag,
  Coins,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { BranchDemandForecastView } from './BranchDemandForecastView';

interface ManagerBranchAnalyticsProps {
  onNavigateToReorder?: () => void;
}

export const ManagerBranchAnalytics: React.FC<ManagerBranchAnalyticsProps> = ({
  onNavigateToReorder,
}) => {
  const {
    currentUser,
    currentBranch,
    dailyShiftLogs,
    inventory,
    products,
    themeMode,
  } = useData();

  const isDark = themeMode === 'dark';
  const branchId = currentUser?.branchId || currentBranch?.id || 'b-legazpi';

  // Branch-specific daily shift logs
  const branchLogs = useMemo(() => {
    return (dailyShiftLogs || [])
      .filter((l) => l.branchId === branchId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [dailyShiftLogs, branchId]);

  // Branch inventory
  const branchInventory = useMemo(() => {
    return inventory.filter((i) => i.branchId === branchId);
  }, [inventory, branchId]);

  // Aggregate 7-day metrics
  const performanceMetrics = useMemo(() => {
    let totalRevenue = 0;
    let totalUnitsSold = 0;
    let totalSpoilageUnits = 0;
    let totalSpoilageCost = 0;

    branchLogs.forEach((log) => {
      totalRevenue += log.totalSalesRevenue || 0;
      totalUnitsSold += log.totalSalesUnits || 0;
      totalSpoilageUnits += log.totalSpoilageUnits || 0;
      totalSpoilageCost += log.totalSpoilageCost || 0;
    });

    const lowStockItems = branchInventory.filter((i) => i.currentStock <= i.minThreshold);

    return {
      totalRevenue,
      totalUnitsSold,
      totalSpoilageUnits,
      totalSpoilageCost,
      lowStockCount: lowStockItems.length,
      lowStockItems,
    };
  }, [branchLogs, branchInventory]);

  return (
    <div id="manager-branch-analytics-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
                Branch Analytics & Performance
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                Performance trends, inventory velocity, and predictive restock forecasts for {currentBranch?.name || 'Legazpi City'}
              </p>
            </div>
          </div>
        </div>

        {/* Security Scope Badge */}
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-300 dark:border-violet-700/60">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Store Scope: {currentBranch?.name || 'Legazpi City'}</span>
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-semibold">
            <span>Branch Sales Revenue</span>
            <Coins className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            ₱{performanceMetrics.totalRevenue.toLocaleString()}
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">Logged from {branchLogs.length} shifts</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-semibold">
            <span>Total Units Sold</span>
            <ShoppingBag className="w-4 h-4 text-sky-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-neutral-900 dark:text-white">
            {performanceMetrics.totalUnitsSold}{' '}
            <span className="text-xs font-normal text-neutral-400">packs</span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">Gourmet Marshmallows</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-semibold">
            <span>Low-Stock Alerts</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
            {performanceMetrics.lowStockCount}{' '}
            <span className="text-xs font-normal text-neutral-400">SKUs</span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">Below safety replenishment buffer</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-semibold">
            <span>Branch Spoilage Cost</span>
            <Zap className="w-4 h-4 text-red-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-neutral-900 dark:text-white">
            ₱{performanceMetrics.totalSpoilageCost.toLocaleString()}
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">{performanceMetrics.totalSpoilageUnits} packs written off</p>
        </div>
      </div>

      {/* Demand Forecasting & Predictive Reorder Engine */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-sky-500" />
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">
              Predictive Demand Forecasting & Restock Planner
            </h2>
          </div>
          {onNavigateToReorder && (
            <button
              type="button"
              onClick={onNavigateToReorder}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-[#80C7F2] hover:bg-[#80C7F2]/90 text-neutral-900 transition-all cursor-pointer"
            >
              <span>Go to Requisition Order</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <BranchDemandForecastView onNavigateToReorder={onNavigateToReorder} />
      </div>
    </div>
  );
};
