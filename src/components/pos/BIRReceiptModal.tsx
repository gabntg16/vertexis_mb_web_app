import React from 'react';
import { BIRReceipt } from '../../types';
import {
  Printer,
  X,
  CheckCircle,
  FileText,
  Building2,
  Phone,
  MapPin,
  Calendar,
  User,
  ShieldCheck,
  Tag,
  Hash,
  Download,
} from 'lucide-react';

interface BIRReceiptModalProps {
  receipt: BIRReceipt;
  onClose: () => void;
}

export const BIRReceiptModal: React.FC<BIRReceiptModalProps> = ({ receipt, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const isSeniorOrPwd = receipt.discountType === 'pwd_senior' && receipt.seniorPwdDetail;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
      <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden print:border-none print:shadow-none print:w-full print:max-w-none">
        
        {/* Header Actions (Hidden in print) */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 print:hidden">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-[#F37021] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Internal Counter Order Slip
              </h3>
              <p className="text-xs text-neutral-500 font-mono">{receipt.receiptNumber}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-[#F37021] hover:bg-[#d95d14] text-white text-xs font-medium rounded-lg flex items-center space-x-1.5 shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Order Slip</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-200/50 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Thermal Slip Container */}
        <div className="p-6 max-h-[80vh] overflow-y-auto font-mono text-[13px] leading-relaxed text-neutral-800 dark:text-neutral-200 print:text-black print:max-h-none print:overflow-visible print:p-2">
          
          {/* Prominent Non-OR Warning Banner */}
          <div className="mb-3 p-2 bg-amber-50 dark:bg-amber-950/40 border-2 border-dashed border-amber-400 dark:border-amber-600 rounded-lg text-center print:border-black print:bg-neutral-100">
            <p className="text-[11px] font-black tracking-wider text-amber-900 dark:text-amber-300 print:text-black uppercase">
              *** THIS IS NOT AN OFFICIAL RECEIPT ***
            </p>
            <p className="text-[9.5px] font-sans font-medium text-amber-800 dark:text-amber-400 print:text-black">
              Internal Counter Order & Branch Inventory Entry Slip
            </p>
          </div>

          {/* Header */}
          <div className="text-center space-y-1 pb-3 border-b border-dashed border-neutral-300 dark:border-neutral-700 print:border-black">
            <h1 className="text-base font-bold tracking-tight text-neutral-900 dark:text-white print:text-black">
              THE MARSH BITES
            </h1>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 print:text-black">
              Gourmet Marshmallow Enterprise
            </p>
            <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 print:text-black">
              {receipt.branchName}
            </p>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 print:text-black">
              {receipt.branchAddress}
            </p>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 print:text-black">
              Tel: {receipt.branchContact}
            </p>
            <div className="pt-1.5 text-[10px] text-neutral-400 dark:text-neutral-500 print:text-neutral-700">
              <p>INTERNAL COUNTER TERMINAL • {receipt.terminalId}</p>
              <p className="text-[9px] italic">Non-Official Receipt (For Inventory & Cashier Log Only)</p>
            </div>
          </div>

          {/* Receipt Meta */}
          <div className="py-3 border-b border-dashed border-neutral-300 dark:border-neutral-700 text-xs space-y-1 print:border-black">
            <div className="flex justify-between">
              <span className="text-neutral-500">Order Slip Ref:</span>
              <span className="font-bold text-neutral-900 dark:text-neutral-100 print:text-black">
                {receipt.receiptNumber}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Date & Time:</span>
              <span>{new Date(receipt.timestamp).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Terminal / Cashier:</span>
              <span>{receipt.terminalId} / {receipt.cashierName}</span>
            </div>
            {receipt.status === 'voided' && (
              <div className="p-2 mt-2 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded text-red-600 dark:text-red-400 text-center font-bold text-xs uppercase tracking-wider">
                *** TRANSACTION VOIDED ***
                {receipt.voidReason && <p className="text-[10px] font-normal lowercase">{receipt.voidReason}</p>}
              </div>
            )}
            {receipt.status === 'refunded' && (
              <div className="p-2 mt-2 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded text-amber-600 dark:text-amber-400 text-center font-bold text-xs uppercase tracking-wider">
                *** REFUND PROCESSED ***
                {receipt.refundAmount && <p className="text-[10px]">Amount: ₱{receipt.refundAmount.toLocaleString()}</p>}
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="py-3 border-b border-dashed border-neutral-300 dark:border-neutral-700 space-y-2 print:border-black">
            <div className="grid grid-cols-12 text-[11px] font-bold text-neutral-600 dark:text-neutral-400 uppercase print:text-black">
              <div className="col-span-6">Item Description</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-right">Price</div>
              <div className="col-span-2 text-right">Total</div>
            </div>

            {receipt.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 text-xs py-0.5">
                <div className="col-span-6 font-medium truncate">
                  {item.flavor}
                </div>
                <div className="col-span-2 text-center text-neutral-600 dark:text-neutral-400 print:text-black">
                  {item.quantity}
                </div>
                <div className="col-span-2 text-right text-neutral-600 dark:text-neutral-400 print:text-black">
                  ₱{item.unitPrice}
                </div>
                <div className="col-span-2 text-right font-medium">
                  ₱{item.grossAmount.toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          {/* Totals & Discounts */}
          <div className="py-3 border-b border-dashed border-neutral-300 dark:border-neutral-700 text-xs space-y-1.5 print:border-black">
            <div className="flex justify-between">
              <span>Gross Sales:</span>
              <span className="font-semibold">₱{receipt.grossSales.toLocaleString()}</span>
            </div>

            {receipt.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 print:text-black">
                <span>
                  Less: Discount ({receipt.discountType === 'pwd_senior' ? 'SC/PWD 20%' : receipt.discountType.toUpperCase()}):
                </span>
                <span>-₱{receipt.discountAmount.toLocaleString()}</span>
              </div>
            )}

            <div className="flex justify-between text-sm font-bold pt-1 text-neutral-900 dark:text-neutral-100 print:text-black">
              <span>AMOUNT DUE (PHP):</span>
              <span>₱{receipt.netSales.toLocaleString()}</span>
            </div>
          </div>

          {/* VAT Statutory Breakdown */}
          <div className="py-3 border-b border-dashed border-neutral-300 dark:border-neutral-700 text-[11px] space-y-1 text-neutral-600 dark:text-neutral-400 print:text-black">
            <div className="flex justify-between">
              <span>VATable Sales (12%):</span>
              <span>₱{receipt.vatableSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span>VAT Amount (12%):</span>
              <span>₱{receipt.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span>VAT-Exempt Sales:</span>
              <span>₱{receipt.vatExemptSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span>Zero-Rated Sales:</span>
              <span>₱{receipt.zeroRatedSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Tender & Payment Methods */}
          <div className="py-3 border-b border-dashed border-neutral-300 dark:border-neutral-700 text-xs space-y-1 print:border-black">
            <div className="font-semibold text-neutral-800 dark:text-neutral-200 print:text-black">
              Payments Tendered:
            </div>
            {receipt.payments.map((p, idx) => (
              <div key={idx} className="flex justify-between text-neutral-600 dark:text-neutral-400 print:text-black">
                <span>
                  • {p.method} {p.referenceNumber ? `(Ref: ${p.referenceNumber})` : ''}:
                </span>
                <span>₱{p.amount.toLocaleString()}</span>
              </div>
            ))}
            <div className="flex justify-between pt-1 font-semibold text-neutral-900 dark:text-neutral-100 print:text-black">
              <span>Amount Tendered:</span>
              <span>₱{receipt.totalAmountTendered.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-neutral-900 dark:text-neutral-100 print:text-black">
              <span>Change:</span>
              <span className="font-bold">₱{receipt.change.toLocaleString()}</span>
            </div>
          </div>

          {/* Senior / PWD Info if applicable */}
          {isSeniorOrPwd && receipt.seniorPwdDetail && (
            <div className="py-2.5 border-b border-dashed border-neutral-300 dark:border-neutral-700 text-[10px] space-y-0.5 text-neutral-600 dark:text-neutral-400 print:text-black">
              <div className="font-bold text-neutral-800 dark:text-neutral-200">SENIOR CITIZEN / PWD ID RECORD:</div>
              <p>Name: {receipt.seniorPwdDetail.customerName}</p>
              <p>ID Number: {receipt.seniorPwdDetail.idNumber}</p>
              {receipt.seniorPwdDetail.tin && <p>TIN: {receipt.seniorPwdDetail.tin}</p>}
              <div className="pt-3 flex justify-between items-end">
                <span>Customer Signature:</span>
                <span className="border-b border-black dark:border-white w-32 inline-block"></span>
              </div>
            </div>
          )}

          {/* Tax Compliance Disclaimer Footer */}
          <div className="text-center pt-4 space-y-2 text-[10px] text-neutral-500 dark:text-neutral-400 print:text-neutral-700">
            <p className="font-semibold text-neutral-700 dark:text-neutral-300 print:text-black">
              THANK YOU FOR VISITING THE MARSH BITES!
            </p>
            
            <div className="py-2.5 px-2 my-1 border-t-2 border-b-2 border-dashed border-neutral-300 dark:border-neutral-700 print:border-black text-center space-y-1">
              <p className="font-bold text-[11px] text-red-600 dark:text-red-400 print:text-black tracking-wider uppercase">
                *** THIS IS NOT AN OFFICIAL RECEIPT ***
              </p>
              <p className="text-[9.5px] leading-tight text-neutral-600 dark:text-neutral-400 print:text-black">
                Generated by VertexIS for internal counter order entry, inventory deduction, and cashier shift reconciliation only.
              </p>
              <p className="text-[9px] text-neutral-500 dark:text-neutral-400 print:text-black italic">
                (Official Sales Invoice / OR is issued via physical BIR-registered manual booklet)
              </p>
            </div>
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
            className="px-4 py-2 text-xs font-medium bg-[#F37021] hover:bg-[#d95d14] text-white rounded-lg flex items-center space-x-1.5 transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Order Slip</span>
          </button>
        </div>

      </div>
    </div>
  );
};
