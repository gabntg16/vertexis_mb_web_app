import React, { useState } from 'react';
import {
  Flame,
  ArrowRightLeft,
  ChefHat,
  AlertTriangle,
  CheckCircle2,
  X,
  Package,
  Building2,
  Trash2,
  Clock,
  Sparkles,
  ShieldCheck,
  Loader2,
} from 'lucide-react';

export type ProductionSafeguardType =
  | 'cook_batch'
  | 'allocate_stock'
  | 'send_to_kitchen'
  | 'advance_stage'
  | 'delete_product';

export interface ProductionSafeguardDetails {
  isOpen: boolean;
  type: ProductionSafeguardType;
  title?: string;
  flavor?: string;
  quantity?: number;
  chefName?: string;
  branchName?: string;
  orderId?: string;
  batchCode?: string;
  fromStage?: string;
  toStage?: string;
  currentBufferStock?: number;
  remainingBufferStock?: number;
  notes?: string;
  onConfirm: () => void | Promise<void>;
}

export interface ProductionSafeguardModalProps {
  details: ProductionSafeguardDetails | null;
  themeMode?: 'light' | 'dark';
  onClose: () => void;
}

export const ProductionSafeguardModal: React.FC<ProductionSafeguardModalProps> = ({
  details,
  themeMode = 'light',
  onClose,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!details || !details.isOpen) return null;

  const isDark = themeMode === 'dark';
  const {
    type,
    title,
    flavor,
    quantity,
    chefName,
    branchName,
    orderId,
    batchCode,
    fromStage,
    toStage,
    currentBufferStock,
    remainingBufferStock,
    notes,
    onConfirm,
  } = details;

  const handleConfirm = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      console.error('Safeguard confirmation failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getHeaderIcon = () => {
    switch (type) {
      case 'cook_batch':
        return <Flame className="w-6 h-6 text-[#F37021]" />;
      case 'allocate_stock':
        return <ArrowRightLeft className="w-6 h-6 text-[#80C7F2]" />;
      case 'send_to_kitchen':
        return <ChefHat className="w-6 h-6 text-amber-500" />;
      case 'advance_stage':
        return <CheckCircle2 className="w-6 h-6 text-purple-500" />;
      case 'delete_product':
        return <Trash2 className="w-6 h-6 text-red-500" />;
      default:
        return <AlertTriangle className="w-6 h-6 text-amber-500" />;
    }
  };

  const getBadge = () => {
    switch (type) {
      case 'cook_batch':
        return { label: 'Commissary Batch Initiation', bg: 'bg-[#F37021]/15 text-[#F37021] border-[#F37021]/30' };
      case 'allocate_stock':
        return { label: 'Branch Inventory Allocation', bg: 'bg-[#80C7F2]/15 text-[#0369a1] dark:text-[#80C7F2] border-[#80C7F2]/30' };
      case 'send_to_kitchen':
        return { label: 'MTO Production Pipeline', bg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' };
      case 'advance_stage':
        return { label: 'Batch Stage Transition', bg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30' };
      case 'delete_product':
        return { label: 'Catalog Removal Warning', bg: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30' };
      default:
        return { label: 'Operation Confirmation', bg: 'bg-neutral-500/15 text-neutral-600 border-neutral-500/30' };
    }
  };

  const getTitle = () => {
    if (title) return title;
    switch (type) {
      case 'cook_batch':
        return 'Initiate Kettle Whip & Curing Run?';
      case 'allocate_stock':
        return 'Confirm Branch Stock Transfer?';
      case 'send_to_kitchen':
        return 'Send Requisition to Live Stoves?';
      case 'advance_stage':
        return `Advance Batch to ${toStage || 'Next Stage'}?`;
      case 'delete_product':
        return 'Delete Gourmet Flavor from Catalog?';
      default:
        return 'Confirm Action?';
    }
  };

  const badge = getBadge();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-full max-w-lg rounded-3xl p-6 border shadow-2xl transition-all relative overflow-hidden animate-in zoom-in-95 duration-200 ${
          isDark
            ? 'bg-[#1a1a1a] border-neutral-700 text-neutral-100 shadow-neutral-950/40'
            : 'bg-white border-neutral-200 text-neutral-900 shadow-neutral-400/20'
        }`}
      >
        {/* Decorative subtle ambient corner glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#F37021]/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-[#80C7F2]/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className={`absolute top-4 right-4 p-1.5 rounded-full transition-colors ${
            isDark ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100'
          }`}
          title="Cancel"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Section */}
        <div className="flex items-start space-x-3.5 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center shrink-0 shadow-xs">
            {getHeaderIcon()}
          </div>
          <div className="pr-6 min-w-0">
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${badge.bg}`}>
              {badge.label}
            </span>
            <h3 className="text-lg font-black tracking-tight mt-1 leading-snug truncate text-neutral-900 dark:text-white">
              {getTitle()}
            </h3>
          </div>
        </div>

        {/* Operation Summary Box */}
        <div
          className={`rounded-2xl p-4 border text-xs space-y-2.5 mb-4 ${
            isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
          }`}
        >
          {flavor && (
            <div className="flex items-center justify-between">
              <span className="text-neutral-500 font-medium">Gourmet Recipe:</span>
              <span className="font-extrabold text-neutral-900 dark:text-white text-right">{flavor}</span>
            </div>
          )}

          {quantity !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-neutral-500 font-medium">Batch / Transfer Quantity:</span>
              <span className="font-mono font-black text-sm text-[#F37021]">{quantity} units</span>
            </div>
          )}

          {chefName && (
            <div className="flex items-center justify-between">
              <span className="text-neutral-500 font-medium">Assigned Confectioner:</span>
              <span className="font-bold text-neutral-800 dark:text-neutral-200">{chefName}</span>
            </div>
          )}

          {branchName && (
            <div className="flex items-center justify-between">
              <span className="text-neutral-500 font-medium">Destination Branch:</span>
              <span className="font-bold text-[#80C7F2]">{branchName}</span>
            </div>
          )}

          {orderId && (
            <div className="flex items-center justify-between">
              <span className="text-neutral-500 font-medium">Order Reference:</span>
              <span className="font-mono font-bold text-neutral-600 dark:text-neutral-400">#{orderId}</span>
            </div>
          )}

          {batchCode && (
            <div className="flex items-center justify-between">
              <span className="text-neutral-500 font-medium">Batch Tracking Code:</span>
              <span className="font-mono font-bold text-[#80C7F2]">{batchCode}</span>
            </div>
          )}

          {fromStage && toStage && (
            <div className="flex items-center justify-between">
              <span className="text-neutral-500 font-medium">Stage Transition:</span>
              <span className="font-bold text-neutral-900 dark:text-white">
                {fromStage} → <strong className="text-purple-500">{toStage}</strong>
              </span>
            </div>
          )}

          {currentBufferStock !== undefined && remainingBufferStock !== undefined && (
            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-[11px]">
              <span className="text-neutral-500">Commissary Buffer Reserve:</span>
              <span>
                <strong className="text-neutral-700 dark:text-neutral-300">{currentBufferStock}</strong> →{' '}
                <strong className="text-emerald-500 font-bold">{remainingBufferStock} units remaining</strong>
              </span>
            </div>
          )}

          {notes && (
            <div className="pt-1.5 border-t border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-500 italic">
              Note: "{notes}"
            </div>
          )}
        </div>

        {/* Safety Warning Statement */}
        <div
          className={`p-3 rounded-2xl border text-xs flex items-start space-x-2.5 mb-5 ${
            type === 'delete_product'
              ? 'bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-300'
              : type === 'allocate_stock'
              ? 'bg-[#80C7F2]/10 border-[#80C7F2]/30 text-[#0c5077] dark:text-[#80C7F2]'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
          }`}
        >
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="leading-snug">
            {type === 'cook_batch' && (
              <p>
                <strong>Commissary Verification:</strong> Initiating this batch will commit syrup ingredients, dedicate starch slab trays, and broadcast this batch code across the live kitchen tracker.
              </p>
            )}
            {type === 'allocate_stock' && (
              <p>
                <strong>Immediate Stock Sync:</strong> This action directly reduces the Central Commissary emergency buffer and increases the branch's on-hand sellable inventory.
              </p>
            )}
            {type === 'send_to_kitchen' && (
              <p>
                <strong>Production Order Dispatch:</strong> This order will be queued directly for live kettle boiling and whipping at the Bicol kitchen.
              </p>
            )}
            {type === 'advance_stage' && (
              <p>
                {toStage?.toLowerCase().includes('dispatch') || toStage?.toLowerCase().includes('ready') ? (
                  <>
                    <strong>Ready for Dispatch Alert:</strong> Marking this order as Ready for Dispatch will immediately broadcast a real-time notification to the <strong>Orders & Approvals</strong> dashboard and <strong>Fleet & Dispatch Logistics</strong> team to prepare J&T Express waybills or fleet delivery.
                  </>
                ) : (
                  <>
                    <strong>Batch Workflow Advance:</strong> Verify that quality inspection and curing thresholds have been satisfied before moving to the next stage.
                  </>
                )}
              </p>
            )}
            {type === 'delete_product' && (
              <p>
                <strong>Permanent Removal:</strong> This flavor will be removed from the active commissary catalog. Past receipts and history will be preserved.
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirm}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center space-x-1.5 disabled:opacity-60 disabled:cursor-not-allowed ${
              type === 'delete_product'
                ? 'bg-red-600 hover:bg-red-700'
                : type === 'allocate_stock'
                ? 'bg-[#0369a1] dark:bg-[#80C7F2] dark:text-neutral-950 hover:opacity-90'
                : 'bg-[#F37021] hover:bg-[#d85e15]'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processing Action...</span>
              </>
            ) : (
              <>
                {type === 'cook_batch' && <Flame className="w-3.5 h-3.5" />}
                {type === 'allocate_stock' && <ArrowRightLeft className="w-3.5 h-3.5" />}
                {type === 'send_to_kitchen' && <ChefHat className="w-3.5 h-3.5" />}
                {type === 'delete_product' && <Trash2 className="w-3.5 h-3.5" />}
                <span>
                  {type === 'cook_batch'
                    ? 'Yes, Start Kettle Cook'
                    : type === 'allocate_stock'
                    ? 'Yes, Confirm Stock Transfer'
                    : type === 'send_to_kitchen'
                    ? 'Yes, Send to Kitchen'
                    : type === 'delete_product'
                    ? 'Yes, Delete Flavor'
                    : 'Yes, Confirm Action'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
