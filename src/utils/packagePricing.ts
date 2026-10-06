import { PACKAGE_PRICES, wholeQuantity } from '../../functions/src/transactionModel';
export type PackageTierId = keyof typeof PACKAGE_PRICES;
export interface PackageTier { id: PackageTierId; name: string; price: number; baseCapacity: number; maxCap: number; extraPackRate: number; rangeLabel: string }
export const PACKAGE_TIERS: PackageTier[] = (Object.keys(PACKAGE_PRICES) as PackageTierId[]).map(id => ({ id, ...PACKAGE_PRICES[id], rangeLabel: id === 'platinum' ? '70+ packs' : id === 'silver' ? '35–54 packs' : '55–69 packs' }));
export function calculatePackagePrice(tier: PackageTier, totalPacks: number) {
  wholeQuantity(totalPacks, true);
  const excessPacks = Math.max(0, totalPacks - tier.baseCapacity);
  return { totalPrice: totalPacks === 0 ? 0 : tier.price + excessPacks * tier.extraPackRate, isExceeded: excessPacks > 0, excessPacks, ratePerPack: tier.extraPackRate };
}
export function upgradePackageQuantities(quantities: Record<string, number>, tier: PackageTier, fallbackProductId?: string) {
  const total = Object.values(quantities).reduce((sum, value) => sum + value, 0);
  const firstId = Object.keys(quantities).find(id => quantities[id] > 0) || fallbackProductId;
  if (!firstId || total >= tier.baseCapacity) return quantities;
  return { ...quantities, [firstId]: (quantities[firstId] || 0) + tier.baseCapacity - total };
}
export function clampPackageQuantity(quantities: Record<string, number>, productId: string, requested: number, tier: PackageTier) {
  const otherPacks = Object.entries(quantities).reduce((sum, [id, quantity]) => sum + (id === productId ? 0 : quantity), 0);
  const safe = Number.isFinite(requested) ? Math.max(0, Math.floor(requested)) : 0;
  return Math.min(safe, Math.max(0, tier.maxCap - otherPacks));
}
