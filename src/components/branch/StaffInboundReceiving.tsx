import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import {
  PackageCheck,
  Truck,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Plus,
  Clock,
  Lock,
  Sparkles,
  Info,
  Calendar,
  Box,
  Trash2,
  RotateCcw,
  Boxes,
  ShieldAlert,
  ArrowRight,
  X,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { DailyInboundReceivingItem, DailyLogStatus } from '../../types';
import { JT_EXPRESS_TRACKING_URL } from '../../services/jtExpress';

interface ManifestLineItem {
  id: string;
  productId: string;
  expectedUnits: number;
  receivedUnits: number;
  condition: 'good' | 'damaged' | 'shortage' | 'overage';
  notes: string;
}

interface StaffInboundReceivingProps {
  onNavigateTab?: (tab: string) => void;
}

export const StaffInboundReceiving: React.FC<StaffInboundReceivingProps> = ({ onNavigateTab }) => {
  const {
    currentUser,
    currentBranch,
    products,
    dailyShiftLogs,
    deliveries,
    orders,
    addInboundToDailyLog,
    removeInboundFromDailyLog,
    removeInboundManifestFromDailyLog,
    themeMode,
  } = useData();

  const isDark = themeMode === 'dark';
  const branchId = currentUser?.branchId || currentBranch?.id || 'b-legazpi';
  const today = new Date().toISOString().split('T')[0];

  const todayLog = useMemo(() => {
    return (dailyShiftLogs || []).find((l) => l.branchId === branchId && l.date === today);
  }, [dailyShiftLogs, branchId, today]);

  const currentStatus = todayLog?.status || DailyLogStatus.DRAFT;
  const isLocked = currentStatus === DailyLogStatus.VALIDATED_AND_LOCKED;
  const isPending = currentStatus === DailyLogStatus.PENDING_VALIDATION;
  const isReturned = currentStatus === DailyLogStatus.RETURNED_FOR_REVISION;
  const isEditable = !isLocked && !isPending;

  // Filter ONLY gourmet marshmallow flavors (strictly remove flavoring extract 'f*' and packaging 'pkg*')
  const marshmallowProducts = useMemo(() => {
    return products.filter((p) => p.flavor && !p.id.startsWith('f') && !p.id.startsWith('pkg'));
  }, [products]);

  // Manifest Header State
  const [manifestNumber, setManifestNumber] = useState<string>('MNF-NAGA-2026-0902');
  const [supplierOrSource, setSupplierOrSource] = useState<string>('Naga City Commissary Hub');
  const [courierNotes, setCourierNotes] = useState<string>('Courier J&T Express • Thermal tamper seal intact');
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [showConfirmVerifyModal, setShowConfirmVerifyModal] = useState<boolean>(false);
  const [showRestartDraftModal, setShowRestartDraftModal] = useState<boolean>(false);
  const [manifestToDelete, setManifestToDelete] = useState<{ manifestNumber: string; items: DailyInboundReceivingItem[] } | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string; manifestNumber: string } | null>(null);

  // Multi-Item Manifest Line Items State
  const [manifestLines, setManifestLines] = useState<ManifestLineItem[]>(() => {
    const p1 = marshmallowProducts[0]?.id || 'p1';
    const p2 = marshmallowProducts[1]?.id || 'p2';
    const p3 = marshmallowProducts[2]?.id || 'p3';

    return [
      {
        id: 'line-1',
        productId: p1,
        expectedUnits: 25,
        receivedUnits: 25,
        condition: 'good',
        notes: '',
      },
      {
        id: 'line-2',
        productId: p2,
        expectedUnits: 20,
        receivedUnits: 20,
        condition: 'good',
        notes: '',
      },
      {
        id: 'line-3',
        productId: p3,
        expectedUnits: 20,
        receivedUnits: 18,
        condition: 'shortage',
        notes: '2 packs missing from tote box #3',
      },
    ];
  });

  // Track inbound deliveries dispatched from Commissary for this branch
  const incomingShipments = useMemo(() => {
    return (deliveries || []).filter((d) => {
      const ord = (orders || []).find((o) => o.id === d.orderId);
      const isForThisBranch =
        ord?.branchId === branchId ||
        ord?.branchName?.toLowerCase() === currentBranch?.name?.toLowerCase() ||
        d.destinationAddress?.toLowerCase().includes(currentBranch?.name?.toLowerCase() || '') ||
        d.destinationAddress?.toLowerCase().includes(branchId.replace('b-', '').toLowerCase());
      return isForThisBranch && d.status !== 'delivered';
    });
  }, [deliveries, orders, branchId, currentBranch]);

  // Handler to load dispatched shipment into the manifest form
  const handleSelectIncomingShipment = (delivery: any) => {
    const trackingNo = delivery.waybillNumber || delivery.trackingNumber;
    if (trackingNo) {
      setManifestNumber(trackingNo);
    }
    const isJT =
      delivery.dispatchMethod === 'jt_express' ||
      (delivery.courierName && delivery.courierName.toLowerCase().includes('j&t'));
    setSupplierOrSource('Naga City Commissary Hub');
    setCourierNotes(
      `${isJT ? 'Courier: J&T Express' : 'Courier: ' + (delivery.courierName || 'In-House Fleet')} • Waybill: ${
        trackingNo || 'N/A'
      } • Thermal tamper seal intact`
    );

    const ord = (orders || []).find((o) => o.id === delivery.orderId);
    const itemsToLoad = ord?.dispatchedProducts?.length
      ? ord.dispatchedProducts
      : ord?.items?.length
      ? ord.items
      : null;

    if (itemsToLoad && itemsToLoad.length > 0) {
      const newLines: ManifestLineItem[] = itemsToLoad.map((it: any, idx: number) => {
        const matchedProd =
          marshmallowProducts.find(
            (p) =>
              p.name === it.productName ||
              p.flavor === it.productName ||
              p.id === it.productId
          ) || marshmallowProducts[idx % marshmallowProducts.length] || marshmallowProducts[0];

        return {
          id: `line-${Date.now()}-${idx}`,
          productId: matchedProd.id,
          expectedUnits: it.quantity,
          receivedUnits: it.quantity,
          condition: 'good',
          notes: `From Order #${ord?.id || delivery.id}`,
        };
      });
      setManifestLines(newLines);
      setFeedback({
        text: `Loaded incoming consignment #${ord?.id || delivery.id} (Waybill: ${trackingNo || 'N/A'}) with ${newLines.length} flavor lines into manifest form.`,
        type: 'info',
      });
    } else {
      setFeedback({
        text: `Loaded incoming shipment #${delivery.id} (Waybill: ${trackingNo || 'N/A'}) into manifest form.`,
        type: 'info',
      });
    }
    setTimeout(() => setFeedback(null), 4000);
  };

  // Add a new line item to manifest
  const handleAddLine = () => {
    if (!isEditable) return;
    // Find first product not yet in lines if possible
    const existingIds = new Set(manifestLines.map((l) => l.productId));
    const nextProd = marshmallowProducts.find((p) => !existingIds.has(p.id)) || marshmallowProducts[0];

    const newLine: ManifestLineItem = {
      id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: nextProd?.id || 'p1',
      expectedUnits: 15,
      receivedUnits: 15,
      condition: 'good',
      notes: '',
    };
    setManifestLines((prev) => [...prev, newLine]);
  };

  // Quick populate all marshmallow flavors
  const handlePopulateAllFlavors = () => {
    if (!isEditable) return;
    const allLines: ManifestLineItem[] = marshmallowProducts.map((p, idx) => ({
      id: `line-${p.id}-${idx}`,
      productId: p.id,
      expectedUnits: 20,
      receivedUnits: 20,
      condition: 'good',
      notes: '',
    }));
    setManifestLines(allLines);
    setFeedback({
      text: `Populated ${allLines.length} marshmallow flavors into manifest draft.`,
      type: 'info',
    });
    setTimeout(() => setFeedback(null), 3000);
  };

  // Remove a line item
  const handleRemoveLine = (lineId: string) => {
    if (!isEditable) return;
    if (manifestLines.length <= 1) {
      setFeedback({ text: 'Delivery manifest must include at least one item.', type: 'error' });
      return;
    }
    setManifestLines((prev) => prev.filter((l) => l.id !== lineId));
  };

  // Update specific line field
  const handleUpdateLine = (lineId: string, field: keyof ManifestLineItem, value: any) => {
    if (!isEditable) return;
    setManifestLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;
        return {
          ...line,
          [field]: value,
        };
      })
    );
  };

  // Multi-item Manifest Summary Calculations
  const manifestSummary = useMemo(() => {
    let totalExpected = 0;
    let totalReceived = 0;
    let totalDiscrepancies = 0;

    manifestLines.forEach((l) => {
      totalExpected += Number(l.expectedUnits) || 0;
      totalReceived += Number(l.receivedUnits) || 0;
      if (l.condition !== 'good' || l.expectedUnits !== l.receivedUnits) {
        totalDiscrepancies += 1;
      }
    });

    const netVariance = totalReceived - totalExpected;
    return {
      totalExpected,
      totalReceived,
      netVariance,
      totalDiscrepancies,
      itemCount: manifestLines.length,
    };
  }, [manifestLines]);

  // Open confirmation modal to verify and apply manifest to shift summary
  const handleInitiateVerifyManifest = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isEditable) return;

    if (!manifestNumber.trim()) {
      setFeedback({ text: 'Please enter a valid Manifest or Waybill Number.', type: 'error' });
      return;
    }

    if (manifestLines.length === 0) {
      setFeedback({ text: 'Please add at least one marshmallow flavor item to this manifest.', type: 'error' });
      return;
    }

    setShowConfirmVerifyModal(true);
  };

  // Record all lines in this manifest to shift summary upon staff confirmation
  const handleConfirmApplyToSummary = () => {
    if (!isEditable) return;

    // Build the payload for addInboundToDailyLog (supports array of items)
    const itemsPayload = manifestLines.map((line) => {
      const prod = products.find((p) => p.id === line.productId) || marshmallowProducts[0];
      const combinedNotes = [line.notes.trim(), courierNotes.trim()].filter(Boolean).join(' • ');

      return {
        manifestNumber: manifestNumber.trim(),
        supplierOrSource: supplierOrSource.trim() || 'Naga City Commissary Hub',
        productId: prod.id,
        productName: `${prod.flavor} (${prod.name})`,
        expectedUnits: Math.max(0, Number(line.expectedUnits) || 0),
        receivedUnits: Math.max(0, Number(line.receivedUnits) || 0),
        condition: line.condition,
        notes: combinedNotes,
      };
    });

    const res = addInboundToDailyLog(itemsPayload);
    setShowConfirmVerifyModal(false);

    if (res.success) {
      setFeedback({
        text: `Successfully verified and recorded manifest ${manifestNumber} (${itemsPayload.length} flavors, ${manifestSummary.totalReceived} packs received) to Shift Summary.`,
        type: 'success',
      });

      // Prepare a new manifest number and reset lines for subsequent deliveries
      const nextSeq = Math.floor(1000 + Math.random() * 9000);
      setManifestNumber(`MNF-NAGA-2026-${nextSeq}`);
      setCourierNotes('Thermal tamper seal intact');
      const p1 = marshmallowProducts[0]?.id || 'p1';
      setManifestLines([
        {
          id: `line-${Date.now()}`,
          productId: p1,
          expectedUnits: 20,
          receivedUnits: 20,
          condition: 'good',
          notes: '',
        },
      ]);

      setTimeout(() => setFeedback(null), 6000);
    } else {
      setFeedback({ text: res.error || 'Failed to record inbound receiving.', type: 'error' });
    }
  };

  // Delete draft and restart transaction from scratch
  const handleConfirmRestartDraft = () => {
    const nextSeq = Math.floor(1000 + Math.random() * 9000);
    setManifestNumber(`MNF-NAGA-2026-${nextSeq}`);
    setSupplierOrSource('Naga City Commissary Hub');
    setCourierNotes('Courier J&T Express • Thermal tamper seal intact');
    const p1 = marshmallowProducts[0]?.id || 'p1';
    setManifestLines([
      {
        id: `line-${Date.now()}`,
        productId: p1,
        expectedUnits: 20,
        receivedUnits: 20,
        condition: 'good',
        notes: '',
      },
    ]);
    setShowRestartDraftModal(false);
    setFeedback({
      text: 'Current draft deleted. Inbound transaction has been restarted.',
      type: 'info',
    });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Delete verified manifest from shift log to restart
  const handleConfirmDeleteManifest = (mnfNum: string) => {
    removeInboundManifestFromDailyLog(mnfNum);
    setManifestToDelete(null);
    setFeedback({
      text: `Deleted manifest ${mnfNum} from verified inbound records.`,
      type: 'info',
    });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Delete verified manifest and reload back into the draft form to restart editing
  const handleDeleteAndRestartInForm = (mnfNum: string, items: DailyInboundReceivingItem[]) => {
    removeInboundManifestFromDailyLog(mnfNum);
    setManifestNumber(mnfNum);
    if (items[0]?.supplierOrSource) {
      setSupplierOrSource(items[0].supplierOrSource);
    }
    const newLines: ManifestLineItem[] = items.map((it, idx) => ({
      id: `line-${Date.now()}-${idx}`,
      productId: it.productId,
      expectedUnits: it.expectedUnits,
      receivedUnits: it.receivedUnits,
      condition: it.condition,
      notes: it.notes || '',
    }));
    setManifestLines(
      newLines.length > 0
        ? newLines
        : [
            {
              id: `line-${Date.now()}`,
              productId: marshmallowProducts[0]?.id || 'p1',
              expectedUnits: 20,
              receivedUnits: 20,
              condition: 'good',
              notes: '',
            },
          ]
    );
    setManifestToDelete(null);
    setFeedback({
      text: `Manifest ${mnfNum} deleted from records and reloaded into draft form to restart transaction.`,
      type: 'success',
    });
    setTimeout(() => setFeedback(null), 5000);
  };

  // Delete single verified inbound line item
  const handleConfirmDeleteItem = () => {
    if (!itemToDelete) return;
    removeInboundFromDailyLog(itemToDelete.id);
    setFeedback({
      text: `Removed ${itemToDelete.name} from verified manifest records.`,
      type: 'info',
    });
    setItemToDelete(null);
    setTimeout(() => setFeedback(null), 4000);
  };

  const verifiedReceivings = todayLog?.inboundReceiving || [];

  // Group verified deliveries by manifest number
  const groupedManifests = useMemo(() => {
    const groups: Record<string, DailyInboundReceivingItem[]> = {};
    verifiedReceivings.forEach((item) => {
      const mnf = item.manifestNumber || 'Unassigned Manifest';
      if (!groups[mnf]) {
        groups[mnf] = [];
      }
      groups[mnf].push(item);
    });
    return groups;
  }, [verifiedReceivings]);

  return (
    <div id="staff-inbound-receiving-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <PackageCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
                Inbound Receiving & Multi-Item Verification
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                Inspect, tally, and batch-record multi-item commissary shipments from Naga City Commissary Hub
              </p>
            </div>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center space-x-2">
          {currentStatus === DailyLogStatus.DRAFT && (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60">
              <Clock className="w-3.5 h-3.5" />
              <span>Status: DRAFT</span>
            </span>
          )}
          {currentStatus === DailyLogStatus.RETURNED_FOR_REVISION && (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-700/60">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Status: RETURNED FOR REVISION</span>
            </span>
          )}
          {currentStatus === DailyLogStatus.PENDING_VALIDATION && (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-300 dark:border-sky-700/60">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Status: PENDING VALIDATION</span>
            </span>
          )}
          {currentStatus === DailyLogStatus.VALIDATED_AND_LOCKED && (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60">
              <Lock className="w-3.5 h-3.5" />
              <span>Status: VALIDATED & LOCKED</span>
            </span>
          )}
        </div>
      </div>

      {/* Return for Revision Notice Banner if applicable */}
      {isReturned && todayLog?.rejectionReason && (
        <div className="p-4 rounded-2xl border bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/80 text-rose-900 dark:text-rose-200">
          <div className="flex items-start space-x-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm">
              <div className="font-bold flex items-center space-x-1.5">
                <span>Returned by Branch Manager for Revision:</span>
                {todayLog.rejectedBy && <span className="font-normal text-rose-700 dark:text-rose-300">({todayLog.rejectedBy})</span>}
              </div>
              <p className="mt-1 font-mono text-xs bg-white/70 dark:bg-black/30 p-2.5 rounded-lg border border-rose-200 dark:border-rose-900/60">
                "{todayLog.rejectionReason}"
              </p>
              <p className="mt-1.5 text-[11px] text-rose-700 dark:text-rose-400">
                Please recheck the waybills and physical inventory, make required corrections below, and click <strong>Re-Submit Corrected Log</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Protocol Banner */}
      <div className={`p-4 rounded-2xl border ${
        isLocked
          ? 'bg-neutral-100 dark:bg-neutral-900/60 border-neutral-200 dark:border-neutral-800'
          : isPending
          ? 'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800/50'
          : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40'
      }`}>
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300">
            <span className="font-bold text-neutral-900 dark:text-white">Multi-Item Delivery Receiving Standards:</span>{' '}
            Commissary shipments from Naga City Commissary Hub often bundle multiple marshmallow flavors in one manifest. Enter all flavor lines and their corresponding quantities below, inspect thermal seals, and record the entire manifest in one batch.
          </div>
        </div>
      </div>

      {feedback && (
        <div className={`p-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-2 ${
          feedback.type === 'success'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
            : feedback.type === 'info'
            ? 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800'
            : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800'
        }`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Incoming Commissary Dispatches Banner */}
      {incomingShipments.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-linear-to-r from-red-500/10 via-amber-500/10 to-[#F37021]/10 border border-red-500/30 space-y-3.5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-red-600 text-white font-black text-xs shadow-xs flex items-center justify-center">
                J&T
              </div>
              <div>
                <h3 className="text-sm font-black text-neutral-900 dark:text-white flex items-center space-x-2">
                  <span>Incoming Commissary Dispatches ({incomingShipments.length})</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500/20 text-red-700 dark:text-red-400">
                    AWAITING INBOUND RECEIPT
                  </span>
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  Select a dispatched consignment below to verify physical waybill tracking and pre-fill cargo lines.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {incomingShipments.map((del) => {
              const ord = (orders || []).find((o) => o.id === del.orderId);
              const isJT =
                del.dispatchMethod === 'jt_express' ||
                (del.courierName && del.courierName.toLowerCase().includes('j&t')) ||
                ord?.dispatchMethod === 'jt_express';
              const trackNo = del.waybillNumber || del.trackingNumber || ord?.trackingNumber;
              const etd = ord?.estimatedDeliveryTime || del.estimatedDeliveryTime;

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
              const totalItems = ord?.dispatchedProducts?.length
                ? ord.dispatchedProducts.reduce((s: number, i: any) => s + i.quantity, 0)
                : ord?.items?.reduce((s: number, i: any) => s + i.quantity, 0) || del.weightKg || '—';

              return (
                <div
                  key={del.id}
                  className="p-4 rounded-xl bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            del.dispatchMethod === 'company_driver'
                              ? 'bg-[#F37021] text-white'
                              : 'bg-sky-600 text-white'
                          }`}
                        >
                          {del.dispatchMethod === 'company_driver' ? 'IN-HOUSE FLEET' : del.courierName || 'COURIER'}
                        </span>
                        {ord && (
                          <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                            Requisition #{ord.id}
                          </span>
                        )}
                        {ord?.packageName && (
                          <span className="text-[10px] font-bold text-[#F37021] bg-[#F37021]/10 px-1.5 py-0.5 rounded border border-[#F37021]/20">
                            {ord.packageName}
                          </span>
                        )}
                      </div>

                      {trackNo && (
                        <div className="flex items-center space-x-1.5 pt-0.5">
                          <span className="text-[11px] text-neutral-500 font-medium">Waybill:</span>
                          <span className="font-mono text-xs font-black text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 select-all">
                            {trackNo}
                          </span>
                        </div>
                      )}

                      {formattedETD && (
                        <div className="text-[11px] text-neutral-600 dark:text-neutral-300 flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-[#F37021]" />
                          <span>
                            ETD: <strong className="text-neutral-900 dark:text-white font-bold">{formattedETD}</strong>
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block">Total Units</span>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                        {totalItems} packs
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                    {isJT && trackNo ? (
                      <a
                        href={JT_EXPRESS_TRACKING_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline flex items-center space-x-1"
                        title="Track package on J&T Official Portal"
                      >
                        <span>Track on J&T Portal</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <div />
                    )}

                    <button
                      type="button"
                      disabled={!isEditable}
                      onClick={() => handleSelectIncomingShipment(del)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                        isEditable
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer active:scale-98'
                          : 'opacity-50 cursor-not-allowed bg-neutral-200 text-neutral-500'
                      }`}
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      <span>Receive / Pre-fill Form</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Grid: Multi-Item Receiving Form (7 cols) + Verified Manifests History (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Multi-Line Receiving (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <form onSubmit={handleInitiateVerifyManifest} className="p-5 rounded-2xl bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200/80 dark:border-neutral-800 pb-3">
              <div className="flex items-center space-x-2">
                <Truck className="w-5 h-5 text-emerald-500" />
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                  Incoming Shipment Manifest Verification
                </h2>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-xs text-neutral-500 hidden sm:inline">
                  {marshmallowProducts.length} Marshmallow Flavors Available
                </span>
                {isEditable && (
                  <button
                    type="button"
                    id="btn-delete-restart-inbound"
                    onClick={() => setShowRestartDraftModal(true)}
                    className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800/60 rounded-lg transition-colors cursor-pointer"
                    title="Delete current draft to restart the transaction"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete to Restart</span>
                  </button>
                )}
              </div>
            </div>

            {/* Manifest Header Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Manifest / Waybill Number
                </label>
                <input
                  type="text"
                  value={manifestNumber}
                  disabled={!isEditable}
                  onChange={(e) => setManifestNumber(e.target.value)}
                  placeholder="e.g. MNF-NAGA-2026-0902"
                  className="w-full px-3 py-2 text-xs sm:text-sm font-mono font-bold rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121212] text-neutral-900 dark:text-white focus:ring-2 focus:ring-[#80C7F2]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Dispatch Source / Commissary
                </label>
                <input
                  type="text"
                  value={supplierOrSource}
                  disabled={!isEditable}
                  onChange={(e) => setSupplierOrSource(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121212] text-neutral-900 dark:text-white focus:ring-2 focus:ring-[#80C7F2]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Courier, Plate Number & Seal Notes
                </label>
                <input
                  type="text"
                  value={courierNotes}
                  disabled={!isEditable}
                  onChange={(e) => setCourierNotes(e.target.value)}
                  placeholder="e.g. Courier plate # NBC-1249, thermal seal intact"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121212] text-neutral-900 dark:text-white focus:ring-2 focus:ring-[#80C7F2]"
                />
              </div>
            </div>

            {/* Manifest Item Roster Header */}
            <div className="pt-2 border-t border-neutral-200/80 dark:border-neutral-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center space-x-2">
                  <Boxes className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white">
                    Manifest Cargo Line Items ({manifestLines.length})
                  </h3>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handlePopulateAllFlavors}
                    disabled={!isEditable}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all ${
                      isEditable
                        ? 'border-[#80C7F2] text-[#0369a1] dark:text-[#80C7F2] bg-[#80C7F2]/10 hover:bg-[#80C7F2]/20 cursor-pointer'
                        : 'opacity-50 cursor-not-allowed border-neutral-300 dark:border-neutral-700'
                    }`}
                  >
                    Quick Add All Flavors
                  </button>

                  <button
                    type="button"
                    onClick={handleAddLine}
                    disabled={!isEditable}
                    className={`flex items-center space-x-1 px-3 py-1 text-xs font-bold rounded-lg text-white transition-all ${
                      isEditable
                        ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-98 cursor-pointer'
                        : 'opacity-50 cursor-not-allowed bg-neutral-400'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>
              </div>

              {/* Multi-Item Line Table / Cards */}
              <div className="space-y-3">
                {manifestLines.map((line, index) => {
                  const selectedProduct = products.find((p) => p.id === line.productId) || marshmallowProducts[0];
                  const diff = (Number(line.receivedUnits) || 0) - (Number(line.expectedUnits) || 0);

                  return (
                    <div
                      key={line.id}
                      className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-850/40 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          <span className="w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <select
                              value={line.productId}
                              disabled={!isEditable}
                              onChange={(e) => handleUpdateLine(line.id, 'productId', e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121212] text-neutral-900 dark:text-white focus:ring-1 focus:ring-[#80C7F2]"
                            >
                              {marshmallowProducts.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.flavor} ({p.name})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {manifestLines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(line.id)}
                            disabled={!isEditable}
                            title="Remove this line item"
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Quantity & Condition Inputs */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-0.5">
                            Expected (Waybill)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={line.expectedUnits}
                            disabled={!isEditable}
                            onChange={(e) =>
                              handleUpdateLine(line.id, 'expectedUnits', parseInt(e.target.value) || 0)
                            }
                            className="w-full px-2.5 py-1.5 font-mono font-bold rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121212] text-neutral-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-0.5">
                            Actual Count (Recv)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={line.receivedUnits}
                            disabled={!isEditable}
                            onChange={(e) =>
                              handleUpdateLine(line.id, 'receivedUnits', parseInt(e.target.value) || 0)
                            }
                            className={`w-full px-2.5 py-1.5 font-mono font-bold rounded-lg border bg-white dark:bg-[#121212] ${
                              diff === 0
                                ? 'border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white'
                                : diff < 0
                                ? 'border-rose-400 text-rose-600 dark:text-rose-400'
                                : 'border-emerald-400 text-emerald-600 dark:text-emerald-400'
                            }`}
                          />
                        </div>

                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-0.5">
                            Condition Status
                          </label>
                          <select
                            value={line.condition}
                            disabled={!isEditable}
                            onChange={(e) =>
                              handleUpdateLine(line.id, 'condition', e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121212] text-neutral-900 dark:text-white"
                          >
                            <option value="good">Good / Intact</option>
                            <option value="damaged">Damaged / Ruptured</option>
                            <option value="shortage">Shortage</option>
                            <option value="overage">Overage</option>
                          </select>
                        </div>
                      </div>

                      {/* Line Remarks if shortage or damaged */}
                      <div>
                        <input
                          type="text"
                          value={line.notes}
                          disabled={!isEditable}
                          onChange={(e) => handleUpdateLine(line.id, 'notes', e.target.value)}
                          placeholder="Line notes (e.g. seal ruptured, missing packs, box tear)"
                          className="w-full px-2.5 py-1 text-[11px] rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#121212] text-neutral-700 dark:text-neutral-300 placeholder:text-neutral-400"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Manifest Summary Bar */}
            <div className="p-4 rounded-xl bg-neutral-100 dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-700/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-4">
                <div>
                  <span className="text-neutral-500">Total Items:</span>{' '}
                  <span className="font-bold text-neutral-900 dark:text-white font-mono">
                    {manifestSummary.itemCount} flavors
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500">Waybill:</span>{' '}
                  <span className="font-bold text-neutral-900 dark:text-white font-mono">
                    {manifestSummary.totalExpected} packs
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500">Counted:</span>{' '}
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {manifestSummary.totalReceived} packs
                  </span>
                </div>
              </div>

              <div>
                {manifestSummary.netVariance === 0 ? (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    Perfect Match (0 Variance)
                  </span>
                ) : manifestSummary.netVariance < 0 ? (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                    Net Shortage: {manifestSummary.netVariance} packs
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                    Net Overage: +{manifestSummary.netVariance} packs
                  </span>
                )}
              </div>
            </div>

            {/* Submit Manifest Button */}
            <button
              type="submit"
              disabled={!isEditable}
              className={`w-full flex items-center justify-center space-x-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold text-white shadow-sm transition-all ${
                isEditable
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-98 cursor-pointer'
                  : 'opacity-50 cursor-not-allowed bg-neutral-400 dark:bg-neutral-700'
              }`}
            >
              <PackageCheck className="w-4 h-4" />
              <span>Verify & Record Entire Manifest ({manifestSummary.totalReceived} Packs)</span>
            </button>
          </form>
        </div>

        {/* Right Column: Verified Deliveries in Current Shift (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#181818] shadow-xs">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 font-bold text-xs sm:text-sm text-neutral-900 dark:text-white flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <FileCheck className="w-4 h-4 text-emerald-500" />
                <span>Verified Inbound Deliveries ({verifiedReceivings.length})</span>
              </span>
              <span className="text-xs font-mono text-neutral-400">
                {Object.keys(groupedManifests).length} manifest(s)
              </span>
            </div>

            {verifiedReceivings.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-400">
                No inbound deliveries recorded for this shift yet.
              </div>
            ) : (
              <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
                {Object.entries(groupedManifests).map(([mnfNumber, items]) => {
                  const manifestTotalExp = items.reduce((sum, i) => sum + i.expectedUnits, 0);
                  const manifestTotalRecv = items.reduce((sum, i) => sum + i.receivedUnits, 0);
                  const source = items[0]?.supplierOrSource || 'Naga City Commissary Hub';

                  return (
                    <div
                      key={mnfNumber}
                      className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-850/40 p-3.5 space-y-3"
                    >
                      {/* Manifest Badge Header */}
                      <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
                        <div>
                          <div className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
                            {mnfNumber}
                          </div>
                          <div className="text-[11px] text-neutral-400">{source}</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            {manifestTotalRecv} / {manifestTotalExp} packs
                          </span>
                          {isEditable && (
                            <button
                              type="button"
                              id={`delete-manifest-${mnfNumber}`}
                              onClick={() => setManifestToDelete({ manifestNumber: mnfNumber, items })}
                              className="p-1 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Delete this manifest to restart transaction"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Items in this manifest */}
                      <div className="space-y-1.5 text-xs">
                        {items.map((it) => (
                          <div
                            key={it.id}
                            className="flex items-center justify-between py-1 border-b border-neutral-200/50 dark:border-neutral-800/50 last:border-0"
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <div className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                                {it.productName}
                              </div>
                              {it.notes && (
                                <div className="text-[10px] text-neutral-400 italic truncate">
                                  {it.notes}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center space-x-2 shrink-0">
                              <span className="font-mono text-[11px] text-neutral-500">
                                {it.receivedUnits} / {it.expectedUnits}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  it.condition === 'good'
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                }`}
                              >
                                {it.condition.toUpperCase()}
                              </span>
                              {isEditable && (
                                <button
                                  type="button"
                                  onClick={() => setItemToDelete({ id: it.id, name: it.productName, manifestNumber: mnfNumber })}
                                  className="p-1 rounded text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                  title="Remove item from manifest"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Shift Summary Navigation Notice (Submissions centralized in Shift Summary) */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-2.5">
              <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <div className="text-xs text-emerald-900 dark:text-emerald-200">
                <span className="font-bold">Inbound deliveries save directly to your shift inventory records.</span>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                  To submit your overall shift logs for manager validation and audit approval, proceed to the Shift Summary tab.
                </p>
              </div>
            </div>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('shift_summary')}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs whitespace-nowrap transition-colors"
              >
                <span>Go to Shift Summary</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal: Apply Inbound Manifest to Shift Summary */}
      {showConfirmVerifyModal && (
        <div
          id="confirm-verify-manifest-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-neutral-200 dark:border-neutral-800 max-w-xl w-full p-6 shadow-2xl space-y-5 text-neutral-900 dark:text-white my-8">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <PackageCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight">
                    Verify & Apply Manifest to Shift Summary?
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Waybill #{manifestNumber} • {supplierOrSource}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmVerifyModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Manifest Metrics Overview */}
            <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 text-center">
              <div>
                <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Flavors</div>
                <div className="text-sm sm:text-base font-black font-mono mt-0.5">{manifestLines.length}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Total Received</div>
                <div className="text-sm sm:text-base font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {manifestSummary.totalReceived} <span className="text-xs font-normal text-neutral-400">/ {manifestSummary.totalExpected}</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Net Variance</div>
                <div className="mt-0.5">
                  {manifestSummary.netVariance === 0 ? (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Match (0)</span>
                  ) : manifestSummary.netVariance < 0 ? (
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      Short ({manifestSummary.netVariance})
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-sky-600 dark:text-sky-400">
                      Over (+{manifestSummary.netVariance})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Line Items List */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Marshmallow Flavors in this Delivery:
              </div>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800">
                {manifestLines.map((line) => {
                  const prod = products.find((p) => p.id === line.productId) || marshmallowProducts[0];
                  const lineDiff = line.receivedUnits - line.expectedUnits;
                  return (
                    <div key={line.id} className="p-2.5 px-3 flex items-center justify-between text-xs hover:bg-neutral-50 dark:hover:bg-neutral-850">
                      <div>
                        <div className="font-semibold text-neutral-900 dark:text-white">{prod.flavor}</div>
                        {line.notes && (
                          <div className="text-[11px] text-neutral-400 italic mt-0.5">{line.notes}</div>
                        )}
                      </div>
                      <div className="flex items-center space-x-3 text-right">
                        <div>
                          <div className="font-mono font-bold text-neutral-900 dark:text-white">
                            {line.receivedUnits} packs
                          </div>
                          <div className="text-[10px] text-neutral-400">
                            Exp: {line.expectedUnits} {lineDiff !== 0 && `(${lineDiff > 0 ? '+' : ''}${lineDiff})`}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            line.condition === 'good'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                              : line.condition === 'damaged'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                          }`}
                        >
                          {line.condition.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Courier & Compliance Notes */}
            {courierNotes && (
              <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-850 text-[11px] text-neutral-600 dark:text-neutral-400">
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">Courier Note:</span> {courierNotes}
              </div>
            )}

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start space-x-2.5 text-xs text-amber-900 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold">Inventory Ledger Synchronization:</span> Recording this manifest applies these inbound counts to your shift records and aggregates them into your <span className="font-bold">Shift Summary</span> for final branch manager validation.
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmVerifyModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Cancel / Review Lines
              </button>
              <button
                type="button"
                id="modal-confirm-apply-manifest-btn"
                onClick={handleConfirmApplyToSummary}
                className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer active:scale-98"
              >
                <PackageCheck className="w-4 h-4" />
                <span>Yes, Apply to Shift Summary</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Draft and Restart Inbound Transaction */}
      {showRestartDraftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#181818] rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xl overflow-hidden p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Delete Draft to Restart Transaction?
                </h3>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Reset current manifest cargo lines & fields
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Are you sure you want to delete this draft and restart the inbound transaction? All currently entered flavor quantities and notes in this manifest form will be discarded.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRestartDraftModal(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="modal-confirm-restart-draft-btn"
                onClick={handleConfirmRestartDraft}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs cursor-pointer active:scale-98"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Yes, Delete & Restart</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Verified Manifest to Restart Transaction */}
      {manifestToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#181818] rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xl overflow-hidden p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Delete Verified Delivery Manifest?
                </h3>
                <p className="text-[11px] font-mono font-bold text-neutral-500 dark:text-neutral-400">
                  {manifestToDelete.manifestNumber}
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Are you sure you want to delete manifest <strong className="text-neutral-900 dark:text-white">{manifestToDelete.manifestNumber}</strong> containing {manifestToDelete.items.length} flavor lines ({manifestToDelete.items.reduce((s, i) => s + i.receivedUnits, 0)} received packs)?
            </p>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-[11px] text-amber-900 dark:text-amber-300">
              <span className="font-bold">Transaction Restart:</span> You can either delete and reload the cargo lines into the draft form to edit and restart the transaction, or delete the manifest completely from your shift records.
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2">
              <button
                type="button"
                id="modal-delete-and-reload-manifest-btn"
                onClick={() => handleDeleteAndRestartInForm(manifestToDelete.manifestNumber, manifestToDelete.items)}
                className="flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 border border-sky-200 dark:border-sky-800 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Delete & Reload in Form</span>
              </button>

              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setManifestToDelete(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="modal-confirm-delete-manifest-btn"
                  onClick={() => handleConfirmDeleteManifest(manifestToDelete.manifestNumber)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs cursor-pointer active:scale-98"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Single Item from Manifest */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-[#181818] rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xl overflow-hidden p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Remove Flavor Entry?
                </h3>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  {itemToDelete.manifestNumber}
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Are you sure you want to remove <strong className="text-neutral-900 dark:text-white">{itemToDelete.name}</strong> from this verified manifest?
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteItem}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs cursor-pointer active:scale-98"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
