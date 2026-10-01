import { updateShift } from './shiftCommands.js';
import { createHash } from 'node:crypto';
import { Firestore, Transaction } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { boundedText, money, packageTotal, PACKAGE_PRICES, paymentReady, validId, wholeQuantity } from './transactionModel.js';

type Actor = { uid: string; branchId: string; name: string; role: 'admin' | 'manager' | 'staff'; accountRole?: string };

export function isManagerAccountRole(value: unknown): boolean {
  const normalized = String(value || '').trim().toLowerCase().replace(/[\s_-]+/g, ' ');
  return normalized === 'branch manager' || normalized === 'manager';
}

export async function transactionActor(db: Firestore, request: CallableRequest): Promise<Actor> {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in again to continue.');
  const { uid, token } = request.auth;
  const profile = (await db.doc(`users/${uid}`).get()).data();
  if (!profile || profile.isActive === false) throw new HttpsError('permission-denied', 'Your account is not active.');
  if (token.role === 'admin' && profile.role === 'admin') return { uid, branchId: '', name: String(profile.name || 'HQ'), role: 'admin' };
  const account = (await db.doc(`branch_accounts/${uid}`).get()).data();
  const claimedRole = typeof token.role === 'string' ? token.role : '';
  const claimedBranchId = typeof token.branchId === 'string' ? token.branchId : '';
  const profileRole = String(profile.role || '').trim().toLowerCase().replace(/[\s_-]+/g, ' ');
  const profileIsAdmin = profileRole === 'admin' || profileRole === 'super admin';
  const claimConflicts = (claimedRole && claimedRole !== 'branch')
    || (claimedBranchId && claimedBranchId !== account?.branchId);
  const profileConflicts = profileIsAdmin
    || (profile.branchId && profile.branchId !== account?.branchId);
  if (!account?.isActive || typeof account.branchId !== 'string' || claimConflicts || profileConflicts) {
    throw new HttpsError('permission-denied', 'Your branch access could not be verified.');
  }
  const branch = (await db.doc(`branches/${account.branchId}`).get()).data();
  if (!branch || ['suspended', 'archived', 'closed', 'deleted'].includes(String(branch.status).toLowerCase())) throw new HttpsError('permission-denied', 'This branch is not active.');
  return { uid, branchId: account.branchId, name: String(account.fullName || profile.name), accountRole: account.role, role: isManagerAccountRole(account.role) ? 'manager' : 'staff' };
}

export async function enforceRateLimit(db: Firestore, uid: string, limit = 60): Promise<void> {
  const minute = Math.floor(Date.now() / 60000);
  const ref = db.doc(`request_limits/${uid}`);
  await db.runTransaction(async tx => {
    const previous = (await tx.get(ref)).data();
    const count = previous?.minute === minute ? Number(previous.count) : 0;
    if (count >= limit) throw new HttpsError('resource-exhausted', 'Too many requests. Please wait a minute before retrying.');
    tx.set(ref, { minute, count: count + 1 });
  });
}

function requireRole(actor: Actor, role: 'admin' | 'manager') {
  if (actor.role !== role) throw new HttpsError('permission-denied', `Only ${role === 'admin' ? 'HQ administrators' : 'branch managers'} can perform this action.`);
}

async function stockRows(db: Firestore, tx: Transaction, branchId: string) {
  return (await tx.get(db.collection('inventory').where('branchId', '==', branchId))).docs;
}

export async function executeTransaction(db: Firestore, request: CallableRequest) {
  const actor = await transactionActor(db, request);
  let action: string, key: string, input: Record<string, any>;
  try {
    action = boundedText(request.data?.action, 40, true);
    key = validId(request.data?.requestId);
    input = request.data?.input;
    if (!input || Array.isArray(input) || typeof input !== 'object' || JSON.stringify(input).length > 950000) throw new Error('Invalid request.');
  } catch (error) { throw new HttpsError('invalid-argument', (error as Error).message); }
  await enforceRateLimit(db, actor.uid);
  const digest = createHash('sha256').update(JSON.stringify({ action, input })).digest('hex');
  const operationRef = db.doc(`transaction_requests/${actor.uid}-${key}`);
  try {
    return await db.runTransaction(async tx => {
      const previous = (await tx.get(operationRef)).data();
      if (previous) {
        if (previous.digest !== digest) throw new HttpsError('already-exists', 'This retry key belongs to a different request.');
        return previous.result;
      }
      const now = new Date().toISOString();
      let result: Record<string, any>;
      let branchId = actor.branchId;

      if (action.startsWith('shift.')) {
        result = await updateShift(db, tx, actor, action, input, key, now);
      } else if (action === 'sale.create') {
        if (actor.role === 'admin' || actor.accountRole === 'Inventory Specialist') throw new HttpsError('permission-denied', 'Use an assigned branch account to record sales.');
        const productId = validId(input.productId);
        const quantity = wholeQuantity(input.quantity);
        if (!['Cash', 'GCash', 'Bank Transfer'].includes(input.paymentMethod)) throw new Error('Select a valid payment method.');
        const paymentReference = boundedText(input.paymentReference, 120, input.paymentMethod !== 'Cash');
        const product = (await tx.get(db.doc(`products/${productId}`))).data();
        if (!product) throw new Error('Product not found.');
        const rows = (await stockRows(db, tx, branchId)).filter(d => d.data().productId === productId);
        if (rows.length !== 1) throw new Error('This product needs a single valid inventory record.');
        const stock = wholeQuantity(rows[0].data().stock, true);
        if (quantity > stock) throw new HttpsError('failed-precondition', `Insufficient stock. Available: ${stock}.`);
        const totalCents = money(product.price) * quantity;
        if (!Number.isSafeInteger(totalCents) || totalCents > 10000000000) throw new Error('Sale total exceeds the allowed amount.');
        const id = `sale-${key}`;
        const sale = { id, branchId, productId, sku: productId, productName: `${product.flavor} (${product.name})`, quantity, total: totalCents / 100, date: now, paymentMethod: input.paymentMethod, paymentReference, userId: actor.uid, cashierName: actor.name, source: 'Manual Sales Entry', status: 'completed' };
        tx.update(rows[0].ref, { stock: stock - quantity, currentStock: stock - quantity });
        tx.create(db.doc(`sales/${id}`), sale);
        const movementId = `movement-${key}`;
        tx.create(db.doc(`inventoryMovements/${movementId}`), { id: movementId, branchId, productId, productName: sale.productName, type: 'Stock Out', quantity, previousStock: stock, newStock: stock - quantity, referenceNo: id, performedBy: actor.name, performedByUid: actor.uid, timestamp: now, notes: 'Sale recorded.' });
        result = { sale, stock: stock - quantity, inventoryId: rows[0].id };
      } else if (action === 'order.create') {
        requireRole(actor, 'manager');
        if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 50) throw new Error('Choose between 1 and 50 products.');
        const branch = (await tx.get(db.doc(`branches/${branchId}`))).data();
        const quantities = new Map<string, number>();
        for (const line of input.items) {
          const id = validId(line?.productId);
          quantities.set(id, wholeQuantity((quantities.get(id) || 0) + wholeQuantity(line.quantity)));
        }
        const items = [];
        for (const [productId, quantity] of quantities) {
          const product = (await tx.get(db.doc(`products/${productId}`))).data();
          if (!product) throw new Error('A selected product no longer exists.');
          items.push({ productId, productName: `${product.flavor} (${product.name})`, quantity, unitPrice: money(product.wholesalePrice ?? product.price) / 100 });
        }
        const packs = items.reduce((sum, item) => sum + item.quantity, 0);
        const tier = input.packageTier as keyof typeof PACKAGE_PRICES | undefined;
        const totalAmount = tier ? packageTotal(tier, packs) : items.reduce((sum, item) => sum + money(item.unitPrice) * item.quantity, 0) / 100;
        if (tier) for (const item of items) item.unitPrice = Math.round(totalAmount * 100 / packs) / 100;
        const id = `ord-${key}`;
        const order = { id, branchId, branchName: String(branch?.name || ''), items, totalAmount, status: 'pending', paymentStatus: 'PENDING', productionStage: 'queued', createdAt: now, createdBy: actor.uid, ...(tier ? { packageTier: tier, packageName: `${PACKAGE_PRICES[tier].name} Package` } : {}) };
        tx.create(db.doc(`orders/${id}`), order);
        result = { order };
      } else if (['payment.submit', 'payment.approve', 'payment.reject', 'order.reject', 'order.cancel'].includes(action)) {
        const id = validId(input.orderId);
        const ref = db.doc(`orders/${id}`);
        const order = (await tx.get(ref)).data();
        if (!order) throw new HttpsError('not-found', 'Order not found.');
        branchId = order.branchId;
        if (actor.role !== 'admin' && (actor.branchId !== branchId || actor.role !== 'manager')) throw new HttpsError('permission-denied', 'This order is outside your permissions.');
        const changes: Record<string, any> = {};
        if (action === 'payment.submit') {
          requireRole(actor, 'manager');
          if (!['pending', 'waitingApproval'].includes(order.status) || order.paymentStatus === 'SUCCESSFUL') throw new Error('This order cannot accept a new payment proof.');
          const proof = boundedText(input.proof, 900000, true);
          const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(proof);
          if (!match) throw new Error('Upload a JPEG, PNG, or WebP image. External proof links are not accepted.');
          const bytes = Buffer.from(match[2], 'base64');
          const png = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
          const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 && bytes.at(-2) === 255 && bytes.at(-1) === 217;
          const webp = bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
          if (bytes.length > 650000 || bytes.length < 16 || !({ 'image/png': png, 'image/jpeg': jpeg, 'image/webp': webp }[match[1]])) throw new Error('Invalid proof image or image exceeds 650 KB.');
          if (!['gcash', 'maya', 'bank_transfer'].includes(input.paymentMethod)) throw new Error('Select a valid payment method.');
          Object.assign(changes, { status: 'waitingApproval', paymentStatus: 'PENDING', proofImagePath: `private:${id}:${key}`, paymentReference: boundedText(input.referenceNumber, 120, true), paymentMethod: input.paymentMethod, paymentRejectionReason: '', paymentVerifiedAt: null, paymentVerifiedBy: null });
          tx.set(db.doc(`payment_proofs/${id}`), { id, branchId, dataUrl: proof, uploadedBy: actor.uid, uploadedAt: now, revision: key });
        } else {
          requireRole(actor, 'admin');
          if (!['pending', 'waitingApproval'].includes(order.status)) throw new Error('The order has already progressed. Refresh before reviewing.');
          const reason = boundedText(input.reason, 1000, action !== 'payment.approve');
          if (action === 'payment.approve') {
            const proof = (await tx.get(db.doc(`payment_proofs/${id}`))).data();
            if (!proof || proof.branchId !== branchId || order.paymentStatus !== 'PENDING') throw new Error('A valid pending payment proof must be uploaded before approval.');
            if (input.proofRevision !== proof.revision) throw new Error('Payment proof changed. Inspect the latest proof before approving.');
            Object.assign(changes, { status: 'approved', paymentStatus: 'SUCCESSFUL', paymentVerifiedBy: actor.uid, paymentVerifiedAt: now, paymentCompletedAt: now, paymentRemarks: reason || 'Payment proof verified by HQ.', productionStage: 'queued' });
          } else if (action === 'payment.reject') {
            Object.assign(changes, { paymentStatus: 'FAILED', paymentRejectionReason: reason, status: 'waitingApproval' });
          } else Object.assign(changes, { status: action === 'order.cancel' ? 'canceled' : 'rejected', rejectionReason: reason });
        }
        tx.update(ref, changes);
        result = { order: { ...order, ...changes, id } };
      } else if (action === 'product.price') {
        requireRole(actor, 'admin');
        const id = validId(input.productId), ref = db.doc(`products/${id}`);
        const product = (await tx.get(ref)).data();
        if (!product) throw new Error('Product not found.');
        const changes = { price: money(input.price) / 100, wholesalePrice: money(input.wholesalePrice ?? product.wholesalePrice ?? product.price) / 100, updatedAt: now, updatedBy: actor.uid };
        tx.update(ref, changes);
        result = { product: { ...product, ...changes, id } };
      } else if (action === 'order.archive') {
        requireRole(actor, 'admin');
        const id = validId(input.orderId), ref = db.doc(`orders/${id}`);
        const order = (await tx.get(ref)).data();
        if (!order || !['completed', 'rejected', 'canceled'].includes(order.status)) throw new Error('Only completed, rejected or canceled orders can be archived.');
        branchId = order.branchId;
        const changes = { isArchived: true, archivedAt: now, archivedBy: actor.uid };
        tx.update(ref, changes);
        result = { order: { ...order, ...changes, id } };
      } else if (action === 'production.start' || action === 'production.stage') {
        requireRole(actor, 'admin');
        const id = validId(input.orderId);
        const ref = db.doc(`orders/${id}`);
        const order = (await tx.get(ref)).data();
        if (!order || !paymentReady(order)) throw new Error('HQ must verify payment before production.');
        branchId = order.branchId;
        const stage = action === 'production.start' ? 'in_kettle' : boundedText(input.stage, 40, true);
        const current = order.productionStage || 'queued';
        const transitions: Record<string, string[]> = { queued: ['in_kettle', 'in_production'], in_kettle: ['curing', 'packaging', 'packaged'], in_production: ['curing', 'packaging'], curing: ['packaging', 'packaged'], packaging: ['packaged', 'ready_for_dispatch'], packaged: ['ready_for_dispatch'], ready_for_dispatch: [] };
        if (stage !== current && !transitions[current]?.includes(stage)) throw new Error('Production stages must move forward in order. Refresh the requisition.');
        const batches = await tx.get(db.collection('production_batches').where('targetOrderId', '==', id));
        const batchCode = order.batchCode || `MTO-${id.slice(-8).toUpperCase()}`;
        const newBatches = (stage === 'in_kettle' && !batches.docs.length) ? order.items.map((item: any, index: number) => ({ id: `batch-${id}-${index}`, batchCode: `${batchCode}-${index + 1}`, productId: item.productId, productFlavor: item.productName, quantity: item.quantity, targetOrderId: id, targetBranchName: order.branchName, branchId, stage: 'in_kettle', chefName: boundedText(input.chefName, 120) || actor.name, startedAt: now, notes: `Order ${id}` })) : [];
        for (const batch of newBatches) tx.create(db.doc(`production_batches/${batch.id}`), batch);
        const changes = { productionStage: stage, batchCode, productionUpdatedAt: now, productionUpdatedBy: actor.uid };
        tx.update(ref, changes);
        result = { order: { ...order, ...changes, id }, batches: newBatches };
      } else if (action === 'delivery.status' || action === 'delivery.cancel') {
        requireRole(actor, 'admin');
        const id = validId(input.deliveryId);
        const ref = db.doc(`deliveries/${id}`);
        const delivery = (await tx.get(ref)).data();
        if (!delivery) throw new Error('Delivery not found.');
        branchId = delivery.branchId;
        const orderRef = db.doc(`orders/${validId(delivery.orderId)}`);
        const order = (await tx.get(orderRef)).data();
        if (!order) throw new Error('Linked order not found.');
        if (['delivered', 'canceled'].includes(delivery.status)) throw new Error('This delivery is already closed.');
        if (action === 'delivery.cancel' && delivery.status !== 'pending') throw new Error('A dispatched shipment cannot be canceled. Contact HQ to resolve the shipment.');
        const status = action === 'delivery.cancel' ? 'canceled' : boundedText(input.status, 30, true);
        if (!(delivery.status === 'pending' && ['inTransit', 'canceled'].includes(status)) && !(delivery.status === 'inTransit' && status === 'delivered')) throw new Error('Invalid delivery status change.');
        const changes = { status, updatedBy: actor.uid, statusUpdatedAt: now, ...(status === 'delivered' ? { deliveredAt: now } : {}), ...(status === 'canceled' ? { cancellationReason: boundedText(input.reason, 1000, true) } : {}) };
        tx.update(ref, changes);
        const orderChanges = status === 'canceled' ? { status: 'approved', isDispatched: false } : {};
        if (status === 'canceled') tx.update(orderRef, orderChanges);
        result = { delivery: { ...delivery, ...changes, id }, order: { ...order, ...orderChanges, id: delivery.orderId } };
      } else if (action === 'delivery.create') {
        requireRole(actor, 'admin');
        const orderId = validId(input.orderId);
        const ref = db.doc(`orders/${orderId}`);
        const order = (await tx.get(ref)).data();
        if (!order || !paymentReady(order) || order.productionStage !== 'ready_for_dispatch' || order.isDispatched) throw new Error('Only approved, paid, ready orders can be dispatched.');
        const shipments = await tx.get(db.collection('deliveries').where('orderId', '==', orderId));
        if (shipments.docs.some(d => d.data().status !== 'canceled')) throw new Error('This order already has an active delivery.');
        branchId = order.branchId;
        const id = `del-${key}`;
        const extra = input.extra || {};
        const items = order.items;
        // Partial dispatch requires a separate allocation/remainder policy.
        if (extra.dispatchedProducts && JSON.stringify(extra.dispatchedProducts.map((i: any) => [i.productId, i.quantity]).sort()) !== JSON.stringify(items.map((i: any) => [i.productId, i.quantity]).sort())) throw new Error('Dispatch quantities must match the approved order.');
        const delivery = { id, orderId, branchId, status: 'inTransit', address: boundedText(input.address, 500, true), destinationAddress: boundedText(input.address, 500, true), courierName: boundedText(input.courierName, 160), trackingNumber: boundedText(input.trackingNumber, 128), scheduledAt: boundedText(input.scheduledAt, 80), notes: boundedText(input.notes, 1000), dispatchedAt: now, createdBy: actor.uid, dispatchedProducts: items, dispatchMethod: boundedText(extra.dispatchMethod, 40), waybillNumber: boundedText(extra.waybillNumber, 128), driverName: boundedText(extra.driverName, 120), driverPhone: boundedText(extra.driverPhone, 40), vehiclePlateNo: boundedText(extra.vehiclePlateNo, 40), receiverContact: boundedText(extra.receiverContact, 120), receiverPhone: boundedText(extra.receiverPhone, 40), estimatedDeliveryTime: boundedText(extra.estimatedDeliveryTime, 80) };
        tx.create(db.doc(`deliveries/${id}`), delivery);
        tx.update(ref, { status: 'dispatched', isDispatched: true, dispatchedAt: now, dispatchedProducts: items });
        result = { delivery, order: { ...order, status: 'dispatched', isDispatched: true, dispatchedAt: now, dispatchedProducts: items } };
      } else throw new HttpsError('invalid-argument', 'Unknown transaction action.');

      const auditId = `${actor.uid}-${key}`;
      tx.create(db.doc(`transaction_audit/${auditId}`), { id: auditId, branchId, action, actorUid: actor.uid, actorRole: actor.role, actorName: actor.name, timestamp: now, recordId: result.order?.id || result.sale?.id || result.delivery?.id || result.log?.id || result.product?.id, requestId: key });
      // Do not copy private proof bytes into the idempotency journal.
      tx.create(operationRef, { digest, result, createdAt: now, actorUid: actor.uid });
      return result;
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    if (error instanceof Error && error.constructor === Error && !('code' in error)) throw new HttpsError('failed-precondition', error.message);
    throw new HttpsError('unavailable', 'The transaction could not be confirmed. Retry the same request.');
  }
}

export async function readPaymentProof(db: Firestore, request: CallableRequest) {
  const actor = await transactionActor(db, request);
  await enforceRateLimit(db, actor.uid);
  let id: string;
  try { id = validId(request.data?.orderId); } catch { throw new HttpsError('invalid-argument', 'Invalid order reference.'); }
  const proof = (await db.doc(`payment_proofs/${id}`).get()).data();
  if (!proof || (actor.role !== 'admin' && (actor.role !== 'manager' || actor.branchId !== proof.branchId))) throw new HttpsError('permission-denied', 'This payment proof is not available to your account.');
  return { dataUrl: proof.dataUrl, revision: proof.revision };
}
