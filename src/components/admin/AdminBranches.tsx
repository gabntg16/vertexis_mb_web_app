import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Branch, BranchApplication } from '../../types';
import {
  Store,
  MapPin,
  TrendingUp,
  Package,
  Search,
  Plus,
  ChevronRight,
  AlertTriangle,
  Sparkles,
  BarChart3,
  Edit,
  DollarSign,
  UserCheck,
  Shield,
  Users,
  FileText,
  Clock,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Archive,
  History,
  Filter,
  Layers,
  ArrowUpRight,
  AlertCircle,
  Eye,
  CheckCheck,
} from 'lucide-react';
import { BranchApplicationModal } from './branch/BranchApplicationModal';
import { BranchApplicationReviewModal } from './branch/BranchApplicationReviewModal';
import { BranchAccountsModal } from './branch/BranchAccountsModal';
import { BranchStatusModal } from './branch/BranchStatusModal';
import { BranchAuditTrailModal } from './branch/BranchAuditTrailModal';
import { BranchDetailsDrawer } from './branch/BranchDetailsDrawer';

export const AdminBranches: React.FC = () => {
  const {
    branches,
    branchApplications,
    branchStatusCounts,
    branchRevenue,
    branchStockCount,
    demandForecastForBranch,
    restockSuggestionsForBranch,
    getInventoryForBranch,
    totalRevenue,
    themeMode,
  } = useData();

  const isDark = themeMode === 'dark';

  // Navigation tabs
  const [mainTab, setMainTab] = useState<'network' | 'applications' | 'compliance' | 'audit'>('network');

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [businessTypeFilter, setBusinessTypeFilter] = useState<string>('all');

  // Modals & Drawers state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<BranchApplication | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showAccountsModal, setShowAccountsModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Filtered branches
  const filteredBranches = branches.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.code && b.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (b.managerName && b.managerName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' || (b.status || 'Active').toLowerCase() === statusFilter.toLowerCase();

    const matchesType =
      businessTypeFilter === 'all' || (b.businessType || 'Mall Kiosk').toLowerCase() === businessTypeFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesType;
  });

  // Filtered applications
  const filteredApplications = branchApplications.filter((app) => {
    const matchesSearch =
      app.branchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.branchCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.managerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.address.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || app.status.toLowerCase().includes(statusFilter.toLowerCase());

    return matchesSearch && matchesStatus;
  });

  const handleOpenReview = (app: BranchApplication) => {
    setSelectedApplication(app);
    setShowReviewModal(true);
  };

  const handleOpenBranchDrawer = (branch: Branch) => {
    setSelectedBranch(branch);
    setShowDrawer(true);
  };

  const handleOpenBranchAccounts = (branch: Branch) => {
    setSelectedBranch(branch);
    setShowAccountsModal(true);
  };

  const handleOpenBranchStatus = (branch: Branch) => {
    setSelectedBranch(branch);
    setShowStatusModal(true);
  };

  const handleOpenBranchAudit = (branch?: Branch) => {
    setSelectedBranch(branch || null);
    setShowAuditModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-black tracking-tight">Franchise Branch Network</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F37021]/15 text-[#F37021] border border-[#F37021]/30">
              {branches.length} Branches
            </span>
          </div>
          <p className="text-xs text-neutral-500 font-medium mt-0.5">
            Full-lifecycle branch management: applications, document verification, role-based accounts, suspension & audit trails.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => handleOpenBranchAudit()}
            className="px-3.5 py-2.5 rounded-xl border border-neutral-700 hover:bg-neutral-800 text-neutral-300 text-xs font-bold transition-all flex items-center space-x-1.5"
          >
            <History className="w-4 h-4 text-neutral-400" />
            <span>Audit Trail</span>
          </button>

          <button
            onClick={() => setShowApplyModal(true)}
            id="apply-branch-primary-btn"
            className="px-4 py-2.5 rounded-xl bg-[#F37021] text-white text-xs sm:text-sm font-bold shadow-lg hover:bg-[#d85e15] transition-all flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Apply for New Branch</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Branches */}
        <div
          className={`p-3.5 rounded-2xl border transition-all ${
            isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Total Network</span>
            <Store className="w-4 h-4 text-[#80C7F2]" />
          </div>
          <div className="text-xl font-black text-white mt-1.5">{branches.length}</div>
          <div className="text-[10px] text-neutral-400 mt-0.5">19 Active franchise units</div>
        </div>

        {/* Active Operational */}
        <div
          className={`p-3.5 rounded-2xl border transition-all ${
            isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Active Stores</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-emerald-400 mt-1.5">{branchStatusCounts.active}</div>
          <div className="text-[10px] text-neutral-400 mt-0.5">100% operational</div>
        </div>

        {/* Pending Applications */}
        <div
          onClick={() => setMainTab('applications')}
          className={`p-3.5 rounded-2xl border cursor-pointer hover:border-[#F37021] transition-all ${
            branchStatusCounts.pendingApplications > 0
              ? 'border-[#F37021]/50 bg-[#F37021]/5'
              : isDark
              ? 'bg-[#161616] border-neutral-800'
              : 'bg-white border-neutral-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-[#F37021]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Applications</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-[#F37021] mt-1.5">
            {branchStatusCounts.pendingApplications}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">
            {branchStatusCounts.pendingApplications > 0 ? 'Requires HQ review' : 'No pending reviews'}
          </div>
        </div>

        {/* Suspended Stores */}
        <div
          className={`p-3.5 rounded-2xl border transition-all ${
            isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-red-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Suspended</span>
            <PauseCircle className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-red-400 mt-1.5">{branchStatusCounts.suspended}</div>
          <div className="text-[10px] text-neutral-400 mt-0.5">Under audit pause</div>
        </div>

        {/* Closed / Archived */}
        <div
          className={`p-3.5 rounded-2xl border transition-all ${
            isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Closed / Inactive</span>
            <Archive className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-neutral-300 mt-1.5">
            {branchStatusCounts.closed + branchStatusCounts.inactive}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">Archived branches</div>
        </div>

        {/* Network Revenue */}
        <div
          className={`p-3.5 rounded-2xl border transition-all ${
            isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-[#80C7F2]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Network Sales</span>
            <DollarSign className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-[#80C7F2] mt-1.5">
            ₱{(totalRevenue / 1000).toFixed(0)}k
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">Lifetime POS revenue</div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex border-b border-neutral-800 space-x-6">
        <button
          onClick={() => setMainTab('network')}
          className={`pb-3 text-xs font-bold flex items-center space-x-2 transition-all relative ${
            mainTab === 'network'
              ? 'text-[#F37021] border-b-2 border-[#F37021]'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Franchise Directory ({branches.length})</span>
        </button>

        <button
          onClick={() => setMainTab('applications')}
          className={`pb-3 text-xs font-bold flex items-center space-x-2 transition-all relative ${
            mainTab === 'applications'
              ? 'text-[#F37021] border-b-2 border-[#F37021]'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Branch Applications ({branchApplications.length})</span>
          {branchStatusCounts.pendingApplications > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-[#F37021] text-white text-[10px] font-black">
              {branchStatusCounts.pendingApplications}
            </span>
          )}
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              mainTab === 'network'
                ? 'Search branches by name, city, code, or manager...'
                : 'Search applications by store name, manager, or location...'
            }
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm border focus:outline-none focus:ring-2 focus:ring-[#80C7F2] ${
              isDark
                ? 'bg-[#161616] border-neutral-800 text-white placeholder-neutral-500'
                : 'bg-white border-neutral-200 text-neutral-900 placeholder-neutral-400'
            }`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center space-x-1.5">
            <Filter className="w-3.5 h-3.5 text-neutral-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#80C7F2] ${
                isDark ? 'bg-[#161616] border-neutral-800 text-white' : 'bg-white border-neutral-200'
              }`}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending Review</option>
              <option value="suspended">Suspended</option>
              <option value="inactive">Inactive</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Business Type Filter */}
          {mainTab === 'network' && (
            <select
              value={businessTypeFilter}
              onChange={(e) => setBusinessTypeFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#80C7F2] ${
                isDark ? 'bg-[#161616] border-neutral-800 text-white' : 'bg-white border-neutral-200'
              }`}
            >
              <option value="all">All Business Types</option>
              <option value="Mall Kiosk">Mall Kiosk</option>
              <option value="Standalone Store">Standalone Store</option>
              <option value="Food Hall Stall">Food Hall Stall</option>
              <option value="Commercial Strip Unit">Commercial Strip Unit</option>
              <option value="Express Counter">Express Counter</option>
            </select>
          )}
        </div>
      </div>

      {/* VIEW 1: FRANCHISE DIRECTORY GRID */}
      {mainTab === 'network' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBranches.length === 0 ? (
            <div className="col-span-full p-12 text-center border rounded-2xl border-neutral-800 space-y-3">
              <Store className="w-12 h-12 text-neutral-600 mx-auto" />
              <h3 className="text-base font-bold">No branches found</h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                No stores match your search query or filter selection.
              </p>
              <button
                onClick={() => setShowApplyModal(true)}
                className="px-4 py-2 rounded-xl bg-[#F37021] text-white text-xs font-bold shadow"
              >
                Apply for New Branch
              </button>
            </div>
          ) : (
            filteredBranches.map((branch) => {
              const revenue = branchRevenue(branch.id);
              const stock = branchStockCount(branch.id);
              const forecast = demandForecastForBranch(branch.id);
              const restock = restockSuggestionsForBranch(branch.id);
              const branchStatus = branch.status || 'Active';

              return (
                <div
                  key={branch.id}
                  className={`rounded-2xl border flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:border-neutral-700 ${
                    branchStatus === 'Suspended'
                      ? 'border-red-500/40 bg-red-950/10'
                      : isDark
                      ? 'bg-[#161616] border-neutral-800/80 text-white'
                      : 'bg-white border-neutral-200 text-neutral-900 shadow-sm'
                  }`}
                >
                  <div className="p-5 space-y-4">
                    {/* Top Info */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-bold text-base tracking-tight leading-tight">{branch.name}</h3>
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-neutral-400 font-mono">
                          <span>{branch.code || branch.id}</span>
                          <span>•</span>
                          <span>{branch.businessType || 'Mall Kiosk'}</span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                          branchStatus === 'Active'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : branchStatus === 'Suspended'
                            ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                            : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        {branchStatus}
                      </span>
                    </div>

                    {/* Location & Manager Info */}
                    <div className="space-y-1 text-xs text-neutral-400">
                      <div className="flex items-start space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{branch.location}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                        <span>Manager: <strong className="text-neutral-300 font-medium">{branch.managerName || `${branch.name} Manager`}</strong></span>
                      </div>
                    </div>

                    {/* Performance Metrics Box */}
                    <div
                      className={`p-3 rounded-xl border grid grid-cols-2 gap-2 text-xs ${
                        isDark ? 'bg-[#1a1a1a] border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                      }`}
                    >
                      <div>
                        <span className="text-[10px] text-neutral-500 uppercase font-bold">Revenue</span>
                        <p className="font-black text-emerald-400 text-sm mt-0.5">₱{revenue.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-500 uppercase font-bold">Stock On-Hand</span>
                        <p className="font-black text-[#80C7F2] text-sm mt-0.5">{stock} units</p>
                      </div>
                    </div>

                    {/* Demand Forecast Badge */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-neutral-500 text-[11px]">Demand Velocity:</span>
                      <span className="font-bold text-[#F37021] text-[11px]">{forecast}</span>
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div
                    className={`px-5 py-3.5 border-t flex items-center justify-between gap-2 ${
                      isDark ? 'border-neutral-800/80 bg-[#121212]' : 'border-neutral-100 bg-neutral-50'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleOpenBranchAccounts(branch)}
                        className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-[#80C7F2] transition-colors"
                        title="Manage Staff Accounts"
                      >
                        <Users className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenBranchStatus(branch)}
                        className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-amber-400 transition-colors"
                        title="Change Branch Lifecycle Status"
                      >
                        <Shield className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenBranchAudit(branch)}
                        className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                        title="View Branch Audit Trail"
                      >
                        <History className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => handleOpenBranchDrawer(branch)}
                      className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-200 flex items-center space-x-1 transition-all"
                    >
                      <span>360 Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW 2: BRANCH APPLICATIONS & ONBOARDING QUEUE */}
      {mainTab === 'applications' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Franchise Onboarding Applications Queue ({filteredApplications.length})
            </h3>

            <button
              onClick={() => setShowApplyModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-[#F37021] text-white text-xs font-bold shadow hover:bg-[#d85e15] flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Apply for New Branch</span>
            </button>
          </div>

          <div className="space-y-3">
            {filteredApplications.length === 0 ? (
              <div className="p-12 text-center border rounded-2xl border-neutral-800 text-neutral-500 text-xs space-y-2">
                <FileText className="w-10 h-10 mx-auto text-neutral-600" />
                <p>No franchise applications match your filter.</p>
              </div>
            ) : (
              filteredApplications.map((app) => {
                const docs = app.documents || [];
                const verifiedDocs = docs.filter((d) => d.status === 'verified').length;

                return (
                  <div
                    key={app.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      app.status === 'Pending Review'
                        ? 'border-[#F37021]/30 bg-[#F37021]/5'
                        : isDark
                        ? 'bg-[#161616] border-neutral-800 text-white'
                        : 'bg-white border-neutral-200 text-neutral-900 shadow-sm'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left Details */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2.5">
                          <h4 className="text-base font-black tracking-tight">{app.branchName}</h4>
                          <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-neutral-800 text-neutral-300">
                            {app.branchCode}
                          </span>
                          <span
                            className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                              app.status === 'Approved'
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : app.status === 'Rejected'
                                ? 'bg-red-500/15 text-red-400'
                                : app.status === 'Requires Revision'
                                ? 'bg-amber-500/15 text-amber-400'
                                : 'bg-sky-500/15 text-sky-400'
                            }`}
                          >
                            {app.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-400">
                          <span>Model: <strong className="text-neutral-200">{app.businessType}</strong></span>
                          <span>Manager: <strong className="text-neutral-200">{app.managerName}</strong> ({app.managerPhone})</span>
                          <span>Location: <strong className="text-neutral-200">{app.address}</strong></span>
                          <span>Submitted: <strong>{new Date(app.submittedAt).toLocaleDateString()}</strong></span>
                        </div>

                        {/* Document Verification Progress Pill */}
                        <div className="flex items-center space-x-2 pt-1">
                          <div className="w-32 bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-400 h-full rounded-full transition-all"
                              style={{
                                width: `${docs.length > 0 ? (verifiedDocs / docs.length) * 100 : 0}%`,
                              }}
                            />
                          </div>
                          <span className="text-[11px] text-neutral-400">
                            {verifiedDocs} of {docs.length} documents verified
                          </span>
                        </div>
                      </div>

                      {/* Right Action */}
                      <div className="flex items-center space-x-2 self-end md:self-center">
                        <button
                          onClick={() => handleOpenReview(app)}
                          className="px-4 py-2 rounded-xl bg-[#80C7F2] text-neutral-900 hover:bg-[#6cb6e3] text-xs font-black shadow transition-all flex items-center space-x-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Review & Verify Docs</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ALL MODALS & DRAWERS */}
      {/* 1. Apply For New Branch Modal */}
      <BranchApplicationModal
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        onSuccess={() => setShowApplyModal(false)}
      />

      {/* 2. Review Application & Document Verification Modal */}
      <BranchApplicationReviewModal
        application={selectedApplication}
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onApplicationUpdated={() => setShowReviewModal(false)}
      />

      {/* 3. 360-Degree Branch Details Drawer */}
      <BranchDetailsDrawer
        branch={selectedBranch}
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        onOpenAccounts={() => {
          setShowDrawer(false);
          setShowAccountsModal(true);
        }}
        onOpenStatus={() => {
          setShowDrawer(false);
          setShowStatusModal(true);
        }}
        onOpenAudit={() => {
          setShowDrawer(false);
          setShowAuditModal(true);
        }}
      />

      {/* 4. Branch Staff & Manager Accounts Modal */}
      <BranchAccountsModal
        branch={selectedBranch}
        isOpen={showAccountsModal}
        onClose={() => setShowAccountsModal(false)}
      />

      {/* 5. Branch Lifecycle Status & Deletion Modal */}
      <BranchStatusModal
        branch={selectedBranch}
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        onStatusChanged={() => setShowStatusModal(false)}
      />

      {/* 6. Branch Audit Trail & Security Modal */}
      <BranchAuditTrailModal
        branch={selectedBranch}
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
      />
    </div>
  );
};
