import { useReducer } from 'react';
import { analyzePackageUpgrade } from './usePackageUpgradeOptimization';
import { PACKAGE_TIERS, PackageTierId, upgradePackageQuantities } from '../utils/packagePricing';

type Quantities = Record<string, number>;
export interface PackageSelectionState {
  tierId: PackageTierId;
  quantities: Quantities;
  pending: null | {
    kind: 'extras' | 'upgrade';
    tierId: PackageTierId;
    quantities: Quantities;
    attemptedTotal: number;
  };
}
type Action =
  | { type: 'quantity'; productId: string; value?: number; delta?: number }
  | { type: 'tier'; tierId: PackageTierId }
  | { type: 'reset'; tierId: PackageTierId; quantities?: Quantities }
  | { type: 'proceed' | 'stay' | 'keep' | 'upgrade' | 'cancel' };

const count = (quantities: Quantities) => Object.values(quantities).reduce((sum, quantity) => sum + quantity, 0);
const getTier = (id: PackageTierId) => PACKAGE_TIERS.find(tier => tier.id === id)!;
function trimTo(quantities: Quantities, limit: number): Quantities {
  let remaining = limit;
  return Object.fromEntries(Object.entries(quantities).map(([id, quantity]) => {
    const kept = Math.min(quantity, remaining);
    remaining -= kept;
    return [id, kept];
  }));
}

function commit(state: PackageSelectionState, tierId: PackageTierId, quantities: Quantities, forceUpgrade = false): PackageSelectionState {
  const analysis = analyzePackageUpgrade(tierId, quantities);
  const previous = analyzePackageUpgrade(state.tierId, state.quantities);
  const shouldPrompt = analysis.shouldTriggerCaution &&
    (forceUpgrade || tierId !== state.tierId || !previous.shouldTriggerCaution);
  return {
    tierId, quantities,
    pending: shouldPrompt ? { kind: 'upgrade', tierId, quantities, attemptedTotal: count(quantities) } : null,
  };
}

export function packageSelectionReducer(state: PackageSelectionState, action: Action): PackageSelectionState {
  if (action.type === 'reset') return { tierId: action.tierId, quantities: action.quantities || {}, pending: null };
  if (action.type === 'cancel' || action.type === 'keep') return { ...state, pending: null };
  if (action.type === 'proceed' || action.type === 'stay' || action.type === 'upgrade') {
    const pending = state.pending;
    if (!pending) return state;
    const tier = getTier(pending.tierId);
    if (action.type === 'stay' && pending.kind === 'extras') {
      return { tierId: tier.id, quantities: trimTo(pending.quantities, tier.baseCapacity), pending: null };
    }
    if (action.type === 'proceed' && pending.kind === 'extras') {
      return commit(state, tier.id, pending.quantities, pending.attemptedTotal >= tier.maxCap);
    }
    if (action.type === 'upgrade' && pending.kind === 'upgrade') {
      const nextTier = analyzePackageUpgrade(tier.id, pending.quantities).nextTier;
      if (nextTier) return { tierId: nextTier.id, quantities: upgradePackageQuantities(pending.quantities, nextTier), pending: null };
    }
    return state;
  }
  // A decision must finish before another input can change its proposed selection.
  if (state.pending) return state;
  const tier = getTier(action.type === 'tier' ? action.tierId : state.tierId);
  let proposed = { ...state.quantities };
  if (action.type === 'quantity') {
    const raw = action.value ?? ((proposed[action.productId] || 0) + (action.delta || 0));
    proposed[action.productId] = Number.isFinite(raw) ? Math.max(0, Math.min(1000000, Math.floor(raw))) : 0;
  }
  const attemptedTotal = count(proposed);
  const previousTotal = count(state.quantities);
  // Clamp only the edited flavor, preserving the other flavor selections.
  if (action.type === 'quantity') {
    const other = attemptedTotal - proposed[action.productId];
    proposed[action.productId] = Math.min(proposed[action.productId], Math.max(0, tier.maxCap - other));
  } else {
    proposed = trimTo(proposed, tier.maxCap);
  }
  const crossingBase = attemptedTotal > tier.baseCapacity && (previousTotal <= tier.baseCapacity || tier.id !== state.tierId);
  const reachingCap = attemptedTotal >= tier.maxCap && (attemptedTotal > previousTotal || tier.id !== state.tierId);
  if (crossingBase || reachingCap) {
    return { ...state, pending: { kind: 'extras', tierId: tier.id, quantities: proposed, attemptedTotal } };
  }
  return commit(state, tier.id, proposed);
}

export function usePackageSelection(initialTierId: PackageTierId) {
  const [state, dispatch] = useReducer(packageSelectionReducer, { tierId: initialTierId, quantities: {}, pending: null });
  return {
    state, dispatch,
    changeQuantity: (productId: string, delta: number) => dispatch({ type: 'quantity', productId, delta }),
    inputQuantity: (productId: string, value: string) => dispatch({ type: 'quantity', productId, value: Number(value) }),
    selectTier: (tierId: PackageTierId) => dispatch({ type: 'tier', tierId }),
  };
}
