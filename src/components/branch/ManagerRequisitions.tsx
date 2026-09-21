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
                Create Requisition & Upload Payment 
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#80C7F2]/20 text-[#0369a1] dark:text-[#80C7F2]">
                BRANCH_MANAGER
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
