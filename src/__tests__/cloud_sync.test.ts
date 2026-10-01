import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { collection, documentId, onSnapshot, query, queryEqual, where, writeBatch, runTransaction, Timestamp, GeoPoint, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { firestoreSync, sanitizeForFirestore } from '../services/firestoreSync';
import type { Branch, BranchApplication, BranchAuditLog } from '../types';
import { subscribeWithRecovery } from '../services/syncSubscription';

vi.mock('../lib/firebase', async () => {
  const { initializeApp } = await import('firebase/app');
  const { getFirestore } = await import('firebase/firestore');
  return { db: getFirestore(initializeApp({ projectId: 'demo-sync-test' }, 'sync-test')), isFirebaseConfigured: true };
});
vi.mock('firebase/firestore', async importOriginal => ({
  ...await importOriginal<typeof import('firebase/firestore')>(), onSnapshot: vi.fn(), writeBatch: vi.fn(), runTransaction: vi.fn(),
}));

const listeners: Array<{ target: any; next: (snapshot: any) => void; error: (error: any) => void; stop: ReturnType<typeof vi.fn> }> = [];
const snapshot = (fromCache: boolean) => ({ docs: [{ id: 'b1', data: () => ({ name: 'Branch 1' }) }], metadata: { fromCache } });
beforeEach(() => {
  vi.useFakeTimers();
  listeners.length = 0;
  vi.mocked(onSnapshot).mockImplementation(((target: any, options: any, next: any, error: any) => {
    expect(options.includeMetadataChanges).toBe(true);
    const stop = vi.fn();
    listeners.push({ target, next, error, stop });
    return stop;
  }) as any);
});
afterEach(() => { firestoreSync.cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.clearAllMocks(); });

describe('Cloud sync recovery and manager branch access', () => {
  it('queries the authorized branch document ID and supplies its ID to the order screen', () => {
    const received = vi.fn();
    firestoreSync.subscribeAll({ onBranches: received }, { role: 'branch', branchId: 'b1', userId: 'manager' });
    expect(queryEqual(listeners[0].target, query(collection(db, 'branches'), where(documentId(), '==', 'b1')))).toBe(true);
    listeners[0].next(snapshot(false));
    expect(received).toHaveBeenCalledWith([{ id: 'b1', name: 'Branch 1' }]);
  });

  it('waits for all server snapshots and recovers from cached snapshots without a click', () => {
    const states: string[] = [];
    const stop = firestoreSync.onSyncStateChange(state => states.push(state.status));
    firestoreSync.subscribeAll({ onBranches: vi.fn(), onOrders: vi.fn() }, { role: 'admin' });
    listeners[0].next(snapshot(false));
    expect(states.at(-1)).toBe('syncing');
    listeners[1].next(snapshot(true));
    expect(states.at(-1)).toBe('offline');
    listeners[1].next(snapshot(false));
    expect(states.at(-1)).toBe('connected');
    stop();
  });

  it('automatically reattaches a terminated transient listener', () => {
    const stop = subscribeWithRecovery(collection(db, 'orders'), { next: vi.fn(), error: vi.fn() });
    listeners[0].error({ code: 'unavailable', message: 'Temporary outage' });
    vi.advanceTimersByTime(1000);
    expect(listeners).toHaveLength(2);
    expect(listeners[0].stop).toHaveBeenCalled();
    stop();
  });

  it('keeps a permission failure visible even when another collection succeeds', () => {
    let state: any;
    const stop = firestoreSync.onSyncStateChange(value => { state = value; });
    firestoreSync.subscribeAll({ onBranches: vi.fn(), onOrders: vi.fn() }, { role: 'admin' });
    listeners[1].error({ code: 'permission-denied', message: 'Access denied' });
    listeners[0].next(snapshot(false));
    expect(state.status).toBe('error');
    expect(state.error).toContain('orders: Access denied (permission-denied)');
    vi.advanceTimersByTime(60000);
    expect(listeners).toHaveLength(2);
    stop();
  });

  it('cancels recovery when the session ends', () => {
    const next = vi.fn();
    const stop = subscribeWithRecovery(collection(db, 'orders'), { next, error: vi.fn() });
    listeners[0].error({ code: 'unavailable', message: 'Temporary outage' });
    stop();
    vi.advanceTimersByTime(60000);
    listeners[0].next(snapshot(false));
    expect(listeners).toHaveLength(1);
    expect(next).not.toHaveBeenCalled();
  });
});


describe('Branch application cloud submission', () => {
  const application = {
    id: 'app-test', branchName: 'Test Branch',
    documents: [{ id: 'doc-test', applicationId: 'app-test', branchId: 'app-test', fileUrl: 'data:application/pdf;base64,AA==' }],
  } as BranchApplication;
  const audit = { id: 'audit-test', branchId: 'app-test', action: 'Application Submitted' } as BranchAuditLog;

  it('commits the application, linked documents and audit together and waits for acknowledgment', async () => {
    let acknowledge!: () => void;
    const commit = vi.fn(() => new Promise<void>(resolve => { acknowledge = resolve; }));
    const set = vi.fn();
    vi.mocked(writeBatch).mockReturnValue({ set, commit } as unknown as ReturnType<typeof writeBatch>);
    let completed = false;
    const saving = firestoreSync.saveBranchApplication(application, audit).then(() => { completed = true; });
    expect(set.mock.calls.map(call => call[0].path)).toEqual(['branch_applications/app-test', 'branch_documents/doc-test', 'branch_audit_logs/audit-test']);
    expect(set.mock.calls[1][1]).toMatchObject({ applicationId: 'app-test', branchId: 'app-test' });
    await Promise.resolve();
    expect(completed).toBe(false);
    acknowledge();
    await saving;
    expect(completed).toBe(true);
    expect(commit).toHaveBeenCalledOnce();
  });

  it('propagates a denied write to the form and allows retry', async () => {
    const commit = vi.fn().mockRejectedValueOnce({ code: 'permission-denied' }).mockResolvedValue(undefined);
    vi.mocked(writeBatch).mockReturnValue({ set: vi.fn(), commit } as unknown as ReturnType<typeof writeBatch>);
    await expect(firestoreSync.saveBranchApplication(application, audit)).rejects.toThrow('permission-denied');
    await expect(firestoreSync.saveBranchApplication(application, audit)).resolves.toBeUndefined();
  });

  it('rejects oversized embedded files before sending writes', async () => {
    const oversized = { ...application, documents: [{ ...application.documents[0], fileUrl: 'a'.repeat(900001) }] };
    await expect(firestoreSync.saveBranchApplication(oversized, audit)).rejects.toThrow('too large');
    expect(writeBatch).not.toHaveBeenCalled();
  });

  it('does not commit documents missing their application scope', async () => {
    const commit = vi.fn();
    vi.mocked(writeBatch).mockReturnValue({ set: vi.fn(), commit } as unknown as ReturnType<typeof writeBatch>);
    await expect(firestoreSync.saveBranchApplication({ ...application, documents: [{ ...application.documents[0], branchId: undefined }] }, audit)).rejects.toThrow('linked');
    expect(commit).not.toHaveBeenCalled();
  });

  it('preserves Firestore values when sanitizing records read from the cloud', () => {
    const values = { timestamp: Timestamp.now(), point: new GeoPoint(1, 2), reference: doc(db, 'products/p1'), transform: serverTimestamp() };
    const clean = sanitizeForFirestore({ ...values, missing: undefined, nested: { missing: undefined, kept: 'yes' } });
    for (const key of Object.keys(values) as Array<keyof typeof values>) expect(clean[key]).toBe(values[key]);
    expect(clean).not.toHaveProperty('missing');
    expect(clean.nested).toEqual({ kept: 'yes' });
  });
});


describe('Branch approval persistence order', () => {
  const branch = { id: 'b-new', applicationId: 'app-new', name: 'New Branch', status: 'Active' } as Branch;
  it('awaits a committed pending branch before provisioning can proceed', async () => {
    const set = vi.fn();
    let confirm!: () => void;
    vi.mocked(runTransaction).mockImplementation((async (_db: unknown, callback: (tx: unknown) => Promise<void>) => {
      await callback({ get: async () => ({ exists: () => false }), set });
      await new Promise<void>(resolve => { confirm = resolve; });
    }) as typeof runTransaction);
    let done = false;
    const pending = firestoreSync.prepareBranchForApproval(branch).then(() => { done = true; });
    await vi.waitFor(() => expect(set).toHaveBeenCalled());
    expect(set.mock.calls[0][1]).toMatchObject({ status: 'Pending Activation', applicationId: 'app-new' });
    expect(done).toBe(false);
    confirm();
    await pending;
    expect(done).toBe(true);
  });
  it('resumes its own branch but refuses to overwrite another application', async () => {
    const set = vi.fn();
    let applicationId = 'app-new';
    vi.mocked(runTransaction).mockImplementation((async (_db: unknown, callback: (tx: unknown) => Promise<void>) => {
      await callback({ get: async () => ({ exists: () => true, data: () => ({ applicationId }) }), set });
    }) as typeof runTransaction);
    await firestoreSync.prepareBranchForApproval(branch);
    expect(set).not.toHaveBeenCalled();
    applicationId = 'app-other';
    await expect(firestoreSync.prepareBranchForApproval(branch)).rejects.toThrow('another application');
  });
  it('propagates final approval write failures instead of reporting success', async () => {
    vi.mocked(writeBatch).mockReturnValue({ set: vi.fn(), commit: vi.fn().mockRejectedValue(new Error('Access denied')) } as unknown as ReturnType<typeof writeBatch>);
    await expect(firestoreSync.saveApprovalRecords([{ collection: 'branches', id: branch.id, data: branch }])).rejects.toThrow('Access denied');
  });
});
