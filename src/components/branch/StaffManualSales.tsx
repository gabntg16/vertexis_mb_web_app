import { businessDate } from '../../../functions/src/transactionModel';
import React, { useMemo, useState } from 'react';
import { AlertTriangle, Banknote, CheckCircle2, Clock, Info, Receipt, Save, Smartphone } from 'lucide-react';
import { useData } from '../../context/DataContext';

interface StaffManualSalesProps {
  onNavigateTab?: (tab: string) => void;
}

type PaymentMethod = 'Cash' | 'GCash' | 'Bank Transfer';

export const StaffManualSales: React.FC<StaffManualSalesProps> = () => {
  const {
    currentUser,
    currentBranch,
    getInventoryForBranch,
    getSalesForBranch,
    products,
    submitManualSale,
    themeMode,
  } = useData();
  const isDark = themeMode === 'dark';
  const branchId = currentUser?.branchId || currentBranch?.id || '';
  const inventory = getInventoryForBranch(branchId);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const today = businessDate();
  const todaySales = useMemo(
    () => getSalesForBranch(branchId).filter((sale) => businessDate(new Date(sale.date)) === today && sale.status !== 'voided' && sale.status !== 'refunded'),
    [branchId, getSalesForBranch, today]
  );
  const summary = useMemo(
    () => ({
      units: todaySales.reduce((sum, sale) => sum + sale.quantity, 0),
      revenue: todaySales.reduce((sum, sale) => sum + sale.total, 0),
      cashTarget: todaySales.filter((sale) => sale.paymentMethod === 'Cash').reduce((sum, sale) => sum + sale.total, 0),
    }),
    [todaySales]
  );

  const selectedInventory = inventory.find((item) => item.productId === productId);
  const selectedProduct = products.find((product) => product.id === productId);
  const parsedQuantity = Number(quantity);
  const isReferenceRequired = paymentMethod !== 'Cash';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving) return;
    setFeedback(null);

    if (!productId) {
      setFeedback({ type: 'error', text: 'Select a product before saving the sale.' });
      return;
    }
    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      setFeedback({ type: 'error', text: 'Quantity sold must be a whole number greater than zero.' });
      return;
    }
    if (selectedInventory && parsedQuantity > selectedInventory.stock) {
      setFeedback({ type: 'error', text: `Only ${selectedInventory.stock} units of ${selectedProduct?.flavor || 'this product'} are available.` });
      return;
    }
    if (isReferenceRequired && !paymentReference.trim()) {
      setFeedback({ type: 'error', text: 'Enter the payment reference for this digital payment.' });
      return;
    }

    setIsSaving(true);
    const result = await submitManualSale({
      productId,
      quantity: parsedQuantity,
      paymentMethod,
      paymentReference,
    });
    setIsSaving(false);

    if (!result.success) {
      setFeedback({ type: 'error', text: result.error || 'Unable to save the sale.' });
      return;
    }

    setFeedback({ type: 'success', text: `${parsedQuantity} unit${parsedQuantity === 1 ? '' : 's'} of ${selectedProduct?.flavor} recorded and deducted from inventory.` });
    setProductId('');
    setQuantity('1');
    setPaymentReference('');
    setPaymentMethod('Cash');
  };

  if (!currentUser || !currentBranch) return null;

  return (
    <div className="space-y-6" id="staff-manual-sales-view">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <Receipt className="h-4 w-4 text-sky-600" />
            <span>Front-of-house shift operations</span>
            <span className="font-mono">{today}</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight">Manual Sales Entry</h1>
          <p className="text-xs font-medium text-neutral-500">Record one completed sale and keep branch stock current.</p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
          <Info className="h-3.5 w-3.5" />
          Internal Operational Log Only — Not a BIR Official Receipt.
        </div>
      </div>

      {feedback && (
        <div className={`flex items-center gap-2 rounded-2xl border p-4 text-xs font-bold ${feedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300' : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300'}`}>
          {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
          {feedback.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Total Units Sold Today" value={`${summary.units} units`} icon={<Receipt className="h-4 w-4 text-sky-500" />} isDark={isDark} />
        <SummaryCard label="Shift Sales Revenue" value={`₱${summary.revenue.toLocaleString()}`} icon={<Banknote className="h-4 w-4 text-emerald-500" />} isDark={isDark} />
        <SummaryCard label="Shift Cash Drawer Target" value={`₱${summary.cashTarget.toLocaleString()}`} icon={<Clock className="h-4 w-4 text-amber-500" />} isDark={isDark} />
      </div>

      <form onSubmit={handleSubmit} className={`rounded-3xl border p-5 shadow-xs sm:p-6 ${isDark ? 'border-neutral-800 bg-[#161616]' : 'border-neutral-200 bg-white'}`}>
        <div className="mb-5 flex items-center gap-2">
          <div className="rounded-xl bg-sky-500/10 p-2 text-sky-600"><Save className="h-4 w-4" /></div>
          <div>
            <h2 className="text-base font-bold">New Sales Entry</h2>
            <p className="text-xs text-neutral-500">Stock is checked again when the transaction is committed.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Shift / Staff ID">
            <input value={`${currentUser.name} (${currentUser.id})`} readOnly className={readOnlyClass} />
          </Field>
          <Field label="Branch Location">
            <select value={currentBranch.id} disabled className={readOnlyClass}>
              <option value={currentBranch.id}>{currentBranch.name} ({currentBranch.code})</option>
            </select>
          </Field>
          <Field label="SKU / Product Item">
            <select value={productId} onChange={(event) => setProductId(event.target.value)} required className={inputClass}>
              <option value="">Select active inventory item</option>
              {inventory.map((item) => {
                const product = products.find((entry) => entry.id === item.productId);
                return <option key={item.productId} value={item.productId}>{product?.flavor || item.productName} — {item.stock} available</option>;
              })}
            </select>
            {selectedInventory && <span className="mt-1 block text-[11px] text-neutral-500">Available now: {selectedInventory.stock} units</span>}
          </Field>
          <Field label="Quantity Sold">
            <input type="number" min="1" max={selectedInventory?.stock || undefined} step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} required className={inputClass} />
          </Field>
          <Field label="Payment Channel">
            <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)} className={inputClass}>
              <option value="Cash">Cash</option>
              <option value="GCash">GCash</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </Field>
          <Field label={`Proof of Payment Reference No.${isReferenceRequired ? '' : ' (Optional)'}`}>
            <input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} required={isReferenceRequired} placeholder={isReferenceRequired ? 'Enter reference number' : 'Optional for cash'} className={inputClass} />
          </Field>
        </div>

        <div className="mt-5 flex flex-col items-start justify-between gap-3 border-t border-neutral-200 pt-5 dark:border-neutral-800 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-xs text-neutral-500"><Smartphone className="h-4 w-4" /> Sale total uses the centrally configured SRP: ₱{selectedProduct?.price || 0} per unit.</div>
          <button type="submit" disabled={isSaving} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
            <Save className="h-4 w-4" /> {isSaving ? 'Saving...' : 'Save Sale & Deduct Stock'}
          </button>
        </div>
      </form>
    </div>
  );
};

const inputClass = 'w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-neutral-700 dark:bg-[#121212] dark:text-white';
const readOnlyClass = `${inputClass} cursor-not-allowed bg-neutral-100 dark:bg-neutral-900`;

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
    <span className="mb-1.5 block">{label}</span>
    {children}
  </label>
);

const SummaryCard: React.FC<{ label: string; value: string; icon: React.ReactNode; isDark: boolean }> = ({ label, value, icon, isDark }) => (
  <div className={`rounded-2xl border p-4 ${isDark ? 'border-neutral-800 bg-[#181818]' : 'border-neutral-200 bg-white shadow-xs'}`}>
    <div className="flex items-center justify-between text-xs font-semibold text-neutral-500"><span>{label}</span>{icon}</div>
    <p className="mt-2 text-2xl font-black">{value}</p>
  </div>
);
