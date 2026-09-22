import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  serverTimestamp,
  query,
  where,
  Query,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  UserModel,
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

export type SyncStatus = 'connected' | 'syncing' | 'offline' | 'error';

export interface SyncState {
  status: SyncStatus;
  lastSyncedAt: Date | null;
  error?: string;
}

export type SyncScope =
  | { role: 'admin' }
  | { role: 'branch'; branchId: string; userId: string };

const GLOBAL_COLLECTIONS = new Set(['products', 'announcements', 'events']);
const BRANCH_SCOPED_COLLECTIONS = new Set([
  'branch_documents',
  'branch_accounts',
  'branch_status_history',
  'branch_audit_logs',
  'orders',
  'deliveries',
  'receivings',
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
    status: 'syncing',
    lastSyncedAt: null,
  };

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
    this.state = { ...this.state, ...newState };
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
    this.updateState({ status: 'syncing' });

    const scopedCollection = (collectionName: string): Query => {
      const ref = collection(db, collectionName);
      if (scope.role === 'admin' || GLOBAL_COLLECTIONS.has(collectionName)) return ref;
      if (collectionName === 'branches') return query(ref, where('id', '==', scope.branchId));
      if (BRANCH_SCOPED_COLLECTIONS.has(collectionName)) {
        return query(ref, where('branchId', '==', scope.branchId));
      }
      return ref;
    };

    const branchOnly = scope.role === 'branch';

    try {
      // 1. Branches
      if (callbacks.onBranches) {
        const unsub = onSnapshot(
          scopedCollection('branches'),
          (snap) => {
            const data: Branch[] = snap.docs.map((d) => d.data() as Branch);
            callbacks.onBranches!(data);
            this.updateState({ status: 'connected', lastSyncedAt: new Date() });
          },
          (err) => {
            console.warn('[Firestore] Branches snapshot error:', err);
            this.updateState({ status: 'offline', error: err.message });
          }
        );
        this.unsubscribers.push(unsub);
      }

      // 1b. Branch Applications
      if (callbacks.onBranchApplications && scope.role === 'admin') {
        const unsub = onSnapshot(
          scopedCollection('branch_applications'),
          (snap) => {
            const data: BranchApplication[] = snap.docs.map((d) => d.data() as BranchApplication);
            callbacks.onBranchApplications!(data);
          },
          (err) => console.warn('[Firestore] Branch Applications snapshot error:', err)
        );
        this.unsubscribers.push(unsub);
      }

      // 1c. Branch Documents
      if (callbacks.onBranchDocuments && (scope.role === 'admin' || branchOnly)) {
        const unsub = onSnapshot(
          scopedCollection('branch_documents'),
          (snap) => {
            const data: BranchDocument[] = snap.docs.map((d) => d.data() as BranchDocument);
            callbacks.onBranchDocuments!(data);
          },
          (err) => console.warn('[Firestore] Branch Documents snapshot error:', err)
        );
        this.unsubscribers.push(unsub);
      }

      // 1d. Branch Accounts
      if (callbacks.onBranchAccounts && (scope.role === 'admin' || branchOnly)) {
        const unsub = onSnapshot(
          scopedCollection('branch_accounts'),
          (snap) => {
            const data: BranchAccount[] = snap.docs.map((d) => d.data() as BranchAccount);
            callbacks.onBranchAccounts!(data);
          },
          (err) => console.warn('[Firestore] Branch Accounts snapshot error:', err)
        );
        this.unsubscribers.push(unsub);
      }

      // 1e. Branch Status History
      if (callbacks.onBranchStatusHistory && (scope.role === 'admin' || branchOnly)) {
        const unsub = onSnapshot(
          scopedCollection('branch_status_history'),
          (snap) => {
            const data: BranchStatusHistory[] = snap.docs.map((d) => d.data() as BranchStatusHistory);
            callbacks.onBranchStatusHistory!(data);
          },
          (err) => console.warn('[Firestore] Branch Status History snapshot error:', err)
        );
        this.unsubscribers.push(unsub);
      }

      // 1f. Branch Audit Logs
      if (callbacks.onBranchAuditLogs && (scope.role === 'admin' || branchOnly)) {
        const unsub = onSnapshot(
          scopedCollection('branch_audit_logs'),
          (snap) => {
            const data: BranchAuditLog[] = snap.docs.map((d) => d.data() as BranchAuditLog);
            callbacks.onBranchAuditLogs!(data);
          },
          (err) => console.warn('[Firestore] Branch Audit Logs snapshot error:', err)
        );
        this.unsubscribers.push(unsub);
      }

      // 2. Users
      if (callbacks.onUsers && scope.role === 'admin') {
        const unsub = onSnapshot(
          scopedCollection('users'),
          (snap) => {
            const data: UserModel[] = snap.docs.map((d) => d.data() as UserModel);
            callbacks.onUsers!(data);
          },
          (err) => console.warn('[Firestore] Users snapshot error:', err)
        );
        this.unsubscribers.push(unsub);
      }

      // 3. Products
      if (callbacks.onProducts) {
        const unsub = onSnapshot(
          scopedCollection('products'),
          (snap) => {
            const data: Product[] = snap.docs.map((d) => d.data() as Product);
            callbacks.onProducts!(data);
          },
          (err) => console.warn('[Firestore] Products snapshot error:', err)
        );
        this.unsubscribers.push(unsub);
      }

      // 4. Orders
      if (callbacks.onOrders) {
        const unsub = onSnapshot(
          scopedCollection('orders'),
          (snap) => {
            const data: Order[] = snap.docs.map((d) => d.data() as Order);
            callbacks.onOrders!(data);
          },
          (err) => console.warn('[Firestore] Orders snapshot error:', err)
        );
        this.unsubscribers.push(unsub);
      }

      // 5. Deliveries
      if (callbacks.onDeliveries) {
        const unsub = onSnapshot(
          scopedCollection('deliveries'),
          (snap) => {
            const data: Delivery[] = snap.docs.map((d) => d.data() as Delivery);
            callbacks.onDeliveries!(data);
          },
          (err) => console.warn('[Firestore] Deliveries snapshot error:', err)
        );
        this.unsubscribers.push(unsub);
      }

      // 6. Receivings
      if (callbacks.onReceivings) {
        const unsub = onSnapshot(
          scopedCollection('receivings'),
          (snap) => {
            const data: Receiving[] = snap.docs.map((d) => d.data() as Receiving);
            callbacks.onReceivings!(data);
          },
          (err) => console.warn('[Firestore] Receivings snapshot error:', err)
        );
        this.unsubscribers.push(unsub);
      }

      // 7. Inventory
      if (callbacks.onInventory) {
        const unsub = onSnapshot(
          scopedCollection('inventory'),
          (snap) => {
            const data: InventoryItem[] = snap.docs.map((d) => d.data() as InventoryItem);
            callbacks.onInventory!(data);
          },
          (err) => console.warn('[Firestore] Inventory snapshot error:', err)
        );
        this.unsubscribers.push(unsub);
      }

      // 8. Sales
      if (callbacks.onSales) {
        const unsub = onSnapshot(
          scopedCollection('sales'),
          (snap) => {
            const data: Sale[] = snap.docs.map((d) => d.data() as Sale);
            callbacks.onSales!(data);
          },
          (err) => console.warn('[Firestore] Sales snapshot error:', err)
        );
        this.unsubscribers.push(unsub);
      }

      // 9. Announcements
      if (callbacks.onAnnouncements) {
        const unsub = onSnapshot(
          scopedCollection('announcements'),
          (snap) => {
            const data: Announcement[] = snap.docs.map((d) => d.data() as Announcement);
            callbacks.onAnnouncements!(data);
          },
          (err) => console.warn('[Firestore] Announcements snapshot error:', err)
        );
        this.unsubscribers.push(unsub);
      }

      // 10. Events
      if (callbacks.onEvents) {
        const unsub = onSnapshot(
          scopedCollection('events'),
          (snap) => {
            const data: CalendarEvent[] = snap.docs.map((d) => d.data() as CalendarEvent);
            callbacks.onEvents!(data);
          },
          (err) => console.warn('[Firestore] Events snapshot error:', err)
        );
        this.unsubscribers.push(unsub);
      }

      // 11. Production Batches
      if (callbacks.onProductionBatches) {
        const unsub = onSnapshot(
          scopedCollection('production_batches'),
          (snap) => {
            const data: ProductionBatch[] = snap.docs.map((d) => d.data() as ProductionBatch);
            callbacks.onProductionBatches!(data);
          },
          (err) => console.warn('[Firestore] Production Batches snapshot error:', err)
        );
        this.unsubscribers.push(unsub);
      }

      // 12. BIR Receipts
      if (callbacks.onBirReceipts) {
        const unsub = onSnapshot(
          scopedCollection('birReceipts'),
          (snap) => {
            const data: BIRReceipt[] = snap.docs.map((d) => d.data() as BIRReceipt);
            callbacks.onBirReceipts!(data);
          },
          (err) => console.warn('[Firestore] BIR Receipts snapshot error:', err)
        );
        this.unsubscribers.push(unsub);
      }

      // 13. Inventory Movements
      if (callbacks.onInventoryMovements) {
        const unsub = onSnapshot(
          scopedCollection('inventoryMovements'),
          (snap) => {
            const data: InventoryMovementRecord[] = snap.docs.map((d) => d.data() as InventoryMovementRecord);
            callbacks.onInventoryMovements!(data);
          },
          (err) => console.warn('[Firestore] Inventory Movements snapshot error:', err)
        );
        this.unsubscribers.push(unsub);
      }

      // 14. POS Audit Logs
      if (callbacks.onPosAuditLogs) {
        const unsub = onSnapshot(
          scopedCollection('posAuditLogs'),
          (snap) => {
            const data: POSAuditLog[] = snap.docs.map((d) => d.data() as POSAuditLog);
            callbacks.onPosAuditLogs!(data);
          },
          (err) => console.warn('[Firestore] POS Audit Logs snapshot error:', err)
        );
        this.unsubscribers.push(unsub);
      }

      // 15. Shift Closings (Z-Readings)
      if (callbacks.onShiftClosings) {
        const unsub = onSnapshot(
          scopedCollection('shiftClosings'),
          (snap) => {
            const data: ShiftClosingRecord[] = snap.docs.map((d) => d.data() as ShiftClosingRecord);
            callbacks.onShiftClosings!(data);
          },
          (err) => console.warn('[Firestore] Shift Closings snapshot error:', err)
        );
        this.unsubscribers.push(unsub);
      }

      // 16. Spoilage Records
      if (callbacks.onSpoilageRecords) {
        const unsub = onSnapshot(
          scopedCollection('spoilage_records'),
          (snap) => {
            const data: SpoilageRecord[] = snap.docs.map((d) => d.data() as SpoilageRecord);
            callbacks.onSpoilageRecords!(data);
          },
          (err) => console.warn('[Firestore] Spoilage Records snapshot error:', err)
        );
        this.unsubscribers.push(unsub);
      }

      // 17. Physical Audits
      if (callbacks.onPhysicalAudits) {
        const unsub = onSnapshot(
          scopedCollection('physical_audits'),
          (snap) => {
            const data: PhysicalInventoryAudit[] = snap.docs.map((d) => d.data() as PhysicalInventoryAudit);
            callbacks.onPhysicalAudits!(data);
          },
          (err) => console.warn('[Firestore] Physical Audits snapshot error:', err)
        );
        this.unsubscribers.push(unsub);
      }
    } catch (e: any) {
      console.error('[Firestore] subscribeAll error:', e);
      this.updateState({ status: 'error', error: e?.message });
    }

    return () => this.cleanup();
  }

  // Generic Save Document to Firestore
  public async saveDoc(collectionName: string, id: string, data: any): Promise<void> {
    try {
      if (data?.clientRequestId) {
        this.processedRequestKeys.add(data.clientRequestId);
      }
      if (data?.idempotencyKey) {
        this.processedRequestKeys.add(data.idempotencyKey);
      }
      const sanitized = sanitizeForFirestore(data);
      const ref = doc(db, collectionName, id);
      await setDoc(ref, { ...sanitized, updatedAt: serverTimestamp() }, { merge: true });
      this.updateState({ status: 'connected', lastSyncedAt: new Date() });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[Firestore] Sync failed for ${collectionName}/${id} (Operating in Offline/Demo Mode):`, message);
      this.updateState({ status: 'error', error: message });
      // Graceful fallback: do not throw to prevent unhandled promise rejections.
      // Local optimistic state in DataContext will persist for demo purposes.
    }
  }

  // Generic Delete Document
  public async removeDoc(collectionName: string, id: string): Promise<void> {
    try {
      const ref = doc(db, collectionName, id);
      await deleteDoc(ref);
      this.updateState({ status: 'connected', lastSyncedAt: new Date() });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[Firestore] Delete failed for ${collectionName}/${id} (Operating in Offline/Demo Mode):`, message);
      this.updateState({ status: 'error', error: message });
      // Graceful fallback: do not throw.
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

  public cleanup() {
    this.unsubscribers.forEach((u) => u());
    this.unsubscribers = [];
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
