// Shared by the browser and trusted Functions; keep this module free of SDK imports.
export interface InboundLine {
  productId: string;
  productName: string;
  expectedUnits: number;
  receivedUnits: number;
  condition: 'good' | 'damaged' | 'shortage' | 'overage';
  notes?: string;
}

export interface InboundReceipt {
  id: string;
  branchId: string;
  manifestNumber: string;
  supplierOrSource: string;
  deliveryId?: string;
  orderId?: string;
  items: InboundLine[];
  status: 'pending' | 'approved' | 'returned';
  submittedBy: string;
  submittedByName: string;
  submittedAt: string;
  revision: number;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  stockAppliedAt?: string;
}

export interface InboundSubmission {
  manifestNumber: string;
  supplierOrSource: string;
  deliveryId?: string;
  items: InboundLine[];
}

export function receiptId(branchId: string, manifest: string, deliveryId?: string): string {
  return `inbound-${encodeURIComponent(branchId)}-${deliveryId ? 'delivery-' + encodeURIComponent(deliveryId) : 'manifest-' + encodeURIComponent(manifest.trim().toUpperCase())}`;
}

export function validateInboundSubmission(input: InboundSubmission): void {
  if (!input || typeof input !== 'object') throw new Error('Enter a valid receiving request.');
  if (typeof input.manifestNumber !== 'string' || !input.manifestNumber.trim() || input.manifestNumber.length > 80) throw new Error('Enter a manifest number of up to 80 characters.');
  if (typeof input.supplierOrSource !== 'string' || !input.supplierOrSource.trim() || input.supplierOrSource.length > 160) throw new Error('Enter the supplier or source (up to 160 characters).');
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 50) throw new Error('Include between 1 and 50 product lines.');
  if (input.deliveryId && (typeof input.deliveryId !== 'string' || input.deliveryId.length > 128 || input.deliveryId.includes('/'))) throw new Error('Invalid delivery reference.');
  for (const item of input.items) {
    if (!item || typeof item.productId !== 'string' || !item.productId || item.productId.length > 128 || item.productId.includes('/')) throw new Error('Select a valid product for every line.');
    if (!['good', 'damaged', 'shortage', 'overage'].includes(item.condition)) throw new Error('Select a valid item condition.');
    if (![item.expectedUnits, item.receivedUnits].every(q => Number.isSafeInteger(q) && q >= 0 && q <= 1000000)) throw new Error('Quantities must be whole numbers from 0 to 1,000,000.');
    if (item.notes !== undefined && (typeof item.notes !== 'string' || item.notes.length > 2000)) throw new Error('Item notes must be at most 2,000 characters.');
  }
}

export function acceptedInboundUnits(items: InboundLine[]): Map<string, { productName: string; quantity: number }> {
  const totals = new Map<string, { productName: string; quantity: number }>();
  for (const item of items) {
    if (item.condition === 'damaged' || item.receivedUnits === 0) continue;
    const previous = totals.get(item.productId)?.quantity || 0;
    totals.set(item.productId, { productName: item.productName, quantity: previous + item.receivedUnits });
  }
  return totals;
}

export function assertReviewable(receipt: InboundReceipt, branchId: string, revision: number): void {
  if (receipt.branchId !== branchId) throw new Error('This receipt belongs to another branch.');
  if (receipt.status !== 'pending' || receipt.stockAppliedAt) throw new Error('This receipt has already been reviewed. Refresh the list.');
  if (receipt.revision !== revision) throw new Error('This receipt has changed. Review the latest quantities before approving.');
}
