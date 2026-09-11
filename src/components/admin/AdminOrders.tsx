import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Order, OrderStatus, DispatchMethod } from '../../types';
import {
  ShoppingBag,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Image as ImageIcon,
  Truck,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  FileText,
  Trash2,
  Sparkles,
  ArrowUpDown,
  Archive,
  Zap,
  Printer,
  ShieldCheck,
  CreditCard,
  Package,
} from 'lucide-react';
import {
  DispatchManifestData,
  JTShippingLabel,
} from '../common/JTShippingLabel';
import { JTTrackingModal } from '../common/JTTrackingModal';
import { AdminPaymentVerificationQueue } from './AdminPaymentVerificationQueue';

export const AdminOrders: React.FC = () => {
  const {
    orders,
    branches,
    approveOrder,
    rejectOrder,
    deleteOrder,
    archiveOrder,
    createDelivery,
    deliveries,
    themeMode,
  } = useData();

  const [activeMainSubTab, setActiveMainSubTab] = useState<'requisitions' | 'payments'>('requisitions');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'branch_asc' | 'amount_desc' | 'amount_asc' | 'status'>('date_desc');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Modals & Confirmations
  const [showApproveConfirmModal, setShowApproveConfirmModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [dispatchMethod, setDispatchMethod] = useState<DispatchMethod>('company_driver');
  const [courierName, setCourierName] = useState('In-House Commissary Fleet');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [estimatedDeliveryTime, setEstimatedDeliveryTime] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [packageWeightKg, setPackageWeightKg] = useState<number>(3.5);
  const [driverName, setDriverName] = useState('Mang Robert (Fleet Van 01)');
  const [deliveryNotes, setDeliveryNotes] = useState('Keep dry, gourmet marshmallows. Temperature sensitive.');
  const [isSubmittingDispatch, setIsSubmittingDispatch] = useState(false);
  const [activeManifestData, setActiveManifestData] = useState<DispatchManifestData | null>(null);
  const [activeTrackingNumber, setActiveTrackingNumber] = useState<string | null>(null);
  const [activeTrackingOrder, setActiveTrackingOrder] = useState<{ id: string; branch: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const isDark = themeMode === 'dark';

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const readyForDispatchOrders = orders.filter(
    (o) =>
      (o.status === 'approved' || (o.productionStage as string) === 'ready_for_dispatch') &&
      (o.productionStage === 'ready_for_dispatch' || (o.productionStage as string) === 'ready') &&
      !o.isDispatched &&
      o.status !== 'completed' &&
      o.status !== 'rejected'
  );

  const filteredOrders = orders
    .filter((o) => {
      let matchesStatus = true;
      if (statusFilter === 'archived') {
        matchesStatus = o.isArchived === true || o.status === 'completed';
      } else if (statusFilter === 'active') {
        matchesStatus = !o.isArchived && o.status !== 'completed';
      } else if (statusFilter === 'ready_for_dispatch') {
        matchesStatus =
          (o.status === 'approved' || (o.productionStage as string) === 'ready_for_dispatch') &&
          (o.productionStage === 'ready_for_dispatch' || (o.productionStage as string) === 'ready') &&
          !o.isDispatched &&
          o.status !== 'completed' &&
          o.status !== 'rejected';
      } else if (statusFilter !== 'all') {
        matchesStatus = o.status === statusFilter;
      }

      const matchesSearch =
        o.branchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'date_asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'branch_asc') return a.branchName.localeCompare(b.branchName);
      if (sortBy === 'amount_desc') return b.totalAmount - a.totalAmount;
      if (sortBy === 'amount_asc') return a.totalAmount - b.totalAmount;
      if (sortBy === 'status') return a.status.localeCompare(b.status);
      return 0;
    });

  const handleConfirmApprove = () => {
    if (!selectedOrder) return;
    try {
      approveOrder(selectedOrder.id);
      setSelectedOrder({
        ...selectedOrder,
        status: 'approved',
        productionStage: 'ready_for_dispatch',
      });
      setShowApproveConfirmModal(false);
      showToast(`Order #${selectedOrder.id} for ${selectedOrder.branchName} approved successfully!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Approval failed', 'error');
    }
  };

  const handleConfirmDelete = () => {
    if (!selectedOrder) return;
    const deletedId = selectedOrder.id;
    const branchName = selectedOrder.branchName;
    deleteOrder(deletedId);
    setShowDeleteConfirmModal(false);
    setSelectedOrder(null);
    showToast(`Order #${deletedId} for ${branchName} has been deleted.`, 'info');
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !rejectionReason.trim()) return;
    rejectOrder(selectedOrder.id, rejectionReason.trim());
    setSelectedOrder({
      ...selectedOrder,
      status: 'rejected',
      rejectionReason: rejectionReason.trim(),
    });
    setShowRejectModal(false);
    setRejectionReason('');
    showToast(`Order #${selectedOrder.id} has been marked as rejected.`, 'info');
  };

  const handleCreateDeliverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    const isFleet = dispatchMethod === 'company_driver';
    const finalCourierName = isFleet ? 'In-House Commissary Fleet' : (courierName || 'J&T Express');

    if (!isFleet && (!trackingNumber || trackingNumber.trim().length === 0)) {
      showToast('Please enter the Waybill / Tracking Number.', 'error');
      return;
    }
    if (!estimatedDeliveryTime || estimatedDeliveryTime.trim().length === 0) {
      showToast('Please enter the Estimated Time of Delivery (ETD).', 'error');
      return;
    }
    if (!deliveryAddress || deliveryAddress.trim().length < 5) {
      showToast('Please enter a complete branch destination address.', 'error');
      return;
    }

    try {
      setIsSubmittingDispatch(true);

      const cleanTrackingNo =
        trackingNumber.trim() ||
        (isFleet ? `TRIP-NGA-${selectedOrder.id}` : `MB-TRACK-${Date.now().toString().slice(-6)}`);
      const cleanETD = estimatedDeliveryTime.trim();

      createDelivery(
        selectedOrder.id,
        deliveryAddress,
        finalCourierName,
        cleanTrackingNo,
        cleanETD,
        deliveryNotes,
        {
          dispatchMethod,
          waybillNumber: cleanTrackingNo,
          driverName: isFleet ? driverName : undefined,
          receiverContact: receiverName || `${selectedOrder.branchName} Manager`,
          receiverPhone: receiverPhone,
          weightKg: packageWeightKg,
          estimatedDeliveryTime: cleanETD,
          dispatchedProducts: selectedOrder.items,
        }
      );

      const manifestData: DispatchManifestData = {
        dispatchRef: cleanTrackingNo,
        orderId: selectedOrder.id,
        dispatchMethod: dispatchMethod,
        courierName: finalCourierName,
        trackingNumber: cleanTrackingNo,
        waybillNumber: cleanTrackingNo,
        driverName: isFleet ? driverName : undefined,
        estimatedDeliveryTime: cleanETD,
        createdAt: new Date().toISOString(),
        sender: {
          companyName: 'The Marsh Bites Enterprise (Central Commissary)',
          hubName: 'Naga Central Commissary Hub',
          address: 'Zone 4, Concepcion Pequeña, Naga City, Camarines Sur',
          contactPerson: 'Commissary Logistics Officer',
          phone: '+63 917 555 6274',
        },
        receiver: {
          branchName: selectedOrder.branchName,
          managerName: receiverName || `${selectedOrder.branchName} Store Manager`,
          phone: receiverPhone,
          address: deliveryAddress,
        },
        items: selectedOrder.items.map((it) => ({
          itemName: it.productName,
          quantity: it.quantity,
          unitValue: it.unitPrice,
        })),
        totalPacks: selectedOrder.items.reduce((s, it) => s + it.quantity, 0),
        declaredValue: selectedOrder.totalAmount,
        packageWeightKg: packageWeightKg,
        specialInstructions: deliveryNotes,
      };

      setShowDeliveryModal(false);
      setActiveManifestData(manifestData);
      showToast(
        `Order #${selectedOrder.id} dispatched via ${finalCourierName}! Ref/Waybill: ${cleanTrackingNo}`,
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Dispatch creation failed', 'error');
    } finally {
      setIsSubmittingDispatch(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-70 flex items-center space-x-2 px-4 py-3 rounded-2xl shadow-xl border bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white border-neutral-200 dark:border-neutral-800 text-xs font-semibold animate-in fade-in duration-200">
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : toastMessage.type === 'error' ? (
            <XCircle className="w-4 h-4 text-red-500 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-sky-500 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main Sub-Tab Switcher */}
      <div className="flex items-center space-x-2 border-b border-neutral-200 dark:border-neutral-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveMainSubTab('requisitions')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
            activeMainSubTab === 'requisitions'
              ? 'bg-[#F37021] text-white shadow-xs'
              : isDark
              ? 'bg-neutral-900 text-neutral-400 hover:text-white'
              : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Requisitions & Dispatch Management</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainSubTab('payments')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
            activeMainSubTab === 'payments'
              ? 'bg-[#F37021] text-white shadow-xs'
              : isDark
              ? 'bg-neutral-900 text-neutral-400 hover:text-white'
              : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Proof of Payment (PoP) Queue</span>
          {orders.filter((o) => !!o.proofImagePath && o.status === 'waitingApproval').length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white text-[#F37021]">
              {orders.filter((o) => !!o.proofImagePath && o.status === 'waitingApproval').length}
            </span>
          )}
        </button>
      </div>

      {activeMainSubTab === 'payments' ? (
        <div className="animate-in fade-in duration-200">
          <AdminPaymentVerificationQueue />
        </div>
      ) : (
        <>
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight">Branch Stock Orders</h1>
              <p className="text-xs text-neutral-500 font-medium">
                Review stock requisitions, verify proof of payment, and dispatch deliveries.
              </p>
            </div>

            {/* Filter Badges */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
              {[
                { id: 'all', label: 'All Orders' },
                {
                  id: 'ready_for_dispatch',
                  label: `Ready for Dispatch ${readyForDispatchOrders.length > 0 ? `(${readyForDispatchOrders.length})` : ''}`.trim(),
                  highlight: readyForDispatchOrders.length > 0,
                },
                { id: 'waitingApproval', label: 'Payment Uploaded' },
                { id: 'pending', label: 'Pending' },
                { id: 'approved', label: 'Approved' },
                { id: 'archived', label: 'Archived / Fulfilled' },
                { id: 'rejected', label: 'Rejected' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    statusFilter === f.id
                      ? 'bg-[#F37021] text-white shadow-xs'
                      : f.highlight
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
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

      {/* Ready for Delivery Dispatch Notification Banner for Orders & Approvals */}
      {readyForDispatchOrders.length > 0 && (
        <div
          className={`p-4 sm:p-5 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all animate-in fade-in duration-300 ${
            isDark
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          <div className="flex items-start sm:items-center space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <Truck className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Commissary Dispatch Notice
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white shadow-xs">
                  {readyForDispatchOrders.length} Ready for Delivery
                </span>
              </div>
              <p className="text-sm font-bold mt-0.5">
                {readyForDispatchOrders.length === 1
                  ? `Order #${readyForDispatchOrders[0].id} (${readyForDispatchOrders[0].branchName}) has completed kitchen packaging and is ready for dispatch.`
                  : `${readyForDispatchOrders.length} branch requisitions are finished & packed at the commissary and ready for courier / fleet delivery.`}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setStatusFilter('ready_for_dispatch')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm cursor-pointer flex items-center space-x-1.5"
            >
              <span>View {readyForDispatchOrders.length} Ready Orders</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Search & Sort Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-3 relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by branch name, package or order ID..."
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#80C7F2] ${
              isDark
                ? 'bg-[#161616] border-neutral-800 text-white placeholder-neutral-500'
                : 'bg-white border-neutral-200 text-neutral-900 placeholder-neutral-400'
            }`}
          />
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
            <ArrowUpDown className="w-4 h-4" />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-[#80C7F2] ${
              isDark
                ? 'bg-[#161616] border-neutral-800 text-white'
                : 'bg-white border-neutral-200 text-neutral-900'
            }`}
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="branch_asc">Branch Name (A-Z)</option>
            <option value="amount_desc">Highest Amount</option>
            <option value="amount_asc">Lowest Amount</option>
            <option value="status">By Status</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className={`p-12 text-center rounded-3xl border ${
            isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200'
          }`}>
            <ShoppingBag className="w-12 h-12 text-neutral-400 mx-auto mb-3 opacity-60" />
            <p className="text-sm font-bold">No orders found</p>
            <p className="text-xs text-neutral-500 mt-1">Try selecting a different filter or search keyword.</p>
          </div>
        ) : (
          filteredOrders.map((ord) => {
            const hasDelivery = deliveries.some((d) => d.orderId === ord.id);
            return (
              <div
                key={ord.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isDark ? 'bg-[#161616] border-neutral-800 hover:border-neutral-700' : 'bg-white border-neutral-200 hover:border-[#80C7F2]/40 shadow-xs'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-sm sm:text-base">{ord.branchName}</span>
                    <span className="text-xs font-mono text-neutral-400">#{ord.id}</span>
                    {ord.batchCode && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#80C7F2]/15 text-[#1a7bb5] dark:text-[#80C7F2] border border-[#80C7F2]/30">
                        Batch: {ord.batchCode}
                      </span>
                    )}
                    {ord.packageName && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center space-x-1">
                        <Sparkles className="w-3 h-3" />
                        <span>{ord.packageName}</span>
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
                      {ord.status === 'waitingApproval' ? 'Payment Uploaded' : ord.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
                    <span>
                      {ord.items.reduce((sum, i) => sum + i.quantity, 0)} units ({ord.items.length} flavor types)
                    </span>
                    <span>•</span>
                    <span>{new Date(ord.createdAt).toLocaleString()}</span>
                    {ord.proofImagePath && (
                      <span className="inline-flex items-center space-x-1 text-[#80C7F2] font-semibold">
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Proof Attached</span>
                      </span>
                    )}
                    {hasDelivery && (
                      <span className="inline-flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                        <Truck className="w-3.5 h-3.5" />
                        <span>Dispatched</span>
                      </span>
                    )}
                    {(ord.productionStage === 'ready_for_dispatch' || (ord.productionStage as string) === 'ready') && !hasDelivery && !ord.isDispatched && ord.status === 'approved' && (
                      <span className="inline-flex items-center space-x-1 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-lg animate-pulse">
                        <Truck className="w-3 h-3" />
                        <span>Ready for Delivery Dispatch</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end space-x-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100 dark:border-neutral-800">
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-neutral-400">Total Amount</p>
                    <p className="text-base font-black text-emerald-600 dark:text-emerald-400">
                      ₱{ord.totalAmount.toLocaleString()}
                    </p>
                  </div>

                  {(ord.productionStage === 'ready_for_dispatch' || (ord.productionStage as string) === 'ready') && !hasDelivery && !ord.isDispatched && ord.status === 'approved' && (
                    <button
                      onClick={() => {
                        setSelectedOrder(ord);
                        const branch = branches.find((b) => b.id === ord.branchId);
                        setReceiverName(branch?.managerName || `${ord.branchName} Store Manager`);
                        setReceiverPhone(branch?.managerPhone || branch?.contactNumber || '+63 917 555 0192');
                        setDeliveryAddress(branch?.address || branch?.location || `${ord.branchName} Station`);
                        const totalPacks = ord.items.reduce((s, i) => s + i.quantity, 0);
                        setPackageWeightKg(Math.max(1.5, Math.round(totalPacks * 0.12 * 10) / 10));
                        setShowDeliveryModal(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center space-x-1 cursor-pointer"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Dispatch</span>
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedOrder(ord)}
                    className="px-3.5 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-[#80C7F2]/20 hover:text-[#1a7bb5] dark:hover:text-[#80C7F2] text-xs font-bold transition-colors flex items-center space-x-1 cursor-pointer"
                  >
                    <span>Inspect</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto">
          <div className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl p-6 shadow-2xl border my-auto ${
            isDark ? 'bg-[#1c1c1c] border-neutral-700 text-white' : 'bg-white border-neutral-200 text-neutral-900'
          }`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-4 shrink-0">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono text-neutral-400">ORDER #{selectedOrder.id}</span>
                  {selectedOrder.packageName && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                      {selectedOrder.packageName}
                    </span>
                  )}
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedOrder.status === 'approved'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : selectedOrder.status === 'waitingApproval'
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      : selectedOrder.status === 'rejected'
                      ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                      : 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                  }`}>
                    {selectedOrder.status === 'waitingApproval' ? 'Payment Uploaded' : selectedOrder.status}
                  </span>
                </div>
                <h2 className="text-xl font-bold">{selectedOrder.branchName}</h2>
                <p className="text-xs text-neutral-500">
                  Submitted {new Date(selectedOrder.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="overflow-y-auto pr-1 py-4 space-y-5">
              {/* Ready for Dispatch Status Banner */}
              {(selectedOrder.productionStage === 'ready_for_dispatch' || (selectedOrder.productionStage as string) === 'ready') && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-extrabold text-emerald-600 dark:text-emerald-400">
                        Commissary Kitchen Packaging Complete
                      </p>
                      <p className="text-[11px] text-neutral-600 dark:text-neutral-300">
                        This order has finished kettle whipping, slab curing, and QC bagging at the Bicol kitchen. It is READY FOR DISPATCH.
                      </p>
                    </div>
                  </div>
                  {!selectedOrder.isDispatched && !deliveries.some((d) => d.orderId === selectedOrder.id) && (
                    <button
                      onClick={() => {
                        const branch = branches.find((b) => b.id === selectedOrder.branchId);
                        setReceiverName(branch?.managerName || `${selectedOrder.branchName} Store Manager`);
                        setReceiverPhone(branch?.managerPhone || branch?.contactNumber || '+63 917 555 0192');
                        setDeliveryAddress(branch?.address || branch?.location || `${selectedOrder.branchName} Station`);
                        const totalPacks = selectedOrder.items.reduce((s, i) => s + i.quantity, 0);
                        setPackageWeightKg(Math.max(1.5, Math.round(totalPacks * 0.12 * 10) / 10));
                        setShowDeliveryModal(true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer flex items-center justify-center space-x-1"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Dispatch Delivery</span>
                    </button>
                  )}
                </div>
              )}

              {/* Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    Order Items & Flavor Breakdown
                  </h3>
                  <span className="text-xs font-semibold text-neutral-500">
                    {selectedOrder.items.reduce((sum, item) => sum + item.quantity, 0)} Total Units
                  </span>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {selectedOrder.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 text-xs"
                    >
                      <div>
                        <p className="font-bold text-neutral-900 dark:text-neutral-100">{item.productName}</p>
                        <p className="text-neutral-500">₱{item.unitPrice} each</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-neutral-800 dark:text-neutral-200">x {item.quantity} units</p>
                        <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                          ₱{(item.quantity * item.unitPrice).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  <div className="flex items-center space-x-2">
                    <span>Total Order Value:</span>
                    <span className="text-xs font-normal opacity-80">
                      ({selectedOrder.items.reduce((sum, item) => sum + item.quantity, 0)} units)
                    </span>
                  </div>
                  <span className="text-lg font-black">₱{selectedOrder.totalAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* Proof of Payment Preview */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                  Payment Proof Attachment
                </h3>
                {selectedOrder.proofImagePath ? (
                  <div className="p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
                    <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Proof of Payment Uploaded by Branch</span>
                    </div>
                    <div className="rounded-xl overflow-hidden max-h-52 bg-neutral-950 border border-neutral-700/50 flex items-center justify-center">
                      <img
                        src={selectedOrder.proofImagePath}
                        alt="Proof of Payment"
                        className="max-h-52 w-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-xs text-amber-600 dark:text-amber-400 space-y-1">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 shrink-0 text-amber-500" />
                      <span>No proof of payment uploaded yet by branch manager.</span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-amber-700 dark:text-amber-300 font-semibold pl-6">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Payment proof required before approval.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Rejection reason display */}
              {selectedOrder.rejectionReason && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
                  <p className="font-bold">Rejection Note:</p>
                  <p className="mt-0.5">{selectedOrder.rejectionReason}</p>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center space-x-2 self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirmModal(true)}
                  className="px-3 py-2 rounded-xl text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10 font-bold transition-colors flex items-center space-x-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Order</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    archiveOrder(selectedOrder.id);
                    setSelectedOrder({ ...selectedOrder, isArchived: !selectedOrder.isArchived });
                    showToast(selectedOrder.isArchived ? `Order #${selectedOrder.id} unarchived` : `Order #${selectedOrder.id} moved to archive`);
                  }}
                  className="px-3 py-2 rounded-xl text-xs text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-bold transition-colors flex items-center space-x-1.5 border border-neutral-200 dark:border-neutral-700"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>{selectedOrder.isArchived ? 'Unarchive' : 'Archive'}</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                {selectedOrder.status !== 'approved' && (
                  <>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="px-3.5 py-2 text-xs font-bold rounded-xl border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      Reject Order
                    </button>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                      {!selectedOrder.proofImagePath && (
                        <span className="text-[11px] text-amber-500 dark:text-amber-400 font-semibold flex items-center space-x-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Payment proof required before approval.</span>
                        </span>
                      )}
                      <button
                        disabled={!selectedOrder.proofImagePath}
                        onClick={() => setShowApproveConfirmModal(true)}
                        className={`px-4 py-2 text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center space-x-1.5 ${
                          selectedOrder.proofImagePath
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer'
                            : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed border border-neutral-300 dark:border-neutral-700'
                        }`}
                        title={!selectedOrder.proofImagePath ? 'Payment proof required before approval.' : 'Approve Order'}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Approve & Release Stock</span>
                      </button>
                    </div>
                  </>
                )}

                {selectedOrder.status === 'approved' && (() => {
                  const isReadyForDispatch = selectedOrder.productionStage === 'ready_for_dispatch' || (selectedOrder.productionStage as string) === 'ready';
                  const relDel = deliveries.find((d) => d.orderId === selectedOrder.id);
                  const isJT = relDel?.dispatchMethod === 'jt_express' || selectedOrder.dispatchMethod === 'jt_express';
                  const trackNo = relDel?.waybillNumber || relDel?.trackingNumber || selectedOrder.trackingNumber;

                  if (selectedOrder.isDispatched || relDel) {
                    return (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Dispatched ({relDel?.courierName || (isJT ? 'J&T Express' : 'Fleet')})</span>
                        </span>

                        {isJT && trackNo && (
                          <button
                            onClick={() => {
                              setActiveTrackingNumber(trackNo);
                              setActiveTrackingOrder({
                                id: selectedOrder.id,
                                branch: selectedOrder.branchName,
                              });
                            }}
                            className="px-3 py-1.5 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-600 dark:text-red-400 border border-red-500/30 text-xs font-bold transition-all flex items-center space-x-1"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>Track J&T ({trackNo})</span>
                          </button>
                        )}

                        {isJT && trackNo && (
                          <button
                            onClick={() => {
                              const branch = branches.find((b) => b.id === selectedOrder.branchId);
                              const label = jtExpressService.prepareShippingLabel(
                                trackNo,
                                selectedOrder.id,
                                {
                                  name: branch?.managerName || `${selectedOrder.branchName} Manager`,
                                  mobile: branch?.managerPhone || branch?.contactNumber || '+63 917 555 0192',
                                  address: branch?.address || branch?.location || selectedOrder.branchName,
                                  city: branch?.location || 'Metro Manila',
                                  province: 'NCR',
                                  branchName: selectedOrder.branchName,
                                },
                                selectedOrder.items.map((it) => ({
                                  itemName: it.productName,
                                  itemQuantity: it.quantity,
                                  itemValue: it.unitPrice || 149,
                                  itemWeight: 0.12,
                                })),
                                {
                                  weightKg: relDel?.weightKg || 3.5,
                                  declaredValue: selectedOrder.totalAmount,
                                }
                              );
                              setActiveLabelData(label);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold transition-all flex items-center space-x-1"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Print Waybill</span>
                          </button>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      {!isReadyForDispatch && (
                        <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center space-x-1 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>MTO branch request must be marked 'Ready' before dispatch.</span>
                        </span>
                      )}
                      <button
                        disabled={!isReadyForDispatch}
                        onClick={() => {
                          const branch = branches.find((b) => b.id === selectedOrder.branchId);
                          setReceiverName(branch?.managerName || `${selectedOrder.branchName} Store Manager`);
                          setReceiverPhone(branch?.managerPhone || branch?.contactNumber || '+63 917 555 0192');
                          setDeliveryAddress(branch?.address || branch?.location || `${selectedOrder.branchName} Station`);
                          const totalPacks = selectedOrder.items.reduce((s, i) => s + i.quantity, 0);
                          setPackageWeightKg(Math.max(1.5, Math.round(totalPacks * 0.12 * 10) / 10));
                          setTrackingNumber(selectedOrder.trackingNumber || '');
                          const defaultETD = new Date(Date.now() + 48 * 3600 * 1000);
                          const tzOffset = defaultETD.getTimezoneOffset() * 60000;
                          const localISOTime = new Date(defaultETD.getTime() - tzOffset).toISOString().slice(0, 16);
                          setEstimatedDeliveryTime(selectedOrder.estimatedDeliveryTime || localISOTime);
                          setShowDeliveryModal(true);
                        }}
                        className={`px-4 py-2 text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center space-x-1.5 ${
                          isReadyForDispatch
                            ? 'bg-linear-to-r from-[#F37021] to-[#E30613] text-white hover:opacity-90 cursor-pointer'
                            : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed border border-neutral-300 dark:border-neutral-700'
                        }`}
                        title={!isReadyForDispatch ? "MTO branch request must be marked 'Ready' in Commissary Batching before dispatch." : "Create Delivery Dispatch"}
                      >
                        <Truck className="w-4 h-4" />
                        <span>Dispatch (J&T / Fleet)</span>
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {showApproveConfirmModal && selectedOrder && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border animate-in zoom-in-95 duration-150 ${
            isDark ? 'bg-[#1c1c1c] border-neutral-700 text-white' : 'bg-white border-neutral-200 text-neutral-900'
          }`}>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold">Confirm Order Approval</h3>
                <p className="text-xs text-neutral-500">Review and verify stock release</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-neutral-600 dark:text-neutral-300">
                Are you sure you really want to approve <strong>Order #{selectedOrder.id}</strong> for <strong>{selectedOrder.branchName}</strong>?
              </p>

              <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Requisition Value:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">₱{selectedOrder.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Total Quantity:</span>
                  <span className="font-semibold">{selectedOrder.items.reduce((s, i) => s + i.quantity, 0)} units ({selectedOrder.items.length} flavor types)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Payment Proof:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verified Attached</span>
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-neutral-500">
                Approving this order will allocate commissary stock to {selectedOrder.branchName} and enable delivery dispatch creation.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2.5 mt-6 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setShowApproveConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors flex items-center space-x-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Yes, Approve Order</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && selectedOrder && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border animate-in zoom-in-95 duration-150 ${
            isDark ? 'bg-[#1c1c1c] border-neutral-700 text-white' : 'bg-white border-neutral-200 text-neutral-900'
          }`}>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-red-600 dark:text-red-400">Confirm Order Deletion</h3>
                <p className="text-xs text-neutral-500">Permanent and irreversible action</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-neutral-600 dark:text-neutral-300">
                Are you sure you really want to delete <strong>Order #{selectedOrder.id}</strong> submitted by <strong>{selectedOrder.branchName}</strong>?
              </p>

              <div className="p-3.5 rounded-2xl bg-red-500/5 border border-red-500/20 space-y-2">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Order Amount:</span>
                  <span className="font-bold">₱{selectedOrder.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Current Status:</span>
                  <span className="font-semibold uppercase text-[11px]">{selectedOrder.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Items:</span>
                  <span className="font-medium">{selectedOrder.items.reduce((s, i) => s + i.quantity, 0)} units</span>
                </div>
              </div>

              <div className="flex items-start space-x-2 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Warning: This order and any associated payment attachments will be permanently removed from the system.</span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2.5 mt-6 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm transition-colors flex items-center space-x-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Yes, Delete Order</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Order Reason Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border ${
            isDark ? 'bg-[#1c1c1c] border-neutral-700 text-white' : 'bg-white border-neutral-200 text-neutral-900'
          }`}>
            <h3 className="text-base font-bold">Reject Order</h3>
            <p className="text-xs text-neutral-500 mt-1">
              Provide a reason to notify the branch manager (e.g., Unclear receipt, insufficient stock).
            </p>
            <form onSubmit={handleRejectSubmit} className="mt-4 space-y-4">
              <textarea
                required
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Reason for order rejection..."
                className={`w-full p-3 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-red-500 ${
                  isDark
                    ? 'bg-neutral-900 border-neutral-700 text-white'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-900'
                }`}
              />
              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-3 py-2 text-xs font-medium rounded-xl border border-neutral-300 dark:border-neutral-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 text-white hover:bg-red-700"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Delivery Dispatch Modal (Enhanced with J&T Express & Fleet Toggle) */}
      {showDeliveryModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className={`w-full max-w-lg max-h-[95vh] flex flex-col rounded-3xl p-6 shadow-2xl border my-auto ${
            isDark ? 'bg-[#1c1c1c] border-neutral-700 text-white' : 'bg-white border-neutral-200 text-neutral-900'
          }`}>
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3 shrink-0">
              <div className="flex items-center space-x-2">
                <Truck className="w-5 h-5 text-[#F37021]" />
                <div>
                  <h3 className="text-base font-black">Dispatch Consignment</h3>
                  <p className="text-xs text-neutral-500">Order #{selectedOrder.id} • {selectedOrder.branchName}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleCreateDeliverySubmit} className="overflow-y-auto space-y-3.5 text-xs py-3 pr-1">
              {/* Read-Only Summary of Ordered Stock Package & Products */}
              <div className="p-3 rounded-2xl bg-neutral-100/90 dark:bg-neutral-900/90 border border-neutral-200 dark:border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Package className="w-3.5 h-3.5 text-[#F37021]" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                      Dispatched Consignment Manifest (Read-Only)
                    </span>
                  </div>
                  {selectedOrder.packageName && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-[#F37021]/15 text-[#F37021] border border-[#F37021]/30">
                      {selectedOrder.packageName}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs font-bold text-neutral-700 dark:text-neutral-300 border-b border-neutral-200/80 dark:border-neutral-800 pb-1.5">
                  <span>Total Quantity Dispatched:</span>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                    {selectedOrder.items.reduce((s, it) => s + it.quantity, 0)} Units (Packs)
                  </span>
                </div>

                <div className="max-h-28 overflow-y-auto space-y-1 pr-1 divide-y divide-neutral-200/50 dark:divide-neutral-800/60">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px] pt-1 first:pt-0">
                      <span className="truncate max-w-[65%] text-neutral-800 dark:text-neutral-200">
                        {item.productName}
                      </span>
                      <span className="font-bold text-neutral-900 dark:text-white shrink-0">
                        {item.quantity} packs
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Courier / Dispatch Method Toggle */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-neutral-400 mb-1.5 text-[11px]">
                  Logistics & Dispatch Method
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => {
                      setDispatchMethod('company_driver');
                      setCourierName('In-House Commissary Fleet');
                      setTrackingNumber(`TRIP-NGA-${selectedOrder.id}`);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                      dispatchMethod === 'company_driver'
                        ? 'bg-[#F37021] text-white shadow-md'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>In-House Fleet</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDispatchMethod('third_party_courier');
                      setCourierName('J&T Express');
                      setTrackingNumber('');
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                      dispatchMethod !== 'company_driver'
                        ? 'bg-sky-600 text-white shadow-md'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Third-Party Courier</span>
                  </button>
                </div>
              </div>

              {/* Courier Partner Selection & Tracking */}
              {dispatchMethod !== 'company_driver' ? (
                <div className="space-y-3 p-3.5 rounded-2xl bg-sky-500/5 border border-sky-500/20">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                        Courier Provider
                      </label>
                      <select
                        value={courierName}
                        onChange={(e) => setCourierName(e.target.value)}
                        className={`w-full p-2 rounded-xl text-xs font-bold border focus:outline-none ${
                          isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                        }`}
                      >
                        <option value="J&T Express">J&T Express</option>
                        <option value="LBC Express">LBC Express</option>
                        <option value="Transportify">Transportify</option>
                        <option value="Grab Express">Grab Express</option>
                        <option value="Victory Liner Cargo">Victory Liner Cargo</option>
                        <option value="Other Courier">Other Courier</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-neutral-800 dark:text-neutral-200">
                          Tracking / Waybill No. <span className="text-red-500">*</span>
                        </label>
                        <span className="text-[9px] font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded">
                          From Waybill
                        </span>
                      </div>
                      <input
                        type="text"
                        required
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        placeholder="e.g. 782910384912"
                        className={`w-full p-2 rounded-xl text-xs font-mono font-bold border focus:outline-none focus:ring-1 focus:ring-sky-500 ${
                          isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                      Estimated Delivery Time (ETD) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={estimatedDeliveryTime}
                      onChange={(e) => setEstimatedDeliveryTime(e.target.value)}
                      className={`w-full p-2 rounded-xl text-xs font-medium border focus:outline-none ${
                        isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-400 mb-1">Receiver Name</label>
                      <input
                        type="text"
                        required
                        value={receiverName}
                        onChange={(e) => setReceiverName(e.target.value)}
                        placeholder="Store Manager Name"
                        className={`w-full p-2 rounded-xl text-xs border ${
                          isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-neutral-300'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-400 mb-1">Receiver Phone</label>
                      <input
                        type="text"
                        required
                        value={receiverPhone}
                        onChange={(e) => setReceiverPhone(e.target.value)}
                        placeholder="+63 917..."
                        className={`w-full p-2 rounded-xl text-xs border ${
                          isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-neutral-300'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-400 mb-1">Destination Address</label>
                    <input
                      type="text"
                      required
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className={`w-full p-2 rounded-xl text-xs border ${
                        isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-neutral-300'
                      }`}
                    />
                  </div>
                </div>
              ) : (
                /* Company Driver Fields */
                <div className="space-y-3 p-3.5 rounded-2xl bg-[#F37021]/5 border border-[#F37021]/20">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-400 mb-1">Driver & Vehicle Plate</label>
                      <input
                        type="text"
                        required
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                        placeholder="e.g. Mang Robert (BCO-8821)"
                        className={`w-full p-2 rounded-xl text-xs border ${
                          isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-neutral-300'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-400 mb-1">
                        Estimated Delivery Time (ETD) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={estimatedDeliveryTime}
                        onChange={(e) => setEstimatedDeliveryTime(e.target.value)}
                        className={`w-full p-2 rounded-xl text-xs font-medium border focus:outline-none ${
                          isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-400 mb-1">Destination Address</label>
                    <input
                      type="text"
                      required
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className={`w-full p-2 rounded-xl text-xs border ${
                        isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-neutral-300'
                      }`}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-neutral-400 mb-1 text-xs">
                  Handling Instructions
                </label>
                <textarea
                  rows={2}
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="Keep dry, perishable marshmallows..."
                  className={`w-full p-2.5 rounded-xl border text-xs ${
                    isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-neutral-300'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowDeliveryModal(false)}
                  className="px-3.5 py-2 font-medium rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDispatch}
                  className="px-4 py-2 font-bold rounded-xl text-white bg-[#F37021] hover:bg-[#d85e15] transition-all shadow-md flex items-center space-x-1.5 text-xs cursor-pointer"
                >
                  {isSubmittingDispatch ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Dispatch...</span>
                    </>
                  ) : (
                    <>
                      <Truck className="w-3.5 h-3.5" />
                      <span>Confirm Dispatch & Print Gate Pass</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delivery Details Modal */}
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

      {/* Printable Dispatch Manifest Modal */}
      {activeManifestData && (
        <JTShippingLabel
          labelData={activeManifestData}
          onClose={() => setActiveManifestData(null)}
        />
      )}
        </>
      )}
    </div>
  );
};

