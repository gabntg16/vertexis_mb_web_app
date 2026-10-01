import React, { useState } from 'react';
import { CheckCircle2, Clock, PackageCheck } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { isBranchManager } from '../../utils/securityValidator';
import { acceptedInboundUnits, InboundReceipt } from '../../../functions/src/inboundReceivingModel';

export function InboundApprovalQueue({ onRevise }: { onRevise?: (receipt: InboundReceipt) => void }) {
  const { currentUser, inboundReceipts, inventory, reviewInboundReceipt } = useData();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [hasError, setHasError] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const manager = isBranchManager(currentUser);
  const receipts = inboundReceipts
    .filter(receipt => receipt.branchId === currentUser?.branchId)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const pending = receipts.filter(receipt => receipt.status === 'pending');
  const visible = showHistory ? receipts : receipts.filter(receipt => receipt.status !== 'approved');

  const review = async (receipt: InboundReceipt, decision: 'approved' | 'returned') => {
    if (busy) return;
    setBusy(true);
    const result = await reviewInboundReceipt(receipt.id, receipt.revision, decision, notes);
    setBusy(false);
    setHasError(!result.success);
    setFeedback(result.success
      ? decision === 'approved'
        ? 'Receipt approved. Accepted packs have been added to Current Stock.'
        : 'Receipt returned to staff for correction. Stock was not changed.'
      : result.error || 'Unable to save the review.');
    if (result.success) {
      setExpanded(null);
      setNotes('');
    }
  };

  return (
    <section aria-busy={busy} className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-3 sm:p-5 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex flex-wrap items-center gap-2 font-bold">
            <PackageCheck size={19} className="shrink-0 text-emerald-600" />
            <span>Receiving approvals</span>
            <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-800">{pending.length} pending</span>
          </h2>
          <p className="mt-1 text-sm text-neutral-500">Accepted packs are added to Current Stock after branch-manager approval.</p>
        </div>
        <button type="button" className="w-full text-left text-sm font-semibold underline underline-offset-4 sm:w-auto sm:text-right" onClick={() => setShowHistory(value => !value)}>
          {showHistory ? 'Hide approved receipts' : 'Show approval history'}
        </button>
      </div>

      {feedback && (
        <p role={hasError ? 'alert' : 'status'} className={`rounded-lg p-3 text-sm ${hasError ? 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200' : 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'}`}>
          {feedback}
        </p>
      )}
      {!visible.length && <p className="py-3 text-sm text-neutral-500">No receipts to review. Submitted deliveries will appear here.</p>}

      {visible.map(receipt => {
        const totals = acceptedInboundUnits(receipt.items);
        const accepted = [...totals.values()].reduce((sum, item) => sum + item.quantity, 0);
        const isExpanded = expanded === receipt.id;
        return (
          <article key={receipt.id} className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
            <button type="button" disabled={busy} aria-expanded={isExpanded} onClick={() => { setExpanded(isExpanded ? null : receipt.id); setNotes(''); }} className="flex w-full flex-col gap-3 p-3 text-left hover:bg-neutral-50 sm:flex-row sm:items-center sm:justify-between sm:p-4 dark:hover:bg-neutral-800">
              <div className="min-w-0">
                <p className="break-words font-bold">{receipt.manifestNumber}</p>
                <p className="mt-1 break-words text-xs text-neutral-500">{receipt.supplierOrSource} · {receipt.submittedByName} · {new Date(receipt.submittedAt).toLocaleString()}</p>
              </div>
              <div className="text-left sm:shrink-0 sm:text-right">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${receipt.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : receipt.status === 'returned' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                  {receipt.status === 'approved' ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                  {receipt.status === 'approved' ? 'Added to stock' : receipt.status === 'returned' ? 'Returned for correction' : 'Awaiting manager approval'}
                </span>
                <p className="mt-1 text-xs text-neutral-500">{accepted} accepted packs · Inspect</p>
              </div>
            </button>

            {isExpanded && (
              <div className="space-y-3 border-t border-neutral-200 p-3 sm:p-4 dark:border-neutral-700">
                <div className="space-y-2 sm:hidden">
                  {receipt.items.map((item, index) => (
                    <div key={index} className="rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-700">
                      <p className="break-words font-semibold">{item.productName}</p>
                      {item.notes && <p className="mt-1 text-xs text-neutral-500">{item.notes}</p>}
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div><dt className="text-neutral-500">Expected</dt><dd className="font-semibold">{item.expectedUnits}</dd></div>
                        <div><dt className="text-neutral-500">Received</dt><dd className="font-semibold">{item.receivedUnits}</dd></div>
                        <div><dt className="text-neutral-500">Condition</dt><dd className="font-semibold capitalize">{item.condition}</dd></div>
                        <div><dt className="text-neutral-500">Add to stock</dt><dd className="font-semibold">{item.condition === 'damaged' ? 0 : item.receivedUnits}</dd></div>
                      </dl>
                    </div>
                  ))}
                </div>
                <div className="hidden overflow-x-auto sm:block">
                  <table className="w-full text-left text-sm">
                    <thead><tr className="text-xs text-neutral-500"><th className="py-2 pr-4">Product</th><th className="pr-4">Expected</th><th className="pr-4">Received</th><th className="pr-4">Condition</th><th className="text-right">Add to stock</th></tr></thead>
                    <tbody>{receipt.items.map((item, index) => <tr key={index} className="border-t border-neutral-100 dark:border-neutral-800"><td className="py-3 pr-4">{item.productName}{item.notes && <p className="mt-1 text-xs text-neutral-500">{item.notes}</p>}</td><td>{item.expectedUnits}</td><td>{item.receivedUnits}</td><td className="capitalize">{item.condition}</td><td className="text-right font-semibold">{item.condition === 'damaged' ? 0 : item.receivedUnits}</td></tr>)}</tbody>
                  </table>
                </div>
                <p className="text-xs text-neutral-500">Damaged lines are excluded from available stock. Shortages use the quantity actually received.</p>

                {receipt.status === 'pending' && (
                  <div className="space-y-1 rounded-lg bg-neutral-50 p-3 text-sm dark:bg-neutral-800">
                    {[...totals].map(([productId, item]) => {
                      const stock = inventory.find(entry => entry.branchId === receipt.branchId && entry.productId === productId)?.stock || 0;
                      return <p key={productId} className="break-words">{item.productName}: {stock} + {item.quantity} = <strong>{stock + item.quantity} packs</strong></p>;
                    })}
                    <p className="text-xs text-neutral-500">Preview uses current stock. Approval adds to the latest saved balance.</p>
                  </div>
                )}
                {receipt.reviewNotes && <p className="text-sm"><strong>Manager notes:</strong> {receipt.reviewNotes}</p>}
                {receipt.reviewedAt && <p className="text-xs text-neutral-500">Reviewed by {receipt.reviewedByName} · {new Date(receipt.reviewedAt).toLocaleString()}</p>}

                {manager && receipt.status === 'pending' && (
                  <>
                    <label className="block text-sm font-medium">
                      Review notes <span className="font-normal text-neutral-500">(required when returning)</span>
                      <textarea maxLength={1000} value={notes} disabled={busy} onChange={event => setNotes(event.target.value)} className="mt-2 block w-full rounded-lg border border-neutral-300 bg-transparent p-3 dark:border-neutral-600" rows={2} />
                    </label>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <button type="button" disabled={busy || !notes.trim()} onClick={() => void review(receipt, 'returned')} className="w-full rounded-lg border px-4 py-2.5 text-sm font-semibold disabled:opacity-50 sm:w-auto">Return to staff</button>
                      <button type="button" disabled={busy} onClick={() => void review(receipt, 'approved')} className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto">{busy ? 'Saving…' : `Approve & add ${accepted} packs`}</button>
                    </div>
                  </>
                )}
                {receipt.status === 'returned' && onRevise && <button type="button" onClick={() => onRevise(receipt)} className="text-sm font-semibold text-emerald-600 underline underline-offset-4">Correct and resubmit this manifest</button>}
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}
