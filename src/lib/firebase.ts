import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';
import {
  initializeFirestore,
  getFirestore,
  Firestore,
  doc,
  getDocFromServer,
} from 'firebase/firestore';
const rawFirebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

function isValidEnvValue(val?: string): boolean {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (!trimmed) return false;
  if (
    trimmed.startsWith('your-') ||
    trimmed.includes('your-firebase') ||
    trimmed.includes('your-project') ||
    trimmed.includes('your-firestore') ||
    trimmed.includes('placeholder') ||
    trimmed.includes('example') ||
    trimmed === 'demo-vertexis'
  ) {
    return false;
  }
  return true;
}

export const isFirebaseConfigured =
  isValidEnvValue(rawFirebaseConfig.projectId) &&
  isValidEnvValue(rawFirebaseConfig.apiKey) &&
  isValidEnvValue(rawFirebaseConfig.appId);

if (!isFirebaseConfigured) {
  console.info(
    '[Firebase] Active environment contains placeholder/unconfigured Firebase credentials. Operating in local demo/offline mode.'
  );
}

const firebaseConfig = {
  projectId: rawFirebaseConfig.projectId || 'demo-vertexis',
  appId: rawFirebaseConfig.appId || '1:123456789:web:demo',
  apiKey: rawFirebaseConfig.apiKey || 'AIzaSyDemoPlaceholderKeyVertexIS',
  authDomain: rawFirebaseConfig.authDomain || 'demo-vertexis.firebaseapp.com',
  firestoreDatabaseId: rawFirebaseConfig.firestoreDatabaseId || '(default)',
  storageBucket: rawFirebaseConfig.storageBucket || 'demo-vertexis.appspot.com',
  messagingSenderId: rawFirebaseConfig.messagingSenderId || '123456789',
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
  if (!isFirebaseConfigured) {
    return;
  }
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

export const auth = getAuth(app);

export const functions = getFunctions(app, 'asia-southeast1');
