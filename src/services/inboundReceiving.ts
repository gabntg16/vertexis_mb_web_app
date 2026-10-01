import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../lib/firebase';
import type { InboundReceipt, InboundSubmission } from '../../functions/src/inboundReceivingModel';

const submit = httpsCallable<InboundSubmission, InboundReceipt>(functions, 'submitInboundReceipt');
const review = httpsCallable<{ id: string; revision: number; decision: 'approved' | 'returned'; notes: string }, InboundReceipt>(functions, 'reviewInboundReceipt');

export async function submitInboundReceiptRemote(input: InboundSubmission) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign in again to submit receiving.');
  const result = await submit(JSON.parse(JSON.stringify(input)));
  if (uid !== auth.currentUser?.uid) throw new Error('Your session changed. Sign in to check the receiving request.');
  return result;
}
export async function reviewInboundReceiptRemote(input: { id: string; revision: number; decision: 'approved' | 'returned'; notes: string }) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign in again to review receiving.');
  const result = await review(input);
  if (uid !== auth.currentUser?.uid) throw new Error('Your session changed. Sign in to check the receiving decision.');
  return result;
}
