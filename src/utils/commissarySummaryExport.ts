import * as XLSX from 'xlsx';
import { quantityColumns, summaryNotes, localDate, commissaryTableText, type SummaryView, type buildCommissarySummary } from './commissarySummary';

export function createCommissaryWorkbook(report: ReturnType<typeof buildCommissarySummary>, scope: string, generatedAt = new Date()) {
  const keys = Object.keys(quantityColumns) as (keyof typeof quantityColumns)[];
  const values = (row: typeof report.totals) => keys.map(key => row[key]);
  const quantityWidths = keys.map(key => ({ wch: Math.max(23, quantityColumns[key].length + 2) }));
  const summaryRows = [
    ['Commissary Requisition Summary'],
    ['Generated', generatedAt.toLocaleString()],
    ['Scope', scope],
    ['Requisitions', report.orderCount],
    [],
    ['Product ID', 'Flavor / product', ...Object.values(quantityColumns)],
    ['', 'TOTAL', ...values(report.totals)],
    ...report.flavors.map(row => [row.productId, row.flavor, ...values(row)]),
    [], ['Report notes'], ...summaryNotes.map(note => [note]),
  ];
  const summary = XLSX.utils.aoa_to_sheet(summaryRows);
  summary['!cols'] = [{ wch: 20 }, { wch: 36 }, ...quantityWidths];
  summary['!merges'] = [0, ...summaryNotes.map((_, index) => report.flavors.length + 9 + index)].map(r => ({ s: { r, c: 0 }, e: { r, c: 9 } }));
  summary['!rows'] = summaryRows.map((_, index) => ({ hpt: index >= report.flavors.length + 9 ? 32 : 24 }));
  const details = XLSX.utils.aoa_to_sheet([
    ['Order ID', 'Branch', 'Order date', 'Product ID', 'Flavor / product', 'Current stage', ...Object.values(quantityColumns), 'Dispatch quantity source'],
    ...report.details.map(row => [row.orderId, row.branch, row.createdDate, row.productId, row.flavor, row.stage, ...values(row), row.dispatchBasis]),
  ]);
  details['!cols'] = [...[20, 30, 16, 20, 36, 36].map(wch => ({ wch })), ...quantityWidths, { wch: 36 }];
  if (report.details.length) details['!autofilter'] = { ref: details['!ref']! };
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, summary, 'Summary');
  XLSX.utils.book_append_sheet(workbook, details, 'Requisition Detail');
  return workbook;
}

export function downloadCommissarySummary(report: ReturnType<typeof buildCommissarySummary>, scope: string) {
  XLSX.writeFile(createCommissaryWorkbook(report, scope), `VertexIS_Commissary_Summary_${localDate(new Date())}.xlsx`);
}

export function downloadCommissaryCSV(report: ReturnType<typeof buildCommissarySummary>, view: SummaryView) {
  const url = URL.createObjectURL(new Blob(['\uFEFF', commissaryTableText(report, view, ',')], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `VertexIS_Commissary_${view}_${localDate(new Date())}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
