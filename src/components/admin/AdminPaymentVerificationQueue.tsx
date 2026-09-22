import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Image as ImageIcon,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  FileText,
  DollarSign,
  Building2,
  Calendar,
  Zap,
  X,
} from 'lucide-react';
import { Order } from '../../types';

export const AdminPaymentVerificationQueue: React.FC = () => {
  const {
    orders,
    branches,
    approvePaymentProof,
    rejectPaymentProof,
    currentUser,
    themeMode,
  } = useData();

  const isDark = themeMode === 'dark';

  // Filters & State
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderForImage, setSelectedOrderForImage] = useState<Order | null>(null);
  const [confirmingApprovalOrder, setConfirmingApprovalOrder] = useState<Order | null>(null);
  const [approvalRemarks, setApprovalRemarks] = useState('Verified valid transfer receipt');
  const [rejectingOrder, setRejectingOrder] = useState<Order | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showFeedback = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  // Orders with Proof of Payment
  const ordersWithProof = useMemo(() => {
    return orders.filter((o) => !!o.proofImagePath);
  }, [orders]);

  const pendingVerificationOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        o.proofImagePath &&
         (o.status === 'waitingApproval' || o.status === 'pending')
    );
  }, [orders]);

  const approvedProofOrders = useMemo(() => {
    return orders.filter((o) => o.proofImagePath && o.status === 'approved');
  }, [orders]);

  const displayedOrders = useMemo(() => {
    let list = ordersWithProof;
    if (activeTab === 'pending') {
      list = pendingVerificationOrders;
    } else if (activeTab === 'approved') {
      list = approvedProofOrders;
    }

    return list.filter((ord) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        ord.branchName.toLowerCase().includes(q) ||
        ord.id.toLowerCase().includes(q) ||
        (ord.packageName && ord.packageName.toLowerCase().includes(q)) ||
        (ord.batchCode && ord.batchCode.toLowerCase().includes(q))
      );
    });
  }, [ordersWithProof, pendingVerificationOrders, approvedProofOrders, activeTab, searchQuery]);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConfirmingApprovalOrder(null);
        setSelectedOrderForImage(null);
        setRejectingOrder(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle Approve
  const handleApprove = (orderId: string, branchName: string, remarks?: string) => {
    try {
      approvePaymentProof(orderId, currentUser?.name || 'HQ Finance Officer', remarks || 'Verified valid transfer receipt');
      showFeedback(`Proof of payment for Order #${orderId} (${branchName}) approved! Kitchen batching unlocked.`, 'success');
      if (selectedOrderForImage?.id === orderId) {
        setSelectedOrderForImage(null);
      }
      setConfirmingApprovalOrder(null);
    } catch (err: any) {
      showFeedback(err.message || 'Approval failed.', 'error');
    }
  };

  // Handle Reject
  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingOrder || !rejectionReason.trim()) return;

    try {
      rejectPaymentProof(rejectingOrder.id, rejectionReason.trim());
      showFeedback(`Order #${rejectingOrder.id} rejected with reason: "${rejectionReason.trim()}".`, 'info');
      setRejectingOrder(null);
      setRejectionReason('');
      if (selectedOrderForImage?.id === rejectingOrder.id) {
        setSelectedOrderForImage(null);
      }
    } catch (err: any) {
      showFeedback(err.message || 'Rejection failed.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F37021] text-white">
              Proof of Payment(PoP)Verification
            </span>
            <span className="text-xs font-mono text-neutral-400">
              {pendingVerificationOrders.length} Pending Approval
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-1">
            PoP Verification Queue
          </h1>
          <p className="text-xs text-neutral-500 font-medium">
            Inspect digital bank transfer slips and e-wallet screenshots attached by Branch Managers to unlock commissary production batching.
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center space-x-1.5 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-2xl border border-neutral-200 dark:border-neutral-700">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'pending'
                ? 'bg-[#F37021] text-white shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Review ({pendingVerificationOrders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('approved')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'approved'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Verified ({approvedProofOrders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'all'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <span>All Uploads ({ordersWithProof.length})</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center space-x-2 animate-in fade-in duration-200 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : feedbackMsg.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
              : 'bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className={`p-4 rounded-2xl border ${
            isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
          }`}
        >
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
            Unverified Queued Requisitions
          </span>
          <p className="text-2xl font-black text-amber-500 mt-1">
            {pendingVerificationOrders.length} <span className="text-xs font-normal text-neutral-400">orders</span>
          </p>
          <p className="text-[10px] text-neutral-500 mt-0.5">Awaiting Super Admin payment sign-off</p>
        </div>

        <div
          className={`p-4 rounded-2xl border ${
            isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
          }`}
        >
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
            Pending Payment Total
          </span>
          <p className="text-2xl font-black text-[#F37021] mt-1">
            ₱
            {pendingVerificationOrders
              .reduce((sum, o) => sum + o.totalAmount, 0)
              .toLocaleString()}
          </p>
          <p className="text-[10px] text-neutral-500 mt-0.5">Gross unreleased wholesale value</p>
        </div>

        <div
          className={`p-4 rounded-2xl border ${
            isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
          }`}
        >
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
            Total Verified Wholesale Sales
          </span>
          <p className="text-2xl font-black text-emerald-500 mt-1">
            ₱
            {approvedProofOrders
              .reduce((sum, o) => sum + o.totalAmount, 0)
              .toLocaleString()}
          </p>
          <p className="text-[10px] text-neutral-500 mt-0.5">Cleared for kitchen batching</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by branch name, order ID, package..."
          className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#80C7F2] ${
            isDark
              ? 'bg-[#161616] border-neutral-800 text-white placeholder-neutral-500'
              : 'bg-white border-neutral-200 text-neutral-900 placeholder-neutral-400'
          }`}
        />
      </div>

      {/* Verification Queue Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayedOrders.length === 0 ? (
          <div
            className={`col-span-full p-12 text-center rounded-3xl border ${
              isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200'
            }`}
          >
            <CreditCard className="w-12 h-12 text-neutral-400 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-bold">No payment slips found in this queue</p>
            <p className="text-xs text-neutral-500 mt-1">
              {activeTab === 'pending'
                ? 'All branch requisitions with payment slips have been verified!'
                : 'No orders match the selected filter.'}
            </p>
          </div>
        ) : (
          displayedOrders.map((ord) => {
            const isApproved = ord.status === 'approved';
            return (
              <div
                key={ord.id}
                className={`p-5 rounded-3xl border transition-all flex flex-col justify-between ${
                  !isApproved
                    ? 'border-amber-500/40 bg-gradient-to-br from-amber-500/5 via-white to-orange-500/5 dark:from-neutral-900 dark:to-[#1a1714]'
                    : isDark
                    ? 'bg-[#161616] border-neutral-800'
                    : 'bg-white border-neutral-200 shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-base text-neutral-900 dark:text-white">
                          {ord.branchName}
                        </span>
                        <span className="text-xs font-mono text-neutral-400">#{ord.id}</span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {ord.packageName || 'Commissary Requisition'} • {new Date(ord.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isApproved
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : ord.status === 'rejected'
                          ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {isApproved ? 'Verified & Approved' : ord.status === 'rejected' ? 'Rejected' : 'Awaiting Review'}
                    </span>
                  </div>

                  {/* Order & Payment Amount */}
                  <div className="grid grid-cols-2 gap-3 my-4">
                    <div className="p-3 rounded-2xl bg-white/80 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800">
                      <span className="text-[10px] text-neutral-400 font-bold uppercase">Requisition Value</span>
                      <p className="text-lg font-black text-[#F37021] mt-0.5">
                        ₱{ord.totalAmount.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-neutral-500">
                        {ord.items.reduce((s, i) => s + i.quantity, 0)} total packs
                      </p>
                    </div>

                    {/* Screenshot Thumbnail Preview */}
                    <div
                      onClick={() => setSelectedOrderForImage(ord)}
                      className="p-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 flex items-center space-x-2.5 cursor-pointer hover:border-[#80C7F2] transition-all group"
                    >
                      {ord.proofImagePath ? (
                        <img
                          src={ord.proofImagePath}
                          alt="Proof of Payment"
                          className="w-12 h-12 rounded-xl object-cover border border-neutral-300 dark:border-neutral-700 group-hover:scale-105 transition-transform"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-neutral-400">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 flex items-center space-x-1">
                          <span>View Proof</span>
                          <ExternalLink className="w-3 h-3" />
                        </span>
                        <p className="text-[10px] text-neutral-400 truncate">Click to enlarge</p>
                      </div>
                    </div>
                  </div>

                  {/* Flavor Breakdown snippet */}
                  <div className="text-xs text-neutral-500 space-y-1 mb-4">
                    <p className="font-semibold text-neutral-700 dark:text-neutral-300 text-[11px]">
                      Items: {ord.items.map((i) => `${i.quantity}x ${i.productName.split('(')[0]}`).join(', ')}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedOrderForImage(ord)}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center space-x-1 cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Inspect Slip</span>
                  </button>

                  {!isApproved && (
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setRejectingOrder(ord)}
                        className="px-3 py-2 rounded-xl text-xs font-bold border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 cursor-pointer"
                      >
                        Reject
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setConfirmingApprovalOrder(ord);
                          setApprovalRemarks('Verified valid transfer receipt');
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center space-x-1.5 cursor-pointer transition-all hover:shadow-md"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Verify & Approve</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Proof of Payment Inspector Modal */}
      {selectedOrderForImage && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedOrderForImage(null);
          }}
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
        >
          <div
            className={`relative w-full max-w-2xl max-h-[88vh] flex flex-col rounded-3xl shadow-2xl border overflow-hidden my-auto ${
              isDark ? 'bg-[#1c1c1c] border-neutral-700 text-white' : 'bg-white border-neutral-200 text-neutral-900'
            }`}
          >
            <div className="shrink-0 px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-white dark:bg-[#1c1c1c]">
              <div className="min-w-0">
                <h3 className="text-base font-bold truncate">Proof of Payment Review</h3>
                <p className="text-xs text-neutral-500 truncate">
                  Order #{selectedOrderForImage.id} • {selectedOrderForImage.branchName} • ₱{selectedOrderForImage.totalAmount.toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderForImage(null)}
                className="p-2 rounded-2xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer flex items-center justify-center shrink-0 ml-3"
                aria-label="Exit modal"
                title="Exit / Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-2 flex-1 overflow-y-auto flex flex-col items-center justify-center p-3 rounded-2xl bg-black/5 dark:bg-black/40 border border-neutral-200 dark:border-neutral-800 m-4">
              {selectedOrderForImage.proofImagePath ? (
                <img
                  src={selectedOrderForImage.proofImagePath}
                  alt="Proof of Payment Large"
                  className="max-h-[50vh] w-auto object-contain rounded-xl shadow-lg border border-neutral-300 dark:border-neutral-700"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <p className="text-xs text-neutral-400 py-8">No image attached.</p>
              )}
            </div>

            <div className="shrink-0 px-5 py-3.5 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-white dark:bg-[#1c1c1c]">
              <span className="text-xs text-neutral-500">
                Status: <strong>{selectedOrderForImage.status}</strong>
              </span>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrderForImage(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  Close / Exit
                </button>

                {selectedOrderForImage.status !== 'approved' && (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmingApprovalOrder(selectedOrderForImage);
                      setApprovalRemarks('Verified valid transfer receipt');
                    }}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center space-x-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve Transfer</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Alert Modal: Verify & Approve Decision */}
      {confirmingApprovalOrder && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmingApprovalOrder(null);
          }}
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
        >
          <div
            className={`relative w-full max-w-lg max-h-[88vh] flex flex-col rounded-3xl shadow-2xl border transition-all animate-in zoom-in-95 duration-150 overflow-hidden my-auto ${
              isDark ? 'bg-[#1c1c1c] border-neutral-700 text-white' : 'bg-white border-neutral-200 text-neutral-900'
            }`}
          >
            {/* Modal Header: Sticky at top */}
            <div className="shrink-0 px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-white dark:bg-[#1c1c1c]">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                      Payment Verification
                    </span>
                    <span className="text-xs font-mono text-neutral-400 truncate">
                      #{confirmingApprovalOrder.id}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold mt-0.5 truncate">
                    Verify & Approve Payment Proof
                  </h3>
                </div>
              </div>

              {/* Prominent, accessible Exit button */}
              <button
                type="button"
                onClick={() => setConfirmingApprovalOrder(null)}
                className="p-2 rounded-2xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer flex items-center justify-center shrink-0 ml-3"
                aria-label="Exit modal"
                title="Exit / Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Alert Banner: Prompt asking if sure with decision */}
              <div className="p-4 rounded-2xl border border-amber-300 dark:border-amber-700/60 bg-amber-500/10 dark:bg-amber-950/30 flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-extrabold text-amber-900 dark:text-amber-200 text-sm">
                    Are you sure with your decision?
                  </p>
                  <p className="text-amber-800/90 dark:text-amber-300/90 leading-relaxed font-medium">
                    Approving this proof of payment verifies the attached transfer slip for{' '}
                    <strong className="text-amber-950 dark:text-amber-100">{confirmingApprovalOrder.branchName}</strong>{' '}
                    and unlocks commissary kitchen batching.
                  </p>
                </div>
              </div>

              {/* Requisition Breakdown */}
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">Requisition Value:</span>
                    <span className="font-black text-sm text-[#F37021]">
                      ₱{confirmingApprovalOrder.totalAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">Destination Branch:</span>
                    <span className="font-bold text-neutral-800 dark:text-neutral-200">
                      {confirmingApprovalOrder.branchName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">Total Quantity:</span>
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                      {confirmingApprovalOrder.items.reduce((s, i) => s + i.quantity, 0)} total packs ({confirmingApprovalOrder.items.length} items)
                    </span>
                  </div>
                  <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-800/60 flex items-center justify-between">
                    <span className="text-neutral-500">Payment Slip Status:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Attached & Inspected</span>
                    </span>
                  </div>
                </div>

                {/* Thumbnail of attached proof if available */}
                {confirmingApprovalOrder.proofImagePath && (
                  <div className="flex items-center space-x-3 p-2.5 rounded-2xl bg-neutral-100/70 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-700">
                    <img
                      src={confirmingApprovalOrder.proofImagePath}
                      alt="Proof Slip Thumbnail"
                      className="w-12 h-12 rounded-xl object-cover border border-neutral-300 dark:border-neutral-600 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200 truncate">
                        Attached Slip Reference Verified
                      </p>
                      <p className="text-[10px] text-neutral-400">
                        Digital receipt matches bank/e-wallet transfer records
                      </p>
                    </div>
                  </div>
                )}

                {/* Remarks note */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mb-1">
                    Approval Remarks / Sign-off Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={approvalRemarks}
                    onChange={(e) => setApprovalRemarks(e.target.value)}
                    placeholder="e.g. Verified valid transfer receipt"
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark
                        ? 'bg-[#101010] border-neutral-700 text-white'
                        : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                    }`}
                  />
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center space-x-2">
                  <Zap className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    Once approved, kitchen staff can schedule batch cooking for this requisition immediately.
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer: Sticky at bottom */}
            <div className="shrink-0 px-5 py-3.5 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-end gap-2.5 bg-white dark:bg-[#1c1c1c]">
              <button
                type="button"
                onClick={() => setConfirmingApprovalOrder(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Cancel / Exit
              </button>

              <button
                type="button"
                onClick={() => handleApprove(confirmingApprovalOrder.id, confirmingApprovalOrder.branchName, approvalRemarks)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center space-x-1.5 cursor-pointer transition-all hover:shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Yes, I'm Sure — Verify & Approve</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingOrder && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setRejectingOrder(null);
          }}
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
        >
          <div
            className={`relative w-full max-w-md max-h-[88vh] flex flex-col rounded-3xl shadow-2xl border overflow-hidden my-auto ${
              isDark ? 'bg-[#1c1c1c] border-neutral-700 text-white' : 'bg-white border-neutral-200 text-neutral-900'
            }`}
          >
            <div className="shrink-0 px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-white dark:bg-[#1c1c1c]">
              <div>
                <h3 className="text-base font-bold text-red-600 dark:text-red-400">
                  Reject Proof of Payment
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Order #{rejectingOrder.id} for {rejectingOrder.branchName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRejectingOrder(null)}
                className="p-2 rounded-2xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer flex items-center justify-center shrink-0 ml-3"
                aria-label="Exit modal"
                title="Exit / Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div className="p-3 rounded-2xl border border-red-300 dark:border-red-700/60 bg-red-500/10 dark:bg-red-950/30 flex items-start space-x-2.5">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <p className="font-extrabold text-red-900 dark:text-red-200">
                    Are you sure with your decision?
                  </p>
                  <p className="text-red-800/90 dark:text-red-300/90 font-medium">
                    Rejecting this proof of payment will notify the branch to re-upload a valid payment transfer slip.
                  </p>
                </div>
              </div>

              <form id="reject-payment-form" onSubmit={handleConfirmReject} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Reason for Rejection
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. Reference number does not match BDO online ledger or image is blurry."
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-red-500 ${
                      isDark
                        ? 'bg-[#101010] border-neutral-700 text-white'
                        : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                    }`}
                  />
                </div>
              </form>
            </div>

            <div className="shrink-0 px-5 py-3.5 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end space-x-2.5 bg-white dark:bg-[#1c1c1c]">
              <button
                type="button"
                onClick={() => setRejectingOrder(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="reject-payment-form"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white cursor-pointer"
              >
                Yes, I'm Sure — Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
