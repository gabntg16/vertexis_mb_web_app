import { usePackageSelection } from '../../hooks/usePackageSelection';
import { PackageDecisionModal } from '../common/PackageDecisionModal';
import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { Minus, Plus, X, AlertCircle } from 'lucide-react';
import { Order } from '../../types';

import { PACKAGE_TIERS, calculatePackagePrice } from '../../utils/packagePricing';
export { PACKAGE_TIERS, calculatePackagePrice } from '../../utils/packagePricing';
export type { PackageTier } from '../../utils/packagePricing';

interface NewPackageOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated?: (order: Order) => void;
  initialTierId?: 'silver' | 'gold' | 'platinum';
}

export const NewPackageOrderModal: React.FC<NewPackageOrderModalProps> = ({
  isOpen,
  onClose,
  onOrderCreated,
  initialTierId = 'gold',
}) => {
  const { products, createOrder } = useData();

  const selection = usePackageSelection(initialTierId);
  const { tierId: selectedTierId, quantities } = selection.state;
  const [savingOrder, setSavingOrder] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    selection.dispatch({ type: 'reset', tierId: initialTierId });
  }, [isOpen, initialTierId, selection.dispatch]);

  const totalPacks = Object.values(quantities).reduce((sum, q) => sum + (q || 0), 0);
  const currentTier = PACKAGE_TIERS.find((t) => t.id === selectedTierId) || PACKAGE_TIERS[1];
  const isBelowBase = totalPacks < currentTier.baseCapacity;
  const isCapReached = totalPacks >= currentTier.maxCap;
  const { totalPrice, isExceeded, excessPacks } = calculatePackagePrice(currentTier, totalPacks);

  const handleQuantityChange = selection.changeQuantity;
  const handleDirectQtyInput = selection.inputQuantity;
  const handleSelectTier = selection.selectTier;
  if (!isOpen) return null;

  const handlePlaceOrder = async () => {
    if (savingOrder) return;
    setSaveError('');
    if (totalPacks < currentTier.baseCapacity) return;

    if (totalPacks > currentTier.maxCap || selection.state.pending) return;

    const orderItems = products
      .filter((p) => (quantities[p.id] || 0) > 0)
      .map((p) => ({
        productId: p.id,
        productName: `${p.flavor} (${p.name})`,
        quantity: quantities[p.id] || 0,
        unitPrice: Math.round((totalPrice / (totalPacks || 1)) * 100) / 100,
      }));

    const packageName = isExceeded
      ? `${currentTier.name} Package (+${excessPacks} excess packs)`
      : `${currentTier.name} Package`;

    setSavingOrder(true);
    let newOrder: Order | null;
    try { newOrder = await createOrder(
      orderItems,
      totalPrice,
      packageName,
      currentTier.id
    ); } catch (error) { setSaveError(error instanceof Error ? error.message : 'Order could not be saved.'); return; } finally { setSavingOrder(false); }

    if (newOrder) {
      if (onOrderCreated) {
        onOrderCreated(newOrder);
      }
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-[540px] max-h-[92vh] flex flex-col rounded-[28px] shadow-2xl overflow-y-auto my-auto bg-[#59B7E8] text-slate-900 border border-[#48a2d1] animate-in fade-in zoom-in-95 duration-200">
        {/* Top Grab Handle */}
        <div className="pt-3 pb-1 flex justify-center shrink-0">
          <div className="w-12 h-1.5 bg-white/40 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="px-4 sm:px-6 pt-1 pb-3 flex items-start justify-between shrink-0">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              New Package Order
            </h2>
            <p className="text-xs text-slate-700/80 mt-0.5 font-medium">
              Choose a package tier and distribute fresh gourmet marshmallow flavors
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-800 hover:bg-black/10 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Package Selector Cards (3 Tabs) */}
        <div className="px-4 sm:px-6 pb-4 shrink-0">
          <div className="grid grid-cols-3 gap-2.5">
            {PACKAGE_TIERS.map((tier) => {
              const isSelected = selectedTierId === tier.id;
              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => handleSelectTier(tier.id)}
                  className={`py-3 px-2 rounded-2xl text-center transition-all flex flex-col items-center justify-center ${
                    isSelected
                      ? 'bg-[#F37021] text-white shadow-md'
                      : 'bg-white text-slate-800 hover:bg-white/90 shadow-xs'
                  }`}
                >
                  <span className={`text-sm font-bold leading-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                    {tier.name}
                  </span>
                  <span className={`text-[11px] mt-0.5 ${isSelected ? 'text-white/90 font-medium' : 'text-slate-500 font-medium'}`}>
                    ₱{tier.price.toLocaleString()}
                  </span>
                  <span className={`text-[9px] font-bold mt-0.5 ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                    {tier.rangeLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Flavors Distribution List */}
        <div className="px-4 sm:px-4 sm:px-6 space-y-2.5 shrink-0 pb-3">
          {products.map((prod) => {
            const currentQty = quantities[prod.id] || 0;
            const isAddDisabled = isCapReached;

            return (
              <div
                key={prod.id}
                className="p-3.5 rounded-2xl bg-white text-slate-900 shadow-xs flex items-center justify-between"
              >
                <div className="pr-2">
                  <h4 className="text-sm font-bold text-slate-900 leading-tight">
                    {prod.flavor}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                    Gourmet Marshmallow Pack
                  </p>
                </div>

                {/* Stepper Controls with Direct Input */}
                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(prod.id, -1)}
                    disabled={currentQty === 0}
                    className="w-7 h-7 rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 flex items-center justify-center transition-colors font-bold"
                    title="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <input
                    type="number"
                    min="0"
                    max={Math.max(0, currentTier.maxCap - totalPacks + currentQty)}
                    value={currentQty === 0 ? '' : currentQty}
                    onChange={(e) => handleDirectQtyInput(prod.id, e.target.value)}
                    placeholder="0"
                    className="w-12 h-7 text-center font-bold text-sm text-slate-900 bg-slate-50 rounded-md border border-slate-200 focus:border-sky-500 focus:bg-white focus:outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />

                  <button
                    type="button"
                    onClick={() => handleQuantityChange(prod.id, 1)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors font-bold ${
                      isCapReached
                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-dashed border-amber-400 cursor-pointer'
                        : 'text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer'
                    }`}
                    title={isCapReached ? `Maximum limit reached (${currentTier.maxCap} packs). Click to upgrade.` : 'Increase quantity'}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Bar Container */}
        <div className="bg-[#48a5d3]/60 px-4 sm:px-6 pt-3 pb-4 border-t border-[#419ac6] shrink-0 space-y-3">
          {/* Below Minimum Base Alert Banner */}
          {isBelowBase && (
            <div className="p-2.5 rounded-xl bg-amber-500/90 text-white text-xs font-bold text-center leading-snug border border-amber-400 flex items-center justify-center space-x-1.5 shadow-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                Minimum requirement: {currentTier.baseCapacity} packs required for {currentTier.name} Package ({totalPacks}/{currentTier.baseCapacity} selected, need {currentTier.baseCapacity - totalPacks} more).
              </span>
            </div>
          )}

          {/* Totals and Place Order button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className={`text-xs font-bold ${isBelowBase ? 'text-amber-950' : isCapReached ? 'text-emerald-950 font-extrabold' : 'text-slate-800'}`}>
                Total Packs: {totalPacks} (Range: {currentTier.rangeLabel})
              </p>
              {excessPacks > 0 && <p className="text-xs">Base ₱{currentTier.price.toLocaleString()} + {excessPacks} extra × ₱{currentTier.extraPackRate}</p>}
              <p className="text-2xl font-black text-[#F37021] tracking-tight">
                ₱{totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>

            {saveError && <p role="alert" className="p-3 text-sm text-red-700 dark:text-red-300">{saveError}</p>}
              <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={isBelowBase || savingOrder}
              className={`px-7 py-3.5 rounded-2xl text-sm font-bold text-white shadow-md transition-all text-center leading-tight ${
                !isBelowBase
                  ? 'bg-[#F37021] hover:bg-[#e06214] active:scale-95 cursor-pointer'
                  : 'bg-slate-400/80 cursor-not-allowed opacity-75'
              }`}
              title={isBelowBase ? `Need at least ${currentTier.baseCapacity} packs to place order` : 'Place Order'}
            >
              Place<br />Order
            </button>
          </div>
        </div>
      </div>

      {/* Package decision message box */}
      <PackageDecisionModal
        pending={selection.state.pending}
        onAction={type => selection.dispatch({ type })}
        themeMode="light"
      />
    </div>
  );
};
