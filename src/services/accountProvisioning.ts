import { httpsCallable } from 'firebase/functions';
import { functions, isFirebaseConfigured } from '../lib/firebase';
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
