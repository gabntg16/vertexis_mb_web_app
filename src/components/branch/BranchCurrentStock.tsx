import React from 'react';
import { AlertTriangle, Boxes, Package } from 'lucide-react';
import { useData } from '../../context/DataContext';

export const BranchCurrentStock: React.FC = () => {
  const { currentBranch, getInventoryForBranch, themeMode } = useData();

  if (!currentBranch) return (
    <div role="status" className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="font-bold">No branch selected</h2>
      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">Your branch stock will appear once your branch assignment is available.</p>
    </div>
  );

  const inventory = getInventoryForBranch(currentBranch.id);
  const totalUnits = inventory.reduce((sum, item) => sum + item.stock, 0);
  const lowStockItems = inventory.filter((item) => item.stock > 0 && item.stock <= 5);
  const outOfStockItems = inventory.filter((item) => item.stock === 0);
  const isDark = themeMode === 'dark';

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#80C7F2]/20 text-[#00609C] dark:text-[#80C7F2]">
            Live Branch Stock
          </span>
          <span className="text-xs font-mono text-neutral-400">
            {currentBranch.name} ({currentBranch.code})
          </span>
        </div>
        <h1 className="text-2xl font-black tracking-tight mt-1">Current Branch Stock</h1>
        <p className="text-xs text-neutral-500 font-medium">
          Current on-hand units recorded for every product at this branch.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Total Units</span>
            <Boxes className="w-4 h-4 text-[#F37021]" />
          </div>
          <p className="text-3xl font-black mt-3">{totalUnits}</p>
          <p className="text-xs text-neutral-500 mt-1">Across {inventory.length} products</p>
        </div>
        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Low Stock</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-amber-600 mt-3">{lowStockItems.length}</p>
          <p className="text-xs text-neutral-500 mt-1">Products with 1 to 5 units</p>
        </div>
        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Out of Stock</span>
            <Package className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-3xl font-black text-red-600 mt-3">{outOfStockItems.length}</p>
          <p className="text-xs text-neutral-500 mt-1">Products with no units on hand</p>
        </div>
      </div>

      <div className={`p-6 rounded-3xl border ${isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold">Product Stock Levels</h2>
            <p className="text-xs text-neutral-500">Read-only view of the branch inventory ledger.</p>
          </div>
          <Boxes className="w-5 h-5 text-[#F37021]" />
        </div>

        <div className="space-y-3">
          {inventory.length === 0 && (
            <p role="status" className="rounded-xl bg-neutral-50 p-6 text-center text-sm text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
              No inventory records yet. Stock will appear here after inventory is recorded for this branch.
            </p>
          )}
          {inventory.map((item) => {
            const isOut = item.stock === 0;
            const isLow = item.stock > 0 && item.stock <= 5;

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                  isOut
                    ? 'bg-red-500/5 border-red-500/20'
                    : isLow
                    ? 'bg-amber-500/5 border-amber-500/20'
                    : isDark
                    ? 'bg-neutral-900/60 border-neutral-800'
                    : 'bg-neutral-50 border-neutral-200'
                }`}
              >
                <div className="min-w-0">
                  <p className="font-bold text-sm break-words">{item.productName}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{isOut ? 'Out of stock' : isLow ? 'Low stock' : 'In stock'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-lg font-black ${isOut ? 'text-red-600 dark:text-red-400' : isLow ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                    {item.stock}
                  </p>
                  <p className="text-[10px] text-neutral-500">units</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
