import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { ListSkeletonItem, EmptyStateBanner } from '../common/SkeletonLoaders';
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
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Table as TableIcon,
  X,
  Eye,
  RotateCcw,
  ArrowRight,
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
  { id: 'silver', name: 'Silver', price: 3999, baseCapacity: 35, maxCap: 35, rangeLabel: '35 packs' },
  { id: 'gold', name: 'Gold', price: 5775, baseCapacity: 55, maxCap: 55, rangeLabel: '55 packs' },
  { id: 'platinum', name: 'Platinum', price: 7000, baseCapacity: 70, maxCap: 70, rangeLabel: '70 packs' },
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
    label: '1. Queued',
    icon: Clock,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/30',
  },
  in_kettle: {
    label: '2. In-Kitchen',
    icon: Layers,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/30',
  },
  curing: {
    label: '2. In-Kitchen',
    icon: Layers,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-500/10 border-sky-500/30',
  },
  in_production: {
    label: '2. In-Kitchen',
    icon: Layers,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/30',
  },
  packaging: {
    label: '3. Packed & QC',
    icon: Box,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/30',
  },
  packaged: {
    label: '3. Packed & QC',
    icon: Box,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/30',
  },
  ready_for_dispatch: {
    label: '4. Ready',
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
    syncState,
  } = useData();

  const [selectedTierId, setSelectedTierId] = useState<'silver' | 'gold' | 'platinum'>('gold');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selectedOrderForProof, setSelectedOrderForProof] = useState<Order | null>(null);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState<string | null>(null);
  const [historyTab, setHistoryTab] = useState<'all' | 'active' | 'in_transit' | 'pending_payment' | 'completed'>('all');
  const [historyViewMode, setHistoryViewMode] = useState<'table' | 'cards'>('table');
  const [historySortBy, setHistorySortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'status'>('date_desc');
  const [historySearch, setHistorySearch] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [copiedWaybill, setCopiedWaybill] = useState<string | null>(null);
  const [activeTrackingNumber, setActiveTrackingNumber] = useState<string | null>(null);
  const [activeTrackingOrderId, setActiveTrackingOrderId] = useState<string | null>(null);

  if (!currentBranch) return null;

  const branchId = currentBranch.id;
  const branchOrders = getOrdersForBranch(branchId);
  const branchInventory = getInventoryForBranch(branchId);
  const isDark = themeMode === 'dark';

  const handleCopyWaybill = (trackingNo: string) => {
    try {
      navigator.clipboard.writeText(trackingNo);
      setCopiedWaybill(trackingNo);
      setTimeout(() => {
        setCopiedWaybill((prev) => (prev === trackingNo ? null : prev));
      }, 2000);
    } catch {
      // ignore
    }
  };

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

  // Real-time Dispatched J&T Orders for Branch Manager Alert & Tracking
  const dispatchedOrders = useMemo(() => {
    return branchOrders.filter((ord) => {
      const relDelivery = deliveries.find((d) => d.orderId === ord.id && d.status !== 'canceled');
      const hasTracking = Boolean(ord.trackingNumber || ord.waybillNumber || relDelivery?.trackingNumber || relDelivery?.waybillNumber);
      return (ord.status === 'dispatched' || ord.isDispatched || relDelivery?.status === 'inTransit' || relDelivery?.status === 'pending') && hasTracking;
    });
  }, [branchOrders, deliveries]);

  // Filtered & Sorted orders
  const filteredAndSortedOrders = useMemo(() => {
    return branchOrders
      .filter((ord) => {
        // Tab filter
        if (historyTab === 'active') {
          if (ord.isArchived || ord.status === 'completed' || ord.status === 'rejected') return false;
        } else if (historyTab === 'in_transit') {
          const isDispatched = ord.status === 'dispatched' || ord.isDispatched;
          const relDelivery = deliveries.find((d) => d.orderId === ord.id && d.status !== 'canceled');
          const inTransit = relDelivery?.status === 'inTransit' || relDelivery?.status === 'pending';
          if (!isDispatched && !inTransit) return false;
        } else if (historyTab === 'pending_payment') {
          if (ord.status !== 'pending' && !(ord.paymentStatus === 'PENDING' && !ord.proofImagePath)) return false;
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
          const matchesTracking = Boolean(
            (ord.trackingNumber && ord.trackingNumber.toLowerCase().includes(query)) ||
            (ord.waybillNumber && ord.waybillNumber.toLowerCase().includes(query))
          );
          if (!matchesId && !matchesPkg && !matchesBatch && !matchesItem && !matchesTracking) return false;
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
  }, [branchOrders, historyTab, historySearch, historySortBy, deliveries]);

  const activeOrdersCount = branchOrders.filter((o) => !o.isArchived && o.status !== 'completed' && o.status !== 'rejected').length;
  const completedOrdersCount = branchOrders.filter((o) => o.isArchived || o.status === 'completed').length;
  const inTransitCount = dispatchedOrders.length;
  const pendingPaymentCount = branchOrders.filter((o) => o.status === 'pending' && !o.proofImagePath).length;
  const totalRequisitionSpend = branchOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalPacksRequisitioned = branchOrders.reduce((sum, o) => sum + (o.items?.reduce((s, it) => s + (it.quantity || 0), 0) || 0), 0);

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

  const isCapReached = totalPacks >= currentTier.baseCapacity;
  const remainingAllowedPacks = Math.max(0, currentTier.baseCapacity - totalPacks);

  const handleQtyChange = (productId: string, delta: number) => {
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
      const current = prev[productId] || 0;
      if (delta > 0) {
        // Enforce baseCapacity strictly as maximum limit
        if (totalPacks >= currentTier.baseCapacity) return prev;
        const safeDelta = Math.min(delta, currentTier.baseCapacity - totalPacks);
        if (safeDelta <= 0) return prev;
        const next = current + safeDelta;
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

    // Clamp input between 0 and max available under the selected package's strict base capacity limit
    const clamped = Math.max(0, Math.min(parsed, maxAvailableForThisItem));
    setQuantities((prev) => ({ ...prev, [productId]: clamped }));
  };

  const handleSelectTier = (tierId: 'silver' | 'gold' | 'platinum') => {
    const targetTier = PACKAGE_TIERS.find((t) => t.id === tierId) || PACKAGE_TIERS[1];
    
    // If switching to a tier where current total exceeds new tier's base capacity, show warning dialog and trim
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

  const handleInlinePlacePackageOrder = () => {
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

    const packageName = `${currentTier.name} Package`;

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
      <div id="requisition-tour-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black tracking-tight">Commissary Package Requisitions</h1>
          </div>
          <p className="text-xs text-neutral-500 font-medium">
            Order fresh gourmet marshmallow packages handmade at Central Bicol Commissary.
          </p>
        </div>
      </div>

      {/* Package Order Quick-Select Cards */}
      <div id="requisition-tour-package-tiers" className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    Strict Limit: <strong className="text-neutral-800 dark:text-neutral-200">{tier.baseCapacity} packs</strong>
                  </p>
                  <p className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                    Tier Capacity: <span className="text-[#F37021]">{tier.rangeLabel}</span>
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400">
                  {isSelected ? '✓ Selected' : 'Click to select'}
                </span>
                <span className="text-[10px] text-neutral-400">
                  Strict max {tier.baseCapacity} packs
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Intelligent Package Upgrade / Cost-Optimization Caution Card */}
      <div id="requisition-tour-upgrade-caution">
        <PackageUpgradeCaution
          analysis={upgradeAnalysis}
          isDismissed={isUpgradeCautionDismissed}
          onUpgrade={handleUpgradeToNextTier}
          onDismiss={() => setIsUpgradeCautionDismissed(true)}
          themeMode={themeMode as 'light' | 'dark'}
        />
      </div>

      {orderSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{orderSuccessMsg}</span>
        </div>
      )}

      {/* Package Flavor Distribution Section */}
      <div
        id="requisition-tour-flavor-distribution"
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
              Package Base Capacity: <strong>{currentTier.baseCapacity} packs strict maximum</strong>. Total pack selection cannot exceed this limit.
            </p>
          </div>

          <div className="flex flex-col items-end space-y-1">
            <div className="flex items-center space-x-2">
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-xl border ${
                  isCapReached
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300'
                    : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                Total: {totalPacks} / {currentTier.baseCapacity} packs {isCapReached ? '(Max Limit Reached)' : ''}
              </span>
              <button
                id="requisition-tour-autofill-btn"
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
                className="text-xs text-neutral-400 hover:text-neutral-600 disabled:opacity-30 underline font-medium cursor-pointer"
              >
                Reset
              </button>
            </div>

            {/* Helper Text below total counter */}
            {isCapReached && (
              <button
                type="button"
                onClick={() =>
                  setExceedWarning({
                    isOpen: true,
                    tier: currentTier,
                    attemptedTotal: totalPacks,
                    maxCap: currentTier.baseCapacity,
                    reason: 'cap_reached',
                  })
                }
                className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline animate-in fade-in flex items-center space-x-1 cursor-pointer"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>
                  {currentTier.name} Maximum Limit Reached ({currentTier.baseCapacity}/{currentTier.baseCapacity} packs).
                  {selectedTierId === 'silver' ? ' Switch to Gold to add more.' : selectedTierId === 'gold' ? ' Switch to Platinum to add more.' : ' View package details.'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Clear Maximum Limit Reached Alert Banner */}
        {isCapReached && (
          <div
            id="package-limit-reached-alert"
            role="alert"
            className={`mt-4 p-4 rounded-2xl border transition-all animate-in fade-in slide-in-from-top-2 duration-200 ${
              isDark
                ? 'bg-amber-950/40 border-amber-500/40 text-amber-100 shadow-md shadow-amber-950/30'
                : 'bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-amber-300 text-neutral-900 shadow-xs'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs shrink-0 mt-0.5">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                      Maximum Limit Reached
                    </span>
                    <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                      Maximum Limit Reached for {currentTier.name} Package ({totalPacks}/{currentTier.baseCapacity} packs)
                    </h4>
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1 leading-relaxed">
                    You have reached the strict maximum base capacity limit of <strong>{currentTier.baseCapacity} packs</strong> for the <strong>{currentTier.name} Package</strong>. Further packs cannot be added to this package tier.
                  </p>
                  {selectedTierId === 'silver' && (
                    <p className="text-xs text-[#d95d12] dark:text-amber-300 font-semibold mt-1 flex items-center space-x-1">
                      <span>💡 <strong>Recommendation:</strong> Switch to the <strong>Gold Package (55 packs)</strong> or <strong>Platinum Package (70 packs)</strong> if you wish to order more packs.</span>
                    </p>
                  )}
                  {selectedTierId === 'gold' && (
                    <p className="text-xs text-[#d95d12] dark:text-amber-300 font-semibold mt-1 flex items-center space-x-1">
                      <span>💡 <strong>Recommendation:</strong> Switch to the <strong>Platinum Package (70 packs)</strong> if you wish to order more packs.</span>
                    </p>
                  )}
                  {selectedTierId === 'platinum' && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mt-1">
                      Platinum is our maximum package tier (70 packs). To order larger bulk commissary volumes, please place an additional requisition or contact commissary management.
                    </p>
                  )}
                </div>
              </div>

              {selectedTierId === 'silver' && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleUpgradeToNextTier('gold')}
                    className="px-4 py-2.5 rounded-xl bg-[#F37021] hover:bg-[#e06214] text-white text-xs font-bold shadow-sm transition-all flex items-center space-x-1.5 active:scale-95 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Switch to Gold (55 packs)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpgradeToNextTier('platinum')}
                    className="px-3 py-2.5 rounded-xl bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
                  >
                    <span>Platinum (70)</span>
                  </button>
                </div>
              )}

              {selectedTierId === 'gold' && (
                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() => handleUpgradeToNextTier('platinum')}
                    className="px-4 py-2.5 rounded-xl bg-[#F37021] hover:bg-[#e06214] text-white text-xs font-bold shadow-sm transition-all flex items-center space-x-1.5 active:scale-95 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Switch to Platinum (70 packs)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Flavor Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-5">
          {products.map((prod) => {
            const invItem = branchInventory.find((i) => i.productId === prod.id);
            const currentStock = invItem ? invItem.stock : 0;
            const currentQty = quantities[prod.id] || 0;

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
                <div id={prod.id === products[0]?.id ? 'requisition-tour-qty-controls' : undefined} className="flex items-center space-x-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleQtyChange(prod.id, -1)}
                    disabled={currentQty === 0}
                    className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/70 disabled:opacity-25 flex items-center justify-center transition-all font-bold shadow-2xs active:scale-95 cursor-pointer"
                    title="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <input
                    type="number"
                    min="0"
                    max={currentTier.baseCapacity}
                    value={currentQty === 0 ? '' : currentQty}
                    onChange={(e) => handleDirectQtyInput(prod.id, e.target.value)}
                    placeholder="0"
                    className="w-12 h-8 text-center font-black text-sm text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-800 rounded-lg border border-transparent focus:border-sky-400 dark:focus:border-sky-500 focus:bg-white dark:focus:bg-neutral-900 focus:outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />

                  <button
                    type="button"
                    onClick={() => handleQtyChange(prod.id, 1)}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all font-bold shadow-2xs active:scale-95 cursor-pointer ${
                      isCapReached
                        ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 hover:bg-amber-100 dark:hover:bg-amber-950/70 hover:text-amber-600 border border-dashed border-amber-400/40'
                        : 'bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/70'
                    }`}
                    title={
                      isCapReached
                        ? `Maximum limit reached (${currentTier.baseCapacity} packs). Click to view options or upgrade package.`
                        : 'Increase quantity'
                    }
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sticky Package Order Checkout Bar */}
        <div id="requisition-tour-checkout-bar" className="mt-6 pt-5 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
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
                Selected Package: <strong className="text-neutral-800 dark:text-neutral-200">{currentTier.name} Tier</strong> • Total: <strong className={isBelowBase ? 'text-amber-600 dark:text-amber-400' : isCapReached ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-neutral-800 dark:text-neutral-200'}>{totalPacks} / {currentTier.baseCapacity} packs</strong>
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

      {/* Order Status History Section */}
      <div id="requisition-tour-history-table" className="space-y-4 pt-6 border-t border-neutral-200/80 dark:border-neutral-800">
        {/* Section Header & KPI Overview */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                Branch Stock Requisition History
              </h2>
              {activeOrdersCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/50">
                  {activeOrdersCount} in progress
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Track live made-to-order kitchen cooking, attached payments, and courier dispatches for {currentBranch.name}.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className={`px-3 py-1.5 rounded-xl border text-xs flex items-center space-x-2 ${
              isDark ? 'bg-neutral-900/60 border-neutral-800 text-neutral-300' : 'bg-white border-neutral-200 text-neutral-600 shadow-2xs'
            }`}>
              <span className="text-neutral-400">Total Orders:</span>
              <strong className="text-neutral-900 dark:text-white font-semibold">{branchOrders.length}</strong>
            </div>

            <div className={`px-3 py-1.5 rounded-xl border text-xs flex items-center space-x-2 ${
              isDark ? 'bg-neutral-900/60 border-neutral-800 text-neutral-300' : 'bg-white border-neutral-200 text-neutral-600 shadow-2xs'
            }`}>
              <span className="text-neutral-400">En Route:</span>
              <strong className="text-sky-600 dark:text-sky-400 font-semibold">{inTransitCount}</strong>
            </div>

            <div className={`px-3 py-1.5 rounded-xl border text-xs flex items-center space-x-2 ${
              isDark ? 'bg-neutral-900/60 border-neutral-800 text-neutral-300' : 'bg-white border-neutral-200 text-neutral-600 shadow-2xs'
            }`}>
              <span className="text-neutral-400">Total Spend:</span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">₱{totalRequisitionSpend.toLocaleString()}</strong>
            </div>
          </div>
        </div>

        {/* Real-time Dispatched Consignments Alert Banner (Refined, Eye-Friendly) */}
        {dispatchedOrders.length > 0 && (
          <div className={`p-4 rounded-2xl border transition-all space-y-3 ${
            isDark ? 'bg-neutral-900/70 border-neutral-800' : 'bg-sky-50/40 border-sky-200/70 shadow-2xs'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sky-100 dark:border-neutral-800/80 pb-2.5">
              <div className="flex items-center space-x-2.5">
                <span className="px-2 py-0.5 rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-[10px] font-bold tracking-wider uppercase">
                  J&T EXPRESS
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white flex items-center space-x-2">
                    <span>Active Dispatched Consignments ({dispatchedOrders.length})</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300">
                      In Transit
                    </span>
                  </h3>
                </div>
              </div>
              <p className="text-[11px] text-neutral-500">
                Track live parcels en route to store
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
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
                    className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2.5 ${
                      isDark ? 'bg-neutral-950/50 border-neutral-800' : 'bg-white border-neutral-200/90 shadow-2xs'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-semibold text-neutral-900 dark:text-white">Order #{ord.id}</span>
                          {ord.packageName && (
                            <span className="text-[10px] text-neutral-500">· {ord.packageName}</span>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          {totalItems} packs
                        </span>
                      </div>

                      {/* Explicit notification message presented cleanly */}
                      <div className={`p-2.5 rounded-lg text-xs leading-relaxed ${
                        isDark ? 'bg-neutral-900 text-neutral-300 border border-neutral-800' : 'bg-neutral-50 text-neutral-700 border border-neutral-200/70'
                      }`}>
                        Your order #{ord.id} has been dispatched via J&T Express! Tracking No:{' '}
                        <button
                          type="button"
                          onClick={() => handleCopyWaybill(trackNo)}
                          className="inline-flex items-center space-x-1 font-mono font-bold text-neutral-900 dark:text-white hover:text-sky-600 transition-colors ml-1 cursor-pointer"
                          title="Click to copy tracking number"
                        >
                          <span>{trackNo}</span>
                          {copiedWaybill === trackNo ? (
                            <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                          ) : (
                            <Copy className="w-3 h-3 text-neutral-400 shrink-0" />
                          )}
                        </button>
                      </div>

                      {formattedETD && (
                        <div className="text-[11px] text-neutral-500 flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-neutral-400" />
                          <span>Estimated Arrival: <strong className="text-neutral-700 dark:text-neutral-300 font-medium">{formattedETD}</strong></span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTrackingNumber(trackNo);
                          setActiveTrackingOrderId(ord.id);
                        }}
                        className="font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white flex items-center space-x-1 cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span>View Timeline</span>
                      </button>

                      <a
                        href={JT_EXPRESS_TRACKING_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-medium transition-colors flex items-center space-x-1 text-[11px]"
                      >
                        <span>J&T Portal</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter Tabs, Search & View Mode Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
          {/* Segmented Status Tabs */}
          <div className={`p-1 rounded-xl border flex items-center gap-1 overflow-x-auto ${
            isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-neutral-100/80 border-neutral-200'
          }`}>
            {[
              { id: 'all', label: 'All', count: branchOrders.length },
              { id: 'active', label: 'In Progress', count: activeOrdersCount },
              { id: 'in_transit', label: 'In Transit', count: inTransitCount },
              { id: 'pending_payment', label: 'Needs Payment', count: pendingPaymentCount },
              { id: 'completed', label: 'Completed', count: completedOrdersCount },
            ].map((tab) => {
              const isActive = historyTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setHistoryTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center space-x-1.5 cursor-pointer ${
                    isActive
                      ? isDark
                        ? 'bg-neutral-800 text-white shadow-2xs font-semibold'
                        : 'bg-white text-neutral-900 shadow-2xs font-semibold'
                      : isDark
                      ? 'text-neutral-400 hover:text-neutral-200'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive
                      ? isDark
                        ? 'bg-neutral-700 text-neutral-200'
                        : 'bg-neutral-100 text-neutral-700'
                      : isDark
                      ? 'bg-neutral-800/80 text-neutral-500'
                      : 'bg-neutral-200/80 text-neutral-500'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Toolbar: Search, Sort & View Switcher */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                <Search className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search order #, package, flavor, batch..."
                className={`w-full pl-8 pr-7 py-1.5 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-sky-500/30 ${
                  isDark
                    ? 'bg-neutral-900 border-neutral-800 text-white placeholder-neutral-500'
                    : 'bg-white border-neutral-200 text-neutral-900 placeholder-neutral-400'
                }`}
              />
              {historySearch && (
                <button
                  onClick={() => setHistorySearch('')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={historySortBy}
                onChange={(e) => setHistorySortBy(e.target.value as any)}
                aria-label="Sort requisitions"
                className={`py-1.5 pl-2.5 pr-7 rounded-xl text-xs border font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/30 cursor-pointer ${
                  isDark
                    ? 'bg-neutral-900 border-neutral-800 text-neutral-200'
                    : 'bg-white border-neutral-200 text-neutral-700'
                }`}
              >
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="amount_desc">Highest Amount</option>
                <option value="amount_asc">Lowest Amount</option>
                <option value="status">By Status</option>
              </select>
            </div>

            {/* View Mode Toggle (Table vs Cards) */}
            <div className={`p-0.5 rounded-xl border flex items-center gap-0.5 ${
              isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-neutral-100 border-neutral-200'
            }`}>
              <button
                type="button"
                onClick={() => setHistoryViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1 cursor-pointer ${
                  historyViewMode === 'table'
                    ? isDark
                      ? 'bg-neutral-800 text-white shadow-2xs'
                      : 'bg-white text-neutral-900 shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
                title="Table View (Fast scanning)"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Table</span>
              </button>
              <button
                type="button"
                onClick={() => setHistoryViewMode('cards')}
                className={`p-1.5 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1 cursor-pointer ${
                  historyViewMode === 'cards'
                    ? isDark
                      ? 'bg-neutral-800 text-white shadow-2xs'
                      : 'bg-white text-neutral-900 shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
                title="Cards View (Detailed)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Cards</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Area: Syncing Skeleton or Empty State or Orders Display */}
        {syncState?.status === 'syncing' ? (
          <div className="space-y-2.5">
            <ListSkeletonItem isDark={isDark} />
            <ListSkeletonItem isDark={isDark} />
            <ListSkeletonItem isDark={isDark} />
          </div>
        ) : filteredAndSortedOrders.length === 0 ? (
          <div className={`p-8 rounded-2xl border text-center space-y-3 ${
            isDark ? 'bg-neutral-900/40 border-neutral-800' : 'bg-white border-neutral-200 shadow-2xs'
          }`}>
            <ShoppingBag className="w-8 h-8 text-neutral-400 mx-auto" />
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
              No requisitions match your criteria
            </h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              {historySearch
                ? `No orders found matching "${historySearch}". Try clearing your search or switching filter tabs.`
                : 'There are no requisitions under this filter.'}
            </p>
            {(historySearch || historyTab !== 'all') && (
              <button
                onClick={() => {
                  setHistorySearch('');
                  setHistoryTab('all');
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 transition-colors inline-flex items-center space-x-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        ) : historyViewMode === 'table' ? (
          /* ======================================================== */
          /* TABLE VIEW: Clean, Scannable, High-Contrast & Soothing */
          /* ======================================================== */
          <div className={`rounded-2xl border overflow-hidden transition-all ${
            isDark ? 'bg-neutral-900/60 border-neutral-800' : 'bg-white border-neutral-200/90 shadow-2xs'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`border-b text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 ${
                    isDark ? 'bg-neutral-900/90 border-neutral-800' : 'bg-neutral-50/90 border-neutral-200'
                  }`}>
                    <th className="py-3 px-4">Order Ref & Package</th>
                    <th className="py-3 px-4">Date Placed</th>
                    <th className="py-3 px-4">Flavors & Packs</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">MTO Kitchen Status</th>
                    <th className="py-3 px-4">Courier / Waybill</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                  {filteredAndSortedOrders.map((ord, idx) => {
                    const isExpanded = expandedOrderId === ord.id;
                    const stage = ord.productionStage || 'queued';
                    const stageInfo = STAGE_CONFIG[stage] || STAGE_CONFIG.queued;
                    const StageIcon = stageInfo.icon;

                    const relDelivery = deliveries.find((d) => d.orderId === ord.id && d.status !== 'canceled');
                    const trackNo = ord.trackingNumber || ord.waybillNumber || relDelivery?.trackingNumber || relDelivery?.waybillNumber || '';
                    const etd = ord.estimatedDeliveryTime || relDelivery?.estimatedDeliveryTime;
                    const totalItems = ord.items?.reduce((s, it) => s + it.quantity, 0) || 0;

                    const formatETD = (val?: string) => {
                      if (!val) return null;
                      try {
                        const d = new Date(val);
                        if (isNaN(d.getTime())) return val;
                        return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                      } catch {
                        return val;
                      }
                    };

                    const formattedETD = formatETD(etd);

                    // Clean status styling
                    let statusLabel = ord.status === 'waitingApproval' ? 'Under HQ Review' : ord.status;
                    if (ord.isArchived || ord.status === 'completed') statusLabel = 'Completed';

                    const isNeedsPayment = ord.status === 'pending';

                    return (
                      <React.Fragment key={ord.id}>
                        <tr
                          id={idx === 0 ? 'requisition-tour-proof-tracking' : undefined}
                          className={`transition-colors cursor-pointer ${
                            isExpanded
                              ? isDark ? 'bg-neutral-800/40' : 'bg-neutral-50/80'
                              : isDark ? 'hover:bg-neutral-800/20' : 'hover:bg-neutral-50/60'
                          }`}
                          onClick={() => setExpandedOrderId(isExpanded ? null : ord.id)}
                        >
                          {/* Order Ref & Tier */}
                          <td className="py-3 px-4">
                            <div className="space-y-0.5">
                              <div className="flex items-center space-x-1.5">
                                <span className="font-mono font-bold text-neutral-900 dark:text-white">
                                  #{ord.id}
                                </span>
                                {ord.packageName && (
                                  <span className="text-[10px] font-medium text-neutral-500">
                                    · {ord.packageName}
                                  </span>
                                )}
                              </div>
                              {ord.batchCode && (
                                <p className="font-mono text-[10px] text-neutral-400">
                                  Batch: {ord.batchCode}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Date Placed */}
                          <td className="py-3 px-4 text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                            {new Date(ord.createdAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </td>

                          {/* Flavors & Packs */}
                          <td className="py-3 px-4 max-w-xs">
                            <div className="space-y-0.5">
                              <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                                {totalItems} packs
                              </span>
                              <p className="text-[11px] text-neutral-400 truncate">
                                {ord.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                              </p>
                            </div>
                          </td>

                          {/* Total Amount */}
                          <td className="py-3 px-4 text-right font-bold text-neutral-900 dark:text-white whitespace-nowrap">
                            ₱{ord.totalAmount.toLocaleString()}
                          </td>

                          {/* Payment */}
                          <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                            {isNeedsPayment ? (
                              <button
                                onClick={() => setSelectedOrderForProof(ord)}
                                className="px-2.5 py-1 rounded-lg bg-[#F37021] hover:bg-[#d85e15] text-white text-[11px] font-semibold transition-colors flex items-center space-x-1 cursor-pointer shadow-2xs"
                              >
                                <Upload className="w-3 h-3" />
                                <span>Submit Proof</span>
                              </button>
                            ) : ord.proofImagePath ? (
                              <div className="flex items-center space-x-1.5">
                                <a
                                  href={ord.proofImagePath}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-700 dark:text-emerald-400 hover:underline flex items-center space-x-1 font-medium text-[11px]"
                                  title="View proof image"
                                >
                                  <ImageIcon className="w-3 h-3" />
                                  <span>Proof Attached</span>
                                </a>
                              </div>
                            ) : (
                              <span className="text-neutral-400 text-[11px]">
                                {ord.paymentMethod ? ord.paymentMethod.replace('_', ' ') : 'Pending'}
                              </span>
                            )}
                          </td>

                          {/* MTO Kitchen Status */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border ${stageInfo.bg} ${stageInfo.color}`}>
                              <StageIcon className="w-3 h-3" />
                              <span>{stageInfo.label}</span>
                            </span>
                          </td>

                          {/* Courier / Waybill */}
                          <td className="py-3 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            {trackNo ? (
                              <div className="flex items-center space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleCopyWaybill(trackNo)}
                                  className="font-mono text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 font-medium inline-flex items-center space-x-1 cursor-pointer"
                                  title="Click to copy waybill"
                                >
                                  <span>{trackNo}</span>
                                  {copiedWaybill === trackNo ? (
                                    <Check className="w-3 h-3 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-3 h-3 text-neutral-400" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveTrackingNumber(trackNo);
                                    setActiveTrackingOrderId(ord.id);
                                  }}
                                  className="text-[11px] font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
                                  title="View delivery timeline"
                                >
                                  <Zap className="w-3 h-3 text-amber-500" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-neutral-400 text-[11px]">
                                {ord.status === 'approved' ? 'Cooking in Kitchen' : 'Awaiting Dispatch'}
                              </span>
                            )}
                          </td>

                          {/* Actions / Toggle Details */}
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedOrderId(isExpanded ? null : ord.id);
                              }}
                              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                              title={isExpanded ? 'Hide details' : 'Show full details'}
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </td>
                        </tr>

                        {/* Inline Expandable Details Row */}
                        {isExpanded && (
                          <tr className={isDark ? 'bg-neutral-900/90' : 'bg-neutral-50/90'}>
                            <td colSpan={8} className="py-3.5 px-5">
                              <div className="space-y-3 text-xs">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {/* Flavor Quantities Breakdown */}
                                  <div className="md:col-span-2 space-y-1.5">
                                    <h4 className="font-semibold text-neutral-800 dark:text-neutral-200 text-[11px] uppercase tracking-wider">
                                      Flavor Breakdown ({totalItems} packs total)
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                      {ord.items.map((it, iIdx) => (
                                        <div
                                          key={iIdx}
                                          className={`p-2 rounded-lg border flex items-center justify-between text-xs ${
                                            isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-white border-neutral-200/70'
                                          }`}
                                        >
                                          <span className="text-neutral-700 dark:text-neutral-300 font-medium">{it.productName}</span>
                                          <span className="font-bold text-neutral-900 dark:text-white">{it.quantity} packs</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Payment & Logistics Summary */}
                                  <div className={`p-3 rounded-xl border space-y-2 ${
                                    isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-white border-neutral-200/70'
                                  }`}>
                                    <h4 className="font-semibold text-neutral-800 dark:text-neutral-200 text-[11px] uppercase tracking-wider">
                                      Requisition Details
                                    </h4>
                                    <div className="space-y-1 text-[11px] text-neutral-600 dark:text-neutral-400">
                                      <div className="flex justify-between">
                                        <span>Status:</span>
                                        <strong className="text-neutral-900 dark:text-white capitalize">{statusLabel}</strong>
                                      </div>
                                      {ord.paymentMethod && (
                                        <div className="flex justify-between">
                                          <span>Payment Method:</span>
                                          <strong className="text-neutral-900 dark:text-white capitalize">
                                            {ord.paymentMethod.replace('_', ' ')}
                                          </strong>
                                        </div>
                                      )}
                                      {ord.paymentReference && (
                                        <div className="flex justify-between">
                                          <span>Reference #:</span>
                                          <strong className="font-mono text-neutral-900 dark:text-white">{ord.paymentReference}</strong>
                                        </div>
                                      )}
                                      {formattedETD && (
                                        <div className="flex justify-between">
                                          <span>Delivery ETD:</span>
                                          <strong className="text-neutral-900 dark:text-white">{formattedETD}</strong>
                                        </div>
                                      )}
                                    </div>

                                    {/* Action Links */}
                                    <div className="pt-2 flex items-center gap-2 border-t border-neutral-100 dark:border-neutral-800">
                                      {isNeedsPayment && (
                                        <button
                                          onClick={() => setSelectedOrderForProof(ord)}
                                          className="flex-1 py-1.5 rounded-lg bg-[#F37021] text-white text-[11px] font-bold text-center cursor-pointer hover:bg-[#d85e15]"
                                        >
                                          Submit Payment Proof
                                        </button>
                                      )}
                                      {trackNo && (
                                        <button
                                          onClick={() => {
                                            setActiveTrackingNumber(trackNo);
                                            setActiveTrackingOrderId(ord.id);
                                          }}
                                          className="flex-1 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[11px] font-bold text-center cursor-pointer hover:bg-neutral-200"
                                        >
                                          Track Timeline
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {ord.rejectionReason && (
                                  <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/40 text-xs">
                                    <strong>HQ Rejection Note:</strong> {ord.rejectionReason}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* CARDS VIEW: Re-engineered with Calm Spacing & No AI Slop */
          /* ======================================================== */
          <div className="space-y-3">
            {filteredAndSortedOrders.map((ord, idx) => {
              const stage = ord.productionStage || 'queued';
              const stageInfo = STAGE_CONFIG[stage] || STAGE_CONFIG.queued;
              const StageIcon = stageInfo.icon;
              const isExpanded = expandedOrderId === ord.id;

              const relDelivery = deliveries.find((d) => d.orderId === ord.id && d.status !== 'canceled');
              const trackNo = ord.trackingNumber || ord.waybillNumber || relDelivery?.trackingNumber || relDelivery?.waybillNumber || '';
              const etd = ord.estimatedDeliveryTime || relDelivery?.estimatedDeliveryTime;
              const totalItems = ord.items?.reduce((s, it) => s + it.quantity, 0) || 0;

              const formatETD = (val?: string) => {
                if (!val) return null;
                try {
                  const d = new Date(val);
                  if (isNaN(d.getTime())) return val;
                  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                } catch {
                  return val;
                }
              };

              const formattedETD = formatETD(etd);

              let statusLabel = ord.status === 'waitingApproval' ? 'Under HQ Review' : ord.status;
              if (ord.isArchived || ord.status === 'completed') statusLabel = 'Completed';

              return (
                <div
                  key={ord.id}
                  id={idx === 0 ? 'requisition-tour-proof-tracking' : undefined}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3.5 ${
                    isDark ? 'bg-neutral-900/60 border-neutral-800' : 'bg-white border-neutral-200/90 shadow-2xs'
                  }`}
                >
                  {/* Card Header: Metadata Line with Clean Typography */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                        <span className="font-mono font-bold text-neutral-900 dark:text-white">
                          #{ord.id}
                        </span>
                        {ord.packageName && (
                          <>
                            <span className="text-neutral-300 dark:text-neutral-700">·</span>
                            <span className="font-medium text-neutral-700 dark:text-neutral-300">
                              {ord.packageName}
                            </span>
                          </>
                        )}
                        {ord.batchCode && (
                          <>
                            <span className="text-neutral-300 dark:text-neutral-700">·</span>
                            <span className="font-mono text-neutral-500">
                              Batch {ord.batchCode}
                            </span>
                          </>
                        )}
                        <span className="text-neutral-300 dark:text-neutral-700">·</span>
                        <span className="text-neutral-400">
                          {new Date(ord.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>

                      {/* Flavors Summary Line */}
                      <div className="text-xs text-neutral-600 dark:text-neutral-400">
                        <strong className="text-neutral-800 dark:text-neutral-200 font-semibold">{totalItems} packs:</strong>{' '}
                        <span>{ord.items.map((i) => `${i.quantity}x ${i.productName}`).join(' · ')}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-[11px] text-neutral-400 font-medium">Requisition Total</p>
                        <p className="text-base font-bold text-neutral-900 dark:text-white">
                          ₱{ord.totalAmount.toLocaleString()}
                        </p>
                      </div>

                      {ord.status === 'pending' && (
                        <button
                          onClick={() => setSelectedOrderForProof(ord)}
                          className="px-3 py-1.5 rounded-xl bg-[#F37021] hover:bg-[#d85e15] text-white text-xs font-semibold transition-colors flex items-center space-x-1.5 shadow-2xs cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Submit Proof</span>
                        </button>
                      )}

                      {ord.proofImagePath && (
                        <a
                          href={ord.proofImagePath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 transition-colors"
                          title="View uploaded proof image"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* 4-Step MTO Kitchen Production Progress (Quiet, High-Legibility) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                        Kitchen Progress:
                      </span>
                      <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${stageInfo.bg} ${stageInfo.color}`}>
                        <StageIcon className="w-3.5 h-3.5" />
                        <span>{stageInfo.label}</span>
                      </span>
                    </div>

                    {ord.estimatedReadyDate && (
                      <span className="text-xs text-neutral-500">
                        Estimated Ready: <strong className="text-neutral-700 dark:text-neutral-300 font-medium">{ord.estimatedReadyDate}</strong>
                      </span>
                    )}
                  </div>

                  {/* Logistics and Delivery Information */}
                  {trackNo && (
                    <div className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                      isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50/70 border-neutral-200/80'
                    }`}>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span className="px-2 py-0.5 rounded bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 text-[10px] font-bold uppercase tracking-wider">
                          J&T EXPRESS
                        </span>

                        <div className="flex items-center space-x-1">
                          <span className="text-neutral-500">Tracking:</span>
                          <button
                            type="button"
                            onClick={() => handleCopyWaybill(trackNo)}
                            className="font-mono font-bold text-neutral-900 dark:text-white hover:text-sky-600 flex items-center space-x-1 cursor-pointer"
                            title="Copy tracking number"
                          >
                            <span>{trackNo}</span>
                            {copiedWaybill === trackNo ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3 text-neutral-400" />
                            )}
                          </button>
                        </div>

                        {formattedETD && (
                          <span className="text-neutral-500">
                            · ETD: <strong className="text-neutral-700 dark:text-neutral-300 font-medium">{formattedETD}</strong>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setActiveTrackingNumber(trackNo);
                            setActiveTrackingOrderId(ord.id);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-neutral-200/80 dark:bg-neutral-800 hover:bg-neutral-300 text-neutral-800 dark:text-neutral-200 text-xs font-medium transition-colors flex items-center space-x-1 cursor-pointer"
                        >
                          <Zap className="w-3 h-3 text-amber-500" />
                          <span>Delivery Timeline</span>
                        </button>

                        <a
                          href={JT_EXPRESS_TRACKING_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                          title="Open J&T Official Portal"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  )}

                  {ord.rejectionReason && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-medium pt-1">
                      HQ Rejection Reason: {ord.rejectionReason}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
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

