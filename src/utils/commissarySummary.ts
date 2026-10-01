import { paymentReady } from '../../functions/src/transactionModel';
import type { Order, Product } from '../types';

export const quantityColumns = {
  requested: 'Requisition units',
  awaiting: 'Awaiting approval / proof',
  toMake: 'To make (not started)',
  kitchen: 'In kitchen / packing & QC',
  ready: 'Done - awaiting dispatch',
  dispatched: 'Dispatched units',
  done: 'Done total (ready + dispatched)',
  dispatchDifference: 'Dispatch difference (requested - sent)',
} as const;

export type Quantities = Record<keyof typeof quantityColumns, number>;
export type SummaryStage = 'all' | 'awaiting' | 'toMake' | 'kitchen' | 'ready' | 'dispatched';
export interface SummaryFilters { branchId: string; from: string; to: string; stage?: SummaryStage }
export interface RequisitionSummaryRow extends Quantities {
  orderId: string;
  branch: string;
  createdDate: string;
  productId: string;
  flavor: string;
  stage: string;
  dispatchBasis: string;
}

const emptyQuantities = (): Quantities => ({ requested: 0, awaiting: 0, toMake: 0, kitchen: 0, ready: 0, dispatched: 0, done: 0, dispatchDifference: 0 });
const quantity = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;
export function localDate(value: string | Date): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function buildCommissarySummary(orders: Order[], products: Product[], filters: SummaryFilters) {
  const productMap = new Map(products.map(product => [product.id, product]));
  const selectedOrders = orders.filter(order => {
    if (order.status === 'rejected' || order.status === 'canceled') return false;
    if (filters.branchId !== 'all' && order.branchId !== filters.branchId) return false;
    const date = localDate(order.createdAt);
    if ((filters.from || filters.to) && !date) return false;
    return (!filters.from || date >= filters.from) && (!filters.to || date <= filters.to);
  });
  const details: RequisitionSummaryRow[] = [];
  for (const order of selectedOrders) {
    const sent = Boolean(order.isDispatched || order.dispatchedAt || order.status === 'dispatched');
    const stage = order.productionStage as string | undefined;
    const ready = ['ready_for_dispatch', 'ready', 'completed'].includes(stage ?? '') || order.status === 'completed';
    const kitchen = ['in_kettle', 'curing', 'in_production', 'packaging', 'packaged'].includes(stage ?? '') || order.status === 'in_production';
    const canStart = paymentReady(order);
    // Merge repeated product lines; retain products no longer in the catalog.
    const items = new Map<string, { flavor: string; requested: number; dispatched: number }>();
    for (const item of order.items) {
      const previous = items.get(item.productId);
      items.set(item.productId, {
        flavor: previous?.flavor || item.flavor || productMap.get(item.productId)?.flavor || item.productName,
        requested: (previous?.requested ?? 0) + quantity(item.quantity), dispatched: 0,
      });
    }
    const hasDispatchList = order.dispatchedProducts !== undefined;
    if (sent) {
      for (const item of order.dispatchedProducts ?? order.items) {
        const previous = items.get(item.productId);
        items.set(item.productId, {
          flavor: previous?.flavor || item.flavor || productMap.get(item.productId)?.flavor || item.productName,
          requested: previous?.requested ?? 0,
          dispatched: (previous?.dispatched ?? 0) + quantity(item.quantity),
        });
      }
    }
    for (const [productId, item] of items) {
      const amounts = emptyQuantities();
      amounts.requested = item.requested;
      let label: string;
      if (sent) {
        amounts.dispatched = item.dispatched;
        amounts.dispatchDifference = item.requested - item.dispatched;
        label = 'Dispatched';
      } else if (ready) {
        amounts.ready = item.requested;
        label = order.status === 'completed' ? 'Completed - dispatch unconfirmed' : 'Ready for dispatch';
      } else if (kitchen) {
        amounts.kitchen = item.requested;
        label = ['packaging', 'packaged'].includes(stage ?? '') ? 'Packing & QC' : 'In kitchen';
      } else if (canStart) {
        amounts.toMake = item.requested;
        label = 'To make';
      } else {
        amounts.awaiting = item.requested;
        label = 'Awaiting approval / proof';
      }
      amounts.done = amounts.ready + amounts.dispatched;
      details.push({ ...amounts, orderId: order.id, branch: order.branchName, createdDate: localDate(order.createdAt), productId, flavor: item.flavor, stage: label,
        dispatchBasis: sent ? hasDispatchList ? 'Confirmed dispatch list' : 'Order quantities (legacy dispatch)' : '' });
    }
  }
  const stageLabels: Record<Exclude<SummaryStage, 'all'>, string[]> = {
    awaiting: ['Awaiting approval / proof'], toMake: ['To make'], kitchen: ['In kitchen', 'Packing & QC'],
    ready: ['Ready for dispatch', 'Completed - dispatch unconfirmed'], dispatched: ['Dispatched'],
  };
  const selectedStage = filters.stage;
  const filteredDetails = selectedStage && selectedStage !== 'all'
    ? details.filter(row => stageLabels[selectedStage].includes(row.stage))
    : details;
  const totals = emptyQuantities();
  const grouped = new Map<string, Quantities & { productId: string; flavor: string }>();
  for (const row of filteredDetails) {
    const group = grouped.get(row.productId) ?? { ...emptyQuantities(), productId: row.productId, flavor: row.flavor };
    for (const key of Object.keys(quantityColumns) as (keyof Quantities)[]) {
      totals[key] += row[key];
      group[key] += row[key];
    }
    grouped.set(row.productId, group);
  }
  return { totals, flavors: [...grouped.values()].sort((a, b) => a.flavor.localeCompare(b.flavor)), details: filteredDetails, orderCount: new Set(filteredDetails.map(row => row.orderId)).size };
}

export const summaryNotes = [
  'Snapshot of recorded requisition stages, not measured batch output. Quantities are units, not order counts.',
  'Dates filter requisition creation date (local time), not production or dispatch date. Archived history is included; rejected and canceled orders are excluded.',
  'To make means approved with verified payment and not started. Pending approval/proof is listed separately. Packing and QC remain in kitchen.',
  'Done total = awaiting dispatch + dispatched; do not add Done total to these columns again. Completed orders without dispatch evidence remain awaiting dispatch.',
  'Confirmed dispatch item quantities are used when present. Older dispatches without item lists use ordered quantities. Dispatch differences require review; they are not automatically new kitchen demand.',
  'Unallocated commissary buffer and independent production batches are excluded.',
];

export type SummaryView = 'flavors' | 'requisitions';
export function getCommissaryTable(report: ReturnType<typeof buildCommissarySummary>, view: SummaryView) {
  const keys = Object.keys(quantityColumns) as (keyof Quantities)[];
  const values = (row: Quantities) => keys.map(key => row[key]);
  return view === 'flavors' ? {
    headers: ['Product ID', 'Flavor / product', ...Object.values(quantityColumns)],
    rows: report.flavors.map(row => [row.productId, row.flavor, ...values(row)]),
  } : {
    headers: ['Order ID', 'Branch', 'Order date', 'Flavor / product', 'Current stage', ...Object.values(quantityColumns)],
    rows: report.details.map(row => [row.orderId, row.branch, row.createdDate, row.flavor, row.stage, ...values(row)]),
  };
}

export function commissaryTableText(report: ReturnType<typeof buildCommissarySummary>, view: SummaryView, delimiter: ',' | '\t') {
  const table = getCommissaryTable(report, view);
  const escape = (value: string | number) => {
    let text = String(value);
    // Keep user-entered names as text when opened or pasted into spreadsheet apps.
    if (typeof value === 'string' && /^[=+@-]/.test(text.trimStart())) text = `'${text}`;
    if (delimiter === '\t') return text.replace(/[\t\r\n]+/g, ' ');
    return `"${text.replace(/"/g, '""')}"`;
  };
  return [table.headers, ...table.rows].map(row => row.map(escape).join(delimiter)).join('\r\n');
}
