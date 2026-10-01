import React, { useEffect, useRef } from 'react';
import { AlertCircle, Package, X } from 'lucide-react';
import type { Order, ProductionBatch } from '../../types';

interface Props {
  order: Order;
  batches: ProductionBatch[];
  stageLabel: string;
  onClose: () => void;
}

const currency = (amount: number) => amount.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
const statusLabels: Record<Order['status'], string> = {
  pending: 'Pending', waitingApproval: 'Under Review', approved: 'Approved', rejected: 'Rejected',
  dispatched: 'Dispatched', completed: 'Completed', canceled: 'Canceled', in_production: 'In Production',
};
const batchLabels: Record<ProductionBatch['stage'], string> = {
  in_kettle: 'In Kitchen', curing: 'Curing', packaging: 'Packing & QC', packaged: 'Packed & QC',
  completed: 'Completed', in_production: 'In Kitchen',
};

export const CommissaryRequisitionInspect: React.FC<Props> = ({ order, batches, stageLabel, onClose }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);
  const totalUnits = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const hasProof = Boolean(order.proofImagePath?.trim());
  const productionEligible = order.status === 'approved' && hasProof;
  const submitted = new Date(order.createdAt);
  return (
    <dialog ref={dialogRef} aria-labelledby="inspect-requisition-title" onCancel={onClose}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}
      className="fixed inset-0 m-auto w-[calc(100%_-_1.5rem)] max-w-3xl max-h-[90dvh] overflow-y-auto rounded-3xl border border-neutral-200 bg-white p-0 text-neutral-900 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-xs dark:border-neutral-800 dark:bg-[#161616] dark:text-white">
      <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-neutral-200 bg-white p-5 sm:p-6 dark:border-neutral-800 dark:bg-[#161616]">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="break-all font-mono text-xs text-neutral-500">ORDER #{order.id}</span>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${order.status === 'approved' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'}`}>{statusLabels[order.status]}</span>
            {order.packageName && <span className="rounded-lg bg-neutral-100 px-2 py-1 text-xs dark:bg-neutral-800">{order.packageName}</span>}
          </div>
          <h2 id="inspect-requisition-title" className="text-xl font-bold">{order.branchName}</h2>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Submitted {Number.isFinite(submitted.getTime()) ? submitted.toLocaleString() : 'date unavailable'}</p>
        </div>
        <button type="button" autoFocus onClick={onClose} aria-label="Close requisition inspection" className="shrink-0 rounded-xl p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"><X className="h-5 w-5" /></button>
      </header>
      <div className="space-y-6 p-5 sm:p-6">
        <section aria-label="Production details">
          <dl className="grid grid-cols-1 gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm sm:grid-cols-3 dark:border-neutral-800 dark:bg-neutral-900/60">
            <div><dt className="text-xs text-neutral-500 dark:text-neutral-400">Production stage</dt><dd className="mt-1 font-bold text-amber-700 dark:text-amber-400">{stageLabel}</dd></div>
            <div><dt className="text-xs text-neutral-500 dark:text-neutral-400">Lot / batch code</dt><dd className="mt-1 break-all font-mono text-xs font-semibold">{order.batchCode || 'Not assigned'}</dd></div>
            <div><dt className="text-xs text-neutral-500 dark:text-neutral-400">Estimated dispatch ready</dt><dd className="mt-1 font-semibold">{order.estimatedReadyDate || 'Not scheduled'}</dd></div>
          </dl>
          {!productionEligible && !order.isDispatched && !['completed', 'dispatched'].includes(order.status) && (
            <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400"><AlertCircle className="h-4 w-4 shrink-0" />{order.status !== 'approved' ? 'Requires order approval before commissary processing.' : 'Payment proof is required before commissary processing.'}</p>
          )}
        </section>
        <section aria-labelledby="inspect-items-title">
          <div className="mb-3 flex items-center justify-between gap-2"><h3 id="inspect-items-title" className="flex items-center gap-2 text-sm font-bold"><Package className="h-4 w-4 text-emerald-600" />Requested items</h3><span className="text-xs text-neutral-500">{totalUnits.toLocaleString()} total units</span></div>
          <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-left text-xs"><thead className="bg-neutral-50 dark:bg-neutral-900"><tr><th scope="col" className="p-3">Flavor / product</th><th scope="col" className="p-3 text-right">Units</th><th scope="col" className="p-3 text-right whitespace-nowrap">Unit price</th><th scope="col" className="p-3 text-right">Amount</th></tr></thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">{order.items.map((item, index) => <tr key={`${item.productId}-${index}`}><td className="min-w-40 p-3 font-semibold">{item.productName}{item.flavor && <span className="mt-1 block font-normal text-neutral-500">{item.flavor}</span>}</td><td className="p-3 text-right font-bold tabular-nums">{item.quantity.toLocaleString()}</td><td className="p-3 text-right whitespace-nowrap">{currency(item.unitPrice)}</td><td className="p-3 text-right font-semibold whitespace-nowrap text-emerald-700 dark:text-emerald-400">{currency(item.quantity * item.unitPrice)}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-700 dark:text-emerald-400"><span>Total order value</span><span>{currency(order.totalAmount)}</span></div>
        </section>
        <section aria-labelledby="inspect-batches-title"><h3 id="inspect-batches-title" className="mb-3 text-sm font-bold">Kitchen batches</h3>
          {batches.length ? <div className="space-y-2">{batches.map(batch => <div key={batch.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-200 p-3 text-xs dark:border-neutral-800"><div><p className="font-semibold">{batch.productFlavor}</p><p className="mt-1 break-all font-mono text-neutral-500">{batch.batchCode}</p></div><span className="font-semibold">{batch.quantity.toLocaleString()} units · {batchLabels[batch.stage]}</span></div>)}</div> : <p className="rounded-xl bg-neutral-50 p-4 text-xs text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">No kitchen batches have been recorded for this requisition.</p>}
        </section>
        {order.rejectionReason && <p className="rounded-xl bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-400">Rejection reason: {order.rejectionReason}</p>}
      </div>
      <footer className="flex items-center justify-between gap-3 border-t border-neutral-200 p-4 dark:border-neutral-800"><p className="text-xs text-neutral-500 dark:text-neutral-400">Use the requisition list to update production stages.</p><button type="button" onClick={onClose} className="rounded-xl bg-neutral-100 px-5 py-2.5 text-sm font-bold hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700">Close</button></footer>
    </dialog>
  );
};
