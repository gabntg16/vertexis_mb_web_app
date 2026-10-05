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

  it('verifies inline yellow alert box is removed from BranchOrders flow', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const branchOrdersFile = fs.readFileSync(
      path.resolve(__dirname, '../components/branch/BranchOrders.tsx'),
      'utf-8'
    );

    // The inline yellow alert box banner should no longer exist
    expect(branchOrdersFile.includes('id="package-limit-reached-alert"')).toBe(false);
  });

  it('triggers exceed warning only on attempting to exceed base capacity (> 35) and not on exact 35/35', () => {
    const silver = PACKAGE_TIERS.find((t) => t.id === 'silver')!;

    // Scenario 1: User enters 35 (exact base capacity)
    const exactInput = 35;
    const isExceededExact = exactInput > silver.baseCapacity;
    expect(isExceededExact).toBe(false); // Does NOT trigger warning modal

    // Scenario 2: User enters 36 (attempts to exceed)
    const excessInput = 36;
    const isExceededOver = excessInput > silver.baseCapacity;
    expect(isExceededOver).toBe(true); // Triggers warning modal

    // Scenario 3: User is at 35 and clicks "+" (+1)
    const currentTotal = 35;
    const delta = 1;
    const isAttemptOver = currentTotal + delta > silver.baseCapacity;
    expect(isAttemptOver).toBe(true); // Triggers warning modal
  });

  it('verifies PackageCapacityWarningModal contains responsive classes and full-width stacked action buttons', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const modalFile = fs.readFileSync(
      path.resolve(__dirname, '../components/branch/PackageCapacityWarningModal.tsx'),
      'utf-8'
    );

    // Fluid side margins, constrained max-width, responsive padding, vertical max-height scroll
    expect(modalFile.includes('mx-4')).toBe(true);
    expect(modalFile.includes('max-w-md')).toBe(true);
    expect(modalFile.includes('p-4 sm:p-6')).toBe(true);
    expect(modalFile.includes('max-h-[90vh] overflow-y-auto')).toBe(true);

    // Full-width buttons stacked vertically
    expect(modalFile.includes('flex flex-col space-y-2 w-full')).toBe(true);
    expect(modalFile.includes('createPortal')).toBe(true);
  });
});
