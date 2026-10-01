import { enforceRateLimit, isManagerAccountRole } from './transactionCommands.js';
import { Firestore } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { acceptedInboundUnits, assertReviewable, InboundReceipt, InboundSubmission, receiptId, validateInboundSubmission } from './inboundReceivingModel.js';

async function branchActor(db: Firestore, request: CallableRequest, manager = false) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to continue.');
  const { uid, token } = request.auth;
  if (token.role !== 'branch' || typeof token.branchId !== 'string' || token.branchId.includes('/')) throw new HttpsError('permission-denied', 'A branch account is required.');
  const account = (await db.doc(`branch_accounts/${uid}`).get()).data();
  if (!account || account.isActive !== true || account.branchId !== token.branchId) throw new HttpsError('permission-denied', 'An active account for this branch is required.');
  const profile = (await db.doc(`users/${uid}`).get()).data();
  const branch = (await db.doc(`branches/${token.branchId}`).get()).data();
  if (!profile || profile.isActive === false || profile.branchId !== token.branchId || !branch || ['suspended', 'archived', 'closed', 'deleted'].includes(String(branch.status).toLowerCase())) throw new HttpsError('permission-denied', 'Your branch account is not active.');
  if (manager && !isManagerAccountRole(account.role)) throw new HttpsError('permission-denied', 'Only the branch manager can review receipts.');
  return { uid, branchId: token.branchId, name: String(account.fullName || token.name || 'Branch user') };
}

export async function submitInbound(db: Firestore, request: CallableRequest<InboundSubmission>) {
  const actor = await branchActor(db, request);
  await enforceRateLimit(db, `receiving-${actor.uid}`, 30);
  const input = request.data;
  try { validateInboundSubmission(input); } catch (error) { throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'Invalid receipt.'); }
  return db.runTransaction(async tx => {
    // Transactional standard queries are required to prevent races with dispatch/receiving.
    const shipments = await tx.get(db.collection('deliveries').where('branchId', '==', actor.branchId));
    const normalized = input.manifestNumber.trim().toUpperCase();
    const matched = shipments.docs.find(d => d.id === input.deliveryId || (!input.deliveryId && [d.data().waybillNumber, d.data().trackingNumber].some(v => typeof v === 'string' && v.trim().toUpperCase() === normalized)));
    if (input.deliveryId && !matched) throw new HttpsError('not-found', 'Delivery not found in this branch.');
    const delivery = matched?.data();
    if (delivery?.status === 'canceled') throw new HttpsError('failed-precondition', 'This delivery was canceled.');
    const orderSnap = delivery?.orderId ? await tx.get(db.doc(`orders/${delivery.orderId}`)) : undefined;
    const legacy = matched ? await tx.get(db.collection('receivings').where('deliveryId', '==', matched.id)) : undefined;
    if (orderSnap?.data()?.status === 'completed' || legacy?.docs.some(d => d.data().status === 'received')) throw new HttpsError('already-exists', 'Stock has already been received for this delivery.');
    const id = receiptId(actor.branchId, input.manifestNumber, matched?.id);
    const ref = db.doc(`inbound_receipts/${id}`);
    const previous = (await tx.get(ref)).data() as InboundReceipt | undefined;
    if (previous && previous.status !== 'returned') throw new HttpsError('already-exists', 'This manifest is already awaiting approval or added to stock.');
    const items = [];
    for (const line of input.items) {
      const product = (await tx.get(db.doc(`products/${line.productId}`))).data();
      if (!product) throw new HttpsError('not-found', 'A selected product no longer exists.');
      items.push({ productId: line.productId, productName: String(product.flavor || product.name), expectedUnits: line.expectedUnits, receivedUnits: line.receivedUnits, condition: line.condition, notes: line.notes?.trim() || '' });
    }
    const receipt: InboundReceipt = {
      id, branchId: actor.branchId, manifestNumber: input.manifestNumber.trim(), supplierOrSource: input.supplierOrSource.trim(), items,
      ...(matched ? { deliveryId: matched.id, orderId: String(delivery!.orderId) } : {}),
      status: 'pending', submittedBy: actor.uid, submittedByName: actor.name, submittedAt: new Date().toISOString(), revision: (previous?.revision || 0) + 1,
    };
    tx.set(ref, receipt);
    const auditId = `${id}-${receipt.revision}-submitted`;
    tx.create(db.doc(`transaction_audit/${auditId}`), { id: auditId, branchId: actor.branchId, action: 'receiving.submit', actorUid: actor.uid, timestamp: receipt.submittedAt, recordId: id, revision: receipt.revision });
    return receipt;
  });
}

export async function reviewInbound(db: Firestore, request: CallableRequest<{ id: string; revision: number; decision: 'approved' | 'returned'; notes: string }>) {
  const actor = await branchActor(db, request, true);
  await enforceRateLimit(db, `receiving-${actor.uid}`, 30);
  const { id, revision, decision, notes } = request.data || {};
  if (typeof id !== 'string' || !id.startsWith('inbound-') || !Number.isSafeInteger(revision) || revision < 1 || id.includes('/') || id.length > 1400 || !['approved', 'returned'].includes(decision) || typeof notes !== 'string' || notes.length > 1000 || (decision === 'returned' && !notes.trim())) throw new HttpsError('invalid-argument', 'Provide a valid decision and a reason when returning a receipt.');
  return db.runTransaction(async tx => {
    const ref = db.doc(`inbound_receipts/${id}`);
    const receipt = (await tx.get(ref)).data() as InboundReceipt | undefined;
    if (!receipt) throw new HttpsError('not-found', 'Receipt not found.');
    try { assertReviewable(receipt, actor.branchId, revision); } catch (error) { throw new HttpsError('failed-precondition', (error as Error).message); }
    const now = new Date().toISOString();
    const reviewed: InboundReceipt = { ...receipt, status: decision, reviewedAt: now, reviewedBy: actor.uid, reviewedByName: actor.name, reviewNotes: notes.trim() };
    const auditId = `${id}-${revision}-${decision}`;
    const audit = { id: auditId, branchId: actor.branchId, action: `receiving.${decision}`, actorUid: actor.uid, timestamp: now, recordId: id, revision, notes: notes.trim() };
    if (decision === 'returned') { tx.set(ref, reviewed); tx.create(db.doc(`transaction_audit/${auditId}`), audit); return reviewed; }
    const deliverySnap = receipt.deliveryId ? await tx.get(db.doc(`deliveries/${receipt.deliveryId}`)) : undefined;
    const orderSnap = receipt.orderId ? await tx.get(db.doc(`orders/${receipt.orderId}`)) : undefined;
    const legacy = receipt.deliveryId ? await tx.get(db.collection('receivings').where('deliveryId', '==', receipt.deliveryId)) : undefined;
    if ((receipt.deliveryId && (!deliverySnap?.exists || deliverySnap.data()?.branchId !== actor.branchId || deliverySnap.data()?.status === 'canceled')) || (receipt.orderId && (!orderSnap?.exists || orderSnap.data()?.branchId !== actor.branchId))) throw new HttpsError('failed-precondition', 'The linked delivery or order is no longer valid.');
    if (orderSnap?.data()?.status === 'completed' || legacy?.docs.some(d => d.data().status === 'received')) throw new HttpsError('already-exists', 'Stock has already been received for this delivery.');
    const inventory = await tx.get(db.collection('inventory').where('branchId', '==', actor.branchId));
    for (const [productId, { productName, quantity }] of acceptedInboundUnits(receipt.items)) {
      const matching = inventory.docs.filter(d => d.data().productId === productId);
      if (matching.length > 1) throw new HttpsError('failed-precondition', `Duplicate inventory rows for ${productName}. Resolve them before approving.`);
      const existing = matching[0];
      const previousStock = existing ? Number(existing.data().stock) : 0;
      if (!Number.isSafeInteger(previousStock) || previousStock < 0) throw new HttpsError('failed-precondition', 'The current stock is invalid.');
      const newStock = previousStock + quantity;
      if (!Number.isSafeInteger(newStock) || newStock > 1000000) throw new HttpsError('failed-precondition', 'Stock exceeds the allowed quantity.');
      const stockRef = existing?.ref || db.doc(`inventory/inv-${actor.branchId}-${productId}`);
      tx.set(stockRef, { id: stockRef.id, branchId: actor.branchId, productId, productName, stock: newStock, currentStock: newStock }, { merge: true });
      const movementRef = db.doc(`inventoryMovements/${id}-${encodeURIComponent(productId)}`);
      tx.create(movementRef, { id: movementRef.id, branchId: actor.branchId, productId, productName, type: 'Stock In', quantity, previousStock, newStock, referenceNo: receipt.manifestNumber, performedBy: actor.name, performedByUid: actor.uid, timestamp: now, notes: 'Inbound receipt approved by branch manager.' });
    }
    reviewed.stockAppliedAt = now;
    tx.set(ref, reviewed);
    if (deliverySnap) tx.update(deliverySnap.ref, { status: 'delivered', deliveredAt: now });
    if (orderSnap) tx.update(orderSnap.ref, { status: 'completed', receivedAt: now, completedAt: now, isDispatched: true, isArchived: true });
    if (receipt.deliveryId) {
      const receiving = { branchId: actor.branchId, deliveryId: receipt.deliveryId, orderId: receipt.orderId || '', status: 'received', receivedAt: now, receiverName: actor.name, notes: 'Manager-approved inbound receipt. Stock already applied.' };
      if (legacy?.docs.length) {
        for (const record of legacy.docs) tx.set(record.ref, { ...receiving, id: record.id }, { merge: true });
      } else {
        tx.set(db.doc(`receivings/${id}`), { ...receiving, id, createdAt: receipt.submittedAt });
      }
    }
    tx.create(db.doc(`transaction_audit/${auditId}`), audit);
    return reviewed;
  });
}
