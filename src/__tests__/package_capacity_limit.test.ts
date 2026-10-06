import { describe, it, expect } from 'vitest';
import { PACKAGE_TIERS, calculatePackagePrice, clampPackageQuantity, upgradePackageQuantities } from '../utils/packagePricing';
import { packageTotal } from '../../functions/src/transactionModel';
import { analyzePackageUpgrade } from '../hooks/usePackageUpgradeOptimization';
const [silver, gold, platinum] = PACKAGE_TIERS;
describe('Package ranges, shared pricing and upgrades', () => {
 it.each([
  [silver,35,3999], [silver,36,4114], [silver,50,5724], [silver,51,5839], [silver,54,6184],
  [gold,55,5775], [gold,56,5880], [gold,66,6930], [gold,67,7035], [gold,69,7245],
  [platinum,70,7000], [platinum,71,7100], [platinum,1000,100000],
 ])('prices $0.id at %s packs consistently in client and server', (tier, count, expected) => {
  expect(calculatePackagePrice(tier, count).totalPrice).toBe(expected);
  expect(packageTotal(tier.id, count)).toBe(expected);
 });
 it.each([['silver',34], ['silver',55], ['gold',54], ['gold',70], ['platinum',69]] as const)('rejects invalid %s tier count %s', (tier, count) => {
  expect(() => packageTotal(tier, count)).toThrow();
 });
 it.each([NaN, Infinity, -1, 1.5])('rejects invalid pack quantity %s', count => {
  expect(() => packageTotal('silver', count)).toThrow();
 });
 it('allows excess packs and clamps across multiple flavors to the next tier boundary', () => {
  expect(clampPackageQuantity({a:30,b:5}, 'b', 6, silver)).toBe(6);
  expect(clampPackageQuantity({a:30,b:5}, 'b', 99, silver)).toBe(24);
  expect(clampPackageQuantity({a:60,b:5}, 'b', 99, gold)).toBe(9);
  expect(clampPackageQuantity({a:70}, 'a', 1000, platinum)).toBe(1000);
  expect(clampPackageQuantity({}, 'a', Infinity, platinum)).toBe(0);
 });
 it.each([['silver',50,false], ['silver',51,true], ['gold',66,false], ['gold',67,true], ['platinum',100,false]] as const)('recommends upgrading %s only at the next price (%s packs)', (tier, count, expected) => {
  expect(analyzePackageUpgrade(tier, {a:count}).shouldTriggerCaution).toBe(expected);
 });
 it('upgrades to the next base count while retaining all selected flavors', () => {
  const initial = {a:30,b:21};
  expect(upgradePackageQuantities(initial, gold)).toEqual({a:34,b:21});
  expect(initial).toEqual({a:30,b:21});
  expect(upgradePackageQuantities({a:30,b:37}, platinum)).toEqual({a:33,b:37});
  expect(upgradePackageQuantities({a:100}, platinum)).toEqual({a:100});
 });
});
