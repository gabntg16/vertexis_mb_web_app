import React, { Suspense, lazy, useState, useEffect } from 'react';
import { DataProvider, useData } from './context/DataContext';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { LoginScreen } from './components/LoginScreen';
import { MfaEnrollmentGate } from './components/MfaEnrollmentGate';
import { isSuperAdmin, isBranchManager, isBranchStaff } from './utils/securityValidator';

type ComponentModule = Record<string, React.ComponentType<any>>;
const lazyNamed = (loader: () => Promise<unknown>, exportName: string) =>
  lazy(async () => {
    let attempts = 3;
    let delay = 300;
    while (attempts > 0) {
      try {
        const mod = (await loader()) as ComponentModule;
        const component = mod[exportName] || (mod as any)?.default;
        if (component) {
          return { default: component };
        }
        throw new Error(`Export '${exportName}' not found in loaded module.`);
      } catch (err: any) {
        attempts--;
        const isModuleFetchError =
          err?.message?.includes('Failed to fetch dynamically imported module') ||
          err?.message?.includes('Importing a module script failed');

        if (attempts > 0) {
          console.warn(`[LazyLoader] Error loading ${exportName}. Retrying in ${delay}ms...`, err);
          await new Promise((res) => setTimeout(res, delay));
          delay *= 2;
        } else {
          // If this is a chunk or dynamically imported module fetch error after all retries,
          // refresh the window once to clear stale Vite cache
          if (isModuleFetchError && typeof window !== 'undefined') {
            const reloadKey = `chunk_reload_${exportName}`;
            const lastReload = sessionStorage.getItem(reloadKey);
            if (!lastReload || Date.now() - Number(lastReload) > 20000) {
              sessionStorage.setItem(reloadKey, String(Date.now()));
              console.warn(`[LazyLoader] Reloading window once to recover fresh module for ${exportName}`);
              window.location.reload();
              return new Promise(() => {}); // Wait for reload
            }
          }
          throw err;
        }
      }
    }
    throw new Error(`Failed to load component ${exportName}`);
  });

// Load role-specific screens on demand so a cashier does not download every HQ workflow.
const AdminDashboard = lazyNamed(() => import('./components/admin/AdminDashboard'), 'AdminDashboard');
const AdminOrders = lazyNamed(() => import('./components/admin/AdminOrders'), 'AdminOrders');
const AdminProduction = lazyNamed(() => import('./components/admin/AdminProduction'), 'AdminProduction');
const AdminBranches = lazyNamed(() => import('./components/admin/AdminBranches'), 'AdminBranches');
const AdminLogistics = lazyNamed(() => import('./components/admin/AdminLogistics'), 'AdminLogistics');
const AdminSalesHistory = lazyNamed(() => import('./components/admin/AdminSalesHistory'), 'AdminSalesHistory');
const AdminAnnouncements = lazyNamed(() => import('./components/admin/AdminAnnouncements'), 'AdminAnnouncements');
const AdminProductPricing = lazyNamed(() => import('./components/admin/AdminProductPricing'), 'AdminProductPricing');
const ManagerLogValidation = lazyNamed(() => import('./components/branch/ManagerLogValidation'), 'ManagerLogValidation');
const ManagerRequisitions = lazyNamed(() => import('./components/branch/ManagerRequisitions'), 'ManagerRequisitions');
const ManagerBranchAnalytics = lazyNamed(() => import('./components/branch/ManagerBranchAnalytics'), 'ManagerBranchAnalytics');
const BranchCurrentStock = lazyNamed(() => import('./components/branch/BranchCurrentStock'), 'BranchCurrentStock');
const StaffDashboard = lazyNamed(() => import('./components/branch/StaffDashboard'), 'StaffDashboard');
const StaffPhysicalCounts = lazyNamed(() => import('./components/branch/StaffPhysicalCounts'), 'StaffPhysicalCounts');
const StaffManualSales = lazyNamed(() => import('./components/branch/StaffManualSales'), 'StaffManualSales');
const StaffWastageLog = lazyNamed(() => import('./components/branch/StaffWastageLog'), 'StaffWastageLog');
const StaffInboundReceiving = lazyNamed(() => import('./components/branch/StaffInboundReceiving'), 'StaffInboundReceiving');
const StaffShiftSummary = lazyNamed(() => import('./components/branch/StaffShiftSummary'), 'StaffShiftSummary');
const SettingsPage = lazyNamed(() => import('./components/settings/SettingsPage'), 'SettingsPage');

const MainShell: React.FC = () => {
  const { currentUser, themeMode } = useData();
  const [activeTab, setActiveTab] = useState<string>('physical_counts');
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  // Set default initial tab based on the user's role on role switch or initial render
  useEffect(() => {
    if (!currentUser) return;

    if (isBranchStaff(currentUser)) {
      setActiveTab((prev) =>
        ['staff_dashboard', 'physical_counts', 'manual_sales', 'spoilage_wastage', 'wastage', 'inbound_receiving', 'receiving', 'shift_summary', 'account_settings', 'privacy_settings', 'legal_terms'].includes(prev)
          ? prev
          : 'staff_dashboard'
      );
    } else if (isBranchManager(currentUser)) {
      setActiveTab((prev) =>
        ['branch_analytics', 'log_validation', 'current_stock', 'requisitions', 'orders', 'reorder', 'analytics', 'sales', 'account_settings', 'privacy_settings', 'legal_terms'].includes(prev)
          ? prev
          : 'branch_analytics'
      );
    } else if (isSuperAdmin(currentUser)) {
      setActiveTab((prev) =>
        [
          'network_analytics',
          'requisition_approval',
          'orders',
          'dashboard',
          'analytics',
          'forecasting',
          'master_pricing',
          'pricing',
          'products',
          'production',
          'branches',
          'logistics',
          'sales',
          'announcements',
          'account_settings',
          'privacy_settings',
          'legal_terms',
        ].includes(prev)
          ? prev
          : 'network_analytics'
      );
    }
    setIsMobileOpen(false);
  }, [currentUser?.role, currentUser?.id, currentUser?.branchId]);

  if (!currentUser) {
    return <LoginScreen />;
  }

  const isStaff = isBranchStaff(currentUser);
  const isManager = isBranchManager(currentUser);
  const isSuper = isSuperAdmin(currentUser);

  return (
    <>
      <MfaEnrollmentGate />
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:text-neutral-900 focus:shadow-lg">
        Skip to main content
      </a>
      <div
        className={`mallow-shell min-h-screen flex transition-colors duration-200 ${
          themeMode === 'dark' ? 'bg-[#101010] text-[#f2f2f2]' : 'text-neutral-900'
        }`}
      >
        {/* Responsive Sidebar (Persistent Desktop & Off-Canvas Mobile Drawer) */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          {/* Sticky Top Header with Breadcrumbs & Responsive Controls */}
          <TopHeader
            activeTab={activeTab}
            isMobileOpen={isMobileOpen}
            onToggleMobileMenu={() => setIsMobileOpen(!isMobileOpen)}
            onNavigateTab={setActiveTab}
          />

        {/* View Content Enforcing 3-Tier RBAC Route Protection */}
        <main id="main-content" tabIndex={-1} className="mallow-main flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7 animate-in fade-in duration-300">
          <Suspense fallback={<div role="status" className="mallow-panel rounded-2xl p-8 text-sm text-neutral-500">Loading workspace…</div>}>
          {/* TIER 1: BRANCH_STAFF (Frontline Ground Operations) */}
          {isStaff && (
            <>
              {activeTab === 'staff_dashboard' && (
                <StaffDashboard onNavigateTab={setActiveTab} />
              )}
              {activeTab === 'physical_counts' && <StaffPhysicalCounts onNavigateTab={setActiveTab} />}
              {activeTab === 'manual_sales' && <StaffManualSales onNavigateTab={setActiveTab} />}
              {(activeTab === 'spoilage_wastage' || activeTab === 'wastage') && (
                <StaffWastageLog onNavigateTab={setActiveTab} />
              )}
              {(activeTab === 'inbound_receiving' || activeTab === 'receiving') && (
                <StaffInboundReceiving onNavigateTab={setActiveTab} />
              )}
              {activeTab === 'shift_summary' && <StaffShiftSummary onNavigateTab={setActiveTab} />}
              {['account_settings', 'privacy_settings', 'legal_terms'].includes(activeTab) && (
                <SettingsPage section={activeTab as 'account_settings' | 'privacy_settings' | 'legal_terms'} onNavigateTab={setActiveTab} />
              )}
              {/* Fallback route guard: If staff attempts to navigate to any other tab */}
              {![
                'staff_dashboard',
                'physical_counts',
                'manual_sales',
                'spoilage_wastage',
                'wastage',
                'inbound_receiving',
                'receiving',
                'shift_summary',
                'account_settings',
                'privacy_settings',
                'legal_terms',
              ].includes(activeTab) && <StaffPhysicalCounts onNavigateTab={setActiveTab} />}
            </>
          )}

          {/* TIER 2: BRANCH_MANAGER (Store Leadership & Validation) */}
          {isManager && (
            <>
              {activeTab === 'log_validation' && <ManagerLogValidation />}
              {activeTab === 'current_stock' && <BranchCurrentStock />}
              {(activeTab === 'requisitions' || activeTab === 'orders' || activeTab === 'reorder') && (
                <ManagerRequisitions />
              )}
              {(activeTab === 'branch_analytics' || activeTab === 'analytics' || activeTab === 'sales') && (
                <ManagerBranchAnalytics onNavigateToReorder={() => setActiveTab('requisitions')} />
              )}
              {['account_settings', 'privacy_settings', 'legal_terms'].includes(activeTab) && (
                <SettingsPage section={activeTab as 'account_settings' | 'privacy_settings' | 'legal_terms'} onNavigateTab={setActiveTab} />
              )}
              {/* Fallback route guard: If manager attempts to navigate to any other tab */}
              {![
                'branch_analytics',
                'log_validation',
                'current_stock',
                'requisitions',
                'orders',
                'reorder',
                'analytics',
                'sales',
                'account_settings',
                'privacy_settings',
                'legal_terms',
              ].includes(activeTab) && <ManagerLogValidation />}
            </>
          )}

          {/* TIER 3: SUPER_ADMIN (HQ Executive & Commissary Oversight) */}
          {isSuper && (
            <>
              {(activeTab === 'requisition_approval' || activeTab === 'orders') && <AdminOrders />}
              {(activeTab === 'network_analytics' || activeTab === 'analytics' || activeTab === 'dashboard' || activeTab === 'forecasting') && (
                <AdminDashboard onNavigateTab={setActiveTab} />
              )}
              {(activeTab === 'master_pricing' || activeTab === 'pricing' || activeTab === 'products') && (
                <AdminProductPricing />
              )}
              {activeTab === 'production' && <AdminProduction />}
              {activeTab === 'branches' && <AdminBranches />}
              {activeTab === 'logistics' && <AdminLogistics />}
              {activeTab === 'sales' && <AdminSalesHistory />}
              {activeTab === 'announcements' && <AdminAnnouncements />}
              {['account_settings', 'privacy_settings', 'legal_terms'].includes(activeTab) && (
                <SettingsPage section={activeTab as 'account_settings' | 'privacy_settings' | 'legal_terms'} onNavigateTab={setActiveTab} />
              )}
              {/* Fallback route guard */}
              {![
                'requisition_approval',
                'orders',
                'network_analytics',
                'analytics',
                'dashboard',
                'forecasting',
                'master_pricing',
                'pricing',
                'products',
                'production',
                'branches',
                'logistics',
                'sales',
                'announcements',
                'account_settings',
                'privacy_settings',
                'legal_terms',
              ].includes(activeTab) && <AdminOrders />}
            </>
          )}
          </Suspense>
        </main>

        {/* Modern Compact Footer */}
        <footer className="mallow-footer border-t border-neutral-200/60 dark:border-neutral-800/80 py-5 mt-auto text-center text-xs text-neutral-400">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>
              <strong>VertexIS</strong> • Marsh Bites Gourmet Marshmallow Enterprise System
            </p>
            <p className="text-[11px]">
              Commissary: Legazpi City, Albay • Nationwide Branch Network
            </p>
          </div>
        </footer>
      </div>
    </div>
  </>
);
};

export function App() {
  return (
    <DataProvider>
      <MainShell />
    </DataProvider>
  );
}

export default App;
