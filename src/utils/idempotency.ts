/**
 * Idempotency & Transaction Deduplication Utility
 * VertexIS (The Marsh Bites Management System)
 * 
 * Provides:
 * 1. High-entropy clientRequestId (UUID v4) generation
 * 2. In-memory and local-storage backed idempotency cache to prevent double-charging or duplicate inventory mutations
 * 3. State machine status transition validators
 * 4. Concurrency locking helpers
 */

// Generate a cryptographically secure UUID v4 or high-entropy fallback
export function generateClientRequestId(prefix: string = 'req'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  const timestamp = Date.now().toString(36);
  const randomHex = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  return `${prefix}_${timestamp}_${randomHex}`;
}

interface IdempotencyRecord<T = any> {
  key: string;
  status: 'processing' | 'completed' | 'failed';
  timestamp: number;
  result?: T;
  error?: string;
}

class IdempotencyManager {
  private inMemoryCache = new Map<string, IdempotencyRecord>();
  private activeLocks = new Set<string>();
  private readonly STORAGE_KEY = 'marsh_bites_idempotency_v1';
  private readonly TTL_MS = 24 * 60 * 60 * 1000; // 24 Hours retention

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed: IdempotencyRecord[] = JSON.parse(stored);
        const now = Date.now();
        parsed.forEach((rec) => {
          if (now - rec.timestamp < this.TTL_MS) {
            this.inMemoryCache.set(rec.key, rec);
          }
        });
      }
    } catch (e) {
      console.warn('[IdempotencyManager] Error loading cache from localStorage:', e);
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const array = Array.from(this.inMemoryCache.values()).slice(-200); // keep recent 200 transactions
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(array));
    } catch (e) {
      console.warn('[IdempotencyManager] Error persisting cache to localStorage:', e);
    }
  }

  /**
   * Acquire atomic lock for a clientRequestId.
   * Returns true if lock was acquired, false if request is already in-flight or already completed.
   */
  public acquireLock(clientRequestId: string): { acquired: boolean; existingRecord?: IdempotencyRecord } {
    if (!clientRequestId) {
      return { acquired: true };
    }

    if (this.activeLocks.has(clientRequestId)) {
      return {
        acquired: false,
        existingRecord: {
          key: clientRequestId,
          status: 'processing',
          timestamp: Date.now(),
        },
      };
    }

    const existing = this.inMemoryCache.get(clientRequestId);
    if (existing && existing.status === 'completed') {
      return { acquired: false, existingRecord: existing };
    }

    this.activeLocks.add(clientRequestId);
    this.inMemoryCache.set(clientRequestId, {
      key: clientRequestId,
      status: 'processing',
      timestamp: Date.now(),
    });

    return { acquired: true };
  }

  /**
   * Release lock and mark transaction completed with cached result
   */
  public markCompleted<T>(clientRequestId: string, result?: T): void {
    if (!clientRequestId) return;
    this.activeLocks.delete(clientRequestId);
    const rec: IdempotencyRecord<T> = {
      key: clientRequestId,
      status: 'completed',
      timestamp: Date.now(),
      result,
    };
    this.inMemoryCache.set(clientRequestId, rec);
    this.saveToStorage();
  }

  /**
   * Release lock upon failure so user can safely retry
   */
  public markFailed(clientRequestId: string, error?: string): void {
    if (!clientRequestId) return;
    this.activeLocks.delete(clientRequestId);
    this.inMemoryCache.delete(clientRequestId);
    this.saveToStorage();
  }

  /**
   * Check if a request has already been completed
   */
  public isCompleted(clientRequestId: string): boolean {
    if (!clientRequestId) return false;
    const rec = this.inMemoryCache.get(clientRequestId);
    return rec?.status === 'completed';
  }

  /**
   * Retrieve cached result for an idempotent request
   */
  public getResult<T>(clientRequestId: string): T | undefined {
    if (!clientRequestId) return undefined;
    return this.inMemoryCache.get(clientRequestId)?.result as T | undefined;
  }
}

export const idempotencyManager = new IdempotencyManager();

// =========================================================================
// STATE MACHINE TRANSITION VALIDATORS
// =========================================================================

export type OrderWorkflowState =
  | 'pending'
  | 'waitingApproval'
  | 'approved'
  | 'in_production'
  | 'dispatched'
  | 'completed'
  | 'rejected'
  | 'canceled';

export type BatchWorkflowState =
  | 'queued'
  | 'in_kettle'
  | 'curing'
  | 'packaging'
  | 'packaged'
  | 'completed'
  | 'dispatched';

export type DeliveryWorkflowState =
  | 'pending'
  | 'in_transit'
  | 'delivered'
  | 'canceled'
  | 'failed';

export type ReceiptWorkflowState =
  | 'completed'
  | 'voided'
  | 'refunded';

/**
 * Validates that an entity's current status allows moving into a target action.
 * Throws a human-readable descriptive error if the state machine transition is invalid.
 */
export function validateStateTransition(
  entityName: string,
  entityId: string,
  currentStatus: string,
  allowedStatuses: string[],
  actionName: string
): void {
  const normalizedCurrent = (currentStatus || '').toLowerCase().trim();
  const normalizedAllowed = allowedStatuses.map((s) => s.toLowerCase().trim());

  if (!normalizedAllowed.includes(normalizedCurrent)) {
    throw new Error(
      `Cannot perform "${actionName}" on ${entityName} #${entityId}: Current status is "${currentStatus.toUpperCase()}", but must be one of [${allowedStatuses.join(
        ', '
      ).toUpperCase()}]. Transaction blocked to prevent duplicate or invalid state mutation.`
    );
  }
}
