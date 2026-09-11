import { describe, it, expect } from 'vitest';
import { calculateAverageDailySales } from '../utils/securityValidator';
import { Sale } from '../types';

describe('Restock Forecasting & Analytics Test Suite', () => {
  it('calculates average daily sales rate correctly for a rolling window', () => {
    const now = new Date();
    const d1 = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();
    const d2 = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const d3 = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();

    const sampleSales: Sale[] = [
      {
        id: 's1',
        branchId: 'b-legazpi',
        productId: 'p1',
        productName: 'Oreo Cookies',
        quantity: 10,
        total: 1490,
        date: d1,
      },
      {
        id: 's2',
        branchId: 'b-legazpi',
        productId: 'p1',
        productName: 'Oreo Cookies',
        quantity: 20,
        total: 2980,
        date: d2,
      },
      {
        id: 's3',
        branchId: 'b-legazpi',
        productId: 'p1',
        productName: 'Oreo Cookies',
        quantity: 12,
        total: 1788,
        date: d3,
      },
    ];

    // Total units = 10 + 20 + 12 = 42 across a 7-day window -> 42 / 7 = 6.0
    const avgDaily = calculateAverageDailySales(sampleSales, 7);
    expect(avgDaily).toBe(6);
  });

  it('handles empty sales history safely without crashing or returning NaN', () => {
    const avgDaily = calculateAverageDailySales([], 7);
    expect(avgDaily).toBe(0);
  });
});
