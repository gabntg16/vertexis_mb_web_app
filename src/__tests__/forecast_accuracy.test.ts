import { describe, expect, it } from 'vitest';
import { computeProductDemandAnalytics, calculateSingleExponentialSmoothing } from '../utils/demandForecaster';
import type { Product, Sale } from '../types';
const product: Product = { id: 'p1', name: 'Marshmallow', flavor: 'Oreo', price: 150, adminStock: 0 };
describe('Forecast data quality', () => {
  it('shows insufficient history instead of a fabricated restock prediction', () => {
    const result = computeProductDemandAnalytics('b1', product, 0, 0, []);
    expect(result.hasSalesHistory).toBe(false);
    expect(result.suggestedOrderQuantity).toBe(0);
    expect(result.expectedWeeklyDemand).toBe(0);
  });
  it('counts only valid sales in the history window and excludes waste from demand', () => {
    const valid: Sale = { id: 's1', branchId: 'b1', productId: 'p1', productName: 'Oreo', quantity: 3, total: 450, date: new Date().toISOString() };
    const sales = [valid, { ...valid, id: 'void', status: 'voided' }, { ...valid, id: 'refund', status: 'refunded' }, { ...valid, id: 'other', branchId: 'b2' }, { ...valid, id: 'invalid', quantity: NaN }, { ...valid, id: 'old', date: '2020-01-01T00:00:00Z' }] as Sale[];
    const result = computeProductDemandAnalytics('b1', product, 10, 0, sales);
    expect(result.totalHistoricalSalesUnits).toBe(3);
    expect(result.salesTransactionsCount).toBe(1);
    expect(result.hasSalesHistory).toBe(true);
  });
  it('rejects invalid smoothing inputs', () => {
    expect(() => calculateSingleExponentialSmoothing([1, NaN])).toThrow();
    expect(() => calculateSingleExponentialSmoothing([1, 2], 2)).toThrow();
  });
});
