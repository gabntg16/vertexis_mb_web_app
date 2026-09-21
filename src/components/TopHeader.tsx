import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import {
  Menu,
  ShieldCheck,
  Store,
  MapPin,
  Sun,
  Moon,
  CloudCheck,
  CloudOff,
  RefreshCw,
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
  Bell,
  Sparkles,
  CheckCheck,
  ExternalLink,
  Globe,
  Users,
  Tag,
  ArrowLeftRight,
  UserRound,
  LockKeyhole,
  FileText,
  Settings,
} from 'lucide-react';
import { filterNotificationsForUser } from '../utils/notificationUtils';
import { NotificationBadgeGroup } from './common/NotificationBadgeGroup';
import { NotificationKind } from '../types';
import { isSuperAdmin, isBranchManager, isBranchStaff } from '../utils/securityValidator';

interface TopHeaderProps {
  activeTab: string;
  onToggleMobileMenu: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  onToggleMobileMenu,
  onNavigateTab,
}) => {
  const {
    currentUser,
    currentBranch,
    themeMode,
    syncState,
    announcements,
    markAnnouncementAsRead,
    markAllAnnouncementsAsRead,
    toggleTheme,
    forceSyncCloud,
  } = useData();

  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | NotificationKind>('all');

  if (!currentUser) return null;

  const isAdmin = isSuperAdmin(currentUser);
  const isDark = themeMode === 'dark';
  const isSettingsActive = ['account_settings', 'privacy_settings', 'legal_terms'].includes(activeTab);
  const currentRoleLabel = isSuperAdmin(currentUser)
    ? 'HQ Super Admin'
    : isBranchManager(currentUser)
    ? 'Branch Manager'
    : 'Branch Staff';
  const currentScope = isSuperAdmin(currentUser)
    ? 'Legazpi HQ'
    : currentBranch?.name?.replace('Marsh Bites - ', '') || 'Branch Station';

  // Filter notifications specifically targeted to this user (WHO) and branch (WHERE)
  const userNotifications = useMemo(() => {
    return filterNotificationsForUser(announcements, currentUser, currentBranch);
  }, [announcements, currentUser, currentBranch]);

  // Count unread notifications
  const unreadCount = useMemo(() => {
    return userNotifications.filter((a) => !a.readBy?.includes(currentUser.id)).length;
  }, [userNotifications, currentUser.id]);

  // Apply popover category filter
  const displayedNotifications = useMemo(() => {
    if (activeCategoryFilter === 'all') return userNotifications;
    return userNotifications.filter((a) => a.kind === activeCategoryFilter);
  }, [userNotifications, activeCategoryFilter]);

  const handleManualSync = async () => {
    try {
      setIsManualSyncing(true);
      await forceSyncCloud();
    } finally {
      setTimeout(() => setIsManualSyncing(false), 600);
    }
  };

  // Tab metadata titles and icons
  const tabTitles: Record<string, { title: string; subtitle: string; icon: any }> = {
    // 3-Tier RBAC Specific Tabs
    physical_counts: {
      title: 'Daily Physical Shelf Counts',
      subtitle: 'Frontline beginning & end-of-shift count reconciliation',
      icon: ClipboardCheck,
    },
    manual_sales: {
      title: 'Manual Sales Entry',
      subtitle: 'Log daily units sold per product/SKU at shift close',
      icon: Receipt,
    },
    spoilage_wastage: {
      title: 'Spoilage & Wastage Log',
      subtitle: 'Log damaged, dropped, expired, or spoiled items with fail reasons',
      icon: Trash2,
    },
    inbound_receiving: {
      title: 'Inbound Receiving Inspection',
      subtitle: 'Inspect physical stock from HQ, count items, and record variance',
      icon: PackageCheck,
    },
    shift_summary: {
      title: 'Shift Summary & Approval',
      subtitle: 'Consolidated review of all saved shift entries and submit for manager approval',
      icon: FileCheck,
    },
    log_validation: {
      title: 'Daily Log Validation & Audit',
      subtitle: 'Audit staff physical counts, sales, wastage and lock daily records',
      icon: ShieldCheck,
    },
    requisitions: {
      title: 'Stock Requisition & Payment',
      subtitle: 'Generate commissary requisitions and upload BIR payment slips',
      icon: ShoppingBag,
    },
    branch_analytics: {
      title: 'Branch Dashboard & Analytics',
      subtitle: 'Track shrinkage, variance rates, and top moving flavors',
      icon: TrendingUp,
    },
    transfers: {
      title: 'Inter-Branch Stock Transfers',
      subtitle: 'Transfer items between branches with destination approval',
      icon: ArrowLeftRight,
    },
    requisition_approval: {
      title: 'Requisition & Payment Approval',
      subtitle: 'Verify proof of payment and dispatch branch commissary orders',
      icon: ShoppingBag,
    },
    network_analytics: {
      title: 'Network Dashboard & Analytics',
      subtitle: '19-Branch predictive demand forecasts & replenishment KPIs',
      icon: TrendingUp,
    },
    master_pricing: {
      title: 'Master Inventory & Pricing',
      subtitle: 'Manage global SKU catalog, commissary wholesale rates, and SRP',
      icon: Tag,
    },
    dashboard: {
      title: isAdmin ? 'Central Executive Overview' : 'Branch Overview',
      subtitle: isAdmin
        ? 'Central Commissary KPI Dashboard • Legazpi City, Albay'
        : `${currentBranch?.name || 'Branch'} • Inter-Branch B2B Operations (Legazpi Central Commissary ↔ Branch Network)`,
      icon: LayoutDashboard,
    },
    orders: {
      title: isAdmin ? 'Orders & Commissary Approvals' : 'Stock Requisitions & Reorders',
      subtitle: isAdmin
        ? 'Review & dispatch branch batch orders'
        : 'Inter-branch ordering from Legazpi Central Commissary with auto-fill (α=0.3)',
      icon: ShoppingBag,
    },
    reorder: {
      title: 'Stock Requisitions & Reorders',
      subtitle: 'Inter-branch ordering from Legazpi Central Commissary with auto-fill (α=0.3)',
      icon: ShoppingBag,
    },
    production: {
      title: 'Commissary Batching & Production',
      subtitle: 'Track live kettle whips, curing slabs & dispatch readiness',
      icon: ChefHat,
    },
    branches: {
      title: '19 Nationwide Branches',
      subtitle: 'Centralized franchise performance & stock tracking',
      icon: Building2,
    },
    logistics: {
      title: isAdmin ? 'Fleet & Dispatch Logistics' : 'Inbound Deliveries & Receiving',
      subtitle: isAdmin
        ? 'LBC & cold-chain distribution tracking'
        : 'Confirm received stock dispatched from central commissary',
      icon: isAdmin ? Truck : PackageCheck,
    },
    deliveries: {
      title: 'Inbound Deliveries & Receiving',
      subtitle: 'Confirm received stock dispatched from central commissary',
      icon: PackageCheck,
    },
    sales: {
      title: 'B2B Sales & Branch Movement Analytics',
      subtitle: 'Historical branch consumption & dispatch tracking',
      icon: TrendingUp,
    },
    inventory: {
      title: 'Inventory & Physical Audits',
      subtitle: 'System book stock vs. actual physical shelf count reconciliation & demand analytics',
      icon: Boxes,
    },
    wastage: {
      title: 'Spoilage & Wastage Log',
      subtitle: 'Track expired, damaged & heat-melted inventory (isolated from demand forecast)',
      icon: Trash2,
    },
    physical_audit: {
      title: 'Physical Shelf Count Audit',
      subtitle: 'Audit shelf counts and reconcile inventory shrinkages with permanent ledgers',
      icon: ClipboardCheck,
    },
    history: {
      title: 'Requisition Slips & Transaction Audit',
      subtitle: 'View historical order slips, status changes, and dispatch logs',
      icon: Receipt,
    },
    calendar: {
      title: 'Operational Schedule & Shifts',
      subtitle: 'Staff schedules, cleaning logs & batch releases',
      icon: Calendar,
    },
    announcements: {
      title: isAdmin ? 'Headquarters Bulletins' : 'Commissary Bulletins',
      subtitle: 'Broadcast alerts and recipe updates across all 19 branches',
      icon: Megaphone,
    },
    staff_dashboard: {
      title: 'Frontline Operations Dashboard',
      subtitle: "Today's shift, receiving, counts, and sales workbench",
      icon: LayoutDashboard,
    },
    account_settings: {
      title: 'Account Settings',
      subtitle: 'Review your profile, role, and assigned operating scope',
      icon: UserRound,
    },
    privacy_settings: {
      title: 'Privacy Settings',
      subtitle: 'Control local notification and workspace preferences',
      icon: LockKeyhole,
    },
    legal_terms: {
      title: 'Terms & Legal',
      subtitle: 'VertexIS operating terms and privacy responsibilities',
      icon: FileText,
    },
  };

  const currentTabMeta = tabTitles[activeTab] || {
    title: 'VertexIS System',
    subtitle: 'Marsh Bites Enterprise',
    icon: LayoutDashboard,
  };

  const TabIcon = currentTabMeta.icon;

  return (
    <header className="mallow-header sticky top-0 z-20 border-b backdrop-blur-md transition-colors">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Left: Mobile Menu Trigger & Active Context Header */}
          <div className="flex items-center space-x-3 min-w-0">
            <button
              id="top-mobile-menu-btn"
              type="button"
              onClick={onToggleMobileMenu}
              className="lg:hidden p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors shrink-0"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Title & Context */}
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="hidden sm:flex w-9 h-9 rounded-xl bg-[#80C7F2]/15 text-[#0369a1] dark:text-[#80C7F2] items-center justify-center shrink-0 border border-[#80C7F2]/30">
                <TabIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h1 className="font-extrabold text-sm sm:text-base text-neutral-900 dark:text-white truncate leading-tight">
                  {currentTabMeta.title}
                </h1>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate hidden sm:block">
                  {currentTabMeta.subtitle}
                </p>
              </div>
            </div>
          </div>

          {/* Right Action Bar */}
          <div className="mallow-header-actions flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            {/* Cloud Firestore Status Badge */}
            <button
              id="top-firestore-sync-btn"
              onClick={handleManualSync}
              className={`mallow-header-control flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                syncState.status === 'connected'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                  : syncState.status === 'syncing' || isManualSyncing
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                  : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500'
              }`}
              title="Firestore Cloud Sync Status. Click to force sync."
            >
              {syncState.status === 'connected' && !isManualSyncing ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <CloudCheck className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Synced</span>
                </>
              ) : syncState.status === 'syncing' || isManualSyncing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden md:inline">Syncing...</span>
                </>
              ) : (
                <>
                  <CloudOff className="w-3.5 h-3.5 text-neutral-400" />
                  <span className="hidden md:inline">Offline</span>
                </>
              )}
            </button>

            {/* Current signed-in user */}
            <div className="relative">
              <div
                id="top-current-user"
                className={`mallow-header-control flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-xs ${
                  isSuperAdmin(currentUser)
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20'
                    : isBranchManager(currentUser)
                    ? 'bg-[#80C7F2]/10 border-[#80C7F2]/30 text-[#1a7bb5] dark:text-[#80C7F2] hover:bg-[#80C7F2]/20'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
                }`}
                title={`${currentUser.name} - ${currentRoleLabel} - ${currentScope}`}
              >
                {isSuperAdmin(currentUser) ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                ) : isBranchManager(currentUser) ? (
                  <Store className="w-3.5 h-3.5 text-[#80C7F2] shrink-0" />
                ) : (
                  <ClipboardCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                )}
                <span className="hidden sm:flex flex-col min-w-0 text-left leading-tight">
                  <span className="truncate max-w-[150px]">{currentUser.name}</span>
                  <span className="text-[9px] opacity-70 truncate max-w-[150px]">{currentRoleLabel} - {currentScope}</span>
                </span>
              </div>

            </div>

            {/* Notifications Popover */}
            <div className="relative">
              <button
                id="top-notifications-btn"
                onClick={() => setShowNotificationMenu(!showNotificationMenu)}
                className={`mallow-header-control relative p-2 rounded-xl border transition-colors ${
                  showNotificationMenu
                    ? 'bg-[#80C7F2]/20 border-[#80C7F2]/40 text-[#1a7bb5] dark:text-[#80C7F2]'
                    : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
                title="System Notifications & Workflow Alerts"
              >
                <Bell className="w-3.5 h-3.5" />
                {unreadCount > 0 ? (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#F37021] text-[9px] font-black text-white shadow-xs animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                ) : userNotifications.length > 0 ? (
                  <span className="absolute -top-1 -right-1 flex h-3.5 min-w-[14px] px-1 items-center justify-center rounded-full bg-neutral-400 text-[8px] font-bold text-white">
                    {userNotifications.length > 9 ? '9+' : userNotifications.length}
                  </span>
                ) : null}
              </button>

              {showNotificationMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotificationMenu(false)} />
                  <div className="absolute right-0 mt-2 w-80 sm:w-[420px] max-h-[500px] flex flex-col rounded-2xl shadow-2xl border z-50 bg-white dark:bg-[#1c1c1c] border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white overflow-hidden">
                    {/* Popover Header */}
                    <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="p-1 rounded-lg bg-[#F37021]/15 text-[#F37021]">
                            <Bell className="w-3.5 h-3.5" />
                          </span>
                          <div>
                            <h3 className="font-bold text-xs leading-none">Notifications & Alerts</h3>
                            <p className="text-[10px] text-neutral-400 mt-0.5">
                              {isAdmin
                                ? 'Targeted HQ & 19-Branch Overseer Scope'
                                : `Targeted to: ${currentBranch?.name || 'Branch'}`}
                            </p>
                          </div>
                        </div>

                        {unreadCount > 0 && (
                          <button
                            onClick={() => markAllAnnouncementsAsRead()}
                            className="text-[10.5px] font-bold text-[#1a7bb5] dark:text-[#80C7F2] hover:underline flex items-center space-x-1 cursor-pointer"
                            title="Mark all notifications as read"
                          >
                            <CheckCheck className="w-3 h-3" />
                            <span>Mark all read</span>
                          </button>
                        )}
                      </div>

                      {/* Quick Category Filter Pills */}
                      <div className="flex items-center space-x-1.5 mt-2.5 overflow-x-auto pb-1 text-[10.5px] scrollbar-none">
                        <button
                          onClick={() => setActiveCategoryFilter('all')}
                          className={`px-2 py-0.5 rounded-lg font-bold shrink-0 transition-colors ${
                            activeCategoryFilter === 'all'
                              ? 'bg-[#80C7F2] text-neutral-900 shadow-xs'
                              : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-300 dark:hover:bg-neutral-700'
                          }`}
                        >
                          All ({userNotifications.length})
                        </button>
                        <button
                          onClick={() => setActiveCategoryFilter('order')}
                          className={`px-2 py-0.5 rounded-lg font-medium shrink-0 transition-colors ${
                            activeCategoryFilter === 'order'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-300 dark:hover:bg-neutral-700'
                          }`}
                        >
                          📦 Orders
                        </button>
                        <button
                          onClick={() => setActiveCategoryFilter('logistics')}
                          className={`px-2 py-0.5 rounded-lg font-medium shrink-0 transition-colors ${
                            activeCategoryFilter === 'logistics'
                              ? 'bg-sky-600 text-white shadow-xs'
                              : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-300 dark:hover:bg-neutral-700'
                          }`}
                        >
                          🚚 Logistics
                        </button>
                        <button
                          onClick={() => setActiveCategoryFilter('production')}
                          className={`px-2 py-0.5 rounded-lg font-medium shrink-0 transition-colors ${
                            activeCategoryFilter === 'production'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-300 dark:hover:bg-neutral-700'
                          }`}
                        >
                          🏭 Kitchen
                        </button>
                        <button
                          onClick={() => setActiveCategoryFilter('inventory')}
                          className={`px-2 py-0.5 rounded-lg font-medium shrink-0 transition-colors ${
                            activeCategoryFilter === 'inventory'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-300 dark:hover:bg-neutral-700'
                          }`}
                        >
                          ⚠️ Stock
                        </button>
                        <button
                          onClick={() => setActiveCategoryFilter('general')}
                          className={`px-2 py-0.5 rounded-lg font-medium shrink-0 transition-colors ${
                            activeCategoryFilter === 'general'
                              ? 'bg-neutral-700 text-white shadow-xs'
                              : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-300 dark:hover:bg-neutral-700'
                          }`}
                        >
                          📢 Directives
                        </button>
                      </div>
                    </div>

                    {/* Notification Items List */}
                    <div className="space-y-2 p-3 max-h-80 overflow-y-auto">
                      {displayedNotifications.length === 0 ? (
                        <div className="py-8 text-center text-neutral-400">
                          <Bell className="w-6 h-6 mx-auto mb-1.5 opacity-30" />
                          <p className="text-xs font-semibold">No notifications in this category</p>
                          <p className="text-[10px] text-neutral-500 mt-0.5">
                            All targeted alerts will appear here in real-time.
                          </p>
                        </div>
                      ) : (
                        displayedNotifications.map((ann) => {
                          const isRead = ann.readBy?.includes(currentUser.id);

                          return (
                            <div
                              key={ann.id}
                              onClick={() => markAnnouncementAsRead(ann.id)}
                              className={`p-2.5 rounded-xl border transition-all cursor-pointer relative ${
                                !isRead
                                  ? isDark
                                    ? 'bg-neutral-900 border-[#80C7F2]/40 shadow-xs ring-1 ring-[#80C7F2]/20'
                                    : 'bg-sky-50/40 border-[#80C7F2]/40 shadow-xs ring-1 ring-[#80C7F2]/20'
                                  : isDark
                                  ? 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
                                  : 'bg-neutral-50 border-neutral-200/80 hover:border-neutral-300'
                              }`}
                            >
                              {/* Unread indicator dot */}
                              {!isRead && (
                                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#F37021]" />
                              )}

                              {/* WHAT KIND, WHERE, and WHO Badges */}
                              <div className="mb-1.5 pr-4">
                                <NotificationBadgeGroup announcement={ann} compact={true} />
                              </div>

                              {/* Title & Message */}
                              <p className="font-bold text-xs leading-snug text-neutral-900 dark:text-neutral-100">
                                {ann.title}
                              </p>
                              <p className="text-[11px] text-neutral-600 dark:text-neutral-300 mt-1 leading-relaxed line-clamp-2">
                                {ann.message}
                              </p>

                              {/* Footer Details: Author & Timestamp */}
                              <div className="flex items-center justify-between text-[9.5px] text-neutral-400 mt-2 pt-1.5 border-t border-neutral-200/60 dark:border-neutral-800">
                                <span>
                                  {ann.authorName ? `By: ${ann.authorName}` : 'Central System'}
                                </span>
                                <div className="flex items-center space-x-2">
                                  <span>
                                    {new Date(ann.createdAt).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}{' '}
                                    •{' '}
                                    {new Date(ann.createdAt).toLocaleDateString([], {
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </span>

                                  {ann.actionUrl && onNavigateTab && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markAnnouncementAsRead(ann.id);
                                        setShowNotificationMenu(false);
                                        onNavigateTab(ann.actionUrl!);
                                      }}
                                      className="font-bold text-[#1a7bb5] dark:text-[#80C7F2] hover:underline flex items-center space-x-0.5"
                                    >
                                      <span>Open</span>
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Popover Footer Link */}
                    <div className="p-2.5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/50 flex items-center justify-between text-xs">
                      <span className="text-[10px] text-neutral-400">
                        {userNotifications.length} total alerts for you
                      </span>
                      {onNavigateTab && (
                        <button
                          onClick={() => {
                            setShowNotificationMenu(false);
                            onNavigateTab('announcements');
                          }}
                          className="text-[10.5px] font-bold text-[#F37021] hover:underline"
                        >
                          View All Bulletins →
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              id="top-theme-toggle-btn"
              onClick={toggleTheme}
              className="mallow-header-control p-2 rounded-xl border transition-colors bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-amber-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            {/* Settings */}
            <button
              id="top-settings-btn"
              type="button"
              onClick={() => onNavigateTab?.('account_settings')}
              className={`mallow-header-control p-2 rounded-xl border transition-colors ${
                isSettingsActive
                  ? 'bg-[#80C7F2]/20 border-[#80C7F2]/40 text-[#1a7bb5] dark:text-[#80C7F2]'
                  : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
              title="Account and workspace settings"
              aria-label="Open account and workspace settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>

          </div>
        </div>
      </div>
    </header>
  );
};
