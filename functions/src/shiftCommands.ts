import { Firestore, Transaction } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { boundedText, businessDate, money, validId, wholeQuantity } from './transactionModel.js';

type Actor = { uid: string; branchId: string; name: string; role: string };
export async function updateShift(db: Firestore, tx: Transaction, actor: Actor, action: string, input: any, key: string, now: string) {
  if (actor.role === 'admin') throw new HttpsError('permission-denied', 'Use the assigned branch account for shift operations.');
  const id = input.logId ? validId(input.logId) : `log-${actor.branchId}-${businessDate()}`;
  const ref = db.doc(`daily_shift_logs/${id}`);
  const previous = (await tx.get(ref)).data();
  if (previous && previous.branchId !== actor.branchId) throw new HttpsError('permission-denied', 'This shift belongs to another branch.');
  if (previous?.status === 'VALIDATED_AND_LOCKED') throw new Error('This shift is already locked.');
  const branch = (await tx.get(db.doc(`branches/${actor.branchId}`))).data();
  const log: Record<string, any> = previous || { id, branchId: actor.branchId, branchName: branch?.name || '', date: businessDate(), status: 'DRAFT', shiftType: 'regular', physicalCounts: [], manualSales: [], spoilageEntries: [], inboundReceiving: [], createdAt: now, submittedByStaffId: actor.uid, submittedByStaffName: actor.name, revision: 0 };
  if (['shift.approve', 'shift.return'].includes(action)) {
    if (actor.role !== 'manager') throw new HttpsError('permission-denied', 'Only the branch manager can review shift logs.');
    if (!previous || log.status !== 'PENDING_VALIDATION') throw new Error('Only submitted shifts can be reviewed.');
    if (input.revision !== log.revision) throw new Error('The shift changed. Reopen it before reviewing.');
    const notes = boundedText(input.notes, 1000, action === 'shift.return');
    if (action === 'shift.approve') Object.assign(log, { status: 'VALIDATED_AND_LOCKED', validatedByManagerId: actor.uid, validatedByManagerName: actor.name, validatedAt: now, lockedAt: now, managerNotes: notes });
    else Object.assign(log, { status: 'RETURNED_FOR_REVISION', rejectionReason: notes, rejectedBy: actor.name, rejectedByUid: actor.uid, rejectedAt: now, managerNotes: notes });
  } else {
    if (log.status === 'PENDING_VALIDATION') throw new Error('This shift is awaiting review. Ask the manager to return it before editing.');
    if (action === 'shift.counts') {
      if (!Array.isArray(input.items) || !input.items.length || input.items.length > 100) throw new Error('Enter between 1 and 100 product counts.');
      const seen = new Set(); const counts = [];
      for (const item of input.items) {
        const productId = validId(item.productId);
        if (seen.has(productId)) throw new Error('A product may only appear once in the count.');
        seen.add(productId);
        const product = (await tx.get(db.doc(`products/${productId}`))).data();
        if (!product) throw new Error('A counted product no longer exists.');
        const beginningCount = wholeQuantity(item.beginningCount, true), endingCount = wholeQuantity(item.endingCount, true);
        counts.push({ productId, productName: product.name, flavor: product.flavor, beginningCount, endingCount, variance: endingCount - beginningCount, category: 'marshmallows', unit: 'packs', notes: boundedText(item.notes, 1000) });
      }
      log.physicalCounts = counts;
    } else if (action === 'shift.waste.add') {
      if (log.spoilageEntries.length >= 100) throw new Error('This shift has reached its wastage entry limit.');
      const productId = validId(input.productId), quantity = wholeQuantity(input.quantity);
      const product = (await tx.get(db.doc(`products/${productId}`))).data();
      if (!product) throw new Error('Choose an existing product.');
      log.spoilageEntries.push({ id: `waste-${key}`, productId, productName: product.name, flavor: product.flavor, quantity, reason: boundedText(input.reason, 160, true), notes: boundedText(input.notes, 1000), costImpact: money(product.wholesalePrice ?? product.price) * quantity / 100 });
    } else if (action === 'shift.waste.remove') {
      const entryId = validId(input.entryId);
      log.spoilageEntries = log.spoilageEntries.filter((entry: any) => entry.id !== entryId);
    } else if (action === 'shift.inbound.removeItem') {
      const entryId = validId(input.entryId);
      log.inboundReceiving = log.inboundReceiving.filter((entry: any) => entry.id !== entryId);
    } else if (action === 'shift.inbound.remove') {
      const manifest = boundedText(input.manifestNumber, 120, true);
      log.inboundReceiving = log.inboundReceiving.filter((entry: any) => entry.manifestNumber !== manifest);
    } else if (action === 'shift.inbound') {
      if (!Array.isArray(input.items) || !input.items.length || input.items.length > 100) throw new Error('Invalid receiving summary.');
      // The actual receiving request/approval is stored separately and remains the stock authority.
      const items: Record<string, any>[] = [];
      for (const [index, item] of input.items.entries()) {
        const productId = validId(item.productId);
        const product = (await tx.get(db.doc(`products/${productId}`))).data();
        if (!product || !['good', 'damaged', 'shortage', 'overage'].includes(item.condition)) throw new Error('Invalid receiving item.');
        items.push({ id: `inbound-${key}-${index}`, productId, productName: `${product.flavor} (${product.name})`, manifestNumber: boundedText(item.manifestNumber, 120, true), supplierOrSource: boundedText(item.supplierOrSource, 160, true), expectedUnits: wholeQuantity(item.expectedUnits, true), receivedUnits: wholeQuantity(item.receivedUnits, true), condition: item.condition, verifiedAt: now, notes: boundedText(item.notes, 1000) });
      }
      log.inboundReceiving = [...log.inboundReceiving.filter((entry: any) => !items.some(i => i.manifestNumber === entry.manifestNumber)), ...items];
      if (log.inboundReceiving.length > 100) throw new Error('This shift has reached its receiving summary limit.');
    } else if (action === 'shift.submit') {
      if (!previous) throw new Error('Save the shift entries before submitting.');
      const records = await tx.get(db.collection('sales').where('branchId', '==', actor.branchId));
      log.manualSales = records.docs.map(d => ({ ...d.data(), id: d.id })).filter((sale: any) => sale.status !== 'voided' && sale.status !== 'refunded' && businessDate(new Date(sale.date)) === log.date).map((sale: any) => ({ id: sale.id, productId: sale.productId, productName: sale.productName, flavor: sale.productName, unitsSold: sale.quantity, unitPrice: sale.total / sale.quantity, totalAmount: sale.total, loggedAt: sale.date }));
      Object.assign(log, { status: 'PENDING_VALIDATION', submittedBy: actor.name, submittedById: actor.uid, submittedAt: now });
    } else throw new Error('Unknown shift action.');
  }
  Object.assign(log, { revision: Number(log.revision || 0) + 1, updatedAt: now, updatedBy: actor.uid, totalSalesUnits: log.manualSales.reduce((sum: number, item: any) => sum + item.unitsSold, 0), totalSalesRevenue: log.manualSales.reduce((sum: number, item: any) => sum + item.totalAmount, 0), totalSpoilageUnits: log.spoilageEntries.reduce((sum: number, item: any) => sum + item.quantity, 0), totalSpoilageCost: log.spoilageEntries.reduce((sum: number, item: any) => sum + item.costImpact, 0) });
  tx.set(ref, log);
  return { log };
}
