import React from 'react';
import { useData } from '../../context/DataContext';
import {
  Package,
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  ArrowUpRight,
  Truck,
  Store,
  Boxes,
  ClipboardCheck,
  Trash2,
  PackageCheck,
  CheckCircle2,
} from 'lucide-react';

export const BranchDashboard: React.FC<{ onNavigateTab: (tab: string) => void }> = ({ onNavigateTab }) => {
  const {
    currentBranch,
    products,
    getOrdersForBranch,
    getSalesForBranch,
    getInventoryForBranch,
    branchStockCount,
    restockSuggestionsForBranch,
    getDetailedDemandAnalyticsForBranch,
    demandForecastForBranch,
    spoilageRecords,
    getPhysicalAuditsForBranch,
    deliveries,
    announcements,
    themeMode,
  } = useData();

  if (!currentBranch) return null;

  const branchId = currentBranch.id;
  const totalStock = branchStockCount(branchId);
  const branchOrders = getOrdersForBranch(branchId);
  const branchInventory = getInventoryForBranch(branchId);
  const restockSuggestions = restockSuggestionsForBranch(branchId);
  const demandAnalytics = getDetailedDemandAnalyticsForBranch(branchId);
  const branchSpoilage = spoilageRecords.filter((s) => s.branchId === branchId);
  const branchAudits = getPhysicalAuditsForBranch ? getPhysicalAuditsForBranch(branchId) : [];
  const urgentSuggestions = restockSuggestions.filter((s) => s.urgency === 'Urgent');

  const pendingOrders = branchOrders.filter(
    (o) => o.status === 'pending' || o.status === 'waitingApproval' || o.status === 'approved' || o.status === 'dispatched'
  );
  const isDark = themeMode === 'dark';

  const totalWastageUnits = branchSpoilage.reduce((sum, s) => sum + s.quantity, 0);
  const totalWastageCost = branchSpoilage.reduce((sum, s) => sum + s.costImpact, 0);
  const totalSuggestedRestockUnits = demandAnalytics.reduce((sum, a) => sum + a.suggestedOrderQuantity, 0);

  return (
    <div className="space-y-6">
      {/* Branch Header Greeting */}
      <div className={`rounded-3xl p-6 sm:p-8 border relative overflow-hidden ${
        isDark
          ? 'bg-gradient-to-r from-neutral-900 via-[#132430] to-neutral-900 border-neutral-800 text-white'
          : 'bg-gradient-to-r from-sky-50 via-amber-50/40 to-sky-100/60 border-[#80C7F2]/30 text-neutral-900'
      }`}>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-[#80C7F2]/20 text-[#1a7bb5] dark:text-[#80C7F2] border border-[#80C7F2]/30 mb-2">
              <Store className="w-3.5 h-3.5 text-[#F37021]" />
              <span>{currentBranch.location}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {currentBranch.name}
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1 max-w-xl font-medium">
              B2B branch operations, live shelf inventory synchronization, inter-branch commissary requisitions, physical audits, and predictive demand analytics.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigateTab('orders')}
              className="px-4 py-2.5 rounded-xl bg-[#F37021] text-white text-xs sm:text-sm font-bold shadow-md hover:bg-[#d85e15] transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Order Commissary Stock</span>
            </button>
            <button
              onClick={() => onNavigateTab('inventory')}
              className="px-4 py-2.5 rounded-xl bg-[#80C7F2]/20 text-[#1a7bb5] dark:text-[#80C7F2] hover:bg-[#80C7F2]/30 border border-[#80C7F2]/40 text-xs sm:text-sm font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>Physical Shelf Audit</span>
            </button>
            <button
              onClick={() => onNavigateTab('wastage')}
              className="px-4 py-2.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 border border-red-500/20 text-xs sm:text-sm font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Log Spoilage</span>
            </button>
          </div>
        </div>
      </div>

      {/* Urgent Restock Recommendation Alert */}
      {urgentSuggestions.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-red-500 text-white flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-black">
                Predictive Restock Alert: {urgentSuggestions.length} gourmet marshmallow flavor(s) running critically low
              </p>
              <p className="text-xs text-red-600/80 dark:text-red-400 mt-0.5">
                {urgentSuggestions.map((s) => `${s.productName} (${s.currentStock} left, auto-suggest: +${s.suggestedOrderQuantity} units)`).join(' • ')}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('orders')}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold whitespace-nowrap self-start sm:self-auto shadow-xs cursor-pointer"
          >
            Reorder Now
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Stock Units */}
        <div className={`p-5 rounded-2xl border ${
          isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-[#80C7F2]/20 shadow-xs'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              On-Hand Shelf Stock
            </span>
            <div className="p-2 rounded-xl bg-[#80C7F2]/15 text-[#1a7bb5] dark:text-[#80C7F2]">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">
              {totalStock} units
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Across all 7 gourmet flavor lines
            </p>
          </div>
        </div>

        {/* Demand Velocity (Exponential Smoothing α=0.3) */}
        <div className={`p-5 rounded-2xl border ${
          isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-[#80C7F2]/20 shadow-xs'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Demand Forecast (α=0.3)
            </span>
            <div className="p-2 rounded-xl bg-[#F37021]/15 text-[#F37021]">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-[#F37021]">
              +{totalSuggestedRestockUnits} units
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Suggested 7-day replenishment
            </p>
          </div>
        </div>

        {/* Pending Requisitions Pipeline */}
        <div className={`p-5 rounded-2xl border ${
          isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-[#80C7F2]/20 shadow-xs'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Active Requisitions
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-amber-600">
              {pendingOrders.length}
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Orders in commissary pipeline
            </p>
          </div>
        </div>

        {/* Wastage Loss Isolated */}
        <div className={`p-5 rounded-2xl border ${
          isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-[#80C7F2]/20 shadow-xs'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Wastage (Isolated)
            </span>
            <div className="p-2 rounded-xl bg-red-500/10 text-red-600">
              <Trash2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-400">
              {totalWastageUnits} units
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              ₱{totalWastageCost.toLocaleString()} loss (excluded from SES)
            </p>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Stock Breakdown & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* On-Hand Flavor Inventory */}
        <div className={`p-6 rounded-3xl border ${
          isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-[#80C7F2]/20'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold">Flavor Stock Levels</h2>
            <button
              onClick={() => onNavigateTab('inventory')}
              className="text-xs font-bold text-[#F37021] hover:underline"
            >
              Full Inventory
            </button>
          </div>

          <div className="space-y-3">
            {getInventoryForBranch(branchId).map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${
                  item.stock <= 5
                    ? 'bg-red-500/5 border-red-500/20'
                    : isDark
                    ? 'bg-neutral-900/60 border-neutral-800'
                    : 'bg-neutral-50/70 border-neutral-200'
                }`}
              >
                <div className="truncate pr-2">
                  <p className="font-bold truncate text-neutral-900 dark:text-white">
                    {item.productName}
                  </p>
                  <p className="text-[10px] text-neutral-400">₱149 SRP</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`font-black text-sm ${
                    item.stock <= 5 ? 'text-red-600 dark:text-red-400' : 'text-neutral-900 dark:text-white'
                  }`}>
                    {item.stock} in stock
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Branch Orders & Dispatches */}
        <div className={`p-6 rounded-3xl border ${
          isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-[#80C7F2]/20'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold">Commissary Stock Orders</h2>
            <button
              onClick={() => onNavigateTab('orders')}
              className="text-xs font-bold text-[#F37021] hover:underline"
            >
              Order History
            </button>
          </div>

          <div className="space-y-3">
            {branchOrders.length === 0 ? (
              <p className="text-xs text-neutral-500 text-center py-8">
                No orders placed yet. Click "Order Commissary Stock" to request fresh inventory.
              </p>
            ) : (
              branchOrders.slice(0, 5).map((ord) => (
                <div
                  key={ord.id}
                  onClick={() => onNavigateTab('orders')}
                  className={`p-3.5 rounded-2xl border cursor-pointer hover:border-[#80C7F2] transition-all flex items-center justify-between ${
                    isDark ? 'bg-neutral-900/60 border-neutral-800' : 'bg-neutral-50/70 border-neutral-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs">Order #{ord.id}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        ord.status === 'approved'
                          ? 'bg-emerald-500/15 text-emerald-600'
                          : ord.status === 'waitingApproval'
                          ? 'bg-amber-500/15 text-amber-600'
                          : ord.status === 'rejected'
                          ? 'bg-red-500/15 text-red-600'
                          : 'bg-sky-500/15 text-sky-600'
                      }`}>
                        {ord.status === 'waitingApproval' ? 'Under Review' : ord.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-1">
                      {ord.items.reduce((s, i) => s + i.quantity, 0)} units • {new Date(ord.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-black text-neutral-900 dark:text-white">
                      ₱{ord.totalAmount.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-[#F37021] font-semibold flex items-center justify-end space-x-0.5 mt-0.5">
                      <span>View</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
