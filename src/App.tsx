import React, { useState, useEffect } from 'react';
import { DataProvider, useData } from './context/DataContext';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { LoginScreen } from './components/LoginScreen';
import { isSuperAdmin, isBranchManager, isBranchStaff } from './utils/securityValidator';

// Super Admin HQ Views
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminOrders } from './components/admin/AdminOrders';
import { AdminProduction } from './components/admin/AdminProduction';
import { AdminBranches } from './components/admin/AdminBranches';
import { AdminLogistics } from './components/admin/AdminLogistics';
import { AdminSalesHistory } from './components/admin/AdminSalesHistory';
import { AdminCalendar } from './components/admin/AdminCalendar';
import { AdminAnnouncements } from './components/admin/AdminAnnouncements';
import { AdminProductPricing } from './components/admin/AdminProductPricing';

// Branch Manager (Store Leadership & Audit) Views
import { ManagerLogValidation } from './components/branch/ManagerLogValidation';
import { ManagerRequisitions } from './components/branch/ManagerRequisitions';
import { ManagerBranchAnalytics } from './components/branch/ManagerBranchAnalytics';

// Branch Staff (Frontline Ground Operations) Views
import { StaffPhysicalCounts } from './components/branch/StaffPhysicalCounts';
import { StaffManualSales } from './components/branch/StaffManualSales';
import { StaffWastageLog } from './components/branch/StaffWastageLog';
import { StaffInboundReceiving } from './components/branch/StaffInboundReceiving';
import { StaffShiftSummary } from './components/branch/StaffShiftSummary';

const MainShell: React.FC = () => {
  const { currentUser, themeMode } = useData();
  const [activeTab, setActiveTab] = useState<string>('physical_counts');
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  // Set default initial tab based on the user's role on role switch or initial render
  useEffect(() => {
    if (!currentUser) return;

    if (isBranchStaff(currentUser)) {
      setActiveTab((prev) =>
        ['physical_counts', 'manual_sales', 'spoilage_wastage', 'wastage', 'inbound_receiving', 'receiving'].includes(prev)
          ? prev
          : 'physical_counts'
      );
    } else if (isBranchManager(currentUser)) {
      setActiveTab((prev) =>
        ['log_validation', 'requisitions', 'orders', 'reorder', 'branch_analytics', 'analytics', 'sales'].includes(prev)
          ? prev
          : 'log_validation'
      );
    } else if (isSuperAdmin(currentUser)) {
      setActiveTab((prev) =>
        [
          'requisition_approval',
          'orders',
          'network_analytics',
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
          'calendar',
          'announcements',
        ].includes(prev)
          ? prev
          : 'requisition_approval'
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
          onToggleMobileMenu={() => setIsMobileOpen(!isMobileOpen)}
          onNavigateTab={setActiveTab}
        />

        {/* View Content Enforcing 3-Tier RBAC Route Protection */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7 animate-in fade-in duration-300">
          {/* TIER 1: BRANCH_STAFF (Frontline Ground Operations) */}
          {isStaff && (
            <>
              {activeTab === 'physical_counts' && <StaffPhysicalCounts onNavigateTab={setActiveTab} />}
              {activeTab === 'manual_sales' && <StaffManualSales onNavigateTab={setActiveTab} />}
              {(activeTab === 'spoilage_wastage' || activeTab === 'wastage') && (
                <StaffWastageLog onNavigateTab={setActiveTab} />
              )}
              {(activeTab === 'inbound_receiving' || activeTab === 'receiving') && (
                <StaffInboundReceiving onNavigateTab={setActiveTab} />
              )}
              {activeTab === 'shift_summary' && <StaffShiftSummary onNavigateTab={setActiveTab} />}
              {/* Fallback route guard: If staff attempts to navigate to any other tab */}
              {![
                'physical_counts',
                'manual_sales',
                'spoilage_wastage',
                'wastage',
                'inbound_receiving',
                'receiving',
                'shift_summary',
              ].includes(activeTab) && <StaffPhysicalCounts onNavigateTab={setActiveTab} />}
            </>
          )}

          {/* TIER 2: BRANCH_MANAGER (Store Leadership & Validation) */}
          {isManager && (
            <>
              {activeTab === 'log_validation' && <ManagerLogValidation />}
              {(activeTab === 'requisitions' || activeTab === 'orders' || activeTab === 'reorder') && (
                <ManagerRequisitions />
              )}
              {(activeTab === 'branch_analytics' || activeTab === 'analytics' || activeTab === 'sales') && (
                <ManagerBranchAnalytics onNavigateToReorder={() => setActiveTab('requisitions')} />
              )}
              {/* Fallback route guard: If manager attempts to navigate to any other tab */}
              {![
                'log_validation',
                'requisitions',
                'orders',
                'reorder',
                'branch_analytics',
                'analytics',
                'sales',
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
              {activeTab === 'calendar' && <AdminCalendar />}
              {activeTab === 'announcements' && <AdminAnnouncements />}
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
                'calendar',
                'announcements',
              ].includes(activeTab) && <AdminOrders />}
            </>
          )}
        </main>

        {/* Modern Compact Footer */}
        <footer className="border-t border-neutral-200/60 dark:border-neutral-800/80 py-5 mt-auto text-center text-xs text-neutral-400">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>
              <strong>VertexIS</strong> • Marsh Bites Gourmet Marshmallow Enterprise System
            </p>
            <p className="text-[11px]">
              Commissary: Naga City, Bicol • 19 Nationwide Franchise Branches • 3-Tier RBAC
            </p>
          </div>
        </footer>
      </div>

    </div>
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
