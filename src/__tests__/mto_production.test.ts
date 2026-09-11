import { describe, it, expect } from 'vitest';
import {
  validateMTOStageTransition,
  isValidBatchCode,
  validateOrderPayload,
  computeOrderTotal,
} from '../utils/securityValidator';
import { OrderItem } from '../types';

describe('Made-to-Order (MTO) Confectionery & Batch Lifecycle Test Suite', () => {
  it('validates forward sequential kitchen stage progression', () => {
    // Queued -> In Kettle
    expect(validateMTOStageTransition('queued', 'in_kettle').valid).toBe(true);

    // In Kettle -> Curing Slabs
    expect(validateMTOStageTransition('in_kettle', 'curing').valid).toBe(true);

    // Curing Slabs -> Packaged
    expect(validateMTOStageTransition('curing', 'packaged').valid).toBe(true);

    // Packaged -> Ready for Dispatch
    expect(validateMTOStageTransition('packaged', 'ready_for_dispatch').valid).toBe(true);
  });

  it('rejects backwards invalid transitions (e.g. ready_for_dispatch back to queued)', () => {
    const result = validateMTOStageTransition('ready_for_dispatch', 'queued');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Illegal Stage Transition');
  });

  it('enforces MTO batch code format standard (e.g. MTO-LEG-0818)', () => {
    expect(isValidBatchCode('MTO-LEG-0818')).toBe(true);
    expect(isValidBatchCode('MTO-CAB-1204')).toBe(true);
    expect(isValidBatchCode('MTO-MAKATI-9912')).toBe(true);

    // Malformed codes
    expect(isValidBatchCode('LEG-0818')).toBe(false);
    expect(isValidBatchCode('BATCH-99')).toBe(false);
    expect(isValidBatchCode('')).toBe(false);
  });

  it('validates order payload items and calculates total amount correctly', () => {
    const validItems: OrderItem[] = [
      { productId: 'p1', productName: 'Oreo Cookies', quantity: 20, unitPrice: 149 },
      { productId: 'p5', productName: 'Ube Jam', quantity: 30, unitPrice: 149 },
    ];

    const validation = validateOrderPayload(validItems);
    expect(validation.valid).toBe(true);

    const total = computeOrderTotal(validItems);
    expect(total).toBe(20 * 149 + 30 * 149); // 7450
  });

  it('rejects order payloads with zero, negative, or fractional quantities', () => {
    const zeroItem: OrderItem[] = [
      { productId: 'p1', productName: 'Oreo Cookies', quantity: 0, unitPrice: 149 },
    ];
    expect(validateOrderPayload(zeroItem).valid).toBe(false);

    const negativeItem: OrderItem[] = [
      { productId: 'p1', productName: 'Oreo Cookies', quantity: -5, unitPrice: 149 },
    ];
    expect(validateOrderPayload(negativeItem).valid).toBe(false);

    const fractionalItem: OrderItem[] = [
      { productId: 'p1', productName: 'Oreo Cookies', quantity: 2.5, unitPrice: 149 },
    ];
    expect(validateOrderPayload(fractionalItem).valid).toBe(false);
  });
});
