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
  Boxes,
} from 'lucide-react';
import { DailyLogStatus, DailyShiftLog } from '../../types';
import { InboundApprovalQueue } from './InboundApprovalQueue';

export const ManagerLogValidation: React.FC = () => {
  const {
    currentUser,
    currentBranch,
    dailyShiftLogs,
    validateAndLockDailyLog,
    rejectAndReturnDailyLog,
    approveInboundManifest,
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
  const [showApprovalHistory, setShowApprovalHistory] = useState<boolean>(false);

  // Find all pending inbound manifests across all branch logs (especially today's in-progress logs)
  const pendingInboundManifests = useMemo(() => {
    const manifests: Record<string, {
      logId: string;
      logDate: string;
      manifestNumber: string;
      supplierOrSource: string;
      verifiedAt: string;
      items: any[];
    }> = {};

    branchLogs.forEach((log) => {
      (log.inboundReceiving || []).forEach((item) => {
        if (item.status !== 'approved') {
          const key = `${log.id}-${item.manifestNumber}`;
          if (!manifests[key]) {
            manifests[key] = {
              logId: log.id,
              logDate: log.date,
              manifestNumber: item.manifestNumber,
              supplierOrSource: item.supplierOrSource,
              verifiedAt: item.verifiedAt,
              items: [],
            };
          }
          manifests[key].items.push(item);
        }
      });
    });

    return Object.values(manifests);
  }, [branchLogs]);

  // Find all approved inbound manifests
  const approvedInboundManifests = useMemo(() => {
    const manifests: Record<string, {
      logId: string;
      logDate: string;
      manifestNumber: string;
      supplierOrSource: string;
      items: any[];
    }> = {};

    branchLogs.forEach((log) => {
      (log.inboundReceiving || []).forEach((item) => {
        if (item.status === 'approved') {
          const key = `${log.id}-${item.manifestNumber}`;
          if (!manifests[key]) {
            manifests[key] = {
              logId: log.id,
              logDate: log.date,
              manifestNumber: item.manifestNumber,
              supplierOrSource: item.supplierOrSource,
              items: [],
            };
          }
          manifests[key].items.push(item);
        }
      });
    });

    return Object.values(manifests);
  }, [branchLogs]);

  const selectedLog = useMemo(() => {
    return branchLogs.find((l) => l.id === selectedLogId) || branchLogs[0];
  }, [branchLogs, selectedLogId]);

  const isLocked = selectedLog?.status === DailyLogStatus.VALIDATED_AND_LOCKED;
  const isPending = selectedLog?.status === DailyLogStatus.PENDING_VALIDATION;
  const isReturned = selectedLog?.status === DailyLogStatus.RETURNED_FOR_REVISION;

  const handleApproveAndLock = async () => {
    if (!selectedLog) return;
    const res = await validateAndLockDailyLog(
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

  const handleDisapproveAndReturn = async () => {
    if (!selectedLog) return;
    if (!rejectionReason.trim()) {
      setFeedback({
        text: 'Please enter a revision reason so staff understands what needs recount or correction.',
        type: 'error',
      });
      return;
    }

    const res = await rejectAndReturnDailyLog(selectedLog.id, rejectionReason.trim());
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
                Staff & Receiving Approvals
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                Approve inbound stock and review staff counts, sales, and wastage logs.
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

      {/* Receiving Approvals Panel */}
      <div className={`p-5 rounded-2xl border ${
        isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200/80 dark:border-neutral-800 pb-3 mb-4">
          <div className="flex items-center space-x-3">
            <span className="p-2 rounded-full bg-[#80C7F2]/15 text-[#0369a1] dark:text-[#80C7F2] flex items-center justify-center shrink-0 shadow-xs">
              <Boxes className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-neutral-900 dark:text-white flex items-center space-x-2 leading-none">
                <span>Receiving Approvals</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  pendingInboundManifests.length > 0 
                    ? 'bg-[#F37021] text-white animate-pulse' 
                    : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 font-bold'
                }`}>
                  {pendingInboundManifests.length} pending
                </span>
              </h2>
              <p className="text-[11px] text-neutral-500 font-medium mt-1 leading-none">
                Accepted packs are added to Current Stock after branch-manager approval.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowApprovalHistory(!showApprovalHistory)}
            className="text-xs font-bold text-[#F37021] hover:text-[#e05f10] transition-colors hover:underline cursor-pointer"
          >
            {showApprovalHistory ? 'Hide approval history' : 'Show approval history'}
          </button>
        </div>

        {/* History view */}
        {showApprovalHistory && (
          <div className="space-y-3 mb-4 p-4 rounded-xl bg-neutral-50 dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-800">
            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
              Recently Approved Manifests ({approvedInboundManifests.length})
            </h3>
            {approvedInboundManifests.length === 0 ? (
              <p className="text-xs text-neutral-400 italic">No historical approvals found in this shift log.</p>
            ) : (
              <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {approvedInboundManifests.map((mnf) => (
                  <div key={mnf.manifestNumber} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="flex items-center space-x-2">
                        <strong className="font-mono text-neutral-950 dark:text-white">{mnf.manifestNumber}</strong>
                        <span className="text-[10px] text-neutral-400">Shift Date: {mnf.logDate}</span>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        {mnf.items.map((it) => `${it.receivedUnits}x ${it.productName}`).join(', ')}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md self-start sm:self-center">
                      STOCK CREDITED
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Main Pending Approvals List */}
        {pendingInboundManifests.length === 0 ? (
          <p className="text-xs text-neutral-400 italic p-2 text-center">
            No receipts to review. Submitted deliveries will appear here.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingInboundManifests.map((mnf) => (
              <div
                key={mnf.manifestNumber}
                className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-[#121212] flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-neutral-900 dark:text-white select-all">
                      Manifest: {mnf.manifestNumber}
                    </span>
                    <span className="text-[10px] text-[#F37021] bg-[#F37021]/15 px-2 py-0.5 rounded-md font-bold">
                      Pending Action
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Source: {mnf.supplierOrSource}</p>
                  
                  <div className="mt-3 space-y-1 bg-white dark:bg-[#181818] p-2.5 rounded-xl border border-neutral-200/60 dark:border-neutral-800">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Flavors to Credit:</p>
                    {mnf.items.map((it) => (
                      <div key={it.id} className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200">{it.productName}</span>
                        <span className="font-mono font-bold text-sky-600 dark:text-sky-400">{it.receivedUnits} packs</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end pt-2 border-t border-neutral-200/60 dark:border-neutral-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      const res = approveInboundManifest(mnf.logId, mnf.manifestNumber, currentUser?.name || 'Branch Manager');
                      if (res.success) {
                        setFeedback({
                          text: `Successfully approved manifest ${mnf.manifestNumber}. Stock has been credited immediately to Current Stock!`,
                          type: 'success',
                        });
                        setTimeout(() => setFeedback(null), 5000);
                      } else {
                        setFeedback({
                          text: res.error || 'Failed to approve manifest.',
                          type: 'error',
                        });
                      }
                    }}
                    className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1.5 shadow-sm active:scale-98"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve & Credit to Stock</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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

      <InboundApprovalQueue />

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

            {/* Inbound Received Shipments Inspection */}
            <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#181818] shadow-xs">
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 font-bold text-xs sm:text-sm text-neutral-900 dark:text-white flex items-center justify-between">
                <span>Inbound Received Shipments Verification</span>
                <span className="text-[10px] uppercase font-bold text-sky-600 dark:text-[#80C7F2] bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 rounded-md">
                  Active Stock-In on Lock
                </span>
              </div>

              {selectedLog.inboundReceiving && selectedLog.inboundReceiving.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850/50 text-[11px] font-bold uppercase text-neutral-500">
                        <th className="py-2.5 px-3">Manifest / Source</th>
                        <th className="py-2.5 px-3">Gourmet Flavor</th>
                        <th className="py-2.5 px-2 text-center">Expected</th>
                        <th className="py-2.5 px-2 text-center">Received</th>
                        <th className="py-2.5 px-3 text-center">Condition</th>
                        <th className="py-2.5 px-3">Notes & Observations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                      {selectedLog.inboundReceiving.map((item) => (
                        <tr key={item.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                          <td className="py-3 px-3 font-semibold text-neutral-900 dark:text-white">
                            <div className="font-mono text-xs">{item.manifestNumber}</div>
                            <div className="text-[10px] text-neutral-400 font-normal">{item.supplierOrSource}</div>
                          </td>
                          <td className="py-3 px-3 text-neutral-800 dark:text-neutral-200 font-medium">
                            {item.productName}
                          </td>
                          <td className="py-3 px-2 text-center font-mono text-neutral-500">
                            {item.expectedUnits}
                          </td>
                          <td className="py-3 px-2 text-center font-mono font-bold text-[#0369a1] dark:text-[#80C7F2]">
                            {item.receivedUnits}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.condition === 'good'
                                ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : item.condition === 'damaged'
                                ? 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300'
                                : 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300'
                            }`}>
                              {item.condition.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-neutral-600 dark:text-neutral-400 max-w-xs">
                            <div className="line-clamp-2 text-[11px]" title={item.notes}>
                              {item.notes || <span className="text-neutral-300 italic">No notes</span>}
                            </div>
                            {item.damageProof && (
                              <div className="mt-1">
                                <a
                                  href={item.damageProof.dataUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center space-x-1 text-[10px] font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                                >
                                  <span>View Damage Proof Photo</span>
                                </a>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="p-3 text-[11px] text-neutral-500 bg-neutral-50/50 dark:bg-neutral-900/50 border-t border-neutral-100 dark:border-neutral-850 flex items-center space-x-1.5">
                    <span className="text-[#0369a1] dark:text-[#80C7F2] font-bold">💡 Note:</span>
                    <span>Upon approving and locking this shift log, these received packs will be automatically added to store active stock and made available for sales.</span>
                  </div>
                </div>
              ) : (
                <div className="p-5 text-center text-xs text-neutral-400">
                  No inbound shipments or manifest stock-ins recorded for this shift.
                </div>
              )}
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
                        Locks physical counts, manual sales, and wastage. Syncs validated daily figures to Legazpi City Commissary Hub.
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
