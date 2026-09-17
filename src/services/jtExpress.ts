/**
 * Logistics & Delivery Reference Service
 * The Marsh Bites Management System (VertexIS)
 * 
 * Standardized logistics interfaces and carrier portal helpers
 * for Naga Central Commissary nationwide dispatches.
 */

export interface JTSender {
  name: string;
  mobile: string;
  phone?: string;
  address: string;
  province: string;
  city: string;
  district?: string;
  postalCode: string;
  companyName: string;
}

export interface JTReceiver {
  name: string;
  mobile: string;
  phone?: string;
  address: string;
  province: string;
  city: string;
  district?: string;
  postalCode?: string;
  branchCode?: string;
  branchName?: string;
}

export interface JTItem {
  itemName: string;
  itemQuantity: number;
  itemValue: number; // in PHP
  itemWeight: number; // in kg
  englishName?: string;
  category?: string;
}

export interface JTCreateOrderRequest {
  orderId: string;
  manualWaybillNumber?: string;
  manualETD?: string;
  sender?: Partial<JTSender>;
  receiver: JTReceiver;
  items: JTItem[];
  packageType?: string;
  serviceType?: string;
  weightKg?: number;
  declaredValue?: number;
  remark?: string;
}

export interface JTOrderResponse {
  success: boolean;
  code: string;
  message: string;
  data?: {
    orderId: string;
    billCode: string;
    sortingCode: string;
    originHubCode: string;
    destinationHubCode: string;
    routingBarcode: string;
    weightKg: number;
    shippingFee: number;
    serviceType: string;
    estimatedDeliveryDays: string;
    createdAt: string;
  };
}

export type JTScanStatus =
  | 'ORDER_CREATED'
  | 'PICKED_UP'
  | 'DEPARTED_ORIGIN'
  | 'IN_TRANSIT'
  | 'ARRIVED_DEST_HUB'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'EXCEPTION'
  | 'CANCELLED';

export interface JTTrackingResponse {
  success: boolean;
  billCode: string;
  currentStatus: JTScanStatus;
  statusLabel: string;
  statusDescription: string;
  origin: string;
  destination: string;
  sortingCode: string;
  events: any[];
  isDelivered: boolean;
  isException: boolean;
}

export interface JTShippingLabelData {
  billCode: string;
  orderId: string;
  sortingCode: string;
  destinationCode: string;
  serviceType: string;
  sender: JTSender;
  receiver: JTReceiver;
  items: JTItem[];
  totalWeightKg: number;
  totalPacks: number;
  declaredValue: number;
  shippingFee: number;
  createdAt: string;
  barcodeValue: string;
  qrCodeValue: string;
  handlingInstructions: string[];
}

// Default Central Commissary Naga City Sender Configuration
export const COMMISSARY_SENDER: JTSender = {
  companyName: 'The Marsh Bites Enterprise (Central Commissary)',
  name: 'Commissary Dispatch Officer (Naga City HQ)',
  mobile: '+63 917 555 6274',
  phone: '(054) 881-2490',
  address: 'Zone 4, Concepcion Pequeña, Naga City (Near Almeda Highway)',
  province: 'Camarines Sur',
  city: 'Naga City',
  district: 'Concepcion Pequeña',
  postalCode: '4400',
};

// Carrier Public Tracking URL for J&T Express packages
export const JT_EXPRESS_TRACKING_URL = 'https://www.jtexpress.ph/index/query/gzquery.html';

/** Build a deterministic printable label without calling a carrier API. */
export function prepareShippingLabel(
  billCode: string,
  orderId: string,
  receiver: Partial<JTReceiver>,
  items: JTItem[],
  options: { weightKg?: number; declaredValue?: number } = {}
): JTShippingLabelData {
  const destination = resolveDestinationHub(receiver.city || receiver.province || '');
  const totalPacks = items.reduce((sum, item) => sum + item.itemQuantity, 0);
  const calculatedWeight = items.reduce((sum, item) => sum + item.itemQuantity * item.itemWeight, 0);

  return {
    billCode,
    orderId,
    sortingCode: `MB-${destination.hubCode}-${billCode.slice(-4)}`,
    destinationCode: destination.hubCode,
    serviceType: 'Standard Parcel',
    sender: COMMISSARY_SENDER,
    receiver: {
      name: receiver.name || 'Branch Store Manager',
      mobile: receiver.mobile || receiver.phone || '+63 917 555 0192',
      address: receiver.address || 'Branch destination',
      province: receiver.province || 'Camarines Sur',
      city: receiver.city || destination.hubName,
      district: receiver.district,
      postalCode: receiver.postalCode || '0000',
      branchCode: receiver.branchCode,
      branchName: receiver.branchName,
    },
    items,
    totalWeightKg: options.weightKg ?? Math.max(0.5, Number(calculatedWeight.toFixed(2))),
    totalPacks,
    declaredValue: options.declaredValue ?? 0,
    shippingFee: 0,
    createdAt: new Date().toISOString(),
    barcodeValue: billCode,
    qrCodeValue: `VERTEXIS|${orderId}|${billCode}`,
    handlingInstructions: ['Keep dry.', 'Protect from heat.', 'Verify package count on receipt.'],
  };
}

export const jtExpressService = { prepareShippingLabel };

/**
 * Resolves regional logistics hub based on city or province
 */
export function resolveDestinationHub(location: string): { hubCode: string; hubName: string; transitDays: number } {
  const normalized = location.toLowerCase();
  if (normalized.includes('naga') || normalized.includes('camarines')) {
    return { hubCode: 'BCO-NGA-01', hubName: 'Central Commissary Hub (Naga)', transitDays: 1 };
  }
  if (normalized.includes('legazpi') || normalized.includes('albay')) {
    return { hubCode: 'BCO-LEG-01', hubName: 'Albay Hub (Legazpi)', transitDays: 1 };
  }
  if (normalized.includes('manila') || normalized.includes('makati') || normalized.includes('quezon') || normalized.includes('taguig')) {
    return { hubCode: 'NCR-CENTRAL-01', hubName: 'NCR Central Gateway Hub', transitDays: 2 };
  }
  if (normalized.includes('cebu')) {
    return { hubCode: 'VIS-CEB-01', hubName: 'Cebu Distribution Hub', transitDays: 3 };
  }
  if (normalized.includes('davao')) {
    return { hubCode: 'MIN-DVO-01', hubName: 'Davao Regional Hub', transitDays: 3 };
  }
  return { hubCode: 'LOG-CENTRAL', hubName: 'Regional Logistics Station', transitDays: 2 };
}

/**
 * Mock status check placeholder
 */
export function isJTMockMode(): boolean {
  return false;
}

/**
 * Maps logistics status
 */
export function mapJTStatusToVertexStatus(jtStatus: string): {
  status: 'pending' | 'inTransit' | 'delivered' | 'damaged' | 'canceled';
  label: string;
  badgeColor: string;
  textColor: string;
  description: string;
} {
  return {
    status: 'inTransit',
    label: 'In Transit',
    badgeColor: 'bg-sky-500/15 border-sky-500/30 text-sky-600 dark:text-sky-400',
    textColor: 'text-sky-600 dark:text-sky-400',
    description: 'Consignment en route to branch location.',
  };
}
