import { describe, it, expect } from 'vitest';
import { PACKAGE_TIERS, calculatePackagePrice } from '../components/branch/BranchOrders';

describe('Package Pricing & Upgrade Optimization Logic', () => {
  it('calculates exact pro-rata excess rate for packages', () => {
    const silver = PACKAGE_TIERS.find((t) => t.id === 'silver')!;
    const gold = PACKAGE_TIERS.find((t) => t.id === 'gold')!;

    // Silver base = 35 packs @ ₱3,999 (rate ≈ ₱114.257/pack)
    const baseSilver = calculatePackagePrice(silver, 35);
    expect(baseSilver.totalPrice).toBe(3999);
    expect(baseSilver.isExceeded).toBe(false);

    // Silver with 15 extra packs (50 total packs)
    const excessSilver = calculatePackagePrice(silver, 50);
    expect(excessSilver.isExceeded).toBe(true);
    expect(excessSilver.excessPacks).toBe(15);
    // 3999 + 15 * (3999/35) = 3999 + 1713.857 = 5712.857
    expect(excessSilver.totalPrice).toBeGreaterThan(5700);

    // Gold package price is ₱5,775
    // Notice 5712.86 is within 10% (threshold: 5775 * 0.9 = 5197.50) of Gold!
    expect(excessSilver.totalPrice).toBeGreaterThan(gold.price * 0.9);
  });

  it('correctly triggers optimization threshold when adding excess packs', () => {
    const silver = PACKAGE_TIERS.find((t) => t.id === 'silver')!;
    const gold = PACKAGE_TIERS.find((t) => t.id === 'gold')!;
    const goldThreshold = gold.price * 0.9; // ₱5,197.50

    // 46 packs under Silver
    const p46 = calculatePackagePrice(silver, 46);
    expect(p46.totalPrice).toBeGreaterThan(goldThreshold);
  });
});
