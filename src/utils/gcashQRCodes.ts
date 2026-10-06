import { PACKAGE_PRICES } from '../../functions/src/transactionModel';
// Static GCash payment images provided for each package tier.
export const GCASH_TIER_QR_CODES = {
  silver: '/gcash-silver.jpg',
  gold: '/gcash-gold.jpg',
  platinum: '/gcash-platinum.jpg',
} as const;

export type GCashTier = keyof typeof GCASH_TIER_QR_CODES;

export const GCASH_GENERIC_QR_CODE = '/gcash-generic.jpg';
export function getGCashQRCode(tier: GCashTier, packs: number, total: number): string {
 const base = PACKAGE_PRICES[tier];
 return packs === base.baseCapacity && total === base.price ? GCASH_TIER_QR_CODES[tier] : GCASH_GENERIC_QR_CODE;
}
