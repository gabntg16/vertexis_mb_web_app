import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import marshbitesLogo from '../assets/images/marshbites_logo.jpg';
import {
  LayoutDashboard,
  ShoppingBag,
  ChefHat,
  Building2,
  Truck,
  TrendingUp,
  Calendar,
  Megaphone,
  CreditCard,
  Boxes,
  Receipt,
  PackageCheck,
  Trash2,
  ClipboardCheck,
  FileCheck,
  ShieldCheck,
  Store,
  MapPin,
  X,
  ChevronLeft,
  ChevronRight,
  Users,
  Tag,
  ArrowLeftRight,
} from 'lucide-react';
import { isSuperAdmin, isBranchManager, isBranchStaff } from '../utils/securityValidator';
import { DailyLogStatus } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isMobileOpen,
  setIsMobileOpen,
}) => {
  const {
    currentUser,
    currentBranch,
    pendingOrdersCount,
    readyForDispatchOrdersCount,
    deliveries,
    orders,
    dailyShiftLogs,
  } = useData();

  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!currentUser) return null;

  const isSuper = isSuperAdmin(currentUser);
  const isManager = isBranchManager(currentUser);
  const isStaff = isBranchStaff(currentUser);

  // Badge counts
  const branchInTransitCount = !isSuper && currentBranch
    ? (deliveries || []).filter((d) => {
        const order = (orders || []).find((o) => o.id === d.orderId);
        return order?.branchId === currentBranch.id && d.status === 'inTransit';
      }).length
    : 0;

  const branchReadyOrdersCount = !isSuper && currentBranch
    ? (orders || []).filter(
        (o) =>
          o.branchId === currentBranch.id &&
          (o.productionStage === 'ready_for_dispatch' || (o.productionStage as string) === 'ready') &&
          !o.isDispatched &&
          o.status !== 'completed' &&
          o.status !== 'rejected'
      ).length
    : 0;

  // Pending logs awaiting validation by branch manager
  const pendingValidationCount = useMemo(() => {
    const bId = currentUser?.branchId || currentBranch?.id || 'b-legazpi';
    return (dailyShiftLogs || []).filter(
      (l) => l.branchId === bId && l.status === DailyLogStatus.PENDING_VALIDATION
    ).length;
  }, [dailyShiftLogs, currentUser, currentBranch]);

  // Current shift status for branch staff badge
  const today = new Date().toISOString().split('T')[0];
  const staffShiftStatus = useMemo(() => {
    const bId = currentUser?.branchId || currentBranch?.id || 'b-legazpi';
    const log = (dailyShiftLogs || []).find((l) => l.branchId === bId && l.date === today);
    return log?.status || DailyLogStatus.DRAFT;
  }, [dailyShiftLogs, currentUser, currentBranch, today]);

  // 1. BRANCH_STAFF Navigation: Render ONLY Frontline Tabs
  const staffTabs = [
    { id: 'staff_dashboard', label: 'Operations Dashboard', icon: LayoutDashboard },
    { id: 'physical_counts', label: 'Daily Physical Counts', icon: ClipboardCheck },
    { id: 'manual_sales', label: 'Manual Sales Entry', icon: Receipt },
    { id: 'spoilage_wastage', label: 'Spoilage / Wastage', icon: Trash2 },
    { id: 'inbound_receiving', label: 'Inbound Receiving', icon: PackageCheck },
    {
      id: 'shift_summary',
      label: 'Shift Summary & Approval',
      icon: FileCheck,
      badge:
        staffShiftStatus === DailyLogStatus.RETURNED_FOR_REVISION
          ? 'REVISION'
          : staffShiftStatus === DailyLogStatus.PENDING_VALIDATION
          ? 'PENDING'
          : staffShiftStatus === DailyLogStatus.VALIDATED_AND_LOCKED
          ? 'LOCKED'
          : 'DRAFT',
      badgeColor:
        staffShiftStatus === DailyLogStatus.RETURNED_FOR_REVISION
          ? 'bg-rose-600 text-white'
          : staffShiftStatus === DailyLogStatus.PENDING_VALIDATION
          ? 'bg-sky-600 text-white'
          : staffShiftStatus === DailyLogStatus.VALIDATED_AND_LOCKED
          ? 'bg-emerald-600 text-white'
          : 'bg-amber-500 text-white',
    },
  ];

  // 2. BRANCH_MANAGER Navigation: Render Store Leadership & Audit Tabs
  const managerTabs = [
    { id: 'branch_analytics', label: 'Branch Dashboard & Analytics', icon: TrendingUp },
    { id: 'current_stock', label: 'Current Branch Stock', icon: Boxes },
    {
      id: 'log_validation',
      label: 'Log Validation Dashboard',
      icon: ShieldCheck,
      badge: pendingValidationCount > 0 ? pendingValidationCount : undefined,
      badgeColor: 'bg-[#F37021] text-white',
    },
    {
      id: 'requisitions',
      label: 'Create Requisition & Upload Payment',
      icon: ShoppingBag,
      badge: branchReadyOrdersCount > 0 ? branchReadyOrdersCount : undefined,
      badgeColor: 'bg-emerald-500 text-white',
    },
  ];

  // 3. SUPER_ADMIN Navigation: Render HQ Executive & Network Tabs
  const adminPrimaryTabs = [
    { id: 'network_analytics', label: 'Network Dashboard & Analytics', icon: TrendingUp },
    {
      id: 'requisition_approval',
      label: 'Requisition & Payment Approval',
      icon: ShoppingBag,
      badge:
        pendingOrdersCount + readyForDispatchOrdersCount > 0
          ? pendingOrdersCount + readyForDispatchOrdersCount
          : undefined,
      badgeColor:
        readyForDispatchOrdersCount > 0 && pendingOrdersCount === 0
          ? 'bg-emerald-500 text-white'
          : 'bg-[#F37021] text-white',
    },
    { id: 'master_pricing', label: 'Master Inventory & Pricing', icon: Tag },
  ];

  const adminSecondaryTabs = [
    { id: 'production', label: 'Commissary Batching', icon: ChefHat },
    { id: 'branches', label: '19 Branches', icon: Building2 },
    {
      id: 'logistics',
      label: 'Fleet & Dispatch',
      icon: Truck,
      badge: readyForDispatchOrdersCount > 0 ? readyForDispatchOrdersCount : undefined,
      badgeColor: 'bg-emerald-500 text-white',
    },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'user_management', label: 'User Management', icon: Users },
  ];

  // Super Admin secondary operations are rendered in their dedicated
  // "Central Commissary Network" group below. Keeping them out of the
  // primary list prevents the navigation items from appearing twice.
  const tabs = isStaff ? staffTabs : isManager ? managerTabs : adminPrimaryTabs;

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setIsMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const getRoleBadgeStyle = (user: typeof currentUser) => {
    if (isSuperAdmin(user)) {
      return {
        bg: 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300',
        badge: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
        label: 'SUPER_ADMIN',
        roleTitle: 'HQ Super Admin',
        icon: ShieldCheck,
        iconColor: 'text-amber-500',
      };
    }
    if (isBranchManager(user)) {
      return {
        bg: 'bg-[#80C7F2]/10 border-[#80C7F2]/30 text-[#0c5077] dark:text-[#80C7F2]',
        badge: 'bg-[#80C7F2]/20 text-[#0369a1] dark:text-[#80C7F2]',
        label: 'BRANCH_MANAGER',
        roleTitle: 'Store Lead',
        icon: Store,
        iconColor: 'text-[#80C7F2]',
      };
    }
    return {
      bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300',
      badge: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
      label: 'BRANCH_STAFF',
      roleTitle: 'Frontline Staff',
      icon: ClipboardCheck,
      iconColor: 'text-emerald-500',
    };
  };

  const currentRoleConfig = getRoleBadgeStyle(currentUser);
  const RoleIcon = currentRoleConfig.icon;

  const sidebarContent = (
    <div className="flex flex-col h-full select-none">
      {/* Brand Header */}
      <div className="p-4 sm:p-5 border-b border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between gap-3">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-white dark:bg-neutral-800 flex items-center justify-center shadow-xs overflow-hidden border border-neutral-200 dark:border-neutral-700 p-0.5 shrink-0">
            <img
              src={marshbitesLogo}
              alt="The Marsh Bites"
              className="w-full h-full object-cover rounded-lg"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.includes('marshbites_logo.jpg')) {
                  target.src = '/marshbites_logo.jpg';
                }
              }}
            />
          </div>

          {(!isCollapsed || isMobileOpen) && (
            <div className="flex flex-col min-w-0">
              <div className="flex items-center space-x-1.5 truncate">
                <span className="font-black tracking-tight text-lg text-neutral-900 dark:text-white leading-none">
                  Vertex<span className="text-[#F37021]">IS</span>
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#80C7F2]/15 text-[#0369a1] dark:bg-[#80C7F2]/25 dark:text-[#80C7F2] border border-[#80C7F2]/30 leading-none">
                  Marsh Bites
                </span>
              </div>
              <p className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 truncate tracking-tight mt-1">
                {isSuper
                  ? 'Legazpi Central Commissary HQ'
                  : `${currentBranch?.name?.replace('Marsh Bites ', '') || 'Branch'} Station`}
              </p>
            </div>
          )}
        </div>

        {/* Mobile Close Button */}
        <button
          type="button"
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          title="Close Sidebar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Desktop Collapse Toggle Button */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Current signed-in user and RBAC scope */}
      <div className="px-3 pt-3 pb-1">
        <div className="relative">
          <div
            id="current-user-card"
            className={`w-full flex items-center justify-between p-2.5 rounded-2xl border text-xs font-semibold transition-all ${currentRoleConfig.bg} hover:opacity-90`}
            title="Current signed-in user and access scope"
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="p-1 rounded-lg bg-white/60 dark:bg-black/40 shrink-0">
                <RoleIcon className={`w-4 h-4 ${currentRoleConfig.iconColor}`} />
              </div>
              {(!isCollapsed || isMobileOpen) && (
                <div className="text-left min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-extrabold truncate leading-tight">
                      {isSuper
                        ? 'HQ Super Admin'
                        : isManager
                        ? 'Branch Manager'
                        : 'Branch Staff'}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1 rounded font-mono ${currentRoleConfig.badge}`}
                    >
                      {currentRoleConfig.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block truncate mt-0.5">
                    {currentUser.name} • {isSuper ? 'Legazpi HQ' : currentBranch?.name?.replace('Marsh Bites - ', '') || 'Legazpi'}
                  </span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-thin">
        {(!isCollapsed || isMobileOpen) && (
          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-3 py-1.5">
            {isStaff
              ? 'Frontline Ground Operations'
              : isManager
              ? 'Store Leadership & Audit'
              : 'HQ Executive Operations'}
          </p>
        )}

        {/* Primary Role Tabs */}
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              onClick={() => handleTabClick(tab.id)}
              className={`mallow-nav-item w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                isActive
                  ? 'mallow-nav-item-active bg-[#80C7F2] text-neutral-950 font-bold shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/80'
              }`}
              title={tab.label}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-neutral-950' : 'text-neutral-400 dark:text-neutral-400'
                  }`}
                />
                {(!isCollapsed || isMobileOpen) && (
                  <span className="truncate text-left">{tab.label}</span>
                )}
              </div>

              {tab.badge !== undefined && (!isCollapsed || isMobileOpen) && (
                <span
                  className={`px-2 py-0.5 text-[10px] font-black rounded-full leading-none shrink-0 ${
                    tab.badgeColor || 'bg-red-500 text-white'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Super Admin Secondary Operations Group */}
        {isSuper && (
          <div className="pt-3 mt-3 border-t border-neutral-200/60 dark:border-neutral-800">
            {(!isCollapsed || isMobileOpen) && (
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-3 py-1.5">
                Central Commissary Network
              </p>
            )}
            {adminSecondaryTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`nav-tab-${tab.id}`}
                  onClick={() => handleTabClick(tab.id)}
                  className={`mallow-nav-item w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                    isActive
                      ? 'mallow-nav-item-active bg-[#80C7F2] text-neutral-950 font-bold shadow-xs'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/80'
                  }`}
                  title={tab.label}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-neutral-950' : 'text-neutral-400'
                      }`}
                    />
                    {(!isCollapsed || isMobileOpen) && (
                      <span className="truncate text-left">{tab.label}</span>
                    )}
                  </div>
                  {tab.badge !== undefined && (!isCollapsed || isMobileOpen) && (
                    <span
                      className={`px-2 py-0.5 text-[10px] font-black rounded-full leading-none shrink-0 ${
                        tab.badgeColor || 'bg-red-500 text-white'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`mallow-sidebar hidden lg:flex flex-col shrink-0 sticky top-0 h-screen border-r transition-all duration-300 z-30 ${
          isCollapsed ? 'w-18' : 'w-64 xl:w-72'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile / Tablet Slide-Over Drawer with Backdrop */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Slide-in Drawer */}
          <div className="mallow-sidebar relative w-4/5 max-w-xs h-full border-r shadow-2xl z-10 flex flex-col animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
