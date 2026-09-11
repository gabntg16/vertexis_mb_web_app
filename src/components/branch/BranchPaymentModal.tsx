import React, { useState, useRef } from 'react';
import { Order, DigitalPaymentMethod, PaymentGatewayStatus } from '../../types';
import {
  COMMISSARY_BANK_ACCOUNTS,
  COMMISSARY_DIGITAL_WALLETS,
} from '../../services/paymentGateway';
import { validateUploadedFile } from '../../utils/fileValidation';
import {
  X,
  Smartphone,
  Building2,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Upload,
  Info,
  Receipt,
  FileText,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';

interface BranchPaymentModalProps {
  order: Order;
  branchName: string;
  themeMode: 'light' | 'dark';
  onClose: () => void;
  onPaymentComplete: (
    proofUrl: string,
    paymentDetails: {
      paymentMethod: DigitalPaymentMethod | string;
      paymentIntentId?: string;
      referenceNumber?: string;
      status: PaymentGatewayStatus;
    }
  ) => void;
}

export const BranchPaymentModal: React.FC<BranchPaymentModalProps> = ({
  order,
  branchName,
  themeMode,
  onClose,
  onPaymentComplete,
}) => {
  const isDark = themeMode === 'dark';

  // Manual payment method selection
  const [selectedMethod, setSelectedMethod] = useState<'gcash' | 'maya' | 'bank_transfer'>('gcash');
  const [selectedBankIndex, setSelectedBankIndex] = useState(0);

  // Manual Proof of Payment fields
  const [manualReference, setManualReference] = useState('');
  const [proofUrlInput, setProofUrlInput] = useState('');
  const [showUrlFallback, setShowUrlFallback] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // File Upload & Validation state
  const [isValidatingFile, setIsValidatingFile] = useState(false);
  const [validatedFileInfo, setValidatedFileInfo] = useState<{
    fileName: string;
    fileSize: number;
    mimeType: string;
    previewUrl?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notification Banner
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const copyToClipboard = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsValidatingFile(true);
    setToastMessage({ type: 'info', text: 'Validating receipt file integrity...' });

    try {
      const validation = await validateUploadedFile(file, {
        maxSizeBytes: 15 * 1024 * 1024, // 15MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
        verifyImageDecodable: true,
      });

      if (!validation.isValid) {
        setToastMessage({
          type: 'error',
          text: validation.error || 'File validation failed security check.',
        });
        setValidatedFileInfo(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const dataUrl = validation.dataUrl || '';
      setProofUrlInput(dataUrl);
      setValidatedFileInfo({
        fileName: file.name,
        fileSize: file.size,
        mimeType: validation.detectedMimeType || file.type,
        previewUrl: dataUrl.startsWith('data:image') ? dataUrl : undefined,
      });

      setToastMessage({
        type: 'success',
        text: `✓ File verified safe: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
      });
    } catch (err: any) {
      setToastMessage({
        type: 'error',
        text: err?.message || 'Error processing uploaded file.',
      });
    } finally {
      setIsValidatingFile(false);
    }
  };

  const handleRemoveFile = () => {
    setProofUrlInput('');
    setValidatedFileInfo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmitProof = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualReference.trim()) {
      setToastMessage({
        type: 'error',
        text: 'Please enter the transaction reference / trace number from your receipt.',
      });
      return;
    }

    if (!proofUrlInput.trim()) {
      setToastMessage({
        type: 'error',
        text: 'Please upload a receipt screenshot or attach a valid proof URL.',
      });
      return;
    }

    onPaymentComplete(proofUrlInput.trim(), {
      paymentMethod: selectedMethod,
      referenceNumber: manualReference.trim(),
      status: 'PENDING',
    });
  };

  const totalPacks = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const activeBank = COMMISSARY_BANK_ACCOUNTS[selectedBankIndex] || COMMISSARY_BANK_ACCOUNTS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div
        className={`relative w-full max-w-2xl rounded-3xl shadow-2xl border overflow-hidden flex flex-col max-h-[92vh] ${
          isDark ? 'bg-[#181818] border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#F37021]/10 text-[#F37021] flex items-center justify-center flex-shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Manual Proof of Payment (PoP) Verification
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                  Manual Audit
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                Order #{order.id} • {branchName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast Alert Banner */}
        {toastMessage && (
          <div
            className={`px-5 py-2.5 text-xs font-medium flex items-center justify-between transition-all ${
              toastMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border-b border-emerald-200 dark:border-emerald-800'
                : toastMessage.type === 'error'
                ? 'bg-red-50 dark:bg-red-950/80 text-red-800 dark:text-red-200 border-b border-red-200 dark:border-red-800'
                : 'bg-sky-50 dark:bg-sky-950/80 text-sky-800 dark:text-sky-200 border-b border-sky-200 dark:border-sky-800'
            }`}
          >
            <div className="flex items-center space-x-2">
              {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              {toastMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
              {toastMessage.type === 'info' && <Info className="w-4 h-4 text-sky-600 shrink-0" />}
              <span>{toastMessage.text}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-xs opacity-70 hover:opacity-100 cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Section 1: Transaction Totals & Requisition Details */}
          <div
            className={`p-4 rounded-2xl border ${
              isDark ? 'bg-neutral-900/60 border-neutral-800' : 'bg-neutral-50/80 border-neutral-200'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                  Requisition Package
                </span>
                <p className="text-sm font-bold text-neutral-900 dark:text-white">
                  {order.packageName || 'Commissary Requisition Order'}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {totalPacks} total gourmet marshmallow packs ({order.items.length} flavor items)
                </p>
              </div>

              <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-neutral-200 dark:border-neutral-700">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                  Total Amount Payable
                </span>
                <p className="text-2xl font-black text-[#F37021]">
                  ₱{order.totalAmount.toLocaleString()}
                </p>
                <span className="text-[10px] text-neutral-400">Zero Gateway Fees</span>
              </div>
            </div>

            {order.items.length > 0 && (
              <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-400">
                {order.items.map((i, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 font-medium"
                  >
                    {i.quantity}x {i.productName}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Payee Details (Central Commissary Corporate Accounts) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400">
                Payee Channel Details:
              </label>
              <span className="text-[11px] text-neutral-500">
                Select your transfer channel to view payee details
              </span>
            </div>

            {/* Channel Tabs */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedMethod('gcash')}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                  selectedMethod === 'gcash'
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 ring-2 ring-blue-500/20 font-bold shadow-xs'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Smartphone className="w-4 h-4 text-blue-500" />
                  {selectedMethod === 'gcash' && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                </div>
                <div>
                  <div className="text-xs font-bold">GCash</div>
                  <div className="text-[10px] opacity-75">Corporate E-Wallet</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('maya')}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                  selectedMethod === 'maya'
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 ring-2 ring-emerald-500/20 font-bold shadow-xs'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Smartphone className="w-4 h-4 text-emerald-500" />
                  {selectedMethod === 'maya' && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
                </div>
                <div>
                  <div className="text-xs font-bold">Maya</div>
                  <div className="text-[10px] opacity-75">Corporate Wallet</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('bank_transfer')}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                  selectedMethod === 'bank_transfer'
                    ? 'border-[#F37021] bg-orange-50/50 dark:bg-orange-950/40 text-[#F37021] ring-2 ring-[#F37021]/20 font-bold shadow-xs'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Building2 className="w-4 h-4 text-[#F37021]" />
                  {selectedMethod === 'bank_transfer' && <span className="w-2 h-2 rounded-full bg-[#F37021]"></span>}
                </div>
                <div>
                  <div className="text-xs font-bold">Bank Transfer</div>
                  <div className="text-[10px] opacity-75">BDO / BPI / UB</div>
                </div>
              </button>
            </div>

            {/* Payee Details Display */}
            {selectedMethod === 'gcash' && (
              <div className="p-4 rounded-2xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900 dark:text-blue-200">
                    Official Central Commissary GCash Payee
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                    Verified Merchant
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-2.5 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                    <span className="text-[10px] text-neutral-400 uppercase font-semibold block">
                      Payee Account Name:
                    </span>
                    <span className="font-bold text-neutral-900 dark:text-white text-xs">
                      {COMMISSARY_DIGITAL_WALLETS.gcash.merchantName}
                    </span>
                  </div>

                  <div className="p-2.5 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-neutral-400 uppercase font-semibold block">
                        Mobile / Wallet Number:
                      </span>
                      <span className="font-mono font-bold text-neutral-900 dark:text-white text-sm">
                        {COMMISSARY_DIGITAL_WALLETS.gcash.walletNumber}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(COMMISSARY_DIGITAL_WALLETS.gcash.walletNumber, 'gcash_num')}
                      className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:text-blue-600 cursor-pointer"
                      title="Copy Mobile Number"
                    >
                      {copiedField === 'gcash_num' ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Transfer exact total of <strong>₱{order.totalAmount.toLocaleString()}</strong> to the mobile wallet above.
                  Save a screenshot of the completed transfer slip with the 13-digit Reference Number.
                </p>
              </div>
            )}

            {selectedMethod === 'maya' && (
              <div className="p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900 dark:text-emerald-200">
                    Official Central Commissary Maya Payee
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                    Verified Business
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-2.5 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                    <span className="text-[10px] text-neutral-400 uppercase font-semibold block">
                      Payee Account Name:
                    </span>
                    <span className="font-bold text-neutral-900 dark:text-white text-xs">
                      {COMMISSARY_DIGITAL_WALLETS.maya.merchantName}
                    </span>
                  </div>

                  <div className="p-2.5 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-neutral-400 uppercase font-semibold block">
                        Mobile / Account Number:
                      </span>
                      <span className="font-mono font-bold text-neutral-900 dark:text-white text-sm">
                        {COMMISSARY_DIGITAL_WALLETS.maya.walletNumber}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(COMMISSARY_DIGITAL_WALLETS.maya.walletNumber, 'maya_num')}
                      className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:text-emerald-600 cursor-pointer"
                      title="Copy Mobile Number"
                    >
                      {copiedField === 'maya_num' ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Send exact total of <strong>₱{order.totalAmount.toLocaleString()}</strong> via Maya Send Money to the number above.
                  Save a screenshot of the Maya payment receipt showing the Reference ID.
                </p>
              </div>
            )}

            {selectedMethod === 'bank_transfer' && (
              <div className="space-y-3">
                {/* Bank Sub-tabs */}
                <div className="flex items-center space-x-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
                  {COMMISSARY_BANK_ACCOUNTS.map((b, idx) => (
                    <button
                      key={b.shortName}
                      type="button"
                      onClick={() => setSelectedBankIndex(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        selectedBankIndex === idx
                          ? 'bg-[#F37021] text-white shadow-xs'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                      }`}
                    >
                      {b.shortName}
                    </button>
                  ))}
                </div>

                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-900 dark:text-white text-sm">
                      {activeBank.bankName}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      InstaPay & PESONet Enabled
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div className="p-2.5 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                      <span className="text-[10px] text-neutral-400 uppercase font-semibold block">
                        Account Name:
                      </span>
                      <span className="font-bold text-neutral-900 dark:text-white text-xs">
                        {activeBank.accountName}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-neutral-400 uppercase font-semibold block">
                          Account Number:
                        </span>
                        <span className="font-mono font-bold text-neutral-900 dark:text-white text-sm">
                          {activeBank.accountNumber}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(activeBank.accountNumber, 'acct')}
                        className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:text-[#F37021] cursor-pointer"
                        title="Copy Account Number"
                      >
                        {copiedField === 'acct' ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Branch: <strong>{activeBank.branch}</strong> • Include Order #{order.id} in transfer remarks/notes.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Submit Manual Proof of Payment Form */}
          <form onSubmit={handleSubmitProof} className="space-y-4 pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                Submit Manual Verification Proof:
              </h4>
              <p className="text-[11px] text-neutral-500">
                Provide your manual transaction reference and upload the official transfer receipt.
              </p>
            </div>

            {/* Field 1: Reference Number Input */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Transaction Reference / Trace Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={manualReference}
                onChange={(e) => setManualReference(e.target.value)}
                placeholder={
                  selectedMethod === 'gcash'
                    ? 'e.g. 20260908-189283 (13-digit GCash Ref)'
                    : selectedMethod === 'maya'
                    ? 'e.g. MY-20260908-9842 (Maya Ref ID)'
                    : 'e.g. 20260908-BDO-84920 (InstaPay / Bank Trace)'
                }
                className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-[#F37021] focus:outline-hidden font-mono text-neutral-900 dark:text-white"
              />
              <span className="text-[10px] text-neutral-400 mt-1 block">
                Found on your transaction confirmation receipt screen.
              </span>
            </div>

            {/* Field 2: Receipt Image Upload & Validation Dropzone */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Receipt Proof of Payment (Image / PDF) <span className="text-red-500">*</span>
              </label>

              {!validatedFileInfo && !proofUrlInput ? (
                <div className="p-4 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50/60 dark:bg-neutral-800/40 text-center space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="branch-proof-upload-input"
                  />
                  <label
                    htmlFor="branch-proof-upload-input"
                    className="cursor-pointer inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 font-bold hover:bg-neutral-100 dark:hover:bg-neutral-700 shadow-2xs transition-all text-xs"
                  >
                    <Upload className="w-4 h-4 text-[#F37021]" />
                    <span>{isValidatingFile ? 'Scanning File Integrity...' : 'Upload Receipt Screenshot'}</span>
                  </label>
                  <p className="text-[11px] text-neutral-500">
                    PNG, JPG, WebP, or PDF up to 15MB • Scanned for binary safety & integrity
                  </p>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowUrlFallback(!showUrlFallback)}
                      className="text-[11px] text-neutral-500 hover:text-[#F37021] underline cursor-pointer"
                    >
                      {showUrlFallback ? 'Hide URL input' : 'Or paste receipt image URL'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    {validatedFileInfo?.previewUrl ? (
                      <img
                        src={validatedFileInfo.previewUrl}
                        alt="Receipt Preview"
                        className="w-12 h-12 rounded-xl object-cover border border-neutral-200 dark:border-neutral-700 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center shrink-0 text-[#F37021]">
                        <FileText className="w-6 h-6" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                          {validatedFileInfo?.fileName || 'Receipt Image Attached'}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center space-x-1">
                          <Check className="w-2.5 h-2.5" />
                          <span>Ready</span>
                        </span>
                      </div>
                      {validatedFileInfo && (
                        <p className="text-[10px] text-neutral-400">
                          {(validatedFileInfo.fileSize / 1024).toFixed(1)} KB • {validatedFileInfo.mimeType}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-2 rounded-xl text-neutral-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
                    title="Remove file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Optional URL Input Fallback */}
              {showUrlFallback && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={proofUrlInput}
                    onChange={(e) => setProofUrlInput(e.target.value)}
                    placeholder="https://... (direct URL to receipt screenshot)"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl font-mono text-neutral-900 dark:text-white"
                  />
                </div>
              )}
            </div>

            {/* Admin Audit Compliance Note */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs flex items-start space-x-2.5">
              <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-amber-900 dark:text-amber-200">
                <span className="font-bold">Manual Treasury Review Protocol:</span>
                <p className="text-neutral-600 dark:text-neutral-300 mt-0.5">
                  Your reference number and receipt image are forwarded to the Central Bicol Commissary Treasury Queue.
                  HQ Admin will manually verify funds before unlocking MTO confectionery batching and J&T Express dispatch.
                </p>
              </div>
            </div>

            {/* Form Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isValidatingFile || !proofUrlInput.trim() || !manualReference.trim()}
                className="px-5 py-2.5 text-xs font-bold rounded-xl bg-[#F37021] text-white hover:bg-[#d85e15] disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-xs transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Submit Proof of Payment for Admin Review</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
