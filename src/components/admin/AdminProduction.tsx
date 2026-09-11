import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Product, BatchStage, ProductionStage, ProductionBatch } from '../../types';
import {
  Package,
  Plus,
  ArrowRightLeft,
  Sparkles,
  Layers,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ChefHat,
  Clock,
  Flame,
  Snowflake,
  Box,
  Truck,
  Building2,
  ArrowRight,
  TrendingUp,
  ShoppingBag,
  Filter,
} from 'lucide-react';
import {
  ProductionSafeguardModal,
  ProductionSafeguardDetails,
} from '../safeguards/ProductionSafeguardModal';

const STAGE_LABELS: Record<string, { label: string; icon: React.FC<{ className?: string }>; color: string; bg: string }> = {
  in_kettle: {
    label: 'Kettle, Whip & Curing (Consolidated)',
    icon: Flame,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10 border-amber-500/30',
  },
  curing: {
    label: 'Kettle, Whip & Curing (Consolidated)',
    icon: Flame,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10 border-amber-500/30',
  },
  packaging: {
    label: 'Packaging & Quality Control',
    icon: Box,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10 border-purple-500/30',
  },
  packaged: {
    label: 'Packaging & Quality Control',
    icon: Box,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10 border-purple-500/30',
  },
  completed: {
    label: 'Finished / Ready for Dispatch',
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
  },
  ready_for_dispatch: {
    label: 'Finished / Ready for Dispatch',
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
    logProduction,
    logProductionBatch,
    updateBatchStage,
    updateOrderProductionStage,
    produceForOrder,
    addProductionStock,
    addProduct,
    updateProduct,
    deleteProduct,
    themeMode,
  } = useData();

  const [activeSubTab, setActiveSubTab] = useState<'pipeline' | 'batches' | 'demand' | 'catalog'>('pipeline');
  const [batchStageFilter, setBatchStageFilter] = useState<string>('all');

  // Safeguard modal state
  const [safeguardDetails, setSafeguardDetails] = useState<ProductionSafeguardDetails | null>(null);

  // Modals state
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [productionQty, setProductionQty] = useState<number>(100);
  const [selectedChef, setSelectedChef] = useState('Chef Dante (Head Confectioner)');
  const [batchNotes, setBatchNotes] = useState('Made-to-order artisanal batch');

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferBranchId, setTransferBranchId] = useState<string>(branches[0]?.id || '');
  const [transferProductId, setTransferProductId] = useState<string>(products[0]?.id || '');
  const [transferQty, setTransferQty] = useState<number>(20);
  const [transferError, setTransferError] = useState<string | null>(null);

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
  const activeBatchesCount = productionBatches.filter((b) => b.stage !== 'completed').length;
  const activeMTOOrders = orders.filter(
    (o) => o.status !== 'rejected' && !o.isArchived && !o.isDispatched && o.status !== 'completed'
  );

  const filteredBatches = productionBatches.filter((b) => {
    if (batchStageFilter === 'all') return true;
    if (batchStageFilter === 'cooking') return b.stage === 'in_kettle' || b.stage === 'curing';
    if (batchStageFilter === 'packaging') return b.stage === 'packaging';
    if (batchStageFilter === 'completed') return b.stage === 'completed';
    return b.stage === batchStageFilter;
  });

  const handleStartCustomBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || productionQty <= 0) return;

    const prod = products.find((p) => p.id === selectedProductId);
    const flavorName = prod?.flavor || 'Gourmet Marshmallow';

    // Trigger safeguard alert modal to confirm action
    setSafeguardDetails({
      isOpen: true,
      type: 'cook_batch',
      title: 'Start Confectionery Kitchen Batch?',
      flavor: flavorName,
      quantity: Number(productionQty),
      chefName: selectedChef,
      notes: batchNotes,
      onConfirm: () => {
        logProductionBatch({
          productId: selectedProductId,
          quantity: Number(productionQty),
          chefName: selectedChef,
          stage: 'in_kettle',
          notes: batchNotes,
        });
        setShowLogModal(false);
        setProductionQty(100);
      },
    });
  };

  const handleTransferStock = (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError(null);

    const prod = products.find((p) => p.id === transferProductId);
    const branch = branches.find((b) => b.id === transferBranchId);
    const qty = Number(transferQty);

    if (!prod || !branch || qty <= 0) return;

    if (qty > prod.adminStock) {
      setTransferError(`Insufficient commissary buffer! Only ${prod.adminStock} units available.`);
      return;
    }

    // Trigger safeguard alert modal to confirm action
    setSafeguardDetails({
      isOpen: true,
      type: 'allocate_stock',
      title: 'Confirm Branch Stock Transfer?',
      flavor: prod.flavor,
      quantity: qty,
      branchName: `${branch.name} (${branch.location})`,
      currentBufferStock: prod.adminStock,
      remainingBufferStock: prod.adminStock - qty,
      onConfirm: () => {
        try {
          addProductionStock(transferBranchId, transferProductId, qty);
          setShowTransferModal(false);
          setTransferQty(20);
        } catch (err: any) {
          setTransferError(err.message || 'Transfer failed');
        }
      },
    });
  };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#F37021] mb-1">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>Made-to-Order Confectionery Management</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
            Central Commissary & Production Batches
          </h1>
          <p className="text-xs text-neutral-500 font-medium mt-0.5 max-w-2xl">
            Production is driven by made-to-order branch requisitions. Track live kettle whips, curing slabs, and dispatch readiness.
          </p>
        </div>

        {/* Responsive Action Buttons with Safeguard Confirmations */}
        <div className="flex flex-col xs:flex-row sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={() => setShowLogModal(true)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#F37021] text-white text-xs sm:text-sm font-bold shadow-md hover:bg-[#d85e15] active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Flame className="w-4 h-4 shrink-0" />
            <span>+ Cook MTO Batch</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTransferError(null);
              setShowTransferModal(true);
            }}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-750 active:scale-98 transition-all flex items-center justify-center space-x-2 shadow-xs cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4 text-[#80C7F2] shrink-0" />
            <span>Branch Stock Allocation</span>
          </button>
        </div>
      </div>

      {/* Made-to-Order Top Performance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${
          isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-orange-500/20 shadow-xs'
        }`}>
          <div className="flex items-center justify-between text-neutral-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Branch Demand</span>
            <ShoppingBag className="w-4 h-4 text-[#F37021]" />
          </div>
          <p className="text-2xl font-black text-[#F37021]">{totalRequisitionUnits} <span className="text-xs font-medium text-neutral-400">units</span></p>
          <p className="text-[11px] text-neutral-500 mt-1">Made-to-order requests from branches</p>
        </div>

        <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${
          isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-amber-500/20 shadow-xs'
        }`}>
          <div className="flex items-center justify-between text-neutral-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Live In-Kettle & Curing</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-500">{totalInProductionUnits} <span className="text-xs font-medium text-neutral-400">units</span></p>
          <p className="text-[11px] text-neutral-500 mt-1">{activeBatchesCount} live cooking batches active</p>
        </div>

        <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${
          isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-sky-500/20 shadow-xs'
        }`}>
          <div className="flex items-center justify-between text-neutral-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Commissary Buffer</span>
            <Package className="w-4 h-4 text-[#80C7F2]" />
          </div>
          <p className="text-2xl font-black text-[#80C7F2]">{totalBufferUnits} <span className="text-xs font-medium text-neutral-400">units</span></p>
          <p className="text-[11px] text-neutral-500 mt-1">HQ finished buffer for urgent restocks</p>
        </div>

        <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${
          isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-emerald-500/20 shadow-xs'
        }`}>
          <div className="flex items-center justify-between text-neutral-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">MTO Efficiency</span>
            <ChefHat className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-500">100%</p>
          <p className="text-[11px] text-neutral-500 mt-1">Zero stale stock • Freshly whipped</p>
        </div>
      </div>

      {/* Production Navigation Subtabs (Responsive Scrollable with smooth snapping) */}
      <div className="flex items-center space-x-2 border-b border-neutral-200 dark:border-neutral-800 pb-3 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveSubTab('pipeline')}
          className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 shrink-0 whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'pipeline'
              ? 'bg-[#F37021] text-white shadow-xs'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
          }`}
        >
          <Building2 className="w-4 h-4 shrink-0" />
          <span>Branch Requisitions Pipeline ({activeMTOOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('batches')}
          className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 shrink-0 whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'batches'
              ? 'bg-[#F37021] text-white shadow-xs'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
          }`}
        >
          <Flame className="w-4 h-4 shrink-0" />
          <span>Live Kitchen Batches ({productionBatches.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('demand')}
          className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 shrink-0 whitespace-nowrap transition-all cursor-pointer ${
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
          className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 shrink-0 whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'catalog'
              ? 'bg-[#F37021] text-white shadow-xs'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
          }`}
        >
          <Package className="w-4 h-4 shrink-0" />
          <span>Commissary Catalog & Buffer</span>
        </button>
      </div>

      {/* SUBTAB 1: Branch Requisitions Pipeline */}
      {activeSubTab === 'pipeline' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <h2 className="text-base font-bold">Made-to-Order Branch Requisitions</h2>
            <span className="text-xs text-neutral-500 font-medium">
              Orders automatically create kitchen production batches upon approval or kitchen dispatch.
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
                const isBatchingEligible = isApproved && hasProof;

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
                              Batch: {ord.batchCode}
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

                        {/* Batching Prerequisites Warning if not eligible */}
                        {!isBatchingEligible && (
                          <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Batching Locked: {!isApproved ? 'Requires order approval' : 'Payment proof required'} before commissary batching.</span>
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
                        <div className="flex flex-wrap items-center gap-1 bg-neutral-100 dark:bg-neutral-800/80 p-1.5 rounded-2xl border border-neutral-200 dark:border-neutral-700">
                          <button
                            type="button"
                            onClick={() => updateOrderProductionStage(ord.id, 'queued')}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                              stage === 'queued'
                                ? 'bg-white dark:bg-neutral-900 shadow-xs text-neutral-900 dark:text-white'
                                : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                            }`}
                          >
                            1. Queued
                          </button>
                          <button
                            type="button"
                            disabled={!isBatchingEligible}
                            onClick={() => {
                              setSafeguardDetails({
                                isOpen: true,
                                type: 'advance_stage',
                                title: `Move Order #${ord.id} to Boiling & Curing?`,
                                branchName: ord.branchName,
                                orderId: ord.id,
                                fromStage: 'Queued',
                                toStage: 'Kettle, Whip & Curing',
                                onConfirm: () => updateOrderProductionStage(ord.id, 'in_kettle'),
                              });
                            }}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                              stage === 'in_kettle' || stage === 'curing'
                                ? 'bg-amber-500 text-white shadow-xs'
                                : isBatchingEligible
                                ? 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                                : 'text-neutral-300 dark:text-neutral-600 cursor-not-allowed opacity-50'
                            }`}
                            title={!isBatchingEligible ? 'Order must be approved with verified payment proof' : 'Move to Kettle, Whip & Curing'}
                          >
                            2. Kettle & Cure
                          </button>
                          <button
                            type="button"
                            disabled={!isBatchingEligible}
                            onClick={() => {
                              setSafeguardDetails({
                                isOpen: true,
                                type: 'advance_stage',
                                title: `Advance Order #${ord.id} to Packaging & QC?`,
                                branchName: ord.branchName,
                                orderId: ord.id,
                                fromStage: 'Kettle & Cure',
                                toStage: 'Packaging & QC',
                                onConfirm: () => updateOrderProductionStage(ord.id, 'packaged'),
                              });
                            }}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                              stage === 'packaged'
                                ? 'bg-purple-500 text-white shadow-xs'
                                : isBatchingEligible
                                ? 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                                : 'text-neutral-300 dark:text-neutral-600 cursor-not-allowed opacity-50'
                            }`}
                            title={!isBatchingEligible ? 'Order must be approved with verified payment proof' : 'Move to Packaging & QC'}
                          >
                            3. Packaging & QC
                          </button>
                          <button
                            type="button"
                            disabled={!isBatchingEligible}
                            onClick={() => {
                              setSafeguardDetails({
                                isOpen: true,
                                type: 'advance_stage',
                                title: `Mark Order #${ord.id} Ready for Dispatch?`,
                                branchName: ord.branchName,
                                orderId: ord.id,
                                fromStage: 'Packaging & QC',
                                toStage: 'Ready for Dispatch',
                                onConfirm: () => updateOrderProductionStage(ord.id, 'ready_for_dispatch'),
                              });
                            }}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                              stage === 'ready_for_dispatch' || (stage as string) === 'ready'
                                ? 'bg-emerald-500 text-white shadow-xs'
                                : isBatchingEligible
                                ? 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                                : 'text-neutral-300 dark:text-neutral-600 cursor-not-allowed opacity-50'
                            }`}
                            title={!isBatchingEligible ? 'Order must be approved with verified payment proof' : 'Mark Ready for Dispatch'}
                          >
                            4. Ready for Dispatch
                          </button>
                        </div>

                        {stage === 'queued' && (
                          <button
                            type="button"
                            disabled={!isBatchingEligible}
                            onClick={() => {
                              setSafeguardDetails({
                                isOpen: true,
                                type: 'send_to_kitchen',
                                title: `Send Requisition to Live Kitchen Stoves?`,
                                branchName: ord.branchName,
                                orderId: ord.id,
                                quantity: totalUnits,
                                onConfirm: () => {
                                  try {
                                    produceForOrder(ord.id);
                                  } catch (err: any) {
                                    alert(err.message || 'Cannot start kitchen production');
                                  }
                                },
                              });
                            }}
                            className={`w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center justify-center space-x-1.5 transition-all ${
                              isBatchingEligible
                                ? 'bg-gradient-to-r from-[#F37021] to-amber-500 text-white hover:opacity-95 cursor-pointer'
                                : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed border border-neutral-300 dark:border-neutral-700'
                            }`}
                            title={!isBatchingEligible ? 'Order must be approved with verified payment proof before commissary batching.' : 'Send to Kitchen'}
                          >
                            <Flame className="w-3.5 h-3.5 shrink-0" />
                            <span>🔥 Send to Kitchen</span>
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

      {/* SUBTAB 2: Live Kitchen Batches */}
      {activeSubTab === 'batches' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">Confectionery Kitchen Batch Tracker</h2>
              <p className="text-xs text-neutral-500">
                Track each artisan batch from syrup boiling, whipping, starch slab curing, to final pouching.
              </p>
            </div>

            {/* Stage filter pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: 'all', label: 'All Batches' },
                { id: 'cooking', label: '1. Kettle, Whip & Cure' },
                { id: 'packaging', label: '2. Packaging & QC' },
                { id: 'completed', label: '3. Finished / Ready' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setBatchStageFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    batchStageFilter === f.id
                      ? 'bg-[#F37021] text-white shadow-xs'
                      : isDark
                      ? 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filteredBatches.length === 0 ? (
            <div className={`p-12 text-center rounded-3xl border ${
              isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200'
            }`}>
              <Flame className="w-12 h-12 text-neutral-400 mx-auto mb-3 opacity-60" />
              <p className="text-sm font-bold">No batches matching this filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBatches.map((batch) => {
                const stageInfo = STAGE_LABELS[batch.stage] || STAGE_LABELS.in_kettle;
                const StageIcon = stageInfo.icon;

                return (
                  <div
                    key={batch.id}
                    className={`p-5 rounded-3xl border transition-all flex flex-col justify-between ${
                      isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
                    }`}
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#80C7F2]/15 text-[#1a7bb5] dark:text-[#80C7F2] border border-[#80C7F2]/30">
                          {batch.batchCode}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center space-x-1 ${stageInfo.bg} ${stageInfo.color}`}>
                          <StageIcon className="w-3 h-3 shrink-0" />
                          <span>{stageInfo.label.split('(')[0].trim()}</span>
                        </span>
                      </div>

                      <h3 className="text-base font-black mt-2.5 leading-snug">{batch.productFlavor}</h3>
                      <p className="text-xs font-bold text-neutral-400 mt-0.5">
                        Output: <strong className="text-neutral-900 dark:text-white">{batch.quantity} Units</strong>
                      </p>

                      {/* Details Box */}
                      <div className="mt-3 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800 text-xs space-y-1">
                        <p className="text-neutral-500">
                          Assigned: <strong className="text-neutral-700 dark:text-neutral-300">{batch.chefName}</strong>
                        </p>
                        {batch.targetBranchName && (
                          <p className="text-neutral-500">
                            Requisition: <strong className="text-neutral-700 dark:text-neutral-300">{batch.targetBranchName}</strong>
                          </p>
                        )}
                        <p className="text-[11px] text-neutral-400">
                          Started: {new Date(batch.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(batch.startedAt).toLocaleDateString()}
                        </p>
                        {batch.notes && (
                          <p className="text-[11px] text-neutral-500 italic mt-1">{batch.notes}</p>
                        )}
                      </div>
                    </div>

                    {/* Stage Transition Control */}
                    <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-neutral-400">Advance Stage:</span>
                      <div className="flex items-center space-x-1.5">
                        {(batch.stage === 'in_kettle' || batch.stage === 'curing') && (
                          <button
                            type="button"
                            onClick={() => {
                              setSafeguardDetails({
                                isOpen: true,
                                type: 'advance_stage',
                                title: `Move Batch ${batch.batchCode} to Packaging & QC?`,
                                flavor: batch.productFlavor,
                                batchCode: batch.batchCode,
                                fromStage: 'Kettle & Cure',
                                toStage: 'Packaging & QC',
                                onConfirm: () => updateBatchStage(batch.id, 'packaging'),
                              });
                            }}
                            className="px-3 py-1.5 rounded-xl bg-purple-500 text-white text-xs font-bold hover:bg-purple-600 transition-all flex items-center space-x-1 cursor-pointer"
                          >
                            <span>Move to Packaging & QC</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                        {batch.stage === 'packaging' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSafeguardDetails({
                                isOpen: true,
                                type: 'advance_stage',
                                title: `Mark Batch ${batch.batchCode} Finished & Ready?`,
                                flavor: batch.productFlavor,
                                batchCode: batch.batchCode,
                                fromStage: 'Packaging & QC',
                                toStage: 'Finished & Ready for Dispatch',
                                onConfirm: () => updateBatchStage(batch.id, 'completed'),
                              });
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-all flex items-center space-x-1 cursor-pointer"
                          >
                            <span>Mark Finished & Ready</span>
                            <CheckCircle2 className="w-3 h-3" />
                          </button>
                        )}
                        {batch.stage === 'completed' && (
                          <span className="text-xs font-bold text-emerald-500 flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Ready for Dispatch</span>
                          </span>
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

      {/* SUBTAB 3: Flavor Demand Matrix */}
      {activeSubTab === 'demand' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold">Made-to-Order Flavor Demand vs Commissary Buffer</h2>
            <p className="text-xs text-neutral-500">
              Live calculation of units requested by branch requisitions versus batches cooking on kettle stoves.
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
                      onClick={() => {
                        setSelectedProductId(d.productId);
                        setProductionQty(d.requestedUnits > 0 ? Math.max(50, d.requestedUnits) : 100);
                        setShowLogModal(true);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-[#F37021]/10 text-[#F37021] hover:bg-[#F37021] hover:text-white text-xs font-bold transition-all text-center flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <Flame className="w-3.5 h-3.5" />
                      <span>Start Kitchen Batch for {d.flavor.split(' ')[0]}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 4: Commissary Catalog & Buffer Stock */}
      {activeSubTab === 'catalog' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold">Commissary Catalog & Finished Stock Buffer</h2>
              <p className="text-xs text-neutral-500">
                Manage flavor formulas, retail pricing, and allocate stock directly to any of the 19 franchise branches.
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

                  <div className="mt-5 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProductId(prod.id);
                        setShowLogModal(true);
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-[#80C7F2]/20 hover:text-[#1a7bb5] dark:hover:text-[#80C7F2] text-xs font-bold transition-all text-center cursor-pointer"
                    >
                      + Cook Batch
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTransferProductId(prod.id);
                        setTransferError(null);
                        setShowTransferModal(true);
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-[#F37021]/10 text-[#F37021] hover:bg-[#F37021] hover:text-white text-xs font-bold transition-all text-center cursor-pointer"
                    >
                      Allocate
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Start Production Batch Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border ${
            isDark ? 'bg-[#1c1c1c] border-neutral-700 text-white' : 'bg-white border-neutral-200 text-neutral-900'
          }`}>
            <div className="flex items-center space-x-2 text-[#F37021] mb-2">
              <Flame className="w-5 h-5" />
              <h3 className="text-base font-bold">Start Handmade MTO Batch</h3>
            </div>
            <p className="text-xs text-neutral-500">
              Initiate a fresh kettle cooking and whipping run at the Bicol commissary.
            </p>

            <form onSubmit={handleStartCustomBatch} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-neutral-400 mb-1">
                  Gourmet Flavor Recipe
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border font-semibold ${
                    isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.flavor} (Current Buffer: {p.adminStock} units)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-neutral-400 mb-1">
                  Assigned Head Confectioner
                </label>
                <select
                  value={selectedChef}
                  onChange={(e) => setSelectedChef(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border font-semibold ${
                    isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  <option value="Chef Dante (Head Confectioner)">Chef Dante (Head Confectioner)</option>
                  <option value="Chef Maria (Bicol Fluff Artisan)">Chef Maria (Bicol Fluff Artisan)</option>
                  <option value="Chef Roland (Sugar & Texture Specialist)">Chef Roland (Sugar & Texture Specialist)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-neutral-400 mb-1">
                  Batch Output Quantity (Units)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={productionQty}
                  onChange={(e) => setProductionQty(Number(e.target.value))}
                  className={`w-full p-2.5 rounded-xl border font-bold text-sm ${
                    isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-neutral-50 border-neutral-200'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-neutral-400 mb-1">
                  Batch Notes
                </label>
                <input
                  type="text"
                  value={batchNotes}
                  onChange={(e) => setBatchNotes(e.target.value)}
                  placeholder="e.g. Made-to-order artisanal cook for franchise requisitions"
                  className={`w-full p-2.5 rounded-xl border ${
                    isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-neutral-50 border-neutral-200'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-3.5 py-2 font-medium rounded-xl border border-neutral-300 dark:border-neutral-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold rounded-xl bg-[#F37021] text-white hover:bg-[#d85e15] cursor-pointer"
                >
                  Start Kettle Cook
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Direct Branch Allocation Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border ${
            isDark ? 'bg-[#1c1c1c] border-neutral-700 text-white' : 'bg-white border-neutral-200 text-neutral-900'
          }`}>
            <div className="flex items-center space-x-2 text-[#80C7F2] mb-2">
              <ArrowRightLeft className="w-5 h-5" />
              <h3 className="text-base font-bold">Allocate Stock to Branch</h3>
            </div>
            <p className="text-xs text-neutral-500">
              Transfer finished inventory directly from HQ Commissary buffer to a franchise branch.
            </p>

            {transferError && (
              <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{transferError}</span>
              </div>
            )}

            <form onSubmit={handleTransferStock} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-neutral-400 mb-1">
                  Destination Franchise Branch
                </label>
                <select
                  value={transferBranchId}
                  onChange={(e) => setTransferBranchId(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border font-semibold ${
                    isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.location})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-neutral-400 mb-1">
                  Flavor Selection
                </label>
                <select
                  value={transferProductId}
                  onChange={(e) => setTransferProductId(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border font-semibold ${
                    isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.flavor} (Available Buffer: {p.adminStock} units)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-neutral-400 mb-1">
                  Transfer Quantity (Units)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={transferQty}
                  onChange={(e) => setTransferQty(Number(e.target.value))}
                  className={`w-full p-2.5 rounded-xl border font-bold text-sm ${
                    isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-neutral-50 border-neutral-200'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-3.5 py-2 font-medium rounded-xl border border-neutral-300 dark:border-neutral-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold rounded-xl bg-[#80C7F2] text-neutral-900 hover:bg-[#6ab9e8] cursor-pointer"
                >
                  Review & Confirm Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border ${
            isDark ? 'bg-[#1c1c1c] border-neutral-700 text-white' : 'bg-white border-neutral-200 text-neutral-900'
          }`}>
            <h3 className="text-base font-bold">
              {editingProduct ? 'Edit Gourmet Flavor' : 'Add New Gourmet Flavor'}
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              Configure product details and central commissary inventory.
            </p>

            <form onSubmit={handleSaveProduct} className="mt-4 space-y-3 text-xs">
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

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-3.5 py-2 font-medium rounded-xl border border-neutral-300 dark:border-neutral-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold rounded-xl bg-[#F37021] text-white hover:bg-[#d85e15] cursor-pointer"
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
