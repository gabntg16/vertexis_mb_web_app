import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface AuditPDFItem {
  productId: string;
  productName: string;
  flavor: string;
  stock: number;
  wholesalePrice?: number;
  unitPrice?: number;
}

export interface AuditPDFOptions {
  branchCode?: string;
  auditorName?: string;
  shift?: string;
  date?: string;
  notes?: string;
}

/**
 * Generates and downloads a printable A4 Physical Inventory Count Worksheet PDF.
 * Follows BIR / enterprise audit standards with expected book count and blank entry boxes for physical count.
 */
export function generateAuditPDF(
  branchName: string,
  inventoryData: AuditPDFItem[],
  options?: AuditPDFOptions
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const currentDate = options?.date || new Date().toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const branchCode = options?.branchCode || 'BR-LEG-01';
  const auditorName = options?.auditorName || '__________________________';
  const shift = options?.shift || 'Morning / Opening Shift';

  // 1. Header Banner & Branding
  // Primary Orange bar
  doc.setFillColor(243, 112, 33); // #F37021
  doc.rect(0, 0, 210, 8, 'F');

  // Title & System Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(26, 54, 93); // Dark Navy
  doc.text('VertexIS', 14, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('The Marsh Bites Management System • Naga Central Commissary & Legazpi Sub-Branch', 38, 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('PHYSICAL INVENTORY AUDIT SHEET', 14, 26);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Periodic Physical Shelf Stock Count & Shrinkage Reconciliation Worksheet', 14, 31);

  // Divider line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 34, 196, 34);

  // 2. Metadata Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 37, 182, 22, 2, 2, 'FD');
  doc.setDrawColor(203, 213, 225);

  doc.setFontSize(8.5);
  // Column 1
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Branch / Location:', 18, 43);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`${branchName} (${branchCode})`, 48, 43);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Audit Date & Time:', 18, 50);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(currentDate, 48, 50);

  // Column 2
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Auditor / Staff Name:', 110, 43);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(auditorName, 145, 43);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Duty Shift:', 110, 50);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(shift, 145, 50);

  // 3. Instructions Alert
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Instructions: Count every retail-ready pack on display and backroom storage. Mark damaged/melted items separately. Enter values clearly.',
    14,
    64
  );

  // 4. AutoTable Data Preparation
  const tableData = inventoryData.map((item, index) => {
    const skuCode = `MB-${item.productId.toUpperCase().replace(/[^A-Z0-9]/g, '') || `00${index + 1}`}`;
    return [
      skuCode,
      `${item.flavor || item.productName}`,
      'Pouch (150g)',
      `${item.stock} pk`,
      '[   ]', // Blank box indicator for Actual Shelf Count
      '[   ]', // Blank box indicator for Damaged/Spoiled Units
      '_______________________', // Discrepancy / Remarks blank line
    ];
  });

  // Generate Table
  autoTable(doc, {
    startY: 68,
    head: [
      [
        'SKU Code',
        'Item / Flavor Name',
        'Unit Packaging',
        'Expected Book Stock\n(System Count)',
        'Actual Shelf Count\n(Handwritten)',
        'Damaged / Spoiled\n(Units)',
        'Discrepancy / Remarks\n(Notes / Cause)',
      ],
    ],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [26, 54, 93], // Dark Navy
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
      valign: 'middle',
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { cellWidth: 22, halign: 'center', font: 'courier', fontStyle: 'bold', fontSize: 8 },
      1: { cellWidth: 50, fontStyle: 'bold', fontSize: 8.5 },
      2: { cellWidth: 22, halign: 'center', fontSize: 8 },
      3: { cellWidth: 24, halign: 'center', fontStyle: 'bold', fontSize: 9, textColor: [0, 96, 156] },
      4: { cellWidth: 24, halign: 'center', fontSize: 9, fontStyle: 'bold' },
      5: { cellWidth: 20, halign: 'center', fontSize: 8.5 },
      6: { cellWidth: 38, fontSize: 7.5, textColor: [100, 116, 139] },
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      valign: 'middle',
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
  });

  // Calculate final Y position after table
  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : 220;

  // 5. Verification Sign-Off Block
  if (finalY < 250) {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(14, finalY, 196, finalY);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('AUDIT VERIFICATION & CERTIFICATION', 14, finalY + 5);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(
      'I hereby certify that the physical inventory counts recorded above have been counted honestly and verified on-site.',
      14,
      finalY + 9
    );

    // Signatures grid
    const sigY = finalY + 22;

    // Counted By
    doc.setDrawColor(148, 163, 184);
    doc.line(14, sigY, 68, sigY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text('Physical Counted By:', 14, sigY + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Signature over Printed Name / Staff', 14, sigY + 8);

    // Verified By
    doc.line(78, sigY, 132, sigY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text('Verified By Branch Manager:', 78, sigY + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Signature over Printed Name / Manager', 78, sigY + 8);

    // Reconciled By Commissary
    doc.line(142, sigY, 196, sigY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text('Ledger Reconciled By:', 142, sigY + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('VertexIS System Admin / Commissary', 142, sigY + 8);
  }

  // 6. Footer
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      `VertexIS Physical Count Sheet • Ref: AUD-${branchCode}-${new Date().toISOString().slice(0, 10)} • Confidential Internal Document`,
      14,
      290
    );
    doc.text(`Page ${i} of ${pageCount}`, 185, 290, { align: 'right' });
  }

  // Save the document with clean filename
  const cleanBranchName = branchName.replace(/[^a-zA-Z0-9]/g, '_');
  const dateStamp = new Date().toISOString().slice(0, 10);
  doc.save(`VertexIS_Physical_Count_Sheet_${cleanBranchName}_${dateStamp}.pdf`);

  return doc;
}
