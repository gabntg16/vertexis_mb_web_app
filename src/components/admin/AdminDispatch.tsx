import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import {
  Truck,
  Package,
  MapPin,
  Clock,
  Printer,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
  User,
  Phone,
  Building,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Sparkles,
  ExternalLink,
  Plus,
  Send,
  Boxes,
  Copy,
  Check,
} from 'lucide-react';
import { JT_EXPRESS_TRACKING_URL } from '../../services/jtExpress';
import { JTShippingLabel, DispatchManifestData } from '../common/JTShippingLabel';
import { JTTrackingModal } from '../common/JTTrackingModal';
import { Delivery, Order, DispatchMethod } from '../../types';

interface ToastState {
  type: 'success' | 'error' | 'info';
  message: string;
}

const COMMON_COURIERS = [
  'J&T Express',
  'LBC Express',
  'Transportify',
  'Grab Express',
  'Victory Liner Cargo',
  'Other Courier',
];

export const AdminDispatch: React.FC = () => {
  const {
    deliveries,
    orders,
    branches,
    themeMode,
    createDelivery,
    updateDeliveryStatus,
    cancelDelivery,
  } = useData();

  const isDark = themeMode === 'dark';

  // Navigation & Filter States
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'inTransit' | 'delivered'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<'all' | 'company_driver' | 'courier'>('all');

  // Modal States
  const [selectedOrderForDispatch, setSelectedOrderForDispatch] = useState<Order | null>(null);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [activeTrackingNumber, setActiveTrackingNumber] = useState<string | null>(null);
  const [activeTrackingOrder, setActiveTrackingOrder] = useState<{ id: string; branch: string } | null>(null);
  const [activeManifestData, setActiveManifestData] = useState<DispatchManifestData | null>(null);
  const [cancelModalDelivery, setCancelModalDelivery] = useState<Delivery | null>(null);
  const [cancelReason, setCancelReason] = useState('Order rescheduled by branch manager');

  // Dispatch Form States
  const [dispatchType, setDispatchType] = useState<'company_driver' | 'courier'>('company_driver');
  const [courierName, setCourierName] = useState('J&T Express');
  const [customCourierName, setCustomCourierName] = useState('');
  const [trackingOrPlate, setTrackingOrPlate] = useState('');
  const [estimatedDeliveryTime, setEstimatedDeliveryTime] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');
  const [driverName, setDriverName] = useState('Mang Robert (Central Logistics)');
  const [vehiclePlateNo, setVehiclePlateNo] = useState('BCO-8821 (Naga Van #1)');
  const [driverPhone, setDriverPhone] = useState('+63 917 884 2104');
  const [deliveryNotes, setDeliveryNotes] = useState('Perishable gourmet marshmallows. Keep below 28°C.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast Notification
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Pre-fill receiver details when opening dispatch modal
  const handleOpenDispatchForOrder = (order: Order) => {
    setSelectedOrderForDispatch(order);
    const branch = branches.find((b) => b.id === order.branchId);

    if (branch) {
      setReceiverName(branch.managerName || `${branch.name} Store Manager`);
      setReceiverPhone(branch.managerPhone || branch.contactNumber || '+63 917 555 0192');
      setReceiverAddress(branch.address || branch.location || `${branch.name}, Commercial Center`);
    } else {
      setReceiverName(`${order.branchName} Manager`);
      setReceiverPhone('+63 917 555 0192');
      setReceiverAddress(`${order.branchName} Store Location`);
    }

    // Default ETD to 48 hours ahead formatted for datetime-local
    const defaultETD = new Date(Date.now() + 48 * 3600 * 1000);
    const tzOffset = defaultETD.getTimezoneOffset() * 60000;
    const localISOTime = new Date(defaultETD.getTime() - tzOffset).toISOString().slice(0, 16);
    setEstimatedDeliveryTime(order.estimatedDeliveryTime || localISOTime);

    // Default tracking or trip ticket
    if (dispatchType === 'company_driver') {
      setTrackingOrPlate(`TRIP-NGA-${order.id}`);
    } else {
      setTrackingOrPlate(order.trackingNumber || '');
    }

    setShowDispatchModal(true);
  };

  // Execute Dispatch Submission
  const handleExecuteDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForDispatch) return;

    const finalCourierName =
      dispatchType === 'company_driver'
        ? 'In-House Commissary Fleet'
        : courierName === 'Other Courier' && customCourierName
        ? customCourierName
        : courierName;

    const finalTrackingNumber =
      trackingOrPlate.trim() ||
      (dispatchType === 'company_driver'
        ? `TRIP-NGA-${selectedOrderForDispatch.id}`
        : `MB-TRACK-${Math.floor(100000 + Math.random() * 900000)}`);

    if (dispatchType === 'courier' && !trackingOrPlate.trim()) {
      showToast('error', 'Please enter the Courier Waybill / Tracking Number.');
      return;
    }

    if (!estimatedDeliveryTime) {
      showToast('error', 'Please select the Estimated Time of Delivery (ETD).');
      return;
    }

    try {
      setIsSubmitting(true);

      const totalPacks = selectedOrderForDispatch.items.reduce((s, it) => s + it.quantity, 0);
      const estWeightKg = Math.max(1.5, Math.round(totalPacks * 0.12 * 10) / 10);

      const resolvedMethod: DispatchMethod =
        dispatchType === 'company_driver'
          ? 'company_driver'
          : finalCourierName.toLowerCase().includes('j&t')
          ? 'jt_express'
          : 'third_party_courier';

      // Create Delivery in DataContext
      createDelivery(
        selectedOrderForDispatch.id,
        receiverAddress,
        finalCourierName,
        finalTrackingNumber,
        estimatedDeliveryTime,
        deliveryNotes,
        {
          dispatchMethod: resolvedMethod,
          waybillNumber: finalTrackingNumber,
          driverName: dispatchType === 'company_driver' ? driverName : undefined,
          driverPhone: dispatchType === 'company_driver' ? driverPhone : undefined,
          vehiclePlateNo: dispatchType === 'company_driver' ? vehiclePlateNo : undefined,
          receiverContact: receiverName,
          receiverPhone: receiverPhone,
          weightKg: estWeightKg,
          estimatedDeliveryTime: estimatedDeliveryTime,
          dispatchedProducts: selectedOrderForDispatch.items,
        }
      );

      // Generate Printable Dispatch Manifest
      const manifest: DispatchManifestData = {
        dispatchRef: finalTrackingNumber,
        orderId: selectedOrderForDispatch.id,
        dispatchMethod: resolvedMethod,
        courierName: finalCourierName,
        trackingNumber: finalTrackingNumber,
        waybillNumber: finalTrackingNumber,
        driverName: dispatchType === 'company_driver' ? driverName : undefined,
        driverPhone: dispatchType === 'company_driver' ? driverPhone : undefined,
        vehiclePlateNo: dispatchType === 'company_driver' ? vehiclePlateNo : undefined,
        estimatedDeliveryTime: estimatedDeliveryTime,
        createdAt: new Date().toISOString(),
        sender: {
          companyName: 'The Marsh Bites Enterprise (Central Commissary)',
          hubName: 'Naga Central Commissary Hub',
          address: 'Zone 4, Concepcion Pequeña, Naga City, Camarines Sur (Bicol Hub)',
          contactPerson: 'Commissary Logistics Officer',
          phone: '+63 917 555 6274',
        },
        receiver: {
          branchName: selectedOrderForDispatch.branchName,
          managerName: receiverName || 'Store Manager',
          phone: receiverPhone,
          address: receiverAddress,
        },
        items: selectedOrderForDispatch.items.map((it) => ({
          itemName: it.productName,
          quantity: it.quantity,
          unitValue: it.unitPrice,
        })),
        totalPacks: totalPacks,
        declaredValue: selectedOrderForDispatch.totalAmount,
        packageWeightKg: estWeightKg,
        specialInstructions: deliveryNotes,
      };

      setShowDispatchModal(false);
      setActiveManifestData(manifest);
      showToast(
        'success',
        `Order #${selectedOrderForDispatch.id} successfully dispatched via ${finalCourierName}! Waybill/Ref: ${finalTrackingNumber}. Notice broadcast to ${selectedOrderForDispatch.branchName}.`
      );
    } catch (err: any) {
      showToast('error', err.message || 'Failed to dispatch shipment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // View Manifest for existing delivery
  const handleViewExistingManifest = (delivery: Delivery) => {
    const order = orders.find((o) => o.id === delivery.orderId);
    const branch = branches.find((b) => b.id === delivery.branchId);

    const items = order
      ? order.items.map((it) => ({
          itemName: it.productName,
          quantity: it.quantity,
          unitValue: it.unitPrice,
        }))
      : [];

    const totalPacks = items.reduce((s, it) => s + it.quantity, 0);

    const manifest: DispatchManifestData = {
      dispatchRef: delivery.trackingNumber || delivery.waybillNumber || delivery.id,
      orderId: delivery.orderId,
      dispatchMethod: delivery.dispatchMethod || 'company_driver',
      courierName: delivery.courierName,
      trackingNumber: delivery.trackingNumber,
      waybillNumber: delivery.waybillNumber,
      driverName: delivery.driverName,
      driverPhone: delivery.driverPhone,
      vehiclePlateNo: delivery.vehiclePlateNo,
      estimatedDeliveryTime: delivery.scheduledAt,
      createdAt: delivery.scheduledAt || new Date().toISOString(),
      sender: {
        companyName: 'The Marsh Bites Enterprise (Central Commissary)',
        hubName: 'Naga Central Commissary Hub',
        address: 'Zone 4, Concepcion Pequeña, Naga City, Camarines Sur',
        contactPerson: 'Commissary Logistics Officer',
        phone: '+63 917 555 6274',
      },
      receiver: {
        branchName: branch?.name || order?.branchName || 'Franchise Store',
        managerName: delivery.receiverContact || branch?.managerName || 'Store Manager',
        phone: delivery.receiverPhone || branch?.contactNumber || '',
        address: delivery.address,
      },
      items,
      totalPacks,
      declaredValue: order?.totalAmount || 12000,
      packageWeightKg: delivery.weightKg || 3.0,
      specialInstructions: delivery.notes,
    };

    setActiveManifestData(manifest);
  };

  // Cancel Delivery
  const handleConfirmCancel = () => {
    if (!cancelModalDelivery) return;
    try {
      cancelDelivery(cancelModalDelivery.id, cancelReason);
      showToast('info', `Shipment ${cancelModalDelivery.trackingNumber || cancelModalDelivery.id} canceled.`);
      setCancelModalDelivery(null);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to cancel shipment.');
    }
  };

  // Pending approved orders ready for dispatch
  const pendingDispatchOrders = orders.filter(
    (o) => (o.status === 'approved' || o.productionStage === 'ready_for_dispatch') && !o.isDispatched
  );

  // Filtered Deliveries List
  const filteredDeliveries = deliveries.filter((del) => {
    const branch = branches.find((b) => b.id === del.branchId);
    const matchesSearch =
      del.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (del.trackingNumber && del.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (del.waybillNumber && del.waybillNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (del.courierName && del.courierName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (branch && branch.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      del.address.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      activeTab === 'all'
        ? true
        : activeTab === 'pending'
        ? del.status === 'pending'
        : activeTab === 'inTransit'
        ? del.status === 'inTransit'
        : activeTab === 'delivered'
        ? del.status === 'delivered'
        : true;

    const isFleet = del.dispatchMethod === 'company_driver';
    const matchesMethod =
      methodFilter === 'all'
        ? true
        : methodFilter === 'company_driver'
        ? isFleet
        : !isFleet;

    return matchesSearch && matchesStatus && matchesMethod;
  });

  // Calculate Metrics
  const inTransitCount = deliveries.filter((d) => d.status === 'inTransit').length;
  const deliveredCount = deliveries.filter((d) => d.status === 'delivered').length;
  const fleetCount = deliveries.filter((d) => d.dispatchMethod === 'company_driver').length;
  const courierCount = deliveries.filter((d) => d.dispatchMethod !== 'company_driver').length;

  return (
    <div className="space-y-6">
      {/* Toast Notification Container */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-80 max-w-md p-4 rounded-2xl shadow-2xl border flex items-center space-x-3 transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : toast.type === 'error'
              ? 'bg-red-600 text-white border-red-500'
              : 'bg-sky-600 text-white border-sky-500'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : toast.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          ) : (
            <Sparkles className="w-5 h-5 shrink-0" />
          )}
          <p className="text-xs font-bold leading-snug">{toast.message}</p>
        </div>
      )}

      {/* Header Banner */}
      <div
        className={`p-6 rounded-3xl border relative overflow-hidden ${
          isDark
            ? 'bg-linear-to-r from-[#1c1c1c] via-[#221a14] to-[#1a1a1a] border-neutral-800'
            : 'bg-linear-to-r from-orange-50/70 via-sky-50/50 to-white border-neutral-200'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#F37021] text-white flex items-center space-x-1">
                <Truck className="w-3 h-3" />
                <span>CENTRAL COMMISSARY DISPATCH</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#80C7F2]/20 text-[#1a7bb5] dark:text-[#80C7F2] border border-[#80C7F2]/30">
                Naga City Hub (Camarines Sur)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                19+ Franchise Branches
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
              Commissary Dispatch & Logistics Center
            </h1>
            <p className="text-xs text-neutral-500 max-w-2xl">
              Dispatch approved franchise requisitions via In-House Logistics Fleet or Third-Party Couriers (J&T Express, LBC, Cargo). Generate official gate passes and notify branch managers in real time.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('pending')}
              className="px-4 py-2.5 rounded-xl bg-[#F37021] hover:bg-[#d85e15] text-white text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 cursor-pointer"
            >
              <Package className="w-4 h-4" />
              <span>Pending Orders ({pendingDispatchOrders.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div
          className={`p-4 rounded-2xl border ${
            isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-neutral-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Ready to Dispatch</span>
            <Package className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-500">{pendingDispatchOrders.length}</p>
          <p className="text-[11px] text-neutral-500 mt-0.5">Approved requisitions</p>
        </div>

        <div
          className={`p-4 rounded-2xl border ${
            isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-neutral-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Active In-Transit</span>
            <Clock className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-2xl font-black text-sky-500">{inTransitCount}</p>
          <p className="text-[11px] text-neutral-500 mt-0.5">En-route consignments</p>
        </div>

        <div
          className={`p-4 rounded-2xl border ${
            isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-neutral-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Delivered</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-500">{deliveredCount}</p>
          <p className="text-[11px] text-neutral-500 mt-0.5">Completed receiving</p>
        </div>

        <div
          className={`p-4 rounded-2xl border ${
            isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-neutral-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Fleet vs Courier</span>
            <Truck className="w-4 h-4 text-[#F37021]" />
          </div>
          <p className="text-2xl font-black text-neutral-900 dark:text-white">
            {fleetCount} <span className="text-sm font-normal text-neutral-400">/ {courierCount}</span>
          </p>
          <p className="text-[11px] text-neutral-500 mt-0.5">In-House vs Couriers</p>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            All Shipments ({deliveries.length})
          </button>

          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all relative cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-[#F37021] text-white shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <span>Ready for Dispatch</span>
            {pendingDispatchOrders.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white text-[#F37021] text-[10px] font-black">
                {pendingDispatchOrders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('inTransit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'inTransit'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            In Transit ({inTransitCount})
          </button>

          <button
            onClick={() => setActiveTab('delivered')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'delivered'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Delivered ({deliveredCount})
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Waybill, Ref, Branch..."
              className={`w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-[#80C7F2] ${
                isDark
                  ? 'bg-neutral-900 border-neutral-800 text-white placeholder-neutral-500'
                  : 'bg-white border-neutral-200 text-neutral-900 placeholder-neutral-400'
              }`}
            />
          </div>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as any)}
            className={`px-3 py-1.5 rounded-xl text-xs border font-medium focus:outline-none ${
              isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
            }`}
          >
            <option value="all">All Methods</option>
            <option value="company_driver">In-House Fleet</option>
            <option value="courier">Courier / Partner</option>
          </select>
        </div>
      </div>

      {/* READY FOR DISPATCH ORDERS SECTION */}
      {activeTab === 'pending' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              Approved Franchise Requisitions Awaiting Dispatch ({pendingDispatchOrders.length})
            </h3>
            <span className="text-xs text-neutral-400">
              Select an order to dispatch via In-House Fleet or Third-Party Courier.
            </span>
          </div>

          {pendingDispatchOrders.length === 0 ? (
            <div
              className={`p-12 text-center rounded-3xl border ${
                isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200'
              }`}
            >
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-bold">All Approved Orders Dispatched</p>
              <p className="text-xs text-neutral-400 mt-1">
                There are no approved orders pending dispatch at this time.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingDispatchOrders.map((ord) => {
                const totalPacks = ord.items.reduce((s, i) => s + i.quantity, 0);
                const branch = branches.find((b) => b.id === ord.branchId);

                return (
                  <div
                    key={ord.id}
                    className={`p-5 rounded-3xl border transition-all space-y-4 ${
                      isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-mono font-bold text-neutral-500">#{ord.id}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                            Ready for Dispatch
                          </span>
                        </div>
                        <h4 className="text-base font-black text-neutral-900 dark:text-white mt-1">
                          {ord.branchName}
                        </h4>
                        <p className="text-xs text-neutral-500 flex items-center space-x-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-[#F37021] shrink-0" />
                          <span>{branch?.location || branch?.address || 'Branch Location'}</span>
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-base font-black text-emerald-600 dark:text-emerald-400 block">
                          ₱{ord.totalAmount.toLocaleString()}
                        </span>
                        <span className="text-[11px] font-bold text-neutral-400">
                          {totalPacks} units (pouches)
                        </span>
                      </div>
                    </div>

                    {/* Itemized preview */}
                    <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800 text-xs space-y-1">
                      <div className="flex items-center justify-between text-neutral-400 text-[11px] font-bold uppercase mb-1">
                        <span>Packaged Items</span>
                        <span>Quantity</span>
                      </div>
                      {ord.items.slice(0, 3).map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between text-neutral-700 dark:text-neutral-300">
                          <span className="truncate max-w-[200px]">{it.productName}</span>
                          <span className="font-bold">{it.quantity} packs</span>
                        </div>
                      ))}
                      {ord.items.length > 3 && (
                        <p className="text-[10px] text-neutral-400 italic pt-1">
                          +{ord.items.length - 3} more flavors/items
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
                      <span className="text-[11px] text-neutral-400">
                        Approved on: {new Date(ord.createdAt).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => handleOpenDispatchForOrder(ord)}
                        className="px-4 py-2 rounded-xl bg-[#F37021] hover:bg-[#d85e15] text-white text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Dispatch Consignment</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* DELIVERIES LIST TABLE */
        <div className="space-y-3">
          {filteredDeliveries.length === 0 ? (
            <div
              className={`p-12 text-center rounded-3xl border ${
                isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200'
              }`}
            >
              <Package className="w-12 h-12 text-neutral-400 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-bold">No Shipments Found</p>
              <p className="text-xs text-neutral-400 mt-1">
                Try clearing search query or switching tabs.
              </p>
            </div>
          ) : (
            filteredDeliveries.map((del) => {
              const branch = branches.find((b) => b.id === del.branchId);
              const isFleet = del.dispatchMethod === 'company_driver';
              const trackingNo = del.trackingNumber || del.waybillNumber || del.id;
              const isJT = del.courierName?.toLowerCase().includes('j&t');

              return (
                <div
                  key={del.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3 ${
                    isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {isFleet ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#F37021]/15 text-[#F37021] border border-[#F37021]/30 flex items-center space-x-1">
                            <Truck className="w-3 h-3" />
                            <span>IN-HOUSE FLEET</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 flex items-center space-x-1">
                            <Package className="w-3 h-3" />
                            <span>{del.courierName.toUpperCase()}</span>
                          </span>
                        )}

                        <div className="flex items-center space-x-1">
                          <span className="font-mono text-xs font-bold text-neutral-900 dark:text-white">
                            {trackingNo}
                          </span>
                          {isJT && (
                            <a
                              href={JT_EXPRESS_TRACKING_URL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] font-bold text-red-600 hover:underline flex items-center space-x-0.5 ml-1"
                              title="Carrier Portal"
                            >
                              <span>Carrier Site</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            del.status === 'delivered'
                              ? 'bg-emerald-500/15 text-emerald-600'
                              : del.status === 'inTransit'
                              ? 'bg-sky-500/15 text-sky-600'
                              : del.status === 'canceled'
                              ? 'bg-red-500/15 text-red-600'
                              : 'bg-amber-500/15 text-amber-600'
                          }`}
                        >
                          {del.status === 'inTransit'
                            ? 'In Transit'
                            : del.status === 'delivered'
                            ? 'Delivered'
                            : del.status === 'canceled'
                            ? 'Canceled'
                            : 'Pending'}
                        </span>

                        <span className="text-xs text-neutral-400">Order #{del.orderId}</span>
                      </div>

                      <h4 className="text-sm font-black text-neutral-900 dark:text-white">
                        {branch?.name || 'Destination Store'}
                      </h4>

                      <p className="text-xs text-neutral-500 flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-[#F37021] shrink-0" />
                        <span>{del.address}</span>
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTrackingNumber(trackingNo);
                          setActiveTrackingOrder({ id: del.orderId, branch: branch?.name || 'Branch' });
                        }}
                        className="px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5 text-sky-500" />
                        <span>Details</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleViewExistingManifest(del)}
                        className="px-3 py-1.5 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 text-xs font-bold transition-all flex items-center space-x-1.5 shadow-xs cursor-pointer"
                        title="Print Gate Pass / Dispatch Slip"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Gate Pass</span>
                      </button>

                      {del.status === 'inTransit' && (
                        <button
                          type="button"
                          onClick={() => {
                            updateDeliveryStatus(del.id, 'delivered');
                            showToast('success', `Delivery ${trackingNo} marked as Delivered!`);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                          Mark Delivered
                        </button>
                      )}

                      {del.status !== 'delivered' && del.status !== 'canceled' && (
                        <button
                          type="button"
                          onClick={() => setCancelModalDelivery(del)}
                          className="p-1.5 rounded-xl text-neutral-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Cancel Dispatch"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Details Bar */}
                  <div className="pt-2.5 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-between text-xs text-neutral-500 gap-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <span>
                        Carrier: <strong className="text-neutral-700 dark:text-neutral-300">{del.courierName}</strong>
                      </span>
                      {del.driverName && (
                        <span>
                          Driver: <strong className="text-neutral-700 dark:text-neutral-300">{del.driverName}</strong>
                          {del.vehiclePlateNo ? ` (${del.vehiclePlateNo})` : ''}
                        </span>
                      )}
                    </div>
                    <div>
                      <span>
                        ETD:{' '}
                        <strong className="text-neutral-700 dark:text-neutral-300">
                          {new Date(del.scheduledAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* NORMAL DISPATCH CREATION MODAL */}
      {showDispatchModal && selectedOrderForDispatch && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div
            className={`w-full max-w-xl max-h-[95vh] flex flex-col rounded-3xl p-6 shadow-2xl border my-auto ${
              isDark ? 'bg-[#1c1c1c] border-neutral-700 text-white' : 'bg-white border-neutral-200 text-neutral-900'
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3 shrink-0">
              <div>
                <div className="flex items-center space-x-2">
                  <Truck className="w-5 h-5 text-[#F37021]" />
                  <h3 className="text-base font-black">Dispatch Consignment</h3>
                </div>
                <p className="text-xs text-neutral-500">
                  Order #{selectedOrderForDispatch.id} • {selectedOrderForDispatch.branchName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDispatchModal(false)}
                className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleExecuteDispatch} className="overflow-y-auto space-y-4 py-4 pr-1">
              {/* Method Selector: In-House Fleet vs Third-Party Courier */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Logistics & Dispatch Method
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => {
                      setDispatchType('company_driver');
                      setTrackingOrPlate(`TRIP-NGA-${selectedOrderForDispatch.id}`);
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                      dispatchType === 'company_driver'
                        ? 'bg-[#F37021] text-white shadow-md'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    <Truck className="w-4 h-4" />
                    <span>In-House Commissary Fleet</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDispatchType('courier');
                      setTrackingOrPlate(selectedOrderForDispatch.trackingNumber || '');
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                      dispatchType === 'courier'
                        ? 'bg-sky-600 text-white shadow-md'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    <Package className="w-4 h-4" />
                    <span>Third-Party Courier</span>
                  </button>
                </div>
              </div>

              {/* Courier Specific Fields */}
              {dispatchType === 'courier' && (
                <div className="p-4 rounded-2xl bg-sky-500/5 border border-sky-500/20 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                        Courier Partner
                      </label>
                      <select
                        value={courierName}
                        onChange={(e) => setCourierName(e.target.value)}
                        className={`w-full p-2.5 rounded-xl text-xs font-bold border focus:outline-none ${
                          isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-neutral-300'
                        }`}
                      >
                        {COMMON_COURIERS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    {courierName === 'Other Courier' && (
                      <div>
                        <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                          Custom Courier Name
                        </label>
                        <input
                          type="text"
                          required
                          value={customCourierName}
                          onChange={(e) => setCustomCourierName(e.target.value)}
                          placeholder="e.g. DLTB Cargo / NinjaVan"
                          className={`w-full p-2.5 rounded-xl text-xs border ${
                            isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-neutral-300'
                          }`}
                        />
                      </div>
                    )}

                    <div className={courierName === 'Other Courier' ? 'sm:col-span-2' : ''}>
                      <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                        Waybill / Tracking Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={trackingOrPlate}
                        onChange={(e) => setTrackingOrPlate(e.target.value)}
                        placeholder="e.g. 782910384912"
                        className={`w-full p-2.5 rounded-xl text-xs font-mono font-bold border focus:outline-none focus:ring-1 focus:ring-sky-500 ${
                          isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-neutral-300'
                        }`}
                      />
                      <p className="text-[10px] text-neutral-400 mt-1">
                        From physical waybill receipt issued by courier.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* In-House Fleet Specific Fields */}
              {dispatchType === 'company_driver' && (
                <div className="p-4 rounded-2xl bg-[#F37021]/5 border border-[#F37021]/20 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                        Assigned Driver Name
                      </label>
                      <input
                        type="text"
                        required
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                        placeholder="e.g. Mang Robert"
                        className={`w-full p-2.5 rounded-xl text-xs border ${
                          isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-neutral-300'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                        Vehicle Plate Number
                      </label>
                      <input
                        type="text"
                        required
                        value={vehiclePlateNo}
                        onChange={(e) => setVehiclePlateNo(e.target.value)}
                        placeholder="e.g. BCO-8821"
                        className={`w-full p-2.5 rounded-xl text-xs border font-mono ${
                          isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-neutral-300'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                        Driver Contact Phone
                      </label>
                      <input
                        type="text"
                        value={driverPhone}
                        onChange={(e) => setDriverPhone(e.target.value)}
                        placeholder="+63 917..."
                        className={`w-full p-2.5 rounded-xl text-xs border ${
                          isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-neutral-300'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                        Trip Ticket / Dispatch Ref #
                      </label>
                      <input
                        type="text"
                        value={trackingOrPlate}
                        onChange={(e) => setTrackingOrPlate(e.target.value)}
                        placeholder="e.g. TRIP-NGA-001"
                        className={`w-full p-2.5 rounded-xl text-xs border font-mono ${
                          isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-neutral-300'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Schedule & Recipient Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Estimated Time of Delivery (ETD) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={estimatedDeliveryTime}
                    onChange={(e) => setEstimatedDeliveryTime(e.target.value)}
                    className={`w-full p-2.5 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-neutral-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Store Manager Contact
                  </label>
                  <input
                    type="text"
                    required
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder="Store Manager Name"
                    className={`w-full p-2.5 rounded-xl text-xs border ${
                      isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-neutral-300'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Branch Destination Address
                </label>
                <input
                  type="text"
                  required
                  value={receiverAddress}
                  onChange={(e) => setReceiverAddress(e.target.value)}
                  className={`w-full p-2.5 rounded-xl text-xs border ${
                    isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-neutral-300'
                  }`}
                />
              </div>

              {/* Read-Only Consignment Summary */}
              <div className="p-3.5 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold uppercase tracking-wider text-neutral-500">
                    Consignment Cargo Summary
                  </span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">
                    {selectedOrderForDispatch.items.reduce((s, it) => s + it.quantity, 0)} Units Total
                  </span>
                </div>

                <div className="max-h-28 overflow-y-auto divide-y divide-neutral-200 dark:divide-neutral-800 text-xs">
                  {selectedOrderForDispatch.items.map((it, idx) => (
                    <div key={idx} className="py-1 flex items-center justify-between">
                      <span className="text-neutral-700 dark:text-neutral-300 truncate max-w-[240px]">
                        {it.productName}
                      </span>
                      <span className="font-bold text-neutral-900 dark:text-white">
                        {it.quantity} packs
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Handling Notes */}
              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1">
                  Handling Instructions
                </label>
                <textarea
                  rows={2}
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="Perishable gourmet marshmallows..."
                  className={`w-full p-2.5 rounded-xl text-xs border ${
                    isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-neutral-300'
                  }`}
                />
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowDispatchModal(false)}
                  className="px-4 py-2 font-medium text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 font-black text-xs rounded-xl text-white bg-[#F37021] hover:bg-[#d85e15] transition-all shadow-md flex items-center space-x-2 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Confirm Dispatch & Print Gate Pass</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCEL SHIPMENT MODAL */}
      {cancelModalDelivery && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div
            className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border ${
              isDark ? 'bg-[#1c1c1c] border-neutral-700 text-white' : 'bg-white border-neutral-200 text-neutral-900'
            }`}
          >
            <div className="flex items-center space-x-2 text-red-500 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold">Cancel Dispatch Record</h3>
            </div>
            <p className="text-xs text-neutral-500 mb-3">
              Are you sure you want to cancel delivery for Order #{cancelModalDelivery.orderId} (
              {cancelModalDelivery.waybillNumber || cancelModalDelivery.trackingNumber})? This will revert the order status to approved.
            </p>

            <div className="space-y-1 mb-4">
              <label className="text-[11px] font-bold text-neutral-400">Cancellation Reason</label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation..."
                className={`w-full p-2 rounded-xl text-xs border ${
                  isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-neutral-300'
                }`}
              />
            </div>

            <div className="flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setCancelModalDelivery(null)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-neutral-300 dark:border-neutral-700 cursor-pointer"
              >
                Keep Active
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-4 py-1.5 text-xs font-bold rounded-xl bg-red-600 text-white hover:bg-red-700 cursor-pointer"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELIVERY DETAILS MODAL */}
      {activeTrackingNumber && (
        <JTTrackingModal
          trackingNumber={activeTrackingNumber}
          orderId={activeTrackingOrder?.id}
          branchName={activeTrackingOrder?.branch}
          themeMode={themeMode}
          onClose={() => {
            setActiveTrackingNumber(null);
            setActiveTrackingOrder(null);
          }}
        />
      )}

      {/* PRINTABLE GATE PASS / MANIFEST MODAL */}
      {activeManifestData && (
        <JTShippingLabel
          labelData={activeManifestData}
          onClose={() => setActiveManifestData(null)}
        />
      )}
    </div>
  );
};

export default AdminDispatch;
