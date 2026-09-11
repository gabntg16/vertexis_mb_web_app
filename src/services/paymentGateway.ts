import {
  DigitalPaymentMethod,
  POSPaymentMethod,
} from '../types';

// ============================================================================
// COMMISSARY CORPORATE BANK & WALLET CONFIGURATION (OFFICIAL PAYEE DETAILS)
// ============================================================================
export const COMMISSARY_BANK_ACCOUNTS = [
  {
    bankName: 'BDO Unibank (Primary Commissary Collection)',
    shortName: 'BDO',
    accountName: 'THE MARSH BITES CONFECTIONERY INC.',
    accountNumber: '0048-2918-4491',
    accountType: 'Corporate Current / Checking',
    branch: 'Naga City - Peñafrancia Ave Branch',
    instapaySupported: true,
    pesonetSupported: true,
  },
  {
    bankName: 'Bank of the Philippine Islands (BPI)',
    shortName: 'BPI',
    accountName: 'THE MARSH BITES CONFECTIONERY INC.',
    accountNumber: '0942-8812-39',
    accountType: 'Corporate Current',
    branch: 'Naga City - Magsaysay Branch',
    instapaySupported: true,
    pesonetSupported: true,
  },
  {
    bankName: 'UnionBank of the Philippines',
    shortName: 'UnionBank',
    accountName: 'THE MARSH BITES CONFECTIONERY INC.',
    accountNumber: '1098-4490-2819',
    accountType: 'Corporate Business Account',
    branch: 'Bicol Regional Hub',
    instapaySupported: true,
    pesonetSupported: true,
  },
];

export const COMMISSARY_DIGITAL_WALLETS = {
  gcash: {
    merchantName: 'The Marsh Bites Naga Commissary',
    walletNumber: '0951-621-5848',
    merchantId: 'MID-MB-GCASH-49102',
    channelName: 'GCash',
  },
  maya: {
    merchantName: 'The Marsh Bites Naga Commissary',
    walletNumber: '0917-884-2104',
    merchantId: 'MID-MB-MAYA-99281',
    channelName: 'Maya',
  },
};

/**
 * Generates formatted reference traces for audit trails
 */
export function formatPaymentReference(method: DigitalPaymentMethod | POSPaymentMethod, trace: string): string {
  const cleanTrace = trace.trim().toUpperCase();
  if (method === 'gcash' || method === 'GCash') {
    return cleanTrace.startsWith('GC-') ? cleanTrace : `GC-${cleanTrace}`;
  }
  if (method === 'maya' || method === 'Maya') {
    return cleanTrace.startsWith('MY-') ? cleanTrace : `MY-${cleanTrace}`;
  }
  if (method === 'bank_transfer' || method === 'Bank Transfer') {
    return cleanTrace.startsWith('BT-') ? cleanTrace : `BT-${cleanTrace}`;
  }
  return cleanTrace;
}
