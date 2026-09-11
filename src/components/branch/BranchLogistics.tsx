import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Delivery, ReceivingStatus, Order } from '../../types';
import {
  Truck,
  PackageCheck,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Calendar,
  Clock,
  RotateCcw,
  PackageX,
  ShieldAlert,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { InboundDiscrepancySafeguardModal, InboundDiscrepancyDetails } from '../safeguards/InboundDiscrepancySafeguardModal';

export const BranchLogistics: React.FC = () => {
  const {
    currentBranch,
    deliveries,
    receivings,
    orders,
    createReceivingInspection,
    themeMode,
  } = useData();

  const [selectedDeliveryForInspect, setSelectedDeliveryForInspect] = useState<Delivery | null>(null);
  const [inspectStatus, setInspectStatus] = useState<ReceivingStatus>('received');
  const [receiverName, setReceiverName] = useState('');
  const [inspectNotes, setInspectNotes] = useState('');
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [discrepancySafeguard, setDiscrepancySafeguard] = useState<InboundDiscrepancyDetails | null>(null);

  if (!currentBranch) return null;

  const branchId = currentBranch.id;
  const isDark = themeMode === 'dark';

  // Find deliveries whose order belongs to this branch
  const branchOrders = orders.filter((o) => o.branchId === branchId);
  const branchOrderIds = new Set(branchOrders.map((o) => o.id));
  const branchDeliveries = deliveries.filter((d) => branchOrderIds.has(d.orderId));

  const selectedOrder = selectedDeliveryForInspect
    ? orders.find((o) => o.id === selectedDeliveryForInspect.orderId)
    : null;

  // Initialize counts when opening modal
  const handleOpenInspection = (del: Delivery) => {
    setSelectedDeliveryForInspect(del);
    setReceiverName(currentBranch.name + ' Manager');
    setInspectStatus('received');
    setInspectNotes('');

    const relOrder = orders.find((o) => o.id === del.orderId);
    const initialCounts: Record<string, number> = {};
    if (relOrder) {
      relOrder.items.forEach((item) => {
        initialCounts[item.productId] = item.quantity;
      });
    }
    setItemCounts(initialCounts);
  };

  const handleInspectSubmit = (e: React.FormEvent, bypassSafeguard: boolean = false) => {
    e.preventDefault();
    if (!selectedDeliveryForInspect || !receiverName.trim() || !selectedOrder) return;

    // Check for discrepancy between dispatched manifest and counted quantities
    let totalDispatched = 0;
    let totalReceived = 0;
    const discrepancies: Array<{
      flavor: string;
      dispatchedQty: number;
      receivedQty: number;
      variance: number;
    }> = [];

    selectedOrder.items.forEach((item) => {
      totalDispatched += item.quantity;
      const count = itemCounts[item.productId] !== undefined ? itemCounts[item.productId] : item.quantity;
      totalReceived += count;
      const variance = count - item.quantity;
      if (variance !== 0) {
        discrepancies.push({
          flavor: item.productName,
          dispatchedQty: item.quantity,
          receivedQty: count,
          variance,
        });
      }
    });

    const hasDiscrepancy = discrepancies.length > 0 || totalReceived !== totalDispatched;

    if (hasDiscrepancy && !bypassSafeguard) {
      setDiscrepancySafeguard({
        isOpen: true,
        deliveryTracking: selectedDeliveryForInspect.trackingNumber || selectedDeliveryForInspect.id,
        courierName: selectedDeliveryForInspect.courierName || 'LBC Express',
        orderId: selectedDeliveryForInspect.orderId,
        dispatchedTotal: totalDispatched,
        receivedTotal,
        discrepancyVariance: totalReceived - totalDispatched,
        itemizedDiscrepancies: discrepancies,
        receiverName: receiverName.trim(),
        inspectNotes: inspectNotes.trim(),
        onConfirmSignOff: () => {
          executeFinalInspection(
            selectedDeliveryForInspect,
            inspectStatus,
            receiverName.trim(),
            inspectNotes.trim(),
            discrepancies
          );
        },
      });
      return;
    }

    executeFinalInspection(
      selectedDeliveryForInspect,
      inspectStatus,
      receiverName.trim(),
      inspectNotes.trim(),
      discrepancies
    );
  };

  const executeFinalInspection = (
    del: Delivery,
    status: ReceivingStatus,
    recName: string,
    notes: string,
    discrepancies: any[]
  ) => {
    let finalNotes = notes;
    if (discrepancies.length > 0) {
      const discSummary = discrepancies
        .map((d) => `${d.flavor}: ${d.variance > 0 ? `+${d.variance}` : d.variance} pcs`)
        .join(', ');
      finalNotes = `[DISCREPANCY DETECTED: ${discSummary}] ${notes}`.trim();
    }

    createReceivingInspection(del.id, del.orderId, status, recName, finalNotes);
    setSelectedDeliveryForInspect(null);
    setReceiverName('');
    setInspectNotes('');
    setItemCounts({});
  };

  // Calculate live discrepancy in modal
  let formDispatchedTotal = 0;
  let formReceivedTotal = 0;
  let formHasDiscrepancy = false;

  if (selectedOrder) {
    selectedOrder.items.forEach((item) => {
      formDispatchedTotal += item.quantity;
      const count = itemCounts[item.productId] !== undefined ? itemCounts[item.productId] : item.quantity;
      formReceivedTotal += count;
      if (count !== item.quantity) formHasDiscrepancy = true;
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight">Inbound Shipments & Receiving</h1>
        <p className="text-xs text-neutral-500 font-medium">
          Track dispatches sent from the Bicol commissary and inspect incoming stock conditions upon arrival.
        </p>
      </div>

      {/* Shipments List */}
      <div className="space-y-3">
        {branchDeliveries.length === 0 ? (
          <div
            className={`p-12 text-center rounded-3xl border ${
              isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200'
            }`}
          >
            <Truck className="w-12 h-12 text-neutral-400 mx-auto mb-3 opacity-60" />
            <p className="text-sm font-bold">No active dispatches for your branch</p>
            <p className="text-xs text-neutral-500 mt-1">
              When you submit a stock order and HQ approves it, tracking information will appear here.
            </p>
          </div>
        ) : (
          branchDeliveries.map((del) => {
            const relOrder = orders.find((o) => o.id === del.orderId);
            const relReceiving = receivings.find((r) => r.deliveryId === del.id);

            return (
              <div
                key={del.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2.5">
                    <span className="font-extrabold text-sm">{del.courierName || 'LBC Express'}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                      {del.trackingNumber || del.id}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        del.status === 'delivered'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : del.status === 'inTransit'
                          ? 'bg-[#80C7F2]/20 text-[#1a7bb5] dark:text-[#80C7F2]'
                          : 'bg-amber-500/15 text-amber-600'
                      }`}
                    >
                      {del.status === 'inTransit' ? '🚚 In Transit to Branch' : del.status}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-600 dark:text-neutral-300">
                    Order #{del.orderId} • {relOrder?.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                  </p>

                  {/* Inspection Status Badge */}
                  {relReceiving ? (
                    <div className="flex items-center space-x-2 pt-1">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center space-x-1 ${
                          relReceiving.status === 'received'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : relReceiving.status === 'damaged'
                            ? 'bg-red-500/10 text-red-600'
                            : 'bg-purple-500/10 text-purple-600'
                        }`}
                      >
                        <FileCheck className="w-3 h-3" />
                        <span>Inspection Status: {relReceiving.status.toUpperCase()}</span>
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        (Inspected by {relReceiving.receiverName} on {new Date(relReceiving.receivedAt || relReceiving.createdAt).toLocaleDateString()})
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-amber-500 font-semibold flex items-center space-x-1 pt-1">
                      <Clock className="w-3 h-3" />
                      <span>Pending branch physical inspection upon delivery</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-3 self-end sm:self-auto">
                  {!relReceiving && (
                    <button
                      onClick={() => handleOpenInspection(del)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all flex items-center space-x-1.5 shadow-xs cursor-pointer"
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      <span>Inspect & Acknowledge</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Inspect / Receiving Acknowledgment Modal with Itemized Verification */}
      {selectedDeliveryForInspect && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div
            className={`w-full max-w-lg rounded-3xl p-6 shadow-2xl border my-8 ${
              isDark ? 'bg-[#1c1c1c] border-neutral-700 text-white' : 'bg-white border-neutral-200 text-neutral-900'
            }`}
          >
            <div className="flex items-center space-x-2 text-emerald-600 mb-2">
              <PackageCheck className="w-5 h-5" />
              <h3 className="text-base font-bold">Inbound Package Inspection</h3>
            </div>
            <p className="text-xs text-neutral-500">
              Verify physical counts against the commissary manifest for Delivery{' '}
              <strong className="text-neutral-700 dark:text-neutral-300">
                {selectedDeliveryForInspect.trackingNumber || selectedDeliveryForInspect.id}
              </strong>.
            </p>

            <form onSubmit={handleInspectSubmit} className="mt-4 space-y-4 text-xs">
              {/* Itemized Physical Count Verification */}
              <div className="space-y-2">
                <label className="block font-bold uppercase tracking-wider text-neutral-400">
                  Itemized Manifest Verification (Dispatched vs Received)
                </label>
                <div
                  className={`rounded-2xl border divide-y overflow-hidden ${
                    isDark ? 'bg-neutral-900 border-neutral-800 divide-neutral-800' : 'bg-neutral-50 border-neutral-200 divide-neutral-200'
                  }`}
                >
                  {selectedOrder.items.map((item) => {
                    const count = itemCounts[item.productId] !== undefined ? itemCounts[item.productId] : item.quantity;
                    const variance = count - item.quantity;

                    return (
                      <div key={item.productId} className="p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-neutral-900 dark:text-white truncate">{item.productName}</p>
                          <p className="text-[11px] text-neutral-400">Manifest: {item.quantity} packs</p>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <div className="flex items-center space-x-1">
                            <span className="text-[11px] text-neutral-400">Count:</span>
                            <input
                              type="number"
                              min="0"
                              value={count}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                setItemCounts((prev) => ({
                                  ...prev,
                                  [item.productId]: isNaN(val) ? 0 : Math.max(0, val),
                                }));
                              }}
                              className={`w-16 p-1 text-center font-mono font-bold rounded-lg border ${
                                variance !== 0
                                  ? 'border-red-500 bg-red-500/10 text-red-500'
                                  : isDark
                                  ? 'bg-neutral-800 border-neutral-700'
                                  : 'bg-white border-neutral-300'
                              }`}
                            />
                          </div>

                          {variance !== 0 && (
                            <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-600 dark:text-red-400">
                              {variance > 0 ? `+${variance}` : variance}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Discrepancy Warning Banner */}
              {formHasDiscrepancy && (
                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-800 dark:text-red-300 flex items-start space-x-2.5 animate-in fade-in">
                  <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div className="text-[11px] space-y-0.5">
                    <p className="font-bold">Quantity Discrepancy Detected</p>
                    <p>
                      Dispatched Manifest: {formDispatchedTotal} packs • Counted: {formReceivedTotal} packs (Variance: {formReceivedTotal - formDispatchedTotal} pcs).
                      A safeguard confirmation dialog will appear upon submission.
                    </p>
                  </div>
                </div>
              )}

              {/* Receiving Condition */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-neutral-400 mb-1">
                  Receiving Condition
                </label>
                <select
                  value={inspectStatus}
                  onChange={(e) => setInspectStatus(e.target.value as ReceivingStatus)}
                  className={`w-full p-2.5 rounded-xl border font-bold ${
                    isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  <option value="received">✅ Received in Good Condition (Complete)</option>
                  <option value="damaged">⚠️ Damaged in Transit (Report to HQ)</option>
                  <option value="returned">🔄 Return to Commissary</option>
                </select>
              </div>

              {/* Receiver Name */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-neutral-400 mb-1">
                  Staff Receiver Name
                </label>
                <input
                  type="text"
                  required
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  placeholder="e.g. Maria Santos (Branch Supervisor)"
                  className={`w-full p-2.5 rounded-xl border ${
                    isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-neutral-50 border-neutral-200'
                  }`}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-neutral-400 mb-1">
                  Inspection Notes & Remarks
                </label>
                <textarea
                  rows={2}
                  value={inspectNotes}
                  onChange={(e) => setInspectNotes(e.target.value)}
                  placeholder="Seals intact, temperature checked, batch verified..."
                  className={`w-full p-2.5 rounded-xl border ${
                    isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-neutral-50 border-neutral-200'
                  }`}
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDeliveryForInspect(null)}
                  className="px-3.5 py-2 font-medium rounded-xl border border-neutral-300 dark:border-neutral-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all cursor-pointer shadow-xs"
                >
                  Confirm & Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Discrepancy Safeguard Modal */}
      {discrepancySafeguard && (
        <InboundDiscrepancySafeguardModal
          details={discrepancySafeguard}
          themeMode={themeMode}
          onClose={() => setDiscrepancySafeguard(null)}
        />
      )}
    </div>
  );
};
