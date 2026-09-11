import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Receipt, Search, Download, DollarSign, Calendar, FileSpreadsheet } from 'lucide-react';

export const BranchHistory: React.FC = () => {
  const { currentBranch, getSalesForBranch, themeMode } = useData();
  const [searchQuery, setSearchQuery] = useState('');

  if (!currentBranch) return null;

  const branchId = currentBranch.id;
  const isDark = themeMode === 'dark';
  const branchSales = getSalesForBranch(branchId);

  const filteredSales = branchSales.filter(
    (s) =>
      s.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.receiptPath && s.receiptPath.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total, 0);
  const totalUnits = filteredSales.reduce((sum, s) => sum + s.quantity, 0);

  const handleExportCSV = () => {
    const headers = ['Order Slip #', 'Product Flavor', 'Quantity', 'Total (PHP)', 'Timestamp'];
    const rows = filteredSales.map((s) => [
      s.receiptPath || s.id,
      `"${s.productName.replace(/"/g, '""')}"`,
      s.quantity,
      s.total,
      s.date,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${currentBranch.name.replace(/\s+/g, '_')}_sales.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Branch Order Slip History</h1>
          <p className="text-xs text-neutral-500 font-medium">
            Complete transaction ledger of internal order slips and customer sales recorded at {currentBranch.name}.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs sm:text-sm font-bold shadow-md hover:bg-emerald-700 transition-all flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export Store CSV</span>
        </button>
      </div>

      {/* Search & Stats */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order slip code or flavor name..."
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#80C7F2] ${
              isDark
                ? 'bg-[#161616] border-neutral-800 text-white placeholder-neutral-500'
                : 'bg-white border-neutral-200 text-neutral-900 placeholder-neutral-400'
            }`}
          />
        </div>

        <div className={`p-2.5 px-4 rounded-xl border flex items-center space-x-4 text-xs ${
          isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
        }`}>
          <span>Units: <strong className="text-neutral-900 dark:text-white">{totalUnits}</strong></span>
          <span>Revenue: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">₱{totalRevenue.toLocaleString()}</strong></span>
        </div>
      </div>

      {/* Sales Transactions Table */}
      <div className={`rounded-3xl border overflow-hidden ${
        isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`border-b font-bold uppercase tracking-wider text-neutral-400 ${
              isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
            }`}>
              <tr>
                <th className="py-3.5 px-4">Order Slip Ref</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Item Sold</th>
                <th className="py-3.5 px-4 text-center">Quantity</th>
                <th className="py-3.5 px-4 text-right">Amount Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-neutral-400">
                    No transactions found
                  </td>
                </tr>
              ) : (
                filteredSales.map((s) => (
                  <tr key={s.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                    <td className="py-3 px-4 font-mono font-bold">{s.receiptPath || s.id}</td>
                    <td className="py-3 px-4 text-neutral-400">{new Date(s.date).toLocaleString()}</td>
                    <td className="py-3 px-4 font-medium">{s.productName}</td>
                    <td className="py-3 px-4 text-center font-bold">{s.quantity}</td>
                    <td className="py-3 px-4 text-right font-black text-emerald-600 dark:text-emerald-400">
                      ₱{s.total.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
