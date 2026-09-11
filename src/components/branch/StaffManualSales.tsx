import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import {
  Receipt,
  Plus,
  Minus,
  CheckCircle2,
  Lock,
  Clock,
  Sparkles,
  Info,
  Save,
  ShoppingBag,
  Coins,
  AlertTriangle,
  RotateCcw,
  ShieldAlert,
  ArrowRight,
  FileCheck,
  X,
} from 'lucide-react';
import { DailyLogStatus, DailyManualSalesItem } from '../../types';

interface StaffManualSalesProps {
  onNavigateTab?: (tab: string) => void;
}

export const StaffManualSales: React.FC<StaffManualSalesProps> = ({ onNavigateTab }) => {
  const {
    currentUser,
    currentBranch,
    products,
    dailyShiftLogs,
    addManualSalesToDailyLog,
    themeMode,
  } = useData();

  const isDark = themeMode === 'dark';
  const branchId = currentUser?.branchId || currentBranch?.id || 'b-legazpi';
  const today = new Date().toISOString().split('T')[0];

  const todayLog = useMemo(() => {
    return (dailyShiftLogs || []).find((l) => l.branchId === branchId && l.date === today);
  }, [dailyShiftLogs, branchId, today]);

  const currentStatus = todayLog?.status || DailyLogStatus.DRAFT;
  const isLocked = currentStatus === DailyLogStatus.VALIDATED_AND_LOCKED;
  const isPending = currentStatus === DailyLogStatus.PENDING_VALIDATION;
  const isReturned = currentStatus === DailyLogStatus.RETURNED_FOR_REVISION;
  const isEditable = !isLocked && !isPending;

  // Filter only marshmallow flavors
  const marshmallowProducts = useMemo(() => {
    return products.filter((p) => p.flavor && !p.id.startsWith('f') && !p.id.startsWith('pkg'));
  }, [products]);

  // Local state for units sold per product
  const [salesUnits, setSalesUnits] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    if (todayLog && todayLog.manualSales && todayLog.manualSales.length > 0) {
      todayLog.manualSales.forEach((s) => {
        initial[s.productId] = s.unitsSold;
      });
      return initial;
    }

    // Default sample units sold
    return {
      p1: 12,
      p2: 9,
      p3: 8,
      p4: 7,
      p5: 8,
      p6: 3,
      p7: 1,
    };
  });

  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  const handleUnitsChange = (productId: string, val: number) => {
    if (!isEditable) return;
    setSalesUnits((prev) => ({
      ...prev,
      [productId]: Math.max(0, val),
    }));
  };

  const handleIncrement = (productId: string) => {
    if (!isEditable) return;
    setSalesUnits((prev) => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1,
    }));
  };

  const handleDecrement = (productId: string) => {
    if (!isEditable) return;
    setSalesUnits((prev) => ({
      ...prev,
      [productId]: Math.max(0, (prev[productId] || 0) - 1),
    }));
  };

  // Calculations
  const salesSummary = useMemo(() => {
    let totalUnits = 0;
    let totalRevenue = 0;
    const itemsList: DailyManualSalesItem[] = [];

    marshmallowProducts.forEach((prod) => {
      const units = salesUnits[prod.id] || 0;
      const price = prod.price || 149;
      const subtotal = units * price;
      totalUnits += units;
      totalRevenue += subtotal;

      itemsList.push({
        productId: prod.id,
        productName: prod.name,
        flavor: prod.flavor,
        unitsSold: units,
        unitPrice: price,
        totalSales: subtotal,
      });
    });

    return { totalUnits, totalRevenue, itemsList };
  }, [marshmallowProducts, salesUnits]);

  const handleOpenConfirmSave = () => {
    if (!isEditable) return;
    setShowConfirmModal(true);
  };

  const handleConfirmSaveSales = () => {
    const res = addManualSalesToDailyLog(salesSummary.itemsList);
    setShowConfirmModal(false);
    if (res.success) {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSavedTime(timeStr);
      setFeedback({
        text: `Sales transaction entry (${salesSummary.totalUnits} packs • ₱${salesSummary.totalRevenue.toLocaleString()}) saved to Shift Draft at ${timeStr}.`,
        type: 'success',
      });
      setTimeout(() => setFeedback(null), 5000);
    } else {
      setFeedback({ text: res.error || 'Failed to save sales transaction.', type: 'error' });
    }
  };

  return (
    <div id="staff-manual-sales-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
                Manual Sales Log (Daily Units Sold)
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                Frontline staff end-of-shift tally • Manual unit count entry per flavor SKU
              </p>
            </div>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center space-x-2">
          {currentStatus === DailyLogStatus.DRAFT && (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60">
              <Clock className="w-3.5 h-3.5" />
              <span>Status: DRAFT</span>
            </span>
          )}
          {currentStatus === DailyLogStatus.RETURNED_FOR_REVISION && (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-700/60">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Status: RETURNED FOR REVISION</span>
            </span>
          )}
          {currentStatus === DailyLogStatus.PENDING_VALIDATION && (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-300 dark:border-sky-700/60">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Status: PENDING VALIDATION</span>
            </span>
          )}
          {currentStatus === DailyLogStatus.VALIDATED_AND_LOCKED && (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60">
              <Lock className="w-3.5 h-3.5" />
              <span>Status: VALIDATED & LOCKED</span>
            </span>
          )}
        </div>
      </div>

      {/* Return for Revision Notice Banner if applicable */}
      {isReturned && todayLog?.rejectionReason && (
        <div className="p-4 rounded-2xl border bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/80 text-rose-900 dark:text-rose-200">
          <div className="flex items-start space-x-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm">
              <div className="font-bold flex items-center space-x-1.5">
                <span>Returned by Branch Manager for Revision:</span>
                {todayLog.rejectedBy && <span className="font-normal text-rose-700 dark:text-rose-300">({todayLog.rejectedBy})</span>}
              </div>
              <p className="mt-1 font-mono text-xs bg-white/70 dark:bg-black/30 p-2.5 rounded-lg border border-rose-200 dark:border-rose-900/60">
                "{todayLog.rejectionReason}"
              </p>
              <p className="mt-1.5 text-[11px] text-rose-700 dark:text-rose-400">
                Please recount your physical sales tally, adjust units sold below, and click <strong>Re-Submit Corrected Log</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Role Boundary Notice */}
      <div className={`p-4 rounded-2xl border ${
        isLocked
          ? 'bg-neutral-100 dark:bg-neutral-900/60 border-neutral-200 dark:border-neutral-800'
          : isPending
          ? 'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800/50'
          : 'bg-sky-50/50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800/40'
      }`}>
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300">
            <span className="font-bold text-neutral-900 dark:text-white">Frontline Staff Tally Protocol:</span>{' '}
            VertexIS operates with manual sales tallying by shift staff. Count your daily physical sales slips or counter tally sheet and record the units sold per gourmet marshmallow flavor. Official retail SRP (₱149) is centrally configured by HQ.
          </div>
        </div>
      </div>

      {feedback && (
        <div className={`p-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-2 ${
          feedback.type === 'success'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
            : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800'
        }`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Shift Tally Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-semibold">
            <span>Total Units Sold Today</span>
            <ShoppingBag className="w-4 h-4 text-sky-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-neutral-900 dark:text-white">
            {salesSummary.totalUnits}{' '}
            <span className="text-xs font-normal text-neutral-400">packs</span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">Across 7 marshmallow flavors</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-semibold">
            <span>Shift Sales Revenue</span>
            <Coins className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            ₱{salesSummary.totalRevenue.toLocaleString()}
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">Gross sales before manager audit</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-semibold">
            <span>Shift Cash Drawer Target</span>
            <Receipt className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-neutral-900 dark:text-white">
            ₱{salesSummary.totalRevenue.toLocaleString()}
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">Cash to hand over to Branch Manager</p>
        </div>
      </div>

      {/* Manual Sales Entry Table */}
      <div className="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#181818] shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-850/50 text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              <th className="py-3 px-4">Gourmet Marshmallow Flavor</th>
              <th className="py-3 px-3 text-center">Unit Price (SRP)</th>
              <th className="py-3 px-4 text-center">Units Sold Counter</th>
              <th className="py-3 px-4 text-right">Calculated Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200/70 dark:divide-neutral-800 text-xs sm:text-sm">
            {marshmallowProducts.map((prod) => {
              const units = salesUnits[prod.id] || 0;
              const price = prod.price || 149;
              const subtotal = units * price;

              return (
                <tr key={prod.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                  <td className="py-4 px-4 font-semibold text-neutral-900 dark:text-white">
                    <div className="font-bold text-sm">{prod.flavor}</div>
                    <div className="text-[11px] text-neutral-400 font-normal">{prod.name} • 100g Bite Pouch</div>
                  </td>
                  <td className="py-4 px-3 text-center">
                    <span className="font-mono font-bold text-neutral-700 dark:text-neutral-300">
                      ₱{price}
                    </span>
                    <span className="block text-[10px] text-neutral-400">Locked SRP</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="inline-flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleDecrement(prod.id)}
                        disabled={!isEditable || units <= 0}
                        className={`p-1.5 rounded-lg border transition-all ${
                          isEditable && units > 0
                            ? 'bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 hover:bg-neutral-200 text-neutral-800 dark:text-neutral-200 cursor-pointer active:scale-95'
                            : 'opacity-40 cursor-not-allowed border-neutral-200 dark:border-neutral-800 text-neutral-400'
                        }`}
                        title="Decrease"
                      >
                        <Minus className="w-4 h-4" />
                      </button>

                      <input
                        type="number"
                        min="0"
                        value={units}
                        disabled={!isEditable}
                        onChange={(e) => handleUnitsChange(prod.id, parseInt(e.target.value) || 0)}
                        className={`w-20 px-2 py-1.5 text-center font-mono font-bold rounded-lg border text-base transition-all ${
                          isEditable
                            ? 'bg-white dark:bg-[#121212] border-neutral-300 dark:border-neutral-700 focus:ring-2 focus:ring-[#80C7F2] text-neutral-900 dark:text-white'
                            : 'bg-neutral-100 dark:bg-neutral-850 border-transparent text-neutral-400 cursor-not-allowed'
                        }`}
                      />

                      <button
                        type="button"
                        onClick={() => handleIncrement(prod.id)}
                        disabled={!isEditable}
                        className={`p-1.5 rounded-lg border transition-all ${
                          isEditable
                            ? 'bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 hover:bg-neutral-200 text-neutral-800 dark:text-neutral-200 cursor-pointer active:scale-95'
                            : 'opacity-40 cursor-not-allowed border-neutral-200 dark:border-neutral-800 text-neutral-400'
                        }`}
                        title="Increase"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right font-mono font-bold text-neutral-900 dark:text-white text-sm sm:text-base">
                    ₱{subtotal.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-850/70 font-bold">
              <td className="py-3.5 px-4 text-neutral-900 dark:text-white">Shift Grand Total</td>
              <td className="py-3.5 px-3 text-center text-xs text-neutral-400">7 Flavors</td>
              <td className="py-3.5 px-4 text-center font-mono text-neutral-900 dark:text-white">
                {salesSummary.totalUnits} packs sold
              </td>
              <td className="py-3.5 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 text-base sm:text-lg">
                ₱{salesSummary.totalRevenue.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Shift Summary Navigation Notice (Submissions centralized in Shift Summary) */}
      <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start space-x-2.5">
          <FileCheck className="w-4 h-4 text-sky-600 dark:text-sky-400 mt-0.5 shrink-0" />
          <div className="text-xs text-sky-900 dark:text-sky-200">
            <span className="font-bold">Sales entries save directly into your Shift Draft.</span>
            <p className="text-[11px] text-sky-700 dark:text-sky-400 mt-0.5">
              All daily shift tallies (physical counts, sales, spoilage, and inbound receipts) are aggregated and submitted on the centralized Shift Summary page.
            </p>
          </div>
        </div>
        {onNavigateTab && (
          <button
            type="button"
            onClick={() => onNavigateTab('shift_summary')}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs whitespace-nowrap transition-colors"
          >
            <span>Go to Shift Summary</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Action Footbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-800 shadow-xs">
        <div className="text-xs text-neutral-500 dark:text-neutral-400">
          Staff Operator: <span className="font-semibold text-neutral-900 dark:text-white">{currentUser?.name}</span> ({currentUser?.role})
          {lastSavedTime && (
            <span className="ml-2 inline-flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3 h-3" />
              <span>Last saved at {lastSavedTime}</span>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleOpenConfirmSave}
            disabled={!isEditable}
            className={`w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-sm transition-all ${
              isEditable
                ? 'bg-sky-600 hover:bg-sky-700 active:scale-98 cursor-pointer'
                : 'opacity-50 cursor-not-allowed bg-neutral-400 dark:bg-neutral-700'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>Save Sales Entry</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Submitting Transaction */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#181818] rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/60 dark:bg-neutral-900/60">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 border border-sky-500/20">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Confirm Sales Transaction</h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Are you sure you want to submit this sales transaction?
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs text-neutral-700 dark:text-neutral-300">
              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-850/80 border border-neutral-200 dark:border-neutral-800 space-y-2">
                <div className="flex justify-between items-center text-[11px] font-bold text-neutral-500 uppercase tracking-wider pb-1 border-b border-neutral-200 dark:border-neutral-800">
                  <span>Flavor Breakdown</span>
                  <span>Units & Amount</span>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {salesSummary.itemsList.filter((item) => item.unitsSold > 0).length === 0 ? (
                    <div className="py-2 text-center text-neutral-400 italic text-[11px]">
                      0 units entered for all flavors
                    </div>
                  ) : (
                    salesSummary.itemsList
                      .filter((item) => item.unitsSold > 0)
                      .map((item) => (
                        <div key={item.productId} className="flex justify-between items-center py-0.5">
                          <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                            {item.flavor}
                          </span>
                          <span className="font-mono text-neutral-900 dark:text-white">
                            {item.unitsSold} packs × ₱{item.unitPrice} = <span className="font-bold">₱{(item.unitsSold * item.unitPrice).toLocaleString()}</span>
                          </span>
                        </div>
                      ))
                  )}
                </div>
                <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
                  <span className="font-bold text-neutral-900 dark:text-white">Total Units Sold:</span>
                  <span className="font-mono font-bold text-sky-600 dark:text-sky-400 text-sm">
                    {salesSummary.totalUnits} packs
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-neutral-900 dark:text-white">Gross Cash Revenue:</span>
                  <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-base">
                    ₱{salesSummary.totalRevenue.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/50 text-sky-800 dark:text-sky-300 text-[11px]">
                ℹ️ Saving this sales entry updates today's shift log draft. Review your overall counts and submit for manager approval under Shift Summary.
              </div>
            </div>

            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSaveSales}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 active:scale-98 shadow-sm transition-all"
              >
                Yes, Submit Transaction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
