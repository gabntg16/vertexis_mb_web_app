import { describe, it, expect } from 'vitest';
import {
  validateBranchAccess,
  validatePaymentProof,
  isSuperAdmin,
  isBranchManager,
  isBranchStaff,
} from '../utils/securityValidator';
import { Role, UserModel } from '../types';

describe('Security & Role-Based Access Control (RBAC) Test Suite', () => {
  const staffUser: UserModel = {
    id: 'u-legazpi-staff',
    name: 'Maria Santos (Staff)',
    email: 'staff.legazpi@marshbites.com',
    role: 'branch',
    rbacTier: 'BRANCH_STAFF',
    branchId: 'b-legazpi',
    branchName: 'Marsh Bites - Legazpi City',
  };

  const managerUser: UserModel = {
    id: 'u-legazpi',
    name: 'Elena Rostro (Lead)',
    email: 'legazpi@marshbites.com',
    role: 'branch',
    rbacTier: 'BRANCH_MANAGER',
    branchId: 'b-legazpi',
    branchName: 'Marsh Bites - Legazpi City',
  };

  const superAdminUser: UserModel = {
    id: 'u-hq-admin',
    name: 'Chef Bea Ramos (HQ Exec)',
    email: 'hq@marshbites.com',
    role: 'admin',
    rbacTier: 'SUPER_ADMIN',
  };

  it('correctly classifies user tiers using 3-tier RBAC predicates', () => {
    expect(isBranchStaff(staffUser)).toBe(true);
    expect(isBranchManager(staffUser)).toBe(false);
    expect(isSuperAdmin(staffUser)).toBe(false);

    expect(isBranchStaff(managerUser)).toBe(false);
    expect(isBranchManager(managerUser)).toBe(true);
    expect(isSuperAdmin(managerUser)).toBe(false);

    expect(isBranchStaff(superAdminUser)).toBe(false);
    expect(isBranchManager(superAdminUser)).toBe(false);
    expect(isSuperAdmin(superAdminUser)).toBe(true);
  });

  it('allows admin full unrestricted access to any branch data', () => {
    const result1 = validateBranchAccess('admin', undefined, 'b-legazpi');
    expect(result1.valid).toBe(true);

    const result2 = validateBranchAccess('admin', undefined, 'b-cabuyao');
    expect(result2.valid).toBe(true);

    const result3 = validateBranchAccess('admin', undefined, 'b-makati');
    expect(result3.valid).toBe(true);
  });

  it('allows branch manager access only to their designated branch', () => {
    const result = validateBranchAccess('branch', 'b-legazpi', 'b-legazpi');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('strictly rejects cross-branch data tampering or queries', () => {
    const result = validateBranchAccess('branch', 'b-legazpi', 'b-cabuyao');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Cross-Branch Access Violation');
  });

  it('rejects unassigned branch users without branch ID', () => {
    const result = validateBranchAccess('branch', undefined, 'b-legazpi');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Access Denied: Unassigned branch user');
  });

  it('validates payment proof format and forbids empty or malformed strings', () => {
    expect(validatePaymentProof(undefined).valid).toBe(false);
    expect(validatePaymentProof('').valid).toBe(false);
    expect(validatePaymentProof('ftp://malicious-file.exe').valid).toBe(false);
    expect(
      validatePaymentProof('https://images.unsplash.com/photo-1554224155-8d04cb21cd6c').valid
    ).toBe(true);
    expect(
      validatePaymentProof(
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
      ).valid
    ).toBe(true);
  });
});

