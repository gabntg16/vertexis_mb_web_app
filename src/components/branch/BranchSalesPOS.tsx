import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { Product, BIRReceipt, POSPaymentDetail, POSPaymentMethod, POSSeniorPwdDetail } from '../../types';
import { BIRReceiptModal } from '../pos/BIRReceiptModal';
import { XReadingModal } from '../pos/XReadingModal';
import { ZReadingModal } from '../pos/ZReadingModal';
import { VoidRefundModal } from '../pos/VoidRefundModal';
import { POSAuditDrawer } from '../pos/POSAuditDrawer';
import { CashTenderSafeguardModal, CashTenderSafeguardDetails } from '../safeguards/CashTenderSafeguardModal';
import { HighDiscountSafeguardModal, HighDiscountSafeguardDetails } from '../safeguards/HighDiscountSafeguardModal';
import { generateClientRequestId } from '../../utils/idempotency';
import {
  COMMISSARY_DIGITAL_WALLETS,
} from '../../services/paymentGateway';
import {
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Plus,
  Minus,
  Trash2,
  Printer,
  Search,
  RefreshCw,
  Download,
  Upload,
  CreditCard,
  Banknote,
  Smartphone,
  Tag,
  User,
  SlidersHorizontal,
  X,
  FileSpreadsheet,
  Check,
  Zap,
  Info,
  ChevronRight,
  Barcode,
  Lock,
  RotateCcw,
  Ban,
  ShieldCheck,
  Coins,
  ArrowRight,
  QrCode,
  TrendingUp,
  FileText,
  Clock,
  Sparkles,
  Building2,
  Loader2,
} from 'lucide-react';

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
}

export const BranchSalesPOS: React.FC = () => {
  const {
    products,
    currentBranch,
    inventory,
    birReceipts,
    shiftClosings,
    registerShift,
    openRegisterShift,
    processPOSTransaction,
    importBatchSales,
    getInventoryForBranch,
    getReceiptsForBranch,
    getZReadingsForBranch,
    themeMode,
    currentUser,
  } = useData();

  if (!currentBranch) return null;

  const branchId = currentBranch.id;
  const branchInventory = getInventoryForBranch(branchId);
  const branchReceipts = getReceiptsForBranch(branchId);
  const branchZReadings = getZReadingsForBranch(branchId);

  // Active Tab: 'register' | 'receipts' | 'zreadings' | 'batchSync'
  const [activeTab, setActiveTab] = useState<'register' | 'receipts' | 'zreadings' | 'batchSync'>('register');

  // Search & Category Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [discountType, setDiscountType] = useState<'none' | 'pwd_senior' | 'promo10' | 'promo15' | 'custom'>('none');
  const [customDiscountValue, setCustomDiscountValue] = useState<number>(0);

  // Senior / PWD Dialog Fields
  const [seniorPwdName, setSeniorPwdName] = useState('');
  const [seniorPwdIdNumber, setSeniorPwdIdNumber] = useState('');
  const [seniorPwdTin, setSeniorPwdTin] = useState('');

  // Payment Checkout Drawer / Modal
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutRequestId, setCheckoutRequestId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [paymentMode, setPaymentMode] = useState<'single' | 'split'>('single');
  const [selectedMethod, setSelectedMethod] = useState<POSPaymentMethod>('Cash');
  const [cashTenderedInput, setCashTenderedInput] = useState<string>('');
  const [paymentReference, setPaymentReference] = useState('');
  const [splitCashAmount, setSplitCashAmount] = useState<string>('');
  const [splitSecondaryMethod, setSplitSecondaryMethod] = useState<POSPaymentMethod>('GCash');
  const [splitSecondaryAmount, setSplitSecondaryAmount] = useState<string>('');
  const [splitSecondaryRef, setSplitSecondaryRef] = useState('');

  // Modals
  const [activeReceiptForModal, setActiveReceiptForModal] = useState<BIRReceipt | null>(null);
  const [showXReading, setShowXReading] = useState(false);
  const [showZReading, setShowZReading] = useState(false);
  const [showAuditDrawer, setShowAuditDrawer] = useState(false);
  const [voidRefundTargetReceipt, setVoidRefundTargetReceipt] = useState<BIRReceipt | null>(null);

  // Safeguards
  const [cashTenderSafeguard, setCashTenderSafeguard] = useState<CashTenderSafeguardDetails | null>(null);
  const [highDiscountSafeguard, setHighDiscountSafeguard] = useState<HighDiscountSafeguardDetails | null>(null);

  // Notifications
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Batch & Offline Import State
  const [csvText, setCsvText] = useState('');
  const [importResult, setImportResult] = useState<{ successCount: number; errors: string[] } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stock lookup map
  const stockMap = useMemo(() => {
    const map: Record<string, number> = {};
    branchInventory.forEach((inv) => {
      map[inv.productId] = inv.stock;
    });
    return map;
  }, [branchInventory]);

  // Filtered Catalog
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.flavor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      const stock = stockMap[p.id] ?? 0;
      if (selectedCategory === 'in_stock') return stock > 0;
      if (selectedCategory === 'low_stock') return stock > 0 && stock <= 10;
      if (selectedCategory === 'out_of_stock') return stock === 0;
      return true;
    });
  }, [products, searchQuery, selectedCategory, stockMap]);

  // Cart Calculations
  const grossSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    if (discountType === 'pwd_senior') {
      // 20% statutory discount on VAT-exempt base
      const base = grossSubtotal / 1.12;
      return Math.round(base * 0.2);
    }
    if (discountType === 'promo10') {
      return Math.round(grossSubtotal * 0.1);
    }
    if (discountType === 'promo15') {
      return Math.round(grossSubtotal * 0.15);
    }
    if (discountType === 'custom') {
      return Math.min(grossSubtotal, customDiscountValue);
    }
    return 0;
  }, [grossSubtotal, discountType, customDiscountValue]);

  const netPayable = Math.max(0, grossSubtotal - discountAmount);

  // VAT breakdown calculation
  const vatCalculations = useMemo(() => {
    if (discountType === 'pwd_senior') {
      return {
        vatableSales: 0,
        vatAmount: 0,
        vatExemptSales: netPayable,
        zeroRatedSales: 0,
      };
    }
    const vatable = Math.round((netPayable / 1.12) * 100) / 100;
    const vat = Math.round((netPayable - vatable) * 100) / 100;
    return {
      vatableSales: vatable,
      vatAmount: vat,
      vatExemptSales: 0,
      zeroRatedSales: 0,
    };
  }, [netPayable, discountType]);

  const totalCartUnits = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Cash change calculations
  const singleCashNum = parseFloat(cashTenderedInput) || 0;
  const changeDue = selectedMethod === 'Cash' ? Math.max(0, singleCashNum - netPayable) : 0;

  // Split cash calculation
  const splitCashNum = parseFloat(splitCashAmount) || 0;
  const splitSecNum = parseFloat(splitSecondaryAmount) || 0;
  const splitTotalPaid = splitCashNum + splitSecNum;
  const splitChangeDue = Math.max(0, splitTotalPaid - netPayable);

  // Add to cart
  const addToCart = (product: Product) => {
    const available = stockMap[product.id] ?? 0;
    const existing = cart.find((i) => i.product.id === product.id);
    const currentQty = existing ? existing.quantity : 0;

    if (currentQty + 1 > available) {
      setErrorMsg(`Cannot add more ${product.flavor}. Available branch stock is ${available} units.`);
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }

    if (existing) {
      setCart(cart.map((i) => (i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)));
    } else {
      setCart([...cart, { product, quantity: 1, unitPrice: product.price }]);
    }
    setErrorMsg(null);
  };

  const updateQuantity = (productId: string, delta: number) => {
    const item = cart.find((i) => i.product.id === productId);
    if (!item) return;

    const available = stockMap[productId] ?? 0;
    const newQty = item.quantity + delta;

    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQty > available) {
      setErrorMsg(`Cannot increase. Only ${available} units in inventory.`);
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }

    setCart(cart.map((i) => (i.product.id === productId ? { ...i, quantity: newQty } : i)));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((i) => i.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName('');
    setDiscountType('none');
    setCustomDiscountValue(0);
    setSeniorPwdName('');
    setSeniorPwdIdNumber('');
    setSeniorPwdTin('');
    setCashTenderedInput('');
    setPaymentReference('');
    setSplitCashAmount('');
    setSplitSecondaryAmount('');
    setSplitSecondaryRef('');
  };

  // Open Checkout
  const handleOpenCheckout = (bypassDiscountSafeguard: boolean = false) => {
    if (cart.length === 0) {
      setErrorMsg('Cart is empty. Select marshmallow flavors before proceeding to payment.');
      return;
    }
    if (discountType === 'pwd_senior' && (!seniorPwdName.trim() || !seniorPwdIdNumber.trim())) {
      setErrorMsg('Please input Senior Citizen / PWD Name and ID Number for statutory compliance.');
      return;
    }

    // High-Value Discount Safeguard: if custom discount > 20% of grossSubtotal or netPayable <= 10
    const isCustomHigh = discountType === 'custom' && customDiscountValue > Math.round(grossSubtotal * 0.2);
    const isNearZero = netPayable <= 10 && grossSubtotal > 50;

    if (!bypassDiscountSafeguard && (isCustomHigh || isNearZero)) {
      setHighDiscountSafeguard({
        isOpen: true,
        grossSubtotal,
        discountType,
        discountAmount,
        netPayable,
        thresholdPercentage: 20,
      });
      return;
    }

    setCheckoutRequestId(generateClientRequestId('req_pos_checkout'));
    setCashTenderedInput(netPayable.toString());
    setSplitCashAmount(Math.floor(netPayable / 2).toString());
    setSplitSecondaryAmount((netPayable - Math.floor(netPayable / 2)).toString());
    setIsCheckoutOpen(true);
  };

  // Quick tender buttons
  const handleQuickCash = (amount: number) => {
    setCashTenderedInput(amount.toString());
  };

  // Finalize Transaction
  const handleFinalizeTransaction = (bypassTenderSafeguard: boolean = false) => {
    if (isSubmitting) return;
    setErrorMsg(null);

    let paymentsPayload: POSPaymentDetail[] = [];
    let amountTenderedVal = netPayable;

    if (paymentMode === 'single') {
      if (selectedMethod === 'Cash') {
        if (singleCashNum < netPayable) {
          setErrorMsg(`Cash tendered (₱${singleCashNum}) is less than net due (₱${netPayable}).`);
          return;
        }

        // POS Cash Tender Validation Safeguard (5x order total or >₱2,000 above total)
        const diff = singleCashNum - netPayable;
        const isExcessive = (netPayable > 0 && singleCashNum >= netPayable * 5) || diff > 2000;
        if (!bypassTenderSafeguard && isExcessive) {
          setCashTenderSafeguard({
            isOpen: true,
            orderTotal: netPayable,
            cashTendered: singleCashNum,
            changeDue,
            paymentMode: 'single',
          });
          return;
        }

        amountTenderedVal = singleCashNum;
      }
      paymentsPayload = [
        {
          method: selectedMethod,
          amount: netPayable,
          referenceNumber: paymentReference.trim() || undefined,
        },
      ];
    } else {
      // Split payment mode
      if (splitTotalPaid < netPayable) {
        setErrorMsg(`Total split tender (₱${splitTotalPaid}) is less than net payable (₱${netPayable}).`);
        return;
      }

      // POS Cash Tender Validation Safeguard for Split Cash portion or split total
      const splitDiff = splitTotalPaid - netPayable;
      const isExcessive = (netPayable > 0 && splitTotalPaid >= netPayable * 5) || splitDiff > 2000;
      if (!bypassTenderSafeguard && isExcessive) {
        setCashTenderSafeguard({
          isOpen: true,
          orderTotal: netPayable,
          cashTendered: splitTotalPaid,
          changeDue: splitChangeDue,
          paymentMode: 'split',
          splitSecondaryMethod,
          splitSecondaryAmount: splitSecNum,
        });
        return;
      }

      amountTenderedVal = splitTotalPaid;
      paymentsPayload = [
        {
          method: 'Cash',
          amount: splitCashNum,
        },
        {
          method: splitSecondaryMethod,
          amount: splitSecNum,
          referenceNumber: splitSecondaryRef.trim() || undefined,
        },
      ];
    }

    setIsSubmitting(true);
    try {
      let seniorDetailPayload: POSSeniorPwdDetail | undefined = undefined;
      if (discountType === 'pwd_senior') {
        seniorDetailPayload = {
          customerName: seniorPwdName.trim(),
          idType: 'Senior Citizen',
          idNumber: seniorPwdIdNumber.trim(),
          tin: seniorPwdTin.trim() || undefined,
          discountAmount,
        };
      }

      const clientReqKey = checkoutRequestId || generateClientRequestId('req_pos_checkout');
      const { receipt } = processPOSTransaction({
        items: cart.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        payments: paymentsPayload,
        discountType,
        customDiscountAmount: discountType === 'custom' ? customDiscountValue : undefined,
        seniorPwdDetail: seniorDetailPayload,
        terminalId: registerShift.terminalId,
        cashierName: currentUser?.name || registerShift.cashierName,
        amountTendered: amountTenderedVal,
        customerName: customerName || seniorPwdName || undefined,
        clientRequestId: clientReqKey,
      });

      setIsCheckoutOpen(false);
      clearCart();
      setActiveReceiptForModal(receipt);
      setSuccessMsg(`Internal Order Slip #${receipt.receiptNumber} recorded! Stock levels updated & branch sale logged.`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to process transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Batch Sales & Offline Import
  const handleImportCsv = () => {
    if (!csvText.trim()) {
      setErrorMsg('Please paste batch sales CSV text.');
      return;
    }
    setIsImporting(true);
    setErrorMsg(null);
    setImportResult(null);
    try {
      const lines = csvText.trim().split('\n');
      const parsedRows: Array<{
        flavor: string;
        quantity: number;
        total: number;
        date?: string;
        paymentMethod?: string;
        receipt?: string;
      }> = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || (i === 0 && line.toLowerCase().includes('flavor'))) continue;

        const parts = line.split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
        if (parts.length >= 2) {
          const flavor = parts[0];
          const quantity = parseInt(parts[1], 10) || 1;
          const total = parseFloat(parts[2]) || 0;
          const paymentMethod = parts[3] || 'Cash';
          const date = parts[4] || new Date().toISOString();
          const receipt = parts[5] || `IMP-REC-${Date.now().toString().slice(-4)}-${i}`;

          parsedRows.push({ flavor, quantity, total, paymentMethod, date, receipt });
        }
      }

      const res = importBatchSales(parsedRows);
      setImportResult(res);
      setSuccessMsg(`Successfully imported ${res.successCount} sales records into VertexIS database.`);
      setCsvText('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse CSV');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Shift Register Control Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Branch & Terminal Info */}
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-[#F37021] flex items-center justify-center flex-shrink-0 shadow-xs">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                {currentBranch.name} Counter Terminal
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                INTERNAL TERMINAL • NOT AN OFFICIAL RECEIPT
              </span>
            </div>
            <p className="text-xs text-neutral-500 flex items-center space-x-2 mt-0.5">
              <span>Cashier: <strong>{currentUser?.name || registerShift.cashierName}</strong></span>
              <span>•</span>
              <span>Shift Float: <strong>₱{registerShift.openingFloat.toLocaleString()}</strong></span>
              <span>•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">● Real-time Inventory & Sales Sync</span>
            </p>
          </div>
        </div>

        {/* Action Controls (X-Reading, Z-Reading, Audit Trail, View Modes) */}
        <div className="flex flex-wrap items-center gap-2">
          
          <button
            type="button"
            onClick={() => setShowXReading(true)}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 transition-colors flex items-center space-x-1.5 shadow-2xs"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Interim Sales Audit</span>
          </button>

          <button
            type="button"
            onClick={() => setShowZReading(true)}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition-colors flex items-center space-x-1.5 shadow-2xs"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Shift Closing & Booklet Match</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAuditDrawer(true)}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors flex items-center space-x-1.5 shadow-2xs"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Audit Trail</span>
          </button>

          <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block mx-1"></div>

          {/* Tab Switchers */}
          <div className="flex items-center p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl">
            <button
              onClick={() => setActiveTab('register')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'register'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              Counter Terminal
            </button>
            <button
              onClick={() => setActiveTab('receipts')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'receipts'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              Order Slips ({branchReceipts.length})
            </button>
            <button
              onClick={() => setActiveTab('zreadings')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'zreadings'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              Shift Closings ({branchZReadings.length})
            </button>
            <button
              onClick={() => setActiveTab('batchSync')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'batchSync'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              Offline Batch Sync
            </button>
          </div>

        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =========================================================================
          TAB 1: POS REGISTER INTERFACE (DUAL-PANE LAYOUT)
          ========================================================================= */}
      {activeTab === 'register' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT 7-COL: PRODUCT CATALOG & BARCODE SCANNER */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Search & Filter Bar */}
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row gap-2.5">
                
                {/* Search Product */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search marshmallow flavor (e.g. Ube, Matcha, Mango, Strawberry)..."
                    className="w-full pl-10 pr-9 py-2.5 text-xs bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-[#F37021] focus:outline-hidden"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
                {[
                  { id: 'all', label: 'All Flavors' },
                  { id: 'in_stock', label: 'In Stock' },
                  { id: 'low_stock', label: 'Low Stock (≤10)' },
                  { id: 'out_of_stock', label: 'Out of Stock' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                      selectedCategory === cat.id
                        ? 'bg-[#F37021] text-white shadow-2xs'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredProducts.map((product) => {
                const stock = stockMap[product.id] ?? 0;
                const inCart = cart.find((i) => i.product.id === product.id);
                const isOutOfStock = stock <= 0;

                return (
                  <button
                    key={product.id}
                    disabled={isOutOfStock}
                    onClick={() => addToCart(product)}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all relative overflow-hidden group ${
                      isOutOfStock
                        ? 'opacity-40 bg-neutral-100 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 cursor-not-allowed'
                        : inCart
                        ? 'bg-orange-50/50 dark:bg-orange-950/20 border-orange-300 dark:border-orange-800 ring-2 ring-[#F37021]/30 hover:shadow-md'
                        : 'bg-white dark:bg-neutral-900 border-neutral-200/90 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-md'
                    }`}
                  >
                    {inCart && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#F37021] text-white text-[11px] font-bold flex items-center justify-center shadow-xs">
                        {inCart.quantity}
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#F37021]"></span>
                        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                          Box of 12 pcs
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 line-clamp-1 group-hover:text-[#F37021] transition-colors">
                        {product.flavor}
                      </h4>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1">
                        {product.name}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                      <span className="text-sm font-extrabold text-neutral-900 dark:text-white">
                        ₱{product.price}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                          stock > 10
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : stock > 0
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                        }`}
                      >
                        {stock > 0 ? `${stock} left` : 'Out of stock'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

          </div>

          {/* RIGHT 5-COL: CART & STATUTORY COMPLIANCE CHECKOUT PANE */}
          <div className="lg:col-span-5 space-y-4">
            
            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-xs space-y-4 sticky top-20">
              
              {/* Cart Header */}
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center space-x-2">
                  <ShoppingCart className="w-4 h-4 text-[#F37021]" />
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    Current Order Cart
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                    {totalCartUnits} items
                  </span>
                </div>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-xs text-neutral-400 hover:text-red-500 flex items-center space-x-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {/* Cart Line Items */}
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="py-10 text-center text-neutral-400 text-xs">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-neutral-300 dark:text-neutral-700 stroke-1" />
                    Cart is empty. Tap any marshmallow flavor to add.
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5 max-w-[160px]">
                        <span className="font-bold text-neutral-900 dark:text-neutral-100 block truncate">
                          {item.product.flavor}
                        </span>
                        <span className="text-[10px] text-neutral-400 block">
                          ₱{item.unitPrice} each
                        </span>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 p-0.5">
                          <button
                            onClick={() => updateQuantity(item.product.id, -1)}
                            className="p-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-white rounded"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center font-bold text-xs">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, 1)}
                            className="p-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-white rounded"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="font-bold w-14 text-right">
                          ₱{(item.unitPrice * item.quantity).toLocaleString()}
                        </span>

                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-neutral-400 hover:text-red-500 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Customer & Statutory Discounts */}
              <div className="space-y-2.5 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                
                {/* Optional Customer Name */}
                <div>
                  <label className="text-[11px] font-semibold text-neutral-500 block mb-1">
                    Customer Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Maria Santos"
                    className="w-full px-3 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-1 focus:ring-[#F37021] focus:outline-hidden"
                  />
                </div>

                {/* Discount Selector */}
                <div>
                  <label className="text-[11px] font-semibold text-neutral-500 block mb-1">
                    Discounts & Statutory Exemptions
                  </label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-1 focus:ring-[#F37021] focus:outline-hidden"
                  >
                    <option value="none">Standard Retail (No Discount)</option>
                    <option value="pwd_senior">Senior Citizen / PWD (20% + VAT Exempt)</option>
                    <option value="promo10">Promotional 10% Off</option>
                    <option value="promo15">Franchise Promo 15% Off</option>
                    <option value="custom">Custom Manager Discount (₱)</option>
                  </select>
                </div>

                {/* Custom discount value input */}
                {discountType === 'custom' && (
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-500 block mb-1">
                      Custom Discount Amount (₱)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={customDiscountValue || ''}
                      onChange={(e) => setCustomDiscountValue(parseFloat(e.target.value) || 0)}
                      placeholder="e.g. 50"
                      className="w-full px-3 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-300 dark:border-neutral-700 rounded-lg"
                    />
                  </div>
                )}

                {/* Senior Citizen / PWD ID Tracking Requirement */}
                {discountType === 'pwd_senior' && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl space-y-2">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Senior / PWD Statutory ID Compliance</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        required
                        value={seniorPwdName}
                        onChange={(e) => setSeniorPwdName(e.target.value)}
                        placeholder="Beneficiary Full Name *"
                        className="px-2.5 py-1 text-xs bg-white dark:bg-neutral-800 border border-amber-300 dark:border-amber-700 rounded-md"
                      />
                      <input
                        type="text"
                        required
                        value={seniorPwdIdNumber}
                        onChange={(e) => setSeniorPwdIdNumber(e.target.value)}
                        placeholder="OSCA / PWD ID No. *"
                        className="px-2.5 py-1 text-xs bg-white dark:bg-neutral-800 border border-amber-300 dark:border-amber-700 rounded-md font-mono"
                      />
                    </div>
                  </div>
                )}

              </div>

              {/* Price Calculation Summary */}
              <div className="space-y-1.5 pt-3 border-t border-neutral-200 dark:border-neutral-800 text-xs">
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Gross Sales:</span>
                  <span className="font-semibold">₱{grossSubtotal.toLocaleString()}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>
                      Less: Discount ({discountType === 'pwd_senior' ? 'SC/PWD 20%' : discountType.toUpperCase()}):
                    </span>
                    <span className="font-semibold">-₱{discountAmount.toLocaleString()}</span>
                  </div>
                )}

                {/* VAT breakdown indicators */}
                <div className="py-1 px-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 text-[11px] text-neutral-500 space-y-0.5">
                  <div className="flex justify-between">
                    <span>VATable Sales (12%):</span>
                    <span>₱{vatCalculations.vatableSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>12% VAT:</span>
                    <span>₱{vatCalculations.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  {vatCalculations.vatExemptSales > 0 && (
                    <div className="flex justify-between text-amber-600 dark:text-amber-400 font-medium">
                      <span>VAT-Exempt Sales:</span>
                      <span>₱{vatCalculations.vatExemptSales.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between text-base font-extrabold text-neutral-900 dark:text-white pt-2 border-t border-neutral-200 dark:border-neutral-800">
                  <span>TOTAL AMOUNT DUE:</span>
                  <span className="text-[#F37021]">₱{netPayable.toLocaleString()}</span>
                </div>
              </div>

              {/* Tender Checkout Button */}
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={handleOpenCheckout}
                className="w-full py-3 bg-[#F37021] hover:bg-[#d95d14] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
              >
                <CreditCard className="w-4 h-4" />
                <span>Pay ₱{netPayable.toLocaleString()}</span>
              </button>

            </div>

          </div>

        </div>
      )}

      {/* =========================================================================
          TAB 2: COMPLETED INTERNAL ORDER SLIPS HISTORY
          ========================================================================= */}
      {activeTab === 'receipts' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-800">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Internal Counter Order Slips & Branch Sales Log
              </h3>
              <p className="text-xs text-neutral-500">
                Sequential counter transaction register with real-time stock deduction and permanent audit trail
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 uppercase tracking-wider text-[11px] font-semibold border-y border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="py-2.5 px-3">Order Slip Ref</th>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Cashier</th>
                  <th className="py-2.5 px-3">Items</th>
                  <th className="py-2.5 px-3 text-right">Net Amount</th>
                  <th className="py-2.5 px-3">Payment Tender</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {branchReceipts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-neutral-400">
                      No counter order slips recorded yet for this branch.
                    </td>
                  </tr>
                ) : (
                  branchReceipts.map((rec) => (
                    <tr key={rec.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-neutral-900 dark:text-neutral-100">
                        {rec.receiptNumber}
                      </td>
                      <td className="py-3 px-3 text-neutral-600 dark:text-neutral-400">
                        {new Date(rec.timestamp).toLocaleString('en-PH', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-3 px-3 font-medium text-neutral-800 dark:text-neutral-200">
                        {rec.cashierName}
                      </td>
                      <td className="py-3 px-3 text-neutral-600 dark:text-neutral-400">
                        {rec.items.reduce((s, i) => s + i.quantity, 0)} boxes ({rec.items.map((i) => i.flavor).join(', ')})
                      </td>
                      <td className="py-3 px-3 text-right font-extrabold text-neutral-900 dark:text-white">
                        ₱{rec.netSales.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-neutral-600 dark:text-neutral-400">
                        {rec.payments.map((p) => p.method).join(', ')}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            rec.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : rec.status === 'voided'
                              ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {rec.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => setActiveReceiptForModal(rec)}
                          className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300 rounded font-medium text-[11px]"
                        >
                          View Slip
                        </button>
                        {rec.status === 'completed' && (
                          <button
                            onClick={() => setVoidRefundTargetReceipt(rec)}
                            className="px-2 py-1 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-600 dark:text-red-400 rounded font-medium text-[11px]"
                          >
                            Void / Refund
                          </button>
                        )}
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
          TAB 3: DAILY SHIFT SETTLEMENT & BOOKLET RECONCILIATION LEDGER
          ========================================================================= */}
      {activeTab === 'zreadings' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-800">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                End-of-Day Shift Settlement & Manual Booklet Reconciliation Ledger
              </h3>
              <p className="text-xs text-neutral-500">
                Permanent daily financial summaries with manual booklet reconciliation and accumulated grand totals
              </p>
            </div>
            <button
              onClick={() => setShowZReading(true)}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-xs"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Perform Shift Closing & Booklet Match</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 uppercase tracking-wider text-[11px] font-semibold border-y border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="py-2.5 px-3">Closing No</th>
                  <th className="py-2.5 px-3">Closing Date</th>
                  <th className="py-2.5 px-3">Duty Cashier</th>
                  <th className="py-2.5 px-3">Approved By</th>
                  <th className="py-2.5 px-3 text-right">Net Sales</th>
                  <th className="py-2.5 px-3">Manual Booklet Series</th>
                  <th className="py-2.5 px-3 text-right">Cash Counted</th>
                  <th className="py-2.5 px-3 text-center">Variance</th>
                  <th className="py-2.5 px-3 text-right">Accumulated Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {branchZReadings.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-neutral-400">
                      No shift closing settlements recorded yet.
                    </td>
                  </tr>
                ) : (
                  branchZReadings.map((zr) => (
                    <tr key={zr.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-neutral-900 dark:text-neutral-100">
                        {zr.zReadingNumber}
                      </td>
                      <td className="py-3 px-3 text-neutral-600 dark:text-neutral-400">
                        {new Date(zr.closedAt).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
                      </td>
                      <td className="py-3 px-3 font-medium text-neutral-800 dark:text-neutral-200">
                        {zr.cashierName}
                      </td>
                      <td className="py-3 px-3 text-neutral-600 dark:text-neutral-400">
                        {zr.managerApprovedBy}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-neutral-900 dark:text-white">
                        ₱{zr.totalNetSales.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-neutral-700 dark:text-neutral-300 font-mono text-[11px]">
                        {zr.manualBookletSeries || 'Booklet #04 (OR #001250 - #001278)'}
                      </td>
                      <td className="py-3 px-3 text-right font-medium">
                        ₱{zr.actualCash.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-center">
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
                      <td className="py-3 px-3 text-right font-mono font-extrabold text-[#F37021]">
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
          TAB 4: BATCH & OFFLINE SALES CSV IMPORT & RECONCILIATION
          ========================================================================= */}
      {activeTab === 'batchSync' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="pb-3 border-b border-neutral-200 dark:border-neutral-800">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center space-x-2">
              <FileSpreadsheet className="w-4 h-4 text-[#F37021]" />
              <span>Offline POS & Batch CSV Ingestion</span>
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Ingest offline terminal batches and popup stall CSV sales logs into VertexIS to automatically reconcile inventory and sales ledgers.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                CSV Data (Format: flavor, quantity, total, paymentMethod, date, receiptNumber)
              </label>
              <textarea
                rows={6}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={`Ube Velvet, 3, 447, GCash, 2026-08-20T14:30:00.000Z, REC-OFFLINE-1001\nMatcha Dream, 2, 298, Cash, 2026-08-20T15:10:00.000Z, REC-OFFLINE-1002\nMango Tango, 1, 149, Maya, 2026-08-20T16:00:00.000Z, REC-OFFLINE-1003`}
                className="w-full p-3 text-xs font-mono bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:ring-1 focus:ring-[#F37021] focus:outline-hidden"
              ></textarea>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setCsvText(
                    `Ube Velvet, 4, 596, Cash, 2026-08-21T10:00:00.000Z, REC-OFFLINE-9001\nChocolate Silk, 3, 447, GCash, 2026-08-21T11:15:00.000Z, REC-OFFLINE-9002\nMatcha Dream, 2, 298, Maya, 2026-08-21T12:30:00.000Z, REC-OFFLINE-9003\nStrawberry Swirl, 1, 149, Cash, 2026-08-21T13:00:00.000Z, REC-OFFLINE-9004`
                  )
                }
                className="text-xs text-[#F37021] hover:underline font-medium"
              >
                Fill Sample Batch Records
              </button>

              <button
                type="button"
                disabled={isImporting || !csvText.trim()}
                onClick={handleImportCsv}
                className="px-4 py-2 bg-[#F37021] hover:bg-[#d95d14] disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isImporting ? 'Processing Batch...' : 'Process Batch Ingestion'}</span>
              </button>
            </div>

            {importResult && (
              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 space-y-2 text-xs">
                <div className="flex items-center space-x-2 text-emerald-600 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Successfully imported {importResult.successCount} sales records!</span>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="space-y-1 text-red-500">
                    <p className="font-semibold">Import Warnings:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      {importResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          PAYMENT CHECKOUT DRAWER / MODAL
          ========================================================================= */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-[#F37021] text-white">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5" />
                <h3 className="text-base font-bold">Payment & Tender Settlement</h3>
              </div>
              <button onClick={() => setIsCheckoutOpen(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              
              {/* Due Banner */}
              <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/60 flex items-center justify-between">
                <div>
                  <span className="text-xs text-neutral-500 uppercase tracking-wider font-semibold block">
                    Amount Payable
                  </span>
                  <span className="text-2xl font-black text-[#F37021]">
                    ₱{netPayable.toLocaleString()}
                  </span>
                </div>
                <div className="text-right text-xs text-neutral-500">
                  <span>{totalCartUnits} Gourmet Marshmallow Boxes</span>
                  <span className="block font-medium text-emerald-600">
                    {discountAmount > 0 ? `Saved ₱${discountAmount.toLocaleString()} in discounts` : 'Standard VAT Rate'}
                  </span>
                </div>
              </div>

              {/* Single vs Split Payment Mode Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPaymentMode('single')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                    paymentMode === 'single'
                      ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  Single Tender Method
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('split')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                    paymentMode === 'split'
                      ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  Split Payment (Multi-Tender)
                </button>
              </div>

              {/* SINGLE PAYMENT ENGINE */}
              {paymentMode === 'single' ? (
                <div className="space-y-4">
                  {/* Payment Method Selector Grid */}
                  <div>
                    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block mb-2">
                      Select Tender Method:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'Cash', label: 'Cash', icon: Banknote },
                        { id: 'GCash', label: 'GCash', icon: Smartphone },
                        { id: 'Maya', label: 'Maya', icon: Smartphone },
                        { id: 'Bank Transfer', label: 'Bank Transfer', icon: Building2 },
                      ].map((m) => {
                        const Icon = m.icon;
                        const isSelected = selectedMethod === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setSelectedMethod(m.id as POSPaymentMethod)}
                            className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-center space-y-1 transition-all ${
                              isSelected
                                ? 'border-[#F37021] bg-orange-50 dark:bg-orange-950/40 text-[#F37021] font-bold ring-2 ring-[#F37021]/20'
                                : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span className="text-[11px] truncate w-full">{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cash Tender Calculation & Quick Buttons */}
                  {selectedMethod === 'Cash' ? (
                    <div className="space-y-3 p-3.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-200 dark:border-neutral-700">
                      <div>
                        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                          Amount Tendered by Customer (₱)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={cashTenderedInput}
                          onChange={(e) => setCashTenderedInput(e.target.value)}
                          placeholder="0"
                          className="w-full px-3 py-2 text-base font-bold bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-[#F37021] focus:outline-hidden"
                        />
                      </div>

                      {/* Quick denomination pills */}
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: 'Exact', val: netPayable },
                          { label: '₱200', val: 200 },
                          { label: '₱500', val: 500 },
                          { label: '₱1,000', val: 1000 },
                          { label: '₱1,500', val: 1500 },
                          { label: '₱2,000', val: 2000 },
                        ].map((btn) => (
                          <button
                            key={btn.label}
                            type="button"
                            onClick={() => handleQuickCash(btn.val)}
                            className="px-2.5 py-1 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors shadow-2xs"
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>

                      {/* Change Output */}
                      <div className="pt-2 flex items-center justify-between border-t border-neutral-200 dark:border-neutral-700">
                        <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                          Change Due to Customer:
                        </span>
                        <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                          ₱{changeDue.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Digital / Bank Payee Details & Manual Reference Input */
                    <div className="space-y-3 p-3.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-200 dark:border-neutral-700">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                          {selectedMethod} Payee Details & Verification
                        </label>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                          Manual Reference
                        </span>
                      </div>

                      {/* Payee Account Details Card */}
                      <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-500">Payee Name:</span>
                          <span className="font-bold text-neutral-900 dark:text-white">
                            {selectedMethod === 'GCash'
                              ? COMMISSARY_DIGITAL_WALLETS.gcash.merchantName
                              : selectedMethod === 'Maya'
                              ? COMMISSARY_DIGITAL_WALLETS.maya.merchantName
                              : 'THE MARSH BITES CONFECTIONERY INC.'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-500">Account / Mobile:</span>
                          <span className="font-mono font-bold text-[#F37021]">
                            {selectedMethod === 'GCash'
                              ? COMMISSARY_DIGITAL_WALLETS.gcash.walletNumber
                              : selectedMethod === 'Maya'
                              ? COMMISSARY_DIGITAL_WALLETS.maya.walletNumber
                              : 'BDO 0048-2918-4491'}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-500 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                          Customer transfers directly to the account above. Inspect customer's completed payment screen and record the reference number below.
                        </p>
                      </div>

                      {/* Reference Input */}
                      <div>
                        <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 block mb-1">
                          {selectedMethod} Reference / Trace Number *
                        </label>
                        <input
                          type="text"
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                          placeholder={
                            selectedMethod === 'GCash'
                              ? 'e.g. 20260908-109283 (GCash Ref)'
                              : selectedMethod === 'Maya'
                              ? 'e.g. MY-20260908-9842 (Maya Ref)'
                              : 'e.g. 20260908-BDO-84920 (Bank Trace #)'
                          }
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:ring-1 focus:ring-[#F37021] focus:outline-hidden font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* SPLIT PAYMENT ENGINE */
                <div className="space-y-4">
                  <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-3">
                    <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                      Tender 1: Cash Portion
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-neutral-500 block mb-1">Cash Tendered (₱)</label>
                        <input
                          type="number"
                          min="0"
                          value={splitCashAmount}
                          onChange={(e) => setSplitCashAmount(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs font-bold bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg"
                        />
                      </div>
                      <div className="flex flex-col justify-end">
                        <span className="text-[10px] text-neutral-400">Remaining Balance:</span>
                        <span className="text-xs font-bold text-[#F37021]">
                          ₱{Math.max(0, netPayable - splitCashNum).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                        Tender 2: Digital / Bank Portion
                      </h4>
                      <span className="text-[10px] text-neutral-400 font-medium">
                        Manual Trace Input
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="text-[11px] text-neutral-500 block mb-1">Secondary Method</label>
                        <select
                          value={splitSecondaryMethod}
                          onChange={(e) => setSplitSecondaryMethod(e.target.value as POSPaymentMethod)}
                          className="w-full px-2 py-1.5 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg"
                        >
                          <option value="GCash">GCash</option>
                          <option value="Maya">Maya</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] text-neutral-500 block mb-1">Amount (₱)</label>
                        <input
                          type="number"
                          min="0"
                          value={splitSecondaryAmount}
                          onChange={(e) => setSplitSecondaryAmount(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs font-bold bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-neutral-500 block mb-1">Ref #</label>
                        <input
                          type="text"
                          value={splitSecondaryRef}
                          onChange={(e) => setSplitSecondaryRef(e.target.value)}
                          placeholder="Ref / Auth"
                          className="w-full px-2 py-1.5 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-between text-xs">
                    <span>Total Split Paid: <strong>₱{splitTotalPaid.toLocaleString()}</strong></span>
                    <span>Change Due: <strong className="text-emerald-600">₱{splitChangeDue.toLocaleString()}</strong></span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsCheckoutOpen(false)}
                  className="px-4 py-2.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleFinalizeTransaction()}
                  className="px-6 py-2.5 bg-[#F37021] hover:bg-[#d95d14] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Recording Order Slip...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Record Sale & Generate Order Slip</span>
                    </>
                  )}
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          ATTACHED BIR RECEIPT MODAL
          ========================================================================= */}
      {activeReceiptForModal && (
        <BIRReceiptModal
          receipt={activeReceiptForModal}
          onClose={() => setActiveReceiptForModal(null)}
        />
      )}

      {/* =========================================================================
          ATTACHED X-READING MODAL
          ========================================================================= */}
      {showXReading && (
        <XReadingModal onClose={() => setShowXReading(false)} />
      )}

      {/* =========================================================================
          ATTACHED Z-READING MODAL
          ========================================================================= */}
      {showZReading && (
        <ZReadingModal
          onClose={() => setShowZReading(false)}
          onZReadingGenerated={(rec) => {
            setSuccessMsg(`Z-Reading #${rec.zReadingNumber} successfully recorded & shift closed!`);
            setTimeout(() => setSuccessMsg(null), 5000);
          }}
        />
      )}

      {/* =========================================================================
          ATTACHED VOID / REFUND MODAL
          ========================================================================= */}
      {voidRefundTargetReceipt && (
        <VoidRefundModal
          receipt={voidRefundTargetReceipt}
          onClose={() => setVoidRefundTargetReceipt(null)}
          onSuccess={(msg) => {
            setSuccessMsg(msg);
            setTimeout(() => setSuccessMsg(null), 5000);
          }}
        />
      )}

      {/* =========================================================================
          ATTACHED POS AUDIT LOG DRAWER
          ========================================================================= */}
      {showAuditDrawer && (
        <POSAuditDrawer onClose={() => setShowAuditDrawer(false)} />
      )}

      {/* =========================================================================
          ATTACHED POS SAFEGUARD MODALS
          ========================================================================= */}
      {cashTenderSafeguard && (
        <CashTenderSafeguardModal
          details={cashTenderSafeguard}
          themeMode={themeMode}
          onClose={() => setCashTenderSafeguard(null)}
          onConfirm={() => handleFinalizeTransaction(true)}
        />
      )}

      {highDiscountSafeguard && (
        <HighDiscountSafeguardModal
          details={highDiscountSafeguard}
          themeMode={themeMode}
          onClose={() => setHighDiscountSafeguard(null)}
          onConfirm={() => handleOpenCheckout(true)}
        />
      )}

    </div>
  );
};
