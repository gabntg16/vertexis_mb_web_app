import { useMemo } from 'react';
import { PackageTier, PACKAGE_TIERS, calculatePackagePrice } from '../utils/packagePricing';

export interface PackageOptimizationAnalysis {
  shouldTriggerCaution: boolean;
  currentTier: PackageTier;
  nextTier: PackageTier | null;
  currentTotalPacks: number;
  extraPacks: number;
  currentTotalCost: number;
  nextTierPrice: number;
  nextTierBaseCapacity: number;
  additionalPacksGained: number;
  priceDifference: number; // nextTierPrice - currentTotalCost
  isNextTierCheaper: boolean;
  thresholdPercentage: number;
  percentageOfNextTier: number;
}

/**
 * usePackageUpgradeOptimization
 *
 * Evaluates whether adding custom/excess packs on top of the current tier
 * makes it financially and operationally advantageous to switch to the next tier.
 *
 * Trigger Condition:
 * If (currentTotalCost >= nextTier.price) i.e. reaches or exceeds the next tier base price.
 */
export function usePackageUpgradeOptimization(
  selectedTierId: 'silver' | 'gold' | 'platinum',
  quantities: Record<string, number>
): PackageOptimizationAnalysis {
  return useMemo(() => analyzePackageUpgrade(selectedTierId, quantities), [selectedTierId, quantities]);
}

export function analyzePackageUpgrade(selectedTierId: 'silver' | 'gold' | 'platinum', quantities: Record<string, number>): PackageOptimizationAnalysis {
    const currentTier = PACKAGE_TIERS.find((t) => t.id === selectedTierId) || PACKAGE_TIERS[0];
    const currentTotalPacks = Object.values(quantities).reduce((sum, q) => sum + (q || 0), 0);

    // Calculate current cost including base price + excess pack charges
    const { totalPrice: currentTotalCost, excessPacks } = calculatePackagePrice(currentTier, currentTotalPacks);

    // Identify next higher tier
    let nextTier: PackageTier | null = null;
    if (selectedTierId === 'silver') {
      nextTier = PACKAGE_TIERS.find((t) => t.id === 'gold') || null;
    } else if (selectedTierId === 'gold') {
      nextTier = PACKAGE_TIERS.find((t) => t.id === 'platinum') || null;
    }

    if (!nextTier || currentTotalPacks <= 0) {
      return {
        shouldTriggerCaution: false,
        currentTier,
        nextTier: null,
        currentTotalPacks,
        extraPacks: excessPacks,
        currentTotalCost,
        nextTierPrice: 0,
        nextTierBaseCapacity: 0,
        additionalPacksGained: 0,
        priceDifference: 0,
        isNextTierCheaper: false,
        thresholdPercentage: 0,
        percentageOfNextTier: 0,
      };
    }

    const nextTierPrice = nextTier.price;
    const thresholdPrice = nextTierPrice; // at or above the next base price
    const shouldTriggerCaution = currentTotalCost >= thresholdPrice && excessPacks > 0;

    const priceDifference = Math.round((nextTierPrice - currentTotalCost) * 100) / 100;
    const isNextTierCheaper = priceDifference <= 0;
    const additionalPacksGained = Math.max(0, nextTier.baseCapacity - currentTotalPacks);
    const percentageOfNextTier = Math.round((currentTotalCost / nextTierPrice) * 100);

    return {
      shouldTriggerCaution,
      currentTier,
      nextTier,
      currentTotalPacks,
      extraPacks: excessPacks,
      currentTotalCost,
      nextTierPrice,
      nextTierBaseCapacity: nextTier.baseCapacity,
      additionalPacksGained,
      priceDifference,
      isNextTierCheaper,
      thresholdPercentage: 0,
      percentageOfNextTier,
    };
}
