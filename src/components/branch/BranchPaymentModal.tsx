import React, { useEffect, useRef, useState } from 'react';
import { X, Upload, AlertCircle, ReceiptText, Smartphone, Landmark, ShieldCheck, Check } from 'lucide-react';
import { Order, DigitalPaymentMethod, PaymentGatewayStatus } from '../../types';
import { validateUploadedFile } from '../../utils/fileValidation';

interface BranchPaymentModalProps {
  order: Order;
  branchName: string;
  themeMode: 'light' | 'dark';
  onClose: () => void;
  onPaymentComplete: (proof: string, details: {
    paymentMethod: DigitalPaymentMethod | string;
    referenceNumber?: string;
    status: PaymentGatewayStatus;
  }) => void | Promise<void>;
}

export const BranchPaymentModal: React.FC<BranchPaymentModalProps> = ({ order, branchName, themeMode, onClose, onPaymentComplete }) => {
  const [method, setMethod] = useState<'gcash' | 'maya' | 'bank_transfer'>('gcash');
  const [reference, setReference] = useState('');
  const [proof, setProof] = useState('');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; previous?.focus(); };
  }, []);
  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setProof(''); setError(''); setFileName('');
    setValidating(true);
    try {
      const result = await validateUploadedFile(file, { maxSizeBytes: 650000, allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'], verifyImageDecodable: true });
      if (!result.isValid || !result.dataUrl) throw new Error(result.error || 'Choose a readable receipt image.');
      setProof(result.dataUrl); setFileName(file.name);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to read this file.'); }
    finally { setValidating(false); if (fileInput.current) fileInput.current.value = ''; }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy.current || validating) return;
    if (!proof || !reference.trim()) { setError('Add a receipt image and its transaction reference.'); return; }
    busy.current = true; setSaving(true); setError('');
    try { await onPaymentComplete(proof, { paymentMethod: method, referenceNumber: reference.trim(), status: 'PENDING' }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The receipt was not saved. Please retry.'); }
    finally { busy.current = false; setSaving(false); }
  };
  const channels = [
    { id: 'gcash', name: 'GCash', description: 'Corporate E-Wallet', icon: Smartphone, color: 'text-blue-500' },
    { id: 'maya', name: 'Maya', description: 'Corporate Wallet', icon: Smartphone, color: 'text-emerald-500' },
    { id: 'bank_transfer', name: 'Bank Transfer', description: 'Bank deposit / transfer', icon: Landmark, color: 'text-orange-500' },
  ] as const;
  const selectedChannel = channels.find(channel => channel.id === method)!;
  const total = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(order.totalAmount);
  return (
    <div className={`${themeMode === 'dark' ? 'dark ' : ''}fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm sm:p-6`}>
      <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="payment-proof-title"
        className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-[24px] border border-neutral-200 bg-white text-neutral-800 shadow-2xl outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        onKeyDown={event => {
          if (event.key === 'Escape' && !saving && !validating) onClose();
          if (event.key === 'Tab') {
            const items = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled):not([type="file"]), select:not(:disabled)');
            if (!items?.length) return;
            const first = items[0], last = items[items.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
          }
        }}>
        <header className="flex shrink-0 items-center gap-3 border-b border-neutral-200 bg-neutral-50 px-5 py-5 dark:border-neutral-700 dark:bg-neutral-900">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-100/70 text-orange-500 dark:bg-orange-950"><ReceiptText size={20} /></span>
          <div className="min-w-0 flex-1">
            <h2 id="payment-proof-title" className="text-sm font-bold leading-5 sm:text-base">Manual Proof of Payment (PoP) Verification</h2>
            <p className="mt-1 break-words text-xs leading-4 text-neutral-500 dark:text-neutral-400">Order #{order.id} &bull; {branchName}</p>
          </div>
          <span className="rounded-full border border-neutral-200 bg-neutral-100 px-2 py-1 text-[10px] font-medium leading-3 dark:border-neutral-700 dark:bg-neutral-800">Manual<br />Audit</span>
          <button type="button" onClick={onClose} disabled={saving || validating} aria-label="Close payment form" className="-mr-2 shrink-0 rounded-lg p-2 text-neutral-400 hover:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-orange-500 dark:hover:bg-neutral-800"><X size={18} /></button>
        </header>
        <form onSubmit={submit} className="min-h-0 space-y-5 overflow-y-auto overscroll-contain p-5 [scrollbar-color:#bae6fd_transparent] [scrollbar-width:thin] sm:p-6">
          <section aria-label="Order summary" className="space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/50">
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">TOTAL PAYMENT DUE</span><strong className="text-xl font-bold">{total}</strong></div>
            {order.packageName && <p className="text-xs font-semibold">{order.packageName}</p>}
            <div className="flex flex-wrap gap-2">{order.items.map((item, index) => <span key={`${item.productId}-${index}`} className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-[11px] text-neutral-600 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">{item.quantity}&times; {item.productName}{item.flavor ? ` (${item.flavor})` : ''}</span>)}</div>
          </section>
          <section aria-labelledby="payment-channel-label" className="space-y-3">
            <div className="flex items-start gap-2 text-xs leading-4"><h3 id="payment-channel-label" className="font-bold text-neutral-400">PAYEE CHANNEL DETAILS:</h3><p className="text-neutral-500 dark:text-neutral-400">Select your transfer channel to view payee details</p></div>
            <div className="grid grid-cols-3 gap-2" role="group" aria-labelledby="payment-channel-label">
              {channels.map(channel => <button key={channel.id} type="button" disabled={saving} aria-pressed={method === channel.id} onClick={() => setMethod(channel.id)} className={`relative min-w-0 rounded-2xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-blue-500 ${method === channel.id ? 'border-blue-500 bg-blue-50/50 text-blue-600 ring-2 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:ring-blue-900' : 'border-neutral-200 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800'}`}>
                <channel.icon size={17} className={channel.color} />
                {method === channel.id && <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-blue-500" />}
                <span className="mt-4 block text-xs font-bold leading-4">{channel.name}</span>
                <span className={`mt-0.5 block text-[11px] leading-4 ${method === channel.id ? '' : 'text-neutral-500 dark:text-neutral-400'}`}>{channel.description}</span>
              </button>)}
            </div>
            <div className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50/40 p-4 dark:border-blue-900 dark:bg-blue-950/20">
              <h4 className="text-xs font-bold text-blue-800 dark:text-blue-300">Central Commissary {selectedChannel.name} Payee</h4>
              <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900"><p className="text-[10px] font-semibold uppercase text-neutral-400">Payee account details</p><p className="mt-1 text-xs font-semibold">Collection accounts are not configured.</p></div>
              <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">Ask HQ for approved {selectedChannel.name} payment details before transferring <strong>{total}</strong>. If you already paid using details confirmed by HQ, submit your receipt below.</p>
            </div>
          </section>
          <section className="space-y-4 border-t border-neutral-200 pt-3 dark:border-neutral-700" aria-labelledby="manual-proof-label">
            <div><h3 id="manual-proof-label" className="text-xs font-bold">SUBMIT MANUAL VERIFICATION PROOF:</h3><p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">Provide your manual transaction reference and upload the official transfer receipt.</p></div>
            <div><label htmlFor="proof-reference" className="mb-1.5 block text-xs font-semibold">Transaction Reference / Trace Number <span className="text-red-500">*</span></label><input id="proof-reference" required maxLength={120} disabled={saving} value={reference} onChange={e => setReference(e.target.value)} placeholder="Enter the reference on your receipt" aria-describedby="proof-reference-help" className="w-full rounded-xl border border-neutral-300 bg-transparent px-3 py-2.5 font-mono text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-neutral-600 dark:focus:ring-blue-900"/><p id="proof-reference-help" className="mt-1.5 text-[11px] text-neutral-400">Found on your transaction confirmation receipt screen.</p></div>
            <div><label htmlFor="proof-file" className="mb-1.5 block text-xs font-semibold">Receipt Proof of Payment (Image) <span className="text-red-500">*</span></label>
              <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/50 px-3 py-5 text-center dark:border-neutral-600 dark:bg-neutral-800/30">
                <input ref={fileInput} id="proof-file" type="file" accept="image/jpeg,image/png,image/webp" disabled={saving || validating} onChange={upload} aria-describedby="proof-file-help" className="hidden"/>
                <button type="button" disabled={saving || validating} onClick={() => fileInput.current?.click()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-xs font-semibold hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-600 dark:bg-neutral-900 dark:hover:bg-neutral-800"><Upload size={16} className="text-orange-500"/>{validating ? 'Checking receipt...' : proof ? 'Replace Receipt Screenshot' : 'Upload Receipt Screenshot'}</button>
                <p id="proof-file-help" className="mt-3 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">PNG, JPG or WebP, up to 650 KB.<br/>Checked for file type and image integrity.</p>
                {fileName && <p className="mt-3 flex min-w-0 items-center justify-center gap-1 text-xs text-emerald-600"><Check size={14} className="shrink-0"/><span className="truncate">{fileName}</span></p>}
              </div>
            </div>
            {validating && <p role="status" className="text-xs text-neutral-500">Checking receipt image...</p>}
            {proof && <img src={proof} alt="Payment receipt preview" className="max-h-64 w-full rounded-xl bg-neutral-100 object-contain dark:bg-neutral-800"/>}
          </section>
          <aside className="flex gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950/30"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-orange-500"/><div><h3 className="text-xs font-bold text-orange-800 dark:text-orange-300">Manual Treasury Review Protocol:</h3><p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">Your reference number and receipt image are forwarded to the commissary payment verification queue. HQ Admin will manually verify funds before production and dispatch can proceed.</p></div></aside>
          {error && <p role="alert" className="flex gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-800 dark:bg-red-950 dark:text-red-200"><AlertCircle className="shrink-0" size={18}/>{error}</p>}
          <footer className="flex items-center gap-3 pb-1">
            <button type="button" onClick={onClose} disabled={saving || validating} className="rounded-xl border border-neutral-300 px-4 py-2.5 text-xs font-medium hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-600 dark:hover:bg-neutral-800">Cancel</button>
            <button type="submit" disabled={saving || validating || !proof || !reference.trim()} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-3 py-3 text-xs font-bold leading-4 text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-300 dark:disabled:bg-orange-900"><Upload size={15} className="shrink-0"/>{saving ? 'Submitting...' : <span>Submit Proof of<br/>Payment for Admin Review</span>}</button>
          </footer>
        </form>
      </div>
    </div>
  );
};
