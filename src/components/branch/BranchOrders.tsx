import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Order, ProductionStage, DigitalPaymentMethod, PaymentGatewayStatus } from '../../types';
import {
  ShoppingBag,
  Plus,
  Minus,
  CheckCircle2,
  Clock,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Flame,
  Snowflake,
  Box,
  Truck,
  Layers,
  Search,
  ArrowUpDown,
  Filter,
  Zap,
  CreditCard,
  Smartphone,
  Building2,
  QrCode,
  AlertCircle,
  ExternalLink,
  Calendar,
  PackageCheck,
} from 'lucide-react';
import { JTTrackingModal } from '../common/JTTrackingModal';
import { JT_EXPRESS_TRACKING_URL } from '../../services/jtExpress';
import { BranchPaymentModal } from './BranchPaymentModal';
import { PackageCapacityWarningModal, PackageExceedWarningDetails } from './PackageCapacityWarningModal';
import { usePackageUpgradeOptimization } from '../../hooks/usePackageUpgradeOptimization';
import { PackageUpgradeCaution } from '../common/PackageUpgradeCaution';

export interface PackageTier {
  id: 'silver' | 'gold' | 'platinum';
  name: string;
  price: number;
  baseCapacity: number;
  maxCap: number; // strict max cap
  rangeLabel: string;
}

export const PACKAGE_TIERS: PackageTier[] = [
  { id: 'silver', name: 'Silver', price: 3999, baseCapacity: 35, maxCap: 54, rangeLabel: '35 - 54 packs' },
  { id: 'gold', name: 'Gold', price: 5775, baseCapacity: 55, maxCap: 69, rangeLabel: '55 - 69 packs' },
  { id: 'platinum', name: 'Platinum', price: 7000, baseCapacity: 70, maxCap: 999, rangeLabel: '70+ packs' },
];

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
  const totalPrice = tier.price + excessPacks * ratePerPack;
  return { totalPrice, isExceeded: true, excessPacks, ratePerPack };
}

const STAGE_CONFIG: Record<ProductionStage, { label: string; icon: React.FC<{ className?: string }>; color: string; bg: string }> = {
  queued: {
    label: '1. Queued for Kitchen Batching',
    icon: Clock,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/30',
  },
  in_kettle: {
    label: '2. Kettle, Whip & Curing',
    icon: Flame,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/30',
  },
  curing: {
    label: '2. Kettle, Whip & Curing',
    icon: Snowflake,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-500/10 border-sky-500/30',
  },
  packaged: {
    label: '3. Packaging & QC Inspected',
    icon: Box,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/30',
  },
  ready_for_dispatch: {
    label: '4. Ready for Courier Dispatch',
    icon: Truck,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
  },
};

export const BranchOrders: React.FC = () => {
  const {
    products,
    currentBranch,
    createOrder,
    uploadPaymentProof,
    getOrdersForBranch,
    getInventoryForBranch,
    getDetailedDemandAnalyticsForBranch,
    deliveries,
    themeMode,
  } = useData();

  const [selectedTierId, setSelectedTierId] = useState<'silver' | 'gold' | 'platinum'>('gold');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selectedOrderForProof, setSelectedOrderForProof] = useState<Order | null>(null);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState<string | null>(null);
  const [historyTab, setHistoryTab] = useState<'all' | 'active' | 'completed'>('all');
  const [historySortBy, setHistorySortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'status'>('date_desc');
  const [historySearch, setHistorySearch] = useState('');
  const [activeTrackingNumber, setActiveTrackingNumber] = useState<string | null>(null);
  const [activeTrackingOrderId, setActiveTrackingOrderId] = useState<string | null>(null);

  if (!currentBranch) return null;

  const branchId = currentBranch.id;
  const branchOrders = getOrdersForBranch(branchId);
  const branchInventory = getInventoryForBranch(branchId);
  const isDark = themeMode === 'dark';

  const handleAutoFillFromDemand = () => {
    const analytics = getDetailedDemandAnalyticsForBranch(branchId);
    const suggestedQuantities: Record<string, number> = {};
    let totalSuggested = 0;

    analytics.forEach((a) => {
      if (a.suggestedOrderQuantity > 0) {
        suggestedQuantities[a.productId] = a.suggestedOrderQuantity;
        totalSuggested += a.suggestedOrderQuantity;
      }
    });

    // Automatically select the best tier based on total suggested packs
    let targetTier: 'silver' | 'gold' | 'platinum' = 'silver';
    if (totalSuggested >= 70) {
      targetTier = 'platinum';
    } else if (totalSuggested >= 55) {
      targetTier = 'gold';
    } else {
      targetTier = 'silver';
    }
    setSelectedTierId(targetTier);
    setQuantities(suggestedQuantities);
    setOrderSuccessMsg(
      `Auto-filled ${totalSuggested} packs based on Exponential Smoothing (α=0.3) demand velocity (Wastage isolated).`
    );
    setTimeout(() => setOrderSuccessMsg(null), 5000);
  };

  // Filtered & Sorted orders
  const filteredAndSortedOrders = branchOrders
    .filter((ord) => {
      // Tab filter
      if (historyTab === 'active') {
        if (ord.isArchived || ord.status === 'completed' || ord.status === 'rejected') return false;
      } else if (historyTab === 'completed') {
        if (!ord.isArchived && ord.status !== 'completed') return false;
      }

      // Search filter
      if (historySearch.trim()) {
        const query = historySearch.toLowerCase();
        const matchesId = ord.id.toLowerCase().includes(query);
        const matchesPkg = ord.packageName?.toLowerCase().includes(query);
        const matchesBatch = ord.batchCode?.toLowerCase().includes(query);
        const matchesItem = ord.items.some((i) => i.productName.toLowerCase().includes(query));
        if (!matchesId && !matchesPkg && !matchesBatch && !matchesItem) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (historySortBy === 'date_desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (historySortBy === 'date_asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (historySortBy === 'amount_desc') return b.totalAmount - a.totalAmount;
      if (historySortBy === 'amount_asc') return a.totalAmount - b.totalAmount;
      if (historySortBy === 'status') return a.status.localeCompare(b.status);
      return 0;
    });

  const activeOrdersCount = branchOrders.filter((o) => !o.isArchived && o.status !== 'completed' && o.status !== 'rejected').length;
  const completedOrdersCount = branchOrders.filter((o) => o.isArchived || o.status === 'completed').length;

  // Real-time Dispatched J&T Orders for Branch Manager Alert & Tracking
  const dispatchedOrders = useMemo(() => {
    return branchOrders.filter((ord) => {
      const relDelivery = deliveries.find((d) => d.orderId === ord.id && d.status !== 'canceled');
      const hasTracking = Boolean(ord.trackingNumber || ord.waybillNumber || relDelivery?.trackingNumber || relDelivery?.waybillNumber);
      return (ord.status === 'dispatched' || ord.isDispatched || relDelivery?.status === 'inTransit' || relDelivery?.status === 'pending') && hasTracking;
    });
  }, [branchOrders, deliveries]);

  const [exceedWarning, setExceedWarning] = useState<PackageExceedWarningDetails | null>(null);
  const [isUpgradeCautionDismissed, setIsUpgradeCautionDismissed] = useState(false);

  const currentTier = PACKAGE_TIERS.find((t) => t.id === selectedTierId) || PACKAGE_TIERS[1];
  const totalPacks = Object.values(quantities).reduce((sum, q) => sum + (q || 0), 0);
  const isBelowBase = totalPacks < currentTier.baseCapacity;
  const { totalPrice, isExceeded, excessPacks } = calculatePackagePrice(currentTier, totalPacks);

  // Dynamic Package Upgrade / Cost-Optimization analysis
  const upgradeAnalysis = usePackageUpgradeOptimization(selectedTierId, quantities);

  // Re-enable caution banner whenever the quantity changes significantly or tier changes
  const handleUpgradeToNextTier = (nextTierId: 'silver' | 'gold' | 'platinum') => {
    const nextTier = PACKAGE_TIERS.find((t) => t.id === nextTierId);
    if (!nextTier) return;

    setSelectedTierId(nextTierId);
    setIsUpgradeCautionDismissed(false);

    // If total packs exceed next tier's base capacity, scale or reset excess items to fit cleanly
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

    setOrderSuccessMsg(
      `⚡ Switched to ${nextTier.name} Package! Base capacity of ${nextTier.baseCapacity} packs applied at ₱${nextTier.price.toLocaleString()} bulk rate.`
    );
    setTimeout(() => setOrderSuccessMsg(null), 6000);
  };

  const isCapReached = totalPacks >= currentTier.maxCap;
  const remainingAllowedPacks = Math.max(0, currentTier.maxCap - totalPacks);

  const handleQtyChange = (productId: string, delta: number) => {
    const product = products.find((p) => p.id === productId);
    if (delta > 0 && totalPacks >= currentTier.maxCap) {
      setExceedWarning({
        isOpen: true,
        tier: currentTier,
        attemptedTotal: totalPacks + delta,
        maxCap: currentTier.maxCap,
        productFlavor: product?.flavor,
        reason: 'cap_reached',
      });
      return;
    }

    setQuantities((prev) => {
      const current = prev[productId] || 0;
      if (delta > 0) {
        // Enforce maxCap strictly
        if (totalPacks >= currentTier.maxCap) return prev;
        const safeDelta = Math.min(delta, remainingAllowedPacks);
        if (safeDelta <= 0) return prev;
        const next = Math.min(999, current + safeDelta);
        return { ...prev, [productId]: next };
      } else {
        const next = Math.max(0, current + delta);
        return { ...prev, [productId]: next };
      }
    });
  };

  const handleDirectQtyInput = (productId: string, rawVal: string) => {
    const currentVal = quantities[productId] || 0;
    const otherPacksTotal = totalPacks - currentVal;
    const maxAvailableForThisItem = Math.max(0, currentTier.maxCap - otherPacksTotal);
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
        maxCap: currentTier.maxCap,
        productFlavor: product?.flavor,
        reason: 'input_exceeded',
      });
    }

    // Clamp input between 0 and max available under the selected package's strict maxCap
    const clamped = Math.max(0, Math.min(parsed, maxAvailableForThisItem));
    setQuantities((prev) => ({ ...prev, [productId]: clamped }));
  };

  const handleSelectTier = (tierId: 'silver' | 'gold' | 'platinum') => {
    const targetTier = PACKAGE_TIERS.find((t) => t.id === tierId) || PACKAGE_TIERS[1];
    
    // If switching to a tier where current total exceeds new tier's maxCap, show warning dialog and trim
    if (totalPacks > targetTier.maxCap) {
      setExceedWarning({
        isOpen: true,
        tier: currentTier,
        targetTier,
        attemptedTotal: totalPacks,
        maxCap: targetTier.maxCap,
        reason: 'tier_switch_exceeded',
      });

      let remainingAllowed = targetTier.maxCap;
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
    const cap = targetCap || currentTier.maxCap;
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

  const handleInlinePlacePackageOrder = () => {
    if (totalPacks < currentTier.baseCapacity) return;

    if (totalPacks > currentTier.maxCap) {
      setExceedWarning({
        isOpen: true,
        tier: currentTier,
        attemptedTotal: totalPacks,
        maxCap: currentTier.maxCap,
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

    const newOrd = createOrder(orderItems, totalPrice, packageName, currentTier.id);
    if (newOrd) {
      setQuantities({});
      setOrderSuccessMsg(
        `Package Order #${newOrd.id} (${newOrd.packageName}) created successfully! Please attach proof of payment below.`
      );
      setSelectedOrderForProof(newOrd);
      setTimeout(() => setOrderSuccessMsg(null), 6000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight">Commissary Package Requisitions</h1>
        <p className="text-xs text-neutral-500 font-medium">
          Order fresh gourmet marshmallow packages handmade at Central Bicol Commissary.
        </p>
      </div>

      {/* Package Order Quick-Select Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PACKAGE_TIERS.map((tier) => {
          const isSelected = selectedTierId === tier.id;
          return (
            <div
              key={tier.id}
              onClick={() => handleSelectTier(tier.id)}
              className={`p-5 rounded-3xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                isSelected
                  ? 'bg-gradient-to-br from-[#59B7E8]/15 via-white to-orange-500/10 border-[#F37021] shadow-md dark:bg-neutral-900 dark:border-[#F37021]'
                  : isDark
                  ? 'bg-[#161616] border-neutral-800 hover:border-neutral-700'
                  : 'bg-white border-neutral-200 hover:border-neutral-300 shadow-xs'
              }`}
            >
              {isSelected && (
                <span className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full bg-[#F37021] text-white text-[10px] font-black uppercase tracking-wider">
                  Active Tier
                </span>
              )}
              <div>
                <div className="flex items-center space-x-2">
                  <Layers className={`w-4 h-4 ${isSelected ? 'text-[#F37021]' : 'text-neutral-400'}`} />
                  <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                    {tier.name} Package
                  </span>
                </div>
                <p className="text-2xl font-black text-[#F37021] mt-2">
                  ₱{tier.price.toLocaleString()}
                </p>
                <div className="text-xs text-neutral-500 mt-1 space-y-0.5">
                  <p className="font-medium">
                    Base: <strong className="text-neutral-800 dark:text-neutral-200">{tier.baseCapacity} packs</strong>
                  </p>
                  <p className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                    Tier Range: <span className="text-[#F37021]">{tier.rangeLabel}</span>
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400">
                  {isSelected ? '✓ Selected' : 'Click to select'}
                </span>
                <span className="text-[10px] text-neutral-400">
                  {tier.maxCap < 900 ? `Max ${tier.maxCap} packs` : 'Up to commissary stock'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Intelligent Package Upgrade / Cost-Optimization Caution Card */}
      <PackageUpgradeCaution
        analysis={upgradeAnalysis}
        isDismissed={isUpgradeCautionDismissed}
        onUpgrade={handleUpgradeToNextTier}
        onDismiss={() => setIsUpgradeCautionDismissed(true)}
        themeMode={themeMode as 'light' | 'dark'}
      />

      {orderSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{orderSuccessMsg}</span>
        </div>
      )}

      {/* Package Flavor Distribution Section */}
      <div
        className={`p-6 rounded-3xl border transition-all ${
          isDark
            ? 'bg-neutral-900 border-neutral-800'
            : 'bg-gradient-to-b from-[#59B7E8]/10 via-white to-white border-neutral-200 shadow-xs'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-5 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F37021] text-white">
                {currentTier.name} Tier
              </span>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                Distribute Flavors for {currentTier.name} Package
              </h2>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Package Capacity: {currentTier.baseCapacity} packs base • Allowed Range: <strong>{currentTier.rangeLabel}</strong>.
            </p>
          </div>

          <div className="flex flex-col items-end space-y-1">
            <div className="flex items-center space-x-2">
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-xl border ${
                  isCapReached
                    ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                    : isExceeded
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                    : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                Total: {totalPacks} {currentTier.maxCap < 900 ? `/ ${currentTier.maxCap} max packs` : 'packs'}
              </span>
              <button
                type="button"
                onClick={handleAutoFillFromDemand}
                className="px-2.5 py-1 rounded-xl text-xs font-bold bg-[#F37021]/15 text-[#d85e15] dark:text-[#F37021] hover:bg-[#F37021] hover:text-white transition-all flex items-center space-x-1 cursor-pointer"
                title="Auto-fill recommended quantities based on Single Exponential Smoothing (α=0.3)"
              >
                <Sparkles className="w-3 h-3" />
                <span>Auto-Fill (α=0.3)</span>
              </button>
              <button
                onClick={() => setQuantities({})}
                disabled={totalPacks === 0}
                className="text-xs text-neutral-400 hover:text-neutral-600 disabled:opacity-30 underline font-medium"
              >
                Reset
              </button>
            </div>

            {/* Dynamic Helper Text below total counter */}
            {selectedTierId === 'silver' && isCapReached && (
              <button
                type="button"
                onClick={() =>
                  setExceedWarning({
                    isOpen: true,
                    tier: currentTier,
                    attemptedTotal: totalPacks,
                    maxCap: currentTier.maxCap,
                    reason: 'cap_reached',
                  })
                }
                className="text-[11px] font-bold text-red-500 dark:text-red-400 hover:underline animate-in fade-in flex items-center space-x-1 cursor-pointer"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Silver Cap Reached (54/54 packs). Click to upgrade to Gold.</span>
              </button>
            )}
            {selectedTierId === 'gold' && isCapReached && (
              <button
                type="button"
                onClick={() =>
                  setExceedWarning({
                    isOpen: true,
                    tier: currentTier,
                    attemptedTotal: totalPacks,
                    maxCap: currentTier.maxCap,
                    reason: 'cap_reached',
                  })
                }
                className="text-[11px] font-bold text-red-500 dark:text-red-400 hover:underline animate-in fade-in flex items-center space-x-1 cursor-pointer"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Gold Cap Reached (69/69 packs). Click to upgrade to Platinum.</span>
              </button>
            )}
            {selectedTierId === 'silver' && !isCapReached && totalPacks >= currentTier.baseCapacity && (
              <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                {totalPacks - currentTier.baseCapacity} excess packs added (+₱{(totalPrice - currentTier.price).toFixed(2)}). Max 54 packs.
              </p>
            )}
            {selectedTierId === 'gold' && !isCapReached && totalPacks >= currentTier.baseCapacity && (
              <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                {totalPacks - currentTier.baseCapacity} excess packs added (+₱{(totalPrice - currentTier.price).toFixed(2)}). Max 69 packs.
              </p>
            )}
          </div>
        </div>

        {/* Flavor Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-5">
          {products.map((prod) => {
            const invItem = branchInventory.find((i) => i.productId === prod.id);
            const currentStock = invItem ? invItem.stock : 0;
            const currentQty = quantities[prod.id] || 0;
            const isAddDisabled = isCapReached;

            return (
              <div
                key={prod.id}
                className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                  isDark
                    ? 'bg-neutral-850 border-neutral-800'
                    : 'bg-white border-neutral-200/90 shadow-xs'
                }`}
              >
                <div className="pr-2">
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 leading-tight">
                    {prod.flavor}
                  </h4>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Branch On-Hand: <strong className={currentStock <= 5 ? 'text-red-500 font-bold' : 'text-neutral-700 dark:text-neutral-300'}>{currentStock} packs</strong>
                  </p>
                </div>

                {/* Stepper Controls with Direct Number Input */}
                <div className="flex items-center space-x-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleQtyChange(prod.id, -1)}
                    disabled={currentQty === 0}
                    className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/70 disabled:opacity-25 flex items-center justify-center transition-all font-bold shadow-2xs active:scale-95"
                    title="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <input
                    type="number"
                    min="0"
                    max={currentTier.maxCap}
                    value={currentQty === 0 ? '' : currentQty}
                    onChange={(e) => handleDirectQtyInput(prod.id, e.target.value)}
                    placeholder="0"
                    className="w-12 h-8 text-center font-black text-sm text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-800 rounded-lg border border-transparent focus:border-sky-400 dark:focus:border-sky-500 focus:bg-white dark:focus:bg-neutral-900 focus:outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />

                  <button
                    type="button"
                    onClick={() => handleQtyChange(prod.id, 1)}
                    disabled={isAddDisabled}
                    className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/70 disabled:opacity-25 disabled:cursor-not-allowed flex items-center justify-center transition-all font-bold shadow-2xs active:scale-95"
                    title={isAddDisabled ? 'Package capacity limit reached' : 'Increase quantity'}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sticky Package Order Checkout Bar */}
        <div className="mt-6 pt-5 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
          {/* Also show caution here if manager is scrolled down near the checkout action */}
          <PackageUpgradeCaution
            analysis={upgradeAnalysis}
            isDismissed={isUpgradeCautionDismissed}
            onUpgrade={handleUpgradeToNextTier}
            onDismiss={() => setIsUpgradeCautionDismissed(true)}
            themeMode={themeMode as 'light' | 'dark'}
            compact
          />

          {isBelowBase && (
            <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                Minimum order requirement: {currentTier.baseCapacity} packs required for {currentTier.name} Package ({totalPacks}/{currentTier.baseCapacity} selected, please add {currentTier.baseCapacity - totalPacks} more pack(s) to proceed).
              </span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-neutral-400">
                Selected Package: <strong className="text-neutral-800 dark:text-neutral-200">{currentTier.name} Tier</strong> • Total: <strong className={isBelowBase ? 'text-amber-600 dark:text-amber-400' : isExceeded ? 'text-red-500' : 'text-neutral-800 dark:text-neutral-200'}>{totalPacks} packs</strong> (Min: {currentTier.baseCapacity})
              </p>
              <p className="text-2xl font-black text-[#F37021]">
                ₱{totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                {totalPacks > 0 && (
                  <span className="text-xs font-normal text-neutral-400 ml-2">
                    (≈ ₱{(totalPrice / totalPacks).toFixed(1)}/pack)
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleInlinePlacePackageOrder}
                disabled={isBelowBase}
                className={`px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider shadow-md transition-all flex items-center space-x-2 ${
                  !isBelowBase
                    ? 'bg-[#F37021] hover:bg-[#e06214] text-white active:scale-95 cursor-pointer'
                    : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
                }`}
                title={isBelowBase ? `Need at least ${currentTier.baseCapacity} packs to place order` : `Submit ${currentTier.name} Order`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Submit {currentTier.name} Order</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Order Status History Table */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold flex items-center space-x-2">
              <span>Branch Stock Requisition History</span>
              {activeOrdersCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F37021]/15 text-[#F37021] border border-[#F37021]/30">
                  {activeOrdersCount} Active
                </span>
              )}
            </h2>
            <p className="text-xs text-neutral-500">
              Track live made-to-order statuses, attached payment proofs, and delivery dispatches.
            </p>
          </div>

          {/* Status Tab Filters */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
            {[
              { id: 'all', label: `All (${branchOrders.length})` },
              { id: 'active', label: `Active (${activeOrdersCount})` },
              { id: 'completed', label: `Completed (${completedOrdersCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setHistoryTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  historyTab === tab.id
                    ? 'bg-[#F37021] text-white shadow-xs'
                    : isDark
                    ? 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Real-time Dispatched Consignments Alert Banner for Branch Manager */}
        {dispatchedOrders.length > 0 && (
          <div className="p-4 sm:p-5 rounded-2xl bg-linear-to-r from-red-500/10 via-amber-500/10 to-[#F37021]/10 border-2 border-red-500/30 space-y-3.5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-3">
                <div className="px-2.5 py-1 rounded-xl bg-red-600 text-white font-black text-xs shadow-xs flex items-center justify-center tracking-wider">
                  J&T EXPRESS
                </div>
                <div>
                  <h3 className="text-sm font-black text-neutral-900 dark:text-white flex items-center space-x-2">
                    <span>Active Dispatched Consignments ({dispatchedOrders.length})</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500/20 text-red-700 dark:text-red-400">
                      IN TRANSIT
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    Real-time physical waybill tracking and delivery schedules from Central Commissary.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {dispatchedOrders.map((ord) => {
                const relDelivery = deliveries.find((d) => d.orderId === ord.id && d.status !== 'canceled');
                const trackNo = ord.trackingNumber || ord.waybillNumber || relDelivery?.trackingNumber || relDelivery?.waybillNumber || '';
                const etd = ord.estimatedDeliveryTime || relDelivery?.estimatedDeliveryTime;
                const totalItems = ord.dispatchedProducts?.length
                  ? ord.dispatchedProducts.reduce((s, it) => s + it.quantity, 0)
                  : ord.items?.reduce((s, it) => s + it.quantity, 0) || 0;

                const formatETD = (val?: string) => {
                  if (!val) return null;
                  try {
                    const d = new Date(val);
                    if (isNaN(d.getTime())) return val;
                    return d.toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                  } catch {
                    return val;
                  }
                };

                const formattedETD = formatETD(etd);

                return (
                  <div
                    key={ord.id}
                    className="p-4 rounded-xl bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-600 text-white">
                            J&T EXPRESS
                          </span>
                          <span className="text-xs font-bold text-neutral-900 dark:text-white">
                            Order #{ord.id}
                          </span>
                          {ord.packageName && (
                            <span className="text-[10px] font-bold text-[#F37021] bg-[#F37021]/10 px-1.5 py-0.5 rounded border border-[#F37021]/20">
                              {ord.packageName}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 shrink-0">
                          {totalItems} packs
                        </span>
                      </div>

                      {/* Required explicit notification message */}
                      <div className="p-2.5 rounded-lg bg-red-500/5 border border-red-500/15 text-xs text-neutral-800 dark:text-neutral-200 font-medium leading-relaxed">
                        Your order #{ord.id} has been dispatched via J&T Express! Tracking No:{' '}
                        <span className="font-mono font-black text-red-600 dark:text-red-400 select-all">
                          {trackNo}
                        </span>
                      </div>

                      {formattedETD && (
                        <div className="text-[11px] text-neutral-600 dark:text-neutral-300 flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#F37021]" />
                          <span>
                            Estimated Time of Delivery (ETD):{' '}
                            <strong className="text-neutral-900 dark:text-white font-bold">{formattedETD}</strong>
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTrackingNumber(trackNo);
                          setActiveTrackingOrderId(ord.id);
                        }}
                        className="text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white flex items-center space-x-1 cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span>View Timeline</span>
                      </button>

                      <a
                        href={JT_EXPRESS_TRACKING_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-xs"
                        title="Track package on J&T Official Portal"
                      >
                        <span>Track on J&T Portal</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Search & Sort Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="sm:col-span-2 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Search by order ID, package name, flavor, or batch code..."
              className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-[#80C7F2] ${
                isDark
                  ? 'bg-neutral-900 border-neutral-800 text-white placeholder-neutral-500'
                  : 'bg-white border-neutral-200 text-neutral-900 placeholder-neutral-400'
              }`}
            />
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-neutral-400">
                <ArrowUpDown className="w-3.5 h-3.5" />
              </div>
              <select
                value={historySortBy}
                onChange={(e) => setHistorySortBy(e.target.value as any)}
                className={`w-full pl-8 pr-3 py-2 rounded-xl text-xs border font-medium focus:outline-none focus:ring-1 focus:ring-[#80C7F2] ${
                  isDark
                    ? 'bg-neutral-900 border-neutral-800 text-white'
                    : 'bg-white border-neutral-200 text-neutral-900'
                }`}
              >
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="amount_desc">Highest Amount</option>
                <option value="amount_asc">Lowest Amount</option>
                <option value="status">By Status</option>
              </select>
            </div>
          </div>
        </div>

        {filteredAndSortedOrders.length === 0 ? (
          <div className={`p-10 text-center rounded-3xl border ${
            isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200'
          }`}>
            <ShoppingBag className="w-10 h-10 text-neutral-400 mx-auto mb-2 opacity-60" />
            <p className="text-sm font-bold">No orders found</p>
            <p className="text-xs text-neutral-400 mt-0.5">No requisitions match your search or filter criteria.</p>
          </div>
        ) : (
          filteredAndSortedOrders.map((ord) => {
            const stage = ord.productionStage || 'queued';
            const stageInfo = STAGE_CONFIG[stage] || STAGE_CONFIG.queued;
            const StageIcon = stageInfo.icon;

            return (
              <div
                key={ord.id}
                className={`p-5 rounded-3xl border transition-all space-y-3.5 ${
                  isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-neutral-400">#{ord.id}</span>
                      {ord.packageName && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F37021]/15 text-[#F37021] border border-[#F37021]/30 flex items-center space-x-1">
                          <Sparkles className="w-3 h-3" />
                          <span>{ord.packageName}</span>
                        </span>
                      )}
                      {ord.batchCode && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#80C7F2]/15 text-[#1a7bb5] dark:text-[#80C7F2] border border-[#80C7F2]/30">
                          Batch: {ord.batchCode}
                        </span>
                      )}
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        ord.status === 'approved'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : ord.status === 'waitingApproval'
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          : ord.status === 'rejected'
                          ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                          : 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                      }`}>
                        {ord.status === 'waitingApproval' ? 'Under HQ Review' : ord.status}
                      </span>
                      <span className="text-xs text-neutral-400">
                        {new Date(ord.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-xs text-neutral-600 dark:text-neutral-300 flex flex-wrap items-center gap-2">
                      <span>{ord.items.map((i) => `${i.quantity}x ${i.productName}`).join(' • ')}</span>
                      {ord.paymentMethod && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 flex items-center space-x-1">
                          <CreditCard className="w-3 h-3 text-[#F37021]" />
                          <span className="capitalize">{ord.paymentMethod.replace('_', ' ')}</span>
                          {ord.paymentReference && <span className="font-mono text-[9px]">({ord.paymentReference})</span>}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-3">
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-neutral-400">Total Value</p>
                      <p className="text-base font-black text-emerald-600 dark:text-emerald-400">
                        ₱{ord.totalAmount.toLocaleString()}
                      </p>
                    </div>

                    {ord.status === 'pending' && (
                      <button
                        onClick={() => setSelectedOrderForProof(ord)}
                        className="px-3.5 py-2 rounded-xl bg-[#F37021] hover:bg-[#d85e15] text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-xs cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Submit Proof of Payment</span>
                      </button>
                    )}

                    {ord.proofImagePath && (
                      <a
                        href={ord.proofImagePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-[#80C7F2] transition-colors"
                        title="View uploaded proof"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Made-to-Order Confectionery Lifecycle Bar */}
                <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">MTO Kitchen Status:</span>
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border flex items-center space-x-1.5 ${stageInfo.bg} ${stageInfo.color}`}>
                      <StageIcon className="w-3.5 h-3.5" />
                      <span>{stageInfo.label}</span>
                    </span>
                  </div>

                  {ord.estimatedReadyDate && (
                    <span className="text-[11px] text-neutral-500 font-medium">
                      Estimated Dispatch: <strong className="text-neutral-700 dark:text-neutral-300">{ord.estimatedReadyDate}</strong>
                    </span>
                  )}
                </div>

                {/* Delivery & J&T Express Logistics Tracking */}
                {(() => {
                  const relDelivery = deliveries.find((d) => d.orderId === ord.id);
                  const isJT =
                    relDelivery?.dispatchMethod === 'jt_express' ||
                    (relDelivery?.courierName && relDelivery.courierName.toLowerCase().includes('j&t')) ||
                    ord.dispatchMethod === 'jt_express';

                  const trackingNo = relDelivery?.waybillNumber || relDelivery?.trackingNumber || ord.trackingNumber;
                  const etd = ord.estimatedDeliveryTime || relDelivery?.estimatedDeliveryTime;

                  if (!relDelivery && !trackingNo && !ord.isDispatched) return null;

                  const formatETD = (etdVal?: string) => {
                    if (!etdVal) return null;
                    try {
                      const d = new Date(etdVal);
                      if (isNaN(d.getTime())) return etdVal;
                      return d.toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                    } catch {
                      return etdVal;
                    }
                  };

                  const formattedETD = formatETD(etd);

                  return (
                    <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-2 p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/60 dark:border-neutral-800/80">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              relDelivery?.dispatchMethod === 'company_driver'
                                ? 'bg-[#F37021] text-white'
                                : 'bg-sky-600 text-white'
                            }`}
                          >
                            {relDelivery?.dispatchMethod === 'company_driver' ? 'IN-HOUSE FLEET' : relDelivery?.courierName || 'COURIER'}
                          </span>

                          {trackingNo && (
                            <div className="flex items-center space-x-1.5">
                              <span className="text-[11px] text-neutral-500 font-medium">Waybill:</span>
                              <span className="font-mono text-xs font-black px-2 py-0.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 select-all">
                                {trackingNo}
                              </span>
                            </div>
                          )}

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              relDelivery?.status === 'delivered'
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : relDelivery?.status === 'inTransit'
                                ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {relDelivery?.status === 'inTransit'
                              ? 'In Transit'
                              : relDelivery?.status === 'delivered'
                              ? 'Delivered'
                              : 'Dispatched from Commissary'}
                          </span>
                        </div>

                        {trackingNo && (
                          <div className="flex items-center space-x-2 self-start sm:self-auto">
                            {isJT && (
                              <a
                                href={JT_EXPRESS_TRACKING_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-xs"
                                title="Track package on J&T Official Portal"
                              >
                                <span>Carrier Portal</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}

                            <button
                              onClick={() => {
                                setActiveTrackingNumber(trackingNo);
                                setActiveTrackingOrderId(ord.id);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
                            >
                              <Truck className="w-3.5 h-3.5 text-[#F37021]" />
                              <span>Delivery Details</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Additional Delivery Manifest Info: ETD & Dispatched Products */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[11px] border-t border-neutral-200/50 dark:border-neutral-800/60">
                        {formattedETD && (
                          <div className="flex items-center space-x-1.5 text-neutral-600 dark:text-neutral-300">
                            <Clock className="w-3.5 h-3.5 text-[#F37021]" />
                            <span>
                              Estimated Time of Delivery (ETD): <strong className="text-neutral-900 dark:text-white font-bold">{formattedETD}</strong>
                            </span>
                          </div>
                        )}

                        {ord.dispatchedProducts && ord.dispatchedProducts.length > 0 && (
                          <div className="flex items-center space-x-1.5 text-neutral-600 dark:text-neutral-300">
                            <PackageCheck className="w-3.5 h-3.5 text-emerald-500" />
                            <span>
                              Confirmed Consignment: <strong className="text-neutral-900 dark:text-white font-bold">{ord.dispatchedProducts.reduce((s, it) => s + it.quantity, 0)} Units</strong>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {ord.rejectionReason && (
                  <p className="text-xs text-red-500 font-semibold pt-1">
                    Rejection Reason: {ord.rejectionReason}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Real-Time J&T Tracking Modal */}
      {activeTrackingNumber && (
        <JTTrackingModal
          trackingNumber={activeTrackingNumber}
          orderId={activeTrackingOrderId || undefined}
          branchName={currentBranch.name}
          themeMode={themeMode}
          onClose={() => {
            setActiveTrackingNumber(null);
            setActiveTrackingOrderId(null);
          }}
        />
      )}

      {/* Digital Payment & Checkout Modal */}
      {selectedOrderForProof && (
        <BranchPaymentModal
          order={selectedOrderForProof}
          branchName={currentBranch.name}
          themeMode={themeMode}
          onClose={() => setSelectedOrderForProof(null)}
          onPaymentComplete={(proofUrl, details) => {
            uploadPaymentProof(selectedOrderForProof.id, proofUrl, details);
            setSelectedOrderForProof(null);
            setOrderSuccessMsg(
              `Payment verification submitted for Order #${selectedOrderForProof.id} via ${details.paymentMethod.toUpperCase()}${
                details.referenceNumber ? ` (Ref: ${details.referenceNumber})` : ''
              }!`
            );
            setTimeout(() => setOrderSuccessMsg(null), 6000);
          }}
        />
      )}

      {/* Package Capacity & Record Exceed Warning Dialog */}
      <PackageCapacityWarningModal
        warning={exceedWarning}
        themeMode={themeMode}
        onClose={() => setExceedWarning(null)}
        onUpgradeTier={(newTierId) => handleSelectTier(newTierId)}
        onAutoAdjust={() => handleAutoAdjustToMaxCap(exceedWarning?.maxCap)}
      />
    </div>
  );
};


