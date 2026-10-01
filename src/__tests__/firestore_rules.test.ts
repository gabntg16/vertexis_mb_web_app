import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, describe, it } from 'vitest';
import { initializeTestEnvironment, assertFails, assertSucceeds, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, documentId, getDoc, setDoc, updateDoc, collection, getDocs, query, where, or, writeBatch } from 'firebase/firestore';

const enabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
describe.skipIf(!enabled)('Firestore rules in a local emulator', () => {
  let env: RulesTestEnvironment;
  beforeAll(async () => {
    env = await initializeTestEnvironment({ projectId: 'demo-vertexis-audit', firestore: { rules: readFileSync('firestore.rules', 'utf8') } });
    await env.withSecurityRulesDisabled(async context => {
      const db = context.firestore();
      const seed: Record<string, unknown> = {
        'users/admin': { role: 'admin', isActive: true },
        'users/staff': { role: 'branch', branchId: 'b1', isActive: true },
        'users/manager': { role: 'branch', branchId: 'b1', isActive: true },
        'users/other': { role: 'branch', branchId: 'b2', isActive: true },
        'users/disabled': { role: 'branch', branchId: 'b1', isActive: false },
        'branch_accounts/staff': { branchId: 'b1', role: 'Staff', isActive: true },
        'branch_accounts/manager': { branchId: 'b1', role: 'Branch Manager', isActive: true },
        'branch_accounts/other': { branchId: 'b2', role: 'Branch Manager', isActive: true },
        'branch_accounts/disabled': { branchId: 'b1', role: 'Staff', isActive: true },
        'branches/b1': { id: 'b1', status: 'active' }, 'branches/b2': { id: 'b2', status: 'active' },
        'orders/o1': { id: 'o1', branchId: 'b1', status: 'pending' }, 'orders/o2': { id: 'o2', branchId: 'b2', status: 'approved' },
        'inventory/i1': { branchId: 'b1', productId: 'p1', stock: 10 },
        'daily_shift_logs/log1': { branchId: 'b1', status: 'DRAFT' },
        'payment_proofs/o1': { branchId: 'b1', dataUrl: 'private' },
        'announcements/global': { scope: 'nationwide', title: 'Notice', message: 'All branches' },
        'announcements/own': { scope: 'branch', targetBranchId: 'b1', title: 'Own', message: 'Branch 1' },
        'announcements/other': { scope: 'branch', targetBranchId: 'b2', title: 'Other', message: 'Branch 2' },
        'products/p1': { id: 'p1', name: 'Marshmallow', price: 100, adminStock: 10 },
      };
      for (const [path, value] of Object.entries(seed)) await setDoc(doc(db, path), value);
    });
  }, 30000);
  afterAll(async () => { await env?.cleanup(); });
  const branch = (uid = 'staff', branchId = 'b1') => env.authenticatedContext(uid, { role: 'branch', branchId }).firestore();
  it('saves a pending application and scoped compliance documents atomically', async () => {
    const db = env.authenticatedContext('admin', { role: 'admin' }).firestore();
    const document = { id: 'doc-application', applicationId: 'app-new', branchId: 'app-new', title: 'Permit', fileUrl: 'data:application/pdf;base64,AA==' };
    await assertFails(setDoc(doc(db, 'branch_documents/unscoped'), { title: 'Permit' }));
    const batch = writeBatch(db);
    batch.set(doc(db, 'branch_applications/app-new'), { id: 'app-new', branchName: 'New Store', status: 'Pending Review', documents: [document] });
    batch.set(doc(db, 'branch_documents/doc-application'), document);
    batch.set(doc(db, 'branch_audit_logs/application-audit'), { branchId: 'app-new', action: 'Application Submitted' });
    await assertSucceeds(batch.commit());
    await assertSucceeds(getDoc(doc(db, 'branch_documents/doc-application')));
    await assertFails(getDoc(doc(branch('manager'), 'branch_documents/doc-application')));
  });
  it('denies anonymous and inactive-account reads', async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'orders/o1')));
    await assertFails(getDoc(doc(branch('disabled'), 'orders/o1')));
  });
  it('allows scoped queries and blocks other branches and unscoped queries', async () => {
    await assertSucceeds(getDocs(query(collection(branch(), 'orders'), where('branchId', '==', 'b1'))));
    await assertFails(getDoc(doc(branch(), 'orders/o2')));
    await assertFails(getDocs(collection(branch(), 'orders')));
    await assertSucceeds(getDoc(doc(branch('other', 'b2'), 'orders/o2')));
  });
  it('allows the exact realtime shift-log query only for the account branch', async () => {
    const manager = branch('manager');
    await assertSucceeds(getDocs(query(collection(manager, 'daily_shift_logs'), where('branchId', '==', 'b1'))));
    await assertFails(getDocs(collection(manager, 'daily_shift_logs')));
    await assertFails(getDocs(query(collection(manager, 'daily_shift_logs'), where('branchId', '==', 'b2'))));
  });
  it('allows the manager branch document query and rejects data-field and cross-branch queries', async () => {
    const db = branch('manager');
    await assertSucceeds(getDocs(query(collection(db, 'branches'), where(documentId(), '==', 'b1'))));
    await assertFails(getDocs(query(collection(db, 'branches'), where('id', '==', 'b1'))));
    await assertFails(getDocs(query(collection(db, 'branches'), where(documentId(), '==', 'b2'))));
  });
  it('blocks direct financial, stock, production and receiving mutations for every role', async () => {
    const admin = env.authenticatedContext('admin', { role: 'admin' }).firestore();
    for (const db of [branch(), branch('manager'), admin]) {
      await assertFails(updateDoc(doc(db, 'orders/o1'), { paymentStatus: 'SUCCESSFUL', totalAmount: 1 }));
      await assertFails(updateDoc(doc(db, 'inventory/i1'), { stock: -1 }));
      for (const name of ['sales', 'inventoryMovements', 'inbound_receipts', 'payment_proofs', 'production_batches', 'transaction_requests', 'transaction_audit', 'daily_shift_logs']) await assertFails(setDoc(doc(db, `${name}/forged`), { branchId: 'b1', status: 'approved' }));
    }
  });
  it('keeps roles immutable and prevents branch price changes', async () => {
    await assertFails(updateDoc(doc(branch(), 'users/staff'), { role: 'admin' }));
    await assertFails(updateDoc(doc(branch(), 'branch_accounts/staff'), { role: 'Branch Manager' }));
    await assertFails(updateDoc(doc(branch(), 'products/p1'), { price: 1 }));
  });
  it('keeps payment proof bytes callable-only', async () => {
    for (const db of [branch('manager'), env.authenticatedContext('admin', { role: 'admin' }).firestore()]) await assertFails(getDoc(doc(db, 'payment_proofs/o1')));
  });
  it('supports the actual scoped notification query without disclosing other branches', async () => {
    const db = branch();
    const result = await assertSucceeds(getDocs(query(collection(db, 'announcements'), or(where('scope', 'in', ['nationwide', 'global']), where('targetBranchId', '==', 'b1')))));
    if (result.size !== 2) throw new Error('Incorrect notification scope');
    await assertFails(getDoc(doc(db, 'announcements/other')));
  });
});
