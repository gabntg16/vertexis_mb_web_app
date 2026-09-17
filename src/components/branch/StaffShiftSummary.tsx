import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import {
  FileCheck,
  ClipboardCheck,
  Receipt,
  Trash2,
  PackageCheck,
  Send,
  CheckCircle2,
  Clock,
  Lock,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  ArrowRight,
  Edit3,
  UserCheck,
  Calendar,
  X,
  Sparkles,
  Info,
  Layers,
  ShoppingBag,
} from 'lucide-react';
import { DailyLogStatus, DailyPhysicalCountItem, DailyManualSalesItem, DailySpoilageItem, DailyInboundReceivingItem } from '../../types';

interface StaffShiftSummaryProps {
  onNavigateTab?: (tab: string) => void;
}

export const StaffShiftSummary: React.FC<StaffShiftSummaryProps> = ({ onNavigateTab }) => {
  const {
    currentUser,
    currentBranch,
    dailyShiftLogs,
    products,
    submitDailyLogForValidation,
    removeSpoilageFromDailyLog,
    removeInboundFromDailyLog,
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

  const [showConfirmSubmitModal, setShowConfirmSubmitModal] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [inboundToDelete, setInboundToDelete] = useState<{ id: string; flavor: string; manifestNumber: string } | null>(null);

  // Saved Physical Counts
  const savedCounts: DailyPhysicalCountItem[] = todayLog?.physicalCounts || [];
  const totalBeginningStock = savedCounts.reduce((acc, curr) => acc + (curr.beginningCount || 0), 0);
  const totalEndingStock = savedCounts.reduce((acc, curr) => acc + (curr.endingCount || 0), 0);
  const totalInventoryVariance = savedCounts.reduce((acc, curr) => acc + (curr.variance || 0), 0);

  // Saved Sales
  const savedSales: DailyManualSalesItem[] = todayLog?.manualSales || [];
  const totalSalesUnits = savedSales.reduce((acc, curr) => acc + (curr.unitsSold || 0), 0);
  const totalSalesRevenue = savedSales.reduce((acc, curr) => acc + (curr.totalSales || 0), 0);

  // Saved Spoilage
  const savedSpoilage: DailySpoilageItem[] = todayLog?.spoilageEntries || (todayLog as any)?.spoilage || [];
  const totalSpoilageUnits = savedSpoilage.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
  const totalSpoilageCost = savedSpoilage.reduce((acc, curr) => acc + (curr.costImpact || 0), 0);

  // Saved Inbound Deliveries
  const savedInbound: DailyInboundReceivingItem[] = todayLog?.inboundReceiving || [];
  const totalInboundUnits = savedInbound.reduce((acc, curr) => acc + (curr.receivedUnits || 0), 0);

  // Expected Ending Stock Formula: Beginning Stock + Inbound Deliveries - Sales - Spoilage
  const expectedEndingStock = totalBeginningStock + totalInboundUnits - totalSalesUnits - totalSpoilageUnits;
  const netInventoryVariance = totalEndingStock - expectedEndingStock;

  const handleSubmitDailyLog = () => {
    const logId = todayLog?.id || `log-${branchId}-${today}`;
    const res = submitDailyLogForValidation(logId);
    setShowConfirmSubmitModal(false);

    if (res.success) {
      setFeedback({
        text: isReturned
          ? 'Re-submitted corrected shift log to Branch Manager for validation & audit lock.'
          : 'Complete daily shift log submitted to Branch Manager for approval.',
        type: 'success',
      });
      setTimeout(() => setFeedback(null), 6000);
    } else {
      setFeedback({
        text: res.error || 'Failed to submit shift log.',
        type: 'error',
      });
    }
  };

  const handleDeleteSpoilage = (id: string, flavor: string) => {
    if (!isEditable) return;
    removeSpoilageFromDailyLog(id);
    setFeedback({
      text: `Removed spoilage record for ${flavor}.`,
      type: 'info',
    });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleConfirmDeleteInbound = () => {
    if (!inboundToDelete) return;
    removeInboundFromDailyLog(inboundToDelete.id);
    setFeedback({
      text: `Removed inbound record for ${inboundToDelete.flavor} (${inboundToDelete.manifestNumber}).`,
      type: 'info',
    });
    setInboundToDelete(null);
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div id="staff-shift-summary-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
                Shift Summary & Manager Approval
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                Consolidated review of all saved daily physical counts, manual sales, spoilage logs, and inbound receipts
              </p>
            </div>
          </div>
        </div>

        {/* Shift Lifecycle Status */}
        <div className="flex items-center space-x-2">
          {currentStatus === DailyLogStatus.DRAFT && (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60">
              <Clock className="w-3.5 h-3.5" />
              <span>Status: DRAFT (Saved Locally)</span>
            </span>
          )}
          {currentStatus === DailyLogStatus.PENDING_VALIDATION && (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-300 dark:border-sky-700/60">
              <Clock className="w-3.5 h-3.5 animate-pulse" />
              <span>Awaiting Manager Validation</span>
            </span>
          )}
          {currentStatus === DailyLogStatus.RETURNED_FOR_REVISION && (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-700/60">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Returned For Revision</span>
            </span>
          )}
          {currentStatus === DailyLogStatus.VALIDATED_AND_LOCKED && (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60">
              <Lock className="w-3.5 h-3.5" />
              <span>Validated & Locked</span>
            </span>
          )}
        </div>
      </div>

      {/* Rejection / Returned Alert */}
      {isReturned && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <div className="text-sm font-bold">Shift Log Returned for Revision by Branch Manager</div>
              <p className="text-xs text-rose-700 dark:text-rose-300">
                Remarks: "{todayLog?.rejectionReason || todayLog?.managerNotes || (todayLog as any)?.validationNotes || 'Discrepancy noted in inventory ending counts versus recorded sales. Please recount shelf stock and adjust.'}"
              </p>
              <p className="text-[11px] text-rose-600 dark:text-rose-400">
                You may review and adjust the saved entries across the tabs below, then re-submit for approval once verified.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Locked / Validated Notice */}
      {isLocked && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="text-xs">
              <span className="font-bold">Shift Audited & Locked.</span> Validated by{' '}
              <span className="font-semibold">{todayLog?.validatedBy || 'Branch Manager'}</span> on{' '}
              {todayLog?.validatedAt ? new Date(todayLog.validatedAt).toLocaleTimeString() : 'End of Day'}.
              All records are permanently synchronized to the Legazpi City Commissary HQ ledger.
            </div>
          </div>
        </div>
      )}

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : feedback.type === 'error'
              ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              : 'bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
          }`}
        >
          {feedback.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
          {feedback.type === 'error' && <AlertTriangle className="w-4 h-4 shrink-0" />}
          {feedback.type === 'info' && <Info className="w-4 h-4 shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Physical Inventory */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-1">
            <span className="text-xs font-semibold">Ending Shelf Stock</span>
            <ClipboardCheck className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-neutral-900 dark:text-white">
            {totalEndingStock}{' '}
            <span className="text-xs font-normal text-neutral-400">packs</span>
          </div>
          <div className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center justify-between">
            <span>Beg: {totalBeginningStock}</span>
            <span
              className={`font-semibold ${
                totalInventoryVariance < 0 ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-600 dark:text-neutral-300'
              }`}
            >
              Var: {totalInventoryVariance >= 0 ? `+${totalInventoryVariance}` : totalInventoryVariance}
            </span>
          </div>
        </div>

        {/* Manual Sales Units & Gross */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-1">
            <span className="text-xs font-semibold">Shift Sales Revenue</span>
            <Receipt className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            ₱{totalSalesRevenue.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
            <span className="font-semibold text-neutral-900 dark:text-white">{totalSalesUnits} packs</span> sold across 7 flavors
          </div>
        </div>

        {/* Spoilage & Damaged */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-1">
            <span className="text-xs font-semibold">Damaged / Spoilage</span>
            <Trash2 className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-black text-red-600 dark:text-red-400">
            {totalSpoilageUnits}{' '}
            <span className="text-xs font-normal text-neutral-400">packs</span>
          </div>
          <div className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
            Cost Impact: <span className="font-semibold text-neutral-900 dark:text-white">₱{totalSpoilageCost.toLocaleString()}</span>
          </div>
        </div>

        {/* Inbound Received */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-1">
            <span className="text-xs font-semibold">Inbound Deliveries</span>
            <PackageCheck className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-black text-sky-600 dark:text-sky-400">
            {totalInboundUnits}{' '}
            <span className="text-xs font-normal text-neutral-400">packs</span>
          </div>
          <div className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
            From Naga City Commissary
          </div>
        </div>
      </div>

      {/* Aggregated Section 1: Physical Counts */}
      <div className="rounded-2xl bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="flex items-center space-x-2.5">
            <ClipboardCheck className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
              1. Saved Physical Shelf Counts ({savedCounts.length} Flavors)
            </h2>
          </div>
          {onNavigateTab && isEditable && (
            <button
              type="button"
              onClick={() => onNavigateTab('physical_counts')}
              className="inline-flex items-center space-x-1 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Counts</span>
            </button>
          )}
        </div>

        {savedCounts.length === 0 ? (
          <div className="p-6 text-center text-xs text-neutral-400">
            No physical shelf counts saved yet today.{' '}
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('physical_counts')}
                className="text-amber-600 underline font-semibold ml-1"
              >
                Go to Physical Counts
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850/50 text-[11px] font-bold uppercase text-neutral-500">
                  <th className="py-2.5 px-4">Flavor / SKU</th>
                  <th className="py-2.5 px-3 text-center">Beginning</th>
                  <th className="py-2.5 px-3 text-center">Ending Count</th>
                  <th className="py-2.5 px-3 text-center">Variance</th>
                  <th className="py-2.5 px-4">Staff Observation Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {savedCounts.map((item) => (
                  <tr key={item.productId} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                    <td className="py-2.5 px-4 font-semibold text-neutral-900 dark:text-white">
                      {item.flavor}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-neutral-600 dark:text-neutral-400">
                      {item.beginningCount} {item.unit}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-neutral-900 dark:text-white">
                      {item.endingCount} {item.unit}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              (item.variance ?? 0) === 0
                            ? 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                             : (item.variance ?? 0) < 0
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                        }`}
                      >
                        {(item.variance ?? 0) > 0 ? `+${item.variance}` : (item.variance ?? 0)}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-neutral-500 dark:text-neutral-400 text-[11px] italic">
                      {item.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Aggregated Section 2: Manual Sales */}
      <div className="rounded-2xl bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="flex items-center space-x-2.5">
            <Receipt className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
              2. Saved Manual Sales Transactions ({totalSalesUnits} packs • ₱{totalSalesRevenue.toLocaleString()})
            </h2>
          </div>
          {onNavigateTab && isEditable && (
            <button
              type="button"
              onClick={() => onNavigateTab('manual_sales')}
              className="inline-flex items-center space-x-1 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Sales</span>
            </button>
          )}
        </div>

        {savedSales.length === 0 ? (
          <div className="p-6 text-center text-xs text-neutral-400">
            No sales entries saved yet today.{' '}
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('manual_sales')}
                className="text-sky-600 underline font-semibold ml-1"
              >
                Go to Manual Sales Entry
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850/50 text-[11px] font-bold uppercase text-neutral-500">
                  <th className="py-2.5 px-4">Flavor / Item</th>
                  <th className="py-2.5 px-3 text-center">Units Sold</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-4 text-right">Gross Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {savedSales.map((item) => (
                  <tr key={item.productId} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                    <td className="py-2.5 px-4 font-semibold text-neutral-900 dark:text-white">
                      {item.flavor}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-neutral-900 dark:text-white">
                      {item.unitsSold} packs
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-neutral-600 dark:text-neutral-400">
                      ₱{item.unitPrice}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ₱{(item.totalSales || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-850/70 font-bold">
                  <td className="py-3 px-4 text-neutral-900 dark:text-white">Total Shift Sales</td>
                  <td className="py-3 px-3 text-center font-mono text-neutral-900 dark:text-white">
                    {totalSalesUnits} packs
                  </td>
                  <td className="py-3 px-3"></td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                    ₱{totalSalesRevenue.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Aggregated Section 3: Spoilage & Wastage */}
      <div className="rounded-2xl bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="flex items-center space-x-2.5">
            <Trash2 className="w-4 h-4 text-red-500" />
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
              3. Saved Spoilage & Damaged Goods ({totalSpoilageUnits} packs • ₱{totalSpoilageCost.toLocaleString()} Cost Impact)
            </h2>
          </div>
          {onNavigateTab && isEditable && (
            <button
              type="button"
              onClick={() => onNavigateTab('spoilage_wastage')}
              className="inline-flex items-center space-x-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:underline"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Log More Spoilage</span>
            </button>
          )}
        </div>

        {savedSpoilage.length === 0 ? (
          <div className="p-6 text-center text-xs text-neutral-400">
            No damaged or spoiled items recorded today.{' '}
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('spoilage_wastage')}
                className="text-red-600 underline font-semibold ml-1"
              >
                Log Spoilage
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850/50 text-[11px] font-bold uppercase text-neutral-500">
                  <th className="py-2.5 px-4">Item / Flavor</th>
                  <th className="py-2.5 px-3">Failure Reason</th>
                  <th className="py-2.5 px-3 text-center">Qty Damaged</th>
                  <th className="py-2.5 px-3 text-right">Cost Impact</th>
                  <th className="py-2.5 px-4">Staff Incident Remarks</th>
                  {isEditable && <th className="py-2.5 px-2 text-center">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {savedSpoilage.map((entry) => (
                  <tr key={entry.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                    <td className="py-2.5 px-4 font-semibold text-neutral-900 dark:text-white">
                      {entry.flavor}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300">
                        {entry.reason}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-red-600 dark:text-red-400">
                      {entry.quantity}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-neutral-600 dark:text-neutral-400">
                      ₱{(entry.costImpact || 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-neutral-500 dark:text-neutral-400 text-[11px] italic">
                      {entry.notes || '—'}
                    </td>
                    {isEditable && (
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteSpoilage(entry.id, entry.flavor)}
                          className="p-1 rounded-md text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                          title="Remove spoilage entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Aggregated Section 4: Inbound Deliveries */}
      <div className="rounded-2xl bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="flex items-center space-x-2.5">
            <PackageCheck className="w-4 h-4 text-sky-500" />
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
              4. Saved Inbound Commissary Deliveries ({totalInboundUnits} packs received)
            </h2>
          </div>
          {onNavigateTab && isEditable && (
            <button
              type="button"
              onClick={() => onNavigateTab('inbound_receiving')}
              className="inline-flex items-center space-x-1 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Inspect Deliveries</span>
            </button>
          )}
        </div>

        {savedInbound.length === 0 ? (
          <div className="p-6 text-center text-xs text-neutral-400">
            No inbound shipments recorded today.{' '}
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('inbound_receiving')}
                className="text-sky-600 underline font-semibold ml-1"
              >
                Go to Inbound Receiving
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850/50 text-[11px] font-bold uppercase text-neutral-500">
                  <th className="py-2.5 px-4">Manifest #</th>
                  <th className="py-2.5 px-4">Flavor / SKU</th>
                  <th className="py-2.5 px-3 text-center">Expected</th>
                  <th className="py-2.5 px-3 text-center">Received</th>
                  <th className="py-2.5 px-3">Condition</th>
                  <th className="py-2.5 px-4">Delivery Notes</th>
                  {isEditable && <th className="py-2.5 px-3 text-center">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {savedInbound.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                    <td className="py-2.5 px-4 font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                      {item.manifestNumber || 'MNF-NAGA'}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-neutral-900 dark:text-white">
                      {item.productName}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-neutral-500">
                      {item.expectedUnits}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {item.receivedUnits}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.condition === 'good'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                        }`}
                      >
                        {item.condition.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-neutral-500 dark:text-neutral-400 text-[11px] italic">
                      {item.notes || '—'}
                    </td>
                    {isEditable && (
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setInboundToDelete({ id: item.id, flavor: item.productName, manifestNumber: item.manifestNumber })}
                          className="p-1 rounded-md text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete inbound item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Aggregated Section 5: End-of-Shift Stock Ledger Reconciliation */}
      <div className="rounded-2xl bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="flex items-center space-x-2.5">
            <Layers className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
              5. End-of-Shift Stock Ledger Reconciliation
            </h2>
          </div>
          <span className="text-[11px] font-mono text-neutral-500">
            Expected Ending Stock = Beg ({totalBeginningStock}) + Inbound ({totalInboundUnits}) - Sales ({totalSalesUnits}) - Spoilage ({totalSpoilageUnits})
          </span>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800">
              <span className="text-[10px] uppercase font-bold text-neutral-500 block">Beginning Stock</span>
              <span className="text-base font-black font-mono text-neutral-900 dark:text-white mt-0.5 block">
                {totalBeginningStock} <span className="text-[10px] font-normal text-neutral-400">packs</span>
              </span>
            </div>
            <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/40">
              <span className="text-[10px] uppercase font-bold text-sky-600 dark:text-sky-400 block">+ Inbound Deliveries</span>
              <span className="text-base font-black font-mono text-sky-600 dark:text-sky-400 mt-0.5 block">
                +{totalInboundUnits} <span className="text-[10px] font-normal text-sky-400">packs</span>
              </span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40">
              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">- Shift Sales</span>
              <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                -{totalSalesUnits} <span className="text-[10px] font-normal text-emerald-400">packs</span>
              </span>
            </div>
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40">
              <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 block">- Spoilage / Waste</span>
              <span className="text-base font-black font-mono text-rose-600 dark:text-rose-400 mt-0.5 block">
                -{totalSpoilageUnits} <span className="text-[10px] font-normal text-rose-400">packs</span>
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40">
              <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block">= Expected Ending</span>
              <span className="text-base font-black font-mono text-amber-700 dark:text-amber-400 mt-0.5 block">
                {expectedEndingStock} <span className="text-[10px] font-normal text-amber-500">packs</span>
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-850/60 border border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3">
              <span className="text-neutral-500">Physical Shelf Count:</span>
              <span className="font-bold text-neutral-900 dark:text-white font-mono text-sm">
                {totalEndingStock} packs
              </span>
              <span className="text-neutral-300 dark:text-neutral-700">|</span>
              <span className="text-neutral-500">Formula Expected:</span>
              <span className="font-bold text-neutral-900 dark:text-white font-mono text-sm">
                {expectedEndingStock} packs
              </span>
            </div>

            <div>
              {netInventoryVariance === 0 ? (
                <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Balanced (0 Variance)</span>
                </span>
              ) : netInventoryVariance < 0 ? (
                <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Unaccounted Shortage: {netInventoryVariance} packs</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                  <Info className="w-3.5 h-3.5" />
                  <span>Unaccounted Overage: +{netInventoryVariance} packs</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Submit Shift Log Action Bar */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-neutral-600 dark:text-neutral-300 space-y-0.5">
          <div>
            Shift Log Date: <span className="font-bold text-neutral-900 dark:text-white">{today}</span> • Branch:{' '}
            <span className="font-bold text-neutral-900 dark:text-white">{currentBranch?.name || 'Legazpi City Branch'}</span>
          </div>
          <div className="text-neutral-500 dark:text-neutral-400 text-[11px]">
            Staff Operator: <span className="font-semibold text-neutral-800 dark:text-neutral-200">{currentUser?.name}</span> ({currentUser?.role})
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          {isEditable ? (
            <button
              type="button"
              onClick={() => setShowConfirmSubmitModal(true)}
              className={`w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-bold text-white shadow-md active:scale-98 cursor-pointer transition-all ${
                isReturned
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>{isReturned ? 'Re-Submit Corrected Log for Approval' : 'Submit Log for Approval'}</span>
            </button>
          ) : isPending ? (
            <div className="flex items-center space-x-2 text-xs font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 px-4 py-2.5 rounded-xl">
              <Clock className="w-4 h-4" />
              <span>Shift Log Submitted • Waiting for Manager Validation</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-4 py-2.5 rounded-xl">
              <ShieldCheck className="w-4 h-4" />
              <span>Shift Log Audited & Locked</span>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Submitting Shift Log for Approval */}
      {showConfirmSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-[#181818] rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/60 dark:bg-neutral-900/60">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Confirm Shift Log Submission
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Are you sure you want to submit this shift log for manager validation?
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmSubmitModal(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 text-xs text-neutral-700 dark:text-neutral-300">
              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-850/80 border border-neutral-200 dark:border-neutral-800 space-y-2">
                <div className="flex justify-between items-center text-[11px] font-bold text-neutral-500 uppercase pb-1 border-b border-neutral-200 dark:border-neutral-800">
                  <span>Shift Audit Metrics</span>
                  <span>Recorded Tally</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-neutral-600 dark:text-neutral-400">Ending Physical Stock:</span>
                  <span className="font-mono font-bold text-neutral-900 dark:text-white">
                    {totalEndingStock} packs (Variance: {totalInventoryVariance >= 0 ? `+${totalInventoryVariance}` : totalInventoryVariance})
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-neutral-600 dark:text-neutral-400">Manual Sales Recorded:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {totalSalesUnits} packs (₱{totalSalesRevenue.toLocaleString()})
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-neutral-600 dark:text-neutral-400">Damaged / Spoilage:</span>
                  <span className="font-mono font-bold text-red-600 dark:text-red-400">
                    {totalSpoilageUnits} packs (Cost: ₱{totalSpoilageCost.toLocaleString()})
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-neutral-600 dark:text-neutral-400">Inbound Shipments Verified:</span>
                  <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                    {totalInboundUnits} packs ({savedInbound.length} lines)
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 text-[11px] space-y-1">
                <div className="font-bold flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Important Compliance Notice:</span>
                </div>
                <p>
                  Once submitted, this shift log will be locked from frontline staff edits while pending review. Your Branch Manager will audit physical stock, sales drawer balances, and spoilage before applying the permanent audit lock.
                </p>
              </div>

              <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Staff Sign-off: <span className="font-semibold text-neutral-800 dark:text-neutral-200">{currentUser?.name}</span> ({currentUser?.role})
              </div>
            </div>

            {/* Modal Footbar */}
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowConfirmSubmitModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
              >
                Review Entries First
              </button>
              <button
                type="button"
                onClick={handleSubmitDailyLog}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-98 shadow-sm transition-all"
              >
                Yes, Submit Shift Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Inbound Item */}
      {inboundToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-[#181818] rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xl overflow-hidden p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Remove Inbound Delivery Record?
                </h3>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
                  {inboundToDelete.manifestNumber}
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Are you sure you want to remove the inbound delivery record for <strong className="text-neutral-900 dark:text-white">{inboundToDelete.flavor}</strong>? This will deduct the received packs from your shift inbound total.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setInboundToDelete(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteInbound}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs cursor-pointer active:scale-98"
              >
                Yes, Remove Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
