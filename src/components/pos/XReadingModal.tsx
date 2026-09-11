import React from 'react';
import { useData } from '../../context/DataContext';
import {
  Printer,
  X,
  FileSpreadsheet,
  Banknote,
  Coins,
  ShieldCheck,
  TrendingUp,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

interface XReadingModalProps {
  onClose: () => void;
}

export const XReadingModal: React.FC<XReadingModalProps> = ({ onClose }) => {
  const { currentBranch, registerShift, getXReadingSummary } = useData();
  const summary = getXReadingSummary(currentBranch?.id);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
      <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden print:border-none print:shadow-none print:w-full print:max-w-none">
        
        {/* Header (Hidden in print) */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-sky-50 dark:bg-sky-950/40 print:hidden">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                X-Reading (Interim Counter Sales Audit)
              </h3>
              <p className="text-xs text-neutral-500">Live Non-Closing Shift Audit & Float Check</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium rounded-lg flex items-center space-x-1.5 shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print X-Slip</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-200/50 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Thermal Slip */}
        <div className="p-6 max-h-[80vh] overflow-y-auto font-mono text-[13px] leading-relaxed text-neutral-800 dark:text-neutral-200 print:text-black print:max-h-none print:overflow-visible print:p-2">
          
          {/* Prominent Non-OR Warning Banner */}
          <div className="mb-3 p-2 bg-amber-50 dark:bg-amber-950/40 border-2 border-dashed border-amber-400 dark:border-amber-600 rounded-lg text-center print:border-black print:bg-neutral-100">
            <p className="text-[11px] font-black tracking-wider text-amber-900 dark:text-amber-300 print:text-black uppercase">
              *** THIS IS NOT AN OFFICIAL RECEIPT ***
            </p>
            <p className="text-[9.5px] font-sans font-medium text-amber-800 dark:text-amber-400 print:text-black">
              Internal Counter Sales Summary & Interim Audit Slip
            </p>
          </div>

          {/* Header */}
          <div className="text-center space-y-1 pb-4 border-b border-dashed border-neutral-300 dark:border-neutral-700 print:border-black">
            <h1 className="text-base font-bold text-neutral-900 dark:text-white print:text-black">
              THE MARSH BITES
            </h1>
            <p className="text-xs font-semibold">{currentBranch?.name || 'Branch Counter Terminal'}</p>
            <p className="text-[11px] text-neutral-500">{currentBranch?.location}</p>
            <div className="pt-2 text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-widest print:text-black">
              *** X-READING INTERIM AUDIT ***
            </div>
            <p className="text-[10px] text-neutral-400 italic">
              (Internal Counter Sales Summary — Non-Closing Shift Inquiry)
            </p>
          </div>

          {/* Terminal & Shift Info */}
          <div className="py-3 border-b border-dashed border-neutral-300 dark:border-neutral-700 text-xs space-y-1 print:border-black">
            <div className="flex justify-between">
              <span className="text-neutral-500">Terminal ID:</span>
              <span className="font-semibold">{registerShift.terminalId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Duty Cashier:</span>
              <span>{registerShift.cashierName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Shift Opened:</span>
              <span>{registerShift.openedAt ? new Date(registerShift.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '09:00 AM'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Report Timestamp:</span>
              <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
          </div>

          {/* Sequence Numbers */}
          <div className="py-3 border-b border-dashed border-neutral-300 dark:border-neutral-700 text-xs space-y-1 print:border-black">
            <div className="flex justify-between">
              <span className="text-neutral-500">Beginning Slip Ref:</span>
              <span className="font-semibold">{summary.beginningReceiptNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Ending Slip Ref:</span>
              <span className="font-semibold">{summary.endingReceiptNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Completed Transactions:</span>
              <span className="font-bold">{summary.transactionsCount}</span>
            </div>
          </div>

          {/* Sales Breakdown */}
          <div className="py-3 border-b border-dashed border-neutral-300 dark:border-neutral-700 text-xs space-y-1.5 print:border-black">
            <div className="flex justify-between">
              <span>Gross Sales:</span>
              <span className="font-semibold">₱{summary.grossSales.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400 print:text-black">
              <span>Less Discounts:</span>
              <span>-₱{summary.totalDiscounts.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm font-bold pt-1 text-neutral-900 dark:text-neutral-100 print:text-black">
              <span>NET SALES:</span>
              <span>₱{summary.netSales.toLocaleString()}</span>
            </div>
          </div>

          {/* VAT Statutory Summary */}
          <div className="py-3 border-b border-dashed border-neutral-300 dark:border-neutral-700 text-[11px] space-y-1 text-neutral-600 dark:text-neutral-400 print:text-black">
            <div className="flex justify-between">
              <span>VATable Sales (12%):</span>
              <span>₱{summary.vatableSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span>12% VAT Amount:</span>
              <span>₱{summary.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span>VAT-Exempt Sales:</span>
              <span>₱{summary.vatExemptSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span>Zero-Rated Sales:</span>
              <span>₱{summary.zeroRatedSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Tender Breakdown */}
          <div className="py-3 border-b border-dashed border-neutral-300 dark:border-neutral-700 text-xs space-y-1 print:border-black">
            <div className="font-semibold text-neutral-800 dark:text-neutral-200 print:text-black">
              Collection Breakdown:
            </div>
            <div className="flex justify-between">
              <span>• Cash Tender:</span>
              <span>₱{summary.cashSales.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>• GCash / Maya E-Wallet:</span>
              <span>₱{summary.digitalSales.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>• Debit / Credit Card:</span>
              <span>₱{summary.cardSales.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>• Bank Transfer:</span>
              <span>₱{summary.bankTransferSales.toLocaleString()}</span>
            </div>
          </div>

          {/* Drawer Status & Float */}
          <div className="py-3 border-b border-dashed border-neutral-300 dark:border-neutral-700 text-xs space-y-1 print:border-black">
            <div className="flex justify-between">
              <span className="text-neutral-500">Opening Cash Float:</span>
              <span>₱{summary.openingFloat.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Cash Sales Collected:</span>
              <span>₱{summary.cashSales.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-neutral-900 dark:text-white pt-1 print:text-black">
              <span>EXPECTED CASH IN DRAWER:</span>
              <span>₱{summary.expectedCash.toLocaleString()}</span>
            </div>
          </div>

          {/* Voids & Refunds summary */}
          <div className="py-3 border-b border-dashed border-neutral-300 dark:border-neutral-700 text-[11px] space-y-1 text-neutral-500 print:text-black">
            <div className="flex justify-between">
              <span>Voided Transactions:</span>
              <span>{summary.voidsCount} (₱{summary.voidAmount.toLocaleString()})</span>
            </div>
            <div className="flex justify-between">
              <span>Refunded Transactions:</span>
              <span>{summary.refundsCount} (₱{summary.refundAmount.toLocaleString()})</span>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="text-center pt-4 space-y-1 text-[10px] text-neutral-400 print:text-black">
            <p className="font-semibold text-neutral-600 dark:text-neutral-400 print:text-black">
              END OF X-READING INTERIM AUDIT REPORT
            </p>
            <p>Non-destructive interim audit report for counter float verification & manual booklet matching.</p>
          </div>

        </div>

        {/* Modal Bottom Footer (Hidden in print) */}
        <div className="px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 flex justify-end space-x-2 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 text-xs font-medium bg-sky-600 hover:bg-sky-700 text-white rounded-lg flex items-center space-x-1.5 transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Slip</span>
          </button>
        </div>

      </div>
    </div>
  );
};
