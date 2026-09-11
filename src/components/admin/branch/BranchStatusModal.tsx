import React, { useState } from 'react';
import { useData } from '../../../context/DataContext';
import { Branch, BranchStatus } from '../../../types';
import {
  X,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Archive,
  Trash2,
  FileText,
  Clock,
  User,
  History,
  Download,
  AlertOctagon,
} from 'lucide-react';

interface BranchStatusModalProps {
  branch: Branch | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChanged?: () => void;
}

export const BranchStatusModal: React.FC<BranchStatusModalProps> = ({
  branch,
  isOpen,
  onClose,
  onStatusChanged,
}) => {
  const {
    setBranchStatus,
    checkPermanentDeletionEligibility,
    permanentDeleteBranch,
    getBranchStatusHistory,
    themeMode,
  } = useData();
  const isDark = themeMode === 'dark';

  const [targetAction, setTargetAction] = useState<'status_change' | 'permanent_delete' | 'history'>('status_change');
  const [selectedStatus, setSelectedStatus] = useState<BranchStatus>('Suspended');
  const [reason, setReason] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [deletionSuccessResult, setDeletionSuccessResult] = useState<any | null>(null);

  if (!isOpen || !branch) return null;

  const currentStatus = branch.status || 'Active';
  const history = getBranchStatusHistory(branch.id);
  const eligibility = checkPermanentDeletionEligibility(branch.id);

  const handleApplyStatusChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMessage('Please provide an official audit explanation/reason for this status transition.');
      return;
    }

    setBranchStatus(branch.id, selectedStatus, reason.trim());
    setReason('');
    setErrorMessage('');
    if (onStatusChanged) onStatusChanged();
    onClose();
  };

  const handlePermanentDelete = () => {
    if (deleteConfirmText !== branch.name) {
      setErrorMessage(`Please type "${branch.name}" exactly to confirm permanent database removal.`);
      return;
    }

    if (!reason.trim()) {
      setErrorMessage('Audit justification is required for permanent deletion.');
      return;
    }

    const res = permanentDeleteBranch(branch.id, reason.trim());
    if (!res.success) {
      setErrorMessage(res.message);
    } else {
      setDeletionSuccessResult(res.backupSnapshot);
      if (onStatusChanged) onStatusChanged();
    }
  };

  const downloadBackupJSON = () => {
    if (!deletionSuccessResult) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(deletionSuccessResult, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `backup_branch_${branch.id}_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div
      id="branch-status-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto"
    >
      <div
        id="branch-status-modal-card"
        className={`relative w-full max-w-2xl my-6 rounded-2xl shadow-2xl border flex flex-col max-h-[90vh] overflow-hidden ${
          isDark ? 'bg-[#121212] border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between ${
            isDark ? 'border-neutral-800 bg-[#161616]' : 'border-neutral-200 bg-neutral-50'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                currentStatus === 'Active'
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : currentStatus === 'Suspended'
                  ? 'bg-red-500/15 text-red-400'
                  : 'bg-neutral-800 text-neutral-300'
              }`}
            >
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black tracking-tight">{branch.name}</h2>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-neutral-800 text-neutral-300">
                  {branch.code || branch.id}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    currentStatus === 'Active'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : currentStatus === 'Suspended'
                      ? 'bg-red-500/15 text-red-400'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  Current: {currentStatus}
                </span>
              </div>
              <p className="text-xs text-neutral-400">Lifecycle Operations, Suspension & Archival Controls</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-neutral-800 px-6 pt-3 space-x-4">
          <button
            onClick={() => setTargetAction('status_change')}
            className={`pb-2.5 text-xs font-bold transition-all ${
              targetAction === 'status_change'
                ? 'text-[#F37021] border-b-2 border-[#F37021]'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Status Transition
          </button>
          <button
            onClick={() => setTargetAction('history')}
            className={`pb-2.5 text-xs font-bold transition-all ${
              targetAction === 'history'
                ? 'text-[#F37021] border-b-2 border-[#F37021]'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Status History ({history.length})
          </button>
          <button
            onClick={() => setTargetAction('permanent_delete')}
            className={`pb-2.5 text-xs font-bold transition-all ${
              targetAction === 'permanent_delete'
                ? 'text-red-400 border-b-2 border-red-500'
                : 'text-neutral-400 hover:text-red-400'
            }`}
          >
            Permanent Deletion
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: STATUS CHANGE (ACTIVATE / SUSPEND / ARCHIVE / CLOSE) */}
          {targetAction === 'status_change' && (
            <form onSubmit={handleApplyStatusChange} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-2">Select Target Branch Status</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedStatus('Active')}
                    className={`p-3 rounded-xl border text-left flex items-start space-x-3 transition-all ${
                      selectedStatus === 'Active'
                        ? 'border-emerald-500 bg-emerald-500/10 text-white'
                        : isDark
                        ? 'border-neutral-800 bg-[#161616] text-neutral-400'
                        : 'border-neutral-200 bg-neutral-50 text-neutral-700'
                    }`}
                  >
                    <PlayCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-emerald-400">Active / Operational</div>
                      <div className="text-[11px] text-neutral-400">Allows store requisition orders and daily sales operations.</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedStatus('Suspended')}
                    className={`p-3 rounded-xl border text-left flex items-start space-x-3 transition-all ${
                      selectedStatus === 'Suspended'
                        ? 'border-red-500 bg-red-500/10 text-white'
                        : isDark
                        ? 'border-neutral-800 bg-[#161616] text-neutral-400'
                        : 'border-neutral-200 bg-neutral-50 text-neutral-700'
                    }`}
                  >
                    <PauseCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-red-400">Suspended (Temporary)</div>
                      <div className="text-[11px] text-neutral-400">Blocks new order placements while keeping inventory records.</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedStatus('Inactive')}
                    className={`p-3 rounded-xl border text-left flex items-start space-x-3 transition-all ${
                      selectedStatus === 'Inactive'
                        ? 'border-neutral-500 bg-neutral-800 text-white'
                        : isDark
                        ? 'border-neutral-800 bg-[#161616] text-neutral-400'
                        : 'border-neutral-200 bg-neutral-50 text-neutral-700'
                    }`}
                  >
                    <Archive className="w-5 h-5 text-neutral-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold">Inactive (Archived)</div>
                      <div className="text-[11px] text-neutral-400">Off-season or commercial renovation pause.</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedStatus('Closed')}
                    className={`p-3 rounded-xl border text-left flex items-start space-x-3 transition-all ${
                      selectedStatus === 'Closed'
                        ? 'border-red-800 bg-red-950/30 text-white'
                        : isDark
                        ? 'border-neutral-800 bg-[#161616] text-neutral-400'
                        : 'border-neutral-200 bg-neutral-50 text-neutral-700'
                    }`}
                  >
                    <Trash2 className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-amber-400">Closed (Soft Deleted)</div>
                      <div className="text-[11px] text-neutral-400">Permanently ceased store operations, archives history.</div>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                  Audit Justification / Official Reason <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="State the compliance, operational, or legal reason for this status change..."
                  className={`w-full px-3 py-2.5 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#80C7F2] ${
                    isDark
                      ? 'bg-[#181818] border-neutral-700 text-white placeholder-neutral-500'
                      : 'bg-neutral-50 border-neutral-300 text-neutral-900 placeholder-neutral-400'
                  }`}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#F37021] hover:bg-[#d85e15] text-white text-xs font-bold shadow transition-all"
                >
                  Apply Status Change
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: STATUS HISTORY TIMELINE */}
          {targetAction === 'history' && (
            <div className="space-y-3">
              {history.length === 0 ? (
                <div className="p-8 text-center border rounded-xl border-neutral-800 text-neutral-500 text-xs">
                  No previous status transitions recorded for this branch.
                </div>
              ) : (
                history.map((hist) => (
                  <div
                    key={hist.id}
                    className={`p-3.5 rounded-xl border ${
                      isDark ? 'bg-[#161616] border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-neutral-400">{hist.previousStatus || 'Created'}</span>
                        <span>→</span>
                        <span className="font-bold text-[#80C7F2]">{hist.newStatus}</span>
                      </div>
                      <span className="text-[11px] text-neutral-500 font-mono">
                        {new Date(hist.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-300 mt-1">&quot;{hist.reason}&quot;</p>
                    <p className="text-[10px] text-neutral-500 mt-1">Authorized by: {hist.changedBy}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: PERMANENT DELETION WITH SAFETY PRE-CONDITIONS */}
          {targetAction === 'permanent_delete' && (
            <div className="space-y-4">
              {deletionSuccessResult ? (
                <div className="p-6 text-center space-y-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                  <h4 className="text-base font-black">Branch Successfully Purged</h4>
                  <p className="text-xs text-neutral-400 max-w-md mx-auto">
                    All branch records, credentials, and catalog links have been wiped in accordance with data governance policies.
                  </p>
                  <button
                    onClick={downloadBackupJSON}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow flex items-center space-x-1.5 mx-auto"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Archive Backup (.json)</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs space-y-2">
                    <div className="flex items-center space-x-2 text-red-400 font-bold">
                      <AlertOctagon className="w-5 h-5 shrink-0" />
                      <span>Permanent Database Removal & Safety Pre-conditions</span>
                    </div>
                    <p className="text-neutral-300">
                      Permanent deletion physically purges the store profile, user logins, and catalog associations.
                      Before executing, the system enforces pre-condition safety checks:
                    </p>
                  </div>

                  {/* Pre-condition Checklist */}
                  <div
                    className={`p-4 rounded-xl border space-y-2 text-xs ${
                      isDark ? 'bg-[#181818] border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                    }`}
                  >
                    <h5 className="font-bold uppercase text-[10px] text-neutral-400 tracking-wider">Safety Checklist</h5>
                    <div className="flex items-center justify-between py-1 border-b border-neutral-800">
                      <span>No Pending or In-Production Orders</span>
                      {eligibility.pendingOrders === 0 ? (
                        <span className="text-emerald-400 font-bold flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> <span>0 Active</span>
                        </span>
                      ) : (
                        <span className="text-red-400 font-bold">{eligibility.pendingOrders} Pending</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-neutral-800">
                      <span>Zero Active On-Site Inventory</span>
                      {eligibility.unresolvedDiscrepancies === 0 ? (
                        <span className="text-emerald-400 font-bold flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> <span>0 Units</span>
                        </span>
                      ) : (
                        <span className="text-red-400 font-bold">{eligibility.unresolvedDiscrepancies} Units Remaining</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span>Pre-condition Overall Status</span>
                      {eligibility.eligible ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold text-[10px]">
                          PASSED (Eligible for Purge)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-red-500/15 text-red-400 font-bold text-[10px]">
                          BLOCKED BY PRE-CONDITIONS
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Confirmation Inputs */}
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs font-medium text-neutral-400 mb-1">
                        Audit Remarks / Justification *
                      </label>
                      <input
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="State official reason for permanent deletion..."
                        className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-red-400 ${
                          isDark ? 'bg-[#181818] border-neutral-700 text-white' : 'bg-white border-neutral-300'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-400 mb-1">
                        Type <strong className="text-white font-mono">&quot;{branch.name}&quot;</strong> to confirm:
                      </label>
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder={branch.name}
                        className={`w-full px-3 py-2 rounded-xl text-xs border font-mono focus:outline-none focus:ring-2 focus:ring-red-400 ${
                          isDark ? 'bg-[#181818] border-neutral-700 text-white' : 'bg-white border-neutral-300'
                        }`}
                      />
                    </div>

                    <div className="flex justify-end space-x-2 pt-2">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={!eligibility.eligible || deleteConfirmText !== branch.name}
                        onClick={handlePermanentDelete}
                        className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs font-bold shadow flex items-center space-x-1.5"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Confirm Permanent Purge</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
