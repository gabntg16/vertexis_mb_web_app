import { Order, OrderItem, ProductionStage, BatchStage, Sale, InventoryItem, Product, UserRole, Role, RoleType, UserModel } from '../types';

/**
 * Security, RBAC, and Business Logic Validation Engine
 * Guards against bugs, negative stock, race conditions, unauthorized mutations, and invalid state transitions.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// Helper predicates for 3-Tier RBAC Architecture
export function isSuperAdmin(user?: UserModel | null | string): boolean {
  if (!user) return false;
  if (typeof user !== 'string') {
    if (user.rbacTier) {
      return user.rbacTier === 'SUPER_ADMIN';
    }
    const roleStr = user.role as string;
    return roleStr === Role.SUPER_ADMIN || roleStr === 'SUPER_ADMIN' || roleStr === 'admin';
  }
  return user === Role.SUPER_ADMIN || user === 'SUPER_ADMIN' || user === 'admin';
}

export function isBranchManager(user?: UserModel | null | string): boolean {
  if (!user) return false;
  if (typeof user !== 'string') {
    if (user.rbacTier) {
      return user.rbacTier === 'BRANCH_MANAGER';
    }
    const roleStr = user.role as string;
    return (
      roleStr === Role.BRANCH_MANAGER ||
      roleStr === 'BRANCH_MANAGER' ||
      (roleStr === 'branch' && !user.name?.toLowerCase().includes('staff'))
    );
  }
  return user === Role.BRANCH_MANAGER || user === 'BRANCH_MANAGER' || user === 'branch';
}

export function isBranchStaff(user?: UserModel | null | string): boolean {
  if (!user) return false;
  if (typeof user !== 'string') {
    if (user.rbacTier) {
      return user.rbacTier === 'BRANCH_STAFF';
    }
    const roleStr = user.role as string;
    return (
      roleStr === Role.BRANCH_STAFF ||
      roleStr === 'BRANCH_STAFF' ||
      roleStr === 'staff' ||
      (roleStr === 'branch' && (user.name?.toLowerCase().includes('staff') || user.email?.toLowerCase().includes('staff')))
    );
  }
  return user === Role.BRANCH_STAFF || user === 'BRANCH_STAFF' || user === 'staff';
}

// 1. RBAC & Cross-Branch Authorization Guard
export function validateBranchAccess(
  userRole: Role | UserRole | RoleType | 'admin' | 'branch' | string,
  userBranchId: string | undefined,
  targetBranchId: string
): ValidationResult {
  if (userRole === Role.SUPER_ADMIN || userRole === 'SUPER_ADMIN' || userRole === 'admin') {
    return { valid: true };
  }
  if (
    userRole === Role.BRANCH_MANAGER ||
    userRole === 'BRANCH_MANAGER' ||
    userRole === Role.BRANCH_STAFF ||
    userRole === 'BRANCH_STAFF' ||
    userRole === 'branch'
  ) {
    if (!userBranchId) {
      return { valid: false, error: 'Access Denied: Unassigned branch user.' };
    }
    if (userBranchId !== targetBranchId) {
      return {
        valid: false,
        error: `Cross-Branch Access Violation: User from ${userBranchId} attempted to access data for ${targetBranchId}.`,
      };
    }
    return { valid: true };
  }
  return { valid: false, error: 'Unknown role authorization.' };
}

// 1.1 Action-Specific RBAC Guards
export function validateRequisitionCreation(userRole: string): ValidationResult {
  if (userRole === Role.BRANCH_STAFF || userRole === 'BRANCH_STAFF') {
    return {
      valid: false,
      error: 'Access Denied: Branch Staff are strictly restricted from drafting or placing stock requisitions.',
    };
  }
  return { valid: true };
}

export function validatePaymentProofUpload(userRole: string): ValidationResult {
  if (userRole === Role.BRANCH_STAFF || userRole === 'BRANCH_STAFF') {
    return {
      valid: false,
      error: 'Access Denied: Branch Staff are strictly restricted from uploading Proof of Payment receipts.',
    };
  }
  return { valid: true };
}

export function validateShiftLogApproval(userRole: string): ValidationResult {
  if (userRole === Role.BRANCH_STAFF || userRole === 'BRANCH_STAFF') {
    return {
      valid: false,
      error: 'Access Denied: Branch Staff are restricted from approving or locking inventory logs.',
    };
  }
  return { valid: true };
}

export function validatePriceChange(userRole: string): ValidationResult {
  if (!isSuperAdmin(userRole)) {
    return {
      valid: false,
      error: 'Access Denied: Only Super Admin (Headquarters) can alter global menu pricing and SKUs.',
    };
  }
  return { valid: true };
}

export function validateOrderApprovalAccess(userRole: string): ValidationResult {
  if (!isSuperAdmin(userRole)) {
    return {
      valid: false,
      error: 'Access Denied: Only Headquarters Super Admin can issue final order approvals and verify digital payments.',
    };
  }
  return { valid: true };
}

export function validateUserManagementAccess(userRole: string): ValidationResult {
  if (!isSuperAdmin(userRole)) {
    return {
      valid: false,
      error: 'Access Denied: Only Super Admin can manage system users and assign RBAC roles.',
    };
  }
  return { valid: true };
}

export function validateAnalyticsAccess(
  userRole: string,
  userBranchId?: string,
  targetBranchId?: string
): ValidationResult {
  if (isBranchStaff(userRole)) {
    return {
      valid: false,
      error: 'Access Denied: Branch Staff are restricted from viewing sales, analytics, and price lists.',
    };
  }
  if (isBranchManager(userRole)) {
    if (targetBranchId && userBranchId && userBranchId !== targetBranchId) {
      return {
        valid: false,
        error: `Cross-Branch Violation: Branch Managers can only view analytics for their assigned branch (${userBranchId}).`,
      };
    }
    return { valid: true };
  }
  if (isSuperAdmin(userRole)) {
    return { valid: true };
  }
  return { valid: false, error: 'Unauthorized role.' };
}

// 2. Order Line Item & Math Integrity Guard
export function validateOrderPayload(items: OrderItem[]): ValidationResult {
  if (!items || items.length === 0) {
    return { valid: false, error: 'Order must contain at least one item.' };
  }
  for (const item of items) {
    if (!item.productId || typeof item.productId !== 'string') {
      return { valid: false, error: 'Invalid product ID in order item.' };
    }
    if (!Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
      return { valid: false, error: `Invalid item quantity (${item.quantity}). Quantity must be a positive integer.` };
    }
    if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
      return { valid: false, error: `Invalid unit price (${item.unitPrice}). Price cannot be negative.` };
    }
  }
  return { valid: true };
}

export function computeOrderTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

// 3. POS Transaction & Anti-Negative Stock Guard
export function validatePOSSale(
  inventoryItem: InventoryItem | undefined,
  saleQty: number,
  unitPrice: number,
  amountTendered?: number
): ValidationResult {
  if (!inventoryItem) {
    return { valid: false, error: 'Inventory record not found for selected product.' };
  }
  if (!Number.isFinite(saleQty) || saleQty <= 0 || !Number.isInteger(saleQty)) {
    return { valid: false, error: `Invalid sale quantity (${saleQty}). Must be a positive integer.` };
  }
  if (inventoryItem.stock < saleQty) {
    return {
      valid: false,
      error: `Insufficient Stock: Cannot sell ${saleQty} units. Available stock is only ${inventoryItem.stock} units.`,
    };
  }
  const totalAmount = saleQty * unitPrice;
  if (amountTendered !== undefined && amountTendered < totalAmount) {
    return {
      valid: false,
      error: `Insufficient Payment: Tendered ₱${amountTendered} is less than total ₱${totalAmount}.`,
    };
  }
  return { valid: true };
}

// 4. Central Commissary Stock Allocation Guard
export function validateCommissaryAllocation(
  product: Product | undefined,
  transferQty: number
): ValidationResult {
  if (!product) {
    return { valid: false, error: 'Product not found in commissary catalog.' };
  }
  if (!Number.isFinite(transferQty) || transferQty <= 0 || !Number.isInteger(transferQty)) {
    return { valid: false, error: 'Transfer quantity must be a positive integer.' };
  }
  if (product.adminStock < transferQty) {
    return {
      valid: false,
      error: `Allocation Failed: Insufficient central buffer stock. Available: ${product.adminStock} units, Requested: ${transferQty} units.`,
    };
  }
  return { valid: true };
}

// 5. Made-to-Order Kitchen Stage Progression Finite State Machine
const VALID_MTO_STAGE_TRANSITIONS: Record<ProductionStage, ProductionStage[]> = {
  queued: ['in_kettle', 'curing', 'packaged', 'ready_for_dispatch'],
  in_kettle: ['curing', 'packaged', 'ready_for_dispatch'],
  curing: ['packaged', 'ready_for_dispatch'],
  packaged: ['ready_for_dispatch'],
  ready_for_dispatch: [], // Terminal stage
};

export function validateMTOStageTransition(
  currentStage: ProductionStage,
  nextStage: ProductionStage
): ValidationResult {
  if (currentStage === nextStage) {
    return { valid: true };
  }
  const allowed = VALID_MTO_STAGE_TRANSITIONS[currentStage];
  if (!allowed || !allowed.includes(nextStage)) {
    return {
      valid: false,
      error: `Illegal Stage Transition: Cannot transition MTO order from '${currentStage}' to '${nextStage}'.`,
    };
  }
  return { valid: true };
}

// 6. Batch Code Format Validator (e.g. MTO-LEG-0818)
export function isValidBatchCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  const regex = /^MTO-[A-Z0-9]{3,6}-[0-9]{4,8}$/i;
  return regex.test(code);
}

// 7. Payment Proof Validator
export function validatePaymentProof(proofUrl: string | undefined): ValidationResult {
  if (!proofUrl || proofUrl.trim().length === 0) {
    return { valid: false, error: 'Payment receipt / transaction proof is required.' };
  }
  if (!proofUrl.startsWith('http://') && !proofUrl.startsWith('https://') && !proofUrl.startsWith('data:image/')) {
    return { valid: false, error: 'Payment proof must be a valid HTTPS URL or image data.' };
  }
  return { valid: true };
}

// 8. Order Lifecycle & Approval Validator
export function validateOrderApproval(order: Order | undefined): ValidationResult {
  if (!order) {
    return { valid: false, error: 'Order record not found.' };
  }
  if (!order.proofImagePath || order.proofImagePath.trim() === '') {
    return { valid: false, error: 'Payment proof required before approval.' };
  }
  return { valid: true };
}

// 9. Commissary Batching Prerequisites Guard
export function validateOrderBatching(order: Order | undefined): ValidationResult {
  if (!order) {
    return { valid: false, error: 'Order record not found.' };
  }
  if (order.status !== 'approved') {
    return { valid: false, error: 'Order must be strictly approved before commissary batching.' };
  }
  if (!order.proofImagePath || order.proofImagePath.trim() === '') {
    return { valid: false, error: 'Payment proof must be verified before commissary batching.' };
  }
  return { valid: true };
}

// 10. Delivery Dispatch Prerequisites Guard (MTO Ready Requirement)
export function validateOrderDispatch(order: Order | undefined): ValidationResult {
  if (!order) {
    return { valid: false, error: 'Order record not found.' };
  }
  if (order.status !== 'approved') {
    return { valid: false, error: 'Order must be approved before dispatch.' };
  }
  const isMTOReady = order.productionStage === 'ready_for_dispatch' || (order.productionStage as string) === 'ready';
  if (!isMTOReady) {
    return { valid: false, error: "MTO branch request must be marked 'Ready' before dispatch." };
  }
  return { valid: true };
}

// 11. Daily Demand & Forecast Math Helper
export function calculateAverageDailySales(sales: Sale[], daysWindow: number = 7): number {
  if (!sales || sales.length === 0) return 0;
  const now = new Date().getTime();
  const windowMillis = daysWindow * 24 * 60 * 60 * 1000;
  const filteredSales = sales.filter((s) => {
    const saleTime = new Date(s.date).getTime();
    return now - saleTime <= windowMillis;
  });
  const totalUnitsSold = filteredSales.reduce((sum, s) => sum + s.quantity, 0);
  return Number((totalUnitsSold / Math.max(1, daysWindow)).toFixed(2));
}
