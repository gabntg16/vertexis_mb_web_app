import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Lock,
  Save,
  Sparkles,
  Info,
  Package,
  Layers,
  FileCheck,
  ArrowRight,
} from 'lucide-react';
import { DailyLogStatus, DailyPhysicalCountItem } from '../../types';

interface StaffPhysicalCountsProps {
  onNavigateTab?: (tab: string) => void;
}

export const StaffPhysicalCounts: React.FC<StaffPhysicalCountsProps> = ({ onNavigateTab }) => {
  const {
    currentUser,
    currentBranch,
    products,
    dailyShiftLogs,
    addPhysicalCountsToDailyLog,
    themeMode,
  } = useData();

  const isDark = themeMode === 'dark';
  const branchId = currentUser?.branchId || currentBranch?.id || 'b-legazpi';
  const today = new Date().toISOString().split('T')[0];

  // Retrieve today's log or fallback to default
  const todayLog = useMemo(() => {
    return (dailyShiftLogs || []).find((l) => l.branchId === branchId && l.date === today);
  }, [dailyShiftLogs, branchId, today]);

  const currentStatus = todayLog?.status || DailyLogStatus.DRAFT;
  const isLocked = currentStatus === DailyLogStatus.VALIDATED_AND_LOCKED;
  const isPending = currentStatus === DailyLogStatus.PENDING_VALIDATION;
  const isReturned = currentStatus === DailyLogStatus.RETURNED_FOR_REVISION;
  const isEditable = !isLocked && !isPending;

  // Initialize count state (Purely Gourmet Marshmallow inventory)
  const [counts, setCounts] = useState<DailyPhysicalCountItem[]>(() => {
    if (todayLog && todayLog.physicalCounts && todayLog.physicalCounts.length > 0) {
      return todayLog.physicalCounts.filter(
        (c) => !c.productId.startsWith('f') && !c.productId.startsWith('pkg')
      );
    }

    // Default template for Legazpi City frontline staff - 7 signature gourmet marshmallow flavors
    return [
      {
        productId: 'p1',
        productName: 'Gourmet Marshmallow',
        flavor: 'Oreo Cookies',
        category: 'marshmallows',
        beginningCount: 45,
        endingCount: 33,
        unit: 'packs',
        variance: 0,
        notes: '',
      },
      {
        productId: 'p2',
        productName: 'Gourmet Marshmallow',
        flavor: 'Dried Mango & Mango Flavor',
        category: 'marshmallows',
        beginningCount: 38,
        endingCount: 29,
        unit: 'packs',
        variance: 0,
        notes: '',
      },
      {
        productId: 'p3',
        productName: 'Gourmet Marshmallow',
        flavor: 'Caramel Macchiato & Biscoff',
        category: 'marshmallows',
        beginningCount: 50,
        endingCount: 41,
        unit: 'packs',
        variance: -1,
        notes: '',
      },
      {
        productId: 'p4',
        productName: 'Gourmet Marshmallow',
        flavor: 'Strawberry & Cheesecake Flavor',
        category: 'marshmallows',
        beginningCount: 35,
        endingCount: 27,
        unit: 'packs',
        variance: 0,
        notes: '',
      },
      {
        productId: 'p5',
        productName: 'Gourmet Marshmallow',
        flavor: 'Ube Jam & Flavor',
        category: 'marshmallows',
        beginningCount: 40,
        endingCount: 31,
        unit: 'packs',
        variance: 0,
        notes: '',
      },
      {
        productId: 'p6',
        productName: 'Gourmet Marshmallow',
        flavor: 'Matcha Powder',
        category: 'marshmallows',
        beginningCount: 28,
        endingCount: 23,
        unit: 'packs',
        variance: 0,
        notes: '',
      },
      {
        productId: 'p7',
        productName: 'Gourmet Marshmallow',
        flavor: 'Blueberry Powder & Sour Strips',
        category: 'marshmallows',
        beginningCount: 25,
        endingCount: 22,
        unit: 'packs',
        variance: 0,
        notes: '',
      },
    ];
  });

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return counts;
    return counts.filter((i) =>
      i.flavor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.productName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [counts, searchTerm]);

  const handleEndingCountChange = (productId: string, val: number) => {
    if (!isEditable) return;
    setCounts((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const ending = Math.max(0, val);
          return {
            ...item,
            endingCount: ending,
            variance: ending - item.beginningCount,
          };
        }
        return item;
      })
    );
  };

  const handleNotesChange = (productId: string, notes: string) => {
    if (!isEditable) return;
    setCounts((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, notes } : item))
    );
  };

  const handleSaveDraft = () => {
    const res = addPhysicalCountsToDailyLog(counts);
    if (res.success) {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSavedTime(timeStr);
      setFeedback({
        text: `Physical counts entry saved to Shift Draft at ${timeStr}. Submit all shift logs from Shift Summary.`,
        type: 'success',
      });
      setTimeout(() => setFeedback(null), 5000);
    } else {
      setFeedback({ text: res.error || 'Failed to save physical counts.', type: 'error' });
    }
  };

  return (
    <div id="staff-physical-counts-view" className="space-y-6">
      {/* Header & Role Scope Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
                Daily Physical Stock Counts
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                Frontline ground operations: record beginning and end-of-shift physical tallies
              </p>
            </div>
          </div>
        </div>

        {/* Status Lifecycle Indicator */}
        <div className="flex items-center space-x-2">
          {currentStatus === DailyLogStatus.DRAFT && (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60">
              <Clock className="w-3.5 h-3.5" />
              <span>Status: DRAFT (Active Shift Entry)</span>
            </span>
          )}
          {currentStatus === DailyLogStatus.PENDING_VALIDATION && (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-300 dark:border-sky-700/60">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Status: PENDING VALIDATION</span>
            </span>
          )}
          {isReturned && (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-700/60 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>Status: RETURNED FOR REVISION</span>
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

      {/* Return for Revision Alert Banner */}
      {isReturned && (
        <div className="p-4 rounded-2xl border bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 shadow-xs">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm">
              <div className="font-bold text-rose-900 dark:text-rose-200 flex items-center gap-2">
                <span>Shift Log Returned for Correction by {todayLog?.rejectedBy || 'Branch Manager'}</span>
                {todayLog?.rejectedAt && (
                  <span className="text-[11px] font-normal text-rose-600 dark:text-rose-300">
                    ({new Date(todayLog.rejectedAt).toLocaleTimeString()})
                  </span>
                )}
              </div>
              <p className="mt-1 text-rose-800 dark:text-rose-300">
                <span className="font-semibold">Reason / Note:</span> {todayLog?.rejectionReason || todayLog?.managerNotes || 'Discrepancy found. Please recount shelf tallies and resubmit.'}
              </p>
              <div className="mt-2 text-xs text-rose-700 dark:text-rose-400 font-medium">
                👉 Please adjust the ending physical tallies or clarify notes below, then click <strong>&quot;Re-Submit Corrected Log&quot;</strong>.
              </div>
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
          : isReturned
          ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40'
          : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50'
      }`}>
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300">
            <span className="font-bold text-neutral-900 dark:text-white">
              BRANCH_STAFF Scope:
            </span>{' '}
            Count physical Gourmet Marshmallow shelf inventory packs. Requisition creation and pricing edits are strictly restricted for frontline ground staff.
            {isLocked && (
              <span className="block mt-1 font-semibold text-emerald-700 dark:text-emerald-400">
                🔒 Shift closed and locked by Manager on {todayLog?.validatedAt ? new Date(todayLog.validatedAt).toLocaleTimeString() : 'record'}.
              </span>
            )}
            {isPending && (
              <span className="block mt-1 font-semibold text-sky-700 dark:text-sky-400">
                ⏳ Submitted for Branch Manager review. Inputs are read-only while under validation.
              </span>
            )}
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

      {/* Marshmallow Shelf Catalog Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 text-xs font-bold rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
            Gourmet Marshmallows ({counts.length} Flavors)
          </span>
          <span className="text-xs text-neutral-400">
            Shelf Pack Count Only
          </span>
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search flavor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-3 py-1.5 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-700 focus:outline-hidden focus:ring-2 focus:ring-[#80C7F2] text-neutral-900 dark:text-white"
          />
        </div>
      </div>

      {/* Inventory Count Table */}
      <div className="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#181818] shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-850/50 text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              <th className="py-3 px-4">Gourmet Flavor</th>
              <th className="py-3 px-3">Category</th>
              <th className="py-3 px-3 text-center">Beginning Shift</th>
              <th className="py-3 px-4 text-center">Ending Physical Count</th>
              <th className="py-3 px-3 text-center">Variance</th>
              <th className="py-3 px-4">Staff Recount Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200/70 dark:divide-neutral-800 text-xs sm:text-sm">
            {filteredItems.map((item) => {
              const diff = item.endingCount - item.beginningCount;
              return (
                <tr key={item.productId} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-neutral-900 dark:text-white">
                    <div>{item.flavor}</div>
                    <div className="text-[11px] text-neutral-400 font-normal">{item.productName}</div>
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono font-bold text-neutral-700 dark:text-neutral-300">
                    {item.beginningCount} {item.unit}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="inline-flex items-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        value={item.endingCount}
                        disabled={!isEditable}
                        onChange={(e) => handleEndingCountChange(item.productId, parseInt(e.target.value) || 0)}
                        className={`w-20 px-2 py-1.5 text-center font-mono font-bold rounded-lg border text-sm transition-all ${
                          isEditable
                            ? 'bg-white dark:bg-[#121212] border-neutral-300 dark:border-neutral-700 focus:ring-2 focus:ring-[#80C7F2] text-neutral-900 dark:text-white'
                            : 'bg-neutral-100 dark:bg-neutral-850 border-transparent text-neutral-400 cursor-not-allowed'
                        }`}
                      />
                      <span className="text-[11px] text-neutral-400">{item.unit}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                      diff === 0
                        ? 'text-neutral-500'
                        : diff < 0
                        ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/40'
                        : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                    }`}>
                      {diff > 0 ? `+${diff}` : diff}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <input
                      type="text"
                      placeholder="e.g. Broken pouch or shelf stock"
                      value={item.notes || ''}
                      disabled={!isEditable}
                      onChange={(e) => handleNotesChange(item.productId, e.target.value)}
                      className={`w-full px-2.5 py-1 text-xs rounded-lg border transition-all ${
                        isEditable
                          ? 'bg-white dark:bg-[#121212] border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 focus:ring-1 focus:ring-[#80C7F2]'
                          : 'bg-neutral-100 dark:bg-neutral-850 border-transparent text-neutral-400 cursor-not-allowed'
                      }`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Shift Summary Navigation Notice (Submissions centralized in Shift Summary) */}
      <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start space-x-2.5">
          <FileCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-900 dark:text-amber-200">
            <span className="font-bold">Physical counts save directly into your Shift Draft.</span>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
              Once you have finished counting and saving your ending inventory, head to the centralized Shift Summary tab to review variance and submit for Branch Manager approval.
            </p>
          </div>
        </div>
        {onNavigateTab && (
          <button
            type="button"
            onClick={() => onNavigateTab('shift_summary')}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs whitespace-nowrap transition-colors"
          >
            <span>Go to Shift Summary</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Action Footbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-800 shadow-xs">
        <div className="text-xs text-neutral-500 dark:text-neutral-400">
          Logged by: <span className="font-semibold text-neutral-900 dark:text-white">{currentUser?.name}</span> ({currentUser?.role})
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
            onClick={handleSaveDraft}
            disabled={!isEditable}
            className={`w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-sm transition-all ${
              isEditable
                ? 'bg-amber-600 hover:bg-amber-700 active:scale-98 cursor-pointer'
                : 'opacity-50 cursor-not-allowed bg-neutral-400 dark:bg-neutral-700'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>Save Physical Counts Entry</span>
          </button>
        </div>
      </div>
    </div>
  );
};
