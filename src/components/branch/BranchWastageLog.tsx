import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import {
  Trash2,
  AlertTriangle,
  Flame,
  Snowflake,
  ShieldAlert,
  CheckCircle2,
  Filter,
  Search,
  ArrowUpDown,
  History,
  Info,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { SpoilageReason, SpoilageRecord } from '../../types';

const SPOILAGE_REASONS: { label: SpoilageReason; description: string; icon: string }[] = [
  {
    label: 'Expired Shelf Life',
    description: 'Passed 30-day recommended fresh gourmet shelf life',
    icon: '⏳',
  },
  {
    label: 'Melted / Heat Damaged',
    description: 'Deformed or melted due to ambient heat/sunlight exposure',
    icon: '🔥',
  },
  {
    label: 'Packaging Seal Compromised',
    description: 'Pouch puncture, zip lock tear, or unsealed packaging',
    icon: '📦',
  },
  {
    label: 'Dropped / Crushed in Handling',
    description: 'Physical deformation from accidental in-store dropping',
    icon: '💥',
  },
  {
    label: 'Quality Defect',
    description: 'Flavor texture anomaly or discoloration observed upon opening',
    icon: '⚠️',
  },
  {
    label: 'Transit / Delivery Damage',
    description: 'Packs crushed or damaged upon courier delivery arrival',
    icon: '🚚',
  },
];

export const BranchWastageLog: React.FC = () => {
  const {
    currentBranch,
    products,
    getInventoryForBranch,
    spoilageRecords,
    recordSpoilage,
    currentUser,
    themeMode,
  } = useData();

  const isDark = themeMode === 'dark';
  const branchId = currentBranch?.id || '';
  const branchInventory = getInventoryForBranch(branchId);

  // Form State
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedReason, setSelectedReason] = useState<SpoilageReason>('Expired Shelf Life');
  const [batchCode, setBatchCode] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Filter & Search State for Wastage Log
  const [searchQuery, setSearchQuery] = useState('');
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'qty_desc' | 'cost_desc'>('date_desc');

  const showFeedback = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  const branchSpoilage = useMemo(() => {
    return spoilageRecords.filter((r) => r.branchId === branchId);
  }, [spoilageRecords, branchId]);

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];
  const currentItemStock = branchInventory.find((i) => i.productId === selectedProductId)?.stock || 0;
  const unitCost = selectedProduct?.wholesalePrice || 100;
  const estimatedCostImpact = quantity * unitCost;

  // Summary Metrics
  const totalSpoiledUnits = branchSpoilage.reduce((sum, r) => sum + r.quantity, 0);
  const totalFinancialLoss = branchSpoilage.reduce((sum, r) => sum + r.costImpact, 0);

  const filteredSpoilage = useMemo(() => {
    return branchSpoilage
      .filter((record) => {
        const matchesReason怎 = reasonFilter === 'all' || record.reason === reasonFilter;
        const matchesQuery =
          record.flavor.toLowerCase().includes(searchQuery.toLowerCase()) ||
          record.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (record.batchCode && record.batchCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (record.notes && record.notes.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesReason怎 && matchesQuery;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        if (sortBy === 'date_asc') return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        if (sortBy === 'qty_desc') return b.quantity - a.quantity;
        if (sortBy === 'cost_desc') return b.costImpact - a.costImpact;
        return 0;
      });
  }, [branchSpoilage, reasonFilter, searchQuery, sortBy]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBranch || !selectedProduct) return;

    if (quantity <= 0) {
      showFeedback('Quantity must be greater than 0.', 'error');
      return;
    }

    if (quantity > currentItemStock) {
      showFeedback(
        `Cannot record ${quantity} spoiled packs. Current on-hand stock is only ${currentItemStock} units.`,
        'error'
      );
      return;
    }

    try {
      const record = recordSpoilage({
        branchId: currentBranch.id,
        branchName: currentBranch.name,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        flavor: selectedProduct.flavor,
        quantity,
        reason: selectedReason,
        batchCode: batchCode.trim() || undefined,
        reportedBy: currentUser?.name || 'Branch Manager',
        costImpact: estimatedCostImpact,
        notes: notes.trim() || undefined,
      });

      showFeedback(
        `Successfully recorded ${record.quantity} packs of ${record.flavor} as spoilage. Stock deducted and excluded from predictive demand forecasting.`,
        'success'
      );
      setQuantity(1);
      setBatchCode('');
      setNotes('');
    } catch (err: any) {
      showFeedback(err.message || 'Failed to record spoilage', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-600 dark:text-red-400">
            Wastage & Spoilage Isolation
          </span>
          <span className="text-xs font-mono text-neutral-400">
            Branch: {currentBranch?.name} ({currentBranch?.code})
          </span>
        </div>
        <h1 className="text-2xl font-black tracking-tight mt-1">Spoilage & Wastage Log</h1>
        <p className="text-xs text-neutral-500 font-medium">
          Deduct damaged or expired marshmallow packs from on-hand inventory while automatically isolating them from demand forecast models.
        </p>
      </div>

      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center space-x-2 animate-in fade-in duration-200 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : feedbackMsg.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
              : 'bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Spoilage Analytics & Exclusion Notice Banner */}
      <div
        className={`p-5 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isDark
            ? 'bg-purple-950/20 border-purple-500/30 text-purple-200'
            : 'bg-purple-50 border-purple-200 text-purple-900'
        }`}
      >
        <div className="flex items-start sm:items-center space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Single Exponential Smoothing Isolation Rule
              </span>
            </div>
            <p className="text-xs sm:text-sm font-bold mt-0.5">
              Logged wastage is deducted from on-hand shelf inventory, but is <strong>100% excluded</strong> from the predictive demand analytics pipeline so that temporary spoilage never creates an artificial bullwhip over-order.
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className={`p-4 rounded-2xl border ${
            isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
          }`}
        >
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
            Total Spoiled Units
          </span>
          <p className="text-2xl font-black text-red-500 mt-1">
            {totalSpoiledUnits} <span className="text-xs font-normal text-neutral-400">packs</span>
          </p>
          <p className="text-[10px] text-neutral-500 mt-0.5">Cumulative recorded waste</p>
        </div>

        <div
          className={`p-4 rounded-2xl border ${
            isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
          }`}
        >
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
            Cumulative Cost Impact
          </span>
          <p className="text-2xl font-black text-red-500 mt-1">
            ₱{totalFinancialLoss.toLocaleString()}
          </p>
          <p className="text-[10px] text-neutral-500 mt-0.5">Based on commissary wholesale cost (₱100/pk)</p>
        </div>

        <div
          className={`p-4 rounded-2xl border ${
            isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
          }`}
        >
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
            Total Waste Incident Logs
          </span>
          <p className="text-2xl font-black text-neutral-900 dark:text-white mt-1">
            {branchSpoilage.length}{' '}
            <span className="text-xs font-normal text-neutral-400">entries</span>
          </p>
          <p className="text-[10px] text-neutral-500 mt-0.5">Verified branch audit logs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Wastage Logging Form */}
        <div
          className={`lg:col-span-1 p-6 rounded-3xl border h-fit ${
            isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
          }`}
        >
          <div className="flex items-center space-x-2 pb-4 border-b border-neutral-100 dark:border-neutral-800">
            <Trash2 className="w-5 h-5 text-red-500" />
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                Log New Wastage
              </h2>
              <p className="text-xs text-neutral-500">Record spoiled packs to write-off</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Marshmallow Flavor / SKU
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-[#80C7F2] ${
                  isDark
                    ? 'bg-[#101010] border-neutral-700 text-white'
                    : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                }`}
              >
                {products.map((p) => {
                  const inv = branchInventory.find((i) => i.productId === p.id);
                  const stk = inv ? inv.stock : 0;
                  return (
                    <option key={p.id} value={p.id}>
                      {p.flavor} ({p.name}) — Stock: {stk} packs
                    </option>
                  );
                })}
              </select>
              <div className="flex justify-between items-center text-[10px] text-neutral-500 mt-1">
                <span>Available On-Hand: <strong>{currentItemStock} units</strong></span>
                <span>Cost / Pack: ₱{unitCost}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Quantity Damaged / Spoiled (Packs)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="1"
                  max={Math.max(1, currentItemStock)}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className={`flex-1 px-3.5 py-2.5 rounded-xl text-sm font-black border focus:outline-none focus:ring-2 focus:ring-[#80C7F2] ${
                    isDark
                      ? 'bg-[#101010] border-neutral-700 text-white'
                      : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, currentItemStock))}
                  className="px-2.5 py-2 rounded-xl text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                >
                  All ({currentItemStock})
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Spoilage Reason Code
              </label>
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value as SpoilageReason)}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-[#80C7F2] ${
                  isDark
                    ? 'bg-[#101010] border-neutral-700 text-white'
                    : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                }`}
              >
                {SPOILAGE_REASONS.map((r) => (
                  <option key={r.label} value={r.label}>
                    {r.icon} {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Batch Code (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. MB-20260814-UBE"
                value={batchCode}
                onChange={(e) => setBatchCode(e.target.value)}
                className={`w-full px-3.5 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#80C7F2] ${
                  isDark
                    ? 'bg-[#101010] border-neutral-700 text-white placeholder-neutral-500'
                    : 'bg-neutral-50 border-neutral-300 text-neutral-900 placeholder-neutral-400'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Damage Remarks / Reason Details
              </label>
              <textarea
                rows={2}
                placeholder="Observed defect, humidity note, or accidental dropping..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={`w-full px-3.5 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#80C7F2] ${
                  isDark
                    ? 'bg-[#101010] border-neutral-700 text-white placeholder-neutral-500'
                    : 'bg-neutral-50 border-neutral-300 text-neutral-900 placeholder-neutral-400'
                }`}
              />
            </div>

            {/* Cost Preview Box */}
            <div className="p-3.5 rounded-2xl bg-red-500/5 border border-red-500/20 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500">Inventory Loss:</span>
                <span className="font-black text-red-500">-{quantity} packs</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-neutral-500">Financial Impact:</span>
                <span className="font-bold text-neutral-900 dark:text-white">₱{estimatedCostImpact.toLocaleString()}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={currentItemStock === 0}
              className={`w-full py-3 rounded-2xl font-bold text-xs sm:text-sm text-white shadow-md transition-all flex items-center justify-center space-x-2 ${
                currentItemStock > 0
                  ? 'bg-red-600 hover:bg-red-700 cursor-pointer'
                  : 'bg-neutral-300 dark:bg-neutral-800 cursor-not-allowed opacity-50'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>Record & Deduct Wastage</span>
            </button>
          </form>
        </div>

        {/* Wastage Records Table */}
        <div
          className={`lg:col-span-2 p-6 rounded-3xl border ${
            isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-800">
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                Historical Spoilage & Write-Offs
              </h2>
              <p className="text-xs text-neutral-500">
                Audited wastage transactions for {currentBranch?.name}
              </p>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
            <div className="sm:col-span-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                <Search className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search flavor, batch, note..."
                className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border focus:outline-none ${
                  isDark
                    ? 'bg-[#101010] border-neutral-800 text-white'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-900'
                }`}
              />
            </div>

            <div>
              <select
                value={reasonFilter}
                onChange={(e) => setReasonFilter(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold border focus:outline-none ${
                  isDark
                    ? 'bg-[#101010] border-neutral-800 text-white'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-900'
                }`}
              >
                <option value="all">All Spoilage Reasons</option>
                {SPOILAGE_REASONS.map((r) => (
                  <option key={r.label} value={r.label}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold border focus:outline-none ${
                  isDark
                    ? 'bg-[#101010] border-neutral-800 text-white'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-900'
                }`}
              >
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="qty_desc">Highest Quantity</option>
                <option value="cost_desc">Highest Cost Impact</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {filteredSpoilage.length === 0 ? (
              <div className="py-12 text-center text-neutral-400 text-xs">
                <Trash2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="font-bold">No wastage records found.</p>
                <p className="text-[11px] mt-0.5">Either no items have spoiled or your search filter yielded no results.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Flavor SKU</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3 text-center">Quantity</th>
                    <th className="py-2.5 px-3 text-right">Cost Loss</th>
                    <th className="py-2.5 px-3">Reported By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                  {filteredSpoilage.map((rec) => (
                    <tr key={rec.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/40">
                      <td className="py-3 px-3 whitespace-nowrap text-neutral-500 font-mono text-[11px]">
                        {new Date(rec.timestamp).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-extrabold text-neutral-900 dark:text-white">
                          {rec.flavor}
                        </span>
                        {rec.batchCode && (
                          <span className="block text-[10px] font-mono text-neutral-400">
                            Batch: {rec.batchCode}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                          {rec.reason}
                        </span>
                        {rec.notes && (
                          <p className="text-[10px] text-neutral-500 mt-0.5 max-w-xs truncate">
                            "{rec.notes}"
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-black text-red-500">
                        -{rec.quantity}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-neutral-900 dark:text-white">
                        ₱{rec.costImpact.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-neutral-500">
                        {rec.reportedBy}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
