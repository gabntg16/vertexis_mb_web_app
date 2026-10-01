import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import type { Order, OrderItem } from '../types';
import { buildCommissarySummary, commissaryTableText, getCommissaryTable } from '../utils/commissarySummary';
import { createCommissaryWorkbook } from '../utils/commissarySummaryExport';

const item = (quantity: number, productId = 'vanilla'): OrderItem => ({ productId, productName: productId, quantity, unitPrice: 100 });
const order = (id: string, changes: Partial<Order> = {}): Order => ({
  id, branchId: 'b1', branchName: 'Legazpi', createdAt: '2026-09-28T12:00:00', status: 'approved',
  paymentStatus: 'SUCCESSFUL', paymentVerifiedAt: '2026-09-28T12:00:00', proofImagePath: 'proof.jpg', totalAmount: 1000, items: [item(10)], ...changes,
});
const all = { branchId: 'all', from: '', to: '' };

describe('Commissary requisition summary', () => {
  it('filters kitchen progress even when the order status is still approved', () => {
    const report = buildCommissarySummary([order('cooking', { productionStage: 'curing' }), order('queued')], [], { ...all, stage: 'kitchen' });
    expect(report.orderCount).toBe(1);
    expect(report.totals.kitchen).toBe(10);
    expect(report.totals.toMake).toBe(0);
    expect(report.details[0].orderId).toBe('cooking');
  });

  it('exports the selected preview with quoted CSV values and safe clipboard text', () => {
    const report = buildCommissarySummary([order('ORDER-1', { branchName: '=1+1', items: [{ ...item(10), productName: 'Vanilla, "Classic"\nPack' }] })], [], all);
    const table = getCommissaryTable(report, 'requisitions');
    expect(table.rows[0][0]).toBe('ORDER-1');
    const csv = commissaryTableText(report, 'requisitions', ',');
    expect(csv).toContain('"\'=1+1"');
    expect(csv).toContain('"Vanilla, ""Classic""\nPack"');
    const clipboard = commissaryTableText(report, 'requisitions', '\t');
    expect(clipboard.split('\r\n')).toHaveLength(2);
    expect(clipboard.split('\r\n')[1].split('\t')).toHaveLength(table.headers.length);
    expect(commissaryTableText(report, 'flavors', ',')).not.toContain('ORDER-1');
  });
  it('separates approval, unstarted work, kitchen, ready and dispatched without counting shipped units as new demand', () => {
    const report = buildCommissarySummary([
      order('pending', { status: 'pending' }), order('missing-proof', { proofImagePath: '' }), order('queued'),
      order('cooking', { productionStage: 'curing' }), order('qc', { productionStage: 'packaged' }),
      order('ready', { productionStage: 'ready_for_dispatch' }),
      order('sent', { productionStage: 'ready_for_dispatch', isDispatched: true }),
      order('received', { status: 'completed', isArchived: true, isDispatched: true }),
      order('rejected', { status: 'rejected' }), order('canceled', { status: 'canceled' }),
    ], [], all);
    expect(report.orderCount).toBe(8);
    expect(report.totals).toEqual({ requested: 80, awaiting: 20, toMake: 10, kitchen: 20, ready: 10, dispatched: 20, done: 30, dispatchDifference: 0 });
  });

  it('uses actual dispatch lines, merges duplicate products, and exposes shortfalls and substitutions', () => {
    const report = buildCommissarySummary([order('partial', {
      status: 'dispatched', items: [item(6), item(4)], dispatchedProducts: [item(3), item(4), item(2, 'chocolate')],
    })], [], all);
    expect(report.totals.requested).toBe(10);
    expect(report.totals.dispatched).toBe(9);
    expect(report.totals.toMake).toBe(0);
    expect(report.flavors.find(row => row.productId === 'vanilla')?.dispatchDifference).toBe(3);
    expect(report.flavors.find(row => row.productId === 'chocolate')?.dispatchDifference).toBe(-2);
    expect(report.details).toHaveLength(2);
  });

  it('distinguishes missing historical dispatch lists from explicitly empty dispatch lists', () => {
    const report = buildCommissarySummary([
      order('legacy', { isDispatched: true }), order('empty', { isDispatched: true, dispatchedProducts: [] }),
    ], [], all);
    expect(report.totals.dispatched).toBe(10);
    expect(report.totals.dispatchDifference).toBe(10);
    expect(report.details[0].dispatchBasis).toContain('legacy');
  });

  it('does not treat archival alone as evidence of dispatch', () => {
    const report = buildCommissarySummary([order('archived', { status: 'completed', isArchived: true })], [], all);
    expect(report.totals.dispatched).toBe(0);
    expect(report.details[0].stage).toContain('unconfirmed');
  });

  it('keeps dispatch discrepancies visible when filtering dispatched records with zero sent units', () => {
    const report = buildCommissarySummary([order('short', { isDispatched: true, dispatchedProducts: [] })], [], { ...all, stage: 'dispatched' });
    expect(report.orderCount).toBe(1);
    expect(report.totals.dispatchDifference).toBe(10);
  });

  it('filters inclusively by local requisition dates and branch, including archived history', () => {
    const report = buildCommissarySummary([
      order('first', { createdAt: '2026-09-27T00:00:00' }),
      order('last', { createdAt: '2026-09-28T23:59:59', isArchived: true, isDispatched: true }),
      order('outside', { createdAt: '2026-09-29T00:00:00' }),
      order('other-branch', { branchId: 'b2' }), order('invalid-date', { createdAt: 'unknown' }),
    ], [], { branchId: 'b1', from: '2026-09-27', to: '2026-09-28' });
    expect(report.details.map(row => row.orderId)).toEqual(['first', 'last']);
  });

  it('returns empty totals when no orders match', () => {
    const report = buildCommissarySummary([], [], all);
    expect(report.flavors).toEqual([]);
    expect(Object.values(report.totals).every(value => value === 0)).toBe(true);
  });

  it('exports a real workbook with numeric totals, traceable order details and literal user text', () => {
    const report = buildCommissarySummary([order('ORDER-001', { branchName: '=1+1' })], [], all);
    const workbook = createCommissaryWorkbook(report, 'All branches; all dates', new Date('2026-09-28T12:00:00'));
    const exported = XLSX.read(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }), { type: 'buffer' });
    expect(exported.SheetNames).toEqual(['Summary', 'Requisition Detail']);
    expect(exported.Sheets.Summary.C7.v).toBe(10);
    expect(exported.Sheets.Summary.C7.t).toBe('n');
    expect(exported.Sheets['Requisition Detail'].A2.v).toBe('ORDER-001');
    expect(exported.Sheets['Requisition Detail'].B2.v).toBe('=1+1');
    expect(exported.Sheets['Requisition Detail'].B2.f).toBeUndefined();
  });
});
