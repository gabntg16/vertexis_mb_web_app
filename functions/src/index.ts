import { randomBytes } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall, CallableRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2/options';

initializeApp();
setGlobalOptions({ region: 'asia-southeast1', maxInstances: 10 });

const adminAuth = getAuth();
const db = getFirestore('marshbites-mbms-db');

type AccountRole = 'Branch Manager' | 'Staff' | 'Cashier' | 'Inventory Specialist';
type ProvisionPayload = {
  name?: unknown;
  email?: unknown;
  role?: unknown;
  branchId?: unknown;
  branchRole?: unknown;
  phone?: unknown;
};

const permissionsByRole: Record<AccountRole, string[]> = {
  'Branch Manager': [
    'View Branch Inventory',
    'Submit Requisition Orders',
    'View Sales & Demand Reports',
    'Manage Branch Staff',
    'Confirm Stock Delivery',
  ],
  Staff: ['Inventory Management', 'Order Processing', 'Sales Recording & POS'],
  Cashier: ['Sales Recording & POS', 'View Daily Cash Register'],
  'Inventory Specialist': ['Inventory Management', 'Quality Receiving Inspections', 'Stock Replenishment Logs'],
};

function requireAdmin(request: CallableRequest<unknown>): void {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign-in is required.');
  if (request.auth.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Only an administrator can provision accounts.');
  }
}

function requireAuthenticated(request: CallableRequest<unknown>): NonNullable<CallableRequest<unknown>['auth']> {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign-in is required.');
  return request.auth;
}

function getString(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > maxLength) {
    throw new HttpsError('invalid-argument', `${label} is invalid.`);
  }
  return value.trim();
}

function getEmail(value: unknown): string {
  const email = getString(value, 'Email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError('invalid-argument', 'Email is invalid.');
  }
  return email;
}

function temporaryPassword(): string {
  return `${randomBytes(18).toString('base64url')}Aa1!`;
}

function normalizedProfileRole(role: 'admin' | 'branch'): 'admin' | 'branch' {
  return role === 'admin' ? 'admin' : 'branch';
}

export const provisionUser = onCall(async (request) => {
  requireAdmin(request);
  const payload = (request.data || {}) as ProvisionPayload;
  const name = getString(payload.name, 'Name', 120);
  const email = getEmail(payload.email);
  const role = payload.role === 'admin' || payload.role === 'branch' ? payload.role : null;
  if (!role) throw new HttpsError('invalid-argument', 'Role must be admin or branch.');

  const branchId = role === 'branch' ? getString(payload.branchId, 'Branch', 80) : undefined;
  const branchRole = role === 'branch' ? getString(payload.branchRole || 'Staff', 'Branch role', 40) as AccountRole : undefined;
  if (branchRole && !permissionsByRole[branchRole]) {
    throw new HttpsError('invalid-argument', 'Branch role is invalid.');
  }

  const branchSnapshot = branchId ? await db.doc(`branches/${branchId}`).get() : null;
  if (branchId && !branchSnapshot?.exists) {
    throw new HttpsError('not-found', 'The selected branch does not exist.');
  }

  const password = temporaryPassword();
  let userRecord;
  try {
    userRecord = await adminAuth.createUser({ email, displayName: name, password });
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? String((error as { code?: unknown }).code) : '';
    if (code.includes('email-already-exists')) {
      throw new HttpsError('already-exists', 'An account with this email already exists.');
    }
    throw new HttpsError('internal', 'The Firebase account could not be created.');
  }

  const profile = {
    id: userRecord.uid,
    firebaseUid: userRecord.uid,
    name,
    email,
    role: normalizedProfileRole(role),
    ...(branchId ? { branchId, branchName: branchSnapshot?.data()?.name || '' } : {}),
    createdAt: new Date().toISOString(),
  };

  try {
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      role: normalizedProfileRole(role),
      ...(branchId ? { branchId } : {}),
    });

    const batch = db.batch();
    batch.set(db.doc(`users/${userRecord.uid}`), profile);
    if (branchId && branchRole) {
      batch.set(db.doc(`branch_accounts/${userRecord.uid}`), {
        id: userRecord.uid,
        branchId,
        branchName: branchSnapshot?.data()?.name || '',
        username: email.split('@')[0],
        fullName: name,
        email,
        ...(typeof payload.phone === 'string' && payload.phone.trim() ? { phone: payload.phone.trim() } : {}),
        role: branchRole,
        permissions: permissionsByRole[branchRole],
        isActive: true,
        credentialsSent: false,
        createdAt: new Date().toISOString(),
      });
    }
    await batch.commit();

    let passwordResetLink: string | undefined;
    try {
      passwordResetLink = await adminAuth.generatePasswordResetLink(email);
    } catch {
      // Password reset link generation depends on Firebase Auth action-link configuration.
    }

    return { user: profile, accountId: branchId && branchRole ? userRecord.uid : undefined, passwordResetLink };
  } catch (error) {
    await adminAuth.deleteUser(userRecord.uid).catch(() => undefined);
    throw error instanceof HttpsError ? error : new HttpsError('internal', 'The account profile could not be saved.');
  }
});

export const resolveMyProfile = onCall(async (request) => {
  const authContext = requireAuthenticated(request);
  const profileRef = db.doc(`users/${authContext.uid}`);
  const profileSnapshot = await profileRef.get();
  if (profileSnapshot.exists) return { user: { ...profileSnapshot.data(), id: authContext.uid, firebaseUid: authContext.uid } };

  const email = authContext.token.email;
  if (typeof email !== 'string') throw new HttpsError('failed-precondition', 'The Firebase account has no email address.');
  const legacySnapshot = await db.collection('users').where('email', '==', email.toLowerCase()).limit(1).get();
  if (legacySnapshot.empty) throw new HttpsError('not-found', 'No VertexIS profile is linked to this Firebase account.');

  const legacyProfile = legacySnapshot.docs[0].data();
  const claims = authContext.token;
  const migratedProfile = {
    ...legacyProfile,
    id: authContext.uid,
    firebaseUid: authContext.uid,
    role: claims.role === 'admin' || claims.role === 'branch' ? claims.role : legacyProfile.role,
    ...(typeof claims.branchId === 'string' ? { branchId: claims.branchId } : {}),
    migratedAt: new Date().toISOString(),
  };
  await profileRef.set(migratedProfile, { merge: true });
  return { user: migratedProfile };
});

export const resetUserPassword = onCall(async (request) => {
  requireAdmin(request);
  const accountId = getString((request.data as { accountId?: unknown } | undefined)?.accountId, 'Account', 128);
  const accountSnapshot = await db.doc(`branch_accounts/${accountId}`).get();
  if (!accountSnapshot.exists) throw new HttpsError('not-found', 'The account does not exist.');
  const email = getEmail(accountSnapshot.data()?.email);
  const passwordResetLink = await adminAuth.generatePasswordResetLink(email);
  await accountSnapshot.ref.set({ credentialsSent: false, credentialsResetAt: FieldValue.serverTimestamp() }, { merge: true });
  return { passwordResetLink };
});

export const updateUserAccess = onCall(async (request) => {
  requireAdmin(request);
  const payload = (request.data || {}) as { userId?: unknown; role?: unknown; branchId?: unknown };
  const userId = getString(payload.userId, 'User', 128);
  const role = payload.role === 'admin' || payload.role === 'branch' ? payload.role : null;
  if (!role) throw new HttpsError('invalid-argument', 'Role must be admin or branch.');
  const branchId = role === 'branch' ? getString(payload.branchId, 'Branch', 80) : undefined;

  const legacySnapshot = await db.doc(`users/${userId}`).get();
  if (!legacySnapshot.exists) throw new HttpsError('not-found', 'The user profile does not exist.');
  const profileData = legacySnapshot.data() || {};
  let targetUid = typeof profileData.firebaseUid === 'string' ? profileData.firebaseUid : userId;
  if (!profileData.firebaseUid && typeof profileData.email === 'string') {
    try {
      targetUid = (await adminAuth.getUserByEmail(profileData.email)).uid;
    } catch {
      throw new HttpsError('failed-precondition', 'Link this profile to a Firebase Auth account first.');
    }
  }

  const branchSnapshot = branchId ? await db.doc(`branches/${branchId}`).get() : null;
  if (branchId && !branchSnapshot?.exists) throw new HttpsError('not-found', 'The selected branch does not exist.');

  await adminAuth.setCustomUserClaims(targetUid, {
    role: normalizedProfileRole(role),
    ...(branchId ? { branchId } : {}),
  });
  const updatedProfile: Record<string, unknown> = {
    ...profileData,
    id: targetUid,
    firebaseUid: targetUid,
    role: normalizedProfileRole(role),
    branchName: branchId ? branchSnapshot?.data()?.name || '' : 'Central Commissary HQ',
    updatedAt: new Date().toISOString(),
  };
  if (branchId) updatedProfile.branchId = branchId;
  else delete updatedProfile.branchId;
  await db.doc(`users/${targetUid}`).set(updatedProfile);
  return { user: updatedProfile };
});
