import React from 'react';
import { AlertTriangle, PackageX, Truck, CheckCircle2, RotateCcw, X, ShieldAlert, FileText } from 'lucide-react';

export interface InboundDiscrepancyDetails {
  isOpen: boolean;
  deliveryTracking: string;
  courierName: string;
  orderId: string;
  dispatchedTotal: number;
  receivedTotal: number;
  discrepancyVariance: number;
  itemizedDiscrepancies: Array<{
    flavor: string;
    dispatchedQty: number;
    receivedQty: number;
    variance: number;
  }>;
  receiverName: string;
  inspectNotes: string;
  onConfirmSignOff: () => void;
}

export interface InboundDiscrepancySafeguardModalProps {
  details: InboundDiscrepancyDetails | null;
  themeMode?: 'light' | 'dark';
  onClose: () => void;
}

export const InboundDiscrepancySafeguardModal: React.FC<InboundDiscrepancySafeguardModalProps> = ({
  details,
  themeMode = 'light',
  onClose,
}) => {
  if (!details || !details.isOpen) return null;

  const isDark = themeMode === 'dark';
  const {
    deliveryTracking,
    courierName,
    orderId,
    dispatchedTotal,
    receivedTotal,
    discrepancyVariance,
    itemizedDiscrepancies,
    receiverName,
    inspectNotes,
    onConfirmSignOff,
  } = details;

  const isShortage = discrepancyVariance < 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="discrepancy-safeguard-title"
    >
      <div
        className={`w-full max-w-lg rounded-3xl p-6 border shadow-2xl transition-all relative overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto ${
          isDark
            ? 'bg-neutral-900 border-red-500/40 text-neutral-100 shadow-red-950/30'
            : 'bg-white border-red-500/40 text-neutral-900 shadow-red-500/15'
        }`}
      >
        {/* Ambient background glow */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-red-500/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

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

        {/* Header */}
        <div className="flex items-start space-x-3.5 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 shadow-xs">
            <PackageX className="w-6 h-6" />
          </div>
          <div className="pr-6">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/25">
              Inbound Receiving Safeguard
            </span>
            <h3 id="discrepancy-safeguard-title" className="text-lg font-black tracking-tight mt-1 leading-snug text-neutral-900 dark:text-white">
              Shipment Quantity Discrepancy Alert
            </h3>
          </div>
        </div>

        {/* Description Warning */}
        <div className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed mb-4 space-y-2">
          <p>
            The physical count entered ({receivedTotal} units) does not match the Central Commissary dispatched manifest ({dispatchedTotal} units).
          </p>
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-[11px] text-red-800 dark:text-red-300 space-y-1">
            <div className="font-bold flex items-center space-x-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{isShortage ? `Shortage Detected: ${Math.abs(discrepancyVariance)} missing unit(s)` : `Overage Detected: +${discrepancyVariance} extra unit(s)`}</span>
            </div>
            <p className="text-neutral-600 dark:text-neutral-300">
              Signing off with this discrepancy will automatically log a formal incident report to Commissary HQ Logistics.
            </p>
          </div>
        </div>

        {/* High-Level Metric Card */}
        <div
          className={`p-4 rounded-2xl border mb-4 space-y-2 text-xs ${
            isDark ? 'bg-neutral-850 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
          }`}
        >
          <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
            <span className="text-neutral-500 flex items-center space-x-1.5">
              <Truck className="w-3.5 h-3.5 text-neutral-400" />
              <span>Dispatch Tracking / Order:</span>
            </span>
            <span className="font-mono font-bold text-neutral-900 dark:text-white">
              {deliveryTracking} (Order #{orderId})
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800/80">
              <span className="text-[10px] text-neutral-400 block font-medium">Dispatched</span>
              <span className="font-mono font-bold text-sm text-neutral-900 dark:text-white">
                {dispatchedTotal} pcs
              </span>
            </div>
            <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800/80">
              <span className="text-[10px] text-neutral-400 block font-medium">Received Count</span>
              <span className="font-mono font-bold text-sm text-neutral-900 dark:text-white">
                {receivedTotal} pcs
              </span>
            </div>
            <div className="p-2 rounded-xl bg-red-500/15 border border-red-500/30">
              <span className="text-[10px] text-red-600 dark:text-red-400 block font-bold">Variance</span>
              <span className="font-mono font-black text-sm text-red-600 dark:text-red-400">
                {discrepancyVariance > 0 ? `+${discrepancyVariance}` : discrepancyVariance} pcs
              </span>
            </div>
          </div>
        </div>

        {/* Itemized Discrepancy Breakdown Table */}
        {itemizedDiscrepancies.length > 0 && (
          <div className="mb-4 space-y-1.5">
            <span className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block">
              Itemized Flavor Discrepancies:
            </span>
            <div className="max-h-36 overflow-y-auto rounded-xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800 text-xs">
              {itemizedDiscrepancies.map((item, idx) => (
                <div key={idx} className="p-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-neutral-900 dark:text-white block">{item.flavor}</span>
                    <span className="text-[10px] text-neutral-400">
                      Dispatched: {item.dispatchedQty} • Counted: {item.receivedQty}
                    </span>
                  </div>
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                      item.variance === 0
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                    }`}
                  >
                    {item.variance > 0 ? `+${item.variance}` : `${item.variance}`} pcs
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inspection Sign-Off Metadata */}
        <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/60 text-[11px] space-y-1 mb-5">
          <div className="flex justify-between">
            <span className="text-neutral-500">Receiver / Inspector:</span>
            <span className="font-bold text-neutral-900 dark:text-white">{receiverName}</span>
          </div>
          {inspectNotes && (
            <div className="flex justify-between">
              <span className="text-neutral-500">Inspector Notes:</span>
              <span className="font-medium text-neutral-700 dark:text-neutral-300 italic truncate max-w-[200px]">"{inspectNotes}"</span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className={`w-full py-3 px-4 rounded-2xl text-xs font-bold border transition-all flex items-center justify-center space-x-2 ${
              isDark
                ? 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-neutral-200'
                : 'bg-neutral-100 border-neutral-200 hover:bg-neutral-200 text-neutral-800'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Recount Physical Stock</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onConfirmSignOff();
              onClose();
            }}
            className="w-full py-3 px-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 active:scale-[0.98]"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Sign Off with Discrepancy</span>
          </button>
        </div>
      </div>
    </div>
  );
};
