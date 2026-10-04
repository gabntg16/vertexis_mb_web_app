import { isOrderReadyForDispatch } from '../utils/dispatchEligibility';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import marshbitesLogo from '../assets/images/marshbites_logo.jpg';
import {
  LayoutDashboard,
  ShoppingBag,
  ChefHat,
  Building2,
  Truck,
  TrendingUp,
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
  Tag,
  ArrowLeftRight,
  LogOut,
  Settings,
} from 'lucide-react';
import { isSuperAdmin, isBranchManager, isBranchStaff } from '../utils/securityValidator';
import { DailyLogStatus } from '../types';
import { LogoutConfirmModal } from './common/LogoutConfirmModal';

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
    inboundReceipts,
    pendingOrdersCount,
    readyForDispatchOrdersCount,
    orders,
    deliveries,
    dailyShiftLogs,
    logout,
  } = useData();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const mobileDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!isMobileOpen) return;
    const dialog = mobileDialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const desktop = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = () => {
      if (desktop.matches) setIsMobileOpen(false);
    };
    desktop.addEventListener('change', closeOnDesktop);
    closeOnDesktop();
    return () => {
      desktop.removeEventListener('change', closeOnDesktop);
      document.body.style.overflow = previousOverflow;
      dialog.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [isMobileOpen, setIsMobileOpen]);

  const isSuper = isSuperAdmin(currentUser);
  const isManager = isBranchManager(currentUser);
  const isStaff = isBranchStaff(currentUser);

  // Badge counts
  const branchReadyOrdersCount = !isSuper && currentBranch
    ? (orders || []).filter(
        (o) =>
          o.branchId === currentBranch.id &&
          isOrderReadyForDispatch(o, deliveries)
      ).length
    : 0;

  // Pending logs awaiting validation by branch manager
  const pendingValidationCount = useMemo(() => {
    const bId = currentUser?.branchId || currentBranch?.id || 'b-legazpi';
    return (dailyShiftLogs || []).filter(
      (l) => l.branchId === bId && l.status === DailyLogStatus.PENDING_VALIDATION
    ).length + inboundReceipts.filter(r => r.branchId === bId && r.status === 'pending').length;
  }, [dailyShiftLogs, inboundReceipts, currentUser, currentBranch]);

  // Current shift status for branch staff badge
  const today = new Date().toISOString().split('T')[0];
  const staffShiftStatus = useMemo(() => {
    const bId = currentUser?.branchId || currentBranch?.id || 'b-legazpi';
    const log = (dailyShiftLogs || []).find((l) => l.branchId === bId && l.date === today);
    return log?.status || DailyLogStatus.DRAFT;
  }, [dailyShiftLogs, currentUser, currentBranch, today]);

  if (!currentUser) return null;

  // 1. BRANCH_STAFF Navigation: Render ONLY Frontline Tabs
  const staffTabs = [
    { id: 'staff_dashboard', label: 'My Shift Dashboard', icon: LayoutDashboard },
    { id: 'physical_counts', label: 'Daily Physical Counts', icon: ClipboardCheck },
    { id: 'manual_sales', label: 'Manual Sales Entry', icon: Receipt },
    { id: 'spoilage_wastage', label: 'Spoilage / Wastage', icon: Trash2 },
    { id: 'inbound_receiving', label: 'Inbound Receiving', icon: PackageCheck },
    {
      id: 'shift_summary',
      label: 'Shift Summary',
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
    { id: 'branch_analytics', label: 'Branch Dashboard', icon: TrendingUp },
    { id: 'current_stock', label: 'Current Stock', icon: Boxes },
    {
      id: 'log_validation',
      label: 'Staff & Receiving Approvals',
      icon: ShieldCheck,
      badge: pendingValidationCount > 0 ? pendingValidationCount : undefined,
      badgeColor: 'bg-[#F37021] text-white',
    },
    {
      id: 'requisitions',
      label: 'Stock Orders & Payment',
      icon: ShoppingBag,
      badge: branchReadyOrdersCount > 0 ? branchReadyOrdersCount : undefined,
      badgeColor: 'bg-emerald-500 text-white',
    },
  ];

  // 3. SUPER_ADMIN Navigation: Render HQ Executive & Network Tabs
  const adminPrimaryTabs = [
    { id: 'network_analytics', label: 'Network Dashboard', icon: TrendingUp },
    {
      id: 'requisition_approval',
      label: 'Order & Payment Approval',
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
    { id: 'branches', label: 'Branches', icon: Building2 },
    { id: 'sales', label: 'Sales History', icon: Receipt },
    {
      id: 'logistics',
      label: 'Fleet & Dispatch',
      icon: Truck,
      badge: readyForDispatchOrdersCount > 0 ? readyForDispatchOrdersCount : undefined,
      badgeColor: 'bg-emerald-500 text-white',
    },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
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

  const userInitials = (currentUser?.name || 'U')
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const sidebarContent = (
    <div className="flex flex-col h-full min-h-0">
      {/* Brand Header */}
      <div className={`border-b border-neutral-200/80 dark:border-neutral-800 flex items-center gap-3 ${isCollapsed && !isMobileOpen ? 'flex-col px-2 py-4' : 'justify-between p-4'}`}>
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
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Desktop Collapse Toggle Button */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Current signed-in user and RBAC scope */}
      <div id="tour-user-badge" className="px-3 pt-3 pb-1">
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
      <nav aria-label="Main navigation" id="tour-sidebar-nav" className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-1 scrollbar-thin">
        {(!isCollapsed || isMobileOpen) && (
          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-3 py-1.5">
            {isStaff
              ? 'Frontline Ground Operations'
              : isManager
              ? 'Branch Operations'
              : 'Head Office'}
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
              className={`mallow-nav-item w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all group ${
                isActive
                  ? 'mallow-nav-item-active bg-[#80C7F2] text-neutral-950 font-bold shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/80'
              }`}
              title={tab.label}
              aria-label={tab.badge !== undefined ? `${tab.label}, ${tab.badge}` : tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-neutral-950' : 'text-neutral-400 dark:text-neutral-400'
                  }`}
                />
                {(!isCollapsed || isMobileOpen) && (
                  <span className="text-left leading-snug">{tab.label}</span>
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
                  className={`mallow-nav-item w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all group ${
                    isActive
                      ? 'mallow-nav-item-active bg-[#80C7F2] text-neutral-950 font-bold shadow-xs'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/80'
                  }`}
                  title={tab.label}
                  aria-label={tab.badge !== undefined ? `${tab.label}, ${tab.badge}` : tab.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-neutral-950' : 'text-neutral-400'
                      }`}
                    />
                    {(!isCollapsed || isMobileOpen) && (
                      <span className="text-left leading-snug">{tab.label}</span>
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

      </nav>

      {/* Persistent User Profile & Sign Out Footer */}
      {currentUser && (
        <div className={`p-3 border-t border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/40 shrink-0 ${
          isCollapsed && !isMobileOpen ? 'flex flex-col items-center gap-2' : ''
        }`}>
          {isCollapsed && !isMobileOpen ? (
            <>
              <button
                type="button"
                onClick={() => handleTabClick('account_settings')}
                className="w-10 h-10 rounded-xl bg-[#80C7F2] text-neutral-950 font-black text-xs flex items-center justify-center shadow-2xs hover:opacity-90 transition-opacity"
                title={`Account: ${currentUser.name}`}
                aria-label={`Account settings for ${currentUser.name}`}
              >
                {userInitials}
              </button>
              <button
                id="sidebar-collapsed-logout-btn"
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 dark:hover:border-rose-900/60 dark:hover:text-rose-400 transition-colors"
                title="Sign Out of VertexIS"
                aria-label="Sign Out of VertexIS"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white dark:bg-neutral-800/80 border border-neutral-200/70 dark:border-neutral-700/70 shadow-2xs">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#80C7F2] text-neutral-950 font-black text-xs flex items-center justify-center shrink-0">
                    {userInitials}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-neutral-900 dark:text-white truncate">
                      {currentUser.name}
                    </p>
                    <p className="text-[10px] text-neutral-400 truncate">
                      {currentRoleConfig.roleTitle}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleTabClick('account_settings')}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors shrink-0"
                  title="Account Settings"
                  aria-label="Account Settings"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                id="sidebar-signout-btn"
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out of VertexIS</span>
              </button>
            </div>
          )}
        </div>
      )}
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
        {!isMobileOpen && sidebarContent}
      </aside>

      {/* Mobile / Tablet Slide-Over Drawer with Backdrop */}
      {isMobileOpen && (
        <dialog
          ref={mobileDialogRef}
          id="mobile-navigation"
          aria-label="Main navigation"
          className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none border-0 bg-transparent p-0 backdrop:bg-black/60 backdrop:backdrop-blur-xs"
          onCancel={() => setIsMobileOpen(false)}
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsMobileOpen(false);
          }}
        >
          <div className="mallow-sidebar relative w-4/5 max-w-xs h-full border-r shadow-2xl z-10 flex flex-col animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </dialog>
      )}

      {/* Reusable Logout Confirmation Dialog */}
      <LogoutConfirmModal
        open={showLogoutConfirm}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={logout}
        userName={currentUser?.name}
        userRole={currentRoleConfig?.roleTitle}
        branchName={currentBranch?.name?.replace('Marsh Bites - ', '') || currentUser?.branchName}
      />
    </>
  );
};
