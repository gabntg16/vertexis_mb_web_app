import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import {
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  FileSpreadsheet,
  Layers,
  History,
  Sparkles,
  Info,
  Calendar,
  UserCheck,
  Building2,
  Download,
  Printer,
  FileText,
} from 'lucide-react';
import { DiscrepancyCategory, PhysicalInventoryAudit } from '../../types';
import { generateAuditPDF } from '../../utils/auditPdfGenerator';

interface BranchPhysicalAuditProps {
  onRequisitionRedirect?: () => void;
}

export const BranchPhysicalAudit: React.FC<BranchPhysicalAuditProps> = ({ onRequisitionRedirect }) => {
  const {
    currentBranch,
    products,
    getInventoryForBranch,
    physicalAudits,
    submitPhysicalAudit,
    reconcilePhysicalAudit,
    currentUser,
    themeMode,
  } = useData();

  const isDark = themeMode === 'dark';
  const branchId = currentBranch?.id || '';
  const branchInventory = getInventoryForBranch(branchId);

  // Form State
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    branchInventory.forEach((item) => {
      initial[item.productId] = item.stock;
    });
    return initial;
  });

  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [selectedReason, setSelectedReason] = useState<DiscrepancyCategory>('Normal Variance');
  const [generalNotes, setGeneralNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'audit_form' | 'audit_history'>('audit_form');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [selectedAuditForReview, setSelectedAuditForReview] = useState<PhysicalInventoryAudit | null>(null);

  const showFeedback = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  // Branch Audits History
  const branchAuditHistory = useMemo(() => {
    return physicalAudits.filter((a) => a.branchId === branchId);
  }, [physicalAudits, branchId]);

  // Calculations for current audit in progress
  const auditCalculations = useMemo(() => {
    let totalSystemStock = 0;
    let totalPhysicalCount = 0;
    let totalDiscrepancyUnits = 0;
    let totalShrinkageValue = 0;

    const items = products.map((prod) => {
      const invItem = branchInventory.find((i) => i.productId === prod.id);
      const systemBookStock = invItem ? invItem.stock : 0;
      const physicalCount = physicalCounts[prod.id] !== undefined ? physicalCounts[prod.id] : systemBookStock;
      const discrepancy = physicalCount - systemBookStock;
      const wholesaleCost = prod.wholesalePrice || 100;
      const discrepancyValue = discrepancy * wholesaleCost;

      totalSystemStock += systemBookStock;
      totalPhysicalCount += physicalCount;
      totalDiscrepancyUnits += discrepancy;
      totalShrinkageValue += discrepancyValue;

      let discrepancyType: 'Matched' | 'Shortage' | 'Overage' = 'Matched';
      if (discrepancy < 0) discrepancyType = 'Shortage';
      else if (discrepancy > 0) discrepancyType = 'Overage';

      return {
        productId: prod.id,
        productName: prod.name,
        flavor: prod.flavor,
        systemBookStock,
        physicalCount,
        discrepancy,
        discrepancyType,
        unitPrice: prod.price,
        wholesaleCost,
        discrepancyValue,
        notes: itemNotes[prod.id] || '',
      };
    });

    return {
      items,
      totalSystemStock,
      totalPhysicalCount,
      totalDiscrepancyUnits,
      totalShrinkageValue,
    };
  }, [products, branchInventory, physicalCounts, itemNotes]);

  const handleCountChange = (productId: string, value: string) => {
    const parsed = parseInt(value, 10);
    setPhysicalCounts((prev) => ({
      ...prev,
      [productId]: isNaN(parsed) || parsed < 0 ? 0 : parsed,
    }));
  };

  const handleQuickMatch = (productId: string, systemStock: number) => {
    setPhysicalCounts((prev) => ({
      ...prev,
      [productId]: systemStock,
    }));
  };

  const handleMatchAllToBookStock = () => {
    const matched: Record<string, number> = {};
    branchInventory.forEach((item) => {
      matched[item.productId] = item.stock;
    });
    setPhysicalCounts(matched);
    showFeedback('Reset all physical shelf counts to match current system book stock.', 'info');
  };

  const handleSubmitAudit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBranch) return;

    try {
      const newAudit = submitPhysicalAudit({
        branchId: currentBranch.id,
        branchName: currentBranch.name,
        auditedBy: currentUser?.name || 'Branch Manager',
        auditorRole: currentUser?.role === 'admin' ? 'Super Admin' : 'Branch Manager',
        items: auditCalculations.items,
        discrepancyReasonCategory: selectedReason,
        notes: generalNotes.trim() || undefined,
      });

      showFeedback(
        `Physical Inventory Audit #${newAudit.id} submitted successfully! Unaccounted shrinkage: ${auditCalculations.totalDiscrepancyUnits} units (₱${Math.abs(auditCalculations.totalShrinkageValue).toLocaleString()}).`,
        'success'
      );
      setSelectedAuditForReview(newAudit);
      setActiveTab('audit_history');
    } catch (err: any) {
      showFeedback(err.message || 'Failed to submit audit.', 'error');
    }
  };

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleDownloadCountSheetPDF = () => {
    if (!currentBranch) return;
    try {
      setIsGeneratingPDF(true);
      const itemsForPDF = products.map((prod) => {
        const invItem = branchInventory.find((i) => i.productId === prod.id);
        return {
          productId: prod.id,
          productName: prod.name,
          flavor: prod.flavor,
          stock: invItem ? invItem.stock : 0,
          wholesalePrice: prod.wholesalePrice || 100,
          unitPrice: prod.price || 149,
        };
      });

      generateAuditPDF(currentBranch.name, itemsForPDF, {
        branchCode: currentBranch.code,
        auditorName: currentUser?.name || 'Branch Auditor',
        shift: 'Current Operating Shift',
      });

      showFeedback('Physical Inventory Audit Sheet (PDF) generated and downloaded successfully!', 'success');
    } catch (err: any) {
      showFeedback('Failed to generate audit sheet PDF: ' + (err?.message || err), 'error');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleReconcile = (auditId: string) => {
    try {
      reconcilePhysicalAudit(auditId);
      showFeedback(
        `Ledger reconciled! System inventory counts have been adjusted to reflect physical shelf count. Audit log written.`,
        'success'
      );
      if (selectedAuditForReview?.id === auditId) {
        setSelectedAuditForReview((prev) => (prev ? { ...prev, status: 'Reconciled' } : null));
      }
    } catch (err: any) {
      showFeedback(err.message || 'Reconciliation failed.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#80C7F2]/20 text-[#00609C] dark:text-[#80C7F2]">
              Audit & Shrinkage Control
            </span>
            <span className="text-xs font-mono text-neutral-400">
              Branch: {currentBranch?.name} ({currentBranch?.code})
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-1">
            Physical Inventory Shelf Count Audit
          </h1>
          <p className="text-xs text-neutral-500 font-medium">
            Compare actual on-shelf pack counts against the VertexIS digital ledger to uncover shrinkage, damage variances, and reconcile stock.
          </p>
        </div>

        {/* Tab Switcher & Download PDF Action */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadCountSheetPDF}
            disabled={isGeneratingPDF}
            className="px-3.5 py-2 rounded-2xl text-xs font-bold bg-[#00609C]/10 text-[#00609C] dark:bg-[#80C7F2]/15 dark:text-[#80C7F2] hover:bg-[#00609C]/20 border border-[#00609C]/20 dark:border-[#80C7F2]/30 transition-all cursor-pointer flex items-center space-x-1.5 shadow-xs"
            title="Download blank printable physical count sheet with expected book stock"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isGeneratingPDF ? 'Generating...' : 'Download Count Sheet (PDF)'}</span>
          </button>

          <div className="flex items-center space-x-1 bg-neutral-100 dark:bg-neutral-800/80 p-1 rounded-2xl border border-neutral-200 dark:border-neutral-700">
            <button
              type="button"
              onClick={() => setActiveTab('audit_form')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'audit_form'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              <ClipboardCheck className="w-3.5 h-3.5 text-[#F37021]" />
              <span>New Shelf Count Audit</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('audit_history')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'audit_history'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              <History className="w-3.5 h-3.5 text-[#80C7F2]" />
              <span>Audit History ({branchAuditHistory.length})</span>
            </button>
          </div>
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

      {activeTab === 'audit_form' ? (
        <form onSubmit={handleSubmitAudit} className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div
              className={`p-4 rounded-2xl border ${
                isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
              }`}
            >
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                System Book Stock
              </span>
              <p className="text-2xl font-black text-neutral-900 dark:text-white mt-1">
                {auditCalculations.totalSystemStock}{' '}
                <span className="text-xs font-normal text-neutral-400">packs</span>
              </p>
              <p className="text-[10px] text-neutral-500 mt-0.5">Recorded in digital ledger</p>
            </div>

            <div
              className={`p-4 rounded-2xl border ${
                isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
              }`}
            >
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                Physical Shelf Count
              </span>
              <p className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1">
                {auditCalculations.totalPhysicalCount}{' '}
                <span className="text-xs font-normal text-neutral-400">packs</span>
              </p>
              <p className="text-[10px] text-neutral-500 mt-0.5">Actual counted on retail shelves</p>
            </div>

            <div
              className={`p-4 rounded-2xl border ${
                auditCalculations.totalDiscrepancyUnits < 0
                  ? 'bg-red-500/5 border-red-500/30'
                  : auditCalculations.totalDiscrepancyUnits > 0
                  ? 'bg-amber-500/5 border-amber-500/30'
                  : isDark
                  ? 'bg-[#161616] border-neutral-800'
                  : 'bg-white border-neutral-200 shadow-xs'
              }`}
            >
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                Net Discrepancy (Units)
              </span>
              <div className="flex items-center space-x-1.5 mt-1">
                {auditCalculations.totalDiscrepancyUnits < 0 ? (
                  <TrendingDown className="w-5 h-5 text-red-500" />
                ) : auditCalculations.totalDiscrepancyUnits > 0 ? (
                  <TrendingUp className="w-5 h-5 text-amber-500" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                )}
                <span
                  className={`text-2xl font-black ${
                    auditCalculations.totalDiscrepancyUnits < 0
                      ? 'text-red-500'
                      : auditCalculations.totalDiscrepancyUnits > 0
                      ? 'text-amber-500'
                      : 'text-emerald-500'
                  }`}
                >
                  {auditCalculations.totalDiscrepancyUnits > 0 ? '+' : ''}
                  {auditCalculations.totalDiscrepancyUnits}{' '}
                  <span className="text-xs font-normal text-neutral-400">packs</span>
                </span>
              </div>
              <p className="text-[10px] text-neutral-500 mt-0.5">
                {auditCalculations.totalDiscrepancyUnits < 0
                  ? 'Unaccounted shortage / shrinkage'
                  : auditCalculations.totalDiscrepancyUnits > 0
                  ? 'Unrecorded stock overage'
                  : 'Perfect inventory match'}
              </p>
            </div>

            <div
              className={`p-4 rounded-2xl border ${
                auditCalculations.totalShrinkageValue < 0
                  ? 'bg-red-500/5 border-red-500/30'
                  : isDark
                  ? 'bg-[#161616] border-neutral-800'
                  : 'bg-white border-neutral-200 shadow-xs'
              }`}
            >
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                Financial Variance Impact
              </span>
              <p
                className={`text-2xl font-black mt-1 ${
                  auditCalculations.totalShrinkageValue < 0
                    ? 'text-red-500'
                    : auditCalculations.totalShrinkageValue > 0
                    ? 'text-emerald-500'
                    : 'text-neutral-900 dark:text-white'
                }`}
              >
                {auditCalculations.totalShrinkageValue < 0 ? '-' : '+'}₱
                {Math.abs(auditCalculations.totalShrinkageValue).toLocaleString()}
              </p>
              <p className="text-[10px] text-neutral-500 mt-0.5">At wholesale commissary cost (₱100/pk)</p>
            </div>
          </div>

          {/* Audit Entry Table */}
          <div
            className={`p-6 rounded-3xl border ${
              isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-200 dark:border-neutral-800">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  SKU-Level Shelf Count Audit
                </h3>
                <p className="text-xs text-neutral-500">
                  Input actual physical counts for each gourmet marshmallow flavor.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadCountSheetPDF}
                  disabled={isGeneratingPDF}
                  className="px-3 py-1.5 rounded-xl bg-[#00609C]/10 text-[#00609C] dark:bg-[#80C7F2]/15 dark:text-[#80C7F2] hover:bg-[#00609C]/20 border border-[#00609C]/20 dark:border-[#80C7F2]/30 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
                  title="Download printable A4 worksheet for physical inventory audit"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isGeneratingPDF ? 'Generating...' : 'Download Count Sheet (PDF)'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleMatchAllToBookStock}
                  className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors flex items-center space-x-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Fill All with Book Stock</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">Flavor & SKU</th>
                    <th className="py-3 px-3 text-center">System Book Stock</th>
                    <th className="py-3 px-3 text-center">Physical Shelf Count</th>
                    <th className="py-3 px-3 text-center">Variance (Units)</th>
                    <th className="py-3 px-3 text-right">Wholesale Loss (₱)</th>
                    <th className="py-3 px-3">Item Note / Observations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                  {auditCalculations.items.map((item) => (
                    <tr
                      key={item.productId}
                      className={`hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition-colors ${
                        item.discrepancy < 0
                          ? 'bg-red-500/5'
                          : item.discrepancy > 0
                          ? 'bg-amber-500/5'
                          : ''
                      }`}
                    >
                      <td className="py-3.5 px-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#F37021]" />
                          <div>
                            <p className="font-extrabold text-neutral-900 dark:text-white text-sm">
                              {item.flavor}
                            </p>
                            <p className="text-[11px] text-neutral-500 font-mono">
                              SRP: ₱{item.unitPrice} • Cost: ₱{item.wholesaleCost}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span className="font-bold text-sm text-neutral-700 dark:text-neutral-300">
                          {item.systemBookStock}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <div className="inline-flex items-center space-x-1.5">
                          <input
                            type="number"
                            min="0"
                            max="9999"
                            value={physicalCounts[item.productId] ?? item.systemBookStock}
                            onChange={(e) => handleCountChange(item.productId, e.target.value)}
                            className={`w-20 px-2.5 py-1.5 rounded-xl text-center font-black text-sm border focus:outline-none focus:ring-2 focus:ring-[#80C7F2] ${
                              item.discrepancy !== 0
                                ? 'border-[#F37021] bg-orange-500/5 text-neutral-900 dark:text-white'
                                : isDark
                                ? 'bg-[#101010] border-neutral-700 text-white'
                                : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => handleQuickMatch(item.productId, item.systemBookStock)}
                            title="Reset to system stock"
                            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black ${
                            item.discrepancy < 0
                              ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                              : item.discrepancy > 0
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {item.discrepancy > 0 ? `+${item.discrepancy}` : item.discrepancy}{' '}
                          {item.discrepancy === 0 ? 'Matched' : 'variance'}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <span
                          className={`font-mono font-bold text-xs ${
                            item.discrepancyValue < 0
                              ? 'text-red-500'
                              : item.discrepancyValue > 0
                              ? 'text-emerald-500'
                              : 'text-neutral-400'
                          }`}
                        >
                          {item.discrepancyValue < 0 ? '-' : item.discrepancyValue > 0 ? '+' : ''}₱
                          {Math.abs(item.discrepancyValue).toLocaleString()}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <input
                          type="text"
                          placeholder="e.g. 2 melted on top rack"
                          value={itemNotes[item.productId] || ''}
                          onChange={(e) =>
                            setItemNotes((prev) => ({
                              ...prev,
                              [item.productId]: e.target.value,
                            }))
                          }
                          className={`w-full px-2.5 py-1 rounded-lg text-xs border focus:outline-none ${
                            isDark
                              ? 'bg-[#101010] border-neutral-800 text-white'
                              : 'bg-white border-neutral-200 text-neutral-900'
                          }`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Classification & Notes Card */}
          <div
            className={`p-6 rounded-3xl border grid grid-cols-1 sm:grid-cols-2 gap-4 ${
              isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
            }`}
          >
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Primary Discrepancy Cause Classification
              </label>
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value as DiscrepancyCategory)}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-[#80C7F2] ${
                  isDark
                    ? 'bg-[#101010] border-neutral-700 text-white'
                    : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                }`}
              >
                <option value="Normal Variance">Normal Variance (Negligible count swing)</option>
                <option value="Damaged Found Unlogged">Damaged Found Unlogged on Shelf</option>
                <option value="Shortage / Suspected Shrinkage">
                  Shortage / Suspected Shrinkage / Pilferage
                </option>
                <option value="Unrecorded Free Samples / Promo">
                  Unrecorded Free Samples / Promo Giveaways
                </option>
                <option value="Cashier Punch Mismatch">
                  Cashier Punch / Ringing Flavor Mismatch
                </option>
                <option value="Transit Loss">Transit / Delivery Inbound Shortage</option>
              </select>
              <p className="text-[10px] text-neutral-500 mt-1">
                Audits are permanently archived with this categorization for BIR and enterprise compliance.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Auditor Findings & Observations
              </label>
              <textarea
                rows={2}
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                placeholder="Details on physical shelf condition, humidity, or missing packs..."
                className={`w-full px-3.5 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#80C7F2] ${
                  isDark
                    ? 'bg-[#101010] border-neutral-700 text-white'
                    : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                }`}
              />
            </div>
          </div>

          {/* Submission Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="text-xs text-neutral-500">
              Auditor: <strong className="text-neutral-800 dark:text-neutral-200">{currentUser?.name || 'Branch Manager'}</strong> • Date: <strong>{new Date().toLocaleDateString()}</strong>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleDownloadCountSheetPDF}
                disabled={isGeneratingPDF}
                className="px-4 py-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold text-xs sm:text-sm hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all flex items-center space-x-2 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#80C7F2]" />
                <span>Print / PDF Count Sheet</span>
              </button>
              <button
                type="submit"
                className="px-6 py-3 rounded-2xl bg-[#F37021] text-white font-bold text-xs sm:text-sm hover:bg-[#d85e15] shadow-md transition-all flex items-center space-x-2 cursor-pointer"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>Submit Physical Audit</span>
              </button>
            </div>
          </div>
        </form>
      ) : (
        /* Audit History View */
        <div className="space-y-4">
          {branchAuditHistory.length === 0 ? (
            <div
              className={`p-12 text-center rounded-3xl border ${
                isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200'
              }`}
            >
              <ClipboardCheck className="w-12 h-12 text-neutral-400 mx-auto mb-3 opacity-60" />
              <p className="text-sm font-bold">No physical audits recorded yet</p>
              <p className="text-xs text-neutral-500 mt-1">
                Conduct your first physical count audit to detect shrinkage and maintain high inventory accuracy.
              </p>
              <button
                onClick={() => setActiveTab('audit_form')}
                className="mt-4 px-4 py-2 rounded-xl bg-[#F37021] text-white text-xs font-bold hover:bg-[#d85e15] cursor-pointer"
              >
                Start Physical Count Now
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {branchAuditHistory.map((audit) => (
                <div
                  key={audit.id}
                  className={`p-5 rounded-3xl border transition-all ${
                    isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-sm text-neutral-900 dark:text-white">
                        Audit #{audit.id}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          audit.status === 'Reconciled'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {audit.status}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                        {audit.discrepancyReasonCategory}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 text-xs text-neutral-400">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(audit.timestamp).toLocaleString()}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center space-x-1">
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>{audit.auditedBy}</span>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-3.5 text-xs">
                    <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/60">
                      <span className="text-neutral-400 text-[10px]">Book Stock:</span>
                      <p className="font-bold text-neutral-900 dark:text-white mt-0.5">
                        {audit.totalSystemStock} packs
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/60">
                      <span className="text-neutral-400 text-[10px]">Physical Count:</span>
                      <p className="font-bold text-sky-600 dark:text-sky-400 mt-0.5">
                        {audit.totalPhysicalCount} packs
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/60">
                      <span className="text-neutral-400 text-[10px]">Variance:</span>
                      <p
                        className={`font-black mt-0.5 ${
                          audit.totalDiscrepancyUnits < 0
                            ? 'text-red-500'
                            : audit.totalDiscrepancyUnits > 0
                            ? 'text-amber-500'
                            : 'text-emerald-500'
                        }`}
                      >
                        {audit.totalDiscrepancyUnits > 0 ? '+' : ''}
                        {audit.totalDiscrepancyUnits} packs
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/60">
                      <span className="text-neutral-400 text-[10px]">Cost Variance:</span>
                      <p
                        className={`font-black mt-0.5 ${
                          audit.totalShrinkageValue < 0 ? 'text-red-500' : 'text-emerald-500'
                        }`}
                      >
                        {audit.totalShrinkageValue < 0 ? '-' : '+'}₱
                        {Math.abs(audit.totalShrinkageValue).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {audit.notes && (
                    <p className="text-xs text-neutral-500 italic bg-neutral-50 dark:bg-neutral-900/30 p-2 rounded-xl mb-3">
                      "{audit.notes}"
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="text-[11px] text-neutral-400">
                      {audit.status === 'Reconciled' ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          ✓ Reconciled by {audit.reconciledBy || 'Manager'} on {audit.reconciledAt ? new Date(audit.reconciledAt).toLocaleString() : ''}
                        </span>
                      ) : (
                        <span>Pending Reconciliation to align on-hand ledger</span>
                      )}
                    </div>

                    {audit.status !== 'Reconciled' && (
                      <button
                        type="button"
                        onClick={() => handleReconcile(audit.id)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Reconcile Ledger Now</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
