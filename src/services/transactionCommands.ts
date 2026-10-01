import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../lib/firebase';
import type { Product, Order, Sale, Delivery, ProductionBatch, DailyShiftLog } from '../types';

type TransactionResult = { product?: Product; log?: DailyShiftLog; batches?: ProductionBatch[]; order?: Order; sale?: Sale; delivery?: Delivery; stock?: number; inventoryId?: string };
const commit = httpsCallable<{ action: string; requestId: string; input: unknown }, TransactionResult>(functions, 'commitTransaction');
const proof = httpsCallable<{ orderId: string }, { dataUrl: string; revision: string }>(functions, 'getPaymentProof');
const pending = new Map<string, string>();
const active = new Set<string>();
export const inspectedProofRevisions = new Map<string, string>();

export async function commitTransaction(action: string, input: unknown): Promise<TransactionResult> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign in again to save this transaction.');
  const normalizedInput = JSON.parse(JSON.stringify(input));
  const serialized = new TextEncoder().encode(JSON.stringify({ uid, action, input: normalizedInput }));
  const intent = 'vertexis-retry-' + Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', serialized)), b => b.toString(16).padStart(2, '0')).join('');
  if (auth.currentUser?.uid !== uid) throw new Error('Your session changed. Sign in before saving.');
  if (active.has(intent)) throw new Error('This request is already being saved. Please wait.');
  let stored: string | null = null;
  try { stored = sessionStorage.getItem(intent); } catch { /* Memory retry remains available. */ }
  const requestId = pending.get(intent) || stored || crypto.randomUUID();
  try { sessionStorage.setItem(intent, requestId); } catch { /* Memory retry remains available. */ }
  pending.set(intent, requestId);
  active.add(intent);
  try {
    const result = (await commit({ action, input: normalizedInput, requestId })).data;
    if (auth.currentUser?.uid !== uid) throw new Error('Your session changed. Sign in to check the saved transaction.');
    pending.delete(intent);
    try { sessionStorage.removeItem(intent); } catch { /* No persistent cache. */ }
    return result;
  } catch (error) {
    const code = (error as { code?: string }).code;
    // Preserve the retry key for uncertain network outcomes; reject changed data.
    if (code && !['functions/unavailable', 'functions/deadline-exceeded', 'functions/internal', 'functions/cancelled', 'functions/unknown'].includes(code)) { pending.delete(intent); try { sessionStorage.removeItem(intent); } catch { /* No persistent cache. */ } }
    throw error;
  } finally { active.delete(intent); }
}

export async function loadPaymentProof(orderId: string) {
  const uid = auth.currentUser?.uid;
  const result = (await proof({ orderId })).data;
  if (uid !== auth.currentUser?.uid) throw new Error('Your session changed.');
  inspectedProofRevisions.set(orderId, result.revision);
  return result.dataUrl;
}
