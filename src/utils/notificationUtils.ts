import {
  NotificationKind,
  NotificationPriority,
  NotificationAudience,
  Announcement,
  UserModel,
  Branch,
} from '../types';

export interface NotificationKindMeta {
  key: NotificationKind;
  label: string;
  description: string;
  iconName: string;
  bgLight: string;
  bgDark: string;
  textLight: string;
  textDark: string;
  borderColor: string;
}

export const NOTIFICATION_KINDS: Record<NotificationKind, NotificationKindMeta> = {
  order: {
    key: 'order',
    label: 'Order Requisition',
    description: 'B2B stock replenishment, approvals, payment proofs & receiving',
    iconName: 'ShoppingBag',
    bgLight: 'bg-blue-50',
    bgDark: 'bg-blue-950/40',
    textLight: 'text-blue-700',
    textDark: 'text-blue-400',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  production: {
    key: 'production',
    label: 'Kitchen Production',
    description: 'Commissary kettle batches, cooking, curing & dispatch readiness',
    iconName: 'ChefHat',
    bgLight: 'bg-amber-50',
    bgDark: 'bg-amber-950/40',
    textLight: 'text-amber-700',
    textDark: 'text-amber-400',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  logistics: {
    key: 'logistics',
    label: 'Logistics & Dispatch',
    description: 'J&T Express waybills, in-transit fleet & delivery arrivals',
    iconName: 'Truck',
    bgLight: 'bg-sky-50',
    bgDark: 'bg-sky-950/40',
    textLight: 'text-sky-700',
    textDark: 'text-sky-400',
    borderColor: 'border-sky-200 dark:border-sky-800',
  },
  inventory: {
    key: 'inventory',
    label: 'Inventory & Stock Alert',
    description: 'Low safety stock, stockout risks, spoilage waste & audit variances',
    iconName: 'Boxes',
    bgLight: 'bg-rose-50',
    bgDark: 'bg-rose-950/40',
    textLight: 'text-rose-700',
    textDark: 'text-rose-400',
    borderColor: 'border-rose-200 dark:border-rose-800',
  },
  pos: {
    key: 'pos',
    label: 'Retail POS & BIR',
    description: 'Cash drawer shifts, BIR compliance, senior discounts & Z-Readings',
    iconName: 'Receipt',
    bgLight: 'bg-purple-50',
    bgDark: 'bg-purple-950/40',
    textLight: 'text-purple-700',
    textDark: 'text-purple-400',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
  general: {
    key: 'general',
    label: 'General Directive',
    description: 'Official corporate memos, promo notices & company policies',
    iconName: 'Megaphone',
    bgLight: 'bg-neutral-100',
    bgDark: 'bg-neutral-800',
    textLight: 'text-neutral-700',
    textDark: 'text-neutral-300',
    borderColor: 'border-neutral-200 dark:border-neutral-700',
  },
};

export const NOTIFICATION_PRIORITIES: Record<
  NotificationPriority,
  { label: string; badgeClass: string; dotClass: string }
> = {
  normal: {
    label: 'Standard',
    badgeClass: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
    dotClass: 'bg-neutral-400',
  },
  info: {
    label: 'Info',
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    dotClass: 'bg-blue-500',
  },
  warning: {
    label: 'Warning',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    dotClass: 'bg-amber-500',
  },
  urgent: {
    label: 'Urgent Action',
    badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400 font-bold',
    dotClass: 'bg-rose-500 animate-pulse',
  },
  success: {
    label: 'Completed',
    badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    dotClass: 'bg-emerald-500',
  },
};

export const AUDIENCE_OPTIONS: { key: NotificationAudience; label: string; description: string }[] = [
  { key: 'all', label: 'Everyone (All Roles)', description: 'Visible across all HQ & branch accounts' },
  { key: 'admin', label: 'HQ Admin & Executives', description: 'Central Commissary management & leadership' },
  { key: 'branch_manager', label: 'Branch Managers', description: 'Store branch managers and franchise operators' },
  { key: 'cashier', label: 'Cashiers & Store Crew', description: 'Frontline retail cashier and sales team' },
  { key: 'commissary_staff', label: 'Commissary Staff', description: 'Kitchen cooks, inventory specialists & packers' },
];

/**
 * Filter notifications based on "WHO" and "WHERE" authorization rules
 */
export function filterNotificationsForUser(
  announcements: Announcement[],
  currentUser?: UserModel | null,
  currentBranch?: Branch | null
): Announcement[] {
  if (!currentUser) return [];

  const isAdmin = currentUser.role === 'admin';
  const userBranchId = currentBranch?.id || currentUser.branchId;

  return announcements.filter((ann) => {
    // 1. WHO CAN SEE (Audience Check)
    if (ann.targetAudience && ann.targetAudience.length > 0) {
      if (isAdmin) {
        // Admins can supervise all alerts, but if strictly checking audience:
        // Admin matches if 'all' or 'admin' is included
        // We allow admin to see all system alerts to oversee franchise operations
      } else {
        // Branch staff check
        const isTargeted =
          ann.targetAudience.includes('all') ||
          ann.targetAudience.includes('branch_manager') ||
          ann.targetAudience.includes('cashier');

        if (!isTargeted) {
          return false; // Exclude notifications meant strictly for admin or commissary staff
        }
      }
    }

    // 2. WHERE (Location Scope Check)
    if (!isAdmin) {
      // If scoped to a specific branch, must match user's branch
      if (ann.targetBranchId && ann.targetBranchId !== 'ALL') {
        if (userBranchId && ann.targetBranchId !== userBranchId) {
          return false; // Not meant for this branch!
        }
      }
    }

    return true;
  });
}

/**
 * Returns a human-friendly location string
 */
export function getLocationDisplay(ann: Announcement): {
  label: string;
  isNationwide: boolean;
  isCommissary: boolean;
} {
  if (ann.scope === 'commissary') {
    return {
      label: ann.targetBranchName || 'Naga Central Commissary Hub',
      isNationwide: false,
      isCommissary: true,
    };
  }

  if (ann.targetBranchId === 'ALL' || ann.scope === 'nationwide' || !ann.targetBranchId) {
    return {
      label: 'Nationwide (All 19 Branches)',
      isNationwide: true,
      isCommissary: false,
    };
  }

  return {
    label: ann.targetBranchName || `Branch (${ann.targetBranchId})`,
    isNationwide: false,
    isCommissary: false,
  };
}

/**
 * Returns human-readable audience labels
 */
export function getAudienceDisplay(ann: Announcement): string {
  if (!ann.targetAudience || ann.targetAudience.length === 0 || ann.targetAudience.includes('all')) {
    return 'All Store Personnel';
  }

  const labels = ann.targetAudience.map((aud) => {
    switch (aud) {
      case 'admin':
        return 'HQ Admin';
      case 'branch_manager':
        return 'Branch Managers';
      case 'cashier':
        return 'Cashiers';
      case 'commissary_staff':
        return 'Commissary Staff';
      default:
        return aud;
    }
  });

  return labels.join(', ');
}
