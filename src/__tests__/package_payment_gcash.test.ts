import { describe, it, expect } from 'vitest';
import { getPackageTierDetails } from '../components/branch/BranchPaymentModal';
import { GCASH_TIER_QR_CODES } from '../utils/gcashQRCodes';
import { Order } from '../types';
import fs from 'fs';
import path from 'path';

describe('Package Order Payment Selection & Dynamic GCash QR Codes', () => {
  const baseOrder: Order = {
    id: 'ORD-TEST-001',
    branchId: 'branch-1',
    branchName: 'Naga Central Branch',
    status: 'pending',
    totalAmount: 3999,
    createdAt: new Date().toISOString(),
    items: [{ productId: 'p1', productName: 'Classic Vanilla', quantity: 35, unitPrice: 114.26 }],
    packageName: 'Silver Package',
    packageTier: 'silver',
  };

  it('correctly identifies Silver Package tier and amount ₱3,999', () => {
    const details = getPackageTierDetails(baseOrder);
    expect(details.id).toBe('silver');
    expect(details.name).toBe('Silver Package');
    expect(details.price).toBe(3999);
    expect(details.formattedPrice).toBe('₱3,999.00');
  });

  it('correctly identifies Gold Package tier and amount ₱5,775', () => {
    const goldOrder: Order = {
      ...baseOrder,
      id: 'ORD-TEST-002',
      totalAmount: 5775,
      packageName: 'Gold Package',
      packageTier: 'gold',
    };
    const details = getPackageTierDetails(goldOrder);
    expect(details.id).toBe('gold');
    expect(details.name).toBe('Gold Package');
    expect(details.price).toBe(5775);
    expect(details.formattedPrice).toBe('₱5,775.00');
  });

  it('correctly identifies Platinum Package tier and amount ₱7,000', () => {
    const platOrder: Order = {
      ...baseOrder,
      id: 'ORD-TEST-003',
      totalAmount: 7000,
      packageName: 'Platinum Package',
      packageTier: 'platinum',
    };
    const details = getPackageTierDetails(platOrder);
    expect(details.id).toBe('platinum');
    expect(details.name).toBe('Platinum Package');
    expect(details.price).toBe(7000);
    expect(details.formattedPrice).toBe('₱7,000.00');
  });

  it('provides valid base64 data URL QR codes for all package tiers', () => {
    expect(GCASH_TIER_QR_CODES.silver).toMatch(/^data:image\/png;base64,/);
    expect(GCASH_TIER_QR_CODES.gold).toMatch(/^data:image\/png;base64,/);
    expect(GCASH_TIER_QR_CODES.platinum).toMatch(/^data:image\/png;base64,/);

    // Each tier has a unique QR code payload matching its amount
    expect(GCASH_TIER_QR_CODES.silver).not.toEqual(GCASH_TIER_QR_CODES.gold);
    expect(GCASH_TIER_QR_CODES.gold).not.toEqual(GCASH_TIER_QR_CODES.platinum);
  });

  it('confirms BranchPaymentModal has removed Maya and Bank Transfer channels', () => {
    const modalContent = fs.readFileSync(
      path.resolve(__dirname, '../components/branch/BranchPaymentModal.tsx'),
      'utf-8'
    );

    // Maya and Bank Transfer should not be present in the payment channel options
    expect(modalContent.includes("id: 'maya'")).toBe(false);
    expect(modalContent.includes("id: 'bank_transfer'")).toBe(false);
    expect(modalContent.includes('Corporate Wallet')).toBe(false);
    expect(modalContent.includes('Bank deposit / transfer')).toBe(false);

    // GCash must be the exclusive payment method
    expect(modalContent.includes("method = 'gcash'")).toBe(true);
    expect(modalContent.includes('GCash Only') || modalContent.includes('GCash Exclusive')).toBe(true);
  });

  it('confirms BranchPaymentModal renders centered, responsive QR code with clear scan instructions', () => {
    const modalContent = fs.readFileSync(
      path.resolve(__dirname, '../components/branch/BranchPaymentModal.tsx'),
      'utf-8'
    );

    // Clear instruction copy
    expect(modalContent.includes('Scan to pay via GCash')).toBe(true);

    // Centered & responsive classes
    expect(modalContent.includes('flex flex-col items-center justify-center text-center')).toBe(true);
    expect(modalContent.includes('w-48 h-48 sm:w-56 sm:h-56')).toBe(true);
  });
});
