// Shared, SDK-free validation. Monetary arithmetic uses integer centavos.
export const PACKAGE_PRICES = {
  silver: { name: 'Silver', price: 3999, baseCapacity: 35, maxCap: 54 },
  gold: { name: 'Gold', price: 5775, baseCapacity: 55, maxCap: 69 },
  platinum: { name: 'Platinum', price: 7000, baseCapacity: 70, maxCap: 999 },
} as const;

export function wholeQuantity(value: unknown, allowZero = false): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < (allowZero ? 0 : 1) || value > 1000000) throw new Error('Quantity must be a whole number within the allowed range.');
  return value;
}
export function money(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100000000) throw new Error('Invalid monetary amount.');
  return Math.round(value * 100);
}
export function packageTotal(tier: keyof typeof PACKAGE_PRICES, packs: number): number {
  if (!Object.prototype.hasOwnProperty.call(PACKAGE_PRICES, tier)) throw new Error('Select a valid package.');
  const config = PACKAGE_PRICES[tier];
  wholeQuantity(packs);
  if (!config || packs < config.baseCapacity || packs > config.maxCap) throw new Error('Select a package that supports this quantity.');
  return Math.round(config.price * 100 * Math.max(config.baseCapacity, packs) / config.baseCapacity) / 100;
}
export function validId(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(value)) throw new Error('Invalid record reference.');
  return value;
}
export function boundedText(value: unknown, max: number, required = false): string {
  if (value === undefined && !required) return '';
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new Error('Enter valid text within the allowed length.');
  return value.trim();
}
export function paymentReady(order: { status?: unknown; paymentStatus?: unknown; paymentVerifiedAt?: unknown; proofImagePath?: unknown }): boolean {
  return order.status === 'approved' && order.paymentStatus === 'SUCCESSFUL' && Boolean(order.paymentVerifiedAt) && Boolean(order.proofImagePath);
}

export function businessDate(date = new Date()): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
}
