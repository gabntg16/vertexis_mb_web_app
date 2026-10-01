import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Calendar, Check, Copy, Download, FileSpreadsheet, FileText, Filter, Sparkles, X } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { buildCommissarySummary, commissaryTableText, getCommissaryTable, localDate, summaryNotes, type SummaryView, type SummaryStage } from '../../utils/commissarySummary';

const secondary = 'inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-neutral-100 px-3 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-200 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700';
const primary = 'inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50';
const inputStyle = 'min-w-0 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white';

export const CommissarySummary: React.FC = () => {
  const { orders, products, branches } = useData();
  const [open, setOpen] = useState(false);
  const [branchId, setBranchId] = useState('all');
  const [status, setStatus] = useState<SummaryStage>('all');
  const [period, setPeriod] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [view, setView] = useState<SummaryView>('flavors');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);
  useEffect(() => {
    if (!open || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [open]);

  const dateFrom = new Date();
  if (period === '7days') dateFrom.setDate(dateFrom.getDate() - 6);
  if (period === '30days') dateFrom.setDate(dateFrom.getDate() - 29);
  const effectiveFrom = period === 'custom' ? from : period === 'all' ? '' : localDate(dateFrom);
  const effectiveTo = period === 'custom' ? to : period === 'all' ? '' : localDate(new Date());
  const invalidRange = Boolean(effectiveFrom && effectiveTo && effectiveFrom > effectiveTo);
  const report = useMemo(() => buildCommissarySummary(orders, products, { branchId, from: effectiveFrom, to: effectiveTo, stage: status }), [orders, products, branchId, status, effectiveFrom, effectiveTo]);
  const quickReport = useMemo(() => buildCommissarySummary(orders, products, { branchId: 'all', from: '', to: '' }), [orders, products]);
  const branchOptions = useMemo(() => {
    const names = new Map(branches.map(branch => [branch.id, branch.name]));
    orders.forEach(order => { if (!names.has(order.branchId)) names.set(order.branchId, order.branchName); });
    return [...names].sort((a, b) => a[1].localeCompare(b[1]));
  }, [branches, orders]);
  const scope = `${branchId === 'all' ? 'All branches' : branchOptions.find(([id]) => id === branchId)?.[1] ?? branchId}; status: ${status}; order dates: ${effectiveFrom || 'earliest'} to ${effectiveTo || 'latest'}`;
  const table = useMemo(() => getCommissaryTable(report, view), [report, view]);
  const disabled = busy || invalidRange || !table.rows.length;
  const download = async (format: 'xlsx' | 'csv', quick = false) => {
    setBusy(true); setError('');
    try {
      const exporter = await import('../../utils/commissarySummaryExport');
      if (format === 'csv') exporter.downloadCommissaryCSV(report, view);
      else exporter.downloadCommissarySummary(quick ? quickReport : report, quick ? 'All branches; all statuses; all order dates' : scope);
    } catch { setError('The summary could not be downloaded. Please try again.'); }
    finally { setBusy(false); }
  };
  const copy = async () => {
    setBusy(true); setError('');
    try {
      await navigator.clipboard.writeText(commissaryTableText(report, view, '\t'));
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch { setError('Clipboard access is unavailable. Download Excel or CSV instead.'); }
    finally { setBusy(false); }
  };
  const csvButton = (label: string) => <button type="button" onClick={() => download('csv')} disabled={disabled} className={secondary}><FileText className="h-3.5 w-3.5 text-sky-500" />{label}</button>;
  const excelButton = (label: string) => <button type="button" onClick={() => download('xlsx')} disabled={disabled} className={primary}><Download className="h-4 w-4" />{busy ? 'Preparing…' : label}</button>;

  return <>
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => download('xlsx', true)} disabled={busy || !quickReport.details.length} title="Quick download: all branches, statuses and order dates" className={secondary}><Download className="h-3.5 w-3.5 text-emerald-500" />{busy && !open ? 'Preparing…' : 'Quick .xlsx'}</button>
      <button type="button" onClick={() => { setError(''); setOpen(true); }} aria-haspopup="dialog" className={primary}><FileSpreadsheet className="h-4 w-4" />Download Result</button>
      {!open && error && <p role="alert" className="w-full text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
    {open && <dialog ref={dialogRef} aria-labelledby="commissary-summary-title" aria-describedby="commissary-summary-description" onCancel={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) setOpen(false); }} className="fixed inset-0 m-auto w-[calc(100%_-_1.5rem)] max-w-6xl max-h-[92dvh] overflow-hidden rounded-3xl border border-neutral-200 bg-white p-0 text-neutral-900 shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-xs dark:border-neutral-800 dark:bg-[#181818] dark:text-white">
      <div className="flex max-h-[92dvh] flex-col">
        <div className="shrink-0 border-b border-neutral-200 bg-gradient-to-r from-transparent via-sky-50/40 to-transparent p-5 sm:p-6 dark:border-neutral-800 dark:via-sky-950/10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 pr-8 lg:pr-0">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md"><FileSpreadsheet className="h-6 w-6" /></div>
              <div><div className="flex flex-wrap items-center gap-2"><h2 id="commissary-summary-title" className="text-lg sm:text-xl font-black tracking-tight">Download Requisition Summary</h2><span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">Commissary Format</span></div><p id="commissary-summary-description" className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Export requested units, kitchen progress, finished quantities and dispatch totals.</p></div>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:pr-7"><button type="button" onClick={copy} disabled={disabled} className={secondary}>{copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}<span role="status">{copied ? 'Copied!' : 'Copy to Excel'}</span></button>{csvButton('Download CSV')}{excelButton('Download Excel (.xlsx)')}</div>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close requisition summary" className="absolute right-3 top-4 rounded-xl p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 bg-neutral-50/70 p-4 text-xs dark:border-neutral-800 dark:bg-neutral-900/50">
            <div className="flex flex-wrap items-center gap-2.5">
              <label className="flex items-center gap-1.5"><Building2 aria-hidden="true" className="h-3.5 w-3.5 text-neutral-400" /><span className="sr-only">Branch</span><select value={branchId} onChange={event => setBranchId(event.target.value)} className={`${inputStyle} max-w-56`}><option value="all">All Branches / Partners</option>{branchOptions.map(([id, name]) => <option key={id} value={id}>{name.replace('Marsh Bites - ', '')}</option>)}</select></label>
              <label className="flex items-center gap-1.5"><Filter aria-hidden="true" className="h-3.5 w-3.5 text-neutral-400" /><span className="sr-only">Production status</span><select value={status} onChange={event => setStatus(event.target.value as SummaryStage)} className={inputStyle}><option value="all">All Statuses</option><option value="awaiting">Awaiting Approval / Proof</option><option value="toMake">To Make</option><option value="kitchen">In Kitchen / QC</option><option value="ready">Ready for Dispatch</option><option value="dispatched">Dispatched</option></select></label>
              <label className="flex items-center gap-1.5"><Calendar aria-hidden="true" className="h-3.5 w-3.5 text-neutral-400" /><span className="sr-only">Order date range</span><select value={period} onChange={event => setPeriod(event.target.value)} className={inputStyle}><option value="all">All Time</option><option value="today">Today Only</option><option value="7days">Last 7 Days</option><option value="30days">Last 30 Days</option><option value="custom">Custom Dates</option></select></label>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-neutral-500 dark:text-neutral-400"><span>Rows: <strong className="text-neutral-900 dark:text-white">{table.rows.length}</strong></span><span>Requested: <strong className="text-neutral-900 dark:text-white">{report.totals.requested.toLocaleString()}</strong></span><span>Done: <strong className="text-emerald-600 dark:text-emerald-400">{report.totals.done.toLocaleString()}</strong></span><span>Dispatched: <strong className="text-emerald-600 dark:text-emerald-400">{report.totals.dispatched.toLocaleString()}</strong></span></div>
            {period === 'custom' && <div className="flex w-full flex-wrap gap-3"><label className="flex items-center gap-2">From<input type="date" value={from} max={to || undefined} onChange={event => setFrom(event.target.value)} className={inputStyle} /></label><label className="flex items-center gap-2">To<input type="date" value={to} min={from || undefined} onChange={event => setTo(event.target.value)} className={inputStyle} /></label></div>}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3"><div className="flex gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-900">{(['flavors', 'requisitions'] as const).map(value => <button key={value} type="button" aria-pressed={view === value} onClick={() => { setView(value); setCopied(false); }} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${view === value ? 'bg-white text-emerald-700 shadow-sm dark:bg-neutral-800 dark:text-emerald-400' : 'text-neutral-500 dark:text-neutral-400'}`}>{value === 'flavors' ? 'By flavor' : 'By requisition'}</button>)}</div><span className="text-[11px] text-neutral-500 dark:text-neutral-400">{report.orderCount} requisitions · All quantities in units</span></div>
          {(invalidRange || error) && <p role="alert" className="px-4 pt-3 text-sm text-rose-600 dark:text-rose-400">{invalidRange ? 'The end date must be on or after the start date.' : error}</p>}
          <div className="p-4"><div tabIndex={0} role="region" aria-label="Commissary spreadsheet preview, scroll for more columns" className="max-h-[40dvh] overflow-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
            <table className="w-full whitespace-nowrap text-left text-xs"><caption className="sr-only">{view === 'flavors' ? 'Flavor summary' : 'Requisition detail'} spreadsheet preview</caption><thead className="sticky top-0 z-10 bg-neutral-100 dark:bg-neutral-800"><tr>{table.headers.map(header => <th key={header} scope="col" className="border-r border-neutral-200 px-3 py-3 text-[11px] font-bold uppercase tracking-wide last:border-r-0 dark:border-neutral-700">{header}</th>)}</tr></thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">{!invalidRange && table.rows.map((row, index) => <tr key={index} className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20">{row.map((cell, column) => <td key={column} className={`border-r border-neutral-100 px-3 py-2.5 last:border-r-0 dark:border-neutral-800 ${typeof cell === 'number' ? 'text-right font-mono font-semibold tabular-nums' : column < 2 ? 'font-semibold' : 'text-neutral-500 dark:text-neutral-400'}`}>{typeof cell === 'number' ? cell.toLocaleString() : cell}</td>)}</tr>)}{(!table.rows.length || invalidRange) && <tr><td colSpan={table.headers.length} className="p-8 text-center text-neutral-500">{invalidRange ? 'Choose a valid date range to preview the summary.' : 'No requisitions match these filters.'}</td></tr>}</tbody>
            </table>
          </div></div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-neutral-200 bg-neutral-50/60 p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
          <div className="flex min-w-0 flex-1 items-start gap-2 text-[11px] text-neutral-500 dark:text-neutral-400"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /><div><p>Excel includes flavor totals and requisition details. CSV and Copy export the selected table.</p><p className="mt-0.5">Done includes ready and dispatched units. Dates use order creation; archived history is included.</p><details className="mt-1"><summary className="cursor-pointer font-semibold">How quantities are counted</summary><ul className="mt-2 max-h-24 list-disc space-y-1 overflow-auto pl-4">{summaryNotes.map(note => <li key={note}>{note}</li>)}</ul></details></div></div>
          <div className="flex gap-2">{csvButton('Export CSV')}{excelButton('Download .xlsx')}</div>
        </div>
      </div>
    </dialog>}
  </>;
};
