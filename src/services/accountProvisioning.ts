import { httpsCallable } from 'firebase/functions';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db, functions, isFirebaseConfigured } from '../lib/firebase';
import { UserModel, Role } from '../types';

export interface ProvisionUserPayload {
  name: string;
  email: string;
  role: 'admin' | 'branch';
  branchId?: string;
  branchRole?: 'Branch Manager' | 'Staff' | 'Cashier' | 'Inventory Specialist';
  phone?: string;
}

export interface ProvisionUserResult {
  user: UserModel;
  accountId?: string;
  passwordResetLink?: string;
}

interface ProfileResult {
  user: UserModel;
}

const callProvisionUser = httpsCallable<ProvisionUserPayload, ProvisionUserResult>(functions, 'provisionUser');
const callResolveProfile = httpsCallable<void, ProfileResult>(functions, 'resolveMyProfile');
const callResetPassword = httpsCallable<{ accountId: string }, { passwordResetLink: string }>(
  functions,
  'resetUserPassword'
);

export async function provisionUser(payload: ProvisionUserPayload): Promise<ProvisionUserResult> {
  if (!isFirebaseConfigured) {
    const role =
      payload.role === 'admin'
        ? Role.SUPER_ADMIN
        : payload.branchRole === 'Branch Manager'
        ? Role.BRANCH_MANAGER
        : Role.BRANCH_STAFF;

    return {
      user: {
        id: `u-${Date.now()}`,
        name: payload.name,
        email: payload.email,
        role,
        branchId: payload.branchId,
        branchName: payload.branchId || 'Branch',
      },
      accountId: `acc-${Date.now()}`,
      passwordResetLink: '#demo-reset-link',
    };
  }
  return (await callProvisionUser(payload)).data;
}

export async function resolveMyProfile(): Promise<UserModel> {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase is not configured.');
  }
  return (await callResolveProfile()).data.user;
}

export async function resetUserPassword(accountId: string): Promise<{ passwordResetLink: string }> {
  if (!isFirebaseConfigured) {
    return { passwordResetLink: '#demo-reset-link' };
  }
  return (await callResetPassword({ accountId })).data;
}

export async function updateUserAccess(payload: {
  userId: string;
  role: 'admin' | 'branch';
  branchId?: string;
}): Promise<UserModel> {
  if (!isFirebaseConfigured) {
    return {
      id: payload.userId,
      name: 'User',
      email: 'user@marshbites.ph',
      role: payload.role === 'admin' ? Role.SUPER_ADMIN : Role.BRANCH_STAFF,
      branchId: payload.branchId,
    };
  }
  const call = httpsCallable<typeof payload, ProfileResult>(functions, 'updateUserAccess');
  return (await call(payload)).data.user;
}

// Approval may be retried after one account succeeds and the next step fails.
export async function provisionApplicationAccount(payload: ProvisionUserPayload): Promise<ProvisionUserResult> {
  const existingAccount = async (): Promise<ProvisionUserResult | undefined> => {
    const accounts = await getDocs(query(collection(db, 'branch_accounts'), where('branchId', '==', payload.branchId)));
    const account = accounts.docs.find(row => row.data().email?.toLowerCase() === payload.email.toLowerCase() && row.data().role === payload.branchRole);
    if (!account) return;
    const profile = await getDoc(doc(db, 'users', account.id));
    if (!profile.exists() || profile.data().branchId !== payload.branchId) throw new Error('The existing account profile needs repair before approval can continue.');
    return { accountId: account.id, user: { ...profile.data(), id: profile.id } as UserModel };
  };
  if (!isFirebaseConfigured) return provisionUser(payload);
  const existing = await existingAccount();
  if (existing) return existing;
  try { return await provisionUser(payload); }
  catch (error) {
    if ((error as { code?: string }).code === 'functions/already-exists') {
      const completed = await existingAccount();
      if (completed) return completed;
    }
    throw error;
  }
}
