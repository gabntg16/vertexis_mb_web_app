import React, { useMemo } from 'react';
import {
  ArrowRight,
  Boxes,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileCheck,
  PackageCheck,
  Receipt,
  Truck,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { DailyLogStatus } from '../../types';

export const StaffDashboard: React.FC<{
  onNavigateTab: (tab: string) => void;
}> = ({ onNavigateTab }) => {
  const { currentUser, currentBranch, dailyShiftLogs, inventory, orders, deliveries, themeMode } = useData();
  const isDark = themeMode === 'dark';
  const branchId = currentUser?.branchId || currentBranch?.id;
  const today = new Date().toISOString().split('T')[0];

  const todayLog = useMemo(
    () => (dailyShiftLogs || []).find((log) => log.branchId === branchId && log.date === today),
    [dailyShiftLogs, branchId, today]
  );
  const branchInventory = useMemo(
    () => (inventory || []).filter((item) => item.branchId === branchId),
    [inventory, branchId]
  );
  const openOrders = useMemo(
    () => (orders || []).filter((order) => order.branchId === branchId && !['completed', 'rejected'].includes(order.status)),
    [orders, branchId]
  );
  const incomingDeliveries = useMemo(
    () => (deliveries || []).filter((delivery) => delivery.branchId === branchId && !['delivered', 'canceled'].includes(delivery.status)),
    [deliveries, branchId]
  );

  const shiftStatus = todayLog?.status || DailyLogStatus.DRAFT;
  const shiftStatusLabel = shiftStatus === DailyLogStatus.VALIDATED_AND_LOCKED
    ? 'Validated & Locked'
    : shiftStatus === DailyLogStatus.PENDING_VALIDATION
    ? 'Pending Manager Review'
    : shiftStatus === DailyLogStatus.RETURNED_FOR_REVISION
    ? 'Needs Revision'
    : 'Draft in Progress';
  const cardClass = `rounded-2xl border p-4 ${
    isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200/80 shadow-xs'
  }`;
  const quickActions = [
    { id: 'physical_counts', label: 'Record Physical Counts', icon: ClipboardCheck, tourId: 'staff-tour-action-counts' },
    { id: 'manual_sales', label: 'Enter Manual Sales', icon: Receipt, tourId: 'staff-tour-action-sales' },
    { id: 'inbound_receiving', label: 'Receive Shipment', icon: PackageCheck, tourId: 'staff-tour-action-receiving' },
    { id: 'shift_summary', label: 'Review Shift Summary', icon: FileCheck, tourId: 'staff-tour-action-shift' },
  ];

  return (
    <div className="space-y-6" id="staff-dashboard-view">
      <div
        id="staff-tour-header"
        className={`rounded-3xl border p-5 sm:p-7 ${
          isDark
            ? 'bg-gradient-to-r from-neutral-900 via-[#132430] to-neutral-900 border-neutral-800'
            : 'bg-gradient-to-r from-sky-50 via-white to-emerald-50 border-[#80C7F2]/30'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Frontline Operations
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-2 text-neutral-900 dark:text-white">
              Good day, {currentUser?.name || 'Team Member'}
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1 max-w-2xl">
              {currentBranch?.name || 'Branch Station'} - Stay on top of today&apos;s counts, sales entries, receiving, and shift sign-off.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-neutral-200/80 dark:border-neutral-700 bg-white/70 dark:bg-black/20 px-3 py-2.5 shrink-0">
            <CalendarClock className="w-4 h-4 text-[#F37021]" />
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-neutral-400">Today&apos;s shift</p>
              <p className="text-xs font-bold text-neutral-900 dark:text-white">{shiftStatusLabel}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div id="staff-tour-shift-status" className={cardClass}>
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-500"><span>Shift Status</span><CalendarClock className="w-4 h-4 text-[#F37021]" /></div>
          <p className="mt-2 text-lg font-black text-neutral-900 dark:text-white">{shiftStatusLabel}</p>
          <p className="text-[11px] text-neutral-400 mt-1">{todayLog ? "Today's log is available" : 'Start your daily record'}</p>
        </div>
        <div id="staff-tour-skus" className={cardClass}>
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-500"><span>SKUs to Count</span><Boxes className="w-4 h-4 text-sky-500" /></div>
          <p className="mt-2 text-2xl font-black text-neutral-900 dark:text-white">{branchInventory.length}</p>
          <p className="text-[11px] text-neutral-400 mt-1">Current branch assortment</p>
        </div>
        <div id="staff-tour-shipments" className={cardClass}>
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-500"><span>Incoming Shipments</span><Truck className="w-4 h-4 text-amber-500" /></div>
          <p className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">{incomingDeliveries.length}</p>
          <p className="text-[11px] text-neutral-400 mt-1">Awaiting receiving inspection</p>
        </div>
        <div id="staff-tour-requisitions" className={cardClass}>
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-500"><span>Open Requisitions</span><PackageCheck className="w-4 h-4 text-emerald-500" /></div>
          <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">{openOrders.length}</p>
          <p className="text-[11px] text-neutral-400 mt-1">Branch orders in progress</p>
        </div>
      </div>

      <section id="staff-tour-workbench" className={cardClass}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">Today&apos;s Workbench</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Open the task you need without leaving the dashboard.</p>
          </div>
          <ClipboardCheck className="w-5 h-5 text-[#80C7F2] shrink-0" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                id={action.tourId}
                type="button"
                onClick={() => onNavigateTab(action.id)}
                className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/80 dark:bg-neutral-900/60 px-3 py-2.5 text-left text-xs font-bold text-neutral-700 dark:text-neutral-200 hover:border-[#80C7F2] hover:bg-[#80C7F2]/10 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2 min-w-0"><Icon className="w-4 h-4 text-[#1a7bb5] shrink-0" /><span className="truncate">{action.label}</span></span>
                <ArrowRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
