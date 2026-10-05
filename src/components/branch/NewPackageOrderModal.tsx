import { PACKAGE_PRICES } from '../../../functions/src/transactionModel';
import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { Minus, Plus, X, AlertCircle } from 'lucide-react';
import { Order } from '../../types';
import { PackageCapacityWarningModal, PackageExceedWarningDetails } from './PackageCapacityWarningModal';
import { usePackageUpgradeOptimization } from '../../hooks/usePackageUpgradeOptimization';
import { PackageUpgradeCaution } from '../common/PackageUpgradeCaution';

export interface PackageTier {
  id: 'silver' | 'gold' | 'platinum';
  name: string;
  price: number;
  baseCapacity: number;
  maxCap: number;
  rangeLabel: string;
}

export const PACKAGE_TIERS: PackageTier[] = [
  { id: 'silver', ...PACKAGE_PRICES.silver, maxCap: 35, rangeLabel: '35 packs' },
  { id: 'gold', ...PACKAGE_PRICES.gold, maxCap: 55, rangeLabel: '55 packs' },
  { id: 'platinum', ...PACKAGE_PRICES.platinum, maxCap: 70, rangeLabel: '70 packs' },
];

/**
 * Calculates package price with pro-rata package rates for any excess packs
 * e.g., Gold (55 packs @ ₱5,775 -> ₱105/pack). If total is 56, 5,775 + 105 = ₱5,880.00.
 */
export function calculatePackagePrice(tier: PackageTier, totalPacks: number): {
  totalPrice: number;
  isExceeded: boolean;
  excessPacks: number;
  ratePerPack: number;
} {
  const ratePerPack = tier.price / tier.baseCapacity;
  if (totalPacks === 0) {
    return { totalPrice: 0, isExceeded: false, excessPacks: 0, ratePerPack };
  }

  if (totalPacks <= tier.baseCapacity) {
    return {
      totalPrice: tier.price,
      isExceeded: false,
      excessPacks: 0,
      ratePerPack,
    };
  }

  const excessPacks = totalPacks - tier.baseCapacity;
  const totalPrice = Math.round((tier.price + excessPacks * ratePerPack) * 100) / 100;

  return {
    totalPrice,
    isExceeded: true,
    excessPacks,
    ratePerPack,
  };
}

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

  const [selectedTierId, setSelectedTierId] = useState<'silver' | 'gold' | 'platinum'>(initialTierId);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [savingOrder, setSavingOrder] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [exceedWarning, setExceedWarning] = useState<PackageExceedWarningDetails | null>(null);
  const [isUpgradeCautionDismissed, setIsUpgradeCautionDismissed] = useState(false);

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setQuantities({});
      setSelectedTierId(initialTierId);
      setExceedWarning(null);
      setIsUpgradeCautionDismissed(false);
    }
  }, [isOpen, initialTierId]);

  const totalPacks = Object.values(quantities).reduce((sum, q) => sum + (q || 0), 0);
  const currentTier = PACKAGE_TIERS.find((t) => t.id === selectedTierId) || PACKAGE_TIERS[1];
  const isBelowBase = totalPacks < currentTier.baseCapacity;
  const isCapReached = totalPacks >= currentTier.baseCapacity;
  const { totalPrice, isExceeded, excessPacks } = calculatePackagePrice(currentTier, totalPacks);

  // Intelligent upgrade optimization calculation
  const upgradeAnalysis = usePackageUpgradeOptimization(selectedTierId, quantities);

  const handleUpgradeToNextTier = (nextTierId: 'silver' | 'gold' | 'platinum') => {
    const nextTier = PACKAGE_TIERS.find((t) => t.id === nextTierId);
    if (!nextTier) return;

    setSelectedTierId(nextTierId);
    setIsUpgradeCautionDismissed(false);

    // If packs exceed next tier's base capacity, scale or reset excess items to fit cleanly
    if (totalPacks > nextTier.baseCapacity) {
      let remainingToKeep = nextTier.baseCapacity;
      const adjusted: Record<string, number> = {};
      for (const [pId, qty] of Object.entries(quantities)) {
        if (remainingToKeep <= 0) {
          adjusted[pId] = 0;
        } else if (qty <= remainingToKeep) {
          adjusted[pId] = qty;
          remainingToKeep -= qty;
        } else {
          adjusted[pId] = remainingToKeep;
          remainingToKeep = 0;
        }
      }
      setQuantities(adjusted);
    }
  };

  if (!isOpen) return null;

  const handleQuantityChange = (productId: string, delta: number) => {
    const product = products.find((p) => p.id === productId);
    if (delta > 0 && totalPacks + delta > currentTier.baseCapacity) {
      setExceedWarning({
        isOpen: true,
        tier: currentTier,
        attemptedTotal: totalPacks + delta,
        maxCap: currentTier.baseCapacity,
        productFlavor: product?.flavor,
        reason: 'cap_reached',
      });
      return;
    }

    setQuantities((prev) => {
      const currentQty = prev[productId] || 0;
      if (delta > 0) {
        if (totalPacks >= currentTier.baseCapacity) return prev;
        const safeDelta = Math.min(delta, currentTier.baseCapacity - totalPacks);
        if (safeDelta <= 0) return prev;
        return { ...prev, [productId]: currentQty + safeDelta };
      }
      const nextQty = Math.max(0, currentQty + delta);
      return { ...prev, [productId]: nextQty };
    });
  };

  const handleDirectQtyInput = (productId: string, rawVal: string) => {
    const otherPacksTotal = Object.entries(quantities)
      .filter(([id]) => id !== productId)
      .reduce((sum, [, q]) => sum + (q || 0), 0);

    const maxAvailableForThisItem = Math.max(0, currentTier.baseCapacity - otherPacksTotal);
    const product = products.find((p) => p.id === productId);

    if (rawVal === '') {
      setQuantities((prev) => ({ ...prev, [productId]: 0 }));
      return;
    }

    const parsed = parseInt(rawVal, 10);
    if (isNaN(parsed) || parsed < 0) {
      setQuantities((prev) => ({ ...prev, [productId]: 0 }));
      return;
    }

    if (parsed > maxAvailableForThisItem) {
      setExceedWarning({
        isOpen: true,
        tier: currentTier,
        attemptedTotal: otherPacksTotal + parsed,
        maxCap: currentTier.baseCapacity,
        productFlavor: product?.flavor,
        reason: 'input_exceeded',
      });
    }

    const clamped = Math.max(0, Math.min(parsed, maxAvailableForThisItem));
    setQuantities((prev) => ({ ...prev, [productId]: clamped }));
  };

  const handleSelectTier = (tierId: 'silver' | 'gold' | 'platinum') => {
    const targetTier = PACKAGE_TIERS.find((t) => t.id === tierId) || PACKAGE_TIERS[1];

    if (totalPacks > targetTier.baseCapacity) {
      setExceedWarning({
        isOpen: true,
        tier: currentTier,
        targetTier,
        attemptedTotal: totalPacks,
        maxCap: targetTier.baseCapacity,
        reason: 'tier_switch_exceeded',
      });

      let remainingAllowed = targetTier.baseCapacity;
      const adjusted: Record<string, number> = {};
      for (const [pId, qty] of Object.entries(quantities)) {
        if (remainingAllowed <= 0) {
          adjusted[pId] = 0;
        } else if (qty <= remainingAllowed) {
          adjusted[pId] = qty;
          remainingAllowed -= qty;
        } else {
          adjusted[pId] = remainingAllowed;
          remainingAllowed = 0;
        }
      }
      setQuantities(adjusted);
    }
    setSelectedTierId(tierId);
  };

  const handleAutoAdjustToMaxCap = (targetCap?: number) => {
    const cap = targetCap || currentTier.baseCapacity;
    let remainingAllowed = cap;
    const adjusted: Record<string, number> = {};
    for (const [pId, qty] of Object.entries(quantities)) {
      if (remainingAllowed <= 0) {
        adjusted[pId] = 0;
      } else if (qty <= remainingAllowed) {
        adjusted[pId] = qty;
        remainingAllowed -= qty;
      } else {
        adjusted[pId] = remainingAllowed;
        remainingAllowed = 0;
      }
    }
    setQuantities(adjusted);
  };

  const handlePlaceOrder = async () => {
    if (savingOrder) return;
    setSaveError('');
    if (totalPacks < currentTier.baseCapacity) return;

    if (totalPacks > currentTier.baseCapacity) {
      setExceedWarning({
        isOpen: true,
        tier: currentTier,
        attemptedTotal: totalPacks,
        maxCap: currentTier.baseCapacity,
        reason: 'cap_reached',
      });
      return;
    }

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
      <div className="w-full max-w-[540px] max-h-[92vh] flex flex-col rounded-[28px] shadow-2xl overflow-hidden my-auto bg-[#59B7E8] text-slate-900 border border-[#48a2d1] animate-in fade-in zoom-in-95 duration-200">
        {/* Top Grab Handle */}
        <div className="pt-3 pb-1 flex justify-center shrink-0">
          <div className="w-12 h-1.5 bg-white/40 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="px-6 pt-1 pb-3 flex items-start justify-between shrink-0">
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
        <div className="px-6 pb-4 shrink-0">
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

          {/* Intelligent Package Upgrade Caution Banner */}
          <div className="mt-3">
            <PackageUpgradeCaution
              analysis={upgradeAnalysis}
              isDismissed={isUpgradeCautionDismissed}
              onUpgrade={handleUpgradeToNextTier}
              onDismiss={() => setIsUpgradeCautionDismissed(true)}
              themeMode="light"
            />
          </div>
        </div>

        {/* Scrollable Flavors Distribution List */}
        <div className="px-6 overflow-y-auto space-y-2.5 flex-1 min-h-0 pb-3">
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
                    max={currentTier.baseCapacity}
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
                    title={isCapReached ? `Maximum limit reached (${currentTier.baseCapacity} packs). Click to upgrade.` : 'Increase quantity'}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Bar Container */}
        <div className="bg-[#48a5d3]/60 px-6 pt-3 pb-4 border-t border-[#419ac6] shrink-0 space-y-3">
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
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs font-bold ${isBelowBase ? 'text-amber-950' : isCapReached ? 'text-emerald-950 font-extrabold' : 'text-slate-800'}`}>
                Total Packs: {totalPacks} / {currentTier.baseCapacity} packs (Strict Limit: {currentTier.baseCapacity})
              </p>
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

      {/* Package Capacity & Record Exceed Warning Dialog */}
      <PackageCapacityWarningModal
        warning={exceedWarning}
        themeMode="light"
        onClose={() => setExceedWarning(null)}
        onUpgradeTier={(newTierId) => handleSelectTier(newTierId)}
        onAutoAdjust={() => handleAutoAdjustToMaxCap(exceedWarning?.maxCap)}
      />
    </div>
  );
};
