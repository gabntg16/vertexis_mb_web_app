import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { POSAuditLog } from '../../types';
import {
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  Ban,
  RotateCcw,
  Lock,
  LogIn,
  Key,
  Calendar,
  X,
  FileSpreadsheet,
} from 'lucide-react';

interface POSAuditDrawerProps {
  onClose: () => void;
}

export const POSAuditDrawer: React.FC<POSAuditDrawerProps> = ({ onClose }) => {
  const { currentBranch, getPOSAuditLogsForBranch } = useData();
  const logs = getPOSAuditLogsForBranch(currentBranch?.id || '');

  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const matchesAction = selectedAction === 'ALL' || l.action === selectedAction;
      const matchesSearch =
        l.details.toLowerCase().includes(search.toLowerCase()) ||
        l.user.toLowerCase().includes(search.toLowerCase()) ||
        (l.referenceId && l.referenceId.toLowerCase().includes(search.toLowerCase()));
      return matchesAction && matchesSearch;
    });
  }, [logs, search, selectedAction]);

  const getActionBadge = (action: POSAuditLog['action']) => {
    switch (action) {
      case 'SALE_PUNCH':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>SALE PUNCH</span>
          </span>
        );
      case 'VOID_TRANSACTION':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 flex items-center space-x-1">
            <Ban className="w-3 h-3" />
            <span>VOID</span>
          </span>
        );
      case 'REFUND_TRANSACTION':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 flex items-center space-x-1">
            <RotateCcw className="w-3 h-3" />
            <span>REFUND</span>
          </span>
        );
      case 'Z_READING_CLOSE':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 flex items-center space-x-1">
            <Lock className="w-3 h-3" />
            <span>Z-READING</span>
          </span>
        );
      case 'LOGIN':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 flex items-center space-x-1">
            <LogIn className="w-3 h-3" />
            <span>LOGIN / OPEN</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300">
            {action}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                POS Security & Audit Trail
              </h3>
              <p className="text-xs text-neutral-500">
                Immutable chronological log of sales, voids, refunds, and supervisor overrides
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference # or cashier..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-1 focus:ring-[#F37021] focus:outline-hidden"
            />
          </div>

          <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto">
            {['ALL', 'SALE_PUNCH', 'VOID_TRANSACTION', 'REFUND_TRANSACTION', 'Z_READING_CLOSE', 'LOGIN'].map(
              (act) => (
                <button
                  key={act}
                  onClick={() => setSelectedAction(act)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    selectedAction === act
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                      : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  {act.replace('_', ' ')}
                </button>
              )
            )}
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-neutral-400 text-xs">
              No audit logs matched the filter.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/60 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    {getActionBadge(log.action)}
                    <span className="font-mono text-neutral-500 text-[11px]">
                      {new Date(log.timestamp).toLocaleString('en-PH', {
                        dateStyle: 'short',
                        timeStyle: 'medium',
                      })}
                    </span>
                    {log.referenceId && (
                      <span className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-mono text-[10px]">
                        Ref: {log.referenceId}
                      </span>
                    )}
                  </div>
                  <p className="text-neutral-800 dark:text-neutral-200 font-medium">
                    {log.details}
                  </p>
                  <p className="text-[10px] text-neutral-400">
                    Device: {log.deviceInfo || 'VertexIS POS Terminal 01'}
                  </p>
                </div>

                <div className="text-right sm:flex-shrink-0">
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100 block">
                    {log.user}
                  </span>
                  <span className="text-[10px] text-neutral-500 block">
                    {log.userRole || 'Cashier'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 flex justify-between items-center text-xs text-neutral-500">
          <span>Showing {filteredLogs.length} audit trail records</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
