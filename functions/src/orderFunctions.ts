import { App, getApp, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onCall } from 'firebase-functions/v2/https';
import { executeTransaction, readPaymentProof } from './transactionCommands.js';

// Also serves as a deployment entry point for orders without chatbot secrets.
function defaultApp(): App {
  try {
    return getApp();
  } catch {
    return initializeApp();
  }
}

const database = () => getFirestore(defaultApp(), 'marshbites-mbms-db');
const options = {
  region: 'asia-southeast1',
  maxInstances: 10,
  enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true',
};

export const commitTransaction = onCall(options, request => executeTransaction(database(), request));
export const getPaymentProof = onCall(options, request => readPaymentProof(database(), request));
