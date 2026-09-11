import React, { useState } from 'react';
import { useData } from '../../../context/DataContext';
import { Branch, BranchAccount, BranchAccountRole } from '../../../types';
import {
  X,
  UserPlus,
  Users,
  Shield,
  Key,
  Copy,
  Check,
  Send,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  Lock,
} from 'lucide-react';

interface BranchAccountsModalProps {
  branch: Branch | null;
  isOpen: boolean;
  onClose: () => void;
}

const AVAILABLE_ROLES: BranchAccountRole[] = [
  'Branch Manager',
  'Staff',
];

const DEFAULT_PERMISSIONS_BY_ROLE: Record<BranchAccountRole, string[]> = {
  'Branch Manager': [
    'View Branch Inventory',
    'Submit Requisition Orders',
    'View Sales & Demand Reports',
    'Manage Branch Staff',
    'Confirm Stock Delivery',
  ],
  'Staff': [
    'Inventory Management',
    'Order Processing',
    'Sales Recording',
  ],
};

export const BranchAccountsModal: React.FC<BranchAccountsModalProps> = ({
  branch,
  isOpen,
  onClose,
}) => {
  const {
    getBranchAccounts,
    createBranchAccount,
    resetBranchAccountPassword,
    toggleBranchAccountActive,
    sendAccountCredentials,
    themeMode,
  } = useData();
  const isDark = themeMode === 'dark';

  const [showAddForm, setShowAddForm] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<BranchAccountRole>('Staff');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lastResetInfo, setLastResetInfo] = useState<{ id: string; password: string } | null>(null);

  if (!isOpen || !branch) return null;

  const accounts = getBranchAccounts(branch.id);

  const handleAddAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim() || !newEmail.trim()) return;

    createBranchAccount({
      branchId: branch.id,
      fullName: newFullName.trim(),
      email: newEmail.trim(),
      phone: newPhone.trim() || undefined,
      role: newRole,
      permissions: DEFAULT_PERMISSIONS_BY_ROLE[newRole],
    });

    setNewFullName('');
    setNewEmail('');
    setNewPhone('');
    setNewRole('Staff');
    setShowAddForm(false);
  };

  const handleResetPassword = (accountId: string) => {
    const res = resetBranchAccountPassword(accountId);
    setLastResetInfo({ id: accountId, password: res.temporaryPassword });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div
      id="branch-accounts-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto"
    >
      <div
        id="branch-accounts-modal-card"
        className={`relative w-full max-w-3xl my-6 rounded-2xl shadow-2xl border flex flex-col max-h-[90vh] overflow-hidden ${
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
            <div className="w-10 h-10 rounded-xl bg-[#F37021]/15 text-[#F37021] flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black tracking-tight">{branch.name}</h2>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-neutral-800 text-neutral-300">
                  {branch.code || branch.id}
                </span>
              </div>
              <p className="text-xs text-neutral-400">Branch User Accounts & Role-Based Access Control</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Active Personnel ({accounts.length})
            </h3>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1.5 rounded-xl bg-[#F37021] hover:bg-[#d85e15] text-white text-xs font-bold shadow transition-all flex items-center space-x-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{showAddForm ? 'Cancel' : 'Create Staff Account'}</span>
            </button>
          </div>

          {/* Add Staff Form */}
          {showAddForm && (
            <form
              onSubmit={handleAddAccountSubmit}
              className={`p-4 rounded-xl border space-y-4 animate-in fade-in duration-200 ${
                isDark ? 'bg-[#181818] border-neutral-700' : 'bg-neutral-50 border-neutral-300'
              }`}
            >
              <div className="flex items-center space-x-2 text-[#F37021] pb-2 border-b border-neutral-800">
                <UserPlus className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase">Provision New Branch User Account</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="e.g. John Marco Cruz"
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#80C7F2] ${
                      isDark ? 'bg-[#1e1e1e] border-neutral-700 text-white' : 'bg-white border-neutral-300 text-neutral-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Assign Role *</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as BranchAccountRole)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#80C7F2] ${
                      isDark ? 'bg-[#1e1e1e] border-neutral-700 text-white' : 'bg-white border-neutral-300 text-neutral-900'
                    }`}
                  >
                    {AVAILABLE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Official Email Address *</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="e.g. jcruz@marshbites.com"
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#80C7F2] ${
                      isDark ? 'bg-[#1e1e1e] border-neutral-700 text-white' : 'bg-white border-neutral-300 text-neutral-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Mobile Contact Number</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="e.g. +63 917 123 4567"
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#80C7F2] ${
                      isDark ? 'bg-[#1e1e1e] border-neutral-700 text-white' : 'bg-white border-neutral-300 text-neutral-900'
                    }`}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#F37021] hover:bg-[#d85e15] text-white text-xs font-bold shadow"
                >
                  Create & Auto-Generate Password
                </button>
              </div>
            </form>
          )}

          {/* Accounts List */}
          <div className="space-y-3">
            {accounts.length === 0 ? (
              <div className="p-8 text-center border rounded-xl border-neutral-800 text-neutral-500 text-xs">
                No user accounts provisioned yet for this branch. Click &quot;Create Staff Account&quot; to add.
              </div>
            ) : (
              accounts.map((acc) => {
                const isResetThisSession = lastResetInfo?.id === acc.id;

                return (
                  <div
                    key={acc.id}
                    className={`p-4 rounded-xl border transition-all ${
                      !acc.isActive
                        ? 'opacity-60 border-neutral-800 bg-neutral-900/40'
                        : isDark
                        ? 'border-neutral-800 bg-[#161616]'
                        : 'border-neutral-200 bg-neutral-50'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-xs font-bold">{acc.fullName}</h4>
                          <span
                            className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
                              acc.role === 'Branch Manager'
                                ? 'bg-[#F37021]/15 text-[#F37021]'
                                : 'bg-[#80C7F2]/15 text-[#80C7F2]'
                            }`}
                          >
                            {acc.role}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
                              acc.isActive
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {acc.isActive ? 'Active' : 'Disabled'}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-neutral-400 font-mono mt-1">
                          <span className="flex items-center space-x-1">
                            <Mail className="w-3 h-3 text-neutral-500" />
                            <span>{acc.email}</span>
                          </span>
                          <span>Username: <strong className="text-neutral-300">{acc.username}</strong></span>
                          {acc.phone && (
                            <span className="flex items-center space-x-1">
                              <Phone className="w-3 h-3 text-neutral-500" />
                              <span>{acc.phone}</span>
                            </span>
                          )}
                        </div>

                        {/* Permissions Tags */}
                        {acc.permissions && acc.permissions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {acc.permissions.map((p, idx) => (
                              <span
                                key={idx}
                                className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700"
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Controls */}
                      <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                        {acc.temporaryPassword && (
                          <div className="flex items-center space-x-1 bg-neutral-900 border border-neutral-700 px-2 py-1 rounded-lg">
                            <span className="text-[10px] text-neutral-400">Pass:</span>
                            <span className="font-mono text-xs text-[#80C7F2] font-bold">
                              {isResetThisSession ? lastResetInfo?.password : acc.temporaryPassword}
                            </span>
                            <button
                              onClick={() =>
                                copyToClipboard(
                                  isResetThisSession ? lastResetInfo!.password : acc.temporaryPassword!,
                                  acc.id
                                )
                              }
                              className="p-1 text-neutral-400 hover:text-white"
                              title="Copy temporary password"
                            >
                              {copiedId === acc.id ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        )}

                        <button
                          onClick={() => handleResetPassword(acc.id)}
                          className="px-2.5 py-1 rounded-lg border border-neutral-700 hover:bg-neutral-800 text-[11px] font-semibold text-neutral-300 transition-colors flex items-center space-x-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset Pass</span>
                        </button>

                        <button
                          onClick={() => sendAccountCredentials(acc.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors flex items-center space-x-1 ${
                            acc.credentialsSent
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-[#80C7F2]/15 text-[#80C7F2] hover:bg-[#80C7F2]/25'
                          }`}
                        >
                          <Send className="w-3 h-3" />
                          <span>{acc.credentialsSent ? 'Resend' : 'Send'}</span>
                        </button>

                        <button
                          onClick={() => toggleBranchAccountActive(acc.id, !acc.isActive)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                            acc.isActive
                              ? 'text-red-400 hover:bg-red-500/15'
                              : 'text-emerald-400 hover:bg-emerald-500/15'
                          }`}
                        >
                          {acc.isActive ? 'Deactivate' : 'Enable'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className={`px-6 py-4 border-t flex justify-end ${
            isDark ? 'border-neutral-800 bg-[#161616]' : 'border-neutral-200 bg-neutral-50'
          }`}
        >
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
