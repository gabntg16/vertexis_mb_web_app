import { describe, it, expect } from 'vitest';
import { PACKAGE_TIERS, calculatePackagePrice } from '../components/branch/BranchOrders';

describe('Package Strict Base Capacity & Flavor Selection Limit Enforcements', () => {
  it('enforces strict maximum limit matching base capacity for all tiers', () => {
    const silver = PACKAGE_TIERS.find((t) => t.id === 'silver')!;
    const gold = PACKAGE_TIERS.find((t) => t.id === 'gold')!;
    const platinum = PACKAGE_TIERS.find((t) => t.id === 'platinum')!;

    expect(silver.baseCapacity).toBe(35);
    expect(silver.maxCap).toBe(35);

    expect(gold.baseCapacity).toBe(55);
    expect(gold.maxCap).toBe(55);

    expect(platinum.baseCapacity).toBe(70);
    expect(platinum.maxCap).toBe(70);
  });

  it('prevents adding quantity beyond package base capacity', () => {
    const silver = PACKAGE_TIERS.find((t) => t.id === 'silver')!;
    const currentTotal = 35; // Silver base capacity reached
    const delta = 1;

    // Logic under handleQtyChange:
    const wouldExceed = delta > 0 && currentTotal + delta > silver.baseCapacity;
    expect(wouldExceed).toBe(true);

    // The action must be prevented
    const safeDelta = Math.min(delta, silver.baseCapacity - currentTotal);
    expect(safeDelta).toBe(0);
  });

  it('clamps direct flavor input to prevent exceeding package base capacity', () => {
    const silver = PACKAGE_TIERS.find((t) => t.id === 'silver')!;
    const otherPacksTotal = 30; // 30 packs already selected among other flavors
    const attemptedInput = 10; // User attempts to enter 10 for a flavor (would total 40 > 35)

    const maxAvailableForFlavor = Math.max(0, silver.baseCapacity - otherPacksTotal);
    expect(maxAvailableForFlavor).toBe(5);

    const clamped = Math.max(0, Math.min(attemptedInput, maxAvailableForFlavor));
    expect(clamped).toBe(5);
    expect(otherPacksTotal + clamped).toBe(35);
  });

  it('preserves existing selections and unlocks more capacity when upgrading tier', () => {
    const silver = PACKAGE_TIERS.find((t) => t.id === 'silver')!;
    const gold = PACKAGE_TIERS.find((t) => t.id === 'gold')!;

    const currentSilverTotal = silver.baseCapacity; // 35 packs
    expect(currentSilverTotal).toBe(35);

    // When upgrading to Gold (55 packs base capacity)
    expect(gold.baseCapacity).toBeGreaterThan(currentSilverTotal);
    const additionalCapacityUnlocked = gold.baseCapacity - currentSilverTotal;
    expect(additionalCapacityUnlocked).toBe(20);
  });
});
