import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { getGCashQRCode } from '../utils/gcashQRCodes';
import { BranchPaymentModal } from '../components/branch/BranchPaymentModal';
import { Order } from '../types';
import fs from 'fs';
import path from 'path';
describe('Hybrid GCash payment', () => {
 it.each([['silver',35,3999],['gold',55,5775],['platinum',70,7000]] as const)('uses fixed QR for exact %s base', (tier,packs,total) => {
  expect(getGCashQRCode(tier,packs,total)).toBe('/gcash-'+tier+'.jpg');
 });
 it.each([['silver',36,4114],['silver',54,6184],['gold',56,5880],['gold',69,7245],['platinum',71,7100],['silver',35,4000]] as const)('uses generic QR for %s %s packs / %s', (tier,packs,total) => {
  expect(getGCashQRCode(tier,packs,total)).toBe('/gcash-generic.jpg');
 });
 it('includes all four real JPEG assets', () => {
  for (const tier of ['silver','gold','platinum','generic']) {
   const bytes=fs.readFileSync(path.resolve(__dirname, '../../public/gcash-'+tier+'.jpg'));
   expect([...bytes.subarray(0,3)]).toEqual([255,216,255]);
  }
 });
 it('renders the custom amount above the generic QR and in transfer instructions', () => {
  const order={id:'test', branchId:'b1',branchName:'Test',status:'pending',createdAt:'2026-10-05',packageTier:'silver',packageName:'Silver Package',totalAmount:5839,items:[{productId:'a',productName:'Vanilla',quantity:51,unitPrice:114.49}]} as Order;
  const html=renderToStaticMarkup(React.createElement(BranchPaymentModal,{order,branchName:'Test',themeMode:'light',onClose:()=>{},onPaymentComplete:()=>{}}));
  expect(html).toContain('src="/gcash-generic.jpg"');
  expect(html.indexOf('Total Amount Due')).toBeLessThan(html.indexOf('<img'));
  expect(html).toContain('₱5,839.00');
  expect(html).not.toContain('₱3,999.00');
 });
});
