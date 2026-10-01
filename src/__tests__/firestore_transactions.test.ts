import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { executeTransaction } from '../../functions/src/transactionCommands';

const requireBackend = createRequire(resolve('functions/package.json'));
const { initializeApp, deleteApp } = requireBackend('firebase-admin/app');
const { getFirestore } = requireBackend('firebase-admin/firestore');

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)('Callable transaction handlers against Firestore emulator', () => {
  it('serializes competing stock deductions and replays a committed request without double charging', async () => {
    const app = initializeApp({ projectId: 'demo-vertexis-audit' }, 'transaction-integrity-test');
    const db = getFirestore(app) as Parameters<typeof executeTransaction>[0];
    try {
      await db.doc('users/tx-staff').set({ name: 'Test Staff', role: 'branch', branchId: 'tx-branch', isActive: true });
      await db.doc('branch_accounts/tx-staff').set({ fullName: 'Test Staff', role: 'Staff', branchId: 'tx-branch', isActive: true });
      await db.doc('branches/tx-branch').set({ name: 'Isolated test branch', status: 'active' });
      await db.doc('products/tx-product').set({ name: 'Test product', flavor: 'Oreo', price: 149.99 });
      await db.doc('inventory/tx-inventory').set({ id: 'tx-inventory', branchId: 'tx-branch', productId: 'tx-product', stock: 5 });
      const prefix = `tx-${Date.now()}`;
      const request = (suffix: string) => ({ auth: { uid: 'tx-staff', token: { role: 'branch', branchId: 'tx-branch' } }, data: { action: 'sale.create', requestId: `${prefix}-${suffix}`, input: { productId: 'tx-product', quantity: 4, paymentMethod: 'Cash' } } } as unknown as Parameters<typeof executeTransaction>[1]);
      const results = await Promise.allSettled([executeTransaction(db, request('a')), executeTransaction(db, request('b'))]);
      expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
      expect((await db.doc('inventory/tx-inventory').get()).data()?.stock).toBe(1);
      const winner = results[0].status === 'fulfilled' ? 'a' : 'b';
      const replay = await executeTransaction(db, request(winner));
      expect(replay.sale.total).toBe(599.96);
      expect((await db.doc('inventory/tx-inventory').get()).data()?.stock).toBe(1);
      expect((await db.doc(`transaction_audit/tx-staff-${prefix}-${winner}`).get()).exists).toBe(true);
    } finally { await db.terminate(); await deleteApp(app); }
  }, 30000);
});
