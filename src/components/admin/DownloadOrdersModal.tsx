import React, { useState, useMemo } from 'react';
import {
  Download,
  X,
  FileSpreadsheet,
  FileText,
  Copy,
  Check,
  Filter,
  Calendar,
  Building2,
  Sparkles,
  Table,
} from 'lucide-react';
import { Order, Branch } from '../../types';
import {
  mapOrderToExportRow,
  downloadOrdersExcel,
  downloadOrdersCSV,
  ExportOrderItem,
} from '../../utils/orderExportUtils';

interface DownloadOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  branches: Branch[];
  isDark: boolean;
}

export const DownloadOrdersModal: React.FC<DownloadOrdersModalProps> = ({
  isOpen,
  onClose,
  orders,
  branches,
  isDark,
}) => {
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Filter orders based on user selection
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      // Branch filter
      if (selectedBranchId !== 'all') {
        if (ord.branchId !== selectedBranchId) return false;
      }

      // Status filter
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'paid') {
          const isPaid =
            ord.status === 'approved' ||
            ord.status === 'completed' ||
            ord.status === 'dispatched' ||
            !!ord.proofImagePath;
          if (!isPaid) return false;
        } else if (selectedStatus === 'pending') {
          if (ord.status !== 'pending' && ord.status !== 'waitingApproval') return false;
        } else if (selectedStatus === 'dispatched') {
          if (!ord.isDispatched && ord.productionStage !== 'ready_for_dispatch') return false;
        } else if (ord.status !== selectedStatus) {
          return false;
        }
      }

      // Date filter
      if (dateRange !== 'all') {
        const orderDate = new Date(ord.createdAt).getTime();
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        if (dateRange === 'today' && now - orderDate > dayMs) return false;
        if (dateRange === '7days' && now - orderDate > 7 * dayMs) return false;
        if (dateRange === '30days' && now - orderDate > 30 * dayMs) return false;
      }

      return true;
    });
  }, [orders, selectedBranchId, selectedStatus, dateRange]);

  // Map to the requested 14-column structure
  const exportRows = useMemo(() => {
    return filteredOrders.map((ord, idx) => mapOrderToExportRow(ord, idx));
  }, [filteredOrders]);

  // Summary figures
  const summary = useMemo(() => {
    const totalPacks = exportRows.reduce((acc, row) => acc + (Number(row.Quantity) || 0), 0);
    const totalRevenue = filteredOrders.reduce((acc, ord) => acc + (ord.totalAmount || 0), 0);
    return {
      count: exportRows.length,
      totalPacks,
      totalRevenue,
    };
  }, [exportRows, filteredOrders]);

  if (!isOpen) return null;

  const handleDownloadExcel = () => {
    setIsExporting(true);
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      downloadOrdersExcel(filteredOrders, `VertexIS_Orders_Summary_${timestamp}.xlsx`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadCSV = () => {
    setIsExporting(true);
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      downloadOrdersCSV(filteredOrders, `VertexIS_Orders_Summary_${timestamp}.csv`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (exportRows.length === 0) return;

    const headers: (keyof ExportOrderItem)[] = [
      'Order ID',
      'Partner Name',
      'Order Date',
      'Package Type',
      'Quantity',
      'Ads Amount',
      'Total Amount (₱)',
      'Amount Paid',
      'Payment Channel',
      'Payment Date',
      'Ship Out Date',
      'Arrival date',
      'Balance',
      'Status',
    ];

    const tsvHeader = headers.join('\t');
    const tsvRows = exportRows
      .map((row) => headers.map((h) => String(row[h] ?? '')).join('\t'))
      .join('\n');
    const fullTSV = `${tsvHeader}\n${tsvRows}`;

    navigator.clipboard.writeText(fullTSV).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-3xl shadow-2xl border overflow-hidden my-auto ${
          isDark
            ? 'bg-[#181818] border-neutral-800 text-white'
            : 'bg-white border-neutral-200 text-neutral-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="shrink-0 p-5 sm:p-6 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-transparent via-[#80C7F2]/5 to-transparent">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  Download Orders Spreadsheet
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  Standard Franchise Format
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Export order results formatted with Partner Name, Package Type, Amounts, Payment Channels & Dates.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleCopyToClipboard}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center space-x-1.5 cursor-pointer ${
                copied
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : isDark
                  ? 'bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-700'
                  : 'bg-neutral-100 border-neutral-200 text-neutral-700 hover:bg-neutral-200'
              }`}
              title="Copy tab-separated table to clipboard (paste directly into Excel or Google Sheets)"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy to Excel'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadCSV}
              disabled={isExporting || exportRows.length === 0}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 ${
                isDark
                  ? 'bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-700'
                  : 'bg-neutral-100 border-neutral-200 text-neutral-700 hover:bg-neutral-200'
              }`}
              title="Download as CSV (Compatible with Google Sheets & Excel)"
            >
              <FileText className="w-3.5 h-3.5 text-sky-500" />
              <span>Download CSV</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadExcel}
              disabled={isExporting || exportRows.length === 0}
              className="px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg cursor-pointer disabled:opacity-50"
              title="Download genuine Microsoft Excel (.xlsx) file"
            >
              <Download className="w-4 h-4" />
              <span>Download Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="shrink-0 p-4 border-b border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/70 dark:bg-neutral-900/50 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Branch Selector */}
            <div className="flex items-center space-x-1.5">
              <Building2 className="w-3.5 h-3.5 text-neutral-400" />
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className={`px-2.5 py-1.5 rounded-xl border font-semibold outline-hidden cursor-pointer ${
                  isDark
                    ? 'bg-neutral-800 border-neutral-700 text-white'
                    : 'bg-white border-neutral-300 text-neutral-900'
                }`}
              >
                <option value="all">All Branches / Partners</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name.replace('Marsh Bites - ', '')}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Selector */}
            <div className="flex items-center space-x-1.5">
              <Filter className="w-3.5 h-3.5 text-neutral-400" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className={`px-2.5 py-1.5 rounded-xl border font-semibold outline-hidden cursor-pointer ${
                  isDark
                    ? 'bg-neutral-800 border-neutral-700 text-white'
                    : 'bg-white border-neutral-300 text-neutral-900'
                }`}
              >
                <option value="all">All Statuses</option>
                <option value="paid">PAID Orders Only</option>
                <option value="approved">Approved</option>
                <option value="waitingApproval">Waiting Approval</option>
                <option value="pending">Pending</option>
                <option value="dispatched">Dispatched / Transit</option>
                <option value="completed">Completed / Fulfilled</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Date Range Selector */}
            <div className="flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-neutral-400" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className={`px-2.5 py-1.5 rounded-xl border font-semibold outline-hidden cursor-pointer ${
                  isDark
                    ? 'bg-neutral-800 border-neutral-700 text-white'
                    : 'bg-white border-neutral-300 text-neutral-900'
                }`}
              >
                <option value="all">All Time</option>
                <option value="today">Today Only</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
              </select>
            </div>
          </div>

          {/* Quick Summary Badges */}
          <div className="flex items-center space-x-3 text-neutral-500 dark:text-neutral-400">
            <span>
              Rows: <strong className="text-neutral-900 dark:text-white">{summary.count}</strong>
            </span>
            <span>•</span>
            <span>
              Total Packs:{' '}
              <strong className="text-neutral-900 dark:text-white">
                {summary.totalPacks.toLocaleString()}
              </strong>
            </span>
            <span>•</span>
            <span>
              Total Value:{' '}
              <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                ₱{summary.totalRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </strong>
            </span>
          </div>
        </div>

        {/* Live Spreadsheet Preview Table */}
        <div className="flex-1 overflow-auto p-4 scrollbar-thin">
          <div className="inline-block min-w-full align-middle">
            <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-2xs">
              <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800 text-left text-xs">
                {/* 14 Headers matching user format */}
                <thead
                  className={`font-black text-neutral-800 dark:text-neutral-200 select-none ${
                    isDark ? 'bg-neutral-900' : 'bg-neutral-100'
                  }`}
                >
                  <tr>
                    <th className="px-3 py-2.5 font-bold uppercase tracking-wider whitespace-nowrap border-r border-neutral-200/60 dark:border-neutral-800">
                      Order ID
                    </th>
                    <th className="px-3 py-2.5 font-bold uppercase tracking-wider whitespace-nowrap border-r border-neutral-200/60 dark:border-neutral-800">
                      Partner Name
                    </th>
                    <th className="px-3 py-2.5 font-bold uppercase tracking-wider whitespace-nowrap border-r border-neutral-200/60 dark:border-neutral-800">
                      Order Date
                    </th>
                    <th className="px-3 py-2.5 font-bold uppercase tracking-wider whitespace-nowrap border-r border-neutral-200/60 dark:border-neutral-800">
                      Package Type
                    </th>
                    <th className="px-3 py-2.5 font-bold uppercase tracking-wider whitespace-nowrap text-right border-r border-neutral-200/60 dark:border-neutral-800">
                      Quantity
                    </th>
                    <th className="px-3 py-2.5 font-bold uppercase tracking-wider whitespace-nowrap text-center border-r border-neutral-200/60 dark:border-neutral-800">
                      Ads Amount
                    </th>
                    <th className="px-3 py-2.5 font-bold uppercase tracking-wider whitespace-nowrap text-right border-r border-neutral-200/60 dark:border-neutral-800">
                      Total Amount (₱)
                    </th>
                    <th className="px-3 py-2.5 font-bold uppercase tracking-wider whitespace-nowrap text-right border-r border-neutral-200/60 dark:border-neutral-800">
                      Amount Paid
                    </th>
                    <th className="px-3 py-2.5 font-bold uppercase tracking-wider whitespace-nowrap border-r border-neutral-200/60 dark:border-neutral-800">
                      Payment Channel
                    </th>
                    <th className="px-3 py-2.5 font-bold uppercase tracking-wider whitespace-nowrap border-r border-neutral-200/60 dark:border-neutral-800">
                      Payment Date
                    </th>
                    <th className="px-3 py-2.5 font-bold uppercase tracking-wider whitespace-nowrap border-r border-neutral-200/60 dark:border-neutral-800">
                      Ship Out Date
                    </th>
                    <th className="px-3 py-2.5 font-bold uppercase tracking-wider whitespace-nowrap border-r border-neutral-200/60 dark:border-neutral-800">
                      Arrival date
                    </th>
                    <th className="px-3 py-2.5 font-bold uppercase tracking-wider whitespace-nowrap text-right border-r border-neutral-200/60 dark:border-neutral-800">
                      Balance
                    </th>
                    <th className="px-3 py-2.5 font-bold uppercase tracking-wider whitespace-nowrap text-center">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/70 dark:divide-neutral-800/80">
                  {exportRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={14}
                        className="px-4 py-8 text-center text-neutral-400 font-medium"
                      >
                        No orders match the current filter selection.
                      </td>
                    </tr>
                  ) : (
                    exportRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={`transition-colors ${
                          idx % 2 === 0
                            ? isDark
                              ? 'bg-neutral-900/40'
                              : 'bg-white'
                            : isDark
                            ? 'bg-neutral-900/80'
                            : 'bg-neutral-50/60'
                        } hover:bg-[#80C7F2]/10`}
                      >
                        <td className="px-3 py-2 font-mono font-bold text-neutral-900 dark:text-neutral-100 border-r border-neutral-200/40 dark:border-neutral-800/60">
                          {row['Order ID']}
                        </td>
                        <td className="px-3 py-2 font-semibold text-neutral-900 dark:text-neutral-100 whitespace-nowrap border-r border-neutral-200/40 dark:border-neutral-800/60">
                          {row['Partner Name']}
                        </td>
                        <td className="px-3 py-2 font-mono text-neutral-600 dark:text-neutral-400 whitespace-nowrap border-r border-neutral-200/40 dark:border-neutral-800/60">
                          {row['Order Date']}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap border-r border-neutral-200/40 dark:border-neutral-800/60">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              row['Package Type'].toLowerCase() === 'gold'
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                : row['Package Type'].toLowerCase() === 'platinum'
                                ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                                : 'bg-slate-500/15 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {row['Package Type']}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-neutral-900 dark:text-neutral-100 border-r border-neutral-200/40 dark:border-neutral-800/60">
                          {row.Quantity}
                        </td>
                        <td className="px-3 py-2 text-center text-neutral-400 border-r border-neutral-200/40 dark:border-neutral-800/60">
                          {row['Ads Amount'] || '-'}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-neutral-900 dark:text-neutral-100 whitespace-nowrap border-r border-neutral-200/40 dark:border-neutral-800/60">
                          {row['Total Amount (₱)']}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap border-r border-neutral-200/40 dark:border-neutral-800/60">
                          {row['Amount Paid']}
                        </td>
                        <td className="px-3 py-2 text-neutral-700 dark:text-neutral-300 whitespace-nowrap border-r border-neutral-200/40 dark:border-neutral-800/60">
                          {row['Payment Channel']}
                        </td>
                        <td className="px-3 py-2 font-mono text-neutral-600 dark:text-neutral-400 whitespace-nowrap border-r border-neutral-200/40 dark:border-neutral-800/60">
                          {row['Payment Date']}
                        </td>
                        <td className="px-3 py-2 font-mono text-neutral-600 dark:text-neutral-400 whitespace-nowrap border-r border-neutral-200/40 dark:border-neutral-800/60">
                          {row['Ship Out Date']}
                        </td>
                        <td className="px-3 py-2 font-mono text-neutral-600 dark:text-neutral-400 whitespace-nowrap border-r border-neutral-200/40 dark:border-neutral-800/60">
                          {row['Arrival date']}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-neutral-600 dark:text-neutral-400 border-r border-neutral-200/40 dark:border-neutral-800/60">
                          {row.Balance}
                        </td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded font-black text-[10px] uppercase ${
                              row.Status === 'PAID'
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : row.Status === 'WAITING APPROVAL'
                                ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                                : row.Status === 'PENDING'
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                : row.Status === 'REJECTED'
                                ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                                : 'bg-neutral-500/15 text-neutral-600 dark:text-neutral-300'
                            }`}
                          >
                            {row.Status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="shrink-0 p-4 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-neutral-50/50 dark:bg-neutral-900/40 text-xs text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span>
              Spreadsheet columns: <code>Order ID</code>, <code>Partner Name</code>, <code>Order Date</code>, <code>Package Type</code>, <code>Quantity</code>, <code>Ads Amount</code>, <code>Total Amount (₱)</code>, <code>Amount Paid</code>, <code>Payment Channel</code>, <code>Payment Date</code>, <code>Ship Out Date</code>, <code>Arrival date</code>, <code>Balance</code>, <code>Status</code>
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleDownloadCSV}
              className="px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={handleDownloadExcel}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black transition-colors cursor-pointer shadow-xs"
            >
              Download .xlsx
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
