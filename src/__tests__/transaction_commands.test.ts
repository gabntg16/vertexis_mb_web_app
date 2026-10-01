import { describe, expect, it } from 'vitest';
import { executeTransaction, readPaymentProof } from '../../functions/src/transactionCommands';
import { packageTotal } from '../../functions/src/transactionModel';

type DB = Parameters<typeof executeTransaction>[0];
type Request = Parameters<typeof executeTransaction>[1];
// Serialized, staged adapter exercises actual callable handlers. This is not a Firestore emulator.
function database() {
  const data = new Map<string, any>([
    ['users/admin', { role: 'admin', isActive: true, name: 'HQ' }],
    ...['manager', 'staff', 'cashier', 'inventory', 'other'].map(uid => [`users/${uid}`, { role: 'branch', branchId: uid === 'other' ? 'b2' : 'b1', isActive: true }]),
    ...Object.entries({ manager: 'Branch Manager', staff: 'Staff', cashier: 'Cashier', inventory: 'Inventory Specialist', other: 'Branch Manager' }).map(([uid, role]) => [`branch_accounts/${uid}`, { role, branchId: uid === 'other' ? 'b2' : 'b1', isActive: true, fullName: uid }]),
    ['branches/b1', { name: 'Branch 1', status: 'active' }], ['branches/b2', { name: 'Branch 2', status: 'active' }],
    ['products/p1', { name: 'Marshmallow', flavor: 'Oreo', price: 149.99, wholesalePrice: 100 }],
    ['inventory/i1', { id: 'i1', branchId: 'b1', productId: 'p1', stock: 10 }],
    ['inventory/i2', { id: 'i2', branchId: 'b2', productId: 'p1', stock: 20 }],
  ] as [string, any][]);
  let queue = Promise.resolve();
  let failure: 'before' | 'after' | undefined;
  const snapshot = (path: string): any => ({ id: path.split('/')[1], exists: data.has(path), data: () => structuredClone(data.get(path)), ref: ref(path) });
  const ref = (path: string): any => ({ path, id: path.split('/')[1], get: async () => snapshot(path) });
  const db = {
    doc: ref,
    collection: (path: string) => ({ where: (key: string, _op: string, value: unknown) => ({ path, key, value }) }),
    runTransaction: (action: (tx: any) => Promise<any>) => {
      const execute = async () => {
        const writes: Array<{ path: string; value: any; create?: boolean }> = [];
        const tx = {
          get: async (target: any) => {
            if (writes.length) throw new Error('Read after write');
            return target.key ? { docs: [...data].filter(([path, value]) => path.startsWith(target.path + '/') && value[target.key] === target.value).map(([path]) => snapshot(path)) } : snapshot(target.path);
          },
          set: (target: any, value: any) => writes.push({ path: target.path, value }),
          update: (target: any, value: any) => writes.push({ path: target.path, value: { ...data.get(target.path), ...value } }),
          create: (target: any, value: any) => writes.push({ path: target.path, value, create: true }),
        };
        const result = await action(tx);
        const business = writes.some(w => w.path.startsWith('transaction_requests/'));
        if (business && failure === 'before') { failure = undefined; throw Object.assign(new Error('network'), { code: 14 }); }
        for (const write of writes) if (write.create && data.has(write.path)) throw new Error('Duplicate create');
        writes.forEach(w => data.set(w.path, structuredClone(w.value)));
        if (business && failure === 'after') { failure = undefined; throw Object.assign(new Error('lost response'), { code: 14 }); }
        return result;
      };
      const result = queue.then(execute);
      queue = result.then(() => undefined, () => undefined);
      return result;
    },
  } as unknown as DB;
  return { db, data, fail: (when: 'before' | 'after') => { failure = when; } };
}
const request = (action: string, input: any, uid = 'manager', requestId = 'request1'): Request => ({ data: { action, input, requestId }, auth: { uid, token: { role: uid === 'admin' ? 'admin' : 'branch', branchId: uid === 'other' ? 'b2' : 'b1' } } } as unknown as Request);
const sale = { productId: 'p1', quantity: 3, paymentMethod: 'Cash' };
const proof = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jL1sAAAAASUVORK5CYII=';
const orderInput = { items: [{ productId: 'p1', quantity: 35, unitPrice: 0 }], packageTier: 'silver', totalAmount: 1, branchId: 'b2' };

async function paidOrder(env: ReturnType<typeof database>) {
  const result = await executeTransaction(env.db, request('order.create', orderInput));
  const orderId = result.order.id;
  await executeTransaction(env.db, request('payment.submit', { orderId, proof, referenceNumber: 'GC-123', paymentMethod: 'gcash' }, 'manager', 'proof1'));
  await executeTransaction(env.db, request('payment.approve', { orderId, proofRevision: 'proof1' }, 'admin', 'approve1'));
  return orderId;
}

describe('Backend transaction boundaries', () => {
  it('uses confirmed package pricing, catalog names and the authenticated branch', async () => {
    const { db, data } = database();
    const result = await executeTransaction(db, request('order.create', orderInput));
    expect(result.order).toMatchObject({ branchId: 'b1', totalAmount: 3999, status: 'pending', paymentStatus: 'PENDING' });
    expect(data.get('inventory/i1').stock).toBe(10);
    expect(() => packageTotal('__proto__' as any, 35)).toThrow();
    expect(() => packageTotal('silver', 55)).toThrow();
  });
  it.each([0, -1, 1.5, NaN, Infinity, '3', 1000001])('rejects invalid sale quantity %s with no stock changes', async quantity => {
    const { db, data } = database();
    await expect(executeTransaction(db, request('sale.create', { ...sale, quantity }, 'staff'))).rejects.toThrow();
    expect(data.get('inventory/i1').stock).toBe(10);
    expect([...data.keys()].filter(k => k.startsWith('sales/'))).toHaveLength(0);
  });
  it('recalculates sale price and prevents overselling under concurrent requests', async () => {
    const { db, data } = database();
    const results = await Promise.allSettled(['a', 'b'].map(id => executeTransaction(db, request('sale.create', { ...sale, quantity: 7, price: 1, total: 1 }, 'cashier', id))));
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(data.get('inventory/i1').stock).toBe(3);
    expect(data.get('inventory/i2').stock).toBe(20);
    const actual = [...data].find(([k]) => k.startsWith('sales/'))![1];
    expect(actual.total).toBe(1049.93);
  });
  it('replays a duplicate safely and refuses a changed request under the same key', async () => {
    const { db, data } = database();
    const input = request('sale.create', sale, 'staff');
    const [first, second] = await Promise.all([executeTransaction(db, input), executeTransaction(db, input)]);
    expect(first).toEqual(second);
    expect(data.get('inventory/i1').stock).toBe(7);
    await expect(executeTransaction(db, request('sale.create', { ...sale, quantity: 1 }, 'staff'))).rejects.toThrow('retry key');
    expect([...data.keys()].filter(k => k.startsWith('transaction_audit/'))).toHaveLength(1);
  });
  it.each(['before', 'after'] as const)('retries safely after a failure %s commit', async when => {
    const env = database(); env.fail(when);
    const input = request('sale.create', sale, 'staff');
    await expect(executeTransaction(env.db, input)).rejects.toThrow('could not be confirmed');
    expect(env.data.get('inventory/i1').stock).toBe(when === 'before' ? 10 : 7);
    await executeTransaction(env.db, input);
    expect(env.data.get('inventory/i1').stock).toBe(7);
    expect([...env.data.keys()].filter(k => k.startsWith('sales/'))).toHaveLength(1);
  });
  it('denies unauthenticated, inactive, wrong-role and cross-branch requests', async () => {
    const { db, data } = database();
    await expect(executeTransaction(db, { data: {} } as Request)).rejects.toThrow('Sign in');
    for (const uid of ['staff', 'cashier', 'inventory', 'admin']) await expect(executeTransaction(db, request('order.create', orderInput, uid))).rejects.toThrow('branch managers');
    await expect(executeTransaction(db, request('sale.create', sale, 'inventory'))).rejects.toThrow();
    data.get('branch_accounts/staff').isActive = false;
    await expect(executeTransaction(db, request('sale.create', sale, 'staff'))).rejects.toThrow('access');
    const order = await executeTransaction(db, request('order.create', orderInput));
    await expect(executeTransaction(db, request('payment.submit', { orderId: order.order.id, proof }, 'other'))).rejects.toThrow('permissions');
  });
  it('accepts a UID-linked legacy branch account without custom claims', async () => {
    const { db, data } = database();
    const legacyRequest = request('shift.waste.add', { productId: 'p1', quantity: 1, reason: 'Damaged seal' }, 'staff');
    legacyRequest.auth!.token = {} as NonNullable<Request['auth']>['token'];
    const result = await executeTransaction(db, legacyRequest);
    expect(result.log.spoilageEntries).toHaveLength(1);
    expect(result.log.branchId).toBe('b1');
    expect(data.get('daily_shift_logs/log-b1-' + result.log.date).totalSpoilageUnits).toBe(1);
  });
  it('rejects an explicit custom-claim branch mismatch', async () => {
    const { db } = database();
    const mismatched = request('shift.waste.add', { productId: 'p1', quantity: 1, reason: 'Damaged seal' }, 'staff');
    mismatched.auth!.token.branchId = 'b2';
    await expect(executeTransaction(db, mismatched)).rejects.toThrow('branch access');
  });
  it('requires a valid inspected proof, blocks self-approval and does not credit stock at payment approval', async () => {
    const env = database();
    const { order } = await executeTransaction(env.db, request('order.create', orderInput));
    await expect(executeTransaction(env.db, request('production.start', { orderId: order.id }, 'admin', 'prod'))).rejects.toThrow('verify payment');
    await expect(executeTransaction(env.db, request('payment.submit', { orderId: order.id, proof: 'https://example.com/proof.jpg' }, 'manager', 'external'))).rejects.toThrow('External proof');
    await executeTransaction(env.db, request('payment.submit', { orderId: order.id, proof, referenceNumber: 'ref123', paymentMethod: 'gcash' }, 'manager', 'proof1'));
    await expect(readPaymentProof(env.db, { ...request('', {}, 'other'), data: { orderId: order.id } })).rejects.toThrow('not available');
    await expect(readPaymentProof(env.db, { ...request('', {}, 'staff'), data: { orderId: order.id } })).rejects.toThrow('not available');
    expect(await readPaymentProof(env.db, { ...request('', {}, 'admin'), data: { orderId: order.id } })).toMatchObject({ revision: 'proof1' });
    await expect(executeTransaction(env.db, request('payment.approve', { orderId: order.id, proofRevision: 'proof1' }, 'manager', 'bad'))).rejects.toThrow('HQ');
    await expect(executeTransaction(env.db, request('payment.approve', { orderId: order.id, proofRevision: 'old' }, 'admin', 'stale'))).rejects.toThrow('changed');
    await executeTransaction(env.db, request('payment.approve', { orderId: order.id, proofRevision: 'proof1' }, 'admin', 'ok'));
    expect(env.data.get('inventory/i1').stock).toBe(10);
    expect(env.data.get(`orders/${order.id}`)).toMatchObject({ paymentStatus: 'SUCCESSFUL', paymentVerifiedBy: 'admin', productionStage: 'queued' });
  });
  it('enforces forward production and full dispatch exactly once', async () => {
    const env = database(); const orderId = await paidOrder(env);
    await executeTransaction(env.db, request('production.start', { orderId }, 'admin', 'cook'));
    await expect(executeTransaction(env.db, request('production.stage', { orderId, stage: 'ready_for_dispatch' }, 'admin', 'skip'))).rejects.toThrow('forward');
    await executeTransaction(env.db, request('production.stage', { orderId, stage: 'packaging' }, 'admin', 'pack'));
    await executeTransaction(env.db, request('production.stage', { orderId, stage: 'ready_for_dispatch' }, 'admin', 'ready'));
    await expect(executeTransaction(env.db, request('delivery.create', { orderId, address: 'Branch 1', extra: { dispatchedProducts: [{ productId: 'p1', quantity: 1 }] } }, 'admin', 'partial'))).rejects.toThrow('match');
    const input = { orderId, address: 'Branch 1' };
    const results = await Promise.allSettled(['dispatch1', 'dispatch2'].map(key => executeTransaction(env.db, request('delivery.create', input, 'admin', key))));
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(env.data.get(`orders/${orderId}`).status).toBe('dispatched');
    expect(env.data.get('inventory/i1').stock).toBe(10);
  });
  it('leaves stock unchanged on rejection and requires an explanation', async () => {
    const env = database(); const { order } = await executeTransaction(env.db, request('order.create', orderInput));
    await expect(executeTransaction(env.db, request('order.reject', { orderId: order.id }, 'admin', 'bad'))).rejects.toThrow();
    await executeTransaction(env.db, request('order.reject', { orderId: order.id, reason: 'Incorrect request' }, 'admin', 'reject'));
    expect(env.data.get(`orders/${order.id}`).status).toBe('rejected');
    expect(env.data.get('inventory/i1').stock).toBe(10);
  });
});

describe('Shared shift logs', () => {
  it('persists counts and wastage, rejects stale or unauthorized reviews, and locks once', async () => {
    const env = database();
    const { log } = await executeTransaction(env.db, request('shift.counts', { items: [{ productId: 'p1', beginningCount: 10, endingCount: 7 }] }, 'staff', 'counts'));
    await executeTransaction(env.db, request('shift.waste.add', { productId: 'p1', quantity: 1, reason: 'Damaged', costImpact: 0 }, 'staff', 'waste'));
    expect(env.data.get(`daily_shift_logs/${log.id}`).totalSpoilageCost).toBe(100);
    await executeTransaction(env.db, request('sale.create', sale, 'cashier', 'sale'));
    const submitted = await executeTransaction(env.db, request('shift.submit', { logId: log.id }, 'staff', 'submit'));
    expect(submitted.log.totalSalesRevenue).toBe(449.97);
    await expect(executeTransaction(env.db, request('shift.counts', { logId: log.id, items: [] }, 'staff', 'edit'))).rejects.toThrow('awaiting review');
    await expect(executeTransaction(env.db, request('shift.approve', { logId: log.id, revision: submitted.log.revision }, 'staff', 'unauthorized'))).rejects.toThrow('branch manager');
    await expect(executeTransaction(env.db, request('shift.approve', { logId: log.id, revision: 0 }, 'manager', 'stale'))).rejects.toThrow('changed');
    await expect(executeTransaction(env.db, request('shift.approve', { logId: log.id, revision: submitted.log.revision }, 'other', 'cross'))).rejects.toThrow('another branch');
    await executeTransaction(env.db, request('shift.approve', { logId: log.id, revision: submitted.log.revision }, 'manager', 'approve'));
    expect(env.data.get(`daily_shift_logs/${log.id}`).status).toBe('VALIDATED_AND_LOCKED');
    expect(env.data.get('inventory/i1').stock).toBe(7);
    await expect(executeTransaction(env.db, request('shift.waste.remove', { logId: log.id, entryId: 'waste-waste' }, 'staff', 'remove'))).rejects.toThrow('locked');
  });
  it('rejects invalid physical counts instead of saving invented quantities', async () => {
    const env = database();
    await expect(executeTransaction(env.db, request('shift.counts', { items: [{ productId: 'p1', beginningCount: 10, endingCount: -1 }] }, 'staff'))).rejects.toThrow('Quantity');
    expect([...env.data.keys()].some(k => k.startsWith('daily_shift_logs/'))).toBe(false);
  });
});

describe('Pricing and audit preservation', () => {
  it('persists HQ prices, rejects unauthorized or invalid amounts, and leaves past orders unchanged', async () => {
    const env = database();
    const { order } = await executeTransaction(env.db, request('order.create', orderInput));
    await expect(executeTransaction(env.db, request('product.price', { productId: 'p1', price: 1 }, 'staff'))).rejects.toThrow('HQ');
    await expect(executeTransaction(env.db, request('product.price', { productId: 'p1', price: -1 }, 'admin'))).rejects.toThrow('monetary');
    await executeTransaction(env.db, request('product.price', { productId: 'p1', price: 159, wholesalePrice: 110 }, 'admin', 'price'));
    expect(env.data.get('products/p1').price).toBe(159);
    expect(env.data.get(`orders/${order.id}`).totalAmount).toBe(3999);
  });
  it('archives only closed orders without discarding payment or audit history', async () => {
    const env = database();
    const { order } = await executeTransaction(env.db, request('order.create', orderInput));
    await expect(executeTransaction(env.db, request('order.archive', { orderId: order.id }, 'admin', 'early'))).rejects.toThrow('completed, rejected or canceled');
    await executeTransaction(env.db, request('order.reject', { orderId: order.id, reason: 'Replaced request' }, 'admin', 'reject'));
    await executeTransaction(env.db, request('order.archive', { orderId: order.id }, 'admin', 'archive'));
    expect(env.data.get(`orders/${order.id}`)).toMatchObject({ isArchived: true, status: 'rejected' });
    expect([...env.data.keys()].filter(k => k.startsWith('transaction_audit/'))).toHaveLength(3);
  });
});
