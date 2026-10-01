import {
  DigitalPaymentMethod,
  POSPaymentMethod,
} from '../types';

// Collection accounts must be supplied and approved by HQ before display.
// No demo account numbers are provided in the live application.

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
