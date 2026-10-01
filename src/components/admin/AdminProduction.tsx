import { paymentReady } from '../../../functions/src/transactionModel';
import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Product } from '../../types';
import {
  Package,
  Plus,
  Layers,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Box,
  Truck,
  Building2,
  TrendingUp,
  ShoppingBag,
  Filter,
  Play,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { CommissarySummary } from './CommissarySummary';
import { CommissaryRequisitionInspect } from './CommissaryRequisitionInspect';
import {
  ProductionSafeguardModal,
  ProductionSafeguardDetails,
} from '../safeguards/ProductionSafeguardModal';

export type CompactProductionStage = 'queued' | 'in_kettle' | 'packaging' | 'ready_for_dispatch';

export const COMPACT_STAGE_OPTIONS: {
  value: CompactProductionStage;
  label: string;
  badgeStyle: string;
}[] = [
  {
    value: 'queued',
    label: 'Queued',
    badgeStyle: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700',
  },
  {
    value: 'in_kettle',
    label: 'In-Kitchen',
    badgeStyle: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40',
  },
  {
    value: 'packaging',
    label: 'Packed & QC',
    badgeStyle: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/40',
  },
  {
    value: 'ready_for_dispatch',
    label: 'Ready',
    badgeStyle: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
  },
];

export const getCompactStage = (stage?: string): CompactProductionStage => {
  if (!stage || stage === 'queued') return 'queued';
  if (stage === 'in_kettle' || stage === 'curing' || stage === 'in_production') return 'in_kettle';
  if (stage === 'packaging' || stage === 'packaged') return 'packaging';
  if (stage === 'ready_for_dispatch' || stage === 'completed' || stage === 'ready') return 'ready_for_dispatch';
  return 'queued';
};

export const getCompactLabel = (stage?: string): string => {
  const compact = getCompactStage(stage);
  switch (compact) {
    case 'queued': return 'Queued';
    case 'in_kettle': return 'In-Kitchen';
    case 'packaging': return 'Packed & QC';
    case 'ready_for_dispatch': return 'Ready';
  }
};

const STAGE_LABELS: Record<string, { label: string; icon: React.FC<{ className?: string }>; color: string; bg: string }> = {
  queued: {
    label: 'Queued',
    icon: Clock,
    color: 'text-slate-500',
    bg: 'bg-slate-500/10 border-slate-500/30',
  },
  in_kettle: {
    label: 'In-Kitchen',
    icon: Layers,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10 border-amber-500/30',
  },
  in_production: {
    label: 'In-Kitchen',
    icon: Layers,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10 border-amber-500/30',
  },
  curing: {
    label: 'In-Kitchen',
    icon: Layers,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10 border-amber-500/30',
  },
  packaging: {
    label: 'Packed & QC',
    icon: Box,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10 border-purple-500/30',
  },
  packaged: {
    label: 'Packed & QC',
    icon: Box,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10 border-purple-500/30',
  },
  completed: {
    label: 'Ready',
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
  },
  ready_for_dispatch: {
    label: 'Ready',
    icon: Truck,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
  },
};

export const AdminProduction: React.FC = () => {
  const {
    products,
    branches,
    orders,
    productionBatches,
    madeToOrderDemand,
    updateOrderProductionStage,
    produceForOrder,
    approveOrder,
    addProduct,
    updateProduct,
    deleteProduct,
    themeMode,
  } = useData();

  const [activeSubTab, setActiveSubTab] = useState<'pipeline' | 'demand' | 'catalog'>('pipeline');
  const [inspectedOrderId, setInspectedOrderId] = useState<string | null>(null);
  const inspectedOrder = orders.find(order => order.id === inspectedOrderId);

  // Safeguard modal state
  const [safeguardDetails, setSafeguardDetails] = useState<ProductionSafeguardDetails | null>(null);

  // Product modal state
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formFlavor, setFormFlavor] = useState('');
  const [formName, setFormName] = useState('Gourmet Marshmallow');
  const [formPrice, setFormPrice] = useState<number>(149);
  const [formStock, setFormStock] = useState<number>(300);

  const isDark = themeMode === 'dark';

  // Computed summary metrics
  const totalRequisitionUnits = madeToOrderDemand.reduce((sum, d) => sum + d.requestedUnits, 0);
  const totalInProductionUnits = madeToOrderDemand.reduce((sum, d) => sum + d.inProductionUnits, 0);
  const totalBufferUnits = products.reduce((sum, p) => sum + p.adminStock, 0);
  const activeMTOOrders = orders.filter(
    (o) => o.status !== 'rejected' && !o.isArchived && !o.isDispatched && o.status !== 'completed'
  );
  const activeInProductionOrdersCount = activeMTOOrders.filter(
    (o) => o.productionStage === 'in_kettle' || o.productionStage === 'curing' || o.productionStage === 'packaging'
  ).length;

  const handleOpenNewProduct = () => {
    setEditingProduct(null);
    setFormFlavor('');
    setFormName('Gourmet Marshmallow');
    setFormPrice(149);
    setFormStock(200);
    setShowProductModal(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setFormFlavor(prod.flavor);
    setFormName(prod.name);
    setFormPrice(prod.price);
    setFormStock(prod.adminStock);
    setShowProductModal(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFlavor.trim()) return;

    if (editingProduct) {
      updateProduct({
        ...editingProduct,
        flavor: formFlavor.trim(),
        name: formName.trim(),
        price: Number(formPrice),
        adminStock: Number(formStock),
      });
    } else {
      addProduct(formName.trim(), formFlavor.trim(), Number(formPrice), Number(formStock));
    }
    setShowProductModal(false);
  };

  const handleStageDropdownChange = (
    ord: (typeof orders)[0],
    targetStage: CompactProductionStage
  ) => {
    const currentCompact = getCompactStage(ord.productionStage);
    if (targetStage === currentCompact) return;

    const totalUnits = ord.items.reduce((sum, i) => sum + i.quantity, 0);
    const isApproved = ord.status === 'approved';
    const hasProof = Boolean(ord.proofImagePath && ord.proofImagePath.trim() !== '');
    const isBatchingEligible = paymentReady(ord);
    if (!isBatchingEligible) return;

    if (targetStage === 'queued') {
      setSafeguardDetails({
        isOpen: true,
        type: 'advance_stage',
        title: `Cannot Revert to Queued Stage`,
        confirmQuestion: `Order #${ord.id} has already progressed past Queued. Production stages move forward sequentially for food safety and traceability.`,
        branchName: ord.branchName,
        orderId: ord.id,
        fromStage: getCompactLabel(ord.productionStage),
        toStage: 'Queued',
        isInfoOnly: true,
      });
      return;
    }

    if (targetStage === 'in_kettle') {
      setSafeguardDetails({
        isOpen: true,
        type: 'advance_stage',
        title: `Move Order #${ord.id} to In-Kitchen?`,
        confirmQuestion: `Are you sure about this action? Advancing Order #${ord.id} (${ord.branchName}) will schedule commissary resources and move this requisition into In-Kitchen production.`,
        warningNotice: !isBatchingEligible
          ? `Notice: This requisition is currently ${!isApproved ? 'under review / pending approval' : 'awaiting payment verification'}. Proceeding will mark the order as authorized for commissary production.`
          : undefined,
        confirmText: "Yes, I'm sure — Move to In-Kitchen",
        branchName: ord.branchName,
        orderId: ord.id,
        fromStage: 'Queued',
        toStage: 'In-Kitchen',
        onConfirm: () => updateOrderProductionStage(ord.id, 'in_kettle', undefined, false),
      });
      return;
    }

    if (targetStage === 'packaging') {
      if (currentCompact === 'queued') {
        setSafeguardDetails({
          isOpen: true,
          type: 'advance_stage',
          title: `In-Kitchen Production Required First`,
          confirmQuestion: `Order #${ord.id} is still queued. Confectionery kitchen production must take place before packaging and quality inspection.`,
          branchName: ord.branchName,
          orderId: ord.id,
          fromStage: 'Queued',
          toStage: 'Packed & QC',
          isInfoOnly: true,
        });
        return;
      }

      setSafeguardDetails({
        isOpen: true,
        type: 'advance_stage',
        title: `Advance Order #${ord.id} to Packed & QC?`,
        confirmQuestion: `Are you sure about this action? Advancing to Packed & QC confirms that confectionery cooking is completed and units are ready for sealing, labeling, and quality verification.`,
        confirmText: "Yes, I'm sure — Move to Packed & QC",
        branchName: ord.branchName,
        orderId: ord.id,
        fromStage: 'In-Kitchen',
        toStage: 'Packed & QC',
        onConfirm: () => updateOrderProductionStage(ord.id, 'packaging', undefined, false),
      });
      return;
    }

    if (targetStage === 'ready_for_dispatch') {
      if (currentCompact === 'queued' || currentCompact === 'in_kettle') {
        setSafeguardDetails({
          isOpen: true,
          type: 'advance_stage',
          title: `Packaging & QC Required First`,
          confirmQuestion: `Order #${ord.id} must complete kitchen production, packaging, and quality inspection before it can be marked ready for logistics dispatch.`,
          branchName: ord.branchName,
          orderId: ord.id,
          fromStage: getCompactLabel(ord.productionStage),
          toStage: 'Ready',
          isInfoOnly: true,
        });
        return;
      }

      setSafeguardDetails({
        isOpen: true,
        type: 'advance_stage',
        title: `Mark Order #${ord.id} Ready for Dispatch?`,
        confirmQuestion: `Are you sure about this action? Marking Ready will immediately broadcast a real-time dispatch alert to Logistics & Fleet Management to generate J&T Express waybills or fleet delivery assignment.`,
        confirmText: "Yes, I'm sure — Ready for Dispatch",
        branchName: ord.branchName,
        orderId: ord.id,
        fromStage: 'Packed & QC',
        toStage: 'Ready',
        onConfirm: () => updateOrderProductionStage(ord.id, 'ready_for_dispatch', undefined, false),
      });
      return;
    }
  };

  return (
    <div className="space-y-6">
      {inspectedOrder && <CommissaryRequisitionInspect
        key={inspectedOrder.id}
        order={inspectedOrder}
        batches={productionBatches.filter(batch => batch.targetOrderId === inspectedOrder.id)}
        stageLabel={getCompactLabel(inspectedOrder.productionStage)}
        onClose={() => setInspectedOrderId(null)}
      />}
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 dark:text-white flex items-center space-x-2">
            <Layers className="w-6 h-6 text-[#F37021] shrink-0" />
            <span>Central Commissary & Production Matrix</span>
          </h1>
          <p className="text-xs text-neutral-500 font-medium mt-0.5 max-w-2xl">
            Commissary production tracking, finished buffer reserves, and master flavor formulas. Production is driven by made-to-order branch requisitions.
          </p>
        </div>

        {/* Responsive Action Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto shrink-0">
          <CommissarySummary />
          <button
            type="button"
            onClick={handleOpenNewProduct}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#F37021] text-white text-xs sm:text-sm font-bold shadow-md hover:bg-[#d85e15] active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>+ New Flavor Recipe</span>
          </button>
        </div>
      </div>

      {/* Made-to-Order Top Performance Metrics - Responsive 2x2 grid on mobile/tablet to 4-col on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all flex flex-col justify-between ${
          isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-orange-500/20 shadow-xs'
        }`}>
          <div>
            <div className="flex items-center justify-between text-neutral-400 mb-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Branch Demand</span>
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F37021] shrink-0 ml-1" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-[#F37021] tracking-tight">
              {totalRequisitionUnits} <span className="text-[11px] sm:text-xs font-medium text-neutral-400">units</span>
            </p>
          </div>
          <p className="text-[10px] sm:text-[11px] text-neutral-500 mt-1.5 truncate">
            {activeMTOOrders.length} active requisitions
          </p>
        </div>

        <div className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all flex flex-col justify-between ${
          isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-amber-500/20 shadow-xs'
        }`}>
          <div>
            <div className="flex items-center justify-between text-neutral-400 mb-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">In Production</span>
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0 ml-1" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-amber-500 tracking-tight">
              {totalInProductionUnits} <span className="text-[11px] sm:text-xs font-medium text-neutral-400">units</span>
            </p>
          </div>
          <p className="text-[10px] sm:text-[11px] text-neutral-500 mt-1.5 truncate">
            {activeInProductionOrdersCount} requisitions processing
          </p>
        </div>

        <div className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all flex flex-col justify-between ${
          isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-sky-500/20 shadow-xs'
        }`}>
          <div>
            <div className="flex items-center justify-between text-neutral-400 mb-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Commissary Buffer</span>
              <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#80C7F2] shrink-0 ml-1" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-[#80C7F2] tracking-tight">
              {totalBufferUnits} <span className="text-[11px] sm:text-xs font-medium text-neutral-400">units</span>
            </p>
          </div>
          <p className="text-[10px] sm:text-[11px] text-neutral-500 mt-1.5 truncate">
            {products.length} master flavor recipes
          </p>
        </div>

        <div className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all flex flex-col justify-between ${
          isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-emerald-500/20 shadow-xs'
        }`}>
          <div>
            <div className="flex items-center justify-between text-neutral-400 mb-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Fulfillment Rate</span>
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0 ml-1" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-emerald-500 tracking-tight">100%</p>
          </div>
          <p className="text-[10px] sm:text-[11px] text-neutral-500 mt-1.5 truncate">
            Demand-driven fulfillment • Zero stale stock
          </p>
        </div>
      </div>

      {/* Production Navigation Subtabs (Responsive Scrollable with smooth snapping) */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 pb-2.5 sm:pb-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-0.5 -mx-1 px-1 sm:mx-0 sm:px-0">
          <button
            onClick={() => setActiveSubTab('pipeline')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-1.5 sm:space-x-2 shrink-0 whitespace-nowrap transition-all cursor-pointer ${
              activeSubTab === 'pipeline'
                ? 'bg-[#F37021] text-white shadow-xs'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            <Building2 className="w-4 h-4 shrink-0" />
            <span>Branch Requisitions ({activeMTOOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('demand')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-1.5 sm:space-x-2 shrink-0 whitespace-nowrap transition-all cursor-pointer ${
              activeSubTab === 'demand'
                ? 'bg-[#F37021] text-white shadow-xs'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            <TrendingUp className="w-4 h-4 shrink-0" />
            <span>Flavor Demand Matrix</span>
          </button>

          <button
            onClick={() => setActiveSubTab('catalog')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-1.5 sm:space-x-2 shrink-0 whitespace-nowrap transition-all cursor-pointer ${
              activeSubTab === 'catalog'
                ? 'bg-[#F37021] text-white shadow-xs'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            <Package className="w-4 h-4 shrink-0" />
            <span>Commissary Catalog & Buffer</span>
          </button>
        </div>
      </div>

      {/* SUBTAB 1: Branch Requisitions Pipeline */}
      {activeSubTab === 'pipeline' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <h2 className="text-base font-bold">MTO Branch Requisitions</h2>
            <span className="text-xs text-neutral-500 font-medium">
              Requisitions advance through commissary production, packaging, and quality control upon approval.
            </span>
          </div>

          {activeMTOOrders.length === 0 ? (
            <div className={`p-12 text-center rounded-3xl border ${
              isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200'
            }`}>
              <ShoppingBag className="w-12 h-12 text-neutral-400 mx-auto mb-3 opacity-60" />
              <p className="text-sm font-bold">No branch requisitions in queue</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeMTOOrders.map((ord) => {
                const stage = ord.productionStage || 'queued';
                const totalUnits = ord.items.reduce((sum, i) => sum + i.quantity, 0);
                const isApproved = ord.status === 'approved';
                const hasProof = Boolean(ord.proofImagePath && ord.proofImagePath.trim() !== '');
                const isBatchingEligible = paymentReady(ord);

                return (
                  <div
                    key={ord.id}
                    className={`p-4 sm:p-5 rounded-3xl border transition-all ${
                      isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Order Info */}
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-base">{ord.branchName}</span>
                          <span className="font-mono text-xs text-neutral-400">#{ord.id}</span>
                          {ord.batchCode && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#80C7F2]/15 text-[#1a7bb5] dark:text-[#80C7F2] border border-[#80C7F2]/30">
                              Lot: {ord.batchCode}
                            </span>
                          )}
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            ord.status === 'approved'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          }`}>
                            {ord.status === 'waitingApproval' ? 'Under Review' : ord.status}
                          </span>
                        </div>

                        {/* Items list */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {ord.items.map((it, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 font-semibold"
                            >
                              <strong>{it.quantity}x</strong> {it.productName.split('(')[0]}
                            </span>
                          ))}
                          <span className="text-neutral-400">({totalUnits} total units)</span>
                        </div>

                        {/* Production Prerequisites Warning if not eligible */}
                        {!isBatchingEligible && (
                          <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Production Locked: {!isApproved ? 'Requires order approval' : 'Verified payment required'} before commissary processing.</span>
                          </div>
                        )}

                        {/* Estimated Ready */}
                        {ord.estimatedReadyDate && (
                          <p className="text-xs text-neutral-500 flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                            <span>Estimated Dispatch Ready: <strong className="text-neutral-700 dark:text-neutral-300">{ord.estimatedReadyDate}</strong></span>
                          </p>
                        )}
                      </div>

                      {/* Stage Progression Controls */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                        <button type="button" onClick={() => setInspectedOrderId(ord.id)} aria-haspopup="dialog" aria-label={`Inspect requisition ${ord.id} for ${ord.branchName}`} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-neutral-100 px-4 py-2.5 text-xs font-bold text-neutral-800 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700">
                          Inspect <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                        {/* Dropdown Short & Punchy (Compact UI): Queued, In-Kitchen, Packed & QC, Ready */}
                        <div className="flex items-center space-x-2 bg-neutral-100 dark:bg-neutral-800/80 p-1.5 px-3 rounded-2xl border border-neutral-200 dark:border-neutral-700">
                          <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500 whitespace-nowrap">
                            Stage:
                          </span>
                          <div className="relative inline-flex items-center min-w-[130px]">
                            <select
                              disabled={!isBatchingEligible}
                              value={getCompactStage(ord.productionStage)}
                              onChange={(e) => handleStageDropdownChange(ord, e.target.value as CompactProductionStage)}
                              className={`w-full appearance-none pl-3 pr-8 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-[#F37021]/50 ${
                                COMPACT_STAGE_OPTIONS.find((s) => s.value === getCompactStage(ord.productionStage))?.badgeStyle || ''
                              }`}
                              aria-label="Production Pipeline Stage"
                            >
                              <option value="queued" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-semibold">
                                Queued
                              </option>
                              <option value="in_kettle" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-semibold">
                                In-Kitchen
                              </option>
                              <option value="packaging" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-semibold">
                                Packed & QC
                              </option>
                              <option value="ready_for_dispatch" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-semibold">
                                Ready
                              </option>
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 pointer-events-none text-current opacity-70" />
                          </div>
                        </div>

                        {stage === 'queued' && (
                          <button
                            disabled={!isBatchingEligible}
                            type="button"
                            onClick={() => {
                              if (!isBatchingEligible) return;
                              setSafeguardDetails({
                                isOpen: true,
                                type: 'send_to_kitchen',
                                title: `Dispatch Requisition to Production?`,
                                confirmQuestion: `Are you sure about this action? This will schedule commissary resources and dispatch production for Order #${ord.id} (${ord.branchName}) at the central commissary.`,
                                confirmText: "Yes, Dispatch to Production",
                                branchName: ord.branchName,
                                orderId: ord.id,
                                quantity: totalUnits,
                                onConfirm: () => produceForOrder(ord.id),
                              });
                            }}
                            className={`w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                              isBatchingEligible
                                ? 'bg-gradient-to-r from-[#F37021] to-amber-500 text-white hover:opacity-95'
                                : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                            }`}
                            title="Dispatch order to commissary production"
                          >
                            <Play className="w-3.5 h-3.5 shrink-0" />
                            <span>Dispatch to Production</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: Flavor Demand Matrix */}
      {activeSubTab === 'demand' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold">Made-to-Order Flavor Demand vs Commissary Buffer</h2>
            <p className="text-xs text-neutral-500">
              Live calculation of units requested by branch requisitions versus commissary buffer and active production.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {madeToOrderDemand.map((d) => {
              const netBalance = d.inProductionUnits + d.readyBufferUnits - d.requestedUnits;
              const isCovered = netBalance >= 0;

              return (
                <div
                  key={d.productId}
                  className={`p-5 rounded-3xl border transition-all flex flex-col justify-between ${
                    isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#80C7F2]/15 text-[#1a7bb5] dark:text-[#80C7F2]">
                        Gourmet Flavor
                      </span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        ₱{d.unitPrice} SRP
                      </span>
                    </div>

                    <h3 className="text-base font-black mt-2 leading-snug">{d.flavor}</h3>

                    <div className="mt-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500">Branch MTO Demand:</span>
                        <strong className="text-[#F37021]">{d.requestedUnits} units</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500">In Live Production:</span>
                        <strong className="text-amber-500">{d.inProductionUnits} units</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500">Commissary Buffer:</span>
                        <strong className="text-neutral-900 dark:text-white">{d.readyBufferUnits} units</strong>
                      </div>

                      <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                        <span className="text-neutral-500">Fulfillment Status:</span>
                        <span className={`font-bold ${isCovered ? 'text-emerald-500' : 'text-red-500'}`}>
                          {isCovered ? `✓ Covered (+${netBalance} buffer)` : `⚠️ Needs ${Math.abs(netBalance)} units`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                    <button
                      type="button"
                      onClick={() => setActiveSubTab('pipeline')}
                      className="w-full py-2 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-[#F37021]/15 hover:text-[#F37021] text-xs font-bold transition-all text-center flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>View Branch Requisitions ({d.pendingOrderIds.length})</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 3: Commissary Catalog & Buffer Stock */}
      {activeSubTab === 'catalog' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold">Commissary Catalog & Finished Stock Buffer</h2>
              <p className="text-xs text-neutral-500">
                Manage flavor formulas, retail pricing, and commissary buffer inventory levels.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenNewProduct}
              className="px-3.5 py-2 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 text-xs font-bold hover:border-[#80C7F2] hover:text-[#80C7F2] transition-all cursor-pointer"
            >
              + Add New Flavor
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((prod) => {
              const isLowStock = prod.adminStock < 150;
              return (
                <div
                  key={prod.id}
                  className={`p-5 rounded-3xl border transition-all flex flex-col justify-between ${
                    isDark
                      ? 'bg-[#161616] border-neutral-800 hover:border-neutral-700'
                      : 'bg-white border-[#80C7F2]/20 hover:border-[#80C7F2]/60 shadow-xs'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#80C7F2]/15 text-[#1a7bb5] dark:text-[#80C7F2]">
                        {prod.name}
                      </span>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditProduct(prod)}
                          className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                          title="Edit Product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSafeguardDetails({
                              isOpen: true,
                              type: 'delete_product',
                              title: `Delete Gourmet Flavor "${prod.flavor}"?`,
                              flavor: prod.flavor,
                              currentBufferStock: prod.adminStock,
                              onConfirm: () => deleteProduct(prod.id),
                            });
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-neutral-400 hover:text-red-500 cursor-pointer"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-base font-black mt-2 leading-snug">
                      {prod.flavor}
                    </h3>
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                      ₱{prod.price} SRP
                    </p>

                    {/* Central Commissary Stock Bar */}
                    <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span className="text-neutral-500">Central Buffer Stock</span>
                        <span className={isLowStock ? 'text-amber-500' : 'text-neutral-900 dark:text-white'}>
                          {prod.adminStock} units
                        </span>
                      </div>
                      <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isLowStock ? 'bg-amber-500' : 'bg-gradient-to-r from-[#80C7F2] to-[#F37021]'
                          }`}
                          style={{ width: `${Math.min(100, (prod.adminStock / 600) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-1">
                        {isLowStock ? '⚠️ High replenishment priority' : '✓ Normal production reserve'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center">
                    <button
                      type="button"
                      onClick={() => handleOpenEditProduct(prod)}
                      className="w-full py-2 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-[#80C7F2]/20 hover:text-[#1a7bb5] dark:hover:text-[#80C7F2] text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center space-x-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Recipe & Stock Buffer</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {showProductModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
          onClick={() => setShowProductModal(false)}
        >
          <div
            className={`relative w-full max-w-md max-h-[88vh] flex flex-col rounded-3xl shadow-2xl border overflow-hidden my-auto ${
              isDark ? 'bg-[#1c1c1c] border-neutral-700 text-white' : 'bg-white border-neutral-200 text-neutral-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="shrink-0 p-5 sm:p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold">
                  {editingProduct ? 'Edit Gourmet Flavor' : 'Add New Gourmet Flavor'}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Configure product details and central commissary inventory.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer shrink-0 ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto flex flex-col">
              <div className="p-5 sm:p-6 space-y-3.5 text-xs flex-1">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-neutral-400 mb-1">
                    Flavor Name / Ingredients
                  </label>
                  <input
                    type="text"
                    required
                    value={formFlavor}
                    onChange={(e) => setFormFlavor(e.target.value)}
                    placeholder="e.g. Pistachio Ganache & Fluff"
                    className={`w-full p-2.5 rounded-xl border ${
                      isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-neutral-50 border-neutral-200'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-neutral-400 mb-1">
                    Product Category Title
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Gourmet Marshmallow"
                    className={`w-full p-2.5 rounded-xl border ${
                      isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-neutral-50 border-neutral-200'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-neutral-400 mb-1">
                      Price (₱)
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formPrice}
                      onChange={(e) => setFormPrice(Number(e.target.value))}
                      className={`w-full p-2.5 rounded-xl border ${
                        isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-neutral-50 border-neutral-200'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold uppercase tracking-wider text-neutral-400 mb-1">
                      Commissary Buffer Stock
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={formStock}
                      onChange={(e) => setFormStock(Number(e.target.value))}
                      className={`w-full p-2.5 rounded-xl border ${
                        isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-neutral-50 border-neutral-200'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Sticky Action Footer */}
              <div className="shrink-0 p-4 sm:p-5 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 font-medium rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold rounded-xl bg-[#F37021] text-white hover:bg-[#d85e15] text-xs cursor-pointer shadow-xs"
                >
                  Save Flavor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Production & Stock Allocation Safeguard Confirmation Modal */}
      <ProductionSafeguardModal
        details={safeguardDetails}
        themeMode={themeMode}
        onClose={() => setSafeguardDetails(null)}
      />
    </div>
  );
};
