import React, { useState } from 'react';
import { useData } from '../../../context/DataContext';
import { Branch, BranchAuditLog } from '../../../types';
import {
  X,
  Shield,
  Search,
  Download,
  Calendar,
  User,
  Activity,
  FileCheck,
  Building,
  Key,
  Trash2,
  CheckCircle2,
  Clock,
  Filter,
} from 'lucide-react';

interface BranchAuditTrailModalProps {
  branch?: Branch | null;
  isOpen: boolean;
  onClose: () => void;
}

export const BranchAuditTrailModal: React.FC<BranchAuditTrailModalProps> = ({
  branch,
  isOpen,
  onClose,
}) => {
  const { getBranchAuditLogs, branchAuditLogs, themeMode } = useData();
  const isDark = themeMode === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>('all');

  if (!isOpen) return null;

  const logs: BranchAuditLog[] = branch ? getBranchAuditLogs(branch.id) : branchAuditLogs;

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.remarks.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.branchName && log.branchName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesAction = selectedActionFilter === 'all' || log.action === selectedActionFilter;

    return matchesSearch && matchesAction;
  });

  const exportAuditCSV = () => {
    const headers = ['ID', 'Timestamp', 'Branch Name', 'Action', 'Operator / User', 'Remarks'];
    const rows = filteredLogs.map((l) => [
      l.id,
      new Date(l.timestamp).toISOString(),
      `"${l.branchName || 'Network-wide'}"`,
      `"${l.action}"`,
      `"${l.user}"`,
      `"${l.remarks.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `branch_audit_trail_${branch ? branch.id : 'all'}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const getActionIcon = (action: string) => {
    if (action.includes('Approved')) return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    if (action.includes('Document')) return <FileCheck className="w-4 h-4 text-[#80C7F2]" />;
    if (action.includes('Account') || action.includes('Password')) return <Key className="w-4 h-4 text-[#F37021]" />;
    if (action.includes('Deleted') || action.includes('Suspended')) return <Trash2 className="w-4 h-4 text-red-400" />;
    return <Activity className="w-4 h-4 text-neutral-400" />;
  };

  return (
    <div
      id="branch-audit-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto"
    >
      <div
        id="branch-audit-modal-card"
        className={`relative w-full max-w-4xl my-6 rounded-2xl shadow-2xl border flex flex-col max-h-[90vh] overflow-hidden ${
          isDark ? 'bg-[#121212] border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between ${
            isDark ? 'border-neutral-800 bg-[#161616]' : 'border-neutral-200 bg-neutral-50'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#80C7F2]/15 text-[#80C7F2] flex items-center justify-center font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black tracking-tight">
                  {branch ? `${branch.name} — Audit Trail` : 'Central Franchise Security & Audit Logs'}
                </h2>
                {branch && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-neutral-800 text-neutral-300">
                    {branch.code || branch.id}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400">
                Immutable operational logs tracking branch onboarding, approvals, staff credentials, and lifecycle changes.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={exportAuditCSV}
              className="px-3 py-1.5 rounded-xl border border-neutral-700 hover:bg-neutral-800 text-neutral-300 text-xs font-semibold flex items-center space-x-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div
          className={`p-4 border-b flex flex-col sm:flex-row gap-3 ${
            isDark ? 'border-neutral-800 bg-[#141414]' : 'border-neutral-200 bg-neutral-100'
          }`}
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search audit trail by keyword, operator, remarks, or action..."
              className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#80C7F2] ${
                isDark ? 'bg-[#181818] border-neutral-700 text-white placeholder-neutral-500' : 'bg-white border-neutral-300'
              }`}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-neutral-400" />
            <select
              value={selectedActionFilter}
              onChange={(e) => setSelectedActionFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#80C7F2] ${
                isDark ? 'bg-[#181818] border-neutral-700 text-white' : 'bg-white border-neutral-300'
              }`}
            >
              <option value="all">All Action Types</option>
              <option value="Application Submitted">Application Submitted</option>
              <option value="Document Approved">Document Approved</option>
              <option value="Documents Rejected">Documents Rejected</option>
              <option value="Branch Approved">Branch Approved</option>
              <option value="Branch Suspended">Branch Suspended</option>
              <option value="Branch Activated">Branch Activated</option>
              <option value="Staff Account Created">Staff Account Created</option>
              <option value="Password Reset">Password Reset</option>
              <option value="Branch Permanently Deleted">Branch Permanently Deleted</option>
            </select>
          </div>
        </div>

        {/* Audit Log Timeline Table */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center border rounded-xl border-neutral-800 text-neutral-500 text-xs">
              No audit records match your search criteria.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className={`p-4 rounded-xl border transition-all ${
                  isDark ? 'border-neutral-800 bg-[#161616]' : 'border-neutral-200 bg-neutral-50'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-1.5 rounded-lg bg-neutral-800">{getActionIcon(log.action)}</div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold">{log.action}</span>
                        {log.branchName && (
                          <span className="text-[10px] px-2 py-0.2 rounded bg-neutral-800 text-neutral-300 font-medium">
                            {log.branchName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 text-[11px] text-neutral-400 font-mono self-end sm:self-center">
                    <span className="flex items-center space-x-1">
                      <User className="w-3 h-3 text-neutral-500" />
                      <span>{log.user}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-neutral-500" />
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </span>
                  </div>
                </div>

                <p className="text-xs text-neutral-300 mt-2 pl-9">{log.remarks}</p>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div
          className={`px-6 py-4 border-t flex justify-between items-center ${
            isDark ? 'border-neutral-800 bg-[#161616]' : 'border-neutral-200 bg-neutral-50'
          }`}
        >
          <span className="text-xs text-neutral-400">
            Showing {filteredLogs.length} of {logs.length} logged events
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
