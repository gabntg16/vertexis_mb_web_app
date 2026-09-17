import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { UserModel } from '../types';

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
  return (await callProvisionUser(payload)).data;
}

export async function resolveMyProfile(): Promise<UserModel> {
  return (await callResolveProfile()).data.user;
}

export async function resetUserPassword(accountId: string): Promise<{ passwordResetLink: string }> {
  return (await callResetPassword({ accountId })).data;
}

export async function updateUserAccess(payload: {
  userId: string;
  role: 'admin' | 'branch';
  branchId?: string;
}): Promise<UserModel> {
  const call = httpsCallable<typeof payload, ProfileResult>(functions, 'updateUserAccess');
  return (await call(payload)).data.user;
}
