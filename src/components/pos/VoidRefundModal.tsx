import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { BIRReceipt, POSPaymentMethod } from '../../types';
import { generateClientRequestId } from '../../utils/idempotency';
import {
  X,
  AlertTriangle,
  RotateCcw,
  Ban,
  ShieldCheck,
  CheckCircle2,
  Package,
  Trash2,
  Loader2,
} from 'lucide-react';

interface VoidRefundModalProps {
  receipt: BIRReceipt;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const VoidRefundModal: React.FC<VoidRefundModalProps> = ({
  receipt,
  onClose,
  onSuccess,
}) => {
  const { voidPOSTransaction, refundPOSTransaction, currentUser } = useData();

  const [clientRequestId] = useState<string>(() => generateClientRequestId('req_void_refund'));
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [mode, setMode] = useState<'void' | 'refund'>('void');
  const [managerPin, setManagerPin] = useState('');
  const [managerName, setManagerName] = useState(
    currentUser?.role === 'admin' ? currentUser.name : 'Branch Manager'
  );
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<POSPaymentMethod>('Cash');
  const [restockInventory, setRestockInventory] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>(
    receipt.items.map((i) => i.productId)
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toggleItemSelection = (productId: string) => {
    if (selectedItems.includes(productId)) {
      setSelectedItems(selectedItems.filter((id) => id !== productId));
    } else {
      setSelectedItems([...selectedItems, productId]);
    }
  };

  const calculatedRefundAmount = receipt.items
    .filter((i) => selectedItems.includes(i.productId))
    .reduce((sum, i) => sum + i.netAmount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMsg(null);

    if (!reason.trim()) {
      setErrorMsg('Please specify an audit rationale/reason.');
      return;
    }

    if (!managerPin.trim()) {
      setErrorMsg('Manager PIN authorization required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'void') {
        const result = voidPOSTransaction(receipt.id, managerPin, managerName, reason.trim(), clientRequestId);
        if (result.success) {
          onSuccess(`Receipt #${receipt.receiptNumber} successfully VOIDED. Inventory restored.`);
          onClose();
        } else {
          setErrorMsg(result.message || 'Failed to void transaction');
        }
      } else {
        if (selectedItems.length === 0) {
          setErrorMsg('Please select at least one item to refund.');
          return;
        }
        const result = refundPOSTransaction(
          receipt.id,
          managerPin,
          managerName,
          reason.trim(),
          refundMethod,
          restockInventory,
          selectedItems,
          clientRequestId
        );
        if (result.success) {
          onSuccess(
            `Refund of ₱${result.refundAmount?.toLocaleString()} processed for Order Slip #${
              receipt.receiptNumber
            }.`
          );
          onClose();
        } else {
          setErrorMsg(result.message || 'Failed to process refund');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred during void/refund.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Transaction Void & Refund Authorization
              </h3>
              <p className="text-xs text-neutral-500 font-mono">Slip #{receipt.receiptNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Mode Selector */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode('void')}
              className={`p-3 rounded-xl border text-left transition-all ${
                mode === 'void'
                  ? 'border-red-500 bg-red-50/50 dark:bg-red-950/30 text-red-700 dark:text-red-300 ring-1 ring-red-500'
                  : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Ban className="w-4 h-4 text-red-500" />
                <span className="text-xs font-bold uppercase tracking-wider">Full Transaction Void</span>
              </div>
              <p className="text-[11px] mt-1 text-neutral-500">
                Cancel entire sale receipt & return all units to active inventory.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setMode('refund')}
              className={`p-3 rounded-xl border text-left transition-all ${
                mode === 'refund'
                  ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500'
                  : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
              }`}
            >
              <div className="flex items-center space-x-2">
                <RotateCcw className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold uppercase tracking-wider">Customer Item Refund</span>
              </div>
              <p className="text-[11px] mt-1 text-neutral-500">
                Refund specific or damaged items with tender reimbursement.
              </p>
            </button>
          </div>

          {/* Receipt Info Summary */}
          <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-200 dark:border-neutral-700/80 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-neutral-500">Date/Time:</span>
              <span>{new Date(receipt.timestamp).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Original Total:</span>
              <span className="font-bold">₱{receipt.netSales.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Original Tender:</span>
              <span>{receipt.payments.map((p) => p.method).join(', ')}</span>
            </div>
          </div>

          {/* Refund Specific: Items Selection */}
          {mode === 'refund' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block">
                Select Items to Refund:
              </label>
              <div className="space-y-1.5 max-h-36 overflow-y-auto p-2 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700">
                {receipt.items.map((it) => {
                  const isChecked = selectedItems.includes(it.productId);
                  return (
                    <label
                      key={it.productId}
                      className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 text-xs cursor-pointer hover:bg-neutral-50"
                    >
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleItemSelection(it.productId)}
                          className="rounded text-[#F37021] focus:ring-[#F37021]"
                        />
                        <span className="font-medium">{it.flavor} ({it.quantity} pcs)</span>
                      </div>
                      <span className="font-semibold">₱{it.netAmount.toLocaleString()}</span>
                    </label>
                  );
                })}
              </div>

              {/* Refund Method & Inventory disposal toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 block mb-1">
                    Refund Payout Method
                  </label>
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value as POSPaymentMethod)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-hidden"
                  >
                    <option value="Cash">Cash Payout</option>
                    <option value="GCash">GCash Reversal</option>
                    <option value="Maya">Maya Reversal</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 block mb-1">
                    Returned Item Inventory Status
                  </label>
                  <select
                    value={restockInventory ? 'restock' : 'waste'}
                    onChange={(e) => setRestockInventory(e.target.value === 'restock')}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-hidden"
                  >
                    <option value="restock">Return to Sellable Stock</option>
                    <option value="waste">Discard / Defective Waste</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Reason / Rationale Input */}
          <div>
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block mb-1">
              Audit Reason / Customer Explanation <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                mode === 'void'
                  ? 'e.g. Cashier punched wrong flavor / Customer changed mind before leaving'
                  : 'e.g. Customer brought back sealed box / Product packaging defect'
              }
              className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-1 focus:ring-[#F37021] focus:outline-hidden"
            />
          </div>

          {/* Supervisor PIN Authorization */}
          <div className="p-3 bg-red-50/50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-900/60 space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Manager Supervisor Authorization</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400 block mb-0.5">
                  Approving Manager Name
                </label>
                <input
                  type="text"
                  required
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400 block mb-0.5">
                  Supervisor PIN <span className="text-neutral-400">(e.g. 1234)</span>
                </label>
                <input
                  type="password"
                  required
                  maxLength={8}
                  value={managerPin}
                  onChange={(e) => setManagerPin(e.target.value)}
                  placeholder="Enter PIN"
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg font-mono tracking-widest"
                />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 text-xs font-bold text-white rounded-lg flex items-center space-x-1.5 transition-colors shadow-xs disabled:opacity-60 disabled:cursor-not-allowed ${
                mode === 'void'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing Authorization...</span>
                </>
              ) : mode === 'void' ? (
                <>
                  <Ban className="w-3.5 h-3.5" />
                  <span>Authorize Void Transaction</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Refund ₱{calculatedRefundAmount.toLocaleString()}</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
