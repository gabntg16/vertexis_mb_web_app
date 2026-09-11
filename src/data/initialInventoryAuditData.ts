import {
  Branch,
  Product,
  SpoilageRecord,
  PhysicalInventoryAudit,
  PhysicalAuditItem,
} from '../types';

export function generateInitialSpoilageRecords(
  branches: Branch[],
  products: Product[]
): SpoilageRecord[] {
  const records: SpoilageRecord[] = [];
  const now = new Date();

  // Create realistic seed wastage logs for select branches
  const sampleData: Array<{
    branchId: string;
    productIndex: number;
    qty: number;
    reason: SpoilageRecord['reason'];
    daysAgo: number;
    notes: string;
  }> = [
    {
      branchId: 'b-legazpi',
      productIndex: 0, // Oreo Cookies
      qty: 2,
      reason: 'Expired',
      daysAgo: 3,
      notes: 'Passed 30-day freshness window on display shelf.',
    },
    {
      branchId: 'b-legazpi',
      productIndex: 3, // Strawberry & Cheesecake
      qty: 1,
      reason: 'Transport Damage',
      daysAgo: 6,
      notes: 'Outer packaging seal punctured during transit from Naga Commissary.',
    },
    {
      branchId: 'b-cabuyao',
      productIndex: 2, // Caramel Macchiato
      qty: 3,
      reason: 'Mishandling / Melted',
      daysAgo: 4,
      notes: 'Direct heat exposure during kiosk AC maintenance.',
    },
    {
      branchId: 'b-makati',
      productIndex: 4, // Ube Jam
      qty: 2,
      reason: 'Production Defect',
      daysAgo: 2,
      notes: 'Under-whipped marshmallow texture flagged during QC inspection.',
    },
    {
      branchId: 'b-naga-sm',
      productIndex: 1, // Dried Mango
      qty: 1,
      reason: 'Customer Spoilage / Sample',
      daysAgo: 1,
      notes: 'Customer sampling promotion demonstration tray.',
    },
  ];

  sampleData.forEach((item, idx) => {
    const branch = branches.find((b) => b.id === item.branchId) || branches[0];
    const product = products[item.productIndex % products.length];
    const timestamp = new Date(now.getTime() - item.daysAgo * 24 * 60 * 60 * 1000).toISOString();

    records.push({
      id: `wst-${item.branchId}-${idx + 1}`,
      branchId: item.branchId,
      branchName: branch.name,
      productId: product.id,
      productName: `${product.flavor} (${product.name})`,
      flavor: product.flavor,
      quantity: item.qty,
      reason: item.reason,
      batchCode: `MTO-QC-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${idx + 10}`,
      reportedBy: `${branch.name} Quality Officer`,
      timestamp,
      costImpact: item.qty * (product.wholesalePrice || 100),
      notes: item.notes,
      excludedFromDemandForecast: true,
    });
  });

  return records;
}

export function generateInitialPhysicalAudits(
  branches: Branch[],
  products: Product[]
): PhysicalInventoryAudit[] {
  const audits: PhysicalInventoryAudit[] = [];
  const now = new Date();

  // Create an initial completed audit for Legazpi
  const legazpiBranch = branches.find((b) => b.id === 'b-legazpi') || branches[0];
  const auditItems: PhysicalAuditItem[] = products.map((p, idx) => {
    const systemStock = [18, 12, 5, 24, 8, 15, 6][idx % 7];
    // Introduce slight discrepancy on index 2 and 4 to illustrate shrinkage audit
    const physicalCount = idx === 2 ? systemStock - 1 : idx === 4 ? systemStock - 1 : systemStock;
    const discrepancy = physicalCount - systemStock;
    const discrepancyType = discrepancy === 0 ? 'Matched' : discrepancy < 0 ? 'Shortage' : 'Overage';
    const wholesaleCost = p.wholesalePrice || 100;

    return {
      productId: p.id,
      productName: p.name,
      flavor: p.flavor,
      systemBookStock: systemStock,
      physicalCount,
      discrepancy,
      discrepancyType,
      unitPrice: p.price,
      wholesaleCost,
      discrepancyValue: discrepancy * wholesaleCost,
      notes: discrepancy !== 0 ? 'Unlogged display sample / broken blister pack' : undefined,
    };
  });

  const totalSystem = auditItems.reduce((acc, it) => acc + it.systemBookStock, 0);
  const totalPhysical = auditItems.reduce((acc, it) => acc + it.physicalCount, 0);
  const totalDiscrepancy = auditItems.reduce((acc, it) => acc + it.discrepancy, 0);
  const totalShrinkage = Math.abs(auditItems.filter((i) => i.discrepancy < 0).reduce((acc, it) => acc + it.discrepancyValue, 0));

  audits.push({
    id: `AUD-LEG-20260825-01`,
    branchId: legazpiBranch.id,
    branchName: legazpiBranch.name,
    auditedBy: 'Ma. Theresa Santos (Shift Lead)',
    auditorRole: 'Inventory Controller',
    timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    items: auditItems,
    totalSystemStock: totalSystem,
    totalPhysicalCount: totalPhysical,
    totalDiscrepancyUnits: totalDiscrepancy,
    totalShrinkageValue: totalShrinkage,
    status: 'Reconciled',
    discrepancyReasonCategory: 'Damaged Found Unlogged',
    notes: 'Weekly physical shelf count reconciliation. Minor 2-unit discrepancy reconciled and adjusted in book stock.',
    reconciledAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    reconciledBy: 'Eduardo Ramirez (Branch Manager)',
  });

  return audits;
}
