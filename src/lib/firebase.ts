import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  Firestore,
  doc,
  getDocFromServer,
} from 'firebase/firestore';
import baseConfig from '../../firebase-applet-config.json';

// Safely merge environment variables with fallback configuration
const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || baseConfig.projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || baseConfig.appId,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || baseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || baseConfig.authDomain,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || baseConfig.firestoreDatabaseId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || baseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || baseConfig.messagingSenderId,
};

let app;
let db: Firestore;

const databaseId =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId.trim() !== ''
    ? firebaseConfig.firestoreDatabaseId
    : '(default)';

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  // In container and sandboxed iframe environments, WebChannel streaming can trigger
  // code=unavailable errors due to proxy buffering. experimentalForceLongPolling bypasses this.
  db = initializeFirestore(
    app,
    {
      experimentalForceLongPolling: true,
      ignoreUndefinedProperties: true,
    },
    databaseId
  );
  console.log('[Firebase] Initialized with database ID (long-polling mode):', databaseId);
} catch (err) {
  console.warn('[Firebase] initializeFirestore note, falling back to getFirestore:', err);
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app, databaseId);
  } catch (fallbackErr) {
    console.warn('[Firebase] Fallback initialization note:', fallbackErr);
    app = getApp();
    db = getFirestore(app);
  }
}

// Connection validation per Firebase integration guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'system_sync', 'status'));
    console.log('[Firebase] Cloud Firestore connection verified online.');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Operating in offline mode until connection is re-established.');
    }
  }
}
testConnection();

export { app, db, firebaseConfig };
