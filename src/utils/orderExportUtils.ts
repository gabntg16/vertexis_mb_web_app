import * as XLSX from 'xlsx';
import { Order } from '../types';

export interface ExportOrderItem {
  'Order ID': string | number;
  'Partner Name': string;
  'Order Date': string;
  'Package Type': string;
  'Quantity': number;
  'Ads Amount': string | number;
  'Total Amount (₱)': string;
  'Amount Paid': string;
  'Payment Channel': string;
  'Payment Date': string;
  'Ship Out Date': string;
  'Arrival date': string;
  'Balance': string;
  'Status': string;
}

export interface ExportRawOrderItem {
  'Order ID': string | number;
  'Partner Name': string;
  'Order Date': string;
  'Package Type': string;
  'Quantity': number;
  'Ads Amount': number;
  'Total Amount (₱)': number;
  'Amount Paid': number;
  'Payment Channel': string;
  'Payment Date': string;
  'Ship Out Date': string;
  'Arrival date': string;
  'Balance': number;
  'Status': string;
}

/**
 * Format date nicely for spreadsheet reports (e.g., 2026-09-24 or readable date)
 */
function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return dateStr;
  }
}

/**
 * Format currency with Peso sign
 */
function formatCurrency(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Map an Order to the exact export row structure requested by the user
 */
export function mapOrderToExportRow(order: Order, index?: number): ExportOrderItem {
  // Quantity calculation
  const totalQty =
    order.items && order.items.length > 0
      ? order.items.reduce((sum, it) => sum + (it.quantity || 0), 0)
      : order.packageName?.includes('200')
      ? 200
      : order.packageName?.includes('100')
      ? 100
      : order.packageName?.includes('50')
      ? 50
      : 55;

  // Package Type
  let packageType = 'Gold';
  if (order.packageTier) {
    packageType = order.packageTier.charAt(0).toUpperCase() + order.packageTier.slice(1);
  } else if (order.packageName) {
    if (order.packageName.toLowerCase().includes('platinum')) packageType = 'Platinum';
    else if (order.packageName.toLowerCase().includes('silver')) packageType = 'Silver';
    else if (order.packageName.toLowerCase().includes('gold')) packageType = 'Gold';
    else packageType = order.packageName;
  }

  // Payment status & Amount paid
  const isPaid =
    order.status === 'approved' ||
    order.status === 'completed' ||
    order.status === 'dispatched' ||
    (order.productionStage && order.productionStage !== 'queued') ||
    !!order.proofImagePath;

  const totalAmount = order.totalAmount || 0;
  const amountPaid = isPaid ? totalAmount : 0;
  const balance = totalAmount - amountPaid;

  // Payment channel
  let paymentChannel = 'gcash/bank trasnfer';
  if (order.paymentMethod) {
    paymentChannel = order.paymentMethod.toLowerCase().includes('gcash')
      ? 'GCash'
      : order.paymentMethod.toLowerCase().includes('bank')
      ? 'Bank Transfer'
      : order.paymentMethod;
  } else if (order.proofImagePath) {
    paymentChannel = 'gcash/bank trasnfer';
  }

  // Payment Date
  const paymentDate = formatDate(order.paymentCompletedAt || order.paymentVerifiedAt || (isPaid ? order.createdAt : null));

  // Ship out date
  const shipOutDate = formatDate(order.dispatchedAt || (order.isDispatched ? order.createdAt : null));

  // Arrival date
  const arrivalDate = formatDate(order.estimatedDeliveryTime || order.receivedAt || order.completedAt || null);

  // Status representation
  let statusText = 'PAID';
  if (order.status === 'rejected') {
    statusText = 'REJECTED';
  } else if (order.status === 'pending' && !order.proofImagePath) {
    statusText = 'PENDING';
  } else if (order.status === 'waitingApproval') {
    statusText = 'WAITING APPROVAL';
  } else if (isPaid) {
    statusText = 'PAID';
  } else {
    statusText = order.status.toUpperCase();
  }

  // Order ID: use numeric index or clean numeric representation if possible, or ID
  const cleanId = order.id.replace(/^[-_a-zA-Z]+/, '') || (index !== undefined ? String(index + 1) : order.id);

  // Partner Name: clean branch name or city (e.g. "Legazpi City", "Naga City", "Daraga")
  const partnerName = (order.branchName || 'Legazpi City')
    .replace('Marsh Bites - ', '')
    .replace('Marsh Bites ', '')
    .trim();

  return {
    'Order ID': cleanId,
    'Partner Name': partnerName,
    'Order Date': formatDate(order.createdAt),
    'Package Type': packageType,
    'Quantity': totalQty,
    'Ads Amount': '',
    'Total Amount (₱)': formatCurrency(totalAmount),
    'Amount Paid': formatCurrency(amountPaid),
    'Payment Channel': paymentChannel,
    'Payment Date': paymentDate,
    'Ship Out Date': shipOutDate,
    'Arrival date': arrivalDate,
    'Balance': balance.toFixed(2),
    'Status': statusText,
  };
}

/**
 * Generate and download genuine Excel (.xlsx) file
 */
export function downloadOrdersExcel(orders: Order[], filename = 'VertexIS_Orders_Report.xlsx') {
  const data = orders.map((ord, idx) => mapOrderToExportRow(ord, idx));

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set column widths for optimal display in Excel
  worksheet['!cols'] = [
    { wch: 12 }, // Order ID
    { wch: 22 }, // Partner Name
    { wch: 14 }, // Order Date
    { wch: 16 }, // Package Type
    { wch: 10 }, // Quantity
    { wch: 14 }, // Ads Amount
    { wch: 18 }, // Total Amount (₱)
    { wch: 18 }, // Amount Paid
    { wch: 24 }, // Payment Channel
    { wch: 14 }, // Payment Date
    { wch: 14 }, // Ship Out Date
    { wch: 14 }, // Arrival date
    { wch: 12 }, // Balance
    { wch: 16 }, // Status
  ];

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders Summary');

  // Trigger download
  XLSX.writeFile(workbook, filename);
}

/**
 * Generate and download CSV file with UTF-8 BOM
 */
export function downloadOrdersCSV(orders: Order[], filename = 'VertexIS_Orders_Report.csv') {
  const data = orders.map((ord, idx) => mapOrderToExportRow(ord, idx));

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

  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerRow = headers.map(escapeCSV).join(',');
  const rows = data.map((row) => headers.map((h) => escapeCSV(row[h])).join(','));

  // Prepend UTF-8 BOM (\uFEFF) so Microsoft Excel opens it with proper character encoding
  const csvContent = '\uFEFF' + [headerRow, ...rows].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
