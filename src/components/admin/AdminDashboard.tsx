import React from 'react';
import { useData } from '../../context/DataContext';
import {
  TrendingUp,
  Store,
  Package,
  Clock,
  ArrowUpRight,
  AlertTriangle,
  Sparkles,
  ShoppingBag,
  MapPin,
  ChevronRight,
  Flame,
  CheckCircle2,
  Layers,
  ArrowRight,
  Truck,
  LineChart,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';

/**
 * Headquarters Centralized Dashboard Component
 * 
 * Responsive Architecture:
 * - Mobile (<640px): 1-column stacked stat cards, vertical action buttons, scrollable tables/lists
 * - Tablet (640px - 1024px): 2-column stat cards, 2-column MTO stages, side-by-side action buttons
 * - Laptop / Desktop (1024px+ / 1366x768 / 1920x1080): 4-column stat cards, 4-stage pipeline bar, 2/3:1/3 chart layout
 * - Robust overflow handling: all text elements use truncate / break-words with min-w-0 flexbox parents
 */
export const AdminDashboard: React.FC<{ onNavigateTab: (tab: string) => void }> = ({ onNavigateTab }) => {
  const {
    branches,
    products,
    orders,
    sales,
    productionBatches,
    totalRevenue,
    pendingOrdersCount,
    adminRestockInsights,
    branchRevenue,
    branchStockCount,
    themeMode,
    currentUser,
  } = useData();

  // MTO Batch Metrics Calculation
  const inKettleBatches = productionBatches.filter((b) => b.stage === 'in_kettle');
  const curingBatches = productionBatches.filter((b) => b.stage === 'curing');
  const packagedBatches = productionBatches.filter((b) => b.stage === 'packaged');
  const readyOrders = orders.filter((o) => o.productionStage === 'ready_for_dispatch' || o.status === 'approved');

  // Compute Top Performing Branches by Revenue
  const topBranches = React.useMemo(() => {
    return [...branches]
      .map((b) => ({
        id: b.id,
        name: b.name.replace('Marsh Bites ', ''),
        revenue: branchRevenue(b.id),
        stock: branchStockCount(b.id),
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }, [branches, branchRevenue, branchStockCount]);

  // Compute Daily Sales Trend (past 7 days)
  const salesByDay = React.useMemo(() => {
    const daysMap: Record<string, number> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
      daysMap[key] = 0;
    }

    sales.forEach((s) => {
      const d = new Date(s.date);
      const key = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
      if (daysMap[key] !== undefined) {
        daysMap[key] += s.total;
      }
    });

    return Object.entries(daysMap).map(([date, total]) => ({ date, total }));
  }, [sales]);

  const recentOrders = orders.slice(0, 5);
  const isDark = themeMode === 'dark';

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6">
      
      {/* 
        ========================================================================
        1. Welcome & Centralized Overview Hero Banner
        - Fluid layout: Stacks on mobile, splits into 2 balanced columns on desktop
        - Aligned, touch-accessible action buttons
        ========================================================================
      */}
      <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border relative overflow-hidden transition-all ${
        isDark
          ? 'bg-gradient-to-r from-neutral-900 via-[#182830] to-neutral-900 border-neutral-800 text-white'
          : 'bg-gradient-to-r from-sky-50 via-amber-50/50 to-orange-50 border-[#80C7F2]/30 text-neutral-900'
      }`}>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6">
          <div className="min-w-0 max-w-3xl">
            <div className="inline-flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold tracking-wide uppercase bg-[#80C7F2]/20 text-[#1a7bb5] dark:text-[#80C7F2] border border-[#80C7F2]/30 mb-2 sm:mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#F37021] flex-shrink-0" />
              <span className="truncate">Welcome back, {currentUser?.name || 'Marsh Bites team'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight">
              Welcome to VertexIS
            </h1>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 mt-1 sm:mt-1.5 font-medium leading-relaxed">
              Good to see you. Your Legazpi City headquarters is ready to help you manage all franchise branches.
            </p>
          </div>

          {/* Action Buttons: Stack on mobile (<640px), row on sm+, touch targets >= 44px */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 flex-shrink-0 w-full sm:w-auto">
            <button
              id="admin-hero-review-orders-btn"
              onClick={() => onNavigateTab('orders')}
              className="px-4 py-2.5 sm:py-3 rounded-xl bg-[#F37021] text-white text-xs sm:text-sm font-bold shadow-md hover:bg-[#d85e15] active:scale-[0.98] transition-all flex items-center justify-center space-x-2 min-h-[44px]"
            >
              <ShoppingBag className="w-4 h-4 flex-shrink-0" />
              <span className="whitespace-nowrap">Review Orders ({pendingOrdersCount})</span>
            </button>
            <button
              id="admin-hero-mto-hub-btn"
              onClick={() => onNavigateTab('production')}
              className="px-4 py-2.5 sm:py-3 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-white text-xs sm:text-sm font-bold hover:bg-neutral-50 dark:hover:bg-neutral-700 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 min-h-[44px]"
            >
              <Package className="w-4 h-4 text-[#80C7F2] flex-shrink-0" />
              <span className="whitespace-nowrap">MTO Kitchen Hub</span>
            </button>
          </div>
        </div>
      </div>

      {/* 
        ========================================================================
        2. Four Core Pillars Quick Access Statistics Cards
        - Layout: 1-col on Mobile (<640px), 2-col on Tablet (640px - 1024px), 4-col on Desktop (1024px+)
        - Strict text containment: truncates gracefully, prevents card overflow
        ========================================================================
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Pillar 1: 19 Franchise Branches */}
        <div
          id="stat-card-branches"
          onClick={() => onNavigateTab('branches')}
          className={`p-4 sm:p-5 rounded-2xl border cursor-pointer hover:border-[#80C7F2] transition-all group flex flex-col justify-between ${
            isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-[#80C7F2]/20 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500 truncate">
              1. Franchise Branches
            </span>
            <div className="p-2 rounded-xl bg-[#80C7F2]/15 text-[#1a7bb5] dark:text-[#80C7F2] group-hover:bg-[#80C7F2] group-hover:text-white transition-all flex-shrink-0">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <div className="text-2xl sm:text-3xl font-black truncate">
              {branches.length} <span className="text-xs font-bold text-neutral-400">Branches</span>
            </div>
            <p className="text-xs text-neutral-500 mt-1 flex items-center justify-between">
              <span className="truncate">Nationwide network</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#80C7F2] group-hover:translate-x-1 transition-transform flex-shrink-0 ml-1" />
            </p>
          </div>
        </div>

        {/* Pillar 2: Central Commissary Batches */}
        <div
          id="stat-card-production"
          onClick={() => onNavigateTab('production')}
          className={`p-4 sm:p-5 rounded-2xl border cursor-pointer hover:border-[#F37021] transition-all group flex flex-col justify-between ${
            isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-[#80C7F2]/20 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500 truncate">
              2. Commissary Batches
            </span>
            <div className="p-2 rounded-xl bg-[#F37021]/15 text-[#F37021] group-hover:bg-[#F37021] group-hover:text-white transition-all flex-shrink-0">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <div className="text-2xl sm:text-3xl font-black truncate">
              {productionBatches.length} <span className="text-xs font-bold text-neutral-400">Active</span>
            </div>
            <p className="text-xs text-neutral-500 mt-1 flex items-center justify-between">
              <span className="truncate">{inKettleBatches.length} Kettle • {curingBatches.length} Curing</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#F37021] group-hover:translate-x-1 transition-transform flex-shrink-0 ml-1" />
            </p>
          </div>
        </div>

        {/* Pillar 3: Order Approvals */}
        <div
          id="stat-card-orders"
          onClick={() => onNavigateTab('orders')}
          className={`p-4 sm:p-5 rounded-2xl border cursor-pointer hover:border-amber-500 transition-all group flex flex-col justify-between ${
            isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-[#80C7F2]/20 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500 truncate">
              3. Order Approvals
            </span>
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-all flex-shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 truncate">
              {pendingOrdersCount} <span className="text-xs font-bold text-neutral-400">Pending</span>
            </div>
            <p className="text-xs text-neutral-500 mt-1 flex items-center justify-between">
              <span className="truncate">Proof verification queue</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-500 group-hover:translate-x-1 transition-transform flex-shrink-0 ml-1" />
            </p>
          </div>
        </div>

        {/* Pillar 4: Predictive Demand Analytics */}
        <div
          id="stat-card-forecasting"
          onClick={() => onNavigateTab('forecasting')}
          className={`p-4 sm:p-5 rounded-2xl border cursor-pointer hover:border-emerald-500 transition-all group flex flex-col justify-between ${
            isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-[#80C7F2]/20 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500 truncate">
              4. Demand Analytics
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all flex-shrink-0">
              <LineChart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 truncate">
              ₱{totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-neutral-500 mt-1 flex items-center justify-between">
              <span className="truncate">14-day velocity forecasting</span>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-500 group-hover:translate-x-1 transition-transform flex-shrink-0 ml-1" />
            </p>
          </div>
        </div>
      </div>

      {/* 
        ========================================================================
        3. Central Commissary Made-to-Order Live Pipeline Bar
        - Responsive 4-stage progression: 2-col on mobile/tablet, 4-col on desktop
        ========================================================================
      */}
      <div className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl border transition-all ${
        isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-[#80C7F2]/20'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-5">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-[#F37021]/15 text-[#F37021] border border-[#F37021]/30 flex-shrink-0">
              <Flame className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold truncate">
                  Central Commissary • Live Made-to-Order Pipeline
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#80C7F2]/20 text-[#1a7bb5] dark:text-[#80C7F2] whitespace-nowrap">
                  Live Kitchen
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-neutral-500 truncate mt-0.5">
                {/*Fresh gourmet marshmallows cooked to order upon branch requisition approval*/}
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('production')}
            className="text-xs font-bold text-[#F37021] hover:underline flex items-center space-x-1 self-start sm:self-auto flex-shrink-0"
          >
            <span>Open Production Matrix</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 4 Stages Live Progression Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
          <div className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border min-w-0 ${isDark ? 'bg-[#202020] border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
            <span className="text-[10px] sm:text-[11px] font-bold text-neutral-400 block mb-1 truncate">Stage 1 • Queued</span>
            <div className="flex items-baseline space-x-1.5 sm:space-x-2 truncate">
              <span className="text-lg sm:text-xl font-black text-amber-500">{orders.filter(o => o.productionStage === 'queued').length}</span>
              <span className="text-[10px] sm:text-xs text-neutral-400 truncate">Requisitions</span>
            </div>
          </div>

          <div className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border min-w-0 ${isDark ? 'bg-[#202020] border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
            <span className="text-[10px] sm:text-[11px] font-bold text-neutral-400 block mb-1 truncate">Stage 2 • In Kettle</span>
            <div className="flex items-baseline space-x-1.5 sm:space-x-2 truncate">
              <span className="text-lg sm:text-xl font-black text-[#F37021]">{inKettleBatches.length}</span>
              <span className="text-[10px] sm:text-xs text-neutral-400 truncate">Batches</span>
            </div>
          </div>

          <div className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border min-w-0 ${isDark ? 'bg-[#202020] border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
            <span className="text-[10px] sm:text-[11px] font-bold text-neutral-400 block mb-1 truncate">Stage 3 • Curing</span>
            <div className="flex items-baseline space-x-1.5 sm:space-x-2 truncate">
              <span className="text-lg sm:text-xl font-black text-purple-500">{curingBatches.length}</span>
              <span className="text-[10px] sm:text-xs text-neutral-400 truncate">Resting Pans</span>
            </div>
          </div>

          <div className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border min-w-0 ${isDark ? 'bg-[#202020] border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
            <span className="text-[10px] sm:text-[11px] font-bold text-neutral-400 block mb-1 truncate">Stage 4 • Ready</span>
            <div className="flex items-baseline space-x-1.5 sm:space-x-2 truncate">
              <span className="text-lg sm:text-xl font-black text-emerald-500">{readyOrders.length}</span>
              <span className="text-[10px] sm:text-xs text-neutral-400 truncate">Ready Orders</span>
            </div>
          </div>
        </div>
      </div>

      {/* 
        ========================================================================
        4. Analytics & Top Branches Section (Grid: 1-col on Mobile/Tablet, 2/3 + 1/3 on Desktop)
        ========================================================================
      */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Sales Trend Chart (Fluid SVG container with ResponsiveContainer) */}
        <div className={`lg:col-span-2 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border overflow-hidden ${
          isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-[#80C7F2]/20'
        }`}>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-bold">Network Sales Velocity</h2>
              <p className="text-[11px] sm:text-xs text-neutral-500">Daily revenue trend across all franchise branches</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
              Rolling 7 Days
            </span>
          </div>

          <div className="h-56 sm:h-64 lg:h-72 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesByDay} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#80C7F2" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#80C7F2" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#262626' : '#e5e7eb'} />
                <XAxis dataKey="date" stroke={isDark ? '#888' : '#666'} fontSize={10} />
                <YAxis stroke={isDark ? '#888' : '#666'} fontSize={10} tickFormatter={(v) => `₱${v}`} />
                <Tooltip
                  formatter={(value: any) => [`₱${Number(value || 0).toLocaleString()}`, 'Total Sales']}
                  contentStyle={{
                    backgroundColor: isDark ? '#1f1f1f' : '#ffffff',
                    borderColor: isDark ? '#333' : '#e5e7eb',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="total" stroke="#F37021" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Branches By Revenue */}
        <div className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl border flex flex-col justify-between ${
          isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-[#80C7F2]/20'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-bold">Top Branches</h2>
                <p className="text-[11px] sm:text-xs text-neutral-500">Highest sales velocity</p>
              </div>
              <button
                onClick={() => onNavigateTab('branches')}
                className="text-xs font-bold text-[#F37021] hover:underline flex items-center"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {topBranches.map((b, idx) => (
                <div
                  key={b.id}
                  className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border flex items-center justify-between transition-all min-w-0 ${
                    isDark
                      ? 'bg-neutral-900/60 border-neutral-800'
                      : 'bg-neutral-50/70 border-neutral-200'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 truncate">
                    <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black flex-shrink-0 ${
                      idx === 0
                        ? 'bg-amber-500 text-white'
                        : idx === 1
                        ? 'bg-neutral-300 dark:bg-neutral-700 text-neutral-800 dark:text-white'
                        : 'bg-[#80C7F2]/20 text-[#1a7bb5] dark:text-[#80C7F2]'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="min-w-0 truncate">
                      <p className="text-xs font-bold truncate">{b.name}</p>
                      <p className="text-[10px] text-neutral-500 truncate">{b.stock} units in stock</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 pl-2">
                    <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      ₱{b.revenue.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 
        ========================================================================
        5. Two-Column Grid: Predictive Demand Restock Warnings & Recent Orders
        - Layout: 1-col on Mobile/Tablet, 2-col on Desktop (lg:grid-cols-2)
        ========================================================================
      */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        
        {/* Predictive Demand & Restock Insights */}
        <div className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl border flex flex-col justify-between ${
          isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-[#80C7F2]/20'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center space-x-2 min-w-0">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 flex-shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-bold truncate">Predictive Restock Insights</h2>
                  <p className="text-[11px] sm:text-xs text-neutral-500 truncate">AI-forecasted stockout warnings (14-day velocity)</p>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('production')}
                className="text-xs font-bold text-[#F37021] hover:underline whitespace-nowrap"
              >
                Allocate Stock
              </button>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {adminRestockInsights.length === 0 ? (
                <p className="text-xs text-neutral-500 text-center py-8">
                  All branch inventory levels are currently balanced and adequate.
                </p>
              ) : (
                adminRestockInsights.slice(0, 6).map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl sm:rounded-2xl border flex items-center justify-between text-xs min-w-0 ${
                      item.urgency === 'Urgent'
                        ? 'bg-red-500/5 border-red-500/20'
                        : item.urgency === 'Review'
                        ? 'bg-amber-500/5 border-amber-500/20'
                        : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800'
                    }`}
                  >
                    <div className="truncate pr-2 min-w-0">
                      <div className="flex items-center space-x-1.5 sm:space-x-2">
                        <span className="font-bold text-neutral-900 dark:text-white truncate">
                          {item.branchName}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
                          item.urgency === 'Urgent'
                            ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                            : item.urgency === 'Review'
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                            : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                        }`}>
                          {item.urgency}
                        </span>
                      </div>
                      <p className="text-neutral-500 text-[11px] truncate mt-0.5">
                        {item.productName}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="font-extrabold text-neutral-900 dark:text-white whitespace-nowrap">
                        +{item.suggested} units
                      </span>
                      <p className="text-[10px] text-neutral-400">suggested</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Branch Orders */}
        <div className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl border flex flex-col justify-between ${
          isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-[#80C7F2]/20'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center space-x-2 min-w-0">
                <div className="p-2 rounded-xl bg-[#80C7F2]/15 text-[#1a7bb5] dark:text-[#80C7F2] flex-shrink-0">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-bold truncate">Recent Branch Orders</h2>
                  <p className="text-[11px] sm:text-xs text-neutral-500 truncate">Incoming stock requisitions from branches</p>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('orders')}
                className="text-xs font-bold text-[#F37021] hover:underline whitespace-nowrap"
              >
                Manage Orders
              </button>
            </div>

            <div className="space-y-2.5 sm:space-y-3">
              {recentOrders.map((ord) => (
                <div
                  key={ord.id}
                  onClick={() => onNavigateTab('orders')}
                  className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border cursor-pointer hover:border-[#80C7F2] transition-all flex items-center justify-between min-w-0 ${
                    isDark ? 'bg-neutral-900/60 border-neutral-800' : 'bg-neutral-50/70 border-neutral-200'
                  }`}
                >
                  <div className="min-w-0 truncate pr-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs truncate">{ord.branchName}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
                        ord.status === 'approved'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : ord.status === 'waitingApproval'
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          : ord.status === 'rejected'
                          ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                          : 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                      }`}>
                        {ord.status === 'waitingApproval' ? 'Payment Uploaded' : ord.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-1 truncate">
                      {ord.items.length} product(s) • {new Date(ord.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-black text-neutral-900 dark:text-white whitespace-nowrap">
                      ₱{ord.totalAmount.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-[#F37021] font-semibold flex items-center justify-end space-x-0.5 mt-0.5">
                      <span>Review</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

