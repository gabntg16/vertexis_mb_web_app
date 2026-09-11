import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import {
  ArrowLeftRight,
  Plus,
  CheckCircle2,
  Clock,
  Truck,
  Building2,
  AlertTriangle,
  Send,
  Info,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { InterBranchTransfer } from '../../types';

export const ManagerInterBranchTransfers: React.FC = () => {
  const {
    currentUser,
    currentBranch,
    branches,
    products,
    interBranchTransfers,
    createInterBranchTransfer,
    updateTransferStatus,
    themeMode,
  } = useData();

  const isDark = themeMode === 'dark';
  const branchId = currentUser?.branchId || currentBranch?.id || 'b-legazpi';

  // Partner branches (excluding current branch for destination)
  const otherBranches = useMemo(() => {
    return branches.filter((b) => b.id !== branchId);
  }, [branches, branchId]);

  const marshmallowProducts = useMemo(() => {
    return products.filter((p) => p.flavor && !p.id.startsWith('f') && !p.id.startsWith('pkg'));
  }, [products]);

  // Form State
  const [targetBranchId, setTargetBranchId] = useState<string>(() => otherBranches[0]?.id || '');
  const [selectedProductId, setSelectedProductId] = useState<string>('p1');
  const [quantity, setQuantity] = useState<number>(10);
  const [reason, setReason] = useState<string>('Emergency Stockout Prevention');
  const [notes, setNotes] = useState<string>('Same-day regional courier van transfer');
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const currentProduct = products.find((p) => p.id === selectedProductId) || marshmallowProducts[0];
  const targetBranch = branches.find((b) => b.id === targetBranchId);

  // Transfers relevant to this branch (either origin or destination)
  const branchTransfers = useMemo(() => {
    return (interBranchTransfers || []).filter(
      (t) => t.fromBranchId === branchId || t.toBranchId === branchId
    );
  }, [interBranchTransfers, branchId]);

  const handleCreateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetBranch) {
      setFeedback({ text: 'Please select a destination partner branch.', type: 'error' });
      return;
    }
    if (quantity <= 0) {
      setFeedback({ text: 'Please enter a valid transfer quantity.', type: 'error' });
      return;
    }

    const res = createInterBranchTransfer({
      fromBranchId: branchId,
      fromBranchName: currentBranch?.name || 'Legazpi City',
      toBranchId: targetBranch.id,
      toBranchName: targetBranch.name,
      productId: currentProduct.id,
      productName: `${currentProduct.flavor} (${currentProduct.name})`,
      quantity,
      status: 'pending_approval',
      reason,
      requestedBy: currentUser?.name || 'Branch Manager',
      notes,
    });

    if (res.success) {
      setFeedback({
        text: `Lateral transfer request created for ${quantity} packs of ${currentProduct.flavor} to ${targetBranch.name}.`,
        type: 'success',
      });
      setQuantity(10);
      setNotes('');
      setTimeout(() => setFeedback(null), 4000);
    } else {
      setFeedback({ text: res.error || 'Failed to create transfer.', type: 'error' });
    }
  };

  const handleStatusChange = (transferId: string, status: InterBranchTransfer['status']) => {
    updateTransferStatus(transferId, status);
    setFeedback({ text: `Transfer status updated to ${status}.`, type: 'success' });
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div id="manager-inter-branch-transfers-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <ArrowLeftRight className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
                Inter-Branch Lateral Stock Transfers
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                Store Lead lateral balancing: coordinate emergency stock sharing with nearby franchise branches
              </p>
            </div>
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

      {/* Grid: Form + Active Transfers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Create Transfer: 5 cols */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <h2 className="text-base font-bold text-neutral-900 dark:text-white mb-4 flex items-center space-x-2">
            <ArrowLeftRight className="w-4 h-4 text-indigo-500" />
            <span>Request Lateral Stock Transfer</span>
          </h2>

          <form onSubmit={handleCreateTransfer} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Origin Branch (Dispensing Store)
              </label>
              <div className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850 text-xs font-bold text-neutral-800 dark:text-neutral-200">
                {currentBranch?.name || 'Legazpi City Branch'} (Current Store)
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Destination Partner Branch
              </label>
              <select
                value={targetBranchId}
                onChange={(e) => setTargetBranchId(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121212] text-neutral-900 dark:text-white focus:ring-2 focus:ring-[#80C7F2]"
              >
                {otherBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.city})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Marshmallow Flavor to Transfer
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121212] text-neutral-900 dark:text-white focus:ring-2 focus:ring-[#80C7F2]"
              >
                {marshmallowProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.flavor} ({p.name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Quantity to Transfer (Packs)
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 text-xs sm:text-sm font-mono font-bold rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121212] text-neutral-900 dark:text-white focus:ring-2 focus:ring-[#80C7F2]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Transfer Purpose / Justification
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121212] text-neutral-900 dark:text-white focus:ring-2 focus:ring-[#80C7F2]"
              >
                <option value="Emergency Stockout Prevention">Emergency Stockout Prevention</option>
                <option value="Seasonal Overstock Rebalance">Seasonal Overstock Rebalance</option>
                <option value="Weekend Promotion Support">Weekend Promotion Support</option>
                <option value="Delayed Commissary Shipment Buffer">Delayed Commissary Shipment Buffer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Dispatch / Courier Waybill Details
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Same-day regional van courier or staff courier pickup"
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121212] text-neutral-900 dark:text-white focus:ring-2 focus:ring-[#80C7F2]"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Submit Lateral Transfer Request</span>
            </button>
          </form>
        </div>

        {/* Transfer History Table: 7 cols */}
        <div className="lg:col-span-7 space-y-4">
          <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#181818] shadow-xs">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 font-bold text-xs sm:text-sm text-neutral-900 dark:text-white flex items-center justify-between">
              <span>Lateral Transfer Records</span>
              <span className="text-xs font-mono text-neutral-400">{branchTransfers.length} records</span>
            </div>

            {branchTransfers.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-400">
                No active or historical lateral transfers logged.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850/50 text-[11px] font-bold uppercase text-neutral-500">
                      <th className="py-2.5 px-3">Transfer ID & Route</th>
                      <th className="py-2.5 px-3">Item & Qty</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {branchTransfers.map((t) => (
                      <tr key={t.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                        <td className="py-3 px-3">
                          <div className="font-mono font-bold text-neutral-900 dark:text-white">{t.id}</div>
                          <div className="text-[11px] text-neutral-400 flex items-center space-x-1">
                            <span>{t.fromBranchName}</span>
                            <ChevronRight className="w-3 h-3 inline" />
                            <span>{t.toBranchName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-neutral-900 dark:text-white">{t.productName}</div>
                          <div className="text-[11px] text-neutral-400 font-mono font-bold">
                            {t.quantity} packs ({t.reason})
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            t.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : t.status === 'dispatched'
                              ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                              : t.status === 'approved'
                              ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}>
                            {t.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {t.status === 'pending_approval' && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(t.id, 'approved')}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                            >
                              Approve
                            </button>
                          )}
                          {t.status === 'approved' && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(t.id, 'dispatched')}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-sky-600 hover:bg-sky-700 text-white cursor-pointer"
                            >
                              Dispatch
                            </button>
                          )}
                          {t.status === 'dispatched' && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(t.id, 'completed')}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                            >
                              Complete
                            </button>
                          )}
                          {t.status === 'completed' && (
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                              Received
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
