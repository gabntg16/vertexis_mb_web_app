import { App, getApp, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onCall } from 'firebase-functions/v2/https';
import { reviewInbound, submitInbound } from './inboundReceiving.js';

// Separate discovery entry keeps receiving deploys independent of optional services.
function defaultApp(): App {
  try {
    return getApp();
  } catch {
    return initializeApp();
  }
}

const database = () => getFirestore(defaultApp(), 'marshbites-mbms-db');
const options = { region: 'asia-southeast1', maxInstances: 10 };

export const submitInboundReceipt = onCall(options, request => submitInbound(database(), request));
export const reviewInboundReceipt = onCall(options, request => reviewInbound(database(), request));
