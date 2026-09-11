import React, { useState } from 'react';
import {
  Truck,
  Package,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  Phone,
  Building,
  Copy,
  Check,
  ExternalLink,
  Calendar,
  User,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { JT_EXPRESS_TRACKING_URL } from '../../services/jtExpress';

interface JTTrackingModalProps {
  trackingNumber: string;
  orderId?: string;
  branchName?: string;
  themeMode?: 'light' | 'dark';
  onClose: () => void;
  onStatusUpdated?: (status: string) => void;
}

export const JTTrackingModal: React.FC<JTTrackingModalProps> = ({
  trackingNumber,
  orderId,
  branchName,
  themeMode = 'light',
  onClose,
}) => {
  const { deliveries, orders, branches } = useData();
  const [copied, setCopied] = useState(false);

  const isDark = themeMode === 'dark';

  // Locate associated delivery and order
  const delivery = deliveries.find(
    (d) =>
      d.trackingNumber === trackingNumber ||
      d.waybillNumber === trackingNumber ||
      (orderId && d.orderId === orderId)
  );

  const order = orders.find(
    (o) =>
      (delivery && o.id === delivery.orderId) ||
      (orderId && o.id === orderId) ||
      o.trackingNumber === trackingNumber ||
      o.waybillNumber === trackingNumber
  );

  const branch = branches.find(
    (b) =>
      (order && b.id === order.branchId) ||
      (delivery && b.id === delivery.branchId) ||
      (branchName && b.name.toLowerCase() === branchName.toLowerCase())
  );

  const courierName = delivery?.courierName || order?.courierName || 'Central Logistics';
  const isCompanyFleet =
    delivery?.dispatchMethod === 'company_driver' ||
    order?.dispatchMethod === 'company_driver';
  const isJT = courierName.toLowerCase().includes('j&t');

  const driverName = delivery?.driverName || order?.driverName;
  const driverPhone = delivery?.driverPhone || order?.driverPhone;
  const vehiclePlate = delivery?.vehiclePlateNo || order?.vehiclePlateNo;

  const etd = delivery?.scheduledAt || order?.estimatedDeliveryTime;

  const handleCopy = () => {
    navigator.clipboard.writeText(trackingNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatETD = (val?: string) => {
    if (!val) return 'Scheduled Dispatch';
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

  const dispatchedItems = order?.dispatchedProducts || order?.items || [];
  const totalPacks = dispatchedItems.reduce((acc, it) => acc + it.quantity, 0);

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh] ${
          isDark ? 'bg-[#181818] border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 sm:p-5 border-b flex items-center justify-between gap-3 ${
            isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                isCompanyFleet
                  ? 'bg-[#F37021]/15 text-[#F37021]'
                  : isJT
                  ? 'bg-red-600/15 text-red-600'
                  : 'bg-sky-500/15 text-sky-600'
              }`}
            >
              {isCompanyFleet ? <Truck className="w-5 h-5" /> : <Package className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-black tracking-tight">Delivery Dispatch Details</h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    delivery?.status === 'delivered'
                      ? 'bg-emerald-500/20 text-emerald-600'
                      : 'bg-amber-500/20 text-amber-600'
                  }`}
                >
                  {delivery?.status === 'delivered' ? 'DELIVERED' : 'IN TRANSIT'}
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                {isCompanyFleet
                  ? 'In-House Commissary Logistics Fleet'
                  : `Third-Party Courier • ${courierName}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Tracking / Waybill Reference Card */}
          <div
            className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
              isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
            }`}
          >
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                {isCompanyFleet ? 'Fleet Trip Ticket / Dispatch Ref' : 'Waybill / Tracking Number'}
              </span>
              <p className="font-mono text-base font-black text-neutral-900 dark:text-white select-all">
                {trackingNumber}
              </p>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={handleCopy}
                className="px-2.5 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-bold flex items-center space-x-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all cursor-pointer"
                title="Copy Number"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-500">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              {isJT && (
                <a
                  href={JT_EXPRESS_TRACKING_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center space-x-1 shadow-xs transition-colors"
                  title="Track on official J&T Portal"
                >
                  <span>J&T Site</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          {/* Schedule & Destination Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              className={`p-3 rounded-2xl border space-y-1 ${
                isDark ? 'bg-neutral-900/50 border-neutral-800' : 'bg-white border-neutral-200'
              }`}
            >
              <div className="flex items-center space-x-1.5 text-neutral-500 text-xs font-bold">
                <Clock className="w-3.5 h-3.5 text-[#F37021]" />
                <span>Estimated Arrival (ETD)</span>
              </div>
              <p className="text-xs font-black text-neutral-900 dark:text-white">
                {formatETD(etd)}
              </p>
            </div>

            <div
              className={`p-3 rounded-2xl border space-y-1 ${
                isDark ? 'bg-neutral-900/50 border-neutral-800' : 'bg-white border-neutral-200'
              }`}
            >
              <div className="flex items-center space-x-1.5 text-neutral-500 text-xs font-bold">
                <Building className="w-3.5 h-3.5 text-emerald-500" />
                <span>Destination Branch</span>
              </div>
              <p className="text-xs font-black text-neutral-900 dark:text-white truncate">
                {branch?.name || branchName || order?.branchName || 'Franchise Branch'}
              </p>
            </div>
          </div>

          {/* Carrier or Driver Specifics */}
          <div
            className={`p-3.5 rounded-2xl border space-y-2 ${
              isDark ? 'bg-neutral-900/50 border-neutral-800' : 'bg-white border-neutral-200'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
              Logistics Personnel & Carrier
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-neutral-400 block text-[11px]">Carrier / Fleet:</span>
                <span className="font-bold">{courierName}</span>
              </div>
              {driverName && (
                <div>
                  <span className="text-neutral-400 block text-[11px]">Assigned Driver:</span>
                  <span className="font-bold">{driverName}</span>
                </div>
              )}
              {vehiclePlate && (
                <div>
                  <span className="text-neutral-400 block text-[11px]">Plate Number:</span>
                  <span className="font-mono font-bold">{vehiclePlate}</span>
                </div>
              )}
              {driverPhone && (
                <div>
                  <span className="text-neutral-400 block text-[11px]">Contact Phone:</span>
                  <span className="font-bold text-[#F37021]">{driverPhone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Dispatched Cargo Manifest */}
          {dispatchedItems.length > 0 && (
            <div
              className={`p-3.5 rounded-2xl border space-y-2.5 ${
                isDark ? 'bg-neutral-900/50 border-neutral-800' : 'bg-white border-neutral-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Dispatched Consignment Manifest
                </span>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                  {totalPacks} pouches total
                </span>
              </div>

              <div className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                {dispatchedItems.map((item, i) => (
                  <div key={i} className="py-1.5 flex items-center justify-between">
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">
                      {item.productName || item.flavor}
                    </span>
                    <span className="font-black text-neutral-900 dark:text-white">
                      {item.quantity} packs
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dispatch Notes if any */}
          {(delivery?.notes || order?.dispatchNotes) && (
            <div
              className={`p-3 rounded-2xl border text-xs space-y-1 ${
                isDark ? 'bg-neutral-900/50 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                Dispatch Instructions
              </span>
              <p className="text-neutral-700 dark:text-neutral-300 italic">
                "{delivery?.notes || order?.dispatchNotes}"
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`p-4 border-t flex items-center justify-between ${
            isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
          }`}
        >
          <div className="text-[11px] text-neutral-500">
            Naga Central Commissary Logistics
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default JTTrackingModal;
