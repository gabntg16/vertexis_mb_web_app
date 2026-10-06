import React, { useEffect, useRef, useState } from 'react';
import { X, Upload, AlertCircle, ReceiptText, Smartphone, ShieldCheck, Check, QrCode } from 'lucide-react';
import { Order, DigitalPaymentMethod, PaymentGatewayStatus } from '../../types';
import { validateUploadedFile } from '../../utils/fileValidation';
import { getGCashQRCode } from '../../utils/gcashQRCodes';

export interface PackageTierDetails {
  id: 'silver' | 'gold' | 'platinum';
  name: string;
  price: number;
  formattedPrice: string;
  badgeClass: string;
}

export const getPackageTierDetails = (order: Order): PackageTierDetails => {
  const tier = (order.packageTier || '').toLowerCase();
  const name = (order.packageName || '').toLowerCase();
  const amount = Math.round(Number(order.totalAmount || 0));

  if (tier === 'platinum' || (!tier && (name.includes('platinum') || amount === 7000))) {
    return {
      id: 'platinum',
      name: 'Platinum Package',
      price: 7000,
      formattedPrice: '₱7,000.00',
      badgeClass: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
    };
  }
  if (tier === 'gold' || (!tier && (name.includes('gold') || amount === 5775))) {
    return {
      id: 'gold',
      name: 'Gold Package',
      price: 5775,
      formattedPrice: '₱5,775.00',
      badgeClass: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    };
  }
  // Default to Silver
  return {
    id: 'silver',
    name: 'Silver Package',
    price: 3999,
    formattedPrice: '₱3,999.00',
    badgeClass: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
  };
};

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
  const method = 'gcash' as const;
  const tierDetails = getPackageTierDetails(order);

  const [reference, setReference] = useState('');
  const [proof, setProof] = useState('');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const packCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const qrCodeUrl = getGCashQRCode(tierDetails.id, packCount, order.totalAmount);

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
        <header className="flex shrink-0 items-center gap-3 border-b border-neutral-200 bg-neutral-50 px-5 py-4 dark:border-neutral-700 dark:bg-neutral-900">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-100/80 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
            <ReceiptText size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="payment-proof-title" className="text-sm font-bold leading-5 sm:text-base">GCash Proof of Payment (PoP) Verification</h2>
            <p className="mt-0.5 break-words text-xs leading-4 text-neutral-500 dark:text-neutral-400">Order #{order.id} &bull; {branchName}</p>
          </div>
          <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
            GCash
          </span>
          <button type="button" onClick={onClose} disabled={saving || validating} aria-label="Close payment form" className="-mr-2 shrink-0 rounded-lg p-2 text-neutral-400 hover:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-blue-500 dark:hover:bg-neutral-800 cursor-pointer">
            <X size={18} />
          </button>
        </header>

        <form onSubmit={submit} className="min-h-0 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5 [scrollbar-color:#bae6fd_transparent] [scrollbar-width:thin]">
          {/* Order Summary Section */}
          <section aria-label="Order summary" className="space-y-2.5 rounded-2xl border border-neutral-200 bg-neutral-50 p-3.5 dark:border-neutral-700 dark:bg-neutral-800/50">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">TOTAL PAYMENT DUE</span>
              <strong className="text-xl font-black text-blue-600 dark:text-blue-400">{total}</strong>
            </div>
            {order.packageName && (
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-neutral-700 dark:text-neutral-300">{order.packageName}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${tierDetails.badgeClass}`}>
                  {tierDetails.name}
                </span>
              </div>
            )}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {order.items.map((item, index) => (
                <span key={`${item.productId}-${index}`} className="rounded-lg border border-neutral-200 bg-white px-2 py-0.5 text-[11px] text-neutral-600 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">
                  {item.quantity}&times; {item.productName}{item.flavor ? ` (${item.flavor})` : ''}
                </span>
              ))}
            </div>
          </section>

          {/* GCash Exclusive Payment Option & Dynamic Tier QR Code */}
          <section aria-labelledby="payment-channel-label" className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 id="payment-channel-label" className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Payment Channel
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                <Check size={12} /> GCash Only
              </span>
            </div>

            {/* GCash Active Channel Badge */}
            <div className="rounded-2xl border-2 border-blue-500 bg-blue-50/70 p-3.5 text-left dark:border-blue-500 dark:bg-blue-950/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs font-black text-sm">
                    G
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-neutral-900 dark:text-white">GCash</span>
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        Active
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Exclusive Digital Payment Method</p>
                  </div>
                </div>
                <Smartphone size={18} className="text-blue-600 dark:text-blue-400" />
              </div>
            </div>

            {/* Dynamic GCash QR Code Payment Instructions */}
            <div className="rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-50/70 via-white to-blue-50/30 p-4 sm:p-5 dark:border-blue-900 dark:from-blue-950/30 dark:via-neutral-900 dark:to-neutral-900 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100 dark:border-blue-900/60 pb-3">
                <div>
                  <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider">
                    GCash Payment Instructions
                  </h4>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Pay for your <strong className="text-neutral-800 dark:text-neutral-200">{tierDetails.name}</strong>
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border shadow-2xs ${tierDetails.badgeClass}`}>
                  {tierDetails.name}
                </span>
              </div>

              <div className="text-center rounded-xl bg-blue-100 p-3 dark:bg-blue-950" aria-live="polite">
                <p className="text-xs font-bold uppercase text-blue-800 dark:text-blue-200">Total Amount Due</p>
                <p className="text-3xl sm:text-4xl font-black text-blue-700 dark:text-blue-300 break-words">{total}</p>
                <p className="text-xs mt-1">{packCount} packs · Enter this exact amount in GCash.</p>
              </div>
              {/* Centered Responsive QR Code Card */}
              <div className="flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-full max-w-sm p-3.5 sm:p-4 bg-white rounded-3xl shadow-md border-2 border-blue-400/40 dark:border-blue-500/50 inline-flex flex-col items-center">
                  {/* Top banner tag */}
                  <div className="mb-2 px-3 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                    <Smartphone size={11} className="text-blue-600" />
                    <span>GCash Scan to Pay</span>
                  </div>

                  <img
                    src={qrCodeUrl}
                    alt={`GCash QR Code for ${tierDetails.name} (${total})`}
                    className="block w-full max-w-xs h-auto mx-auto rounded-lg shadow-md object-contain"
                  />

                  {/* Price Tag pill */}
                  <div className="mt-2.5 px-4 py-1 rounded-full bg-blue-600 text-white text-xs sm:text-sm font-black shadow-xs tracking-tight">
                    {total}
                  </div>
                </div>

                {/* Clear Instruction Copy */}
                <div className="space-y-1.5 max-w-sm px-2">
                  <p className="text-sm font-black text-neutral-900 dark:text-neutral-100 flex items-center justify-center gap-1.5">
                    <QrCode size={16} className="text-blue-600 dark:text-blue-400" />
                    <span>Scan to pay via GCash</span>
                  </p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-snug">
                    Please scan the QR code above in your GCash app and transfer exactly <strong className="text-blue-600 dark:text-blue-400">{total}</strong> before uploading your payment proof.
                  </p>
                </div>

                {/* Account Details Box */}
                <div className="w-full max-w-xs rounded-xl border border-neutral-200 bg-white p-2.5 dark:border-neutral-700 dark:bg-neutral-800/80 text-left text-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-neutral-400">Account Name:</span>
                    <span className="font-bold text-neutral-800 dark:text-neutral-200">Central Bicol Commissary</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-neutral-400">Package Tier:</span>
                    <span className="font-bold text-neutral-800 dark:text-neutral-200">{tierDetails.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-neutral-400">Amount Due:</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{total}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Submit Proof Section */}
          <section className="space-y-4 border-t border-neutral-200 pt-3 dark:border-neutral-700" aria-labelledby="manual-proof-label">
            <div>
              <h3 id="manual-proof-label" className="text-xs font-bold text-neutral-800 dark:text-neutral-100 uppercase tracking-wider">
                Upload GCash Payment Proof
              </h3>
              <p className="mt-0.5 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                Provide your GCash transaction reference number and upload the official transfer receipt screenshot.
              </p>
            </div>

            <div>
              <label htmlFor="proof-reference" className="mb-1.5 block text-xs font-semibold">
                GCash Reference / Trace Number <span className="text-red-500">*</span>
              </label>
              <input
                id="proof-reference"
                required
                maxLength={120}
                disabled={saving}
                value={reference}
                onChange={e => setReference(e.target.value)}
                placeholder="e.g., 20261005-XXXXX or Ref No."
                aria-describedby="proof-reference-help"
                className="w-full rounded-xl border border-neutral-300 bg-transparent px-3 py-2.5 font-mono text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-neutral-600 dark:focus:ring-blue-900"
              />
              <p id="proof-reference-help" className="mt-1 text-[11px] text-neutral-400">
                Found on your GCash transaction confirmation receipt screen.
              </p>
            </div>

            <div>
              <label htmlFor="proof-file" className="mb-1.5 block text-xs font-semibold">
                Receipt Screenshot Proof of Payment <span className="text-red-500">*</span>
              </label>
              <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/50 px-3 py-5 text-center dark:border-neutral-600 dark:bg-neutral-800/30">
                <input ref={fileInput} id="proof-file" type="file" accept="image/jpeg,image/png,image/webp" disabled={saving || validating} onChange={upload} aria-describedby="proof-file-help" className="hidden"/>
                <button
                  type="button"
                  disabled={saving || validating}
                  onClick={() => fileInput.current?.click()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-xs font-semibold hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-600 dark:bg-neutral-900 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  <Upload size={16} className="text-blue-500"/>
                  {validating ? 'Checking receipt...' : proof ? 'Replace Receipt Screenshot' : 'Upload Receipt Screenshot'}
                </button>
                <p id="proof-file-help" className="mt-2.5 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                  PNG, JPG or WebP, up to 650 KB.<br/>Checked for file type and image integrity.
                </p>
                {fileName && (
                  <p className="mt-2.5 flex min-w-0 items-center justify-center gap-1 text-xs text-emerald-600">
                    <Check size={14} className="shrink-0"/>
                    <span className="truncate">{fileName}</span>
                  </p>
                )}
              </div>
            </div>

            {validating && <p role="status" className="text-xs text-neutral-500">Checking receipt image...</p>}
            {proof && (
              <img
                src={proof}
                alt="Payment receipt preview"
                className="max-h-60 w-full rounded-xl bg-neutral-100 object-contain dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
              />
            )}
          </section>

          <aside className="flex gap-3 rounded-2xl border border-blue-200 bg-blue-50/60 p-3.5 dark:border-blue-900 dark:bg-blue-950/30">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-blue-500"/>
            <div>
              <h3 className="text-xs font-bold text-blue-900 dark:text-blue-300">Treasury Verification Protocol:</h3>
              <p className="mt-0.5 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                Your reference number and GCash receipt image are submitted to Central Commissary Treasury for audit and approval.
              </p>
            </div>
          </aside>

          {error && (
            <p role="alert" className="flex gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-800 dark:bg-red-950 dark:text-red-200">
              <AlertCircle className="shrink-0" size={18}/>
              {error}
            </p>
          )}

          <footer className="flex items-center gap-3 pt-2 pb-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || validating}
              className="rounded-xl border border-neutral-300 px-4 py-2.5 text-xs font-medium hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-600 dark:hover:bg-neutral-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || validating || !proof || !reference.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-3 text-xs font-bold leading-4 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 dark:disabled:bg-blue-900 cursor-pointer shadow-sm active:scale-[0.99] transition-all"
            >
              <Upload size={15} className="shrink-0"/>
              {saving ? 'Submitting...' : 'Submit Proof of Payment for Admin Review'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};
