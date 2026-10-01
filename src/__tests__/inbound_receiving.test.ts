import { describe, expect, it } from 'vitest';
import { submitInbound, reviewInbound } from '../../functions/src/inboundReceiving';
import { InboundReceipt, InboundSubmission, receiptId, validateInboundSubmission } from '../../functions/src/inboundReceivingModel';

type Firestore = Parameters<typeof submitInbound>[0];
type CallableRequest<T> = Omit<Parameters<typeof submitInbound>[1], 'data'> & { data: T };

// Exercise the real handlers with an atomic in-memory transaction adapter.
// Writes are staged so a failed transaction cannot leave a partial stock credit.
function database() {
  const data = new Map<string, Record<string, any>>([
    ['users/staff', { branchId: 'b1', isActive: true }],
    ['users/manager', { branchId: 'b1', isActive: true }],
    ['users/other', { branchId: 'b2', isActive: true }],
    ['branches/b1', { status: 'active' }],
    ['branches/b2', { status: 'active' }],
    ['branch_accounts/staff', { branchId: 'b1', isActive: true, role: 'Staff', fullName: 'Staff' }],
    ['branch_accounts/manager', { branchId: 'b1', isActive: true, role: 'Branch Manager', fullName: 'Manager' }],
    ['branch_accounts/other', { branchId: 'b2', isActive: true, role: 'Branch Manager', fullName: 'Other' }],
    ['products/p1', { name: 'Marshmallow', flavor: 'Oreo' }],
    ['products/p2', { name: 'Marshmallow', flavor: 'Mango' }],
    ['deliveries/d1', { branchId: 'b1', orderId: 'o1', waybillNumber: 'WB-1', status: 'in_transit' }],
    ['orders/o1', { branchId: 'b1', status: 'dispatched' }],
    ['inventory/existing', { id: 'existing', branchId: 'b1', productId: 'p1', productName: 'Oreo', stock: 10, minThreshold: 5 }],
    ['inventory/other', { id: 'other', branchId: 'b2', productId: 'p1', stock: 80 }],
  ]);
  const snapshot = (path: string): any => ({ id: path.split('/')[1], exists: data.has(path), data: () => data.get(path), ref: ref(path) });
  const ref = (path: string): any => ({ path, id: path.split('/')[1], get: async () => snapshot(path) });
  const db = {
    doc: ref,
    collection: (path: string) => ({ where: (key: string, _op: string, value: string) => ({ path, key, value }) }),
    runTransaction: async (action: (tx: any) => Promise<unknown>) => {
      const writes: Array<() => void> = [];
      const tx = {
        get: async (target: any) => target.key
          ? { docs: [...data].filter(([path, value]) => path.startsWith(target.path + '/') && value[target.key] === target.value).map(([path]) => snapshot(path)) }
          : snapshot(target.path),
        set: (target: any, value: any, options?: { merge: boolean }) => writes.push(() => data.set(target.path, { ...(options?.merge ? data.get(target.path) : {}), ...value })),
        update: (target: any, value: any) => writes.push(() => data.set(target.path, { ...data.get(target.path), ...value })),
        create: (target: any, value: any) => writes.push(() => data.set(target.path, value)),
      };
      const result = await action(tx);
      writes.forEach(write => write());
      return result;
    },
  } as unknown as Firestore;
  return { db, data };
}

const submission: InboundSubmission = {
  manifestNumber: 'WB-1', supplierOrSource: 'Commissary', deliveryId: 'd1',
  items: [
    { productId: 'p1', productName: 'Oreo', expectedUnits: 8, receivedUnits: 6, condition: 'shortage' },
    { productId: 'p1', productName: 'Oreo', expectedUnits: 2, receivedUnits: 2, condition: 'good' },
    { productId: 'p2', productName: 'Mango', expectedUnits: 3, receivedUnits: 3, condition: 'damaged' },
  ],
};
function request<T>(data: T, uid = 'staff', branchId = 'b1'): CallableRequest<T> {
  return { data, auth: { uid, token: { role: 'branch', branchId } } } as unknown as CallableRequest<T>;
}
function review(receipt: InboundReceipt, decision: 'approved' | 'returned' = 'approved', notes = '') {
  return request({ id: receipt.id, revision: receipt.revision, decision, notes }, 'manager');
}

describe('Inbound receiving approval', () => {
  it('keeps pending stock unchanged and credits actual accepted quantities exactly once', async () => {
    const { db, data } = database();
    const receipt = await submitInbound(db, request(submission));
    expect(data.get('inventory/existing')?.stock).toBe(10);
    await reviewInbound(db, review(receipt));
    expect(data.get('inventory/existing')).toMatchObject({ stock: 18, currentStock: 18, minThreshold: 5 });
    expect(data.get('inventory/other')?.stock).toBe(80);
    expect(data.has('inventory/inv-b1-p2')).toBe(false);
    expect(data.get('orders/o1')).toMatchObject({ status: 'completed', isArchived: true });
    expect(data.get('deliveries/d1')?.status).toBe('delivered');
    expect([...data.keys()].filter(key => key.startsWith('inventoryMovements/'))).toHaveLength(1);
    await expect(reviewInbound(db, review(receipt))).rejects.toThrow('already been reviewed');
    expect(data.get('inventory/existing')?.stock).toBe(18);
  });

  it('creates a missing stock row for an accepted product', async () => {
    const { db, data } = database();
    const receipt = await submitInbound(db, request({ ...submission, items: [{ ...submission.items[2], condition: 'good' }] }));
    await reviewInbound(db, review(receipt));
    expect(data.get('inventory/inv-b1-p2')).toMatchObject({ stock: 3, currentStock: 3, branchId: 'b1' });
  });

  it.each(['Branch Manager', 'BRANCH_MANAGER', 'branch-manager', 'Manager'])('accepts the trusted manager role format %s', async role => {
    const { db, data } = database();
    data.set('branch_accounts/manager', { branchId: 'b1', isActive: true, role, fullName: 'Manager' });
    const receipt = await submitInbound(db, request(submission));
    await reviewInbound(db, review(receipt));
    expect(data.get(`inbound_receipts/${receipt.id}`)?.status).toBe('approved');
  });

  it('updates an existing pending receiving record instead of leaving a stale pending delivery', async () => {
    const { db, data } = database();
    data.set('receivings/placeholder', { id: 'placeholder', branchId: 'b1', deliveryId: 'd1', orderId: 'o1', status: 'pending' });
    const receipt = await submitInbound(db, request(submission));
    await reviewInbound(db, review(receipt));
    expect(data.get('receivings/placeholder')?.status).toBe('received');
    expect([...data.keys()].filter(key => key.startsWith('receivings/'))).toHaveLength(1);
  });

  it('allows returned quantities to be corrected and blocks stale approval of the earlier revision', async () => {
    const { db, data } = database();
    const first = await submitInbound(db, request(submission));
    await reviewInbound(db, review(first, 'returned', 'Please recount the Oreo packs.'));
    expect(data.get('inventory/existing')?.stock).toBe(10);
    const next = await submitInbound(db, request({ ...submission, items: [{ ...submission.items[0], receivedUnits: 5 }] }));
    expect(next.revision).toBe(2);
    await expect(reviewInbound(db, review(first))).rejects.toThrow('changed');
    await reviewInbound(db, review(next));
    expect(data.get('inventory/existing')?.stock).toBe(15);
  });

  it('prevents staff and other branches from approving', async () => {
    const { db } = database();
    const receipt = await submitInbound(db, request(submission));
    const payload = review(receipt).data;
    await expect(reviewInbound(db, request(payload))).rejects.toThrow('Only the branch manager');
    await expect(reviewInbound(db, request(payload, 'other', 'b2'))).rejects.toThrow('another branch');
  });

  it('requires a reason to return a receipt', async () => {
    const { db } = database();
    const receipt = await submitInbound(db, request(submission));
    await expect(reviewInbound(db, review(receipt, 'returned'))).rejects.toThrow('reason');
  });

  it('rejects duplicate submissions even when staff types the shipment waybill manually', async () => {
    const { db } = database();
    await submitInbound(db, request(submission));
    await expect(submitInbound(db, request({ ...submission, deliveryId: undefined, manifestNumber: ' wb-1 ' }))).rejects.toThrow('already awaiting');
  });

  it('does not credit a shipment already received through the older workflow', async () => {
    const { db, data } = database();
    const receipt = await submitInbound(db, request(submission));
    data.set('receivings/legacy', { deliveryId: 'd1', status: 'received' });
    await expect(reviewInbound(db, review(receipt))).rejects.toThrow('already been received');
    expect(data.get('inventory/existing')?.stock).toBe(10);
  });

  it('rolls back the whole approval when inventory has duplicate product rows', async () => {
    const { db, data } = database();
    const receipt = await submitInbound(db, request(submission));
    data.set('inventory/duplicate', { branchId: 'b1', productId: 'p1', stock: 1 });
    await expect(reviewInbound(db, review(receipt))).rejects.toThrow('Duplicate inventory');
    expect(data.get(`inbound_receipts/${receipt.id}`)?.status).toBe('pending');
    expect(data.get('inventory/existing')?.stock).toBe(10);
  });

  it.each([-1, 1.5, NaN, Infinity, 1000001])('rejects invalid quantity %s', quantity => {
    expect(() => validateInboundSubmission({ ...submission, items: [{ ...submission.items[0], receivedUnits: quantity }] })).toThrow('whole numbers');
  });

  it('uses a stable branch-scoped key for manual manifests', () => {
    expect(receiptId('b1', ' abc ')).toBe(receiptId('b1', 'ABC'));
    expect(receiptId('b1', 'ABC')).not.toBe(receiptId('b2', 'ABC'));
  });
});
