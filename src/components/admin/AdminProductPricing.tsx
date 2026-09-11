import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import {
  Tag,
  Save,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Plus,
  Layers,
  DollarSign,
  ShieldCheck,
  Package,
} from 'lucide-react';
import { Product } from '../../types';

export const AdminProductPricing: React.FC = () => {
  const { products, updateProductPricing, currentUser, themeMode } = useData();
  const isDark = themeMode === 'dark';

  const [prices, setPrices] = useState<Record<string, { srp: number; wholesale: number }>>(() => {
    const initial: Record<string, { srp: number; wholesale: number }> = {};
    products.forEach((p) => {
      initial[p.id] = {
        srp: p.price,
        wholesale: p.wholesalePrice || 100,
      };
    });
    return initial;
  });

  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handlePriceChange = (productId: string, field: 'srp' | 'wholesale', val: number) => {
    setPrices((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: Math.max(0, val),
      },
    }));
  };

  const handleSavePrice = (productId: string) => {
    const p = prices[productId];
    if (!p) return;

    const res = updateProductPricing(productId, p.srp, p.wholesale);
    if (res.success) {
      setFeedback({ text: `Updated pricing for product ${productId}.`, type: 'success' });
      setTimeout(() => setFeedback(null), 3000);
    } else {
      setFeedback({ text: res.error || 'Failed to update pricing.', type: 'error' });
    }
  };

  return (
    <div id="admin-product-pricing-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Tag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
                Global SKU & Pricing Management
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                HQ Super Admin Authority • Centrally manage wholesale commissary rates and retail SRP across all 19+ branches
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>SUPER_ADMIN Authorized</span>
          </span>
        </div>
      </div>

      {/* RBAC Notice */}
      <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-neutral-800 dark:text-neutral-200">
        <div className="flex items-start space-x-3 text-xs sm:text-sm">
          <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-neutral-900 dark:text-white">Strict RBAC Pricing Security:</span>{' '}
            Branch Managers and Branch Staff are restricted from modifying unit selling prices or commissary wholesale costs. All price modifications apply network-wide to ensure BIR receipt accuracy and franchise contract consistency.
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

      {/* Pricing Table */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#181818] shadow-xs">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 font-bold text-xs sm:text-sm text-neutral-900 dark:text-white flex items-center justify-between">
          <span>Enterprise SKU Price Matrix</span>
          <span className="text-xs font-mono text-neutral-400">{products.length} SKUs Listed</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850/50 text-[11px] font-bold uppercase text-neutral-500">
                <th className="py-3 px-4">Flavor SKU & Product</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-4 text-center">Commissary Wholesale (₱)</th>
                <th className="py-3 px-4 text-center">Standard Store SRP (₱)</th>
                <th className="py-3 px-3 text-center">Franchise Margin</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {products.map((p) => {
                const currentPrice = prices[p.id] || { srp: p.price, wholesale: p.wholesalePrice || 100 };
                const margin = currentPrice.srp - currentPrice.wholesale;
                const marginPercent = currentPrice.srp > 0 ? Math.round((margin / currentPrice.srp) * 100) : 0;

                return (
                  <tr key={p.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                    <td className="py-3.5 px-4 font-semibold text-neutral-900 dark:text-white">
                      <div className="font-bold">{p.flavor || p.name}</div>
                      <div className="text-[11px] text-neutral-400 font-normal font-mono">{p.id} • 100g</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center space-x-1">
                        <span className="text-neutral-400 font-bold">₱</span>
                        <input
                          type="number"
                          min="1"
                          value={currentPrice.wholesale}
                          onChange={(e) => handlePriceChange(p.id, 'wholesale', parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1 text-center font-mono font-bold rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121212] text-neutral-900 dark:text-white focus:ring-1 focus:ring-[#80C7F2]"
                        />
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center space-x-1">
                        <span className="text-neutral-400 font-bold">₱</span>
                        <input
                          type="number"
                          min="1"
                          value={currentPrice.srp}
                          onChange={(e) => handlePriceChange(p.id, 'srp', parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1 text-center font-mono font-bold rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121212] text-neutral-900 dark:text-white focus:ring-1 focus:ring-[#80C7F2]"
                        />
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ₱{margin} ({marginPercent}%)
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleSavePrice(p.id)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 transition-all cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
