import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { provisionUser, updateUserAccess } from '../../services/accountProvisioning';
import {
  Users,
  Shield,
  UserPlus,
  CheckCircle2,
  AlertTriangle,
  Search,
  Copy,
} from 'lucide-react';
import { Role } from '../../types';

export const AdminUserManagement: React.FC = () => {
  const {
    users,
    branches,
    currentUser,
    switchUser,
    updateUserRole,
    addNewUser,
    themeMode,
  } = useData();

  const isDark = themeMode === 'dark';

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // New User Form State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newRole, setNewRole] = useState<'admin' | 'staff'>('staff');
  const [newBranchId, setNewBranchId] = useState<string>('b-legazpi');
  const [passwordResetLink, setPasswordResetLink] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    return (users || []).filter((u) => {
      const matchSearch =
        (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchRole =
        roleFilter === 'all' ||
        u.role === roleFilter ||
        (roleFilter === 'SUPER_ADMIN' && (u.role === 'admin' || u.role === Role.SUPER_ADMIN)) ||
        (roleFilter === 'BRANCH_MANAGER' && (u.role === 'branch' || u.role === Role.BRANCH_MANAGER)) ||
        (roleFilter === 'BRANCH_STAFF' && u.role === Role.BRANCH_STAFF);
      return matchSearch && matchRole;
    });
  }, [users, searchTerm, roleFilter]);

  const handleRoleChange = async (userId: string, targetRole: Role) => {
    const user = users.find((candidate) => candidate.id === userId);
    if (!user) return;
    try {
      await updateUserAccess({
        userId: user.firebaseUid || user.id,
        role: targetRole === Role.SUPER_ADMIN ? 'admin' : 'branch',
        branchId: targetRole === Role.SUPER_ADMIN ? undefined : user.branchId,
      });
      const res = updateUserRole(userId, targetRole);
      if (!res.success) throw new Error(res.error || 'Failed to update role.');
      setFeedback({ text: `User role successfully updated to ${targetRole}.`, type: 'success' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (error) {
      setFeedback({ text: error instanceof Error ? error.message : 'Failed to update role.', type: 'error' });
    }
  };

  const handleBranchChange = async (userId: string, targetBranchId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    try {
      await updateUserAccess({ userId: user.firebaseUid || user.id, role: 'branch', branchId: targetBranchId });
      const res = updateUserRole(userId, user.role, targetBranchId);
      if (!res.success) throw new Error(res.error || 'Failed to update branch.');
      setFeedback({ text: `User branch assignment updated.`, type: 'success' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (error) {
      setFeedback({ text: error instanceof Error ? error.message : 'Failed to update branch.', type: 'error' });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      setFeedback({ text: 'Please fill in all required user fields.', type: 'error' });
      return;
    }

    try {
      const result = await provisionUser({
        name: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        role: newRole === 'admin' ? 'admin' : 'branch',
        branchId: newRole === 'admin' ? undefined : newBranchId,
        branchRole: newRole === 'admin' ? undefined : 'Staff',
      });
      addNewUser(result.user);

      setFeedback({
        text: result.passwordResetLink
          ? `Created Firebase account for ${newName.trim()}; a secure password-reset link is ready for delivery.`
          : `Created Firebase account for ${newName.trim()}. Configure Auth email delivery before sending access instructions.`,
        type: 'success',
      });
      setPasswordResetLink(result.passwordResetLink || null);
      setNewName('');
      setNewEmail('');
      setShowAddModal(false);
      setTimeout(() => setFeedback(null), 4000);
    } catch (creationError) {
      const message = creationError instanceof Error ? creationError.message : 'Failed to create Firebase account.';
      setFeedback({ text: message, type: 'error' });
    }
  };

  return (
    <div id="admin-user-management-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
                3-Tier Role-Based Access Control (RBAC) Administration
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                Centrally manage user accounts, assign 3-tier security roles, and enforce branch association boundaries
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 active:scale-98 shadow-sm transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Account</span>
        </button>
      </div>

      {/* RBAC Scope Banner */}
      <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 text-neutral-800 dark:text-neutral-200">
        <div className="flex items-start space-x-3 text-xs sm:text-sm">
          <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-neutral-900 dark:text-white">Security Hierarchy Architecture:</span>
            <div className="mt-1 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-white/70 dark:bg-black/30 border border-purple-200/50 dark:border-purple-800/50">
                <span className="font-bold text-purple-700 dark:text-purple-300">1. SUPER_ADMIN</span>
                <p className="text-neutral-500 text-[11px] mt-0.5">Central Commissary, network analytics, pricing, order approvals</p>
              </div>
              <div className="p-2 rounded-lg bg-white/70 dark:bg-black/30 border border-purple-200/50 dark:border-purple-800/50">
                <span className="font-bold text-[#0369a1] dark:text-[#80C7F2]">2. BRANCH_MANAGER</span>
                <p className="text-neutral-500 text-[11px] mt-0.5">Daily log validation & lock, requisitions, local analytics, transfers</p>
              </div>
              <div className="p-2 rounded-lg bg-white/70 dark:bg-black/30 border border-purple-200/50 dark:border-purple-800/50">
                <span className="font-bold text-amber-700 dark:text-amber-300">3. BRANCH_STAFF</span>
                <p className="text-neutral-500 text-[11px] mt-0.5">Physical counts, manual sales log, spoilage entries, inbound receiving</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {feedback && (
        <div className={`p-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-2 ${
          feedback.type === 'success'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
            : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800'
        }`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedback.text}</span>
        </div>
      )}

      {passwordResetLink && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-xs text-sky-900 dark:border-sky-800/50 dark:bg-sky-950/30 dark:text-sky-100">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-bold">One-time secure invite link</p>
              <p className="mt-0.5 text-[11px] opacity-80">Copy this link to the new account owner. It is not saved in VertexIS.</p>
            </div>
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(passwordResetLink)}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-sky-300 px-2.5 py-1.5 text-[11px] font-bold hover:bg-sky-100 dark:border-sky-700 dark:hover:bg-sky-900/50"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy link
            </button>
          </div>
          <p className="mt-2 break-all rounded-lg bg-white/70 p-2 font-mono text-[10px] dark:bg-black/20">{passwordResetLink}</p>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by name or username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121212] text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs text-neutral-400">Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121212] text-neutral-900 dark:text-white"
          >
            <option value="all">All Roles</option>
            <option value="SUPER_ADMIN">SUPER_ADMIN (HQ)</option>
            <option value="BRANCH_MANAGER">BRANCH_MANAGER (Store Lead)</option>
            <option value="BRANCH_STAFF">BRANCH_STAFF (Frontline)</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#181818] shadow-xs">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 font-bold text-xs sm:text-sm text-neutral-900 dark:text-white flex items-center justify-between">
          <span>Active Enterprise Accounts</span>
          <span className="text-xs font-mono text-neutral-400">{filteredUsers.length} users</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850/50 text-[11px] font-bold uppercase text-neutral-500">
                <th className="py-3 px-4">User Name & ID</th>
                <th className="py-3 px-4">Current Role Tier</th>
                <th className="py-3 px-4">Assigned Branch</th>
                <th className="py-3 px-4">Change Tier Role</th>
                <th className="py-3 px-4 text-right">Switch Active User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {filteredUsers.map((u) => {
                const isCurrent = currentUser?.id === u.id;
                const isSuper = u.role === Role.SUPER_ADMIN || u.role === 'admin';
                const isManager = u.role === Role.BRANCH_MANAGER || u.role === 'branch';
                const isStaff = u.role === Role.BRANCH_STAFF;

                return (
                  <tr key={u.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                    <td className="py-3.5 px-4 font-semibold text-neutral-900 dark:text-white">
                      <div className="flex items-center space-x-2">
                        <span>{u.name}</span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-400 font-normal font-mono">
                        {u.email} • {u.id}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {isSuper && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-700/60">
                          SUPER_ADMIN
                        </span>
                      )}
                      {isManager && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-300 dark:border-sky-700/60">
                          BRANCH_MANAGER
                        </span>
                      )}
                      {isStaff && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60">
                          BRANCH_STAFF
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-700 dark:text-neutral-300">
                      {isSuper ? (
                        <span className="text-neutral-400 italic">HQ Commissary (Global)</span>
                      ) : (
                        <select
                          value={u.branchId || 'b-legazpi'}
                          onChange={(e) => handleBranchChange(u.id, e.target.value)}
                          className="px-2 py-1 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121212] text-neutral-900 dark:text-white"
                        >
                          {branches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <select
                        value={
                          isSuper ? Role.SUPER_ADMIN : isManager ? Role.BRANCH_MANAGER : Role.BRANCH_STAFF
                        }
                        onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                        className="px-2 py-1 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121212] text-neutral-900 dark:text-white font-medium"
                      >
                        <option value={Role.SUPER_ADMIN}>SUPER_ADMIN</option>
                        <option value={Role.BRANCH_MANAGER}>BRANCH_MANAGER</option>
                        <option value={Role.BRANCH_STAFF}>BRANCH_STAFF</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {import.meta.env.DEV && !isCurrent && (
                        <button
                          type="button"
                          onClick={() => switchUser(u.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-neutral-700 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                        >
                          Switch User
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Register New 3-Tier Enterprise User
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-neutral-400 hover:text-neutral-600 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Maria Santos"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121212] text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Email Address
                </label>
                <input
                  type="text"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. maria.santos@marshbites.com"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121212] text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <p className="rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-[11px] text-purple-800 dark:border-purple-800/50 dark:bg-purple-950/30 dark:text-purple-200">
                Firebase generates the account credentials on the trusted backend. The user receives access through a secure password-reset link; no password is stored in VertexIS.
              </p>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Assigned 3-Tier RBAC Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'admin' | 'staff')}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121212] text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {newRole !== 'admin' && (
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Store Branch Association
                  </label>
                  <select
                    value={newBranchId}
                    onChange={(e) => setNewBranchId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121212] text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.location})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 cursor-pointer"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
