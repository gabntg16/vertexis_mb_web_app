import {
  BIRReceipt,
  ShiftClosingRecord,
  InventoryMovementRecord,
  POSAuditLog,
  Branch,
  Product,
  POSTransactionItem,
  POSPaymentDetail,
} from '../types';

export function generateInitialBIRReceipts(branches: Branch[], products: Product[]): BIRReceipt[] {
  const receipts: BIRReceipt[] = [];
  const now = new Date();

  branches.forEach((b, branchIndex) => {
    const branchCodeNum = String(branchIndex + 1).padStart(3, '0');
    const branchPrefix = `BR${branchCodeNum}-2026-`;

    // Generate 5-10 historic receipts for each branch
    const receiptCount = 6;
    for (let seq = 1; seq <= receiptCount; seq++) {
      const receiptNo = `${branchPrefix}${String(seq).padStart(6, '0')}`;
      const timeOffsetHours = (receiptCount - seq) * 3 + branchIndex;
      const receiptDate = new Date(now.getTime() - timeOffsetHours * 60 * 60 * 1000).toISOString();

      // Pick 1-3 items
      const p1 = products[seq % products.length];
      const p2 = products[(seq + 2) % products.length];

      const qty1 = (seq % 3) + 1;
      const qty2 = seq % 2 === 0 ? 1 : 2;

      const gross1 = p1.price * qty1;
      const gross2 = p2.price * qty2;
      const grossSales = gross1 + gross2;

      const isSeniorOrPwd = seq % 4 === 0;
      const isPromo = seq % 5 === 0 && !isSeniorOrPwd;

      let discountType: 'none' | 'pwd_senior' | 'promo10' | 'promo15' | 'custom' = 'none';
      let discountAmount = 0;
      let vatableSales = 0;
      let vatAmount = 0;
      let vatExemptSales = 0;

      if (isSeniorOrPwd) {
        discountType = 'pwd_senior';
        // SC/PWD: Exempt from 12% VAT + 20% discount on net price
        const netBase = grossSales / 1.12;
        discountAmount = Math.round(netBase * 0.2);
        vatExemptSales = Math.round(netBase - discountAmount);
        vatableSales = 0;
        vatAmount = 0;
      } else if (isPromo) {
        discountType = 'promo10';
        discountAmount = Math.round(grossSales * 0.1);
        const net = grossSales - discountAmount;
        vatableSales = Math.round((net / 1.12) * 100) / 100;
        vatAmount = Math.round((net - vatableSales) * 100) / 100;
      } else {
        const net = grossSales;
        vatableSales = Math.round((net / 1.12) * 100) / 100;
        vatAmount = Math.round((net - vatableSales) * 100) / 100;
      }

      const netSales = grossSales - discountAmount;

      const items: POSTransactionItem[] = [
        {
          productId: p1.id,
          productName: p1.name,
          flavor: p1.flavor,
          barcode: `MB-${p1.id.toUpperCase()}-01`,
          quantity: qty1,
          unitPrice: p1.price,
          grossAmount: gross1,
          discountAmount: isSeniorOrPwd ? Math.round((gross1 / 1.12) * 0.2) : 0,
          netAmount: gross1 - (isSeniorOrPwd ? Math.round((gross1 / 1.12) * 0.2) : 0),
          isVatExempt: isSeniorOrPwd,
        },
        {
          productId: p2.id,
          productName: p2.name,
          flavor: p2.flavor,
          barcode: `MB-${p2.id.toUpperCase()}-01`,
          quantity: qty2,
          unitPrice: p2.price,
          grossAmount: gross2,
          discountAmount: isSeniorOrPwd ? Math.round((gross2 / 1.12) * 0.2) : 0,
          netAmount: gross2 - (isSeniorOrPwd ? Math.round((gross2 / 1.12) * 0.2) : 0),
          isVatExempt: isSeniorOrPwd,
        },
      ];

      // Payment details
      const paymentTypeChoice = seq % 4;
      const payments: POSPaymentDetail[] = [];
      let tendered = netSales;
      let change = 0;

      if (paymentTypeChoice === 0) {
        // Cash with change
        tendered = Math.ceil(netSales / 100) * 100;
        change = tendered - netSales;
        payments.push({ method: 'Cash', amount: netSales });
      } else if (paymentTypeChoice === 1) {
        // GCash
        payments.push({
          method: 'GCash',
          amount: netSales,
          referenceNumber: `GC-982${seq}${branchIndex}1409`,
        });
      } else if (paymentTypeChoice === 2) {
        // Maya
        payments.push({
          method: 'Maya',
          amount: netSales,
          referenceNumber: `MY-771${seq}${branchIndex}9201`,
        });
      } else {
        // Split Payment (Cash + GCash)
        const half = Math.round(netSales / 2);
        payments.push({ method: 'Cash', amount: half });
        payments.push({
          method: 'GCash',
          amount: netSales - half,
          referenceNumber: `GC-SPLIT-${seq}${branchIndex}`,
        });
      }

      receipts.push({
        id: `rec-${b.id}-${seq}`,
        receiptNumber: receiptNo,
        sequenceNumber: seq,
        branchId: b.id,
        branchCode: b.code || `MB-${b.id.toUpperCase()}`,
        branchName: b.name,
        branchAddress: b.location,
        branchContact: b.contactNumber,
        terminalId: 'POS-01',
        cashierId: `csh-${b.id}-01`,
        cashierName: `${b.name} Cashier`,
        timestamp: receiptDate,
        items,
        grossSales,
        discountType,
        discountAmount,
        seniorPwdDetail: isSeniorOrPwd
          ? {
              idNumber: `SC-2024-${8000 + seq}`,
              customerName: 'Arturo Dela Cruz',
              type: 'Senior Citizen',
              bookletNumber: `OSCA-NCR-${100 + seq}`,
            }
          : undefined,
        netSales,
        vatableSales,
        vatAmount,
        vatExemptSales,
        zeroRatedSales: 0,
        payments,
        totalAmountTendered: tendered,
        change,
        status: seq === 3 && branchIndex === 0 ? 'voided' : 'completed',
        voidReason: seq === 3 && branchIndex === 0 ? 'Customer changed flavor preference before handoff' : undefined,
        voidedBy: seq === 3 && branchIndex === 0 ? 'Branch Manager (Eduardo Ramirez)' : undefined,
        voidedAt: seq === 3 && branchIndex === 0 ? receiptDate : undefined,
        syncedToCloud: true,
      });
    }
  });

  return receipts;
}

export function generateInitialShiftClosings(branches: Branch[]): ShiftClosingRecord[] {
  const closings: ShiftClosingRecord[] = [];
  const now = new Date();

  branches.forEach((b, branchIndex) => {
    const branchCodeNum = String(branchIndex + 1).padStart(3, '0');
    const zNum = `ZR-BR${branchCodeNum}-2026-00001`;

    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const openedAt = new Date(yesterday.setHours(9, 0, 0, 0)).toISOString();
    const closedAt = new Date(yesterday.setHours(21, 30, 0, 0)).toISOString();

    const cashSales = 12500;
    const digitalSales = 8450;
    const cardSales = 3200;
    const bankTransferSales = 1490;
    const totalGrossSales = cashSales + digitalSales + cardSales + bankTransferSales;
    const totalDiscounts = 894;
    const totalNetSales = totalGrossSales - totalDiscounts;
    const totalVatableSales = Math.round((totalNetSales / 1.12) * 100) / 100;
    const totalVatAmount = Math.round((totalNetSales - totalVatableSales) * 100) / 100;

    const openingFloat = 2000;
    const expectedCash = openingFloat + cashSales;
    const actualCash = expectedCash; // perfect balance
    const cashVariance = actualCash - expectedCash;

    closings.push({
      id: `zr-${b.id}-001`,
      zReadingNumber: zNum,
      sequenceNumber: 1,
      branchId: b.id,
      branchCode: b.code || `MB-${b.id.toUpperCase()}`,
      branchName: b.name,
      terminalId: 'POS-01',
      cashierId: `csh-${b.id}-01`,
      cashierName: `${b.name} Head Cashier`,
      openedAt,
      closedAt,
      openingFloat,
      cashSales,
      digitalSales,
      cardSales,
      bankTransferSales,
      totalGrossSales,
      totalDiscounts,
      totalVatAmount,
      totalVatableSales,
      totalVatExemptSales: 0,
      totalZeroRatedSales: 0,
      totalNetSales,
      totalTransactions: 32,
      beginningReceiptNo: `BR${branchCodeNum}-2026-000001`,
      endingReceiptNo: `BR${branchCodeNum}-2026-000032`,
      totalVoids: 1,
      totalVoidAmount: 298,
      totalRefunds: 0,
      totalRefundAmount: 0,
      expectedCash,
      actualCash,
      cashVariance,
      cashBreakdown: [
        { denomination: 1000, count: 12, total: 12000 },
        { denomination: 500, count: 4, total: 2000 },
        { denomination: 100, count: 4, total: 400 },
        { denomination: 50, count: 2, total: 100 },
      ],
      previousAccumulatedGrandTotal: 154000,
      todayAccumulatedSales: totalNetSales,
      newAccumulatedGrandTotal: 154000 + totalNetSales,
      managerApprovedBy: b.managerName || 'Eduardo Ramirez',
      notes: 'Standard end-of-day register closure. All sales and GCash/Maya batches settled successfully.',
      syncedToCloud: true,
    });
  });

  return closings;
}

export function generateInitialInventoryMovements(branches: Branch[], products: Product[]): InventoryMovementRecord[] {
  const movements: InventoryMovementRecord[] = [];
  const now = new Date();

  branches.forEach((b, branchIndex) => {
    products.forEach((p, pIndex) => {
      // Stock In movement (Commissary Delivery)
      movements.push({
        id: `mov-${b.id}-${p.id}-in`,
        branchId: b.id,
        productId: p.id,
        productName: `${p.flavor} (${p.name})`,
        type: 'Stock In',
        quantity: 50,
        previousStock: 0,
        newStock: 50,
        referenceNo: `DEL-MTO-08${branchIndex + 1}`,
        performedBy: 'Central Naga Commissary Delivery',
        timestamp: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(),
        notes: 'Dispatched from Naga Central Kitchen kettle batch',
      });

      // POS Sale movement
      movements.push({
        id: `mov-${b.id}-${p.id}-sale`,
        branchId: b.id,
        productId: p.id,
        productName: `${p.flavor} (${p.name})`,
        type: 'POS Sale',
        quantity: -6,
        previousStock: 50,
        newStock: 44,
        referenceNo: `BR001-2026-00000${pIndex + 1}`,
        performedBy: `${b.name} Cashier`,
        timestamp: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
        notes: 'Walk-in retail sales batch',
      });
    });
  });

  return movements;
}

export function generateInitialPOSAuditLogs(branches: Branch[]): POSAuditLog[] {
  const logs: POSAuditLog[] = [];
  const now = new Date();

  branches.forEach((b, idx) => {
    const time = new Date(now.getTime() - (idx + 1) * 2 * 60 * 60 * 1000).toISOString();

    logs.push({
      id: `log-pos-login-${b.id}`,
      branchId: b.id,
      branchCode: b.code || `MB-${b.id.toUpperCase()}`,
      user: `${b.name} Cashier`,
      userRole: 'Cashier',
      action: 'LOGIN',
      timestamp: time,
      details: 'Terminal POS-01 authenticated cashier shift opening with ₱2,000 float.',
      deviceInfo: 'Sunmi V2 PRO / Chrome 124 POS Tablet (VertexIS Client)',
      referenceId: 'POS-01',
    });

    logs.push({
      id: `log-pos-xread-${b.id}`,
      branchId: b.id,
      branchCode: b.code || `MB-${b.id.toUpperCase()}`,
      user: `${b.name} Cashier`,
      userRole: 'Cashier',
      action: 'X_READING',
      timestamp: new Date(now.getTime() - (idx + 1) * 60 * 60 * 1000).toISOString(),
      details: 'Interim midday sales audit reading executed by cashier on duty.',
      deviceInfo: 'Sunmi V2 PRO / Chrome 124 POS Tablet (VertexIS Client)',
      referenceId: 'X-READ-MIDDAY',
    });
  });

  return logs;
}
