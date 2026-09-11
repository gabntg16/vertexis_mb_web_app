import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { BIRReceipt } from '../../types';
import { BIRReceiptModal } from '../pos/BIRReceiptModal';
import {
  DollarSign,
  Search,
  Filter,
  Download,
  Calendar,
  Package,
  TrendingUp,
  Store,
  FileSpreadsheet,
  FileText,
  Lock,
  ShieldCheck,
  CheckCircle2,
  Ban,
  RotateCcw,
  Building2,
  CreditCard,
  Banknote,
  Smartphone,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const AdminSalesHistory: React.FC = () => {
  const { sales, branches, products, birReceipts, shiftClosings, posAuditLogs, themeMode } = useData();

  const [activeTab, setActiveTab] = useState<'analytics' | 'receipts' | 'zreadings' | 'audit'>('analytics');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeReceiptModal, setActiveReceiptModal] = useState<BIRReceipt | null>(null);

  const isDark = themeMode === 'dark';

  // Filtered Sales List
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const matchesBranch = selectedBranchId === 'all' ? true : s.branchId === selectedBranchId;
      const matchesSearch =
        s.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.receiptPath && s.receiptPath.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesBranch && matchesSearch;
    });
  }, [sales, selectedBranchId, searchQuery]);

  // Filtered BIR Receipts
  const filteredReceipts = useMemo(() => {
    return birReceipts.filter((r) => {
      const matchesBranch = selectedBranchId === 'all' ? true : r.branchId === selectedBranchId;
      const matchesSearch =
        r.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.cashierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.branchName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesBranch && matchesSearch;
    });
  }, [birReceipts, selectedBranchId, searchQuery]);

  // Filtered Z-Readings
  const filteredZReadings = useMemo(() => {
    return shiftClosings.filter((z) => {
      const matchesBranch = selectedBranchId === 'all' ? true : z.branchId === selectedBranchId;
      const matchesSearch =
        z.zReadingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        z.cashierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        z.managerApprovedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
        z.branchName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesBranch && matchesSearch;
    });
  }, [shiftClosings, selectedBranchId, searchQuery]);

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return posAuditLogs.filter((l) => {
      const matchesBranch = selectedBranchId === 'all' ? true : l.branchId === selectedBranchId;
      const matchesSearch =
        l.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.referenceId && l.referenceId.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesBranch && matchesSearch;
    });
  }, [posAuditLogs, selectedBranchId, searchQuery]);

  // Flavor Analytics
  const flavorStats = useMemo(() => {
    const map: Record<string, { flavor: string; units: number; revenue: number }> = {};
    products.forEach((p) => {
      map[p.id] = { flavor: p.flavor, units: 0, revenue: 0 };
    });

    filteredSales.forEach((s) => {
      if (map[s.productId]) {
        map[s.productId].units += s.quantity;
        map[s.productId].revenue += s.total;
      }
    });

    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales, products]);

  // Payment Breakdown Summary
  const paymentStats = useMemo(() => {
    const map: Record<string, number> = {
      Cash: 0,
      GCash: 0,
      Maya: 0,
      'Credit Card': 0,
      'Debit Card': 0,
      'Bank Transfer': 0,
    };

    filteredReceipts.forEach((r) => {
      if (r.status === 'completed') {
        r.payments.forEach((p) => {
          map[p.method] = (map[p.method] || 0) + p.amount;
        });
      }
    });

    return Object.entries(map)
      .map(([method, total]) => ({ method, total }))
      .filter((m) => m.total > 0);
  }, [filteredReceipts]);

  // Tax and Revenue Totals
  const totalGross = filteredReceipts
    .filter((r) => r.status === 'completed')
    .reduce((sum, r) => sum + r.grossSales, 0);

  const totalNet = filteredReceipts
    .filter((r) => r.status === 'completed')
    .reduce((sum, r) => sum + r.netSales, 0);

  const totalDiscounts = filteredReceipts
    .filter((r) => r.status === 'completed')
    .reduce((sum, r) => sum + r.discountAmount, 0);

  const totalVat = filteredReceipts
    .filter((r) => r.status === 'completed')
    .reduce((sum, r) => sum + r.vatAmount, 0);

  const totalVatable = filteredReceipts
    .filter((r) => r.status === 'completed')
    .reduce((sum, r) => sum + r.vatableSales, 0);

  const totalVatExempt = filteredReceipts
    .filter((r) => r.status === 'completed')
    .reduce((sum, r) => sum + r.vatExemptSales, 0);

  const COLORS = ['#80C7F2', '#F37021', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#3B82F6'];

  const handleExportCSV = () => {
    const headers = [
      'OR Number',
      'Branch',
      'Date Time',
      'Cashier',
      'Gross Sales',
      'Discounts',
      'Net Sales',
      'VATable (12%)',
      'VAT Amount (12%)',
      'VAT Exempt',
      'Status',
    ];
    const rows = filteredReceipts.map((r) => [
      r.receiptNumber,
      `"${r.branchName.replace(/"/g, '""')}"`,
      r.timestamp,
      `"${r.cashierName.replace(/"/g, '""')}"`,
      r.grossSales,
      r.discountAmount,
      r.netSales,
      r.vatableSales,
      r.vatAmount,
      r.vatExemptSales,
      r.status.toUpperCase(),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `marsh_bites_sales_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
            Enterprise Sales & Financial Analytics
          </h1>
          <p className="text-xs text-neutral-500 font-medium">
            Nationwide franchise sales logs, revenue performance, statutory VAT breakdowns, and shift closings.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export Sales Report</span>
        </button>
      </div>

      {/* Financial KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 block">
            Net Enterprise Sales
          </span>
          <span className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white mt-1 block">
            ₱{totalNet.toLocaleString()}
          </span>
          <span className="text-[10px] text-neutral-400 mt-0.5 block">
            From {filteredReceipts.filter((r) => r.status === 'completed').length} completed ORs
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 block">
            12% Output VAT
          </span>
          <span className="text-xl sm:text-2xl font-black text-sky-600 dark:text-sky-400 mt-1 block">
            ₱{totalVat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-neutral-400 mt-0.5 block">
            VATable Base: ₱{totalVatable.toLocaleString()}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 block">
            Statutory Discounts
          </span>
          <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
            ₱{totalDiscounts.toLocaleString()}
          </span>
          <span className="text-[10px] text-neutral-400 mt-0.5 block">
            VAT-Exempt Sales: ₱{totalVatExempt.toLocaleString()}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 block">
            Closed Z-Readings
          </span>
          <span className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 mt-1 block">
            {filteredZReadings.length} Shifts
          </span>
          <span className="text-[10px] text-neutral-400 mt-0.5 block">
            Across 19 Nationwide Branches
          </span>
        </div>
      </div>

      {/* Tab Navigation & Branch Selector */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2 bg-neutral-100 dark:bg-neutral-800/60 rounded-2xl">
        <div className="flex items-center space-x-1 w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'analytics', label: 'Sales Analytics & Charts', icon: TrendingUp },
            { id: 'receipts', label: `Branch Order Slips (${filteredReceipts.length})`, icon: FileText },
            { id: 'zreadings', label: `Shift Closings (${filteredZReadings.length})`, icon: Lock },
            { id: 'audit', label: `Security Audit (${filteredAuditLogs.length})`, icon: ShieldCheck },
          ].map((t) => {
            const Icon = t.icon;
            const isSelected = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                  isSelected
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Branch Filter & Search */}
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-hidden"
          >
            <option value="all">All 19 Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: ANALYTICS & CHARTS
          ========================================================================= */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Flavor Sales Bar Chart */}
          <div className="lg:col-span-2 p-6 rounded-3xl border bg-white dark:bg-neutral-900 border-neutral-200/90 dark:border-neutral-800 shadow-2xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Gourmet Flavor Sales Revenue
              </h3>
              <p className="text-xs text-neutral-500">
                Comparative sales performance across all marshmallow recipes
              </p>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={flavorStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#262626' : '#e5e7eb'} />
                  <XAxis type="number" stroke={isDark ? '#888' : '#666'} fontSize={11} tickFormatter={(v) => `₱${v}`} />
                  <YAxis dataKey="flavor" type="category" stroke={isDark ? '#888' : '#666'} fontSize={11} width={120} />
                  <Tooltip
                    formatter={(val: any) => [`₱${Number(val || 0).toLocaleString()}`, 'Revenue']}
                    contentStyle={{
                      backgroundColor: isDark ? '#1f1f1f' : '#ffffff',
                      borderColor: isDark ? '#333' : '#e5e7eb',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="revenue" fill="#F37021" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Payment Tender Pie Chart */}
          <div className="p-6 rounded-3xl border bg-white dark:bg-neutral-900 border-neutral-200/90 dark:border-neutral-800 shadow-2xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Payment Tender Distribution
              </h3>
              <p className="text-xs text-neutral-500">Breakdown by cash, e-wallets, cards</p>
            </div>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentStats}
                    dataKey="total"
                    nameKey="method"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={40}
                    paddingAngle={3}
                  >
                    {paymentStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`₱${Number(val || 0).toLocaleString()}`, 'Amount']}
                    contentStyle={{
                      backgroundColor: isDark ? '#1f1f1f' : '#ffffff',
                      borderColor: isDark ? '#333' : '#e5e7eb',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-1 mt-2 text-[10px] text-neutral-500">
              {paymentStats.map((p, i) => (
                <div key={i} className="flex items-center space-x-1.5 truncate">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="truncate">{p.method}: ₱{p.total.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* =========================================================================
          TAB 2: INTERNAL ORDER SLIPS TABLE
          ========================================================================= */}
      {activeTab === 'receipts' && (
        <div className="rounded-2xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 font-bold uppercase tracking-wider text-neutral-500 text-[11px]">
                <tr>
                  <th className="py-3 px-4">Order Slip Ref</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Cashier</th>
                  <th className="py-3 px-4 text-right">Gross</th>
                  <th className="py-3 px-4 text-right">Discount</th>
                  <th className="py-3 px-4 text-right">Net Sales</th>
                  <th className="py-3 px-4 text-right">12% VAT</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                {filteredReceipts.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-neutral-400">
                      No order slips found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredReceipts.map((r) => (
                    <tr key={r.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-neutral-900 dark:text-white">
                        {r.receiptNumber}
                      </td>
                      <td className="py-3 px-4 font-medium text-neutral-800 dark:text-neutral-200">
                        {r.branchName}
                      </td>
                      <td className="py-3 px-4 text-neutral-500">
                        {new Date(r.timestamp).toLocaleString('en-PH', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-3 px-4 text-neutral-700 dark:text-neutral-300">
                        {r.cashierName}
                      </td>
                      <td className="py-3 px-4 text-right text-neutral-600 dark:text-neutral-400">
                        ₱{r.grossSales.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                        {r.discountAmount > 0 ? `-₱${r.discountAmount.toLocaleString()}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-neutral-900 dark:text-white">
                        ₱{r.netSales.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-sky-600 dark:text-sky-400">
                        ₱{r.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : r.status === 'voided'
                              ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {r.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setActiveReceiptModal(r)}
                          className="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300 rounded-lg text-xs font-semibold"
                        >
                          View Slip
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: Z-READING SHIFT CLOSINGS TABLE
          ========================================================================= */}
      {activeTab === 'zreadings' && (
        <div className="rounded-2xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 font-bold uppercase tracking-wider text-neutral-500 text-[11px]">
                <tr>
                  <th className="py-3 px-4">Z-Report No</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">Closing Timestamp</th>
                  <th className="py-3 px-4">Cashier / Manager</th>
                  <th className="py-3 px-4 text-right">Day Net Sales</th>
                  <th className="py-3 px-4 text-right">Cash Counted</th>
                  <th className="py-3 px-4 text-center">Variance</th>
                  <th className="py-3 px-4 text-right">Accumulated Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                {filteredZReadings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-neutral-400">
                      No shift closing Z-readings recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredZReadings.map((zr) => (
                    <tr key={zr.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-neutral-900 dark:text-white">
                        {zr.zReadingNumber}
                      </td>
                      <td className="py-3 px-4 font-medium text-neutral-800 dark:text-neutral-200">
                        {zr.branchName}
                      </td>
                      <td className="py-3 px-4 text-neutral-500">
                        {new Date(zr.closedAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                      <td className="py-3 px-4 text-neutral-700 dark:text-neutral-300">
                        {zr.cashierName} / {zr.managerApprovedBy}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-neutral-900 dark:text-white">
                        ₱{zr.totalNetSales.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        ₱{zr.actualCash.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            zr.cashVariance === 0
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : zr.cashVariance > 0
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                          }`}
                        >
                          {zr.cashVariance === 0
                            ? 'BALANCED'
                            : zr.cashVariance > 0
                            ? `+₱${zr.cashVariance.toLocaleString()}`
                            : `-₱${Math.abs(zr.cashVariance).toLocaleString()}`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-[#F37021]">
                        ₱{zr.newAccumulatedGrandTotal.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: POS SECURITY AUDIT LOGS
          ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="rounded-2xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-2xs p-4 space-y-3">
          <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
            {filteredAuditLogs.length === 0 ? (
              <div className="py-8 text-center text-neutral-400 text-xs">
                No audit trail records found matching your filter.
              </div>
            ) : (
              filteredAuditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded-md bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-bold text-[10px]">
                        {log.action}
                      </span>
                      <span className="text-neutral-500 font-mono text-[11px]">
                        {new Date(log.timestamp).toLocaleString('en-PH')}
                      </span>
                      {log.referenceId && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-mono text-[10px]">
                          Ref: {log.referenceId}
                        </span>
                      )}
                    </div>
                    <p className="text-neutral-800 dark:text-neutral-200 font-medium">
                      {log.details}
                    </p>
                  </div>

                  <div className="text-right sm:flex-shrink-0">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100 block">
                      {log.user} ({log.userRole || 'User'})
                    </span>
                    <span className="text-[10px] text-neutral-400 block font-mono">
                      {log.deviceInfo}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          ATTACHED BIR RECEIPT MODAL
          ========================================================================= */}
      {activeReceiptModal && (
        <BIRReceiptModal
          receipt={activeReceiptModal}
          onClose={() => setActiveReceiptModal(null)}
        />
      )}

    </div>
  );
};
