import { describe, it, expect } from 'vitest';
import { validatePOSSale, validateCommissaryAllocation } from '../utils/securityValidator';
import { InventoryItem, Product } from '../types';

describe('Inventory & POS Anti-Negative Stock Test Suite', () => {
  const sampleInventory: InventoryItem = {
    id: 'inv-b-legazpi-p1',
    branchId: 'b-legazpi',
    productId: 'p1',
    productName: 'Oreo Cookies (Gourmet Marshmallow)',
    stock: 15,
  };

  const sampleProduct: Product = {
    id: 'p1',
    name: 'Gourmet Marshmallow',
    flavor: 'Oreo Cookies',
    price: 149,
    adminStock: 400,
  };

  it('allows valid POS sale when branch stock is sufficient', () => {
    const result = validatePOSSale(sampleInventory, 3, 149, 500);
    expect(result.valid).toBe(true);
  });

  it('strictly blocks POS sale if requested quantity exceeds branch stock (anti-negative stock guard)', () => {
    const result = validatePOSSale(sampleInventory, 20, 149, 3000);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Insufficient Stock: Cannot sell 20 units');
  });

  it('rejects POS sale when cash tendered is less than transaction total', () => {
    const result = validatePOSSale(sampleInventory, 2, 149, 200); // Total is 298, tendered is 200
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Insufficient Payment: Tendered ₱200 is less than total ₱298');
  });

  it('validates central commissary buffer allocation and prevents over-allocation', () => {
    // Valid transfer within buffer
    const validResult = validateCommissaryAllocation(sampleProduct, 100);
    expect(validResult.valid).toBe(true);

    // Over-allocation exceeding buffer stock
    const overResult = validateCommissaryAllocation(sampleProduct, 500);
    expect(overResult.valid).toBe(false);
    expect(overResult.error).toContain('Insufficient central buffer stock');
  });
});
