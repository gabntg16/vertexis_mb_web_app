import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Clock,
  Sparkles,
  FileText,
  UserCheck,
  Building2,
  ChevronRight,
  TrendingDown,
  Printer,
  Calendar,
  Layers,
  ArrowRight,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { DailyLogStatus, DailyShiftLog } from '../../types';

export const ManagerLogValidation: React.FC = () => {
  const {
    currentUser,
    currentBranch,
    dailyShiftLogs,
    validateAndLockDailyLog,
    rejectAndReturnDailyLog,
    themeMode,
  } = useData();

  const isDark = themeMode === 'dark';
  const branchId = currentUser?.branchId || currentBranch?.id || 'b-legazpi';

  // Branch logs
  const branchLogs = useMemo(() => {
    return (dailyShiftLogs || [])
      .filter((l) => l.branchId === branchId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [dailyShiftLogs, branchId]);

  const [selectedLogId, setSelectedLogId] = useState<string>(() => {
    // Prefer pending log if present, else first log
    const pending = branchLogs.find((l) => l.status === DailyLogStatus.PENDING_VALIDATION);
    return pending ? pending.id : branchLogs[0]?.id || '';
  });

  const [managerNotes, setManagerNotes] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const selectedLog = useMemo(() => {
    return branchLogs.find((l) => l.id === selectedLogId) || branchLogs[0];
  }, [branchLogs, selectedLogId]);

  const isLocked = selectedLog?.status === DailyLogStatus.VALIDATED_AND_LOCKED;
  const isPending = selectedLog?.status === DailyLogStatus.PENDING_VALIDATION;
  const isReturned = selectedLog?.status === DailyLogStatus.RETURNED_FOR_REVISION;

  const handleApproveAndLock = () => {
    if (!selectedLog) return;
    const res = validateAndLockDailyLog(
      selectedLog.id,
      managerNotes.trim() || 'Daily physical stock, manual sales tally, and wastage verified and locked by Branch Manager.'
    );

    if (res.success) {
      setFeedback({
        text: `Shift Log (${selectedLog.date}) has been validated and permanently locked.`,
        type: 'success',
      });
      setManagerNotes('');
      setTimeout(() => setFeedback(null), 5000);
    } else {
      setFeedback({ text: res.error || 'Failed to approve log.', type: 'error' });
    }
  };

  const handleDisapproveAndReturn = () => {
    if (!selectedLog) return;
    if (!rejectionReason.trim()) {
      setFeedback({
        text: 'Please enter a revision reason so staff understands what needs recount or correction.',
        type: 'error',
      });
      return;
    }

    const res = rejectAndReturnDailyLog(selectedLog.id, rejectionReason.trim());
    if (res.success) {
      setFeedback({
        text: `Shift Log (${selectedLog.date}) has been returned to frontline staff for revision.`,
        type: 'info',
      });
      setRejectionReason('');
      setTimeout(() => setFeedback(null), 5000);
    } else {
      setFeedback({ text: res.error || 'Failed to return log.', type: 'error' });
    }
  };

  return (
    <div id="manager-log-validation-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
                Log Validation Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                Store-level audit: verify physical counts, manual sales, and wastage logs submitted by Branch Staff
              </p>
            </div>
          </div>
        </div>

        {/* Manager Context Badge */}
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#80C7F2]/15 text-[#0369a1] dark:text-[#80C7F2] border border-[#80C7F2]/30">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Store Lead: {currentUser?.name}</span>
          </span>
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

      {/* Main Grid: Left Logs Selector + Right Detailed Audit Inspection */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List: 4 cols */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 px-1">
            Branch Shift Logs ({branchLogs.length})
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {branchLogs.map((log) => {
              const isSelected = log.id === selectedLog?.id;
              return (
                <button
                  key={log.id}
                  type="button"
                  onClick={() => setSelectedLogId(log.id)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#80C7F2] bg-[#80C7F2]/10 dark:bg-[#80C7F2]/15 shadow-xs'
                      : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#181818] hover:border-neutral-300 dark:hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-neutral-400" />
                      <span className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-white">
                        {log.date}
                      </span>
                    </div>

                    {log.status === DailyLogStatus.PENDING_VALIDATION && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-300">
                        Needs Audit
                      </span>
                    )}
                    {log.status === DailyLogStatus.RETURNED_FOR_REVISION && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300">
                        Returned
                      </span>
                    )}
                    {log.status === DailyLogStatus.VALIDATED_AND_LOCKED && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300">
                        Locked
                      </span>
                    )}
                    {log.status === DailyLogStatus.DRAFT && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300">
                        Draft
                      </span>
                    )}
                  </div>

                  <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 flex items-center justify-between">
                    <span>Sales: {log.totalSalesUnits || 0} packs</span>
                    <span className="font-mono font-bold text-neutral-900 dark:text-white">
                      ₱{(log.totalSalesRevenue || 0).toLocaleString()}
                    </span>
                  </div>

                  {log.submittedBy && (
                    <div className="mt-1 text-[11px] text-neutral-400">
                      By: {log.submittedBy}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Audit Details: 8 cols */}
        {selectedLog ? (
          <div className="lg:col-span-8 space-y-5">
            {/* Status & Review Banner */}
            <div className={`p-5 rounded-2xl border ${
              isLocked
                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                : isReturned
                ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60'
                : isPending
                ? 'bg-sky-50/70 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800/60'
                : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    {isLocked ? (
                      <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    ) : isReturned ? (
                      <RotateCcw className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    ) : (
                      <Clock className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                    )}
                    <h2 className="text-base font-black text-neutral-900 dark:text-white">
                      Shift Audit for {selectedLog.date}
                    </h2>
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1">
                    Submitted by {selectedLog.submittedBy || 'Frontline Staff'} at{' '}
                    {selectedLog.submittedAt ? new Date(selectedLog.submittedAt).toLocaleTimeString() : 'N/A'}
                  </p>
                </div>

                <div>
                  {isLocked ? (
                    <div className="text-right">
                      <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white">
                        <Lock className="w-3.5 h-3.5" />
                        <span>VALIDATED & LOCKED</span>
                      </span>
                      <div className="text-[11px] text-neutral-400 mt-1">
                        By {selectedLog.validatedBy || 'Manager'}
                      </div>
                    </div>
                  ) : isReturned ? (
                    <div className="text-right">
                      <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-600 text-white">
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>RETURNED FOR REVISION</span>
                      </span>
                      <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-semibold">
                        Awaiting staff correction & re-submit
                      </div>
                    </div>
                  ) : isPending ? (
                    <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-sky-600 text-white">
                      <span>READY FOR MANAGER APPROVAL</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-600 text-white">
                      <span>STAFF DRAFT IN PROGRESS</span>
                    </span>
                  )}
                </div>
              </div>

              {selectedLog.rejectionReason && (
                <div className="mt-3 pt-3 border-t border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 bg-rose-100/50 dark:bg-rose-950/40 p-3 rounded-xl">
                  <div className="font-bold flex items-center space-x-1.5 text-rose-900 dark:text-rose-100 mb-1">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Manager Disapproval / Revision Instructions Sent to Staff:</span>
                  </div>
                  <p className="font-mono text-xs">{selectedLog.rejectionReason}</p>
                  {selectedLog.rejectedAt && (
                    <div className="text-[11px] text-neutral-500 mt-1">
                      Returned by {selectedLog.rejectedBy || 'Store Manager'} on{' '}
                      {new Date(selectedLog.rejectedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              )}

              {selectedLog.managerNotes && (
                <div className="mt-3 pt-3 border-t border-emerald-200/60 dark:border-emerald-800/40 text-xs text-neutral-700 dark:text-neutral-300">
                  <span className="font-bold">Manager Audit Sign-off Notes:</span> {selectedLog.managerNotes}
                </div>
              )}
            </div>

            {/* Reconciliation KPI Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-800 shadow-xs">
                <div className="text-xs text-neutral-500 dark:text-neutral-400 font-semibold">
                  Manual Sales Tally
                </div>
                <div className="mt-1 text-xl font-black text-neutral-900 dark:text-white">
                  {selectedLog.totalSalesUnits || 0} packs
                </div>
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  ₱{(selectedLog.totalSalesRevenue || 0).toLocaleString()} (Drawer target)
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-800 shadow-xs">
                <div className="text-xs text-neutral-500 dark:text-neutral-400 font-semibold">
                  Wastage Reported
                </div>
                <div className="mt-1 text-xl font-black text-red-600 dark:text-red-400">
                  {selectedLog.totalSpoilageUnits || 0} packs
                </div>
                <div className="text-xs text-neutral-400 mt-0.5">
                  Cost: ₱{(selectedLog.totalSpoilageCost || 0).toLocaleString()}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-800 shadow-xs">
                <div className="text-xs text-neutral-500 dark:text-neutral-400 font-semibold">
                  Inbound Received
                </div>
                <div className="mt-1 text-xl font-black text-[#0369a1] dark:text-[#80C7F2]">
                  {selectedLog.inboundReceiving?.reduce((acc, c) => acc + c.receivedUnits, 0) || 0} packs
                </div>
                <div className="text-xs text-neutral-400 mt-0.5">
                  {selectedLog.inboundReceiving?.length || 0} manifests verified
                </div>
              </div>
            </div>

            {/* Inventory Count Table Inspection */}
            <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#181818] shadow-xs">
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 font-bold text-xs sm:text-sm text-neutral-900 dark:text-white flex items-center justify-between">
                <span>Shift Physical Stock & Sales Audit</span>
                <span className="text-xs font-mono text-neutral-400">Reconciliation Formula</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850/50 text-[11px] font-bold uppercase text-neutral-500">
                      <th className="py-2.5 px-3">Item / Flavor</th>
                      <th className="py-2.5 px-2 text-center">Start</th>
                      <th className="py-2.5 px-2 text-center">Sold</th>
                      <th className="py-2.5 px-2 text-center">Waste</th>
                      <th className="py-2.5 px-2 text-center">Ending</th>
                      <th className="py-2.5 px-2 text-center">Variance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {selectedLog.physicalCounts?.map((c) => {
                      const salesItem = selectedLog.manualSales?.find((s) => s.productId === c.productId);
                      const wasteItem = selectedLog.spoilageEntries?.find((w) => w.productId === c.productId);
                      const unitsSold = salesItem?.unitsSold || 0;
                      const unitsWaste = wasteItem?.quantity || 0;
                      const expectedEnding = Math.max(0, c.beginningCount - unitsSold - unitsWaste);
                      const variance = c.endingCount - expectedEnding;

                      return (
                        <tr key={c.productId} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                          <td className="py-3 px-3 font-semibold text-neutral-900 dark:text-white">
                            <div>{c.flavor}</div>
                            {c.notes && <div className="text-[10px] text-neutral-400 font-normal italic">{c.notes}</div>}
                          </td>
                          <td className="py-3 px-2 text-center font-mono text-neutral-600 dark:text-neutral-300">
                            {c.beginningCount}
                          </td>
                          <td className="py-3 px-2 text-center font-mono font-bold text-sky-600 dark:text-sky-400">
                            {unitsSold}
                          </td>
                          <td className="py-3 px-2 text-center font-mono text-red-500">
                            {unitsWaste}
                          </td>
                          <td className="py-3 px-2 text-center font-mono font-bold text-neutral-900 dark:text-white">
                            {c.endingCount}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                              variance === 0
                                ? 'text-neutral-400'
                                : variance < 0
                                ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/40'
                                : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                            }`}>
                              {variance === 0 ? '0' : variance > 0 ? `+${variance}` : variance}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Manager Audit Decisions & Actions Card */}
            {!isLocked && (
              <div className="p-5 rounded-2xl bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200/80 dark:border-neutral-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                        Store Manager Audit Decisions & Actions
                      </h3>
                      <p className="text-[11px] text-neutral-500">
                        Verify shift records or return to frontline staff for physical recount
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold self-start sm:self-center ${
                    isReturned
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      : isPending
                      ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}>
                    {selectedLog.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  {/* Option A: APPROVE & LOCK */}
                  <div className="p-4 rounded-xl border border-emerald-200/90 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/15 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Action A: Approve & Lock Shift</span>
                      </div>
                      <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-1">
                        Locks physical counts, manual sales, and wastage. Syncs validated daily figures to Naga City Commissary Hub.
                      </p>

                      <div className="mt-3">
                        <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                          Manager Approval Remarks (Optional)
                        </label>
                        <input
                          type="text"
                          value={managerNotes}
                          onChange={(e) => setManagerNotes(e.target.value)}
                          placeholder="e.g. Physical counts and cash drawer verified."
                          className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121212] text-neutral-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleApproveAndLock}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 shadow-sm transition-all cursor-pointer"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Approve & Lock Daily Shift Log</span>
                    </button>
                  </div>

                  {/* Option B: DISAPPROVE & RETURN TO STAFF */}
                  <div className="p-4 rounded-xl border border-rose-200/90 dark:border-rose-800/60 bg-rose-50/40 dark:bg-rose-950/15 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center space-x-2 text-rose-700 dark:text-rose-400 font-bold text-xs">
                        <RotateCcw className="w-4 h-4" />
                        <span>Action B: Disapprove & Return to Staff</span>
                      </div>
                      <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-1">
                        Rejects this log and re-enables editable fields on staff screens. Frontline staff will see your exact feedback banner and must re-submit.
                      </p>

                      <div className="mt-3">
                        <label className="block text-[11px] font-bold text-rose-700 dark:text-rose-400 mb-1">
                          Disapproval Reason / Recount Instructions <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="text"
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="e.g. Recount Oreo packs: variance is -4, please re-tally shelf."
                          className="w-full px-3 py-2 text-xs rounded-xl border border-rose-300 dark:border-rose-700 bg-white dark:bg-[#121212] text-neutral-900 dark:text-white focus:ring-2 focus:ring-rose-500"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleDisapproveAndReturn}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-98 shadow-sm transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Disapprove & Return for Revision</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="lg:col-span-8 p-12 text-center text-xs text-neutral-400 bg-white dark:bg-[#181818] rounded-2xl border border-neutral-200 dark:border-neutral-800">
            Select a shift log from the left to view audit details.
          </div>
        )}
      </div>
    </div>
  );
};
