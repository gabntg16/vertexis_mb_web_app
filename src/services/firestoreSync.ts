import { subscribeWithRecovery } from './syncSubscription';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  documentId,
  getDocs,
  writeBatch,
  runTransaction,
  serverTimestamp,
  query,
  or,
  where,
  Query,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import type { InboundReceipt } from '../../functions/src/inboundReceivingModel';
import {
  UserModel,
  DailyShiftLog,
  Branch,
  Product,
  Order,
  Delivery,
  Receiving,
  InventoryItem,
  Sale,
  Announcement,
  CalendarEvent,
  ProductionBatch,
  BranchDocument,
  BranchApplication,
  BranchAccount,
  BranchStatusHistory,
  BranchAuditLog,
  BIRReceipt,
  InventoryMovementRecord,
  POSAuditLog,
  ShiftClosingRecord,
  SpoilageRecord,
  PhysicalInventoryAudit,
} from '../types';

export type SyncStatus = 'local' | 'connected' | 'syncing' | 'offline' | 'error';

export interface SyncState {
  status: SyncStatus;
  lastSyncedAt: Date | null;
  error?: string;
}

export type SyncScope =
  | { role: 'admin' }
  | { role: 'branch'; branchId: string; userId: string };

const GLOBAL_COLLECTIONS = new Set(['products']);
const BRANCH_SCOPED_COLLECTIONS = new Set([
  'branch_documents',
  'branch_accounts',
  'branch_status_history',
  'branch_audit_logs',
  'orders',
  'deliveries',
  'receivings',
  'inbound_receipts',
  'daily_shift_logs',
  'inventory',
  'sales',
  'production_batches',
  'birReceipts',
  'inventoryMovements',
  'posAuditLogs',
  'shiftClosings',
  'spoilage_records',
  'physical_audits',
]);

export class FirestoreSyncService {
  private static instance: FirestoreSyncService;
  private unsubscribers: (() => void)[] = [];
  private syncListeners: ((state: SyncState) => void)[] = [];
  private state: SyncState = {
    status: 'offline',
    lastSyncedAt: null,
  };

  private failures = new Map<string, string>();
  private listenerStates = new Map<string, SyncStatus>();

  private reportListeners() {
    const states = [...this.listenerStates.values()];
    const error = [...this.failures.values()][0];
    const status: SyncStatus = error ? 'error' : states.includes('offline') ? 'offline'
      : states.includes('syncing') ? 'syncing' : 'connected';
    this.updateState({ status, error, ...(status === 'connected' ? { lastSyncedAt: new Date() } : {}) });
  }

  private processedRequestKeys = new Set<string>();

  private constructor() {}

  public static getInstance(): FirestoreSyncService {
    if (!FirestoreSyncService.instance) {
      FirestoreSyncService.instance = new FirestoreSyncService();
    }
    return FirestoreSyncService.instance;
  }

  /**
   * Check if a request ID was already committed through the firestore sync layer
   */
  public isRequestIdProcessed(requestId: string): boolean {
    if (!requestId) return false;
    return this.processedRequestKeys.has(requestId);
  }

  /**
   * Register processed request ID
   */
  public registerProcessedRequestId(requestId: string): void {
    if (!requestId) return;
    this.processedRequestKeys.add(requestId);
  }

  public onSyncStateChange(cb: (state: SyncState) => void): () => void {
    this.syncListeners.push(cb);
    cb(this.state);
    return () => {
      this.syncListeners = this.syncListeners.filter((l) => l !== cb);
    };
  }

  private updateState(newState: Partial<SyncState>) {
    if (newState.status === 'connected' && !this.failures.size) {
      const states = [...this.listenerStates.values()];
      if (states.includes('offline')) newState = { ...newState, status: 'offline' };
      else if (states.includes('syncing')) newState = { ...newState, status: 'syncing' };
    }
    if (newState.status === 'connected' && this.failures.size) newState = { ...newState, status: 'error', error: [...this.failures.values()][0] };
    this.state = { ...this.state, ...newState };
    if (newState.status === 'connected') this.state.error = undefined;
    this.syncListeners.forEach((cb) => cb(this.state));
  }

  // Subscribe to all collections in Firestore
  public subscribeAll(callbacks: {
    onUsers?: (users: UserModel[]) => void;
    onBranches?: (branches: Branch[]) => void;
    onProducts?: (products: Product[]) => void;
    onOrders?: (orders: Order[]) => void;
    onDeliveries?: (deliveries: Delivery[]) => void;
    onReceivings?: (receivings: Receiving[]) => void;
    onDailyShiftLogs?: (logs: DailyShiftLog[]) => void;
    onInboundReceipts?: (receipts: InboundReceipt[]) => void;
    onInventory?: (inventory: InventoryItem[]) => void;
    onSales?: (sales: Sale[]) => void;
    onAnnouncements?: (announcements: Announcement[]) => void;
    onEvents?: (events: CalendarEvent[]) => void;
    onProductionBatches?: (batches: ProductionBatch[]) => void;
    onBranchApplications?: (applications: BranchApplication[]) => void;
    onBranchDocuments?: (documents: BranchDocument[]) => void;
    onBranchAccounts?: (accounts: BranchAccount[]) => void;
    onBranchStatusHistory?: (history: BranchStatusHistory[]) => void;
    onBranchAuditLogs?: (logs: BranchAuditLog[]) => void;
    onBirReceipts?: (receipts: BIRReceipt[]) => void;
    onInventoryMovements?: (movements: InventoryMovementRecord[]) => void;
    onPosAuditLogs?: (logs: POSAuditLog[]) => void;
    onShiftClosings?: (closings: ShiftClosingRecord[]) => void;
    onSpoilageRecords?: (records: SpoilageRecord[]) => void;
    onPhysicalAudits?: (audits: PhysicalInventoryAudit[]) => void;
  }, scope: SyncScope): () => void {
    this.cleanup();
    if (!isFirebaseConfigured) {
      this.updateState({ status: 'local', error: undefined });
      return () => {};
    }
    this.updateState({ status: 'syncing', error: undefined });

    // Live order and approval updates require standard realtime listeners.
    const scopedCollection = (name: string): Query => {
      const ref = collection(db, name);
      if (scope.role === 'admin' || GLOBAL_COLLECTIONS.has(name)) return ref;
      if (name === 'announcements') return query(ref, or(where('scope', 'in', ['nationwide', 'global']), where('targetBranchId', '==', scope.branchId)));
      if (name === 'events') return query(ref, where('branchId', 'in', ['ALL', scope.branchId]));
      // Rules authorize the document path, not the optional data.id field.
      if (name === 'branches') return query(ref, where(documentId(), '==', scope.branchId));
      if (BRANCH_SCOPED_COLLECTIONS.has(name)) return query(ref, where('branchId', '==', scope.branchId));
      return ref;
    };

    const subscribe = <T,>(name: string, callback?: (rows: T[]) => void) => {
      if (!callback) return;
      this.listenerStates.set(name, 'syncing');
      const unsubscribe = subscribeWithRecovery(scopedCollection(name), {
        next: snapshot => {
          callback(snapshot.docs.map(document => ({ ...document.data(), id: document.id }) as T));
          this.failures.delete(`listen:${name}`);
          this.listenerStates.set(name, snapshot.metadata.fromCache ? 'offline' : 'connected');
          this.reportListeners();
        },
        error: (error, retrying) => {
          this.listenerStates.set(name, retrying ? 'offline' : 'error');
          if (!retrying) this.failures.set(`listen:${name}`, `${name}: ${error.message} (${error.code})`);
          this.reportListeners();
        },
      });
      this.unsubscribers.push(unsubscribe);
    };

    subscribe('branches', callbacks.onBranches);
    subscribe('products', callbacks.onProducts);
    subscribe('orders', callbacks.onOrders);
    subscribe('deliveries', callbacks.onDeliveries);
    subscribe('receivings', callbacks.onReceivings);
    subscribe('inbound_receipts', callbacks.onInboundReceipts);
    subscribe('daily_shift_logs', callbacks.onDailyShiftLogs);
    subscribe('inventory', callbacks.onInventory);
    subscribe('sales', callbacks.onSales);
    subscribe('announcements', callbacks.onAnnouncements);
    subscribe('events', callbacks.onEvents);
    subscribe('branch_documents', callbacks.onBranchDocuments);
    subscribe('branch_accounts', callbacks.onBranchAccounts);
    subscribe('branch_status_history', callbacks.onBranchStatusHistory);
    subscribe('branch_audit_logs', callbacks.onBranchAuditLogs);
    subscribe('birReceipts', callbacks.onBirReceipts);
    subscribe('inventoryMovements', callbacks.onInventoryMovements);
    subscribe('posAuditLogs', callbacks.onPosAuditLogs);
    subscribe('shiftClosings', callbacks.onShiftClosings);
    subscribe('spoilage_records', callbacks.onSpoilageRecords);
    subscribe('physical_audits', callbacks.onPhysicalAudits);
    if (scope.role === 'admin') {
      subscribe('users', callbacks.onUsers);
      subscribe('branch_applications', callbacks.onBranchApplications);
      subscribe('production_batches', callbacks.onProductionBatches);
    }
    return () => this.cleanup();
  }
  public async prepareBranchForApproval(branch: Branch): Promise<void> {
    if (!isFirebaseConfigured) return;
    await runTransaction(db, async transaction => {
      const ref = doc(db, 'branches', branch.id);
      const existing = await transaction.get(ref);
      if (existing.exists()) {
        if (existing.data().applicationId !== branch.applicationId) {
          throw new Error('This branch ID is already used by another application.');
        }
        return;
      }
      transaction.set(ref, sanitizeForFirestore({ ...branch, status: 'Pending Activation' }));
    });
  }

  public async saveApprovalRecords(records: { collection: string; id: string; data: unknown }[]): Promise<void> {
    if (!isFirebaseConfigured) return;
    const batch = writeBatch(db);
    for (const record of records) batch.set(doc(db, record.collection, record.id), sanitizeForFirestore(record.data) as Record<string, unknown>, { merge: true });
    await batch.commit();
    this.updateState({ status: 'connected', lastSyncedAt: new Date() });
  }

  // Applications must not appear submitted if any compliance document fails.
  public async saveBranchApplication(application: BranchApplication, audit: BranchAuditLog): Promise<void> {
    const sanitized = sanitizeForFirestore(application);
    // Embedded receipts are duplicated in the application for the review screen.
    // Leave room below Firestore's 1 MiB limit for field names and metadata.
    if (new TextEncoder().encode(JSON.stringify(sanitized)).byteLength > 900000) {
      throw new Error('The combined application documents are too large. Compress the uploads to less than 650 KB total and try again.');
    }
    if (!isFirebaseConfigured) return;
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'branch_applications', application.id), sanitized);
      for (const document of application.documents) {
        if (document.applicationId !== application.id || document.branchId !== application.id) {
          throw new Error('Application documents must be linked to the pending application.');
        }
        batch.set(doc(db, 'branch_documents', document.id), sanitizeForFirestore(document));
      }
      batch.set(doc(db, 'branch_audit_logs', audit.id), sanitizeForFirestore(audit));
      await batch.commit();
      this.updateState({ status: 'connected', lastSyncedAt: new Date() });
    } catch (error) {
      // The form owns this failure and keeps the draft available for retry.
      throw new Error(describeWriteError('Branch application', error));
    }
  }

  // Generic Save Document to Firestore
  public async saveDoc(collectionName: string, id: string, data: any): Promise<void> {
    if (data?.clientRequestId) {
      this.processedRequestKeys.add(data.clientRequestId);
    }
    if (data?.idempotencyKey) {
      this.processedRequestKeys.add(data.idempotencyKey);
    }
    if (!isFirebaseConfigured) {
      return;
    }
    try {
      const sanitized = sanitizeForFirestore(data);
      const ref = doc(db, collectionName, id);
      await setDoc(ref, { ...sanitized, updatedAt: serverTimestamp() }, { merge: true });
      this.failures.delete(`${collectionName}/${id}`);
      this.updateState({ status: 'connected', lastSyncedAt: new Date() });
    } catch (err: unknown) {
      const message = describeWriteError(`${collectionName}/${id}`, err);
      this.failures.set(`${collectionName}/${id}`, message);
      this.updateState({ status: 'error', error: message });
      // Legacy nontransactional screens receive a persistent sync error.
      // Financial and inventory commands use the callable API and propagate errors.
    }
  }

  // Generic Delete Document
  public async removeDoc(collectionName: string, id: string): Promise<void> {
    if (!isFirebaseConfigured) {
      return;
    }
    try {
      const ref = doc(db, collectionName, id);
      await deleteDoc(ref);
      this.failures.delete(`${collectionName}/${id}`);
      this.updateState({ status: 'connected', lastSyncedAt: new Date() });
    } catch (err: unknown) {
      const message = describeWriteError(`${collectionName}/${id}`, err);
      this.failures.set(`${collectionName}/${id}`, message);
      this.updateState({ status: 'error', error: message });
      // Keep the error visible; do not present this as a successful cloud save.
    }
  }

  // Seed initial dataset if database is brand new
  public async seedInitialDatasetIfEmpty(initialData: {
    branches: Branch[];
    products: Product[];
    orders: Order[];
    deliveries: Delivery[];
    receivings: Receiving[];
    inventory: InventoryItem[];
    sales: Sale[];
    announcements: Announcement[];
    events: CalendarEvent[];
    productionBatches?: ProductionBatch[];
    branchApplications?: BranchApplication[];
    branchDocuments?: BranchDocument[];
    branchAccounts?: BranchAccount[];
    branchStatusHistory?: BranchStatusHistory[];
    branchAuditLogs?: BranchAuditLog[];
  }): Promise<void> {
    if (!isFirebaseConfigured) {
      return;
    }
    try {
      const branchesSnap = await getDocs(collection(db, 'branches'));
      if (!branchesSnap.empty) {
        console.log('[Firestore] Database already seeded with branches.');
        return;
      }

      console.log('[Firestore] Seeding initial dataset into Firestore...');
      this.updateState({ status: 'syncing' });

      // Batch 1: Branches & Products & Users & Announcements & Events & Batches
      const batch1 = writeBatch(db);
      initialData.branches.forEach((b) => batch1.set(doc(db, 'branches', b.id), sanitizeForFirestore(b)));
      initialData.products.forEach((p) => batch1.set(doc(db, 'products', p.id), sanitizeForFirestore(p)));
      initialData.announcements.forEach((a) => batch1.set(doc(db, 'announcements', a.id), sanitizeForFirestore(a)));
      initialData.events.forEach((e) => batch1.set(doc(db, 'events', e.id), sanitizeForFirestore(e)));
      if (initialData.productionBatches) {
        initialData.productionBatches.forEach((pb) => batch1.set(doc(db, 'production_batches', pb.id), sanitizeForFirestore(pb)));
      }
      initialData.branchApplications?.forEach((application) =>
        batch1.set(doc(db, 'branch_applications', application.id), sanitizeForFirestore(application))
      );
      initialData.branchDocuments?.forEach((document) =>
        batch1.set(doc(db, 'branch_documents', document.id), sanitizeForFirestore(document))
      );
      initialData.branchAccounts?.forEach((account) =>
        batch1.set(doc(db, 'branch_accounts', account.id), sanitizeForFirestore(account))
      );
      initialData.branchStatusHistory?.forEach((history) =>
        batch1.set(doc(db, 'branch_status_history', history.id), sanitizeForFirestore(history))
      );
      initialData.branchAuditLogs?.forEach((log) =>
        batch1.set(doc(db, 'branch_audit_logs', log.id), sanitizeForFirestore(log))
      );
      await batch1.commit();

      // Batch 2: Orders, Deliveries, Receivings
      const batch2 = writeBatch(db);
      initialData.orders.forEach((o) => batch2.set(doc(db, 'orders', o.id), sanitizeForFirestore(o)));
      initialData.deliveries.forEach((d) => batch2.set(doc(db, 'deliveries', d.id), sanitizeForFirestore(d)));
      initialData.receivings.forEach((r) => batch2.set(doc(db, 'receivings', r.id), sanitizeForFirestore(r)));
      await batch2.commit();

      // Batch 3: Inventory (chunked to 400 items per batch)
      const invChunks = chunkArray(initialData.inventory, 400);
      for (const chunk of invChunks) {
        const invBatch = writeBatch(db);
        chunk.forEach((item) => invBatch.set(doc(db, 'inventory', item.id), sanitizeForFirestore(item)));
        await invBatch.commit();
      }

      // Batch 4: Sales
      const salesChunks = chunkArray(initialData.sales, 400);
      for (const chunk of salesChunks) {
        const salesBatch = writeBatch(db);
        chunk.forEach((s) => salesBatch.set(doc(db, 'sales', s.id), sanitizeForFirestore(s)));
        await salesBatch.commit();
      }

      // Record system sync
      await setDoc(doc(db, 'system_sync', 'status'), {
        lastUpdated: new Date().toISOString(),
        version: 1,
        initialSeedComplete: true,
      });

      this.updateState({ status: 'connected', lastSyncedAt: new Date() });
      console.log('[Firestore] Initial dataset seed complete!');
    } catch (err: any) {
      console.error('[Firestore] Seeding error:', err);
      this.updateState({ status: 'offline', error: err.message });
    }
  }

  public cleanup(clearSession = false) {
    this.unsubscribers.forEach((u) => u());
    this.unsubscribers = [];
    this.listenerStates.clear();
    for (const key of this.failures.keys()) {
      if (key.startsWith('listen:')) this.failures.delete(key);
    }
    if (clearSession) {
      this.failures.clear();
      this.processedRequestKeys.clear();
    }
  }
}

export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) {
    return null as any;
  }
  if (data === null || typeof data !== 'object') {
    return data;
  }
  if (data instanceof Date) {
    return data as any;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as any;
  }
  // Preserve SDK values (Timestamp, GeoPoint, references and field transforms).
  const prototype = Object.getPrototypeOf(data);
  if (prototype !== Object.prototype && prototype !== null) return data;
  const cleanObj: Record<string, any> = {};
  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    if (value !== undefined) {
      cleanObj[key] = sanitizeForFirestore(value);
    }
  }
  return cleanObj as T;
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

export const firestoreSync = FirestoreSyncService.getInstance();

function describeWriteError(label: string, error: unknown): string {
  const code = (error as { code?: string } | null)?.code || 'unknown';
  const reason = code === 'permission-denied'
    ? 'Your account or the submitted data does not meet the cloud access rules.'
    : code === 'unauthenticated'
    ? 'Your session expired. Sign in again.'
    : error instanceof Error ? error.message : 'Check your connection and try again.';
  return `${label} was not saved (${code}). ${reason}`;
}
