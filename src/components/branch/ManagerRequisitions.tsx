import React from 'react';
import { BranchOrders } from './BranchOrders';
import { useData } from '../../context/DataContext';
import { ShoppingBag, ShieldAlert, UserCheck } from 'lucide-react';

export const ManagerRequisitions: React.FC = () => {
  const { currentUser, currentBranch } = useData();

  return (
    <div id="manager-requisitions-view" className="space-y-6">
      {/* Role Notice Banner */}
      <div className="p-4 rounded-2xl bg-[#80C7F2]/10 border border-[#80C7F2]/30 text-neutral-800 dark:text-neutral-200">
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded-xl bg-[#80C7F2]/20 text-[#0369a1] dark:text-[#80C7F2] shrink-0 mt-0.5">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div className="text-xs sm:text-sm">
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-neutral-900 dark:text-white">
                Create Requisition & Upload Payment (Store Lead Scope)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#80C7F2]/20 text-[#0369a1] dark:text-[#80C7F2]">
                BRANCH_MANAGER
              </span>
            </div>
            <p className="mt-1 text-neutral-600 dark:text-neutral-300">
              Draft commissary stock reorders (Silver, Gold, Platinum package bundles or custom items) and upload digital Proof of Payments (GCash slips, Maya receipts, Bank Transfer slips).
            </p>
            <div className="mt-2 text-[11px] font-semibold text-amber-700 dark:text-amber-400 flex items-center space-x-1.5">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>
                RBAC Security Constraint: Branch Managers are strictly restricted from self-approving requisitions or self-verifying payments. Final authorization is performed exclusively by HQ Super Admin.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Render Requisition Management Engine */}
      <BranchOrders />
    </div>
  );
};
