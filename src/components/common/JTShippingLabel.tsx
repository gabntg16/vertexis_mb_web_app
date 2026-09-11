import React, { useRef } from 'react';
import {
  Printer,
  Download,
  X,
  Package,
  Truck,
  ShieldCheck,
  AlertTriangle,
  QrCode,
  CheckCircle2,
  Calendar,
  Clock,
  Building,
  User,
  Phone,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { JTShippingLabelData, JT_EXPRESS_TRACKING_URL } from '../../services/jtExpress';

export interface DispatchManifestData {
  dispatchRef: string;
  orderId: string;
  dispatchMethod: 'company_driver' | 'third_party_courier' | 'jt_express';
  courierName: string;
  trackingNumber: string;
  waybillNumber?: string;
  driverName?: string;
  driverPhone?: string;
  vehiclePlateNo?: string;
  estimatedDeliveryTime?: string;
  createdAt: string;
  sender: {
    companyName: string;
    hubName: string;
    address: string;
    contactPerson: string;
    phone: string;
  };
  receiver: {
    branchName: string;
    managerName: string;
    phone: string;
    address: string;
  };
  items: Array<{
    itemName: string;
    quantity: number;
    unitValue?: number;
  }>;
  totalPacks: number;
  declaredValue: number;
  packageWeightKg?: number;
  specialInstructions?: string;
}

interface JTShippingLabelProps {
  labelData: JTShippingLabelData | DispatchManifestData;
  onClose: () => void;
}

export const JTShippingLabel: React.FC<JTShippingLabelProps> = ({
  labelData,
  onClose,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadStub = () => {
    window.print();
  };

  // Harmonize data format
  const isGenericManifest = 'dispatchRef' in labelData;
  const dispatchRef = isGenericManifest ? labelData.dispatchRef : labelData.billCode;
  const orderId = labelData.orderId;
  const courierName = isGenericManifest ? labelData.courierName : 'J&T Express Philippines';
  const isCompanyFleet = isGenericManifest && labelData.dispatchMethod === 'company_driver';
  const trackingNumber = isGenericManifest ? labelData.trackingNumber : labelData.billCode;
  const etd = isGenericManifest ? labelData.estimatedDeliveryTime : undefined;
  const totalPacks = labelData.totalPacks;
  const declaredValue = labelData.declaredValue;
  const weightKg = isGenericManifest ? labelData.packageWeightKg || 2.5 : (labelData as JTShippingLabelData).totalWeightKg || 2.5;

  const sender = isGenericManifest
    ? labelData.sender
    : {
        companyName: (labelData as JTShippingLabelData).sender.companyName,
        hubName: 'Naga Central Commissary Hub',
        address: (labelData as JTShippingLabelData).sender.address,
        contactPerson: (labelData as JTShippingLabelData).sender.name,
        phone: (labelData as JTShippingLabelData).sender.mobile,
      };

  const receiver = isGenericManifest
    ? labelData.receiver
    : {
        branchName: (labelData as JTShippingLabelData).receiver.branchName || (labelData as JTShippingLabelData).receiver.name,
        managerName: (labelData as JTShippingLabelData).receiver.name,
        phone: (labelData as JTShippingLabelData).receiver.mobile || (labelData as JTShippingLabelData).receiver.phone || '',
        address: (labelData as JTShippingLabelData).receiver.address,
      };

  const items = isGenericManifest
    ? labelData.items.map((it) => ({ name: it.itemName, qty: it.quantity }))
    : (labelData as JTShippingLabelData).items.map((it) => ({ name: it.itemName, qty: it.itemQuantity }));

  const driverName = isGenericManifest ? labelData.driverName : undefined;
  const vehiclePlate = isGenericManifest ? labelData.vehiclePlateNo : undefined;
  const driverPhone = isGenericManifest ? labelData.driverPhone : undefined;

  const isJT = courierName.toLowerCase().includes('j&t');

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl flex flex-col rounded-3xl bg-neutral-900 border border-neutral-700 shadow-2xl overflow-hidden my-auto max-h-[95vh]">
        {/* Top Control Bar (Non-Printable) */}
        <div className="p-4 bg-neutral-800/90 border-b border-neutral-700 flex items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center space-x-2.5">
            <div
              className={`px-2.5 py-1 rounded-lg text-white font-black text-xs tracking-wider flex items-center space-x-1.5 ${
                isCompanyFleet ? 'bg-[#F37021]' : isJT ? 'bg-red-600' : 'bg-sky-600'
              }`}
            >
              {isCompanyFleet ? (
                <>
                  <Truck className="w-3.5 h-3.5" />
                  <span>IN-HOUSE FLEET</span>
                </>
              ) : (
                <>
                  <Package className="w-3.5 h-3.5" />
                  <span>{courierName.toUpperCase()}</span>
                </>
              )}
            </div>
            <span className="text-xs font-bold text-white hidden sm:inline">
              Official Consignment Dispatch Slip & Gate Pass
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {isJT && (
              <a
                href={JT_EXPRESS_TRACKING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-neutral-600 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold transition-colors"
                title="Open Carrier Tracker"
              >
                <span>Carrier Portal</span>
                <ExternalLink className="w-3.5 h-3.5 text-red-500" />
              </a>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-xs cursor-pointer"
              title="Print Manifest / Gate Pass"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadStub}
              className="px-3 py-1.5 rounded-xl bg-neutral-700 hover:bg-neutral-600 text-white text-xs font-bold transition-colors flex items-center space-x-1 cursor-pointer"
              title="Save as PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Container */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-neutral-950 flex justify-center">
          <div
            ref={printRef}
            className="w-full max-w-[560px] bg-white text-black font-sans text-xs border-2 border-black p-5 rounded-md shadow-xl print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:w-full"
            style={{ minHeight: '620px' }}
          >
            {/* Header */}
            <div className="border-b-2 border-black pb-3 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <div className="bg-[#F37021] text-white font-black px-2 py-0.5 text-sm tracking-tight rounded-xs">
                    THE MARSH BITES
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-neutral-700">
                    CENTRAL COMMISSARY
                  </span>
                </div>
                <h2 className="text-base font-black uppercase tracking-tight text-black mt-1">
                  Consignment Dispatch Manifest & Gate Pass
                </h2>
                <p className="text-[10px] text-neutral-600 leading-tight">
                  Zone 4, Concepcion Pequeña, Naga City, Camarines Sur (Bicol Hub)
                </p>
              </div>

              <div className="text-right shrink-0">
                <div className="border border-black px-2 py-1 bg-neutral-50 rounded-xs">
                  <p className="text-[9px] uppercase font-bold text-neutral-500">Dispatch Ref / Waybill</p>
                  <p className="font-mono text-sm font-black text-black tracking-wider">
                    {trackingNumber}
                  </p>
                </div>
                <p className="text-[9px] font-mono text-neutral-600 mt-1">
                  Order ID: <strong className="text-black">#{orderId}</strong>
                </p>
              </div>
            </div>

            {/* Logistics & Carrier Routing */}
            <div className="grid grid-cols-2 sm:grid-cols-3 border-b-2 border-black py-2.5 gap-2 bg-neutral-50/70 p-2 text-[10px]">
              <div>
                <span className="text-neutral-500 block uppercase font-bold text-[9px]">Dispatch Method</span>
                <span className="font-black text-black">
                  {isCompanyFleet ? '🚛 In-House Commissary Fleet' : `📦 Third-Party Courier (${courierName})`}
                </span>
              </div>

              <div>
                <span className="text-neutral-500 block uppercase font-bold text-[9px]">
                  {isCompanyFleet ? 'Assigned Driver & Plate' : 'Carrier Service'}
                </span>
                <span className="font-bold text-black">
                  {isCompanyFleet
                    ? `${driverName || 'Designated Driver'} ${vehiclePlate ? `(${vehiclePlate})` : ''}`
                    : courierName}
                </span>
                {driverPhone && <span className="text-[9px] block text-neutral-600">{driverPhone}</span>}
              </div>

              <div>
                <span className="text-neutral-500 block uppercase font-bold text-[9px]">Est. Delivery (ETD)</span>
                <span className="font-bold text-black">
                  {etd ? new Date(etd).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Standard Route Schedule'}
                </span>
              </div>
            </div>

            {/* Simulated Barcode */}
            <div className="border-b-2 border-black py-2 text-center bg-white">
              <div className="h-8 w-full flex items-center justify-center space-x-0.5 px-4">
                {Array.from({ length: 44 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-7 bg-black"
                    style={{
                      width: i % 5 === 0 ? '3.5px' : i % 3 === 0 ? '2px' : '1.5px',
                      marginLeft: i % 4 === 0 ? '2px' : '0.5px',
                    }}
                  />
                ))}
              </div>
              <p className="font-mono text-xs font-black tracking-widest mt-1 text-black">
                {trackingNumber}
              </p>
            </div>

            {/* Destination & Recipient */}
            <div className="border-b-2 border-black py-2.5 grid grid-cols-2 gap-3">
              <div className="border-r border-neutral-300 pr-2">
                <div className="flex items-center space-x-1 text-[9px] font-black uppercase text-neutral-500 mb-1">
                  <Building className="w-3 h-3 text-[#F37021]" />
                  <span>Destination Branch</span>
                </div>
                <p className="font-black text-xs uppercase text-black leading-tight">
                  {receiver.branchName}
                </p>
                <p className="text-[10px] text-neutral-700 mt-0.5 leading-snug">
                  {receiver.address}
                </p>
                <p className="text-[9px] text-neutral-600 mt-1 font-semibold">
                  Store Manager: {receiver.managerName} {receiver.phone ? `(${receiver.phone})` : ''}
                </p>
              </div>

              <div>
                <div className="flex items-center space-x-1 text-[9px] font-black uppercase text-neutral-500 mb-1">
                  <MapPin className="w-3 h-3 text-emerald-600" />
                  <span>Origin Warehouse</span>
                </div>
                <p className="font-black text-xs uppercase text-black leading-tight">
                  {sender.hubName}
                </p>
                <p className="text-[10px] text-neutral-700 mt-0.5 leading-snug">
                  {sender.address}
                </p>
                <p className="text-[9px] text-neutral-600 mt-1 font-semibold">
                  Dispatch Officer: {sender.contactPerson}
                </p>
              </div>
            </div>

            {/* Itemized Consignment Table */}
            <div className="border-b-2 border-black py-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black uppercase text-black">
                  Dispatched Stock Items (Packs)
                </span>
                <span className="text-[9px] font-bold text-neutral-600">
                  Total Cargo: <strong className="text-black font-black">{totalPacks} Pouches</strong>
                </span>
              </div>

              <div className="border border-black rounded-xs overflow-hidden">
                <table className="w-full text-left text-[10px]">
                  <thead className="bg-neutral-100 border-b border-black font-bold uppercase text-[9px]">
                    <tr>
                      <th className="p-1.5">Item / Marshmallow Flavor</th>
                      <th className="p-1.5 text-center w-20">Quantity</th>
                      <th className="p-1.5 text-right w-24">Condition</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50">
                        <td className="p-1.5 font-medium text-black">{it.name}</td>
                        <td className="p-1.5 text-center font-black">{it.qty} pcs</td>
                        <td className="p-1.5 text-right text-emerald-700 font-bold">Good / Sealed</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary & Handling Notes */}
            <div className="border-b-2 border-black py-2 grid grid-cols-3 gap-2 text-[10px]">
              <div>
                <span className="text-neutral-500 block text-[9px] font-bold uppercase">Weight</span>
                <span className="font-bold">{weightKg} KG</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[9px] font-bold uppercase">Total Units</span>
                <span className="font-bold">{totalPacks} Pouches</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[9px] font-bold uppercase">Declared Value</span>
                <span className="font-bold">₱{declaredValue.toLocaleString()}</span>
              </div>
            </div>

            {/* Handling Notice */}
            <div className="border-b-2 border-black py-2 flex items-center space-x-2 text-[9px] text-neutral-700">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="leading-tight">
                <strong>Handling Note:</strong> Perishable gourmet confectionery. Keep in dry, cool environment below 28°C. Do not store in direct sunlight. Verify tamper-evident seals before signing gate pass.
              </p>
            </div>

            {/* Sign-Off Authorizations */}
            <div className="pt-3 grid grid-cols-2 gap-6 text-[9px]">
              <div>
                <p className="text-neutral-500 uppercase font-bold text-[8px] mb-6">
                  Dispatched & Inspected By (Commissary Logistics):
                </p>
                <div className="border-t border-black pt-1 flex justify-between font-mono">
                  <span>Logistics Officer Signature</span>
                  <span>Date: {new Date().toLocaleDateString()}</span>
                </div>
              </div>

              <div>
                <p className="text-neutral-500 uppercase font-bold text-[8px] mb-6">
                  Received & Verified By (Store Manager):
                </p>
                <div className="border-t border-black pt-1 flex justify-between font-mono">
                  <span>Branch Manager Signature</span>
                  <span>Date: _______________</span>
                </div>
              </div>
            </div>

            {/* Document Footer */}
            <div className="mt-3 pt-1 border-t border-dashed border-neutral-300 text-[8px] text-neutral-500 flex justify-between font-mono">
              <span>The Marsh Bites Enterprise System • Central Commissary Naga</span>
              <span>Generated: {new Date().toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JTShippingLabel;
